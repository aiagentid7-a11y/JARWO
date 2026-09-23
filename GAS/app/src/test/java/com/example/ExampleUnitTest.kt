package com.example

import com.example.data.model.OvertimeLog
import com.example.domain.calculator.IndonesianPayrollCalculators
import org.junit.Assert.*
import org.junit.Test

class ExampleUnitTest {
    @Test
    fun addition_isCorrect() {
        assertEquals(4, 2 + 2)
    }

    @Test
    fun testOvertimeLogWithRitaseAndHm() {
        val log = OvertimeLog(
            id = 1L,
            date = "2026-08-27",
            dayType = "WORKDAY",
            hours = 4.0,
            hourlyRate = 28901.73,
            overtimeMultiplierHours = 7.0,
            totalAmount = 202312.11,
            taskDescription = "Hauling OB Pit 3",
            shiftType = "SHIFT_MALAM",
            ritaseCount = 12,
            ritaseRate = 25000.0,
            hmStart = 1500.0,
            hmEnd = 1504.0,
            hmTotal = 4.0,
            unitCode = "DT-08",
            materialType = "Overburden (OB)"
        )

        assertEquals(12, log.ritaseCount)
        assertEquals(25000.0, log.ritaseRate, 0.01)
        assertEquals(1500.0, log.hmStart, 0.01)
        assertEquals(1504.0, log.hmEnd, 0.01)
        assertEquals(4.0, log.hmTotal, 0.01)
        assertEquals("DT-08", log.unitCode)
        assertEquals("Overburden (OB)", log.materialType)
        assertEquals(300000.0, log.ritaseCount * log.ritaseRate, 0.01)
    }

    @Test
    fun testIndonesianOvertimeWorkdayCalculation() {
        val fixedSalary = 5000000.0
        val result = IndonesianPayrollCalculators.calculateOvertime(
            hours = 4.0,
            totalFixedSalary = fixedSalary,
            dayType = "WORKDAY"
        )
        // 1st hour: 1.5x, next 3 hours: 2.0x -> multiplier = 1.5 + 6.0 = 7.5 hours
        assertEquals(7.5, result.multiplierHours, 0.01)
        val expectedHourly = fixedSalary / 173.0
        assertEquals(expectedHourly * 7.5, result.totalAmount, 0.1)
    }

    @Test
    fun testRoster82DailyAndWeeklyScheduleGeneration() {
        // 1. Roster 8:2 Harian (10 Hari Siklus: 8 Hari Kerja, 2 Hari Libur)
        val dailyRoster = IndonesianPayrollCalculators.generateRosterSchedule(
            patternType = IndonesianPayrollCalculators.RosterPatternType.ROSTER_8_2,
            roster82Mode = "4_PAGI_4_MALAM"
        )
        assertEquals(10, dailyRoster.size)
        assertEquals(8, dailyRoster.count { !it.isDayOff })
        assertEquals(2, dailyRoster.count { it.isDayOff })
        assertEquals(IndonesianPayrollCalculators.WorkShiftType.SHIFT_PAGI, dailyRoster[0].shiftType)
        assertEquals(IndonesianPayrollCalculators.WorkShiftType.SHIFT_MALAM, dailyRoster[4].shiftType)
        assertTrue(dailyRoster[8].isDayOff)
        assertTrue(dailyRoster[9].isDayOff)

        // 2. Roster 8:2 Mingguan (10 Minggu / 70 Hari Siklus: 8 Minggu ON Site, 2 Minggu Field Break)
        val weeklyRoster = IndonesianPayrollCalculators.generateRosterSchedule(
            patternType = IndonesianPayrollCalculators.RosterPatternType.ROSTER_8_2_WEEKS,
            roster82Mode = "WEEKS_12H_SHIFT"
        )
        assertEquals(70, weeklyRoster.size)
        // 8 weeks on site = 56 work days, 2 weeks field break = 14 off days
        assertEquals(56, weeklyRoster.count { !it.isDayOff })
        assertEquals(14, weeklyRoster.count { it.isDayOff })
        assertTrue(weeklyRoster.take(56).all { !it.isDayOff })
        assertTrue(weeklyRoster.takeLast(14).all { it.isDayOff })

        // Summary Calculation
        val summary = IndonesianPayrollCalculators.calculateRosterCycleSummary(
            patternType = IndonesianPayrollCalculators.RosterPatternType.ROSTER_8_2_WEEKS,
            rosterItems = weeklyRoster,
            totalFixedSalary = 6000000.0,
            shiftAllowancePerDay = 50000.0
        )
        assertEquals(70, summary.totalCycleDays)
        assertEquals(56, summary.totalWorkDays)
        assertEquals(14, summary.totalOffDays)
        assertEquals(80.0, summary.workPercentage, 0.1) // 56 / 70 = 80%
        assertEquals(56 * 50000.0, summary.estimatedShiftAllowance, 0.1)
    }

