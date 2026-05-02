import type { CredentialType } from '@veritrust/shared-types';
import degreeSchema from '../schemas/degree.v1.json';
import certificateSchema from '../schemas/certificate.v1.json';
import idSchema from '../schemas/id.v1.json';

export type JsonSchema = Record<string, unknown>;

export const SCHEMA_VERSIONS = {
  DEGREE: '1.0.0',
  CERTIFICATE: '1.0.0',
  ID: '1.0.0',
} as const satisfies Record<CredentialType, string>;

const SCHEMAS: Record<CredentialType, Record<string, JsonSchema>> = {
  DEGREE: { '1.0.0': degreeSchema as JsonSchema },
  CERTIFICATE: { '1.0.0': certificateSchema as JsonSchema },
  ID: { '1.0.0': idSchema as JsonSchema },
};

export function getSchema(type: CredentialType, version: string): JsonSchema {
  const byVersion = SCHEMAS[type];
  const schema = byVersion[version];
  if (!schema) {
    throw new Error(`No schema registered for ${type}@${version}`);
  }
  return schema;
}

export function getActiveSchema(type: CredentialType): { version: string; schema: JsonSchema } {
  const version = SCHEMA_VERSIONS[type];
  return { version, schema: getSchema(type, version) };
}

export function listSchemas(): ReadonlyArray<{
  type: CredentialType;
  version: string;
  schema: JsonSchema;
}> {
  const out: Array<{ type: CredentialType; version: string; schema: JsonSchema }> = [];
  for (const type of Object.keys(SCHEMAS) as CredentialType[]) {
    for (const [version, schema] of Object.entries(SCHEMAS[type])) {
      out.push({ type, version, schema });
    }
  }
  return out;
}

export { degreeSchema, certificateSchema, idSchema };
