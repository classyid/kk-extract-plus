// File: Code.gs
// =============================================
// KONFIGURASI APLIKASI
// =============================================

// Konfigurasi umum
const CONFIG = {
  // URL API ekstraksi Kartu Keluarga (ganti dengan URL deployment API Anda)
  API_URL: "<https://lynk.id/classyid/>",
  
  // Nama folder di Google Drive untuk menyimpan gambar KK
  UPLOAD_FOLDER_NAME: "KK_Uploads",
  
  // ID Google Spreadsheet default (opsional, dapat dikosongkan)
  DEFAULT_SPREADSHEET_ID: "<ID-SPREADSHEET>",
  
  // Nama-nama sheet untuk data yang berbeda
  SHEETS: {
    MASTER: "Data_KK",
    ANGGOTA: "Anggota_Keluarga",
    HUBUNGAN: "Status_Hubungan",
    ORANG_TUA: "Orang_Tua",
    LOG: "Log",
    METADATA: "Metadata",
    // Tambahan sheet untuk data sosial
    DATA_SOSIAL: "Data_Sosial"
  },
  
  // Header untuk masing-masing sheet
  HEADERS: {
    MASTER: [
      "Timestamp", "Nomor KK", "Kode Keluarga", "Nama Kepala Keluarga", "NIK Kepala Keluarga", 
      "Alamat", "RT/RW", "Desa/Kelurahan", "Kecamatan", "Kabupaten/Kota", 
      "Provinsi", "Kode Pos", "Tanggal Penerbitan", "File URL", "File Name"
    ],
    ANGGOTA: [
      "Timestamp", "Nomor KK", "NIK", "Nama", "Jenis Kelamin", 
      "Tempat Lahir", "Tanggal Lahir", "Agama", "Pendidikan", 
      "Jenis Pekerjaan"
    ],
    HUBUNGAN: [
      "Timestamp", "Nomor KK", "NIK", "Nama", "Status Perkawinan",
      "Hubungan Dalam Keluarga", "Kewarganegaraan"
    ],
    ORANG_TUA: [
      "Timestamp", "Nomor KK", "NIK", "Nama", "Nama Ayah", "Nama Ibu"
    ],
    LOG: [
      "Timestamp", "Action", "Message", "Level"
    ],
    METADATA: [
      "Timestamp", "File Name", "File ID", "File URL", "Description", "Status"
    ],
    // Header tambahan untuk data sosial berdasarkan gambar
    DATA_SOSIAL: [
      "Timestamp", "Nomor KK", "Nama Kepala Keluarga", 
      "Penerima Bantuan/JKN/KIS", "Sumber Air Bersih", "Fasilitas MCK/RTLH", 
      "Penggunaan Jamban", "Sumber Listrik", "Jenis Rumah", "Pemeriksaan Disabilitas"
    ]
  },
  
  // Opsi untuk data sosial (sesuai dengan format di gambar)
  DATA_SOSIAL_OPTIONS: {
    PENERIMA_BANTUAN: ["Ya", "Tidak"],
    SUMBER_AIR: ["PDAM", "Sumur/Mata Air", "Kemarau/Sungai", "Danau", "Kolam", "Sumber Air Lainnya"],
    FASILITAS_MCK: ["Ya", "Tidak"],
    PENGGUNAAN_JAMBAN: ["Sendiri", "Bersama Tetangga/Umum"],
    SUMBER_LISTRIK: ["PLN", "Sumber Lain"],
    JENIS_RUMAH: ["Permanen", "Semi Permanen", "Non Permanen", "Milik Sendiri", "Menumpang"],
    PEMERIKSAAN_DISABILITAS: ["Intelektual", "Mental", "Fisik", "Sensorik", "Penglihatan", "Pendengaran", "Fisik"]
  }
};

// =============================================
// FUNGSI UTAMA APLIKASI
// =============================================

// Fungsi utama untuk render HTML
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Ekstraksi Data Kartu Keluarga')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Fungsi untuk menyertakan file HTML lain
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// =============================================
// FUNGSI PEMROSESAN KARTU KELUARGA
// =============================================

