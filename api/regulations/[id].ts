import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requirePermission } from '../_auth';
import { deleteLaborRegulation } from '../../server/regulations.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requirePermission(req, res, 'regulasi', 'edit');
  if (!ctx) return;
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end();
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID regulasi wajib diisi.' });
    const deleted = deleteLaborRegulation(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Regulasi tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, message: 'Regulasi berhasil dihapus.' });
  } catch (err: any) {
    return res.status(500).json({ error: `Gagal menghapus regulasi: ${err.message}` });
  }
}
