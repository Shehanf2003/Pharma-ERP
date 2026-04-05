import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ProfitOptimizer = () => {
  const [formData, setFormData] = useState({
    target_net_profit: '',
    current_monthly_expenses: '',
    utility_costs: 0,
    innovator_brand_percentage: 0,
    lkr_devaluation_percent: 0,
    days_to_predict: 30,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value === '' ? '' : Number(value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    try {
      // Note: Adjust the port below if your FastAPI instance is running on a different one
      const response = await axios.get('http://localhost:8000/api/ml/optimize-profit', {
        params: formData,
      });
      setResult(response.data);
      toast.success('Optimization analysis completed successfully.');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to analyze profit optimization.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Profit Optimization & AI Prescriptions</h2>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Target Net Profit (LKR)</label>
          <input type="number" name="target_net_profit" required value={formData.target_net_profit} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Current Monthly Expenses (LKR)</label>
          <input type="number" name="current_monthly_expenses" required value={formData.current_monthly_expenses} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Utility Costs (LKR)</label>
          <input type="number" name="utility_costs" value={formData.utility_costs} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Innovator Brand %</label>
          <input type="number" name="innovator_brand_percentage" step="0.1" value={formData.innovator_brand_percentage} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">LKR Devaluation %</label>
          <input type="number" name="lkr_devaluation_percent" step="0.1" value={formData.lkr_devaluation_percent} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Days to Predict</label>
          <input type="number" name="days_to_predict" value={formData.days_to_predict} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border" />
        </div>
        <div className="md:col-span-2 lg:col-span-3 flex justify-end mt-2">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 transition disabled:bg-blue-300">
            {loading ? 'Running Optimizer...' : 'Run Optimization AI'}
          </button>
        </div>
      </form>

      {result && (
        <div className="border-t pt-6 mt-4">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Optimization Results ({result.periodDays} Days Forecast)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <p className="text-sm text-gray-500 font-medium">Forecasted Gross Profit</p>
              <p className="text-2xl font-bold text-gray-800">Rs. {result.financials.forecastedGrossProfit.toLocaleString()}</p>
            </div>
            <div className={`p-4 rounded border ${result.isAchievable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-sm text-gray-500 font-medium">Target Allowed Expenses</p>
              <p className={`text-2xl font-bold ${result.isAchievable ? 'text-green-700' : 'text-red-700'}`}>
                Rs. {result.financials.targetAllowedExpenses.toLocaleString()}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <p className="text-sm text-yellow-700 font-medium">Expense Reduction Needed</p>
              <p className="text-2xl font-bold text-yellow-800">Rs. {result.financials.reductionNeeded.toLocaleString()}</p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-2 text-gray-800">Prescribed Action Plan</h4>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              {result.actionPlan.map((action, idx) => (
                <li key={idx} className={idx === 0 && action.includes('Optimal Action Plan') ? 'font-semibold text-blue-700 mb-2 list-none -ml-5' : ''}>
                  {action}
                </li>
              ))}
            </ul>
          </div>

          {result.activeAlerts?.map((alert, idx) => (
            <div key={idx} className="bg-red-50 border-l-4 border-red-500 p-4 rounded mt-4">
              <p className="font-bold text-red-700">{alert.type}</p>
              <p className="text-sm text-red-600 mt-1">{alert.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfitOptimizer;