import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { Logo } from "../components/Logo";
import { SidebarUserMenu } from "../components/SidebarUserMenu/SidebarUserMenu";
import { docsPath, docsSteps, firstDocsPath } from "../pages/Docs/steps";

const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
        isActive ? "bg-gray-200/70 text-color" : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
    }`;

const StepLinks: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => (
    <>
        {docsSteps.map(({ slug, title }, idx) => (
            <NavLink key={slug} to={docsPath(slug)} onClick={onNavigate} className={linkClass}>
                {({ isActive }) => (
                    <>
                        <span
                            aria-hidden="true"
                            className={`h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-semibold ${
                                isActive ? "fastapi-color-bg text-white" : "bg-gray-200 text-gray-600"
                            }`}
                        >
                            {idx + 1}
                        </span>
                        {title}
                    </>
                )}
            </NavLink>
        ))}
    </>
);

const SidebarContent: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => (
    <div className="h-full flex flex-col">
        <Link to={firstDocsPath} onClick={onNavigate} className="px-3 py-1">
            <div className="h-7 w-7">
                <Logo />
            </div>
        </Link>

        <nav aria-label="Documentation" className="mt-4 pt-2 border-t border-gray-200 flex-1 flex flex-col gap-1 overflow-y-auto">
            <StepLinks onNavigate={onNavigate} />
        </nav>

        <div className="pt-2 border-t border-gray-200">
            <SidebarUserMenu onNavigate={onNavigate} />
        </div>
    </div>
);

export const AppLayout: React.FC = () => {

    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="min-h-screen flex surface-color-bg">
            <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-0 h-screen bg-gray-50 border-r border-gray-200 px-4 pt-6 pb-3">
                <SidebarContent />
            </aside>

            {menuOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
                    <aside className="relative w-64 h-full bg-gray-50 px-4 pt-6 pb-3 shadow-xl">
                        <button
                            onClick={() => setMenuOpen(false)}
                            aria-label="Close menu"
                            className="absolute top-5 right-4 p-2 rounded-lg text-color cursor-pointer hover:bg-gray-200/70"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <SidebarContent onNavigate={() => setMenuOpen(false)} />
                    </aside>
                </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col">
                <header className="lg:hidden flex items-center gap-2 px-4 py-4 border-b border-gray-200">
                    <button
                        onClick={() => setMenuOpen(true)}
                        aria-label="Open menu"
                        className="flex items-center justify-center p-2 rounded-lg text-color cursor-pointer hover:bg-gray-200/70"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <Link to={firstDocsPath} className="h-8 w-8">
                        <Logo />
                    </Link>
                </header>

                <main className="flex-1 w-full max-w-4xl px-6 lg:px-12 py-10">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
