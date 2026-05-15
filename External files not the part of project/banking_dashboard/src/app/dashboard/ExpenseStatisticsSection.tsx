'use client';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ExpenseData {
  name: string;
  value: number;
  color: string;
}

export default function ExpenseStatisticsSection() {
  const expenseData: ExpenseData[] = [
    { name: 'Entertainment', value: 30, color: '#343c6a' },
    { name: 'Bill Expense', value: 15, color: '#fc7900' },
    { name: 'Others', value: 35, color: '#1814f3' },
    { name: 'Investment', value: 20, color: '#fa00ff' }
  ]

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any): JSX.Element => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-xs sm:text-sm font-semibold"
      >
        <tspan x={x} dy="-0.5em" className="text-base sm:text-lg font-bold">
          {`${(percent * 100).toFixed(0)}%`}
        </tspan>
        <tspan x={x} dy="1.2em" className="text-xs font-normal">
          {name}
        </tspan>
      </text>
    )
  }

  return (
    <div className="flex flex-col gap-[14px] sm:gap-[16px] md:gap-[17px] lg:gap-[18px] w-full lg:w-[32%]">
      <h2 className="text-[16px] sm:text-[18px] md:text-[20px] lg:text-2xl font-semibold leading-[20px] sm:leading-[22px] md:leading-[25px] lg:leading-3xl text-text-secondary font-inter">
        Expense Statistics
      </h2>

      <div className="flex flex-col w-full bg-[#ffffff] rounded-xl sm:rounded-xl md:rounded-2xl lg:rounded-xl px-[24px] sm:px-[26px] md:px-[28px] lg:px-[30px] py-[24px] sm:py-[26px] md:py-[28px] lg:py-[30px]">
        <div className="w-full h-[220px] sm:h-[240px] md:h-[254px] lg:h-[258px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart role="img" aria-label="Expense statistics pie chart">
              <Pie
                data={expenseData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                innerRadius={0}
                dataKey="value"
              >
                {expenseData.map((entry: ExpenseData, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}