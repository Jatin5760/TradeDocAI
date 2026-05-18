'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useScroll, useTransform, useAnimationControls } from 'framer-motion';
import { isAuthenticated } from '../../../lib/api';

export default function Hero() {
    const [loggedIn, setLoggedIn] = useState(false);
    const heroRef = useRef<HTMLElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);
    const logoControls = useAnimationControls();
    const isLogoInView = useInView(logoRef, { once: false, amount: 0.1 });
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    // Auth detection
    useEffect(() => {
        const check = () => setLoggedIn(isAuthenticated());
        check();
        window.addEventListener('focus', check);
        window.addEventListener('storage', check);
        return () => {
            window.removeEventListener('focus', check);
            window.removeEventListener('storage', check);
        };
    }, []);

    // Desktop only: pause/resume rotation on scroll
    useEffect(() => {
        if (isLogoInView) {
            logoControls.start({
                rotate: 360,
                transition: { duration: 45, repeat: Infinity, ease: 'linear', repeatType: 'loop' },
            });
        } else {
            logoControls.stop();
        }
    }, [isLogoInView, logoControls]);

    return (
        <section ref={heroRef} className="relative pt-12 md:pt-20" style={{ overflow: 'clip' }}>

            {/* ── Background Gradients ── */}
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-28 z-20"
                style={{ background: 'linear-gradient(to bottom, #f8f9fc 40%, transparent)' }}
            />
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-0"
                style={{ top: '0px', width: '140%', height: '540px', overflow: 'visible' }}
            >
                <div style={{ position: 'absolute', left: '50%', top: '-80px', transform: 'translateX(-50%)', width: '65%', height: '360px', background: 'radial-gradient(ellipse 60% 55% at 50% 25%, rgba(255,115,45,0.65) 0%, rgba(255,150,55,0.35) 30%, rgba(255,170,80,0.08) 60%, transparent 80%)' }} />
                <div style={{ position: 'absolute', left: '-5%', top: '0px', width: '55%', height: '300px', background: 'radial-gradient(ellipse 70% 55% at 30% 35%, rgba(165,139,252,0.50) 0%, rgba(196,181,253,0.25) 40%, rgba(200,190,255,0.05) 65%, transparent 85%)' }} />
                <div style={{ position: 'absolute', right: '-5%', top: '0px', width: '55%', height: '300px', background: 'radial-gradient(ellipse 70% 55% at 70% 35%, rgba(147,197,253,0.50) 0%, rgba(165,180,252,0.25) 40%, rgba(180,200,255,0.05) 65%, transparent 85%)' }} />
                <div style={{ position: 'absolute', left: '50%', top: '180px', transform: 'translateX(-50%)', width: '50%', height: '260px', background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(165,187,252,0.30) 0%, rgba(213,226,255,0.15) 35%, rgba(220,230,255,0.04) 60%, transparent 80%)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to bottom, transparent 0%, #f8f9fc 100%)' }} />
            </div>

            <motion.div
                style={{ y: heroY, opacity: heroOpacity, willChange: 'transform, opacity', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
                className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 w-full pt-24 sm:pt-28 pb-16 sm:pb-24"
            >
                {/* ── Badge / Ornament ── */}
                <div className="flex flex-col items-center justify-center mb-6 md:mb-8 w-full max-w-[600px] mx-auto">
                    <div className="flex items-center justify-center w-full mb-3 opacity-90 text-indigo-300">
                        <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-indigo-300" />
                        <svg width="228" height="35" viewBox="0 0 228 35" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-4 drop-shadow-sm w-[140px] sm:w-[180px] h-auto text-indigo-300">
                            <path fill="currentColor" d="M100.06 31.342c-3.002 1.878-6.575 2.876-10.344 2.876H.703A.705.705 0 0 1 0 33.515c0-.387.316-.703.703-.703h89.013c3.495 0 6.814-.921 9.592-2.658 4.725-2.96 7.123-7.532 7.123-13.586 0-8.347-4.788-12.96-9.275-14.494-4.86-1.66-9.838-.154-13.002 3.938-2.448 3.158-2.813 6.308-2.16 8.924v.014c.64 1.955 2.673 4.424 5.331 5.359 1.99.703 3.96.429 5.844-.802 2.764-1.807 3.122-4.226 2.243-5.822-.5-.908-1.519-1.667-2.588-1.182-.682.31-1.104.724-1.294 1.28-.38 1.146.359 2.51.359 2.518.148.26.112.59-.091.815a.705.705 0 0 1-.795.183c-1.582-.654-3.811-2.869-3.889-5.323-.042-1.35.556-3.263 3.615-4.761 3.143-1.533 6.603-.267 8.417 3.08 1.983 3.657 1.385 8.917-3.586 11.898-4.74 2.841-9.662.964-12.433-2.158a11.202 11.202 0 0 1-2.405-4.43c-.028-.071-.05-.141-.077-.212a.732.732 0 0 1-.036-.204c-.73-3.066-.21-6.645 2.413-10.034C85.615 1.807 89.294 0 93.218 0c1.442 0 2.918.246 4.381.745 4.944 1.695 10.232 6.737 10.232 15.83 0 8.192-4.233 12.56-7.785 14.788l.014-.02Z" />
                            <path fill="currentColor" d="M95.932 26.195a.708.708 0 0 1-.598.752c-.084.014-8.903 1.364-20.653 1.364a.702.702 0 0 1-.703-.689c0-.134-.028-3.235 3.452-6.59a.692.692 0 0 1 .486-.189c.049 0 .105 0 .161.014a.73.73 0 0 1 .514.436c.014.042 1.877 4.248 16.645 4.248.365 0 .675.28.703.654h-.007ZM72.395 28.016c-.126 0-12.657.443-25.196-.127-7.383-.337-13.333-.956-17.686-1.842-5.787-1.175-8.79-2.827-9.17-5.056-.21-1.245.015-2.173.669-2.764.548-.5 1.343-.717 2.412-.717 2.243 0 5.703.963 10.681 2.348 8.784 2.448 22.06 6.154 38.298 6.737.38.014.682.324.682.704 0 .38-.303.689-.682.703l-.008.014ZM49.31 16.99c-4.5-3.27-4.957-5.71-4.83-6.87.105-.978.696-1.766 1.61-2.16.436-.19.914-.281 1.42-.281 1.118 0 2.349.443 3.467 1.287.809.612 1.737 1.378 2.806 2.271 4.57 3.812 11.49 9.578 20.238 11.554a.701.701 0 0 1 .542.788.708.708 0 0 1-.746.604c-.654-.042-16.075-1.083-24.507-7.194ZM70.039 3.22c1.92.704 1.969 3.102 2.032 5.872.077 3.636.183 8.165 4.044 11.188a.702.702 0 0 1 .154.943.696.696 0 0 1-.92.239c-.275-.148-6.738-3.608-9.044-9.676-1.442-3.798-1.47-6.667-.07-8.08.351-.359 1.02-.823 2.095-.823.485 0 1.048.091 1.709.337ZM127.601 31.342c3.003 1.878 6.575 2.876 10.345 2.876h89.012a.706.706 0 0 0 .704-.703.706.706 0 0 0-.704-.703h-89.012c-3.495 0-6.815-.921-9.592-2.658-4.726-2.96-7.124-7.532-7.124-13.586 0-8.347 4.789-12.96 9.276-14.494 4.859-1.66 9.838-.154 13.002 3.938 2.447 3.158 2.813 6.308 2.159 8.924v.014c-.64 1.955-2.672 4.424-5.33 5.359-1.991.703-3.96.429-5.844-.802-2.764-1.807-3.122-4.226-2.243-5.823.499-.907 1.519-1.666 2.587-1.18.683.309 1.104.723 1.294 1.279.38 1.146-.358 2.51-.358 2.518a.701.701 0 0 0 .091.815c.197.225.52.296.795.183 1.582-.654 3.811-2.869 3.889-5.323.042-1.35-.556-3.263-3.615-4.761-3.143-1.533-6.603-.267-8.417 3.08-1.984 3.657-1.386 8.917 3.586 11.898 4.74 2.841 9.662.964 12.433-2.158a11.198 11.198 0 0 0 2.405-4.43c.028-.071.049-.141.077-.212a.735.735 0 0 0 .035-.204c.732-3.066.211-6.645-2.412-10.034C142.045 1.807 138.368 0 134.444 0c-1.442 0-2.919.246-4.381.745-4.944 1.695-10.232 6.737-10.232 15.83 0 8.192 4.233 12.56 7.784 14.788l-.014-.02Z" />
                            <path fill="currentColor" d="M131.73 26.194a.708.708 0 0 0 .597.753c.085.014 8.903 1.364 20.654 1.364.386 0 .696-.31.703-.69 0-.133.028-3.234-3.453-6.588a.692.692 0 0 0-.485-.19c-.049 0-.106 0-.162.014a.728.728 0 0 0-.513.436c-.014.042-1.878 4.247-16.645 4.247a.705.705 0 0 0-.703.654h.007ZM155.266 28.016c.127 0 12.658.443 25.196-.127 7.384-.337 13.333-.956 17.686-1.842 5.787-1.175 8.79-2.827 9.17-5.056.211-1.245-.014-2.173-.668-2.764-.549-.5-1.343-.717-2.412-.717-2.243 0-5.703.963-10.682 2.348-8.783 2.448-22.06 6.154-38.297 6.737a.705.705 0 0 0-.682.703c0 .38.302.69.682.704l.007.014ZM178.351 16.99c4.501-3.27 4.958-5.71 4.831-6.871-.105-.978-.696-1.765-1.61-2.159a3.533 3.533 0 0 0-1.421-.281c-1.118 0-2.348.443-3.467 1.287-.808.611-1.736 1.378-2.805 2.271-4.571 3.812-11.491 9.578-20.239 11.554a.7.7 0 0 0-.541.787.708.708 0 0 0 .745.605c.654-.042 16.076-1.083 24.507-7.194ZM157.623 3.22c-1.92.704-1.969 3.102-2.033 5.872-.077 3.636-.182 8.164-4.043 11.188a.703.703 0 0 0-.155.943c.197.309.598.415.921.239.275-.148 6.737-3.608 9.044-9.676 1.441-3.798 1.469-6.667.07-8.08-.352-.36-1.02-.823-2.096-.823-.485 0-1.047.091-1.708.337Z" />
                        </svg>
                        <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-indigo-300" />
                    </div>

                    {/* Badge Text — splits on mobile, single line on sm+ */}
                    <div className="relative text-center w-full px-4 sm:px-8">
                        <div className="py-2 text-black font-display italic tracking-wide text-[13px] sm:text-[16px]">
                            <span className="block sm:inline">Powered by Gemini 2.5 Pro</span>
                            <span className="hidden sm:inline mx-2 text-slate-300 not-italic">·</span>
                            <span className="block sm:inline">LangGraph Agentic Pipeline</span>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-200 to-transparent opacity-70" />
                    </div>
                </div>

                {/* ── Mobile-only: Centered static logo ── */}
                <div className="flex justify-center mb-4 md:hidden">
                    <Image
                        src="/logo.svg"
                        alt="TradeDocAI decorative logo"
                        width={90}
                        height={90}
                        style={{ opacity: 0.15, filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.06))' }}
                    />
                </div>

                {/* ── Main Hero Content ── */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex flex-col md:flex-row items-center justify-between max-w-6xl mx-auto mb-12 sm:mb-20 gap-8 md:gap-12 lg:gap-20"
                >
                    {/* Left: Heading */}
                    <div className="w-full md:w-1/2 flex flex-col items-center md:items-start justify-center relative text-center md:text-left">

                        {/* Rotating logo — md+ (rotates on tablets & desktop, hidden on mobile) */}
                        <div ref={logoRef} className="hidden md:block absolute left-0 lg:-left-8 xl:-left-12 -top-24 -z-10 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.7, ease: 'easeOut' }}
                            >
                                <motion.div animate={logoControls}>
                                    <Image
                                        src="/logo.svg"
                                        alt="TradeDocAI Logo Background"
                                        width={300}
                                        height={300}
                                        priority
                                        style={{ filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.06)) drop-shadow(0 5px 10px rgba(0,0,0,0.03))', opacity: 0.15 }}
                                    />
                                </motion.div>
                            </motion.div>
                        </div>

                        <h1 className="font-display text-[52px] sm:text-[68px] md:text-[80px] lg:text-[92px] xl:text-[115px] tracking-tighter text-slate-800 leading-none mb-4 relative z-10">
                            TradeDoc<span className="text-[#4f46e5]">AI</span>
                        </h1>
                    </div>

                    {/* Right: Tagline + Feature Pills */}
                    <div className="w-full md:w-1/2 flex flex-col items-center md:items-start justify-center text-center md:text-left md:pl-12 md:border-l border-slate-200">
                        <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-slate-600 leading-snug font-medium tracking-tight mb-5 sm:mb-6">
                            The agentic pipeline for zero-touch OTC trade confirmations.
                        </p>

                        {/* Pills: 2×2 on mobile, flex-wrap on md+ */}
                        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2.5 sm:gap-3 w-full md:w-auto">
                            {[
                                'ISDA-Compliant',
                                'FX NDF & IRS Support',
                                'Multimodal Validation',
                                'PDF & Word Export'
                            ].map((text, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 text-[11px] sm:text-[12px] md:text-[13px] font-bold bg-white/60 backdrop-blur-md px-3 sm:px-4 py-2 rounded-full border border-slate-200/60 text-slate-700 shadow-sm transition-[transform,background-color,border-color] duration-200 hover:scale-105 hover:-translate-y-0.5 hover:bg-white hover:border-indigo-200 cursor-default justify-center md:justify-start"
                                >
                                    <div className="flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#4f46e5] text-white shrink-0">
                                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="tracking-tight leading-tight">{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* ── CTAs — side by side on all screens, hidden when logged in ── */}
                {!loggedIn && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-row gap-3 sm:gap-4 justify-center items-center mb-12 sm:mb-0"
                >
                    <Link href="/login" className="glass-btn-wrap text-[15px] md:text-lg lg:text-xl">
                        <div className="glass-btn md:px-10 md:py-4 lg:px-14 lg:py-6">
                            <span style={{ color: '#000', fontWeight: 600, fontFamily: 'var(--font-display), Georgia, serif' }}>Try demo</span>
                        </div>
                        <div className="glass-btn-shadow" />
                    </Link>
                    <Link href="/signup" className="solid-btn text-[14px] md:text-lg lg:text-xl px-6 py-3 md:px-10 md:py-4 lg:px-14 lg:py-6">
                        Create account
                    </Link>
                </motion.div>
                )}

                {/* ── Stats Strip — 2×2 on mobile, 4-col on lg ── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-10 sm:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
                >
                    {[
                        { value: '2 min', label: 'End-to-end', sub: 'vs 30–120 min manual', borderColor: '#6366f1', dot: 'bg-indigo-500' },
                        { value: '30+', label: 'Doc variations', sub: 'FX NDF + IRS', borderColor: '#10b981', dot: 'bg-emerald-500' },
                        { value: '6–9×', label: 'Speed gain', sub: 'Over manual ops', borderColor: '#f59e0b', dot: 'bg-amber-500' },
                        { value: 'Zero', label: 'Errors', sub: 'Deterministic pipeline', borderColor: '#f43f5e', dot: 'bg-rose-500' },
                    ].map(s => (
                        <div
                            key={s.label}
                            style={{ borderLeftColor: s.borderColor }}
                            className="relative flex flex-col justify-between rounded-xl p-4 sm:p-5 lg:p-7 bg-white border border-slate-100 border-l-[3px] shadow-sm hover:shadow-md transition-shadow duration-300 min-h-[90px] sm:min-h-[110px] lg:min-h-[140px] overflow-hidden"
                        >
                            <span className="absolute right-2 top-0 text-[20px] sm:text-[30px] md:text-[44px] lg:text-[64px] font-black text-slate-900 opacity-[0.05] leading-none select-none pointer-events-none tracking-tighter">
                                {s.value}
                            </span>
                            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                <span className="text-[10px] sm:text-[11px] lg:text-[13px] font-semibold uppercase tracking-widest text-slate-400">{s.label}</span>
                            </div>
                            <div>
                                <p className="text-[22px] sm:text-[28px] lg:text-[34px] font-semibold text-slate-900 tracking-tight leading-none mb-1">
                                    {s.value}
                                </p>
                                <p className="text-[11px] sm:text-[12px] lg:text-[14px] text-slate-400 leading-tight">{s.sub}</p>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </motion.div>

            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f8f9fc] to-transparent pointer-events-none" />
        </section>
    );
}
