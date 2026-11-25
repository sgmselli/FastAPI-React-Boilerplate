import { Outlet } from "react-router-dom";

import { Logo } from "../components/Logo";
import { Footer } from "../components/Footer/Footer";

const CompleteProfileNavbar: React.FC = () => (
    <nav aria-label="Main" className="w-full flex justify-center py-4 surface-color-bg">
        <div className="w-full px-4 sm:px-6 lg:px-10 flex items-center">
            <div className="h-8 w-8 flex-shrink-0">
                <Logo />
            </div>
        </div>
    </nav>
);

export const CompleteProfileLayout: React.FC = () => {

    return (
        <div className="flex flex-col items-center w-full min-h-screen">
            <div className="w-full z-50">
                <CompleteProfileNavbar />
            </div>

            <main className="flex-1 w-[90%] sm:w-[70%] max-w-[1200px]">
                <Outlet />
            </main>

            <div className="w-full">
                <Footer />
            </div>
        </div>
    );
};
