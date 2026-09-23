package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Widgets
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.GajikuTheme

/**
 * Layar sambutan pertama kali dibuka (setelah Splash & persetujuan privasi),
 * SEBELUM user dilempar ke Dashboard kosong. Menjelaskan urutan logis
 * pemakaian app: Isi Profil -> Kalkulator Gaji -> fitur lain baru berguna.
 *
 * Ditampilkan otomatis hanya saat profil masih kosong (pengguna baru).
 * Begitu profil sudah diisi & disimpan, layar ini tidak muncul lagi.
 */
@Composable
fun OnboardingScreen(
    onStartFillProfile: () -> Unit,
    onSkip: () -> Unit
) {
    val colors = GajikuTheme.colors

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .statusBarsPadding()
            .navigationBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(36.dp))

        Text(
            text = "Selamat Datang di GAS 👋",
            fontSize = 22.sp,
            fontWeight = FontWeight.ExtraBold,
            color = colors.textPrimary,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Supaya semua fitur perhitungan gaji, lembur, cuti, dan pajak akurat, ikuti 3 langkah ini secara berurutan:",
            fontSize = 13.sp,
            color = colors.textSecondary,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            lineHeight = 19.sp
        )

        Spacer(modifier = Modifier.height(28.dp))

        OnboardingStepCard(
            stepNumber = 1,
            title = "Isi Profil & Komponen Gaji",
            description = "Masukkan data diri, status PTKP, dan rincian gaji (gaji pokok, tunjangan, dll). Data ini jadi dasar SEMUA perhitungan di app.",
            icon = Icons.Default.Person
        )
        Spacer(modifier = Modifier.height(12.dp))
        OnboardingStepCard(
            stepNumber = 2,
            title = "Buka Kalkulator Gaji",
            description = "Setelah profil terisi, Kalkulator Gaji akan otomatis menghitung slip gaji bulanan Anda lengkap dengan potongan pajak & BPJS.",
            icon = Icons.Default.Calculate
        )
        Spacer(modifier = Modifier.height(12.dp))
        OnboardingStepCard(
            stepNumber = 3,
            title = "Jelajahi Fitur Lainnya",
            description = "Lembur, Cuti, THR & Pesangon, Kalender Kerja, Laporan Pajak, Jadwal Shift, dan Panduan BPJS — semua memakai data dari Profil Anda.",
            icon = Icons.Default.Widgets
        )

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = onStartFillProfile,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = colors.primaryContainer)
        ) {
            Text("Mulai Isi Profil Sekarang", fontWeight = FontWeight.Bold, color = colors.onPrimaryContainer, fontSize = 14.sp)
            Spacer(modifier = Modifier.width(6.dp))
            Icon(Icons.Default.ArrowForward, contentDescription = null, tint = colors.onPrimaryContainer, modifier = Modifier.size(16.dp))
        }

        Spacer(modifier = Modifier.height(10.dp))

        TextButton(onClick = onSkip, modifier = Modifier.fillMaxWidth()) {
            Text("Lewati, langsung ke Beranda", color = colors.textMuted, fontSize = 12.5.sp)
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun OnboardingStepCard(
    stepNumber: Int,
    title: String,
    description: String,
    icon: ImageVector
) {
    val colors = GajikuTheme.colors
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Surface(
                color = colors.primaryContainer,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.size(42.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = colors.onPrimaryContainer, modifier = Modifier.size(20.dp))
                }
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Langkah $stepNumber: $title",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = description,
                    fontSize = 11.5.sp,
                    color = colors.textMuted,
                    lineHeight = 15.5.sp
                )
            }
        }
    }
}
