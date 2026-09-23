import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import { 
  Plane, MapPin, Calendar, DollarSign, Search, Filter, 
  Edit3, ChevronLeft, ChevronRight, Briefcase, Clock, CheckCircle, HelpCircle, FileText
} from 'lucide-react';
import DataExchangeBar from './DataExchangeBar';

interface PerjalananDinasDashboardProps {
  employees: Employee[];
  onUpdateEmployee: (empId: string, updatedData: Partial<Employee>) => Promise<void>;
  onUploadSuccess?: () => void;
}

export default function PerjalananDinasDashboard({
  employees,
  onUpdateEmployee,
  onUploadSuccess
}: PerjalananDinasDashboardProps) {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Employee to Edit Business Trip
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [formStatus, setFormStatus] = useState<'none' | 'planned' | 'active' | 'completed'>('none');
  const [formDestination, setFormDestination] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formAllowance, setFormAllowance] = useState(0);
  const [formTransport, setFormTransport] = useState('Mobil Dinas');
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Helper to format currency
  const formatIDR = (num?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  // Departments List
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => { if (e.department) depts.add(e.department); });
    return Array.from(depts).sort();
  }, [employees]);

  // Transportation choices
  const transportChoices = ['Mobil Dinas', 'Pesawat Udara', 'Kapal Laut', 'Kereta Api', 'Helikopter Site', 'Lainnya'];

  // Process employees for business trips
  const processedEmployees = useMemo(() => {
    return employees.map((emp) => {
      const status = emp.businessTripStatus || 'none';
      const dest = emp.businessTripDestination || '';
      const sDate = emp.businessTripStartDate || '';
      const eDate = emp.businessTripEndDate || '';
      const purpose = emp.businessTripPurpose || '';
      const allowance = emp.businessTripAllowance || 0;
      const transport = emp.businessTripTransport || 'Mobil Dinas';
      const notes = emp.businessTripNotes || '';

      return {
        ...emp,
        businessTripStatus: status,
        businessTripDestination: dest,
        businessTripStartDate: sDate,
        businessTripEndDate: eDate,
        businessTripPurpose: purpose,
        businessTripAllowance: allowance,
        businessTripTransport: transport,
        businessTripNotes: notes
      };
    });
  }, [employees]);

  // Analytical Metrics for travel
  const metrics = useMemo(() => {
    let activeCount = 0;
    let plannedCount = 0;
    let completedCount = 0;
    let totalAllowance = 0;
    const destMap: Record<string, number> = {};

    processedEmployees.forEach(emp => {
      const status = emp.businessTripStatus || 'none';
      if (status === 'active') {
        activeCount++;
        totalAllowance += emp.businessTripAllowance || 0;
      } else if (status === 'planned') {
        plannedCount++;
        totalAllowance += emp.businessTripAllowance || 0;
      } else if (status === 'completed') {
        completedCount++;
        totalAllowance += emp.businessTripAllowance || 0;
      }

      if (emp.businessTripDestination) {
        destMap[emp.businessTripDestination] = (destMap[emp.businessTripDestination] || 0) + 1;
      }
    });

    let topDest = '-';
    let maxCount = 0;
    Object.entries(destMap).forEach(([dest, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topDest = dest;
      }
    });

    return {
      activeCount,
      plannedCount,
      completedCount,
      totalAllowance,
      topDest
    };
  }, [processedEmployees]);

  // Filters application
  const filteredEmployees = useMemo(() => {
    return processedEmployees.filter(emp => {
      const query = (searchTerm || '').toLowerCase();
      const matchesSearch = (emp.name || '').toLowerCase().includes(query) || 
                            (emp.position || '').toLowerCase().includes(query) ||
                            (emp.nik || '').toLowerCase().includes(query);
      
      const matchesDept = deptFilter === '' || emp.department === deptFilter;
      const matchesStatus = statusFilter === '' || emp.businessTripStatus === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [processedEmployees, searchTerm, deptFilter, statusFilter]);

  // Pagination
  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = useMemo(() => {
    return filteredEmployees.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEmployees, startIndex]);

  // Open Edit Order Dialog
  const handleOpenEdit = (emp: any) => {
    setEditingEmp(emp);
    setFormStatus(emp.businessTripStatus || 'none');
    setFormDestination(emp.businessTripDestination || '');
    setFormStartDate(emp.businessTripStartDate || '');
    setFormEndDate(emp.businessTripEndDate || '');
    setFormPurpose(emp.businessTripPurpose || '');
    setFormAllowance(emp.businessTripAllowance || 0);
    setFormTransport(emp.businessTripTransport || 'Mobil Dinas');
    setFormNotes(emp.businessTripNotes || '');
    setSaveSuccess(false);
  };

  // Save changes
  const handleSaveEdit = async () => {
    if (!editingEmp) return;
    setIsSaving(true);
    try {
      await onUpdateEmployee(editingEmp.id, {
        businessTripStatus: formStatus,
        businessTripDestination: formDestination,
        businessTripStartDate: formStartDate,
        businessTripEndDate: formEndDate,
        businessTripPurpose: formPurpose,
        businessTripAllowance: formAllowance,
        businessTripTransport: formTransport,
        businessTripNotes: formNotes
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setEditingEmp(null);
        setSaveSuccess(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui surat perintah dinas');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" id="business-trip-dashboard-container">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                Logistik &amp; Operasional
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-950 text-slate-400 text-xs font-mono border border-slate-800">
                Surat Perintah Perjalanan Dinas
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white font-heading tracking-tight">
              Perjalanan Dinas (SPPD)
            </h1>
            <p className="text-slate-400 text-xs md:text-sm">
              Sistem pelacakan penugasan dinas luar kota, anggaran uang saku perjalanan, dan moda transportasi karyawan One For All.
            </p>
          </div>
          
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 flex items-center gap-3">
            <Plane className="w-8 h-8 text-blue-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">SPPD Tracker</div>
              <div className="text-xs font-bold text-slate-200">One For All Sultra Site</div>
            </div>
          </div>
        </div>
      </div>

      {/* DATA EXPORTS / IMPORTS */}
      <DataExchangeBar 
        data={filteredEmployees.filter(e => e.businessTripStatus !== 'none')}
        fileName="laporan_perjalanan_dinas"
        onUploadSuccess={onUploadSuccess}
        title="Kelola &amp; Ekspor Data Perjalanan Dinas Karyawan"
      />

      {/* METRICS WIDGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="trip-stats">
        {/* Metric 1: Active Trips */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sedang Dinas (Aktif)</p>
            <h3 className="text-2xl font-extrabold text-blue-400 font-heading">
              {metrics.activeCount} <span className="text-xs text-slate-500 font-normal">Karyawan</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Staf aktif di luar daerah operasional</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20 shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Metric 2: Planned Trips */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Direncanakan (Planned)</p>
            <h3 className="text-2xl font-extrabold text-amber-400 font-heading">
              {metrics.plannedCount} <span className="text-xs text-slate-500 font-normal">Surat Perintah</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">SPPD terjadwal dalam waktu dekat</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Completed Trips */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Selesai Penugasan</p>
            <h3 className="text-2xl font-extrabold text-emerald-400 font-heading">
              {metrics.completedCount} <span className="text-xs text-slate-500 font-normal">Selesai</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Laporan dinas telah diserahkan ke HR</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Total Travel Budget */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Anggaran Uang Saku</p>
            <h3 className="text-lg font-extrabold text-white font-mono">
              {formatIDR(metrics.totalAllowance)}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">Dana saku operasional terdistribusi</p>
          </div>
          <div className="p-3 bg-teal-500/10 rounded-lg text-teal-400 border border-teal-500/20 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TRAVEL TABLE WIDGET */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Daftar Surat Perintah Perjalanan Dinas</h3>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full xl:w-auto">
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

            {/* Travel Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">Semua Status Dinas</option>
              <option value="none">Tidak Ada Dinas (-)</option>
              <option value="planned">Direncanakan (Planned)</option>
              <option value="active">Sedang Dinas (Active)</option>
              <option value="completed">Selesai (Completed)</option>
            </select>
          </div>
        </div>

        {/* RESULTS TABLE */}
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-850 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                <th className="py-3 px-4">Staf Karyawan</th>
                <th className="py-3 px-4">Status Dinas</th>
                <th className="py-3 px-4">Tujuan SPPD</th>
                <th className="py-3 px-4">Tanggal (S/D)</th>
                <th className="py-3 px-4">Tujuan / Maksud Dinas</th>
                <th className="py-3 px-4">Transportasi</th>
                <th className="py-3 px-4">Uang Saku</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 text-slate-300">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    Tidak ditemukan karyawan dengan kriteria perjalanan dinas tersebut.
                  </td>
                </tr>
              ) : (
                currentItems.map((emp) => {
                  let statusBadge = 'bg-slate-950 text-slate-500 border border-slate-850';
                  if (emp.businessTripStatus === 'active') {
                    statusBadge = 'bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold';
                  } else if (emp.businessTripStatus === 'planned') {
                    statusBadge = 'bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold';
                  } else if (emp.businessTripStatus === 'completed') {
                    statusBadge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold';
                  }

                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Name / Dept */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white text-xs">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{emp.department} &bull; {emp.position}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${statusBadge}`}>
                          {emp.businessTripStatus === 'none' ? 'Tidak Ada' : emp.businessTripStatus}
                        </span>
                      </td>

                      {/* Destination */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-200">
                        {emp.businessTripDestination ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{emp.businessTripDestination}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[10.5px] font-mono text-slate-400 leading-tight">
                        {emp.businessTripStartDate ? (
                          <>
                            <div>{emp.businessTripStartDate}</div>
                            <div className="text-slate-500 text-[9px]">s/d {emp.businessTripEndDate}</div>
                          </>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Purpose */}
                      <td className="py-3.5 px-4 text-xs max-w-[200px] truncate" title={emp.businessTripPurpose || ''}>
                        {emp.businessTripPurpose ? (
                          <span className="text-slate-300">{emp.businessTripPurpose}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Transport */}
                      <td className="py-3.5 px-4 text-xs">
                        {emp.businessTripStatus !== 'none' ? (
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-850 text-[10px] text-slate-400">
                            {emp.businessTripTransport || 'Mobil Dinas'}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Allowance */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-200">
                        {emp.businessTripAllowance ? formatIDR(emp.businessTripAllowance) : <span className="text-slate-600">-</span>}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold border border-transparent hover:border-blue-500/20"
                          title="Terbitkan / Edit Perintah Dinas"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Input SPPD</span>
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

      {/* INPUT SPPD MODAL */}
      {editingEmp && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2 text-blue-400">
                <Plane className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Surat Perintah Perjalanan Dinas</h3>
              </div>
              <button 
                onClick={() => setEditingEmp(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850 flex items-start justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Penerima Perintah Dinas</div>
                  <div className="text-sm font-black text-white mt-0.5">{editingEmp.name}</div>
                  <div className="text-xs text-slate-400">{editingEmp.department} &bull; {editingEmp.position}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">NIK</div>
                  <div className="text-xs font-mono font-bold text-slate-300 mt-1">{editingEmp.nik || '-'}</div>
                </div>
              </div>

              {/* Status SPPD */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Status Dinas SPPD</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                >
                  <option value="none">Tidak Ada Perjalanan Dinas (-)</option>
                  <option value="planned">Direncanakan (Planned)</option>
                  <option value="active">Sedang Berlangsung (Active)</option>
                  <option value="completed">Selesai Penugasan (Completed)</option>
                </select>
              </div>

              {formStatus !== 'none' && (
                <div className="space-y-4 border-t border-slate-850 pt-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Destination */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Kota / Lokasi Tujuan</label>
                      <input 
                        type="text"
                        value={formDestination}
                        onChange={(e) => setFormDestination(e.target.value)}
                        placeholder="e.g. Kendari, Jakarta, Pomalaa Site"
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                      />
                    </div>

                    {/* Transportation */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Moda Transportasi Utama</label>
                      <select
                        value={formTransport}
                        onChange={(e) => setFormTransport(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      >
                        {transportChoices.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Start Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Tanggal Keberangkatan</label>
                      <input 
                        type="date"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                      />
                    </div>

                    {/* End Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Tanggal Kepulangan / Selesai</label>
                      <input 
                        type="date"
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Purpose */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Maksud &amp; Tujuan Perjalanan Dinas</label>
                    <input 
                      type="text"
                      value={formPurpose}
                      onChange={(e) => setFormPurpose(e.target.value)}
                      placeholder="e.g. Audit K3 Triwulan di Site Pomalaa"
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Pocket Money / Allowance */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-300">Uang Saku Dinas (IDR)</label>
                        <span className="text-[11px] font-mono font-bold text-emerald-400">{formatIDR(formAllowance)}</span>
                      </div>
                      <input 
                        type="number"
                        step="100000"
                        value={formAllowance}
                        onChange={(e) => setFormAllowance(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">Catatan Khusus SPPD</label>
                      <input 
                        type="text"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="e.g. Akomodasi ditanggung PT Antam"
                        className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Surat Perintah Dinas Berhasil Diterbitkan &amp; Disimpan!</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-md"
              >
                {isSaving ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Terbitkan SPPD</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
