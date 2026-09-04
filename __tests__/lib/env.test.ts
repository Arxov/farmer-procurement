import { validateEnv } from '@/lib/env';

describe('Environment Validator', () => {
  it('validates environment with valid supabase credentials', () => {
    const validConfig = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'valid-anon-key-123',
      SUPABASE_SERVICE_ROLE_KEY: 'valid-service-key-456',
      NODE_ENV: 'test' as const,
    };

    const result = validateEnv(validConfig as any);
    expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(result.NODE_ENV).toBe('test');
  });

  it('throws an error on invalid supabase URL format', () => {
    const invalidConfig = {
      NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    };

    expect(() => validateEnv(invalidConfig as any)).toThrow();
  });
});
