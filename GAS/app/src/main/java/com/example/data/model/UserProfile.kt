package com.aiagentid7.payrollemployee.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Entitas Profil Karyawan & 7 Komponen Gaji Lengkap:
 * 1. Gaji Pokok
 * 2. Tunjangan Tetap
 * 3. Tunjangan Tidak Tetap
 * 4. Makan
 * 5. Transport
 * 6. Pulsa
 * 7. Remote Area
 *
 * Mengacu pada UU No. 13/2003, UU No. 6/2023 (UU Cipta Kerja), & PP No. 51/2023.
 */
@Entity(tableName = "user_profile")
data class UserProfile(
    @PrimaryKey val id: Int = 1,
    val fullName: String = "",
    val nik: String = "",
    val npwp: String = "",
    val hasNpwp: Boolean = true,
    val ptkpStatus: String = "TK/0", // TK/0, TK/1, TK/2, TK/3, K/0, K/1, K/2, K/3
    val terCategoryOverride: String = "", // Kosongkan untuk auto (A/B/C sesuai PP 58/2023)
    val contractType: String = "PKWTT", // PKWTT (Tetap) atau PKWT (Kontrak)
    val joinDate: String = "", // Format YYYY-MM-DD
    val contractEndDate: String? = null, // Khusus PKWT
    
    // Komponen Gaji Lengkap
    val basicSalary: Double = 0.0, // 1. Gaji Pokok
    val fixedAllowance: Double = 0.0, // 2. Tunjangan Tetap
    val variableAllowance: Double = 0.0, // 3. Tunjangan Tidak Tetap
    val mealAllowance: Double = 0.0, // 4. Makan (Nominal Flat Bulanan)
    val transportAllowance: Double = 0.0, // 5. Transport (Nominal Flat Bulanan)
    val mealAllowancePerDay: Double = 0.0, // Uang Makan per Hari Hadir (PP 36/2021)
    val transportAllowancePerDay: Double = 0.0, // Uang Transport per Hari Hadir (PP 36/2021)
    val allowanceCalculationMode: String = "FLAT_MONTHLY", // "FLAT_MONTHLY" atau "PER_ATTENDANCE"
    val phoneAllowance: Double = 0.0, // 6. Pulsa
    val remoteAreaAllowance: Double = 0.0, // 7. Remote Area
    val ritasePay: Double = 0.0, // 8. Ritase (Trip/Pengantaran)
    val hmPay: Double = 0.0, // 9. HM / Hour Meter (Jam Operasi Alat Berat)
    val incentivePay: Double = 0.0, // 10. Insentif Kinerja/Target
    
    // Opsi Potongan BPJS & Pajak (Optional / Toggleable)
    val isBpjsKesEnabled: Boolean = true, // Potongan BPJS Kesehatan Karyawan (1%)
    val isBpjsJhtEnabled: Boolean = true, // Potongan BPJS Ketenagakerjaan JHT Karyawan (2%)
    val isBpjsJpEnabled: Boolean = true, // Potongan BPJS Ketenagakerjaan JP Karyawan (1%)
    val isPph21Enabled: Boolean = true, // Potongan Pajak PPh 21 Karyawan
    
    val regionalUmpUmk: Double = 5_067_381.0, // UMP DKI Jakarta acuan default PP 51/2023
    val companyName: String = "",
    val jobTitle: String = "",
    
    // Pengaturan Jam Kerja & Shift
    val workScheduleScheme: String = "5_DAYS", // "5_DAYS" (8 jam/hari) atau "6_DAYS" (7 jam/hari)
    val defaultShiftType: String = "REGULAR", // "REGULAR", "SHIFT_PAGI", "SHIFT_SORE", "SHIFT_MALAM", "LONG_SHIFT"
    val shiftAllowance: Double = 0.0 // Tunjangan shift / insentif kehadiran per shift (Rp)
) {
    /**
     * Total Upah Tetap = Gaji Pokok + Tunjangan Tetap + Remote Area (PP No. 35/2021 Pasal 32)
     * Digunakan sebagai dasar pengali 1/173 upah lembur, kalkulasi pesangon, THR, dan BPJS.
     */
    val totalFixedSalary: Double
        get() = basicSalary + fixedAllowance + remoteAreaAllowance

    /**
     * Total Semua Tunjangan & Komponen Tambahan
     */
    val totalAllowances: Double
        get() {
            val effectiveMeal = if (allowanceCalculationMode == "PER_ATTENDANCE") 0.0 else mealAllowance
            val effectiveTransport = if (allowanceCalculationMode == "PER_ATTENDANCE") 0.0 else transportAllowance
            return fixedAllowance + variableAllowance + effectiveMeal + effectiveTransport + phoneAllowance + remoteAreaAllowance + ritasePay + hmPay + incentivePay
        }

    /**
     * Total Upah Bulanan Reguler (Sebelum Lembur & Bonus)
     */
    val totalRegularSalary: Double
        get() = basicSalary + totalAllowances

    /**
     * Pengecekan apakah Total Upah Tetap memenuhi standar UMP/UMK Daerah (PP No. 51/2023)
     */
    val isBelowUmp: Boolean
        get() = totalFixedSalary > 0 && totalFixedSalary < regionalUmpUmk

    val umpDeficit: Double
        get() = if (isBelowUmp) regionalUmpUmk - totalFixedSalary else 0.0
}
