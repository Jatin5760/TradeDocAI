'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface WeekData {
  day: string;
  deposit: number;
  withdraw: number;
}

export default function WeeklyActivitySection() {
  const weekData: WeekData[] = [
    { day: 'Sat', deposit: 250, withdraw: 480 },
    { day: 'Sun', deposit: 120, withdraw: 350 },
    { day: 'Mon', deposit: 320, withdraw: 400 },
    { day: 'Tue', deposit: 480, withdraw: 220 },
    { day: 'Wed', deposit: 380, withdraw: 150 },
    { day: 'Thu', deposit: 300, withdraw: 400 },
    { day: 'Fri', deposit: 380, withdraw: 240 }
  ]

  return (
    <div className="flex flex-col gap-[14px] sm:gap-[16px] md:gap-[17px] lg:gap-[18px] w-full lg:w-[68%]">
      <h2 className="text-[16px] sm:text-[18px] md:text-[20px] lg:text-2xl font-semibold leading-[20px] sm:leading-[22px] md:leading-[25px] lg:leading-3xl text-text-secondary font-inter">
        Weekly Activity
      </h2>

      <div className="flex flex-col w-full bg-[#ffffff] rounded-xl sm:rounded-xl md:rounded-2xl lg:rounded-xl px-6 sm:px-6 md:px-6 lg:px-6 py-6 sm:py-6 md:px-6 lg:py-6">
        <div className="w-full h-[240px] sm:h-[260px] md:h-[264px] lg:h-[268px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={weekData}
              barGap={8}
              role="img"
              aria-label="Weekly activity bar chart showing deposits and withdrawals"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5eef4" vertical={false} />
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#718ebf', fontSize: 13 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#718ebf', fontSize: 13 }}
                domain={[0, 500]}
                ticks={[0, 100, 200, 300, 400, 500]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #dfeaf2',
                  borderRadius: '8px'
                }}
              />
              <Legend 
                verticalAlign="top" 
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '20px' }}
              />
              <Bar 
                dataKey="deposit" 
                fill="#4c49ed" 
                radius={[10, 10, 10, 10]}
                name="Diposit"
                barSize={15}
              />
              <Bar 
                dataKey="withdraw" 
                fill="#16dbcc" 
                radius={[10, 10, 10, 10]}
                name="Withdraw"
                barSize={15}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}