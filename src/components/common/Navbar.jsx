import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Moon, 
    Sun, 
    Menu, 
    X
} from 'lucide-react';

/**
 * Modular Navigation Links Configuration
 * Path /chart is where the birth details form and KP Chart view live!
 */
export const NAV_ITEMS = [
    { 
        nameEn: 'Home', 
        nameTe: 'హోమ్', 
        path: '/',
        exact: true
    },
    { 
        nameEn: 'KP Chart', 
        nameTe: 'KP చక్రం', 
        path: '/chart'
    },
    { 
        nameEn: 'Gulbarga Theory', 
        nameTe: 'గుల్బర్గా సిద్ధాంతం', 
        path: '/gulbarga'
    },
];

export const Navbar = ({ lang = 'te', onLangChange }) => {
    const location = useLocation();
    const isTe = lang === 'te';

    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('theme');
                if (saved !== null) {
                    return saved === 'dark';
                }
            } catch (_) {}
            return false; // Default to Light Mode
        }
        return false;
    });

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        try {
            if (isDark) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
        } catch (_) {}
    }, [isDark]);

    // Close mobile menu on page navigation
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#FFFDF7]/95 dark:bg-[#070e1b]/95 border-b border-amber-200/60 dark:border-white/10 shadow-xs transition-colors">
            {/* Top ambient highlight line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500/70 dark:via-amber-400/60 to-transparent" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-3 sm:gap-6">
                
                {/* Left: Brand / Logo Section */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        {/* Astrological Cosmic Avatar Emblem */}
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-purple-900 via-indigo-950 to-amber-900 border border-amber-400/50 shadow-xs flex items-center justify-center relative overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                            <svg viewBox="0 0 100 100" className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400/90 group-hover:rotate-45 transition-transform duration-700 ease-out" fill="none">
                                <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 3" />
                                <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="1.5" />
                                <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="2" />
                                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                                    <line 
                                        key={deg} 
                                        x1="50" 
                                        y1="16" 
                                        x2="50" 
                                        y2="34" 
                                        stroke="currentColor" 
                                        strokeWidth="1.5" 
                                        transform={`rotate(${deg} 50 50)`} 
                                    />
                                ))}
                                <circle cx="50" cy="50" r="6" fill="#F59E0B" />
                                <circle cx="50" cy="50" r="2" fill="#FFFFFF" />
                            </svg>
                        </div>

                        {/* Brand Name */}
                        <span className="font-serif font-black text-xl sm:text-2xl tracking-tight text-amber-600 dark:text-amber-400 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                            AstroSharma
                        </span>
                    </Link>

                    {/* Left Vertical Divider */}
                    <div className="hidden sm:block h-6 w-[1px] bg-stone-200 dark:bg-white/15 mx-1" />
                </div>

                {/* Center: Navigation Links */}
                <nav className="hidden md:flex items-center gap-8 lg:gap-10">
                    {NAV_ITEMS.map((item) => {
                        const isActive = item.exact 
                            ? location.pathname === item.path 
                            : location.pathname.startsWith(item.path);

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`relative py-1 text-sm sm:text-base font-semibold transition-colors ${
                                    isActive
                                        ? 'text-orange-600 dark:text-orange-400'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400'
                                }`}
                            >
                                <span>{isTe ? item.nameTe : item.nameEn}</span>

                                {/* Orange Active Underline Indicator Bar */}
                                {isActive && (
                                    <motion.div
                                        layoutId="active-nav-underline"
                                        className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Right: Divider, Language & Theme Controls */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Right Vertical Divider */}
                    <div className="hidden md:block h-6 w-[1px] bg-stone-200 dark:bg-white/15" />

                    {/* Language Selector Toggle */}
                    <button
                        type="button"
                        onClick={() => onLangChange && onLangChange(isTe ? 'en' : 'te')}
                        className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold border border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300 hover:border-amber-400 dark:hover:border-amber-400 transition-colors cursor-pointer"
                        title={isTe ? "Switch to English" : "తెలుగులోకి మార్చండి"}
                    >
                        <span>{isTe ? 'EN' : 'తె'}</span>
                    </button>

                    {/* Dark / Light Mode Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsDark(!isDark)}
                        className="p-1.5 sm:p-2 rounded-full text-orange-500 dark:text-amber-400 hover:bg-orange-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label="Toggle theme"
                        title={isDark ? (isTe ? "లైట్ మోడ్" : "Light Mode") : (isTe ? "డార్క్ మోడ్" : "Dark Mode")}
                    >
                        {isDark ? (
                            <Sun className="w-5 h-5 text-amber-400" />
                        ) : (
                            <Moon className="w-5 h-5 text-orange-500" />
                        )}
                    </button>

                    {/* Mobile Menu Hamburger Button */}
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-1.5 rounded-xl border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Toggle mobile menu"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown Navigation */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden border-t border-amber-200/60 dark:border-white/10 bg-[#FFFDF7] dark:bg-[#070e1b] px-4 py-3 space-y-1 shadow-lg"
                    >
                        {NAV_ITEMS.map((item) => {
                            const isActive = item.exact 
                                ? location.pathname === item.path 
                                : location.pathname.startsWith(item.path);

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`block px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                        isActive
                                            ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold border-l-4 border-orange-500'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800/60'
                                    }`}
                                >
                                    {isTe ? item.nameTe : item.nameEn}
                                </Link>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};
