import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

const DosageModal = ({ item, onClose, onSave, customerName }) => {
    // Determine initial state, prioritizing existing dosage, then generic defaults
    const [dosage, setDosage] = useState(item.dosage || {
        patientName: customerName || '',
        amount: '1',
        unit: 'TABLET',
        frequency: 'In the morning',
        timing: 'AFTER MEALS'
    });

    const handleChange = (field, value) => {
        setDosage(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(item.batchId, dosage);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Label Instructions</h3>
                        <p className="text-xs text-slate-500 truncate max-w-[250px]">{item.name}</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors self-start">
                        <X size={20} className="text-slate-400 hover:text-slate-600"/>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Patient Name */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Patient Name</label>
                        <input
                            type="text"
                            className="w-full p-2.5 rounded-lg border-2 border-slate-200 bg-white outline-none focus:border-blue-500 font-medium text-slate-700 uppercase"
                            value={dosage.patientName}
                            placeholder="Enter Name"
                            onChange={(e) => handleChange('patientName', e.target.value.toUpperCase())}
                        />
                    </div>

                    {/* Amount & Unit */}
                    <div className="flex gap-3">
                        <div className="w-1/3">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Amount</label>
                            <input
                                type="text"
                                className="w-full p-2.5 rounded-lg border-2 border-slate-200 bg-white outline-none focus:border-blue-500 font-medium text-slate-700 uppercase text-center"
                                value={dosage.amount}
                                placeholder="e.g. 1"
                                onChange={(e) => handleChange('amount', e.target.value.toUpperCase())}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Unit</label>
                            <select
                                className="w-full p-2.5 rounded-lg border-2 border-slate-200 bg-white outline-none focus:border-blue-500 font-medium text-slate-700 uppercase"
                                value={dosage.unit}
                                onChange={(e) => handleChange('unit', e.target.value)}
                            >
                                <option value="TABLET">TABLET</option>
                                <option value="TABLETS">TABLETS</option>
                                <option value="CAPSULE">CAPSULE</option>
                                <option value="SPOONFUL">SPOONFUL</option>
                                <option value="DROPS">DROPS</option>
                                <option value="ML">ML</option>
                                <option value="APPLICATION">APPLICATION</option>
                            </select>
                        </div>
                    </div>

                    {/* Frequency */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Frequency</label>
                        <div className="relative">
                            <input
                                type="text"
                                list="frequency-options"
                                className="w-full p-2.5 rounded-lg border-2 border-slate-200 bg-white outline-none focus:border-blue-500 font-medium text-slate-700"
                                value={dosage.frequency}
                                placeholder="e.g. In the morning"
                                onChange={(e) => handleChange('frequency', e.target.value)}
                            />
                            <datalist id="frequency-options">
                                <option value="In the morning" />
                                <option value="At night" />
                                <option value="Twice a day" />
                                <option value="Three times a day" />
                                <option value="Four times a day" />
                                <option value="As needed" />
                                <option value="Every 8 hours" />
                            </datalist>
                        </div>
                    </div>

                    {/* Timing */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Timing (Meal)</label>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                             <button onClick={() => handleChange('timing', 'AFTER MEALS')} className={`py-2 text-xs font-bold rounded border ${dosage.timing === 'AFTER MEALS' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>AFTER MEALS</button>
                             <button onClick={() => handleChange('timing', 'BEFORE MEALS')} className={`py-2 text-xs font-bold rounded border ${dosage.timing === 'BEFORE MEALS' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>BEFORE MEALS</button>
                        </div>
                        <input
                            type="text"
                            className="w-full p-2.5 rounded-lg border-2 border-slate-200 bg-white outline-none focus:border-blue-500 font-medium text-slate-700 uppercase"
                            value={dosage.timing}
                            placeholder="Or type custom timing"
                            onChange={(e) => handleChange('timing', e.target.value.toUpperCase())}
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 flex justify-center items-center gap-2 mt-4"
                    >
                        <Save size={18} /> Save Label
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DosageModal;
