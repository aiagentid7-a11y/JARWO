import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updateRolePermissions, recordAuditLog } from '../../../server/security.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const { roleId } = req.query;
    const { permissions, currentUserEmail = 'admin.hr@company.com', currentUserRole = 'Admin' } = req.body;

    if (currentUserRole !== 'Admin') {
      return res.status(403).json({ error: 'Akses Ditolak: Hanya Admin yang berhak memperbarui matriks RBAC.' });
    }

    const updated = updateRolePermissions(String(roleId), permissions);
    if (!updated) {
      return res.status(404).json({ error: 'Role tidak ditemukan.' });
    }

    recordAuditLog(
      'usr-001',
      currentUserEmail,
      currentUserRole,
      'UPDATE',
      'role_permissions',
      String(roleId),
      { roleName: updated.roleName },
      { updatedPermissionsCount: permissions.length },
      (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress
    );

    return res.status(200).json({ success: true, message: `Matriks akses role '${updated.roleName}' berhasil diperbarui.`, role: updated });
  } catch (err: any) {
    return res.status(500).json({ error: `Gagal memperbarui matriks RBAC: ${err.message}` });
  }
}
