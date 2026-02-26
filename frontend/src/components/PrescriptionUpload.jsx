import React, { useState, useMemo, useEffect } from 'react';
import { Upload, X, Check, Search, AlertCircle, Loader2, Plus, ArrowRight } from 'lucide-react';
import axiosInstance from '../lib/axios';
import toast from 'react-hot-toast';

const PrescriptionUpload = ({ onClose, onAddToCart, products }) => {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [step, setStep] = useState('upload'); // 'upload', 'review'
    const [extractedItems, setExtractedItems] = useState([]);
    const [matchedItems, setMatchedItems] = useState([]); // Array of { id, textName, selectedProduct, selectedBatch, dosage, quantity }

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await axiosInstance.post('/prescriptions/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const data = res.data;
            if (data.extractedData && data.extractedData.medications) {
                const items = data.extractedData.medications.map((med, index) => ({
                    id: index,
                    textName: med.name,
                    strength: med.strength,
                    suggestedQty: med.quantity,
                    suggestedFreq: med.frequency,
                    suggestedTiming: med.timing
                }));

                setExtractedItems(items);

                // Initialize matched items state
                setMatchedItems(items.map(item => ({
                    id: item.id,
                    textName: item.textName,
                    search: item.textName, // Default search to OCR text
                    selectedProduct: null,
                    selectedBatch: null,
                    quantity: item.suggestedQty || 1,
                    dosage: {
                        morning: item.suggestedFreq?.toLowerCase().includes('morning') || item.suggestedFreq?.toLowerCase().includes('twice') || item.suggestedFreq?.toLowerCase().includes('tds'),
                        noon: item.suggestedFreq?.toLowerCase().includes('noon') || item.suggestedFreq?.toLowerCase().includes('tds'),
                        night: item.suggestedFreq?.toLowerCase().includes('night') || item.suggestedFreq?.toLowerCase().includes('twice') || item.suggestedFreq?.toLowerCase().includes('tds'),
                        timing: item.suggestedTiming?.includes('After') ? 'After Meal' : (item.suggestedTiming?.includes('Before') ? 'Before Meal' : '')
                    }
                })));

                setStep('review');
            } else {
                toast.error("Could not extract data from prescription");
            }
        } catch (error) {
            console.error(error);
            toast.error("Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handleProductSelect = (index, product, batch) => {
        setMatchedItems(prev => prev.map((item, i) => {
            if (i === index) {
                return {
                    ...item,
                    selectedProduct: product,
                    selectedBatch: batch,
                    search: product.name // Update search text to match selection
                };
            }
            return item;
        }));
    };

    const handleDosageChange = (index, field, value) => {
        setMatchedItems(prev => prev.map((item, i) => {
            if (i === index) {
                return {
                    ...item,
                    dosage: { ...item.dosage, [field]: value }
                };
            }
            return item;
        }));
    };

    const handleQuantityChange = (index, val) => {
        setMatchedItems(prev => prev.map((item, i) => {
            if (i === index) {
                return { ...item, quantity: parseInt(val) || 1 };
            }
            return item;
        }));
    };

    const handleConfirm = () => {
        const validItems = matchedItems.filter(item => item.selectedProduct && item.selectedBatch);

        if (validItems.length === 0) {
            toast.error("Please match at least one medicine to a product in inventory");
            return;
        }

        validItems.forEach(item => {
            onAddToCart(item.selectedProduct, item.selectedBatch, item.quantity, item.dosage);
        });

        onClose();
        toast.success(`Added ${validItems.length} items to cart`);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {step === 'upload' ? 'Upload Prescription' : 'Review & Match Medicines'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex">
                    {/* Left: Image Preview */}
                    <div className={`${step === 'upload' ? 'w-full' : 'w-1/3'} bg-slate-900 flex items-center justify-center relative transition-all duration-500`}>
                        {previewUrl ? (
                            <img src={previewUrl} alt="Prescription" className="max-w-full max-h-full object-contain" />
                        ) : (
                            <div className="text-slate-500 flex flex-col items-center">
                                <Upload size={48} className="mb-4 opacity-50" />
                                <p>No image selected</p>
                            </div>
                        )}

                        {step === 'upload' && (
                             <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors cursor-pointer"
                                  onClick={() => document.getElementById('presc-upload').click()}>
                                 <input type="file" id="presc-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
                                 <div className="bg-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform">
                                     <Upload size={20} /> Select Image
                                 </div>
                             </div>
                        )}
                    </div>

                    {/* Right: Actions / Form */}
                    {step === 'upload' ? (
                        <div className="w-0 overflow-hidden"></div>
                    ) : (
                        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex items-start gap-2">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <p>AI has analyzed the prescription. Please verify the extracted medicines and match them with your inventory below.</p>
                                </div>

                                {matchedItems.map((item, index) => (
                                    <PrescriptionRow
                                        key={index}
                                        item={item}
                                        index={index}
                                        products={products}
                                        onProductSelect={handleProductSelect}
                                        onDosageChange={handleDosageChange}
                                        onQuantityChange={handleQuantityChange}
                                        onRemove={() => setMatchedItems(prev => prev.filter((_, i) => i !== index))}
                                    />
                                ))}

                                <button
                                    onClick={() => setMatchedItems([...matchedItems, {
                                        id: Date.now(),
                                        textName: '',
                                        search: '',
                                        selectedProduct: null,
                                        selectedBatch: null,
                                        quantity: 1,
                                        dosage: { morning: false, noon: false, night: false, timing: '' }
                                    }])}
                                    className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={20} /> Add Another Item
                                </button>
                            </div>

                            <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center">
                                <div className="text-sm text-slate-500">
                                    {matchedItems.filter(i => i.selectedProduct).length} items matched
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setStep('upload')} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">
                                        Back
                                    </button>
                                    <button onClick={handleConfirm} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center gap-2">
                                        Add to Cart <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer for Upload Step */}
                {step === 'upload' && previewUrl && (
                    <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
                         <button
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            {isUploading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                            {isUploading ? 'Processing...' : 'Analyze Prescription'}
                         </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const PrescriptionRow = ({ item, index, products, onProductSelect, onDosageChange, onQuantityChange, onRemove }) => {
    const [isSearching, setIsSearching] = useState(false);
    const [searchText, setSearchText] = useState(item.search);

    useEffect(() => {
        setSearchText(item.search || '');
    }, [item.search]);

    const filteredProducts = useMemo(() => {
        if (!searchText) return [];
        const term = searchText.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.genericName?.toLowerCase().includes(term)
        ).slice(0, 10); // Limit results
    }, [products, searchText]);

    return (
        <div className={`bg-white p-4 rounded-xl border-2 transition-all ${item.selectedProduct ? 'border-emerald-400 shadow-sm' : 'border-slate-100'}`}>
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Detected Text</div>
                    <div className="text-slate-800 font-medium">{item.textName || "New Item"} <span className="text-slate-400 text-sm">({item.strength})</span></div>
                </div>
                <button onClick={onRemove} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Match */}
                <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Matched Product</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            className={`w-full pl-9 pr-3 py-2 rounded-lg border focus:ring-2 outline-none text-sm ${item.selectedProduct ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
                            placeholder="Search inventory..."
                            value={searchText}
                            onChange={(e) => {
                                setSearchText(e.target.value);
                                setIsSearching(true);
                                if (!e.target.value) onProductSelect(index, null, null);
                            }}
                            onFocus={() => setIsSearching(true)}
                            onBlur={() => setTimeout(() => setIsSearching(false), 200)}
                        />
                    </div>

                    {isSearching && searchText && filteredProducts.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                            {filteredProducts.map(product => (
                                product.batches.map(batch => (
                                    <div key={batch._id}
                                         className="p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 text-sm"
                                         onClick={() => {
                                             onProductSelect(index, product, batch);
                                             setSearchText(product.name);
                                             setIsSearching(false);
                                         }}>
                                        <div className="font-bold text-slate-700">{product.name}</div>
                                        <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                                            <span>Batch: {batch.batchNumber}</span>
                                            <span className={batch.quantity < 10 ? 'text-red-500 font-bold' : 'text-emerald-600'}>{batch.quantity} left</span>
                                        </div>
                                    </div>
                                ))
                            ))}
                        </div>
                    )}
                </div>

                {/* Dosage & Quantity */}
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Dosage</label>
                        <div className="flex gap-1 items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                             {['Morning', 'Noon', 'Night'].map(t => (
                                 <label key={t} className="flex items-center gap-1 cursor-pointer select-none px-1.5 py-1 rounded hover:bg-white hover:shadow-sm transition-all">
                                     <input
                                        type="checkbox"
                                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                                        checked={item.dosage[t.toLowerCase()]}
                                        onChange={(e) => onDosageChange(index, t.toLowerCase(), e.target.checked)}
                                     />
                                     <span className="text-[10px] font-bold text-slate-600 uppercase">{t.slice(0,1)}</span>
                                 </label>
                             ))}
                             <div className="w-px h-4 bg-slate-300 mx-1"></div>
                             <select
                                className="bg-transparent text-xs font-medium text-slate-600 outline-none"
                                value={item.dosage.timing}
                                onChange={(e) => onDosageChange(index, 'timing', e.target.value)}
                             >
                                 <option value="">When?</option>
                                 <option value="Before Meal">Before</option>
                                 <option value="After Meal">After</option>
                             </select>
                        </div>
                    </div>
                    <div className="w-20">
                         <label className="block text-xs font-bold text-slate-500 mb-1">Qty</label>
                         <input
                            type="number"
                            min="1"
                            className="w-full py-2 px-2 rounded-lg border border-slate-200 text-center font-bold text-sm"
                            value={item.quantity}
                            onChange={(e) => onQuantityChange(index, e.target.value)}
                         />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrescriptionUpload;
