import React, { useMemo, useState } from 'react';
import { Employee } from '../types';
import { 
  Calendar, Users, UserCheck, MapPin, Search, Eye, Edit, 
  ChevronLeft, ChevronRight, AlertTriangle, Clock, RefreshCw, 
  Sparkles, CheckCircle2, AlertCircle, Building2, HelpCircle,
  Briefcase, Compass, Check, BookOpen, CalendarDays
} from 'lucide-react';
import { getDaysLeftAndSeverity, getRoster82Details, formatDate } from '../dateUtils';
import DataExchangeBar from './DataExchangeBar';

interface LeaveDashboardProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  onEditEmployee: (emp: Employee) => void;
  initialFilters?: { searchTerm?: string; urgencyFilter?: 'all' | 'expired' | 'urgent' | 'warning' | 'safe' | 'expired-or-urgent' } | null;
  onClearInitialFilters?: () => void;
  onUploadSuccess?: () => void;
}

export default function LeaveDashboard({ 
  employees, 
  onSelectEmployee, 
  onEditEmployee,
  initialFilters,
  onClearInitialFilters,
  onUploadSuccess
}: LeaveDashboardProps) {
  // Tabs State
  const [subTab, setSubTab] = useState<'tahunan' | 'roster'>('tahunan');

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'local' | 'nonlocal'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'expired' | 'urgent' | 'warning' | 'safe' | 'expired-or-urgent'>('all');
  const [deptFilter, setDeptFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Apply initial filters when coming from DashboardOverview
  React.useEffect(() => {
    if (initialFilters) {
      if (initialFilters.searchTerm !== undefined) setSearchTerm(initialFilters.searchTerm);
      if (initialFilters.urgencyFilter !== undefined) setUrgencyFilter(initialFilters.urgencyFilter);
      if (onClearInitialFilters) onClearInitialFilters();
    }
  }, [initialFilters, onClearInitialFilters]);

  // Roster 8:2 Filters & Selection State
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterTypeFilter, setRosterTypeFilter] = useState<'all' | 'local' | 'nonlocal'>('all');
  const [rosterStatusFilter, setRosterStatusFilter] = useState<'all' | 'work' | 'leave'>('all');
  const [rosterPage, setRosterPage] = useState(1);
  const rosterItemsPerPage = 8;
  const [selectedRosterEmpId, setSelectedRosterEmpId] = useState<string | null>(null);
  const [isUpdatingDecision, setIsUpdatingDecision] = useState(false);

  const handleUpdateRosterDetails = async (employeeId: string, payload: Partial<Employee>) => {
    try {
      setIsUpdatingDecision(true);
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error('Gagal memperbarui opsi cuti roster');
      }
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan perubahan: ' + (err as Error).message);
    } finally {
      setIsUpdatingDecision(false);
    }
  };

  const handleUpdateRosterDecision = async (employeeId: string, decision: 'normal' | 'postponed' | 'annual' | 'special') => {
    // Merge decision and default some other fields if they are missing
    const defaultFields: Partial<Employee> = { rosterDecision: decision };
    const emp = employees.find(e => e.id === employeeId);
    if (emp) {
      if (decision === 'postponed' && emp.postponedWeeks === undefined) {
        defaultFields.postponedWeeks = 2;
      }
      if (decision === 'annual' && emp.annualLeaveDuration === undefined) {
        defaultFields.annualLeaveDuration = 12;
      }
      if (decision === 'special' && emp.specialLeaveDuration === undefined) {
        defaultFields.specialLeaveDuration = 3;
        defaultFields.specialLeaveReason = 'Melahirkan';
      }
    }
    await handleUpdateRosterDetails(employeeId, defaultFields);
  };

  // 1. Filter employees that have a leave expiry date
  const leaveEmployees = useMemo(() => {
    return employees.map(emp => {
      const details = emp.leaveExpiryDate ? getDaysLeftAndSeverity(emp.leaveExpiryDate) : null;
      return {
        employee: emp,
        details
      };
    }).filter(item => item.details !== null) as Array<{
      employee: Employee;
      details: NonNullable<ReturnType<typeof getDaysLeftAndSeverity>>;
    }>;
  }, [employees]);

  // 2. Metrics Calculations
  const metrics = useMemo(() => {
    const totalWithLeave = leaveEmployees.length;
    
    const local = leaveEmployees.filter(item => item.employee.isLocal);
    const nonLocal = leaveEmployees.filter(item => item.employee.isNonLocal);

    const expiredCount = leaveEmployees.filter(item => item.details.severity === 'expired').length;
    const urgentCount = leaveEmployees.filter(item => item.details.severity === 'critical').length;
    const warningCount = leaveEmployees.filter(item => item.details.severity === 'warning').length;
    const safeCount = leaveEmployees.filter(item => item.details.severity === 'safe').length;

    // Local vs Non-Local stats
    const localExpired = local.filter(item => item.details.severity === 'expired').length;
    const localUrgent = local.filter(item => item.details.severity === 'critical').length;
    const localWarning = local.filter(item => item.details.severity === 'warning').length;
    const localSafe = local.filter(item => item.details.severity === 'safe').length;

    const nonLocalExpired = nonLocal.filter(item => item.details.severity === 'expired').length;
    const nonLocalUrgent = nonLocal.filter(item => item.details.severity === 'critical').length;
    const nonLocalWarning = nonLocal.filter(item => item.details.severity === 'warning').length;
    const nonLocalSafe = nonLocal.filter(item => item.details.severity === 'safe').length;

    return {
      totalWithLeave,
      localCount: local.length,
      nonLocalCount: nonLocal.length,
      expiredCount,
      urgentCount,
      warningCount,
      safeCount,
      local: { expired: localExpired, urgent: localUrgent, warning: localWarning, safe: localSafe },
      nonLocal: { expired: nonLocalExpired, urgent: nonLocalUrgent, warning: nonLocalWarning, safe: nonLocalSafe }
    };
  }, [leaveEmployees]);

  // 3. Departments dynamic list
  const departments = useMemo(() => {
    const depts = new Set<string>();
    leaveEmployees.forEach(item => {
      if (item.employee.department) depts.add(item.employee.department);
    });
    return Array.from(depts).sort();
  }, [leaveEmployees]);

  // 4. Department-wise breakdown comparing Local vs Non-Local Leaves
  const deptBreakdown = useMemo(() => {
    const map: Record<string, { local: number; nonlocal: number; urgentOrExpired: number }> = {};
    
    leaveEmployees.forEach(item => {
      const dept = item.employee.department || 'LAINNYA';
      if (!map[dept]) {
        map[dept] = { local: 0, nonlocal: 0, urgentOrExpired: 0 };
      }
      
      if (item.employee.isLocal) {
        map[dept].local += 1;
      } else {
        map[dept].nonlocal += 1;
      }

      if (item.details.severity === 'expired' || item.details.severity === 'critical') {
        map[dept].urgentOrExpired += 1;
      }
    });

    return Object.entries(map)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.urgentOrExpired - a.urgentOrExpired || (b.local + b.nonlocal) - (a.local + a.nonlocal));
  }, [leaveEmployees]);

  // 5. Apply filters to the table list
  const filteredLeaveList = useMemo(() => {
    return leaveEmployees.filter(item => {
      // Name, NIK or Position search
      const query = (searchTerm || '').toLowerCase();
      const empName = (item.employee?.name || '').toLowerCase();
      const empNik = (item.employee?.nik || '').toLowerCase();
      const empPos = (item.employee?.position || '').toLowerCase();
      const matchSearch = empName.includes(query) || empNik.includes(query) || empPos.includes(query);
      
      // Type local/nonlocal
      let matchType = true;
      if (typeFilter === 'local') matchType = item.employee.isLocal;
      if (typeFilter === 'nonlocal') matchType = item.employee.isNonLocal;

      // Urgency filter
      let matchUrgency = true;
      if (urgencyFilter === 'expired') matchUrgency = item.details.severity === 'expired';
      if (urgencyFilter === 'urgent') matchUrgency = item.details.severity === 'critical';
      if (urgencyFilter === 'warning') matchUrgency = item.details.severity === 'warning';
      if (urgencyFilter === 'safe') matchUrgency = item.details.severity === 'safe';
      if (urgencyFilter === 'expired-or-urgent') {
        matchUrgency = item.details.severity === 'expired' || item.details.severity === 'critical';
      }

      // Department filter
      const matchDept = deptFilter === '' || item.employee.department === deptFilter;

      return matchSearch && matchType && matchUrgency && matchDept;
    });
  }, [leaveEmployees, searchTerm, typeFilter, urgencyFilter, deptFilter]);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, urgencyFilter, deptFilter]);

  // Pagination
  const totalItems = filteredLeaveList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeaveList.slice(start, start + itemsPerPage);
  }, [filteredLeaveList, currentPage]);

  // ==========================================
  // ROSTER 8:2 CALCULATIONS
  // ==========================================
  const rosterEmployees = useMemo(() => {
    return employees.map(emp => {
      const roster = emp.startDate ? getRoster82Details(emp.startDate, new Date('2026-07-15T00:00:00'), emp.rosterDecision) : null;
      return {
        employee: emp,
        roster
      };
    }).filter(item => item.roster !== null) as Array<{
      employee: Employee;
      roster: NonNullable<ReturnType<typeof getRoster82Details>>;
    }>;
  }, [employees]);

  const rosterMetrics = useMemo(() => {
    const total = rosterEmployees.length;
    const working = rosterEmployees.filter(item => item.roster.isWorkPeriod).length;
    const onLeave = rosterEmployees.filter(item => !item.roster.isWorkPeriod).length;
    const local = rosterEmployees.filter(item => item.employee.isLocal).length;
    const nonLocal = rosterEmployees.filter(item => item.employee.isNonLocal).length;

    return { total, working, onLeave, local, nonLocal };
  }, [rosterEmployees]);

  const filteredRosterEmployees = useMemo(() => {
    return rosterEmployees.filter(item => {
      const query = (rosterSearch || '').toLowerCase();
      const empName = (item.employee?.name || '').toLowerCase();
      const empNik = (item.employee?.nik || '').toLowerCase();
      const empPos = (item.employee?.position || '').toLowerCase();
      const matchSearch = empName.includes(query) || empNik.includes(query) || empPos.includes(query);
      
      let matchType = true;
      if (rosterTypeFilter === 'local') matchType = item.employee.isLocal;
      if (rosterTypeFilter === 'nonlocal') matchType = item.employee.isNonLocal;

      let matchStatus = true;
      if (rosterStatusFilter === 'work') matchStatus = item.roster.isWorkPeriod;
      if (rosterStatusFilter === 'leave') matchStatus = !item.roster.isWorkPeriod;

      return matchSearch && matchType && matchStatus;
    });
  }, [rosterEmployees, rosterSearch, rosterTypeFilter, rosterStatusFilter]);

  // Reset roster page when filter changes
  React.useEffect(() => {
    setRosterPage(1);
  }, [rosterSearch, rosterTypeFilter, rosterStatusFilter]);

  const totalRosterItems = filteredRosterEmployees.length;
  const totalRosterPages = Math.ceil(totalRosterItems / rosterItemsPerPage) || 1;
  const paginatedRosterList = useMemo(() => {
    const start = (rosterPage - 1) * rosterItemsPerPage;
    return filteredRosterEmployees.slice(start, start + rosterItemsPerPage);
  }, [filteredRosterEmployees, rosterPage]);

  // Selected roster details for side drawer/modal
  const selectedRosterDetails = useMemo(() => {
    if (!selectedRosterEmpId) return null;
    return rosterEmployees.find(item => item.employee.id === selectedRosterEmpId) || null;
  }, [rosterEmployees, selectedRosterEmpId]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                Analisis Cuti Tahunan
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-950 text-slate-400 text-xs font-mono border border-slate-800">
                Baseline: 15-Jul-2026
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white font-heading tracking-tight">
              Jatuh Tempo Cuti
            </h1>
            <p className="text-slate-400 text-xs md:text-sm">
              Pantau batas waktu pengambilan hak cuti tahunan dengan segmentasi Karyawan Lokal vs Non-Lokal.
            </p>
          </div>
          
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">Masa Pemantauan</div>
              <div className="text-xs font-bold text-slate-200">Kepatuhan Berkelanjutan</div>
            </div>
          </div>
        </div>
      </div>

      {/* DATA IMPORT / EXPORT BAR */}
      <DataExchangeBar 
        data={subTab === 'tahunan' ? filteredLeaveList : filteredRosterEmployees} 
        fileName={subTab === 'tahunan' ? 'laporan_cuti_tahunan' : 'laporan_roster_cuti'} 
        onUploadSuccess={onUploadSuccess}
        title={subTab === 'tahunan' ? 'Kelola & Ekspor Cuti Tahunan' : 'Kelola & Ekspor Roster Cuti'}
      />

      {/* SUB-TABS SELECTOR */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setSubTab('tahunan')}
          className={`pb-3 font-bold text-sm relative transition-all cursor-pointer ${
            subTab === 'tahunan' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {subTab === 'tahunan' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
          <span className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Pemantauan Cuti Tahunan 12 Hari
          </span>
        </button>
        <button
          onClick={() => setSubTab('roster')}
          className={`pb-3 font-bold text-sm relative transition-all cursor-pointer ${
            subTab === 'roster' ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {subTab === 'roster' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
          )}
          <span className="flex items-center gap-2">
            <Compass className="w-4 h-4" />
            Sistem Roster Cuti &amp; Kerja 8:2
          </span>
        </button>
      </div>

      {subTab === 'tahunan' ? (
        <>
          {/* KETERANGAN & REGULASI CUTI TAHUNAN */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden mb-6">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start gap-5">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20 shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-3 w-full">
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    Ketentuan Cuti Tahunan 12 Hari Kerja &amp; Ragam Jenis Cuti Resmi
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Berdasarkan perundang-undangan ketenagakerjaan Indonesia (UU No. 13 Tahun 2003 Pasal 79), setiap pekerja memiliki hak istirahat dan cuti resmi berikut:
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-slate-300">
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850 space-y-1.5">
                    <span className="font-bold text-blue-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> 1. Cuti Tahunan Resmi
                    </span>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      Hak sekurang-kurangnya <strong>12 hari kerja</strong> setelah karyawan bekerja selama 12 bulan secara terus-menerus dengan upah dibayar penuh.
                    </p>
                  </div>

                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850 space-y-1.5">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> 2. Cuti Sakit (Medical)
                    </span>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      Hak istirahat berbayar saat kondisi sakit dengan menyertakan Surat Keterangan Dokter yang sah tanpa pemotongan upah pokok.
                    </p>
                  </div>

                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850 space-y-1.5">
                    <span className="font-bold text-purple-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> 3. Cuti Bersalin &amp; Keguguran
                    </span>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      Pekerja perempuan berhak cuti melahirkan <strong>3 bulan</strong> penuh, dan cuti <strong>1.5 bulan</strong> jika mengalami keguguran kandungan.
                    </p>
                  </div>

                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850 space-y-1.5">
                    <span className="font-bold text-rose-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> 4. Cuti Alasan Penting
                    </span>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      Izin khusus berbayar: Menikah (3 hari), Menikahkan anak (2 hari), Istri melahirkan (2 hari), Anggota keluarga inti wafat (2 hari).
                    </p>
                  </div>

                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850 space-y-1.5">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> 5. Cuti Roster (Khusus Proyek)
                    </span>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      Sistem istirahat bergilir lapangan (On-site 8 minggu aktif, Off-site 2 minggu/14 hari berbayar) guna rotasi berkelanjutan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KPI STATS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL LEAVES */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Hak Cuti Terpantau</span>
              <span className="text-3xl font-black text-white font-mono">{metrics.totalWithLeave}</span>
            </div>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 border-t border-slate-800/50 pt-2 flex justify-between">
            <span>Karyawan terdaftar cuti</span>
            <span className="font-bold text-indigo-400">100%</span>
          </p>
        </div>

        {/* LOCAL LEAVES */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Karyawan Lokal (Sultra)</span>
              <span className="text-3xl font-black text-blue-400 font-mono">{metrics.localCount}</span>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 border-t border-slate-800/50 pt-2 flex justify-between">
            <span>Mendesak/Expired:</span>
            <span className="font-bold text-rose-400">{metrics.local.expired + metrics.local.urgent} Karyawan</span>
          </p>
        </div>

        {/* NON LOCAL LEAVES */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Karyawan Non-Lokal</span>
              <span className="text-3xl font-black text-amber-400 font-mono">{metrics.nonLocalCount}</span>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 border-t border-slate-800/50 pt-2 flex justify-between">
            <span>Mendesak/Expired:</span>
            <span className="font-bold text-rose-400">{metrics.nonLocal.expired + metrics.nonLocal.urgent} Karyawan</span>
          </p>
        </div>

        {/* URGENCY SUMMARY */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Sudah Expired / Urgen</span>
              <span className="text-3xl font-black text-rose-400 font-mono">
                {metrics.expiredCount + metrics.urgentCount}
              </span>
            </div>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 border-t border-slate-800/50 pt-2 flex justify-between">
            <span>Segera tindak lanjuti</span>
            <span className="font-bold text-rose-400">Tindakan Cepat</span>
          </p>
        </div>
      </div>

      {/* SEGMENTATION AND VISUAL DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* STATISTIK DISTRIBUSI LOKAL VS NON LOKAL */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-7 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Perbandingan Distribusi Status Cuti</h3>
            <p className="text-xs text-slate-400">Persentase &amp; jumlah status keterlambatan cuti menurut demografi Lokal vs Non-Lokal.</p>
          </div>

          <div className="space-y-4">
            {/* STATUS: EXPIRED */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Lewat Jatuh Tempo (Expired)
                </span>
                <span className="text-slate-300 font-mono">
                  {metrics.expiredCount} Karyawan ({metrics.local.expired} Lokal | {metrics.nonLocal.expired} Non-Lokal)
                </span>
              </div>
              <div className="h-4 bg-slate-950 rounded-lg overflow-hidden flex border border-slate-800 p-0.5">
                {metrics.expiredCount > 0 ? (
                  <>
                    <div 
                      style={{ width: `${(metrics.local.expired / metrics.expiredCount) * 100}%` }}
                      className="bg-red-600 rounded-l transition-all duration-500 flex items-center justify-center text-[8px] font-bold text-white"
                      title={`Lokal: ${metrics.local.expired}`}
                    >
                      {metrics.local.expired > 0 && `Lokal (${metrics.local.expired})`}
                    </div>
                    <div 
                      style={{ width: `${(metrics.nonLocal.expired / metrics.expiredCount) * 100}%` }}
                      className="bg-rose-500 rounded-r transition-all duration-500 flex items-center justify-center text-[8px] font-bold text-white"
                      title={`Non-Lokal: ${metrics.nonLocal.expired}`}
                    >
                      {metrics.nonLocal.expired > 0 && `Non-Lokal (${metrics.nonLocal.expired})`}
                    </div>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-center text-[9px] text-slate-600 font-bold">Aman - Tidak ada yang expired</div>
                )}
              </div>
            </div>

            {/* STATUS: URGENT (<30 HARI) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Sangat Mendesak (&le; 30 Hari lagi)
                </span>
                <span className="text-slate-300 font-mono">
                  {metrics.urgentCount} Karyawan ({metrics.local.urgent} Lokal | {metrics.nonLocal.urgent} Non-Lokal)
                </span>
              </div>
              <div className="h-4 bg-slate-950 rounded-lg overflow-hidden flex border border-slate-800 p-0.5">
                {metrics.urgentCount > 0 ? (
                  <>
                    <div 
                      style={{ width: `${(metrics.local.urgent / metrics.urgentCount) * 100}%` }}
                      className="bg-rose-600 rounded-l transition-all duration-500 flex items-center justify-center text-[8px] font-bold text-white"
                      title={`Lokal: ${metrics.local.urgent}`}
                    >
                      {metrics.local.urgent > 0 && `Lokal (${metrics.local.urgent})`}
                    </div>
                    <div 
                      style={{ width: `${(metrics.nonLocal.urgent / metrics.urgentCount) * 100}%` }}
                      className="bg-amber-500 rounded-r transition-all duration-500 flex items-center justify-center text-[8px] font-bold text-white"
                      title={`Non-Lokal: ${metrics.nonLocal.urgent}`}
                    >
                      {metrics.nonLocal.urgent > 0 && `Non-Lokal (${metrics.nonLocal.urgent})`}
                    </div>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-center text-[9px] text-slate-600 font-bold">Aman - Tidak ada yang mendesak</div>
                )}
              </div>
            </div>

            {/* STATUS: WARNING (31-90 HARI) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Siaga Pengingat (31-90 Hari lagi)
                </span>
                <span className="text-slate-300 font-mono">
                  {metrics.warningCount} Karyawan ({metrics.local.warning} Lokal | {metrics.nonLocal.warning} Non-Lokal)
                </span>
              </div>
              <div className="h-4 bg-slate-950 rounded-lg overflow-hidden flex border border-slate-800 p-0.5">
                {metrics.warningCount > 0 ? (
                  <>
                    <div 
                      style={{ width: `${(metrics.local.warning / metrics.warningCount) * 100}%` }}
                      className="bg-amber-500/80 rounded-l transition-all duration-500 flex items-center justify-center text-[8px] font-bold text-white"
                      title={`Lokal: ${metrics.local.warning}`}
                    >
                      {metrics.local.warning > 0 && `Lokal (${metrics.local.warning})`}
                    </div>
                    <div 
                      style={{ width: `${(metrics.nonLocal.warning / metrics.warningCount) * 100}%` }}
                      className="bg-amber-400 rounded-r transition-all duration-500 flex items-center justify-center text-[8px] font-bold text-slate-950"
                      title={`Non-Lokal: ${metrics.nonLocal.warning}`}
                    >
                      {metrics.nonLocal.warning > 0 && `Non-Lokal (${metrics.nonLocal.warning})`}
                    </div>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-center text-[9px] text-slate-600 font-bold">Aman - Tidak ada status siaga</div>
                )}
              </div>
            </div>

            {/* STATUS: SAFE (>90 HARI) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Status Aman (&gt; 90 Hari lagi)
                </span>
                <span className="text-slate-300 font-mono">
                  {metrics.safeCount} Karyawan ({metrics.local.safe} Lokal | {metrics.nonLocal.safe} Non-Lokal)
                </span>
              </div>
              <div className="h-4 bg-slate-950 rounded-lg overflow-hidden flex border border-slate-800 p-0.5">
                {metrics.safeCount > 0 ? (
                  <>
                    <div 
                      style={{ width: `${(metrics.local.safe / metrics.safeCount) * 100}%` }}
                      className="bg-emerald-600 rounded-l transition-all duration-500 flex items-center justify-center text-[8px] font-bold text-white"
                      title={`Lokal: ${metrics.local.safe}`}
                    >
                      {metrics.local.safe > 0 && `Lokal (${metrics.local.safe})`}
                    </div>
                    <div 
                      style={{ width: `${(metrics.nonLocal.safe / metrics.safeCount) * 100}%` }}
                      className="bg-emerald-500 rounded-r transition-all duration-500 flex items-center justify-center text-[8px] font-bold text-white"
                      title={`Non-Lokal: ${metrics.nonLocal.safe}`}
                    >
                      {metrics.nonLocal.safe > 0 && `Non-Lokal (${metrics.nonLocal.safe})`}
                    </div>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-center text-[9px] text-slate-600 font-bold">Belum ada data status aman</div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex items-start gap-2 text-[11px] text-slate-400">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              <strong>Tips Manajemen Cuti:</strong> Karyawan <strong>Non-Lokal</strong> memiliki prioritas khusus untuk monitoring jatuh tempo cuti guna meminimalkan biaya mobilisasi perjalanan dinas dan kepatuhan sirkulasi kru lapangan.
            </p>
          </div>
        </div>

        {/* DEPT BREAKDOWN */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cuti Mendesak per Departemen</h3>
            <p className="text-xs text-slate-400">Jumlah karyawan dengan cuti jatuh tempo mendesak / expired.</p>
          </div>

          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            {deptBreakdown.map((dept, idx) => {
              const totalDeptLeaves = dept.local + dept.nonlocal;
              return (
                <div key={idx} className="bg-slate-950/50 p-3 rounded-lg border border-slate-850 flex justify-between items-center hover:border-slate-800 transition-all">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-200 block truncate max-w-[180px]">{dept.name}</span>
                    <span className="text-[10px] text-slate-500 block">
                      Total Hak Cuti: <span className="font-semibold text-slate-300">{totalDeptLeaves}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-rose-400">
                        {dept.urgentOrExpired} Urgen
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        {dept.local} Lok | {dept.nonlocal} N-Lok
                      </div>
                    </div>
                    <div className="w-2 h-8 bg-slate-900 rounded-full overflow-hidden flex flex-col-reverse">
                      <div 
                        style={{ height: `${totalDeptLeaves > 0 ? (dept.urgentOrExpired / totalDeptLeaves) * 100 : 0}%` }}
                        className="bg-rose-500 w-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SEARCH, FILTER AND TABULAR DIRECTORY */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        {/* FILTERS PANEL */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Direktori Pemantauan Cuti</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-auto">
            {/* SEARCH */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama atau NIK..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all"
              />
            </div>

            {/* DEPT FILTER */}
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

            {/* SEGMENTATION FILTER */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="all">Semua Jenis Domisili</option>
              <option value="local">Karyawan Lokal (Sultra)</option>
              <option value="nonlocal">Karyawan Non-Lokal</option>
            </select>

            {/* URGENCY STATUS FILTER */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="all">Semua Status Jatuh Tempo</option>
              <option value="expired-or-urgent">Jatuh Tempo (Lewat & Mendesak)</option>
              <option value="expired">Sudah Expired</option>
              <option value="urgent">Mendesak (&le; 30 Hari)</option>
              <option value="warning">Siaga Pengingat (31-90 Hari)</option>
              <option value="safe">Aman (&gt; 90 Hari)</option>
            </select>
          </div>
        </div>

        {/* RESULTS TABLE */}
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-850 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                <th className="py-3 px-4">Karyawan</th>
                <th className="py-3 px-4">Departemen &amp; Jabatan</th>
                <th className="py-3 px-4">Tipe Domisili</th>
                <th className="py-3 px-4">Jatuh Tempo Cuti</th>
                <th className="py-3 px-4">Sisa Hari</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 text-slate-300">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    Tidak ditemukan karyawan dengan kriteria pencarian atau filter cuti tersebut.
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => {
                  const { employee, details } = item;
                  
                  // Label & styling according to status
                  let statusBadge = '';
                  let progressBg = '';
                  if (details.severity === 'expired') {
                    statusBadge = 'bg-red-500/10 text-red-400 border border-red-500/20';
                    progressBg = 'bg-red-600';
                  } else if (details.severity === 'critical') {
                    statusBadge = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                    progressBg = 'bg-rose-500';
                  } else if (details.severity === 'warning') {
                    statusBadge = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                    progressBg = 'bg-amber-500';
                  } else {
                    statusBadge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                    progressBg = 'bg-emerald-500';
                  }

                  return (
                    <tr 
                      key={idx} 
                      className="hover:bg-slate-950/30 text-xs transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-white group-hover:text-blue-400 transition-colors">
                          {employee.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          NIK: {employee.nik || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-300">{employee.position}</div>
                        <div className="text-[10px] text-slate-400">{employee.department}</div>
                      </td>
                      <td className="py-3 px-4">
                        {employee.isLocal ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            Lokal (Sultra)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                            Non-Lokal
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-300">
                        {employee.leaveExpiryDate}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1 w-28">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusBadge}`}>
                              {details.label}
                            </span>
                          </div>
                          {details.daysLeft >= 0 ? (
                            <div className="w-full bg-slate-950 rounded-full h-1 border border-slate-800">
                              <div 
                                style={{ width: `${Math.min(100, Math.max(5, (details.daysLeft / 180) * 100))}%` }} 
                                className={`h-full rounded-full ${progressBg}`}
                              />
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onSelectEmployee(employee)}
                            title="Lihat Detail"
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditEmployee(employee)}
                            title="Edit"
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-700"
                          >
                            <Edit className="w-3.5 h-3.5" />
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

        {/* PAGINATION CONTROL */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-850 text-xs">
          <div className="text-slate-400">
            Menampilkan <span className="text-slate-200 font-bold">{Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}</span> sampai{' '}
            <span className="text-slate-200 font-bold">{Math.min(totalItems, currentPage * itemsPerPage)}</span> dari{' '}
            <span className="text-slate-200 font-bold">{totalItems}</span> data cuti terpilih
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="p-1.5 bg-slate-950 hover:bg-slate-850 text-slate-400 disabled:opacity-40 disabled:hover:bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 font-bold text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-slate-950 hover:bg-slate-850 text-slate-400 disabled:opacity-40 disabled:hover:bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
        </>
      ) : (
        /* ROSTER 8:2 MAIN VIEW PANEL */
        <div className="space-y-6">
          {/* ROSTER EXPLANATION CARD (KETERANGAN) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20 shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Keterangan &amp; Aturan Sistem Roster Kerja &amp; Cuti 8:2</h3>
                <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    <strong>Sistem Roster 8:2 (Weeks)</strong> adalah pola perputaran kerja lapangan (On-Site) dan istirahat berbayar (Off-Site/Field Break) yang dirancang untuk menjaga kelangsungan operasional proyek lapangan secara kontinu.
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
                    <li><strong>Masa Kerja Aktif di Lapangan:</strong> Karyawan bertugas penuh di site lapangan selama <strong>8 minggu berturut-turut (56 hari)</strong>.</li>
                    <li><strong>Masa Cuti Roster (Field Break):</strong> Karyawan mendapatkan cuti istirahat selama <strong>2 minggu penuh (14 hari)</strong> untuk berkumpul dengan keluarga.</li>
                    <li><strong>Dasar Perhitungan Siklus:</strong> Tanggal keberangkatan, rotasi, dan kepulangan dihitung secara otomatis secara berulang tiap <strong>70 hari</strong> semenjak <strong>Tanggal Mulai Kerja</strong> karyawan bersangkutan.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* ROSTER KPI SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Kru Terdaftar Roster</span>
              <span className="text-2xl font-black text-white font-mono">{rosterMetrics.total}</span>
              <p className="text-[9px] text-slate-500 mt-2">Dihitung otomatis dari tanggal mulai kerja</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-emerald-400 font-bold uppercase block">Aktif di Lapangan (On-Site)</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {rosterMetrics.working} <span className="text-xs font-normal text-slate-500">Kru</span>
              </span>
              <p className="text-[9px] text-slate-500 mt-2">Sedang bertugas lapangan (8 minggu)</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-amber-400 font-bold uppercase block">Sedang Cuti Roster (Off-Site)</span>
              <span className="text-2xl font-black text-amber-400 font-mono">
                {rosterMetrics.onLeave} <span className="text-xs font-normal text-slate-500">Kru</span>
              </span>
              <p className="text-[9px] text-slate-500 mt-2">Sedang menikmati istirahat (2 minggu)</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-blue-400 font-bold uppercase block">Rasio Domisili Kru</span>
              <span className="text-2xl font-black text-blue-400 font-mono">
                {rosterMetrics.local} <span className="text-xs font-normal text-slate-500">Lok</span>
                <span className="text-xs font-normal text-slate-600 mx-1.5">|</span>
                <span className="text-amber-400 font-mono">{rosterMetrics.nonLocal} <span className="text-xs font-normal text-slate-500">N-Lok</span></span>
              </span>
              <p className="text-[9px] text-slate-500 mt-2">Penyebaran personel lokal vs luar daerah</p>
            </div>
          </div>

          {/* TWO COLUMN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: ROSTER LIST TABLE */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-7 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" /> Daftar Kru &amp; Status Rotasi Lapangan
                </h4>
                
                <div className="flex flex-wrap gap-2 text-xs">
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Nama / NIK..."
                    className="px-2.5 py-1 text-xs bg-slate-950 border border-slate-850 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <select
                    value={rosterStatusFilter}
                    onChange={(e) => setRosterStatusFilter(e.target.value as any)}
                    className="px-2 py-1 text-xs bg-slate-950 border border-slate-850 rounded-lg text-white focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Status</option>
                    <option value="work">On-Site (Bekerja)</option>
                    <option value="leave">Off-Site (Cuti)</option>
                  </select>
                </div>
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Nama / Divisi</th>
                      <th className="py-2.5 px-3">Mulai Kerja</th>
                      <th className="py-2.5 px-3">Siklus Kerja</th>
                      <th className="py-2.5 px-3">Status Roster</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/40 text-slate-300">
                    {paginatedRosterList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          Tidak ada data kru roster ditemukan.
                        </td>
                      </tr>
                    ) : (
                      paginatedRosterList.map((item, idx) => {
                        const isSelected = selectedRosterEmpId === item.employee.id;
                        return (
                          <tr 
                            key={idx} 
                            onClick={() => setSelectedRosterEmpId(item.employee.id)}
                            className={`hover:bg-slate-950/45 transition-colors cursor-pointer ${
                              isSelected ? 'bg-amber-500/5 text-white font-medium' : ''
                            }`}
                          >
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <div className="font-bold group-hover:text-amber-400">{item.employee.name}</div>
                                {item.employee.rosterDecision === 'postponed' && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold shrink-0">
                                    ⏳ Ditunda
                                  </span>
                                )}
                                {item.employee.rosterDecision === 'annual' && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold shrink-0">
                                    📅 Cuti Tahunan 12 Hari
                                  </span>
                                )}
                                {item.employee.rosterDecision === 'special' && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold shrink-0">
                                    🌟 Cuti Khusus
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">{item.employee.department}</div>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-400">{item.employee.startDate}</td>
                            <td className="py-3 px-3">
                              <span className="px-1.5 py-0.5 bg-slate-950 rounded text-amber-400 font-extrabold font-mono border border-slate-850 text-[10px]">
                                SIKLUS {item.roster.cycleNumber}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {item.roster.isWorkPeriod ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                  👷 On-Site ({item.roster.daysRemaining}h lagi)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold animate-pulse">
                                  🏡 Off-Site ({item.roster.daysRemaining}h lagi)
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex justify-end items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRosterEmpId(item.employee.id);
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'bg-amber-500 text-slate-950' 
                                      : 'bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800'
                                  }`}
                                >
                                  Detail Jadwal
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditEmployee(item.employee);
                                  }}
                                  title="Edit Karyawan"
                                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-700"
                                >
                                  <Edit className="w-3.5 h-3.5" />
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

              {/* PAGINATION */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-850 text-[11px] text-slate-400">
                <span>Hal {rosterPage} / {totalRosterPages}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setRosterPage(p => Math.max(1, p - 1))}
                    disabled={rosterPage === 1}
                    className="p-1 bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:hover:bg-slate-950 rounded cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRosterPage(p => Math.min(totalRosterPages, p + 1))}
                    disabled={rosterPage === totalRosterPages}
                    className="p-1 bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:hover:bg-slate-950 rounded cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: DETAIL TIMELINE EXPLORER */}
            <div className="lg:col-span-5 space-y-4">
              {!selectedRosterDetails ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4 text-slate-400 h-full flex flex-col justify-center items-center">
                  <Compass className="w-12 h-12 text-slate-700 animate-pulse" />
                  <div className="space-y-1">
                    <h5 className="font-bold text-slate-300">Pilih Kru Roster</h5>
                    <p className="text-xs max-w-xs mx-auto text-slate-500 leading-relaxed">
                      Klik nama karyawan di daftar sebelah kiri untuk menghitung siklus keberangkatan secara dinamis dari tanggal mulai kerjanya.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  {/* HEADER */}
                  <div className="pb-3 border-b border-slate-800 flex justify-between items-start">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-white">{selectedRosterDetails.employee.name}</h4>
                      <p className="text-[10px] text-slate-400">{selectedRosterDetails.employee.position} &bull; {selectedRosterDetails.employee.department}</p>
                      <p className="text-[10px] text-slate-500">Mulai Kerja: <span className="font-semibold text-slate-400 font-mono">{selectedRosterDetails.employee.startDate}</span></p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {selectedRosterDetails.employee.isLocal ? (
                        <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold">Lokal</span>
                      ) : (
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold">Non-Lokal</span>
                      )}
                      <button
                        onClick={() => onEditEmployee(selectedRosterDetails.employee)}
                        className="px-2 py-1 rounded text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 cursor-pointer transition-all border border-blue-500 shadow-sm"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit Data</span>
                      </button>
                    </div>
                  </div>

                  {/* CURRENT CYCLE TIMELINE */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">Siklus Kerja (Ke-{selectedRosterDetails.roster.cycleNumber})</span>
                      <span className="text-[10px] text-slate-500 font-mono">1 Siklus = 70 Hari</span>
                    </div>

                    {/* Progress Bar representation */}
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-850/60 space-y-2">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className={selectedRosterDetails.roster.isWorkPeriod ? 'text-emerald-400' : 'text-slate-500'}>
                          Masa Lapangan (56 Hari)
                        </span>
                        <span className={!selectedRosterDetails.roster.isWorkPeriod ? 'text-amber-400' : 'text-slate-500'}>
                          Masa Istirahat (14 Hari)
                        </span>
                      </div>
                      
                      {/* Bar rendering */}
                      <div className="h-2 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800 p-0.5">
                        <div 
                          style={{ width: '80%' }} 
                          className={`h-full rounded-l transition-all duration-300 ${
                            selectedRosterDetails.roster.isWorkPeriod ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                        />
                        <div 
                          style={{ width: '20%' }} 
                          className={`h-full rounded-r transition-all duration-300 ${
                            !selectedRosterDetails.roster.isWorkPeriod ? 'bg-amber-500' : 'bg-slate-800'
                          }`}
                        />
                      </div>
                      
                      <p className="text-[10px] text-slate-400 text-center pt-1 font-medium leading-relaxed">
                        Kru sedang berada dalam <span className="font-extrabold text-white underline">{selectedRosterDetails.roster.currentStatusLabel}</span>. 
                        Tersisa <strong className="text-amber-400 font-bold">{selectedRosterDetails.roster.daysRemaining} hari</strong> sebelum pergantian fase berikutnya.
                      </p>
                    </div>
                  </div>

                  {/* CURRENT / NEXT ROSTER LEAVE DATES */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 block">Jadwal Periode Terdekat</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850/80">
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Mulai Cuti Roster</div>
                        <div className="text-xs font-bold text-slate-200 mt-1 font-mono">
                          {formatDate(selectedRosterDetails.roster.nextLeaveStart)}
                        </div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850/80">
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Selesai Cuti Roster</div>
                        <div className="text-xs font-bold text-slate-200 mt-1 font-mono">
                          {formatDate(selectedRosterDetails.roster.nextLeaveEnd)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KEPUTUSAN PELAKSANAAN CUTI ROSTER */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850/70 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <CalendarDays className="w-4 h-4 text-amber-500" />
                      <span>Pilihan Pelaksanaan Cuti Roster</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Pilih apakah karyawan akan mengambil cuti roster tepat waktu sesuai jadwal atau menunda cuti.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleUpdateRosterDecision(selectedRosterDetails.employee.id, 'normal')}
                        disabled={isUpdatingDecision}
                        className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                          !selectedRosterDetails.employee.rosterDecision || selectedRosterDetails.employee.rosterDecision === 'normal'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-950/20'
                            : 'bg-slate-900 text-slate-400 border-transparent hover:bg-slate-850 hover:text-slate-300'
                        } disabled:opacity-50`}
                      >
                        <span className="text-xs">📅 Tepat Waktu</span>
                        <span className="text-[9px] font-medium opacity-80">Sesuai Siklus (8:2)</span>
                      </button>
                      
                      <button
                        onClick={() => handleUpdateRosterDecision(selectedRosterDetails.employee.id, 'postponed')}
                        disabled={isUpdatingDecision}
                        className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                          selectedRosterDetails.employee.rosterDecision === 'postponed'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-sm shadow-amber-950/20'
                            : 'bg-slate-900 text-slate-400 border-transparent hover:bg-slate-850 hover:text-slate-300'
                        } disabled:opacity-50`}
                      >
                        <span className="text-xs">⏳ Tunda Cuti</span>
                        <span className="text-[9px] font-medium opacity-80">Maju 2 Minggu Siklus Berikutnya</span>
                      </button>

                      <button
                        onClick={() => handleUpdateRosterDecision(selectedRosterDetails.employee.id, 'annual')}
                        disabled={isUpdatingDecision}
                        className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                          selectedRosterDetails.employee.rosterDecision === 'annual'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-sm shadow-sky-950/20'
                            : 'bg-slate-900 text-slate-400 border-transparent hover:bg-slate-850 hover:text-slate-300'
                        } disabled:opacity-50`}
                      >
                        <span className="text-xs">🌴 Cuti Tahunan</span>
                        <span className="text-[9px] font-medium opacity-80">Pelaksanaan 12 Hari</span>
                      </button>

                      <button
                        onClick={() => handleUpdateRosterDecision(selectedRosterDetails.employee.id, 'special')}
                        disabled={isUpdatingDecision}
                        className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                          selectedRosterDetails.employee.rosterDecision === 'special'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-sm shadow-purple-950/20'
                            : 'bg-slate-900 text-slate-400 border-transparent hover:bg-slate-850 hover:text-slate-300'
                        } disabled:opacity-50`}
                      >
                        <span className="text-xs">🌟 Cuti Khusus</span>
                        <span className="text-[9px] font-medium opacity-80">Melahirkan, Duka, dll</span>
                      </button>
                    </div>

                    {selectedRosterDetails.employee.rosterDecision === 'postponed' && (
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 text-[10px] text-amber-400/90 space-y-2">
                        <div className="leading-relaxed">
                          <strong>ℹ️ Status Penundaan:</strong> Pelaksanaan cuti periode berjalan ditunda (karyawan tetap bekerja). Sebagai kompensasi, jadwal cuti berikutnya dimajukan 2 minggu lebih awal.
                        </div>
                        <div className="pt-2 border-t border-amber-500/10 grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-[9px] text-slate-400 font-bold mb-1">Durasi Tunda (Minggu)</span>
                            <input 
                              type="number" 
                              min={1} 
                              max={8}
                              disabled={isUpdatingDecision}
                              value={selectedRosterDetails.employee.postponedWeeks !== undefined ? selectedRosterDetails.employee.postponedWeeks : 2}
                              onChange={(e) => handleUpdateRosterDetails(selectedRosterDetails.employee.id, { postponedWeeks: parseInt(e.target.value) || 2 })}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-400 font-bold mb-1">Catatan</span>
                            <input 
                              type="text" 
                              placeholder="Ketik catatan..."
                              disabled={isUpdatingDecision}
                              value={selectedRosterDetails.employee.postponedNotes || ''}
                              onChange={(e) => handleUpdateRosterDetails(selectedRosterDetails.employee.id, { postponedNotes: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedRosterDetails.employee.rosterDecision === 'annual' && (
                      <div className="bg-sky-500/5 border border-sky-500/10 rounded-lg p-2.5 text-[10px] text-sky-400/90 space-y-2">
                        <div className="leading-relaxed">
                          <strong>ℹ️ Status Cuti Tahunan:</strong> Pelaksanaan masa roster break diisi/diintegrasikan dengan pelaksanaan hak <strong>Cuti Tahunan (12 Hari)</strong> karyawan.
                        </div>
                        <div className="pt-2 border-t border-sky-500/10">
                          <span className="block text-[9px] text-slate-400 font-bold mb-1">Lama Cuti Tahunan (Hari)</span>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              min={1} 
                              max={30}
                              disabled={isUpdatingDecision}
                              value={selectedRosterDetails.employee.annualLeaveDuration !== undefined ? selectedRosterDetails.employee.annualLeaveDuration : 12}
                              onChange={(e) => handleUpdateRosterDetails(selectedRosterDetails.employee.id, { annualLeaveDuration: parseInt(e.target.value) || 12 })}
                              className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                            />
                            <span className="text-[9px] text-slate-500">Standar adalah 12 hari kerja</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedRosterDetails.employee.rosterDecision === 'special' && (
                      <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-2.5 text-[10px] text-purple-400/90 space-y-2">
                        <div className="leading-relaxed">
                          <strong>ℹ️ Status Cuti Khusus:</strong> Pelaksanaan masa roster break diisi/diintegrasikan dengan pelaksanaan hak <strong>Cuti Khusus</strong> karyawan (pernikahan, melahirkan, duka, dsb).
                        </div>
                        <div className="pt-2 border-t border-purple-500/10 grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-[9px] text-slate-400 font-bold mb-1">Alasan Cuti</span>
                            <select 
                              disabled={isUpdatingDecision}
                              value={selectedRosterDetails.employee.specialLeaveReason || 'Melahirkan'}
                              onChange={(e) => handleUpdateRosterDetails(selectedRosterDetails.employee.id, { specialLeaveReason: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[10px] text-slate-300 focus:outline-none [&_option]:bg-slate-900"
                            >
                              <option value="Melahirkan">🤰 Melahirkan</option>
                              <option value="Duka">🕯️ Berita Duka / Kemalangan</option>
                              <option value="Mendesak">🚨 Keperluan Mendesak</option>
                              <option value="Pernikahan">💍 Pernikahan</option>
                              <option value="Lain-lain">📝 Lain-lain / Lainnya</option>
                            </select>
                          </div>
                          <div>
                            <span className="block text-[9px] text-slate-400 font-bold mb-1">Durasi (Hari, Maksimal 3 Hari)</span>
                            <input 
                              type="number" 
                              min={1} 
                              max={3}
                              disabled={isUpdatingDecision}
                              value={selectedRosterDetails.employee.specialLeaveDuration !== undefined ? selectedRosterDetails.employee.specialLeaveDuration : 3}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 3;
                                handleUpdateRosterDetails(selectedRosterDetails.employee.id, { specialLeaveDuration: Math.min(3, Math.max(1, val)) });
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {(!selectedRosterDetails.employee.rosterDecision || selectedRosterDetails.employee.rosterDecision === 'normal') && (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 text-[10px] text-emerald-400/90 leading-relaxed">
                        <strong>ℹ️ Status Normal:</strong> Pelaksanaan cuti berjalan normal sesuai siklus standar 8 minggu lapangan &amp; 2 minggu istirahat.
                      </div>
                    )}
                  </div>

                  {/* STEP BY STEP EXPLANATION */}
                  <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850 text-[11px] text-slate-400 space-y-2 leading-relaxed">
                    <span className="font-bold text-slate-200 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Keterangan Perhitungan Siklus:
                    </span>
                    <p>
                      Sistem menghitung total hari berlalu sejak tanggal mulai kerja karyawan (<span className="text-slate-200 font-mono">{selectedRosterDetails.employee.startDate}</span>) sampai dengan hari ini (<span className="text-slate-200 font-mono">15-Jul-2026</span>).
                    </p>
                    <p className="border-t border-slate-800/80 pt-2 text-[10px] text-slate-500 leading-snug">
                      <strong>Rotasi &amp; Logistik Bandara:</strong> Tiket pesawat, transportasi darat, serta rapid permit wajib diterbitkan minimal <strong>7 hari</strong> sebelum tanggal mulai cuti di atas.
                    </p>
                  </div>

                  {/* FUTURE UPCOMING LEAVES LIST */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 block flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-indigo-400" /> Jadwal Cuti Roster Mendatang (Siklus Berjalan)
                    </span>
                    <div className="space-y-1.5">
                      {selectedRosterDetails.roster.upcomingLeaves.map((up, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-950 p-2 rounded-lg text-[11px] hover:border-slate-800 border border-transparent transition-all">
                          <span className="font-bold text-slate-400">Siklus Ke-{up.cycle}</span>
                          <span className="font-mono text-slate-200 font-bold">
                            {formatDate(up.start)} s/d {formatDate(up.end)}
                          </span>
                        </div>
                      ))}
                    </div>
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
