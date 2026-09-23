package com.example

import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.animation.*
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.ui.PayrollViewModel
import com.example.ui.components.AdMobBanner
import androidx.lifecycle.lifecycleScope
import com.example.ui.components.PrivacyPolicyDialog
import com.example.ui.components.ProUpgradeDialog
import com.example.ui.screens.*
import com.example.ui.theme.*
import com.example.domain.util.DeviceUtils
import com.google.android.gms.ads.MobileAds
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val viewModel: PayrollViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Standard Android 15+ Edge-to-Edge modern API
        enableEdgeToEdge()

        // Siapkan struktur folder cache WebView untuk menghindari Chromium simple_file_enumerator error
        DeviceUtils.ensureWebViewCacheDirectories(applicationContext)

        // Inisialisasi SDK Google AdMob secara asinkron HANYA pada perangkat riil (bukan emulator / container)
        // Hal ini mencegah error "Failed to bind to measurement service" dan Mesa GPU error pada streaming emulator
        if (!DeviceUtils.isEmulator()) {
            lifecycleScope.launch(Dispatchers.IO) {
                try {
                    MobileAds.initialize(applicationContext) {}
                } catch (e: Throwable) {
                    // Di lingkungan tanpa Play Services AdServices, tangani secara aman
                }
            }
        }
        setContent {
            val appSettings by viewModel.appSettings.collectAsStateWithLifecycle()
            val isDarkTheme = when (appSettings.themeMode) {
                "LIGHT" -> false
                "DARK" -> true
                else -> isSystemInDarkTheme()
            }

            MyApplicationTheme(darkTheme = isDarkTheme) {
                var isSplashVisible by remember { mutableStateOf(true) }

                Crossfade(
                    targetState = isSplashVisible,
                    animationSpec = tween(400),
                    label = "splash_crossfade"
                ) { showSplash ->
                    if (showSplash) {
                        SplashScreen(
                            onSplashFinished = {
                                isSplashVisible = false
                            }
                        )
                    } else {
                        MainApp(viewModel = viewModel)
                    }
                }
            }
        }
    }
}

