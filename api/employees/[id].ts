import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requirePermission } from '../_auth';
import { supabase } from '../_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requirePermission(req, res, 'employees', 'edit');
  if (!ctx) return;

  const { id } = req.query;
  if (typeof id !== 'string' || !id) return res.status(400).json({ error: 'ID karyawan wajib diisi.' });

  if (req.method === 'PUT') {
    const body = req.body || {};
    if (body.nik) {
      const { data: duplicate } = await supabase.from('employees').select('id').eq('nik', body.nik).neq('id', id).maybeSingle();
      if (duplicate) return res.status(400).json({ error: 'NIK sudah digunakan oleh karyawan lain.' });
    }
    const { data, error } = await supabase.from('employees').update(body).eq('id', id).select().single();
    if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, employee: data });
  }

  if (req.method === 'DELETE') {
    const { data: existing, error: lookupError } = await supabase.from('employees').select('id').eq('id', id).maybeSingle();
    if (lookupError) return res.status(500).json({ error: lookupError.message });
    if (!existing) return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });

    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, message: 'Karyawan berhasil dihapus.' });
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end();
}
