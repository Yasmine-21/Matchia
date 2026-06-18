import { ReactNode, type CSSProperties } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | 'outline';
  className?: string;
  style?: CSSProperties;
}

export function Badge({ children, variant = 'default', className = '', style }: BadgeProps) {
  const variantClasses = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
    secondary: 'bg-secondary/10 text-secondary',
    outline: 'border border-border bg-transparent text-foreground',
  };

  return (
    <span
      style={style}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
