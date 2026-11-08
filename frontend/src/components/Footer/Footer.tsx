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
        { label: "FAQ", to: "/faq" },
        { label: "Terms & conditions", to: "/terms-and-conditions" },
        { label: "Privacy policy", to: "/privacy-policy" },
    ];

    return (
        <footer className="w-full flex justify-center py-4 surface-color-bg">
            <div className="w-full px-4 sm:px-6 lg:px-10 flex flex-col-reverse lg:flex-row items-center justify-between gap-4 whitespace-nowrap">
                <p className="px-4 text-gray-700">
                    © FastAPI + React Boilerplate
                </p>
                <nav className="flex flex-col lg:flex-row items-center gap-1 lg:gap-2">
                    {links.map((link) => (
                        <Link key={link.to} to={link.to} className="px-4 py-2 rounded-full font-semibold text-color hover:bg-gray-100 transition-colors">
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </footer>
    )
}
