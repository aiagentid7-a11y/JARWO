package com.example.data.local

import androidx.sqlite.db.SupportSQLiteDatabase
import androidx.sqlite.db.SupportSQLiteOpenHelper
import androidx.sqlite.db.framework.FrameworkSQLiteOpenHelperFactory
import androidx.test.core.app.ApplicationProvider
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Regression tests for the Room migration chain.
 *
 * These tests deliberately execute the migration SQL against a real SQLite
 * database instead of relying only on compilation. This protects payroll data
 * from migration SQL errors and verifies the ownership rules introduced in v12.
 */
class AppDatabaseMigrationTest {
    private lateinit var helper: SupportSQLiteOpenHelper
    private lateinit var db: SupportSQLiteDatabase

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        val callback = object : SupportSQLiteOpenHelper.Callback(1) {
            override fun onCreate(db: SupportSQLiteDatabase) = Unit
            override fun onUpgrade(db: SupportSQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit
        }
        helper = FrameworkSQLiteOpenHelperFactory().create(
            SupportSQLiteOpenHelper.Configuration.builder(context)
                .name(":memory:")
                .callback(callback)
                .build()
        )
        db = helper.writableDatabase
    }

    @After
    fun tearDown() {
        helper.close()
    }

    @Test
    fun migrationChain_6_to_11_addsExpectedColumnsAndIndex() {
        createVersion6Schema(db)

        AppDatabase.MIGRATION_6_7.migrate(db)
        assertTrue(hasColumn(db, "user_profile", "hmPay"))
        assertTrue(hasColumn(db, "monthly_payroll_history", "hmPay"))

        AppDatabase.MIGRATION_7_8.migrate(db)
        listOf("ritaseCount", "ritaseRate", "hmStart", "hmEnd", "hmTotal", "unitCode", "materialType")
            .forEach { assertTrue("Missing overtime column $it", hasColumn(db, "overtime_logs", it)) }

        db.execSQL("INSERT INTO monthly_payroll_history(id, year, month) VALUES (1, 2026, 9)")
        db.execSQL("INSERT INTO monthly_payroll_history(id, year, month) VALUES (2, 2026, 9)")
        db.execSQL("INSERT INTO monthly_payroll_history(id, year, month) VALUES (3, 2026, 8)")
        AppDatabase.MIGRATION_8_9.migrate(db)
        assertEquals(2, countRows(db, "monthly_payroll_history"))
        assertEquals(1, countRows(db, "monthly_payroll_history", "year = 2026 AND month = 9 AND id = 2"))
        assertTrue(hasIndex(db, "monthly_payroll_history", "index_monthly_payroll_history_year_month"))

        AppDatabase.MIGRATION_9_10.migrate(db)
        assertTrue(hasColumn(db, "user_profile", "mealAllowancePerDay"))
        assertTrue(hasColumn(db, "user_profile", "transportAllowancePerDay"))
        assertTrue(hasColumn(db, "user_profile", "allowanceCalculationMode"))
        assertTrue(hasTable(db, "attendance_records"))
        assertTrue(hasIndex(db, "attendance_records", "index_attendance_records_date"))

        AppDatabase.MIGRATION_10_11.migrate(db)
        assertTrue(hasColumn(db, "attendance_records", "photoProofPath"))
    }

