import React, { useState, useMemo } from 'react';
import { formatDMS } from '../../utils/nakshatraUtils';
import {
    KP_TRANSLATIONS,
    TELUGU_PLANET_SHORTS,
    getLocalizedPlanet,
    getLocalizedNakshatra
} from '../../utils/kpTranslations';
import { calculateKPFortuna } from '../../utils/kp/kpFortuna';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const KPPlanetTable = ({ planets, fortuna, cusps, lagna, lang = 'te' }) => {
    const t = KP_TRANSLATIONS[lang] || KP_TRANSLATIONS.te;
    const isTe = lang === 'te';

    // Combine planets and Fortuna (Part of Fortune)
    const displayPlanets = useMemo(() => {
        if (!planets || !Array.isArray(planets)) return [];
        if (planets.some(p => p.key === 'Fortuna')) return planets;

        let f = fortuna;
        if (!f) {
            const sun = planets.find(p => p.key === 'Sun');
            const moon = planets.find(p => p.key === 'Moon');
            const asc = lagna?.longitude ?? lagna?.siderealLongitude ?? cusps?.[0]?.siderealLongitude;
            if (sun && moon && asc != null) {
                f = calculateKPFortuna({
                    lagnaLongitude: asc,
                    moonLongitude: moon.longitude,
                    sunLongitude: sun.longitude,
                    cusps
                });
            }
        }
        return f ? [...planets, f] : planets;
    }, [planets, fortuna, cusps, lagna]);

    // Mobile view mode: 'cards' | 'table'
    const [expandedCards, setExpandedCards] = useState({});

    const toggleCard = (key) => {
        setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="space-y-4">
            {/* Desktop Full Table View (Hidden on mobile < md) */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-orange-200/80 dark:border-white/10 shadow-sm">
                <table className="w-full text-left text-sm sm:text-base">
                    <thead>
                        <tr className="bg-gradient-to-r from-amber-50 to-orange-50/60 dark:from-stone-900 dark:to-stone-950 border-b border-orange-200 dark:border-white/10 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs sm:text-sm font-extrabold">
                            <th className="py-3.5 px-4 font-bold">{t.graha}</th>
                            <th className="py-3.5 px-3 font-bold">{t.sign}</th>
                            <th className="py-3.5 px-3 font-bold">{t.degree}</th>
                            <th className="py-3.5 px-3 font-bold">{t.signLord}</th>
                            <th className="py-3.5 px-3 font-bold">{t.starLord}</th>
                            <th className="py-3.5 px-3 font-bold text-amber-600 dark:text-amber-400">{t.subLord}</th>
                            <th className="py-3.5 px-3 font-bold text-blue-600 dark:text-blue-400">{t.subSubLord}</th>
                            <th className="py-3.5 px-3 font-bold">{t.house}</th>
                            <th className="py-3.5 px-3 font-bold">{t.motion}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {displayPlanets.map((p, index) => {
                            const isEven = index % 2 === 0;

                            return (
                                <tr
                                    key={p.key}
                                    className={`transition-colors hover:bg-orange-50/60 dark:hover:bg-white/5 ${
                                        p.key === 'Fortuna'
                                            ? 'bg-amber-50/30 dark:bg-amber-950/20 font-medium'
                                            : isEven ? 'bg-white dark:bg-stone-900/60' : 'bg-orange-50/20 dark:bg-stone-950/40'
                                    }`}
                                >
                                    {/* Planet Name */}
                                    <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                                        <span className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 ${
                                            p.key === 'Fortuna'
                                                ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400/80 dark:border-amber-500/50 text-amber-900 dark:text-amber-300'
                                                : 'bg-orange-100 dark:bg-amber-950 border border-orange-300/80 dark:border-amber-600/40 text-orange-700 dark:text-amber-300'
                                        }`}>
                                            {isTe ? (TELUGU_PLANET_SHORTS[p.key] || p.short) : p.short}
                                        </span>
                                        <span>
                                            <span className="text-sm sm:text-base font-bold block leading-tight">
                                                {isTe ? (p.te || getLocalizedPlanet(p.key, 'te')) : (p.displayNameEn || p.name)}
                                            </span>
                                            {!isTe && (
                                                <span className="text-xs text-gray-400 font-normal">
                                                    {p.sanskrit || (p.key === 'Fortuna' ? 'Part of Fortune' : '')}
                                                </span>
                                            )}
                                        </span>
                                    </td>

                                    {/* Sign */}
                                    <td className="py-3.5 px-3 text-gray-800 dark:text-gray-200 font-semibold text-sm sm:text-base">
                                        {isTe ? p.sign.te : p.sign.en}
                                    </td>

                                    {/* Degree in sign (DMS) */}
                                    <td className="py-3.5 px-3 font-mono text-gray-900 dark:text-gray-100 font-bold text-sm sm:text-base whitespace-nowrap">
                                        {formatDMS(p.degreeInSign)}
                                    </td>

                                    {/* Sign Lord */}
                                    <td className="py-3.5 px-3 font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap text-sm sm:text-base">
                                        {isTe ? getLocalizedPlanet(p.signLord, 'te') : p.signLord}
                                    </td>

                                    {/* Star Lord (Nakshatra) */}
                                    <td className="py-3.5 px-3 text-purple-700 dark:text-purple-300 font-bold whitespace-nowrap text-sm sm:text-base">
                                        <span>{isTe ? getLocalizedPlanet(p.starLord, 'te') : p.starLord}</span>
                                        <span className="block text-xs text-gray-400 font-normal">
                                            ({isTe ? getLocalizedNakshatra(p.nakshatra, 'te') : p.nakshatra?.name})
                                        </span>
                                    </td>

                                    {/* Sub Lord (Highlighted KP Anchor) */}
                                    <td className="py-3.5 px-3 font-black whitespace-nowrap bg-amber-500/5">
                                        <span className="px-3 py-1 rounded-md bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 text-sm sm:text-base font-black font-mono">
                                            {isTe ? getLocalizedPlanet(p.subLord, 'te') : p.subLord}
                                        </span>
                                    </td>

                                    {/* Sub-Sub Lord (Distinguishable Blue) */}
                                    <td className="py-3.5 px-3 whitespace-nowrap">
                                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-bold font-mono">
                                            {isTe ? getLocalizedPlanet(p.subSubLord, 'te') : p.subSubLord}
                                        </span>
                                    </td>

                                    {/* Placidus House */}
                                    <td className="py-3.5 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <span className="px-2.5 py-1 rounded-full bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-orange-300 text-xs sm:text-sm font-bold font-mono">
                                                {isTe ? `${p.house}వ భావం` : `House ${p.house}`}
                                            </span>
                                            {p.originalHouse != null && p.originalHouse !== p.house && (
                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                    {isTe ? `మూలం: H${p.originalHouse}` : `orig: H${p.originalHouse}`}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Motion */}
                                    <td className="py-3.5 px-3 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                                            p.isPoint
                                                ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-700'
                                                : p.isRetrograde
                                                    ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700'
                                        }`}>
                                            {p.isPoint
                                                ? (isTe ? 'సహజ బిందువు' : 'Point')
                                                : (p.isRetrograde ? (isTe ? 'వక్రి' : 'RETRO') : (isTe ? 'సవ్య' : 'Direct'))
                                            }
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Responsive Cards View (< md screens) */}
            <div className="md:hidden space-y-3">
                {displayPlanets.map((p) => {
                    const isExpanded = !!expandedCards[p.key];

                    return (
                        <div
                            key={p.key}
                            className={`p-3.5 rounded-2xl border shadow-sm ${
                                p.key === 'Fortuna'
                                    ? 'bg-amber-50/20 dark:bg-stone-900 border-amber-300/80 dark:border-amber-800/40'
                                    : 'bg-white dark:bg-stone-900 border-orange-200/80 dark:border-white/10'
                            }`}
                        >
                            {/* Card Top Row: Planet, Sign & Degree */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 ${
                                        p.key === 'Fortuna'
                                            ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400/80 dark:border-amber-500/50 text-amber-900 dark:text-amber-300'
                                            : 'bg-orange-100 dark:bg-amber-950 border border-orange-300/80 dark:border-amber-600/40 text-orange-700 dark:text-amber-300'
                                    }`}>
                                        {isTe ? (TELUGU_PLANET_SHORTS[p.key] || p.short) : p.short}
                                    </span>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                                            <span>{isTe ? (p.te || getLocalizedPlanet(p.key, 'te')) : (p.displayNameEn || p.name)}</span>
                                            {p.isRetrograde && (
                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                    {isTe ? 'వక్రి' : 'RETRO'}
                                                </span>
                                            )}
                                            {p.isPoint && (
                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                                    {isTe ? 'సహజ బిందువు' : 'Point'}
                                                </span>
                                            )}
                                        </h4>
                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                            {isTe ? p.sign.te : p.sign.en} • {formatDMS(p.degreeInSign)}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right flex items-center gap-1">
                                    <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-orange-300 font-bold text-xs">
                                        {isTe ? `${p.house}వ భావం` : `H${p.house}`}
                                    </span>
                                    {p.originalHouse != null && p.originalHouse !== p.house && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                            {isTe ? `మూ:H${p.originalHouse}` : `orig:H${p.originalHouse}`}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Card Middle Row: Core KP Anchors (Star Lord & Sub Lord) */}
                            <div className="grid grid-cols-2 gap-2 mt-3 p-2 rounded-xl bg-orange-50/50 dark:bg-stone-800/50 text-xs">
                                <div>
                                    <span className="text-[10px] text-gray-500 uppercase font-semibold block">{t.starLord}</span>
                                    <span className="font-bold text-purple-700 dark:text-purple-300">
                                        {isTe ? getLocalizedPlanet(p.starLord, 'te') : p.starLord}{' '}
                                        <span className="text-[10px] font-normal text-gray-500">
                                            ({isTe ? getLocalizedNakshatra(p.nakshatra, 'te') : p.nakshatra?.name})
                                        </span>
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold block">{t.subLord}</span>
                                    <span className="font-bold text-amber-600 dark:text-amber-400">
                                        {isTe ? getLocalizedPlanet(p.subLord, 'te') : p.subLord}
                                    </span>
                                </div>
                            </div>

                            {/* Expandable Section: Sign Lord, Sub-Sub Lord, Speed */}
                            {isExpanded && (
                                <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-white/5 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                                    <div>
                                        <span className="text-[10px] text-gray-400 block">{t.signLord}</span>
                                        <span className="font-semibold text-orange-600">
                                            {isTe ? getLocalizedPlanet(p.signLord, 'te') : p.signLord}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-400 block">{t.subSubLord}</span>
                                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                                            {isTe ? getLocalizedPlanet(p.subSubLord, 'te') : p.subSubLord}
                                        </span>
                                    </div>
                                    <div className="col-span-2 text-[11px] text-gray-500 font-mono">
                                        {p.isPoint
                                            ? (isTe ? 'స్వభావం: సహజ భాగ్య బిందువు (Fortuna)' : 'Nature: Calculated Sensitive Point (Part of Fortune)')
                                            : (isTe ? `గతి: ${p.isRetrograde ? 'వక్ర గతి' : 'సవ్య గతి'}` : `Motion: ${p.isRetrograde ? 'Retrograde motion' : 'Direct motion'}`)
                                        }
                                    </div>
                                </div>
                            )}

                            {/* Toggle Details Button */}
                            <button
                                type="button"
                                onClick={() => toggleCard(p.key)}
                                className="w-full mt-2 pt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1 hover:text-orange-600"
                            >
                                <span>{isExpanded ? (isTe ? "వివరాలు దాచు" : "Show Less") : (isTe ? "మరిన్ని వివరాలు (రాశ్యాధిపతి, సబ్-సబ్)" : "More Details (Sign Lord, Sub-Sub)")}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
