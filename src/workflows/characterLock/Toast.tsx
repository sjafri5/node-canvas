import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
  message: string;
  durationMs?: number;
  onDismiss: () => void;
}

export function Toast({ message, durationMs = 4000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onDismiss]);

  if (!visible) return null;

  return createPortal(
    <div
      className="fixed bottom-6 right-6 rounded-lg px-4 py-3 text-sm font-medium shadow-lg"
      style={{ background: 'var(--accent)', color: '#fff', zIndex: 9999 }}
    >
      {message}
    </div>,
    document.body,
  );
}
