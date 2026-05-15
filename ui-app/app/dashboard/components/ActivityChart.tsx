'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RecentDoc } from '../types';

interface ActivityChartProps {
  documents: RecentDoc[];
}

export default function ActivityChart({ documents = [] }: ActivityChartProps) {
  // Real Data Processing
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    const dayName = days[d.getDay()];
    
    // Filter documents for this specific day
    const dayDocs = documents.filter(doc => {
      if (!doc.created_at) return false;
      const docDate = new Date(doc.created_at);
      
      return (
        docDate.getFullYear() === d.getFullYear() &&
        docDate.getMonth() === d.getMonth() &&
        docDate.getDate() === d.getDate()
      );
    });

    return {
      day: dayName,
      // Manual: If not ai_created AND not from email/text
      manual: dayDocs.filter(doc => !doc.ai_created && (doc.source_type !== 'email' && doc.source_type !== 'text')).length,
      // AI: If ai_created OR from email/text
      ai: dayDocs.filter(doc => doc.ai_created || (doc.source_type === 'email' || doc.source_type === 'text')).length
    };
  });

  // Calculate max count for scaling, ensure at least 5 for visual balance
  const maxCount = Math.max(...chartData.map(d => Math.max(d.manual, d.ai)), 2);

  return (
    <div className="flex flex-col gap-5 w-full lg:w-[68%]">
      <h2 className="text-xl font-semibold text-text-secondary font-inter">
        Processing Activity
      </h2>

      <div className="flex flex-col w-full bg-white rounded-xl p-6 shadow-card h-[276px]">
        <div className="flex justify-end gap-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#1814f3]" />
            <span className="text-xs text-text-tertiary font-inter">Manual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#16dbcc]" />
            <span className="text-xs text-text-tertiary font-inter">AI Extract</span>
          </div>
        </div>

        <div className="flex-1 flex items-end justify-between px-2">
          {chartData.map((item, i) => (
            <div key={`${item.day}-${i}`} className="flex flex-col items-center gap-3 w-full">
              <div className="flex gap-2 items-end h-[140px]">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(item.manual / maxCount) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className="w-3 sm:w-4 bg-[#1814f3] rounded-full"
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(item.ai / maxCount) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 + 0.2 }}
                  className="w-3 sm:w-4 bg-[#16dbcc] rounded-full"
                />
              </div>
              <span className="text-xs text-text-tertiary font-inter">{item.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