// Fungsi untuk memproses gambar Kartu Keluarga
function processKK(formObject) {
  try {
    // Decode base64 data
    const fileBlob = Utilities.newBlob(Utilities.base64Decode(formObject.fileData), formObject.mimeType, formObject.fileName);
    
    // Simpan file di Google Drive
    const folderId = getOrCreateFolder(CONFIG.UPLOAD_FOLDER_NAME);
    const folder = DriveApp.getFolderById(folderId);
    const uploadedFile = folder.createFile(fileBlob);
    const fileUrl = uploadedFile.getUrl();
    
    // Log aktivitas upload
    logActivity("Upload file", "File berhasil diunggah: " + formObject.fileName, "INFO");
    
    // Panggil API Ekstraksi Data KK
    const apiResponse = callKkApi(formObject.fileData, formObject.fileName, formObject.mimeType);
    
    // Jika berhasil dan dokumen adalah Kartu Keluarga, simpan data ke spreadsheet
    if (apiResponse.status === "success" && apiResponse.data.analysis.parsed.status === "success") {
      // Simpan data KK ke spreadsheet
      saveToSpreadsheet(apiResponse.data.analysis.parsed, fileUrl, formObject.fileName);
      
      // Tambahkan data sosial dalam respons untuk ditampilkan di UI
      apiResponse.data.dataSosialForm = createDataSosialForm(apiResponse.data.analysis.parsed.nomor_kk, 
                                                             apiResponse.data.analysis.parsed.kepala_keluarga.nama);
      
      // Log aktivitas ekstraksi berhasil
      logActivity("Ekstraksi data", "Data KK berhasil diekstrak: " + apiResponse.data.analysis.parsed.nomor_kk, "INFO");
    } else if (apiResponse.status === "success" && apiResponse.data.analysis.parsed.status === "not_kk") {
      // Log dokumen bukan KK
      logActivity("Validasi dokumen", "Dokumen bukan merupakan Kartu Keluarga: " + formObject.fileName, "WARNING");
    }
    
    return apiResponse;
  } catch (error) {
    // Log error
    logActivity("Error", "Terjadi kesalahan: " + error.toString(), "ERROR");
    
    Logger.log(error);
    return {
      status: "error",
      message: "Terjadi kesalahan: " + error.toString(),
      code: 500
    };
  }
}

// Fungsi untuk memanggil API Ekstraksi Data Kartu Keluarga
function callKkApi(fileData, fileName, mimeType) {
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify({
      action: 'process-kk',
      fileData: fileData,
      fileName: fileName,
      mimeType: mimeType
    }),
    'muteHttpExceptions': true
  };
  
  try {
    const response = UrlFetchApp.fetch(CONFIG.API_URL, options);
    return JSON.parse(response.getContentText());
  } catch (error) {
    Logger.log("Error memanggil API: " + error);
    return {
      status: "error",
      message: "Gagal terhubung ke API ekstraksi Kartu Keluarga. Silakan periksa konfigurasi URL API.",
      code: 500
    };
  }
}

// =============================================
// FUNGSI GOOGLE DRIVE
// =============================================

// Fungsi untuk mendapatkan atau membuat folder di Google Drive
function getOrCreateFolder(folderName) {
  let folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next().getId();
  } else {
    try {
      let folder = DriveApp.createFolder(folderName);
      return folder.getId();
    } catch (error) {
      Logger.log("Error membuat folder: " + error);
      throw new Error("Tidak dapat membuat folder di Google Drive. Periksa izin akses Drive Anda.");
    }
  }
}

// =============================================
// FUNGSI SPREADSHEET
// =============================================

// Fungsi untuk mendapatkan Spreadsheet aktif
function getActiveSpreadsheet() {
  try {
    // Coba dapatkan spreadsheet dari properti
    const savedId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    
    if (savedId) {
      return SpreadsheetApp.openById(savedId);
    } else if (CONFIG.DEFAULT_SPREADSHEET_ID) {
      // Gunakan ID default jika tersedia
      return SpreadsheetApp.openById(CONFIG.DEFAULT_SPREADSHEET_ID);
    } else {
      // Gunakan spreadsheet aktif jika ada
      const active = SpreadsheetApp.getActiveSpreadsheet();
      if (active) {
        return active;
      }
    }
    
    // Jika tidak ada spreadsheet yang tersedia
    throw new Error("ID Spreadsheet tidak ditemukan. Silakan atur ID Spreadsheet terlebih dahulu.");
  } catch (error) {
    Logger.log("Error mendapatkan spreadsheet: " + error);
    throw error;
  }
}

