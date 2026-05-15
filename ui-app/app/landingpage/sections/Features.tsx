'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../components/animations';

export default function Features() {
    return (
        <section id="features" className="bg-white py-14 md:py-24 md:pb-32">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">

                {/* ── Section Heading ── */}
                <div className="pb-4 pt-6 px-2 sm:px-6 mb-8 md:mb-20">
                    <div className="text-center">
                        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-slate-800 mb-4 md:mb-6">
                            Built for Derivatives Operations
                        </h2>
                        <p className="text-sm sm:text-base md:text-lg text-slate-500 max-w-2xl mx-auto">
                            Automating complex OTC trade workflows with zero manual intervention.
                        </p>
                    </div>
                </div>

                {/* ── Feature Cards ── */}
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: '-60px' }}
                    className="flex flex-col w-full gap-y-8 md:gap-y-0"
                >
                    {[
                        { 
                            badge: 'Gemini 2.5 Pro', 
                            color: 'text-violet-600', 
                            title: 'AI Classification & Extraction', 
                            mobileDesc: 'Autonomously classifies trade types, selects ISDA exhibits, and extracts 30+ granular fields with high accuracy in under 10 seconds.',
                            mediumDesc: 'Autonomously classifies complex trade types, selects precise ISDA exhibits (II-A to II-J), and extracts 30+ fields with schema-enforced accuracy in under 10 seconds.',
                            desc: 'Advanced LLM pipeline autonomously classifies complex instrument types, selects precise ISDA exhibits (II-A to II-J), and extracts 30+ granular trade fields with schema-enforced accuracy in under 10 seconds.' 
                        },
                        { 
                            badge: 'Schema-Driven UI', 
                            color: 'text-blue-600', 
                            title: 'Dynamic JSON Schema Forms', 
                            mobileDesc: 'Data-driven UI engine renders forms from JSON schemas at runtime. Add support for new assets instantly without code changes.',
                            mediumDesc: 'Data-driven UI engine renders interactive forms from JSON schemas at runtime. Scale support for new assets like CDS or TRS instantly without code deployments.',
                            desc: 'Fully data-driven UI engine renders interactive forms directly from standard JSON schemas at runtime. Scale support for CDS or TRS instantly by simply updating a schema file—no frontend deployments required.' 
                        },
                        { 
                            badge: 'pdflatex · MiKTeX', 
                            color: 'text-emerald-600', 
                            title: 'LaTeX-Quality PDF Output', 
                            mobileDesc: 'Compiles pixel-perfect, ISDA-compliant confirmations using LaTeX. Deliver institutional-grade PDFs and editable DOCX exports.',
                            mediumDesc: 'High-fidelity engine leverages LaTeX to compile pixel-perfect, ISDA-compliant confirmations. Deliver institutional-grade PDFs and editable DOCX exports automatically.',
                            desc: 'High-fidelity document engine leverages Jinja2 and MiKTeX to compile pixel-perfect, ISDA-compliant confirmations. Deliver institutional-grade LaTeX PDFs and editable DOCX exports with automated formatting.' 
                        },
                        { 
                            badge: 'Multimodal Vision', 
                            color: 'text-orange-600', 
                            title: 'Multimodal PDF Validation', 
                            mobileDesc: 'Vision agents perform semantic audits, cross-referencing PDFs against source emails to detect subtle discrepancies instantly.',
                            mediumDesc: 'Multimodal vision agents perform semantic audits, cross-referencing generated PDFs against source emails to detect and flag subtle discrepancies in real-time.',
                            desc: 'Integrated multimodal vision agents perform exhaustive semantic audits, cross-referencing generated PDFs against source trade emails to detect and flag even the most subtle discrepancies in real-time.' 
                        },
                        { 
                            badge: 'LangGraph', 
                            color: 'text-cyan-600', 
                            title: 'Agentic Pipeline Orchestration', 
                            mobileDesc: 'LangGraph manages the full trade lifecycle. Conditional logic ensures type-safe data flow and error-handling across agents.',
                            mediumDesc: 'Sophisticated LangGraph orchestration manages the full trade lifecycle. Conditional state logic ensures type-safe data flow and autonomous error-handling across agents.',
                            desc: 'Sophisticated LangGraph orchestration manages the entire trade lifecycle—from classification to final validation. Conditional state logic ensures type-safe data flow and autonomous error-handling across agents.' 
                        },
                        { 
                            badge: 'Human-in-the-Loop', 
                            color: 'text-rose-600', 
                            title: 'Three-Layer Validation', 
                            mobileDesc: 'Multi-tier verification combining structural checks, AI comparison, and human review to guarantee 100% data integrity.',
                            mediumDesc: 'Rigorous multi-tier verification combining structural JSON checks, AI-powered semantic comparison, and human review to guarantee 100% data integrity.',
                            desc: 'Rigorous multi-tier verification framework combining structural JSON checks, AI-powered semantic comparison, and a mandatory human review gate to guarantee 100% data integrity for every confirmation.' 
                        },
                    ].map((f, i) => (
                        <motion.div
                            key={f.title}
                            variants={staggerItem}
                            className="relative flex flex-col md:flex-row items-center justify-end w-full max-w-6xl mx-auto top-0 md:sticky md:top-[var(--stack-top)] mb-10 md:mb-24"
                            style={{
                                '--stack-top': `calc(15dvh + ${i * 20}px)`,
                                zIndex: i + 1,
                            } as React.CSSProperties}
                        >
                            {/* Right: Image */}
                            <div className="w-full md:w-[60%] relative aspect-video md:aspect-16/10 rounded-2xl md:rounded-3xl overflow-hidden shadow-lg border-t border-white/40 bg-slate-50 ml-auto">
                                <Image
                                    src={`/${i + 1}.webp`}
                                    alt={f.title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    className={`object-cover transition-transform duration-700 hover:scale-105 ${i === 3 || i === 4 ? 'object-top-right md:object-[40px_center]' : 'object-center'}`}
                                />
                            </div>

                            {/* Left: Content Card */}
                            <div className="w-[95%] sm:w-[90%] md:absolute md:left-0 md:w-[45%] z-10 -mt-6 sm:-mt-10 md:mt-0 mx-auto md:mx-0">
                                <div className="bg-white border border-slate-100 shadow-[0_8px_20px_rgb(0,0,0,0.04)] rounded-[1.25rem] md:rounded-3xl p-4 sm:p-7 md:p-10 lg:p-14 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-slate-200 to-transparent opacity-80" />

                                    <span className={`inline-block text-[8px] sm:text-[10px] font-bold uppercase tracking-widest px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border bg-slate-50 border-slate-100 mb-3 md:mb-6 ${f.color}`}>
                                        {f.badge}
                                    </span>
                                    <h3 className="font-display text-lg sm:text-2xl md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl text-slate-800 mb-2 md:mb-4 leading-tight">
                                        {f.title}
                                    </h3>
                                    <p className="text-xs sm:text-base md:text-sm lg:text-base xl:text-lg text-slate-600 leading-relaxed font-medium pr-2 sm:pr-0">
                                        <span className="md:hidden">{f.mobileDesc}</span>
                                        <span className="hidden md:block lg:hidden">{f.mediumDesc}</span>
                                        <span className="hidden lg:block">{f.desc}</span>
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
