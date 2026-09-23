package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.AppSettings
import com.example.data.model.SqliteDdlSchema
import com.example.data.model.UserProfile
import com.example.domain.calculator.IndonesianPayrollCalculators
import com.example.ui.components.AdBannerPlaceholder
import com.example.ui.components.AttendanceAllowanceCalculatorDialog
import com.example.ui.components.AttendanceCalculatorMode
import com.example.ui.components.GovernmentDisclaimerCard
import com.example.ui.components.LegalDisclaimerCard
import com.example.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun ProfileSettingsScreen(
    userProfile: UserProfile,
    appSettings: AppSettings,
    onSaveProfile: (UserProfile) -> Unit,
    onSaveSettings: (AppSettings) -> Unit,
    onExportJson: suspend () -> String,
    onImportJson: suspend (String) -> Boolean,
    onOpenProDialog: () -> Unit,
    onShowPrivacyDialog: () -> Unit,
    onClearAllData: () -> Unit = {}
) {
    val colors = GajikuTheme.colors
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val coroutineScope = rememberCoroutineScope()

    // Profile local edit state
    var fullName by remember(userProfile) { mutableStateOf(userProfile.fullName) }
    var nik by remember(userProfile) { mutableStateOf(userProfile.nik) }
    var npwp by remember(userProfile) { mutableStateOf(userProfile.npwp) }
    var hasNpwp by remember(userProfile) { mutableStateOf(userProfile.hasNpwp) }
    var ptkpStatus by remember(userProfile) { mutableStateOf(userProfile.ptkpStatus) }
    var contractType by remember(userProfile) { mutableStateOf(userProfile.contractType) }
    var joinDate by remember(userProfile) { mutableStateOf(userProfile.joinDate) }
    var companyName by remember(userProfile) { mutableStateOf(userProfile.companyName) }
    var jobTitle by remember(userProfile) { mutableStateOf(userProfile.jobTitle) }

    // Komponen Gaji Lengkap
    var basicSalaryStr by remember(userProfile) { mutableStateOf(if (userProfile.basicSalary > 0) userProfile.basicSalary.toLong().toString() else "") }
    var fixedAllowanceStr by remember(userProfile) { mutableStateOf(if (userProfile.fixedAllowance > 0) userProfile.fixedAllowance.toLong().toString() else "") }
    var variableAllowanceStr by remember(userProfile) { mutableStateOf(if (userProfile.variableAllowance > 0) userProfile.variableAllowance.toLong().toString() else "") }
    var mealAllowanceStr by remember(userProfile) { mutableStateOf(if (userProfile.mealAllowance > 0) userProfile.mealAllowance.toLong().toString() else "") }
    var transportAllowanceStr by remember(userProfile) { mutableStateOf(if (userProfile.transportAllowance > 0) userProfile.transportAllowance.toLong().toString() else "") }
    var mealAllowancePerDayStr by remember(userProfile) { mutableStateOf(if (userProfile.mealAllowancePerDay > 0) userProfile.mealAllowancePerDay.toLong().toString() else "") }
    var transportAllowancePerDayStr by remember(userProfile) { mutableStateOf(if (userProfile.transportAllowancePerDay > 0) userProfile.transportAllowancePerDay.toLong().toString() else "") }
    var allowanceCalculationMode by remember(userProfile) { mutableStateOf(userProfile.allowanceCalculationMode) }
    var phoneAllowanceStr by remember(userProfile) { mutableStateOf(if (userProfile.phoneAllowance > 0) userProfile.phoneAllowance.toLong().toString() else "") }

    // Dialog state untuk Kalkulator Uang Makan & Transport (Kehadiran)
    var showAttendanceCalcDialog by remember { mutableStateOf(false) }
    var attendanceCalcMode by remember { mutableStateOf(AttendanceCalculatorMode.MEAL_ONLY) }
    var remoteAreaAllowanceStr by remember(userProfile) { mutableStateOf(if (userProfile.remoteAreaAllowance > 0) userProfile.remoteAreaAllowance.toLong().toString() else "") }
    var ritaseStr by remember(userProfile) { mutableStateOf(if (userProfile.ritasePay > 0) userProfile.ritasePay.toLong().toString() else "") }
    var hmStr by remember(userProfile) { mutableStateOf(if (userProfile.hmPay > 0) userProfile.hmPay.toLong().toString() else "") }
    var incentiveStr by remember(userProfile) { mutableStateOf(if (userProfile.incentivePay > 0) userProfile.incentivePay.toLong().toString() else "") }
    var shiftAllowanceStr by remember(userProfile) { mutableStateOf(if (userProfile.shiftAllowance > 0) userProfile.shiftAllowance.toLong().toString() else "") }

    // Jam Kerja & Skema Shift
    var workScheduleScheme by remember(userProfile) { mutableStateOf(userProfile.workScheduleScheme) }
    var defaultShiftType by remember(userProfile) { mutableStateOf(userProfile.defaultShiftType) }

    // BPJS & PPh 21 Toggles
    var isBpjsKesEnabled by remember(userProfile) { mutableStateOf(userProfile.isBpjsKesEnabled) }
    var isBpjsJhtEnabled by remember(userProfile) { mutableStateOf(userProfile.isBpjsJhtEnabled) }
    var isBpjsJpEnabled by remember(userProfile) { mutableStateOf(userProfile.isBpjsJpEnabled) }
    var isPph21Enabled by remember(userProfile) { mutableStateOf(userProfile.isPph21Enabled) }

    var showDdlModal by remember { mutableStateOf(false) }
    var showDeleteConfirmModal by remember { mutableStateOf(false) }
    var jsonBackupText by remember { mutableStateOf("") }
    var showBackupRestoreModal by remember { mutableStateOf(false) }

    val ptkpOptions = listOf("TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3")

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 28.dp)
    ) {
        // 1. Pro Status Banner Card (Hero Banner with 22dp corner and soft shadow)
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenProDialog() },
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = if (colors.isDark) 0.dp else 4.dp),
                colors = CardDefaults.cardColors(containerColor = colors.primaryCardBg)
            ) {
                Box(
                    modifier = Modifier
                        .background(
                            Brush.linearGradient(
                                if (colors.isDark) listOf(Color(0xFF3B1D54), Color(0xFF21163B), Color(0xFF161226))
                                else listOf(Color(0xFFEDE9FE), Color(0xFFF5F3FF), Color(0xFFFFFFFF))
                            )
                        )
                        .padding(18.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            modifier = Modifier.weight(1f).padding(end = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            Surface(
                                color = if (colors.isDark) Color(0xFF7C3AED) else Color(0xFF8B5CF6),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.size(44.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFDE047), modifier = Modifier.size(24.dp))
                                }
                            }
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(
                                    text = if (appSettings.isProUser) "Status: Versi Pro Aktif ⭐" else "Upgrade ke GAS Pro",
                                    fontSize = 14.5.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = colors.textPrimary
                                )
                                Text(
                                    text = if (appSettings.isProUser) "Bebas Iklan, Ekspor Resmi, Backup JSON" else "Buka fitur penuh: Tanpa watermark, tanpa iklan & ekspor SPT",
                                    fontSize = 11.sp,
                                    color = colors.textMuted,
                                    lineHeight = 15.sp
                                )
                            }
                        }

                        Surface(
                            color = if (appSettings.isProUser) colors.emeraldBg else colors.primaryContainer,
                            shape = RoundedCornerShape(10.dp),
                            border = CardDefaults.outlinedCardBorder().copy(
                                brush = SolidColor(if (appSettings.isProUser) colors.emerald else colors.primary)
                            )
                        ) {
                            Text(
                                text = if (appSettings.isProUser) "AKTIF" else "KELOLA",
                                fontSize = 10.5.sp,
                                color = if (appSettings.isProUser) colors.emerald else colors.onPrimaryContainer,
                                fontWeight = FontWeight.ExtraBold,
                                letterSpacing = 0.6.sp,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
            }
        }

        // 2. Theme Selector Card (Light / Dark / System Support)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) {
                    CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder))
                } else null
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.Palette, contentDescription = null, tint = colors.primary, modifier = Modifier.size(18.dp))
                            Text(
                                text = "TEMA & TAMPILAN APLIKASI",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp,
                                color = colors.primary
                            )
                        }

                        Surface(
                            color = colors.primaryContainer.copy(alpha = if (colors.isDark) 0.5f else 0.8f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = when (appSettings.themeMode) {
                                    "LIGHT" -> "Mode Terang Aktif ☀️"
                                    "DARK" -> "Mode Gelap Aktif 🌙"
                                    else -> "Otomatis Sistem ⚙️"
                                },
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.onPrimaryContainer,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                            )
                        }
                    }

                    Text(
                        text = "Pilih tema tampilan yang paling nyaman untuk Anda. Tersedia Mode Terang bersih untuk siang hari dan Mode Gelap modern untuk malam hari.",
                        fontSize = 11.5.sp,
                        color = colors.textMuted,
                        lineHeight = 16.sp
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val currentMode = appSettings.themeMode
                        val themeList = listOf(
                            Triple("LIGHT", "Terang ☀️", Icons.Default.LightMode),
                            Triple("DARK", "Gelap 🌙", Icons.Default.DarkMode),
                            Triple("SYSTEM", "Sistem ⚙️", Icons.Default.BrightnessAuto)
                        )

                        themeList.forEach { (mode, label, icon) ->
                            val isSelected = currentMode == mode
                            Surface(
                                color = if (isSelected) colors.primaryContainer else colors.inactiveChipBg,
                                shape = RoundedCornerShape(12.dp),
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = SolidColor(if (isSelected) colors.primary else colors.inactiveChipBorder)
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable {
                                        onSaveSettings(appSettings.copy(themeMode = mode))
                                    }
                                    .testTag("theme_option_$mode")
                            ) {
                                Row(
                                    modifier = Modifier.padding(vertical = 10.dp, horizontal = 4.dp),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = icon,
                                        contentDescription = label,
                                        tint = if (isSelected) colors.onPrimaryContainer else colors.inactiveChipText,
                                        modifier = Modifier.size(15.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = label,
                                        fontSize = 11.5.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isSelected) colors.onPrimaryContainer else colors.inactiveChipText
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Personal & Employment Information
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) {
                    CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder))
                } else null
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("PROFIL PRIBADI & PEKERJAAN", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)

                    OutlinedTextField(
                        value = fullName,
                        onValueChange = { fullName = it },
                        label = { Text("Nama Lengkap", fontSize = 11.sp) },
                        modifier = Modifier.fillMaxWidth().testTag("profile_fullname_input"),
                        colors = com.example.ui.components.highContrastTextFieldColors()
                    )

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = nik,
                            onValueChange = { nik = it },
                            label = { Text("NIK (16 Digit)", fontSize = 11.sp) },
                            supportingText = { Text("Nomor Induk Kependudukan di KTP. Dipakai untuk laporan pajak/BPJS, tersimpan hanya di HP ini.", fontSize = 9.5.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                        OutlinedTextField(
                            value = jobTitle,
                            onValueChange = { jobTitle = it },
                            label = { Text("Jabatan / Posisi", fontSize = 11.sp) },
                            modifier = Modifier.weight(1f),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                    }

                    OutlinedTextField(
                        value = companyName,
                        onValueChange = { companyName = it },
                        label = { Text("Nama Perusahaan / Instansi", fontSize = 11.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = com.example.ui.components.highContrastTextFieldColors()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Status Memiliki NPWP", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                            Text("Non-NPWP dikenakan tarif PPh 21 +20% (PMK 168/2023)", fontSize = 10.sp, color = colors.textMuted)
                        }
                        Switch(
                            checked = hasNpwp,
                            onCheckedChange = { hasNpwp = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = colors.onPrimaryContainer, checkedTrackColor = colors.primaryContainer)
                        )
                    }

                    if (hasNpwp) {
                        OutlinedTextField(
                            value = npwp,
                            onValueChange = { npwp = it },
                            label = { Text("Nomor NPWP (16 Digit NIK/NPWP)", fontSize = 11.sp) },
                            supportingText = { Text("Sejak 2024 NPWP pribadi memakai format NIK 16 digit. Isi tanpa titik atau strip.", fontSize = 9.5.sp) },
                            modifier = Modifier.fillMaxWidth(),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                    }

                    com.example.ui.components.SectionHeaderWithInfo(
                        title = "Status PTKP & Kategori TER (PP 58/2023):",
                        infoTitle = "Apa itu Status PTKP?",
                        infoBody = "PTKP (Penghasilan Tidak Kena Pajak) menentukan berapa besar penghasilan Anda yang tidak dipotong pajak, berdasarkan status pernikahan dan jumlah tanggungan (anak/keluarga yang Anda biayai, maksimal 3).\n\n" +
                            "• TK = Tidak Kawin (belum menikah)\n" +
                            "• K = Kawin (sudah menikah)\n" +
                            "• Angka (0-3) = jumlah tanggungan\n\n" +
                            "Contoh: \"K/2\" artinya Kawin dengan 2 tanggungan. Pilih status TK/0 bila belum menikah dan tidak punya tanggungan. Jika ragu, samakan dengan status di formulir PPh 21 dari kantor Anda."
                    )
                    Text(
                        text = "Belum menikah = TK, sudah menikah = K. Angka di belakang adalah jumlah tanggungan (anak/keluarga yang dibiayai).",
                        fontSize = 10.sp,
                        color = colors.textMuted,
                        lineHeight = 13.5.sp
                    )
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        ptkpOptions.take(4).forEach { opt ->
                            val isSel = ptkpStatus == opt
                            Surface(
                                color = if (isSel) colors.primaryContainer else colors.inactiveChipBg,
                                shape = RoundedCornerShape(10.dp),
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = SolidColor(if (isSel) colors.primary else colors.inactiveChipBorder)
                                ),
                                modifier = Modifier.weight(1f).clickable { ptkpStatus = opt }
                            ) {
                                Text(
                                    text = opt,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSel) colors.onPrimaryContainer else colors.inactiveChipText,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 8.dp)
                                )
                            }
                        }
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        ptkpOptions.drop(4).forEach { opt ->
                            val isSel = ptkpStatus == opt
                            Surface(
                                color = if (isSel) colors.primaryContainer else colors.inactiveChipBg,
                                shape = RoundedCornerShape(10.dp),
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = SolidColor(if (isSel) colors.primary else colors.inactiveChipBorder)
                                ),
                                modifier = Modifier.weight(1f).clickable { ptkpStatus = opt }
                            ) {
                                Text(
                                    text = opt,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSel) colors.onPrimaryContainer else colors.inactiveChipText,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 8.dp)
                                )
                            }
                        }
                    }

                    val calculatedTer = IndonesianPayrollCalculators.determineTerCategory(ptkpStatus)
                    Text(
                        text = "Status terpilih: $ptkpStatus (${com.example.domain.util.Formatters.ptkpPlainDescription(ptkpStatus)})",
                        fontSize = 10.5.sp,
                        color = colors.textSecondary
                    )
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("Otomatis Terpetakan ke: Kategori TER $calculatedTer", fontSize = 11.sp, color = colors.primary, fontWeight = FontWeight.Bold)
                        com.example.ui.components.InfoDialogIconButton(
                            title = "Apa itu Kategori TER?",
                            body = "TER (Tarif Efektif Rata-rata) adalah cara pemerintah menyederhanakan perhitungan PPh 21 bulanan sejak 2024, supaya Anda tidak perlu menghitung berlapis-lapis tarif pajak sendiri.\n\n" +
                                "Kategori A, B, atau C ditentukan otomatis dari Status PTKP yang Anda pilih di atas — Anda tidak perlu mengubah apa pun secara manual. Semakin tinggi kategori, umumnya semakin besar penghasilan tidak kena pajaknya sebelum tarif TER berlaku."
                        )
                    }
                }
            }
        }

        // 4. Komponen Gaji
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) {
                    CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder))
                } else null
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    com.example.ui.components.SectionHeaderWithInfo(
                        title = "KOMPONEN GAJI",
                        infoTitle = "Perbedaan Komponen Gaji",
                        infoBody = "Isi hanya komponen yang berlaku untuk Anda — boleh dikosongkan bila tidak ada:\n\n" +
                            "• Gaji Pokok: gaji dasar sebelum tunjangan.\n" +
                            "• Tunjangan Tetap: nominalnya sama tiap bulan (mis. tunjangan jabatan).\n" +
                            "• Tunjangan Tidak Tetap: nilainya bisa berubah tiap bulan (mis. uang makan sesuai kehadiran).\n" +
                            "• Ritase/Insentif: bonus per trip/pencapaian, umum di sektor tambang/logistik."
                    )

                    // 1. Gaji Pokok
                    OutlinedTextField(
                        value = basicSalaryStr,
                        onValueChange = { basicSalaryStr = it },
                        label = { Text("1. Gaji Pokok (Rp)", fontSize = 11.sp) },
                        supportingText = { Text("Gaji dasar sebelum tunjangan apa pun.", fontSize = 9.5.sp) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        colors = com.example.ui.components.highContrastTextFieldColors()
                    )

                    // 2 & 3: Tunjangan Tetap & Tunjangan Tidak Tetap
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = fixedAllowanceStr,
                            onValueChange = { fixedAllowanceStr = it },
                            label = { Text("2. Tunjangan Tetap", fontSize = 10.5.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                        OutlinedTextField(
                            value = variableAllowanceStr,
                            onValueChange = { variableAllowanceStr = it },
                            label = { Text("3. Tunj. Tdk Tetap", fontSize = 10.5.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                    }

                    // 4 & 5: Mode Perhitungan Uang Makan & Transport (Kehadiran vs Flat Bulanan)
                    Surface(
                        color = colors.surfaceVariant,
                        shape = RoundedCornerShape(14.dp),
                        border = CardDefaults.outlinedCardBorder().copy(
                            brush = SolidColor(colors.outline.copy(alpha = 0.5f))
                        ),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "4 & 5. UANG MAKAN & TRANSPORT",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.primary
                                )
                                Text(
                                    text = "PP No. 36/2021",
                                    fontSize = 9.5.sp,
                                    color = colors.textMuted
                                )
                            }

                            // Mode Selection Chips
                            Text("Pilih Metode Perhitungan Tunjangan:", fontSize = 10.5.sp, color = colors.textSecondary)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                val isFlat = allowanceCalculationMode == "FLAT_MONTHLY"
                                val isPerAtt = allowanceCalculationMode == "PER_ATTENDANCE"

                                Surface(
                                    color = if (isFlat) colors.primaryContainer else colors.inactiveChipBg,
                                    shape = RoundedCornerShape(10.dp),
                                    border = BorderStroke(
                                        1.dp,
                                        if (isFlat) colors.primary else colors.inactiveChipBorder
                                    ),
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { allowanceCalculationMode = "FLAT_MONTHLY" }
                                        .testTag("mode_flat_monthly")
                                ) {
                                    Column(
                                        modifier = Modifier.padding(vertical = 8.dp, horizontal = 8.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text(
                                            text = "Flat Bulanan",
                                            fontSize = 11.sp,
                                            fontWeight = if (isFlat) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isFlat) colors.onPrimaryContainer else colors.inactiveChipText
                                        )
                                        Text(
                                            text = "Nominal Tetap",
                                            fontSize = 9.sp,
                                            color = if (isFlat) colors.primary else colors.textMuted
                                        )
                                    }
                                }

                                Surface(
                                    color = if (isPerAtt) colors.emeraldBg else colors.inactiveChipBg,
                                    shape = RoundedCornerShape(10.dp),
                                    border = BorderStroke(
                                        1.dp,
                                        if (isPerAtt) colors.emerald else colors.inactiveChipBorder
                                    ),
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable {
                                            allowanceCalculationMode = "PER_ATTENDANCE"
                                            mealAllowanceStr = ""
                                            transportAllowanceStr = ""
                                        }
                                        .testTag("mode_per_attendance")
                                ) {
                                    Column(
                                        modifier = Modifier.padding(vertical = 8.dp, horizontal = 8.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text(
                                            text = "Sesuai Kehadiran ✨",
                                            fontSize = 11.sp,
                                            fontWeight = if (isPerAtt) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isPerAtt) colors.emerald else colors.inactiveChipText
                                        )
                                        Text(
                                            text = "Tarif per Hari Hadir",
                                            fontSize = 9.sp,
                                            color = if (isPerAtt) colors.emerald else colors.textMuted
                                        )
                                    }
                                }
                            }

                            if (allowanceCalculationMode == "PER_ATTENDANCE") {
                                // Input Tarif Per Hari
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    OutlinedTextField(
                                        value = mealAllowancePerDayStr,
                                        onValueChange = { mealAllowancePerDayStr = it },
                                        label = { Text("Makan/Hari (Rp)", fontSize = 10.5.sp) },
                                        supportingText = {
                                            val perDay = mealAllowancePerDayStr.toDoubleOrNull() ?: 0.0
                                            Text(
                                                text = if (perDay > 0) "Awal: 0 hari (Rp 0). Diakumulasi dari absensi" else "Rp 0 / kehadiran",
                                                fontSize = 8.5.sp,
                                                color = colors.emerald
                                            )
                                        },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        modifier = Modifier.weight(1f).testTag("profile_meal_per_day_input"),
                                        colors = com.example.ui.components.highContrastTextFieldColors()
                                    )
                                    OutlinedTextField(
                                        value = transportAllowancePerDayStr,
                                        onValueChange = { transportAllowancePerDayStr = it },
                                        label = { Text("Transport/Hari (Rp)", fontSize = 10.5.sp) },
                                        supportingText = {
                                            val perDay = transportAllowancePerDayStr.toDoubleOrNull() ?: 0.0
                                            Text(
                                                text = if (perDay > 0) "Awal: 0 hari (Rp 0). Diakumulasi dari absensi" else "Rp 0 / kehadiran",
                                                fontSize = 8.5.sp,
                                                color = colors.cyan
                                            )
                                        },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        modifier = Modifier.weight(1f).testTag("profile_transport_per_day_input"),
                                        colors = com.example.ui.components.highContrastTextFieldColors()
                                    )
                                }

                                Text(
                                    text = "💡 Sesuai Kehadiran: Nilai awal di profil adalah Rp 0 (0 hari hadir). Total aktual dihitung otomatis saat kalkulasi slip gaji berdasarkan jumlah hari hadir fisik yang Anda catat di Tab Presensi.",
                                    fontSize = 9.5.sp,
                                    color = colors.textMuted,
                                    lineHeight = 13.sp
                                )
                            } else {
                                // Input Flat Bulanan
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    OutlinedTextField(
                                        value = mealAllowanceStr,
                                        onValueChange = { mealAllowanceStr = it },
                                        label = { Text("4. Makan (Rp)", fontSize = 10.5.sp) },
                                        supportingText = { Text("Klik ikon kalkulator", fontSize = 8.5.sp) },
                                        trailingIcon = {
                                            IconButton(
                                                onClick = {
                                                    attendanceCalcMode = AttendanceCalculatorMode.MEAL_ONLY
                                                    showAttendanceCalcDialog = true
                                                }
                                            ) {
                                                Icon(
                                                    Icons.Default.Calculate,
                                                    contentDescription = "Kalkulator Uang Makan",
                                                    tint = colors.primary,
                                                    modifier = Modifier.size(20.dp)
                                                )
                                            }
                                        },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        modifier = Modifier.weight(1f).testTag("profile_meal_allowance_input"),
                                        colors = com.example.ui.components.highContrastTextFieldColors()
                                    )
                                    OutlinedTextField(
                                        value = transportAllowanceStr,
                                        onValueChange = { transportAllowanceStr = it },
                                        label = { Text("5. Transport (Rp)", fontSize = 10.5.sp) },
                                        supportingText = { Text("Klik ikon kalkulator", fontSize = 8.5.sp) },
                                        trailingIcon = {
                                            IconButton(
                                                onClick = {
                                                    attendanceCalcMode = AttendanceCalculatorMode.TRANSPORT_ONLY
                                                    showAttendanceCalcDialog = true
                                                }
                                            ) {
                                                Icon(
                                                    Icons.Default.Calculate,
                                                    contentDescription = "Kalkulator Uang Transport",
                                                    tint = colors.primary,
                                                    modifier = Modifier.size(20.dp)
                                                )
                                            }
                                        },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                        modifier = Modifier.weight(1f).testTag("profile_transport_allowance_input"),
                                        colors = com.example.ui.components.highContrastTextFieldColors()
                                    )
                                }
                            }
                        }
                    }

                    // 6 & 7: Pulsa & Remote Area
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = phoneAllowanceStr,
                            onValueChange = { phoneAllowanceStr = it },
                            label = { Text("6. Pulsa / Komunikasi", fontSize = 10.5.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                        OutlinedTextField(
                            value = remoteAreaAllowanceStr,
                            onValueChange = { remoteAreaAllowanceStr = it },
                            label = { Text("7. Remote Area", fontSize = 10.5.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                    }

                    // 8 & 9: Ritase & HM (Hour Meter)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = ritaseStr,
                            onValueChange = { ritaseStr = it },
                            label = { Text("8. Ritase (Rp)", fontSize = 10.5.sp) },
                            supportingText = { Text("Bonus trip/muatan", fontSize = 9.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                        OutlinedTextField(
                            value = hmStr,
                            onValueChange = { hmStr = it },
                            label = { Text("9. HM / Hour Meter (Rp)", fontSize = 10.5.sp) },
                            supportingText = { Text("Premi jam alat berat", fontSize = 9.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                    }

                    // 10 & 11: Insentif & Tunjangan Shift
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = incentiveStr,
                            onValueChange = { incentiveStr = it },
                            label = { Text("10. Insentif Kinerja (Rp)", fontSize = 10.5.sp) },
                            supportingText = { Text("Bonus performa/target", fontSize = 9.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                        OutlinedTextField(
                            value = shiftAllowanceStr,
                            onValueChange = { shiftAllowanceStr = it },
                            label = { Text("11. Tunj. Shift / Hari (Rp)", fontSize = 10.5.sp) },
                            supportingText = { Text("Uang hadir per shift", fontSize = 9.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f),
                            colors = com.example.ui.components.highContrastTextFieldColors()
                        )
                    }

                    Button(
                        onClick = {
                            val updated = userProfile.copy(
                                fullName = fullName,
                                nik = nik,
                                npwp = npwp,
                                hasNpwp = hasNpwp,
                                ptkpStatus = ptkpStatus,
                                contractType = contractType,
                                joinDate = joinDate,
                                basicSalary = basicSalaryStr.toDoubleOrNull() ?: 0.0,
                                fixedAllowance = fixedAllowanceStr.toDoubleOrNull() ?: 0.0,
                                variableAllowance = variableAllowanceStr.toDoubleOrNull() ?: 0.0,
                                mealAllowance = if (allowanceCalculationMode == "PER_ATTENDANCE") 0.0 else (mealAllowanceStr.toDoubleOrNull() ?: 0.0),
                                transportAllowance = if (allowanceCalculationMode == "PER_ATTENDANCE") 0.0 else (transportAllowanceStr.toDoubleOrNull() ?: 0.0),
                                mealAllowancePerDay = mealAllowancePerDayStr.toDoubleOrNull() ?: 0.0,
                                transportAllowancePerDay = transportAllowancePerDayStr.toDoubleOrNull() ?: 0.0,
                                allowanceCalculationMode = allowanceCalculationMode,
                                phoneAllowance = phoneAllowanceStr.toDoubleOrNull() ?: 0.0,
                                remoteAreaAllowance = remoteAreaAllowanceStr.toDoubleOrNull() ?: 0.0,
                                ritasePay = ritaseStr.toDoubleOrNull() ?: 0.0,
                                hmPay = hmStr.toDoubleOrNull() ?: 0.0,
                                incentivePay = incentiveStr.toDoubleOrNull() ?: 0.0,
                                shiftAllowance = shiftAllowanceStr.toDoubleOrNull() ?: 0.0,
                                regionalUmpUmk = 0.0,
                                workScheduleScheme = workScheduleScheme,
                                defaultShiftType = defaultShiftType,
                                isBpjsKesEnabled = isBpjsKesEnabled,
                                isBpjsJhtEnabled = isBpjsJhtEnabled,
                                isBpjsJpEnabled = isBpjsJpEnabled,
                                isPph21Enabled = isPph21Enabled,
                                companyName = companyName,
                                jobTitle = jobTitle
                            )
                            onSaveProfile(updated)
                            Toast.makeText(context, "Komponen Gaji & Pengaturan Berhasil Disimpan!", Toast.LENGTH_SHORT).show()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = colors.primaryContainer),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().testTag("save_profile_button")
                    ) {
                        Icon(Icons.Default.Save, contentDescription = null, tint = colors.onPrimaryContainer)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Simpan Komponen Gaji & Profil", fontWeight = FontWeight.Bold, color = colors.onPrimaryContainer)
                    }
                }
            }
        }

        // 4b. Skema Hari Kerja & Shift Default (PP 35/2021)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) {
                    CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder))
                } else null
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("PENGATURAN JAM KERJA & SHIFT DEFAULT", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)

                    // 1. Skema Hari Kerja (5HK vs 6HK)
                    Text("Skema Waktu Kerja Mingguan (PP 35/2021 Pasal 21):", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = colors.textSecondary)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(
                            "5_DAYS" to "5 Hari Kerja (8 Jam/hari)\nTotal 40 Jam/minggu",
                            "6_DAYS" to "6 Hari Kerja (7 Jam/hari)\nTotal 40 Jam/minggu"
                        ).forEach { (scheme, label) ->
                            val isSelected = workScheduleScheme == scheme
                            Surface(
                                color = if (isSelected) colors.primaryContainer else colors.inactiveChipBg,
                                shape = RoundedCornerShape(10.dp),
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = SolidColor(if (isSelected) colors.primary else colors.inactiveChipBorder)
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable {
                                        workScheduleScheme = scheme
                                        val updated = userProfile.copy(workScheduleScheme = scheme)
                                        onSaveProfile(updated)
                                    }
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 10.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) colors.onPrimaryContainer else colors.inactiveChipText,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                    modifier = Modifier.padding(vertical = 8.dp, horizontal = 4.dp)
                                )
                            }
                        }
                    }

                    // 2. Default Shift Karyawan
                    Text("Pola Shift Utama Karyawan:", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = colors.textSecondary)
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(
                            "REGULAR" to "Jam Kerja Regular (Non-Shift) [08:00 - 17:00]",
                            "SHIFT_PAGI" to "Shift 1 (Pagi) [07:00 - 15:00]",
                            "SHIFT_SORE" to "Shift 2 (Sore / Siang) [15:00 - 23:00]",
                            "SHIFT_MALAM" to "Shift 3 (Malam) [23:00 - 07:00] + Nutrisi 1400 Kkal",
                            "LONG_SHIFT" to "Long Shift (12 Jam) [8j Normal + 4j Lembur Otomatis]"
                        ).forEach { (shiftKey, shiftLabel) ->
                            val isSelected = defaultShiftType == shiftKey
                            Surface(
                                color = if (isSelected) colors.primaryContainer else colors.surfaceVariant,
                                shape = RoundedCornerShape(10.dp),
                                border = CardDefaults.outlinedCardBorder().copy(
                                    brush = SolidColor(if (isSelected) colors.primary else colors.outline)
                                ),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        defaultShiftType = shiftKey
                                        val updated = userProfile.copy(defaultShiftType = shiftKey)
                                        onSaveProfile(updated)
                                    }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = shiftLabel,
                                        fontSize = 11.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                        color = if (isSelected) colors.onPrimaryContainer else colors.textPrimary
                                    )
                                    if (isSelected) {
                                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = colors.primary, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 5. Default BPJS & PPh 21 Preferences Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) {
                    CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder))
                } else null
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    com.example.ui.components.SectionHeaderWithInfo(
                        title = "PILIHAN POTONGAN BPJS & PPH 21 (OPSIONAL)",
                        infoTitle = "Kapan Toggle Ini Dinyalakan?",
                        infoBody = "Nyalakan (aktifkan) toggle sesuai potongan yang benar-benar ada di slip gaji Anda dari kantor — biasanya semuanya aktif untuk karyawan tetap.\n\n" +
                            "Matikan hanya jika perusahaan Anda TIDAK memotong komponen tersebut (mis. masih magang/PKWT awal yang belum didaftarkan BPJS). Jika ragu, cek slip gaji fisik dari HRD Anda sebagai acuan."
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("PPh 21 Karyawan", fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                            Text("Default kalkulasi pajak penghasilan bulanan", fontSize = 10.sp, color = colors.textMuted)
                        }
                        Switch(
                            checked = isPph21Enabled,
                            onCheckedChange = {
                                isPph21Enabled = it
                                onSaveProfile(userProfile.copy(isPph21Enabled = it))
                            },
                            colors = SwitchDefaults.colors(checkedThumbColor = colors.onPrimaryContainer, checkedTrackColor = colors.primaryContainer)
                        )
                    }

                    HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("BPJS Kesehatan (1%)", fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                            Text("Potongan karyawan (Cap Rp 12 Jt)", fontSize = 10.sp, color = colors.textMuted)
                        }
                        Switch(
                            checked = isBpjsKesEnabled,
                            onCheckedChange = {
                                isBpjsKesEnabled = it
                                onSaveProfile(userProfile.copy(isBpjsKesEnabled = it))
                            },
                            colors = SwitchDefaults.colors(checkedThumbColor = colors.onPrimaryContainer, checkedTrackColor = colors.primaryContainer)
                        )
                    }

                    HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("BPJS TK: JHT (2%)", fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                            Text("Jaminan Hari Tua karyawan", fontSize = 10.sp, color = colors.textMuted)
                        }
                        Switch(
                            checked = isBpjsJhtEnabled,
                            onCheckedChange = {
                                isBpjsJhtEnabled = it
                                onSaveProfile(userProfile.copy(isBpjsJhtEnabled = it))
                            },
                            colors = SwitchDefaults.colors(checkedThumbColor = colors.onPrimaryContainer, checkedTrackColor = colors.primaryContainer)
                        )
                    }

                    HorizontalDivider(color = colors.outline.copy(alpha = 0.5f), thickness = 0.8.dp)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("BPJS TK: Jaminan Pensiun (1%)", fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, color = colors.textPrimary)
                            Text("Jaminan Pensiun karyawan (Cap Rp 10.04 Jt)", fontSize = 10.sp, color = colors.textMuted)
                        }
                        Switch(
                            checked = isBpjsJpEnabled,
                            onCheckedChange = {
                                isBpjsJpEnabled = it
                                onSaveProfile(userProfile.copy(isBpjsJpEnabled = it))
                            },
                            colors = SwitchDefaults.colors(checkedThumbColor = colors.onPrimaryContainer, checkedTrackColor = colors.primaryContainer)
                        )
                    }
                }
            }
        }

        // 6. Data Management (Backup / Restore JSON & SQL DDL)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = colors.cardShadowElevation),
                colors = CardDefaults.cardColors(containerColor = colors.secondaryCardBg),
                border = if (colors.isDark) {
                    CardDefaults.outlinedCardBorder().copy(brush = SolidColor(colors.secondaryCardBorder))
                } else null
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("MANAJEMEN DATA & PRIVASI (OFFLINE-FIRST)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.primary)

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(
                            onClick = {
                                coroutineScope.launch {
                                    val json = onExportJson()
                                    jsonBackupText = json
                                    clipboardManager.setText(AnnotatedString(json))
                                    Toast.makeText(context, "JSON Cadangan disalin ke clipboard!", Toast.LENGTH_LONG).show()
                                    showBackupRestoreModal = true
                                }
                            },
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.weight(1f),
                            border = ButtonDefaults.outlinedButtonBorder.copy(
                                brush = SolidColor(colors.outline)
                            )
                        ) {
                            Icon(Icons.Default.CloudDownload, contentDescription = null, tint = colors.primary, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Cadangkan JSON", fontSize = 11.sp, color = colors.textPrimary)
                        }

                        OutlinedButton(
                            onClick = { showBackupRestoreModal = true },
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.weight(1f),
                            border = ButtonDefaults.outlinedButtonBorder.copy(
                                brush = SolidColor(colors.outline)
                            )
                        ) {
                            Icon(Icons.Default.CloudUpload, contentDescription = null, tint = colors.primary, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Pulihkan JSON", fontSize = 11.sp, color = colors.textPrimary)
                        }
                    }

                    OutlinedButton(
                        onClick = { showDdlModal = true },
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth(),
                        border = ButtonDefaults.outlinedButtonBorder.copy(
                            brush = SolidColor(colors.outline)
                        )
                    ) {
                        Icon(Icons.Default.Code, contentDescription = null, tint = colors.primary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Lihat Skema DDL SQLite Standalone", fontSize = 11.sp, color = colors.textPrimary)
                    }

                    OutlinedButton(
                        onClick = { showDeleteConfirmModal = true },
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().testTag("clear_employee_data_button"),
                        border = ButtonDefaults.outlinedButtonBorder.copy(
                            brush = SolidColor(colors.deductionRed.copy(alpha = 0.6f))
                        ),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = colors.deductionRedBg
                        )
                    ) {
                        Icon(Icons.Default.DeleteOutline, contentDescription = null, tint = colors.deductionRed, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Hapus Semua Data Karyawan & Riwayat", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.deductionRed)
                    }

                    TextButton(
                        onClick = onShowPrivacyDialog,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Baca Kebijakan Privasi & Kepatuhan Play Store", fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold, color = colors.primary)
                    }
                }
            }
        }

        item {
            AdBannerPlaceholder(
                isProUser = appSettings.isProUser,
                onUpgradeClick = onOpenProDialog
            )
        }

        item {
            GovernmentDisclaimerCard()
        }

        item {
            LegalDisclaimerCard()
        }
    }

    // Modal SQLite DDL Documentation
    if (showDdlModal) {
        AlertDialog(
            onDismissRequest = { showDdlModal = false },
            shape = RoundedCornerShape(24.dp),
            containerColor = colors.surface,
            title = {
                Text("Skema DDL Database SQLite", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = colors.textPrimary)
            },
            text = {
                Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Struktur tabel offline-first Room / SQLite:", fontSize = 11.5.sp, color = colors.textSecondary)
                    Surface(
                        color = colors.surfaceVariant,
                        shape = RoundedCornerShape(12.dp),
                        border = CardDefaults.outlinedCardBorder().copy(
                            brush = SolidColor(colors.outline)
                        ),
                        modifier = Modifier.fillMaxWidth().height(200.dp)
                    ) {
                        LazyColumn(modifier = Modifier.padding(10.dp)) {
                            item {
                                Text(
                                    text = SqliteDdlSchema.SQL_DDL,
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 9.5.sp,
                                    color = colors.textPrimary
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        clipboardManager.setText(AnnotatedString(SqliteDdlSchema.SQL_DDL))
                        Toast.makeText(context, "Skrip DDL disalin!", Toast.LENGTH_SHORT).show()
                        showDdlModal = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = colors.primaryContainer)
                ) {
                    Text("Salin Skrip SQL", color = colors.onPrimaryContainer, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDdlModal = false }) {
                    Text("Tutup", color = colors.textMuted)
                }
            }
        )
    }

    // Modal Backup / Restore JSON
    if (showBackupRestoreModal) {
        AlertDialog(
            onDismissRequest = { showBackupRestoreModal = false },
            shape = RoundedCornerShape(24.dp),
            containerColor = colors.surface,
            title = {
                Text("Cadangkan & Pulihkan JSON", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = colors.textPrimary)
            },
            text = {
                Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Tempel atau salin string JSON data cadangan Anda:", fontSize = 11.5.sp, color = colors.textSecondary)
                    OutlinedTextField(
                        value = jsonBackupText,
                        onValueChange = { jsonBackupText = it },
                        modifier = Modifier.fillMaxWidth().height(150.dp),
                        textStyle = LocalTextStyle.current.copy(fontFamily = FontFamily.Monospace, fontSize = 10.5.sp, color = colors.textPrimary),
                        colors = com.example.ui.components.highContrastTextFieldColors()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (jsonBackupText.isNotBlank()) {
                            coroutineScope.launch {
                                val success = onImportJson(jsonBackupText)
                                if (success) {
                                    Toast.makeText(context, "Data berhasil dipulihkan!", Toast.LENGTH_SHORT).show()
                                    showBackupRestoreModal = false
                                } else {
                                    Toast.makeText(context, "Format JSON tidak valid!", Toast.LENGTH_LONG).show()
                                }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = colors.primaryContainer)
                ) {
                    Text("Pulihkan Data Sekarang", color = colors.onPrimaryContainer, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showBackupRestoreModal = false }) {
                    Text("Tutup", color = colors.textMuted)
                }
            }
        )
    }

    // Modal Konfirmasi Hapus Semua Data
    if (showDeleteConfirmModal) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirmModal = false },
            shape = RoundedCornerShape(24.dp),
            containerColor = colors.surface,
            icon = {
                Icon(Icons.Default.Warning, contentDescription = null, tint = colors.deductionRed, modifier = Modifier.size(32.dp))
            },
            title = {
                Text("Hapus Semua Data?", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = colors.textPrimary)
            },
            text = {
                Text(
                    "Tindakan ini akan mengosongkan semua data profil karyawan, catatan lembur, cuti, dan riwayat kalkulasi slip gaji. Data yang dihapus tidak dapat dipulihkan kembali kecuali Anda memiliki file cadangan JSON.",
                    fontSize = 12.sp,
                    color = colors.textSecondary
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        onClearAllData()
                        showDeleteConfirmModal = false
                        Toast.makeText(context, "Semua data berhasil dibersihkan!", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = colors.deductionRed)
                ) {
                    Text("Ya, Hapus Semua Data", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirmModal = false }) {
                    Text("Batal", color = colors.textMuted)
                }
            }
        )
    }

    // Modal Kalkulator Uang Makan & Transport (Kehadiran)
    if (showAttendanceCalcDialog) {
        val curMeal = mealAllowanceStr.toDoubleOrNull() ?: 0.0
        val curTransport = transportAllowanceStr.toDoubleOrNull() ?: 0.0
        AttendanceAllowanceCalculatorDialog(
            initialAttendanceDays = 0,
            initialMealTotal = curMeal,
            initialTransportTotal = curTransport,
            mode = attendanceCalcMode,
            onApply = { _, mealTotal, transportTotal, _, _ ->
                if (attendanceCalcMode == AttendanceCalculatorMode.MEAL_ONLY) {
                    mealAllowanceStr = mealTotal.toLong().toString()
                }
                if (attendanceCalcMode == AttendanceCalculatorMode.TRANSPORT_ONLY) {
                    transportAllowanceStr = transportTotal.toLong().toString()
                }
                showAttendanceCalcDialog = false
            },
            onDismiss = { showAttendanceCalcDialog = false }
        )
    }
}
