package com.example.domain.pdf

import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import androidx.core.content.FileProvider
import com.example.data.model.MonthlyPayrollHistory
import com.example.data.model.UserProfile
import com.example.domain.util.Formatters
import java.io.File
import java.io.FileOutputStream

object PdfExporter {

    /**
     * Generate & Share PDF Slip Gaji Karyawan dengan 7 Komponen Gaji Lengkap:
     * 1. Gaji Pokok
     * 2. Tunjangan Tetap
     * 3. Tunjangan Tidak Tetap
     * 4. Makan
     * 5. Transport
     * 6. Pulsa
     * 7. Remote Area
     */
    suspend fun exportPayslipPdf(
        context: Context,
        profile: UserProfile,
        payroll: MonthlyPayrollHistory,
        isProUser: Boolean
    ): File? = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        val document = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4 standard (595 x 842 pt)
        val page = document.startPage(pageInfo)
        val canvas: Canvas = page.canvas

        val titlePaint = Paint().apply {
            isAntiAlias = true
            textSize = 18f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            color = Color.rgb(79, 55, 139) // Elegant Royal Purple
        }
        val subtitlePaint = Paint().apply {
            isAntiAlias = true
            textSize = 9.5f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
            color = Color.rgb(100, 116, 139)
        }
        val headerSectionPaint = Paint().apply {
            isAntiAlias = true
            textSize = 11f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            color = Color.rgb(15, 23, 42)
        }
        val textPaint = Paint().apply {
            isAntiAlias = true
            textSize = 9.5f
            color = Color.rgb(30, 41, 59)
        }
        val boldTextPaint = Paint().apply {
            isAntiAlias = true
            textSize = 9.5f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            color = Color.rgb(15, 23, 42)
        }
        val linePaint = Paint().apply {
            color = Color.rgb(226, 232, 240)
            strokeWidth = 1f
        }
        val bgBoxPaint = Paint().apply {
            color = Color.rgb(248, 250, 252)
        }

        var y = 40f

        // 1. Header Box
        canvas.drawText("SLIP GAJI KARYAWAN", 40f, y, titlePaint)
        y += 16f
        canvas.drawText("Periode: ${payroll.periodLabel} | Dicetak mandiri melalui Personal Payroll & ESS", 40f, y, subtitlePaint)
        y += 12f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 16f

        // 2. Info Karyawan
        canvas.drawRect(40f, y, 555f, y + 60f, bgBoxPaint)
        val infoY = y + 16f
        canvas.drawText("Nama: ${profile.fullName}", 50f, infoY, boldTextPaint)
        canvas.drawText("NIK: ${profile.nik}", 50f, infoY + 15f, textPaint)
        canvas.drawText("Jabatan: ${profile.jobTitle}", 50f, infoY + 30f, textPaint)

        canvas.drawText("Perusahaan: ${profile.companyName}", 300f, infoY, boldTextPaint)
        canvas.drawText("NPWP: ${if (profile.hasNpwp) profile.npwp else "Tidak Ber-NPWP"}", 300f, infoY + 15f, textPaint)
        canvas.drawText("PTKP / TER: ${profile.ptkpStatus} / TER ${payroll.terCategory}", 300f, infoY + 30f, textPaint)
        y += 75f

        // 3. Rincian Penghasilan (7 Komponen + Lembur + Bonus)
        canvas.drawText("A. PENGHASILAN (EARNINGS)", 40f, y, headerSectionPaint)
        y += 12f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 15f

        fun drawRow(label: String, amount: Double, isBold: Boolean = false) {
            val p = if (isBold) boldTextPaint else textPaint
            canvas.drawText(label, 50f, y, p)
            val amtStr = Formatters.formatRupiah(amount)
            val amtWidth = p.measureText(amtStr)
            canvas.drawText(amtStr, 545f - amtWidth, y, p)
            y += 14.5f
        }

