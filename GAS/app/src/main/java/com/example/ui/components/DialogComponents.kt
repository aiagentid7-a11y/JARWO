package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.domain.util.Formatters
import com.example.ui.theme.GajikuTheme

enum class AttendanceCalculatorMode {
    MEAL_ONLY,
    TRANSPORT_ONLY
}

@Composable
fun PrivacyPolicyDialog(
    onAccept: () -> Unit
) {
    val colors = GajikuTheme.colors

    Dialog(
        onDismissRequest = { /* Modal wajib disetujui */ },
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surfaceCard),
            border = CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.cardBorder))
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(colors.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Security,
                        contentDescription = "Privasi",
                        tint = colors.onPrimaryContainer,
                        modifier = Modifier.size(32.dp)
                    )
                }

                Text(
                    text = "Komitmen Privasi & Keamanan",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary,
                    textAlign = TextAlign.Center
                )

                Text(
                    text = "Aplikasi GAS (Gajiku Aman Selalu) memprioritaskan keamanan data dan transparansi privasi Anda:\n\n" +
                            "• Keamanan Data Gaji & Presensi (100% Offline):\n" +
                            "  Semua data pribadi (Nama, NIK, NPWP, riwayat gaji, lembur, dan presensi) disimpan secara lokal di memori aman perangkat Anda. Kami tidak memiliki server penyimpanan data pribadi Anda.\n\n" +
                            "• Layanan Iklan Pihak Ketiga (Google AdMob):\n" +
                            "  Aplikasi menggunakan SDK Google AdMob untuk menampilkan iklan banner. Google AdMob dapat memproses informasi perangkat dan pengenal iklan anonim (Advertising ID) sesuai Kebijakan Privasi Google.\n\n" +
                            "• Opsi Bebas Iklan (PRO Mode):\n" +
                            "  Pengguna dapat mematikan seluruh iklan dengan mengaktifkan status akun PRO.\n\n" +
                            "• Kepatuhan Hukum:\n" +
                            "  Formula perhitungan disesuaikan dengan UU Cipta Kerja No. 6/2023, PP 35/2021, PP 36/2021, dan PMK 168/2023.",
                    fontSize = 13.sp,
                    color = colors.textSecondary,
                    lineHeight = 19.sp
                )

                val context = LocalContext.current
                OutlinedButton(
                    onClick = {
                        val intent = android.content.Intent(
                            android.content.Intent.ACTION_VIEW,
                            android.net.Uri.parse("https://github.com/aiagentid7-a11y/Kebijakan-Privasi-GAS-Gajiku-Aman-Selalu")
                        )
                        context.startActivity(intent)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, colors.primary)
                ) {
                    Text(
                        text = "Baca Kebijakan Privasi Lengkap",
                        fontWeight = FontWeight.Bold,
                        color = colors.primary,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                }

                Button(
                    onClick = onAccept,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("accept_privacy_button"),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                ) {
                    Text(
                        text = "Saya Mengerti & Setuju",
                        fontWeight = FontWeight.Bold,
                        color = colors.onPrimary,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun ProUpgradeDialog(
    isProUser: Boolean,
    productPrice: String?,
    onPurchaseClick: () -> Unit,
    onDismiss: () -> Unit
) {
    val colors = GajikuTheme.colors

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = colors.surfaceCard),
            border = CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.primary))
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(CircleShape)
                        .background(colors.heroGradient),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = "GAS Pro",
                        tint = Color.White,
                        modifier = Modifier.size(36.dp)
                    )
                }

                Text(
                    text = if (isProUser) "GAS Pro Aktif" else "Tingkatkan ke GAS Pro",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary,
                    textAlign = TextAlign.Center
                )

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    ProFeatureRow("Bebas Iklan Selamanya", colors.textPrimary)
                    ProFeatureRow("Ekspor Slip Gaji PDF Tanpa Batas", colors.textPrimary)
                    ProFeatureRow("Kalkulasi PPh 21 TER & Analitik Cuti", colors.textPrimary)
                    ProFeatureRow("Dukungan Backup & Export Format Lengkap", colors.textPrimary)
                }

                Spacer(modifier = Modifier.height(8.dp))

                if (!isProUser) {
                    Button(
                        onClick = onPurchaseClick,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("toggle_pro_button"),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                    ) {
                        Text(
                            text = if (productPrice != null) "Beli Sekarang - $productPrice" else "Beli Sekarang",
                            fontWeight = FontWeight.Bold,
                            color = colors.onPrimary,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }
                }

                TextButton(onClick = onDismiss) {
                    Text("Tutup", color = colors.textMuted)
                }
            }
        }
    }
}

