# Dokumentasi Teknis KK-Extract Plus

## Pengantar

KK-Extract Plus adalah aplikasi web berbasis Google Apps Script yang memungkinkan ekstraksi otomatis data dari gambar Kartu Keluarga (KK) dan pendataan informasi sosial tambahan untuk keperluan administrasi desa/kelurahan.

Dokumen ini menjelaskan aspek teknis aplikasi untuk pengembang dan administrator sistem.

## Arsitektur Sistem

```
┌─────────────────┐     ┌───────────────┐     ┌─────────────────┐
│                 │     │               │     │                 │
│  Web Interface  │◄───►│  Google Apps  │◄───►│  Google Sheets  │
│  (HTML/CSS/JS)  │     │    Script     │     │   (Database)    │
│                 │     │               │     │                 │
└─────────────────┘     └───────┬───────┘     └─────────────────┘
                                │
                                ▼
                        ┌───────────────┐     ┌─────────────────┐
                        │               │     │                 │
                        │ API Ekstraksi │◄───►│  Google Drive   │
                        │      KK       │     │  (File Storage) │
                        │               │     │                 │
                        └───────────────┘     └─────────────────┘
```

### Komponen Utama

1. **Frontend (UI)**
   - HTML, CSS (Tailwind), JavaScript
   - Antarmuka pengguna responsif
   - Form upload KK dan input data sosial
   - Visualisasi data dengan Chart.js

2. **Backend (Google Apps Script)**
   - Pengolahan permintaan HTTP (doGet, processKK)
   - Integrasi dengan API ekstraksi KK
   - Manajemen data spreadsheet
   - Penanganan file di Google Drive

3. **Database (Google Sheets)**
   - Penyimpanan data dalam format tabular
   - Multiple sheets untuk tipe data berbeda
   - Pemisahan data master dan detail

4. **Storage (Google Drive)**
   - Penyimpanan gambar KK yang diunggah
   - Pengorganisasian file dalam folder khusus

## Struktur Kode

Aplikasi terdiri dari empat file utama:

### 1. Code.gs

File utama dengan kode Google Apps Script yang menangani:
- Konfigurasi aplikasi melalui objek `CONFIG`
- Fungsi entrypoint `doGet()` untuk menampilkan UI
- Pemrosesan gambar KK dengan `processKK()`
- Fungsi database CRUD untuk setiap jenis data
- Fungsi pencarian dan statistik
- Pengaturan dan manajemen file

### 2. Index.html

Template HTML utama yang menangani:
- Struktur UI aplikasi
- Tab-tab untuk fitur berbeda (Home, Statistik, Pencarian, Pengaturan)
- Form upload KK
- Form data sosial tambahan
- Tabel hasil pencarian
- Dashboard statistik

### 3. JavaScript.html

File JavaScript yang berisi:
- Logika UI dan interaksi pengguna
- Manipulasi DOM
- Penanganan upload file dengan drag & drop
- Visualisasi data dengan Chart.js
- Validasi form data sosial
- Fungsi utilitas (toast, format data, dll)

### 4. CSS.html (opsional)

Berisi styling tambahan untuk melengkapi Tailwind CSS.

## Struktur Database

Data disimpan dalam spreadsheet Google dengan sheet berikut:

### 1. Data_KK
Menyimpan data master Kartu Keluarga, termasuk:
- Nomor KK
- Informasi kepala keluarga
- Alamat lengkap
- Tanggal penerbitan
- Link ke gambar KK di Google Drive

### 2. Anggota_Keluarga
Menyimpan detail anggota keluarga:
- Nomor KK (relasi ke Data_KK)
- NIK
- Nama
- Jenis kelamin
- Tempat & tanggal lahir
- Agama
- Pendidikan
- Pekerjaan

### 3. Status_Hubungan
Menyimpan status hubungan keluarga:
- Nomor KK (relasi ke Data_KK)
- NIK (relasi ke Anggota_Keluarga)
- Status perkawinan
- Hubungan dalam keluarga
- Kewarganegaraan

