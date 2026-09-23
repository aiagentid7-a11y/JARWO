package com.example.ui.screens

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.UserProfile
import com.example.domain.calculator.IndonesianPayrollCalculators
import com.example.domain.calculator.IndonesianPayrollCalculators.BpjsProgramType
import com.example.domain.util.Formatters
import com.example.ui.components.AdBannerPlaceholder
import com.example.ui.components.LegalDisclaimerCard
import com.example.ui.theme.*

@Composable
fun BpjsClaimGuideScreen(
    userProfile: UserProfile,
    isProUser: Boolean,
    onOpenProDialog: () -> Unit,
    onNavigateToPhkCalculator: () -> Unit = {}
) {
    val colors = GajikuTheme.colors
    val clipboardManager = LocalClipboardManager.current
    val context = LocalContext.current

    var selectedProgram by remember { mutableStateOf(BpjsProgramType.JKP) }

    // JKP Inputs
    val defaultSalary = if (userProfile.totalFixedSalary > 0) userProfile.totalFixedSalary.toLong().toString() else "6500000"
    var jkpSalaryInput by remember(userProfile.totalFixedSalary) { mutableStateOf(defaultSalary) }
    var jkp6MonthsConsecutive by remember { mutableStateOf(true) }
    var jkp12MonthsIn24 by remember { mutableStateOf(true) }

    // JHT Inputs
    var jhtClaimCategory by remember { mutableStateOf("PHK_RESIGN") }
    var jhtBalanceInput by remember { mutableStateOf("25000000") }

    // JKK Inputs
    var jkkSalaryInput by remember(userProfile.totalFixedSalary) { mutableStateOf(defaultSalary) }
    var stmbDaysInput by remember { mutableStateOf("14") }
    var stmbPeriodOption by remember { mutableStateOf(1) } // 1: 6 Bln I (100%), 7: 6 Bln II (100%), 13: Bln 13+ (50%)

    // JP (Jaminan Pensiun) Inputs
    var jpSalaryInput by remember(userProfile.totalFixedSalary) { mutableStateOf(defaultSalary) }
    var jpYearsInput by remember { mutableStateOf("15") }

    val effectiveJkpSalary = jkpSalaryInput.toDoubleOrNull() ?: 6_500_000.0
    val effectiveJkkSalary = jkkSalaryInput.toDoubleOrNull() ?: 6_500_000.0
    val effectiveStmbDays = stmbDaysInput.toIntOrNull()?.coerceIn(1, 730) ?: 14
    val effectiveJpSalary = jpSalaryInput.toDoubleOrNull() ?: 6_500_000.0
    val effectiveJpYears = jpYearsInput.toDoubleOrNull()?.coerceIn(1.0, 45.0) ?: 15.0

    // Calculations
    val jkpResult = remember(effectiveJkpSalary, jkp6MonthsConsecutive, jkp12MonthsIn24) {
        IndonesianPayrollCalculators.calculateJkpBenefit(
            salary = effectiveJkpSalary,
            hasPaidMin6MonthsConsecutive = jkp6MonthsConsecutive,
            hasPaidMin12MonthsIn24Months = jkp12MonthsIn24
        )
    }

    val jkmResult = remember {
        IndonesianPayrollCalculators.calculateJkmBenefit()
    }

    val jkkResult = remember(effectiveJkkSalary) {
        IndonesianPayrollCalculators.calculateJkkBenefit(effectiveJkkSalary)
    }

    val stmbCustomResult = remember(effectiveJkkSalary, effectiveStmbDays, stmbPeriodOption) {
        IndonesianPayrollCalculators.calculateStmbDetail(
            monthlySalary = effectiveJkkSalary,
            treatmentDays = effectiveStmbDays,
            monthPeriod = stmbPeriodOption
        )
    }

    val jhtResult = remember(userProfile.totalFixedSalary, jhtClaimCategory) {
        IndonesianPayrollCalculators.calculateJhtClaimGuide(
            monthlySalary = if (userProfile.totalFixedSalary > 0) userProfile.totalFixedSalary else 6_500_000.0,
            claimCategory = jhtClaimCategory
        )
    }

    val jpResult = remember(effectiveJpSalary, effectiveJpYears) {
        IndonesianPayrollCalculators.calculateJpBenefit(
            monthlySalary = effectiveJpSalary,
            contributionYears = effectiveJpYears
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
        // 1. Hero Summary Card
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
                            "PANDUAN KLAIM BPJS KETENAGAKERJAAN",
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
                                "Regulasi Resmi RI",
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
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Program Dipilih:", fontSize = 11.sp, color = colors.textSecondary)
                            Text(
                                text = selectedProgram.title,
                                fontSize = 17.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = colors.textPrimary
                            )
                            Text(
                                text = selectedProgram.legalBasis,
                                fontSize = 10.5.sp,
                                color = colors.textMuted
                            )
                        }
                        Surface(
                            color = when (selectedProgram) {
                                BpjsProgramType.JKP -> colors.tealBg
                                BpjsProgramType.JHT -> colors.indigoBg
                                BpjsProgramType.JKM -> colors.amberBg
                                BpjsProgramType.JKK -> colors.roseBg
                                BpjsProgramType.JP -> colors.purpleBg
                            },
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(
                                text = selectedProgram.code,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = when (selectedProgram) {
                                    BpjsProgramType.JKP -> colors.teal
                                    BpjsProgramType.JHT -> colors.indigo
                                    BpjsProgramType.JKM -> colors.amber
                                    BpjsProgramType.JKK -> colors.error
                                    BpjsProgramType.JP -> colors.primary
                                },
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }
        }

        // 2. Program Selector Chips (JKP, JHT, JKM, JKK, JP)
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "PILIH PROGRAM KLAIM BPJS:",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.primary
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    BpjsProgramType.entries.forEach { program ->
                        val isSelected = selectedProgram == program
                        Surface(
                            color = if (isSelected) colors.primaryContainer else colors.secondaryCardBg,
                            shape = RoundedCornerShape(12.dp),
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = SolidColor(if (isSelected) colors.primary else colors.secondaryCardBorder)
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .clickable { selectedProgram = program }
                                .testTag("bpjs_chip_${program.code.lowercase()}")
                        ) {
                            Column(
                                modifier = Modifier.padding(vertical = 9.dp, horizontal = 4.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    when (program) {
                                        BpjsProgramType.JKP -> Icons.Default.WorkOutline
                                        BpjsProgramType.JHT -> Icons.Default.Savings
                                        BpjsProgramType.JKM -> Icons.Default.FavoriteBorder
                                        BpjsProgramType.JKK -> Icons.Default.MedicalServices
                                        BpjsProgramType.JP -> Icons.Default.AccountBalance
                                    },
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp),
                                    tint = if (isSelected) colors.primary else colors.textMuted
                                )
                                Text(
                                    text = program.code,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.SemiBold,
                                    color = if (isSelected) colors.onPrimaryContainer else colors.textPrimary
                                )
                            }
                        }
                    }
                }
            }
        }

        // 3. Program-Specific Interactive Simulator & Benefit Calculation
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    when (selectedProgram) {
                        // PROGRAM 1: JKP (JAMINAN KEHILANGAN PEKERJAAN - PP 6/2025)
                        BpjsProgramType.JKP -> {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("SIMULASI MANFAAT UANG TUNAI JKP", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                Surface(
                                    color = colors.tealBg,
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(
                                        "PP No. 6 Tahun 2025",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = colors.teal,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }

                            Text(
                                "Program jaminan sosial bagi pekerja korban PHK. Sesuai PP No. 6 Tahun 2025 (berlaku Februari 2025), manfaat uang tunai naik menjadi 60% upah flat selama 6 bulan penuh.",
                                fontSize = 11.sp,
                                color = colors.textSecondary,
                                lineHeight = 15.sp
                            )

                            // Highlight Perubahan Regulasi PP 6/2025
                            Surface(
                                color = colors.tealBg.copy(alpha = 0.7f),
                                shape = RoundedCornerShape(14.dp),
                                border = CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.teal.copy(alpha = 0.4f))),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Icon(Icons.Default.Verified, contentDescription = null, tint = colors.teal, modifier = Modifier.size(16.dp))
                                        Text("Poin Utama PP No. 6 Tahun 2025:", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = colors.teal)
                                    }
                                    Text("• Uang Tunai: 60% x Upah flat 6 bulan (sebelumnya 45% bln 1-3 & 25% bln 4-6 di PP 37/2021).", fontSize = 10.5.sp, color = colors.textPrimary)
                                    Text("• Maksimal Manfaat: Total s.d. Rp 18.000.000 (+Rp 7.500.000 / +71.4% dibanding aturan lama).", fontSize = 10.5.sp, color = colors.textPrimary)
                                    Text("• Syarat Iuran Dipermudah: Syarat 6 bulan berturut-turut dihapus, cukup masa iur 12 bulan dalam 24 bulan.", fontSize = 10.5.sp, color = colors.textPrimary)
                                    Text("• Perlindungan PKWT & Pailit: Pekerja kontrak sebelum habis masa kerja dan pekerja dari perusahaan pailit/menunggak tetap berhak atas JKP.", fontSize = 10.5.sp, color = colors.textPrimary)
                                }
                            }

                            OutlinedTextField(
                                value = jkpSalaryInput,
                                onValueChange = { jkpSalaryInput = it },
                                label = { Text("Upah Terakhir Dilaporkan ke BPJS (Rp)", fontSize = 11.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth().testTag("jkp_salary_input"),
                                colors = com.example.ui.components.highContrastTextFieldColors(),
                                supportingText = { Text("Batas atas upah perhitungan JKP maksimal Rp 5.000.000 (PP 6/2025 Pasal 21)", fontSize = 9.5.sp, color = colors.textMuted) }
                            )

                            // Syarat Kepesertaan Checklist
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Kelayakan Masa Iur Peserta:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("Masa Iur min. 12 bulan dalam 24 bulan", fontSize = 11.sp, color = colors.textSecondary)
                                        Text("Syarat utama kepesertaan aktif JKP (PP 6/2025)", fontSize = 9.5.sp, color = colors.textMuted)
                                    }
                                    Switch(
                                        checked = jkp12MonthsIn24,
                                        onCheckedChange = { jkp12MonthsIn24 = it }
                                    )
                                }
                                Surface(
                                    color = colors.surfaceVariant,
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(Icons.Default.Info, contentDescription = null, tint = colors.teal, modifier = Modifier.size(16.dp))
                                        Text(
                                            "Catatan PP 6/2025: Syarat iuran 6 bulan berturut-turut telah dihapuskan oleh pemerintah untuk memperluas akses jaminan bagi korban PHK.",
                                            fontSize = 10.sp,
                                            color = colors.textSecondary,
                                            lineHeight = 14.sp
                                        )
                                    }
                                }
                            }

                            // Rincian Uang Tunai
                            Surface(
                                color = colors.surfaceVariant,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Upah Dasar Acuan (Capped Rp 5jt):", fontSize = 11.sp, color = colors.textSecondary)
                                        Text(Formatters.formatRupiah(jkpResult.cappedSalary), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Uang Tunai per Bulan (60% x Upah):", fontSize = 11.sp, color = colors.textSecondary)
                                        Text("${Formatters.formatRupiah(jkpResult.monthlyCashBenefit)} / bln", fontSize = 11.5.sp, fontWeight = FontWeight.ExtraBold, color = colors.teal)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Durasi Pembayaran:", fontSize = 11.sp, color = colors.textSecondary)
                                        Text("6 Bulan Penuh (Bulan 1 s.d. 6)", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                                    }
                                    HorizontalDivider(color = colors.outline.copy(alpha = 0.4f), thickness = 0.6.dp)
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Column {
                                            Text("Total Manfaat Tunai 6 Bulan:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                            Text("PP No. 6 Tahun 2025", fontSize = 9.5.sp, color = colors.teal, fontWeight = FontWeight.SemiBold)
                                        }
                                        Text(
                                            Formatters.formatRupiah(jkpResult.totalCashBenefit6Months),
                                            fontSize = 17.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = colors.success
                                        )
                                    }
                                    Surface(
                                        color = colors.success.copy(alpha = 0.12f),
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text(
                                            text = "Naik Rp 7.500.000 dibanding aturan lama PP 37/2021 (Rp 10.500.000 -> Rp 18.000.000)",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = colors.success,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
                                        )
                                    }
                                }
                            }

                            // 3 Manfaat Utama JKP
                            Surface(
                                color = colors.tealBg,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text("3 Pilar Manfaat Program JKP (PP 6/2025):", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.teal)
                                    Text("1. Manfaat Uang Tunai: 60% upah selama 6 bulan penuh (total s.d. Rp 18.000.000).", fontSize = 10.5.sp, color = colors.textPrimary)
                                    Text("2. Akses Informasi Pasar Kerja & Konseling Karir via portal SIAPkerja Kemnaker.", fontSize = 10.5.sp, color = colors.textPrimary)
                                    Text("3. Pelatihan Kerja Vokasi (Skilling, Up-skilling, Re-skilling) secara gratis.", fontSize = 10.5.sp, color = colors.textPrimary)
                                }
                            }
                        }

                        // PROGRAM 2: JHT (JAMINAN HARI TUA)
                        BpjsProgramType.JHT -> {
                            Text("SIMULASI & ATURAN KLAIM JHT (PERMENAKER 4/2022)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                            Text("Manfaat tabungan akumulasi iuran (5.7% per bulan) ditambah hasil pengembangan investasi BPJS.", fontSize = 11.sp, color = colors.textSecondary)

                            Text("Kategori Pengajuan Klaim JHT:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf(
                                    "PHK_RESIGN" to "Klaim 100% (Berhenti Kerja / Resign / PHK)",
                                    "USIA_PENSIUN_56" to "Klaim 100% (Mencapai Usia Pensiun 56 Tahun)",
                                    "SEBAGIAN_10_PERSEN" to "Klaim Sebagian 10% (Persiapan Pensiun - min. 10 thn)",
                                    "SEBAGIAN_30_PERSEN" to "Klaim Sebagian 30% (Uang Muka Rumah/KPR - min. 10 thn)"
                                ).forEach { (catKey, catLabel) ->
                                    val isSelected = jhtClaimCategory == catKey
                                    Surface(
                                        color = if (isSelected) colors.primaryContainer else colors.surfaceVariant,
                                        shape = RoundedCornerShape(10.dp),
                                        border = CardDefaults.outlinedCardBorder().copy(
                                            brush = SolidColor(if (isSelected) colors.primary else colors.outline)
                                        ),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable { jhtClaimCategory = catKey }
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                catLabel,
                                                fontSize = 11.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                                color = if (isSelected) colors.onPrimaryContainer else colors.textPrimary
                                            )
                                            if (isSelected) {
                                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = colors.primary, modifier = Modifier.size(16.dp))
                                            }
                                        }
                                    }
                                }
                            }

                            // Saldo Iuran & Saluran Klaim
                            Surface(
                                color = colors.surfaceVariant,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Akumulasi Iuran Bulanan (5.7%):", fontSize = 11.sp, color = colors.textSecondary)
                                        Text(Formatters.formatRupiah(jhtResult.estimatedMonthlyContribution) + " / bln", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Porsi Klaim yang Diizinkan:", fontSize = 11.sp, color = colors.textSecondary)
                                        Text("${(jhtResult.claimPercentageAllowed * 100).toInt()}% dari Saldo", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.indigo)
                                    }
                                    HorizontalDivider(color = colors.outline.copy(alpha = 0.4f), thickness = 0.6.dp)
                                    Text(jhtResult.taxNotes, fontSize = 10.sp, color = colors.textMuted, lineHeight = 14.sp)
                                }
                            }

                            // Saluran Klaim JHT (JMO vs Lapakasik)
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Saluran Pengajuan Klaim JHT:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                jhtResult.claimChannels.forEach { channel ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalAlignment = Alignment.Top
                                    ) {
                                        Icon(Icons.Default.CheckCircleOutline, contentDescription = null, tint = colors.indigo, modifier = Modifier.size(14.dp).padding(top = 2.dp))
                                        Text(channel, fontSize = 10.5.sp, color = colors.textSecondary, lineHeight = 14.sp)
                                    }
                                }
                            }
                        }

                        // PROGRAM 3: JKM (JAMINAN KEMATIAN)
                        BpjsProgramType.JKM -> {
                            Text("RINCIAN SANTUNAN JKM & BEASISWA (PP 82/2019)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                            Text("Santunan tunai bagi ahli waris peserta yang meninggal dunia bukan karena kecelakaan kerja.", fontSize = 11.sp, color = colors.textSecondary)

                            Surface(
                                color = colors.surfaceVariant,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("1. Santunan Kematian Sekaligus:", fontSize = 11.sp, color = colors.textSecondary)
                                        Text(Formatters.formatRupiah(jkmResult.santunanKematianSekaligus), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("2. Santunan Berkala (24 bln x Rp 500rb):", fontSize = 11.sp, color = colors.textSecondary)
                                        Text(Formatters.formatRupiah(jkmResult.santunanBerkala24Bulan), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("3. Biaya Pemakaman:", fontSize = 11.sp, color = colors.textSecondary)
                                        Text(Formatters.formatRupiah(jkmResult.biayaPemakaman), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                    }
                                    HorizontalDivider(color = colors.outline.copy(alpha = 0.4f), thickness = 0.6.dp)
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text("Total Santunan Pasti JKM:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                        Text(
                                            Formatters.formatRupiah(jkmResult.totalSantunanPasti),
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = colors.amber
                                        )
                                    }
                                }
                            }

                            // Manfaat Tambahan Beasiswa 2 Anak
                            Surface(
                                color = colors.amberBg,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("+ Manfaat Beasiswa Pendidikan (Maks. 2 Anak):", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.amber)
                                        Text("s.d. Rp 174.000.000", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = colors.amber)
                                    }
                                    Text("• TK/SD: Rp 1.500.000 / anak / tahun (maks 8 tahun)", fontSize = 10.sp, color = colors.textPrimary)
                                    Text("• SMP: Rp 2.000.000 / anak / tahun (maks 3 tahun)", fontSize = 10.sp, color = colors.textPrimary)
                                    Text("• SMA: Rp 3.000.000 / anak / tahun (maks 3 tahun)", fontSize = 10.sp, color = colors.textPrimary)
                                    Text("• Perguruan Tinggi / S1: Rp 12.000.000 / anak / tahun (maks 5 tahun)", fontSize = 10.sp, color = colors.textPrimary)
                                    Text("*Syarat beasiswa: Minimal masa kepesertaan 3 tahun.", fontSize = 9.5.sp, color = colors.textMuted)
                                }
                            }
                        }

                        // PROGRAM 4: JKK (JAMINAN KECELAKAAN KERJA & STMB)
                        BpjsProgramType.JKK -> {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("SIMULASI MANFAAT JKK & STMB", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                Surface(
                                    color = colors.tealBg,
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text(
                                        "PP 82/2019 & PP 44/2015",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = colors.teal,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }

                            Text(
                                "Perlindungan atas risiko kecelakaan saat bekerja/berangkat-pulang, perawatan medis tanpa batas (unlimited), serta penggantian upah STMB selama masa pemulihan.",
                                fontSize = 11.sp,
                                color = colors.textSecondary,
                                lineHeight = 15.sp
                            )

                            OutlinedTextField(
                                value = jkkSalaryInput,
                                onValueChange = { jkkSalaryInput = it },
                                label = { Text("Upah Pokok + Tunjangan Tetap Terlapor (Rp)", fontSize = 11.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth().testTag("jkk_salary_input"),
                                colors = com.example.ui.components.highContrastTextFieldColors(),
                                supportingText = {
                                    Text(
                                        "Upah harian acuan (Prorata 1/30 upah): ${Formatters.formatRupiah(jkkResult.dailyWage)} / hari",
                                        fontSize = 9.5.sp,
                                        color = colors.teal,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            )

                            // DETIL STMB (Sementara Tidak Mampu Bekerja)
                            Surface(
                                color = colors.primaryCardBg,
                                shape = RoundedCornerShape(16.dp),
                                border = CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.primary.copy(alpha = 0.35f))),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(Icons.Default.Healing, contentDescription = null, tint = colors.primary, modifier = Modifier.size(18.dp))
                                        Text(
                                            "Kalkulator STMB (Penggantian Upah Harian)",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = colors.primary
                                        )
                                    }

                                    Text(
                                        "STMB (Sementara Tidak Mampu Bekerja) mengganti upah pekerja selama menjalani rawat inap atau istirahat medis dokter (100% upah pada 12 bulan pertama).",
                                        fontSize = 10.5.sp,
                                        color = colors.textSecondary,
                                        lineHeight = 14.sp
                                    )

                                    // Quick Preset Day Chips (5, 10, 14, 21, 30 Hari)
                                    Text("Pilih Durasi Rawat / Istirahat Sakit (Hari):", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        listOf(5, 10, 14, 21, 30).forEach { days ->
                                            val isSelected = effectiveStmbDays == days
                                            Surface(
                                                color = if (isSelected) colors.primary else colors.surfaceVariant,
                                                shape = RoundedCornerShape(10.dp),
                                                border = CardDefaults.outlinedCardBorder().copy(
                                                    brush = SolidColor(if (isSelected) colors.primary else colors.outline.copy(alpha = 0.5f))
                                                ),
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .clickable { stmbDaysInput = days.toString() }
                                                    .testTag("stmb_chip_${days}d")
                                            ) {
                                                Column(
                                                    modifier = Modifier.padding(vertical = 8.dp, horizontal = 2.dp),
                                                    horizontalAlignment = Alignment.CenterHorizontally
                                                ) {
                                                    Text(
                                                        "$days Hari",
                                                        fontSize = 11.sp,
                                                        fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.SemiBold,
                                                        color = if (isSelected) Color.White else colors.textPrimary
                                                    )
                                                }
                                            }
                                        }
                                    }

                                    // Custom input & period selection
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        OutlinedTextField(
                                            value = stmbDaysInput,
                                            onValueChange = { input ->
                                                if (input.all { it.isDigit() } && input.length <= 4) {
                                                    stmbDaysInput = input
                                                }
                                            },
                                            label = { Text("Jumlah Hari Rawat", fontSize = 10.sp) },
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                            modifier = Modifier.weight(1f).testTag("stmb_days_input"),
                                            colors = com.example.ui.components.highContrastTextFieldColors(),
                                            trailingIcon = { Text("Hari ", fontSize = 11.sp, color = colors.textMuted) }
                                        )

                                        // Periode Selection (Bulan 1-6 vs 7-12 vs 13+)
                                        Surface(
                                            color = colors.surfaceVariant,
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier.weight(1.2f)
                                        ) {
                                            Column(modifier = Modifier.padding(8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                                Text("Tahap Periode STMB:", fontSize = 9.sp, color = colors.textMuted)
                                                Text(
                                                    if (stmbPeriodOption <= 12) "100% Upah (PP 82/2019)" else "50% Upah (Bln 13+)",
                                                    fontSize = 10.5.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = colors.teal
                                                )
                                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                    FilterChip(
                                                        selected = stmbPeriodOption == 1,
                                                        onClick = { stmbPeriodOption = 1 },
                                                        label = { Text("≤ 12 Bln", fontSize = 9.5.sp) },
                                                        modifier = Modifier.height(26.dp)
                                                    )
                                                    FilterChip(
                                                        selected = stmbPeriodOption == 13,
                                                        onClick = { stmbPeriodOption = 13 },
                                                        label = { Text("> 12 Bln", fontSize = 9.5.sp) },
                                                        modifier = Modifier.height(26.dp)
                                                    )
                                                }
                                            }
                                        }
                                    }

                                    // Kartu Hasil Simulasi STMB Terpilih
                                    Surface(
                                        color = colors.surfaceVariant,
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                Text("Upah Pokok per Hari (1/30):", fontSize = 11.sp, color = colors.textSecondary)
                                                Text(Formatters.formatRupiah(stmbCustomResult.dailyWage), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                            }
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                Text("Lama Hari Istirahat/Rawat:", fontSize = 11.sp, color = colors.textSecondary)
                                                Text("${stmbCustomResult.daysCount} Hari", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                            }
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                Text("Tarif Penggantian STMB:", fontSize = 11.sp, color = colors.textSecondary)
                                                Text("${(stmbCustomResult.percentage * 100).toInt()}% Upah", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.teal)
                                            }
                                            HorizontalDivider(color = colors.outline.copy(alpha = 0.4f), thickness = 0.6.dp)
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Column {
                                                    Text("Total Penggantian Upah STMB:", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                                    Text("Ditanggung BPJS Ketenagakerjaan", fontSize = 9.sp, color = colors.teal)
                                                }
                                                Text(
                                                    Formatters.formatRupiah(stmbCustomResult.totalBenefit),
                                                    fontSize = 16.sp,
                                                    fontWeight = FontWeight.ExtraBold,
                                                    color = colors.success
                                                )
                                            }
                                        }
                                    }

                                    // Tabel Komparasi Cepat: 5, 10, 14, 21 Hari
                                    Text("Perbandingan Cepat Santunan STMB:", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        listOf(
                                            Triple(5, "5 Hari Rawat/Istirahat", "Rawat luka ringan / jahitan"),
                                            Triple(10, "10 Hari Rawat/Istirahat", "Pemulihan cedera sedang"),
                                            Triple(14, "14 Hari (2 Minggu)", "Pasca tindakan bedah / rawat inap"),
                                            Triple(21, "21 Hari (3 Minggu)", "Pemulihan patah tulang / cedera berat")
                                        ).forEach { (days, title, note) ->
                                            val sim = IndonesianPayrollCalculators.calculateStmbDetail(effectiveJkkSalary, days, monthPeriod = 1)
                                            Surface(
                                                color = if (effectiveStmbDays == days) colors.tealBg else colors.surfaceVariant.copy(alpha = 0.6f),
                                                shape = RoundedCornerShape(8.dp),
                                                border = if (effectiveStmbDays == days) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.teal)) else null,
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clickable { stmbDaysInput = days.toString() }
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Column(modifier = Modifier.weight(1f)) {
                                                        Text(title, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                                        Text(note, fontSize = 9.sp, color = colors.textMuted)
                                                    }
                                                    Text(
                                                        Formatters.formatRupiah(sim.totalBenefit),
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.ExtraBold,
                                                        color = colors.teal
                                                    )
                                                }
                                            }
                                        }
                                    }

                                    // Catatan Hak Pekerja
                                    Surface(
                                        color = colors.tealBg,
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(10.dp),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = colors.teal, modifier = Modifier.size(16.dp))
                                            Text(
                                                "Gaji Karyawan Tetap Dibayar: Perusahaan tetap membayarkan upah karyawan tanpa potongan, kemudian mengklaim penggantian penuh (reimburse) ke BPJS-TK melampirkan Formulir KK3 & Surat Sakit Dokter.",
                                                fontSize = 9.5.sp,
                                                color = colors.textPrimary,
                                                lineHeight = 13.5.sp
                                            )
                                        }
                                    }
                                }
                            }

                            // Rincian Manfaat JKK Lainnya
                            Surface(
                                color = colors.surfaceVariant,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("Manfaat Lain Program JKK:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("1. Biaya Pengobatan Medis di RS PLKK:", fontSize = 10.5.sp, color = colors.textSecondary)
                                        Text("UNLIMITED (Tanpa Batas)", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.success)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("2. STMB Bulanan (Bulan 1 s.d. 12):", fontSize = 10.5.sp, color = colors.textSecondary)
                                        Text("${Formatters.formatRupiah(jkkResult.stmbMonth1To6Monthly)} / bln (100%)", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("3. STMB Bulanan (Bulan 13 s.d. Sembuh):", fontSize = 10.5.sp, color = colors.textSecondary)
                                        Text("${Formatters.formatRupiah(jkkResult.stmbMonth13AfterMonthly)} / bln (50%)", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                    }
                                    HorizontalDivider(color = colors.outline.copy(alpha = 0.4f), thickness = 0.6.dp)
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Santunan Meninggal Dunia JKK (48x Upah):", fontSize = 10.5.sp, color = colors.textSecondary)
                                        Text(Formatters.formatRupiah(jkkResult.santunanMeninggalDuniaJkk), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.error)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Santunan Cacat Total Tetap (56x Upah + Berkala):", fontSize = 10.5.sp, color = colors.textSecondary)
                                        Text(Formatters.formatRupiah(jkkResult.santunanCacatTotalTetap), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.error)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Beasiswa Pendidikan (Maks. 2 Anak):", fontSize = 10.5.sp, color = colors.textSecondary)
                                        Text("s.d. Rp 174.000.000", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.amber)
                                    }
                                }
                            }
                        }

                        // 5. JAMINAN PENSIUN (JP - PP NO. 45 TAHUN 2015)
                        BpjsProgramType.JP -> {
                        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            // Sub-Header
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "SIMULASI MANFAAT JAMINAN PENSIUN (JP)",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = colors.primary
                                )
                                Surface(
                                    color = colors.purpleBg,
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text(
                                        "PP 45/2015",
                                        fontSize = 9.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.primary,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }

                            Text(
                                "Program Jaminan Pensiun memberikan penggantian penghasilan bulanan seumur hidup (jika masa iur ≥ 15 tahun / 180 bulan) atau pembayaran akumulasi iuran + hasil pengembangan sekaligus (Lump Sum jika < 15 tahun) saat memasuki usia pensiun.",
                                fontSize = 11.sp,
                                color = colors.textSecondary,
                                lineHeight = 15.sp
                            )

                            // Upah Terlapor Input
                            OutlinedTextField(
                                value = jpSalaryInput,
                                onValueChange = { jpSalaryInput = it.filter { ch -> ch.isDigit() } },
                                label = { Text("Upah Pokok + Tunjangan Tetap (Rp)", fontSize = 11.sp) },
                                modifier = Modifier.fillMaxWidth().testTag("jp_salary_input"),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                supportingText = {
                                    Text(
                                        "Plafon maksimal upah JP per 2025: Rp 10.042.300 / bln. Iuran total 3% (1% Pekerja + 2% Perusahaan).",
                                        fontSize = 10.sp,
                                        color = colors.textMuted
                                    )
                                },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = colors.primary,
                                    unfocusedBorderColor = colors.inputBorderUnfocused
                                )
                            )

                            // Masa Iur Kepesertaan Selector
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        "Masa Iur Kepesertaan:",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.textPrimary
                                    )
                                    Text(
                                        "${effectiveJpYears.toInt()} Tahun (${(effectiveJpYears * 12).toInt()} Bulan)",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = if (jpResult.isEligibleForMonthlyPension) colors.success else colors.amber
                                    )
                                }

                                // Quick presets chips
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    val yearPresets = listOf(3.0, 5.0, 10.0, 15.0, 20.0, 25.0, 30.0)
                                    items(yearPresets) { yrs ->
                                        val isCurrent = effectiveJpYears == yrs
                                        Surface(
                                            color = if (isCurrent) colors.primaryContainer else colors.primaryCardBg,
                                            shape = RoundedCornerShape(8.dp),
                                            border = CardDefaults.outlinedCardBorder().copy(
                                                brush = SolidColor(if (isCurrent) colors.primary else colors.secondaryCardBorder)
                                            ),
                                            modifier = Modifier
                                                .clickable { jpYearsInput = yrs.toInt().toString() }
                                                .testTag("jp_years_${yrs.toInt()}_chip")
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                                            ) {
                                                Text(
                                                    "${yrs.toInt()} Thn",
                                                    fontSize = 10.5.sp,
                                                    fontWeight = if (isCurrent) FontWeight.ExtraBold else FontWeight.Medium,
                                                    color = if (isCurrent) colors.onPrimaryContainer else colors.textSecondary
                                                )
                                                if (yrs == 15.0) {
                                                    Surface(
                                                        color = colors.successBg,
                                                        shape = RoundedCornerShape(4.dp)
                                                    ) {
                                                        Text(
                                                            "Min Berkala",
                                                            fontSize = 8.5.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = colors.success,
                                                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                OutlinedTextField(
                                    value = jpYearsInput,
                                    onValueChange = { jpYearsInput = it.filter { ch -> ch.isDigit() } },
                                    label = { Text("Ketik Masa Iur Kustom (Tahun, maks. 45 thn)", fontSize = 10.5.sp) },
                                    modifier = Modifier.fillMaxWidth().testTag("jp_years_input"),
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = colors.primary,
                                        unfocusedBorderColor = colors.inputBorderUnfocused
                                    )
                                )
                            }

                            // Hasil Simulasi Card
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (jpResult.isEligibleForMonthlyPension) colors.successBg.copy(alpha = 0.5f) else colors.amberBg.copy(alpha = 0.5f)
                                ),
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = SolidColor(if (jpResult.isEligibleForMonthlyPension) colors.success.copy(alpha = 0.5f) else colors.amber.copy(alpha = 0.5f))
                                ),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            if (jpResult.isEligibleForMonthlyPension) "STATUS: PENSIUN BULANAN SEUMUR HIDUP" else "STATUS: MANFAAT SEKALIGUS (LUMP SUM)",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = if (jpResult.isEligibleForMonthlyPension) colors.success else colors.amber
                                        )
                                        Surface(
                                            color = if (jpResult.isEligibleForMonthlyPension) colors.success else colors.amber,
                                            shape = RoundedCornerShape(6.dp)
                                        ) {
                                            Text(
                                                if (jpResult.isEligibleForMonthlyPension) "≥ 15 Tahun (180 Bln)" else "< 15 Tahun",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                    }

                                    if (jpResult.isEligibleForMonthlyPension) {
                                        // Mode A: Pensiun Bulanan
                                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text("Estimasi Manfaat Pensiun Hari Tua (MPHT):", fontSize = 10.5.sp, color = colors.textSecondary)
                                            Text(
                                                "${Formatters.formatRupiah(jpResult.monthlyPensionEstimate)} / bulan",
                                                fontSize = 20.sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = colors.success
                                            )
                                            Text(
                                                "Diterima setiap bulan seumur hidup peserta mulai usia pensiun (${jpResult.currentRetirementAge} tahun per 2025-2027).",
                                                fontSize = 10.sp,
                                                color = colors.textMuted
                                            )
                                        }

                                        Surface(
                                            color = colors.primaryCardBg,
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Text(
                                                    "Formula: 1% × ${jpResult.contributionYears.toInt()} Thn × ${Formatters.formatRupiah(jpResult.cappedSalary)}",
                                                    fontSize = 10.5.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = colors.textPrimary
                                                )
                                                Text(
                                                    "Batas Manfaat PP 45/2015: Minimum ${Formatters.formatRupiah(jpResult.minimumMonthlyPension)} s.d. Maksimum ${Formatters.formatRupiah(jpResult.maximumMonthlyPension)} / bulan.",
                                                    fontSize = 9.5.sp,
                                                    color = colors.textMuted
                                                )
                                            }
                                        }

                                        HorizontalDivider(color = colors.outline.copy(alpha = 0.3f), thickness = 0.6.dp)

                                        Text("Manfaat Turunan Pensiun untuk Ahli Waris:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("• Janda / Duda (50% MPHT seumur hidup):", fontSize = 10.5.sp, color = colors.textSecondary)
                                            Text("${Formatters.formatRupiah(jpResult.jandaDudaMonthlyBenefit)} / bln", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                        }
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("• Anak (50% MPHT s.d. usia 23 thn):", fontSize = 10.5.sp, color = colors.textSecondary)
                                            Text("${Formatters.formatRupiah(jpResult.anakMonthlyBenefit)} / bln", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                        }
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("• Orang Tua (20% MPHT bagi peserta lajang):", fontSize = 10.5.sp, color = colors.textSecondary)
                                            Text("${Formatters.formatRupiah(jpResult.orangTuaMonthlyBenefit)} / bln", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                        }
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("• Pensiun Cacat Total Tetap (100% MPHT):", fontSize = 10.5.sp, color = colors.textSecondary)
                                            Text("${Formatters.formatRupiah(jpResult.cacatTotalMonthlyBenefit)} / bln", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                        }
                                    } else {
                                        // Mode B: Lump Sum (< 15 Tahun)
                                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text("Estimasi Total Manfaat Sekaligus (Lump Sum):", fontSize = 10.5.sp, color = colors.textSecondary)
                                            Text(
                                                Formatters.formatRupiah(jpResult.lumpSumEstimate),
                                                fontSize = 20.sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = colors.amber
                                            )
                                            Text(
                                                "Dicairkan sekaligus ke rekening bank saat mencapai usia pensiun (${jpResult.currentRetirementAge} tahun) karena masa iur belum mencapai 15 tahun (180 bulan).",
                                                fontSize = 10.sp,
                                                color = colors.textMuted
                                            )
                                        }

                                        Surface(
                                            color = colors.primaryCardBg,
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                    Text("Akumulasi Pokok Iuran (${jpResult.contributionMonths} bln x 3%):", fontSize = 10.5.sp, color = colors.textSecondary)
                                                    Text(Formatters.formatRupiah(jpResult.totalContributionsAccumulated), fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                                }
                                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                    Text("Estimasi Hasil Bunga Pengembangan (~5.5% p.a.):", fontSize = 10.5.sp, color = colors.textSecondary)
                                                    Text("+ ${Formatters.formatRupiah(jpResult.estimatedInvestmentYield)}", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.success)
                                                }
                                                HorizontalDivider(color = colors.outline.copy(alpha = 0.4f), thickness = 0.6.dp)
                                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                    Text("Total Pembayaran Sekaligus:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                                    Text(Formatters.formatRupiah(jpResult.lumpSumEstimate), fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = colors.amber)
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Rincian Iuran Bulanan JP
                            Surface(
                                color = colors.primaryCardBg,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("Rincian Iuran Bulanan Program JP (3% Upah):", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Upah Kena Iuran (Max Plafon ${Formatters.formatRupiah(jpResult.wageCap)}):", fontSize = 10.5.sp, color = colors.textSecondary)
                                        Text(Formatters.formatRupiah(jpResult.cappedSalary), fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("1. Iuran Pekerja (1% potong gaji):", fontSize = 10.5.sp, color = colors.textSecondary)
                                        Text(Formatters.formatRupiah(jpResult.contributionEmployee), fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.error)
                                    }
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("2. Iuran Pemberi Kerja / Perusahaan (2%):", fontSize = 10.5.sp, color = colors.textSecondary)
                                        Text(Formatters.formatRupiah(jpResult.contributionEmployer), fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.success)
                                    }
                                    HorizontalDivider(color = colors.outline.copy(alpha = 0.4f), thickness = 0.6.dp)
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Total Iuran Disetor ke BPJS-TK (3%):", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                        Text("${Formatters.formatRupiah(jpResult.totalMonthlyContribution)} / bln", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = colors.primary)
                                    }
                                }
                            }

                            // Jadwal Kenaikan Usia Pensiun Nasional (Pasal 15 PP 45/2015)
                            Surface(
                                color = colors.primaryCardBg,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("Jadwal Usia Pensiun Nasional (PP 45/2015 Pasal 15):", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                        Surface(color = colors.primaryContainer, shape = RoundedCornerShape(6.dp)) {
                                            Text("2025 = 59 Thn", fontSize = 9.5.sp, fontWeight = FontWeight.Bold, color = colors.onPrimaryContainer, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }

                                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        jpResult.retirementAgeSchedule.forEach { (period, age) ->
                                            val isCurrentPeriod = period.contains("Saat Ini")
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .background(
                                                        if (isCurrentPeriod) colors.primaryContainer.copy(alpha = 0.4f) else Color.Transparent,
                                                        RoundedCornerShape(6.dp)
                                                    )
                                                    .padding(horizontal = 6.dp, vertical = 3.dp),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text(
                                                    period,
                                                    fontSize = 10.sp,
                                                    fontWeight = if (isCurrentPeriod) FontWeight.ExtraBold else FontWeight.Normal,
                                                    color = if (isCurrentPeriod) colors.primary else colors.textSecondary
                                                )
                                                Text(
                                                    "$age Tahun",
                                                    fontSize = 10.5.sp,
                                                    fontWeight = if (isCurrentPeriod) FontWeight.ExtraBold else FontWeight.Bold,
                                                    color = if (isCurrentPeriod) colors.primary else colors.textPrimary
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

        // 4. Syarat Dokumen Wajib Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "DOKUMEN PERSYARATAN KLAIM ${selectedProgram.code}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.primary
                        )
                        IconButton(
                            onClick = {
                                val docsList = when (selectedProgram) {
                                    BpjsProgramType.JKP -> jkpResult.requiredDocuments
                                    BpjsProgramType.JHT -> jhtResult.requiredDocuments
                                    BpjsProgramType.JKM -> jkmResult.requiredDocuments
                                    BpjsProgramType.JKK -> jkkResult.requiredDocuments
                                    BpjsProgramType.JP -> jpResult.requiredDocuments
                                }
                                val textToCopy = buildString {
                                    appendLine("=== PERSYARATAN KLAIM ${selectedProgram.title.uppercase()} ===")
                                    appendLine("Dasar Hukum: ${selectedProgram.legalBasis}")
                                    appendLine("\nDokumen yang Wajib Disiapkan:")
                                    docsList.forEachIndexed { i, doc ->
                                        appendLine("${i + 1}. $doc")
                                    }
                                }
                                clipboardManager.setText(AnnotatedString(textToCopy))
                                Toast.makeText(context, "Daftar syarat ${selectedProgram.code} berhasil disalin", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = "Salin Syarat", tint = colors.primary, modifier = Modifier.size(16.dp))
                        }
                    }

                    val requiredDocs = when (selectedProgram) {
                        BpjsProgramType.JKP -> jkpResult.requiredDocuments
                        BpjsProgramType.JHT -> jhtResult.requiredDocuments
                        BpjsProgramType.JKM -> jkmResult.requiredDocuments
                        BpjsProgramType.JKK -> jkkResult.requiredDocuments
                        BpjsProgramType.JP -> jpResult.requiredDocuments
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        requiredDocs.forEachIndexed { index, doc ->
                            Surface(
                                color = colors.primaryCardBg,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Surface(
                                        color = colors.primaryContainer,
                                        shape = CircleShape,
                                        modifier = Modifier.size(20.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text("${index + 1}", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = colors.onPrimaryContainer)
                                        }
                                    }
                                    Text(doc, fontSize = 11.sp, color = colors.textPrimary, lineHeight = 15.sp)
                                }
                            }
                        }
                    }
                }
            }
        }

        // 5. Tahapan Langkah Demi Langkah (Step-by-Step Procedure)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "TATA CARA & ALUR KLAIM ${selectedProgram.code} SESUAI PERUNDANGAN",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.primary
                    )

                    val steps = when (selectedProgram) {
                        BpjsProgramType.JKP -> jkpResult.claimStepByStep
                        BpjsProgramType.JHT -> jhtResult.claimStepByStep
                        BpjsProgramType.JKM -> jkmResult.claimStepByStep
                        BpjsProgramType.JKK -> jkkResult.claimStepByStep
                        BpjsProgramType.JP -> jpResult.claimStepByStep
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        steps.forEach { step ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                Icon(
                                    Icons.Default.ArrowForward,
                                    contentDescription = null,
                                    tint = colors.primary,
                                    modifier = Modifier.size(16.dp).padding(top = 2.dp)
                                )
                                Text(step, fontSize = 11.sp, color = colors.textSecondary, lineHeight = 15.sp)
                            }
                        }
                    }

                    if (selectedProgram == BpjsProgramType.JKP) {
                        Button(
                            onClick = onNavigateToPhkCalculator,
                            modifier = Modifier.fillMaxWidth().testTag("goto_phk_btn"),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                        ) {
                            Icon(Icons.Default.Calculate, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Hitung Pesangon & Kompensasi PHK", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // 6. Ad Banner Placeholder
        item {
            AdBannerPlaceholder(
                isProUser = isProUser,
                onUpgradeClick = onOpenProDialog
            )
        }

        // 7. Legal Disclaimer Card
        item {
            LegalDisclaimerCard()
        }
    }
}
