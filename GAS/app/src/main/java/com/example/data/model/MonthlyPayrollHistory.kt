package com.example.data.model

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Riwayat Penggajian Bulanan & Komponen Perhitungan Pajak/BPJS
 * Dengan 7 Komponen Gaji:
 * 1. Gaji Pokok
 * 2. Tunjangan Tetap
 * 3. Tunjangan Tidak Tetap
 * 4. Makan
 * 5. Transport
 * 6. Pulsa
 * 7. Remote Area
 */
@Entity(
    tableName = "monthly_payroll_history",
    indices = [Index(value = ["year", "month"], unique = true)]
)
data class MonthlyPayrollHistory(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val month: Int, // 1 s.d. 12
    val year: Int,
    val periodLabel: String, // e.g. "Agustus 2026"
    
    // Komponen Penghasilan
    val basicSalary: Double, // 1. Gaji Pokok
    val fixedAllowance: Double, // 2. Tunjangan Tetap
    val variableAllowance: Double = 0.0, // 3. Tunjangan Tidak Tetap
    val mealAllowance: Double = 0.0, // 4. Makan
    val transportAllowance: Double = 0.0, // 5. Transport
    val phoneAllowance: Double = 0.0, // 6. Pulsa
    val remoteAreaAllowance: Double = 0.0, // 7. Remote Area
    val ritasePay: Double = 0.0, // 8. Ritase
    val hmPay: Double = 0.0, // 9. HM (Hour Meter)
    val incentivePay: Double = 0.0, // 10. Insentif
    
    val overtimePay: Double = 0.0,
    val bonusOrThr: Double = 0.0,
    val grossSalary: Double,
    
    // Status Opsi BPJS & PPh 21 yang Dipilih
    val isBpjsKesEnabled: Boolean = true,
    val isBpjsJhtEnabled: Boolean = true,
    val isBpjsJpEnabled: Boolean = true,
    val isPph21Enabled: Boolean = true,
    
    // BPJS Tanggungan Karyawan (Pengurang Gaji)
    val bpjsKesEmployee: Double = 0.0, // 1% (Cap Rp 12.000.000)
    val bpjsJhtEmployee: Double = 0.0, // 2%
    val bpjsJpEmployee: Double = 0.0, // 1% (Cap Dinamis)
    val totalBpjsEmployee: Double = 0.0,

    // BPJS Tanggungan Perusahaan (Tunjangan / Beban Pemberi Kerja)
    val bpjsKesCompany: Double = 0.0, // 4%
    val bpjsJhtCompany: Double = 0.0, // 3.7%
    val bpjsJpCompany: Double = 0.0, // 2%
    val bpjsJkkCompany: Double = 0.0, // 0.24% - 1.74%
    val bpjsJkmCompany: Double = 0.0, // 0.30%
    val totalBpjsCompany: Double = 0.0,

    // Pajak PPh 21
    val terCategory: String = "A", // A, B, atau C (atau Pasal 17 untuk Masa Desember)
    val terEffectiveRate: Double = 0.0, // Persentase TER (e.g., 0.015 untuk 1.5%)
    val pph21Amount: Double = 0.0,
    val isDecemberRecalculation: Boolean = false,
    val annualNetTaxableIncome: Double = 0.0, // Khusus Des
    val annualPtkpAmount: Double = 0.0,
    val annualPkpAmount: Double = 0.0,
    val annualPph21Calculated: Double = 0.0,
    val pph21PaidJanNov: Double = 0.0,

    // Potongan Kustom (Pasal 93 UU Ketenagakerjaan)
    val customDeductionKasbon: Double = 0.0,
    val customDeductionLate: Double = 0.0,
    val customDeductionOther: Double = 0.0,
    val totalCustomDeductions: Double = 0.0,

    // Take Home Pay (Gaji Bersih Diterima)
    val netTakeHomePay: Double,

    val notes: String = "",
    val createdAt: Long = System.currentTimeMillis()
)
