import type { ReactNode } from "react";

export const List: React.FC<{ ordered?: boolean; children: ReactNode }> = ({ ordered = false, children }) => {
    const ListTag = ordered ? "ol" : "ul";
    return (
        <ListTag className={`${ordered ? "list-decimal" : "list-disc"} pl-6 flex flex-col gap-2`}>
            {children}
        </ListTag>
    );
};
