package com.aiagentid7.payrollemployee.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Pengaturan Aplikasi & Status Monetisasi/Kepatuhan
 */
@Entity(tableName = "app_settings")
data class AppSettings(
    @PrimaryKey val id: Int = 1,
    val isProUser: Boolean = false,
    val consentPrivacyAgreed: Boolean = false,
    val bpjsKesSalaryCap: Double = 12_000_000.0, // Batas atas BPJS Kesehatan (Perpres 64/2020)
    val bpjsJpSalaryCap: Double = 10_042_300.0, // Batas atas JP BPJS Ketenagakerjaan (PP 45/2015 update)
    val jkkRate: Double = 0.24, // JKK Perusahaan (0.24% sangat rendah s.d. 1.74% sangat tinggi)
    val jkmRate: Double = 0.30, // JKM Perusahaan (0.30%)
    val defaultAnnualLeaveQuota: Int = 12,
    val adFreeUnlockedTimestamp: Long? = null,
    val themeMode: String = "SYSTEM" // "SYSTEM", "LIGHT", "DARK"
)
