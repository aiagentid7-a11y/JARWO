import type { VercelRequest, VercelResponse } from '@vercel/node';
import { encryptSensitiveField, decryptSensitiveField, maskSensitiveField, recordAuditLog } from '../../server/security.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end();
  }

  try {
    const { plainText, fieldType = 'wage', requesterRole = 'Employee' } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;

    if (!plainText) {
      return res.status(400).json({ error: 'Teks teruji tidak boleh kosong.' });
    }

    const cipherText = encryptSensitiveField(plainText);
    const decryptedServerSide = decryptSensitiveField(cipherText);

    let finalValueExposedToClient = decryptedServerSide;
    let isMasked = false;

    if (requesterRole !== 'Admin' && requesterRole !== 'HR') {
      finalValueExposedToClient = maskSensitiveField(decryptedServerSide, fieldType);
      isMasked = true;
    }

    recordAuditLog(
      'usr-test', 'user.test@company.com', requesterRole, 'VIEW_SENSITIVE', 'encrypted_test_field', 'TEST-001',
      null, { fieldType, isMasked }, ip
    );

    return res.status(200).json({
      success: true,
      requesterRole,
      cipherTextAtRest: cipherText,
      decryptedServerSide,
      finalValueExposedToClient,
      isMasked,
      message: isMasked
        ? `Akses role '${requesterRole}' terbatas: Data disamarkan (masked) untuk keamanan PDP.`
        : `Akses role '${requesterRole}' diizinkan: Data didekripsi penuh di server-side.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Gagal memproses simulasi enkripsi: ${err.message}` });
  }
}
