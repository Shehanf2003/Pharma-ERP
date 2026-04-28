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
      <div className="bg-slate-900 p-3 border border-slate-700 shadow-xl rounded-xl z-50">
        <p className="text-sm font-bold mb-1 text-white">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
            <span className="text-gray-300 font-bold">{entry.name}:</span>
            <span className="font-black text-white">
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
    <div className="flex justify-end gap-4 text-sm font-bold text-gray-300 mb-2">
      {payload.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
          {entry.value}
        </div>
      ))}
    </div>
  );
};

const SkeletonLoader = () => (
  <div className="animate-pulse flex flex-col gap-6 w-full min-h-[calc(100vh-160px)]">
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 rounded-2xl bg-slate-900 border border-slate-700"></div>
      <div className="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-700"></div>
      <div className="lg:col-span-1 rounded-2xl bg-slate-900 border border-slate-700"></div>
    </div>
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 rounded-2xl bg-slate-900 border border-slate-700"></div>
      <div className="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-700"></div>
      <div className="lg:col-span-1 rounded-2xl bg-slate-900 border border-slate-700"></div>
    </div>
  </div>
);

const SalesTrendsDashboard = ({ loading, metrics, trendsData, categoryData, topProducts }) => {
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  if (loading) return <SkeletonLoader />;

  const hasData = trendsData.length > 0 || categoryData.length > 0 || topProducts.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-4 border-slate-700 border-dashed bg-slate-900">
        <h3 className="text-xl font-bold text-white tracking-wide">No Sales Data Available</h3>
        <p className="text-gray-400 text-base mt-2 font-bold">Adjust your date filters to see trends and metrics.</p>
      </div>
    );
  }

  const maxCategorySales = Math.max(...categoryData.map(c => c.sales), 1);

  return (
    /* We use flex-col and min-h to ensure the content stretches vertically */
    <div className="flex flex-col gap-6 w-full min-h-[calc(100vh-160px)]">
      
      {/* --- TOP ROW --- */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Top Left: Revenue Metric */}
        <div className="p-6 flex flex-col justify-between rounded-2xl bg-slate-900 border border-slate-700 shadow-lg border-t-4 border-t-cyan-400 h-full">
          <div>
            <h2 className="text-base font-bold text-gray-300 uppercase tracking-wider mb-4">Revenue</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-white tracking-tight">{formatCurrency(metrics.totalRevenue)}</span>
            </div>
            <p className="text-gray-400 text-sm mt-2 font-bold">Year to Date</p>
          </div>
          
          <div className="mt-8">
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex border border-slate-700">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <div className="flex justify-between text-sm mt-3 font-bold">
              <span className="text-cyan-400">75%</span>
              <span className="text-gray-400">Target</span>
            </div>
          </div>
        </div>

        {/* Top Middle: Revenue Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-lg flex flex-col h-full">
          <h3 className="text-xl font-bold text-white mb-2 tracking-wide">Revenue Trend</h3>
          {/* Replaced fixed height with flex-1 so the chart grows to fill the parent card */}
          <div className="flex-1 w-full min-h-[200px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendsData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 'bold'}} 
                  axisLine={{ stroke: '#475569' }} 
                  tickLine={false} 
                  tickMargin={12} 
                />
                <YAxis 
                  tickFormatter={(val) => formatNumber(val)} 
                  tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 'bold'}} 
                  axisLine={false} 
                  tickLine={false} 
                  tickMargin={12} 
                />
                <Tooltip cursor={{fill: '#1e293b'}} content={<CustomTooltip isCurrency={true} />} />
                <Legend content={<CustomLegend />} verticalAlign="top" align="right" />
                <Bar dataKey="Revenue" name="Revenue" fill="#22d3ee" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Right: Categories */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-lg flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white tracking-wide">By Category</h3>
            {categoryData.length > 4 && (
              <button 
                onClick={() => setShowCategoryModal(true)} 
                className="text-sm text-cyan-400 font-bold hover:text-cyan-300 hover:underline transition-colors"
              >
                View All
              </button>
            )}
          </div>
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            {categoryData.slice(0, 4).map((category, idx) => {
              const widthPct = (category.sales / maxCategorySales) * 100;
              return (
                <div key={idx}>
                  <div className="flex justify-between text-base mb-2">
                    <span className="font-bold text-gray-300">{category.name}</span>
                    <span className="font-black text-white">{formatCurrency(category.sales)}</span>
                  </div>
                  <div className="w-full bg-slate-800 border border-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-cyan-400" 
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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Bottom Left: Orders Metric */}
        <div className="p-6 flex flex-col justify-center rounded-2xl bg-slate-900 border border-slate-700 shadow-lg border-t-4 border-t-amber-400 relative h-full">
          <h2 className="text-base font-bold text-gray-300 uppercase tracking-wider absolute top-6 left-6">Orders</h2>
          <div className="mt-8 mb-6">
            <span className="text-5xl font-black text-white tracking-tight">{formatNumber(metrics.totalOrders)}</span>
            <p className="text-gray-400 text-sm mt-2 font-bold">Year to Date</p>
            {/* Swapped emerald green for a high-contrast cyan for projector visibility */}
            <p className="text-cyan-400 text-sm font-black mt-3 flex items-center gap-1 bg-cyan-950 inline-block px-2 py-1 rounded">
              ▲ 12% v LY
            </p>
          </div>
          <div className="mt-auto pt-6 border-t border-slate-700">
            <span className="text-3xl font-black text-white tracking-tight">{formatCurrency(metrics.avgOrderValue)}</span>
            <p className="text-gray-400 text-sm mt-1 font-bold">Avg Order Value</p>
          </div>
        </div>

       {/* Bottom Middle: Top Products Chart */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-lg flex flex-col h-full">
            <h3 className="text-xl font-bold text-white mb-2 tracking-wide">Top Products</h3>
            <div className="flex-1 w-full min-h-[200px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                {/* FIX: Changed left margin from -20 to 10 */}
                <BarChart data={topProducts} margin={{ top: 20, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis 
                    dataKey="name" 
                    tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 'bold'}} 
                    axisLine={{ stroke: '#475569' }} 
                    tickLine={false} 
                    tickMargin={12} 
                    tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val}
                  />
                  <YAxis 
                    tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 'bold'}} 
                    axisLine={false} 
                    tickLine={false} 
                    tickMargin={12} 
                  />
                  <Tooltip cursor={{fill: '#1e293b'}} content={<CustomTooltip isCurrency={false} />} />
                  <Legend content={<CustomLegend />} verticalAlign="top" align="right" />
                  <Bar dataKey="units" name="Units Sold" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        {/* Bottom Right: Mini Metric Cards */}
        <div className="grid grid-rows-3 gap-6 h-full">
          {/* Card 1 */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700 shadow-lg flex flex-col justify-center h-full border-l-4 border-l-orange-500">
             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Top Category</p>
             <div className="flex justify-between items-end">
               <span className="text-2xl font-black text-white leading-none">
                 {categoryData.length > 0 ? categoryData[0].name : '-'}
               </span>
             </div>
          </div>
          
          {/* Card 2 */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700 shadow-lg flex flex-col justify-center h-full border-l-4 border-l-orange-500">
             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Categories Sold</p>
             <div className="flex justify-between items-end">
               <span className="text-3xl font-black text-white leading-none">{categoryData.length}</span>
             </div>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700 shadow-lg flex flex-col justify-center h-full border-l-4 border-l-orange-500">
             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Top Tier Products</p>
             <div className="flex justify-between items-end">
               <span className="text-3xl font-black text-white leading-none">{topProducts.length}</span>
               <div className="text-right">
                  <p className="text-xs text-gray-400 mb-1 font-bold">Total volume</p>
                  <span className="text-xl font-black text-amber-400">
                    {formatNumber(topProducts.reduce((acc, curr) => acc + curr.units, 0))}
                  </span>
               </div>
             </div>
          </div>
        </div>

      </div>

      {/* Modal for All Categories */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
              <h3 className="text-2xl font-black text-white tracking-wide">All Categories</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-800">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-6 custom-scrollbar">
              {categoryData.map((category, idx) => {
                const widthPct = (category.sales / maxCategorySales) * 100;
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-base mb-2">
                    <span className="font-bold text-gray-300">{category.name}</span>
                    <span className="font-black text-white">{formatCurrency(category.sales)}</span>
                    </div>
                    <div className="w-full bg-slate-800 border border-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-cyan-400" 
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