import React, { useState } from 'react';
import { formatDMS } from '../../utils/nakshatraUtils';
import {
    KP_TRANSLATIONS,
    getLocalizedPlanet,
    getLocalizedNakshatra
} from '../../utils/kpTranslations';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const KPCuspTable = ({ cusps, lang = 'te' }) => {
    const t = KP_TRANSLATIONS[lang] || KP_TRANSLATIONS.te;
    const isTe = lang === 'te';

    const [expandedCusps, setExpandedCusps] = useState({});

    const toggleCusp = (houseNum) => {
        setExpandedCusps(prev => ({ ...prev, [houseNum]: !prev[houseNum] }));
    };

    return (
        <div className="space-y-4">
            {/* Desktop Full Table View (Hidden on mobile < md) */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-orange-200/80 dark:border-white/10 shadow-sm">
                <table className="w-full text-left text-sm sm:text-base">
                    <thead>
                        <tr className="bg-gradient-to-r from-amber-50 to-orange-50/60 dark:from-stone-900 dark:to-stone-950 border-b border-orange-200 dark:border-white/10 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs sm:text-sm font-extrabold">
                            <th className="py-3.5 px-4 font-bold">{t.houseHeader}</th>
                            <th className="py-3.5 px-3 font-bold">{t.cuspLongitude}</th>
                            <th className="py-3.5 px-3 font-bold">{t.sign}</th>
                            <th className="py-3.5 px-3 font-bold">{t.signLord}</th>
                            <th className="py-3.5 px-3 font-bold">{t.starLord}</th>
                            <th className="py-3.5 px-3 font-bold text-amber-600 dark:text-amber-400">{t.subLord}</th>
                            <th className="py-3.5 px-3 font-bold text-blue-600 dark:text-blue-400">{t.subSubLord}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {cusps.map((c, index) => {
                            const isEven = index % 2 === 0;
                            const isLagna = c.houseNumber === 1;
                            const isMC = c.houseNumber === 10;

                            return (
                                <tr
                                    key={c.houseNumber}
                                    className={`transition-colors hover:bg-orange-50/60 dark:hover:bg-white/5 ${
                                        isLagna
                                            ? 'bg-amber-100/40 dark:bg-amber-950/30 font-medium'
                                            : (isMC
                                                ? 'bg-blue-50/40 dark:bg-blue-950/20 font-medium'
                                                : (isEven ? 'bg-white dark:bg-stone-900/60' : 'bg-orange-50/20 dark:bg-stone-950/40'))
                                    }`}
                                >
                                    {/* House Number & Badge */}
                                    <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                                            isLagna
                                                ? 'bg-amber-500 text-white shadow-xs'
                                                : (isMC
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-amber-400')
                                        }`}>
                                            {c.houseNumber}
                                        </span>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-sm sm:text-base block">
                                                    {isTe ? `${c.houseNumber}వ భావం` : `House ${c.houseNumber}`}
                                                </span>
                                                {c.originalHouseNumber != null && c.originalHouseNumber !== c.houseNumber && (
                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                        {isTe ? `మూలం: H${c.originalHouseNumber}` : `orig: H${c.originalHouseNumber}`}
                                                    </span>
                                                )}
                                            </div>
                                            {isLagna && (
                                                <span className="block text-xs text-amber-700 dark:text-amber-400 font-bold uppercase tracking-tight">
                                                    {isTe ? "లగ్నం" : "Ascendant • Lagna"}
                                                </span>
                                            )}
                                            {isMC && (
                                                <span className="block text-xs text-blue-700 dark:text-blue-400 font-bold uppercase tracking-tight">
                                                    {isTe ? "దశమ భావం" : "Midheaven • 10th"}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Cusp Longitude in DMS */}
                                    <td className="py-3.5 px-3 font-mono text-gray-900 dark:text-gray-100 font-bold text-sm sm:text-base whitespace-nowrap">
                                        {formatDMS(c.degreeInSign)}
                                    </td>

                                    {/* Sign */}
                                    <td className="py-3.5 px-3 text-gray-800 dark:text-gray-200 font-semibold text-sm sm:text-base">
                                        {isTe ? c.sign.te : c.sign.en}
                                    </td>

                                    {/* Sign Lord */}
                                    <td className="py-3.5 px-3 font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap text-sm sm:text-base">
                                        {isTe ? getLocalizedPlanet(c.signLord, 'te') : c.signLord}
                                    </td>

                                    {/* Star Lord */}
                                    <td className="py-3.5 px-3 text-purple-700 dark:text-purple-300 font-bold whitespace-nowrap text-sm sm:text-base">
                                        <span>{isTe ? getLocalizedPlanet(c.starLord, 'te') : c.starLord}</span>
                                        <span className="block text-xs text-gray-400 font-normal">
                                            ({isTe ? getLocalizedNakshatra(c.nakshatra, 'te') : c.nakshatra?.name})
                                        </span>
                                    </td>

                                    {/* Sub Lord */}
                                    <td className="py-3.5 px-3 font-black whitespace-nowrap bg-amber-500/5">
                                        <span className="px-3 py-1 rounded-md bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 text-sm sm:text-base font-black font-mono">
                                            {isTe ? getLocalizedPlanet(c.subLord, 'te') : c.subLord}
                                        </span>
                                    </td>

                                    {/* Sub-Sub Lord */}
                                    <td className="py-3.5 px-3 whitespace-nowrap">
                                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-bold font-mono">
                                            {isTe ? getLocalizedPlanet(c.subSubLord, 'te') : c.subSubLord}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Responsive Cards (< md screens) */}
            <div className="md:hidden space-y-3">
                {cusps.map((c) => {
                    const isExpanded = !!expandedCusps[c.houseNumber];
                    const isLagna = c.houseNumber === 1;
                    const isMC = c.houseNumber === 10;

                    return (
                        <div
                            key={c.houseNumber}
                            className={`p-3.5 rounded-2xl bg-white dark:bg-stone-900 border shadow-sm transition-all ${
                                isLagna
                                    ? 'border-amber-400 dark:border-amber-500/60 ring-1 ring-amber-300/40'
                                    : (isMC
                                        ? 'border-blue-400 dark:border-blue-600/60 ring-1 ring-blue-300/40'
                                        : 'border-orange-200/80 dark:border-white/10')
                            }`}
                        >
                            {/* Card Header: House badge, Sign, DMS */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                        isLagna
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : (isMC
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-amber-400')
                                    }`}>
                                        {c.houseNumber}
                                    </span>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                            <span>{isTe ? (c.houseNumber === 1 ? '1వ భావం (లగ్నం)' : `${c.houseNumber}వ భావ సంధి`) : `House ${c.houseNumber} Cusp`}</span>
                                            {c.originalHouseNumber != null && c.originalHouseNumber !== c.houseNumber && (
                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                    {isTe ? `మూలం: H${c.originalHouseNumber}` : `orig: H${c.originalHouseNumber}`}
                                                </span>
                                            )}
                                            {isLagna && (
                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                    {isTe ? 'లగ్నం' : 'LAGNA'}
                                                </span>
                                            )}
                                            {isMC && (
                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                                    {isTe ? 'దశమం' : 'MC (10th)'}
                                                </span>
                                            )}
                                        </h4>
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                            {isTe ? c.sign.te : c.sign.en} • {formatDMS(c.degreeInSign)}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 font-bold text-xs">
                                        {isTe ? `సబ్: ${getLocalizedPlanet(c.subLord, 'te')}` : `Sub: ${c.subLord}`}
                                    </span>
                                </div>
                            </div>

                            {/* Card Middle: Star Lord & Sub Lord */}
                            <div className="grid grid-cols-2 gap-2 mt-3 p-2 rounded-xl bg-orange-50/50 dark:bg-stone-800/50 text-xs">
                                <div>
                                    <span className="text-[10px] text-gray-500 uppercase font-semibold block">{t.starLord}</span>
                                    <span className="font-bold text-purple-700 dark:text-purple-300">
                                        {isTe ? getLocalizedPlanet(c.starLord, 'te') : c.starLord}{' '}
                                        <span className="text-[10px] font-normal text-gray-500">
                                            ({isTe ? getLocalizedNakshatra(c.nakshatra, 'te') : c.nakshatra?.name})
                                        </span>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-500 uppercase font-semibold block">{t.signLord}</span>
                                    <span className="font-semibold text-orange-600">
                                        {isTe ? getLocalizedPlanet(c.signLord, 'te') : c.signLord}
                                    </span>
                                </div>
                            </div>

                            {/* Expandable Section */}
                            {isExpanded && (
                                <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                                    <span>{t.subSubLord}: <strong className="text-blue-600 dark:text-blue-400">{isTe ? getLocalizedPlanet(c.subSubLord, 'te') : c.subSubLord}</strong></span>
                                    <span className="font-mono text-gray-500">
                                        {isTe ? `సాయన: ${c.tropicalLongitude.toFixed(2)}°` : `Tropical: ${c.tropicalLongitude.toFixed(2)}°`}
                                    </span>
                                </div>
                            )}

                            {/* Toggle Details Button */}
                            <button
                                type="button"
                                onClick={() => toggleCusp(c.houseNumber)}
                                className="w-full mt-2 pt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1 hover:text-orange-600"
                            >
                                <span>{isExpanded ? (isTe ? "వివరాలు దాచు" : "Show Less") : (isTe ? "మరిన్ని భావ వివరాలు" : "More Cusp Details")}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
