interface MatchiaLogoProps {
  className?: string;
  markClassName?: string;
  variant?: 'full' | 'icon';
  showText?: boolean;
  textClassName?: string;
  brandText?: boolean;
}

export function MatchiaLogo({
  className = '',
  markClassName = 'h-10 w-auto',
  variant = 'full',
  showText = false,
  textClassName = 'text-base font-semibold',
  brandText = false,
}: MatchiaLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={variant === 'icon' ? '/logos/matchia-icon.svg' : '/logos/matchia-full.svg'}
        alt="Matchia"
        className={`shrink-0 object-contain ${markClassName}`}
      />
      {showText && (
        brandText ? (
          <span className={textClassName}>
            <span className="text-blue-600">Match</span>
            <span className="text-orange-500">ia</span>
          </span>
        ) : (
          <span className={textClassName}>Matchia</span>
        )
      )}
    </div>
  );
}
