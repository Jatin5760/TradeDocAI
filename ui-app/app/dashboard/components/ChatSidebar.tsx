'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { API_BASE, authHeaders } from '@/lib/api';
import { Schema, SchemaField } from '../types';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ActivityItem {
  key: string;
  label: string;
  time: number;
}

interface SectionProgress {
  title: string;
  key: string;
  filled: number;
  total: number;
}

export interface ChatSidebarProps {
  docType: string;
  schema: Schema | null;
  currentData: Record<string, unknown>;
  activeFieldKey: string | null;
  activeFieldLabel: string;
  onFieldFocus: (key: string) => void;
  totalFields: number;
  filledFields: number;
  skippedCount: number;
}

// ── Helpers ─────────────────────────────────────

function getDocTypeLabel(dt: string): string {
  const labels: Record<string, string> = {
    irs: 'IRS',
    fx_ndf: 'FX NDF',
    cds: 'CDS',
    equity_trs: 'Equity TRS',
  };
  return labels[dt] || dt.toUpperCase();
}

function getQuickTips(docType: string): string[] {
  const tips: Record<string, string[]> = {
    irs: [
      'Fixed Rate Payer pays fixed and receives floating — counterparty is the Floating Rate Payer.',
      'Notional is never exchanged — it is only used to calculate interest payments.',
      'Payment frequency is typically quarterly or semi-annual.',
    ],
    fx_ndf: [
      'NDFs are cash-settled — no physical delivery of the notional amount.',
      'The fixing date determines the spot rate used for settlement.',
      'CNY, INR, KRW, and BRL are the most common NDF currencies.',
    ],
    cds: [
      'The Reference Entity is the issuer whose credit risk is being transferred.',
      'CDS spread (premium) is typically quoted in basis points per annum.',
      'Credit Events include bankruptcy, failure to pay, and restructuring.',
    ],
    equity_trs: [
      'TRS exchanges total return of a reference asset for a floating rate payment.',
      'Model I is for single stocks — Model II is for baskets or indices.',
      'The Total Return Payer owns the reference asset.',
    ],
  };
  return tips[docType] || tips['irs'] || [];
}

function findFieldInSchema(
  schema: Schema | null,
  fieldKey: string,
): SchemaField | null {
  if (!schema?.sections || !fieldKey) return null;
  const search = (sec: Record<string, unknown>) => {
    for (const f of (sec.fields as SchemaField[]) || []) {
      if (f.key === fieldKey) return f;
    }
    for (const sub of (sec.subsections as Array<{ fields: SchemaField[] }>) || []) {
      for (const f of sub.fields || []) {
        if (f.key === fieldKey) return f;
      }
    }
    return null;
  };
  const sections = schema.sections;
  if (Array.isArray(sections)) {
    for (const sec of sections) {
      const found = search(sec as unknown as Record<string, unknown>);
      if (found) return found;
    }
  } else {
    for (const sec of Object.values(sections)) {
      const found = search(sec as unknown as Record<string, unknown>);
      if (found) return found;
    }
  }
  return null;
}

function findFieldLabel(schema: Schema | null, key: string): string {
  const field = findFieldInSchema(schema, key);
  return field?.label || key;
}

function isValueFilled(val: unknown): boolean {
  if (val === undefined || val === null || val === '') return false;
  if (Array.isArray(val) && val.length === 0) return false;
  if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val as object).length === 0) return false;
  return true;
}

function getSectionProgress(
  schema: Schema | null,
  currentData: Record<string, unknown>,
): SectionProgress[] {
  if (!schema?.sections) return [];
  const sections = schema.sections;
  const result: SectionProgress[] = [];

  const countSection = (sec: Record<string, unknown>, key: string) => {
    let total = 0;
    let filled = 0;
    for (const f of (sec.fields as SchemaField[]) || []) {
      total++;
      if (isValueFilled(currentData[f.key])) filled++;
    }
    for (const sub of (sec.subsections as Array<{ fields: SchemaField[] }>) || []) {
      for (const f of sub.fields || []) {
        total++;
        if (isValueFilled(currentData[f.key])) filled++;
      }
    }
    return { title: sec.title as string || key, key, filled, total };
  };

  if (Array.isArray(sections)) {
    for (const sec of sections) {
      const entry = countSection(
        sec as unknown as Record<string, unknown>,
        (sec as { id?: string }).id || (sec as { title: string }).title,
      );
      if (entry.total > 0) result.push(entry);
    }
  } else {
    for (const [secKey, sec] of Object.entries(sections)) {
      const entry = countSection(sec as unknown as Record<string, unknown>, secKey);
      if (entry.total > 0) result.push(entry);
    }
  }
  return result;
}

