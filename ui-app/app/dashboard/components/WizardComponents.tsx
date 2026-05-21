'use client';

import React from 'react';
import { SchemaStep, SchemaSection, SchemaField } from '../types';
import { FieldRenderer } from './FormElements';

export function SelectionStep({ stepDef, selections, onSelect, readOnly }: {
  stepDef: SchemaStep;
  selections: Record<string, string>;
  onSelect: (key: string, value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-black text-[#1a1d2e] tracking-tight mb-2">{stepDef.title}</h2>
        <p className="text-sm text-gray-400">
          {readOnly ? 'Configuration is locked for this verified document.' : 'Select the applicable configuration for this trade.'}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {stepDef.field && (stepDef.field.options || []).map((opt) => {
          const v = typeof opt === 'string' ? opt : opt.value;
          const l = typeof opt === 'string' ? opt : opt.label;
          const s = typeof opt === 'string' ? undefined : opt.subtitle;
          const active = selections[stepDef.field!.key] === v;
          return (
            <button
              key={v}
              onClick={() => !readOnly && onSelect(stepDef.field!.key, v)}
              disabled={readOnly}
              className={`p-4 sm:p-6 rounded-[24px] border-2 text-left transition-all duration-300 flex items-center gap-3 sm:gap-4 group ${
                active 
                  ? 'border-[#4f46e5] bg-indigo-50/50 shadow-lg shadow-indigo-500/10' 
                  : 'border-gray-100 bg-white hover:border-gray-200'
              } ${readOnly ? 'cursor-not-allowed opacity-90' : ''}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${
                active ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'
              }`}>
                {active ? '✓' : (l.charAt(0))}
              </div>
              <div className="flex-1">
                <span className={`text-base font-bold block ${active ? 'text-indigo-900' : 'text-gray-700'}`}>{l}</span>
                <span className="text-xs text-gray-400 font-medium tracking-tight">{s || 'Standard Regulatory Framework'}</span>
              </div>
            </button>
          );
        })}
        {!stepDef.field && (
          <div className="p-10 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <p className="text-sm text-gray-400">This step is missing configuration data.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SectionStep({ section, stepData, onUpdate, aiMode, allData, onFieldFocus, activeFieldKey, readOnly }: {
  section: SchemaSection;
  stepData: Record<string, unknown>;
  onUpdate: (key: string, value: unknown) => void;
  aiMode: boolean;
  allData: Record<string, unknown>;
  onFieldFocus?: (key: string) => void;
  activeFieldKey?: string | null;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-500">
      <div className="pb-4 sm:pb-5 border-b border-slate-100/80">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{section.title}</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Section Configuration</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 lg:gap-x-8 gap-y-5 sm:gap-y-7">
        {(section.fields || []).map((f) => (
          <div key={f.key} className={f.type === 'textarea' || f.type.startsWith('repeater') ? 'md:col-span-2' : ''}>
            <FieldRenderer field={f} stepData={stepData} onUpdate={onUpdate} aiMode={aiMode} allData={allData || {}} onFieldFocus={onFieldFocus} activeFieldKey={activeFieldKey} readOnly={readOnly} />
          </div>
        ))}
        {section.subsections && section.subsections.map((ss, sidx) => (
          <React.Fragment key={sidx}>
            <div className="md:col-span-2 mt-6 pb-2 border-b border-gray-50">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{ss.title}</h4>
            </div>
            {(ss.fields || []).map((f) => (
              <div key={f.key} className={f.type === 'textarea' || f.type.startsWith('repeater') ? 'md:col-span-2' : ''}>
                <FieldRenderer field={f} stepData={stepData} onUpdate={onUpdate} aiMode={aiMode} allData={allData || {}} onFieldFocus={onFieldFocus} activeFieldKey={activeFieldKey} readOnly={readOnly} />
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function FieldsStep({ title, fields, stepData, onUpdate, aiMode, allData, onFieldFocus, activeFieldKey, readOnly }: {
  title: string;
  fields: SchemaField[];
  stepData: Record<string, unknown>;
  onUpdate: (key: string, value: unknown) => void;
  aiMode: boolean;
  allData: Record<string, unknown>;
  onFieldFocus?: (key: string) => void;
  activeFieldKey?: string | null;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-500">
      <div className="pb-4 sm:pb-5 border-b border-slate-100/80">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Field Management</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 lg:gap-x-8 gap-y-5 sm:gap-y-7">
        {fields.map((f) => (
          <div key={f.key} className={f.type === 'textarea' || f.type.startsWith('repeater') ? 'md:col-span-2' : ''}>
            <FieldRenderer field={f} stepData={stepData} onUpdate={onUpdate} aiMode={aiMode} allData={allData} onFieldFocus={onFieldFocus} activeFieldKey={activeFieldKey} readOnly={readOnly} />
          </div>
        ))}
      </div>
    </div>
  );
}
