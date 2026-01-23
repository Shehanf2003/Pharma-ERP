import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Search, ShoppingCart, Trash2, Plus, User, FileText, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { saveOfflineSale } from '../../services/offlineStorage';
import { syncOfflineSales } from '../../services/syncManager';

// --- Components (Inline for simplicity, should be split in real app) ---

const ProductSearch = ({ onAdd }) => {
  const [search, setSearch] = useState('');
  // Cache API response for offline use
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await axios.get('/api/inventory/products');
      return res.data; // Assuming this returns list with batches populated
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });

  const filtered = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.includes(search)
  ) || [];

  return (
    <div className="bg-white p-4 rounded-lg shadow h-full flex flex-col">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Scan barcode or search name..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.map(product => (
          <div key={product._id} className="border p-3 rounded hover:bg-gray-50 cursor-pointer" onClick={() => onAdd(product)}>
            <div className="font-medium">{product.name}</div>
            <div className="text-sm text-gray-500">Stock: {product.batches?.reduce((sum, b) => sum + b.quantity, 0) || 0}</div>
            <div className="text-xs text-gray-400">{product.genericName}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Cart = ({ items, onRemove, onUpdateQty, onCheckout }) => {
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="bg-white p-4 rounded-lg shadow h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <ShoppingCart /> Current Sale
      </h2>
      <div className="flex-1 overflow-y-auto space-y-3">
        {items.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">Cart is empty</div>
        ) : (
          items.map((item, idx) => (
            <div key={`${item.batch}-${idx}`} className="flex items-center justify-between border-b pb-2">
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-gray-500">Batch: {item.batchNumber} | Exp: {new Date(item.expiryDate).toLocaleDateString()}</div>
                <div className="font-bold text-blue-600">Rs. {item.price}</div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  className="w-16 border rounded p-1 text-center"
                  value={item.quantity}
                  onChange={(e) => onUpdateQty(idx, parseInt(e.target.value))}
                />
                <button onClick={() => onRemove(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between text-2xl font-bold mb-4">
          <span>Total:</span>
          <span>Rs. {total.toFixed(2)}</span>
        </div>
        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full bg-green-600 text-white py-3 rounded-lg text-lg font-bold hover:bg-green-700 disabled:bg-gray-300"
        >
          Proceed to Pay
        </button>
      </div>
    </div>
  );
};

const CheckoutModal = ({ isOpen, onClose, total, onConfirm }) => {
  const [method, setMethod] = useState('CASH');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isGuest, setIsGuest] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-[400px]">
        <h3 className="text-xl font-bold mb-4">Checkout</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Customer</label>
          <div className="flex gap-2 mb-2">
            <button
              className={`flex-1 py-1 rounded border ${isGuest ? 'bg-blue-50 border-blue-500 text-blue-700' : ''}`}
              onClick={() => setIsGuest(true)}
            >
              Guest
            </button>
            <button
              className={`flex-1 py-1 rounded border ${!isGuest ? 'bg-blue-50 border-blue-500 text-blue-700' : ''}`}
              onClick={() => setIsGuest(false)}
            >
              Registered
            </button>
          </div>
          {!isGuest && (
            <input
              type="text"
              placeholder="Search Phone..."
              className="w-full border p-2 rounded"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
            />
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Payment Method</label>
          <select className="w-full border p-2 rounded" value={method} onChange={e => setMethod(e.target.value)}>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="ONLINE">Online Transfer</option>
          </select>
        </div>

        <div className="text-right text-2xl font-bold mb-6">Rs. {total.toFixed(2)}</div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border rounded text-gray-600">Cancel</button>
          <button
            onClick={() => onConfirm({ method, isGuest, customerPhone })}
            className="flex-1 py-2 bg-blue-600 text-white rounded font-bold"
          >
            Confirm Sale
          </button>
        </div>
      </div>
    </div>
  );
};

export default function POSDashboard() {
  const [cart, setCart] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) syncOfflineSales();
    };
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    // Try syncing on mount
    syncOfflineSales();
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const addToCart = (product) => {
    // Logic to select batch (auto-select oldest valid batch usually)
    // For simplicity, taking the first batch with stock
    const batch = product.batches?.find(b => b.quantity > 0);

    if (!batch) {
      toast.error('Out of stock!');
      return;
    }

    setCart(prev => [...prev, {
      product: product._id,
      name: product.name,
      batch: batch._id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      price: batch.price, // MRP
      quantity: 1
    }]);
  };

  const updateQty = (idx, qty) => {
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, quantity: qty } : item));
  };

  const removeFromCart = (idx) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCheckout = async ({ method, isGuest, customerPhone }) => {
    const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const payload = {
      items: cart.map(i => ({
        product: i.product,
        batch: i.batch,
        quantity: i.quantity,
        price: i.price,
        discount: 0
      })),
      payments: [{ method, amount: total }],
      isGuest,
      // In real app, resolve customer ID from phone
      customer: isGuest ? null : null
    };

    if (navigator.onLine) {
      try {
        await axios.post('/api/pos/sales', payload);
        toast.success('Sale Completed!');
        setCart([]);
        setIsCheckoutOpen(false);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Sale Failed');
      }
    } else {
      // Offline Mode
      await saveOfflineSale(payload);
      toast.success('Offline: Sale Saved locally');
      setCart([]);
      setIsCheckoutOpen(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] p-4 gap-4 bg-gray-100">
      <div className="w-2/3">
        <ProductSearch onAdd={addToCart} />
      </div>
      <div className="w-1/3">
        <Cart
          items={cart}
          onUpdateQty={updateQty}
          onRemove={removeFromCart}
          onCheckout={() => setIsCheckoutOpen(true)}
        />
      </div>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={cart.reduce((sum, i) => sum + (i.price * i.quantity), 0)}
        onConfirm={handleCheckout}
      />
    </div>
  );
}
