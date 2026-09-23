import React, { useMemo, useState } from 'react';
import { Employee } from '../types';
import { 
  Users, UserCheck, MapPin, Clipboard, Heart, Search, 
  Eye, Edit, ChevronLeft, ChevronRight, Calendar, 
  GraduationCap, Briefcase, TrendingUp, ShieldAlert, FileText,
  Trash2, AlertTriangle, CheckSquare, Square, X, Trash, CheckCircle2,
  AlertCircle, Filter, Layers, RefreshCw, Check
} from 'lucide-react';
import { getDaysLeftAndSeverity, calculateCompensation, isBpjsRegistered } from '../dateUtils';
import DataExchangeBar from './DataExchangeBar';

interface PKWTDashboardProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  onEditEmployee: (emp: Employee) => void;
  initialFilters?: { searchTerm?: string; urgencyFilter?: 'all' | 'expired' | 'urgent' | 'warning' | 'safe' | 'expired-or-urgent' } | null;
  onClearInitialFilters?: () => void;
  onUploadSuccess?: () => void;
}

export default function PKWTDashboard({ 
  employees, 
  onSelectEmployee, 
  onEditEmployee,
  initialFilters,
  onClearInitialFilters,
  onUploadSuccess
}: PKWTDashboardProps) {
  // 1. Filter only PKWT employees
  const pkwtEmployees = useMemo(() => {
    return employees.filter(emp => emp.status === 'PKWT');
  }, [employees]);

  const totalCount = employees.length;
  const pkwtCount = pkwtEmployees.length;
  const pkwttCount = totalCount - pkwtCount;

  // 2. Metrics for PKWT
  const localPkwtCount = useMemo(() => {
    return pkwtEmployees.filter(emp => emp.isLocal).length;
  }, [pkwtEmployees]);

  const nonLocalPkwtCount = pkwtCount - localPkwtCount;
  const localRatio = pkwtCount ? Math.round((localPkwtCount / pkwtCount) * 100) : 0;

  // BPJS coverage specifically for PKWT
  const bpjsTkCovered = useMemo(() => {
    return pkwtEmployees.filter(emp => isBpjsRegistered(emp.bpjsTk)).length;
  }, [pkwtEmployees]);

  const bpjsKesCovered = useMemo(() => {
    return pkwtEmployees.filter(emp => isBpjsRegistered(emp.bpjsKes)).length;
  }, [pkwtEmployees]);

  const bpjsTkRate = pkwtCount ? Math.round((bpjsTkCovered / pkwtCount) * 100) : 0;
  const bpjsKesRate = pkwtCount ? Math.round((bpjsKesCovered / pkwtCount) * 100) : 0;

  // Demographics: Gender and Age specifically for PKWT
  const maleCount = useMemo(() => {
    return pkwtEmployees.filter(emp => emp.gender === 'Laki-laki').length;
  }, [pkwtEmployees]);

  const femaleCount = pkwtCount - maleCount;
  const maleRatio = pkwtCount ? Math.round((maleCount / pkwtCount) * 100) : 0;
  const femaleRatio = pkwtCount ? 100 - maleRatio : 0;

  const avgAge = useMemo(() => {
    if (pkwtCount === 0) return 0;
    const ages = pkwtEmployees.map(emp => {
      const ageStr = String(emp.age || '');
      const match = ageStr.match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    }).filter((a): a is number => a !== null);
    if (ages.length === 0) return 0;
    return Math.round((ages.reduce((sum, val) => sum + val, 0) / ages.length) * 10) / 10;
  }, [pkwtEmployees, pkwtCount]);

  // Tenure calculator utility
  const calculateTenure = (startDateStr: any) => {
    const strVal = startDateStr !== undefined && startDateStr !== null ? String(startDateStr).trim() : '';
    if (!strVal || strVal === '-') return '-';
    
    let normalized = strVal
      .replace(/Okt/i, 'Oct')
      .replace(/Des/i, 'Dec')
      .replace(/Mei/i, 'May')
      .replace(/Agu/i, 'Aug');

    let start = new Date(normalized);
    
    if (isNaN(start.getTime())) {
      const parts = strVal.split('-');
      if (parts.length === 3) {
        const monthsMap: Record<string, number> = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5,
          'Jul': 6, 'Agu': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11,
          'Oct': 9, 'Dec': 11, 'May': 4, 'Aug': 7
        };
        const day = parseInt(parts[0], 10);
        const monthStr = parts[1];
        const month = monthsMap[monthStr] !== undefined ? monthsMap[monthStr] : parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) {
          year += year > 50 ? 1900 : 2000;
        }
        start = new Date(year, month, day);
      }
    }

    if (isNaN(start.getTime())) return '-';

    const end = new Date();
    let diffYears = end.getFullYear() - start.getFullYear();
    let diffMonths = end.getMonth() - start.getMonth();

    if (diffMonths < 0) {
      diffYears--;
      diffMonths += 12;
    }

    const yrPart = diffYears > 0 ? `${diffYears} Thn ` : '';
    const mthPart = diffMonths > 0 ? `${diffMonths} Bln` : '';
    
    return `${yrPart}${mthPart}`.trim() || 'Baru Mulai';
  };

  // 3. Department Breakdown for PKWT
  const departmentStats = useMemo(() => {
    const map = new Map<string, number>();
    pkwtEmployees.forEach(emp => {
      const dept = emp.department || 'LAIN-LAIN';
      map.set(dept, (map.get(dept) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [pkwtEmployees]);

  // 4. Age Brackets specifically for PKWT
  const ageBrackets = useMemo(() => {
    const counts = { 'Dibawah 25': 0, '25 - 34': 0, '35 - 44': 0, '45 - 54': 0, '55 Keatas': 0 };
    pkwtEmployees.forEach(emp => {
      const ageStr = String(emp.age || '');
      const match = ageStr.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (val < 25) counts['Dibawah 25']++;
        else if (val <= 34) counts['25 - 34']++;
        else if (val <= 44) counts['35 - 44']++;
        else if (val <= 54) counts['45 - 54']++;
        else counts['55 Keatas']++;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [pkwtEmployees]);

  // 5. Education levels for PKWT
  const educationStats = useMemo(() => {
    const counts: Record<string, number> = {};
    pkwtEmployees.forEach(emp => {
      let edu = emp.education || 'TIDAK DIKETAHUI';
      if (edu.startsWith('S1')) edu = 'S1';
      else if (edu.startsWith('D3')) edu = 'D3';
      else if (edu.startsWith('S2')) edu = 'S2';
      else if (edu.startsWith('SMK') || edu.startsWith('SMA')) edu = 'SMA/SMK';
      
      counts[edu] = (counts[edu] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [pkwtEmployees]);

  // 5b. Compensation calculations according to PP 35/2021
  const compensationStats = useMemo(() => {
    let totalAccrued = 0;
    let totalProjected = 0;
    let count = 0;
    pkwtEmployees.forEach(emp => {
      const comp = calculateCompensation(emp);
      if (comp) {
        totalAccrued += comp.accruedCompensation;
        totalProjected += comp.projectedCompensation;
        count++;
      }
    });
    return { totalAccrued, totalProjected, count };
  }, [pkwtEmployees]);

  // 6. Interactive Directory Filter state for PKWT Workers
  const [searchTerm, setSearchTerm] = useState('');
  const [localFilter, setLocalFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [bpjsTkFilter, setBpjsTkFilter] = useState('');
  const [bpjsKesFilter, setBpjsKesFilter] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState<'all' | 'expired' | 'urgent' | 'warning' | 'safe' | 'expired-or-urgent'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Mass Delete State for PKWT
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [deleteOption, setDeleteOption] = useState<'selected' | 'filtered' | 'expired' | 'all'>('selected');
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');

  // Single Delete Candidate State
  const [singleDeleteCandidate, setSingleDeleteCandidate] = useState<Employee | null>(null);

  // Apply initial filters when coming from DashboardOverview
  React.useEffect(() => {
    if (initialFilters) {
      if (initialFilters.searchTerm !== undefined) setSearchTerm(initialFilters.searchTerm);
      if (initialFilters.urgencyFilter !== undefined) setContractStatusFilter(initialFilters.urgencyFilter);
      if (onClearInitialFilters) onClearInitialFilters();
    }
  }, [initialFilters, onClearInitialFilters]);

  // List of all unique departments in PKWT
  const pkwtDepts = useMemo(() => {
    const deptsSet = new Set<string>();
    pkwtEmployees.forEach(e => {
      if (e.department) deptsSet.add(e.department);
    });
    return Array.from(deptsSet).sort();
  }, [pkwtEmployees]);

  // Apply filters
  const filteredPkwt = useMemo(() => {
    return pkwtEmployees.filter(emp => {
      // 1. Search term match
      const query = (searchTerm || '').toLowerCase();
      const nameMatch = (emp.name || '').toLowerCase().includes(query);
      const positionMatch = (emp.position || '').toLowerCase().includes(query);
      const nikMatch = (emp.nik || '').toLowerCase().includes(query);
      const idMatch = (emp.id || '').toLowerCase().includes(query);
      const searchMatch = nameMatch || positionMatch || nikMatch || idMatch;

      // 2. Kategori Lokasi
      let locMatch = true;
      if (localFilter === 'Lokal') locMatch = emp.isLocal;
      else if (localFilter === 'Non-Lokal') locMatch = emp.isNonLocal;

      // 3. Departemen
      const dMatch = deptFilter ? emp.department === deptFilter : true;

      // 4. BPJS TK
      let tkMatch = true;
      if (bpjsTkFilter === 'Covered') tkMatch = isBpjsRegistered(emp.bpjsTk);
      else if (bpjsTkFilter === 'NotCovered') tkMatch = !isBpjsRegistered(emp.bpjsTk);

      // 5. BPJS Kes
      let kesMatch = true;
      if (bpjsKesFilter === 'Covered') kesMatch = isBpjsRegistered(emp.bpjsKes);
      else if (bpjsKesFilter === 'NotCovered') kesMatch = !isBpjsRegistered(emp.bpjsKes);

      // 6. Contract Expiration Status
      let contractMatch = true;
      if (contractStatusFilter !== 'all') {
        const details = emp.contractEndDate ? getDaysLeftAndSeverity(emp.contractEndDate) : null;
        const severity = details ? details.severity : 'safe';
        
        if (contractStatusFilter === 'expired') contractMatch = severity === 'expired';
        else if (contractStatusFilter === 'urgent') contractMatch = severity === 'critical';
        else if (contractStatusFilter === 'warning') contractMatch = severity === 'warning';
        else if (contractStatusFilter === 'safe') contractMatch = severity === 'safe';
        else if (contractStatusFilter === 'expired-or-urgent') contractMatch = severity === 'expired' || severity === 'critical';
      }

      return searchMatch && locMatch && dMatch && tkMatch && kesMatch && contractMatch;
    });
  }, [pkwtEmployees, searchTerm, localFilter, deptFilter, bpjsTkFilter, bpjsKesFilter, contractStatusFilter]);

  // Pagination calculations
  const totalRows = filteredPkwt.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const paginatedPkwt = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredPkwt.slice(startIdx, startIdx + pageSize);
  }, [filteredPkwt, currentPage, pageSize]);

  // Compute target IDs for bulk deletion based on selected option
  const idsToDelete = useMemo(() => {
    if (deleteOption === 'selected') {
      return Array.from(selectedIds);
    } else if (deleteOption === 'filtered') {
      return filteredPkwt.map(e => e.id);
    } else if (deleteOption === 'expired') {
      return pkwtEmployees
        .filter(emp => {
          if (!emp.contractEndDate) return false;
          const det = getDaysLeftAndSeverity(emp.contractEndDate);
          return det?.severity === 'expired';
        })
        .map(e => e.id);
    } else if (deleteOption === 'all') {
      return pkwtEmployees.map(e => e.id);
    }
    return [];
  }, [deleteOption, selectedIds, filteredPkwt, pkwtEmployees]);

  // Preview employees to be deleted
  const targetEmployeesPreview = useMemo(() => {
    const idSet = new Set(idsToDelete);
    return pkwtEmployees.filter(e => idSet.has(e.id));
  }, [idsToDelete, pkwtEmployees]);

  // Selection Handlers
  const handleToggleSelectAllPage = () => {
    const pageIds = paginatedPkwt.map(e => e.id);
    const allSelected = pageIds.every(id => selectedIds.has(id));
    const newSet = new Set(selectedIds);

    if (allSelected) {
      pageIds.forEach(id => newSet.delete(id));
    } else {
      pageIds.forEach(id => newSet.add(id));
    }
    setSelectedIds(newSet);
  };

  const handleToggleSelectAllFiltered = () => {
    const filteredIds = filteredPkwt.map(e => e.id);
    const allSelected = filteredIds.every(id => selectedIds.has(id));
    const newSet = new Set(selectedIds);

    if (allSelected) {
      filteredIds.forEach(id => newSet.delete(id));
    } else {
      filteredIds.forEach(id => newSet.add(id));
    }
    setSelectedIds(newSet);
  };

  const handleToggleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Execution Handlers
  const handleExecuteBulkDelete = async () => {
    if (idsToDelete.length === 0) {
      setDeleteError('Tidak ada karyawan PKWT yang terpilih untuk dihapus.');
      return;
    }

    if (confirmText.trim().toUpperCase() !== 'HAPUS') {
      setDeleteError('Ketik kata "HAPUS" untuk mengonfirmasi penghapusan permanen.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    setDeleteSuccessMsg('');

    try {
      const response = await fetch('/api/employees/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus data karyawan.');
      }

      setDeleteSuccessMsg(data.message || `${idsToDelete.length} karyawan PKWT berhasil dihapus.`);
      
      setSelectedIds(new Set());
      setTimeout(() => {
        setIsBulkDeleteModalOpen(false);
        setConfirmText('');
        setDeleteSuccessMsg('');
        if (onUploadSuccess) onUploadSuccess();
      }, 1200);

    } catch (err: any) {
      setDeleteError(err.message || 'Terjadi kesalahan saat menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExecuteSingleDelete = async (emp: Employee) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/employees/${emp.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus karyawan');
      }
      setSingleDeleteCandidate(null);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus karyawan');
    } finally {
      setIsDeleting(false);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setLocalFilter('');
    setDeptFilter('');
    setBpjsTkFilter('');
    setBpjsKesFilter('');
    setContractStatusFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6" id="pkwt-dashboard-view">
      
      {/* 1. SECTION HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <UserCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white font-heading">Analisis Tenaga Kerja PKWT</h2>
          </div>
          <p className="text-xs text-slate-400">
            Pemantauan kontrak, kepatuhan jaminan sosial BPJS, demografi, dan penempatan kerja khusus karyawan dengan hubungan kerja PKWT.
          </p>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 flex gap-4 shrink-0 text-xs">
          <div className="text-center px-2">
            <span className="text-slate-500 block">Karyawan PKWT</span>
            <strong className="text-white text-lg font-bold font-heading">{pkwtCount} Orang</strong>
          </div>
          <div className="border-l border-slate-800" />
          <div className="text-center px-2">
            <span className="text-slate-500 block">Rasio PKWT/Total</span>
            <strong className="text-indigo-400 text-lg font-bold font-heading">
              {totalCount ? Math.round((pkwtCount / totalCount) * 100) : 0}%
            </strong>
          </div>
        </div>
      </div>

      {/* DATA IMPORT / EXPORT BAR */}
      <DataExchangeBar 
        data={filteredPkwt} 
        fileName="laporan_kontrak_pkwt" 
        onUploadSuccess={onUploadSuccess}
        title="Kelola &amp; Ekspor Data Kontrak PKWT"
        dashboardType="PKWT"
      />

      {/* 2. STATS OVERVIEW WIDGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4" id="pkwt-stats-grid">
        {/* Total PKWT */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Karyawan PKWT</p>
            <h3 className="text-3xl font-bold text-white font-heading">{pkwtCount}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Dari total {totalCount} karyawan ({pkwttCount} PKWTT)
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Lokal PKWT Ratio */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1 w-full mr-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PKWT Asal Lokal (Sultra)</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-emerald-400 font-heading">{localPkwtCount}</h3>
              <span className="text-sm font-medium text-slate-400">({localRatio}%)</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${localRatio}%` }} />
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20 shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

        {/* BPJS TK Rate for PKWT */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1 w-full mr-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kepatuhan BPJS TK (PKWT)</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-white font-heading">{bpjsTkCovered}</h3>
              <span className="text-sm font-medium text-slate-400">({bpjsTkRate}%)</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${bpjsTkRate}%` }} />
            </div>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20 shrink-0">
            <Clipboard className="w-6 h-6" />
          </div>
        </div>

        {/* BPJS Kesehatan for PKWT */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1 w-full mr-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">BPJS Kesehatan (PKWT)</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-teal-400 font-heading">{bpjsKesCovered}</h3>
              <span className="text-sm font-medium text-slate-400">({bpjsKesRate}%)</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${bpjsKesRate}%` }} />
            </div>
          </div>
          <div className="p-3 bg-teal-500/10 rounded-lg text-teal-400 border border-teal-500/20 shrink-0">
            <Heart className="w-6 h-6" />
          </div>
        </div>

        {/* PKWT UU Compensation Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1 w-full mr-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kompensasi Terutang (UU)</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-xl font-bold text-amber-450 font-mono">
                Rp {compensationStats.totalAccrued.toLocaleString('id-ID')}
              </h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Proyeksi Selesai: <strong className="text-slate-300 font-mono">Rp {compensationStats.totalProjected.toLocaleString('id-ID')}</strong>
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="pkwt-charts-grid">
        
        {/* Sebaran Departemen (PKWT) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm space-y-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-200 font-heading">Distribusi PKWT per Bagian</h4>
            <p className="text-[10px] text-slate-550">Penempatan tenaga kerja PKWT terbanyak.</p>
          </div>
          
          <div className="space-y-3 pt-2 max-h-[260px] overflow-y-auto pr-1">
            {departmentStats.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Tidak ada data penempatan</p>
            ) : (
              departmentStats.map((item, index) => {
                const maxVal = departmentStats[0]?.count || 1;
                const percent = Math.round((item.count / pkwtCount) * 100);
                const widthPercent = Math.round((item.count / maxVal) * 100);

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300 font-bold truncate max-w-[170px]">{item.name}</span>
                      <span className="text-slate-400 shrink-0">{item.count} Orang ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${widthPercent}%` }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Demografi Usia & Gender (PKWT) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm space-y-5">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-200 font-heading">Demografi & Usia PKWT</h4>
            <p className="text-[10px] text-slate-550">Profil usia dan jenis kelamin karyawan PKWT.</p>
          </div>

          <div className="space-y-4">
            {/* Gender breakdown bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-blue-400">Pria: {maleCount} ({maleRatio}%)</span>
                <span className="text-pink-400">Wanita: {femaleCount} ({femaleRatio}%)</span>
              </div>
              <div className="w-full bg-pink-500/30 h-2.5 rounded-full overflow-hidden flex">
                <div className="bg-blue-500 h-2.5" style={{ width: `${maleRatio}%` }} />
                <div className="bg-pink-500 h-2.5" style={{ width: `${femaleRatio}%` }} />
              </div>
            </div>

            {/* Age stats bar chart */}
            <div className="space-y-2">
              <span className="text-[11px] text-slate-500 block font-bold uppercase tracking-wider">Rentang Usia</span>
              <div className="grid grid-cols-5 gap-1.5 h-[100px] items-end px-1 pt-4 border-b border-slate-850">
                {ageBrackets.map((bracket, index) => {
                  const maxAgeVal = Math.max(...ageBrackets.map(b => b.value)) || 1;
                  const heightPct = Math.round((bracket.value / maxAgeVal) * 100);
                  return (
                    <div key={index} className="flex flex-col items-center gap-1 group h-full justify-end">
                      <span className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono font-bold leading-none">
                        {bracket.value}
                      </span>
                      <div 
                        className="bg-indigo-500 hover:bg-indigo-400 w-full rounded-t-sm transition-all duration-300 min-h-[4px]"
                        style={{ height: `${heightPct ? Math.max(heightPct * 0.7, 4) : 0}%` }}
                        title={`${bracket.value} orang`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center text-[9px] text-slate-500 font-semibold pt-1">
                {ageBrackets.map((bracket, index) => (
                  <span key={index} className="truncate" title={bracket.name}>
                    {bracket.name.replace('Dibawah', '<').replace('Keatas', '+')}
                  </span>
                ))}
              </div>
            </div>

            {/* Rata-rata usia summary */}
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Rata-Rata Usia Kontrak:</span>
              <strong className="text-white text-sm">{avgAge} Tahun</strong>
            </div>
          </div>
        </div>

        {/* Pendidikan Terakhir PKWT */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm space-y-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-200 font-heading">Kualifikasi Pendidikan PKWT</h4>
            <p className="text-[10px] text-slate-550">Tingkat pendidikan formal karyawan PKWT.</p>
          </div>

          <div className="space-y-3 pt-1">
            {educationStats.map((item, index) => {
              const percentage = pkwtCount ? Math.round((item.value / pkwtCount) * 100) : 0;
              let barColor = "bg-blue-500";
              if (item.name === 'SMA/SMK') barColor = "bg-indigo-500";
              else if (item.name === 'SMP') barColor = "bg-amber-500";
              else if (item.name === 'SD') barColor = "bg-orange-500";
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">{item.name}</span>
                    <span className="text-slate-400">{item.value} Orang ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. INTERACTIVE PKWT DIRECTORY LIST */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden" id="pkwt-table-section">
        {/* Header Filter Bar */}
        <div className="p-5 border-b border-slate-850 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-md font-bold text-white font-heading">Direktori Tenaga Kerja PKWT</h3>
              <p className="text-xs text-slate-400">
                Menampilkan {filteredPkwt.length.toLocaleString('id-ID')} dari {pkwtCount.toLocaleString('id-ID')} karyawan PKWT terdaftar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start">
              {/* Menu Hapus Masal PKWT Trigger Button */}
              <button 
                type="button"
                onClick={() => {
                  setDeleteOption(selectedIds.size > 0 ? 'selected' : 'filtered');
                  setConfirmText('');
                  setDeleteError('');
                  setDeleteSuccessMsg('');
                  setIsBulkDeleteModalOpen(true);
                }}
                className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Menu Hapus Masal PKWT</span>
                {selectedIds.size > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-mono font-bold">
                    {selectedIds.size}
                  </span>
                )}
              </button>

              {searchTerm || localFilter || deptFilter || bpjsTkFilter || bpjsKesFilter || contractStatusFilter !== 'all' ? (
                <button 
                  onClick={clearAllFilters}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              ) : null}
            </div>
          </div>

          {/* Selection Info Floating Banner */}
          {selectedIds.size > 0 && (
            <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-rose-200 font-semibold">
                <CheckSquare className="w-4 h-4 text-rose-400" />
                <span>Terpilih <strong className="text-white font-bold">{selectedIds.size}</strong> Karyawan PKWT</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAllFiltered}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-bold cursor-pointer transition-all"
                >
                  Pilih Semua Filter ({filteredPkwt.length})
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-bold cursor-pointer transition-all"
                >
                  Batal Pilih
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteOption('selected');
                    setConfirmText('');
                    setDeleteError('');
                    setDeleteSuccessMsg('');
                    setIsBulkDeleteModalOpen(true);
                  }}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus {selectedIds.size} Karyawan Terpilih</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input 
                type="text" 
                placeholder="Cari nama, NIK, jabatan..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-950 pl-9 pr-4 py-2 text-xs border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all"
              />
            </div>

            {/* Department Filter */}
            <select 
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 px-3 py-2 text-xs border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [&_option]:bg-slate-900 [&_option]:text-slate-300"
            >
              <option value="">Semua Bagian</option>
              {pkwtDepts.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>

            {/* Location Filter */}
            <select 
              value={localFilter}
              onChange={(e) => { setLocalFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 px-3 py-2 text-xs border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [&_option]:bg-slate-900 [&_option]:text-slate-300"
            >
              <option value="">Asal Wilayah</option>
              <option value="Lokal">Lokal (Sultra)</option>
              <option value="Non-Lokal">Non-Lokal</option>
            </select>

            {/* Contract Status Filter */}
            <select 
              value={contractStatusFilter}
              onChange={(e) => { setContractStatusFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full bg-slate-950 px-3 py-2 text-xs border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [&_option]:bg-slate-900 [&_option]:text-slate-300"
            >
              <option value="all">Semua Status Kontrak</option>
              <option value="expired-or-urgent">Jatuh Tempo (Lewat & Mendesak)</option>
              <option value="expired">Sudah Expired</option>
              <option value="urgent">Mendesak (&le; 30 Hari)</option>
              <option value="warning">Siaga Pengingat (31-90 Hari)</option>
              <option value="safe">Aman (&gt; 90 Hari)</option>
            </select>

            {/* BPJS TK Filter */}
            <select 
              value={bpjsTkFilter}
              onChange={(e) => { setBpjsTkFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 px-3 py-2 text-xs border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [&_option]:bg-slate-900 [&_option]:text-slate-300"
            >
              <option value="">Status BPJS TK</option>
              <option value="Covered">Terdaftar Aktif</option>
              <option value="NotCovered">Belum Terdaftar</option>
            </select>

            {/* BPJS Kes Filter */}
            <select 
              value={bpjsKesFilter}
              onChange={(e) => { setBpjsKesFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 px-3 py-2 text-xs border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [&_option]:bg-slate-900 [&_option]:text-slate-300"
            >
              <option value="">Status BPJS Kes</option>
              <option value="Covered">Terdaftar Aktif</option>
              <option value="NotCovered">Belum Terdaftar</option>
            </select>
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/40 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-850">
                <th className="py-3 px-3 text-center w-10">
                  <button
                    type="button"
                    onClick={handleToggleSelectAllPage}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Pilih/Batal Semua Halaman Ini"
                  >
                    {paginatedPkwt.length > 0 && paginatedPkwt.every(e => selectedIds.has(e.id)) ? (
                      <CheckSquare className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 text-center w-10">No.</th>
                <th className="py-3 px-4">Nama Tenaga Kerja</th>
                <th className="py-3 px-4">Jabatan</th>
                <th className="py-3 px-4">Departemen / Bagian</th>
                <th className="py-3 px-4 text-center">Wilayah</th>
                <th className="py-3 px-4 text-center">Mulai Kerja</th>
                <th className="py-3 px-4 text-center">Masa Kerja</th>
                <th className="py-3 px-4 text-center">Kompensasi UU</th>
                <th className="py-3 px-4 text-center">BPJS (TK / Kes)</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-sm text-slate-300">
              {paginatedPkwt.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 font-medium">
                    Karyawan PKWT tidak ditemukan. Sila reset filter pencarian Anda.
                  </td>
                </tr>
              ) : (
                paginatedPkwt.map((emp, index) => {
                  const globalNoDisplay = (currentPage - 1) * pageSize + index + 1;
                  const isTkRegistered = isBpjsRegistered(emp.bpjsTk);
                  const isKesRegistered = isBpjsRegistered(emp.bpjsKes);
                  const comp = calculateCompensation(emp);
                  const isSelected = selectedIds.has(emp.id);

                  return (
                    <tr key={emp.id} className={`hover:bg-slate-800/30 transition-colors group ${isSelected ? 'bg-rose-950/20' : ''}`}>
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectRow(emp.id)}
                          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-rose-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                          )}
                        </button>
                      </td>
                      {/* Number */}
                      <td className="py-3 px-4 text-center font-mono text-xs text-slate-500 font-medium">
                        {globalNoDisplay}
                      </td>
                      {/* Name */}
                      <td className="py-3 px-4">
                        <div 
                          className="font-bold text-white group-hover:text-blue-400 transition-colors cursor-pointer"
                          onClick={() => onSelectEmployee(emp)}
                        >
                          {emp.name}
                        </div>
                        <div className="text-[10px] text-slate-550 font-mono">
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
                      {/* Job Position */}
                      <td className="py-3 px-4 font-medium text-slate-300 text-xs">
                        {emp.position}
                      </td>
                      {/* Department */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded font-semibold border border-slate-800">
                          {emp.department}
                        </span>
                      </td>
                      {/* Location Kategori */}
                      <td className="py-3 px-4 text-center text-xs">
                        {emp.isLocal ? (
                          <span className="inline-flex text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Lokal
                          </span>
                        ) : (
                          <span className="inline-flex text-[9px] font-bold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Non-Lokal
                          </span>
                        )}
                      </td>
                      {/* Mulai Kerja */}
                      <td className="py-3 px-4 text-center text-xs text-slate-400 font-medium">
                        {emp.startDate || '-'}
                      </td>
                      {/* Tenure */}
                      <td className="py-3 px-4 text-center font-bold text-emerald-400 text-xs">
                        {calculateTenure(emp.startDate)}
                      </td>
                      {/* Kompensasi UU */}
                      <td className="py-3 px-4 text-center">
                        {comp ? (
                          <div className="text-xs">
                            <span className="font-bold text-amber-450 font-mono" title={`Dasar Upah (Pokok + Tunj Tetap): Rp ${comp.wageBase.toLocaleString('id-ID')}`}>
                              Rp {comp.accruedCompensation.toLocaleString('id-ID')}
                            </span>
                            <div className="text-[9px] text-slate-500" title={`Proyeksi total saat kontrak selesai: Rp ${comp.projectedCompensation.toLocaleString('id-ID')}`}>
                              Proyeksi: Rp {comp.projectedCompensation.toLocaleString('id-ID')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs font-mono">-</span>
                        )}
                      </td>
                      {/* BPJS TK / Kes status lights */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span 
                            className={`text-[9px] font-bold px-1 rounded border ${
                              isTkRegistered 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                            title={isTkRegistered ? `Terdaftar BPJS TK: ${emp.bpjsTk}` : 'Belum Terdaftar BPJS TK'}
                          >
                            TK
                          </span>
                          <span 
                            className={`text-[9px] font-bold px-1 rounded border ${
                              isKesRegistered 
                                ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                            title={isKesRegistered ? `Terdaftar BPJS Kes: ${emp.bpjsKes}` : 'Belum Terdaftar BPJS Kesehatan'}
                          >
                            KES
                          </span>
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
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
                            title="Edit Data"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setSingleDeleteCandidate(emp)}
                            className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                            title="Hapus Karyawan Ini"
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

        {/* Table Pagination bar */}
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
                <option value={20}>20 Baris</option>
                <option value={50}>50 Baris</option>
              </select>
              <span className="text-xs text-slate-400">per halaman</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">
                Halaman <strong className="text-white">{currentPage}</strong> dari <strong className="text-white">{totalPages}</strong> ({totalRows} PKWT)
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

      {/* MODAL HAPUS MASAL PKWT */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5 text-rose-400">
                <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Menu Hapus Masal PKWT</h3>
                  <p className="text-xs text-slate-400">Pilih kriteria karyawan PKWT yang akan dihapus dari sistem</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                1. Pilih Kriteria Penghapusan Data:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Option 1: Selected */}
                <button
                  type="button"
                  onClick={() => setDeleteOption('selected')}
                  disabled={selectedIds.size === 0}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    deleteOption === 'selected'
                      ? 'bg-rose-950/30 border-rose-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">Centang Terpilih</span>
                    <span className="text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-300 font-mono font-bold rounded-full">
                      {selectedIds.size} Karyawan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Hapus karyawan PKWT yang sudah Anda centang secara manual di tabel.</p>
                </button>

                {/* Option 2: Filtered */}
                <button
                  type="button"
                  onClick={() => setDeleteOption('filtered')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    deleteOption === 'filtered'
                      ? 'bg-rose-950/30 border-rose-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">Hasil Filter Aktif</span>
                    <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold rounded-full">
                      {filteredPkwt.length} Karyawan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Hapus seluruh karyawan PKWT yang sesuai dengan pencarian/filter saat ini.</p>
                </button>

                {/* Option 3: Expired */}
                <button
                  type="button"
                  onClick={() => setDeleteOption('expired')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    deleteOption === 'expired'
                      ? 'bg-rose-950/30 border-rose-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">Kontrak Kadaluarsa</span>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono font-bold rounded-full">
                      {pkwtEmployees.filter(e => e.contractEndDate && getDaysLeftAndSeverity(e.contractEndDate)?.severity === 'expired').length} Karyawan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Hapus otomatis seluruh data PKWT yang tanggal kontrak akhirnya sudah lewat.</p>
                </button>

                {/* Option 4: All */}
                <button
                  type="button"
                  onClick={() => setDeleteOption('all')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    deleteOption === 'all'
                      ? 'bg-rose-950/30 border-rose-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-rose-400">Seluruh Karyawan PKWT</span>
                    <span className="text-[10px] px-2 py-0.5 bg-rose-600/30 text-rose-300 font-mono font-bold rounded-full">
                      {pkwtEmployees.length} Karyawan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Kosongkan/hapus seluruh karyawan PKWT tanpa menyentuh data PKWTT.</p>
                </button>
              </div>
            </div>

            {/* Target Summary Alert */}
            <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-200">Total Sasaran Dihapus:</span>
                <strong className="text-rose-400 font-mono text-sm font-bold">{idsToDelete.length} Karyawan PKWT</strong>
              </div>
              {targetEmployeesPreview.length > 0 && (
                <div className="text-[11px] text-slate-400 max-h-24 overflow-y-auto space-y-1 pr-1 font-mono">
                  {targetEmployeesPreview.slice(0, 5).map(e => (
                    <div key={e.id} className="truncate">
                      • {e.name} ({e.department || 'No Dept'}) - NIK: {e.nik || '-'}
                    </div>
                  ))}
                  {targetEmployeesPreview.length > 5 && (
                    <div className="text-slate-500 italic">
                      ...dan {targetEmployeesPreview.length - 5} karyawan PKWT lainnya.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Safety Confirmation Text */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                2. Konfirmasi Keamanan (Ketik <span className="text-rose-400 font-mono font-bold">HAPUS</span>):
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Ketik HAPUS untuk mengonfirmasi"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono uppercase tracking-wider"
              />
            </div>

            {/* Error or Success feedback */}
            {deleteError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
            {deleteSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{deleteSuccessMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                disabled={isDeleting || confirmText.trim().toUpperCase() !== 'HAPUS' || idsToDelete.length === 0}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all cursor-pointer flex items-center gap-2 shadow-lg"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menghapus {idsToDelete.length} Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eksekusi Hapus Masal ({idsToDelete.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE DELETE CONFIRMATION MODAL */}
      {singleDeleteCandidate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Hapus Karyawan PKWT?</h3>
                <p className="text-xs text-slate-400">Tindakan ini akan menghapus data secara permanen.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="font-bold text-white text-sm">{singleDeleteCandidate.name}</div>
              <div className="text-slate-400 font-mono">NIK: {singleDeleteCandidate.nik || '-'}</div>
              <div className="text-slate-400">Departemen: {singleDeleteCandidate.department || '-'} | Jabatan: {singleDeleteCandidate.position || '-'}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSingleDeleteCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleExecuteSingleDelete(singleDeleteCandidate)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer flex items-center gap-2 shadow-md"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus Karyawan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
