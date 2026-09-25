import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requirePermission } from '../_auth';
import {
  incidentReportsStore,
  appraisalsStore,
  createIncidentReport,
  getDepartmentSafetyCorrelation,
  getBPJSClaimsSummary
} from '../../server/performanceSafety.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requirePermission(req, res, 'kpi', req.method === 'GET' ? 'view' : 'edit');
  if (!ctx) return;
  if (req.method === 'GET') {
    try {
      const { view, userRole, userDept } = req.query;

      if (view === 'correlation') {
        const correlation = getDepartmentSafetyCorrelation(
          userRole ? String(userRole) as any : undefined,
          userDept ? String(userDept) : undefined
        );
        return res.status(200).json({ success: true, correlation });
      }

      if (view === 'bpjs-claims') {
        const summary = getBPJSClaimsSummary();
        return res.status(200).json({ success: true, summary });
      }

      return res.status(200).json({
        success: true,
        incidents: incidentReportsStore,
        appraisals: appraisalsStore
      });
    } catch (err: any) {
      return res.status(500).json({ error: `Gagal mengambil data performance & safety: ${err.message}` });
    }
  }

  if (req.method === 'POST') {
    try {
      const { karyawanId, karyawanName, department, tanggalKejadian, jenisInsiden, tingkatKeparahan } = req.body;
      if (!karyawanId || !tanggalKejadian || !jenisInsiden || !tingkatKeparahan) {
        return res.status(400).json({ error: 'Karyawan, tanggal, jenis insiden, dan tingkat keparahan wajib diisi.' });
      }
      const newIncident = createIncidentReport(req.body);
      return res.status(201).json({ success: true, message: `Laporan insiden untuk '${karyawanName || karyawanId}' berhasil disimpan.`, incident: newIncident });
    } catch (err: any) {
      return res.status(500).json({ error: `Gagal menyimpan laporan insiden: ${err.message}` });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}

// NOTE (audit): incidentReportsStore/appraisalsStore are in-memory — resets
// on cold start. supabase_performance_safety_schema.sql already defines the
// persistent tables; migrate this endpoint to Supabase for production use.
