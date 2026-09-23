package com.example.domain.calculator

import com.example.domain.util.Formatters
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

/**
 * Modul Kalkulasi Utama Regulasi Ketenagakerjaan & Perpajakan Indonesia
 * Mengacu pada dasar hukum resmi:
 * 1. UU No. 13/2003, UU No. 6/2023 (UU Cipta Kerja)
 * 2. PP No. 35/2021 (PKWT, Alih Daya, Waktu Kerja, & PHK)
 * 3. PP No. 51/2023 & PP No. 36/2021 (Pengupahan & UMP/UMK)
 * 4. UU HPP No. 7/2021, PP No. 58/2023, & PMK No. 168/2023 (Pajak PPh 21 TER & Pasal 17)
 * 5. Perpres No. 64/2020, PP No. 44/2015, & PP No. 45/2015 (BPJS Kesehatan & Ketenagakerjaan)
 * 6. PP No. 6/2025 & PP No. 37/2021 (Jaminan Kehilangan Pekerjaan / JKP)
 * 7. Permenaker No. 6/2016 (THR Keagamaan)
 * 8. UU KIA No. 4/2024 (Hak Cuti Melahirkan & Pendampingan)
 */
object IndonesianPayrollCalculators {

    // =========================================================================
    // 0. TUNJANGAN KEHADIRAN (UANG MAKAN & TRANSPORT)
    // Sesuai UU No. 13/2003 & PP No. 36/2021 (Tunjangan Tidak Tetap berbasis presensi kerja)
    // =========================================================================

    data class AttendanceAllowanceResult(
        val attendanceDays: Int,
        val mealRatePerDay: Double,
        val transportRatePerDay: Double,
        val totalMealAllowance: Double,
        val totalTransportAllowance: Double,
        val totalAttendanceAllowance: Double
    ) {
        val grandTotal: Double get() = totalAttendanceAllowance
    }

    /**
     * Menghitung Tunjangan Kehadiran (Uang Makan & Uang Transport) berdasarkan jumlah hari hadir / kerja.
     */
    fun calculateAttendanceAllowances(
        attendanceDays: Int,
        mealRatePerDay: Double = 0.0,
        transportRatePerDay: Double = 0.0,
        isMealEnabled: Boolean = true,
        isTransportEnabled: Boolean = true
    ): AttendanceAllowanceResult {
        val safeDays = max(0, attendanceDays)
        val safeMealRate = if (isMealEnabled) max(0.0, mealRatePerDay) else 0.0
        val safeTransportRate = if (isTransportEnabled) max(0.0, transportRatePerDay) else 0.0
        val mealTotal = safeDays * safeMealRate
        val transportTotal = safeDays * safeTransportRate
        return AttendanceAllowanceResult(
            attendanceDays = safeDays,
            mealRatePerDay = safeMealRate,
            transportRatePerDay = safeTransportRate,
            totalMealAllowance = mealTotal,
            totalTransportAllowance = transportTotal,
            totalAttendanceAllowance = mealTotal + transportTotal
        )
    }

    /**
     * Menghitung jam kerja efektif dari jam masuk dan jam pulang (format HH:mm).
     * Mengacu pada PP No. 35/2021: Jika waktu kerja >= 6 jam, otomatis dikurangi
     * 1 jam waktu istirahat resmi yang tidak dihitung sebagai jam kerja efektif.
     */
    fun calculateEffectiveHours(checkIn: String, checkOut: String): Double {
        return try {
            if (checkIn.isBlank() || checkOut.isBlank()) return 0.0
            val inParts = checkIn.trim().split(":")
            val outParts = checkOut.trim().split(":")
            if (inParts.size != 2 || outParts.size != 2) return 0.0
            val inMinutes = inParts[0].toInt() * 60 + inParts[1].toInt()
            val outMinutes = outParts[0].toInt() * 60 + outParts[1].toInt()
            var diffMinutes = outMinutes - inMinutes
            if (diffMinutes < 0) diffMinutes += 24 * 60 // melewati tengah malam
            val rawHours = diffMinutes / 60.0
            val effective = if (rawHours >= 6.0) max(0.0, rawHours - 1.0) else rawHours
            Math.round(effective * 10.0) / 10.0
        } catch (e: Exception) {
            0.0
        }
    }

    // =========================================================================
    // 1. LOGIKA LEMBUR (OVERTIME)
    // Dasar Hukum: Kepmenaker No. 102/MEN/VI/2004 & PP No. 35 Tahun 2021
    // =========================================================================

    /**
     * Menghitung Upah Sejam Lembur = 1/173 × Upah Tetap Sebulan (PP 35/2021 Pasal 32)
     */
    fun calculateHourlyRate(totalFixedSalary: Double): Double {
        return if (totalFixedSalary > 0) totalFixedSalary / 173.0 else 0.0
    }

    data class OvertimeCalculationResult(
        val totalHours: Double,
        val hourlyRate: Double,
        val multiplierHours: Double,
        val totalAmount: Double,
        val isExceedingDailyLimit: Boolean, // Peringatan > 4 jam/hari (PP 35/2021 Pasal 26)
        val warningMessage: String?
    )

    /**
     * Hitung total uang lembur berdasarkan jenis hari dan jam kerja.
     */
    fun calculateOvertime(
        hours: Double,
        totalFixedSalary: Double,
        dayType: String // "WORKDAY", "HOLIDAY_6_DAYS", "HOLIDAY_5_DAYS"
    ): OvertimeCalculationResult {
        val hourlyRate = calculateHourlyRate(totalFixedSalary)
        if (hours <= 0 || hourlyRate <= 0) {
            return OvertimeCalculationResult(0.0, hourlyRate, 0.0, 0.0, false, null)
        }

        var multiplierHours = 0.0
        when (dayType) {
            "WORKDAY" -> {
                // Hari Kerja Biasa: Jam ke-1 = 1.5x, Jam ke-2 dst = 2.0x (PP 35/2021 Pasal 31)
                multiplierHours = if (hours <= 1.0) {
                    hours * 1.5
                } else {
                    1.5 + ((hours - 1.0) * 2.0)
                }
            }
            "HOLIDAY_6_DAYS" -> {
                // Libur Resmi 6 Hari Kerja/1 Hari Libur:
                // 7 jam pertama = 2x, Jam ke-8 = 3x, Jam ke-9 & 10 = 4x
                var remaining = hours
                val tier1 = min(remaining, 7.0)
                multiplierHours += tier1 * 2.0
                remaining -= tier1

                if (remaining > 0) {
                    val tier2 = min(remaining, 1.0)
                    multiplierHours += tier2 * 3.0
                    remaining -= tier2
                }

                if (remaining > 0) {
                    multiplierHours += remaining * 4.0
                }
            }
            "HOLIDAY_5_DAYS" -> {
                // Libur Resmi 5 Hari Kerja/2 Hari Libur:
                // 8 jam pertama = 2x, Jam ke-9 = 3x, Jam ke-10 & 11 dst = 4x
                var remaining = hours
                val tier1 = min(remaining, 8.0)
                multiplierHours += tier1 * 2.0
                remaining -= tier1

                if (remaining > 0) {
                    val tier2 = min(remaining, 1.0)
                    multiplierHours += tier2 * 3.0
                    remaining -= tier2
                }

                if (remaining > 0) {
                    multiplierHours += remaining * 4.0
                }
            }
            else -> {
                multiplierHours = hours * 1.5
            }
        }

        val totalAmount = multiplierHours * hourlyRate
        val isExceeding = hours > 4.0
        val warningMessage = if (isExceeding) {
            "Peringatan: Lembur ${hours} jam melebihi batas regulasi 4 jam/hari (PP 35/2021 Pasal 26)."
        } else null

        return OvertimeCalculationResult(
            totalHours = hours,
            hourlyRate = hourlyRate,
            multiplierHours = multiplierHours,
            totalAmount = totalAmount,
            isExceedingDailyLimit = isExceeding,
            warningMessage = warningMessage
        )
    }

    // =========================================================================
    // 2. LOGIKA BPJS KESEHATAN & BPJS KETENAGAKERJAAN
    // Dasar Hukum: Perpres No. 64/2020, PP No. 44/2015, PP No. 45/2015
    // =========================================================================

    data class BpjsBreakdown(
        val bpjsKesEmployee: Double, // 1%
        val bpjsKesCompany: Double, // 4%
        val bpjsJhtEmployee: Double, // 2%
        val bpjsJhtCompany: Double, // 3.7%
        val bpjsJpEmployee: Double, // 1%
        val bpjsJpCompany: Double, // 2%
        val bpjsJkkCompany: Double, // e.g. 0.24%
        val bpjsJkmCompany: Double, // 0.30%
        val totalEmployeeDeduction: Double,
        val totalCompanyContribution: Double
    )

    fun calculateBpjs(
        fixedSalary: Double,
        bpjsKesCap: Double = 12_000_000.0,
        bpjsJpCap: Double = 10_042_300.0,
        jkkRatePercent: Double = 0.24,
        jkmRatePercent: Double = 0.30,
        enableKes: Boolean = true,
        enableJht: Boolean = true,
        enableJp: Boolean = true
    ): BpjsBreakdown {
        // Dasar perhitungan BPJS Kesehatan (Cap Rp 12.000.000 sesuai Perpres 64/2020)
        val wageBasisKes = min(fixedSalary, bpjsKesCap)
        val bpjsKesEmp = if (enableKes) wageBasisKes * 0.01 else 0.0
        val bpjsKesComp = if (enableKes) wageBasisKes * 0.04 else 0.0

        // Dasar perhitungan JHT (Tidak ada batas atas upah sesuai PP 44/2015)
        val bpjsJhtEmp = if (enableJht) fixedSalary * 0.02 else 0.0
        val bpjsJhtComp = if (enableJht) fixedSalary * 0.037 else 0.0

        // Dasar perhitungan Jaminan Pensiun (Cap upah dinamis sesuai PP 45/2015)
        val wageBasisJp = min(fixedSalary, bpjsJpCap)
        val bpjsJpEmp = if (enableJp) wageBasisJp * 0.01 else 0.0
        val bpjsJpComp = if (enableJp) wageBasisJp * 0.02 else 0.0

        // JKK & JKM ditanggung perusahaan
        val bpjsJkkComp = fixedSalary * (jkkRatePercent / 100.0)
        val bpjsJkmComp = fixedSalary * (jkmRatePercent / 100.0)

        val totalEmp = bpjsKesEmp + bpjsJhtEmp + bpjsJpEmp
        val totalComp = bpjsKesComp + bpjsJhtComp + bpjsJpComp + bpjsJkkComp + bpjsJkmComp

        return BpjsBreakdown(
            bpjsKesEmployee = bpjsKesEmp,
            bpjsKesCompany = bpjsKesComp,
            bpjsJhtEmployee = bpjsJhtEmp,
            bpjsJhtCompany = bpjsJhtComp,
            bpjsJpEmployee = bpjsJpEmp,
            bpjsJpCompany = bpjsJpComp,
            bpjsJkkCompany = bpjsJkkComp,
            bpjsJkmCompany = bpjsJkmComp,
            totalEmployeeDeduction = totalEmp,
            totalCompanyContribution = totalComp
        )
    }

    // =========================================================================
    // 3. PAJAK PPH 21 (UU HPP NO. 7/2021, PP NO. 58/2023, PMK NO. 168/2023)
    // =========================================================================

    /**
     * Penentuan Kategori TER berdasarkan Status PTKP:
     * TER A: TK/0 (54M), TK/1 (58.5M), K/0 (58.5M)
     * TER B: TK/2 (63M), TK/3 (67.5M), K/1 (63M), K/2 (67.5M)
     * TER C: K/3 (72M)
     */
    fun determineTerCategory(ptkpStatus: String): String {
        return when (ptkpStatus.trim().uppercase()) {
            "TK/0", "TK/1", "K/0" -> "A"
            "TK/2", "TK/3", "K/1", "K/2" -> "B"
            "K/3" -> "C"
            else -> "A"
        }
    }

    fun getAnnualPtkpAmount(ptkpStatus: String): Double {
        return when (ptkpStatus.trim().uppercase()) {
            "TK/0" -> 54_000_000.0
            "TK/1" -> 58_500_000.0
            "TK/2" -> 63_000_000.0
            "TK/3" -> 67_500_000.0
            "K/0" -> 58_500_000.0
            "K/1" -> 63_000_000.0
            "K/2" -> 67_500_000.0
            "K/3" -> 72_000_000.0
            else -> 54_000_000.0
        }
    }

    private data class TerRateBracket(val minGross: Double, val maxGross: Double, val rate: Double)

    // Tabel TER Kategori A (PP 58/2023 & PMK 168/2023)
    private val terATable = listOf(
        TerRateBracket(0.0, 5_400_000.0, 0.0),
        TerRateBracket(5_400_000.0, 5_650_000.0, 0.0025),
        TerRateBracket(5_650_000.0, 5_950_000.0, 0.005),
        TerRateBracket(5_950_000.0, 6_300_000.0, 0.0075),
        TerRateBracket(6_300_000.0, 6_750_000.0, 0.01),
        TerRateBracket(6_750_000.0, 7_500_000.0, 0.0125),
        TerRateBracket(7_500_000.0, 8_550_000.0, 0.015),
        TerRateBracket(8_550_000.0, 9_650_000.0, 0.0175),
        TerRateBracket(9_650_000.0, 10_050_000.0, 0.02),
        TerRateBracket(10_050_000.0, 10_350_000.0, 0.0225),
        TerRateBracket(10_350_000.0, 10_700_000.0, 0.025),
        TerRateBracket(10_700_000.0, 11_050_000.0, 0.03),
        TerRateBracket(11_050_000.0, 11_600_000.0, 0.035),
        TerRateBracket(11_600_000.0, 12_500_000.0, 0.04),
        TerRateBracket(12_500_000.0, 13_750_000.0, 0.05),
        TerRateBracket(13_750_000.0, 15_100_000.0, 0.06),
        TerRateBracket(15_100_000.0, 16_950_000.0, 0.07),
        TerRateBracket(16_950_000.0, 19_750_000.0, 0.08),
        TerRateBracket(19_750_000.0, 24_100_000.0, 0.09),
        TerRateBracket(24_100_000.0, 26_450_000.0, 0.10),
        TerRateBracket(26_450_000.0, 28_000_000.0, 0.11),
        TerRateBracket(28_000_000.0, 30_050_000.0, 0.12),
        TerRateBracket(30_050_000.0, 32_400_000.0, 0.13),
        TerRateBracket(32_400_000.0, 35_400_000.0, 0.14),
        TerRateBracket(35_400_000.0, 39_100_000.0, 0.15),
        TerRateBracket(39_100_000.0, 43_850_000.0, 0.16),
        TerRateBracket(43_850_000.0, 47_800_000.0, 0.17),
        TerRateBracket(47_800_000.0, 51_400_000.0, 0.18),
        TerRateBracket(51_400_000.0, 56_300_000.0, 0.19),
        TerRateBracket(56_300_000.0, 62_200_000.0, 0.20),
        TerRateBracket(62_200_000.0, 68_600_000.0, 0.21),
        TerRateBracket(68_600_000.0, 77_500_000.0, 0.22),
        TerRateBracket(77_500_000.0, 89_000_000.0, 0.23),
        TerRateBracket(89_000_000.0, 103_000_000.0, 0.24),
        TerRateBracket(103_000_000.0, 125_000_000.0, 0.25),
        TerRateBracket(125_000_000.0, 157_000_000.0, 0.26),
        TerRateBracket(157_000_000.0, 206_000_000.0, 0.27),
        TerRateBracket(206_000_000.0, 337_000_000.0, 0.28),
        TerRateBracket(337_000_000.0, 454_000_000.0, 0.29),
        TerRateBracket(454_000_000.0, 550_000_000.0, 0.30),
        TerRateBracket(550_000_000.0, 695_000_000.0, 0.31),
        TerRateBracket(695_000_000.0, 910_000_000.0, 0.32),
        TerRateBracket(910_000_000.0, 1_400_000_000.0, 0.33),
        TerRateBracket(1_400_000_000.0, Double.MAX_VALUE, 0.34)
    )

