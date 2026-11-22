# Aplikasi Antrean Kantin

Aplikasi sederhana untuk mencatat pesanan kantin dan mengatur status antrean. Frontend menggunakan HTML, CSS, dan JavaScript yang dipisah. PHP digunakan sebagai API/konektor ke MySQL melalui PDO.

## Fitur

- Mencatat nama pemesan dan rincian pesanan.
- Membuat nomor antrean otomatis dengan awalan `A`.
- Nomor antrean dimulai lagi dari A001 setiap tanggal baru.
- Mengubah status: Menunggu, Diproses, Siap diambil, dan Selesai.
- Mencari antrean berdasarkan nomor, nama, atau rincian pesanan.
- Memfilter daftar berdasarkan status.
- Menghapus pesanan hari ini.
- Menampilkan jumlah pesanan dan ringkasan status hari ini.
- Tampilan responsif untuk komputer dan HP.

## Struktur folder

```text
Antrean_Kantin/
├── index.html
├── README.md
├── assets/
│   ├── css/style.css
│   └── js/app.js
├── api/
│   ├── config.php
│   └── index.php
└── database/
    └── antrean_kantin.sql
```

## Cara memasang di XAMPP

1. Pastikan XAMPP sudah terpasang.
2. Salin folder `Antrean_Kantin` ke dalam folder `C:\xampp\htdocs\`.
3. Buka XAMPP Control Panel, lalu tekan **Start** pada Apache dan MySQL.
4. Buka `http://localhost/phpmyadmin` di browser.
5. Pilih menu **Import**.
6. Pilih file `database/antrean_kantin.sql` dari folder aplikasi, lalu tekan **Import/Kirim**.
7. Buka `api/config.php`. Pengaturan awal sudah sesuai konfigurasi umum XAMPP:

   ```php
   $host = 'localhost';
   $database = 'db_antrean_kantin';
   $username = 'root';
   $password = '';
   ```

   Apabila MySQL XAMPP kamu menggunakan password, ubah nilai `$password` sesuai password MySQL tersebut.
8. Jalankan aplikasi melalui alamat berikut (jangan dibuka dengan klik dua kali file HTML):

   `http://localhost/Antrean_Kantin/`

## Struktur database

- `queue_sequences`: menyimpan nomor terakhir yang dipakai pada setiap tanggal. Baris tanggal dikunci saat nomor baru dibuat agar nomor antrean tidak bentrok.
- `queue_orders`: menyimpan nomor antrean, nama pemesan, rincian pesanan, status, tanggal, dan waktu dibuat.

Script SQL membuat database `db_antrean_kantin`. Aplikasi menampilkan daftar pesanan untuk tanggal hari ini. Data tanggal sebelumnya tetap berada di database.

## Catatan

- Data antrean tersimpan di MySQL sehingga tetap tersedia setelah browser ditutup.
- Status hanya menerima empat pilihan yang disediakan aplikasi.
- Font Poppins dimuat dari Google Fonts. Bila internet tidak tersedia, browser menggunakan font cadangan.
#
