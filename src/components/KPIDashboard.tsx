import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import { 
  TrendingUp, Target, Users, Briefcase, Award, Search, Filter, 
  Edit3, ChevronLeft, ChevronRight, Sparkles, CheckCircle, Clock
} from 'lucide-react';
import DataExchangeBar from './DataExchangeBar';

interface KPIDashboardProps {
  employees: Employee[];
  onUpdateEmployee: (empId: string, updatedData: Partial<Employee>) => Promise<void>;
  onUploadSuccess?: () => void;
}

export default function KPIDashboard({
  employees,
  onUpdateEmployee,
  onUploadSuccess
}: KPIDashboardProps) {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Employee to Edit KPI
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [formScore, setFormScore] = useState(80);
  const [formPeriod, setFormPeriod] = useState('Smt 1 - 2026');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Departments List
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => { if (e.department) depts.add(e.department); });
    return Array.from(depts).sort();
  }, [employees]);

  // Process employees using actual KPI scores
  const processedEmployees = useMemo(() => {
    return employees.map((emp) => {
      const hasScore = emp.kpiScore !== undefined && emp.kpiScore !== null && !isNaN(emp.kpiScore);
      const score = hasScore ? emp.kpiScore : undefined;

      let rating: 'A' | 'B' | 'C' | 'D' | 'E' | '-' = '-';
      if (score !== undefined) {
        if (score >= 90) rating = 'A';
        else if (score >= 80) rating = 'B';
        else if (score >= 70) rating = 'C';
        else if (score >= 60) rating = 'D';
        else rating = 'E';
      }

      const period = emp.kpiPeriod || 'Smt 1 - 2026';

      return {
        ...emp,
        kpiScore: score,
        kpiRating: rating,
        kpiPeriod: period,
        hasScore
      };
    });
  }, [employees]);

  // Overall Analytical Calculations
  const metrics = useMemo(() => {
    const total = processedEmployees.length;
    const ratedEmployees = processedEmployees.filter(e => e.hasScore);
    const totalRated = ratedEmployees.length;

    if (total === 0 || totalRated === 0) {
      return { avgKPI: 0, targetRate: 0, topDept: '-', ratingCounts: { A: 0, B: 0, C: 0, D: 0, E: 0 } };
    }

    let kpiSum = 0;
    let achievedCount = 0; // target achieved is KPI >= 80
    const deptSumMap: Record<string, { sum: number, count: number }> = {};
    const ratingMap: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };

    ratedEmployees.forEach(emp => {
      kpiSum += emp.kpiScore || 0;
      if ((emp.kpiScore || 0) >= 80) achievedCount++;

      // Rating tally
      const rat = emp.kpiRating || 'C';
      if (rat !== '-') {
        ratingMap[rat] = (ratingMap[rat] || 0) + 1;
      }

      // Dept tally
      const d = emp.department || 'MANAGEMENT';
      if (!deptSumMap[d]) {
        deptSumMap[d] = { sum: 0, count: 0 };
      }
      deptSumMap[d].sum += emp.kpiScore || 0;
      deptSumMap[d].count++;
    });

    const avgKPI = Math.round((kpiSum / totalRated) * 10) / 10;
    const targetRate = Math.round((achievedCount / totalRated) * 100);

    // Get Top Performing Department
    let topDept = '-';
    let maxDeptAvg = 0;
    Object.entries(deptSumMap).forEach(([dept, data]) => {
      const avg = data.sum / data.count;
      if (avg > maxDeptAvg) {
        maxDeptAvg = avg;
        topDept = dept;
      }
    });

    return {
      avgKPI,
      targetRate,
      topDept,
      ratingCounts: ratingMap,
      deptAverages: Object.entries(deptSumMap).map(([name, data]) => ({
        name,
        avg: Math.round((data.sum / data.count) * 10) / 10,
        count: data.count
      })).sort((a, b) => b.avg - a.avg)
    };
  }, [processedEmployees]);

  // Apply Search and Filters to Employee List
  const filteredEmployees = useMemo(() => {
    return processedEmployees.filter(emp => {
      const query = (searchTerm || '').toLowerCase();
      const matchesSearch = (emp.name || '').toLowerCase().includes(query) || 
                            (emp.position || '').toLowerCase().includes(query) ||
                            (emp.nik || '').toLowerCase().includes(query);
      
      const matchesDept = deptFilter === '' || emp.department === deptFilter;
      const matchesRating = ratingFilter === '' || emp.kpiRating === ratingFilter;

      return matchesSearch && matchesDept && matchesRating;
    });
  }, [processedEmployees, searchTerm, deptFilter, ratingFilter]);

  // Pagination calculation
  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = useMemo(() => {
    return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEmployees, startIndex]);

  // Open Edit Dialog
  const handleOpenEdit = (emp: any) => {
    setEditingEmp(emp);
    setFormScore(emp.kpiScore);
    setFormPeriod(emp.kpiPeriod);
    setSaveSuccess(false);
  };

  // Handle Save
  const handleSaveEdit = async () => {
    if (!editingEmp) return;
    setIsSaving(true);
    try {
      await onUpdateEmployee(editingEmp.id, {
        kpiScore: formScore,
        kpiPeriod: formPeriod
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setEditingEmp(null);
        setSaveSuccess(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pembaruan KPI');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" id="kpi-dashboard-container">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                Kinerja &amp; Produktivitas
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-950 text-slate-400 text-xs font-mono border border-slate-800">
                Key Performance Indicator (KPI)
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white font-heading tracking-tight">
              Kinerja Karyawan (KPI)
            </h1>
            <p className="text-slate-400 text-xs md:text-sm">
              Sistem penilaian kinerja berkala One For All untuk mengevaluasi produktivitas, standar operasi lapangan, dan pencapaian target.
            </p>
          </div>
          
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 flex items-center gap-3">
            <Award className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">KPI Monitoring</div>
              <div className="text-xs font-bold text-slate-200">One For All Sultra Site</div>
            </div>
          </div>
        </div>
      </div>

      {/* DATA EXPORTS / IMPORTS */}
      <DataExchangeBar 
        data={filteredEmployees}
        fileName="laporan_kinerja_kpi"
        onUploadSuccess={onUploadSuccess}
        title="Kelola &amp; Ekspor Data KPI Karyawan"
      />

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="kpi-stats-widgets">
        {/* Metric 1: Average KPI */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rata-Rata Skor KPI</p>
            <h3 className="text-2xl font-extrabold text-emerald-400 font-heading">
              {metrics.avgKPI} <span className="text-xs text-slate-500 font-normal">/ 100</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Target Baseline Evaluasi: 80.0</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20 shrink-0">
            <Target className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Achievement Rate */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1 w-full mr-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tingkat Pencapaian Target</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-extrabold text-blue-400 font-heading">{metrics.targetRate}%</h3>
              <span className="text-[10px] text-slate-500 font-medium">Skor KPI &ge; 80</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full" 
                style={{ width: `${metrics.targetRate}%` }}
              />
            </div>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Top Department */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Departemen Kinerja Terbaik</p>
            <h3 className="text-lg font-extrabold text-amber-400 truncate max-w-[200px]">{metrics.topDept}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Rata-rata penilaian KPI tertinggi</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20 shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KPI Rating Distribution (Left 5 cols) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-5 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Distribusi Klasifikasi Rating KPI</h3>
            <p className="text-[11px] text-slate-400">Rincian penggolongan rating berdasarkan standar baku One For All.</p>
          </div>

          <div className="space-y-3">
            {[
              { rating: 'A', name: 'A - Outstanding (90 - 100)', color: 'bg-emerald-500', text: 'text-emerald-400' },
              { rating: 'B', name: 'B - Exceeds Expectations (80 - 89)', color: 'bg-teal-500', text: 'text-teal-400' },
              { rating: 'C', name: 'C - Meets Expectations (70 - 79)', color: 'bg-blue-500', text: 'text-blue-400' },
              { rating: 'D', name: 'D - Needs Improvement (60 - 69)', color: 'bg-amber-500', text: 'text-amber-400' },
              { rating: 'E', name: 'E - Unsatisfactory (< 60)', color: 'bg-rose-500', text: 'text-rose-400' }
            ].map(item => {
              const count = metrics.ratingCounts[item.rating] || 0;
              const pct = employees.length ? Math.round((count / employees.length) * 100) : 0;
              return (
                <div key={item.rating} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={`font-semibold ${item.text}`}>{item.name}</span>
                    <span className="text-slate-400 font-mono font-medium">{count} Karyawan ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850/60">
                    <div 
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance by Department List (Right 7 cols) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-7 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Peringkat Rata-Rata KPI per Departemen</h3>
            <p className="text-[11px] text-slate-400">Komparasi tingkat kinerja kolektif antar departemen One For All.</p>
          </div>

          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {metrics.deptAverages?.map((item, idx) => {
              let rankingColor = "text-slate-400";
              if (idx === 0) rankingColor = "text-amber-400 font-black";
              else if (idx === 1) rankingColor = "text-slate-300 font-black";
              else if (idx === 2) rankingColor = "text-amber-600 font-black";

              return (
                <div key={item.name} className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono bg-slate-900 border border-slate-800 ${rankingColor}`}>
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-slate-200 truncate">{item.name}</span>
                      <span className="font-mono text-emerald-400 font-bold">{item.avg} <span className="text-[9px] text-slate-500">Avg</span></span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full" 
                        style={{ width: `${item.avg}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI EMPLOYEE TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Daftar Penilaian Kinerja Karyawan</h3>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama atau NIK..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Department */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">Semua Departemen</option>
              {departments.map((dept, i) => (
                <option key={i} value={dept}>{dept}</option>
              ))}
            </select>

            {/* KPI Rating */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">Semua Rating KPI</option>
              <option value="A">A - Outstanding (&ge;90)</option>
              <option value="B">B - Exceeds Expectations (80-89)</option>
              <option value="C">C - Meets Expectations (70-79)</option>
              <option value="D">D - Needs Improvement (60-69)</option>
              <option value="E">E - Unsatisfactory (&lt;60)</option>
            </select>
          </div>
        </div>

        {/* RESULTS TABLE */}
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-850 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                <th className="py-3 px-4">Nama Karyawan</th>
                <th className="py-3 px-4">NIK</th>
                <th className="py-3 px-4">Departemen &amp; Jabatan</th>
                <th className="py-3 px-4 text-center">Skor KPI</th>
                <th className="py-3 px-4 text-center">Rating KPI</th>
                <th className="py-3 px-4 text-center">Periode Evaluasi</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 text-slate-300">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    Tidak ditemukan karyawan dengan kriteria pencarian KPI tersebut.
                  </td>
                </tr>
              ) : (
                currentItems.map((emp) => {
                  let ratingBadge = '';
                  let scoreColor = '';
                  if (emp.kpiRating === 'A') {
                    ratingBadge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                    scoreColor = 'text-emerald-400';
                  } else if (emp.kpiRating === 'B') {
                    ratingBadge = 'bg-teal-500/10 text-teal-400 border border-teal-500/20';
                    scoreColor = 'text-teal-400';
                  } else if (emp.kpiRating === 'C') {
                    ratingBadge = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                    scoreColor = 'text-blue-400';
                  } else if (emp.kpiRating === 'D') {
                    ratingBadge = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                    scoreColor = 'text-amber-400';
                  } else {
                    ratingBadge = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                    scoreColor = 'text-rose-400';
                  }

                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white text-xs">{emp.name}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">{emp.nik || '-'}</td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium text-slate-200">{emp.department}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{emp.position}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-center justify-center w-28 mx-auto space-y-1">
                          <div className="flex justify-between w-full text-[10px] font-mono">
                            <span className={scoreColor}>{emp.kpiScore}</span>
                            <span className="text-slate-500">/ 100</span>
                          </div>
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                            <div 
                              className={`h-full ${emp.kpiRating === 'A' || emp.kpiRating === 'B' ? 'bg-emerald-500' : emp.kpiRating === 'C' ? 'bg-blue-500' : 'bg-rose-500'} rounded-full`}
                              style={{ width: `${emp.kpiScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${ratingBadge}`}>
                          Rating {emp.kpiRating}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-[11px] font-mono text-slate-400">
                        {emp.kpiPeriod}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold border border-transparent hover:border-emerald-500/20"
                          title="Perbarui Penilaian KPI"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Input Nilai</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-850/60 pt-4 text-xs text-slate-400">
            <div>
              Menampilkan <strong className="text-slate-200">{startIndex + 1}</strong> hingga{' '}
              <strong className="text-slate-200">{Math.min(startIndex + itemsPerPage, totalItems)}</strong> dari{' '}
              <strong className="text-slate-200">{totalItems}</strong> Karyawan
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-850 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-850 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingEmp && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2 text-emerald-400">
                <Award className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Input Penilaian KPI</h3>
              </div>
              <button 
                onClick={() => setEditingEmp(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Karyawan</div>
                <div className="text-sm font-black text-white mt-0.5">{editingEmp.name}</div>
                <div className="text-xs text-slate-400">{editingEmp.department} &bull; {editingEmp.position}</div>
              </div>

              {/* KPI Score */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300">Skor Penilaian KPI (0 - 100)</label>
                  <span className="text-xs font-mono font-bold text-emerald-400">{formScore} / 100</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={formScore}
                  onChange={(e) => setFormScore(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0 (Kurang)</span>
                  <span>70 (Cukup)</span>
                  <span>90 (Sempurna)</span>
                </div>
              </div>

              {/* KPI Period */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Periode Evaluasi KPI</label>
                <input 
                  type="text"
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(e.target.value)}
                  placeholder="e.g. Smt 1 - 2026 atau Q2 2026"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all animate-none"
                />
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-400 font-semibold animate-pulse">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Nilai KPI Berhasil Disimpan &amp; Diperbarui!</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setEditingEmp(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-md"
              >
                {isSaving ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Nilai</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
