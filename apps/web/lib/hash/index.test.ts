import { describe, expect, it } from 'vitest';
import { hashRecipientId, isBytes32Hex, sha256Bytes32, sha256Hex, toBytes32Hex } from './index';

describe('hash utilities', () => {
  it('produces the documented SHA-256 of "abc"', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('sha256Bytes32 prefixes with 0x', () => {
    const out = sha256Bytes32('abc');
    expect(out.startsWith('0x')).toBe(true);
    expect(out.length).toBe(66);
  });

  it('hashing the same input is deterministic', () => {
    const a = sha256Hex('hello world');
    const b = sha256Hex('hello world');
    expect(a).toBe(b);
  });

  it('toBytes32Hex accepts both 0x-prefixed and bare hex', () => {
    const bare = 'a'.repeat(64);
    const prefixed = `0x${bare}`;
    expect(toBytes32Hex(bare)).toBe(prefixed);
    expect(toBytes32Hex(prefixed)).toBe(prefixed);
  });

  it('toBytes32Hex rejects malformed input', () => {
    expect(() => toBytes32Hex('not-hex')).toThrow();
    expect(() => toBytes32Hex('0x123')).toThrow();
    expect(() => toBytes32Hex('z'.repeat(64))).toThrow();
  });

  it('hashRecipientId normalizes case + whitespace', () => {
    expect(hashRecipientId('  Alice@Example.com  ')).toBe(hashRecipientId('alice@example.com'));
  });

  it('isBytes32Hex correctly identifies the format', () => {
    expect(isBytes32Hex(`0x${'a'.repeat(64)}`)).toBe(true);
    expect(isBytes32Hex('0x123')).toBe(false);
    expect(isBytes32Hex('abc')).toBe(false);
  });
});