// Fungsi untuk mendapatkan atau membuat sheet dengan header
function getOrCreateSheet(ss, sheetName, headers) {
  try {
    let sheet = ss.getSheetByName(sheetName);
    
    // Jika sheet tidak ada, buat baru dengan header
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      
      // Tambahkan header dan format
      if (headers && headers.length > 0) {
        sheet.appendRow(headers);
        
        // Format header (bold dan garis bawah)
        sheet.getRange(1, 1, 1, headers.length)
          .setFontWeight('bold')
          .setBorder(false, false, true, false, false, false);
        
        // Freeze header row
        sheet.setFrozenRows(1);
      }
    } else {
      // Periksa apakah header sudah ada dan sesuai
      const existingHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
      const headersMatch = existingHeaders.every((header, index) => header === headers[index]);
      
      // Jika header tidak cocok atau tidak ada, tambahkan
      if (!headersMatch || existingHeaders.length === 0) {
        // Hapus semua data (jika sheet kosong, ini tidak akan berpengaruh)
        if (sheet.getLastRow() > 0) {
          sheet.clear();
        }
        
        // Tambahkan header baru
        sheet.appendRow(headers);
        
        // Format header
        sheet.getRange(1, 1, 1, headers.length)
          .setFontWeight('bold')
          .setBorder(false, false, true, false, false, false);
        
        // Freeze header row
        sheet.setFrozenRows(1);
      }
    }
    
    return sheet;
  } catch (error) {
    Logger.log("Error membuat sheet: " + error);
    throw error;
  }
}

// Fungsi untuk menyimpan data ekstraksi KK ke Spreadsheet
function saveToSpreadsheet(kkData, fileUrl, fileName) {
  try {
    // Dapatkan spreadsheet
    const ss = getActiveSpreadsheet();
    
    // Buat objek timestamp
    const timestamp = new Date();
    
    // 1. Simpan data master ke sheet "Data_KK"
    let masterSheet = getOrCreateSheet(ss, CONFIG.SHEETS.MASTER, CONFIG.HEADERS.MASTER);
    
    masterSheet.appendRow([
      timestamp, 
      kkData.nomor_kk,
      kkData.kode_keluarga,
      kkData.kepala_keluarga.nama, 
      kkData.kepala_keluarga.nik,
      kkData.kepala_keluarga.alamat || "", 
      kkData.kepala_keluarga.rt_rw || "", 
      kkData.kepala_keluarga.desa_kelurahan || "", 
      kkData.kepala_keluarga.kecamatan || "", 
      kkData.kepala_keluarga.kabupaten_kota || "", 
      kkData.kepala_keluarga.provinsi || "", 
      kkData.kepala_keluarga.kode_pos || "", 
      kkData.tanggal_penerbitan || "",
      fileUrl, 
      fileName
    ]);
    
    // 2. Simpan data anggota keluarga ke sheet "Anggota_Keluarga"
    let anggotaSheet = getOrCreateSheet(ss, CONFIG.SHEETS.ANGGOTA, CONFIG.HEADERS.ANGGOTA);
    
    if (kkData.anggota_keluarga && kkData.anggota_keluarga.length > 0) {
      kkData.anggota_keluarga.forEach(anggota => {
        anggotaSheet.appendRow([
          timestamp,
          kkData.nomor_kk,
          anggota.nik,
          anggota.nama,
          anggota.jenis_kelamin,
          anggota.tempat_lahir,
          anggota.tanggal_lahir,
          anggota.agama,
          anggota.pendidikan,
          anggota.pekerjaan
        ]);
      });
    }
    
    // 3. Simpan data status hubungan ke sheet "Status_Hubungan"
    let hubunganSheet = getOrCreateSheet(ss, CONFIG.SHEETS.HUBUNGAN, CONFIG.HEADERS.HUBUNGAN);
    
    if (kkData.status_hubungan && kkData.status_hubungan.length > 0) {
      kkData.status_hubungan.forEach(hubungan => {
        // Cari NIK yang sesuai dengan nama dalam array anggota_keluarga
        let nik = "";
        for (let i = 0; i < kkData.anggota_keluarga.length; i++) {
          if (kkData.anggota_keluarga[i].nama === hubungan.nama) {
            nik = kkData.anggota_keluarga[i].nik;
            break;
          }
        }

        hubunganSheet.appendRow([
          timestamp,
          kkData.nomor_kk,
          nik,
          hubungan.nama,
          hubungan.status_pernikahan || hubungan.status_perkawinan || "",
          hubungan.hubungan_keluarga || "",
          hubungan.kewarganegaraan || ""
        ]);
      });
    }
    
    // 4. Simpan data orang tua ke sheet "Orang_Tua"
    let orangTuaSheet = getOrCreateSheet(ss, CONFIG.SHEETS.ORANG_TUA, CONFIG.HEADERS.ORANG_TUA);
    
    if (kkData.orang_tua && kkData.orang_tua.length > 0) {
      kkData.orang_tua.forEach(orangTua => {
        // Cari NIK yang sesuai dengan nama dalam array anggota_keluarga
        let nik = "";
        for (let i = 0; i < kkData.anggota_keluarga.length; i++) {
          if (kkData.anggota_keluarga[i].nama === orangTua.nama) {
            nik = kkData.anggota_keluarga[i].nik;
            break;
          }
        }

       orangTuaSheet.appendRow([
          timestamp,
          kkData.nomor_kk,
          nik,
          orangTua.nama,
          orangTua.ayah || "",
          orangTua.ibu || ""
        ]);
      });
    }
    
    // 5. Simpan metadata ke sheet "Metadata"
    let metadataSheet = getOrCreateSheet(ss, CONFIG.SHEETS.METADATA, CONFIG.HEADERS.METADATA);
    
    metadataSheet.appendRow([
      timestamp,
      fileName,
      '', // File ID, bisa ditambahkan jika diperlukan
      fileUrl,
      'Kartu Keluarga milik ' + kkData.kepala_keluarga.nama,
      'SUCCESS'
    ]);
    
    return true;
  } catch (error) {
    Logger.log("Error menyimpan ke spreadsheet: " + error);
    
    // Log error saat menyimpan data
    logActivity("Database", "Error menyimpan data: " + error.toString(), "ERROR");
    
    throw error;
  }
}