### 4. Orang_Tua
Menyimpan data orang tua:
- Nomor KK (relasi ke Data_KK)
- NIK (relasi ke Anggota_Keluarga)
- Nama ayah
- Nama ibu

### 5. Data_Sosial
Menyimpan data sosial tambahan:
- Nomor KK (relasi ke Data_KK)
- Nama kepala keluarga
- Penerima bantuan/JKN/KIS
- Sumber air bersih
- Fasilitas MCK/RTLH
- Penggunaan jamban
- Sumber listrik
- Jenis rumah
- Pemeriksaan disabilitas

### 6. Log
Menyimpan aktivitas sistem:
- Timestamp
- Jenis aktivitas
- Pesan log
- Level log (INFO, WARNING, ERROR)

### 7. Metadata
Menyimpan metadata file:
- Nama file
- File ID di Google Drive
- URL file
- Deskripsi
- Status

## Alur Kerja Aplikasi

### 1. Ekstraksi Data KK

```
┌────────────┐     ┌────────────┐     ┌───────────────┐     ┌────────────┐
│            │     │            │     │               │     │            │
│  Unggah    │────►│ Simpan ke  │────►│ Panggil API   │────►│  Tampilkan │
│  Gambar KK │     │   Drive    │     │  Ekstraksi    │     │   Hasil    │
│            │     │            │     │               │     │            │
└────────────┘     └────────────┘     └───────────────┘     └────────────┘
                                              │
                                              ▼
                                      ┌───────────────┐
                                      │               │
                                      │ Simpan ke     │
                                      │ Spreadsheet   │
                                      │               │
                                      └───────────────┘
```

### 2. Pendataan Sosial

```
┌────────────┐     ┌────────────┐     ┌───────────────┐     ┌────────────┐
│            │     │            │     │               │     │            │
│  Isi Form  │────►│  Validasi  │────►│   Simpan ke   │────►│  Tampilkan │
│   Sosial   │     │    Data    │     │  Spreadsheet  │     │  Konfirmasi│
│            │     │            │     │               │     │            │
└────────────┘     └────────────┘     └───────────────┘     └────────────┘
```

## Konfigurasi dan Deployment

### Prasyarat
- Akun Google
- Akses ke Google Drive, Sheets, dan Apps Script
- API ekstraksi KK (eksternal atau Google Cloud Vision)

### Langkah Deployment
1. Buat project Google Apps Script baru
2. Upload semua file kode (Code.gs, Index.html, JavaScript.html, CSS.html)
3. Buat spreadsheet baru di Google Sheets
4. Update konstanta `CONFIG.DEFAULT_SPREADSHEET_ID` dengan ID spreadsheet
5. Deploy aplikasi sebagai web app:
   - Execute as: Me (atau akun pengguna dengan akses ke Drive dan Sheets)
   - Who has access: Anyone (atau sesuai kebutuhan)
6. Konfigurasi API ekstraksi KK:
   - Update `CONFIG.API_URL` dengan endpoint API ekstraksi
   - Pastikan API dapat menerima gambar dalam format base64

### Pengaturan Lanjutan
- Penyesuaian format data (Custom header, kolom tambahan)
- Integrasi dengan sistem desa yang sudah ada
- Pengaturan hak akses pengguna

## Penggunaan API

KK-Extract Plus menggunakan API eksternal untuk ekstraksi data dari gambar KK. API harus menerima POST request dengan format berikut:

```json
{
  "action": "process-kk",
  "fileData": "base64_encoded_image_data",
  "fileName": "image_filename.jpg",
  "mimeType": "image/jpeg"
}
```

Dan mengembalikan respons dengan format:

