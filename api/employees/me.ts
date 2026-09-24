import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_supabase.js';

type UserRole = {
  role?: string;
  employee_id?: string | number | null;
};

function bearerToken(req: VercelRequest) {
  const value = req.headers.authorization;
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice(7).trim() || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: 'Authorization Bearer token diperlukan' });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa' });
  }

  const userId = authData.user.id;

  const { data: roleRow, error: roleError } = await supabase
    .from('user_roles')
    .select('role, employee_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (roleError) return res.status(500).json({ error: roleError.message });
  if (!roleRow) return res.status(403).json({ error: 'Akun belum memiliki mapping karyawan' });

  const role = String((roleRow as UserRole).role || '').toLowerCase();
  if (role !== 'employee') {
    return res.status(403).json({ error: 'Endpoint ini khusus role Employee' });
  }

  const employeeId = (roleRow as UserRole).employee_id;
  if (!employeeId) return res.status(403).json({ error: 'employee_id belum terhubung ke akun' });

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .maybeSingle();

  if (employeeError) return res.status(500).json({ error: employeeError.message });
  if (!employee) return res.status(404).json({ error: 'Data karyawan tidak ditemukan' });

  return res.status(200).json({ employee });
}
