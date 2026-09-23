package com.example.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

// =============================================================================
// GajiKu Pro - Gojek/Grab-Style Super-App Design System (Light & Dark)
// =============================================================================

data class GajikuColors(
    val isDark: Boolean,
    val background: Color,
    val onBackground: Color,
    val surface: Color,
    val onSurface: Color,
    val surfaceCard: Color,
    val surfaceVariant: Color,
    val onSurfaceVariant: Color,
    val navSurface: Color,
    val navActiveBg: Color,
    val navInactiveTint: Color,
    val primary: Color,
    val onPrimary: Color,
    val primaryContainer: Color,
    val onPrimaryContainer: Color,
    val secondary: Color,
    val onSecondary: Color,
    val secondaryContainer: Color,
    val onSecondaryContainer: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val outline: Color,
    val outlineSubtle: Color,
    val cardBorder: Color,
    val cardShadowElevation: Dp,
    val isCardBorderGlow: Boolean,
    val heroGradient: Brush,
    val summaryGradient: Brush,
    val heroBorderBrush: Brush,
    val cardGlowBorderBrush: Brush,
    val summaryBorderBrush: Brush,
    val success: Color,
    val successBg: Color,
    val deductionRed: Color,
    val deductionRedBg: Color,
    val warning: Color,
    val proBadgeBg: Color,
    val proBadgeText: Color,
    // Service Category Badges
    val teal: Color,
    val tealBg: Color,
    val indigo: Color,
    val indigoBg: Color,
    val emerald: Color,
    val emeraldBg: Color,
    val amber: Color,
    val amberBg: Color,
    val rose: Color,
    val roseBg: Color,
    val cyan: Color,
    val cyanBg: Color,
    val lilac: Color,
    val lilacBg: Color,
    val purpleBg: Color,
    // Input Fields & Chips
    val inputBorderUnfocused: Color,
    val inputBorderFocused: Color,
    val inputContainer: Color,
    val inputLabelUnfocused: Color,
    val chipInactiveBg: Color,
    val chipInactiveBorder: Color,
    val chipInactiveText: Color,
    // Two-tier card & list hierarchy helpers
    val primaryCardBg: Color,
    val secondaryCardBg: Color,
    val secondaryCardBorder: Color,
    val zebraEvenBg: Color,
    val zebraOddBg: Color
) {
    // Semantic aliases for consistency
    val error: Color get() = deductionRed
    val inactiveChipBg: Color get() = chipInactiveBg
    val inactiveChipBorder: Color get() = chipInactiveBorder
    val inactiveChipText: Color get() = chipInactiveText
}

