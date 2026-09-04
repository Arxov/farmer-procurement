import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '@/components/Skeleton';

describe('EmptyState Component', () => {
  it('renders default title and description', () => {
    render(<EmptyState />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
    expect(screen.getByText('There are no records to display yet.')).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(
      <EmptyState
        title="No Bookings Today"
        description="There are currently no procurement bookings scheduled."
      />
    );
    expect(screen.getByText('No Bookings Today')).toBeInTheDocument();
    expect(
      screen.getByText('There are currently no procurement bookings scheduled.')
    ).toBeInTheDocument();
  });

  it('renders action button and triggers callback on click', () => {
    const onActionMock = jest.fn();
    render(
      <EmptyState
        title="Empty"
        description="Nothing here"
        actionText="Book First Slot"
        onAction={onActionMock}
      />
    );

    const button = screen.getByRole('button', { name: /Book First Slot/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onActionMock).toHaveBeenCalledTimes(1);
  });
});
