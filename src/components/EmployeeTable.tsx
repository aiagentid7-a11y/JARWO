import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import { 
  Search, Filter, SlidersHorizontal, Download, FileJson, 
  Trash2, Edit, Eye, UserPlus, ArrowUpDown, ChevronLeft, 
  ChevronRight, RefreshCw, Grid, List, CheckCircle, MapPin, Phone, Bot, Sparkles, UserMinus, X
} from 'lucide-react';
import { getDaysLeftAndSeverity } from '../dateUtils';
import DataExchangeBar from './DataExchangeBar';
import EmployeeNotificationsBanner from './EmployeeNotificationsBanner';

interface EmployeeTableProps {
  employees: Employee[];
  departments: string[];
  selectedDepartmentFilter: string;
  onSetDepartmentFilter: (dept: string) => void;
  onSelectEmployee: (emp: Employee) => void;
  onEditEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onBulkDeleteEmployees: (ids: string[]) => void;
  onAddEmployeeClick: () => void;
  onResetDatabase: () => Promise<void>;
  onClearAllEmployees?: () => Promise<void>;
  isResetting: boolean;
  onUploadSuccess?: () => void;
}

type SortField = 'name' | 'globalNo' | 'department' | 'age' | 'startDate';
type SortOrder = 'asc' | 'desc';

