import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { X, Save, AlertCircle } from 'lucide-react';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employeeData: Partial<Employee>) => Promise<void>;
  employee: Employee | null; // Null if adding new
  departments: string[];
}

export default function EmployeeFormModal({
  isOpen,
  onClose,
  onSave,
  employee,
  departments
}: EmployeeFormModalProps) {
  // Local state for all fields
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [nik, setNik] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [startDate, setStartDate] = useState('');
  const [education, setEducation] = useState('');
  const [certification, setCertification] = useState('');
  const [salaryGrade, setSalaryGrade] = useState('');
  const [wage, setWage] = useState('');
  const [bpjsTk, setBpjsTk] = useState('');
  const [bpjsKes, setBpjsKes] = useState('');
  const [status, setStatus] = useState<'PKWT' | 'PKWTT'>('PKWT');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isLocal, setIsLocal] = useState(true);
  const [contractEndDate, setContractEndDate] = useState('');
  const [leaveExpiryDate, setLeaveExpiryDate] = useState('');
  const [rosterDecision, setRosterDecision] = useState<'normal' | 'postponed' | 'annual' | 'special'>('normal');
  const [postponedWeeks, setPostponedWeeks] = useState<number>(2);
  const [postponedNotes, setPostponedNotes] = useState<string>('');
  const [annualLeaveDuration, setAnnualLeaveDuration] = useState<number>(12);
  const [specialLeaveDuration, setSpecialLeaveDuration] = useState<number>(3);
  const [specialLeaveReason, setSpecialLeaveReason] = useState<string>('Melahirkan');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form fields when opening modal or editing employee
  useEffect(() => {
    if (isOpen) {
      if (employee) {
        // Edit mode
        setName(employee.name || '');
        setPosition(employee.position || '');
        setDepartment(employee.department || '');
        setNik(employee.nik || '');
        setBirthDate(employee.birthDate || '');
        setAge(employee.age !== undefined && employee.age !== null ? String(employee.age) : '');
        setGender(employee.gender || 'Laki-laki');
        setStartDate(employee.startDate || '');
        setEducation(employee.education || '');
        setCertification(employee.certification || '');
        setSalaryGrade(employee.salaryGrade || '');
        setWage(employee.wage !== undefined && employee.wage !== null ? String(employee.wage) : '');
        setBpjsTk(employee.bpjsTk !== undefined && employee.bpjsTk !== null ? String(employee.bpjsTk) : '');
        setBpjsKes(employee.bpjsKes !== undefined && employee.bpjsKes !== null ? String(employee.bpjsKes) : '');
        setStatus(employee.status || 'PKWT');
        setAddress(employee.address || '');
        setPhone(employee.phone || '');
        setIsLocal(employee.isLocal);
        setContractEndDate(employee.contractEndDate || '');
        setLeaveExpiryDate(employee.leaveExpiryDate || '');
        setRosterDecision(employee.rosterDecision || 'normal');
        setPostponedWeeks(employee.postponedWeeks !== undefined ? employee.postponedWeeks : 2);
        setPostponedNotes(employee.postponedNotes || '');
        setAnnualLeaveDuration(employee.annualLeaveDuration !== undefined ? employee.annualLeaveDuration : 12);
        setSpecialLeaveDuration(employee.specialLeaveDuration !== undefined ? employee.specialLeaveDuration : 3);
        setSpecialLeaveReason(employee.specialLeaveReason || 'Melahirkan');
      } else {
        // Add mode
        setName('');
        setPosition('');
        setDepartment(departments[0] || 'MANAGEMENT');
        setNik('');
        setBirthDate('');
        setAge('');
        setGender('Laki-laki');
        setStartDate('');
        setEducation('');
        setCertification('');
        setSalaryGrade('');
        setWage('');
        setBpjsTk('');
        setBpjsKes('');
        setStatus('PKWT');
        setAddress('');
        setPhone('');
        setIsLocal(true);
        setContractEndDate('');
        setLeaveExpiryDate('');
        setRosterDecision('normal');
        setPostponedWeeks(2);
        setPostponedNotes('');
        setAnnualLeaveDuration(12);
        setSpecialLeaveDuration(3);
        setSpecialLeaveReason('Melahirkan');
      }
      setErrorMsg('');
    }
  }, [isOpen, employee, departments]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Field Validations
    if (!name.trim()) {
      setErrorMsg('Nama Tenaga Kerja wajib diisi!');
      return;
    }
    if (!position.trim()) {
      setErrorMsg('Jabatan wajib diisi!');
      return;
    }
    if (!department.trim()) {
      setErrorMsg('Bagian / Departemen wajib diisi!');
      return;
    }
    if (nik && nik.length !== 16) {
      setErrorMsg('NIK harus terdiri dari 16 digit angka!');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Nomor HP wajib diisi!');
      return;
    }

    // Auto calculate age string from input number if they just typed a number like "30"
    let finalAge = age;
    if (age && !age.toLowerCase().includes('tahun')) {
      finalAge = `${age.trim()} Tahun`;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Employee> = {
        name: name.trim(),
        position: position.trim(),
        department: department,
        nik: nik.trim(),
        birthDate: birthDate.trim(),
        age: finalAge.trim(),
        gender: gender,
        startDate: startDate.trim(),
        education: education.trim(),
        certification: certification.trim(),
        salaryGrade: salaryGrade.trim(),
        wage: wage.trim(),
        bpjsTk: bpjsTk.trim(),
        bpjsKes: bpjsKes.trim(),
        status: status,
        address: address.trim(),
        phone: phone.trim(),
        isLocal: isLocal,
        isNonLocal: !isLocal,
        contractEndDate: contractEndDate.trim(),
        leaveExpiryDate: leaveExpiryDate.trim(),
        rosterDecision: rosterDecision,
        postponedWeeks: postponedWeeks,
        postponedNotes: postponedNotes.trim(),
        annualLeaveDuration: annualLeaveDuration,
        specialLeaveDuration: specialLeaveDuration,
        specialLeaveReason: specialLeaveReason.trim()
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data karyawan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl w-full max-w-4xl shadow-xl border border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-850 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white font-heading">
            {employee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: Data Utama */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Identitas & Jabatan Utama</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Tenaga Kerja *</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: M. Ayi Djumarna, ST"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all"
                  required
                />
              </div>

              {/* NIK */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">( N I K ) (16 Digit)</label>
                <input 
                  type="text" 
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, '').substring(0, 16))}
                  placeholder="Contoh: 3271062704510001"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all font-mono"
                />
              </div>

              {/* Jabatan */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Jabatan *</label>
                <input 
                  type="text" 
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Contoh: Site Manager"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all"
                  required
                />
              </div>

              {/* Departemen / Bagian */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Bagian / Departemen *</label>
                <select 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all [&_option]:bg-slate-900 [&_option]:text-slate-300"
                >
                  {departments.map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <hr className="border-slate-850" />

          {/* Section 2: Data Kepegawaian */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Hubungan Kerja & Tanggal</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">STATUS</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'PKWT' | 'PKWTT')}
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all [&_option]:bg-slate-900 [&_option]:text-slate-300"
                >
                  <option value="PKWT">PKWT</option>
                  <option value="PKWTT">PKWTT</option>
                </select>
              </div>

              {/* Kategori Lokal */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Domisili</label>
                <select 
                  value={isLocal ? 'Lokal' : 'Non Lokal'}
                  onChange={(e) => setIsLocal(e.target.value === 'Lokal')}
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all [&_option]:bg-slate-900 [&_option]:text-slate-300"
                >
                  <option value="Lokal">Lokal</option>
                  <option value="Non Lokal">Non Lokal</option>
                </select>
              </div>

              {/* Mulai Kerja */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mulai Kerja</label>
                <input 
                  type="text" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Contoh: 02-Nov-2021"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all"
                />
              </div>

              {/* Ruang Gaji */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Ruang Gaji</label>
                <input 
                  type="text" 
                  value={salaryGrade}
                  onChange={(e) => setSalaryGrade(e.target.value)}
                  placeholder="Contoh: I/15/3"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all"
                />
              </div>

              {/* Upah* */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Upah*</label>
                <input 
                  type="text" 
                  value={wage}
                  onChange={(e) => setWage(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 5500000"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all font-mono"
                />
              </div>

              {/* Tanggal Akhir Kontrak */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tanggal Akhir Kontrak</label>
                <input 
                  type="text" 
                  value={contractEndDate}
                  onChange={(e) => setContractEndDate(e.target.value)}
                  placeholder="Contoh: 02-Nov-2022"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all"
                />
              </div>

              {/* Jatuh Tempo Cuti */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Jatuh Tempo Cuti</label>
                <input 
                  type="text" 
                  value={leaveExpiryDate}
                  onChange={(e) => setLeaveExpiryDate(e.target.value)}
                  placeholder="Contoh: 31-Des-2026"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all"
                />
              </div>

              {/* Keputusan Pelaksanaan Cuti Roster */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">Keputusan Pelaksanaan Cuti Roster</label>
                <select 
                  value={rosterDecision}
                  onChange={(e) => setRosterDecision(e.target.value as any)}
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all [&_option]:bg-slate-900 [&_option]:text-slate-300"
                >
                  <option value="normal">📅 Tepat Waktu (Sesuai Siklus 8:2)</option>
                  <option value="postponed">⏳ Menunda Cuti (Maju 2 Minggu Siklus Berikutnya)</option>
                  <option value="annual">🌴 Cuti Tahunan (Pelaksanaan 12 Hari)</option>
                  <option value="special">🌟 Cuti Keperluan / Khusus (Melahirkan, Duka, dll)</option>
                </select>
              </div>

              {/* Conditional Edit Menus */}
              {rosterDecision === 'postponed' && (
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-400 mb-1">Durasi Penundaan (Minggu)</label>
                    <input 
                      type="number" 
                      value={postponedWeeks}
                      min={1}
                      max={8}
                      onChange={(e) => setPostponedWeeks(parseInt(e.target.value) || 2)}
                      className="w-full bg-slate-950 px-3 py-1.5 text-xs border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-400 mb-1">Catatan / Alasan Penundaan</label>
                    <input 
                      type="text" 
                      value={postponedNotes}
                      placeholder="Contoh: Kebutuhan operasional lapangan"
                      onChange={(e) => setPostponedNotes(e.target.value)}
                      className="w-full bg-slate-950 px-3 py-1.5 text-xs border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {rosterDecision === 'annual' && (
                <div className="sm:col-span-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                  <label className="block text-[11px] font-bold text-sky-400 mb-1">Durasi Pelaksanaan Cuti Tahunan (Hari)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      value={annualLeaveDuration}
                      min={1}
                      max={30}
                      onChange={(e) => setAnnualLeaveDuration(parseInt(e.target.value) || 12)}
                      className="w-32 bg-slate-950 px-3 py-1.5 text-xs border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-[11px] text-slate-400 leading-none">Standar pelaksanaan hak cuti tahunan adalah selama 12 hari kerja.</span>
                  </div>
                </div>
              )}

              {rosterDecision === 'special' && (
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                  <div>
                    <label className="block text-[11px] font-bold text-purple-400 mb-1">Alasan / Jenis Cuti Khusus</label>
                    <select 
                      value={specialLeaveReason}
                      onChange={(e) => setSpecialLeaveReason(e.target.value)}
                      className="w-full bg-slate-950 px-3 py-1.5 text-xs border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all [&_option]:bg-slate-900"
                    >
                      <option value="Melahirkan">🤰 Melahirkan</option>
                      <option value="Duka">🕯️ Berita Duka / Kemalangan</option>
                      <option value="Mendesak">🚨 Keperluan Mendesak</option>
                      <option value="Pernikahan">💍 Pernikahan</option>
                      <option value="Lain-lain">📝 Lain-lain / Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-purple-400 mb-1">Lama Pelaksanaan (Hari - Maksimal 3 Hari)</label>
                    <input 
                      type="number" 
                      value={specialLeaveDuration}
                      min={1}
                      max={3}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 3;
                        setSpecialLeaveDuration(Math.min(3, Math.max(1, val)));
                      }}
                      className="w-full bg-slate-950 px-3 py-1.5 text-xs border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <hr className="border-slate-850" />

          {/* Section 3: Data Demografi & Kontak */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Informasi Kontak & Demografi</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tanggal Lahir */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tanggal Lahir</label>
                <input 
                  type="text" 
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  placeholder="Contoh: 17-Jan-1987"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all"
                />
              </div>

              {/* Usia */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">USIA (Tahun)</label>
                <input 
                  type="text" 
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 39"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all"
                />
              </div>

              {/* Jenis Kelamin */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Jenis Kelamin</label>
                <div className="flex gap-4 pt-1.5">
                  <label className="inline-flex items-center text-sm font-semibold text-slate-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="gender" 
                      value="Laki-laki" 
                      checked={gender === 'Laki-laki'}
                      onChange={() => setGender('Laki-laki')}
                      className="mr-2 text-blue-500 focus:ring-blue-500"
                    />
                    Laki-Laki
                  </label>
                  <label className="inline-flex items-center text-sm font-semibold text-slate-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="gender" 
                      value="Perempuan" 
                      checked={gender === 'Perempuan'}
                      onChange={() => setGender('Perempuan')}
                      className="mr-2 text-blue-500 focus:ring-blue-500"
                    />
                    Perempuan
                  </label>
                </div>
              </div>

              {/* Nomor HP */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nomor HP *</label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all font-mono"
                  required
                />
              </div>

              {/* Pendidikan Terakhir */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Pendidikan</label>
                <input 
                  type="text" 
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="Contoh: S1 Geologi"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all"
                />
              </div>

              {/* Sertifikasi */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Sertfikasi</label>
                <input 
                  type="text" 
                  value={certification}
                  onChange={(e) => setCertification(e.target.value)}
                  placeholder="Contoh: POP, POM, K3"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all"
                />
              </div>
            </div>

            {/* Alamat Lengkap */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">ALAMAT</label>
              <textarea 
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: BTN Kendari Permai Blok Y2 No. 9 RT. 013/004 Kel. Padaleu, Kec. Kambu Kota Kendari"
                className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all resize-none"
              />
            </div>
          </div>

          <hr className="border-slate-850" />

          {/* Section 4: BPJS Identitas */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jaminan BPJS Sosial</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* BPJS TK */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">No BPJS TK</label>
                <input 
                  type="text" 
                  value={bpjsTk}
                  onChange={(e) => setBpjsTk(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 18068854373"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all font-mono"
                />
              </div>

              {/* BPJS KESEHATAN */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">No BPJS KESEHATAN</label>
                <input 
                  type="text" 
                  value={bpjsKes}
                  onChange={(e) => setBpjsKes(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 0002142466615"
                  className="w-full bg-slate-950 px-3 py-2 text-sm border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-950 transition-all font-mono"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-850 flex items-center justify-end gap-3 rounded-b-2xl">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Batal
          </button>
          
          <button 
            type="button" 
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Data'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
