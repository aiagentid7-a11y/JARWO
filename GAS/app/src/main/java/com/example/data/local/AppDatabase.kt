package com.aiagentid7.payrollemployee.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.aiagentid7.payrollemployee.data.model.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [
        UserProfile::class,
        OvertimeLog::class,
        LeaveRecord::class,
        MonthlyPayrollHistory::class,
        AppSettings::class,
        AttendanceRecord::class
    ],
    version = 12,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun userProfileDao(): UserProfileDao
    abstract fun overtimeLogDao(): OvertimeLogDao
    abstract fun leaveRecordDao(): LeaveRecordDao
    abstract fun monthlyPayrollHistoryDao(): MonthlyPayrollHistoryDao
    abstract fun appSettingsDao(): AppSettingsDao
    abstract fun attendanceDao(): AttendanceDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        val MIGRATION_6_7 = object : Migration(6, 7) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE user_profile ADD COLUMN hmPay REAL NOT NULL DEFAULT 0.0")
                db.execSQL("ALTER TABLE monthly_payroll_history ADD COLUMN hmPay REAL NOT NULL DEFAULT 0.0")
            }
        }

        val MIGRATION_7_8 = object : Migration(7, 8) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE overtime_logs ADD COLUMN ritaseCount INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE overtime_logs ADD COLUMN ritaseRate REAL NOT NULL DEFAULT 0.0")
                db.execSQL("ALTER TABLE overtime_logs ADD COLUMN hmStart REAL NOT NULL DEFAULT 0.0")
                db.execSQL("ALTER TABLE overtime_logs ADD COLUMN hmEnd REAL NOT NULL DEFAULT 0.0")
                db.execSQL("ALTER TABLE overtime_logs ADD COLUMN hmTotal REAL NOT NULL DEFAULT 0.0")
                db.execSQL("ALTER TABLE overtime_logs ADD COLUMN unitCode TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE overtime_logs ADD COLUMN materialType TEXT NOT NULL DEFAULT ''")
            }
        }

        val MIGRATION_8_9 = object : Migration(8, 9) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("""
                    DELETE FROM monthly_payroll_history WHERE id NOT IN (
                        SELECT MAX(id) FROM monthly_payroll_history GROUP BY year, month
                    )
                """.trimIndent())
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_monthly_payroll_history_year_month ON monthly_payroll_history(year, month)")
            }
        }

        val MIGRATION_9_10 = object : Migration(9, 10) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE user_profile ADD COLUMN mealAllowancePerDay REAL NOT NULL DEFAULT 0.0")
                db.execSQL("ALTER TABLE user_profile ADD COLUMN transportAllowancePerDay REAL NOT NULL DEFAULT 0.0")
                db.execSQL("ALTER TABLE user_profile ADD COLUMN allowanceCalculationMode TEXT NOT NULL DEFAULT 'FLAT_MONTHLY'")
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS `attendance_records` (
                        `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        `date` TEXT NOT NULL,
                        `status` TEXT NOT NULL,
                        `checkInTime` TEXT NOT NULL,
                        `checkOutTime` TEXT NOT NULL,
                        `workedHours` REAL NOT NULL,
                        `isMealEligible` INTEGER NOT NULL,
                        `isTransportEligible` INTEGER NOT NULL,
                        `notes` TEXT NOT NULL,
                        `createdAt` INTEGER NOT NULL
                    )
                """.trimIndent())
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_attendance_records_date` ON `attendance_records` (`date`)")
            }
        }

        val MIGRATION_10_11 = object : Migration(10, 11) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE `attendance_records` ADD COLUMN `photoProofPath` TEXT DEFAULT NULL")
            }
        }

        /**
         * Version 12: ownership absensi.
         * Absensi hasil sinkronisasi cuti/lembur diberi sourceType/sourceId.
         * Trigger mencegah sinkronisasi menimpa absensi yang sudah ada dan
         * menghapus hanya absensi otomatis yang memang dimiliki sumbernya.
         */
        val MIGRATION_11_12 = object : Migration(11, 12) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE `attendance_records` ADD COLUMN `sourceType` TEXT NOT NULL DEFAULT 'MANUAL'")
                db.execSQL("ALTER TABLE `attendance_records` ADD COLUMN `sourceId` INTEGER DEFAULT NULL")

                // Tandai data sinkronisasi yang sudah terlanjur dibuat pada versi lama.
                db.execSQL("""
                    UPDATE attendance_records
                    SET sourceType = 'LEAVE_SYNC',
                        sourceId = (
                            SELECT MAX(l.id) FROM leave_records l
                            WHERE attendance_records.notes LIKE 'Sinkron dari ' || l.leaveType || ':%'
                              AND l.startDate <= attendance_records.date
                              AND l.endDate >= attendance_records.date
                        )
                    WHERE notes LIKE 'Sinkron dari %'
                """.trimIndent())
                db.execSQL("""
                    UPDATE attendance_records
                    SET sourceType = 'OVERTIME_SYNC',
                        sourceId = (
                            SELECT MAX(o.id) FROM overtime_logs o
                            WHERE attendance_records.notes LIKE 'Lembur (%'
                              AND o.date = attendance_records.date
                        )
                    WHERE notes LIKE 'Lembur (%'
                      AND sourceType = 'MANUAL'
                """.trimIndent())

                // Jangan biarkan INSERT sinkronisasi mengganti absensi yang sudah ada.
                db.execSQL("DROP TRIGGER IF EXISTS attendance_prevent_sync_overwrite")
                db.execSQL("""
                    CREATE TRIGGER attendance_prevent_sync_overwrite
                    BEFORE INSERT ON attendance_records
                    WHEN (NEW.notes LIKE 'Sinkron dari %' OR NEW.notes LIKE 'Lembur (%')
                         AND EXISTS (SELECT 1 FROM attendance_records WHERE date = NEW.date)
                    BEGIN
                        SELECT RAISE(IGNORE);
                    END
                """.trimIndent())

                // Setelah insert otomatis, kaitkan ke sumber cuti berdasarkan tanggal + catatan.
                db.execSQL("DROP TRIGGER IF EXISTS attendance_mark_leave_source")
                db.execSQL("""
                    CREATE TRIGGER attendance_mark_leave_source
                    AFTER INSERT ON attendance_records
                    WHEN NEW.notes LIKE 'Sinkron dari %'
                    BEGIN
                        UPDATE attendance_records
                        SET sourceType = 'LEAVE_SYNC',
                            sourceId = (
                                SELECT MAX(l.id) FROM leave_records l
                                WHERE NEW.notes LIKE 'Sinkron dari ' || l.leaveType || ':%'
                                  AND l.startDate <= NEW.date
                                  AND l.endDate >= NEW.date
                            )
                        WHERE id = NEW.id;
                    END
                """.trimIndent())

                db.execSQL("DROP TRIGGER IF EXISTS attendance_mark_overtime_source")
                db.execSQL("""
                    CREATE TRIGGER attendance_mark_overtime_source
                    AFTER INSERT ON attendance_records
                    WHEN NEW.notes LIKE 'Lembur (%'
                    BEGIN
                        UPDATE attendance_records
                        SET sourceType = 'OVERTIME_SYNC',
                            sourceId = (SELECT MAX(o.id) FROM overtime_logs o WHERE o.date = NEW.date)
                        WHERE id = NEW.id;
                    END
                """.trimIndent())

                // Saat cuti dihapus, hapus hanya attendance milik cuti tersebut.
                // Jika masih ada cuti/lembur lain pada tanggal yang sama, pertahankan attendance.
                db.execSQL("DROP TRIGGER IF EXISTS leave_delete_synced_attendance")
                db.execSQL("""
                    CREATE TRIGGER leave_delete_synced_attendance
                    AFTER DELETE ON leave_records
                    BEGIN
                        DELETE FROM attendance_records
                        WHERE sourceType = 'LEAVE_SYNC'
                          AND sourceId = OLD.id
                          AND NOT EXISTS (
                              SELECT 1 FROM leave_records l
                              WHERE l.startDate <= attendance_records.date
                                AND l.endDate >= attendance_records.date
                          )
                          AND NOT EXISTS (
                              SELECT 1 FROM overtime_logs o
                              WHERE o.date = attendance_records.date
                          );
                    END
                """.trimIndent())

                // Saat lembur dihapus, hapus hanya attendance yang dibuat oleh lembur tersebut.
                db.execSQL("DROP TRIGGER IF EXISTS overtime_delete_synced_attendance")
                db.execSQL("""
                    CREATE TRIGGER overtime_delete_synced_attendance
                    AFTER DELETE ON overtime_logs
                    BEGIN
                        DELETE FROM attendance_records
                        WHERE sourceType = 'OVERTIME_SYNC'
                          AND sourceId = OLD.id
                          AND NOT EXISTS (
                              SELECT 1 FROM overtime_logs o
                              WHERE o.date = attendance_records.date
                          )
                          AND NOT EXISTS (
                              SELECT 1 FROM leave_records l
                              WHERE l.startDate <= attendance_records.date
                                AND l.endDate >= attendance_records.date
                          );
                    END
                """.trimIndent())
            }
        }

        fun getDatabase(context: Context, scope: CoroutineScope = CoroutineScope(Dispatchers.IO)): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "payroll_ess_database.db"
                )
                .addMigrations(MIGRATION_6_7, MIGRATION_7_8, MIGRATION_8_9, MIGRATION_9_10, MIGRATION_10_11, MIGRATION_11_12)
                .addCallback(DatabaseCallback(scope))
                .build()
                INSTANCE = instance
                instance
            }
        }

        private class DatabaseCallback(private val scope: CoroutineScope) : RoomDatabase.Callback() {
            override fun onCreate(db: SupportSQLiteDatabase) {
                super.onCreate(db)
                scope.launch {
                    var database = INSTANCE
                    while (database == null) {
                        kotlinx.coroutines.delay(50)
                        database = INSTANCE
                    }
                    populateInitialData(database)
                }
            }
        }

        private suspend fun populateInitialData(database: AppDatabase) {
            val profileDao = database.userProfileDao()
            val settingsDao = database.appSettingsDao()
            if (profileDao.getUserProfileDirect() == null) profileDao.insertOrUpdate(UserProfile())
            if (settingsDao.getSettingsDirect() == null) settingsDao.insertOrUpdate(AppSettings())
        }
    }
}