    // Tabel TER Kategori B (PP 58/2023 & PMK 168/2023)
    private val terBTable = listOf(
        TerRateBracket(0.0, 6_200_000.0, 0.0),
        TerRateBracket(6_200_000.0, 6_500_000.0, 0.0025),
        TerRateBracket(6_500_000.0, 6_850_000.0, 0.005),
        TerRateBracket(6_850_000.0, 7_300_000.0, 0.0075),
        TerRateBracket(7_300_000.0, 9_200_000.0, 0.01),
        TerRateBracket(9_200_000.0, 10_750_000.0, 0.015),
        TerRateBracket(10_750_000.0, 11_250_000.0, 0.02),
        TerRateBracket(11_250_000.0, 11_600_000.0, 0.025),
        TerRateBracket(11_600_000.0, 12_600_000.0, 0.03),
        TerRateBracket(12_600_000.0, 13_600_000.0, 0.04),
        TerRateBracket(13_600_000.0, 14_950_000.0, 0.05),
        TerRateBracket(14_950_000.0, 16_400_000.0, 0.06),
        TerRateBracket(16_400_000.0, 18_450_000.0, 0.07),
        TerRateBracket(18_450_000.0, 21_850_000.0, 0.08),
        TerRateBracket(21_850_000.0, 26_000_000.0, 0.09),
        TerRateBracket(26_000_000.0, 27_700_000.0, 0.10),
        TerRateBracket(27_700_000.0, 29_350_000.0, 0.11),
        TerRateBracket(29_350_000.0, 31_450_000.0, 0.12),
        TerRateBracket(31_450_000.0, 33_950_000.0, 0.13),
        TerRateBracket(33_950_000.0, 37_100_000.0, 0.14),
        TerRateBracket(37_100_000.0, 41_100_000.0, 0.15),
        TerRateBracket(41_100_000.0, 45_800_000.0, 0.16),
        TerRateBracket(45_800_000.0, 49_500_000.0, 0.17),
        TerRateBracket(49_500_000.0, 53_800_000.0, 0.18),
        TerRateBracket(53_800_000.0, 58_500_000.0, 0.19),
        TerRateBracket(58_500_000.0, 64_000_000.0, 0.20),
        TerRateBracket(64_000_000.0, 71_000_000.0, 0.21),
        TerRateBracket(71_000_000.0, 80_000_000.0, 0.22),
        TerRateBracket(80_000_000.0, 93_000_000.0, 0.23),
        TerRateBracket(93_000_000.0, 109_000_000.0, 0.24),
        TerRateBracket(109_000_000.0, 129_000_000.0, 0.25),
        TerRateBracket(129_000_000.0, 163_000_000.0, 0.26),
        TerRateBracket(163_000_000.0, 211_000_000.0, 0.27),
        TerRateBracket(211_000_000.0, 374_000_000.0, 0.28),
        TerRateBracket(374_000_000.0, 459_000_000.0, 0.29),
        TerRateBracket(459_000_000.0, 555_000_000.0, 0.30),
        TerRateBracket(555_000_000.0, 704_000_000.0, 0.31),
        TerRateBracket(704_000_000.0, 957_000_000.0, 0.32),
        TerRateBracket(957_000_000.0, 1_405_000_000.0, 0.33),
        TerRateBracket(1_405_000_000.0, Double.MAX_VALUE, 0.34)
    )

    // Tabel TER Kategori C (PP 58/2023 & PMK 168/2023)
    private val terCTable = listOf(
        TerRateBracket(0.0, 6_600_000.0, 0.0),
        TerRateBracket(6_600_000.0, 6_950_000.0, 0.0025),
        TerRateBracket(6_950_000.0, 7_350_000.0, 0.005),
        TerRateBracket(7_350_000.0, 7_800_000.0, 0.0075),
        TerRateBracket(7_800_000.0, 8_850_000.0, 0.01),
        TerRateBracket(8_850_000.0, 9_800_000.0, 0.0125),
        TerRateBracket(9_800_000.0, 10_950_000.0, 0.015),
        TerRateBracket(10_950_000.0, 11_200_000.0, 0.0175),
        TerRateBracket(11_200_000.0, 12_050_000.0, 0.02),
        TerRateBracket(12_050_000.0, 12_950_000.0, 0.03),
        TerRateBracket(12_950_000.0, 14_150_000.0, 0.04),
        TerRateBracket(14_150_000.0, 15_550_000.0, 0.05),
        TerRateBracket(15_550_000.0, 17_050_000.0, 0.06),
        TerRateBracket(17_050_000.0, 19_500_000.0, 0.07),
        TerRateBracket(19_500_000.0, 22_700_000.0, 0.08),
        TerRateBracket(22_700_000.0, 24_700_000.0, 0.09),
        TerRateBracket(24_700_000.0, 27_950_000.0, 0.10),
        TerRateBracket(27_950_000.0, 30_450_000.0, 0.11),
        TerRateBracket(30_450_000.0, 32_650_000.0, 0.12),
        TerRateBracket(32_650_000.0, 35_450_000.0, 0.13),
        TerRateBracket(35_450_000.0, 38_900_000.0, 0.14),
        TerRateBracket(38_900_000.0, 43_000_000.0, 0.15),
        TerRateBracket(43_000_000.0, 47_400_000.0, 0.16),
        TerRateBracket(47_400_000.0, 51_200_000.0, 0.17),
        TerRateBracket(51_200_000.0, 55_800_000.0, 0.18),
        TerRateBracket(55_800_000.0, 60_400_000.0, 0.19),
        TerRateBracket(60_400_000.0, 66_700_000.0, 0.20),
        TerRateBracket(66_700_000.0, 74_500_000.0, 0.21),
        TerRateBracket(74_500_000.0, 83_200_000.0, 0.22),
        TerRateBracket(83_200_000.0, 95_600_000.0, 0.23),
        TerRateBracket(95_600_000.0, 110_000_000.0, 0.24),
        TerRateBracket(110_000_000.0, 134_000_000.0, 0.25),
        TerRateBracket(134_000_000.0, 169_000_000.0, 0.26),
        TerRateBracket(169_000_000.0, 221_000_000.0, 0.27),
        TerRateBracket(221_000_000.0, 390_000_000.0, 0.28),
        TerRateBracket(390_000_000.0, 463_000_000.0, 0.29),
        TerRateBracket(463_000_000.0, 561_000_000.0, 0.30),
        TerRateBracket(561_000_000.0, 709_000_000.0, 0.31),
        TerRateBracket(709_000_000.0, 965_000_000.0, 0.32),
        TerRateBracket(965_000_000.0, 1_419_000_000.0, 0.33),
        TerRateBracket(1_419_000_000.0, Double.MAX_VALUE, 0.34)
    )

    /**
     * Hitung Tarif Efektif Rata-Rata (TER) Bulanan (Masa Pajak Jan - Nov)
     */
    fun calculateMonthlyTerPph21(
        grossSalary: Double,
        terCategory: String,
        hasNpwp: Boolean = true
    ): Pair<Double, Double> {
        if (grossSalary <= 0) return Pair(0.0, 0.0)

        val table = when (terCategory.uppercase()) {
            "B" -> terBTable
            "C" -> terCTable
            else -> terATable
        }

        var baseRate = 0.0
        for (bracket in table) {
            if (grossSalary > bracket.minGross && grossSalary <= bracket.maxGross) {
                baseRate = bracket.rate
                break
            }
        }

        var pph = grossSalary * baseRate
        // Sanksi Ketiadaan NPWP (+20% atau tarif 120%)
        if (!hasNpwp && baseRate > 0) {
            pph *= 1.20
        }

        return Pair(baseRate, pph)
    }

    /**
     * Perhitungan Ulang Masa Pajak Desember (Annual Recalculation)
     * Menggunakan Tarif Progresif Pasal 17 UU HPP No. 7/2021
     */
    data class DecemberPph21Result(
        val annualGrossSalary: Double,
        val annualBiayaJabatan: Double, // 5% max 500rb/bln atau 6jt/thn
        val annualEmployeePensionDeduction: Double, // JHT + JP Karyawan setahun
        val annualNetIncome: Double,
        val annualPtkp: Double,
        val annualPkp: Double, // Pembulatan ke bawah dalam ribuan penuh
        val annualPph21Total: Double,
        val pph21PaidJanNov: Double,
        val pph21DecemberDue: Double
    )

    fun calculateDecemberPph21(
        annualGrossSalary: Double,
        ptkpStatus: String,
        annualEmployeePensionDeduction: Double,
        pph21PaidJanNov: Double,
        hasNpwp: Boolean = true
    ): DecemberPph21Result {
        val biayaJabatan = min(annualGrossSalary * 0.05, 6_000_000.0)
        val netIncome = max(0.0, annualGrossSalary - biayaJabatan - annualEmployeePensionDeduction)
        val ptkp = getAnnualPtkpAmount(ptkpStatus)
        val rawPkp = max(0.0, netIncome - ptkp)
        // Pembulatan PKP ke bawah ribuan rupiah
        val pkp = floor(rawPkp / 1000.0) * 1000.0

        // Lapisan Tarif Pasal 17 UU HPP
        var remainingPkp = pkp
        var annualPph = 0.0

        // Lapis 1: 0 s.d. 60.000.000 (5%)
        val lapis1 = min(remainingPkp, 60_000_000.0)
        annualPph += lapis1 * 0.05
        remainingPkp -= lapis1

        // Lapis 2: > 60.000.000 s.d. 250.000.000 (15%)
        if (remainingPkp > 0) {
            val lapis2 = min(remainingPkp, 190_000_000.0)
            annualPph += lapis2 * 0.15
            remainingPkp -= lapis2
        }

        // Lapis 3: > 250.000.000 s.d. 500.000.000 (25%)
        if (remainingPkp > 0) {
            val lapis3 = min(remainingPkp, 250_000_000.0)
            annualPph += lapis3 * 0.25
            remainingPkp -= lapis3
        }

        // Lapis 4: > 500.000.000 s.d. 5.000.000.000 (30%)
        if (remainingPkp > 0) {
            val lapis4 = min(remainingPkp, 4_500_000_000.0)
            annualPph += lapis4 * 0.30
            remainingPkp -= lapis4
        }

        // Lapis 5: > 5.000.000.000 (35%)
        if (remainingPkp > 0) {
            annualPph += remainingPkp * 0.35
        }

        if (!hasNpwp && annualPph > 0) {
            annualPph *= 1.20
        }

        val pphDec = max(0.0, annualPph - pph21PaidJanNov)

        return DecemberPph21Result(
            annualGrossSalary = annualGrossSalary,
            annualBiayaJabatan = biayaJabatan,
            annualEmployeePensionDeduction = annualEmployeePensionDeduction,
            annualNetIncome = netIncome,
            annualPtkp = ptkp,
            annualPkp = pkp,
            annualPph21Total = annualPph,
            pph21PaidJanNov = pph21PaidJanNov,
            pph21DecemberDue = pphDec
        )
    }

    fun calculateProgressivePph21(pkp: Double, hasNpwp: Boolean = true): Double {
        if (pkp <= 0.0) return 0.0
        val roundedPkp = floor(pkp / 1000.0) * 1000.0
        var remainingPkp = roundedPkp
        var annualPph = 0.0

        // Lapis 1: 0 s.d. 60.000.000 (5%)
        val lapis1 = min(remainingPkp, 60_000_000.0)
        annualPph += lapis1 * 0.05
        remainingPkp -= lapis1

        // Lapis 2: > 60.000.000 s.d. 250.000.000 (15%)
        if (remainingPkp > 0) {
            val lapis2 = min(remainingPkp, 190_000_000.0)
            annualPph += lapis2 * 0.15
            remainingPkp -= lapis2
        }

        // Lapis 3: > 250.000.000 s.d. 500.000.000 (25%)
        if (remainingPkp > 0) {
            val lapis3 = min(remainingPkp, 250_000_000.0)
            annualPph += lapis3 * 0.25
            remainingPkp -= lapis3
        }

        // Lapis 4: > 500.000.000 s.d. 5.000.000.000 (30%)
        if (remainingPkp > 0) {
            val lapis4 = min(remainingPkp, 4_500_000_000.0)
            annualPph += lapis4 * 0.30
            remainingPkp -= lapis4
        }

        // Lapis 5: > 5.000.000.000 (35%)
        if (remainingPkp > 0) {
            annualPph += remainingPkp * 0.35
        }

        if (!hasNpwp && annualPph > 0) {
            annualPph *= 1.20
        }

        return annualPph
    }

    // =========================================================================
    // 4. LOGIKA THR KEAGAMAAN (PERMENAKER NO. 6/2016 & PP NO. 36/2021)
    // =========================================================================

    fun calculateThr(
        totalFixedSalary: Double,
        tenureMonths: Int
    ): Double {
        if (tenureMonths < 1) return 0.0
        return if (tenureMonths >= 12) {
            totalFixedSalary // 1 bulan upah penuh
        } else {
            (tenureMonths.toDouble() / 12.0) * totalFixedSalary // Proporsional
        }
    }

    // =========================================================================
    // 5. KOMPENSASI PKWT (PP NO. 35/2021 PASAL 15, 16 & 17)
    // =========================================================================

    enum class PkwtScenario(val label: String, val description: String) {
        SELESAI_KONTRAK(
            "Kontrak Selesai Penuh",
            "Pasal 15-16 PP 35/2021: Diberikan saat masa berlaku kontrak PKWT berakhir."
        ),
        DIPUTUS_SEBELUM_WAKTU(
            "Diputus Sebelum Waktu Berakhir",
            "Pasal 17 PP 35/2021: Hak kompensasi masa kerja dijalani + Ganti rugi sisa masa kontrak."
        ),
        PERPANJANGAN_KONTRAK(
            "Kontrak Diperpanjang (PKWT I + PKWT II)",
            "Pasal 15 ayat (4) PP 35/2021: Dihitung terpisah saat kontrak awal dan perpanjangan selesai."
        )
    }

    data class PkwtCompensationDetail(
        val totalFixedSalary: Double,
        val workedMonths: Double,
        val scenario: PkwtScenario,
        val compensationAmount: Double,
        val remainingMonths: Double = 0.0,
        val remainingSalaryIndemnity: Double = 0.0,
        val extendedMonths: Double = 0.0,
        val extensionCompensationAmount: Double = 0.0,
        val grandTotal: Double,
        val terCategory: String = "A",
        val terEffectiveRate: Double = 0.0,
        val estimatedPph21: Double = 0.0,
        val netCompensationReceived: Double = 0.0,
        val formulaString: String,
        val legalBasis: String
    )

    fun calculatePkwtCompensation(
        totalFixedSalary: Double,
        tenureMonths: Int
    ): Double {
        if (tenureMonths < 1) return 0.0
        // Rumus: (Masa Kerja dalam bulan / 12) × 1 Bulan Upah (PP 35/2021 Pasal 16)
        return (tenureMonths.toDouble() / 12.0) * totalFixedSalary
    }

