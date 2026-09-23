import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requirePermission } from '../_auth';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requirePermission(req, res, 'absensi', req.method === 'GET' ? 'view' : 'edit');
  if (!ctx) return;
  const token = (req.headers.authorization || '').slice(7);
  const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '', {
    global: { headers: { Authorization: 'Bearer ' + token } }, auth: { persistSession: false }
  });

  if (req.method === 'GET') {
    const { employeeId, from, to } = req.query;
    let query = supabase.from('attendance_records').select('*').order('attendance_date', { ascending: false });
    if (employeeId) query = query.eq('employee_id', String(employeeId));
    if (from) query = query.gte('attendance_date', String(from));
    if (to) query = query.lte('attendance_date', String(to));
    if (ctx.profile.role === 'Employee') query = query.eq('employee_id', ctx.profile.employee_id || '__none__');
    if (ctx.profile.role === 'Manager' && !employeeId) query = query.eq('department', ctx.profile.department || '__none__');
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, records: data || [] });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const body = req.body || {};
    const targetEmployee = String(body.employeeId || ctx.profile.employee_id || '');
    if (!targetEmployee) return res.status(400).json({ error: 'employeeId wajib diisi.' });
    if (ctx.profile.role === 'Employee' && targetEmployee !== ctx.profile.employee_id) return res.status(403).json({ error: 'Employee hanya dapat mencatat absensinya sendiri.' });
    if (ctx.profile.role === 'Manager' && body.department && body.department !== ctx.profile.department) return res.status(403).json({ error: 'Manager hanya dapat mengelola timnya.' });
    const record = { employee_id: targetEmployee, department: body.department || ctx.profile.department || null, attendance_date: body.date, status: body.status, notes: body.notes || null, updated_by: ctx.user.id };
    if (!record.attendance_date || !record.status) return res.status(400).json({ error: 'Tanggal dan status absensi wajib diisi.' });
    const { data, error } = await supabase.from('attendance_records').upsert(record, { onConflict: 'employee_id,attendance_date' }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, record: data });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).end();
}
