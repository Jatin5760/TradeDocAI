'use client';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const GlobeInteractive = dynamic(() => import('../components/GlobeInteractive').then(m => m.GlobeInteractive), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-indigo-50/10 animate-pulse rounded-full" />,
});

export default function Comparison() {
    return (
        <section id="why-tradedoc" className="relative z-30 bg-[#f8f9fc] pt-16 sm:pt-32 pb-16 sm:pb-32 overflow-hidden">
            <div className="max-w-[1400px] mx-auto px-6">
                <motion.div
                    className="text-center mb-8 sm:mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                    <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-6xl text-slate-900 tracking-tight leading-tight flex flex-wrap items-center justify-center gap-3 lg:gap-4">
                        <span className="bg-[#4f46e5] text-white px-4 sm:px-6 py-2 rounded-[20px] shadow-xl shadow-indigo-100 inline-block">TradeDocAI</span>
                        <span>vs Manual Process</span>
                    </h2>
                </motion.div>

                {/* 3D Layered Container */}
                <div className="relative min-h-0 lg:min-h-[560px] flex items-center">

                    {/* Globe — absolutely positioned behind, right side, massive */}
                    <div
                        className="hidden lg:block absolute right-[-80px] top-1/2 -translate-y-1/2 w-[700px] h-[700px] z-0"
                        role="img"
                        aria-label="Interactive 3D globe showing TradeDocAI's global trade reach"
                    >
                        <GlobeInteractive className="w-full h-full" />
                    </div>

                    {/* Table — floats on top of globe, left-center */}
                    <motion.div
                        className="relative z-10 w-full lg:w-[58%] lg:ml-10"
                        initial={{ opacity: 0, x: -24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                    >
                        <div className="bg-white/95 border border-white/60 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-[0_15px_35px_-10px_rgba(79,70,229,0.12),0_4px_12px_rgba(0,0,0,0.04)]">
                            {/* Table Header */}
                            <div className="grid grid-cols-[0.8fr_1.1fr_1.1fr] text-[9px] sm:text-[11px] font-bold uppercase tracking-[1px] sm:tracking-[2px] bg-slate-900 text-white rounded-t-[1.5rem] sm:rounded-t-[2.5rem] overflow-hidden">
                                <div className="px-3 py-4 sm:px-7 sm:py-5">Metric</div>
                                <div className="px-3 py-4 sm:px-7 sm:py-5 bg-slate-800">Traditional Manual</div>
                                <div className="px-3 py-4 sm:px-7 sm:py-5 bg-indigo-600">TradeDocAI</div>
                            </div>
                            {/* Table Rows */}
                            {[
                                [
                                    <><span key="1" className="sm:hidden">Processing</span><span key="2" className="hidden sm:inline">Processing Time</span></>,
                                    <><span key="1" className="sm:hidden">Hours / trade</span><span key="2" className="hidden sm:inline">45 min – 2 hours per trade</span></>,
                                    <><span key="1" className="sm:hidden">&lt; 2 Mins</span><span key="2" className="hidden sm:inline">Under 2 minutes end-to-end</span></>
                                ],
                                [
                                    <><span key="1" className="sm:hidden">Error Rate</span><span key="2" className="hidden sm:inline">Error Probability</span></>,
                                    <><span key="1" className="sm:hidden">High Risk</span><span key="2" className="hidden sm:inline">High risk of manual entry errors</span></>,
                                    <><span key="1" className="sm:hidden">Near-Zero</span><span key="2" className="hidden sm:inline">Near-zero with deterministic AI</span></>
                                ],
                                [
                                    <><span key="1" className="sm:hidden">Consistency</span><span key="2" className="hidden sm:inline">Output Consistency</span></>,
                                    <><div key="1" className="sm:hidden flex items-center"><svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></div><span key="2" className="hidden sm:inline">Subjective based on analyst experience</span></>,
                                    <><div key="1" className="sm:hidden flex items-center"><svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div><span key="2" className="hidden sm:inline">100% standardized institutional logic</span></>
                                ],
                                [
                                    <><span key="1" className="sm:hidden">Scalability</span><span key="2" className="hidden sm:inline">Operational Scale</span></>,
                                    <><span key="1" className="sm:hidden">Limited</span><span key="2" className="hidden sm:inline">Linearly limited by team headcount</span></>,
                                    <><span key="1" className="sm:hidden">Infinite</span><span key="2" className="hidden sm:inline">Instant cloud-scale throughput</span></>
                                ],
                                [
                                    <><span key="1" className="sm:hidden">Validation</span><span key="2" className="hidden sm:inline">Validation Method</span></>,
                                    <><div key="1" className="sm:hidden flex items-center"><svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></div><span key="2" className="hidden sm:inline">Manual peer-review audit required</span></>,
                                    <><div key="1" className="sm:hidden flex items-center"><svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div><span key="2" className="hidden sm:inline">Automated vision-based verification</span></>
                                ],
                            ].map(([metric, manual, ai], i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -16 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
                                    className="grid grid-cols-[0.8fr_1.1fr_1.1fr] text-[11px] sm:text-sm border-b border-slate-100/80 last:border-0 last:rounded-b-[1.5rem] sm:last:rounded-b-[2.5rem] transition-transform duration-300 group hover:scale-[1.02] hover:z-30 relative items-center"
                                >
                                    <div className="px-3 py-4 sm:px-7 sm:py-5 text-slate-500 font-semibold bg-slate-50/60 rounded-l-xl transition-colors group-hover:bg-indigo-50/30 group-hover:text-slate-900 h-full flex items-center">{metric as React.ReactNode}</div>
                                    <div className="px-3 py-4 sm:px-7 sm:py-5 text-slate-600 border-x border-slate-100/80 group-hover:border-slate-200/50 transition-[background-color,border-color] duration-300 group-hover:bg-white h-full flex items-center">{manual as React.ReactNode}</div>
                                    <div className="px-3 py-4 sm:px-7 sm:py-5 text-indigo-600 font-bold rounded-r-xl transition-[background-color,color] duration-300 group-hover:text-indigo-800 group-hover:bg-indigo-50/30 h-full flex items-center">
                                        {ai as React.ReactNode}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
