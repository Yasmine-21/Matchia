interface MatchiaLogoProps {
  className?: string;
  markClassName?: string;
  variant?: 'full' | 'icon';
  showText?: boolean;
  textClassName?: string;
}

export function MatchiaLogo({
  className = '',
  markClassName = 'h-10 w-auto',
  variant = 'full',
}: MatchiaLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={variant === 'icon' ? '/logos/matchia-icon.png' : '/logos/matchia-logo.png'}
        alt="Matchia"
        className={`shrink-0 object-contain ${markClassName}`}
      />
    </div>
  );
}
