'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE, authHeaders } from '../../../lib/api';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  action?: string | null;
}

interface ChatCopilotProps {
  onNavigate?: (page: string) => void;
  docType?: string | null;
  schema?: unknown;
  currentData?: Record<string, unknown> | null;
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  _currentRecognition?: SpeechRecognitionInstance;
}

const initialMessages: Message[] = [
  { role: 'assistant', content: 'Hi! I am your TradeDoc Copilot. How can I help you with your trades today?' },
];

export default function ChatCopilot({ onNavigate, docType, schema, currentData }: ChatCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isVoiceMessage, setIsVoiceMessage] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragContainerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  // Smart panel positioning — opens near the icon, never off-screen
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const btn = buttonRef.current.getBoundingClientRect();
    const gap = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Use responsive panel dimensions matching the CSS classes
    const isMobile = vw < 640;
    const panelW = isMobile ? Math.min(vw * 0.92, 500) : 400;
    const panelH = isMobile ? vh * 0.75 : 600;

    let top: number;
    let left: number;

    // Vertical: prefer opening above the button
    if (btn.top >= panelH + gap) {
      top = btn.top - panelH - gap;
    } else if (vh - btn.bottom >= panelH + gap) {
      top = btn.bottom + gap;
    } else {
      // Not enough space either way — center vertically with a safety margin
      top = Math.max(8, (vh - panelH) / 2);
    }

    // Horizontal: prefer right-aligned with the button
    if (vw - btn.right >= panelW) {
      left = btn.right;
    } else if (btn.left >= panelW) {
      left = btn.left - panelW;
    } else {
      // Center horizontally with a safety margin
      left = Math.max(8, (vw - panelW) / 2);
    }

    setPanelStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
    });
  }, [isOpen]);

  // ── Custom Markdown Components ──────────────────
  const markdownComponents: Partial<Components> = {
    strong({ children }) {
      return <strong className="text-indigo-600 font-semibold">{children}</strong>;
    },
    p({ children }) {
      return <p className="mb-1 last:mb-0">{children}</p>;
    },
    ul({ children }) {
      return <ul className="list-none space-y-0.5 mb-1 pl-0">{children}</ul>;
    },
    li({ children }) {
      return (
        <li className="flex gap-2 text-[13px] leading-relaxed">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
          <span>{children}</span>
        </li>
      );
    },
    h3({ children }) {
      return <h3 className="text-[14px] font-bold text-slate-800 mb-1 mt-1">{children}</h3>;
    },
    h4({ children }) {
      return <h4 className="text-[13px] font-semibold text-slate-700 mb-0.5 mt-0.5">{children}</h4>;
    },
  };

  const actionChips = [
    { label: 'Supported Docs?', query: 'Which types of trade documents do you support?' },
    { label: 'How to Extract?', query: 'How do I extract fields from a trade email?' },
    { label: 'ISDA Compliance', query: 'Tell me about ISDA-compliant output.' }
  ];

  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a good female voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = ['Google UK English Female', 'Samantha', 'Victoria', 'Karen', 'Google US English'];
    
    let selectedVoice = voices.find(v => preferredVoices.includes(v.name));
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.name.toLowerCase().includes('female')) || voices[0];
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Tweak pitch and rate to sound sweeter and more natural
    utterance.pitch = 1.15; // Slightly higher pitch
    utterance.rate = 1.05;  // Slightly faster
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      const speechWindow = window as SpeechWindow;
      if (speechWindow._currentRecognition) {
        speechWindow._currentRecognition.stop();
      }
      return;
    }
    
    const speechWindow = window as SpeechWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser doesn't support speech recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    speechWindow._currentRecognition = recognition;
    
    const startInput = input;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (!event.results[i].isFinal) {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      let sessionFinal = '';
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          sessionFinal += event.results[i][0].transcript;
        }
      }
      
      setInput(startInput + (startInput ? ' ' : '') + sessionFinal + interimTranscript);
      setIsVoiceMessage(true);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleClearChat = () => {
    stopSpeaking();
    setMessages(initialMessages);
  };

  const handleSend = async (messageOverride?: string) => {
    const userMsg = (messageOverride ?? input).trim();
    if (!userMsg) return;

    if (isListening) {
      setIsListening(false);
      const speechWindow = window as SpeechWindow;
      if (speechWindow._currentRecognition) {
        speechWindow._currentRecognition.stop();
      }
    }

    const wasVoice = isVoiceMessage;
    setInput('');
    setIsVoiceMessage(false);
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    const payloadMsg = wasVoice 
      ? `[System Instruction: The user asked this via Voice. Provide a very brief, conversational, and direct answer in maximum 2 short sentences. Do not use markdown.]\n${userMsg}`
      : userMsg;

    try {
      const payload = {
        message: payloadMsg,
        doc_type: docType || undefined,
        schema: schema || undefined,
        current_data: currentData || undefined,
      };

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Your session has expired. Please log in again.' }]);
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Chat request failed');
      }

      const reply = data.reply || 'Sorry, I encountered an error.';

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

      if (wasVoice) {
        speak(reply);
      }
    } catch (error) {
      console.error('Chat request failed', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to the server.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Outer container fills the viewport to provide drag boundaries */}
      <div
        ref={dragContainerRef}
        className="fixed inset-0 pointer-events-none z-[100]"
        style={{ touchAction: 'none' }}
      >
        {/* Floating Draggable Wrapper */}
        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={dragContainerRef}
          whileDrag={{ scale: 1.05 }}
          className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 pointer-events-auto"
        >
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl drop-shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 bg-transparent"
        >
          {/* Always Visible Cloud/Speech Bubble when closed */}
          {!isOpen && (
            <div className="absolute -top-9 sm:-top-10 right-0 bg-indigo-600 text-white text-[9px] sm:text-[10px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full whitespace-nowrap shadow-lg">
              Ask AI ✦
              <div className="absolute -bottom-1 right-4 w-2 h-2 bg-indigo-600 rotate-45" />
            </div>
          )}

          <img 
            src="/logo.svg" 
            alt="TradeDoc AI" 
            className="w-12 h-12 object-contain pointer-events-none select-none" 
            draggable={false}
          />
          {/* Notification Dot */}
          {!isOpen && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
          )}
        </button>
        </motion.div>

        {/* Chat Window — detached from draggable icon so it always opens fully visible */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              style={Object.keys(panelStyle).length > 0 ? panelStyle : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              className="w-[92vw] sm:w-[400px] h-[75vh] sm:h-[600px] max-w-[500px] bg-white rounded-[24px] sm:rounded-[32px] shadow-[0_30px_80px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden border border-gray-100 pointer-events-auto"
            >
              {/* Header */}
              <div className="p-4 sm:p-6 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 flex items-center justify-center">
                  <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-[#1a1d2e] tracking-tight">TradeDoc Copilot</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest">AI Intelligent Assistant</span>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={handleClearChat}
                    className="w-8 h-8 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                    title="Clear chat"
                  >
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                  <button 
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${voiceEnabled ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-gray-400 hover:bg-gray-200'}`}
                    title={voiceEnabled ? "Mute Voice" : "Enable Voice"}
                  >
                    {voiceEnabled ? (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="1" y1="1" y2="23"/><line x1="15" x2="21" y1="9" y2="15"/><line x1="21" x2="15" y1="9" y2="15"/></svg>
                    )}
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-400"
                  >
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 no-scrollbar bg-white/50 backdrop-blur-sm"
              style={{ backgroundImage: 'radial-gradient(#e2e8f0 0.5px, transparent 0.5px)', backgroundSize: '16px 16px' }}
            >
              {messages.map((msg, i) => (
                <div key={msg.id || `${msg.role}-${i}`} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[90%] sm:max-w-[85%] p-3 sm:p-4 rounded-[18px] sm:rounded-[22px] text-[13px] sm:text-sm font-medium leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/10'
                        : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                    )}
                  </div>
                  {msg.role === 'assistant' && i === messages.length - 1 && isSpeaking && (
                    <button 
                      onClick={stopSpeaking}
                      className="ml-2 flex items-center gap-1.5 text-[10px] font-bold text-gray-500 hover:text-red-500 transition-colors bg-white px-2.5 py-1 rounded-lg border border-gray-100 shadow-sm"
                    >
                      <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                      Stop Voice
                    </button>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 p-4 rounded-[20px] rounded-tl-none flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 sm:p-6 bg-white border-t border-gray-100 relative">
              {/* Voice Waveform Animation */}
              {isListening && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 h-6 px-4 bg-indigo-50 rounded-full border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mr-1">
                    Listening
                  </span>
                  {[1,2,3,4,5].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, 12, 4] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                      className="w-0.5 bg-indigo-500 rounded-full"
                    />
                  ))}
                </div>
              )}

              {/* Action Chips */}
              {messages.length < 3 && !isTyping && (
                <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar py-1">
                  {actionChips.map((chip, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(chip.query)}
                      className="whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-full text-[10px] sm:text-[11px] font-bold text-gray-600 hover:text-indigo-600 transition-all active:scale-95"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setIsVoiceMessage(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask anything about your trades..."
                  className="w-full pl-4 sm:pl-5 pr-20 sm:pr-24 py-3 sm:py-4 bg-gray-50 border border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all text-[13px] sm:text-sm font-medium text-gray-700 shadow-inner"
                />
                <button 
                  onClick={toggleListening}
                  className={`absolute right-14 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                  title="Voice Input"
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="8" x2="16" y1="22" y2="22"/></svg>
                </button>
                <button 
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="absolute right-2 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </button>
              </div>
              <p className="mt-2 sm:mt-3 text-[9px] sm:text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">Powered by Groq Llama 4 Scout</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}
