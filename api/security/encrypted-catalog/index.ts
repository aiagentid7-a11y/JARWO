import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ENCRYPTED_FIELDS_CATALOG } from '../../../server/security.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  try {
    return res.status(200).json({
      success: true,
      catalog: ENCRYPTED_FIELDS_CATALOG,
      encryptionMethod: 'AES-256-CBC (pgcrypto at-rest / Supabase Vault)',
      serverRoleOnlyDecrypt: true
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Gagal mengambil katalog enkripsi: ${err.message}` });
  }
}
