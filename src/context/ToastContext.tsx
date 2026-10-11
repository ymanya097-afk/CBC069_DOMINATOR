import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: Toast = { id, type, title, message };

    setToasts(prev => [...prev.slice(-4), newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((msg: string, title?: string) => showToast(msg, 'success', title), [showToast]);
  const error = useCallback((msg: string, title?: string) => showToast(msg, 'error', title), [showToast]);
  const info = useCallback((msg: string, title?: string) => showToast(msg, 'info', title), [showToast]);
  const warning = useCallback((msg: string, title?: string) => showToast(msg, 'warning', title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3">
        <AnimatePresence>
          {toasts.map(toast => {
            const isSuccess = toast.type === 'success';
            const isError = toast.type === 'error' || toast.type === 'warning';

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.18 }}
                className="pointer-events-auto bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-3 shadow-xs text-[#232b3d] dark:text-[#fffeff] flex items-start gap-2.5"
                style={{
                  borderLeftWidth: '3px',
                  borderLeftColor: isError ? '#232b3d' : '#3a6993'
                }}
              >
                <div className="mt-0.5 shrink-0">
                  {isSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-[#3a6993] dark:text-[#fffeff]" />
                  ) : isError ? (
                    <AlertCircle className="w-4 h-4 text-[#232b3d] dark:text-[#fffeff]" />
                  ) : (
                    <Info className="w-4 h-4 text-[#3a6993] dark:text-[#fffeff]" />
                  )}
                </div>

                <div className="flex-1 text-xs">
                  {toast.title && (
                    <div className="font-heading font-semibold text-[13px] leading-tight mb-0.5 text-[#232b3d] dark:text-[#fffeff]">
                      {toast.title}
                    </div>
                  )}
                  <div className="text-[#232b3d]/65 dark:text-[#fffeff]/70 leading-relaxed">
                    {toast.message}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="text-[#232b3d]/45 hover:text-[#232b3d] dark:text-[#fffeff]/45 dark:hover:text-[#fffeff] p-0.5 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
