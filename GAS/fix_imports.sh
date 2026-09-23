for file in app/src/main/java/com/example/ui/components/AttendancePhotoComponents.kt app/src/main/java/com/example/ui/screens/AuditK3Screen.kt app/src/main/java/com/example/ui/screens/PayslipDetailDialog.kt app/src/main/java/com/example/ui/screens/TaxReportScreen.kt; do
  sed -i 's/import androidx.compose.runtime.remember/import androidx.compose.runtime.remember\nimport androidx.compose.runtime.rememberCoroutineScope\nimport kotlinx.coroutines.launch\nimport kotlinx.coroutines.Dispatchers/g' $file
done
