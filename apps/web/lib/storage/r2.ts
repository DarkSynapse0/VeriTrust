import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getEnv } from '../env';

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  const env = getEnv();
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 is not configured (R2_ACCOUNT_ID / keys missing)');
  }
  client = new S3Client({
    region: 'auto',
    endpoint: env.R2_ENDPOINT ?? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

export async function putCanonicalJson(
  key: string,
  bytes: Uint8Array,
): Promise<{ key: string; size: number }> {
  const env = getEnv();
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_CANONICAL,
      Key: key,
      Body: Buffer.from(bytes),
      ContentType: 'application/json',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return { key, size: bytes.byteLength };
}

export async function getCanonicalJson(key: string): Promise<Uint8Array> {
  const env = getEnv();
  const r = await getClient().send(
    new GetObjectCommand({ Bucket: env.R2_BUCKET_CANONICAL, Key: key }),
  );
  if (!r.Body) throw new Error(`R2 object not found: ${key}`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of r.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export async function putPdf(key: string, pdf: Uint8Array): Promise<void> {
  const env = getEnv();
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_PDFS,
      Key: key,
      Body: Buffer.from(pdf),
      ContentType: 'application/pdf',
      CacheControl: 'public, max-age=86400',
    }),
  );
}

export function canonicalJsonKey(credentialId: string): string {
  return `canonical/${credentialId}.json`;
}

export function pdfKey(credentialId: string): string {
  return `pdfs/${credentialId}.pdf`;
}
