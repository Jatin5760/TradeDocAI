'use client';
import { motion } from 'framer-motion';

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="max-w-7xl mx-auto px-3 sm:px-6 py-14 md:py-24">

            {/* ── Heading ── */}
            <motion.div
                className="text-center max-w-3xl mx-auto mb-10 md:mb-16"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
                <h2 className="font-display text-xl sm:text-3xl md:text-4xl lg:text-5xl text-slate-900 mb-4 md:mb-6 tracking-tight leading-tight">
                    Zero-Touch Trade Documentation
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
                    Automate your entire confirmation workflow in seconds—just paste the trade email and let AI handle the rest.
                </p>
            </motion.div>

            <div className="relative">
                {/* Desktop curved path — lg+ only */}
                <svg aria-hidden="true" className="absolute top-0 left-0 w-full h-[672px] pointer-events-none hidden lg:block z-0" viewBox="0 0 1000 672" preserveAspectRatio="none">
                    <defs>
                        <marker id="arrowhead" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
                            <path d="M 1 1 L 4 2.5 L 1 4" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </marker>
                    </defs>
                    <path
                        d="M 166 160 L 333 160 L 666 160 L 833 160 C 950 160, 950 336, 500 336 C 50 336, 50 512, 166 512 L 333 512 L 666 512 L 833 512"
                        stroke="#1e293b"
                        strokeWidth="3"
                        strokeDasharray="8 8"
                        fill="none"
                        vectorEffect="non-scaling-stroke"
                        className="opacity-70"
                        markerMid="url(#arrowhead)"
                        markerEnd="url(#arrowhead)"
                    />
                </svg>

                {/*
                    Grid: 2-col on mobile, 2-col on md (unchanged), 3-col on lg (unchanged)
                */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 md:gap-8 relative z-10">
                    {[
                        { n: '01', title: 'Paste Email', desc: 'Trade confirmation email from broker or counterparty', color: 'from-indigo-100 to-blue-100', motifColors: ['#6366f1', '#3b82f6'] },
                        { n: '02', title: 'AI Classifies', desc: 'Gemini identifies FX NDF or IRS, exhibit & termination type', color: 'from-violet-100 to-purple-100', motifColors: ['#a855f7', '#8b5cf6'] },
                        { n: '03', title: 'Extract Fields', desc: '30+ fields auto-mapped via IRS/FX field-hint matrices', color: 'from-amber-100 to-orange-100', motifColors: ['#fbbf24', '#f97316'] },
                        { n: '04', title: 'Human Review', desc: 'Review AI-filled form, correct any field before approval', color: 'from-emerald-100 to-teal-100', motifColors: ['#34d399', '#14b8a6'] },
                        { n: '05', title: 'LaTeX PDF', desc: 'pdflatex compiles ISDA-compliant document in ~2 seconds', color: 'from-sky-100 to-blue-100', motifColors: ['#38bdf8', '#3b82f6'] },
                        { n: '06', title: 'Validate', desc: 'Gemini vision compares PDF field-by-field vs source email', color: 'from-pink-100 to-rose-100', motifColors: ['#f472b6', '#f43f5e'] },
                    ].map((step, i) => (
                        <motion.div
                            key={step.n}
                            className="[perspective:1000px] w-full group mb-2 sm:mb-4"
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.07 }}
                        >
                            <div className={`relative h-[220px] sm:h-[280px] md:h-[320px] w-full rounded-[24px] sm:rounded-[32px] md:rounded-[40px] bg-gradient-to-br ${step.color} transition-all duration-500 ease-in-out [transform-style:preserve-3d] shadow-[0_12px_20px_-5px_rgba(0,0,0,0.08)] group-hover:[transform:rotate3d(1,1,0,30deg)] will-change-transform`}>

                                {/* Glass Layer */}
                                <div className="absolute inset-[6px] sm:inset-[8px] rounded-[20px] sm:rounded-[28px] md:rounded-[35px] rounded-tr-[160px] sm:rounded-tr-[200px] md:rounded-tr-[280px] bg-gradient-to-t from-white/40 to-white/70 [transform:translateZ(25px)] [transform-style:preserve-3d] border-b border-l border-white/50 transition-all duration-500 backdrop-blur-md" />

                                {/* Concentric Circles */}
                                <div className="absolute right-0 top-0 [transform-style:preserve-3d] transition-all duration-500">
                                    <div className="absolute right-[6px] sm:right-[8px] top-[6px] sm:top-[8px] w-[110px] sm:w-[150px] md:w-[170px] h-[110px] sm:h-[150px] md:h-[170px] rounded-full shadow-[-10px_10px_20px_rgba(100,100,111,0.2)] bg-white/20 [transform:translateZ(20px)] transition-all duration-500" />
                                    <div className="absolute right-[8px] sm:right-[10px] top-[8px] sm:top-[10px] w-[88px] sm:w-[122px] md:w-[140px] h-[88px] sm:h-[122px] md:h-[140px] rounded-full shadow-[-10px_10px_20px_rgba(100,100,111,0.2)] bg-white/20 [transform:translateZ(40px)] transition-all duration-500 delay-[400ms] group-hover:[transform:translateZ(60px)]" />
                                    <div className="absolute right-[12px] sm:right-[17px] top-[12px] sm:top-[17px] w-[68px] sm:w-[96px] md:w-[110px] h-[68px] sm:h-[96px] md:h-[110px] rounded-full shadow-[-10px_10px_20px_rgba(100,100,111,0.2)] bg-white/20 [transform:translateZ(60px)] transition-all duration-500 delay-[800ms] group-hover:[transform:translateZ(80px)]" />
                                    <div className="absolute right-[16px] sm:right-[23px] top-[16px] sm:top-[23px] w-[50px] sm:w-[68px] md:w-[80px] h-[50px] sm:h-[68px] md:h-[80px] rounded-full shadow-[-10px_10px_20px_rgba(100,100,111,0.2)] bg-white/20 [transform:translateZ(80px)] transition-all duration-500 delay-[1200ms] group-hover:[transform:translateZ(100px)]" />
                                    <div className="absolute right-[20px] sm:right-[30px] top-[20px] sm:top-[30px] w-[32px] sm:w-[44px] md:w-[50px] h-[32px] sm:h-[44px] md:h-[50px] [transform:translateZ(100px)] transition-all duration-500 delay-[1600ms] group-hover:[transform:translateZ(120px)] flex items-center justify-center">
                                        <svg viewBox="-5 -5 110 110" className="w-[28px] sm:w-[38px] md:w-[45px] h-[28px] sm:h-[38px] md:h-[45px]" style={{ filter: `drop-shadow(0 8px 12px ${step.motifColors[0]}66)` }}>
                                            <defs>
                                                <linearGradient id={`motif-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor={step.motifColors[0]} />
                                                    <stop offset="100%" stopColor={step.motifColors[1]} />
                                                </linearGradient>
                                            </defs>
                                            <path
                                                d="M 50 0 Q 55 20 70 15 Q 85 10 85 28 Q 85 40 100 50 Q 85 60 85 72 Q 85 90 70 85 Q 55 80 50 100 Q 45 80 30 85 Q 15 90 15 72 Q 15 60 0 50 Q 15 40 15 28 Q 15 10 30 15 Q 45 20 50 0 Z"
                                                fill={`url(#motif-grad-${i})`}
                                            />
                                        </svg>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="absolute inset-0 pt-[65px] sm:pt-[85px] md:pt-[95px] px-[16px] sm:px-[26px] md:px-[35px] [transform:translateZ(26px)] pointer-events-none flex flex-col [backface-visibility:hidden] will-change-transform">
                                    <div className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-800/80 mb-2 sm:mb-4 md:mb-5 tracking-tighter drop-shadow-sm">{step.n}</div>
                                    <span className="block text-slate-800 font-extrabold text-base sm:text-xl md:text-2xl mb-1 sm:mb-2 md:mb-3 tracking-tight leading-tight">{step.title}</span>
                                    <span className="block text-slate-600 font-semibold text-[11px] sm:text-sm md:text-base leading-relaxed pr-1 sm:pr-2">{step.desc}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
