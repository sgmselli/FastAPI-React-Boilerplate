import { useEffect } from "react";

export default function usePageTitle(title: string | null | undefined) {
    useEffect(() => {
        if (!title) return;
        document.title = `${title}`;
    }, [title]);
}