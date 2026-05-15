'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Why TradeDocAI', href: '#why-tradedoc' },
    { label: 'Supported Documents', href: '#supported-docs' },
    { label: 'Pricing', href: '#pricing' },
];

const NAV_OFFSET = 80;

export default function Navbar() {
    const [hoveredNav, setHoveredNav] = useState<number | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);

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

    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="fixed top-0 left-0 right-0 z-50 w-full px-2 pt-2 sm:px-3 sm:pt-3 xl:px-8"
        >
            <div
                className="mx-auto w-full max-w-7xl rounded-[28px] sm:rounded-[34px] overflow-hidden"
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
                <div className="flex items-center justify-between py-2 sm:py-2.5 px-3 sm:px-5 xl:pl-9 xl:pr-3 w-full">

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

                    {/* Center: Desktop Nav — only xl+ (1280px+) */}
                    <div className="hidden xl:flex justify-center items-center gap-1 2xl:gap-2 relative">
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

                    {/* Right */}
                    <div className="flex items-center gap-2 xl:gap-4">
                        {/* Desktop CTA — only xl+ */}
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
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.nav>
    );
}
