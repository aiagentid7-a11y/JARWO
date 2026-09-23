package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.LeaveRecord
import com.example.data.model.OvertimeLog
import com.example.data.model.UserProfile
import com.example.domain.calculator.IndonesianPayrollCalculators
import com.example.domain.calculator.IndonesianPayrollCalculators.WorkShiftType
import com.example.domain.util.Formatters
import com.example.ui.components.AdBannerPlaceholder
import com.example.ui.components.LegalDisclaimerCard
import com.example.ui.theme.*
import java.util.Calendar

/**
 * Menu Kalender Kerja 1 Tahun Personal ESS:
 * - Menampilkan 12 Bulan dalam 1 Tahun
 * - Penandaan Log Lembur Harian (PP 35/2021)
 * - Penandaan Catatan Cuti (UU KIA 4/2024 & UU 13/2003)
 * - Penandaan Jadwal & Shift Kerja (Pagi, Sore, Malam, Long Shift)
 * - Fitur Input / Ubah Shift Kerja langsung per tanggal
 * - Penandaan Siklus Cut-Off & Tanggal Penggajian
 */
@Composable
fun YearlyCalendarScreen(
    userProfile: UserProfile,
    overtimeLogs: List<OvertimeLog>,
    leaveRecords: List<LeaveRecord>,
    isProUser: Boolean,
    onOpenProDialog: () -> Unit,
    onAddShiftLog: (date: String, shiftType: String, hours: Double, dayType: String, description: String, startTime: String, endTime: String) -> Unit = { _, _, _, _, _, _, _ -> },
    onDeleteLog: (Long) -> Unit = {},
    onNavigateToShiftRoster: () -> Unit = {}
) {
    val colors = GajikuTheme.colors
    val context = LocalContext.current

    // BUG FIX: sebelumnya di-hardcode ke Agustus 2026 (tanggal build), sehingga kalender
    // selalu terbuka di periode tersebut alih-alih bulan/tahun berjalan saat ini.
    var selectedYear by remember { mutableStateOf(Formatters.getCurrentYear()) }
    var selectedMonth by remember { mutableStateOf(Formatters.getCurrentMonth()) } // 1..12
    var selectedDayInfo by remember { mutableStateOf<CalendarDayDetail?>(null) }
    var showShiftAssignDialog by remember { mutableStateOf(false) }
    var shiftDialogDate by remember { mutableStateOf("") }

    val monthNames = arrayOf(
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    )

    // Agregasi Data Lembur, Shift, dan Cuti per Bulan/Tahun
    val totalOtHoursYear = remember(overtimeLogs, selectedYear) {
        overtimeLogs.filter { it.date.startsWith("$selectedYear") }.sumOf { it.hours }
    }
    val totalLeaveDaysYear = remember(leaveRecords, selectedYear) {
        leaveRecords.filter { it.startDate.startsWith("$selectedYear") }.sumOf { it.daysCount }
    }
    val totalShiftsYear = remember(overtimeLogs, selectedYear) {
        overtimeLogs.count { it.date.startsWith("$selectedYear") && it.shiftType != "REGULAR" }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 28.dp)
    ) {
        // 1. Header Kalender 1 Tahun (Primary Summary Tier)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = if (colors.isDark) 0.dp else 4.dp),
                colors = CardDefaults.cardColors(containerColor = colors.primaryCardBg),
                border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.primary.copy(alpha = 0.4f))) else null
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "KALENDER & JADWAL SHIFT KERJA",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 0.8.sp,
                            color = colors.primary
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            IconButton(
                                onClick = { selectedYear-- },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(Icons.Default.ChevronLeft, contentDescription = "Tahun Sebelumnya", tint = colors.textPrimary)
                            }
                            Text(
                                text = "$selectedYear",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textPrimary
                            )
                            IconButton(
                                onClick = { selectedYear++ },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(Icons.Default.ChevronRight, contentDescription = "Tahun Berikutnya", tint = colors.textPrimary)
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Total Jam Lembur $selectedYear", fontSize = 11.sp, color = colors.textSecondary)
                            Text("${totalOtHoursYear} Jam", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = colors.success)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Shift Terjadwal", fontSize = 11.sp, color = colors.textSecondary)
                            Text("$totalShiftsYear Hari", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = colors.indigo)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("Cuti Terpakai", fontSize = 11.sp, color = colors.textSecondary)
                            Text("${totalLeaveDaysYear} Hari", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = colors.primary)
                        }
                    }

                    HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                    // Legend Indikator
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(modifier = Modifier.fillMaxWidth()) {
                            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                                LegendItem(color = colors.indigo, label = "Shift (P/S/M)")
                            }
                            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                                LegendItem(color = colors.teal, label = "Long Shift")
                            }
                            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                                LegendItem(color = colors.success, label = "Lembur")
                            }
                        }
                        Row(modifier = Modifier.fillMaxWidth()) {
                            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                                LegendItem(color = colors.warning, label = "Cuti")
                            }
                            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                                LegendItem(color = colors.primary, label = "Cut-Off / Gaji")
                            }
                            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                                LegendItem(color = colors.error, label = "Hari Libur")
                            }
                        }
                    }
                }
            }
        }

        // 2. Banner Tombol Cepat Atur Shift / Input Shift
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colors.indigoBg),
                border = CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.indigo.copy(alpha = 0.5f)))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Default.Schedule, contentDescription = null, tint = colors.indigo, modifier = Modifier.size(16.dp))
                            Text("Input Jadwal Shift di Kalender", fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = colors.indigo)
                        }
                        Text(
                            text = "Klik tanggal apa saja pada kalender untuk menambah/mengubah jadwal shift (Pagi, Sore, Malam, Long Shift).",
                            fontSize = 11.sp,
                            color = colors.textSecondary,
                            lineHeight = 16.sp,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                    Button(
                        onClick = {
                            val today = String.format("%04d-%02d-%02d", selectedYear, selectedMonth, 1)
                            shiftDialogDate = today
                            showShiftAssignDialog = true
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = colors.indigo),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Input Shift", fontSize = 11.5.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // 3. Tab Pemilih 12 Bulan
        item {
            ScrollableMonthSelector(
                selectedMonth = selectedMonth,
                monthNames = monthNames,
                onMonthSelected = { selectedMonth = it }
            )
        }

        // 4. Grid Kalender Bulan Terpilih
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "${monthNames[selectedMonth - 1]} $selectedYear",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textPrimary
                        )
                        Text(
                            text = "Ketuk tanggal untuk detail / input shift",
                            fontSize = 10.5.sp,
                            color = colors.textMuted
                        )
                    }

                    // Header Hari (Sen, Sel, Rab, Kam, Jum, Sab, Min)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                        val dayNames = listOf("Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min")
                        dayNames.forEachIndexed { idx, day ->
                            Text(
                                text = day,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (idx >= 5) colors.error else colors.textMuted,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    MonthCalendarGrid(
                        year = selectedYear,
                        month = selectedMonth,
                        overtimeLogs = overtimeLogs,
                        leaveRecords = leaveRecords,
                        onDayClick = { dayInfo ->
                            selectedDayInfo = dayInfo
                        }
                    )
                }
            }
        }

        // 5. Detail Tanggal yang Diklik (Rincian & Aksi Cepat Shift)
        if (selectedDayInfo != null) {
            item {
                val info = selectedDayInfo!!
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = colors.surfaceVariant),
                    border = CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.primary))
                ) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Default.Event, contentDescription = null, tint = colors.primary, modifier = Modifier.size(18.dp))
                                Text(
                                    text = "Rincian Tanggal: ${info.dateStr}",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.textPrimary
                                )
                            }
                            IconButton(onClick = { selectedDayInfo = null }, modifier = Modifier.size(22.dp)) {
                                Icon(Icons.Default.Close, contentDescription = "Tutup", tint = colors.textMuted)
                            }
                        }

                        // Info Shift Kerja
                        if (info.shiftType != null && info.shiftType != "REGULAR") {
                            val shiftEnum = WorkShiftType.fromKey(info.shiftType)
                            val shiftBadgeColor = when (info.shiftType) {
                                "LONG_SHIFT" -> colors.teal
                                "SHIFT_MALAM" -> colors.indigo
                                "SHIFT_SORE" -> colors.lilac
                                else -> colors.primary
                            }
                            Surface(
                                color = shiftBadgeColor.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(10.dp),
                                border = CardDefaults.outlinedCardBorder().copy(brush = SolidColor(shiftBadgeColor.copy(alpha = 0.4f)))
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text("Jadwal: ${shiftEnum.displayName}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = shiftBadgeColor)
                                        Text("Waktu: ${if (info.shiftStartTime.isNotBlank()) "${info.shiftStartTime} - ${info.shiftEndTime}" else shiftEnum.defaultTimeRange}", fontSize = 11.sp, color = colors.textSecondary)
                                    }
                                    if (info.logId != null) {
                                        IconButton(
                                            onClick = {
                                                onDeleteLog(info.logId)
                                                selectedDayInfo = null
                                                Toast.makeText(context, "Jadwal shift berhasil dihapus", Toast.LENGTH_SHORT).show()
                                            },
                                            modifier = Modifier.size(28.dp)
                                        ) {
                                            Icon(Icons.Default.Delete, contentDescription = "Hapus Shift", tint = colors.error, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                }
                            }
                        }

                        if (info.overtimeHours > 0) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Surface(color = colors.success, shape = CircleShape, modifier = Modifier.size(8.dp)) {}
                                Text("Lembur: ${info.overtimeHours} Jam (${info.overtimeNote.ifBlank { "Lembur Harian" }})", fontSize = 11.5.sp, color = colors.textPrimary)
                            }
                        }

                        if (info.leaveType != null) {
                            val statutory = com.example.domain.calculator.IndonesianPayrollCalculators.findStatutoryLeave(info.leaveType)
                            val isNonPotong = statutory?.isQuotaDeductible == false
                            val leaveLabel = statutory?.displayName ?: info.leaveType
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Surface(color = if (isNonPotong) colors.teal else colors.warning, shape = CircleShape, modifier = Modifier.size(8.dp)) {}
                                    Text("Cuti: $leaveLabel", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                }
                                Surface(
                                    color = if (isNonPotong) colors.tealBg else colors.amberBg,
                                    shape = RoundedCornerShape(4.dp),
                                    modifier = Modifier.padding(start = 14.dp)
                                ) {
                                    Text(
                                        text = if (isNonPotong) "🛡️ Non-Potong Kuota (${statutory?.legalReference ?: "UU"})" else "⚠️ Potong Jatah Kuota 12 Hari",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isNonPotong) colors.teal else colors.amber,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                                if (info.leaveReason.isNotBlank() && info.leaveReason != leaveLabel) {
                                    Text("Alasan: ${info.leaveReason}", fontSize = 10.5.sp, color = colors.textSecondary, modifier = Modifier.padding(start = 14.dp))
                                }
                            }
                        }

                        if (info.dayOfMonth == 25) {
                            Text("ℹ Cut-Off Payroll Periode Bulanan", fontSize = 10.5.sp, color = colors.primary, fontWeight = FontWeight.Medium)
                        } else if (info.dayOfMonth == 28 || (info.dayOfMonth == 1 && selectedMonth > 1)) {
                            Text("💰 Estimasi Tanggal Transfer Gaji", fontSize = 10.5.sp, color = colors.success, fontWeight = FontWeight.Bold)
                        }

                        // Tombol Aksi Langsung: Atur Shift di Tanggal Ini
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = {
                                    shiftDialogDate = info.dateStr
                                    showShiftAssignDialog = true
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = colors.indigo),
                                contentPadding = PaddingValues(vertical = 8.dp)
                            ) {
                                Icon(Icons.Default.EditCalendar, contentDescription = null, modifier = Modifier.size(15.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    text = if (info.shiftType != null && info.shiftType != "REGULAR") "Ubah Shift Tanggal Ini" else "+ Set Shift di Tanggal Ini",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }

        // 6. Ad Banner & Disclaimer Footer
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

    // Modal Dialog: Input Jadwal Shift pada Tanggal Tertentu
    if (showShiftAssignDialog) {
        ShiftAssignDialog(
            initialDate = shiftDialogDate,
            userProfile = userProfile,
            onDismiss = { showShiftAssignDialog = false },
            onSaveShift = { date, shiftType, hours, dayType, note, start, end ->
                onAddShiftLog(date, shiftType, hours, dayType, note, start, end)
                showShiftAssignDialog = false
                selectedDayInfo = null
                Toast.makeText(context, "Jadwal shift $date ($shiftType) berhasil disimpan!", Toast.LENGTH_SHORT).show()
            }
        )
    }
}

/**
 * Dialog Input / Penugasan Shift Kerja pada Tanggal Kalender
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ShiftAssignDialog(
    initialDate: String,
    userProfile: UserProfile,
    onDismiss: () -> Unit,
    onSaveShift: (date: String, shiftType: String, hours: Double, dayType: String, note: String, startTime: String, endTime: String) -> Unit
) {
    val colors = GajikuTheme.colors
    var dateInput by remember { mutableStateOf(initialDate) }
    var selectedShift by remember { mutableStateOf(WorkShiftType.SHIFT_PAGI) }
    var dayTypeInput by remember { mutableStateOf("WORKDAY") }
    var noteInput by remember { mutableStateOf("") }
    var startTimeInput by remember { mutableStateOf(selectedShift.defaultTimeRange.split(" - ").firstOrNull() ?: "07:00") }
    var endTimeInput by remember { mutableStateOf(selectedShift.defaultTimeRange.split(" - ").lastOrNull() ?: "15:00") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Schedule, contentDescription = null, tint = colors.indigo)
                Text("Input Jadwal Shift Kerja", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text("Tetapkan tipe shift untuk tanggal terpilih di bawah ini:", fontSize = 11.5.sp, color = colors.textSecondary)

                // Input Tanggal
                OutlinedTextField(
                    value = dateInput,
                    onValueChange = { dateInput = it },
                    label = { Text("Tanggal (YYYY-MM-DD)", fontSize = 11.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = com.example.ui.components.highContrastTextFieldColors()
                )

                Text("Pilih Jenis Shift:", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)

                // Pilihan Jenis Shift
                val shifts = listOf(
                    WorkShiftType.SHIFT_PAGI,
                    WorkShiftType.SHIFT_SORE,
                    WorkShiftType.SHIFT_MALAM,
                    WorkShiftType.LONG_SHIFT,
                    WorkShiftType.REGULAR
                )

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    shifts.forEach { shift ->
                        val isSelected = selectedShift == shift
                        Surface(
                            color = if (isSelected) colors.indigo.copy(alpha = 0.15f) else colors.surfaceVariant,
                            shape = RoundedCornerShape(10.dp),
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = SolidColor(if (isSelected) colors.indigo else colors.outline.copy(alpha = 0.3f))
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    selectedShift = shift
                                    val parts = shift.defaultTimeRange.split(" - ")
                                    if (parts.size == 2) {
                                        startTimeInput = parts[0].trim()
                                        endTimeInput = parts[1].trim()
                                    }
                                }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text(shift.displayName, fontSize = 11.5.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium, color = colors.textPrimary)
                                    Text(shift.defaultTimeRange, fontSize = 10.sp, color = colors.textSecondary)
                                }
                                RadioButton(
                                    selected = isSelected,
                                    onClick = {
                                        selectedShift = shift
                                        val parts = shift.defaultTimeRange.split(" - ")
                                        if (parts.size == 2) {
                                            startTimeInput = parts[0].trim()
                                            endTimeInput = parts[1].trim()
                                        }
                                    },
                                    colors = RadioButtonDefaults.colors(selectedColor = colors.indigo)
                                )
                            }
                        }
                    }
                }

                // Input Catatan
                OutlinedTextField(
                    value = noteInput,
                    onValueChange = { noteInput = it },
                    label = { Text("Catatan Shift / Lokasi / Regu", fontSize = 11.sp) },
                    placeholder = { Text("Contoh: Regu A - Plant 1", fontSize = 11.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = com.example.ui.components.highContrastTextFieldColors()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val hours = if (selectedShift == WorkShiftType.LONG_SHIFT) 4.0 else 0.0
                    val note = if (noteInput.isNotBlank()) noteInput else selectedShift.displayName
                    onSaveShift(
                        dateInput,
                        selectedShift.key,
                        hours,
                        dayTypeInput,
                        note,
                        startTimeInput,
                        endTimeInput
                    )
                },
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = colors.indigo)
            ) {
                Text("Simpan Shift", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Batal", color = colors.textMuted)
            }
        }
    )
}

data class CalendarDayDetail(
    val dateStr: String,
    val dayOfMonth: Int,
    val logId: Long? = null,
    val overtimeHours: Double = 0.0,
    val overtimeNote: String = "",
    val shiftType: String? = null,
    val shiftStartTime: String = "",
    val shiftEndTime: String = "",
    val leaveType: String? = null,
    val leaveReason: String = ""
)

@Composable
private fun LegendItem(color: Color, label: String, modifier: Modifier = Modifier) {
    val colors = GajikuTheme.colors
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = modifier) {
        Surface(color = color, shape = CircleShape, modifier = Modifier.size(8.dp)) {}
        Text(label, fontSize = 9.sp, color = colors.textMuted, lineHeight = 11.sp)
    }
}

@Composable
private fun ScrollableMonthSelector(
    selectedMonth: Int,
    monthNames: Array<String>,
    onMonthSelected: (Int) -> Unit
) {
    val colors = GajikuTheme.colors
    LazyVerticalGrid(
        columns = GridCells.Fixed(4),
        modifier = Modifier
            .fillMaxWidth()
            .height(115.dp)
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        items(12) { index ->
                val monthIndex = index + 1
                val isSelected = selectedMonth == monthIndex
                Surface(
                    color = if (isSelected) colors.primaryContainer else colors.inactiveChipBg,
                    shape = RoundedCornerShape(10.dp),
                    border = CardDefaults.outlinedCardBorder().copy(
                        brush = SolidColor(
                            if (isSelected) colors.primary else colors.inactiveChipBorder
                        )
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onMonthSelected(monthIndex) }
                ) {
                    Text(
                        text = monthNames[index].take(3),
                        fontSize = 11.5.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) colors.onPrimaryContainer else colors.inactiveChipText,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                }
            }
        }
}

@Composable
private fun MonthCalendarGrid(
    year: Int,
    month: Int,
    overtimeLogs: List<OvertimeLog>,
    leaveRecords: List<LeaveRecord>,
    onDayClick: (CalendarDayDetail) -> Unit
) {
    val colors = GajikuTheme.colors
    val cal = Calendar.getInstance().apply {
        set(Calendar.YEAR, year)
        set(Calendar.MONTH, month - 1)
        set(Calendar.DAY_OF_MONTH, 1)
    }

    val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
    val firstDayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
    val offset = (firstDayOfWeek + 5) % 7

    val monthPrefix = String.format("%04d-%02d", year, month)
    val monthOts = overtimeLogs.filter { it.date.startsWith(monthPrefix) }
    val monthLeaves = leaveRecords.filter { it.startDate.startsWith(monthPrefix) || it.endDate.startsWith(monthPrefix) }

    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        var currentDay = 1
        val totalCells = offset + daysInMonth
        val rows = (totalCells + 6) / 7

        for (r in 0 until rows) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                for (c in 0..6) {
                    val cellIndex = r * 7 + c
                    if (cellIndex < offset || currentDay > daysInMonth) {
                        Spacer(modifier = Modifier.weight(1f).aspectRatio(1f))
                    } else {
                        val day = currentDay
                        val dateFormatted = String.format("%04d-%02d-%02d", year, month, day)
                        val isWeekend = c >= 5

                        val otForDay = monthOts.filter { it.date == dateFormatted }
                        val otHours = otForDay.sumOf { it.hours }
                        val otNote = otForDay.joinToString { it.taskDescription }
                        val shiftLog = otForDay.firstOrNull { it.shiftType != "REGULAR" }
                        val shiftType = shiftLog?.shiftType ?: if (otForDay.isNotEmpty()) otForDay.first().shiftType else null
                        val primaryLogId = shiftLog?.id ?: otForDay.firstOrNull()?.id

                        val leaveForDay = monthLeaves.firstOrNull { l ->
                            dateFormatted >= l.startDate && dateFormatted <= l.endDate
                        }

                        val isPayrollCutoff = day == 25
                        val isPayday = day == 28

                        val isShiftPresent = shiftType != null && shiftType != "REGULAR"

                        val cellBg = when {
                            shiftType == "LONG_SHIFT" -> colors.tealBg
                            shiftType == "SHIFT_MALAM" -> colors.indigoBg
                            shiftType == "SHIFT_SORE" -> colors.lilacBg
                            shiftType == "SHIFT_PAGI" -> colors.indigoBg
                            otHours > 0 -> colors.emeraldBg
                            leaveForDay != null -> colors.amberBg
                            isPayrollCutoff || isPayday -> colors.purpleBg
                            isWeekend -> colors.roseBg
                            else -> colors.surfaceVariant
                        }

                        val cellBorder = when {
                            shiftType == "LONG_SHIFT" -> colors.teal
                            isShiftPresent -> colors.indigo
                            otHours > 0 -> colors.success
                            leaveForDay != null -> colors.warning
                            isPayrollCutoff || isPayday -> colors.primary
                            else -> Color.Transparent
                        }

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .aspectRatio(1f)
                                .padding(2.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(cellBg)
                                .border(
                                    width = 1.dp,
                                    color = cellBorder,
                                    shape = RoundedCornerShape(8.dp)
                                )
                                .clickable {
                                    onDayClick(
                                        CalendarDayDetail(
                                            dateStr = dateFormatted,
                                            dayOfMonth = day,
                                            logId = primaryLogId,
                                            overtimeHours = otHours,
                                            overtimeNote = otNote,
                                            shiftType = shiftType,
                                            shiftStartTime = shiftLog?.startTime ?: "",
                                            shiftEndTime = shiftLog?.endTime ?: "",
                                            leaveType = leaveForDay?.leaveType,
                                            leaveReason = leaveForDay?.reason ?: ""
                                        )
                                    )
                                },
                            contentAlignment = Alignment.TopCenter
                        ) {
                            Column(
                                modifier = Modifier.fillMaxSize().padding(top = 6.dp, bottom = 4.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "$day",
                                    fontSize = 11.sp,
                                    fontWeight = if (isShiftPresent || otHours > 0 || leaveForDay != null) FontWeight.Bold else FontWeight.Normal,
                                    color = when {
                                        shiftType == "LONG_SHIFT" -> colors.teal
                                        isShiftPresent -> colors.indigo
                                        otHours > 0 -> colors.success
                                        leaveForDay != null -> colors.warning
                                        isWeekend -> colors.error
                                        else -> colors.textPrimary
                                    }
                                )
                                if (shiftType == "LONG_SHIFT") {
                                    Text("Long", fontSize = 7.sp, fontWeight = FontWeight.Bold, color = colors.teal)
                                } else if (shiftType == "SHIFT_PAGI") {
                                    Text("Pagi", fontSize = 7.sp, fontWeight = FontWeight.Bold, color = colors.indigo)
                                } else if (shiftType == "SHIFT_SORE") {
                                    Text("Sore", fontSize = 7.sp, fontWeight = FontWeight.Bold, color = colors.lilac)
                                } else if (shiftType == "SHIFT_MALAM") {
                                    Text("Mlm", fontSize = 7.sp, fontWeight = FontWeight.Bold, color = colors.indigo)
                                } else if (otHours > 0) {
                                    Text("${otHours}j", fontSize = 7.5.sp, fontWeight = FontWeight.Bold, color = colors.success)
                                } else if (leaveForDay != null) {
                                    Text("Cuti", fontSize = 7.5.sp, fontWeight = FontWeight.Bold, color = colors.warning)
                                } else if (isPayrollCutoff) {
                                    Text("Cut", fontSize = 7.5.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                } else if (isPayday) {
                                    Text("Gaji", fontSize = 7.5.sp, fontWeight = FontWeight.Bold, color = colors.success)
                                }
                            }
                        }
                        currentDay++
                    }
                }
            }
        }
    }
}
