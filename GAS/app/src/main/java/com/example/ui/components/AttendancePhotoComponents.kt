package com.example.ui.components

import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import androidx.compose.runtime.rememberCoroutineScope

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.PhotoCamera
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.data.model.AttendanceRecord
import com.example.domain.util.AttendancePhotoHelper
import com.example.domain.util.Formatters
import com.example.ui.theme.GajikuTheme
import java.io.File

/**
 * Komponen Pengambilan & Pratinjau Foto Bukti Presensi Harian (Kamera Langsung & Watermark Otomatis)
 */
@Composable
fun AttendancePhotoCaptureCard(
    currentPhotoPath: String?,
    onPhotoCaptured: (String?) -> Unit,
    employeeName: String? = null,
    employeeNik: String? = null,
    status: String? = "HADIR",
    modifier: Modifier = Modifier
) {
    val colors = GajikuTheme.colors
    val context = LocalContext.current
    var isProcessing by remember { mutableStateOf(false) }
    var tempPhotoUri by remember { mutableStateOf<android.net.Uri?>(null) }

    val coroutineScope = androidx.compose.runtime.rememberCoroutineScope()
    // Launcher untuk memilih foto dari galeri (Photo Picker)
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: android.net.Uri? ->
        if (uri != null) {
            isProcessing = true
            coroutineScope.launch(Dispatchers.IO) {
                val savedPath = AttendancePhotoHelper.processAndSaveAttendancePhotoFromUri(
                    context = context,
                    sourceUri = uri,
                    employeeName = employeeName,
                    employeeNik = employeeNik,
                    status = status
                )
                launch(Dispatchers.Main) {
                    isProcessing = false
                    if (savedPath != null) {
                        onPhotoCaptured(savedPath)
                        Toast.makeText(context, "Foto bukti presensi berhasil dipilih & di-watermark!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(context, "Gagal memproses foto", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }

    // Launcher untuk membuka kamera bawaan langsung
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success: Boolean ->
        if (success && tempPhotoUri != null) {
            isProcessing = true
            coroutineScope.launch(Dispatchers.IO) {
                val savedPath = AttendancePhotoHelper.processAndSaveAttendancePhotoFromUri(
                    context = context,
                    sourceUri = tempPhotoUri!!,
                    employeeName = employeeName,
                    employeeNik = employeeNik,
                    status = status
                )
                launch(Dispatchers.Main) {
                    isProcessing = false
                    if (savedPath != null) {
                        onPhotoCaptured(savedPath)
                        Toast.makeText(context, "Foto bukti presensi berhasil diambil & di-watermark!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(context, "Gagal memproses foto", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }

    // Permission launcher untuk izin Kamera
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            try {
                val tempFile = File(context.cacheDir, "temp_camera_${System.currentTimeMillis()}.jpg")
                val uri = androidx.core.content.FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    tempFile
                )
                tempPhotoUri = uri
                cameraLauncher.launch(uri)
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal membuka kamera: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        } else {
            Toast.makeText(
                context,
                "Izin kamera diperlukan untuk mengambil foto bukti presensi",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    fun launchCameraFlow() {
        try {
            val hasPermission = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED

            if (hasPermission) {
                val tempFile = File(context.cacheDir, "temp_camera_${System.currentTimeMillis()}.jpg")
                val uri = androidx.core.content.FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    tempFile
                )
                tempPhotoUri = uri
                cameraLauncher.launch(uri)
            } else {
                permissionLauncher.launch(Manifest.permission.CAMERA)
            }
        } catch (e: Exception) {
            Toast.makeText(context, "Gagal membuka kamera: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }

    Surface(
        color = colors.surfaceVariant.copy(alpha = 0.6f),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, colors.outline.copy(alpha = 0.4f)),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Header Section
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.CameraAlt,
                        contentDescription = null,
                        tint = colors.primary,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "Foto Bukti Presensi (Opsional)",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                }

                Surface(
                    color = colors.emeraldBg,
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = "100% Offline",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.emerald,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            if (isProcessing) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = colors.primary
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Memproses watermark & menyimpan foto...",
                        fontSize = 11.5.sp,
                        color = colors.textSecondary
                    )
                }
            } else if (!currentPhotoPath.isNullOrBlank() && File(currentPhotoPath).exists()) {
                val photoFile = remember(currentPhotoPath) { File(currentPhotoPath) }
                val fileSize = if (photoFile.exists()) photoFile.length() else 0L
                val photoTimeFormatted = remember(photoFile.lastModified()) {
                    val fileTime = if (photoFile.lastModified() > 0) photoFile.lastModified() else System.currentTimeMillis()
                    val sdf = java.text.SimpleDateFormat("EEEE, d MMM yyyy • HH:mm", java.util.Locale("id"))
                    val tz = java.util.TimeZone.getDefault()
                    val tzAbbr = when {
                        tz.rawOffset == 7 * 3600 * 1000 -> "WIB"
                        tz.rawOffset == 8 * 3600 * 1000 -> "WITA"
                        tz.rawOffset == 9 * 3600 * 1000 -> "WIT"
                        else -> "WIB"
                    }
                    "${sdf.format(java.util.Date(fileTime))} $tzAbbr"
                }

                // Tampilan Kartu Bukti Foto yang Bersih & Rapi
                Surface(
                    color = colors.surface,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, colors.emerald.copy(alpha = 0.5f)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Header info foto & tombol aksi
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                color = colors.emeraldBg,
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(5.dp)
                                            .clip(CircleShape)
                                            .background(colors.emerald)
                                    )
                                    Text(
                                        text = "TERVERIFIKASI ASLI • GAS",
                                        fontSize = 9.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.emerald
                                    )
                                }
                            }

                            Row(
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                TextButton(
                                    onClick = { launchCameraFlow() },
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                    modifier = Modifier.height(28.dp).testTag("photo_retake_button")
                                ) {
                                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(14.dp), tint = colors.primary)
                                    Spacer(Modifier.width(4.dp))
                                    Text("Ubah", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                                }

                                TextButton(
                                    onClick = {
                                        AttendancePhotoHelper.deletePhotoFile(currentPhotoPath)
                                        onPhotoCaptured(null)
                                    },
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                    modifier = Modifier.height(28.dp).testTag("photo_delete_button")
                                ) {
                                    Icon(Icons.Default.DeleteOutline, contentDescription = null, modifier = Modifier.size(14.dp), tint = colors.error)
                                    Spacer(Modifier.width(4.dp))
                                    Text("Hapus", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.error)
                                }
                            }
                        }

                        // Baris Utama: Thumbnail & Meta Info
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(64.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .border(1.dp, colors.outline.copy(alpha = 0.5f), RoundedCornerShape(10.dp))
                                    .testTag("photo_proof_thumbnail")
                            ) {
                                AsyncImage(
                                    model = ImageRequest.Builder(context)
                                        .data(photoFile)
                                        .crossfade(true)
                                        .build(),
                                    contentDescription = "Foto Bukti Terlampir",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }

                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(2.dp)
                            ) {
                                Text(
                                    text = photoTimeFormatted,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = colors.textPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )

                                val employeeLabel = buildString {
                                    if (!employeeName.isNullOrBlank() && !employeeNik.isNullOrBlank()) {
                                        append("${employeeName.trim()} (${employeeNik.trim()})")
                                    } else if (!employeeName.isNullOrBlank()) {
                                        append(employeeName.trim())
                                    } else {
                                        append("Karyawan")
                                    }
                                    append(" • ")
                                    append(status ?: "HADIR")
                                }

                                Text(
                                    text = employeeLabel,
                                    fontSize = 10.sp,
                                    color = colors.textSecondary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )

                                Text(
                                    text = "Ukuran file: ${AttendancePhotoHelper.formatFileSize(fileSize)}",
                                    fontSize = 9.5.sp,
                                    color = colors.textMuted
                                )
                            }
                        }
                    }
                }
            } else {
                // Tampilan Sebelum Foto Diambil: Tombol Buka Kamera & Pilih Galeri
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = { launchCameraFlow() },
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .testTag("attendance_take_photo_button"),
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, colors.primary.copy(alpha = 0.6f)),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = colors.primaryContainer.copy(alpha = 0.15f)
                        ),
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.PhotoCamera,
                            contentDescription = null,
                            tint = colors.primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Kamera Langsung",
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.primary
                        )
                    }

                    OutlinedButton(
                        onClick = {
                            galleryLauncher.launch(
                                androidx.activity.result.PickVisualMediaRequest(
                                    ActivityResultContracts.PickVisualMedia.ImageOnly
                                )
                            )
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .testTag("attendance_pick_gallery_button"),
                        shape = RoundedCornerShape(10.dp),
                        border = BorderStroke(1.dp, colors.outline.copy(alpha = 0.6f)),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = colors.surfaceVariant.copy(alpha = 0.3f)
                        ),
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Image,
                            contentDescription = null,
                            tint = colors.textSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Pilih Galeri",
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = colors.textSecondary
                        )
                    }
                }

                Text(
                    text = "Foto akan otomatis disematkan watermark tanggal, jam & identitas karyawan.",
                    fontSize = 10.sp,
                    color = colors.textMuted,
                    modifier = Modifier.padding(start = 2.dp)
                )
            }
        }
    }
}



