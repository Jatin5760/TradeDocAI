'use client';

import Image from 'next/image';
import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useSpring } from 'framer-motion';
import { ProgressDot } from '../components/SharedUI';

const DOC_CARDS = [
    {
        title: 'FX NDF Confirmation',
        subtitle: 'Foreign Exchange Non-Deliverable Forward',
        badge: 'Active',
        badgeColor: '#D97757',
        image: '/Ban1.webp',
        tags: ['Reference Currency', 'Notional Amount', 'Forward Rate', 'Valuation Date', 'Settlement Rate Option', 'Disruption Fallbacks'],
        mobileDesc: 'Cash-settled confirmations per EMTA framework for BRL, CNY, INR, KRW and major currencies.',
        mediumDesc: 'Cash-settled confirmations per EMTA framework for BRL, CNY, INR, KRW and all major currencies.',
        desc: 'Cash-settled confirmations per EMTA framework. BRL, CNY, INR, KRW and all major non-convertible currencies. Disruption events, fallback mechanisms, and calculation agent terms fully structured.',
    },
    {
        title: 'IRS Confirmation',
        subtitle: 'Interest Rate Swap — ISDA 2021',
        badge: 'Active',
        badgeColor: '#5C9E5A',
        image: '/Ban2.webp',
        tags: ['Exhibit II-A to II-J', 'Fixed/Floating Legs', 'Day-Count Fractions', 'Payment Dates', 'Termination Type', 'Party A/B Terms'],
        mobileDesc: 'Multi-exhibit IRS with ISDA 2021 standards. Fixed/floating legs and bilateral netting extracted.',
        mediumDesc: 'Multi-exhibit IRS with Exhibits II-A through II-J. Fixed/floating legs and netting provisions fully extracted.',
        desc: 'Multi-exhibit IRS with Exhibits II-A through II-J and 3 termination configurations. Fixed/floating legs, day-count conventions, and bilateral netting provisions fully extracted.',
    },
    {
        title: 'CDS Confirmation',
        subtitle: 'Credit Default Swap',
        badge: 'Active',
        badgeColor: '#5B82CA',
        image: '/Ban3.webp',
        tags: ['Reference Entity', 'Fixed Rate', 'Credit Events', 'Notional Amount', 'Termination Date', 'Settlement Method'],
        mobileDesc: 'Standard ISDA Credit Default Swap terms including credit events and settlement mechanics.',
        mediumDesc: 'Standard ISDA CDS terms including reference entity, credit events, and settlement mechanics.',
        desc: 'Standard ISDA Credit Default Swap terms including reference entity, obligations, fixed rate payer and floating rate payer calculations, credit events, and settlement mechanics.',
    },
    {
        title: 'Equity TRS Confirmation',
        subtitle: 'Equity Total Return Swap — ISDA 2002 / 2021 Framework',
        badge: 'Active',
        badgeColor: '#A855F7',
        image: '/Banner1.webp',
        tags: ['Term Rate Financing', 'Floating Financing Leg', 'Benchmark Fallbacks', 'Averaging & Lockout', 'ISDA Equity Definitions'],
        mobileDesc: 'Institutional Equity TRS supporting benchmark fallbacks and compounding methodologies.',
        mediumDesc: 'Institutional Equity TRS supporting benchmark fallbacks and overnight compounded financing structures.',
        desc: 'Institutional-grade Equity TRS confirmation supporting term benchmark and overnight compounded financing structures. Includes financing spread calculations, averaging conventions, benchmark successor provisions, compounding methodologies, and index observation mechanics.',
    },
];

