package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.GajikuTheme

private data class MoreFeatureItem(
    val label: String,
    val description: String,
    val icon: ImageVector,
    val badgeColor: (com.example.ui.theme.GajikuColors) -> Color,
    val iconColor: (com.example.ui.theme.GajikuColors) -> Color,
    val targetTab: Int
)

private data class GuideCategory(
    val id: String,
    val name: String,
    val icon: ImageVector
)

private data class GuideStep(
    val title: String,
    val body: String,
    val tip: String? = null
)

private data class GuideSection(
    val id: String,
    val categoryId: String,
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val iconColor: (com.example.ui.theme.GajikuColors) -> Color,
    val steps: List<GuideStep>,
    val regulationNote: String? = null
)

@Composable
fun MoreFeaturesHubScreen(
    onNavigateToTab: (Int) -> Unit
) {
    val colors = GajikuTheme.colors
    var showGuide by remember { mutableStateOf(false) }

    if (showGuide) {
        AppUsageGuideContent(
            onBack = { showGuide = false },
            onNavigateToFeature = { targetTab ->
                showGuide = false
                onNavigateToTab(targetTab)
            }
        )
        return
    }

    val items = listOf(
        MoreFeatureItem(
            label = "Audit K3 (Kepatuhan Jam Kerja)",
            description = "Audit kepatuhan jam kerja & batas lembur 4 jam/hari serta 18 jam/minggu sesuai PP 35/2021 & Permenaker 27/2021.",
            icon = Icons.Default.HealthAndSafety,
            badgeColor = { it.lilacBg }, iconColor = { it.primary },
            targetTab = 12
        ),
        MoreFeatureItem(
            label = "Presensi & Absensi Harian",
            description = "Catat status hadir harian, jam masuk/pulang, foto bukti ber-watermark, dan integrasi uang makan/transport.",
            icon = Icons.Default.FactCheck,
            badgeColor = { it.emeraldBg }, iconColor = { it.emerald },
            targetTab = 11
        ),
        MoreFeatureItem(
            label = "THR & Pesangon",
            description = "Hitung estimasi Tunjangan Hari Raya dan kompensasi pesangon PHK sesuai PP 35/2021.",
            icon = Icons.Default.Calculate,
            badgeColor = { it.amberBg }, iconColor = { it.amber },
            targetTab = 5
        ),
        MoreFeatureItem(
            label = "Kalender Kerja",
            description = "Lihat kalender kerja 1 tahun penuh, termasuk hari libur nasional & catatan lembur/cuti.",
            icon = Icons.Default.CalendarMonth,
            badgeColor = { it.cyanBg }, iconColor = { it.cyan },
            targetTab = 6
        ),
        MoreFeatureItem(
            label = "Laporan Pajak",
            description = "Rekap PPh 21 tahunan dan bukti potong 1721-A1 dari riwayat slip gaji Anda.",
            icon = Icons.Default.Assessment,
            badgeColor = { it.roseBg }, iconColor = { it.rose },
            targetTab = 7
        ),
        MoreFeatureItem(
            label = "Jam Kerja & Shift",
            description = "Atur & edit jam kerja, skema 5HK/6HK, durasi istirahat, serta pola shift karyawan.",
            icon = Icons.Default.Schedule,
            badgeColor = { it.tealBg }, iconColor = { it.teal },
            targetTab = 8
        ),
        MoreFeatureItem(
            label = "Panduan Klaim BPJS",
            description = "Langkah-langkah klaim JHT, JKM, JKK, dan JKP — dokumen dan prosedur lengkap.",
            icon = Icons.Default.Shield,
            badgeColor = { it.indigoBg }, iconColor = { it.indigo },
            targetTab = 9
        )
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 32.dp)
    ) {
        item {
            Text(
                text = "Fitur Lainnya",
                fontSize = 20.sp,
                fontWeight = FontWeight.ExtraBold,
                color = colors.textPrimary
            )
            Text(
                text = "Fitur tambahan yang menggunakan data dari Profil & Kalkulator Gaji Anda.",
                fontSize = 12.sp,
                color = colors.textMuted,
                modifier = Modifier.padding(top = 2.dp, bottom = 4.dp)
            )
        }

        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showGuide = true },
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = colors.primaryContainer.copy(alpha = 0.35f)),
                border = BorderStroke(1.dp, colors.primary.copy(alpha = 0.4f)),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Surface(
                        color = colors.primary.copy(alpha = 0.18f),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.size(46.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.MenuBook, contentDescription = null, tint = colors.primary, modifier = Modifier.size(22.dp))
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                "Panduan Penggunaan Lengkap", 
                                fontSize = 13.5.sp, 
                                fontWeight = FontWeight.Bold, 
                                color = colors.textPrimary,
                                modifier = Modifier.weight(1f)
                            )
                            Surface(
                                color = colors.emerald.copy(alpha = 0.2f),
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier.padding(top = 1.dp)
                            ) {
                                Text(
                                    text = "Update",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.emerald,
                                    maxLines = 1,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            "Petunjuk komprehensif mulai dari isi profil, absensi foto watermark, lembur, audit K3, slip gaji hingga backup JSON.",
                            fontSize = 11.sp,
                            color = colors.textMuted,
                            lineHeight = 15.sp
                        )
                    }
                    Icon(
                        Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = colors.textMuted,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }

        items(items) { feature ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onNavigateToTab(feature.targetTab) },
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Surface(
                        color = feature.badgeColor(colors),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.size(46.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(feature.icon, contentDescription = null, tint = feature.iconColor(colors), modifier = Modifier.size(22.dp))
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(feature.label, fontSize = 13.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(feature.description, fontSize = 11.sp, color = colors.textMuted, lineHeight = 15.sp)
                    }
                    Icon(
                        Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = colors.textMuted,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun AppUsageGuideContent(
    onBack: () -> Unit,
    onNavigateToFeature: ((Int) -> Unit)? = null
) {
    val colors = GajikuTheme.colors
    var selectedCategoryId by remember { mutableStateOf("ALL") }
    var searchQuery by remember { mutableStateOf("") }

    val categories = listOf(
        GuideCategory("ALL", "Semua Topik", Icons.Default.AllInclusive),
        GuideCategory("START", "Setup & Profil", Icons.Default.Person),
        GuideCategory("ATTENDANCE", "Presensi & Watermark", Icons.Default.FactCheck),
        GuideCategory("OVERTIME_K3", "Lembur & Audit K3", Icons.Default.HealthAndSafety),
        GuideCategory("PAYROLL", "Gaji & Pajak PPh21", Icons.Default.ReceiptLong),
        GuideCategory("LEAVE_SHIFT", "Cuti & Shift Kerja", Icons.Default.EventNote),
        GuideCategory("COMPENSATION", "THR, PHK & BPJS", Icons.Default.Shield),
        GuideCategory("SECURITY", "Backup Data JSON", Icons.Default.Backup)
    )

    val allSections = listOf(
        // 1. Profil & Setup
        GuideSection(
            id = "profile_setup",
            categoryId = "START",
            title = "1. Setup Profil & Komponen Upah",
            subtitle = "Langkah awal wajib untuk memastikan semua hitungan otomatis berjalan presisi.",
            icon = Icons.Default.Badge,
            iconColor = { it.lilac },
            steps = listOf(
                GuideStep(
                    title = "Isi Identitas & Data Karyawan",
                    body = "Buka menu Profil. Masukkan Nama Lengkap, NIK/ID Karyawan, Departemen, dan Jabatan. Data ini otomatis dicantumkan pada Kop Slip Gaji PDF, Laporan Lembur, dan Watermark Foto Presensi.",
                    tip = "NIK dan Nama akan menjadi identitas legal pada dokumen ekspor."
                ),
                GuideStep(
                    title = "Atur Gaji Pokok & Tunjangan Tetap",
                    body = "Masukkan nominal Gaji Pokok dan Tunjangan Tetap (misal Tunjangan Jabatan). Sesuai regulasi Depnaker, total (Gaji Pokok + Tunjangan Tetap) menjadi dasar rumus upah per jam lembur (1/173 x Upah Sebulan).",
                    tip = "Tunjangan Tidak Tetap (seperti kehadiran fleksibel) tidak dimasukkan dalam pembagi 1/173 lembur."
                ),
                GuideStep(
                    title = "Tentukan Status Pajak PTKP & Opsi BPJS",
                    body = "Pilih status Penghasilan Tidak Kena Pajak (TK/0 s.d K/3). Aktifkan toggle kepesertaan BPJS Ketenagakerjaan (JKK, JKM, JHT, JP) dan BPJS Kesehatan (1% pekerja) agar potongan otomatis akurat sesuai regulasi.",
                    tip = "Aplikasi menerapkan Tarif Efektif Rata-Rata (TER) PPh 21 terbaru sesuai PMK 168/2023."
                ),
                GuideStep(
                    title = "Tarif Khusus Sektor Tambang & Logistik (Opsional)",
                    body = "Jika Anda bekerja di sektor operasional/tambang/alat berat, isi Tarif Premi Ritase (Rp/rit) dan Tarif Premi HM (Rp/jam operasional). Nilai ini akan menghitung insentif ritase & jam mesin secara otomatis.",
                    tip = "Jika tidak menggunakan skema ritase/HM, biarkan nilai default 0."
                )
            ),
            regulationNote = "Dasar Hukum: PP No. 36 Tahun 2021 (Pengupahan) & PMK No. 168 Tahun 2023 (PPh Pasal 21 TER)"
        ),

        // 2. Presensi Harian & Foto Bukti Watermark
        GuideSection(
            id = "attendance_watermark",
            categoryId = "ATTENDANCE",
            title = "2. Presensi & Foto Bukti Ber-Watermark",
            subtitle = "Catat absensi masuk/pulang dengan bukti selfie ber-watermark otomatis dan anti-manipulasi.",
            icon = Icons.Default.CameraAlt,
            iconColor = { it.emerald },
            steps = listOf(
                GuideStep(
                    title = "Catat Kehadiran Harian",
                    body = "Buka menu Presensi di Beranda. Pilih status (Hadir, WFH/Dinas, Sakit, Izin, Cuti, Alpa) dan tentukan Jam Masuk serta Jam Pulang Anda.",
                    tip = "Kehadiran 'Hadir' & 'WFH' otomatis menambah kalkulasi Uang Makan & Transportasi harian di Slip Gaji."
                ),
                GuideStep(
                    title = "Ambil Foto Bukti Presensi (Selfie/Lokasi)",
                    body = "Ketuk tombol 'Ambil Foto Presensi'. Kamera perangkat akan terbuka untuk mengambil foto bukti di lokasi kerja.",
                    tip = "Foto diproses 100% lokal on-device tanpa menguras kuota internet."
                ),
                GuideStep(
                    title = "Watermark Resmi Otomatis & Presisi",
                    body = "Aplikasi otomatis menyematkan Floating Badge Watermark di bagian bawah foto berisi: Badge 'TERVERIFIKASI ASLI • GAS PRESENSI DIGITAL', Hari, Tanggal, Jam:Menit:Detik, Zona Waktu (WIB/WITA/WIT), Nama & NIK Karyawan, serta Status Presensi.",
                    tip = "Watermark dibuat permanen pada gambar sehingga valid sebagai bukti absensi ke HRD/Atasan."
                ),
                GuideStep(
                    title = "Optimasi Penyimpanan Foto (Ringan & Cepat)",
                    body = "Foto otomatis di-resize (max 960px) dan dikompresi (90% JPEG quality) sehingga teks watermark tetap tajam dan ukuran file tetap hemat. Tersedia tombol 'Bersihkan Foto Lama (>90 hari)' untuk melegakan memori HP Anda.",
                    tip = "Foto tersimpan di folder privat aplikasi yang aman."
                )
            ),
            regulationNote = "Fitur Presensi mendukung audit internal dan validasi kepatuhan kehadiran perusahaan."
        ),

        // 3. Pencatatan Lembur & Konversi Kemnaker
        GuideSection(
            id = "overtime_tracking",
            categoryId = "OVERTIME_K3",
            title = "3. Catat Lembur, Ritase & HM Mesin",
            subtitle = "Pencatatan jam kerja lembur harian dengan pengali upah otomatis sesuai standar Kemnaker.",
            icon = Icons.Default.AccessTime,
            iconColor = { it.teal },
            steps = listOf(
                GuideStep(
                    title = "Tambah Catatan Lembur Harian",
                    body = "Buka menu Lembur. Masukkan Tanggal, Jam Mulai, Jam Selesai, serta Durasi Istirahat. Pilih Jenis Hari: 'Hari Kerja Biasa' atau 'Hari Libur / Istirahat Mingguan'.",
                    tip = "Durasi istirahat di luar jam kerja lembur tidak dihitung sebagai jam lembur berbayar."
                ),
                GuideStep(
                    title = "Rumus Pengali Jam Lembur (Depnaker)",
                    body = "Hari Kerja Biasa: Jam ke-1 dikalikan 1.5x upah sejam, jam ke-2 dan seterusnya dikalikan 2.0x upah sejam.\nHari Libur Resmi (5HK): Jam 1-8 dikalikan 2.0x, jam ke-9 dikalikan 3.0x, jam ke-10-12 dikalikan 4.0x upah sejam.",
                    tip = "Nilai upah sejam dihitung dari (Gaji Pokok + Tunjangan Tetap) / 173."
                ),
                GuideStep(
                    title = "Input Ritase & Jam Mesin HM (Sektor Tambang)",
                    body = "Jika berlaku di pekerjaan Anda, masukkan jumlah trip Ritase dan angka HM Awal serta HM Akhir alat. Sistem akan menghitung akumulasi total premi operasional secara otomatis.",
                    tip = "Catatan lembur, ritase, dan HM bisa ditarik langsung ke form Slip Gaji dengan tombol 'Ambil dari Log'."
                ),
                GuideStep(
                    title = "Ekspor Rekap Lembur ke PDF",
                    body = "Gunakan tombol 'Ekspor PDF' di menu Lembur untuk mencetak rekap rincian lembur bulanan lengkap dengan tanda tangan untuk diajukan ke bagian Payroll / HRD.",
                    tip = "File PDF tersimpan di folder Download perangkat dan bisa langsung dibagikan via WhatsApp/Email."
                )
            ),
            regulationNote = "Dasar Hukum: PP No. 35 Tahun 2021 Pasal 31 tentang Perhitungan Upah Kerja Lembur"
        ),

        // 4. Audit K3 Kepatuhan Jam Kerja
        GuideSection(
            id = "k3_compliance",
            categoryId = "OVERTIME_K3",
            title = "4. Audit K3 (Kepatuhan Jam Kerja & Lembur)",
            subtitle = "Pantau batas maksimal jam kerja dan lembur untuk mencegah kelelahan kerja (Fatigue Risk).",
            icon = Icons.Default.HealthAndSafety,
            iconColor = { it.primary },
            steps = listOf(
                GuideStep(
                    title = "Batas Normatif Regulasi PP 35/2021",
                    body = "Regulasi ketenagakerjaan menetapkan batas waktu kerja lembur maksimal 4 (empat) jam dalam 1 hari dan maksimal 18 (delapan belas) jam dalam 1 minggu.",
                    tip = "Batas 18 jam/minggu tidak termasuk lembur yang dilakukan pada hari libur resmi/istirahat mingguan."
                ),
                GuideStep(
                    title = "Status Indikator K3",
                    body = "• AMAN (Hijau): Lembur mingguan <= 12 jam & harian <= 4 jam.\n• WASPADA (Kuning): Lembur mingguan 13 - 18 jam (mendekati kuota maksimal).\n• PELANGGARAN (Merah): Lembur mingguan > 18 jam atau lembur harian > 4 jam.",
                    tip = "Periksa kartu ringkasan K3 di Beranda untuk memantau status secara real-time."
                ),
                GuideStep(
                    title = "Deteksi Risiko Kelelahan (Fatigue Alert)",
                    body = "Jika total jam kerja Anda (Jam Normal + Jam Lembur) dalam 1 hari mencapai > 12 jam, sistem akan memberikan tanda peringatan Kelelahan Tinggi (High Fatigue Risk) guna mencegah kecelakaan kerja.",
                    tip = "Pekerja berhak mendapatkan waktu istirahat yang cukup dan makanan/minuman bergizi untuk lembur >= 4 jam."
                ),
                GuideStep(
                    title = "Ekspor Laporan Audit K3 PDF",
                    body = "Tekan tombol 'Export K3' di layar Audit K3 untuk membuat dokumen audit resmi yang memuat tabel audit pekanan, catatan pelanggaran, dan rekomendasi preventif K3.",
                    tip = "Dokumen ini dapat digunakan sebagai bahan evaluasi K3 perusahaan dan laporan pengawasan ketenagakerjaan."
                )
            ),
            regulationNote = "Dasar Hukum: PP No. 35 Tahun 2021 Pasal 26 & Permenaker No. 27 Tahun 2021 tentang Keselamatan & Kesehatan Kerja"
        ),

        // 5. Slip Gaji & Pajak PPh 21
        GuideSection(
            id = "payslip_tax",
            categoryId = "PAYROLL",
            title = "5. Hitung Slip Gaji & Pajak PPh 21",
            subtitle = "Hitung take home pay bersih, potongan BPJS, PPh 21 TER bulanan, dan cetak slip gaji resmi.",
            icon = Icons.Default.ReceiptLong,
            iconColor = { it.indigo },
            steps = listOf(
                GuideStep(
                    title = "Pilih Periode & Sinkronisasi Otomatis",
                    body = "Buka menu Slip Gaji. Pilih Bulan dan Tahun penggajian. Ketuk tombol 'Ambil dari Log' pada kolom lembur, ritase, HM, atau absensi agar data terisi otomatis tanpa perlu mengetik ulang.",
                    tip = "Nilai komponen gaji dasar otomatis diambil dari data Profil Anda."
                ),
                GuideStep(
                    title = "Rincian Pendapatan & Potongan",
                    body = "Sistem menjumlahkan seluruh pendapatan bruto (Gaji Pokok, Tunjangan, Lembur, Insentif, Bonus) dan menghitung potongan wajib (BPJS Ketenagakerjaan 3%, BPJS Kesehatan 1%, PPh 21, Pinjaman/Kasbon).",
                    tip = "Anda dapat menambahkan komponen bonus/potongan kustom sesuai slip dari kantor."
                ),
                GuideStep(
                    title = "Mode Khusus Pajak Desember (Pasal 17)",
                    body = "Untuk periode gaji Desember, aktifkan toggle 'Perhitungan Ulang Masa Desember (Pasal 17)'. Sistem akan menghitung total bruto setahun dikurangi biaya jabatan & PTKP, lalu menghitung selisih lebih/kurang bayar PPh 21.",
                    tip = "Masa Januari - November menggunakan tarif efektif bulanan (TER Kategori A/B/C)."
                ),
                GuideStep(
                    title = "Simpan & Cetak Slip Gaji PDF",
                    body = "Tekan 'Simpan & Lihat Slip Gaji'. Anda dapat mencetak Slip Gaji standar A4 lengkap dengan rincian pendapatan, potongan, take home pay terbilang, dan tanda tangan digital.",
                    tip = "Menyimpan ulang slip untuk bulan yang sama akan memperbarui data lama secara otomatis."
                )
            ),
            regulationNote = "Dasar Hukum: PMK No. 168/2023 & UU No. 7/2021 tentang Harmonisasi Peraturan Perpajakan (UU HPP)"
        ),

        // 6. Cuti & Pengaturan Shift
        GuideSection(
            id = "leave_shift",
            categoryId = "LEAVE_SHIFT",
            title = "6. Manajemen Cuti & Jadwal Shift",
            subtitle = "Kelola kuota hak cuti tahunan dan atur jadwal rotasi shift kerja.",
            icon = Icons.Default.CalendarMonth,
            iconColor = { it.cyan },
            steps = listOf(
                GuideStep(
                    title = "Catat Cuti & Pantau Sisa Kuota",
                    body = "Buka menu Cuti di Beranda. Catat pengajuan cuti beserta jenisnya (Cuti Tahunan, Sakit dengan Surat Dokter, Izin Khusus Menikah/Keluarga Meninggal, Cuti Melahirkan). Sistem otomatis memotong saldo cuti tahunan (default 12 hari).",
                    tip = "Cuti bersama yang memotong cuti tahunan dapat dicatat terpisah."
                ),
                GuideStep(
                    title = "Atur Jadwal Shift Kerja",
                    body = "Buka menu 'Jam Kerja & Shift' dari tab Lainnya. Anda dapat mengonfigurasi jam kerja 5 Hari Kerja (8 jam/hari) atau 6 Hari Kerja (7 jam/hari), serta menentukan jam mulai dan selesai untuk Shift 1 (Pagi), Shift 2 (Sore), Shift 3 (Malam), atau Shift Normal.",
                    tip = "Pengaturan shift membantu menghitung keterlambatan dan jam kerja lembur lintas hari."
                ),
                GuideStep(
                    title = "Ekspor Jadwal & Roster Shift ke PDF",
                    body = "Cetak jadwal shift kerja bulanan dalam bentuk tabel roster PDF rapi untuk dibagikan ke tim kerja atau ditempel di papan pengumuman.",
                    tip = "Jadwal shift juga tersinkronisasi dengan Kalender Kerja Tahunan."
                )
            ),
            regulationNote = "Dasar Hukum: UU Ketenagakerjaan No. 13/2003 Pasal 79 tentang Hak Istirahat & Cuti"
        ),

        // 7. THR, PHK & Panduan BPJS
        GuideSection(
            id = "compensation_bpjs",
            categoryId = "COMPENSATION",
            title = "7. Simulasi THR, Pesangon PHK & BPJS",
            subtitle = "Hitung hak finansial saat hari raya, masa akhir kerja, dan panduan klaim jaminan sosial.",
            icon = Icons.Default.Calculate,
            iconColor = { it.amber },
            steps = listOf(
                GuideStep(
                    title = "Kalkulator THR Keagamaan",
                    body = "Buka menu 'THR & Pesangon'. Masukkan masa kerja. Pekerja dengan masa kerja >= 12 bulan berhak mendapat 1 bulan upah (Gaji Pokok + Tunjangan Tetap). Masa kerja 1 - 11 bulan dihitung proporsional: (Masa Kerja / 12) x 1 Bulan Upah.",
                    tip = "THR wajib dibayarkan paling lambat H-7 sebelum Hari Raya Keagamaan."
                ),
                GuideStep(
                    title = "Simulasi Pesangon & Kompensasi PHK",
                    body = "Pilih alasan PHK (Efisiensi, Perusahaan Tutup, Pensiun, Meninggal, Pelanggaran, dll) dan masukkan masa kerja. Sistem menghitung Uang Pesangon (UP), Uang Penghargaan Masa Kerja (UPMK), dan Uang Penggantian Hak (UPH) 15% sesuai formula resmi PP 35/2021.",
                    tip = "Rincian kompensasi PHK dapat diekspor langsung ke file PDF resmi."
                ),
                GuideStep(
                    title = "Panduan Klaim BPJS Ketenagakerjaan",
                    body = "Buka 'Panduan Klaim BPJS' di tab Lainnya. Pelajari syarat dokumen dan alur pengajuan klaim JHT (via aplikasi JMO untuk saldo < Rp10 jt atau portal Lapak Asik untuk saldo > Rp10 jt), klaim JKK saat kecelakaan, santunan JKM, dan bantuan tunai JKP bagi korban PHK.",
                    tip = "Simak dokumen wajib seperti Paklaring (Surat Pengalaman Kerja), KTP, KK, dan Buku Tabungan."
                )
            ),
            regulationNote = "Dasar Hukum: PP No. 35 Tahun 2021 Pasal 40-59 & Permenaker No. 6 Tahun 2016 (THR)"
        ),

        // 8. Keamanan Data & Backup JSON
        GuideSection(
            id = "security_backup",
            categoryId = "SECURITY",
            title = "8. Keamanan Data & Backup JSON",
            subtitle = "Data Anda 100% tersimpan aman di perangkat lokal (Offline-First). Lakukan cadangan berkala.",
            icon = Icons.Default.Security,
            iconColor = { it.rose },
            steps = listOf(
                GuideStep(
                    title = "Privasi 100% Offline & Tanpa Server Eksternal",
                    body = "Aplikasi GAS tidak menyimpan data gaji, presensi, foto, atau identitas Anda ke server internet pihak ketiga. Seluruh database tersimpan di penyimpanan internal aman perangkat HP Anda.",
                    tip = "Aplikasi tetap dapat digunakan sepenuhnya tanpa koneksi internet."
                ),
                GuideStep(
                    title = "Cara Cadangkan Data (Backup JSON)",
                    body = "Buka menu Profil → scroll ke bawah ke bagian 'CADANGKAN & PULIHKAN DATA' → ketuk 'Cadangkan Data (JSON)'. Salin teks JSON yang dihasilkan dan simpan di Google Drive, email pribadi, atau aplikasi Catatan Anda.",
                    tip = "Disarankan melakukan cadangan data setiap akhir bulan setelah menyelesaikan slip gaji."
                ),
                GuideStep(
                    title = "Cara Pulihkan Data (Restore JSON)",
                    body = "Saat Anda mengganti HP baru atau menginstal ulang aplikasi: Buka menu Profil → ketuk 'Pulihkan Data (JSON)' → tempelkan teks kode JSON cadangan tadi → konfirmasi pulihkan. Semua profil, catatan lembur, cuti, presensi, dan riwayat gaji akan kembali utuh seketika.",
                    tip = "Pastikan teks JSON yang ditempel lengkap dan tidak terpotong."
                )
            ),
            regulationNote = "Keamanan Data: Zero-Cloud Architecture menjamin kerahasiaan nominal gaji & privasi identitas karyawan."
        )
    )

    val filteredSections = remember(selectedCategoryId, searchQuery) {
        allSections.filter { section ->
            val matchesCategory = (selectedCategoryId == "ALL" || section.categoryId == selectedCategoryId)
            val matchesSearch = searchQuery.isBlank() || 
                section.title.contains(searchQuery, ignoreCase = true) ||
                section.subtitle.contains(searchQuery, ignoreCase = true) ||
                section.steps.any { it.title.contains(searchQuery, ignoreCase = true) || it.body.contains(searchQuery, ignoreCase = true) }
            matchesCategory && matchesSearch
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 40.dp)
    ) {
        // Header Navigasi Kembali
        item {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier
                    .clickable { onBack() }
                    .padding(vertical = 4.dp)
            ) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = colors.primary, modifier = Modifier.size(20.dp))
                Text("Kembali ke Menu Utama", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = colors.primary)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Panduan Penggunaan Aplikasi",
                fontSize = 22.sp,
                fontWeight = FontWeight.ExtraBold,
                color = colors.textPrimary
            )
            Text(
                text = "Panduan komprehensif seluruh fitur GAS (Gajiku & Attendance System) berbasis regulasi ketenagakerjaan Indonesia.",
                fontSize = 12.sp,
                color = colors.textMuted,
                lineHeight = 16.sp,
                modifier = Modifier.padding(top = 2.dp)
            )
        }

        // Kotak Pencarian Topik
        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Cari topik panduan (misal: lembur, watermark, pajak, shift)...", fontSize = 12.sp, color = colors.textMuted) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = colors.primary, modifier = Modifier.size(20.dp)) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Close, contentDescription = "Hapus", tint = colors.textMuted, modifier = Modifier.size(18.dp))
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = colors.primary,
                    unfocusedBorderColor = colors.secondaryCardBorder,
                    focusedContainerColor = colors.secondaryCardBg,
                    unfocusedContainerColor = colors.secondaryCardBg
                )
            )
        }

        // Horizontal Category Filter Pills
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "KATEGORI PANDUAN",
                    fontSize = 10.5.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = colors.primary
                )
                androidx.compose.foundation.lazy.LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(categories) { cat ->
                        val isSelected = cat.id == selectedCategoryId
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (isSelected) colors.primary else colors.secondaryCardBg,
                            border = BorderStroke(1.dp, if (isSelected) colors.primary else colors.secondaryCardBorder),
                            modifier = Modifier.clickable { selectedCategoryId = cat.id }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = cat.icon,
                                    contentDescription = null,
                                    tint = if (isSelected) Color.White else colors.textMuted,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = cat.name,
                                    fontSize = 11.5.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color.White else colors.textPrimary
                                )
                            }
                        }
                    }
                }
            }
        }

        // Banner Alur Cepat (Quick Start Flow)
        if (selectedCategoryId == "ALL" && searchQuery.isBlank()) {
            item {
                Card(
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = colors.primaryContainer.copy(alpha = 0.35f)),
                    border = BorderStroke(1.dp, colors.primary.copy(alpha = 0.4f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.Bolt, contentDescription = null, tint = colors.primary, modifier = Modifier.size(20.dp))
                            Text("Alur Ringkas Penggunaan (Quick Start)", fontSize = 13.5.sp, fontWeight = FontWeight.ExtraBold, color = colors.textPrimary)
                        }
                        Text(
                            text = "1. Lengkapi Profil & Gaji Pokok → 2. Catat Presensi & Foto Bukti Harian → 3. Catat Lembur & Pantau Audit K3 → 4. Buka Slip Gaji & Tekan 'Ambil dari Log' → 5. Simpan & Ekspor PDF resmi.",
                            fontSize = 11.5.sp,
                            color = colors.textSecondary,
                            lineHeight = 17.sp
                        )
                    }
                }
            }
        }

        // List Sections
        if (filteredSections.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.SearchOff, contentDescription = null, tint = colors.textMuted, modifier = Modifier.size(40.dp))
                        Text("Topik panduan tidak ditemukan", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                        Text("Coba kata kunci pencarian lain atau pilih kategori Semua Topik.", fontSize = 12.sp, color = colors.textMuted)
                    }
                }
            }
        } else {
            items(filteredSections, key = { it.id }) { section ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                    elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                    border = if (colors.isDark) BorderStroke(1.dp, colors.secondaryCardBorder) else null
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        // Section Header
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Surface(
                                color = section.iconColor(colors).copy(alpha = 0.16f),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.size(44.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = section.icon,
                                        contentDescription = null,
                                        tint = section.iconColor(colors),
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = section.title,
                                    fontSize = 14.5.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = colors.textPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = section.subtitle,
                                    fontSize = 11.sp,
                                    color = colors.textMuted,
                                    lineHeight = 15.sp
                                )
                            }
                        }

                        Divider(color = colors.secondaryCardBorder.copy(alpha = 0.6f), thickness = 0.8.dp)

                        // Step-by-step list
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            section.steps.forEachIndexed { index, step ->
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = colors.background.copy(alpha = if (colors.isDark) 0.6f else 0.8f),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(
                                        modifier = Modifier.padding(12.dp),
                                        verticalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Surface(
                                                color = section.iconColor(colors).copy(alpha = 0.2f),
                                                shape = RoundedCornerShape(6.dp),
                                                modifier = Modifier.size(20.dp)
                                            ) {
                                                Box(contentAlignment = Alignment.Center) {
                                                    Text(
                                                        text = "${index + 1}",
                                                        fontSize = 10.5.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = section.iconColor(colors)
                                                    )
                                                }
                                            }
                                            Text(
                                                text = step.title,
                                                fontSize = 12.5.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = colors.textPrimary
                                            )
                                        }

                                        Text(
                                            text = step.body,
                                            fontSize = 11.5.sp,
                                            color = colors.textSecondary,
                                            lineHeight = 16.5.sp,
                                            modifier = Modifier.padding(start = 28.dp, top = 2.dp)
                                        )

                                        if (step.tip != null) {
                                            Surface(
                                                shape = RoundedCornerShape(8.dp),
                                                color = colors.primaryContainer.copy(alpha = 0.25f),
                                                modifier = Modifier
                                                    .padding(start = 28.dp, top = 6.dp)
                                                    .fillMaxWidth()
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Icon(
                                                        Icons.Default.Lightbulb,
                                                        contentDescription = null,
                                                        tint = colors.primary,
                                                        modifier = Modifier.size(14.dp)
                                                    )
                                                    Text(
                                                        text = step.tip,
                                                        fontSize = 10.5.sp,
                                                        color = colors.textPrimary,
                                                        lineHeight = 14.sp
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Catatan Regulasi Resmi
                        if (section.regulationNote != null) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = colors.secondaryCardBorder.copy(alpha = 0.3f),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(Icons.Default.Gavel, contentDescription = null, tint = colors.textMuted, modifier = Modifier.size(14.dp))
                                    Text(
                                        text = section.regulationNote,
                                        fontSize = 10.sp,
                                        color = colors.textMuted,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Footer Card Tips Tambahan
        item {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = colors.primaryContainer.copy(alpha = 0.25f),
                border = BorderStroke(1.dp, colors.primary.copy(alpha = 0.3f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(Icons.Default.Shield, contentDescription = null, tint = colors.primary, modifier = Modifier.size(22.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Privasi & Keamanan Data 100% Lokal",
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textPrimary
                        )
                        Text(
                            text = "Aplikasi GAS tidak mengunggah data apa pun ke internet. Untuk mencegah kehilangan data saat mengganti perangkat, gunakan fitur Cadangkan JSON secara berkala di menu Profil.",
                            fontSize = 11.sp,
                            color = colors.textSecondary,
                            lineHeight = 15.sp
                        )
                    }
                }
            }
        }
    }
}
