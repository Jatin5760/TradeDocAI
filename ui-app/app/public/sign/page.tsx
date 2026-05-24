'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const PublicSignContent = dynamic(() => import('./PublicSignContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-widest">Loading secure workspace...</p>
    </div>
  ),
});

export default function PublicSignPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-widest">Loading secure workspace...</p>
      </div>
    }>
      <PublicSignContent />
    </Suspense>
  );
}
