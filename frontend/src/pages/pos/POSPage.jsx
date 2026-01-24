import React, { useState, useEffect, useMemo } from 'react';
import { Search, ShoppingCart, Trash2, Wifi, WifiOff, User, FileText, History, RefreshCw } from 'lucide-react';
import { cacheProducts, getCachedProducts, savePendingSale, getPendingSales, removePendingSale } from '../../lib/offlineDb';
import { Link } from 'react-router-dom';
import axiosInstance from '../../lib/axios';

const POSPage = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPrescription, setShowPrescription] = useState(false);

  // Checkout State
  const [customer, setCustomer] = useState(null); // { _id, name, ... }
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');

  // Prescription State
  const [prescriptionData, setPrescriptionData] = useState({
    patientName: '',
    doctorName: '',
    doctorRegNo: '',
    notes: ''
  });

  // Pending Sales Sync Status
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initial Data Load & Auto-Sync
  useEffect(() => {
    loadProducts();
    updatePendingCount();
    if (!isOffline && pendingCount > 0) {
        syncPendingSales();
    }
  }, [isOffline]);

  const loadProducts = async () => {
    if (!isOffline) {
      try {
        const res = await axiosInstance.get('/pos/products');
        setProducts(res.data);
        cacheProducts(res.data);
      } catch (err) {
        console.error("Failed to fetch products", err);
        // Fallback to cache if fetch fails
        const cached = await getCachedProducts();
        setProducts(cached);
      }
    } else {
      const cached = await getCachedProducts();
      setProducts(cached);
    }
  };

  const updatePendingCount = async () => {
    const sales = await getPendingSales();
    setPendingCount(sales.length);
  };

  const syncPendingSales = async () => {
    if (syncing) return;
    setSyncing(true);
    const sales = await getPendingSales();
    if (sales.length === 0) {
        setSyncing(false);
        return;
    }

    let synced = 0;
    for (const sale of sales) {
        try {
            const { id, timestamp, ...saleData } = sale; // Remove IDB specific fields
            await axiosInstance.post('/pos/sales', saleData);
            await removePendingSale(id);
            synced++;
        } catch (e) {
            console.error("Sync failed for sale", sale.id, e);
        }
    }
    await updatePendingCount();
    if (synced > 0) alert(`Synced ${synced} sales.`);
    setSyncing(false);
    // Refresh products after sync to get updated stock
    loadProducts();
  };

  // Product Search Logic
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.genericName?.toLowerCase().includes(term) ||
      p.batches.some(b => b.batchNumber.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  const addToCart = (product, batch) => {
    setCart(prev => {
      const existing = prev.find(item => item.batchId === batch._id);
      if (existing) {
        if (existing.quantity + 1 > batch.quantity) {
          alert("Insufficient stock!");
          return prev;
        }
        return prev.map(item => item.batchId === batch._id ? { ...item, quantity: item.quantity + 1 } : item);
      } else {
        return [...prev, {
          productId: product._id,
          batchId: batch._id,
          name: product.name,
          batchNumber: batch.batchNumber,
          price: batch.mrp, // Using MRP as price
          quantity: 1,
          maxQuantity: batch.quantity
        }];
      }
    });
  };

  const removeFromCart = (batchId) => {
    setCart(prev => prev.filter(item => item.batchId !== batchId));
  };

  const updateQuantity = (batchId, newQty) => {
    setCart(prev => prev.map(item => {
        if (item.batchId === batchId) {
            const qty = Math.max(1, Math.min(newQty, item.maxQuantity));
            return { ...item, quantity: qty };
        }
        return item;
    }));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckoutSubmit = async () => {
    const saleData = {
      items: cart.map(item => ({
        productId: item.productId,
        batchId: item.batchId,
        quantity: item.quantity,
        price: item.price
      })),
      paymentMethod,
      customerId: customer?._id,
      // prescriptionId handled if integrated, simplistic for now
    };

    if (!isOffline) {
      try {
        await axiosInstance.post('/pos/sales', saleData);
        alert("Sale completed!");
        setCart([]);
        setShowCheckout(false);
        loadProducts(); // Update stock
      } catch (e) {
        console.error(e);
        // Axios error handling
        if (e.response && e.response.data) {
             alert(`Error: ${e.response.data.message}`);
             return;
        }
        alert("Network error. Saving offline.");
        await savePendingSale(saleData);
        setCart([]);
        setShowCheckout(false);
        updatePendingCount();
      }
    } else {
      await savePendingSale(saleData);
      alert("Offline mode: Sale saved locally.");
      setCart([]);
      setShowCheckout(false);
      updatePendingCount();
    }
  };

  const searchCustomers = async (term) => {
    if (isOffline) return; // Customer search only online for now
    try {
        const res = await axiosInstance.get(`/pos/customers?search=${term}`);
        setCustomers(res.data);
    } catch(e) { console.error(e); }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white p-4 shadow flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
           POS Terminal
           {isOffline ? <WifiOff className="text-red-500" /> : <Wifi className="text-green-500" />}
        </h1>
        <div className="flex gap-4 items-center">
           {pendingCount > 0 && (
               <button onClick={syncPendingSales} className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded hover:bg-yellow-200">
                   <RefreshCw size={16} /> Sync {pendingCount} Pending Sales
               </button>
           )}
           <Link to="/pos/history" className="flex items-center gap-2 text-gray-600 hover:text-blue-600">
               <History size={20} /> History
           </Link>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Product Search */}
        <div className="w-2/3 p-4 flex flex-col gap-4">
          <div className="relative">
             <Search className="absolute left-3 top-3 text-gray-400" />
             <input
               type="text"
               className="w-full pl-10 pr-4 py-2 border rounded-lg"
               placeholder="Search products by name, generic name, or batch..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
             {filteredProducts.map(product => (
                 product.batches.map(batch => (
                     <div key={batch._id}
                          className="bg-white p-4 rounded-lg shadow hover:shadow-md cursor-pointer border-l-4 border-blue-500"
                          onClick={() => addToCart(product, batch)}>
                         <h3 className="font-bold text-lg">{product.name}</h3>
                         <p className="text-sm text-gray-500">{product.genericName}</p>
                         <div className="mt-2 flex justify-between items-end">
                            <div>
                                <p className="text-xs text-gray-400">Batch: {batch.batchNumber}</p>
                                <p className="text-xs text-red-400">Exp: {new Date(batch.expiryDate).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-xl">Rs. {batch.mrp}</p>
                                <p className="text-xs text-gray-500">{batch.quantity} in stock</p>
                            </div>
                         </div>
                     </div>
                 ))
             ))}
             {searchTerm && filteredProducts.length === 0 && (
                 <div className="col-span-full text-center text-gray-500 mt-10">No products found</div>
             )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-1/3 bg-white border-l flex flex-col">
            <div className="p-4 border-b bg-gray-50">
                <h2 className="font-bold text-lg flex items-center gap-2">
                    <ShoppingCart /> Current Sale
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {cart.map(item => (
                    <div key={item.batchId} className="flex justify-between items-center border-b pb-2">
                        <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-xs text-gray-500">{item.batchNumber}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                              type="number"
                              className="w-16 border rounded px-1 text-center"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.batchId, parseInt(e.target.value) || 1)}
                            />
                            <p className="w-20 text-right font-medium">{(item.price * item.quantity).toFixed(2)}</p>
                            <button onClick={() => removeFromCart(item.batchId)} className="text-red-500 hover:text-red-700">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
                {cart.length === 0 && <p className="text-center text-gray-400 mt-10">Cart is empty</p>}
            </div>

            <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between text-xl font-bold mb-4">
                    <span>Total</span>
                    <span>Rs. {totalAmount.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => setShowCheckout(true)}
                  disabled={cart.length === 0}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-300">
                  Proceed to Checkout
                </button>
            </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Checkout</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Customer (Optional)</label>
                    <div className="flex gap-2">
                        <input
                           type="text"
                           className="flex-1 border rounded p-2"
                           placeholder="Search Customer..."
                           value={customerSearch}
                           onChange={(e) => {
                               setCustomerSearch(e.target.value);
                               searchCustomers(e.target.value);
                           }}
                        />
                    </div>
                    {customers.length > 0 && customerSearch && !customer && (
                        <div className="border rounded mt-1 max-h-32 overflow-y-auto">
                            {customers.map(c => (
                                <div key={c._id}
                                     className="p-2 hover:bg-gray-100 cursor-pointer"
                                     onClick={() => {
                                         setCustomer(c);
                                         setCustomerSearch('');
                                         setCustomers([]);
                                     }}>
                                    {c.name} ({c.phoneNumber})
                                </div>
                            ))}
                        </div>
                    )}
                    {customer && (
                        <div className="bg-blue-50 p-2 rounded mt-2 flex justify-between items-center">
                            <span>{customer.name}</span>
                            <button onClick={() => setCustomer(null)} className="text-red-500 text-sm">Remove</button>
                        </div>
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Payment Method</label>
                    <select
                      className="w-full border rounded p-2"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}>
                        <option>Cash</option>
                        <option>Card</option>
                        <option>Online</option>
                    </select>
                </div>

                <div className="flex justify-between items-center mt-6">
                    <span className="text-xl font-bold">Total: Rs. {totalAmount.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="border py-2 rounded hover:bg-gray-100">
                      Cancel
                    </button>
                    <button
                      onClick={handleCheckoutSubmit}
                      className="bg-green-600 text-white py-2 rounded hover:bg-green-700">
                      Confirm Sale
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default POSPage;
