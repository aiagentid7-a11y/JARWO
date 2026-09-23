import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './components/AuthGate';
import companyLogo from './assets/images/company_logo_1785406862950.jpg';
import { Employee } from './types';
import DashboardOverview from './components/DashboardOverview';
import PKWTDashboard from './components/PKWTDashboard';
import LeaveDashboard from './components/LeaveDashboard';
import BPJSDashboard from './components/BPJSDashboard';
import EmployeeTable from './components/EmployeeTable';
import EmployeeFormModal from './components/EmployeeFormModal';
import EmployeeDetailDrawer from './components/EmployeeDetailDrawer';
import AICopilotChat from './components/AICopilotChat';
import AttendanceDashboard from './components/AttendanceDashboard';
import AttendanceSelfService from './components/AttendanceSelfService';
import PayrollDashboard from './components/PayrollDashboard';
import PersonalDataDashboard from './components/PersonalDataDashboard';
import RecruitmentDashboard from './components/RecruitmentDashboard';
import KPIDashboard from './components/KPIDashboard';
import PerjalananDinasDashboard from './components/PerjalananDinasDashboard';
import PHKDashboard from './components/PHKDashboard';
import OvertimeIncentiveDashboard from './components/OvertimeIncentiveDashboard';
import RemunerationDashboard from './components/RemunerationDashboard';
import OrgStructureDashboard from './components/OrgStructureDashboard';
import ActuarialRemunerationDashboard from './components/ActuarialRemunerationDashboard';
import RegulationDashboard from './components/RegulationDashboard';
import SecurityAuditDashboard from './components/SecurityAuditDashboard';
import PerformanceSafetyDashboard from './components/PerformanceSafetyDashboard';
import { 
  BarChart3, Users, UserCheck, Sparkles, Building2, ShieldAlert, Network, Calculator, Scale,
  HelpCircle, RefreshCw, AlertCircle, Calendar, Shield, Wallet, Clock, Contact, Award, Plane,
  Menu, X, CheckCircle, UserMinus, Sun, Moon, Coins, ShieldCheck, HardHat
} from 'lucide-react';

