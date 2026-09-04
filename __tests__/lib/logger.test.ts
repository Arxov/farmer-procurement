import { logger } from '@/lib/logger';

describe('Logger Utility', () => {
  it('formats info log entries correctly', () => {
    const entry = logger.info('Test info message', { userId: '123' });
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('Test info message');
    expect(entry.context).toEqual({ userId: '123' });
    expect(entry.timestamp).toBeDefined();
  });

  it('captures error stack and message in error logs', () => {
    const testError = new Error('Test exception message');
    const entry = logger.error('Operation failed', testError, { action: 'upload' });
    expect(entry.level).toBe('error');
    expect(entry.message).toBe('Operation failed');
    expect(entry.error?.message).toBe('Test exception message');
    expect(entry.error?.stack).toBeDefined();
  });
});
