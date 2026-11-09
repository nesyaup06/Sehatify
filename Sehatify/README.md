# Sehatify

Aplikasi penilaian kesehatan organisasi UMKM (6 faktor OH-Index). Tampilan klasik-minimalis
dengan perpaduan **biru pastel dan putih**, backend **Supabase** (PostgreSQL + Auth), tanpa PHP dan tanpa build step.

```
Sehatify/
├── index.html
├── css/style.css
├── js/config.js          ← isi URL & anon key Supabase di sini
├── js/app.js
└── supabase/
    ├── 01_schema.sql         ← tabel, keamanan (RLS), fungsi, view
    ├── 02_seed_survei.sql    ← 428 responden survei
    └── 03_admin_role.sql     ← hanya untuk project lama yang belum punya peran admin
```

---

## Tutorial Supabase lengkap (±15 menit)

### Langkah 1 — Buat project Supabase
1. Buka <https://supabase.com>, daftar/masuk (bisa dengan GitHub), lalu klik **New project**.
2. Isi:
   - **Name**: `sehatify`
   - **Database Password**: klik *Generate*, lalu **simpan** di tempat aman.
   - **Region**: *Southeast Asia (Singapore)* (terdekat dari Indonesia).
3. Klik **Create new project**, tunggu 1–2 menit sampai dashboard siap.

### Langkah 2 — Buat tabel, fungsi, dan keamanan
1. Menu kiri → **SQL Editor** → **New query**.
2. Buka `supabase/01_schema.sql`, **salin seluruh isinya**, tempel, klik **Run**. Harus muncul *Success. No rows returned*.
3. Klik **New query** lagi, tempel seluruh isi `supabase/02_seed_survei.sql`, klik **Run**. Ini mengisi 428 data survei.
4. Cek di **Table Editor**: tabel `survey_responses` harus berisi **428 baris**; tabel `factors` berisi 6 baris.

> Jalankan `01_schema.sql` **hanya sekali**. Untuk mengulang dari nol, jalankan dulu:
> ```sql
> drop view if exists public.v_scores;
> drop table if exists public.submissions, public.profiles, public.survey_responses, public.factors cascade;
> ```
> lalu ulangi langkah 2. (Akun di menu Authentication tidak ikut terhapus.)
>
> `03_admin_role.sql` **tidak perlu** dijalankan pada project baru; skema terbaru sudah mendukung peran admin.

### Langkah 3 — Atur autentikasi (Email)
Menu **Authentication → Sign In / Providers → Email** (pastikan *Enable Email provider* aktif):
- **Uji coba**: matikan **Confirm email** agar akun langsung aktif setelah mendaftar.
- **Produksi**: nyalakan **Confirm email**, lalu isi **Authentication → URL Configuration**:
  - **Site URL**: alamat website Anda (mis. `https://sehatify.netlify.app`)
  - **Redirect URLs**: tambahkan alamat yang sama, plus `http://localhost:8000` untuk pengujian lokal.

### Langkah 4 — Hubungkan website ke Supabase
1. Buka **Project Settings (ikon roda gigi) → API** (atau tombol **Connect** di bagian atas).
2. Salin **Project URL** dan kunci **anon / publishable**.
3. Buka `js/config.js` lalu isi:

```js
window.SEHATIFY_CONFIG = {
  SUPABASE_URL: 'https://xxxxxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi...',
};
```

Kunci anon aman berada di browser karena data dilindungi Row Level Security.
**Jangan pernah** memakai kunci `service_role` di file ini.

> Catatan: `config.js` di paket ini sudah berisi URL dan anon key dari project Anda sebelumnya.
> Jika Anda membuat project Supabase **baru**, ganti keduanya dengan milik project baru tersebut.

### Langkah 5 — Jalankan di komputer
Buka terminal di dalam folder `Sehatify`, lalu pilih salah satu:

```bash
python3 -m http.server 8000      # lalu buka http://localhost:8000
# atau: npx serve .
# atau: ekstensi "Live Server" di VS Code
```

> Jangan membuka `index.html` dengan klik dua kali (alamat `file://`); gunakan server lokal seperti di atas.

### Langkah 6 — Uji alurnya
1. **Daftar sebagai Pemilik** (mis. UMKM "Warung Contoh"), lalu isi **Penilaian** (16 pertanyaan).
2. Keluar, **daftar sebagai Karyawan** dengan **nama UMKM yang sama persis**, lalu isi penilaian (19 pertanyaan).
   Karyawan baru bisa mengisi setelah Pemilik selesai.