        drawRow("1. Gaji Pokok", payroll.basicSalary)
        drawRow("2. Tunjangan Tetap", payroll.fixedAllowance)
        if (payroll.variableAllowance > 0) {
            drawRow("3. Tunjangan Tidak Tetap", payroll.variableAllowance)
        }
        if (payroll.mealAllowance > 0) {
            val mealLabel = if (profile.allowanceCalculationMode == "PER_ATTENDANCE") "4. Tunjangan Makan (Kehadiran)" else "4. Tunjangan Makan"
            drawRow(mealLabel, payroll.mealAllowance)
        }
        if (payroll.transportAllowance > 0) {
            val transportLabel = if (profile.allowanceCalculationMode == "PER_ATTENDANCE") "5. Tunjangan Transport (Kehadiran)" else "5. Tunjangan Transport"
            drawRow(transportLabel, payroll.transportAllowance)
        }
        if (payroll.phoneAllowance > 0) {
            drawRow("6. Tunjangan Pulsa / Komunikasi", payroll.phoneAllowance)
        }
        if (payroll.remoteAreaAllowance > 0) {
            drawRow("7. Tunjangan Remote Area / Site", payroll.remoteAreaAllowance)
        }
        if (payroll.ritasePay > 0) {
            drawRow("8. Upah / Tunjangan Ritase", payroll.ritasePay)
        }
        if (payroll.hmPay > 0) {
            drawRow("9. Upah / Premi HM (Hour Meter)", payroll.hmPay)
        }
        if (payroll.incentivePay > 0) {
            drawRow("10. Insentif Kinerja / Target", payroll.incentivePay)
        }
        if (payroll.overtimePay > 0) {
            drawRow("11. Upah Lembur (PP 35/2021)", payroll.overtimePay)
        }
        if (payroll.bonusOrThr > 0) {
            drawRow("12. Bonus / THR Keagamaan", payroll.bonusOrThr)
        }
        y += 2f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 14f
        drawRow("TOTAL PENGHASILAN BRUTO", payroll.grossSalary, isBold = true)
        y += 14f

        // 4. Rincian Potongan (Deductions)
        canvas.drawText("B. POTONGAN (DEDUCTIONS)", 40f, y, headerSectionPaint)
        y += 12f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 15f

        if (payroll.isBpjsKesEnabled) {
            drawRow("1. BPJS Kesehatan Karyawan (1% - Perpres 64/2020)", payroll.bpjsKesEmployee)
        }
        if (payroll.isBpjsJhtEnabled) {
            drawRow("2. BPJS Ketenagakerjaan JHT Karyawan (2% - PP 44/2015)", payroll.bpjsJhtEmployee)
        }
        if (payroll.isBpjsJpEnabled) {
            drawRow("3. BPJS Ketenagakerjaan JP Karyawan (1% - PP 45/2015)", payroll.bpjsJpEmployee)
        }
        if (payroll.isPph21Enabled && payroll.pph21Amount > 0) {
            drawRow("4. PPh 21 ${if (payroll.isDecemberRecalculation) "Pasal 17 Tahunan" else "TER " + payroll.terCategory} (${Formatters.formatPercent(payroll.terEffectiveRate)})", payroll.pph21Amount)
        } else {
            drawRow("4. PPh 21 (Nonaktif / Ditanggung Perusahaan)", 0.0)
        }
        if (payroll.customDeductionKasbon > 0) {
            drawRow("5. Potongan Kasbon / Pinjaman", payroll.customDeductionKasbon)
        }
        if (payroll.customDeductionLate > 0) {
            drawRow("6. Potongan Keterlambatan", payroll.customDeductionLate)
        }
        if (payroll.customDeductionOther > 0) {
            drawRow("7. Potongan Lainnya", payroll.customDeductionOther)
        }

        val totalDeductions = payroll.totalBpjsEmployee + payroll.pph21Amount + payroll.totalCustomDeductions
        y += 2f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 14f
        drawRow("TOTAL POTONGAN", totalDeductions, isBold = true)
        y += 16f

        // 5. Total Take Home Pay Box
        val thpBoxPaint = Paint().apply {
            color = Color.rgb(238, 242, 255) // Soft Indigo Box
        }
        canvas.drawRect(40f, y, 555f, y + 42f, thpBoxPaint)
        val thpY = y + 26f
        val thpLabelPaint = Paint().apply {
            textSize = 11f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            color = Color.rgb(49, 46, 129)
        }
        val thpValPaint = Paint().apply {
            textSize = 13f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            color = Color.rgb(67, 56, 202)
        }
        canvas.drawText("TAKE HOME PAY (GAJI BERSIH)", 55f, thpY, thpLabelPaint)
        val thpStr = Formatters.formatRupiah(payroll.netTakeHomePay)
        val thpWidth = thpValPaint.measureText(thpStr)
        canvas.drawText(thpStr, 540f - thpWidth, thpY, thpValPaint)
        y += 58f