export default function EmployeeTable({
  employees,
  departments,
  selectedDepartmentFilter,
  onSetDepartmentFilter,
  onSelectEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onBulkDeleteEmployees,
  onAddEmployeeClick,
  onResetDatabase,
  onClearAllEmployees,
  isResetting,
  onUploadSuccess
}: EmployeeTableProps) {
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [educationFilter, setEducationFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'new' | 'leaving' | 'pkwt' | 'pkwtt'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Sorting States
  const [sortField, setSortField] = useState<SortField>('globalNo');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Toggle sort helper
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Extract unique educations
  const educationOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      let edu = e.education || '';
      if (edu.startsWith('S1')) edu = 'S1';
      else if (edu.startsWith('D3')) edu = 'D3';
      else if (edu.startsWith('SMK') || edu.startsWith('SMA')) edu = 'SMA/SMK';
      else if (edu.trim() !== '') {
        edu = edu.trim();
      }
      if (edu) set.add(edu);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filter Logic
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      // 1. Search term (Name, Position, NIK, Phone)
      const query = searchTerm.toLowerCase();
      const matchSearch = 
        (e.name || '').toLowerCase().includes(query) ||
        (e.position || '').toLowerCase().includes(query) ||
        (e.nik || '').toLowerCase().includes(query) ||
        (e.phone || '').toLowerCase().includes(query);

      // 2. Department
      const matchDept = selectedDepartmentFilter === '' || e.department === selectedDepartmentFilter;

      // 3. Gender
      const matchGender = genderFilter === '' || e.gender === genderFilter;

      // 4. Location
      const matchLocation = 
        locationFilter === '' || 
        (locationFilter === 'Lokal' && e.isLocal) || 
        (locationFilter === 'Non-Lokal' && e.isNonLocal);

      // 5. Work Status (PKWT / PKWTT)
      const matchStatus = statusFilter === '' || e.status === statusFilter;

      // 6. Education
      let normalizedEdu = e.education || '';
      if (normalizedEdu.startsWith('S1')) normalizedEdu = 'S1';
      else if (normalizedEdu.startsWith('D3')) normalizedEdu = 'D3';
      else if (normalizedEdu.startsWith('SMK') || normalizedEdu.startsWith('SMA')) normalizedEdu = 'SMA/SMK';
      
      const matchEdu = educationFilter === '' || normalizedEdu === educationFilter;

      // 7. Quick Filter (Karyawan Baru / PKWT / PKWTT)
      let matchQuick = true;
      if (quickFilter === 'new') {
        const s = String(e.startDate || '').toLowerCase();
        matchQuick = s.includes('2026') || s.includes('2025') || e.recruitmentStage === 'Hired';
      } else if (quickFilter === 'pkwt') {
        matchQuick = e.status === 'PKWT';
      } else if (quickFilter === 'pkwtt') {
        matchQuick = e.status === 'PKWTT';
      }

      return matchSearch && matchDept && matchGender && matchLocation && matchStatus && matchEdu && matchQuick;
    });
  }, [employees, searchTerm, selectedDepartmentFilter, genderFilter, locationFilter, statusFilter, educationFilter, quickFilter]);

  // Sort Logic
  const sortedEmployees = useMemo(() => {
    const list = [...filteredEmployees];
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      // Special parsing for age (compare numbers, not string "XX Tahun")
      if (sortField === 'age') {
        const ageStrA = String(a.age || '');
        const ageStrB = String(b.age || '');
        const matchA = ageStrA.match(/\d+/);
        const matchB = ageStrB.match(/\d+/);
        valA = matchA ? parseInt(matchA[0], 10) : 0;
        valB = matchB ? parseInt(matchB[0], 10) : 0;
      }

      // Special sorting for name and other string fields safely
      if (typeof valA === 'string' || typeof valB === 'string') {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredEmployees, sortField, sortOrder]);

  // Pagination Logic
  const totalRows = sortedEmployees.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedEmployees.slice(startIndex, startIndex + pageSize);
  }, [sortedEmployees, currentPage, pageSize]);

  // Handle export to CSV
  const exportToCSV = () => {
    const headers = [
      'No', 'Nama Tenaga Kerja', 'Jabatan', 'NIK', 'Tanggal Lahir', 'Usia', 
      'Jenis Kelamin', 'Mulai Kerja', 'Pendidikan', 'Sertifikasi', 'Ruang Gaji', 
      'BPJS TK', 'BPJS Kesehatan', 'Status', 'Alamat', 'Nomor HP', 'Kategori'
    ];
    
    const csvContent = [
      headers.join(','),
      ...employees.map(e => [
        `"${e.globalNo}"`,
        `"${e.name.replace(/"/g, '""')}"`,
        `"${e.position.replace(/"/g, '""')}"`,
        `"'${e.nik}"`, // Force text format in Excel
        `"${e.birthDate}"`,
        `"${e.age}"`,
        `"${e.gender}"`,
        `"${e.startDate}"`,
        `"${e.education.replace(/"/g, '""')}"`,
        `"${e.certification.replace(/"/g, '""')}"`,
        `"${e.salaryGrade}"`,
        `"'${e.bpjsTk}"`,
        `"'${e.bpjsKes}"`,
        `"${e.status}"`,
        `"${e.address.replace(/"/g, '""')}"`,
        `"'${e.phone}"`,
        `"${e.isLocal ? 'Lokal' : 'Non-Lokal'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Database_Karyawan_PT_One_For_All_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle export to JSON
  const exportToJSON = () => {
    const jsonStr = JSON.stringify(employees, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Database_Karyawan_PT_One_For_All_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle individual selection helper
  const handleSelectToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  // Toggle page selection helper
  const handleSelectAllToggle = () => {
    const pageIds = paginatedEmployees
      .map(e => e.id);
    
    const allPageIdsSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
    
    if (allPageIdsSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const unique = new Set([...prev, ...pageIds]);
        return Array.from(unique);
      });
    }
  };

  // Clear all filters helper
  const clearFilters = () => {
    setSearchTerm('');
    onSetDepartmentFilter('');
    setGenderFilter('');
    setLocationFilter('');
    setStatusFilter('');
    setEducationFilter('');
    setSelectedIds([]);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* NOTIFIKASI PEMBARUAN DATA KARYAWAN BARU & KELUAR */}
      <EmployeeNotificationsBanner 
        employees={employees}
        onSelectEmployee={onSelectEmployee}
        onApplyQuickFilter={(filterType) => {
          setQuickFilter(filterType);
          setCurrentPage(1);
        }}
        activeQuickFilter={quickFilter}
      />

      {/* DATA IMPORT / EXPORT BAR */}
      <DataExchangeBar 
        data={filteredEmployees} 
        fileName="laporan_direktori_karyawan" 
        onUploadSuccess={onUploadSuccess}
        onClearAllEmployees={onClearAllEmployees}
        onResetDatabase={onResetDatabase}
        title="Kelola &amp; Ekspor Direktori Karyawan"
        dashboardType="DIRECTORY"
      />

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden" id="employee-table-container">
      {/* 1. FILTER BAR HEADER */}
      <div className="p-5 border-b border-slate-850 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white font-heading">Direktori Database Karyawan</h3>
            <p className="text-xs text-slate-400">
              Menampilkan {filteredEmployees.length.toLocaleString('id-ID')} dari {employees.length.toLocaleString('id-ID')} karyawan terdaftar.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* View switcher */}
            <div className="bg-slate-950 p-0.5 rounded-lg flex items-center border border-slate-800">
              <button 
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                title="Tampilan Tabel"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                title="Tampilan Grid"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

            {/* Export Actions */}
            <button 
              onClick={exportToCSV}
              className="bg-slate-950/65 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button 
              onClick={exportToJSON}
              className="bg-slate-950/65 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">JSON</span>
            </button>

            {/* Reset Database */}
            <button 
              onClick={onResetDatabase}
              disabled={isResetting}
              className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Kembalikan database ke data awal Google Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset Data</span>
            </button>

            {/* Add Employee Button */}
            <button 
              onClick={onAddEmployeeClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Karyawan</span>
            </button>

            {/* Bulk Delete Button */}
            {selectedIds.length > 0 && (
              <button 
                onClick={async () => {
                  await onBulkDeleteEmployees(selectedIds);
                  setSelectedIds([]);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer border border-rose-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {/* Search bar */}
          <div className="relative md:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input 
              type="text" 
              placeholder="Cari nama, ( N I K ), jabatan..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 pl-9 pr-4 py-2 text-sm border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select 
              value={selectedDepartmentFilter}
              onChange={(e) => { onSetDepartmentFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [&_option]:bg-slate-900 [&_option]:text-slate-300"
            >
              <option value="">Semua Bagian</option>
              {departments.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Localization Filter */}
          <div>
            <select 
              value={locationFilter}
              onChange={(e) => { setLocationFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [&_option]:bg-slate-900 [&_option]:text-slate-300"
            >
              <option value="">Domisili (Lokal/Non Lokal)</option>
              <option value="Lokal">Lokal</option>
              <option value="Non-Lokal">Non Lokal</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select 
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [&_option]:bg-slate-900 [&_option]:text-slate-300"
            >
              <option value="">STATUS (PKWT/PKWTT)</option>
              <option value="PKWT">PKWT</option>
              <option value="PKWTT">PKWTT</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(searchTerm !== '' || selectedDepartmentFilter !== '' || genderFilter !== '' || locationFilter !== '' || statusFilter !== '' || educationFilter !== '' || quickFilter !== 'all') && (
            <div>
              <button 
                onClick={() => {
                  clearFilters();
                  setQuickFilter('all');
                }}
                className="w-full bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <X className="w-3.5 h-3.5 text-rose-400" />
                Reset Filter
              </button>
            </div>
          )}
        </div>

        {/* QUICK FILTER CHIPS BAR */}
        <div className="flex items-center gap-2 pt-1 flex-wrap border-t border-slate-850/60">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3 text-blue-400" /> Filter Cepat:
          </span>

          <button
            onClick={() => { setQuickFilter('all'); setCurrentPage(1); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              quickFilter === 'all'
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
            }`}
          >
            Semua Data ({employees.length})
          </button>

          <button
            onClick={() => { setQuickFilter('new'); setCurrentPage(1); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              quickFilter === 'new'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 border-emerald-800/50'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Karyawan Baru</span>
          </button>

          <button
            onClick={() => { setQuickFilter('leaving'); setCurrentPage(1); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              quickFilter === 'leaving'
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                : 'bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border-rose-800/50'
            }`}
          >
            <UserMinus className="w-3 h-3 text-rose-300" />
            <span>Karyawan Keluar / End Kontrak</span>
          </button>

          <button
            onClick={() => { setQuickFilter('pkwt'); setCurrentPage(1); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              quickFilter === 'pkwt'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
            }`}
          >
            PKWT
          </button>

          <button
            onClick={() => { setQuickFilter('pkwtt'); setCurrentPage(1); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              quickFilter === 'pkwtt'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
            }`}
          >
            PKWTT
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC VIEW */}
      {viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/40 text-slate-450 uppercase text-[10px] tracking-wider font-bold border-b border-slate-850">
                <th className="py-3.5 px-4 text-center w-10">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAllToggle}
                    checked={
                      paginatedEmployees.length > 0 && 
                      paginatedEmployees.every(e => selectedIds.includes(e.id))
                    }
                    className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-5 text-center w-12">No.</th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-800 select-none transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    <span>Nama Tenaga Kerja</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-550" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Jabatan</th>
                <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-800 select-none transition-colors" onClick={() => handleSort('department')}>
                  <div className="flex items-center gap-1">
                    <span>Departemen / Bagian</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-550" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-800 select-none transition-colors" onClick={() => handleSort('age')}>
                  <div className="flex items-center gap-1 justify-center">
                    <span>USIA</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-550" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Domisili</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-sm text-slate-300">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                    Karyawan tidak ditemukan. Coba reset filter pencarian Anda.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp, index) => {
                  const globalNoDisplay = emp.globalNo || ((currentPage - 1) * pageSize + index + 1);
                  return (
                    <tr 
                      key={emp.id} 
                      className={`hover:bg-slate-800/30 transition-colors group ${selectedIds.includes(emp.id) ? 'bg-blue-500/5' : ''}`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(emp.id)}
                          onChange={() => handleSelectToggle(emp.id)}
                          className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-5 text-center font-mono text-xs text-slate-550 font-medium">
                        {globalNoDisplay}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="font-bold transition-colors cursor-pointer flex items-center gap-1.5 text-white group-hover:text-blue-400" onClick={() => onSelectEmployee(emp)}>
                            <span>{emp.name}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          NIK: {emp.nik || '-'}
                        </div>
                        {(() => {
                          const cDet = getDaysLeftAndSeverity(emp.contractEndDate);
                          const lDet = getDaysLeftAndSeverity(emp.leaveExpiryDate);
                          return (
                            <div className="flex gap-1.5 mt-1 flex-wrap">
                              {cDet && cDet.severity !== 'safe' && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  cDet.severity === 'expired' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                                }`}>
                                  Kontrak: {cDet.label}
                                </span>
                              )}
                              {lDet && lDet.severity !== 'safe' && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  lDet.severity === 'expired' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                                }`}>
                                  Cuti: {lDet.label}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-300">
                        {emp.position}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs bg-slate-950 text-slate-300 px-2 py-1 rounded font-semibold border border-slate-800">
                          {emp.department}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-medium font-mono text-xs text-slate-400">
                        {emp.age}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {emp.isLocal ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                            Lokal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                            Non-Lokal
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border ${
                          emp.status === 'PKWTT' 
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => onSelectEmployee(emp)}
                            className="p-1.5 hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 rounded-md transition-colors cursor-pointer"
                            title="Detail Karyawan"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => onEditEmployee(emp)}
                            className="p-1.5 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 rounded-md transition-colors cursor-pointer"
                            title="Edit Karyawan"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => onDeleteEmployee(emp.id)}
                            className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                            title="Hapus Karyawan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="p-5" id="employee-grid">
          {paginatedEmployees.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-medium">
              Karyawan tidak ditemukan. Coba reset filter pencarian Anda.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {paginatedEmployees.map((emp) => (
                <div 
                  key={emp.id} 
                  className={`bg-slate-950/60 hover:bg-slate-950 p-4 rounded-xl border transition-all flex flex-col justify-between group ${
                    selectedIds.includes(emp.id) ? 'border-blue-500 bg-slate-900/60' : 'border-slate-850 hover:border-blue-500/40'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-start gap-2">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(emp.id)}
                          onChange={() => handleSelectToggle(emp.id)}
                          className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 accent-blue-600 cursor-pointer mt-1"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold transition-colors line-clamp-1 cursor-pointer flex items-center gap-1 text-white group-hover:text-blue-400" onClick={() => onSelectEmployee(emp)}>
                              {emp.name}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1 font-medium">{emp.position}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                        No. {emp.globalNo}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="line-clamp-1">Bagian: <strong>{emp.department}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Domisili: <strong>{emp.isLocal ? 'Lokal' : 'Non Lokal'}</strong></span>
                      </div>
                      {emp.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="font-mono text-slate-400">{emp.phone}</span>
                        </div>
                      )}
                      {(() => {
                        const cDet = getDaysLeftAndSeverity(emp.contractEndDate);
                        const lDet = getDaysLeftAndSeverity(emp.leaveExpiryDate);
                        return (cDet && cDet.severity !== 'safe') || (lDet && lDet.severity !== 'safe') ? (
                          <div className="flex gap-1.5 pt-2 border-t border-slate-900 flex-wrap">
                            {cDet && cDet.severity !== 'safe' && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                cDet.severity === 'expired' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                              }`}>
                                Kontrak: {cDet.label}
                              </span>
                            )}
                            {lDet && lDet.severity !== 'safe' && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                lDet.severity === 'expired' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                              }`}>
                                Cuti: {lDet.label}
                              </span>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      emp.status === 'PKWTT' 
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}>
                      {emp.status}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => onSelectEmployee(emp)}
                        className="p-1 hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 rounded transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onEditEmployee(emp)}
                        className="p-1 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 rounded transition-colors cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDeleteEmployee(emp.id)}
                        className="p-1 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. PAGINATION BAR CONTROLS */}
      {totalRows > 0 && (
        <div className="p-4 border-t border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Tampilkan</span>
            <select 
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1); }}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 py-1 px-2 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold [&_option]:bg-slate-900"
            >
              <option value={10}>10 Baris</option>
              <option value={15}>15 Baris</option>
              <option value={30}>30 Baris</option>
              <option value={50}>50 Baris</option>
              <option value={100}>100 Baris</option>
            </select>
            <span className="text-xs text-slate-400">per halaman</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Halaman <strong className="text-white">{currentPage}</strong> dari <strong className="text-white">{totalPages}</strong> ({totalRows} Karyawan)
            </span>
            
            <div className="flex items-center border border-slate-800 rounded-lg overflow-hidden bg-slate-950 shadow-sm">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 hover:bg-slate-800 transition-colors border-r border-slate-800 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
