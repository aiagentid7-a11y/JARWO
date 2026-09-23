import React, { useMemo } from 'react';
import { Employee } from '../types';
import { calculateCompensation, isBpjsRegistered } from '../dateUtils';
import { 
  X, Briefcase, Calendar, Phone, MapPin, Award, 
  GraduationCap, DollarSign, ShieldAlert, Heart, Clipboard, Printer, Edit, Trash2
} from 'lucide-react';

interface EmployeeDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onEdit: (emp: Employee) => void;
  onDelete: (id: string) => void;
}

export default function EmployeeDetailDrawer({
  isOpen,
  onClose,
  employee,
  onEdit,
  onDelete
}: EmployeeDetailDrawerProps) {
  
  // Calculate tenure (Years and Months)
  const tenureStr = useMemo(() => {
    if (!employee || !employee.startDate) return '-';
    
    // Parse Indonesian date formats if applicable, e.g. "02-Nov-2021" or "24-Okt-2019" or "9/18/2001"
    const dateStr = employee.startDate !== undefined && employee.startDate !== null ? String(employee.startDate).trim() : '';
    if (!dateStr || dateStr === '-') return '-';
    
    // Try to normalize Indonesian month names to English
    let normalized = dateStr
      .replace(/Okt/i, 'Oct')
      .replace(/Des/i, 'Dec')
      .replace(/Mei/i, 'May')
      .replace(/Agu/i, 'Aug');

    let start = new Date(normalized);
    
    // Fallback if parsing fails
    if (isNaN(start.getTime())) {
      // Try dd-mm-yyyy or similar manually
      const parts = dateStr.split('-');
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
          year += year > 50 ? 1900 : 2000; // Pivot logic
        }
        start = new Date(year, month, day);
      }
    }

    if (isNaN(start.getTime())) return '-';

    const end = new Date(); // Current date (or 2026 as per system metadata)
    let diffYears = end.getFullYear() - start.getFullYear();
    let diffMonths = end.getMonth() - start.getMonth();

    if (diffMonths < 0) {
      diffYears--;
      diffMonths += 12;
    }

    const yrPart = diffYears > 0 ? `${diffYears} Tahun ` : '';
    const mthPart = diffMonths > 0 ? `${diffMonths} Bulan` : '';
    
    return `${yrPart}${mthPart}`.trim() || 'Baru Mulai';
  }, [employee]);

  const compDetails = useMemo(() => {
    if (!employee) return null;
    return calculateCompensation(employee);
  }, [employee]);

  if (!isOpen || !employee) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm flex items-center justify-end z-50">
      {/* Backdrop closer */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer content */}
      <div className="relative bg-slate-900 w-full max-w-lg h-full shadow-2xl flex flex-col z-10 animate-slide-in border-l border-slate-850">
        
        {/* Header bar */}
        <div className="px-6 py-5 border-b border-slate-850 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-800 text-slate-300 font-bold px-2.5 py-1 rounded-full font-mono">
              ID: {employee.id} (No. {employee.globalNo})
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Cetak Profil"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onEdit(employee)}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Details Dossier (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 print-profile">
          {/* Header Name & Job Title */}
          <div className="space-y-1.5 pb-2">
            <h2 className="text-2xl font-bold text-white font-heading tracking-tight leading-tight">
              {employee.name}
            </h2>
            <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-sm">
              <Briefcase className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{employee.position}</span>
            </div>
            <div className="pt-2 flex flex-wrap gap-1.5">
              <span className="text-xs bg-slate-950 font-bold text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-800">
                {employee.department}
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                employee.status === 'PKWTT' 
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                STATUS: {employee.status}
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                employee.isLocal 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {employee.isLocal ? 'Lokal' : 'Non Lokal'}
              </span>
            </div>
          </div>

          <hr className="border-slate-850" />

          {/* Dossier sections */}
          <div className="space-y-5">
            {/* 1. DATA KEPEGAWAIAN */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Clipboard className="w-3.5 h-3.5" />
                <span>INFORMASI KEPEGAWAIAN</span>
              </h3>
              
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold uppercase">Mulai Kerja</span>
                    <strong className="text-sm text-white">{employee.startDate || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold uppercase">Masa Kerja (Tenure)</span>
                    <strong className="text-sm text-emerald-400 font-bold">{tenureStr}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold uppercase">Ruang Gaji / Golongan</span>
                    <strong className="text-sm text-white font-mono">{employee.salaryGrade || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold uppercase">Nomor Dep. Kerja</span>
                    <strong className="text-sm text-white font-mono">{employee.deptNo || '-'}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-800/40">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold uppercase">Akhir Kontrak (PKWT)</span>
                    <strong className={`text-sm ${employee.contractEndDate ? 'text-indigo-400 font-bold' : 'text-slate-400 font-medium'}`}>
                      {employee.contractEndDate || '-'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold uppercase">Jatuh Tempo Cuti</span>
                    <strong className={`text-sm ${employee.leaveExpiryDate ? 'text-amber-400 font-bold' : 'text-slate-400 font-medium'}`}>
                      {employee.leaveExpiryDate || '-'}
                    </strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/40 space-y-1.5">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">Status Pelaksanaan Cuti Roster</span>
                  <div>
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      employee.rosterDecision === 'postponed'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : employee.rosterDecision === 'annual'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                        : employee.rosterDecision === 'special'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {employee.rosterDecision === 'postponed' && `⏳ Menunda Cuti (${employee.postponedWeeks !== undefined ? employee.postponedWeeks : 2} Minggu)`}
                      {employee.rosterDecision === 'annual' && `🌴 Cuti Tahunan (${employee.annualLeaveDuration !== undefined ? employee.annualLeaveDuration : 12} Hari)`}
                      {employee.rosterDecision === 'special' && `🌟 Cuti Keperluan / Khusus (${employee.specialLeaveReason || 'Melahirkan'} - ${employee.specialLeaveDuration !== undefined ? employee.specialLeaveDuration : 3} Hari)`}
                      {(!employee.rosterDecision || employee.rosterDecision === 'normal') && '📅 Tepat Waktu (Siklus 8:2)'}
                    </span>
                  </div>
                  {employee.rosterDecision === 'postponed' && employee.postponedNotes && (
                    <div className="text-[10px] text-amber-400/90 italic mt-1 font-medium bg-amber-500/[0.02] border border-amber-500/10 p-1.5 rounded">
                      Catatan: "{employee.postponedNotes}"
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. IDENTITAS PRIBADI */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>IDENTITAS PRIBADI & DEMOGRAFI</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 pl-1">
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">( N I K )</span>
                  <strong className="text-sm text-white font-mono">{employee.nik || '-'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">Jenis Kelamin</span>
                  <strong className="text-sm text-white">{employee.gender || '-'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">Tanggal Lahir</span>
                  <strong className="text-sm text-white">{employee.birthDate || '-'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">USIA</span>
                  <strong className="text-sm text-white">{employee.age || '-'}</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">ALAMAT</span>
                  <p className="text-sm text-slate-300 font-medium leading-relaxed mt-0.5">{employee.address || '-'}</p>
                </div>
              </div>
            </div>

            {/* 3. KONTAK & PENDIDIKAN */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>KONTAK & PENDIDIKAN</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 pl-1">
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">Nomor HP</span>
                  <strong className="text-sm text-white font-mono flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{employee.phone || '-'}</span>
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">Pendidikan</span>
                  <strong className="text-sm text-white">{employee.education || '-'}</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">Sertfikasi</span>
                  {employee.certification ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {employee.certification.split(',').map((cert, index) => (
                        <span key={index} className="bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 text-xs px-2 py-0.5 rounded">
                          {cert.trim()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <strong className="text-sm text-slate-500 font-medium">-</strong>
                  )}
                </div>
              </div>
            </div>

            {/* UANG KOMPENSASI PKWT */}
            {employee.status === 'PKWT' && compDetails && (
              <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                <h3 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  <span>Uang Kompensasi PKWT (PP No. 35/2021)</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 block font-semibold uppercase">Dasar Perhitungan Gaji</span>
                    <strong className="text-white block mt-0.5 font-mono">
                      Rp {compDetails.wageBase.toLocaleString('id-ID')}
                    </strong>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      Pokok: Rp {compDetails.basicWage.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      Tetap: Rp {compDetails.fixedAllowance.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 block font-semibold uppercase">Masa Kerja PKWT Kontrak</span>
                    <strong className="text-white block mt-0.5">
                      {compDetails.totalMonths.toFixed(1)} Bulan
                    </strong>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      Total Hari: {compDetails.totalDays} Hari
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      Akhir Kontrak: {employee.contractEndDate}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 block font-semibold uppercase">Masa Kerja Berjalan</span>
                    <strong className="text-white block mt-0.5">
                      {compDetails.accruedMonths.toFixed(1)} Bulan
                    </strong>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      Total Hari: {compDetails.accruedDays} Hari
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      Mulai Kerja: {employee.startDate}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-amber-500 font-bold block uppercase">Kompensasi Terutang (UU)</span>
                    <strong className="text-amber-400 block mt-0.5 text-sm font-black font-mono">
                      Rp {compDetails.accruedCompensation.toLocaleString('id-ID')}
                    </strong>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      Proyeksi Selesai Kontrak:
                    </span>
                    <span className="text-[9.5px] font-bold text-slate-300 font-mono">
                      Rp {compDetails.projectedCompensation.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="text-[9.5px] text-slate-500 leading-normal border-t border-slate-850/60 pt-2.5 flex items-start gap-1">
                  <span className="text-amber-500">ℹ️</span>
                  <span>
                    Berdasarkan PP 35/2021, kompensasi dihitung secara proporsional: <strong>(Masa Kerja / 12) * 1 Bulan Upah (Pokok + Tunjangan Tetap)</strong> yang dibayarkan saat berakhirnya masa kontrak PKWT.
                  </span>
                </div>
              </div>
            )}

            {/* 4. BENEFIT JAMINAN SOSIAL */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                <span>REKONSILIASI JAMINAN SOSIAL (BPJS)</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* BPJS TK */}
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">No BPJS TK</span>
                  <strong className="text-sm text-white font-mono block mt-1">{employee.bpjsTk || '-'}</strong>
                  {isBpjsRegistered(employee.bpjsTk) ? (
                    <span className="inline-block text-[9px] font-bold text-emerald-450 mt-1">Terdaftar Aktif</span>
                  ) : (
                    <span className="inline-block text-[9px] font-bold text-slate-500 mt-1">Belum Terdaftar</span>
                  )}
                </div>

                {/* BPJS KESEHATAN */}
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">No BPJS KESEHATAN</span>
                  <strong className="text-sm text-white font-mono block mt-1">{employee.bpjsKes || '-'}</strong>
                  {isBpjsRegistered(employee.bpjsKes) ? (
                    <span className="inline-block text-[9px] font-bold text-emerald-450 mt-1">Terdaftar Aktif</span>
                  ) : (
                    <span className="inline-block text-[9px] font-bold text-slate-500 mt-1">Belum Terdaftar</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-850 flex items-center justify-between">
          <button 
            onClick={() => onDelete(employee.id)}
            className="px-4 py-2 hover:bg-rose-500/10 text-rose-400 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Karyawan</span>
          </button>
          
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Tutup Berkas
          </button>
        </div>

      </div>
    </div>
  );
}
