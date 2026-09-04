import { getCropConfig, CROP_CONFIGS, DEFAULT_CROP_CONFIG } from '@/lib/cropIcons';

describe('cropIcons utility', () => {
  it('returns default crop config for undefined or null', () => {
    expect(getCropConfig(undefined)).toEqual(DEFAULT_CROP_CONFIG);
    expect(getCropConfig(null)).toEqual(DEFAULT_CROP_CONFIG);
    expect(getCropConfig('')).toEqual(DEFAULT_CROP_CONFIG);
  });

  it('correctly maps wheat keyword case-insensitively', () => {
    const res = getCropConfig('Wheat Grade A');
    expect(res.icon).toBe('🌾');
    expect(res.badgeText).toBe('text-amber-900');
  });

  it('correctly maps paddy/rice keyword', () => {
    const resPaddy = getCropConfig('Basmati Paddy');
    expect(resPaddy.icon).toBe('🍚');
    const resRice = getCropConfig('Raw Rice 101');
    expect(resRice.icon).toBe('🍚');
  });

  it('correctly maps cotton keyword', () => {
    const res = getCropConfig('Long Staple Cotton');
    expect(res.icon).toBe('☁️');
  });

  it('falls back to default for unknown commodity', () => {
    const res = getCropConfig('Exotic Organic Dragonfruit');
    expect(res).toEqual(DEFAULT_CROP_CONFIG);
  });
});
