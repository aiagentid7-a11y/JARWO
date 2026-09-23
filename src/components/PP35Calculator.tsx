import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import { 
  Calculator, Clock, DollarSign, FileText, CheckCircle2, AlertCircle, 
  BookOpen, Layers, ShieldCheck, ArrowRight, Sparkles, User, Info, Plus
} from 'lucide-react';

export type PP35WorkType = 
  | 'workday'                  // Hari Kerja Biasa
  | 'weekend_5day'             // Hari Libur Istirahat / Resmi (5 Hari Kerja/Minggu)
  | 'weekend_6day'             // Hari Libur Istirahat / Resmi (6 Hari Kerja/Minggu)
  | 'holiday_short_5hours';    // Hari Libur Resmi pada Hari Kerja Pendek (5 Jam)

export interface PP35CalculationDetail {
  hourRange: string;
  multiplier: number;
  hours: number;
  indexHours: number;
  amount: number;
}

export interface PP35CalculationResult {
  monthlyWage: number;         // Upah sebulan (Gaji Pokok + Tunjangan Tetap)
  hourlyRate: number;          // Upah per jam (1/173 x Upah Sebulan)
  totalActualHours: number;    // Jam lembur riil
  totalIndexHours: number;     // Total jam konversi / jam setara
  totalOvertimePay: number;    // Total uang lembur (IDR)
  details: PP35CalculationDetail[];
}

export function calculatePP35Overtime(
  monthlyWage: number,
  workType: PP35WorkType,
  hours: number
): PP35CalculationResult {
  const hourlyRate = Math.round(monthlyWage / 173);
  const details: PP35CalculationDetail[] = [];
  let remainingHours = Math.max(0, hours);

  if (workType === 'workday') {
    // Hari Kerja Biasa
    // Jam ke-1: 1.5x
    // Jam ke-2 dst: 2.0x
    if (remainingHours > 0) {
      const h1 = Math.min(1, remainingHours);
      const index1 = h1 * 1.5;
      details.push({
        hourRange: 'Jam ke-1',
        multiplier: 1.5,
        hours: h1,
        indexHours: index1,
        amount: Math.round(index1 * hourlyRate)
      });
      remainingHours -= h1;
    }
    if (remainingHours > 0) {
      const indexRest = remainingHours * 2.0;
      details.push({
        hourRange: `Jam ke-2 s/d ${hours}`,
        multiplier: 2.0,
        hours: remainingHours,
        indexHours: indexRest,
        amount: Math.round(indexRest * hourlyRate)
      });
    }
  } else if (workType === 'weekend_6day') {
    // Hari Libur 6 Hari Kerja (40 Jam/Minggu)
    // Jam 1 s/d 7: 2.0x
    // Jam 8: 3.0x
    // Jam 9 dst: 4.0x
    if (remainingHours > 0) {
      const h1 = Math.min(7, remainingHours);
      const index1 = h1 * 2.0;
      details.push({
        hourRange: `Jam ke-1 s/d ${h1}`,
        multiplier: 2.0,
        hours: h1,
        indexHours: index1,
        amount: Math.round(index1 * hourlyRate)
      });
      remainingHours -= h1;
    }
    if (remainingHours > 0) {
      const h2 = Math.min(1, remainingHours);
      const index2 = h2 * 3.0;
      details.push({
        hourRange: 'Jam ke-8',
        multiplier: 3.0,
        hours: h2,
        indexHours: index2,
        amount: Math.round(index2 * hourlyRate)
      });
      remainingHours -= h2;
    }
    if (remainingHours > 0) {
      const index3 = remainingHours * 4.0;
      details.push({
        hourRange: `Jam ke-9 s/d ${hours}`,
        multiplier: 4.0,
        hours: remainingHours,
        indexHours: index3,
        amount: Math.round(index3 * hourlyRate)
      });
    }
  } else if (workType === 'weekend_5day') {
    // Hari Libur 5 Hari Kerja (40 Jam/Minggu)
    // Jam 1 s/d 8: 2.0x
    // Jam 9: 3.0x
    // Jam 10 dst: 4.0x
    if (remainingHours > 0) {
      const h1 = Math.min(8, remainingHours);
      const index1 = h1 * 2.0;
      details.push({
        hourRange: `Jam ke-1 s/d ${h1}`,
        multiplier: 2.0,
        hours: h1,
        indexHours: index1,
        amount: Math.round(index1 * hourlyRate)
      });
      remainingHours -= h1;
    }
    if (remainingHours > 0) {
      const h2 = Math.min(1, remainingHours);
      const index2 = h2 * 3.0;
      details.push({
        hourRange: 'Jam ke-9',
        multiplier: 3.0,
        hours: h2,
        indexHours: index2,
        amount: Math.round(index2 * hourlyRate)
      });
      remainingHours -= h2;
    }
    if (remainingHours > 0) {
      const index3 = remainingHours * 4.0;
      details.push({
        hourRange: `Jam ke-10 s/d ${hours}`,
        multiplier: 4.0,
        hours: remainingHours,
        indexHours: index3,
        amount: Math.round(index3 * hourlyRate)
      });
    }
  } else if (workType === 'holiday_short_5hours') {
    // Hari Libur Resmi pada Hari Kerja Pendek (5 jam)
    // Jam 1 s/d 5: 2.0x
    // Jam 6: 3.0x
    // Jam 7 dst: 4.0x
    if (remainingHours > 0) {
      const h1 = Math.min(5, remainingHours);
      const index1 = h1 * 2.0;
      details.push({
        hourRange: `Jam ke-1 s/d ${h1}`,
        multiplier: 2.0,
        hours: h1,
        indexHours: index1,
        amount: Math.round(index1 * hourlyRate)
      });
      remainingHours -= h1;
    }
    if (remainingHours > 0) {
      const h2 = Math.min(1, remainingHours);
      const index2 = h2 * 3.0;
      details.push({
        hourRange: 'Jam ke-6',
        multiplier: 3.0,
        hours: h2,
        indexHours: index2,
        amount: Math.round(index2 * hourlyRate)
      });
      remainingHours -= h2;
    }
    if (remainingHours > 0) {
      const index3 = remainingHours * 4.0;
      details.push({
        hourRange: `Jam ke-7 s/d ${hours}`,
        multiplier: 4.0,
        hours: remainingHours,
        indexHours: index3,
        amount: Math.round(index3 * hourlyRate)
      });
    }
  }

  const totalIndexHours = details.reduce((acc, d) => acc + d.indexHours, 0);
  const totalOvertimePay = details.reduce((acc, d) => acc + d.amount, 0);

  return {
    monthlyWage,
    hourlyRate,
    totalActualHours: hours,
    totalIndexHours,
    totalOvertimePay,
    details
  };
}

