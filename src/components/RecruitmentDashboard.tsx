import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import { 
  Users, Search, Edit3, ChevronLeft, ChevronRight, Sparkles, CheckCircle, Clock, BarChart3, HelpCircle
} from 'lucide-react';
import DataExchangeBar from './DataExchangeBar';

interface RecruitmentDashboardProps {
  employees: Employee[];
  onUpdateEmployee: (empId: string, updatedData: Partial<Employee>) => Promise<void>;
  onUploadSuccess?: () => void;
}

export default function RecruitmentDashboard({
  employees,
  onUpdateEmployee,
  onUploadSuccess
}: RecruitmentDashboardProps) {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Employee to Edit Sourcing Channel
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [formSource, setFormSource] = useState('LinkedIn');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Departments List
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => { if (e.department) depts.add(e.department); });
    return Array.from(depts).sort();
  }, [employees]);

  // Recruitment Sources List
  const recruitmentSources = ['LinkedIn', 'Referal', 'JobStreet', 'Disnakertrans', 'Media Sosial', 'Website'];

  // Process employees using actual recruitment source
  const processedEmployees = useMemo(() => {
    return employees.map((emp) => {
      let source = emp.recruitmentSource;
      if (!source || source.trim() === '') {
        source = '-';
      }
      return {
        ...emp,
        recruitmentSource: source
      };
    });
  }, [employees]);

  // Sourcing Effectiveness Calculations
  const metrics = useMemo(() => {
    const total = processedEmployees.length;
    if (total === 0) return { topSource: '-', sourceCounts: {}, totalHired: 0 };

    const sourceMap: Record<string, number> = {};
    processedEmployees.forEach(emp => {
      const src = emp.recruitmentSource || 'LinkedIn';
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });

    let topSource = '-';
    let maxCount = 0;
    Object.entries(sourceMap).forEach(([src, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topSource = src;
      }
    });

    return {
      topSource,
      sourceCounts: sourceMap,
      totalHired: total
    };
  }, [processedEmployees]);

  // Apply Search & Filters
  const filteredEmployees = useMemo(() => {
    return processedEmployees.filter(emp => {
      const query = (searchTerm || '').toLowerCase();
      const matchesSearch = (emp.name || '').toLowerCase().includes(query) || 
                            (emp.position || '').toLowerCase().includes(query) ||
                            (emp.nik || '').toLowerCase().includes(query);
      
      const matchesDept = deptFilter === '' || emp.department === deptFilter;
      const matchesSource = sourceFilter === '' || emp.recruitmentSource === sourceFilter;

      return matchesSearch && matchesDept && matchesSource;
    });
  }, [processedEmployees, searchTerm, deptFilter, sourceFilter]);

  // Pagination
  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = useMemo(() => {
    return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEmployees, startIndex]);

  // Open Edit
  const handleOpenEdit = (emp: any) => {
    setEditingEmp(emp);
    setFormSource(emp.recruitmentSource);
    setSaveSuccess(false);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingEmp) return;
    setIsSaving(true);
    try {
      await onUpdateEmployee(editingEmp.id, {
        recruitmentSource: formSource
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setEditingEmp(null);
        setSaveSuccess(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pembaruan saluran rekrutmen');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" id="recruitment-dashboard-container">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
                SDM &amp; Rekrutmen
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-950 text-slate-400 text-xs font-mono border border-slate-800">
                Sourcing Channels
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white font-heading tracking-tight">
              Analisis Rekrutmen Karyawan
            </h1>
            <p className="text-slate-400 text-xs md:text-sm">
              Pantau efektivitas, kontribusi, dan sebaran asal-usul saluran penarikan tenaga kerja One For All.
            </p>
          </div>
          
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">Sourcing Analysis</div>
              <div className="text-xs font-bold text-slate-200">One For All Sultra Site</div>
            </div>
          </div>
        </div>
      </div>

      {/* DATA EXPORTS / IMPORTS */}
      <DataExchangeBar 
        data={filteredEmployees}
        fileName="laporan_rekrutmen_sourcing"
        onUploadSuccess={onUploadSuccess}
        title="Kelola &amp; Ekspor Data Saluran Rekrutmen"
      />

      {/* RECRUITMENT CHANNELS METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metric 1: Hired Count */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Karyawan Terekrut</p>
            <h3 className="text-2xl font-extrabold text-white font-heading">
              {metrics.totalHired} <span className="text-xs text-slate-500 font-normal">Staf Terdata</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Sebaran dari seluruh divisi One For All Sultra Site</p>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Top Sourcing Channel */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saluran Perekrutan Terbanyak</p>
            <h3 className="text-2xl font-extrabold text-blue-400 font-heading truncate max-w-[250px]">
              {metrics.topSource}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Kontributor terbesar dalam suplai tenaga kerja aktif</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* CHANNEL DISTRIBUTIONS GRID */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Sebaran Saluran Rekrutmen Karyawan</h3>
          <p className="text-[11px] text-slate-400">Distribusi asal-usul rekrutmen staf aktif One For All.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {recruitmentSources.map(source => {
            const count = metrics.sourceCounts[source] || 0;
            const pct = employees.length ? Math.round((count / employees.length) * 100) : 0;
            return (
              <div key={source} className="bg-slate-950/60 p-3 rounded-lg border border-slate-850 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase truncate">{source}</span>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white font-mono">{count}</span>
                  <span className="text-[10px] text-slate-500">Karyawan</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono shrink-0">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-850/60 flex items-start gap-1.5 text-[10px] text-slate-500 leading-normal">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Rekomendasi: Saluran <strong>Referal</strong> &amp; <strong>LinkedIn</strong> menyumbangkan kontribusi staf dengan masa kerja dan performa lapangan paling konsisten.</span>
        </div>
      </div>

      {/* RECRUITMENT EMPLOYEE TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Daftar Saluran Sourcing Karyawan</h3>
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
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Department */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="">Semua Departemen</option>
              {departments.map((dept, i) => (
                <option key={i} value={dept}>{dept}</option>
              ))}
            </select>

            {/* Source */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="">Semua Saluran</option>
              {recruitmentSources.map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
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
                <th className="py-3 px-4">Saluran Rekrutmen</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 text-slate-300">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                    Tidak ditemukan karyawan dengan kriteria rekrutmen tersebut.
                  </td>
                </tr>
              ) : (
                currentItems.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white text-xs">{emp.name}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">{emp.nik || '-'}</td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-medium text-slate-200">{emp.department}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{emp.position}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-850 text-[10px] text-slate-300 font-bold font-mono">
                        {emp.recruitmentSource}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-all cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold border border-transparent hover:border-indigo-500/20"
                        title="Perbarui Saluran Rekrutmen"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Saluran</span>
                      </button>
                    </td>
                  </tr>
                ))
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
              <div className="flex items-center gap-2 text-indigo-400">
                <Users className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Edit Saluran Rekrutmen</h3>
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

              {/* Recruitment Source */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Sumber Saluran Rekrutmen</label>
                <select
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  {recruitmentSources.map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Saluran Rekrutmen Berhasil Diperbarui!</span>
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
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-md"
              >
                {isSaving ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Perubahan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
