import React from 'react';
import { cn } from '../../lib/utils';

export const Card = React.forwardRef(({ 
  className, 
  elevated = false,
  withScrews = true,
  withVents = false,
  children, 
  ...props 
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative bg-[var(--chassis)] rounded-2xl p-6 md:p-8 transition-all duration-300 ease-out",
        elevated ? "shadow-floating hover:-translate-y-1" : "shadow-card hover:shadow-floating hover:-translate-y-1",
        className
      )}
      {...props}
    >
      {/* Manufacturing Details: Corner Screws */}
      {withScrews && (
        <>
          <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-[radial-gradient(circle_at_2px_2px,rgba(0,0,0,0.1)_1px,transparent_1.5px)] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]" />
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[radial-gradient(circle_at_2px_2px,rgba(0,0,0,0.1)_1px,transparent_1.5px)] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]" />
          <div className="absolute bottom-3 left-3 w-2 h-2 rounded-full bg-[radial-gradient(circle_at_2px_2px,rgba(0,0,0,0.1)_1px,transparent_1.5px)] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]" />
          <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-[radial-gradient(circle_at_2px_2px,rgba(0,0,0,0.1)_1px,transparent_1.5px)] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]" />
        </>
      )}

      {/* Manufacturing Details: Vent Slots */}
      {withVents && (
        <div className="absolute top-4 right-8 flex gap-1.5 opacity-60">
          <div className="h-5 w-[3px] rounded-full bg-[var(--muted)] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]" />
          <div className="h-5 w-[3px] rounded-full bg-[var(--muted)] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]" />
          <div className="h-5 w-[3px] rounded-full bg-[var(--muted)] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]" />
        </div>
      )}

      {/* Content wrapper to stay above background details */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
});

Card.displayName = 'Card';
