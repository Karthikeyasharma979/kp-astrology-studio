import React from 'react';
import { Sparkles, Compass, ShieldCheck } from 'lucide-react';

/**
 * Method Switch & Number System Selector Component
 * Segmented control for TSP (Dr. Kar) vs Classic Gulbarga
 */
export const MethodSwitch = ({
    method,
    onMethodChange,
    system,
    onSystemChange,
    lang = 'te'
}) => {
    const isTe = lang === 'te';

    return (
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-4 sm:p-5 border border-amber-200/80 dark:border-white/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left: Primary Method Segmented Switch */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <span className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                    {isTe ? "పద్ధతి ఎంపిక" : "Prediction Method"}:
                </span>
                <div className="w-full sm:w-auto inline-flex p-1 bg-stone-100 dark:bg-slate-800 rounded-2xl border border-stone-200 dark:border-white/5">
                    <button
                        type="button"
                        onClick={() => onMethodChange('tsp')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            method === 'tsp'
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                        }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>TSP (Dr. Kar)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onMethodChange('classic')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            method === 'classic'
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]'
                                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                        }`}
                    >
                        <Compass className="w-4 h-4" />
                        <span>Classic Gulbarga</span>
                    </button>
                </div>
            </div>

            {/* Right: Number System Selector (Active for TSP, Fixed for Classic) */}
            <div className="w-full md:w-auto flex flex-wrap items-center justify-between sm:justify-end gap-2">
                <span className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                    {isTe ? "సంఖ్యా విభాగం" : "Number System"}:
                </span>

                {method === 'tsp' ? (
                    <div className="inline-flex p-1 bg-stone-100 dark:bg-slate-800 rounded-2xl border border-stone-200 dark:border-white/5">
                        {['1-9', '1-27', '1-249', '1-2193'].map((sys) => {
                            const isSelected = system === sys;
                            return (
                                <button
                                    key={sys}
                                    type="button"
                                    onClick={() => onSystemChange(sys)}
                                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-amber-500 text-white shadow-xs font-black'
                                            : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                                    }`}
                                >
                                    {sys}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-200 text-xs font-mono font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        <span>Fixed 1–249</span>
                    </div>
                )}
            </div>
        </div>
    );
};
