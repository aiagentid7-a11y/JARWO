import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { data, error } = await supabase.from('employees').update(req.body).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, employee: data });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, message: 'Karyawan berhasil dihapus.' });
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end();
}