    fun calculatePkwtDetailed(
        totalFixedSalary: Double,
        workedMonths: Double,
        scenario: PkwtScenario = PkwtScenario.SELESAI_KONTRAK,
        remainingMonths: Double = 0.0,
        extendedMonths: Double = 0.0,
        ptkpStatus: String = "TK/0",
        hasNpwp: Boolean = true
    ): PkwtCompensationDetail {
        if (workedMonths < 1.0) {
            return PkwtCompensationDetail(
                totalFixedSalary = totalFixedSalary,
                workedMonths = workedMonths,
                scenario = scenario,
                compensationAmount = 0.0,
                remainingMonths = remainingMonths,
                remainingSalaryIndemnity = 0.0,
                extendedMonths = extendedMonths,
                extensionCompensationAmount = 0.0,
                grandTotal = 0.0,
                formulaString = "Masa kerja kurang dari 1 bulan (< 1 bln), belum memenuhi syarat kompensasi PP 35/2021 Pasal 15 ayat (3).",
                legalBasis = "PP No. 35 Tahun 2021 Pasal 15 ayat (3)"
            )
        }

        // Kompensasi masa kerja pokok: (Masa Kerja / 12) x Upah Sebulan (PP 35/2021 Pasal 16)
        val compAmount = (workedMonths / 12.0) * totalFixedSalary

        var remainingIndemnity = 0.0
        var extCompAmount = 0.0
        var totalAmount = compAmount
        var formula = "(${workedMonths.toInt()} bln / 12) × Rp ${totalFixedSalary.toLong()}"

        when (scenario) {
            PkwtScenario.SELESAI_KONTRAK -> {
                totalAmount = compAmount
                formula = "Kompensasi = (${workedMonths.toInt()} bulan / 12) × Upah Sebulan"
            }
            PkwtScenario.DIPUTUS_SEBELUM_WAKTU -> {
                remainingIndemnity = remainingMonths * totalFixedSalary
                totalAmount = compAmount + remainingIndemnity
                formula = "Kompensasi Kerja (${workedMonths.toInt()} bln / 12 × Upah) + Ganti Rugi Sisa (${remainingMonths.toInt()} bln × Upah)"
            }
            PkwtScenario.PERPANJANGAN_KONTRAK -> {
                if (extendedMonths >= 1.0) {
                    extCompAmount = (extendedMonths / 12.0) * totalFixedSalary
                }
                totalAmount = compAmount + extCompAmount
                formula = "Kontrak Awal (${workedMonths.toInt()} bln / 12 × Upah) + Perpanjangan (${extendedMonths.toInt()} bln / 12 × Upah)"
            }
        }

        val terCat = determineTerCategory(ptkpStatus)
        val (terRate, pph21) = calculateMonthlyTerPph21(
            grossSalary = totalAmount,
            terCategory = terCat,
            hasNpwp = hasNpwp
        )
        val netReceived = max(0.0, totalAmount - pph21)

        val legal = when (scenario) {
            PkwtScenario.SELESAI_KONTRAK -> "PP No. 35 Tahun 2021 Pasal 15 & 16"
            PkwtScenario.DIPUTUS_SEBELUM_WAKTU -> "PP No. 35 Tahun 2021 Pasal 17 jo. UU Ketenagakerjaan No. 13/2003 Pasal 62"
            PkwtScenario.PERPANJANGAN_KONTRAK -> "PP No. 35 Tahun 2021 Pasal 15 ayat (4) & Pasal 16"
        }

        return PkwtCompensationDetail(
            totalFixedSalary = totalFixedSalary,
            workedMonths = workedMonths,
            scenario = scenario,
            compensationAmount = compAmount,
            remainingMonths = remainingMonths,
            remainingSalaryIndemnity = remainingIndemnity,
            extendedMonths = extendedMonths,
            extensionCompensationAmount = extCompAmount,
            grandTotal = totalAmount,
            terCategory = terCat,
            terEffectiveRate = terRate,
            estimatedPph21 = pph21,
            netCompensationReceived = netReceived,
            formulaString = formula,
            legalBasis = legal
        )
    }

    // =========================================================================
    // 6. KALKULATOR PESANGON PHK (PP NO. 35/2021 PASAL 40 - 49)
    // =========================================================================

    data class PesangonPhkResult(
        val tenureYears: Double,
        val standardUpMonths: Double,
        val standardUpmkMonths: Double,
        val multiplierUp: Double,
        val multiplierUpmk: Double,
        val totalUpAmount: Double,
        val totalUpmkAmount: Double,
        val totalUphAmount: Double,
        val grandTotalPesangon: Double,
        val legalArticleCitation: String
    )

    enum class PhkReason(val label: String, val upMultiplier: Double, val upmkMultiplier: Double, val article: String) {
        PENSIUN("Mencapai Usia Pensiun", 1.75, 1.0, "PP 35/2021 Pasal 56"),
        MENINGGAL("Pekerja Meninggal Dunia", 2.0, 1.0, "PP 35/2021 Pasal 57"),
        SAKIT_BERKEPANJANGAN("Sakit Berkepanjangan / Cacat Akibat Kerja > 12 Bulan", 2.0, 1.0, "PP 35/2021 Pasal 55"),
        EFISIENSI_RUGI("Efisiensi karena Perusahaan Mengalami Kerugian", 0.5, 1.0, "PP 35/2021 Pasal 43 ayat (1)"),
        EFISIENSI_CEGAH_RUGI("Efisiensi untuk Mencegah Terjadinya Kerugian", 1.0, 1.0, "PP 35/2021 Pasal 43 ayat (2)"),
        TUTUP_FORCE_MAJEURE("Perusahaan Tutup karena Keadaan Memaksa (Force Majeure)", 0.5, 1.0, "PP 35/2021 Pasal 45 ayat (1)"),
        PAILIT("Perusahaan Dinyatakan Pailit", 0.5, 1.0, "PP 35/2021 Pasal 47"),
        MERGER_PEKERJA_MENOLAK("Penggabungan/Peleburan (Pekerja Menolak Lanjut)", 0.5, 1.0, "PP 35/2021 Pasal 41"),
        MERGER_PENGUSAHA_MENOLAK("Penggabungan/Peleburan (Pengusaha Menolak Lanjut)", 1.0, 1.0, "PP 35/2021 Pasal 42"),
        PELANGGARAN_SP3("Pelanggaran Perjanjian Kerja / PP / PKB (setelah SP3)", 0.5, 1.0, "PP 35/2021 Pasal 52"),
        RESIGN_SUKARELA("Pekerja Mengundurkan Diri secara Sukarela", 0.0, 0.0, "PP 35/2021 Pasal 50 (Hanya Uang Pisah & UPH)"),
        MANGKIR("Pekerja Mangkir 5 Hari Kerja Berturut-turut", 0.0, 0.0, "PP 35/2021 Pasal 51")
    }

    /**
     * Hitung Standar Uang Pesangon (UP) PP 35/2021 Pasal 40 ayat (2)
     */
    fun getStandardUpMonths(tenureYears: Double): Double {
        return when {
            tenureYears < 1.0 -> 1.0
            tenureYears < 2.0 -> 2.0
            tenureYears < 3.0 -> 3.0
            tenureYears < 4.0 -> 4.0
            tenureYears < 5.0 -> 5.0
            tenureYears < 6.0 -> 6.0
            tenureYears < 7.0 -> 7.0
            tenureYears < 8.0 -> 8.0
            else -> 9.0
        }
    }

    /**
     * Hitung Standar Uang Penghargaan Masa Kerja (UPMK) PP 35/2021 Pasal 40 ayat (3)
     */
    fun getStandardUpmkMonths(tenureYears: Double): Double {
        return when {
            tenureYears < 3.0 -> 0.0
            tenureYears < 6.0 -> 2.0
            tenureYears < 9.0 -> 3.0
            tenureYears < 12.0 -> 4.0
            tenureYears < 15.0 -> 5.0
            tenureYears < 18.0 -> 6.0
            tenureYears < 21.0 -> 7.0
            tenureYears < 24.0 -> 8.0
            else -> 10.0
        }
    }

    fun calculatePesangonPhk(
        monthlySalary: Double,
        tenureYears: Double,
        reason: PhkReason,
        remainingLeaveDays: Int = 0,
        otherUphAmount: Double = 0.0
    ): PesangonPhkResult {
        val baseUpMonths = getStandardUpMonths(tenureYears)
        val baseUpmkMonths = getStandardUpmkMonths(tenureYears)

        val totalUp = (baseUpMonths * reason.upMultiplier) * monthlySalary
        val totalUpmk = (baseUpmkMonths * reason.upmkMultiplier) * monthlySalary

        // UPH: Penggantian cuti belum diambil = (Hari Cuti / 21 hari kerja) * Upah Sebulan
        val leaveCompensation = (remainingLeaveDays.toDouble() / 21.0) * monthlySalary
        val totalUph = leaveCompensation + otherUphAmount

        val grandTotal = totalUp + totalUpmk + totalUph

        return PesangonPhkResult(
            tenureYears = tenureYears,
            standardUpMonths = baseUpMonths,
            standardUpmkMonths = baseUpmkMonths,
            multiplierUp = reason.upMultiplier,
            multiplierUpmk = reason.upmkMultiplier,
            totalUpAmount = totalUp,
            totalUpmkAmount = totalUpmk,
            totalUphAmount = totalUph,
            grandTotalPesangon = grandTotal,
            legalArticleCitation = reason.article
        )
    }

    // =========================================================================
    // 9. LOGIKA JAM KERJA & SHIFT (REGULER, SHIFT 1 PAGI, SHIFT 2 SORE, SHIFT 3 MALAM, LONG SHIFT 12 JAM)
    // Dasar Hukum:
    // - UU No. 13/2003 Pasal 76, 77, 78, 79 jo. UU Cipta Kerja No. 6/2023
    // - PP No. 35/2021 Pasal 21 s.d. Pasal 34 (Waktu Kerja, Lembur, & Waktu Istirahat)
    // - Kepmenakertrans No. KEP.224/MEN/2003 (Kewajiban Pengusaha yang Mempekerjakan Pekerja Perempuan pada Malam Hari)
    // - Kepmenakertrans No. KEP.233/MEN/2003 (Jenis & Sifat Pekerjaan yang Dijalankan Secara Terus Menerus)
    // =========================================================================

    enum class WorkShiftType(
        val key: String,
        val displayName: String,
        val defaultTimeRange: String,
        val totalShiftDurationHours: Double,
        val normalWorkHours: Double,
        val defaultBreakHours: Double,
        val mandatoryOvertimeHours: Double,
        val legalReference: String,
        val description: String
    ) {
        REGULAR(
            key = "REGULAR",
            displayName = "Jam Kerja Regular (Non-Shift)",
            defaultTimeRange = "08:00 - 17:00",
            totalShiftDurationHours = 8.0,
            normalWorkHours = 8.0,
            defaultBreakHours = 1.0,
            mandatoryOvertimeHours = 0.0,
            legalReference = "PP No. 35/2021 Pasal 21 (5 Hari Kerja / 8 Jam sehari atau 6 Hari Kerja / 7 Jam sehari)",
            description = "Waktu kerja standar perkantoran atau operasional umum non-bergilir."
        ),
        SHIFT_PAGI(
            key = "SHIFT_PAGI",
            displayName = "Shift 1 (Pagi)",
            defaultTimeRange = "07:00 - 15:00",
            totalShiftDurationHours = 8.0,
            normalWorkHours = 7.0,
            defaultBreakHours = 1.0,
            mandatoryOvertimeHours = 0.0,
            legalReference = "Sistem 3 Giliran Kerja (3 Shift 8 Jam per rotasi) - PP 35/2021",
            description = "Shift operasional pagi hari untuk menjaga kontinuitas produksi atau layanan."
        ),
        SHIFT_SORE(
            key = "SHIFT_SORE",
            displayName = "Shift 2 (Sore / Siang)",
            defaultTimeRange = "15:00 - 23:00",
            totalShiftDurationHours = 8.0,
            normalWorkHours = 7.0,
            defaultBreakHours = 1.0,
            mandatoryOvertimeHours = 0.0,
            legalReference = "Sistem 3 Giliran Kerja (3 Shift 8 Jam per rotasi) - PP 35/2021",
            description = "Shift operasional sore hingga menjelang malam hari."
        ),
        SHIFT_MALAM(
            key = "SHIFT_MALAM",
            displayName = "Shift 3 (Malam)",
            defaultTimeRange = "23:00 - 07:00",
            totalShiftDurationHours = 8.0,
            normalWorkHours = 7.0,
            defaultBreakHours = 1.0,
            mandatoryOvertimeHours = 0.0,
            legalReference = "UU No. 13/2003 Pasal 76 & Kepmenakertrans No. KEP.224/MEN/2003",
            description = "Shift operasional malam hari dengan kewajiban proteksi keselamatan & asupan nutrisi pekerja."
        ),
        LONG_SHIFT(
            key = "LONG_SHIFT",
            displayName = "Long Shift (12 Jam)",
            defaultTimeRange = "08:00 - 20:00 / 20:00 - 08:00",
            totalShiftDurationHours = 12.0,
            normalWorkHours = 8.0,
            defaultBreakHours = 1.0,
            mandatoryOvertimeHours = 4.0,
            legalReference = "Permenaker No. 233/MEN/2003 & PP No. 35/2021 (8 Jam Normal + 4 Jam Lembur Terstruktur)",
            description = "Shift 12 jam pada sektor operasional kontinu. 4 jam kelebihan jam normal otomatis dihitung sebagai upah lembur resmi."
        );

        companion object {
            fun fromKey(key: String): WorkShiftType {
                return entries.firstOrNull { it.key.equals(key.trim(), ignoreCase = true) } ?: REGULAR
            }
        }
    }

    data class ShiftWorkDetailsResult(
        val shiftType: WorkShiftType,
        val timeRange: String,
        val totalDurationHours: Double,
        val effectiveWorkHours: Double,
        val breakHours: Double,
        val isOvertimeIncluded: Boolean,
        val overtimeHours: Double,
        val overtimeMultiplierHours: Double,
        val overtimeHourlyRate: Double,
        val overtimePayAmount: Double,
        val shiftAllowanceAmount: Double,
        val totalShiftDailyEarnings: Double,
        val complianceNotes: List<String>,
        val legalCitation: String
    )

    /**
     * Kalkulasi komprehensif rincian jam kerja, lembur terstruktur, dan kepatuhan hukum untuk shift kerja tertentu.
     */
    fun calculateShiftWorkDetails(
        shiftType: WorkShiftType,
        totalFixedSalary: Double,
        dayType: String = "WORKDAY",
        customBreakHours: Double? = null,
        customShiftAllowance: Double = 0.0
    ): ShiftWorkDetailsResult {
        val hourlyRate = calculateHourlyRate(totalFixedSalary)
        val breakHours = customBreakHours ?: shiftType.defaultBreakHours
        val effectiveWorkHours = max(0.0, shiftType.normalWorkHours)
        
        var overtimeHours = 0.0
        var multiplierHours = 0.0
        var overtimePay = 0.0

        if (shiftType == WorkShiftType.LONG_SHIFT) {
            overtimeHours = shiftType.mandatoryOvertimeHours // 4 jam pada hari kerja normal
            val otResult = calculateOvertime(
                hours = overtimeHours,
                totalFixedSalary = totalFixedSalary,
                dayType = dayType
            )
            multiplierHours = otResult.multiplierHours
            overtimePay = otResult.totalAmount
        }

        val totalDailyEarnings = overtimePay + customShiftAllowance

        val complianceNotes = mutableListOf<String>()
        when (shiftType) {
            WorkShiftType.REGULAR -> {
                complianceNotes.add("PP 35/2021 Pasal 21: Maksimum 40 jam seminggu (8 jam/hari 5HK atau 7 jam/hari 6HK).")
                complianceNotes.add("Wajib istirahat minimal 30 menit setelah 4 jam kerja terus menerus (UU 13/2003 Pasal 79).")
            }
            WorkShiftType.SHIFT_PAGI -> {
                complianceNotes.add("Rotasi shift reguler 8 jam (termasuk istirahat 1 jam).")
                complianceNotes.add("Total jam kerja akumulasi mingguan tetap dibatasi maksimal 40 jam.")
            }
            WorkShiftType.SHIFT_SORE -> {
                complianceNotes.add("Siklus pergantian shift 2 wajib memberikan jeda istirahat antar-shift minimal 16 jam.")
                complianceNotes.add("Perusahaan dapat memberikan uang insentif/tunjangan shift sore.")
            }
            WorkShiftType.SHIFT_MALAM -> {
                complianceNotes.add("UU 13/2003 Pasal 76 ayat (1): Dilarang mempekerjakan pekerja perempuan hamil berisiko atau usia <18 tahun pukul 23.00 - 07.00.")
                complianceNotes.add("Kepmenakertrans KEP.224/MEN/2003: Pengusaha wajib menyediakan makanan & minuman bergizi minimal 1.400 Kkal (tidak boleh diganti uang).")
                complianceNotes.add("Wajib menyediakan fasilitas antar-jemput bagi pekerja perempuan yang pulang/berangkat antara pukul 23.00 - 05.00.")
            }
            WorkShiftType.LONG_SHIFT -> {
                complianceNotes.add("PP 35/2021 & Kepmenakertrans KEP.233/MEN/2003: Long shift 12 jam terdiri dari 8 jam kerja pokok + 4 jam lembur.")
                complianceNotes.add("Kelebihan 4 jam wajib dibayar upah lembur resmi (1 jam x 1.5 + 3 jam x 2.0 = 7.5 jam pengali lembur = ${Formatters.formatRupiah(overtimePay)}).")
                complianceNotes.add("Pekerja berhak mendapatkan waktu istirahat dan makan yang cukup selama jeda 12 jam.")
            }
        }

        return ShiftWorkDetailsResult(
            shiftType = shiftType,
            timeRange = shiftType.defaultTimeRange,
            totalDurationHours = shiftType.totalShiftDurationHours,
            effectiveWorkHours = effectiveWorkHours,
            breakHours = breakHours,
            isOvertimeIncluded = shiftType == WorkShiftType.LONG_SHIFT,
            overtimeHours = overtimeHours,
            overtimeMultiplierHours = multiplierHours,
            overtimeHourlyRate = hourlyRate,
            overtimePayAmount = overtimePay,
            shiftAllowanceAmount = customShiftAllowance,
            totalShiftDailyEarnings = totalDailyEarnings,
            complianceNotes = complianceNotes,
            legalCitation = shiftType.legalReference
        )
    }