// ── Component ─────────────────────────────────────

export default function ChatSidebar({
  docType,
  schema,
  currentData,
  activeFieldKey,
  activeFieldLabel,
  onFieldFocus,
  totalFields,
  filledFields,
  skippedCount: _skippedCount,
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevDataRef = useRef<Record<string, unknown>>({});

  // ── Markdown stripper ────────────────────────────
  const stripMarkdown = useCallback((text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^[-*+]\s+/gm, '• ')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }, []);

  // ── Auto-scroll to bottom ────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  // ── Live Activity Feed: detect newly filled fields ─
  useEffect(() => {
    const prev = prevDataRef.current;
    const newEntries: ActivityItem[] = [];

    for (const [key, val] of Object.entries(currentData)) {
      if (isValueFilled(val)) {
        const prevVal = prev[key];
        if (!isValueFilled(prevVal)) {
          // This field was just filled
          const label = findFieldLabel(schema, key);
          newEntries.push({ key, label, time: Date.now() });
        }
      }
    }

    prevDataRef.current = { ...currentData };

    if (newEntries.length > 0) {
      setActivityFeed(prev => [...newEntries, ...prev].slice(0, 5));
    }
  }, [currentData, schema]);

  // ── Reset activity feed when docType changes ──────
  useEffect(() => {
    setActivityFeed([]);
    prevDataRef.current = {};
  }, [docType]);

  const progress = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  const sectionProgress = getSectionProgress(schema, currentData);

  // ── Clear all messages ───────────────────────────
  const handleClearChat = useCallback(() => {
    setMessages([]);
    setStreamingText('');
    setIsLoading(false);
    setIsStreaming(false);
    setActivityFeed([]);
    prevDataRef.current = { ...currentData };
  }, [currentData]);

  // ── Toggle section accordion ─────────────────────
  const toggleSection = useCallback((key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Build suggestion chips dynamically ────────────
  function getSuggestionChips(): string[] {
    const chips: string[] = [];
    const docLabel = getDocTypeLabel(docType);

    if (docType) {
      chips.push(`What is ${docLabel}?`);
    }
    if (activeFieldKey) {
      chips.push('Explain this field');
    }
    if (filledFields > 0) {
      chips.push('Check my entries');
    }
    if (totalFields - filledFields > 0) {
      chips.push("What's missing?");
    }
    if (docType) {
      chips.push(`Common mistakes in ${docLabel}`);
    }
    return chips;
  }

  // ── Internal send logic ──────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text || isLoading || isStreaming) return;
      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      setIsLoading(true);
      setIsStreaming(true);

      try {
        const response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
          },
          body: JSON.stringify({
            message: text,
            scope: 'local',
            stream: true,
            doc_type: docType || undefined,
            schema: schema || undefined,
            current_data: currentData || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error('Chat request failed');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                setIsLoading(false);
                fullText += data.token;
                setStreamingText(stripMarkdown(fullText));
              }
              if (data.done) {
                const finalText = stripMarkdown(data.reply || fullText);
                setIsLoading(false);
                setIsStreaming(false);
                setStreamingText('');
                setMessages(prev => [
                  ...prev,
                  { role: 'assistant', content: finalText },
                ]);
              }
              if (data.error) {
                setIsLoading(false);
                setIsStreaming(false);
                setStreamingText('');
                setMessages(prev => [
                  ...prev,
                  { role: 'assistant', content: `Error: ${data.error}` },
                ]);
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      } catch (error) {
        console.error('ChatSidebar request failed', error);
        setIsLoading(false);
        setIsStreaming(false);
        setStreamingText('');
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Error connecting to the server.',
          },
        ]);
      }
    },
    [isLoading, isStreaming, docType, schema, currentData, stripMarkdown],
  );

  const handleSend = useCallback(() => {
    sendMessage(input.trim());
  }, [input, sendMessage]);

  const handleChipClick = useCallback(
    (chip: string) => {
      sendMessage(chip);
    },
    [sendMessage],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Contextual help for active field ──────────────
  const activeField = activeFieldKey ? findFieldInSchema(schema, activeFieldKey) : null;

  function renderFieldTypeBadge(type: string): string {
    const map: Record<string, string> = {
      text: 'Text input',
      textarea: 'Long text',
      select: 'Dropdown',
      date: 'Date picker',
      number: 'Numeric',
      email: 'Email',
    };
    return map[type] || type;
  }

  // ── Render ────────────────────────────────────────

  return (
    <aside
      className="w-[450px] shrink-0 h-[100dvh] flex flex-col bg-white border-l border-slate-200 overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Header ──────────────────────────────── */}
      <div className="shrink-0 px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">
          📋 Form Assistant
        </h3>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
            title="Clear chat history"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Active Field Indicator ──────────────── */}
      {activeFieldKey ? (
        <div className="shrink-0 px-5 py-2.5 bg-indigo-50/50 border-b border-indigo-100">
          <p className="text-[12px] font-semibold text-indigo-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Active: {activeFieldLabel}
          </p>
        </div>
      ) : (
        <div className="shrink-0 px-5 py-2.5 bg-slate-50/50 border-b border-slate-100">
          <p className="text-[12px] text-slate-400">
            Click a field in the form to begin
          </p>
        </div>
      )}


      {/* ── Messages Area ───────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {/* ── Empty state: Quick Tips or Contextual Help ─ */}
        {messages.length === 0 && !isStreaming && !isLoading && (
          <>
            {/* Contextual Help Card (when a field is focused) */}
            {activeFieldKey && activeField ? (
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 bg-white/70 px-2 py-0.5 rounded-full">
                    {renderFieldTypeBadge(activeField.type)}
                  </span>
                  {activeField.required && (
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400 bg-red-50 px-2 py-0.5 rounded-full">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-[13px] font-semibold text-slate-800 mb-1">
                  {activeField.label}
                </p>
                {activeField.type === 'select' && activeField.options ? (
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    Choose from:{' '}
                    {activeField.options
                      .map(o =>
                        typeof o === 'string' ? o : o.label || o.value,
                      )
                      .join(', ')}
                  </p>
                ) : activeField.type === 'date' ? (
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    Enter a date. Example: 15 May 2026
                  </p>
                ) : activeField.type === 'number' ? (
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    Enter a numeric value. Use plain numbers without commas.
                  </p>
                ) : (
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    Type "Explain this field" or click the chip below
                    to learn more.
                  </p>
                )}
              </div>
            ) : (
              /* Quick Tips Card (no active field) */
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500 mb-2">
                  💡 Quick Tips — {getDocTypeLabel(docType)}
                </p>
                <ul className="space-y-2">
                  {getQuickTips(docType).map((tip, i) => (
                    <li key={i} className="flex gap-2 text-[12px] text-slate-600 leading-relaxed">
                      <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* ── Live Activity Feed ────────────────── */}
        {activityFeed.length > 0 && messages.length === 0 && !isStreaming && !isLoading && (
          <div className="border border-slate-100 rounded-2xl p-3.5 bg-white">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Recent Activity
            </p>
            <div className="space-y-1.5">
              {activityFeed.map((item, i) => {
                const secondsAgo = Math.floor((Date.now() - item.time) / 1000);
                const timeStr =
                  secondsAgo < 10
                    ? 'just now'
                    : secondsAgo < 60
                      ? `${secondsAgo}s ago`
                      : secondsAgo < 3600
                        ? `${Math.floor(secondsAgo / 60)}m ago`
                        : `${Math.floor(secondsAgo / 3600)}h ago`;
                return (
                  <div
                    key={`${item.key}-${item.time}`}
                    className="flex items-center justify-between text-[12px]"
                  >
                    <span className="text-slate-600 truncate mr-2">
                      <span className="text-emerald-500 font-medium mr-1">
                        ✓
                      </span>
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {timeStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Chat Messages ─────────────────────── */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-slate-100 text-slate-800 rounded-br-md'
                  : msg.role === 'system'
                    ? 'bg-indigo-50 text-indigo-700 text-[12px] italic rounded-bl-md'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[90%] px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white border border-slate-200 text-[13px] text-slate-700 leading-relaxed">
              {streamingText || '\u00A0'}
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-indigo-500 animate-pulse align-text-bottom rounded-sm" />
            </div>
          </div>
        )}
      </div>

      {/* ── Suggestion Chips ────────────────────── */}
      {(() => {
        const chips = getSuggestionChips();
        if (chips.length === 0) return null;
        return (
          <div className="shrink-0 px-4 pt-1 pb-1 border-t border-slate-100">
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleChipClick(chip)}
                  disabled={isLoading || isStreaming}
                  className="px-3 py-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Progress bar ────────────────────────── */}
      <div className="shrink-0 px-4 py-0.5 border-t border-slate-100">
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Text Input ──────────────────────────── */}
      <div className="shrink-0 px-4 py-2 border-t border-slate-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Type "check my entries" or ask…'
            className="flex-1 min-w-0 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 shrink-0 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}