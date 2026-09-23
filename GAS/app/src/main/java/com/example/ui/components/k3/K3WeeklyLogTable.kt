package com.example.ui.components.k3

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.calculator.K3ComplianceStatus
import com.example.domain.calculator.K3DailyAuditItem
import com.example.domain.calculator.K3WeeklyAuditItem
import com.example.ui.theme.GajikuTheme
import java.util.Locale

/**
 * Daftar Riwayat Mingguan Audit K3:
 * Tabel/List per pekan dengan jam kerja aktual vs batas normatif (40 jam kerja normal & 18 jam lembur/minggu),
 * ditandai baris/elemen yang melebihi batas dengan warna merah & ikon warning.
 */
@Composable
fun K3WeeklyLogTable(
    weeklyAudits: List<K3WeeklyAuditItem>,
    modifier: Modifier = Modifier
) {
    val colors = GajikuTheme.colors
    var expandedWeekNum by remember { mutableStateOf<Int?>(1) } // Buka minggu pertama secara default

    Column(
        modifier = modifier
            .fillMaxWidth()
            .testTag("k3_weekly_log_table"),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.Top
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.weight(1f)
            ) {
                Icon(
                    imageVector = Icons.Default.CalendarViewWeek,
                    contentDescription = null,
                    tint = Color(0xFF7C3AED),
                    modifier = Modifier.size(18.dp)
                )
                Text(
                    text = "REKAPITULASI MINGGUAN & HARIAN",
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.sp,
                    color = colors.textPrimary
                )
            }
            Text(
                text = "Batas: 18 Jam Lembur/Pekan",
                fontSize = 9.5.sp,
                fontWeight = FontWeight.SemiBold,
                color = colors.textMuted,
                maxLines = 1,
                modifier = Modifier.padding(top = 2.dp)
            )
        }

        weeklyAudits.forEach { weekItem ->
            val isExpanded = expandedWeekNum == weekItem.weekNumber
            val isViolated = weekItem.complianceStatus == K3ComplianceStatus.PELANGGARAN
            val isWarning = weekItem.complianceStatus == K3ComplianceStatus.WASPADA

            val badgeColor = when (weekItem.complianceStatus) {
                K3ComplianceStatus.AMAN -> colors.emerald
                K3ComplianceStatus.WASPADA -> colors.warning
                K3ComplianceStatus.PELANGGARAN -> colors.error
            }

            val badgeBgColor = when (weekItem.complianceStatus) {
                K3ComplianceStatus.AMAN -> colors.emeraldBg
                K3ComplianceStatus.WASPADA -> colors.amberBg
                K3ComplianceStatus.PELANGGARAN -> colors.roseBg
            }

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("k3_week_card_${weekItem.weekNumber}"),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (isViolated) {
                        if (colors.isDark) Color(0xFF2A1215) else Color(0xFFFEF2F2)
                    } else {
                        colors.surface
                    }
                ),
                border = BorderStroke(
                    1.2.dp,
                    if (isViolated) {
                        colors.error.copy(alpha = 0.7f)
                    } else if (isWarning) {
                        colors.warning.copy(alpha = 0.5f)
                    } else {
                        colors.outline
                    }
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    // Header Baris Pekan
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                expandedWeekNum = if (isExpanded) null else weekItem.weekNumber
                            }
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Surface(
                                color = if (isViolated) colors.roseBg else if (isWarning) colors.amberBg else colors.primary.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.size(38.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        text = "W${weekItem.weekNumber}",
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 13.sp,
                                        color = if (isViolated) colors.error else if (isWarning) colors.warning else colors.primary
                                    )
                                }
                            }

                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = "Pekan ke-${weekItem.weekNumber}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.5.sp,
                                        color = colors.textPrimary
                                    )
                                    Text(
                                        text = "(${weekItem.dateRangeLabel})",
                                        fontSize = 11.sp,
                                        color = colors.textMuted
                                    )
                                }
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text(
                                        text = "Lembur: ${String.format(Locale.US, "%.1f", weekItem.totalOvertimeHours)} / 18h",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (weekItem.totalOvertimeHours > 18.0) colors.error else colors.textPrimary
                                    )
                                    Text(
                                        text = "• Kerja: ${String.format(Locale.US, "%.1f", weekItem.totalCombinedHours)}h",
                                        fontSize = 11.sp,
                                        color = colors.textMuted
                                    )
                                }
                            }
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Surface(
                                color = badgeBgColor,
                                shape = RoundedCornerShape(100.dp),
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = SolidColor(badgeColor.copy(alpha = 0.6f))
                                )
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                                ) {
                                    if (isViolated) {
                                        Icon(
                                            imageVector = Icons.Default.Warning,
                                            contentDescription = null,
                                            tint = colors.error,
                                            modifier = Modifier.size(11.dp)
                                        )
                                    }
                                    Text(
                                        text = weekItem.complianceStatus.label,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = badgeColor
                                    )
                                }
                            }

                            Icon(
                                imageVector = if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                contentDescription = if (isExpanded) "Tutup Rincian" else "Buka Rincian",
                                tint = colors.textMuted,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    // Peringatan Pelanggaran Pekan Ini jika melebihi 18 jam
                    if (isViolated && weekItem.totalOvertimeHours > 18.0) {
                        Surface(
                            color = colors.error.copy(alpha = 0.12f),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 2.dp),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Error,
                                    contentDescription = null,
                                    tint = colors.error,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = "Pelanggaran PP 35/2021: Lembur sepekan ${String.format(Locale.US, "%.1f", weekItem.totalOvertimeHours)} jam (kelebihan ${String.format(Locale.US, "%.1f", weekItem.overtimeExcessHours)} jam).",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = colors.error
                                )
                            }
                        }
                    }

                    // Accordion Table Detail Harian
                    AnimatedVisibility(
                        visible = isExpanded,
                        enter = fadeIn() + expandVertically(),
                        exit = fadeOut() + shrinkVertically()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            HorizontalDivider(color = colors.outline, thickness = 0.8.dp)

                            // Header Kolom Tabel Harian
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(colors.surfaceVariant.copy(alpha = 0.5f), RoundedCornerShape(6.dp))
                                    .padding(horizontal = 8.dp, vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Tanggal", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = colors.textMuted, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1.3f))
                                Text("Normal", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = colors.textMuted, textAlign = TextAlign.Center, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(0.8f))
                                Text("Lembur", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = colors.textMuted, textAlign = TextAlign.Center, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1.1f))
                                Text("Total", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = colors.textMuted, textAlign = TextAlign.Center, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(0.9f))
                                Text("Status", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = colors.textMuted, textAlign = TextAlign.End, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(0.9f))
                            }

                            weekItem.dailyItems.forEach { daily ->
                                DailyLogRowItem(daily = daily)
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DailyLogRowItem(daily: K3DailyAuditItem) {
    val colors = GajikuTheme.colors
    val hasViolation = daily.isOvertimeViolated || daily.isFatigueRisk

    val rowBg = when {
        daily.isOvertimeViolated -> if (colors.isDark) Color(0x33EF4444) else Color(0x15EF4444)
        daily.isFatigueRisk -> if (colors.isDark) Color(0x33F59E0B) else Color(0x15F59E0B)
        daily.overtimeHours > 0 -> colors.surfaceVariant.copy(alpha = 0.35f)
        else -> Color.Transparent
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(6.dp))
            .background(rowBg)
            .padding(horizontal = 8.dp, vertical = 6.dp),
        verticalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Tanggal & Hari
            Column(modifier = Modifier.weight(1.3f)) {
                Text(
                    text = "${daily.dayName}, ${daily.date.takeLast(2)}",
                    fontWeight = if (hasViolation) FontWeight.Bold else FontWeight.Medium,
                    fontSize = 10.5.sp,
                    color = if (daily.isOvertimeViolated) colors.error else colors.textPrimary
                )
                if (daily.dayType != "WORKDAY") {
                    Text(
                        text = if (daily.dayType.contains("HOLIDAY")) "Libur" else "Off",
                        fontSize = 8.5.sp,
                        color = colors.textMuted
                    )
                }
            }

            // Jam Kerja Normal
            Text(
                text = "${String.format(Locale.US, "%.0f", daily.actualWorkedHours)}h",
                fontSize = 10.5.sp,
                color = colors.textPrimary,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(0.8f)
            )

            // Jam Lembur
            Row(
                modifier = Modifier.weight(1.1f),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (daily.isOvertimeViolated) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Over Limit",
                        tint = colors.error,
                        modifier = Modifier.size(11.dp).padding(end = 2.dp)
                    )
                }
                Text(
                    text = if (daily.overtimeHours > 0) "${String.format(Locale.US, "%.1f", daily.overtimeHours)}h" else "-",
                    fontSize = 10.5.sp,
                    fontWeight = if (daily.overtimeHours > 0) FontWeight.Bold else FontWeight.Normal,
                    color = if (daily.isOvertimeViolated) colors.error else if (daily.overtimeHours > 0) colors.textPrimary else colors.textMuted
                )
            }

            // Total Jam Kerja
            Text(
                text = "${String.format(Locale.US, "%.1f", daily.totalWorkHours)}h",
                fontSize = 10.5.sp,
                fontWeight = if (daily.isFatigueRisk) FontWeight.Bold else FontWeight.Normal,
                color = if (daily.isFatigueRisk) colors.warning else colors.textPrimary,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(0.9f)
            )

            // Status K3 Badge
            Box(modifier = Modifier.weight(0.9f), contentAlignment = Alignment.CenterEnd) {
                when {
                    daily.isOvertimeViolated -> {
                        Surface(
                            color = colors.roseBg,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "Over 4h",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.error,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }
                    daily.isFatigueRisk -> {
                        Surface(
                            color = colors.amberBg,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "Fatigue",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.warning,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }
                    daily.overtimeHours > 0 -> {
                        Surface(
                            color = colors.emeraldBg,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "Patuh",
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.emerald,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                            )
                        }
                    }
                    else -> {
                        Text(
                            text = "Normal",
                            fontSize = 8.5.sp,
                            color = colors.textMuted
                        )
                    }
                }
            }
        }

        // Catatan alasan pelanggaran jika ada
        if (daily.violationReason != null) {
            Text(
                text = "⚠️ ${daily.violationReason}",
                fontSize = 8.5.sp,
                color = if (daily.isOvertimeViolated) colors.error else colors.warning,
                modifier = Modifier.padding(start = 2.dp)
            )
        }
    }
}
