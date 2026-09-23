package com.example.ui.components.k3

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.calculator.K3ComplianceStatus
import com.example.domain.calculator.K3RecommendationItem
import com.example.domain.calculator.K3RecommendationType
import com.example.ui.theme.GajikuTheme

/**
 * Section Rekomendasi K3 Otomatis (Rule-Based):
 * Memberikan saran keselamatan & kepatuhan beban kerja sesuai kondisi aktual data
 * berdasarkan regulasi PP No. 35/2021 & Permenaker No. 27/2021.
 */
@Composable
fun K3RecommendationBox(
    recommendations: List<K3RecommendationItem>,
    modifier: Modifier = Modifier
) {
    val colors = GajikuTheme.colors

    Column(
        modifier = modifier
            .fillMaxWidth()
            .testTag("k3_recommendation_box"),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
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
                    imageVector = Icons.Default.Lightbulb,
                    contentDescription = null,
                    tint = Color(0xFF7C3AED),
                    modifier = Modifier.size(18.dp)
                )
                Text(
                    text = "REKOMENDASI K3 & SAFETY ALERT",
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.sp,
                    color = colors.textPrimary
                )
            }
            Text(
                text = "Rule-Based Otomatis",
                fontSize = 9.5.sp,
                fontWeight = FontWeight.SemiBold,
                color = colors.primary
            )
        }

        recommendations.forEachIndexed { index, item ->
            val (accentColor, bgColor, icon) = when (item.severity) {
                K3ComplianceStatus.PELANGGARAN -> Triple(
                    colors.error,
                    if (colors.isDark) Color(0xFF2E1215) else Color(0xFFFEF2F2),
                    Icons.Default.Dangerous
                )
                K3ComplianceStatus.WASPADA -> Triple(
                    colors.warning,
                    if (colors.isDark) Color(0xFF2E2210) else Color(0xFFFFFBEB),
                    Icons.Default.WarningAmber
                )
                K3ComplianceStatus.AMAN -> Triple(
                    colors.emerald,
                    if (colors.isDark) Color(0xFF0C241B) else Color(0xFFF0FDF4),
                    Icons.Default.CheckCircleOutline
                )
            }

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("k3_recommendation_item_$index"),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = bgColor),
                border = BorderStroke(1.dp, accentColor.copy(alpha = 0.5f)),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Surface(
                        color = accentColor.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.size(36.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = icon,
                                contentDescription = null,
                                tint = accentColor,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Text(
                                text = item.title,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.5.sp,
                                color = if (colors.isDark) colors.textPrimary else Color(0xFF0F172A),
                                modifier = Modifier.weight(1f)
                            )
                            Surface(
                                color = accentColor.copy(alpha = 0.18f),
                                shape = RoundedCornerShape(4.dp),
                                modifier = Modifier.padding(top = 2.dp)
                            ) {
                                Text(
                                    text = item.severity.label,
                                    fontSize = 8.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = accentColor,
                                    maxLines = 1,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp)
                                )
                            }
                        }

                        Text(
                            text = item.message,
                            fontSize = 11.5.sp,
                            lineHeight = 16.sp,
                            color = if (colors.isDark) colors.textPrimary.copy(alpha = 0.9f) else Color(0xFF334155)
                        )

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.padding(top = 2.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Gavel,
                                contentDescription = null,
                                tint = colors.textMuted,
                                modifier = Modifier.size(12.dp)
                            )
                            Text(
                                text = item.legalRef,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Medium,
                                color = colors.textMuted
                            )
                        }
                    }
                }
            }
        }
    }
}
