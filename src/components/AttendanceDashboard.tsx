import React, { useState, useMemo } from 'react';
import { Employee, AttendanceDailyRecord } from '../types';
import { 
  Search, Filter, Calendar, Users, CheckCircle, AlertTriangle, 
  XCircle, Clock, ChevronLeft, ChevronRight, Edit3, ClipboardCheck, Info, Sparkles
} from 'lucide-react';
import DataExchangeBar from './DataExchangeBar';

interface AttendanceDashboardProps {
  employees: Employee[];
  onUpdateEmployee: (empId: string, updatedData: Partial<Employee>) => Promise<void>;
  onUploadSuccess?: () => void;
}

export default function AttendanceDashboard({ 
  employees, 
  onUpdateEmployee,
  onUploadSuccess
}: AttendanceDashboardProps) {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [rateFilter, setRateFilter] = useState<'all' | 'high' | 'warning' | 'critical'>('all');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'Shift 1' | 'Shift 2' | 'Regular'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Working Shift Configuration
  const [shiftMode, setShiftMode] = useState<'8h' | '12h'>('8h');
  const [quickAssignEmpId, setQuickAssignEmpId] = useState('');
  const [quickAssignShift, setQuickAssignShift] = useState<'Shift 1' | 'Shift 2' | 'Regular'>('Shift 1');
  const [isAssigningShift, setIsAssigningShift] = useState(false);

  // Selected Employee to Record Attendance
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [formPresent, setFormPresent] = useState(24);
  const [formLate, setFormLate] = useState(0);
  const [formAbsent, setFormAbsent] = useState(0);
  const [formPermit, setFormPermit] = useState(2);
  const [formShift, setFormShift] = useState<'Shift 1' | 'Shift 2' | 'Regular'>('Regular');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- Input Harian (Sub Bagian: entri absensi per tanggal, terakumulasi ke rekap bulanan) ---
  const [showDailyInput, setShowDailyInput] = useState(false);
  const [dailyEmpId, setDailyEmpId] = useState('');
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyStatus, setDailyStatus] = useState<AttendanceDailyRecord['status']>('Hadir');
  const [dailyNotes, setDailyNotes] = useState('');
  const [isSavingDaily, setIsSavingDaily] = useState(false);
  const [dailySaveSuccess, setDailySaveSuccess] = useState(false);

  // Departments List
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => { if (e.department) depts.add(e.department); });
    return Array.from(depts).sort();
  }, [employees]);

  // Map each employee with initialized or updated attendance fields
  const processedEmployees = useMemo(() => {
    return employees.map(emp => {
      // Default initial states if empty
      const present = emp.daysPresent !== undefined ? emp.daysPresent : 24;
      const late = emp.daysLate !== undefined ? emp.daysLate : 0;
      const absent = emp.daysAbsent !== undefined ? emp.daysAbsent : 0;
      const permit = emp.daysPermit !== undefined ? emp.daysPermit : 2;
      const wShift = emp.workShift || 'Regular';
      
      const totalDays = present + late + absent + permit;
      const rate = totalDays > 0 
        ? Math.round(((present + late * 0.5) / totalDays) * 100 * 10) / 10 
        : 100;

      return {
        ...emp,
        daysPresent: present,
        daysLate: late,
        daysAbsent: absent,
        daysPermit: permit,
        workShift: wShift,
        attendanceRate: rate
      };
    });
  }, [employees]);

  // Stats Calculations
  const stats = useMemo(() => {
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let totalPermit = 0;
    let sumRates = 0;

    processedEmployees.forEach(e => {
      totalPresent += e.daysPresent || 0;
      totalLate += e.daysLate || 0;
      totalAbsent += e.daysAbsent || 0;
      totalPermit += e.daysPermit || 0;
      sumRates += e.attendanceRate || 0;
    });

    const avgRate = processedEmployees.length > 0 
      ? Math.round((sumRates / processedEmployees.length) * 10) / 10 
      : 100;

    return {
      totalPresent,
      totalLate,
      totalAbsent,
      totalPermit,
      avgRate
    };
  }, [processedEmployees]);

  // Dept stats for beautiful custom dashboard charts
  const deptAttendanceStats = useMemo(() => {
    const map: Record<string, { total: number, sumRates: number }> = {};
    processedEmployees.forEach(e => {
      if (!map[e.department]) {
        map[e.department] = { total: 0, sumRates: 0 };
      }
      map[e.department].total++;
      map[e.department].sumRates += e.attendanceRate || 0;
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      rate: Math.round((data.sumRates / data.total) * 10) / 10,
      count: data.total
    })).sort((a, b) => b.rate - a.rate);
  }, [processedEmployees]);

  // Check which shift is currently active based on real local time
  const currentActiveShift = useMemo(() => {
    const now = new Date();
    const hrs = now.getHours();
    
    if (shiftMode === '8h') {
      if (hrs >= 7 && hrs < 15) {
        return { name: 'Shift 1 (Pagi)', hours: '07:00 - 15:00', icon: 'sun' };
      } else if (hrs >= 15 && hrs < 23) {
        return { name: 'Shift 2 (Sore/Malam)', hours: '15:00 - 23:00', icon: 'moon' };
      } else {
        return { name: 'Off-Hours (Luar Shift)', hours: '23:00 - 07:00', icon: 'sleep' };
      }
    } else { // 12h
      if (hrs >= 7 && hrs < 19) {
        return { name: 'Shift 1 (Pagi/Siang)', hours: '07:00 - 19:00', icon: 'sun' };
      } else {
        return { name: 'Shift 2 (Malam)', hours: '19:00 - 07:00', icon: 'moon' };
      }
    }
  }, [shiftMode]);

  // Filter logic
  const filteredEmployees = useMemo(() => {
    return processedEmployees.filter(emp => {
      const query = (searchTerm || '').toLowerCase();
      const matchSearch = (emp.name || '').toLowerCase().includes(query) || 
                          (emp.position || '').toLowerCase().includes(query);
      const matchDept = deptFilter === '' || emp.department === deptFilter;
      
      const rate = emp.attendanceRate || 100;
      let matchRate = true;
      if (rateFilter === 'high') matchRate = rate >= 95;
      else if (rateFilter === 'warning') matchRate = rate >= 85 && rate < 95;
      else if (rateFilter === 'critical') matchRate = rate < 85;

      const empShift = emp.workShift || 'Regular';
      const matchShift = shiftFilter === 'all' || empShift === shiftFilter;

      return matchSearch && matchDept && matchRate && matchShift;
    });
  }, [processedEmployees, searchTerm, deptFilter, rateFilter, shiftFilter]);

  // Pagination
  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(start, start + itemsPerPage);
  }, [filteredEmployees, currentPage]);

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setFormPresent(emp.daysPresent !== undefined ? emp.daysPresent : 24);
    setFormLate(emp.daysLate !== undefined ? emp.daysLate : 0);
    setFormAbsent(emp.daysAbsent !== undefined ? emp.daysAbsent : 0);
    setFormPermit(emp.daysPermit !== undefined ? emp.daysPermit : 2);
    setFormShift(emp.workShift || 'Regular');
    setSaveSuccess(false);
  };

  const handleSaveAttendance = async () => {
    if (!editingEmp) return;
    setIsSaving(true);
    try {
      const totalDays = formPresent + formLate + formAbsent + formPermit;
      const rate = totalDays > 0 
        ? Math.round(((formPresent + formLate * 0.5) / totalDays) * 100 * 10) / 10 
        : 100;

      await onUpdateEmployee(editingEmp.id, {
        daysPresent: formPresent,
        daysLate: formLate,
        daysAbsent: formAbsent,
        daysPermit: formPermit,
        attendanceRate: rate,
        workShift: formShift
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setEditingEmp(null);
        setSaveSuccess(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data absensi.');
    } finally {
      setIsSaving(false);
    }
  };

  // Hitung ulang total bulanan (daysPresent/daysLate/daysAbsent/daysPermit) dari daftar record harian,
  // hanya untuk bulan yang sama dengan tanggal yang baru diinput. Bulan lain di record tidak dihitung ulang.
  const recalcMonthlyFromRecords = (records: AttendanceDailyRecord[], yearMonth: string) => {
    const monthRecords = records.filter(r => r.date.startsWith(yearMonth));
    const present = monthRecords.filter(r => r.status === 'Hadir').length;
    const late = monthRecords.filter(r => r.status === 'Terlambat').length;
    const absent = monthRecords.filter(r => r.status === 'Absen').length;
    const permit = monthRecords.filter(r => r.status === 'Izin').length;
    const totalDays = present + late + absent + permit;
    const rate = totalDays > 0
      ? Math.round(((present + late * 0.5) / totalDays) * 100 * 10) / 10
      : 100;
    return { present, late, absent, permit, rate };
  };

  const handleSaveDailyRecord = async () => {
    if (!dailyEmpId) {
      alert('Pilih karyawan terlebih dahulu!');
      return;
    }
    const emp = employees.find(e => e.id === dailyEmpId);
    if (!emp) return;

    setIsSavingDaily(true);
    try {
      const existingRecords = emp.attendanceRecords || [];
      // Upsert: satu tanggal hanya boleh satu status (entri ulang di tanggal yang sama akan menimpa yang lama)
      const otherRecords = existingRecords.filter(r => r.date !== dailyDate);
      const updatedRecords = [...otherRecords, { date: dailyDate, status: dailyStatus, notes: dailyNotes || undefined }]
        .sort((a, b) => a.date.localeCompare(b.date));

      const yearMonth = dailyDate.slice(0, 7); // YYYY-MM
      const { present, late, absent, permit, rate } = recalcMonthlyFromRecords(updatedRecords, yearMonth);

      await onUpdateEmployee(dailyEmpId, {
        attendanceRecords: updatedRecords,
        daysPresent: present,
        daysLate: late,
        daysAbsent: absent,
        daysPermit: permit,
        attendanceRate: rate
      });

      setDailySaveSuccess(true);
      setDailyNotes('');
      setTimeout(() => setDailySaveSuccess(false), 1500);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan entri harian.');
    } finally {
      setIsSavingDaily(false);
    }
  };

  const handleDeleteDailyRecord = async (empId: string, date: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const updatedRecords = (emp.attendanceRecords || []).filter(r => r.date !== date);
    const yearMonth = date.slice(0, 7);
    const { present, late, absent, permit, rate } = recalcMonthlyFromRecords(updatedRecords, yearMonth);
    try {
      await onUpdateEmployee(empId, {
        attendanceRecords: updatedRecords,
        daysPresent: present,
        daysLate: late,
        daysAbsent: absent,
        daysPermit: permit,
        attendanceRate: rate
      });
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus entri harian.');
    }
  };

  const dailySelectedEmp = employees.find(e => e.id === dailyEmpId);
  const dailySelectedEmpMonthRecords = (dailySelectedEmp?.attendanceRecords || [])
    .filter(r => r.date.startsWith(dailyDate.slice(0, 7)))
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleAssignShift = async (empId: string, shift: 'Shift 1' | 'Shift 2' | 'Regular') => {
    setIsAssigningShift(true);
    try {
      await onUpdateEmployee(empId, {
        workShift: shift
      });
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui shift karyawan.');
    } finally {
      setIsAssigningShift(false);
    }
  };

  return (
    <div className="space-y-6" id="attendance-dashboard">
      
      {/* 1. TOP HEADER SUMMARY */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Real-Time Analytics</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">
              Absensi &amp; Kehadiran Kerja
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Pantau persentase kehadiran karyawan One For All, data keterlambatan, cuti, serta alpa secara terintegrasi per departemen.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">RATA-RATA KEHADIRAN SITE</span>
              <strong className="text-3xl font-black text-emerald-400 font-mono">{stats.avgRate}%</strong>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <CheckCircle className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* SUB BAGIAN: TOGGLE INPUT HARIAN */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200">Input Absensi Harian</span>
          <span className="text-[10px] text-slate-500">— catat kehadiran per tanggal, otomatis terjumlah ke rekap bulanan di atas</span>
        </div>
        <button
          onClick={() => setShowDailyInput(v => !v)}
          className={`px-4 py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            showDailyInput ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          {showDailyInput ? 'Tutup Input Harian' : 'Buka Input Harian'}
        </button>
      </div>

      {/* SUB BAGIAN: PANEL INPUT HARIAN */}
      {showDailyInput && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Karyawan</label>
              <select
                value={dailyEmpId}
                onChange={(e) => setDailyEmpId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="">— Pilih Karyawan —</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Tanggal</label>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Status</label>
              <select
                value={dailyStatus}
                onChange={(e) => setDailyStatus(e.target.value as AttendanceDailyRecord['status'])}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="Hadir">Hadir</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Absen">Absen / Mangkir</option>
                <option value="Izin">Izin / Sakit / Cuti</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Catatan (opsional)</label>
              <input
                type="text"
                value={dailyNotes}
                onChange={(e) => setDailyNotes(e.target.value)}
                placeholder="mis. surat dokter, keperluan keluarga, dll"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              />
            </div>
            <button
              onClick={handleSaveDailyRecord}
              disabled={isSavingDaily || !dailyEmpId}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              {isSavingDaily ? 'Menyimpan...' : dailySaveSuccess ? 'Tersimpan ✓' : 'Simpan Entri Hari Ini'}
            </button>
          </div>

          {dailySelectedEmp && (
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">
                Riwayat {dailySelectedEmp.name} — {new Date(dailyDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </span>
              {dailySelectedEmpMonthRecords.length === 0 ? (
                <p className="text-[11px] text-slate-500">Belum ada entri harian di bulan ini.</p>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                  {dailySelectedEmpMonthRecords.map(rec => (
                    <div key={rec.date} className="flex items-center justify-between bg-slate-950/70 rounded-lg px-3 py-1.5 text-[11px]">
                      <span className="text-slate-400 font-mono">{new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                      <span className={`font-bold ${
                        rec.status === 'Hadir' ? 'text-emerald-400' :
                        rec.status === 'Terlambat' ? 'text-amber-400' :
                        rec.status === 'Absen' ? 'text-rose-400' : 'text-blue-400'
                      }`}>{rec.status}</span>
                      {rec.notes && <span className="text-slate-500 italic truncate max-w-[180px]">{rec.notes}</span>}
                      <button
                        onClick={() => handleDeleteDailyRecord(dailySelectedEmp.id, rec.date)}
                        className="text-slate-600 hover:text-rose-400 cursor-pointer text-[10px] font-bold"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-600 mt-2">
                Total di rekap bulanan akan otomatis diperbarui sesuai jumlah entri Hadir/Terlambat/Absen/Izin bulan ini.
              </p>
            </div>
          )}
        </div>
      )}

      {/* DATA EXPORT / IMPORT BAR */}
      <DataExchangeBar 
        data={filteredEmployees} 
        fileName="laporan_absensi_karyawan" 
        onUploadSuccess={onUploadSuccess}
        title="Kelola &amp; Ekspor Absensi Karyawan One For All"
      />

      {/* 2. STATS GRID CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Present Card */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3.5 shadow-sm">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-bold uppercase">Total Hadir</span>
            <strong className="text-xl font-bold text-slate-100 font-mono">{stats.totalPresent}</strong>
            <span className="text-[9px] text-slate-400 block mt-0.5">Hari Kerja Akumulatif</span>
          </div>
        </div>

        {/* Late Card */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3.5 shadow-sm">
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-bold uppercase">Terlambat</span>
            <strong className="text-xl font-bold text-slate-100 font-mono">{stats.totalLate}</strong>
            <span className="text-[9px] text-amber-500/80 block mt-0.5">Penalti 0.5x Kehadiran</span>
          </div>
        </div>

        {/* Absent Card */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3.5 shadow-sm">
          <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-bold uppercase">Alpa / Mangkir</span>
            <strong className="text-xl font-bold text-slate-100 font-mono">{stats.totalAbsent}</strong>
            <span className="text-[9px] text-rose-400/85 block mt-0.5">Tanpa Keterangan Sah</span>
          </div>
        </div>

        {/* Permit Card */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center gap-3.5 shadow-sm">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-bold uppercase">Izin / Sakit / Cuti</span>
            <strong className="text-xl font-bold text-slate-100 font-mono">{stats.totalPermit}</strong>
            <span className="text-[9px] text-blue-400 block mt-0.5">Izin Terkonfirmasi</span>
          </div>
        </div>
      </div>

      {/* 2.5 SHIFT CONFIGURATION & ACTIVE BOARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-sm" id="shift-config-panel">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col xl:flex-row gap-6">
          
          {/* Shift Timeline View */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white">Sistem Jam Kerja 2 Shift (Mulai 07:00 Pagi)</h3>
              </div>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 self-start sm:self-auto">
                <button
                  onClick={() => setShiftMode('8h')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    shiftMode === '8h' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Shift 8 Jam
                </button>
                <button
                  onClick={() => setShiftMode('12h')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    shiftMode === '12h' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Shift 12 Jam
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Konfigurasi jam kerja shift operasional One For All. Setiap hari terbagi atas 2 shift utama dengan waktu mulai kerja (anchor) diset pada pukul <strong>07:00 pagi</strong>.
            </p>

            {/* Shift Timeline visual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Shift 1 */}
              <div className={`p-4 rounded-xl border transition-all ${
                currentActiveShift.name.includes('Shift 1') ? 'bg-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-950/10' : 'bg-slate-950/60 border-slate-850'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-200">Shift 1 (Pagi)</span>
                  </div>
                  {currentActiveShift.name.includes('Shift 1') && (
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20">Aktif Sekarang</span>
                  )}
                </div>
                <div className="font-mono text-base font-black text-white">{shiftMode === '8h' ? '07:00 - 15:00' : '07:00 - 19:00'}</div>
                <div className="text-[9.5px] text-slate-500 font-medium mt-1">Durasi: {shiftMode === '8h' ? '8' : '12'} Jam Kerja Efektif</div>
              </div>

              {/* Shift 2 */}
              <div className={`p-4 rounded-xl border transition-all ${
                currentActiveShift.name.includes('Shift 2') ? 'bg-indigo-500/5 border-indigo-500/20 shadow-lg shadow-indigo-950/10' : 'bg-slate-950/60 border-slate-850'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-200">Shift 2 (Malam/Sore)</span>
                  </div>
                  {currentActiveShift.name.includes('Shift 2') && (
                    <span className="text-[9px] bg-indigo-500/15 text-indigo-400 font-bold px-2 py-0.5 rounded border border-indigo-500/20">Aktif Sekarang</span>
                  )}
                </div>
                <div className="font-mono text-base font-black text-white">{shiftMode === '8h' ? '15:00 - 23:00' : '19:00 - 07:00'}</div>
                <div className="text-[9.5px] text-slate-500 font-medium mt-1">Durasi: {shiftMode === '8h' ? '8' : '12'} Jam Kerja Efektif</div>
              </div>
            </div>

            {/* Allocation Count Badges */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Alokasi Karyawan:</span>
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-850">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Shift 1 Pagi: <strong className="text-emerald-400 font-bold">{processedEmployees.filter(e => e.workShift === 'Shift 1').length}</strong> Karyawan</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-850">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>Shift 2 Malam: <strong className="text-indigo-400 font-bold">{processedEmployees.filter(e => e.workShift === 'Shift 2').length}</strong> Karyawan</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-850">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Regular (Kantor): <strong className="text-slate-300 font-bold">{processedEmployees.filter(e => e.workShift === 'Regular').length}</strong> Karyawan</span>
              </div>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="hidden xl:block w-[1px] bg-slate-800 self-stretch" />

          {/* Quick Assign Shift Panel */}
          <div className="w-full xl:w-80 space-y-3 bg-slate-950/30 p-4 rounded-xl border border-slate-850/60">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Alokasi Shift Cepat</span>
            </h4>
            <p className="text-[10.5px] text-slate-400">
              Pilih karyawan aktif untuk memindahkan atau menetapkan shift kerja operasional mereka secara langsung.
            </p>

            <div className="space-y-2.5 pt-1">
              <div>
                <label className="text-[9px] text-slate-500 font-bold block uppercase mb-1">KARYAWAN ONE FOR ALL</label>
                <select
                  value={quickAssignEmpId}
                  onChange={(e) => setQuickAssignEmpId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.position} - {emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] text-slate-500 font-bold block uppercase mb-1">TETAPKAN JADWAL SHIFT</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setQuickAssignShift('Shift 1')}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      quickAssignShift === 'Shift 1'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Shift 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAssignShift('Shift 2')}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      quickAssignShift === 'Shift 2'
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Shift 2
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickAssignShift('Regular')}
                    className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      quickAssignShift === 'Regular'
                        ? 'bg-slate-800 border-slate-750 text-white'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Regular
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={isAssigningShift || !quickAssignEmpId}
                onClick={async () => {
                  if (!quickAssignEmpId) return;
                  await handleAssignShift(quickAssignEmpId, quickAssignShift);
                  setQuickAssignEmpId('');
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 rounded-lg text-xs font-bold text-white cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isAssigningShift ? 'Menyimpan...' : 'Terapkan Shift'}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 3. CHART & ANALYTICS BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Attendance by Dept Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-white">Rata-rata Kehadiran per Bagian (Departemen)</h3>
            </div>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded">Target &gt; 95%</span>
          </div>

          <div className="space-y-3.5 pt-2">
            {deptAttendanceStats.slice(0, 6).map((dept, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-mono text-[10px]">{index + 1}.</span>
                    <span>{dept.name}</span>
                    <span className="text-[9px] text-slate-500 font-normal">({dept.count} Kry)</span>
                  </span>
                  <span className={`font-mono font-bold ${dept.rate >= 95 ? 'text-emerald-400' : dept.rate >= 88 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {dept.rate}%
                  </span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex">
                  <div 
                    style={{ width: `${dept.rate}%` }} 
                    className={`rounded-full h-full transition-all duration-500 ${
                      dept.rate >= 95 ? 'bg-gradient-to-r from-emerald-600 to-emerald-450' : 
                      dept.rate >= 88 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 
                      'bg-gradient-to-r from-rose-600 to-rose-400'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual Attendance Guide & Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Aturan Kalkulasi Absensi</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Persentase kehadiran dihitung secara proporsional berdasarkan rumus standardisasi HRD One For All:
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850/60 font-mono text-[10.5px] text-slate-300 space-y-1.5">
              <div className="font-bold text-blue-400 text-[10px] mb-1">RUMUS PERSENTASE:</div>
              <div>Rate = (Hadir + Terlambat * 0.5) / Total Hari</div>
              <div className="text-[9px] text-slate-500">Total Hari = Hadir + Terlambat + Alpa + Izin</div>
            </div>

            <div className="space-y-2 pt-1 text-[11px] text-slate-400">
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold mt-0.5">●</span>
                <p><strong>Kehadiran Prima (&gt;= 95%):</strong> Kinerja operasional sangat baik, memenuhi jam kerja efektif.</p>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-amber-500 font-bold mt-0.5">●</span>
                <p><strong>Perlu Perhatian (85% - 94%):</strong> Karyawan sering mengambil izin atau melakukan keterlambatan.</p>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-rose-500 font-bold mt-0.5">●</span>
                <p><strong>Kritis (&lt; 85%):</strong> Risiko SP-1/SP-2 karena tingginya tingkat mangkir (Alpa) tanpa izin.</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-950/10 p-3 rounded-xl border border-blue-500/10 text-[10px] text-blue-400/90 leading-normal flex items-start gap-1.5">
            <ClipboardCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Setiap data absensi terintegrasi otomatis untuk perhitungan payroll, tunjangan makan, dan lembur bulanan.</span>
          </div>
        </div>
      </div>

      {/* 4. FILTER BAR AND SEARCH */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-500" />
          </span>
          <input
            type="text"
            placeholder="Cari nama karyawan..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-850 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Department filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-2 py-1 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold">BAGIAN:</span>
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border-none text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer pr-1"
            >
              <option value="">Semua Bagian</option>
              {departments.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Rate status filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-2 py-1 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold">STATUS RATE:</span>
            <select
              value={rateFilter}
              onChange={(e) => { setRateFilter(e.target.value as any); setCurrentPage(1); }}
              className="bg-transparent border-none text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">Semua Persentase</option>
              <option value="high">Sangat Baik (95%+)</option>
              <option value="warning">Menengah (85%-94%)</option>
              <option value="critical">Kritis (&lt;85%)</option>
            </select>
          </div>

          {/* Shift filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-2 py-1 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold">SHIFT:</span>
            <select
              value={shiftFilter}
              onChange={(e) => { setShiftFilter(e.target.value as any); setCurrentPage(1); }}
              className="bg-transparent border-none text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">Semua Shift</option>
              <option value="Shift 1">Shift 1 (Pagi)</option>
              <option value="Shift 2">Shift 2 (Malam)</option>
              <option value="Regular">Regular (Kantor)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. MAIN DATA TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-850 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Karyawan</th>
                <th className="py-3 px-3">Shift Kerja</th>
                <th className="py-3 px-3">Hadir (Hari)</th>
                <th className="py-3 px-3">Terlambat</th>
                <th className="py-3 px-3">Alpa</th>
                <th className="py-3 px-3">Izin/Sakit/Cuti</th>
                <th className="py-3 px-3">Total Siklus</th>
                <th className="py-3 px-3">Persentase</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/50 text-xs">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                    Tidak ada data absensi karyawan ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp, idx) => {
                  const rate = emp.attendanceRate || 100;
                  const totalCycle = (emp.daysPresent || 0) + (emp.daysLate || 0) + (emp.daysAbsent || 0) + (emp.daysPermit || 0);
                  const shiftVal = emp.workShift || 'Regular';
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-950/20 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{emp.position} &bull; {emp.department}</div>
                      </td>
                      <td className="py-3 px-3">
                        {shiftVal === 'Shift 1' ? (
                          <span className="inline-flex items-center gap-1 text-[9.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold">
                            Shift 1 (Pagi)
                          </span>
                        ) : shiftVal === 'Shift 2' ? (
                          <span className="inline-flex items-center gap-1 text-[9.5px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md font-bold">
                            Shift 2 (Malam)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9.5px] bg-slate-950 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-md">
                            Regular
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        {emp.daysPresent}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-amber-500">
                        {emp.daysLate}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-rose-500">
                        {emp.daysAbsent}
                      </td>
                      <td className="py-3 px-3 font-mono text-blue-400">
                        {emp.daysPermit}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {totalCycle} Hari
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                           <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            rate >= 95 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            rate >= 85 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {rate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="px-2 py-1 rounded text-[10.5px] font-bold bg-slate-950 hover:bg-emerald-500/10 border border-slate-800 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-400 transition-all cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Input Absen</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION PANEL */}
        {totalPages > 1 && (
          <div className="bg-slate-950/60 p-3 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>
              Menampilkan {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(totalItems, currentPage * itemsPerPage)} dari {totalItems} Karyawan
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-1 border border-slate-800 rounded bg-slate-900 hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-bold text-slate-200">
                Hal {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1 border border-slate-800 rounded bg-slate-900 hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. EDIT/RECORD ATTENDANCE MODAL */}
      {editingEmp && (
        <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setEditingEmp(null)} />
          
          <div className="relative bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-800 overflow-hidden z-10 animate-scale-in">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-850 flex items-center justify-between bg-slate-950/40">
              <div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Update Absensi
                </span>
                <h3 className="text-sm font-bold text-white mt-1">Input Data Kehadiran Karyawan</h3>
              </div>
              <button 
                onClick={() => setEditingEmp(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Profile Card */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <div className="font-bold text-white text-xs">{editingEmp.name}</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">{editingEmp.position} &bull; {editingEmp.department}</div>
              </div>

              {saveSuccess ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-emerald-400 animate-pulse text-xs font-bold">
                  <CheckCircle className="w-12 h-12 text-emerald-500" />
                  <span>Data Kehadiran Berhasil Disimpan!</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Hadir */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Hadir (Hari)</label>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={formPresent}
                        onChange={(e) => setFormPresent(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-bold font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    
                    {/* Terlambat */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Terlambat (Hari)</label>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={formLate}
                        onChange={(e) => setFormLate(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-bold font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Alpa */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Alpa / Mangkir (Hari)</label>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={formAbsent}
                        onChange={(e) => setFormAbsent(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-bold font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Izin / Cuti */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Izin / Sakit / Cuti (Hari)</label>
                      <input
                        type="number"
                        min="0"
                        max="31"
                        value={formPermit}
                        onChange={(e) => setFormPermit(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-bold font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Shift Selection */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                    <label className="text-[10px] text-slate-500 font-bold block uppercase mb-1.5">Shift Kerja Terpilih</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormShift('Shift 1')}
                        className={`py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                          formShift === 'Shift 1'
                            ? 'bg-emerald-600 border-emerald-500 text-white font-extrabold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        Shift 1 (Pagi)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormShift('Shift 2')}
                        className={`py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                          formShift === 'Shift 2'
                            ? 'bg-indigo-600 border-indigo-500 text-white font-extrabold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        Shift 2 (Malam)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormShift('Regular')}
                        className={`py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                          formShift === 'Regular'
                            ? 'bg-slate-800 border-slate-700 text-white font-extrabold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        Regular
                      </button>
                    </div>
                  </div>

                  {/* Calculated Simulation Rate */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-850/70 flex items-center justify-between text-xs mt-2">
                    <span className="text-slate-400 font-medium">Estimasi Rate Kehadiran:</span>
                    <strong className="text-emerald-450 font-bold font-mono">
                      {formPresent + formLate + formAbsent + formPermit > 0 
                        ? `${Math.round(((formPresent + formLate * 0.5) / (formPresent + formLate + formAbsent + formPermit)) * 100 * 10) / 10}%`
                        : '0%'
                      }
                    </strong>
                  </div>

                  <div className="pt-3 border-t border-slate-850 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditingEmp(null)}
                      className="px-4 py-2 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveAttendance}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 hover:border-emerald-450 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-950/20 disabled:opacity-50"
                    >
                      {isSaving ? 'Menyimpan...' : 'Simpan Absensi'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
