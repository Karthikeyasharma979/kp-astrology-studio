import React, { useState } from 'react';
import { KP_TRANSLATIONS, getLocalizedPlanet } from '../../utils/kpTranslations';
import { getPlanetAspectHouses } from '../../utils/kp/kpSignificators';
import { Shield, Layers, Star, Eye, Sparkles } from 'lucide-react';

export const KPSignificators = ({ significators, lang = 'te' }) => {
    const t = KP_TRANSLATIONS[lang] || KP_TRANSLATIONS.te;
    const isTe = lang === 'te';
    const [viewMode, setViewMode] = useState('houses'); // 'houses' | 'planets'

    if (!significators) return null;

    const { houseSignificators, planetSignifications } = significators;

    // Resilient helper: retrieve or dynamically compute aspect details for a house
    const getHouseAspectDetails = (h) => {
        if (h && h.aspectedByDetails && h.aspectedByDetails.length > 0) {
            return h.aspectedByDetails;
        }
        if (!planetSignifications || !Array.isArray(planetSignifications)) return [];
        const details = [];
        for (const p of planetSignifications) {
            const occupiedHouse = p.house || (p.level2Houses && p.level2Houses[0]);
            if (occupiedHouse && occupiedHouse >= 1 && occupiedHouse <= 12) {
                const aspects = getPlanetAspectHouses(p.planetKey, occupiedHouse);
                const match = aspects.find(asp => asp.house === h.houseNumber);
                if (match) {
                    details.push({
                        planetKey: p.planetKey,
                        planetName: p.planetName || p.planetKey,
                        span: match.span,
                        aspectNameEn: match.aspectNameEn,
                        aspectNameTe: match.aspectNameTe,
                        castingHouse: occupiedHouse
                    });
                }
            }
        }
        return details;
    };

    // Resilient helper: retrieve or dynamically compute aspect details for a planet
    const getPlanetAspectDetails = (p) => {
        if (p && p.aspectedHousesDetails && p.aspectedHousesDetails.length > 0) {
            return p.aspectedHousesDetails;
        }
        const occupiedHouse = p.house || (p.level2Houses && p.level2Houses[0]);
        if (occupiedHouse && occupiedHouse >= 1 && occupiedHouse <= 12) {
            return getPlanetAspectHouses(p.planetKey, occupiedHouse);
        }
        return [];
    };

    return (
        <div className="space-y-6">
            {/* Rule Engine Explanation Banner & Legend */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-stone-900/40 border border-amber-300/70 dark:border-amber-700/50 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2.5 font-bold text-base sm:text-lg text-amber-900 dark:text-amber-300 font-serif">
                    <Shield className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>{isTe ? "కృష్ణమూర్తి పద్ధతి 4-స్థాయి కారకత్వ సూత్రాలు" : "Classical KP 4-Fold House Significator Hierarchy"}</span>
                </div>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                    {isTe
                        ? "కేపీ పద్ధతిలో ఒక భావ ఫలితాన్ని ఇచ్చే శక్తి ఆ భావ గ్రహాల కంటే వాటి నక్షత్ర నాథులకే అధికంగా ఉంటుంది. బలం క్రమం: స్థాయి 1 > స్థాయి 2 > స్థాయి 3 > స్థాయి 4."
                        : "In Krishnamurti Paddhati, a planet delivers results primarily according to its Star Lord. Hierarchy of strength: Level 1 (Strongest) > Level 2 > Level 3 > Level 4 (Baseline)."}
                </p>

                {/* Legend Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 shadow-2xs">
                        <span className="font-bold text-amber-900 dark:text-amber-200 block mb-1 text-sm sm:text-base">
                            {isTe ? "స్థాయి 1 (అత్యుత్తమ బలం)" : "Level 1 (Grade A - Top)"}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-snug block font-medium">
                            {isTe ? "భావంలో ఉన్న గ్రహం యొక్క నక్షత్రంలో ఉన్న గ్రహాలు." : "Planets in the Star of a house occupant."}
                        </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-orange-50/90 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-700/60 shadow-2xs">
                        <span className="font-bold text-orange-900 dark:text-orange-200 block mb-1 text-sm sm:text-base">
                            {isTe ? "స్థాయి 2 (బలీయం)" : "Level 2 (Grade B - Strong)"}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-snug block font-medium">
                            {isTe ? "ఆ భావంలో నేరుగా కొలువై ఉన్న గ్రహాలు." : "Planets occupying the house itself."}
                        </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700/60 shadow-2xs">
                        <span className="font-bold text-blue-900 dark:text-blue-200 block mb-1 text-sm sm:text-base">
                            {isTe ? "స్థాయి 3 (మధ్యమం)" : "Level 3 (Grade C - Moderate)"}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-snug block font-medium">
                            {isTe ? "భావాధిపతి యొక్క నక్షత్రంలో ఉన్న గ్రహాలు." : "Planets in the Star of the house lord."}
                        </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-purple-50/90 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-700/60 shadow-2xs">
                        <span className="font-bold text-purple-900 dark:text-purple-200 block mb-1 text-sm sm:text-base">
                            {isTe ? "స్థాయి 4 (సాధారణం)" : "Level 4 (Grade D - Baseline)"}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-snug block font-medium">
                            {isTe ? "ఆ భావానికి అధిపతి అయిన రాశ్యాధిపతి." : "The planetary ruler of the house itself."}
                        </span>
                    </div>
                </div>
            </div>

            {/* KP Planetary Aspects (Graha Drishti) on Bhavas Summary Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-cyan-500/10 dark:from-teal-950/40 dark:via-emerald-950/20 dark:to-stone-900/40 border border-teal-300/70 dark:border-teal-700/50 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 font-bold text-base sm:text-lg text-teal-900 dark:text-teal-200 font-serif">
                        <Eye className="w-5 h-5 text-teal-600 shrink-0" />
                        <span>{t.aspectCardTitle || (isTe ? "గ్రహ దృష్టులు & భావ సంబంధాల విశ్లేషణ" : "Planetary Aspects & House Indications")}</span>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold border border-teal-300/60 dark:border-teal-700/60 self-start sm:self-auto font-mono">
                        {isTe ? "పరాశర పూర్ణ దృష్టి నియమాలు" : "Parashari Drishti in KP"}
                    </span>
                </div>

                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {t.aspectCardSubtitle || (isTe
                        ? "పరాశర సంప్రదాయం ప్రకారం గ్రహాలు ప్రసరించే దృష్టులు మరియు ఆయా భావాలపై వాటి ప్రభావం (కుజుడు 4,7,8; గురుడు 5,7,9; శని 3,7,10; అందరికీ 7వ దృష్టి; రాహు-కేతువులు 5,7,9)."
                        : "Classical Parashari Graha Drishti casting upon Placidus Bhavas (Mars 4/7/8, Jupiter 5/7/9, Saturn 3/7/10, all 7th; Rahu/Ketu 5/7/9).")}
                </p>

                {/* Dual Overview Grid: Planets ➔ Houses & Houses ➔ Aspecting Planets */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                    {/* Sub-Card A: Grahas ➔ Aspected Houses */}
                    <div className="p-4 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-teal-200/80 dark:border-teal-800/40 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                            <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                                {isTe ? "గ్రహం ➔ దృష్టి భావాలు (Planet ➔ Houses)" : "Graha ➔ Aspected Houses"}
                            </span>
                            <span className="text-[11px] text-gray-500 font-mono">9 Grahas</span>
                        </div>

                        <div className="space-y-2 text-xs">
                            {planetSignifications.map(p => {
                                const isBenefic = p.planetKey === 'Jupiter' || p.planetKey === 'Venus';
                                const isChallenging = ['Saturn', 'Mars', 'Rahu', 'Ketu'].includes(p.planetKey);

                                return (
                                    <div key={p.planetKey} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-teal-50/50 dark:hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-1.5 min-w-[95px]">
                                            <span className={`w-1.5 h-1.5 rounded-full ${isBenefic ? 'bg-emerald-500' : isChallenging ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {isTe ? getLocalizedPlanet(p.planetName || p.planetKey, 'te') : p.planetName}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-mono">
                                                ({isTe ? `${p.house}వ భా` : `H${p.house}`})
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {(() => {
                                                const aspects = getPlanetAspectDetails(p);
                                                return aspects && aspects.length > 0 ? (
                                                    aspects.map((asp, aIdx) => (
                                                        <span
                                                            key={`${asp.house}-${asp.span}-${aIdx}`}
                                                            className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[11px] border border-teal-200 dark:border-teal-800"
                                                            title={`${asp.aspectNameEn} on House ${asp.house}`}
                                                        >
                                                            {isTe ? `${asp.house}వ భావం` : `H${asp.house}`}
                                                            <span className="text-[9px] opacity-75 font-mono ml-0.5">({asp.span})</span>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sub-Card B: Bhavas ➔ Receiving Graha Drishti */}
                    <div className="p-4 rounded-xl bg-white/80 dark:bg-stone-900/80 border border-teal-200/80 dark:border-teal-800/40 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                            <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                {isTe ? "భావం ➔ దృష్టి ప్రసరించే గ్రహాలు (House ➔ Grahas)" : "Bhava ➔ Aspecting Planets"}
                            </span>
                            <span className="text-[11px] text-gray-500 font-mono">12 Bhavas</span>
                        </div>

                        <div className="space-y-2 text-xs max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
                            {houseSignificators.map(h => (
                                <div key={h.houseNumber} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-teal-50/50 dark:hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-1.5 min-w-[85px]">
                                        <span className="w-5 h-5 rounded-md bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                                            {isTe ? `${h.houseNumber}వ` : `H${h.houseNumber}`}
                                        </span>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {isTe ? `${h.houseNumber}వ భావం` : `House ${h.houseNumber}`}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-1 justify-end">
                                        {(() => {
                                            const aspects = getHouseAspectDetails(h);
                                            return aspects && aspects.length > 0 ? (
                                                aspects.map((asp, aIdx) => (
                                                    <span
                                                        key={`${asp.planetKey}-${asp.span}-${aIdx}`}
                                                        className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[11px] border border-teal-200 dark:border-teal-800"
                                                        title={`${asp.planetName} (${asp.castingHouse}వ భావం నుండి ${asp.aspectNameTe})`}
                                                    >
                                                        {isTe ? getLocalizedPlanet(asp.planetKey, 'te') : asp.planetKey}
                                                        <span className="text-[9px] opacity-75 font-mono ml-0.5">({asp.span})</span>
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-400 text-[11px] italic">
                                                    {isTe ? "ప్రత్యక్ష దృష్టి లేదు" : "No direct aspect"}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Astrological Impact Hint Footer */}
                <div className="p-3 rounded-xl bg-teal-50/90 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/50 text-xs text-gray-700 dark:text-gray-300 leading-relaxed flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>
                        {t.aspectInfluenceHint || (isTe
                            ? "దృష్టులు భావ ఫలితాల స్వభావాన్ని ప్రభావితం చేస్తాయి: గురు/శుక్రుల శుభ దృష్టి రక్షణను, సులువును ఇస్తుంది; శని/కుజ/రాహు-కేతువుల దృష్టి పరిశ్రమను, ఆటంకాలను మరియు బాధ్యతను సూచిస్తుంది."
                            : "Aspects flavor how house significators manifest: Benefic aspects (Jupiter/Venus) bring ease, grace, and protection; Malefic/Challenging aspects (Saturn/Mars/Nodes) require vigilance, perseverance, and conscious discipline.")}
                    </span>
                </div>
            </div>

            {/* View Switcher Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-200/80 dark:border-white/10 pb-3">
                <div className="inline-flex p-1.5 rounded-xl bg-orange-100/60 dark:bg-stone-800/80 border border-orange-200 dark:border-white/10">
                    <button
                        type="button"
                        onClick={() => setViewMode('houses')}
                        className={`px-4 sm:px-5 py-2.5 rounded-lg text-sm sm:text-base font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            viewMode === 'houses'
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'text-gray-700 dark:text-gray-300 hover:text-amber-600'
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        <span>{isTe ? "భావాల కారకత్వాలు" : "House Significators"}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('planets')}
                        className={`px-4 sm:px-5 py-2.5 rounded-lg text-sm sm:text-base font-bold transition-all flex items-center gap-2 cursor-pointer ${
                            viewMode === 'planets'
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'text-gray-700 dark:text-gray-300 hover:text-amber-600'
                        }`}
                    >
                        <Star className="w-4 h-4" />
                        <span>{isTe ? "గ్రహాల సూచనలు" : "Planet Significations"}</span>
                    </button>
                </div>

                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 font-mono">
                    {isTe ? "12 భావాలు • 9 గ్రహాలు" : "12 Placidus Bhavas • 9 Grahas"}
                </span>
            </div>

            {/* View 1: House Significators (Desktop Table) */}
            {viewMode === 'houses' ? (
                <>
                    {/* Desktop Table View (Hidden on mobile < md) */}
                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-orange-200/80 dark:border-white/10 shadow-sm">
                        <table className="w-full text-left text-sm sm:text-base">
                            <thead>
                                <tr className="bg-gradient-to-r from-amber-50 to-orange-50/60 dark:from-stone-900 dark:to-stone-950 border-b border-orange-200 dark:border-white/10 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs sm:text-sm font-extrabold">
                                    <th className="py-3.5 px-3 font-bold w-24">{t.houseHeader}</th>
                                    <th className="py-3.5 px-3 font-bold text-amber-700 dark:text-amber-400">{t.level1}</th>
                                    <th className="py-3.5 px-3 font-bold text-orange-700 dark:text-orange-400">{t.level2}</th>
                                    <th className="py-3.5 px-3 font-bold text-blue-700 dark:text-blue-400">{t.level3}</th>
                                    <th className="py-3.5 px-3 font-bold text-purple-700 dark:text-purple-400">{t.level4}</th>
                                    <th className="py-3.5 px-3 font-bold text-teal-700 dark:text-teal-400">{t.aspectedByHeader || (isTe ? "దృష్టి గ్రహాలు" : "Aspects")}</th>
                                    <th className="py-3.5 px-4 font-bold bg-amber-500/10 text-amber-900 dark:text-amber-300">{t.allSignificators}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {houseSignificators.map((h, index) => {
                                    const isEven = index % 2 === 0;

                                    return (
                                        <tr
                                            key={h.houseNumber}
                                            className={`transition-colors hover:bg-orange-50/60 dark:hover:bg-white/5 ${
                                                isEven ? 'bg-white dark:bg-stone-900/60' : 'bg-orange-50/20 dark:bg-stone-950/40'
                                            }`}
                                        >
                                            {/* House Number & Lord */}
                                            <td className="py-3.5 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {isTe ? `${h.houseNumber}వ` : `H${h.houseNumber}`}
                                                    </span>
                                                    <div>
                                                        <span className="font-bold">
                                                            {isTe ? `${h.houseNumber}వ భావం` : `H${h.houseNumber}`}
                                                        </span>
                                                        <span className="block text-[11px] text-gray-500">
                                                            {isTe ? `అధిపతి: ${getLocalizedPlanet(h.signLord, 'te')}` : `Lord: ${h.signLord}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Level 1: In Star of Occupant */}
                                            <td className="py-3.5 px-3">
                                                {h.level1.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 min-w-[90px]">
                                                        {h.level1.map(p => (
                                                             <span key={p} className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-bold text-xs border border-amber-300 dark:border-amber-700 shadow-2xs">
                                                                {isTe ? getLocalizedPlanet(p, 'te') : p}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 font-mono text-sm">-</span>
                                                )}
                                            </td>

                                            {/* Level 2: Occupants */}
                                            <td className="py-3.5 px-3">
                                                {h.level2.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 min-w-[90px]">
                                                        {h.level2.map(p => (
                                                            <span key={p} className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/80 text-orange-900 dark:text-orange-200 font-bold text-xs border border-orange-300 dark:border-orange-700 shadow-2xs">
                                                                {isTe ? getLocalizedPlanet(p, 'te') : p}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 font-mono text-sm">-</span>
                                                )}
                                            </td>

                                            {/* Level 3: In Star of Lord */}
                                            <td className="py-3.5 px-3">
                                                {h.level3.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 min-w-[90px]">
                                                        {h.level3.map(p => (
                                                            <span key={p} className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 font-medium text-xs border border-blue-200 dark:border-blue-800 shadow-2xs">
                                                                {isTe ? getLocalizedPlanet(p, 'te') : p}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 font-mono text-sm">-</span>
                                                )}
                                            </td>

                                            {/* Level 4: House Lord */}
                                            <td className="py-3.5 px-3">
                                                {h.level4.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 min-w-[70px]">
                                                        {h.level4.map(p => (
                                                            <span key={p} className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 font-medium text-xs border border-purple-200 dark:border-purple-800 shadow-2xs">
                                                                {isTe ? getLocalizedPlanet(p, 'te') : p}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 font-mono text-sm">-</span>
                                                )}
                                            </td>

                                            {/* Aspects on House (Graha Drishti) */}
                                            <td className="py-3.5 px-3">
                                                {(() => {
                                                    const aspects = getHouseAspectDetails(h);
                                                    return aspects && aspects.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5 min-w-[120px]">
                                                            {aspects.map((asp, aIdx) => (
                                                                <span
                                                                    key={`${asp.planetKey}-${asp.span}-${aIdx}`}
                                                                    className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/80 text-teal-900 dark:text-teal-200 font-bold text-xs border border-teal-300 dark:border-teal-700 shadow-2xs"
                                                                    title={`${asp.planetName} (${asp.castingHouse}వ భావం నుండి ${asp.aspectNameTe})`}
                                                                >
                                                                    {isTe ? getLocalizedPlanet(asp.planetKey, 'te') : asp.planetKey}
                                                                    <span className="text-[10px] opacity-75 font-mono ml-0.5">
                                                                        ({isTe ? `${asp.span}వ` : `${asp.span}th`})
                                                                    </span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 font-mono text-sm">-</span>
                                                    );
                                                })()}
                                            </td>

                                            {/* Combined Significators (Levels 1-4 + Aspects, Deduplicated) */}
                                            <td className="py-3.5 px-4 font-bold bg-amber-500/5">
                                                <div className="flex flex-wrap gap-1.5 min-w-[120px]">
                                                    {(() => {
                                                        const aspectPlanets = (getHouseAspectDetails(h) || []).map(a => a.planetKey);
                                                        const combined = Array.from(new Set([
                                                            ...(h.allSignificators || []),
                                                            ...(h.allSignificatorsWithAspects || []),
                                                            ...(h.aspectedByPlanets || []),
                                                            ...aspectPlanets
                                                        ]));
                                                        return combined.map(p => (
                                                            <span key={p} className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow-xs">
                                                                {isTe ? getLocalizedPlanet(p, 'te') : p}
                                                            </span>
                                                        ));
                                                    })()}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Stacked House Cards (< md screens) */}
                    <div className="md:hidden space-y-3">
                        {houseSignificators.map((h) => (
                            <div
                                key={h.houseNumber}
                                className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-orange-200/80 dark:border-white/10 shadow-sm space-y-3"
                            >
                                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                                            {isTe ? `${h.houseNumber}వ` : `H${h.houseNumber}`}
                                        </span>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                                                {isTe ? `${h.houseNumber}వ భావం` : `House ${h.houseNumber}`}
                                            </h4>
                                            <span className="text-[11px] text-gray-500">
                                                {isTe ? `రాశి: ${h.sign?.te || ''} • అధిపతి: ${getLocalizedPlanet(h.signLord, 'te')}` : `Sign: ${h.sign?.en} • Lord: ${h.signLord}`}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-[10px] text-amber-600 uppercase font-bold block">{t.subLord}</span>
                                        <span className="font-bold text-amber-600 text-xs">
                                            {isTe ? getLocalizedPlanet(h.subLord, 'te') : h.subLord}
                                        </span>
                                    </div>
                                </div>

                                {/* 4 Level Stack + Aspects */}
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-amber-800 dark:text-amber-400 font-bold shrink-0">
                                            {isTe ? "స్థాయి 1 (నక్షత్ర గ్రహాలు):" : "Level 1 (Occupant's Star):"}
                                        </span>
                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {h.level1.length > 0 ? h.level1.map(p => (
                                                <span key={p} className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold text-[11px]">
                                                    {isTe ? getLocalizedPlanet(p, 'te') : p}
                                                </span>
                                            )) : <span className="text-gray-400">-</span>}
                                        </div>
                                    </div>

                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-orange-800 dark:text-orange-400 font-bold shrink-0">
                                            {isTe ? "స్థాయి 2 (భావ గ్రహాలు):" : "Level 2 (Occupants):"}
                                        </span>
                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {h.level2.length > 0 ? h.level2.map(p => (
                                                <span key={p} className="px-1.5 py-0.2 rounded bg-orange-100 dark:bg-orange-950 text-orange-900 dark:text-orange-200 font-bold text-[11px]">
                                                    {isTe ? getLocalizedPlanet(p, 'te') : p}
                                                </span>
                                            )) : <span className="text-gray-400">-</span>}
                                        </div>
                                    </div>

                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-blue-800 dark:text-blue-400 font-medium shrink-0">
                                            {isTe ? "స్థాయి 3 (అధిపతి నక్షత్రం):" : "Level 3 (Lord's Star):"}
                                        </span>
                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {h.level3.length > 0 ? h.level3.map(p => (
                                                <span key={p} className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 text-[11px]">
                                                    {isTe ? getLocalizedPlanet(p, 'te') : p}
                                                </span>
                                            )) : <span className="text-gray-400">-</span>}
                                        </div>
                                    </div>

                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-purple-800 dark:text-purple-400 font-medium shrink-0">
                                            {isTe ? "స్థాయి 4 (భావాధిపతి):" : "Level 4 (House Lord):"}
                                        </span>
                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {h.level4.length > 0 ? h.level4.map(p => (
                                                <span key={p} className="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 text-[11px]">
                                                    {isTe ? getLocalizedPlanet(p, 'te') : p}
                                                </span>
                                            )) : <span className="text-gray-400">-</span>}
                                        </div>
                                    </div>

                                    {/* Drishti (Aspects on this House) */}
                                    <div className="flex items-start justify-between gap-2 pt-1 border-t border-gray-100 dark:border-white/5">
                                        <span className="text-teal-800 dark:text-teal-400 font-bold shrink-0">
                                            {isTe ? "దృష్టి గ్రహాలు (Drishti):" : "Aspecting Grahas:"}
                                        </span>
                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {(() => {
                                                const aspects = getHouseAspectDetails(h);
                                                return aspects && aspects.length > 0 ? aspects.map((asp, aIdx) => (
                                                    <span key={`${asp.planetKey}-${asp.span}-${aIdx}`} className="px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 font-bold text-[11px]">
                                                        {isTe ? getLocalizedPlanet(asp.planetKey, 'te') : asp.planetKey}
                                                        <span className="text-[9px] opacity-75 ml-0.5 font-mono">({asp.span})</span>
                                                    </span>
                                                )) : <span className="text-gray-400 italic text-[11px]">{isTe ? "లేదు" : "None"}</span>;
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Combined Footer (Levels 1-4 + Aspects, Deduplicated) */}
                                <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                        {isTe ? "మొత్తం కారక గ్రహాలు:" : "All Significators:"}
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {(() => {
                                            const aspectPlanets = (getHouseAspectDetails(h) || []).map(a => a.planetKey);
                                            const combined = Array.from(new Set([
                                                ...(h.allSignificators || []),
                                                ...(h.allSignificatorsWithAspects || []),
                                                ...(h.aspectedByPlanets || []),
                                                ...aspectPlanets
                                            ]));
                                            return combined.map(p => (
                                                <span key={p} className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                                                    {isTe ? getLocalizedPlanet(p, 'te') : p}
                                                </span>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                /* View 2: Planet Significations Table */
                <div className="overflow-x-auto rounded-2xl border border-orange-200/80 dark:border-white/10 shadow-sm">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-gradient-to-r from-amber-50 to-orange-50/60 dark:from-stone-900 dark:to-stone-950 border-b border-orange-200 dark:border-white/10 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px]">
                                <th className="py-3.5 px-4 font-bold">{t.graha}</th>
                                <th className="py-3.5 px-3 font-bold">{t.starLord}</th>
                                <th className="py-3.5 px-3 font-bold text-amber-600 dark:text-amber-400">{t.subLord}</th>
                                <th className="py-3.5 px-3 font-bold text-amber-700 dark:text-amber-400">{t.level1}</th>
                                <th className="py-3.5 px-3 font-bold text-orange-700 dark:text-orange-400">{t.level2}</th>
                                <th className="py-3.5 px-3 font-bold text-blue-700 dark:text-blue-400">{t.level3}</th>
                                <th className="py-3.5 px-3 font-bold text-purple-700 dark:text-purple-400">{t.level4}</th>
                                <th className="py-3.5 px-3 font-bold text-teal-700 dark:text-teal-400">{t.aspectedHousesHeader || (isTe ? "దృష్టి భావాలు" : "Aspected Houses")}</th>
                                <th className="py-3.5 px-4 font-bold bg-amber-500/10 text-amber-900 dark:text-amber-300">{t.planetSignifications}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {planetSignifications.map((p, index) => {
                                const isEven = index % 2 === 0;

                                return (
                                    <tr
                                        key={p.planetKey}
                                        className={`transition-colors hover:bg-orange-50/60 dark:hover:bg-white/5 ${
                                            isEven ? 'bg-white dark:bg-stone-900/60' : 'bg-orange-50/20 dark:bg-stone-950/40'
                                        }`}
                                    >
                                        <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                            {isTe ? getLocalizedPlanet(p.planetName || p.planetKey, 'te') : p.planetName}
                                        </td>
                                        <td className="py-3.5 px-3 text-purple-700 dark:text-purple-300 font-medium whitespace-nowrap">
                                            {isTe ? getLocalizedPlanet(p.starLord, 'te') : p.starLord}
                                        </td>
                                        <td className="py-3.5 px-3 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                            {isTe ? getLocalizedPlanet(p.subLord, 'te') : p.subLord}
                                        </td>
                                        <td className="py-3.5 px-3 font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                                            {p.level1Houses.length > 0 ? p.level1Houses.join(', ') : '-'}
                                        </td>
                                        <td className="py-3.5 px-3 font-bold text-orange-700 dark:text-orange-400 whitespace-nowrap">
                                            {p.level2Houses.length > 0 ? p.level2Houses.join(', ') : '-'}
                                        </td>
                                        <td className="py-3.5 px-3 text-blue-700 dark:text-blue-400 whitespace-nowrap">
                                            {p.level3Houses.length > 0 ? p.level3Houses.join(', ') : '-'}
                                        </td>
                                        <td className="py-3.5 px-3 text-purple-700 dark:text-purple-400 whitespace-nowrap">
                                            {p.level4Houses.length > 0 ? p.level4Houses.join(', ') : '-'}
                                        </td>
                                        {/* Aspected Houses */}
                                        <td className="py-3.5 px-3 font-bold text-teal-700 dark:text-teal-400 whitespace-nowrap">
                                            {(() => {
                                                const aspects = getPlanetAspectDetails(p);
                                                return aspects && aspects.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {aspects.map((asp, aIdx) => (
                                                            <span
                                                                key={`${asp.house}-${asp.span}-${aIdx}`}
                                                                className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/80 text-teal-900 dark:text-teal-200 text-xs font-bold border border-teal-300 dark:border-teal-700"
                                                                title={`${asp.aspectNameEn} on House ${asp.house}`}
                                                            >
                                                                H{asp.house}
                                                                <span className="text-[10px] opacity-75 font-mono ml-0.5">
                                                                    ({isTe ? `${asp.span}వ` : `${asp.span}th`})
                                                                </span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 font-mono text-sm">-</span>
                                                );
                                            })()}
                                        </td>
                                        <td className="py-3.5 px-4 font-bold whitespace-nowrap bg-amber-500/5">
                                            <div className="flex flex-wrap gap-1">
                                                {(() => {
                                                    const aspectHouses = (getPlanetAspectDetails(p) || []).map(a => a.house);
                                                    const combined = Array.from(new Set([
                                                        ...(p.allHouses || []),
                                                        ...(p.allHousesWithAspects || []),
                                                        ...aspectHouses
                                                    ])).sort((a, b) => a - b);
                                                    return combined.map(hNum => (
                                                        <span key={hNum} className="px-2.5 py-0.5 rounded-full bg-orange-600 text-white text-xs font-bold shadow-2xs">
                                                            {hNum}
                                                        </span>
                                                    ));
                                                })()}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