        // 6. Tanggungan Perusahaan (Informasional BPJS Company)
        canvas.drawText("C. IURAN PERUSAHAAN (INFORMASIONAL)", 40f, y, subtitlePaint)
        y += 12f
        val infoComp = "BPJS Kes (4%): ${Formatters.formatRupiah(payroll.bpjsKesCompany)} | JHT (3.7%): ${Formatters.formatRupiah(payroll.bpjsJhtCompany)} | JP (2%): ${Formatters.formatRupiah(payroll.bpjsJpCompany)} | JKK & JKM: ${Formatters.formatRupiah(payroll.bpjsJkkCompany + payroll.bpjsJkmCompany)}"
        canvas.drawText(infoComp, 40f, y, subtitlePaint)
        y += 30f

        // 7. Watermark / Footer
        val footerPaint = Paint().apply {
            textSize = 8f
            color = if (isProUser) Color.rgb(100, 116, 139) else Color.rgb(220, 38, 38)
            textAlign = Paint.Align.CENTER
        }
        val disclaimerText = if (isProUser) {
            "DOKUMEN RESMI STANDALONE ESS (VERSI PRO) - Dibuat secara mandiri oleh karyawan"
        } else {
            "SALINAN PRIBADI (VERSI GRATIS) - Upgrade ke Pro untuk Ekspor PDF Resmi Tanpa Watermark"
        }
        canvas.drawText(disclaimerText, 297.5f, 790f, footerPaint)

        val legalFooterPaint = Paint().apply {
            textSize = 7f
            color = Color.rgb(148, 163, 184)
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText("Kalkulator independen mematuhi UU Cipta Kerja No. 6/2023, PP 35/2021, PP 58/2023, & PMK 168/2023.", 297.5f, 805f, legalFooterPaint)

        document.finishPage(page)

        try {
            val cachePath = File(context.cacheDir, "payslips")
            if (!cachePath.exists()) cachePath.mkdirs()
            val file = File(cachePath, "Slip_Gaji_${payroll.year}_${payroll.month}_${profile.fullName.replace(" ", "_")}.pdf")
            val outputStream = FileOutputStream(file)
            document.writeTo(outputStream)
            outputStream.close()
            document.close()
            file
        } catch (e: Exception) {
            android.util.Log.e("PdfExporter", "Gagal membuat PDF slip gaji", e)
            document.close()
            null
        }
    }

    /**
     * Generate Laporan Pajak Tahunan & Simulasi Bukti Potong 1721-A1 PDF
     */
    suspend fun exportTaxReportPdf(
        context: Context,
        profile: UserProfile,
        year: Int,
        payrolls: List<MonthlyPayrollHistory>,
        annualGross: Double,
        annualPtkp: Double,
        annualPkp: Double,
        annualPph21Calculated: Double,
        totalPph21Paid: Double,
        isProUser: Boolean
    ): File? = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        val document = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
        val page = document.startPage(pageInfo)
        val canvas: Canvas = page.canvas

        val titlePaint = Paint().apply {
            isAntiAlias = true
            textSize = 16f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            color = Color.rgb(79, 55, 139)
        }
        val subtitlePaint = Paint().apply {
            isAntiAlias = true
            textSize = 9f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
            color = Color.rgb(100, 116, 139)
        }
        val headerSectionPaint = Paint().apply {
            isAntiAlias = true
            textSize = 10.5f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            color = Color.rgb(15, 23, 42)
        }
        val textPaint = Paint().apply {
            isAntiAlias = true
            textSize = 9f
            color = Color.rgb(30, 41, 59)
        }
        val boldTextPaint = Paint().apply {
            isAntiAlias = true
            textSize = 9f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            color = Color.rgb(15, 23, 42)
        }
        val linePaint = Paint().apply {
            color = Color.rgb(226, 232, 240)
            strokeWidth = 1f
        }
        val bgBoxPaint = Paint().apply {
            color = Color.rgb(248, 250, 252)
        }

