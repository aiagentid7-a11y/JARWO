import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requirePermission } from '../_auth';
import { getAllMinimumWages, saveMinimumWage } from '../../server/regulations.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requirePermission(req, res, 'regulasi', req.method === 'GET' ? 'view' : 'edit');
  if (!ctx) return;
  if (req.method === 'GET') {
    try {
      const { province, year, search } = req.query;
      const wages = getAllMinimumWages(
        province ? String(province) : undefined,
        year ? parseInt(String(year), 10) : undefined,
        search ? String(search) : undefined
      );
      return res.status(200).json({ success: true, count: wages.length, minimumWages: wages });
    } catch (err: any) {
      return res.status(500).json({ error: `Gagal mengambil data UMP/UMK: ${err.message}` });
    }
  }

  if (req.method === 'POST') {
    try {
      const { province, amount, year } = req.body;
      if (!province || !amount || !year) {
        return res.status(400).json({ error: 'Provinsi, nominal UMP/UMK, dan tahun wajib diisi.' });
      }
      const saved = saveMinimumWage(req.body);
      return res.status(200).json({ success: true, message: `Data UMP/UMK '${saved.province}' (${saved.year}) berhasil disimpan.`, minimumWage: saved });
    } catch (err: any) {
      return res.status(500).json({ error: `Gagal menyimpan UMP/UMK: ${err.message}` });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
