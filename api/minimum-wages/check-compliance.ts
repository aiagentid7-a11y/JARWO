import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requirePermission } from '../_auth';
import { validateWageCompliance } from '../../server/regulations.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requirePermission(req, res, 'regulasi', 'view');
  if (!ctx) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const { wage, province = 'Sulawesi Tenggara', cityDistrict, year = 2026 } = req.body;
    const parsedWage = parseFloat(String(wage ?? 0));
    if (!Number.isFinite(parsedWage) || parsedWage < 0) return res.status(400).json({ error: 'Nominal upah tidak valid.' });
    const compliance = validateWageCompliance(parsedWage, String(province), cityDistrict ? String(cityDistrict) : undefined, parseInt(String(year), 10));
    return res.status(200).json({ success: true, compliance });
  } catch (err: any) {
    return res.status(500).json({ error: `Gagal memeriksa kepatuhan UMK: ${err.message}` });
  }
}
