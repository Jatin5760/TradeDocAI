'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { AppPage } from '../types';

interface SidebarProps {
  userName: string;
  onLogout: () => void;
  onGoHome: () => void;
  onSetPage: (page: AppPage) => void;
  activePage: string;
}

const NAV_GROUPS = [
  {
    title: 'MAIN MENU',
    items: [
      {
        label: 'Dashboard', page: 'landing' as AppPage,
        icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="2"/></svg>,
      },
      {
        label: 'My Documents', page: 'my-documents' as AppPage,
        icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>,
      },
    ]
  },
  {
    title: 'AI POWERED',
    items: [
      {
        label: 'AI Extract', page: 'ai' as AppPage,
        icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>,
      },
      {
        label: 'Analytics', page: 'analytics' as AppPage,
        icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
      },
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      {
        label: 'Settings', page: 'settings' as AppPage,
        icon: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" strokeWidth="2"/></svg>,
      }
    ]
  }
];

export default function DashboardSidebar({ userName, onLogout, onGoHome, onSetPage, activePage }: SidebarProps) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Using a smart masculine avatar from DiceBear (Latest stable version)
  const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=Jasper`;

  return (
    <>
      <aside
        className="w-[260px] flex flex-col h-full shrink-0 z-30 overflow-y-auto"
        style={{
          background: 'var(--background)',
          borderRight: '1px solid var(--border)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.02)',
        }}
      >
        {/* Branding */}
        <div className="px-7 pt-8 pb-8 flex items-center gap-3 cursor-pointer" onClick={onGoHome}>
          <div className="relative w-8 h-8 shrink-0">
            <Image src="/logo.svg" alt="TradeDoc AI Logo" fill className="object-contain" priority />
          </div>
          <span style={{ fontFamily: "var(--font-inter)", fontWeight: 800, fontSize: '19px', color: 'var(--text-secondary)', letterSpacing: '-0.04em' }}>
            TradeDoc<span style={{ color: 'var(--primary)' }}>AI</span>
          </span>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 px-4 space-y-8">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="px-4 text-[10px] font-bold text-text-tertiary tracking-[0.12em] uppercase opacity-70">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = activePage === item.page;
                  
                  return (
                    <button
                      key={item.label}
                      onClick={() => onSetPage(item.page)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative"
                      style={{
                        background: isActive ? 'rgba(24, 20, 243, 0.06)' : 'transparent',
                      }}
                    >
                      {isActive && (
                        <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
                      )}
                      <span style={{ color: isActive ? 'var(--primary)' : 'var(--text-tertiary)', flexShrink: 0, transition: 'color 300ms' }}>
                        {item.icon}
                      </span>
                      <span style={{ 
                        fontFamily: "var(--font-inter)", 
                        fontWeight: isActive ? 700 : 500, 
                        fontSize: '14px', 
                        letterSpacing: '-0.01em',
                        color: isActive ? 'var(--primary)' : 'var(--text-tertiary)'
                      }}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Section */}
        <div className="px-4 pb-8 space-y-4">
          <div style={{ height: '1px', background: 'var(--border)', margin: '0 8px' }} className="opacity-50" />
          
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-text-tertiary hover:bg-bg-main transition-all group">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="group-hover:text-primary transition-colors"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span style={{ fontFamily: "var(--font-inter)", fontSize: '14px', fontWeight: 500 }}>Support</span>
          </button>

          {/* User Profile Card */}
          <div className="bg-bg-main/50 rounded-[24px] p-4 flex items-center gap-3 border border-border-secondary/30 shadow-sm">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border-2 border-white shadow-sm bg-white">
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: "var(--font-inter)", lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</p>
              <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: "var(--font-inter)", fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Personal</p>
            </div>
            <button 
              onClick={() => setShowLogoutModal(true)} 
              className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-all" 
              title="Logout"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* --- PREMIUM LOGOUT MODAL --- */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity"
            onClick={() => setShowLogoutModal(false)}
          />
          
          {/* Modal Card */}
          <div className="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-white/20 animate-scale-in overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            <div className="flex flex-col items-center text-center gap-6">
              {/* Icon */}
              <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center shadow-inner">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Logging Out?</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
	                  Are you sure you want to end your session? You&apos;ll need to log in again to access your trades.
                </p>
              </div>
              
              <div className="flex flex-col w-full gap-3 mt-2">
                <button 
                  onClick={onLogout}
                  className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  Yes, Log Me Out
                </button>
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  className="w-full py-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-sm transition-all active:scale-95"
                >
                  No, Keep Me In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
