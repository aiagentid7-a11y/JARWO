import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requirePermission } from '../_auth';
import { supabase } from '../_supabase.js';
import { calculateRemunerationProjection } from '../../server/actuary.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requirePermission(req, res, 'remunerasi', 'view');
  if (!ctx) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const {
      year = 2026,
      salaryInflationRate = 5.5,
      discountRate = 6.8,
      turnoverRate = 3.0,
      bonusMonths = 1.0,
      allowanceGrowthRate = 4.0,
      horizonYears = 5
    } = req.body;

    const assumption = {
      id: `calc-${year}`,
      year: parseInt(String(year), 10),
      salaryInflationRate: parseFloat(String(salaryInflationRate)),
      discountRate: parseFloat(String(discountRate)),
      turnoverRate: parseFloat(String(turnoverRate)),
      bonusMonths: parseFloat(String(bonusMonths)),
      allowanceGrowthRate: parseFloat(String(allowanceGrowthRate)),
      createdAt: new Date().toISOString()
    };

    // Pull live employee data from Supabase (source of truth in production)
    // instead of the stale local data/employees.json used previously.
    const { data: rows, error } = await supabase.from('employees').select('*');
    if (error) {
      return res.status(500).json({ error: `Gagal mengambil data karyawan: ${error.message}` });
    }

    const employees = (rows || []).map((e: any) => ({
      id: e.id,
      globalNo: e.global_no ?? e.globalNo,
      nik: e.nik,
      name: e.name,
      position: e.position,
      department: e.department,
      wage: e.wage ?? e.basic_wage ?? e.basicWage,
      startDate: e.start_date ?? e.startDate,
      status: e.status
    }));

    const projection = calculateRemunerationProjection(employees, assumption, parseInt(String(horizonYears), 10), parseInt(String(year), 10));

    return res.status(200).json({
      success: true,
      assumption,
      summary: projection.summary,
      departmentBreakdown: projection.departmentBreakdown
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Gagal menghitung proyeksi aktuaria: ${err.message}` });
  }
}
