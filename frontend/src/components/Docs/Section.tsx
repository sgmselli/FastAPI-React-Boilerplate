import type { ReactNode } from "react";

export const Section: React.FC<{ title?: string; children: ReactNode }> = ({ title, children }) => (
    <section className="flex flex-col gap-4">
        {title && <h2 className="text-2xl font-bold text-color">{title}</h2>}
        {children}
    </section>
);
