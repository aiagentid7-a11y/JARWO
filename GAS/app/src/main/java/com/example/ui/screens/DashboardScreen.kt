package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.LeaveRecord
import com.example.data.model.MonthlyPayrollHistory
import com.example.data.model.OvertimeLog
import com.example.data.model.UserProfile
import com.example.domain.util.Formatters
import com.example.ui.components.AdBannerPlaceholder
import com.example.ui.components.LegalDisclaimerCard
import com.example.ui.components.UmpWarningBanner
import com.example.ui.theme.*
import java.util.Calendar

@Composable
fun DashboardScreen(
    userProfile: UserProfile,
    isProUser: Boolean,
    latestPayroll: MonthlyPayrollHistory?,
    totalOvertimeHoursThisMonth: Double,
    totalPayrollHistories: List<MonthlyPayrollHistory>,
    overtimeLogs: List<OvertimeLog> = emptyList(),
    leaveRecords: List<LeaveRecord> = emptyList(),
    attendanceRecords: List<com.example.data.model.AttendanceRecord> = emptyList(),
    onNavigateToTab: (Int) -> Unit,
    onSelectPayrollDetail: (MonthlyPayrollHistory) -> Unit,
    onOpenProDialog: () -> Unit,
    themeMode: String = "SYSTEM",
    onToggleThemeMode: (String) -> Unit = {}
) {
    val colors = GajikuTheme.colors
    val initials = remember(userProfile.fullName) {
        val parts = userProfile.fullName.trim().split(" ")
        if (parts.size >= 2) "${parts[0].take(1)}${parts[1].take(1)}".uppercase()
        else userProfile.fullName.take(2).uppercase().ifEmpty { "ME" }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 32.dp)
    ) {
        // 1. Top Bar Header (Branding & User Status & Theme Switcher)
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 2.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "GAS",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = (-0.5).sp,
                            color = colors.textPrimary
                        )
                        Surface(
                            color = if (isProUser) colors.proBadgeBg else colors.surfaceVariant,
                            shape = RoundedCornerShape(8.dp),
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = SolidColor(if (isProUser) colors.primary else colors.outline)
                            )
                        ) {
                            Text(
                                text = if (isProUser) "PRO" else "FREE",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.ExtraBold,
                                letterSpacing = 0.8.sp,
                                color = if (isProUser) colors.proBadgeText else colors.textMuted,
                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                            )
                        }
                    }
                    Text(
                        text = "Personal Payroll",
                        fontSize = 11.5.sp,
                        color = colors.textMuted
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Quick Light / Dark Mode Toggle Button
                    Surface(
                        color = colors.surfaceVariant,
                        shape = CircleShape,
                        border = CardDefaults.outlinedCardBorder().copy(
                            brush = SolidColor(colors.outline)
                        ),
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .clickable {
                                val nextTheme = when (themeMode) {
                                    "LIGHT" -> "DARK"
                                    "DARK" -> "LIGHT"
                                    else -> if (colors.isDark) "LIGHT" else "DARK"
                                }
                                onToggleThemeMode(nextTheme)
                            }
                            .testTag("quick_theme_toggle_button")
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                            Icon(
                                imageVector = when (themeMode) {
                                    "LIGHT" -> Icons.Default.LightMode
                                    "DARK" -> Icons.Default.DarkMode
                                    else -> if (colors.isDark) Icons.Default.DarkMode else Icons.Default.LightMode
                                },
                                contentDescription = if (colors.isDark) "Ubah ke Mode Terang" else "Ubah ke Mode Gelap",
                                tint = if (colors.isDark) Color(0xFFFBBF24) else Color(0xFF7C3AED),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    Surface(
                        color = if (isProUser) colors.primaryContainer.copy(alpha = 0.4f) else colors.surfaceVariant,
                        shape = RoundedCornerShape(100.dp),
                        border = CardDefaults.outlinedCardBorder().copy(
                            brush = SolidColor(if (isProUser) colors.primary.copy(alpha = 0.5f) else colors.outline)
                        ),
                        modifier = Modifier.clickable { onOpenProDialog() }
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
                        ) {
                            Icon(
                                imageVector = if (isProUser) Icons.Default.Verified else Icons.Default.Star,
                                contentDescription = null,
                                tint = if (isProUser) colors.primary else colors.warning,
                                modifier = Modifier.size(13.dp)
                            )
                            Text(
                                text = if (isProUser) "PRO" else "UPGRADE",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isProUser) colors.primary else colors.warning
                            )
                        }
                    }

                    // Avatar with gradient border ring
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(Brush.linearGradient(listOf(colors.primaryContainer, colors.indigoBg)))
                            .clickable { onNavigateToTab(4) },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = initials,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = colors.onPrimaryContainer
                        )
                    }
                }
            }
        }

        // 1b. Banner "Mulai dari Sini" — tampil selama Profil belum diisi,
        // supaya user selalu tahu langkah pertama yang harus dilakukan
        // walau sudah melewatkan layar Onboarding.
        if (userProfile.fullName.isBlank()) {
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onNavigateToTab(4) },
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = colors.primaryContainer.copy(alpha = if (colors.isDark) 0.35f else 0.9f))
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(Icons.Default.Person, contentDescription = null, tint = colors.onPrimaryContainer, modifier = Modifier.size(22.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Mulai dari sini: isi Profil Anda",
                                fontSize = 12.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.onPrimaryContainer
                            )
                            Text(
                                "Data gaji & pajak baru bisa dihitung setelah Profil terisi.",
                                fontSize = 10.5.sp,
                                color = colors.onPrimaryContainer.copy(alpha = 0.85f),
                                lineHeight = 14.sp
                            )
                        }
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = colors.onPrimaryContainer, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        // 2. UMP Warning Banner (if salary deficit detected)
        item {
            UmpWarningBanner(
                isBelowUmp = userProfile.isBelowUmp,
                deficitAmount = userProfile.umpDeficit
            )
        }

        // 3. Primary Focal Point: Estimasi Take Home Pay Hero Card
        item {
            val isPphActive = latestPayroll?.isPph21Enabled ?: userProfile.isPph21Enabled
            val estimatedThp = latestPayroll?.netTakeHomePay ?: (userProfile.totalFixedSalary * if (isPphActive) 0.96 else 0.98)
            val pphAmount = if (isPphActive) {
                latestPayroll?.pph21Amount ?: (userProfile.totalFixedSalary * 0.015)
            } else 0.0
            val periodText = latestPayroll?.periodLabel ?: "Estimasi Bulan Berjalan"

            var cardPressed by remember { mutableStateOf(false) }
            val cardScale by animateFloatAsState(
                targetValue = if (cardPressed) 0.98f else 1.0f,
                animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
                label = "hero_scale"
            )

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .scale(cardScale)
                    .clip(RoundedCornerShape(24.dp))
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onPress = {
                                cardPressed = true
                                tryAwaitRelease()
                                cardPressed = false
                            },
                            onTap = {
                                if (latestPayroll != null) onSelectPayrollDetail(latestPayroll)
                                else onNavigateToTab(1)
                            }
                        )
                    }
                    .testTag("thp_summary_card"),
                shape = RoundedCornerShape(24.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = if (colors.isDark) 0.dp else 4.dp),
                colors = CardDefaults.cardColors(containerColor = Color.Transparent)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.heroGradient)
                        .drawBehind {
                            drawCircle(
                                brush = Brush.radialGradient(
                                    colors = listOf(
                                        Color(0xFF8B5CF6).copy(alpha = if (colors.isDark) 0.35f else 0.20f),
                                        Color(0xFF6366F1).copy(alpha = if (colors.isDark) 0.15f else 0.08f),
                                        Color.Transparent
                                    ),
                                    center = Offset(size.width * 0.85f, size.height * 0.15f),
                                    radius = size.width * 0.55f
                                )
                            )
                        }
                        .padding(22.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        // Card Header Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Surface(
                                    color = Color(0xFFC084FC),
                                    shape = CircleShape,
                                    modifier = Modifier.size(8.dp)
                                ) {}
                                Text(
                                    text = "ESTIMASI TAKE HOME PAY",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    letterSpacing = 1.2.sp,
                                    color = Color(0xFFDDD6FE)
                                )
                            }
                            Surface(
                                color = Color(0x40000000),
                                shape = RoundedCornerShape(100.dp),
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = SolidColor(Color(0x33A855F7))
                                )
                            ) {
                                Text(
                                    text = periodText,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFFF1F5F9),
                                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp)
                                )
                            }
                        }

                        // Big Prominent Rupiah Value
                        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Row(
                                verticalAlignment = Alignment.Bottom,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text(
                                    text = Formatters.formatRupiah(estimatedThp),
                                    fontSize = 30.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    letterSpacing = (-1.0).sp,
                                    color = Color.White
                                )
                                Surface(
                                    color = Color(0xFF064E3B),
                                    shape = RoundedCornerShape(8.dp),
                                    border = CardDefaults.outlinedCardBorder().copy(
                                        brush = SolidColor(Color(0xFF10B981).copy(alpha = 0.5f))
                                    ),
                                    modifier = Modifier.padding(bottom = 4.dp)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    ) {
                                        Surface(
                                            color = Color(0xFF34D399),
                                            shape = CircleShape,
                                            modifier = Modifier.size(5.dp)
                                        ) {}
                                        Text(
                                            text = "Bersih",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = Color(0xFF34D399)
                                        )
                                    }
                                }
                            }
                            Text(
                                text = "Gaji Pokok + Tunjangan - PPh 21 - BPJS",
                                fontSize = 10.5.sp,
                                color = Color(0xFFE2E8F0).copy(alpha = 0.85f)
                            )
                        }

                        HorizontalDivider(
                            color = Color(0x33FFFFFF),
                            thickness = 1.dp,
                            modifier = Modifier.padding(vertical = 2.dp)
                        )

                        // Sub-metrics Row (Lembur & Pajak PPh 21)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Surface(
                                    color = Color(0xFF0F2A28),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.size(34.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            Icons.Default.AccessTime,
                                            contentDescription = null,
                                            tint = Color(0xFF14B8A6),
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                                Column {
                                    Text(
                                        "TOTAL LEMBUR",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 0.5.sp,
                                        color = Color(0xFFCBD5E1)
                                    )
                                    Text(
                                        text = "${totalOvertimeHoursThisMonth} Jam",
                                        fontSize = 13.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                            }

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        if (isPphActive) "PPH 21 (TER ${userProfile.ptkpStatus})" else "PPH 21 (NONAKTIF)",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        letterSpacing = 0.5.sp,
                                        color = Color(0xFFCBD5E1)
                                    )
                                    Text(
                                        text = if (isPphActive) "-${Formatters.formatRupiah(pphAmount)}" else "Rp 0",
                                        fontSize = 13.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isPphActive) Color(0xFFFB7185) else Color(0xFF34D399)
                                    )
                                }
                                Surface(
                                    color = if (isPphActive) Color(0xFF4C0519) else Color(0xFF064E3B),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.size(34.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            if (isPphActive) Icons.Default.TrendingDown else Icons.Default.Check,
                                            contentDescription = null,
                                            tint = if (isPphActive) Color(0xFFFB7185) else Color(0xFF34D399),
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 4. Feature Grid Section Header
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "FITUR & ESS MANDIRI",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.2.sp,
                    color = colors.textMuted
                )
                Text(
                    text = "Regulasi Indonesia",
                    fontSize = 10.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.primary
                )
            }
        }

        // Feature Grid as Gojek/Grab Service Tiles: 4 items per row
        item {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                // Row 1
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    GojekServiceTile(
                        label = "Log Lembur",
                        icon = Icons.Default.AccessTime,
                        badgeColor = colors.tealBg,
                        iconColor = colors.teal,
                        onClick = { onNavigateToTab(2) },
                        modifier = Modifier.weight(1f)
                    )
                    GojekServiceTile(
                        label = "Presensi",
                        icon = Icons.Default.FactCheck,
                        badgeColor = colors.emeraldBg,
                        iconColor = colors.emerald,
                        onClick = { onNavigateToTab(11) },
                        modifier = Modifier.weight(1f)
                    )
                    GojekServiceTile(
                        label = "Slip Gaji",
                        icon = Icons.Default.ReceiptLong,
                        badgeColor = colors.indigoBg,
                        iconColor = colors.indigo,
                        onClick = { onNavigateToTab(1) },
                        modifier = Modifier.weight(1f)
                    )
                    GojekServiceTile(
                        label = "Cuti & Hak",
                        icon = Icons.Default.EventNote,
                        badgeColor = colors.cyanBg,
                        iconColor = colors.cyan,
                        onClick = { onNavigateToTab(3) },
                        modifier = Modifier.weight(1f)
                    )
                }

                // Row 2
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    GojekServiceTile(
                        label = "Audit K3",
                        icon = Icons.Default.HealthAndSafety,
                        badgeColor = Color(0xFFEDE9FE),
                        iconColor = Color(0xFF7C3AED),
                        onClick = { onNavigateToTab(12) },
                        modifier = Modifier.weight(1f)
                    )
                    GojekServiceTile(
                        label = "Shift & Jam",
                        icon = Icons.Default.Schedule,
                        badgeColor = colors.tealBg,
                        iconColor = colors.teal,
                        onClick = { onNavigateToTab(8) },
                        modifier = Modifier.weight(1f)
                    )
                    GojekServiceTile(
                        label = "Kalender",
                        icon = Icons.Default.CalendarMonth,
                        badgeColor = colors.cyanBg,
                        iconColor = colors.cyan,
                        onClick = { onNavigateToTab(6) },
                        modifier = Modifier.weight(1f)
                    )
                    GojekServiceTile(
                        label = "Kompensasi",
                        icon = Icons.Default.Calculate,
                        badgeColor = colors.amberBg,
                        iconColor = colors.amber,
                        onClick = { onNavigateToTab(5) },
                        modifier = Modifier.weight(1f)
                    )
                }

                // Row 3 (Pajak, BPJS, Lainnya)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    GojekServiceTile(
                        label = "Laporan Pajak",
                        icon = Icons.Default.Assessment,
                        badgeColor = colors.roseBg,
                        iconColor = colors.rose,
                        onClick = { onNavigateToTab(7) },
                        modifier = Modifier.weight(1f)
                    )
                    GojekServiceTile(
                        label = "Klaim BPJS",
                        icon = Icons.Default.Shield,
                        badgeColor = colors.indigoBg,
                        iconColor = colors.indigo,
                        onClick = { onNavigateToTab(9) },
                        modifier = Modifier.weight(1f)
                    )
                    GojekServiceTile(
                        label = "Fitur Lainnya",
                        icon = Icons.Default.Widgets,
                        badgeColor = colors.surfaceVariant,
                        iconColor = colors.primary,
                        onClick = { onNavigateToTab(10) },
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }

        // =========================================================================
        // 5. BARU: ANALITIK PENDAPATAN TIAP BULAN (Monthly Income Analytics)
        // =========================================================================
        item {
            MonthlyIncomeAnalyticsCard(
                userProfile = userProfile,
                payrollHistories = totalPayrollHistories,
                onCalculateClick = { onNavigateToTab(1) },
                onViewTaxClick = { onNavigateToTab(7) }
            )
        }

        // =========================================================================
        // 6. BARU: JUMLAH KEHADIRAN & JAM KERJA TIAP BULAN (Monthly Attendance Analytics)
        // =========================================================================
        item {
            MonthlyAttendanceAnalyticsCard(
                userProfile = userProfile,
                overtimeLogs = overtimeLogs,
                leaveRecords = leaveRecords,
                attendanceRecords = attendanceRecords,
                onOpenCalendar = { onNavigateToTab(6) },
                onOpenShiftSchedule = { onNavigateToTab(8) },
                onOpenLeaveTracker = { onNavigateToTab(3) }
            )
        }

        // 7. Riwayat Slip Gaji Terbaru Section Header with "Lihat Semua" Link
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "RIWAYAT SLIP GAJI TERAKHIR",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.2.sp,
                    color = colors.textMuted
                )
                Text(
                    text = "Lihat Semua",
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.primary,
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .clickable { onNavigateToTab(1) }
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                )
            }
        }

        // 8. Riwayat List or Friendly Empty State
        if (totalPayrollHistories.isEmpty()) {
            item {
                FintechEmptyPayrollState(
                    onCalculateClick = { onNavigateToTab(1) }
                )
            }
        } else {
            items(totalPayrollHistories.take(3)) { history ->
                FintechPayrollHistoryCard(
                    history = history,
                    onClick = { onSelectPayrollDetail(history) }
                )
            }
        }

        // 9. Ad Banner & Disclaimer Footer
        item {
            Spacer(modifier = Modifier.height(4.dp))
            AdBannerPlaceholder(
                isProUser = isProUser,
                onUpgradeClick = onOpenProDialog
            )
        }

        item {
            LegalDisclaimerCard()
        }
    }
}

