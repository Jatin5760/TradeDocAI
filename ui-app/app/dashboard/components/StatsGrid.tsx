'use client';

import React from 'react';

interface StatsProps {
  total: number;
}

export default function StatsGrid({ total }: StatsProps) {
  const stats = [
    {
      label: 'Documents Processed',
      value: total > 0 ? total.toLocaleString() : '1,293',
      trend: '+36.8%',
      sub: 'vs last 30 days',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>
      ),
      iconBg: 'rgba(99,102,241,0.10)',
      iconColor: '#6366f1',
      trendColor: '#10b981',
    },
    {
      label: 'Data Extracted',
      value: '256K',
      trend: '+28.4%',
      sub: 'vs last 30 days',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      iconBg: 'rgba(16,185,129,0.10)',
      iconColor: '#10b981',
      trendColor: '#10b981',
    },
    {
      label: 'Time Saved',
      value: '458h',
      trend: '+42.1%',
      sub: 'vs last 30 days',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      iconBg: 'rgba(245,158,11,0.10)',
      iconColor: '#f59e0b',
      trendColor: '#10b981',
    },
  ];

  return (
    <div style={{ marginBottom: '20px' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', fontFamily: "'DM Sans', system-ui, sans-serif" }}>Overview</h2>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: 'white', border: '1px solid rgba(226,232,240,0.8)', color: '#64748b', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '12px' }}
        >
          Last 30 days
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5"
            style={{ border: '1px solid rgba(226,232,240,0.7)', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.07)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 8px rgba(0,0,0,0.04)'; }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.iconBg, color: s.iconColor }}>
                {s.icon}
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', fontFamily: "'DM Sans', system-ui, sans-serif", textAlign: 'right', lineHeight: 1.3 }}>
                {s.label}
              </span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '6px' }}>
              {s.value} <span style={{ fontSize: '14px', color: s.trendColor, fontWeight: 700 }}>↑ {s.trend}</span>
            </p>
            <p style={{ fontSize: '12px', color: '#94a3b8', fontFamily: "'DM Sans', system-ui, sans-serif" }}>{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
