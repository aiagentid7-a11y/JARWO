package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    onSplashFinished: () -> Unit
) {
    // Animation States
    val logoScale = remember { Animatable(0.82f) }
    val logoAlpha = remember { Animatable(0f) }
    val contentAlpha = remember { Animatable(0f) }
    val progressAnim = remember { Animatable(0f) }

    // Infinite pulsing glow for ambient fintech aesthetics
    val infiniteTransition = rememberInfiniteTransition(label = "ambient_glow")
    val pulseGlow by infiniteTransition.animateFloat(
        initialValue = 0.45f,
        targetValue = 0.95f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_glow"
    )

    LaunchedEffect(Unit) {
        val totalSplashDuration = 1800L
        val startTime = System.currentTimeMillis()

        // Phase 1: Logo Scale & Fade in
        logoAlpha.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 600, easing = LinearOutSlowInEasing)
        )
        logoScale.animateTo(
            targetValue = 1f,
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessLow
            )
        )
        
        // Phase 2: Content reveal
        contentAlpha.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 400)
        )

        // Phase 3: Progress indicator fill smoothly
        progressAnim.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing)
        )

        // Ensure total splash duration is ~1.8 seconds
        val elapsedTime = System.currentTimeMillis() - startTime
        val remainingDelay = (totalSplashDuration - elapsedTime).coerceAtLeast(0L)
        if (remainingDelay > 0) {
            delay(remainingDelay)
        }
        onSplashFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .clickable { onSplashFinished() }
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF1E0A3C), // Deep midnight violet
                        Color(0xFF130924), // Rich dark plum
                        Color(0xFF0C0B12)  // Pitch obsidian black
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        // Decorative Ambient Background Light Orbs
        Canvas(modifier = Modifier.fillMaxSize()) {
            val centerOffset = Offset(size.width / 2f, size.height * 0.42f)
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF8B5CF6).copy(alpha = 0.22f * pulseGlow),
                        Color(0xFF6D28D9).copy(alpha = 0.10f * pulseGlow),
                        Color.Transparent
                    ),
                    center = centerOffset,
                    radius = size.width * 0.65f
                ),
                center = centerOffset,
                radius = size.width * 0.65f
            )
        }

        // Main Centered Brand Core
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 32.dp)
        ) {
            // Centered Logo with Scale + Alpha animation
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .scale(logoScale.value)
                    .alpha(logoAlpha.value)
                    .size(230.dp)
            ) {
                // Outer Pulse Neon Purple Halo
                Box(
                    modifier = Modifier
                        .size(224.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    Color(0xFF8B5CF6).copy(alpha = 0.50f * pulseGlow),
                                    Color(0xFF6D28D9).copy(alpha = 0.25f * pulseGlow),
                                    Color.Transparent
                                )
                            )
                        )
                )

                // Logo Container with Image
                Image(
                    painter = painterResource(id = R.drawable.gas_official_logo_1787324079317),
                    contentDescription = "Payroll Employee",
                    modifier = Modifier
                        .size(210.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Fit
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Offline Privacy Pill Badge
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color(0xFF140E28),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = Brush.horizontalGradient(
                        listOf(Color(0x3310B981), Color(0x338B5CF6))
                    )
                ),
                modifier = Modifier.alpha(contentAlpha.value)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = null,
                        tint = Color(0xFF34D399),
                        modifier = Modifier.size(12.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "In The World Wal Akhirat",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFC084FC)
                    )
                }
            }
        }

        // Bottom Progress Indicator / Pulse Bar
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 32.dp, start = 48.dp, end = 48.dp)
                .fillMaxWidth(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.alpha(contentAlpha.value)
            ) {
                // Thin glowing progress track
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.55f)
                        .height(3.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF221A38))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progressAnim.value)
                            .fillMaxHeight()
                            .clip(CircleShape)
                            .background(
                                Brush.horizontalGradient(
                                    listOf(
                                        Color(0xFF6D28D9),
                                        Color(0xFFC084FC),
                                        Color(0xFF34D399)
                                    )
                                )
                            )
                    )
                }

                Text(
                    text = "Memuat data regulasi payroll...",
                    fontSize = 10.sp,
                    color = Color(0xFF64748B),
                    fontWeight = FontWeight.Normal
                )
            }
        }
    }
}

