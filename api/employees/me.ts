import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_auth';
import { supabase } from '../_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  if (ctx.profile.role !== 'Employee') {
    return res.status(403).json({ error: 'Endpoint ini khusus role Employee.' });
  }
  if (!ctx.profile.employee_id) {
    return res.status(403).json({ error: 'employee_id belum terhubung ke akun.' });
  }

  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', ctx.profile.employee_id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!employee) return res.status(404).json({ error: 'Data karyawan tidak ditemukan.' });

  return res.status(200).json({ employee });
}
