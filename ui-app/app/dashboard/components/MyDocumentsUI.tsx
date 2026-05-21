'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RecentDoc } from '../types';
import { docTypeName } from '../utils';

interface MyDocumentsUIProps {
  documents: RecentDoc[];
  onEdit?: (doc: RecentDoc) => void;
  onDelete?: (docId: string) => void;
  onFetchPdfBlob: (docId: string) => Promise<{ url: string; filename: string } | null>;
  onFormView?: (doc: RecentDoc) => void;
  onViewPdfPage?: (doc: RecentDoc) => void; // mobile: navigate to PDF page
}

const DOC_TYPES = [
  { id: 'drafts', label: 'Drafts' },
  { id: 'fx_ndf', label: 'FX NDF' },
  { id: 'irs', label: 'Interest Rate Swap' },
  { id: 'cds', label: 'Credit Default Swap' },
  { id: 'equity_trs', label: 'Equity TRS' },
];

export default function MyDocumentsUI({
  documents,
  onEdit,
  onDelete,
  onFetchPdfBlob,
  onFormView,
  onViewPdfPage,
}: MyDocumentsUIProps) {
  const [activeTab, setActiveTab] = useState('drafts');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; docId: string | null }>({
    isOpen: false,
    docId: null,
  });

  // ── Inline PDF preview state ──────────────────
  const [selectedDoc, setSelectedDoc] = useState<RecentDoc | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Revoke blob URL on unmount or before replacing
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  // Reset preview when switching tabs
  useEffect(() => {
    setSelectedDoc(null);
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    setPdfFilename('');
    setPdfError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Filter documents by type and status:
  // - 'drafts' tab contains: actual drafts (doc.is_draft) OR unsigned documents (validation_status === 'pending')
  // - asset tabs contain: only signed/verified documents (validation_status === 'verified')
  const filteredDocs = documents.filter((doc) => {
    if (activeTab === 'drafts') {
      return doc.is_draft || doc.validation_status === 'pending';
    }
    return !doc.is_draft && doc.validation_status === 'verified' && doc.doc_type === activeTab;
  });

  // Helper to get a descriptive title from doc data
  const getSmartTitle = (doc: RecentDoc) => {
    const data = doc.data || {};
    if (doc.doc_type === 'fx_ndf') {
      const pair = `${data.settlement_currency || ''}/${data.reference_currency || ''}`;
      const amount = data.notional_amount || '';
      if (pair !== '/' || amount) return `${pair} — ${amount}`;
    }
    if (doc.doc_type === 'irs') {
      const cp1 = data.party_a_full_name || '';
      const cp2 = data.party_b_full_name || '';
      if (cp1 && cp2) return `${cp1} vs ${cp2}`;
    }
    return doc.summary || doc.name;
  };

  const handleDeleteInitiate = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, docId });
  };

  const confirmDelete = () => {
    if (deleteModal.docId) {
      onDelete?.(deleteModal.docId);
      setDeleteModal({ isOpen: false, docId: null });
    }
  };

  // ── Click handler: drafts → form editor, mobile → PDF page, desktop → inline PDF ──
  const handleDocClick = async (doc: RecentDoc) => {
    if (doc.is_draft) {
      onEdit?.(doc);
      return;
    }

    // On mobile/tablet (< xl breakpoint), navigate to full PDF viewer page
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      onViewPdfPage?.(doc);
      return;
    }

    // Desktop (xl+): Fetch PDF for inline preview
    setSelectedDoc(doc);
    setPdfLoading(true);
    setPdfError(null);

    // Revoke previous blob URL
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }

    const result = await onFetchPdfBlob(doc._id);
    if (result) {
      setPdfBlobUrl(result.url);
      setPdfFilename(result.filename);
      setPdfLoading(false);
    } else {
      setPdfError('Failed to load PDF from cloud storage.');
      setPdfLoading(false);
    }
  };

  // ── Toolbar actions ──
  const handleDownload = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = pdfFilename || 'confirmation.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFormView = () => {
    if (selectedDoc) onFormView?.(selectedDoc);
  };

  // ── Determine if toolbar should be active (only for non-draft docs) ──
  const isNonDraftSelected = selectedDoc && !selectedDoc.is_draft;
  const showToolbar = isNonDraftSelected && !pdfLoading && !pdfError;

  return (
    <div className="flex flex-col min-h-full animate-fade-in gap-6 relative">
      {/* Page Header — hidden on mobile (shown in top nav strip), visible on desktop */}
      <div className="hidden lg:flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-inter tracking-tight">
          My Documents
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Browse and preview your generated trade confirmations by asset class.
        </p>
      </div>

      {/* Modern Tabs */}
      <div className="flex max-w-full gap-2 overflow-x-auto bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 w-full sm:w-fit">
        {DOC_TYPES.map((type) => {
          const count = documents.filter((doc) => {
            if (type.id === 'drafts') {
              return doc.is_draft || doc.validation_status === 'pending';
            }
            return !doc.is_draft && doc.validation_status === 'verified' && doc.doc_type === type.id;
          }).length;

          return (
            <button
              key={type.id}
              onClick={() => setActiveTab(type.id)}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === type.id
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {type.label}
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    activeTab === type.id
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area: Split View */}
      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
        {/* Left: Document List */}
        <div className="w-full xl:w-[380px] xl:max-h-[calc(100dvh-250px)] flex flex-col gap-3 overflow-y-auto xl:pr-2 custom-scrollbar">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => (
              <div
                key={doc._id}
                onClick={() => handleDocClick(doc)}
                className={`bg-white p-5 rounded-2xl border cursor-pointer transition-all group relative ${
                  selectedDoc?._id === doc._id
                    ? 'border-indigo-300 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-200'
                    : 'border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5'
                }`}
              >
                {/* Delete Button (Visible on Hover) */}
                <button
                  onClick={(e) => handleDeleteInitiate(e, doc._id)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-rose-50 text-rose-500 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center hover:bg-rose-500 hover:text-white z-10"
                >
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>

                <div className="flex items-center gap-4 mb-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                      doc.is_draft
                        ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white'
                        : (!doc.is_draft && doc.validation_status === 'pending')
                          ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
                          : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                    }`}
                  >
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {doc.is_draft ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      ) : (!doc.is_draft && doc.validation_status === 'pending') ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      )}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-bold truncate transition-colors ${
                        doc.is_draft
                          ? 'text-slate-800 group-hover:text-orange-600'
                          : (!doc.is_draft && doc.validation_status === 'pending')
                            ? 'text-slate-800 group-hover:text-amber-600'
                            : 'text-slate-800 group-hover:text-indigo-600'
                      }`}
                    >
                      {getSmartTitle(doc)}
                    </p>
                    <p className="text-[11px] text-slate-400 font-bold tracking-tight mt-0.5 uppercase">
                      {docTypeName(doc.doc_type).toUpperCase()} • REF:{' '}
                      {doc._id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-1.5">
                    {/* AI-Extracted Badge — shows logo for ai_created docs */}
                    {doc.ai_created && (
                      <span
                        title="AI-Extracted Document"
                        className="w-5 h-5 rounded-md bg-violet-50/80 flex items-center justify-center shrink-0"
                      >
                        <img src="/logo.svg" alt="AI" className="w-3 h-3 opacity-70" />
                      </span>
                    )}
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        doc.is_draft
                          ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                          : (!doc.is_draft && doc.validation_status === 'pending')
                            ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                            : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {doc.is_draft
                        ? 'In Progress'
                        : (!doc.is_draft && doc.validation_status === 'pending')
                          ? 'Pending Review'
                          : 'Verified'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                      {new Date(doc.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-48 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <div className="text-3xl mb-2 opacity-20">📂</div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                No {activeTab.replace('_', ' ')} docs found
              </p>
            </div>
          )}
        </div>

        {/* Right: Live Preview Panel — only visible on xl+ screens (hidden on mobile/tablet) */}
        <div className="hidden xl:flex flex-1 min-h-[300px] sm:min-h-[360px] bg-white rounded-2xl sm:rounded-3xl border border-border-secondary shadow-sm overflow-hidden flex-col relative">
          {/* Toolbar Header */}
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white z-10 shrink-0">
            <span className="text-xs font-bold text-text-tertiary flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Live Preview Mode
              {isNonDraftSelected && (
                <span className="text-slate-400 font-medium normal-case ml-1 truncate max-w-[180px] sm:max-w-[300px]">
                  — {getSmartTitle(selectedDoc!)}
                </span>
              )}
            </span>

            {/* Toolbar buttons — only active for verified selected doc */}
            {showToolbar && (
              <div className="flex gap-1">
                {/* Download */}
                <button
                  onClick={handleDownload}
                  title="Download PDF"
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </button>

                {/* Form / Edit Data */}
                <button
                  onClick={handleFormView}
                  title="View Form Data"
                  className="p-2 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Preview Content */}
          <div className="flex-1 bg-slate-100/50 flex items-center justify-center relative min-h-0">
            {/* Loading spinner */}
            {pdfLoading && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Loading PDF...
                </p>
              </div>
            )}

            {/* PDF Error */}
            {pdfError && !pdfLoading && (
              <div className="flex flex-col items-center gap-4 max-w-xs text-center">
                <div className="w-16 h-16 rounded-3xl bg-rose-50 shadow-xl flex items-center justify-center text-2xl">
                  ⚠️
                </div>
                <p className="font-bold text-slate-700">{pdfError}</p>
                <button
                  onClick={() => selectedDoc && handleDocClick(selectedDoc)}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* PDF iframe */}
            {pdfBlobUrl && !pdfLoading && !pdfError && (
              <iframe
                src={`${pdfBlobUrl}#toolbar=0`}
                title={pdfFilename || 'PDF Preview'}
                className="w-full h-full border-0"
                style={{ minHeight: '100%' }}
              />
            )}

            {/* Placeholder (no doc selected) */}
            {!selectedDoc && !pdfLoading && !pdfError && (
              <div className="flex flex-col items-center gap-4 max-w-xs text-center">
                <div className="w-16 h-16 rounded-3xl bg-white shadow-xl flex items-center justify-center text-2xl text-primary animate-pulse">
                  📄
                </div>
                <div>
                  <p className="font-bold text-text-secondary">Select a document to preview</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    Click a trade from the list to render its PDF here in Live Preview Mode.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Overlay for "Direct View" feel */}
          <div className="absolute inset-0 pointer-events-none border-[12px] border-white rounded-3xl" />
        </div>
      </div>

      {/* CUSTOM DELETE MODAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setDeleteModal({ isOpen: false, docId: null })}
          />
          <div className="bg-white rounded-[24px] sm:rounded-[32px] w-full max-w-[90vw] sm:max-w-sm p-6 sm:p-8 shadow-2xl relative z-10 animate-in zoom-in-95 fade-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center text-3xl mb-6">
                <svg
                  width="32"
                  height="32"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Document?</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                This action cannot be undone. This document will be permanently removed from
                your history.
              </p>
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={confirmDelete}
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-[15px] hover:bg-rose-600 transition-all active:scale-[0.98] shadow-lg shadow-rose-500/20"
                >
                  Yes, Delete it
                </button>
                <button
                  onClick={() => setDeleteModal({ isOpen: false, docId: null })}
                  className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold text-[15px] hover:bg-slate-100 transition-all active:scale-[0.98]"
                >
                  Keep it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