        var y = 40f

        // 1. Header Box
        canvas.drawText("REKAPITULASI PAJAK PPH 21 TAHUNAN & SIMULASI 1721-A1", 40f, y, titlePaint)
        y += 16f
        canvas.drawText("Tahun Pajak $year | Sesuai UU HPP No. 7/2021, PP 58/2023, & PMK 168/2023", 40f, y, subtitlePaint)
        y += 12f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 16f

        // 2. Info Wajib Pajak
        canvas.drawRect(40f, y, 555f, y + 50f, bgBoxPaint)
        val infoY = y + 16f
        canvas.drawText("Nama: ${profile.fullName}", 50f, infoY, boldTextPaint)
        canvas.drawText("NIK: ${profile.nik}", 50f, infoY + 15f, textPaint)
        canvas.drawText("NPWP: ${if (profile.hasNpwp) profile.npwp else "Tanpa NPWP (+20%)"}", 300f, infoY, boldTextPaint)
        canvas.drawText("PTKP: ${profile.ptkpStatus} (${Formatters.formatRupiah(annualPtkp)})", 300f, infoY + 15f, textPaint)
        y += 65f

        // 3. Ringkasan Perhitungan Tahunan
        canvas.drawText("RINGKASAN PERHITUNGAN PPH 21 PASAL 17 TAHUNAN", 40f, y, headerSectionPaint)
        y += 12f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 15f

        fun drawTaxRow(label: String, valueStr: String, isBold: Boolean = false) {
            val p = if (isBold) boldTextPaint else textPaint
            canvas.drawText(label, 50f, y, p)
            val amtWidth = p.measureText(valueStr)
            canvas.drawText(valueStr, 545f - amtWidth, y, p)
            y += 14.5f
        }

        drawTaxRow("1. Total Penghasilan Bruto Setahun", Formatters.formatRupiah(annualGross))
        val jabatanAllowance = (annualGross * 0.05).coerceAtMost(6_000_000.0)
        drawTaxRow("2. Pengurang: Biaya Jabatan (5%, Maks 6 Juta/Thn)", "-${Formatters.formatRupiah(jabatanAllowance)}")
        val annualNet = (annualGross - jabatanAllowance).coerceAtLeast(0.0)
        drawTaxRow("3. Penghasilan Neto Setahun", Formatters.formatRupiah(annualNet), isBold = true)
        drawTaxRow("4. Penghasilan Tidak Kena Pajak (PTKP ${profile.ptkpStatus})", "-${Formatters.formatRupiah(annualPtkp)}")
        drawTaxRow("5. Penghasilan Kena Pajak (PKP)", Formatters.formatRupiah(annualPkp), isBold = true)
        drawTaxRow("6. PPh 21 Terutang Setahun (Tarif Progresif Pasal 17)", Formatters.formatRupiah(annualPph21Calculated), isBold = true)
        drawTaxRow("7. PPh 21 Telah Dipotong (Total TER Jan-Des)", Formatters.formatRupiah(totalPph21Paid))

        val diffTax = annualPph21Calculated - totalPph21Paid
        val statusText = if (diffTax > 0) "Kurang Bayar (Pasal 17 Des): ${Formatters.formatRupiah(diffTax)}" else "Lunas / Sesuai"
        drawTaxRow("8. Status Selisih Pajak Akhir Tahun", statusText, isBold = true)

        y += 10f

        // 4. Tabel Rincian Bulanan (Jan - Des)
        canvas.drawText("RINCIAN PEMOTONGAN BULANAN (PPH 21 TER)", 40f, y, headerSectionPaint)
        y += 12f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 14f

        canvas.drawText("Bulan", 50f, y, boldTextPaint)
        canvas.drawText("Bruto", 160f, y, boldTextPaint)
        canvas.drawText("Skema / TER", 300f, y, boldTextPaint)
        canvas.drawText("PPh 21", 490f, y, boldTextPaint)
        y += 12f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 13f

