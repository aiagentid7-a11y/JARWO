package com.example.domain.calculator

import com.example.data.model.AttendanceRecord
import com.example.data.model.OvertimeLog
import com.example.data.model.UserProfile
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * Status Kepatuhan K3 & Regulasi Jam Kerja (PP No. 35/2021 & Permenaker No. 27/2021)
 */
enum class K3ComplianceStatus(val label: String) {
    AMAN("Aman"),
    WASPADA("Waspada"),
    PELANGGARAN("Pelanggaran")
}

enum class K3RecommendationType {
    COMPLIANCE_OK,
    SAFETY_WARNING,
    FATIGUE_ALERT,
    REST_SCHEDULE,
    LEGAL_NOTE
}

data class K3RecommendationItem(
    val type: K3RecommendationType,
    val title: String,
    val message: String,
    val legalRef: String,
    val severity: K3ComplianceStatus
)

data class K3DailyAuditItem(
    val date: String, // YYYY-MM-DD
    val dayName: String, // e.g. "Senin", "Selasa"
    val dayType: String, // WORKDAY, HOLIDAY_6_DAYS, HOLIDAY_5_DAYS
    val standardWorkHours: Double, // 8.0 or 7.0 or 0.0
    val actualWorkedHours: Double, // Dari presensi harian atau jam kerja standar
    val overtimeHours: Double, // Dari log lembur
    val totalWorkHours: Double, // actualWorkedHours + overtimeHours
    val maxAllowedOvertime: Double = 4.0, // Batas maksimal lembur harian (4 jam pada hari kerja)
    val isOvertimeViolated: Boolean, // Lembur melebihi 4 jam/hari kerja
    val isFatigueRisk: Boolean, // Total jam kerja > 12 jam/hari
    val violationReason: String? = null,
    val shiftType: String = "REGULAR",
    val notes: String = ""
)

data class K3WeeklyAuditItem(
    val weekNumber: Int, // 1..5
    val startDate: String,
    val endDate: String,
    val dateRangeLabel: String, // e.g. "01 - 07 Ags"
    val totalNormalHours: Double,
    val maxNormalHours: Double = 40.0, // 40 jam/minggu
    val totalOvertimeHours: Double,
    val maxOvertimeHours: Double = 18.0, // 18 jam/minggu PP 35/2021
    val totalCombinedHours: Double,
    val overtimeExcessHours: Double, // Jam lembur melebihi 18 jam
    val dailyViolationCount: Int, // Jumlah hari lembur > 4 jam
    val complianceStatus: K3ComplianceStatus,
    val dailyItems: List<K3DailyAuditItem>
)

data class K3AuditSummary(
    val periodYear: Int,
    val periodMonth: Int, // 1..12
    val periodLabel: String, // e.g. "Agustus 2026"
    val workScheduleScheme: String, // "5_DAYS" or "6_DAYS"
    val currentWeekOvertimeHours: Double,
    val currentWeekLimitProgress: Float, // 0.0f .. 1.0f+
    val totalMonthOvertimeHours: Double,
    val totalMonthNormalHours: Double,
    val totalMonthWorkHours: Double,
    val totalWeeklyViolations: Int,
    val totalDailyViolations: Int,
    val overallComplianceStatus: K3ComplianceStatus,
    val weeklyAudits: List<K3WeeklyAuditItem>,
    val dailyAudits: List<K3DailyAuditItem>,
    val recommendations: List<K3RecommendationItem>
)

/**
 * Engine Kalkulasi Audit K3 Kepatuhan Jam Kerja (Client-Side / Local)
 * Mengacu pada PP No. 35 Tahun 2021 Pasal 26, Permenaker No. 27/2021, & UU No. 6/2023.
 */
object K3AuditCalculator {

    private val indonesianMonthNames = arrayOf(
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    )

    private val dayNameIndo = mapOf(
        Calendar.SUNDAY to "Minggu",
        Calendar.MONDAY to "Senin",
        Calendar.TUESDAY to "Selasa",
        Calendar.WEDNESDAY to "Rabu",
        Calendar.THURSDAY to "Kamis",
        Calendar.FRIDAY to "Jumat",
        Calendar.SATURDAY to "Sabtu"
    )