// =============================================
// FUNGSI DATA SOSIAL TAMBAHAN
// =============================================

// Fungsi untuk membuat form data sosial
function createDataSosialForm(nomorKK, namaKepala) {
  return {
    nomorKK: nomorKK,
    namaKepala: namaKepala,
    options: CONFIG.DATA_SOSIAL_OPTIONS
  };
}

// Fungsi untuk menyimpan data sosial
function saveDataSosial(formData) {
  try {
    // Dapatkan spreadsheet
    const ss = getActiveSpreadsheet();
    
    // Buat objek timestamp
    const timestamp = new Date();
    
    // Dapatkan atau buat sheet data sosial
    let dataSosialSheet = getOrCreateSheet(ss, CONFIG.SHEETS.DATA_SOSIAL, CONFIG.HEADERS.DATA_SOSIAL);
    
    // Periksa apakah data untuk KK ini sudah ada
    const dataRange = dataSosialSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    const nomorKKIdx = headers.indexOf("Nomor KK");
    
    let rowIndex = -1;
    
    // Cari baris dengan nomor KK yang sama
    for (let i = 1; i < data.length; i++) {
      if (data[i][nomorKKIdx] === formData.nomorKK) {
        rowIndex = i + 1; // +1 karena indeks baris di Sheet mulai dari 1
        break;
      }
    }
    
    // Jika data sosial untuk KK ini sudah ada, update
    if (rowIndex > 0) {
      dataSosialSheet.getRange(rowIndex, 1, 1, CONFIG.HEADERS.DATA_SOSIAL.length).setValues([[
        timestamp,
        formData.nomorKK,
        formData.namaKepala,
        formData.penerimaBantuan,
        formData.sumberAir,
        formData.fasilitasMck,
        formData.penggunaanJamban,
        formData.sumberListrik,
        formData.jenisRumah,
        formData.pemeriksaanDisabilitas
      ]]);
      
      logActivity("Data Sosial", "Data sosial berhasil diperbarui untuk KK: " + formData.nomorKK, "INFO");
    } else {
      // Jika belum ada, tambahkan data baru
      dataSosialSheet.appendRow([
        timestamp,
        formData.nomorKK,
        formData.namaKepala,
        formData.penerimaBantuan,
        formData.sumberAir,
        formData.fasilitasMck,
        formData.penggunaanJamban,
        formData.sumberListrik,
        formData.jenisRumah,
        formData.pemeriksaanDisabilitas
      ]);
      
      logActivity("Data Sosial", "Data sosial baru berhasil ditambahkan untuk KK: " + formData.nomorKK, "INFO");
    }
    
    return {
      status: "success",
      message: "Data sosial berhasil disimpan"
    };
  } catch (error) {
    Logger.log("Error menyimpan data sosial: " + error);
    
    logActivity("Data Sosial", "Error menyimpan data sosial: " + error.toString(), "ERROR");
    
    return {
      status: "error",
      message: "Terjadi kesalahan saat menyimpan data sosial: " + error.toString()
    };
  }
}

