import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  toast: { message: string; type: 'ok' | 'error' } | null;
}

export function Toast({ toast }: ToastProps) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl bg-surf2 border border-border-hover text-sm font-medium shadow-2xl ${
            toast.type === 'error' ? 'border-l-4 border-l-red text-red' : 'border-l-4 border-l-green text-green'
          }`}
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
