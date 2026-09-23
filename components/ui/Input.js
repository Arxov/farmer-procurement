import React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-14 w-full rounded-md bg-[var(--chassis)] px-6 py-2 text-sm font-mono shadow-recessed transition-shadow duration-300",
        "border-none outline-none",
        "placeholder:text-[var(--text-muted)] placeholder:opacity-70",
        "focus-visible:shadow-[var(--shadow-recessed),0_0_0_2px_var(--accent)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';
