import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requirePermission } from '../_auth';
import { deleteMinimumWage } from '../../server/regulations.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requirePermission(req, res, 'regulasi', 'edit');
  if (!ctx) return;
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end();
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID UMP/UMK wajib diisi.' });
    const deleted = deleteMinimumWage(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Data UMP/UMK tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, message: 'Data UMP/UMK berhasil dihapus.' });
  } catch (err: any) {
    return res.status(500).json({ error: `Gagal menghapus UMP/UMK: ${err.message}` });
  }
}
