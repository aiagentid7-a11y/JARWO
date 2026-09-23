package com.example.data.repository

import com.example.data.local.*
import com.example.data.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import org.json.JSONArray
import org.json.JSONObject

class PayrollRepository(
    private val userProfileDao: UserProfileDao,
    private val overtimeLogDao: OvertimeLogDao,
    private val leaveRecordDao: LeaveRecordDao,
    private val monthlyPayrollHistoryDao: MonthlyPayrollHistoryDao,
    private val appSettingsDao: AppSettingsDao,
    private val attendanceDao: AttendanceDao
) {
    val userProfile: Flow<UserProfile?> = userProfileDao.getUserProfile()
    val appSettings: Flow<AppSettings?> = appSettingsDao.getSettings()
    val overtimeLogs: Flow<List<OvertimeLog>> = overtimeLogDao.getAllLogs()
    val leaveRecords: Flow<List<LeaveRecord>> = leaveRecordDao.getAllRecords()
    val payrollHistories: Flow<List<MonthlyPayrollHistory>> = monthlyPayrollHistoryDao.getAllPayrollHistories()
    val attendanceRecords: Flow<List<AttendanceRecord>> = attendanceDao.getAllRecords()

    fun getAttendanceForMonth(monthPrefix: String): Flow<List<AttendanceRecord>> {
        return attendanceDao.getRecordsForMonth(monthPrefix)
    }

    suspend fun getAttendanceForMonthDirect(monthPrefix: String): List<AttendanceRecord> {
        return attendanceDao.getRecordsForMonthDirect(monthPrefix)
    }

    suspend fun addAttendanceRecord(record: AttendanceRecord): Long {
        return attendanceDao.insertRecord(record)
    }

    suspend fun deleteAttendanceRecord(id: Long) {
        attendanceDao.deleteRecordById(id)
    }

    suspend fun deleteAttendanceByDate(date: String) {
        attendanceDao.deleteRecordByDate(date)
    }

    suspend fun getAttendanceByDate(date: String): AttendanceRecord? {
        return attendanceDao.getRecordByDate(date)
    }

    suspend fun saveUserProfile(profile: UserProfile) {
        userProfileDao.insertOrUpdate(profile)
    }

    suspend fun saveAppSettings(settings: AppSettings) {
        appSettingsDao.insertOrUpdate(settings)
    }

    suspend fun updateProStatus(isPro: Boolean) {
        val current = appSettingsDao.getSettingsDirect() ?: AppSettings()
        appSettingsDao.insertOrUpdate(current.copy(isProUser = isPro, adFreeUnlockedTimestamp = if (isPro) System.currentTimeMillis() else null))
    }

    suspend fun updatePrivacyConsent(agreed: Boolean) {
        val current = appSettingsDao.getSettingsDirect() ?: AppSettings()
        appSettingsDao.insertOrUpdate(current.copy(consentPrivacyAgreed = agreed))
    }

    suspend fun addOvertimeLog(log: OvertimeLog): Long {
        return overtimeLogDao.insertLog(log)
    }

    suspend fun deleteOvertimeLog(id: Long) {
        overtimeLogDao.deleteLogById(id)
    }

    suspend fun addLeaveRecord(record: LeaveRecord): Long {
        return leaveRecordDao.insertRecord(record)
    }

    suspend fun deleteLeaveRecord(id: Long) {
        leaveRecordDao.deleteRecordById(id)
    }

    suspend fun savePayrollHistory(history: MonthlyPayrollHistory): Long {
        return monthlyPayrollHistoryDao.insertPayroll(history)
    }

    suspend fun deletePayrollHistory(id: Long) {
        monthlyPayrollHistoryDao.deletePayrollById(id)
    }

    suspend fun getPayrollById(id: Long): MonthlyPayrollHistory? {
        return monthlyPayrollHistoryDao.getPayrollById(id)
    }

    suspend fun getPayrollByPeriod(year: Int, month: Int): MonthlyPayrollHistory? {
        return monthlyPayrollHistoryDao.getPayrollByPeriod(year, month)
    }

    suspend fun clearAllEmployeeData() {
        attendanceDao.clearAllRecords()
        overtimeLogDao.clearAllLogs()
        leaveRecordDao.clearAllRecords()
        monthlyPayrollHistoryDao.clearAllHistories()
        userProfileDao.insertOrUpdate(UserProfile(id = 1))
    }

    /**
     * Backup data lengkap ke format JSON String
     */
    suspend fun exportDataToJson(): String {
        val profile = userProfileDao.getUserProfileDirect() ?: UserProfile()
        val settings = appSettingsDao.getSettingsDirect() ?: AppSettings()
        val overtimes = overtimeLogDao.getAllLogs().firstOrNull() ?: emptyList()
        val leaves = leaveRecordDao.getAllRecords().firstOrNull() ?: emptyList()
        val payrolls = monthlyPayrollHistoryDao.getAllPayrollHistories().firstOrNull() ?: emptyList()
        val attendances = attendanceDao.getAllRecords().firstOrNull() ?: emptyList()

        val root = JSONObject()
        root.put("app", "Personal Payroll & ESS Standalone")
        root.put("version", "1.2")
        root.put("exportedAt", System.currentTimeMillis())

        // User Profile JSON
        val profileObj = JSONObject().apply {
            put("fullName", profile.fullName)
            put("nik", profile.nik)
            put("npwp", profile.npwp)
            put("hasNpwp", profile.hasNpwp)
            put("ptkpStatus", profile.ptkpStatus)
            put("contractType", profile.contractType)
            put("joinDate", profile.joinDate)
            put("basicSalary", profile.basicSalary)
            put("fixedAllowance", profile.fixedAllowance)
            put("variableAllowance", profile.variableAllowance)
            put("mealAllowance", profile.mealAllowance)
            put("transportAllowance", profile.transportAllowance)
            put("mealAllowancePerDay", profile.mealAllowancePerDay)
            put("transportAllowancePerDay", profile.transportAllowancePerDay)
            put("allowanceCalculationMode", profile.allowanceCalculationMode)
            put("phoneAllowance", profile.phoneAllowance)
            put("remoteAreaAllowance", profile.remoteAreaAllowance)
            put("ritasePay", profile.ritasePay)
            put("hmPay", profile.hmPay)
            put("incentivePay", profile.incentivePay)
            put("isBpjsKesEnabled", profile.isBpjsKesEnabled)
            put("isBpjsJhtEnabled", profile.isBpjsJhtEnabled)
            put("isBpjsJpEnabled", profile.isBpjsJpEnabled)
            put("isPph21Enabled", profile.isPph21Enabled)
            put("regionalUmpUmk", profile.regionalUmpUmk)
            put("companyName", profile.companyName)
            put("jobTitle", profile.jobTitle)
            put("workScheduleScheme", profile.workScheduleScheme)
            put("defaultShiftType", profile.defaultShiftType)
            put("shiftAllowance", profile.shiftAllowance)
        }
        root.put("userProfile", profileObj)

        // Settings JSON
        val settingsObj = JSONObject().apply {
            put("isProUser", settings.isProUser)
            put("consentPrivacyAgreed", settings.consentPrivacyAgreed)
            put("bpjsKesSalaryCap", settings.bpjsKesSalaryCap)
            put("bpjsJpSalaryCap", settings.bpjsJpSalaryCap)
            put("jkkRate", settings.jkkRate)
            put("jkmRate", settings.jkmRate)
            put("defaultAnnualLeaveQuota", settings.defaultAnnualLeaveQuota)
            put("adFreeUnlockedTimestamp", settings.adFreeUnlockedTimestamp ?: JSONObject.NULL)
            put("themeMode", settings.themeMode)
        }
        root.put("appSettings", settingsObj)

        // Overtime JSON Array
        val otArray = JSONArray()
        overtimes.forEach { ot ->
            val obj = JSONObject().apply {
                put("date", ot.date)
                put("dayType", ot.dayType)
                put("hours", ot.hours)
                put("hourlyRate", ot.hourlyRate)
                put("overtimeMultiplierHours", ot.overtimeMultiplierHours)
                put("totalAmount", ot.totalAmount)
                put("taskDescription", ot.taskDescription)
                put("shiftType", ot.shiftType)
                put("startTime", ot.startTime)
                put("endTime", ot.endTime)
                put("ritaseCount", ot.ritaseCount)
                put("ritaseRate", ot.ritaseRate)
                put("hmStart", ot.hmStart)
                put("hmEnd", ot.hmEnd)
                put("hmTotal", ot.hmTotal)
                put("unitCode", ot.unitCode)
                put("materialType", ot.materialType)
                put("isApproved", ot.isApproved)
                put("createdAt", ot.createdAt)
            }
            otArray.put(obj)
        }
        root.put("overtimeLogs", otArray)

        // Leave JSON Array
        val leaveArray = JSONArray()
        leaves.forEach { l ->
            val obj = JSONObject().apply {
                put("leaveType", l.leaveType)
                put("startDate", l.startDate)
                put("endDate", l.endDate)
                put("daysCount", l.daysCount)
                put("reason", l.reason)
                put("status", l.status)
                put("createdAt", l.createdAt)
            }
            leaveArray.put(obj)
        }
        root.put("leaveRecords", leaveArray)

        // Payroll History JSON Array
        val payrollArray = JSONArray()
        payrolls.forEach { p ->
            val obj = JSONObject().apply {
                put("month", p.month)
                put("year", p.year)
                put("periodLabel", p.periodLabel)
                put("basicSalary", p.basicSalary)
                put("fixedAllowance", p.fixedAllowance)
                put("variableAllowance", p.variableAllowance)
                put("mealAllowance", p.mealAllowance)
                put("transportAllowance", p.transportAllowance)
                put("phoneAllowance", p.phoneAllowance)
                put("remoteAreaAllowance", p.remoteAreaAllowance)
                put("ritasePay", p.ritasePay)
                put("hmPay", p.hmPay)
                put("incentivePay", p.incentivePay)
                put("overtimePay", p.overtimePay)
                put("bonusOrThr", p.bonusOrThr)
                put("grossSalary", p.grossSalary)
                put("isBpjsKesEnabled", p.isBpjsKesEnabled)
                put("isBpjsJhtEnabled", p.isBpjsJhtEnabled)
                put("isBpjsJpEnabled", p.isBpjsJpEnabled)
                put("isPph21Enabled", p.isPph21Enabled)
                put("bpjsKesEmployee", p.bpjsKesEmployee)
                put("bpjsJhtEmployee", p.bpjsJhtEmployee)
                put("bpjsJpEmployee", p.bpjsJpEmployee)
                put("totalBpjsEmployee", p.totalBpjsEmployee)
                put("bpjsKesCompany", p.bpjsKesCompany)
                put("bpjsJhtCompany", p.bpjsJhtCompany)
                put("bpjsJpCompany", p.bpjsJpCompany)
                put("bpjsJkkCompany", p.bpjsJkkCompany)
                put("bpjsJkmCompany", p.bpjsJkmCompany)
                put("totalBpjsCompany", p.totalBpjsCompany)
                put("terCategory", p.terCategory)
                put("terEffectiveRate", p.terEffectiveRate)
                put("pph21Amount", p.pph21Amount)
                put("isDecemberRecalculation", p.isDecemberRecalculation)
                put("annualNetTaxableIncome", p.annualNetTaxableIncome)
                put("annualPtkpAmount", p.annualPtkpAmount)
                put("annualPkpAmount", p.annualPkpAmount)
                put("annualPph21Calculated", p.annualPph21Calculated)
                put("pph21PaidJanNov", p.pph21PaidJanNov)
                put("customDeductionKasbon", p.customDeductionKasbon)
                put("customDeductionLate", p.customDeductionLate)
                put("customDeductionOther", p.customDeductionOther)
                put("totalCustomDeductions", p.totalCustomDeductions)
                put("netTakeHomePay", p.netTakeHomePay)
                put("notes", p.notes)
                put("createdAt", p.createdAt)
            }
            payrollArray.put(obj)
        }
        root.put("payrollHistories", payrollArray)

        // Attendance JSON Array
        val attendanceArray = JSONArray()
        attendances.forEach { a ->
            val obj = JSONObject().apply {
                put("date", a.date)
                put("status", a.status)
                put("checkInTime", a.checkInTime)
                put("checkOutTime", a.checkOutTime)
                put("workedHours", a.workedHours)
                put("isMealEligible", a.isMealEligible)
                put("isTransportEligible", a.isTransportEligible)
                put("notes", a.notes)
                put("createdAt", a.createdAt)
            }
            attendanceArray.put(obj)
        }
        root.put("attendanceRecords", attendanceArray)

        return root.toString(2)
    }

    /**
     * Restore data dari format JSON (profil, pengaturan, log lembur, cuti, absensi, dan riwayat gaji).
     * Overtime, cuti, absensi, dan riwayat gaji yang sudah ada di database SAAT INI akan
     * dihapus lebih dulu dan digantikan seluruhnya oleh isi backup, agar hasil restore
     * konsisten (bukan digabung/duplikat dengan data yang sudah ada).
     */
    suspend fun importDataFromJson(jsonStr: String): Boolean {
        return try {
            val root = JSONObject(jsonStr)

            if (root.has("userProfile")) {
                val p = root.getJSONObject("userProfile")
                val current = userProfileDao.getUserProfileDirect() ?: UserProfile()
                val updatedProfile = current.copy(
                    fullName = p.optString("fullName", current.fullName),
                    nik = p.optString("nik", current.nik),
                    npwp = p.optString("npwp", current.npwp),
                    hasNpwp = p.optBoolean("hasNpwp", current.hasNpwp),
                    ptkpStatus = p.optString("ptkpStatus", current.ptkpStatus),
                    contractType = p.optString("contractType", current.contractType),
                    joinDate = p.optString("joinDate", current.joinDate),
                    basicSalary = p.optDouble("basicSalary", current.basicSalary),
                    fixedAllowance = p.optDouble("fixedAllowance", current.fixedAllowance),
                    variableAllowance = p.optDouble("variableAllowance", current.variableAllowance),
                    mealAllowance = p.optDouble("mealAllowance", current.mealAllowance),
                    transportAllowance = p.optDouble("transportAllowance", current.transportAllowance),
                    mealAllowancePerDay = p.optDouble("mealAllowancePerDay", current.mealAllowancePerDay),
                    transportAllowancePerDay = p.optDouble("transportAllowancePerDay", current.transportAllowancePerDay),
                    allowanceCalculationMode = p.optString("allowanceCalculationMode", current.allowanceCalculationMode),
                    phoneAllowance = p.optDouble("phoneAllowance", current.phoneAllowance),
                    remoteAreaAllowance = p.optDouble("remoteAreaAllowance", current.remoteAreaAllowance),
                    ritasePay = p.optDouble("ritasePay", current.ritasePay),
                    hmPay = p.optDouble("hmPay", current.hmPay),
                    incentivePay = p.optDouble("incentivePay", current.incentivePay),
                    isBpjsKesEnabled = p.optBoolean("isBpjsKesEnabled", current.isBpjsKesEnabled),
                    isBpjsJhtEnabled = p.optBoolean("isBpjsJhtEnabled", current.isBpjsJhtEnabled),
                    isBpjsJpEnabled = p.optBoolean("isBpjsJpEnabled", current.isBpjsJpEnabled),
                    isPph21Enabled = p.optBoolean("isPph21Enabled", current.isPph21Enabled),
                    regionalUmpUmk = p.optDouble("regionalUmpUmk", current.regionalUmpUmk),
                    companyName = p.optString("companyName", current.companyName),
                    jobTitle = p.optString("jobTitle", current.jobTitle),
                    workScheduleScheme = p.optString("workScheduleScheme", current.workScheduleScheme),
                    defaultShiftType = p.optString("defaultShiftType", current.defaultShiftType),
                    shiftAllowance = p.optDouble("shiftAllowance", current.shiftAllowance)
                )
                userProfileDao.insertOrUpdate(updatedProfile)
            }

            if (root.has("appSettings")) {
                val s = root.getJSONObject("appSettings")
                val current = appSettingsDao.getSettingsDirect() ?: AppSettings()
                val updatedSettings = current.copy(
                    isProUser = s.optBoolean("isProUser", current.isProUser),
                    consentPrivacyAgreed = s.optBoolean("consentPrivacyAgreed", current.consentPrivacyAgreed),
                    bpjsKesSalaryCap = s.optDouble("bpjsKesSalaryCap", current.bpjsKesSalaryCap),
                    bpjsJpSalaryCap = s.optDouble("bpjsJpSalaryCap", current.bpjsJpSalaryCap),
                    jkkRate = s.optDouble("jkkRate", current.jkkRate),
                    jkmRate = s.optDouble("jkmRate", current.jkmRate),
                    defaultAnnualLeaveQuota = s.optInt("defaultAnnualLeaveQuota", current.defaultAnnualLeaveQuota),
                    adFreeUnlockedTimestamp = if (s.isNull("adFreeUnlockedTimestamp")) null
                        else s.optLong("adFreeUnlockedTimestamp"),
                    themeMode = s.optString("themeMode", current.themeMode)
                )
                appSettingsDao.insertOrUpdate(updatedSettings)
            }

            if (root.has("overtimeLogs")) {
                overtimeLogDao.clearAllLogs()
                val arr = root.getJSONArray("overtimeLogs")
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    overtimeLogDao.insertLog(
                        OvertimeLog(
                            id = o.optLong("id", 0L).let { if (it == 0L) 0L else it },
                            date = o.optString("date"),
                            dayType = o.optString("dayType", "WORKDAY"),
                            hours = o.optDouble("hours", 0.0),
                            hourlyRate = o.optDouble("hourlyRate", 0.0),
                            overtimeMultiplierHours = o.optDouble("overtimeMultiplierHours", 0.0),
                            totalAmount = o.optDouble("totalAmount", 0.0),
                            taskDescription = o.optString("taskDescription", ""),
                            shiftType = o.optString("shiftType", "REGULAR"),
                            startTime = o.optString("startTime", ""),
                            endTime = o.optString("endTime", ""),
                            ritaseCount = o.optInt("ritaseCount", 0),
                            ritaseRate = o.optDouble("ritaseRate", 0.0),
                            hmStart = o.optDouble("hmStart", 0.0),
                            hmEnd = o.optDouble("hmEnd", 0.0),
                            hmTotal = o.optDouble("hmTotal", 0.0),
                            unitCode = o.optString("unitCode", ""),
                            materialType = o.optString("materialType", ""),
                            isApproved = o.optBoolean("isApproved", true),
                            createdAt = o.optLong("createdAt", System.currentTimeMillis())
                        )
                    )
                }
            }

            if (root.has("leaveRecords")) {
                leaveRecordDao.clearAllRecords()
                val arr = root.getJSONArray("leaveRecords")
                for (i in 0 until arr.length()) {
                    val l = arr.getJSONObject(i)
                    leaveRecordDao.insertRecord(
                        LeaveRecord(
                            id = l.optLong("id", 0L).let { if (it == 0L) 0L else it },
                            leaveType = l.optString("leaveType"),
                            startDate = l.optString("startDate"),
                            endDate = l.optString("endDate"),
                            daysCount = l.optInt("daysCount", 0),
                            reason = l.optString("reason", ""),
                            status = l.optString("status", "APPROVED"),
                            createdAt = l.optLong("createdAt", System.currentTimeMillis())
                        )
                    )
                }
            }

            if (root.has("payrollHistories")) {
                monthlyPayrollHistoryDao.clearAllHistories()
                val arr = root.getJSONArray("payrollHistories")
                for (i in 0 until arr.length()) {
                    val p = arr.getJSONObject(i)
                    monthlyPayrollHistoryDao.insertPayroll(
                        MonthlyPayrollHistory(
                            id = p.optLong("id", 0L).let { if (it == 0L) 0L else it },
                            month = p.optInt("month", 1),
                            year = p.optInt("year", 2026),
                            periodLabel = p.optString("periodLabel", ""),
                            basicSalary = p.optDouble("basicSalary", 0.0),
                            fixedAllowance = p.optDouble("fixedAllowance", 0.0),
                            variableAllowance = p.optDouble("variableAllowance", 0.0),
                            mealAllowance = p.optDouble("mealAllowance", 0.0),
                            transportAllowance = p.optDouble("transportAllowance", 0.0),
                            phoneAllowance = p.optDouble("phoneAllowance", 0.0),
                            remoteAreaAllowance = p.optDouble("remoteAreaAllowance", 0.0),
                            ritasePay = p.optDouble("ritasePay", 0.0),
                            hmPay = p.optDouble("hmPay", 0.0),
                            incentivePay = p.optDouble("incentivePay", 0.0),
                            overtimePay = p.optDouble("overtimePay", 0.0),
                            bonusOrThr = p.optDouble("bonusOrThr", 0.0),
                            grossSalary = p.optDouble("grossSalary", 0.0),
                            isBpjsKesEnabled = p.optBoolean("isBpjsKesEnabled", true),
                            isBpjsJhtEnabled = p.optBoolean("isBpjsJhtEnabled", true),
                            isBpjsJpEnabled = p.optBoolean("isBpjsJpEnabled", true),
                            isPph21Enabled = p.optBoolean("isPph21Enabled", true),
                            bpjsKesEmployee = p.optDouble("bpjsKesEmployee", 0.0),
                            bpjsJhtEmployee = p.optDouble("bpjsJhtEmployee", 0.0),
                            bpjsJpEmployee = p.optDouble("bpjsJpEmployee", 0.0),
                            totalBpjsEmployee = p.optDouble("totalBpjsEmployee", 0.0),
                            bpjsKesCompany = p.optDouble("bpjsKesCompany", 0.0),
                            bpjsJhtCompany = p.optDouble("bpjsJhtCompany", 0.0),
                            bpjsJpCompany = p.optDouble("bpjsJpCompany", 0.0),
                            bpjsJkkCompany = p.optDouble("bpjsJkkCompany", 0.0),
                            bpjsJkmCompany = p.optDouble("bpjsJkmCompany", 0.0),
                            totalBpjsCompany = p.optDouble("totalBpjsCompany", 0.0),
                            terCategory = p.optString("terCategory", "A"),
                            terEffectiveRate = p.optDouble("terEffectiveRate", 0.0),
                            pph21Amount = p.optDouble("pph21Amount", 0.0),
                            isDecemberRecalculation = p.optBoolean("isDecemberRecalculation", false),
                            annualNetTaxableIncome = p.optDouble("annualNetTaxableIncome", 0.0),
                            annualPtkpAmount = p.optDouble("annualPtkpAmount", 0.0),
                            annualPkpAmount = p.optDouble("annualPkpAmount", 0.0),
                            annualPph21Calculated = p.optDouble("annualPph21Calculated", 0.0),
                            pph21PaidJanNov = p.optDouble("pph21PaidJanNov", 0.0),
                            customDeductionKasbon = p.optDouble("customDeductionKasbon", 0.0),
                            customDeductionLate = p.optDouble("customDeductionLate", 0.0),
                            customDeductionOther = p.optDouble("customDeductionOther", 0.0),
                            totalCustomDeductions = p.optDouble("totalCustomDeductions", 0.0),
                            netTakeHomePay = p.optDouble("netTakeHomePay", 0.0),
                            notes = p.optString("notes", ""),
                            createdAt = p.optLong("createdAt", System.currentTimeMillis())
                        )
                    )
                }
            }

            if (root.has("attendanceRecords")) {
                attendanceDao.clearAllRecords()
                val arr = root.getJSONArray("attendanceRecords")
                for (i in 0 until arr.length()) {
                    val a = arr.getJSONObject(i)
                    attendanceDao.insertRecord(
                        AttendanceRecord(
                            id = a.optLong("id", 0L).let { if (it == 0L) 0L else it },
                            date = a.optString("date"),
                            status = a.optString("status", "HADIR"),
                            checkInTime = a.optString("checkInTime", ""),
                            checkOutTime = a.optString("checkOutTime", ""),
                            workedHours = a.optDouble("workedHours", 0.0),
                            isMealEligible = a.optBoolean("isMealEligible", true),
                            isTransportEligible = a.optBoolean("isTransportEligible", true),
                            notes = a.optString("notes", ""),
                            createdAt = a.optLong("createdAt", System.currentTimeMillis())
                        )
                    )
                }
            }

            true
        } catch (e: Exception) {
            android.util.Log.e("PayrollRepository", "Gagal memulihkan data dari JSON backup", e)
            false
        }
    }
}
