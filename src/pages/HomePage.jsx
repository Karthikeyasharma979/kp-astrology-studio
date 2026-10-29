import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Star, Sun, Shield, BookOpen, Compass,
    Layers, Clock, ArrowRight, CheckCircle2, ChevronRight,
    Cpu, Activity, Zap, ChevronDown, ChevronUp,
    Eye, ShieldCheck, Award, MapPin
} from 'lucide-react';

export const HomePage = ({ lang = 'te', onLangChange }) => {
    const navigate = useNavigate();
    const isTe = lang === 'te';

    const [hasExistingResult, setHasExistingResult] = useState(false);
    const [existingName, setExistingName] = useState('');
    const [activeFaq, setActiveFaq] = useState(null);

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

    const toggleFaq = (idx) => {
        setActiveFaq(activeFaq === idx ? null : idx);
    };

    const faqs = [
        {
            qEn: "What makes Krishnamurti Paddhati (KP) unique?",
            qTe: "కృష్ణమూర్తి పద్ధతి (KP) ప్రత్యేకత ఏమిటి?",
            aEn: "KP Astrology introduces the revolutionary Sub-Lord theory. Traditional astrology considers the sign and nakshatra, but KP divides each of the 27 nakshatras into 9 unequal sub-divisions matching the Vimshottari Dasha ratio. The Sub-Lord decides the ultimate fruition and quality of an event.",
            aTe: "సంప్రదాయ జ్యోతిష్యం రాశి, నక్షత్ర ఫలితాల వరకే చూస్తుంది. కానీ కేపీ పద్ధతి ప్రతి నక్షత్రాన్ని వింశోత్తరి నిష్పత్తిలో 9 ఉప-విభాగాలు (సబ్ లార్డులు)గా విభజించి ఫలితాన్ని నిర్ధారిస్తుంది. గ్రహం ఫలితాన్ని ఇస్తే, సబ్ లార్డ్ ఆ ఫలితం సిద్ధించునా లేదా అనేది స్పష్టంగా నిర్ణయిస్తుంది."
        },
        {
            qEn: "Why does KP use the Placidus House System?",
            qTe: "KP లో ప్లాసిడస్ భావ పద్ధతిని ఎందుకు ఉపయోగిస్తారు?",
            aEn: "KP Astrology rejects equal 30-degree whole-sign houses. It uses Placidus semi-arc trisection, which projects real astronomical diurnal and nocturnal planetary paths onto the horizon and meridian, producing true unequal house cusps for your exact birth latitude.",
            aTe: "కేపీ విధానంలో 30 డిగ్రీల సమాన భావాలను అంగీకరించరు. భూమి అక్షాంశాలకు అనుగుణంగా ప్లాసిడస్ సమత్రిభాజ్య పద్ధతిలో 12 భావాల ప్రారంభ బిందువులు (భావ సంధులు) ఖచ్చితమైన డిగ్రీలలో లెక్కించబడతాయి."
        },
        {
            qEn: "What are 4-Level House Significators?",
            qTe: "4-స్థాయిల భావ కారకత్వాలు (4-Level Significators) అంటే ఏమిటి?",
            aEn: "KP ranks planetary results into four strict hierarchical tiers: Level 1 (Planet in Star of Occupant), Level 2 (Direct Occupant of House), Level 3 (Planet in Star of Owner), and Level 4 (Owner of House). Level 1 is the strongest significator, giving razor-sharp predictions.",
            aTe: "గ్రహాలు భావ ఫలితాలను ఇచ్చే క్రమాన్ని 4 స్థాయిలుగా విభజిస్తారు: స్థాయి 1 (భావంలో ఉన్న గ్రహ నక్షత్రంలో ఉన్న గ్రహం - అత్యంత బలమైనది), స్థాయి 2 (భావంలో ఉన్న గ్రహం), స్థాయి 3 (భావాధిపతి నక్షత్రంలో ఉన్న గ్రహం), మరియు స్థాయి 4 (భావాధిపతి)."
        },
        {
            qEn: "How are Ruling Planets (RP) used in Prashna?",
            qTe: "ప్రశ్న శాస్త్రంలో రూలింగ్ ప్లానెట్స్ (RP) ఎలా ఉపయోగపడతాయి?",
            aEn: "Ruling Planets represent the celestial clock at the moment a question arises in the astrologer's mind. It computes the Day Lord, Moon Sign & Star Lords, and Ascendant Sign, Star & Sub Lords to verify birth times, confirm chart accuracy, and answer urgent questions.",
            aTe: "ఒక ప్రశ్న వచ్చిన క్షణంలో ఖగోళంలో ఉన్న గ్రహాధిపతులను (వారాధిపతి, చంద్రుని రాశి/నక్షత్రాధిపతి, లగ్న రాశి/నక్షత్ర/సబ్ లార్డ్) రూలింగ్ ప్లానెట్స్ అంటారు. ఇవి జనన సమయ సవరణకు మరియు ప్రశ్న ఫలితాల నిర్ణయానికి అత్యంత శక్తిమంతమైనవి."
        },
        {
            qEn: "How accurate are the astronomical calculations in this studio?",
            qTe: "ఈ స్టూడియోలో ఖగోళ గణనల ఖచ్చితత్వం ఎంత?",
            aEn: "AstroSharma is powered by an authoritative astronomical engine, computing apparent geocentric coordinates, nutation in longitude, and Krishnamurti sidereal ayanamsha within sub-arcsecond astronomical precision.",
            aTe: "ఈ స్టూడియో అధికారిక ఖగోళ గణనల ఆధారంగా పనిచేస్తుంది. గ్రహ స్థానాలు, భావ సంధులు, ఆయనాంశ మరియు వింశోత్తరి దశలు మైక్రో-ఆర్క్‌సెకండ్ ఖగోళ ఖచ్చితత్వంతో లెక్కించబడతాయి."
        }
    ];

    return (
        <div className="relative min-h-screen pb-24 overflow-hidden font-sans">
            {/* Ambient Cosmic Background Lighting */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-amber-500/10 via-orange-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
            <div className="absolute top-[500px] -left-40 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute top-[1000px] -right-40 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

            {/* 1. HERO SECTION */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-16 pb-12 sm:pb-16 text-center">
                {/* Engine Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-bold shadow-xs mb-6">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <Cpu className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>{isTe ? "ప్రామాణిక ఖగోళ గణనలు" : "High-Precision Astronomical Engine"}</span>
                </div>

                {/* Grand Heading */}
                <h1 className={`text-3xl sm:text-6xl font-serif font-black max-w-4xl mx-auto text-gray-950 dark:text-white ${isTe ? 'leading-[1.38] sm:leading-[1.42] tracking-normal' : 'leading-[1.18] tracking-tight'}`}>
                    {isTe ? (
                        <>
                            ఖచ్చితమైన <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 dark:from-amber-400 dark:via-orange-300 dark:to-amber-500 bg-clip-text text-transparent">కృష్ణమూర్తి పద్ధతి (KP)</span> జాతక చక్రం & విశ్లేషణ
                        </>
                    ) : (
                        <>
                            High-Precision <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 dark:from-amber-400 dark:via-orange-300 dark:to-amber-500 bg-clip-text text-transparent">Krishnamurti Paddhati (KP)</span> Astrology Studio
                        </>
                    )}
                </h1>

                {/* Subtitle */}
                <p className="mt-5 text-base sm:text-xl text-gray-600 dark:text-gray-300 font-sans max-w-3xl mx-auto leading-relaxed">
                    {isTe
                        ? "ప్లాసిడస్ భావ సంధులు, 249 సబ్ లార్డ్ విభజనలు, 4-స్థాయిల భావ కారకత్వాలు మరియు ఖచ్చితమైన వింశోత్తరి దశల సమగ్ర గణన వేదిక."
                        : "Authoritative astronomical calculation studio featuring true Placidus house trisection, exact 249 Sub-Lords, 4-tier House Significators, and millisecond-accurate Vimshottari Dasha hierarchies."}
                </p>

                {/* Primary Action Buttons */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/chart')}
                        className="px-7 py-3.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <Sparkles className="w-5 h-5" />
                        <span>{isTe ? "KP చక్రాన్ని ప్రారంభించండి" : "Generate Your KP Chart"}</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/ruling-planets')}
                        className="px-6 py-3.5 rounded-full bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-white/10 text-gray-800 dark:text-gray-200 hover:border-amber-400 font-bold text-sm sm:text-base shadow-sm hover:bg-amber-50/50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <Compass className="w-5 h-5 text-amber-500" />
                        <span>{isTe ? "రూలింగ్ ప్లానెట్స్ టూల్" : "Ruling Planets Tool"}</span>
                    </button>
                </div>

                {/* KPI Metrics Ribbon */}
                <div className="mt-12 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-amber-200/60 dark:border-white/10 backdrop-blur-md shadow-xs">
                        <div className="text-2xl sm:text-3xl font-black font-serif text-amber-600 dark:text-amber-400">249</div>
                        <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                            {isTe ? "సబ్ లార్డులు" : "Sub-Lords"}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            {isTe ? "వింశోత్తరి నిష్పత్తి" : "Zero-gap intervals"}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-amber-200/60 dark:border-white/10 backdrop-blur-md shadow-xs">
                        <div className="text-2xl sm:text-3xl font-black font-serif text-amber-600 dark:text-amber-400">12</div>
                        <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                            {isTe ? "ప్లాసిడస్ భావాలు" : "Placidus Cusps"}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            {isTe ? "సమత్రిభాజ్య డిగ్రీలు" : "True Semi-arc"}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-amber-200/60 dark:border-white/10 backdrop-blur-md shadow-xs">
                        <div className="text-2xl sm:text-3xl font-black font-serif text-amber-600 dark:text-amber-400">4-Tier</div>
                        <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                            {isTe ? "భావ కారకత్వాలు" : "Significators"}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            {isTe ? "సమగ్ర ABCD పద్ధతి" : "Levels 1 to 4 hierarchy"}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-amber-200/60 dark:border-white/10 backdrop-blur-md shadow-xs">
                        <div className="text-2xl sm:text-3xl font-black font-serif text-amber-600 dark:text-amber-400">120 Yrs</div>
                        <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                            {isTe ? "వింశోత్తరి దశలు" : "Vimshottari Dasha"}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            {isTe ? "దశా భుక్తి ప్రత్యంతర" : "Subperiod timelines"}
                        </div>
                    </div>
                </div>

                {/* Existing Session Quick Resume Card */}
                {hasExistingResult && (
                    <div className="mt-6">
                        <button
                            type="button"
                            onClick={() => navigate('/chart')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300/80 dark:border-amber-600/50 text-amber-950 dark:text-amber-200 text-sm font-bold hover:bg-amber-100/50 transition-all shadow-xs cursor-pointer"
                        >
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span>{isTe ? `${existingName} గారి ఇటీవలి జాతకాన్ని వీక్షించండి` : `View recent KP chart for ${existingName}`}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </section>

            {/* 2. CORE KP MODULES FEATURE GRID */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div className="text-center max-w-3xl mx-auto mb-10">
                    <span className="text-xs font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold">
                        {isTe ? "సమగ్ర కేపీ విశ్లేషణ మాడ్యూల్స్" : "Comprehensive Analytical Engine"}
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-serif font-black text-gray-950 dark:text-white mt-2">
                        {isTe ? "KP జ్యోతిష్య స్టూడియో ప్రత్యేకతలు" : "Engineered for Complete KP Mastery"}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2">
                        {isTe 
                            ? "సాంప్రదాయ ఫలితాలతో సరిపోల్చలేనంత ఖచ్చితత్వంతో కూడిన 6 ప్రధాన ఖగోళ గణన మాడ్యూల్స్."
                            : "Six authoritative mathematical modules built directly on top of high-precision astronomical coordinates."}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Feature 1 */}
                    <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-white/10 shadow-xs hover:border-amber-400 dark:hover:border-amber-500/40 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Layers className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                            {isTe ? "ప్లాసిడస్ భావ సంధులు" : "Placidus House Cusps"}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                            {isTe
                                ? "సమత్రిభాజ్య పద్ధతిలో 12 భావాల ప్రారంభ డిగ్రీలను లెక్కించి, రాశి చక్ర సరిహద్దులను దాటే భావాలను సైతం ఖచ్చితంగా నిర్ణయిస్తుంది."
                                : "Computes exact semi-arc trisection cusps for all 12 houses, correctly handling polar latitudes and boundaries wrapping across Pisces-Aries."}
                        </p>
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <span>{isTe ? "దక్షిణ & ఉత్తర భారతీయ చక్రాలు" : "South & North Indian Charts"}</span>
                        </div>
                    </div>

                    {/* Feature 2 */}
                    <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-white/10 shadow-xs hover:border-amber-400 dark:hover:border-amber-500/40 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/70 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Star className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                            {isTe ? "249 సబ్ లార్డ్ విభజనలు" : "249 Sub & Sub-Sub Lords"}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                            {isTe
                                ? "ప్రతి నక్షత్రాన్ని వింశోత్తరి నిష్పత్తిలో 9 ఉప-విభాగాలుగా విభజించి [ప్రారంభం, ముగింపు) డిగ్రీలను ఖచ్చితంగా గుర్తిస్తుంది."
                                : "Partitions all 27 nakshatras into 249 Sub-Lords and deeper Sub-Sub Lords with deterministic half-open interval boundaries and zero rounding defects."}
                        </p>
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center text-xs font-semibold text-orange-600 dark:text-orange-400">
                            <span>{isTe ? "ఖచ్చితమైన సరిహద్దు ధృవీకరణ" : "Verified Half-Open Intervals"}</span>
                        </div>
                    </div>

                    {/* Feature 3 */}
                    <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-white/10 shadow-xs hover:border-amber-400 dark:hover:border-amber-500/40 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                            {isTe ? "4-స్థాయిల భావ కారకత్వాలు" : "4-Tier House Significators"}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                            {isTe
                                ? "స్థాయి 1 నుండి 4 వరకు గ్రహాలు ఫలితాన్ని ఇచ్చే శక్తి సామర్థ్యాలను మరియు రాశ్యాధిపత్య మ్యాట్రిక్స్‌ను క్రమపద్ధతిలో విశ్లేషిస్తుంది."
                                : "Generates complete ABCD hierarchy: Level 1 (Star of Occupant), Level 2 (Occupant), Level 3 (Star of Owner), and Level 4 (Owner of House)."}
                        </p>
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <span>{isTe ? "స్థాయి 1-4 సంపూర్ణ మ్యాట్రిక్స్" : "Authoritative ABCD System"}</span>
                        </div>
                    </div>

                    {/* Feature 4 */}
                    <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-white/10 shadow-xs hover:border-amber-400 dark:hover:border-amber-500/40 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Clock className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                            {isTe ? "వింశోత్తరి దశల కాలగణన" : "Vimshottari Dasha Hierarchy"}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                            {isTe
                                ? "చంద్రుని స్పష్ట భుక్తి ఆధారంగా 120 ఏళ్ల మహాదశ, అంతర్దశ, ప్రత్యంతర్దశ కాలగణనతో పాటు వాటి భావ ఫలితాలను సమగ్రంగా అందిస్తుంది."
                                : "Complete 120-year multi-level period hierarchy featuring exact birth balance clipping, active reference date navigation, and planetary house significations."}
                        </p>
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            <span>{isTe ? "మహా, అంతర, ప్రత్యంతర దశలు" : "Maha / Antar / Pratyantar"}</span>
                        </div>
                    </div>

                    {/* Feature 5 */}
                    <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-white/10 shadow-xs hover:border-amber-400 dark:hover:border-amber-500/40 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Eye className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                            {isTe ? "గ్రహ దృష్టి కోణాలు & ఆస్పెక్ట్స్" : "Planetary Aspects & Drishti"}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                            {isTe
                                ? "పాశ్చాత్య జామెట్రిక్ ఆస్పెక్ట్స్ (యుతి, కేంద్ర, త్రికోణ) తో పాటు సాంప్రదాయ పరాశరి గ్రహ దృష్టులను ఒకే చోట సమన్వయం చేస్తుంది."
                                : "Calculates Western geometric aspects with applying/separating orbs alongside Vedic Parashari Graha Drishti mapping on houses."}
                        </p>
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center text-xs font-semibold text-rose-600 dark:text-rose-400">
                            <span>{isTe ? "అప్లయింగ్ / సెపరేటింగ్ ఆర్బ్స్" : "Applying & Separating Dynamics"}</span>
                        </div>
                    </div>

                    {/* Feature 6 */}
                    <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-white/10 shadow-xs hover:border-amber-400 dark:hover:border-amber-500/40 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Compass className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                            {isTe ? "రూలింగ్ ప్లానెట్స్ (RP)" : "Ruling Planets (RP)"}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                            {isTe
                                ? "ప్రశ్న సమయ లగ్న, చంద్ర, వారాధిపతులను ప్రత్యక్షంగా లెక్కించి, తక్షణ ఫలితాల నిర్ణయానికి మరియు సమయ పరిశీలనకు తోడ్పడుతుంది."
                                : "Instant judgment moment celestial clock for Prashna horary queries and birth time rectification, identifying active cosmic rulers."}
                        </p>
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <span>{isTe ? "తక్షణ ప్రశ్న పరిశీలన" : "Real-Time Judgment Rulers"}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. THE THREE PILLARS OF KP ASTROLOGY (EDUCATIONAL) */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/30 dark:via-slate-900/70 dark:to-slate-950 border border-amber-200/80 dark:border-white/10 shadow-lg">
                    <div className="max-w-3xl mb-8">
                        <span className="text-xs font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold">
                            {isTe ? "కేపీ మూల సిద్ధాంతం" : "The Core Axiom"}
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-serif font-black text-gray-950 dark:text-white mt-2">
                            {isTe ? "KP జ్యోతిష్యానికి మూలస్తంభాలు" : "The Three Pillars of KP Decision Making"}
                        </h2>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2">
                            {isTe
                                ? "కృష్ణమూర్తి పద్ధతిలో ఫలిత నిర్ణయానికి ప్రొఫెసర్ కె.ఎస్. కృష్ణమూర్తి గారు ప్రతిపాదించిన సూత్రం: 'గ్రహం ఫలితాన్ని ఇస్తుంది, నక్షత్రాధిపతి రంగస్థలాన్ని చూపిస్తాడు, సబ్ లార్డ్ ఆ ఫలితం సిద్ధిస్తుందా లేదా అనేది నిర్ణయిస్తుంది'."
                                : "In KP Astrology, every event is governed by a precise three-tier hierarchy: The Planet is the Source, the Star Lord indicates the Matter/House, and the Sub-Lord decides the ultimate Fruit/Outcome."}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-200/60 dark:border-white/10 shadow-xs">
                            <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                                {isTe ? "స్తంభం 1 • మూలం" : "Pillar 1 • The Source"}
                            </div>
                            <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                                {isTe ? "గ్రహం (Planet)" : "The Planet"}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                                {isTe 
                                    ? "గ్రహం తన సహజ కారకత్వాల ద్వారా ఘటనకు అవసరమైన శక్తిని, ప్రేరణను అందిస్తుంది."
                                    : "Represents the actor or energy source. Natural significations of the planet provide the raw potential for the event."}
                            </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-200/60 dark:border-white/10 shadow-xs">
                            <div className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">
                                {isTe ? "స్తంభం 2 • రంగస్థలం" : "Pillar 2 • The Field"}
                            </div>
                            <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                                {isTe ? "నక్షత్రాధిపతి (Star Lord)" : "The Star Lord"}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                                {isTe 
                                    ? "గ్రహం ఏ నక్షత్రంలో ఉందో ఆ నక్షత్రాధిపతి ఫలితం ఏ భావానికి సంబంధించినదో నిర్దేశిస్తాడు."
                                    : "Dictates which specific houses are activated. A planet primarily offers the results of the houses owned and occupied by its Star Lord."}
                            </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-300 dark:border-amber-600/50 shadow-md ring-1 ring-amber-400/30">
                            <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>{isTe ? "స్తంభం 3 • తుది నిర్ణయం" : "Pillar 3 • The Decider"}</span>
                            </div>
                            <h3 className="text-lg font-serif font-bold text-gray-900 dark:text-white">
                                {isTe ? "సబ్ లార్డ్ (Sub-Lord)" : "The Sub-Lord"}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                                {isTe 
                                    ? "సబ్ లార్డ్ సంబంధిత భావాలకు అనుకూలమైన భావాలతో సంబంధం కలిగి ఉంటే ఫలితం సిద్ధిస్తుంది, లేదంటే విఫలమవుతుంది."
                                    : "The ultimate decider. If the Sub-Lord signifies favorable houses (e.g. 2, 7, 11 for marriage; 2, 6, 10, 11 for career), the event fructifies smoothly."}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. FREQUENTLY ASKED QUESTIONS (FAQ) ACCORDION */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div className="text-center mb-10">
                    <span className="text-xs font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold">
                        {isTe ? "తరచుగా అడిగే ప్రశ్నలు" : "Knowledge Base"}
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-serif font-black text-gray-950 dark:text-white mt-2">
                        {isTe ? "సందేహాలు & సమాధానాలు" : "Frequently Asked Questions"}
                    </h2>
                </div>

                <div className="space-y-3">
                    {faqs.map((faq, idx) => {
                        const isOpen = activeFaq === idx;
                        return (
                            <div 
                                key={idx}
                                className="rounded-2xl border border-amber-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 overflow-hidden shadow-xs transition-colors"
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleFaq(idx)}
                                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                                >
                                    <span>{isTe ? faq.qTe : faq.qEn}</span>
                                    {isOpen ? (
                                        <ChevronUp className="w-5 h-5 text-amber-500 shrink-0" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                                    )}
                                </button>

                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-white/5 pt-3">
                                                {isTe ? faq.aTe : faq.aEn}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* 5. BOTTOM CALL TO ACTION BANNER */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-700 p-8 sm:p-12 text-white shadow-2xl text-center">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_70%)] pointer-events-none" />
                    
                    <h2 className="text-2xl sm:text-4xl font-serif font-black tracking-tight relative z-10">
                        {isTe 
                            ? "మీ జీవిత ఖగోళ సూచనలను ఖచ్చితంగా తెలుసుకోండి"
                            : "Ready to Explore Your Destiny with Astronomical Precision?"}
                    </h2>
                    <p className="mt-3 text-sm sm:text-base text-amber-100 max-w-2xl mx-auto relative z-10">
                        {isTe
                            ? "ప్లాసిడస్ భావ సంధులు, 249 సబ్ లార్డులు మరియు వింశోత్తరి దశల సమగ్ర నివేదికను వెంటనే రూపొందించుకోండి."
                            : "Generate your complete KP Kundli report instantly with high-precision astronomical calculations and 4-tier significators."}
                    </p>

                    <div className="mt-6 flex justify-center relative z-10">
                        <button
                            type="button"
                            onClick={() => navigate('/chart')}
                            className="px-8 py-3.5 rounded-full bg-white text-orange-600 hover:bg-amber-50 font-bold text-sm sm:text-base shadow-lg shadow-black/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <Sparkles className="w-5 h-5 text-orange-500" />
                            <span>{isTe ? "ఉచితంగా జాతకం ప్రారంభించండి" : "Generate Your Free KP Chart"}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};