interface PP35CalculatorProps {
  employees: Employee[];
  onSaveToOvertimeLog?: (log: {
    employeeId: string;
    employeeName: string;
    department: string;
    date: string;
    hours: number;
    ratePerHour: number;
    multiplier: number;
    reason: string;
    totalPay: number;
    pp35WorkType: string;
    pp35IndexHours: number;
    periodType?: 'daily' | 'weekly' | 'monthly';
  }) => void;
  onApplyToEmployeePayroll?: (employeeId: string, overtimeAmount: number) => void;
}

export default function PP35Calculator({
  employees,
  onSaveToOvertimeLog,
  onApplyToEmployeePayroll
}: PP35CalculatorProps) {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [customWageMode, setCustomWageMode] = useState(false);
  const [basicWageInput, setBasicWageInput] = useState(0);
  const [fixedAllowanceInput, setFixedAllowanceInput] = useState(0);
  const [workType, setWorkType] = useState<PP35WorkType>('workday');
  const [otHoursInput, setOtHoursInput] = useState(3);
  const [pp35PeriodType, setPp35PeriodType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [otDate, setOtDate] = useState(new Date().toISOString().split('T')[0]);
  const [otReason, setOtReason] = useState('Lembur operasional lapangan sesuai PP 35/2021');
  const [successMessage, setSuccessMessage] = useState('');

  // Selected employee lookup
  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId);
  }, [employees, selectedEmpId]);

  // Compute monthly wage
  const effectiveMonthlyWage = useMemo(() => {
    if (!customWageMode && selectedEmp) {
      const baseNum = parseInt(String(selectedEmp.wage || '0').replace(/\D/g, ''), 10) || 0;
      const fixNum = selectedEmp.fixedAllowance || 0;
      return baseNum + fixNum;
    }
    return basicWageInput + fixedAllowanceInput;
  }, [customWageMode, selectedEmp, basicWageInput, fixedAllowanceInput]);

  // Calculate result based on PP 35
  const result = useMemo(() => {
    return calculatePP35Overtime(effectiveMonthlyWage, workType, otHoursInput);
  }, [effectiveMonthlyWage, workType, otHoursInput]);

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    if (empId) {
      setCustomWageMode(false);
      const emp = employees.find(e => e.id === empId);
      if (emp) {
        const baseNum = parseInt(String(emp.wage || '0').replace(/\D/g, ''), 10) || 0;
        setBasicWageInput(baseNum);
        setFixedAllowanceInput(emp.fixedAllowance || 0);
      }
    }
  };

  const workTypeLabels: Record<PP35WorkType, string> = {
    workday: 'Hari Kerja Biasa (Max 4 Jam/Hari, 18 Jam/Minggu)',
    weekend_5day: 'Hari Istirahat / Libur Resmi (Sistem 5 Hari Kerja/Minggu)',
    weekend_6day: 'Hari Istirahat / Libur Resmi (Sistem 6 Hari Kerja/Minggu)',
    holiday_short_5hours: 'Hari Libur Resmi pada Hari Kerja Pendek (5 Jam)'
  };

  const handleSaveLog = () => {
    if (!selectedEmp && !customWageMode) {
      alert('Pilih karyawan atau gunakan mode manual!');
      return;
    }

    const empId = selectedEmp ? selectedEmp.id : 'EMP-CUSTOM';
    const empName = selectedEmp ? selectedEmp.name : 'Karyawan Kustom';
    const dept = selectedEmp ? selectedEmp.department : 'Operasional Site';

    if (onSaveToOvertimeLog) {
      onSaveToOvertimeLog({
        employeeId: empId,
        employeeName: empName,
        department: dept,
        date: otDate,
        hours: otHoursInput,
        ratePerHour: result.hourlyRate,
        multiplier: parseFloat((result.totalIndexHours / (otHoursInput || 1)).toFixed(2)),
        reason: `${otReason} [PP35 - ${result.totalIndexHours} jam setara]`,
        totalPay: result.totalOvertimePay,
        pp35WorkType: workTypeLabels[workType],
        pp35IndexHours: result.totalIndexHours,
        periodType: pp35PeriodType
      });
      setSuccessMessage('Kalkulasi lembur PP 35 berhasil ditambahkan ke antrean Log Lembur!');
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const handleApplyPayroll = () => {
    if (!selectedEmp) {
      alert('Pilih karyawan dari master data terlebih dahulu!');
      return;
    }

    if (onApplyToEmployeePayroll) {
      onApplyToEmployeePayroll(selectedEmp.id, result.totalOvertimePay);
      setSuccessMessage(`Nominal Rp ${result.totalOvertimePay.toLocaleString('id-ID')} berhasil disimpan ke Kompensasi Lembur payroll ${selectedEmp.name}!`);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="pp35-overtime-calculator">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-800/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl">
                <Calculator className="w-5 h-5 text-blue-400" />
              </span>
              <h2 className="text-xl font-bold text-white font-heading flex items-center gap-2">
                Kalkulator Lembur Sesuai PP No. 35 Tahun 2021
              </h2>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Formulasi perhitungan upah lembur resmi Pemerintah Republik Indonesia berdasarkan Peraturan Pemerintah No. 35 Tahun 2021 (Pasal 26 - 31). Menggunakan rumus upah sejam <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300 font-mono font-bold">1 / 173 × Upah Sebulan</code> dan faktor pengali berjenjang.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-blue-500/20 shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Standar Kemenaker RI</span>
              <span className="text-[11px] text-slate-300">PP 35/2021 Pasal 26-31</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Form & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: INPUT PARAMETERS (7 COLS) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Input Parameter Lembur Karyawan</span>
            </h3>
            <button
              onClick={() => setCustomWageMode(!customWageMode)}
              className="text-[11px] font-bold text-blue-400 hover:text-blue-300 bg-blue-950/50 hover:bg-blue-900/60 border border-blue-800/50 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
            >
              {customWageMode ? 'Pilih Karyawan Master' : 'Mode Upah Manual'}
            </button>
          </div>

          {/* Employee Selection / Custom Wage Inputs */}
          {!customWageMode ? (
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                Pilih Karyawan dari Master Data
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => handleSelectEmployee(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 [&_option]:bg-slate-900"
              >
                <option value="">-- Pilih Karyawan --</option>
                {employees.map(emp => {
                  const baseNum = parseInt(String(emp.wage || '0').replace(/\D/g, ''), 10) || 0;
                  const fixNum = emp.fixedAllowance || 0;
                  const totalW = baseNum + fixNum;
                  return (
                    <option key={emp.id} value={emp.id}>
                      [{emp.id}] {emp.name} ({emp.department} - {emp.position}) - Upah: Rp {totalW.toLocaleString('id-ID')}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">Upah Pokok Sebulan (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rp</span>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={basicWageInput}
                    onChange={(e) => setBasicWageInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">Tunjangan Tetap (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rp</span>
                  <input
                    type="number"
                    min={0}
                    step={25000}
                    value={fixedAllowanceInput}
                    onChange={(e) => setFixedAllowanceInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode Periode Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold text-slate-400 block">
              Skema Periode Lembur
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setPp35PeriodType('daily')}
                className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  pp35PeriodType === 'daily'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Harian (Daily)</span>
              </button>
              <button
                type="button"
                onClick={() => setPp35PeriodType('weekly')}
                className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  pp35PeriodType === 'weekly'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Mingguan (Weekly)</span>
              </button>
              <button
                type="button"
                onClick={() => setPp35PeriodType('monthly')}
                className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  pp35PeriodType === 'monthly'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Bulanan (Monthly)</span>
              </button>
            </div>
          </div>

          {/* Work Day Category Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold text-slate-400 block">
              Kategori Hari Kerja &amp; Lembur (PP 35 Pasal 31)
            </label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value as PP35WorkType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 [&_option]:bg-slate-900"
            >
              <option value="workday">Hari Kerja Biasa (Jam ke-1: 1.5x, Jam ke-2+: 2.0x)</option>
              <option value="weekend_5day">Hari Libur Istirahat / Resmi - Sistem 5 Hari Kerja (Jam 1-8: 2x, Jam 9: 3x, Jam 10+: 4x)</option>
              <option value="weekend_6day">Hari Libur Istirahat / Resmi - Sistem 6 Hari Kerja (Jam 1-7: 2x, Jam 8: 3x, Jam 9+: 4x)</option>
              <option value="holiday_short_5hours">Hari Libur Resmi pada Hari Kerja Pendek 5 Jam (Jam 1-5: 2x, Jam 6: 3x, Jam 7+: 4x)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Hours Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-400 block">
                Jumlah Jam Lembur Riil
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0.5}
                  max={24}
                  step={0.5}
                  value={otHoursInput}
                  onChange={(e) => setOtHoursInput(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-500 font-bold">Jam</span>
              </div>
            </div>

            {/* Date Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-400 block">
                Tanggal Pelaksanaan
              </label>
              <input
                type="date"
                value={otDate}
                onChange={(e) => setOtDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase font-bold text-slate-400 block">
              Catatan / Justifikasi Lembur Site
            </label>
            <input
              type="text"
              placeholder="Contoh: Overtime pengerukan nikel blok timur jetty..."
              value={otReason}
              onChange={(e) => setOtReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSaveLog}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan ke Log Pengajuan Lembur</span>
            </button>

            {selectedEmp && (
              <button
                onClick={handleApplyPayroll}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Update Kompensasi Payroll</span>
              </button>
            )}
          </div>

          {successMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: LIVE BREAKDOWN & CALCULATION RESULT (5 COLS) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Summary Box */}
          <div className="bg-slate-900 border border-blue-900/40 rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hasil Perhitungan PP 35</span>
              <span className="px-2 py-0.5 bg-blue-950 border border-blue-800/60 rounded text-[10px] text-blue-300 font-mono font-bold">
                Upah/Jam: Rp {result.hourlyRate.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Upah Sebulan (Sebulan)</span>
                <span className="text-sm font-mono font-bold text-white block">
                  Rp {result.monthlyWage.toLocaleString('id-ID')}
                </span>
                <span className="text-[9.5px] text-slate-500 mt-0.5 block">1/173 = Rp {result.hourlyRate.toLocaleString('id-ID')}/jam</span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Total Jam Setara (PP 35)</span>
                <span className="text-sm font-mono font-bold text-teal-400 block">
                  {result.totalIndexHours} Jam Setara
                </span>
                <span className="text-[9.5px] text-slate-500 mt-0.5 block">Dihitung dari {result.totalActualHours} jam riil</span>
              </div>
            </div>

            {/* GRAND TOTAL OVERTIME PAY */}
            <div className="bg-gradient-to-br from-blue-950 to-slate-950 p-4 rounded-xl border border-blue-500/30 text-center space-y-1">
              <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider block">Total Uang Lembur Hak Karyawan</span>
              <strong className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono block">
                Rp {result.totalOvertimePay.toLocaleString('id-ID')}
              </strong>
              <span className="text-[10px] text-slate-400 block">
                Formula: {result.totalIndexHours} jam setara × Rp {result.hourlyRate.toLocaleString('id-ID')}/jam
              </span>
            </div>

            {/* BREAKDOWN TABLE */}
            <div className="space-y-2 pt-2">
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                Rincian Tahapan Pengali (Pasal 31)
              </h4>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-bold text-[9.5px]">
                    <tr>
                      <th className="py-2 px-3">Rentang Jam</th>
                      <th className="py-2 px-2 text-center">Faktor</th>
                      <th className="py-2 px-2 text-center">Jam Setara</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                    {result.details.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-300 font-medium">{item.hourRange}</td>
                        <td className="py-2 px-2 text-center font-bold text-amber-400">{item.multiplier}x</td>
                        <td className="py-2 px-2 text-center text-teal-300 font-mono">{item.indexHours} jam</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                          Rp {item.amount.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LEGAL REFERENCE SUMMARY CARDS (PP NO 35 TAHUN 2021) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-bold text-white font-heading">
            Ringkasan Aturan Perundangan Perhitungan Lembur (PP No. 35 Tahun 2021)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* CARD 1 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px] font-bold block w-fit">
              Pasal 28 - Rumus Dasar
            </span>
            <h4 className="font-bold text-white">Upah Sejam = 1/173 × Upah Sebulan</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Upah sebulan terdiri atas 100% Gaji Pokok + Tunjangan Tetap. Jika upah tanpa tunjangan tetap, dasar perhitungan 100% upah pokok.
            </p>
          </div>

          {/* CARD 2 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="px-2 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded text-[10px] font-bold block w-fit">
              Hari Kerja Biasa
            </span>
            <h4 className="font-bold text-white">Jam Pertama 1.5x, Selanjutnya 2.0x</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Untuk lembur pada hari kerja biasa: Jam ke-1 dibayar 1.5x upah sejam, dan jam ke-2 serta jam-jam berikutnya dibayar 2.0x upah sejam.
            </p>
          </div>

          {/* CARD 3 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-bold block w-fit">
              Hari Libur Resmi / Istirahat
            </span>
            <h4 className="font-bold text-white">Faktor Pengali 2.0x, 3.0x &amp; 4.0x</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              7-8 jam pertama dibayar 2x, jam ke-8/9 dibayar 3x, dan jam ke-9/10 ke atas dibayar 4x upah sejam (Sistem 5/6 hari kerja).
            </p>
          </div>

          {/* CARD 4 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[10px] font-bold block w-fit">
              Pasal 26 - Batas Maksimum
            </span>
            <h4 className="font-bold text-white">Max 4 Jam/Hari &amp; 18 Jam/Minggu</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Waktu kerja lembur hari kerja biasa hanya dapat dilakukan paling banyak 4 (empat) jam dalam 1 hari dan 18 jam dalam 1 minggu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
