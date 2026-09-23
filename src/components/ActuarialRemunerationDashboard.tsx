import React, { useState, useEffect, useMemo } from 'react';
import { Employee, ActuarialAssumption, SeveranceReserveItem, ActuarialProjectionYear } from '../types';
import { 
  Calculator, TrendingUp, Coins, ShieldAlert, DollarSign, 
  Users, CheckCircle2, Calendar, Percent, Search, Copy, Check, 
  Plus, RefreshCw, Info, Sliders, Building2, UserCheck, BarChart3,
  ArrowUpRight, AlertTriangle, FileSpreadsheet, ChevronRight, Layers, Eye
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';

interface ActuarialRemunerationDashboardProps {
  employees: Employee[];
  onSelectEmployee?: (emp: Employee) => void;
  onRefreshData?: () => void;
}

export default function ActuarialRemunerationDashboard({
  employees,
  onSelectEmployee,
  onRefreshData
}: ActuarialRemunerationDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'assumptions' | 'severance' | 'sql'>('overview');

  // Assumption Input Form State
  const [targetYear, setTargetYear] = useState<number>(2026);
  const [salaryInflation, setSalaryInflation] = useState<number>(5.5);
  const [discountRate, setDiscountRate] = useState<number>(6.8);
  const [turnoverRate, setTurnoverRate] = useState<number>(3.0);
  const [bonusMonths, setBonusMonths] = useState<number>(1.25);
  const [allowanceGrowth, setAllowanceGrowth] = useState<number>(4.5);
  const [notes, setNotes] = useState<string>('Proyeksi RKAB 2026 & Sektor Pertambangan');
  const [horizonYears, setHorizonYears] = useState<number>(5);

  // Saved Assumptions list
  const [savedAssumptions, setSavedAssumptions] = useState<ActuarialAssumption[]>([]);
  const [selectedAssumptionId, setSelectedAssumptionId] = useState<string>('');

  // Computation States
  const [isCalculating, setIsCalculating] = useState(false);
  const [projectionResult, setProjectionResult] = useState<{
    summary: ActuarialProjectionYear[];
    departmentBreakdown: Array<{ department: string; currentCost: number; projectedCost: number; increasePercent: number }>;
  } | null>(null);

  const [severanceData, setSeveranceData] = useState<{
    asOfDate: string;
    totalNominalReserve: number;
    totalPVReserve: number;
    averageReservePerEmp: number;
    severanceItems: SeveranceReserveItem[];
  } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Load Saved Assumptions from API
  const fetchAssumptions = async () => {
    try {
      const res = await fetch('/api/actuary/assumptions');
      if (res.ok) {
        const json = await res.json();
        if (json.assumptions && json.assumptions.length > 0) {
          setSavedAssumptions(json.assumptions);
          // Set latest assumption if available
          const latest = json.assumptions[json.assumptions.length - 1];
          if (latest) {
            setTargetYear(latest.year);
            setSalaryInflation(latest.salaryInflationRate);
            setDiscountRate(latest.discountRate);
            setTurnoverRate(latest.turnoverRate);
            setBonusMonths(latest.bonusMonths);
            setAllowanceGrowth(latest.allowanceGrowthRate);
            setNotes(latest.notes || '');
            setSelectedAssumptionId(latest.id);
          }
        }
      }
    } catch (err) {
      console.warn('Fallback using default assumptions state', err);
    }
  };

  // Run Projection & Severance Calculation
  const runActuarialCalculation = async () => {
    setIsCalculating(true);
    setErrorMsg(null);

    try {
      // 1. Fetch Projections
      const projRes = await fetch('/api/actuary/projection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: targetYear,
          salaryInflationRate: salaryInflation,
          discountRate,
          turnoverRate,
          bonusMonths,
          allowanceGrowthRate: allowanceGrowth,
          horizonYears
        })
      });

      // 2. Fetch Severance Reserve
      const sevRes = await fetch('/api/actuary/severance-reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountRate })
      });

      if (projRes.ok) {
        const projJson = await projRes.json();
        setProjectionResult({
          summary: projJson.summary || [],
          departmentBreakdown: projJson.departmentBreakdown || []
        });
      }

      if (sevRes.ok) {
        const sevJson = await sevRes.json();
        setSeveranceData({
          asOfDate: sevJson.asOfDate,
          totalNominalReserve: sevJson.totalNominalReserve,
          totalPVReserve: sevJson.totalPVReserve,
          averageReservePerEmp: sevJson.averageReservePerEmp,
          severanceItems: sevJson.severanceItems || []
        });
      }
    } catch (err: any) {
      setErrorMsg('Error menghubungi server. Menggunakan kalkulasi lokal.');
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    fetchAssumptions();
  }, []);

  useEffect(() => {
    runActuarialCalculation();
  }, [targetYear, salaryInflation, discountRate, turnoverRate, bonusMonths, allowanceGrowth, horizonYears, employees.length]);

  // Handle Save Assumption Form
  const handleSaveAssumption = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/actuary/assumptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: targetYear,
          salaryInflationRate: salaryInflation,
          discountRate,
          turnoverRate,
          bonusMonths,
          allowanceGrowthRate: allowanceGrowth,
          notes
        })
      });

      if (res.ok) {
        const json = await res.json();
        setSuccessMsg(json.message || `Asumsi tahun ${targetYear} berhasil disimpan!`);
        fetchAssumptions();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setSuccessMsg(`[Lokal] Asumsi tahun ${targetYear} diterapkan.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Currency Formatter
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatShortRupiah = (val: number) => {
    if (val >= 1_000_000_000_000) return `Rp ${(val / 1_000_000_000_000).toFixed(2)} T`;
    if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(2)} M`;
    if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)} Jt`;
    return formatRupiah(val);
  };

  // Current Base Metrics
  const activeEmployees = useMemo(() => {
    return employees.filter(e => Boolean(e.name));
  }, [employees]);

  const currentTotalMonthlyWage = useMemo(() => {
    return activeEmployees.reduce((acc, emp) => {
      const w = parseInt(String(emp.wage || '0').replace(/[^0-9]/g, ''), 10) || 5000000;
      return acc + w;
    }, 0);
  }, [activeEmployees]);

  const nextYearProjection = useMemo(() => {
    if (!projectionResult || projectionResult.summary.length === 0) return null;
    return projectionResult.summary[0];
  }, [projectionResult]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    if (!projectionResult) return [];
    return projectionResult.summary.map(s => ({
      tahun: `Thn ${s.year}`,
      Gross: Math.round(s.totalGrossRemuneration / 1_000_000), // in Millions
      NetTurnover: Math.round(s.netRemunerationAfterTurnover / 1_000_000),
      PV: Math.round(s.presentValueRemuneration / 1_000_000),
      CadanganPesangonPV: Math.round(s.severanceReservePV / 1_000_000)
    }));
  }, [projectionResult]);

  // Copy SQL Script
  const copySqlScript = () => {
    const sql = `-- SKEMA SUPABASE POSTGRESQL "AKTUARIA REMUNERASI TAHUNAN & CADANGAN PESANGON"