        payrolls.sortedBy { it.month }.forEach { p ->
            val monthLabel = p.periodLabel.split(" ").firstOrNull() ?: "Bln ${p.month}"
            canvas.drawText(monthLabel, 50f, y, textPaint)
            canvas.drawText(Formatters.formatRupiah(p.grossSalary), 160f, y, textPaint)
            val schemeStr = if (p.isDecemberRecalculation) "Pasal 17" else "${p.terCategory} (${Formatters.formatPercent(p.terEffectiveRate)})"
            canvas.drawText(schemeStr, 300f, y, textPaint)
            canvas.drawText(Formatters.formatRupiah(p.pph21Amount), 490f, y, textPaint)
            y += 13f
        }

        y += 15f
        // Watermark Footer
        val footerPaint = Paint().apply {
            textSize = 8f
            color = if (isProUser) Color.rgb(100, 116, 139) else Color.rgb(220, 38, 38)
            textAlign = Paint.Align.CENTER
        }
        val disclaimerText = if (isProUser) {
            "LAPORAN RESMI STANDALONE ESS (VERSI PRO) - Dibuat untuk arsip SPT Tahunan Karyawan"
        } else {
            "SIMULASI MANDIRI (VERSI GRATIS) - Upgrade ke Pro untuk Ekspor PDF Resmi Tanpa Watermark"
        }
        canvas.drawText(disclaimerText, 297.5f, 790f, footerPaint)

        val legalFooterPaint = Paint().apply {
            textSize = 7f
            color = Color.rgb(148, 163, 184)
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText("Simulasi mandiri untuk pelaporan SPT Tahunan Orang Pribadi (1770 S / 1770 SS).", 297.5f, 805f, legalFooterPaint)

        document.finishPage(page)

        try {
            val cachePath = File(context.cacheDir, "tax_reports")
            if (!cachePath.exists()) cachePath.mkdirs()
            val file = File(cachePath, "Laporan_Pajak_${year}_${profile.fullName.replace(" ", "_")}.pdf")
            val outputStream = FileOutputStream(file)
            document.writeTo(outputStream)
            outputStream.close()
            document.close()
            file
        } catch (e: Exception) {
            android.util.Log.e("PdfExporter", "Gagal membuat PDF laporan pajak", e)
            document.close()
            null
        }
    }

    /**
     * Generate & Share PDF Laporan Audit K3 (Kepatuhan Jam Kerja & PP 35/2021)
     */
    suspend fun exportK3AuditPdf(
        context: Context,
        profile: UserProfile,
        auditSummary: com.example.domain.calculator.K3AuditSummary,
        isProUser: Boolean
    ): File? = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        val document = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4 standard
        val page = document.startPage(pageInfo)
        val canvas: Canvas = page.canvas

        val titlePaint = Paint().apply {
            isAntiAlias = true
            textSize = 16f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            color = Color.rgb(124, 58, 237) // Brand Purple #7C3AED
        }
        val subtitlePaint = Paint().apply {
            isAntiAlias = true
            textSize = 9f
            color = Color.rgb(100, 116, 139)
        }
        val headerSectionPaint = Paint().apply {
            isAntiAlias = true
            textSize = 10.5f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            color = Color.rgb(15, 23, 42)
        }
        val textPaint = Paint().apply {
            isAntiAlias = true
            textSize = 8.5f
            color = Color.rgb(30, 41, 59)
        }
        val boldTextPaint = Paint().apply {
            isAntiAlias = true
            textSize = 8.5f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            color = Color.rgb(15, 23, 42)
        }
        val linePaint = Paint().apply {
            color = Color.rgb(226, 232, 240)
            strokeWidth = 1f
        }
        val bgBoxPaint = Paint().apply {
            color = Color.rgb(248, 250, 252)
        }
        val headerTableBg = Paint().apply {
            color = Color.rgb(241, 245, 249)
        }

        var y = 35f

        // 1. Header Bar
        canvas.drawText("LAPORAN AUDIT K3 & KEPATUHAN JAM KERJA", 40f, y, titlePaint)
        y += 15f
        canvas.drawText("Berdasarkan Regulasi PP No. 35 Tahun 2021 & Permenaker No. 27 Tahun 2021", 40f, y, subtitlePaint)
        y += 10f
        canvas.drawLine(40f, y, 555f, y, linePaint)
        y += 14f

