import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') { res.setHeader('Allow', ['GET']); return res.status(405).end(); }
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  return res.status(200).json({ success: true, user: ctx.user, profile: ctx.profile });
}
