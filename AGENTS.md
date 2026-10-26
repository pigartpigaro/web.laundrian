# Aturan Website Publik Outlet

- Vue 3 + Vite, terpisah dari POS dan API. Gunakan `npm ci`, `npm run dev` (port 5175), `npm run build`.
- Konten outlet harus berasal dari endpoint publik Laravel; jangan membuat harga, jam, ulasan, atau klaim sendiri.
- Endpoint membaca outlet melalui `VITE_OUTLET_ID`; jangan menyimpan token atau mengirim mutasi dari situs publik.
- Ikuti arahan Taste dan Impeccable untuk halaman pemasaran publik. Hormati `prefers-reduced-motion` dan keterbacaan pada ponsel.

## Git dan release

- Kerjakan perubahan pada branch `develop`; `main` hanya untuk production.
- Jalankan `npm run hooks:install` sekali pada clone baru. Hook `.githooks` menolak commit dan push manual ke `main`/`master`; script release memakai pengecualian terbatas untuk push tervalidasi ke `main`.
- `npm run build` hanya membangun website. `npm run release` (alias `npm run deploy`) memeriksa working tree bersih, branch `develop`, sinkronisasi dengan `origin/develop`, dan fast-forward dari `origin/main`, lalu menjalankan `npm ci` serta build pada worktree sementara. Jika lolos, script mendorong fast-forward ke `main` dan branch kerja tetap `develop`. `npm run release -- --dry-run` memvalidasi tanpa push. Hook menolak push manual ke branch production.
- `.env.local` dan `.env.production` berisi konfigurasi lokal dan tidak dilacak Git. `.env.production.example` hanya template; atur `VITE_API_BASE_URL` dan `VITE_OUTLET_ID` sebagai Build variables di host production. Script release lokal mengambil variabel tersebut dari environment atau `.env.production`.
