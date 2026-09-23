package com.example.ui.components.k3

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.calculator.K3AuditSummary
import com.example.domain.calculator.K3ComplianceStatus
import com.example.ui.theme.GajikuTheme
import java.util.Locale

/**
 * Card Ringkasan Kepatuhan K3 & Batas Jam Kerja Bulan Berjalan
 * Menampilkan:
 * - Badge status: "Aman" (hijau) / "Waspada" (kuning/gold) / "Pelanggaran" (merah)
 * - Total jam lembur akumulasi minggu ini & bulan ini
 * - Progress bar terhadap batas 18 jam/minggu (PP No. 35/2021)
 */
@Composable
fun K3ComplianceCard(
    auditSummary: K3AuditSummary,
    modifier: Modifier = Modifier
) {
    val colors = GajikuTheme.colors

    val statusColor = when (auditSummary.overallComplianceStatus) {
        K3ComplianceStatus.AMAN -> Color(0xFF10B981) // Hijau Emerald
        K3ComplianceStatus.WASPADA -> Color(0xFFF59E0B) // Kuning Gold / Amber
        K3ComplianceStatus.PELANGGARAN -> Color(0xFFEF4444) // Merah Rose
    }

    val statusBgColor = when (auditSummary.overallComplianceStatus) {
        K3ComplianceStatus.AMAN -> Color(0xFF064E3B).copy(alpha = 0.85f)
        K3ComplianceStatus.WASPADA -> Color(0xFF78350F).copy(alpha = 0.85f)
        K3ComplianceStatus.PELANGGARAN -> Color(0xFF7F1D1D).copy(alpha = 0.85f)
    }

    val statusLabel = when (auditSummary.overallComplianceStatus) {
        K3ComplianceStatus.AMAN -> "AMAN (PATUH REGULASI)"
        K3ComplianceStatus.WASPADA -> "WASPADA (MENDEKATI BATAS)"
        K3ComplianceStatus.PELANGGARAN -> "PELANGGARAN K3 (OVER LIMIT)"
    }

    val animatedProgress by animateFloatAsState(
        targetValue = auditSummary.currentWeekLimitProgress.coerceIn(0f, 1f),
        animationSpec = tween(700),
        label = "k3_weekly_progress"
    )

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("k3_compliance_summary_card"),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1B4B)), // Deep Violet Card
        border = CardDefaults.outlinedCardBorder().copy(
            brush = Brush.linearGradient(
                listOf(
                    Color(0xFF7C3AED).copy(alpha = 0.75f),
                    statusColor.copy(alpha = 0.6f)
                )
            )
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            Color(0xFF7C3AED).copy(alpha = 0.30f),
                            Color(0xFF4C1D95).copy(alpha = 0.15f),
                            Color(0xFF1E1B4B)
                        ),
                        center = Offset(200f, 100f),
                        radius = 600f
                    )
                )
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // 1. Header: Title & Compliance Status Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.Top
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Surface(
                        color = Color(0xFF7C3AED),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.size(28.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.HealthAndSafety,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(17.dp)
                            )
                        }
                    }
                    Column {
                        Text(
                            text = "STATUS KEPATUHAN K3",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 1.sp,
                            color = Color(0xFFDDD6FE)
                        )
                        Text(
                            text = "PP No. 35/2021 & Permenaker 27/2021",
                            fontSize = 9.sp,
                            color = Color(0xFF94A3B8)
                        )
                    }
                }
                // Badge Status
                Surface(
                    color = statusBgColor,
                    shape = RoundedCornerShape(100.dp),
                    border = CardDefaults.outlinedCardBorder().copy(
                        brush = SolidColor(statusColor.copy(alpha = 0.8f))
                    ),
                    modifier = Modifier.padding(top = 2.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(5.dp),
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp)
                    ) {
                        Surface(
                            color = statusColor,
                            shape = CircleShape,
                            modifier = Modifier.size(7.dp)
                        ) {}
                        Text(
                            text = statusLabel,
                            fontSize = 9.5.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                    }
                }
            }

            HorizontalDivider(color = Color(0x33FFFFFF), thickness = 1.dp)

            // 2. Akumulasi Jam Lembur: Minggu Ini & Bulan Ini
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Minggu Ini
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    Text(
                        text = "LEMBUR MINGGU INI",
                        fontSize = 9.5.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.6.sp,
                        color = Color(0xFFCBD5E1)
                    )
                    Row(
                        verticalAlignment = Alignment.Bottom,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = String.format(Locale.US, "%.1f", auditSummary.currentWeekOvertimeHours),
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (auditSummary.currentWeekOvertimeHours > 18.0) Color(0xFFEF4444) else Color.White
                        )
                        Text(
                            text = "/ 18 Jam",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF94A3B8),
                            modifier = Modifier.padding(bottom = 3.dp)
                        )
                    }
                    Text(
                        text = if (auditSummary.currentWeekOvertimeHours > 18.0) {
                            "⚠️ Melebihi kuota ${String.format(Locale.US, "%.1f", auditSummary.currentWeekOvertimeHours - 18.0)} jam"
                        } else {
                            "Sisa aman: ${String.format(Locale.US, "%.1f", 18.0 - auditSummary.currentWeekOvertimeHours)} jam"
                        },
                        fontSize = 9.5.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (auditSummary.currentWeekOvertimeHours > 18.0) Color(0xFFFCA5A5) else Color(0xFF34D399)
                    )
                }

                // Divider vertikal tipis
                Box(
                    modifier = Modifier
                        .height(48.dp)
                        .width(1.dp)
                        .background(Color(0x33FFFFFF))
                )

                // Bulan Ini
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(start = 14.dp),
                    verticalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    Text(
                        text = "TOTAL LEMBUR BULAN INI",
                        fontSize = 9.5.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.6.sp,
                        color = Color(0xFFCBD5E1)
                    )
                    Row(
                        verticalAlignment = Alignment.Bottom,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = String.format(Locale.US, "%.1f", auditSummary.totalMonthOvertimeHours),
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                        Text(
                            text = "Jam",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF94A3B8),
                            modifier = Modifier.padding(bottom = 3.dp)
                        )
                    }
                    Text(
                        text = "Total Kerja: ${String.format(Locale.US, "%.0f", auditSummary.totalMonthWorkHours)} Jam",
                        fontSize = 9.5.sp,
                        color = Color(0xFFCBD5E1)
                    )
                }
            }

            // 3. Progress Bar terhadap Batas 18 Jam / Minggu
            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Penggunaan Kuota Lembur Pekan Ini",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFFE2E8F0)
                    )
                    Text(
                        text = "${(auditSummary.currentWeekLimitProgress * 100).toInt()}% dari Batas Maks",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = when {
                            auditSummary.currentWeekLimitProgress > 1.0f -> Color(0xFFEF4444)
                            auditSummary.currentWeekLimitProgress >= 0.72f -> Color(0xFFF59E0B)
                            else -> Color(0xFF10B981)
                        }
                    )
                }

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(100.dp))
                        .background(Color(0xFF334155))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(animatedProgress)
                            .clip(RoundedCornerShape(100.dp))
                            .background(
                                Brush.horizontalGradient(
                                    listOf(
                                        Color(0xFF7C3AED),
                                        when {
                                            auditSummary.currentWeekLimitProgress > 1.0f -> Color(0xFFEF4444)
                                            auditSummary.currentWeekLimitProgress >= 0.72f -> Color(0xFFF59E0B)
                                            else -> Color(0xFF10B981)
                                        }
                                    )
                                )
                            )
                    )
                }
            }

            // 4. Quick Highlights: Pelanggaran Harian & Mingguan
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    color = if (auditSummary.totalDailyViolations > 0) Color(0x33EF4444) else Color(0x2210B981),
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(
                        1.dp,
                        if (auditSummary.totalDailyViolations > 0) Color(0x66EF4444) else Color(0x4410B981)
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = if (auditSummary.totalDailyViolations > 0) Icons.Default.Warning else Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = if (auditSummary.totalDailyViolations > 0) Color(0xFFFCA5A5) else Color(0xFF6EE7B7),
                            modifier = Modifier.size(15.dp)
                        )
                        Text(
                            text = if (auditSummary.totalDailyViolations > 0) {
                                "${auditSummary.totalDailyViolations}x Lembur > 4 Jam"
                            } else {
                                "Lembur Harian <= 4 Jam (Patuh)"
                            },
                            fontSize = 9.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White,
                            maxLines = 2,
                            lineHeight = 12.sp,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Surface(
                    color = if (auditSummary.totalWeeklyViolations > 0) Color(0x33EF4444) else Color(0x2210B981),
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(
                        1.dp,
                        if (auditSummary.totalWeeklyViolations > 0) Color(0x66EF4444) else Color(0x4410B981)
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = if (auditSummary.totalWeeklyViolations > 0) Icons.Default.ErrorOutline else Icons.Default.Verified,
                            contentDescription = null,
                            tint = if (auditSummary.totalWeeklyViolations > 0) Color(0xFFFCA5A5) else Color(0xFF6EE7B7),
                            modifier = Modifier.size(15.dp)
                        )
                        Text(
                            text = if (auditSummary.totalWeeklyViolations > 0) {
                                "${auditSummary.totalWeeklyViolations}x Pekan Over 18 Jam"
                            } else {
                                "Lembur Mingguan <= 18 Jam"
                            },
                            fontSize = 9.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White,
                            maxLines = 2,
                            lineHeight = 12.sp,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}
