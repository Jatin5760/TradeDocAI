'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { getUser, isAuthenticated, clearSession, isJustLoggedIn, clearJustLoggedIn } from '../../../lib/api';

const NAV_LINKS = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Why TradeDocAI', href: '#why-tradedoc' },
    { label: 'Supported Documents', href: '#supported-docs' },
    { label: 'Pricing', href: '#pricing' },
];

const NAV_OFFSET = 80;

// Default avatar — cartoon character SVG
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23FF6B6B'/%3E%3Cstop offset='50%25' stop-color='%23FF8E53'/%3E%3Cstop offset='100%25' stop-color='%23FEC84E'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='20' cy='20' r='20' fill='url(%23bg)'/%3E%3Ccircle cx='14' cy='16' r='2.5' fill='white'/%3E%3Ccircle cx='26' cy='16' r='2.5' fill='white'/%3E%3Ccircle cx='14.5' cy='16.5' r='1' fill='%23333'/%3E%3Ccircle cx='26.5' cy='16.5' r='1' fill='%23333'/%3E%3Cpath d='M13 24 Q20 30 27 24' stroke='white' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E";

export default function Navbar() {
    const router = useRouter();
    const [hoveredNav, setHoveredNav] = useState<number | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);
    const [userName, setUserName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
    const profileRef = useRef<HTMLDivElement>(null);

    // Check auth state on mount and on focus
    useEffect(() => {
        const check = () => {
            const auth = isAuthenticated();
            setLoggedIn(auth);
            if (auth) {
                const user = getUser();
                setUserName(user?.name || user?.email || 'User');
                // Use user's avatar if set, otherwise default
                const stored = localStorage.getItem('user');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (parsed?.avatar) setAvatarUrl(parsed.avatar);
                    } catch { /* ignore */ }
                }
                // Auto-open profile dropdown if user just logged in/signed up
                if (isJustLoggedIn()) {
                    clearJustLoggedIn();
                    // Small delay to let the Navbar render first after redirect
                    setTimeout(() => setProfileOpen(true), 300);
                }
            }
        };
        check();
        window.addEventListener('focus', check);
        window.addEventListener('storage', check);
        return () => {
            window.removeEventListener('focus', check);
            window.removeEventListener('storage', check);
        };
    }, []);

    // Close profile dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setProfileOpen(false);
            }
        };
        if (profileOpen) {
            document.addEventListener('mousedown', handler);
        }
        return () => document.removeEventListener('mousedown', handler);
    }, [profileOpen]);

    const scrollTo = useCallback((href: string) => {
        const id = href.replace('#', '');
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
        window.scrollTo({ top, behavior: 'smooth' });
    }, []);

    const handleDesktopClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        scrollTo(href);
    }, [scrollTo]);

    const handleMobileClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault();
        setMenuOpen(false);
        setTimeout(() => scrollTo(href), 150);
    }, [scrollTo]);

    const handleLogout = useCallback(() => {
        clearSession();
        setLoggedIn(false);
        setUserName('');
        setAvatarUrl(DEFAULT_AVATAR);
        setProfileOpen(false);
        // Use hard navigation to ensure landing page, not intercepted by any auth guards
        window.location.href = '/';
    }, []);

    // ── Shared Profile Avatar component ──
    const ProfileAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' }) => {
        const dims = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
        return (
            <div className={`${dims} rounded-full overflow-hidden ring-2 ring-indigo-200/60 shadow-md shadow-indigo-200/30 flex-shrink-0`}>
                <Image
                    src={avatarUrl}
                    alt={userName}
                    width={size === 'sm' ? 32 : 36}
                    height={size === 'sm' ? 32 : 36}
                    className="w-full h-full object-cover"
                    unoptimized={avatarUrl.startsWith('data:')}
                />
            </div>
        );
    };

    // ── Shared Dropdown Menu ──
    const DropdownMenu = () => (
        <div
            className="rounded-xl overflow-hidden"
            style={{
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
            }}
        >
            {/* User info header */}
            <div className="px-4 pt-3 pb-2.5 border-b border-slate-200/70">
                <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
            </div>
            {/* Menu items */}
            <div className="py-1">
                <Link
                    href="/dashboard"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors duration-150"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Get Started
                </Link>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Log Out
                </button>
            </div>
        </div>
    );

    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="fixed top-0 left-0 right-0 z-50 w-full px-2 pt-2 sm:px-3 sm:pt-3 xl:px-8"
        >
            <div
                className="mx-auto w-full max-w-6xl rounded-[28px] sm:rounded-[34px] overflow-visible"
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.55)',
                    border: '1px solid rgba(220, 220, 220, 0.4)',
                    backdropFilter: 'blur(24px) saturate(1.3) brightness(1.04)',
                    WebkitBackdropFilter: 'blur(24px) saturate(1.3) brightness(1.04)',
                    boxShadow: '0 2px 24px rgba(0,0,0,0.02), inset 0 1px 3px rgba(0,0,0,0.04)',
                    willChange: 'transform, backdrop-filter',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden',
                }}
            >
                {/* ── Top Row ── */}
                <div className="flex items-center justify-between py-2 sm:py-2.5 px-3 sm:px-5 xl:pl-9 xl:pr-6 w-full">

                    {/* Logo + Brand */}
                    <div className="flex items-center shrink-0">
                        <Image
                            src="/logo.svg"
                            alt="TradeDocAI Logo"
                            width={28}
                            height={28}
                            className="mr-2 sm:w-[32px] sm:h-[32px] xl:w-[34px] xl:h-[34px]"
                        />
                        <span className="font-sans font-extrabold text-slate-900 text-[20px] sm:text-[24px] xl:text-[28px] tracking-tight">
                            TradeDoc<span className="text-[#4f46e5]">AI</span>
                        </span>
                    </div>

                    {/* Right side: Desktop Nav + Auth/Profile — grouped together */}
                    <div className="flex items-center gap-2 xl:gap-4">
                        {/* Desktop Nav Links — only xl+ */}
                        <div className="hidden xl:flex items-center gap-1 2xl:gap-2 relative mr-2">
                            {NAV_LINKS.map((item, i) => (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    onClick={(e) => handleDesktopClick(e, item.href)}
                                    className="relative flex items-center px-3 2xl:px-4 py-2 rounded-xl cursor-pointer"
                                    onMouseEnter={() => setHoveredNav(i)}
                                    onMouseLeave={() => setHoveredNav(null)}
                                >
                                    {hoveredNav === i && (
                                        <motion.div
                                            layoutId="nav-glass-indicator"
                                            className="absolute inset-0 rounded-xl -z-10 border border-white/80 shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_4px_rgba(255,255,255,0.7)] bg-gradient-to-b from-white/40 to-white/10 backdrop-blur-xl"
                                            initial={false}
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <span className={`relative z-10 font-medium text-[10px] 2xl:text-[11px] uppercase tracking-[1px] font-body transition-colors duration-300 ${hoveredNav === i ? 'text-indigo-700' : 'text-slate-700'}`}>
                                        {item.label}
                                    </span>
                                </a>
                            ))}
                        </div>

                        {/* Desktop: Logged Out — only xl+ */}
                        {!loggedIn && (
                            <div className="hidden xl:flex items-center gap-3 2xl:gap-4">
                                <Link href="/login" className="glass-btn-wrap" style={{ fontSize: '15px' }}>
                                    <div className="glass-btn">
                                        <span style={{ color: '#000', fontWeight: 600, fontFamily: 'var(--font-display), Georgia, serif' }}>
                                            Sign In
                                        </span>
                                    </div>
                                    <div className="glass-btn-shadow" />
                                </Link>
                                <Link href="/signup" className="solid-btn" style={{ fontSize: '14px' }}>
                                    Get Started
                                </Link>
                            </div>
                        )}

                        {/* Desktop: Logged In — Profile Avatar + Dropdown — only xl+ */}
                        {loggedIn && (
                            <div className="hidden xl:flex items-center relative" ref={profileRef}>
                                <button
                                    type="button"
                                    onClick={() => setProfileOpen(o => !o)}
                                    className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
                                    aria-label="Profile menu"
                                    aria-expanded={profileOpen}
                                >
                                    <ProfileAvatar size="md" />
                                </button>
                                <AnimatePresence>
                                    {profileOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                            className="absolute right-0 top-full mt-2 w-48 z-50"
                                        >
                                            <DropdownMenu />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Mobile/Tablet: Profile Avatar — visible below xl, next to hamburger */}
                        {loggedIn && (
                            <div className="xl:hidden flex items-center relative" ref={profileRef}>
                                <button
                                    type="button"
                                    onClick={() => setProfileOpen(o => !o)}
                                    className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
                                    aria-label="Profile menu"
                                    aria-expanded={profileOpen}
                                >
                                    <ProfileAvatar size="sm" />
                                </button>
                                <AnimatePresence>
                                    {profileOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                            className="absolute right-0 top-full mt-2 w-48 z-50"
                                        >
                                            <DropdownMenu />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Hamburger — hidden at xl+ (1280px+) */}
                        <button
                            type="button"
                            className="xl:hidden flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl hover:bg-slate-100/70 transition-colors duration-200"
                            onClick={() => setMenuOpen(o => !o)}
                            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={menuOpen}
                        >
                            <div className="w-5 flex flex-col gap-[5px]">
                                <motion.span
                                    animate={menuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                    className="block h-[2px] w-full bg-slate-800 rounded-full"
                                />
                                <motion.span
                                    animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
                                    transition={{ duration: 0.15 }}
                                    className="block h-[2px] w-full bg-slate-800 rounded-full"
                                />
                                <motion.span
                                    animate={menuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                    className="block h-[2px] w-full bg-slate-800 rounded-full"
                                />
                            </div>
                        </button>
                    </div>
                </div>

                {/* ── Mobile Dropdown — hidden at xl+ ── */}
                <AnimatePresence initial={false}>
                    {menuOpen && (
                        <motion.div
                            key="mobile-nav"
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden xl:hidden border-t border-slate-200/50"
                        >
                            <div className="px-3 sm:px-4 pt-2 pb-4 sm:pb-5 flex flex-col gap-0.5">
                                {NAV_LINKS.map((item) => (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        onClick={(e) => handleMobileClick(e, item.href)}
                                        className="flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl text-slate-700 font-medium text-[14px] sm:text-[15px] hover:bg-indigo-50 hover:text-indigo-700 transition-colors duration-200 active:bg-indigo-100"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                        {item.label}
                                    </a>
                                ))}
                                {/* Mobile: Only show auth buttons when NOT logged in (profile is outside menu) */}
                                {!loggedIn && (
                                    <div className="flex flex-col sm:flex-row gap-2.5 mt-3 pt-3 border-t border-slate-200/60">
                                        <Link
                                            href="/login"
                                            onClick={() => setMenuOpen(false)}
                                            className="flex-1 text-center py-2.5 sm:py-4 px-5 sm:px-8 rounded-full border border-slate-200 bg-white/90 text-slate-800 font-semibold text-[13px] sm:text-lg hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200"
                                        >
                                            Sign In
                                        </Link>
                                        <Link
                                            href="/signup"
                                            onClick={() => setMenuOpen(false)}
                                            className="flex-1 text-center py-2.5 sm:py-4 px-5 sm:px-8 rounded-full bg-indigo-600 text-white font-semibold text-[13px] sm:text-lg hover:bg-indigo-700 transition-colors duration-200 shadow-md shadow-indigo-200/60"
                                        >
                                            Get Started
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.nav>
    );
}
