import { z } from 'zod';

/**
 * Centralized, validated runtime configuration.
 *
 * All secrets and environment-specific values are read from `process.env`
 * here (and only here) so nothing is hardcoded in the codebase. Validation
 * runs lazily on first access and fails fast with a clear message when a
 * required value is missing or malformed.
 *
 * See `.env.example` for the full list of supported variables.
 */
const envSchema = z.object({
  // Database
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1).default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1).default('lipi_local'),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),

  // Ollama / model
  OLLAMA_URL: z.string().url().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().min(1).default('gemma2:9b'),

  // File storage (kept OUT of the public/ web root so uploads are never
  // served statically; access must go through an authorized route).
  UPLOAD_DIR: z.string().min(1).default('uploads'),

  // Limits
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024), // 25 MB
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
