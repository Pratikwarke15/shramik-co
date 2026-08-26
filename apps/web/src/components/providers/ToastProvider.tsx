"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useState } from "react";
import { X } from "lucide-react";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "danger";
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <ToastPrimitive.Root
              key={t.id}
              open
              onOpenChange={() => removeToast(t.id)}
              className={`rounded-lg border p-4 shadow-lg animate-slide-up ${
                t.variant === "danger"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : t.variant === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <ToastPrimitive.Title className="font-semibold text-sm">{t.title}</ToastPrimitive.Title>
                  {t.description && (
                    <ToastPrimitive.Description className="mt-1 text-xs opacity-80">{t.description}</ToastPrimitive.Description>
                  )}
                </div>
                <ToastPrimitive.Close asChild>
                  <button className="opacity-60 hover:opacity-100">
                    <X className="h-4 w-4" />
                  </button>
                </ToastPrimitive.Close>
              </div>
            </ToastPrimitive.Root>
          ))}
        </div>
        <ToastPrimitive.Viewport />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
