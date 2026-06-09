import { ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { MatchiaLogo } from './brand/MatchiaLogo';

interface SessionLoaderProps {
  children: ReactNode;
}

/**
 * SessionLoader - Prevents rendering protected routes during initial session load
 * Shows a loading state while localStorage is being read and session is restored
 */
export function SessionLoader({ children }: SessionLoaderProps) {
  const { isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-4"
        >
          <MatchiaLogo variant="icon" showText={false} markClassName="w-12 h-12" />
          <p className="text-muted-foreground">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
