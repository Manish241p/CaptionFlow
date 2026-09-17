import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-lg border shadow-xl transition-all duration-200 ${
            toast.type === 'success'
              ? 'bg-[#102A1E] border-[#10B981] text-[#E6F4EA]'
              : toast.type === 'error'
              ? 'bg-[#2D1619] border-[#EF4444] text-[#FEE2E2]'
              : toast.type === 'warning'
              ? 'bg-[#2A2312] border-[#F5B82E] text-[#FEF3C7]'
              : 'bg-[#161B22] border-[#252B33] text-white'
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm font-medium">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-[#F5B82E] shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-[#3B82F6] shrink-0" />}
            <span>{toast.text}</span>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="ml-3 text-gray-400 hover:text-white p-1 transition-colors"
            aria-label="Dismiss toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
