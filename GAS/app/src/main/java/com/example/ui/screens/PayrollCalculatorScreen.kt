package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.AppSettings
import com.example.data.model.MonthlyPayrollHistory
import com.example.data.model.OvertimeLog
import com.example.data.model.UserProfile
import com.example.domain.calculator.IndonesianPayrollCalculators
import com.example.domain.util.Formatters
import com.example.ui.CurrentCalculationInput
import com.example.ui.components.AdBannerPlaceholder
import com.example.ui.components.AttendanceAllowanceCalculatorDialog
import com.example.ui.components.AttendanceCalculatorMode
import com.example.ui.components.LegalDisclaimerCard
import com.example.ui.theme.*

@Composable
fun PayrollCalculatorScreen(
    userProfile: UserProfile,
    appSettings: AppSettings,
    calculationInput: CurrentCalculationInput,
    payrollHistories: List<MonthlyPayrollHistory>,
    overtimeLogs: List<OvertimeLog> = emptyList(),
    attendanceRecords: List<com.example.data.model.AttendanceRecord> = emptyList(),
    onUpdateInput: ((CurrentCalculationInput) -> CurrentCalculationInput) -> Unit,
    onCalculateAndSave: suspend () -> MonthlyPayrollHistory,
    onSelectPayrollDetail: (MonthlyPayrollHistory) -> Unit,
    onDeletePayroll: (Long) -> Unit,
    onOpenProDialog: () -> Unit
) {
    val colors = GajikuTheme.colors
    val coroutineScope = rememberCoroutineScope()
    var isHistoryView by remember { mutableStateOf(false) }
    var showHmCalcDialog by remember { mutableStateOf(false) }
    var hmHoursInput by remember { mutableStateOf("") }
    var hmRateInput by remember { mutableStateOf("") }
    var showRitaseCalcDialog by remember { mutableStateOf(false) }
    var ritaseTripsInput by remember { mutableStateOf("") }
    var ritaseRateInput by remember { mutableStateOf("") }
    var showAttendanceCalcDialog by remember { mutableStateOf(false) }
    var attendanceCalcMode by remember { mutableStateOf(AttendanceCalculatorMode.MEAL_ONLY) }

    // Log ritase/HM dari Overtime Tracker untuk periode (bulan/tahun) yang sedang dipilih,
    // supaya bisa ditarik otomatis ke Kalkulator Ritase/HM alih-alih diketik ulang manual.
    val monthPrefixForLogs = "%04d-%02d".format(calculationInput.selectedYear, calculationInput.selectedMonth)
    val logsThisMonth = overtimeLogs.filter { it.date.startsWith(monthPrefixForLogs) }
    
    val attendanceInMonth = remember(attendanceRecords, monthPrefixForLogs) {
        attendanceRecords.filter { it.date.startsWith(monthPrefixForLogs) }
    }
    val defaultAttendanceDays = remember(attendanceInMonth) {
        if (attendanceInMonth.isNotEmpty()) {
            attendanceInMonth.count { it.status == "HADIR" || it.status == "TERLAMBAT" }
        } else {
            0
        }
    }

    val isPerAttendanceMode = userProfile.allowanceCalculationMode == "PER_ATTENDANCE"
    val defaultMeal = if (isPerAttendanceMode) {
        val hariMakan = attendanceInMonth.count { it.isMealEligible }
        hariMakan * userProfile.mealAllowancePerDay
    } else {
        userProfile.mealAllowance
    }
    val defaultTransport = if (isPerAttendanceMode) {
        val hariTransport = attendanceInMonth.count { it.isTransportEligible }
        hariTransport * userProfile.transportAllowancePerDay
    } else {
        userProfile.transportAllowance
    }

    val basicSalary = calculationInput.customBasicSalary ?: userProfile.basicSalary
    val fixedAllowance = calculationInput.customFixedAllowance ?: userProfile.fixedAllowance
    val variableAllowance = calculationInput.customVariableAllowance ?: userProfile.variableAllowance
    val mealAllowance = calculationInput.customMealAllowance ?: defaultMeal
    val transportAllowance = calculationInput.customTransportAllowance ?: defaultTransport
    val phoneAllowance = calculationInput.customPhoneAllowance ?: userProfile.phoneAllowance
    val remoteAreaAllowance = calculationInput.customRemoteAreaAllowance ?: userProfile.remoteAreaAllowance
    val ritasePay = calculationInput.customRitasePay ?: userProfile.ritasePay
    val hmPay = calculationInput.customHmPay ?: userProfile.hmPay
    
    val autoRitaseCountFromLogs = logsThisMonth.sumOf { it.ritaseCount }
    val autoRitasePayFromLogs = logsThisMonth.sumOf { it.ritaseCount * it.ritaseRate }
    val autoHmTotalFromLogs = logsThisMonth.sumOf { it.hmTotal }
    val incentivePay = calculationInput.customIncentivePay ?: userProfile.incentivePay

    val enableKes = calculationInput.customIsBpjsKesEnabled ?: userProfile.isBpjsKesEnabled
    val enableJht = calculationInput.customIsBpjsJhtEnabled ?: userProfile.isBpjsJhtEnabled
    val enableJp = calculationInput.customIsBpjsJpEnabled ?: userProfile.isBpjsJpEnabled
    val enablePph21 = calculationInput.customIsPph21Enabled ?: userProfile.isPph21Enabled

    // Dasar Upah Tetap untuk perhitungan Lembur & BPJS (Gaji Pokok + Tunjangan Tetap + Remote Area)
    val fixedSalary = basicSalary + fixedAllowance + remoteAreaAllowance
    val hourlyRate = IndonesianPayrollCalculators.calculateHourlyRate(fixedSalary)

    val otResult = IndonesianPayrollCalculators.calculateOvertime(
        hours = calculationInput.overtimeHours,
        totalFixedSalary = fixedSalary,
        dayType = calculationInput.overtimeDayType
    )

    // Total Penghasilan Bruto (Komponen Pokok + Tunjangan + Ritase + HM + Insentif + Lembur + Bonus)
    val totalAllowances = fixedAllowance + variableAllowance + mealAllowance + transportAllowance + phoneAllowance + remoteAreaAllowance + ritasePay + hmPay + incentivePay
    val grossSalary = basicSalary + totalAllowances + otResult.totalAmount + calculationInput.bonusOrThr

    val bpjs = IndonesianPayrollCalculators.calculateBpjs(
        fixedSalary = fixedSalary,
        bpjsKesCap = appSettings.bpjsKesSalaryCap,
        bpjsJpCap = appSettings.bpjsJpSalaryCap,
        jkkRatePercent = appSettings.jkkRate,
        jkmRatePercent = appSettings.jkmRate,
        enableKes = enableKes,
        enableJht = enableJht,
        enableJp = enableJp
    )

    val terCategory = if (userProfile.terCategoryOverride.isNotBlank()) userProfile.terCategoryOverride else IndonesianPayrollCalculators.determineTerCategory(userProfile.ptkpStatus)
    val (monthlyTerRate, monthlyPph21) = IndonesianPayrollCalculators.calculateMonthlyTerPph21(
        grossSalary = grossSalary,
        terCategory = terCategory,
        hasNpwp = userProfile.hasNpwp
    )

    val decResult = if (enablePph21 && calculationInput.isDecemberRecalculation) {
        val annualGross = grossSalary * 12
        val annualPension = (bpjs.bpjsJhtEmployee + bpjs.bpjsJpEmployee) * 12
        IndonesianPayrollCalculators.calculateDecemberPph21(
            annualGrossSalary = annualGross,
            ptkpStatus = userProfile.ptkpStatus,
            annualEmployeePensionDeduction = annualPension,
            pph21PaidJanNov = calculationInput.pph21PaidJanNov,
            hasNpwp = userProfile.hasNpwp
        )
    } else null

    val livePph21 = if (enablePph21) {
        if (calculationInput.isDecemberRecalculation) decResult?.pph21DecemberDue ?: 0.0 else monthlyPph21
    } else 0.0

    val liveEffectiveRate = if (enablePph21) {
        if (calculationInput.isDecemberRecalculation) {
            if (grossSalary > 0) livePph21 / grossSalary else 0.0
        } else monthlyTerRate
    } else 0.0

    val totalCustomDeductions = calculationInput.customKasbon + calculationInput.customLate + calculationInput.customOther
    val totalDeductions = bpjs.totalEmployeeDeduction + livePph21 + totalCustomDeductions
    val liveTakeHomePay = grossSalary - totalDeductions

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 28.dp)
    ) {
        // Toggle Calculator / Riwayat
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colors.surfaceVariant, RoundedCornerShape(16.dp))
                    .padding(4.dp)
            ) {
                Surface(
                    color = if (!isHistoryView) colors.primaryContainer else colors.inactiveChipBg,
                    shape = RoundedCornerShape(12.dp),
                    border = CardDefaults.outlinedCardBorder().copy(
                        brush = SolidColor(
                            if (!isHistoryView) colors.primary else colors.inactiveChipBorder
                        )
                    ),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { isHistoryView = false }
                ) {
                    Text(
                        text = "Kalkulator Gaji",
                        color = if (!isHistoryView) colors.onPrimaryContainer else colors.inactiveChipText,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = Modifier.padding(vertical = 10.dp)
                    )
                }
                Spacer(modifier = Modifier.width(6.dp))
                Surface(
                    color = if (isHistoryView) colors.primaryContainer else colors.inactiveChipBg,
                    shape = RoundedCornerShape(12.dp),
                    border = CardDefaults.outlinedCardBorder().copy(
                        brush = SolidColor(
                            if (isHistoryView) colors.primary else colors.inactiveChipBorder
                        )
                    ),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { isHistoryView = true }
                ) {
                    Text(
                        text = "Riwayat Slip Gaji (${payrollHistories.size})",
                        color = if (isHistoryView) colors.onPrimaryContainer else colors.inactiveChipText,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = Modifier.padding(vertical = 10.dp)
                    )
                }
            }
        }

        if (isHistoryView) {
            // HISTORY LIST VIEW
            if (payrollHistories.isEmpty()) {
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
                        Column(
                            modifier = Modifier.padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.ReceiptLong, contentDescription = null, tint = colors.textMuted, modifier = Modifier.size(40.dp))
                            Text("Belum Ada Riwayat", fontWeight = FontWeight.Bold, color = colors.textPrimary)
                            Text("Hitung dan simpan slip gaji Anda pada tab Kalkulator Gaji.", fontSize = 11.5.sp, color = colors.textMuted, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                        }
                    }
                }
            } else {
                items(payrollHistories.size) { idx ->
                    val item = payrollHistories[idx]
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelectPayrollDetail(item) },
                        shape = RoundedCornerShape(20.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                        colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                        border = if (colors.isDark) {
                            CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder))
                        } else null
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Icon(Icons.Default.Receipt, contentDescription = null, tint = colors.primary, modifier = Modifier.size(20.dp))
                                    Text(item.periodLabel, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, color = colors.textPrimary)
                                }
                                IconButton(
                                    onClick = { onDeletePayroll(item.id) },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = colors.error, modifier = Modifier.size(16.dp))
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text("Gaji Bruto", fontSize = 10.5.sp, color = colors.textMuted)
                                    Text(Formatters.formatRupiah(item.grossSalary), fontSize = 13.sp, color = colors.textSecondary)
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text("Take Home Pay", fontSize = 10.5.sp, color = colors.textMuted)
                                    Text(Formatters.formatRupiah(item.netTakeHomePay), fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = colors.success)
                                }
                            }

                            HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                if (item.isPph21Enabled && item.pph21Amount > 0) {
                                    Text("PPh 21: ${Formatters.formatRupiah(item.pph21Amount)} (${item.terCategory})", fontSize = 10.5.sp, color = colors.error)
                                } else {
                                    Text("PPh 21: Nonaktif / Rp 0", fontSize = 10.5.sp, color = colors.success)
                                }
                                Text("BPJS: ${Formatters.formatRupiah(item.totalBpjsEmployee)}", fontSize = 10.5.sp, color = colors.primary)
                            }
                        }
                    }
                }
            }
        } else {
            // CALCULATOR INPUT FORM
            // 1. 7 Salary Components Overview Card
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
                    Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("7 KOMPONEN GAJI AKTIF", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                            Text("Edit di Tab Profil", fontSize = 10.5.sp, color = colors.textMuted)
                        }

                        // Component Grid
                        Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("1. Gaji Pokok:", fontSize = 11.sp, color = colors.textMuted)
                                Text(Formatters.formatRupiah(basicSalary), fontSize = 12.sp, fontWeight = FontWeight.Medium, color = colors.textPrimary)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("2. Tunjangan Tetap:", fontSize = 11.sp, color = colors.textMuted)
                                Text(Formatters.formatRupiah(fixedAllowance), fontSize = 12.sp, fontWeight = FontWeight.Medium, color = colors.textPrimary)
                            }
                            if (variableAllowance > 0) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("3. Tunjangan Tidak Tetap:", fontSize = 11.sp, color = colors.textMuted)
                                    Text(Formatters.formatRupiah(variableAllowance), fontSize = 12.sp, fontWeight = FontWeight.Medium, color = colors.textPrimary)
                                }
                            }
                            if (mealAllowance > 0) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("4. Makan:", fontSize = 11.sp, color = colors.textMuted)
                                    Text(Formatters.formatRupiah(mealAllowance), fontSize = 12.sp, fontWeight = FontWeight.Medium, color = colors.textPrimary)
                                }
                            }
                            if (transportAllowance > 0) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("5. Transport:", fontSize = 11.sp, color = colors.textMuted)
                                    Text(Formatters.formatRupiah(transportAllowance), fontSize = 12.sp, fontWeight = FontWeight.Medium, color = colors.textPrimary)
                                }
                            }
                            if (phoneAllowance > 0) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("6. Pulsa:", fontSize = 11.sp, color = colors.textMuted)
                                    Text(Formatters.formatRupiah(phoneAllowance), fontSize = 12.sp, fontWeight = FontWeight.Medium, color = colors.textPrimary)
                                }
                            }
                            if (remoteAreaAllowance > 0) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("7. Remote Area:", fontSize = 11.sp, color = colors.textMuted)
                                    Text(Formatters.formatRupiah(remoteAreaAllowance), fontSize = 12.sp, fontWeight = FontWeight.Medium, color = colors.textPrimary)
                                }
                            }
                            if (ritasePay > 0) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("8. Ritase:", fontSize = 11.sp, color = colors.textMuted)
                                    Text(Formatters.formatRupiah(ritasePay), fontSize = 12.sp, fontWeight = FontWeight.Medium, color = colors.textPrimary)
                                }
                            }
                            if (hmPay > 0) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("9. HM (Hour Meter):", fontSize = 11.sp, color = colors.textMuted)
                                    Text(Formatters.formatRupiah(hmPay), fontSize = 12.sp, fontWeight = FontWeight.Medium, color = colors.textPrimary)
                                }
                            }
                            if (incentivePay > 0) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("10. Insentif:", fontSize = 11.sp, color = colors.textMuted)
                                    Text(Formatters.formatRupiah(incentivePay), fontSize = 12.sp, fontWeight = FontWeight.Medium, color = colors.textPrimary)
                                }
                            }
                        }

                        HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Upah Sejam (1/173 PP 35/2021):", fontSize = 10.5.sp, color = colors.textMuted)
                            Text(Formatters.formatRupiahDecimals(hourlyRate), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                        }
                    }
                }
            }

            // 2. Tunjangan Kehadiran, Ritase, HM, Insentif, Lembur & Bonus Inputs
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
                            title = "KEHADIRAN, RITASE, HM, LEMBUR & BONUS BULAN INI",
                            infoTitle = "Isi Transaksi Bulan Berjalan",
                            infoBody = "Gunakan bagian ini untuk menyesuaikan pendapatan variabel bulan berjalan yang tergantung absensi/aktivitas:\n\n" +
                                "• Uang Makan & Transport: Dihitung dari jumlah hari hadir × tarif harian (klik ikon kalkulator).\n" +
                                "• Ritase & HM: Klik ikon kalkulator untuk hitung trip atau jam alat berat.\n" +
                                "• Jam Lembur: Masukkan total jam lembur aktual bulan ini."
                        )

                        // Baris Uang Makan & Transport Bulan Ini (Berbasis Kehadiran)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = if (mealAllowance > 0) mealAllowance.toLong().toString() else "",
                                onValueChange = { str ->
                                    val amt = str.toDoubleOrNull() ?: 0.0
                                    onUpdateInput { it.copy(customMealAllowance = amt) }
                                },
                                label = { Text("Uang Makan (Rp)", fontSize = 11.sp) },
                                supportingText = { Text("Sesuai kehadiran", fontSize = 9.sp) },
                                trailingIcon = {
                                    IconButton(
                                        onClick = {
                                            attendanceCalcMode = AttendanceCalculatorMode.MEAL_ONLY
                                            showAttendanceCalcDialog = true
                                        }
                                    ) {
                                        Icon(
                                            Icons.Default.Calculate,
                                            contentDescription = "Kalkulator Uang Makan",
                                            tint = colors.primary,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f).testTag("calc_meal_allowance_input"),
                                colors = com.example.ui.components.highContrastTextFieldColors()
                            )
                            OutlinedTextField(
                                value = if (transportAllowance > 0) transportAllowance.toLong().toString() else "",
                                onValueChange = { str ->
                                    val amt = str.toDoubleOrNull() ?: 0.0
                                    onUpdateInput { it.copy(customTransportAllowance = amt) }
                                },
                                label = { Text("Transport (Rp)", fontSize = 11.sp) },
                                supportingText = { Text("Sesuai kehadiran", fontSize = 9.sp) },
                                trailingIcon = {
                                    IconButton(
                                        onClick = {
                                            attendanceCalcMode = AttendanceCalculatorMode.TRANSPORT_ONLY
                                            showAttendanceCalcDialog = true
                                        }
                                    ) {
                                        Icon(
                                            Icons.Default.Calculate,
                                            contentDescription = "Kalkulator Transport",
                                            tint = colors.primary,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f).testTag("calc_transport_allowance_input"),
                                colors = com.example.ui.components.highContrastTextFieldColors()
                            )
                        }

                        HorizontalDivider(color = colors.outline.copy(alpha = 0.4f), thickness = 0.8.dp)

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = if (ritasePay > 0) ritasePay.toLong().toString() else "",
                                onValueChange = { str ->
                                    val amt = str.toDoubleOrNull() ?: 0.0
                                    onUpdateInput { it.copy(customRitasePay = amt) }
                                },
                                label = { Text("Ritase (Rp)", fontSize = 11.sp) },
                                supportingText = { Text("Bonus trip/muatan.", fontSize = 9.sp) },
                                trailingIcon = {
                                    IconButton(
                                        onClick = { showRitaseCalcDialog = true }
                                    ) {
                                        Icon(
                                            Icons.Default.Calculate,
                                            contentDescription = "Kalkulator Ritase",
                                            tint = colors.primary,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f),
                                colors = com.example.ui.components.highContrastTextFieldColors()
                            )
                            OutlinedTextField(
                                value = if (hmPay > 0) hmPay.toLong().toString() else "",
                                onValueChange = { str ->
                                    val amt = str.toDoubleOrNull() ?: 0.0
                                    onUpdateInput { it.copy(customHmPay = amt) }
                                },
                                label = { Text("HM / Hour Meter (Rp)", fontSize = 11.sp) },
                                supportingText = { Text("Premi jam alat berat.", fontSize = 9.sp) },
                                trailingIcon = {
                                    IconButton(
                                        onClick = { showHmCalcDialog = true }
                                    ) {
                                        Icon(
                                            Icons.Default.Calculate,
                                            contentDescription = "Kalkulator Jam HM",
                                            tint = colors.primary,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f),
                                colors = com.example.ui.components.highContrastTextFieldColors()
                            )
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = if (incentivePay > 0) incentivePay.toLong().toString() else "",
                                onValueChange = { str ->
                                    val amt = str.toDoubleOrNull() ?: 0.0
                                    onUpdateInput { it.copy(customIncentivePay = amt) }
                                },
                                label = { Text("Insentif (Rp)", fontSize = 11.sp) },
                                supportingText = { Text("Bonus performa/target.", fontSize = 9.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f),
                                colors = com.example.ui.components.highContrastTextFieldColors()
                            )
                            OutlinedTextField(
                                value = if (calculationInput.bonusOrThr > 0) calculationInput.bonusOrThr.toLong().toString() else "",
                                onValueChange = { str ->
                                    val bonus = str.toDoubleOrNull() ?: 0.0
                                    onUpdateInput { it.copy(bonusOrThr = bonus) }
                                },
                                label = { Text("Bonus / THR (Rp)", fontSize = 11.sp) },
                                supportingText = { Text("Bonus/THR bulan ini.", fontSize = 9.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f),
                                colors = com.example.ui.components.highContrastTextFieldColors()
                            )
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = if (calculationInput.overtimeHours > 0) calculationInput.overtimeHours.toString() else "",
                                onValueChange = { str ->
                                    val hours = str.toDoubleOrNull() ?: 0.0
                                    onUpdateInput { it.copy(overtimeHours = hours) }
                                },
                                label = { Text("Jam Lembur", fontSize = 11.sp) },
                                supportingText = { Text("Total jam lembur bulan ini, dihitung otomatis ke rupiah.", fontSize = 9.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("overtime_hours_input"),
                                colors = com.example.ui.components.highContrastTextFieldColors()
                            )
                        }

                        // Day type selector for overtime
                        Text(
                            text = "Jenis hari lembur (menentukan pengali upah lembur):",
                            fontSize = 10.5.sp,
                            color = colors.textMuted
                        )
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(
                                "WORKDAY" to "Hari Kerja",
                                "HOLIDAY_5_DAYS" to "Libur (5HK)",
                                "HOLIDAY_6_DAYS" to "Libur (6HK)"
                            ).forEach { (type, label) ->
                                val isSelected = calculationInput.overtimeDayType == type
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
                                        .clickable { onUpdateInput { it.copy(overtimeDayType = type) } }
                                ) {
                                    Text(
                                        text = label,
                                        fontSize = 10.5.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isSelected) colors.onPrimaryContainer else colors.inactiveChipText,
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                        modifier = Modifier.padding(vertical = 8.dp)
                                    )
                                }
                            }
                        }

                        if (otResult.totalAmount > 0) {
                            Text(
                                text = "Hasil Upah Lembur: ${Formatters.formatRupiah(otResult.totalAmount)} (${otResult.multiplierHours} jam bayar)",
                                fontSize = 11.5.sp,
                                color = colors.success,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            // 3. Potongan BPJS Optional Card
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
                        Text("POTONGAN BPJS (OPSIONAL)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("BPJS Kesehatan (1%)", fontSize = 12.5.sp, color = colors.textPrimary)
                                Text("Potongan karyawan (Cap Rp 12 Jt)", fontSize = 10.5.sp, color = colors.textMuted)
                            }
                            Switch(
                                checked = enableKes,
                                onCheckedChange = { checked ->
                                    onUpdateInput { it.copy(customIsBpjsKesEnabled = checked) }
                                },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = colors.onPrimaryContainer,
                                    checkedTrackColor = colors.primaryContainer
                                )
                            )
                        }

                        HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("BPJS TK: JHT (2%)", fontSize = 12.5.sp, color = colors.textPrimary)
                                Text("Jaminan Hari Tua karyawan", fontSize = 10.5.sp, color = colors.textMuted)
                            }
                            Switch(
                                checked = enableJht,
                                onCheckedChange = { checked ->
                                    onUpdateInput { it.copy(customIsBpjsJhtEnabled = checked) }
                                },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = colors.onPrimaryContainer,
                                    checkedTrackColor = colors.primaryContainer
                                )
                            )
                        }

                        HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("BPJS TK: Jaminan Pensiun (1%)", fontSize = 12.5.sp, color = colors.textPrimary)
                                Text("Jaminan Pensiun karyawan (Cap Rp 10.04 Jt)", fontSize = 10.5.sp, color = colors.textMuted)
                            }
                            Switch(
                                checked = enableJp,
                                onCheckedChange = { checked ->
                                    onUpdateInput { it.copy(customIsBpjsJpEnabled = checked) }
                                },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = colors.onPrimaryContainer,
                                    checkedTrackColor = colors.primaryContainer
                                )
                            )
                        }
                    }
                }
            }

            // 4. Tax Scheme Selector (TER vs Dec Annual Pasal 17) & Optional PPh 21
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
                            title = "SKEMA PAJAK PPH 21 (OPSIONAL)",
                            infoTitle = "TER vs Masa Desember, Apa Bedanya?",
                            infoBody = "Jan-Nov (TER): app memakai Tarif Efektif Rata-rata bulanan — cara paling sederhana & default yang benar untuk kebanyakan orang.\n\n" +
                                "Masa Desember: khusus bulan Desember (atau bulan terakhir kerja), pajak dihitung ulang setahun penuh pakai tarif progresif Pasal 17, lalu dikurangi pajak yang sudah dibayar Jan-Nov. Nyalakan toggle ini HANYA kalau Anda sedang menghitung gaji Desember."
                        )
                        Text(
                            text = "Status PTKP: ${userProfile.ptkpStatus} (${if (userProfile.hasNpwp) "NPWP Terdaftar" else "+20% Non-NPWP"})",
                            fontSize = 11.sp,
                            color = colors.textMuted
                        )

                        // Master Toggle for PPh 21
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Hitung Potongan PPh 21",
                                    fontSize = 12.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.textPrimary
                                )
                                Text(
                                    text = if (enablePph21) "PPh 21 dipotong dari penghasilan bulanan" else "Nonaktif (Bebas Pajak / Ditanggung Perusahaan / Gross-Up)",
                                    fontSize = 10.5.sp,
                                    color = if (enablePph21) colors.textMuted else colors.success
                                )
                            }
                            Switch(
                                checked = enablePph21,
                                onCheckedChange = { checked ->
                                    onUpdateInput { it.copy(customIsPph21Enabled = checked) }
                                },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = colors.onPrimaryContainer,
                                    checkedTrackColor = colors.primaryContainer
                                )
                            )
                        }

                        AnimatedVisibility(visible = enablePph21) {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = if (calculationInput.isDecemberRecalculation) "Masa Desember (Annual Recalculation)" else "Masa Jan-Nov (TER PP 58/2023)",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = colors.textPrimary
                                        )
                                        Text(
                                            text = if (calculationInput.isDecemberRecalculation) "Tarif Progresif Pasal 17 UU HPP Setahun Penuh" else "Tarif Efektif Rata-Rata Kategori $terCategory",
                                            fontSize = 10.5.sp,
                                            color = colors.textMuted
                                        )
                                    }
                                    Switch(
                                        checked = calculationInput.isDecemberRecalculation,
                                        onCheckedChange = { checked ->
                                            onUpdateInput { it.copy(isDecemberRecalculation = checked) }
                                        },
                                        colors = SwitchDefaults.colors(
                                            checkedThumbColor = colors.onPrimaryContainer,
                                            checkedTrackColor = colors.primaryContainer
                                        )
                                    )
                                }

                                AnimatedVisibility(visible = calculationInput.isDecemberRecalculation) {
                                    OutlinedTextField(
                                        value = if (calculationInput.pph21PaidJanNov > 0) calculationInput.pph21PaidJanNov.toLong().toString() else "",
                                        onValueChange = { str ->
                                            val paid = str.toDoubleOrNull() ?: 0.0
                                            onUpdateInput { it.copy(pph21PaidJanNov = paid) }
                                        },
                                        label = { Text("Total PPh 21 Sudah Dibayar Jan-Nov (Rp)", fontSize = 11.sp) },
                                        supportingText = { Text("Jumlah kumulatif PPh 21 yang sudah dipotong dari Januari sampai November tahun ini.", fontSize = 9.sp) },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = com.example.ui.components.highContrastTextFieldColors()
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 5. Custom Deductions Card (Kasbon, Keterlambatan, Lainnya)
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
                            title = "POTONGAN CUSTOM (PASAL 93 UU KETENAGAKERJAAN)",
                            infoTitle = "Potongan Custom Itu Apa?",
                            infoBody = "Potongan di luar pajak & BPJS yang sifatnya sesekali, sesuai kesepakatan dengan perusahaan (Pasal 93 UU Ketenagakerjaan). Kosongkan jika tidak ada bulan ini.\n\n" +
                                "• Kasbon/Pinjaman: cicilan pinjaman ke perusahaan yang dipotong dari gaji.\n" +
                                "• Keterlambatan: potongan karena absensi/telat sesuai kebijakan kantor."
                        )

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = if (calculationInput.customKasbon > 0) calculationInput.customKasbon.toLong().toString() else "",
                                onValueChange = { str ->
                                    val amt = str.toDoubleOrNull() ?: 0.0
                                    onUpdateInput { it.copy(customKasbon = amt) }
                                },
                                label = { Text("Kasbon / Pinjaman", fontSize = 11.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f),
                                colors = com.example.ui.components.highContrastTextFieldColors()
                            )
                            OutlinedTextField(
                                value = if (calculationInput.customLate > 0) calculationInput.customLate.toLong().toString() else "",
                                onValueChange = { str ->
                                    val amt = str.toDoubleOrNull() ?: 0.0
                                    onUpdateInput { it.copy(customLate = amt) }
                                },
                                label = { Text("Keterlambatan", fontSize = 11.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f),
                                colors = com.example.ui.components.highContrastTextFieldColors()
                            )
                        }
                    }
                }
            }

            // 6. Live Calculation Result Breakdown Card (Primary Tier)
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(22.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = if (colors.isDark) 0.dp else 4.dp),
                    colors = CardDefaults.cardColors(containerColor = colors.primaryCardBg),
                    border = if (colors.isDark) {
                        CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.primary.copy(alpha = 0.4f)))
                    } else null
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text("RINCIAN ESTIMASI TAKE HOME PAY", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.8.sp, color = colors.primary)

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Total Gaji Bruto (Komponen + Lembur):", fontSize = 11.5.sp, color = colors.textSecondary)
                            Text(Formatters.formatRupiah(grossSalary), fontSize = 13.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                        }

                        HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("• BPJS Kes Karyawan (1%):", fontSize = 11.sp, color = colors.textSecondary)
                            Text("-${Formatters.formatRupiah(bpjs.bpjsKesEmployee)}", fontSize = 11.sp, color = colors.error)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("• BPJS JHT Karyawan (2%):", fontSize = 11.sp, color = colors.textSecondary)
                            Text("-${Formatters.formatRupiah(bpjs.bpjsJhtEmployee)}", fontSize = 11.sp, color = colors.error)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("• BPJS JP Karyawan (1%):", fontSize = 11.sp, color = colors.textSecondary)
                            Text("-${Formatters.formatRupiah(bpjs.bpjsJpEmployee)}", fontSize = 11.sp, color = colors.error)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            if (enablePph21) {
                                Text("• PPh 21 (${if (calculationInput.isDecemberRecalculation) "Pasal 17 Des" else "TER " + terCategory} ${Formatters.formatPercent(liveEffectiveRate)}):", fontSize = 11.sp, color = colors.textSecondary)
                                Text("-${Formatters.formatRupiah(livePph21)}", fontSize = 11.sp, color = colors.error)
                            } else {
                                Text("• PPh 21 (Nonaktif / Bebas Pajak):", fontSize = 11.sp, color = colors.textSecondary)
                                Text("Rp 0", fontSize = 11.sp, color = colors.success, fontWeight = FontWeight.Bold)
                            }
                        }
                        if (totalCustomDeductions > 0) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("• Potongan Kasbon / Lainnya:", fontSize = 11.sp, color = colors.textSecondary)
                                Text("-${Formatters.formatRupiah(totalCustomDeductions)}", fontSize = 11.sp, color = colors.error)
                            }
                        }

                        HorizontalDivider(color = colors.outline, thickness = 1.dp, modifier = Modifier.padding(vertical = 4.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("TAKE HOME PAY BERSIH:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                            Text(
                                Formatters.formatRupiah(liveTakeHomePay),
                                fontSize = 22.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = colors.success
                            )
                        }
                    }
                }
            }

            // 7. Action Button: Save & Preview
            item {
                Button(
                    onClick = {
                        coroutineScope.launch {
                            val saved = onCalculateAndSave()
                            onSelectPayrollDetail(saved)
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = colors.primaryContainer),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .testTag("save_and_preview_button")
                ) {
                    Icon(Icons.Default.Save, contentDescription = null, tint = colors.onPrimaryContainer)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Simpan & Lihat Slip Gaji", fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = colors.onPrimaryContainer)
                }
            }
        }

        item {
            AdBannerPlaceholder(
                isProUser = appSettings.isProUser,
                onUpgradeClick = onOpenProDialog
            )
        }

        item {
            LegalDisclaimerCard()
        }
    }

    if (showHmCalcDialog) {
        val hmH = hmHoursInput.toDoubleOrNull() ?: 0.0
        val hmR = hmRateInput.toDoubleOrNull() ?: 0.0
        val hmTotal = hmH * hmR

        AlertDialog(
            onDismissRequest = { showHmCalcDialog = false },
            containerColor = colors.surfaceCard,
            titleContentColor = colors.textPrimary,
            textContentColor = colors.textPrimary,
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.Calculate,
                        contentDescription = null,
                        tint = colors.primary
                    )
                    Text(
                        "Kalkulator HM (Hour Meter)",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Hitung cepat upah premi HM alat berat / operasional dari total akumulasi jam kerja dikali tarif premi per jam.",
                        fontSize = 11.5.sp,
                        color = colors.textMuted
                    )
                    OutlinedTextField(
                        value = hmHoursInput,
                        onValueChange = { hmHoursInput = it },
                        label = { Text("Total Jam HM", fontSize = 11.sp) },
                        placeholder = { Text("Contoh: 150") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                        colors = com.example.ui.components.highContrastTextFieldColors()
                    )
                    OutlinedTextField(
                        value = hmRateInput,
                        onValueChange = { hmRateInput = it },
                        label = { Text("Tarif Premi per Jam (Rp)", fontSize = 11.sp) },
                        placeholder = { Text("Contoh: 25000") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        colors = com.example.ui.components.highContrastTextFieldColors()
                    )
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = colors.primaryContainer.copy(alpha = 0.3f),
                        border = BorderStroke(1.dp, colors.primary.copy(alpha = 0.5f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text("Estimasi Upah Premi HM:", fontSize = 11.sp, color = colors.textMuted)
                            Text(
                                Formatters.formatRupiah(hmTotal),
                                fontSize = 17.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = colors.primary
                            )
                            if (hmH > 0 && hmR > 0) {
                                Text(
                                    "$hmH Jam × ${Formatters.formatRupiah(hmR)} / Jam",
                                    fontSize = 10.5.sp,
                                    color = colors.textSecondary
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onUpdateInput { it.copy(customHmPay = hmTotal) }
                        showHmCalcDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                ) {
                    Text(
                        "Terapkan ke Kalkulator Gaji",
                        color = colors.onPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showHmCalcDialog = false }) {
                    Text("Batal", color = colors.textMuted)
                }
            }
        )
    }

    if (showRitaseCalcDialog) {
        val rTrips = ritaseTripsInput.toDoubleOrNull() ?: 0.0
        val rRate = ritaseRateInput.toDoubleOrNull() ?: 0.0
        val ritaseTotal = rTrips * rRate

        AlertDialog(
            onDismissRequest = { showRitaseCalcDialog = false },
            containerColor = colors.surfaceCard,
            titleContentColor = colors.textPrimary,
            textContentColor = colors.textPrimary,
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Default.Calculate,
                        contentDescription = null,
                        tint = colors.primary
                    )
                    Text(
                        "Kalkulator Ritase (Trip)",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Hitung cepat total upah/bonus ritase dari akumulasi jumlah rit/trip pengantaran muatan dikali tarif per rit.",
                        fontSize = 11.5.sp,
                        color = colors.textMuted
                    )
                    OutlinedTextField(
                        value = ritaseTripsInput,
                        onValueChange = { ritaseTripsInput = it },
                        label = { Text("Jumlah Ritase (Trip / Muatan)", fontSize = 11.sp) },
                        placeholder = { Text("Contoh: 40") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                        colors = com.example.ui.components.highContrastTextFieldColors()
                    )
                    OutlinedTextField(
                        value = ritaseRateInput,
                        onValueChange = { ritaseRateInput = it },
                        label = { Text("Tarif per Rit (Rp)", fontSize = 11.sp) },
                        placeholder = { Text("Contoh: 50000") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        colors = com.example.ui.components.highContrastTextFieldColors()
                    )
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = colors.primaryContainer.copy(alpha = 0.3f),
                        border = BorderStroke(1.dp, colors.primary.copy(alpha = 0.5f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text("Estimasi Upah Ritase:", fontSize = 11.sp, color = colors.textMuted)
                            Text(
                                Formatters.formatRupiah(ritaseTotal),
                                fontSize = 17.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = colors.primary
                            )
                            if (rTrips > 0 && rRate > 0) {
                                Text(
                                    "$rTrips Rit × ${Formatters.formatRupiah(rRate)} / Rit",
                                    fontSize = 10.5.sp,
                                    color = colors.textSecondary
                                )
                            }
                        }
                    }
                    if (logsThisMonth.isNotEmpty()) {
                        HorizontalDivider(color = colors.textMuted.copy(alpha = 0.2f))
                        Text(
                            "Atau ambil otomatis dari log yang sudah dicatat di Overtime Tracker bulan ini ($autoRitaseCountFromLogs rit):",
                            fontSize = 11.5.sp,
                            color = colors.textMuted
                        )
                        OutlinedButton(
                            onClick = {
                                onUpdateInput {
                                    it.copy(
                                        customRitasePay = autoRitasePayFromLogs,
                                        customHmPay = autoHmTotalFromLogs
                                    )
                                }
                                showRitaseCalcDialog = false
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                "Ambil dari Log Bulan Ini (${Formatters.formatRupiah(autoRitasePayFromLogs)})",
                                fontSize = 11.5.sp
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onUpdateInput { it.copy(customRitasePay = ritaseTotal) }
                        showRitaseCalcDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                ) {
                    Text(
                        "Terapkan ke Kalkulator Gaji",
                        color = colors.onPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showRitaseCalcDialog = false }) {
                    Text("Batal", color = colors.textMuted)
                }
            }
        )
    }

    // Modal Kalkulator Tunjangan Kehadiran (Uang Makan & Transport)
    if (showAttendanceCalcDialog) {
        AttendanceAllowanceCalculatorDialog(
            initialAttendanceDays = defaultAttendanceDays,
            initialMealTotal = mealAllowance,
            initialTransportTotal = transportAllowance,
            mode = attendanceCalcMode,
            onApply = { days, mealTotal, transportTotal, mealRate, transportRate ->
                onUpdateInput {
                    var updated = it
                    if (attendanceCalcMode == AttendanceCalculatorMode.MEAL_ONLY) {
                        updated = updated.copy(customMealAllowance = mealTotal)
                    }
                    if (attendanceCalcMode == AttendanceCalculatorMode.TRANSPORT_ONLY) {
                        updated = updated.copy(customTransportAllowance = transportTotal)
                    }
                    updated
                }
                showAttendanceCalcDialog = false
            },
            onDismiss = { showAttendanceCalcDialog = false }
        )
    }
}
