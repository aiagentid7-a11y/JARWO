import React, { useState, useMemo, useEffect } from 'react';
import { Employee } from '../types';
import { 
  Clock, DollarSign, Users, TrendingUp, Calendar, Search, Plus, 
  Check, X, FileText, Download, Briefcase, Percent, Award, AlertCircle,
  Calculator, Settings, Sliders, ShieldCheck
} from 'lucide-react';
import DataExchangeBar from './DataExchangeBar';
import SektorFormulas from './SektorFormulas';
import PP35Calculator, { calculatePP35Overtime, PP35WorkType } from './PP35Calculator';

interface OvertimeIncentiveDashboardProps {
  employees: Employee[];
  onUploadSuccess?: () => void;
  onUpdateEmployee?: (id: string, data: Partial<Employee>) => Promise<void>;
}

interface OvertimeLog {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  periodType?: 'daily' | 'weekly' | 'monthly';
  hours: number;
  ratePerHour: number;
  multiplier: number;
  reason: string;
  status: 'Pending' | 'Disetujui' | 'Ditolak';
}

interface IncentiveLog {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  type: 'Insentif Produksi' | 'Bonus Kerajinan' | 'Tunjangan Lapangan' | 'Bonus Khusus';
  amount: number;
  period: string;
  periodType?: 'daily' | 'weekly' | 'monthly';
  approvedBy: string;
  description: string;
  status: 'Dibayarkan' | 'Pending';
}

