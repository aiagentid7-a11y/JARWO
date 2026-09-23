package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density

private val ElegantDarkColorScheme =
    darkColorScheme(
        primary = DarkGajikuColors.primary,
        onPrimary = DarkGajikuColors.onPrimary,
        primaryContainer = DarkGajikuColors.primaryContainer,
        onPrimaryContainer = DarkGajikuColors.onPrimaryContainer,
        secondary = DarkGajikuColors.secondary,
        onSecondary = DarkGajikuColors.onSecondary,
        secondaryContainer = DarkGajikuColors.secondaryContainer,
        onSecondaryContainer = DarkGajikuColors.onSecondaryContainer,
        tertiary = DarkGajikuColors.lilac,
        onTertiary = DarkGajikuColors.onPrimary,
        background = DarkGajikuColors.background,
        onBackground = DarkGajikuColors.onBackground,
        surface = DarkGajikuColors.surface,
        onSurface = DarkGajikuColors.onSurface,
        surfaceVariant = DarkGajikuColors.surfaceVariant,
        onSurfaceVariant = DarkGajikuColors.onSurfaceVariant,
        outline = DarkGajikuColors.outline,
        outlineVariant = DarkGajikuColors.outlineSubtle
    )

private val ElegantLightColorScheme =
    lightColorScheme(
        primary = LightGajikuColors.primary,
        onPrimary = LightGajikuColors.onPrimary,
        primaryContainer = LightGajikuColors.primaryContainer,
        onPrimaryContainer = LightGajikuColors.onPrimaryContainer,
        secondary = LightGajikuColors.secondary,
        onSecondary = LightGajikuColors.onSecondary,
        secondaryContainer = LightGajikuColors.secondaryContainer,
        onSecondaryContainer = LightGajikuColors.onSecondaryContainer,
        tertiary = LightGajikuColors.lilac,
        onTertiary = LightGajikuColors.onPrimary,
        background = LightGajikuColors.background,
        onBackground = LightGajikuColors.onBackground,
        surface = LightGajikuColors.surface,
        onSurface = LightGajikuColors.onSurface,
        surfaceVariant = LightGajikuColors.surfaceVariant,
        onSurfaceVariant = LightGajikuColors.onSurfaceVariant,
        outline = LightGajikuColors.outline,
        outlineVariant = LightGajikuColors.outlineSubtle
    )

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit,
) {
    val gajikuColors = if (darkTheme) DarkGajikuColors else LightGajikuColors
    val colorScheme = if (darkTheme) ElegantDarkColorScheme else ElegantLightColorScheme

    // Banyak Text() di seluruh layar menggunakan fontSize (sp) yang relatif kecil
    // (10-13.5sp untuk teks isi). Daripada mengedit fontSize satu-per-satu di setiap
    // layar, kita naikkan skala huruf dasar aplikasi ~15% di sini secara terpusat.
    // Ini dikalikan terhadap fontScale sistem milik user (bukan menggantinya), jadi
    // preferensi ukuran huruf aksesibilitas di HP user tetap dihormati.
    val appFontScaleMultiplier = 1.15f
    val baseDensity = LocalDensity.current
    val scaledDensity = Density(
        density = baseDensity.density,
        fontScale = baseDensity.fontScale * appFontScaleMultiplier
    )

    CompositionLocalProvider(
        LocalGajikuColors provides gajikuColors,
        LocalDensity provides scaledDensity
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            content = content
        )
    }
}
