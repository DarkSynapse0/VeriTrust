import { createHash } from 'node:crypto';
import type { Bytes32Hex } from '@veritrust/shared-types';

/// Hash arbitrary bytes with SHA-256 and return the lowercase hex digest.
export function sha256Hex(input: Uint8Array | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
  return createHash('sha256').update(buf).digest('hex');
}

/// SHA-256 a UTF-8 string and return as 0x-prefixed bytes32 hex (suitable for chain).
export function sha256Bytes32(input: Uint8Array | string): Bytes32Hex {
  return `0x${sha256Hex(input)}`;
}

/// Convert any 64-char hex string (with or without 0x) into bytes32 hex.
export function toBytes32Hex(hex: string): Bytes32Hex {
  const trimmed = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (!/^[a-fA-F0-9]{64}$/.test(trimmed)) {
    throw new Error(`Not a 32-byte hex string: ${hex}`);
  }
  return `0x${trimmed.toLowerCase()}`;
}

/// Hash a recipient identifier (email, etc.) for storage. Lowercase + trim
/// applied first to make the hash stable across casing/whitespace variants.
export function hashRecipientId(identifier: string): string {
  return sha256Hex(identifier.trim().toLowerCase());
}

export function isBytes32Hex(s: string): s is Bytes32Hex {
  return /^0x[a-fA-F0-9]{64}$/.test(s);
}
