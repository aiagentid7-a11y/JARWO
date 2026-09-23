package com.example.ui.screens

import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import androidx.compose.runtime.rememberCoroutineScope

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.MonthlyPayrollHistory
import com.example.data.model.UserProfile
import com.example.domain.calculator.IndonesianPayrollCalculators
import com.example.domain.pdf.PdfExporter
import com.example.domain.util.Formatters
import com.example.ui.components.AdBannerPlaceholder
import com.example.ui.components.LegalDisclaimerCard
import com.example.ui.theme.*

/**
 * Layar Laporan Pajak Tahunan & Rekonsiliasi PPh 21 (SPT Tahunan 1770S/1721-A1)
 * Mengacu pada UU HPP No. 7/2021, PP No. 58/2023, & PMK No. 168/2023.
 */
@Composable
fun TaxReportScreen(
    userProfile: UserProfile,
    payrollHistories: List<MonthlyPayrollHistory>,
    isProUser: Boolean,
    onOpenProDialog: () -> Unit
) {
    val colors = GajikuTheme.colors
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    // BUG FIX: sebelumnya di-hardcode ke tahun 2026 (tanggal build), sehingga tahun
    // pajak default akan salah begitu aplikasi dibuka di tahun lain. Sekarang mengikuti
    // tahun berjalan di perangkat pengguna.
    var selectedYear by remember { mutableStateOf(Formatters.getCurrentYear()) }

    val yearPayrolls = remember(payrollHistories, selectedYear) {
        payrollHistories.filter { it.year == selectedYear }.sortedBy { it.month }
    }

    // Perhitungan Akumulasi Setahun
    val totalGrossYear = remember(yearPayrolls) { yearPayrolls.sumOf { it.grossSalary } }
    val totalPph21Paid = remember(yearPayrolls) { yearPayrolls.sumOf { it.pph21Amount } }
    val totalJhtJpYear = remember(yearPayrolls) { yearPayrolls.sumOf { it.bpjsJhtEmployee + it.bpjsJpEmployee } }

    val annualPtkp = remember(userProfile.ptkpStatus) {
        IndonesianPayrollCalculators.getAnnualPtkpAmount(userProfile.ptkpStatus)
    }

    // Biaya Jabatan (5% dari Bruto, maksimal Rp 6.000.000 / tahun atau Rp 500.000 / bulan)
    val maxBiayaJabatan = 6_000_000.0
    val calculatedBiayaJabatan = (totalGrossYear * 0.05).coerceAtMost(maxBiayaJabatan)
    val annualNet = (totalGrossYear - calculatedBiayaJabatan - totalJhtJpYear).coerceAtLeast(0.0)
    val annualPkp = (annualNet - annualPtkp).coerceAtLeast(0.0)

    val annualPph21Due: Double = remember(annualPkp, userProfile.hasNpwp) {
        IndonesianPayrollCalculators.calculateProgressivePph21(annualPkp, userProfile.hasNpwp)
    }

    val taxDifference: Double = annualPph21Due - totalPph21Paid

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 28.dp)
    ) {
        // 1. Header & Year Selector (Primary Summary Tier)
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
                        Text("LAPORAN PAJAK & BUKTI POTONG", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.8.sp, color = colors.primary)
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            IconButton(onClick = { selectedYear-- }, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.ChevronLeft, contentDescription = "Tahun Lalu", tint = colors.textPrimary)
                            }
                            Text("$selectedYear", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                            IconButton(onClick = { selectedYear++ }, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.ChevronRight, contentDescription = "Tahun Depan", tint = colors.textPrimary)
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Total PPh 21 Terutang (Pasal 17)", fontSize = 11.sp, color = colors.textSecondary)
                            Text(
                                text = Formatters.formatRupiah(annualPph21Due),
                                fontSize = 22.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = colors.textPrimary
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("Total Telah Dipotong", fontSize = 11.sp, color = colors.textSecondary)
                            Text(
                                text = Formatters.formatRupiah(totalPph21Paid),
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.success
                            )
                        }
                    }

                    HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                    // Status Selisih Pajak (Nihil / Kurang Bayar / Lebih Bayar)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Status Rekonsiliasi Akhir Tahun:", fontSize = 11.5.sp, color = colors.textSecondary)
                        Text(
                            text = when {
                                taxDifference > 1000 -> "Kurang Bayar: ${Formatters.formatRupiah(taxDifference)}"
                                taxDifference < -1000 -> "Lebih Bayar: ${Formatters.formatRupiah(-taxDifference)}"
                                else -> "Nihil (Sesuai)"
                            },
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (taxDifference > 1000) colors.warning else colors.success
                        )
                    }
                }
            }
        }

        // 2. Action: Cetak / Ekspor Laporan Pajak Tahunan & 1721-A1 PDF
        item {
            Button(
                onClick = {
                    coroutineScope.launch {
                        val file = PdfExporter.exportTaxReportPdf(
                            context = context,
                            profile = userProfile,
                            year = selectedYear,
                            payrolls = yearPayrolls,
                            annualGross = totalGrossYear,
                            annualPtkp = annualPtkp,
                            annualPkp = annualPkp,
                            annualPph21Calculated = annualPph21Due,
                            totalPph21Paid = totalPph21Paid,
                            isProUser = isProUser
                        )
                        if (file != null) {
                            Toast.makeText(context, "Laporan Pajak $selectedYear siap dibagikan!", Toast.LENGTH_SHORT).show()
                            PdfExporter.sharePdfFile(context, file)
                        } else {
                            Toast.makeText(context, "Gagal membuat berkas PDF Laporan Pajak", Toast.LENGTH_SHORT).show()
                        }
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = colors.primaryContainer),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth().height(48.dp).testTag("export_tax_report_button")
            ) {
                Icon(Icons.Default.PictureAsPdf, contentDescription = null, tint = colors.onPrimaryContainer, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Cetak & Ekspor Laporan Pajak / 1721-A1 PDF", fontSize = 12.5.sp, color = colors.onPrimaryContainer, fontWeight = FontWeight.Bold)
            }
        }

        // 3. Rincian Perhitungan Pajak Tahunan (SPT Tahunan)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("RINCIAN KALKULASI SPT TAHUNAN PRIBADI", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)

                    TaxRow("1. Total Penghasilan Bruto Setahun", Formatters.formatRupiah(totalGrossYear))
                    TaxRow("2. Biaya Jabatan (5%, Maks 6 Jt/Thn)", "-${Formatters.formatRupiah(calculatedBiayaJabatan)}")
                    TaxRow("3. Iuran Pensiun / JHT Karyawan Setahun", "-${Formatters.formatRupiah(totalJhtJpYear)}")
                    HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)
                    TaxRow("4. Penghasilan Neto Setahun", Formatters.formatRupiah(annualNet), isBold = true)
                    TaxRow("5. PTKP (${userProfile.ptkpStatus})", "-${Formatters.formatRupiah(annualPtkp)}")
                    HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)
                    TaxRow("6. Penghasilan Kena Pajak (PKP)", Formatters.formatRupiah(annualPkp), isBold = true, valueColor = colors.primary)
                    TaxRow("7. PPh 21 Terutang (Pasal 17 UU HPP)", Formatters.formatRupiah(annualPph21Due), isBold = true, valueColor = colors.textPrimary)
                    TaxRow("8. PPh 21 Terpotong Bulanan (TER Jan-Des)", Formatters.formatRupiah(totalPph21Paid))
                }
            }
        }

        // 4. Riwayat Pemotongan Pajak Bulanan (12 Bulan)
        item {
            Text(
                text = "RIWAYAT PPH 21 TER BULANAN ($selectedYear)",
                fontSize = 11.5.sp,
                fontWeight = FontWeight.Bold,
                color = colors.primary
            )
        }

        if (yearPayrolls.isEmpty()) {
            item {
                Surface(
                    color = colors.secondaryCardBg,
                    shape = RoundedCornerShape(18.dp),
                    border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Belum ada riwayat slip gaji tersimpan di tahun $selectedYear.\nHitung dan simpan slip gaji pada menu Kalkulator untuk melihat rekapitulasi otomatis.",
                        fontSize = 11.5.sp,
                        color = colors.textMuted,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        modifier = Modifier.padding(24.dp)
                    )
                }
            }
        } else {
            items(yearPayrolls) { item ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                    colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                    border = if (colors.isDark) CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder)) else null
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(item.periodLabel, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                            Text(
                                text = "Bruto: ${Formatters.formatRupiah(item.grossSalary)} • Skema: ${if (item.isDecemberRecalculation) "Pasal 17" else item.terCategory + " (" + Formatters.formatPercent(item.terEffectiveRate) + ")"}",
                                fontSize = 10.5.sp,
                                color = colors.textMuted
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = Formatters.formatRupiah(item.pph21Amount),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.error
                            )
                            Text("PPh 21", fontSize = 9.5.sp, color = colors.textMuted)
                        }
                    }
                }
            }
        }

        // 5. Ad Banner & Disclaimer Footer
        item {
            AdBannerPlaceholder(
                isProUser = isProUser,
                onUpgradeClick = onOpenProDialog
            )
        }

        item {
            Text(
                text = "Dasar Hukum: UU No. 7 Tahun 2021 tentang Harmonisasi Peraturan Perpajakan (UU HPP), PP No. 58 Tahun 2023, & PMK No. 168 Tahun 2023 tentang PPh Pasal 21.",
                fontSize = 10.5.sp,
                color = colors.textMuted,
                lineHeight = 15.sp
            )
        }

        item {
            LegalDisclaimerCard()
        }
    }
}

@Composable
private fun TaxRow(
    label: String,
    value: String,
    isBold: Boolean = false,
    valueColor: Color? = null
) {
    val colors = GajikuTheme.colors
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal,
            color = if (isBold) colors.textPrimary else colors.textMuted
        )
        Text(
            text = value,
            fontSize = 11.sp,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal,
            color = valueColor ?: if (isBold) colors.textPrimary else colors.textSecondary
        )
    }
}
