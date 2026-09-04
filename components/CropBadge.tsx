import React from 'react';
import { getCropConfig } from '../lib/cropIcons';

export interface CropBadgeProps {
  name?: string | null;
  size?: 'xs' | 'sm' | 'md';
}

export default function CropBadge({ name, size = 'sm' }: CropBadgeProps) {
  if (!name) return null;
  const { icon, badgeBg, badgeText, badgeBorder } = getCropConfig(name);

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-sm px-2.5 py-1 gap-2',
  }[size] || 'text-xs px-2 py-0.5 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${badgeBg} ${badgeText} ${badgeBorder} ${sizeClasses} select-none shadow-2xs`}
      title={`Crop: ${name}`}
    >
      <span className="leading-none">{icon}</span>
      <span className="leading-none truncate max-w-[120px]">{name}</span>
    </span>
  );
}
