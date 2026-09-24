package com.aiagentid7.payrollemployee.data.local

import androidx.room.*
import com.aiagentid7.payrollemployee.data.model.*
import kotlinx.coroutines.flow.Flow

@Dao
interface UserProfileDao {
    @Query("SELECT * FROM user_profile WHERE id = 1 LIMIT 1")
    fun getUserProfile(): Flow<UserProfile?>

    @Query("SELECT * FROM user_profile WHERE id = 1 LIMIT 1")
    suspend fun getUserProfileDirect(): UserProfile?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(profile: UserProfile)

    @Query("DELETE FROM user_profile")
    suspend fun clearProfile()
}

@Dao
interface OvertimeLogDao {
    @Query("SELECT * FROM overtime_logs ORDER BY date DESC, id DESC")
    fun getAllLogs(): Flow<List<OvertimeLog>>

    @Query("SELECT * FROM overtime_logs WHERE date LIKE :monthPrefix || '%' ORDER BY date ASC")
    fun getLogsForMonth(monthPrefix: String): Flow<List<OvertimeLog>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: OvertimeLog): Long

    @Delete
    suspend fun deleteLog(log: OvertimeLog)

    @Query("DELETE FROM overtime_logs WHERE id = :id")
    suspend fun deleteLogById(id: Long)

    @Query("DELETE FROM overtime_logs")
    suspend fun clearAllLogs()
}

@Dao
interface LeaveRecordDao {
    @Query("SELECT * FROM leave_records ORDER BY startDate DESC, id DESC")
    fun getAllRecords(): Flow<List<LeaveRecord>>

    @Query("SELECT * FROM leave_records WHERE startDate LIKE :yearPrefix || '%'")
    fun getRecordsForYear(yearPrefix: String): Flow<List<LeaveRecord>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecord(record: LeaveRecord): Long

    @Delete
    suspend fun deleteRecord(record: LeaveRecord)

    @Query("DELETE FROM leave_records WHERE id = :id")
    suspend fun deleteRecordById(id: Long)

    @Query("DELETE FROM leave_records")
    suspend fun clearAllRecords()
}

@Dao
interface MonthlyPayrollHistoryDao {
    @Query("SELECT * FROM monthly_payroll_history ORDER BY year DESC, month DESC, id DESC")
    fun getAllPayrollHistories(): Flow<List<MonthlyPayrollHistory>>

    @Query("SELECT * FROM monthly_payroll_history WHERE year = :year ORDER BY month ASC")
    fun getPayrollHistoriesForYear(year: Int): Flow<List<MonthlyPayrollHistory>>

    @Query("SELECT * FROM monthly_payroll_history WHERE id = :id LIMIT 1")
    suspend fun getPayrollById(id: Long): MonthlyPayrollHistory?

    @Query("SELECT * FROM monthly_payroll_history WHERE year = :year AND month = :month LIMIT 1")
    suspend fun getPayrollByPeriod(year: Int, month: Int): MonthlyPayrollHistory?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPayroll(history: MonthlyPayrollHistory): Long

    @Delete
    suspend fun deletePayroll(history: MonthlyPayrollHistory)

    @Query("DELETE FROM monthly_payroll_history WHERE id = :id")
    suspend fun deletePayrollById(id: Long)

    @Query("DELETE FROM monthly_payroll_history")
    suspend fun clearAllHistories()
}

@Dao
interface AppSettingsDao {
    @Query("SELECT * FROM app_settings WHERE id = 1 LIMIT 1")
    fun getSettings(): Flow<AppSettings?>

    @Query("SELECT * FROM app_settings WHERE id = 1 LIMIT 1")
    suspend fun getSettingsDirect(): AppSettings?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(settings: AppSettings)
}

@Dao
interface AttendanceDao {
    @Query("SELECT * FROM attendance_records ORDER BY date DESC, id DESC")
    fun getAllRecords(): Flow<List<AttendanceRecord>>

    @Query("SELECT * FROM attendance_records WHERE date LIKE :monthPrefix || '%' ORDER BY date ASC")
    fun getRecordsForMonth(monthPrefix: String): Flow<List<AttendanceRecord>>

    @Query("SELECT * FROM attendance_records WHERE date LIKE :monthPrefix || '%' ORDER BY date ASC")
    suspend fun getRecordsForMonthDirect(monthPrefix: String): List<AttendanceRecord>

    @Query("SELECT * FROM attendance_records WHERE date = :date LIMIT 1")
    suspend fun getRecordByDate(date: String): AttendanceRecord?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecord(record: AttendanceRecord): Long

    @Delete
    suspend fun deleteRecord(record: AttendanceRecord)

    @Query("DELETE FROM attendance_records WHERE id = :id")
    suspend fun deleteRecordById(id: Long)

    @Query("DELETE FROM attendance_records WHERE date = :date")
    suspend fun deleteRecordByDate(date: String)

    @Query("SELECT COUNT(*) FROM attendance_records WHERE date LIKE :monthPrefix || '%' AND status = :status")
    suspend fun countByStatusForMonth(monthPrefix: String, status: String): Int

    @Query("DELETE FROM attendance_records")
    suspend fun clearAllRecords()
}
