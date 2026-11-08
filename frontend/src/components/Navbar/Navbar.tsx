import { Link, NavLink } from "react-router-dom";
import { CircleHelp, Info, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../../contexts/auth";
import { Logo } from "../Logo";
import { UserMenu } from "./UserMenu";
import { MobileMenu } from "./MobileMenu";
import type { MobileMenuItem } from "./MobileMenu";

const pageItems: MobileMenuItem[] = [
    { label: "FAQ", to: "/faq", icon: CircleHelp },
    { label: "About us", to: "/about-us", icon: Info },
];

const guestItems: MobileMenuItem[] = [
    { label: "Log in", to: "/login", icon: LogIn },
    { label: "Sign up", to: "/register", icon: UserPlus },
];

const pillClass = "px-4 py-2 rounded-full font-semibold text-color hover:bg-gray-100 transition-colors";

export const Navbar: React.FC = () => {

    const { user, isAuthenticated, loadingUser } = useAuth();
    const signedIn = isAuthenticated() && user;

    return (
        <nav className="w-full flex justify-center py-4 surface-color-bg">
            <div className="w-full px-4 sm:px-6 lg:px-10 flex items-center gap-2 md:grid md:grid-cols-[1fr_auto_1fr]">
                <div className="flex items-center gap-2">
                    {!loadingUser && (
                        <div className="md:hidden">
                            <MobileMenu items={signedIn ? pageItems : [...pageItems, ...guestItems]} />
                        </div>
                    )}
                    <div className="hidden md:flex items-center gap-2">
                        {pageItems.map(({ label, to }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) => `${pillClass} ${isActive ? "bg-gray-100" : ""}`}
                            >
                                {label}
                            </NavLink>
                        ))}
                    </div>
                </div>

                <Link to="/" className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 flex-shrink-0">
                        <Logo />
                    </div>
                    <h1 className="hidden md:block text-sm font-regular text-gray-800 tracking-wide">
                        FASTAPI + REACT BOILERPLATE ®
                    </h1>
                </Link>

                <div className="ml-auto md:ml-0 flex items-center justify-end gap-2">
                    {
                        !loadingUser && (
                            signedIn ? (
                                <UserMenu name={user.display_name} pictureUrl={user.profile.profile_picture_url} />
                            ) : (
                                <div className="hidden md:flex items-center gap-2">
                                    <Link to="/login" className={pillClass}>Log in</Link>
                                    <Link to="/register" className="px-5 py-2.5 rounded-full font-semibold text-white fastapi-color-bg hover:opacity-90 transition-opacity">
                                        Sign up
                                    </Link>
                                </div>
                            )
                        )
                    }
                </div>
            </div>
        </nav>
    );
};
