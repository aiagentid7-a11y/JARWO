# Kebijakan Privasi — GajiKu (Payroll & ESS Standalone)

_Terakhir diperbarui: [ISI TANGGAL SEBELUM PUBLISH]_

> **Catatan untuk developer:** Dokumen ini draf awal, bukan nasihat hukum.
> Sesuaikan nama aplikasi, nama pengembang, dan email kontak di bawah,
> lalu publish di URL publik (misal GitHub Pages atau halaman web sederhana)
> sebelum ditempel di kolom "Privacy Policy" pada Play Console. Kalau Anda
> berencana menambah fitur baru yang mengirim data ke server (misal AI,
> cloud sync, iklan sungguhan), dokumen ini WAJIB direvisi lagi sebelum
> update tersebut dirilis, karena Data Safety form harus selalu sesuai
> perilaku aplikasi yang sebenarnya.

## 1. Ringkasan

GajiKu ("Aplikasi") adalah kalkulator gaji & Employee Self-Service (ESS)
pribadi untuk karyawan di Indonesia. Aplikasi ini dirancang untuk berjalan
**sepenuhnya offline**: seluruh data yang Anda masukkan disimpan hanya di
penyimpanan lokal perangkat Anda (database SQLite/Room), dan **tidak
dikirim ke server milik pengembang atau pihak ketiga mana pun**.

## 2. Data yang Dikumpulkan & Disimpan

Aplikasi menyimpan data berikut, seluruhnya **secara lokal di perangkat Anda**:

| Kategori | Contoh Data |
|---|---|
| Data profil karyawan | Nama, NIK, NPWP, status PTKP, jabatan, nama perusahaan, tanggal bergabung |
| Data penggajian | Gaji pokok, tunjangan, insentif, ritase, HM, hasil perhitungan BPJS & PPh 21 |
| Catatan lembur/operasional | Tanggal, jam kerja, jenis shift, jumlah ritase, jam HM alat berat |
| Catatan cuti | Jenis, tanggal, dan status cuti |
| Riwayat slip gaji | Rincian perhitungan gaji bulanan yang pernah disimpan |
| Pengaturan aplikasi | Status langganan Pro, preferensi tema, dll |

Aplikasi **tidak meminta** akses kamera, lokasi, kontak, mikrofon, atau
izin sensitif lain yang tidak relevan dengan fungsinya sebagai kalkulator
gaji pribadi.

## 3. Bagaimana Data Digunakan

Semua data di atas digunakan **hanya di dalam Aplikasi**, untuk:
- Menghitung estimasi gaji, lembur, BPJS, dan PPh 21 Anda.
- Menyimpan riwayat slip gaji agar bisa dilihat/dibandingkan kembali.
- Menghasilkan dokumen (mis. PDF slip gaji) yang Anda simpan/bagikan sendiri.

## 4. Berbagi Data ke Pihak Ketiga

Aplikasi **tidak mengirim, menjual, atau membagikan** data pribadi Anda ke
pihak ketiga mana pun, karena tidak ada komponen aplikasi yang melakukan
panggilan jaringan untuk mengirim data pengguna keluar dari perangkat.

Satu-satunya cara data keluar dari perangkat Anda adalah **atas tindakan
Anda sendiri**, misalnya:
- Menggunakan fitur "Cadangkan JSON" untuk menyalin data ke clipboard, lalu
  Anda memilih sendiri mau menyimpannya di mana (catatan pribadi, email ke
  diri sendiri, cloud storage pribadi, dll).
- Mengekspor/membagikan slip gaji dalam bentuk PDF melalui aplikasi lain
  (mis. WhatsApp, email) yang Anda pilih sendiri lewat menu share bawaan Android.

## 5. Penyimpanan & Keamanan

Data disimpan di penyimpanan internal aplikasi pada perangkat Anda.
Menghapus aplikasi akan menghapus seluruh data tersebut secara permanen
kecuali Anda sudah membuat cadangan (backup) JSON sendiri sebelumnya.

## 6. Hak Anda atas Data

Karena seluruh data tersimpan lokal di perangkat Anda, Anda memiliki kendali
penuh:
- **Lihat/edit**: langsung melalui menu Profil, Lembur, Cuti, dan Slip Gaji.
- **Ekspor**: melalui menu Profil → Cadangkan JSON.
- **Hapus**: melalui menu "Hapus Semua Data" di Profil, atau dengan
  meng-uninstall aplikasi.

## 7. Anak-Anak

Aplikasi ini ditujukan untuk pekerja/karyawan dewasa dan tidak ditujukan
untuk anak-anak di bawah usia yang ditetapkan hukum yang berlaku.

## 8. Perubahan Kebijakan

Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu, terutama
jika ada fitur baru yang mengubah cara data ditangani. Tanggal pembaruan
terakhir akan selalu tercantum di bagian atas dokumen ini.

## 9. Kontak

Jika ada pertanyaan mengenai kebijakan privasi ini, hubungi:
**[ISI EMAIL/KONTAK PENGEMBANG DI SINI]**
