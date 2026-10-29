import React, { useState, useMemo } from 'react';
import {
    Eye, Sparkles, Filter, Settings2, Info, ChevronDown, ChevronUp,
    CheckCircle2, AlertCircle, Compass, HelpCircle, ArrowRight
} from 'lucide-react';
import { formatDMS } from '../../utils/nakshatraUtils';
import {
    calculatePlanetaryAspects,
    ASPECT_CONVENTIONS,
    RAHU_KETU_ASPECT_MODES,
    ORB_MODES,
    CUSP_ORB_MODES,
    WESTERN_ASPECT_DEFINITIONS
} from '../../utils/kp/kpAspects';
import {
    KP_TRANSLATIONS,
    TELUGU_PLANET_SHORTS,
    getLocalizedPlanet
} from '../../utils/kpTranslations';

export const KPAspects = ({ kpResult, lang = 'te' }) => {
    const t = KP_TRANSLATIONS[lang] || KP_TRANSLATIONS.te;
    const isTe = lang === 'te';

    // Calculation Configuration State
    const [convention, setConvention] = useState(ASPECT_CONVENTIONS.KP_WESTERN);
    const [rahuKetuMode, setRahuKetuMode] = useState(RAHU_KETU_ASPECT_MODES.WESTERN_ASPECTS);
    const [orbMode, setOrbMode] = useState(ORB_MODES.STANDARD);
    const [cuspOrbMode, setCuspOrbMode] = useState(CUSP_ORB_MODES.STANDARD_5_00);
    const [includeCusps, setIncludeCusps] = useState(true);

    // Interactive Filters
    const [selectedPlanet, setSelectedPlanet] = useState('ALL');
    const [targetTypeFilter, setTargetTypeFilter] = useState('ALL'); // 'ALL' | 'planet' | 'cusp' | 'house'
    const [natureFilter, setNatureFilter] = useState('ALL'); // 'ALL' | 'benefic' | 'malefic' | 'neutral'
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showEducationalGuide, setShowEducationalGuide] = useState(false);
    const [expandedCardId, setExpandedCardId] = useState(null);

    // Recompute aspects dynamically when configuration options change
    const aspectData = useMemo(() => {
        if (!kpResult?.planets || !kpResult?.cusps) {
            return { aspects: [], summary: { total: 0, benefic: 0, malefic: 0, neutral: 0 } };
        }
        return calculatePlanetaryAspects(kpResult.planets, kpResult.cusps, {
            convention,
            rahuKetuMode,
            orbMode,
            cuspOrbMode,
            includeCusps
        });
    }, [kpResult, convention, rahuKetuMode, orbMode, cuspOrbMode, includeCusps]);

    // Apply client-side filters
    const filteredAspects = useMemo(() => {
        return aspectData.aspects.filter(asp => {
            // Planet filter (casting body)
            if (selectedPlanet !== 'ALL' && asp.castingBody.key !== selectedPlanet) {
                return false;
            }
            // Target type filter
            if (targetTypeFilter === 'planet' && asp.targetType !== 'planet') {
                return false;
            }
            if (targetTypeFilter === 'cusps' && asp.targetType !== 'cusp' && asp.targetType !== 'house') {
                return false;
            }
            // Nature filter
            if (natureFilter !== 'ALL' && asp.nature !== natureFilter) {
                return false;
            }
            return true;
        });
    }, [aspectData.aspects, selectedPlanet, targetTypeFilter, natureFilter]);

    const PLANET_FILTER_OPTIONS = [
        { key: 'ALL', en: 'All Planets', te: 'అన్ని గ్రహాలు' },
        { key: 'Sun', en: 'Sun', te: 'సూర్యుడు' },
        { key: 'Moon', en: 'Moon', te: 'చంద్రుడు' },
        { key: 'Mars', en: 'Mars', te: 'కుజుడు' },
        { key: 'Mercury', en: 'Mercury', te: 'బుధుడు' },
        { key: 'Jupiter', en: 'Jupiter', te: 'గురువు' },
        { key: 'Venus', en: 'Venus', te: 'శుక్రుడు' },
        { key: 'Saturn', en: 'Saturn', te: 'శని' },
        { key: 'Rahu', en: 'Rahu', te: 'రాహువు' },
        { key: 'Ketu', en: 'Ketu', te: 'కేతువు' }
    ];

    const getNatureBadge = (nature) => {
        if (nature === 'benefic') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {isTe ? "శుభకరం (Benefic)" : "Benefic"}
                </span>
            );
        }
        if (nature === 'malefic') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    {isTe ? "సవాలు / ప్రతికూలం (Challenging)" : "Challenging"}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {isTe ? "తటస్థం (Neutral)" : "Neutral"}
            </span>
        );
    };

    const getMotionBadge = (motion) => {
        if (motion === 'applying') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300" title={isTe ? "సమీపించే గతి: ఆర్బ్ తగ్గుతూ బలంగా మారుతోంది" : "Applying: Closing distance toward exact aspect"}>
                    <span className="text-[10px]">▶</span> {isTe ? "సమీపించే (Applying)" : "Applying"}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 dark:bg-stone-800 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400" title={isTe ? "దూరమయ్యే గతి: ఆర్బ్ పెరుగుతోంది" : "Separating: Moving away from exact aspect"}>
                <span className="text-[10px]">◀</span> {isTe ? "దూరమయ్యే (Separating)" : "Separating"}
            </span>
        );
    };

    return (
        <div className="space-y-6 font-telugu">

            {/* Header Title & Intro Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-indigo-500/10 border border-amber-200/80 dark:border-white/10 shadow-xs">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-300/80 dark:border-amber-700/50 flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isTe ? "కృష్ణమూర్తి పద్ధతి ఖగోళ దృష్టిలు" : "KP Astrological Drishti"}</span>
                        </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900 dark:text-white">
                        {t.aspectsTitle}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-3xl leading-relaxed">
                        {t.aspectsSubtitle}
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowEducationalGuide(!showEducationalGuide)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-stone-800 border border-amber-300/80 dark:border-white/10 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-white/5 transition-all shadow-xs cursor-pointer"
                    >
                        <HelpCircle className="w-4 h-4 text-amber-600" />
                        <span>{isTe ? "దృష్టి సూత్రాలు" : "Aspect Principles"}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer ${
                            showAdvanced
                                ? 'bg-amber-600 text-white border border-amber-700'
                                : 'bg-white dark:bg-stone-800 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <Settings2 className="w-4 h-4" />
                        <span>{isTe ? "సెట్టింగులు" : "Settings"}</span>
                    </button>
                </div>
            </div>

            {/* Educational Collapsible Guide */}
            {showEducationalGuide && (
                <div className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 text-sm sm:text-base">
                        <Info className="w-5 h-5 text-amber-600 shrink-0" />
                        <span>{t.eduTitle}</span>
                    </div>
                    <div className="text-xs sm:text-sm text-amber-950 dark:text-amber-200/90 space-y-2 leading-relaxed">
                        <p>{t.eduBody1}</p>
                        <p>{t.eduBody2}</p>
                    </div>
                </div>
            )}

            {/* Primary Aspect Convention Selector Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-2xl bg-gray-100/80 dark:bg-stone-850 border border-gray-200/80 dark:border-white/10">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {[
                        { id: ASPECT_CONVENTIONS.KP_WESTERN, label: t.kpWestern, icon: Compass },
                        { id: ASPECT_CONVENTIONS.VEDIC_SPECIAL, label: t.vedicSpecial, icon: Eye },
                        { id: ASPECT_CONVENTIONS.ALL, label: t.allConventions, icon: Sparkles }
                    ].map(tab => {
                        const active = convention === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setConvention(tab.id)}
                                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                                    active
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                                        : 'text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white/60 dark:hover:bg-white/5'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Summary Pill Counter */}
                <div className="flex items-center gap-2 self-end sm:self-center px-3 py-1.5 bg-white dark:bg-stone-800 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300">
                    <span>{t.aspectsCount}:</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-extrabold text-sm">
                        {filteredAspects.length}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-emerald-600 dark:text-emerald-400">✓ {aspectData.summary.benefic}</span>
                    <span className="text-rose-600 dark:text-rose-400">✗ {aspectData.summary.malefic}</span>
                </div>
            </div>

            {/* Advanced Settings Drawer (Configurable Rules) */}
            {showAdvanced && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Settings2 className="w-4 h-4 text-amber-500" />
                        <span>{isTe ? "ఖగోళ దృష్టి సెట్టింగులు & ఆర్బ్ పరిమితులు" : "Astronomical Aspect Configuration & Orbs"}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Orb Sensitivity */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                {t.orbSensitivity}
                            </label>
                            <select
                                value={orbMode}
                                onChange={(e) => setOrbMode(e.target.value)}
                                className="w-full text-xs sm:text-sm font-semibold p-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-stone-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-amber-500 outline-hidden"
                            >
                                <option value={ORB_MODES.STANDARD}>{t.orbStandard}</option>
                                <option value={ORB_MODES.TIGHT}>{t.orbTight}</option>
                                <option value={ORB_MODES.WIDE}>{t.orbWide}</option>
                            </select>
                        </div>

                        {/* Rahu / Ketu Aspect Rule */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                {t.rahuKetuSetting}
                            </label>
                            <select
                                value={rahuKetuMode}
                                onChange={(e) => setRahuKetuMode(e.target.value)}
                                className="w-full text-xs sm:text-sm font-semibold p-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-stone-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-amber-500 outline-hidden"
                            >
                                <option value={RAHU_KETU_ASPECT_MODES.WESTERN_ASPECTS}>{t.nodesDegree}</option>
                                <option value={RAHU_KETU_ASPECT_MODES.TRINE_5_9}>{t.nodesTrine}</option>
                                <option value={RAHU_KETU_ASPECT_MODES.SEVENTH_ONLY}>{t.nodesSeventh}</option>
                                <option value={RAHU_KETU_ASPECT_MODES.NONE}>{t.nodesNone}</option>
                            </select>
                        </div>

                        {/* Cusp Orb Limit (Configurable) */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                {t.cuspOrbMode}
                            </label>
                            <select
                                value={cuspOrbMode}
                                onChange={(e) => setCuspOrbMode(e.target.value)}
                                disabled={!includeCusps}
                                className="w-full text-xs sm:text-sm font-semibold p-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-stone-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-amber-500 outline-hidden disabled:opacity-50"
                            >
                                <option value={CUSP_ORB_MODES.STANDARD_5_00}>{t.cuspStandard}</option>
                                <option value={CUSP_ORB_MODES.NAVAMSHA_3_20}>{t.cuspNavamsha}</option>
                                <option value={CUSP_ORB_MODES.FULL_PLANETARY}>{t.cuspFull}</option>
                            </select>
                        </div>

                        {/* Include Placidus Cusps */}
                        <div className="flex flex-col justify-end">
                            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-stone-800 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={includeCusps}
                                    onChange={(e) => setIncludeCusps(e.target.checked)}
                                    className="w-4 h-4 text-amber-600 rounded-sm focus:ring-amber-500"
                                />
                                <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">
                                    {isTe ? "ప్లాసిడస్ భావ సంధులపై దృష్టిలు" : "Include Placidus House Cusps"}
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Interactive Filter Pills Strip */}
            <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
                {/* Planet Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-stone-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs shadow-2xs">
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-bold text-gray-600 dark:text-gray-400">{t.filterPlanet}:</span>
                    <select
                        value={selectedPlanet}
                        onChange={(e) => setSelectedPlanet(e.target.value)}
                        className="bg-transparent font-bold text-gray-800 dark:text-gray-200 outline-hidden cursor-pointer"
                    >
                        {PLANET_FILTER_OPTIONS.map(opt => (
                            <option key={opt.key} value={opt.key}>
                                {isTe ? opt.te : opt.en}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Target Type Filter */}
                <div className="flex items-center gap-1 bg-white dark:bg-stone-800 p-1 rounded-xl border border-gray-200 dark:border-white/10 text-xs">
                    {[
                        { id: 'ALL', label: t.allTargets },
                        { id: 'planet', label: t.planetsOnly },
                        { id: 'cusps', label: t.cuspsOnly }
                    ].map(btn => (
                        <button
                            key={btn.id}
                            type="button"
                            onClick={() => setTargetTypeFilter(btn.id)}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                targetTypeFilter === btn.id
                                    ? 'bg-amber-500 text-white shadow-2xs'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                            }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Nature Filter */}
                <div className="flex items-center gap-1 bg-white dark:bg-stone-800 p-1 rounded-xl border border-gray-200 dark:border-white/10 text-xs">
                    {[
                        { id: 'ALL', label: t.allNatures },
                        { id: 'benefic', label: isTe ? 'శుభ' : 'Benefic' },
                        { id: 'malefic', label: isTe ? 'సవాలు' : 'Challenging' },
                        { id: 'neutral', label: isTe ? 'తటస్థ' : 'Neutral' }
                    ].map(btn => (
                        <button
                            key={btn.id}
                            type="button"
                            onClick={() => setNatureFilter(btn.id)}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                natureFilter === btn.id
                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                            }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Empty state when filters yield no matches */}
            {filteredAspects.length === 0 && (
                <div className="p-8 text-center bg-gray-50 dark:bg-stone-800/40 rounded-2xl border border-gray-200 dark:border-white/10 space-y-3">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        {isTe ? "ఎంచుకున్న ఫిల్టర్లకు ఎటువంటి దృష్టిలు కనుగొనబడలేదు." : "No aspects match the selected criteria."}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedPlanet('ALL');
                            setTargetTypeFilter('ALL');
                            setNatureFilter('ALL');
                        }}
                        className="px-4 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-all cursor-pointer"
                    >
                        {isTe ? "ఫిల్టర్లు రీసెట్ చేయండి" : "Reset Filters"}
                    </button>
                </div>
            )}

            {/* Desktop Full Aspect Matrix Table */}
            {filteredAspects.length > 0 && (
                <div className="hidden lg:block overflow-x-auto rounded-2xl border border-amber-200/80 dark:border-white/10 shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-gradient-to-r from-amber-50 to-orange-50/60 dark:from-stone-900 dark:to-stone-950 border-b border-amber-200 dark:border-white/10 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-xs font-extrabold">
                                <th className="py-3.5 px-4 font-bold">{t.colCasting}</th>
                                <th className="py-3.5 px-3 font-bold">{t.colAspect}</th>
                                <th className="py-3.5 px-3 font-bold">{t.colTarget}</th>
                                <th className="py-3.5 px-3 font-bold">{t.colAngle}</th>
                                <th className="py-3.5 px-3 font-bold">{t.colMotion}</th>
                                <th className="py-3.5 px-3 font-bold">{t.colHouses}</th>
                                <th className="py-3.5 px-4 font-bold">{t.colExplanation}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {filteredAspects.map((asp, idx) => {
                                const isEven = idx % 2 === 0;
                                return (
                                    <tr
                                        key={asp.id || idx}
                                        className={`transition-colors hover:bg-amber-50/50 dark:hover:bg-white/5 ${
                                            isEven ? 'bg-white dark:bg-stone-900/60' : 'bg-amber-50/20 dark:bg-stone-950/40'
                                        }`}
                                    >
                                        {/* Casting Planet */}
                                        <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                                            <div className="flex items-center gap-2">
                                                <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 border border-amber-300/80 dark:border-amber-600/40 flex items-center justify-center text-xs text-amber-800 dark:text-amber-300 font-bold shrink-0">
                                                    {isTe ? (TELUGU_PLANET_SHORTS[asp.castingBody.key] || asp.castingBody.key.slice(0, 2)) : asp.castingBody.key.slice(0, 2)}
                                                </span>
                                                <div>
                                                    <span className="font-bold text-sm block">
                                                        {isTe ? asp.castingBody.te : asp.castingBody.name}
                                                    </span>
                                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono block">
                                                        {formatDMS(asp.castingBody.longitude)} ({isTe ? `${asp.castingHouse}వ భావం` : `H${asp.castingHouse}`})
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Aspect Type & Symbol */}
                                        <td className="py-3.5 px-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                                                        {asp.aspectSymbol}
                                                    </span>
                                                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                                                        {isTe ? asp.aspectNameTe : asp.aspectType}
                                                    </span>
                                                </div>
                                                <div>
                                                    {getNatureBadge(asp.nature)}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Receiving Target */}
                                        <td className="py-3.5 px-3">
                                            <div>
                                                <span className="font-bold text-sm text-gray-900 dark:text-white block">
                                                    {isTe ? asp.receivingBody.te : asp.receivingBody.name}
                                                </span>
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono block">
                                                    {formatDMS(asp.receivingBody.longitude)} ({isTe ? `${asp.targetHouse}వ భావం` : `H${asp.targetHouse}`})
                                                </span>
                                            </div>
                                        </td>

                                        {/* Angle & Orb */}
                                        <td className="py-3.5 px-3 font-mono text-xs">
                                            <div className="font-bold text-gray-800 dark:text-gray-200">
                                                {asp.nominalAngle}° ({formatDMS(asp.actualAngle)})
                                            </div>
                                            <div className="text-[11px] text-amber-700 dark:text-amber-400">
                                                {isTe ? "ఆర్బ్:" : "Orb:"} {asp.orbFormatted}
                                            </div>
                                        </td>

                                        {/* Motion */}
                                        <td className="py-3.5 px-3">
                                            {getMotionBadge(asp.motion)}
                                        </td>

                                        {/* Houses Span */}
                                        <td className="py-3.5 px-3">
                                            <div className="flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-gray-300">
                                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-stone-800 border border-gray-200 dark:border-white/10">
                                                    {isTe ? `${asp.castingHouse}వ` : `H${asp.castingHouse}`}
                                                </span>
                                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 border border-amber-300/60 dark:border-amber-700/50 text-amber-800 dark:text-amber-300">
                                                    {isTe ? `${asp.targetHouse}వ` : `H${asp.targetHouse}`}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">
                                                {isTe ? `${asp.relativeHouseSpan}వ దృష్టి స్థానం` : `${asp.relativeHouseSpan}th house span`}
                                            </span>
                                        </td>

                                        {/* Astrological Explanation */}
                                        <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-400 max-w-xs leading-relaxed">
                                            {isTe ? asp.descriptionTe : asp.descriptionEn}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Mobile / Tablet Responsive Aspect Cards (Visible < lg) */}
            <div className="lg:hidden space-y-3">
                {filteredAspects.map((asp, idx) => {
                    const isExpanded = expandedCardId === (asp.id || idx);
                    return (
                        <div
                            key={asp.id || idx}
                            className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-amber-200/80 dark:border-white/10 shadow-xs space-y-3"
                        >
                            {/* Card Top Row: Casting -> Receiving */}
                            <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-white/5 pb-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 border border-amber-300/80 dark:border-amber-600/40 flex items-center justify-center text-xs text-amber-800 dark:text-amber-300 font-bold shrink-0">
                                        {isTe ? (TELUGU_PLANET_SHORTS[asp.castingBody.key] || asp.castingBody.key.slice(0, 2)) : asp.castingBody.key.slice(0, 2)}
                                    </span>
                                    <div className="truncate">
                                        <span className="font-bold text-sm text-gray-900 dark:text-white truncate block">
                                            {isTe ? asp.castingBody.te : asp.castingBody.name}
                                        </span>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                                            {isTe ? `${asp.castingHouse}వ భావం` : `H${asp.castingHouse}`}
                                        </span>
                                    </div>
                                </div>

                                <ArrowRight className="w-4 h-4 text-amber-500 shrink-0" />

                                <div className="text-right min-w-0">
                                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate block">
                                        {isTe ? asp.receivingBody.te : asp.receivingBody.name}
                                    </span>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                                        {isTe ? `${asp.targetHouse}వ భావం` : `H${asp.targetHouse}`}
                                    </span>
                                </div>
                            </div>

                            {/* Card Middle: Aspect Type & Badges */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-1.5 font-bold">
                                    <span className="text-base text-amber-600 dark:text-amber-400">{asp.aspectSymbol}</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {isTe ? asp.aspectNameTe : asp.aspectType}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {getNatureBadge(asp.nature)}
                                    {getMotionBadge(asp.motion)}
                                </div>
                            </div>

                            {/* Card Sub-details: Separation, Orb, House span */}
                            <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-gray-50 dark:bg-stone-850 border border-gray-100 dark:border-white/5 font-mono">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-bold">
                                        {isTe ? "కోణ దూరం:" : "Angle:"}
                                    </span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200">
                                        {asp.nominalAngle}° ({formatDMS(asp.actualAngle)})
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-bold">
                                        {isTe ? "ఆర్బ్:" : "Orb:"}
                                    </span>
                                    <span className="font-bold text-amber-700 dark:text-amber-400">
                                        {asp.orbFormatted}
                                    </span>
                                </div>
                            </div>

                            {/* Expandable Explanation Button */}
                            <button
                                type="button"
                                onClick={() => setExpandedCardId(isExpanded ? null : (asp.id || idx))}
                                className="w-full pt-1 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-bold hover:underline cursor-pointer"
                            >
                                <span>{isTe ? "జ్యోతిష్య వివరణ" : "Astrological Meaning"}</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {isExpanded && (
                                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                                    {isTe ? asp.descriptionTe : asp.descriptionEn}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
