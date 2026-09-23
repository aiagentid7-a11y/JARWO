# Panduan Isi "Data Safety" di Google Play Console — GajiKu

Form ini wajib diisi di Play Console (Menu **App content → Data safety**)
sebelum bisa publish. Berdasarkan kode aplikasi saat ini (offline-only,
tanpa SDK iklan/analitik/Firebase aktif), berikut panduan pengisiannya.
**Selalu cek ulang isi form ini setiap kali Anda menambah fitur baru**
(mis. login, cloud sync, iklan sungguhan) — form yang tidak sesuai
perilaku aplikasi sebenarnya bisa membuat aplikasi ditolak/ditangguhkan.

## 1. Apakah aplikasi mengumpulkan atau membagikan data pengguna?

Karena aplikasi ini murni offline dan tidak mengirim data ke server
manapun, jawabannya:

- **Does your app collect or share any of the required user data types?**
  → Tergantung interpretasi Anda: data seperti NIK/NPWP/gaji memang
    **disimpan** (stored) di perangkat, tapi tidak **dikumpulkan**
    (collected, dalam definisi Google = dikirim keluar perangkat) oleh
    developer. Google mendefinisikan "collection" sebagai data yang
    ditransmisikan keluar dari perangkat. Karena aplikasi ini tidak
    melakukan itu, jawaban yang paling akurat adalah:
    **"No, my app doesn't collect or share any of the required user data types."**

  Jika Anda ingin lebih aman/transparan, Anda tetap boleh mendeklarasikan
  data di bawah sebagai "Collected" dengan "Data is not shared with third
  parties" dan "Data is processed ephemerally" = **No** (karena disimpan
  persisten secara lokal, bukan diproses lalu dibuang) — pilih opsi yang
  paling sesuai dengan pemahaman Anda tentang alur data di atas.

## 2. Jika memilih mendeklarasikan kategori data (opsional, lebih transparan)

| Data type | Dikumpulkan? | Dibagikan ke pihak ke-3? | Wajib/opsional | Tujuan |
|---|---|---|---|---|
| Name (Nama) | Ya (disimpan lokal) | Tidak | Opsional | App functionality |
| National ID (NIK) | Ya (disimpan lokal) | Tidak | Opsional | App functionality |
| Tax ID (NPWP) | Ya (disimpan lokal) | Tidak | Opsional | App functionality |
| Financial info (gaji, tunjangan, hasil hitung pajak/BPJS) | Ya (disimpan lokal) | Tidak | Opsional | App functionality |
| App activity (catatan lembur/cuti) | Ya (disimpan lokal) | Tidak | Opsional | App functionality |

Untuk setiap baris data yang Anda declare:
- **Is this data collected, shared, or both?** → *Collected* saja (bukan Shared).
- **Is this data processed ephemerally?** → *No* (disimpan permanen di Room DB).
- **Is data collection optional?** → *Yes* (user boleh tidak isi NIK/NPWP dsb; kolom kosong tetap bisa dipakai app, kecuali Anda validasi wajib di UI — sesuaikan dengan implementasi aktual).
- **Why is this data collected?** → *App functionality* (dasar perhitungan gaji/pajak/BPJS).

## 3. Praktik Keamanan Data (Security practices)

- **Is data encrypted in transit?** → Tidak relevan/N/A, karena tidak ada
  data yang dikirim lewat jaringan.
- **Can users request data deletion?** → *Yes* — jelaskan bahwa user bisa
  hapus semua data lewat menu "Hapus Semua Data" di Profil, atau dengan
  uninstall aplikasi (karena `android:allowBackup` & data tersimpan lokal
  per-app, uninstall akan membersihkan seluruh data terkait).

## 4. Privacy Policy URL

Isi dengan URL tempat Anda meng-host `PRIVACY_POLICY.md` (harus diakses
publik, misalnya lewat GitHub Pages, Notion public page, atau halaman
web sederhana) — bukan file lokal.

## 5. Kalau Nanti Menambah Fitur Baru

Update form Data Safety SEBELUM merilis update yang menambahkan:
- Iklan sungguhan (AdMob dsb.) → declare *Advertising or marketing ID*,
  device/app identifiers sesuai SDK yang dipasang.
- Login/akun cloud (Firebase Auth, dsb.) → declare *Email*, *User IDs*,
  dan ubah status "shared with third parties" sesuai penyedia layanan.
- Sinkronisasi data ke server (Firestore dsb.) → data yang sebelumnya
  "processed ephemerally: No, stored locally only" perlu diubah karena
  data mulai benar-benar transit & tersimpan di server pihak ketiga.
