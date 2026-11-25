interface CooldownNoticeProps {
    secondsLeft: number;
    // Finishes "You can ... in 30s.", e.g. "send another link"
    action: string;
}

export const CooldownNotice: React.FC<CooldownNoticeProps> = ({ secondsLeft, action }) => {
    if (secondsLeft <= 0) return null;

    return (
        <p className="text-sm text-gray-500">
            You can {action} in {secondsLeft}s.
        </p>
    );
};
