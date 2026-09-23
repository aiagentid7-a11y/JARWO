import React, { useState, useEffect } from 'react';
import { Employee, IncidentReport, DepartmentSafetyCorrelation, BPJSClaimSummary, IncidentType, IncidentSeverity, BPJSClaimStatus } from '../types';
import { HardHat, AlertTriangle, ShieldAlert, Plus, X, RefreshCw, Activity, BadgeCheck, Clock, XCircle } from 'lucide-react';

interface PerformanceSafetyDashboardProps {
  employees: Employee[];
}

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  ringan: 'Ringan', sedang: 'Sedang', berat: 'Berat', fatal: 'Fatal'
};
const SEVERITY_COLOR: Record<IncidentSeverity, string> = {
  ringan: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  sedang: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  berat: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  fatal: 'text-red-400 bg-red-500/10 border-red-500/30'
};
const RISK_COLOR: Record<string, string> = {
  'Rendah': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  'Sedang': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  'Tinggi': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  'Sangat Kritis': 'text-red-400 bg-red-500/10 border-red-500/30'
};

export default function PerformanceSafetyDashboard({ employees }: PerformanceSafetyDashboardProps) {
  const [activeTab, setActiveTab] = useState<'incidents' | 'correlation' | 'bpjs'>('correlation');
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [correlation, setCorrelation] = useState<DepartmentSafetyCorrelation[]>([]);
  const [bpjsSummary, setBpjsSummary] = useState<BPJSClaimSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    karyawanId: '', karyawanName: '', department: '', tanggalKejadian: new Date().toISOString().split('T')[0],
    jenisInsiden: 'kecelakaan_kerja' as IncidentType, tingkatKeparahan: 'ringan' as IncidentSeverity,
    lokasi: '', deskripsi: '', tindakanKorektif: ''
  });

  const loadAll = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [baseRes, corrRes, bpjsRes] = await Promise.all([
        fetch('/api/performance-safety'),
        fetch('/api/performance-safety?view=correlation'),
        fetch('/api/performance-safety?view=bpjs-claims')
      ]);
      const base = await baseRes.json();
      const corr = await corrRes.json();
      const bpjs = await bpjsRes.json();
      if (base.incidents) setIncidents(base.incidents);
      if (corr.correlation) setCorrelation(corr.correlation);
      if (bpjs.summary) setBpjsSummary(bpjs.summary);
    } catch (err: any) {
      setErrorMsg('Gagal memuat data Performance & Safety. Periksa koneksi server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleEmployeeSelect = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    setForm(f => ({
      ...f,
      karyawanId: empId,
      karyawanName: emp?.name || '',
      department: emp?.department || ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.karyawanId) { setErrorMsg('Pilih karyawan terlebih dahulu.'); return; }
    try {
      const res = await fetch('/api/performance-safety', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan laporan.');
      setShowForm(false);
      await loadAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
              <HardHat className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Performance & Safety Correlation</h2>
              <p className="text-slate-500 text-xs">Korelasi Insiden K3, Klaim BPJS, dan Skor Appraisal Karyawan</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadAll} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={() => setShowForm(true)} className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Lapor Insiden
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">{errorMsg}</div>
        )}

        <div className="flex gap-2 mb-5">
          {[
            { id: 'correlation', label: 'Korelasi Safety-Performance' },
            { id: 'incidents', label: `Laporan Insiden (${incidents.length})` },
            { id: 'bpjs', label: 'Klaim BPJS' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors ${
                activeTab === tab.id ? 'bg-orange-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'correlation' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {correlation.map(dept => (
              <div key={dept.department} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">{dept.department}</p>
                    <p className="text-slate-500 text-[11px]">{dept.employeeCount} karyawan</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${RISK_COLOR[dept.riskLevel]}`}>
                    {dept.riskLevel}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">
                    <p className="text-white font-bold text-sm">{dept.totalIncidents}</p>
                    <p className="text-slate-500 text-[9px]">Insiden</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">
                    <p className="text-white font-bold text-sm">{dept.safetyIndex}</p>
                    <p className="text-slate-500 text-[9px]">Safety Index</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">
                    <p className="text-white font-bold text-sm">{dept.avgOverallScore}</p>
                    <p className="text-slate-500 text-[9px]">Skor Appraisal</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-slate-500">KPI rata²:</span>
                  <span className="text-slate-300 font-semibold">{dept.avgKpiScore}</span>
                  <span className="text-slate-700">|</span>
                  <span className="text-slate-500">Safety Compliance:</span>
                  <span className="text-slate-300 font-semibold">{dept.avgSafetyComplianceScore}</span>
                </div>
              </div>
            ))}
            {correlation.length === 0 && !isLoading && (
              <p className="text-slate-500 text-xs col-span-2 text-center py-8">Belum ada data korelasi.</p>
            )}
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="space-y-2">
            {incidents.map(inc => (
              <div key={inc.id} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-white font-semibold text-xs">{inc.karyawanName} · {inc.department}</p>
                    <p className="text-slate-500 text-[11px]">{inc.tanggalKejadian} · {inc.lokasi}</p>
                    <p className="text-slate-400 text-[11px] mt-1">{inc.deskripsi}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${SEVERITY_COLOR[inc.tingkatKeparahan]}`}>
                  {SEVERITY_LABEL[inc.tingkatKeparahan]}
                </span>
              </div>
            ))}
            {incidents.length === 0 && !isLoading && (
              <p className="text-slate-500 text-xs text-center py-8">Belum ada laporan insiden.</p>
            )}
          </div>
        )}

        {activeTab === 'bpjs' && bpjsSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-center">
              <ShieldAlert className="w-4 h-4 text-slate-500 mx-auto mb-1" />
              <p className="text-white font-bold text-lg">{bpjsSummary.belumDiajukanCount}</p>
              <p className="text-slate-500 text-[10px]">Belum Diajukan</p>
            </div>
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-center">
              <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <p className="text-white font-bold text-lg">{bpjsSummary.diprosesCount}</p>
              <p className="text-slate-500 text-[10px]">Diproses</p>
            </div>
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-center">
              <BadgeCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-white font-bold text-lg">{bpjsSummary.disetujuiCount}</p>
              <p className="text-slate-500 text-[10px]">Disetujui</p>
            </div>
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-center">
              <XCircle className="w-4 h-4 text-red-400 mx-auto mb-1" />
              <p className="text-white font-bold text-lg">{bpjsSummary.ditolakCount}</p>
              <p className="text-slate-500 text-[10px]">Ditolak</p>
            </div>
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 col-span-2">
              <p className="text-slate-500 text-[10px]">Total Biaya Klaim Disetujui</p>
              <p className="text-white font-bold text-base">Rp {bpjsSummary.totalBiayaKlaimDisetujui.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 col-span-2">
              <p className="text-slate-500 text-[10px]">Total Biaya Klaim Diproses</p>
              <p className="text-white font-bold text-base">Rp {bpjsSummary.totalBiayaKlaimDiproses.toLocaleString('id-ID')}</p>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-sm">Laporan Insiden K3 Baru</h3>
              <button type="button" onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <select
              value={form.karyawanId}
              onChange={e => handleEmployeeSelect(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              required
            >
              <option value="">Pilih Karyawan</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} — {emp.department}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.tanggalKejadian} onChange={e => setForm(f => ({ ...f, tanggalKejadian: e.target.value }))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" required />
              <select value={form.tingkatKeparahan} onChange={e => setForm(f => ({ ...f, tingkatKeparahan: e.target.value as IncidentSeverity }))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
                <option value="ringan">Ringan</option>
                <option value="sedang">Sedang</option>
                <option value="berat">Berat</option>
                <option value="fatal">Fatal</option>
              </select>
            </div>
            <select value={form.jenisInsiden} onChange={e => setForm(f => ({ ...f, jenisInsiden: e.target.value as IncidentType }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
              <option value="kecelakaan_kerja">Kecelakaan Kerja</option>
              <option value="near_miss">Near-miss</option>
              <option value="penyakit_akibat_kerja">Penyakit Akibat Kerja</option>
            </select>
            <input placeholder="Lokasi kejadian" value={form.lokasi} onChange={e => setForm(f => ({ ...f, lokasi: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" />
            <textarea placeholder="Deskripsi kejadian" value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" rows={2} />
            <textarea placeholder="Tindakan korektif" value={form.tindakanKorektif} onChange={e => setForm(f => ({ ...f, tindakanKorektif: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200" rows={2} />
            <button type="submit" className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Simpan Laporan & Update Appraisal
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