// Fungsi untuk mendapatkan data sosial berdasarkan nomor KK
function getDataSosial(nomorKK) {
  try {
    // Dapatkan spreadsheet
    const ss = getActiveSpreadsheet();
    
    // Dapatkan sheet data sosial
    const dataSosialSheet = ss.getSheetByName(CONFIG.SHEETS.DATA_SOSIAL);
    
    // Jika sheet belum ada, return data kosong
    if (!dataSosialSheet) {
      return {
        status: "success",
        data: null,
        message: "Belum ada data sosial"
      };
    }
    
    // Dapatkan data
    const dataRange = dataSosialSheet.getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    const nomorKKIdx = headers.indexOf("Nomor KK");
    
    // Jika header tidak ditemukan
    if (nomorKKIdx === -1) {
      return {
        status: "error",
        message: "Format sheet data sosial tidak valid"
      };
    }
    
    // Cari data untuk nomor KK yang diminta
    for (let i = 1; i < data.length; i++) {
      if (data[i][nomorKKIdx] === nomorKK) {
        // Konversi data ke objek
        const result = {};
        headers.forEach((header, index) => {
          result[header] = data[i][index];
        });
        
        return {
          status: "success",
          data: result
        };
      }
    }
    
    // Jika data tidak ditemukan
    return {
      status: "success",
      data: null,
      message: "Data sosial untuk KK ini belum ada"
    };
  } catch (error) {
    Logger.log("Error mendapatkan data sosial: " + error);
    
    return {
      status: "error",
      message: "Terjadi kesalahan saat mengambil data sosial: " + error.toString()
    };
  }
}

// =============================================
// FUNGSI LOG AKTIVITAS
// =============================================

// Fungsi untuk mencatat log aktivitas
function logActivity(action, message, level = "INFO") {
  try {
    const ss = getActiveSpreadsheet();
    let logSheet = getOrCreateSheet(ss, CONFIG.SHEETS.LOG, CONFIG.HEADERS.LOG);
    
    logSheet.appendRow([
      new Date(),
      action,
      message,
      level
    ]);
  } catch (error) {
    Logger.log("Error mencatat log: " + error);
    // Tidak throw error agar tidak mengganggu alur utama
  }
}

// =============================================
// FUNGSI STATISTIK & PENCARIAN
// =============================================

