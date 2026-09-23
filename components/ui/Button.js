import React from 'react';
import { cn } from '../../lib/utils';

export const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'default', 
  children, 
  ...props 
}, ref) => {
  
  const baseStyles = "relative inline-flex items-center justify-center font-bold transition-all duration-150 ease-spring active:translate-y-[2px] select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-emerald-600 text-white uppercase tracking-wider border border-white/20 shadow-[4px_4px_8px_rgba(5,150,105,0.4),-4px_-4px_8px_rgba(16,185,129,0.2)] hover:brightness-110 active:shadow-[inset_4px_4px_8px_rgba(4,120,87,0.5),inset_-4px_-4px_8px_rgba(16,185,129,0.3)]",
    secondary: "bg-[var(--chassis)] text-slate-700 shadow-card hover:text-emerald-700 hover:-translate-y-[1px] hover:shadow-floating active:shadow-pressed",
    ghost: "text-slate-500 hover:bg-[var(--muted)] hover:shadow-recessed active:shadow-pressed"
  };

  const sizes = {
    sm: "h-10 px-4 text-xs rounded-md",
    default: "h-12 px-6 text-sm rounded-lg",
    lg: "h-14 px-8 text-base rounded-xl",
    icon: "h-12 w-12 rounded-full flex justify-center items-center"
  };

  return (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
