'use client';

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface CustomPDFViewerProps {
  pdfUrl: string;
  filename: string;
  onClose: () => void;
  onDownload: () => void;
  onPrint: () => void;
}

export default function CustomPDFViewer({ pdfUrl, filename, onClose, onDownload, onPrint }: CustomPDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-500">
      {/* Top Professional Toolbar */}
      <div className="h-16 px-8 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">{filename}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Document Workspace</p>
          </div>
        </div>

        {/* Center: Zoom Controls */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
          <button onClick={zoomOut} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500"><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4"/></svg></button>
          <span className="text-xs font-black text-slate-600 w-16 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500"><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg></button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-11 h-11 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all shadow-sm"
            title="Close"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <button 
            onClick={onPrint}
            className="w-11 h-11 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all shadow-sm"
            title="Print"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          </button>
          <button 
            onClick={onDownload}
            className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
            title="Download PDF"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Page Thumbnails Sidebar */}
        <div className="w-[200px] bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto hidden md:flex flex-col gap-4 custom-scrollbar">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 px-2">Pages</h4>
          <div className="flex flex-col gap-6">
            {Array.from(new Array(numPages), (_, index) => (
              <div 
                key={`thumb_${index + 1}`}
                onClick={() => {
                  setPageNumber(index + 1);
                  const el = document.getElementById(`page_${index + 1}`);
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`group cursor-pointer flex flex-col items-center gap-2 transition-all ${pageNumber === index + 1 ? 'scale-105' : 'hover:scale-102'}`}
              >
                <div 
                  className={`bg-white shadow-sm border-2 rounded-lg overflow-hidden transition-all p-1 ${
                    pageNumber === index + 1 ? 'border-indigo-500 shadow-indigo-100 shadow-lg' : 'border-slate-100 group-hover:border-slate-300'
                  }`}
                >
                  <Document file={pdfUrl} loading={<div className="w-24 h-32 bg-slate-100 animate-pulse" />}>
                    <Page pageNumber={index + 1} width={120} renderTextLayer={false} renderAnnotationLayer={false} />
                  </Document>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${pageNumber === index + 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  Page {index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: PDF Canvas (Continuous Scroll) */}
        <div className="flex-1 overflow-auto p-12 flex flex-col items-center gap-8 bg-[#f1f5f9] custom-scrollbar relative scroll-smooth">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-col items-center gap-12"
            loading={
              <div className="bg-white w-[595px] h-[842px] flex flex-col items-center justify-center gap-4 rounded-sm shadow-sm">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Document...</p>
              </div>
            }
          >
            {Array.from(new Array(numPages), (_, index) => (
              <div 
                key={`full_page_${index + 1}`} 
                id={`page_${index + 1}`}
                className="shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-transform duration-300 origin-top"
                style={{ transform: `scale(${scale})` }}
              >
                <Page 
                  pageNumber={index + 1} 
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="rounded-sm overflow-hidden"
                  width={750}
                />
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
}
