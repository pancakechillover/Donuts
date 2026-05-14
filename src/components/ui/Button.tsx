import React, { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'good' | 'ghost';
}

export function Button({ className, variant = 'default', children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-md px-4 py-1.5 text-sm font-medium shadow-sm transition-colors duration-150 disabled:opacity-50 select-none",
        variant === 'default' && "border border-[var(--line)] bg-[var(--panel)] text-[var(--text)] hover:bg-[var(--panel2)]",
        variant === 'primary' && "border border-transparent bg-[var(--accent)] text-white hover:opacity-90",
        variant === 'danger' && "border border-transparent bg-[var(--bad)] text-white hover:opacity-90",
        variant === 'good' && "border border-transparent bg-[var(--good)] text-white hover:opacity-90",
        variant === 'ghost' && "bg-transparent text-[var(--muted)] hover:text-[var(--text)] shadow-none hover:bg-[var(--line)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