export default function SupportedDocs() {
    const desktopRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: desktopRef,
        offset: ['start start', 'end end'],
    });

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        const timer = window.setTimeout(() => setIsMounted(true), 0);
        return () => window.clearTimeout(timer);
    }, []);

    // Dynamic X Translation based on screen size (iPad vs Desktop)
    const [xEnd, setXEnd] = useState('-235vw');
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setXEnd('-272vw'); // Better for iPad (85vw cards)
            } else {
                setXEnd('-235vw'); // Better for Desktop (75vw cards)
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const x = useTransform(
        scrollYProgress,
        [0, 1],
        ['0vw', xEnd]
    );

    // Ultra-Free Motion Spring - Maximum responsiveness for Tablet
    const springX = useSpring(x, { stiffness: 180, damping: 15, restDelta: 0.001 });

    // Mobile Slider State
    const [mobileIndex, setMobileIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMobileIndex(prev => (prev + 1) % DOC_CARDS.length);
        }, 5000); // 5 sec automatic slide
        return () => clearInterval(interval);
    }, []);

    return (
        <section id="supported-docs" className="bg-white">

            {/* ── MOBILE VIEW (Auto Slider, no scroll-linked horizontal) ── */}
            <div className="block sm:hidden px-4 py-16 overflow-hidden">
                <div className="text-center mb-10">
                    <h2 className="font-display text-2xl text-slate-800 mb-2">
                        Document Types We Process
                    </h2>
                    <p className="text-slate-400 text-sm">Swipe or wait to explore each instrument</p>
                </div>

                <div className="relative w-full h-[450px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={mobileIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="absolute inset-0 w-full h-full"
                        >
                            <div className="w-full h-full rounded-[2rem] p-7 flex flex-col relative overflow-hidden shadow-xl border-[1.5px] border-white/60 bg-white">
                                {/* Inner Image Wrapper (matching desktop) */}
                                <div className="absolute inset-2 rounded-[1.5rem] overflow-hidden z-0 border-[1.5px] border-slate-50 shadow-inner">
                                    <Image
                                        src={DOC_CARDS[mobileIndex].image}
                                        alt={DOC_CARDS[mobileIndex].title}
                                        fill
                                        sizes="100vw"
                                        className="object-cover object-[85%_center]"
                                    />
                                    <div className="absolute inset-0 bg-white/5" />
                                </div>

                                {/* Badge */}
                                <div className="flex items-start justify-between relative z-10 mb-auto">
                                    <div
                                        className="px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white shadow-sm border border-slate-100"
                                        style={{ color: DOC_CARDS[mobileIndex].badgeColor }}
                                    >
                                        {DOC_CARDS[mobileIndex].badge}
                                    </div>
                                </div>

                                {/* Text block (no white box wrapper, floating like desktop) */}
                                <div className="relative z-10">
                                    <h3 className="text-[19px] font-display font-bold text-slate-900 mb-2 leading-tight drop-shadow-sm">
                                        {DOC_CARDS[mobileIndex].title}
                                    </h3>
                                    <p className="text-sm font-bold text-slate-600 mb-3">
                                        {DOC_CARDS[mobileIndex].subtitle}
                                    </p>
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium -ml-1 p-1">
                                        {DOC_CARDS[mobileIndex].mobileDesc}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Mobile Slider Dots */}
                <div className="flex justify-center gap-2 mt-6">
                    {DOC_CARDS.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setMobileIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === mobileIndex ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-200'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* ── DESKTOP/TABLET VIEW (Scroll-linked horizontal) ── */}
            <div ref={desktopRef} className="hidden md:block relative h-[180dvh] lg:h-[400dvh]">
                <div className="sticky top-0 h-dvh overflow-hidden flex flex-col justify-center">
                    
                    <div className="text-center pt-0 md:pt-0 lg:pt-24 pb-2 px-6">
                        <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-slate-800">
                            Document Types We Process
                        </h2>
                        <p className="text-slate-400 mt-2 text-sm">Scroll to explore each instrument →</p>
                    </div>

                    <div className="flex-none lg:flex-1 flex items-center overflow-hidden py-10" style={{ paddingLeft: '10vw', perspective: '1200px' }}>
                        <motion.div
                            style={{ x: springX, willChange: 'transform', gap: '5vw', display: 'flex', alignItems: 'center', transformStyle: 'preserve-3d' }}
                        >
                            {DOC_CARDS.map((card, i) => (
                                <div
                                    key={card.title}
                                    className="shrink-0 w-[85vw] lg:w-[75vw]"
                                    style={{ height: '60vh', minHeight: '400px', maxHeight: '580px', perspective: '1200px' }}
                                >
                                    <motion.div
                                        className="w-full h-full rounded-[3rem] p-8 sm:p-10 lg:p-14 flex flex-col relative overflow-hidden shadow-xl group border-[1.5px] border-white/40"
                                        style={{
                                            // Disable 3D rotation on tablets to fix "laggy" feel, keep for desktop
                                            rotateY: isMounted && typeof window !== 'undefined' && window.innerWidth >= 1024 ? -8 : 0,
                                            transformStyle: 'preserve-3d',
                                            transform: 'translateZ(0)', // Force GPU acceleration for smoothness
                                        }}
                                    >
                                        <div className="absolute inset-2 rounded-3xl overflow-hidden z-0 border-[1.5px] border-white/80 shadow-md">
                                            <Image
                                                src={card.image}
                                                alt={card.title}
                                                fill
                                                sizes="(max-width: 1024px) 85vw, 75vw"
                                                priority={i === 0}
                                                className="object-cover"
                                            />
                                            <div className="absolute inset-0 bg-white/5" />
                                        </div>

                                        <div className="flex items-start justify-between mb-4 sm:mb-8 relative z-10">
                                            <div
                                                className="px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-white shadow-lg border border-slate-100"
                                                style={{ color: card.badgeColor }}
                                            >
                                                {card.badge}
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col justify-between relative z-10">
                                            <div>
                                                <h3 className="text-2xl sm:text-3xl lg:text-5xl font-display font-bold text-slate-900 mb-2 sm:mb-3 leading-tight drop-shadow-sm">
                                                    {card.title}
                                                </h3>
                                                <p className="text-sm sm:text-lg font-medium text-slate-600 mb-4 sm:mb-6">{card.subtitle}</p>
                                                <div className="text-xs sm:text-base text-slate-700 leading-relaxed max-w-[90%] lg:max-w-[80%] font-medium p-2 -ml-2">
                                                    <p className="lg:hidden">{card.mediumDesc}</p>
                                                    <p className="hidden lg:block">{card.desc}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 sm:gap-2.5 mt-4 sm:mt-8">
                                                {card.tags.slice(0, 4).map(t => (
                                                    <span
                                                        key={t}
                                                        className="text-[10px] sm:text-[12px] px-3 py-1 sm:px-4 sm:py-1.5 bg-white border border-slate-200 rounded-full text-slate-800 font-bold shadow-md hover:bg-indigo-50 transition-colors"
                                                    >
                                                        {t}
                                                    </span>
                                                ))}
                                                {card.tags.length > 4 && (
                                                    <span className="text-[10px] sm:text-[12px] px-3 py-1 sm:px-4 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-full text-slate-500 font-bold">
                                                        +{card.tags.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    <div className="flex justify-center gap-3 mt-6 md:mt-8 lg:mt-0 pb-4 lg:pb-8">
                        {DOC_CARDS.map((_, i) => (
                            <ProgressDot key={i} index={i} total={DOC_CARDS.length} scrollYProgress={scrollYProgress} />
                        ))}
                    </div>
                </div>
            </div>

        </section>
    );
}