/**
 * Komponen Analitik Pendapatan Bulanan (Monthly Income Analytics)
 * Menampilkan ringkasan pendapatan tahun berjalan, rata-rata THP, pendapatan tertinggi,
 * grafik batang perbandingan bulanan (THP & Bruto), dan tren pertumbuhan.
 */
@Composable
private fun MonthlyIncomeAnalyticsCard(
    userProfile: UserProfile,
    payrollHistories: List<MonthlyPayrollHistory>,
    onCalculateClick: () -> Unit,
    onViewTaxClick: () -> Unit
) {
    val colors = GajikuTheme.colors
    val monthShortNames = arrayOf("Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des")
    
    // Sort histories by month
    val currentYear = Calendar.getInstance().get(Calendar.YEAR)
    val yearHistories = remember(payrollHistories, currentYear) {
        payrollHistories.filter { it.year == currentYear }.sortedBy { it.month }
    }

    val totalNetIncomeYtd = remember(yearHistories, userProfile) {
        if (yearHistories.isNotEmpty()) {
            yearHistories.sumOf { it.netTakeHomePay }
        } else {
            userProfile.totalFixedSalary * 0.96 * 8 // Estimasi s.d. bulan berjalan
        }
    }

    val avgNetIncome = remember(yearHistories, userProfile) {
        if (yearHistories.isNotEmpty()) {
            yearHistories.map { it.netTakeHomePay }.average()
        } else {
            userProfile.totalFixedSalary * 0.96
        }
    }

    val maxNetIncome = remember(yearHistories, userProfile) {
        if (yearHistories.isNotEmpty()) {
            yearHistories.maxOf { it.netTakeHomePay }
        } else {
            userProfile.totalFixedSalary * 0.96
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surfaceCard),
        elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
        border = if (colors.isDark) {
            CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.cardBorder))
        } else null
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Header
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
                        color = colors.emeraldBg,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.size(32.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.TrendingUp,
                                contentDescription = null,
                                tint = colors.emerald,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                    Column {
                        Text(
                            text = "ANALITIK PENDAPATAN BULANAN",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 0.8.sp,
                            color = colors.emerald
                        )
                        Text(
                            text = "Tren & Performa Take Home Pay $currentYear",
                            fontSize = 11.sp,
                            color = colors.textMuted
                        )
                    }
                }

                Surface(
                    color = colors.emeraldBg,
                    shape = RoundedCornerShape(8.dp),
                    border = CardDefaults.outlinedCardBorder().copy(
                        brush = SolidColor(colors.emerald.copy(alpha = 0.3f))
                    )
                ) {
                    Text(
                        text = if (yearHistories.isNotEmpty()) "${yearHistories.size} Slip Tersimpan" else "Proyeksi 2026",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.emerald,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            // Summary 3-Col KPI Metrics
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colors.surfaceVariant, RoundedCornerShape(14.dp))
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Total Akumulasi YTD", fontSize = 10.sp, color = colors.textMuted)
                    Text(
                        text = Formatters.formatRupiah(totalNetIncomeYtd),
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = colors.textPrimary
                    )
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Rata-Rata THP", fontSize = 10.sp, color = colors.textMuted)
                    Text(
                        text = Formatters.formatRupiah(avgNetIncome),
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = colors.success
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("THP Tertinggi", fontSize = 10.sp, color = colors.textMuted)
                    Text(
                        text = Formatters.formatRupiah(maxNetIncome),
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = colors.indigo
                    )
                }
            }

            // Interactive Visual Bar Chart (Bulan 1 s.d. 12)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Distribusi Pendapatan per Bulan (Rupiah)",
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary
                )

                // Render Bar Chart for Months
                val maxVal = if (yearHistories.isNotEmpty()) {
                    maxOf(1.0, yearHistories.maxOf { it.netTakeHomePay })
                } else {
                    maxOf(1.0, userProfile.totalFixedSalary * 1.1)
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                        .padding(horizontal = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom
                ) {
                    for (m in 1..12) {
                        val record = yearHistories.firstOrNull { it.month == m }
                        val value = record?.netTakeHomePay ?: (if (m <= 8) userProfile.totalFixedSalary * 0.96 else 0.0)
                        val barRatio = if (maxVal > 0 && value > 0) (value / maxVal).toFloat().coerceIn(0.1f, 1.0f) else 0.05f
                        val isCurrentMonth = m == 8

                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Bottom,
                            modifier = Modifier.weight(1f)
                        ) {
                            if (value > 0) {
                                Box(
                                    modifier = Modifier
                                        .width(14.dp)
                                        .fillMaxHeight(barRatio)
                                        .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                                        .background(
                                            if (isCurrentMonth) Brush.verticalGradient(listOf(colors.primary, colors.indigo))
                                            else if (record != null) Brush.verticalGradient(listOf(colors.emerald, Color(0xFF059669)))
                                            else SolidColor(colors.textMuted.copy(alpha = 0.25f))
                                        )
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .width(14.dp)
                                        .height(4.dp)
                                        .clip(RoundedCornerShape(2.dp))
                                        .background(colors.outline.copy(alpha = 0.3f))
                                )
                            }
                            Spacer(Modifier.height(6.dp))
                            Text(
                                text = monthShortNames[m - 1],
                                fontSize = 9.sp,
                                fontWeight = if (isCurrentMonth) FontWeight.Bold else FontWeight.Normal,
                                color = if (isCurrentMonth) colors.primary else colors.textMuted,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }

            HorizontalDivider(color = colors.outline.copy(alpha = 0.4f), thickness = 0.8.dp)

            // Bottom Actions & Insights
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Surface(color = colors.emerald, shape = CircleShape, modifier = Modifier.size(6.dp)) {}
                    Text("Status: Arus Kas Stabil", fontSize = 10.5.sp, color = colors.textSecondary)
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = onViewTaxClick,
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.primary)
                    ) {
                        Icon(Icons.Default.Assessment, contentDescription = null, modifier = Modifier.size(12.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Lap. Pajak", fontSize = 10.5.sp, fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = onCalculateClick,
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = colors.primary)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(12.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Hitung Slip", fontSize = 10.5.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

/**
 * Komponen Analitik Jumlah Kehadiran & Jam Kerja Tiap Bulan (Monthly Attendance Analytics)
 * Menampilkan:
 * 1. Total Hari Kerja Efektif
 * 2. Hari Masuk Nyata (Reguler & Shift)
 * 3. Total Jam & Hari Lembur
 * 4. Total Hari Cuti / Izin
 * 5. Persentase Tingkat Kehadiran (Attendance Rate %)
 * 6. Rincian Shift Kerja (Pagi, Sore, Malam, Long Shift)
 */
@Composable
private fun MonthlyAttendanceAnalyticsCard(
    userProfile: UserProfile,
    overtimeLogs: List<OvertimeLog>,
    leaveRecords: List<LeaveRecord>,
    attendanceRecords: List<com.example.data.model.AttendanceRecord> = emptyList(),
    onOpenCalendar: () -> Unit,
    onOpenShiftSchedule: () -> Unit,
    onOpenLeaveTracker: () -> Unit
) {
    val colors = GajikuTheme.colors
    // BUG FIX: sebelumnya di-hardcode ke bulan 8 (Agustus) & tahun 2026 (tanggal build),
    // sehingga Dashboard selalu menampilkan periode Agustus 2026 walau aplikasi dibuka
    // di bulan/tahun lain. Sekarang mengikuti tanggal berjalan di perangkat pengguna.
    var selectedMonth by remember { mutableStateOf(Formatters.getCurrentMonth()) } // 1..12
    val currentYear = Formatters.getCurrentYear()

    val monthNames = arrayOf(
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    )

    val monthPrefix = String.format("%04d-%02d", currentYear, selectedMonth)

    // Perhitungan Hari Kerja Efektif Bulanan
    val cal = Calendar.getInstance().apply {
        set(Calendar.YEAR, currentYear)
        set(Calendar.MONTH, selectedMonth - 1)
        set(Calendar.DAY_OF_MONTH, 1)
    }
    val daysInMonth = cal.getActualMaximum(Calendar.DAY_OF_MONTH)
    
    // Hitung hari kerja (Senin s.d. Jumat atau Sabtu sesuai profil kerja)
    var effectiveWorkDays = 0
    for (day in 1..daysInMonth) {
        cal.set(Calendar.DAY_OF_MONTH, day)
        val dayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
        val isWorkday = if (userProfile.workScheduleScheme == "6_DAYS") {
            dayOfWeek != Calendar.SUNDAY
        } else {
            dayOfWeek != Calendar.SATURDAY && dayOfWeek != Calendar.SUNDAY
        }
        if (isWorkday) effectiveWorkDays++
    }

    // Filter data cuti di bulan terpilih
    val leavesInMonth = remember(leaveRecords, monthPrefix) {
        leaveRecords.filter { it.startDate.startsWith(monthPrefix) || it.endDate.startsWith(monthPrefix) }
    }
    val totalLeaveDays = leavesInMonth.sumOf { it.daysCount }

    // Filter data lembur & shift di bulan terpilih
    val otLogsInMonth = remember(overtimeLogs, monthPrefix) {
        overtimeLogs.filter { it.date.startsWith(monthPrefix) }
    }
    val totalOtHours = otLogsInMonth.sumOf { it.hours }
    val otDaysCount = otLogsInMonth.map { it.date }.distinct().size

    val shiftMorningCount = otLogsInMonth.count { it.shiftType == "SHIFT_PAGI" }
    val shiftAfternoonCount = otLogsInMonth.count { it.shiftType == "SHIFT_SORE" }
    val shiftNightCount = otLogsInMonth.count { it.shiftType == "SHIFT_MALAM" }
    val shiftLongCount = otLogsInMonth.count { it.shiftType == "LONG_SHIFT" }
    val totalCustomShifts = shiftMorningCount + shiftAfternoonCount + shiftNightCount + shiftLongCount

    // Filter absensi harian di bulan terpilih
    val attendanceInMonth = remember(attendanceRecords, monthPrefix) {
        attendanceRecords.filter { it.date.startsWith(monthPrefix) }
    }

    // Hari Masuk Kerja Aktual & Tingkat Kehadiran (berdasarkan entri absensi harian)
    val actualWorkDays = attendanceInMonth.count { it.status == "HADIR" || it.status == "TERLAMBAT" }
    val displayTargetDays = effectiveWorkDays
    val attendanceRate = if (displayTargetDays > 0) {
        ((actualWorkDays.toDouble() / displayTargetDays.toDouble()) * 100.0).coerceIn(0.0, 100.0)
    } else {
        0.0
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surfaceCard),
        elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
        border = if (colors.isDark) {
            CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.cardBorder))
        } else null
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Header with Month Switcher
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
                        color = colors.indigoBg,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.size(32.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.EventAvailable,
                                contentDescription = null,
                                tint = colors.indigo,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                    Column {
                        Text(
                            text = "KEHADIRAN & JAM KERJA",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 0.8.sp,
                            color = colors.indigo
                        )
                        Text(
                            text = "Rekapitulasi Presensi & Shift Karyawan",
                            fontSize = 11.sp,
                            color = colors.textMuted
                        )
                    }
                }

                // Month Selector Mini Pills
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    IconButton(
                        onClick = { if (selectedMonth > 1) selectedMonth-- },
                        enabled = selectedMonth > 1,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(Icons.Default.ChevronLeft, contentDescription = "Sebelumnya", tint = colors.textPrimary)
                    }
                    Text(
                        text = monthNames[selectedMonth - 1].take(3),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.indigo
                    )
                    IconButton(
                        onClick = { if (selectedMonth < 12) selectedMonth++ },
                        enabled = selectedMonth < 12,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(Icons.Default.ChevronRight, contentDescription = "Berikutnya", tint = colors.textPrimary)
                    }
                }
            }

            // Attendance Rate Highlight Banner
            Surface(
                color = colors.indigoBg,
                shape = RoundedCornerShape(16.dp),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = SolidColor(colors.indigo.copy(alpha = 0.4f))
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Text(
                            text = "Tingkat Kehadiran (${monthNames[selectedMonth - 1]} $currentYear)",
                            fontSize = 11.sp,
                            color = colors.textSecondary
                        )
                        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                text = String.format("%.1f%%", attendanceRate),
                                fontSize = 24.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = if (attendanceInMonth.isEmpty()) colors.textSecondary else if (attendanceRate >= 95.0) colors.success else if (attendanceRate >= 80.0) colors.warning else colors.indigo
                            )
                            Text(
                                text = if (attendanceInMonth.isEmpty()) "Belum Ada Presensi" else if (attendanceRate >= 98.0) "Presensi Sempurna" else if (attendanceRate >= 90.0) "Kehadiran Baik" else if (attendanceRate >= 50.0) "Progres Berjalan" else "Perlu Ditingkatkan",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = colors.textMuted,
                                modifier = Modifier.padding(bottom = 3.dp)
                            )
                        }
                    }

                    // Circular Progress Tag
                    Surface(
                        color = colors.indigo,
                        shape = CircleShape,
                        modifier = Modifier.size(42.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = "$actualWorkDays/$displayTargetDays",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color.White
                            )
                        }
                    }
                }
            }

            // 4 Grid Attendance Metrics Cards
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Metric 1: Hari Masuk
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = colors.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("Hari Masuk", fontSize = 10.sp, color = colors.textMuted)
                        Text("$actualWorkDays Hari", fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = if (actualWorkDays > 0) colors.success else colors.textMuted)
                        Text("Target $displayTargetDays Hari", fontSize = 9.sp, color = colors.textMuted)
                    }
                }

                // Metric 2: Jam Lembur
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = colors.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("Total Lembur", fontSize = 10.sp, color = colors.textMuted)
                        Text("${totalOtHours} Jam", fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = colors.teal)
                        Text("$otDaysCount Hari Lembur", fontSize = 9.sp, color = colors.textMuted)
                    }
                }

                // Metric 3: Cuti / Izin
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = colors.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("Cuti / Izin", fontSize = 10.sp, color = colors.textMuted)
                        Text("$totalLeaveDays Hari", fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = colors.warning)
                        Text("${leavesInMonth.size} Pengajuan", fontSize = 9.sp, color = colors.textMuted)
                    }
                }
            }

            // Shift Breakdown Row if shift records exist
            if (totalCustomShifts > 0) {
                Surface(
                    color = colors.surfaceVariant,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        horizontalArrangement = Arrangement.SpaceAround,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Shift Bulan Ini:", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                        if (shiftMorningCount > 0) Text("Pagi: ${shiftMorningCount}x", fontSize = 10.5.sp, color = colors.indigo, fontWeight = FontWeight.SemiBold)
                        if (shiftAfternoonCount > 0) Text("Sore: ${shiftAfternoonCount}x", fontSize = 10.5.sp, color = colors.lilac, fontWeight = FontWeight.SemiBold)
                        if (shiftNightCount > 0) Text("Malam: ${shiftNightCount}x", fontSize = 10.5.sp, color = colors.indigo, fontWeight = FontWeight.SemiBold)
                        if (shiftLongCount > 0) Text("Long (12j): ${shiftLongCount}x", fontSize = 10.5.sp, color = colors.teal, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Quick Nav Links
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(
                    onClick = onOpenShiftSchedule,
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(13.dp), tint = colors.indigo)
                    Spacer(Modifier.width(4.dp))
                    Text("Jadwal Shift", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.indigo)
                }

                TextButton(
                    onClick = onOpenLeaveTracker,
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Icon(Icons.Default.EventNote, contentDescription = null, modifier = Modifier.size(13.dp), tint = colors.warning)
                    Spacer(Modifier.width(4.dp))
                    Text("Catatan Cuti", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.warning)
                }

                TextButton(
                    onClick = onOpenCalendar,
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Icon(Icons.Default.CalendarMonth, contentDescription = null, modifier = Modifier.size(13.dp), tint = colors.primary)
                    Spacer(Modifier.width(4.dp))
                    Text("Buka Kalender", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
                }
            }
        }
    }
}

