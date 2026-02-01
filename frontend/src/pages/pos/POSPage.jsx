import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, ShoppingCart, Trash2, Wifi, WifiOff,
  History, RefreshCw, Scan, Keyboard, Plus, Minus, X
} from 'lucide-react';
import { cacheProducts, getCachedProducts, savePendingSale, getPendingSales, removePendingSale } from '../../lib/offlineDb';
import { Link } from 'react-router-dom';
import axiosInstance from '../../lib/axios';
import ScannerModal from '../../components/ScannerModal';
import toast from 'react-hot-toast';

const POSPage = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // UI State
  const [showCheckout, setShowCheckout] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Checkout State
  const [customer, setCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Pending Sales Sync Status
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const searchInputRef = useRef(null);

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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.key === 'F2') {
            e.preventDefault();
            setIsScannerOpen(prev => !prev);
        }
        if (e.key === 'F12') {
            e.preventDefault();
            if (cart.length > 0) setShowCheckout(true);
        }
        if (e.key === 'Escape') {
            if (isScannerOpen) setIsScannerOpen(false);
            if (showCheckout) setShowCheckout(false);
            if (searchTerm) setSearchTerm('');
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, isScannerOpen, showCheckout, searchTerm]);

  // Initial Data Load & Auto-Sync
  useEffect(() => {
    loadProducts();
    updatePendingCount();
    if (!isOffline && pendingCount > 0) {
        syncPendingSales();
    }
  }, [isOffline]);

  const loadProducts = async () => {
    try {
      if (!isOffline) {
        const res = await axiosInstance.get('/pos/products');
        setProducts(res.data);
        cacheProducts(res.data);
      } else {
        const cached = await getCachedProducts();
        setProducts(cached);
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
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
    const syncToast = toast.loading('Syncing offline sales...');

    for (const sale of sales) {
        try {
            const { id, timestamp, ...saleData } = sale;
            await axiosInstance.post('/pos/sales', saleData);
            await removePendingSale(id);
            synced++;
        } catch (e) {
            console.error("Sync failed for sale", sale.id, e);
        }
    }
    await updatePendingCount();
    toast.dismiss(syncToast);
    if (synced > 0) toast.success(`Synced ${synced} sales.`);
    setSyncing(false);
    loadProducts();
  };

  // Product Search Logic
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.genericName?.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.toLowerCase().includes(term)) ||
      p.batches.some(b => b.batchNumber.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  const handleScan = (code) => {
    if (!code) return;
    // 1. Try matching Product Barcode
    const productByBarcode = products.find(p => p.barcode === code);
    if (productByBarcode) {
         // Auto-select first active batch
         const batch = productByBarcode.batches[0];
         if (batch) {
            addToCart(productByBarcode, batch);
            setIsScannerOpen(false);
            return;
         }
    }

    // 2. Try matching Batch Number
    for (const p of products) {
        const batch = p.batches.find(b => b.batchNumber === code);
        if (batch) {
            addToCart(p, batch);
            setIsScannerOpen(false);
            return;
        }
    }

    toast.error(`Product not found: ${code}`);
  };

  const addToCart = (product, batch) => {
    setCart(prev => {
      const existing = prev.find(item => item.batchId === batch._id);
      if (existing) {
        if (existing.quantity + 1 > batch.quantity) {
          toast.error("Insufficient stock!");
          return prev;
        }
        toast.success(`Added +1 ${product.name}`);
        return prev.map(item => item.batchId === batch._id ? { ...item, quantity: item.quantity + 1 } : item);
      } else {
        toast.success(`Added ${product.name}`);
        return [...prev, {
          productId: product._id,
          batchId: batch._id,
          name: product.name,
          batchNumber: batch.batchNumber,
          price: batch.mrp,
          quantity: 1,
          maxQuantity: batch.quantity
        }];
      }
    });
  };

  const removeFromCart = (batchId) => {
    setCart(prev => prev.filter(item => item.batchId !== batchId));
    toast('Item removed', { icon: '🗑️' });
  };

  const updateQuantity = (batchId, delta) => {
    setCart(prev => prev.map(item => {
        if (item.batchId === batchId) {
            const newQty = item.quantity + delta;
            if (newQty < 1) return item;
            if (newQty > item.maxQuantity) {
                toast.error("Max stock reached");
                return item;
            }
            return { ...item, quantity: newQty };
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
    };

    const loadingToast = toast.loading('Processing Sale...');

    try {
        if (!isOffline) {
            await axiosInstance.post('/pos/sales', saleData);
            toast.dismiss(loadingToast);
            toast.success("Sale completed successfully!");
            setCart([]);
            setShowCheckout(false);
            setCustomer(null);
            loadProducts();
        } else {
             throw new Error("Offline");
        }
    } catch (e) {
        toast.dismiss(loadingToast);
        if (e.message === "Offline" || !e.response) {
             await savePendingSale(saleData);
             toast.success("Offline: Sale saved locally");
             setCart([]);
             setShowCheckout(false);
             setCustomer(null);
             updatePendingCount();
        } else {
             toast.error(e.response?.data?.message || "Sale failed");
        }
    }
  };

  const searchCustomers = async (term) => {
    if (isOffline) return;
    try {
        const res = await axiosInstance.get(`/pos/customers?search=${term}`);
        setCustomers(res.data);
    } catch(e) { console.error(e); }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="bg-slate-800 text-white p-3 shadow-md flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
                POS Terminal
                {isOffline ? <WifiOff className="text-red-400" size={20} /> : <Wifi className="text-emerald-400" size={20} />}
            </h1>
            <div className="hidden md:flex gap-2 text-xs text-slate-400">
                <span className="bg-slate-700 px-2 py-1 rounded flex items-center gap-1"><Keyboard size={12}/> F2: Scan</span>
                <span className="bg-slate-700 px-2 py-1 rounded flex items-center gap-1"><Keyboard size={12}/> F12: Pay</span>
            </div>
        </div>

        <div className="flex gap-3 items-center">
           {pendingCount > 0 && (
               <button onClick={syncPendingSales} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors">
                   <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                   Sync {pendingCount}
               </button>
           )}
           <Link to="/pos/history" className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-sm transition-colors">
               <History size={18} /> History
           </Link>
           <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center font-bold">
              U
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT PANEL: Products & Search */}
        <div className="flex-[2] flex flex-col p-4 gap-4 overflow-hidden">
          {/* Search Bar */}
          <div className="flex gap-2 shrink-0">
             <div className="relative flex-1">
                 <Search className="absolute left-3 top-3 text-slate-400" />
                 <input
                   ref={searchInputRef}
                   type="text"
                   className="w-full pl-10 pr-10 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm text-lg"
                   placeholder="Search (Name, Generic, Batch)..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
                 {searchTerm && (
                     <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                         <X size={20} />
                     </button>
                 )}
             </div>
             <button
                onClick={() => setIsScannerOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-lg flex items-center gap-2 font-medium shadow-sm active:scale-95 transition-transform"
             >
                <Scan size={20} /> Scan
             </button>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 content-start pb-20">
                 {filteredProducts.map(product => (
                     product.batches.map(batch => (
                         <div key={batch._id}
                              onClick={() => addToCart(product, batch)}
                              className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 cursor-pointer hover:shadow-md hover:border-emerald-400 transition-all active:scale-95 select-none flex flex-col justify-between h-40 relative overflow-hidden group">

                             <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>

                             <div>
                                 <h3 className="font-bold text-slate-800 leading-tight line-clamp-2">{product.name}</h3>
                                 <p className="text-xs text-slate-500 mt-1 line-clamp-1">{product.genericName}</p>
                             </div>

                             <div className="flex justify-between items-end mt-2">
                                <div>
                                    <span className="inline-block bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded">
                                        {batch.batchNumber}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-emerald-700 font-bold text-lg">Rs. {batch.mrp}</div>
                                    <div className={`text-xs ${batch.quantity < 10 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                        {batch.quantity} Left
                                    </div>
                                </div>
                             </div>
                         </div>
                     ))
                 ))}
                 {filteredProducts.length === 0 && (
                     <div className="col-span-full flex flex-col items-center justify-center text-slate-400 mt-20">
                         <Search size={48} className="mb-4 opacity-50" />
                         <p>No products found</p>
                     </div>
                 )}
             </div>
          </div>
        </div>

        {/* RIGHT PANEL: Cart */}
        <div className="flex-1 bg-white border-l border-slate-200 flex flex-col shadow-xl z-10 max-w-md w-full">
            {/* Cart Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                <h2 className="font-bold text-lg flex items-center gap-2 text-slate-700">
                    <ShoppingCart size={20} /> Current Sale
                </h2>
                <div className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                    {cart.reduce((a, b) => a + b.quantity, 0)} Items
                </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50">
                {cart.map(item => (
                    <div key={item.batchId} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-800 truncate">{item.name}</h4>
                            <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                                <span>{item.batchNumber}</span>
                                <span>Rs. {item.price}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                             <div className="flex items-center border rounded-lg overflow-hidden border-slate-200">
                                 <button
                                    onClick={() => updateQuantity(item.batchId, -1)}
                                    className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 transition-colors"
                                 >
                                     <Minus size={14} />
                                 </button>
                                 <div className="w-8 h-8 flex items-center justify-center font-bold text-sm bg-white">
                                     {item.quantity}
                                 </div>
                                 <button
                                    onClick={() => updateQuantity(item.batchId, 1)}
                                    className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 transition-colors"
                                 >
                                     <Plus size={14} />
                                 </button>
                             </div>
                             <div className="w-16 text-right font-bold text-slate-700">
                                 {(item.price * item.quantity).toFixed(0)}
                             </div>
                             <button
                                onClick={() => removeFromCart(item.batchId)}
                                className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                             >
                                 <Trash2 size={16} />
                             </button>
                        </div>
                    </div>
                ))}
                {cart.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                        <ShoppingCart size={48} className="opacity-20" />
                        <p>Cart is empty</p>
                    </div>
                )}
            </div>

            {/* Cart Footer */}
            <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0">
                <div className="flex justify-between items-end mb-4">
                    <span className="text-slate-500 font-medium">Total Amount</span>
                    <span className="text-3xl font-extrabold text-slate-800">
                        <span className="text-lg text-slate-500 font-normal mr-1">Rs.</span>
                        {totalAmount.toFixed(2)}
                    </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <button
                        disabled={cart.length === 0}
                        onClick={() => setCart([])}
                        className="col-span-1 bg-red-100 text-red-600 font-bold rounded-lg flex items-center justify-center hover:bg-red-200 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none h-12"
                    >
                        <Trash2 size={20} />
                    </button>
                    <button
                      onClick={() => setShowCheckout(true)}
                      disabled={cart.length === 0}
                      className="col-span-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none h-12 flex items-center justify-center gap-2 text-lg"
                    >
                      Checkout <span className="text-emerald-200 text-sm font-normal">(F12)</span>
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* MODALS */}
      {isScannerOpen && (
          <ScannerModal onClose={() => setIsScannerOpen(false)} onScan={handleScan} />
      )}

      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">Checkout</h2>
                    <button onClick={() => setShowCheckout(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Customer Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Customer</label>
                        {!customer ? (
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                   type="text"
                                   className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                   placeholder="Search by Name or Phone..."
                                   value={customerSearch}
                                   onChange={(e) => {
                                       setCustomerSearch(e.target.value);
                                       searchCustomers(e.target.value);
                                   }}
                                />
                                {customers.length > 0 && customerSearch && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                                        {customers.map(c => (
                                            <div key={c._id}
                                                 className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                                                 onClick={() => {
                                                     setCustomer(c);
                                                     setCustomerSearch('');
                                                     setCustomers([]);
                                                 }}>
                                                <div className="font-bold text-slate-700">{c.name}</div>
                                                <div className="text-xs text-slate-500">{c.phoneNumber}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-blue-800">{customer.name}</div>
                                    <div className="text-xs text-blue-600">{customer.phoneNumber}</div>
                                </div>
                                <button onClick={() => setCustomer(null)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded">
                                    <X size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Payment Method */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['Cash', 'Card', 'Online'].map(method => (
                                <button
                                    key={method}
                                    onClick={() => setPaymentMethod(method)}
                                    className={`py-3 rounded-lg font-bold border transition-all ${
                                        paymentMethod === method
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-slate-500">Items Count</span>
                            <span className="font-medium text-slate-800">{cart.reduce((a,b)=>a+b.quantity,0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xl font-bold mt-2 pt-2 border-t border-slate-200">
                            <span className="text-slate-800">Total To Pay</span>
                            <span className="text-emerald-700">Rs. {totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 grid grid-cols-2 gap-4 bg-slate-50">
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="py-3 rounded-xl font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCheckoutSubmit}
                      className="py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all active:scale-95"
                    >
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