/**
 * ToastContainer Component (Issue #335, #338)
 *
 * Renders all active toasts from ToastContext.
 * Placed at app root level to ensure toasts appear above all content.
 */

import { useToast } from '../contexts/ToastContext';
import { Toast } from './Toast';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div aria-label="Notifications" role="region">
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
          index={index}
        />
      ))}
    </div>
  );
}

export default ToastContainer;
