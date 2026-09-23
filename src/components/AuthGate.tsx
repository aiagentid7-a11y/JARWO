import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import Login from './Login';
import { Loader2 } from 'lucide-react';

export type AppRole = 'Admin' | 'HR' | 'Manager' | 'Employee';
export type AccessLevel = 'none' | 'view' | 'edit' | 'full';
interface Profile { user_id:string; email:string; full_name:string; role:AppRole; department?:string|null; employee_id?:string|null; status:string; }
interface AuthContextValue { user: User | null; profile: Profile | null; logout: () => Promise<void>; hasAccess: (moduleCode:string, level?:AccessLevel) => boolean; }

const hierarchy: Record<AccessLevel,number> = { none:0, view:1, edit:2, full:3 };
const roleDefaults: Record<AppRole,Record<string,AccessLevel>> = {
  Admin:{'*':'full'}, HR:{'*':'full'}, Manager:{absensi:'edit',cuti:'edit',lembur:'edit',kpi:'edit',dinas:'edit',orgstructure:'view',datapribadi:'view',regulasi:'view'},
  Employee:{absensi:'edit',cuti:'edit',lembur:'edit',dinas:'edit',gaji:'view',datapribadi:'view',regulasi:'view'}
};
const AuthContext = createContext<AuthContextValue>({ user:null, profile:null, logout:async()=>{}, hasAccess:()=>false });
export const useAuth = () => useContext(AuthContext);

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session,setSession] = useState<Session|null>(null);
  const [profile,setProfile] = useState<Profile|null>(null);
  const [isLoading,setIsLoading] = useState(true);
  const [authError,setAuthError] = useState('');

  const loadProfile = async (currentSession: Session|null) => {
    if (!currentSession) { setSession(null); setProfile(null); setIsLoading(false); return; }
    setSession(currentSession);
    try {
      const response = await fetch('/api/auth/me', { headers:{ Authorization:'Bearer '+currentSession.access_token }});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Profil pengguna tidak dapat dimuat.');
      setProfile(data.profile);
      setAuthError('');
    } catch (error:any) {
      await supabase.auth.signOut();
      setSession(null); setProfile(null); setAuthError(error?.message || 'Akses ditolak.');
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    let mounted=true;
    supabase.auth.getSession().then(({data})=>{ if(mounted) loadProfile(data.session); }).catch(()=>mounted && setIsLoading(false));
    const {data:listener}=supabase.auth.onAuthStateChange((_event,newSession)=>{ if(mounted) loadProfile(newSession); });
    return ()=>{ mounted=false; listener?.subscription?.unsubscribe(); };
  },[]);

  const logout=async()=>{ await supabase.auth.signOut(); setSession(null); setProfile(null); };
  const hasAccess=(moduleCode:string,level:AccessLevel='view')=>{
    if(!profile) return false;
    const allowed=roleDefaults[profile.role]?.[moduleCode] || roleDefaults[profile.role]?.['*'] || 'none';
    return hierarchy[allowed] >= hierarchy[level];
  };

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>;
  if (!session || !profile) return <><Login />{authError && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-950 border border-red-800 text-red-300 px-4 py-2 rounded-lg text-xs">{authError}</div>}</>;
  return <AuthContext.Provider value={{user:session.user,profile,logout,hasAccess}}>{children}</AuthContext.Provider>;
}
