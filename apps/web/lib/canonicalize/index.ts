import canonicalize from 'canonicalize';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { getSchema } from '@veritrust/canonical-schemas';
import type { Bytes32Hex, CanonicalCredential, CredentialType } from '@veritrust/shared-types';
import { err, ok, type Result } from '@veritrust/shared-types';
import { sha256Bytes32 } from '../hash';

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
addFormats(ajv);

const validatorCache = new Map<string, ValidateFunction>();

function getValidator(type: CredentialType, version: string): ValidateFunction {
  const key = `${type}@${version}`;
  let v = validatorCache.get(key);
  if (!v) {
    const schema = getSchema(type, version);
    v = ajv.compile(schema);
    validatorCache.set(key, v);
  }
  return v;
}

export type CanonicalizeError =
  | { code: 'SCHEMA_INVALID'; details: ReadonlyArray<string> }
  | { code: 'CANONICALIZATION_FAILED'; details: string };

export interface CanonicalizeOutput {
  /// The canonicalized JSON string (RFC 8785).
  readonly canonicalJson: string;
  /// UTF-8 bytes of the canonical JSON, what gets hashed.
  readonly canonicalBytes: Uint8Array;
  /// 0x-prefixed bytes32 SHA-256 of canonicalBytes.
  readonly credentialHash: Bytes32Hex;
}

/// Validate against the registered JSON schema for the given (type, version),
/// then canonicalize per RFC 8785, then SHA-256 → bytes32. The output `credentialHash`
/// is what gets registered on-chain.
export function canonicalizeCredential(
  credential: CanonicalCredential,
): Result<CanonicalizeOutput, CanonicalizeError> {
  const validator = getValidator(credential.credentialType, credential.schemaVersion);
  const valid = validator(credential);
  if (!valid) {
    const details =
      validator.errors?.map((e) => `${e.instancePath || '/'} ${e.message ?? 'invalid'}`) ?? [];
    return err({ code: 'SCHEMA_INVALID', details });
  }

  let canonicalJson: string | undefined;
  try {
    canonicalJson = canonicalize(credential);
  } catch (e: unknown) {
    return err({
      code: 'CANONICALIZATION_FAILED',
      details: e instanceof Error ? e.message : String(e),
    });
  }
  if (canonicalJson === undefined) {
    return err({ code: 'CANONICALIZATION_FAILED', details: 'canonicalize returned undefined' });
  }

  const canonicalBytes = new TextEncoder().encode(canonicalJson);
  const credentialHash = sha256Bytes32(canonicalBytes);
  return ok({ canonicalJson, canonicalBytes, credentialHash });
}

/// Re-canonicalize a fetched canonical JSON blob and re-hash to verify integrity.
export function rehash(canonicalBytes: Uint8Array): Bytes32Hex {
  return sha256Bytes32(canonicalBytes);
}
