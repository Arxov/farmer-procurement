import { useState, useEffect, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast: addToast }}>
      {children}
      {/* Toast Container */}
      {mounted && (
        <div role="region" aria-label="Notifications" className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map(toast => {
            const isSuccess = toast.type === 'success';
            const isError = toast.type === 'error';
            const isInfo = toast.type === 'info';

            return (
              <div
                key={toast.id}
                role="alert"
                aria-live="assertive"
                className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-xl text-sm border backdrop-blur-md transition-all duration-300 animate-slide-in ${
                  isSuccess
                    ? 'bg-emerald-800/95 text-white border-emerald-700'
                    : isError
                    ? 'bg-red-800/95 text-white border-red-700'
                    : 'bg-gray-900/95 text-white border-gray-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">
                    {isSuccess ? '✅' : isError ? '❌' : 'ℹ️'}
                  </span>
                  <span className="font-medium text-xs sm:text-sm">{toast.message}</span>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  aria-label="Close notification" className="ml-3 text-white/70 hover:text-white text-xs p-1 focus:ring-2 focus:ring-white rounded"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast: (msg) => console.log(msg) };
  }
  return context;
}
