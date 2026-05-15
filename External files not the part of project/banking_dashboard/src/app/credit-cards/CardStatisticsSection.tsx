'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'DBL Bank', value: 35, color: '#1814f3' },
  { name: 'BRC Bank', value: 25, color: '#fc7900' },
  { name: 'ABM Bank', value: 20, color: '#16dbcc' },
  { name: 'MCP Bank', value: 20, color: '#ff82ac' }
];

export default function CardStatisticsSection() {
  return (
    <section className="w-full lg:w-[34%]">
      <h2 className="text-[16px] sm:text-[20px] lg:text-2xl font-semibold font-inter text-[#333b69] mb-4 sm:mb-5">
        Card Expense Statistics
      </h2>
      
      <div className="bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl p-5 sm:p-6 lg:p-7">
        <div className="w-full h-[220px] sm:h-[240px] lg:h-[252px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="45%"
                outerRadius="75%"
                paddingAngle={2}
                dataKey="value"
                aria-label="Card expense statistics pie chart"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                formatter={(value: string) => (
                  <span className="text-sm sm:text-base font-inter text-text-tertiary">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}