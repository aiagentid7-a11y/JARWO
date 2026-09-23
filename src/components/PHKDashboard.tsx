import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import { 
  ShieldAlert, Calculator, FileText, Download, Printer, Users, TrendingUp, AlertTriangle, 
  HelpCircle, CheckCircle, Calendar, Briefcase, Award, Check, RefreshCw, Sparkles, UserMinus, Plus
} from 'lucide-react';
import { parseWageToNumber } from '../dateUtils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Type definitions for PHK Dashboard
interface PHKDashboardProps {
  employees: Employee[];
  onUpdateEmployee?: (id: string, data: Partial<Employee>) => Promise<void>;
  onUploadSuccess?: () => void;
}

interface PHKReason {
  id: string;
  name: string;
  pesangonMultiplier: number;
  upmkMultiplier: number;
  description: string;
  legalBasis: string;
}

export default function PHKDashboard({ employees, onUpdateEmployee }: PHKDashboardProps) {
  // Standard PHK reasons under PP 35/2021
  const phkReasons: PHKReason[] = [
    {
      id: 'pensiun',
      name: 'Memasuki Usia Pensiun',
      pesangonMultiplier: 1.75,
      upmkMultiplier: 1,
      description: 'Pekerja memasuki usia pensiun sesuai kesepakatan atau aturan perusahaan.',
      legalBasis: 'Pasal 56 PP No. 35/2021'
    },
    {
      id: 'meninggal',
      name: 'Pekerja Meninggal Dunia',
      pesangonMultiplier: 2.0,
      upmkMultiplier: 1,
      description: 'Hubungan kerja berakhir demi hukum karena pekerja meninggal dunia.',
      legalBasis: 'Pasal 57 PP No. 35/2021'
    },
    {
      id: 'sakit_berkepanjangan',
      name: 'Sakit Berkepanjangan / Cacat Total (> 12 Bulan)',
      pesangonMultiplier: 2.0,
      upmkMultiplier: 1,
      description: 'Pekerja mengalami sakit berkepanjangan atau cacat akibat kecelakaan kerja setelah melampaui 12 bulan.',
      legalBasis: 'Pasal 55 PP No. 35/2021'
    },
    {
      id: 'efisiensi_rugi',
      name: 'Efisiensi karena Mengalami Kerugian',
      pesangonMultiplier: 0.5,
      upmkMultiplier: 1,
      description: 'Perusahaan melakukan efisiensi yang disebabkan karena mengalami kerugian keuangan berkelanjutan.',
      legalBasis: 'Pasal 43 ayat (1) PP No. 35/2021'
    },
    {
      id: 'efisiensi_cegah_rugi',
      name: 'Efisiensi untuk Mencegah Kerugian',
      pesangonMultiplier: 1.0,
      upmkMultiplier: 1,
      description: 'Perusahaan melakukan efisiensi dalam rangka melakukan penyelamatan operasional guna mencegah kerugian di masa depan.',
      legalBasis: 'Pasal 43 ayat (2) PP No. 35/2021'
    },
    {
      id: 'tutup_rugi',
      name: 'Perusahaan Tutup karena Kerugian Berkelanjutan',
      pesangonMultiplier: 0.5,
      upmkMultiplier: 1,
      description: 'Perusahaan tutup dikarenakan mengalami kerugian terus menerus selama 2 tahun berturut-turut.',
      legalBasis: 'Pasal 44 ayat (1) PP No. 35/2021'
    },
    {
      id: 'tutup_bukan_rugi',
      name: 'Perusahaan Tutup bukan karena Rugi (Restrukturisasi)',
      pesangonMultiplier: 1.0,
      upmkMultiplier: 1,
      description: 'Perusahaan melakukan penutupan operasional secara sukarela, bukan karena rugi (misal reorganisasi bisnis).',
      legalBasis: 'Pasal 44 ayat (2) PP No. 35/2021'
    },
    {
      id: 'peleburan_pekerja_tolak',
      name: 'Penggabungan/Peleburan (Pekerja Menolak Lanjut)',
      pesangonMultiplier: 0.5,
      upmkMultiplier: 1,
      description: 'Terjadi peleburan/reorganisasi perusahaan, dan pekerja menyatakan tidak bersedia melanjutkan hubungan kerja.',
      legalBasis: 'Pasal 41 PP No. 35/2021'
    },
    {
      id: 'peleburan_pengusaha_tolak',
      name: 'Penggabungan/Peleburan (Pengusaha Menolak Lanjut)',
      pesangonMultiplier: 1.0,
      upmkMultiplier: 1,
      description: 'Terjadi merger/akuisisi, dan manajemen baru menyatakan tidak bersedia melanjutkan hubungan kerja dengan pekerja.',
      legalBasis: 'Pasal 41 PP No. 35/2021'
    },
    {
      id: 'pailit',
      name: 'Perusahaan Pailit / Likuidasi',
      pesangonMultiplier: 0.5,
      upmkMultiplier: 1,
      description: 'Hubungan kerja berakhir dikarenakan perusahaan dinyatakan pailit berdasarkan keputusan pengadilan niaga.',
      legalBasis: 'Pasal 47 PP No. 35/2021'
    },
    {
      id: 'force_majeure_tutup',
      name: 'Force Majeure (Tutup Perusahaan)',
      pesangonMultiplier: 0.5,
      upmkMultiplier: 1,
      description: 'Terjadi bencana atau kondisi luar biasa (force majeure) yang menyebabkan perusahaan ditutup selamanya.',
      legalBasis: 'Pasal 45 ayat (1) PP No. 35/2021'
    },
    {
      id: 'force_majeure_tidak_tutup',
      name: 'Force Majeure (Tidak Tutup Perusahaan)',
      pesangonMultiplier: 0.75,
      upmkMultiplier: 1,
      description: 'Terjadi force majeure namun perusahaan tidak sampai melakukan penutupan operasional.',
      legalBasis: 'Pasal 45 ayat (2) PP No. 35/2021'
    },
    {
      id: 'pelanggaran_sp',
      name: 'Pelanggaran Disiplin Kerja (Setelah SP 1, 2, atau 3)',
      pesangonMultiplier: 0.5,
      upmkMultiplier: 1,
      description: 'Pekerja melakukan pelanggaran ketentuan kerja setelah sebelumnya diberikan Surat Peringatan secara patut.',
      legalBasis: 'Pasal 52 ayat (1) PP No. 35/2021'
    },
    {
      id: 'resign',
      name: 'Mengundurkan Diri Sukarela (Resign)',
      pesangonMultiplier: 0.0,
      upmkMultiplier: 0,
      description: 'Pekerja mengajukan permohonan pengunduran diri secara sukarela atas kemauan sendiri.',
      legalBasis: 'Pasal 50 PP No. 35/2021'
    },
    {
      id: 'mangkir_kualifikasi',
      name: 'Mangkir Kerja 5 Hari Beruntun (Kualifikasi Resign)',
      pesangonMultiplier: 0.0,
      upmkMultiplier: 0,
      description: 'Pekerja tidak masuk kerja selama 5 hari kerja atau lebih berturut-turut tanpa keterangan tertulis dan dipanggil 2x secara patut.',
      legalBasis: 'Pasal 51 PP No. 35/2021'
    }
  ];

  // Core States
  const [activeMode, setActiveMode] = useState<'kalkulator' | 'simulasi'>('kalkulator');
  
  // Kalkulator States
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [manualName, setManualName] = useState('Budi Santoso');
  const [manualStartDate, setManualStartDate] = useState('2020-01-15');
  const [manualEndDate, setManualEndDate] = useState('2026-07-17');
  const [manualWage, setManualWage] = useState('7500000');
  const [manualLeaveRemaining, setManualLeaveRemaining] = useState('8');
  const [selectedReasonId, setSelectedReasonId] = useState('pensiun');
  const [customMultiplierPesangon, setCustomMultiplierPesangon] = useState<number | null>(null);
  const [customMultiplierUpmk, setCustomMultiplierUpmk] = useState<number | null>(null);
  
  // Additional Rights & Policy Custom Values
  const [useHousingMedicalAllowance, setUseHousingMedicalAllowance] = useState(false); // Old UU 13/2003 15% rule (often still kept in company regulations)
  const [repatriationAllowance, setRepatriationAllowance] = useState('0');
  const [customUangPisah, setCustomUangPisah] = useState('0');
  const [otherRights, setOtherRights] = useState('0');
  const [notes, setNotes] = useState('');

  // Bulk Simulasi States
  const [simDept, setSimDept] = useState('all');
  const [simReasonId, setSimReasonId] = useState('efisiensi_rugi');
  const [simSelectedEmpIds, setSimSelectedEmpIds] = useState<string[]>([]);

  // Find selected employee object
  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || null;
  }, [selectedEmpId, employees]);

  // Sync state when employee dropdown changes
  const handleEmployeeChange = (id: string) => {
    setSelectedEmpId(id);
    if (id) {
      const emp = employees.find(e => e.id === id);
      if (emp) {
        setManualName(emp.name);
        
        // Normalize and parse date
        let finalDate = '2020-01-15';
        if (emp.startDate && emp.startDate !== '-') {
          const rawStr = String(emp.startDate).trim();
          const norm = rawStr
            .replace(/Okt/i, 'Oct')
            .replace(/Des/i, 'Dec')
            .replace(/Mei/i, 'May')
            .replace(/Agu/i, 'Aug');
          const d = new Date(norm);
          if (!isNaN(d.getTime())) {
            finalDate = d.toISOString().split('T')[0];
          } else {
            // Split by dashes if standard DD-MM-YYYY
            const parts = rawStr.split('-');
            if (parts.length === 3) {
              const monthsMap: Record<string, string> = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'Mei': '05', 'Jun': '06',
                'Jul': '07', 'Agu': '08', 'Sep': '09', 'Okt': '10', 'Nov': '11', 'Des': '12',
                'Oct': '10', 'Dec': '12', 'May': '05', 'Aug': '08'
              };
              const month = monthsMap[parts[1]] || '01';
              const day = parts[0].padStart(2, '0');
              let year = parts[2];
              if (year.length === 2) year = `20${year}`;
              finalDate = `${year}-${month}-${day}`;
            }
          }
        }
        setManualStartDate(finalDate);
        
        // Get end date default to today
        const today = new Date().toISOString().split('T')[0];
        setManualEndDate(today);

        // Wage parsing
        const wageNum = parseWageToNumber(emp.wage) || 0;
        setManualWage(wageNum > 0 ? String(wageNum) : '');

        // Leave remaining
        const leaves = emp.leaveRemaining !== undefined ? String(emp.leaveRemaining) : '12';
        setManualLeaveRemaining(leaves);
      }
    }
  };

  // Extract unique departments list
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // PHK Calculations core function
  const calculatePHKDetails = (
    startDateStr: string,
    endDateStr: string,
    monthlyWage: number,
    leaveRemainingCount: number,
    reasonId: string,
    multiplierPesangonOverride: number | null = null,
    multiplierUpmkOverride: number | null = null,
    includeHousingMedical: boolean = false,
    repatriation: number = 0,
    pisah: number = 0,
    others: number = 0
  ) => {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    
    let yearsOfService = 0;
    let monthsOfService = 0;
    
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      let diffYears = end.getFullYear() - start.getFullYear();
      let diffMonths = end.getMonth() - start.getMonth();
      let diffDays = end.getDate() - start.getDate();
      
      if (diffDays < 0) {
        diffMonths--;
      }
      if (diffMonths < 0) {
        diffYears--;
        diffMonths += 12;
      }
      yearsOfService = diffYears;
      monthsOfService = diffMonths;
    }

    const totalYearsDecimal = yearsOfService + (monthsOfService / 12);
    
    // 1. Calculate Standard Severance Month Rate (Pesangon Standar)
    let standardPesangonMonths = 1;
    if (totalYearsDecimal < 1) standardPesangonMonths = 1;
    else if (totalYearsDecimal < 2) standardPesangonMonths = 2;
    else if (totalYearsDecimal < 3) standardPesangonMonths = 3;
    else if (totalYearsDecimal < 4) standardPesangonMonths = 4;
    else if (totalYearsDecimal < 5) standardPesangonMonths = 5;
    else if (totalYearsDecimal < 6) standardPesangonMonths = 6;
    else if (totalYearsDecimal < 7) standardPesangonMonths = 7;
    else if (totalYearsDecimal < 8) standardPesangonMonths = 8;
    else standardPesangonMonths = 9;

    // 2. Calculate Standard UPMK Month Rate (Uang Penghargaan Masa Kerja)
    let standardUpmkMonths = 0;
    if (totalYearsDecimal >= 24) standardUpmkMonths = 10;
    else if (totalYearsDecimal >= 21) standardUpmkMonths = 8;
    else if (totalYearsDecimal >= 18) standardUpmkMonths = 7;
    else if (totalYearsDecimal >= 15) standardUpmkMonths = 6;
    else if (totalYearsDecimal >= 12) standardUpmkMonths = 5;
    else if (totalYearsDecimal >= 9) standardUpmkMonths = 4;
    else if (totalYearsDecimal >= 6) standardUpmkMonths = 3;
    else if (totalYearsDecimal >= 3) standardUpmkMonths = 2;
    else standardUpmkMonths = 0;

    // 3. Apply Multipliers from selected reason
    const activeReason = phkReasons.find(r => r.id === reasonId) || phkReasons[0];
    const pesangonMult = multiplierPesangonOverride !== null ? multiplierPesangonOverride : activeReason.pesangonMultiplier;
    const upmkMult = multiplierUpmkOverride !== null ? multiplierUpmkOverride : activeReason.upmkMultiplier;

    const basePesangonTotal = standardPesangonMonths * monthlyWage;
    const finalPesangonTotal = basePesangonTotal * pesangonMult;

    const baseUpmkTotal = standardUpmkMonths * monthlyWage;
    const finalUpmkTotal = baseUpmkTotal * upmkMult;

    // 4. Calculate UPH (Uang Penggantian Hak)
    // Remaining Leaves compensation: (Remaining Leaves / 21 working days) * Upah (standard calculation in Indonesian HR practices)
    const leaveCompensation = Math.max(0, leaveRemainingCount) * (monthlyWage / 21);
    
    // Housing & Medical allowance under old UU 13/2003 was 15% of total (Severance + UPMK)
    const medicalHousingAllowance = includeHousingMedical ? 0.15 * (finalPesangonTotal + finalUpmkTotal) : 0;
    
    const finalUphTotal = leaveCompensation + medicalHousingAllowance + repatriation + others;

    // 5. Total PHK Package
    const totalPHK = finalPesangonTotal + finalUpmkTotal + finalUphTotal + pisah;

    return {
      years: yearsOfService,
      months: monthsOfService,
      totalYearsDecimal,
      standardPesangonMonths,
      standardUpmkMonths,
      pesangonMultiplier: pesangonMult,
      upmkMultiplier: upmkMult,
      basePesangonTotal,
      finalPesangonTotal,
      baseUpmkTotal,
      finalUpmkTotal,
      leaveCompensation,
      medicalHousingAllowance,
      finalUphTotal,
      pisahValue: pisah,
      repatriationValue: repatriation,
      othersValue: others,
      totalPHK,
      reasonName: activeReason.name,
      reasonBasis: activeReason.legalBasis
    };
  };

  // Computed results for active calculation in Kalkulator Mode
  const calResults = useMemo(() => {
    const monthlyWageNum = parseFloat(manualWage) || 0;
    const leavesNum = parseFloat(manualLeaveRemaining) || 0;
    const repatriationNum = parseFloat(repatriationAllowance) || 0;
    const pisahNum = parseFloat(customUangPisah) || 0;
    const othersNum = parseFloat(otherRights) || 0;

    return calculatePHKDetails(
      manualStartDate,
      manualEndDate,
      monthlyWageNum,
      leavesNum,
      selectedReasonId,
      customMultiplierPesangon,
      customMultiplierUpmk,
      useHousingMedicalAllowance,
      repatriationNum,
      pisahNum,
      othersNum
    );
  }, [
    manualStartDate, manualEndDate, manualWage, manualLeaveRemaining, selectedReasonId,
    customMultiplierPesangon, customMultiplierUpmk, useHousingMedicalAllowance,
    repatriationAllowance, customUangPisah, otherRights
  ]);

  // Bulk Simulation employees matching filters
  const simEmployeesList = useMemo(() => {
    return employees.filter(emp => {
      // Must be permanent (PKWTT) usually, but we can simulate any selected employee
      if (simDept !== 'all' && emp.department !== simDept) return false;
      return true;
    });
  }, [employees, simDept]);

  // Auto select all simulated employees on first view or department change
  React.useEffect(() => {
    setSimSelectedEmpIds(simEmployeesList.map(e => e.id));
  }, [simEmployeesList]);

  // Compute overall statistics for simulation mode
  const simulationSummary = useMemo(() => {
    let totalLiability = 0;
    const items = simSelectedEmpIds.map(id => {
      const emp = employees.find(e => e.id === id);
      if (!emp) return null;
      
      const wageNum = parseWageToNumber(emp.wage) || 0;
      
      // Determine start date
      let dateStr = '2020-01-15';
      if (emp.startDate && emp.startDate !== '-') {
        const rawStr = String(emp.startDate).trim();
        const norm = rawStr
          .replace(/Okt/i, 'Oct')
          .replace(/Des/i, 'Dec')
          .replace(/Mei/i, 'May')
          .replace(/Agu/i, 'Aug');
        const d = new Date(norm);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().split('T')[0];
        }
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const leavesNum = emp.leaveRemaining !== undefined ? emp.leaveRemaining : 12;

      const calc = calculatePHKDetails(
        dateStr,
        todayStr,
        wageNum,
        leavesNum,
        simReasonId,
        null,
        null,
        false,
        0,
        0,
        0
      );

      totalLiability += calc.totalPHK;

      return {
        id: emp.id,
        name: emp.name,
        position: emp.position,
        department: emp.department,
        wage: wageNum,
        tenureYears: calc.years + (calc.months / 12),
        tenureText: `${calc.years} Thn ${calc.months} Bln`,
        pesangon: calc.finalPesangonTotal,
        upmk: calc.finalUpmkTotal,
        uph: calc.finalUphTotal,
        total: calc.totalPHK
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      items,
      totalLiability,
      averagePayout: items.length ? totalLiability / items.length : 0,
      count: items.length
    };
  }, [simSelectedEmpIds, employees, simReasonId]);

  // Toggle individual selection in Simulasi
  const handleToggleSimEmployee = (id: string) => {
    setSimSelectedEmpIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllSimEmployees = () => {
    if (simSelectedEmpIds.length === simEmployeesList.length) {
      setSimSelectedEmpIds([]);
    } else {
      setSimSelectedEmpIds(simEmployeesList.map(e => e.id));
    }
  };

  // PDF Download Generator using jsPDF and AutoTable
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Background accent
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 40, 'F');

      // Title & Header Text in Slate Banner
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('ONE FOR ALL', 15, 15);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('SUTRA SITE - LAPORAN RESMI PERHITUNGAN PHK (PP No. 35/2021)', 15, 22);
      
      // Date generated right aligned
      const today = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      doc.setFontSize(8);
      doc.text(`Dicetak: ${today}`, 195, 15, { align: 'right' });

      // Body parameters
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMASI KARYAWAN & ALASAN PHK', 15, 52);

      // Divider line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(15, 55, 195, 55);

      // Metadata layout
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Nama Karyawan:', 15, 62);
      doc.setFont('helvetica', 'normal');
      doc.text(manualName, 50, 62);

      doc.setFont('helvetica', 'bold');
      doc.text('Mulai Kerja:', 15, 68);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(manualStartDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), 50, 68);

      doc.setFont('helvetica', 'bold');
      doc.text('Tanggal PHK:', 15, 74);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(manualEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), 50, 74);

      doc.setFont('helvetica', 'bold');
      doc.text('Masa Kerja:', 15, 80);
      doc.setFont('helvetica', 'normal');
      doc.text(`${calResults.years} Tahun ${calResults.months} Bulan (Desimal: ${calResults.totalYearsDecimal.toFixed(2)} Thn)`, 50, 80);

      // Second column in metadata
      doc.setFont('helvetica', 'bold');
      doc.text('Gaji Dasar Bulanan:', 110, 62);
      doc.setFont('helvetica', 'normal');
      doc.text(`Rp ${parseFloat(manualWage).toLocaleString('id-ID')}`, 145, 62);

      doc.setFont('helvetica', 'bold');
      doc.text('Alasan PHK:', 110, 68);
      doc.setFont('helvetica', 'normal');
      doc.text(calResults.reasonName, 145, 68, { maxWidth: 50 });

      doc.setFont('helvetica', 'bold');
      doc.text('Dasar Hukum:', 110, 78);
      doc.setFont('helvetica', 'normal');
      doc.text(calResults.reasonBasis, 145, 78);

      // Calculation breakdown table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('RINCIAN HAK PEMBAYARAN KARYAWAN', 15, 93);
      doc.line(15, 96, 195, 96);

      const tableData = [
        [
          '1. Uang Pesangon',
          `${calResults.standardPesangonMonths} Bulan Upah x ${calResults.pesangonMultiplier} (Multiplier)`,
          `Rp ${calResults.finalPesangonTotal.toLocaleString('id-ID')}`
        ],
        [
          '2. Uang Penghargaan Masa Kerja (UPMK)',
          `${calResults.standardUpmkMonths} Bulan Upah x ${calResults.upmkMultiplier} (Multiplier)`,
          `Rp ${calResults.finalUpmkTotal.toLocaleString('id-ID')}`
        ],
        [
          '3. Uang Penggantian Hak (UPH)',
          `Sisa Cuti (${manualLeaveRemaining} Hari) & Fasilitas Lainnya`,
          `Rp ${calResults.finalUphTotal.toLocaleString('id-ID')}`
        ],
        [
          '4. Uang Pisah / Kompensasi Kebijakan',
          'Sesuai Aturan Perusahaan (PP / PKB)',
          `Rp ${calResults.pisahValue.toLocaleString('id-ID')}`
        ],
        [
          'TOTAL HAK PHK DITERIMA (KOTOR)',
          'Sebelum Pemotongan Pajak PPh 21 Pesangon',
          `Rp ${calResults.totalPHK.toLocaleString('id-ID')}`
        ]
      ];

      (doc as any).autoTable({
        startY: 100,
        head: [['Komponen Kompensasi', 'Keterangan & Dasar Formula', 'Jumlah Nominal']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // indigo-600
        columnStyles: {
          2: { halign: 'right', fontStyle: 'bold' }
        },
        styles: { fontSize: 9 },
        margin: { left: 15, right: 15 }
      });

      // Signature & Stamp Block
      const finalY = (doc as any).lastAutoTable.previous.startY + 65;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Mengetahui & Menyetujui,', 15, finalY);
      doc.text('Pekerja yang Bersangkutan,', 135, finalY);

      doc.setDrawColor(200, 200, 200);
      doc.line(15, finalY + 22, 65, finalY + 22);
      doc.line(135, finalY + 22, 185, finalY + 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('HRD One For All', 15, finalY + 26);
      doc.text(manualName, 135, finalY + 26);

      // Save document
      doc.save(`Kompensasi_PHK_${manualName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal menghasilkan file PDF.');
    }
  };

  // Direct print slip trigger
  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="phk-dashboard-root">
      
      {/* 1. PROFESSIONAL HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-sm" id="phk-header">
        <div className="absolute right-0 top-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-red-500 animate-pulse" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Layanan Perhitungan Kompensasi PHK</h2>
          </div>
          <h1 className="text-2xl font-black text-white font-heading tracking-tight">Kalkulator Pesangon PP No. 35 Tahun 2021</h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Hitung hak pesangon, penghargaan masa kerja (UPMK), uang penggantian hak (UPH), dan uang pisah sesuai peraturan pelaksana UU Cipta Kerja RI yang sah.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveMode('kalkulator')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'kalkulator' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Kalkulator Individu</span>
          </button>
          <button
            onClick={() => setActiveMode('simulasi')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeMode === 'simulasi' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Simulasi Restrukturisasi</span>
          </button>
        </div>
      </div>

      {activeMode === 'kalkulator' ? (
        /* ==================== INDIVIDUAL CALCULATOR MODE ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="phk-calculator-container">
          
          {/* Left Panel: Form Input parameters (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-red-400" />
                <span>Parameter Karyawan</span>
              </h3>

              {/* Selection dropdown */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Pilih Karyawan Aktif (Opsional)</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-red-500 font-medium cursor-pointer"
                >
                  <option value="">-- Manual Input / Custom Data --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.position} - {emp.department})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Pilih dari database untuk meload data Gaji Pokok &amp; Sisa Cuti secara otomatis.</p>
              </div>

              {/* Editable Name & Hire details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Nama Pekerja</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-red-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Upah Pokok + Tunj. Tetap (Rp)</label>
                  <input
                    type="number"
                    value={manualWage}
                    onChange={(e) => setManualWage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono font-bold focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Tanggal Mulai Kerja</label>
                  <input
                    type="date"
                    value={manualStartDate}
                    onChange={(e) => setManualStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Tanggal PHK</label>
                  <input
                    type="date"
                    value={manualEndDate}
                    onChange={(e) => setManualEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              {/* Leave Remaining */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Sisa Cuti Tahunan yang Belum Gugur (Hari)</label>
                <input
                  type="number"
                  value={manualLeaveRemaining}
                  onChange={(e) => setManualLeaveRemaining(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Legal PHK Reason dropdown */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Alasan Pengakhiran Kerja (PP 35/2021)</label>
                <select
                  value={selectedReasonId}
                  onChange={(e) => {
                    setSelectedReasonId(e.target.value);
                    // Reset multipliers when switching reasons
                    setCustomMultiplierPesangon(null);
                    setCustomMultiplierUpmk(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-red-500 font-semibold cursor-pointer"
                >
                  {phkReasons.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] bg-red-500/15 text-red-400 font-bold px-1.5 py-0.5 rounded border border-red-500/10">
                      {phkReasons.find(r => r.id === selectedReasonId)?.legalBasis}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Multiplier Pesangon: <strong className="text-red-400">{phkReasons.find(r => r.id === selectedReasonId)?.pesangonMultiplier}x</strong>
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-relaxed mt-1.5">
                    {phkReasons.find(r => r.id === selectedReasonId)?.description}
                  </p>
                </div>
              </div>

              {/* Multiplier Overrides & Toggle (Advanced settings) */}
              <div className="border-t border-slate-800/60 pt-4 space-y-3.5">
                <div className="text-[10.5px] font-bold text-slate-300">Penyesuaian Manual Koefisien (Aturan Khusus)</div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[9.5px] text-slate-500 font-bold block uppercase mb-1">Koef. Pesangon</label>
                    <input
                      type="number"
                      step="0.05"
                      placeholder={`${phkReasons.find(r => r.id === selectedReasonId)?.pesangonMultiplier}x (Auto)`}
                      value={customMultiplierPesangon !== null ? customMultiplierPesangon : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                        setCustomMultiplierPesangon(val);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] text-slate-500 font-bold block uppercase mb-1">Koef. UPMK</label>
                    <input
                      type="number"
                      step="0.05"
                      placeholder={`${phkReasons.find(r => r.id === selectedReasonId)?.upmkMultiplier}x (Auto)`}
                      value={customMultiplierUpmk !== null ? customMultiplierUpmk : ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                        setCustomMultiplierUpmk(val);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Inputs (Uang pisah, repatriation, etc) */}
              <div className="border-t border-slate-800/60 pt-4 space-y-3">
                <div className="text-[10.5px] font-bold text-slate-300">Kompensasi Lainnya &amp; Aturan Khusus Perusahaan</div>
                
                {/* Uang Pisah (for Resign or general cases) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9.5px] text-slate-500 font-bold block uppercase mb-1" title="Sesuai Perjanjian Kerja / PP / PKB">Uang Pisah (Rp)</label>
                    <input
                      type="number"
                      value={customUangPisah}
                      onChange={(e) => setCustomUangPisah(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] text-slate-500 font-bold block uppercase mb-1">Hak Lainnya / Ongkos (Rp)</label>
                    <input
                      type="number"
                      value={otherRights}
                      onChange={(e) => setOtherRights(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Old school Housing/Medical 15% allowance checkbox */}
                <label className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-850 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useHousingMedicalAllowance}
                    onChange={(e) => setUseHousingMedicalAllowance(e.target.checked)}
                    className="mt-0.5 border-slate-800 text-red-600 focus:ring-red-500 rounded"
                  />
                  <div>
                    <span className="text-[10.5px] text-slate-300 font-bold block">Tambahkan Uang Perumahan &amp; Pengobatan (15%)</span>
                    <span className="text-[9.5px] text-slate-500 leading-normal block">Aturan Opsional UU 13/2003: Tambahan kompensasi sebesar 15% dari total Pesangon + UPMK.</span>
                  </div>
                </label>
              </div>

            </div>
          </div>

          {/* Right Panel: Live Receipt and Breakdown (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Live Calculation Bill / Slip */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden shadow-xl" id="phk-calculation-slip">
              
              {/* Slip Header watermark */}
              <div className="absolute right-4 top-4 opacity-10">
                <FileText className="w-40 h-40 text-red-500" />
              </div>

              {/* Slip Content block */}
              <div className="p-6 md:p-8 space-y-6">
                
                {/* Internal brand header */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 font-mono font-bold px-2 py-0.5 rounded uppercase">PP 35/2021 Compliant</span>
                    <h2 className="text-lg font-black text-white font-heading mt-1">{manualName}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Masa Kerja: <strong className="text-slate-200 font-bold">{calResults.years} Tahun {calResults.months} Bulan</strong></p>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-slate-500 font-bold uppercase">Tanggal Cetak</div>
                    <div className="text-xs text-slate-300 font-semibold font-mono">{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* Primary Huge Number display */}
                <div className="text-center bg-slate-950 border border-slate-850 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute left-0 top-0 w-full h-1.5 bg-red-500" />
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Pembayaran Kompensasi PHK</div>
                  <div className="text-3xl md:text-4xl font-black text-white font-mono mt-1.5" id="phk-total-payout-text">
                    Rp {calResults.totalPHK.toLocaleString('id-ID')}
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed mt-2 italic font-semibold">
                    *Kotor belum dipotong PPh 21 tarif progresif uang pesangon (jika di atas Rp 50 Juta)
                  </p>
                </div>

                {/* Components Detailed Breakdown */}
                <div className="space-y-4">
                  <div className="text-xs font-black text-slate-200 uppercase tracking-wider">Metode &amp; Komponen Penghitungan</div>

                  <div className="divide-y divide-slate-850 border-t border-b border-slate-850">
                    
                    {/* Item 1: Pesangon */}
                    <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-xs font-bold text-slate-200">1. Uang Pesangon (UP)</span>
                        </div>
                        <div className="text-[10.5px] text-slate-400">
                          Formula: {calResults.standardPesangonMonths} Bulan Upah x {calResults.pesangonMultiplier} (Multiplier)
                        </div>
                        <div className="text-[9.5px] text-slate-500 font-medium">
                          Dasar: {calResults.standardPesangonMonths} Bln x Rp {parseFloat(manualWage).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-slate-200">Rp {calResults.finalPesangonTotal.toLocaleString('id-ID')}</div>
                      </div>
                    </div>

                    {/* Item 2: UPMK */}
                    <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-xs font-bold text-slate-200">2. Penghargaan Masa Kerja (UPMK)</span>
                        </div>
                        <div className="text-[10.5px] text-slate-400">
                          Formula: {calResults.standardUpmkMonths} Bulan Upah x {calResults.upmkMultiplier} (Multiplier)
                        </div>
                        <div className="text-[9.5px] text-slate-500 font-medium">
                          Dasar: {calResults.standardUpmkMonths} Bln x Rp {parseFloat(manualWage).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-slate-200">Rp {calResults.finalUpmkTotal.toLocaleString('id-ID')}</div>
                      </div>
                    </div>

                    {/* Item 3: UPH */}
                    <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-xs font-bold text-slate-200">3. Uang Penggantian Hak (UPH)</span>
                        </div>
                        <div className="text-[10.5px] text-slate-400">
                          Sisa Cuti: ({manualLeaveRemaining} Hari / 21 Hari) x Gaji = Rp {Math.round(calResults.leaveCompensation).toLocaleString('id-ID')}
                        </div>
                        {useHousingMedicalAllowance && (
                          <div className="text-[9.5px] text-emerald-400 font-bold block">
                            + Tunj. Perumahan &amp; Medis (15%): Rp {Math.round(calResults.medicalHousingAllowance).toLocaleString('id-ID')}
                          </div>
                        )}
                        {(parseFloat(repatriationAllowance) > 0 || parseFloat(otherRights) > 0) && (
                          <div className="text-[9.5px] text-slate-500 font-medium">
                            + Ongkos Kepulangan / Lainnya: Rp {(parseFloat(repatriationAllowance) + parseFloat(otherRights)).toLocaleString('id-ID')}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-slate-200">Rp {calResults.finalUphTotal.toLocaleString('id-ID')}</div>
                      </div>
                    </div>

                    {/* Item 4: Uang Pisah / Custom */}
                    {parseFloat(customUangPisah) > 0 && (
                      <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-teal-500" />
                            <span className="text-xs font-bold text-slate-200">4. Uang Pisah / Aturan Perusahaan</span>
                          </div>
                          <div className="text-[10.5px] text-slate-400">
                            Pemberian sukarela atau diatur khusus dalam PP/PKB
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-bold text-slate-200">Rp {calResults.pisahValue.toLocaleString('id-ID')}</div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Tax bracket estimates PPh 21 Pesangon (Indonesian Rules) */}
                {/* 
                  PPh 21 Pesangon (Final):
                  - s.d 50 Juta: 0%
                  - di atas 50 Juta s.d 100 Juta: 5%
                  - di atas 100 Juta s.d 500 Juta: 15%
                  - di atas 500 Juta: 25%
                */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs">
                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-2">Estimasi Potongan Pajak (PPh Pasal 21 Uang Pesangon - Final)</div>
                  {(() => {
                    const total = calResults.totalPHK;
                    let pphTotal = 0;
                    let taxBreakdown = [];
                    
                    if (total > 50000000) {
                      // up to 50jt is 0%
                      // 50jt to 100jt is 5%
                      const layer1 = Math.min(total - 50000000, 50000000);
                      if (layer1 > 0) {
                        pphTotal += layer1 * 0.05;
                        taxBreakdown.push(`Layer 1 (5% x Rp ${layer1.toLocaleString('id-ID')}): Rp ${(layer1 * 0.05).toLocaleString('id-ID')}`);
                      }
                      
                      // 100jt to 500jt is 15%
                      const layer2 = Math.min(Math.max(total - 100000000, 0), 400000000);
                      if (layer2 > 0) {
                        pphTotal += layer2 * 0.15;
                        taxBreakdown.push(`Layer 2 (15% x Rp ${layer2.toLocaleString('id-ID')}): Rp ${(layer2 * 0.15).toLocaleString('id-ID')}`);
                      }
                      
                      // > 500jt is 25%
                      const layer3 = Math.max(total - 500000000, 0);
                      if (layer3 > 0) {
                        pphTotal += layer3 * 0.25;
                        taxBreakdown.push(`Layer 3 (25% x Rp ${layer3.toLocaleString('id-ID')}): Rp ${(layer3 * 0.25).toLocaleString('id-ID')}`);
                      }
                    }

                    return (
                      <div className="space-y-1.5 text-slate-400">
                        <div className="flex items-center justify-between text-xs">
                          <span>Dasar Tarif:</span>
                          <span className="font-bold">Progresif Final PP 68/2009</span>
                        </div>
                        {pphTotal > 0 ? (
                          <>
                            {taxBreakdown.map((txt, i) => (
                              <div key={i} className="text-[10px] text-slate-500 font-mono pl-3 flex justify-between">
                                <span>&bull; {txt.split(':')[0]}</span>
                                <span>{txt.split(':')[1]}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-900/60 font-bold text-red-400 text-xs">
                              <span>Estimasi Pajak PPh 21:</span>
                              <span className="font-mono">Rp {pphTotal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex items-center justify-between font-bold text-emerald-400 text-xs pt-0.5">
                              <span>Kompensasi Bersih (Net):</span>
                              <span className="font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs">
                                Rp {(total - pphTotal).toLocaleString('id-ID')}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-emerald-400 font-bold">
                            Rp 0,- (Bebas Pajak karena nominal total di bawah Rp 50.000.000)
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Print & Download actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-xs font-black text-white rounded-xl cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF Slip</span>
                  </button>
                  <button
                    onClick={handlePrintSlip}
                    className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white rounded-xl cursor-pointer transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Slip PHK</span>
                  </button>
                </div>

              </div>

            </div>
          </div>

        </div>
      ) : (
        /* ==================== BULK SIMULASI RESTRUCTURING MODE ==================== */
        <div className="space-y-6" id="phk-simulation-container">
          
          {/* Simulation setup card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-400 animate-spin" />
              <span>Simulasi Anggaran &amp; Restrukturisasi Departemen</span>
            </h3>
            <p className="text-xs text-slate-400">
              Gunakan simulasi ini untuk memproyeksikan total kewajiban pesangon jika perusahaan melakukan restrukturisasi di departemen tertentu dengan alasan legal PP 35/2021.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Department selection */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Pilih Departemen Target</label>
                <select
                  value={simDept}
                  onChange={(e) => setSimDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all">Semua Departemen ({employees.length} Karyawan)</option>
                  {departmentsList.map(d => (
                    <option key={d} value={d}>
                      {d} ({employees.filter(e => e.department === d).length} Karyawan)
                    </option>
                  ))}
                </select>
              </div>

              {/* Simulation reason */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Skenario Alasan PHK</label>
                <select
                  value={simReasonId}
                  onChange={(e) => setSimReasonId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                >
                  {phkReasons.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Info card */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 font-bold leading-none">Multiplier Terpilih</div>
                  <div className="text-xs text-white font-extrabold truncate mt-1">
                    Pesangon: <strong className="text-red-400 font-black">{phkReasons.find(r => r.id === simReasonId)?.pesangonMultiplier}x</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Simulation Analytics KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Total Budget card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl" />
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Estimasi Anggaran PHK</div>
              <div className="text-2xl font-black text-white font-mono mt-1.5">
                Rp {simulationSummary.totalLiability.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-500 mt-2 font-medium">Kewajiban pembayaran seluruh karyawan terpilih</div>
            </div>

            {/* Average Per Head card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl" />
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rata-rata Kompensasi / Karyawan</div>
              <div className="text-2xl font-black text-white font-mono mt-1.5">
                Rp {Math.round(simulationSummary.averagePayout).toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-500 mt-2 font-medium">Beban rata-rata per kepala</div>
            </div>

            {/* Employee Count Target card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl" />
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Karyawan Terpilih Untuk Simulasi</div>
              <div className="text-2xl font-black text-white font-mono mt-1.5">
                {simulationSummary.count} <span className="text-xs text-slate-500 font-medium">dari {simEmployeesList.length} orang</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 font-medium">Sifat alokasi fleksibel sesuai checkbox tabel</div>
            </div>

          </div>

          {/* Table of Simulated Employees */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-950/60 border-b border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-black text-slate-200 uppercase tracking-wider">Simulasi Kompensasi Individu</div>
              <div className="text-[10px] text-slate-500 font-bold">Tekan tombol checkbox untuk memasukkan/mengeluarkan karyawan dari komparasi anggaran.</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/40 border-b border-slate-850 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={simSelectedEmpIds.length === simEmployeesList.length && simEmployeesList.length > 0}
                        onChange={handleSelectAllSimEmployees}
                        className="rounded border-slate-800 text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Nama Pekerja</th>
                    <th className="py-3 px-3">Departemen</th>
                    <th className="py-3 px-3">Masa Kerja</th>
                    <th className="py-3 px-3 text-right">Upah Bulanan</th>
                    <th className="py-3 px-3 text-right">Pesangon (Final)</th>
                    <th className="py-3 px-3 text-right">UPMK (Final)</th>
                    <th className="py-3 px-3 text-right">UPH</th>
                    <th className="py-3 px-4 text-right">Total (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50 text-xs">
                  {simEmployeesList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-500 font-bold">
                        Tidak ada karyawan di departemen ini untuk disimulasikan.
                      </td>
                    </tr>
                  ) : (
                    simulationSummary.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-950/15 transition-colors group">
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={simSelectedEmpIds.includes(item.id)}
                            onChange={() => handleToggleSimEmployee(item.id)}
                            className="rounded border-slate-800 text-red-600 focus:ring-red-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-200 group-hover:text-red-400 transition-colors">{item.name}</div>
                          <div className="text-[10px] text-slate-500 font-medium">{item.position}</div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-400">
                          {item.department}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-medium text-slate-400">
                          {item.tenureText}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                          Rp {item.wage.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-red-400 font-bold">
                          Rp {item.pesangon.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-amber-500 font-bold">
                          Rp {item.upmk.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-blue-400">
                          Rp {item.uph.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-white group-hover:text-emerald-400 transition-colors">
                          Rp {item.total.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
