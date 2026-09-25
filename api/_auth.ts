import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export type AppRole = 'Admin' | 'HR' | 'Manager' | 'Employee';
export type AccessLevel = 'none' | 'view' | 'edit' | 'full';

export interface AuthContext {
  user: { id: string; email?: string };
  profile: { user_id: string; email: string; full_name: string; role: AppRole; department?: string | null; employee_id?: string | null; status: string };
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

function clientForToken(token: string) {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase server environment belum dikonfigurasi.');
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: 'Bearer ' + token } },
  });
}

export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<AuthContext | null> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) { res.status(401).json({ error: 'Autentikasi diperlukan.' }); return null; }
  try {
    const supabase = clientForToken(token);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) { res.status(401).json({ error: 'Sesi tidak valid atau sudah kedaluwarsa.' }); return null; }
    const { data: profile, error: profileError } = await supabase.from('user_roles')
      .select('user_id,email,full_name,role,department,employee_id,status').eq('user_id', authData.user.id).maybeSingle();
    if (profileError || !profile) { res.status(403).json({ error: 'Profil pengguna belum memiliki role.' }); return null; }
    if (profile.status !== 'active') { res.status(403).json({ error: 'Akun pengguna tidak aktif.' }); return null; }
    return { user: { id: authData.user.id, email: authData.user.email }, profile } as AuthContext;
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Gagal memvalidasi sesi.' }); return null;
  }
}

const hierarchy: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2, full: 3 };
export async function requirePermission(req: VercelRequest, res: VercelResponse, moduleCode: string, required: AccessLevel) {
  const ctx = await requireAuth(req, res);
  if (!ctx) return null;
  if (ctx.profile.role === 'Admin') return ctx;
  const token = (req.headers.authorization || '').slice(7);
  const candidates = moduleCode === 'org_structure' ? ['org_structure', 'orgstructure'] : [moduleCode];
  const candidates = moduleCode === 'org_structure' ? ['org_structure', 'orgstructure'] : [moduleCode];
  try {
    const supabase = clientForToken(token);
    let data: any = null;
    let error: any = null;
    for (const candidate of candidates) {
      const result = await supabase.from('role_permissions').select('access_level')
        .eq('role', ctx.profile.role).eq('module_code', candidate).maybeSingle();
      data = result.data; error = result.error;
      if (!error && data) break;
    }
    if (error || !data || hierarchy[data.access_level as AccessLevel] < hierarchy[required]) {
      res.status(403).json({ error: 'Akses ditolak untuk ' + moduleCode + '.' }); return null;
    }
    return ctx;
  } catch (error: any) { res.status(500).json({ error: error?.message || 'Gagal memeriksa permission.' }); return null; }
}
