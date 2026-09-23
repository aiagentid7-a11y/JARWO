import type { VercelRequest, VercelResponse } from '@vercel/node';
import { defaultRoleDefinitions, MODULE_LIST } from '../../../server/security.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  try {
    return res.status(200).json({
      success: true,
      roles: defaultRoleDefinitions,
      modules: MODULE_LIST
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Gagal mengambil data RBAC roles: ${err.message}` });
  }
}
