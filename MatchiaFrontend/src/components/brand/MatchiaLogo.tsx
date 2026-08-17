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
  markClassName = 'w-40',
  variant = 'full',
  showText = false,
  textClassName = 'text-base font-semibold',
  brandText = false,
}: MatchiaLogoProps) {
  const logo = variant === 'icon' ? (
    <img
      src="/matchia-favicon.png"
      alt="Matchia"
      className={`block h-auto shrink-0 object-contain ${markClassName}`}
    />
  ) : (
    <span
      className={`relative block aspect-[4.2/1] shrink-0 overflow-hidden ${markClassName}`}
    >
      <img
        src="/logos/matchia-original.png"
        alt="Matchia"
        className="absolute left-0 block h-auto w-full max-w-none object-contain"
        style={{ top: '-92%' }}
      />
    </span>
  );

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {logo}
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
