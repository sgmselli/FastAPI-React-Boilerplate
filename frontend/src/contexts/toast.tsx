import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { CircleCheck } from "lucide-react";

const TOAST_DURATION_MS = 4000;

interface Toast {
  id: number;
  message: string;
}

interface ToastContextType {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(0);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        const pending = timers.current;
        return () => pending.forEach(clearTimeout);
    }, []);

    const showToast = useCallback((message: string) => {
        const id = nextId.current++;
        setToasts((prev) => [...prev, { id, message }]);

        timers.current.push(setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, TOAST_DURATION_MS));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {
                toasts.length > 0 && (
                    <div className="toast toast-bottom toast-start z-[100]">
                        {toasts.map(({ id, message }) => (
                            <div key={id} role="status" className="alert alert-success text-sm surface-color">
                                <CircleCheck className="h-5 w-5" />
                                <span>{message}</span>
                            </div>
                        ))}
                    </div>
                )
            }
        </ToastContext.Provider>
    );
}

// Same trade-off as useAuth - see contexts/auth.tsx
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)!;
