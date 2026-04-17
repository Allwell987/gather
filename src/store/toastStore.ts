import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastPayload {
  title: string;
  message?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastState {
  currentToast: (Omit<ToastPayload, 'variant' | 'duration'> & {
    id: number;
    variant: ToastVariant;
    duration: number;
  }) | null;
  showToast: (payload: ToastPayload) => void;
  hideToast: () => void;
}

let hideToastTimeout: ReturnType<typeof setTimeout> | null = null;

const clearHideToastTimeout = () => {
  if (hideToastTimeout) {
    clearTimeout(hideToastTimeout);
    hideToastTimeout = null;
  }
};

export const useToastStore = create<ToastState>((set) => ({
  currentToast: null,
  showToast: (payload) => {
    clearHideToastTimeout();

    const nextToast = {
      id: Date.now(),
      variant: payload.variant ?? 'info',
      duration: payload.duration ?? 2800,
      title: payload.title,
      message: payload.message,
    };

    set({ currentToast: nextToast });

    hideToastTimeout = setTimeout(() => {
      set({ currentToast: null });
      hideToastTimeout = null;
    }, nextToast.duration);
  },
  hideToast: () => {
    clearHideToastTimeout();
    set({ currentToast: null });
  },
}));
