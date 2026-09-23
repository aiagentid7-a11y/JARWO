package com.example.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.UserProfile
import com.example.domain.calculator.IndonesianPayrollCalculators
import com.example.domain.util.Formatters
import com.example.ui.components.AdBannerPlaceholder
import com.example.ui.components.LegalDisclaimerCard
import com.example.ui.theme.*

@Composable
fun CompensationThrPhkScreen(
    userProfile: UserProfile,
    isProUser: Boolean,
    onOpenProDialog: () -> Unit,
    onNavigateToBpjsClaim: () -> Unit = {}
) {
    val colors = GajikuTheme.colors
    val context = LocalContext.current
    var activeSubTab by remember { mutableIntStateOf(0) } // 0 = Kompensasi PKWT, 1 = THR Keagamaan, 2 = Pesangon PHK

    // PKWT Inputs & State
    var pkwtWorkedMonthsInput by remember { mutableStateOf("12") }
    var pkwtRemainingMonthsInput by remember { mutableStateOf("6") }
    var pkwtExtensionMonthsInput by remember { mutableStateOf("12") }
    var pkwtScenario by remember { mutableStateOf(IndonesianPayrollCalculators.PkwtScenario.SELESAI_KONTRAK) }
    var isPph21PkwtEnabled by remember { mutableStateOf(true) }

    // THR Inputs
    var thrServiceMonthsInput by remember { mutableStateOf("12") }

    // PHK Inputs
    var phkServiceYearsInput by remember { mutableStateOf("3") }
    var unusedLeaveDaysInput by remember { mutableStateOf("5") }
    var relocationCostInput by remember { mutableStateOf("0") }
    var selectedReasonEnum by remember { mutableStateOf(IndonesianPayrollCalculators.PhkReason.EFISIENSI_CEGAH_RUGI) }

    // Shared Salary Input
    val initialSalary = if (userProfile.totalFixedSalary > 0) userProfile.totalFixedSalary.toLong().toString() else "6500000"
    var customSalaryInput by remember(userProfile.totalFixedSalary) { mutableStateOf(initialSalary) }

    val effectiveSalary = customSalaryInput.toDoubleOrNull() ?: if (userProfile.totalFixedSalary > 0) userProfile.totalFixedSalary else 6_500_000.0
    val pkwtWorkedMonths = pkwtWorkedMonthsInput.toDoubleOrNull() ?: 12.0
    val pkwtRemainingMonths = pkwtRemainingMonthsInput.toDoubleOrNull() ?: 0.0
    val pkwtExtensionMonths = pkwtExtensionMonthsInput.toDoubleOrNull() ?: 0.0

    val thrMonths = thrServiceMonthsInput.toIntOrNull() ?: 12
    val phkYears = phkServiceYearsInput.toDoubleOrNull() ?: 3.0
    val unusedLeaveDays = unusedLeaveDaysInput.toIntOrNull() ?: 0
    val relocationCost = relocationCostInput.toDoubleOrNull() ?: 0.0

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 28.dp)
    ) {
        // Sub-Tab Switcher
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colors.surfaceVariant, RoundedCornerShape(16.dp))
                    .padding(4.dp)
            ) {
                listOf("Kompensasi PKWT", "THR Keagamaan", "Pesangon PHK").forEachIndexed { index, label ->
                    val isSelected = activeSubTab == index
                    Surface(
                        color = if (isSelected) colors.primaryContainer else colors.inactiveChipBg,
                        shape = RoundedCornerShape(12.dp),
                        border = CardDefaults.outlinedCardBorder().copy(
                            brush = SolidColor(
                                if (isSelected) colors.primary else colors.inactiveChipBorder
                            )
                        ),
                        modifier = Modifier
                            .weight(1f)
                            .clickable { activeSubTab = index }
                            .testTag("tab_sub_$index")
                    ) {
                        Text(
                            text = label,
                            color = if (isSelected) colors.onPrimaryContainer else colors.inactiveChipText,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.padding(vertical = 9.dp)
                        )
                    }
                }
            }
        }

        // Shared Salary Input Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "UPAH ACUAN (GAJI POKOK + TUNJANGAN TETAP)",
                        fontSize = 10.5.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 0.8.sp,
                        color = colors.primary
                    )
                    OutlinedTextField(
                        value = customSalaryInput,
                        onValueChange = { customSalaryInput = it },
                        label = { Text("Upah Tetap Sebulan (Rp)", fontSize = 11.sp) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth().testTag("compensation_salary_input"),
                        colors = com.example.ui.components.highContrastTextFieldColors()
                    )
                    Text(
                        text = "Sesuai PP 35/2021 Pasal 16 ayat (2), upah yang digunakan adalah Upah Pokok + Tunjangan Tetap.",
                        fontSize = 10.sp,
                        color = colors.textMuted
                    )
                }
            }
        }

        when (activeSubTab) {
            0 -> {
                // ================= TAB 1: KOMPENSASI PKWT (PP NO. 35/2021) =================
                val pkwtResult = IndonesianPayrollCalculators.calculatePkwtDetailed(
                    totalFixedSalary = effectiveSalary,
                    workedMonths = pkwtWorkedMonths,
                    scenario = pkwtScenario,
                    remainingMonths = if (pkwtScenario == IndonesianPayrollCalculators.PkwtScenario.DIPUTUS_SEBELUM_WAKTU) pkwtRemainingMonths else 0.0,
                    extendedMonths = if (pkwtScenario == IndonesianPayrollCalculators.PkwtScenario.PERPANJANGAN_KONTRAK) pkwtExtensionMonths else 0.0,
                    ptkpStatus = userProfile.ptkpStatus,
                    hasNpwp = userProfile.hasNpwp
                )

                // 1. Result Card
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
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "TOTAL HAK KOMPENSASI PKWT",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    letterSpacing = 0.8.sp,
                                    color = colors.primary
                                )
                                Surface(
                                    color = colors.primary.copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(
                                        text = "PP 35/2021",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.primary,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }

                            Text(
                                text = Formatters.formatRupiah(if (isPph21PkwtEnabled) pkwtResult.netCompensationReceived else pkwtResult.grandTotal),
                                fontSize = 28.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = colors.success
                            )

                            Text(
                                text = pkwtResult.formulaString,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = colors.textSecondary
                            )

                            HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                            // Breakdown details
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("• Uang Kompensasi Pokok (${pkwtWorkedMonths.toInt()} bln):", fontSize = 11.5.sp, color = colors.textSecondary)
                                Text(Formatters.formatRupiah(pkwtResult.compensationAmount), fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                            }

                            if (pkwtScenario == IndonesianPayrollCalculators.PkwtScenario.DIPUTUS_SEBELUM_WAKTU) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("• Ganti Rugi Sisa Masa Kontrak (${pkwtRemainingMonths.toInt()} bln):", fontSize = 11.5.sp, color = colors.warning)
                                    Text(Formatters.formatRupiah(pkwtResult.remainingSalaryIndemnity), fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold, color = colors.warning)
                                }
                            }

                            if (pkwtScenario == IndonesianPayrollCalculators.PkwtScenario.PERPANJANGAN_KONTRAK) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("• Kompensasi Perpanjangan (${pkwtExtensionMonths.toInt()} bln):", fontSize = 11.5.sp, color = colors.primary)
                                    Text(Formatters.formatRupiah(pkwtResult.extensionCompensationAmount), fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold, color = colors.primary)
                                }
                            }

                            if (isPph21PkwtEnabled && pkwtResult.estimatedPph21 > 0) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("• Estimasi Potongan PPh 21 TER (${(pkwtResult.terEffectiveRate * 100).toInt()}%):", fontSize = 11.5.sp, color = colors.deductionRed)
                                    Text("- ${Formatters.formatRupiah(pkwtResult.estimatedPph21)}", fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold, color = colors.deductionRed)
                                }
                            }

                            HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                            // Action: Copy Summary
                            OutlinedButton(
                                onClick = {
                                    val summaryText = """
                                        --- RINCIAN KOMPENSASI PKWT ---
                                        Skenario: ${pkwtScenario.label}
                                        Dasar Hukum: ${pkwtResult.legalBasis}
                                        Upah Acuan Sebulan: ${Formatters.formatRupiah(effectiveSalary)}
                                        Masa Kerja Kontrak: ${pkwtWorkedMonths.toInt()} Bulan
                                        Uang Kompensasi Masa Kerja: ${Formatters.formatRupiah(pkwtResult.compensationAmount)}
                                        ${if (pkwtScenario == IndonesianPayrollCalculators.PkwtScenario.DIPUTUS_SEBELUM_WAKTU) "Ganti Rugi Sisa Masa Kontrak: ${Formatters.formatRupiah(pkwtResult.remainingSalaryIndemnity)}\n" else ""}${if (pkwtScenario == IndonesianPayrollCalculators.PkwtScenario.PERPANJANGAN_KONTRAK) "Kompensasi Masa Perpanjangan: ${Formatters.formatRupiah(pkwtResult.extensionCompensationAmount)}\n" else ""}Total Kompensasi Bruto: ${Formatters.formatRupiah(pkwtResult.grandTotal)}
                                        Estimasi Potongan PPh 21 TER: ${Formatters.formatRupiah(pkwtResult.estimatedPph21)}
                                        HAK BERSIH DITERIMA: ${Formatters.formatRupiah(pkwtResult.netCompensationReceived)}
                                        --------------------------------
                                        Dihitung via Personal Payroll (GAS)
                                    """.trimIndent()
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    clipboard.setPrimaryClip(ClipData.newPlainText("Kompensasi PKWT", summaryText))
                                    Toast.makeText(context, "Ringkasan Kompensasi PKWT berhasil disalin!", Toast.LENGTH_SHORT).show()
                                },
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Salin Rincian Perhitungan PKWT", fontSize = 11.5.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // 2. PKWT Configuration Card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(22.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                        colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                        border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
                    ) {
                        Column(
                            modifier = Modifier.padding(18.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            Text(
                                text = "SKENARIO KONTRAK PKWT",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.primary
                            )

                            // Scenario Selector
                            IndonesianPayrollCalculators.PkwtScenario.values().forEach { sc ->
                                val isSelected = pkwtScenario == sc
                                Surface(
                                    color = if (isSelected) colors.primaryContainer else colors.inactiveChipBg,
                                    shape = RoundedCornerShape(12.dp),
                                    border = CardDefaults.outlinedCardBorder().copy(
                                        brush = SolidColor(
                                            if (isSelected) colors.primary else colors.inactiveChipBorder
                                        )
                                    ),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { pkwtScenario = sc }
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text(
                                            text = sc.label,
                                            fontSize = 12.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isSelected) colors.onPrimaryContainer else colors.inactiveChipText
                                        )
                                        Text(
                                            text = sc.description,
                                            fontSize = 10.5.sp,
                                            color = if (isSelected) colors.onPrimaryContainer.copy(alpha = 0.8f) else colors.textMuted
                                        )
                                    }
                                }
                            }

                            HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                            // Input Masa Kerja Kontrak
                            Text(
                                text = "MASA KERJA KONTRAK YANG DIJALANI",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.primary
                            )

                            // Quick duration preset chips
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                listOf("3" to "3 Bln", "6" to "6 Bln", "12" to "1 Thn", "24" to "2 Thn", "36" to "3 Thn").forEach { (valMonths, label) ->
                                    val isPicked = pkwtWorkedMonthsInput == valMonths
                                    Surface(
                                        color = if (isPicked) colors.primary else colors.surfaceVariant,
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier
                                            .weight(1f)
                                            .clickable { pkwtWorkedMonthsInput = valMonths }
                                    ) {
                                        Text(
                                            text = label,
                                            color = if (isPicked) Color.White else colors.textPrimary,
                                            fontSize = 10.5.sp,
                                            fontWeight = FontWeight.Bold,
                                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                            modifier = Modifier.padding(vertical = 6.dp)
                                        )
                                    }
                                }
                            }

                            OutlinedTextField(
                                value = pkwtWorkedMonthsInput,
                                onValueChange = { pkwtWorkedMonthsInput = it },
                                label = { Text("Durasi Kontrak Terlaksana (Bulan)", fontSize = 11.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth().testTag("pkwt_months_input"),
                                colors = com.example.ui.components.highContrastTextFieldColors()
                            )

                            // Additional scenario inputs
                            if (pkwtScenario == IndonesianPayrollCalculators.PkwtScenario.DIPUTUS_SEBELUM_WAKTU) {
                                OutlinedTextField(
                                    value = pkwtRemainingMonthsInput,
                                    onValueChange = { pkwtRemainingMonthsInput = it },
                                    label = { Text("Sisa Durasi Kontrak yang Diputus (Bulan)", fontSize = 11.sp) },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = com.example.ui.components.highContrastTextFieldColors()
                                )
                                Text(
                                    text = "Sesuai Pasal 62 UU Ketenagakerjaan No. 13/2003, pihak yang mengakhiri wajib membayar ganti rugi sebesar upah pekerja sampai batas waktu berakhirnya jangka waktu perjanjian kerja.",
                                    fontSize = 10.5.sp,
                                    color = colors.warning
                                )
                            }

                            if (pkwtScenario == IndonesianPayrollCalculators.PkwtScenario.PERPANJANGAN_KONTRAK) {
                                OutlinedTextField(
                                    value = pkwtExtensionMonthsInput,
                                    onValueChange = { pkwtExtensionMonthsInput = it },
                                    label = { Text("Durasi Perpanjangan Kontrak PKWT II (Bulan)", fontSize = 11.sp) },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = com.example.ui.components.highContrastTextFieldColors()
                                )
                                Text(
                                    text = "Sesuai Pasal 15 ayat (4) PP 35/2021, uang kompensasi diberikan saat selesainya jangka waktu PKWT sebelum perpanjangan, dan kompensasi berikutnya dihitung saat jangka waktu perpanjangan berakhir.",
                                    fontSize = 10.5.sp,
                                    color = colors.textMuted
                                )
                            }

                            // Tax Toggle
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Simulasikan Potongan PPh 21 TER", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                    Text("Status PTKP: ${userProfile.ptkpStatus} | NPWP: ${if (userProfile.hasNpwp) "Ada" else "Tidak Ada"}", fontSize = 10.sp, color = colors.textMuted)
                                }
                                Switch(
                                    checked = isPph21PkwtEnabled,
                                    onCheckedChange = { isPph21PkwtEnabled = it }
                                )
                            }
                        }
                    }
                }

                // 3. Legal Regulation Card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                        colors = CardDefaults.cardColors(containerColor = colors.surfaceVariant),
                        border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.MenuBook, contentDescription = null, tint = colors.primary, modifier = Modifier.size(20.dp))
                                Text("Ringkasan Regulasi Kompensasi PKWT", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                            }
                            Text(
                                text = "1. Wajib Diberikan: Pengusaha wajib memberikan uang kompensasi kepada pekerja PKWT saat berakhirnya jangka waktu kontrak (PP 35/2021 Pasal 15 ayat 1).\n" +
                                        "2. Syarat Masa Kerja: Telah mempunyai masa kerja minimal 1 bulan terus menerus (Pasal 15 ayat 3).\n" +
                                        "3. Rumus Standar: (Masa Kerja / 12) × 1 Bulan Upah Pokok + Tunjangan Tetap (Pasal 16 ayat 1 & 2).\n" +
                                        "4. Selesai Lebih Cepat: Jika diputus sebelum waktu berakhir, kompensasi tetap wajib dihitung atas masa kerja yang telah dijalani (Pasal 17).\n" +
                                        "5. Pengecualian: Tidak berlaku bagi Tenaga Kerja Asing (TKA).",
                                fontSize = 11.sp,
                                color = colors.textSecondary,
                                lineHeight = 16.sp
                            )
                        }
                    }
                }
            }

            1 -> {
                // ================= TAB 2: THR KEAGAMAAN =================
                item {
                    val thrAmount = IndonesianPayrollCalculators.calculateThr(
                        totalFixedSalary = effectiveSalary,
                        tenureMonths = thrMonths
                    )

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(24.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = if (colors.isDark) 0.dp else 4.dp),
                        colors = CardDefaults.cardColors(containerColor = colors.primaryCardBg),
                        border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.primary.copy(alpha = 0.4f))) else null
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text("HASIL ESTIMASI THR KEAGAMAAN", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.8.sp, color = colors.primary)

                            Text(
                                text = Formatters.formatRupiah(thrAmount),
                                fontSize = 28.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = colors.success
                            )

                            val formulaText = if (thrMonths >= 12) {
                                "Masa kerja $thrMonths bulan (≥ 12 bln) = 1 bulan upah penuh."
                            } else {
                                "Masa kerja $thrMonths bulan = ($thrMonths / 12) × ${Formatters.formatRupiah(effectiveSalary)}"
                            }

                            Text(
                                text = formulaText,
                                fontSize = 12.sp,
                                color = colors.textSecondary
                            )

                            HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                            Text(
                                text = "Dasar Hukum: Permenaker No. 6/2016 & PP No. 36/2021.\nWajib dibayarkan paling lambat 7 hari sebelum Hari Raya Keagamaan (H-7).",
                                fontSize = 10.5.sp,
                                color = colors.textMuted,
                                lineHeight = 15.sp
                            )
                        }
                    }
                }

                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(22.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                        colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                        border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
                    ) {
                        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("PENGATURAN MASA KERJA THR", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)

                            OutlinedTextField(
                                value = thrServiceMonthsInput,
                                onValueChange = { thrServiceMonthsInput = it },
                                label = { Text("Masa Kerja (Bulan)", fontSize = 11.sp) },
                                supportingText = { Text("Lama bekerja hingga hari raya, dalam bulan.", fontSize = 9.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth().testTag("thr_service_months_input"),
                                colors = com.example.ui.components.highContrastTextFieldColors()
                            )

                            Text("• Masa kerja ≥ 12 bulan = 1 bulan upah penuh.\n• Masa kerja 1 s.d. < 12 bulan = (Masa Kerja / 12) x 1 bulan upah.", fontSize = 11.sp, color = colors.textSecondary, lineHeight = 15.sp)
                        }
                    }
                }
            }

            2 -> {
                // ================= TAB 3: PESANGON PHK =================
                val phkResult = IndonesianPayrollCalculators.calculatePesangonPhk(
                    monthlySalary = effectiveSalary,
                    tenureYears = phkYears,
                    reason = selectedReasonEnum,
                    remainingLeaveDays = unusedLeaveDays,
                    otherUphAmount = relocationCost
                )

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
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text("TOTAL HAK PESANGON PHK", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.8.sp, color = colors.primary)

                            Text(
                                text = Formatters.formatRupiah(phkResult.grandTotalPesangon),
                                fontSize = 28.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = colors.success
                            )

                            HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("• Uang Pesangon (UP ${phkResult.multiplierUp}x [${phkResult.standardUpMonths} bln]):", fontSize = 11.sp, color = colors.textSecondary)
                                Text(Formatters.formatRupiah(phkResult.totalUpAmount), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("• Uang Penghargaan Masa Kerja (UPMK [${phkResult.standardUpmkMonths} bln]):", fontSize = 11.sp, color = colors.textSecondary)
                                Text(Formatters.formatRupiah(phkResult.totalUpmkAmount), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("• Uang Penggantian Hak (UPH):", fontSize = 11.sp, color = colors.textSecondary)
                                Text(Formatters.formatRupiah(phkResult.totalUphAmount), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                            }

                            HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                            Text(
                                text = "Dasar Hukum: ${phkResult.legalArticleCitation}",
                                fontSize = 10.5.sp,
                                color = colors.textMuted,
                                lineHeight = 15.sp
                            )
                        }
                    }
                }

                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(22.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                        colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                        border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
                    ) {
                        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            com.example.ui.components.SectionHeaderWithInfo(
                                title = "SKENARIO & ALASAN PHK (PP 35/2021)",
                                infoTitle = "Kenapa Alasan PHK Mempengaruhi Nominal?",
                                infoBody = "Besaran pengali Uang Pesangon (UP) berbeda-beda tergantung alasan PHK sesuai PP 35/2021 — mis. PHK karena efisiensi/perusahaan tutup rugi biasanya pengalinya lebih kecil dibanding PHK karena perusahaan melakukan pelanggaran.\n\n" +
                                    "Pilih alasan yang paling sesuai dengan situasi Anda; jika ragu, cocokkan dengan surat PHK resmi dari perusahaan atau konsultasikan ke Disnaker."
                            )

                            IndonesianPayrollCalculators.PhkReason.values().forEach { r ->
                                val isSelected = selectedReasonEnum == r
                                Surface(
                                    color = if (isSelected) colors.primaryContainer else colors.inactiveChipBg,
                                    shape = RoundedCornerShape(12.dp),
                                    border = CardDefaults.outlinedCardBorder().copy(
                                        brush = SolidColor(
                                            if (isSelected) colors.primary else colors.inactiveChipBorder
                                        )
                                    ),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { selectedReasonEnum = r }
                                ) {
                                    Text(
                                        text = "${r.label} [UP ${r.upMultiplier}x]",
                                        fontSize = 11.5.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isSelected) colors.onPrimaryContainer else colors.inactiveChipText,
                                        modifier = Modifier.padding(12.dp)
                                    )
                                }
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                OutlinedTextField(
                                    value = phkServiceYearsInput,
                                    onValueChange = { phkServiceYearsInput = it },
                                    label = { Text("Masa Kerja (Tahun)", fontSize = 11.sp) },
                                    supportingText = { Text("Lama bekerja di perusahaan ini.", fontSize = 9.sp) },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    modifier = Modifier.weight(1f),
                                    colors = com.example.ui.components.highContrastTextFieldColors()
                                )
                                OutlinedTextField(
                                    value = unusedLeaveDaysInput,
                                    onValueChange = { unusedLeaveDaysInput = it },
                                    label = { Text("Sisa Cuti (Hari)", fontSize = 11.sp) },
                                    supportingText = { Text("Cuti tahunan yang belum diambil, akan diuangkan.", fontSize = 9.sp) },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    modifier = Modifier.weight(1f),
                                    colors = com.example.ui.components.highContrastTextFieldColors()
                                )
                            }
                            // Button to BPJS Claim Guide
                            OutlinedButton(
                                onClick = onNavigateToBpjsClaim,
                                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.primary)
                            ) {
                                Icon(Icons.Default.Shield, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Lihat Tata Cara Klaim JKP & JHT BPJS", fontSize = 11.5.sp, fontWeight = FontWeight.Bold)
                            }
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

