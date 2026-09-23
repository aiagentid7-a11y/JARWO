import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateWageCompliance } from '../../server/regulations.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const { wage, province = 'Sulawesi Tenggara', cityDistrict, year = 2026 } = req.body;
    const parsedWage = parseFloat(String(wage || 0));
    const compliance = validateWageCompliance(parsedWage, String(province), cityDistrict ? String(cityDistrict) : undefined, parseInt(String(year), 10));
    return res.status(200).json({ success: true, compliance });
  } catch (err: any) {
    return res.status(500).json({ error: `Gagal memeriksa kepatuhan UMK: ${err.message}` });
  }
}
