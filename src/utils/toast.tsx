import { createRoot } from "react-dom/client";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastContainer: HTMLDivElement | null = null;
let toasts: Toast[] = [];

function ensureContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

function renderToasts() {
  const container = ensureContainer();
  const root = createRoot(container);
  
  root.render(
    <>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: toast.type === "error" ? "#f44336" : 
                       toast.type === "success" ? "#4caf50" :
                       toast.type === "warning" ? "#ff9800" : "#2196f3",
            color: "#fff",
            padding: "14px 20px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            minWidth: "300px",
            maxWidth: "400px",
            fontSize: "14px",
            fontWeight: 500,
            pointerEvents: "auto",
            animation: "slideInRight 0.3s ease-out",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: "20px",
              lineHeight: 1,
              padding: 0,
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  renderToasts();
}

export function showToast(message: string, type: ToastType = "info", duration: number = 5000) {
  const id = Math.random().toString(36).substr(2, 9);
  toasts.push({ id, message, type });
  renderToasts();

  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }
}

export function showSuccessToast(message: string, duration?: number) {
  showToast(message, "success", duration);
}

export function showErrorToast(message: string, duration?: number) {
  showToast(message, "error", duration);
}

export function showInfoToast(message: string, duration?: number) {
  showToast(message, "info", duration);
}

export function showWarning(message: string, duration?: number) {
  showToast(message, "warning", duration);
}

export function showInfo(message: string, duration?: number) {
  showToast(message, "info", duration);
}

export function showError(message: string, duration?: number) {
  showToast(message, "error", duration);
}










