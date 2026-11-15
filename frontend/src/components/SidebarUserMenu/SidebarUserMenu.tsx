import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";

import { Avatar } from "../Avatar/Avatar";
import { useAuth } from "../../contexts/auth";

const items = [
    { label: "Settings", to: "/settings", icon: Settings },
    { label: "Logout", to: "/logout", icon: LogOut },
];

export const SidebarUserMenu: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {

    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open]);

    if (!user) return null;

    return (
        <div className="relative" ref={menuRef}>
            {open && (
                <div
                    id={menuId}
                    className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-gray-200 surface-color-bg shadow-md overflow-hidden z-50"
                >
                    {items.map(({ label, to, icon: Icon }) => (
                        <Link
                            key={to}
                            to={to}
                            onClick={() => {
                                setOpen(false);
                                onNavigate?.();
                            }}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </Link>
                    ))}
                </div>
            )}

            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                aria-controls={menuId}
                aria-label="Account menu"
                className="w-full flex items-center gap-3 px-3 py-1 rounded-lg text-color cursor-pointer hover:bg-gray-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 transition-colors"
            >
                <Avatar src={user.profile.profile_picture_url} className="h-6 w-6" />
                <span className="flex-1 min-w-0 truncate text-left text-sm font-medium">{user.display_name}</span>
            </button>
        </div>
    );
};
