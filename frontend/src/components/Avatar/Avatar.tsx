interface AvatarProps {
    initials: string;
    className?: string;
}

// An SVG so the letters scale with whatever size the avatar is given
export const Avatar: React.FC<AvatarProps> = ({ initials, className = "h-10 w-10" }) => (
    <svg
        viewBox="0 0 40 40"
        aria-hidden="true"
        className={`${className} rounded-full fastapi-color-bg flex-shrink-0`}
    >
        <text
            x="50%"
            y="50%"
            dominantBaseline="central"
            textAnchor="middle"
            fontSize="15"
            fontWeight="600"
            fill="white"
        >
            {initials}
        </text>
    </svg>
);
