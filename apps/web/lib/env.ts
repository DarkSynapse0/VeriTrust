// Validated environment variables. Imported by every server-side module that
// needs config. Fails loud at import time if required variables are missing.

import { z } from 'zod';

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  SIWE_DOMAIN: z.string().default('localhost:3000'),

  NEXT_PUBLIC_CHAIN_ID: z.coerce.number().int().positive().default(80002),
  NEXT_PUBLIC_REGISTRY_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a 0x-prefixed 20-byte hex')
    .optional(),

  ALCHEMY_API_KEY: z.string().optional(),
  INFURA_API_KEY: z.string().optional(),
  POLYGON_AMOY_RPC_URL_PRIMARY: z.string().url().optional(),
  POLYGON_AMOY_RPC_URL_FALLBACK: z.string().url().optional(),

  DATABASE_URL: z.string().min(1).optional(),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_CANONICAL: z.string().default('veritrust-canonical'),
  R2_BUCKET_PDFS: z.string().default('veritrust-pdfs'),
  R2_ENDPOINT: z.string().url().optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),

  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_COOKIE_NAME: z.string().default('veritrust_session'),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  SIWE_NONCE_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  ALCHEMY_WEBHOOK_SIGNING_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cached: ServerEnv | undefined;

export function getEnv(): ServerEnv {
  if (cached) return cached;
  const result = ServerEnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = result.data;
  return cached;
}

/// Returns the configured Polygon Amoy RPC URL, picking primary→fallback→public.
export function getAmoyRpcUrl(): string {
  const env = getEnv();
  if (env.POLYGON_AMOY_RPC_URL_PRIMARY) return env.POLYGON_AMOY_RPC_URL_PRIMARY;
  if (env.ALCHEMY_API_KEY) return `https://polygon-amoy.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`;
  if (env.INFURA_API_KEY) return `https://polygon-amoy.infura.io/v3/${env.INFURA_API_KEY}`;
  return 'https://rpc-amoy.polygon.technology';
}

export function getAmoyFallbackRpcUrl(): string | null {
  const env = getEnv();
  if (env.POLYGON_AMOY_RPC_URL_FALLBACK) return env.POLYGON_AMOY_RPC_URL_FALLBACK;
  if (env.INFURA_API_KEY && env.ALCHEMY_API_KEY) {
    return `https://polygon-amoy.infura.io/v3/${env.INFURA_API_KEY}`;
  }
  return null;
}
