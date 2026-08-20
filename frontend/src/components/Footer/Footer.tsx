import { Link } from "react-router-dom"
import { useAuth } from "../../contexts/auth"

export const Footer: React.FC = () => {

    const { isAuthenticated, loadingUser } = useAuth();

    const authLinks = loadingUser
        ? []
        : isAuthenticated()
            ? [{ label: "Account", to: "/account" }]
            : [{ label: "Login", to: "/login" }, { label: "Register", to: "/register" }];

    const links = [
        ...authLinks,
        { label: "About Us", to: "/about-us" },
        { label: "Terms & conditions", to: "/terms-and-conditions" },
        { label: "Privacy policy", to: "/privacy-policy" },
    ];

    return (
        <footer className="w-full flex justify-center border-t border-gray-200 surface-color-bg py-6">
            <div className="w-[70%] max-w-[1200px] flex items-center justify-between gap-4 whitespace-nowrap overflow-x-auto text-sm">
                <p className="text-gray-700">
                    © 2026 FastAPI + React Boilerplate. All rights reserved.
                </p>
                <nav className="flex items-center gap-2 text-blue-600">
                    {links.map((link, idx) => (
                        <span key={link.to} className="flex items-center gap-2">
                            <Link to={link.to} className="hover:underline">{link.label}</Link>
                            {idx < links.length - 1 && <span className="text-gray-300">|</span>}
                        </span>
                    ))}
                </nav>
            </div>
        </footer>
    )
}
