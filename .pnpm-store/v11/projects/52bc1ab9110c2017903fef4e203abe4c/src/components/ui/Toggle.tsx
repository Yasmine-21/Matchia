import { motion } from 'motion/react';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ enabled, onChange, label, disabled }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        className={`relative w-11 h-6 rounded-full transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${enabled ? 'bg-primary' : 'bg-switch-background'}`}
        onClick={() => !disabled && onChange(!enabled)}
      >
        <motion.div
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
          animate={{ x: enabled ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}
