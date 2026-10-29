import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Star, Sun, Shield, Layers, Clock, Edit3, Printer, FileText,
    ArrowLeft, ArrowRight, Compass, Calendar, User, MapPin, Globe, ChevronLeft, ChevronRight,
    Languages, CheckCircle2, AlertCircle, Share2, Eye, Target
} from 'lucide-react';

import { formatDMS, calculateKPKundli, KP_AYANAMSHA_MODES } from '../services/kpCalculator';
import { calculateKPSignificators } from '../utils/kp/kpSignificators';
import { randomKpNumber, validateKpNumber } from '../utils/kp/random';
import { applyRotation } from '../utils/kp/rotation';
import { KPBirthForm } from '../components/kp/KPBirthForm';
import { KPChart } from '../components/kp/KPChart';
import { KPPlanetTable } from '../components/kp/KPPlanetTable';
import { KPCuspTable } from '../components/kp/KPCuspTable';
import { KPSignificators } from '../components/kp/KPSignificators';
import { KPAspects } from '../components/kp/KPAspects';
import { KPRulingPlanets } from '../components/kp/KPRulingPlanets';
import { VimshottariDasha } from '../components/kp/VimshottariDasha';
import { KPEventSignificatorAnalysis } from '../components/kp/KPEventSignificatorAnalysis';
import { ReportGenerationModal } from '../components/report/ReportGenerationModal';
import { KP_TRANSLATIONS, getLocalizedPlanet, getLocalizedNakshatra } from '../utils/kpTranslations';
import { safeSaveSessionResult, safeSaveSessionParams, safeClearEventAnalysisState } from '../utils/storageUtils';
import { API_BASE_URL } from '../utils/apiConfig';