@Composable
private fun ProFeatureRow(text: String, textColor: Color) {
    val colors = GajikuTheme.colors
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            tint = colors.success,
            modifier = Modifier.size(18.dp)
        )
        Text(text = text, fontSize = 13.sp, color = textColor)
    }
}

@Composable
fun AttendanceAllowanceCalculatorDialog(
    initialAttendanceDays: Int = 0,
    initialMealTotal: Double = 0.0,
    initialTransportTotal: Double = 0.0,
    mode: AttendanceCalculatorMode = AttendanceCalculatorMode.MEAL_ONLY,
    onApply: (days: Int, mealTotal: Double, transportTotal: Double, mealRate: Double, transportRate: Double) -> Unit,
    onDismiss: () -> Unit
) {
    val colors = GajikuTheme.colors
    var attendanceDaysInput by remember { mutableStateOf(if (initialAttendanceDays > 0) initialAttendanceDays.toString() else "0") }
    
    val initialMealRate = if (initialAttendanceDays > 0 && initialMealTotal > 0) {
        (initialMealTotal / initialAttendanceDays).toLong().toString()
    } else if (initialMealTotal > 0) {
        initialMealTotal.toLong().toString()
    } else {
        "0"
    }
    val initialTransportRate = if (initialAttendanceDays > 0 && initialTransportTotal > 0) {
        (initialTransportTotal / initialAttendanceDays).toLong().toString()
    } else if (initialTransportTotal > 0) {
        initialTransportTotal.toLong().toString()
    } else {
        "0"
    }

    var mealRateInput by remember { mutableStateOf(initialMealRate) }
    var transportRateInput by remember { mutableStateOf(initialTransportRate) }

    val days = attendanceDaysInput.toIntOrNull() ?: 0
    val mealRate = mealRateInput.toDoubleOrNull() ?: 0.0
    val transportRate = transportRateInput.toDoubleOrNull() ?: 0.0

    val calculatedMealTotal = days * mealRate
    val calculatedTransportTotal = days * transportRate

    AlertDialog(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(22.dp),
        title = {
            Text(
                text = when (mode) {
                    AttendanceCalculatorMode.MEAL_ONLY -> "Kalkulator Uang Makan"
                    AttendanceCalculatorMode.TRANSPORT_ONLY -> "Kalkulator Uang Transport"
                },
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
                color = colors.textPrimary
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Hitung estimasi tunjangan berbasis hari kehadiran (PP No. 36/2021 & PP No. 51/2023).",
                    fontSize = 12.sp,
                    color = colors.textSecondary
                )

                OutlinedTextField(
                    value = attendanceDaysInput,
                    onValueChange = { attendanceDaysInput = it.filter { ch -> ch.isDigit() } },
                    label = { Text("Jumlah Hari Hadir (Hari)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    colors = highContrastTextFieldColors(),
                    singleLine = true
                )

                if (mode == AttendanceCalculatorMode.MEAL_ONLY) {
                    OutlinedTextField(
                        value = mealRateInput,
                        onValueChange = { mealRateInput = it.filter { ch -> ch.isDigit() } },
                        label = { Text("Tarif Uang Makan per Hari (Rp)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        colors = highContrastTextFieldColors(),
                        singleLine = true
                    )
                    Text(
                        text = "Total Makan: ${Formatters.formatRupiah(calculatedMealTotal)} ($days hari x ${Formatters.formatRupiah(mealRate)})",
                        fontSize = 11.5.sp,
                        color = colors.primary,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                if (mode == AttendanceCalculatorMode.TRANSPORT_ONLY) {
                    OutlinedTextField(
                        value = transportRateInput,
                        onValueChange = { transportRateInput = it.filter { ch -> ch.isDigit() } },
                        label = { Text("Tarif Uang Transport per Hari (Rp)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        colors = highContrastTextFieldColors(),
                        singleLine = true
                    )
                    Text(
                        text = "Total Transport: ${Formatters.formatRupiah(calculatedTransportTotal)} ($days hari x ${Formatters.formatRupiah(transportRate)})",
                        fontSize = 11.5.sp,
                        color = colors.primary,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onApply(days, calculatedMealTotal, calculatedTransportTotal, mealRate, transportRate)
                },
                colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
            ) {
                Text("Terapkan", color = colors.onPrimary, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Batal", color = colors.textMuted)
            }
        }
    )
}
