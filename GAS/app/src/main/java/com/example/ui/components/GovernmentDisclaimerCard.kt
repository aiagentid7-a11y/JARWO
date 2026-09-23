package com.example.ui.components

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.GajikuTheme

private const val OFFICIAL_GOV_REGULATION_URL = "https://peraturan.go.id/id/pp-no-35-tahun-2021"

/**
 * Komponen Penafian / Disclaimer Afiliasi Pemerintah
 * Sesuai kebijakan Google Play Store terkait klaim resmi & transparansi regulasi pemerintah.
 */
@Composable
fun GovernmentDisclaimerCard(
    modifier: Modifier = Modifier
) {
    val colors = GajikuTheme.colors
    val context = LocalContext.current

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("government_disclaimer_card"),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = colors.surfaceVariant.copy(alpha = if (colors.isDark) 0.6f else 0.85f)
        ),
        border = BorderStroke(
            1.dp,
            colors.outline.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.Info,
                    contentDescription = "Pemberitahuan Resmi",
                    tint = colors.textSecondary,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = "Penafian Afiliasi Pemerintah (Disclaimer)",
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary
                )
            }

            Text(
                text = "Aplikasi ini dikembangkan secara independen dan tidak berafiliasi, disponsori, atau didukung oleh Pemerintah Republik Indonesia atau instansi manapun. Informasi mengenai ketentuan jam kerja dan lembur bersumber dari PP No. 35 Tahun 2021, disajikan hanya sebagai referensi. Untuk kepastian hukum, silakan rujuk sumber resmi.",
                fontSize = 10.5.sp,
                lineHeight = 15.sp,
                color = colors.textSecondary
            )

            Row(
                modifier = Modifier
                    .clickable {
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(OFFICIAL_GOV_REGULATION_URL)).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            context.startActivity(intent)
                        } catch (e: Exception) {
                            Toast.makeText(context, "Tidak dapat membuka browser: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                        }
                    }
                    .padding(vertical = 2.dp)
                    .testTag("btn_view_official_regulation_source"),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = "Lihat Sumber Resmi (peraturan.go.id) →",
                    fontSize = 10.5.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.primary,
                    textDecoration = TextDecoration.Underline
                )
            }
        }
    }
}