    /**
     * Menjalankan Audit K3 untuk bulan & tahun tertentu.
     */
    fun performAudit(
        userProfile: UserProfile,
        overtimeLogs: List<OvertimeLog>,
        attendanceRecords: List<AttendanceRecord>,
        year: Int,
        month: Int // 1..12
    ): K3AuditSummary {
        val calendar = Calendar.getInstance(Locale("id"))
        calendar.set(Calendar.YEAR, year)
        calendar.set(Calendar.MONTH, month - 1)
        calendar.set(Calendar.DAY_OF_MONTH, 1)

        val daysInMonth = calendar.getActualMaximum(Calendar.DAY_OF_MONTH)
        val monthStr = if (month < 10) "0$month" else "$month"
        val periodLabel = "${indonesianMonthNames.getOrElse(month - 1) { "Bulan $month" }} $year"
        val is5DaysScheme = userProfile.workScheduleScheme == "5_DAYS"
        val standardDayHours = if (is5DaysScheme) 8.0 else 7.0

        // Peta data harian lembur & presensi
        val otByDate = overtimeLogs
            .filter { it.date.startsWith("$year-$monthStr") }
            .groupBy { it.date }
            .mapValues { entry -> entry.value.sumOf { it.hours } }

        val otDetailsByDate = overtimeLogs
            .filter { it.date.startsWith("$year-$monthStr") }
            .associateBy { it.date }

        val attByDate = attendanceRecords
            .filter { it.date.startsWith("$year-$monthStr") }
            .associateBy { it.date }

        val dailyItems = mutableListOf<K3DailyAuditItem>()

        for (day in 1..daysInMonth) {
            val dayStr = if (day < 10) "0$day" else "$day"
            val dateKey = "$year-$monthStr-$dayStr"

            calendar.set(Calendar.DAY_OF_MONTH, day)
            val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)
            val dayName = dayNameIndo[dayOfWeek] ?: "Hari"

            val isWeekendOff = if (is5DaysScheme) {
                dayOfWeek == Calendar.SATURDAY || dayOfWeek == Calendar.SUNDAY
            } else {
                dayOfWeek == Calendar.SUNDAY
            }

            val attendance = attByDate[dateKey]
            val overtimeHours = otByDate[dateKey] ?: 0.0
            val otDetail = otDetailsByDate[dateKey]

            val defaultWorkHours = if (isWeekendOff) {
                0.0
            } else if (!is5DaysScheme && dayOfWeek == Calendar.SATURDAY) {
                5.0 // Skema 6 hari kerja: Sabtu 5 jam
            } else {
                standardDayHours
            }

            val actualWorked = when {
                attendance != null -> {
                    if (attendance.status == "HADIR") {
                        if (attendance.workedHours > 0) attendance.workedHours else defaultWorkHours
                    } else {
                        0.0
                    }
                }
                isWeekendOff -> 0.0
                else -> defaultWorkHours
            }

            val dayType = when {
                otDetail != null -> otDetail.dayType
                isWeekendOff -> if (is5DaysScheme) "HOLIDAY_5_DAYS" else "HOLIDAY_6_DAYS"
                else -> "WORKDAY"
            }

            val isWorkday = dayType == "WORKDAY" || (!isWeekendOff && dayType.isBlank())
            val maxAllowedOt = if (isWorkday) 4.0 else 11.0 // Batas 4 jam lembur di hari kerja biasa (PP 35/2021)
            val isOtViolated = isWorkday && overtimeHours > 4.0
            val totalDayWork = actualWorked + overtimeHours
            val isFatigue = totalDayWork > 12.0

            val reason = when {
                isOtViolated && isFatigue -> "Lembur melebihi 4 jam (${String.format(Locale.US, "%.1f", overtimeHours)} jam) & total kerja > 12 jam (Risiko Fatigue K3)"
                isOtViolated -> "Lembur hari kerja melebihi batas regulasi 4 jam/hari (${String.format(Locale.US, "%.1f", overtimeHours)} jam)"
                isFatigue -> "Total durasi kerja harian mencapai ${String.format(Locale.US, "%.1f", totalDayWork)} jam (Batas aman K3: <= 12 jam)"
                else -> null
            }

            dailyItems.add(
                K3DailyAuditItem(
                    date = dateKey,
                    dayName = dayName,
                    dayType = dayType,
                    standardWorkHours = defaultWorkHours,
                    actualWorkedHours = actualWorked,
                    overtimeHours = overtimeHours,
                    totalWorkHours = totalDayWork,
                    maxAllowedOvertime = maxAllowedOt,
                    isOvertimeViolated = isOtViolated,
                    isFatigueRisk = isFatigue,
                    violationReason = reason,
                    shiftType = otDetail?.shiftType ?: "REGULAR",
                    notes = attendance?.notes ?: (otDetail?.taskDescription ?: "")
                )
            )
        }

