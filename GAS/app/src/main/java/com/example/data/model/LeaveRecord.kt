package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Catatan Cuti & Hak Karyawan
 * Mengacu pada UU No. 13/2003, UU No. 6/2023 Pasal 79, & UU KIA No. 4/2024.
 */
@Entity(tableName = "leave_records")
data class LeaveRecord(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val leaveType: String, // ANNUAL (Tahunan), MATERNITY (Melahirkan), PATERNITY (Istri Melahirkan), SICK (Sakit), MARRIAGE (Pernikahan), BEREAVEMENT (Duka Cita)
    val startDate: String, // YYYY-MM-DD
    val endDate: String, // YYYY-MM-DD
    val daysCount: Int,
    val reason: String = "",
    val status: String = "APPROVED", // APPROVED, PENDING, REJECTED
    val createdAt: Long = System.currentTimeMillis()
)
