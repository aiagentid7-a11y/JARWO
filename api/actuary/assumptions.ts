import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requirePermission } from '../_auth';
import { actuarialAssumptions } from '../../server/actuary.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requirePermission(req, res, 'remunerasi', req.method === 'GET' ? 'view' : 'edit');
  if (!ctx) return;
  if (req.method === 'GET') {
    return res.status(200).json({ success: true, assumptions: actuarialAssumptions });
  }

  if (req.method === 'POST') {
    try {
      const { year, salaryInflationRate, discountRate, turnoverRate, bonusMonths, allowanceGrowthRate, notes } = req.body;

      if (!year) {
        return res.status(400).json({ error: 'Tahun asumsi wajib diisi.' });
      }

      const yr = parseInt(String(year), 10);
      const existingIndex = actuarialAssumptions.findIndex(a => a.year === yr);

      const newAssumption = {
        id: existingIndex !== -1 ? actuarialAssumptions[existingIndex].id : `asmp-${yr}-${Date.now().toString().slice(-4)}`,
        year: yr,
        salaryInflationRate: parseFloat(String(salaryInflationRate ?? 5.5)),
        discountRate: parseFloat(String(discountRate ?? 6.8)),
        turnoverRate: parseFloat(String(turnoverRate ?? 3.0)),
        bonusMonths: parseFloat(String(bonusMonths ?? 1.0)),
        allowanceGrowthRate: parseFloat(String(allowanceGrowthRate ?? 4.0)),
        notes: notes || `Asumsi aktuaria disesuaikan untuk RKAB ${yr}`,
        createdAt: new Date().toISOString()
      };

      if (existingIndex !== -1) {
        actuarialAssumptions[existingIndex] = newAssumption;
      } else {
        actuarialAssumptions.push(newAssumption);
        actuarialAssumptions.sort((a, b) => a.year - b.year);
      }

      return res.status(200).json({ success: true, message: `Asumsi aktuaria tahun ${yr} berhasil disimpan.`, assumption: newAssumption });
    } catch (err: any) {
      return res.status(500).json({ error: `Gagal menyimpan asumsi aktuaria: ${err.message}` });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}

// NOTE (audit): actuarialAssumptions is an in-memory array — it resets on every
// serverless cold start on Vercel. For production reliability this should be
// backed by the `actuarial_assumptions` table already defined in
// supabase_actuary_schema.sql, not kept in module memory. Flagged for follow-up.
