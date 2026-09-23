import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_supabase.js';
import { calculateEmployeeSeveranceReserve } from '../../server/actuary.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const { discountRate = 6.8, asOfDate } = req.body;

    const { data: rows, error } = await supabase.from('employees').select('*');
    if (error) {
      return res.status(500).json({ error: `Gagal mengambil data karyawan: ${error.message}` });
    }

    const employees = (rows || [])
      .filter((e: any) => e.status !== 'Terminated' && e.status !== 'PHK')
      .map((e: any) => ({
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

    const targetDate = asOfDate ? new Date(asOfDate) : new Date();
    const discRate = parseFloat(String(discountRate));

    const severanceItems = employees.map((emp: any) =>
      calculateEmployeeSeveranceReserve(emp, discRate, targetDate)
    );

    const totalNominalReserve = severanceItems.reduce((sum: number, item: any) => sum + item.nominalGrossReserve, 0);
    const totalPVReserve = severanceItems.reduce((sum: number, item: any) => sum + item.presentValueReserve, 0);
    const averageReservePerEmp = employees.length > 0 ? Math.round(totalPVReserve / employees.length) : 0;

    return res.status(200).json({
      success: true,
      asOfDate: targetDate.toISOString().split('T')[0],
      discountRate: discRate,
      employeeCount: employees.length,
      totalNominalReserve,
      totalPVReserve,
      averageReservePerEmp,
      severanceItems
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Gagal menghitung cadangan pesangon: ${err.message}` });
  }
}