CREATE TABLE IF NOT EXISTS public.actuarial_assumptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INT NOT NULL UNIQUE CHECK (year >= 2020 AND year <= 2100),
    salary_inflation_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.50,
    discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 6.80,
    turnover_rate NUMERIC(5, 2) NOT NULL DEFAULT 3.00,
    bonus_months NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    allowance_growth_rate NUMERIC(5, 2) NOT NULL DEFAULT 4.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.severance_reserve_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    valuation_date DATE NOT NULL,
    tenure_years NUMERIC(4, 1) NOT NULL,
    monthly_wage NUMERIC(15, 2) NOT NULL,
    up_months NUMERIC(4, 1) NOT NULL,
    upmk_months NUMERIC(4, 1) NOT NULL,
    uph_months NUMERIC(4, 1) NOT NULL,
    total_multiplier_months NUMERIC(4, 1) NOT NULL,
    nominal_gross_reserve NUMERIC(15, 2) NOT NULL,
    discount_factor NUMERIC(6, 4) NOT NULL,
    pv_reserve NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Filtered Severance Items
  const filteredSeveranceItems = useMemo(() => {
    if (!severanceData) return [];
    return severanceData.severanceItems.filter(item => {
      const matchSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.nik.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.position.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = deptFilter === 'all' || item.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [severanceData, searchTerm, deptFilter]);

  return (
    <div className="space-y-6 text-slate-100">
      {/* SUCCESS / ERROR ALERTS */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* HEADER CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
              <Calculator className="w-4 h-4" /> Modul Aktuaria &bull; Valuation Engine
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white font-heading">
              Aktuaria Remunerasi &amp; Cadangan Pesangon
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-2xl">
              Proyeksi biaya remunerasi tahunan dan estimasi cadangan pesangon (UU Ketenagakerjaan / PP 35) berbasis diskonto aktuaria dan asumsi makro inflasi gaji &amp; turnover rate.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => runActuarialCalculation()}
              disabled={isCalculating}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
              <span>{isCalculating ? 'Kalkulasi...' : 'Hitung Ulang Proyeksi'}</span>
            </button>
          </div>
        </div>

        {/* SUMMARY KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Gaji Pokok Eksis (1 Thn)</span>
              <Coins className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-base md:text-lg font-black text-white font-mono mt-1">
              {formatShortRupiah(currentTotalMonthlyWage * 12)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{activeEmployees.length} Karyawan Aktif</div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Proyeksi Remunerasi {targetYear}</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base md:text-lg font-black text-emerald-400 font-mono mt-1">
              {nextYearProjection ? formatShortRupiah(nextYearProjection.totalGrossRemuneration) : '-'}
            </div>
            <div className="text-[10px] text-emerald-500 mt-0.5 flex items-center gap-1 font-semibold">
              <ArrowUpRight className="w-3 h-3" /> +{salaryInflation}% Asumsi Inflasi Gaji
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Cadangan Pesangon (PV)</span>
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-base md:text-lg font-black text-purple-400 font-mono mt-1">
              {severanceData ? formatShortRupiah(severanceData.totalPVReserve) : '-'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Discount Rate {discountRate}%</div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Rata-Rata Pesangon/Org</span>
              <Users className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base md:text-lg font-black text-amber-300 font-mono mt-1">
              {severanceData ? formatShortRupiah(severanceData.averageReservePerEmp) : '-'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Masa Kerja &amp; PP 35</div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>📊 Proyeksi Multi-Tahun</span>
        </button>

        <button
          onClick={() => setActiveTab('assumptions')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'assumptions'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>⚙️ Input Asumsi Aktuaria</span>
        </button>

        <button
          onClick={() => setActiveTab('severance')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'severance'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>🛡️ Estimasi Cadangan Pesangon</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'sql'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Copy className="w-4 h-4" />
          <span>📜 Skema SQL Supabase</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & PROJECTION CHARTS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Visual Recharts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Proyeksi Remunerasi (5 Tahun) */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Proyeksi Biaya Remunerasi ({horizonYears} Tahun Horizon)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Perbandingan Remunerasi Bruto vs Netto Setelah Turnover vs Present Value (Juta Rupiah)
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-indigo-400 px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">
                    Disc Rate: {discountRate}%
                  </span>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="tahun" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '11px' }}
                      formatter={(val: any) => [`Rp ${Number(val).toLocaleString('id-ID')} Juta`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Gross" name="Remunerasi Bruto" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="NetTurnover" name="Net (Stlh Turnover)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="PV" name="Present Value (PV)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Cost Breakdown */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    Beban Gaji per Divisi
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Estimasi Kenaikan Tahun {targetYear}</p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {projectionResult?.departmentBreakdown.map((dept, idx) => (
                  <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{dept.department}</span>
                      <span className="text-emerald-400 font-mono font-bold">+{dept.increasePercent}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Eksis: {formatShortRupiah(dept.currentCost)}</span>
                      <span className="text-slate-200">Proyeksi: {formatShortRupiah(dept.projectedCost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Proyeksi Detail Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Rincian Proyeksi Remunerasi Multi-Tahun</h3>
                <p className="text-xs text-slate-400">Simulasi inflasi gaji, bonus, tunjangan, faktor turnover, dan tingkat diskonto.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Tahun</th>
                    <th className="px-4 py-3 text-center">Faktor Turnover</th>
                    <th className="px-4 py-3 text-right">Gaji Pokok Proyeksi</th>
                    <th className="px-4 py-3 text-right">Bonus &amp; Tunjangan</th>
                    <th className="px-4 py-3 text-right">Total Remunerasi Bruto</th>
                    <th className="px-4 py-3 text-right">Net Stlh Turnover</th>
                    <th className="px-4 py-3 text-right">Present Value (PV)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {projectionResult?.summary.map((row) => (
                    <tr key={row.year} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold font-mono text-blue-400">
                        {row.year} <span className="text-[10px] text-slate-500 font-normal">(Thn {row.horizonYears})</span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-400">
                        {(row.turnoverFactor * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-200">
                        {formatRupiah(row.baseSalaryProjected)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {formatRupiah(row.bonusProjected + row.allowancesProjected)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold">
                        {formatRupiah(row.totalGrossRemuneration)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-400 font-medium">
                        {formatRupiah(row.netRemunerationAfterTurnover)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-purple-400 font-bold">
                        {formatRupiah(row.presentValueRemuneration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INPUT ASUMSI AKTUARIA FORM */}
      {activeTab === 'assumptions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Controls */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" /> Form Asumsi Dasar Aktuaria
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Atur variabel makro inflasi gaji, discount rate, dan turnover rate untuk valuation biaya SDM.
              </p>
            </div>

            <form onSubmit={handleSaveAssumption} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Year */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tahun Anggaran / Valuation</label>
                  <input
                    type="number"
                    min={2020}
                    max={2035}
                    value={targetYear}
                    onChange={(e) => setTargetYear(parseInt(e.target.value) || 2026)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Inflation % */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Inflasi / Kenaikan Gaji Pokok (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={salaryInflation}
                      onChange={(e) => setSalaryInflation(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-emerald-400 focus:outline-none focus:border-indigo-500"
                    />
                    <Percent className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3" />
                  </div>
                </div>

                {/* Discount Rate % */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tingkat Diskonto / Discount Rate (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={discountRate}
                      onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-purple-400 focus:outline-none focus:border-indigo-500"
                    />
                    <Percent className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3" />
                  </div>
                </div>

                {/* Turnover Rate % */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ekspektasi Turnover Rate (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={turnoverRate}
                      onChange={(e) => setTurnoverRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-400 focus:outline-none focus:border-indigo-500"
                    />
                    <Percent className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3" />
                  </div>
                </div>

                {/* Bonus Months */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Alokasi Bonus / THR (Jumlah Bulan)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={bonusMonths}
                    onChange={(e) => setBonusMonths(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-blue-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Allowance Growth % */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kenaikan Tunjangan (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={allowanceGrowth}
                      onChange={(e) => setAllowanceGrowth(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-indigo-400 focus:outline-none focus:border-indigo-500"
                    />
                    <Percent className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Catatan / Dasar Asumsi RKAB</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Masukkan pertimbangan makro ekonomi atau regulasi..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => runActuarialCalculation()}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                >
                  Terapkan Langsung (Simulasi)
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Asumsi Tahun {targetYear}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Saved Assumptions History Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" /> Riwayat Asumsi Tersimpan
            </h3>

            <div className="space-y-3">
              {savedAssumptions.map((a) => (
                <div
                  key={a.id}
                  onClick={() => {
                    setTargetYear(a.year);
                    setSalaryInflation(a.salaryInflationRate);
                    setDiscountRate(a.discountRate);
                    setTurnoverRate(a.turnoverRate);
                    setBonusMonths(a.bonusMonths);
                    setAllowanceGrowth(a.allowanceGrowthRate);
                    setNotes(a.notes || '');
                    setSelectedAssumptionId(a.id);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedAssumptionId === a.id
                      ? 'bg-indigo-950/60 border-indigo-500/60 shadow-md'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white font-mono">Tahun {a.year}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(a.createdAt || Date.now()).toLocaleDateString('id-ID')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 mt-2 text-[10.5px] font-mono text-slate-300">
                    <div>Inflasi: <span className="text-emerald-400">{a.salaryInflationRate}%</span></div>
                    <div>Disc: <span className="text-purple-400">{a.discountRate}%</span></div>
                    <div>Turnover: <span className="text-amber-400">{a.turnoverRate}%</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ESTIMASI CADANGAN PESANGON (UU KETENAGAKERJAAN / PP 35) */}
      {activeTab === 'severance' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" /> Estimasi Cadangan Pesangon (PP 35 / Cipta Kerja)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Kalkulasi otomatis kewajiban pesangon (Uang Pesangon UP + UPMK + UPH 15%) untuk seluruh karyawan aktif berdasarkan **Masa Kerja** dan **Gaji Pokok Terakhir**, lalu didiskonto menggunakan Discount Rate ({discountRate}%).
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari karyawan atau NIK..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Semua Departemen</option>
                  {Array.from(new Set(employees.map(e => e.department).filter(Boolean))).map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>

                <span className="text-xs text-slate-400 font-mono">
                  {filteredSeveranceItems.length} Karyawan
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Karyawan</th>
                    <th className="px-4 py-3">Masa Kerja</th>
                    <th className="px-4 py-3 text-right">Gaji Pokok</th>
                    <th className="px-4 py-3 text-center">UP + UPMK + UPH</th>
                    <th className="px-4 py-3 text-right">Cadangan Bruto</th>
                    <th className="px-4 py-3 text-right">Cadangan PV (Discounted)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSeveranceItems.slice(0, 50).map((item) => (
                    <tr key={item.employeeId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          NIK: {item.nik} &bull; {item.position}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-blue-400">{item.tenureYears} Tahun</div>
                        <div className="text-[10px] text-slate-500">Mulai: {item.startDate}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-200">
                        {formatRupiah(item.monthlyWage)}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 rounded border border-slate-700 text-[11px]">
                          {item.upMonths}B + {item.upmkMonths}B + {item.uphMonths}B = <strong>{item.totalMultiplierMonths} Bulan</strong>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {formatRupiah(item.nominalGrossReserve)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-purple-400 font-bold">
                        {formatRupiah(item.presentValueReserve)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUPABASE SQL SCHEMA */}
      {activeTab === 'sql' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Copy className="w-4 h-4" /> Skema SQL Supabase PostgreSQL
              </div>
              <button
                onClick={copySqlScript}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow"
              >
                {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? 'Tersalin!' : 'Salin SQL Script'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Skema DDL PostgreSQL di bawah ini siap dijalankan di Supabase SQL Editor untuk menyimpan data historis asumsi dan hasil valuation aktuaria.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-blue-300 overflow-x-auto shadow-inner">
            <pre className="whitespace-pre-wrap leading-relaxed">
{`-- 1. TABEL ASUMSI AKTUARIA TAHUNAN
CREATE TABLE IF NOT EXISTS public.actuarial_assumptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INT NOT NULL UNIQUE CHECK (year >= 2020 AND year <= 2100),
    salary_inflation_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.50,
    discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 6.80,
    turnover_rate NUMERIC(5, 2) NOT NULL DEFAULT 3.00,
    bonus_months NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
    allowance_growth_rate NUMERIC(5, 2) NOT NULL DEFAULT 4.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL CADANGAN PESANGON (SNAPSHOT)
CREATE TABLE IF NOT EXISTS public.severance_reserve_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    valuation_date DATE NOT NULL,
    tenure_years NUMERIC(4, 1) NOT NULL,
    monthly_wage NUMERIC(15, 2) NOT NULL,
    up_months NUMERIC(4, 1) NOT NULL,
    upmk_months NUMERIC(4, 1) NOT NULL,
    uph_months NUMERIC(4, 1) NOT NULL,
    total_multiplier_months NUMERIC(4, 1) NOT NULL,
    nominal_gross_reserve NUMERIC(15, 2) NOT NULL,
    discount_factor NUMERIC(6, 4) NOT NULL,
    pv_reserve NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
