package com.example.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.data.model.MonthlyAttendanceSummary
import com.example.domain.util.Formatters
import com.example.ui.PayrollViewModel

@Composable
fun AnalyticsAttendanceCard(
    viewModel: PayrollViewModel,
    selectedMonth: Int,
    selectedYear: Int
) {
    val userProfile by viewModel.userProfile.collectAsStateWithLifecycle()
    
    // State ini otomatis mengamati perubahan di database berkat helper terpusat
    val summaryFlow = remember(selectedMonth, selectedYear) {
        viewModel.getMonthlyAttendanceSummary(selectedMonth, selectedYear)
    }
    val summary by summaryFlow.collectAsStateWithLifecycle(
        initialValue = MonthlyAttendanceSummary(0, 0, 0, 0.0, 0.0)
    )

    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Analitik Kehadiran & Tunjangan", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            
            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    text = "Uang Makan: ${summary.totalHariUangMakan} hari x ${Formatters.formatRupiah(userProfile.mealAllowancePerDay)}",
                    fontSize = 12.sp,
                    color = Color.DarkGray
                )
                Text(
                    text = Formatters.formatRupiah(summary.totalNominalUangMakan),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    text = "Uang Transport: ${summary.totalHariUangTransport} hari x ${Formatters.formatRupiah(userProfile.transportAllowancePerDay)}",
                    fontSize = 12.sp,
                    color = Color.DarkGray
                )
                Text(
                    text = Formatters.formatRupiah(summary.totalNominalUangTransport),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
            
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    text = "Total Kehadiran:",
                    fontSize = 12.sp,
                    color = Color.DarkGray
                )
                Text(
                    text = "${summary.totalHariHadir} Hari",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}
