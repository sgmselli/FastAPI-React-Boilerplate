import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, User, LogOut } from "lucide-react";

interface UserMenuProps {
    name: string;
}

const items = [
    { label: "Account", to: "/account", icon: User },
    { label: "Logout", to: "/logout", icon: LogOut },
];

export const UserMenu: React.FC<UserMenuProps> = ({ name }) => {

    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-color cursor-pointer hover:bg-gray-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 transition-colors"
            >
                {name}
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 surface-color-bg shadow-md overflow-hidden z-50">
                    {items.map(({ label, to, icon: Icon }) => (
                        <Link
                            key={to}
                            to={to}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};
