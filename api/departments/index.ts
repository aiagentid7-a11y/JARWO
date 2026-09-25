import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requirePermission } from '../_auth';
import { supabase } from '../_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requirePermission(req, res, 'org_structure', req.method === 'GET' ? 'view' : 'edit');
  if (!ctx) return;
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          parent:departments!parent_id(id, name, code),
          manager:employees!manager_id(id, name, position)
        `)
        .order('name');

      if (error) {
        // Fallback or error handling
        const { data: simpleData, error: simpleError } = await supabase
          .from('departments')
          .select('*')
          .order('name');
          
        if (simpleError) {
          return res.status(200).json({ departments: [] });
        }
        return res.status(200).json({ departments: simpleData || [] });
      }

      const formatted = (data || []).map((dept: any) => ({
        id: dept.id,
        code: dept.code,
        name: dept.name,
        description: dept.description,
        parentId: dept.parent_id,
        parentName: dept.parent?.name,
        managerId: dept.manager_id,
        managerName: dept.manager?.name,
        createdAt: dept.created_at
      }));

      return res.status(200).json({ departments: formatted });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, code, description, parentId, managerId } = req.body;

      if (!name || !code) {
        return res.status(400).json({ error: 'Nama dan Kode Departemen wajib diisi' });
      }

      const insertPayload = {
        name,
        code: code.toUpperCase(),
        description: description || null,
        parent_id: parentId || null,
        manager_id: managerId || null,
      };

      const { data, error } = await supabase
        .from('departments')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({ success: true, department: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
