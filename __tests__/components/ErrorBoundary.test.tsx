import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '@/components/ErrorBoundary';

const ProblemChild = ({ shouldThrow }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Simulation of component crash');
  }
  return <div>Normal Content Rendering</div>;
};

describe('ErrorBoundary Component', () => {
  // Suppress console.error in tests for intentional throw
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal Content Rendering')).toBeInTheDocument();
  });

  it('renders fallback error alert when a child throws', () => {
    render(
      <ErrorBoundary sectionName="Procurement Queue">
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Failed to load Procurement Queue')).toBeInTheDocument();
    expect(screen.getByText('Simulation of component crash')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});