// Fungsi untuk mendapatkan data statistik dari spreadsheet
function getStatistics() {
  try {
    const ss = getActiveSpreadsheet();
    
    // Setup default statistics
    const defaultStats = {
      total: 0,
      byGender: { "LAKI-LAKI": 0, PEREMPUAN: 0 },
      byMarriage: { "BELUM KAWIN": 0, KAWIN: 0, "CERAI HIDUP": 0, "CERAI MATI": 0 },
      byReligion: { "ISLAM": 0, "KRISTEN": 0, "KATOLIK": 0, "HINDU": 0, "BUDDHA": 0, "KONGHUCU": 0 },
      byOccupation: {},
      byDistrict: {}
    };
    
    // Cek sheet anggota
    let anggotaSheet = ss.getSheetByName(CONFIG.SHEETS.ANGGOTA);
    if (!anggotaSheet || anggotaSheet.getLastRow() <= 1) {
      return defaultStats;
    }
    
    const data = anggotaSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return defaultStats;
    }
    
    const headers = data[0];
    
    // Mencari indeks kolom
    const nikIdx = headers.indexOf("NIK");
    const genderIdx = headers.indexOf("Jenis Kelamin");
    const religionIdx = headers.indexOf("Agama");
    const occupationIdx = headers.indexOf("Jenis Pekerjaan");
    
    // Verifikasi bahwa semua indeks kolom ditemukan
    if (genderIdx === -1 || religionIdx === -1 || occupationIdx === -1 || nikIdx === -1) {
      Logger.log("Beberapa kolom tidak ditemukan dalam sheet Anggota_Keluarga");
      return defaultStats;
    }
    
    // Mencari status perkawinan di sheet hubungan
    let hubunganSheet = ss.getSheetByName(CONFIG.SHEETS.HUBUNGAN);
    let marriageMapping = {};
    
    if (hubunganSheet && hubunganSheet.getLastRow() > 1) {
      const hubunganData = hubunganSheet.getDataRange().getValues();
      const hubunganHeaders = hubunganData[0];
      
      const hubNikIdx = hubunganHeaders.indexOf("NIK");
      const marriageIdx = hubunganHeaders.indexOf("Status Perkawinan");
      
      if (hubNikIdx !== -1 && marriageIdx !== -1) {
        for (let i = 1; i < hubunganData.length; i++) {
          const nik = hubunganData[i][hubNikIdx] ? hubunganData[i][hubNikIdx].toString() : "";
          const marriage = hubunganData[i][marriageIdx] ? hubunganData[i][marriageIdx].toString().toUpperCase() : "";
          if (nik && marriage) {
            marriageMapping[nik] = marriage;
          }
        }
      }
    }
    
    // Dapatkan data kecamatan dari sheet Master 
    let districtMapping = {};
    const masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER);
    if (masterSheet && masterSheet.getLastRow() > 1) {
      const masterData = masterSheet.getDataRange().getValues();
      const masterHeaders = masterData[0];
      const masterKKIdx = masterHeaders.indexOf("Nomor KK");
      const masterDistrictIdx = masterHeaders.indexOf("Kecamatan");
      
      if (masterKKIdx !== -1 && masterDistrictIdx !== -1) {
        for (let i = 1; i < masterData.length; i++) {
          const kk = masterData[i][masterKKIdx] ? masterData[i][masterKKIdx].toString() : "";
          const district = masterData[i][masterDistrictIdx] ? masterData[i][masterDistrictIdx].toString().toUpperCase() : "";
          if (kk && district) {
            districtMapping[kk] = district;
          }
        }
      }
    }
    
    // Menghapus header
    const rows = data.slice(1);
    
    // Memastikan ada data
    if (rows.length === 0) {
      return defaultStats;
    }
    
    // Statistik dasar
    const stats = {
      total: rows.length,
      byGender: {},
      byMarriage: {},
      byReligion: {},
      byOccupation: {},
      byDistrict: {}
    };
    
    // Hitung statistik
    const kkIdx = headers.indexOf("Nomor KK");
    
    rows.forEach(row => {
      // Pastikan semua nilai adalah string
      const nik = row[nikIdx] ? row[nikIdx].toString() : "";
      if (!nik) return; // Skip baris tanpa NIK
      
      const kk = row[kkIdx] ? row[kkIdx].toString() : "";
      
      // Jenis Kelamin
      const gender = row[genderIdx] ? row[genderIdx].toString().toUpperCase() : "LAINNYA";
      stats.byGender[gender] = (stats.byGender[gender] || 0) + 1;
      
      // Status Perkawinan dari mapping
      const marriage = marriageMapping[nik] || "TIDAK DIKETAHUI";
      stats.byMarriage[marriage] = (stats.byMarriage[marriage] || 0) + 1;
      
      // Agama
      const religion = row[religionIdx] ? row[religionIdx].toString().toUpperCase() : "TIDAK DIKETAHUI";
      stats.byReligion[religion] = (stats.byReligion[religion] || 0) + 1;
      
      // Pekerjaan
      const occupation = row[occupationIdx] ? row[occupationIdx].toString().toUpperCase() : "TIDAK DIKETAHUI";
      stats.byOccupation[occupation] = (stats.byOccupation[occupation] || 0) + 1;
      
      // Kecamatan dari mapping berdasarkan nomor KK
      if (kk && districtMapping[kk]) {
        const district = districtMapping[kk];
        stats.byDistrict[district] = (stats.byDistrict[district] || 0) + 1;
      }
    });
    
    // Jika tidak ada data gender, gunakan default
    if (Object.keys(stats.byGender).length === 0) {
      stats.byGender = defaultStats.byGender;
    }
    
    // Jika tidak ada data marriage, gunakan default
    if (Object.keys(stats.byMarriage).length === 0) {
      stats.byMarriage = defaultStats.byMarriage;
    }
    
    // Jika tidak ada data religion, gunakan default
    if (Object.keys(stats.byReligion).length === 0) {
      stats.byReligion = defaultStats.byReligion;
    }
    
    return stats;
  } catch (error) {
    Logger.log("Error mendapatkan statistik: " + error);
    logActivity("Statistik", "Error mendapatkan statistik: " + error.toString(), "ERROR");
    
    return {
      total: 0,
      byGender: { "LAKI-LAKI": 0, PEREMPUAN: 0 },
      byMarriage: { "BELUM KAWIN": 0, KAWIN: 0, "CERAI HIDUP": 0, "CERAI MATI": 0 },
      byReligion: { "ISLAM": 0, "KRISTEN": 0, "KATOLIK": 0, "HINDU": 0, "BUDDHA": 0, "KONGHUCU": 0 },
      byOccupation: {},
      byDistrict: {},
      error: error.toString()
    };
  }
}

