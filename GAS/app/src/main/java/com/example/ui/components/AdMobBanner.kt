package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.domain.util.DeviceUtils
import com.example.ui.theme.GajikuTheme
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView

/**
 * ID Unit Iklan Banner resmi Google AdMob milik aplikasi Anda:
 * App ID: ca-app-pub-5387672119434011~7518952778
 * Banner ID: ca-app-pub-5387672119434011/6472147768
 */
const val ADMOB_PRODUCTION_BANNER_ID = "ca-app-pub-5387672119434011/6472147768"
const val ADMOB_TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111"

@Composable
fun AdMobBanner(
    isProUser: Boolean,
    modifier: Modifier = Modifier,
    adUnitId: String = if (com.example.BuildConfig.DEBUG) ADMOB_TEST_BANNER_ID else ADMOB_PRODUCTION_BANNER_ID
) {
    // Jika pengguna PRO atau sedang berjalan di emulator/headless preview, jangan inisialisasi AdView
    // untuk mencegah error binding adservices, Mesa graphics, dan chromium cache
    if (isProUser || DeviceUtils.isEmulator()) return

    val colors = GajikuTheme.colors
    val isInPreview = LocalInspectionMode.current

    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.surface)
            .padding(vertical = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        if (isInPreview) {
            Text(
                text = "AdMob Banner Preview",
                fontSize = 12.sp,
                color = colors.textMuted
            )
        } else {
            var adLoadFailed by remember { mutableStateOf(false) }

            if (!adLoadFailed) {
                AndroidView(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    factory = { context ->
                        AdView(context).apply {
                            setAdSize(AdSize.BANNER)
                            this.adUnitId = adUnitId
                            adListener = object : com.google.android.gms.ads.AdListener() {
                                override fun onAdFailedToLoad(loadAdError: com.google.android.gms.ads.LoadAdError) {
                                    super.onAdFailedToLoad(loadAdError)
                                    // Sembunyikan container jika iklan belum aktif dari AdMob agar tidak memakan ruang kosong
                                    adLoadFailed = true
                                }
                            }
                            try {
                                loadAd(AdRequest.Builder().build())
                            } catch (e: Exception) {
                                adLoadFailed = true
                            }
                        }
                    }
                )
            }
        }
    }
}
