import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '@/components/ThemeToggle';

const mockSetTheme = jest.fn();
jest.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    setTheme: mockSetTheme,
  }),
}));

describe('ThemeToggle Component', () => {
  it('renders correctly and allows theme toggling', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });
});
