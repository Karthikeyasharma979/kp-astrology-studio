import React, { useState, useMemo } from 'react';
import {
    Clock, Calendar, Sparkles, ChevronDown, ChevronUp, CheckCircle2,
    Layers, Info, Shield, ArrowRight, RotateCcw, Filter, Compass,
    Eye, X, ExternalLink, HelpCircle
} from 'lucide-react';
import { formatDMS } from '../../utils/nakshatraUtils';
import {
    calculateVimshottariDasha,
    getActivePeriods,
    formatDashaDuration,
    buildPlanetaryKPDetails,
    DASHA_YEAR_DAYS,
    VIMSHOTTARI_PLANETS
} from '../../utils/kp/vimshottariDasha';
import {
    KP_TRANSLATIONS,
    getLocalizedPlanet,
    getLocalizedNakshatra
} from '../../utils/kpTranslations';

// Distinct astrological gradient accents for the 9 Vimshottari lords
const PLANET_COLORS = {
    Ketu: { bg: 'bg-stone-100 dark:bg-stone-800', border: 'border-stone-400', text: 'text-stone-700 dark:text-stone-300', dot: 'bg-stone-500' },
    Venus: { bg: 'bg-pink-50 dark:bg-pink-950/40', border: 'border-pink-300 dark:border-pink-800', text: 'text-pink-700 dark:text-pink-300', dot: 'bg-pink-500' },
    Sun: { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' },
    Moon: { bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-300 dark:border-sky-800', text: 'text-sky-700 dark:text-sky-300', dot: 'bg-sky-400' },
    Mars: { bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-300 dark:border-red-800', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
    Rahu: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-300 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500' },
    Jupiter: { bg: 'bg-yellow-50 dark:bg-yellow-950/40', border: 'border-yellow-300 dark:border-yellow-800', text: 'text-yellow-800 dark:text-yellow-300', dot: 'bg-yellow-500' },
    Saturn: { bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-300 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-600' },
    Mercury: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-300 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' }
};

// Compact, accessible Bhava (House Significations) chips/badges
const BhavaChips = ({
    houses = [],
    isTe,
    t,
    size = 'default', // 'hero' | 'default' | 'compact' | 'micro'
    emptyText = '--',
    prefix = null
}) => {
    if (!houses || !Array.isArray(houses) || houses.length === 0) {
        return (
            <div className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-gray-400 font-mono italic">
                {prefix && <span className="font-sans font-bold not-italic mr-0.5">{prefix}:</span>}
                <span>{emptyText}</span>
            </div>
        );
    }

    const sizeClasses = {
        hero: 'px-2 py-0.5 text-xs rounded-md',
        default: 'px-1.5 py-0.5 text-xs rounded-md',
        compact: 'px-1.5 py-0.2 text-[11px] rounded-md',
        micro: 'px-1 py-0.1 text-[10px] rounded'
    }[size] || 'px-1.5 py-0.5 text-xs rounded-md';

    return (
        <div className="inline-flex flex-wrap items-center gap-1 font-mono select-none">
            {prefix && (
                <span className="text-[10px] sm:text-xs font-sans font-bold text-amber-900/80 dark:text-amber-300 mr-0.5">
                    {prefix}:
                </span>
            )}
            {houses.map((houseNum) => (
                <span
                    key={`bhava-${houseNum}`}
                    className={`inline-flex items-center font-bold bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 shadow-2xs ${sizeClasses}`}
                    title={isTe ? `${houseNum}వ భావ కారకత్వం` : `House ${houseNum} Signification`}
                >
                    {houseNum}
                </span>
            ))}
        </div>
    );
};

// Comprehensive 4-Tier Significations Panel for an Expanded Dasha Period
const DashaSignificationsPanel = ({
    kpDetails,
    planetKey,
    periodLabel,
    isTe,
    t
}) => {
    if (!kpDetails || !kpDetails.isAvailable) {
        return (
            <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-stone-850/60 border border-gray-200/60 dark:border-white/5 text-xs text-gray-400 italic">
                {t.noSignifications || "కారకత్వ వివరాలు లభ్యం కాలేదు."}
            </div>
        );
    }

    const sig = kpDetails.significations || {};
    const planetHouses = sig.planet?.primaryHouses || [];
    const stlHouses = sig.stl?.primaryHouses || [];
    const subHouses = sig.sub?.primaryHouses || [];
    const sslHouses = sig.ssl?.primaryHouses || [];

    const stlLord = kpDetails.stl;
    const subLord = kpDetails.sub;
    const sslLord = kpDetails.ssl;

    return (
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-3 font-sans shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/50 dark:border-amber-900/30 pb-2">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs uppercase tracking-wider font-bold text-amber-900 dark:text-amber-300 font-telugu">
                        {t.dashaSignificationsTitle || "KP భావ కారకత్వాలు"}
                    </span>
                    {periodLabel && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold">
                            {periodLabel}
                        </span>
                    )}
                </div>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                    {planetKey} • {isTe ? getLocalizedPlanet(planetKey, 'te') : planetKey}
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* 1. Planet Significations (BHAVA) */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-stone-850 border border-amber-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                            <span className="font-telugu truncate">
                                {isTe ? `${getLocalizedPlanet(planetKey, 'te')} భావాలు:` : `${planetKey} (BHAVA):`}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 shrink-0">
                                BHAVA
                            </span>
                        </div>
                        <div className="py-1">
                            <BhavaChips
                                houses={planetHouses}
                                isTe={isTe}
                                t={t}
                                size="default"
                                emptyText={t.noSignifications || "None"}
                            />
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono block mt-1.5 pt-1 border-t border-gray-100 dark:border-white/5">
                        {isTe ? "దశాధిపతి ప్రత్యక్ష కారకత్వాలు" : "Dasha planet significations"}
                    </span>
                </div>

                {/* 2. Star Lord Significations */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-stone-850 border border-blue-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-blue-900 dark:text-blue-300 mb-1.5">
                            <span className="font-telugu truncate">
                                {t.stlSignifications || "నక్షత్రాధిపతి"}:
                                <span className="ml-1 text-gray-900 dark:text-white font-mono">{isTe ? getLocalizedPlanet(stlLord, 'te') : stlLord}</span>
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 shrink-0">
                                STL
                            </span>
                        </div>
                        <div className="py-1">
                            <BhavaChips
                                houses={stlHouses}
                                isTe={isTe}
                                t={t}
                                size="default"
                                emptyText={t.noSignifications || "None"}
                            />
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono block mt-1.5 pt-1 border-t border-gray-100 dark:border-white/5">
                        {isTe ? "నక్షత్రాధిపతి కారకత్వ భావాలు" : "Star Lord significations"}
                    </span>
                </div>

                {/* 3. Sub Lord Significations */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-stone-850 border border-purple-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 dark:text-purple-300 mb-1.5">
                            <span className="font-telugu truncate">
                                {t.subSignifications || "సబ్ లార్డ్"}:
                                <span className="ml-1 text-gray-900 dark:text-white font-mono">{isTe ? getLocalizedPlanet(subLord, 'te') : subLord}</span>
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-300 shrink-0">
                                SUB
                            </span>
                        </div>
                        <div className="py-1">
                            <BhavaChips
                                houses={subHouses}
                                isTe={isTe}
                                t={t}
                                size="default"
                                emptyText={t.noSignifications || "None"}
                            />
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono block mt-1.5 pt-1 border-t border-gray-100 dark:border-white/5">
                        {isTe ? "సబ్ లార్డ్ కారకత్వ భావాలు" : "Sub Lord significations"}
                    </span>
                </div>

                {/* 4. Sub-Sub Lord Significations */}
                <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-stone-850 border border-amber-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-300 mb-1.5">
                            <span className="font-telugu truncate">
                                {t.sslSignifications || "సబ్-సబ్ లార్డ్"}:
                                <span className="ml-1 text-gray-900 dark:text-white font-mono">{isTe ? getLocalizedPlanet(sslLord, 'te') : sslLord}</span>
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 shrink-0">
                                SSL
                            </span>
                        </div>
                        <div className="py-1">
                            <BhavaChips
                                houses={sslHouses}
                                isTe={isTe}
                                t={t}
                                size="default"
                                emptyText={t.noSignifications || "None"}
                            />
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono block mt-1.5 pt-1 border-t border-gray-100 dark:border-white/5">
                        {isTe ? "సబ్-సబ్ లార్డ్ కారకత్వ భావాలు" : "Sub-Sub Lord significations"}
                    </span>
                </div>
            </div>
        </div>
    );
};

// Compact, accessible KP hierarchy badges (STL, SUB, SSL, ASP)
const KPBadgeCluster = ({
    kpDetails,
    planetKey,
    onInspectAspects,
    isTe,
    t,
    size = 'default' // 'hero' | 'default' | 'compact' | 'micro'
}) => {
    if (!kpDetails || !kpDetails.isAvailable) {
        return (
            <div className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-gray-400 font-mono">
                <span>STL: --</span>
                <span>•</span>
                <span>SUB: --</span>
                <span>•</span>
                <span>SSL: --</span>
                <span>•</span>
                <span>ASP: --</span>
            </div>
        );
    }

    const { stl, sub, ssl, aspects } = kpDetails;
    const aspectCount = aspects?.totalCount ?? 0;

    const sizeClasses = {
        hero: {
            pill: 'px-2 py-0.5 text-xs rounded-md',
            aspBtn: 'px-2 py-0.5 text-xs rounded-md',
            text: 'text-xs'
        },
        default: {
            pill: 'px-2 py-0.5 text-xs rounded-md',
            aspBtn: 'px-2 py-0.5 text-xs rounded-md',
            text: 'text-xs'
        },
        compact: {
            pill: 'px-1.5 py-0.5 text-[11px] rounded-md',
            aspBtn: 'px-1.5 py-0.5 text-[11px] rounded-md',
            text: 'text-[11px]'
        },
        micro: {
            pill: 'px-1 py-0.2 text-[10px] rounded',
            aspBtn: 'px-1 py-0.2 text-[10px] rounded',
            text: 'text-[10px]'
        }
    }[size] || {
        pill: 'px-1.5 py-0.5 text-xs rounded-md',
        aspBtn: 'px-1.5 py-0.5 text-xs rounded-md',
        text: 'text-xs'
    };

    return (
        <div className="inline-flex flex-wrap items-center gap-1 sm:gap-1.5 font-mono select-none">
            {/* Star Lord (STL) */}
            <span
                className={`inline-flex items-center font-bold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-blue-900 dark:text-blue-300 ${sizeClasses.pill}`}
                title={t.stlTooltip || "Star Lord: Ruling planet of the Nakshatra occupied by this Dasha lord"}
            >
                <span className="text-[10px] opacity-75 mr-1 font-sans">{t.stlLabel || "STL"}:</span>
                <span>{isTe ? getLocalizedPlanet(stl, 'te') : stl}</span>
            </span>

            {/* Sub Lord (SUB) */}
            <span
                className={`inline-flex items-center font-bold bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/40 text-purple-900 dark:text-purple-300 ${sizeClasses.pill}`}
                title={t.subTooltip || "KP Sub Lord: Unequal Vimshottari subdivision lord for this planet's longitude"}
            >
                <span className="text-[10px] opacity-75 mr-1 font-sans">{t.subLabel || "SUB"}:</span>
                <span>{isTe ? getLocalizedPlanet(sub, 'te') : sub}</span>
            </span>

            {/* Sub-Sub Lord (SSL) */}
            <span
                className={`inline-flex items-center font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-300 ${sizeClasses.pill}`}
                title={t.sslTooltip || "KP Sub-Sub Lord: Tertiary subdivision lord for fine-timing analysis"}
            >
                <span className="text-[10px] opacity-75 mr-1 font-sans">{t.sslLabel || "SSL"}:</span>
                <span>{isTe ? getLocalizedPlanet(ssl, 'te') : ssl}</span>
            </span>

            {/* Aspects (ASP) */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    if (onInspectAspects) onInspectAspects(planetKey, kpDetails);
                }}
                className={`inline-flex items-center font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer shadow-2xs ${sizeClasses.aspBtn}`}
                title={`${t.aspTooltip || "KP Aspects: Aspects formed by this planet according to the established KP aspect system"}. Click to view details.`}
            >
                <span className="text-[10px] opacity-75 mr-1 font-sans">{t.aspLabel || "ASP"}:</span>
                <span>{aspectCount}</span>
                <Eye className="w-3 h-3 ml-1 text-emerald-600 dark:text-emerald-400" />
            </button>
        </div>
    );
};

// Detailed Glassmorphism Modal displaying complete KP Astrological & Aspect Details for a Planet
const KPAspectsModal = ({ planetKey, kpDetails, onClose, isTe, t }) => {
    if (!planetKey || !kpDetails) return null;

    const { stl, sub, ssl, aspects, longitude, longitudeDMS, sign, nakshatra, pada } = kpDetails;
    const aspectCount = aspects?.totalCount ?? 0;
    const planetAspects = aspects?.planets || [];
    const cuspAspects = aspects?.cusps || [];

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 to-purple-50/60 dark:from-stone-850 dark:to-stone-900">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-bold flex items-center justify-center shadow-sm">
                            <Compass className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-serif font-bold text-lg sm:text-xl text-gray-900 dark:text-white">
                                    {isTe ? getLocalizedPlanet(planetKey, 'te') : planetKey} {t.kpAstrologicalDetails || "KP జ్యోతిష్య వివరాలు"}
                                </h3>
                                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300">
                                    {planetKey}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                                {longitudeDMS} ({Number(longitude).toFixed(4)}°) • {sign} • {isTe ? getLocalizedNakshatra(nakshatra, 'te') : nakshatra} (Pada {pada})
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* KP Hierarchy Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-gray-50/80 dark:bg-stone-900/60 border-b border-gray-100 dark:border-white/5 font-mono text-center">
                    <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/30">
                        <span className="text-[10px] uppercase font-sans font-bold text-blue-700 dark:text-blue-400 block mb-0.5">
                            {t.stlLabel || "STL"}
                        </span>
                        <span className="font-bold text-sm sm:text-base text-blue-900 dark:text-blue-200">
                            {isTe ? getLocalizedPlanet(stl, 'te') : stl}
                        </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/30">
                        <span className="text-[10px] uppercase font-sans font-bold text-purple-700 dark:text-purple-400 block mb-0.5">
                            {t.subLabel || "SUB"}
                        </span>
                        <span className="font-bold text-sm sm:text-base text-purple-900 dark:text-purple-200">
                            {isTe ? getLocalizedPlanet(sub, 'te') : sub}
                        </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/30">
                        <span className="text-[10px] uppercase font-sans font-bold text-amber-700 dark:text-amber-400 block mb-0.5">
                            {t.sslLabel || "SSL"}
                        </span>
                        <span className="font-bold text-sm sm:text-base text-amber-900 dark:text-amber-200">
                            {isTe ? getLocalizedPlanet(ssl, 'te') : ssl}
                        </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/30">
                        <span className="text-[10px] uppercase font-sans font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                            {t.aspLabel || "ASP"}
                        </span>
                        <span className="font-bold text-sm sm:text-base text-emerald-900 dark:text-emerald-200">
                            {aspectCount}
                        </span>
                    </div>
                </div>

                {/* Modal Scrollable Body: Aspect Details & Significations */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
                    {/* 4-Fold KP House Significations Section */}
                    <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/30 space-y-3 font-sans">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-gray-900 dark:text-white font-telugu text-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span>{t.planetSignificationsTitle || "గ్రహ భావ కారకత్వాలు (KP House Significations)"}</span>
                            </h4>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200">
                                {planetKey}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-white dark:bg-stone-850 border border-gray-200/70 dark:border-white/5">
                                <span className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                                    {isTe ? "గ్రహ ప్రాథమిక భావాలు (Primary Houses):" : "Primary Signified Houses (Levels 1-4):"}
                                </span>
                                <BhavaChips houses={kpDetails.significations?.primaryHouses} isTe={isTe} t={t} size="default" emptyText={t.noSignifications || "None"} />
                            </div>

                            <div className="p-2.5 rounded-lg bg-white dark:bg-stone-850 border border-gray-200/70 dark:border-white/5">
                                <span className="font-bold text-blue-800 dark:text-blue-300 block mb-1">
                                    {t.stlSignifications || "Star Lord Significations"} ({kpDetails.stl}):
                                </span>
                                <BhavaChips houses={kpDetails.significations?.stl?.primaryHouses} isTe={isTe} t={t} size="default" emptyText={t.noSignifications || "None"} />
                            </div>

                            <div className="p-2.5 rounded-lg bg-white dark:bg-stone-850 border border-gray-200/70 dark:border-white/5">
                                <span className="font-bold text-purple-800 dark:text-purple-300 block mb-1">
                                    {t.subSignifications || "Sub Lord Significations"} ({kpDetails.sub}):
                                </span>
                                <BhavaChips houses={kpDetails.significations?.sub?.primaryHouses} isTe={isTe} t={t} size="default" emptyText={t.noSignifications || "None"} />
                            </div>

                            <div className="p-2.5 rounded-lg bg-white dark:bg-stone-850 border border-gray-200/70 dark:border-white/5">
                                <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">
                                    {t.sslSignifications || "Sub-Sub Lord Significations"} ({kpDetails.ssl}):
                                </span>
                                <BhavaChips houses={kpDetails.significations?.ssl?.primaryHouses} isTe={isTe} t={t} size="default" emptyText={t.noSignifications || "None"} />
                            </div>
                        </div>
                    </div>

                    {/* Method Description Note */}
                    <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 font-telugu">
                        <span className="font-bold block mb-0.5">
                            {isTe ? "KP దృష్టి పద్ధతి (KP Aspect Method):" : "KP Aspect Method:"}
                        </span>
                        <span>{aspects?.method}</span>
                    </div>

                    {/* Aspects on Planets Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-gray-900 dark:text-white font-telugu text-sm">
                                {t.aspectsOnPlanets || "ఇతర గ్రహాలపై దృష్టి కోణాలు"} ({planetAspects.length})
                            </h4>
                        </div>

                        {planetAspects.length === 0 ? (
                            <p className="text-gray-400 italic text-xs p-3 rounded-lg bg-gray-50 dark:bg-stone-850">
                                {t.noAspectsFound || "ఏ దృష్టి కోణాలు లేవు."}
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {planetAspects.map((asp, idx) => (
                                    <div
                                        key={`pl-asp-${idx}`}
                                        className="p-2.5 rounded-xl border border-gray-200/70 dark:border-white/5 bg-gray-50/60 dark:bg-stone-850/60 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 font-bold text-xs flex items-center justify-center">
                                                {asp.target?.substring(0, 2)}
                                            </span>
                                            <div>
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {isTe ? getLocalizedPlanet(asp.target, 'te') : asp.target}
                                                </span>
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-mono">
                                                    {asp.type} ({asp.targetAngle}°)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right font-mono">
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
                                                {asp.orbFormatted || `${asp.orb?.toFixed(2)}°`}
                                            </span>
                                            <span className="text-[10px] text-gray-400 uppercase">
                                                {asp.isApplying ? (isTe ? "చేరుతున్నది" : "Applying") : (isTe ? "విడిపోతున్నది" : "Separating")}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Aspects on House Cusps Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-gray-900 dark:text-white font-telugu text-sm">
                                {t.aspectsOnCusps || "భావ ముఖాలపై దృష్టి కోణాలు"} ({cuspAspects.length})
                            </h4>
                        </div>

                        {cuspAspects.length === 0 ? (
                            <p className="text-gray-400 italic text-xs p-3 rounded-lg bg-gray-50 dark:bg-stone-850">
                                {t.noAspectsFound || "ఏ దృష్టి కోణాలు లేవు."}
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {cuspAspects.map((asp, idx) => (
                                    <div
                                        key={`cusp-asp-${idx}`}
                                        className="p-2.5 rounded-xl border border-gray-200/70 dark:border-white/5 bg-gray-50/60 dark:bg-stone-850/60 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center font-mono">
                                                C{asp.cusp}
                                            </span>
                                            <div>
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {isTe ? `${asp.cusp}వ భావం` : `Cusp ${asp.cusp}`}
                                                </span>
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-mono">
                                                    {asp.type} ({asp.targetAngle}°)
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right font-mono">
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
                                                {asp.orbFormatted || `${asp.orb?.toFixed(2)}°`}
                                            </span>
                                            <span className="text-[10px] text-gray-400 uppercase">
                                                {asp.isApplying ? (isTe ? "చేరుతున్నది" : "Applying") : (isTe ? "విడిపోతున్నది" : "Separating")}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-stone-900 text-right">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                    >
                        {isTe ? "ముగించు" : "Done"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const VimshottariDasha = ({ kpResult, lang = 'te', birthDetails = {}, initialDate = null }) => {
    const t = KP_TRANSLATIONS[lang] || KP_TRANSLATIONS.te;
    const isTe = lang === 'te';

    // Format helper for dates: DD MMM YYYY
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = String(d.getUTCDate()).padStart(2, '0');
            const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthsTe = ['జన', 'ఫిబ్ర', 'మార్చి', 'ఏప్రి', 'మే', 'జూన్', 'జూలై', 'ఆగ', 'సెప్టెం', 'అక్టో', 'నవం', 'డిసెం'];
            const monthStr = isTe ? monthsTe[d.getUTCMonth()] : monthsEn[d.getUTCMonth()];
            const year = d.getUTCFullYear();
            return `${day} ${monthStr} ${year}`;
        } catch {
            return dateStr;
        }
    };

    // Reference Date State (defaults to initialDate if provided, or current local date YYYY-MM-DD)
    const todayStr = useMemo(() => {
        const now = initialDate ? new Date(initialDate) : new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }, [initialDate]);

    const [refDateInput, setRefDateInput] = useState(todayStr);

    React.useEffect(() => {
        if (initialDate) {
            try {
                const d = new Date(initialDate);
                if (!isNaN(d.getTime())) {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const dt = String(d.getDate()).padStart(2, '0');
                    setRefDateInput(`${y}-${m}-${dt}`);
                }
            } catch {}
        }
    }, [initialDate]);

    const [expandedMahaId, setExpandedMahaId] = useState(null);
    const [expandedAntarId, setExpandedAntarId] = useState(null);
    const [showAuditPanel, setShowAuditPanel] = useState(false);
    const [inspectedPlanet, setInspectedPlanet] = useState(null);

    const handleInspectAspects = (planetKey, details) => {
        setInspectedPlanet({ key: planetKey, details });
    };

    // Compute or reuse Vimshottari Dasha dataset with planetary KP metadata
    const dashaData = useMemo(() => {
        const moon = kpResult?.planets?.find(p => p.key === 'Moon') || kpResult?.moonPosition;
        const moonLon = moon ? moon.longitude : null;
        const utcDate = kpResult?.metadata?.utcDate;

        if (moonLon == null || !utcDate) {
            return null;
        }

        // If pre-computed dasha is already present in kpResult, reuse it with active period query
        if (kpResult.dasha && kpResult.dasha.mahadashas) {
            const active = getActivePeriods(kpResult.dasha.mahadashas, new Date(refDateInput), new Date(utcDate).getTime());
            const planetaryKPDetails = kpResult.dasha.planetaryKPDetails || buildPlanetaryKPDetails({
                planets: kpResult.planets,
                cusps: kpResult.cusps,
                aspects: kpResult.aspects,
                significators: kpResult.significators
            });
            return {
                ...kpResult.dasha,
                planetaryKPDetails,
                activePeriods: active
            };
        }

        // Calculate dynamically
        return calculateVimshottariDasha({
            moonSiderealLongitude: moonLon,
            birthDateUtc: utcDate,
            referenceDate: refDateInput,
            planets: kpResult.planets,
            cusps: kpResult.cusps,
            aspects: kpResult.aspects,
            significators: kpResult.significators
        });
    }, [kpResult, refDateInput]);

    // Automatically expand the running Mahadasha and Antardasha on initial load or reference date change
    React.useEffect(() => {
        if (dashaData?.activePeriods?.mahadasha) {
            setExpandedMahaId(dashaData.activePeriods.mahadasha.id);
            if (dashaData.activePeriods.antardasha) {
                setExpandedAntarId(dashaData.activePeriods.antardasha.id);
            }
        }
    }, [dashaData?.activePeriods?.mahadasha?.id]);

    if (!dashaData) {
        return (
            <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-gray-200 dark:border-white/10">
                <p className="text-gray-500 dark:text-gray-400 font-telugu">
                    {isTe ? "చంద్రుని స్థానం అందుబాటులో లేదు. దయచేసి కుండలిని తిరిగి లెక్కించండి." : "Moon planetary coordinates unavailable for Dasha calculation."}
                </p>
            </div>
        );
    }

    const { balanceInfo, activePeriods, mahadashas, calculationDetails } = dashaData;
    const refTargetMs = new Date(refDateInput).getTime();

    // Toggle Mahadasha expansion
    const handleToggleMaha = (id) => {
        setExpandedMahaId(prev => prev === id ? null : id);
    };

    // Toggle Antardasha expansion
    const handleToggleAntar = (id) => {
        setExpandedAntarId(prev => prev === id ? null : id);
    };

    return (
        <div className="space-y-6 sm:space-y-8 font-sans">

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/10">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/40 text-purple-900 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>{t.tabDasha || "Vimshottari Dasha"}</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-950 dark:text-white font-telugu">
                        {t.dashaTitle || "వింశోత్తరి దశ కాలచక్రం"}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-telugu mt-1 leading-relaxed">
                        {t.dashaSubtitle || "120 సంవత్సరాల మహర్దశ, అంతర్దశ మరియు ప్రత్యంతర్దశల సమగ్ర ఖగోళ కాలరేఖ."}
                    </p>
                </div>

                {/* Reference Date Picker Control */}
                <div className="bg-gray-50 dark:bg-stone-800/70 p-3 rounded-2xl border border-gray-200/80 dark:border-white/10 flex flex-col gap-1.5 min-w-[260px]">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300 font-telugu">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-amber-400" />
                            {t.referenceDateLabel || "సమీక్ష తేదీ"}
                        </span>
                        {refDateInput !== todayStr && (
                            <button
                                type="button"
                                onClick={() => setRefDateInput(todayStr)}
                                className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-amber-400 hover:underline cursor-pointer"
                                title="Reset to today"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>{t.todayBtn || "ఈరోజు"}</span>
                            </button>
                        )}
                    </div>
                    <input
                        type="date"
                        value={refDateInput}
                        onChange={(e) => setRefDateInput(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-gray-300 dark:border-white/15 text-sm font-mono font-bold text-gray-900 dark:text-gray-100 shadow-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            {/* Section A: 4 Hero Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 font-telugu">

                {/* Card 1: Birth Star & Lord */}
                <div className="relative bg-white dark:bg-stone-900/90 p-4 sm:p-5 rounded-2xl border border-indigo-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between min-h-[140px]">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-2xl" />
                    <div>
                        <span className="text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block mb-1">
                            {t.birthNakshatra || "జన్మ నక్షత్రం"}
                        </span>
                        <div className="font-serif font-bold text-xl sm:text-2xl text-gray-900 dark:text-white leading-tight">
                            {isTe ? getLocalizedNakshatra(balanceInfo.nakshatraName, 'te') : balanceInfo.nakshatraName}
                        </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{t.nakshatraLord || "నక్షత్రాధిపతి"}:</span>
                        <span className="font-bold font-mono text-indigo-700 dark:text-indigo-400">
                            {isTe ? getLocalizedPlanet(balanceInfo.starLord, 'te') : balanceInfo.starLord}
                        </span>
                    </div>
                </div>

                {/* Card 2: Birth Dasha Balance */}
                <div className="relative bg-white dark:bg-stone-900/90 p-4 sm:p-5 rounded-2xl border border-amber-300/80 dark:border-white/10 shadow-xs flex flex-col justify-between min-h-[140px]">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl" />
                    <div>
                        <span className="text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block mb-1">
                            {t.birthDashaBalance || "జన్మ కాల శేష దశ"}
                        </span>
                        <div className="font-serif font-bold text-xl sm:text-2xl text-amber-600 dark:text-amber-400 leading-tight">
                            {balanceInfo.balanceFormatted.formatted}
                        </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                            {isTe ? "మొదటి మహర్దశ:" : "First Mahadasha:"}
                        </span>
                        <span className="font-bold text-amber-800 dark:text-amber-300">
                            {isTe ? getLocalizedPlanet(balanceInfo.starLord, 'te') : balanceInfo.starLord} ({balanceInfo.fullLordYears}y)
                        </span>
                    </div>
                </div>

                {/* Card 3: Currently Running Dasha Hierarchy */}
                <div className="relative bg-white dark:bg-stone-900/90 p-4 sm:p-5 rounded-2xl border border-purple-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between min-h-[140px]">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-2xl" />
                    <div>
                        <span className="text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block mb-1 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-purple-500" />
                            {t.runningDasha || "నడుస్తున్న దశ"}
                        </span>
                        <div className="font-serif font-bold text-lg sm:text-xl text-purple-700 dark:text-purple-300 leading-tight truncate" title={activePeriods.summaryText}>
                            {activePeriods.status === 'active' ? (
                                <span className="flex items-center gap-1">
                                    <span>{isTe ? getLocalizedPlanet(activePeriods.mahadasha?.lord, 'te') : activePeriods.mahadasha?.lord}</span>
                                    <span className="text-gray-400">&bull;</span>
                                    <span>{isTe ? getLocalizedPlanet(activePeriods.antardasha?.lord, 'te') : activePeriods.antardasha?.lord}</span>
                                    <span className="text-gray-400">&bull;</span>
                                    <span className="text-xs sm:text-sm font-sans">{isTe ? getLocalizedPlanet(activePeriods.pratyantardasha?.lord, 'te') : activePeriods.pratyantardasha?.lord}</span>
                                </span>
                            ) : (
                                activePeriods.summaryText
                            )}
                        </div>

                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono">
                        <span>{isTe ? "సమీక్ష:" : "As of:"}</span>
                        <span className="font-bold">{formatDate(refDateInput)}</span>
                    </div>
                </div>

                {/* Card 4: Moon Sidereal Longitude */}
                <div className="relative bg-white dark:bg-stone-900/90 p-4 sm:p-5 rounded-2xl border border-emerald-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between min-h-[140px]">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-t-2xl" />
                    <div>
                        <span className="text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block mb-1">
                            {t.moonSiderealLon || "చంద్రుని రేఖాంశం"}
                        </span>
                        <div className="font-serif font-bold text-xl sm:text-2xl text-emerald-700 dark:text-emerald-400 leading-tight font-mono">
                            {formatDMS(balanceInfo.moonLongitude)}
                        </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <span>{isTe ? "మిగిలిన భాగం:" : "Remaining:"}</span>
                        <span className="font-bold font-mono text-emerald-800 dark:text-emerald-300">
                            {(balanceInfo.remainingFraction * 100).toFixed(2)}%
                        </span>
                    </div>
                </div>

            </div>

            {/* Section B: Complete Mahadasha Timeline with Expandable Subperiods */}
            <div className="bg-white/95 dark:bg-stone-900/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-indigo-100/90 dark:border-white/10 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-100 dark:border-white/10">
                    <div>
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-gray-900 dark:text-white font-telugu flex items-center gap-2">
                            <Layers className="w-5 h-5 text-indigo-600 dark:text-amber-400" />
                            <span>{t.mahadashaTimeline || "120 సంవత్సరాల మహర్దశ కాలరేఖ"}</span>
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-telugu mt-0.5">
                            {isTe
                                ? "మహర్దశపై నొక్కి అంతర్దశలను, అంతర్దశపై నొక్కి ప్రత్యంతర్దశలను విస్తరించండి."
                                : "Click on any Mahadasha to inspect Antardashas (Bhuktis), and on an Antardasha for Pratyantardashas."}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs font-bold font-telugu">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span>{isTe ? "నడుస్తున్న కాలం హైలైట్ చేయబడింది" : "Running Period Highlighted"}</span>
                        </span>
                    </div>
                </div>

                {/* Mahadasha Accordion List */}
                <div className="space-y-3 font-telugu">
                    {mahadashas.map((md, mdIdx) => {
                        const isExpanded = expandedMahaId === md.id;
                        const isRunning = refTargetMs >= md.startMs && refTargetMs < md.endMs;
                        const isPassed = refTargetMs >= md.endMs;
                        const colorStyle = PLANET_COLORS[md.lord] || PLANET_COLORS.Sun;

                        return (
                            <div
                                key={md.id}
                                className={`rounded-2xl border transition-all overflow-hidden ${
                                    isRunning
                                        ? 'border-amber-400 dark:border-amber-500/80 bg-amber-50/40 dark:bg-amber-950/20 shadow-md ring-1 ring-amber-400/40'
                                        : isExpanded
                                            ? 'border-indigo-200 dark:border-white/15 bg-white dark:bg-stone-850 shadow-sm'
                                            : 'border-gray-200/80 dark:border-white/5 bg-gray-50/60 dark:bg-stone-900/60 hover:bg-white dark:hover:bg-stone-850'
                                }`}
                            >
                                {/* Mahadasha Header Bar */}
                                <div
                                    onClick={() => handleToggleMaha(md.id)}
                                    className="p-3.5 sm:p-4.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Planet Icon Badge */}
                                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base border shadow-2xs ${colorStyle.bg} ${colorStyle.border} ${colorStyle.text}`}>
                                            {isTe ? (md.te || md.short) : md.short}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                                                    {isTe ? getLocalizedPlanet(md.lord, 'te') : md.lord}
                                                </span>
                                                <span className="text-xs uppercase font-sans font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-gray-300">
                                                    {isTe ? "మహర్దశ" : "Mahadasha"}
                                                </span>
                                                {md.isBirthDasha && (
                                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300/60">
                                                        {isTe ? "జన్మ శేషం" : "Birth Balance"}
                                                    </span>
                                                )}
                                                {isRunning && (
                                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span>{isTe ? "ప్రస్తుతం" : "Running"}</span>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                                                <span>{formatDate(md.startDate)}</span>
                                                <span className="mx-1.5 text-gray-400">&rarr;</span>
                                                <span>{formatDate(md.endDate)}</span>
                                            </div>

                                            {/* KP Hierarchy Badges (STL, SUB, SSL, ASP) */}
                                            <div className="mt-1.5">
                                                <KPBadgeCluster
                                                    kpDetails={md.kpDetails || dashaData.planetaryKPDetails?.[md.lord]}
                                                    planetKey={md.lord}
                                                    onInspectAspects={handleInspectAspects}
                                                    isTe={isTe}
                                                    t={t}
                                                    size="default"
                                                />
                                            </div>

                                            {/* Mahadasha Lord Significations (BHAVA) */}
                                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                <span className="text-[11px] font-bold text-amber-900/90 dark:text-amber-300 font-sans">
                                                    {t.bhavaSignifications || "Significations (BHAVA)"}:
                                                </span>
                                                <BhavaChips
                                                    houses={(md.kpDetails || dashaData.planetaryKPDetails?.[md.lord])?.significations?.primaryHouses}
                                                    isTe={isTe}
                                                    t={t}
                                                    size="default"
                                                    emptyText={t.noSignifications || "--"}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Duration & Expand Toggle */}
                                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                        <div className="text-right">
                                            <span className="font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-mono block">
                                                {md.durationFormatted.formatted}
                                            </span>
                                            <span className="text-[11px] text-gray-400 block">
                                                {md.isBirthDasha ? `${isTe ? "శేషం" : "of"} ${md.fullYears}y` : `${md.fullYears} ${isTe ? "సం." : "years"}`}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors"
                                            aria-label="Toggle Antardashas"
                                        >
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Level 2: Antardashas (Bhuktis) */}
                                {isExpanded && (
                                    <div className="p-3 sm:p-5 pt-0 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-stone-900/50 space-y-4">
                                        {/* 4-Tier Significations Panel for Mahadasha Lord */}
                                        <div className="pt-3">
                                            <DashaSignificationsPanel
                                                kpDetails={md.kpDetails || dashaData.planetaryKPDetails?.[md.lord]}
                                                planetKey={md.lord}
                                                periodLabel={`${md.lord} ${isTe ? "మహర్దశ" : "Mahadasha"}`}
                                                isTe={isTe}
                                                t={t}
                                            />
                                        </div>

                                        <div className="mb-3 pt-1 flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-400">
                                            <span className="uppercase tracking-wider">
                                                {isTe ? `${getLocalizedPlanet(md.lord, 'te')} అంతర్దశల విభజన (9 Bhuktis)` : `${md.lord} Antardasha Breakdown (9 Bhuktis)`}
                                            </span>
                                            <span className="text-[11px] text-gray-400 font-mono">
                                                {isTe ? "సూత్రం: (MD × AD) / 120" : "Formula: (MD × AD) / 120"}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            {md.antardashas.map((ad, adIdx) => {
                                                const isAdExpanded = expandedAntarId === ad.id;
                                                const isAdRunning = refTargetMs >= ad.startMs && refTargetMs < ad.endMs;
                                                const adColor = PLANET_COLORS[ad.lord] || PLANET_COLORS.Sun;

                                                return (
                                                    <div
                                                        key={ad.id}
                                                        className={`rounded-xl border transition-all ${
                                                            isAdRunning
                                                                ? 'border-indigo-400 dark:border-amber-400 bg-indigo-50/60 dark:bg-amber-950/30 shadow-xs ring-1 ring-indigo-400/40 dark:ring-amber-400/40'
                                                                : 'border-gray-200/70 dark:border-white/5 bg-white dark:bg-stone-850 hover:border-gray-300 dark:hover:border-white/10'
                                                        }`}
                                                    >
                                                        {/* Antardasha Row */}
                                                        <div
                                                            onClick={() => handleToggleAntar(ad.id)}
                                                            className="p-2.5 sm:p-3 flex items-center justify-between gap-2.5 cursor-pointer select-none"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs border ${adColor.bg} ${adColor.border} ${adColor.text}`}>
                                                                    {isTe ? (ad.te || ad.short) : ad.short}
                                                                </span>

                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                                                                            {isTe ? getLocalizedPlanet(ad.lord, 'te') : ad.lord}
                                                                        </span>
                                                                        {ad.isClippedAtBirth && (
                                                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300/40">
                                                                                {isTe ? "జన్మ వద్ద ప్రారంభం" : "Clipped at Birth"}
                                                                            </span>
                                                                        )}
                                                                        {isAdRunning && (
                                                                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                                                                {isTe ? "నడుస్తున్నది" : "Running"}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                                        {formatDate(ad.startDate)} &rarr; {formatDate(ad.endDate)}
                                                                    </div>
                                                                    {/* KP Hierarchy Badges (STL, SUB, SSL, ASP) */}
                                                                    <div className="mt-1">
                                                                        <KPBadgeCluster
                                                                            kpDetails={ad.kpDetails || dashaData.planetaryKPDetails?.[ad.lord]}
                                                                            planetKey={ad.lord}
                                                                            onInspectAspects={handleInspectAspects}
                                                                            isTe={isTe}
                                                                            t={t}
                                                                            size="compact"
                                                                        />
                                                                    </div>

                                                                    {/* Antardasha Lord Significations (BHAVA) */}
                                                                    <div className="mt-1 flex flex-wrap items-center gap-1">
                                                                        <span className="text-[10px] font-bold text-amber-900/90 dark:text-amber-300 font-sans">
                                                                            BHAVA:
                                                                        </span>
                                                                        <BhavaChips
                                                                            houses={(ad.kpDetails || dashaData.planetaryKPDetails?.[ad.lord])?.significations?.primaryHouses}
                                                                            isTe={isTe}
                                                                            t={t}
                                                                            size="micro"
                                                                            emptyText={t.noSignifications || "--"}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2.5 shrink-0">
                                                                <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                                                                    {ad.durationFormatted.formatted}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    className="p-1 rounded bg-gray-100 dark:bg-stone-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                                                    aria-label="Toggle Pratyantardashas"
                                                                >
                                                                    {isAdExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Expanded Level 3: Pratyantardashas */}
                                                        {isAdExpanded && (
                                                            <div className="p-2.5 sm:p-3 pt-0 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-stone-900/60 rounded-b-xl space-y-3">
                                                                {/* 4-Tier Significations Panel for Antardasha Lord */}
                                                                <div className="pt-2">
                                                                    <DashaSignificationsPanel
                                                                        kpDetails={ad.kpDetails || dashaData.planetaryKPDetails?.[ad.lord]}
                                                                        planetKey={ad.lord}
                                                                        periodLabel={`${ad.lord} ${isTe ? "అంతర్దశ" : "Antardasha"}`}
                                                                        isTe={isTe}
                                                                        t={t}
                                                                    />
                                                                </div>

                                                                <div className="mb-2 pt-1 flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                                    <span>{isTe ? "ప్రత్యంతర్దశల పట్టిక (Pratyantardasha)" : "Pratyantardasha Sequence"}</span>
                                                                    <span className="text-[10px] lowercase font-normal">
                                                                        {isTe ? "(AD × PD) / 120" : "(AD × PD) / 120"}
                                                                    </span>
                                                                </div>

                                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 font-sans">
                                                                    {ad.pratyantardashas.map((pd) => {
                                                                        const isPdRunning = refTargetMs >= pd.startMs && refTargetMs < pd.endMs;
                                                                        const pdColor = PLANET_COLORS[pd.lord] || PLANET_COLORS.Sun;

                                                                        return (
                                                                            <div
                                                                                key={pd.id}
                                                                                className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-1.5 transition-all ${
                                                                                    isPdRunning
                                                                                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/50 shadow-2xs ring-1 ring-amber-400'
                                                                                        : 'border-gray-200/80 dark:border-white/5 bg-white dark:bg-stone-850'
                                                                                }`}
                                                                            >
                                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                                    <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${pdColor.bg} ${pdColor.text}`}>
                                                                                        {isTe ? (pd.te || pd.short) : pd.short}
                                                                                    </span>
                                                                                    <div className="min-w-0">
                                                                                        <span className="font-bold text-gray-900 dark:text-gray-100 truncate block">
                                                                                            {isTe ? getLocalizedPlanet(pd.lord, 'te') : pd.lord}
                                                                                        </span>
                                                                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono block">
                                                                                            {formatDate(pd.startDate)} - {formatDate(pd.endDate)}
                                                                                        </span>
                                                                                        {/* KP Hierarchy Badges (STL, SUB, SSL, ASP) */}
                                                                                        <div className="mt-1">
                                                                                            <KPBadgeCluster
                                                                                                kpDetails={pd.kpDetails || dashaData.planetaryKPDetails?.[pd.lord]}
                                                                                                planetKey={pd.lord}
                                                                                                onInspectAspects={handleInspectAspects}
                                                                                                isTe={isTe}
                                                                                                t={t}
                                                                                                size="micro"
                                                                                            />
                                                                                        </div>
                                                                                        {/* Pratyantardasha Lord Significations (BHAVA) */}
                                                                                        <div className="mt-1 flex flex-wrap items-center gap-1">
                                                                                            <span className="text-[9px] font-bold text-amber-900/90 dark:text-amber-300 font-sans">
                                                                                                BHAVA:
                                                                                            </span>
                                                                                            <BhavaChips
                                                                                                houses={(pd.kpDetails || dashaData.planetaryKPDetails?.[pd.lord])?.significations?.primaryHouses}
                                                                                                isTe={isTe}
                                                                                                t={t}
                                                                                                size="micro"
                                                                                                emptyText="--"
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                <span className="text-[10px] font-mono text-gray-600 dark:text-gray-400 shrink-0 font-medium">
                                                                                    {pd.durationFormatted.formatted}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Section C: Optional Technical Audit & Calculation Details Panel */}
            <div className="bg-white/90 dark:bg-stone-900/80 rounded-2xl border border-gray-200/80 dark:border-white/10 p-4 sm:p-6 shadow-xs font-telugu">
                <button
                    type="button"
                    onClick={() => setShowAuditPanel(prev => !prev)}
                    className="w-full flex items-center justify-between text-left cursor-pointer select-none"
                >
                    <div className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-indigo-600 dark:text-amber-400" />
                        <div>
                            <span className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white block">
                                {t.calculationAudit || "దశా గణన సాంకేతిక వివరాలు & సూత్రాలు"}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block font-normal">
                                {isTe ? "ఖగోళ గణన సూత్రాలు, చంద్ర స్థానం మరియు అయనాంశ ధ్రువీకరణ" : "Astronomical calculation formulas, Moon longitude, and Nakshatra boundaries"}
                            </span>
                        </div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-gray-300">
                        {showAuditPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </button>

                {showAuditPanel && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10 space-y-4 text-xs sm:text-sm font-sans">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-stone-800/60 border border-gray-200/60 dark:border-white/5 space-y-1">
                                <span className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold block">
                                    {isTe ? "చంద్రుని నిరయన రేఖాంశం" : "Moon Sidereal Longitude"}
                                </span>
                                <span className="font-mono font-bold text-gray-900 dark:text-white text-base block">
                                    {formatDMS(calculationDetails.moonLongitudeDMS)} ({Number(calculationDetails.moonLongitudeDMS).toFixed(6)}°)
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-stone-800/60 border border-gray-200/60 dark:border-white/5 space-y-1">
                                <span className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold block">
                                    {isTe ? "నక్షత్ర పరిధి (13° 20')" : "Nakshatra Boundaries"}
                                </span>
                                <span className="font-mono font-bold text-gray-900 dark:text-white text-sm block">
                                    {formatDMS(balanceInfo.nakshatraStartDeg)} &rarr; {formatDMS(balanceInfo.nakshatraEndDeg)}
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-stone-800/60 border border-gray-200/60 dark:border-white/5 space-y-1">
                                <span className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold block">
                                    {isTe ? "గడిచిన / మిగిలిన భాగాలు" : "Elapsed / Remaining Fraction"}
                                </span>
                                <span className="font-mono font-bold text-gray-900 dark:text-white text-sm block">
                                    {(calculationDetails.elapsedFraction * 100).toFixed(4)}% / {(calculationDetails.remainingFraction * 100).toFixed(4)}%
                                </span>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 space-y-1.5 leading-relaxed font-telugu">
                            <p className="font-bold">
                                {t.dashaYearsFormula || "దశా గణన ప్రమాణం: 1 సంవత్సరం = 365.25 రోజులు (Julian Astronomical Year)."}
                            </p>
                            <p>
                                {isTe
                                    ? `జన్మ కాల శేషం = మిగిలిన భాగం (${(calculationDetails.remainingFraction).toFixed(4)}) × ${balanceInfo.starLord} పూర్తి కాలం (${balanceInfo.fullLordYears} సం.) = ${calculationDetails.balanceYears.toFixed(4)} సం. (${calculationDetails.balanceFormatted}).`
                                    : `Balance at Birth = Remaining Fraction (${(calculationDetails.remainingFraction).toFixed(4)}) × ${balanceInfo.starLord} Duration (${balanceInfo.fullLordYears}y) = ${calculationDetails.balanceYears.toFixed(4)}y (${calculationDetails.balanceFormatted}).`}
                            </p>
                            <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                                {t.prenatalClippedNote || "గమనిక: పూర్వ అంతర్దశలు జన్మ సమయానికి ముగిశాయి. జన్మ సమయంలో నడుస్తున్న అంతర్దశ జన్మ సమయం నుండి ఖచ్చితంగా క్లిప్ చేయబడింది."}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* KP Astrological & Aspect Details Modal */}
            {inspectedPlanet && (
                <KPAspectsModal
                    planetKey={inspectedPlanet.key}
                    kpDetails={inspectedPlanet.details}
                    onClose={() => setInspectedPlanet(null)}
                    isTe={isTe}
                    t={t}
                />
            )}

        </div>
    );
};
