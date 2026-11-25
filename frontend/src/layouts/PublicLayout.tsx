import { Link, NavLink, Outlet } from "react-router-dom";
import { CircleHelp, Info, LogIn, UserPlus } from "lucide-react";

import { useAuth } from "../contexts/auth";
import { Logo } from "../components/Logo";
import { getInitials } from "../utils/initials";
import { Footer } from "../components/Footer/Footer";
import { UserMenu } from "../components/Navbar/UserMenu";
import { MobileMenu } from "../components/Navbar/MobileMenu";
import type { MobileMenuItem } from "../components/Navbar/MobileMenu";

const pageItems: MobileMenuItem[] = [
    { label: "FAQ", to: "/faq", icon: CircleHelp },
    { label: "About us", to: "/about-us", icon: Info },
];

const guestItems: MobileMenuItem[] = [
    { label: "Log in", to: "/login", icon: LogIn },
    { label: "Sign up", to: "/register", icon: UserPlus },
];

const pillClass = "px-4 py-2 rounded-full font-semibold text-color hover:bg-gray-100 transition-colors";

const PublicNavbar: React.FC = () => {

    const { user, isAuthenticated, loadingUser } = useAuth();
    const signedIn = isAuthenticated() && user;

    return (
        <nav aria-label="Main" className="w-full flex justify-center py-4 surface-color-bg">
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
                                <UserMenu name={user.display_name} initials={getInitials(user)} />
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

interface PublicLayoutProps {
  fullWidth?: boolean;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ fullWidth = false }) => {

  return (
    <div className="flex flex-col items-center w-full min-h-screen">
      <div className="w-full z-50">
        <PublicNavbar />
      </div>

      <main className={fullWidth ? "flex-1 w-full" : "flex-1 w-[90%] sm:w-[70%] max-w-[1200px]"}>
        <Outlet />
      </main>

      <div className="w-full">
        <Footer />
      </div>
    </div>
  );
};
