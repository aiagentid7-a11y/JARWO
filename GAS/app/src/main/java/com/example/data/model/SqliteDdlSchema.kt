package com.aiagentid7.payrollemployee.data.model

/**
 * Dokumentasi Skrip Database SQLite (DDL SQL) Lengkap
 * Sesuai arsitektur Standalone Offline-First Personal Payroll & ESS.
 * Mencakup 7 Komponen Gaji:
 * Gaji Pokok, Tunjangan Tetap, Tunjangan Tidak Tetap, Makan, Transport, Pulsa, Remote Area.
 */
object SqliteDdlSchema {
    const val SQL_DDL: String = """
-- ==========================================================
-- SKRIP DATABASE SQLITE (DDL) PERSONAL PAYROLL & ESS OFFLINE
-- ==========================================================

-- 1. TABEL PROFIL PENGGUNA & 7 KOMPONEN GAJI
CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY DEFAULT 1,
    fullName TEXT NOT NULL,
    nik TEXT NOT NULL,
    npwp TEXT NOT NULL,
    hasNpwp INTEGER NOT NULL DEFAULT 1,
    ptkpStatus TEXT NOT NULL DEFAULT 'TK/0',
    terCategoryOverride TEXT DEFAULT '',
    contractType TEXT NOT NULL DEFAULT 'PKWTT',
    joinDate TEXT NOT NULL,
    contractEndDate TEXT,
    basicSalary REAL NOT NULL DEFAULT 6500000.0,
    fixedAllowance REAL NOT NULL DEFAULT 1000000.0,
    variableAllowance REAL NOT NULL DEFAULT 500000.0,
    mealAllowance REAL NOT NULL DEFAULT 600000.0,
    transportAllowance REAL NOT NULL DEFAULT 500000.0,
    phoneAllowance REAL NOT NULL DEFAULT 250000.0,
    remoteAreaAllowance REAL NOT NULL DEFAULT 1500000.0,
    ritasePay REAL NOT NULL DEFAULT 0.0,
    hmPay REAL NOT NULL DEFAULT 0.0,
    incentivePay REAL NOT NULL DEFAULT 0.0,
    isBpjsKesEnabled INTEGER NOT NULL DEFAULT 1,
    isBpjsJhtEnabled INTEGER NOT NULL DEFAULT 1,
    isBpjsJpEnabled INTEGER NOT NULL DEFAULT 1,
    isPph21Enabled INTEGER NOT NULL DEFAULT 1,
    regionalUmpUmk REAL NOT NULL DEFAULT 5067381.0,
    companyName TEXT NOT NULL,
    jobTitle TEXT NOT NULL,
    workScheduleScheme TEXT NOT NULL DEFAULT '5_DAYS',
    defaultShiftType TEXT NOT NULL DEFAULT 'REGULAR',
    shiftAllowance REAL NOT NULL DEFAULT 0.0
);

-- 2. TABEL LOG LEMBUR HARIAN & SHIFT (PP 35/2021)
CREATE TABLE IF NOT EXISTS overtime_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    dayType TEXT NOT NULL,
    hours REAL NOT NULL,
    hourlyRate REAL NOT NULL,
    overtimeMultiplierHours REAL NOT NULL,
    totalAmount REAL NOT NULL,
    taskDescription TEXT,
    shiftType TEXT NOT NULL DEFAULT 'REGULAR',
    startTime TEXT NOT NULL DEFAULT '',
    endTime TEXT NOT NULL DEFAULT '',
    isApproved INTEGER NOT NULL DEFAULT 1,
    createdAt INTEGER NOT NULL
);

-- 3. TABEL CATATAN CUTI (UU KIA 4/2024 & UU 13/2003)
CREATE TABLE IF NOT EXISTS leave_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    leaveType TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    daysCount INTEGER NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'APPROVED',
    createdAt INTEGER NOT NULL
);

-- 4. TABEL RIWAYAT PENGGAJIAN BULANAN (7 KOMPONEN + PPH 21 TER)
CREATE TABLE IF NOT EXISTS monthly_payroll_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    periodLabel TEXT NOT NULL,
    basicSalary REAL NOT NULL,
    fixedAllowance REAL NOT NULL,
    variableAllowance REAL NOT NULL DEFAULT 0.0,
    mealAllowance REAL NOT NULL DEFAULT 0.0,
    transportAllowance REAL NOT NULL DEFAULT 0.0,
    phoneAllowance REAL NOT NULL DEFAULT 0.0,
    remoteAreaAllowance REAL NOT NULL DEFAULT 0.0,
    ritasePay REAL NOT NULL DEFAULT 0.0,
    hmPay REAL NOT NULL DEFAULT 0.0,
    incentivePay REAL NOT NULL DEFAULT 0.0,
    overtimePay REAL NOT NULL DEFAULT 0.0,
    bonusOrThr REAL NOT NULL DEFAULT 0.0,
    grossSalary REAL NOT NULL,
    isBpjsKesEnabled INTEGER NOT NULL DEFAULT 1,
    isBpjsJhtEnabled INTEGER NOT NULL DEFAULT 1,
    isBpjsJpEnabled INTEGER NOT NULL DEFAULT 1,
    isPph21Enabled INTEGER NOT NULL DEFAULT 1,
    bpjsKesEmployee REAL NOT NULL DEFAULT 0.0,
    bpjsJhtEmployee REAL NOT NULL DEFAULT 0.0,
    bpjsJpEmployee REAL NOT NULL DEFAULT 0.0,
    totalBpjsEmployee REAL NOT NULL DEFAULT 0.0,
    bpjsKesCompany REAL NOT NULL DEFAULT 0.0,
    bpjsJhtCompany REAL NOT NULL DEFAULT 0.0,
    bpjsJpCompany REAL NOT NULL DEFAULT 0.0,
    bpjsJkkCompany REAL NOT NULL DEFAULT 0.0,
    bpjsJkmCompany REAL NOT NULL DEFAULT 0.0,
    totalBpjsCompany REAL NOT NULL DEFAULT 0.0,
    terCategory TEXT NOT NULL,
    terEffectiveRate REAL NOT NULL,
    pph21Amount REAL NOT NULL,
    isDecemberRecalculation INTEGER NOT NULL DEFAULT 0,
    annualNetTaxableIncome REAL DEFAULT 0.0,
    annualPtkpAmount REAL DEFAULT 0.0,
    annualPkpAmount REAL DEFAULT 0.0,
    annualPph21Calculated REAL DEFAULT 0.0,
    pph21PaidJanNov REAL DEFAULT 0.0,
    customDeductionKasbon REAL DEFAULT 0.0,
    customDeductionLate REAL DEFAULT 0.0,
    customDeductionOther REAL DEFAULT 0.0,
    totalCustomDeductions REAL DEFAULT 0.0,
    netTakeHomePay REAL NOT NULL,
    notes TEXT,
    createdAt INTEGER NOT NULL
);

-- 5. TABEL PENGATURAN APLIKASI & MONETISASI
CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    isProUser INTEGER NOT NULL DEFAULT 0,
    consentPrivacyAgreed INTEGER NOT NULL DEFAULT 0,
    bpjsKesSalaryCap REAL NOT NULL DEFAULT 12000000.0,
    bpjsJpSalaryCap REAL NOT NULL DEFAULT 10042300.0,
    jkkRate REAL NOT NULL DEFAULT 0.24,
    jkmRate REAL NOT NULL DEFAULT 0.30,
    defaultAnnualLeaveQuota INTEGER NOT NULL DEFAULT 12,
    adFreeUnlockedTimestamp INTEGER
);
"""
}
