import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .default('https://twkewkujjcohnujpvfwr.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1)
    .default('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .default('dummy-service-role-key'),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  SMS_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const validateEnv = (environment = process.env) => {
  const parsed = envSchema.safeParse(environment);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
};

export const env = validateEnv();