3. Buka **Ringkasan** (dasbor sesuai peran), **Distribusi**, atau **Data UMKM** untuk membandingkan dengan data survei.
4. Cek di Supabase **Table Editor → profiles / submissions** untuk melihat data yang masuk.

### Langkah 7 — Buat akun administrator
1. Daftar lewat website dengan email khusus admin (jangan pakai akun Pemilik yang sudah mengirim penilaian).
2. Di **SQL Editor**, jalankan (ganti emailnya):

```sql
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('admin@domain-anda.id')
returning p.id, p.role;
```

3. Pastikan hasil menampilkan 1 baris dengan `role = admin`, lalu **keluar dan masuk lagi** di website.
   Admin mendapat dasbor platform dan tidak mengisi survei.

### Langkah 8 — Publikasikan (opsional)
Situs ini statis: unggah folder `Sehatify` ke **Netlify** (drag & drop di app.netlify.com/drop), Vercel,
Cloudflare Pages, atau GitHub Pages. Setelah mendapat alamat, masukkan ke
**Authentication → URL Configuration → Site URL** (Langkah 3).

### Masalah umum
| Gejala | Penyebab & solusi |
|---|---|
| "Gagal memuat data… pastikan skema SQL sudah dijalankan" | `01_schema.sql` belum dijalankan, atau URL/key di `config.js` salah. |
| Daftar berhasil tapi tidak bisa masuk: "Email belum dikonfirmasi" | Matikan **Confirm email** (uji coba) atau klik tautan di email. |
| Tautan konfirmasi membuka alamat yang salah | Perbaiki **Site URL** di Authentication → URL Configuration. |
| Karyawan ditolak: "Owner belum mengisi kuesioner" | Pemilik dengan nama UMKM yang sama persis harus mengisi lebih dulu. |
| `relation ... already exists` saat menjalankan SQL | Skema sudah pernah dijalankan; lihat catatan reset di Langkah 2. |
| Halaman kosong / error di konsol | Buka lewat `http://localhost`, bukan `file://`; periksa isi `config.js`. |

---

## Perubahan desain (dari versi hijau U-MAK)
- Palet baru: putih `#ffffff`, biru pastel `#dde9f7` / `#f1f6fc`, aksen biru lembut `#4a7bb0`, teks navy `#1e2f45`.
- Judul memakai huruf serif klasik (Cormorant Garamond), isi memakai Source Sans 3; garis tipis, sudut hampir tegas, bayangan minimal.
- Logo baru dengan tanda tambah (+) dan garis denyut pada beranda; nama diganti menjadi **Sehatify**.
- Tabel faktor di ponsel kini menumpuk agar terbaca penuh.
- Konfigurasi dipindah ke `window.SEHATIFY_CONFIG` (sebelumnya `UMAK_CONFIG`).
- Logika aplikasi, skema database, dan data tidak diubah.

## Cara kerja
- Hanya jawaban mentah yang disimpan; skor dihitung oleh view `v_scores` sehingga selalu konsisten.
- Validasi kuesioner ada di fungsi `submit_assessment()` (lengkap, rentang 1–N, sekali isi, karyawan menunggu pemilik).
- Skor total = rata-rata tertimbang (INS 0,20; OV 0,18; LDI 0,17; WEQ, OPS, ECT 0,15), skala 0–5.
  Kategori: Sangat Baik ≥ 4, Baik > 3, Cukup ≥ 2, Buruk < 2.

## Keamanan
- Tabel dilindungi RLS: pengguna hanya membaca profil dan jawabannya sendiri; penulisan hanya lewat `submit_assessment()`.
- Semua pengguna login dapat melihat skor gabungan (nama UMKM terdaftar, sektor, lokasi, skor), bukan jawaban individual atau email.
- Jangan membagikan kunci `service_role`, password database, atau akses SQL Editor kepada pengguna biasa.

## Catatan data
- Kolom `INS` pada data survei berskala 1–3 (belum dinormalisasi), sedangkan penilaian baru menormalkannya ke 0–5,
  sehingga skor INS UMKM terdaftar tidak sepenuhnya sebanding dengan data survei.
- Hanya skor per faktor yang diimpor; 35 kolom jawaban mentah (OH1–OH35) tidak dimasukkan ke database.
