import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllRegulations, saveLaborRegulation } from '../../server/regulations.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const { category, status, search } = req.query;
      const regulations = getAllRegulations(
        category ? String(category) : undefined,
        status ? String(status) : undefined,
        search ? String(search) : undefined
      );
      return res.status(200).json({ success: true, count: regulations.length, regulations });
    } catch (err: any) {
      return res.status(500).json({ error: `Gagal mengambil daftar regulasi: ${err.message}` });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, category, summary } = req.body;
      if (!title || !category || !summary) {
        return res.status(400).json({ error: 'Judul, kategori, dan ringkasan regulasi wajib diisi.' });
      }
      const saved = saveLaborRegulation(req.body);
      return res.status(200).json({ success: true, message: `Regulasi '${saved.title}' berhasil disimpan.`, regulation: saved });
    } catch (err: any) {
      return res.status(500).json({ error: `Gagal menyimpan regulasi: ${err.message}` });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end();
}

// NOTE (audit): backed by in-memory laborRegulations array — resets on cold
// start. supabase_regulations_schema.sql already defines the persistent
// table; this endpoint should be migrated to query Supabase directly.
