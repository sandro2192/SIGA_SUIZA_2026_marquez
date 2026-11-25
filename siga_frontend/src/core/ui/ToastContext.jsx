import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

/**
 * ToastItem representa un mensaje flotante individual.
 */
function ToastItem({ toast, onClose }) {
  const { id, type, message, title, duration } = toast;

  useEffect(() => {
    if (!duration || duration <= 0) return;
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const config = {
    success: {
      container: 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-emerald-500/10',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />,
      testid: 'toast-success',
      badge: 'bg-emerald-100 text-emerald-800',
    },
    error: {
      container: 'bg-rose-50 border-rose-300 text-rose-950 shadow-rose-500/10',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />,
      testid: 'toast-error',
      badge: 'bg-rose-100 text-rose-800',
    },
    warning: {
      container: 'bg-amber-50 border-amber-300 text-amber-950 shadow-amber-500/10',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />,
      testid: 'toast-warning',
      badge: 'bg-amber-100 text-amber-800',
    },
    info: {
      container: 'bg-blue-50 border-blue-300 text-blue-950 shadow-blue-500/10',
      icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />,
      testid: 'toast-info',
      badge: 'bg-blue-100 text-blue-800',
    },
  }[type] || {
    container: 'bg-slate-50 border-slate-300 text-slate-900 shadow-slate-500/10',
    icon: <Info className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />,
    testid: 'toast-info',
    badge: 'bg-slate-100 text-slate-800',
  };

  return (
    <div
      data-testid="toast-item"
      data-toast-type={type}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 animate-fade-in ${config.container}`}
      role="alert"
    >
      <span data-testid={config.testid} className="inline-flex items-center">
        {config.icon}
      </span>
      <div className="flex-1 text-sm font-medium leading-relaxed break-words">
        {title ? (
          <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider mb-1 ${config.badge}`}>
            {title}
          </span>
        ) : null}
        {message}
      </div>
      <button
        type="button"
        data-testid="toast-close"
        onClick={() => onClose(id)}
        aria-label="Cerrar notificación"
        className="text-slate-400 hover:text-slate-700 transition p-1 -mr-1 -mt-1 rounded-lg focus:outline-none"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * ToastContainer renderiza las notificaciones en document.body mediante portal.
 */
function ToastContainer({ toasts, onClose }) {
  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <div
      data-testid="toast-container"
      className="fixed top-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm sm:max-w-md w-full px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>,
    document.body
  );
}

/**
 * Proveedor de Notificaciones Flotantes (ToastProvider).
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback((type, message, duration, title) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, type, message, duration, title }]);
    return id;
  }, []);

  // Segundo argumento flexible: si es un número es la duración (ms); si es
  // texto se interpreta como título del toast. Antes un título (p.ej.
  // toast.error(msg, 'Error de Conexión')) se usaba como duración y el
  // mensaje desaparecía de inmediato, dejando la operación sin feedback.
  const emit = useCallback((type, defaultDuration) => (msg, segundoArg) => {
    const title = typeof segundoArg === 'string' ? segundoArg : undefined;
    const duration = typeof segundoArg === 'number' ? segundoArg : defaultDuration;
    return addToast(type, msg, duration, title);
  }, [addToast]);

  const success = useCallback(emit('success', 4000), [emit]);
  const error = useCallback(emit('error', 6000), [emit]);
  const warning = useCallback(emit('warning', 5000), [emit]);
  const info = useCallback(emit('info', 4000), [emit]);

  // INTERCEPTOR GLOBAL: Erradicar al 100% las ventanas emergentes nativas del navegador (window.alert y window.prompt)
  useEffect(() => {
    const originalAlert = window.alert;
    const originalPrompt = window.prompt;

    window.prompt = (message) => {
      console.warn('Native window.prompt was intercepted and blocked:', message);
      addToast({ type: 'warning', title: 'Aviso del Sistema', message: typeof message === 'string' ? message : 'Entrada bloqueada' });
      return null;
    };

    window.alert = (message) => {
      try {
        const text = typeof message === 'object' ? JSON.stringify(message) : String(message ?? '');
        const lower = text.toLowerCase();
        if (
          lower.includes('error') || 
          lower.includes('falló') || 
          lower.includes('no se pudo') || 
          text.includes('❌') || 
          lower.includes('bloquead') ||
          lower.includes('inválid')
        ) {
          addToast('error', text);
        } else if (
          lower.includes('éxito') || 
          lower.includes('correctamente') || 
          lower.includes('exitos') || 
          text.includes('✅') || 
          lower.includes('guardad') ||
          lower.includes('actualizad')
        ) {
          addToast('success', text);
        } else if (
          lower.includes('advertencia') || 
          lower.includes('atención') || 
          text.includes('⚠️')
        ) {
          addToast('warning', text);
        } else {
          addToast('info', text);
        }
      } catch (err) {
        console.warn('Error intercepting window.alert:', err);
      }
    };

    return () => {
      window.alert = originalAlert;
      window.prompt = originalPrompt;
    };
  }, [addToast]);

  const contextValue = {
    toast: {
      success,
      error,
      warning,
      info,
      dismiss: removeToast,
      clear: clearToasts,
    },
    success,
    error,
    warning,
    info,
    showSuccess: success,
    showError: error,
    showWarning: warning,
    showInfo: info,
    dismiss: removeToast,
    clear: clearToasts,
    toasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

/**
 * Hook para consumir las notificaciones en cualquier componente.
 * Soporta:
 * - const { toast } = useToast(); toast.success('...');
 * - const { showSuccess, showError } = useToast(); showSuccess('...');
 * - const toast = useToast(); toast.success('...');
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
}

export default ToastProvider;