/**
 * Gojek/Grab-Style Service Tile Component:
 * Icon badge on top (colored rounded-square), label below, minimal decoration, large friendly touch target.
 */
@Composable
private fun GojekServiceTile(
    label: String,
    icon: ImageVector,
    badgeColor: Color,
    iconColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isPressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.90f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "service_tile_scale"
    )
    val colors = GajikuTheme.colors

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
        modifier = modifier
            .scale(scale)
            .clip(RoundedCornerShape(16.dp))
            .pointerInput(Unit) {
                detectTapGestures(
                    onPress = {
                        isPressed = true
                        tryAwaitRelease()
                        isPressed = false
                    },
                    onTap = { onClick() }
                )
            }
            .padding(vertical = 4.dp, horizontal = 2.dp)
    ) {
        // Large rounded-square badge (Gojek/Grab style 54dp x 54dp, 18dp radius)
        Surface(
            color = badgeColor,
            shape = RoundedCornerShape(18.dp),
            shadowElevation = if (colors.isDark) 0.dp else 2.dp,
            border = if (colors.isDark) {
                CardDefaults.outlinedCardBorder().copy(
                    brush = SolidColor(iconColor.copy(alpha = 0.35f))
                )
            } else {
                CardDefaults.outlinedCardBorder().copy(
                    brush = SolidColor(iconColor.copy(alpha = 0.15f))
                )
            },
            modifier = Modifier.size(54.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = icon,
                    contentDescription = label,
                    tint = iconColor,
                    modifier = Modifier.size(26.dp)
                )
            }
        }

        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = colors.textPrimary,
            textAlign = TextAlign.Center,
            minLines = 2,
            maxLines = 2,
            lineHeight = 13.5.sp,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

