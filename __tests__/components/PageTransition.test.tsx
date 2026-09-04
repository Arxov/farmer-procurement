import React from 'react';
import { render, screen } from '@testing-library/react';
import PageTransition from '@/components/PageTransition';

describe('PageTransition Component', () => {
  it('renders children properly with custom classes', () => {
    render(
      <PageTransition className="custom-test-class">
        <p>Animated Content</p>
      </PageTransition>
    );

    const element = screen.getByText('Animated Content');
    expect(element).toBeInTheDocument();
    expect(element.parentElement).toHaveClass('custom-test-class');
  });
});
