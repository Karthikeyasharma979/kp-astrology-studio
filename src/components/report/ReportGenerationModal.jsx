import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, Download, Printer, Eye, X, Check, Shield, AlertTriangle,
    Star, Sun, Target, Calendar, Clock, MapPin, User, ChevronRight,
    RefreshCw, Layers, Compass, Lock, Unlock, Search, Plus, Trash2
} from 'lucide-react';

import {
    REPORT_TYPES,
    generateMissingPersonReport,
    generateKPKundliReport,
    generateVedicReport,
    generateEventAnalysisReport,
    downloadReportPdf,
    printReportPdf,
    getReportPdfBlobUrl
} from '../../services/reportGenerator.js';

import { KP_HOUSE_GROUPING_RULES } from '../../data/kpHouseGroupingRules.js';
import { KP_TRANSLATIONS } from '../../utils/kpTranslations.js';

export const ReportGenerationModal = ({
    isOpen,
    onClose,
    kpData,
    birthDetails = {},
    initialReportType = REPORT_TYPES.MISSING_PERSON,
    initialSelectedEvents = [],
    lang = 'te'
}) => {
    const isTe = lang === 'te';
    const t = KP_TRANSLATIONS[lang] || KP_TRANSLATIONS.te;

    // Report Configuration State
    const [reportType, setReportType] = useState(initialReportType);
    const [chartStyle, setChartStyle] = useState('south'); // 'south' | 'north'

    // Missing Person Case Details
    const [caseReference, setCaseReference] = useState(() => `CASE-MP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
    const [subjectName, setSubjectName] = useState(() => birthDetails?.name || (isTe ? 'రమేష్ శర్మ' : 'Ramesh Sharma'));
    const [maskName, setMaskName] = useState(false);
    const [age, setAge] = useState('26');
    const [gender, setGender] = useState(() => birthDetails?.gender || 'male');
    const [missingSinceDate, setMissingSinceDate] = useState(() => birthDetails?.birthDate || '2024-01-15');
    const [missingSinceTime, setMissingSinceTime] = useState(() => birthDetails?.birthTime || '14:30');
    const [lastKnownLocation, setLastKnownLocation] = useState(() => birthDetails?.birthPlace || 'Secunderabad Railway Station, Hyderabad');
    const [caseStatus, setCaseStatus] = useState('Active Missing Person Investigation');
    const [reportingParty, setReportingParty] = useState('Immediate Family');

    // Default Missing Person Rules from Registry
    const defaultMissingRules = useMemo(() => {
        const news = KP_HOUSE_GROUPING_RULES.find(r => r.event.toLowerCase().includes('hearing news about a missing person'));
        const ret = KP_HOUSE_GROUPING_RULES.find(r => r.event.toLowerCase().includes('return of missing person'));
        return [news, ret].filter(Boolean);
    }, []);

    // Selected Event Rules
    const [selectedEvents, setSelectedEvents] = useState(() => {
        if (initialSelectedEvents && initialSelectedEvents.length > 0) {
            return initialSelectedEvents;
        }
        return defaultMissingRules;
    });

    // Rule Search & Catalog Picker
    const [ruleSearch, setRuleSearch] = useState('');
    const [isRuleSearchOpen, setIsRuleSearchOpen] = useState(false);

    // PDF Preview & Generation State
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
    const [activeTab, setActiveTab] = useState('config'); // 'config' | 'preview'
    const [currentDoc, setCurrentDoc] = useState(null);

    // Clean up preview Blob URL on unmount or new generation
    useEffect(() => {
        return () => {
            if (previewBlobUrl) {
                URL.revokeObjectURL(previewBlobUrl);
            }
        };
    }, [previewBlobUrl]);

    // Keep initial events sync
    useEffect(() => {
        if (initialSelectedEvents && initialSelectedEvents.length > 0) {
            setSelectedEvents(prev => {
                const map = new Map();
                [...initialSelectedEvents, ...prev].forEach(r => map.set(r.id, r));
                return Array.from(map.values());
            });
        }
    }, [initialSelectedEvents]);

    // Filter rules for quick search
    const filteredCatalogRules = useMemo(() => {
        const q = ruleSearch.trim().toLowerCase();
        if (!q || q.length < 2) return [];
        return KP_HOUSE_GROUPING_RULES.filter(r =>
            r.event.toLowerCase().includes(q) ||
            r.subject.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q)
        ).slice(0, 8);
    }, [ruleSearch]);

    const handleAddRule = (rule) => {
        if (!selectedEvents.some(r => r.id === rule.id)) {
            setSelectedEvents(prev => [...prev, rule]);
        }
        setRuleSearch('');
        setIsRuleSearchOpen(false);
    };

    const handleRemoveRule = (ruleId) => {
        setSelectedEvents(prev => prev.filter(r => r.id !== ruleId));
    };

    /**
     * Builds PDF document using the selected template
     */
    const compilePdfDocument = async () => {
        if (!kpData) return null;

        const effectiveBirthDetails = {
            ...birthDetails,
            name: subjectName,
            gender,
            birthDate: missingSinceDate,
            birthTime: missingSinceTime,
            birthPlace: lastKnownLocation
        };

        const mpCase = {
            caseReference,
            subjectName,
            maskName,
            age,
            missingSinceDate,
            missingSinceTime,
            lastKnownLocation,
            status: caseStatus,
            reportingParty
        };

        if (reportType === REPORT_TYPES.MISSING_PERSON) {
            return await generateMissingPersonReport({
                kpData,
                birthDetails: effectiveBirthDetails,
                missingPersonCase: mpCase,
                selectedEvents,
                chartStyle
            });
        } else if (reportType === REPORT_TYPES.KP_KUNDLI) {
            return await generateKPKundliReport({
                kpData,
                birthDetails: effectiveBirthDetails,
                chartStyle
            });
        } else if (reportType === REPORT_TYPES.VEDIC_KUNDLI) {
            return await generateVedicReport({
                kpData,
                birthDetails: effectiveBirthDetails,
                chartStyle
            });
        } else {
            return await generateEventAnalysisReport({
                kpData,
                birthDetails: effectiveBirthDetails,
                selectedEvents,
                chartStyle
            });
        }
    };

    /**
     * Preview Action
     */
    const handlePreview = async () => {
        setIsGenerating(true);
        try {
            const doc = await compilePdfDocument();
            if (doc) {
                setCurrentDoc(doc);
                if (previewBlobUrl) {
                    URL.revokeObjectURL(previewBlobUrl);
                }
                const url = getReportPdfBlobUrl(doc);
                setPreviewBlobUrl(url);
                setActiveTab('preview');
            }
        } catch (err) {
            console.error('Failed to generate report preview:', err);
            alert(isTe ? 'రిపోర్ట్ రూపొందించడంలో లోపం జరిగింది.' : 'Error generating report preview. Please check inputs.');
        } finally {
            setIsGenerating(false);
        }
    };

    /**
     * Download Action
     */
    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            const doc = currentDoc || (await compilePdfDocument());
            if (doc) {
                const prefix = reportType === REPORT_TYPES.MISSING_PERSON
                    ? `AstroSharma_Missing_Person_${caseReference}`
                    : `AstroSharma_${reportType}_${subjectName.replace(/\s+/g, '_')}`;
                downloadReportPdf(doc, prefix);
            }
        } catch (err) {
            console.error('Failed to download report:', err);
            alert(isTe ? 'డౌన్‌లోడ్‌లో లోపం జరిగింది.' : 'Error downloading report.');
        } finally {
            setIsGenerating(false);
        }
    };

    /**
     * Print Action (High-Fidelity PDF Print)
     */
    const handlePrint = async () => {
        setIsGenerating(true);
        try {
            const doc = currentDoc || (await compilePdfDocument());
            if (doc) {
                printReportPdf(doc);
            }
        } catch (err) {
            console.error('Failed to print report:', err);
            alert(isTe ? 'ప్రింట్‌లో లోపం జరిగింది.' : 'Error sending report to printer.');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 15 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-200/80 dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh]"
                >
                    {/* Top Modal Header */}
                    <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-stone-900 via-slate-900 to-indigo-950 text-white border-b border-amber-500/30 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-serif font-bold text-amber-100 flex items-center gap-2">
                                    <span>{isTe ? "AstroSharma ప్రొఫెషనల్ PDF రిపోర్ట్ జనరేటర్" : "AstroSharma Professional PDF Report Studio"}</span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/30 border border-amber-400/30 text-amber-200 font-normal">
                                        v2.10 Vector HD
                                    </span>
                                </h2>
                                <p className="text-xs text-gray-300">
                                    {isTe
                                        ? "నిజమైన ఖగోళ గణనలు, ప్లాసిడస్ భావాలు & ఈవెంట్ విశ్లేషణలతో A4 మల్టీ-పేజీ డాక్యుమెంట్"
                                        : "Publication-grade multi-page A4 document with authentic astronomical data & forensic analysis"}
                                </p>
                            </div>
                        </div>

                        {/* Top View Switcher (Config / Preview) */}
                        <div className="flex items-center gap-2">
                            <div className="hidden sm:flex bg-slate-800/80 p-1 rounded-xl border border-white/10 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('config')}
                                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                        activeTab === 'config'
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'text-gray-300 hover:text-white'
                                    }`}
                                >
                                    {isTe ? "సెట్టింగ్‌లు & వివరాలు" : "Report Settings"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePreview}
                                    disabled={isGenerating}
                                    className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                        activeTab === 'preview'
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'text-gray-300 hover:text-white'
                                    }`}
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{isTe ? "PDF ప్రివ్యూ" : "PDF Preview"}</span>
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Close dialog"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Modal Body Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                        {activeTab === 'config' ? (
                            <>
                                {/* 1. Report Template Selection Cards */}
                                <div>
                                    <label className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 block mb-2 tracking-wider">
                                        {isTe ? "1. రిపోర్ట్ మాడ్యూల్ రకం ఎంచుకోండి:" : "1. Select Report Module Template:"}
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {[
                                            {
                                                id: REPORT_TYPES.MISSING_PERSON,
                                                title: isTe ? "మిస్సింగ్ పర్సన్ విశ్లేషణ" : "Missing Person Forensic",
                                                desc: isTe ? "కేస్ వివరాలు, రికవరీ/జాడ భావాలు, లీగల్ డిస్క్లైమర్" : "Case facts, recovery cusps, joint DBA, safety notice",
                                                icon: Shield,
                                                badge: isTe ? "సిఫార్సు" : "Forensic Standard",
                                                accent: "amber"
                                            },
                                            {
                                                id: REPORT_TYPES.KP_KUNDLI,
                                                title: isTe ? "KP సమగ్ర కుండలి" : "KP Kundli Comprehensive",
                                                desc: isTe ? "ప్లాసిడస్ భావ సంధులు, 4-స్థాయి కారకత్వాలు, RP" : "Full Placidus cusps, 4-tier significators, RP",
                                                icon: Star,
                                                badge: "KP Master",
                                                accent: "indigo"
                                            },
                                            {
                                                id: REPORT_TYPES.VEDIC_KUNDLI,
                                                title: isTe ? "వేద జన్మపత్రిక" : "Vedic Kundli Janmapatri",
                                                desc: isTe ? "రాశి చక్రం, నక్షత్ర పాదాలు, వింశోత్తరి దశలు" : "Rashi D1, nakshatra padas, Vimshottari schedule",
                                                icon: Sun,
                                                badge: "Vedic D1",
                                                accent: "purple"
                                            },
                                            {
                                                id: REPORT_TYPES.EVENT_ANALYSIS,
                                                title: isTe ? "ఈవెంట్ హౌస్ గ్రూపింగ్" : "Event House Grouping",
                                                desc: isTe ? "ఎంపిక చేసిన సంఘటనల సంపూర్ణ కేపీ ఫలితాలు" : "Multi-event significators & common ranking",
                                                icon: Target,
                                                badge: "Multi-Event",
                                                accent: "rose"
                                            }
                                        ].map(item => {
                                            const isSelected = reportType === item.id;
                                            const Icon = item.icon;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setReportType(item.id)}
                                                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                                                            : 'bg-white dark:bg-slate-800/60 border-gray-200 dark:border-white/5 hover:border-amber-300'
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className={`p-2 rounded-xl ${isSelected ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'}`}>
                                                                <Icon className="w-4 h-4" />
                                                            </div>
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                                                                {item.badge}
                                                            </span>
                                                        </div>
                                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight mb-1">
                                                            {item.title}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                                            {item.desc}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 2. Chart Layout & Presentation Style */}
                                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200/80 dark:border-white/5 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <span className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 block font-sans">
                                                {isTe ? "2. జాతక చక్ర శైలి (Chart Presentation Style):" : "2. Astrological Chart Layout:"}
                                            </span>
                                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                                {isTe ? "రిపోర్ట్‌లో ఏ చార్ట్ శైలి చూపించాలో ఎంచుకోండి" : "Vector-drawn at 300 DPI equivalent"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setChartStyle('south')}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                    chartStyle === 'south'
                                                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10'
                                                }`}
                                            >
                                                {isTe ? "దక్షిణ భారత చతురస్రం (South Indian)" : "South Indian (Fixed Square)"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setChartStyle('north')}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                    chartStyle === 'north'
                                                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10'
                                                }`}
                                            >
                                                {isTe ? "ఉత్తర భారత డైమండ్ (North Indian)" : "North Indian (Diamond)"}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Missing Person Case Dossier Form (Active when Missing Person Selected) */}
                                {reportType === REPORT_TYPES.MISSING_PERSON && (
                                    <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-4">
                                        <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                                            <div className="flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-amber-600" />
                                                <h3 className="font-serif font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                                                    {isTe ? "మిస్సింగ్ పర్సన్ కేస్ వివరాలు (Case Profile)" : "Missing Person Case Profile & Privacy Controls"}
                                                </h3>
                                            </div>

                                            {/* Privacy Mask Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => setMaskName(!maskName)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
                                                    maskName
                                                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 border-emerald-300'
                                                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 border-gray-300'
                                                }`}
                                            >
                                                {maskName ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                                <span>{maskName ? (isTe ? "పేరు దాచబడింది (Masked)" : "Name Masked for Privacy") : (isTe ? "పేరు బహిర్గతం" : "Include Actual Name")}</span>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                            {/* Case Reference */}
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">
                                                    {isTe ? "కేస్ రిఫరెన్స్ / FIR నెం:" : "Case Reference / FIR ID:"}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={caseReference}
                                                    onChange={e => setCaseReference(e.target.value)}
                                                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10"
                                                    placeholder="CASE-MP-001"
                                                />
                                            </div>

                                            {/* Subject Name */}
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">
                                                    {isTe ? "వ్యక్తి పేరు (Subject Name):" : "Subject Name:"}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={subjectName}
                                                    onChange={e => setSubjectName(e.target.value)}
                                                    disabled={maskName}
                                                    className={`w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10 ${
                                                        maskName ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                                    placeholder="Full Name"
                                                />
                                            </div>

                                            {/* Age & Gender */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">
                                                        {isTe ? "వయస్సు:" : "Age:"}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={age}
                                                        onChange={e => setAge(e.target.value)}
                                                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10"
                                                        placeholder="26"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">
                                                        {isTe ? "లింగం:" : "Gender:"}
                                                    </label>
                                                    <select
                                                        value={gender}
                                                        onChange={e => setGender(e.target.value)}
                                                        className="w-full px-2 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10"
                                                    >
                                                        <option value="male">{isTe ? "పురుషుడు" : "Male"}</option>
                                                        <option value="female">{isTe ? "స్త్రీ" : "Female"}</option>
                                                        <option value="other">{isTe ? "ఇతర" : "Other"}</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Missing Since Date */}
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">
                                                    {isTe ? "కనబడని తేదీ (Date):" : "Incident / Missing Since Date:"}
                                                </label>
                                                <input
                                                    type="date"
                                                    value={missingSinceDate}
                                                    onChange={e => setMissingSinceDate(e.target.value)}
                                                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10"
                                                />
                                            </div>

                                            {/* Missing Since Time */}
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">
                                                    {isTe ? "కనబడని సమయం (Time):" : "Incident / Missing Since Time:"}
                                                </label>
                                                <input
                                                    type="time"
                                                    value={missingSinceTime}
                                                    onChange={e => setMissingSinceTime(e.target.value)}
                                                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10"
                                                />
                                            </div>

                                            {/* Last Known Location */}
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">
                                                    {isTe ? "చివరిగా చూసిన స్థలం:" : "Last Known Location:"}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={lastKnownLocation}
                                                    onChange={e => setLastKnownLocation(e.target.value)}
                                                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10"
                                                    placeholder="City, Landmark"
                                                />
                                            </div>
                                        </div>

                                        {/* Status & Reporting Party */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">
                                                    {isTe ? "కేస్ స్థితి (Investigation Status):" : "Investigation Status:"}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={caseStatus}
                                                    onChange={e => setCaseStatus(e.target.value)}
                                                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10"
                                                    placeholder="Active Missing Person Investigation"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block mb-1">
                                                    {isTe ? "ఫిర్యాదుదారుడు / సంబంధం:" : "Reporting Party / Relationship:"}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={reportingParty}
                                                    onChange={e => setReportingParty(e.target.value)}
                                                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-300 dark:border-white/10"
                                                    placeholder="Family Member / Authorized Party"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 4. Event Analysis Rules Multi-Selection (for Missing Person & Event Reports) */}
                                {(reportType === REPORT_TYPES.MISSING_PERSON || reportType === REPORT_TYPES.EVENT_ANALYSIS) && (
                                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-gray-200 dark:border-white/10 space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <h3 className="font-serif font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                                    <Target className="w-4 h-4 text-amber-500" />
                                                    <span>{isTe ? "ఈవెంట్ అనాలిసిస్ అంశాలు (Selected Event Analysis Items)" : "Selected Event Analysis Criteria to Include"}</span>
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    {isTe
                                                        ? "రిపోర్ట్‌లో విశ్లేషించాల్సిన ప్రతి అంశాన్ని ఎంచుకోండి. ఫలితాలు నిజమైన గణనల ఆధారంగా రూపొందుతాయి."
                                                        : "Every selected item is computed with actual KP significators, Joint DBA, and CSL checks."}
                                                </p>
                                            </div>

                                            {/* Add from 340-Rule Catalog Button */}
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={ruleSearch}
                                                    onChange={e => {
                                                        setRuleSearch(e.target.value);
                                                        setIsRuleSearchOpen(true);
                                                    }}
                                                    placeholder={isTe ? "340 కేపీ నియమాలలో వెతకండి..." : "Search 340+ KP rules catalog..."}
                                                    className="px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-white/10 w-64"
                                                />
                                                {isRuleSearchOpen && filteredCatalogRules.length > 0 && (
                                                    <div className="absolute right-0 top-full mt-1 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-amber-300 dark:border-white/10 z-30 max-h-56 overflow-y-auto p-1.5 space-y-1">
                                                        {filteredCatalogRules.map(r => (
                                                            <button
                                                                key={r.id}
                                                                type="button"
                                                                onClick={() => handleAddRule(r)}
                                                                className="w-full p-2 text-left hover:bg-amber-50 dark:hover:bg-slate-800 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer"
                                                            >
                                                                <div className="min-w-0 pr-2">
                                                                    <div className="font-bold text-gray-900 dark:text-white truncate">{r.event}</div>
                                                                    <div className="text-[10px] text-gray-500">Cusp {r.cusp} • {r.subject}</div>
                                                                </div>
                                                                <Plus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* List of Currently Selected Event Rules */}
                                        <div className="space-y-2">
                                            {selectedEvents.map((rule, idx) => (
                                                <div
                                                    key={rule.id || idx}
                                                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/70 dark:border-white/5"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center justify-center shrink-0">
                                                            {idx + 1}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                                                                {rule.event}
                                                            </div>
                                                            <div className="text-[11px] text-gray-500 font-mono">
                                                                Cusp {rule.cusp} • Houses: [{rule.housesToBeSignified?.join(', ') || '—'}] • Joint DBA: [{rule.jointDBA?.houses?.join(', ') || '—'}]
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveRule(rule.id)}
                                                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                                        title="Remove event from report"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}

                                            {selectedEvents.length === 0 && (
                                                <div className="text-center py-6 text-xs text-gray-500 italic">
                                                    {isTe ? "కనీసం ఒక ఈవెంట్ నియమాన్ని ఎంచుకోండి." : "No event criteria selected. Please select at least one event rule."}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* PDF Preview Tab */
                            <div className="h-full flex flex-col space-y-3 min-h-[500px]">
                                {previewBlobUrl ? (
                                    <iframe
                                        src={previewBlobUrl}
                                        title="Report PDF Preview"
                                        className="w-full flex-1 rounded-2xl border border-gray-300 dark:border-white/10 shadow-inner bg-slate-100 min-h-[520px]"
                                    />
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-500 space-y-3">
                                        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
                                        <span className="text-sm font-semibold">
                                            {isTe ? "రిపోర్ట్ రూపొందించబడుతోంది..." : "Rendering publication-grade PDF report..."}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-white/10 shrink-0">
                        <div className="flex items-center gap-2">
                            {activeTab === 'preview' && (
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('config')}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-100 cursor-pointer"
                                >
                                    {isTe ? "← సెట్టింగ్‌లకు వెళ్లండి" : "← Back to Settings"}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                            >
                                {isTe ? "రద్దు చేయి (Close)" : "Close"}
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            {activeTab === 'config' && (
                                <button
                                    type="button"
                                    onClick={handlePreview}
                                    disabled={isGenerating}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-800 text-indigo-900 dark:text-indigo-200 border border-indigo-200 text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-all"
                                >
                                    <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    <span>{isTe ? "ప్రివ్యూ చూడండి (Preview)" : "Preview Report"}</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handlePrint}
                                disabled={isGenerating}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-gray-100 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-white/10 text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-all"
                                title="Print generated document cleanly"
                            >
                                <Printer className="w-4 h-4 text-amber-600" />
                                <span>{isTe ? "ప్రింట్ చేయండి (Print)" : "Print Report"}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={isGenerating}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span>{isGenerating ? (isTe ? "సిద్ధమవుతోంది..." : "Generating...") : (isTe ? "PDF డౌన్‌లోడ్ చేయండి" : "Download PDF")}</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
