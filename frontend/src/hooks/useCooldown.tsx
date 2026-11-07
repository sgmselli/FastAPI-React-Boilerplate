import { useCallback, useEffect, useState } from "react";

export default function useCooldown(seconds: number, startActive = false) {
    const [secondsLeft, setSecondsLeft] = useState<number>(startActive ? seconds : 0);

    useEffect(() => {
        if (secondsLeft <= 0) return;

        const timer = setTimeout(() => setSecondsLeft((left) => left - 1), 1000);
        return () => clearTimeout(timer);
    }, [secondsLeft]);

    const start = useCallback(() => setSecondsLeft(seconds), [seconds]);

    return { secondsLeft, start };
}
