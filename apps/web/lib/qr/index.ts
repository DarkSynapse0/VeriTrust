import QRCode from 'qrcode';
import type { Bytes32Hex } from '@veritrust/shared-types';
import { getEnv } from '../env';

/// Build the verification URL embedded in a QR code.
export function verificationUrl(credentialHash: Bytes32Hex, credentialId: string): string {
  const base = getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const url = new URL(`${base}/verify`);
  url.searchParams.set('h', credentialHash);
  url.searchParams.set('id', credentialId);
  return url.toString();
}

/// Generate a QR PNG buffer (deterministic for the same input).
export async function generateQrPng(
  credentialHash: Bytes32Hex,
  credentialId: string,
  size = 512,
): Promise<Buffer> {
  return QRCode.toBuffer(verificationUrl(credentialHash, credentialId), {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: size,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  });
}

export async function generateQrDataUrl(
  credentialHash: Bytes32Hex,
  credentialId: string,
  size = 256,
): Promise<string> {
  return QRCode.toDataURL(verificationUrl(credentialHash, credentialId), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: size,
    color: { dark: '#0F172A', light: '#FFFFFF' },
  });
}

/// Parse a verification URL back into its components, returning null if it's
/// not a valid VeriTrust verification URL.
export function parseVerificationUrl(
  raw: string,
): { hash: Bytes32Hex; credentialId: string } | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const h = url.searchParams.get('h');
  const id = url.searchParams.get('id');
  if (!h || !id) return null;
  if (!/^0x[a-fA-F0-9]{64}$/.test(h)) return null;
  return { hash: h as Bytes32Hex, credentialId: id };
}
