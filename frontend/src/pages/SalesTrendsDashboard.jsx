import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { X } from 'lucide-react';

const formatCurrency = (value) => `Rs. ${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
const formatNumber = (value) => Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

const CustomTooltip = ({ active, payload, label, isCurrency }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-blue-950 p-3 border border-blue-800 shadow-xl rounded-xl z-50">
        <p className="text-sm font-semibold mb-1 text-white">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
            <span className="text-blue-200 font-medium">{entry.name}:</span>
            <span className="font-bold text-white">
              {isCurrency ? formatCurrency(entry.value) : entry.value.toLocaleString()}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomLegend = (props) => {
  const { payload } = props;
  return (
    <div className="flex justify-end gap-4 text-sm font-medium text-blue-200 mb-2">
      {payload.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
          {entry.value}
        </div>
      ))}
    </div>
  );
};

const SkeletonLoader = () => (
  <div className="animate-pulse space-y-6 w-full">
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-80">
      <div className="lg:col-span-1 rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm"></div>
      <div className="lg:col-span-2 rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm"></div>
      <div className="lg:col-span-1 rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm"></div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-80">
      <div className="lg:col-span-1 rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm"></div>
      <div className="lg:col-span-2 rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm"></div>
      <div className="lg:col-span-1 rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm"></div>
    </div>
  </div>
);

const SalesTrendsDashboard = ({ loading, metrics, trendsData, categoryData, topProducts }) => {
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  if (loading) return <SkeletonLoader />;

  const hasData = trendsData.length > 0 || categoryData.length > 0 || topProducts.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-blue-800 border-dashed bg-blue-900/40">
        <h3 className="text-lg font-bold text-white">No Sales Data Available</h3>
        <p className="text-blue-200 text-sm mt-1 font-medium">Adjust your date filters to see trends and metrics.</p>
      </div>
    );
  }

  // Find max sales for category progress bars
  const maxCategorySales = Math.max(...categoryData.map(c => c.sales), 1);

  return (
    <div className="space-y-6 w-full">
      
      {/* --- TOP ROW --- */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Top Left: Revenue Metric */}
        <div className="p-6 flex flex-col justify-between rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-white mb-6">Revenue</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-extrabold text-white tracking-tight">{formatCurrency(metrics.totalRevenue)}</span>
            </div>
            <p className="text-blue-200 text-sm mt-1 font-medium">YTD</p>
          </div>
          
          <div className="mt-8">
            <div className="w-full bg-blue-950 h-2.5 rounded-full overflow-hidden flex">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <div className="flex justify-between text-xs mt-2 font-medium">
              <span className="text-indigo-600">75%</span>
              <span className="text-blue-200">Target</span>
            </div>
          </div>
        </div>

        {/* Top Middle: Revenue Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4">Revenue Trend</h3>
          <div className="h-[280px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendsData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  tick={{fontSize: 12, fill: '#6b7280'}} 
                  axisLine={{ stroke: '#f3f4f6' }} 
                  tickLine={false} 
                  tickMargin={10} 
                />
                <YAxis 
                  tickFormatter={(val) => formatNumber(val)} 
                  tick={{fontSize: 12, fill: '#6b7280'}} 
                  axisLine={false} 
                  tickLine={false} 
                  tickMargin={10} 
                />
                <Tooltip cursor={{fill: '#1e3a8a'}} content={<CustomTooltip isCurrency={true} />} />
                <Legend content={<CustomLegend />} verticalAlign="top" align="right" />
                <Bar dataKey="Revenue" name="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Right: Categories */}
        <div className="p-6 rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">By Category</h3>
            {categoryData.length > 4 && (
              <button 
                onClick={() => setShowCategoryModal(true)} 
                className="text-sm text-indigo-400 font-medium hover:text-indigo-300 hover:underline transition-colors"
              >
                View All
              </button>
            )}
          </div>
          <div className="space-y-5">
            {categoryData.slice(0, 4).map((category, idx) => {
              const widthPct = (category.sales / maxCategorySales) * 100;
              return (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-blue-100">{category.name}</span>
                    <span className="font-bold text-white">{formatCurrency(category.sales)}</span>
                  </div>
                  <div className="w-full bg-blue-950 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-indigo-500" 
                      style={{ width: `${widthPct}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* --- BOTTOM ROW --- */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Bottom Left: Orders Metric */}
        <div className="p-6 flex flex-col justify-center rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm relative">
          <h2 className="text-lg font-bold text-white mb-4 absolute top-6 left-6">Orders</h2>
          <div className="mt-8 mb-6">
            <span className="text-5xl font-extrabold text-white tracking-tight">{formatNumber(metrics.totalOrders)}</span>
            <p className="text-blue-200 text-sm mt-1 font-medium">YTD</p>
            <p className="text-emerald-600 text-xs font-bold mt-2 flex items-center gap-1">
              ▲ 12% v LY
            </p>
          </div>
          <div className="mt-auto pt-6 border-t border-blue-800/50">
            <span className="text-3xl font-bold text-white tracking-tight">{formatCurrency(metrics.avgOrderValue)}</span>
            <p className="text-blue-200 text-sm mt-1 font-medium">Avg Order Value</p>
          </div>
        </div>

        {/* Bottom Middle: Top Products Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4">Top Products</h3>
          <div className="h-[280px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  tick={{fontSize: 12, fill: '#6b7280'}} 
                  axisLine={{ stroke: '#f3f4f6' }} 
                  tickLine={false} 
                  tickMargin={10} 
                  tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val}
                />
                <YAxis 
                  tick={{fontSize: 12, fill: '#6b7280'}} 
                  axisLine={false} 
                  tickLine={false} 
                  tickMargin={10} 
                />
                <Tooltip cursor={{fill: '#1e3a8a'}} content={<CustomTooltip isCurrency={false} />} />
                <Legend content={<CustomLegend />} verticalAlign="top" align="right" />
                <Bar dataKey="units" name="Units Sold" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Right: Mini Metric Cards */}
        <div className="grid grid-rows-3 gap-6 h-full">
          {/* Card 1 */}
          <div className="p-4 rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm flex flex-col justify-center">
             <p className="text-sm font-semibold text-blue-200 mb-2">Top Product Category</p>
             <div className="flex justify-between items-end">
               <span className="text-2xl font-bold text-white leading-none">
                 {categoryData.length > 0 ? categoryData[0].name : '-'}
               </span>
             </div>
          </div>
          
          {/* Card 2 */}
          <div className="p-4 rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm flex flex-col justify-center">
             <p className="text-sm font-semibold text-blue-200 mb-2">Total Categories Sold</p>
             <div className="flex justify-between items-end">
               <span className="text-3xl font-extrabold text-white leading-none">{categoryData.length}</span>
             </div>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-2xl bg-blue-900/40 border border-blue-800 shadow-sm flex flex-col justify-center">
             <p className="text-sm font-semibold text-blue-200 mb-2">Products in Top Tier</p>
             <div className="flex justify-between items-end">
               <span className="text-3xl font-extrabold text-white leading-none">{topProducts.length}</span>
               <div className="text-right">
                  <p className="text-xs text-blue-200 mb-1 font-medium">Total volume</p>
                  <span className="text-lg font-bold text-indigo-400">
                    {formatNumber(topProducts.reduce((acc, curr) => acc + curr.units, 0))}
                  </span>
               </div>
             </div>
          </div>
        </div>

      </div>

      {/* Modal for All Categories */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-blue-950 border border-blue-800 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">All Categories</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-blue-300 hover:text-white transition-colors p-1 rounded-full hover:bg-blue-800/50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-5 custom-scrollbar">
              {categoryData.map((category, idx) => {
                const widthPct = (category.sales / maxCategorySales) * 100;
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-blue-100">{category.name}</span>
                    <span className="font-bold text-white">{formatCurrency(category.sales)}</span>
                    </div>
                  <div className="w-full bg-blue-900 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-indigo-500" 
                        style={{ width: `${widthPct}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTrendsDashboard;