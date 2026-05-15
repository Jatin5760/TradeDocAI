'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';

interface BalanceData {
  month: string;
  balance: number;
}

export default function BalanceHistorySection() {
  const balanceData: BalanceData[] = [
    { month: 'Jul', balance: 200 },
    { month: 'Aug', balance: 450 },
    { month: 'Sep', balance: 500 },
    { month: 'Oct', balance: 850 },
    { month: 'Nov', balance: 550 },
    { month: 'Dec', balance: 1000 },
    { month: 'Jan', balance: 650 }
  ]

  return (
    <div className="flex flex-col gap-5 sm:gap-5 md:gap-5 lg:gap-5 w-full lg:w-[58%]">
      <h2 className="text-[16px] sm:text-[18px] md:text-[20px] lg:text-2xl font-semibold leading-[20px] sm:leading-[22px] md:leading-[25px] lg:leading-3xl text-text-secondary font-inter">
        Balance History
      </h2>

      <div className="flex flex-col w-full bg-[#ffffff] rounded-xl sm:rounded-xl md:rounded-2xl lg:rounded-xl px-[18px] sm:px-[19px] md:px-[20px] lg:px-[22px] py-[20px] sm:py-[22px] md:py-[24px] lg:py-[26px]">
        <div className="w-full h-[200px] sm:h-[210px] md:h-[216px] lg:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={balanceData}
              role="img"
              aria-label="Balance history line chart"
            >
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1814f3" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#1814f3" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5eef4" vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#718ebf', fontSize: 13 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#718ebf', fontSize: 13 }}
                domain={[0, 800]}
                ticks={[0, 200, 400, 600, 800]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #dfeaf2',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="none" 
                fillOpacity={1} 
                fill="url(#colorBalance)" 
              />
              <Line 
                type="monotone" 
                dataKey="balance" 
                stroke="#1814f3" 
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}