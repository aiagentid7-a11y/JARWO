import React, { useMemo, useState, useRef } from 'react';
import { Employee } from '../types';
import { 
  Shield, ShieldCheck, ShieldAlert, Users, Search, Eye, Edit, 
  ChevronLeft, ChevronRight, Download, Filter, RefreshCw, 
  Info, AlertTriangle, CheckCircle, XCircle, Building2, HelpCircle,
  UploadCloud, FileSpreadsheet, X, FileText, Layers, ExternalLink
} from 'lucide-react';
import * as xlsx from 'xlsx';
import { isBpjsRegistered } from '../dateUtils';
import DataExchangeBar from './DataExchangeBar';

interface BPJSDashboardProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  onEditEmployee: (emp: Employee) => void;
  onUploadSuccess?: () => void;
  onClearAllEmployees?: () => Promise<void> | void;
}

export default function BPJSDashboard({ 
  employees, 
  onSelectEmployee, 
  onEditEmployee,
  onUploadSuccess,
  onClearAllEmployees
}: BPJSDashboardProps) {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // PKWT / PKWTT
  const [bpjsTkFilter, setBpjsTkFilter] = useState(''); // Covered / NotCovered
  const [bpjsKesFilter, setBpjsKesFilter] = useState(''); // Covered / NotCovered
  const [coverageFilter, setCoverageFilter] = useState(''); // Both / OnlyTK / OnlyKes / None
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Custom Upload Excel State
  const [selectedDashboardType, setSelectedDashboardType] = useState<string>('BPJS_KESEHATAN');
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FileReader Direct Upload Handler using xlsx.read(data, { type: 'array', cellDates: true })
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingExcel(true);
    setUploadFeedback(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          throw new Error("Gagal membaca buffer file Excel.");
        }

        // Format Required (Instruction 1): const workbook = xlsx.read(data, { type: 'array', cellDates: true });
        const workbook = xlsx.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows: any[] = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

        if (!jsonRows || jsonRows.length === 0) {
          throw new Error("Berkas Excel kosong atau tidak memiliki baris data yang valid.");
        }

        const mappedItems = jsonRows.map((row) => {
          const name = row['Nama Tenaga Kerja'] || row['Nama'] || row['NAMA'] || row['Nama Karyawan'] || row['Peserta'] || '';
          const nik = row['( N I K )'] || row['NIK'] || row['Nik'] || row['No KTP'] || '';
          const bpjsTk = row['No BPJS TK'] || row['BPJS TK'] || row['KPJ'] || row['No. KPJ'] || row['bpjsTk'] || '';
          const bpjsKes = row['No BPJS KESEHATAN'] || row['BPJS Kes'] || row['BPJS Kesehatan'] || row['bpjsKes'] || '';
          const dept = row['Departemen'] || row['DEPARTEMEN'] || row['Department'] || row['department'] || '';
          const pos = row['Jabatan'] || row['JABATAN'] || row['position'] || '';

          return {
            name: String(name).trim(),
            nik: String(nik).trim(),
            bpjsTk: String(bpjsTk).trim(),
            bpjsKes: String(bpjsKes).trim(),
            department: String(dept).trim(),
            position: String(pos).trim()
          };
        }).filter(item => item.name || item.nik);

        // Send to server with dashboardType parameter for data isolation (Instruction 2)
        const response = await fetch('/api/employees/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dashboardType: selectedDashboardType,
            mode: 'merge',
            employees: mappedItems
          })
        });

        const resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.error || "Gagal mengunggah data ke server.");
        }

        setUploadFeedback({
          type: 'success',
          message: `Berhasil mengunggah ${mappedItems.length} data karyawan untuk dashboard ${selectedDashboardType}!`
        });

        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } catch (err: any) {
        console.error("Error upload excel in BPJSDashboard:", err);
        setUploadFeedback({
          type: 'error',
          message: err.message || "Gagal memproses berkas Excel."
        });
      } finally {
        setIsUploadingExcel(false);
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      setUploadFeedback({ type: 'error', message: "Gagal membaca berkas dengan FileReader." });
      setIsUploadingExcel(false);
      e.target.value = '';
    };

    reader.readAsArrayBuffer(file);
  };

  // Dynamic Departments list
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts).sort();
  }, [employees]);

  // General BPJS metrics calculation
  const totalCount = employees.length;
  
  const bpjsTkCovered = useMemo(() => {
    return employees.filter(e => isBpjsRegistered(e.bpjsTk)).length;
  }, [employees]);

  const bpjsKesCovered = useMemo(() => {
    return employees.filter(e => isBpjsRegistered(e.bpjsKes)).length;
  }, [employees]);

  const bpjsTkRate = totalCount ? Math.round((bpjsTkCovered / totalCount) * 100) : 0;
  const bpjsKesRate = totalCount ? Math.round((bpjsKesCovered / totalCount) * 100) : 0;

  // Fully covered (both BPJS TK and BPJS Kes registered)
  const fullyCoveredCount = useMemo(() => {
    return employees.filter(e => isBpjsRegistered(e.bpjsTk) && isBpjsRegistered(e.bpjsKes)).length;
  }, [employees]);

  const fullyCoveredRate = totalCount ? Math.round((fullyCoveredCount / totalCount) * 100) : 0;

  // Unregistered both
  const noCoverageCount = useMemo(() => {
    return employees.filter(e => !isBpjsRegistered(e.bpjsTk) && !isBpjsRegistered(e.bpjsKes)).length;
  }, [employees]);

  const noCoverageRate = totalCount ? Math.round((noCoverageCount / totalCount) * 100) : 0;

  // Department-wise breakdown
  const departmentBreakdowns = useMemo(() => {
    const map = new Map<string, {
      name: string;
      total: number;
      tkCovered: number;
      kesCovered: number;
    }>();

    employees.forEach(e => {
      const d = e.department || 'LAIN-LAIN';
      if (!map.has(d)) {
        map.set(d, { name: d, total: 0, tkCovered: 0, kesCovered: 0 });
      }
      const s = map.get(d)!;
      s.total++;
      if (isBpjsRegistered(e.bpjsTk)) s.tkCovered++;
      if (isBpjsRegistered(e.bpjsKes)) s.kesCovered++;
    });

    return Array.from(map.values())
      .map(item => {
        const tkPct = item.total ? Math.round((item.tkCovered / item.total) * 100) : 0;
        const kesPct = item.total ? Math.round((item.kesCovered / item.total) * 100) : 0;
        return {
          ...item,
          tkPct,
          kesPct,
          avgPct: Math.round((tkPct + kesPct) / 2)
        };
      })
      .sort((a, b) => b.total - a.total); // Sort by employee volume
  }, [employees]);

  // Employment status breakdown
  const statusBreakdown = useMemo(() => {
    const pkwtEmps = employees.filter(e => e.status === 'PKWT');
    const pkwttEmps = employees.filter(e => e.status === 'PKWTT');

    const pkwtTk = pkwtEmps.filter(e => isBpjsRegistered(e.bpjsTk)).length;
    const pkwtKes = pkwtEmps.filter(e => isBpjsRegistered(e.bpjsKes)).length;

    const pkwttTk = pkwttEmps.filter(e => isBpjsRegistered(e.bpjsTk)).length;
    const pkwttKes = pkwttEmps.filter(e => isBpjsRegistered(e.bpjsKes)).length;

    return {
      pkwt: {
        total: pkwtEmps.length,
        tkCovered: pkwtTk,
        kesCovered: pkwtKes,
        tkPct: pkwtEmps.length ? Math.round((pkwtTk / pkwtEmps.length) * 100) : 0,
        kesPct: pkwtEmps.length ? Math.round((pkwtKes / pkwtEmps.length) * 100) : 0,
      },
      pkwtt: {
        total: pkwttEmps.length,
        tkCovered: pkwttTk,
        kesCovered: pkwttKes,
        tkPct: pkwttEmps.length ? Math.round((pkwttTk / pkwttEmps.length) * 100) : 0,
        kesPct: pkwttEmps.length ? Math.round((pkwttKes / pkwttEmps.length) * 100) : 0,
      }
    };
  }, [employees]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setDeptFilter('');
    setStatusFilter('');
    setBpjsTkFilter('');
    setBpjsKesFilter('');
    setCoverageFilter('');
    setCurrentPage(1);
  };

  // Filter Logic
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // 1. Search term (Name / NIK / Position)
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const nameMatch = emp.name?.toLowerCase().includes(query);
        const nikMatch = emp.nik?.toLowerCase().includes(query);
        const posMatch = emp.position?.toLowerCase().includes(query);
        if (!nameMatch && !nikMatch && !posMatch) return false;
      }

      // 2. Department Filter
      if (deptFilter && emp.department !== deptFilter) return false;

      // 3. Status Filter (PKWT / PKWTT)
      if (statusFilter && emp.status !== statusFilter) return false;

      // 4. BPJS TK registered status
      const hasTk = isBpjsRegistered(emp.bpjsTk);
      if (bpjsTkFilter === 'Covered' && !hasTk) return false;
      if (bpjsTkFilter === 'NotCovered' && hasTk) return false;

      // 5. BPJS Kes registered status
      const hasKes = isBpjsRegistered(emp.bpjsKes);
      if (bpjsKesFilter === 'Covered' && !hasKes) return false;
      if (bpjsKesFilter === 'NotCovered' && hasKes) return false;

      // 6. Joint Coverage Status
      if (coverageFilter) {
        if (coverageFilter === 'Both' && (!hasTk || !hasKes)) return false;
        if (coverageFilter === 'OnlyTK' && (!hasTk || hasKes)) return false;
        if (coverageFilter === 'OnlyKes' && (hasTk || !hasKes)) return false;
        if (coverageFilter === 'None' && (hasTk || hasKes)) return false;
      }

      return true;
    });
  }, [employees, searchTerm, deptFilter, statusFilter, bpjsTkFilter, bpjsKesFilter, coverageFilter]);

  // Pagination calculation
  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentItems = useMemo(() => {
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, startIndex, endIndex]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Export to CSV Functionality
  const handleExportCSV = () => {
    const headers = [
      'No. Urut',
      'Nama Karyawan',
      'NIK',
      'Departemen',
      'Jabatan',
      'Status Hubungan Kerja',
      'No. BPJS Ketenagakerjaan (TK)',
      'Status BPJS TK',
      'No. BPJS Kesehatan',
      'Status BPJS Kesehatan',
      'Status Coverage Lengkap'
    ];

    const rows = filteredEmployees.map((emp, index) => {
      const hasTk = isBpjsRegistered(emp.bpjsTk);
      const hasKes = isBpjsRegistered(emp.bpjsKes);
      
      let jointStatus = 'Belum Ada Jaminan';
      if (hasTk && hasKes) jointStatus = 'Keduanya Aktif';
      else if (hasTk) jointStatus = 'Hanya BPJS TK';
      else if (hasKes) jointStatus = 'Hanya BPJS Kesehatan';

      return [
        index + 1,
        `"${emp.name}"`,
        `"'${emp.nik || '-'}"`, // Force excel to treat as string
        `"${emp.department || '-'}"`,
        `"${emp.position || '-'}"`,
        emp.status || '-',
        emp.bpjsTk ? `"'${emp.bpjsTk}"` : '-',
        hasTk ? 'Terdaftar' : 'Belum Terdaftar',
        emp.bpjsKes ? `"'${emp.bpjsKes}"` : '-',
        hasKes ? 'Terdaftar' : 'Belum Terdaftar',
        jointStatus
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Rekonsiliasi_BPJS_PT_One_For_All_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Unregistered BPJS Modal State
  const [showUnregisteredModal, setShowUnregisteredModal] = useState(false);

  // Unregistered subsets memoization
  const unregisteredTk = useMemo(() => employees.filter(e => !isBpjsRegistered(e.bpjsTk)), [employees]);
  const unregisteredKes = useMemo(() => employees.filter(e => !isBpjsRegistered(e.bpjsKes)), [employees]);
  const unregisteredBoth = useMemo(() => employees.filter(e => !isBpjsRegistered(e.bpjsTk) && !isBpjsRegistered(e.bpjsKes)), [employees]);
  const unregisteredAny = useMemo(() => employees.filter(e => !isBpjsRegistered(e.bpjsTk) || !isBpjsRegistered(e.bpjsKes)), [employees]);

  // Export Unregistered BPJS Handler (Excel / CSV)
  const handleExportUnregistered = (
    type: 'tk' | 'kes' | 'both' | 'any' | 'all_sheets',
    format: 'excel' | 'csv'
  ) => {
    const mapEmpToRow = (emp: Employee, index: number) => ({
      'No. Urut': index + 1,
      'NIK': emp.nik ? `'${emp.nik}` : '-',
      'Nama Karyawan': emp.name,
      'Departemen': emp.department || '-',
      'Jabatan': emp.position || '-',
      'Status Hubungan Kerja': emp.status || '-',
      'No. BPJS TK': emp.bpjsTk ? `'${emp.bpjsTk}` : 'Belum Terdaftar',
      'Status BPJS TK': isBpjsRegistered(emp.bpjsTk) ? 'Terdaftar' : 'Belum Terdaftar',
      'No. BPJS Kesehatan': emp.bpjsKes ? `'${emp.bpjsKes}` : 'Belum Terdaftar',
      'Status BPJS Kesehatan': isBpjsRegistered(emp.bpjsKes) ? 'Terdaftar' : 'Belum Terdaftar',
      'Keterangan Status BPJS': !isBpjsRegistered(emp.bpjsTk) && !isBpjsRegistered(emp.bpjsKes)
        ? 'Belum Ada Jaminan BPJS'
        : (!isBpjsRegistered(emp.bpjsTk) ? 'Belum Terdaftar BPJS Ketenagakerjaan' : 'Belum Terdaftar BPJS Kesehatan')
    });

    const dateStr = new Date().toISOString().slice(0, 10);

    if (type === 'all_sheets' && format === 'excel') {
      const workbook = xlsx.utils.book_new();
      
      const wsTk = xlsx.utils.json_to_sheet(unregisteredTk.map(mapEmpToRow));
      xlsx.utils.book_append_sheet(workbook, wsTk, 'Belum BPJS TK');

      const wsKes = xlsx.utils.json_to_sheet(unregisteredKes.map(mapEmpToRow));
      xlsx.utils.book_append_sheet(workbook, wsKes, 'Belum BPJS Kesehatan');

      const wsBoth = xlsx.utils.json_to_sheet(unregisteredBoth.map(mapEmpToRow));
      xlsx.utils.book_append_sheet(workbook, wsBoth, 'Belum Keduanya');

      const wsAny = xlsx.utils.json_to_sheet(unregisteredAny.map(mapEmpToRow));
      xlsx.utils.book_append_sheet(workbook, wsAny, 'Semua Belum Lengkap');

      xlsx.writeFile(workbook, `Paket_Audit_BPJS_Belum_Terdaftar_${dateStr}.xlsx`);
      return;
    }

    let list: Employee[] = [];
    let categoryLabel = '';

    if (type === 'tk') {
      list = unregisteredTk;
      categoryLabel = 'Belum_Terdaftar_BPJS_TK';
    } else if (type === 'kes') {
      list = unregisteredKes;
      categoryLabel = 'Belum_Terdaftar_BPJS_Kesehatan';
    } else if (type === 'both') {
      list = unregisteredBoth;
      categoryLabel = 'Belum_Terdaftar_Keduanya_BPJS';
    } else {
      list = unregisteredAny;
      categoryLabel = 'Semua_Belum_Lengkap_BPJS';
    }

    if (list.length === 0) {
      alert("Tidak ada data karyawan pada kategori ini.");
      return;
    }

    const exportRows = list.map(mapEmpToRow);
    const filename = `Karyawan_${categoryLabel}_${dateStr}`;

    if (format === 'excel') {
      const worksheet = xlsx.utils.json_to_sheet(exportRows);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, categoryLabel.slice(0, 31));
      xlsx.writeFile(workbook, `${filename}.xlsx`);
    } else {
      const headers = Object.keys(exportRows[0]).join(',');
      const csvLines = exportRows.map(row => 
        Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
      );
      const csvContent = [headers, ...csvLines].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      link.click();
    }
  };

  const handleQuickFilterUnregistered = (type: 'tk' | 'kes' | 'both') => {
    handleResetFilters();
    if (type === 'tk') {
      setBpjsTkFilter('NotCovered');
    } else if (type === 'kes') {
      setBpjsKesFilter('NotCovered');
    } else if (type === 'both') {
      setCoverageFilter('None');
    }
    setShowUnregisteredModal(false);
  };

  return (
    <div className="space-y-6" id="bpjs-dashboard-container">
      {/* HEADER ACTION AREA */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm" id="bpjs-header-panel">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Kepatuhan Jaminan Sosial</span>
          </div>
          <h2 className="text-xl font-extrabold text-white font-heading mt-1">Kepatuhan &amp; Rekonsiliasi BPJS</h2>
          <p className="text-slate-400 text-xs mt-1 font-medium">
            Pengawasan real-time kepesertaan BPJS Ketenagakerjaan (TK) dan BPJS Kesehatan karyawan One For All.
          </p>
        </div>

        {/* MENU EKSPOR KARYAWAN BELUM TERDAFTAR BPJS */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowUnregisteredModal(true)}
            className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2 border border-rose-400/40"
            title="Buka Menu Ekspor Karyawan Belum Terdaftar BPJS"
          >
            <ShieldAlert className="w-4 h-4 text-rose-100" />
            <span>Ekspor Belum Terdaftar BPJS</span>
            <span className="bg-rose-950/90 text-rose-200 text-[11px] px-2 py-0.5 rounded-full font-mono font-extrabold border border-rose-400/50">
              {unregisteredAny.length}
            </span>
          </button>
        </div>
      </div>

      {/* DATA IMPORT / EXPORT BAR */}
      <DataExchangeBar 
        data={filteredEmployees} 
        fileName="laporan_bpjs_karyawan" 
        onUploadSuccess={onUploadSuccess}
        onClearAllEmployees={onClearAllEmployees}
        title="Kelola &amp; Rekonsiliasi Data BPJS"
        dashboardType="BPJS_KESEHATAN"
      />

      {/* QUICK EXCEL UPLOAD PANEL WITH DASHBOARD TYPE ISOLATION */}
      {uploadFeedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
          uploadFeedback.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' 
            : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {uploadFeedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{uploadFeedback.message}</span>
          </div>
          <button 
            onClick={() => setUploadFeedback(null)} 
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded"
          >
            Tutup
          </button>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="bpjs-kpi-grid">
        {/* Card 1: Total Employees */}
        <div 
          onClick={handleResetFilters}
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden group cursor-pointer transition-all"
        >
          <div className="absolute right-0 top-0 p-6 opacity-5 -mr-4 -mt-4 transition-transform group-hover:scale-110">
            <Users className="w-16 h-16 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Total Database</span>
            <h3 className="text-2xl font-extrabold text-slate-100 font-heading mt-1">{totalCount}</h3>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-3">Jumlah Karyawan Terdaftar</p>
        </div>

        {/* Card 2: BPJS TK Coverage */}
        <div 
          onClick={() => { handleResetFilters(); setBpjsTkFilter('Covered'); }}
          className={`bg-slate-900 hover:bg-slate-850 border p-4 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden group cursor-pointer transition-all ${
            bpjsTkFilter === 'Covered' ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-slate-800/80'
          }`}
        >
          <div className="absolute right-0 top-0 p-6 opacity-5 -mr-4 -mt-4 transition-transform group-hover:scale-110">
            <Shield className="w-16 h-16 text-emerald-500" />
          </div>
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">BPJS TK (Terdaftar)</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded-md border border-emerald-500/20">{bpjsTkRate}%</span>
            </div>
            <h3 className="text-2xl font-extrabold text-emerald-400 font-heading mt-1">
              {bpjsTkCovered} <span className="text-xs text-slate-500 font-normal">/ {totalCount}</span>
            </h3>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${bpjsTkRate}%` }} />
            </div>
          </div>
        </div>

        {/* Card 3: BPJS Kesehatan Coverage */}
        <div 
          onClick={() => { handleResetFilters(); setBpjsKesFilter('Covered'); }}
          className={`bg-slate-900 hover:bg-slate-850 border p-4 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden group cursor-pointer transition-all ${
            bpjsKesFilter === 'Covered' ? 'border-teal-500 ring-1 ring-teal-500/50' : 'border-slate-800/80'
          }`}
        >
          <div className="absolute right-0 top-0 p-6 opacity-5 -mr-4 -mt-4 transition-transform group-hover:scale-110">
            <ShieldCheck className="w-16 h-16 text-teal-500" />
          </div>
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">BPJS Kesehatan</span>
              <span className="text-[10px] bg-teal-500/10 text-teal-400 font-bold px-1.5 py-0.5 rounded-md border border-teal-500/20">{bpjsKesRate}%</span>
            </div>
            <h3 className="text-2xl font-extrabold text-teal-400 font-heading mt-1">
              {bpjsKesCovered} <span className="text-xs text-slate-500 font-normal">/ {totalCount}</span>
            </h3>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${bpjsKesRate}%` }} />
            </div>
          </div>
        </div>

        {/* Card 4: Fully Covered (Both) */}
        <div 
          onClick={() => { handleResetFilters(); setCoverageFilter('Both'); }}
          className={`bg-slate-900 hover:bg-slate-850 border p-4 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden group cursor-pointer transition-all ${
            coverageFilter === 'Both' ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-800/80'
          }`}
        >
          <div className="absolute right-0 top-0 p-6 opacity-5 -mr-4 -mt-4 transition-transform group-hover:scale-110">
            <ShieldCheck className="w-16 h-16 text-blue-500" />
          </div>
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Keduanya Aktif</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 font-bold px-1.5 py-0.5 rounded-md border border-blue-500/20">{fullyCoveredRate}%</span>
            </div>
            <h3 className="text-2xl font-extrabold text-blue-400 font-heading mt-1">
              {fullyCoveredCount} <span className="text-xs text-slate-500 font-normal">/ {totalCount}</span>
            </h3>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${fullyCoveredRate}%` }} />
            </div>
          </div>
        </div>

        {/* Card 5: Belum Terdaftar BPJS TK */}
        <div 
          onClick={() => { handleResetFilters(); setBpjsTkFilter('NotCovered'); }}
          className={`bg-slate-900 hover:bg-slate-850 border p-4 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden group cursor-pointer transition-all ${
            bpjsTkFilter === 'NotCovered' ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-800/80'
          }`}
        >
          <div className="absolute right-0 top-0 p-6 opacity-5 -mr-4 -mt-4 transition-transform group-hover:scale-110">
            <ShieldAlert className="w-16 h-16 text-rose-500" />
          </div>
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Belum Terdaftar BPJS TK</span>
              <span className="text-[10px] bg-rose-500/10 text-rose-400 font-bold px-1.5 py-0.5 rounded-md border border-rose-500/20">{totalCount ? Math.round(((totalCount - bpjsTkCovered) / totalCount) * 100) : 0}%</span>
            </div>
            <h3 className="text-2xl font-extrabold text-rose-400 font-heading mt-1">
              {totalCount - bpjsTkCovered} <span className="text-xs text-slate-500 font-normal">/ {totalCount}</span>
            </h3>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${totalCount ? Math.round(((totalCount - bpjsTkCovered) / totalCount) * 100) : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS / SEGMENTATION BLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="bpjs-visual-section">
        
        {/* Compliance By Employment Status (PKWT vs PKWTT) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-200 font-heading flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Kepatuhan Berdasarkan Status Kontrak</span>
          </h3>
          <p className="text-xs text-slate-400">Analisis pendaftaran BPJS pada kelompok PKWT (Kontrak) vs PKWTT (Tetap).</p>
          
          <div className="space-y-6 pt-2">
            {/* PKWT Breakdown */}
            <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white uppercase">Karyawan PKWT ({statusBreakdown.pkwt.total} Orang)</span>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 font-bold rounded-full border border-indigo-500/20">Masa Kontrak</span>
              </div>
              
              {/* TK progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                  <span>BPJS Ketenagakerjaan (TK)</span>
                  <span className="text-emerald-400">{statusBreakdown.pkwt.tkCovered} Terdaftar ({statusBreakdown.pkwt.tkPct}%)</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${statusBreakdown.pkwt.tkPct}%` }} />
                </div>
              </div>

              {/* Kes progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                  <span>BPJS Kesehatan</span>
                  <span className="text-teal-400">{statusBreakdown.pkwt.kesCovered} Terdaftar ({statusBreakdown.pkwt.kesPct}%)</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${statusBreakdown.pkwt.kesPct}%` }} />
                </div>
              </div>
            </div>

            {/* PKWTT Breakdown */}
            <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white uppercase">Karyawan PKWTT ({statusBreakdown.pkwtt.total} Orang)</span>
                <span className="text-[10px] px-2 py-0.5 bg-yellow-500/10 text-yellow-400 font-bold rounded-full border border-yellow-500/20">Karyawan Tetap</span>
              </div>
              
              {/* TK progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                  <span>BPJS Ketenagakerjaan (TK)</span>
                  <span className="text-emerald-400">{statusBreakdown.pkwtt.tkCovered} Terdaftar ({statusBreakdown.pkwtt.tkPct}%)</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${statusBreakdown.pkwtt.tkPct}%` }} />
                </div>
              </div>

              {/* Kes progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                  <span>BPJS Kesehatan</span>
                  <span className="text-teal-400">{statusBreakdown.pkwtt.kesCovered} Terdaftar ({statusBreakdown.pkwtt.kesPct}%)</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${statusBreakdown.pkwtt.kesPct}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance By Department List (First 5 largest depts) */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-200 font-heading flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Kepatuhan Berdasarkan Departemen (Volume Terbanyak)</span>
          </h3>
          <p className="text-xs text-slate-400">Membandingkan persentase keanggotaan BPJS TK vs Kesehatan per departemen operasional.</p>
          
          <div className="space-y-3 pt-1 overflow-y-auto max-h-[290px] pr-1">
            {departmentBreakdowns.slice(0, 6).map((dept, idx) => (
              <div key={idx} className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-[150px]">
                  <span className="text-xs font-bold text-slate-200 block truncate" title={dept.name}>{dept.name}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">{dept.total} Karyawan Aktif</span>
                </div>
                
                <div className="flex-1 grid grid-cols-2 gap-4">
                  {/* BPJS TK department rate */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>BPJS TK</span>
                      <span className="text-emerald-400 font-mono">{dept.tkPct}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${dept.tkPct}%` }} />
                    </div>
                  </div>

                  {/* BPJS Kes department rate */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>BPJS Kes</span>
                      <span className="text-teal-400 font-mono">{dept.kesPct}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-1 rounded-full" style={{ width: `${dept.kesPct}%` }} />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    dept.avgPct >= 95 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    dept.avgPct >= 75 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  }`}>
                    {dept.avgPct}% Kepatuhan
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm space-y-4" id="bpjs-filters-panel">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-200 font-heading flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-400" />
            <span>Saring & Cari Data BPJS</span>
          </h3>
          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Filter</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Cari nama / NIK..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-blue-500 transition-colors font-medium"
            />
          </div>

          {/* Department filter */}
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors font-medium cursor-pointer"
          >
            <option value="">Semua Departemen</option>
            {departments.map((dept, idx) => (
              <option key={idx} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors font-medium cursor-pointer"
          >
            <option value="">Hubungan Kerja (Semua)</option>
            <option value="PKWT">PKWT (Kontrak)</option>
            <option value="PKWTT">PKWTT (Tetap)</option>
          </select>

          {/* BPJS TK filter */}
          <select
            value={bpjsTkFilter}
            onChange={(e) => { setBpjsTkFilter(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors font-medium cursor-pointer"
          >
            <option value="">BPJS TK (Semua)</option>
            <option value="Covered">Terdaftar</option>
            <option value="NotCovered">Belum Terdaftar</option>
          </select>

          {/* BPJS Kes filter */}
          <select
            value={bpjsKesFilter}
            onChange={(e) => { setBpjsKesFilter(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors font-medium cursor-pointer"
          >
            <option value="">BPJS Kesehatan (Semua)</option>
            <option value="Covered">Terdaftar</option>
            <option value="NotCovered">Belum Terdaftar</option>
          </select>

          {/* Coverage Filter */}
          <select
            value={coverageFilter}
            onChange={(e) => { setCoverageFilter(e.target.value); setCurrentPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 transition-colors font-medium cursor-pointer"
          >
            <option value="">Tingkat Proteksi (Semua)</option>
            <option value="Both">Lengkap (TK + Kes)</option>
            <option value="OnlyTK">Hanya BPJS TK</option>
            <option value="OnlyKes">Hanya BPJS Kesehatan</option>
            <option value="None">Belum Keduanya</option>
          </select>
        </div>

        {/* Filter results label */}
        <div className="flex justify-between items-center text-xs text-slate-500 font-semibold pt-1">
          <span>Menampilkan {totalItems} dari {employees.length} total karyawan</span>
          {searchTerm || deptFilter || statusFilter || bpjsTkFilter || bpjsKesFilter || coverageFilter ? (
            <span className="text-blue-400">Saringan aktif diterapkan</span>
          ) : null}
        </div>
      </div>

      {/* RECONCILIATION LIST TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm" id="bpjs-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4 text-center w-12">No.</th>
                <th className="py-4 px-4">Nama Karyawan / Posisi</th>
                <th className="py-4 px-4">Departemen</th>
                <th className="py-4 px-4 text-center">Hubungan Kerja</th>
                <th className="py-4 px-4">BPJS Ketenagakerjaan (TK)</th>
                <th className="py-4 px-4">BPJS Kesehatan</th>
                <th className="py-4 px-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm font-medium">
                    Tidak ditemukan karyawan yang cocok dengan kriteria saringan di atas.
                  </td>
                </tr>
              ) : (
                currentItems.map((emp, index) => {
                  const globalNo = emp.globalNo || (startIndex + index + 1);
                  const isTkRegistered = isBpjsRegistered(emp.bpjsTk);
                  const isKesRegistered = isBpjsRegistered(emp.bpjsKes);

                  return (
                    <tr 
                      key={emp.id} 
                      className="hover:bg-slate-900/40 transition-colors group text-xs text-slate-300"
                    >
                      {/* No */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                        {globalNo}
                      </td>

                      {/* Name & Position */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white group-hover:text-blue-400 transition-colors truncate max-w-[200px]">
                          {emp.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                          {emp.position || '-'}
                        </div>
                        {emp.nik && (
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                            NIK: {emp.nik}
                          </div>
                        )}
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 font-semibold text-slate-400">
                        {emp.department || '-'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                          emp.status === 'PKWTT'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          {emp.status || '-'}
                        </span>
                      </td>

                      {/* BPJS TK */}
                      <td className="py-3 px-4">
                        {isTkRegistered ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="font-mono font-semibold text-slate-200 select-all">{emp.bpjsTk}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-rose-500 font-semibold">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[10px]">Belum Terdaftar</span>
                          </div>
                        )}
                      </td>

                      {/* BPJS Kesehatan */}
                      <td className="py-3 px-4">
                        {isKesRegistered ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                            <span className="font-mono font-semibold text-slate-200 select-all">{emp.bpjsKes}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-rose-500 font-semibold">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[10px]">Belum Terdaftar</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onSelectEmployee(emp)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-400 rounded-lg transition-all cursor-pointer"
                            title="Detail Karyawan"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditEmployee(emp)}
                            className="p-1.5 bg-blue-950/40 hover:bg-blue-600 hover:text-white text-blue-400 rounded-lg transition-all border border-blue-500/10 cursor-pointer"
                            title="Edit BPJS / Data"
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

        {/* PAGINATION PANEL */}
        {totalItems > 0 && (
          <div className="bg-slate-950 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-500 font-semibold">
              <span>Baris per halaman:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-300 font-mono focus:border-blue-500 outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="text-slate-400 font-medium">
              Menampilkan <span className="font-bold text-white">{startIndex + 1}</span> - <span className="font-bold text-white">{endIndex}</span> dari <span className="font-bold text-white">{totalItems}</span> karyawan
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1 text-slate-400 font-bold px-2">
                <span className="text-white font-mono">{currentPage}</span>
                <span>/</span>
                <span className="font-mono">{totalPages}</span>
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS / ALERTS */}
      {noCoverageCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pemberitahuan Audit Kepatuhan BPJS</h4>
              <p className="text-slate-300 text-xs">
                Terdeteksi sebanyak <span className="font-bold text-amber-400">{noCoverageCount} karyawan</span> tidak memiliki nomor BPJS Ketenagakerjaan maupun BPJS Kesehatan yang terdaftar di sistem. Mohon untuk melakukan pemeriksaan berkas dan mendaftarkan kepesertaan mereka secepatnya.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowUnregisteredModal(true)}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer transition-colors"
          >
            Ekspor Laporan
          </button>
        </div>
      )}

      {/* MODAL MENU EKSPOR KARYAWAN BELUM TERDAFTAR BPJS */}
      {showUnregisteredModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white font-heading">
                    Menu Ekspor Karyawan Belum Terdaftar BPJS
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Pilih kategori jaminan sosial dan format berkas yang ingin diunduh untuk kebutuhan pendaftaran kolektif &amp; audit HR.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUnregisteredModal(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Featured Action: Download All-in-One Package */}
            <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-indigo-950/60 border border-rose-500/30 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                    Rekomendasi Audit HR
                  </span>
                  <span className="text-xs font-bold text-slate-200">Paket Komplit Multi-Sheet Excel</span>
                </div>
                <p className="text-slate-400 text-xs">
                  Unduh 1 file Excel (.xlsx) dengan 4 Lembar Kerja terpisah (Belum TK, Belum Kes, Belum Keduanya, &amp; Total Belum Lengkap).
                </p>
              </div>
              <button
                onClick={() => handleExportUnregistered('all_sheets', 'excel')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0 border border-emerald-400/30 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>Unduh Paket Audit Multi-Sheet (.xlsx)</span>
              </button>
            </div>

            {/* Grid of 4 Export Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category 1: Belum Terdaftar BPJS TK */}
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase">Belum Terdaftar BPJS TK</span>
                  </div>
                  <span className="text-xs font-extrabold px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full font-mono">
                    {unregisteredTk.length} Karyawan
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Karyawan yang tidak/belum memiliki Nomor KPJ (Ketenagakerjaan).
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => handleExportUnregistered('tk', 'excel')}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => handleExportUnregistered('tk', 'csv')}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => handleQuickFilterUnregistered('tk')}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
                    title="Tampilkan di Tabel Utama"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Category 2: Belum Terdaftar BPJS Kesehatan */}
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase">Belum Terdaftar BPJS Kesehatan</span>
                  </div>
                  <span className="text-xs font-extrabold px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full font-mono">
                    {unregisteredKes.length} Karyawan
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Karyawan yang belum memiliki Nomor Kartu BPJS Kesehatan.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => handleExportUnregistered('kes', 'excel')}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => handleExportUnregistered('kes', 'csv')}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => handleQuickFilterUnregistered('kes')}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
                    title="Tampilkan di Tabel Utama"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Category 3: Belum Terdaftar Keduanya (Tanpa Jaminan BPJS) */}
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase">Belum Terdaftar Keduanya</span>
                  </div>
                  <span className="text-xs font-extrabold px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-mono">
                    {unregisteredBoth.length} Karyawan
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Karyawan yang sama sekali tidak memiliki jaminan BPJS TK &amp; Kesehatan.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => handleExportUnregistered('both', 'excel')}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => handleExportUnregistered('both', 'csv')}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => handleQuickFilterUnregistered('both')}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
                    title="Tampilkan di Tabel Utama"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Category 4: Semua Belum Lengkap BPJS */}
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase">Semua Belum Lengkap BPJS</span>
                  </div>
                  <span className="text-xs font-extrabold px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full font-mono">
                    {unregisteredAny.length} Karyawan
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Gabungan seluruh karyawan yang belum terdaftar BPJS TK ATAU Kesehatan.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => handleExportUnregistered('any', 'excel')}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => handleExportUnregistered('any', 'csv')}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-500 font-medium">
              <span>* Seluruh data yang diunduh mencakup Nama, NIK, Departemen, Jabatan, dan Status BPJS saat ini.</span>
              <button
                onClick={() => setShowUnregisteredModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
