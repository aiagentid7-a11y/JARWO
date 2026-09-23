package com.example.ui.screens

import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import androidx.compose.runtime.rememberCoroutineScope

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.MonthlyPayrollHistory
import com.example.data.model.UserProfile
import com.example.domain.pdf.PdfExporter
import com.example.domain.util.Formatters
import com.example.ui.components.LegalDisclaimerCard
import com.example.ui.theme.*

/**
 * Dialog Rincian Slip Gaji Karyawan dengan 7 Komponen Gaji Lengkap,
 * Zebra-striping bertingkat tinggi untuk kemudahan pemindaian data.
 */
@Composable
fun PayslipDetailDialog(
    payroll: MonthlyPayrollHistory,
    userProfile: UserProfile,
    isProUser: Boolean,
    onDismiss: () -> Unit,
    onOpenProDialog: () -> Unit
) {
    val context = LocalContext.current
    val colors = GajikuTheme.colors
    val coroutineScope = rememberCoroutineScope()

    AlertDialog(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(24.dp),
        containerColor = colors.surface,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "SLIP GAJI RESMI",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = colors.primary
                    )
                    Text(
                        text = payroll.periodLabel,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = colors.textMuted
                    )
                }
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Tutup", tint = colors.textMuted)
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Info Profil Karyawan
                Surface(
                    color = colors.surfaceVariant,
                    shape = RoundedCornerShape(14.dp),
                    border = CardDefaults.outlinedCardBorder().copy(
                        brush = SolidColor(colors.outline)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Text(userProfile.fullName, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = colors.textPrimary)
                        Text("NIK: ${userProfile.nik} • ${userProfile.jobTitle}", fontSize = 11.sp, color = colors.textSecondary)
                        Text("PTKP: ${userProfile.ptkpStatus} • Kategori TER: ${payroll.terCategory}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                    }
                }

                // 1. Penghasilan (7 Komponen Gaji + Lembur + Bonus)
                Text(
                    text = "A. PENGHASILAN (EARNINGS)",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 0.8.sp,
                    color = colors.primary
                )

                val earningsList = buildList {
                    add("1. Gaji Pokok" to Formatters.formatRupiah(payroll.basicSalary))
                    add("2. Tunjangan Tetap" to Formatters.formatRupiah(payroll.fixedAllowance))
                    if (payroll.variableAllowance > 0) add("3. Tunjangan Tidak Tetap" to Formatters.formatRupiah(payroll.variableAllowance))
                    if (payroll.mealAllowance > 0) {
                        val label = if (userProfile.allowanceCalculationMode == "PER_ATTENDANCE") "4. Tunjangan Makan (Kehadiran)" else "4. Tunjangan Makan"
                        add(label to Formatters.formatRupiah(payroll.mealAllowance))
                    }
                    if (payroll.transportAllowance > 0) {
                        val label = if (userProfile.allowanceCalculationMode == "PER_ATTENDANCE") "5. Tunjangan Transport (Kehadiran)" else "5. Tunjangan Transport"
                        add(label to Formatters.formatRupiah(payroll.transportAllowance))
                    }
                    if (payroll.phoneAllowance > 0) add("6. Tunjangan Pulsa" to Formatters.formatRupiah(payroll.phoneAllowance))
                    if (payroll.remoteAreaAllowance > 0) add("7. Tunjangan Remote Area" to Formatters.formatRupiah(payroll.remoteAreaAllowance))
                    if (payroll.ritasePay > 0) add("8. Upah / Tunjangan Ritase" to Formatters.formatRupiah(payroll.ritasePay))
                    if (payroll.hmPay > 0) add("9. Upah / Premi HM (Hour Meter)" to Formatters.formatRupiah(payroll.hmPay))
                    if (payroll.incentivePay > 0) add("10. Insentif Kinerja" to Formatters.formatRupiah(payroll.incentivePay))
                    if (payroll.overtimePay > 0) add("11. Upah Lembur (PP 35/2021)" to Formatters.formatRupiah(payroll.overtimePay))
                    if (payroll.bonusOrThr > 0) add("12. Bonus / THR Keagamaan" to Formatters.formatRupiah(payroll.bonusOrThr))
                }

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .border(1.dp, colors.outline, RoundedCornerShape(12.dp))
                ) {
                    earningsList.forEachIndexed { index, (label, value) ->
                        val isEven = index % 2 == 0
                        DetailRow(
                            label = label,
                            value = value,
                            backgroundColor = if (isEven) colors.zebraEvenBg else colors.zebraOddBg,
                            valueColor = colors.textPrimary
                        )
                    }
                }

                DetailRow(
                    label = "TOTAL PENGHASILAN BRUTO",
                    value = Formatters.formatRupiah(payroll.grossSalary),
                    isBold = true,
                    backgroundColor = colors.primaryContainer.copy(alpha = if (colors.isDark) 0.35f else 0.15f),
                    valueColor = colors.textPrimary
                )

                Spacer(modifier = Modifier.height(2.dp))

                // 2. Potongan
                Text(
                    text = "B. POTONGAN (DEDUCTIONS)",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 0.8.sp,
                    color = colors.primary
                )

                val deductionList = buildList {
                    add(Triple("• BPJS Kes Karyawan (1%)", if (payroll.isBpjsKesEnabled) "-${Formatters.formatRupiah(payroll.bpjsKesEmployee)}" else "Nonaktif / Rp 0", if (payroll.isBpjsKesEnabled) colors.error else colors.success))
                    add(Triple("• BPJS JHT Karyawan (2%)", if (payroll.isBpjsJhtEnabled) "-${Formatters.formatRupiah(payroll.bpjsJhtEmployee)}" else "Nonaktif / Rp 0", if (payroll.isBpjsJhtEnabled) colors.error else colors.success))
                    add(Triple("• BPJS JP Karyawan (1%)", if (payroll.isBpjsJpEnabled) "-${Formatters.formatRupiah(payroll.bpjsJpEmployee)}" else "Nonaktif / Rp 0", if (payroll.isBpjsJpEnabled) colors.error else colors.success))
                    if (payroll.isPph21Enabled && payroll.pph21Amount > 0) {
                        add(Triple("• PPh 21 (${payroll.terCategory} ${Formatters.formatPercent(payroll.terEffectiveRate)})", "-${Formatters.formatRupiah(payroll.pph21Amount)}", colors.error))
                    } else {
                        add(Triple("• PPh 21 (Nonaktif / Bebas Pajak)", "Rp 0", colors.success))
                    }
                    if (payroll.customDeductionKasbon > 0) add(Triple("• Potongan Kasbon", "-${Formatters.formatRupiah(payroll.customDeductionKasbon)}", colors.error))
                    if (payroll.customDeductionLate > 0) add(Triple("• Potongan Keterlambatan", "-${Formatters.formatRupiah(payroll.customDeductionLate)}", colors.error))
                    if (payroll.customDeductionOther > 0) add(Triple("• Potongan Lainnya", "-${Formatters.formatRupiah(payroll.customDeductionOther)}", colors.error))
                }

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .border(1.dp, colors.outline, RoundedCornerShape(12.dp))
                ) {
                    deductionList.forEachIndexed { index, (label, value, color) ->
                        val isEven = index % 2 == 0
                        DetailRow(
                            label = label,
                            value = value,
                            backgroundColor = if (isEven) colors.zebraEvenBg else colors.zebraOddBg,
                            valueColor = color
                        )
                    }
                }

                val totalDeductions = payroll.totalBpjsEmployee + payroll.pph21Amount + payroll.totalCustomDeductions
                DetailRow(
                    label = "TOTAL POTONGAN",
                    value = "-${Formatters.formatRupiah(totalDeductions)}",
                    isBold = true,
                    backgroundColor = colors.roseBg.copy(alpha = if (colors.isDark) 0.5f else 0.2f),
                    valueColor = colors.error
                )

                Spacer(modifier = Modifier.height(4.dp))

                // 3. Take Home Pay Card (Highlighted)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                    colors = CardDefaults.cardColors(containerColor = colors.primaryCardBg),
                    border = if (colors.isDark) {
                        CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.primary.copy(alpha = 0.4f)))
                    } else null
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("TAKE HOME PAY BERSIH:", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.8.sp, color = colors.primary)
                            Text("Gaji Diterima Karyawan", fontSize = 10.sp, color = colors.textMuted)
                        }
                        Text(
                            text = Formatters.formatRupiah(payroll.netTakeHomePay),
                            fontSize = 19.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = colors.success
                        )
                    }
                }

                LegalDisclaimerCard()
            }
        },
        confirmButton = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = {
                        coroutineScope.launch {
                            val pdfFile = PdfExporter.exportPayslipPdf(
                                context = context,
                                profile = userProfile,
                                payroll = payroll,
                                isProUser = isProUser
                            )
                            if (pdfFile != null) {
                                PdfExporter.sharePdfFile(context, pdfFile)
                            } else {
                                Toast.makeText(context, "Gagal membuat berkas PDF", Toast.LENGTH_SHORT).show()
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = colors.primaryContainer),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f).testTag("export_pdf_button")
                ) {
                    Icon(Icons.Default.Share, contentDescription = null, tint = colors.onPrimaryContainer, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Cetak / Share PDF", fontSize = 11.5.sp, color = colors.onPrimaryContainer, fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = onDismiss,
                    shape = RoundedCornerShape(12.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = SolidColor(colors.outline)
                    )
                ) {
                    Text("Tutup", fontSize = 11.5.sp, color = colors.textPrimary)
                }
            }
        }
    )
}

@Composable
private fun DetailRow(
    label: String,
    value: String,
    isBold: Boolean = false,
    backgroundColor: Color = Color.Transparent,
    valueColor: Color
) {
    val colors = GajikuTheme.colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(backgroundColor)
            .padding(horizontal = 12.dp, vertical = 9.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Medium,
            color = if (isBold) colors.textPrimary else colors.textSecondary
        )
        Text(
            text = value,
            fontSize = 11.sp,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.SemiBold,
            color = valueColor
        )
    }
}
