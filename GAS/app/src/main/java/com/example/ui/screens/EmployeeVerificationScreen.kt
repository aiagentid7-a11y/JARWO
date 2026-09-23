package com.example.ui.screens

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.example.ui.theme.GajikuTheme
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import java.util.concurrent.Executors
import kotlin.math.roundToInt

/**
 * Employee attendance verification.
 *
 * Device-side checks:
 * - CameraX preview + ML Kit face detection.
 * - Exactly one face must be visible.
 * - Optional eye-open signal is used as a user guidance check.
 * - Fused Location Provider returns the current position and accuracy.
 * - Android mock-location indicators are surfaced.
 *
 * This screen does NOT identify a person. ML Kit Face Detection detects faces,
 * but it does not recognize individuals. Server-side identity/liveness matching
 * must be added before this result is treated as authoritative attendance.
 *
 * Workplace geofence is intentionally disabled until company coordinates are
 * configured in a trusted backend/configuration.
 */
@Composable
fun EmployeeVerificationScreen(
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val colors = GajikuTheme.colors

    var cameraGranted by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
    }
    var locationGranted by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        )
    }
    var faceCount by remember { mutableIntStateOf(0) }
    var eyesOpen by remember { mutableStateOf<Boolean?>(null) }
    var locationText by remember { mutableStateOf("Belum diverifikasi") }
    var locationAccuracy by remember { mutableStateOf<Float?>(null) }
    var mockLocation by remember { mutableStateOf<Boolean?>(null) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("Izinkan kamera dan lokasi untuk memulai.") }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        cameraGranted = result[Manifest.permission.CAMERA] == true ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        locationGranted = result[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            result[Manifest.permission.ACCESS_COARSE_LOCATION] == true ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        message = if (cameraGranted && locationGranted) {
            "Kamera aktif. Arahkan wajah ke kamera lalu verifikasi lokasi."
        } else {
            "Kamera dan lokasi diperlukan untuk verifikasi presensi."
        }
    }

    DisposableEffect(Unit) {
        onDispose { }
    }

    fun requestPermissions() {
        permissionLauncher.launch(
            arrayOf(
                Manifest.permission.CAMERA,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
        )
    }

    @SuppressLint("MissingPermission")
    fun verifyLocation() {
        if (!locationGranted) {
            requestPermissions()
            return
        }
        busy = true
        message = "Mengambil lokasi..."
        val client = LocationServices.getFusedLocationProviderClient(context)
        client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
            .addOnSuccessListener { location ->
                busy = false
                if (location == null) {
                    locationText = "Lokasi tidak tersedia"
                    locationAccuracy = null
                    mockLocation = null
                    message = "Aktifkan GPS/lokasi dan coba lagi."
                    return@addOnSuccessListener
                }
                locationText = String.format(
                    java.util.Locale.US,
                    "%.6f, %.6f",
                    location.latitude,
                    location.longitude
                )
                locationAccuracy = location.accuracy
                mockLocation = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    location.isMock
                } else {
                    @Suppress("DEPRECATION")
                    location.isFromMockProvider
                }
                message = if (mockLocation == true) {
                    "Lokasi terindikasi mock/fake location. Presensi tidak boleh dilanjutkan."
                } else {
                    "Lokasi berhasil dibaca."
                }
            }
            .addOnFailureListener {
                busy = false
                message = "Gagal membaca lokasi: ${it.message ?: "unknown error"}"
            }
    }

    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    DisposableEffect(Unit) {
        onDispose { cameraExecutor.shutdown() }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = colors.textPrimary)
            }
            Column(modifier = Modifier.weight(1f)) {
                Text("Verifikasi Presensi Employee", style = MaterialTheme.typography.titleLarge, color = colors.textPrimary)
                Text("Facial check + lokasi perangkat", style = MaterialTheme.typography.bodySmall, color = colors.textMuted)
            }
        }

        if (!cameraGranted || !locationGranted) {
            Card(shape = RoundedCornerShape(18.dp)) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = colors.primary)
                    Text("Izin perangkat diperlukan", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "GAS membutuhkan kamera untuk mendeteksi wajah dan lokasi untuk memeriksa posisi perangkat.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Button(onClick = ::requestPermissions) {
                        Text("Izinkan Kamera & Lokasi")
                    }
                }
            }
        } else {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp),
                shape = RoundedCornerShape(20.dp)
            ) {
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { ctx ->
                        val previewView = PreviewView(ctx)
                        val providerFuture = ProcessCameraProvider.getInstance(ctx)
                        providerFuture.addListener({
                            val provider = providerFuture.get()
                            val preview = Preview.Builder().build().also {
                                it.surfaceProvider = previewView.surfaceProvider
                            }
                            val analysis = ImageAnalysis.Builder()
                                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                .build()

                            val detector = FaceDetection.getClient(
                                FaceDetectorOptions.Builder()
                                    .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
                                    .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
                                    .build()
                            )

                            analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                                val mediaImage = imageProxy.image
                                if (mediaImage == null) {
                                    imageProxy.close()
                                } else {
                                    val image = InputImage.fromMediaImage(
                                        mediaImage,
                                        imageProxy.imageInfo.rotationDegrees
                                    )
                                    detector.process(image)
                                        .addOnSuccessListener { faces ->
                                            faceCount = faces.size
                                            val face = faces.singleOrNull()
                                            eyesOpen = if (face == null) null else {
                                                val left = face.leftEyeOpenProbability
                                                val right = face.rightEyeOpenProbability
                                                if (left != null && right != null) {
                                                    left > 0.5f && right > 0.5f
                                                } else null
                                            }
                                        }
                                        .addOnCompleteListener { imageProxy.close() }
                                }
                            }

                            provider.unbindAll()
                            provider.bindToLifecycle(
                                lifecycleOwner,
                                CameraSelector.DEFAULT_FRONT_CAMERA,
                                preview,
                                analysis
                            )
                        }, ContextCompat.getMainExecutor(ctx))
                        previewView
                    }
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatusChip(
                    label = "Wajah: $faceCount",
                    ok = faceCount == 1,
                    colors = colors
                )
                StatusChip(
                    label = when (eyesOpen) {
                        true -> "Mata terbuka"
                        false -> "Buka mata"
                        null -> "Mata: -"
                    },
                    ok = eyesOpen != false && faceCount == 1,
                    colors = colors
                )
            }

            Card(shape = RoundedCornerShape(18.dp)) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = colors.primary)
                        Spacer(Modifier.width(8.dp))
                        Text("Lokasi", style = MaterialTheme.typography.titleMedium)
                    }
                    Text(locationText, style = MaterialTheme.typography.bodyMedium)
                    Text(
                        locationAccuracy?.let { "Akurasi sekitar ${it.roundToInt()} m" } ?: "Akurasi belum tersedia",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.textMuted
                    )
                    if (mockLocation == true) {
                        Text(
                            "⚠ Lokasi mock/fake terdeteksi",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                    Button(
                        onClick = ::verifyLocation,
                        enabled = !busy,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.MyLocation, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text(if (busy) "Memeriksa..." else "Verifikasi Lokasi")
                    }
                }
            }

            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (faceCount == 1 && mockLocation == false) {
                        colors.primaryContainer.copy(alpha = 0.45f)
                    } else {
                        colors.secondaryCardBg
                    }
                )
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Status verifikasi perangkat", style = MaterialTheme.typography.titleMedium)
                    Text(message, style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "Catatan: hasil ini baru pemeriksaan perangkat. Identitas wajah dan liveness belum dianggap terverifikasi tanpa pencocokan server.",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.textMuted
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusChip(
    label: String,
    ok: Boolean,
    colors: com.example.ui.theme.GajikuColors
) {
    Surface(
        shape = RoundedCornerShape(50),
        color = if (ok) colors.emeraldBg else colors.secondaryCardBg
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
            color = if (ok) colors.emerald else colors.textPrimary,
            style = MaterialTheme.typography.labelMedium
        )
    }
}
