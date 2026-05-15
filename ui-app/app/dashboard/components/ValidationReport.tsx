'use client';

import React from 'react';
import { renderMarkdown } from '../utils';

interface ValidationProps {
  report: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ValidationReport({ report, isOpen, onClose }: ValidationProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 w-full max-w-xl flex flex-col z-[60] animate-in slide-in-from-right duration-500 ease-out"
      style={{
        background: '#ffffff',
        borderLeft: '1px solid rgba(226,232,240,0.7)',
        boxShadow: '-8px 0 48px rgba(0,0,0,0.10)',
      }}
    >
      {/* Header */}
      <div
        className="px-7 py-5 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(248,249,252,1) 100%)',
          borderBottom: '1px solid rgba(226,232,240,0.6)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.15)' }}
          >
            🔍
          </div>
          <div>
            <h3
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: '#0f172a',
                fontFamily: "'DM Serif Display', Georgia, serif",
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              AI Validation Report
            </h3>
            <p
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#7c3aed',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontFamily: "'DM Sans', system-ui, sans-serif",
                marginTop: '2px',
              }}
            >
              Consistency Audit
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors duration-150"
          style={{ color: '#94a3b8', background: 'transparent' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(241,245,249,1)'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-y-auto p-7 prose prose-slate max-w-none prose-sm"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        <div
          className="validation-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
          style={{ fontSize: '13px', lineHeight: 1.7, color: '#475569' }}
        />
      </div>

      {/* Footer */}
      <div
        className="p-6"
        style={{ borderTop: '1px solid rgba(226,232,240,0.6)', background: 'rgba(248,249,252,0.8)' }}
      >
        <button
          onClick={onClose}
          className="w-full py-3.5 font-bold text-sm transition-all duration-200"
          style={{
            background: '#1e293b',
            color: 'white',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            border: '1px solid #0f172a',
            boxShadow: '0 4px 16px rgba(15,23,42,0.20)',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0f172a'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1e293b'; }}
        >
          Acknowledge &amp; Close
        </button>
      </div>
    </div>
  );
}
