
import React, { useState, useEffect } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../lib/axios';
import ReturnModal from './ReturnModal';

const SalesHistory = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);

  const fetchSales = () => {
    setLoading(true);
    axiosInstance.get('/pos/sales')
      .then(res => {
        setSales(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSales();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/pos" className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold">Sales History</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Items</th>
              <th className="p-4">Total</th>
              <th className="p-4">Payment</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-4 text-center">Loading...</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan="7" className="p-4 text-center text-gray-500">No sales found</td></tr>
            ) : (
              sales.map(sale => (
                <tr key={sale._id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{new Date(sale.createdAt).toLocaleString()}</td>
                  <td className="p-4">{sale.customerId?.name || 'Guest'}</td>
                  <td className="p-4">{sale.items.length} items</td>
                  <td className="p-4 font-bold">Rs. {sale.totalAmount.toFixed(2)}</td>
                  <td className="p-4">{sale.paymentMethod}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${sale.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {sale.status}
                    </span>
                    {sale.refundedAmount > 0 && (
                        <div className="text-xs text-red-500 mt-1">
                            Refunded: Rs. {sale.refundedAmount.toFixed(2)}
                        </div>
                    )}
                  </td>
                  <td className="p-4">
                    {sale.status !== 'returned' && (
                        <button
                            onClick={() => setSelectedSale(sale)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-sm font-medium transition"
                        >
                            <RotateCcw size={16} /> Return
                        </button>
                    )}
                    {sale.status === 'returned' && (
                         <span className="text-xs text-gray-400">Fully Returned</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedSale && (
          <ReturnModal
             sale={selectedSale}
             onClose={() => setSelectedSale(null)}
             onSuccess={() => {
                 setSelectedSale(null);
                 fetchSales();
             }}
          />
      )}
    </div>
  );
};

export default SalesHistory;
