type LoadingProps = {
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    className?: string;
};

const sizeClasses = {
    xs: "loading-xs",
    sm: "loading-sm",
    md: "loading-md",
    lg: "loading-lg",
    xl: "loading-xl",
};

export const Loading = ({ size = "xl", className = "fastapi-color" }: LoadingProps) => {
    return (
        <span className={`loading loading-spinner ${sizeClasses[size]} ${className}`}></span>
    );
};
