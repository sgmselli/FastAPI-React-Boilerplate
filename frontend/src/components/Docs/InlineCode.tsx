import type { ReactNode } from "react";

export const InlineCode: React.FC<{ children: ReactNode }> = ({ children }) => (
    <code className="px-1.5 py-0.5 rounded bg-gray-100 font-mono text-[0.9em] text-gray-900 wrap-anywhere">{children}</code>
);
