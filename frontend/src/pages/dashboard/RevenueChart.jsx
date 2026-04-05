import React from 'react';
import { BarChart } from '@tremor/react';

const RevenueChart = ({ data }) => {
  const valueFormatter = (number) => `Rs. ${Intl.NumberFormat('en-US').format(number)}`;

  return (
    <div className="h-[300px] w-full">
      <BarChart
        className="h-full"
        data={data}
        index="name"
        categories={['sales']}
        colors={['blue']}
        valueFormatter={valueFormatter}
        yAxisWidth={80}
      />
    </div>
  );
};

export default RevenueChart;
