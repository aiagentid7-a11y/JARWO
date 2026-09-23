package com.example.ui.screens

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.UserProfile
import com.example.domain.calculator.IndonesianPayrollCalculators
import com.example.domain.calculator.IndonesianPayrollCalculators.RosterPatternType
import com.example.domain.calculator.IndonesianPayrollCalculators.WorkShiftType
import com.example.domain.util.Formatters
import com.example.ui.components.AdBannerPlaceholder
import com.example.ui.components.LegalDisclaimerCard
import com.example.ui.theme.*

@Composable
fun WorkShiftScheduleScreen(
    userProfile: UserProfile,
    isProUser: Boolean,
    onOpenProDialog: () -> Unit,
    onNavigateToOvertimeTracker: () -> Unit = {},
    onSaveProfile: (UserProfile) -> Unit = {}
) {
    val colors = GajikuTheme.colors
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current

    var showEditScheduleDialog by remember { mutableStateOf(false) }

    var selectedShiftType by remember(userProfile.defaultShiftType) {
        mutableStateOf(WorkShiftType.fromKey(userProfile.defaultShiftType))
    }
    var dayTypeInput by remember { mutableStateOf("WORKDAY") }
    var customBreakHoursStr by remember { mutableStateOf("1.0") }
    var shiftAllowanceStr by remember(userProfile) {
        mutableStateOf(if (userProfile.shiftAllowance > 0) userProfile.shiftAllowance.toLong().toString() else "0")
    }

    // Interactive Custom Time Range
    var customStartTime by remember(selectedShiftType) {
        mutableStateOf(
            when (selectedShiftType) {
                WorkShiftType.REGULAR -> "08:00"
                WorkShiftType.SHIFT_PAGI -> "07:00"
                WorkShiftType.SHIFT_SORE -> "15:00"
                WorkShiftType.SHIFT_MALAM -> "23:00"
                WorkShiftType.LONG_SHIFT -> "08:00"
            }
        )
    }
    var customEndTime by remember(selectedShiftType) {
        mutableStateOf(
            when (selectedShiftType) {
                WorkShiftType.REGULAR -> "17:00"
                WorkShiftType.SHIFT_PAGI -> "15:00"
                WorkShiftType.SHIFT_SORE -> "23:00"
                WorkShiftType.SHIFT_MALAM -> "07:00"
                WorkShiftType.LONG_SHIFT -> "20:00"
            }
        )
    }

    val totalFixedSalary = userProfile.totalFixedSalary
    val hourlyRate = IndonesianPayrollCalculators.calculateHourlyRate(totalFixedSalary)
    val customBreak = customBreakHoursStr.toDoubleOrNull() ?: 1.0
    val shiftAllowanceAmount = shiftAllowanceStr.toDoubleOrNull() ?: 0.0

    val shiftDetail = remember(selectedShiftType, totalFixedSalary, dayTypeInput, customBreak, shiftAllowanceAmount) {
        IndonesianPayrollCalculators.calculateShiftWorkDetails(
            shiftType = selectedShiftType,
            totalFixedSalary = totalFixedSalary,
            dayType = dayTypeInput,
            customBreakHours = customBreak,
            customShiftAllowance = shiftAllowanceAmount
        )
    }

    // State untuk Simulator Pola Roster Kerja (Roster 8:2, dsb.)
    var selectedRosterPattern by remember { mutableStateOf(RosterPatternType.ROSTER_8_2) }
    var roster82Mode by remember { mutableStateOf("4_PAGI_4_MALAM") } // "4_PAGI_4_MALAM", "8_PAGI", "8_LONG_SHIFT", "4_PAGI_4_SORE"

    val currentRosterItems = remember(selectedRosterPattern, roster82Mode) {
        IndonesianPayrollCalculators.generateRosterSchedule(
            patternType = selectedRosterPattern,
            roster82Mode = roster82Mode
        )
    }

    val rosterSummary = remember(selectedRosterPattern, currentRosterItems, totalFixedSalary, shiftAllowanceAmount) {
        IndonesianPayrollCalculators.calculateRosterCycleSummary(
            patternType = selectedRosterPattern,
            rosterItems = currentRosterItems,
            totalFixedSalary = totalFixedSalary,
            shiftAllowancePerDay = shiftAllowanceAmount
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
        // 1. Primary Hero Summary Card with Quick Edit Action
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
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "JADWAL KERJA & SHIFT KARYAWAN",
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
                                if (userProfile.workScheduleScheme == "6_DAYS") "Skema 6HK (7j/hari)" else "Skema 5HK (8j/hari)",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.onPrimaryContainer,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Shift Terpilih:", fontSize = 11.sp, color = colors.textSecondary)
                            Text(
                                text = selectedShiftType.displayName,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = colors.textPrimary
                            )
                        }
                        Surface(
                            color = when (selectedShiftType) {
                                WorkShiftType.REGULAR -> colors.primaryContainer
                                WorkShiftType.SHIFT_PAGI -> colors.amberBg
                                WorkShiftType.SHIFT_SORE -> colors.tealBg
                                WorkShiftType.SHIFT_MALAM -> colors.indigoBg
                                WorkShiftType.LONG_SHIFT -> colors.roseBg
                            },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(
                                text = "$customStartTime - $customEndTime",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = when (selectedShiftType) {
                                    WorkShiftType.REGULAR -> colors.onPrimaryContainer
                                    WorkShiftType.SHIFT_PAGI -> colors.amber
                                    WorkShiftType.SHIFT_SORE -> colors.teal
                                    WorkShiftType.SHIFT_MALAM -> colors.indigo
                                    WorkShiftType.LONG_SHIFT -> colors.error
                                },
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }

                    HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Durasi Shift", fontSize = 10.5.sp, color = colors.textMuted)
                            Text("${shiftDetail.totalDurationHours.toInt()} Jam", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                        }
                        Column {
                            Text("Kerja Pokok", fontSize = 10.5.sp, color = colors.textMuted)
                            Text("${shiftDetail.effectiveWorkHours.toInt()} Jam", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                        }
                        Column {
                            Text("Istirahat", fontSize = 10.5.sp, color = colors.textMuted)
                            Text("${shiftDetail.breakHours} Jam", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("Lembur Otomatis", fontSize = 10.5.sp, color = colors.textMuted)
                            Text(
                                if (shiftDetail.isOvertimeIncluded) "${shiftDetail.overtimeHours.toInt()} Jam (${shiftDetail.overtimeMultiplierHours}x)" else "0 Jam",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (shiftDetail.isOvertimeIncluded) colors.success else colors.textPrimary
                            )
                        }
                    }

                    if (selectedShiftType == WorkShiftType.LONG_SHIFT) {
                        Surface(
                            color = colors.roseBg,
                            shape = RoundedCornerShape(10.dp),
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = SolidColor(colors.error.copy(alpha = 0.4f))
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Estimasi Upah Lembur Long Shift (4 Jam)", fontSize = 10.5.sp, color = colors.error, fontWeight = FontWeight.Bold)
                                    Text("1.5x jam ke-1 + 2.0x 3 jam berikutnya = 7.5 jam pengali", fontSize = 9.5.sp, color = colors.textMuted)
                                }
                                Text(
                                    Formatters.formatRupiah(shiftDetail.overtimePayAmount),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = colors.error
                                )
                            }
                        }
                    }

                    // Button: Edit Jam Kerja & Shift (Opens comprehensive modal)
                    Button(
                        onClick = { showEditScheduleDialog = true },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("edit_work_schedule_shift_btn"),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = colors.primary,
                            contentColor = colors.onPrimary
                        )
                    ) {
                        Icon(
                            Icons.Default.Tune,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "Edit Jam Kerja & Shift Profil",
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // 2. Shift Type Selector Horizontal Carousel / Chips
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "PILIH JENIS JAM KERJA & SHIFT:",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.primary
                )

                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(WorkShiftType.entries) { type ->
                        val isSelected = selectedShiftType == type
                        Surface(
                            color = if (isSelected) colors.primaryContainer else colors.secondaryCardBg,
                            shape = RoundedCornerShape(14.dp),
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = SolidColor(if (isSelected) colors.primary else colors.secondaryCardBorder)
                            ),
                            modifier = Modifier
                                .widthIn(min = 130.dp)
                                .clickable {
                                    selectedShiftType = type
                                    customStartTime = when (type) {
                                        WorkShiftType.REGULAR -> "08:00"
                                        WorkShiftType.SHIFT_PAGI -> "07:00"
                                        WorkShiftType.SHIFT_SORE -> "15:00"
                                        WorkShiftType.SHIFT_MALAM -> "23:00"
                                        WorkShiftType.LONG_SHIFT -> "08:00"
                                    }
                                    customEndTime = when (type) {
                                        WorkShiftType.REGULAR -> "17:00"
                                        WorkShiftType.SHIFT_PAGI -> "15:00"
                                        WorkShiftType.SHIFT_SORE -> "23:00"
                                        WorkShiftType.SHIFT_MALAM -> "07:00"
                                        WorkShiftType.LONG_SHIFT -> "20:00"
                                    }
                                }
                                .testTag("shift_chip_${type.key.lowercase()}")
                        ) {
                            Column(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        when (type) {
                                            WorkShiftType.REGULAR -> Icons.Default.Work
                                            WorkShiftType.SHIFT_PAGI -> Icons.Default.WbSunny
                                            WorkShiftType.SHIFT_SORE -> Icons.Default.WbTwilight
                                            WorkShiftType.SHIFT_MALAM -> Icons.Default.NightlightRound
                                            WorkShiftType.LONG_SHIFT -> Icons.Default.AccessTimeFilled
                                        },
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp),
                                        tint = if (isSelected) colors.primary else colors.textMuted
                                    )
                                    Text(
                                        text = when (type) {
                                            WorkShiftType.REGULAR -> "Regular"
                                            WorkShiftType.SHIFT_PAGI -> "Shift Pagi"
                                            WorkShiftType.SHIFT_SORE -> "Shift Sore"
                                            WorkShiftType.SHIFT_MALAM -> "Shift Malam"
                                            WorkShiftType.LONG_SHIFT -> "Long Shift"
                                        },
                                        fontSize = 11.5.sp,
                                        fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.SemiBold,
                                        color = if (isSelected) colors.onPrimaryContainer else colors.textPrimary
                                    )
                                }
                                Text(
                                    text = type.defaultTimeRange,
                                    fontSize = 10.sp,
                                    color = if (isSelected) colors.primary else colors.textSecondary
                                )
                            }
                        }
                    }
                }
            }
        }

        // 3. Detail & Interactive Simulator Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "SIMULASI & KUSTOMISASI ${selectedShiftType.displayName.uppercase()}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.primary
                        )
                        IconButton(
                            onClick = {
                                val textToCopy = buildString {
                                    appendLine("=== RINCIAN JADWAL & SHIFT KERJA ===")
                                    appendLine("Jenis Shift: ${selectedShiftType.displayName}")
                                    appendLine("Rentang Jam: $customStartTime - $customEndTime")
                                    appendLine("Durasi Total: ${shiftDetail.totalDurationHours} Jam (Pokok: ${shiftDetail.effectiveWorkHours} Jam, Istirahat: ${shiftDetail.breakHours} Jam)")
                                    if (shiftDetail.isOvertimeIncluded) {
                                        appendLine("Lembur Otomatis: ${shiftDetail.overtimeHours} Jam (${shiftDetail.overtimeMultiplierHours}x)")
                                        appendLine("Upah Lembur: ${Formatters.formatRupiah(shiftDetail.overtimePayAmount)}")
                                    }
                                    if (shiftDetail.shiftAllowanceAmount > 0) {
                                        appendLine("Tunjangan Shift: ${Formatters.formatRupiah(shiftDetail.shiftAllowanceAmount)}")
                                    }
                                    appendLine("Dasar Hukum: ${selectedShiftType.legalReference}")
                                }
                                clipboardManager.setText(AnnotatedString(textToCopy))
                                Toast.makeText(context, "Rincian shift disalin ke clipboard", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = "Salin Rincian", tint = colors.primary, modifier = Modifier.size(16.dp))
                        }
                    }

                    Text(
                        text = selectedShiftType.description,
                        fontSize = 11.sp,
                        color = colors.textSecondary,
                        lineHeight = 15.sp
                    )

                    // Jam Mulai & Jam Selesai Kustom
                    Text("Rentang Jam Kerja Shift:", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = colors.textSecondary)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = customStartTime,
                            onValueChange = { customStartTime = it },
                            label = { Text("Jam Masuk", fontSize = 11.sp) },
                            placeholder = { Text("08:00") },
                            modifier = Modifier.weight(1f),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                        OutlinedTextField(
                            value = customEndTime,
                            onValueChange = { customEndTime = it },
                            label = { Text("Jam Pulang", fontSize = 11.sp) },
                            placeholder = { Text("17:00") },
                            modifier = Modifier.weight(1f),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                    }

                    // Pilihan Jenis Hari (Hari Kerja / Libur)
                    Text("Kategori Hari:", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = colors.textSecondary)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(
                            "WORKDAY" to "Hari Kerja",
                            "HOLIDAY_5_DAYS" to "Hari Libur (5HK)",
                            "HOLIDAY_6_DAYS" to "Hari Libur (6HK)"
                        ).forEach { (type, label) ->
                            val isSelected = dayTypeInput == type
                            Surface(
                                color = if (isSelected) colors.primaryContainer else colors.inactiveChipBg,
                                shape = RoundedCornerShape(10.dp),
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = SolidColor(if (isSelected) colors.primary else colors.inactiveChipBorder)
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
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 8.dp)
                                )
                            }
                        }
                    }

                    // Input Tambahan (Istirahat & Tunjangan Shift)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = customBreakHoursStr,
                            onValueChange = { customBreakHoursStr = it },
                            label = { Text("Istirahat (Jam)", fontSize = 11.sp) },
                            supportingText = { Text("Jam istirahat resmi, dikurangi dari jam kerja.", fontSize = 9.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.weight(1f),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                        OutlinedTextField(
                            value = shiftAllowanceStr,
                            onValueChange = { shiftAllowanceStr = it },
                            label = { Text("Tunjangan Shift (Rp)", fontSize = 11.sp) },
                            supportingText = { Text("Tunjangan tambahan per hari untuk shift ini.", fontSize = 9.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1.3f),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                    }

                    // Hasil Rincian Penghasilan Tambahan Shift Harian
                    Surface(
                        color = colors.surfaceVariant,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Upah Pokok Harian Standar:", fontSize = 11.sp, color = colors.textSecondary)
                                Text(Formatters.formatRupiah(totalFixedSalary / (if (userProfile.workScheduleScheme == "6_DAYS") 25.0 else 21.0)), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                            }
                            if (shiftDetail.isOvertimeIncluded) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Lembur 4 Jam Long Shift (${shiftDetail.overtimeMultiplierHours}x):", fontSize = 11.sp, color = colors.textSecondary)
                                    Text(Formatters.formatRupiah(shiftDetail.overtimePayAmount), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.success)
                                }
                            }
                            if (shiftDetail.shiftAllowanceAmount > 0) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Tunjangan / Insentif Shift:", fontSize = 11.sp, color = colors.textSecondary)
                                    Text(Formatters.formatRupiah(shiftDetail.shiftAllowanceAmount), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                }
                            }
                            HorizontalDivider(color = colors.outline.copy(alpha = 0.4f), thickness = 0.6.dp)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Total Tambahan Per Hari Shift:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                Text(
                                    Formatters.formatRupiah(shiftDetail.totalShiftDailyEarnings),
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = if (shiftDetail.totalShiftDailyEarnings > 0) colors.success else colors.textPrimary
                                )
                            }
                        }
                    }

                    // Catatan Kepatuhan Regulasi (Compliance Notes)
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Regulasi & Hak Normatif Ketenagakerjaan:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                        shiftDetail.complianceNotes.forEach { note ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = colors.primary, modifier = Modifier.size(14.dp).padding(top = 2.dp))
                                Text(note, fontSize = 10.5.sp, color = colors.textSecondary, lineHeight = 14.sp)
                            }
                        }
                    }

                    if (selectedShiftType == WorkShiftType.LONG_SHIFT) {
                        Button(
                            onClick = onNavigateToOvertimeTracker,
                            modifier = Modifier.fillMaxWidth().testTag("log_long_shift_btn"),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                        ) {
                            Icon(Icons.Default.AddAlarm, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Catat ke Tracker Lembur (Overtime)", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // 4. Simulator Pola Rotasi Roster Kerja (Roster 8:2, 3 Shift 4 Grup, 5:2, 14:14, 21:7)
        item {
            Card(
                modifier = Modifier.fillMaxWidth().testTag("roster_simulator_card"),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Default.DateRange, contentDescription = null, tint = colors.primary, modifier = Modifier.size(16.dp))
                                Text("SIMULATOR POLA ROSTER KERJA", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                            }
                            Text(
                                "Pola siklus kerja (ON) & istirahat periodik (OFF) industri 24 jam",
                                fontSize = 10.5.sp,
                                color = colors.textSecondary
                            )
                        }
                    }

                    // Pilihan Pola Roster
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Pilih Sistem / Pola Roster:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                        if (selectedRosterPattern != RosterPatternType.ROSTER_8_2_WEEKS) {
                            Surface(
                                color = colors.amber.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(20.dp),
                                border = BorderStroke(1.dp, colors.amber.copy(alpha = 0.5f)),
                                modifier = Modifier.clickable {
                                    selectedRosterPattern = RosterPatternType.ROSTER_8_2_WEEKS
                                    roster82Mode = "WEEKS_5_2_NO_OT"
                                }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.DateRange, contentDescription = null, tint = colors.amber, modifier = Modifier.size(12.dp))
                                    Text("Pindah ke Roster 8:2 Mingguan", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                }
                            }
                        } else {
                            Surface(
                                color = colors.primary.copy(alpha = 0.15f),
                                shape = RoundedCornerShape(20.dp),
                                border = BorderStroke(1.dp, colors.primary.copy(alpha = 0.5f)),
                                modifier = Modifier.clickable {
                                    selectedRosterPattern = RosterPatternType.ROSTER_8_2
                                    roster82Mode = "4_PAGI_4_MALAM"
                                }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.DateRange, contentDescription = null, tint = colors.primary, modifier = Modifier.size(12.dp))
                                    Text("Pindah ke 8:2 Harian", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                }
                            }
                        }
                    }
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(horizontal = 2.dp)
                    ) {
                        items(RosterPatternType.entries) { pattern ->
                            val isSelected = selectedRosterPattern == pattern
                            Surface(
                                color = if (isSelected) colors.primaryContainer else colors.surfaceVariant,
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(
                                    if (isSelected) 1.5.dp else 1.dp,
                                    if (isSelected) colors.primary else colors.outline.copy(alpha = 0.3f)
                                ),
                                modifier = Modifier.clickable { 
                                    selectedRosterPattern = pattern 
                                    if (pattern == RosterPatternType.ROSTER_8_2_WEEKS) {
                                        roster82Mode = "WEEKS_5_2_NO_OT"
                                    } else if (pattern == RosterPatternType.ROSTER_8_2 && roster82Mode.startsWith("WEEKS_")) {
                                        roster82Mode = "4_PAGI_4_MALAM"
                                    }
                                }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    if (pattern == RosterPatternType.ROSTER_8_2 || pattern == RosterPatternType.ROSTER_8_2_WEEKS) {
                                        Surface(
                                            color = colors.amber,
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(
                                                if (pattern == RosterPatternType.ROSTER_8_2) "8:2 HARI" else "8:2 MINGGU",
                                                fontSize = 8.sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = Color.Black,
                                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                            )
                                        }
                                    }
                                    Text(
                                        text = when (pattern) {
                                            RosterPatternType.ROSTER_8_2 -> "Roster 8:2 Harian (8 On, 2 Off)"
                                            RosterPatternType.ROSTER_8_2_WEEKS -> "Roster 8:2 Mingguan (8 Mgg On, 2 Mgg Off)"
                                            RosterPatternType.ROSTER_3_SHIFT_4_GRUP -> "3 Shift 4 Grup (2-2-2)"
                                            RosterPatternType.ROSTER_5_2 -> "Standar 5:2 (Kantor)"
                                            RosterPatternType.ROSTER_6_1 -> "Standar 6:1 (Retail)"
                                            RosterPatternType.ROSTER_14_14 -> "Site 14:14 (Remote)"
                                            RosterPatternType.ROSTER_21_7 -> "Site 21:7 (Mining)"
                                        },
                                        fontSize = 11.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isSelected) colors.onPrimaryContainer else colors.textPrimary
                                    )
                                }
                            }
                        }
                    }

                    // Khusus Roster 8:2 Harian -> Pilihan Variasi Rotasi Shift
                    if (selectedRosterPattern == RosterPatternType.ROSTER_8_2) {
                        Surface(
                            color = colors.primaryCardBg,
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, colors.primary.copy(alpha = 0.3f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Pola Rotasi Roster 8:2 Harian (8 Hari Kerja + 2 Hari Off):", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                val roster82Options = listOf(
                                    "4_PAGI_4_MALAM" to "☀️ 4 Pagi + 🌙 4 Malam + 🌴 2 OFF (Rotasi 2 Giliran)",
                                    "4_PAGI_4_SORE" to "☀️ 4 Pagi + 🌅 4 Sore + 🌴 2 OFF",
                                    "8_PAGI" to "☀️ 8 Hari Shift Pagi (8 Jam) + 🌴 2 OFF",
                                    "8_LONG_SHIFT" to "⏱️ 8 Hari Long Shift (12 Jam) + 🌴 2 OFF"
                                )
                                roster82Options.forEach { (modeKey, modeLabel) ->
                                    val isModeSelected = roster82Mode == modeKey
                                    Surface(
                                        color = if (isModeSelected) colors.primaryContainer else colors.surfaceVariant,
                                        shape = RoundedCornerShape(8.dp),
                                        border = BorderStroke(1.dp, if (isModeSelected) colors.primary else colors.outline.copy(alpha = 0.2f)),
                                        modifier = Modifier.fillMaxWidth().clickable { roster82Mode = modeKey }
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                modeLabel,
                                                fontSize = 10.sp,
                                                fontWeight = if (isModeSelected) FontWeight.Bold else FontWeight.Normal,
                                                color = if (isModeSelected) colors.onPrimaryContainer else colors.textPrimary
                                            )
                                            if (isModeSelected) {
                                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = colors.primary, modifier = Modifier.size(14.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Khusus Roster 8:2 Mingguan -> Pilihan Variasi Rotasi Site & Field Break
                    if (selectedRosterPattern == RosterPatternType.ROSTER_8_2_WEEKS) {
                        Surface(
                            color = colors.primaryCardBg,
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, colors.primary.copy(alpha = 0.3f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Icon(Icons.Default.Terrain, contentDescription = null, tint = colors.amber, modifier = Modifier.size(16.dp))
                                    Text("Pola Operasional Roster 8:2 Mingguan (Site Tambang/Remote):", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                }
                                Text(
                                    "8 Minggu Kerja di Site Proyek + 2 Minggu Istirahat Penuh di Home Base (14 Hari Field Break)",
                                    fontSize = 9.5.sp,
                                    color = colors.textSecondary
                                )
                                val roster82WeeksOptions = listOf(
                                    "WEEKS_5_2_NO_OT" to "✅ 8 Mgg Regulasi Patuh (5 HK x 8j = 40 Jam/Mgg, TANPA LEMBUR) + 🌴 2 Mgg Field Break",
                                    "WEEKS_6_1_ROSTER" to "📅 8 Mgg di Site (6 HK x 6.7j / 40j/Mgg, 1 Hari Off/Mgg) + 🌴 2 Mgg Field Break",
                                    "WEEKS_8H_SHIFT" to "☀️ 8 Mgg Non-Stop (7 HK x 8j = 56j/Mgg, dengan 16j Lembur/Mgg) + 🌴 2 Mgg Field Break",
                                    "WEEKS_12H_SHIFT" to "⏱️ 8 Mgg Long Shift (12 Jam/hari di Site, dengan Lembur) + 🌴 2 Mgg Field Break"
                                )
                                roster82WeeksOptions.forEach { (modeKey, modeLabel) ->
                                    val isModeSelected = roster82Mode == modeKey
                                    Surface(
                                        color = if (isModeSelected) colors.primaryContainer else colors.surfaceVariant,
                                        shape = RoundedCornerShape(8.dp),
                                        border = BorderStroke(1.dp, if (isModeSelected) colors.primary else colors.outline.copy(alpha = 0.2f)),
                                        modifier = Modifier.fillMaxWidth().clickable { roster82Mode = modeKey }
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                modeLabel,
                                                fontSize = 10.sp,
                                                fontWeight = if (isModeSelected) FontWeight.Bold else FontWeight.Normal,
                                                color = if (isModeSelected) colors.onPrimaryContainer else colors.textPrimary
                                            )
                                            if (isModeSelected) {
                                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = colors.primary, modifier = Modifier.size(14.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Ringkasan Metrik Siklus Roster
                    Surface(
                        color = colors.surfaceVariant,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Ringkasan Siklus ${selectedRosterPattern.displayName}:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Surface(
                                    color = colors.primaryCardBg,
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Column(modifier = Modifier.padding(8.dp)) {
                                        Text("Siklus Rotasi", fontSize = 9.5.sp, color = colors.textSecondary)
                                        Text("${rosterSummary.totalCycleDays} Hari", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                        Text("${rosterSummary.totalWorkDays} On • ${rosterSummary.totalOffDays} Off", fontSize = 9.sp, color = colors.textMuted)
                                    }
                                }
                                Surface(
                                    color = colors.primaryCardBg,
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Column(modifier = Modifier.padding(8.dp)) {
                                        Text("Rasio Hari Kerja", fontSize = 9.5.sp, color = colors.textSecondary)
                                        Text("${rosterSummary.workPercentage.toInt()}% ON", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.success)
                                        Text("~${rosterSummary.monthlyOffDaysEstimate.toInt()} Hari Off/Bln", fontSize = 9.sp, color = colors.textMuted)
                                    }
                                }
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Surface(
                                    color = colors.primaryCardBg,
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Column(modifier = Modifier.padding(8.dp)) {
                                        Text("Total Jam Kerja", fontSize = 9.5.sp, color = colors.textSecondary)
                                        Text("${rosterSummary.totalNormalWorkHours.toInt()} Jam", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                        if (rosterSummary.totalOvertimeHours > 0) {
                                            Text("+${rosterSummary.totalOvertimeHours.toInt()}j Lembur", fontSize = 9.sp, color = colors.amber)
                                        } else {
                                            Text("Normal Jam Pokok", fontSize = 9.sp, color = colors.textMuted)
                                        }
                                    }
                                }
                                Surface(
                                    color = colors.primaryCardBg,
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Column(modifier = Modifier.padding(8.dp)) {
                                        Text("Tambahan per Siklus", fontSize = 9.5.sp, color = colors.textSecondary)
                                        Text(Formatters.formatRupiah(rosterSummary.totalCycleEarningsBonus), fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = if (rosterSummary.totalCycleEarningsBonus > 0) colors.success else colors.textPrimary)
                                        Text(if (rosterSummary.estimatedOvertimePay > 0) "Lembur + Tunj. Shift" else "Tunjangan Shift", fontSize = 9.sp, color = colors.textMuted)
                                    }
                                }
                            }
                        }
                    }

                    // Kalender / Timeline Harian / Mingguan Siklus
                    val isMultiWeekRoster = currentRosterItems.size > 7
                    val totalWeeks = (currentRosterItems.size + 6) / 7
                    var viewWeeklyOverview by remember(selectedRosterPattern, currentRosterItems.size) { 
                        mutableStateOf(isMultiWeekRoster) 
                    }
                    var expandedDailyDays by remember(selectedRosterPattern, currentRosterItems.size) { mutableStateOf(false) }
                    var expandedWeekIndex by remember(selectedRosterPattern, currentRosterItems.size) { mutableStateOf<Int?>(null) }
                    val weeklyChunks = remember(currentRosterItems) { currentRosterItems.chunked(7) }

                    val hasFieldBreakWeeks = remember(weeklyChunks) {
                        weeklyChunks.any { weekDays -> weekDays.all { it.isDayOff } }
                    }
                    val totalFieldBreakWeeks = remember(weeklyChunks) {
                        weeklyChunks.count { weekDays -> weekDays.all { it.isDayOff } }
                    }
                    val totalOnSiteWeeks = totalWeeks - totalFieldBreakWeeks
                    val firstFieldBreakWeekIdx = remember(weeklyChunks) {
                        weeklyChunks.indexOfFirst { weekDays -> weekDays.all { it.isDayOff } }
                    }
                    var weeklyFilterMode by remember(selectedRosterPattern) { mutableStateOf("ALL") } // "ALL", "ON_SITE", "FIELD_BREAK"

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            if (viewWeeklyOverview) "Jadwal Rotasi per Minggu ($totalWeeks Minggu Siklus):" else "Jadwal Hari-ke-Hari dalam 1 Siklus:",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textPrimary
                        )

                        if (isMultiWeekRoster) {
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(colors.surfaceVariant)
                                    .padding(2.dp)
                            ) {
                                Surface(
                                    color = if (viewWeeklyOverview) colors.primary else Color.Transparent,
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.clickable { viewWeeklyOverview = true }
                                ) {
                                    Text(
                                        "Mingguan",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (viewWeeklyOverview) colors.onPrimary else colors.textSecondary,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                    )
                                }
                                Surface(
                                    color = if (!viewWeeklyOverview) colors.primary else Color.Transparent,
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.clickable { viewWeeklyOverview = false }
                                ) {
                                    Text(
                                        "Harian",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (!viewWeeklyOverview) colors.onPrimary else colors.textSecondary,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                    )
                                }
                            }
                        }
                    }

                    // Filter Cepat Mingguan: Semua / On Site / Field Break
                    if (viewWeeklyOverview && isMultiWeekRoster && hasFieldBreakWeeks) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            val filterOptions = listOf(
                                "ALL" to "Semua ($totalWeeks Mgg)",
                                "ON_SITE" to "⛏️ On Site ($totalOnSiteWeeks Mgg)",
                                "FIELD_BREAK" to "🌴 Field Break ($totalFieldBreakWeeks Mgg)"
                            )
                            filterOptions.forEach { (mode, label) ->
                                val isSelected = weeklyFilterMode == mode
                                Surface(
                                    color = if (isSelected) {
                                        if (mode == "FIELD_BREAK") colors.teal else colors.primary
                                    } else colors.surfaceVariant,
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.clickable { weeklyFilterMode = mode }
                                ) {
                                    Text(
                                        label,
                                        fontSize = 9.5.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                        color = if (isSelected) Color.White else colors.textSecondary,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }
                    }

                    if (viewWeeklyOverview && isMultiWeekRoster) {
                        // Tampilan Ringkasan Berbasis Minggu (Dapat diklik untuk expand rincian harian)
                        val filteredWeeklyEntries = remember(weeklyChunks, weeklyFilterMode) {
                            val indexed = weeklyChunks.mapIndexed { idx, days -> idx to days }
                            when (weeklyFilterMode) {
                                "ON_SITE" -> indexed.filter { !it.second.all { d -> d.isDayOff } }
                                "FIELD_BREAK" -> indexed.filter { it.second.all { d -> d.isDayOff } }
                                else -> indexed
                            }
                        }

                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            filteredWeeklyEntries.forEach { (originalIdx, weekDays) ->
                                val w = originalIdx + 1
                                val weekStartDay = weekDays.first().dayNumber
                                val weekEndDay = weekDays.last().dayNumber
                                val workDays = weekDays.count { !it.isDayOff }
                                val otHours = weekDays.filter { !it.isDayOff }.sumOf { it.overtimeHours }
                                val normalHours = weekDays.filter { !it.isDayOff }.sumOf { kotlin.math.max(0.0, it.workDurationHours - it.overtimeHours) }
                                val isAllOff = workDays == 0
                                val isExpanded = expandedWeekIndex == originalIdx

                                if (isAllOff) {
                                    // ==========================================
                                    // Tampilan Khusus Kartu Minggu FIELD BREAK
                                    // ==========================================
                                    val fbWeekNum = w - totalOnSiteWeeks
                                    Surface(
                                        color = colors.tealBg,
                                        shape = RoundedCornerShape(12.dp),
                                        border = BorderStroke(1.2.dp, colors.teal.copy(alpha = 0.6f)),
                                        modifier = Modifier.fillMaxWidth().clickable {
                                            expandedWeekIndex = if (isExpanded) null else originalIdx
                                        }
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Column(modifier = Modifier.weight(1f)) {
                                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                        Text(
                                                            "Minggu ke-$w (Cuti)",
                                                            fontSize = 11.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = colors.teal,
                                                            maxLines = 1,
                                                            overflow = TextOverflow.Ellipsis
                                                        )
                                                        Text("• Hr $weekStartDay-$weekEndDay", fontSize = 9.sp, color = colors.textMuted, maxLines = 1)
                                                    }
                                                    Text(
                                                        "7 Hari Libur • 0j Kerja • Tiket PP & Upah Dibayar",
                                                        fontSize = 9.5.sp,
                                                        color = colors.textSecondary,
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis
                                                    )
                                                }

                                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                    Surface(
                                                        color = colors.teal,
                                                        shape = RoundedCornerShape(6.dp)
                                                    ) {
                                                        Text(
                                                            text = "🌴 OFF (0j)",
                                                            fontSize = 8.5.sp,
                                                            fontWeight = FontWeight.ExtraBold,
                                                            color = Color.White,
                                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                                        )
                                                    }
                                                    Icon(
                                                        imageVector = if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                                        contentDescription = null,
                                                        tint = colors.teal,
                                                        modifier = Modifier.size(18.dp)
                                                    )
                                                }
                                            }

                                            // Rincian 7 Hari dalam Minggu Field Break
                                            if (isExpanded) {
                                                HorizontalDivider(color = colors.teal.copy(alpha = 0.3f), thickness = 0.8.dp)
                                                Text("Rincian 7 Hari Libur Penuh Minggu ke-$w (Ketuk kartu untuk menutup):", fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = colors.teal)
                                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                    weekDays.forEach { dayItem ->
                                                        Surface(
                                                            color = colors.background.copy(alpha = 0.85f),
                                                            shape = RoundedCornerShape(8.dp),
                                                            border = BorderStroke(0.8.dp, colors.teal.copy(alpha = 0.25f)),
                                                            modifier = Modifier.fillMaxWidth()
                                                        ) {
                                                            Row(
                                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                                verticalAlignment = Alignment.CenterVertically
                                                            ) {
                                                                Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                                    Text("🌴", fontSize = 14.sp)
                                                                    Column {
                                                                        Text(dayItem.dayName, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                                                        Text(dayItem.notes, fontSize = 8.5.sp, color = colors.textMuted)
                                                                    }
                                                                }
                                                                Surface(
                                                                    color = colors.tealBg,
                                                                    shape = RoundedCornerShape(5.dp),
                                                                    border = BorderStroke(0.8.dp, colors.teal.copy(alpha = 0.4f))
                                                                ) {
                                                                    Text(
                                                                        text = "🌴 OFF (0j)",
                                                                        fontSize = 8.5.sp,
                                                                        fontWeight = FontWeight.Bold,
                                                                        color = colors.teal,
                                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                                    )
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    // ==========================================
                                    // Tampilan Kartu Minggu ON SITE
                                    // ==========================================
                                    Surface(
                                        color = colors.primaryCardBg,
                                        shape = RoundedCornerShape(12.dp),
                                        border = BorderStroke(1.dp, colors.primary.copy(alpha = 0.25f)),
                                        modifier = Modifier.fillMaxWidth().clickable {
                                            expandedWeekIndex = if (isExpanded) null else originalIdx
                                        }
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Column(modifier = Modifier.weight(1f)) {
                                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                        Text(
                                                            "Minggu ke-$w (ON)",
                                                            fontSize = 11.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = colors.textPrimary,
                                                            maxLines = 1,
                                                            overflow = TextOverflow.Ellipsis
                                                        )
                                                        Text("• Hr $weekStartDay-$weekEndDay", fontSize = 9.sp, color = colors.textMuted, maxLines = 1)
                                                    }
                                                    Text(
                                                        text = "$workDays Hari Kerja • ${normalHours.toInt()}j Normal" + (if (otHours > 0) " + ${otHours.toInt()}j Lembur" else " • 0j Lembur"),
                                                        fontSize = 9.5.sp,
                                                        color = colors.textSecondary,
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis
                                                    )
                                                }

                                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                    Surface(
                                                        color = if (otHours > 0) colors.amberBg else colors.primaryContainer,
                                                        shape = RoundedCornerShape(6.dp)
                                                    ) {
                                                        Text(
                                                            text = if (otHours > 0) "⏱️ ON (+${otHours.toInt()}j OT)" else "⛏️ ON (40j)",
                                                            fontSize = 8.5.sp,
                                                            fontWeight = FontWeight.ExtraBold,
                                                            color = if (otHours > 0) colors.amber else colors.onPrimaryContainer,
                                                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.5.dp)
                                                        )
                                                    }
                                                    Icon(
                                                        imageVector = if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                                        contentDescription = null,
                                                        tint = colors.textSecondary,
                                                        modifier = Modifier.size(18.dp)
                                                    )
                                                }
                                            }

                                            // Rincian 7 Hari dalam Minggu On Site yang diklik
                                            if (isExpanded) {
                                                HorizontalDivider(color = colors.outline.copy(alpha = 0.15f), thickness = 0.8.dp)
                                                Text("Rincian Harian Minggu ke-$w (Ketuk kartu untuk menutup):", fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = colors.primary)
                                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                    weekDays.forEach { dayItem ->
                                                        Surface(
                                                            color = if (dayItem.isDayOff) colors.surfaceVariant else colors.background,
                                                            shape = RoundedCornerShape(8.dp),
                                                            modifier = Modifier.fillMaxWidth()
                                                        ) {
                                                            Row(
                                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                                verticalAlignment = Alignment.CenterVertically
                                                            ) {
                                                                Column(modifier = Modifier.weight(1f)) {
                                                                    Text(dayItem.dayName, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                                                    Text(dayItem.notes, fontSize = 8.5.sp, color = colors.textMuted)
                                                                }
                                                                Surface(
                                                                    color = if (dayItem.isDayOff) colors.inactiveChipBg else when (dayItem.shiftType) {
                                                                        WorkShiftType.SHIFT_PAGI -> colors.amberBg
                                                                        WorkShiftType.SHIFT_SORE -> colors.tealBg
                                                                        WorkShiftType.SHIFT_MALAM -> colors.indigoBg
                                                                        WorkShiftType.LONG_SHIFT -> colors.primaryContainer
                                                                        else -> colors.primaryContainer
                                                                    },
                                                                    shape = RoundedCornerShape(5.dp)
                                                                ) {
                                                                    Text(
                                                                        text = if (dayItem.isDayOff) "🌴 OFF" else when (dayItem.shiftType) {
                                                                            WorkShiftType.SHIFT_PAGI -> "☀️ Pagi"
                                                                            WorkShiftType.SHIFT_SORE -> "🌅 Sore"
                                                                            WorkShiftType.SHIFT_MALAM -> "🌙 Malam"
                                                                            WorkShiftType.LONG_SHIFT -> "⏱️ Long 12j"
                                                                            else -> "Kerja"
                                                                        },
                                                                        fontSize = 8.5.sp,
                                                                        fontWeight = FontWeight.SemiBold,
                                                                        color = if (dayItem.isDayOff) colors.inactiveChipText else when (dayItem.shiftType) {
                                                                            WorkShiftType.SHIFT_PAGI -> colors.amber
                                                                            WorkShiftType.SHIFT_SORE -> colors.teal
                                                                            WorkShiftType.SHIFT_MALAM -> colors.indigo
                                                                            WorkShiftType.LONG_SHIFT -> colors.onPrimaryContainer
                                                                            else -> colors.onPrimaryContainer
                                                                        },
                                                                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                                                    )
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        // Tampilan Harian
                        val displayedItems = if (currentRosterItems.size > 14 && !expandedDailyDays) currentRosterItems.take(14) else currentRosterItems
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            displayedItems.forEach { item ->
                                val isFieldBreak = item.isDayOff && item.notes.contains("Field Break", ignoreCase = true)
                                Surface(
                                    color = if (isFieldBreak) colors.tealBg else if (item.isDayOff) colors.surfaceVariant else colors.primaryCardBg,
                                    shape = RoundedCornerShape(10.dp),
                                    border = if (isFieldBreak) BorderStroke(1.dp, colors.teal.copy(alpha = 0.45f)) else if (item.isDayOff) BorderStroke(1.dp, colors.outline.copy(alpha = 0.3f)) else null,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(item.dayName, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = if (isFieldBreak) colors.teal else colors.textPrimary)
                                            Text(item.notes, fontSize = 9.5.sp, color = colors.textMuted)
                                        }
                                        Surface(
                                            color = if (isFieldBreak) colors.teal else if (item.isDayOff) colors.inactiveChipBg else when (item.shiftType) {
                                                WorkShiftType.SHIFT_PAGI -> colors.amberBg
                                                WorkShiftType.SHIFT_SORE -> colors.tealBg
                                                WorkShiftType.SHIFT_MALAM -> colors.indigoBg
                                                WorkShiftType.LONG_SHIFT -> colors.primaryContainer
                                                else -> colors.primaryContainer
                                            },
                                            shape = RoundedCornerShape(6.dp)
                                        ) {
                                            Text(
                                                text = if (isFieldBreak) "🌴 Field Break" else if (item.isDayOff) "🌴 OFF (Libur)" else when (item.shiftType) {
                                                    WorkShiftType.SHIFT_PAGI -> "☀️ Pagi (07-15)"
                                                    WorkShiftType.SHIFT_SORE -> "🌅 Sore (15-23)"
                                                    WorkShiftType.SHIFT_MALAM -> "🌙 Malam (23-07)"
                                                    WorkShiftType.LONG_SHIFT -> "⏱️ Long (12 Jam)"
                                                    else -> "Kerja"
                                                },
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = if (isFieldBreak) Color.White else if (item.isDayOff) colors.inactiveChipText else when (item.shiftType) {
                                                    WorkShiftType.SHIFT_PAGI -> colors.amber
                                                    WorkShiftType.SHIFT_SORE -> colors.teal
                                                    WorkShiftType.SHIFT_MALAM -> colors.indigo
                                                    WorkShiftType.LONG_SHIFT -> colors.onPrimaryContainer
                                                    else -> colors.onPrimaryContainer
                                                },
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                            )
                                        }
                                    }
                                }
                            }

                            if (currentRosterItems.size > 14) {
                                TextButton(
                                    onClick = { expandedDailyDays = !expandedDailyDays },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        if (expandedDailyDays) "Tampilkan Lebih Sedikit" else "Tampilkan Semua ${currentRosterItems.size} Hari Siklus",
                                        fontSize = 10.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.primary
                                    )
                                }
                            }
                        }
                    }

                    // Kepatuhan Regulasi Ketenagakerjaan Roster
                    Surface(
                        color = colors.surfaceVariant,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Default.Gavel, contentDescription = null, tint = colors.primary, modifier = Modifier.size(13.dp))
                                Text("Dasar Hukum Roster & Jam Kerja:", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                            }
                            Text(rosterSummary.legalReference, fontSize = 9.5.sp, fontWeight = FontWeight.Medium, color = colors.textPrimary)
                            Text(rosterSummary.description, fontSize = 9.sp, color = colors.textSecondary, lineHeight = 13.sp)
                        }
                    }

                    // Tombol Salin Roster
                    OutlinedButton(
                        onClick = {
                            val rosterText = StringBuilder().apply {
                                appendLine("📋 JADWAL SIKLUS ${selectedRosterPattern.displayName}")
                                appendLine("Dasar Hukum: ${selectedRosterPattern.legalReference}")
                                appendLine("Total Siklus: ${rosterSummary.totalCycleDays} Hari (${rosterSummary.totalWorkDays} On, ${rosterSummary.totalOffDays} Off)")
                                appendLine("----------------------------------")
                                currentRosterItems.forEach {
                                    val status = if (it.isDayOff) "OFF / Libur" else "${it.shiftType.displayName} (${it.workDurationHours} Jam)"
                                    appendLine("${it.dayName}: $status")
                                }
                            }.toString()

                            clipboardManager.setText(AnnotatedString(rosterText))
                            Toast.makeText(context, "Jadwal ${selectedRosterPattern.displayName} disalin ke clipboard!", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, colors.primary)
                    ) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp), tint = colors.primary)
                        Spacer(Modifier.width(6.dp))
                        Text("Salin Jadwal Roster ke Clipboard", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                    }
                }
            }
        }

        // 5. Ad Banner Placeholder
        item {
            AdBannerPlaceholder(
                isProUser = isProUser,
                onUpgradeClick = onOpenProDialog
            )
        }

        // 6. Legal Disclaimer Card
        item {
            LegalDisclaimerCard()
        }
    }

    // Modal Dialog: Menu Edit Jam Kerja & Shift
    if (showEditScheduleDialog) {
        EditWorkScheduleShiftDialog(
            userProfile = userProfile,
            onDismiss = { showEditScheduleDialog = false },
            onSave = { updatedProfile ->
                onSaveProfile(updatedProfile)
                showEditScheduleDialog = false
                Toast.makeText(context, "Pengaturan Jam Kerja & Shift berhasil disimpan ke Profil!", Toast.LENGTH_SHORT).show()
            }
        )
    }
}

/**
 * Dialog Komprehensif Menu Edit Jam Kerja & Shift Karyawan.
 * Memungkinkan pemilihan Skema Hari Kerja (5HK vs 6HK), Shift Default, Tunjangan Shift,
 * serta Preset Cepat Industri.
 */
@Composable
fun EditWorkScheduleShiftDialog(
    userProfile: UserProfile,
    onDismiss: () -> Unit,
    onSave: (UserProfile) -> Unit
) {
    val colors = GajikuTheme.colors

    var scheme by remember { mutableStateOf(userProfile.workScheduleScheme) }
    var defaultShift by remember { mutableStateOf(userProfile.defaultShiftType) }
    var shiftAllowanceStr by remember {
        mutableStateOf(if (userProfile.shiftAllowance > 0) userProfile.shiftAllowance.toLong().toString() else "0")
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = colors.surfaceCard,
        titleContentColor = colors.textPrimary,
        textContentColor = colors.textPrimary,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Default.Tune,
                    contentDescription = null,
                    tint = colors.primary
                )
                Text(
                    "Edit Jam Kerja & Shift",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary
                )
            }
        },
        text = {
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Info Subtitle
                item {
                    Text(
                        "Atur skema jam kerja resmi, shift utama, dan tunjangan shift untuk menghitung upah harian serta lembur otomatis.",
                        fontSize = 11.sp,
                        color = colors.textMuted
                    )
                }

                // Preset Cepat Industri
                item {
                    Text(
                        "Preset Cepat Industri:",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.primary
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(
                            Triple("⭐ Roster 8:2 Site & Pabrik (8 On, 2 Off)", "5_DAYS", "SHIFT_PAGI"),
                            Triple("🏢 Standar Kantor (5HK / 8 Jam)", "5_DAYS", "REGULAR"),
                            Triple("🏭 Pabrik / Manufaktur (3 Shift 24/7)", "5_DAYS", "SHIFT_PAGI"),
                            Triple("🚜 Tambang / Site (12 Jam Long Shift)", "5_DAYS", "LONG_SHIFT"),
                            Triple("🏬 Retail / Toko (6HK / 7 Jam)", "6_DAYS", "REGULAR")
                        ).forEach { (presetName, targetScheme, targetShift) ->
                            Surface(
                                color = colors.surfaceVariant,
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, colors.outline.copy(alpha = 0.3f)),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        scheme = targetScheme
                                        defaultShift = targetShift
                                    }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(presetName, fontSize = 10.5.sp, fontWeight = FontWeight.Medium, color = colors.textPrimary)
                                    Icon(Icons.Default.Check, contentDescription = null, tint = colors.primary, modifier = Modifier.size(14.dp))
                                }
                            }
                        }
                    }
                }

                // 1. Skema Hari Kerja Mingguan (PP 35/2021)
                item {
                    Text(
                        "Skema Waktu Kerja (PP 35/2021 Pasal 21):",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.primary
                    )
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(
                            "5_DAYS" to "5 Hari Kerja\n(8 Jam/hari - 40j/mgg)",
                            "6_DAYS" to "6 Hari Kerja\n(7 Jam/hari - 40j/mgg)"
                        ).forEach { (itemScheme, label) ->
                            val isSelected = scheme == itemScheme
                            Surface(
                                color = if (isSelected) colors.primaryContainer else colors.inactiveChipBg,
                                shape = RoundedCornerShape(10.dp),
                                border = BorderStroke(1.dp, if (isSelected) colors.primary else colors.inactiveChipBorder),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { scheme = itemScheme }
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 10.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) colors.onPrimaryContainer else colors.inactiveChipText,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 8.dp, horizontal = 4.dp)
                                )
                            }
                        }
                    }
                }

                // 2. Shift Utama / Default Karyawan
                item {
                    Text(
                        "Pola Shift Utama Karyawan:",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.primary
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(
                            "REGULAR" to "Non-Shift Regular (08:00 - 17:00)",
                            "SHIFT_PAGI" to "Shift 1 Pagi (07:00 - 15:00)",
                            "SHIFT_SORE" to "Shift 2 Sore (15:00 - 23:00)",
                            "SHIFT_MALAM" to "Shift 3 Malam (23:00 - 07:00) + Nutrisi",
                            "LONG_SHIFT" to "Long Shift 12 Jam (8j Normal + 4j Lembur)"
                        ).forEach { (shiftKey, label) ->
                            val isSelected = defaultShift == shiftKey
                            Surface(
                                color = if (isSelected) colors.primaryContainer else colors.surfaceVariant,
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, if (isSelected) colors.primary else colors.outline.copy(alpha = 0.3f)),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { defaultShift = shiftKey }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = label,
                                        fontSize = 10.5.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                        color = if (isSelected) colors.onPrimaryContainer else colors.textPrimary
                                    )
                                    if (isSelected) {
                                        Icon(
                                            Icons.Default.CheckCircle,
                                            contentDescription = null,
                                            tint = colors.primary,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // 3. Tunjangan Shift per Hari
                item {
                    OutlinedTextField(
                        value = shiftAllowanceStr,
                        onValueChange = { shiftAllowanceStr = it },
                        label = { Text("Tunjangan / Premi Shift per Hari (Rp)", fontSize = 11.sp) },
                        supportingText = { Text("Tambahan upah per kehadiran shift (bila ada).", fontSize = 9.sp) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        colors = com.example.ui.components.highContrastTextFieldColors()
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val allowance = shiftAllowanceStr.toDoubleOrNull() ?: 0.0
                    val updated = userProfile.copy(
                        workScheduleScheme = scheme,
                        defaultShiftType = defaultShift,
                        shiftAllowance = allowance
                    )
                    onSave(updated)
                },
                colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
            ) {
                Text(
                    "Simpan ke Profil",
                    color = colors.onPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Batal", color = colors.textMuted)
            }
        }
    )
}
