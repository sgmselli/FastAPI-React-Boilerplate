import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/auth";
import { Logo } from "../Logo";
import { UserMenu } from "./UserMenu";

export const Navbar: React.FC = () => {

    const { user, isAuthenticated, loadingUser } = useAuth();

    return (
        <nav className="w-full flex justify-center py-4 border-b border-gray-200 surface-color-bg">
            <div className="w-[70%] max-w-[1200px] flex items-center justify-between">
                <Link to="/" className="flex items-center gap-4">
                    <div className="h-8 w-8 flex-shrink-0">
                        <Logo />
                    </div>
                    <h1 className="text-md font-regular text-gray-800 tracking-wide">
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
                                    <Link to="/login" className="text-blue-700 hover:underline">Login</Link>
                                    <Link to="/register" className="text-blue-700 hover:underline">Register</Link>
                                </>
                            )
                        )
                    }
                </div>
            </div>
        </nav>
    );
};
