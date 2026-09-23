import React, { useState, useEffect, useMemo } from 'react';
import { Employee } from '../types';
import { 
  Bell, UserPlus, UserMinus, AlertCircle, ChevronDown, ChevronUp, 
  Sparkles, CheckCircle2, ArrowRight, Filter, Info, ShieldAlert, X
} from 'lucide-react';

export interface EmployeeLogItem {
  id: string;
  name: string;
  nik: string;
  position: string;
  department: string;
  date: string;
  type: 'new' | 'leaving';
  reason?: string;
  status?: string;
}

interface EmployeeNotificationsBannerProps {
  employees: Employee[];
  onSelectEmployee?: (emp: Employee) => void;
  onApplyQuickFilter?: (filterType: 'all' | 'new' | 'leaving' | 'pkwt' | 'pkwtt') => void;
  activeQuickFilter?: string;
}

export default function EmployeeNotificationsBanner({
  employees,
  onSelectEmployee,
  onApplyQuickFilter,
  activeQuickFilter = 'all'
}: EmployeeNotificationsBannerProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'leaving'>('all');
  const [logsState, setLogsState] = useState<{ newLogs: EmployeeLogItem[]; leavingLogs: EmployeeLogItem[] }>({
    newLogs: [],
    leavingLogs: []
  });

  // Calculate & load logs from database + localStorage
  useEffect(() => {
    const loadNotificationData = () => {
      // 1. New Employees from Database (Joined in 2026/2025 or highest globalNo or marked new)
      const dbNewEmployees: EmployeeLogItem[] = employees
        .filter(e => {
          const s = String(e.startDate || '').toLowerCase();
          return s.includes('2026') || s.includes('2025') || e.recruitmentStage === 'Hired';
        })
        .slice(0, 15)
        .map(e => ({
          id: e.id,
          name: e.name,
          nik: e.nik || 'OFA-NEW',
          position: e.position || 'Staff',
          department: e.department || 'MANAGEMENT',
          date: e.startDate || '2026',
          type: 'new' as const,
          status: e.status || 'PKWT'
        }));

      // Merge with custom added logs in localStorage if any
      let customNewLogs: EmployeeLogItem[] = [];
      try {
        const raw = localStorage.getItem('new_employee_logs');
        if (raw) {
          const parsed = JSON.parse(raw);
          customNewLogs = parsed.map((item: any) => ({
            id: item.id || `new_${Math.random()}`,
            name: item.name || 'Karyawan Baru',
            nik: item.nik || '-',
            position: item.position || '-',
            department: item.department || 'MANAGEMENT',
            date: item.addedAt || item.startDate || 'Hari Ini',
            type: 'new' as const,
            status: item.status || 'PKWT'
          }));
        }
      } catch (err) {
        console.error('Error reading new_employee_logs', err);
      }

      // Combine unique new logs by name/id
      const combinedNew = [...customNewLogs];
      dbNewEmployees.forEach(item => {
        if (!combinedNew.some(c => c.id === item.id || c.name === item.name)) {
          combinedNew.push(item);
        }
      });

      // 2. Leaving / Terminated / Deleted Employees
      let customLeavingLogs: EmployeeLogItem[] = [];
      try {
        const raw = localStorage.getItem('deleted_employee_logs');
        if (raw) {
          const parsed = JSON.parse(raw);
          customLeavingLogs = parsed.map((item: any) => ({
            id: item.id || `leaving_${Math.random()}`,
            name: item.name || 'Karyawan Keluar',
            nik: item.nik || '-',
            position: item.position || '-',
            department: item.department || 'MANAGEMENT',
            date: item.deletedAt || 'Terbaru',
            type: 'leaving' as const,
            reason: item.reason || 'Dihapus dari Sistem / Resign / PHK'
          }));
        }
      } catch (err) {
        console.error('Error reading deleted_employee_logs', err);
      }

      // Load custom leaving logs if present
      setLogsState({
        newLogs: combinedNew,
        leavingLogs: customLeavingLogs
      });
    };

    loadNotificationData();

    // Listen for custom mutation updates triggered elsewhere
    const handleMutationUpdate = () => loadNotificationData();
    window.addEventListener('employee_mutation_updated', handleMutationUpdate);
    return () => window.removeEventListener('employee_mutation_updated', handleMutationUpdate);
  }, [employees]);

  const { newLogs, leavingLogs } = logsState;
  const totalUpdatesCount = newLogs.length + leavingLogs.length;

  const displayLogs = useMemo(() => {
    if (activeTab === 'new') return newLogs;
    if (activeTab === 'leaving') return leavingLogs;
    return [...newLogs, ...leavingLogs];
  }, [activeTab, newLogs, leavingLogs]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
      {/* HEADER BANNER */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-blue-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900"></span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-white font-heading">
                Pembaruan Database Karyawan
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Live Notification
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Notifikasi riwayat masuk karyawan baru dan keluar/non-aktif di direktori.
            </p>
          </div>
        </div>

        {/* SUMMARY STAT BADGES & TOGGLE */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => {
              if (onApplyQuickFilter) {
                onApplyQuickFilter(activeQuickFilter === 'new' ? 'all' : 'new');
              }
              setActiveTab('new');
              setIsExpanded(true);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              activeQuickFilter === 'new'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/30'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
            }`}
            title="Klik untuk filter karyawan baru"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>{newLogs.length} Baru</span>
          </button>

          <button
            onClick={() => {
              if (onApplyQuickFilter) {
                onApplyQuickFilter(activeQuickFilter === 'leaving' ? 'all' : 'leaving');
              }
              setActiveTab('leaving');
              setIsExpanded(true);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              activeQuickFilter === 'leaving'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 ring-1 ring-rose-500/30'
                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
            }`}
            title="Klik untuk lihat karyawan keluar / non-aktif"
          >
            <UserMinus className="w-3.5 h-3.5 text-rose-400" />
            <span>{leavingLogs.length} Keluar</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer border border-slate-700"
            title={isExpanded ? 'Sembunyikan Panel' : 'Buka Detail Notifikasi'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* EXPANDED CONTENT PANEL */}
      {isExpanded && (
        <div className="p-4 bg-slate-950/60 space-y-4">
          {/* TAB SELECTION & QUICK ACTIONS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua Notifikasi ({totalUpdatesCount})
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                  activeTab === 'new'
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Karyawan Baru ({newLogs.length})
              </button>
              <button
                onClick={() => setActiveTab('leaving')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                  activeTab === 'leaving'
                    ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                    : 'text-slate-400 hover:text-rose-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                Karyawan Keluar ({leavingLogs.length})
              </button>
            </div>

            {/* QUICK FILTER BUTTON IN TABLE */}
            {onApplyQuickFilter && (
              <div className="flex items-center gap-2">
                {activeQuickFilter !== 'all' && (
                  <button
                    onClick={() => onApplyQuickFilter('all')}
                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reset Filter Tabel
                  </button>
                )}
                <button
                  onClick={() => onApplyQuickFilter('new')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 ${
                    activeQuickFilter === 'new'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  <span>Tampilkan Karyawan Baru di Tabel</span>
                </button>
              </div>
            )}
          </div>

          {/* LIST ITEMS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayLogs.length === 0 ? (
              <div className="col-span-full py-6 text-center text-slate-500 text-xs">
                Tidak ada notifikasi aktivitas untuk kategori ini.
              </div>
            ) : (
              displayLogs.slice(0, 9).map((item) => {
                const isNew = item.type === 'new';
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isNew
                        ? 'bg-emerald-950/20 border-emerald-900/40 hover:border-emerald-500/40'
                        : 'bg-rose-950/20 border-rose-900/40 hover:border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`p-1.5 rounded-lg border text-xs font-bold flex items-center justify-center shrink-0 ${
                            isNew
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {isNew ? <UserPlus className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                        </span>
                        <div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                              isNew
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {isNew ? '✨ KARYAWAN BARU' : '🚪 KARYAWAN KELUAR'}
                          </span>
                          <h5 className="text-xs font-bold text-white mt-1 line-clamp-1">{item.name}</h5>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {item.date}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-850/60 space-y-1 text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">NIK:</span>
                        <span className="font-mono text-slate-300">{item.nik}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Jabatan:</span>
                        <span className="font-semibold text-slate-200">{item.position}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Departemen:</span>
                        <span className="text-slate-300">{item.department}</span>
                      </div>

                      {!isNew && item.reason && (
                        <div className="mt-1.5 p-1.5 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] text-rose-300 flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                          <span>{item.reason}</span>
                        </div>
                      )}
                    </div>

                    {/* ACTION BUTTON */}
                    <div className="mt-3 pt-2 border-t border-slate-850 flex justify-end">
                      {isNew ? (
                        <button
                          onClick={() => {
                            const found = employees.find(e => e.id === item.id || e.name === item.name);
                            if (found && onSelectEmployee) {
                              onSelectEmployee(found);
                            } else if (onApplyQuickFilter) {
                              onApplyQuickFilter('new');
                            }
                          }}
                          className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Lihat Profil Karyawan</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-slate-400" />
                          <span>Status Terorganisir di Sistem</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