    @Test
    fun migration11_to_12_preservesDataAndEnforcesAttendanceOwnership() {
        createVersion11Schema(db)
        db.execSQL("INSERT INTO leave_records(id, leaveType, startDate, endDate) VALUES (10, 'ANNUAL', '2026-09-10', '2026-09-10')")
        db.execSQL("INSERT INTO overtime_logs(id, date) VALUES (20, '2026-09-11')")
        db.execSQL("INSERT INTO attendance_records(id, date, status, checkInTime, checkOutTime, workedHours, isMealEligible, isTransportEligible, notes, photoProofPath, createdAt) VALUES (1, '2026-09-09', 'HADIR', '', '', 8.0, 1, 1, 'Manual', NULL, 1)")
        db.execSQL("INSERT INTO attendance_records(id, date, status, checkInTime, checkOutTime, workedHours, isMealEligible, isTransportEligible, notes, photoProofPath, createdAt) VALUES (2, '2026-09-10', 'CUTI', '', '', 0.0, 0, 0, 'Sinkron dari ANNUAL: cuti', NULL, 2)")
        db.execSQL("INSERT INTO attendance_records(id, date, status, checkInTime, checkOutTime, workedHours, isMealEligible, isTransportEligible, notes, photoProofPath, createdAt) VALUES (3, '2026-09-11', 'LEMBUR', '', '', 8.0, 1, 1, 'Lembur (hari kerja)', NULL, 3)")

        AppDatabase.MIGRATION_11_12.migrate(db)

        assertTrue(hasColumn(db, "attendance_records", "sourceType"))
        assertTrue(hasColumn(db, "attendance_records", "sourceId"))
        assertEquals("MANUAL", queryString(db, "SELECT sourceType FROM attendance_records WHERE id = 1"))
        assertEquals("LEAVE_SYNC", queryString(db, "SELECT sourceType FROM attendance_records WHERE id = 2"))
        assertEquals(10L, queryLong(db, "SELECT sourceId FROM attendance_records WHERE id = 2"))
        assertEquals("OVERTIME_SYNC", queryString(db, "SELECT sourceType FROM attendance_records WHERE id = 3"))
        assertEquals(20L, queryLong(db, "SELECT sourceId FROM attendance_records WHERE id = 3"))

        // A sync insert must not replace an existing manual attendance for the same date.
        db.execSQL("INSERT INTO attendance_records(date, status, checkInTime, checkOutTime, workedHours, isMealEligible, isTransportEligible, notes, photoProofPath, sourceType, sourceId, createdAt) VALUES ('2026-09-09', 'CUTI', '', '', 0.0, 0, 0, 'Sinkron dari ANNUAL: cuti', NULL, 'LEAVE_SYNC', 10, 4)")
        assertEquals(1, countRows(db, "attendance_records", "date = '2026-09-09'"))
        assertEquals("MANUAL", queryString(db, "SELECT sourceType FROM attendance_records WHERE date = '2026-09-09'"))

        // Deleting a leave removes only its owned attendance when no other source covers that date.
        db.execSQL("DELETE FROM leave_records WHERE id = 10")
        assertEquals(0, countRows(db, "attendance_records", "id = 2"))
        assertEquals(1, countRows(db, "attendance_records", "id = 1"))

        // Overtime ownership is also reversible without touching manual attendance.
        db.execSQL("DELETE FROM overtime_logs WHERE id = 20")
        assertEquals(0, countRows(db, "attendance_records", "id = 3"))
        assertEquals(1, countRows(db, "attendance_records", "id = 1"))
    }

    private fun createVersion6Schema(db: SupportSQLiteDatabase) {
        db.execSQL("CREATE TABLE user_profile (id INTEGER PRIMARY KEY NOT NULL)")
        db.execSQL("CREATE TABLE monthly_payroll_history (id INTEGER PRIMARY KEY NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL)")
        db.execSQL("CREATE TABLE overtime_logs (id INTEGER PRIMARY KEY NOT NULL)")
    }

    private fun createVersion11Schema(db: SupportSQLiteDatabase) {
        db.execSQL("CREATE TABLE leave_records (id INTEGER PRIMARY KEY NOT NULL, leaveType TEXT NOT NULL, startDate TEXT NOT NULL, endDate TEXT NOT NULL)")
        db.execSQL("CREATE TABLE overtime_logs (id INTEGER PRIMARY KEY NOT NULL, date TEXT NOT NULL)")
        db.execSQL("""
            CREATE TABLE attendance_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                date TEXT NOT NULL,
                status TEXT NOT NULL,
                checkInTime TEXT NOT NULL,
                checkOutTime TEXT NOT NULL,
                workedHours REAL NOT NULL,
                isMealEligible INTEGER NOT NULL,
                isTransportEligible INTEGER NOT NULL,
                notes TEXT NOT NULL,
                photoProofPath TEXT DEFAULT NULL,
                createdAt INTEGER NOT NULL
            )
        """.trimIndent())
    }

    private fun hasTable(db: SupportSQLiteDatabase, table: String): Boolean =
        countRows(db, "sqlite_master", "type = 'table' AND name = '$table'") == 1

    private fun hasColumn(db: SupportSQLiteDatabase, table: String, column: String): Boolean {
        db.query("PRAGMA table_info(`$table`)").use { cursor ->
            val nameIndex = cursor.getColumnIndex("name")
            while (cursor.moveToNext()) {
                if (cursor.getString(nameIndex) == column) return true
            }
        }
        return false
    }

    private fun hasIndex(db: SupportSQLiteDatabase, table: String, index: String): Boolean =
        countRows(db, "sqlite_master", "type = 'index' AND tbl_name = '$table' AND name = '$index'") == 1

    private fun countRows(db: SupportSQLiteDatabase, table: String, where: String? = null): Int {
        val sql = if (where == null) "SELECT COUNT(*) FROM `$table`" else "SELECT COUNT(*) FROM `$table` WHERE $where"
        return queryLong(db, sql).toInt()
    }

    private fun queryString(db: SupportSQLiteDatabase, sql: String): String {
        db.query(sql).use { cursor ->
            check(cursor.moveToFirst())
            return cursor.getString(0)
        }
    }

    private fun queryLong(db: SupportSQLiteDatabase, sql: String): Long {
        db.query(sql).use { cursor ->
            check(cursor.moveToFirst())
            return cursor.getLong(0)
        }
    }
}
