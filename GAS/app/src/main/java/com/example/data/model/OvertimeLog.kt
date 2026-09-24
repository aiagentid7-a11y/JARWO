package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Log Lembur Harian Karyawan
 * Mengacu pada Kepmenaker No. 102/MEN/VI/2004 & PP No. 35 Tahun 2021.
 */
@Entity(tableName = "overtime_logs")
data class OvertimeLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: String, // YYYY-MM-DD
    val dayType: String, // WORKDAY, HOLIDAY_6_DAYS, HOLIDAY_5_DAYS
    val hours: Double,
    val hourlyRate: Double, // 1/173 * Upah Tetap
    val overtimeMultiplierHours: Double, // Hasil konversi jam (misal 1 jam pertama x1.5 + jam ke-2 x2 = 3.5 jam)
    val totalAmount: Double, // Total Rupiah Lembur
    val taskDescription: String = "",
    val shiftType: String = "REGULAR", // REGULAR, SHIFT_PAGI, SHIFT_SORE, SHIFT_MALAM, LONG_SHIFT
    val startTime: String = "", // e.g. "08:00"
    val endTime: String = "", // e.g. "20:00"
    val ritaseCount: Int = 0, // Jumlah Ritase / Rit Hauling (Sektor Tambang & Logistik)
    val ritaseRate: Double = 0.0, // Tarif Premi per Ritase (Opsional)
    val hmStart: Double = 0.0, // HM Awal Alat Berat / Unit (Hour Meter Start)
    val hmEnd: Double = 0.0, // HM Akhir Alat Berat / Unit (Hour Meter End)
    val hmTotal: Double = 0.0, // Total HM Operasional (hmEnd - hmStart)
    val unitCode: String = "", // No. Lambung / Unit / Plat Kendaraan (mis. DT-04, EX-200)
    val materialType: String = "", // Jenis Muatan / Rute (mis. Overburden, Coal, Topsoil)
    val isApproved: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)