    /**
     * =========================================================================
     * SIMULASI & KALKULASI POLA ROSTER KERJA (ROSTER 8:2, 3 SHIFT 4 GRUP, 5:2, 14:14, 21:7)
     * Dasar Hukum:
     * - UU No. 13/2003 jo. UU No. 6/2023 (Cipta Kerja)
     * - PP No. 35/2021 tentang PKWT, Alih Daya, Waktu Kerja & Istirahat
     * - Kepmenakertrans No. KEP.233/MEN/2003 (Pekerjaan yang Dijalankan Terus Menerus)
     * - Kepmenakertrans No. KEP.234/MEN/2003 & Kepmenaker No. 15 Tahun 2005 (Waktu Kerja & Istirahat Sektor Pertambangan/Energi)
     * =========================================================================
     */

    enum class RosterPatternType(
        val key: String,
        val displayName: String,
        val workDays: Int,
        val offDays: Int,
        val cycleDays: Int,
        val legalReference: String,
        val description: String
    ) {
        ROSTER_8_2(
            key = "ROSTER_8_2",
            displayName = "Roster 8:2 Harian (8 Hari Kerja, 2 Hari Off)",
            workDays = 8,
            offDays = 2,
            cycleDays = 10,
            legalReference = "Kepmenakertrans No. KEP.233/MEN/2003 & Kepmenaker No. 15/2005 (Sektor Operasional / Tambang)",
            description = "Pola siklus 10 hari: 8 hari kerja berturut-turut (ON) diikuti 2 hari istirahat periodik (OFF). Standar populer di industri pertambangan, manufaktur 24 jam, site konstruksi, perkebunan, dan logistik/perkapalan."
        ),
        ROSTER_8_2_WEEKS(
            key = "ROSTER_8_2_WEEKS",
            displayName = "Roster 8:2 Mingguan (8 Mgg On, 2 Mgg Off / Field Break)",
            workDays = 40,
            offDays = 30,
            cycleDays = 70,
            legalReference = "PP No. 35/2021 Pasal 21 ayat (1) huruf a (40 Jam/Minggu Standar Regulasi Tanpa Lembur) & Kepmenakertrans No. KEP.234/MEN/2003",
            description = "Pola operasional site tambang sesuai regulasi waktu kerja: 8 minggu di site dengan jadwal standar 40 jam per minggu (5 hari kerja x 8 jam, 2 hari istirahat mingguan di site) TANPA LEMBUR, diikuti 2 minggu istirahat periodik penuh (14 hari Field Break / libur kepulangan ke home base)."
        ),
        ROSTER_3_SHIFT_4_GRUP(
            key = "ROSTER_3_SHIFT_4_GRUP",
            displayName = "3 Shift 4 Grup (Pola 2-2-2-2)",
            workDays = 6,
            offDays = 2,
            cycleDays = 8,
            legalReference = "PP No. 35/2021 Pasal 21 & Kepmenakertrans No. KEP.233/MEN/2003",
            description = "Siklus 8 hari: 2 Hari Shift Pagi, 2 Hari Shift Sore, 2 Hari Shift Malam, 2 Hari Libur (OFF). Menjamin pabrik beroperasi 24/7 tanpa henti."
        ),
        ROSTER_5_2(
            key = "ROSTER_5_2",
            displayName = "Standar 5:2 (5 Hari Kerja, 2 Hari Off)",
            workDays = 5,
            offDays = 2,
            cycleDays = 7,
            legalReference = "PP No. 35/2021 Pasal 21 ayat (1) huruf a (8 Jam/hari)",
            description = "Siklus mingguan standar perkantoran umum (Senin - Jumat kerja, Sabtu - Minggu libur)."
        ),
        ROSTER_6_1(
            key = "ROSTER_6_1",
            displayName = "Standar 6:1 (6 Hari Kerja, 1 Hari Off)",
            workDays = 6,
            offDays = 1,
            cycleDays = 7,
            legalReference = "PP No. 35/2021 Pasal 21 ayat (1) huruf b (7 Jam/hari)",
            description = "Siklus mingguan 6 hari kerja operasional toko/retail/pabrik (Senin - Sabtu kerja, Minggu libur)."
        ),
        ROSTER_14_14(
            key = "ROSTER_14_14",
            displayName = "Roster Tambang 14:14 (2 Mgg On, 2 Mgg Off)",
            workDays = 14,
            offDays = 14,
            cycleDays = 28,
            legalReference = "Kepmenaker No. 15 Tahun 2005 Sektor ESDM / Mineral & Batubara",
            description = "Pola site remote: 14 hari kerja berturut-turut di site lokasi, diikuti 14 hari istirahat periodik di home base."
        ),
        ROSTER_21_7(
            key = "ROSTER_21_7",
            displayName = "Roster Site 21:7 (3 Mgg On, 1 Mgg Off)",
            workDays = 21,
            offDays = 7,
            cycleDays = 28,
            legalReference = "Kepmenakertrans No. KEP.234/MEN/2003 Sektor Pertambangan",
            description = "Pola rotasi site: 21 hari kerja bergiliran di lokasi, diikuti 7 hari libur kepulangan (field break)."
        );

        companion object {
            fun fromKey(key: String): RosterPatternType {
                return entries.firstOrNull { it.key.equals(key.trim(), ignoreCase = true) } ?: ROSTER_8_2
            }
        }
    }

    data class ShiftRosterPatternItem(
        val dayName: String,
        val shiftType: WorkShiftType,
        val isDayOff: Boolean = false,
        val dayNumber: Int = 1,
        val workDurationHours: Double = 8.0,
        val overtimeHours: Double = 0.0,
        val notes: String = ""
    )

    data class RosterCycleSummary(
        val patternType: RosterPatternType,
        val totalCycleDays: Int,
        val totalWorkDays: Int,
        val totalOffDays: Int,
        val workPercentage: Double,
        val totalNormalWorkHours: Double,
        val totalOvertimeHours: Double,
        val totalOvertimeMultiplier: Double,
        val estimatedOvertimePay: Double,
        val estimatedShiftAllowance: Double,
        val totalCycleEarningsBonus: Double,
        val monthlyOffDaysEstimate: Double,
        val legalReference: String,
        val description: String
    )

    /**
     * Generator Jadwal Lengkap Roster Kerja
     * Mendukung Roster 8:2 dengan sub-variasi rotasi (4 Pagi + 4 Malam + 2 OFF, 8 Pagi + 2 OFF, atau 8 Long Shift + 2 OFF),
     * serta 3 Shift 4 Grup, 5:2, 6:1, 14:14, dan 21:7.
     */
    fun generateRosterSchedule(
        patternType: RosterPatternType = RosterPatternType.ROSTER_8_2,
        roster82Mode: String = "4_PAGI_4_MALAM", // "4_PAGI_4_MALAM", "8_PAGI", "8_LONG_SHIFT", "4_PAGI_4_SORE"
        shiftHoursPerDay: Double = 8.0
    ): List<ShiftRosterPatternItem> {
        val items = mutableListOf<ShiftRosterPatternItem>()

        when (patternType) {
            RosterPatternType.ROSTER_8_2 -> {
                // Pola 8:2 (10 Hari Siklus: 8 Hari On, 2 Hari Off)
                val is12h = roster82Mode == "8_LONG_SHIFT" || shiftHoursPerDay >= 12.0
                val otHoursPerWorkDay = if (is12h) 4.0 else 0.0
                val durationPerDay = if (is12h) 12.0 else 8.0

                for (day in 1..10) {
                    if (day <= 8) {
                        val shift = when (roster82Mode) {
                            "4_PAGI_4_MALAM" -> if (day <= 4) WorkShiftType.SHIFT_PAGI else WorkShiftType.SHIFT_MALAM
                            "4_PAGI_4_SORE" -> if (day <= 4) WorkShiftType.SHIFT_PAGI else WorkShiftType.SHIFT_SORE
                            "8_LONG_SHIFT" -> WorkShiftType.LONG_SHIFT
                            "8_PAGI" -> WorkShiftType.SHIFT_PAGI
                            else -> if (day <= 4) WorkShiftType.SHIFT_PAGI else WorkShiftType.SHIFT_MALAM
                        }
                        val shiftLabel = when (shift) {
                            WorkShiftType.SHIFT_PAGI -> "Pagi"
                            WorkShiftType.SHIFT_SORE -> "Sore"
                            WorkShiftType.SHIFT_MALAM -> "Malam"
                            WorkShiftType.LONG_SHIFT -> "Long Shift 12j"
                            else -> "Kerja"
                        }
                        val note = if (is12h) "Kerja $shiftLabel (8j Pokok + 4j Lembur)" else "Kerja $shiftLabel (8 Jam)"
                        items.add(
                            ShiftRosterPatternItem(
                                dayName = "Hari ke-$day ($shiftLabel)",
                                shiftType = shift,
                                isDayOff = false,
                                dayNumber = day,
                                workDurationHours = durationPerDay,
                                overtimeHours = otHoursPerWorkDay,
                                notes = note
                            )
                        )
                    } else {
                        val offIndex = day - 8
                        items.add(
                            ShiftRosterPatternItem(
                                dayName = "Hari ke-$day (OFF #$offIndex)",
                                shiftType = WorkShiftType.REGULAR,
                                isDayOff = true,
                                dayNumber = day,
                                workDurationHours = 0.0,
                                overtimeHours = 0.0,
                                notes = "Libur Roster 8:2 (Hari Istirahat Periodik #$offIndex)"
                            )
                        )
                    }
                }
            }

            RosterPatternType.ROSTER_8_2_WEEKS -> {
                // Pola Roster 8:2 Mingguan (8 Minggu On Site, 2 Minggu Off Field Break = 70 Hari Siklus)
                val is12h = roster82Mode == "WEEKS_12H_SHIFT" || roster82Mode == "8_LONG_SHIFT"
                val is7DaysWithOt = roster82Mode == "WEEKS_8H_SHIFT"
                val is61Site = roster82Mode == "WEEKS_6_1_ROSTER"
                // Default: WEEKS_5_2_NO_OT (5 Hari Kerja x 8 Jam = 40 Jam/Minggu, 2 Hari Off di Site • TANPA LEMBUR)
                val is52NoOt = roster82Mode == "WEEKS_5_2_NO_OT" || (!is12h && !is7DaysWithOt && !is61Site)

                for (day in 1..70) {
                    val currentWeek = ((day - 1) / 7) + 1
                    val dayInWeek = ((day - 1) % 7) + 1

                    val durationPerDay = when {
                        is12h -> 12.0
                        is61Site -> if (dayInWeek <= 5) 7.0 else 5.0 // Sesuai PP 35/2021 Pasal 21: 5x7j + 1x5j = 40j/mgg
                        else -> 8.0
                    }

                    if (currentWeek <= 8) {
                        // 8 Minggu ON Site
                        val isWeeklySiteOff = when {
                            is52NoOt -> dayInWeek >= 6 // Hari 6 & 7 Libur Mingguan di Site (Sabtu-Minggu OFF)
                            is61Site -> dayInWeek == 7 // Hari 7 Libur Mingguan di Site
                            else -> false // 7 hari operasional
                        }

                        if (isWeeklySiteOff) {
                            val offLabel = if (is52NoOt) {
                                if (dayInWeek == 6) "Istirahat Mingguan Site #1 (Sabtu)" else "Istirahat Mingguan Site #2 (Minggu)"
                            } else {
                                "Istirahat Mingguan di Site (Minggu ke-$currentWeek)"
                            }
                            items.add(
                                ShiftRosterPatternItem(
                                    dayName = "Mgg $currentWeek - H$dayInWeek (H-$day)",
                                    shiftType = WorkShiftType.REGULAR,
                                    isDayOff = true,
                                    dayNumber = day,
                                    workDurationHours = 0.0,
                                    overtimeHours = 0.0,
                                    notes = "🌴 $offLabel (40j Kerja/Mgg • 0j Lembur)"
                                )
                            )
                        } else {
                            val isRestDayOt = is7DaysWithOt && (dayInWeek == 6 || dayInWeek == 7)
                            val otHours = if (is12h) 4.0 else if (isRestDayOt) 8.0 else 0.0

                            val shift = if (is12h) WorkShiftType.LONG_SHIFT else if (currentWeek % 2 == 1) WorkShiftType.SHIFT_PAGI else WorkShiftType.SHIFT_MALAM
                            val shiftLabel = when (shift) {
                                WorkShiftType.LONG_SHIFT -> "Long 12j"
                                WorkShiftType.SHIFT_PAGI -> "Pagi"
                                WorkShiftType.SHIFT_MALAM -> "Malam"
                                else -> "Kerja"
                            }
                            val note = when {
                                is52NoOt -> "Site On Mgg $currentWeek ($shiftLabel 8j Normal • PP 35/2021 • 0j Lembur)"
                                is61Site -> "Site On Mgg $currentWeek ($shiftLabel ${if (dayInWeek <= 5) "7j" else "5j"} • PP 35/2021 6HK • 40j/Mgg • 0j Lembur)"
                                is12h -> "Site On Mgg $currentWeek (8j Pokok + 4j Lembur)"
                                isRestDayOt -> "Site On Mgg $currentWeek (8j Lembur Hari Libur Site)"
                                else -> "Site On Mgg $currentWeek ($shiftLabel 8j)"
                            }
                            items.add(
                                ShiftRosterPatternItem(
                                    dayName = "Mgg $currentWeek - H$dayInWeek (H-$day)",
                                    shiftType = shift,
                                    isDayOff = false,
                                    dayNumber = day,
                                    workDurationHours = durationPerDay,
                                    overtimeHours = otHours,
                                    notes = note
                                )
                            )
                        }
                    } else {
                        // 2 Minggu Field Break (Minggu 9 & 10 = 14 Hari Off)
                        val fieldBreakDay = day - 56
                        val fbWeek = currentWeek - 8
                        items.add(
                            ShiftRosterPatternItem(
                                dayName = "Hari ke-$day (Field Break Mgg $fbWeek • H-$fieldBreakDay)",
                                shiftType = WorkShiftType.REGULAR,
                                isDayOff = true,
                                dayNumber = day,
                                workDurationHours = 0.0,
                                overtimeHours = 0.0,
                                notes = "🌴 Libur Periodik Home Base (Hari ke-$fieldBreakDay dari 14 Hari Field Break • Tiket PP)"
                            )
                        )
                    }
                }
            }

            RosterPatternType.ROSTER_3_SHIFT_4_GRUP -> {
                // Siklus 8 Hari: 2 Pagi, 2 Sore, 2 Malam, 2 Off
                items.add(ShiftRosterPatternItem("Hari ke-1 (Pagi)", WorkShiftType.SHIFT_PAGI, isDayOff = false, dayNumber = 1, notes = "Shift 1 Pagi"))
                items.add(ShiftRosterPatternItem("Hari ke-2 (Pagi)", WorkShiftType.SHIFT_PAGI, isDayOff = false, dayNumber = 2, notes = "Shift 1 Pagi"))
                items.add(ShiftRosterPatternItem("Hari ke-3 (Sore)", WorkShiftType.SHIFT_SORE, isDayOff = false, dayNumber = 3, notes = "Shift 2 Sore"))
                items.add(ShiftRosterPatternItem("Hari ke-4 (Sore)", WorkShiftType.SHIFT_SORE, isDayOff = false, dayNumber = 4, notes = "Shift 2 Sore"))
                items.add(ShiftRosterPatternItem("Hari ke-5 (Malam)", WorkShiftType.SHIFT_MALAM, isDayOff = false, dayNumber = 5, notes = "Shift 3 Malam + Fasilitas Nutrisi"))
                items.add(ShiftRosterPatternItem("Hari ke-6 (Malam)", WorkShiftType.SHIFT_MALAM, isDayOff = false, dayNumber = 6, notes = "Shift 3 Malam + Fasilitas Nutrisi"))
                items.add(ShiftRosterPatternItem("Hari ke-7 (OFF #1)", WorkShiftType.REGULAR, isDayOff = true, dayNumber = 7, workDurationHours = 0.0, notes = "Libur Pergantian Rotasi #1"))
                items.add(ShiftRosterPatternItem("Hari ke-8 (OFF #2)", WorkShiftType.REGULAR, isDayOff = true, dayNumber = 8, workDurationHours = 0.0, notes = "Libur Pergantian Rotasi #2"))
            }

            RosterPatternType.ROSTER_5_2 -> {
                val days = listOf("Senin", "Selasa", "Rabu", "Kamis", "Jumat")
                days.forEachIndexed { idx, d ->
                    items.add(ShiftRosterPatternItem(d, WorkShiftType.REGULAR, isDayOff = false, dayNumber = idx + 1, workDurationHours = 8.0, notes = "Kerja Standar 8 Jam"))
                }
                items.add(ShiftRosterPatternItem("Sabtu (OFF)", WorkShiftType.REGULAR, isDayOff = true, dayNumber = 6, workDurationHours = 0.0, notes = "Libur Akhir Pekan (Weekend)"))
                items.add(ShiftRosterPatternItem("Minggu (OFF)", WorkShiftType.REGULAR, isDayOff = true, dayNumber = 7, workDurationHours = 0.0, notes = "Libur Akhir Pekan (Weekend)"))
            }

            RosterPatternType.ROSTER_6_1 -> {
                val days = listOf("Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu")
                days.forEachIndexed { idx, d ->
                    items.add(ShiftRosterPatternItem(d, WorkShiftType.REGULAR, isDayOff = false, dayNumber = idx + 1, workDurationHours = 7.0, notes = "Kerja Standar 7 Jam (Skema 6HK)"))
                }
                items.add(ShiftRosterPatternItem("Minggu (OFF)", WorkShiftType.REGULAR, isDayOff = true, dayNumber = 7, workDurationHours = 0.0, notes = "Libur Mingguan Resmi (1 Hari)"))
            }

            RosterPatternType.ROSTER_14_14 -> {
                for (day in 1..28) {
                    if (day <= 14) {
                        items.add(ShiftRosterPatternItem("Hari ke-$day (ON Site)", WorkShiftType.LONG_SHIFT, isDayOff = false, dayNumber = day, workDurationHours = 12.0, overtimeHours = 4.0, notes = "Kerja Site Tambang (8j Normal + 4j Lembur)"))
                    } else {
                        val offIdx = day - 14
                        items.add(ShiftRosterPatternItem("Hari ke-$day (Field Break H-$offIdx)", WorkShiftType.REGULAR, isDayOff = true, dayNumber = day, workDurationHours = 0.0, notes = "🌴 Libur Periodik Home Base (Hari ke-$offIdx dari 14 Hari Field Break)"))
                    }
                }
            }

            RosterPatternType.ROSTER_21_7 -> {
                for (day in 1..28) {
                    if (day <= 21) {
                        items.add(ShiftRosterPatternItem("Hari ke-$day (ON Site)", WorkShiftType.LONG_SHIFT, isDayOff = false, dayNumber = day, workDurationHours = 12.0, overtimeHours = 4.0, notes = "Kerja Site Tambang (8j Normal + 4j Lembur)"))
                    } else {
                        val offIdx = day - 21
                        items.add(ShiftRosterPatternItem("Hari ke-$day (Field Break H-$offIdx)", WorkShiftType.REGULAR, isDayOff = true, dayNumber = day, workDurationHours = 0.0, notes = "🌴 Libur Periodik Home Base (Hari ke-$offIdx dari 7 Hari Field Break)"))
                    }
                }
            }
        }

        return items
    }

