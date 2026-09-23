# Laporan Audit & Perbaikan Bug — Aplikasi GAS (GajiKu Payroll & ESS)

**Tanggal audit:** 28 Agustus 2026
**Metode:** Pembacaan kode menyeluruh (±19.400 baris Kotlin/Jetpack Compose) secara manual,
mencakup lapisan data (Room DB, migrasi, DAO), repository, ViewModel, seluruh modul kalkulasi
regulasi Ketenagakerjaan/Pajak, dan seluruh layar UI. **Catatan penting:** audit ini dilakukan
tanpa Android SDK/emulator (lingkungan sandbox tidak memiliki akses ke Google Maven/Android
SDK), sehingga tidak dilakukan compile/build maupun uji jalan aplikasi secara langsung. Semua
temuan berbasis pembacaan & penelusuran kode statis. Disarankan menjalankan
`./gradlew assembleDebug` dan uji manual di emulator/perangkat sebelum rilis.

---

## Bug yang Ditemukan & Diperbaiki

### 1. Tanggal default di-hardcode ke "Agustus 2026" (Bug Sistemik — Prioritas Tinggi)

**Lokasi:**
- `app/src/main/java/com/example/ui/screens/DashboardScreen.kt`
- `app/src/main/java/com/example/ui/screens/TaxReportScreen.kt`
- `app/src/main/java/com/example/ui/screens/YearlyCalendarScreen.kt`
- `app/src/main/java/com/example/ui/PayrollViewModel.kt` (`CurrentCalculationInput`)

**Masalah:** Keempat file ini men-hardcode nilai bulan (`8`) dan/atau tahun (`2026`) — yaitu
tanggal saat kode ini dibuat — sebagai nilai default periode yang ditampilkan/dihitung.
Fungsi `Formatters.getCurrentMonth()` dan `Formatters.getCurrentYear()` sudah tersedia dan
benar (memakai `Calendar.getInstance()`), tetapi tidak dipakai di keempat tempat ini.

**Dampak:** Dashboard, Laporan Pajak Tahunan, Kalender Kerja Tahunan, dan Kalkulator Gaji akan
selalu default membuka **Agustus 2026** setiap kali dibuka — walau pengguna membuka aplikasi
di bulan atau tahun lain. Setelah tahun 2026 berakhir, ini akan menampilkan periode yang jelas
salah/using ke pengguna secara default setiap saat, kecuali diganti manual.

**Perbaikan:** Diganti dengan `Formatters.getCurrentMonth()` / `Formatters.getCurrentYear()` di
keempat lokasi, sehingga nilai default selalu mengikuti tanggal berjalan di perangkat.

### 2. Pengaturan Kuota Cuti Tahunan Tidak Pernah Dipakai (Bug — Prioritas Sedang)

**Lokasi:** `app/src/main/java/com/example/ui/screens/LeaveTrackerScreen.kt`

**Masalah:** `AppSettings.defaultAnnualLeaveQuota` tersimpan lengkap di database (termasuk
migrasi skema, dukungan ekspor/impor JSON), tetapi `LeaveTrackerScreen` tidak menerima
parameter `appSettings` sama sekali — kuota cuti tahunan di-hardcode `12` secara terpisah,
termasuk pada label teks ("Potong 12 hr", "NON-POTONG KUOTA 12 HARI", dst). Akibatnya
pengaturan tersebut sepenuhnya tidak berpengaruh terhadap aplikasi (dead code).

**Perbaikan:**
- `LeaveTrackerScreen` sekarang menerima parameter `appSettings: AppSettings` dan memakai
  `appSettings.defaultAnnualLeaveQuota` untuk perhitungan sisa cuti maupun label UI.
- `MainActivity.kt` diperbarui untuk meneruskan `appSettings` ke `LeaveTrackerScreen`.

---

## Area yang Diperiksa Teliti — Tidak Ditemukan Bug

