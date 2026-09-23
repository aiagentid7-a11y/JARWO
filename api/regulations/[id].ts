import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deleteLaborRegulation } from '../../server/regulations.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end();
  }

  try {
    const { id } = req.query;
    const deleted = deleteLaborRegulation(String(id));
    if (!deleted) {
      return res.status(404).json({ error: 'Regulasi tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, message: 'Regulasi berhasil dihapus.' });
  } catch (err: any) {
    return res.status(500).json({ error: `Gagal menghapus regulasi: ${err.message}` });
  }
}