export default function OvertimeIncentiveDashboard({ employees, onUploadSuccess, onUpdateEmployee }: OvertimeIncentiveDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [activeTab, setActiveTab] = useState<'overtime' | 'incentive' | 'pp35' | 'formulas' | 'settings'>('overtime');
  const [appliedRecommendationIds, setAppliedRecommendationIds] = useState<string[]>([]);

  // --- Configurable Basic/Base Rates ---
  const [baseOtRateStandard, setBaseOtRateStandard] = useState(30000);
  const [baseOtRateG5G6, setBaseOtRateG5G6] = useState(40000);
  const [baseOtRateG8G9, setBaseOtRateG8G9] = useState(50000);
  const [baseOtMultiplier, setBaseOtMultiplier] = useState(2);

  const [baseIncentiveDefault, setBaseIncentiveDefault] = useState(1500000);
  const [attendancePerfectThreshold, setAttendancePerfectThreshold] = useState(98);
  const [attendancePerfectIncentive, setAttendancePerfectIncentive] = useState(750000);

  // --- Operational Sector Formula States ---
  const [sectorTab, setSectorTab] = useState<'rit_speed' | 'rit_lv' | 'drilling' | 'hm_alat' | 'ret_hino_suny'>('rit_speed');
  
  // 1. Rit Speed State (Kru Kapal)
  const [ritSpeedEmpId, setRitSpeedEmpId] = useState('');
  const [ritSpeedData, setRitSpeedData] = useState({
    tapuhaka_atas: 0, tapuhaka_bawah: 0,
    kokoe_atas: 0, kokoe_bawah: 0,
    mawasangka_atas: 0, mawasangka_bawah: 0,
    telaga_atas: 0, telaga_bawah: 0,
    pununu_atas: 0, pununu_bawah: 0,
    ponkalero_atas: 0, ponkalero_bawah: 0,
    batu_awu_atas: 0, batu_awu_bawah: 0,
    lembur: 0,
    hariRaya: 0,
  });

  // 2. Rit LV KDI State (Driver LV)
  const [ritLvEmpId, setRitLvEmpId] = useState('');
  const [ritLvData, setRitLvData] = useState({
    bombana: 0,
    asera: 0,
    torobulu: 0,
  });

  // 3. Drilling State (Bor & Moving)
  const [drillEmpId, setDrillEmpId] = useState('');
  const [drillData, setDrillData] = useState({
    meterBor: 0,
    rateBor: 3000,
    meterMoving: 0,
    rateMoving: 3500,
    productionCoeff: 0.2,
    productionVolume: 0,
    lembur: 0,
  });

  // 4. HM Alat Berat State (Operator HM)
  const [hmEmpId, setHmEmpId] = useState('');
  const [hmData, setHmData] = useState({
    activityType: 'produksi' as 'produksi' | 'pengapalan' | 'breaker',
    regHours: 8,
    otHours: 0,
  });

  // 5. Ret Hino & Suny State (Driver Dump Truck)
  const [retEmpId, setRetEmpId] = useState('');
  const [retData, setRetData] = useState({
    unitType: 'hino' as 'hino' | 'suny',
    distance: '1km' as '1km' | '2km' | '3km',
    regRits: 0,
    otRits: 0,
  });

  // --- Period Filter States ---
  const [otPeriodFilter, setOtPeriodFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [incPeriodFilter, setIncPeriodFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');

  // --- Overtime Request States ---
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [otInputPeriodType, setOtInputPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [newOtEmpId, setNewOtEmpId] = useState('');
  const [newOtHours, setNewOtHours] = useState(3);
  const [newOtDate, setNewOtDate] = useState(new Date().toISOString().split('T')[0]);
  const [newOtWeekLabel, setNewOtWeekLabel] = useState('Minggu ke-3 (15 - 21 Juli 2026)');
  const [newOtMonthLabel, setNewOtMonthLabel] = useState('Juli 2026');
  const [newOtReason, setNewOtReason] = useState('');
  const [usePP35Mode, setUsePP35Mode] = useState(true);
  const [otWorkType, setOtWorkType] = useState<PP35WorkType>('workday');

  // --- Incentive Request States ---
  const [showIncentiveModal, setShowIncentiveModal] = useState(false);
  const [incInputPeriodType, setIncInputPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [newIncEmpId, setNewIncEmpId] = useState('');
  const [newIncType, setNewIncType] = useState<'Insentif Produksi' | 'Bonus Kerajinan' | 'Tunjangan Lapangan' | 'Bonus Khusus'>('Insentif Produksi');
  const [newIncAmount, setNewIncAmount] = useState(1500000);
  const [newIncDate, setNewIncDate] = useState(new Date().toISOString().split('T')[0]);
  const [newIncWeekLabel, setNewIncWeekLabel] = useState('Minggu ke-3 Juli 2026');
  const [newIncMonthLabel, setNewIncMonthLabel] = useState('Juli 2026');
  const [newIncDesc, setNewIncDesc] = useState('');

  // --- Overtime Logs State with LocalStorage Persistence ---
  const [overtimeLogs, setOvertimeLogs] = useState<OvertimeLog[]>(() => {
    try {
      const saved = localStorage.getItem('overtime_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // --- Incentive Logs State with LocalStorage Persistence ---
  const [incentiveLogs, setIncentiveLogs] = useState<IncentiveLog[]>(() => {
    try {
      const saved = localStorage.getItem('incentive_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('overtime_logs', JSON.stringify(overtimeLogs));
    } catch (e) {
      console.error(e);
    }
  }, [overtimeLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('incentive_logs', JSON.stringify(incentiveLogs));
    } catch (e) {
      console.error(e);
    }
  }, [incentiveLogs]);

  // Get departments from current employees list
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts);
  }, [employees]);

  // Overtime Statistics
  const overtimeStats = useMemo(() => {
    let totalHours = 0;
    let approvedHours = 0;
    let totalCost = 0;

    overtimeLogs.forEach(log => {
      totalHours += log.hours;
      if (log.status === 'Disetujui') {
        approvedHours += log.hours;
        totalCost += (log.hours * log.ratePerHour * log.multiplier);
      }
    });

    return {
      totalHours,
      approvedHours,
      totalCost,
      pendingCount: overtimeLogs.filter(l => l.status === 'Pending').length
    };
  }, [overtimeLogs]);

  // Incentive Statistics
  const incentiveStats = useMemo(() => {
    let totalDistributed = 0;
    let pendingDistributed = 0;

    incentiveLogs.forEach(log => {
      if (log.status === 'Dibayarkan') {
        totalDistributed += log.amount;
      } else {
        pendingDistributed += log.amount;
      }
    });

    return {
      totalDistributed,
      pendingDistributed,
      totalIncentivesPaidCount: incentiveLogs.filter(l => l.status === 'Dibayarkan').length
    };
  }, [incentiveLogs]);

  // --- Attendance Auto-Analysis & Recommendation System ---
  const analyticalRecommendations = useMemo(() => {
    const recommendations: {
      id: string;
      employeeId: string;
      employeeName: string;
      department: string;
      reasonType: 'attendance_perfect';
      triggerDetail: string;
      proposedType: 'Insentif Produksi' | 'Bonus Kerajinan' | 'Tunjangan Lapangan' | 'Bonus Khusus';
      proposedAmount: number;
      description: string;
    }[] = [];

    employees.forEach(emp => {
      // Check Attendance Perfect
      if (emp.attendanceRate && emp.attendanceRate >= attendancePerfectThreshold && (!emp.daysAbsent || emp.daysAbsent === 0)) {
        recommendations.push({
          id: `REC-ATT-${emp.id}`,
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department || 'N/A',
          reasonType: 'attendance_perfect',
          triggerDetail: `Kehadiran: ${emp.attendanceRate}% (Mangkir: 0)`,
          proposedType: 'Bonus Kerajinan',
          proposedAmount: attendancePerfectIncentive,
          description: `Apresiasi tingkat kehadiran prima (${emp.attendanceRate}%) tanpa mangkir selama periode kerja`
        });
      }
    });

    return recommendations;
  }, [
    employees, 
    attendancePerfectThreshold, 
    attendancePerfectIncentive
  ]);

  const handleApplyRecommendation = (rec: any) => {
    if (appliedRecommendationIds.includes(rec.id)) return;

    const newLog: IncentiveLog = {
      id: `INC-${Date.now().toString().slice(-3)}-${Math.floor(Math.random() * 100)}`,
      employeeId: rec.employeeId,
      employeeName: rec.employeeName,
      department: rec.department,
      type: rec.proposedType,
      amount: rec.proposedAmount,
      period: 'Juli 2026',
      approvedBy: 'Sistem Analisis KPI & HRD',
      description: rec.description,
      status: 'Pending'
    };

    setIncentiveLogs(prev => [newLog, ...prev]);
    setAppliedRecommendationIds(prev => [...prev, rec.id]);
  };

  const handleApplyAllRecommendations = () => {
    const unapplied = analyticalRecommendations.filter(r => !appliedRecommendationIds.includes(r.id));
    if (unapplied.length === 0) return;

    const newLogs: IncentiveLog[] = unapplied.map((rec, idx) => ({
      id: `INC-${Date.now().toString().slice(-3)}-${idx}`,
      employeeId: rec.employeeId,
      employeeName: rec.employeeName,
      department: rec.department,
      type: rec.proposedType,
      amount: rec.proposedAmount,
      period: 'Juli 2026',
      approvedBy: 'Sistem Analisis KPI & HRD',
      description: rec.description,
      status: 'Pending'
    }));

    setIncentiveLogs(prev => [...newLogs, ...prev]);
    setAppliedRecommendationIds(prev => [...prev, ...unapplied.map(r => r.id)]);
  };

  const handleAddSektorIncentive = (log: {
    employeeName: string;
    employeeId: string;
    department: string;
    incentiveType: 'produksi' | 'kerajinan' | 'lapangan' | 'khusus';
    amount: number;
    description: string;
  }) => {
    const mapType = {
      produksi: 'Insentif Produksi',
      kerajinan: 'Bonus Kerajinan',
      lapangan: 'Tunjangan Lapangan',
      khusus: 'Bonus Khusus'
    } as const;

    const newLog: IncentiveLog = {
      id: `INC-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 100)}`,
      employeeId: log.employeeId,
      employeeName: log.employeeName,
      department: log.department,
      type: mapType[log.incentiveType],
      amount: log.amount,
      period: 'Juli 2026',
      approvedBy: 'Kalkulator Sektor',
      description: log.description,
      status: 'Pending'
    };

    setIncentiveLogs(prev => [newLog, ...prev]);
  };

  // Filtering Lists based on search, department, and period
  const filteredOvertime = useMemo(() => {
    return overtimeLogs.filter(log => {
      const matchesSearch = log.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            log.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            log.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDept === 'all' || log.department === selectedDept;
      const matchesPeriod = otPeriodFilter === 'all' || log.periodType === otPeriodFilter;
      return matchesSearch && matchesDept && matchesPeriod;
    });
  }, [overtimeLogs, searchTerm, selectedDept, otPeriodFilter]);

  const filteredIncentives = useMemo(() => {
    return incentiveLogs.filter(log => {
      const matchesSearch = log.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            log.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDept === 'all' || log.department === selectedDept;
      const matchesPeriod = incPeriodFilter === 'all' || log.periodType === incPeriodFilter;
      return matchesSearch && matchesDept && matchesPeriod;
    });
  }, [incentiveLogs, searchTerm, selectedDept, incPeriodFilter]);

  // Action: Approve Overtime Request
  const handleApproveOvertime = (id: string, approve: boolean) => {
    setOvertimeLogs(prev => prev.map(log => {
      if (log.id === id) {
        return { ...log, status: approve ? 'Disetujui' : 'Ditolak' };
      }
      return log;
    }));
  };

  // Action: Pay Incentive
  const handlePayIncentive = (id: string) => {
    setIncentiveLogs(prev => prev.map(log => {
      if (log.id === id) {
        return { ...log, status: 'Dibayarkan' };
      }
      return log;
    }));
  };

  // Action: Submit Overtime Modal
  const handleSubmitOvertime = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedEmp = employees.find(emp => emp.id === newOtEmpId);
    if (!selectedEmp) {
      alert('Pilih karyawan terlebih dahulu!');
      return;
    }

    let ratePerHour = baseOtRateStandard;
    let multiplier = baseOtMultiplier;
    let reasonText = newOtReason || 'Tambahan jam operasional tambang nikel';

    if (usePP35Mode) {
      const baseNum = parseInt(String(selectedEmp.wage || '0').replace(/\D/g, ''), 10) || 0;
      const fixNum = selectedEmp.fixedAllowance || 0;
      const monthlyWage = baseNum + fixNum;

      const pp35Result = calculatePP35Overtime(monthlyWage, otWorkType, newOtHours);
      ratePerHour = pp35Result.hourlyRate;
      multiplier = parseFloat((pp35Result.totalIndexHours / (newOtHours || 1)).toFixed(2));
      reasonText = `${reasonText} [PP35 - ${pp35Result.totalIndexHours} jam setara, Total Rp ${pp35Result.totalOvertimePay.toLocaleString('id-ID')}]`;
    } else {
      if (selectedEmp.salaryGrade.includes('G8') || selectedEmp.salaryGrade.includes('G9')) {
        ratePerHour = baseOtRateG8G9;
      } else if (selectedEmp.salaryGrade.includes('G5') || selectedEmp.salaryGrade.includes('G6')) {
        ratePerHour = baseOtRateG5G6;
      }
    }

    let displayDate = newOtDate;
    if (otInputPeriodType === 'weekly') {
      displayDate = newOtWeekLabel;
    } else if (otInputPeriodType === 'monthly') {
      displayDate = newOtMonthLabel;
    }

    const newLog: OvertimeLog = {
      id: `OT-${Date.now().toString().slice(-3)}`,
      employeeId: selectedEmp.id,
      employeeName: selectedEmp.name,
      department: selectedEmp.department,
      date: displayDate,
      periodType: otInputPeriodType,
      hours: newOtHours,
      ratePerHour,
      multiplier,
      reason: reasonText,
      status: 'Pending'
    };

    setOvertimeLogs([newLog, ...overtimeLogs]);
    setShowOvertimeModal(false);
    setNewOtReason('');
  };

  // Action: Submit Incentive Modal
  const handleSubmitIncentive = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedEmp = employees.find(emp => emp.id === newIncEmpId);
    if (!selectedEmp) {
      alert('Pilih karyawan terlebih dahulu!');
      return;
    }

    let displayPeriod = newIncMonthLabel;
    if (incInputPeriodType === 'daily') {
      displayPeriod = `Harian (${newIncDate})`;
    } else if (incInputPeriodType === 'weekly') {
      displayPeriod = newIncWeekLabel;
    }

    const newLog: IncentiveLog = {
      id: `INC-${Date.now().toString().slice(-3)}`,
      employeeId: selectedEmp.id,
      employeeName: selectedEmp.name,
      department: selectedEmp.department,
      type: newIncType,
      amount: newIncAmount,
      period: displayPeriod,
      periodType: incInputPeriodType,
      approvedBy: 'Suhendra Widjaja (KTT)',
      description: newIncDesc || 'Insentif khusus operasional tambang Sultra',
      status: 'Pending'
    };

    setIncentiveLogs([newLog, ...incentiveLogs]);
    setShowIncentiveModal(false);
    setNewIncDesc('');
  };

  return (
    <div className="space-y-6" id="overtime-incentive-dashboard">
      {/* Exporter / Importer bar */}
      <DataExchangeBar 
        data={activeTab === 'overtime' ? overtimeLogs : incentiveLogs}
        fileName={activeTab === 'overtime' ? 'Laporan_Lembur_PT_One_For_All' : 'Laporan_Insentif_PT_One_For_All'}
        onUploadSuccess={onUploadSuccess}
        title={activeTab === 'overtime' ? 'Ekspor / Impor Log Lembur' : 'Ekspor / Impor Log Insentif'}
      />

      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-gradient-to-tr from-teal-600 to-emerald-600 text-white rounded-xl shadow-md">
                <Clock className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white font-heading">Lembur &amp; Insentif Tambang</h2>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              Sistem manajemen persetujuan lembur terpadu, perhitungan koefisien perkalian jam lembur site, serta pelacakan insentif kinerja smelter &amp; operator produksi.
            </p>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 flex-wrap gap-1 md:gap-0">
            <button
              onClick={() => setActiveTab('overtime')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overtime'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow shadow-teal-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Sistem Lembur</span>
            </button>
            <button
              onClick={() => setActiveTab('incentive')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'incentive'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow shadow-teal-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Insentif &amp; Bonus</span>
            </button>
            <button
              onClick={() => setActiveTab('pp35')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'pp35'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow shadow-teal-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Formulasi PP 35</span>
            </button>
            <button
              onClick={() => setActiveTab('formulas')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'formulas'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow shadow-teal-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Formulasi Sektor</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow shadow-teal-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Pengaturan Dasar</span>
            </button>
          </div>
        </div>
      </div>

      {/* OVERTIME STATS PANEL */}
      {activeTab === 'overtime' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" id="ot-stats">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pengajuan</span>
              <strong className="text-2xl font-bold text-white block mt-1">{overtimeLogs.length} Kasus</strong>
              <span className="text-[10px] text-slate-500">Seluruh periode log site</span>
            </div>
            <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Akumulasi Jam</span>
              <strong className="text-2xl font-bold text-teal-400 block mt-1">{overtimeStats.totalHours} Jam</strong>
              <span className="text-[10px] text-slate-500">Mencakup disetujui &amp; pending</span>
            </div>
            <div className="p-2.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Belanja Lembur</span>
              <strong className="text-xl font-bold text-emerald-400 block mt-1.5">
                Rp {overtimeStats.totalCost.toLocaleString('id-ID')}
              </strong>
              <span className="text-[10px] text-slate-500">Koefisien lembur disetujui</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Butuh Otorisasi KTT</span>
              <strong className="text-2xl font-bold text-amber-400 block mt-1">{overtimeStats.pendingCount} Antrean</strong>
              <span className="text-[10px] text-slate-500">Menunggu verifikasi lapangan</span>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* INCENTIVE STATS PANEL */}
      {activeTab === 'incentive' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" id="inc-stats">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Insentif Dibayar</span>
              <strong className="text-2xl font-bold text-emerald-400 block mt-1">
                Rp {incentiveStats.totalDistributed.toLocaleString('id-ID')}
              </strong>
              <span className="text-[10px] text-slate-500">{incentiveStats.totalIncentivesPaidCount} Pembayaran Berhasil</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Insentif Menggantung (Pending)</span>
              <strong className="text-2xl font-bold text-amber-400 block mt-1">
                Rp {incentiveStats.pendingDistributed.toLocaleString('id-ID')}
              </strong>
              <span className="text-[10px] text-slate-500">Menunggu transfer bendahara</span>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jenis Insentif Aktif</span>
              <strong className="text-2xl font-bold text-indigo-400 block mt-1">4 Skema</strong>
              <span className="text-[10px] text-slate-500">Produksi, Kerajinan, Lapangan, Khusus</span>
            </div>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
              <Percent className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rerata Insentif Kinerja</span>
              <strong className="text-2xl font-bold text-white block mt-1">15.5%</strong>
              <span className="text-[10px] text-slate-500">Dari total gaji pokok karyawan</span>
            </div>
            <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE ANALYSIS & AUTOMATIC INCENTIVE RECOMMENDATIONS */}
      {activeTab === 'incentive' && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-teal-500/25 rounded-2xl p-5 relative overflow-hidden shadow-lg animate-fade-in" id="attendance-analysis-panel">
          {/* subtle glow accent */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-32 h-32 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                <h3 className="text-sm font-bold text-teal-400 font-heading uppercase tracking-wider">Hasil Analisis &amp; Rekomendasi Insentif Otomatis</h3>
              </div>
              <p className="text-xs text-slate-400">
                Sistem melakukan kalkulasi otomatis terhadap seluruh data karyawan berdasarkan tingkat kehadiran murni periode berjalan.
              </p>
            </div>
            {analyticalRecommendations.filter(r => !appliedRecommendationIds.includes(r.id)).length > 0 && (
              <button
                onClick={handleApplyAllRecommendations}
                className="bg-teal-600/10 hover:bg-teal-600 text-teal-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-teal-500/25 transition-all flex items-center gap-1 cursor-pointer self-start md:self-auto"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Setujui Semua Rekomendasi</span>
              </button>
            )}
          </div>

          <div className="mt-4">
            {analyticalRecommendations.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs italic flex flex-col items-center justify-center gap-1.5">
                <AlertCircle className="w-5 h-5 text-slate-600" />
                <span>Belum ada usulan insentif otomatis. Masukkan tingkat absensi &gt;= 98% pada profil karyawan untuk mentrigger sistem rekomendasi.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-72 overflow-y-auto pr-1">
                {analyticalRecommendations.map((rec) => {
                  const isApplied = appliedRecommendationIds.includes(rec.id);
                  return (
                    <div 
                      key={rec.id} 
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        isApplied 
                          ? 'bg-slate-950/40 border-emerald-500/20 opacity-60' 
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-bold text-white block">{rec.employeeName}</h4>
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{rec.employeeId} &bull; {rec.department}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            Kehadiran Prima
                          </span>
                        </div>

                        <div className="p-2 bg-slate-900/60 rounded-lg space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">Pemicu Analisis</span>
                            <span className="text-teal-400 font-semibold">{rec.triggerDetail}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">Rencana Premi</span>
                            <span className="text-emerald-400 font-bold">Rp {rec.proposedAmount.toLocaleString('id-ID')}</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed italic">
                          "{rec.description}"
                        </p>
                      </div>

                      <div className="pt-3.5 mt-2 border-t border-slate-900 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-400">
                          {rec.proposedType}
                        </span>
                        {isApplied ? (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 font-mono">
                            <Check className="w-3 h-3" /> Telah Diterapkan
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApplyRecommendation(rec)}
                            className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Terapkan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FILTER & BUTTON ACTIONS */}
      {activeTab !== 'formulas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col lg:flex-row gap-3 w-full md:w-auto flex-1 items-stretch lg:items-center">
            {/* Search bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder={activeTab === 'overtime' ? 'Cari nama karyawan, alasan lembur...' : 'Cari nama karyawan, jenis deskripsi...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs font-semibold rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 [&_option]:bg-slate-900"
            >
              <option value="all">Semua Departemen</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            {/* Period Filter Buttons */}
            {activeTab === 'overtime' && (
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase px-2">Periode:</span>
                <button
                  onClick={() => setOtPeriodFilter('all')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    otPeriodFilter === 'all' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setOtPeriodFilter('daily')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    otPeriodFilter === 'daily' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📅 Harian
                </button>
                <button
                  onClick={() => setOtPeriodFilter('weekly')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    otPeriodFilter === 'weekly' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📆 Mingguan
                </button>
                <button
                  onClick={() => setOtPeriodFilter('monthly')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    otPeriodFilter === 'monthly' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🗓️ Bulanan
                </button>
              </div>
            )}

            {activeTab === 'incentive' && (
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase px-2">Periode:</span>
                <button
                  onClick={() => setIncPeriodFilter('all')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    incPeriodFilter === 'all' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setIncPeriodFilter('daily')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    incPeriodFilter === 'daily' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📅 Harian
                </button>
                <button
                  onClick={() => setIncPeriodFilter('weekly')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    incPeriodFilter === 'weekly' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📆 Mingguan
                </button>
                <button
                  onClick={() => setIncPeriodFilter('monthly')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    incPeriodFilter === 'monthly' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🗓️ Bulanan
                </button>
              </div>
            )}
          </div>

          {/* Create new action */}
          {activeTab === 'overtime' ? (
            <button
              onClick={() => setShowOvertimeModal(true)}
              className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2 rounded-lg border border-teal-500/20 flex items-center gap-1.5 transition-colors cursor-pointer w-full md:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Ajukan Lembur Lapangan</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setNewIncAmount(baseIncentiveDefault);
                setShowIncentiveModal(true);
              }}
              className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2 rounded-lg border border-teal-500/20 flex items-center gap-1.5 transition-colors cursor-pointer w-full md:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Berikan Insentif Baru</span>
            </button>
          )}
        </div>
      )}

      {/* DYNAMIC LIST / TABLES */}
      {activeTab === 'overtime' && (
        /* OVERTIME TABLE */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm" id="ot-list-table">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center">
            <span className="text-xs font-bold text-white font-heading uppercase tracking-wider">Log Pengajuan Jam Lembur Site</span>
            <span className="text-[10px] text-slate-500 font-mono">Menampilkan {filteredOvertime.length} data</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Nama / ID Karyawan</th>
                  <th className="py-3 px-4">Departemen</th>
                  <th className="py-3 px-4">Tanggal Kerja</th>
                  <th className="py-3 px-4">Durasi Jam</th>
                  <th className="py-3 px-4">Multiplier</th>
                  <th className="py-3 px-4">Alasan &amp; Keperluan Lapangan</th>
                  <th className="py-3 px-4 text-right">Perkiraan Premi</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOvertime.map((log) => {
                  const estimatedPremium = log.hours * log.ratePerHour * log.multiplier;
                  return (
                    <tr key={log.id} className="hover:bg-slate-950/20 transition-all">
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div>{log.employeeName}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{log.employeeId}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{log.department}</td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            log.periodType === 'daily' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            log.periodType === 'weekly' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {log.periodType === 'daily' ? 'Harian' : log.periodType === 'weekly' ? 'Mingguan' : 'Bulanan'}
                          </span>
                          <span>{log.date}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white font-mono">{log.hours} Jam</td>
                      <td className="py-3.5 px-4 font-mono text-amber-400">x{log.multiplier}</td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate" title={log.reason}>
                        {log.reason}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-teal-400">
                        Rp {estimatedPremium.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                          log.status === 'Disetujui' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                          log.status === 'Ditolak' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/25 animate-pulse'
                        }`}>
                          {log.status === 'Disetujui' ? '✓ Disetujui' : log.status === 'Ditolak' ? '✗ Ditolak' : '⏱ Pending'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {log.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveOvertime(log.id, false)}
                              className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/25 cursor-pointer"
                              title="Tolak Pengajuan"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleApproveOvertime(log.id, true)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg border border-emerald-600 cursor-pointer"
                              title="Setujui Lembur"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Telah Diproses</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredOvertime.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500 italic">
                      Tidak ada log lembur lapangan yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INCENTIVE LIST */}
      {activeTab === 'incentive' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm" id="inc-list-table">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center">
            <span className="text-xs font-bold text-white font-heading uppercase tracking-wider">Log Insentif, Tunjangan Lapangan &amp; Bonus</span>
            <span className="text-[10px] text-slate-500 font-mono">Menampilkan {filteredIncentives.length} data</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Nama / ID Karyawan</th>
                  <th className="py-3 px-4">Departemen</th>
                  <th className="py-3 px-4">Jenis Insentif</th>
                  <th className="py-3 px-4 text-right">Besaran Insentif</th>
                  <th className="py-3 px-4 font-mono">Periode</th>
                  <th className="py-3 px-4">Otorisator Tambang</th>
                  <th className="py-3 px-4">Catatan / Deskripsi Pencapaian</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredIncentives.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-950/20 transition-all">
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div>{log.employeeName}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{log.employeeId}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{log.department}</td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className={`px-2 py-0.5 rounded font-medium text-[10px] ${
                        log.type === 'Insentif Produksi' ? 'bg-blue-500/10 text-blue-400' :
                        log.type === 'Bonus Kerajinan' ? 'bg-purple-500/10 text-purple-400' :
                        log.type === 'Tunjangan Lapangan' ? 'bg-teal-500/10 text-teal-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      Rp {log.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          log.periodType === 'daily' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          log.periodType === 'weekly' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {log.periodType === 'daily' ? 'Harian' : log.periodType === 'weekly' ? 'Mingguan' : 'Bulanan'}
                        </span>
                        <span>{log.period}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{log.approvedBy}</td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate" title={log.description}>
                      {log.description}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                        log.status === 'Dibayarkan' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/25 animate-pulse'
                      }`}>
                        {log.status === 'Dibayarkan' ? '✓ Lunas' : '⏱ Pending'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {log.status === 'Pending' ? (
                        <button
                          onClick={() => handlePayIncentive(log.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all cursor-pointer text-[10px]"
                        >
                          Bayarkan
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Sudah Ditransfer</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredIncentives.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500 italic">
                      Tidak ada log insentif atau bonus yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PP 35 FORMULATION WORKSPACE */}
      {activeTab === 'pp35' && (
        <PP35Calculator 
          employees={employees}
          onSaveToOvertimeLog={(logData) => {
            const newLog: OvertimeLog = {
              id: `OT-PP35-${Date.now().toString().slice(-4)}`,
              employeeId: logData.employeeId,
              employeeName: logData.employeeName,
              department: logData.department,
              date: logData.date,
              hours: logData.hours,
              ratePerHour: logData.ratePerHour,
              multiplier: logData.multiplier,
              reason: logData.reason,
              status: 'Disetujui'
            };
            setOvertimeLogs(prev => [newLog, ...prev]);
          }}
          onApplyToEmployeePayroll={async (empId, amount) => {
            if (onUpdateEmployee) {
              await onUpdateEmployee(empId, { overtimePay: amount });
            }
          }}
        />
      )}

      {/* SEKTOR FORMULAS CALCULATOR WORKSPACE */}
      {activeTab === 'formulas' && (
        <SektorFormulas onAddIncentiveLog={handleAddSektorIncentive} />
      )}

      {/* BASIC SETTINGS WORKSPACE */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-8 animate-fade-in" id="settings-tab-panel">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 font-heading">
                <Sliders className="w-5 h-5 text-teal-400" />
                <span>Pengaturan Tarif &amp; Insentif Dasar</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Sesuaikan nominal standar, rasio pengganda, dan batas nilai analisis kelayakan lembur &amp; bonus kehadiran prima.
              </p>
            </div>
            <button
              onClick={() => {
                // Reset all states to original defaults
                setBaseOtRateStandard(30000);
                setBaseOtRateG5G6(40000);
                setBaseOtRateG8G9(50000);
                setBaseOtMultiplier(2);
                setBaseIncentiveDefault(1500000);
                setAttendancePerfectThreshold(98);
                setAttendancePerfectIncentive(750000);
                alert('Konfigurasi dasar berhasil dikembalikan ke nilai default pabrik!');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-bold text-xs transition-all cursor-pointer border border-slate-700 flex items-center gap-1.5 self-start sm:self-center"
            >
              Reset ke Default
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* OVERTIME PARAMETERS */}
            <div className="space-y-4 bg-slate-950/40 p-5 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-2">
                <span className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white font-heading">Parameter Lembur Lapangan (Basic Lembur)</h4>
                  <p className="text-[10px] text-slate-500">Menentukan tarif standar per jam sesuai golongan gaji karyawan.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1.5">Tarif Standar (Rp/Jam)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rp</span>
                    <input
                      type="number"
                      value={baseOtRateStandard}
                      onChange={(e) => setBaseOtRateStandard(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1.5">Tarif Golongan G5 - G6 (Rp/Jam)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rp</span>
                    <input
                      type="number"
                      value={baseOtRateG5G6}
                      onChange={(e) => setBaseOtRateG5G6(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1.5">Tarif Golongan G8 - G9 (Rp/Jam)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rp</span>
                    <input
                      type="number"
                      value={baseOtRateG8G9}
                      onChange={(e) => setBaseOtRateG8G9(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1.5">Faktor Pengali (Multiplier)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={baseOtMultiplier}
                    onChange={(e) => setBaseOtMultiplier(Math.max(1, parseFloat(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Rasio pengganda jam kerja lembur akhir site.</span>
                </div>
              </div>
            </div>

            {/* INCENTIVE PARAMETERS */}
            <div className="space-y-4 bg-slate-950/40 p-5 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-2">
                <span className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg">
                  <Award className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white font-heading">Parameter Insentif Dasar (Basic Insentif)</h4>
                  <p className="text-[10px] text-slate-500">Konfigurasi nilai default modal pengajuan serta sistem rekomendasi otomatis.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-400 font-medium mb-1.5">Nominal Default Pengajuan Baru (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rp</span>
                    <input
                      type="number"
                      value={baseIncentiveDefault}
                      onChange={(e) => setBaseIncentiveDefault(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1.5">Min. Kehadiran Prima (%)</label>
                  <input
                    type="number"
                    value={attendancePerfectThreshold}
                    onChange={(e) => setAttendancePerfectThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-medium mb-1.5">Bonus Kerajinan/Absensi (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rp</span>
                    <input
                      type="number"
                      value={attendancePerfectIncentive}
                      onChange={(e) => setAttendancePerfectIncentive(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-400 block">Efek Perubahan Tarif Dasar</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Setiap perubahan tarif dasar lembur dan insentif di atas akan langsung diterapkan pada pengajuan lembur baru, perhitungan premi, serta nilai saran otomatis pada panel rekomendasi sistem. Log pengajuan masa lalu yang sudah disetujui atau dibayarkan tidak akan terpengaruh untuk menjaga integritas data historis payroll.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* OVERTIME REQUEST MODAL */}
      {showOvertimeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
                  <Clock className="w-5 h-5" />
                </span>
                <h3 className="text-sm font-bold text-white font-heading">Ajukan Lembur Lapangan Site</h3>
              </div>
              <button 
                onClick={() => setShowOvertimeModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitOvertime} className="p-5 space-y-4">
              {/* Select Employee */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Pilih Karyawan Tambang</label>
                <select
                  required
                  value={newOtEmpId}
                  onChange={(e) => setNewOtEmpId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 [&_option]:bg-slate-900"
                >
                  <option value="">-- Pilih Anggota Staff --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.id}] {emp.name} - {emp.department} ({emp.position})
                    </option>
                  ))}
                </select>
              </div>

              {/* Skema Period Tab */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Skema Input Periode Lembur</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setOtInputPeriodType('daily')}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      otInputPeriodType === 'daily' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📅 Harian</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtInputPeriodType('weekly')}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      otInputPeriodType === 'weekly' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📆 Mingguan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtInputPeriodType('monthly')}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      otInputPeriodType === 'monthly' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🗓️ Bulanan</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Period Inputs */}
              {otInputPeriodType === 'daily' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Jam Lembur Harian</label>
                    <input
                      type="number"
                      required
                      min={0.5}
                      max={12}
                      step={0.5}
                      value={newOtHours}
                      onChange={(e) => setNewOtHours(parseFloat(e.target.value) || 1)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                    <span className="text-[9px] text-slate-500 block">Sesuai PP 35: Max 4 jam/hari</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Tanggal Kerja</label>
                    <input
                      type="date"
                      required
                      value={newOtDate}
                      onChange={(e) => setNewOtDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {otInputPeriodType === 'weekly' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Jam Lembur Mingguan</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={60}
                      value={newOtHours}
                      onChange={(e) => setNewOtHours(parseFloat(e.target.value) || 1)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                    <span className="text-[9px] text-slate-500 block">Sesuai PP 35: Max 18 jam/minggu</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Label Minggu</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Minggu ke-3 (15 - 21 Juli 2026)"
                      value={newOtWeekLabel}
                      onChange={(e) => setNewOtWeekLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              )}

              {otInputPeriodType === 'monthly' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Total Jam Lembur Bulanan</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={200}
                      value={newOtHours}
                      onChange={(e) => setNewOtHours(parseFloat(e.target.value) || 1)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                    <span className="text-[9px] text-slate-500 block">Akumulasi lembur 1 bulan</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Periode Bulan</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Juli 2026"
                      value={newOtMonthLabel}
                      onChange={(e) => setNewOtMonthLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              )}

              {/* Formula Mode Toggle */}
              <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Perhitungan PP No. 35 Tahun 2021
                  </label>
                  <input
                    type="checkbox"
                    checked={usePP35Mode}
                    onChange={(e) => setUsePP35Mode(e.target.checked)}
                    className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
                  />
                </div>
                {usePP35Mode && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Kategori Hari Kerja</label>
                    <select
                      value={otWorkType}
                      onChange={(e) => setOtWorkType(e.target.value as PP35WorkType)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="workday">Hari Kerja Biasa (Jam 1: 1.5x, Jam 2+: 2.0x)</option>
                      <option value="weekend_5day">Hari Libur (5 Hari Kerja/Minggu)</option>
                      <option value="weekend_6day">Hari Libur (6 Hari Kerja/Minggu)</option>
                      <option value="holiday_short_5hours">Hari Libur (Hari Kerja Pendek 5 Jam)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Alasan Lembur / Kebutuhan Operasional</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Deskripsikan alasan teknis pengerjaan lembur, misal: Bongkar muat tongkang jetty area B..."
                  value={newOtReason}
                  onChange={(e) => setNewOtReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowOvertimeModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-950 border border-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 transition-colors cursor-pointer"
                >
                  Ajukan &amp; Mintakan Persetujuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INCENTIVE REQUEST MODAL */}
      {showIncentiveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
                  <Award className="w-5 h-5" />
                </span>
                <h3 className="text-sm font-bold text-white font-heading">Berikan Insentif &amp; Penghargaan</h3>
              </div>
              <button 
                onClick={() => setShowIncentiveModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitIncentive} className="p-5 space-y-4">
              {/* Select Employee */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Penerima Insentif</label>
                <select
                  required
                  value={newIncEmpId}
                  onChange={(e) => setNewIncEmpId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 [&_option]:bg-slate-900"
                >
                  <option value="">-- Pilih Anggota Staff --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.id}] {emp.name} - {emp.department} ({emp.position})
                    </option>
                  ))}
                </select>
              </div>

              {/* Skema Period Tab */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Skema Input Periode Insentif</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIncInputPeriodType('daily')}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      incInputPeriodType === 'daily' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📅 Harian</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncInputPeriodType('weekly')}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      incInputPeriodType === 'weekly' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📆 Mingguan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncInputPeriodType('monthly')}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      incInputPeriodType === 'monthly' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🗓️ Bulanan</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Jenis Insentif</label>
                  <select
                    value={newIncType}
                    onChange={(e) => setNewIncType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 [&_option]:bg-slate-900"
                  >
                    <option value="Insentif Produksi">Insentif Produksi</option>
                    <option value="Bonus Kerajinan">Bonus Kerajinan</option>
                    <option value="Tunjangan Lapangan">Tunjangan Lapangan</option>
                    <option value="Bonus Khusus">Bonus Khusus</option>
                  </select>
                </div>

                {/* Period Input based on mode */}
                {incInputPeriodType === 'daily' && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Tanggal Harian</label>
                    <input
                      type="date"
                      required
                      value={newIncDate}
                      onChange={(e) => setNewIncDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                )}

                {incInputPeriodType === 'weekly' && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Label Minggu</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Minggu ke-3 Juli 2026"
                      value={newIncWeekLabel}
                      onChange={(e) => setNewIncWeekLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}

                {incInputPeriodType === 'monthly' && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Periode Bulan</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Juli 2026"
                      value={newIncMonthLabel}
                      onChange={(e) => setNewIncMonthLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Nominal Insentif (IDR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">Rp</span>
                  <input
                    type="number"
                    required
                    min={10000}
                    value={newIncAmount}
                    onChange={(e) => setNewIncAmount(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Alasan &amp; Penghargaan Capaian</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Tuliskan justifikasi detail pemberian bonus, misal: Target smelting harian terlewati 120% berturut-turut..."
                  value={newIncDesc}
                  onChange={(e) => setNewIncDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowIncentiveModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-950 border border-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 transition-colors cursor-pointer"
                >
                  Sah &amp; Publikasikan Bonus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
