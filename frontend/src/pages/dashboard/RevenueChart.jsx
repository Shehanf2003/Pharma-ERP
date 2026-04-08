import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RevenueChart = ({ data }) => {
  const valueFormatter = (number) => `Rs. ${Intl.NumberFormat('en-US').format(number)}`;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12, fill: '#6b7280' }} 
            axisLine={false} 
            tickLine={false} 
            tickMargin={10}
          />
          <YAxis 
            tickFormatter={(value) => valueFormatter(value)}
            tick={{ fontSize: 12, fill: '#6b7280' }} 
            axisLine={false} 
            tickLine={false} 
            width={80}
          />
          <Tooltip 
            formatter={(value) => [valueFormatter(value), 'Sales']}
            contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            cursor={{ fill: '#f3f4f6' }}
          />
          <Bar 
            dataKey="sales" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;
