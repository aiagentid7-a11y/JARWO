import React, { useEffect, useState } from 'react';
import { Clock, LogIn, LogOut, RefreshCw, CheckCircle } from 'lucide-react';

type AttendanceRecord = { id:string; attendance_date:string; status:'Hadir'|'Terlambat'|'Absen'|'Izin'; notes?:string|null };

export default function AttendanceSelfService({ employeeId }: { employeeId:string }) {
  const [records,setRecords]=useState<AttendanceRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const today=new Date().toISOString().slice(0,10);

  const load=async()=>{
    setLoading(true);
    try {
      const r=await fetch('/api/attendance?employeeId='+encodeURIComponent(employeeId));
      const d=await r.json();
      if(!r.ok) throw new Error(d.error || 'Gagal mengambil absensi.');
      setRecords(d.records || []);
    } catch(e:any){ setMessage(e.message || 'Gagal mengambil absensi.'); }
    finally{setLoading(false);}
  };
  useEffect(()=>{load();},[employeeId]);

  const mark=async(status:'Hadir'|'Terlambat')=>{
    setSaving(true); setMessage('');
    try {
      const r=await fetch('/api/attendance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeId,date:today,status})});
      const d=await r.json();
      if(!r.ok) throw new Error(d.error || 'Gagal menyimpan absensi.');
      setMessage(status === 'Hadir' ? 'Check-in berhasil.' : 'Status terlambat berhasil dicatat.');
      await load();
    } catch(e:any){setMessage(e.message || 'Gagal menyimpan absensi.');}
    finally{setSaving(false);}
  };

  const todayRecord=records.find(r=>r.attendance_date===today);
  return <div className="mb-6 rounded-2xl border border-blue-900/40 bg-slate-900 p-5 shadow-lg">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-white font-bold"><Clock className="w-5 h-5 text-blue-400"/> Absensi Saya</div>
        <p className="text-xs text-slate-400 mt-1">Employee Self-Service · {today}</p>
      </div>
      <div className="flex gap-2">
        <button disabled={saving || !!todayRecord} onClick={()=>mark('Hadir')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold"><LogIn className="w-4 h-4"/> Check-in</button>
        <button disabled={saving || !todayRecord} onClick={()=>mark('Terlambat')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold"><LogOut className="w-4 h-4"/> Catat Terlambat</button>
        <button onClick={load} className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"><RefreshCw className={'w-4 h-4 '+(loading?'animate-spin':'')}/></button>
      </div>
    </div>
    {todayRecord && <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle className="w-4 h-4"/> Hari ini: <strong>{todayRecord.status}</strong></div>}
    {message && <div className="mt-3 text-xs text-slate-300">{message}</div>}
  </div>;
}
