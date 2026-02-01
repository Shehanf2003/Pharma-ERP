import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import axiosInstance from '../../lib/axios';
import toast from 'react-hot-toast';

const ReturnModal = ({ sale, onClose, onSuccess }) => {
  // Initialize items state
  const [returnItems, setReturnItems] = useState(
    sale.items.map(item => {
        const soldQty = item.quantity;
        const returnedSoFar = item.returnedQuantity || 0;
        const maxQty = soldQty - returnedSoFar;

        return {
            batchId: item.batchId,
            productId: item.productId?._id,
            maxQty: maxQty,
            returnQty: 0,
            name: item.productId?.name || 'Unknown Product',
            price: item.price,
            discount: item.discount,
            soldQty: soldQty,
            returnedSoFar: returnedSoFar
        };
    })
  );

  const [loading, setLoading] = useState(false);

  const handleQtyChange = (batchId, val) => {
    setReturnItems(prev => prev.map(item => {
        if (item.batchId === batchId) {
            let qty = parseInt(val) || 0;
            if (qty < 0) qty = 0;
            if (qty > item.maxQty) qty = item.maxQty;
            return { ...item, returnQty: qty };
        }
        return item;
    }));
  };

  const calculateTotalRefund = () => {
    return returnItems.reduce((acc, item) => {
        if (item.returnQty > 0) {
            // Effective Unit Price = (Price * SoldQty - TotalDiscount) / SoldQty
            const effectiveUnitPrice = ((item.price * item.soldQty) - item.discount) / item.soldQty;
            return acc + (effectiveUnitPrice * item.returnQty);
        }
        return acc;
    }, 0);
  };

  const handleSubmit = async () => {
      const itemsToReturn = returnItems
          .filter(i => i.returnQty > 0)
          .map(i => ({ batchId: i.batchId, quantity: i.returnQty }));

      if (itemsToReturn.length === 0) {
          toast.error("Please select at least one item to return.");
          return;
      }

      setLoading(true);
      try {
          await axiosInstance.post(`/pos/sales/${sale._id}/return`, { items: itemsToReturn });
          toast.success("Return processed successfully");
          onSuccess();
          onClose();
      } catch (error) {
          console.error(error);
          toast.error(error.response?.data?.message || "Failed to process return");
      } finally {
          setLoading(false);
      }
  };

  const refundAmount = calculateTotalRefund();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
           <div>
               <h3 className="text-xl font-bold text-gray-800">Process Return</h3>
               <p className="text-sm text-gray-500">Receipt: <span className="font-mono text-gray-700">{sale.receiptNumber}</span></p>
           </div>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition">
               <X size={24} />
           </button>
        </div>

        <div className="p-6 overflow-y-auto">
            {sale.status === 'returned' && (
                <div className="mb-4 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertTriangle size={20} />
                    <span>This sale is marked as fully returned.</span>
                </div>
            )}

            <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                <thead className="text-gray-500 font-medium">
                    <tr>
                        <th className="px-2 pb-2">Product</th>
                        <th className="px-2 pb-2 text-center">Sold</th>
                        <th className="px-2 pb-2 text-center">Returned</th>
                        <th className="px-2 pb-2 text-center">Available</th>
                        <th className="px-2 pb-2 text-center">Return Qty</th>
                    </tr>
                </thead>
                <tbody>
                    {returnItems.map(item => (
                        <tr key={item.batchId} className="bg-gray-50/50 hover:bg-gray-50 transition-colors">
                            <td className="p-3 rounded-l-lg font-medium text-gray-800 border-y border-l border-gray-100">{item.name}</td>
                            <td className="p-3 text-center text-gray-500 border-y border-gray-100">
                                {item.soldQty}
                            </td>
                            <td className="p-3 text-center text-gray-500 border-y border-gray-100">
                                {item.returnedSoFar}
                            </td>
                            <td className="p-3 text-center font-bold text-gray-700 border-y border-gray-100">
                                {item.maxQty}
                            </td>
                            <td className="p-3 rounded-r-lg text-center border-y border-r border-gray-100">
                                <input
                                    type="number"
                                    min="0"
                                    max={item.maxQty}
                                    value={item.returnQty}
                                    disabled={item.maxQty === 0}
                                    onChange={(e) => handleQtyChange(item.batchId, e.target.value)}
                                    className="w-20 p-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400 transition-shadow"
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-6 flex flex-col items-end gap-2 p-4 bg-blue-50 rounded-xl border border-blue-100">
                 <div className="flex items-center gap-4">
                     <span className="text-blue-800 font-medium">Refund Amount:</span>
                     <span className="text-3xl font-bold text-blue-900">Rs. {refundAmount.toFixed(2)}</span>
                 </div>
                 <p className="text-xs text-blue-600">This amount should be refunded to the customer.</p>
            </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
             <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all"
             >
                Cancel
             </button>
             <button
                onClick={handleSubmit}
                disabled={loading || refundAmount <= 0}
                className="px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
             >
                {loading ? 'Processing...' : 'Confirm Return'}
             </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnModal;