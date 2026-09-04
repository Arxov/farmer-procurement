export interface CropConfig {
  icon: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const CROP_CONFIGS: Record<string, CropConfig> = {
  wheat: {
    icon: '🌾',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-300',
  },
  paddy: {
    icon: '🍚',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-300',
  },
  rice: {
    icon: '🍚',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-300',
  },
  cotton: {
    icon: '☁️',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
  },
  soybean: {
    icon: '🌱',
    badgeBg: 'bg-lime-100',
    badgeText: 'text-lime-900',
    badgeBorder: 'border-lime-300',
  },
  mustard: {
    icon: '🌼',
    badgeBg: 'bg-yellow-100',
    badgeText: 'text-yellow-900',
    badgeBorder: 'border-yellow-300',
  },
  gram: {
    icon: '🧆',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-900',
    badgeBorder: 'border-orange-300',
  },
  chana: {
    icon: '🧆',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-900',
    badgeBorder: 'border-orange-300',
  },
  tur: {
    icon: '🥣',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
  },
  arhar: {
    icon: '🥣',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
  },
  maize: {
    icon: '🌽',
    badgeBg: 'bg-yellow-50',
    badgeText: 'text-yellow-800',
    badgeBorder: 'border-yellow-200',
  },
  corn: {
    icon: '🌽',
    badgeBg: 'bg-yellow-50',
    badgeText: 'text-yellow-800',
    badgeBorder: 'border-yellow-200',
  },
  sugarcane: {
    icon: '🎋',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-900',
    badgeBorder: 'border-green-300',
  },
};

export const DEFAULT_CROP_CONFIG: CropConfig = {
  icon: '🌱',
  badgeBg: 'bg-green-50',
  badgeText: 'text-green-800',
  badgeBorder: 'border-green-200',
};

export function getCropConfig(commodityName?: string | null): CropConfig {
  if (!commodityName) return DEFAULT_CROP_CONFIG;
  const lower = commodityName.toLowerCase();
  for (const [key, conf] of Object.entries(CROP_CONFIGS)) {
    if (lower.includes(key)) {
      return conf;
    }
  }
  return DEFAULT_CROP_CONFIG;
}
