package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.OvertimeLog
import com.example.data.model.UserProfile
import com.example.domain.calculator.IndonesianPayrollCalculators
import com.example.domain.util.Formatters
import com.example.ui.components.AdBannerPlaceholder
import com.example.ui.components.LegalDisclaimerCard
import com.example.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

@Composable
fun OvertimeTrackerScreen(
    userProfile: UserProfile,
    isProUser: Boolean,
    overtimeLogs: List<OvertimeLog>,
    onAddLog: (
        date: String,
        hours: Double,
        dayType: String,
        description: String,
        shiftType: String,
        ritaseCount: Int,
        ritaseRate: Double,
        hmStart: Double,
        hmEnd: Double,
        hmTotal: Double,
        unitCode: String,
        materialType: String
    ) -> Unit,
    onDeleteLog: (Long) -> Unit,
    onOpenProDialog: () -> Unit,
    onNavigateToCalendar: () -> Unit = {}
) {
    val colors = GajikuTheme.colors
    var dateInput by remember { mutableStateOf(Formatters.getCurrentDateStr()) }
    var hoursInput by remember { mutableStateOf("") }
    var dayTypeInput by remember { mutableStateOf("WORKDAY") }
    var shiftTypeInput by remember { mutableStateOf(userProfile.defaultShiftType) }
    var noteInput by remember { mutableStateOf("") }

    // State untuk Kalender Pemilih Tanggal Lembur
    var isCalendarExpanded by remember { mutableStateOf(true) }
    var showManualDateInput by remember { mutableStateOf(false) }

    val initialCalYearMonth = remember(dateInput) {
        try {
            val parts = dateInput.split("-")
            if (parts.size >= 2) Pair(parts[0].toInt(), parts[1].toInt())
            else Pair(Formatters.getCurrentYear(), Formatters.getCurrentMonth())
        } catch (e: Exception) {
            Pair(Formatters.getCurrentYear(), Formatters.getCurrentMonth())
        }
    }
    var calYear by remember { mutableStateOf(initialCalYearMonth.first) }
    var calMonth by remember { mutableStateOf(initialCalYearMonth.second) }

    // Sektor Tambang & Logistik: Unit, Ritase, HM (Hour Meter)
    var isFleetModeExpanded by remember {
        mutableStateOf(userProfile.ritasePay > 0 || userProfile.hmPay > 0 || overtimeLogs.any { it.ritaseCount > 0 || it.hmTotal > 0 })
    }
    var unitCodeInput by remember { mutableStateOf("") }
    var materialTypeInput by remember { mutableStateOf("") }
    var ritaseCountInput by remember { mutableStateOf("") }
    var ritaseRateInput by remember {
        mutableStateOf(if (userProfile.ritasePay > 0) userProfile.ritasePay.toLong().toString() else "")
    }
    var hmStartInput by remember { mutableStateOf("") }
    var hmEndInput by remember { mutableStateOf("") }

    val totalFixedSalary = userProfile.totalFixedSalary
    val hourlyRate = IndonesianPayrollCalculators.calculateHourlyRate(totalFixedSalary)

    val currentHours = hoursInput.toDoubleOrNull() ?: 0.0
    val previewResult = IndonesianPayrollCalculators.calculateOvertime(
        hours = currentHours,
        totalFixedSalary = totalFixedSalary,
        dayType = dayTypeInput
    )

    // Perhitungan Ritase & HM input
    val currentRitase = ritaseCountInput.toIntOrNull() ?: 0
    val currentRitaseRate = ritaseRateInput.toDoubleOrNull() ?: 0.0
    val estimatedRitaseBonus = currentRitase * currentRitaseRate

    val currentHmStart = hmStartInput.toDoubleOrNull() ?: 0.0
    val currentHmEnd = hmEndInput.toDoubleOrNull() ?: 0.0
    val calculatedHmDiff = if (currentHmEnd > currentHmStart && currentHmStart > 0.0) {
        val diff = currentHmEnd - currentHmStart
        String.format(java.util.Locale.US, "%.1f", diff).toDoubleOrNull() ?: diff
    } else 0.0

    // Agregat Total
    val totalHoursAll = remember(overtimeLogs) { overtimeLogs.sumOf { it.hours } }
    val totalAmountAll = remember(overtimeLogs) { overtimeLogs.sumOf { it.totalAmount } }
    val totalRitaseAll = remember(overtimeLogs) { overtimeLogs.sumOf { it.ritaseCount } }
    val totalHmAll = remember(overtimeLogs) { overtimeLogs.sumOf { it.hmTotal } }
    val totalRitaseBonusAll = remember(overtimeLogs) { overtimeLogs.sumOf { it.ritaseCount * it.ritaseRate } }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 28.dp)
    ) {
        // 1. Summary Hero Card (Primary Summary Tier - Elevated with soft shadow)
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
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "TOTAL UPAH LEMBUR TERCATAT",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 0.8.sp,
                            color = colors.primary
                        )
                        Surface(
                            color = colors.primaryContainer.copy(alpha = 0.6f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                "${overtimeLogs.size} Log Tercatat",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.onPrimaryContainer,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    Text(
                        text = Formatters.formatRupiah(totalAmountAll),
                        fontSize = 28.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = colors.success
                    )

                    HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Total Jam: ${totalHoursAll} Jam", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                        Text("Upah Sejam: ${Formatters.formatRupiahDecimals(hourlyRate)}", fontSize = 10.5.sp, color = colors.textMuted)
                    }

                    // Tampilan Ringkasan Khusus Ritase & HM jika ada data
                    if (totalRitaseAll > 0 || totalHmAll > 0.0) {
                        Surface(
                            color = colors.surfaceVariant,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp).fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (totalRitaseAll > 0) {
                                    Column {
                                        Text("Total Ritase", fontSize = 9.5.sp, color = colors.textSecondary)
                                        Text("$totalRitaseAll Rit", fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                        if (totalRitaseBonusAll > 0) {
                                            Text(Formatters.formatRupiah(totalRitaseBonusAll), fontSize = 9.sp, color = colors.success, fontWeight = FontWeight.SemiBold)
                                        }
                                    }
                                }
                                if (totalHmAll > 0.0) {
                                    Column(horizontalAlignment = if (totalRitaseAll > 0) Alignment.End else Alignment.Start) {
                                        Text("Total HM (Hour Meter)", fontSize = 9.5.sp, color = colors.textSecondary)
                                        Text("${String.format(java.util.Locale.US, "%.1f", totalHmAll)} HM", fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = colors.indigo)
                                        Text("Alat Berat / Fleet", fontSize = 9.sp, color = colors.textMuted)
                                    }
                                }
                            }
                        }
                    }

                    if (totalHoursAll > 18.0) {
                        Surface(
                            color = colors.roseBg,
                            shape = RoundedCornerShape(10.dp),
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = SolidColor(colors.error.copy(alpha = 0.4f))
                            ),
                            modifier = Modifier.fillMaxWidth().padding(top = 4.dp)
                        ) {
                            Text(
                                text = "⚠ Peringatan: Total lembur telah melebihi batas regulasi 18 jam/minggu (PP 35/2021 Pasal 26).",
                                fontSize = 10.5.sp,
                                color = colors.error,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.padding(10.dp),
                                lineHeight = 14.sp
                            )
                        }
                    }
                }
            }
        }

        // 2. Input Form Card (Secondary Tier)
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
                        title = "CATAT LEMBUR, RITASE & PRESENSI SHIFT",
                        infoTitle = "Pencatatan Lembur, Ritase & HM",
                        infoBody = "1) Pilih jenis shift yang Anda jalani.\n" +
                            "2) Masukkan tanggal & durasi jam lembur.\n" +
                            "3) Sektor Tambang/Logistik: Buka bagian Ritase & HM untuk mencatat nomor lambung unit, jumlah ritase, dan HM (Hour Meter) awal-akhir alat berat.\n" +
                            "4) Pilih jenis hari (PP 35/2021).\n\n" +
                            "Semua log tersimpan otomatis dan terintegrasi ke Kalkulator Gaji."
                    )

                    // Shift Type Selector
                    Text("Pilihan Shift / Jam Kerja:", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = colors.textSecondary)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(
                            "REGULAR" to "Regular",
                            "SHIFT_PAGI" to "Pagi",
                            "SHIFT_SORE" to "Sore",
                            "SHIFT_MALAM" to "Malam",
                            "LONG_SHIFT" to "Long (12j)"
                        ).forEach { (type, label) ->
                            val isSelected = shiftTypeInput == type
                            Surface(
                                color = if (isSelected) colors.primaryContainer else colors.inactiveChipBg,
                                shape = RoundedCornerShape(8.dp),
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = SolidColor(if (isSelected) colors.primary else colors.inactiveChipBorder)
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable {
                                        shiftTypeInput = type
                                        if (type == "LONG_SHIFT") {
                                            hoursInput = "4.0"
                                            if (noteInput.isBlank()) noteInput = "Long Shift 12 Jam (4 Jam Lembur)"
                                        } else if (type == "SHIFT_MALAM") {
                                            if (noteInput.isBlank()) noteInput = "Shift Malam 3 (23:00 - 07:00)"
                                        }
                                    }
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 10.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) colors.onPrimaryContainer else colors.inactiveChipText,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 6.dp)
                                )
                            }
                        }
                    }

                    // 1. Interactive Calendar Date Picker Section (Tampilan Kalender Pemilih Tanggal)
                    Surface(
                        color = colors.surfaceVariant,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, colors.outline.copy(alpha = 0.35f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // Header: Tanggal Terpilih & Toggle Buka/Tutup Kalender
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { isCalendarExpanded = !isCalendarExpanded },
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Surface(
                                        color = colors.primary.copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.size(38.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(
                                                Icons.Default.CalendarMonth,
                                                contentDescription = null,
                                                tint = colors.primary,
                                                modifier = Modifier.size(22.dp)
                                            )
                                        }
                                    }
                                    Column {
                                        Text(
                                            text = "TANGGAL LEMBUR",
                                            fontSize = 9.5.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            letterSpacing = 0.5.sp,
                                            color = colors.primary
                                        )
                                        Text(
                                            text = Formatters.formatDateWithDayIndo(dateInput),
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = colors.textPrimary
                                        )
                                    }
                                }
                                IconButton(
                                    onClick = { isCalendarExpanded = !isCalendarExpanded },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(
                                        imageVector = if (isCalendarExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                        contentDescription = if (isCalendarExpanded) "Tutup Kalender" else "Buka Kalender",
                                        tint = colors.primary
                                    )
                                }
                            }

                            // Quick Date Selector Pills (Hari Ini, Kemarin, H-2, Edit Teks)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                val todayStr = Formatters.getCurrentDateStr()
                                val yesterdayStr = remember { getYesterdayDateStr() }
                                val twoDaysAgoStr = remember { getDaysAgoDateStr(2) }

                                val shortcuts = listOf(
                                    "Hari Ini" to todayStr,
                                    "Kemarin" to yesterdayStr,
                                    "H-2" to twoDaysAgoStr
                                )

                                shortcuts.forEach { (label, dt) ->
                                    val isSelected = dateInput == dt
                                    Surface(
                                        color = if (isSelected) colors.primaryContainer else colors.surface,
                                        shape = RoundedCornerShape(8.dp),
                                        border = BorderStroke(
                                            1.dp,
                                            if (isSelected) colors.primary else colors.outline.copy(alpha = 0.3f)
                                        ),
                                        modifier = Modifier
                                            .weight(1f)
                                            .clickable {
                                                dateInput = dt
                                                try {
                                                    val p = dt.split("-")
                                                    calYear = p[0].toInt()
                                                    calMonth = p[1].toInt()
                                                } catch (_: Exception) {}
                                            }
                                    ) {
                                        Text(
                                            text = label,
                                            fontSize = 10.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isSelected) colors.onPrimaryContainer else colors.textPrimary,
                                            textAlign = TextAlign.Center,
                                            modifier = Modifier.padding(vertical = 6.dp)
                                        )
                                    }
                                }

                                Surface(
                                    color = if (showManualDateInput) colors.indigoBg else colors.surface,
                                    shape = RoundedCornerShape(8.dp),
                                    border = BorderStroke(1.dp, if (showManualDateInput) colors.indigo else colors.outline.copy(alpha = 0.3f)),
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { showManualDateInput = !showManualDateInput }
                                ) {
                                    Text(
                                        text = if (showManualDateInput) "Tutup Teks" else "Edit Manual",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = if (showManualDateInput) colors.indigo else colors.textSecondary,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.padding(vertical = 6.dp)
                                    )
                                }
                            }

                            // Kalender Bulanan Interaktif (Grid Kalender)
                            AnimatedVisibility(visible = isCalendarExpanded) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 4.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    HorizontalDivider(color = colors.outline.copy(alpha = 0.2f), thickness = 0.8.dp)

                                    // Bar Navigasi Bulan & Tahun
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        IconButton(
                                            onClick = {
                                                if (calMonth == 1) {
                                                    calMonth = 12
                                                    calYear -= 1
                                                } else {
                                                    calMonth -= 1
                                                }
                                            },
                                            modifier = Modifier.size(30.dp)
                                        ) {
                                            Icon(
                                                Icons.Default.ChevronLeft,
                                                contentDescription = "Bulan Sebelumnya",
                                                tint = colors.primary,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }

                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            Text(
                                                text = "${Formatters.getMonthName(calMonth)} $calYear",
                                                fontSize = 13.5.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = colors.textPrimary
                                            )
                                            if (calYear != Formatters.getCurrentYear() || calMonth != Formatters.getCurrentMonth()) {
                                                Surface(
                                                    color = colors.primary.copy(alpha = 0.12f),
                                                    shape = RoundedCornerShape(6.dp),
                                                    modifier = Modifier.clickable {
                                                        calYear = Formatters.getCurrentYear()
                                                        calMonth = Formatters.getCurrentMonth()
                                                    }
                                                ) {
                                                    Text(
                                                        text = "Bulan Ini",
                                                        fontSize = 9.sp,
                                                        color = colors.primary,
                                                        fontWeight = FontWeight.Bold,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                    )
                                                }
                                            }
                                        }

                                        IconButton(
                                            onClick = {
                                                if (calMonth == 12) {
                                                    calMonth = 1
                                                    calYear += 1
                                                } else {
                                                    calMonth += 1
                                                }
                                            },
                                            modifier = Modifier.size(30.dp)
                                        ) {
                                            Icon(
                                                Icons.Default.ChevronRight,
                                                contentDescription = "Bulan Berikutnya",
                                                tint = colors.primary,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    }

                                    // Header Nama Hari (Sen - Min)
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceAround
                                    ) {
                                        val dayNames = listOf("Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min")
                                        dayNames.forEachIndexed { idx, dName ->
                                            Text(
                                                text = dName,
                                                fontSize = 10.5.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (idx >= 5) colors.error else colors.textMuted,
                                                textAlign = TextAlign.Center,
                                                modifier = Modifier.weight(1f)
                                            )
                                        }
                                    }

                                    // Grid Kalender Bulan
                                    OvertimeMiniMonthGrid(
                                        year = calYear,
                                        month = calMonth,
                                        selectedDate = dateInput,
                                        overtimeLogs = overtimeLogs,
                                        onSelectDate = { selectedDt ->
                                            dateInput = selectedDt
                                            val dayOfWeek = getDayOfWeek(selectedDt)
                                            if (dayOfWeek == Calendar.SUNDAY || dayOfWeek == Calendar.SATURDAY) {
                                                if (dayTypeInput == "WORKDAY") {
                                                    dayTypeInput = "HOLIDAY_5_DAYS"
                                                }
                                            }
                                        }
                                    )
                                }
                            }

                            // Input Teks Manual jika pengguna ingin mengetik langsung
                            AnimatedVisibility(visible = showManualDateInput) {
                                OutlinedTextField(
                                    value = dateInput,
                                    onValueChange = { dateInput = it },
                                    label = { Text("Format Tanggal Manual (YYYY-MM-DD)", fontSize = 11.sp) },
                                    placeholder = { Text("mis. 2026-08-27", fontSize = 10.sp) },
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = com.example.ui.components.highContrastTextFieldColors()
                                )
                            }
                        }
                    }

                    // Durasi Lembur (Jam) Input & Quick Increment Chips
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Durasi Lembur (Jam Kerja Tambahan):", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = colors.textSecondary)
                            if (currentHours > 0) {
                                Text(
                                    "Upah: ${Formatters.formatRupiah(previewResult.totalAmount)}",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.success
                                )
                            }
                        }

                        OutlinedTextField(
                            value = hoursInput,
                            onValueChange = { hoursInput = it },
                            label = { Text("Durasi Lembur (Jam)", fontSize = 11.sp) },
                            placeholder = { Text("mis. 2.0 atau 4.0", fontSize = 10.sp) },
                            supportingText = { Text("Di luar jam kerja normal 7/8 jam.", fontSize = 9.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.fillMaxWidth().testTag("overtime_hours_tracker_input"),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )

                        // Quick Hour Presets
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            listOf(
                                "1 Jam" to "1.0",
                                "2 Jam" to "2.0",
                                "3 Jam" to "3.0",
                                "4 Jam" to "4.0",
                                "8 Jam (Libur)" to "8.0"
                            ).forEach { (label, hrVal) ->
                                val isCurrent = hoursInput == hrVal
                                Surface(
                                    color = if (isCurrent) colors.primaryContainer else colors.surfaceVariant,
                                    shape = RoundedCornerShape(6.dp),
                                    border = BorderStroke(1.dp, if (isCurrent) colors.primary else colors.outline.copy(alpha = 0.25f)),
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { hoursInput = hrVal }
                                ) {
                                    Text(
                                        text = label,
                                        fontSize = 9.5.sp,
                                        fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isCurrent) colors.onPrimaryContainer else colors.textPrimary,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.padding(vertical = 5.dp)
                                    )
                                }
                            }
                        }
                    }

                    // Section Catat Ritase, HM & Unit (Sektor Tambang / Logistik / Alat Berat)
                    Surface(
                        color = if (isFleetModeExpanded) colors.primaryContainer.copy(alpha = 0.35f) else colors.surfaceVariant,
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, if (isFleetModeExpanded) colors.primary.copy(alpha = 0.5f) else colors.outline.copy(alpha = 0.25f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { isFleetModeExpanded = !isFleetModeExpanded },
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        Icons.Default.LocalShipping,
                                        contentDescription = null,
                                        tint = colors.primary,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Column {
                                        Text(
                                            "Catat Ritase & HM (Hour Meter)",
                                            fontSize = 11.5.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = colors.primary
                                        )
                                        Text(
                                            "Khusus Tambang, Hauling, Driver & Alat Berat",
                                            fontSize = 9.sp,
                                            color = colors.textSecondary
                                        )
                                    }
                                }
                                IconButton(
                                    onClick = { isFleetModeExpanded = !isFleetModeExpanded },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        imageVector = if (isFleetModeExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                        contentDescription = if (isFleetModeExpanded) "Tutup" else "Buka",
                                        tint = colors.primary
                                    )
                                }
                            }

                            AnimatedVisibility(visible = isFleetModeExpanded) {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    HorizontalDivider(color = colors.outline.copy(alpha = 0.3f), thickness = 0.8.dp)

                                    // 1. Nomor Lambung / Unit & Jenis Muatan
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedTextField(
                                            value = unitCodeInput,
                                            onValueChange = { unitCodeInput = it },
                                            label = { Text("No. Lambung / Unit", fontSize = 11.sp) },
                                            placeholder = { Text("mis. DT-04, EX-200", fontSize = 10.sp) },
                                            modifier = Modifier.weight(1f).testTag("unit_code_input"),
                                            colors = com.example.ui.components.highContrastTextFieldColors()
                                        )
                                        OutlinedTextField(
                                            value = materialTypeInput,
                                            onValueChange = { materialTypeInput = it },
                                            label = { Text("Muatan / Rute", fontSize = 11.sp) },
                                            placeholder = { Text("mis. OB, Batubara", fontSize = 10.sp) },
                                            modifier = Modifier.weight(1f).testTag("material_type_input"),
                                            colors = com.example.ui.components.highContrastTextFieldColors()
                                        )
                                    }

                                    // Quick Material Suggestions Chips
                                    LazyRow(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        contentPadding = PaddingValues(horizontal = 2.dp)
                                    ) {
                                        items(listOf("OB (Overburden)", "Batubara (Coal)", "Topsoil", "Hauling Ore", "Waste / Dumping", "General")) { mat ->
                                            Surface(
                                                color = if (materialTypeInput == mat) colors.primaryContainer else colors.surfaceVariant,
                                                shape = RoundedCornerShape(6.dp),
                                                border = BorderStroke(1.dp, if (materialTypeInput == mat) colors.primary else colors.outline.copy(alpha = 0.3f)),
                                                modifier = Modifier.clickable { materialTypeInput = mat }
                                            ) {
                                                Text(
                                                    mat,
                                                    fontSize = 9.5.sp,
                                                    color = if (materialTypeInput == mat) colors.onPrimaryContainer else colors.textPrimary,
                                                    fontWeight = if (materialTypeInput == mat) FontWeight.Bold else FontWeight.Normal,
                                                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                                                )
                                            }
                                        }
                                    }

                                    // 2. Pencatatan Ritase (Jumlah Rit + Tarif Premi)
                                    Surface(
                                        color = colors.surfaceVariant,
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text("🚚 Jumlah Ritase (Trip Hauling):", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                                if (currentRitase > 0 && currentRitaseRate > 0) {
                                                    Text(
                                                        "Premi: ${Formatters.formatRupiah(estimatedRitaseBonus)}",
                                                        fontSize = 10.5.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = colors.success
                                                    )
                                                }
                                            }

                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                OutlinedTextField(
                                                    value = ritaseCountInput,
                                                    onValueChange = { ritaseCountInput = it },
                                                    label = { Text("Jumlah Rit", fontSize = 11.sp) },
                                                    placeholder = { Text("0", fontSize = 11.sp) },
                                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                                    modifier = Modifier.weight(1f).testTag("ritase_count_input"),
                                                    colors = com.example.ui.components.highContrastTextFieldColors()
                                                )
                                                OutlinedTextField(
                                                    value = ritaseRateInput,
                                                    onValueChange = { ritaseRateInput = it },
                                                    label = { Text("Premi/Rit (Rp)", fontSize = 11.sp) },
                                                    placeholder = { Text("mis. 25000", fontSize = 10.sp) },
                                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                                    modifier = Modifier.weight(1.2f).testTag("ritase_rate_input"),
                                                    colors = com.example.ui.components.highContrastTextFieldColors()
                                                )
                                            }

                                            // Quick Ritase Increment Stepper Chips
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                listOf(
                                                    "+1 Rit" to 1,
                                                    "+2 Rit" to 2,
                                                    "+5 Rit" to 5,
                                                    "+10 Rit" to 10
                                                ).forEach { (label, increment) ->
                                                    Surface(
                                                        color = colors.primaryCardBg,
                                                        shape = RoundedCornerShape(6.dp),
                                                        border = BorderStroke(1.dp, colors.outline.copy(alpha = 0.3f)),
                                                        modifier = Modifier.weight(1f).clickable {
                                                            val currentVal = ritaseCountInput.toIntOrNull() ?: 0
                                                            ritaseCountInput = (currentVal + increment).toString()
                                                        }
                                                    ) {
                                                        Text(
                                                            label,
                                                            fontSize = 9.5.sp,
                                                            fontWeight = FontWeight.SemiBold,
                                                            color = colors.primary,
                                                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                                            modifier = Modifier.padding(vertical = 4.dp)
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    // 3. Pencatatan HM (Hour Meter Start - End)
                                    Surface(
                                        color = colors.surfaceVariant,
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text("⏱️ HM (Hour Meter) Alat / Kendaraan:", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                                if (calculatedHmDiff > 0.0) {
                                                    Text(
                                                        "Total: $calculatedHmDiff HM",
                                                        fontSize = 11.sp,
                                                        fontWeight = FontWeight.ExtraBold,
                                                        color = colors.indigo
                                                    )
                                                }
                                            }

                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                OutlinedTextField(
                                                    value = hmStartInput,
                                                    onValueChange = { hmStartInput = it },
                                                    label = { Text("HM Awal", fontSize = 11.sp) },
                                                    placeholder = { Text("mis. 1240.0", fontSize = 10.sp) },
                                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                                    modifier = Modifier.weight(1f).testTag("hm_start_input"),
                                                    colors = com.example.ui.components.highContrastTextFieldColors()
                                                )
                                                OutlinedTextField(
                                                    value = hmEndInput,
                                                    onValueChange = { hmEndInput = it },
                                                    label = { Text("HM Akhir", fontSize = 11.sp) },
                                                    placeholder = { Text("mis. 1248.5", fontSize = 10.sp) },
                                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                                    modifier = Modifier.weight(1f).testTag("hm_end_input"),
                                                    colors = com.example.ui.components.highContrastTextFieldColors()
                                                )
                                            }

                                            // Action untuk sync HM ke Overtime Hours
                                            if (calculatedHmDiff > 0.0) {
                                                Surface(
                                                    color = colors.indigoBg,
                                                    shape = RoundedCornerShape(8.dp),
                                                    border = BorderStroke(1.dp, colors.indigo.copy(alpha = 0.4f)),
                                                    modifier = Modifier.fillMaxWidth().clickable {
                                                        hoursInput = calculatedHmDiff.toString()
                                                        if (noteInput.isBlank()) {
                                                            noteInput = "Operasional HM $currentHmStart - $currentHmEnd ($calculatedHmDiff HM)" +
                                                                if (unitCodeInput.isNotBlank()) " Unit $unitCodeInput" else ""
                                                        }
                                                    }
                                                ) {
                                                    Row(
                                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                                        horizontalArrangement = Arrangement.SpaceBetween,
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Text(
                                                            "⏱️ Salin $calculatedHmDiff HM ke Durasi Lembur di atas",
                                                            fontSize = 10.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = colors.indigo
                                                        )
                                                        Icon(Icons.Default.ArrowUpward, contentDescription = null, tint = colors.indigo, modifier = Modifier.size(13.dp))
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Day Type Selector
                    Text("Skema Hari Lembur (PP 35/2021):", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = colors.textSecondary)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(
                            "WORKDAY" to "Hari Kerja\n(1.5x / 2x)",
                            "HOLIDAY_5_DAYS" to "Libur 5HK\n(2x/3x/4x)",
                            "HOLIDAY_6_DAYS" to "Libur 6HK\n(2x/3x/4x)"
                        ).forEach { (type, label) ->
                            val isSelected = dayTypeInput == type
                            Surface(
                                color = if (isSelected) colors.primaryContainer else colors.inactiveChipBg,
                                shape = RoundedCornerShape(10.dp),
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = SolidColor(
                                        if (isSelected) colors.primary else colors.inactiveChipBorder
                                    )
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { dayTypeInput = type }
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 10.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) colors.onPrimaryContainer else colors.inactiveChipText,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 9.dp)
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = noteInput,
                        onValueChange = { noteInput = it },
                        label = { Text("Deskripsi Tugas / Catatan", fontSize = 11.sp) },
                        placeholder = { Text("mis. Hauling OB Shift Malam Pit 3", fontSize = 10.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = com.example.ui.components.highContrastTextFieldColors()
                    )

                    if (previewResult.warningMessage != null) {
                        Text(
                            text = previewResult.warningMessage,
                            fontSize = 10.5.sp,
                            color = colors.warning
                        )
                    }

                    if (previewResult.totalAmount > 0 || estimatedRitaseBonus > 0) {
                        Surface(
                            color = colors.surfaceVariant,
                            shape = RoundedCornerShape(12.dp),
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = SolidColor(colors.outline)
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Estimasi Upah Lembur Pokok:", fontSize = 11.sp, color = colors.textSecondary)
                                    Text(
                                        Formatters.formatRupiah(previewResult.totalAmount),
                                        fontSize = 12.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.success
                                    )
                                }
                                if (estimatedRitaseBonus > 0) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("Estimasi Premi Ritase ($currentRitase Rit):", fontSize = 11.sp, color = colors.textSecondary)
                                        Text(
                                            Formatters.formatRupiah(estimatedRitaseBonus),
                                            fontSize = 12.5.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = colors.primary
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Button(
                        onClick = {
                            val finalHours = if (currentHours > 0) currentHours else calculatedHmDiff
                            if ((finalHours > 0 || currentRitase > 0) && dateInput.isNotBlank()) {
                                onAddLog(
                                    dateInput,
                                    finalHours,
                                    dayTypeInput,
                                    noteInput,
                                    shiftTypeInput,
                                    currentRitase,
                                    currentRitaseRate,
                                    currentHmStart,
                                    currentHmEnd,
                                    calculatedHmDiff,
                                    unitCodeInput.trim(),
                                    materialTypeInput.trim()
                                )
                                hoursInput = ""
                                noteInput = ""
                                ritaseCountInput = ""
                                hmStartInput = ""
                                hmEndInput = ""
                                unitCodeInput = ""
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = colors.primaryContainer),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().height(48.dp).testTag("add_overtime_button")
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = colors.onPrimaryContainer)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Simpan Log Lembur & Ritase", fontWeight = FontWeight.Bold, color = colors.onPrimaryContainer)
                    }
                }
            }
        }

        // 3. List of Overtime Logs
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("DAFTAR LOG LEMBUR & RITASE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textMuted)
                Text("${overtimeLogs.size} Catatan", fontSize = 10.5.sp, color = colors.textSecondary)
            }
        }

        if (overtimeLogs.isEmpty()) {
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
                        Icon(Icons.Default.AccessTime, contentDescription = null, tint = colors.textMuted, modifier = Modifier.size(32.dp))
                        Text("Belum ada log lembur atau ritase tercatat", fontSize = 12.5.sp, color = colors.textSecondary)
                    }
                }
            }
        } else {
            items(overtimeLogs) { log ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                    colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                    border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
                ) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.padding(bottom = 2.dp)
                                ) {
                                    Text(Formatters.formatDateIndo(log.date), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                    Surface(
                                        color = colors.primaryContainer,
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        val typeLabel = when (log.dayType) {
                                            "WORKDAY" -> "Kerja"
                                            "HOLIDAY_5_DAYS" -> "Libur 5HK"
                                            else -> "Libur 6HK"
                                        }
                                        Text(typeLabel, fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = colors.onPrimaryContainer, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                                    }
                                    if (log.shiftType != "REGULAR") {
                                        Surface(
                                            color = when (log.shiftType) {
                                                "SHIFT_PAGI" -> colors.amberBg
                                                "SHIFT_SORE" -> colors.tealBg
                                                "SHIFT_MALAM" -> colors.indigoBg
                                                "LONG_SHIFT" -> colors.roseBg
                                                else -> colors.surfaceVariant
                                            },
                                            shape = RoundedCornerShape(6.dp)
                                        ) {
                                            val shiftLabel = when (log.shiftType) {
                                                "SHIFT_PAGI" -> "Pagi"
                                                "SHIFT_SORE" -> "Sore"
                                                "SHIFT_MALAM" -> "Malam"
                                                "LONG_SHIFT" -> "Long 12j"
                                                else -> log.shiftType
                                            }
                                            val shiftTextColor = when (log.shiftType) {
                                                "SHIFT_PAGI" -> colors.amber
                                                "SHIFT_SORE" -> colors.teal
                                                "SHIFT_MALAM" -> colors.indigo
                                                "LONG_SHIFT" -> colors.error
                                                else -> colors.textPrimary
                                            }
                                            Text(shiftLabel, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = shiftTextColor, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                                        }
                                    }
                                }

                                Text("${log.hours} Jam (${log.overtimeMultiplierHours} jam konversi)", fontSize = 11.sp, color = colors.textSecondary)
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text(Formatters.formatRupiah(log.totalAmount), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = colors.success)
                                IconButton(
                                    onClick = { onDeleteLog(log.id) },
                                    modifier = Modifier.size(26.dp)
                                ) {
                                    Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = colors.error, modifier = Modifier.size(16.dp))
                                }
                            }
                        }

                        // Badges Ritase, HM, Unit, dan Material
                        val hasFleetData = log.unitCode.isNotBlank() || log.ritaseCount > 0 || log.hmTotal > 0.0 || (log.hmEnd > log.hmStart && log.hmStart > 0.0) || log.materialType.isNotBlank()
                        if (hasFleetData) {
                            HorizontalDivider(color = colors.outline.copy(alpha = 0.25f), thickness = 0.6.dp)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (log.unitCode.isNotBlank()) {
                                    Surface(
                                        color = colors.primaryCardBg,
                                        shape = RoundedCornerShape(6.dp),
                                        border = BorderStroke(1.dp, colors.primary.copy(alpha = 0.4f))
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(3.dp)
                                        ) {
                                            Icon(Icons.Default.DirectionsCar, contentDescription = null, tint = colors.primary, modifier = Modifier.size(11.dp))
                                            Text("Unit ${log.unitCode}", fontSize = 9.5.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                        }
                                    }
                                }

                                if (log.ritaseCount > 0) {
                                    Surface(
                                        color = colors.emeraldBg,
                                        shape = RoundedCornerShape(6.dp),
                                        border = BorderStroke(1.dp, colors.success.copy(alpha = 0.4f))
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(3.dp)
                                        ) {
                                            Icon(Icons.Default.LocalShipping, contentDescription = null, tint = colors.success, modifier = Modifier.size(11.dp))
                                            Text("${log.ritaseCount} Rit", fontSize = 9.5.sp, fontWeight = FontWeight.Bold, color = colors.success)
                                            if (log.ritaseRate > 0) {
                                                Text("(+${Formatters.formatRupiah(log.ritaseCount * log.ritaseRate)})", fontSize = 8.5.sp, color = colors.success)
                                            }
                                        }
                                    }
                                }

                                val displayHm = if (log.hmTotal > 0.0) log.hmTotal else if (log.hmEnd > log.hmStart && log.hmStart > 0.0) log.hmEnd - log.hmStart else 0.0
                                if (displayHm > 0.0 || log.hmStart > 0.0) {
                                    Surface(
                                        color = colors.indigoBg,
                                        shape = RoundedCornerShape(6.dp),
                                        border = BorderStroke(1.dp, colors.indigo.copy(alpha = 0.4f))
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(3.dp)
                                        ) {
                                            Icon(Icons.Default.Speed, contentDescription = null, tint = colors.indigo, modifier = Modifier.size(11.dp))
                                            Text(
                                                if (log.hmStart > 0.0 && log.hmEnd > 0.0) "HM ${log.hmStart}-${log.hmEnd} ($displayHm HM)" else "$displayHm HM",
                                                fontSize = 9.5.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = colors.indigo
                                            )
                                        }
                                    }
                                }

                                if (log.materialType.isNotBlank()) {
                                    Surface(
                                        color = colors.surfaceVariant,
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Text(log.materialType, fontSize = 9.sp, color = colors.textSecondary, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                                    }
                                }
                            }
                        }

                        if (log.taskDescription.isNotBlank()) {
                            Text(log.taskDescription, fontSize = 10.5.sp, color = colors.textSecondary)
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
}