        // 2. Info Karyawan
        canvas.drawRect(40f, y, 555f, y + 50f, bgBoxPaint)
        val infoY = y + 14f
        canvas.drawText("Nama: ${profile.fullName}", 50f, infoY, boldTextPaint)
        canvas.drawText("NIK: ${profile.nik}", 50f, infoY + 13f, textPaint)
        canvas.drawText("Jabatan: ${profile.jobTitle}", 50f, infoY + 26f, textPaint)

        val schemeStr = if (profile.workScheduleScheme == "5_DAYS") "5 Hari Kerja (8 jam/hari)" else "6 Hari Kerja (7 jam/hari)"
        canvas.drawText("Perusahaan: ${profile.companyName}", 300f, infoY, boldTextPaint)
        canvas.drawText("Periode Audit: ${auditSummary.periodLabel}", 300f, infoY + 13f, textPaint)
        canvas.drawText("Skema Kerja: $schemeStr", 300f, infoY + 26f, textPaint)
        y += 62f

        // 3. Ringkasan Status Kepatuhan K3
        canvas.drawText("1. RINGKASAN STATUS KEPATUHAN K3", 40f, y, headerSectionPaint)
        y += 14f

        val statusColor = when (auditSummary.overallComplianceStatus) {
            com.example.domain.calculator.K3ComplianceStatus.AMAN -> Color.rgb(16, 185, 129)
            com.example.domain.calculator.K3ComplianceStatus.WASPADA -> Color.rgb(245, 158, 11)
            com.example.domain.calculator.K3ComplianceStatus.PELANGGARAN -> Color.rgb(239, 68, 68)
        }

        val statusBoxBg = Paint().apply {
            color = when (auditSummary.overallComplianceStatus) {
                com.example.domain.calculator.K3ComplianceStatus.AMAN -> Color.rgb(236, 253, 245)
                com.example.domain.calculator.K3ComplianceStatus.WASPADA -> Color.rgb(254, 243, 199)
                com.example.domain.calculator.K3ComplianceStatus.PELANGGARAN -> Color.rgb(254, 242, 242)
            }
        }
        canvas.drawRect(40f, y, 555f, y + 42f, statusBoxBg)

        val statusBadgePaint = Paint().apply {
            isAntiAlias = true
            textSize = 11f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            color = statusColor
        }
        canvas.drawText("STATUS KEPATUHAN: ${auditSummary.overallComplianceStatus.label.uppercase()}", 50f, y + 16f, statusBadgePaint)
        canvas.drawText(
            "Total Lembur Bulan Ini: ${String.format(java.util.Locale.US, "%.1f", auditSummary.totalMonthOvertimeHours)} Jam | Pelanggaran Lembur Harian (>4 Jam): ${auditSummary.totalDailyViolations} Hari | Pelanggaran Mingguan (>18 Jam): ${auditSummary.totalWeeklyViolations} Pekan",
            50f, y + 32f, textPaint
        )
        y += 54f

        // 4. Tabel Audit Mingguan
        canvas.drawText("2. REKAPITULASI MINGGUAN (BATAS 18 JAM / PEKAN)", 40f, y, headerSectionPaint)
        y += 12f

        canvas.drawRect(40f, y, 555f, y + 18f, headerTableBg)
        canvas.drawText("Pekan", 46f, y + 12f, boldTextPaint)
        canvas.drawText("Rentang Tanggal", 90f, y + 12f, boldTextPaint)
        canvas.drawText("Jam Normal", 200f, y + 12f, boldTextPaint)
        canvas.drawText("Lembur (Max 18h)", 280f, y + 12f, boldTextPaint)
        canvas.drawText("Total Kerja", 380f, y + 12f, boldTextPaint)
        canvas.drawText("Status K3", 470f, y + 12f, boldTextPaint)
        y += 18f

