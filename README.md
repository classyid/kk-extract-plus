# KK-Extract Plus

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

Aplikasi web berbasis Google Apps Script untuk ekstraksi data kartu keluarga (KK) dengan fitur pendataan sosial terintegrasi untuk keperluan desa/kelurahan.

## 📋 Fitur Utama

- **Ekstraksi Otomatis Data KK**: Unggah gambar KK, data akan diekstrak secara otomatis
- **Pendataan Sosial Terintegrasi**: Formulir tambahan untuk data sosial sesuai format desa/kelurahan
- **Penyimpanan Terstruktur**: Menyimpan data KK dan data sosial dalam spreadsheet terpisah
- **Dashboard Statistik**: Visualisasi data penduduk berdasarkan berbagai kategori
- **Pencarian Data**: Pencarian cepat berdasarkan nama, NIK, atau nomor KK
- **Antarmuka Responsif**: Tampilan yang rapi dan berfungsi baik di perangkat mobile

## 🖼️ Screenshot

![Screenshot KK-Extract Plus](https://blog.classy.id/upload/gambar_berita/e506c389d9634f233108026e6911b8ea_20250501114012.png)
![Screenshot KK-Extract Plus](https://blog.classy.id/upload/gambar_berita/e506c389d9634f233108026e6911b8ea_20250501114112.png)

## 🧩 Komponen Utama

- **Frontend**: HTML, Tailwind CSS, Chart.js
- **Backend**: Google Apps Script
- **Database**: Google Spreadsheet
- **Penyimpanan**: Google Drive

## 🛠️ Pengembangan

Aplikasi ini dikembangkan di atas Google Apps Script, yang memudahkan penyebaran dan implementasi karena tidak memerlukan server khusus.

### Prasyarat

- Akun Google
- Akses ke Google Drive dan Google Sheets
- API ekstraksi KK 

### Instalasi

1. Clone repository ini
2. Buat project Google Apps Script baru
3. Salin file-file berikut ke project:
   - `Code.gs`
   - `Index.html`
   - `JavaScript.html`
   - `CSS.html`
4. Deploy aplikasi sebagai web app
5. Atur ID spreadsheet dan URL API ekstraksi KK di pengaturan aplikasi

## 📊 Struktur Data

Aplikasi menyimpan data ke beberapa sheet:

- **Data_KK**: Data utama kepala keluarga
- **Anggota_Keluarga**: Data seluruh anggota keluarga
- **Status_Hubungan**: Status hubungan dalam keluarga
- **Orang_Tua**: Data orang tua
- **Data_Sosial**: Data sosial tambahan (penerima bantuan, sumber air, fasilitas MCK, dll)
- **Log**: Catatan aktivitas sistem
- **Metadata**: Metadata file KK yang diunggah

## 🔄 Pendataan Sosial

Fitur pendataan sosial mencakup:

- Status penerima bantuan/JKN/KIS
- Sumber air bersih
- Fasilitas MCK/RTLH
- Penggunaan jamban
- Sumber listrik
- Jenis rumah
- Pemeriksaan disabilitas

## 🚀 Penggunaan

1. Buka aplikasi web
2. Unggah gambar KK melalui form atau drag & drop
3. Verifikasi data KK yang terekstrak
4. Isi data sosial tambahan
5. Simpan data

## 🤝 Kontribusi

Kontribusi sangat diterima! Jika Anda ingin berkontribusi:

1. Fork repository
2. Buat branch fitur baru (`git checkout -b feature/amazing-feature`)
3. Commit perubahan Anda (`git commit -m 'Add some amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buka Pull Request

## 📝 Lisensi

Didistribusikan di bawah Lisensi MIT. Lihat `LICENSE` untuk informasi lebih lanjut.

## 📞 Kontak

[Andri Wiratmono] - [kontak@classy.id
