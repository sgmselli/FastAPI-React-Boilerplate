import { useCallback, useEffect, useState } from "react";

// Mirror the backend settings of the same names, which ignore requests inside them
export const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

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
