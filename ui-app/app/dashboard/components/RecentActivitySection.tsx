'use client';

import React from 'react';
import { RecentDoc } from '../types';
import { docTypeName } from '../utils';

interface RecentActivitySectionProps {
  documents: RecentDoc[];
  onLoad: (doc: RecentDoc) => void;
}

export default function RecentActivitySection({ documents, onLoad }: RecentActivitySectionProps) {
  // Mapping doc types to colors and icons similar to the banking sample
  const docConfig: Record<string, { iconBg: string; icon: React.ReactNode }> = {
    fx_ndf: {
      iconBg: '#fff5d9', // yellow
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffbb38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    irs: {
      iconBg: '#e7edff', // blue
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#396aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    cds: {
      iconBg: '#dcfaf8', // teal
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16dbcc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    equity_trs: {
      iconBg: '#ffe0eb', // pink
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff4b4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      ),
    },
  };

  const displayDocs = documents.slice(0, 3);

  return (
    <div className="flex flex-col gap-5 w-full lg:w-[40%]">
      <h2 className="text-xl font-semibold text-text-secondary font-inter">
        Recent Activity
      </h2>

      <div className="flex flex-col w-full bg-white rounded-xl p-6 shadow-card h-[276px]">
        <div className="flex flex-col gap-4 w-full">
          {displayDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-text-tertiary">No recent activity</p>
            </div>
          ) : (
            displayDocs.map((doc) => {
              const config = docConfig[doc.doc_type] || docConfig.fx_ndf;
              return (
                <div key={doc._id} className="flex flex-row items-center w-full group cursor-pointer" onClick={() => onLoad(doc)}>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center p-2 shrink-0 transition-transform group-hover:scale-105"
                    style={{ backgroundColor: config.iconBg }}
                  >
                    {config.icon}
                  </div>

                  <div className="flex flex-row justify-between items-center w-full ml-4">
                    <div className="flex flex-col justify-start items-start">
                      <p className="text-sm font-medium text-text-primary font-inter line-clamp-1">
                        {doc.summary || doc.name}
                      </p>
                      <p className="text-xs text-text-tertiary font-inter">
                        {new Date(doc.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-right font-inter text-accent-success">
                      {docTypeName(doc.doc_type).split(' ')[0]}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
