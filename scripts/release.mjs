import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const target = 'main'
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

if (process.argv.includes('--help')) {
  console.log('npm run release memvalidasi website dari worktree sementara. Script tidak merge atau push.')
  process.exit(0)
}

const tempWorktree = mkdtempSync(join(tmpdir(), 'laundrian-web-release-'))

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim()
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.error) throw new Error(`${command} ${args.join(' ')} gagal: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} gagal (kode ${result.status}).`)
}

try {
  if (git(['status', '--porcelain'])) throw new Error('working tree harus bersih.')
  if (git(['branch', '--show-current']) !== 'develop') throw new Error('jalankan release dari branch develop.')

  run('git', ['fetch', 'origin', '--prune'], root)
  const divergence = git(['rev-list', '--left-right', '--count', 'develop...origin/develop']).split(/\s+/).map(Number)
  if (divergence[0] !== 0 || divergence[1] !== 0) throw new Error('develop lokal dan origin/develop harus sinkron; push commit develop terlebih dahulu.')
  if (git(['rev-list', '--count', `origin/${target}..origin/develop`]) === '0') throw new Error(`tidak ada commit baru dari develop untuk ${target}.`)

  run('git', ['worktree', 'add', '--detach', tempWorktree, 'origin/develop'], root)
  run(npm, ['ci'], tempWorktree)
  run(npm, ['run', 'build'], tempWorktree)

  console.log(`\nValidasi website selesai. Tidak ada merge atau push ke ${target}.`)
  console.log(`Buat Pull Request develop -> ${target} di GitHub dan ikuti branch protection.`)
} catch (error) {
  console.error(`\nRelease dibatalkan: ${error.message}`)
  process.exitCode = 1
} finally {
  if (existsSync(join(tempWorktree, '.git'))) {
    try { execFileSync('git', ['worktree', 'remove', '--force', tempWorktree], { cwd: root, stdio: 'ignore' }) } catch {}
  }
  rmSync(tempWorktree, { recursive: true, force: true })
}
