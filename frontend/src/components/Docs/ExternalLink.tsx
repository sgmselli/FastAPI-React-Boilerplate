import type { ReactNode } from "react";

export const ExternalLink: React.FC<{ href: string; children: ReactNode }> = ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
        {children}
    </a>
);
