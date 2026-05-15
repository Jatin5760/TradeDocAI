'use client';

import React from 'react';
import { RecentDoc } from '../types';

interface DocumentTypeBreakdownProps {
  documents: RecentDoc[];
}

export default function DocumentTypeBreakdown({ documents = [] }: DocumentTypeBreakdownProps) {
  // Real Data Aggregation
  const typeCounts: Record<string, number> = {
    fx_ndf: documents.filter(d => d.doc_type === 'fx_ndf').length,
    irs: documents.filter(d => d.doc_type === 'irs').length,
    cds: documents.filter(d => d.doc_type === 'cds').length,
    equity_trs: documents.filter(d => d.doc_type === 'equity_trs').length,
  };

  const total = documents.length || 0;
  
  return (
    <div className="flex flex-col gap-5 w-full lg:w-[32%]">
      <h2 className="text-xl font-semibold text-text-secondary font-inter">
        Document Types
      </h2>

      <div className="flex flex-col w-full bg-white rounded-xl p-8 shadow-card h-[276px] items-center justify-center">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {/* Simple Dynamic Slices (Example mapping) */}
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1814f3" strokeWidth="12" strokeDasharray={`${total > 0 ? (typeCounts.equity_trs/total)*251 : 0} 251`} strokeDashoffset="0" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ff823c" strokeWidth="12" strokeDasharray={`${total > 0 ? (typeCounts.irs/total)*251 : 0} 251`} strokeDashoffset={`-${(typeCounts.equity_trs/total)*251}`} />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#fc22ff" strokeWidth="12" strokeDasharray={`${total > 0 ? (typeCounts.cds/total)*251 : 0} 251`} strokeDashoffset={`-${((typeCounts.equity_trs + typeCounts.irs)/total)*251}`} />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#343c6a" strokeWidth="12" strokeDasharray={`${total > 0 ? (typeCounts.fx_ndf/total)*251 : 0} 251`} strokeDashoffset={`-${((typeCounts.equity_trs + typeCounts.irs + typeCounts.cds)/total)*251}`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-text-secondary">{total}</span>
            <span className="text-[10px] font-bold text-text-tertiary uppercase">Total Docs</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#343c6a]" />
            <span className="text-[10px] font-bold text-text-tertiary uppercase">FX NDF: {typeCounts.fx_ndf}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ff823c]" />
            <span className="text-[10px] font-bold text-text-tertiary uppercase">IRS: {typeCounts.irs}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#fc22ff]" />
            <span className="text-[10px] font-bold text-text-tertiary uppercase">CDS: {typeCounts.cds}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#1814f3]" />
            <span className="text-[10px] font-bold text-text-tertiary uppercase">Equity TRS: {typeCounts.equity_trs}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
