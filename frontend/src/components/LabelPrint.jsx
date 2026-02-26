import React from 'react';

const LabelPrint = React.forwardRef(({ item }, ref) => {
    if (!item) return null;

    // Dosage comes from item.dosageInstructions (backend) or item.dosage (frontend local state)
    // We handle both structures just in case
    const dosage = item.dosageInstructions || item.dosage || {};

    return (
        <div ref={ref} className="w-[80mm] h-[40mm] border-2 border-black p-2 font-mono text-sm flex flex-col justify-between bg-white text-black box-border" style={{ pageBreakAfter: 'always' }}>
            <div className="text-center font-bold border-b-2 border-black pb-1 mb-1 text-xs uppercase tracking-wide">
                MedPOS Pharmacy
            </div>

            <div className="font-bold text-lg leading-tight mb-2 truncate">
                {item.name}
            </div>

            <div className="flex justify-center gap-4 text-center border-2 border-black rounded mb-2 py-1">
                 <div className={`w-6 h-6 flex items-center justify-center font-bold border border-black rounded ${dosage.morning ? 'bg-black text-white' : ''}`}>M</div>
                 <div className={`w-6 h-6 flex items-center justify-center font-bold border border-black rounded ${dosage.noon ? 'bg-black text-white' : ''}`}>N</div>
                 <div className={`w-6 h-6 flex items-center justify-center font-bold border border-black rounded ${dosage.night ? 'bg-black text-white' : ''}`}>N</div>
            </div>

            <div className="flex justify-between items-end text-xs font-bold">
                <div className="uppercase">
                    {dosage.timing || 'As Directed'}
                </div>
                <div>
                    {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    );
});

export default LabelPrint;