@Composable
fun MainApp(viewModel: PayrollViewModel) {
    var selectedTab by remember { mutableIntStateOf(0) }

    val userProfile by viewModel.userProfile.collectAsStateWithLifecycle()
    val appSettings by viewModel.appSettings.collectAsStateWithLifecycle()
    val overtimeLogs by viewModel.overtimeLogs.collectAsStateWithLifecycle()
    val leaveRecords by viewModel.leaveRecords.collectAsStateWithLifecycle()
    val attendanceRecords by viewModel.attendanceRecords.collectAsStateWithLifecycle()
    val payrollHistories by viewModel.payrollHistories.collectAsStateWithLifecycle()
    val calculationInput by viewModel.calculationInput.collectAsStateWithLifecycle()
    val showPrivacyModal by viewModel.showPrivacyModal.collectAsStateWithLifecycle()
    val showProDialog by viewModel.showProDialog.collectAsStateWithLifecycle()
    val selectedPayrollForDetail by viewModel.selectedPayrollForDetail.collectAsStateWithLifecycle()
    val userMessage by viewModel.userMessage.collectAsStateWithLifecycle()
    val proProductDetails by viewModel.billingManager.proProductDetails.collectAsStateWithLifecycle()

    val colors = GajikuTheme.colors
    val context = androidx.compose.ui.platform.LocalContext.current
    val activity = context as? android.app.Activity

    LaunchedEffect(userMessage) {
        userMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearUserMessage()
        }
    }

    val totalOtHours = remember(overtimeLogs) {
        overtimeLogs.sumOf { it.hours }
    }

    BackHandler(enabled = selectedTab != 0) {
        selectedTab = 0
    }

    // Onboarding pertama kali: tampil hanya saat profil masih kosong (user baru),
    // supaya tidak langsung dilempar ke Dashboard kosong tanpa arahan. Begitu
    // profil sudah diisi & disimpan sekali, kondisi ini otomatis tidak terpenuhi lagi.
    var onboardingSkippedThisSession by remember { mutableStateOf(false) }
    val isFirstTimeUser = userProfile.fullName.isBlank()
    val showOnboarding = isFirstTimeUser && !onboardingSkippedThisSession && !showPrivacyModal

    if (showOnboarding) {
        OnboardingScreen(
            onStartFillProfile = {
                onboardingSkippedThisSession = true
                selectedTab = 4
            },
            onSkip = { onboardingSkippedThisSession = true }
        )
        return
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = colors.background,
        contentWindowInsets = WindowInsets.safeDrawing,
        topBar = {
            if (selectedTab in 5..12 && selectedTab != 10) {
                Surface(
                    color = colors.surface,
                    shadowElevation = if (colors.isDark) 0.dp else 3.dp,
                    border = if (colors.isDark) {
                        CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.outline))
                    } else null,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .statusBarsPadding()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        IconButton(
                            onClick = { selectedTab = 0 },
                            modifier = Modifier
                                .size(38.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(colors.surfaceVariant)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ArrowBack,
                                contentDescription = "Kembali ke Beranda",
                                tint = colors.textPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Column {
                            Text(
                                text = when (selectedTab) {
                                    5 -> "Kalkulator THR & Pesangon"
                                    6 -> "Kalender Kerja 1 Tahun"
                                    7 -> "Laporan Pajak & SPT PPh 21"
                                    8 -> "Jadwal Kerja & Shift Karyawan"
                                    9 -> "Panduan Klaim BPJS (JHT/JKM/JKK/JKP)"
                                    11 -> "Presensi & Absensi Harian"
                                    12 -> "Audit K3 • Kepatuhan Jam Kerja"
                                    else -> ""
                                },
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = colors.textPrimary
                            )
                            Text(
                                text = "GAS • Personal Payroll",
                                fontSize = 10.sp,
                                color = colors.textMuted
                            )
                        }
                    }
                }
            }
        },
        bottomBar = {
            Column(modifier = Modifier.fillMaxWidth()) {
                AdMobBanner(
                    isProUser = appSettings.isProUser
                )
                ElegantBottomNavigationBar(
                    selectedTab = selectedTab,
                    onTabSelected = { selectedTab = it }
                )
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(colors.background)
        ) {
            AnimatedContent(
                targetState = selectedTab,
                transitionSpec = {
                    fadeIn(animationSpec = tween(220)) togetherWith fadeOut(animationSpec = tween(180))
                },
                label = "screen_tab_transition"
            ) { targetTab ->
                when (targetTab) {
                    0 -> DashboardScreen(
                        userProfile = userProfile,
                        isProUser = appSettings.isProUser,
                        latestPayroll = payrollHistories.firstOrNull(),
                        totalOvertimeHoursThisMonth = totalOtHours,
                        totalPayrollHistories = payrollHistories,
                        overtimeLogs = overtimeLogs,
                        leaveRecords = leaveRecords,
                        attendanceRecords = attendanceRecords,
                        onNavigateToTab = { selectedTab = it },
                        onSelectPayrollDetail = { viewModel.selectPayrollDetail(it) },
                        onOpenProDialog = { viewModel.openProDialog() },
                        themeMode = appSettings.themeMode,
                        onToggleThemeMode = { newTheme ->
                            viewModel.saveSettings(appSettings.copy(themeMode = newTheme))
                        }
                    )
                    1 -> PayrollCalculatorScreen(
                        userProfile = userProfile,
                        appSettings = appSettings,
                        calculationInput = calculationInput,
                        payrollHistories = payrollHistories,
                        overtimeLogs = overtimeLogs,
                        attendanceRecords = attendanceRecords,
                        onUpdateInput = { viewModel.updateCalculationInput(it) },
                        onCalculateAndSave = { viewModel.calculateAndSaveCurrentPayroll() },
                        onSelectPayrollDetail = { viewModel.selectPayrollDetail(it) },
                        onDeletePayroll = { viewModel.deletePayrollHistory(it) },
                        onOpenProDialog = { viewModel.openProDialog() }
                    )
                    2 -> OvertimeTrackerScreen(
                        userProfile = userProfile,
                        isProUser = appSettings.isProUser,
                        overtimeLogs = overtimeLogs,
                        onAddLog = { date, hours, dayType, desc, shiftType, ritaseCount, ritaseRate, hmStart, hmEnd, hmTotal, unitCode, materialType ->
                            viewModel.addOvertimeLog(
                                date = date,
                                hours = hours,
                                dayType = dayType,
                                description = desc,
                                shiftType = shiftType,
                                ritaseCount = ritaseCount,
                                ritaseRate = ritaseRate,
                                hmStart = hmStart,
                                hmEnd = hmEnd,
                                hmTotal = hmTotal,
                                unitCode = unitCode,
                                materialType = materialType
                            )
                        },
                        onDeleteLog = { viewModel.deleteOvertimeLog(it) },
                        onOpenProDialog = { viewModel.openProDialog() },
                        onNavigateToCalendar = { selectedTab = 6 }
                    )
                    3 -> LeaveTrackerScreen(
                        leaveRecords = leaveRecords,
                        isProUser = appSettings.isProUser,
                        onAddLeave = { type, start, end, days, reason ->
                            viewModel.addLeaveRecord(type, start, end, days, reason)
                        },
                        onDeleteLeave = { viewModel.deleteLeaveRecord(it) },
                        onOpenProDialog = { viewModel.openProDialog() },
                        onNavigateToCalendar = { selectedTab = 6 },
                        appSettings = appSettings
                    )
                    4 -> ProfileSettingsScreen(
                        userProfile = userProfile,
                        appSettings = appSettings,
                        onSaveProfile = { viewModel.saveProfile(it) },
                        onSaveSettings = { viewModel.saveSettings(it) },
                        onExportJson = { viewModel.exportJson() },
                        onImportJson = { viewModel.importJson(it) },
                        onOpenProDialog = { viewModel.openProDialog() },
                        onShowPrivacyDialog = { viewModel.openPrivacyModal() },
                        onClearAllData = { viewModel.clearAllEmployeeData() }
                    )
                    5 -> CompensationThrPhkScreen(
                        userProfile = userProfile,
                        isProUser = appSettings.isProUser,
                        onOpenProDialog = { viewModel.openProDialog() },
                        onNavigateToBpjsClaim = { selectedTab = 9 }
                    )
                    6 -> YearlyCalendarScreen(
                        userProfile = userProfile,
                        overtimeLogs = overtimeLogs,
                        leaveRecords = leaveRecords,
                        isProUser = appSettings.isProUser,
                        onOpenProDialog = { viewModel.openProDialog() },
                        onAddShiftLog = { date, shiftType, hours, dayType, note, start, end ->
                            viewModel.addOvertimeLog(
                                date = date,
                                hours = hours,
                                dayType = dayType,
                                description = note,
                                shiftType = shiftType,
                                startTime = start,
                                endTime = end
                            )
                        },
                        onDeleteLog = { viewModel.deleteOvertimeLog(it) },
                        onNavigateToShiftRoster = { selectedTab = 8 }
                    )
                    7 -> TaxReportScreen(
                        userProfile = userProfile,
                        payrollHistories = payrollHistories,
                        isProUser = appSettings.isProUser,
                        onOpenProDialog = { viewModel.openProDialog() }
                    )
                    8 -> WorkShiftScheduleScreen(
                        userProfile = userProfile,
                        isProUser = appSettings.isProUser,
                        onOpenProDialog = { viewModel.openProDialog() },
                        onNavigateToOvertimeTracker = { selectedTab = 2 },
                        onSaveProfile = { viewModel.saveProfile(it) }
                    )
                    9 -> BpjsClaimGuideScreen(
                        userProfile = userProfile,
                        isProUser = appSettings.isProUser,
                        onOpenProDialog = { viewModel.openProDialog() },
                        onNavigateToPhkCalculator = { selectedTab = 5 }
                    )
                    10 -> MoreFeaturesHubScreen(
                        onNavigateToTab = { selectedTab = it }
                    )
                    11 -> AttendanceInputScreen(
                        userProfile = userProfile,
                        isProUser = appSettings.isProUser,
                        attendanceRecords = attendanceRecords,
                        onAddRecord = { viewModel.addAttendanceRecord(it) },
                        onDeleteRecord = { viewModel.deleteAttendanceRecord(it) },
                        onNavigateToProfile = { selectedTab = 4 },
                        onNavigateToCalendar = { selectedTab = 6 },
                        onOpenProDialog = { viewModel.openProDialog() }
                    )
                    12 -> AuditK3Screen(
                        userProfile = userProfile,
                        isProUser = appSettings.isProUser,
                        overtimeLogs = overtimeLogs,
                        attendanceRecords = attendanceRecords,
                        onOpenProDialog = { viewModel.openProDialog() },
                        onNavigateToOvertime = { selectedTab = 2 },
                        onNavigateToAttendance = { selectedTab = 11 }
                    )
                }
            }
        }
    }

    // Modal Details & Overlays
    if (selectedPayrollForDetail != null) {
        PayslipDetailDialog(
            payroll = selectedPayrollForDetail!!,
            userProfile = userProfile,
            isProUser = appSettings.isProUser,
            onDismiss = { viewModel.selectPayrollDetail(null) },
            onOpenProDialog = { viewModel.openProDialog() }
        )
    }

    if (showPrivacyModal) {
        PrivacyPolicyDialog(
            onAccept = { viewModel.acceptPrivacyConsent() }
        )
    }

    if (showProDialog) {
        val priceStr = proProductDetails?.subscriptionOfferDetails?.firstOrNull()?.pricingPhases?.pricingPhaseList?.firstOrNull()?.formattedPrice
        ProUpgradeDialog(
            isProUser = appSettings.isProUser,
            productPrice = priceStr,
            onPurchaseClick = { 
                activity?.let {
                    viewModel.billingManager.launchBillingFlow(it)
                }
            },
            onDismiss = { viewModel.closeProDialog() }
        )
    }
}