val DarkGajikuColors = GajikuColors(
    isDark = true,
    background = Color(0xFF0C0B12),
    onBackground = Color(0xFFF1F5F9),
    surface = Color(0xFF151320),
    onSurface = Color(0xFFF8FAFC),
    surfaceCard = Color(0xFF181528),
    surfaceVariant = Color(0xFF221F33),
    onSurfaceVariant = Color(0xFFCBD5E1),
    navSurface = Color(0xFF12101D),
    navActiveBg = Color(0x338B5CF6),
    navInactiveTint = Color(0xFF64748B),
    primary = Color(0xFFC084FC),
    onPrimary = Color(0xFF2E1065),
    primaryContainer = Color(0xFF6D28D9),
    onPrimaryContainer = Color(0xFFF5F3FF),
    secondary = Color(0xFF38BDF8),
    onSecondary = Color(0xFF082F49),
    secondaryContainer = Color(0xFF0369A1),
    onSecondaryContainer = Color(0xFFE0F2FE),
    textPrimary = Color(0xFFF8FAFC),
    textSecondary = Color(0xFFCBD5E1),
    textMuted = Color(0xFF94A3B8),
    outline = Color(0xFF2E2A44),
    outlineSubtle = Color(0xFF1E1B2E),
    cardBorder = Color(0xFF28233C),
    cardShadowElevation = 1.dp,
    isCardBorderGlow = true,
    heroGradient = Brush.linearGradient(
        colors = listOf(
            Color(0xFF4C1D95),
            Color(0xFF1E1B4B),
            Color(0xFF0F172A)
        )
    ),
    summaryGradient = Brush.verticalGradient(
        listOf(
            Color(0xFF281E48),
            Color(0xFF17132B)
        )
    ),
    heroBorderBrush = Brush.linearGradient(
        colors = listOf(
            Color(0xFFA78BFA).copy(alpha = 0.8f),
            Color(0xFF6366F1).copy(alpha = 0.4f),
            Color(0xFF818CF8).copy(alpha = 0.1f)
        )
    ),
    cardGlowBorderBrush = Brush.linearGradient(
        colors = listOf(
            Color(0xFF8B5CF6).copy(alpha = 0.5f),
            Color(0xFF38BDF8).copy(alpha = 0.2f),
            Color(0xFF1E1B4B).copy(alpha = 0.05f)
        )
    ),
    summaryBorderBrush = Brush.linearGradient(
        listOf(
            Color(0xFFA78BFA).copy(alpha = 0.7f),
            Color(0xFF6366F1).copy(alpha = 0.35f),
            Color(0xFF818CF8).copy(alpha = 0.15f)
        )
    ),
    success = Color(0xFF34D399),
    successBg = Color(0xFF064E3B),
    deductionRed = Color(0xFFFB7185),
    deductionRedBg = Color(0xFF4C0519),
    warning = Color(0xFFFBBF24),
    proBadgeBg = Color(0xFF7C3AED),
    proBadgeText = Color(0xFFF5F3FF),
    teal = Color(0xFF14B8A6),
    tealBg = Color(0xFF0F2A28),
    indigo = Color(0xFF6366F1),
    indigoBg = Color(0xFF1E1B4B),
    emerald = Color(0xFF10B981),
    emeraldBg = Color(0xFF064E3B),
    amber = Color(0xFFF59E0B),
    amberBg = Color(0xFF451A03),
    rose = Color(0xFFF43F5E),
    roseBg = Color(0xFF4C0519),
    cyan = Color(0xFF06B6D4),
    cyanBg = Color(0xFF082F49),
    lilac = Color(0xFFA855F7),
    lilacBg = Color(0xFF3B0764),
    purpleBg = Color(0xFF2E1B4E),
    inputBorderUnfocused = Color(0xFF3D3759),
    inputBorderFocused = Color(0xFFC084FC),
    inputContainer = Color(0xFF13111E),
    inputLabelUnfocused = Color(0xFFCBD5E1),
    chipInactiveBg = Color(0xFF1C192E),
    chipInactiveBorder = Color(0xFF3D3759),
    chipInactiveText = Color(0xFFCBD5E1),
    primaryCardBg = Color(0xFF1E1A33),
    secondaryCardBg = Color(0xFF151320),
    secondaryCardBorder = Color(0xFF2C2744),
    zebraEvenBg = Color(0xFF151320),
    zebraOddBg = Color(0xFF191626)
)

