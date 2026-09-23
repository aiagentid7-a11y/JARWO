package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.domain.calculator.IndonesianPayrollCalculators
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

  @Test
  fun `read string from context`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val appName = context.getString(R.string.app_name)
    assertEquals("GAS", appName)
  }

  @Test
  fun `test statutory non-quota leaves completeness according to Indonesian Labor Law`() {
    val leaves = IndonesianPayrollCalculators.getAllStatutoryLeaves()
    assertTrue("Harus memiliki minimal 15 jenis hak cuti/izin normatif", leaves.size >= 15)

    // Verify UU KIA No. 4/2024 Cuti Melahirkan (Non-Potong)
    val maternity = IndonesianPayrollCalculators.findStatutoryLeave("MELAHIRKAN")
    org.junit.Assert.assertNotNull(maternity)
    assertEquals(false, maternity?.isQuotaDeductible)
    assertEquals(90, maternity?.defaultDays)

    // Verify UU KIA No. 4/2024 Cuti Keguguran (Non-Potong)
    val miscarriage = IndonesianPayrollCalculators.findStatutoryLeave("KEGUGURAN")
    org.junit.Assert.assertNotNull(miscarriage)
    assertEquals(false, miscarriage?.isQuotaDeductible)
    assertEquals(45, miscarriage?.defaultDays)

    // Verify UU 13/2003 Ps 81 Cuti Haid (Non-Potong)
    val menstrual = IndonesianPayrollCalculators.findStatutoryLeave("CUTI_HAID")
    org.junit.Assert.assertNotNull(menstrual)
    assertEquals(false, menstrual?.isQuotaDeductible)
    assertEquals(2, menstrual?.defaultDays)

    // Verify UU KIA & UU 13/2003 Suami Dampingi Istri Melahirkan (Non-Potong)
    val paternity = IndonesianPayrollCalculators.findStatutoryLeave("PENDAMPINGAN_MELAHIRKAN")
    org.junit.Assert.assertNotNull(paternity)
    assertEquals(false, paternity?.isQuotaDeductible)

    // Verify Pasal 93 ayat 4 UU 13/2003 Pernikahan Karyawan (3 hari, Non-Potong)
    val marriage = IndonesianPayrollCalculators.findStatutoryLeave("MENIKAH_SENDIRI")
    org.junit.Assert.assertNotNull(marriage)
    assertEquals(false, marriage?.isQuotaDeductible)
    assertEquals(3, marriage?.defaultDays)

    // Verify Pasal 93 ayat 4 Menikahkan Anak (2 hari, Non-Potong)
    val childMarriage = IndonesianPayrollCalculators.findStatutoryLeave("MENIKAHKAN_ANAK")
    org.junit.Assert.assertNotNull(childMarriage)
    assertEquals(false, childMarriage?.isQuotaDeductible)
    assertEquals(2, childMarriage?.defaultDays)

    // Verify Cuti Bersama SKB 3 Menteri (Potong Kuota 12 Hari)
    val cutiBersama = IndonesianPayrollCalculators.findStatutoryLeave("CUTI_BERSAMA")
    org.junit.Assert.assertNotNull(cutiBersama)
    assertEquals(true, cutiBersama?.isQuotaDeductible)

    // Verify Cuti Tahunan Pribadi (Potong Kuota 12 Hari)
    val annual = IndonesianPayrollCalculators.findStatutoryLeave("TAHUNAN")
    org.junit.Assert.assertNotNull(annual)
    assertEquals(true, annual?.isQuotaDeductible)

    // Verify Kesehatan & Sakit Medis
    val sakit = IndonesianPayrollCalculators.findStatutoryLeave("SAKIT_DOKTER")
    org.junit.Assert.assertNotNull(sakit)
    assertEquals(false, sakit?.isQuotaDeductible)
    assertEquals(IndonesianPayrollCalculators.StatutoryLeaveCategory.SAKIT_KESEHATAN, sakit?.category)

    // Verify Ibadah Keagamaan Wajib
    val ibadah = IndonesianPayrollCalculators.findStatutoryLeave("IBADAH_HAJI_UMRAH")
    org.junit.Assert.assertNotNull(ibadah)
    assertEquals(false, ibadah?.isQuotaDeductible)
    assertEquals(IndonesianPayrollCalculators.StatutoryLeaveCategory.IBADAH_KEAGAMAAN, ibadah?.category)

    // Verify Tugas Negara / Serikat
    val tugasNegara = IndonesianPayrollCalculators.findStatutoryLeave("TUGAS_NEGARA_SERIKAT")
    org.junit.Assert.assertNotNull(tugasNegara)
    assertEquals(false, tugasNegara?.isQuotaDeductible)
    assertEquals(IndonesianPayrollCalculators.StatutoryLeaveCategory.TUGAS_NEGARA, tugasNegara?.category)
  }

  @Test
  fun `test JKP benefit calculation PP 6 Tahun 2025`() {
    val result = IndonesianPayrollCalculators.calculateJkpBenefit(
      salary = 6_000_000.0,
      hasPaidMin12MonthsIn24Months = true
    )
    // Capped at Rp 5.000.000
    assertEquals(5_000_000.0, result.cappedSalary, 0.01)
    // PP 6/2025: 60% per bulan = Rp 3.000.000
    assertEquals(3_000_000.0, result.monthlyCashBenefit, 0.01)
    assertEquals(3_000_000.0, result.month1To3MonthlyCash, 0.01)
    assertEquals(3_000_000.0, result.month4To6MonthlyCash, 0.01)
    // Total 6 bulan = 6 x Rp 3.000.000 = Rp 18.000.000
    assertEquals(18_000_000.0, result.totalCashBenefit6Months, 0.01)
    assertTrue(result.isEligible)
    assertTrue(result.isContractWorkerProtected)
    assertTrue(result.isBankruptcyProtected)
  }

  @Test
  fun `test STMB JKK daily benefit calculation for 5 10 14 21 days`() {
    val salary = 6_000_000.0 // Upah harian = 6.000.000 / 30 = 200.000
    val dailyWage = salary / 30.0
    assertEquals(200_000.0, dailyWage, 0.01)

    // 5 Hari
    val stmb5 = IndonesianPayrollCalculators.calculateStmbDetail(salary, 5, monthPeriod = 1)
    assertEquals(5, stmb5.daysCount)
    assertEquals(1.00, stmb5.percentage, 0.01)
    assertEquals(1_000_000.0, stmb5.totalBenefit, 0.01)

    // 10 Hari
    val stmb10 = IndonesianPayrollCalculators.calculateStmbDetail(salary, 10, monthPeriod = 1)
    assertEquals(10, stmb10.daysCount)
    assertEquals(2_000_000.0, stmb10.totalBenefit, 0.01)

    // 14 Hari (2 Minggu)
    val stmb14 = IndonesianPayrollCalculators.calculateStmbDetail(salary, 14, monthPeriod = 1)
    assertEquals(14, stmb14.daysCount)
    assertEquals(2_800_000.0, stmb14.totalBenefit, 0.01)

    // 21 Hari (3 Minggu)
    val stmb21 = IndonesianPayrollCalculators.calculateStmbDetail(salary, 21, monthPeriod = 1)
    assertEquals(21, stmb21.daysCount)
    assertEquals(4_200_000.0, stmb21.totalBenefit, 0.01)

    // Period > 12 Months (50% Rate)
    val stmb14After12Months = IndonesianPayrollCalculators.calculateStmbDetail(salary, 14, monthPeriod = 13)
    assertEquals(0.50, stmb14After12Months.percentage, 0.01)
    assertEquals(1_400_000.0, stmb14After12Months.totalBenefit, 0.01)
  }

  @Test
  fun `test JP benefit calculation for 15 years eligible for monthly pension`() {
    val salary = 8_000_000.0
    val result = IndonesianPayrollCalculators.calculateJpBenefit(
      monthlySalary = salary,
      contributionYears = 15.0
    )

    assertTrue(result.isEligibleForMonthlyPension)
    assertEquals(180, result.contributionMonths)
    assertEquals(59, result.currentRetirementAge)
    // 1% x 15 years x 8.000.000 = 1.200.000
    assertEquals(1_200_000.0, result.monthlyPensionEstimate, 0.01)
    // Janda/Duda 50% = 600.000
    assertEquals(600_000.0, result.jandaDudaMonthlyBenefit, 0.01)
    // Anak 50% = 600.000
    assertEquals(600_000.0, result.anakMonthlyBenefit, 0.01)
    // Orang tua 20% = 240.000
    assertEquals(240_000.0, result.orangTuaMonthlyBenefit, 0.01)
    // Cacat total 100% = 1.200.000
    assertEquals(1_200_000.0, result.cacatTotalMonthlyBenefit, 0.01)

    // Contributions breakdown (1% employee, 2% employer, 3% total)
    assertEquals(80_000.0, result.contributionEmployee, 0.01)
    assertEquals(160_000.0, result.contributionEmployer, 0.01)
    assertEquals(240_000.0, result.totalMonthlyContribution, 0.01)
  }

  @Test
  fun `test JP benefit calculation for under 15 years lump sum`() {
    val salary = 8_000_000.0
    val result = IndonesianPayrollCalculators.calculateJpBenefit(
      monthlySalary = salary,
      contributionYears = 5.0
    )

    org.junit.Assert.assertFalse(result.isEligibleForMonthlyPension)
    assertEquals(60, result.contributionMonths)
    // 60 months * 240.000 = 14.400.000 total principal contribution
    assertEquals(14_400_000.0, result.totalContributionsAccumulated, 0.01)
    assertTrue(result.estimatedInvestmentYield > 0)
    assertTrue(result.lumpSumEstimate > result.totalContributionsAccumulated)
  }

  @Test
  fun `test JP wage cap maximum ceiling`() {
    val highSalary = 20_000_000.0
    val result = IndonesianPayrollCalculators.calculateJpBenefit(
      monthlySalary = highSalary,
      contributionYears = 20.0
    )
    // Capped at Rp 10.042.300
    assertEquals(10_042_300.0, result.cappedSalary, 0.01)
    assertEquals(100_423.0, result.contributionEmployee, 0.01)
    assertEquals(200_846.0, result.contributionEmployer, 0.01)
    assertEquals(301_269.0, result.totalMonthlyContribution, 0.01)
  }

  @Test
  fun `test Roster 8-2 schedule generation and cycle summary`() {
    // 1. Generate Roster 8:2 (4 Pagi + 4 Malam + 2 OFF)
    val roster82 = IndonesianPayrollCalculators.generateRosterSchedule(
      patternType = IndonesianPayrollCalculators.RosterPatternType.ROSTER_8_2,
      roster82Mode = "4_PAGI_4_MALAM"
    )

    assertEquals(10, roster82.size)
    // First 8 days must be work days (ON)
    for (i in 0..7) {
      org.junit.Assert.assertFalse("Hari ke-${i+1} harus hari kerja", roster82[i].isDayOff)
    }
    // Days 1-4: Shift Pagi
    for (i in 0..3) {
      assertEquals(IndonesianPayrollCalculators.WorkShiftType.SHIFT_PAGI, roster82[i].shiftType)
    }
    // Days 5-8: Shift Malam
    for (i in 4..7) {
      assertEquals(IndonesianPayrollCalculators.WorkShiftType.SHIFT_MALAM, roster82[i].shiftType)
    }
    // Days 9-10: OFF
    for (i in 8..9) {
      assertTrue("Hari ke-${i+1} harus OFF", roster82[i].isDayOff)
    }

    // 2. Test Cycle Summary Calculation
    val salary = 6_000_000.0
    val shiftAllowance = 25_000.0
    val summary = IndonesianPayrollCalculators.calculateRosterCycleSummary(
      patternType = IndonesianPayrollCalculators.RosterPatternType.ROSTER_8_2,
      rosterItems = roster82,
      totalFixedSalary = salary,
      shiftAllowancePerDay = shiftAllowance
    )

    assertEquals(10, summary.totalCycleDays)
    assertEquals(8, summary.totalWorkDays)
    assertEquals(2, summary.totalOffDays)
    assertEquals(80.0, summary.workPercentage, 0.01)
    assertEquals(64.0, summary.totalNormalWorkHours, 0.01) // 8 days x 8 hours
    assertEquals(8 * 25_000.0, summary.estimatedShiftAllowance, 0.01) // Rp 200.000
    assertEquals(6.0, summary.monthlyOffDaysEstimate, 0.01) // (30 / 10) * 2 = 6 hari libur per bulan

    // 3. Test Roster 8:2 with Long Shift 12 Hours (Includes 4h Overtime)
    val roster82LongShift = IndonesianPayrollCalculators.generateRosterSchedule(
      patternType = IndonesianPayrollCalculators.RosterPatternType.ROSTER_8_2,
      roster82Mode = "8_LONG_SHIFT"
    )
    val longShiftSummary = IndonesianPayrollCalculators.calculateRosterCycleSummary(
      patternType = IndonesianPayrollCalculators.RosterPatternType.ROSTER_8_2,
      rosterItems = roster82LongShift,
      totalFixedSalary = salary,
      shiftAllowancePerDay = shiftAllowance
    )
    assertEquals(32.0, longShiftSummary.totalOvertimeHours, 0.01) // 8 days x 4h OT
    assertTrue(longShiftSummary.estimatedOvertimePay > 0)
  }
}