export default function App() {
  const { profile, logout, hasAccess } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'pkwt' | 'cuti' | 'absensi' | 'lembur' | 'bpjs' | 'gaji' | 'remunerasi' | 'aktuaria' | 'regulasi' | 'security' | 'performancesafety' | 'phk' | 'datapribadi' | 'rekrutmen' | 'kpi' | 'dinas' | 'orgstructure' | 'directory'>('dashboard');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // States for pre-filtering when navigating from DashboardOverview
  const [initialLeaveFilters, setInitialLeaveFilters] = useState<{ searchTerm?: string; urgencyFilter?: 'all' | 'expired' | 'urgent' | 'warning' | 'safe' | 'expired-or-urgent' } | null>(null);
  const [initialPkwtFilters, setInitialPkwtFilters] = useState<{ searchTerm?: string; urgencyFilter?: 'all' | 'expired' | 'urgent' | 'warning' | 'safe' | 'expired-or-urgent' } | null>(null);

  // Modals & Drawers States
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<Employee | null>(null);
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<Employee | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Custom Dialog State
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showCustomDialog = (config: {
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
  }) => {
    setDialogState({
      isOpen: true,
      ...config,
      onCancel: () => setDialogState(prev => ({ ...prev, isOpen: false }))
    });
  };

  // Load employees from server
  const fetchEmployees = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`/api/employees?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Gagal mengambil data karyawan dari server.');
      }
      const data = await response.json();
      
      // Filter out deleted employees stored in localStorage (fail-safe for stateless container environments)
      const deletedIdsStr = localStorage.getItem('deleted_employee_ids') || '[]';
      const deletedIds = JSON.parse(deletedIdsStr) as string[];
      
      const activeEmployees = (data.employees || []).filter(
        (e: Employee) => !deletedIds.includes(e.id)
      );
      
      setEmployees(activeEmployees);
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke server gagal.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Save employee handler (creates or updates)
  const handleSaveEmployee = async (employeeData: Partial<Employee>) => {
    try {
      const isEdit = employeeData.id || selectedEmployeeForEdit;
      const empId = employeeData.id || (selectedEmployeeForEdit ? selectedEmployeeForEdit.id : '');
      const url = isEdit 
        ? `/api/employees/${empId}` 
        : '/api/employees';
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan data karyawan.');
      }

      // Log new employee creation if inserting
      if (!isEdit && employeeData.name) {
        try {
          const newLogsStr = localStorage.getItem('new_employee_logs') || '[]';
          const newLogs = JSON.parse(newLogsStr);
          newLogs.unshift({
            id: data.employee?.id || employeeData.id || `emp_${Date.now()}`,
            name: employeeData.name,
            nik: employeeData.nik || 'OFA-NEW',
            position: employeeData.position || 'Staff',
            department: employeeData.department || 'MANAGEMENT',
            startDate: employeeData.startDate || 'Hari Ini',
            addedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            status: employeeData.status || 'PKWT'
          });
          localStorage.setItem('new_employee_logs', JSON.stringify(newLogs.slice(0, 50)));
        } catch (e) {
          console.error(e);
        }
      }

      // Re-fetch all to sync state
      await fetchEmployees();
      window.dispatchEvent(new Event('employee_mutation_updated'));
      
      // Close drawer or update selection if detailed
      const activeEditId = selectedEmployeeForEdit ? selectedEmployeeForEdit.id : employeeData.id;
      if (selectedEmployeeForDetail && activeEditId && selectedEmployeeForDetail.id === activeEditId) {
        // Sync detail view
        const updated = employees.find(e => e.id === activeEditId);
        if (updated) {
          setSelectedEmployeeForDetail({ ...updated, ...employeeData } as Employee);
        }
      }
    } catch (err: any) {
      throw err;
    }
  };

  // Delete employee handler
  const handleDeleteEmployee = async (id: string) => {
    showCustomDialog({
      title: 'Hapus Karyawan',
      message: 'Apakah Anda yakin ingin menghapus data karyawan ini dari sistem? Tindakan ini tidak dapat dibatalkan.',
      type: 'danger',
      confirmLabel: 'Hapus',
      onConfirm: async () => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(`/api/employees/${id}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Gagal menghapus karyawan.');
          }

          // Cache the deleted ID in localStorage to survive stateless cloud container reboots
          const deletedIdsStr = localStorage.getItem('deleted_employee_ids') || '[]';
          const deletedIds = JSON.parse(deletedIdsStr) as string[];
          if (!deletedIds.includes(id)) {
            deletedIds.push(id);
            localStorage.setItem('deleted_employee_ids', JSON.stringify(deletedIds));
          }

          // Cache rich log for notification banner
          const targetEmp = employees.find(e => e.id === id);
          if (targetEmp) {
            try {
              const deletedLogsStr = localStorage.getItem('deleted_employee_logs') || '[]';
              const deletedLogs = JSON.parse(deletedLogsStr);
              deletedLogs.unshift({
                id: targetEmp.id,
                name: targetEmp.name,
                nik: targetEmp.nik || '-',
                position: targetEmp.position || '-',
                department: targetEmp.department || 'MANAGEMENT',
                deletedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                reason: 'Dihapus dari Sistem / Resign / PHK'
              });
              localStorage.setItem('deleted_employee_logs', JSON.stringify(deletedLogs.slice(0, 50)));
            } catch (e) {
              console.error(e);
            }
          }

          if (selectedEmployeeForDetail && selectedEmployeeForDetail.id === id) {
            setSelectedEmployeeForDetail(null);
          }

          await fetchEmployees();
          window.dispatchEvent(new Event('employee_mutation_updated'));
          showCustomDialog({
            title: 'Berhasil',
            message: 'Data karyawan berhasil dihapus dari sistem.',
            type: 'success'
          });
        } catch (err: any) {
          showCustomDialog({
            title: 'Gagal',
            message: `Error: ${err.message}`,
            type: 'danger'
          });
        }
      }
    });
  };

  // Bulk Delete employee handler
  const handleBulkDeleteEmployees = async (ids: string[]) => {
    showCustomDialog({
      title: 'Hapus Massal Karyawan',
      message: `Apakah Anda yakin ingin menghapus ${ids.length} data karyawan terpilih dari sistem? Tindakan ini tidak dapat dibatalkan.`,
      type: 'danger',
      confirmLabel: `Hapus ${ids.length} Karyawan`,
      onConfirm: async () => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch('/api/employees/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Gagal menghapus beberapa karyawan.');
          }

          // Cache all deleted IDs in localStorage to survive stateless cloud container reboots
          const deletedIdsStr = localStorage.getItem('deleted_employee_ids') || '[]';
          const deletedIds = JSON.parse(deletedIdsStr) as string[];
          ids.forEach(id => {
            if (!deletedIds.includes(id)) {
              deletedIds.push(id);
            }
          });
          localStorage.setItem('deleted_employee_ids', JSON.stringify(deletedIds));

          // Cache rich logs for notification banner
          const targetEmps = employees.filter(e => ids.includes(e.id));
          if (targetEmps.length > 0) {
            try {
              const deletedLogsStr = localStorage.getItem('deleted_employee_logs') || '[]';
              const deletedLogs = JSON.parse(deletedLogsStr);
              targetEmps.forEach(emp => {
                deletedLogs.unshift({
                  id: emp.id,
                  name: emp.name,
                  nik: emp.nik || '-',
                  position: emp.position || '-',
                  department: emp.department || 'MANAGEMENT',
                  deletedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                  reason: 'Dihapus Massal dari Sistem / Non-Aktif'
                });
              });
              localStorage.setItem('deleted_employee_logs', JSON.stringify(deletedLogs.slice(0, 50)));
            } catch (e) {
              console.error(e);
            }
          }

          if (selectedEmployeeForDetail && ids.includes(selectedEmployeeForDetail.id)) {
            setSelectedEmployeeForDetail(null);
          }

          await fetchEmployees();
          window.dispatchEvent(new Event('employee_mutation_updated'));
          showCustomDialog({
            title: 'Berhasil',
            message: `Berhasil menghapus ${ids.length} karyawan terpilih dari sistem.`,
            type: 'success'
          });
        } catch (err: any) {
          showCustomDialog({
            title: 'Gagal',
            message: `Error: ${err.message}`,
            type: 'danger'
          });
        }
      }
    });
  };

  // Reset database to initial CSV handler
  const handleResetDatabase = async () => {
    showCustomDialog({
      title: 'Reset Database Karyawan',
      message: 'Apakah Anda yakin ingin me-reset seluruh database karyawan? Semua perubahan yang telah Anda buat akan diganti kembali dengan data awal dari Google Sheets.',
      type: 'warning',
      confirmLabel: 'Reset Database',
      onConfirm: async () => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
        setIsResetting(true);
        try {
          const response = await fetch('/api/employees/reset', {
            method: 'POST'
          });

          if (!response.ok) {
            throw new Error('Gagal me-reset database.');
          }

          // Clear deleted employee storage cache on explicit database reset
          localStorage.removeItem('deleted_employee_ids');

          await fetchEmployees();
          setSelectedDeptFilter('');
          window.dispatchEvent(new Event('employee_mutation_updated'));
          showCustomDialog({
            title: 'Berhasil',
            message: 'Database berhasil di-reset ke data awal Google Sheets.',
            type: 'success'
          });
        } catch (err: any) {
          showCustomDialog({
            title: 'Gagal',
            message: `Error: ${err.message}`,
            type: 'danger'
          });
        } finally {
          setIsResetting(false);
        }
      }
    });
  };

  // Clear all master employees database handler
  const handleClearAllEmployees = async () => {
    showCustomDialog({
      title: 'Kosongkan Seluruh Master Data Karyawan',
      message: 'Apakah Anda yakin ingin menghapus SELURUH master data karyawan? Tindakan ini akan mengosongkan direktori sehingga Anda dapat mengunggah file data karyawan yang baru.',
      type: 'danger',
      confirmLabel: 'Ya, Kosongkan Semua',
      onConfirm: async () => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
        setIsResetting(true);
        try {
          const response = await fetch('/api/employees/clear-all', {
            method: 'POST'
          });

          if (!response.ok) {
            throw new Error('Gagal mengosongkan database.');
          }

          localStorage.removeItem('deleted_employee_ids');
          localStorage.removeItem('new_employee_logs');
          localStorage.removeItem('deleted_employee_logs');

          await fetchEmployees();
          setSelectedDeptFilter('');
          window.dispatchEvent(new Event('employee_mutation_updated'));

          showCustomDialog({
            title: 'Master Data Kosong',
            message: 'Seluruh data karyawan berhasil dikosongkan. Anda sekarang siap mengunggah file data karyawan baru.',
            type: 'success'
          });
        } catch (err: any) {
          showCustomDialog({
            title: 'Gagal',
            message: `Error: ${err.message}`,
            type: 'danger'
          });
        } finally {
          setIsResetting(false);
        }
      }
    });
  };

  // Extract unique departments list
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Navigate to directory with department filter applied
  const handleSelectDepartmentFromDashboard = (deptName: string) => {
    setSelectedDeptFilter(deptName);
    setActiveTab('directory');
  };

  const handleNavigateToLeave = (filters: typeof initialLeaveFilters) => {
    setInitialLeaveFilters(filters);
    setActiveTab('cuti');
  };

  const handleNavigateToPkwt = (filters: typeof initialPkwtFilters) => {
    setInitialPkwtFilters(filters);
    setActiveTab('pkwt');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Analitis', icon: BarChart3 },
    { id: 'orgstructure', label: 'Struktur Organisasi', icon: Network },
    { id: 'pkwt', label: 'PKWT', icon: UserCheck },
    { id: 'cuti', label: 'Cuti', icon: Calendar },
    { id: 'absensi', label: 'Absensi', icon: Clock },
    { id: 'lembur', label: 'Lembur & Insentif', icon: Clock },
    { id: 'bpjs', label: 'BPJS', icon: Shield },
    { id: 'performancesafety', label: 'Performance & Safety', icon: HardHat },
    { id: 'gaji', label: 'Gaji & PPh', icon: Wallet },
    { id: 'remunerasi', label: 'Sistem Remunerasi', icon: Coins },
    { id: 'aktuaria', label: 'Aktuaria Remunerasi', icon: Calculator },
    { id: 'regulasi', label: 'Regulasi & UMK', icon: Scale },
    { id: 'security', label: 'Keamanan & Compliance', icon: ShieldCheck },
    { id: 'phk', label: 'Perhitungan PHK', icon: UserMinus },
    { id: 'datapribadi', label: 'Data Pribadi Karyawan', icon: Contact },
    { id: 'rekrutmen', label: 'Rekrutmen', icon: Users },
    { id: 'kpi', label: 'KPI', icon: Award },
    { id: 'dinas', label: 'Perjalanan Dinas', icon: Plane },
    { id: 'directory', label: 'Direktori Karyawan', icon: Users }
  ];

  const visibleNavItems = navItems.filter(item => item.id === 'dashboard' || item.id === 'directory' ? (profile?.role === 'Admin' || profile?.role === 'HR') : hasAccess(item.id === 'orgstructure' ? 'orgstructure' : item.id, 'view'));

  useEffect(() => {
    if (activeTab !== 'dashboard' && !visibleNavItems.some(item => item.id === activeTab)) setActiveTab('dashboard');
  }, [activeTab, profile?.role]);

   bg-slate-950 text-slate-300 flex flex-col font-sans" id="app-root">
      {/* 1. PROFESSIONAL HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl overflow-hidden ring-2 ring-blue-500/30 shadow-md shadow-blue-500/10 shrink-0 bg-slate-950 flex items-center justify-center">
              <img 
                src={companyLogo} 
                alt="One For All Logo" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-lg lg:text-xl font-bold font-heading tracking-tight leading-none text-slate-50">
                  One For All
                </h1>
                <span className="hidden sm:inline-block text-[9px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                  PRO SYSTEM
                </span>
              </div>
              <p className="text-[10px] md:text-xs text-slate-400 mt-1 font-medium">Sistem Database &amp; Analytics Karyawan Terintegrasi</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl border border-slate-700/50 transition-all cursor-pointer flex items-center justify-center h-[34px] w-[34px] md:h-[40px] md:w-[40px]"
              title={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>

            {/* Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700/50 bg-slate-800/80">
              <div className="text-right">
                <div className="text-[10px] text-white font-bold">{profile?.full_name}</div>
                <div className="text-[9px] text-blue-400 font-semibold">{profile?.role}</div>
              </div>
              <button onClick={logout} className="text-[10px] px-2 py-1 rounded-lg bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white">Keluar</button>
            </div>

            <div className="bg-slate-800/80 px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-xl border border-slate-700/50 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse font-normal" />
              <span className="text-[10px] md:text-xs text-slate-300 font-semibold whitespace-nowrap">
                {isLoading ? '...' : `${employees.length} Karyawan`}
              </span>
            </div>

            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition-colors cursor-pointer"
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Side-by-Side Layout Wrapper */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        {/* 2. MOBILE MENU DRAWER (OVERLAY) */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-40 md:hidden transition-all duration-200" onClick={() => setIsMobileMenuOpen(false)}>
            <div 
              className="fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 p-5 flex flex-col gap-4 animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  <span className="text-xs font-black text-white tracking-widest uppercase">MENU UTAMA</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 py-2">
                {visibleNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* Mobile AI Super Admin Status Card */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="bg-gradient-to-br from-indigo-950/40 to-slate-850 border border-indigo-900/30 rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
                  <div className="p-1.5 bg-indigo-600/10 rounded-lg text-indigo-400">
                    <Shield className="w-4 h-4 text-indigo-400 animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-indigo-300 font-bold leading-tight uppercase tracking-wider">AI HR Agent</div>
                    <div className="text-[9px] text-slate-400 font-semibold truncate flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                      <span>Super Admin Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. DESKTOP STICKY SIDEBAR (LISTING DOWNWARDS) */}
        <aside className="hidden md:flex md:flex-col md:w-64 bg-slate-900 border-r border-slate-800 shrink-0 sticky top-[73px] sm:top-[76px] h-[calc(100vh-76px)] overflow-y-auto z-25">
          <nav className="flex-1 p-3 space-y-1">
            {visibleNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/10' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800/60 bg-slate-950/40 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Database Terhubung</span>
            </div>
            
            {/* AI Agent Super Admin Status Card */}
            <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/30 rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
              <div className="p-1.5 bg-indigo-600/10 rounded-lg text-indigo-400">
                <Shield className="w-4 h-4 text-indigo-400 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-indigo-300 font-bold leading-tight uppercase tracking-wider">AI HR Agent</div>
                <div className="text-[9px] text-slate-400 font-semibold truncate flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                  <span>Super Admin Active</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* 3. MAIN BODY WORKSPACE */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-w-0">
        {/* Error Alert bar */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-center gap-2 mb-6 font-medium">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1">
              <strong>Koneksi Gagal:</strong> {errorMsg}
            </div>
            <button 
              onClick={fetchEmployees}
              className="p-1.5 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer text-xs font-bold uppercase flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang</span>
            </button>
          </div>
        )}

        {isLoading ? (
          /* Loader */
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-500 font-semibold">Mengambil database karyawan One For All...</p>
          </div>
        ) : (
          /* Active tab display */
          <div className="space-y-6">
            {activeTab === 'dashboard' ? (
              <DashboardOverview 
                employees={employees} 
                onSelectDepartment={handleSelectDepartmentFromDashboard}
                onNavigateToLeave={handleNavigateToLeave}
                onNavigateToPkwt={handleNavigateToPkwt}
                onUploadSuccess={fetchEmployees}
              />
            ) : activeTab === 'pkwt' ? (
              <PKWTDashboard 
                employees={employees}
                onSelectEmployee={(emp) => setSelectedEmployeeForDetail(emp)}
                onEditEmployee={(emp) => { setSelectedEmployeeForEdit(emp); setIsFormOpen(true); }}
                initialFilters={initialPkwtFilters}
                onClearInitialFilters={() => setInitialPkwtFilters(null)}
                onUploadSuccess={fetchEmployees}
              />
            ) : activeTab === 'cuti' ? (
              <LeaveDashboard 
                employees={employees}
                onSelectEmployee={(emp) => setSelectedEmployeeForDetail(emp)}
                onEditEmployee={(emp) => { setSelectedEmployeeForEdit(emp); setIsFormOpen(true); }}
                initialFilters={initialLeaveFilters}
                onClearInitialFilters={() => setInitialLeaveFilters(null)}
                onUploadSuccess={fetchEmployees}
              />
            ) : activeTab === 'bpjs' ? (
              <BPJSDashboard 
                employees={employees}
                onSelectEmployee={(emp) => setSelectedEmployeeForDetail(emp)}
                onEditEmployee={(emp) => { setSelectedEmployeeForEdit(emp); setIsFormOpen(true); }}
                onUploadSuccess={fetchEmployees}
                onClearAllEmployees={handleClearAllEmployees}
              />
            ) : activeTab === 'absensi' ? (
              <>
                {profile?.role === 'Employee' && profile.employee_id && <AttendanceSelfService employeeId={profile.employee_id} />}
                <AttendanceDashboard 
                employees={profile?.role === 'Employee' ? employees.filter(e => e.id === profile.employee_id) : employees}
                onUpdateEmployee={async (id, data) => {
                  await handleSaveEmployee({ id, ...data });
                }}
                onUploadSuccess={fetchEmployees}
                />
              </>
            ) : activeTab === 'lembur' ? (
              <OvertimeIncentiveDashboard 
                employees={employees}
                onUpdateEmployee={async (id, data) => {
                  await handleSaveEmployee({ id, ...data });
                }}
                onUploadSuccess={fetchEmployees}
              />
            ) : activeTab === 'gaji' ? (
              <PayrollDashboard 
                employees={employees}
                onUpdateEmployee={async (id, data) => {
                  await handleSaveEmployee({ id, ...data });
                }}
                onUploadSuccess={fetchEmployees}
              />
            ) : activeTab === 'remunerasi' ? (
              <RemunerationDashboard 
                employees={employees}
                onUpdateEmployee={async (id, data) => {
                  await handleSaveEmployee({ id, ...data });
                }}
                onUploadSuccess={fetchEmployees}
              />
            ) : activeTab === 'rekrutmen' ? (
              <RecruitmentDashboard 
                employees={employees}
                onUpdateEmployee={async (id, data) => {
                  await handleSaveEmployee({ id, ...data });
                }}
                onUploadSuccess={fetchEmployees}
              />
            ) : activeTab === 'kpi' ? (
              <KPIDashboard 
                employees={employees}
                onUpdateEmployee={async (id, data) => {
                  await handleSaveEmployee({ id, ...data });
                }}
                onUploadSuccess={fetchEmployees}
              />
            ) : activeTab === 'orgstructure' ? (
              <OrgStructureDashboard 
                employees={employees}
                onSelectEmployee={(emp) => setSelectedEmployeeForDetail(emp)}
                onRefreshData={fetchEmployees}
              />
            ) : activeTab === 'aktuaria' ? (
              <ActuarialRemunerationDashboard 
                employees={employees}
                onSelectEmployee={(emp) => setSelectedEmployeeForDetail(emp)}
                onRefreshData={fetchEmployees}
              />
            ) : activeTab === 'regulasi' ? (
              <RegulationDashboard 
                employees={employees}
                onSelectEmployee={(emp) => setSelectedEmployeeForDetail(emp)}
              />
            ) : activeTab === 'security' ? (
              <SecurityAuditDashboard 
                currentUserRole="Admin"
                currentUserEmail="admin.hr@company.com"
              />
            ) : activeTab === 'performancesafety' ? (
              <PerformanceSafetyDashboard 
                employees={employees}
              />
            ) : activeTab === 'dinas' ? (
              <PerjalananDinasDashboard 
                employees={employees}
                onUpdateEmployee={async (id, data) => {
                  await handleSaveEmployee({ id, ...data });
                }}
                onUploadSuccess={fetchEmployees}
              />
            ) : activeTab === 'phk' ? (
              <PHKDashboard 
                employees={employees}
                onUpdateEmployee={async (id, data) => {
                  await handleSaveEmployee({ id, ...data });
                }}
                onUploadSuccess={fetchEmployees}
              />
            ) : activeTab === 'datapribadi' ? (
              <PersonalDataDashboard 
                employees={employees}
                departments={departmentsList}
                onSelectEmployee={(emp) => setSelectedEmployeeForDetail(emp)}
                onEditEmployee={(emp) => { setSelectedEmployeeForEdit(emp); setIsFormOpen(true); }}
                onDeleteEmployee={handleDeleteEmployee}
                onUploadSuccess={fetchEmployees}
              />
            ) : (
              <EmployeeTable 
                employees={employees}
                departments={departmentsList}
                selectedDepartmentFilter={selectedDeptFilter}
                onSetDepartmentFilter={setSelectedDeptFilter}
                onSelectEmployee={(emp) => setSelectedEmployeeForDetail(emp)}
                onEditEmployee={(emp) => { setSelectedEmployeeForEdit(emp); setIsFormOpen(true); }}
                onDeleteEmployee={handleDeleteEmployee}
                onBulkDeleteEmployees={handleBulkDeleteEmployees}
                onAddEmployeeClick={() => { setSelectedEmployeeForEdit(null); setIsFormOpen(true); }}
                onResetDatabase={handleResetDatabase}
                onClearAllEmployees={handleClearAllEmployees}
                isResetting={isResetting}
                onUploadSuccess={fetchEmployees}
              />
            )}
          </div>
        )}
      </main>
      </div>

      {/* 4. FOOTER CREDITS */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs text-center mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium text-slate-400">
            One For All &copy; 2026. Hak Cipta Dilindungi Undang-Undang.
          </p>
        </div>
      </footer>

      {/* 5. FLOATING AI COPILOT CHAT */}
      <AICopilotChat 
        onHighlightDepartment={handleSelectDepartmentFromDashboard}
        onCommandExecuted={fetchEmployees}
      />

      {/* 6. MODALS & DRAWERS */}
      
      {/* Employee Detail Drawer */}
      <EmployeeDetailDrawer 
        isOpen={selectedEmployeeForDetail !== null}
        onClose={() => setSelectedEmployeeForDetail(null)}
        employee={selectedEmployeeForDetail}
        onEdit={(emp) => { setSelectedEmployeeForEdit(emp); setIsFormOpen(true); }}
        onDelete={handleDeleteEmployee}
      />

      {/* Add / Edit Form Modal */}
      <EmployeeFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveEmployee}
        employee={selectedEmployeeForEdit}
        departments={departmentsList}
      />

      {/* Custom Alert/Confirm Dialog Modal */}
      {dialogState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" id="custom-dialog-overlay">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4 animate-scale-in" id="custom-dialog-box">
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                dialogState.type === 'danger' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                dialogState.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                dialogState.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`} id="dialog-icon-container">
                {dialogState.type === 'danger' && <ShieldAlert className="w-6 h-6" />}
                {dialogState.type === 'warning' && <AlertCircle className="w-6 h-6" />}
                {dialogState.type === 'success' && <CheckCircle className="w-6 h-6" />}
                {dialogState.type === 'info' && <AlertCircle className="w-6 h-6" />}
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-bold text-white font-heading" id="dialog-title">{dialogState.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed" id="dialog-message">{dialogState.message}</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2.5 pt-2">
              {dialogState.onConfirm && (
                <button
                  onClick={dialogState.onCancel}
                  className="px-4 py-2 bg-slate-950/65 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
                  id="dialog-cancel-btn"
                >
                  {dialogState.cancelLabel || 'Batal'}
                </button>
              )}
              <button
                onClick={dialogState.onConfirm || dialogState.onCancel}
                className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer ${
                  dialogState.type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                  dialogState.type === 'warning' ? 'bg-amber-500 text-slate-950 hover:bg-amber-600 font-extrabold' :
                  dialogState.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
                id="dialog-confirm-btn"
              >
                {dialogState.onConfirm ? (dialogState.confirmLabel || 'OK') : 'Tutup'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