    /**
     * Kalkulasi Ringkasan Jam Kerja, Lembur, dan Tunjangan per Siklus Roster
     */
    fun calculateRosterCycleSummary(
        patternType: RosterPatternType,
        rosterItems: List<ShiftRosterPatternItem>,
        totalFixedSalary: Double,
        shiftAllowancePerDay: Double = 0.0
    ): RosterCycleSummary {
        val totalCycleDays = rosterItems.size
        val totalWorkDays = rosterItems.count { !it.isDayOff }
        val totalOffDays = rosterItems.count { it.isDayOff }
        val workPct = if (totalCycleDays > 0) (totalWorkDays.toDouble() / totalCycleDays) * 100.0 else 0.0

        val totalNormalHours = rosterItems.filter { !it.isDayOff }.sumOf { kotlin.math.max(0.0, it.workDurationHours - it.overtimeHours) }
        val totalOtHours = rosterItems.filter { !it.isDayOff }.sumOf { it.overtimeHours }

        var totalMultiplier = 0.0
        var totalOtPay = 0.0

        if (totalOtHours > 0) {
            // Tiap hari kerja dengan lembur
            rosterItems.filter { !it.isDayOff && it.overtimeHours > 0 }.forEach { item ->
                val isWeekendOrRestDay = item.notes.contains("Hari Libur", ignoreCase = true) || item.workDurationHours == item.overtimeHours
                val otRes = calculateOvertime(item.overtimeHours, totalFixedSalary, if (isWeekendOrRestDay) "WEEKEND" else "WORKDAY")
                totalMultiplier += otRes.multiplierHours
                totalOtPay += otRes.totalAmount
            }
        }

        val totalShiftAllowance = totalWorkDays * shiftAllowancePerDay
        val totalEarningsBonus = totalOtPay + totalShiftAllowance

        // Estimasi hari libur dalam sebulan (30 hari)
        val monthlyOffEstimate = if (totalCycleDays > 0) (30.0 / totalCycleDays) * totalOffDays else 4.0

        return RosterCycleSummary(
            patternType = patternType,
            totalCycleDays = totalCycleDays,
            totalWorkDays = totalWorkDays,
            totalOffDays = totalOffDays,
            workPercentage = workPct,
            totalNormalWorkHours = totalNormalHours,
            totalOvertimeHours = totalOtHours,
            totalOvertimeMultiplier = totalMultiplier,
            estimatedOvertimePay = totalOtPay,
            estimatedShiftAllowance = totalShiftAllowance,
            totalCycleEarningsBonus = totalEarningsBonus,
            monthlyOffDaysEstimate = monthlyOffEstimate,
            legalReference = patternType.legalReference,
            description = patternType.description
        )
    }

    /**
     * Backward-compatible helper untuk 3 Shift 4 Grup
     */
    fun generateStandard3ShiftRoster(): List<ShiftRosterPatternItem> {
        return generateRosterSchedule(RosterPatternType.ROSTER_3_SHIFT_4_GRUP)
    }

    // =========================================================================
    // 10. TATA CARA & ESTIMASI KLAIM MANFAAT BPJS KETENAGAKERJAAN (JHT, JKM, JKK, JKP)
    // Dasar Hukum:
    // - UU No. 40/2004 tentang Sistem Jaminan Sosial Nasional (SJSN)
    // - UU No. 24/2011 tentang Badan Penyelenggara Jaminan Sosial (BPJS)
    // - PP No. 44/2015 jo. PP No. 82/2019 (Penyelenggaraan Program JKK dan JKM)
    // - PP No. 46/2015 jo. PP No. 60/2015 & Permenaker No. 4/2022 (Tata Cara Pembayaran Manfaat JHT)
    // - PP No. 37/2021 jo. UU Cipta Kerja No. 6/2023 (Penyelenggaraan Program JKP)
    // - Permenaker No. 5/2021 (Tata Cara Penyelenggaraan JKK, JKM, dan JHT)
    // =========================================================================

    enum class BpjsProgramType(
        val code: String,
        val title: String,
        val fullName: String,
        val legalBasis: String
    ) {
        JHT(
            code = "JHT",
            title = "Jaminan Hari Tua (JHT)",
            fullName = "Manfaat Tabungan Akumulasi Iuran + Hasil Pengembangan",
            legalBasis = "PP No. 46/2015 jo. PP No. 60/2015 & Permenaker No. 4/2022"
        ),
        JKM(
            code = "JKM",
            title = "Jaminan Kematian (JKM)",
            fullName = "Santunan Kematian Bukan Akibat Kecelakaan Kerja + Beasiswa Anak",
            legalBasis = "PP No. 44/2015 jo. PP No. 82/2019 Pasal 34 - 36"
        ),
        JKK(
            code = "JKK",
            title = "Jaminan Kecelakaan Kerja (JKK)",
            fullName = "Perawatan Medis Unlimited, Penggantian Upah STMB, Santunan Cacat / Meninggal JKK",
            legalBasis = "PP No. 44/2015 jo. PP No. 82/2019 & Permenaker No. 5/2021"
        ),
        JKP(
            code = "JKP",
            title = "Jaminan Kehilangan Pekerjaan (JKP)",
            fullName = "Manfaat Uang Tunai 60% Upah (6 Bulan), Info Pasar Kerja & Pelatihan Vokasi (PP 6/2025)",
            legalBasis = "PP No. 6 Tahun 2025 (Perubahan atas PP 37/2021) jo. UU Cipta Kerja"
        ),
        JP(
            code = "JP",
            title = "Jaminan Pensiun (JP)",
            fullName = "Pensiun Bulanan Seumur Hidup (≥15 Thn Iuran) / Lump Sum Sekaligus (<15 Thn)",
            legalBasis = "PP No. 45 Tahun 2015 jo. UU No. 40/2004 (SJSN)"
        )
    }

    data class JpBenefitTypeDetail(
        val name: String,
        val recipient: String,
        val formulaDescription: String,
        val estimatedAmount: Double,
        val isMonthly: Boolean,
        val iconType: String
    )

    data class JpClaimSimulationResult(
        val reportedSalary: Double,
        val wageCap: Double = 10_042_300.0, // Batas maksimal upah JP terupdate BPJS-TK
        val cappedSalary: Double,
        val contributionEmployee: Double, // 1%
        val contributionEmployer: Double, // 2%
        val totalMonthlyContribution: Double, // 3%
        val contributionYears: Double,
        val contributionMonths: Int,
        val isEligibleForMonthlyPension: Boolean, // True jika >= 15 tahun (180 bulan)
        val currentRetirementAge: Int = 59, // Sesuai PP 45/2015 periode 2025-2027
        val monthlyPensionEstimate: Double, // MPHT berkala sebulan
        val minimumMonthlyPension: Double = 399_000.0,
        val maximumMonthlyPension: Double = 4_590_000.0,
        val lumpSumEstimate: Double, // Pembayaran sekaligus jika < 15 tahun (Iuran + Bunga Pengembangan ~5.5% p.a.)
        val totalContributionsAccumulated: Double,
        val estimatedInvestmentYield: Double,
        val jandaDudaMonthlyBenefit: Double, // 50% MPHT
        val anakMonthlyBenefit: Double, // 50% MPHT
        val orangTuaMonthlyBenefit: Double, // 20% MPHT
        val cacatTotalMonthlyBenefit: Double, // MP Cacat
        val benefitTypes: List<JpBenefitTypeDetail>,
        val retirementAgeSchedule: List<Pair<String, Int>>,
        val requiredDocuments: List<String>,
        val claimStepByStep: List<String>,
        val legalNotes: List<String>
    )

    data class JkpClaimSimulationResult(
        val reportedSalary: Double,
        val cappedSalary: Double, // Maksimal batas atas Rp 5.000.000 (PP 6/2025 Pasal 21)
        val monthlyRate: Double = 0.60, // 60% flat selama 6 bulan penuh (PP 6/2025)
        val monthlyCashBenefit: Double, // Upah Dasar x 60% (maks Rp 3.000.000/bln)
        val totalCashBenefit6Months: Double, // s.d. Rp 18.000.000
        val month1To3Rate: Double = 0.60,
        val month1To3MonthlyCash: Double = monthlyCashBenefit,
        val month4To6Rate: Double = 0.60,
        val month4To6MonthlyCash: Double = monthlyCashBenefit,
        val isEligible: Boolean,
        val isContractWorkerProtected: Boolean = true, // PKWT sebelum kontrak berakhir tercakup
        val isBankruptcyProtected: Boolean = true, // Perusahaan pailit / menunggak tetap terlindungi
        val regulationReference: String = "PP No. 6 Tahun 2025",
        val previousRegulationComparison: String = "Sebelumnya di PP 37/2021: 45% (bln 1-3) & 25% (bln 4-6) total Rp 10.5jt. Di PP 6/2025 naik jadi 60% flat 6 bulan total Rp 18jt (+Rp 7.5jt).",
        val eligibilityNotes: List<String>,
        val requiredDocuments: List<String>,
        val claimStepByStep: List<String>,
        val keyChangesPp6Year2025: List<String>
    )

    data class JkmClaimSimulationResult(
        val santunanKematianSekaligus: Double = 20_000_000.0,
        val santunanBerkala24Bulan: Double = 12_000_000.0, // 24 x Rp 500.000
        val biayaPemakaman: Double = 10_000_000.0,
        val totalSantunanPasti: Double = 42_000_000.0,
        val beasiswaAnakMaxTotal: Double = 174_000_000.0,
        val totalPotensiManfaatMaksimal: Double = 216_000_000.0,
        val requiredDocuments: List<String>,
        val claimStepByStep: List<String>,
        val legalNotes: List<String>
    )

    data class StmbDailySimulation(
        val daysCount: Int,
        val dailyWage: Double, // Upah Sebulan / 30 Hari
        val percentage: Double, // 100% untuk 12 bulan pertama, 50% bulan ke-13 dst.
        val totalBenefit: Double, // dailyWage * daysCount * percentage
        val label: String
    )

    data class JkkClaimSimulationResult(
        val reportedSalary: Double,
        val dailyWage: Double = reportedSalary / 30.0,
        val stmbMonth1To6Monthly: Double,
        val stmbMonth7To12Monthly: Double,
        val stmbMonth13AfterMonthly: Double,
        val commonStmbDays: List<StmbDailySimulation>,
        val santunanMeninggalDuniaJkk: Double, // 48 x Upah Sebulan
        val santunanCacatTotalTetap: Double, // 56 x Upah Sebulan + Santunan berkala
        val biayaPemakaman: Double = 10_000_000.0,
        val santunanBerkala: Double = 12_000_000.0,
        val beasiswaAnakMaxTotal: Double = 174_000_000.0,
        val requiredDocuments: List<String>,
        val claimStepByStep: List<String>,
        val medicalFacilityNotes: List<String>
    )

    data class JhtClaimSimulationResult(
        val estimatedMonthlyContribution: Double, // 5.7% x upah
        val claimCategory: String,
        val claimPercentageAllowed: Double,
        val claimChannels: List<String>,
        val requiredDocuments: List<String>,
        val claimStepByStep: List<String>,
        val taxNotes: String
    )

