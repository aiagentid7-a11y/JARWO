import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Department ID missing or invalid' });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const { name, code, description, parentId, managerId } = req.body;

      const updatePayload: any = {};
      if (name !== undefined) updatePayload.name = name;
      if (code !== undefined) updatePayload.code = code.toUpperCase();
      if (description !== undefined) updatePayload.description = description;
      if (parentId !== undefined) updatePayload.parent_id = parentId || null;
      if (managerId !== undefined) updatePayload.manager_id = managerId || null;

      const { data, error } = await supabase
        .from('departments')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true, department: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true, message: 'Departemen berhasil dihapus' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }

  res.setHeader('Allow', ['PUT', 'PATCH', 'DELETE']);
  return res.status(405).end();
}