        // Kelompokkan per minggu (Minggu 1: Tgl 1-7, Minggu 2: 8-14, Minggu 3: 15-21, Minggu 4: 22-28, Minggu 5: 29-akhir)
        val weeklyAudits = mutableListOf<K3WeeklyAuditItem>()
        val weekRanges = listOf(
            1 to 7,
            8 to 14,
            15 to 21,
            22 to 28,
            29 to daysInMonth
        ).filter { it.first <= daysInMonth }

        for ((wIdx, range) in weekRanges.withIndex()) {
            val weekNum = wIdx + 1
            val startDay = range.first
            val endDay = minOf(range.second, daysInMonth)

            val weekDailyItems = dailyItems.filter { item ->
                val dayNum = item.date.takeLast(2).toIntOrNull() ?: 1
                dayNum in startDay..endDay
            }

            val totalNormal = weekDailyItems.sumOf { it.actualWorkedHours }
            val totalOt = weekDailyItems.sumOf { it.overtimeHours }
            val totalCombined = totalNormal + totalOt
            val otExcess = maxOf(0.0, totalOt - 18.0)
            val dailyViolations = weekDailyItems.count { it.isOvertimeViolated }

            val status = when {
                totalOt > 18.0 || dailyViolations > 0 -> K3ComplianceStatus.PELANGGARAN
                totalOt >= 13.0 -> K3ComplianceStatus.WASPADA
                else -> K3ComplianceStatus.AMAN
            }

            val startStr = if (startDay < 10) "0$startDay" else "$startDay"
            val endStr = if (endDay < 10) "0$endDay" else "$endDay"
            val monthShort = indonesianMonthNames.getOrElse(month - 1) { "Bln" }.take(3)

            weeklyAudits.add(
                K3WeeklyAuditItem(
                    weekNumber = weekNum,
                    startDate = "$year-$monthStr-$startStr",
                    endDate = "$year-$monthStr-$endStr",
                    dateRangeLabel = "$startStr - $endStr $monthShort",
                    totalNormalHours = totalNormal,
                    maxNormalHours = 40.0,
                    totalOvertimeHours = totalOt,
                    maxOvertimeHours = 18.0,
                    totalCombinedHours = totalCombined,
                    overtimeExcessHours = otExcess,
                    dailyViolationCount = dailyViolations,
                    complianceStatus = status,
                    dailyItems = weekDailyItems
                )
            )
        }

        // Evaluasi Minggu Berjalan (Current Week)
        val nowCal = Calendar.getInstance(Locale("id"))
        val currentDay = nowCal.get(Calendar.DAY_OF_MONTH)
        val isCurrentMonth = nowCal.get(Calendar.YEAR) == year && (nowCal.get(Calendar.MONTH) + 1) == month

        val activeWeeklyAudit = if (isCurrentMonth) {
            weeklyAudits.find { w ->
                val startDay = w.startDate.takeLast(2).toIntOrNull() ?: 1
                val endDay = w.endDate.takeLast(2).toIntOrNull() ?: 31
                currentDay in startDay..endDay
            } ?: weeklyAudits.lastOrNull()
        } else {
            weeklyAudits.lastOrNull()
        }

        val currentWeekOt = activeWeeklyAudit?.totalOvertimeHours ?: 0.0
        val currentWeekProgress = (currentWeekOt / 18.0).toFloat().coerceIn(0.0f, 2.0f)

