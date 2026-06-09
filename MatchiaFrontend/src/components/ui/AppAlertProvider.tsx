import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface AppAlertProviderProps {
  children: ReactNode;
}

interface AlertState {
  message: string;
  title: string;
}

export function AppAlertProvider({ children }: AppAlertProviderProps) {
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const previousAlertRef = useRef<typeof window.alert | null>(null);

  const closeAlert = useCallback(() => {
    setAlertState(null);
  }, []);

  useEffect(() => {
    previousAlertRef.current = window.alert;

    window.alert = (message?: unknown) => {
      setAlertState({
        title: `${window.location.host} indique`,
        message: message === undefined || message === null ? '' : String(message),
      });
    };

    return () => {
      if (previousAlertRef.current) {
        window.alert = previousAlertRef.current;
      }
    };
  }, []);

  useEffect(() => {
    if (!alertState) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        closeAlert();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alertState, closeAlert]);

  return (
    <>
      {children}
      <AnimatePresence>
        {alertState && (
          <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/55 px-4 pt-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.16 }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="app-alert-title"
              aria-describedby="app-alert-message"
              className="w-full max-w-[450px] rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"
            >
              <h2 id="app-alert-title" className="text-base font-semibold text-slate-950">
                {alertState.title}
              </h2>
              <p id="app-alert-message" className="mt-4 min-h-8 text-sm leading-6 text-slate-900">
                {alertState.message}
              </p>
              <div className="mt-7 flex justify-end">
                <button
                  type="button"
                  onClick={closeAlert}
                  autoFocus
                  className="rounded-full border-2 border-blue-700 bg-blue-700 px-7 py-2 text-sm font-semibold text-white shadow-sm outline outline-2 outline-offset-2 outline-blue-700 transition-colors hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
