# Aturan Website Publik Outlet

- Vue 3 + Vite, terpisah dari POS dan API. Gunakan `npm ci`, `npm run dev` (port 5175), `npm run build`.
- Konten outlet harus berasal dari endpoint publik Laravel; jangan membuat harga, jam, ulasan, atau klaim sendiri.
- Endpoint membaca outlet melalui `VITE_OUTLET_ID`; jangan menyimpan token atau mengirim mutasi dari situs publik.
- Ikuti arahan Taste dan Impeccable untuk halaman pemasaran publik. Hormati `prefers-reduced-motion` dan keterbacaan pada ponsel.

## Git dan release

- Kerjakan perubahan pada branch `develop`; `main` hanya untuk production.
- Jalankan `npm run hooks:install` sekali pada clone baru. Hook `.githooks` menolak commit langsung ke `main`/`master` dan push langsung ke branch tersebut.
- `npm run build` hanya membangun website. `npm run release` memeriksa working tree bersih, branch `develop`, sinkronisasi dengan `origin/develop`, lalu menjalankan `npm ci` dan build production pada worktree sementara. Script tidak merge atau push; buat Pull Request `develop` ke `main` setelah validasi dan ikuti proteksi GitHub.
- `.env.local` berisi konfigurasi lokal dan tidak dilacak Git. `.env.production` hanya boleh memuat URL publik dan konfigurasi nonrahasia.
