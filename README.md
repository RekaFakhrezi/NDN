# NDN: Nusantara Daily News 📰

**Nusantara Daily News (NDN)** adalah platform portal berita modern berbasis *User-Generated Content* (UGC), di mana pengguna tidak hanya bertindak sebagai pembaca, tetapi juga dapat berkontribusi aktif mengirimkan karya jurnalistik mereka. Proyek ini mengusung arsitektur *frontend* berbasis komponen yang dinamis dan terintegrasi penuh secara *real-time* dengan layanan *cloud database*.

Proyek ini merupakan hasil migrasi dan modernisasi sistem dari *backend* berbasis Laravel 11 menjadi aplikasi *Single Page Application* (SPA) full-stack yang bertenaga React dan Supabase.

---

## 🛠️ Arsitektur Teknologi (Tech Stack)

* **Frontend Framework:** React.js (Vite)
* **Styling Engine:** Tailwind CSS (Modern & Fully Responsive Layout)
* **Routing System:** React Router DOM V6
* **Database & Cloud Provider:** Supabase (PostgreSQL)
* **Object Storage:** Supabase Buckets (`Article-Image`)
* **Authentication:** Supabase Auth (GoTrue Service)

---

## 🌟 Fitur Utama & Kompleksitas Sistem

### 1. Autentikasi & Role-Based Access Control (RBAC)
Sistem memisahkan hak akses secara ketat berdasarkan status pengguna di database publik (`is_admin` & `role`):
* **Pembaca Umum:** Dapat membaca berita, memberikan komentar, dan menyukai artikel.
* **Author / Penulis:** Memiliki akses ke dashboard penulisan, riwayat kiriman artikel, fitur edit draf, serta pengajuan banding editorial.
* **Admin Panel Workspace:** Halaman eksklusif yang diproteksi secara ketat dari sisi *client routing*. Hanya akun dengan otoritas `is_admin = TRUE` yang dapat masuk untuk mengelola ekosistem web.

### 2. Dapur Redaksi & Antrean Moderasi Berita
Berita yang dikirim oleh penulis tidak langsung tayang ke halaman utama, melainkan masuk ke dalam antrean review admin untuk mencegah kebocoran konten hoaks:
* **Manajemen Artikel Live:** Tempat mengontrol artikel yang telah tayang, dilengkapi fitur **Soft Delete** (mengarsipkan artikel dari halaman publik tanpa menghapus data fisik).
* **Kotak Sampah / Arsip:** Memisahkan fitur pemulihan (*restore*) dan **Hard Delete** (pemusnahan permanen data dari PostgreSQL) untuk keamanan data tingkat tinggi.
* **Pengaturan Kategori Dinamis:** Fitur CRUD penuh bagi admin untuk memperbarui kategori berita yang akan langsung merender opsi dinamis pada form tulis berita penulis.

### 3. Arsitektur Kompatibilitas Polimorfik Laravel Notifications
Pusat notifikasi dibangun dengan mempertahankan struktur tabel `notifications` bawaan Laravel 11 untuk mendukung skema *polymorphic relation*:
* Menggunakan pengikat `notifiable_id` dan `notifiable_type`.
* Menyimpan seluruh payload pesan (*title*, *body*, *type*) di dalam satu kolom bertipe data *JSON string text*.
* Mendukung konversi status baca menggunakan penanda waktu `read_at` (*null* melambangkan belum dibaca).
* Sistem otomatis mengirim notifikasi kepada penulis jika artikel disetujui, ditolak, atau menerima komentar baru dari pembaca.

### 4. Counter Likes & Interaksi Real-Time Tanpa Duplikasi
* **Sistem Likes Akurat:** Perhitungan total menyukai artikel tidak lagi menggunakan angka *dummy*, melainkan melakukan *query counting exact* ke tabel persimpangan `article_likes` guna mencegah manipulasi data (satu user hanya bisa menekan tombol suka satu kali).
* **Headline Hero Otomatis:** Halaman utama dilengkapi dengan penarik data dinamis yang menyaring artikel `status = published`, mengurutkan dari yang terbaru, dan menjadikan index pertama sebagai *Headline Hero Image* di halaman depan lengkap dengan konversi penanggalan internasional.
* **Pencarian (Search Bar):** Fitur *live searching* artikel pada halaman utama untuk menyaring judul dan isi konten secara instan.

---

## 📁 Struktur Direktori Penting

```text
src/
├── components/
│   ├── Navbar.jsx        # Navigasi utama dengan pelacak unread notifications badge
│   └── Footer.jsx        # Footer info portal berita
├── lib/
│   └── supabase.js       # Konfigurasi inisialisasi Supabase Client
├── pages/
│   ├── Home.jsx          # Beranda dengan fitur search & kategori filter
│   ├── DetailBerita.jsx  # Detail konten berita, counter likes, & core comments loop
│   ├── SubmitBerita.jsx  # Form kirim berita + Fitur Upload Gambar langsung ke bucket
│   ├── MyArticles.jsx    # Riwayat artikel penulis + Modal Pop-up edit konten & banding
│   ├── Profile.jsx       # Kartu nama jurnalis, statistik views, & update bio pribadi
│   ├── Notifications.jsx # Pusat notifikasi dengan pembacaan payload JSON data
│   ├── AdminOverview.jsx # Workspace Admin Panel (Statistik, Moderasi, CRUD Kategori & Arsip)
│   └── Login.jsx         # Gerbang masuk Autentikasi akun
├── App.jsx               # Registrasi & Proteksi Client-Side Routing
└── main.jsx              # Entry point aplikasi