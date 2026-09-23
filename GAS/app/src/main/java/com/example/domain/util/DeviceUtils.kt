package com.example.domain.util

import android.content.Context
import android.os.Build
import java.io.File

object DeviceUtils {

    /**
     * Mendeteksi apakah aplikasi sedang dijalankan di lingkungan Android Emulator / Headless Container
     * (misalnya emulator cloud streaming AI Studio, QEMU, Ranchu, Goldfish).
     */
    fun isEmulator(): Boolean {
        val fingerprint = Build.FINGERPRINT.lowercase()
        val model = Build.MODEL.lowercase()
        val hardware = Build.HARDWARE.lowercase()
        val product = Build.PRODUCT.lowercase()
        val brand = Build.BRAND.lowercase()
        val device = Build.DEVICE.lowercase()

        return fingerprint.startsWith("generic")
            || fingerprint.startsWith("unknown")
            || model.contains("google_sdk")
            || model.contains("emulator")
            || model.contains("android sdk built for")
            || hardware.contains("goldfish")
            || hardware.contains("ranchu")
            || product.contains("sdk_google")
            || product.contains("google_sdk")
            || product.contains("sdk")
            || product.contains("emulator")
            || product.contains("simulator")
            || brand.startsWith("generic")
            || device.startsWith("generic")
    }

    /**
     * Memastikan struktur direktori cache WebView Chromium telah dibuat sebelumnya
     * untuk mencegah pesan error "opendir ... Code Cache/js: No such file or directory"
     * saat engine Chromium menginisialisasi indeks cache disk.
     */
    fun ensureWebViewCacheDirectories(context: Context) {
        try {
            val webViewCache = File(context.cacheDir, "WebView/Default/HTTP Cache/Code Cache")
            val jsDir = File(webViewCache, "js")
            val wasmDir = File(webViewCache, "wasm")
            if (!jsDir.exists()) jsDir.mkdirs()
            if (!wasmDir.exists()) wasmDir.mkdirs()
        } catch (_: Throwable) {
            // Abaikan jika terjadi kegagalan I/O
        }
    }
}
