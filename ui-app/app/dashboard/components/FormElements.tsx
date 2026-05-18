'use client';

import React from 'react';
import { SchemaField } from '../types';

interface FieldRendererProps {
  field: SchemaField;
  stepData: Record<string, unknown>;
  onUpdate: (key: string, value: unknown) => void;
  aiMode: boolean;
  allData: Record<string, unknown>;
  onFieldFocus?: (key: string) => void;
  activeFieldKey?: string | null;
}

export function FieldRenderer({
  field, stepData, onUpdate, aiMode, allData, onFieldFocus, activeFieldKey,
}: FieldRendererProps) {
  // Conditional visibility
  if (field.show_when) {
    const srcVal = allData[field.show_when.field];
    const targetVal = field.show_when.value;
    const operator = field.show_when.operator || 'equal';

    if (operator === 'not_equal') {
      if (srcVal === targetVal) return null;
    } else {
      // Default 'equal'
      if (srcVal !== targetVal) return null;
    }
  }

  const isAiFilled = aiMode && stepData[field.key] && String(stepData[field.key]).trim();
  const isActive = activeFieldKey === field.key;
  const baseInputClass = `w-full min-w-0 px-3 sm:px-4 py-3 sm:py-3 bg-slate-50/50 border rounded-[16px] text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all duration-300 ${
    isActive ? 'ring-2 ring-indigo-400 border-indigo-400 bg-indigo-50/30 shadow-lg shadow-indigo-200/50' : isAiFilled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 focus:border-indigo-600 shadow-sm'
  }`;

  if (field.type === 'repeater_simple') {
    return <RepeaterSimple field={field} stepData={stepData} onUpdate={onUpdate} onFieldFocus={onFieldFocus} activeFieldKey={activeFieldKey} />;
  }
  if (field.type === 'repeater_pair') {
    return <RepeaterPair field={field} stepData={stepData} onUpdate={onUpdate} onFieldFocus={onFieldFocus} activeFieldKey={activeFieldKey} />;
  }

  return (
    <div className="space-y-2" data-field-key={field.key}>
      <label className={`block text-[10px] sm:text-[12px] font-semibold uppercase tracking-wider ml-1 transition-colors duration-300 ${isActive ? 'text-indigo-600' : 'text-slate-600'}`}>
        {field.label}{field.required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          value={(stepData[field.key] as string) || ''}
          onChange={e => onUpdate(field.key, e.target.value)}
          onFocus={() => onFieldFocus?.(field.key)}
          placeholder={field.placeholder || ''}
          className={`${baseInputClass} min-h-[100px] resize-y leading-relaxed`}
        />
      ) : field.type === 'select' ? (
        <div className="relative">
          <select
            value={(stepData[field.key] as string) || ''}
            onChange={e => onUpdate(field.key, e.target.value)}
            onFocus={() => onFieldFocus?.(field.key)}
            className={`${baseInputClass} appearance-none cursor-pointer pr-12`}
          >
            {!field.options?.some(o => (typeof o === 'string' ? o : o.value) === '') && (
              <option value="">— Select Option —</option>
            )}
            {(field.options || []).map(opt => {
              const v = typeof opt === 'string' ? opt : opt.value;
              const l = typeof opt === 'string' ? (opt || 'None') : opt.label;
              return <option key={v} value={v}>{l}</option>;
            })}
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      ) : (
        <input
          type="text"
          value={(stepData[field.key] as string) || ''}
          onChange={e => onUpdate(field.key, e.target.value)}
          onFocus={() => onFieldFocus?.(field.key)}
          placeholder={field.placeholder || ''}
          className={baseInputClass}
        />
      )}
    </div>
  );
}

