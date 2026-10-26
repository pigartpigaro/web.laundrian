import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const target = 'main'
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const dryRun = process.argv.includes('--dry-run')

if (process.argv.includes('--help')) {
  console.log('npm run release memvalidasi develop lalu fast-forward dan push ke main. Gunakan npm run release -- --dry-run untuk validasi tanpa push.')
  process.exit(0)
}

const tempWorktree = mkdtempSync(join(tmpdir(), 'laundrian-web-release-'))

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim()
}

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.error) throw new Error(`${command} ${args.join(' ')} gagal: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} gagal (kode ${result.status}).`)
}

function syncLocalMain(releaseSha) {
  try {
    const localMainSha = git(['rev-parse', '--verify', 'refs/heads/main'])
    if (localMainSha === releaseSha) return
    git(['merge-base', '--is-ancestor', localMainSha, releaseSha])
    git(['update-ref', 'refs/heads/main', releaseSha, localMainSha])
    console.log('Branch main lokal disinkronkan; branch aktif tetap develop.')
  } catch {
    console.warn('origin/main sudah diperbarui, tetapi main lokal tidak digeser karena tidak dapat dipastikan fast-forward.')
  }
}

function getProductionBuildEnvironment() {
  const localEnvPath = join(root, '.env.production')
  const localValues = {}
  if (existsSync(localEnvPath)) {
    for (const line of readFileSync(localEnvPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*(VITE_[A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (match) localValues[match[1]] = match[2].replace(/^("|')(.*)\1$/, '$2')
    }
  }

  const buildEnvironment = Object.fromEntries(['VITE_API_BASE_URL', 'VITE_OUTLET_ID'].map(key => {
    const value = process.env[key]?.trim() || localValues[key]?.trim()
    if (!value) throw new Error(`${key} belum diatur. Isi environment atau file lokal .env.production.`)
    return [key, value]
  }))
  const apiUrl = new URL(buildEnvironment.VITE_API_BASE_URL)
  if (!['http:', 'https:'].includes(apiUrl.protocol) || ['localhost', '127.0.0.1', '::1'].includes(apiUrl.hostname)) {
    throw new Error('VITE_API_BASE_URL release harus memakai URL API production, bukan localhost.')
  }
  return buildEnvironment
}

try {
  if (git(['status', '--porcelain'])) throw new Error('working tree harus bersih.')
  if (git(['branch', '--show-current']) !== 'develop') throw new Error('jalankan release dari branch develop.')

  run('git', ['fetch', 'origin', '--prune'], root)
  const divergence = git(['rev-list', '--left-right', '--count', 'develop...origin/develop']).split(/\s+/).map(Number)
  if (divergence[0] !== 0 || divergence[1] !== 0) throw new Error('develop lokal dan origin/develop harus sinkron; push commit develop terlebih dahulu.')

  const commitsToRelease = Number(git(['rev-list', '--count', `origin/${target}..origin/develop`]))
  if (commitsToRelease === 0) throw new Error(`tidak ada commit baru dari develop untuk ${target}.`)
  try { git(['merge-base', '--is-ancestor', `origin/${target}`, 'origin/develop']) }
  catch { throw new Error('origin/main bukan ancestor origin/develop. Sinkronkan branch secara manual; release hanya melakukan fast-forward.') }

  run('git', ['worktree', 'add', '--detach', tempWorktree, `origin/${target}`], root)
  run('git', ['merge', '--ff-only', 'origin/develop'], tempWorktree)
  run(npm, ['ci'], tempWorktree)
  run(npm, ['run', 'build'], tempWorktree, getProductionBuildEnvironment())

  if (dryRun) {
    console.log(`\nDry run selesai. Build lolos; main tidak di-push. ${commitsToRelease} commit siap dirilis.`)
  } else {
    const releaseSha = git(['-C', tempWorktree, 'rev-parse', 'HEAD'])
    run('git', ['push', 'origin', `${releaseSha}:refs/heads/${target}`], root, {
      LAUNDRIAN_RELEASE_PUSH: '1',
      LAUNDRIAN_RELEASE_REF: `refs/heads/${target}`,
    })
    syncLocalMain(releaseSha)
    console.log(`\nRelease selesai: ${commitsToRelease} commit dari develop sudah di-fast-forward ke origin/${target}.`)
    console.log('Branch kerja tetap develop. Deploy host akan berjalan sesuai integrasi repository.')
  }
} catch (error) {
  console.error(`\nRelease dibatalkan: ${error.message}`)
  process.exitCode = 1
} finally {
  if (existsSync(join(tempWorktree, '.git'))) {
    try { execFileSync('git', ['worktree', 'remove', '--force', tempWorktree], { cwd: root, stdio: 'ignore' }) } catch {}
  }
  rmSync(tempWorktree, { recursive: true, force: true })
}