data class NavItem(
    val label: String,
    val activeIcon: ImageVector,
    val inactiveIcon: ImageVector,
    val activeColor: Color,
    val targetTab: Int
)

@Composable
fun ElegantBottomNavigationBar(
    selectedTab: Int,
    onTabSelected: (Int) -> Unit
) {
    val colors = GajikuTheme.colors
    val items = listOf(
        NavItem("Beranda", Icons.Filled.Home, Icons.Outlined.Home, colors.primary, targetTab = 0),
        NavItem("Slip Gaji", Icons.Default.ReceiptLong, Icons.Outlined.ReceiptLong, colors.indigo, targetTab = 1),
        NavItem("Lembur", Icons.Filled.AccessTime, Icons.Outlined.AccessTime, colors.teal, targetTab = 2),
        NavItem("Cuti", Icons.Default.EventNote, Icons.Outlined.EventNote, colors.emerald, targetTab = 3),
        // "Lainnya" mengumpulkan 5 fitur yang sebelumnya hanya bisa diakses lewat
        // kartu di Dashboard (THR/Pesangon, Kalender, Laporan Pajak, Jadwal Shift,
        // Panduan BPJS), supaya permanen terlihat & tidak "tersembunyi" lagi.
        NavItem("Lainnya", Icons.Filled.Widgets, Icons.Outlined.Widgets, colors.amber, targetTab = 10),
        NavItem("Profil", Icons.Filled.Person, Icons.Outlined.Person, colors.lilac, targetTab = 4)
    )

    Surface(
        color = colors.navSurface,
        shadowElevation = if (colors.isDark) 0.dp else 12.dp,
        border = if (colors.isDark) {
            CardDefaults.outlinedCardBorder().copy(
                brush = Brush.linearGradient(
                    listOf(
                        colors.primary.copy(alpha = 0.25f),
                        colors.outline
                    )
                )
            )
        } else {
            CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.outline.copy(alpha = 0.7f)))
        },
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            items.forEachIndexed { index, item ->
                val isSelected = selectedTab == item.targetTab
                val interactionSource = remember { MutableInteractionSource() }

                val animatedScale by animateFloatAsState(
                    targetValue = if (isSelected) 1.08f else 1.0f,
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioMediumBouncy,
                        stiffness = Spring.StiffnessMedium
                    ),
                    label = "nav_scale_$index"
                )

                val pillPaddingHorizontal by animateDpAsState(
                    targetValue = if (isSelected) 14.dp else 8.dp,
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioMediumBouncy,
                        stiffness = Spring.StiffnessMedium
                    ),
                    label = "pill_padding_$index"
                )

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                    modifier = Modifier
                        .scale(animatedScale)
                        .clip(RoundedCornerShape(16.dp))
                        .clickable(interactionSource = interactionSource, indication = null) {
                            onTabSelected(item.targetTab)
                        }
                        .padding(horizontal = 2.dp, vertical = 2.dp)
                        .testTag("nav_item_$index")
                ) {
                    // Tactile Gojek/Grab Pill Badge with filled active icons
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(100.dp))
                            .background(
                                if (isSelected) {
                                    if (colors.isDark) item.activeColor.copy(alpha = 0.22f) else item.activeColor.copy(alpha = 0.12f)
                                } else {
                                    Color.Transparent
                                }
                            )
                            .padding(horizontal = pillPaddingHorizontal, vertical = 5.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isSelected) item.activeIcon else item.inactiveIcon,
                            contentDescription = item.label,
                            tint = if (isSelected) item.activeColor else colors.navInactiveTint,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                    Text(
                        text = item.label,
                        fontSize = 10.5.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) item.activeColor else colors.navInactiveTint
                    )
                }
            }
        }
    }
}
