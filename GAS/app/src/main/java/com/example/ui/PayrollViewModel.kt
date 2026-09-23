package com.example.ui

import android.app.Application
import androidx.room.withTransaction
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.local.AppDatabase
import com.example.data.model.*
import com.example.data.repository.PayrollRepository
import com.example.domain.calculator.IndonesianPayrollCalculators
import com.example.domain.util.Formatters
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class CurrentCalculationInput(
    val selectedMonth: Int = Formatters.getCurrentMonth(),
    val selectedYear: Int = Formatters.getCurrentYear(),
    val customBasicSalary: Double? = null,
    val customFixedAllowance: Double? = null,
    val customVariableAllowance: Double? = null,
    val customMealAllowance: Double? = null,
    val customTransportAllowance: Double? = null,
    val customPhoneAllowance: Double? = null,
    val customRemoteAreaAllowance: Double? = null,
    val customRitasePay: Double? = null,
    val customHmPay: Double? = null,
    val customIncentivePay: Double? = null,
    val customIsBpjsKesEnabled: Boolean? = null,
    val customIsBpjsJhtEnabled: Boolean? = null,
    val customIsBpjsJpEnabled: Boolean? = null,
    val customIsPph21Enabled: Boolean? = null,
    val overtimeHours: Double = 0.0,
    val overtimeDayType: String = "WORKDAY",
    val bonusOrThr: Double = 0.0,
    val customKasbon: Double = 0.0,
    val customLate: Double = 0.0,
    val customOther: Double = 0.0,
    val isDecemberRecalculation: Boolean = false,
    val pph21PaidJanNov: Double = 0.0,
    val notes: String = ""
)

class PayrollViewModel(application: Application) : AndroidViewModel(application) {
    private val database = AppDatabase.getDatabase(application)
    private val repository = PayrollRepository(
        database.userProfileDao(),
        database.overtimeLogDao(),
        database.leaveRecordDao(),
        database.monthlyPayrollHistoryDao(),
        database.appSettingsDao(),
        database.attendanceDao()
    )

    val billingManager = com.example.billing.BillingManager(application)

