import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Sparkles, Star, Sun, Shield, BookOpen, Compass,
    Layers, Clock, ArrowRight, CheckCircle2, ChevronRight,
    Cpu, Activity, Zap
} from 'lucide-react';

import { calculateKPKundli, KP_AYANAMSHA_MODES } from '../services/kpCalculator';
import { KPBirthForm } from '../components/kp/KPBirthForm';
import { KP_TRANSLATIONS } from '../utils/kpTranslations';
import { safeSaveSessionResult, safeSaveSessionParams } from '../utils/storageUtils';

export const KPDashboard = ({ lang = 'te', onLangChange }) => {
    const navigate = useNavigate();
    const t = KP_TRANSLATIONS[lang] || KP_TRANSLATIONS.te;
    const isTe = lang === 'te';

    // Default or cached birth details
    const [initialParams, setInitialParams] = useState(() => {
        try {
            const cached = sessionStorage.getItem('kp_studio_params');
            if (cached) return JSON.parse(cached);
        } catch {}
        return {
            name: isTe ? 'రమేష్ శర్మ' : 'Ramesh Sharma',
            gender: 'male',
            birthDate: '1998-08-15',
            birthTime: '10:30',
            birthPlace: isTe ? 'హైదరాబాద్' : 'Hyderabad, India',
            lat: 17.3850,
            lon: 78.4867,
            timezone: 'Asia/Kolkata',
            ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW,
            nodeMode: 'mean'
        };
    });

    const [hasExistingResult, setHasExistingResult] = useState(false);
    const [existingName, setExistingName] = useState('');
    const [isCalculating, setIsCalculating] = useState(false);
    const [calcError, setCalcError] = useState(null);

    useEffect(() => {
        try {
            const cachedResult = sessionStorage.getItem('kp_studio_result');
            const cachedParams = sessionStorage.getItem('kp_studio_params');
            if (cachedResult && cachedParams) {
                const parsed = JSON.parse(cachedParams);
                setHasExistingResult(true);
                setExistingName(parsed.name || (isTe ? 'జాతుకుడు' : 'Seeker'));
            }
        } catch {}
    }, [isTe]);

    // Fast Preset Switcher (Benchmark 1998 Hyderabad Chart)
    const loadBenchmark = () => {
        setInitialParams({
            name: isTe ? 'బెంచ్‌మార్క్ జాతకం' : 'KP Benchmark Chart',
            gender: 'male',
            birthDate: '1998-08-15',
            birthTime: '10:30',
            birthPlace: 'Hyderabad, India',
            lat: 17.3850,
            lon: 78.4867,
            timezone: 'Asia/Kolkata',
            ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW,
            nodeMode: 'mean'
        });
    };

    const handleCalculate = async (formData) => {
        setCalcError(null);
        setIsCalculating(true);

        try {
            let calculatedResult = null;

            // 1. Authoritative Swiss Ephemeris from backend API
            try {
                const response = await fetch('/api/kp-kundli', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        birthDate: formData.birthDate,
                        birthTime: formData.birthTime,
                        lat: formData.lat,
                        lon: formData.lon,
                        timezone: formData.timezone,
                        ayanamshaMode: formData.ayanamshaMode || KP_AYANAMSHA_MODES.KP_NEW,
                        nodeMode: formData.nodeMode || 'mean',
                        chartMode: formData.chartMode || 'natal',
                        kpNumber: formData.kpNumber || null
                    })
                });

                if (response.ok) {
                    const json = await response.json();
                    if (json && json.success && json.data) {
                        calculatedResult = json.data;
                    }
                }
            } catch (apiErr) {
                console.warn("Backend API not reachable, using client-side calculation engine:", apiErr.message);
            }

            // 2. Client-side fallback if backend is offline
            if (!calculatedResult) {
                calculatedResult = calculateKPKundli({
                    birthDate: formData.birthDate,
                    birthTime: formData.birthTime,
                    lat: formData.lat,
                    lon: formData.lon,
                    timezone: formData.timezone,
                    ayanamshaMode: formData.ayanamshaMode || KP_AYANAMSHA_MODES.KP_NEW,
                    nodeMode: formData.nodeMode || 'mean',
                    chartMode: formData.chartMode || 'natal',
                    kpNumber: formData.kpNumber || null
                });
            }

            // 3. Cache in sessionStorage safely without massive subtrees
            safeSaveSessionResult(calculatedResult);
            safeSaveSessionParams(formData);

            // 4. Navigate to Results view
            navigate('/results', {
                state: {
                    kpResult: calculatedResult,
                    currentParams: formData,
                    lang
                }
            });

        } catch (err) {
            console.error("Calculation failed:", err);
            setCalcError(err.message || (isTe ? "గణనలో లోపం జరిగింది. దయచేసి వివరాలను సరిచూసుకోండి." : "Calculation failed. Please verify your coordinates and birth details."));
        } finally {
            setIsCalculating(false);
        }
    };

    return (
        <div className="relative min-h-screen pb-20 overflow-hidden font-sans">
            {/* Ambient Cosmic Background Glows */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[850px] h-[380px] bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
            <div className="absolute top-96 -left-32 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
                {/* Hero Header */}
                <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-bold shadow-xs">
                        <Cpu className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>{isTe ? "ప్రామాణిక ఖగోళ గణనలు" : "High-Precision Astronomical Engine"}</span>
                    </div>

                    <h1 className={`text-3xl sm:text-5xl font-serif font-black text-gray-950 dark:text-white ${isTe ? 'leading-[1.35] tracking-normal' : 'leading-tight tracking-tight'}`}>
                        {isTe ? "కృష్ణమూర్తి పద్ధతి (KP) జాతక చక్రం" : "Krishnamurti Paddhati (KP) Astrology Studio"}
                    </h1>

                    <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 font-sans leading-relaxed">
                        {isTe
                            ? "ప్లాసిడస్ భావ సంధులు, 249 సబ్ లార్డ్ విభజనలు, 4-స్థాయిల భావ కారకత్వాలు మరియు ఖచ్చితమైన వింశోత్తరి దశల కాలగణన."
                            : "Independent high-precision calculation studio for Placidus cusps, 249 Sub Lords, 4-tier House Significators, and Vimshottari Dasha hierarchy."}
                    </p>

                    {/* Quick Existing Session Banner */}
                    {hasExistingResult && (
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => navigate('/results')}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-50 dark:bg-slate-900 border border-indigo-200 dark:border-white/10 text-indigo-900 dark:text-indigo-200 text-sm font-bold hover:bg-indigo-100 transition-all shadow-xs cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <span>{isTe ? `${existingName} గారి ఇటీవలి విశ్లేషణను వీక్షించండి` : `View recent analysis for ${existingName}`}</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Content Layout: Form Card + Feature Highlights */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left: Birth Form Container (7 cols) */}
                    <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-amber-200/80 dark:border-white/10 shadow-xl backdrop-blur-md">
                        <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100 dark:border-white/10">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900 dark:text-white">
                                    {isTe ? "జనన వివరాల నమోదు" : "Enter Birth Details"}
                                </h2>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                    {isTe ? "ఖచ్చితమైన తేదీ, సమయం మరియు పుట్టిన స్థలం" : "Accurate date, time, and coordinates"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={loadBenchmark}
                                className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 transition-all cursor-pointer"
                                title="Load verified test case (15-Aug-1998, 10:30 AM IST, Hyderabad)"
                            >
                                {isTe ? "నమూనా జాతకం" : "Load Benchmark"}
                            </button>
                        </div>

                        {calcError && (
                            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm">
                                {calcError}
                            </div>
                        )}

                        <KPBirthForm
                            onCalculate={handleCalculate}
                            isCalculating={isCalculating}
                            initialValues={initialParams}
                            lang={lang}
                        />
                    </div>

                    {/* Right: Technical Highlights & KP Standards (5 cols) */}
                    <div className="lg:col-span-5 space-y-5">
                        <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/40 dark:via-slate-900/60 dark:to-slate-950 p-6 rounded-3xl border border-amber-200/80 dark:border-white/10 shadow-sm space-y-4">
                            <h3 className="font-serif font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-amber-500" />
                                <span>{isTe ? "శాస్త్రీయ KP ఖగోళ ప్రమాణాలు" : "Core KP Scientific Standards"}</span>
                            </h3>

                            <div className="space-y-3.5 text-sm text-gray-700 dark:text-gray-300">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-xs shrink-0 mt-0.5">
                                        1
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">
                                            {isTe ? "ప్లాసిడస్ భావ సంధులు (Placidus Cusps)" : "Placidus House System"}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {isTe ? "సమత్రిభాజ్య పద్ధతిలో 12 భావాల ప్రారంభ డిగ్రీలు ఖచ్చితంగా లెక్కించబడతాయి." : "True semi-arc trisection cusps with polar latitude Porphyry fallbacks."}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-xs shrink-0 mt-0.5">
                                        2
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">
                                            {isTe ? "249 సబ్ లార్డ్ & సబ్-సబ్ లార్డ్స్" : "249 Sub Lords & SSL Boundaries"}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {isTe ? "ప్రతి నక్షత్రం 9 ఉప-విభాగాలుగా వింశోత్తరి నిష్పత్తిలో ఖచ్చితంగా విభజించబడుతుంది." : "Deterministic half-open interval boundaries [start, end) without rounding gaps."}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-xs shrink-0 mt-0.5">
                                        3
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">
                                            {isTe ? "4-స్థాయిల భావ కారకత్వాలు (4-Level Significators)" : "4-Level House Significators"}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {isTe ? "స్థాయి 1 నుండి 4 వరకు సమగ్ర ఫలిత నిర్ణయ కారకత్వాలు మరియు రాశ్యాధిపత్య మ్యాట్రిక్స్." : "Level 1 through 4 astrological hierarchies with planetary lordship matrices."}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-xs shrink-0 mt-0.5">
                                        4
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">
                                            {isTe ? "వింశోత్తరి మహాదశ, అంతర్దశ, ప్రత్యంతర్దశ" : "Vimshottari Dasha Hierarchy"}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {isTe ? "చంద్ర స్పష్ట స్థాన ఆధారిత కచ్చితమైన దశా భుక్తులు మరియు భావ కారకత్వాలు." : "Exact fractional balance, zero-gap timeline, and associated Bhava significations."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Tool: Instant Ruling Planets */}
                        <div className="bg-white dark:bg-slate-900/80 p-5 rounded-3xl border border-gray-200 dark:border-white/10 flex items-center justify-between shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-amber-400 flex items-center justify-center">
                                    <Compass className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                                        {isTe ? "ప్రశ్న రూలింగ్ ప్లానెట్స్ టూల్" : "Ruling Planets (RP) Tool"}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {isTe ? "ప్రస్తుత సమయ లగ్న, చంద్ర, వారాధిపతులు" : "Compute instant judgment moment rulers"}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => navigate('/ruling-planets')}
                                className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer shadow-xs"
                                title="Open Ruling Planets Tool"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
