import { ReactNode } from 'react';
import { Card, CardHeader } from './Card';
import { Badge } from './Badge';

type KpiTone = 'warning' | 'success' | 'danger' | 'primary' | 'secondary';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: KpiTone;
  badge?: string;
  description?: string;
  className?: string;
}

const toneStyles: Record<KpiTone, { icon: string; card: string; badge: 'warning' | 'success' | 'danger' | 'primary' | 'secondary' }> = {
  warning: { icon: 'bg-warning/10 text-warning', card: 'border-warning/20 bg-gradient-to-br from-warning/5 to-white', badge: 'warning' },
  success: { icon: 'bg-success/10 text-success', card: 'border-success/20 bg-gradient-to-br from-success/5 to-white', badge: 'success' },
  danger: { icon: 'bg-destructive/10 text-destructive', card: 'border-destructive/20 bg-gradient-to-br from-destructive/5 to-white', badge: 'danger' },
  primary: { icon: 'bg-primary/10 text-primary', card: 'border-primary/20 bg-gradient-to-br from-primary/5 to-white', badge: 'primary' },
  secondary: { icon: 'bg-secondary/10 text-secondary-foreground', card: 'border-border bg-gradient-to-br from-muted/60 to-white', badge: 'secondary' },
};

export function KpiCard({
  label,
  value,
  icon,
  tone = 'primary',
  badge,
  description,
  className = '',
}: KpiCardProps) {
  const styles = toneStyles[tone];

  return (
    <Card className={`${styles.card} shadow-sm ${className}`}>
      <CardHeader className="mb-0">
        <div className="flex items-center justify-between gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles.icon}`}>
            {icon}
          </div>
          {badge ? <Badge variant={styles.badge}>{badge}</Badge> : null}
        </div>
        <div className="mt-4 text-sm font-medium text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
      </CardHeader>
    </Card>
  );
}
