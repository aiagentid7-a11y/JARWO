package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.AppSettings
import com.example.data.model.LeaveRecord
import com.example.domain.calculator.IndonesianPayrollCalculators
import com.example.domain.calculator.IndonesianPayrollCalculators.StatutoryLeaveCategory
import com.example.domain.calculator.IndonesianPayrollCalculators.StatutoryLeaveItem
import com.example.domain.util.Formatters
import com.example.ui.components.AdBannerPlaceholder
import com.example.ui.components.LegalDisclaimerCard
import com.example.ui.theme.*
import java.util.Calendar
import java.util.Locale

data class CutiBersamaPreset(
    val name: String,
    val dateRange: String,
    val startDate: String,
    val endDate: String,
    val daysCount: Int,
    val description: String
)

@Composable
fun LeaveTrackerScreen(
    leaveRecords: List<LeaveRecord>,
    isProUser: Boolean,
    onAddLeave: (String, String, String, Int, String) -> Unit,
    onDeleteLeave: (Long) -> Unit,
    onOpenProDialog: () -> Unit,
    onNavigateToCalendar: () -> Unit = {},
    appSettings: AppSettings = AppSettings()
) {
    val colors = GajikuTheme.colors
    val context = LocalContext.current
    // Kuota cuti tahunan mengikuti pengaturan di DB
    val totalAnnualQuota = appSettings.defaultAnnualLeaveQuota

    val allStatutoryLeaves = remember { IndonesianPayrollCalculators.getAllStatutoryLeaves() }

    fun calculateDaysBetween(start: String, end: String): Int {
        return try {
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val d1 = sdf.parse(start)
            val d2 = sdf.parse(end)
            if (d1 != null && d2 != null) {
                val diff = d2.time - d1.time
                val days = (diff / (1000 * 60 * 60 * 24)).toInt() + 1
                days.coerceAtLeast(1)
            } else 1
        } catch (e: Exception) {
            1
        }
    }

    // Helper untuk mendeteksi apakah suatu leaveRecord memotong kuota tahunan
    fun isQuotaDeducting(record: LeaveRecord): Boolean {
        val statutory = IndonesianPayrollCalculators.findStatutoryLeave(record.leaveType)
        return statutory?.isQuotaDeductible ?: (record.leaveType == "TAHUNAN" || record.leaveType == "CUTI_BERSAMA")
    }

    fun calculateEndDate(start: String, days: Int): String {
        return try {
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val cal = Calendar.getInstance()
            cal.time = sdf.parse(start) ?: java.util.Date()
            if (days > 1) {
                cal.add(Calendar.DAY_OF_MONTH, days - 1)
            }
            sdf.format(cal.time)
        } catch (e: Exception) {
            start
        }
    }

    // Filter Periode Tahun Cuti
    val currentYear = remember { Calendar.getInstance().get(Calendar.YEAR) }
    var selectedYearFilter by remember { mutableIntStateOf(currentYear) }

    val availableYears = remember(leaveRecords, currentYear) {
        val extracted = leaveRecords.mapNotNull { it.startDate.take(4).toIntOrNull() }.toSet() + currentYear
        extracted.sortedDescending()
    }

    val filteredRecords = remember(leaveRecords, selectedYearFilter) {
        if (selectedYearFilter == 0) {
            leaveRecords
        } else {
            leaveRecords.filter { it.startDate.startsWith("$selectedYearFilter") || it.endDate.startsWith("$selectedYearFilter") }
        }
    }

    // Breakdown perhitungan kuota tahunan vs Non-Potong Kuota berdasarkan tahun yang dipilih
    val usedPersonalAnnual = remember(filteredRecords) {
        filteredRecords.filter { it.leaveType == "TAHUNAN" || (isQuotaDeducting(it) && it.leaveType != "CUTI_BERSAMA") }.sumOf { it.daysCount }
    }
    val usedCutiBersama = remember(filteredRecords) {
        filteredRecords.filter { it.leaveType == "CUTI_BERSAMA" }.sumOf { it.daysCount }
    }
    val totalUsedAnnual = usedPersonalAnnual + usedCutiBersama
    val remainingAnnual = (totalAnnualQuota - totalUsedAnnual).coerceAtLeast(0)
    val isOverQuota = totalUsedAnnual > totalAnnualQuota
    val overQuotaDays = if (isOverQuota) totalUsedAnnual - totalAnnualQuota else 0

    val nonQuotaLeavesList = remember(filteredRecords) {
        filteredRecords.filter { !isQuotaDeducting(it) }
    }
    val nonQuotaTotalDays = remember(nonQuotaLeavesList) {
        nonQuotaLeavesList.sumOf { it.daysCount }
    }

    val isDukaCitaRec: (LeaveRecord) -> Boolean = { rec ->
        val stat = IndonesianPayrollCalculators.findStatutoryLeave(rec.leaveType)
        stat?.category == StatutoryLeaveCategory.DUKA_CITA ||
            rec.leaveType.contains("DUKA") ||
            rec.leaveType.contains("BEREAVEMENT") ||
            rec.leaveType.contains("KEMATIAN")
    }

    val isAcaraKeluargaRec: (LeaveRecord) -> Boolean = { rec ->
        if (isDukaCitaRec(rec)) false
        else {
            val stat = IndonesianPayrollCalculators.findStatutoryLeave(rec.leaveType)
            stat?.category == StatutoryLeaveCategory.PERISTIWA_KELUARGA ||
                rec.leaveType.contains("MENIKAH") ||
                rec.leaveType.contains("KHITANAN") ||
                rec.leaveType.contains("BAPTIS")
        }
    }

    val isSakitRec: (LeaveRecord) -> Boolean = { rec ->
        val stat = IndonesianPayrollCalculators.findStatutoryLeave(rec.leaveType)
        stat?.category == StatutoryLeaveCategory.SAKIT_KESEHATAN ||
            rec.leaveType in listOf("SAKIT", "SICK", "SAKIT_DOKTER", "SAKIT_RAWAT_INAP", "OPNAME", "SAKIT_BERKEPANJANGAN", "CUTI_HAID", "CUTI_HAID_MEDIS") ||
            rec.leaveType.contains("SAKIT") ||
            rec.leaveType.contains("SICK") ||
            rec.leaveType.contains("OPNAME") ||
            rec.leaveType.contains("RAWAT") ||
            rec.leaveType.contains("HAID") ||
            rec.leaveType.contains("MEDIS") ||
            rec.leaveType.contains("DOKTER")
    }

    val isBersalinRec: (LeaveRecord) -> Boolean = { rec ->
        val stat = IndonesianPayrollCalculators.findStatutoryLeave(rec.leaveType)
        stat?.category == StatutoryLeaveCategory.REPRODUKSI_BERSALIN ||
            rec.leaveType in listOf("MELAHIRKAN", "KEGUGURAN")
    }

    val isIbadahRec: (LeaveRecord) -> Boolean = { rec ->
        val stat = IndonesianPayrollCalculators.findStatutoryLeave(rec.leaveType)
        stat?.category == StatutoryLeaveCategory.IBADAH_KEAGAMAAN ||
            rec.leaveType in listOf("IBADAH", "IBADAH_HAJI_UMRAH", "HAJI", "UMRAH", "IBADAH_AGAMA") ||
            rec.leaveType.contains("IBADAH") ||
            rec.leaveType.contains("HAJI") ||
            rec.leaveType.contains("UMRAH")
    }

    val isTugasNegaraRec: (LeaveRecord) -> Boolean = { rec ->
        val stat = IndonesianPayrollCalculators.findStatutoryLeave(rec.leaveType)
        stat?.category == StatutoryLeaveCategory.TUGAS_NEGARA ||
            rec.leaveType in listOf("TUGAS_NEGARA", "TUGAS_NEGARA_SERIKAT", "SERIKAT", "SERIKAT_PEKERJA", "KEWAJIBAN_NEGARA", "PEMILU", "UJIAN_PENDIDIKAN", "UJIAN") ||
            rec.leaveType.contains("NEGARA") ||
            rec.leaveType.contains("SERIKAT") ||
            rec.leaveType.contains("PEMILU") ||
            rec.leaveType.contains("UJIAN")
    }

    val usedDukaCitaDays = remember(filteredRecords) {
        filteredRecords.filter(isDukaCitaRec).sumOf { it.daysCount }
    }

    val usedAcaraKeluargaDays = remember(filteredRecords) {
        filteredRecords.filter(isAcaraKeluargaRec).sumOf { it.daysCount }
    }

    val usedSakitDays = remember(filteredRecords) {
        filteredRecords.filter(isSakitRec).sumOf { it.daysCount }
    }

    val usedBersalinDays = remember(filteredRecords) {
        filteredRecords.filter(isBersalinRec).sumOf { it.daysCount }
    }

    val usedIbadahDays = remember(filteredRecords) {
        filteredRecords.filter(isIbadahRec).sumOf { it.daysCount }
    }

    val usedTugasNegaraDays = remember(filteredRecords) {
        filteredRecords.filter(isTugasNegaraRec).sumOf { it.daysCount }
    }

    var historyCategoryFilter by remember { mutableStateOf("SEMUA") }

    val recordsToShow = remember(filteredRecords, historyCategoryFilter) {
        when (historyCategoryFilter) {
            "SAKIT" -> filteredRecords.filter(isSakitRec)
            "IBADAH" -> filteredRecords.filter(isIbadahRec)
            "TUGAS_NEGARA" -> filteredRecords.filter(isTugasNegaraRec)
            "DUKA" -> filteredRecords.filter(isDukaCitaRec)
            "KELUARGA" -> filteredRecords.filter(isAcaraKeluargaRec)
            "BERSALIN" -> filteredRecords.filter(isBersalinRec)
            "TAHUNAN" -> filteredRecords.filter { rec ->
                rec.leaveType == "TAHUNAN" || rec.leaveType == "CUTI_BERSAMA" || isQuotaDeducting(rec)
            }
            else -> filteredRecords
        }
    }

    // Default ke Kategori Cuti Tahunan (kebutuhan terbanyak karyawan)
    var selectedCategoryTab by remember { mutableStateOf(StatutoryLeaveCategory.POTONG_KUOTA) }
    var selectedType by remember { mutableStateOf("TAHUNAN") }
    var startDateInput by remember { mutableStateOf(Formatters.getCurrentDateStr()) }
    var endDateInput by remember { mutableStateOf(Formatters.getCurrentDateStr()) }
    var daysCountInput by remember { mutableStateOf("1") }
    var reasonInput by remember { mutableStateOf("Cuti Tahunan Pribadi Karyawan") }

    var showCutiBersamaPresetDialog by remember { mutableStateOf(false) }
    var showNonQuotaCatalogDialog by remember { mutableStateOf(false) }
    var showStartDatePicker by remember { mutableStateOf(false) }
    var showEndDatePicker by remember { mutableStateOf(false) }
    var isDetailCardExpanded by remember { mutableStateOf(false) }

    val currentStatutory = remember(selectedType) {
        IndonesianPayrollCalculators.findStatutoryLeave(selectedType)
            ?: allStatutoryLeaves.firstOrNull { it.key == selectedType }
    }
    LaunchedEffect(selectedType) { isDetailCardExpanded = false }

    // Preset Cuti Bersama Resmi Pemerintah (SKB 3 Menteri)
    val cutiBersamaPresets = remember {
        listOf(
            CutiBersamaPreset(
                name = "Cuti Bersama Tahun Baru Imlek",
                dateRange = "28 Januari",
                startDate = "2026-01-28",
                endDate = "2026-01-28",
                daysCount = 1,
                description = "SKB 3 Menteri Cuti Bersama Tahun Baru Imlek"
            ),
            CutiBersamaPreset(
                name = "Cuti Bersama Hari Raya Idul Fitri (Lebaran)",
                dateRange = "20, 23, 24 Maret",
                startDate = "2026-03-20",
                endDate = "2026-03-24",
                daysCount = 3,
                description = "SKB 3 Menteri Cuti Bersama Idul Fitri 1447 H"
            ),
            CutiBersamaPreset(
                name = "Cuti Bersama Kenaikan Yesus Kristus",
                dateRange = "15 Mei",
                startDate = "2026-05-15",
                endDate = "2026-05-15",
                daysCount = 1,
                description = "SKB 3 Menteri Cuti Bersama Kenaikan Yesus Kristus"
            ),
            CutiBersamaPreset(
                name = "Cuti Bersama Hari Raya Waisak",
                dateRange = "1 Juni",
                startDate = "2026-06-01",
                endDate = "2026-06-01",
                daysCount = 1,
                description = "SKB 3 Menteri Cuti Bersama Hari Raya Waisak"
            ),
            CutiBersamaPreset(
                name = "Cuti Bersama Hari Raya Idul Adha",
                dateRange = "28 Mei",
                startDate = "2026-05-28",
                endDate = "2026-05-28",
                daysCount = 1,
                description = "SKB 3 Menteri Cuti Bersama Idul Adha 1447 H"
            ),
            CutiBersamaPreset(
                name = "Cuti Bersama Hari Raya Natal",
                dateRange = "24 Desember",
                startDate = "2026-12-24",
                endDate = "2026-12-24",
                daysCount = 1,
                description = "SKB 3 Menteri Cuti Bersama Hari Raya Natal"
            )
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 28.dp)
    ) {
        // 1. Quota Summary Card with Cuti Bersama & Non-Potong Breakdown
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = if (colors.isDark) 0.dp else 4.dp),
                colors = CardDefaults.cardColors(containerColor = colors.primaryCardBg),
                border = if (colors.isDark) {
                    CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.primary.copy(alpha = 0.4f)))
                } else null
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                            Text(
                                "RINGKASAN HAK & KUOTA CUTI KARYAWAN",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                letterSpacing = 0.8.sp,
                                color = colors.primary
                            )
                            Text(
                                if (selectedYearFilter == 0) "Semua Periode Tahun" else "Periode Tahun $selectedYearFilter",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = colors.textMuted
                            )
                        }
                        Surface(
                            color = colors.tealBg,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = "UU 13/2003 & UU KIA 4/2024",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.teal,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                            )
                        }
                    }

                    // Filter Periode Tahun Cuti
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Tahun:",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textSecondary
                        )
                        availableYears.forEach { yr ->
                            val isSelected = selectedYearFilter == yr
                            Surface(
                                color = if (isSelected) colors.primary else colors.surfaceVariant,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.clickable { selectedYearFilter = yr }
                            ) {
                                Text(
                                    text = "$yr",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) colors.onPrimary else colors.textPrimary,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                        val isAllSelected = selectedYearFilter == 0
                        Surface(
                            color = if (isAllSelected) colors.primary else colors.surfaceVariant,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.clickable { selectedYearFilter = 0 }
                        ) {
                            Text(
                                text = "Semua",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isAllSelected) colors.onPrimary else colors.textPrimary,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Sisa Cuti ($totalAnnualQuota Hari)", 
                                fontSize = 12.sp, 
                                fontWeight = FontWeight.Medium, 
                                color = colors.textSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                "$remainingAnnual Hari",
                                fontSize = 28.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = if (isOverQuota) colors.error else if (remainingAnnual > 3) colors.success else if (remainingAnnual > 0) colors.warning else colors.error
                            )
                            if (isOverQuota) {
                                Text(
                                    "Melebihi Kuota (+$overQuotaDays Hari)",
                                    fontSize = 10.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.error
                                )
                            }
                        }
                        Column(
                            modifier = Modifier.weight(1f),
                            horizontalAlignment = Alignment.End
                        ) {
                            Text(
                                "Total Terpakai", 
                                fontSize = 12.sp, 
                                fontWeight = FontWeight.Medium, 
                                color = colors.textSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                "$totalUsedAnnual / $totalAnnualQuota Hari",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textPrimary
                            )
                        }
                    }

                    HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                    // Rincian Pemotongan Kuota Cuti vs Non-Potong
                    Surface(
                        color = colors.surfaceVariant,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top
                            ) {
                                Text("Jatah Dasar Cuti Tahunan:", fontSize = 11.sp, color = colors.textSecondary, modifier = Modifier.weight(1f))
                                Text("$totalAnnualQuota Hari", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary, textAlign = TextAlign.End, modifier = Modifier.widthIn(min = 72.dp).padding(start = 8.dp))
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top
                            ) {
                                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                                    Icon(Icons.Default.EventAvailable, contentDescription = null, tint = colors.amber, modifier = Modifier.size(13.dp).padding(top = 1.dp))
                                    Text("Cuti Bersama SKB 3 Menteri (Potong Kuota):", fontSize = 11.sp, color = colors.amber, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                                }
                                Text("- $usedCutiBersama Hari", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.amber, textAlign = TextAlign.End, modifier = Modifier.widthIn(min = 72.dp).padding(start = 8.dp))
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top
                            ) {
                                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                                    Icon(Icons.Default.Person, contentDescription = null, tint = colors.textSecondary, modifier = Modifier.size(13.dp).padding(top = 1.dp))
                                    Text("Cuti Tahunan Pribadi Karyawan:", fontSize = 11.sp, color = colors.textSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                }
                                Text("- $usedPersonalAnnual Hari", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary, textAlign = TextAlign.End, modifier = Modifier.widthIn(min = 72.dp).padding(start = 8.dp))
                            }
                            HorizontalDivider(color = colors.outline.copy(alpha = 0.3f), thickness = 0.5.dp)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top
                            ) {
                                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                                    Icon(Icons.Default.Shield, contentDescription = null, tint = colors.teal, modifier = Modifier.size(13.dp).padding(top = 1.dp))
                                    Text("Cuti Non-Potong Kuota (Hak Normatif):", fontSize = 11.sp, color = colors.teal, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                }
                                Text("$nonQuotaTotalDays Hari", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = colors.teal, textAlign = TextAlign.End, modifier = Modifier.widthIn(min = 72.dp).padding(start = 8.dp))
                            }
                            if (usedDukaCitaDays > 0 || usedAcaraKeluargaDays > 0 || usedSakitDays > 0 || usedBersalinDays > 0 || usedIbadahDays > 0 || usedTugasNegaraDays > 0) {
                                if (usedSakitDays > 0) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(start = 16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("• Izin Sakit & Medis Dokter:", fontSize = 10.5.sp, color = colors.textSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                                        Text("$usedSakitDays Hari", fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary, textAlign = TextAlign.End, modifier = Modifier.widthIn(min = 72.dp))
                                    }
                                }
                                if (usedIbadahDays > 0) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(start = 16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("• Ibadah Keagamaan Wajib (Haji/Umrah):", fontSize = 10.5.sp, color = colors.textSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                                        Text("$usedIbadahDays Hari", fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary, textAlign = TextAlign.End, modifier = Modifier.widthIn(min = 72.dp))
                                    }
                                }
                                if (usedTugasNegaraDays > 0) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(start = 16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("• Tugas Negara, Pemilu & Serikat:", fontSize = 10.5.sp, color = colors.textSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                                        Text("$usedTugasNegaraDays Hari", fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary, textAlign = TextAlign.End, modifier = Modifier.widthIn(min = 72.dp))
                                    }
                                }
                                if (usedDukaCitaDays > 0) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(start = 16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("• Izin Duka Cita (Kemalangan):", fontSize = 10.5.sp, color = colors.textSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                                        Text("$usedDukaCitaDays Hari", fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary, textAlign = TextAlign.End, modifier = Modifier.widthIn(min = 72.dp))
                                    }
                                }
                                if (usedAcaraKeluargaDays > 0) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(start = 16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("• Acara Pernikahan & Keluarga:", fontSize = 10.5.sp, color = colors.textSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                                        Text("$usedAcaraKeluargaDays Hari", fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary, textAlign = TextAlign.End, modifier = Modifier.widthIn(min = 72.dp))
                                    }
                                }
                                if (usedBersalinDays > 0) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(start = 16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("• Bersalin, Reproduksi & KIA:", fontSize = 10.5.sp, color = colors.textSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                                        Text("$usedBersalinDays Hari", fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary, textAlign = TextAlign.End, modifier = Modifier.widthIn(min = 72.dp))
                                    }
                                }
                            }
                        }
                    }

                    // 3 Action Buttons for Quick Discovery & Calendar Integration
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Button(
                            onClick = { showNonQuotaCatalogDialog = true },
                            modifier = Modifier.weight(1f).testTag("open_non_quota_catalog_btn"),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = colors.teal),
                            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 10.dp)
                        ) {
                            Icon(Icons.Default.VerifiedUser, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(
                                "Non-Potong",
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }

                        OutlinedButton(
                            onClick = { showCutiBersamaPresetDialog = true },
                            modifier = Modifier.weight(1f).testTag("open_cuti_bersama_presets_btn"),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.amber),
                            border = BorderStroke(1.dp, colors.amber),
                            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 10.dp)
                        ) {
                            Icon(Icons.Default.EventAvailable, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(
                                "SKB 3 Menteri",
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }

                        OutlinedButton(
                            onClick = onNavigateToCalendar,
                            modifier = Modifier.weight(1f).testTag("open_leave_calendar_btn"),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.primary),
                            border = BorderStroke(1.dp, colors.primary),
                            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 10.dp)
                        ) {
                            Icon(Icons.Default.CalendarMonth, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(
                                "Kalender",
                                fontSize = 10.5.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }
        }

        // 2. Input Form Card with Categories
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) {
                    CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder))
                } else null
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    com.example.ui.components.SectionHeaderWithInfo(
                        title = "CATAT CUTI / IZIN NORMATIF",
                        infoTitle = "Hak Cuti Sesuai Regulasi Ketenagakerjaan",
                        infoBody = "• Cuti Non-Potong Kuota: Hak istirahat berbayar penuh yang TIDAK mengurangi jatah cuti tahunan (seperti melahirkan, keguguran, haid, pendampingan suami, pernikahan, duka cita, ibadah haji/umrah, sakit dokter, tugas negara).\n\n" +
                            "• Cuti Potong Kuota: Cuti tahunan pribadi dan Cuti Bersama ketetapan SKB 3 Menteri bagi sektor swasta."
                    )

                    // Category Tabs (Horizontal Scroll)
                    Text("Kategori Hak Cuti:", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colors.textSecondary)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        StatutoryLeaveCategory.values().forEach { cat ->
                            val isCatSelected = selectedCategoryTab == cat
                            Surface(
                                onClick = {
                                    selectedCategoryTab = cat
                                    // Default select the first item in this category
                                    val firstInCat = allStatutoryLeaves.firstOrNull { it.category == cat }
                                    if (firstInCat != null) {
                                        selectedType = firstInCat.key
                                        daysCountInput = firstInCat.defaultDays.toString()
                                        endDateInput = calculateEndDate(startDateInput, firstInCat.defaultDays)
                                        reasonInput = firstInCat.displayName
                                    }
                                },
                                color = if (isCatSelected) colors.primary else colors.surfaceVariant,
                                shape = RoundedCornerShape(10.dp),
                                border = if (!isCatSelected) BorderStroke(1.dp, colors.outline.copy(alpha = 0.3f)) else null
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                                ) {
                                    if (cat.isNonQuota) {
                                        Icon(
                                            Icons.Default.Shield,
                                            contentDescription = null,
                                            tint = if (isCatSelected) colors.background else colors.teal,
                                            modifier = Modifier.size(13.dp)
                                        )
                                        Spacer(Modifier.width(4.dp))
                                    }
                                    Text(
                                        text = cat.label,
                                        fontSize = 12.sp,
                                        fontWeight = if (isCatSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isCatSelected) colors.background else colors.textPrimary
                                    )
                                }
                            }
                        }
                    }

                    // Leave Types in Selected Category
                    Text("Pilih Jenis Cuti / Izin:", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colors.textSecondary)
                    val leavesInCurrentCategory = remember(selectedCategoryTab) {
                        allStatutoryLeaves.filter { it.category == selectedCategoryTab }
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        leavesInCurrentCategory.forEach { item ->
                            val isSelected = selectedType == item.key
                            Surface(
                                onClick = {
                                    selectedType = item.key
                                    daysCountInput = item.defaultDays.toString()
                                    endDateInput = calculateEndDate(startDateInput, item.defaultDays)
                                    if (reasonInput.isBlank() || allStatutoryLeaves.any { it.displayName == reasonInput }) {
                                        reasonInput = item.displayName
                                    }
                                },
                                color = if (isSelected) colors.primaryContainer else colors.inactiveChipBg,
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(
                                    1.dp,
                                    if (isSelected) colors.primary else colors.outline.copy(alpha = 0.25f)
                                ),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 14.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(
                                            verticalAlignment = Alignment.Top,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Text(
                                                text = item.displayName,
                                                fontSize = 11.5.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                                                color = if (isSelected) colors.onPrimaryContainer else colors.textPrimary,
                                                modifier = Modifier.weight(1f)
                                            )
                                            Surface(
                                                color = if (!item.isQuotaDeductible) colors.tealBg else colors.amberBg,
                                                shape = RoundedCornerShape(4.dp)
                                            ) {
                                                Text(
                                                    text = if (!item.isQuotaDeductible) "Non-Potong" else "Potong $totalAnnualQuota hr",
                                                    fontSize = 10.5.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (!item.isQuotaDeductible) colors.teal else colors.amber,
                                                    maxLines = 1,
                                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                                )
                                            }
                                        }
                                        Spacer(Modifier.height(2.dp))
                                        Text(
                                            text = "Dasar: ${item.legalReference} • Standar: ${item.defaultDays} Hari",
                                            fontSize = 11.sp,
                                            color = if (isSelected) colors.onPrimaryContainer.copy(alpha = 0.8f) else colors.textSecondary
                                        )
                                    }

                                    RadioButton(
                                        selected = isSelected,
                                        onClick = {
                                            selectedType = item.key
                                            daysCountInput = item.defaultDays.toString()
                                            endDateInput = calculateEndDate(startDateInput, item.defaultDays)
                                            if (reasonInput.isBlank() || allStatutoryLeaves.any { it.displayName == reasonInput }) {
                                                reasonInput = item.displayName
                                            }
                                        },
                                        colors = RadioButtonDefaults.colors(
                                            selectedColor = colors.primary,
                                            unselectedColor = colors.textMuted
                                        )
                                    )
                                }
                            }
                        }
                    }

                    // Collapsible Legal Protection & Wage Guarantee Card
                    currentStatutory?.let { stat ->
                        Surface(
                            onClick = { isDetailCardExpanded = !isDetailCardExpanded },
                            color = if (!stat.isQuotaDeductible) colors.tealBg.copy(alpha = 0.5f) else colors.amberBg.copy(alpha = 0.5f),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(
                                1.dp,
                                if (!stat.isQuotaDeductible) colors.teal.copy(alpha = 0.4f) else colors.amber.copy(alpha = 0.4f)
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("leave_detail_card_toggle")
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Icon(
                                            imageVector = if (!stat.isQuotaDeductible) Icons.Default.Shield else Icons.Default.Warning,
                                            contentDescription = null,
                                            tint = if (!stat.isQuotaDeductible) colors.teal else colors.amber,
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Text(
                                            text = if (!stat.isQuotaDeductible) "HAK NORMATIF: NON-POTONG KUOTA $totalAnnualQuota HARI" else "MEMOTONG JATAH CUTI TAHUNAN ($totalAnnualQuota HARI)",
                                            fontSize = 11.5.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = if (!stat.isQuotaDeductible) colors.teal else colors.amber
                                        )
                                    }
                                    Icon(
                                        imageVector = if (isDetailCardExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                        contentDescription = if (isDetailCardExpanded) "Sembunyikan detail" else "Lihat detail",
                                        tint = colors.textSecondary,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.AttachMoney, contentDescription = null, tint = colors.textPrimary, modifier = Modifier.size(13.dp))
                                    Text(
                                        text = "Perlindungan Upah: ${stat.wageProtection}",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.textPrimary
                                    )
                                }
                                if (isDetailCardExpanded) {
                                    Text(
                                        text = "Dasar Hukum: ${stat.legalReference}",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = colors.textSecondary
                                    )
                                    Text(
                                        text = stat.description,
                                        fontSize = 11.5.sp,
                                        color = colors.textSecondary,
                                        lineHeight = 14.sp
                                    )
                                    if (stat.notes.isNotBlank()) {
                                        Row(
                                            verticalAlignment = Alignment.Top,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Icon(Icons.Default.Info, contentDescription = null, tint = colors.textMuted, modifier = Modifier.size(12.dp))
                                            Text(
                                                text = stat.notes,
                                                fontSize = 11.sp,
                                                color = colors.textMuted,
                                                lineHeight = 13.sp
                                            )
                                        }
                                    }
                                } else {
                                    Text(
                                        text = "Ketuk untuk lihat dasar hukum & detail lengkap",
                                        fontSize = 10.sp,
                                        color = colors.textMuted
                                    )
                                }
                            }
                        }
                    }

                    // Native Android Date Picker Trigger Fields
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = startDateInput,
                            onValueChange = { },
                            readOnly = true,
                            label = { Text("Tanggal Mulai", fontSize = 11.sp) },
                            supportingText = { 
                                Text(
                                    Formatters.formatDateIndo(startDateInput), 
                                    fontSize = 11.sp, 
                                    color = colors.primary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                ) 
                            },
                            trailingIcon = {
                                IconButton(onClick = { showStartDatePicker = true }) {
                                    Icon(Icons.Default.CalendarToday, contentDescription = "Pilih tanggal mulai", tint = colors.primary)
                                }
                            },
                            modifier = Modifier
                                .weight(1f)
                                .clickable { showStartDatePicker = true }
                                .testTag("leave_start_date_input"),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )

                        OutlinedTextField(
                            value = endDateInput,
                            onValueChange = { },
                            readOnly = true,
                            label = { Text("Tanggal Selesai", fontSize = 11.sp) },
                            supportingText = { 
                                Text(
                                    Formatters.formatDateIndo(endDateInput), 
                                    fontSize = 11.sp, 
                                    color = colors.primary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                ) 
                            },
                            trailingIcon = {
                                IconButton(onClick = { showEndDatePicker = true }) {
                                    Icon(Icons.Default.CalendarToday, contentDescription = "Pilih tanggal selesai", tint = colors.primary)
                                }
                            },
                            modifier = Modifier
                                .weight(1f)
                                .clickable { showEndDatePicker = true }
                                .testTag("leave_end_date_input"),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        val rangeDays = remember(startDateInput, endDateInput) {
                            calculateDaysBetween(startDateInput, endDateInput)
                        }
                        OutlinedTextField(
                            value = daysCountInput,
                            onValueChange = { input ->
                                val digits = input.filter { it.isDigit() }.take(3)
                                daysCountInput = digits
                                val d = digits.toIntOrNull()
                                if (d != null && d > 0) {
                                    endDateInput = calculateEndDate(startDateInput, d)
                                }
                            },
                            label = { Text("Jumlah Hari", fontSize = 11.sp) },
                            supportingText = { 
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text("Hari kerja.", fontSize = 10.5.sp)
                                    if (rangeDays.toString() != daysCountInput && rangeDays > 0) {
                                        Text(
                                            "($rangeDays hr)",
                                            fontSize = 10.5.sp,
                                            color = colors.primary,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.clickable {
                                                daysCountInput = rangeDays.toString()
                                            }
                                        )
                                    }
                                }
                            },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(0.5f).testTag("leave_days_input"),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )

                        OutlinedTextField(
                            value = reasonInput,
                            onValueChange = { reasonInput = it },
                            label = { Text("Keterangan / Alasan Cuti", fontSize = 11.sp) },
                            placeholder = { Text(currentStatutory?.displayName ?: "Keterangan cuti/izin...") },
                            modifier = Modifier.weight(0.5f).testTag("leave_reason_input"),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                    }

                    Button(
                        onClick = {
                            val dateRegex = Regex("""^\d{4}-\d{2}-\d{2}$""")
                            val days = daysCountInput.toIntOrNull()
                            when {
                                !dateRegex.matches(startDateInput) -> {
                                    Toast.makeText(context, "Tanggal mulai tidak valid. Silakan pilih ulang lewat kalender.", Toast.LENGTH_SHORT).show()
                                }
                                !dateRegex.matches(endDateInput) -> {
                                    Toast.makeText(context, "Tanggal selesai tidak valid. Silakan pilih ulang lewat kalender.", Toast.LENGTH_SHORT).show()
                                }
                                endDateInput < startDateInput -> {
                                    Toast.makeText(context, "Tanggal selesai tidak boleh sebelum tanggal mulai.", Toast.LENGTH_SHORT).show()
                                }
                                days == null || days <= 0 -> {
                                    Toast.makeText(context, "Jumlah hari harus diisi dan lebih dari 0.", Toast.LENGTH_SHORT).show()
                                }
                                days > 365 -> {
                                    Toast.makeText(context, "Jumlah hari maksimal 365 hari per catatan.", Toast.LENGTH_SHORT).show()
                                }
                                else -> {
                                    val effectiveReason = reasonInput.ifBlank { currentStatutory?.displayName ?: selectedType }
                                    onAddLeave(selectedType, startDateInput, endDateInput, days, effectiveReason)
                                    reasonInput = ""
                                    val quotaStatus = if (currentStatutory?.isQuotaDeductible == false) "Non-Potong Kuota" else "Potong Kuota"
                                    Toast.makeText(context, "Cuti '$effectiveReason' ($days hari, $quotaStatus) disimpan!", Toast.LENGTH_SHORT).show()
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = colors.primaryContainer),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().height(48.dp).testTag("add_leave_button")
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = colors.onPrimaryContainer)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Simpan Catatan Cuti / Izin", fontWeight = FontWeight.Bold, color = colors.onPrimaryContainer)
                    }
                }
            }
        }

        // 3. List of Records
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (selectedYearFilter == 0) "RIWAYAT CUTI & IZIN (SEMUA)" else "RIWAYAT CUTI & IZIN ($selectedYearFilter)",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textMuted
                )
                Text("${filteredRecords.size} Catatan", fontSize = 12.sp, color = colors.textSecondary)
            }
        }

        // Category Filter Chips for History
        item {
            val sakitCount = filteredRecords.count(isSakitRec)
            val ibadahCount = filteredRecords.count(isIbadahRec)
            val tugasNegaraCount = filteredRecords.count(isTugasNegaraRec)
            val dukaCount = filteredRecords.count(isDukaCitaRec)
            val keluargaCount = filteredRecords.count(isAcaraKeluargaRec)
            val tahunanCount = filteredRecords.count { it.leaveType == "TAHUNAN" || it.leaveType == "CUTI_BERSAMA" || isQuotaDeducting(it) }
            val bersalinCount = filteredRecords.count(isBersalinRec)

            val filterOptions = listOf(
                "SEMUA" to "Semua (${filteredRecords.size})",
                "SAKIT" to "Kesehatan/Sakit ($sakitCount)",
                "IBADAH" to "Ibadah ($ibadahCount)",
                "TUGAS_NEGARA" to "Tugas Negara ($tugasNegaraCount)",
                "DUKA" to "Duka Cita ($dukaCount)",
                "KELUARGA" to "Acara Keluarga ($keluargaCount)",
                "TAHUNAN" to "Cuti Tahunan ($tahunanCount)",
                "BERSALIN" to "Bersalin & KIA ($bersalinCount)"
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                filterOptions.forEach { (key, label) ->
                    val isSelected = historyCategoryFilter == key
                    Surface(
                        onClick = { historyCategoryFilter = key },
                        color = if (isSelected) colors.primary else colors.surfaceVariant,
                        shape = RoundedCornerShape(8.dp),
                        border = if (!isSelected) BorderStroke(1.dp, colors.outline.copy(alpha = 0.25f)) else null
                    ) {
                        Text(
                            text = label,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) colors.background else colors.textPrimary,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                }
            }
        }

        if (recordsToShow.isEmpty()) {
            item {
                Surface(
                    color = colors.secondaryCardBg,
                    shape = RoundedCornerShape(18.dp),
                    border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Default.EventNote, contentDescription = null, tint = colors.textMuted, modifier = Modifier.size(32.dp))
                        Text(
                            text = when (historyCategoryFilter) {
                                "SAKIT" -> "Belum ada catatan izin Sakit / Medis"
                                "IBADAH" -> "Belum ada catatan Ibadah Keagamaan Wajib"
                                "TUGAS_NEGARA" -> "Belum ada catatan Tugas Negara / Serikat"
                                "DUKA" -> "Belum ada catatan Cuti Duka Cita"
                                "KELUARGA" -> "Belum ada catatan cuti Acara Keluarga"
                                "TAHUNAN" -> "Belum ada catatan Cuti Tahunan / Bersama"
                                "BERSALIN" -> "Belum ada catatan Cuti Bersalin & KIA"
                                else -> if (selectedYearFilter == 0) "Belum ada catatan cuti / izin" else "Belum ada catatan cuti di tahun $selectedYearFilter"
                            },
                            fontSize = 12.5.sp,
                            color = colors.textSecondary
                        )
                        Text(
                            text = when (historyCategoryFilter) {
                                "SAKIT" -> "Izin Sakit dengan surat dokter resmi, rawat inap RS, sakit berkepanjangan, maupun istirahat haid hari 1-2 adalah Hak Normatif pekerja dengan upah dibayar penuh 100% dan TIDAK memotong jatah cuti tahunan (UU 13/2003 Ps. 81 & 93)."
                                "IBADAH" -> "Izin menjalankan ibadah keagamaan wajib yang diperintahkan agamanya (seperti ibadah Haji pertama kali) adalah Hak Normatif berbayar penuh 100% dan TIDAK memotong kuota cuti tahunan (UU 13/2003 Ps. 93 ayat 2 huruf e)."
                                "TUGAS_NEGARA" -> "Melaksanakan kewajiban negara (pemilu, saksi pengadilan, panggilan dinas) atau tugas serikat pekerja serta ujian kedinasan adalah Hak Normatif pekerja dengan upah dibayar penuh dan TIDAK memotong cuti tahunan (UU 13/2003 Ps. 93 ayat 2 huruf b, d, f)."
                                "DUKA" -> "Cuti Duka Cita (kemalangan keluarga inti/serumah) adalah Hak Normatif pekerja dengan upah dibayar penuh 100% (UU 13/2003 Ps. 93 ayat 4 huruf f-g) dan TIDAK mengurangi kuota cuti tahunan."
                                "KELUARGA" -> "Cuti Pernikahan, Khitanan, dan Baptis Anak adalah Hak Normatif pekerja dengan upah dibayar penuh 100% dan TIDAK mengurangi kuota tahunan."
                                "BERSALIN" -> "Cuti Melahirkan dan Keguguran Kandungan dilindungi UU KIA No. 4/2024 dan UU 13/2003 dengan jaminan upah serta hak pendampingan suami."
                                else -> "Gunakan formulir di atas untuk mencatat Cuti Tahunan, Cuti Bersama, atau Cuti Non-Potong (Sakit / Ibadah / Tugas Negara / KIA / Duka Cita)."
                            },
                            fontSize = 12.sp,
                            color = colors.textMuted,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        } else {
            items(recordsToShow) { rec ->
                val statutoryInfo = IndonesianPayrollCalculators.findStatutoryLeave(rec.leaveType)
                val isNonPotong = statutoryInfo?.isQuotaDeductible == false || (!isQuotaDeducting(rec))
                val isDuka = isDukaCitaRec(rec)
                val isAcaraKeluarga = isAcaraKeluargaRec(rec)
                val isSakit = isSakitRec(rec)
                val isBersalin = isBersalinRec(rec)
                val isIbadah = isIbadahRec(rec)
                val isTugasNegara = isTugasNegaraRec(rec)

                val displayLabel = statutoryInfo?.displayName ?: when (rec.leaveType) {
                    "CUTI_BERSAMA" -> "Cuti Bersama (SKB 3 Menteri)"
                    "TAHUNAN" -> "Cuti Tahunan Pribadi ($totalAnnualQuota Hari)"
                    "MELAHIRKAN" -> "Cuti Melahirkan (UU KIA)"
                    "KEGUGURAN" -> "Cuti Keguguran Kandungan"
                    "CUTI_HAID", "CUTI_HAID_MEDIS" -> "Cuti Haid / Menstruasi"
                    "PENDAMPINGAN", "PENDAMPINGAN_MELAHIRKAN" -> "Suami Dampingi Melahirkan"
                    "PENDAMPINGAN_KEGUGURAN" -> "Suami Dampingi Keguguran"
                    "MENIKAH_SENDIRI", "MARRIAGE" -> "Pernikahan Karyawan"
                    "MENIKAHKAN_ANAK" -> "Menikahkan Anak"
                    "KHITANAN_ANAK" -> "Khitanan Anak"
                    "BAPTIS_ANAK" -> "Baptis Anak"
                    "DUKA_INTI", "DUKA_KELUARGA_INTI", "BEREAVEMENT", "DUKA", "DUKA_CITA" -> "Duka Cita Keluarga Inti"
                    "DUKA_SERUMAH", "KEMATIAN_SERUMAH" -> "Duka Cita Serumah"
                    "DUKA_SAUDARA", "DUKA_SAUDARA_KANDUNG" -> "Duka Cita Saudara Kandung"
                    "SAKIT", "SAKIT_DOKTER", "SICK" -> "Istirahat Sakit (Dokter)"
                    "SAKIT_RAWAT_INAP", "OPNAME" -> "Rawat Inap RS / Tindakan Medis"
                    "SAKIT_BERKEPANJANGAN" -> "Sakit Berkepanjangan (>14 Hari)"
                    "IBADAH_HAJI_UMRAH", "HAJI", "UMRAH", "IBADAH" -> "Ibadah Keagamaan (Haji / Umrah)"
                    "TUGAS_NEGARA", "TUGAS_NEGARA_SERIKAT" -> "Tugas Negara / Serikat"
                    "UJIAN_PENDIDIKAN" -> "Ujian Pendidikan / Kedinasan"
                    else -> rec.leaveType
                }

                val categoryBadge = when {
                    isSakit -> "Izin Sakit"
                    isIbadah -> "Ibadah Wajib"
                    isTugasNegara -> "Tugas Negara"
                    isDuka -> "Duka Cita"
                    isAcaraKeluarga -> "Acara Keluarga"
                    isBersalin -> "Bersalin & KIA"
                    rec.leaveType == "CUTI_BERSAMA" -> "Cuti Bersama"
                    else -> "Cuti Tahunan"
                }

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                    colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                    border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Row(
                                verticalAlignment = Alignment.Top,
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Surface(
                                    color = if (isNonPotong) colors.tealBg else if (rec.leaveType == "CUTI_BERSAMA") colors.amberBg else colors.primaryContainer,
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.padding(top = 1.dp)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(2.dp),
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        if (isNonPotong) {
                                            Icon(
                                                Icons.Default.Shield,
                                                contentDescription = null,
                                                tint = colors.teal,
                                                modifier = Modifier.size(11.dp)
                                            )
                                        }
                                        Text(
                                            text = if (isNonPotong) "Non-Potong" else "Potong Kuota",
                                            fontSize = 10.5.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = if (isNonPotong) colors.teal else if (rec.leaveType == "CUTI_BERSAMA") colors.amber else colors.primary
                                        )
                                    }
                                }

                                Surface(
                                    color = when {
                                        isSakit -> colors.error.copy(alpha = 0.15f)
                                        isIbadah -> colors.teal.copy(alpha = 0.15f)
                                        isTugasNegara -> colors.primary.copy(alpha = 0.15f)
                                        isDuka -> if (colors.isDark) Color(0xFF374151) else Color(0xFFE5E7EB)
                                        isAcaraKeluarga -> colors.primary.copy(alpha = 0.12f)
                                        isBersalin -> colors.teal.copy(alpha = 0.12f)
                                        rec.leaveType == "CUTI_BERSAMA" -> colors.amberBg
                                        else -> colors.surfaceVariant
                                    },
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.padding(top = 1.dp)
                                ) {
                                    Text(
                                        text = categoryBadge,
                                        fontSize = 10.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = when {
                                            isSakit -> colors.error
                                            isIbadah -> colors.teal
                                            isTugasNegara -> colors.primary
                                            isDuka -> if (colors.isDark) Color(0xFFE5E7EB) else Color(0xFF1F2937)
                                            isAcaraKeluarga -> colors.primary
                                            isBersalin -> colors.teal
                                            rec.leaveType == "CUTI_BERSAMA" -> colors.amber
                                            else -> colors.textSecondary
                                        },
                                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                    )
                                }

                                Text(
                                    text = displayLabel,
                                    fontSize = 11.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.textPrimary,
                                    modifier = Modifier.weight(1f)
                                )
                            }

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text("• ${rec.daysCount} Hari", fontSize = 11.5.sp, fontWeight = FontWeight.ExtraBold, color = colors.textPrimary, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                                Text("Mulai: ${Formatters.formatDateIndo(rec.startDate)}", fontSize = 11.sp, color = colors.textSecondary)
                            }
                            if (rec.endDate.isNotBlank() && rec.endDate != rec.startDate) {
                                Text(
                                    "Sampai: ${Formatters.formatDateIndo(rec.endDate)}",
                                    fontSize = 11.sp,
                                    color = colors.textSecondary
                                )
                            }

                            statutoryInfo?.let { stat ->
                                Text(
                                    "Dasar: ${stat.legalReference} (${stat.wageProtection})",
                                    fontSize = 11.sp,
                                    color = colors.textMuted
                                )
                            }

                            if (rec.reason.isNotBlank() && rec.reason != displayLabel) {
                                Text("Keterangan: ${rec.reason}", fontSize = 12.sp, color = colors.textSecondary)
                            }
                        }

                        IconButton(
                            onClick = { onDeleteLeave(rec.id) },
                            modifier = Modifier.size(48.dp).testTag("delete_leave_button_${rec.id}")
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = "Hapus catatan cuti", tint = colors.error, modifier = Modifier.size(22.dp))
                        }
                    }
                }
            }
        }

        item {
            AdBannerPlaceholder(
                isProUser = isProUser,
                onUpgradeClick = onOpenProDialog
            )
        }

        item {
            LegalDisclaimerCard()
        }
    }

    // Modal Dialog 1: Preset Cuti Bersama SKB 3 Menteri
    if (showCutiBersamaPresetDialog) {
        AlertDialog(
            onDismissRequest = { showCutiBersamaPresetDialog = false },
            containerColor = colors.surfaceCard,
            titleContentColor = colors.textPrimary,
            textContentColor = colors.textPrimary,
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.EventAvailable,
                        contentDescription = null,
                        tint = colors.amber
                    )
                    Text(
                        "Cuti Bersama SKB 3 Menteri",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
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
                            "Daftar Cuti Bersama resmi SKB 3 Menteri. Bagi sektor swasta bersifat fakultatif dan memotong hak cuti tahunan ($totalAnnualQuota hari). Klik untuk langsung mengisi formulir:",
                            fontSize = 11.sp,
                            color = colors.textMuted
                        )
                    }

                    items(cutiBersamaPresets) { preset ->
                        Surface(
                            color = colors.surfaceVariant,
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, colors.outline.copy(alpha = 0.3f)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    selectedCategoryTab = StatutoryLeaveCategory.POTONG_KUOTA
                                    selectedType = "CUTI_BERSAMA"
                                    startDateInput = preset.startDate
                                    endDateInput = preset.endDate
                                    daysCountInput = preset.daysCount.toString()
                                    reasonInput = preset.description
                                    showCutiBersamaPresetDialog = false
                                    Toast.makeText(context, "${preset.name} dipilih!", Toast.LENGTH_SHORT).show()
                                }
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(preset.name, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                    Text("Tanggal: ${preset.dateRange} (${preset.startDate})", fontSize = 12.sp, color = colors.amber)
                                    Text("Potong Kuota: ${preset.daysCount} Hari", fontSize = 11.5.sp, color = colors.textMuted)
                                }
                                Icon(
                                    Icons.Default.AddCircleOutline,
                                    contentDescription = null,
                                    tint = colors.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showCutiBersamaPresetDialog = false }) {
                    Text("Tutup", color = colors.primary, fontWeight = FontWeight.Bold)
                }
            }
        )
    }

    // Modal Dialog 2: Katalog Lengkap Cuti Non-Potong Kuota (Sesuai UU)
    if (showNonQuotaCatalogDialog) {
        val nonQuotaCategories = listOf(
            StatutoryLeaveCategory.SAKIT_KESEHATAN,
            StatutoryLeaveCategory.IBADAH_KEAGAMAAN,
            StatutoryLeaveCategory.TUGAS_NEGARA,
            StatutoryLeaveCategory.DUKA_CITA,
            StatutoryLeaveCategory.PERISTIWA_KELUARGA,
            StatutoryLeaveCategory.REPRODUKSI_BERSALIN
        )

        AlertDialog(
            onDismissRequest = { showNonQuotaCatalogDialog = false },
            containerColor = colors.surfaceCard,
            titleContentColor = colors.textPrimary,
            textContentColor = colors.textPrimary,
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.VerifiedUser,
                        contentDescription = null,
                        tint = colors.teal
                    )
                    Text(
                        "Katalog Cuti Non-Potong Kuota",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                }
            },
            text = {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Surface(
                            color = colors.tealBg.copy(alpha = 0.6f),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    Icons.Default.Gavel,
                                    contentDescription = null,
                                    tint = colors.teal,
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = "Berdasarkan UU No. 13/2003 (jo. UU 6/2023) & UU KIA No. 4/2024, seluruh cuti/izin di bawah ini adalah HAK NORMATIF pekerja, UPAH TETAP DIBAYAR PENUH 100%, dan TIDAK MEMOTONG kuota cuti tahunan ($totalAnnualQuota hari).",
                                    fontSize = 11.5.sp,
                                    color = colors.textPrimary,
                                    lineHeight = 14.sp
                                )
                            }
                        }
                    }

                    nonQuotaCategories.forEach { category ->
                        item {
                            Text(
                                text = category.label.uppercase(),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = colors.teal,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }

                        val itemsInCat = allStatutoryLeaves.filter { it.category == category }
                        items(itemsInCat) { item ->
                            Surface(
                                color = colors.surfaceVariant,
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, colors.outline.copy(alpha = 0.3f)),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        selectedCategoryTab = item.category
                                        selectedType = item.key
                                        daysCountInput = item.defaultDays.toString()
                                        endDateInput = calculateEndDate(startDateInput, item.defaultDays)
                                        reasonInput = item.displayName
                                        showNonQuotaCatalogDialog = false
                                        Toast.makeText(context, "${item.displayName} dipilih!", Toast.LENGTH_SHORT).show()
                                    }
                            ) {
                                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        verticalAlignment = Alignment.Top
                                    ) {
                                        Text(
                                            item.displayName,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = colors.textPrimary,
                                            modifier = Modifier.weight(1f)
                                        )
                                        Surface(
                                            color = colors.tealBg,
                                            shape = RoundedCornerShape(6.dp)
                                        ) {
                                            Text(
                                                "${item.defaultDays} Hari",
                                                fontSize = 11.5.sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = colors.teal,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                    Text(
                                        "Dasar Hukum: ${item.legalReference}",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = colors.primary
                                    )
                                    Text(
                                        item.description,
                                        fontSize = 11.sp,
                                        color = colors.textSecondary,
                                        lineHeight = 13.sp
                                    )
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.Bottom
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.Top, 
                                            horizontalArrangement = Arrangement.spacedBy(3.dp),
                                            modifier = Modifier.weight(1f).padding(end = 8.dp)
                                        ) {
                                            Icon(Icons.Default.AttachMoney, contentDescription = null, tint = colors.success, modifier = Modifier.size(13.dp).padding(top = 1.dp))
                                            Text(
                                                item.wageProtection,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = colors.success,
                                                lineHeight = 13.sp
                                            )
                                        }
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                            Text(
                                                "Pilih Ini",
                                                fontSize = 11.5.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = colors.primary
                                            )
                                            Icon(Icons.Default.ArrowForward, contentDescription = null, tint = colors.primary, modifier = Modifier.size(14.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showNonQuotaCatalogDialog = false }) {
                    Text("Tutup", color = colors.primary, fontWeight = FontWeight.Bold)
                }
            }
        )
    }

    // Native Android Date Picker: Tanggal Mulai
    if (showStartDatePicker) {
        val parsed = runCatching { startDateInput.split("-").map { it.toInt() } }.getOrNull()
        val cal = Calendar.getInstance()
        if (parsed != null && parsed.size == 3) {
            cal.set(parsed[0], parsed[1] - 1, parsed[2])
        }
        android.app.DatePickerDialog(
            context,
            { _, y, m, d ->
                startDateInput = String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d)
                if (endDateInput < startDateInput) {
                    val currentDays = daysCountInput.toIntOrNull() ?: 1
                    endDateInput = calculateEndDate(startDateInput, currentDays)
                } else {
                    daysCountInput = calculateDaysBetween(startDateInput, endDateInput).toString()
                }
                showStartDatePicker = false
            },
            cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)
        ).apply {
            setOnDismissListener { showStartDatePicker = false }
            show()
        }
    }

    // Native Android Date Picker: Tanggal Selesai
    if (showEndDatePicker) {
        val parsed = runCatching { endDateInput.split("-").map { it.toInt() } }.getOrNull()
        val cal = Calendar.getInstance()
        if (parsed != null && parsed.size == 3) {
            cal.set(parsed[0], parsed[1] - 1, parsed[2])
        }
        android.app.DatePickerDialog(
            context,
            { _, y, m, d ->
                endDateInput = String.format(Locale.US, "%04d-%02d-%02d", y, m + 1, d)
                if (endDateInput < startDateInput) {
                    startDateInput = endDateInput
                }
                daysCountInput = calculateDaysBetween(startDateInput, endDateInput).toString()
                showEndDatePicker = false
            },
            cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)
        ).apply {
            setOnDismissListener { showEndDatePicker = false }
            show()
        }
    }
}
