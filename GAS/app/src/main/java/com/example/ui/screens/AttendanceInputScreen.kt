package com.example.ui.screens

import android.app.TimePickerDialog
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.AttendanceRecord
import com.example.data.model.UserProfile
import com.example.domain.calculator.IndonesianPayrollCalculators
import com.example.domain.util.AttendancePhotoHelper
import com.example.domain.util.Formatters
import com.example.ui.components.*
import com.example.ui.theme.*
import coil.compose.AsyncImage
import coil.request.ImageRequest
import java.io.File
import java.util.Calendar

/**
 * Layar Rekam Presensi & Absensi Harian Karyawan (Attendance Tracker)
 * Terintegrasi dengan Komponen Uang Makan & Uang Transport Berbasis Kehadiran
 * Sesuai Regulasi Ketenagakerjaan:
 * 1. UU No. 13/2003 (Ketenagakerjaan & No Work No Pay)
 * 2. PP No. 35/2021 (Waktu Kerja 7/8 jam & Waktu Istirahat)
 * 3. PP No. 36/2021 & PP No. 51/2023 (Pengupahan & Tunjangan Tidak Tetap Kehadiran)
 */
@Composable
fun AttendanceInputScreen(
    userProfile: UserProfile,
    isProUser: Boolean,
    attendanceRecords: List<AttendanceRecord>,
    onAddRecord: (AttendanceRecord) -> Unit,
    onDeleteRecord: (Long) -> Unit,
    onNavigateToProfile: () -> Unit,
    onNavigateToCalendar: () -> Unit = {},
    onOpenProDialog: () -> Unit = {}
) {
    val colors = GajikuTheme.colors
    val context = LocalContext.current

    val currentYear = Formatters.getCurrentYear()
    val currentMonth = Formatters.getCurrentMonth()

    var selectedYear by remember { mutableIntStateOf(currentYear) }
    var selectedMonth by remember { mutableIntStateOf(currentMonth) }

    val monthPrefix = remember(selectedYear, selectedMonth) {
        String.format(java.util.Locale.US, "%04d-%02d", selectedYear, selectedMonth)
    }

    // Input form state
    var dateInput by remember { mutableStateOf(Formatters.getCurrentDateStr()) }
    var selectedStatus by remember { mutableStateOf("HADIR") }
    var checkInTime by remember { mutableStateOf("08:00") }
    var checkOutTime by remember { mutableStateOf("17:00") }
    var notesInput by remember { mutableStateOf("") }
    var isMealEligible by remember { mutableStateOf(true) }
    var isTransportEligible by remember { mutableStateOf(true) }
    var photoProofPath by remember { mutableStateOf<String?>(null) }

    // Dialog & viewer state
    var recordToDelete by remember { mutableStateOf<AttendanceRecord?>(null) }
    var showDatePickerDialog by remember { mutableStateOf(false) }
    var photoToViewInModal by remember { mutableStateOf<AttendanceRecord?>(null) }
    var storageRefreshTrigger by remember { mutableIntStateOf(0) }

    // Total ukuran foto presensi tersimpan di device (storage check)
    val totalPhotoSizeBytes = remember(attendanceRecords, storageRefreshTrigger) {
        AttendancePhotoHelper.getAttendancePhotosTotalSizeBytes(context)
    }

    // Hitung jam kerja efektif otomatis
    val calculatedWorkedHours = remember(checkInTime, checkOutTime, selectedStatus) {
        if (selectedStatus == "HADIR") {
            IndonesianPayrollCalculators.calculateEffectiveHours(checkInTime, checkOutTime)
        } else {
            0.0
        }
    }

    // Update eligibility default saat status berubah
    LaunchedEffect(selectedStatus) {
        when (selectedStatus) {
            "HADIR" -> {
                isMealEligible = true
                isTransportEligible = true
            }
            else -> {
                isMealEligible = false
                isTransportEligible = false
            }
        }
    }

    // Records bulan ini
    val monthlyRecords = remember(attendanceRecords, monthPrefix) {
        attendanceRecords.filter { it.date.startsWith(monthPrefix) }
            .sortedByDescending { it.date }
    }

    // Agregat Statistik Bulan Ini
    val hadirCount = remember(monthlyRecords) { monthlyRecords.count { it.status == "HADIR" } }
    val izinCount = remember(monthlyRecords) { monthlyRecords.count { it.status == "IZIN" } }
    val sakitCount = remember(monthlyRecords) { monthlyRecords.count { it.status == "SAKIT" } }
    val cutiCount = remember(monthlyRecords) { monthlyRecords.count { it.status == "CUTI" } }
    val alphaCount = remember(monthlyRecords) { monthlyRecords.count { it.status == "ALPHA" } }
    val liburCount = remember(monthlyRecords) { monthlyRecords.count { it.status == "LIBUR" } }

    val mealEligibleDays = remember(monthlyRecords) { monthlyRecords.count { it.isMealEligible } }
    val transportEligibleDays = remember(monthlyRecords) { monthlyRecords.count { it.isTransportEligible } }

    val isPerAttendanceMode = userProfile.allowanceCalculationMode == "PER_ATTENDANCE"
    val totalMealEarned = remember(mealEligibleDays, userProfile) {
        if (isPerAttendanceMode) mealEligibleDays * userProfile.mealAllowancePerDay
        else userProfile.mealAllowance
    }
    val totalTransportEarned = remember(transportEligibleDays, userProfile) {
        if (isPerAttendanceMode) transportEligibleDays * userProfile.transportAllowancePerDay
        else userProfile.transportAllowance
    }

    val monthNames = listOf(
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 32.dp)
    ) {
        // 1. Hero Summary Card: Mode & Total Tunjangan Kehadiran Terkumpul
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) {
                    CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder))
                } else null
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Surface(
                                color = colors.tealBg,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.size(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.AssignmentTurnedIn,
                                        contentDescription = null,
                                        tint = colors.teal,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                            Column {
                                Text(
                                    text = "PRESENSI & TUNJANGAN KEHADIRAN",
                                    fontSize = 10.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.primary,
                                    letterSpacing = 0.5.sp
                                )
                                Text(
                                    text = "${monthNames.getOrElse(selectedMonth - 1) { "" }} $selectedYear",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = colors.textPrimary
                                )
                            }
                        }

                        // Badge Mode Kalkulasi
                        Surface(
                            color = if (isPerAttendanceMode) colors.emeraldBg else colors.primaryContainer.copy(alpha = 0.3f),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.clickable { onNavigateToProfile() }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    imageVector = if (isPerAttendanceMode) Icons.Default.CheckCircle else Icons.Default.Tune,
                                    contentDescription = null,
                                    tint = if (isPerAttendanceMode) colors.emerald else colors.primary,
                                    modifier = Modifier.size(12.dp)
                                )
                                Text(
                                    text = if (isPerAttendanceMode) "Mode: Per Kehadiran" else "Mode: Flat Bulanan",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isPerAttendanceMode) colors.emerald else colors.primary
                                )
                            }
                        }
                    }

                    HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 1.dp)

                    // Counter Hadir & Uang Makan / Transport
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Total Uang Makan
                        Surface(
                            color = colors.surfaceVariant,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = "UANG MAKAN ($mealEligibleDays HARI)",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.textMuted
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = Formatters.formatRupiah(totalMealEarned),
                                    fontSize = 13.5.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = colors.emerald
                                )
                                if (isPerAttendanceMode) {
                                    Text(
                                        text = "@ ${Formatters.formatRupiah(userProfile.mealAllowancePerDay)}/hari",
                                        fontSize = 9.sp,
                                        color = colors.textMuted
                                    )
                                }
                            }
                        }

                        // Total Uang Transport
                        Surface(
                            color = colors.surfaceVariant,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = "UANG TRANSPORT ($transportEligibleDays HARI)",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.textMuted
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = Formatters.formatRupiah(totalTransportEarned),
                                    fontSize = 13.5.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = colors.cyan
                                )
                                if (isPerAttendanceMode) {
                                    Text(
                                        text = "@ ${Formatters.formatRupiah(userProfile.transportAllowancePerDay)}/hari",
                                        fontSize = 9.sp,
                                        color = colors.textMuted
                                    )
                                }
                            }
                        }
                    }

                    // Stat Row Badges
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        AttendanceStatChip(label = "Hadir", count = hadirCount, color = colors.emerald, bg = colors.emeraldBg)
                        AttendanceStatChip(label = "Izin", count = izinCount, color = colors.amber, bg = colors.amberBg)
                        AttendanceStatChip(label = "Sakit", count = sakitCount, color = colors.cyan, bg = colors.cyanBg)
                        AttendanceStatChip(label = "Cuti", count = cutiCount, color = colors.indigo, bg = colors.indigoBg)
                        AttendanceStatChip(label = "Alpha", count = alphaCount, color = colors.error, bg = colors.roseBg)
                        AttendanceStatChip(label = "Libur", count = liburCount, color = colors.textMuted, bg = colors.surfaceVariant)
                    }

                    if (!isPerAttendanceMode) {
                        Surface(
                            color = colors.amberBg.copy(alpha = 0.5f),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth().clickable { onNavigateToProfile() }
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(Icons.Default.Info, contentDescription = null, tint = colors.amber, modifier = Modifier.size(16.dp))
                                Text(
                                    text = "Saat ini profil menggunakan nominal Flat Bulanan. Buka Pengaturan Profil untuk mengaktifkan perhitungan otomatis per hari hadir.",
                                    fontSize = 10.sp,
                                    color = colors.textPrimary,
                                    lineHeight = 14.sp
                                )
                            }
                        }
                    }
                }
            }
        }

        // 2. Form Input Presensi Harian
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) {
                    CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder))
                } else null
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "CATAT PRESENSI HARIAN",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.primary
                        )
                        // Tombol Cepat Hadir Hari Ini
                        TextButton(
                            onClick = {
                                val today = Formatters.getCurrentDateStr()
                                dateInput = today
                                selectedStatus = "HADIR"
                                checkInTime = "08:00"
                                checkOutTime = "17:00"
                                isMealEligible = true
                                isTransportEligible = true
                                onAddRecord(
                                    AttendanceRecord(
                                        date = today,
                                        status = "HADIR",
                                        checkInTime = "08:00",
                                        checkOutTime = "17:00",
                                        workedHours = 8.0,
                                        isMealEligible = true,
                                        isTransportEligible = true,
                                        notes = "Hadir normal"
                                    )
                                )
                                Toast.makeText(context, "Presensi $today (Hadir) berhasil dicatat!", Toast.LENGTH_SHORT).show()
                            },
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                            modifier = Modifier.testTag("attendance_quick_today_button")
                        ) {
                            Icon(Icons.Default.Bolt, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Hadir Cepat Hari Ini", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    // Pemilihan Tanggal
                    OutlinedTextField(
                        value = dateInput,
                        onValueChange = { dateInput = it },
                        label = { Text("Tanggal (YYYY-MM-DD)", fontSize = 11.sp) },
                        supportingText = { Text(Formatters.formatDateIndo(dateInput), fontSize = 10.sp, color = colors.primary) },
                        trailingIcon = {
                            IconButton(onClick = { showDatePickerDialog = true }) {
                                Icon(Icons.Default.CalendarToday, contentDescription = "Pilih Tanggal", tint = colors.primary)
                            }
                        },
                        modifier = Modifier.fillMaxWidth().testTag("attendance_date_input"),
                        colors = highContrastTextFieldColors()
                    )

                    // Pilihan Status Presensi (Segmented chips)
                    Text("Status Kehadiran:", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                    val statusList = listOf(
                        "HADIR" to ("Hadir" to colors.emerald),
                        "IZIN" to ("Izin" to colors.amber),
                        "SAKIT" to ("Sakit" to colors.cyan),
                        "CUTI" to ("Cuti" to colors.indigo),
                        "ALPHA" to ("Alpha" to colors.error),
                        "LIBUR" to ("Libur" to colors.textMuted)
                    )

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        items(statusList) { (statusKey, pair) ->
                            val (label, color) = pair
                            val isSelected = selectedStatus == statusKey
                            Surface(
                                color = if (isSelected) color else colors.inactiveChipBg,
                                shape = RoundedCornerShape(10.dp),
                                border = BorderStroke(
                                    1.dp,
                                    if (isSelected) color else colors.inactiveChipBorder
                                ),
                                modifier = Modifier
                                    .clickable { selectedStatus = statusKey }
                                    .testTag("status_chip_$statusKey")
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color.White else colors.inactiveChipText,
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                                )
                            }
                        }
                    }

                    // Jam Masuk & Jam Pulang (Hanya jika HADIR)
                    AnimatedVisibility(visible = selectedStatus == "HADIR") {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                OutlinedTextField(
                                    value = checkInTime,
                                    onValueChange = { checkInTime = it },
                                    label = { Text("Jam Masuk (HH:mm)", fontSize = 10.5.sp) },
                                    trailingIcon = {
                                        IconButton(
                                            onClick = {
                                                val cal = Calendar.getInstance()
                                                TimePickerDialog(
                                                    context,
                                                    { _, hourOfDay, minute ->
                                                        checkInTime = String.format(java.util.Locale.US, "%02d:%02d", hourOfDay, minute)
                                                    },
                                                    8, 0, true
                                                ).show()
                                            }
                                        ) {
                                            Icon(Icons.Default.AccessTime, contentDescription = "Pilih Jam Masuk", tint = colors.primary)
                                        }
                                    },
                                    modifier = Modifier.weight(1f).testTag("attendance_checkin_input"),
                                    colors = highContrastTextFieldColors()
                                )

                                OutlinedTextField(
                                    value = checkOutTime,
                                    onValueChange = { checkOutTime = it },
                                    label = { Text("Jam Pulang (HH:mm)", fontSize = 10.5.sp) },
                                    trailingIcon = {
                                        IconButton(
                                            onClick = {
                                                val cal = Calendar.getInstance()
                                                TimePickerDialog(
                                                    context,
                                                    { _, hourOfDay, minute ->
                                                        checkOutTime = String.format(java.util.Locale.US, "%02d:%02d", hourOfDay, minute)
                                                    },
                                                    17, 0, true
                                                ).show()
                                            }
                                        ) {
                                            Icon(Icons.Default.AccessTime, contentDescription = "Pilih Jam Pulang", tint = colors.primary)
                                        }
                                    },
                                    modifier = Modifier.weight(1f).testTag("attendance_checkout_input"),
                                    colors = highContrastTextFieldColors()
                                )
                            }

                            // Efektif Jam Kerja badge
                            Surface(
                                color = colors.tealBg,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Jam Kerja Efektif (PP 35/2021):", fontSize = 11.sp, color = colors.textPrimary)
                                    Text(
                                        text = "$calculatedWorkedHours Jam ${if (calculatedWorkedHours >= 8.0) "✓ Normal" else ""}",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.teal
                                    )
                                }
                            }
                        }
                    }

                    // Toggles Hak Uang Makan & Hak Transport
                    Surface(
                        color = colors.surfaceVariant,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("Hak Tunjangan Hari Ini:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text("Berhak Uang Makan", fontSize = 11.5.sp, fontWeight = FontWeight.Medium, color = colors.textPrimary)
                                    if (isPerAttendanceMode && userProfile.mealAllowancePerDay > 0) {
                                        Text("+ ${Formatters.formatRupiah(userProfile.mealAllowancePerDay)}", fontSize = 10.sp, color = colors.emerald)
                                    }
                                }
                                Switch(
                                    checked = isMealEligible,
                                    onCheckedChange = { isMealEligible = it },
                                    modifier = Modifier.testTag("attendance_meal_switch")
                                )
                            }

                            HorizontalDivider(color = colors.outline.copy(alpha = 0.3f), thickness = 1.dp)

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text("Berhak Uang Transport", fontSize = 11.5.sp, fontWeight = FontWeight.Medium, color = colors.textPrimary)
                                    if (isPerAttendanceMode && userProfile.transportAllowancePerDay > 0) {
                                        Text("+ ${Formatters.formatRupiah(userProfile.transportAllowancePerDay)}", fontSize = 10.sp, color = colors.cyan)
                                    }
                                }
                                Switch(
                                    checked = isTransportEligible,
                                    onCheckedChange = { isTransportEligible = it },
                                    modifier = Modifier.testTag("attendance_transport_switch")
                                )
                            }
                        }
                    }

                    // Catatan / Keterangan
                    OutlinedTextField(
                        value = notesInput,
                        onValueChange = { notesInput = it },
                        label = { Text("Keterangan / Catatan (Opsional)", fontSize = 11.sp) },
                        placeholder = { Text("Misal: Hadir WFO, Visit Klien, Surat Dokter terlampir", fontSize = 10.5.sp) },
                        modifier = Modifier.fillMaxWidth().testTag("attendance_notes_input"),
                        colors = highContrastTextFieldColors()
                    )

                    // Komponen Foto Bukti Presensi (Kamera Langsung & Watermark Otomatis)
                    AttendancePhotoCaptureCard(
                        currentPhotoPath = photoProofPath,
                        onPhotoCaptured = { photoProofPath = it },
                        employeeName = userProfile.fullName.ifBlank { null },
                        employeeNik = userProfile.nik.ifBlank { null },
                        status = selectedStatus
                    )

                    // Tombol Simpan
                    Button(
                        onClick = {
                            if (dateInput.isBlank()) {
                                Toast.makeText(context, "Tanggal tidak boleh kosong", Toast.LENGTH_SHORT).show()
                                return@Button
                            }
                            val record = AttendanceRecord(
                                date = dateInput.trim(),
                                status = selectedStatus,
                                checkInTime = if (selectedStatus == "HADIR") checkInTime.trim() else "",
                                checkOutTime = if (selectedStatus == "HADIR") checkOutTime.trim() else "",
                                workedHours = calculatedWorkedHours,
                                isMealEligible = isMealEligible,
                                isTransportEligible = isTransportEligible,
                                notes = notesInput.trim(),
                                photoProofPath = photoProofPath
                            )
                            onAddRecord(record)
                            Toast.makeText(context, "Presensi tanggal $dateInput berhasil disimpan!", Toast.LENGTH_SHORT).show()
                            notesInput = ""
                            photoProofPath = null
                        },
                        modifier = Modifier.fillMaxWidth().height(48.dp).testTag("attendance_save_button"),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                    ) {
                        Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Simpan Rekam Presensi", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            }
        }

        // Banner Peringatan Kapasitas Foto Presensi jika > 50MB
        item {
            AttendanceStorageWarningBanner(
                totalSizeBytes = totalPhotoSizeBytes,
                onCleanupTriggered = { storageRefreshTrigger++ }
            )
        }

        // 3. Filter Bulan & Header Riwayat
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "DAFTAR REKAM KEHADIRAN",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 1.sp,
                        color = colors.textMuted
                    )
                    Text(
                        text = "${monthlyRecords.size} catatan pada ${monthNames.getOrElse(selectedMonth - 1) { "" }} $selectedYear",
                        fontSize = 11.sp,
                        color = colors.textSecondary
                    )
                }

                // Month Navigator
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(
                        onClick = {
                            if (selectedMonth == 1) {
                                selectedMonth = 12
                                selectedYear -= 1
                            } else {
                                selectedMonth -= 1
                            }
                        },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(Icons.Default.ChevronLeft, contentDescription = "Bulan Sebelumnya")
                    }

                    Text(
                        text = "${monthNames.getOrElse(selectedMonth - 1) { "" }.take(3)} '$selectedYear",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.primary
                    )

                    IconButton(
                        onClick = {
                            if (selectedMonth == 12) {
                                selectedMonth = 1
                                selectedYear += 1
                            } else {
                                selectedMonth += 1
                            }
                        },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(Icons.Default.ChevronRight, contentDescription = "Bulan Berikutnya")
                    }
                }
            }
        }

        // 4. Daftar Riwayat Presensi Bulan Terpilih
        if (monthlyRecords.isEmpty()) {
            item {
                Surface(
                    color = colors.surfaceVariant.copy(alpha = 0.5f),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.EventBusy, contentDescription = null, tint = colors.textMuted, modifier = Modifier.size(36.dp))
                        Text(
                            text = "Belum ada catatan presensi di bulan ini",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.textSecondary,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = "Gunakan tombol \"Hadir Cepat Hari Ini\" atau isi form di atas untuk mulai mencatat.",
                            fontSize = 10.5.sp,
                            color = colors.textMuted,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        } else {
            items(monthlyRecords, key = { it.id }) { record ->
                AttendanceRecordItem(
                    record = record,
                    userProfile = userProfile,
                    isPerAttendanceMode = isPerAttendanceMode,
                    onViewPhoto = { photoToViewInModal = it },
                    onDelete = { recordToDelete = record }
                )
            }
        }

        // 5. Legal & Transparansi Regulasi Card
        item {
            LegalDisclaimerCard()
        }

        // 6. Ad Banner Placeholder for Free Users
        item {
            AdBannerPlaceholder(
                isProUser = isProUser,
                onUpgradeClick = onOpenProDialog
            )
        }
    }

    // Dialog Konfirmasi Hapus
    recordToDelete?.let { rec ->
        AlertDialog(
            onDismissRequest = { recordToDelete = null },
            shape = RoundedCornerShape(18.dp),
            title = { Text("Hapus Catatan Presensi?", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Text(
                    "Apakah Anda yakin ingin menghapus rekam presensi tanggal ${Formatters.formatDateIndo(rec.date)} (${rec.status})? File foto bukti terkait juga akan dihapus dari penyimpanan.",
                    fontSize = 12.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        AttendancePhotoHelper.deletePhotoFile(rec.photoProofPath)
                        onDeleteRecord(rec.id)
                        recordToDelete = null
                        storageRefreshTrigger++
                        Toast.makeText(context, "Catatan presensi berhasil dihapus", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = colors.error)
                ) {
                    Text("Hapus", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { recordToDelete = null }) {
                    Text("Batal")
                }
            }
        )
    }

    // Native Android Date Picker Dialog
    if (showDatePickerDialog) {
        val cal = Calendar.getInstance()
        val year = cal.get(Calendar.YEAR)
        val month = cal.get(Calendar.MONTH)
        val day = cal.get(Calendar.DAY_OF_MONTH)

        android.app.DatePickerDialog(
            context,
            { _, y, m, d ->
                dateInput = String.format(java.util.Locale.US, "%04d-%02d-%02d", y, m + 1, d)
                showDatePickerDialog = false
            },
            year, month, day
        ).apply {
            setOnDismissListener { showDatePickerDialog = false }
            show()
        }
    }
}

@Composable
fun AttendanceStatChip(
    label: String,
    count: Int,
    color: Color,
    bg: Color
) {
    Surface(
        color = bg,
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.padding(horizontal = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = count.toString(), fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = color)
            Text(text = label, fontSize = 8.5.sp, fontWeight = FontWeight.Bold, color = color)
        }
    }
}

@Composable
fun AttendanceRecordItem(
    record: AttendanceRecord,
    userProfile: UserProfile,
    isPerAttendanceMode: Boolean,
    onViewPhoto: (AttendanceRecord) -> Unit,
    onDelete: () -> Unit
) {
    val colors = GajikuTheme.colors
    val context = LocalContext.current
    val hasPhoto = !record.photoProofPath.isNullOrBlank() && File(record.photoProofPath).exists()

    val (statusLabel, statusColor, statusBg) = when (record.status) {
        "HADIR" -> Triple("Hadir", colors.emerald, colors.emeraldBg)
        "IZIN" -> Triple("Izin", colors.amber, colors.amberBg)
        "SAKIT" -> Triple("Sakit", colors.cyan, colors.cyanBg)
        "CUTI" -> Triple("Cuti", colors.indigo, colors.indigoBg)
        "ALPHA" -> Triple("Alpha", colors.error, colors.roseBg)
        else -> Triple(record.status, colors.textMuted, colors.surfaceVariant)
    }

    Surface(
        color = colors.surfaceVariant,
        shape = RoundedCornerShape(14.dp),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = SolidColor(colors.outline.copy(alpha = 0.6f))
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Thumbnail Foto Bukti Presensi (jika ada)
            if (hasPhoto) {
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .border(1.2.dp, colors.primary.copy(alpha = 0.7f), RoundedCornerShape(10.dp))
                        .testTag("attendance_item_thumbnail_${record.id}")
                ) {
                    AsyncImage(
                        model = ImageRequest.Builder(context)
                            .data(File(record.photoProofPath!!))
                            .crossfade(true)
                            .build(),
                        contentDescription = "Foto Presensi",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Surface(
                        color = statusBg,
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = statusLabel,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = statusColor,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    Text(
                        text = Formatters.formatDateIndo(record.date),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )

                    if (hasPhoto) {
                        Surface(
                            color = colors.emeraldBg,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "📷 Foto",
                                fontSize = 8.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.emerald,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }
                }

                if (record.status == "HADIR" && record.checkInTime.isNotBlank()) {
                    Text(
                        text = "Jam: ${record.checkInTime} - ${record.checkOutTime.ifBlank { "?" }} (${record.workedHours} Jam Efektif)",
                        fontSize = 10.5.sp,
                        color = colors.textSecondary
                    )
                }

                // Tunjangan Info Badges
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (record.isMealEligible) {
                        Surface(
                            color = colors.emeraldBg,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "✓ Uang Makan",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.emerald,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }
                    if (record.isTransportEligible) {
                        Surface(
                            color = colors.cyanBg,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "✓ Uang Transport",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.cyan,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }
                }

                if (record.notes.isNotBlank()) {
                    Text(
                        text = "Catatan: ${record.notes}",
                        fontSize = 10.sp,
                        color = colors.textMuted
                    )
                }
            }

            IconButton(
                onClick = onDelete,
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .testTag("attendance_delete_item_${record.id}")
            ) {
                Icon(
                    Icons.Default.DeleteOutline,
                    contentDescription = "Hapus Presensi",
                    tint = colors.error.copy(alpha = 0.8f),
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}
