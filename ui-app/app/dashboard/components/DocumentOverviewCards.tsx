'use client';

import React from 'react';
import { RecentDoc } from '../types';

interface DocumentOverviewCardsProps {
  documents: RecentDoc[];
  onLoad: (doc: RecentDoc) => void;
}

export default function DocumentOverviewCards({ documents }: DocumentOverviewCardsProps) {
  // Logic for calculations based on MongoDB is_draft boolean
  const totalDocs = documents.length;
  const completedDocs = documents.filter(d => d.is_draft === false).length;
  const inProgressDocs = documents.filter(d => d.is_draft === true).length;

  // Time Saved Logic: 15 mins manual vs 5 mins AI = 10 mins saved per doc
  const totalMinutesSaved = totalDocs * 10;
  const totalHoursSaved = (totalMinutesSaved / 60).toFixed(1);

  return (
    <div className="flex flex-col gap-5 w-full lg:w-[68%]">
      <div className="flex flex-row justify-between items-center w-full">
        <h2 className="text-xl font-semibold text-text-secondary font-inter">
          Efficiency Metrics
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full">
        {/* Card 1: Documentation Overview (Blue Gradient) */}
        <div className="flex flex-col justify-between items-start w-full md:w-[380px] h-[280px] rounded-[32px] p-8 shadow-xl bg-linear-to-br from-[#4c49ed] to-[#0a06f4] text-white shadow-indigo-200 transition-all hover:scale-[1.02]">
          <div className="flex flex-col w-full h-full justify-between">
            <div className="flex flex-row justify-between items-start w-full">
              <div className="flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                  Processing Pipeline
                </p>
                <h3 className="text-xl font-bold leading-none mt-1">Status Overview</h3>
              </div>
            </div>

            <div className="flex flex-row items-center justify-between mt-2 flex-1 w-full gap-2">
              {/* Left Side: Primary Hero Metric - Scaled for 3 digits */}
              <div className="flex flex-col pl-2 min-w-[120px]">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/50 mb-1 whitespace-nowrap">
                  Total Documentation
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-6xl font-black text-white italic tracking-tighter drop-shadow-2xl leading-none">
                    {totalDocs}
                  </span>
                  <div className="flex flex-col opacity-40">
                    <span className="text-[9px] font-bold uppercase leading-none">Total</span>
                    <span className="text-[9px] font-bold uppercase leading-none mt-1">Volume</span>
                  </div>
                </div>
              </div>

              {/* Vertical Divider Line */}
              <div className="h-20 w-px bg-linear-to-b from-transparent via-white/10 to-transparent mx-1" />

              {/* Right Side: Status Badges - Flexible Width */}
              <div className="flex flex-col gap-3 pr-2 flex-1 max-w-[160px]">
                {/* Verified Badge */}
                <div className="flex flex-col items-start bg-white/5 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 w-full transition-all hover:bg-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                      Verified
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-black text-white leading-none">
                      {completedDocs}
                    </p>
                    <span className="text-[8px] font-bold text-white/20 uppercase italic">Docs</span>
                  </div>
                </div>

                {/* In Progress Badge */}
                <div className="flex flex-col items-start bg-white/5 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 w-full transition-all hover:bg-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                    <p className="text-[9px] font-bold uppercase tracking-wider text-orange-400">
                      Processing
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-black text-white leading-none">
                      {inProgressDocs}
                    </p>
                    <span className="text-[8px] font-bold text-white/20 uppercase italic">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Time Saved (Teal Glass) */}
        <div className="flex flex-col justify-between items-start w-full md:w-[380px] h-[280px] rounded-[32px] p-8 shadow-lg bg-[#16dbcc] border border-black/5 text-slate-900 transition-all hover:scale-[1.02]">
          <div className="flex flex-col w-full h-full justify-between">
            <div className="flex flex-row justify-between items-start w-full">
              <div className="flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-900/60">
                  Business Value Created
                </p>
                <h3 className="text-lg font-bold mt-1 text-slate-900">Time Saved</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-black/5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-2">
              <span className="text-6xl font-black italic tracking-tighter text-slate-900 leading-none">{totalHoursSaved} <span className="text-2xl font-medium not-italic opacity-40">Hrs</span></span>
              <p className="text-[11px] font-medium text-slate-900/80 leading-tight">
                Cumulative operational hours saved across all trade document workflows.
              </p>
            </div>

            <div className="flex flex-row justify-between items-center w-full pt-4 mt-2 border-t border-black/10">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-900/70">
                Efficiency Index: 84%
              </p>
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full border border-black/10 bg-black/10" />
                <div className="w-6 h-6 rounded-full border border-black/10 bg-black/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
