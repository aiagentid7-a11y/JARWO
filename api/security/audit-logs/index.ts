import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requirePermission } from '../../_auth';
import { getFilteredAuditLogs } from '../../../server/security.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requirePermission(req, res, 'security', 'view');
  if (!ctx) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  try {
    const { userId, tableName, action, startDate, endDate, search } = req.query;

    if (ctx.profile.role !== 'Admin' && ctx.profile.role !== 'HR') {
      return res.status(403).json({ error: 'Akses Ditolak: Hanya role Admin dan HR yang dapat mengakses Jejak Audit System.' });
    }

    const logs = getFilteredAuditLogs(
      userId ? String(userId) : undefined,
      tableName ? String(tableName) : undefined,
      action ? String(action) : undefined,
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined,
      search ? String(search) : undefined
    );

    return res.status(200).json({ success: true, count: logs.length, auditLogs: logs });
  } catch (err: any) {
    return res.status(500).json({ error: `Gagal mengambil jejak audit: ${err.message}` });
  }
}
