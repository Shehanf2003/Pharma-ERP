import React, { useState } from 'react';
import { X } from 'lucide-react';

const DosageModal = ({ item, onClose, onSave }) => {
    const [dosage, setDosage] = useState(item.dosage || {
        morning: false,
        noon: false,
        night: false,
        timing: ''
    });

    const handleChange = (field, value) => {
        setDosage(prev => {
            const newDosage = { ...prev, [field]: value };
            return newDosage;
        });
    };

    const handleSave = () => {
        onSave(item.batchId, dosage);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-800 text-lg">Instructions: {item.name}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400 hover:text-slate-600"/>
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">When to take?</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['Morning', 'Noon', 'Night'].map(t => (
                                <label key={t} className={`
                                    flex flex-col items-center justify-center cursor-pointer select-none py-3 rounded-lg border-2 transition-all
                                    ${dosage[t.toLowerCase()]
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-emerald-200'}
                                `}>
                                    <input
                                       type="checkbox"
                                       className="hidden"
                                       checked={dosage[t.toLowerCase()]}
                                       onChange={(e) => handleChange(t.toLowerCase(), e.target.checked)}
                                    />
                                    <span className="font-bold text-sm">{t}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Instructions</label>
                         <select
                            className="w-full p-3 rounded-lg border-2 border-slate-200 bg-white outline-none focus:border-emerald-500 font-medium text-slate-700"
                            value={dosage.timing}
                            onChange={(e) => handleChange('timing', e.target.value)}
                         >
                             <option value="">Select instruction...</option>
                             <option value="Before Meal">Before Meal (30 mins)</option>
                             <option value="After Meal">After Meal</option>
                             <option value="With Meal">With Meal</option>
                             <option value="Empty Stomach">On Empty Stomach</option>
                         </select>
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                    >
                        Save Instructions
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DosageModal;
