import React, { useState } from 'react';
import { Sliders, ChevronDown, ChevronUp, AlertCircle, Info } from 'lucide-react';

/**
 * Settings Panel Component (Collapsible)
 * Exposes configurable theoretical toggles for TSP & Classic Gulbarga.
 */
export const SettingsPanel = ({
    method,
    tspSettings,
    onUpdateTspSettings,
    classicSettings,
    onUpdateClassicSettings,
    lang = 'te'
}) => {
    const isTe = lang === 'te';
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-amber-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            {/* Collapsible Header */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-stone-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-2.5">
                    <Sliders className="w-4 h-4 text-orange-500" />
                    <span className="font-serif font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                        {isTe ? "గణన నిబంధనలు & సర్దుబాట్లు" : "Calculation Settings & Toggles"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-stone-300 font-mono">
                        {method.toUpperCase()}
                    </span>
                </div>
                <div className="text-stone-400">
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
            </button>

            {/* Panel Body */}
            {isOpen && (
                <div className="p-5 sm:p-6 border-t border-stone-100 dark:border-white/10 space-y-4">
                    {method === 'tsp' ? (
                        /* TSP Settings */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Saturn Effect / Punarphoo Inversion */}
                            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-white/5 cursor-pointer hover:border-amber-400 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={tspSettings.saturnEffect}
                                    onChange={(e) => onUpdateTspSettings({ saturnEffect: e.target.checked })}
                                    className="mt-1 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                                />
                                <div>
                                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white block">
                                        Saturn Effect (Punarphoo Inversion)
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                                        Invert outcome if Saturn connects with Moon (Default: ON).
                                    </span>
                                </div>
                            </label>

                            {/* Node Agency */}
                            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-white/5 cursor-pointer hover:border-amber-400 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={tspSettings.nodeAgency}
                                    onChange={(e) => onUpdateTspSettings({ nodeAgency: e.target.checked })}
                                    className="mt-1 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                                />
                                <div>
                                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white block">
                                        Node Agency (Rahu / Ketu)
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                                        Allow Rahu & Ketu to match via star/sign lords, conjoined and aspecting grahas (Default: ON).
                                    </span>
                                </div>
                            </label>

                            {/* Special Rule 3 */}
                            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-white/5 cursor-pointer hover:border-amber-400 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={tspSettings.specialRule3}
                                    onChange={(e) => onUpdateTspSettings({ specialRule3: e.target.checked })}
                                    className="mt-1 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                                />
                                <div>
                                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white block">
                                        Special Rule 3 (Asc SS = Moon Star / Asc Star)
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                                        Author warns against applying blindly (Default: OFF).
                                    </span>
                                </div>
                            </label>

                            {/* Reduce Large Numbers */}
                            <div className="md:col-span-2 p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-white/5 space-y-1.5">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={tspSettings.reduceLargeNumbers}
                                        onChange={(e) => onUpdateTspSettings({ reduceLargeNumbers: e.target.checked })}
                                        className="mt-1 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                                    />
                                    <div>
                                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white block">
                                            Reduce Large Numbers (Modulo Reduction)
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                                            Repeatedly subtract system size when querent inputs number &gt; range (Default: OFF).
                                        </span>
                                    </div>
                                </label>
                                <div className="ml-6 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>The book's author explicitly notes that reducing large numbers did not work reliably in his clinical practice.</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Classic Gulbarga Settings */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* RP Mode: Classic-5 vs Extended-7 */}
                            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-white/5 space-y-2">
                                <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white block">
                                    Ruling Planets Set
                                </span>
                                <div className="inline-flex p-1 bg-stone-200/60 dark:bg-slate-700/60 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => onUpdateClassicSettings({ rpMode: 'classic5' })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            classicSettings.rpMode === 'classic5'
                                                ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs'
                                                : 'text-stone-600 dark:text-stone-400'
                                        }`}
                                    >
                                        Classic-5 (Standard)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onUpdateClassicSettings({ rpMode: 'extended7' })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            classicSettings.rpMode === 'extended7'
                                                ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs'
                                                : 'text-stone-600 dark:text-stone-400'
                                        }`}
                                    >
                                        Extended-7 (+ Subs)
                                    </button>
                                </div>
                            </div>

                            {/* Node Agency */}
                            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-white/5 cursor-pointer hover:border-amber-400 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={classicSettings.nodeAgency}
                                    onChange={(e) => onUpdateClassicSettings({ nodeAgency: e.target.checked })}
                                    className="mt-1 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                                />
                                <div>
                                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white block">
                                        Node Agency in RPs
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                                        Rahu / Ketu represent their connected planets in Rule 1/2 (Default: OFF).
                                    </span>
                                </div>
                            </label>

                            {/* Fortuna in Rule 1 */}
                            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-white/5 cursor-pointer hover:border-amber-400 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={classicSettings.fortunaInRule1}
                                    onChange={(e) => onUpdateClassicSettings({ fortunaInRule1: e.target.checked })}
                                    className="mt-1 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                                />
                                <div>
                                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white block">
                                        Fortuna in Rule 1
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                                        Allow number's sub lord to match Fortuna star lord (Default: OFF).
                                    </span>
                                </div>
                            </label>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
