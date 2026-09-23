package com.example.ui.screens

import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import androidx.compose.runtime.rememberCoroutineScope

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.AttendanceRecord
import com.example.data.model.OvertimeLog
import com.example.data.model.UserProfile
import com.example.domain.calculator.K3AuditCalculator
import com.example.domain.calculator.K3AuditSummary
import com.example.domain.calculator.K3ComplianceStatus
import com.example.domain.pdf.PdfExporter
import com.example.ui.components.GovernmentDisclaimerCard
import com.example.ui.components.k3.K3ComplianceCard
import com.example.ui.components.k3.K3RecommendationBox
import com.example.ui.components.k3.K3WeeklyLogTable
import com.example.ui.theme.GajikuTheme
import java.util.Calendar
import java.util.Locale

private val indonesianMonths = listOf(
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
)

/**
 * Halaman Baru: Audit K3 (Kepatuhan Jam Kerja & Lembur)
 * Mengacu pada PP No. 35 Tahun 2021 & Permenaker No. 27 Tahun 2021:
 * - Jam kerja normal: 7 jam/hari (6 HK) atau 8 jam/hari (5 HK) & 40 jam/minggu
 * - Lembur maksimal: 4 jam/hari dan 18 jam/minggu
 * 
 * 100% Client-Side Local Calculation tanpa backend/database eksternal.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuditK3Screen(
    userProfile: UserProfile,
    isProUser: Boolean,
    overtimeLogs: List<OvertimeLog>,
    attendanceRecords: List<AttendanceRecord>,
    onOpenProDialog: () -> Unit,
    onNavigateToOvertime: () -> Unit,
    onNavigateToAttendance: () -> Unit
) {
    val colors = GajikuTheme.colors
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    val currentCal = remember { Calendar.getInstance(Locale("id")) }
    var selectedYear by remember { mutableIntStateOf(currentCal.get(Calendar.YEAR)) }
    var selectedMonth by remember { mutableIntStateOf(currentCal.get(Calendar.MONTH) + 1) }

    var showMonthPicker by remember { mutableStateOf(false) }
    var showRegulationDialog by remember { mutableStateOf(false) }

    // Hitung Audit K3 secara dinamis & real-time di lokal perangkat
    val auditSummary: K3AuditSummary = remember(userProfile, overtimeLogs, attendanceRecords, selectedYear, selectedMonth) {
        K3AuditCalculator.performAudit(
            userProfile = userProfile,
            overtimeLogs = overtimeLogs,
            attendanceRecords = attendanceRecords,
            year = selectedYear,
            month = selectedMonth
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 18.dp)
            .testTag("audit_k3_screen"),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 36.dp)
    ) {
        // 1. Header Card dengan Selector Periode & Tombol Export PDF
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (colors.isDark) Color(0xFF1E1B4B) else Color(0xFFF5F3FF)
                ),
                border = BorderStroke(1.2.dp, Color(0xFF7C3AED).copy(alpha = 0.5f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(2.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "AUDIT K3 & JAM KERJA",
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    letterSpacing = (-0.3).sp,
                                    color = colors.textPrimary
                                )
                                Surface(
                                    color = Color(0xFF7C3AED),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        text = "PP 35/2021",
                                        fontSize = 8.5.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color.White,
                                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Text(
                                text = "Kepatuhan Beban Kerja & Batas Lembur Karyawan",
                                fontSize = 11.sp,
                                color = colors.textMuted
                            )
                        }
                        // Tombol Info Regulasi
                        IconButton(
                            onClick = { showRegulationDialog = true },
                            modifier = Modifier
                                .size(34.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF7C3AED).copy(alpha = 0.15f))
                                .testTag("btn_k3_regulation_info")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = "Info Regulasi K3",
                                tint = Color(0xFF7C3AED),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    // Selector Bulan & Tombol Export Laporan
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Month-Year Picker Trigger
                        Surface(
                            color = colors.surface,
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, colors.outline),
                            modifier = Modifier
                                .weight(1f)
                                .clickable { showMonthPicker = true }
                                .testTag("btn_select_audit_month")
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CalendarToday,
                                        contentDescription = null,
                                        tint = Color(0xFF7C3AED),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = auditSummary.periodLabel,
                                        fontSize = 12.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.textPrimary
                                    )
                                }
                                Icon(
                                    imageVector = Icons.Default.ArrowDropDown,
                                    contentDescription = null,
                                    tint = colors.textMuted
                                )
                            }
                        }

                        // Tombol Export PDF Laporan K3
                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    val file = PdfExporter.exportK3AuditPdf(
                                        context = context,
                                        profile = userProfile,
                                        auditSummary = auditSummary,
                                        isProUser = isProUser
                                    )
                                    if (file != null) {
                                        PdfExporter.sharePdfFile(context, file)
                                        Toast.makeText(context, "Laporan Audit K3 PDF berhasil dibuat!", Toast.LENGTH_SHORT).show()
                                    } else {
                                        Toast.makeText(context, "Gagal mengekspor PDF laporan K3", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF7C3AED)
                            ),
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp),
                            modifier = Modifier.testTag("btn_export_k3_pdf")
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.PictureAsPdf,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = "Export K3",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }
            }
        }

        // 2. Card Ringkasan Kepatuhan K3 Utama (Compliance Card)
        item {
            K3ComplianceCard(auditSummary = auditSummary)
        }

        // 3. Grid Ringkas Batas Normatif Hukum (Permenaker & PP 35/2021)
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Batas Harian
                Surface(
                    color = colors.surface,
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, colors.outline),
                    modifier = Modifier.weight(1f)
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Timer,
                                contentDescription = null,
                                tint = Color(0xFF7C3AED),
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = "BATAS HARIAN",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textMuted
                            )
                        }
                        Text(
                            text = "Maks 4 Jam / Hari",
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = colors.textPrimary
                        )
                        Text(
                            text = "Di luar hari libur resmi",
                            fontSize = 9.sp,
                            color = colors.textMuted
                        )
                    }
                }

                // Batas Mingguan
                Surface(
                    color = colors.surface,
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, colors.outline),
                    modifier = Modifier.weight(1f)
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.DateRange,
                                contentDescription = null,
                                tint = Color(0xFF7C3AED),
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = "BATAS MINGGUAN",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textMuted
                            )
                        }
                        Text(
                            text = "Maks 18 Jam / Pekan",
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = colors.textPrimary
                        )
                        Text(
                            text = "Pasal 26 PP No. 35/2021",
                            fontSize = 9.sp,
                            color = colors.textMuted
                        )
                    }
                }
            }
        }

        // 4. Section Rekomendasi K3 Otomatis (Rule-Based)
        item {
            K3RecommendationBox(recommendations = auditSummary.recommendations)
        }

        // 5. Tabel / List Riwayat Mingguan & Detail Harian
        item {
            K3WeeklyLogTable(weeklyAudits = auditSummary.weeklyAudits)
        }

        // 6. Shortcut Navigation ke Log Lembur & Presensi
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colors.surfaceVariant.copy(alpha = 0.5f)),
                border = BorderStroke(1.dp, colors.outline)
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Sinkronisasi Sumber Data Lokal",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                    Text(
                        text = "Data audit dikalkulasi otomatis dari pencatatan harian yang Anda input pada fitur Log Lembur dan Presensi.",
                        fontSize = 10.5.sp,
                        color = colors.textMuted
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = onNavigateToOvertime,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(vertical = 6.dp)
                        ) {
                            Icon(Icons.Default.AccessTime, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Input Lembur", fontSize = 11.sp)
                        }
                        OutlinedButton(
                            onClick = onNavigateToAttendance,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(vertical = 6.dp)
                        ) {
                            Icon(Icons.Default.AssignmentTurnedIn, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Input Presensi", fontSize = 11.sp)
                        }
                    }
                }
            }
        }

        // 7. Penafian Resmi / Government Disclaimer Card
        item {
            GovernmentDisclaimerCard()
        }
    }

    // Modal / Dialog Pemilih Bulan & Tahun
    if (showMonthPicker) {
        AlertDialog(
            onDismissRequest = { showMonthPicker = false },
            title = {
                Text(
                    text = "Pilih Periode Audit K3",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = colors.textPrimary
                )
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "Tahun Audit: $selectedYear",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF7C3AED)
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf(selectedYear - 1, selectedYear, selectedYear + 1).forEach { y ->
                            FilterChip(
                                selected = selectedYear == y,
                                onClick = { selectedYear = y },
                                label = { Text(y.toString(), fontSize = 11.sp) }
                            )
                        }
                    }

                    HorizontalDivider(color = colors.outline)

                    Text(
                        text = "Pilih Bulan:",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )

                    // Grid 12 Bulan
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        for (row in 0 until 4) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                for (col in 0 until 3) {
                                    val mIdx = row * 3 + col
                                    val monthNum = mIdx + 1
                                    val isSel = selectedMonth == monthNum
                                    Surface(
                                        color = if (isSel) Color(0xFF7C3AED) else colors.surfaceVariant,
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier
                                            .weight(1f)
                                            .clickable {
                                                selectedMonth = monthNum
                                                showMonthPicker = false
                                            }
                                    ) {
                                        Box(
                                            contentAlignment = Alignment.Center,
                                            modifier = Modifier.padding(vertical = 8.dp)
                                        ) {
                                            Text(
                                                text = indonesianMonths[mIdx].take(3),
                                                fontSize = 11.sp,
                                                fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                                                color = if (isSel) Color.White else colors.textPrimary
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showMonthPicker = false }) {
                    Text("Tutup", color = Color(0xFF7C3AED), fontWeight = FontWeight.Bold)
                }
            }
        )
    }

    // Modal / Dialog Penjelasan Regulasi K3
    if (showRegulationDialog) {
        AlertDialog(
            onDismissRequest = { showRegulationDialog = false },
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Gavel,
                        contentDescription = null,
                        tint = Color(0xFF7C3AED),
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "Dasar Hukum K3 Jam Kerja",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }
            },
            text = {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item {
                        Text(
                            text = "1. PP No. 35 Tahun 2021 Pasal 26:",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = Color(0xFF7C3AED)
                        )
                        Text(
                            text = "• Waktu kerja lembur hanya dapat dilakukan paling banyak 4 (empat) jam dalam 1 (satu) hari dan 18 (delapan belas) jam dalam 1 (satu) minggu.\n• Batasan waktu kerja lembur tidak termasuk kerja lembur yang dilakukan pada waktu istirahat mingguan dan/atau hari libur resmi.",
                            fontSize = 11.sp,
                            lineHeight = 16.sp,
                            color = colors.textPrimary
                        )
                    }

                    item {
                        Text(
                            text = "2. Permenaker No. 27 Tahun 2021:",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = Color(0xFF7C3AED)
                        )
                        Text(
                            text = "• Mengatur tata cara penerapan syarat K3 pada sektor manufaktur, pertambangan, dan jasa guna mencegah kelelahan kerja (fatigue) dan kecelakaan akibat kerja.",
                            fontSize = 11.sp,
                            lineHeight = 16.sp,
                            color = colors.textPrimary
                        )
                    }

                    item {
                        Text(
                            text = "3. Status Klasifikasi Audit:",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = Color(0xFF7C3AED)
                        )
                        Text(
                            text = "• AMAN: Lembur mingguan <= 12 jam, tidak ada lembur harian > 4 jam.\n• WASPADA: Lembur mingguan 13 - 18 jam (mendekati batas normatif).\n• PELANGGARAN: Lembur sepekan > 18 jam atau lembur hari kerja > 4 jam/hari.",
                            fontSize = 11.sp,
                            lineHeight = 16.sp,
                            color = colors.textPrimary
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { showRegulationDialog = false },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED))
                ) {
                    Text("Paham & Tutup", color = Color.White)
                }
            }
        )
    }
}
