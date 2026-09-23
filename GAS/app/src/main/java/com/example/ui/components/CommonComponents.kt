package com.example.ui.components

import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.util.Formatters
import com.example.ui.theme.GajikuTheme

@Composable
fun highContrastTextFieldColors(): TextFieldColors {
    val colors = GajikuTheme.colors
    return OutlinedTextFieldDefaults.colors(
        focusedBorderColor = colors.primary,
        unfocusedBorderColor = colors.inputBorderUnfocused,
        focusedTextColor = colors.textPrimary,
        unfocusedTextColor = colors.textPrimary,
        focusedLabelColor = colors.primary,
        unfocusedLabelColor = colors.inputLabelUnfocused,
        focusedContainerColor = colors.inputContainer,
        unfocusedContainerColor = colors.inputContainer,
        cursorColor = colors.primary
    )
}

@Composable
fun LegalDisclaimerCard(modifier: Modifier = Modifier) {
    val colors = GajikuTheme.colors
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colors.surfaceVariant),
        border = if (colors.isDark) {
            CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.outlineSubtle))
        } else null
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Default.Security,
                contentDescription = "Legalitas & Privasi",
                tint = colors.primary,
                modifier = Modifier.size(24.dp)
            )
            Text(
                text = "Akurasi Regulasi & Jaminan Privasi",
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                color = colors.textPrimary,
                textAlign = TextAlign.Center
            )
            Text(
                text = "Perhitungan mengikuti UU No. 13/2003, UU Cipta Kerja No. 6/2023, PP No. 35/2021, PP No. 36/2021, PP No. 58/2023, dan PMK No. 168/2023. Data tersimpan 100% lokal & offline pada perangkat Anda.",
                fontSize = 10.5.sp,
                color = colors.textSecondary,
                lineHeight = 14.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
fun AdBannerPlaceholder(
    isProUser: Boolean,
    onUpgradeClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (isProUser) return
    val colors = GajikuTheme.colors
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
            .clickable { onUpgradeClick() }
            .testTag("ad_banner_card"),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = colors.primaryContainer.copy(alpha = 0.4f)),
        border = CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.primary.copy(alpha = 0.3f)))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Star,
                    contentDescription = null,
                    tint = colors.primary,
                    modifier = Modifier.size(18.dp)
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "GAS Pro Bebas Iklan",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = colors.textPrimary
                    )
                    Text(
                        text = "Nikmati fitur ekspor PDF tanpa batas & tanpa gangguan",
                        fontSize = 10.5.sp,
                        color = colors.textSecondary
                    )
                }
            }
            TextButton(
                onClick = onUpgradeClick,
                modifier = Modifier.padding(start = 8.dp),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Text("Upgrade", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)
            }
        }
    }
}

@Composable
fun UmpWarningBanner(
    isBelowUmp: Boolean,
    deficitAmount: Double,
    modifier: Modifier = Modifier
) {
    if (!isBelowUmp) return
    val colors = GajikuTheme.colors
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = colors.deductionRedBg.copy(alpha = 0.85f)),
        border = CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.deductionRed))
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Info,
                contentDescription = "Peringatan UMP",
                tint = colors.deductionRed,
                modifier = Modifier.size(22.dp)
            )
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "Upah Tetap di Bawah Standar UMP",
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = colors.deductionRed
                )
                Text(
                    text = "Total Upah Tetap Anda kurang ${Formatters.formatRupiah(deficitAmount)} dari standar UMP/UMK yang ditetapkan (PP No. 51/2023).",
                    fontSize = 10.5.sp,
                    color = colors.textPrimary,
                    lineHeight = 13.5.sp
                )
            }
        }
    }
}

@Composable
fun SectionHeaderWithInfo(
    title: String,
    infoTitle: String,
    infoBody: String,
    modifier: Modifier = Modifier
) {
    var showDialog by remember { mutableStateOf(false) }
    val colors = GajikuTheme.colors

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = title,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = colors.textPrimary,
            modifier = Modifier.weight(1f)
        )
        IconButton(
            onClick = { showDialog = true },
            modifier = Modifier.size(24.dp)
        ) {
            Icon(
                imageVector = Icons.Outlined.Info,
                contentDescription = "Informasi",
                tint = colors.primary,
                modifier = Modifier.size(16.dp)
            )
        }
    }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = {
                Text(text = infoTitle, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            },
            text = {
                Text(text = infoBody, fontSize = 13.sp, lineHeight = 18.sp, color = colors.textPrimary)
            },
            confirmButton = {
                TextButton(onClick = { showDialog = false }) {
                    Text("Mengerti", color = colors.primary, fontWeight = FontWeight.Bold)
                }
            },
            shape = RoundedCornerShape(18.dp)
        )
    }
}

@Composable
fun InfoDialogIconButton(
    title: String,
    body: String,
    modifier: Modifier = Modifier
) {
    var showDialog by remember { mutableStateOf(false) }
    val colors = GajikuTheme.colors

    IconButton(
        onClick = { showDialog = true },
        modifier = modifier.size(22.dp)
    ) {
        Icon(
            imageVector = Icons.Outlined.Info,
            contentDescription = "Info",
            tint = colors.primary,
            modifier = Modifier.size(16.dp)
        )
    }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = {
                Text(text = title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            },
            text = {
                Text(text = body, fontSize = 12.5.sp, lineHeight = 17.sp, color = colors.textPrimary)
            },
            confirmButton = {
                TextButton(onClick = { showDialog = false }) {
                    Text("Tutup", color = colors.primary, fontWeight = FontWeight.Bold)
                }
            },
            shape = RoundedCornerShape(18.dp)
        )
    }
}
