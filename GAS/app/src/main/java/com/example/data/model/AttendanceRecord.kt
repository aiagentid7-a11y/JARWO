package com.aiagentid7.payrollemployee.data.model

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Entitas Rekam Absensi & Presensi Harian Karyawan (Attendance Record)
 *
 * sourceType/sourceId membedakan absensi manual dari absensi yang dibuat
 * otomatis oleh sinkronisasi cuti/lembur. Ini mencegah penghapusan sumber
 * menghapus data absensi manual dan mencegah konflik data diam-diam.
 */
@Entity(
    tableName = "attendance_records",
    indices = [Index(value = ["date"], unique = true)]
)
data class AttendanceRecord(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: String, // Format: YYYY-MM-DD
    val status: String = "HADIR", // HADIR, IZIN, SAKIT, CUTI, ALPHA, LIBUR
    val checkInTime: String = "", // Format: HH:mm
    val checkOutTime: String = "", // Format: HH:mm
    val workedHours: Double = 0.0,
    val isMealEligible: Boolean = true,
    val isTransportEligible: Boolean = true,
    val notes: String = "",
    val photoProofPath: String? = null,
    val sourceType: String = "MANUAL", // MANUAL, LEAVE_SYNC, OVERTIME_SYNC
    val sourceId: Long? = null,
    val createdAt: Long = System.currentTimeMillis()
)
