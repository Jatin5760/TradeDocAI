'use client';

import React from 'react';
import { renderMarkdown } from '../utils';

interface ValidationProps {
  report: string;
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
  validationDate?: string;
  onRegenerate?: () => void;
}

export default function ValidationReport({
  report,
  isOpen,
  onClose,
  documentTitle,
  validationDate,
  onRegenerate,
}: ValidationProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[59] bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 w-full max-w-[92vw] sm:max-w-xl flex flex-col z-[60] animate-in slide-in-from-right duration-500 ease-out"
        style={{
          background: '#ffffff',
          borderLeft: '1px solid rgba(226,232,240,0.7)',
          boxShadow: '-8px 0 48px rgba(0,0,0,0.10)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 sm:px-7 py-4 sm:py-5 flex flex-col gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(248,249,252,1) 100%)',
            borderBottom: '1px solid rgba(226,232,240,0.6)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  boxShadow: '0 4px 14px rgba(79,70,229,0.22)',
                }}
              >
                <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '15px',
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
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors duration-150 shrink-0"
              style={{ color: '#94a3b8', background: 'transparent' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(241,245,249,1)'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Document Context Badge */}
          {(documentTitle || validationDate) && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
              {documentTitle && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <svg width="14" height="14" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  <span className="text-[11px] font-bold text-slate-600 truncate">{documentTitle}</span>
                </div>
              )}
              {validationDate && (
                <>
                  <span className="w-px h-4 bg-slate-200" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{validationDate}</span>
                </>
              )}
              <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Verified</span>
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto p-5 sm:p-7 prose prose-slate max-w-none prose-sm custom-scrollbar"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          <div
            className="validation-content text-xs sm:text-[13px]"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
            style={{ lineHeight: 1.7, color: '#475569' }}
          />
        </div>

        {/* Footer */}
        <div
          className="p-4 sm:p-5 flex flex-col sm:flex-row gap-2.5"
          style={{ borderTop: '1px solid rgba(226,232,240,0.6)', background: 'rgba(248,249,252,0.8)' }}
        >
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex-1 py-3 sm:py-3.5 font-bold text-xs sm:text-sm transition-all duration-200 rounded-xl"
              style={{
                background: '#ffffff',
                color: '#4f46e5',
                border: '1.5px solid rgba(99,102,241,0.2)',
                fontFamily: "'DM Sans', system-ui, sans-serif",
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.04)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.4)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.2)'; }}
            >
              <span className="flex items-center justify-center gap-1.5">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Regenerate Report
              </span>
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3 sm:py-3.5 font-bold text-xs sm:text-sm transition-all duration-200 rounded-xl"
            style={{
              background: '#1e293b',
              color: 'white',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              border: '1px solid #0f172a',
              boxShadow: '0 4px 16px rgba(15,23,42,0.20)',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0f172a'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1e293b'; }}
          >
            Close Drawer
          </button>
        </div>
      </div>
    </>
  );
}
