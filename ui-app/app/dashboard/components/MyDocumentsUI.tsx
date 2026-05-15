'use client';

import React, { useState } from 'react';
import { RecentDoc } from '../types';
import { docTypeName } from '../utils';

interface MyDocumentsUIProps {
  documents: RecentDoc[];
  onViewPdf: (doc: RecentDoc) => void;
  onEdit?: (doc: RecentDoc) => void;
  onDelete?: (docId: string) => void;
}

const DOC_TYPES = [
  { id: 'drafts', label: 'Drafts' },
  { id: 'fx_ndf', label: 'FX NDF' },
  { id: 'irs', label: 'Interest Rate Swap' },
  { id: 'cds', label: 'Credit Default Swap' },
  { id: 'equity_trs', label: 'Equity TRS' },
];

export default function MyDocumentsUI({ documents, onViewPdf, onEdit, onDelete }: MyDocumentsUIProps) {
  const [activeTab, setActiveTab] = useState('drafts');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; docId: string | null }>({
    isOpen: false,
    docId: null
  });
  
  // Filter documents by type and draft status
  const filteredDocs = documents.filter(doc => {
    if (activeTab === 'drafts') return doc.is_draft;
    return !doc.is_draft && doc.doc_type === activeTab;
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

  const handleDocClick = (doc: RecentDoc) => {
    if (doc.is_draft) {
      onEdit?.(doc);
    } else {
      onViewPdf(doc);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in gap-6 relative">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900 font-inter tracking-tight">My Documents</h1>
        <p className="text-sm text-slate-500 font-medium">Browse and preview your generated trade confirmations by asset class.</p>
      </div>

      {/* Modern Tabs */}
      <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 w-fit">
        {DOC_TYPES.map((type) => {
          const count = documents.filter(doc => {
            if (type.id === 'drafts') return doc.is_draft;
            return !doc.is_draft && doc.doc_type === type.id;
          }).length;

          return (
            <button
              key={type.id}
              onClick={() => setActiveTab(type.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                activeTab === type.id 
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {type.label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  activeTab === type.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area: Split View */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left: Document List */}
        <div className="w-[380px] flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => (
              <div 
                key={doc._id}
                onClick={() => handleDocClick(doc)}
                className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer transition-all group relative"
              >
                {/* Delete Button (Visible on Hover) */}
                <button 
                  onClick={(e) => handleDeleteInitiate(e, doc._id)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-rose-50 text-rose-500 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center hover:bg-rose-500 hover:text-white z-10"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                <div className="flex items-center gap-4 mb-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                    doc.is_draft ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                  }`}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {doc.is_draft ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      )}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate transition-colors ${doc.is_draft ? 'text-slate-800 group-hover:text-amber-600' : 'text-slate-800 group-hover:text-indigo-600'}`}>
                      {getSmartTitle(doc)}
                    </p>
                    <p className="text-[11px] text-slate-400 font-bold tracking-tight mt-0.5 uppercase">
                      {docTypeName(doc.doc_type).toUpperCase()} • REF: {doc._id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${doc.is_draft ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {doc.is_draft ? 'In Progress' : 'Verified Trade'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{new Date(doc.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-48 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <div className="text-3xl mb-2 opacity-20">📂</div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No {activeTab.replace('_', ' ')} docs found</p>
            </div>
          )}
        </div>

        {/* Right: PDF Preview Placeholder */}
        <div className="flex-1 bg-white rounded-3xl border border-border-secondary shadow-sm overflow-hidden flex flex-col relative">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white z-10">
            <span className="text-xs font-bold text-text-tertiary flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Live Preview Mode
            </span>
            <div className="flex gap-2">
              <button className="p-2 rounded-lg hover:bg-bg-main text-text-tertiary"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></button>
              <button className="p-2 rounded-lg hover:bg-bg-main text-text-tertiary"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
            </div>
          </div>
          
          <div className="flex-1 bg-slate-100/50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 max-w-xs text-center">
              <div className="w-16 h-16 rounded-3xl bg-white shadow-xl flex items-center justify-center text-2xl text-primary animate-pulse">📄</div>
              <div>
                <p className="font-bold text-text-secondary">Select a document to preview</p>
                <p className="text-xs text-text-tertiary mt-1">Once selected, the PDF generated and stored on GCP will be rendered here.</p>
              </div>
            </div>
          </div>

          {/* Overlay for "Direct View" feel */}
          <div className="absolute inset-0 pointer-events-none border-12 border-white rounded-3xl" />
        </div>
      </div>

      {/* CUSTOM DELETE MODAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setDeleteModal({ isOpen: false, docId: null })}
          />
          <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative z-10 animate-in zoom-in-95 fade-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center text-3xl mb-6">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Document?</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                This action cannot be undone. This document will be permanently removed from your history.
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