    /**
     * 1. Kalkulator & Tata Cara Klaim JKP (Jaminan Kehilangan Pekerjaan - PP No. 6 Tahun 2025)
     * Pembaruan Regulasi PP 6/2025 (Diundangkan 7 Februari 2025):
     * - Manfaat uang tunai meningkat signifikan menjadi 60% dari upah selama 6 bulan penuh (maks Rp 3.000.000/bln, total s.d. Rp 18.000.000).
     * - Batas atas upah perhitungan tetap Rp 5.000.000.
     * - Syarat iuran 6 bulan berturut-turut telah dihapus; cukup masa iur minimal 12 bulan dalam 24 bulan sebelum PHK.
     * - Memperluas perlindungan bagi pekerja PKWT (kontrak) yang terkena PHK sebelum kontrak berakhir.
     * - Menjamin hak pekerja meskipun perusahaan menunggak iuran atau dinyatakan pailit.
     * - Iuran JKP 0,36% (0,14% dari rekomposisi iuran JKK dan 0,22% dari subsidi APBN pemerintah).
     */
    fun calculateJkpBenefit(
        salary: Double,
        hasPaidMin12MonthsIn24Months: Boolean = true,
        hasPaidMin6MonthsConsecutive: Boolean = true, // Dipertahankan untuk kompatibilitas UI/test
        isPkwtTerminatedEarly: Boolean = false
    ): JkpClaimSimulationResult {
        val cappedSalary = min(5_000_000.0, salary)
        val monthlyCash = cappedSalary * 0.60 // PP 6/2025: 60% flat per bulan selama 6 bulan
        val totalCash = monthlyCash * 6.0 // Maksimal s.d. Rp 18.000.000

        // Sesuai PP 6/2025: Syarat kelayakan utama adalah memiliki masa iur min. 12 bulan dalam 24 bulan
        val isEligible = hasPaidMin12MonthsIn24Months

        val keyChanges = listOf(
            "Peningkatan Uang Tunai: 60% upah flat selama 6 bulan penuh (sebelumnya 45% bln 1-3 dan 25% bln 4-6 di PP 37/2021).",
            "Maksimal Manfaat Tunai: Total s.d. Rp 18.000.000 (Rp 3.000.000/bulan) dengan batas atas upah acuan Rp 5.000.000.",
            "Relaksasi Syarat Iuran: Penghapusan syarat iuran 6 bulan berturut-turut, cukup akumulasi masa iur 12 bulan dalam 24 bulan.",
            "Perlindungan Pekerja Kontrak (PKWT): Pekerja PKWT yang mengalami PHK sebelum masa kontrak berakhir kini resmi tercover.",
            "Jaminan Kepailitan & Tunggakan Iuran: Pekerja tetap berhak menerima manfaat JKP meskipun perusahaan menunggak iuran atau dinyatakan pailit.",
            "Sumber Iuran JKP (0,36%): 0,14% dari rekomposisi JKK dan 0,22% dari APBN pemerintah (tidak memotong porsi JKM)."
        )

        val eligibilityNotes = listOf(
            "Warga Negara Indonesia (WNI) yang telah diikutsertakan program BPJS Ketenagakerjaan dan JKN.",
            "Belum mencapai usia 54 tahun saat terdaftar kepesertaan.",
            "Memiliki masa iur paling sedikit 12 bulan dalam kurun waktu 24 bulan sebelum PHK (syarat 6 bulan berturut-turut resmi dihapus di PP 6/2025).",
            "Terjadi PHK bukan karena mengundurkan diri (resign sukarela), pensiun, meninggal dunia, atau cacat total tetap.",
            "Pekerja kontrak (PKWT) yang mengalami PHK sebelum masa perjanjian kerja berakhir berhak atas manfaat JKP (PP 6/2025).",
            "Pekerja dari perusahaan pailit atau menunggak iuran tetap berhak mengajukan klaim JKP (PP 6/2025).",
            "Mempunyai komitmen untuk bekerja kembali (aktif melamar kerja atau mengikuti pelatihan kerja di portal SIAPkerja)."
        )

        val docs = listOf(
            "Surat Keterangan PHK: Dokumen atau surat resmi Pemutusan Hubungan Kerja dari perusahaan.",
            "Surat Tanggapan Tidak Menolak PHK: Surat pernyataan atau keterangan bahwa pekerja tidak menolak PHK yang ditandatangani oleh pekerja.",
            "Tanda Terima Laporan PHK: Bukti laporan PHK dari instansi atau dinas yang menyelenggarakan urusan di bidang ketenagakerjaan (Disnaker Kabupaten/Kota/Provinsi atau Kemnaker).",
            "Kartu Tanda Penduduk (KTP): Identitas diri resmi.",
            "Kartu Keluarga (KK).",
            "Kartu Peserta BPJS Ketenagakerjaan.",
            "Nomor Rekening Buku Tabungan: Atas nama peserta yang masih aktif."
        )

        val steps = listOf(
            "Langkah 1: Pastikan Perusahaan atau Pekerja telah melaporkan data PHK ke portal Kemnaker (siapkerja.kemnaker.go.id / Wajib Lapor Ketenagakerjaan).",
            "Langkah 2: Login ke akun SIAPkerja Anda di situs kemnaker.go.id atau aplikasi SIAPkerja.",
            "Langkah 3: Pilih menu 'Jaminan Kehilangan Pekerjaan (JKP)', cek kelayakan klaim sesuai PP No. 6 Tahun 2025, dan aktifkan akun JKP Anda.",
            "Langkah 4: Lengkapi asesmen diri dan pilih konseling karir / pelatihan kerja vokasi bersertifikasi kompetensi gratis.",
            "Langkah 5: Masukkan nomor rekening bank aktif untuk transfer pencairan manfaat uang tunai 60% upah (maks. Rp 3.000.000/bulan).",
            "Langkah 6: Untuk klaim bulan ke-2 hingga ke-6, lakukan pelaporan aktivitas mencari kerja (min. 5 lamaran / 1 wawancara) atau bukti pelatihan di portal SIAPkerja sebelum pengajuan klaim bulanan."
        )

        return JkpClaimSimulationResult(
            reportedSalary = salary,
            cappedSalary = cappedSalary,
            monthlyRate = 0.60,
            monthlyCashBenefit = monthlyCash,
            totalCashBenefit6Months = totalCash,
            month1To3Rate = 0.60,
            month1To3MonthlyCash = monthlyCash,
            month4To6Rate = 0.60,
            month4To6MonthlyCash = monthlyCash,
            isEligible = isEligible,
            isContractWorkerProtected = true,
            isBankruptcyProtected = true,
            regulationReference = "PP No. 6 Tahun 2025",
            eligibilityNotes = eligibilityNotes,
            requiredDocuments = docs,
            claimStepByStep = steps,
            keyChangesPp6Year2025 = keyChanges
        )
    }

    /**
     * 2. Kalkulator & Tata Cara Klaim JKM (Jaminan Kematian - PP 82/2019)
     */
    fun calculateJkmBenefit(): JkmClaimSimulationResult {
        val docs = listOf(
            "Kartu Peserta BPJS Ketenagakerjaan (KPJ) asli almarhum/almarhumah.",
            "Surat Keterangan Kematian dari Rumah Sakit / Kelurahan / Catatan Sipil (asli & legalisir).",
            "Surat Keterangan Ahli Waris resmi dari Kelurahan/Kecamatan.",
            "KTP Elektronik (e-KTP) Almarhum dan KTP Elektronik Ahli Waris.",
            "Kartu Keluarga (KK) Almarhum dan Ahli Waris.",
            "Buku Tabungan Rekening Bank atas nama Ahli Waris.",
            "Buku Nikah (bagi suami/istri) atau Akta Kelahiran anak (bagi ahli waris anak/klaim beasiswa)."
        )

        val steps = listOf(
            "Langkah 1: Ahli waris mengumpulkan dokumen lengkap kematian dan surat keterangan ahli waris dari instansi berwenang.",
            "Langkah 2: Hubungi HRD/Perusahaan tempat almarhum bekerja untuk pengantar klaim kematian atau langsung datang ke Kantor Cabang BPJS Ketenagakerjaan terdekat.",
            "Langkah 3: Ambil nomor antrean layanan klaim JKM di Customer Service Kantor Cabang.",
            "Langkah 4: Petugas memverifikasi keabsahan dokumen dan status kepesertaan aktif almarhum.",
            "Langkah 5: Dana santunan total Rp 42.000.000 akan ditransfer langsung ke rekening bank ahli waris dalam waktu 3-5 hari kerja.",
            "Langkah 6: Jika almarhum memiliki anak usia sekolah dan memiliki masa iur min. 3 tahun, ajukan pencairan klaim beasiswa pendidikan secara berkala setiap tahun ajaran baru."
        )

        val notes = listOf(
            "Klaim JKM berlaku untuk peserta aktif yang meninggal dunia BUKAN karena kecelakaan kerja.",
            "Total santunan pasti adalah Rp 42.000.000 (terdiri dari Santunan Sekaligus Rp 20 Juta + Santunan Berkala 24 bln Rp 12 Juta + Biaya Pemakaman Rp 10 Juta).",
            "Manfaat Beasiswa diberikan maksimal untuk 2 (dua) orang anak dengan rincian: TK/SD Rp 1,5 Juta/thn (maks 8 thn), SMP Rp 2 Juta/thn (maks 3 thn), SMA Rp 3 Juta/thn (maks 3 thn), dan Perguruan Tinggi/S1 Rp 12 Juta/thn (maks 5 thn). Total potensi beasiswa s.d. Rp 174 Juta.",
            "Pemberian beasiswa berakhir saat anak mencapai usia 23 tahun, menikah, atau telah bekerja."
        )

        return JkmClaimSimulationResult(
            requiredDocuments = docs,
            claimStepByStep = steps,
            legalNotes = notes
        )
    }

    /**
     * Helper perhitungan STMB (Sementara Tidak Mampu Bekerja) berdasarkan durasi hari perawatan.
     * Sesuai PP 44/2015 jo. PP 82/2019 Pasal 25:
     * - Upah Harian Prorata = Upah Sebulan / 30 Hari
     * - 6 Bulan Pertama: 100% dari Upah
     * - 6 Bulan Kedua: 100% dari Upah (dinaikkan dari 75% sejak PP 82/2019)
     * - Bulan ke-13 s.d. sembuh: 50% dari Upah
     */
    fun calculateStmbDetail(
        monthlySalary: Double,
        treatmentDays: Int,
        monthPeriod: Int = 1 // 1: 6 bln pertama, 7: 6 bln kedua, 13: bln 13+
    ): StmbDailySimulation {
        val dailyWage = monthlySalary / 30.0
        val percentage = if (monthPeriod > 12) 0.50 else 1.00
        val total = dailyWage * treatmentDays * percentage
        val label = when {
            monthPeriod <= 6 -> "6 Bulan I (100% Upah)"
            monthPeriod <= 12 -> "6 Bulan II (100% Upah - PP 82/2019)"
            else -> "Bulan 13+ (50% Upah)"
        }
        return StmbDailySimulation(
            daysCount = treatmentDays,
            dailyWage = dailyWage,
            percentage = percentage,
            totalBenefit = total,
            label = "$treatmentDays Hari ($label)"
        )
    }

    /**
     * 3. Kalkulator & Tata Cara Klaim JKK (Jaminan Kecelakaan Kerja - PP 82/2019)
     */
    fun calculateJkkBenefit(monthlySalary: Double): JkkClaimSimulationResult {
        val dailyWage = monthlySalary / 30.0
        val stmb1to6 = monthlySalary * 1.0 // 100% upah
        val stmb7to12 = monthlySalary * 1.0 // 100% upah (PP 82/2019)
        val stmb13 = monthlySalary * 0.5 // 50% upah
        val santunanMatiJkk = monthlySalary * 48.0
        val santunanCacatTetap = (monthlySalary * 56.0) + 12_000_000.0

        val commonDays = listOf(5, 10, 14, 21, 30).map { days ->
            calculateStmbDetail(monthlySalary, days, monthPeriod = 1)
        }

        val docs = listOf(
            "Kartu Peserta BPJS Ketenagakerjaan (KPJ).",
            "KTP Elektronik (e-KTP) korban/ahli waris.",
            "Formulir 3 (KK1) - Laporan Kecelakaan Kerja Tahap I (diserahkan maksimal 2 x 24 jam setelah kejadian).",
            "Formulir 3a (KK2) - Laporan Kecelakaan Kerja Tahap II (diserahkan setelah pekerja sembuh/cacat/meninggal).",
            "Formulir 3b (KK3) - Surat Keterangan Dokter Kasus Kecelakaan Kerja / Surat Keterangan Istirahat Medis.",
            "Surat Laporan Kepolisian (LP) jika kecelakaan lalu lintas di jalan raya saat jam kerja/berangkat/pulang kerja.",
            "Kuitansi biaya pengobatan/pengangkutan asli (jika sempat membayar mandiri di luar RS PLKK)."
        )

        val steps = listOf(
            "Tahap 1 (Segera 2x24 Jam): Perusahaan/Pemberi kerja atau keluarga segera melaporkan kejadian kecelakaan dengan mengisi Formulir KK1 ke Kantor Cabang BPJS Ketenagakerjaan.",
            "Tahap 2 (Perawatan di PLKK): Bawa korban langsung ke Rumah Sakit Pusat Layanan Kecelakaan Kerja (PLKK/Trauma Center rekanan BPJS-TK) untuk perawatan medis TANPA BIAYA (Unlimited sesuai indikasi medis). Cukup tunjukkan KPJ & KTP.",
            "Tahap 3 (Penggantian Upah STMB Harian/Bulanan): Selama masa pemulihan dan tidak mampu bekerja (misal 5, 10, 14, 21 hari atau berbulan-bulan), perusahaan mengajukan klaim STMB untuk mengganti 100% upah yang dibayarkan ke pekerja.",
            "Tahap 4 (Pelaporan Tahap 2): Setelah dokter menyatakan selesai perawatan (sembuh, ada vonis cacat, atau meninggal), isi Formulir KK2 & surat keterangan dokter KK3.",
            "Tahap 5 (Pencairan Santunan Cacat/Kematian): BPJS Ketenagakerjaan mentransfer santunan cacat atau santunan kematian (48x upah) + beasiswa pendidikan anak ke rekening yang bersangkutan."
        )

        val facilityNotes = listOf(
            "Pelayanan pengobatan dan perawatan medis diberikan tanpa batasan biaya (unlimited) sesuai kebutuhan medis dokter di RS PLKK.",
            "STMB (Sementara Tidak Mampu Bekerja): Mengganti 100% upah pekerja selama tidak mampu bekerja (6 bulan I & 6 bulan II) serta 50% setelah bulan ke-13 sampai dinyatakan sembuh oleh dokter.",
            "Biaya transportasi evakuasi darurat ditanggung: Angkutan Darat s.d. Rp 5.000.000, Angkutan Laut s.d. Rp 2.000.000, Angkutan Udara s.d. Rp 10.000.000.",
            "Manfaat Return to Work (RTW): Pendampingan rehabilitasi medik dan pelatihan kerja bagi pekerja yang mengalami kecelakaan agar dapat kembali berkarya.",
            "Santunan Cacat Sebagian/Fungsi dihitung berdasarkan persentase tabel cedera x 80 x Upah Sebulan."
        )

        return JkkClaimSimulationResult(
            reportedSalary = monthlySalary,
            dailyWage = dailyWage,
            stmbMonth1To6Monthly = stmb1to6,
            stmbMonth7To12Monthly = stmb7to12,
            stmbMonth13AfterMonthly = stmb13,
            commonStmbDays = commonDays,
            santunanMeninggalDuniaJkk = santunanMatiJkk,
            santunanCacatTotalTetap = santunanCacatTetap,
            requiredDocuments = docs,
            claimStepByStep = steps,
            medicalFacilityNotes = facilityNotes
        )
    }

    /**
     * 4. Kalkulator & Tata Cara Klaim JHT (Jaminan Hari Tua - Permenaker No. 4/2022)
     */
    fun calculateJhtClaimGuide(
        monthlySalary: Double,
        claimCategory: String = "PHK_RESIGN" // "PHK_RESIGN", "USIA_PENSIUN_56", "SEBAGIAN_10_PERSEN", "SEBAGIAN_30_PERSEN"
    ): JhtClaimSimulationResult {
        val monthlyContribution = monthlySalary * 0.057 // 3.7% pemberi kerja + 2% pekerja

        val percentage = when (claimCategory) {
            "SEBAGIAN_10_PERSEN" -> 0.10
            "SEBAGIAN_30_PERSEN" -> 0.30
            else -> 1.00 // 100%
        }

        val channels = listOf(
            "Aplikasi JMO (Jamsostek Mobile): Untuk klaim JHT saldo s.d. Rp 10.000.000 dengan status kepesertaan non-aktif. Proses instan langsung cair ke rekening.",
            "Portal Lapakasik Online (lapakasik.bpjsketenagakerjaan.go.id): Untuk saldo di atas Rp 10.000.000 tanpa perlu datang ke kantor cabang (wawancara via video call).",
            "Kantor Cabang BPJS Ketenagakerjaan: Khusus klaim manual, kendala biometrik, klaim ahli waris, atau klaim kepesertaan sebagian (10%/30%)."
        )

        val docs = when (claimCategory) {
            "PHK_RESIGN" -> listOf(
                "Kartu Peserta BPJS Ketenagakerjaan (KPJ fisik atau digital di aplikasi JMO).",
                "KTP Elektronik (e-KTP) asli.",
                "Buku Tabungan Rekening Bank aktif (nama harus persis sama dengan KTP).",
                "Kartu Keluarga (KK).",
                "Surat Keterangan Berhenti Bekerja (Paklaring / Surat Pengalaman Kerja) dari perusahaan, atau Akta Penetapan PHI bagi korban PHK perselisihan.",
                "NPWP (wajib jika saldo JHT di atas Rp 50.000.000 agar tidak terkena potongan tarif pajak lebih tinggi)."
            )
            "USIA_PENSIUN_56" -> listOf(
                "Kartu Peserta BPJS Ketenagakerjaan (KPJ).",
                "KTP Elektronik asli (membuktikan usia telah mencapai 56 tahun).",
                "Buku Rekening Tabungan Bank aktif.",
                "Kartu Keluarga (KK).",
                "NPWP (jika saldo > Rp 50 Juta). *Catatan: Tidak memerlukan surat berhenti kerja jika sudah berusia 56 tahun.*"
            )
            "SEBAGIAN_30_PERSEN" -> listOf(
                "Kartu Peserta BPJS Ketenagakerjaan (telah aktif minimal 10 tahun).",
                "KTP Elektronik & Kartu Keluarga.",
                "Dokumen Perbankan Perumahan (Surat Keterangan KPR Bank / Dokumen Pembelian Rumah atas nama peserta).",
                "Buku Rekening Tabungan Bank atas nama peserta.",
                "NPWP (jika ada)."
            )
            else -> listOf(
                "Kartu Peserta BPJS Ketenagakerjaan (kepesertaan aktif min. 10 tahun).",
                "KTP Elektronik & Kartu Keluarga.",
                "Buku Tabungan Rekening Bank aktif.",
                "NPWP (jika ada)."
            )
        }

        val steps = listOf(
            "Langkah 1: Pastikan status kepesertaan Anda sudah dinonaktifkan oleh perusahaan (bisa dicek di aplikasi JMO).",
            "Langkah 2: Jika saldo < Rp 10 Juta, buka aplikasi JMO -> Masuk menu 'Jaminan Hari Tua' -> Pilih 'Klaim JHT' -> Ikuti verifikasi biometrik wajah -> Konfirmasi rekening -> Dana cair dalam hitungan menit/jam.",
            "Langkah 3: Jika saldo > Rp 10 Juta, buka lapakasik.bpjsketenagakerjaan.go.id -> Isi data diri & nomor KPJ -> Unggah foto dokumen KTP, Paklaring, KK, dan Buku Tabungan -> Dapatkan jadwal wawancara video call.",
            "Langkah 4: Ikuti sesi wawancara verifikasi online via WhatsApp Video Call dengan petugas BPJS sesuai jadwal yang ditentukan.",
            "Langkah 5: Setelah diverifikasi, dana saldo JHT + akumulasi hasil pengembangan investasi akan ditransfer utuh ke rekening tabungan dalam 1-3 hari kerja."
        )

        val tax = "Pajak Penghasilan (PPh 21 Final JHT PP 68/2009): Saldo JHT sampai dengan Rp 50.000.000 dikenakan tarif 0% (Bebas Pajak). Kelebihan saldo di atas Rp 50 Juta dikenakan PPh 21 Final tarif tunggal 5%."

        return JhtClaimSimulationResult(
            estimatedMonthlyContribution = monthlyContribution,
            claimCategory = claimCategory,
            claimPercentageAllowed = percentage,
            claimChannels = channels,
            requiredDocuments = docs,
            claimStepByStep = steps,
            taxNotes = tax
        )
    }