/**
 * Banner Peringatan Storage Foto jika kapasitas melebihi batas (misal 50MB)
 */
@Composable
fun AttendanceStorageWarningBanner(
    totalSizeBytes: Long,
    onCleanupTriggered: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = GajikuTheme.colors
    val context = LocalContext.current
    val thresholdBytes = 50L * 1024 * 1024 // 50MB
    val isExceeded = totalSizeBytes > thresholdBytes

    AnimatedVisibility(visible = isExceeded) {
        Surface(
            color = colors.amberBg,
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, colors.amber.copy(alpha = 0.5f)),
            modifier = modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp)
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.WarningAmber,
                    contentDescription = null,
                    tint = colors.amber,
                    modifier = Modifier.size(24.dp)
                )

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Penyimpanan Foto Presensi: ${AttendancePhotoHelper.formatFileSize(totalSizeBytes)}",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                    Text(
                        text = "Total foto telah melampaui 50MB. Disarankan membersihkan foto lama (>90 hari) untuk menghemat ruang memori HP.",
                        fontSize = 10.sp,
                        color = colors.textSecondary,
                        lineHeight = 13.sp
                    )
                }

                Button(
                    onClick = {
                        val deleted = AttendancePhotoHelper.cleanupOldAttendancePhotos(context, olderThanDays = 90)
                        onCleanupTriggered()
                        Toast.makeText(
                            context,
                            if (deleted > 0) "$deleted file foto lama berhasil dibersihkan!" else "Tidak ada foto >90 hari untuk dibersihkan",
                            Toast.LENGTH_SHORT
                        ).show()
                    },
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = colors.amber),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text("Bersihkan", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                }
            }
        }
    }
}