export const KPResultsView = ({ lang = 'te', onLangChange }) => {
    const location = useLocation();
    const navigate = useNavigate();

    // 1. Recover state from React Router location or sessionStorage
    const [kpResult, setKpResult] = useState(() => {
        if (location.state?.kpResult) return location.state.kpResult;
        try {
            const cached = sessionStorage.getItem('kp_studio_result');
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });

    const [currentParams, setCurrentParams] = useState(() => {
        if (location.state?.currentParams) return location.state.currentParams;
        try {
            const cached = sessionStorage.getItem('kp_studio_params');
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });

    // Parse URL search parameters on mount (?mode=horary&kp=137&rot=7)
    const initialUrlParams = useMemo(() => {
        if (typeof window === 'undefined') return { mode: 'natal', kp: null, rot: 1 };
        const sp = new URLSearchParams(window.location.search);
        const mode = sp.get('mode') === 'horary' ? 'horary' : 'natal';
        const kpRaw = parseInt(sp.get('kp'), 10);
        const kp = (!isNaN(kpRaw) && kpRaw >= 1 && kpRaw <= 249) ? kpRaw : null;
        const rotRaw = parseInt(sp.get('rot'), 10);
        const rot = (!isNaN(rotRaw) && rotRaw >= 1 && rotRaw <= 12) ? rotRaw : 1;
        return { mode, kp, rot };
    }, []);

    const [chartMode, setChartMode] = useState(() => {
        if (location.state?.currentParams?.chartMode) return location.state.currentParams.chartMode;
        if (currentParams?.chartMode) return currentParams.chartMode;
        return initialUrlParams.mode;
    });
    const [horaryState, setHoraryState] = useState(() => {
        const passedKp = location.state?.currentParams?.kpNumber ?? currentParams?.kpNumber ?? initialUrlParams.kp;
        if (passedKp != null) {
            return { number: passedKp, source: 'user', generatedAt: Date.now() };
        }
        return { number: randomKpNumber(), source: 'random', generatedAt: Date.now() };
    });
    const [rotateTo, setRotateTo] = useState(initialUrlParams.rot);

    // If no chart data or if explicitly requested to edit, show the birth details form
    const [isEditing, setIsEditing] = useState(() => !kpResult || !currentParams || Boolean(location.state?.edit));
    const [isCalculating, setIsCalculating] = useState(false);
    const [calcError, setCalcError] = useState(null);

    const [initialParams, setInitialParams] = useState(() => {
        if (location.state?.formData) return location.state.formData;
        if (currentParams) return currentParams;
        return null;
    });

    const t = KP_TRANSLATIONS[lang] || KP_TRANSLATIONS.te;
    const isTe = lang === 'te';

    // Active Results Tab: 'chart' | 'planets' | 'cusps' | 'significators' | 'dasha' | 'aspects' | 'ruling' | 'event-analysis'
    const [activeTab, setActiveTab] = useState(() => location.state?.tab || 'chart');
    const [dashaTargetDate, setDashaTargetDate] = useState(() => location.state?.dashaDate || null);

    // Horizontal Tab Navigation scrolling helpers
    const tabsContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkTabsScroll = useCallback(() => {
        const el = tabsContainerRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setCanScrollLeft(scrollLeft > 4);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }, []);

    useEffect(() => {
        const el = tabsContainerRef.current;
        if (!el) return;
        checkTabsScroll();
        el.addEventListener('scroll', checkTabsScroll, { passive: true });
        window.addEventListener('resize', checkTabsScroll);
        const t1 = setTimeout(checkTabsScroll, 100);
        const t2 = setTimeout(checkTabsScroll, 500);
        return () => {
            el.removeEventListener('scroll', checkTabsScroll);
            window.removeEventListener('resize', checkTabsScroll);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [checkTabsScroll, activeTab]);

    useEffect(() => {
        if (!tabsContainerRef.current) return;
        const btn = tabsContainerRef.current.querySelector(`[data-tab-id="${activeTab}"]`);
        if (btn) {
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [activeTab]);

    const handleTabsScroll = (direction) => {
        const el = tabsContainerRef.current;
        if (!el) return;
        const scrollAmount = 260;
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    const handleTabsWheel = (e) => {
        const el = tabsContainerRef.current;
        if (!el) return;
        // On mouse wheel: translate vertical mouse scroll to horizontal scroll so desktop mouse users can easily scroll
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            el.scrollLeft += e.deltaY;
            checkTabsScroll();
        }
    };

    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        setTimeout(() => {
            const btn = tabsContainerRef.current?.querySelector(`[data-tab-id="${tabId}"]`);
            if (btn) {
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }, 50);
    };

    // Auto-refresh significators if loaded from older session cache without aspect indications
    useEffect(() => {
        if (kpResult && kpResult.planets && kpResult.cusps) {
            const firstHouse = kpResult.significators?.houseSignificators?.[0];
            if (!firstHouse?.aspectedByDetails || firstHouse.aspectedByDetails.length === 0) {
                try {
                    const freshSigs = calculateKPSignificators(kpResult.planets, kpResult.cusps);
                    setKpResult(prev => {
                        const updated = {
                            ...prev,
                            significators: freshSigs
                        };
                        safeSaveSessionResult(updated);
                        return updated;
                    });
                } catch (e) {
                    console.warn("Could not auto-refresh significators:", e);
                }
            }
        }
    }, [kpResult?.planets, kpResult?.cusps]);

    // Synchronize URL search parameters (?mode=...&kp=...&rot=...)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const sp = new URLSearchParams(window.location.search);
        if (chartMode === 'horary') {
            sp.set('mode', 'horary');
            sp.set('kp', String(horaryState.number));
        } else {
            sp.delete('mode');
            sp.delete('kp');
        }
        if (rotateTo !== 1) {
            sp.set('rot', String(rotateTo));
        } else {
            sp.delete('rot');
        }
        const newSearch = sp.toString();
        const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`;
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (newUrl !== currentUrl) {
            window.history.replaceState(null, '', newUrl);
        }
    }, [chartMode, horaryState.number, rotateTo]);

    // Horary chart state and computation
    const [horaryResult, setHoraryResult] = useState(() => {
        if (location.state?.currentParams?.chartMode === 'horary' && location.state?.kpResult) {
            return location.state.kpResult;
        }
        if (currentParams?.chartMode === 'horary' && kpResult) {
            return kpResult;
        }
        return null;
    });

    useEffect(() => {
        if (chartMode !== 'horary' || !currentParams) return;
        if (horaryResult && horaryResult.horaryDetails?.kpNumber === horaryState.number) return;

        let cancelled = false;
        const computeHorary = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/kp-kundli`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        birthDate: currentParams.birthDate,
                        birthTime: currentParams.birthTime,
                        lat: currentParams.lat,
                        lon: currentParams.lon,
                        timezone: currentParams.timezone,
                        ayanamshaMode: currentParams.ayanamshaMode || KP_AYANAMSHA_MODES.KP_NEW,
                        nodeMode: currentParams.nodeMode || 'mean',
                        chartMode: 'horary',
                        kpNumber: horaryState.number
                    })
                });

                if (response.ok) {
                    const json = await response.json();
                    if (json && json.success && json.data && !cancelled) {
                        setHoraryResult(json.data);
                        return;
                    }
                }
            } catch {
                // Fall back to client calculation
            }

            if (cancelled) return;

            try {
                const res = calculateKPKundli({
                    birthDate: currentParams.birthDate,
                    birthTime: currentParams.birthTime,
                    lat: currentParams.lat,
                    lon: currentParams.lon,
                    timezone: currentParams.timezone,
                    ayanamshaMode: currentParams.ayanamshaMode || KP_AYANAMSHA_MODES.KP_NEW,
                    nodeMode: currentParams.nodeMode || 'mean',
                    chartMode: 'horary',
                    kpNumber: horaryState.number
                });
                if (!cancelled) {
                    setHoraryResult(res);
                }
            } catch (err) {
                console.error("Horary calculation error:", err);
            }
        };

        computeHorary();

        return () => {
            cancelled = true;
        };
    }, [chartMode, horaryState.number, currentParams]);

    // Base chart (natal or horary)
    const baseKpResult = useMemo(() => {
        if (chartMode === 'horary') {
            return horaryResult || kpResult;
        }
        return kpResult;
    }, [chartMode, horaryResult, kpResult]);

    // Display chart with Bhavat Bhavam House Rotation (pure view transform)
    const displayKpResult = useMemo(() => {
        if (!baseKpResult) return null;
        return applyRotation(baseKpResult, rotateTo);
    }, [baseKpResult, rotateTo]);

    const handleChartModeChange = useCallback((newMode) => {
        if (newMode === 'horary') {
            setChartMode('horary');
            setHoraryState(prev => {
                if (prev?.number >= 1 && prev?.number <= 249) return prev;
                return { number: randomKpNumber(), source: 'random', generatedAt: Date.now() };
            });
        } else {
            setChartMode('natal');
        }
    }, []);

    const handleRegenerateHorary = useCallback(() => {
        const nextNo = randomKpNumber();
        setHoraryState({
            number: nextNo,
            source: 'random',
            generatedAt: Date.now()
        });
    }, []);

    const handleKpNumberChange = useCallback((newNo) => {
        const check = validateKpNumber(newNo);
        if (check.valid) {
            setHoraryState({
                number: check.value,
                source: 'manual',
                generatedAt: Date.now()
            });
        }
    }, []);

    const handleRotateChange = useCallback((newRot) => {
        const rotVal = Number(newRot);
        if (!isNaN(rotVal) && rotVal >= 1 && rotVal <= 12) {
            setRotateTo(rotVal);
        }
    }, []);

    // Fast Preset Switchers
    const loadPreset1998 = () => {
        setInitialParams({
            name: isTe ? 'రమేష్ శర్మ' : 'Ramesh Sharma',
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

    const loadPreset2000 = () => {
        setInitialParams({
            name: isTe ? 'అనిత వర్మ' : 'Anitha Varma',
            gender: 'female',
            birthDate: '2000-01-01',
            birthTime: '12:00',
            birthPlace: 'New Delhi, India',
            lat: 28.6139,
            lon: 77.2090,
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

            // 1. Authoritative calculations from backend API
            try {
                const response = await fetch(`${API_BASE_URL}/api/kp-kundli`, {
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

            setKpResult(calculatedResult);
            const chosenMode = formData.chartMode || 'natal';
            setChartMode(chosenMode);
            if (chosenMode === 'horary') {
                setHoraryResult(calculatedResult);
                if (formData.kpNumber != null) {
                    setHoraryState({
                        number: formData.kpNumber,
                        source: 'user',
                        generatedAt: Date.now()
                    });
                }
            } else {
                setHoraryResult(null);
            }
            setCurrentParams(formData);
            setIsEditing(false);
            setActiveTab('chart');
        } catch (err) {
            console.error("Calculation failed:", err);
            setCalcError(err.message || (isTe ? "గణనలో లోపం జరిగింది. దయచేసి వివరాలను సరిచూసుకోండి." : "Calculation failed. Please verify your coordinates and birth details."));
        } finally {
            setIsCalculating(false);
        }
    };

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [modalReportType, setModalReportType] = useState('kp_kundli');

    const handleEditDetails = () => {
        setInitialParams(currentParams);
        setIsEditing(true);
    };

    const handlePrint = (type = 'kp_kundli') => {
        setModalReportType(type);
        setIsReportModalOpen(true);
    };

    // If user needs to enter or edit birth details first
    if (!kpResult || !currentParams || isEditing) {
        return (
            <div className="min-h-screen pb-24 font-sans">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 space-y-8">
                    {/* Top Heading */}
                    <div className="text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-bold shadow-xs mb-4">
                            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span>{isTe ? "ఖచ్చితమైన KP జాతక గణన వేదిక" : "Precision KP Horoscope Engine"}</span>
                        </div>
                        <h1 className={`text-3xl sm:text-5xl font-serif font-black text-gray-950 dark:text-white ${isTe ? 'leading-[1.35] tracking-normal' : 'leading-tight tracking-tight'}`}>
                            {isTe ? "జనన వివరాల నమోదు" : "Enter Birth Details"}
                        </h1>
                        <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                            {isTe
                                ? "ఖచ్చితమైన ప్లాసిడస్ భావాలు, సబ్ లార్డ్ & వింశోత్తరి దశల గణన కొరకు వివరాలను నమోదు చేయండి."
                                : "Enter accurate birth date, time, and coordinates to compute high-precision Placidus cusps and 249 Sub Lords."}
                        </p>
                    </div>

                    {/* Main 2-Column Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left: Birth Form Container (7 cols) */}
                        <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-amber-200/80 dark:border-white/10 shadow-xl backdrop-blur-md">
                            <div className="flex flex-wrap items-center justify-between pb-4 mb-6 border-b border-gray-100 dark:border-white/10 gap-2">
                                <div className="flex items-center gap-2">
                                    <Star className="w-5 h-5 text-amber-500" />
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-serif font-bold text-gray-900 dark:text-white">
                                            {isTe ? "జాతక సమాచారం" : "Birth Profile"}
                                        </h2>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {isTe ? "ఖచ్చితమైన తేదీ, సమయం మరియు పుట్టిన ప్రదేశం" : "Accurate date, time, and coordinates"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={loadPreset1998}
                                        className="text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-slate-750 transition-all cursor-pointer"
                                        title="15-Aug-1998, 10:30 AM IST, Hyderabad"
                                    >
                                        Preset 1998
                                    </button>
                                    <button
                                        type="button"
                                        onClick={loadPreset2000}
                                        className="text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-slate-800 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 hover:bg-orange-100 dark:hover:bg-slate-750 transition-all cursor-pointer"
                                        title="01-Jan-2000, 12:00 PM IST, New Delhi"
                                    >
                                        Preset 2000
                                    </button>
                                    {kpResult && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 transition-all cursor-pointer"
                                        >
                                            {isTe ? "రద్దు" : "Cancel"}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {calcError && (
                                <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span>{calcError}</span>
                                </div>
                            )}

                            <KPBirthForm
                                key={JSON.stringify(initialParams)}
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
                                                {isTe ? "249 సబ్ లార్డులు & SSL నిష్పత్తులు" : "249 Sub Lords & SSL Boundaries"}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {isTe ? "వింశోత్తరి నిష్పత్తిలో ఖచ్చితమైన ప్రారంభ, ముగింపు విభజనలు." : "Deterministic half-open interval boundaries [start, end) without rounding gaps."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-xs shrink-0 mt-0.5">
                                            3
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">
                                                {isTe ? "4-స్థాయిల భావ కారకత్వాలు" : "4-Level House Significators"}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {isTe ? "స్థాయి 1 నుండి 4 వరకు అత్యున్నత క్రమబద్ధమైన భావ ఫలితాల నిర్ణయం." : "Level 1 through 4 astrological hierarchies with planetary lordship matrices."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-xs shrink-0 mt-0.5">
                                            4
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">
                                                {isTe ? "వింశోత్తరి దశాక్రమం" : "Vimshottari Dasha Hierarchy"}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {isTe ? "దశ, భుక్తి, ప్రత్యంతర దశల కచ్చితమైన కాల వ్యవధులు." : "Exact fractional balance, zero-gap timeline, and associated Bhava significations."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Ruling Planets Quick Card */}
                            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-amber-200/80 dark:border-white/10 shadow-xs flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                                        <Compass className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                            {isTe ? "రూలింగ్ ప్లానెట్స్ (RP) సాధనం" : "Ruling Planets (RP) Tool"}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {isTe ? "ప్రస్తుత సమయ గ్రహాధిపతుల తక్షణ గణన" : "Compute instant judgment moment rulers"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/ruling-planets')}
                                    className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer shrink-0"
                                    title="Open Ruling Planets"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const formatBirthDate = (dStr) => {
        if (!dStr) return '';
        try {
            const [y, m, d] = dStr.split('-');
            const date = new Date(Number(y), Number(m) - 1, Number(d));
            return date.toLocaleDateString(isTe ? 'te-IN' : 'en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dStr;
        }
    };

    const formatBirthTime = (tStr) => {
        if (!tStr) return '';
        try {
            const [hh, mm] = tStr.split(':').map(Number);
            const period = hh >= 12 ? 'PM' : 'AM';
            const h12 = hh % 12 || 12;
            return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
        } catch {
            return tStr;
        }
    };

    return (
        <div className="min-h-screen pb-24 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">

                {/* Section A: Header Banner with Metadata */}
                <div className="relative bg-white dark:bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-amber-200/80 dark:border-white/10 shadow-lg backdrop-blur-md">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs font-bold">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>{isTe ? "ఖచ్చితమైన ఖగోళ గణనలు" : "High-Precision Astronomical Report"}</span>
                            </div>

                            <h1 className="text-3xl sm:text-4xl font-serif font-black text-gray-950 dark:text-white flex flex-wrap items-center gap-3">
                                <span>{currentParams.name}</span>
                                <span className="text-xs sm:text-sm font-sans font-bold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 capitalize">
                                    {currentParams.gender === 'male' ? (isTe ? 'పురుషుడు' : 'Male') : (isTe ? 'స్త్రీ' : 'Female')}
                                </span>
                            </h1>

                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 font-sans leading-relaxed">
                                {isTe
                                    ? "కృష్ణమూర్తి పద్ధతి (KP) ఖగోళ ప్లాసిడస్ భావాలు, సబ్ లార్డ్ & వింశోత్తరి దశల విశ్లేషణ నివేదిక"
                                    : "Complete Placidus cuspal intercepts, planetary sub-lords, significator hierarchy, and Vimshottari Dasha timeline."}
                            </p>
                        </div>

                        {/* Top Actions: Edit Birth Details & Report Studio */}
                        <div className="flex flex-wrap items-center gap-3 print:hidden">
                            <button
                                type="button"
                                onClick={handleEditDetails}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-white/10 text-sm font-bold transition-all cursor-pointer shadow-xs"
                                title="Edit birth details"
                            >
                                <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span>{t.editBirthDetails}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handlePrint('kp_kundli')}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
                                title="Generate Detailed Multi-Page Report (Preview, Download PDF or Print)"
                            >
                                <FileText className="w-4 h-4" />
                                <span>{t.printDownload || "Generate Report / PDF"}</span>
                            </button>
                        </div>
                    </div>

                    {/* Metadata Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-white/10">
                        {/* Birth Date */}
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/70 dark:border-white/5">
                            <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                            <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block font-sans">
                                    {isTe ? "పుట్టిన తేదీ" : "Birth Date"}
                                </span>
                                <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate block font-mono">
                                    {formatBirthDate(currentParams.birthDate)}
                                </span>
                            </div>
                        </div>

                        {/* Birth Time */}
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/70 dark:border-white/5">
                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block font-sans">
                                    {isTe ? "పుట్టిన సమయం" : "Birth Time"}
                                </span>
                                <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate block font-mono">
                                    {formatBirthTime(currentParams.birthTime)}
                                </span>
                            </div>
                        </div>

                        {/* Birthplace */}
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/70 dark:border-white/5">
                            <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                            <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block font-sans">
                                    {isTe ? "పుట్టిన స్థలం" : "Birthplace"}
                                </span>
                                <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate block font-sans">
                                    {currentParams.birthPlace}
                                </span>
                            </div>
                        </div>

                        {/* Timezone */}
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/70 dark:border-white/5">
                            <Globe className="w-4 h-4 text-amber-500 shrink-0" />
                            <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block font-sans">
                                    {isTe ? "టైమ్‌జోన్" : "Timezone"}
                                </span>
                                <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate block font-mono">
                                    {currentParams.timezone || 'Asia/Kolkata'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section B: 4 High-Impact Summary Cards */}
                {(() => {
                    const activeKpData = displayKpResult || kpResult;
                    return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
                            {/* Lagna & Sub Lord */}
                            <div className="relative bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-amber-300 dark:border-white/10 shadow-sm flex flex-col justify-between min-h-[160px]">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl" />
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 block">
                                            {t.lagna}
                                        </span>
                                        {rotateTo !== 1 && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                H{rotateTo}
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-serif font-bold text-xl sm:text-2xl text-amber-600 dark:text-amber-400 leading-snug">
                                        {isTe ? activeKpData.lagna?.sign?.te : activeKpData.lagna?.sign?.en}
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-1">
                                    <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-semibold flex items-center justify-between">
                                        <span>{isTe ? "సబ్ లార్డ్:" : "Sub Lord:"}</span>
                                        <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                                            {isTe ? getLocalizedPlanet(activeKpData.lagna?.subLord, 'te') : activeKpData.lagna?.subLord}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {formatDMS(activeKpData.lagna?.degreeInSign)}
                                    </div>
                                </div>
                            </div>

                            {/* Moon Sign (Rasi) & Sub Lord */}
                            <div className="relative bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-indigo-200 dark:border-white/10 shadow-sm flex flex-col justify-between min-h-[160px]">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-2xl" />
                                <div>
                                    <span className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 block mb-1">
                                        {t.moonSign}
                                    </span>
                                    <div className="font-serif font-bold text-xl sm:text-2xl text-gray-900 dark:text-white leading-snug">
                                        {isTe ? activeKpData.moonSign?.te : activeKpData.moonSign?.en}
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-1">
                                    <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-semibold flex items-center justify-between">
                                        <span>{isTe ? "సబ్ లార్డ్:" : "Sub Lord:"}</span>
                                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                                            {isTe ? getLocalizedPlanet(activeKpData.subLord, 'te') : activeKpData.subLord}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {formatDMS(activeKpData.planets?.find(p => p.key === 'Moon')?.degreeInSign || 0)}
                                    </div>
                                </div>
                            </div>

                            {/* Nakshatra Card */}
                            <div className="relative bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-purple-200 dark:border-white/10 shadow-sm flex flex-col justify-between min-h-[160px]">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-2xl" />
                                <div>
                                    <span className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 block mb-1">
                                        {isTe ? "జన్మ నక్షత్రం" : "Birth Star"}
                                    </span>
                                    <div className="font-serif font-bold text-xl sm:text-2xl text-gray-900 dark:text-white leading-snug">
                                        {isTe ? activeKpData.nakshatra?.te : activeKpData.nakshatra?.name}
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-1">
                                    <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-semibold flex items-center justify-between">
                                        <span>{isTe ? "నక్షత్రాధిపతి:" : "Star Lord:"}</span>
                                        <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                                            {isTe ? getLocalizedPlanet(activeKpData.nakshatra?.starLord, 'te') : activeKpData.nakshatra?.starLord}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {isTe ? `పాదం ${activeKpData.nakshatra?.pada || 1}` : `Pada ${activeKpData.nakshatra?.pada || 1}`}
                                    </div>
                                </div>
                            </div>

                            {/* KP Ayanamsha Card */}
                            <div className="relative bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-rose-200 dark:border-white/10 shadow-sm flex flex-col justify-between min-h-[160px]">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-400 to-rose-500 rounded-t-2xl" />
                                <div>
                                    <span className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 block mb-1">
                                        {isTe ? "KP అయనాంశ" : "KP Ayanamsha"}
                                    </span>
                                    <div className="font-mono font-bold text-lg sm:text-xl text-gray-900 dark:text-white leading-snug">
                                        {activeKpData.metadata?.ayanamshaFormatted}
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-1">
                                    <div className="text-xs sm:text-sm text-rose-700 dark:text-rose-400 font-bold">
                                        {chartMode === 'horary' ? (isTe ? "KP ప్రశ్నా పద్ధతి" : "KP Horary System") : (isTe ? "ప్లాసిడస్ భావాలు" : "Placidus Cusps")}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {activeKpData.metadata?.ayanamshaMode || 'KP_NEW'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Section C: Sticky Navigation Tabs with Scroll Arrows & Smooth Controls */}
                <div className="bg-white/95 dark:bg-slate-900/95 p-1.5 sm:p-2 rounded-2xl border border-amber-200/80 dark:border-white/10 shadow-md backdrop-blur-md sticky top-16 sm:top-[74px] z-30 print:hidden flex items-center gap-1 sm:gap-2">
                    {/* Left Scroll Button */}
                    <button
                        type="button"
                        onClick={() => handleTabsScroll('left')}
                        disabled={!canScrollLeft}
                        aria-label={isTe ? "ఎడమవైపు ట్యాబ్‌లను చూడండి" : "Scroll tabs left"}
                        title={isTe ? "ఎడమవైపు ట్యాబ్‌లను చూడండి" : "Scroll tabs left"}
                        className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                            canScrollLeft
                                ? 'bg-amber-100 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-sm cursor-pointer'
                                : 'opacity-25 text-gray-400 dark:text-gray-600 cursor-not-allowed pointer-events-none'
                        }`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Scrollable Tabs Track */}
                    <div
                        ref={tabsContainerRef}
                        onWheel={handleTabsWheel}
                        className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto tab-scrollbar py-1 scroll-smooth"
                    >
                        {[
                            { id: 'chart', label: t.tabChart, icon: Star },
                            { id: 'planets', label: t.tabPlanets, icon: Sun },
                            { id: 'cusps', label: t.tabCusps, icon: Layers },
                            { id: 'significators', label: t.tabSignificators, icon: Shield },
                            { id: 'event-analysis', label: isTe ? "ఈవెంట్ విశ్లేషణ" : "Event Analysis", icon: Target },
                            { id: 'dasha', label: t.tabDasha || "Vimshottari Dasha", icon: Clock },
                            { id: 'aspects', label: t.tabAspects, icon: Eye },
                            { id: 'ruling', label: t.tabRulingPlanets, icon: Compass }
                        ].map(tab => {
                            const isCurrent = activeTab === tab.id;
                            const Icon = tab.icon;

                            return (
                                <button
                                    key={tab.id}
                                    data-tab-id={tab.id}
                                    type="button"
                                    onClick={() => handleTabClick(tab.id)}
                                    className={`px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                                        isCurrent
                                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 scale-[1.02]'
                                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-amber-500'}`} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Scroll Button */}
                    <button
                        type="button"
                        onClick={() => handleTabsScroll('right')}
                        disabled={!canScrollRight}
                        aria-label={isTe ? "కుడివైపు ట్యాబ్‌లను చూడండి" : "Scroll tabs right"}
                        title={isTe ? "కుడివైపు ట్యాబ్‌లను చూడండి" : "Scroll tabs right"}
                        className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                            canScrollRight
                                ? 'bg-amber-100 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-sm cursor-pointer'
                                : 'opacity-25 text-gray-400 dark:text-gray-600 cursor-not-allowed pointer-events-none'
                        }`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Section D: Active Tab Content Area - Persistent Panels Prevent Unintended Component Remounting */}
                <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-amber-200/80 dark:border-white/10 shadow-md min-h-[500px]">
                    {/* Tab 1: KP Chart */}
                    <div className={activeTab === 'chart' ? 'space-y-6' : 'hidden'}>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white">
                                {isTe ? "కృష్ణమూర్తి పద్ధతి జాతక చక్రం" : "Precision KP Horoscope Chart"}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {isTe
                                    ? "12 ప్లాసిడస్ భావ సంధులు, గ్రహాల సబ్ లార్డ్ భావ కారకత్వ పట్టికతో సంపూర్ణ చక్రం."
                                    : "Complete Placidus cuspal intercepts, planetary sub-lords and cuspal lordship matrix."}
                            </p>
                        </div>

                        <div className="flex justify-center w-full">
                            <KPChart
                                kpData={displayKpResult || kpResult}
                                lang={lang}
                                birthDetails={currentParams}
                                chartMode={chartMode}
                                kpNumber={horaryState.number}
                                rotateTo={rotateTo}
                                onRotateChange={handleRotateChange}
                                horarySeed={horaryState}
                            />
                        </div>
                    </div>

                    {/* Tab 2: Planetary Coordinates & Sub Lords Table */}
                    <div className={activeTab === 'planets' ? 'space-y-6' : 'hidden'}>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white">
                                {isTe ? "గ్రహ స్థితులు & సబ్ లార్డ్ పట్టిక" : "Planetary Coordinates & Sub Lord Table"}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {isTe
                                    ? "రాశి, భావం, నక్షత్ర నాథుడు, సబ్ లార్డ్ మరియు సబ్-సబ్ లార్డ్ వివరాలు."
                                    : "Comprehensive sign longitudes, Nakshatras, Star Lords, Sub Lords, and Sub-Sub Lords."}
                            </p>
                        </div>

                        <KPPlanetTable
                            planets={(displayKpResult || kpResult).planets}
                            fortuna={(displayKpResult || kpResult).fortuna}
                            cusps={(displayKpResult || kpResult).cusps}
                            lagna={(displayKpResult || kpResult).lagna}
                            lang={lang}
                        />
                    </div>

                    {/* Tab 3: 12 Placidus House Cusps */}
                    <div className={activeTab === 'cusps' ? 'space-y-6' : 'hidden'}>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white">
                                {isTe ? "12 ప్లాసిడస్ భావ సంధులు" : "12 Placidus House Cusps"}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {isTe
                                    ? "ప్రతి భావ ప్రారంభ డిగ్రీ, రాశ్యాధిపతి, నక్షత్రాధిపతి మరియు సబ్ లార్డ్ వివరాలు."
                                    : "Exact degree of each cusp with associated Sign Lord, Star Lord, Sub Lord, and Sub-Sub Lord."}
                            </p>
                        </div>

                        <KPCuspTable cusps={(displayKpResult || kpResult).cusps} lang={lang} />
                    </div>

                    {/* Tab 4: 4-Level House Significators */}
                    <div className={activeTab === 'significators' ? 'space-y-6' : 'hidden'}>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white">
                                {isTe ? "KP 4-స్థాయి భావ కారకత్వాలు" : "Classical KP 4-Level House Significators"}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {isTe
                                    ? "ఫలిత నిర్ణయానికి ప్రామాణిక 4 స్థాయిల భావ కారక గ్రహాల జాబితా."
                                    : "Four-level astrological hierarchy of house significators for precise event prediction."}
                            </p>
                        </div>

                        <KPSignificators significators={(displayKpResult || kpResult).significators} lang={lang} />
                    </div>

                    {/* Tab 5: Vimshottari Dasha */}
                    <div className={activeTab === 'dasha' ? 'space-y-6' : 'hidden'}>
                        <VimshottariDasha
                            kpResult={displayKpResult || kpResult}
                            lang={lang}
                            birthDetails={currentParams}
                            initialDate={dashaTargetDate}
                        />
                    </div>

                    {/* Tab 6: Planetary Aspects */}
                    <div className={activeTab === 'aspects' ? 'space-y-6' : 'hidden'}>
                        <KPAspects kpResult={displayKpResult || kpResult} lang={lang} />
                    </div>

                    {/* Tab 7: Ruling Planets Tool */}
                    <div className={activeTab === 'ruling' ? 'space-y-6' : 'hidden'}>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white">
                                {isTe ? "రూలింగ్ ప్లానెట్స్ (RP) టూల్" : "Ruling Planets (RP) Tool"}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {isTe
                                    ? "ప్రశ్న క్షణ సమయ లగ్న, చంద్ర నక్షత్ర, రాశి మరియు దిన నాథుల విశ్లేషణ."
                                    : "Dynamic horary analysis of the ruling planets for any judgment moment."}
                            </p>
                        </div>

                        <KPRulingPlanets
                            defaultLocation={{
                                name: currentParams.birthPlace,
                                lat: currentParams.lat,
                                lon: currentParams.lon,
                                timezone: currentParams.timezone
                            }}
                            lang={lang}
                        />
                    </div>

                    {/* Tab 8: KP Event-Based Significator Analysis - Preserves Selection State In-Memory */}
                    <div className={activeTab === 'event-analysis' ? 'space-y-6' : 'hidden'}>
                        <KPEventSignificatorAnalysis
                            kpData={{
                                ...(displayKpResult || kpResult),
                                birthInstantUtc: currentParams ? `${currentParams.birthDate}T${currentParams.birthTime}:00` : null
                            }}
                            lang={lang}
                            onLoadBenchmark={loadPreset1998}
                            onViewChart={() => setActiveTab('chart')}
                            onViewDasha={(targetDate) => {
                                setDashaTargetDate(targetDate);
                                setActiveTab('dasha');
                            }}
                        />
                    </div>
                </div>

                {/* Bottom Back & Reset Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-amber-50/70 dark:bg-slate-900/70 border border-amber-200/80 dark:border-white/10 print:hidden">
                    <button
                        type="button"
                        onClick={handleEditDetails}
                        className="inline-flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm hover:underline cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>{t.editBirthDetails}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            try {
                                sessionStorage.removeItem('kp_studio_result');
                                safeClearEventAnalysisState();
                            } catch {}
                            navigate('/');
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-white/10 text-amber-900 dark:text-amber-200 font-bold text-sm hover:bg-amber-50 shadow-xs cursor-pointer transition-all"
                    >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>{t.createNewKundli}</span>
                    </button>
                </div>

                {/* Professional Report Studio Modal */}
                <ReportGenerationModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    kpData={displayKpResult || kpResult}
                    birthDetails={currentParams}
                    initialReportType={modalReportType}
                    lang={lang}
                />

            </div>
        </div>
    );
};
