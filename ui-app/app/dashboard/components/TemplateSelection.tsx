'use client';

import React from 'react';

interface TemplateProps {
  onSelect: (type: 'fx_ndf' | 'irs' | 'cds' | 'equity_trs') => void;
  onAI: () => void;
}

const templates = [
  {
    id: 'fx_ndf' as const,
    name: 'FX NDF',
    desc: 'Non-Deliverable Forward',
    emoji: '💱',
    accent: '#6366f1',
    accentLight: 'rgba(99,102,241,0.08)',
  },
  {
    id: 'irs' as const,
    name: 'IRS',
    desc: 'Interest Rate Swap',
    emoji: '📉',
    accent: '#10b981',
    accentLight: 'rgba(16,185,129,0.08)',
  },
  {
    id: 'cds' as const,
    name: 'CDS',
    desc: 'Credit Default Swap',
    emoji: '🛡️',
    accent: '#f59e0b',
    accentLight: 'rgba(245,158,11,0.08)',
  },
  {
    id: 'equity_trs' as const,
    name: 'Equity TRS',
    desc: 'Total Return Swap',
    emoji: '📈',
    accent: '#f43f5e',
    accentLight: 'rgba(244,63,94,0.08)',
  },
] as const;

export default function TemplateSelection({ onSelect, onAI }: TemplateProps) {
  return (
    <section className="mb-12">
      {/* Section header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1"
            style={{ color: '#94a3b8', fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            New Confirmation
          </p>
          <h2
            className="leading-tight"
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#0f172a',
              fontFamily: "'DM Serif Display', Georgia, serif",
              letterSpacing: '-0.02em',
            }}
          >
            Choose a Template
          </h2>
          <p
            className="text-[13px] mt-0.5"
            style={{ color: '#94a3b8', fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            Select a product type to begin your trade confirmation flow.
          </p>
        </div>

        {/* AI Extraction CTA */}
        <button
          onClick={onAI}
          className="flex items-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            border: '1px solid #4338ca',
            boxShadow: '0 8px 20px rgba(79,70,229,0.30)',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 28px rgba(79,70,229,0.40)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(79,70,229,0.30)';
          }}
        >
          <span className="text-base">🤖</span>
          AI Extraction
        </button>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => onSelect(tpl.id)}
            className="group relative text-left overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1"
            style={{
              border: '1px solid rgba(226,232,240,0.8)',
              borderLeftWidth: '3px',
              borderLeftColor: tpl.accent,
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              padding: '20px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 12px 32px rgba(0,0,0,0.09)`;
              (e.currentTarget as HTMLButtonElement).style.borderColor = tpl.accent;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(226,232,240,0.8)';
              (e.currentTarget as HTMLButtonElement).style.borderLeftColor = tpl.accent;
            }}
          >
            {/* Ghost watermark letter */}
            <span
              className="pointer-events-none select-none absolute right-2 top-1 leading-none"
              style={{
                fontSize: '56px',
                fontWeight: 900,
                color: tpl.accent,
                opacity: 0.05,
                fontFamily: "'DM Serif Display', Georgia, serif",
              }}
            >
              {tpl.name.charAt(0)}
            </span>

            {/* Icon */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-4 transition-transform duration-300 group-hover:scale-110"
              style={{ background: tpl.accentLight }}
            >
              {tpl.emoji}
            </div>

            {/* Text */}
            <h3
              className="mb-1 transition-colors duration-200"
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#0f172a',
                fontFamily: "'DM Serif Display', Georgia, serif",
                letterSpacing: '-0.01em',
              }}
            >
              {tpl.name}
            </h3>
            <p
              className="leading-relaxed"
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              {tpl.desc}
            </p>

            {/* Hover arrow */}
            <div
              className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300"
              style={{ color: tpl.accent }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
