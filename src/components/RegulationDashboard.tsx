import React, { useState, useEffect, useMemo } from 'react';
import { 
  LaborRegulation, MinimumWage, RegulationCategory, RegulationStatus, 
  Employee, WageComplianceResult 
} from '../types';
import { checkSalaryMinimumWageCompliance, calculatePP49MinimumWage } from '../utils/minimumWageUtil';
import { 
  Scale, BookOpen, ShieldCheck, Search, Plus, Edit, Trash2, CheckCircle2, 
  AlertTriangle, X, ExternalLink, Copy, Check, Filter, Calendar, MapPin, 
  Coins, UserCheck, RefreshCw, Layers, FileText, CheckCircle, Info, ChevronRight, Building2
} from 'lucide-react';

interface RegulationDashboardProps {
  employees: Employee[];
  onSelectEmployee?: (emp: Employee) => void;
}

export default function RegulationDashboard({ employees, onSelectEmployee }: RegulationDashboardProps) {
  const [activeTab, setActiveTab] = useState<'regulations' | 'minimum_wage' | 'compliance_checker' | 'sql_schema'>('regulations');

  // Regulations state
  const [regulations, setRegulations] = useState<LaborRegulation[]>([]);
  const [regCategoryFilter, setRegCategoryFilter] = useState<string>('all');
  const [regStatusFilter, setRegStatusFilter] = useState<string>('all');
  const [regSearchTerm, setRegSearchTerm] = useState<string>('');

  // Minimum Wage state
  const [minimumWages, setMinimumWages] = useState<MinimumWage[]>([]);
  const [wageSearchTerm, setWageSearchTerm] = useState<string>('');
  const [wageProvinceFilter, setWageProvinceFilter] = useState<string>('all');
  const [wageYearFilter, setWageYearFilter] = useState<number>(2026);

  // Compliance Checker Tool State
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [testWage, setTestWage] = useState<number>(3500000);
  const [testProvince, setTestProvince] = useState<string>('Sulawesi Tenggara');
  const [testCityDistrict, setTestCityDistrict] = useState<string>('Kab. Konawe Utara');
  const [testYear, setTestYear] = useState<number>(2026);

  // PP 49/2025 Formula Calculator State (Indeks Alfa = 0,75)
  const [pp49BaseWage, setPp49BaseWage] = useState<number>(3000000);
  const [pp49Inflation, setPp49Inflation] = useState<number>(2.5);
  const [pp49Growth, setPp49Growth] = useState<number>(5.2);
  const [pp49Alpha, setPp49Alpha] = useState<number>(0.75);

  const pp49Calc = useMemo(() => {
    return calculatePP49MinimumWage(pp49BaseWage, pp49Inflation, pp49Growth, pp49Alpha);
  }, [pp49BaseWage, pp49Inflation, pp49Growth, pp49Alpha]);

  // Modals state
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<Partial<LaborRegulation> | null>(null);

  const [isWageModalOpen, setIsWageModalOpen] = useState(false);
  const [editingWage, setEditingWage] = useState<Partial<MinimumWage> | null>(null);

  // UI status state
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Fetch Regulations
  const fetchRegulations = async () => {
    try {
      const res = await fetch('/api/regulations');
      if (res.ok) {
        const json = await res.json();
        setRegulations(json.regulations || []);
      }
    } catch (err) {
      console.warn('Gagal memuat regulasi dari server:', err);
    }
  };

  // Fetch Minimum Wages
  const fetchMinimumWages = async () => {
    try {
      const res = await fetch('/api/minimum-wages');
      if (res.ok) {
        const json = await res.json();
        setMinimumWages(json.minimumWages || []);
      }
    } catch (err) {
      console.warn('Gagal memuat data UMP/UMK dari server:', err);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchRegulations(), fetchMinimumWages()]).finally(() => setIsLoading(false));
  }, []);

  // Format Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Filtered Regulations
  const filteredRegulations = useMemo(() => {
    return regulations.filter(r => {
      const matchCat = regCategoryFilter === 'all' || r.category === regCategoryFilter;
      const matchStatus = regStatusFilter === 'all' || r.status === regStatusFilter;
      const matchSearch = !regSearchTerm || 
        r.title.toLowerCase().includes(regSearchTerm.toLowerCase()) || 
        r.summary.toLowerCase().includes(regSearchTerm.toLowerCase()) ||
        (r.documentNumber && r.documentNumber.toLowerCase().includes(regSearchTerm.toLowerCase()));
      return matchCat && matchStatus && matchSearch;
    });
  }, [regulations, regCategoryFilter, regStatusFilter, regSearchTerm]);

  // Filtered Minimum Wages
  const filteredMinimumWages = useMemo(() => {
    return minimumWages.filter(w => {
      const matchProv = wageProvinceFilter === 'all' || w.province === wageProvinceFilter;
      const matchYear = !wageYearFilter || w.year === wageYearFilter;
      const matchSearch = !wageSearchTerm || 
        w.province.toLowerCase().includes(wageSearchTerm.toLowerCase()) ||
        (w.cityDistrict && w.cityDistrict.toLowerCase().includes(wageSearchTerm.toLowerCase())) ||
        (w.regulationRef && w.regulationRef.toLowerCase().includes(wageSearchTerm.toLowerCase()));
      return matchProv && matchYear && matchSearch;
    });
  }, [minimumWages, wageProvinceFilter, wageYearFilter, wageSearchTerm]);

  // Unique Provinces List
  const uniqueProvinces = useMemo(() => {
    return Array.from(new Set(minimumWages.map(w => w.province))).filter(Boolean);
  }, [minimumWages]);

  // Handle Save Regulation
  const handleSaveRegulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg?.title || !editingReg?.summary) {
      setErrorMsg('Judul dan Ringkasan Regulasi wajib diisi.');
      return;
    }

    try {
      const res = await fetch('/api/regulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingReg)
      });

      if (res.ok) {
        const json = await res.json();
        setSuccessMsg(json.message || 'Regulasi berhasil disimpan!');
        setIsRegModalOpen(false);
        setEditingReg(null);
        fetchRegulations();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        const errJson = await res.json();
        setErrorMsg(errJson.error || 'Gagal menyimpan regulasi.');
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server.');
    }
  };

  // Handle Delete Regulation
  const handleDeleteRegulation = async (id: string, title: string) => {
    if (!window.confirm(`Hapus regulasi "${title}"?`)) return;

    try {
      const res = await fetch(`/api/regulations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg(`Regulasi "${title}" berhasil dihapus.`);
        fetchRegulations();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setErrorMsg('Gagal menghapus regulasi.');
    }
  };

  // Handle Save Minimum Wage
  const handleSaveMinimumWage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWage?.province || !editingWage?.amount || !editingWage?.year) {
      setErrorMsg('Provinsi, Nominal, dan Tahun wajib diisi.');
      return;
    }

    try {
      const res = await fetch('/api/minimum-wages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingWage)
      });

      if (res.ok) {
        const json = await res.json();
        setSuccessMsg(json.message || 'Data UMP/UMK berhasil disimpan!');
        setIsWageModalOpen(false);
        setEditingWage(null);
        fetchMinimumWages();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        const errJson = await res.json();
        setErrorMsg(errJson.error || 'Gagal menyimpan data UMP/UMK.');
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server.');
    }
  };

  // Handle Delete Minimum Wage
  const handleDeleteMinimumWage = async (id: string, region: string) => {
    if (!window.confirm(`Hapus data UMP/UMK ${region}?`)) return;

    try {
      const res = await fetch(`/api/minimum-wages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg(`Data UMP/UMK ${region} berhasil dihapus.`);
        fetchMinimumWages();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setErrorMsg('Gagal menghapus data UMP/UMK.');
    }
  };

  // When picking an employee in compliance checker
  const handleSelectEmployeeForCheck = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      const w = parseInt(String(emp.wage || '0').replace(/[^0-9]/g, ''), 10) || 3500000;
      setTestWage(w);
      if (emp.workLocation) {
        if (emp.workLocation.toLowerCase().includes('sultra') || emp.workLocation.toLowerCase().includes('kendari') || emp.workLocation.toLowerCase().includes('konawe')) {
          setTestProvince('Sulawesi Tenggara');
          setTestCityDistrict('Kab. Konawe Utara');
        } else if (emp.workLocation.toLowerCase().includes('jakarta')) {
          setTestProvince('DKI Jakarta');
          setTestCityDistrict('DKI Jakarta');
        }
      }
    }
  };

  // Compliance Calculation
  const testComplianceResult: WageComplianceResult = useMemo(() => {
    return checkSalaryMinimumWageCompliance(
      testWage,
      testProvince,
      testCityDistrict,
      testYear,
      minimumWages
    );
  }, [testWage, testProvince, testCityDistrict, testYear, minimumWages]);

  // Compliance Audit Summary for All Active Employees
  const overallEmployeesCompliance = useMemo(() => {
    const activeEmps = employees.filter(e => Boolean(e.name));
    let compliantCount = 0;
    let nonCompliantCount = 0;

    activeEmps.forEach(emp => {
      const wage = parseInt(String(emp.wage || '0').replace(/[^0-9]/g, ''), 10) || 0;
      const prov = emp.workLocation?.includes('Jakarta') ? 'DKI Jakarta' : 'Sulawesi Tenggara';
      const city = emp.workLocation?.includes('Konawe') ? 'Kab. Konawe Utara' : undefined;
      
      const res = checkSalaryMinimumWageCompliance(wage, prov, city, 2026, minimumWages);
      if (res.isCompliant) compliantCount++;
      else nonCompliantCount++;
    });

    return {
      total: activeEmps.length,
      compliantCount,
      nonCompliantCount,
      complianceRate: activeEmps.length > 0 ? Math.round((compliantCount / activeEmps.length) * 100) : 100
    };
  }, [employees, minimumWages]);

  // Copy SQL Script
  const copySqlScript = () => {
    const sql = `-- SKEMA SUPABASE POSTGRESQL "REGULASI KETENAGAKERJAAN & REFERENSI UMP / UMK"
CREATE TABLE IF NOT EXISTS public.labor_regulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    summary TEXT NOT NULL,
    effective_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'aktif',
    document_number VARCHAR(100),
    issuing_authority VARCHAR(150),
    download_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.minimum_wages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    province VARCHAR(150) NOT NULL,
    city_district VARCHAR(150),
    wage_type VARCHAR(10) NOT NULL CHECK (wage_type IN ('UMP', 'UMK')),
    year INT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    regulation_ref VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_region_year UNIQUE(province, city_district, year)
);
`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* NOTIFICATION ALERTS */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* HEADER CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
              <Scale className="w-4 h-4" /> Modul Regulasi &bull; Labor &amp; Wage Compliance
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white font-heading">
              Regulasi Ketenagakerjaan &amp; Referensi UMP / UMK
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-2xl">
              Pusat referensi Undang-Undang, Peraturan Pemerintah (PP 35/2021, PP 49/2025 tentang Pengupahan α = 0,75), PMK Pajak TER, dan database UMP/UMK untuk validasi standar upah minimum otomatis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchRegulations();
                fetchMinimumWages();
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>

            {activeTab === 'regulations' && (
              <button
                onClick={() => {
                  setEditingReg({
                    category: 'ketenagakerjaan',
                    status: 'aktif',
                    effectiveDate: new Date().toISOString().split('T')[0]
                  });
                  setIsRegModalOpen(true);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Regulasi</span>
              </button>
            )}

            {activeTab === 'minimum_wage' && (
              <button
                onClick={() => {
                  setEditingWage({
                    province: 'Sulawesi Tenggara',
                    type: 'UMK',
                    year: 2026,
                    amount: 3250000
                  });
                  setIsWageModalOpen(true);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah UMP / UMK</span>
              </button>
            )}
          </div>
        </div>

        {/* SUMMARY KPI BANNER */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Total Regulasi Aktif</span>
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-base md:text-lg font-black text-white font-mono mt-1">
              {regulations.filter(r => r.status === 'aktif').length} Peraturan
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">UU, PP, PMK, Perpres</div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Referensi UMP/UMK</span>
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base md:text-lg font-black text-emerald-400 font-mono mt-1">
              {minimumWages.length} Daerah
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tahun 2025 - 2026</div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Kepatuhan Upah Minimum</span>
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-base md:text-lg font-black text-purple-400 font-mono mt-1">
              {overallEmployeesCompliance.complianceRate}% Lulus
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">
              {overallEmployeesCompliance.compliantCount} / {overallEmployeesCompliance.total} Karyawan
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Di Bawah UMK</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-base md:text-lg font-black text-rose-400 font-mono mt-1">
              {overallEmployeesCompliance.nonCompliantCount} Orang
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Perlu Penyesuaian Gaji</div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('regulations')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'regulations'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>📜 Regulasi Ketenagakerjaan</span>
        </button>

        <button
          onClick={() => setActiveTab('minimum_wage')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'minimum_wage'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>📍 Referensi UMP / UMK</span>
        </button>

        <button
          onClick={() => setActiveTab('compliance_checker')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'compliance_checker'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>🛡️ Validator Kepatuhan UMK</span>
        </button>

        <button
          onClick={() => setActiveTab('sql_schema')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'sql_schema'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Copy className="w-4 h-4" />
          <span>⚡ Skema SQL Supabase</span>
        </button>
      </div>

      {/* TAB 1: REGULASI KETENAGAKERJAAN */}
      {activeTab === 'regulations' && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama peraturan, UU, PP, atau kata kunci..."
                value={regSearchTerm}
                onChange={(e) => setRegSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-600"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
              <select
                value={regCategoryFilter}
                onChange={(e) => setRegCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">Semua Kategori</option>
                <option value="ketenagakerjaan">Ketenagakerjaan</option>
                <option value="pengupahan">Pengupahan</option>
                <option value="PHK">PHK &amp; Pesangon</option>
                <option value="BPJS">BPJS &amp; Jaminan Sosial</option>
                <option value="pajak">Pajak &amp; PPh 21</option>
                <option value="k3">K3 Lingkungan Kerja</option>
              </select>

              <select
                value={regStatusFilter}
                onChange={(e) => setRegStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">Semua Status</option>
                <option value="aktif">Aktif Berlaku</option>
                <option value="direvisi">Direvisi / Diubah</option>
                <option value="tidak_berlaku">Tidak Berlaku</option>
              </select>

              <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                {filteredRegulations.length} Peraturan
              </span>
            </div>
          </div>

          {/* REGULATIONS GRID CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRegulations.map((reg) => (
              <div
                key={reg.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                      {reg.category}
                    </span>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      reg.status === 'aktif' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {reg.status === 'aktif' ? 'Berlaku Aktif' : reg.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white font-heading leading-snug">
                    {reg.title}
                  </h3>

                  <div className="text-[11px] text-slate-400 flex items-center gap-3 font-mono">
                    {reg.documentNumber && <span>No: {reg.documentNumber}</span>}
                    <span>Tgl: {reg.effectiveDate}</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                    {reg.summary}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500">Penerbit: {reg.issuingAuthority || 'Kemenaker RI'}</span>

                  <div className="flex items-center gap-2">
                    {reg.downloadUrl && (
                      <a
                        href={reg.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                        title="Buka dokumen JDIH"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Dokumen</span>
                      </a>
                    )}

                    <button
                      onClick={() => {
                        setEditingReg(reg);
                        setIsRegModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Regulasi"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteRegulation(reg.id, reg.title)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Hapus Regulasi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: REFERENSI UMP / UMK */}
      {activeTab === 'minimum_wage' && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari provinsi, kabupaten/kota, atau dasar SK..."
                value={wageSearchTerm}
                onChange={(e) => setWageSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-600"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <select
                value={wageProvinceFilter}
                onChange={(e) => setWageProvinceFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">Semua Provinsi</option>
                {uniqueProvinces.map((p, i) => (
                  <option key={i} value={p}>{p}</option>
                ))}
              </select>

              <select
                value={wageYearFilter}
                onChange={(e) => setWageYearFilter(parseInt(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value={2026}>Tahun 2026</option>
                <option value={2025}>Tahun 2025</option>
                <option value={2024}>Tahun 2024</option>
              </select>

              <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                {filteredMinimumWages.length} Referensi
              </span>
            </div>
          </div>

          {/* TABLE OF MINIMUM WAGES */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Wilayah (Provinsi / Kab-Kota)</th>
                    <th className="px-4 py-3 text-center">Jenis</th>
                    <th className="px-4 py-3 text-center">Tahun</th>
                    <th className="px-4 py-3 text-right">Upah Minimum (Nominal)</th>
                    <th className="px-4 py-3">Dasar Hukum SK</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredMinimumWages.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{w.province}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {w.cityDistrict || 'Seluruh Wilayah Provinsi'}
                        </div>
                        {w.notes && <div className="text-[10px] text-slate-500 italic mt-0.5">{w.notes}</div>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          w.type === 'UMK' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {w.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-300">
                        {w.year}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-emerald-400 text-sm">
                        {formatRupiah(w.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-[11px]">
                        {w.regulationRef || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingWage(w);
                              setIsWageModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMinimumWage(w.id, `${w.province} ${w.cityDistrict || ''}`)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VALIDATOR KEPATUHAN UMK TOOL */}
      {activeTab === 'compliance_checker' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Input */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-blue-400" /> Form Simulator Kepatuhan UMK
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Pilih karyawan eksis atau uji nominal gaji khusus terhadap referensi UMP/UMK daerah.
              </p>
            </div>

            {/* Quick Pick Employee */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Pilih Karyawan Eksis (Opsional)</label>
              <select
                value={selectedEmpId}
                onChange={(e) => handleSelectEmployeeForCheck(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Mode Input Manual --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.position || 'Staff'}) - {emp.workLocation || 'Site'}
                  </option>
                ))}
              </select>
            </div>

            {/* Test Wage */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Gaji Pokok Teruji (Rupiah)</label>
              <input
                type="number"
                value={testWage}
                onChange={(e) => setTestWage(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-blue-500"
              />
              <div className="text-[11px] text-slate-400 mt-1 font-mono">{formatRupiah(testWage)}</div>
            </div>

            {/* Region Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Provinsi Lokasi Kerja</label>
              <input
                type="text"
                value={testProvince}
                onChange={(e) => setTestProvince(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Kabupaten / Kota / Site</label>
              <input
                type="text"
                value={testCityDistrict}
                onChange={(e) => setTestCityDistrict(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tahun Acuan UMK</label>
              <select
                value={testYear}
                onChange={(e) => setTestYear(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>

          {/* Compliance Result Card */}
          <div className="lg:col-span-2 space-y-4">
            <div className={`p-6 rounded-2xl border ${
              testComplianceResult.isCompliant
                ? 'bg-emerald-950/40 border-emerald-500/40'
                : 'bg-rose-950/40 border-rose-500/40'
            } space-y-4 shadow-xl relative overflow-hidden`}>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    testComplianceResult.isCompliant ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {testComplianceResult.isCompliant ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Hasil Audit Kepatuhan</span>
                    <h3 className={`text-xl font-black font-heading ${
                      testComplianceResult.isCompliant ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {testComplianceResult.complianceStatus}
                    </h3>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
                  {testComplianceResult.type} {testComplianceResult.year}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Gaji Pokok Teruji</span>
                  <div className="text-lg font-black text-white font-mono mt-0.5">
                    {formatRupiah(testComplianceResult.employeeWage)}
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Standar Upah Minimum ({testComplianceResult.region})</span>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                    {formatRupiah(testComplianceResult.minimumWageAmount)}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-850 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Selisih Nominal vs UMK:</span>
                  <span className={`font-mono font-bold ${testComplianceResult.difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {testComplianceResult.difference >= 0 ? '+' : ''}{formatRupiah(testComplianceResult.difference)} ({testComplianceResult.percentageDiff}%)
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400">Dasar Peraturan SK:</span>
                  <span className="font-mono text-slate-200">{testComplianceResult.regulationRef}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 leading-relaxed italic bg-blue-950/40 border border-blue-500/20 p-3.5 rounded-xl flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong>PP No. 49 Tahun 2025 tentang Pengupahan (Alfa α = 0,75):</strong> Menurut ketentuan regulasi terbaru, penyesuaian UMP/UMK dihitung dengan variabel Inflasi + (Pertumbuhan Ekonomi × α), di mana nilai alfa (α) ditetapkan sebesar 0,75. Pengusaha dilarang membayar upah di bawah UMP/UMK untuk pekerja dengan masa kerja ≥ 1 tahun.
                </div>
              </div>
            </div>

            {/* PP No. 49/2025 Formula Calculator Card */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-heading">
                      Kalkulator Formulasi UMP / UMK (PP No. 49 Tahun 2025)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Simulasi kenaikan upah minimum menggunakan nilai Indeks Alfa (α) = 0,75
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-mono font-bold">
                  Alfa (α) = {pp49Alpha}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">UMK / UMP Acuan (Rp)</label>
                  <input
                    type="number"
                    value={pp49BaseWage}
                    onChange={(e) => setPp49BaseWage(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Inflasi Provinsi (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={pp49Inflation}
                    onChange={(e) => setPp49Inflation(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Pertumbuhan Ekonomi (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={pp49Growth}
                    onChange={(e) => setPp49Growth(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono font-bold text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Indeks Alfa (α)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="1.0"
                    value={pp49Alpha}
                    onChange={(e) => setPp49Alpha(parseFloat(e.target.value) || 0.75)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono font-bold text-blue-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Calculation Output Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Rumus Kenaikan (%)</span>
                  <div className="text-sm font-mono font-bold text-slate-300 mt-0.5">
                    {pp49Inflation}% + ({pp49Growth}% × {pp49Alpha}) = <span className="text-blue-400 font-black">{pp49Calc.adjustmentPercentage}%</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Estimasi Kenaikan (Nominal)</span>
                  <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
                    +{formatRupiah(pp49Calc.adjustmentAmount)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Proyeksi UMK / UMP Baru</span>
                  <div className="text-base font-mono font-black text-emerald-400 mt-0.5">
                    {formatRupiah(pp49Calc.newMinimumWage)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUPABASE SQL SCHEMA */}
      {activeTab === 'sql_schema' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Copy className="w-4 h-4" /> Skema SQL Supabase PostgreSQL (Regulasi &amp; UMP/UMK)
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
              Skema DDL PostgreSQL di bawah ini siap dipasang pada Supabase SQL Editor untuk menyimpan referensi regulasi dan data UMP/UMK nasional.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-blue-300 overflow-x-auto shadow-inner">
            <pre className="whitespace-pre-wrap leading-relaxed">
{`-- 1. TABEL REFERENSI REGULASI KETENAGAKERJAAN
CREATE TABLE IF NOT EXISTS public.labor_regulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    summary TEXT NOT NULL,
    effective_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'aktif',
    document_number VARCHAR(100),
    issuing_authority VARCHAR(150),
    download_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABEL REFERENSI UMP / UMK PER PROVINSI & KOTA/KABUPATEN
CREATE TABLE IF NOT EXISTS public.minimum_wages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    province VARCHAR(150) NOT NULL,
    city_district VARCHAR(150),
    wage_type VARCHAR(10) NOT NULL CHECK (wage_type IN ('UMP', 'UMK')),
    year INT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    regulation_ref VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_region_year UNIQUE(province, city_district, year)
);`}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT REGULATION */}
      {isRegModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingReg?.id ? 'Edit Regulasi Ketenagakerjaan' : 'Tambah Peraturan Baru'}
              </h3>
              <button onClick={() => setIsRegModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRegulation} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Judul / Peraturan (misal: PP No. 35/2021)</label>
                <input
                  type="text"
                  value={editingReg?.title || ''}
                  onChange={(e) => setEditingReg(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Nama Peraturan..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kategori</label>
                  <select
                    value={editingReg?.category || 'ketenagakerjaan'}
                    onChange={(e) => setEditingReg(prev => ({ ...prev, category: e.target.value as RegulationCategory }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="ketenagakerjaan">Ketenagakerjaan</option>
                    <option value="pengupahan">Pengupahan</option>
                    <option value="PHK">PHK &amp; Pesangon</option>
                    <option value="BPJS">BPJS &amp; Jaminan Sosial</option>
                    <option value="pajak">Pajak &amp; PPh 21</option>
                    <option value="k3">K3 Lingkungan Kerja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={editingReg?.status || 'aktif'}
                    onChange={(e) => setEditingReg(prev => ({ ...prev, status: e.target.value as RegulationStatus }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="aktif">Aktif Berlaku</option>
                    <option value="direvisi">Direvisi</option>
                    <option value="tidak_berlaku">Tidak Berlaku</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ringkasan / Subansi Regulasi</label>
                <textarea
                  rows={3}
                  value={editingReg?.summary || ''}
                  onChange={(e) => setEditingReg(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Ringkasan aturan..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tanggal Berlaku</label>
                  <input
                    type="date"
                    value={editingReg?.effectiveDate || ''}
                    onChange={(e) => setEditingReg(prev => ({ ...prev, effectiveDate: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nomor Dokumen / Kode</label>
                  <input
                    type="text"
                    value={editingReg?.documentNumber || ''}
                    onChange={(e) => setEditingReg(prev => ({ ...prev, documentNumber: e.target.value }))}
                    placeholder="misal: PP 35/2021"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Link Dokumen (JDIH / PDF)</label>
                <input
                  type="url"
                  value={editingReg?.downloadUrl || ''}
                  onChange={(e) => setEditingReg(prev => ({ ...prev, downloadUrl: e.target.value }))}
                  placeholder="https://jdih.kemnaker.go.id/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                >
                  Simpan Peraturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT MINIMUM WAGE */}
      {isWageModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingWage?.id ? 'Edit Referensi UMP / UMK' : 'Tambah Referensi UMP / UMK Baru'}
              </h3>
              <button onClick={() => setIsWageModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMinimumWage} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Provinsi</label>
                  <input
                    type="text"
                    value={editingWage?.province || ''}
                    onChange={(e) => setEditingWage(prev => ({ ...prev, province: e.target.value }))}
                    placeholder="misal: Sulawesi Tenggara"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kabupaten / Kota (Kosongkan bila UMP)</label>
                  <input
                    type="text"
                    value={editingWage?.cityDistrict || ''}
                    onChange={(e) => setEditingWage(prev => ({ 
                      ...prev, 
                      cityDistrict: e.target.value,
                      type: e.target.value ? 'UMK' : 'UMP'
                    }))}
                    placeholder="misal: Kab. Konawe Utara"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jenis</label>
                  <select
                    value={editingWage?.type || 'UMK'}
                    onChange={(e) => setEditingWage(prev => ({ ...prev, type: e.target.value as 'UMP' | 'UMK' }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="UMK">UMK (Kota/Kab)</option>
                    <option value="UMP">UMP (Provinsi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tahun</label>
                  <input
                    type="number"
                    min={2020}
                    max={2035}
                    value={editingWage?.year || 2026}
                    onChange={(e) => setEditingWage(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    value={editingWage?.amount || 0}
                    onChange={(e) => setEditingWage(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Dasar Hukum SK Gubernur</label>
                <input
                  type="text"
                  value={editingWage?.regulationRef || ''}
                  onChange={(e) => setEditingWage(prev => ({ ...prev, regulationRef: e.target.value }))}
                  placeholder="misal: SK Gubernur Sultra No. 721/2025"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={editingWage?.notes || ''}
                  onChange={(e) => setEditingWage(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Catatan sektor atau kawasan industri..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWageModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
                >
                  Simpan UMP/UMK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
