import type { VercelRequest, VercelResponse } from '@vercel/node';
import { appUsersStore, recordAuditLog } from '../../../server/security.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      return res.status(200).json({ success: true, count: appUsersStore.length, users: appUsersStore });
    } catch (err: any) {
      return res.status(500).json({ error: `Gagal mengambil daftar pengguna: ${err.message}` });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id, email, name, role, department, employeeId, currentUserEmail = 'admin.hr@company.com', currentUserRole = 'Admin' } = req.body;
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;

      if (currentUserRole !== 'Admin') {
        return res.status(403).json({ error: 'Akses Ditolak: Hanya Admin yang berhak mengelola akun pengguna.' });
      }
      if (!email || !name || !role) {
        return res.status(400).json({ error: 'Email, Nama, dan Role wajib diisi.' });
      }

      const existingIdx = appUsersStore.findIndex(u => u.id === id || u.email.toLowerCase() === email.toLowerCase());
      let savedUser: any;

      if (existingIdx !== -1) {
        const oldVal = { ...appUsersStore[existingIdx] };
        appUsersStore[existingIdx] = {
          ...appUsersStore[existingIdx],
          name,
          role,
          department: department || appUsersStore[existingIdx].department,
          employeeId: employeeId || appUsersStore[existingIdx].employeeId
        };
        savedUser = appUsersStore[existingIdx];
        recordAuditLog('usr-001', currentUserEmail, currentUserRole, 'UPDATE', 'user_roles', savedUser.id, oldVal, savedUser, ip);
      } else {
        savedUser = {
          id: id || `usr-${Date.now()}`,
          email,
          name,
          role,
          department: department || 'Operations',
          employeeId: employeeId || `EMP-${Math.floor(Math.random() * 1000)}`,
          lastLogin: new Date().toISOString(),
          status: 'active' as const
        };
        appUsersStore.unshift(savedUser);
        recordAuditLog('usr-001', currentUserEmail, currentUserRole, 'CREATE', 'user_roles', savedUser.id, null, savedUser, ip);
      }

      return res.status(200).json({ success: true, message: `Pengguna '${savedUser.name}' (${savedUser.role}) berhasil disimpan.`, user: savedUser });
    } catch (err: any) {
      return res.status(500).json({ error: `Gagal menyimpan pengguna: ${err.message}` });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}