    val userProfile: StateFlow<UserProfile> = repository.userProfile
        .filterNotNull()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), UserProfile())
    val appSettings: StateFlow<AppSettings> = repository.appSettings
        .filterNotNull()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), AppSettings())
    val overtimeLogs: StateFlow<List<OvertimeLog>> = repository.overtimeLogs
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val leaveRecords: StateFlow<List<LeaveRecord>> = repository.leaveRecords
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val attendanceRecords: StateFlow<List<AttendanceRecord>> = repository.attendanceRecords
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val payrollHistories: StateFlow<List<MonthlyPayrollHistory>> = repository.payrollHistories
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _calculationInput = MutableStateFlow(CurrentCalculationInput())
    val calculationInput: StateFlow<CurrentCalculationInput> = _calculationInput.asStateFlow()

    private val _showPrivacyModal = MutableStateFlow(false)
    val showPrivacyModal: StateFlow<Boolean> = _showPrivacyModal.asStateFlow()
    private val _showProDialog = MutableStateFlow(false)
    val showProDialog: StateFlow<Boolean> = _showProDialog.asStateFlow()
    private val _selectedPayrollForDetail = MutableStateFlow<MonthlyPayrollHistory?>(null)
    val selectedPayrollForDetail: StateFlow<MonthlyPayrollHistory?> = _selectedPayrollForDetail.asStateFlow()
    private val _userMessage = MutableStateFlow<String?>(null)
    val userMessage: StateFlow<String?> = _userMessage.asStateFlow()

    init {
        viewModelScope.launch {
            appSettings.collect { settings ->
                if (!settings.consentPrivacyAgreed) {
                    _showPrivacyModal.value = true
                }
            }
        }
        
        viewModelScope.launch {
            billingManager.isPro.collect { isPro ->
                // Sync billing status with local app settings
                val current = appSettings.value
                if (current.isProUser != isPro && isPro) {
                    setProStatus(true)
                }
            }
        }
    }

    // =========================================================================
    // HELPER TERPUSAT: REKAP KEHADIRAN BULANAN
    // =========================================================================
    fun getMonthlyAttendanceSummary(month: Int, year: Int): Flow<MonthlyAttendanceSummary> {
        val monthPrefix = String.format(java.util.Locale.US, "%04d-%02d", year, month)
        
        return repository.getAttendanceForMonth(monthPrefix).combine(userProfile) { records: List<AttendanceRecord>, profile: UserProfile ->
            val totalHadir = records.count { it.status == "HADIR" }
            val hariMakan = records.count { it.isMealEligible }
            val hariTransport = records.count { it.isTransportEligible }
            
            MonthlyAttendanceSummary(
                totalHariHadir = totalHadir,
                totalHariUangMakan = hariMakan,
                totalHariUangTransport = hariTransport,
                totalNominalUangMakan = hariMakan * profile.mealAllowancePerDay,
                totalNominalUangTransport = hariTransport * profile.transportAllowancePerDay
            )
        }
    }

    fun clearAllEmployeeData() {
        viewModelScope.launch {
            database.withTransaction {
                repository.clearAllEmployeeData()
            }
            _userMessage.value = "Semua data karyawan dan riwayat telah dibersihkan."
        }
    }

    fun updateCalculationInput(transform: (CurrentCalculationInput) -> CurrentCalculationInput) {
        _calculationInput.value = transform(_calculationInput.value)
    }

    fun saveProfile(profile: UserProfile) {
        viewModelScope.launch {
            repository.saveUserProfile(profile)
            _userMessage.value = "Profil & Komponen Gaji berhasil disimpan."
        }
    }

    fun saveSettings(settings: AppSettings) {
        viewModelScope.launch {
            repository.saveAppSettings(settings)
            _userMessage.value = "Pengaturan berhasil diperbarui."
        }
    }

    fun acceptPrivacyConsent() {
        viewModelScope.launch {
            repository.updatePrivacyConsent(true)
            _showPrivacyModal.value = false
        }
    }

    fun setProStatus(isPro: Boolean) {
        viewModelScope.launch {
            repository.updateProStatus(isPro)
            _showProDialog.value = false
            _userMessage.value = if (isPro) "Selamat! Fitur Pro Berhasil Diaktifkan." else "Beralih ke Versi Gratis."
        }
    }

    fun openProDialog() { _showProDialog.value = true }
    fun closeProDialog() { _showProDialog.value = false }
    fun openPrivacyModal() { _showPrivacyModal.value = true }
    fun selectPayrollDetail(history: MonthlyPayrollHistory?) { _selectedPayrollForDetail.value = history }
    fun clearUserMessage() { _userMessage.value = null }

    // =========================================================================
    // 1. SINKRONISASI LEMBUR -> ABSENSI
    // =========================================================================
    fun addOvertimeLog(
        date: String,
        hours: Double,
        dayType: String,
        description: String,
        shiftType: String = "REGULAR",
        startTime: String = "",
        endTime: String = "",
        ritaseCount: Int = 0,
        ritaseRate: Double = 0.0,
        hmStart: Double = 0.0,
        hmEnd: Double = 0.0,
        hmTotal: Double = 0.0,
        unitCode: String = "",
        materialType: String = ""
    ) {
        viewModelScope.launch {
            val profile = userProfile.value
            val otResult = IndonesianPayrollCalculators.calculateOvertime(
                hours = hours,
                totalFixedSalary = profile.totalFixedSalary,
                dayType = dayType
            )
            val calculatedHmTotal = if (hmTotal > 0.0) hmTotal else if (hmEnd > hmStart && hmStart > 0.0) (hmEnd - hmStart) else 0.0
            val log = OvertimeLog(
                date = date,
                dayType = dayType,
                hours = hours,
                hourlyRate = otResult.hourlyRate,
                overtimeMultiplierHours = otResult.multiplierHours,
                totalAmount = otResult.totalAmount,
                taskDescription = description,
                shiftType = shiftType,
                startTime = startTime,
                endTime = endTime,
                ritaseCount = ritaseCount,
                ritaseRate = ritaseRate,
                hmStart = hmStart,
                hmEnd = hmEnd,
                hmTotal = calculatedHmTotal,
                unitCode = unitCode,
                materialType = materialType
            )
            database.withTransaction {
                val overtimeId = repository.addOvertimeLog(log)

                // Sinkronkan ke tabel Absensi hanya jika tanggal belum dimiliki sumber lain.
                val existingAttendance = repository.getAttendanceByDate(date)
                if (existingAttendance == null) {
                    repository.addAttendanceRecord(
                        AttendanceRecord(
                            date = date,
                            status = if (dayType == "WORKDAY") "HADIR" else "LIBUR",
                            checkInTime = startTime,
                            checkOutTime = endTime,
                            workedHours = hours,
                            isMealEligible = dayType == "WORKDAY",
                            isTransportEligible = dayType == "WORKDAY",
                            notes = "Lembur ($hours jam): $description",
                            sourceType = "OVERTIME_SYNC",
                            sourceId = overtimeId
                        )
                    )
                }
            }
            _userMessage.value = "Log lembur $date berhasil dicatat & disinkronkan ke Absensi."
        }
    }

    fun deleteOvertimeLog(id: Long) {
        viewModelScope.launch {
            repository.deleteOvertimeLog(id)
            _userMessage.value = "Log lembur berhasil dihapus."
        }
    }

    // =========================================================================
    // 2. SINKRONISASI CUTI / IZIN / SAKIT -> ABSENSI
    // =========================================================================
    fun addLeaveRecord(
        leaveType: String,
        startDate: String,
        endDate: String,
        daysCount: Int,
        reason: String
    ) {
        viewModelScope.launch {
            val record = LeaveRecord(
                leaveType = leaveType,
                startDate = startDate,
                endDate = endDate,
                daysCount = daysCount,
                reason = reason
            )
            val upperType = leaveType.uppercase()
            val attendanceStatus = when {
                upperType.contains("SAKIT") || upperType.contains("SICK") || upperType.contains("OPNAME") || upperType.contains("HAID") -> "SAKIT"
                upperType.contains("IZIN") ||
                upperType.contains("MENIKAH") ||
                upperType.contains("KHITANAN") ||
                upperType.contains("BAPTIS") ||
                upperType.contains("DUKA") ||
                upperType.contains("BEREAVEMENT") ||
                upperType.contains("TUGAS_NEGARA") ||
                upperType.contains("UJIAN") ||
                upperType.contains("IBADAH") -> "IZIN"
                else -> "CUTI"
            }

            try {
                val format = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).apply {
                    isLenient = false
                }
                val startCal = java.util.Calendar.getInstance().apply { time = format.parse(startDate)!! }
                val endCal = java.util.Calendar.getInstance().apply { time = format.parse(endDate)!! }

                database.withTransaction {
                    val leaveId = repository.addLeaveRecord(record)
                    while (!startCal.after(endCal)) {
                        val dateStr = format.format(startCal.time)
                        repository.addAttendanceRecord(
                            AttendanceRecord(
                                date = dateStr,
                                status = attendanceStatus,
                                workedHours = 0.0,
                                isMealEligible = false,
                                isTransportEligible = false,
                                notes = "Sinkron dari $leaveType: $reason",
                                sourceType = "LEAVE_SYNC",
                                sourceId = leaveId
                            )
                        )
                        startCal.add(java.util.Calendar.DAY_OF_MONTH, 1)
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("PayrollViewModel", "Gagal melakukan parse tanggal", e)
            }

            _userMessage.value = "Cuti/Izin berhasil dicatat dan disinkronkan ke Absensi."
        }
    }

    fun deleteLeaveRecord(id: Long) {
        viewModelScope.launch { repository.deleteLeaveRecord(id) }
    }

    fun addAttendanceRecord(record: AttendanceRecord) {
        viewModelScope.launch { repository.addAttendanceRecord(record) }
    }

    fun deleteAttendanceRecord(id: Long) {
        viewModelScope.launch { repository.deleteAttendanceRecord(id) }
    }

    // =========================================================================
    // 3. PERHITUNGAN GAJI UTAMA (MENGGUNAKAN HELPER TERPUSAT)
    // =========================================================================
    suspend fun calculateAndSaveCurrentPayroll(): MonthlyPayrollHistory {
        val profile = userProfile.value
        val settings = appSettings.value
        val input = calculationInput.value
        val monthPrefix = String.format(java.util.Locale.US, "%04d-%02d", input.selectedYear, input.selectedMonth)
        
        // Menggunakan helper terpusat untuk menarik summary kehadiran (di-resolve dengan .first())
        val attendanceSummary = getMonthlyAttendanceSummary(input.selectedMonth, input.selectedYear).first()
        val isPerAttendanceMode = profile.allowanceCalculationMode == "PER_ATTENDANCE"

        val actualOtHoursThisMonth = if (input.overtimeHours == 0.0) {
            overtimeLogs.value.filter { it.date.startsWith(monthPrefix) }.sumOf { it.hours }
        } else {
            input.overtimeHours
        }

        val basicSalary = input.customBasicSalary ?: profile.basicSalary
        val fixedAllowance = input.customFixedAllowance ?: profile.fixedAllowance
        val variableAllowance = input.customVariableAllowance ?: profile.variableAllowance
        
        // Ambil nominal Uang Makan & Transport dari rekap terpusat
        val mealAllowance = input.customMealAllowance ?: if (isPerAttendanceMode) {
            attendanceSummary.totalNominalUangMakan
        } else {
            profile.mealAllowance
        }
        val transportAllowance = input.customTransportAllowance ?: if (isPerAttendanceMode) {
            attendanceSummary.totalNominalUangTransport
        } else {
            profile.transportAllowance
        }
        
        val phoneAllowance = input.customPhoneAllowance ?: profile.phoneAllowance
        val remoteAreaAllowance = input.customRemoteAreaAllowance ?: profile.remoteAreaAllowance
        val ritasePay = input.customRitasePay ?: profile.ritasePay
        val hmPay = input.customHmPay ?: profile.hmPay
        val incentivePay = input.customIncentivePay ?: profile.incentivePay
        val enableKes = input.customIsBpjsKesEnabled ?: profile.isBpjsKesEnabled
        val enableJht = input.customIsBpjsJhtEnabled ?: profile.isBpjsJhtEnabled
        val enableJp = input.customIsBpjsJpEnabled ?: profile.isBpjsJpEnabled
        val enablePph21 = input.customIsPph21Enabled ?: profile.isPph21Enabled

        val fixedSalary = basicSalary + fixedAllowance + remoteAreaAllowance
        val otResult = IndonesianPayrollCalculators.calculateOvertime(
            hours = actualOtHoursThisMonth,
            totalFixedSalary = fixedSalary,
            dayType = input.overtimeDayType
        )
        val otPay = otResult.totalAmount

        val totalAllowances = fixedAllowance + variableAllowance + mealAllowance + transportAllowance + phoneAllowance + remoteAreaAllowance + ritasePay + hmPay + incentivePay
        val grossSalary = basicSalary + totalAllowances + otPay + input.bonusOrThr
        
        val bpjs = IndonesianPayrollCalculators.calculateBpjs(
            fixedSalary = fixedSalary,
            bpjsKesCap = settings.bpjsKesSalaryCap,
            bpjsJpCap = settings.bpjsJpSalaryCap,
            jkkRatePercent = settings.jkkRate,
            jkmRatePercent = settings.jkmRate,
            enableKes = enableKes,
            enableJht = enableJht,
            enableJp = enableJp
        )

        val terCategory = if (profile.terCategoryOverride.isNotBlank()) profile.terCategoryOverride else IndonesianPayrollCalculators.determineTerCategory(profile.ptkpStatus)
        val pph21Amount: Double
        val terRate: Double
        var annualPkp = 0.0
        var annualPtkp = 0.0
        var annualPph21 = 0.0

        if (!enablePph21) {
            pph21Amount = 0.0
            terRate = 0.0
        } else if (input.isDecemberRecalculation) {
            val historyThisYearExcludingCurrent = payrollHistories.value.filter {
                it.year == input.selectedYear && it.month != input.selectedMonth
            }
            val monthsRecorded = historyThisYearExcludingCurrent.map { it.month }.toSet()
            val recordedGross = historyThisYearExcludingCurrent.sumOf { it.grossSalary }
            val recordedJht = historyThisYearExcludingCurrent.sumOf { it.bpjsJhtEmployee }
            val recordedJp = historyThisYearExcludingCurrent.sumOf { it.bpjsJpEmployee }
            val missingMonths = (1..11).count { it !in monthsRecorded }
            val annualGross = recordedGross + grossSalary + (missingMonths * grossSalary)
            val annualPension = recordedJht + recordedJp + (bpjs.bpjsJhtEmployee + bpjs.bpjsJpEmployee) * (1 + missingMonths)

            val decResult = IndonesianPayrollCalculators.calculateDecemberPph21(
                annualGrossSalary = annualGross,
                ptkpStatus = profile.ptkpStatus,
                annualEmployeePensionDeduction = annualPension,
                pph21PaidJanNov = input.pph21PaidJanNov,
                hasNpwp = profile.hasNpwp
            )
            pph21Amount = decResult.pph21DecemberDue
            terRate = if (annualGross > 0) decResult.annualPph21Total / annualGross else 0.0
            annualPkp = decResult.annualPkp
            annualPtkp = decResult.annualPtkp
            annualPph21 = decResult.annualPph21Total
        } else {
            val (rate, tax) = IndonesianPayrollCalculators.calculateMonthlyTerPph21(
                grossSalary = grossSalary,
                terCategory = terCategory,
                hasNpwp = profile.hasNpwp
            )
            terRate = rate
            pph21Amount = tax
        }

        val totalCustom = input.customKasbon + input.customLate + input.customOther
        val totalDeduction = bpjs.totalEmployeeDeduction + pph21Amount + totalCustom
        val netThp = grossSalary - totalDeduction

        val monthNames = arrayOf(
            "Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        )
        val periodName = "${monthNames.getOrElse(input.selectedMonth - 1) { "Bulan ${input.selectedMonth}" }} ${input.selectedYear}"

        val existing = repository.getPayrollByPeriod(input.selectedYear, input.selectedMonth)
        val history = MonthlyPayrollHistory(
            id = existing?.id ?: 0,
            month = input.selectedMonth,
            year = input.selectedYear,
            periodLabel = periodName,
            basicSalary = basicSalary,
            fixedAllowance = fixedAllowance,
            variableAllowance = variableAllowance,
            mealAllowance = mealAllowance,
            transportAllowance = transportAllowance,
            phoneAllowance = phoneAllowance,
            remoteAreaAllowance = remoteAreaAllowance,
            ritasePay = ritasePay,
            hmPay = hmPay,
            incentivePay = incentivePay,
            overtimePay = otPay,
            bonusOrThr = input.bonusOrThr,
            grossSalary = grossSalary,
            isBpjsKesEnabled = enableKes,
            isBpjsJhtEnabled = enableJht,
            isBpjsJpEnabled = enableJp,
            isPph21Enabled = enablePph21,
            bpjsKesEmployee = bpjs.bpjsKesEmployee,
            bpjsJhtEmployee = bpjs.bpjsJhtEmployee,
            bpjsJpEmployee = bpjs.bpjsJpEmployee,
            totalBpjsEmployee = bpjs.totalEmployeeDeduction,
            bpjsKesCompany = bpjs.bpjsKesCompany,
            bpjsJhtCompany = bpjs.bpjsJhtCompany,
            bpjsJpCompany = bpjs.bpjsJpCompany,
            bpjsJkkCompany = bpjs.bpjsJkkCompany,
            bpjsJkmCompany = bpjs.bpjsJkmCompany,
            totalBpjsCompany = bpjs.totalCompanyContribution,
            terCategory = if (input.isDecemberRecalculation) "Desember (Pasal 17)" else terCategory,
            terEffectiveRate = terRate,
            pph21Amount = pph21Amount,
            isDecemberRecalculation = input.isDecemberRecalculation,
            annualPtkpAmount = annualPtkp,
            annualPkpAmount = annualPkp,
            annualPph21Calculated = annualPph21,
            pph21PaidJanNov = input.pph21PaidJanNov,
            customDeductionKasbon = input.customKasbon,
            customDeductionLate = input.customLate,
            customDeductionOther = input.customOther,
            totalCustomDeductions = totalCustom,
            netTakeHomePay = netThp,
            notes = input.notes
        )
        val newId = repository.savePayrollHistory(history)
        _userMessage.value = "Kalkulasi $periodName berhasil disimpan."
        return history.copy(id = newId)
    }

    fun deletePayrollHistory(id: Long) {
        viewModelScope.launch { repository.deletePayrollHistory(id) }
    }

    suspend fun exportJson(): String = repository.exportDataToJson()

    suspend fun importJson(jsonStr: String): Boolean {
        val success = repository.importDataFromJson(jsonStr)
        if (success) _userMessage.value = "Data berhasil dipulihkan dari JSON backup."
        return success
    }
}
