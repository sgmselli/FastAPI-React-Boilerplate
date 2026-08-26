import { Link } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../../contexts/auth";
import { Logo } from "../Logo";
import { UserMenu } from "./UserMenu";
import { MobileMenu } from "./MobileMenu";
import type { MobileMenuItem } from "./MobileMenu";

const guestItems: MobileMenuItem[] = [
    { label: "Login", to: "/login", icon: LogIn },
    { label: "Register", to: "/register", icon: UserPlus },
];

export const Navbar: React.FC = () => {

    const { user, isAuthenticated, loadingUser } = useAuth();

    return (
        <nav className="w-full flex justify-center py-4 border-b border-gray-200 surface-color-bg">
            <div className="w-[90%] sm:w-[70%] max-w-[1200px] flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                        <Logo />
                    </div>
                    <h1 className="text-xs sm:text-md font-regular text-gray-800 tracking-wide">
                        FASTAPI + REACT BOILERPLATE
                    </h1>
                </Link>

                <div className="flex items-center gap-6 text-md">
                    {
                        !loadingUser && (
                            isAuthenticated() && user ? (
                                <UserMenu name={user.name} />
                            ) : (
                                <>
                                    <div className="hidden sm:flex items-center gap-6 text-blue-700 text-xs sm:text-md">
                                        {guestItems.map(({ label, to }) => (
                                            <Link key={to} to={to} className="hover:underline">{label}</Link>
                                        ))}
                                    </div>
                                    <div className="sm:hidden">
                                        <MobileMenu items={guestItems} />
                                    </div>
                                </>
                            )
                        )
                    }
                </div>
            </div>
        </nav>
    );
};