private fun getYesterdayDateStr(): String {
    val cal = Calendar.getInstance()
    cal.add(Calendar.DAY_OF_YEAR, -1)
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    return sdf.format(cal.time)
}

private fun getDaysAgoDateStr(days: Int): String {
    val cal = Calendar.getInstance()
    cal.add(Calendar.DAY_OF_YEAR, -days)
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    return sdf.format(cal.time)
}

private fun getDayOfWeek(dateStr: String): Int {
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val d = parser.parse(dateStr)
        val cal = Calendar.getInstance()
        if (d != null) {
            cal.time = d
            cal.get(Calendar.DAY_OF_WEEK)
        } else 0
    } catch (e: Exception) {
        0
    }
}

@Composable
private fun OvertimeMiniMonthGrid(
    year: Int,
    month: Int,
    selectedDate: String,
    overtimeLogs: List<OvertimeLog>,
    onSelectDate: (String) -> Unit
) {
    val colors = GajikuTheme.colors
    val cal = Calendar.getInstance().apply {
        set(Calendar.YEAR, year)
        set(Calendar.MONTH, month - 1)
        set(Calendar.DAY_OF_MONTH, 1)
    }

    val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
    val firstDayOfWeek = cal.get(Calendar.DAY_OF_WEEK) // Sunday = 1, Monday = 2
    val offset = (firstDayOfWeek + 5) % 7 // Monday = 0, Sunday = 6

    val todayStr = Formatters.getCurrentDateStr()
    val monthPrefix = String.format(Locale.US, "%04d-%02d", year, month)
    val monthLogs = remember(overtimeLogs, monthPrefix) {
        overtimeLogs.filter { it.date.startsWith(monthPrefix) }
    }

    val totalCells = offset + daysInMonth
    val rows = (totalCells + 6) / 7
    var currentDay = 1

    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        for (r in 0 until rows) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                for (c in 0..6) {
                    val cellIndex = r * 7 + c
                    if (cellIndex < offset || currentDay > daysInMonth) {
                        Spacer(modifier = Modifier.weight(1f).height(36.dp))
                    } else {
                        val day = currentDay
                        val dateFormatted = String.format(Locale.US, "%04d-%02d-%02d", year, month, day)
                        val isSelected = dateFormatted == selectedDate
                        val isToday = dateFormatted == todayStr
                        val isWeekend = c >= 5

                        // Check if this date has recorded overtime
                        val dayLogs = monthLogs.filter { it.date == dateFormatted }
                        val totalOtForDay = dayLogs.sumOf { it.hours }
                        val hasOt = totalOtForDay > 0.0 || dayLogs.any { it.ritaseCount > 0 || it.hmTotal > 0 }

                        val cellBg = when {
                            isSelected -> colors.primary
                            hasOt -> colors.emeraldBg
                            isToday -> colors.primaryContainer.copy(alpha = 0.45f)
                            isWeekend -> colors.roseBg.copy(alpha = 0.45f)
                            else -> Color.Transparent
                        }

                        val textColor = when {
                            isSelected -> colors.onPrimary
                            hasOt -> colors.emerald
                            isToday -> colors.primary
                            isWeekend -> colors.error
                            else -> colors.textPrimary
                        }

                        Surface(
                            color = cellBg,
                            shape = RoundedCornerShape(8.dp),
                            border = when {
                                isSelected -> BorderStroke(1.5.dp, colors.primary)
                                isToday -> BorderStroke(1.dp, colors.primary.copy(alpha = 0.6f))
                                hasOt -> BorderStroke(1.dp, colors.emerald.copy(alpha = 0.6f))
                                else -> null
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(36.dp)
                                .padding(1.5.dp)
                                .clickable { onSelectDate(dateFormatted) }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Text(
                                        text = "$day",
                                        fontSize = 11.5.sp,
                                        fontWeight = if (isSelected || isToday || hasOt) FontWeight.Bold else FontWeight.Normal,
                                        color = textColor,
                                        textAlign = TextAlign.Center
                                    )
                                    if (hasOt && !isSelected) {
                                        Surface(
                                            color = colors.emerald,
                                            shape = CircleShape,
                                            modifier = Modifier.size(4.dp)
                                        ) {}
                                    }
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

