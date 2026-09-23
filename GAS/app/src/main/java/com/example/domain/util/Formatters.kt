package com.example.domain.util

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object Formatters {
    private val idLocale = Locale("id")

    fun formatRupiah(amount: Double): String {
        val symbols = DecimalFormatSymbols(idLocale).apply {
            currencySymbol = "Rp "
            groupingSeparator = '.'
            decimalSeparator = ','
        }
        val formatter = DecimalFormat("Rp #,##0", symbols)
        return formatter.format(amount)
    }

    fun formatRupiahDecimals(amount: Double): String {
        val symbols = DecimalFormatSymbols(idLocale).apply {
            currencySymbol = "Rp "
            groupingSeparator = '.'
            decimalSeparator = ','
        }
        val formatter = DecimalFormat("Rp #,##0.00", symbols)
        return formatter.format(amount)
    }

    fun formatPercent(rate: Double): String {
        val percent = rate * 100.0
        return String.format(Locale.US, "%.2f%%", percent)
    }

    fun formatDateIndo(dateStr: String): String {
        return try {
            val parser = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val date = parser.parse(dateStr)
            val formatter = SimpleDateFormat("dd MMMM yyyy", idLocale)
            if (date != null) formatter.format(date) else dateStr
        } catch (e: Exception) {
            dateStr
        }
    }

    fun getCurrentDateStr(): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        return formatter.format(Date())
    }

    fun getCurrentMonth(): Int {
        val cal = java.util.Calendar.getInstance()
        return cal.get(java.util.Calendar.MONTH) + 1
    }

    fun getCurrentYear(): Int {
        val cal = java.util.Calendar.getInstance()
        return cal.get(java.util.Calendar.YEAR)
    }

    fun getMonthName(month: Int): String {
        val months = arrayOf(
            "Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        )
        return if (month in 1..12) months[month - 1] else "Bulan $month"
    }

    /**
     * Terjemahan awam untuk kode Status PTKP (Penghasilan Tidak Kena Pajak).
     * Contoh: "TK/1" -> "Tidak Kawin, 1 tanggungan".
     */
    fun ptkpPlainDescription(code: String): String {
        val parts = code.split("/")
        if (parts.size != 2) return code
        val maritalPart = when (parts[0]) {
            "TK" -> "Tidak Kawin"
            "K" -> "Kawin"
            else -> parts[0]
        }
        val dependents = parts[1].toIntOrNull() ?: 0
        val dependentPart = if (dependents == 0) "tanpa tanggungan" else "$dependents tanggungan"
        return "$maritalPart, $dependentPart"
    }

    fun formatDateWithDayIndo(dateStr: String): String {
        return try {
            val parser = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val date = parser.parse(dateStr)
            val formatter = SimpleDateFormat("EEEE, dd MMMM yyyy", idLocale)
            if (date != null) formatter.format(date) else dateStr
        } catch (e: Exception) {
            dateStr
        }
    }
}