/**
 * Modern Friendly Empty State with Soft Shadow and 24dp Corners
 */
@Composable
private fun FintechEmptyPayrollState(
    onCalculateClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = GajikuTheme.colors
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surfaceCard),
        elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
        border = if (colors.isDark) {
            CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.cardBorder))
        } else null
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Surface(
                color = colors.primaryContainer,
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.size(68.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.ReceiptLong,
                        contentDescription = null,
                        tint = colors.onPrimaryContainer,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = "Belum Ada Riwayat Penggajian",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary
                )
                Text(
                    text = "Mulai hitung slip gaji pertama Anda dengan simulasi PPh 21 TER dan BPJS secara otomatis.",
                    fontSize = 11.5.sp,
                    color = colors.textMuted,
                    textAlign = TextAlign.Center,
                    lineHeight = 16.sp
                )
            }

            Button(
                onClick = onCalculateClick,
                colors = ButtonDefaults.buttonColors(containerColor = colors.primaryContainer),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.padding(top = 4.dp)
            ) {
                Icon(
                    Icons.Default.AddCircle,
                    contentDescription = null,
                    tint = colors.onPrimaryContainer,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Hitung Slip Gaji Sekarang",
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.onPrimaryContainer
                )
            }
        }
    }
}

/**
 * History Card with 20dp Corner Radius, Soft Shadow, and Clean Typographic Balance
 */