```json
{
  "status": "success",
  "data": {
    "analysis": {
      "parsed": {
        "status": "success",
        "nomor_kk": "1234567890123456",
        "kode_keluarga": "...",
        "tanggal_penerbitan": "01-01-2023",
        "kepala_keluarga": {
          "nama": "NAMA KEPALA",
          "nik": "1234567890123456",
          "alamat": "...",
          "rt_rw": "...",
          "desa_kelurahan": "...",
          "kecamatan": "...",
          "kabupaten_kota": "...",
          "provinsi": "...",
          "kode_pos": "..."
        },
        "anggota_keluarga": [
          {
            "nama": "...",
            "nik": "...",
            "jenis_kelamin": "...",
            "tempat_lahir": "...",
            "tanggal_lahir": "...",
            "agama": "...",
            "pendidikan": "...",
            "pekerjaan": "..."
          }
        ],
        "status_hubungan": [
          {
            "nama": "...",
            "status_perkawinan": "...",
            "hubungan_keluarga": "...",
            "kewarganegaraan": "..."
          }
        ],
        "orang_tua": [
          {
            "nama": "...",
            "ayah": "...",
            "ibu": "..."
          }
        ]
      }
    }
  }
}
```

## Keamanan

KK-Extract Plus menerapkan beberapa praktik keamanan:

1. **Validasi Input**: Memeriksa format dan ukuran file sebelum diproses
2. **Sanitasi Data**: Membersihkan data sebelum disimpan ke spreadsheet
3. **Autentikasi Google**: Memanfaatkan sistem autentikasi Google untuk akses
4. **Logging**: Mencatat semua aktivitas penting untuk audit

Namun, implementasi tambahan mungkin diperlukan:
- Enkripsi data sensitif
- Pembatasan akses berdasarkan peran
- Implementasi CAPTCHA untuk mencegah bot
- Audit keamanan berkala

## Performa dan Skalabilitas

### Optimasi Performa
- Batasi ukuran file upload (maksimum 5MB)
- Gunakan caching untuk mengurangi permintaan berulang
- Implementasi loading progress bar untuk file besar

### Keterbatasan
- Google Apps Script memiliki batas waktu eksekusi 6 menit
- Kuota harian untuk akses API
- Batas ukuran spreadsheet (5 juta sel)

### Rekomendasi Skalabilitas
- Untuk jumlah KK < 5.000: Solusi ini ideal
- Untuk jumlah KK 5.000-20.000: Tambahkan spreadsheet terpisah per tahun/wilayah
- Untuk jumlah KK > 20.000: Pertimbangkan migrasi ke solusi database yang lebih robust

## Troubleshooting

### Masalah Umum dan Solusi

| Masalah | Kemungkinan Penyebab | Solusi |
|---------|----------------------|--------|
| Error "Script terlalu lama berjalan" | Proses terlalu berat | Pecah operasi menjadi batch lebih kecil |
| Gambar KK tidak terekstrak dengan benar | Kualitas gambar buruk | Tingkatkan kualitas gambar, pastikan tidak kabur |
| Error akses spreadsheet | Masalah izin | Verifikasi izin akses spreadsheet |
| Form data sosial tidak muncul | Error JavaScript | Periksa konsol browser untuk detail error |
| Data duplikat | Nomor KK yang sama diunggah berulang | Implementasi validasi nomor KK |

## Pemeliharaan dan Update

### Pemeliharaan Rutin
- Periksa log error secara berkala
- Bersihkan data sampah atau duplikat
- Backup spreadsheet secara reguler

### Update Sistem
- Perbarui dependensi (Tailwind, Chart.js)
- Sesuaikan dengan perubahan format KK (jika ada)
- Tambahkan fitur baru sesuai kebutuhan

## Sumber Daya Tambahan

- [Dokumentasi Google Apps Script](https://developers.google.com/apps-script)
- [Dokumentasi Google Sheets API](https://developers.google.com/sheets/api)
- [Dokumentasi Tailwind CSS](https://tailwindcss.com/docs)
- [Dokumentasi Chart.js](https://www.chartjs.org/docs/latest/)

## Lisensi

KK-Extract Plus dilisensikan di bawah lisensi MIT. Lihat file LICENSE untuk informasi lebih lanjut.
