import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('employees').select('*').order('global_no');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ employees: data });
  }

  if (req.method === 'POST') {
    const newEmp = req.body;
    if (newEmp.nik) {
      const { data: existing } = await supabase.from('employees').select('id').eq('nik', newEmp.nik).maybeSingle();
      if (existing) return res.status(400).json({ error: 'Karyawan dengan NIK tersebut sudah ada!' });
    }
    const { data, error } = await supabase.from('employees').insert(newEmp).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ success: true, employee: data });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