    /**
     * 5. Kalkulator & Tata Cara Klaim JP (Jaminan Pensiun - PP No. 45 Tahun 2015)
     */
    fun calculateJpBenefit(
        monthlySalary: Double,
        contributionYears: Double = 15.0
    ): JpClaimSimulationResult {
        val wageCap = 10_042_300.0 // Plafon batas upah JP BPJS Ketenagakerjaan
        val cappedSalary = minOf(monthlySalary, wageCap)
        val empContribution = cappedSalary * 0.01 // 1% Pekerja
        val compContribution = cappedSalary * 0.02 // 2% Pemberi Kerja
        val totalMonthly = cappedSalary * 0.03 // 3% Total

        val totalMonths = (contributionYears * 12).toInt()
        val isEligibleMonthly = totalMonths >= 180 // 15 Tahun = 180 Bulan (Pasal 17 PP 45/2015)

        // Formula MPHT (Manfaat Pensiun Hari Tua) = 1% x Masa Iur (Tahun) x Upah Tertimbang
        val minPension = 399_000.0
        val maxPension = 4_590_000.0
        val rawMonthlyMpht = 0.01 * contributionYears * cappedSalary
        val monthlyMpht = if (rawMonthlyMpht > 0) rawMonthlyMpht.coerceIn(minPension, maxPension) else 0.0

        // Akumulasi iuran & hasil pengembangan untuk skenario Lump Sum (< 15 tahun)
        val totalAccumulatedPrincipal = totalMonthly * totalMonths
        // Estimasi hasil pengembangan investasi rata-rata ~5.5% per tahun
        val estimatedYield = totalAccumulatedPrincipal * (0.055 * (contributionYears / 2.0))
        val lumpSumTotal = totalAccumulatedPrincipal + estimatedYield

        val jandaDuda = monthlyMpht * 0.50
        val anak = monthlyMpht * 0.50
        val orangTua = monthlyMpht * 0.20
        val cacat = monthlyMpht

        val benefitTypesList = listOf(
            JpBenefitTypeDetail(
                name = "Pensiun Hari Tua (MPHT)",
                recipient = "Peserta pensiun (Masa iur ≥ 15 tahun)",
                formulaDescription = "1% x Masa Iur x Upah Tertimbang (Diterima bulanan seumur hidup)",
                estimatedAmount = monthlyMpht,
                isMonthly = true,
                iconType = "pension"
            ),
            JpBenefitTypeDetail(
                name = "Pensiun Janda / Duda (MPJD)",
                recipient = "Istri / Suami sah peserta yang meninggal",
                formulaDescription = "50% dari Manfaat Pensiun Hari Tua (Bulanan seumur hidup / hingga menikah lagi)",
                estimatedAmount = jandaDuda,
                isMonthly = true,
                iconType = "family"
            ),
            JpBenefitTypeDetail(
                name = "Pensiun Anak (MPA)",
                recipient = "Maks. 2 anak sah s.d. usia 23 thn / belum menikah / belum bekerja",
                formulaDescription = "50% dari Manfaat Pensiun Hari Tua (Bulanan)",
                estimatedAmount = anak,
                isMonthly = true,
                iconType = "child"
            ),
            JpBenefitTypeDetail(
                name = "Pensiun Orang Tua (MPOT)",
                recipient = "Bapak / Ibu kandung peserta lajang yang meninggal",
                formulaDescription = "20% dari Manfaat Pensiun Hari Tua (Bulanan)",
                estimatedAmount = orangTua,
                isMonthly = true,
                iconType = "parents"
            ),
            JpBenefitTypeDetail(
                name = "Pensiun Cacat (MPC)",
                recipient = "Peserta yang mengalami cacat total tetap",
                formulaDescription = "Dihitung setara formula MPHT (Bulanan sampai sembuh/meninggal)",
                estimatedAmount = cacat,
                isMonthly = true,
                iconType = "disability"
            ),
            JpBenefitTypeDetail(
                name = "Lump Sum Sekaligus (Masa Iur < 15 Thn)",
                recipient = "Peserta mencapai usia pensiun namun masa iur < 180 bulan",
                formulaDescription = "Total Akumulasi Seluruh Iuran (3%) + Seluruh Hasil Pengembangan",
                estimatedAmount = lumpSumTotal,
                isMonthly = false,
                iconType = "lump_sum"
            )
        )

        val retirementSchedule = listOf(
            "Tahun 2015 – 2018" to 56,
            "Tahun 2019 – 2021" to 57,
            "Tahun 2022 – 2024" to 58,
            "Tahun 2025 – 2027 (Saat Ini)" to 59,
            "Tahun 2028 – 2030" to 60,
            "Tahun 2031 – 2033" to 61,
            "Tahun 2034 – 2036" to 62,
            "Tahun 2037 – 2039" to 63,
            "Tahun 2040 – 2042" to 64,
            "Tahun 2043 dst. (Maksimal)" to 65
        )

        val docs = listOf(
            "Formulir 7 (JP) - Permohonan Klaim Manfaat Jaminan Pensiun BPJS Ketenagakerjaan.",
            "Kartu Peserta BPJS Ketenagakerjaan (KPJ) asli atau digital di JMO.",
            "KTP Elektronik (e-KTP) asli penerima manfaat.",
            "Kartu Keluarga (KK) yang masih berlaku.",
            "Buku Rekening Tabungan Bank aktif atas nama penerima manfaat.",
            "Surat Penetapan Pensiun / Surat Keterangan Berhenti Kerja dari Perusahaan.",
            "Surat Nikah / Akta Perkawinan (khusus klaim Manfaat Pensiun Janda/Duda).",
            "Akta Kelahiran Anak (khusus klaim Manfaat Pensiun Anak).",
            "Akta Kematian dari Disdukcapil (jika peserta meninggal dunia).",
            "Surat Keterangan Dokter Pemeriksa Uji Kelayakan Cacat (khusus klaim Manfaat Pensiun Cacat Total Tetap)."
        )

        val steps = listOf(
            "Langkah 1 (Cek Kelayakan & Usia): Pastikan usia Anda telah mencapai usia pensiun yang berlaku (59 tahun pada periode 2025-2027) atau mengalami pemutusan hubungan kerja karena pensiun.",
            "Langkah 2 (Pengajuan Online / Offline): Ajukan melalui aplikasi JMO / Lapakasik atau datang langsung ke Kantor Cabang BPJS Ketenagakerjaan terdekat.",
            "Langkah 3 (Verifikasi Masa Iur): Petugas BPJS memverifikasi total bulan iuran:\n  • Jika masa iur ≥ 15 Tahun (180 Bulan): Ditetapkan sebagai penerima Manfaat Pensiun Bulanan Berkala Seumur Hidup.\n  • Jika masa iur < 15 Tahun (< 180 Bulan): Ditetapkan sebagai penerima Manfaat Sekaligus (Lump Sum tabungan iuran + hasil pengembangan).",
            "Langkah 4 (Konfirmasi Rekening Bank): Rekening tabungan didaftarkan untuk auto-transfer bulanan berkala atau transfer sekaligus.",
            "Langkah 5 (Pencairan & Konfirmasi Berkala): Pembayaran berkala ditransfer otomatis setiap bulan ke rekening bank penerima manfaat."
        )

        val legal = listOf(
            "PP No. 45 Tahun 2015 Pasal 15: Usia pensiun pertama kali ditetapkan 56 tahun dan mulai 1 Januari 2019 bertambah 1 tahun setiap 3 tahun hingga mencapai 65 tahun pada 2043.",
            "PP No. 45 Tahun 2015 Pasal 17: Masa iur untuk mendapatkan Manfaat Pensiun Hari Tua berkala bulanan adalah paling sedikit 15 tahun (180 bulan).",
            "Batas Upah Tertinggi (Capping) disesuaikan setiap tahun mengikuti faktor inflasi dan pertumbuhan PDB nasional (Keputusan Direksi BPJS Ketenagakerjaan)."
        )

        return JpClaimSimulationResult(
            reportedSalary = monthlySalary,
            wageCap = wageCap,
            cappedSalary = cappedSalary,
            contributionEmployee = empContribution,
            contributionEmployer = compContribution,
            totalMonthlyContribution = totalMonthly,
            contributionYears = contributionYears,
            contributionMonths = totalMonths,
            isEligibleForMonthlyPension = isEligibleMonthly,
            currentRetirementAge = 59,
            monthlyPensionEstimate = monthlyMpht,
            minimumMonthlyPension = minPension,
            maximumMonthlyPension = maxPension,
            lumpSumEstimate = lumpSumTotal,
            totalContributionsAccumulated = totalAccumulatedPrincipal,
            estimatedInvestmentYield = estimatedYield,
            jandaDudaMonthlyBenefit = jandaDuda,
            anakMonthlyBenefit = anak,
            orangTuaMonthlyBenefit = orangTua,
            cacatTotalMonthlyBenefit = cacat,
            benefitTypes = benefitTypesList,
            retirementAgeSchedule = retirementSchedule,
            requiredDocuments = docs,
            claimStepByStep = steps,
            legalNotes = legal
        )
    }

    /**
     * Kategori Hak Cuti & Izin Ketenagakerjaan Indonesia.
     * Mengacu pada UU No. 13/2003 jo. UU No. 6/2023, UU KIA No. 4/2024, PP 35/2021, & SE Menaker.
     */
    enum class StatutoryLeaveCategory(val label: String, val isNonQuota: Boolean) {
        POTONG_KUOTA("Potong Jatah Cuti (12 Hari)", false),
        DUKA_CITA("Duka Cita & Kemalangan", true),
        PERISTIWA_KELUARGA("Acara & Hajatan Keluarga", true),
        SAKIT_KESEHATAN("Sakit & Kesehatan Medis", true),
        REPRODUKSI_BERSALIN("Bersalin & UU KIA", true),
        IBADAH_KEAGAMAAN("Ibadah Keagamaan Wajib", true),
        TUGAS_NEGARA("Tugas Negara & Serikat", true)
    }

    data class StatutoryLeaveItem(
        val key: String,
        val displayName: String,
        val category: StatutoryLeaveCategory,
        val defaultDays: Int,
        val isQuotaDeductible: Boolean, // false = Non-Potong Kuota Cuti Tahunan
        val legalReference: String,
        val wageProtection: String,
        val description: String,
        val notes: String = ""
    )