val LightGajikuColors = GajikuColors(
    isDark = false,
    background = Color(0xFFF8F9FD),
    onBackground = Color(0xFF0F172A),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF0F172A),
    surfaceCard = Color(0xFFFFFFFF),
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = Color(0xFF475569),
    navSurface = Color(0xFFFFFFFF),
    navActiveBg = Color(0xFFEDE9FE),
    navInactiveTint = Color(0xFF64748B),
    primary = Color(0xFF7C3AED),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFEDE9FE),
    onPrimaryContainer = Color(0xFF5B21B6),
    secondary = Color(0xFF0284C7),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFE0F2FE),
    onSecondaryContainer = Color(0xFF0369A1),
    textPrimary = Color(0xFF0F172A),
    textSecondary = Color(0xFF334155),
    textMuted = Color(0xFF64748B),
    outline = Color(0xFFE2E8F0),
    outlineSubtle = Color(0xFFF1F5F9),
    cardBorder = Color(0x14000000),
    cardShadowElevation = 3.dp,
    isCardBorderGlow = false,
    heroGradient = Brush.linearGradient(
        colors = listOf(
            Color(0xFF6D28D9),
            Color(0xFF5B21B6),
            Color(0xFF4C1D95)
        )
    ),
    summaryGradient = Brush.verticalGradient(
        listOf(
            Color(0xFFFAF5FF),
            Color(0xFFF3E8FF)
        )
    ),
    heroBorderBrush = SolidColor(Color(0x33A855F7)),
    cardGlowBorderBrush = SolidColor(Color(0x1AE2E8F0)),
    summaryBorderBrush = SolidColor(Color(0x337C3AED)),
    success = Color(0xFF059669),
    successBg = Color(0xFFD1FAE5),
    deductionRed = Color(0xFFE11D48),
    deductionRedBg = Color(0xFFFFE4E6),
    warning = Color(0xFFD97706),
    proBadgeBg = Color(0xFF7C3AED),
    proBadgeText = Color(0xFFFFFFFF),
    teal = Color(0xFF0F766E),
    tealBg = Color(0xFFCCFBF1),
    indigo = Color(0xFF4338CA),
    indigoBg = Color(0xFFE0E7FF),
    emerald = Color(0xFF047857),
    emeraldBg = Color(0xFFD1FAE5),
    amber = Color(0xFFB45309),
    amberBg = Color(0xFFFEF3C7),
    rose = Color(0xFFBE123C),
    roseBg = Color(0xFFFFE4E6),
    cyan = Color(0xFF0E7490),
    cyanBg = Color(0xFFCFFAFE),
    lilac = Color(0xFF6D28D9),
    lilacBg = Color(0xFFEDE9FE),
    purpleBg = Color(0xFFF3E8FF),
    inputBorderUnfocused = Color(0xFFCBD5E1),
    inputBorderFocused = Color(0xFF7C3AED),
    inputContainer = Color(0xFFFFFFFF),
    inputLabelUnfocused = Color(0xFF64748B),
    chipInactiveBg = Color(0xFFF1F5F9),
    chipInactiveBorder = Color(0xFFE2E8F0),
    chipInactiveText = Color(0xFF475569),
    primaryCardBg = Color(0xFFFFFFFF),
    secondaryCardBg = Color(0xFFFFFFFF),
    secondaryCardBorder = Color(0xFFE2E8F0),
    zebraEvenBg = Color(0xFFFFFFFF),
    zebraOddBg = Color(0xFFF8FAFC)
)

val LocalGajikuColors = staticCompositionLocalOf { DarkGajikuColors }

object GajikuTheme {
    val colors: GajikuColors
        @Composable
        @ReadOnlyComposable
        get() = LocalGajikuColors.current
}

// Backward-compatible color references
val ElegantDarkBackground = Color(0xFF0C0B12)
val ElegantDarkOnBackground = Color(0xFFF1F5F9)
val ElegantDarkSurface = Color(0xFF151320)
val ElegantDarkOnSurface = Color(0xFFF8FAFC)
val ElegantDarkSurfaceVariant = Color(0xFF221F33)
val ElegantDarkOnSurfaceVariant = Color(0xFFCBD5E1)
val ElegantDarkOutline = Color(0xFF2E2A44)
val ElegantDarkOutlineVariant = Color(0xFF1E1B2E)

val ElegantPrimary = Color(0xFFC084FC)
val ElegantOnPrimary = Color(0xFF2E1065)
val ElegantPrimaryContainer = Color(0xFF6D28D9)
val ElegantOnPrimaryContainer = Color(0xFFF5F3FF)

val ElegantSecondary = Color(0xFF38BDF8)
val ElegantOnSecondary = Color(0xFF082F49)
val ElegantSecondaryContainer = Color(0xFF0369A1)
val ElegantOnSecondaryContainer = Color(0xFFE0F2FE)

val ElegantTertiary = Color(0xFFF472B6)
val ElegantOnTertiary = Color(0xFF500724)
val ElegantTertiaryContainer = Color(0xFF9D174D)
val ElegantOnTertiaryContainer = Color(0xFFFCE7F3)

val ElegantCardViolet = Color(0xFF1B172B)
val ElegantNavSurface = Color(0xFF12101D)
val ElegantCardDark = Color(0xFF151320)
val ElegantCardGlassBg = Color(0x991E1A33)
val ElegantGlassBorder = Color(0x33A855F7)

