import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar/Navbar";
import { Footer } from "../components/Footer/Footer";
import { CompleteProfileBanner } from "../components/CompleteProfileBanner/CompleteProfileBanner";

interface PublicLayoutProps {
  fullWidth?: boolean;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ fullWidth = false }) => {

  return (
    <div className="flex flex-col items-center w-full min-h-screen">
      <div className="w-full z-50">
        <CompleteProfileBanner />
        <Navbar />
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