    @Test
    fun testAttendanceAllowanceCalculator() {
        val days = 22
        val mealRate = 25000.0
        val transportRate = 15000.0

        val resultBoth = IndonesianPayrollCalculators.calculateAttendanceAllowances(
            attendanceDays = days,
            mealRatePerDay = mealRate,
            transportRatePerDay = transportRate,
            isMealEnabled = true,
            isTransportEnabled = true
        )
        assertEquals(22, resultBoth.attendanceDays)
        assertEquals(550000.0, resultBoth.totalMealAllowance, 0.01) // 22 * 25000
        assertEquals(330000.0, resultBoth.totalTransportAllowance, 0.01) // 22 * 15000
        assertEquals(880000.0, resultBoth.grandTotal, 0.01)

        val resultMealOnly = IndonesianPayrollCalculators.calculateAttendanceAllowances(
            attendanceDays = 20,
            mealRatePerDay = 30000.0,
            transportRatePerDay = 20000.0,
            isMealEnabled = true,
            isTransportEnabled = false
        )
        assertEquals(600000.0, resultMealOnly.totalMealAllowance, 0.01)
        assertEquals(0.0, resultMealOnly.totalTransportAllowance, 0.01)
        assertEquals(600000.0, resultMealOnly.grandTotal, 0.01)
    }

    @Test
    fun testK3AuditCalculationAndOvertimeLimits() {
        val userProfile = com.example.data.model.UserProfile(
            fullName = "Budi Pratama",
            nik = "EMP-001",
            companyName = "PT Berkah Abadi",
            jobTitle = "Operator Excavator",
            workScheduleScheme = "5_DAYS"
        )

        // Buat overtime logs untuk Agustus 2026
        // Hari 1: 5 jam (melebihi batas 4 jam/hari) -> daily violation
        // Hari 2: 4 jam
        // Hari 3: 4 jam
        // Hari 4: 4 jam
        // Hari 5: 3 jam (Total minggu 1 = 20 jam -> melebihi 18 jam/minggu -> weekly violation)
        val overtimes = listOf(
            OvertimeLog(id = 1, date = "2026-08-03", hours = 5.0, dayType = "WORKDAY", hourlyRate = 30000.0, overtimeMultiplierHours = 9.5, totalAmount = 285000.0),
            OvertimeLog(id = 2, date = "2026-08-04", hours = 4.0, dayType = "WORKDAY", hourlyRate = 30000.0, overtimeMultiplierHours = 7.5, totalAmount = 225000.0),
            OvertimeLog(id = 3, date = "2026-08-05", hours = 4.0, dayType = "WORKDAY", hourlyRate = 30000.0, overtimeMultiplierHours = 7.5, totalAmount = 225000.0),
            OvertimeLog(id = 4, date = "2026-08-06", hours = 4.0, dayType = "WORKDAY", hourlyRate = 30000.0, overtimeMultiplierHours = 7.5, totalAmount = 225000.0),
            OvertimeLog(id = 5, date = "2026-08-07", hours = 3.0, dayType = "WORKDAY", hourlyRate = 30000.0, overtimeMultiplierHours = 5.5, totalAmount = 165000.0)
        )

        val attendances = listOf(
            com.example.data.model.AttendanceRecord(id = 1, date = "2026-08-03", status = "HADIR", checkInTime = "08:00", checkOutTime = "17:00", workedHours = 8.0),
            com.example.data.model.AttendanceRecord(id = 2, date = "2026-08-04", status = "HADIR", checkInTime = "08:00", checkOutTime = "17:00", workedHours = 8.0),
            com.example.data.model.AttendanceRecord(id = 3, date = "2026-08-05", status = "HADIR", checkInTime = "08:00", checkOutTime = "17:00", workedHours = 8.0),
            com.example.data.model.AttendanceRecord(id = 4, date = "2026-08-06", status = "HADIR", checkInTime = "08:00", checkOutTime = "17:00", workedHours = 8.0),
            com.example.data.model.AttendanceRecord(id = 5, date = "2026-08-07", status = "HADIR", checkInTime = "08:00", checkOutTime = "17:00", workedHours = 8.0)
        )

        val summary = com.example.domain.calculator.K3AuditCalculator.performAudit(
            userProfile = userProfile,
            overtimeLogs = overtimes,
            attendanceRecords = attendances,
            year = 2026,
            month = 8
        )

        assertEquals(20.0, summary.totalMonthOvertimeHours, 0.01)
        assertEquals(com.example.domain.calculator.K3ComplianceStatus.PELANGGARAN, summary.overallComplianceStatus)
        assertTrue(summary.totalDailyViolations >= 1)
        assertTrue(summary.totalWeeklyViolations >= 1)
        assertTrue(summary.recommendations.isNotEmpty())
    }

    @Test
    fun testUserProfilePerAttendanceAllowanceDefaultsToZero() {
        // When in PER_ATTENDANCE mode, meal and transport in profile must be 0.0 (not hardcoded to 22 days)
        val profile = com.example.data.model.UserProfile(
            basicSalary = 5000000.0,
            fixedAllowance = 1000000.0,
            mealAllowancePerDay = 25000.0,
            transportAllowancePerDay = 20000.0,
            allowanceCalculationMode = "PER_ATTENDANCE"
        )

        // Allowance in profile starts at 0.0 before any attendance records are accrued
        assertEquals(1000000.0, profile.totalAllowances, 0.01)
        assertEquals(6000000.0, profile.totalRegularSalary, 0.01)
    }
}

