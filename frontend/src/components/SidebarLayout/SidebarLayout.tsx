import { type ReactNode, useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogOut, Menu, Play, Settings, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Logo } from "../Logo";
import { CompleteProfileBanner } from "../CompleteProfileBanner/CompleteProfileBanner";

interface SidebarLink {
    label: string;
    to: string;
    icon: LucideIcon;
}

const docsLinks: SidebarLink[] = [
    { label: "Getting started", to: "/getting-started", icon: Play },
];

const footerLinks: SidebarLink[] = [
    { label: "Settings", to: "/settings", icon: Settings },
    { label: "Logout", to: "/logout", icon: LogOut },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
        isActive ? "bg-gray-200/70 text-color" : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
    }`;

const SidebarLinks: React.FC<{ links: SidebarLink[]; onNavigate?: () => void }> = ({ links, onNavigate }) => (
    <>
        {links.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={onNavigate} className={linkClass}>
                <Icon className="h-4 w-4" />
                {label}
            </NavLink>
        ))}
    </>
);

const SidebarContent: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => (
    <div className="h-full flex flex-col">
        <Link to="/getting-started" onClick={onNavigate} className="px-3 py-1">
            <div className="h-8 w-8">
                <Logo />
            </div>
        </Link>

        <nav aria-label="Documentation" className="mt-8 flex-1 flex flex-col gap-1 overflow-y-auto">
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Documentation</p>
            <SidebarLinks links={docsLinks} onNavigate={onNavigate} />
        </nav>

        <div className="pt-4 border-t border-gray-200 flex flex-col gap-1">
            <SidebarLinks links={footerLinks} onNavigate={onNavigate} />
        </div>
    </div>
);

interface SidebarLayoutProps {
    children: ReactNode;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children }) => {

    const { pathname } = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="min-h-screen flex surface-color-bg">
            <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-0 h-screen bg-gray-50 border-r border-gray-200 px-4 py-6">
                <SidebarContent />
            </aside>

            {menuOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
                    <aside className="relative w-64 h-full bg-gray-50 px-4 py-6 shadow-xl">
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
                <CompleteProfileBanner />

                <header className="lg:hidden flex items-center gap-2 px-4 py-4 border-b border-gray-200">
                    <button
                        onClick={() => setMenuOpen(true)}
                        aria-label="Open menu"
                        className="flex items-center justify-center p-2 rounded-lg text-color cursor-pointer hover:bg-gray-200/70"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <Link to="/getting-started" className="h-8 w-8">
                        <Logo />
                    </Link>
                </header>

                <main className="flex-1 w-full max-w-4xl px-6 lg:px-12 py-10">
                    {children}
                </main>
            </div>
        </div>
    );
};