- **`IndonesianPayrollCalculators.kt`** (2.194 baris): logika PPh 21 TER (kategori A/B/C sesuai
  PMK 168/2023) dan Pasal 17 tahunan, BPJS Kesehatan/JHT/JP/JKK/JKM, lembur (Kepmenaker
  102/2004), THR, kompensasi PKWT, pesangon PHK (PP 35/2021), shift & roster kerja — konsisten
  secara internal dan dengan dasar hukum yang dikutip di kode.
- **Lapisan data**: `AppDatabase.kt` (migrasi versi 6→10, termasuk pembersihan duplikat sebelum
  membuat unique index), `Daos.kt`, `PayrollRepository.kt` (termasuk fungsi ekspor/impor JSON).
- **`PayrollViewModel.kt`**: alur perhitungan & penyimpanan slip gaji, termasuk logika
  rekonsiliasi PPh 21 Desember (Pasal 17) yang menggabungkan riwayat gaji aktual dengan estimasi
  bulan yang belum tercatat.
- **`PdfExporter.kt`**: pembuatan PDF slip gaji & laporan pajak — posisi teks/tinggi halaman
  aman untuk jumlah baris maksimum yang mungkin muncul (tidak ada risiko konten terpotong pada
  kasus penggunaan normal).
- **Navigasi** (`MainActivity.kt`, `MoreFeaturesHubScreen.kt`): seluruh 12 tab & target navigasi
  konsisten, tidak ada tab yatim/rusak.
- Penanganan input numerik (`toDoubleOrNull`/`toIntOrNull`) di seluruh layar sudah aman terhadap
  input tidak valid; dua penggunaan `.toInt()` non-null yang ditemukan (di `OvertimeTrackerScreen.kt`)
  sudah dibungkus `try/catch`.
- Dua penggunaan force-unwrap (`!!`) yang ditemukan (`YearlyCalendarScreen.kt`,
  `MainActivity.kt`) sudah dijaga oleh pengecekan `!= null` tepat sebelumnya — aman.

## Temuan Non-Bug — Rekomendasi Perbaikan Lanjutan (Opsional)

Dua kolom berikut ada di model data & skema database, tetapi **tidak punya UI sama sekali**
untuk diisi pengguna. Ini bukan bug yang membuat hasil salah (nilai default aman/masuk akal),
tapi kapasitas yang sudah dibangun di lapisan data belum termanfaatkan:

- **`UserProfile.terCategoryOverride`** — dipakai di 2 tempat kalkulasi PPh 21
  (`PayrollViewModel.kt`, `PayrollCalculatorScreen.kt`) untuk override kategori TER manual,
  tapi tidak ada field input di `ProfileSettingsScreen`. Saat ini kategori TER selalu
  ditentukan otomatis dari status PTKP (`determineTerCategory`), yang sudah benar untuk semua
  kombinasi TK/K standar — override hanya relevan untuk kasus khusus.
- **`UserProfile.contractEndDate`** — tersimpan di skema tapi tidak dipakai di kalkulasi/UI
  manapun. Bisa dimanfaatkan untuk pengingat otomatis masa berakhir kontrak PKWT.
- **`AppSettings.bpjsKesSalaryCap`, `bpjsJpSalaryCap`, `jkkRate`, `jkmRate`** — dipakai secara
  benar di kalkulasi BPJS, tapi juga tidak ada UI untuk mengubahnya (hanya bisa diubah lewat
  impor JSON manual). Nilai default sudah sesuai regulasi terbaru, jadi ini bukan bug, hanya
  keterbatasan fitur.

Rekomendasi: jika ingin, saya bisa tambahkan field pengaturan lanjutan di
`ProfileSettingsScreen` untuk keempat-lima item di atas pada sesi berikutnya.

## Keterbatasan Audit

- Tidak ada compile/build check (tidak ada Android SDK di lingkungan ini) — mohon jalankan
  `./gradlew assembleDebug` / buka di Android Studio untuk memverifikasi tidak ada error
  kompilasi dari perubahan ini sebelum rilis.
- Tidak ada uji instrumentasi/emulator — perilaku runtime (animasi, navigasi back-stack,
  Room threading) belum diverifikasi langsung.
- File `app/src/test/*` (unit test & screenshot test) tidak diaudit/dijalankan.