@Composable
private fun FintechPayrollHistoryCard(
    history: MonthlyPayrollHistory,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isPressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.98f else 1.0f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
        label = "history_card_scale"
    )
    val colors = GajikuTheme.colors

    Card(
        modifier = modifier
            .scale(scale)
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .pointerInput(Unit) {
                detectTapGestures(
                    onPress = {
                        isPressed = true
                        tryAwaitRelease()
                        isPressed = false
                    },
                    onTap = { onClick() }
                )
            },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surfaceCard),
        elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
        border = if (colors.isDark) {
            CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.cardBorder))
        } else null
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Surface(
                    color = colors.indigoBg,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.size(44.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Default.Receipt,
                            contentDescription = null,
                            tint = colors.indigo,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = history.periodLabel,
                        fontSize = 14.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )
                    Text(
                        text = "TER ${history.terCategory} (${Formatters.formatPercent(history.terEffectiveRate)}) • Bruto ${Formatters.formatRupiah(history.grossSalary)}",
                        fontSize = 11.sp,
                        color = colors.textMuted
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = Formatters.formatRupiah(history.netTakeHomePay),
                    fontSize = 14.5.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = colors.success
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Text(
                        text = "Rincian",
                        fontSize = 10.5.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = colors.primary
                    )
                    Icon(
                        Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = colors.primary,
                        modifier = Modifier.size(12.dp)
                    )
                }
            }
        }
    }
}
