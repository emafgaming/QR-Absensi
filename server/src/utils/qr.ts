import crypto from 'crypto';
import QRCode from 'qrcode';

/**
 * Generates a high-entropy cryptographically secure random token.
 * Business Rule: QR code contains random token, NOT raw NIM or personal data.
 */
export function generateSecureToken(): string {
  // 32 bytes of secure random bytes -> 64 hex characters
  // prefixed with 'WATT-' (WisudaAttend)
  const randomHex = crypto.randomBytes(32).toString('hex');
  return `WATT-${randomHex}`;
}

/**
 * Generates QR Code as Data URL (image/png)
 */
export async function generateQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: 'H',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}
