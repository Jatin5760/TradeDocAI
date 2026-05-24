'use client';

import React from 'react';
import { RecentDoc } from '../types';
import { docTypeName } from '../utils';

interface RecentDocsProps {
  documents: RecentDoc[];
  onLoad: (doc: RecentDoc) => void;
  onView?: (doc: RecentDoc) => void;
  onCreateNew?: () => void;
}

const docAccentColor: Record<string, string> = {
  fx_ndf: '#6366f1',
  irs: '#10b981',
  cds: '#f59e0b',
  equity_trs: '#f43f5e',
};
const FALLBACK_UPDATED_AT = '1970-01-01T00:00:00.000Z';

export default function RecentDocuments({ documents, onLoad, onView, onCreateNew }: RecentDocsProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

  if (documents.length === 0) {
    return (
      <div
        className="rounded-2xl bg-white flex flex-col items-center justify-center text-center py-10 sm:py-16 px-4 sm:px-8"
        style={{ border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5"
          style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.12)' }}
        >
          🗄️
        </div>
        <h3
          className="mb-2"
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#0f172a',
            fontFamily: "'DM Serif Display', Georgia, serif",
            letterSpacing: '-0.02em',
          }}
        >
          No documents yet
        </h3>
        <p
          className="max-w-xs"
          style={{ fontSize: '13px', color: '#94a3b8', fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1.6 }}
        >
          Generate your first trade confirmation to see it listed here in your workspace.
        </p>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="mt-6"
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: 'white',
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: "'DM Sans', system-ui, sans-serif",
              border: '1px solid #4338ca',
              boxShadow: '0 6px 18px rgba(79,70,229,0.28)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(79,70,229,0.38)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(79,70,229,0.28)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
          >
            ✨ Create Your First Document
          </button>
        )}
      </div>
    );
  }

  const totalPages = Math.ceil(documents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDocs = documents.slice(startIndex, startIndex + pageSize);

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    }
  };

  return (
    <div
      className="rounded-2xl bg-white overflow-hidden flex flex-col"
      style={{ border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
    >
      {/* Header */}
      <div
        className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(241,245,249,1)' }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#6366f1' }}
          />
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#0f172a',
              fontFamily: "'DM Serif Display', Georgia, serif",
              letterSpacing: '-0.01em',
            }}
          >
            All Documents
          </h3>
        </div>
        <span
          className="px-2.5 py-1 rounded-full"
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#6366f1',
            background: 'rgba(99,102,241,0.08)',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {documents.length} Total
        </span>
      </div>

      {/* Pagination Controls (TOP) */}
      {totalPages > 1 && (
        <div className="px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/30">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            Page <span className="text-slate-800">{currentPage}</span> of <span className="text-slate-800">{totalPages}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
              className={`p-1.5 rounded-lg border transition-all ${currentPage === 1 ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${currentPage === p ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
              className={`p-1.5 rounded-lg border transition-all ${currentPage === totalPages ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr style={{ background: 'rgba(248,249,252,0.8)' }}>
              {['Trade Reference', 'Type', 'Status', 'Actions'].map((h, i) => (
                <th
                  key={i}
                  className="px-3 sm:px-6 py-2 sm:py-3"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    textAlign: i === 3 ? 'right' : 'left',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedDocs.map((doc) => {
              const accent = docAccentColor[doc.doc_type] || '#6366f1';
              return (
                <tr
                  key={doc._id}
                  className="group transition-colors duration-150"
                  style={{
                    borderTop: '1px solid rgba(241,245,249,1)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(248,249,252,0.7)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                  }}
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-1 h-8 rounded-full shrink-0"
                        style={{ background: accent, opacity: 0.5 }}
                      />
                      <div>
                        <p
                          className="text-[11px] sm:text-[13px] max-w-[120px] sm:max-w-none truncate"
                          style={{
                            fontWeight: 600,
                            color: '#1e293b',
                            fontFamily: "'DM Sans', system-ui, sans-serif",
                          }}
                        >
                          {doc.summary || 'Trade Confirmation'}
                        </p>
                        <p className="text-[10px] sm:text-[11px]" style={{ color: '#94a3b8', fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: '1px' }}>
                          {new Date(doc.updated_at || FALLBACK_UPDATED_AT).toLocaleDateString()} at {new Date(doc.updated_at || FALLBACK_UPDATED_AT).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ color: accent, background: `${accent}12`, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                    >
                      {docTypeName(doc.doc_type)}
                    </span>
                  </td>
                   <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: doc.is_draft
                            ? '#ea580c'
                            : (!doc.is_draft && doc.validation_status === 'pending')
                              ? '#d97706'
                              : doc.client_signed
                                ? '#059669'
                                : doc.signed
                                  ? '#4f46e5'
                                  : '#10b981'
                        }}
                      />
                      <span
                        className="text-[12px] font-bold"
                        style={{
                          color: doc.is_draft
                            ? '#ea580c'
                            : (!doc.is_draft && doc.validation_status === 'pending')
                              ? '#d97706'
                              : doc.client_signed && doc.released
                                ? '#059669'
                                : doc.client_signed
                                  ? '#d97706'
                                  : doc.signed
                                    ? '#4f46e5'
                                    : '#10b981'
                        }}
                      >
                        {doc.is_draft
                          ? 'In Progress'
                          : (!doc.is_draft && doc.validation_status === 'pending')
                            ? 'Pending Review'
                            : doc.client_signed && doc.released
                              ? 'Fully Executed'
                              : doc.client_signed
                                ? 'Signed – Pending Verification'
                                : doc.signed
                                  ? 'Signed (Pending Client)'
                                  : 'Verified'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* AI-Extracted Badge — shown left of eye button for ai_created docs */}
                      {doc.ai_created && (
                        <span
                          title="AI-Extracted Document"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-50/80"
                        >
                          <img src="/logo.svg" alt="AI" className="w-4 h-4 opacity-70" />
                        </span>
                      )}
                      {/* View PDF — disabled for in-progress drafts */}
                      {doc.is_draft ? (
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 cursor-not-allowed transition-all relative group"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {/* Instant Tooltip */}
                          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none border border-slate-800">
                            PDF in progress
                            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                          </span>
                        </span>
                      ) : (
                        <button
                          onClick={() => onView?.(doc)}
                          title="View PDF"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      )}
                      {/* Edit document — always enabled */}
                      <button
                        onClick={() => onLoad(doc)}
                        title="Edit document"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-all"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
