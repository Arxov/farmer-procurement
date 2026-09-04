import React from 'react';
import { render, screen } from '@testing-library/react';
import CropBadge from '@/components/CropBadge';

describe('CropBadge Component', () => {
  it('renders null when name is not provided', () => {
    const { container } = render(<CropBadge name={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders crop icon and name for Wheat', () => {
    render(<CropBadge name="Wheat" size="sm" />);
    expect(screen.getByText('🌾')).toBeInTheDocument();
    expect(screen.getByText('Wheat')).toBeInTheDocument();
  });

  it('renders correctly with different sizes', () => {
    const { rerender } = render(<CropBadge name="Paddy" size="xs" />);
    expect(screen.getByText('Paddy')).toBeInTheDocument();

    rerender(<CropBadge name="Paddy" size="md" />);
    expect(screen.getByText('Paddy')).toBeInTheDocument();
  });
});
