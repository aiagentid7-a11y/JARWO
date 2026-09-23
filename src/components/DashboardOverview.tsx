import React, { useMemo, useState } from 'react';
import { Employee, DepartmentStat } from '../types';
import { 
  Users, UserCheck, MapPin, Award, GraduationCap, Percent, 
  ChevronRight, TrendingUp, Calendar, FileText, Bell, Clock,
  DollarSign, ArrowUpRight, TrendingDown, Layers, Download, Check, PieChart, Info
} from 'lucide-react';
import { getDaysLeftAndSeverity, parseDateString, parseWageToNumber, isBpjsRegistered } from '../dateUtils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import DataExchangeBar from './DataExchangeBar';

interface DashboardOverviewProps {
  employees: Employee[];
  onSelectDepartment: (deptName: string) => void;
  onNavigateToLeave?: (filters: { searchTerm?: string; urgencyFilter?: 'all' | 'expired' | 'urgent' | 'warning' | 'safe' | 'expired-or-urgent' }) => void;
  onNavigateToPkwt?: (filters: { searchTerm?: string; urgencyFilter?: 'all' | 'expired' | 'urgent' | 'warning' | 'safe' | 'expired-or-urgent' }) => void;
  onUploadSuccess?: () => void;
}

export default function DashboardOverview({ 
  employees, 
  onSelectDepartment,
  onNavigateToLeave,
  onNavigateToPkwt,
  onUploadSuccess
}: DashboardOverviewProps) {
  // Reminder State Filters
  const [contractDaysFilter, setContractDaysFilter] = useState<'all' | 'urgent' | 'expired'>('all');
  const [leaveDaysFilter, setLeaveDaysFilter] = useState<'all' | 'urgent' | 'expired'>('all');

  // ==========================================
  // STATES & CALCULATIONS FOR MONTHLY & YEARLY REPORTS
  // ==========================================
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [reportYear, setReportYear] = useState<number>(2026);
  const [reportMonth, setReportMonth] = useState<number>(6); // Default: 6 = Juli (local baseline from metadata is 2026-07)
  const [selectedTrendMetric, setSelectedTrendMetric] = useState<'headcount' | 'budget' | 'hires' | 'expirations'>('headcount');
  const [activeStaffSubTab, setActiveStaffSubTab] = useState<'hires' | 'expirations'>('hires');

  const indonesianMonths = useMemo(() => [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ], []);

  // Dynamically aggregate available years in employee data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([2024, 2025, 2026, 2027, 2028]);
    employees.forEach(e => {
      if (e.startDate) {
        const d = parseDateString(e.startDate);
        if (d) yearsSet.add(d.getFullYear());
      }
      if (e.contractEndDate) {
        const d = parseDateString(e.contractEndDate);
        if (d) yearsSet.add(d.getFullYear());
      }
    });
    return Array.from(yearsSet).sort();
  }, [employees]);

  // Calculate Monthly Report Data
  const monthlyReportData = useMemo(() => {
    const targetMonth = reportMonth;
    const targetYear = reportYear;

    // Filter employees active during this specific month
    const activeEmployees = employees.filter(emp => {
      const start = parseDateString(emp.startDate);
      if (!start) return false;

      const monthStart = new Date(targetYear, targetMonth, 1);
      const monthEnd = new Date(targetYear, targetMonth + 1, 0);

      // Joined after this month ends? Not active
      if (start > monthEnd) return false;

      // Ended before this month starts? Not active
      if (emp.contractEndDate) {
        const end = parseDateString(emp.contractEndDate);
        if (end && end < monthStart) return false;
      }

      return true;
    });

    // Filter new hires in this specific month
    const newHires = employees.filter(emp => {
      const start = parseDateString(emp.startDate);
      if (!start) return false;
      return start.getMonth() === targetMonth && start.getFullYear() === targetYear;
    });

    // Filter contract expirations in this specific month
    const contractExpirations = employees.filter(emp => {
      if (emp.status !== 'PKWT' || !emp.contractEndDate) return false;
      const end = parseDateString(emp.contractEndDate);
      if (!end) return false;
      return end.getMonth() === targetMonth && end.getFullYear() === targetYear;
    });

    // Financial estimations for this active month
    let totalBaseWage = 0;
    let totalFixedAllowance = 0;
    let totalBpjsTkEstimation = 0;
    let totalBpjsKesEstimation = 0;
    let totalTaxEstimation = 0;

    activeEmployees.forEach(emp => {
      const baseWage = parseWageToNumber(emp.wage) || 0;
      totalBaseWage += baseWage;

      const allowance = emp.fixedAllowance !== undefined ? emp.fixedAllowance : 0;
      totalFixedAllowance += allowance;

      // Estimasi BPJS contributions if not disabled
      if (!emp.disableBpjs) {
        if (isBpjsRegistered(emp.bpjsTk)) {
          totalBpjsTkEstimation += Math.round(baseWage * 0.057); // 5.7% total contribution (employer + employee)
        }
        if (isBpjsRegistered(emp.bpjsKes)) {
          totalBpjsKesEstimation += Math.round(baseWage * 0.05); // 5% total contribution
        }
      }

      // Tax estimation
      if (!emp.disableTax) {
        const rate = emp.taxRate || 5; // default 5%
        totalTaxEstimation += Math.round(baseWage * (rate / 100));
      }
    });

    const totalGrossPayroll = totalBaseWage + totalFixedAllowance;
    const totalDeductions = totalTaxEstimation; // treat tax as direct payroll deduction
    const netPayroll = totalGrossPayroll - totalDeductions;

    // Demographics
    const localCount = activeEmployees.filter(e => e.isLocal).length;
    const nonLocalCount = activeEmployees.filter(e => e.isNonLocal).length;
    const maleCount = activeEmployees.filter(e => e.gender === 'Laki-laki').length;
    const femaleCount = activeEmployees.filter(e => e.gender === 'Perempuan').length;

    return {
      activeEmployees,
      newHires,
      contractExpirations,
      activeHeadcount: activeEmployees.length,
      newHiresCount: newHires.length,
      expirationsCount: contractExpirations.length,
      financials: {
        baseWage: totalBaseWage,
        fixedAllowance: totalFixedAllowance,
        bpjsTk: totalBpjsTkEstimation,
        bpjsKes: totalBpjsKesEstimation,
        tax: totalTaxEstimation,
        gross: totalGrossPayroll,
        net: netPayroll
      },
      demographics: {
        localCount,
        nonLocalCount,
        maleCount,
        femaleCount
      }
    };
  }, [employees, reportMonth, reportYear]);

  // Calculate Yearly Trend Data
  const yearlyTrendData = useMemo(() => {
    const targetYear = reportYear;

    const monthlyTrends = Array.from({ length: 12 }, (_, monthIdx) => {
      // Calculate active headcount for this month
      const activeEmployees = employees.filter(emp => {
        const start = parseDateString(emp.startDate);
        if (!start) return false;
        
        const monthStart = new Date(targetYear, monthIdx, 1);
        const monthEnd = new Date(targetYear, monthIdx + 1, 0);
        
        if (start > monthEnd) return false;
        
        if (emp.contractEndDate) {
          const end = parseDateString(emp.contractEndDate);
          if (end && end < monthStart) return false;
        }
        
        return true;
      });

      // New hires in this month
      const hires = employees.filter(emp => {
        const start = parseDateString(emp.startDate);
        if (!start) return false;
        return start.getMonth() === monthIdx && start.getFullYear() === targetYear;
      });

      // Expirations in this month
      const expirations = employees.filter(emp => {
        if (emp.status !== 'PKWT' || !emp.contractEndDate) return false;
        const end = parseDateString(emp.contractEndDate);
        if (!end) return false;
        return end.getMonth() === monthIdx && end.getFullYear() === targetYear;
      });

      // Budget (base wage + allowances)
      let totalBudget = 0;
      activeEmployees.forEach(emp => {
        const baseWage = parseWageToNumber(emp.wage) || 0;
        const allowance = emp.fixedAllowance !== undefined ? emp.fixedAllowance : 0;
        totalBudget += (baseWage + allowance);
      });

      return {
        monthIndex: monthIdx,
        monthName: indonesianMonths[monthIdx].substring(0, 3),
        fullMonthName: indonesianMonths[monthIdx],
        headcount: activeEmployees.length,
        budget: totalBudget,
        hires: hires.length,
        expirations: expirations.length,
        hiresList: hires,
        expirationsList: expirations
      };
    });

    // Aggregate values over the year
    let annualTotalHires = 0;
    let annualTotalExpirations = 0;
    let annualMaxHeadcount = 0;
    let annualSumBudget = 0;

    monthlyTrends.forEach(m => {
      annualTotalHires += m.hires;
      annualTotalExpirations += m.expirations;
      annualSumBudget += m.budget;
      if (m.headcount > annualMaxHeadcount) {
        annualMaxHeadcount = m.headcount;
      }
    });

    return {
      monthlyTrends,
      annualTotalHires,
      annualTotalExpirations,
      annualMaxHeadcount,
      annualSumBudget,
      averageMonthlyHeadcount: Math.round((monthlyTrends.reduce((sum, m) => sum + m.headcount, 0) / 12) * 10) / 10
    };
  }, [employees, reportYear, indonesianMonths]);

  // PDF Report Export Handler
  const handleExportReportPDF = () => {
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      // Draw modern header band
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('ONE FOR ALL', 15, 18);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('HR SYSTEM - LAPORAN ANALITIK KARYAWAN', 15, 25);
      doc.text(`Dicetak: ${timestamp}`, 195, 18, { align: 'right' });

      if (reportType === 'monthly') {
        const mName = indonesianMonths[reportMonth];
        doc.setFillColor(79, 70, 229); // indigo-600
        doc.rect(0, 40, 210, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`LAPORAN ANALITIK BULANAN - ${mName.toUpperCase()} ${reportYear}`, 15, 46);

        // Section 1: General Metrics Table
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.text('1. RINGKASAN METRIK BULANAN', 15, 62);
        doc.line(15, 64, 195, 64);

        const summaryData = [
          ['Headcount Karyawan Aktif', `${monthlyReportData.activeHeadcount} Orang`],
          ['Penerimaan Karyawan Baru', `${monthlyReportData.newHiresCount} Orang`],
          ['Kontrak PKWT Berakhir', `${monthlyReportData.expirationsCount} Orang`],
          ['Komposisi Gender', `${monthlyReportData.demographics.maleCount} Pria / ${monthlyReportData.demographics.femaleCount} Wanita`],
          ['Rasio Tenaga Kerja', `${monthlyReportData.demographics.localCount} Lokal / ${monthlyReportData.demographics.nonLocalCount} Non-Lokal`]
        ];

        (doc as any).autoTable({
          startY: 68,
          head: [['Kategori Indikator', 'Data Aktual']],
          body: summaryData,
          theme: 'striped',
          headStyles: { fillColor: [51, 65, 85] }, // slate-700
          styles: { fontSize: 9 },
          margin: { left: 15, right: 15 }
        });

        // Section 2: Financial Estimates
        const startYFin = (doc as any).lastAutoTable.finalY + 12;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('2. ESTIMASI ANGGARAN & PENGELUARAN GAJI', 15, startYFin);
        doc.line(15, startYFin + 2, 195, startYFin + 2);

        const finData = [
          ['Gaji Pokok Karyawan Aktif', `Rp ${monthlyReportData.financials.baseWage.toLocaleString('id-ID')}`],
          ['Tunjangan Tetap', `Rp ${monthlyReportData.financials.fixedAllowance.toLocaleString('id-ID')}`],
          ['Estimasi BPJS Ketenagakerjaan (5.7% Base)', `Rp ${monthlyReportData.financials.bpjsTk.toLocaleString('id-ID')}`],
          ['Estimasi BPJS Kesehatan (5.0% Base)', `Rp ${monthlyReportData.financials.bpjsKes.toLocaleString('id-ID')}`],
          ['Estimasi Pajak Penghasilan (PPh 21)', `Rp ${monthlyReportData.financials.tax.toLocaleString('id-ID')}`],
          ['TOTAL ANGGARAN KOTOR (GROSS)', `Rp ${monthlyReportData.financials.gross.toLocaleString('id-ID')}`],
          ['ESTIMASI GAJI BERSIH DITERIMA (NET)', `Rp ${monthlyReportData.financials.net.toLocaleString('id-ID')}`]
        ];

        (doc as any).autoTable({
          startY: startYFin + 6,
          head: [['Komponen Anggaran Gaji', 'Estimasi Nilai Bulanan']],
          body: finData,
          theme: 'striped',
          headStyles: { fillColor: [13, 148, 136] }, // teal-600
          columnStyles: {
            1: { halign: 'right', fontStyle: 'bold' }
          },
          styles: { fontSize: 9 },
          margin: { left: 15, right: 15 }
        });

        // Section 3: Staff changes list
        const startYStaff = (doc as any).lastAutoTable.finalY + 12;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('3. DAFTAR PERUBAHAN STAF BULAN INI', 15, startYStaff);
        doc.line(15, startYStaff + 2, 195, startYStaff + 2);

        const staffData: string[][] = [];
        monthlyReportData.newHires.forEach(emp => {
          staffData.push([emp.name, emp.nik, emp.position, emp.department, 'Karyawan Baru', emp.startDate || '-']);
        });
        monthlyReportData.contractExpirations.forEach(emp => {
          staffData.push([emp.name, emp.nik, emp.position, emp.department, 'Masa Kontrak Berakhir', emp.contractEndDate || '-']);
        });

        if (staffData.length === 0) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 116, 139);
          doc.text('Tidak ada penambahan karyawan baru atau kontrak berakhir di bulan ini.', 15, startYStaff + 8);
        } else {
          (doc as any).autoTable({
            startY: startYStaff + 6,
            head: [['Nama Karyawan', 'NIK', 'Jabatan', 'Departemen', 'Status Perubahan', 'Tanggal']],
            body: staffData,
            theme: 'striped',
            headStyles: { fillColor: [99, 102, 241] }, // indigo-500
            styles: { fontSize: 8 },
            margin: { left: 15, right: 15 }
          });
        }

        doc.save(`Laporan_HR_Bulanan_${mName}_${reportYear}.pdf`);
      } else {
        // Yearly Report PDF
        doc.setFillColor(79, 70, 229); // indigo-600
        doc.rect(0, 40, 210, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`LAPORAN & PROYEKSI TAHUNAN - TAHUN ${reportYear}`, 15, 46);

        // Section 1: Summary Cards
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.text('1. RINGKASAN PROYEKSI TAHUNAN', 15, 62);
        doc.line(15, 64, 195, 64);

        const summaryData = [
          ['Rerata Karyawan Aktif Bulanan', `${yearlyTrendData.averageMonthlyHeadcount} Orang`],
          ['Puncak Jumlah Karyawan (Max Headcount)', `${yearlyTrendData.annualMaxHeadcount} Orang`],
          ['Total Rekrutmen Baru Setahun', `${yearlyTrendData.annualTotalHires} Orang`],
          ['Total Kontrak PKWT Berakhir Setahun', `${yearlyTrendData.annualTotalExpirations} Orang`],
          ['Total Proyeksi Anggaran Gaji Setahun', `Rp ${yearlyTrendData.annualSumBudget.toLocaleString('id-ID')}`]
        ];

        (doc as any).autoTable({
          startY: 68,
          head: [['Metrik Kinerja HR Tahunan', 'Data Agregat']],
          body: summaryData,
          theme: 'striped',
          headStyles: { fillColor: [51, 65, 85] },
          styles: { fontSize: 9 },
          margin: { left: 15, right: 15 }
        });

        // Section 2: 12-Month Timeline Table
        const startYTable = (doc as any).lastAutoTable.finalY + 12;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('2. TIMELINE BULANAN (TREN 12 BULAN)', 15, startYTable);
        doc.line(15, startYTable + 2, 195, startYTable + 2);

        const timelineData = yearlyTrendData.monthlyTrends.map(trend => [
          trend.fullMonthName,
          `${trend.headcount} Orang`,
          `Rp ${trend.budget.toLocaleString('id-ID')}`,
          `${trend.hires} Orang`,
          `${trend.expirations} Orang`
        ]);

        (doc as any).autoTable({
          startY: startYTable + 6,
          head: [['Bulan', 'Headcount Aktif', 'Proyeksi Anggaran', 'Karyawan Baru', 'Akhir Kontrak']],
          body: timelineData,
          theme: 'striped',
          headStyles: { fillColor: [13, 148, 136] }, // teal-600
          styles: { fontSize: 8 },
          margin: { left: 15, right: 15 }
        });

        doc.save(`Laporan_HR_Tahunan_${reportYear}.pdf`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal mendownload PDF: ' + err.message);
    }
  };

  // 1. Calculate General Metrics
  const totalCount = employees.length;
  
  const localCount = useMemo(() => employees.filter(e => e.isLocal).length, [employees]);
  const nonLocalCount = useMemo(() => employees.filter(e => e.isNonLocal).length, [employees]);
  const pkwtCount = useMemo(() => employees.filter(e => e.status === 'PKWT').length, [employees]);
  const pkwttCount = useMemo(() => employees.filter(e => e.status === 'PKWTT').length, [employees]);
  
  const maleCount = useMemo(() => employees.filter(e => e.gender === 'Laki-laki').length, [employees]);
  const femaleCount = useMemo(() => employees.filter(e => e.gender === 'Perempuan').length, [employees]);

  const avgAge = useMemo(() => {
    if (totalCount === 0) return 0;
    const ages = employees.map(e => {
      const ageStr = String(e.age || '');
      const match = ageStr.match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    }).filter((a): a is number => a !== null);
    if (ages.length === 0) return 0;
    return Math.round((ages.reduce((sum, val) => sum + val, 0) / ages.length) * 10) / 10;
  }, [employees, totalCount]);

  // BPJS coverage rates
  const bpjsTkCovered = useMemo(() => employees.filter(e => isBpjsRegistered(e.bpjsTk)).length, [employees]);
  const bpjsKesCovered = useMemo(() => employees.filter(e => isBpjsRegistered(e.bpjsKes)).length, [employees]);

  const bpjsTkRate = totalCount ? Math.round((bpjsTkCovered / totalCount) * 100) : 0;
  const bpjsKesRate = totalCount ? Math.round((bpjsKesCovered / totalCount) * 100) : 0;

  // Certification counts
  const popCount = useMemo(() => employees.filter(e => (e.certification || '').toUpperCase().includes('POP')).length, [employees]);
  const pomCount = useMemo(() => employees.filter(e => (e.certification || '').toUpperCase().includes('POM')).length, [employees]);

  // 2. Department Metrics Breakdowns
  const deptStats = useMemo(() => {
    const map = new Map<string, any>();
    
    employees.forEach(e => {
      const d = e.department;
      if (!map.has(d)) {
        map.set(d, {
          name: d,
          count: 0,
          local: 0,
          nonLocal: 0,
          pkwt: 0,
          pkwtt: 0,
          male: 0,
          female: 0,
          ages: []
        });
      }
      const s = map.get(d);
      s.count++;
      if (e.isLocal) s.local++;
      if (e.isNonLocal) s.nonLocal++;
      if (e.status === 'PKWT') s.pkwt++;
      if (e.status === 'PKWTT') s.pkwtt++;
      if (e.gender === 'Laki-laki') s.male++;
      if (e.gender === 'Perempuan') s.female++;
      
      const ageMatch = String(e.age || '').match(/\d+/);
      if (ageMatch) s.ages.push(parseInt(ageMatch[0], 10));
    });

    const list: DepartmentStat[] = [];
    map.forEach(s => {
      const avg = s.ages.length ? s.ages.reduce((sum: number, v: number) => sum + v, 0) / s.ages.length : 0;
      list.push({
        name: s.name,
        count: s.count,
        localCount: s.local,
        nonLocalCount: s.nonLocal,
        pkwtCount: s.pkwt,
        pkwttCount: s.pkwtt,
        maleCount: s.male,
        femaleCount: s.female,
        avgAge: Math.round(avg * 10) / 10
      });
    });

    return list.sort((a, b) => b.count - a.count);
  }, [employees]);

  // 3. Age Brackets Breakdowns
  const ageBrackets = useMemo(() => {
    const counts = { 'Dibawah 25': 0, '25 - 34': 0, '35 - 44': 0, '45 - 54': 0, '55 Keatas': 0 };
    employees.forEach(e => {
      const ageStr = String(e.age || '');
      const match = ageStr.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (val < 25) counts['Dibawah 25']++;
        else if (val <= 34) counts['25 - 34']++;
        else if (val <= 44) counts['35 - 44']++;
        else if (val <= 54) counts['45 - 54']++;
        else counts['55 Keatas']++;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  // 4. Education distribution
  const educationStats = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach(e => {
      // Normalize education
      let edu = e.education || 'TIDAK DIKETAHUI';
      if (edu.startsWith('S1')) edu = 'S1';
      else if (edu.startsWith('D3')) edu = 'D3';
      else if (edu.startsWith('S2')) edu = 'S2';
      else if (edu.startsWith('SMK') || edu.startsWith('SMA')) edu = 'SMA/SMK';
      
      counts[edu] = (counts[edu] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [employees]);

  // Calculate Expiration & Leave Reminders
  const reminders = useMemo(() => {
    const contractsList: Array<{ employee: Employee; daysLeft: number; label: string; severity: 'expired' | 'critical' | 'warning' | 'safe' }> = [];
    const leavesList: Array<{ employee: Employee; daysLeft: number; label: string; severity: 'expired' | 'critical' | 'warning' | 'safe' }> = [];

    employees.forEach(e => {
      if (e.contractEndDate) {
        const details = getDaysLeftAndSeverity(e.contractEndDate);
        if (details) {
          contractsList.push({
            employee: e,
            ...details
          });
        }
      }
      if (e.leaveExpiryDate) {
        const details = getDaysLeftAndSeverity(e.leaveExpiryDate);
        if (details) {
          leavesList.push({
            employee: e,
            ...details
          });
        }
      }
    });

    return {
      contracts: contractsList.sort((a, b) => a.daysLeft - b.daysLeft),
      leaves: leavesList.sort((a, b) => a.daysLeft - b.daysLeft)
    };
  }, [employees]);

  // PKWT Jatuh Tempo (Expired or critical <= 30 days)
  const pkwtExpiredCount = useMemo(() => reminders.contracts.filter(c => c.daysLeft < 0).length, [reminders]);
  const pkwtUrgentCount = useMemo(() => reminders.contracts.filter(c => c.daysLeft >= 0 && c.daysLeft <= 30).length, [reminders]);
  const pkwtTotalJatuhTempo = pkwtExpiredCount + pkwtUrgentCount;

  // Cuti Jatuh Tempo (Expired or critical <= 30 days)
  const cutiExpiredCount = useMemo(() => reminders.leaves.filter(l => l.daysLeft < 0).length, [reminders]);
  const cutiUrgentCount = useMemo(() => reminders.leaves.filter(l => l.daysLeft >= 0 && l.daysLeft <= 30).length, [reminders]);
  const cutiTotalJatuhTempo = cutiExpiredCount + cutiUrgentCount;

  // Total employees by Local Ratio
  const localRatio = totalCount ? Math.round((localCount / totalCount) * 100) : 0;
  const nonLocalRatio = 100 - localRatio;

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* DATA IMPORT / EXPORT BAR */}
      <DataExchangeBar 
        data={employees} 
        fileName="laporan_analitik_karyawan" 
        onUploadSuccess={onUploadSuccess}
        title="Kelola &amp; Ekspor Database Karyawan One For All"
      />

      {/* 1. KEY STATS WIDGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4" id="stats-grid">
        {/* Total Karyawan */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between" id="stat-total">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Karyawan</p>
            <h3 className="text-3xl font-bold text-white font-heading">{totalCount.toLocaleString('id-ID')}</h3>
            <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Aktif Bekerja</span>
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Lokal vs Non-Lokal */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between" id="stat-localization">
          <div className="space-y-1 w-full mr-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tenaga Kerja Lokal</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-white font-heading">{localCount}</h3>
              <span className="text-sm font-medium text-slate-400">({localRatio}%)</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-emerald-500 h-1.5 rounded-full" 
                style={{ width: `${localRatio}%` }}
              />
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20 shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

        {/* PKWT vs PKWTT */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between" id="stat-status">
          <div className="space-y-1 w-full mr-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hubungan Kerja (PKWT)</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-white font-heading">{pkwtCount}</h3>
              <span className="text-sm font-medium text-slate-400">PKWT / {pkwttCount} PKWTT</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-indigo-500 h-1.5 rounded-full" 
                style={{ width: `${totalCount ? Math.round((pkwtCount / totalCount) * 100) : 0}%` }}
              />
            </div>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20 shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Jatuh Tempo PKWT */}
        <div 
          onClick={() => onNavigateToPkwt?.({ urgencyFilter: 'expired-or-urgent' })}
          className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between cursor-pointer hover:border-rose-500/40 hover:bg-slate-900/60 transition-all group" 
          id="stat-pkwt-jatuh-tempo"
          title="Klik untuk membuka Analisis PKWT & melihat karyawan jatuh tempo"
        >
          <div className="space-y-1 w-full mr-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-rose-400 transition-colors">Jatuh Tempo PKWT</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-white font-heading">{pkwtTotalJatuhTempo}</h3>
              <span className="text-xs font-medium text-slate-400">Karyawan</span>
            </div>
            <p className="text-[10px] text-rose-400 font-semibold mt-1">
              {pkwtExpiredCount} Lewat &bull; {pkwtUrgentCount} Mendesak
            </p>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20 shrink-0 group-hover:bg-rose-500/20 transition-all">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Jatuh Tempo Cuti */}
        <div 
          onClick={() => onNavigateToLeave?.({ urgencyFilter: 'expired-or-urgent' })}
          className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-500/40 hover:bg-slate-900/60 transition-all group" 
          id="stat-cuti-jatuh-tempo"
          title="Klik untuk membuka modul Cuti & melihat karyawan jatuh tempo"
        >
          <div className="space-y-1 w-full mr-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-amber-400 transition-colors">Jatuh Tempo Cuti</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-white font-heading">{cutiTotalJatuhTempo}</h3>
              <span className="text-xs font-medium text-slate-400">Karyawan</span>
            </div>
            <p className="text-[10px] text-amber-400 font-semibold mt-1">
              {cutiExpiredCount} Lewat &bull; {cutiUrgentCount} Mendesak
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20 shrink-0 group-hover:bg-amber-500/20 transition-all">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Rata-rata Usia */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between" id="stat-age">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rata-Rata Usia</p>
            <h3 className="text-3xl font-bold text-white font-heading">{avgAge} <span className="text-sm font-normal text-slate-400">Tahun</span></h3>
            <p className="text-xs text-slate-400 mt-1">
              {maleCount} Pria &bull; {femaleCount} Wanita
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
            <Percent className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 1.5. PUSAT PENGINGAT & REMINDER JATUH TEMPO */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4" id="reminders-center">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20 flex shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-heading">Pusat Pengingat &amp; Reminder Jatuh Tempo</h3>
              <p className="text-xs text-slate-400">Deteksi otomatis kontrak PKWT hampir berakhir dan batas waktu pengambilan cuti tahunan.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Status hari ini:</span>
            <span className="px-2.5 py-1 bg-slate-950 text-slate-300 rounded-full border border-slate-800 font-mono font-bold">
              15-Jul-2026
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KOLOM KIRI: JATUH TEMPO KONTRAK */}
          <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">Reminder Kontrak PKWT</h4>
              </div>
              <div className="flex gap-1.5">
                {(['all', 'urgent', 'expired'] as const).map((mode) => {
                  const label = mode === 'all' ? 'Semua' : mode === 'urgent' ? 'Mendesak' : 'Lewat';
                  const active = contractDaysFilter === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setContractDaysFilter(mode)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        active
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List Contracts */}
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {(() => {
                const filtered = reminders.contracts.filter(item => {
                  if (contractDaysFilter === 'urgent') return item.daysLeft >= 0 && item.daysLeft <= 30;
                  if (contractDaysFilter === 'expired') return item.daysLeft < 0;
                  return item.severity !== 'safe'; // show expired, critical, and warning by default
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      Tidak ada pengingat kontrak untuk filter ini.
                    </div>
                  );
                }

                return filtered.map((item, idx) => {
                  let badgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                  if (item.severity === 'warning') badgeColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                  else if (item.severity === 'expired') badgeColor = "bg-red-500/20 text-red-400 border border-red-500/30 font-bold";

                  return (
                    <div 
                      key={idx} 
                      onClick={() => onNavigateToPkwt?.({ searchTerm: item.employee.name })}
                      className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex justify-between items-center hover:border-indigo-500/40 hover:bg-slate-900/60 transition-all cursor-pointer group"
                      title={`Klik untuk melihat detail PKWT ${item.employee.name}`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">{item.employee.name}</span>
                          <span className="text-[9px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">{item.employee.nik}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">{item.employee.position} &bull; {item.employee.department}</p>
                        <p className="text-[10px] text-slate-500">Mulai: {item.employee.startDate || '-'} &bull; Selesai: <span className="font-semibold text-slate-300">{item.employee.contractEndDate}</span></p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className={`text-[10px] px-2 py-1 rounded font-bold ${badgeColor}`}>
                          {item.label}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* KOLOM KANAN: JATUH TEMPO CUTI */}
          <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Reminder Jatuh Tempo Cuti</h4>
              </div>
              <div className="flex gap-1.5">
                {(['all', 'urgent', 'expired'] as const).map((mode) => {
                  const label = mode === 'all' ? 'Semua' : mode === 'urgent' ? 'Mendesak' : 'Lewat';
                  const active = leaveDaysFilter === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setLeaveDaysFilter(mode)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        active
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List Leaves */}
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {(() => {
                const filtered = reminders.leaves.filter(item => {
                  if (leaveDaysFilter === 'urgent') return item.daysLeft >= 0 && item.daysLeft <= 30;
                  if (leaveDaysFilter === 'expired') return item.daysLeft < 0;
                  return item.severity !== 'safe'; // show expired, critical, and warning by default
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      Tidak ada pengingat cuti untuk filter ini.
                    </div>
                  );
                }

                return filtered.map((item, idx) => {
                  let badgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                  if (item.severity === 'warning') badgeColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                  else if (item.severity === 'expired') badgeColor = "bg-red-500/20 text-red-400 border border-red-500/30 font-bold";

                  return (
                    <div 
                      key={idx} 
                      onClick={() => onNavigateToLeave?.({ searchTerm: item.employee.name })}
                      className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex justify-between items-center hover:border-amber-500/40 hover:bg-slate-900/60 transition-all cursor-pointer group"
                      title={`Klik untuk melihat detail cuti ${item.employee.name}`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">{item.employee.name}</span>
                          <span className="text-[9px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">{item.employee.nik}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">{item.employee.position} &bull; {item.employee.department}</p>
                        <p className="text-[10px] text-slate-500">Masa Cuti Hingga: <span className="font-semibold text-slate-300">{item.employee.leaveExpiryDate}</span></p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className={`text-[10px] px-2 py-1 rounded font-bold ${badgeColor}`}>
                          {item.label}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* 2. COVERAGE STATS (BPJS & CERTIFICATION) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="coverage-grid">
        {/* BPJS Ketenagakerjaan */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm space-y-3" id="coverage-bpjs-tk">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-slate-200 font-heading">BPJS Ketenagakerjaan</h4>
            <span className="text-xs font-semibold px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">{bpjsTkRate}% Tercover</span>
          </div>
          <p className="text-xs text-slate-400">Tingkat pendaftaran nomor BPJS TK karyawan aktif.</p>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-white font-heading">{bpjsTkCovered} <span className="text-xs font-normal text-slate-400">/ {totalCount}</span></div>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${bpjsTkRate}%` }} />
          </div>
        </div>

        {/* BPJS Kesehatan */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm space-y-3" id="coverage-bpjs-kes">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-slate-200 font-heading">BPJS Kesehatan</h4>
            <span className="text-xs font-semibold px-2 py-1 bg-teal-500/10 text-teal-400 rounded-full border border-teal-500/20">{bpjsKesRate}% Tercover</span>
          </div>
          <p className="text-xs text-slate-400">Tingkat kepesertaan jaminan BPJS Kesehatan aktif.</p>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-white font-heading">{bpjsKesCovered} <span className="text-xs font-normal text-slate-400">/ {totalCount}</span></div>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
            <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${bpjsKesRate}%` }} />
          </div>
        </div>

        {/* Sertifikasi Mine Safety */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm space-y-3" id="coverage-cert">
          <h4 className="text-sm font-bold text-slate-200 font-heading">Sertifikasi & Lisensi Tambang</h4>
          <p className="text-xs text-slate-400">Distribusi pengawas bersertifikasi KTT di site.</p>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block font-medium">Pengawas POP</span>
              <strong className="text-lg font-bold text-white font-heading">{popCount} Orang</strong>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block font-medium">Pengawas POM</span>
              <strong className="text-lg font-bold text-white font-heading">{pomCount} Orang</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* NEW: PUSAT LAPORAN ANALITIK (BULANAN & TAHUNAN) */}
      {/* ======================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md overflow-hidden" id="hr-report-center">
        {/* Header Block */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                <PieChart className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-white font-heading">Pusat Laporan &amp; Analitik HR</h3>
            </div>
            <p className="text-xs text-slate-400">
              Laporan komparatif bulanan dan tren proyeksi tahunan untuk perencanaan tenaga kerja dan anggaran gaji.
            </p>
          </div>

          {/* Toggle Tab Laporan */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex">
              <button
                onClick={() => setReportType('monthly')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  reportType === 'monthly'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Laporan Bulanan
              </button>
              <button
                onClick={() => setReportType('yearly')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  reportType === 'yearly'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Proyeksi &amp; Tren Tahunan
              </button>
            </div>

            {/* Dropdowns Control */}
            <div className="flex items-center gap-2">
              {reportType === 'monthly' && (
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(parseInt(e.target.value, 10))}
                  className="bg-slate-950 border border-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {indonesianMonths.map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>
              )}

              <select
                value={reportYear}
                onChange={(e) => setReportYear(parseInt(e.target.value, 10))}
                className="bg-slate-950 border border-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>

              {/* PDF Export Button */}
              <button
                onClick={handleExportReportPDF}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Unduh laporan ini dalam format PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Block */}
        <div className="p-5 space-y-6">
          {/* ======================================================= */}
          {/* 1. LAPORAN BULANAN (MONTHLY) */}
          {/* ======================================================= */}
          {reportType === 'monthly' && (
            <div className="space-y-6">
              {/* Quick Summary Widgets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Active Headcount Card */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Karyawan Aktif</span>
                    <strong className="text-2xl font-bold text-white block mt-1">{monthlyReportData.activeHeadcount} Orang</strong>
                    <span className="text-[10px] text-slate-500">Bekerja di periode {indonesianMonths[reportMonth]}</span>
                  </div>
                  <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                {/* New Hires Card */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Karyawan Baru</span>
                    <strong className="text-2xl font-bold text-emerald-400 block mt-1">+{monthlyReportData.newHiresCount} Orang</strong>
                    <span className="text-[10px] text-slate-500">Mulai kerja bulan ini</span>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>

                {/* Expirations Card */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kontrak Berakhir</span>
                    <strong className="text-2xl font-bold text-rose-400 block mt-1">{monthlyReportData.expirationsCount} Orang</strong>
                    <span className="text-[10px] text-slate-500">PKWT jatuh tempo bulan ini</span>
                  </div>
                  <div className="p-2.5 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                </div>

                {/* Estimated Net Payroll Card */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimasi Pengeluaran Gaji</span>
                    <strong className="text-lg sm:text-xl font-bold text-amber-400 block mt-1.5">
                      Rp {monthlyReportData.financials.net.toLocaleString('id-ID')}
                    </strong>
                    <span className="text-[10px] text-slate-500">Estimasi take-home pay bersih</span>
                  </div>
                  <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Grid 2-Kolom Detail Bulanan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* KIRI: Rincian Anggaran Finansial */}
                <div className="bg-slate-950/20 border border-slate-850 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
                    <DollarSign className="w-4.5 h-4.5 text-amber-400" />
                    <h4 className="text-sm font-bold text-white font-heading">Estimasi Rincian Anggaran Periode Ini</h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-900/60">
                      <span className="text-slate-400">Total Gaji Pokok (Base Wage)</span>
                      <span className="text-white font-mono font-semibold">Rp {monthlyReportData.financials.baseWage.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-900/60">
                      <span className="text-slate-400">Total Tunjangan Tetap</span>
                      <span className="text-white font-mono font-semibold">Rp {monthlyReportData.financials.fixedAllowance.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-900/60">
                      <span className="text-slate-400">Estimasi BPJS Ketenagakerjaan (5.7% total)</span>
                      <span className="text-slate-300 font-mono">Rp {monthlyReportData.financials.bpjsTk.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-900/60">
                      <span className="text-slate-400">Estimasi BPJS Kesehatan (5% total)</span>
                      <span className="text-slate-300 font-mono">Rp {monthlyReportData.financials.bpjsKes.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-slate-900/60">
                      <span className="text-rose-400/90 font-medium">Potongan Pajak Penghasilan (PPh 21)</span>
                      <span className="text-rose-400 font-mono font-semibold">- Rp {monthlyReportData.financials.tax.toLocaleString('id-ID')}</span>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-lg flex justify-between items-center mt-3">
                      <div>
                        <span className="text-xs font-bold text-white block">Estimasi Payroll Bersih (Net)</span>
                        <span className="text-[10px] text-slate-400">Ditransfer langsung ke rekening staf</span>
                      </div>
                      <span className="text-base font-bold text-emerald-400 font-mono">
                        Rp {monthlyReportData.financials.net.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 flex items-start gap-2 text-[11px] text-slate-400">
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p>
                      Estimasi anggaran ini bersifat indikatif dan dihitung otomatis berdasarkan data gaji aktif, nomor kepesertaan BPJS, serta tarif pajak pribadi karyawan yang tercatat di sistem One For All.
                    </p>
                  </div>
                </div>

                {/* KANAN: Perubahan Karyawan Bulanan */}
                <div className="bg-slate-950/20 border border-slate-850 rounded-xl p-5 flex flex-col h-full">
                  {/* Selector Subtab */}
                  <div className="flex justify-between items-center border-b border-slate-850 pb-2.5 mb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4.5 h-4.5 text-indigo-400" />
                      <h4 className="text-sm font-bold text-white font-heading">Daftar Perubahan Anggota Tim</h4>
                    </div>

                    <div className="flex gap-1.5 bg-slate-900 p-0.5 rounded border border-slate-800">
                      <button
                        onClick={() => setActiveStaffSubTab('hires')}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          activeStaffSubTab === 'hires'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Baru ({monthlyReportData.newHiresCount})
                      </button>
                      <button
                        onClick={() => setActiveStaffSubTab('expirations')}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          activeStaffSubTab === 'expirations'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Kontrak Habis ({monthlyReportData.expirationsCount})
                      </button>
                    </div>
                  </div>

                  {/* Listings Area */}
                  <div className="space-y-2.5 overflow-y-auto max-h-[240px] pr-1 flex-grow">
                    {activeStaffSubTab === 'hires' ? (
                      monthlyReportData.newHires.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-xs">
                          Tidak ada penambahan karyawan baru di bulan ini.
                        </div>
                      ) : (
                        monthlyReportData.newHires.map((emp, index) => (
                          <div key={index} className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg flex justify-between items-center">
                            <div>
                              <span className="text-xs font-bold text-white block">{emp.name}</span>
                              <span className="text-[10px] text-slate-400">{emp.position} &bull; {emp.department}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">
                                Join: {emp.startDate || '-'}
                              </span>
                            </div>
                          </div>
                        ))
                      )
                    ) : (
                      monthlyReportData.contractExpirations.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-xs">
                          Tidak ada kontrak PKWT yang berakhir di bulan ini.
                        </div>
                      ) : (
                        monthlyReportData.contractExpirations.map((emp, index) => (
                          <div key={index} className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg flex justify-between items-center">
                            <div>
                              <span className="text-xs font-bold text-white block">{emp.name}</span>
                              <span className="text-[10px] text-slate-400">{emp.position} &bull; {emp.department}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-full font-bold">
                                Selesai: {emp.contractEndDate || '-'}
                              </span>
                            </div>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* 2. PROYEKSI & TREN TAHUNAN (YEARLY) */}
          {/* ======================================================= */}
          {reportType === 'yearly' && (
            <div className="space-y-6">
              {/* Yearly Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Avg Active Headcount */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rerata Staf Bulanan</span>
                    <strong className="text-2xl font-bold text-white block mt-1">{yearlyTrendData.averageMonthlyHeadcount} Orang</strong>
                    <span className="text-[10px] text-slate-500">Konsistensi tenaga kerja aktif</span>
                  </div>
                  <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                {/* Peak Headcount */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Puncak Headcount</span>
                    <strong className="text-2xl font-bold text-indigo-400 block mt-1">{yearlyTrendData.annualMaxHeadcount} Orang</strong>
                    <span className="text-[10px] text-slate-500">Titik tertinggi dalam tahun {reportYear}</span>
                  </div>
                  <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                {/* Hires Cumulative */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Rekrutmen</span>
                    <strong className="text-2xl font-bold text-emerald-400 block mt-1">+{yearlyTrendData.annualTotalHires} Orang</strong>
                    <span className="text-[10px] text-slate-500">Kumulatif staf baru satu tahun</span>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>

                {/* Budget Cumulative */}
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Proyeksi Pengeluaran Gaji</span>
                    <strong className="text-lg sm:text-xl font-bold text-amber-400 block mt-1.5">
                      Rp {yearlyTrendData.annualSumBudget.toLocaleString('id-ID')}
                    </strong>
                    <span className="text-[10px] text-slate-500">Proyeksi pengeluaran gaji setahun</span>
                  </div>
                  <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Chart & Trend Visualization */}
              <div className="bg-slate-950/30 border border-slate-850 p-5 rounded-xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-850 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                      <span>Visualisasi Proyeksi Tren 12 Bulan (Tahun {reportYear})</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">Klik pada bar bulan di bawah untuk memfokuskan data dan melihat rincian staf pada bulan tersebut.</p>
                  </div>

                  {/* Chart Metric Selector */}
                  <div className="flex flex-wrap gap-1.5 bg-slate-900 p-0.5 rounded border border-slate-800">
                    {(['headcount', 'budget', 'hires', 'expirations'] as const).map((metric) => {
                      const labels = {
                        headcount: 'Headcount',
                        budget: 'Anggaran Gaji',
                        hires: 'Hires',
                        expirations: 'Kontrak Berakhir'
                      };
                      return (
                        <button
                          key={metric}
                          onClick={() => setSelectedTrendMetric(metric)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            selectedTrendMetric === metric
                              ? 'bg-blue-600 text-white shadow'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {labels[metric]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SVG Chart Panel */}
                <div className="h-[240px] flex items-end justify-between pt-6 px-4 relative">
                  {/* Background grids */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pt-4">
                    <div className="w-full border-t border-dashed border-slate-800/60" />
                    <div className="w-full border-t border-dashed border-slate-800/60" />
                    <div className="w-full border-t border-dashed border-slate-800/60" />
                    <div className="w-full border-t border-dashed border-slate-800/60" />
                  </div>

                  {yearlyTrendData.monthlyTrends.map((trend, idx) => {
                    const activeMetricVal =
                      selectedTrendMetric === 'headcount'
                        ? trend.headcount
                        : selectedTrendMetric === 'budget'
                        ? trend.budget
                        : selectedTrendMetric === 'hires'
                        ? trend.hires
                        : trend.expirations;

                    const maxMetricValue = Math.max(
                      ...yearlyTrendData.monthlyTrends.map((t) =>
                        selectedTrendMetric === 'headcount'
                          ? t.headcount
                          : selectedTrendMetric === 'budget'
                          ? t.budget
                          : selectedTrendMetric === 'hires'
                          ? t.hires
                          : t.expirations
                      )
                    );

                    const heightPct = maxMetricValue > 0 ? (activeMetricVal / maxMetricValue) * 100 : 0;
                    const isFocusedMonth = reportMonth === idx;

                    let barColor = 'bg-blue-600 hover:bg-blue-500';
                    if (selectedTrendMetric === 'budget') barColor = 'bg-amber-600 hover:bg-amber-500';
                    else if (selectedTrendMetric === 'hires') barColor = 'bg-emerald-600 hover:bg-emerald-500';
                    else if (selectedTrendMetric === 'expirations') barColor = 'bg-rose-600 hover:bg-rose-500';

                    if (isFocusedMonth) {
                      barColor = barColor.replace('bg-', 'bg-indigo-400 border-2 border-indigo-200 ');
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => setReportMonth(idx)}
                        className="flex flex-col items-center gap-2 group w-[7.5%] z-10 cursor-pointer"
                        title={`Klik untuk memfokuskan bulan ${trend.fullMonthName}`}
                      >
                        <div className="relative w-full flex justify-center">
                          {/* Tooltip on hover */}
                          <span className="absolute -top-9 bg-slate-950 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap font-semibold border border-slate-800 shadow-md">
                            {trend.fullMonthName}:{' '}
                            {selectedTrendMetric === 'budget'
                              ? `Rp ${activeMetricVal.toLocaleString('id-ID')}`
                              : `${activeMetricVal} Orang`}
                          </span>

                          {/* Bar block */}
                          <div
                            className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${barColor}`}
                            style={{ height: `${heightPct ? Math.max(heightPct * 1.5, 6) : 2}px` }}
                          />
                        </div>
                        <span className={`text-[10px] font-bold ${isFocusedMonth ? 'text-indigo-400' : 'text-slate-400'}`}>
                          {trend.monthName}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Focused Month Quick Stats Callout */}
                <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3.5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                      <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                        Inspeksi Cepat: Bulan {indonesianMonths[reportMonth]} {reportYear}
                      </h5>
                    </div>
                    <button
                      onClick={() => setReportType('monthly')}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Lihat Rincian Keuangan Lengkap</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Hires this month */}
                    <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1.5">
                        Karyawan Baru ({yearlyTrendData.monthlyTrends[reportMonth].hires} Orang)
                      </span>
                      <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                        {yearlyTrendData.monthlyTrends[reportMonth].hiresList.length === 0 ? (
                          <p className="text-[10px] text-slate-500 italic py-2">Tidak ada penambahan karyawan baru di bulan ini.</p>
                        ) : (
                          yearlyTrendData.monthlyTrends[reportMonth].hiresList.map((e, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] bg-slate-900/50 p-1.5 rounded border border-slate-900">
                              <span className="text-white font-medium">{e.name}</span>
                              <span className="text-slate-400 text-[9px]">{e.position}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Expirations this month */}
                    <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1.5">
                        Kontrak Berakhir ({yearlyTrendData.monthlyTrends[reportMonth].expirations} Orang)
                      </span>
                      <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                        {yearlyTrendData.monthlyTrends[reportMonth].expirationsList.length === 0 ? (
                          <p className="text-[10px] text-slate-500 italic py-2">Tidak ada kontrak PKWT berakhir di bulan ini.</p>
                        ) : (
                          yearlyTrendData.monthlyTrends[reportMonth].expirationsList.map((e, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] bg-slate-900/50 p-1.5 rounded border border-slate-900">
                              <span className="text-white font-medium">{e.name}</span>
                              <span className="text-slate-400 text-[9px]">{e.position}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. VISUAL CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="charts-grid">
        {/* Usia Distribution (Custom SVG Chart) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm space-y-4" id="chart-age">
          <h4 className="text-sm font-bold text-slate-200 font-heading flex items-center gap-2">
            <span>Distribusi Demografi Usia Karyawan</span>
          </h4>
          
          <div className="h-[220px] flex items-end justify-between pt-6 px-4 relative">
            {/* Background grids */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pt-4">
              <div className="w-full border-t border-dashed border-slate-800/60" />
              <div className="w-full border-t border-dashed border-slate-800/60" />
              <div className="w-full border-t border-dashed border-slate-800/60" />
              <div className="w-full border-t border-dashed border-slate-800/60" />
            </div>

            {ageBrackets.map((item, idx) => {
              const maxVal = Math.max(...ageBrackets.map(b => b.value));
              const heightPct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
              return (
                <div key={idx} className="flex flex-col items-center gap-2 group w-1/5 z-10">
                  <div className="relative w-full flex justify-center">
                    {/* Tooltip on hover */}
                    <span className="absolute -top-8 bg-slate-850 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap font-medium border border-slate-700">
                      {item.value} Karyawan
                    </span>
                    
                    {/* Bar */}
                    <div 
                      className="w-8 sm:w-12 bg-blue-500 hover:bg-blue-400 rounded-t-md transition-all duration-500 cursor-pointer shadow-sm group-hover:shadow"
                      style={{ height: `${heightPct ? Math.max(heightPct * 1.5, 8) : 0}px` }}
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs text-slate-400 text-center font-medium truncate w-full">
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Education & Localization */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm space-y-6" id="chart-edu-loc">
          <div>
            <h4 className="text-sm font-bold text-slate-200 font-heading mb-4">Tingkat Pendidikan Terakhir</h4>
            <div className="space-y-3">
              {educationStats.map((item, index) => {
                const percentage = totalCount ? Math.round((item.value / totalCount) * 100) : 0;
                let barColor = "bg-blue-500";
                if (item.name === 'SMA/SMK') barColor = "bg-indigo-500";
                else if (item.name === 'SMP') barColor = "bg-amber-500";
                else if (item.name === 'SD') barColor = "bg-orange-500";
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{item.name}</span>
                      <span className="text-slate-400">{item.value} Orang ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. DEPARTMENTS BREAKDOWN TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden" id="departments-breakdown">
        <div className="p-5 border-b border-slate-850 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white font-heading">Distribusi Per Departemen</h3>
            <p className="text-xs text-slate-400">Klik nama departemen untuk memfilter daftar karyawan.</p>
          </div>
          <span className="text-xs bg-slate-950 font-bold text-slate-300 px-2.5 py-1 rounded-full border border-slate-800">
            {deptStats.length} Departemen
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-850">
                <th className="py-3 px-5">Nama Departemen</th>
                <th className="py-3 px-4 text-center">Jumlah Karyawan</th>
                <th className="py-3 px-4 text-center">Lokal</th>
                <th className="py-3 px-4 text-center">Non-Lokal</th>
                <th className="py-3 px-4 text-center">Pria / Wanita</th>
                <th className="py-3 px-4 text-center">Rata-Rata Usia</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-sm text-slate-300">
              {deptStats.map((dept, idx) => {
                const localPct = dept.count ? Math.round((dept.localCount / dept.count) * 100) : 0;
                return (
                  <tr 
                    key={idx} 
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    onClick={() => onSelectDepartment(dept.name)}
                  >
                    <td className="py-3.5 px-5 font-bold text-white group-hover:text-blue-400 transition-colors">
                      {dept.name}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold">
                      {dept.count}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-emerald-400 font-semibold">{dept.localCount}</span>
                      <span className="text-xs text-slate-500 ml-1">({localPct}%)</span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-300 font-medium">
                      {dept.nonLocalCount}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400 text-xs">
                      {dept.maleCount} L &bull; {dept.femaleCount} P
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs">
                      {dept.avgAge} Thn
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button className="text-blue-400 group-hover:text-blue-300 inline-flex items-center gap-1 text-xs font-bold transition-all">
                        <span>Lihat List</span>
                        <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
