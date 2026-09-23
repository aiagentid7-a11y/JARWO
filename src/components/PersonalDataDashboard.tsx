import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import { 
  Search, Filter, Users, MapPin, Phone, Award, GraduationCap, 
  Calendar, CreditCard, ChevronLeft, ChevronRight, Edit3, Eye, Trash2, ShieldAlert, Sparkles, SlidersHorizontal
} from 'lucide-react';
import DataExchangeBar from './DataExchangeBar';

interface PersonalDataDashboardProps {
  employees: Employee[];
  departments: string[];
  onSelectEmployee: (emp: Employee) => void;
  onEditEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onUploadSuccess: () => void;
}

export default function PersonalDataDashboard({
  employees,
  departments,
  onSelectEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onUploadSuccess
}: PersonalDataDashboardProps) {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [educationFilter, setEducationFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const itemsPerPage = 8;

  // Demographics stats
  const stats = useMemo(() => {
    const total = employees.length;
    if (total === 0) return { localPct: 0, nonLocalPct: 0, malePct: 0, femalePct: 0, avgAge: 0 };

    const localCount = employees.filter(e => e.isLocal).length;
    const nonLocalCount = employees.filter(e => e.isNonLocal).length;
    const maleCount = employees.filter(e => e.gender === 'Laki-laki').length;
    const femaleCount = employees.filter(e => e.gender === 'Perempuan').length;

    const ages = employees.map(e => {
      const ageStr = String(e.age || '');
      const match = ageStr.match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    }).filter((a): a is number => a !== null);

    const avgAge = ages.length > 0 
      ? Math.round(ages.reduce((s, v) => s + v, 0) / ages.length) 
      : 0;

    return {
      localPct: Math.round((localCount / total) * 100),
      nonLocalPct: Math.round((nonLocalCount / total) * 100),
      malePct: Math.round((maleCount / total) * 100),
      femalePct: Math.round((femaleCount / total) * 100),
      avgAge
    };
  }, [employees]);

  // List of unique educations
  const educationOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      let edu = e.education || '';
      if (edu.startsWith('S1')) edu = 'S1';
      else if (edu.startsWith('D3')) edu = 'D3';
      else if (edu.startsWith('SMK') || edu.startsWith('SMA')) edu = 'SMA/SMK';
      else if (edu.trim() !== '') edu = edu.trim();
      
      if (edu) set.add(edu);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filter logic
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const query = searchTerm.toLowerCase();
      const matchSearch = 
        (e.name || '').toLowerCase().includes(query) ||
        (e.nik || '').toLowerCase().includes(query) ||
        (e.phone || '').toLowerCase().includes(query) ||
        (e.address || '').toLowerCase().includes(query);

      const matchDept = deptFilter === '' || e.department === deptFilter;
      const matchGender = genderFilter === '' || e.gender === genderFilter;
      
      const matchLocation = 
        locationFilter === '' || 
        (locationFilter === 'Lokal' && e.isLocal) || 
        (locationFilter === 'Non-Lokal' && e.isNonLocal);

      let normalizedEdu = e.education || '';
      if (normalizedEdu.startsWith('S1')) normalizedEdu = 'S1';
      else if (normalizedEdu.startsWith('D3')) normalizedEdu = 'D3';
      else if (normalizedEdu.startsWith('SMK') || normalizedEdu.startsWith('SMA')) normalizedEdu = 'SMA/SMK';
      
      const matchEdu = educationFilter === '' || normalizedEdu === educationFilter;

      return matchSearch && matchDept && matchGender && matchLocation && matchEdu;
    });
  }, [employees, searchTerm, deptFilter, genderFilter, locationFilter, educationFilter]);

  // Pagination
  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(start, start + itemsPerPage);
  }, [filteredEmployees, currentPage]);

  return (
    <div className="space-y-6" id="personal-data-dashboard">
      
      {/* 1. TOP SUMMARY ROW */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Daftar Karyawan Mandiri</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight leading-tight">
              Data Pribadi &amp; Profil Karyawan
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Verifikasi kelengkapan data administratif personal, NIK KTP, kontak WhatsApp, tingkat pendidikan, sertifikasi tambang, serta asuransi sosial BPJS.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 items-center bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">LOKAL SULTRA</span>
                <strong className="text-xl font-black text-emerald-400 font-mono">{stats.localPct}%</strong>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">RATA USIA</span>
                <strong className="text-xl font-black text-blue-400 font-mono">{stats.avgAge} Thn</strong>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">PRIA / WANITA</span>
                <strong className="text-xl font-black text-indigo-400 font-mono">{stats.malePct}% / {stats.femalePct}%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BULK EXCHANGE BAR INTEGRATION */}
      {onUploadSuccess && (
        <DataExchangeBar 
          data={employees}
          fileName="data_pribadi_karyawan"
          title="Ekspor / Impor Data Pribadi"
          onUploadSuccess={onUploadSuccess}
        />
      )}

      {/* 2. DEMOGRAPHICS DETAILS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Local Origin bar */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Kategori Asal Kru</span>
            <span className="text-xs font-mono font-bold text-emerald-400">{stats.localPct}% Lokal</span>
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 bg-slate-950 rounded-full flex overflow-hidden">
              <div style={{ width: `${stats.localPct}%` }} className="bg-emerald-500 rounded-l" />
              <div style={{ width: `${stats.nonLocalPct}%` }} className="bg-amber-500 rounded-r" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Lokal (Sulawesi Tenggara)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Non-Lokal (Luar Sultra)</span>
            </div>
          </div>
        </div>

        {/* Gender Breakdown bar */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Rasio Jenis Kelamin</span>
            <span className="text-xs font-mono font-bold text-indigo-400">{stats.malePct}% Pria</span>
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 bg-slate-950 rounded-full flex overflow-hidden">
              <div style={{ width: `${stats.malePct}%` }} className="bg-indigo-500 rounded-l" />
              <div style={{ width: `${stats.femalePct}%` }} className="bg-pink-500 rounded-r" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Pria</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500" /> Wanita</span>
            </div>
          </div>
        </div>

        {/* Average Education bar */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shadow-sm space-y-2 md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Pendidikan Terakhir</span>
            <span className="text-xs font-semibold text-slate-400">Total Karyawan</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {educationOptions.map((edu, i) => {
              const count = employees.filter(e => {
                let currentEdu = e.education || '';
                if (currentEdu.startsWith('S1')) currentEdu = 'S1';
                else if (currentEdu.startsWith('D3')) currentEdu = 'D3';
                else if (currentEdu.startsWith('SMK') || currentEdu.startsWith('SMA')) currentEdu = 'SMA/SMK';
                return currentEdu === edu;
              }).length;
              
              return (
                <span key={i} className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-850 flex items-center gap-1.5 font-medium">
                  <strong className="text-indigo-400">{edu}:</strong>
                  <span className="text-slate-300 font-bold">{count} Orang</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTERS CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3.5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative w-full lg:w-96">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-500" />
            </span>
            <input
              type="text"
              placeholder="Cari berdasarkan NIK, Nama, HP, atau Alamat..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-850 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Controls toggle view */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-850 text-xs font-semibold">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Kartu KTP
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tabel Rinci
              </button>
            </div>
          </div>
        </div>

        {/* Dropdowns Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-800/40">
          {/* Department */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-2.5 py-1.5 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold">BAGIAN:</span>
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border-none text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer pr-1 w-full"
            >
              <option value="">Semua Bagian</option>
              {departments.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-2.5 py-1.5 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold">GENDER:</span>
            <select
              value={genderFilter}
              onChange={(e) => { setGenderFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border-none text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer pr-1 w-full"
            >
              <option value="">Semua Gender</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-2.5 py-1.5 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold">ASAL:</span>
            <select
              value={locationFilter}
              onChange={(e) => { setLocationFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border-none text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer pr-1 w-full"
            >
              <option value="">Semua Asal</option>
              <option value="Lokal">Lokal (Sultra)</option>
              <option value="Non-Lokal">Non-Lokal</option>
            </select>
          </div>

          {/* Education */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-2.5 py-1.5 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold">PENDIDIKAN:</span>
            <select
              value={educationFilter}
              onChange={(e) => { setEducationFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border-none text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer pr-1 w-full"
            >
              <option value="">Semua Pendidikan</option>
              {educationOptions.map((edu, i) => (
                <option key={i} value={edu}>{edu}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. CONTENT DISPLAY */}
      {viewMode === 'cards' ? (
        /* CARD DOSSIER VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEmployees.length === 0 ? (
            <div className="col-span-2 py-16 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500 font-semibold">
              Tidak ada data pribadi karyawan yang cocok dengan pencarian.
            </div>
          ) : (
            paginatedEmployees.map((emp, index) => (
              <div 
                key={index}
                className="bg-slate-900 border border-slate-800/85 hover:border-indigo-500/35 rounded-2xl p-5 shadow-sm hover:shadow-indigo-950/20 transition-all flex flex-col justify-between space-y-4 relative group"
              >
                {/* ID badge */}
                <div className="absolute right-4 top-4 bg-slate-950 text-slate-500 font-mono text-[9px] px-2 py-0.5 rounded border border-slate-850">
                  NO. {emp.globalNo}
                </div>

                {/* Profile Header */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center font-black text-indigo-400 text-sm">
                    {(emp.name || 'Karyawan').split(' ').filter(v => v.length > 0).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-100 group-hover:text-indigo-400 transition-colors text-sm">{emp.name}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">{emp.position}</p>
                    <p className="text-[9px] text-slate-500 font-medium">{emp.department}</p>
                  </div>
                </div>

                {/* Dossier info list */}
                <div className="grid grid-cols-2 gap-3 bg-slate-950/45 p-3 rounded-xl border border-slate-850/60 text-[10.5px]">
                  <div>
                    <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">NIK (KTP)</span>
                    <span className="font-mono text-slate-300 font-bold">{emp.nik || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Kontak WhatsApp</span>
                    <span className="font-mono text-slate-300 font-bold flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{emp.phone || '-'}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Pendidikan Terakhir</span>
                    <span className="text-slate-300 font-bold flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{emp.education || '-'}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Sertifikasi</span>
                    <span className="text-slate-300 font-bold flex items-center gap-1 truncate" title={emp.certification}>
                      <Award className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{emp.certification || '-'}</span>
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-900/50">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Alamat KTP</span>
                    <span className="text-slate-300 font-medium leading-normal block truncate" title={emp.address}>{emp.address || '-'}</span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-850/30">
                  <div className="flex items-center gap-1.5">
                    {emp.isLocal ? (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold">Lokal</span>
                    ) : (
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold">Non-Lokal</span>
                    )}
                    <span className="text-[9px] bg-slate-950 text-slate-400 font-bold border border-slate-850 px-1.5 py-0.5 rounded">{emp.gender}</span>
                    <span className="text-[9px] bg-slate-950 text-slate-400 font-bold border border-slate-850 px-1.5 py-0.5 rounded">{emp.age}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onSelectEmployee(emp)}
                      title="Lihat Detail Lengkap"
                      className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-800"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onEditEmployee(emp)}
                      title="Edit Data Pribadi"
                      className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-800"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteEmployee(emp.id)}
                      title="Hapus Karyawan"
                      className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      ) : (
        /* DETAIL LIST TABLE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-850 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Karyawan</th>
                  <th className="py-3 px-3">NIK (KTP)</th>
                  <th className="py-3 px-3">Gender</th>
                  <th className="py-3 px-3">Tanggal Lahir &amp; Usia</th>
                  <th className="py-3 px-3">WhatsApp</th>
                  <th className="py-3 px-3">Pendidikan &amp; Sertifikat</th>
                  <th className="py-3 px-3">Alamat</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50 text-xs">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                      Tidak ada data pribadi karyawan yang cocok.
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((emp, idx) => (
                    <tr key={idx} className="hover:bg-slate-950/20 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{emp.position} &bull; {emp.department}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-300">
                        {emp.nik || '-'}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-400">
                        {emp.gender}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <div>{emp.birthDate || '-'}</div>
                        <div className="text-[10px] text-slate-500 font-semibold">{emp.age}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {emp.phone || '-'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-300">{emp.education || '-'}</div>
                        <div className="text-[10px] text-slate-500 font-semibold truncate max-w-40" title={emp.certification}>
                          {emp.certification || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 truncate max-w-48 font-medium" title={emp.address}>
                        {emp.address || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end items-center gap-1">
                          <button
                            onClick={() => onSelectEmployee(emp)}
                            className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-800"
                            title="Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditEmployee(emp)}
                            className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-800"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAGINATION PANEL */}
      {totalPages > 1 && (
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center justify-between text-xs text-slate-400 font-semibold shadow-sm">
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
  );
}
