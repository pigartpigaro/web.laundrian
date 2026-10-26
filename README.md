# Website Outlet Laundrian

Website publik responsif untuk memperkenalkan outlet laundry lokal. Nama, logo, alamat, telepon, dan daftar layanan berasal dari API Laundrian. Outlet mengisi deskripsi, judul, dan tema melalui menu Pengaturan → Website laundry di POS.

## Menjalankan dari clone

Prasyarat: Node.js 22 LTS, npm, API Laundrian lokal yang aktif, outlet aktif, serta website yang dipublikasikan.

```powershell
Copy-Item .env.example .env.local
# Sesuaikan VITE_API_BASE_URL dan VITE_OUTLET_ID untuk outlet lokal.
npm ci
npm run dev
```

Buka `http://localhost:5175`. Default API `http://localhost:8020/api`; sesuaikan `VITE_OUTLET_ID` pada `.env.local` dengan ID outlet yang websitenya sudah ditayangkan. ID `1` pada `.env.example` hanya contoh. Outlet juga dapat dipilih lewat `?outlet=<id>`; tombol pratinjau dari POS menyertakan ID outlet otomatis. Endpoint publik tidak memakai token dan hanya mengirim profil pemasaran serta kartu layanan website. Tambahkan origin website ke `FRONTEND_URL` backend agar CORS mengizinkan `http://localhost:5175`.

Build produksi: `npm run build`; preview: `npm run preview`. Hentikan server dengan `Ctrl+C`.

## Git dan release

Website menggunakan workflow yang sama dengan frontend POS dan API: kerja harian di `develop`, production di `main`, lalu perubahan dipromosikan oleh script release setelah validasi.

```powershell
git switch develop
git add .
git commit -m "jelaskan perubahan"
git push origin develop
npm run release
```

`npm run release` (alias `npm run deploy`) perlu working tree bersih dan `develop` lokal yang sama dengan `origin/develop`; script membuat worktree sementara dari `origin/main`, memastikan fast-forward, memasang dependency dengan `npm ci`, lalu memvalidasi build. Jika lolos, script mendorong `main`; branch aktif tetap `develop`. `npm run release -- --dry-run` memvalidasi tanpa push. `npm run build` hanya membangun website. Push manual ke branch production ditolak oleh hook lokal.

Foto utama dan galeri ditampilkan dari foto yang diunggah pemilik melalui Pengaturan website laundry di POS. Jika foto utama belum diunggah, halaman memakai `public/images/laundry-illustration.jpg` sebagai ilustrasi sementara yang diberi label; gambar ini bukan foto outlet. Galeri hanya menampilkan foto yang diunggah pemilik.
