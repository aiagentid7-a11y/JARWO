package com.example.domain.util

import android.content.Context
import android.graphics.*
import android.text.TextUtils
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Helper untuk pemrosesan foto bukti presensi harian:
 * 1. Resize ke max width/height 960px (menjaga aspect ratio & ketajaman teks)
 * 2. Compress ke JPEG quality 90%
 * 3. Watermark otomatis tanggal, waktu, zona waktu, nama/NIK, dan status presensi dengan layout presisi
 * 4. Watermark SEMI-TRANSPARAN di bagian bawah agar tidak menutupi wajah karyawan
 * 5. Simpan lokal di app-specific internal storage (100% offline & aman)
 * 6. Manajemen & pembersihan storage
 */
object AttendancePhotoHelper {

    private const val TAG = "AttendancePhotoHelper"
    private const val MAX_DIMENSION = 960
    private const val JPEG_QUALITY = 90
    private const val DIR_NAME = "attendance_photos"

    fun processAndSaveAttendancePhotoFromUri(
        context: Context,
        sourceUri: android.net.Uri,
        timestampMillis: Long = System.currentTimeMillis(),
        employeeName: String? = null,
        employeeNik: String? = null,
        status: String? = "HADIR"
    ): String? {
        return try {
            var inputStream = context.contentResolver.openInputStream(sourceUri) ?: return null
            val sourceBitmap = BitmapFactory.decodeStream(inputStream)
            inputStream.close()
            
            if (sourceBitmap == null) return null

            // Handle Exif Rotation
            val orientation = try {
                inputStream = context.contentResolver.openInputStream(sourceUri)!!
                val exif = android.media.ExifInterface(inputStream)
                val ori = exif.getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION, android.media.ExifInterface.ORIENTATION_NORMAL)
                inputStream.close()
                ori
            } catch (e: Exception) {
                android.media.ExifInterface.ORIENTATION_NORMAL
            }

            val matrix = Matrix()
            when (orientation) {
                android.media.ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
                android.media.ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
                android.media.ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
                android.media.ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
                android.media.ExifInterface.ORIENTATION_FLIP_VERTICAL -> {
                    matrix.postScale(1f, -1f)
                    // matrix.postRotate(180f)
                }
                android.media.ExifInterface.ORIENTATION_TRANSPOSE -> {
                    matrix.postScale(-1f, 1f)
                    matrix.postRotate(90f)
                }
                android.media.ExifInterface.ORIENTATION_TRANSVERSE -> {
                    matrix.postScale(-1f, 1f)
                    matrix.postRotate(270f)
                }
            }

            val rotatedBitmap = if (!matrix.isIdentity) {
                Bitmap.createBitmap(sourceBitmap, 0, 0, sourceBitmap.width, sourceBitmap.height, matrix, true)
            } else {
                sourceBitmap
            }

            val resultPath = processAndSaveAttendancePhoto(
                context, rotatedBitmap, timestampMillis, employeeName, employeeNik, status
            )
            
            if (rotatedBitmap != sourceBitmap) {
                rotatedBitmap.recycle()
            }
            sourceBitmap.recycle()
            
            resultPath
        } catch (e: Exception) {
            Log.e(TAG, "Gagal process foto dari URI", e)
            null
        }
    }

    /**
     * Memproses bitmap dari kamera (resize, watermark presisi, compress) dan menyimpan ke storage lokal aplikasi.
     * @return Path absolut file yang tersimpan
     */
    fun processAndSaveAttendancePhoto(
        context: Context,
        sourceBitmap: Bitmap,
        timestampMillis: Long = System.currentTimeMillis(),
        employeeName: String? = null,
        employeeNik: String? = null,
        status: String? = "HADIR"
    ): String? {
        return try {
            // 1. Resize ke max width/height 960px menjaga aspect ratio
            val originalWidth = sourceBitmap.width
            val originalHeight = sourceBitmap.height

            val scale = if (originalWidth > MAX_DIMENSION || originalHeight > MAX_DIMENSION) {
                if (originalWidth >= originalHeight) {
                    MAX_DIMENSION.toFloat() / originalWidth.toFloat()
                } else {
                    MAX_DIMENSION.toFloat() / originalHeight.toFloat()
                }
            } else {
                1.0f
            }

            val targetWidth = (originalWidth * scale).toInt().coerceAtLeast(1)
            val targetHeight = (originalHeight * scale).toInt().coerceAtLeast(1)

            val scaledBitmap = if (scale < 1.0f) {
                Bitmap.createScaledBitmap(sourceBitmap, targetWidth, targetHeight, true)
            } else {
                sourceBitmap
            }

            // 2. Buat Mutable Bitmap untuk menggambar Watermark
            val watermarkedBitmap = scaledBitmap.copy(Bitmap.Config.ARGB_8888, true)
            val canvas = Canvas(watermarkedBitmap)

            // Format tanggal & jam dengan hari dan zona waktu (contoh: "Jumat, 28 Agu 2026 • 08:30 WIB")
            val tz = TimeZone.getDefault()
            val isIndonesianTz = tz.id.contains("Jakarta", ignoreCase = true) || 
                                tz.id.contains("Pontianak", ignoreCase = true) ||
                                tz.id.contains("Makassar", ignoreCase = true) ||
                                tz.id.contains("Jayapura", ignoreCase = true)
            
            val tzAbbr = if (isIndonesianTz) {
                when {
                    tz.rawOffset == 7 * 3600 * 1000 -> "WIB"
                    tz.rawOffset == 8 * 3600 * 1000 -> "WITA"
                    tz.rawOffset == 9 * 3600 * 1000 -> "WIT"
                    else -> tz.getDisplayName(tz.inDaylightTime(Date(timestampMillis)), TimeZone.SHORT, Locale("id"))
                }
            } else {
                tz.getDisplayName(tz.inDaylightTime(Date(timestampMillis)), TimeZone.SHORT, Locale.getDefault())
            }

            // Format Baris 2: "Jumat, 28 Agu 2026 • 08:30 WIB"
            val dateFormat = SimpleDateFormat("EEEE, d MMM yyyy • HH:mm", Locale("id"))
            val timestampStr = "${dateFormat.format(Date(timestampMillis))} $tzAbbr"

            // Format Baris 3: "Nama Karyawan (NIK) • HADIR"
            val statusStr = if (!status.isNullOrBlank()) status.trim().uppercase(Locale("id")) else "HADIR"
            val line3EmployeeInfo = buildString {
                val hasName = !employeeName.isNullOrBlank()
                val hasNik = !employeeNik.isNullOrBlank()
                when {
                    hasName && hasNik -> append("${employeeName!!.trim()} (${employeeNik!!.trim()})")
                    hasName -> append(employeeName!!.trim())
                    hasNik -> append("Karyawan (${employeeNik!!.trim()})")
                    else -> append("Karyawan")
                }
                append(" • ")
                append(statusStr)
            }

            // Sizing proporsional & kompak berbasis resolusi canvas
            val minDim = minOf(targetWidth, targetHeight).toFloat()
            val cardMargin = (minDim * 0.03f).coerceAtLeast(8f)
            val paddingHoriz = (minDim * 0.035f).coerceAtLeast(10f)
            val paddingVert = (minDim * 0.025f).coerceAtLeast(8f)

            val headerTextSize = (minDim * 0.028f).coerceAtLeast(14f)
            val primaryTextSize = (minDim * 0.045f).coerceAtLeast(18f)
            val detailTextSize = (minDim * 0.032f).coerceAtLeast(14f)

            // Paint configurations dengan shadow layer tajam agar 100% terbaca jelas di atas foto apapun
            val headerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.rgb(52, 211, 153) // Emerald 400
                textSize = headerTextSize
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                letterSpacing = 0.04f
                setShadowLayer(5f, 0f, 2f, Color.BLACK)
            }

            val appTagPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.rgb(241, 245, 249) // Slate 100 (Crisp White)
                textSize = headerTextSize
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                letterSpacing = 0.03f
                setShadowLayer(5f, 0f, 2f, Color.BLACK)
            }

            val primaryTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.WHITE
                textSize = primaryTextSize
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                setShadowLayer(6f, 0f, 2f, Color.BLACK)
            }

            val detailTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.rgb(226, 232, 240) // Slate 200
                textSize = detailTextSize
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                setShadowLayer(5f, 0f, 2f, Color.BLACK)
            }

            // Hitung Line Heights dengan FontMetrics akurat
            val headerFm = headerPaint.fontMetrics
            val primaryFm = primaryTextPaint.fontMetrics
            val detailFm = detailTextPaint.fontMetrics

            val headerLineHeight = -headerFm.ascent + headerFm.descent
            val primaryLineHeight = -primaryFm.ascent + primaryFm.descent
            val detailLineHeight = -detailFm.ascent + detailFm.descent
            val lineSpacing = (minDim * 0.010f).coerceIn(3f, 7f)

            // Hitung Lebar Teks Maksimum Secara Dinamis
            val headerBadgeText = "TERVERIFIKASI ASLI"
            val appTagText = " • GAS"
            val dotRadius = (headerTextSize * 0.25f).coerceAtLeast(3f)
            
            val line1Width = (dotRadius * 2) + 6f + headerPaint.measureText(headerBadgeText) + appTagPaint.measureText(appTagText)
            val line2Width = primaryTextPaint.measureText(timestampStr)
            val line3Width = detailTextPaint.measureText(line3EmployeeInfo)
            
            val maxTextWidth = maxOf(line1Width, line2Width, line3Width)

            // Hitung Dimensi Kartu Watermark di Bagian Bawah
            val cardLeft = cardMargin
            val calculatedCardRight = cardLeft + maxTextWidth + (paddingHoriz * 2)
            // Pastikan tidak melebihi margin kanan
            val cardRight = minOf(calculatedCardRight, targetWidth - cardMargin)

            val totalContentHeight = headerLineHeight + lineSpacing + primaryLineHeight + lineSpacing + detailLineHeight
            val cardHeight = totalContentHeight + (paddingVert * 2)
            
            // Posisi watermark di bagian bawah (hanya memakan ~12-15% bagian bawah foto)
            val cardBottom = targetHeight - cardMargin
            val cardTop = cardBottom - cardHeight

            // Gambar Background Kotak (Box) Semi-Transparan Hitam agar teks selalu terbaca
            val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.argb(140, 15, 23, 42) // Slate 900 gelap dengan transparansi
                style = Paint.Style.FILL
            }
            val cornerRadius = minDim * 0.02f
            canvas.drawRoundRect(
                cardLeft, cardTop, cardRight, cardBottom,
                cornerRadius, cornerRadius, bgPaint
            )

            // Menggambar Baris 1: ● TERVERIFIKASI ASLI • GAS
            val textStartX = cardLeft + paddingHoriz
            val maxRowWidth = cardRight - textStartX - paddingHoriz
            
            var currentY = cardTop + paddingVert
            val headerBaseline = currentY - headerFm.ascent

            // Dot status terverifikasi (● Hijau Zamrud)
            val dotCenterY = headerBaseline + (headerFm.ascent / 2f) + (headerFm.descent / 2f)
            val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.rgb(52, 211, 153)
                style = Paint.Style.FILL
                setShadowLayer(4f, 0f, 1f, Color.argb(200, 16, 185, 129))
            }
            canvas.drawCircle(textStartX + dotRadius, dotCenterY, dotRadius, dotPaint)

            val headerBadgeX = textStartX + (dotRadius * 2) + 6f
            canvas.drawText(headerBadgeText, headerBadgeX, headerBaseline, headerPaint)

            val badgeWidth = headerPaint.measureText(headerBadgeText)
            val availableForAppTag = maxRowWidth - (badgeWidth + (dotRadius * 2) + 6f)
            if (availableForAppTag > 20f) {
                val ellipsizedAppTag = truncateText(appTagText, appTagPaint, availableForAppTag)
                canvas.drawText(ellipsizedAppTag, headerBadgeX + badgeWidth, headerBaseline, appTagPaint)
            }

            // Menggambar Baris 2: Jumat, 28 Agu 2026 • 08:30 WIB
            currentY += headerLineHeight + lineSpacing
            val primaryBaseline = currentY - primaryFm.ascent
            val ellipsizedTimestamp = truncateText(timestampStr, primaryTextPaint, maxRowWidth)
            canvas.drawText(ellipsizedTimestamp, textStartX, primaryBaseline, primaryTextPaint)

            // Menggambar Baris 3: Nama Karyawan (NIK) • HADIR
            currentY += primaryLineHeight + lineSpacing
            val detailBaseline = currentY - detailFm.ascent
            val ellipsizedDetail = truncateText(line3EmployeeInfo, detailTextPaint, maxRowWidth)
            canvas.drawText(ellipsizedDetail, textStartX, detailBaseline, detailTextPaint)

            // 3. Simpan ke app-specific internal directory
            val photosDir = File(context.filesDir, DIR_NAME)
            if (!photosDir.exists()) {
                photosDir.mkdirs()
            }

            val photoFile = File(photosDir, "att_proof_${timestampMillis}.jpg")
            FileOutputStream(photoFile).use { out ->
                watermarkedBitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, out)
                out.flush()
            }

            photoFile.absolutePath
        } catch (e: Exception) {
            Log.e(TAG, "Gagal memproses dan menyimpan foto presensi", e)
            null
        }
    }

    /**
     * Menghitung total ukuran file foto presensi yang tersimpan dalam bytes.
     */
    fun getAttendancePhotosTotalSizeBytes(context: Context): Long {
        val photosDir = File(context.filesDir, DIR_NAME)
        if (!photosDir.exists() || !photosDir.isDirectory) return 0L
        return photosDir.listFiles()?.sumOf { it.length() } ?: 0L
    }

    /**
     * Memformat ukuran file menjadi string yang mudah dibaca (misal: "1.4 MB").
     */
    fun formatFileSize(bytes: Long): String {
        return when {
            bytes >= 1024 * 1024 -> String.format(Locale.US, "%.1f MB", bytes / (1024.0 * 1024.0))
            bytes >= 1024 -> String.format(Locale.US, "%.1f KB", bytes / 1024.0)
            else -> "$bytes B"
        }
    }

    /**
     * Membersihkan foto presensi yang lebih tua dari [olderThanDays] hari.
     * @return Jumlah file yang berhasil dihapus
     */
    fun cleanupOldAttendancePhotos(context: Context, olderThanDays: Int = 90): Int {
        val photosDir = File(context.filesDir, DIR_NAME)
        if (!photosDir.exists() || !photosDir.isDirectory) return 0

        val cutoffMillis = System.currentTimeMillis() - (olderThanDays.toLong() * 24 * 60 * 60 * 1000)
        var deletedCount = 0

        photosDir.listFiles()?.forEach { file ->
            if (file.lastModified() < cutoffMillis) {
                if (file.delete()) {
                    deletedCount++
                }
            }
        }
        return deletedCount
    }

    /**
     * Menghapus file foto tertentu berdasarkan path.
     */
    fun deletePhotoFile(filePath: String?): Boolean {
        if (filePath.isNullOrBlank()) return false
        return try {
            val file = File(filePath)
            if (file.exists()) file.delete() else false
        } catch (e: Exception) {
            false
        }
    }

    private fun truncateText(text: String, paint: Paint, maxWidth: Float): String {
        if (paint.measureText(text) <= maxWidth) return text
        val ellipsis = "..."
        val ellipsisWidth = paint.measureText(ellipsis)
        val availableWidth = maxWidth - ellipsisWidth
        if (availableWidth <= 0f) return ""

        var count = text.length
        while (count > 0 && paint.measureText(text, 0, count) > availableWidth) {
            count--
        }
        return if (count > 0) text.substring(0, count) + ellipsis else ellipsis
    }
}
