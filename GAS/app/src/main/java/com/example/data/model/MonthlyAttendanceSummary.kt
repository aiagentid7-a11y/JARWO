package com.example.data.model

/**
 * Model rekap kehadiran dan tunjangan kehadiran (Uang Makan & Uang Transport) bulanan
 */
data class MonthlyAttendanceSummary(
    val totalHariHadir: Int = 0,
    val totalHariUangMakan: Int = 0,
    val totalHariUangTransport: Int = 0,
    val totalNominalUangMakan: Double = 0.0,
    val totalNominalUangTransport: Double = 0.0
)
