'use client';
import { motion } from 'framer-motion';

export default function Pricing() {
    return (
        <section id="pricing" className="pt-12 md:pt-16 lg:pt-32 pb-0 sm:pb-0 bg-slate-50 relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-6 relative z-10">
                {/* Economics Comparison */}
                <div className="mb-4 md:mb-4 lg:mb-8">
                        <motion.div
                            className="text-center mb-8 sm:mb-16"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-slate-800 mb-4 flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-4 gap-y-2">
                                <span className="bg-indigo-600 text-white px-3 sm:px-5 py-1.5 rounded-2xl shadow-xl shadow-indigo-100 inline-block">TradeDocAI</span>
                                <span>Cost vs Traditional Costs</span>
                            </h2>
                            <p className="text-slate-500 max-w-2xl mx-auto text-base">Significant operational savings with institutional-grade precision.</p>
                        </motion.div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-10 items-stretch max-w-5xl mx-auto">
                            {/* Card 1: Traditional Internal Workflow */}
                            <motion.div
                                className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-10 border border-slate-100 shadow-sm flex flex-col h-full"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                            >
                                <p className="text-[9px] sm:text-xs font-bold text-slate-400 mb-2 sm:mb-4 uppercase tracking-wider sm:tracking-widest">Traditional</p>
                                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 mb-3 sm:mb-6">
                                    <span className="text-xl sm:text-5xl font-display font-bold text-rose-400">₹300-2k</span>
                                    <span className="text-[10px] sm:text-base text-slate-400 font-medium">/ doc</span>
                                </div>
                                <p className="text-slate-600 text-[10px] sm:text-sm leading-snug sm:leading-relaxed mb-4 sm:mb-8">Manual high-cost review cycles and legacy compliance workflows.</p>
                                <div className="mt-auto pt-3 sm:pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                                    <span className="text-[8px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">Processing</span>
                                    <span className="text-[10px] sm:text-sm font-bold text-rose-500">30 Mins - 2 Hrs</span>
                                </div>
                            </motion.div>

                            {/* Card 2: TradeDocAI */}
                            <motion.div
                                className="bg-gradient-to-b from-slate-900 to-indigo-950 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-10 border border-indigo-800/50 shadow-xl flex flex-col relative overflow-hidden h-full"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                            >
                                <div className="absolute top-0 right-3 sm:right-8 bg-indigo-500 text-white text-[7px] sm:text-[9px] font-bold uppercase tracking-widest px-2 sm:px-3 py-1 sm:py-1.5 rounded-b-sm sm:rounded-b-md shadow-sm">Benchmark</div>
                                <div className="absolute -right-20 -top-20 w-32 h-32 sm:w-64 sm:h-64 bg-indigo-500/20 blur-2xl sm:blur-3xl rounded-full" />

                                <p className="text-[9px] sm:text-xs font-bold text-indigo-300 mb-2 sm:mb-4 uppercase tracking-wider sm:tracking-widest relative z-10">TradeDocAI</p>
                                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 mb-3 sm:mb-6 relative z-10">
                                    <span className="text-xl sm:text-5xl font-display font-bold text-white">₹6-20</span>
                                    <span className="text-[10px] sm:text-base text-indigo-200 font-medium">/ doc</span>
                                </div>
                                <p className="text-indigo-100/80 text-[10px] sm:text-sm leading-snug sm:leading-relaxed mb-4 sm:mb-8 relative z-10">AI-automated generation with instant validation and extraction.</p>
                                <div className="mt-auto pt-3 sm:pt-5 border-t border-indigo-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 relative z-10">
                                    <span className="text-[8px] sm:text-xs font-semibold text-indigo-300 uppercase tracking-wide">Processing</span>
                                    <span className="text-[10px] sm:text-sm font-bold text-emerald-400">&lt; 2 min</span>
                                </div>
                            </motion.div>
                        </div>
                </div>
            </div>
        </section>
    );
}