    /**
     * Daftar Lengkap Hak Cuti & Izin Berbayar Sesuai Regulasi Ketenagakerjaan Indonesia.
     */
    fun getAllStatutoryLeaves(): List<StatutoryLeaveItem> = listOf(
        // KATEGORI 1: POTONG KUOTA TAHUNAN (12 HARI)
        StatutoryLeaveItem(
            key = "CUTI_BERSAMA",
            displayName = "Cuti Bersama Pemerintah (SKB 3 Menteri)",
            category = StatutoryLeaveCategory.POTONG_KUOTA,
            defaultDays = 1,
            isQuotaDeductible = true,
            legalReference = "SKB 3 Menteri & Surat Edaran Menaker",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Libur cuti bersama nasional ketetapan pemerintah. Bagi pekerja sektor swasta, pelaksanaan bersifat fakultatif dan memotong hak cuti tahunan (12 hari).",
            notes = "Jika pekerja tetap bekerja saat cuti bersama, cuti tahunan tidak dipotong dan upah dibayar normal."
        ),
        StatutoryLeaveItem(
            key = "TAHUNAN",
            displayName = "Cuti Tahunan Pribadi Karyawan",
            category = StatutoryLeaveCategory.POTONG_KUOTA,
            defaultDays = 1,
            isQuotaDeductible = true,
            legalReference = "UU No. 13/2003 Ps. 79 jo. UU No. 6/2023",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Hak istirahat tahunan sekurang-kurangnya 12 hari kerja setelah pekerja/buruh mempunyai masa kerja selama 12 bulan terus-menerus.",
            notes = "Dapat diatur bersama antara pengusaha dan pekerja."
        ),

        // KATEGORI 2: BERSALIN, REPRODUKSI & UU KIA NO. 4/2024 (NON-POTONG KUOTA)
        StatutoryLeaveItem(
            key = "MELAHIRKAN",
            displayName = "Cuti Melahirkan (Ibu Pekerja)",
            category = StatutoryLeaveCategory.REPRODUKSI_BERSALIN,
            defaultDays = 90, // 3 bulan = 90 hari
            isQuotaDeductible = false,
            legalReference = "UU KIA No. 4/2024 Ps. 4 ayat (3) & UU 13/2003 Ps. 82",
            wageProtection = "Bulan 1-3: Upah 100%, Bulan 4-6: Upah 75%",
            description = "Ibu pekerja berhak mendapatkan cuti melahirkan minimal 3 bulan dan dapat diperpanjang hingga 6 bulan dengan rekomendasi dokter jika terjadi kondisi khusus atau komplikasi pascamelahirkan.",
            notes = "TIDAK memotong jatah cuti tahunan 12 hari. Dilindungi dari PHK."
        ),
        StatutoryLeaveItem(
            key = "KEGUGURAN",
            displayName = "Cuti Keguguran Kandungan",
            category = StatutoryLeaveCategory.REPRODUKSI_BERSALIN,
            defaultDays = 45, // 1.5 bulan = 45 hari
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Ps. 82 ayat (2) & UU KIA 4/2024",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Pekerja perempuan yang mengalami keguguran kandungan berhak istirahat 1,5 bulan (45 hari) atau sesuai surat keterangan dokter spesialis kandungan atau bidan.",
            notes = "TIDAK memotong cuti tahunan dan upah wajib dibayar penuh 100%."
        ),
        StatutoryLeaveItem(
            key = "CUTI_HAID",
            displayName = "Cuti Haid / Menstruasi",
            category = StatutoryLeaveCategory.REPRODUKSI_BERSALIN,
            defaultDays = 2,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Pasal 81",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Pekerja perempuan yang dalam masa haid merasakan sakit dan memberitahukan kepada pengusaha tidak wajib bekerja pada hari pertama dan kedua waktu haid.",
            notes = "TIDAK memotong cuti tahunan dan upah tetap wajib dibayarkan penuh."
        ),
        StatutoryLeaveItem(
            key = "PENDAMPINGAN_MELAHIRKAN",
            displayName = "Suami Dampingi Istri Melahirkan",
            category = StatutoryLeaveCategory.REPRODUKSI_BERSALIN,
            defaultDays = 2,
            isQuotaDeductible = false,
            legalReference = "UU KIA No. 4/2024 Ps. 6 & UU 13/2003 Ps. 93 ayat (4) huruf e",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Suami berhak atas cuti pendampingan paling lama 2 hari saat istri melahirkan, dan dapat diberikan tambahan waktu paling lama 3 hari atau sesuai kesepakatan.",
            notes = "TIDAK memotong jatah cuti tahunan suami."
        ),
        StatutoryLeaveItem(
            key = "PENDAMPINGAN_KEGUGURAN",
            displayName = "Suami Dampingi Istri Keguguran",
            category = StatutoryLeaveCategory.REPRODUKSI_BERSALIN,
            defaultDays = 2,
            isQuotaDeductible = false,
            legalReference = "UU KIA No. 4/2024 Ps. 6 ayat (2) & UU 13/2003 Ps. 93",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Suami berhak mendapatkan cuti pendampingan selama 2 hari dalam hal istri mengalami keguguran kandungan.",
            notes = "TIDAK memotong cuti tahunan."
        ),

        // KATEGORI 3: PERISTIWA PENTING KELUARGA & DUKA CITA (NON-POTONG KUOTA - PASAL 93 AYAT 4 UU 13/2003)
        StatutoryLeaveItem(
            key = "MENIKAH_SENDIRI",
            displayName = "Pekerja / Karyawan Menikah Sendiri",
            category = StatutoryLeaveCategory.PERISTIWA_KELUARGA,
            defaultDays = 3,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Pasal 93 ayat (4) huruf a",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Pekerja yang melangsungkan pernikahan sendiri berhak atas izin tidak masuk kerja selama 3 hari kerja dan upah tetap dibayar penuh.",
            notes = "TIDAK mengurangi kuota cuti tahunan 12 hari."
        ),
        StatutoryLeaveItem(
            key = "MENIKAHKAN_ANAK",
            displayName = "Menikahkan Anak Kandung",
            category = StatutoryLeaveCategory.PERISTIWA_KELUARGA,
            defaultDays = 2,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Pasal 93 ayat (4) huruf b",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Pekerja yang menikahkan anaknya berhak izin tidak masuk kerja selama 2 hari kerja dengan upah dibayar penuh.",
            notes = "TIDAK memotong cuti tahunan."
        ),
        StatutoryLeaveItem(
            key = "KHITANAN_ANAK",
            displayName = "Mengkhitankan / Sunatan Anak",
            category = StatutoryLeaveCategory.PERISTIWA_KELUARGA,
            defaultDays = 2,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Pasal 93 ayat (4) huruf c",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Pekerja yang mengkhitankan anaknya berhak izin selama 2 hari kerja dan upah tetap dibayarkan penuh.",
            notes = "TIDAK memotong kuota cuti tahunan."
        ),
        StatutoryLeaveItem(
            key = "BAPTIS_ANAK",
            displayName = "Membaptiskan Anak",
            category = StatutoryLeaveCategory.PERISTIWA_KELUARGA,
            defaultDays = 2,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Pasal 93 ayat (4) huruf d",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Pekerja yang membaptiskan anaknya berhak izin selama 2 hari kerja dan upah tetap dibayarkan penuh.",
            notes = "TIDAK memotong kuota cuti tahunan."
        ),
        StatutoryLeaveItem(
            key = "PENDAMPINGAN_MELAHIRKAN_KELUARGA",
            displayName = "Istri Melahirkan (Pendampingan Suami)",
            category = StatutoryLeaveCategory.PERISTIWA_KELUARGA,
            defaultDays = 2,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Ps. 93 ayat (4) huruf e & UU KIA 4/2024",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Suami berhak mendampingi istri melahirkan selama 2 hari dan dapat diperpanjang s.d. 3 hari atau sesuai kesepakatan.",
            notes = "TIDAK memotong kuota cuti tahunan."
        ),
        StatutoryLeaveItem(
            key = "PENDAMPINGAN_KEGUGURAN_KELUARGA",
            displayName = "Istri Keguguran Kandungan (Pendampingan)",
            category = StatutoryLeaveCategory.PERISTIWA_KELUARGA,
            defaultDays = 2,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Ps. 93 ayat (4) huruf e & UU KIA 4/2024",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Suami berhak mendampingi istri yang mengalami keguguran selama 2 hari dengan upah tetap dibayar penuh.",
            notes = "TIDAK memotong cuti tahunan."
        ),
        StatutoryLeaveItem(
            key = "DUKA_KELUARGA_INTI",
            displayName = "Duka Cita: Suami/Istri, Ortu/Mertua, Anak/Menantu Meninggal",
            category = StatutoryLeaveCategory.DUKA_CITA,
            defaultDays = 2,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Pasal 93 ayat (4) huruf f",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Suami/istri, orang tua/mertua, atau anak/menantu meninggal dunia: pekerja berhak izin selama 2 hari kerja dengan upah tetap dibayar penuh 100%.",
            notes = "TIDAK memotong jatah cuti tahunan 12 hari."
        ),
        StatutoryLeaveItem(
            key = "DUKA_SERUMAH",
            displayName = "Duka Cita: Anggota Keluarga Serumah Meninggal",
            category = StatutoryLeaveCategory.DUKA_CITA,
            defaultDays = 1,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Pasal 93 ayat (4) huruf g",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Anggota keluarga dalam satu rumah (misalnya kakek/nenek/saudara/ipar serumah) meninggal dunia: pekerja berhak izin selama 1 hari kerja berbayar penuh.",
            notes = "TIDAK memotong jatah cuti tahunan 12 hari."
        ),
        StatutoryLeaveItem(
            key = "DUKA_SAUDARA_KANDUNG",
            displayName = "Duka Cita: Saudara Kandung Meninggal",
            category = StatutoryLeaveCategory.DUKA_CITA,
            defaultDays = 1,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 jo. PP / PKB Perusahaan",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Saudara kandung meninggal dunia. Jika serumah berhak 1 hari sesuai UU 13/2003 Ps. 93 (4) g; jika tidak serumah diberikan izin sesuai PKB/Peraturan Perusahaan.",
            notes = "TIDAK memotong jatah cuti tahunan."
        ),

        // KATEGORI 4: SAKIT, RAWAT INAP & PEMULIHAN MEDIS (PASAL 93 AYAT 2 HURUF A & AYAT 3 UU 13/2003)
        StatutoryLeaveItem(
            key = "SAKIT_DOKTER",
            displayName = "Istirahat Sakit (Surat Keterangan Dokter)",
            category = StatutoryLeaveCategory.SAKIT_KESEHATAN,
            defaultDays = 1,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Pasal 93 ayat (2) huruf a",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Pekerja yang sakit sesuai surat keterangan dokter resmi tidak masuk kerja, dan pengusaha wajib membayar upah 100% penuh.",
            notes = "TIDAK memotong kuota cuti tahunan 12 hari."
        ),
        StatutoryLeaveItem(
            key = "SAKIT_RAWAT_INAP",
            displayName = "Rawat Inap RS / Tindakan Medis Operasi",
            category = StatutoryLeaveCategory.SAKIT_KESEHATAN,
            defaultDays = 3,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Pasal 93 ayat (2) huruf a",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Pekerja yang menjalani rawat inap (opname) di rumah sakit dengan surat opname berhak izin sakit dengan upah dibayar 100% penuh.",
            notes = "TIDAK memotong cuti tahunan."
        ),
        StatutoryLeaveItem(
            key = "SAKIT_BERKEPANJANGAN",
            displayName = "Sakit Berkepanjangan (> 14 Hari s.d. 12 Bulan)",
            category = StatutoryLeaveCategory.SAKIT_KESEHATAN,
            defaultDays = 30,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Pasal 93 ayat (3) & PP 35/2021",
            wageProtection = "4 bln ke-1: 100%, 4 bln ke-2: 75%, 4 bln ke-3: 50%, 4 bln ke-4: 25%",
            description = "Pekerja sakit berkepanjangan dilindungi dari PHK selama 12 bulan dengan jaminan pembayaran upah berjenjang: 4 bulan ke-1 100%, 4 bulan ke-2 75%, 4 bulan ke-3 50%, dan 4 bulan ke-4 25%.",
            notes = "TIDAK memotong cuti tahunan. Dilindungi dari PHK sepihak."
        ),
        StatutoryLeaveItem(
            key = "CUTI_HAID_MEDIS",
            displayName = "Istirahat Sakit Haid / Menstruasi (Hari 1-2)",
            category = StatutoryLeaveCategory.SAKIT_KESEHATAN,
            defaultDays = 2,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Pasal 81",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Pekerja perempuan yang dalam masa haid merasakan sakit dan memberitahukan kepada pengusaha tidak wajib bekerja pada hari pertama dan kedua waktu haid.",
            notes = "TIDAK memotong cuti tahunan dan upah tetap wajib dibayarkan penuh."
        ),

        // KATEGORI 5: IBADAH KEAGAMAAN WAJIB (PASAL 93 AYAT 2 HURUF E UU 13/2003)
        StatutoryLeaveItem(
            key = "IBADAH_HAJI_UMRAH",
            displayName = "Ibadah Keagamaan Wajib (Haji / Umrah Pertama)",
            category = StatutoryLeaveCategory.IBADAH_KEAGAMAAN,
            defaultDays = 40,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Pasal 93 ayat (2) huruf e",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Pekerja menjalankan kewajiban ibadah keagamaan yang diperintahkan agamanya (seperti ibadah Haji yang pertama kali) sesuai ketetapan jadwal resmi pemerintah.",
            notes = "TIDAK memotong cuti tahunan dan upah tetap wajib dibayar penuh."
        ),

        // KATEGORI 6: KEWAJIBAN & TUGAS NEGARA / SERIKAT (PASAL 93 AYAT 2 HURUF B, D, F UU 13/2003)
        StatutoryLeaveItem(
            key = "TUGAS_NEGARA_SERIKAT",
            displayName = "Tugas Negara, Pemilu, atau Serikat Pekerja",
            category = StatutoryLeaveCategory.TUGAS_NEGARA,
            defaultDays = 1,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Pasal 93 ayat (2) huruf b & d",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Pekerja melaksanakan kewajiban terhadap negara (seperti hak pilih Pemilu, saksi pengadilan, panggilan dinas) atau menjalankan tugas serikat pekerja yang disepakati.",
            notes = "TIDAK memotong cuti tahunan."
        ),
        StatutoryLeaveItem(
            key = "UJIAN_PENDIDIKAN",
            displayName = "Menempuh Ujian Resmi Pendidikan / Kedinasan",
            category = StatutoryLeaveCategory.TUGAS_NEGARA,
            defaultDays = 1,
            isQuotaDeductible = false,
            legalReference = "UU No. 13/2003 Pasal 93 ayat (2) huruf f",
            wageProtection = "Upah Dibayar Penuh 100%",
            description = "Pekerja menempuh ujian resmi dari lembaga pendidikan/kedinasan atas izin pengusaha.",
            notes = "TIDAK memotong cuti tahunan."
        )
    )

    /**
     * Cari detail hak cuti sesuai key atau variasi alias.
     */
    fun findStatutoryLeave(key: String): StatutoryLeaveItem? {
        val normalized = key.trim().uppercase()
        return getAllStatutoryLeaves().firstOrNull { it.key.equals(normalized, ignoreCase = true) }
            ?: when {
                normalized in listOf("ANNUAL", "TAHUNAN", "CUTI_TAHUNAN") -> getAllStatutoryLeaves().firstOrNull { it.key == "TAHUNAN" }
                normalized in listOf("CUTI_BERSAMA", "BERSAMA") -> getAllStatutoryLeaves().firstOrNull { it.key == "CUTI_BERSAMA" }
                normalized in listOf("MATERNITY", "MELAHIRKAN") -> getAllStatutoryLeaves().firstOrNull { it.key == "MELAHIRKAN" }
                normalized in listOf("PATERNITY", "PENDAMPINGAN", "PENDAMPINGAN_MELAHIRKAN") -> getAllStatutoryLeaves().firstOrNull { it.key == "PENDAMPINGAN_MELAHIRKAN" }
                normalized in listOf("PENDAMPINGAN_KEGUGURAN") -> getAllStatutoryLeaves().firstOrNull { it.key == "PENDAMPINGAN_KEGUGURAN" }
                normalized in listOf("SICK", "SAKIT", "SAKIT_DOKTER", "SURAT_DOKTER", "DOKTER", "MEDIS") -> getAllStatutoryLeaves().firstOrNull { it.key == "SAKIT_DOKTER" }
                normalized in listOf("RAWAT_INAP", "OPNAME", "SAKIT_RAWAT_INAP", "RAWAT") -> getAllStatutoryLeaves().firstOrNull { it.key == "SAKIT_RAWAT_INAP" }
                normalized in listOf("SAKIT_BERKEPANJANGAN", "LONG_TERM_SICK") -> getAllStatutoryLeaves().firstOrNull { it.key == "SAKIT_BERKEPANJANGAN" }
                normalized in listOf("HAID", "CUTI_HAID", "CUTI_HAID_MEDIS", "MENSTRUASI") -> getAllStatutoryLeaves().firstOrNull { it.key == "CUTI_HAID_MEDIS" }
                normalized in listOf("MARRIAGE", "MENIKAH", "MENIKAH_SENDIRI", "NIKAH") -> getAllStatutoryLeaves().firstOrNull { it.key == "MENIKAH_SENDIRI" }
                normalized in listOf("MENIKAHKAN_ANAK", "NIKAH_ANAK") -> getAllStatutoryLeaves().firstOrNull { it.key == "MENIKAHKAN_ANAK" }
                normalized in listOf("KHITANAN", "KHITANAN_ANAK", "SUNATAN") -> getAllStatutoryLeaves().firstOrNull { it.key == "KHITANAN_ANAK" }
                normalized in listOf("BAPTIS", "BAPTIS_ANAK") -> getAllStatutoryLeaves().firstOrNull { it.key == "BAPTIS_ANAK" }
                normalized in listOf("BEREAVEMENT", "DUKA", "DUKA_CITA", "DUKA_INTI", "DUKA_KELUARGA_INTI", "KEMATIAN_INTI", "KEMATIAN_KELUARGA") -> getAllStatutoryLeaves().firstOrNull { it.key == "DUKA_KELUARGA_INTI" }
                normalized in listOf("DUKA_SERUMAH", "KEMATIAN_SERUMAH", "DUKA_KELUARGA_SERUMAH") -> getAllStatutoryLeaves().firstOrNull { it.key == "DUKA_SERUMAH" }
                normalized in listOf("DUKA_SAUDARA", "DUKA_SAUDARA_KANDUNG", "KEMATIAN_SAUDARA") -> getAllStatutoryLeaves().firstOrNull { it.key == "DUKA_SAUDARA_KANDUNG" }
                normalized in listOf("ACARA_KELUARGA", "KELUARGA", "IZIN_KELUARGA", "IZIN_KHUSUS") -> getAllStatutoryLeaves().firstOrNull { it.key == "MENIKAH_SENDIRI" }
                normalized in listOf("IBADAH", "IBADAH_HAJI_UMRAH", "HAJI", "UMRAH", "IBADAH_AGAMA", "HAJI_PERTAMA", "IBADAH_KEAGAMAAN") -> getAllStatutoryLeaves().firstOrNull { it.key == "IBADAH_HAJI_UMRAH" }
                normalized in listOf("TUGAS_NEGARA", "TUGAS_NEGARA_SERIKAT", "SERIKAT", "SERIKAT_PEKERJA", "KEWAJIBAN_NEGARA", "PEMILU", "PANGGILAN_DINAS") -> getAllStatutoryLeaves().firstOrNull { it.key == "TUGAS_NEGARA_SERIKAT" }
                normalized in listOf("UJIAN_PENDIDIKAN", "UJIAN", "UJIAN_DINAS", "PENDIDIKAN") -> getAllStatutoryLeaves().firstOrNull { it.key == "UJIAN_PENDIDIKAN" }
                else -> null
            }
    }
}