        auditSummary.weeklyAudits.forEach { w ->
            val rowStatusColor = when (w.complianceStatus) {
                com.example.domain.calculator.K3ComplianceStatus.AMAN -> Color.rgb(5, 150, 105)
                com.example.domain.calculator.K3ComplianceStatus.WASPADA -> Color.rgb(217, 119, 6)
                com.example.domain.calculator.K3ComplianceStatus.PELANGGARAN -> Color.rgb(220, 38, 38)
            }
            val rowStatusPaint = Paint().apply {
                isAntiAlias = true
                textSize = 8.5f
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                color = rowStatusColor
            }

            canvas.drawText("Minggu ${w.weekNumber}", 46f, y + 12f, textPaint)
            canvas.drawText(w.dateRangeLabel, 90f, y + 12f, textPaint)
            canvas.drawText("${String.format(java.util.Locale.US, "%.1f", w.totalNormalHours)} Jam", 200f, y + 12f, textPaint)
            canvas.drawText("${String.format(java.util.Locale.US, "%.1f", w.totalOvertimeHours)} Jam", 280f, y + 12f, if (w.totalOvertimeHours > 18.0) rowStatusPaint else textPaint)
            canvas.drawText("${String.format(java.util.Locale.US, "%.1f", w.totalCombinedHours)} Jam", 380f, y + 12f, textPaint)
            canvas.drawText(w.complianceStatus.label, 470f, y + 12f, rowStatusPaint)

            y += 15f
            canvas.drawLine(40f, y, 555f, y, linePaint)
        }
        y += 15f

        // 5. Rekomendasi K3 Otomatis (Rule-Based)
        canvas.drawText("3. REKOMENDASI K3 & KESELAMATAN KERJA (PP 35/2021)", 40f, y, headerSectionPaint)
        y += 14f

        auditSummary.recommendations.take(4).forEach { rec ->
            val recColor = when (rec.severity) {
                com.example.domain.calculator.K3ComplianceStatus.AMAN -> Color.rgb(5, 150, 105)
                com.example.domain.calculator.K3ComplianceStatus.WASPADA -> Color.rgb(217, 119, 6)
                com.example.domain.calculator.K3ComplianceStatus.PELANGGARAN -> Color.rgb(220, 38, 38)
            }
            val recTitlePaint = Paint().apply {
                isAntiAlias = true
                textSize = 9f
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                color = recColor
            }
            canvas.drawText("• ${rec.title} (${rec.legalRef})", 46f, y, recTitlePaint)
            y += 11f
            // Wrap text message sederhana
            val msg = if (rec.message.length > 110) rec.message.take(107) + "..." else rec.message
            canvas.drawText("  $msg", 46f, y, textPaint)
            y += 14f
        }

        // Watermark Footer
        val footerPaint = Paint().apply {
            textSize = 8f
            color = if (isProUser) Color.rgb(100, 116, 139) else Color.rgb(220, 38, 38)
            textAlign = Paint.Align.CENTER
        }
        val disclaimerText = if (isProUser) {
            "LAPORAN AUDIT K3 STANDALONE ESS (VERSI PRO) - Dokumen Resmi Evaluasi Beban & Waktu Kerja Karyawan"
        } else {
            "SIMULASI AUDIT K3 MANDIRI (VERSI GRATIS) - Berdasarkan PP No. 35 Tahun 2021 & Permenaker No. 27/2021"
        }
        canvas.drawText(disclaimerText, 297.5f, 790f, footerPaint)

        val legalFooterPaint = Paint().apply {
            textSize = 7f
            color = Color.rgb(148, 163, 184)
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText("Laporan ini dihitung secara lokal di perangkat tanpa sinkronisasi server eksternal.", 297.5f, 805f, legalFooterPaint)

        document.finishPage(page)

        try {
            val cachePath = File(context.cacheDir, "k3_reports")
            if (!cachePath.exists()) cachePath.mkdirs()
            val file = File(cachePath, "Audit_K3_${auditSummary.periodYear}_${auditSummary.periodMonth}_${profile.fullName.replace(" ", "_")}.pdf")
            val outputStream = FileOutputStream(file)
            document.writeTo(outputStream)
            outputStream.close()
            document.close()
            file
        } catch (e: Exception) {
            android.util.Log.e("PdfExporter", "Gagal membuat PDF audit K3", e)
            document.close()
            null
        }
    }

    /**
     * Share PDF File via Android Intent Action Send
     */
    fun sharePdfFile(context: Context, file: File) {
        try {
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "Slip Gaji - " + file.name)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(intent, "Bagikan Slip Gaji PDF"))
        } catch (e: Exception) {
            android.util.Log.e("PdfExporter", "Gagal membagikan PDF", e)
        }
    }
}
