'use client';

import React from 'react';
import { RecentDoc } from '../types';

interface MoneySavedCardProps {
  documents: RecentDoc[];
}

export default function MoneySavedCard({ documents }: MoneySavedCardProps) {
  // Calculation Logic:
  // Competitive Savings: Other firms charge ₹200, we charge ₹50.
  // Net Savings = ₹150 per document
  const totalDocs = documents.length;
  const moneySaved = (totalDocs * 150).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  return (
    <div className="flex flex-col gap-5 w-full lg:w-[32%]">
      <h2 className="text-xl font-semibold text-text-secondary font-inter">
        Financial ROI
      </h2>

      <div className="flex flex-col justify-between items-start w-full h-[280px] rounded-[32px] p-8 shadow-lg bg-white border border-[#deeaf2] text-text-secondary transition-all hover:scale-[1.02]">
        <div className="flex flex-col w-full h-full justify-between">
          <div className="flex flex-row justify-between items-start w-full">
            <div className="flex flex-col">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                Cost Reduction
              </p>
              <h3 className="text-lg font-bold mt-1 text-slate-800">Money Saved</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-50">
              <span className="text-2xl font-bold text-emerald-600">₹</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-slate-400">₹</span>
              <span className="text-5xl font-black italic tracking-tight text-slate-800">
                {moneySaved}
              </span>
            </div>
            <p className="text-[11px] font-medium text-text-tertiary leading-tight mt-1">
              Estimated operational cost reduction based on TradeDocAI automated processing efficiency.
            </p>
          </div>

          <div className="flex flex-row justify-between items-center w-full pt-4 mt-2 border-t border-[#dfeaf2]">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-text-tertiary opacity-70">
              Value Factor: High
            </p>
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border border-emerald-100 bg-emerald-200" />
              <div className="w-6 h-6 rounded-full border border-emerald-50 bg-emerald-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
