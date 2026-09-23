import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Ship, 
  Truck, 
  Activity, 
  Compass, 
  Layers, 
  HelpCircle, 
  Plus, 
  Check, 
  DollarSign, 
  Info,
  ChevronRight
} from 'lucide-react';

interface SektorFormulasProps {
  onAddIncentiveLog: (log: {
    employeeName: string;
    employeeId: string;
    department: string;
    incentiveType: 'produksi' | 'kerajinan' | 'lapangan' | 'khusus';
    amount: number;
    description: string;
  }) => void;
  onAddOvertimeLog?: (log: {
    employeeName: string;
    employeeId: string;
    department: string;
    date: string;
    hours: number;
    multiplier: number;
    reason: string;
  }) => void;
}

export default function SektorFormulas({ onAddIncentiveLog, onAddOvertimeLog }: SektorFormulasProps) {
  const [activeSubTab, setActiveSubTab] = useState<'rit-speed' | 'rit-lv' | 'drilling' | 'hm-bayar' | 'ret-hino'>('rit-speed');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Common metadata
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  // 1. Rit Speed state
  const [ritSpeedLokasi, setRitSpeedLokasi] = useState('Tapuhaka');
  const [ritAtas, setRitAtas] = useState(0);
  const [tarifAtas, setTarifAtas] = useState(50000);
  const [ritBawah, setRitBawah] = useState(0);
  const [tarifBawah, setTarifBawah] = useState(60000);
  const [lemburKapal, setLemburKapal] = useState(0);
  const [hariRayaKapal, setHariRayaKapal] = useState(0);

  // 2. Rit LV state
  const [jalurLv, setJalurLv] = useState<'Bombana' | 'Asera' | 'Torobulu'>('Bombana');
  const [ritLvCount, setRitLvCount] = useState(0);
  const [tambahanLv, setTambahanLv] = useState(0);

  // 3. Drilling state
  const [meterBor, setMeterBor] = useState(0);
  const [rateBor, setRateBor] = useState(25000);
  const [meterMoving, setMeterMoving] = useState(0);
  const [volumeProd, setVolumeProd] = useState(0);
  const [coeffProd, setCoeffProd] = useState(4500);
  const [bonusDrill, setBonusDrill] = useState(0);

  // 4. HM Bayar state
  const [jenisHM, setJenisHM] = useState('Produksi');
  const [regHours, setRegHours] = useState(0);
  const [regRate, setRegRate] = useState(35000);
  const [otHours, setOtHours] = useState(0);
  const [otRate, setOtRate] = useState(52500);

  // 5. Ret Hino & Suny state
  const [jarakRet, setJarakRet] = useState('1-3 km');
  const [retCount, setRetCount] = useState(0);
  const [ratePerRet, setRatePerRet] = useState(15000);
  const [otRetCount, setOtRetCount] = useState(0);
  const [otRatePerRet, setOtRatePerRet] = useState(22000);

  // Auto-fill defaults when locations or routes change
  useEffect(() => {
    if (activeSubTab === 'rit-speed') {
      if (ritSpeedLokasi === 'Tapuhaka') {
        setTarifAtas(50000);
        setTarifBawah(60000);
      } else if (ritSpeedLokasi === 'Kokoe') {
        setTarifAtas(8000);
        setTarifBawah(10000);
      } else if (ritSpeedLokasi === 'Mawasangka') {
        setTarifAtas(50000);
        setTarifBawah(60000);
      } else {
        setTarifAtas(45000);
        setTarifBawah(55000);
      }
    }
  }, [ritSpeedLokasi, activeSubTab]);

  useEffect(() => {
    // Reset meta on sub-tab switch to make forms clean, but provide placeholder suggestion
    if (!employeeName) {
      if (activeSubTab === 'rit-speed') {
        setEmployeeId('EMP-KNL-08');
        setEmployeeName('Nurdin (Nahkoda)');
      } else if (activeSubTab === 'rit-lv') {
        setEmployeeId('EMP-DRV-12');
        setEmployeeName('Budi Hartono');
      } else if (activeSubTab === 'drilling') {
        setEmployeeId('EMP-DRL-03');
        setEmployeeName('Syarifuddin');
      } else if (activeSubTab === 'hm-bayar') {
        setEmployeeId('EMP-OPR-44');
        setEmployeeName('Hendra Setiawan');
      } else if (activeSubTab === 'ret-hino') {
        setEmployeeId('EMP-DT-90');
        setEmployeeName('Ahmad Yani');
      }
    }
  }, [activeSubTab]);

  // Calculations
  const calcRitSpeed = () => {
    const insentifLokasi = (ritAtas * tarifAtas) + (ritBawah * tarifBawah);
    const total = insentifLokasi + lemburKapal + hariRayaKapal;
    // Round to nearest thousands as requested: "Dibulatkan ke ribuan terdekat"
    return Math.round(total / 1000) * 1000;
  };

  const calcRitLv = () => {
    const rates = { Bombana: 70000, Asera: 50000, Torobulu: 40000 };
    const base = ritLvCount * rates[jalurLv];
    const total = base + tambahanLv;
    return Math.round(total / 1000) * 1000;
  };

  const calcDrilling = () => {
    const baseBor = meterBor * rateBor;
    const baseMoving = meterMoving * 3500; // Fixed rate per meter moving
    const baseProd = volumeProd * coeffProd;
    const total = baseBor + baseMoving + baseProd + bonusDrill;
    return Math.round(total / 1000) * 1000;
  };

  const calcHMBayar = () => {
    const total = (regHours * regRate) + (otHours * otRate);
    return Math.round(total / 1000) * 1000;
  };

  const calcRetHino = () => {
    const total = (retCount * ratePerRet) + (otRetCount * otRatePerRet);
    return Math.round(total / 1000) * 1000;
  };

  const triggerSuccess = (message: string) => {
    setSuccessMsg(message);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  const handleSubmitLog = () => {
    const name = employeeName.trim() || 'Karyawan Lapangan';
    const idNum = employeeId.trim() || 'EMP-GEN-99';
    
    let amount = 0;
    let description = '';
    let dept = '';

    if (activeSubTab === 'rit-speed') {
      amount = calcRitSpeed();
      dept = 'Kru Kapal / Tugboat';
      description = `Rit Speed Kapal (${ritSpeedLokasi}): Rit Atas = ${ritAtas} (@Rp${tarifAtas.toLocaleString('id-ID')}), Rit Bawah = ${ritBawah} (@Rp${tarifBawah.toLocaleString('id-ID')}). Lembur Kapal: Rp${lemburKapal.toLocaleString('id-ID')}, THR: Rp${hariRayaKapal.toLocaleString('id-ID')}. (Dibulatkan)`;
    } else if (activeSubTab === 'rit-lv') {
      amount = calcRitLv();
      dept = 'Driver LV';
      const rate = jalurLv === 'Bombana' ? 70000 : jalurLv === 'Asera' ? 50000 : 40000;
      description = `Rit LV KDI (${jalurLv}): ${ritLvCount} Rit x Rp${rate.toLocaleString('id-ID')} + Tambahan Rp${tambahanLv.toLocaleString('id-ID')}. (Dibulatkan)`;
    } else if (activeSubTab === 'drilling') {
      amount = calcDrilling();
      dept = 'Drilling & Blasting';
      description = `Drilling & Moving: Meter Bor = ${meterBor}m (@Rp${rateBor.toLocaleString('id-ID')}), Moving = ${meterMoving}m (@Rp3.500), Volume Produksi = ${volumeProd}m³ (@Rp${coeffProd.toLocaleString('id-ID')}). Bonus: Rp${bonusDrill.toLocaleString('id-ID')}. (Dibulatkan)`;
    } else if (activeSubTab === 'hm-bayar') {
      amount = calcHMBayar();
      dept = 'Operator Alat Berat';
      description = `HM Bayar (${jenisHM}): Reg = ${regHours} jam (@Rp${regRate.toLocaleString('id-ID')}), Lembur = ${otHours} jam (@Rp${otRate.toLocaleString('id-ID')}). (Dibulatkan)`;
    } else if (activeSubTab === 'ret-hino') {
      amount = calcRetHino();
      dept = 'Driver Dump Truck';
      description = `Ret Hino & Suny (${jarakRet}): Reg Ret = ${retCount} (@Rp${ratePerRet.toLocaleString('id-ID')}), OT Ret = ${otRetCount} (@Rp${otRatePerRet.toLocaleString('id-ID')}). (Dibulatkan)`;
    }

    onAddIncentiveLog({
      employeeName: name,
      employeeId: idNum,
      department: dept,
      incentiveType: 'lapangan',
      amount,
      description
    });

    triggerSuccess(`Berhasil menghitung & mengirim insentif Rp ${amount.toLocaleString('id-ID')} untuk ${name} ke Log Insentif.`);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="formulasi-sektor-container">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
                <Calculator className="w-5 h-5" />
              </span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-heading">Kalkulator Formulasi Sektor Operasional</h2>
            </div>
            <p className="text-xs text-slate-400">
              Formulasi otomatis hitung premi, insentif, ritase, drilling, dan jam kerja alat berat sesuai dengan ketentuan site One For All.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-teal-400 font-mono bg-teal-500/10 border border-teal-500/20 px-2 py-1 rounded">
              Bulat Otomatis ke Ribuan (Rupiah)
            </span>
          </div>
        </div>
      </div>

      {/* SECTOR TABS SELECTION */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2" id="sector-tabs">
        <button
          onClick={() => setActiveSubTab('rit-speed')}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'rit-speed'
              ? 'bg-gradient-to-b from-teal-950/40 to-slate-950 border-teal-500 text-teal-400 shadow-md shadow-teal-950/20'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Ship className="w-5 h-5" />
          <span className="text-[11px] font-bold text-center">Rit Speed (Kapal)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('rit-lv')}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'rit-lv'
              ? 'bg-gradient-to-b from-teal-950/40 to-slate-950 border-teal-500 text-teal-400 shadow-md shadow-teal-950/20'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Truck className="w-5 h-5" />
          <span className="text-[11px] font-bold text-center">Rit LV KDI</span>
        </button>

        <button
          onClick={() => setActiveSubTab('drilling')}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'drilling'
              ? 'bg-gradient-to-b from-teal-950/40 to-slate-950 border-teal-500 text-teal-400 shadow-md shadow-teal-950/20'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[11px] font-bold text-center">Drilling &amp; Moving</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hm-bayar')}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'hm-bayar'
              ? 'bg-gradient-to-b from-teal-950/40 to-slate-950 border-teal-500 text-teal-400 shadow-md shadow-teal-950/20'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[11px] font-bold text-center">HM Bayar (Operator)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ret-hino')}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'ret-hino'
              ? 'bg-gradient-to-b from-teal-950/40 to-slate-950 border-teal-500 text-teal-400 shadow-md shadow-teal-950/20'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[11px] font-bold text-center">Ret Hino &amp; Suny</span>
        </button>
      </div>

      {/* NOTIFICATION FEEDBACK */}
      {successMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* MAIN WORKSPACE SPLIT PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* INPUT FORM PANEL (2 COLS on desktop) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          
          {/* Section Heading */}
          <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {activeSubTab === 'rit-speed' && 'Formulir Kru Kapal / Nahkoda'}
              {activeSubTab === 'rit-lv' && 'Formulir Driver LV KDI'}
              {activeSubTab === 'drilling' && 'Formulir Drilling & Moving'}
              {activeSubTab === 'hm-bayar' && 'Formulir Operator Alat Berat (HM Bayar)'}
              {activeSubTab === 'ret-hino' && 'Formulir Driver Dump Truck Hino/Suny'}
            </span>
            <span className="text-[10px] text-slate-500">Isi data lapangan</span>
          </div>

          {/* Metadata inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nama Karyawan</label>
              <input
                type="text"
                placeholder="cth: Nurdin, Budi, Ahmad"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ID Karyawan (NIP/NIK)</label>
              <input
                type="text"
                placeholder="cth: EMP-KNL-08"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* DYNAMIC SUB-TAB FIELDS */}
          
          {/* 1. RIT SPEED (船) */}
          {activeSubTab === 'rit-speed' && (
            <div className="space-y-4 animate-fade-in" id="subform-rit-speed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Jalur Lokasi Tujuan</label>
                  <select
                    value={ritSpeedLokasi}
                    onChange={(e) => setRitSpeedLokasi(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 [&_option]:bg-slate-900"
                  >
                    <option value="Tapuhaka">Tapuhaka (Atas: 50k, Bawah: 60k)</option>
                    <option value="Kokoe">Kokoe (Atas: 8k, Bawah: 10k)</option>
                    <option value="Mawasangka">Mawasangka (Atas: 50k, Bawah: 60k)</option>
                    <option value="Telaga">Telaga (Custom Tarif)</option>
                    <option value="Pununu">Pununu (Custom Tarif)</option>
                    <option value="Ponkalero">Ponkalero (Custom Tarif)</option>
                    <option value="Batu Awu">Batu Awu (Custom Tarif)</option>
                  </select>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Rumus Lokasi:</span>
                  <span className="text-[11px] font-mono text-teal-400 mt-1 block">
                    (Rit A × Tarif Atas) + (Rit A × Tarif Bawah)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Kategori Jalur Atas</h4>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Jumlah Ritase Atas</label>
                    <input
                      type="number"
                      value={ritAtas}
                      onChange={(e) => setRitAtas(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-mono">Tarif Atas (Rp)</label>
                    <input
                      type="number"
                      value={tarifAtas}
                      onChange={(e) => setTarifAtas(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Kategori Jalur Bawah</h4>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Jumlah Ritase Bawah</label>
                    <input
                      type="number"
                      value={ritBawah}
                      onChange={(e) => setRitBawah(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-mono">Tarif Bawah (Rp)</label>
                    <input
                      type="number"
                      value={tarifBawah}
                      onChange={(e) => setTarifBawah(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Lembur Kapal Tambahan (Rp)</label>
                  <input
                    type="number"
                    placeholder="cth: 300000"
                    value={lemburKapal}
                    onChange={(e) => setLemburKapal(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Insentif Hari Raya / THR (Rp)</label>
                  <input
                    type="number"
                    placeholder="cth: 500000"
                    value={hariRayaKapal}
                    onChange={(e) => setHariRayaKapal(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. RIT LV KDI (车) */}
          {activeSubTab === 'rit-lv' && (
            <div className="space-y-4 animate-fade-in" id="subform-rit-lv">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rute Perjalanan LV KDI</label>
                  <select
                    value={jalurLv}
                    onChange={(e) => setJalurLv(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 [&_option]:bg-slate-900"
                  >
                    <option value="Bombana">Rute Bombana (Rp 70.000 / rit)</option>
                    <option value="Asera">Rute Asera (Rp 50.000 / rit)</option>
                    <option value="Torobulu">Rute Torobulu (Rp 40.000 / rit)</option>
                  </select>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Ketentuan Sektor LV KDI:</span>
                  <span className="text-[11px] font-mono text-teal-400 mt-1 block">
                    Bombana = Rp70k &bull; Asera = Rp50k &bull; Torobulu = Rp40k
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Jumlah Ritase Perjalanan</label>
                  <input
                    type="number"
                    value={ritLvCount}
                    onChange={(e) => setRitLvCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Uang Lembur Tambahan (Rp)</label>
                  <input
                    type="number"
                    value={tambahanLv}
                    onChange={(e) => setTambahanLv(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. DRILLING & MOVING (钻) */}
          {activeSubTab === 'drilling' && (
            <div className="space-y-4 animate-fade-in" id="subform-drilling">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Rumus Drilling:</span>
                  <span className="text-[11px] font-mono text-teal-400 mt-1 block">
                    (Meter Bor × Rate) + (Meter Moving × Rp3.500) + (Koef Produksi × Volume)
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Ketentuan Moving:</span>
                  <span className="text-[11px] font-mono text-amber-400 mt-1 block">
                    Rate Moving flat di Rp 3.500 per meter.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 space-y-2">
                  <span className="text-[10px] font-bold text-teal-400 uppercase block">1. Aktivitas Bor (Drilling)</span>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1">Kedalaman Meter Bor (m)</label>
                    <input
                      type="number"
                      value={meterBor}
                      onChange={(e) => setMeterBor(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1">Rate per Meter Bor (Rp)</label>
                    <input
                      type="number"
                      value={rateBor}
                      onChange={(e) => setRateBor(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 space-y-2">
                  <span className="text-[10px] font-bold text-teal-400 uppercase block">2. Mobilisasi Alat (Moving)</span>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1">Meter Moving (m)</label>
                    <input
                      type="number"
                      value={meterMoving}
                      onChange={(e) => setMeterMoving(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1">Moving Rate (MANDATORY)</label>
                    <div className="w-full bg-slate-950 border border-slate-800 text-slate-500 rounded-lg px-2.5 py-1 text-xs font-mono">
                      Rp 3.500 (Flat)
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 space-y-2">
                  <span className="text-[10px] font-bold text-teal-400 uppercase block">3. Koefisien Produksi</span>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1">Volume Produksi (m³)</label>
                    <input
                      type="number"
                      value={volumeProd}
                      onChange={(e) => setVolumeProd(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1">Tarif Produksi (Rp/m³)</label>
                    <input
                      type="number"
                      value={coeffProd}
                      onChange={(e) => setCoeffProd(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">Bonus Penyelarasan Drilling (Rp)</label>
                <input
                  type="number"
                  value={bonusDrill}
                  onChange={(e) => setBonusDrill(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          )}

          {/* 4. HM BAYAR (挖) */}
          {activeSubTab === 'hm-bayar' && (
            <div className="space-y-4 animate-fade-in" id="subform-hm-bayar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Jenis Aktivitas Operator</label>
                  <select
                    value={jenisHM}
                    onChange={(e) => {
                      const opt = e.target.value;
                      setJenisHM(opt);
                      if (opt === 'Produksi') {
                        setRegRate(35000);
                        setOtRate(52500);
                      } else if (opt === 'Pengapalan') {
                        setRegRate(40000);
                        setOtRate(60000);
                      } else {
                        setRegRate(45000);
                        setOtRate(67500);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 [&_option]:bg-slate-900"
                  >
                    <option value="Produksi">Produksi Alat (Reg: 35k, OT: 52.5k)</option>
                    <option value="Pengapalan">Pengapalan Tongkang (Reg: 40k, OT: 60k)</option>
                    <option value="Breaker / Khusus">Breaker &amp; Batu Awu (Reg: 45k, OT: 67.5k)</option>
                  </select>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block font-heading">Rumus Jam Kerja (Hour Meter):</span>
                  <span className="text-[11px] font-mono text-teal-400 mt-1 block">
                    (Jam Reguler × Rate Reg) + (Jam Lembur × Rate Lembur)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Jam Kerja Reguler (Reg Hours)</h4>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Total Jam Reguler (HM)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={regHours}
                      onChange={(e) => setRegHours(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Rate Reguler per Jam</label>
                    <input
                      type="number"
                      value={regRate}
                      onChange={(e) => setRegRate(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Jam Kerja Lembur (OT Hours)</h4>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Total Jam Lembur (HM)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={otHours}
                      onChange={(e) => setOtHours(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Rate Lembur per Jam</label>
                    <input
                      type="number"
                      value={otRate}
                      onChange={(e) => setOtRate(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. RET HINO & SUNY (卡) */}
          {activeSubTab === 'ret-hino' && (
            <div className="space-y-4 animate-fade-in" id="subform-ret-hino">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Jarak Angkut Dump Truck</label>
                  <select
                    value={jarakRet}
                    onChange={(e) => {
                      const val = e.target.value;
                      setJarakRet(val);
                      if (val === '1-3 km') {
                        setRatePerRet(15000);
                        setOtRatePerRet(22000);
                      } else {
                        setRatePerRet(25000);
                        setOtRatePerRet(35000);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 [&_option]:bg-slate-900"
                  >
                    <option value="1-3 km">Jarak Dekat (1-3 Km) - Tarif standar</option>
                    <option value="Diatas 3 km">Jarak Jauh (&gt;3 Km) - Tarif tinggi</option>
                  </select>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block font-heading">Rumus Shift Retase:</span>
                  <span className="text-[11px] font-mono text-teal-400 mt-1 block">
                    (Ret Siang × Rate Siang) + (Ret Malam × Rate Lembur)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Shift Siang (Reguler)</h4>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Jumlah Retase Siang</label>
                    <input
                      type="number"
                      value={retCount}
                      onChange={(e) => setRetCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Rate per Ret (Siang)</label>
                    <input
                      type="number"
                      value={ratePerRet}
                      onChange={(e) => setRatePerRet(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Shift Malam (Lembur / OT)</h4>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Jumlah Retase Malam</label>
                    <input
                      type="number"
                      value={otRetCount}
                      onChange={(e) => setOtRetCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Rate per Ret (Malam)</label>
                    <input
                      type="number"
                      value={otRatePerRet}
                      onChange={(e) => setOtRatePerRet(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* CALCULATION RESULT PANEL (1 COL on desktop) */}
        <div className="space-y-6">
          
          {/* Realtime Result Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[300px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hasil Perhitungan Real-time</span>
              
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Karyawan</span>
                  <span className="text-xs font-bold text-white font-mono">{employeeName || '(Belum diisi)'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">ID / NIK</span>
                  <span className="text-xs font-mono text-slate-400">{employeeId || '(Belum diisi)'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Sektor</span>
                  <span className="text-xs font-semibold text-teal-400">
                    {activeSubTab === 'rit-speed' && 'Kru Kapal (Rit Speed)'}
                    {activeSubTab === 'rit-lv' && 'Driver LV KDI'}
                    {activeSubTab === 'drilling' && 'Drilling & Blasting'}
                    {activeSubTab === 'hm-bayar' && 'Operator (HM Bayar)'}
                    {activeSubTab === 'ret-hino' && 'Driver Hino & Suny'}
                  </span>
                </div>
              </div>

              <div className="pt-4 text-center space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Total yang Dibayarkan</span>
                <div className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                  Rp {
                    (activeSubTab === 'rit-speed' ? calcRitSpeed() :
                     activeSubTab === 'rit-lv' ? calcRitLv() :
                     activeSubTab === 'drilling' ? calcDrilling() :
                     activeSubTab === 'hm-bayar' ? calcHMBayar() :
                     calcRetHino()).toLocaleString('id-ID')
                  }
                </div>
                <span className="text-[9px] text-slate-500 block italic">Dibulatkan otomatis ke ribuan terdekat</span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800/60 space-y-3">
              <button
                onClick={handleSubmitLog}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan ke Log Insentif</span>
              </button>
            </div>
          </div>

          {/* Quick Informational Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-200 font-bold uppercase tracking-wider text-[10px]">
              <Info className="w-4 h-4 text-teal-400" />
              <span>Ketentuan Operasional</span>
            </div>
            
            <p className="text-slate-400 leading-relaxed text-[11px]">
              {activeSubTab === 'rit-speed' && 'Berdasarkan log kapal penunjang, insentif dihitung per rute pelabuhan tujuan (A & B) dengan tarif masing-masing, ditambahkan lembur khusus kru kapal dan dibulatkan ke ribuan Rupiah.'}
              {activeSubTab === 'rit-lv' && 'Driver LV melayani rute khusus Bombana (70.000), Asera (50.000) dan Torobulu (40.000). Total insentif merupakan perkalian flat ritase ditambah bonus perjalanan.'}
              {activeSubTab === 'drilling' && 'Bagi pekerja Drilling, premi dihitung dari jumlah meter pengeboran aktual, ditambah flat Rp 3.500 per meter untuk pemindahan alat (moving) serta kontribusi volume produksi nickel.'}
              {activeSubTab === 'hm-bayar' && 'Operator alat berat dibayar berdasarkan Hour Meter (HM) kerja reguler dan lembur dikalikan dengan tarif aktivitas masing-masing.'}
              {activeSubTab === 'ret-hino' && 'Driver dump truck Hino dan Suny dibayar per ritase berdasarkan jarak angkut (dekat 1-3 km / jauh) serta dibedakan antara shift kerja siang dan shift malam.'}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