        val totalMonthOt = weeklyAudits.sumOf { it.totalOvertimeHours }
        val totalMonthNormal = weeklyAudits.sumOf { it.totalNormalHours }
        val totalMonthWork = totalMonthNormal + totalMonthOt

        val totalWeeklyViolations = weeklyAudits.count { it.totalOvertimeHours > 18.0 }
        val totalDailyViolations = dailyItems.count { it.isOvertimeViolated }

        val overallStatus = when {
            totalWeeklyViolations > 0 || totalDailyViolations > 0 -> K3ComplianceStatus.PELANGGARAN
            weeklyAudits.any { it.complianceStatus == K3ComplianceStatus.WASPADA } || currentWeekOt >= 13.0 -> K3ComplianceStatus.WASPADA
            else -> K3ComplianceStatus.AMAN
        }

        // Generate Rekomendasi K3 Rule-Based
        val recommendations = generateK3Recommendations(
            userProfile = userProfile,
            currentWeekOt = currentWeekOt,
            totalMonthOt = totalMonthOt,
            weeklyAudits = weeklyAudits,
            dailyItems = dailyItems,
            overallStatus = overallStatus
        )

        return K3AuditSummary(
            periodYear = year,
            periodMonth = month,
            periodLabel = periodLabel,
            workScheduleScheme = userProfile.workScheduleScheme,
            currentWeekOvertimeHours = currentWeekOt,
            currentWeekLimitProgress = currentWeekProgress,
            totalMonthOvertimeHours = totalMonthOt,
            totalMonthNormalHours = totalMonthNormal,
            totalMonthWorkHours = totalMonthWork,
            totalWeeklyViolations = totalWeeklyViolations,
            totalDailyViolations = totalDailyViolations,
            overallComplianceStatus = overallStatus,
            weeklyAudits = weeklyAudits,
            dailyAudits = dailyItems,
            recommendations = recommendations
        )
    }

    /**
     * Rule-based Engine Penghasil Rekomendasi K3 Mandiri
     */
    private fun generateK3Recommendations(
        userProfile: UserProfile,
        currentWeekOt: Double,
        totalMonthOt: Double,
        weeklyAudits: List<K3WeeklyAuditItem>,
        dailyItems: List<K3DailyAuditItem>,
        overallStatus: K3ComplianceStatus
    ): List<K3RecommendationItem> {
        val list = mutableListOf<K3RecommendationItem>()

        // 1. Rekomendasi Batas Lembur Mingguan (18 Jam)
        if (currentWeekOt > 18.0) {
            val excess = currentWeekOt - 18.0
            list.add(
                K3RecommendationItem(
                    type = K3RecommendationType.SAFETY_WARNING,
                    title = "Pelanggaran Batas Lembur Mingguan!",
                    message = "Akumulasi lembur minggu ini telah mencapai ${String.format(Locale.US, "%.1f", currentWeekOt)} jam (melebihi batas normatif sebesar ${String.format(Locale.US, "%.1f", excess)} jam). Wajib hentikan lembur tambahan untuk menjaga kesehatan dan keselamatan kerja.",
                    legalRef = "PP No. 35/2021 Pasal 26 Ayat (1)",
                    severity = K3ComplianceStatus.PELANGGARAN
                )
            )
        } else if (currentWeekOt >= 13.0) {
            val remaining = 18.0 - currentWeekOt
            list.add(
                K3RecommendationItem(
                    type = K3RecommendationType.SAFETY_WARNING,
                    title = "Peringatan Waspada: Kuota Lembur Menipis",
                    message = "Lembur minggu ini sudah ${String.format(Locale.US, "%.1f", currentWeekOt)}/18 jam. Batasi sisa lembur maksimal ${String.format(Locale.US, "%.1f", remaining)} jam lagi dalam pekan ini agar tidak melanggar ketentuan perundang-undangan.",
                    legalRef = "PP No. 35/2021 Pasal 26 Ayat (1)",
                    severity = K3ComplianceStatus.WASPADA
                )
            )
        } else {
            val remaining = 18.0 - currentWeekOt
            list.add(
                K3RecommendationItem(
                    type = K3RecommendationType.COMPLIANCE_OK,
                    title = "Kuota Lembur Pekan Ini Terkendali",
                    message = "Lembur minggu ini berada di ${String.format(Locale.US, "%.1f", currentWeekOt)}/18 jam. Sisa kuota aman adalah ${String.format(Locale.US, "%.1f", remaining)} jam.",
                    legalRef = "PP No. 35/2021 Pasal 26 Ayat (1)",
                    severity = K3ComplianceStatus.AMAN
                )
            )
        }

        // 2. Evaluasi Lembur Harian (> 4 Jam)
        val dailyViolations = dailyItems.filter { it.isOvertimeViolated }
        if (dailyViolations.isNotEmpty()) {
            val datesStr = dailyViolations.take(3).joinToString(", ") { "${it.dayName} (${it.date.takeLast(5)})" }
            list.add(
                K3RecommendationItem(
                    type = K3RecommendationType.FATIGUE_ALERT,
                    title = "Pelanggaran Lembur Harian (${dailyViolations.size} Hari)",
                    message = "Terdeteksi ${dailyViolations.size} hari dengan durasi lembur melebihi batas legal 4 jam/hari kerja (contoh: $datesStr). Lembur berlebih memicu kelelahan ekstrem (fatigue) dan risiko insiden kerja.",
                    legalRef = "Permenaker No. 27/2021 & PP 35/2021",
                    severity = K3ComplianceStatus.PELANGGARAN
                )
            )
        }

        // 3. Evaluasi Fatigue (> 12 Jam Total Kerja Sehari)
        val fatigueDays = dailyItems.filter { it.isFatigueRisk }
        if (fatigueDays.isNotEmpty()) {
            list.add(
                K3RecommendationItem(
                    type = K3RecommendationType.FATIGUE_ALERT,
                    title = "Peringatan Risiko Fatigue / Kelelahan Tinggi",
                    message = "Terdapat ${fatigueDays.size} hari dengan jam kerja total (normal + lembur) di atas 12 jam sehari. Pastikan istirahat minimal 12 jam antar-shift dan lakukan relaksasi ergonomis.",
                    legalRef = "Standar Manajemen Kelelahan Kerja K3",
                    severity = K3ComplianceStatus.WASPADA
                )
            )
        }

        // 4. Hak Istirahat Mingguan (PP 35/2021)
        val schemeName = if (userProfile.workScheduleScheme == "5_DAYS") "5 Hari Kerja (8 jam/hari)" else "6 Hari Kerja (7 jam/hari)"
        list.add(
            K3RecommendationItem(
                type = K3RecommendationType.REST_SCHEDULE,
                title = "Hak Istirahat Mingguan: Skema $schemeName",
                message = if (userProfile.workScheduleScheme == "5_DAYS") {
                    "Karyawan berhak atas istirahat mingguan minimal 2 hari (Sabtu & Minggu) setelah 5 hari kerja normal (total 40 jam/minggu)."
                } else {
                    "Karyawan berhak atas istirahat mingguan minimal 1 hari (Minggu) setelah 6 hari kerja normal (total 40 jam/minggu)."
                },
                legalRef = "UU No. 13/2003 Jo. UU No. 6/2023 Pasal 79",
                severity = K3ComplianceStatus.AMAN
            )
        )

        // 5. Total Akumulasi Lembur Bulanan
        if (totalMonthOt > 50.0) {
            list.add(
                K3RecommendationItem(
                    type = K3RecommendationType.LEGAL_NOTE,
                    title = "Akumulasi Lembur Bulanan Tinggi (${String.format(Locale.US, "%.1f", totalMonthOt)} Jam)",
                    message = "Total lembur bulan ini sudah mencapai ${String.format(Locale.US, "%.1f", totalMonthOt)} jam. Pertimbangkan evaluasi beban kerja bersama tim operasional atau pengawas K3 perusahaan.",
                    legalRef = "Pedoman Audit Kepatuhan Norma Ketenagakerjaan",
                    severity = K3ComplianceStatus.WASPADA
                )
            )
        }

        return list
    }
}
