'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentDetails {
  doc_id: string;
  doc_type: string;
  summary: string;
  data: Record<string, any>;
  party_a_signed_name: string;
  party_a_metadata: any;
  client_signed: boolean;
  client_signed_name?: string;
  party_b_metadata?: any;
}

export default function PublicSignContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doc, setDoc] = useState<DocumentDetails | null>(null);

  // PDF Viewer States
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [pdfUrl, setPdfUrl] = useState('');

  // Signature States
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [activeFont, setActiveFont] = useState("'Great Vibes', cursive");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSigningApiLoading, setIsSigningApiLoading] = useState(false);
  const [isSignedSuccessfully, setIsSignedSuccessfully] = useState(false);
  
  // Toast Notification
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5055';

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  // Load cursive fonts dynamically
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playball&family=Caveat:wght@700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, []);

  // Fetch document details on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid signature link. Token is missing.');
      setLoading(false);
      return;
    }

    async function loadDoc() {
      try {
        const res = await fetch(`${API_BASE}/api/public/documents/by-token?token=${token}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch document details.');
        }
        const data = await res.json();
        setDoc(data);
        setPdfUrl(`${API_BASE}/api/public/documents/by-token/pdf?token=${token}&t=${Date.now()}`);
        if (data.client_signed) {
          setIsSignedSuccessfully(true);
        }
      } catch (err: any) {
        setError(err.message || 'Verification link expired or invalid.');
      } finally {
        setLoading(false);
      }
    }

    loadDoc();
  }, [token, API_BASE]);

  // Update canvas for typed signature in real time
  useEffect(() => {
    if (signatureType === 'type' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(30, canvas.height - 45);
        ctx.lineTo(canvas.width - 30, canvas.height - 45);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.font = `italic 38px ${activeFont}`;
        ctx.fillStyle = '#1e3a8a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName || 'Sign Here', canvas.width / 2, canvas.height / 2 - 10);
      }
    }
  }, [typedName, activeFont, signatureType, isSigningModalOpen]);

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (signatureType !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || signatureType !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    if (e.cancelable) e.preventDefault();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTypedName('');
  };

  const submitSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (signatureType === 'draw') {
      const ctx = canvas.getContext('2d');
      const buffer = new Uint32Array(ctx!.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
      const hasDrawn = buffer.some(color => color !== 0);
      if (!hasDrawn) {
        showToastMsg('❌ Please draw a signature first');
        return;
      }
    } else {
      if (!typedName.trim()) {
        showToastMsg('❌ Please type your name first');
        return;
      }
    }

    const signatureData = canvas.toDataURL('image/png');
    setIsSigningApiLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/public/documents/sign-by-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signature_data: signatureData,
          signer_name: signatureType === 'type' ? typedName : 'Authorized Representative'
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Countersigning failed');
      }

      showToastMsg('✅ Document Signed successfully!');
      setIsSigningModalOpen(false);
      setIsSignedSuccessfully(true);
      
      // Refresh PDF View URL
      setPdfUrl(`${API_BASE}/api/public/documents/by-token/pdf?token=${token}&t=${Date.now()}`);
    } catch (err: any) {
      showToastMsg(`❌ ${err.message || 'Failed to sign document'}`);
    } finally {
      setIsSigningApiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verifying Link Securely...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-3xl max-w-md w-full border border-slate-200 shadow-xl text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 border border-rose-100">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h2 className="text-lg font-black text-slate-800 leading-tight">Access Link Invalid</h2>
          <p className="text-sm font-medium text-slate-500 leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Premium Header */}
      <header className="h-16 bg-[#0f172a] text-white px-6 flex items-center justify-between border-b-4 border-indigo-600 shadow-md">
        <div className="flex items-center gap-3">
          <img src="/logo-light.svg" alt="TradeDoc AI" className="w-8 h-8 rounded-lg" />
          <span className="text-sm font-black tracking-widest uppercase">TradeDoc AI Client Portal</span>
        </div>
        <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">Secured with Token</span>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-h-[calc(100vh-64px)]">
        
        {/* Left side: Document Details & Actions */}
        <div className="w-full lg:w-[350px] bg-white border-r border-slate-200 p-6 flex flex-col justify-between overflow-y-auto shrink-0 shadow-sm">
          <div className="flex flex-col gap-6">
            <div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Active Agreement</span>
              <h2 className="text-lg font-black text-slate-800 mt-1 leading-tight">{doc.summary}</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">ID: {doc.doc_id}</p>
            </div>

            <hr className="border-slate-100" />

            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initiator (Party A)</span>
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col gap-1.5">
                <span className="text-sm font-bold text-slate-800">{doc.party_a_signed_name}</span>
                <span className="text-xs text-slate-500 font-medium">Signed at: {doc.party_a_metadata?.time}</span>
                <span className="text-xs text-slate-400 font-medium">IP: {doc.party_a_metadata?.ip}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Countersign (Party B)</span>
              {isSignedSuccessfully ? (
                <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-2xl flex flex-col gap-1.5 text-emerald-800">
                  <span className="text-sm font-bold flex items-center gap-1">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    Signed by Client
                  </span>
                  {doc.party_b_metadata?.time && (
                    <span className="text-xs font-medium text-emerald-600">Time: {doc.party_b_metadata.time}</span>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-150 p-4 rounded-2xl flex flex-col gap-1.5 text-amber-800">
                  <span className="text-sm font-bold flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    Awaiting Signature
                  </span>
                  <span className="text-xs font-medium text-amber-600">Please review the document and sign below.</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            {isSignedSuccessfully ? (
              <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 flex flex-col gap-2 text-center">
                <p className="text-xs font-bold uppercase tracking-wider">✅ Signature Received</p>
                <p className="text-xs font-medium">Thank you! We have received your signature. Our team will review and send you the fully executed copy shortly.</p>
              </div>
            ) : (
              <button
                onClick={() => setIsSigningModalOpen(true)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                Countersign Document
              </button>
            )}
          </div>
        </div>

        {/* Right side: PDF Document viewer */}
        <div className="flex-1 bg-[#f1f5f9] overflow-auto p-4 sm:p-8 flex flex-col items-center gap-4 custom-scrollbar">
          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
            <button onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4"/></svg></button>
            <span className="text-xs font-black text-slate-600 px-3">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(prev => Math.min(prev + 0.2, 2.5))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg></button>
          </div>

          {pdfUrl && (
            <Document
              file={pdfUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              className="flex flex-col items-center gap-8"
              loading={
                <div className="bg-white w-[90vw] max-w-[650px] h-[75vh] flex flex-col items-center justify-center gap-4 rounded-xl shadow-md border border-slate-200 mt-4">
                  <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Document Preview...</p>
                </div>
              }
            >
              {/* Always hide the last page on client portal — it is the audit certificate.
                  For new docs the cert is generated only at release time, so this just
                  shows the real content pages. For any legacy doc that had it appended
                  early, this ensures the client never sees it. */}
              {Array.from(new Array(numPages > 1 ? numPages - 1 : numPages), (_, index) => (
                <div 
                  key={`client_page_${index + 1}`}
                  className="shadow-xl rounded-sm overflow-hidden border border-slate-200 transition-transform duration-300 origin-top"
                  style={{ transform: `scale(${scale})` }}
                >
                  <Page 
                    pageNumber={index + 1} 
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    width={Math.min(700, typeof window !== 'undefined' ? window.innerWidth - 32 : 700)}
                  />
                </div>
              ))}
            </Document>
          )}
        </div>
      </div>

      {/* ── Signature Modal ── */}
      {isSigningModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-scale-in">
            <div className="p-6 bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b border-indigo-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  Client Countersignature
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Apply your signature to complete this trade confirmation</p>
              </div>
              <button 
                onClick={() => setIsSigningModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors border border-slate-100 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="flex border-b border-slate-100 bg-slate-50 p-1 m-4 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setSignatureType('draw');
                  clearCanvas();
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${signatureType === 'draw' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                🖌️ Draw Signature
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignatureType('type');
                  clearCanvas();
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${signatureType === 'type' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                ⌨️ Type Signature
              </button>
            </div>

            <div className="px-6 pb-6 flex flex-col gap-4">
              {signatureType === 'type' && (
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Type your name here..."
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-inner"
                    maxLength={40}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveFont("'Great Vibes', cursive")}
                      style={{ fontFamily: 'Great Vibes, cursive' }}
                      className={`py-2 px-3 border rounded-xl text-sm truncate ${activeFont.includes('Great Vibes') ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                    >
                      {typedName || 'Great Vibes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFont("'Playball', cursive")}
                      style={{ fontFamily: 'Playball, cursive' }}
                      className={`py-2 px-3 border rounded-xl text-sm truncate ${activeFont.includes('Playball') ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                    >
                      {typedName || 'Playball'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFont("'Caveat', cursive")}
                      style={{ fontFamily: 'Caveat, cursive', fontWeight: 'bold' }}
                      className={`py-2 px-3 border rounded-xl text-sm truncate ${activeFont.includes('Caveat') ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                    >
                      {typedName || 'Caveat'}
                    </button>
                  </div>
                </div>
              )}

              <div className="relative border border-slate-200 bg-slate-50/50 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={200}
                  className="bg-white cursor-crosshair max-w-full touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {signatureType === 'draw' && (
                  <div className="absolute bottom-3 left-4 text-[10px] text-slate-400 font-bold pointer-events-none select-none uppercase tracking-widest">
                    Draw using mouse or touch screen
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-2">
                <button type="button" onClick={clearCanvas} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Clear Board</button>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setIsSigningModalOpen(false)} className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors">Cancel</button>
                  <button
                    type="button"
                    onClick={submitSignature}
                    disabled={isSigningApiLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSigningApiLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing...
                      </>
                    ) : (
                      'Confirm & Sign'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Overlay ── */}
      {toastVisible && (
        <div className="fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-semibold shadow-xl flex items-center gap-2 border border-slate-800">
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
