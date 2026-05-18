'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Showcase() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section id="showcase" className="max-w-7xl mx-auto px-3 sm:px-6 py-14 md:py-24">
      {/* ── Heading ── */}
      <motion.div
        className="text-center max-w-3xl mx-auto mb-10 md:mb-14"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="inline-block text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-indigo-500 mb-3 md:mb-4 bg-indigo-50 px-4 py-1.5 rounded-full">
          Watch Demo
        </span>
        <h2 className="font-display text-xl sm:text-3xl md:text-4xl lg:text-5xl text-slate-900 mb-4 md:mb-6 tracking-tight leading-tight">
          See TradeDoc AI in Action
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
          Watch how our AI-powered platform transforms complex trade confirmations into ISDA-compliant documents in
          seconds — no manual data entry, no errors.
        </p>
      </motion.div>

      {/* ── Video Container ── */}
      <motion.div
        className="relative mx-auto max-w-5xl"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Outer glow ring */}
        <div
          className="absolute -inset-1.5 sm:-inset-3 rounded-[24px] sm:rounded-[36px] bg-gradient-to-r from-indigo-400/30 via-purple-400/30 to-sky-400/30 blur-2xl transition-opacity duration-700"
          style={{ opacity: isHovered ? 0.8 : 0.35 }}
        />

        {/* Decorative accent blobs */}
        <div className="absolute -top-10 -right-10 w-28 h-28 sm:w-40 sm:h-40 bg-indigo-300/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 sm:w-40 sm:h-40 bg-purple-300/15 rounded-full blur-3xl pointer-events-none" />

        {/* Main frame */}
        <div className="relative rounded-[20px] sm:rounded-[32px] border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(79,70,229,0.15),0_0_0_1px_rgba(255,255,255,0.6)_inset] overflow-hidden transition-shadow duration-500 group"
          style={{
            boxShadow: isHovered
              ? '0_30px_80px_-15px_rgba(79,70,229,0.25),0_0_0_1px_rgba(255,255,255,0.8)_inset'
              : '0_20px_60px_-15px_rgba(79,70,229,0.15),0_0_0_1px_rgba(255,255,255,0.6)_inset',
          }}
        >
          {/* Top gradient sheen */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent z-10" />

          {/* 16:9 aspect ratio wrapper */}
          <div className="relative w-full bg-slate-950" style={{ paddingBottom: '56.25%' }}>
            {/* Placeholder YouTube iframe */}
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="TradeDoc AI — Platform Walkthrough"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              style={{ border: 'none' }}
            />

            {/* Subtle inner vignette overlay — gives depth without blocking interaction */}
            <div
              className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-[20px] sm:rounded-[32px]"
              style={{
                background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.25) 100%)',
              }}
            />
          </div>

          {/* Bottom caption bar */}
          <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-white/50 backdrop-blur-sm border-t border-white/40">
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Mini play icon */}
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-105">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-tight">
                  TradeDoc AI — Full Platform Demo
                </p>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-tight">
                  2:48 min · Product Walkthrough
                </p>
              </div>
            </div>

            {/* Watch on YouTube subtle link */}
            <a
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors duration-200"
            >
              <span>Watch on YouTube</span>
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}