val FintechViolet = Color(0xFF8B5CF6)
val FintechVioletGlow = Color(0x338B5CF6)

val FintechTeal = Color(0xFF14B8A6)
val FintechTealGlow = Color(0x3314B8A6)
val FintechTealBg = Color(0xFF0F2A28)

val FintechIndigo = Color(0xFF6366F1)
val FintechIndigoGlow = Color(0x336366F1)
val FintechIndigoBg = Color(0xFF1E1B4B)

val FintechEmerald = Color(0xFF10B981)
val FintechEmeraldGlow = Color(0x3310B981)
val FintechEmeraldBg = Color(0xFF064E3B)

val FintechAmber = Color(0xFFF59E0B)
val FintechAmberGlow = Color(0x33F59E0B)
val FintechAmberBg = Color(0xFF451A03)

val FintechLilac = Color(0xFFA855F7)
val FintechLilacGlow = Color(0x33A855F7)
val FintechLilacBg = Color(0xFF3B0764)

val FintechRose = Color(0xFFF43F5E)
val FintechRoseGlow = Color(0x33F43F5E)
val FintechRoseBg = Color(0xFF4C0519)

val FintechCyan = Color(0xFF06B6D4)
val FintechCyanGlow = Color(0x3306B6D4)

val PrimarySummaryCardBg = Color(0xFF1E1A33)
val SecondaryFormCardBg = Color(0xFF151320)
val SecondaryCardBorderColor = Color(0xFF2C2744)

val InactiveChipBg = Color(0xFF1C192E)
val InactiveChipBorderColor = Color(0xFF3D3759)
val InactiveChipTextColor = Color(0xFFCBD5E1)

val InputFieldBorderUnfocused = Color(0xFF3D3759)
val InputFieldBorderFocused = Color(0xFFC084FC)
val InputFieldContainerUnfocused = Color(0xFF13111E)
val InputFieldLabelUnfocused = Color(0xFFCBD5E1)
val InputFieldPlaceholder = Color(0xFF94A3B8)
val InputFieldHelper = Color(0xFF94A3B8)

val ElegantSuccess = Color(0xFF34D399)
val ElegantSuccessBg = Color(0xFF064E3B)
val ElegantSuccessBorder = Color(0x4D34D399)
val ElegantDeductionRed = Color(0xFFFB7185)
val ElegantWarning = Color(0xFFFBBF24)
val ElegantTextMuted = Color(0xFF94A3B8)
val ElegantTextPrimary = Color(0xFFF8FAFC)
val ElegantTextSecondary = Color(0xFFE2E8F0)
val ElegantProBadgeBg = Color(0xFF7C3AED)
val ElegantProBadgeText = Color(0xFFF5F3FF)

val SummaryCardGradient = Brush.verticalGradient(
    listOf(
        Color(0xFF281E48),
        Color(0xFF17132B)
    )
)

val SummaryCardBorderBrush = Brush.linearGradient(
    listOf(
        Color(0xFFA78BFA).copy(alpha = 0.7f),
        Color(0xFF6366F1).copy(alpha = 0.35f),
        Color(0xFF818CF8).copy(alpha = 0.15f)
    )
)

val HeroGradientBrush = Brush.linearGradient(
    colors = listOf(
        Color(0xFF4C1D95),
        Color(0xFF1E1B4B),
        Color(0xFF0F172A)
    )
)

val HeroGlowBorderBrush = Brush.linearGradient(
    colors = listOf(
        Color(0xFFA78BFA).copy(alpha = 0.8f),
        Color(0xFF6366F1).copy(alpha = 0.4f),
        Color(0xFF818CF8).copy(alpha = 0.1f)
    )
)

val CardGlowBorderBrush = Brush.linearGradient(
    colors = listOf(
        Color(0xFF8B5CF6).copy(alpha = 0.5f),
        Color(0xFF38BDF8).copy(alpha = 0.2f),
        Color(0xFF1E1B4B).copy(alpha = 0.05f)
    )
)