function RepeaterSimple({ field, stepData, onUpdate, onFieldFocus, activeFieldKey }: {
  field: SchemaField;
  stepData: Record<string, unknown>;
  onUpdate: (key: string, value: unknown) => void;
  onFieldFocus?: (key: string) => void;
  activeFieldKey?: string | null;
}) {
  const repKey = '__rep_' + field.key;
  const items: string[] = (stepData[repKey] as string[]) || field.defaults || [];

  const setItems = (newItems: string[]) => onUpdate(repKey, newItems);

  const repActiveKey = '__rep_' + field.key;
  const isActive = activeFieldKey === repActiveKey;

  return (
    <div className="space-y-3">
      <label className={`block text-[10px] sm:text-[12px] font-semibold uppercase tracking-wider ml-1 transition-colors duration-300 ${isActive ? 'text-indigo-600' : 'text-slate-600'}`}>{field.label}</label>
      <div className="space-y-3">
        {items.map((val, idx) => (
          <div key={idx} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
            <input
              type="text"
              value={val}
              onChange={e => {
                const copy = [...items]; copy[idx] = e.target.value; setItems(copy);
              }}
              onFocus={() => onFieldFocus?.(repActiveKey)}
              placeholder={field.placeholder || ''}
              className={`min-w-0 flex-1 px-3 sm:px-4 py-3 sm:py-3 bg-slate-50/50 border border-slate-200 rounded-[16px] text-[14px] font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all shadow-sm ${isActive ? 'ring-2 ring-indigo-400 border-indigo-400 bg-indigo-50/30 shadow-lg shadow-indigo-200/50' : ''}`}
            />
            <button
              onClick={() => setItems(items.filter((_, i) => i !== idx))}
              className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all active:scale-95 shadow-sm"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => setItems([...items, ''])}
        className="w-full py-2.5 sm:py-3 px-4 sm:px-5 bg-indigo-50/50 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-[16px] hover:bg-indigo-50 hover:border-indigo-400 transition-all font-bold text-[10px] sm:text-[12px] uppercase tracking-widest flex items-center justify-center gap-2"
      >
        <span>+</span> Add {field.label}
      </button>
    </div>
  );
}

function RepeaterPair({ field, stepData, onUpdate, onFieldFocus, activeFieldKey }: {
  field: SchemaField;
  stepData: Record<string, unknown>;
  onUpdate: (key: string, value: unknown) => void;
  onFieldFocus?: (key: string) => void;
  activeFieldKey?: string | null;
}) {
  const repKey = '__rep_' + field.key;
  const items: Array<{ title: string; description: string }> = (stepData[repKey] as Array<{ title: string; description: string }>) || [];
  const isActive = activeFieldKey === repKey;

  const setItems = (newItems: typeof items) => onUpdate(repKey, newItems);

  return (
    <div className="space-y-4">
      <label className={`block text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ml-1 transition-colors duration-300 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>{field.label}s</label>
      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] font-black text-gray-300 uppercase tracking-tighter">Entry #{idx + 1}</span>
              <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input
              type="text"
              value={item.title}
              onChange={e => {
                const copy = [...items]; copy[idx] = { ...copy[idx], title: e.target.value }; setItems(copy);
              }}
              onFocus={() => onFieldFocus?.(repKey)}
              placeholder={field.title_placeholder || 'Title'}
              className={`px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 ${isActive ? 'ring-2 ring-indigo-400 border-indigo-400' : ''}`}
            />
            <textarea
              value={item.description}
              onChange={e => {
                const copy = [...items]; copy[idx] = { ...copy[idx], description: e.target.value }; setItems(copy);
              }}
              onFocus={() => onFieldFocus?.(repKey)}
              placeholder={field.description_placeholder || 'Description'}
              className={`px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 min-h-[80px] resize-y ${isActive ? 'ring-2 ring-indigo-400 border-indigo-400' : ''}`}
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => setItems([...items, { title: '', description: '' }])}
        className="w-full py-3 px-4 bg-white border-2 border-dashed border-gray-100 text-gray-400 rounded-2xl hover:border-indigo-600 hover:text-indigo-600 transition-all font-bold text-xs uppercase tracking-widest"
      >
        + Add {field.label}
      </button>
    </div>
  );
}
