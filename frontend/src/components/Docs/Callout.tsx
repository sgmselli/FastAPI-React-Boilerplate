import type { ReactNode } from "react";

export const Callout: React.FC<{ children: ReactNode }> = ({ children }) => (
    <div className="border-l-4 border-amber-400 bg-amber-50 rounded-r-lg px-5 py-4 text-gray-800">
        {children}
    </div>
);
