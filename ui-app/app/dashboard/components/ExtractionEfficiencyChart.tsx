'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RecentDoc } from '../types';

interface ExtractionEfficiencyChartProps {
  documents: RecentDoc[];
}

export default function ExtractionEfficiencyChart({ documents = [] }: ExtractionEfficiencyChartProps) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  // 1. Calculate efficiency per day for the last 7 days
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    const dateStr = d.toDateString();
    const dayName = days[d.getDay()];

    const dayDocs = (documents || []).filter(doc => {
      if (!doc.created_at || !doc.ai_created) return false;
      return new Date(doc.created_at).toDateString() === dateStr;
    });

    if (dayDocs.length === 0) {
      return { day: dayName, efficiency: 0 };
    }

    // Average efficiency for the day
    const totalEfficiency = dayDocs.reduce((acc, doc) => {
      const data = doc.data || {};
      const fields = Object.values(data);
      if (fields.length === 0) return acc;
      const populated = fields.filter(v => v !== null && v !== "" && v !== undefined).length;
      // Assume 25-30 fields is a full extraction
      const score = Math.min((populated / 25) * 100, 100);
      return acc + score;
    }, 0);

    return { day: dayName, efficiency: totalEfficiency / dayDocs.length };
  });

  // 2. Generate SVG points (200x100 viewBox)
  // X: 0 to 200 (7 points, so 200/6 = 33.3 step)
  // Y: 100 - efficiency (0 to 100)
  const points = chartData.map((d, i) => `${i * 33.3},${100 - d.efficiency}`).join(' ');
  const areaPath = `M0,100 ${points} L200,100 Z`;

  return (
    <div className="flex flex-col gap-5 w-full lg:w-[60%]">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-secondary font-inter">
          Extraction Efficiency
        </h2>
        <div className="bg-slate-50 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full border border-slate-100">
          {documents.length} TOTAL
        </div>
      </div>

      <div className="flex flex-col w-full bg-white rounded-xl p-6 shadow-card h-[280px]">
        <div className="flex-1 w-full relative pt-2">
          <div className="h-[160px] w-full">
            <svg viewBox="0 0 200 100" className="w-full h-full preserve-3d overflow-visible">
              {/* Simple Horizontal Grid */}
              {[0, 50, 100].map((y) => (
                <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#f1f5f9" strokeWidth="1" />
              ))}

              {/* Area under the curve */}
              <motion.path
                d={areaPath}
                fill="url(#gradient-efficiency-simple)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
                transition={{ duration: 1.5 }}
              />

              {/* Line */}
              <motion.polyline
                points={points}
                fill="none"
                stroke="#1814f3"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />

              <defs>
                <linearGradient id="gradient-efficiency-simple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1814f3" stopOpacity="1" />
                  <stop offset="100%" stopColor="#1814f3" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="flex justify-between mt-6 px-1">
            {chartData.map((d) => (
              <span key={d.day} className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{d.day}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
