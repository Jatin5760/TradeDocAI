'use client';

import React from 'react';

interface QuickExtractPanelProps {
  onStartAI: () => void;
}

export default function QuickExtractPanel({ onStartAI }: QuickExtractPanelProps) {
  const staff = [
    { name: 'Livia Bator', role: 'CEO', img: 'LB' },
    { name: 'Randy Press', role: 'Director', img: 'RP' },
    { name: 'Workman', role: 'Designer', img: 'WM' },
  ];

  return (
    <div className="flex flex-col gap-5 w-full lg:w-[40%]">
      <h2 className="text-xl font-semibold text-text-secondary font-inter">
        Quick Actions
      </h2>

      <div className="flex flex-col w-full bg-white rounded-xl p-8 shadow-card h-[276px] justify-between">
        <div className="flex items-center justify-between px-2">
          {staff.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold text-lg">
                {s.img}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">{s.name}</p>
                <p className="text-xs text-text-tertiary">{s.role}</p>
              </div>
            </div>
          ))}
          <button className="w-12 h-12 rounded-full border border-[#dfeaf2] flex items-center justify-center text-text-tertiary hover:bg-bg-main transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <div className="flex items-center gap-6 mt-4">
          <p className="text-sm text-text-tertiary whitespace-nowrap">Source Type</p>
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Paste email text here..." 
              className="w-full bg-[#f4f6f9] rounded-full py-3 px-6 pr-32 text-sm outline-none focus:ring-1 focus:ring-primary/20 transition-all"
            />
            <button 
              onClick={onStartAI}
              className="absolute right-0 top-0 bottom-0 px-6 bg-primary text-white rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-[#0a06f4] transition-colors shadow-button"
            >
              Process
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