// Fungsi untuk mencari data KK berdasarkan Nomor KK, NIK, atau Nama
function searchKK(query) {
  try {
    const ss = getActiveSpreadsheet();
    const results = [];
    
    // 1. Cari di sheet Master_KK
    let masterSheet = ss.getSheetByName(CONFIG.SHEETS.MASTER);
    if (masterSheet && masterSheet.getLastRow() > 1) {
      const masterData = masterSheet.getDataRange().getValues();
      const masterHeaders = masterData[0];
      
      // Indeks kolom untuk pencarian
      const nomorKKIdx = masterHeaders.indexOf("Nomor KK");
      const namaKepalaIdx = masterHeaders.indexOf("Nama Kepala Keluarga");
      const nikKepalaIdx = masterHeaders.indexOf("NIK Kepala Keluarga");
      
      // Verifikasi kolom kunci ditemukan
      if (nomorKKIdx !== -1 && namaKepalaIdx !== -1) {
        // Cari di data master
        for (let i = 1; i < masterData.length; i++) {
          const nomorKK = masterData[i][nomorKKIdx] ? masterData[i][nomorKKIdx].toString().toLowerCase() : "";
          const namaKepala = masterData[i][namaKepalaIdx] ? masterData[i][namaKepalaIdx].toString().toLowerCase() : "";
          const nikKepala = masterData[i][nikKepalaIdx] ? masterData[i][nikKepalaIdx].toString().toLowerCase() : "";
          
          const queryLower = query.toString().toLowerCase();
          
          if (nomorKK.includes(queryLower) || namaKepala.includes(queryLower) || nikKepala.includes(queryLower)) {
            // Konversi row menjadi objek dengan nama kolom
            const result = {};
            masterHeaders.forEach((header, index) => {
              if (masterData[i][index] instanceof Date) {
                result[header] = Utilities.formatDate(masterData[i][index], Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
              } else {
                result[header] = masterData[i][index];
              }
            });
            
            // Tambahkan source untuk membedakan dari pencarian di anggota
            result.source = "master";
            results.push(result);
          }
        }
      }
    }
    
    // 2. Cari di sheet Anggota_Keluarga
    let anggotaSheet = ss.getSheetByName(CONFIG.SHEETS.ANGGOTA);
    if (anggotaSheet && anggotaSheet.getLastRow() > 1) {
      const anggotaData = anggotaSheet.getDataRange().getValues();
      const anggotaHeaders = anggotaData[0];
      
      // Indeks kolom untuk pencarian
      const nomorKKIdx = anggotaHeaders.indexOf("Nomor KK");
      const nikIdx = anggotaHeaders.indexOf("NIK");
      const namaIdx = anggotaHeaders.indexOf("Nama");
      
      // Verifikasi kolom kunci ditemukan
      if (nomorKKIdx !== -1 && nikIdx !== -1 && namaIdx !== -1) {
        // Cari di data anggota
        for (let i = 1; i < anggotaData.length; i++) {
          const nomorKK = anggotaData[i][nomorKKIdx] ? anggotaData[i][nomorKKIdx].toString().toLowerCase() : "";
          const nik = anggotaData[i][nikIdx] ? anggotaData[i][nikIdx].toString().toLowerCase() : "";
          const nama = anggotaData[i][namaIdx] ? anggotaData[i][namaIdx].toString().toLowerCase() : "";
          
          const queryLower = query.toString().toLowerCase();
          
          if (nomorKK.includes(queryLower) || nik.includes(queryLower) || nama.includes(queryLower)) {
            // Konversi row menjadi objek dengan nama kolom
            const result = {};
            anggotaHeaders.forEach((header, index) => {
              if (anggotaData[i][index] instanceof Date) {
                result[header] = Utilities.formatDate(anggotaData[i][index], Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
              } else {
                result[header] = anggotaData[i][index];
              }
            });
            
            // Tambahkan source untuk membedakan dari pencarian di master
            result.source = "anggota";
            
            // Cari data tambahan dari Master KK untuk anggota ini
            if (masterSheet) {
              const masterData = masterSheet.getDataRange().getValues();
              const masterHeaders = masterData[0];
              const masterKKIdx = masterHeaders.indexOf("Nomor KK");
              
              // Cari baris yang sesuai dengan nomor KK anggota
              for (let j = 1; j < masterData.length; j++) {
                if (masterData[j][masterKKIdx] && masterData[j][masterKKIdx].toString() === nomorKK) {
                  // Tambahkan informasi alamat dari master
                  const alamatIdx = masterHeaders.indexOf("Alamat");
                  if (alamatIdx !== -1) {
                    result["Alamat"] = masterData[j][alamatIdx];
                  }
                  
                  // Tambahkan informasi lain yang diperlukan
                  const rtRwIdx = masterHeaders.indexOf("RT/RW");
                  if (rtRwIdx !== -1) {
                    result["RT/RW"] = masterData[j][rtRwIdx];
                  }
                  
                  const desaIdx = masterHeaders.indexOf("Desa/Kelurahan");
                  if (desaIdx !== -1) {
                    result["Desa/Kelurahan"] = masterData[j][desaIdx];
                  }
                  
                  const kecamatanIdx = masterHeaders.indexOf("Kecamatan");
                  if (kecamatanIdx !== -1) {
                    result["Kecamatan"] = masterData[j][kecamatanIdx];
                  }
                  
                  break; // Keluar dari loop setelah menemukan
                }
              }
            }
            
            results.push(result);
          }
        }
      }
    }
    
    // 3. Filter hasil duplikat (misalnya, jika kepala keluarga juga muncul sebagai anggota)
    const uniqueResults = [];
    const seen = new Set();
    
    results.forEach(result => {
      // Gunakan NIK sebagai kunci unik
      const nikKey = result.NIK || result["NIK Kepala Keluarga"] || "";
      
      if (!seen.has(nikKey) && nikKey) {
        seen.add(nikKey);
        uniqueResults.push(result);
      }
    });
    
    return uniqueResults;
  } catch (error) {
    Logger.log("Error mencari data KK: " + error);
    logActivity("Pencarian", "Error mencari data: " + error.toString(), "ERROR");
    return [];
  }
}

// =============================================
// FUNGSI PENGATURAN
// =============================================

// Tentukan spreadsheet ID untuk digunakan seluruh aplikasi
function setSpreadsheetId(id) {
  try {
    // Validasi ID dengan mencoba membuka spreadsheet
    const ss = SpreadsheetApp.openById(id);
    
    // Inisialisasi sheet dasar jika spreadsheet baru
    getOrCreateSheet(ss, CONFIG.SHEETS.MASTER, CONFIG.HEADERS.MASTER);
    getOrCreateSheet(ss, CONFIG.SHEETS.ANGGOTA, CONFIG.HEADERS.ANGGOTA);
    getOrCreateSheet(ss, CONFIG.SHEETS.HUBUNGAN, CONFIG.HEADERS.HUBUNGAN);
    getOrCreateSheet(ss, CONFIG.SHEETS.ORANG_TUA, CONFIG.HEADERS.ORANG_TUA);
    getOrCreateSheet(ss, CONFIG.SHEETS.LOG, CONFIG.HEADERS.LOG);
    getOrCreateSheet(ss, CONFIG.SHEETS.METADATA, CONFIG.HEADERS.METADATA);
    getOrCreateSheet(ss, CONFIG.SHEETS.DATA_SOSIAL, CONFIG.HEADERS.DATA_SOSIAL);
    
    // Jika berhasil, simpan ID
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id);
    
    // Log aktivitas pengaturan
    logActivity("Pengaturan", "Spreadsheet ID berhasil diatur: " + id, "INFO");
    
    return true;
  } catch (error) {
    Logger.log("Error menyimpan ID spreadsheet: " + error);
    
    // Log error
    logActivity("Pengaturan", "Error menyimpan ID spreadsheet: " + error.toString(), "ERROR");
    
    return false;
  }
}

// Dapatkan spreadsheet ID yang tersimpan
function getSpreadsheetId() {
  try {
    return PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || CONFIG.DEFAULT_SPREADSHEET_ID || "";
  } catch (error) {
    Logger.log("Error mendapatkan ID spreadsheet: " + error);
    return "";
  }
}

// Dapatkan konfigurasi API
function getApiConfig() {
  return {
    url: CONFIG.API_URL
  };
}

// Perbarui URL API
function updateApiUrl(url) {
  try {
    PropertiesService.getScriptProperties().setProperty('API_URL', url);
    
    // Log aktivitas
    logActivity("Pengaturan", "URL API berhasil diperbarui", "INFO");
    
    return true;
  } catch (error) {
    Logger.log("Error menyimpan URL API: " + error);
    
    // Log error
    logActivity("Pengaturan", "Error menyimpan URL API: " + error.toString(), "ERROR");
    
    return false;
  }
}
