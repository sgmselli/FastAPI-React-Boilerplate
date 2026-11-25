import { Loading } from "../../components/Loading";

interface StepButtonProps {
    label: string;
    type?: "button" | "submit";
    onClick?: () => void;
    loading?: boolean;
    disabled?: boolean;
}

export const StepButton: React.FC<StepButtonProps> = ({ label, type = "button", onClick, loading = false, disabled = false }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={loading || disabled}
        className={`btn btn-lg text-[15px] fastapi-color-bg surface-color font-medium rounded-lg btn-block ${disabled && !loading ? "opacity-50" : ""}`}
        aria-label={`${label} button`}
    >
        {loading ? <Loading size="sm" className="surface-color" /> : label}
    </button>
);
