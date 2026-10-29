import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target, Search, Filter, Shield, AlertTriangle, CheckCircle2,
    Clock, Star, Award, ChevronDown, ChevronUp, Layers, HelpCircle,
    Info, Sparkles, ExternalLink, Calendar, ArrowRight,
    User, AlertCircle, Compass, Check, X, RefreshCw, Eye, FileText,
    History, Sliders, Play, Trash2, BookmarkPlus, RotateCcw, Edit3
} from 'lucide-react';

import { KP_HOUSE_GROUPING_RULES, KP_HOUSE_GROUPING_CATALOG } from '../../data/kpHouseGroupingRules.js';
import {
    calculateCommonPlanetRanking,
    evaluateJointDBA,
    evaluateCuspSubLordChecks,
    CANONICAL_PLANETS
} from '../../utils/kp/kpHouseGroupingEngine.js';
import { getLocalizedPlanet, KP_TRANSLATIONS } from '../../utils/kpTranslations.js';
import { calculateVimshottariDasha, subdivideDashaPeriod } from '../../utils/kp/vimshottariDasha.js';
import {
    parseEvaluationDate,
    formatDateForPicker,
    formatEvaluationDateOnly,
    formatEvaluationDateTime,
    calculateDatePreset,
    getDashaTimelineBounds,
    validateEvaluationDate,
    resolveDashaHierarchyForDate,
    getAvailableSubperiods,
    buildLordsFromSelection,
    ensureValidChildHierarchy,
    evaluateDashaForEvent,
    createComparisonEntry
} from '../../utils/kp/dashaEvaluationEngine.js';
import { ASPECT_CONVENTIONS } from '../../utils/kp/kpAspects.js';
import { ReportGenerationModal } from '../report/ReportGenerationModal.jsx';
import {
    safeSaveEventAnalysisState,
    safeGetEventAnalysisState,
    safeClearEventAnalysisState
} from '../../utils/storageUtils.js';

import { FutureEventTimingFinder } from './FutureEventTimingFinder.jsx';
import { CustomHouseRulesManager } from './CustomHouseRulesManager.jsx';
import {
    loadCustomHouseRules,
    createCustomRule,
    updateCustomRule,
    deleteCustomRule,
    convertCustomRuleToKPRule
} from '../../utils/customHouseRulesStorage.js';

// Visual House Themes / Astrological Keywords
export const HOUSE_KEYWORDS = {
    1: { en: 'Self, Health, Mind, Longevity', te: 'తను భావం, ఆరోగ్యం, ఆయుష్షు' },
    2: { en: 'Wealth, Family, Speech, Assets', te: 'ధన భావం, కుటుంబం, స్థిరాస్తులు' },
    3: { en: 'Siblings, Courage, Travel, Communication', te: 'భ్రాతృ భావం, ధైర్యం, ప్రయాణాలు' },
    4: { en: 'Mother, Education, Property, Vehicles', te: 'మాతృ భావం, విద్య, ఇల్లు, వాహనాలు' },
    5: { en: 'Children, Speculation, Love, Intellect', te: 'సంతాన భావం, ప్రేమ, ఆలోచనలు' },
    6: { en: 'Job, Disease, Debt, Litigation', te: 'శత్రు/రోగ భావం, ఉద్యోగం, అప్పులు' },
    7: { en: 'Marriage, Spouse, Partner, Business', te: 'కళత్ర భావం, వివాహం, వ్యాపారం' },
    8: { en: 'Longevity, Danger, Obstacles, Hidden Gains', te: 'ఆయుష్షు, ప్రమాదాలు, అనుకోని లాభాలు' },
    9: { en: 'Father, Higher Education, Abroad, Fortune', te: 'భాగ్య భావం, ఉన్నత విద్య, విదేశం' },
    10: { en: 'Career, Status, Fame, Authority', te: 'కర్మ భావం, వృత్తి, హోదా, గౌరవం' },
    11: { en: 'Gains, Desires, Recovery, Elder Siblings', te: 'లాభ భావం, కోరికల నెరవేర్పు, స్నేహితులు' },
    12: { en: 'Loss, Foreign Settlement, Hospitalization, Moksha', te: 'వ్యయ భావం, విదేశీ నివాసం, మోక్షం' }
};

export const PLANET_ICONS = {
    Sun: '☀️',
    Moon: '🌙',
    Mars: '♂️',
    Mercury: '☿️',
    Jupiter: '♃',
    Venus: '♀️',
    Saturn: '♄',
    Rahu: '☊',
    Ketu: '☋'
};

export const KPEventSignificatorAnalysis = ({
    kpData,
    lang = 'te',
    onLoadBenchmark = null,
    onViewChart = null,
    onViewDasha = null
}) => {
    const isTe = lang === 'te';
    const t = KP_TRANSLATIONS[lang] || KP_TRANSLATIONS.te;

    const formatSignDisplay = (sign) => {
        if (!sign) return '';
        if (typeof sign === 'string') return sign;
        if (typeof sign === 'object') {
            return isTe ? (sign.te || sign.en || sign.id || '') : (sign.en || sign.id || sign.te || '');
        }
        return String(sign);
    };

    // Recover persisted state across navigation / unmounts
    const savedState = useMemo(() => safeGetEventAnalysisState(), []);

    // 1. Navigation / Selection State
    const [selectedCusp, setSelectedCusp] = useState(() => savedState?.selectedCusp ?? 7);
    const [selectedSubject, setSelectedSubject] = useState(() => savedState?.selectedSubject || 'MARRIAGE');
    const [selectedRuleId, setSelectedRuleId] = useState(() => savedState?.selectedRuleId || 'kp.c7.t6.r11.1');
    const [searchQuery, setSearchQuery] = useState(() => savedState?.searchQuery || '');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [recentRules, setRecentRules] = useState(() => savedState?.recentRules || []);
    const searchContainerRef = useRef(null);

    // 2. Analysis Configuration State
    const [analysisMode, setAnalysisMode] = useState(() => savedState?.analysisMode || 'modeA'); // 'modeA' (Ranking) | 'modeB' (Joint DBA)
    const [minMatches, setMinMatches] = useState(() => savedState?.minMatches ?? 2); // Option 2 Default: >= 2 houses
    const [aspectConvention, setAspectConvention] = useState(() => savedState?.aspectConvention || ASPECT_CONVENTIONS.KP_WESTERN);
    const [includeAspects, setIncludeAspects] = useState(() => savedState?.includeAspects ?? false);
    const [expandedPlanet, setExpandedPlanet] = useState(() => savedState?.expandedPlanet || null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // Browser-Local Custom House Rules State (Requirements 1-7)
    const [customRules, setCustomRules] = useState(() => loadCustomHouseRules());
    const [isCustomRulesModalOpen, setIsCustomRulesModalOpen] = useState(false);

    const handleCreateCustomRule = (input) => {
        const res = createCustomRule(input, customRules);
        if (res.success) {
            setCustomRules(res.allRules);
        }
        return res;
    };

    const handleUpdateCustomRule = (ruleId, updates) => {
        const res = updateCustomRule(ruleId, updates, customRules);
        if (res.success) {
            setCustomRules(res.allRules);
        }
        return res;
    };

    const handleDeleteCustomRule = (ruleId) => {
        const res = deleteCustomRule(ruleId, customRules);
        if (res.success) {
            setCustomRules(res.allRules);
            if (selectedRuleId === ruleId) {
                setSelectedRuleId('kp.c7.t6.r11.1');
            }
        }
        return res;
    };

    const handleCustomRulesChanged = (newRules) => {
        setCustomRules(newRules);
    };

    // 3. Flexible Dasha Evaluation State (Section 4, 7, 8)
    const [dashaEvalMode, setDashaEvalMode] = useState(() => savedState?.dashaEvalMode || 'current'); // 'current' | 'custom'
    const [customEvalDate, setCustomEvalDate] = useState(() => savedState?.customEvalDate || formatDateForPicker(new Date()));
    const [dashaSelectionMode, setDashaSelectionMode] = useState(() => savedState?.dashaSelectionMode || 'date'); // 'date' | 'manual'
    const [manualMdId, setManualMdId] = useState(() => savedState?.manualMdId || null);
    const [manualAdId, setManualAdId] = useState(() => savedState?.manualAdId || null);
    const [manualPdId, setManualPdId] = useState(() => savedState?.manualPdId || null);
    const [manualSdId, setManualSdId] = useState(() => savedState?.manualSdId || null);
    const [manualPranaId, setManualPranaId] = useState(() => savedState?.manualPranaId || null);
    const [comparisonList, setComparisonList] = useState(() => savedState?.comparisonList || []);
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);

    // Automatically persist selections to survive unmounts & navigation
    useEffect(() => {
        safeSaveEventAnalysisState({
            selectedCusp,
            selectedSubject,
            selectedRuleId,
            searchQuery,
            recentRules,
            analysisMode,
            minMatches,
            aspectConvention,
            includeAspects,
            expandedPlanet,
            dashaEvalMode,
            customEvalDate,
            dashaSelectionMode,
            manualMdId,
            manualAdId,
            manualPdId,
            manualSdId,
            manualPranaId,
            comparisonList
        });
    }, [
        selectedCusp,
        selectedSubject,
        selectedRuleId,
        searchQuery,
        recentRules,
        analysisMode,
        minMatches,
        aspectConvention,
        includeAspects,
        expandedPlanet,
        dashaEvalMode,
        customEvalDate,
        dashaSelectionMode,
        manualMdId,
        manualAdId,
        manualPdId,
        manualSdId,
        manualPranaId,
        comparisonList
    ]);

    // Explicit Reset Handler for Dasha Evaluation (Requirement 9)
    const handleResetEvaluation = () => {
        setDashaEvalMode('current');
        setCustomEvalDate(formatDateForPicker(new Date()));
        setDashaSelectionMode('date');
        setManualMdId(null);
        setManualAdId(null);
        setManualPdId(null);
        setManualSdId(null);
        setManualPranaId(null);
    };

    // Explicit Reset Handler for Event Analysis (Requirement 8)
    const handleResetSelections = () => {
        safeClearEventAnalysisState();
        setSelectedCusp(7);
        setSelectedSubject('MARRIAGE');
        setSelectedRuleId('kp.c7.t6.r11.1');
        setSearchQuery('');
        setRecentRules([]);
        setAnalysisMode('modeA');
        setMinMatches(2);
        setAspectConvention(ASPECT_CONVENTIONS.KP_WESTERN);
        setIncludeAspects(false);
        setExpandedPlanet(null);
        handleResetEvaluation();
    };

    // Close search dropdown on click outside or Escape key
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
                setIsSearchOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Dynamic dataset metrics computed from rules registry
    const stats = useMemo(() => {
        const totalRules = KP_HOUSE_GROUPING_RULES.length;
        const totalCusps = KP_HOUSE_GROUPING_CATALOG?.length || new Set(KP_HOUSE_GROUPING_RULES.map(r => r.cusp)).size;
        const maxPage = Math.max(...KP_HOUSE_GROUPING_RULES.map(r => r.source?.page || 0), 19);
        const validRules = KP_HOUSE_GROUPING_RULES.filter(r => r.housesToBeSignified && r.housesToBeSignified.length > 0).length;
        const coverage = totalRules > 0 ? Math.round((validRules / totalRules) * 100) : 100;

        return {
            totalRules,
            totalCusps,
            maxPage,
            coverage: `${coverage}%`
        };
    }, []);

    // Current category object from catalog
    const currentCategory = useMemo(() => {
        return KP_HOUSE_GROUPING_CATALOG.find(c => c.cusp === selectedCusp) || KP_HOUSE_GROUPING_CATALOG[0];
    }, [selectedCusp]);

    // Subjects under current category
    const availableSubjects = useMemo(() => {
        return currentCategory?.subjects || [];
    }, [currentCategory]);

    // Events under currently selected subject
    const availableEvents = useMemo(() => {
        const foundSubject = availableSubjects.find(s => s.subject === selectedSubject);
        return foundSubject?.events || availableSubjects[0]?.events || [];
    }, [availableSubjects, selectedSubject]);

    // Currently selected rule (resolves from customRules if custom rule ID, else predefined)
    const activeCustomRule = useMemo(() => {
        return customRules.find(r => r.id === selectedRuleId);
    }, [customRules, selectedRuleId]);

    const activeRule = useMemo(() => {
        if (activeCustomRule) {
            return convertCustomRuleToKPRule(activeCustomRule, isTe);
        }
        return KP_HOUSE_GROUPING_RULES.find(r => r.id === selectedRuleId) || KP_HOUSE_GROUPING_RULES[0];
    }, [selectedRuleId, activeCustomRule, isTe]);

    // Synchronize subject when cusp changes
    const handleCuspSelect = (cuspNum) => {
        setSelectedCusp(cuspNum);
        const cat = KP_HOUSE_GROUPING_CATALOG.find(c => c.cusp === cuspNum);
        if (cat && cat.subjects.length > 0) {
            const firstSubject = cat.subjects[0];
            setSelectedSubject(firstSubject.subject);
            if (firstSubject.events.length > 0) {
                selectRule(firstSubject.events[0].id);
            }
        }
    };

    // Synchronize event when subject changes
    const handleSubjectSelect = (subjName) => {
        setSelectedSubject(subjName);
        const found = availableSubjects.find(s => s.subject === subjName);
        if (found && found.events.length > 0) {
            selectRule(found.events[0].id);
        }
    };

    // Select rule and track in recent
    const selectRule = (ruleId) => {
        setSelectedRuleId(ruleId);
        const custom = customRules.find(r => r.id === ruleId);
        const rule = custom
            ? convertCustomRuleToKPRule(custom, isTe)
            : KP_HOUSE_GROUPING_RULES.find(r => r.id === ruleId);
        if (rule) {
            setRecentRules(prev => {
                const filtered = prev.filter(r => r.id !== rule.id);
                return [rule, ...filtered].slice(0, 5);
            });
        }
    };

    // Global Search across all custom rules + 341 predefined rules
    const searchResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q || q.length < 2) return [];

        const customMatches = customRules
            .map(r => convertCustomRuleToKPRule(r, isTe))
            .filter(rule => {
                const matchEvent = rule.event.toLowerCase().includes(q);
                const matchSubject = rule.subject.toLowerCase().includes(q);
                const matchCat = rule.category.toLowerCase().includes(q);
                const matchHouses = rule.housesToBeSignified.join(',').includes(q);
                const matchRemark = rule.remarks?.toLowerCase().includes(q);
                return matchEvent || matchSubject || matchCat || matchHouses || matchRemark;
            });

        const standardMatches = KP_HOUSE_GROUPING_RULES.filter(rule => {
            const matchEvent = rule.event.toLowerCase().includes(q);
            const matchSubject = rule.subject.toLowerCase().includes(q);
            const matchCat = rule.category.toLowerCase().includes(q);
            const matchHouses = rule.housesToBeSignified.join(',').includes(q) ||
                rule.originalNotation?.housesToBeSignified?.toLowerCase().includes(q);
            const matchRemark = rule.remarks?.toLowerCase().includes(q);
            return matchEvent || matchSubject || matchCat || matchHouses || matchRemark;
        });

        return [...customMatches, ...standardMatches].slice(0, 15);
    }, [searchQuery, customRules, isTe]);

    // Format date and time for subperiods
    const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            const day = d.getDate();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthStr = months[d.getMonth()];
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            return `${day} ${monthStr} ${year}, ${hours}:${mins}`;
        } catch {
            return dateStr;
        }
    };

    // Birth instant in UTC
    const birthInstantUtc = useMemo(() => {
        return kpData?.birthInstantUtc
            ? new Date(kpData.birthInstantUtc)
            : (kpData?.metadata?.utcDate ? new Date(kpData.metadata.utcDate) : new Date());
    }, [kpData?.birthInstantUtc, kpData?.metadata?.utcDate]);

    // Full 120-year Vimshottari Dasha calculation payload cached for chart
    const fullDashaResult = useMemo(() => {
        if (!kpData?.planets) return null;
        const moonPlanet = kpData.planets.find(p => p.key === 'Moon');
        if (!moonPlanet) return null;
        try {
            return calculateVimshottariDasha({
                moonSiderealLongitude: moonPlanet.longitude,
                birthDateUtc: birthInstantUtc,
                referenceDate: new Date(),
                planets: kpData.planets,
                cusps: kpData.cusps,
                significators: kpData.significators
            });
        } catch (err) {
            console.warn("Could not calculate full Vimshottari Dasha:", err);
            return null;
        }
    }, [kpData?.planets, kpData?.cusps, kpData?.significators, birthInstantUtc]);

    // Actual Current Running 5-Level Dasha Lords
    const currentRunningLords = useMemo(() => {
        if (!fullDashaResult?.activePeriods?.levels) return [];
        return fullDashaResult.activePeriods.levels.map(lvl => ({
            id: lvl.id,
            level: lvl.abbr || (lvl.level === 1 ? 'MD' : lvl.level === 2 ? 'AD' : lvl.level === 3 ? 'PD' : lvl.level === 4 ? 'SD' : 'PRANA'),
            levelNum: lvl.level,
            periodName: lvl.levelName,
            periodNameTe: lvl.levelNameTe,
            planet: lvl.lord,
            lord: lvl.lord,
            startDate: lvl.startDate,
            endDate: lvl.endDate,
            startMs: lvl.startMs,
            endMs: lvl.endMs,
            remainingDuration: lvl.remainingDuration,
            durationFormatted: lvl.durationFormatted,
            durationHuman: lvl.durationHuman,
            isDateInsidePeriod: true,
            kpDetails: lvl.kpDetails
        }));
    }, [fullDashaResult]);

    // Chart Dasha timeline boundaries
    const timelineBounds = useMemo(() => {
        return getDashaTimelineBounds(fullDashaResult);
    }, [fullDashaResult]);

    // Timeline validity check for chosen evaluation date
    const dateValidation = useMemo(() => {
        return validateEvaluationDate(customEvalDate, fullDashaResult, isTe);
    }, [customEvalDate, fullDashaResult, isTe]);

    // Active hierarchy resolved from custom evaluation date
    const dateDerivedHierarchy = useMemo(() => {
        if (!fullDashaResult || !dateValidation.isValid) return null;
        return resolveDashaHierarchyForDate({
            dashaResult: fullDashaResult,
            targetDate: customEvalDate,
            isTe
        });
    }, [fullDashaResult, customEvalDate, dateValidation.isValid, isTe]);

    // Hierarchy integrity validation for manual Dasha selections
    const manualHierarchy = useMemo(() => {
        if (!fullDashaResult) return null;
        return ensureValidChildHierarchy({
            dashaResult: fullDashaResult,
            mdId: manualMdId,
            adId: manualAdId,
            pdId: manualPdId,
            sdId: manualSdId,
            pranaId: manualPranaId
        });
    }, [fullDashaResult, manualMdId, manualAdId, manualPdId, manualSdId, manualPranaId]);

    // Manually selected 5-level lord records
    const manualLords = useMemo(() => {
        if (!manualHierarchy || !manualHierarchy.md) return [];
        return buildLordsFromSelection({
            md: manualHierarchy.md,
            ad: manualHierarchy.ad,
            pd: manualHierarchy.pd,
            sd: manualHierarchy.sd,
            prana: manualHierarchy.prana,
            evaluationDate: customEvalDate,
            planetaryKPDetails: fullDashaResult?.planetaryKPDetails
        });
    }, [manualHierarchy, customEvalDate, fullDashaResult?.planetaryKPDetails]);

    // Final active evaluation lords (MD -> AD -> PD -> SD -> Prana)
    const activeEvaluationLords = useMemo(() => {
        if (dashaEvalMode === 'current') {
            return currentRunningLords;
        }
        if (dashaSelectionMode === 'date') {
            if (dateDerivedHierarchy?.isValid && dateDerivedHierarchy.lords.length === 5) {
                return dateDerivedHierarchy.lords;
            }
            return currentRunningLords;
        }
        if (manualLords.length === 5) {
            return manualLords;
        }
        return currentRunningLords;
    }, [dashaEvalMode, dashaSelectionMode, dateDerivedHierarchy, manualLords, currentRunningLords]);

    const runningDBALords = activeEvaluationLords;
    const runningDBATriad = activeEvaluationLords;

    // Check whether the evaluation date falls inside the manually selected hierarchy
    const isDateInsideSelectedHierarchy = useMemo(() => {
        if (dashaSelectionMode !== 'manual' || !activeEvaluationLords || activeEvaluationLords.length === 0) return true;
        const evalMs = parseEvaluationDate(customEvalDate).getTime();
        const pranaLord = activeEvaluationLords[4];
        if (pranaLord?.startMs && pranaLord?.endMs) {
            return evalMs >= pranaLord.startMs && evalMs < pranaLord.endMs;
        }
        return true;
    }, [dashaSelectionMode, activeEvaluationLords, customEvalDate]);

    // Active Dropdown Selections & Options
    const currentMdOptions = fullDashaResult?.mahadashas || [];

    const selectedMdId = dashaSelectionMode === 'manual'
        ? (manualHierarchy?.md?.id || currentMdOptions[0]?.id || '')
        : (dateDerivedHierarchy?.activePeriods?.mahadasha?.id || currentRunningLords[0]?.id || '');

    const activeSelectedMd = currentMdOptions.find(m => m.id === selectedMdId) || currentMdOptions[0];

    const currentAdOptions = dashaSelectionMode === 'manual'
        ? (manualHierarchy?.availableAds || activeSelectedMd?.antardashas || [])
        : (dateDerivedHierarchy?.activePeriods?.mahadasha?.antardashas || activeSelectedMd?.antardashas || []);

    const selectedAdId = dashaSelectionMode === 'manual'
        ? (manualHierarchy?.ad?.id || currentAdOptions[0]?.id || '')
        : (dateDerivedHierarchy?.activePeriods?.antardasha?.id || currentRunningLords[1]?.id || '');

    const activeSelectedAd = currentAdOptions.find(a => a.id === selectedAdId) || currentAdOptions[0];

    const currentPdOptions = dashaSelectionMode === 'manual'
        ? (manualHierarchy?.availablePds || activeSelectedAd?.pratyantardashas || [])
        : (dateDerivedHierarchy?.activePeriods?.antardasha?.pratyantardashas || activeSelectedAd?.pratyantardashas || []);

    const selectedPdId = dashaSelectionMode === 'manual'
        ? (manualHierarchy?.pd?.id || currentPdOptions[0]?.id || '')
        : (dateDerivedHierarchy?.activePeriods?.pratyantardasha?.id || currentRunningLords[2]?.id || '');

    const activeSelectedPd = currentPdOptions.find(p => p.id === selectedPdId) || currentPdOptions[0];

    const currentSdOptions = useMemo(() => {
        if (dashaSelectionMode === 'manual') {
            return manualHierarchy?.availableSds || [];
        }
        if (activeSelectedPd) {
            return subdivideDashaPeriod(activeSelectedPd, 4, timelineBounds.birthMs, fullDashaResult?.planetaryKPDetails);
        }
        return [];
    }, [dashaSelectionMode, manualHierarchy?.availableSds, activeSelectedPd, timelineBounds.birthMs, fullDashaResult?.planetaryKPDetails]);

    const selectedSdId = dashaSelectionMode === 'manual'
        ? (manualHierarchy?.sd?.id || currentSdOptions[0]?.id || '')
        : (dateDerivedHierarchy?.activePeriods?.sookshmadasha?.id || currentRunningLords[3]?.id || '');

    const activeSelectedSd = currentSdOptions.find(s => s.id === selectedSdId) || currentSdOptions[0];

    const currentPranaOptions = useMemo(() => {
        if (dashaSelectionMode === 'manual') {
            return manualHierarchy?.availablePranas || [];
        }
        if (activeSelectedSd) {
            return subdivideDashaPeriod(activeSelectedSd, 5, timelineBounds.birthMs, fullDashaResult?.planetaryKPDetails);
        }
        return [];
    }, [dashaSelectionMode, manualHierarchy?.availablePranas, activeSelectedSd, timelineBounds.birthMs, fullDashaResult?.planetaryKPDetails]);

    const selectedPranaId = dashaSelectionMode === 'manual'
        ? (manualHierarchy?.prana?.id || currentPranaOptions[0]?.id || '')
        : (dateDerivedHierarchy?.activePeriods?.pranadasha?.id || currentRunningLords[4]?.id || '');

    // Dropdown Selection Handlers
    const handleSelectMd = (mId) => {
        setDashaSelectionMode('manual');
        setManualMdId(mId);
        const chosenM = fullDashaResult?.mahadashas?.find(m => m.id === mId);
        const firstA = chosenM?.antardashas?.[0];
        setManualAdId(firstA?.id || null);
        const firstP = firstA?.pratyantardashas?.[0];
        setManualPdId(firstP?.id || null);
        if (firstP) {
            const sds = subdivideDashaPeriod(firstP, 4, timelineBounds.birthMs, fullDashaResult?.planetaryKPDetails);
            const firstS = sds[0];
            setManualSdId(firstS?.id || null);
            if (firstS) {
                const pranas = subdivideDashaPeriod(firstS, 5, timelineBounds.birthMs, fullDashaResult?.planetaryKPDetails);
                setManualPranaId(pranas[0]?.id || null);
            }
        }
    };

    const handleSelectAd = (aId) => {
        setDashaSelectionMode('manual');
        setManualAdId(aId);
        const chosenA = currentAdOptions.find(a => a.id === aId);
        const firstP = chosenA?.pratyantardashas?.[0];
        setManualPdId(firstP?.id || null);
        if (firstP) {
            const sds = subdivideDashaPeriod(firstP, 4, timelineBounds.birthMs, fullDashaResult?.planetaryKPDetails);
            const firstS = sds[0];
            setManualSdId(firstS?.id || null);
            if (firstS) {
                const pranas = subdivideDashaPeriod(firstS, 5, timelineBounds.birthMs, fullDashaResult?.planetaryKPDetails);
                setManualPranaId(pranas[0]?.id || null);
            }
        }
    };

    const handleSelectPd = (pId) => {
        setDashaSelectionMode('manual');
        setManualPdId(pId);
        const chosenP = currentPdOptions.find(p => p.id === pId);
        if (chosenP) {
            const sds = subdivideDashaPeriod(chosenP, 4, timelineBounds.birthMs, fullDashaResult?.planetaryKPDetails);
            const firstS = sds[0];
            setManualSdId(firstS?.id || null);
            if (firstS) {
                const pranas = subdivideDashaPeriod(firstS, 5, timelineBounds.birthMs, fullDashaResult?.planetaryKPDetails);
                setManualPranaId(pranas[0]?.id || null);
            }
        }
    };

    const handleSelectSd = (sId) => {
        setDashaSelectionMode('manual');
        setManualSdId(sId);
        const chosenS = currentSdOptions.find(s => s.id === sId);
        if (chosenS) {
            const pranas = subdivideDashaPeriod(chosenS, 5, timelineBounds.birthMs, fullDashaResult?.planetaryKPDetails);
            setManualPranaId(pranas[0]?.id || null);
        }
    };

    const handleSelectPrana = (prId) => {
        setDashaSelectionMode('manual');
        setManualPranaId(prId);
    };

    // Quick Date Presets & Control Navigation Handlers
    const handlePresetDate = (presetKey) => {
        const newDate = calculateDatePreset(presetKey, new Date());
        setCustomEvalDate(formatDateForPicker(newDate));
        if (dashaEvalMode === 'current') {
            setDashaEvalMode('custom');
        }
        setDashaSelectionMode('date');
    };

    const handleUseCurrentRunningDasha = () => {
        setDashaEvalMode('current');
        setDashaSelectionMode('date');
    };

    const handleUseSelectedDate = () => {
        setDashaEvalMode('custom');
        setDashaSelectionMode('date');
        setManualMdId(null);
        setManualAdId(null);
        setManualPdId(null);
        setManualSdId(null);
        setManualPranaId(null);
    };

    const handleClearManualOverrides = () => {
        setDashaSelectionMode('date');
        setManualMdId(null);
        setManualAdId(null);
        setManualPdId(null);
        setManualSdId(null);
        setManualPranaId(null);
    };

    const handleAddComparison = () => {
        if (!jointDBAResult || activeEvaluationLords.length === 0) return;
        const evalDate = dashaEvalMode === 'custom' ? customEvalDate : new Date();
        const newEntry = createComparisonEntry({
            label: dashaEvalMode === 'current'
                ? (isTe ? `ప్రస్తుతం (${formatEvaluationDateOnly(new Date(), isTe)})` : `Current Running (${formatEvaluationDateOnly(new Date())})`)
                : `${formatEvaluationDateOnly(evalDate, isTe)} (${dashaSelectionMode === 'manual' ? 'Manual' : 'Date'})`,
            evaluationDate: evalDate,
            selectionMode: dashaEvalMode === 'current' ? 'date' : dashaSelectionMode,
            lords: activeEvaluationLords,
            jointDBAResult,
            rule: activeRule
        });
        setComparisonList(prev => [newEntry, ...prev.filter(item => item.id !== newEntry.id)]);
        setIsComparisonOpen(true);
    };

    const handleRemoveComparison = (id) => {
        setComparisonList(prev => prev.filter(item => item.id !== id));
    };

    const handleClearComparisons = () => {
        setComparisonList([]);
    };

    const handleLoadComparison = (entry) => {
        if (!entry) return;
        setDashaEvalMode('custom');
        setCustomEvalDate(formatDateForPicker(entry.evaluationDate));
        if (entry.selectionMode === 'manual' && entry.lordIds) {
            setDashaSelectionMode('manual');
            setManualMdId(entry.lordIds.mdId || null);
            setManualAdId(entry.lordIds.adId || null);
            setManualPdId(entry.lordIds.pdId || null);
            setManualSdId(entry.lordIds.sdId || null);
            setManualPranaId(entry.lordIds.pranaId || null);
        } else {
            setDashaSelectionMode('date');
        }
    };

    const handleEvaluateFuturePeriod = (candidate) => {
        if (!candidate) return;
        setDashaEvalMode('custom');
        setDashaSelectionMode('date');
        setCustomEvalDate(formatDateForPicker(candidate.startMs));
        setAnalysisMode('modeB');
        const el = document.getElementById('dasha-evaluation-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToFinder = () => {
        setAnalysisMode('modeB');
        setTimeout(() => {
            const el = document.getElementById('future-event-timing-finder');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    };

    const currentRequiredHouses = useMemo(() => {
        return (activeRule?.jointDBA?.houses && activeRule.jointDBA.houses.length > 0)
            ? activeRule.jointDBA.houses
            : (activeRule?.housesToBeSignified || []);
    }, [activeRule]);

    // Ascendant Sign Number
    const ascSignNum = useMemo(() => {
        return kpData?.ascendant?.signNumber || 1;
    }, [kpData]);

    // MODE A: Common-Planet Ranking calculation output
    const rankingResult = useMemo(() => {
        if (!kpData?.significators || !activeRule) {
            return {
                targetHouses: activeRule?.housesToBeSignified || [],
                rankedPlanets: [],
                excludedPlanets: [],
                allScoredPlanets: [],
                drishtiSummary: null,
                stats: { totalSignificators: 0, qualifiedCount: 0 }
            };
        }

        return calculateCommonPlanetRanking(kpData.significators, activeRule, {
            minMatches,
            ascSign: ascSignNum,
            runningDashaPlanets: runningDBATriad,
            planetsData: kpData.planets,
            cuspsData: kpData.cusps,
            aspectConvention
        });
    }, [kpData?.significators, activeRule, minMatches, ascSignNum, runningDBATriad, kpData?.planets, kpData?.cusps, aspectConvention]);

    // MODE B: Joint DBA Evaluation output (Supports Flexible Dasha and Custom Dates)
    const jointDBAResult = useMemo(() => {
        if (!kpData?.significators || !activeRule || activeEvaluationLords.length === 0) return null;

        return evaluateDashaForEvent({
            significators: kpData.significators,
            rule: activeRule,
            lords: activeEvaluationLords,
            options: { ascSign: ascSignNum },
            evaluationMode: dashaEvalMode,
            selectionMode: dashaSelectionMode,
            evaluationDate: dashaEvalMode === 'custom' ? customEvalDate : new Date()
        });
    }, [kpData?.significators, activeRule, activeEvaluationLords, ascSignNum, dashaEvalMode, dashaSelectionMode, customEvalDate]);

    // Cusp Sub Lord checks evaluation
    const cuspSubLordResults = useMemo(() => {
        if (!kpData?.cusps || !kpData?.significators || !activeRule) return [];
        return evaluateCuspSubLordChecks(kpData.cusps, kpData.significators, activeRule);
    }, [kpData?.cusps, kpData?.significators, activeRule]);

    // Auto-select rule when search item clicked
    const handleSelectSearchResult = (rule) => {
        setSelectedCusp(rule.cusp);
        setSelectedSubject(rule.subject);
        selectRule(rule.id);
        setSearchQuery('');
        setIsSearchOpen(false);
    };

    return (
        <div className="space-y-8 font-sans">
            {/* Top Header Card with explicit stacking layer */}
            <div className="relative z-30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-purple-500/10 dark:from-amber-950/40 dark:via-slate-900 dark:to-purple-950/30 rounded-3xl p-6 sm:p-8 border border-amber-200/80 dark:border-white/10 shadow-sm backdrop-blur-md">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>{isTe ? `${stats.maxPage} పేజీల KP హౌస్ గ్రూపింగ్ పూర్తి డేటాబేస్` : `Authoritative ${stats.maxPage}-Page KP House Grouping Rules`}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-serif font-black text-gray-900 dark:text-white flex items-center gap-3">
                            <Target className="w-8 h-8 text-amber-500 shrink-0" />
                            <span>{isTe ? "KP ఈవెంట్ ఆధారిత సిగ్నిఫికేటర్ విశ్లేషణ" : "KP Event-Based Significator Analysis"}</span>
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl">
                            {isTe
                                ? "ప్రతి ఈవెంట్‌కు సంబంధించిన భావ సముదాయాన్ని ఎంచుకోండి. 4-స్థాయి KP కారకత్వాలు మరియు ప్రస్తుత దశ ఆధారంగా బలమైన ఫలితాలనిచ్చే గ్రహాలను క్షణాల్లో పరిశీలించండి."
                                : "Select any astrological subject or outcome from the complete Krishnamurti Paddhati canon to analyze signifying planets, 4-fold KP evidence, and Joint DBA period alignments."}
                        </p>
                    </div>

                    {/* Stats Counters & Action Controls */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        {onViewChart && (
                            <button
                                type="button"
                                onClick={onViewChart}
                                className="px-3.5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                                title={isTe ? "ఈ జాతక చక్రాన్ని చూడండి" : "View astrological chart for this person"}
                            >
                                <Eye className="w-4 h-4" />
                                <span>{isTe ? "చక్రం చూడండి" : "View Chart"}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleResetSelections}
                            className="px-3 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title={isTe ? "ఈవెంట్ ఎంపికలను రీసెట్ చేయండి" : "Reset Event Analysis selections to default"}
                        >
                            <RefreshCw className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                            <span>{isTe ? "రీసెట్" : "Reset"}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsReportModalOpen(true)}
                            className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title={isTe ? "ఈ ఈవెంట్ కోసం ప్రొఫెషనల్ PDF రిపోర్ట్ రూపొందించండి" : "Generate publication-grade PDF report for this event"}
                        >
                            <FileText className="w-4 h-4" />
                            <span>{isTe ? "రిపోర్ట్ రూపొందించండి" : "Generate Report"}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCustomRulesModalOpen(true)}
                            className="px-3.5 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title={isTe ? "కస్టమ్ భావ నియమాలను రూపొందించి నిర్వహించండి" : "Create and manage custom house combinations"}
                        >
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span>{isTe ? "కస్టమ్ నియమాలు" : "Custom Rules"}</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-mono font-bold">
                                {customRules.length}
                            </span>
                        </button>
                        <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl px-4 py-3 border border-amber-200/70 dark:border-white/10 text-center shadow-xs">
                            <span className="block text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{stats.totalRules}</span>
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{isTe ? "ఈవెంట్లు" : "Rules"}</span>
                        </div>
                        <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl px-4 py-3 border border-indigo-200/70 dark:border-white/10 text-center shadow-xs">
                            <span className="block text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">{stats.totalCusps}</span>
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{isTe ? "భావాలు" : "Cusps"}</span>
                        </div>
                        <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl px-4 py-3 border border-emerald-200/70 dark:border-white/10 text-center shadow-xs">
                            <span className="block text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.coverage}</span>
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{isTe ? "కవరేజ్" : "Extracted"}</span>
                        </div>
                    </div>
                </div>

                {/* Search Bar with Autocomplete */}
                <div ref={searchContainerRef} className="mt-6 relative z-50">
                    <div className="relative">
                        <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onFocus={() => {
                                if (searchQuery.trim().length >= 2) setIsSearchOpen(true);
                            }}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearchOpen(true);
                            }}
                            placeholder={isTe ? "ఏదైనా ఈవెంట్ కోసం శోధించండి (ఉదా: వివాహం, ప్రమోషన్, విదేశం, 2, 7, 11)..." : "Search any event (e.g. Marriage, Promotion, Foreign travel, 2, 7, 11)..."}
                            className="w-full pl-12 pr-10 py-3 sm:py-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-amber-300/80 dark:border-white/15 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-xs text-xs sm:text-sm"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setIsSearchOpen(false);
                                }}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                                aria-label="Clear search"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Search Results Dropdown with Solid Background & High Elevation */}
                    <AnimatePresence>
                        {isSearchOpen && searchResults.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.15 }}
                                className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-amber-300 dark:border-white/20 shadow-2xl ring-1 ring-black/10 dark:ring-white/10 z-50 overflow-hidden max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5"
                            >
                                {searchResults.map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleSelectSearchResult(item)}
                                        className="w-full text-left p-3 sm:p-4 hover:bg-amber-50/90 dark:hover:bg-slate-800 transition-colors flex items-start sm:items-center justify-between gap-3 group cursor-pointer"
                                    >
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-center gap-1.5 flex-wrap text-[11px] sm:text-xs">
                                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                                    {item.category.split('(')[0].trim() || item.category}
                                                </span>
                                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                                <span className="font-medium text-indigo-600 dark:text-indigo-400 truncate max-w-[140px] sm:max-w-xs">
                                                    {item.subject}
                                                </span>
                                            </div>
                                            <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 break-words leading-snug">
                                                {item.event}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-start sm:self-center pt-0.5 sm:pt-0">
                                            <div className="flex items-center gap-1">
                                                <span className="hidden md:inline text-[10px] font-bold uppercase text-gray-400">
                                                    {isTe ? "భావాలు" : "Houses"}:
                                                </span>
                                                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-950/80 border border-amber-300/80 dark:border-amber-700/60 rounded-lg text-xs font-mono font-bold text-amber-800 dark:text-amber-300 whitespace-nowrap shadow-2xs">
                                                    {item.housesToBeSignified.join(', ')}
                                                </span>
                                            </div>
                                            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                        {isSearchOpen && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.15 }}
                                className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-amber-300 dark:border-white/20 p-4 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 shadow-2xl ring-1 ring-black/10 dark:ring-white/10 z-50"
                            >
                                {isTe ? "ఫలితాలు ఏవీ కనుగొనబడలేదు." : "No matching events found."}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Recently Viewed Events Chips */}
                {recentRules.length > 0 && (
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{isTe ? "ఇటీవలి ఈవెంట్లు:" : "Recent:"}</span>
                        </span>
                        {recentRules.map(r => (
                            <button
                                key={r.id}
                                onClick={() => selectRule(r.id)}
                                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                                    r.id === activeRule.id
                                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-amber-400'
                                }`}
                            >
                                {r.event}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Missing Chart Alert & 1-Click Benchmark Loader */}
            {(!kpData || !kpData.planets) && (
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                            <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                                {isTe ? "జాతక చక్ర వివరాలు లోడ్ కాలేదు" : "No Active Birth Chart Loaded"}
                            </h4>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                                {isTe
                                    ? "నిజమైన గ్రహ కారకత్వాలను లెక్కించేందుకు బెంచ్‌మార్క్ చార్ట్ లోడ్ చేయండి లేదా బర్త్ ఫారమ్ పూరించండి."
                                    : "Load our verified benchmark chart (15-Aug-1998 10:30 AM IST Hyderabad) to instantly calculate significators."}
                            </p>
                        </div>
                    </div>
                    {onLoadBenchmark && (
                        <button
                            type="button"
                            onClick={onLoadBenchmark}
                            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-sm flex items-center gap-2"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{isTe ? "బెంచ్‌మార్క్ చార్ట్ లోడ్ చేయండి" : "Load Benchmark Chart"}</span>
                        </button>
                    )}
                </div>
            )}

            {/* Navigation Grid: 12 Cusps Selector Pills */}
            <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                        {isTe ? "1. భావం ఎంపిక (12 భావాలు)" : "1. Select Astrological Cusp"}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsCustomRulesModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>{isTe ? "కస్టమ్ నియమాలు" : "Custom Rules"}</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-mono font-bold">
                                {customRules.length}
                            </span>
                        </button>
                        <span className="text-gray-300 dark:text-gray-700">•</span>
                        <span className="text-xs text-gray-400">
                            {currentCategory?.totalEvents} {isTe ? "ఈవెంట్లు అందుబాటులో ఉన్నాయి" : "events in this cusp"}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {KP_HOUSE_GROUPING_CATALOG.map(cat => {
                        const isSelected = cat.cusp === selectedCusp;
                        return (
                            <button
                                key={cat.cusp}
                                type="button"
                                onClick={() => handleCuspSelect(cat.cusp)}
                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[76px] ${
                                    isSelected
                                        ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/25 scale-[1.02]'
                                        : 'bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 border-gray-200/80 dark:border-white/10 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50/50'
                                }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-xs font-bold font-mono uppercase opacity-90">
                                        {isTe ? `${cat.cusp}వ భావం` : `Cusp ${cat.cusp}`}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                        isSelected
                                            ? 'bg-white/20 text-white'
                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300'
                                    }`}>
                                        {cat.totalEvents}
                                    </span>
                                </div>
                                <div className={`text-xs font-bold truncate mt-1 ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                                    {cat.category.split('(')[1]?.replace(')', '') || cat.category}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Subject Selector & Event Dropdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subject Selector */}
                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 block tracking-wider">
                        {isTe ? "2. విషయం ఎంపిక (Subject Matter)" : "2. Select Subject Matter"}
                    </label>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {availableSubjects.map(sub => (
                            <button
                                key={sub.subject}
                                type="button"
                                onClick={() => handleSubjectSelect(sub.subject)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                                    sub.subject === selectedSubject
                                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                                        : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-indigo-300'
                                }`}
                            >
                                <span>{sub.subject}</span>
                                <span className="ml-1.5 opacity-70">({sub.eventsCount})</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Specific Event Dropdown */}
                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 block tracking-wider">
                        {isTe ? "3. ఖచ్చితమైన ఫలితం / ఈవెంట్ ఎంపిక" : "3. Select Specific Outcome / Event"}
                    </label>
                    <select
                        value={activeRule.id}
                        onChange={(e) => selectRule(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
                    >
                        {availableEvents.map(ev => (
                            <option key={ev.id} value={ev.id}>
                                {ev.srNo ? `${ev.srNo}. ` : ''}{ev.event} (Houses: {ev.houses.join(', ')})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Selected Rule Definition Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-amber-200/80 dark:border-white/10 shadow-md space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-white/5">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                {activeRule.category}
                            </span>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                {activeRule.subject}
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-serif font-black text-gray-900 dark:text-white flex items-center gap-3 flex-wrap">
                            <span>{activeRule.event}</span>
                            {activeRule.isCustom ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    <span>{isTe ? "కస్టమ్ నియమం (Browser-local)" : "Custom Rule (Local)"}</span>
                                </span>
                            ) : activeRule.verificationStatus === 'needs-review' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60" title="Flagged for practitioner review">
                                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                                    <span>{isTe ? "సమీక్ష అవసరం" : "Review Flag"}</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    <span>{isTe ? "ధృవీకరించబడిన సూత్రం" : "Verified Rule"}</span>
                                </span>
                            )}
                        </h2>
                        {activeRule.isCustom && (
                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setIsCustomRulesModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-xs cursor-pointer active:scale-95"
                                >
                                    <Edit3 className="w-3 h-3" />
                                    <span>{isTe ? "ఈ నియమాన్ని సవరించండి" : "Edit This Custom Rule"}</span>
                                </button>
                                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                                    {isTe ? "🔒 ఈ బ్రౌజర్‌లో మాత్రమే సేవ్ చేయబడింది" : "🔒 Stored locally in this browser profile"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Core Rule Specifications: 2 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Left: Houses to be Signified */}
                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/30 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs uppercase font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                <Target className="w-4 h-4 text-amber-600" />
                                <span>{isTe ? "సూచించవలసిన భావాలు (Houses to be Signified)" : "Houses to be Signified"}</span>
                            </span>
                            <span className="text-xs font-mono text-gray-500">
                                {activeRule.housesToBeSignified.length} {isTe ? "భావాలు" : "houses"}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {rankingResult.targetHouses.map(hNum => (
                                <div
                                    key={hNum}
                                    className="px-3.5 py-2 rounded-xl bg-amber-500 text-white font-mono font-black text-base sm:text-lg shadow-xs flex items-center gap-1.5"
                                    title={`House ${hNum}: ${HOUSE_KEYWORDS[hNum]?.en || ''}`}
                                >
                                    <span>H{hNum}</span>
                                </div>
                            ))}
                        </div>

                        {/* Optional / Parenthesized houses */}
                        {activeRule.optionalHouses && activeRule.optionalHouses.length > 0 && (
                            <div className="text-xs text-amber-800/80 dark:text-amber-300/80 pt-1 flex items-center gap-1.5">
                                <span className="font-semibold">{isTe ? "ఐచ్ఛిక భావాలు:" : "Optional / Facilitating:"}</span>
                                <span>{activeRule.optionalHouses.map(h => `(${h})`).join(', ')}</span>
                            </div>
                        )}

                        {/* Alternative groups if present */}
                        {activeRule.alternativeGroups && activeRule.alternativeGroups.length > 0 && (
                            <div className="text-xs text-amber-900 dark:text-amber-200 pt-1">
                                <span className="font-semibold">{isTe ? "ప్రత్యామ్నాయ భావ జట్లు:" : "Alternative Groups:"} </span>
                                {activeRule.alternativeGroups.map((grp, i) => (
                                    <span key={i} className="font-mono font-bold mr-2">[{grp.join(', ')}]</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Joint DBA Requirements */}
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/30 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs uppercase font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-indigo-600" />
                                <span>{isTe ? "జాయింట్ DBA భావాల అవసరం (Joint DBA)" : "Joint DBA Requirements"}</span>
                            </span>
                            <span className="text-xs font-mono text-gray-500">
                                Mode B
                            </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {(activeRule.jointDBA?.houses || []).map(hNum => (
                                <div
                                    key={hNum}
                                    className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-mono font-black text-base sm:text-lg shadow-xs"
                                >
                                    H{hNum}
                                </div>
                            ))}
                            {(!activeRule.jointDBA?.houses || activeRule.jointDBA.houses.length === 0) && (
                                <span className="text-xs text-gray-500 italic">
                                    {isTe ? "నిర్దిష్ట DBA భేదం లేదు (ప్రధాన భావాలే వర్తిస్తాయి)" : "Operates on primary house group"}
                                </span>
                            )}
                        </div>

                        {/* Raw DBA Notation */}
                        {activeRule.originalNotation?.jointDBA && (
                            <div className="text-xs text-indigo-900/80 dark:text-indigo-300/80 pt-1 font-mono">
                                <span className="font-sans font-semibold text-gray-500">{isTe ? "మూల రాత:" : "Raw:"} </span>
                                {activeRule.originalNotation.jointDBA}
                            </div>
                        )}
                    </div>
                </div>

                {/* Remarks, Karakas & Special Instructions */}
                {(activeRule.remarks || activeRule.planetaryKarakas?.length > 0 || activeRule.reviewFlags?.length > 0) && (
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/70 dark:border-white/5 space-y-2 text-xs text-gray-700 dark:text-gray-300">
                        {activeRule.planetaryKarakas?.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                    {isTe ? "గ్రహ కారకత్వాలు:" : "Planetary Karakas:"}
                                </span>
                                {activeRule.planetaryKarakas.map(k => (
                                    <span key={k} className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-bold font-mono">
                                        {PLANET_ICONS[k] || ''} {k}
                                    </span>
                                ))}
                            </div>
                        )}

                        {activeRule.remarks && (
                            <div>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {isTe ? "గమనికలు & విశ్లేషణ సూచనలు: " : "Remarks & Practitioner Notes: "}
                                </span>
                                <span className="leading-relaxed">{activeRule.remarks}</span>
                            </div>
                        )}

                        {activeRule.reviewFlags?.length > 0 && (
                            <div className="pt-2 border-t border-amber-200/40 dark:border-amber-800/30 text-amber-800 dark:text-amber-300">
                                <span className="font-bold">⚠️ {isTe ? "సమీక్ష అవసరం:" : "Review Context:"} </span>
                                <span>{activeRule.reviewFlags.join(' • ')}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Analysis Mode Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4 flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setAnalysisMode('modeA')}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                            analysisMode === 'modeA'
                                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 scale-[1.02]'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                    >
                        <Award className="w-4 h-4" />
                        <span>{isTe ? "మోడ్ A: కామన్-ప్లానెట్ ర్యాంకింగ్ (ఆప్షన్ 2)" : "Mode A: Common-Planet Ranking (Option 2)"}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAnalysisMode('modeB')}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                            analysisMode === 'modeB'
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02]'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                    >
                        <Clock className="w-4 h-4" />
                        <span>{isTe ? "మోడ్ B: జాయింట్ DBA కాల పరిమితి విశ్లేషణ" : "Mode B: Joint DBA Evaluation"}</span>
                    </button>
                </div>

                {/* Mode A Controls: Min Matches Threshold & Drishti Convention Selector */}
                {analysisMode === 'modeA' && (
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                {isTe ? "కనీస మ్యాచింగ్ భావాలు:" : "Min Matches:"}
                            </span>
                            <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-white/10">
                                {[1, 2, 3].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setMinMatches(num)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                                            minMatches === num
                                                ? 'bg-amber-500 text-white shadow-xs'
                                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                                        }`}
                                    >
                                        &gt;= {num}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5 text-amber-500" />
                                {isTe ? "దృష్టి విధానం:" : "Drishti System:"}
                            </span>
                            <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold">
                                <button
                                    type="button"
                                    onClick={() => setAspectConvention(ASPECT_CONVENTIONS.KP_WESTERN)}
                                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                        aspectConvention === ASPECT_CONVENTIONS.KP_WESTERN
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                                    }`}
                                    title="KP Western Longitudinal Degree Aspects to Planets & 12 Placidus House Cusps"
                                >
                                    {isTe ? "కేపీ పాశ్చాత్య (డిగ్రీ/సంధి)" : "KP Western (Degree/Cusp)"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAspectConvention(ASPECT_CONVENTIONS.VEDIC_SPECIAL)}
                                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                        aspectConvention === ASPECT_CONVENTIONS.VEDIC_SPECIAL
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                                    }`}
                                    title="Classical Parashari Graha Drishti"
                                >
                                    {isTe ? "వైదిక పరాశరి" : "Vedic Parashari"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAspectConvention(ASPECT_CONVENTIONS.ALL)}
                                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                        aspectConvention === ASPECT_CONVENTIONS.ALL
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                                    }`}
                                    title="Combined View (Both KP Western and Vedic Parashari)"
                                >
                                    {isTe ? "ఉమ్మడి (రెండు)" : "Combined"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODE A VIEW: Common-Planet Ranking */}
            {analysisMode === 'modeA' && (
                <div className="space-y-6">
                    {/* Selected Event Drishti Summary Banner */}
                    {rankingResult.drishtiSummary && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/5 via-indigo-500/5 to-purple-500/5 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border border-amber-200/60 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                                    <Eye className="w-4 h-4 text-amber-500" />
                                    <span>{isTe ? "సంఘటన దృష్టి సారాంశం:" : "Event Drishti Summary:"}</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {isTe ? "ఎంపిక చేసిన భావాలు:" : "Event Houses:"}
                                    </span>
                                    {rankingResult.targetHouses.map(h => (
                                        <span key={h} className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-mono font-bold text-[11px]">
                                            H{h}
                                        </span>
                                    ))}
                                </div>
                                <span className="text-gray-300 dark:text-gray-700 hidden sm:inline">|</span>
                                <div className="text-gray-700 dark:text-gray-300">
                                    <span className="font-bold text-amber-600 dark:text-amber-400">{rankingResult.drishtiSummary.qualifyingPlanetsWithDrishtiCount}</span> / {rankingResult.rankedPlanets.length} {isTe ? "అర్హత గ్రహాలకు దృష్టి ఉంది" : "qualifying planets with Drishti"}
                                </div>
                                <span className="text-gray-300 dark:text-gray-700 hidden sm:inline">|</span>
                                <div className="text-gray-600 dark:text-gray-400">
                                    {isTe ? "విధానం:" : "System:"} <span className="font-semibold text-gray-900 dark:text-gray-200">{isTe ? rankingResult.drishtiSummary.conventionLabelTe : rankingResult.drishtiSummary.conventionLabel}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1" title="Drishti is supplementary evidence and does not modify the KP significator score">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>{isTe ? "స్కోర్‌పై ప్రభావం: లేదు (అనుబంధం)" : "Affects Score: No (Supplementary)"}</span>
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Ranking Explanation Banner */}
                    <div className="flex items-center justify-between bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>
                                {isTe
                                    ? `సూచించబడిన భావాలు [${rankingResult.targetHouses.join(', ')}] లో కనీసం ${minMatches} భావాలను సూచించే గ్రహాలు అగ్రస్థానంలో ఉంటాయి.`
                                    : `Planets signifying at least ${minMatches} distinct houses from [${rankingResult.targetHouses.join(', ')}] ranked by count.`}
                            </span>
                        </div>
                        <span className="font-bold font-mono">
                            {rankingResult.rankedPlanets.length} {isTe ? "గ్రహాలు అర్హత పొందాయి" : "qualifying planets"}
                        </span>
                    </div>

                    {/* Table of Qualifying Ranked Planets */}
                    {rankingResult.rankedPlanets.length > 0 ? (
                        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-3xl border border-amber-200/80 dark:border-white/10 shadow-md">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-amber-500/10 dark:bg-slate-800/80 text-xs uppercase font-bold text-gray-700 dark:text-gray-300 border-b border-amber-200/50 dark:border-white/5">
                                    <tr>
                                        <th className="py-4 px-4 sm:px-6 w-16 text-center">{isTe ? "ర్యాంక్" : "Rank"}</th>
                                        <th className="py-4 px-4 sm:px-6">{isTe ? "గ్రహం" : "Planet"}</th>
                                        <th className="py-4 px-4 sm:px-6">{isTe ? "మ్యాచింగ్ భావాలు" : "Matched Event Houses"}</th>
                                        <th className="py-4 px-4 sm:px-6 text-center">{isTe ? "స్కోర్" : "Score"}</th>
                                        <th className="py-4 px-4 sm:px-6">{isTe ? "మొత్తం భావాలు (4-స్థాయిలు)" : "All Signified"}</th>
                                        <th className="py-4 px-4 sm:px-6">{isTe ? "నక్షత్ర/సబ్ లార్డ్" : "Star / Sub Lord"}</th>
                                        <th className="py-4 px-4 sm:px-6">{isTe ? "దృష్టి" : "Drishti"}</th>
                                        <th className="py-4 px-4 sm:px-6 text-right">{isTe ? "వివరాలు" : "Evidence"}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {rankingResult.rankedPlanets.map(planet => {
                                        const isExpanded = expandedPlanet === planet.planetKey;
                                        return (
                                            <React.Fragment key={planet.planetKey}>
                                                <tr className="hover:bg-amber-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                                    {/* Rank */}
                                                    <td className="py-4 px-4 sm:px-6 text-center">
                                                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold font-mono text-xs ${
                                                            planet.rank === 1
                                                                ? 'bg-amber-500 text-white shadow-xs'
                                                                : planet.rank === 2
                                                                ? 'bg-slate-300 dark:bg-slate-700 text-gray-800 dark:text-white'
                                                                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
                                                        }`}>
                                                            {planet.rank}
                                                        </span>
                                                    </td>

                                                    {/* Planet Name & Badges */}
                                                    <td className="py-4 px-4 sm:px-6">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="text-xl">{PLANET_ICONS[planet.planetKey] || '🪐'}</span>
                                                            <div>
                                                                <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                                    <span>{isTe ? getLocalizedPlanet(planet.planetKey, 'te') : planet.planetName}</span>
                                                                    {planet.isKaraka && (
                                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold uppercase" title="Planetary Karaka for this event">
                                                                            Karaka
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {planet.isRunningDBA && (
                                                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                                                        {planet.dashaRoles.isMahadashaLord ? 'Active MD' : planet.dashaRoles.isBhuktiLord ? 'Active AD' : 'Active PD'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Matched Houses */}
                                                    <td className="py-4 px-4 sm:px-6">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {planet.matchedHouses.map(h => (
                                                                <span
                                                                    key={h}
                                                                    className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-mono font-bold text-xs shadow-xs"
                                                                >
                                                                    H{h}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>

                                                    {/* Score */}
                                                    <td className="py-4 px-4 sm:px-6 text-center">
                                                        <span className="inline-block px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-mono font-black text-sm">
                                                            {planet.score}
                                                        </span>
                                                    </td>

                                                    {/* All Signified Houses */}
                                                    <td className="py-4 px-4 sm:px-6">
                                                        <div className="flex items-center gap-1 flex-wrap font-mono text-xs text-gray-600 dark:text-gray-300">
                                                            {planet.allSignifiedHouses.map(h => (
                                                                <span
                                                                    key={h}
                                                                    className={`px-1.5 py-0.5 rounded ${
                                                                        planet.matchedHouses.includes(h)
                                                                            ? 'font-bold text-amber-600 dark:text-amber-400'
                                                                            : 'text-gray-500'
                                                                    }`}
                                                                >
                                                                    {h}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>

                                                    {/* Star Lord / Sub Lord */}
                                                    <td className="py-4 px-4 sm:px-6">
                                                        <div className="text-xs space-y-0.5 font-mono">
                                                            <div className="text-gray-500 dark:text-gray-400">
                                                                STL: <span className="text-gray-900 dark:text-gray-200 font-bold">{planet.starLord || '-'}</span>
                                                            </div>
                                                            <div className="text-gray-500 dark:text-gray-400">
                                                                SUB: <span className="text-amber-600 dark:text-amber-400 font-bold">{planet.subLord || '-'}</span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Drishti Column */}
                                                    <td className="py-4 px-4 sm:px-6">
                                                        {planet.drishti?.hasEventDrishti ? (
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-200 text-xs font-semibold shadow-2xs">
                                                                <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                                <span>{isTe ? planet.drishti.summaryBadgeTe : planet.drishti.summaryBadge}</span>
                                                            </div>
                                                        ) : planet.drishti?.totalAspectsCount > 0 ? (
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-xs font-mono">
                                                                <Eye className="w-3 h-3 opacity-60" />
                                                                <span>{isTe ? planet.drishti.summaryBadgeTe : planet.drishti.summaryBadge}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 font-mono text-xs">—</span>
                                                        )}
                                                    </td>

                                                    {/* Expand Evidence Button */}
                                                    <td className="py-4 px-4 sm:px-6 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedPlanet(isExpanded ? null : planet.planetKey)}
                                                            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                                                            title="Toggle 4-Fold KP & Drishti Evidence"
                                                        >
                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* Expanded Evidence Drawer */}
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={8} className="bg-amber-50/30 dark:bg-slate-800/40 p-4 sm:p-6 border-y border-amber-200/40 dark:border-white/5">
                                                            <div className="space-y-6">
                                                                {/* 4-Fold KP House Signification Proof */}
                                                                <div className="space-y-3">
                                                                    <h4 className="text-xs uppercase font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2 tracking-wider">
                                                                        <Shield className="w-4 h-4" />
                                                                        <span>{planet.planetName} - 4-Fold KP House Signification Proof</span>
                                                                    </h4>

                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                        {planet.houseEvidence.map(ev => (
                                                                            <div
                                                                                key={ev.house}
                                                                                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-white/10 shadow-xs space-y-2"
                                                                            >
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                                                                                        House {ev.house}
                                                                                    </span>
                                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 uppercase">
                                                                                        Grade {ev.levels[0]?.grade || 'Aspect'}
                                                                                    </span>
                                                                                </div>

                                                                                <div className="space-y-1 text-xs">
                                                                                    {ev.levels.map((lvl, lIdx) => (
                                                                                        <div key={lIdx} className="text-gray-700 dark:text-gray-300">
                                                                                            <span className="font-bold text-gray-900 dark:text-white">L{lvl.level}:</span> {lvl.desc}
                                                                                        </div>
                                                                                    ))}
                                                                                    {ev.hasAspect && (
                                                                                        <div className="text-indigo-600 dark:text-indigo-400 font-medium">
                                                                                            Parashari Graha Drishti (Aspect) on House {ev.house}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                <div className="pt-2 border-t border-gray-100 dark:border-white/5 text-[11px] text-gray-500 font-mono flex items-center justify-between">
                                                                                    <span>Cusp Sign: {formatSignDisplay(ev.cuspSign)}</span>
                                                                                    <span>Sub: {typeof ev.cuspSubLord === 'object' ? (ev.cuspSubLord?.name || ev.cuspSubLord?.en || '') : ev.cuspSubLord}</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Drishti Evidence Section */}
                                                                <div className="pt-4 border-t border-amber-200/40 dark:border-white/10 space-y-3">
                                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                                        <h4 className="text-xs uppercase font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2 tracking-wider">
                                                                            <Eye className="w-4 h-4 text-amber-500" />
                                                                            <span>{isTe ? "దృష్టి ఆధారాలు (Drishti Evidence)" : "Drishti Evidence (Planetary & Cusp Aspects)"}</span>
                                                                        </h4>
                                                                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-slate-900/60 px-2.5 py-0.5 rounded-full border border-gray-200/60 dark:border-white/10">
                                                                            {isTe ? "దృష్టి అనుబంధ ఆధారంగా మాత్రమే పరిగణించబడుతుంది మరియు కేపీ కారకత్వ స్కోర్‌ను మార్చదు." : "Drishti is supplementary evidence and does not change the KP significator score."}
                                                                        </span>
                                                                    </div>

                                                                    {planet.drishti?.allAspects?.length > 0 ? (
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                            {planet.drishti.allAspects.map((asp, aIdx) => (
                                                                                <div
                                                                                    key={asp.id || aIdx}
                                                                                    className={`p-3.5 rounded-xl border shadow-xs space-y-2 text-xs ${
                                                                                        asp.isEventRelevant
                                                                                            ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/50 ring-1 ring-indigo-500/10'
                                                                                            : 'bg-white/60 dark:bg-slate-900/60 border-gray-200/70 dark:border-white/5 opacity-85'
                                                                                    }`}
                                                                                >
                                                                                    {/* Header: Aspect Type and Event Relevance Badge */}
                                                                                    <div className="flex items-center justify-between gap-1 flex-wrap">
                                                                                        <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                                                                                            <span className="text-sm font-mono text-amber-600 dark:text-amber-400">{asp.aspectSymbol}</span>
                                                                                            <span>{isTe ? (asp.aspectNameTe || asp.aspectType) : asp.aspectType}</span>
                                                                                            {asp.nominalAngle !== undefined && asp.nominalAngle !== null && (
                                                                                                <span className="text-[10px] text-gray-500 font-mono">({asp.nominalAngle}°)</span>
                                                                                            )}
                                                                                        </div>
                                                                                        {asp.isEventRelevant ? (
                                                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 uppercase tracking-tight">
                                                                                                {isTe ? `సంఘటన భావం: H${asp.relevantHouses.join(', ')}` : `Event Target: H${asp.relevantHouses.join(', ')}`}
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500">
                                                                                                {isTe ? "సాధారణ దృష్టి" : "General"}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Target Details */}
                                                                                    <div className="space-y-1">
                                                                                        <div className="text-gray-700 dark:text-gray-300">
                                                                                            <span className="font-bold text-gray-900 dark:text-white">
                                                                                                {isTe ? "లక్ష్యం:" : "Target:"}
                                                                                            </span>{' '}
                                                                                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                                                                                {isTe ? asp.targetNameTe : asp.targetName}
                                                                                            </span>
                                                                                            {asp.targetType === 'planet' && asp.targetHouse > 0 && (
                                                                                                <span className="text-gray-500 font-mono text-[11px]"> ({isTe ? `${asp.targetHouse}వ భావంలో ఉంది` : `in House ${asp.targetHouse}`})</span>
                                                                                            )}
                                                                                        </div>
                                                                                        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                                                                                            {isTe ? asp.relevanceDescTe : asp.relevanceDescEn}
                                                                                        </p>
                                                                                    </div>

                                                                                    {/* Technical Metrics: System, Separation, Orb, Motion, Score Impact */}
                                                                                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-1 text-[11px] font-mono text-gray-500 dark:text-gray-400">
                                                                                        <div className="flex items-center justify-between">
                                                                                            <span>
                                                                                                {asp.convention === 'vedic_special'
                                                                                                    ? (isTe ? 'పరాశరి గ్రహ దృష్టి' : 'Parashari Vedic Drishti')
                                                                                                    : (isTe ? 'కేపీ పాశ్చాత్య డిగ్రీ దృష్టి' : 'KP Western Degree Aspect')}
                                                                                            </span>
                                                                                            {asp.nature && (
                                                                                                <span className={`capitalize font-bold ${
                                                                                                    asp.nature === 'benefic'
                                                                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                                                                        : asp.nature === 'malefic'
                                                                                                        ? 'text-rose-600 dark:text-rose-400'
                                                                                                        : 'text-gray-500'
                                                                                                }`}>
                                                                                                    {asp.nature}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>

                                                                                        {asp.convention !== 'vedic_special' && (
                                                                                            <div className="flex items-center justify-between text-[10px]">
                                                                                                <span>
                                                                                                    {isTe ? 'ఆర్బ్:' : 'Orb:'} {asp.orbFormatted || `${(asp.orb || 0).toFixed(2)}°`}
                                                                                                </span>
                                                                                                <span className="capitalize">
                                                                                                    {asp.motion === 'applying'
                                                                                                        ? (isTe ? 'సమీపించే గతి (Applying)' : 'Applying')
                                                                                                        : asp.motion === 'separating'
                                                                                                        ? (isTe ? 'దూరమయ్యే గతి (Separating)' : 'Separating')
                                                                                                        : (isTe ? 'ఖచ్చితమైనది (Exact)' : 'Exact')}
                                                                                                </span>
                                                                                            </div>
                                                                                        )}

                                                                                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold pt-0.5">
                                                                                            {isTe ? 'స్కోర్ ప్రభావం: +0 (కారకత్వ స్కోర్ మారదు)' : 'Score Impact: +0 (Does not alter KP rank)'}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-white/5 text-center text-xs text-gray-500">
                                                                            {isTe ? "ఎంచుకున్న ఆర్బ్ నిబంధనల ప్రకారం ఈ గ్రహానికి ఎటువంటి దృష్టులు ఏర్పడలేదు." : "No qualifying aspects detected for this planet under the selected orb rules."}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center bg-gray-50 dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-white/10 space-y-3">
                            <Info className="w-8 h-8 text-gray-400 mx-auto" />
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                {isTe ? `కనీసం ${minMatches} భావాలను సూచించే గ్రహాలు ఏవీ లేవు.` : `No planets signify at least ${minMatches} distinct houses for this event.`}
                            </p>
                            <button
                                type="button"
                                onClick={() => setMinMatches(1)}
                                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                                {isTe ? "థ్రెషోల్డ్ 1 భావానికి తగ్గించండి" : "Lower Threshold to >= 1 House"}
                            </button>
                        </div>
                    )}

                    {/* Excluded Planets Section (Below Threshold) */}
                    {rankingResult.excludedPlanets.length > 0 && (
                        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200/70 dark:border-white/5 space-y-3">
                            <h4 className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider flex items-center gap-2">
                                <HelpCircle className="w-4 h-4" />
                                <span>{isTe ? `థ్రెషోల్డ్ క్రింద ఉన్న గ్రహాలు (< ${minMatches} భావాలు)` : `Planets Below Threshold (< ${minMatches} Distinct Houses)`}</span>
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {rankingResult.excludedPlanets.map(p => (
                                    <div
                                        key={p.planetKey}
                                        className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-gray-200/80 dark:border-white/5 flex items-center justify-between text-xs"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{PLANET_ICONS[p.planetKey] || '🪐'}</span>
                                            <span className="font-bold text-gray-900 dark:text-gray-200">{p.planetName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {p.drishti?.hasEventDrishti && (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold" title={p.drishti.summaryBadge}>
                                                    <Eye className="w-3 h-3" />
                                                    <span>{p.drishti.eventAspectsCount}</span>
                                                </span>
                                            )}
                                            <span className="text-gray-500">
                                                {p.matchedHouses.length > 0 ? `Matched: H${p.matchedHouses.join(', ')}` : 'No Match'}
                                            </span>
                                            <span className="font-mono font-bold text-gray-400 px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700">
                                                {p.score}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mode A Callout to Future Event Timing Finder */}
                    <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-850 dark:to-slate-900 border border-amber-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h4 className="font-serif font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <span>{isTe ? "భవిష్యత్ దశా కాలాలలో ఈ ఈవెంట్ ఎప్పుడు అనుకూలం?" : "Want to discover when future Dasha periods support this event?"}</span>
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {isTe
                                    ? "ప్రత్యంతర దశ స్థాయి వరకు భవిష్యత్ 5 సంవత్సరాల కాలక్రమాన్ని తనిఖీ చేయండి."
                                    : "Search future Vimshottari Dasha periods down to Pratyantardasha level for required house support."}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={scrollToFinder}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                        >
                            <span>{isTe ? "భవిష్యత్ కాలాలను వెతకండి" : "Find Future Supportive Periods"}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* MODE B VIEW: Joint DBA Period Evaluation (Supports Flexible Dasha Selection) */}
            {analysisMode === 'modeB' && (
                <div id="dasha-evaluation-section" className="space-y-6">
                    {/* Compact Dasha Evaluation Mode & Control Panel (Requirement 4.A, 4.B, 4.C, 4.D, 4.E) */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-amber-200/80 dark:border-white/10 shadow-xs space-y-4.5">
                        {/* Top Bar: Evaluation Mode Toggle & Reset Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-3 border-b border-gray-100 dark:border-white/5">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
                                    {isTe ? "మూల్యాంకన విధానం:" : "Evaluation Mode:"}
                                </span>
                                <div className="inline-flex rounded-xl bg-gray-100 dark:bg-slate-800 p-1 border border-gray-200/60 dark:border-white/5">
                                    <button
                                        type="button"
                                        onClick={handleUseCurrentRunningDasha}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                            dashaEvalMode === 'current'
                                                ? 'bg-amber-500 text-white shadow-xs'
                                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{isTe ? "ప్రస్తుత రన్నింగ్ దశ" : "Current Running Dasha"}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDashaEvalMode('custom');
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                            dashaEvalMode === 'custom'
                                                ? 'bg-amber-500 text-white shadow-xs'
                                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{isTe ? "కస్టమ్ మూల్యాంకనం" : "Custom Evaluation"}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Secondary Navigation Actions */}
                            <div className="flex flex-wrap items-center gap-2">
                                {comparisonList.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setIsComparisonOpen(prev => !prev)}
                                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                        title={isTe ? "పోల్చిన కాలాల జాబితాను చూడండి" : "Toggle comparison list view"}
                                    >
                                        <History className="w-3.5 h-3.5" />
                                        <span>{isTe ? `పోలికలు (${comparisonList.length})` : `Comparisons (${comparisonList.length})`}</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleResetEvaluation}
                                    className="px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                                    title={isTe ? "దశా మూల్యాంకనాన్ని ప్రాథమిక స్థితికి రీసెట్ చేయండి" : "Reset evaluation to default without touching chart or rule selections"}
                                >
                                    <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                                    <span>{isTe ? "దశా రీసెట్" : "Reset Evaluation"}</span>
                                </button>
                            </div>
                        </div>

                        {/* Custom Evaluation Controls (Revealed when Custom Evaluation is Active) */}
                        {dashaEvalMode === 'custom' && (
                            <div className="space-y-4 pt-1">
                                {/* Row 1: Date Picker, Dynamic Quick Presets, and Selection Mode Toggle */}
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    {/* Date Picker & Presets */}
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="eval-date-input" className="text-xs font-bold text-gray-700 dark:text-gray-200 shrink-0">
                                                {isTe ? "ఈవెంట్ పరిశీలన తేదీ:" : "Evaluate Event On:"}
                                            </label>
                                            <input
                                                id="eval-date-input"
                                                type="date"
                                                value={customEvalDate}
                                                onChange={(e) => {
                                                    setCustomEvalDate(e.target.value);
                                                    setDashaSelectionMode('date');
                                                }}
                                                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-white/20 text-xs font-mono font-bold text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs"
                                            />
                                        </div>

                                        {/* Dynamic Quick Navigation Presets */}
                                        <div className="flex flex-wrap items-center gap-1">
                                            {[
                                                { key: 'today', labelEn: 'Today', labelTe: 'నేడు' },
                                                { key: '+3m', labelEn: '+3 Months', labelTe: '+3 నెలలు' },
                                                { key: '+6m', labelEn: '+6 Months', labelTe: '+6 నెలలు' },
                                                { key: '+1y', labelEn: '+1 Year', labelTe: '+1 సం.' },
                                                { key: '+2y', labelEn: '+2 Years', labelTe: '+2 సం.' }
                                            ].map(preset => (
                                                <button
                                                    key={preset.key}
                                                    type="button"
                                                    onClick={() => handlePresetDate(preset.key)}
                                                    className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-[11px] font-medium transition-all cursor-pointer"
                                                >
                                                    {isTe ? preset.labelTe : preset.labelEn}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Selection Mode Control (Automatic vs Manual) */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="inline-flex rounded-xl bg-gray-100 dark:bg-slate-800 p-0.5 border border-gray-200 dark:border-white/10 text-xs">
                                            <button
                                                type="button"
                                                onClick={handleUseSelectedDate}
                                                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                                    dashaSelectionMode === 'date'
                                                        ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-2xs'
                                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                                }`}
                                                title={isTe ? "తేదీ ఆధారంగా అన్ని స్థాయిలను ఆటోమేటిక్‌గా నిర్ణయించండి" : "Automatic from Date - calculates hierarchy applicable on date"}
                                            >
                                                {isTe ? "తేదీ నుండి ఆటోమేటిక్" : "Automatic from Date"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDashaSelectionMode('manual')}
                                                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                                    dashaSelectionMode === 'manual'
                                                        ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-2xs'
                                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                                                }`}
                                                title={isTe ? "దశలను మీరే చేతితో ఎంచుకోండి" : "Manual Dasha Selection"}
                                            >
                                                {isTe ? "మాన్యువల్ ఎంపిక" : "Manual Selection"}
                                            </button>
                                        </div>

                                        {dashaSelectionMode === 'manual' && (
                                            <button
                                                type="button"
                                                onClick={handleClearManualOverrides}
                                                className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-300/60 text-xs font-bold transition-all cursor-pointer"
                                                title={isTe ? "తేదీ ప్రకారం దశా నాథులను తిరిగి సమకాలీకరించండి" : "Reset manual overrides and sync hierarchy with selected date"}
                                            >
                                                {isTe ? "తేదీకి సమకాలీకరించు" : "Sync with Date"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Timeline Validation Error Alert */}
                                {!dateValidation.isValid && (
                                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800/40 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                                        <span>{dateValidation.message}</span>
                                    </div>
                                )}

                                {/* Informational Notice when manual period does not enclose evaluation date */}
                                {dashaSelectionMode === 'manual' && !isDateInsideSelectedHierarchy && (
                                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Info className="w-4 h-4 shrink-0 text-amber-600" />
                                            <span>
                                                {isTe
                                                    ? `ఎంచుకున్న తేదీ (${formatEvaluationDateOnly(customEvalDate, isTe)}) మాన్యువల్‌గా ఎంచుకున్న కాలం పరిధిలో లేదు. అయినా మీరు నిర్దేశించిన దశా కాలం మూల్యాంకనం చేయబడుతోంది.`
                                                    : `Selected evaluation date (${formatEvaluationDateOnly(customEvalDate)}) falls outside the manually selected period range. Astrological indicators of the specified combination are evaluated.`}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleUseSelectedDate}
                                            className="px-2 py-0.5 rounded-lg bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold text-[11px] shrink-0 cursor-pointer"
                                        >
                                            {isTe ? "తేదీకి మార్చు" : "Sync to Date"}
                                        </button>
                                    </div>
                                )}

                                {/* Row 2: Five-Level Dasha Dropdown Selectors (MD -> AD -> PD -> SD -> Prana) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                                    {/* Selector 1: Mahadasha (MD) */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                                            {isTe ? "1. మహాదశ (MD)" : "1. Mahadasha (MD)"}
                                        </label>
                                        <select
                                            value={selectedMdId}
                                            onChange={(e) => handleSelectMd(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                                        >
                                            {currentMdOptions.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {isTe ? getLocalizedPlanet(m.lord, 'te') : m.lord} ({formatEvaluationDateOnly(m.startDate)} - {formatEvaluationDateOnly(m.endDate)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Selector 2: Antardasha / Bhukti (AD) */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                                            {isTe ? "2. భుక్తి / అంతర్దశ (AD)" : "2. Bhukti / Antardasha (AD)"}
                                        </label>
                                        <select
                                            value={selectedAdId}
                                            onChange={(e) => handleSelectAd(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                                        >
                                            {currentAdOptions.map(a => (
                                                <option key={a.id} value={a.id}>
                                                    {isTe ? getLocalizedPlanet(a.lord, 'te') : a.lord} ({formatEvaluationDateOnly(a.startDate)} - {formatEvaluationDateOnly(a.endDate)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Selector 3: Pratyantardasha (PD) */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                                            {isTe ? "3. ప్రత్యంతర (PD)" : "3. Pratyantardasha (PD)"}
                                        </label>
                                        <select
                                            value={selectedPdId}
                                            onChange={(e) => handleSelectPd(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                                        >
                                            {currentPdOptions.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {isTe ? getLocalizedPlanet(p.lord, 'te') : p.lord} ({formatEvaluationDateOnly(p.startDate)} - {formatEvaluationDateOnly(p.endDate)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Selector 4: Sookshma Dasha (SD) */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                                            {isTe ? "4. సూక్ష్మ దశ (SD)" : "4. Sookshma Dasha (SD)"}
                                        </label>
                                        <select
                                            value={selectedSdId}
                                            onChange={(e) => handleSelectSd(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                                        >
                                            {currentSdOptions.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {isTe ? getLocalizedPlanet(s.lord, 'te') : s.lord} ({formatEvaluationDateOnly(s.startDate)} - {formatEvaluationDateOnly(s.endDate)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Selector 5: Prana Dasha */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                                            {isTe ? "5. ప్రాణ దశ (Prana)" : "5. Prana Dasha (Prana)"}
                                        </label>
                                        <select
                                            value={selectedPranaId}
                                            onChange={(e) => handleSelectPrana(e.target.value)}
                                            className="w-full px-2.5 py-1.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                                        >
                                            {currentPranaOptions.map(pr => (
                                                <option key={pr.id} value={pr.id}>
                                                    {isTe ? getLocalizedPlanet(pr.lord, 'te') : pr.lord} ({formatEvaluationDateOnly(pr.startDate)} - {formatEvaluationDateOnly(pr.endDate)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Row 3: Action Buttons */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Trigger evaluation refresh smoothly
                                                if (dashaSelectionMode === 'date') {
                                                    handleUseSelectedDate();
                                                }
                                            }}
                                            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                            <span>{isTe ? "ఎంపిక చేసిన కాలాన్ని విశ్లేషించండి" : "Evaluate Selected Period"}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleAddComparison}
                                            className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 border border-amber-300/80 dark:border-white/10 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                                            title={isTe ? "ఈ కాలాన్ని పోలిక జాబితాలో భద్రపరచండి" : "Save this period into comparison table"}
                                        >
                                            <BookmarkPlus className="w-4 h-4 text-amber-500" />
                                            <span>{isTe ? "+ పోలికకు జోడించండి" : "+ Add to Comparison"}</span>
                                        </button>
                                    </div>

                                    {/* Active Hierarchy Path Badge */}
                                    <div className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                        <span className="opacity-75">{isTe ? "క్రియాశీల క్రమం:" : "Active Hierarchy:"}</span>
                                        <span className="text-indigo-600 dark:text-indigo-400">
                                            {activeEvaluationLords.map(l => (isTe ? getLocalizedPlanet(l.planet, 'te') : l.planet)).join(' → ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Joint DBA Evaluation Result Banner */}
                    {jointDBAResult && (
                        <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm ${
                            jointDBAResult.status === 'satisfied'
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                                : jointDBAResult.status === 'partially-satisfied'
                                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
                                : jointDBAResult.status === 'afflicted'
                                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/40 text-rose-900 dark:text-rose-200'
                                : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-200'
                        }`}>
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs uppercase font-bold tracking-wider opacity-80">
                                        {dashaEvalMode === 'custom'
                                            ? (isTe ? "కస్టమ్ దశా మూల్యాంకనం (5 స్థాయిలు)" : "Custom Dasha Evaluation (5 Levels)")
                                            : (isTe ? "ప్రస్తుత రన్నింగ్ దశా మూల్యాంకనం (5 స్థాయిలు)" : "Current Running Dasha Evaluation (5 Levels)")}
                                    </span>
                                    {/* 5-Level Hierarchy Breadcrumb */}
                                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-800/70 border border-current/20 font-bold opacity-90">
                                        MD → AD → PD → SD → Prana
                                    </span>
                                    {dashaEvalMode === 'custom' && (
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold">
                                            {dashaSelectionMode === 'manual'
                                                ? (isTe ? "మాన్యువల్ ఎంపిక" : "Manual Selection")
                                                : (isTe ? "తేదీ ఆధారితం" : "Date-Derived")}
                                        </span>
                                    )}
                                    {dashaEvalMode === 'custom' && (
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-current/20 font-bold opacity-90">
                                            📅 {formatEvaluationDateOnly(customEvalDate, isTe)}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-xl sm:text-2xl font-serif font-black flex items-center gap-2.5">
                                    {jointDBAResult.status === 'satisfied' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
                                    {jointDBAResult.status === 'partially-satisfied' && <Clock className="w-6 h-6 text-amber-600 shrink-0" />}
                                    {jointDBAResult.status === 'afflicted' && <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />}
                                    <span>
                                        {jointDBAResult.status === 'satisfied' && (isTe ? "5 స్థాయిల దశా సంపూర్ణంగా అనుకూలం (100% సంతృప్తి)" : "5-Level Joint Dasha Fully Satisfied (100% Coverage)")}
                                        {jointDBAResult.status === 'partially-satisfied' && (isTe ? "పాక్షిక అనుకూలత (50%+ కవరేజ్)" : "Partially Satisfied (>= 50% Coverage)")}
                                        {jointDBAResult.status === 'afflicted' && (isTe ? "అవరోధం / నిరోధక భావాల ప్రభావం" : "Afflicted / Negative Obstruction Detected")}
                                        {jointDBAResult.status === 'not-satisfied' && (
                                            dashaEvalMode === 'custom'
                                                ? (isTe ? "ఎంచుకున్న దశా కాలంలో సరిపోలిన భావాలు లేవు" : "Not Satisfied in Selected Period")
                                                : (isTe ? "ప్రస్తుత దశా కాలంలో సరిపోలిన భావాలు లేవు" : "Not Satisfied in Current Period")
                                        )}
                                    </span>
                                </h3>

                                <div className="text-xs font-mono font-medium opacity-90 flex flex-wrap items-center gap-1.5">
                                    <span className="opacity-75">{dashaEvalMode === 'custom' ? (isTe ? "ఎంచుకున్న నాథులు:" : "Selected Lords:") : (isTe ? "రన్నింగ్ నాథులు:" : "Running Lords:")}</span>
                                    {(jointDBAResult.runningLordsDetails || jointDBAResult.triadDetails || []).map((l, idx, arr) => (
                                        <span key={idx} className="inline-flex items-center gap-1">
                                            <strong className="underline decoration-dotted">{isTe ? getLocalizedPlanet(l.planet, 'te') : l.planet}</strong>
                                            <span className="text-[10px] opacity-75">({l.level})</span>
                                            {idx < arr.length - 1 && <span className="opacity-50">→</span>}
                                        </span>
                                    ))}
                                </div>

                                <p className="text-xs opacity-90 max-w-xl pt-0.5">
                                    {dashaEvalMode === 'custom'
                                        ? (isTe
                                            ? "ఎంచుకున్న తేదీ మరియు దశల ప్రకారం మహాదశ, భుక్తి, అంతర, సూక్ష్మ, మరియు ప్రాణ నాథులు కలిపి అవసరమైన ఈవెంట్ భావాలను సూచిస్తున్నారో లేదో విశ్లేషించబడింది."
                                            : "Evaluates whether the combined hierarchy of selected Mahadasha, Bhukti, Antara, Sookshma, and Prana lords collectively signify the required event houses.")
                                        : (isTe
                                            ? "ప్రస్తుతం నడుస్తున్న మహాదశ, భుక్తి, అంతర, సూక్ష్మ, మరియు ప్రాణ నాథులు కలిపి అవసరమైన ఈవెంట్ భావాలను సూచిస్తున్నారో లేదో విశ్లేషించబడింది."
                                            : "Evaluates whether the combined hierarchy of running Mahadasha, Bhukti, Antara, Sookshma, and Prana lords collectively signify the required event houses.")}
                                </p>

                                {jointDBAResult.status !== 'satisfied' && (
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={scrollToFinder}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>{isTe ? "భవిష్యత్ అనుకూల కాలాలను వెతకండి" : "Find Future Supportive Periods"}</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Meter Percentage */}
                            <div className="text-center bg-white/80 dark:bg-slate-800/80 px-6 py-4 rounded-2xl border border-current/20 shadow-xs shrink-0">
                                <span className="block text-3xl font-mono font-black">{jointDBAResult.coveragePercent}%</span>
                                <span className="text-[11px] uppercase font-bold tracking-wider opacity-75">
                                    {jointDBAResult.coveredHouses.length} of {jointDBAResult.requiredHouses.length} {isTe ? "భావాలు" : "Houses"}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* 5 Running Dasha Levels Breakdown Cards (MD -> AD -> PD -> SD -> Prana) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
                        {(jointDBAResult?.runningLordsDetails || jointDBAResult?.triadDetails || []).map((lord, idx) => (
                            <div
                                key={idx}
                                className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-4.5 border shadow-xs space-y-3 flex flex-col justify-between transition-all hover:border-indigo-300 dark:hover:border-indigo-700 ${
                                    lord.isAfflicted
                                        ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                                        : 'border-indigo-200/80 dark:border-white/10'
                                }`}
                            >
                                <div className="space-y-2.5">
                                    {/* Level Header and Badge */}
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs uppercase font-bold text-indigo-600 dark:text-indigo-400 truncate" title={lord.periodName}>
                                            {isTe ? (lord.periodNameTe || lord.periodName) : lord.periodName}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/40 text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                                            {lord.level}
                                        </span>
                                    </div>

                                    {/* Planet Icon & Name */}
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-2xl shrink-0">{PLANET_ICONS[lord.planet] || '🪐'}</span>
                                        <div className="min-w-0">
                                            <div className="font-bold text-base text-gray-900 dark:text-white truncate">
                                                {isTe ? getLocalizedPlanet(lord.planet, 'te') : lord.planet}
                                            </div>
                                            <span className="text-[11px] text-gray-500 font-mono block">
                                                {isTe ? `${lord.signifiedHouses.length} భావాలు సూచిస్తుంది` : `Signifies ${lord.signifiedHouses.length} houses`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Start / End & Remaining Duration */}
                                    <div className="py-2 px-2.5 rounded-xl bg-gray-50/80 dark:bg-slate-800/60 border border-gray-100 dark:border-white/5 space-y-1 text-[11px] font-mono">
                                        {lord.startDate && (
                                            <div className="text-gray-600 dark:text-gray-300 truncate" title={`Start: ${formatDateTime(lord.startDate)}`}>
                                                <span className="text-gray-400 font-sans">{isTe ? "మొదలు:" : "Start:"}</span> {formatDateTime(lord.startDate)}
                                            </div>
                                        )}
                                        {lord.endDate && (
                                            <div className="text-gray-600 dark:text-gray-300 truncate" title={`End: ${formatDateTime(lord.endDate)}`}>
                                                <span className="text-gray-400 font-sans">{isTe ? "ముగింపు:" : "End:"}</span> {formatDateTime(lord.endDate)}
                                            </div>
                                        )}
                                        {lord.remainingDuration && (
                                            <div className="text-indigo-600 dark:text-indigo-400 font-bold truncate">
                                                <span className="text-gray-400 font-sans font-normal">
                                                    {lord.isDateInsidePeriod ? (isTe ? "మిగిలిన సమయం:" : "Rem:") : (isTe ? "వ్యవధి:" : "Duration:")}
                                                </span> {lord.remainingDuration}
                                            </div>
                                        )}
                                        {dashaEvalMode === 'custom' && !lord.isDateInsidePeriod && (
                                            <div className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                                                {isTe ? "(తేదీ ఈ కాలం వెలుపల ఉంది)" : "(Date outside period)"}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Matched Houses and Significations */}
                                <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-gray-500 text-[11px]">{isTe ? "మ్యాచింగ్ భావాలు:" : "Matched DBA:"}</span>
                                        <span className="text-[10px] font-mono font-bold text-gray-400">
                                            {lord.matchedCount || 0}/{jointDBAResult.requiredHouses.length} ({lord.coveragePercent || 0}%)
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1 font-mono font-bold">
                                        {lord.matchedDBAHouses && lord.matchedDBAHouses.length > 0 ? (
                                            lord.matchedDBAHouses.map(h => (
                                                <span key={h} className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px]">
                                                    H{h}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-gray-400 italic text-[11px]">None</span>
                                        )}
                                    </div>

                                    <div className="text-[11px] text-gray-500 font-mono truncate" title={`All signified houses: ${lord.signifiedHouses.join(', ')}`}>
                                        All: {lord.signifiedHouses.join(', ')}
                                    </div>

                                    {/* Obstruction warning badge if afflicted */}
                                    {lord.isAfflicted && (
                                        <div className="p-1.5 rounded-lg bg-rose-100/70 dark:bg-rose-950/40 border border-rose-300 text-rose-800 dark:text-rose-300 text-[10px] flex items-center gap-1 font-sans">
                                            <AlertTriangle className="w-3 h-3 shrink-0 text-rose-600" />
                                            <span className="truncate">
                                                {isTe ? `నిరోధకం: H${lord.matchedNegatives.join(', ')}` : `Afflicted: H${lord.matchedNegatives.join(', ')}`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Joint 5-Level Dasha Union Coverage Table */}
                    {jointDBAResult && (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-amber-200/80 dark:border-white/10 shadow-sm space-y-4">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <Layers className="w-4 h-4 text-amber-500" />
                                <span>{isTe ? "5 స్థాయిల సమిష్టి ఫలితం (5-Level Dasha Union Coverage)" : "Running 5-Level Joint House Coverage (MD ∪ AD ∪ PD ∪ SD ∪ Prana)"}</span>
                            </h4>

                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                {jointDBAResult.requiredHouses.map(h => {
                                    const isCovered = jointDBAResult.coveredHouses.includes(h);
                                    return (
                                        <div
                                            key={h}
                                            className={`p-3.5 rounded-xl border flex items-center justify-between ${
                                                isCovered
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                                                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 text-rose-800 dark:text-rose-300'
                                            }`}
                                        >
                                            <div className="font-mono font-bold text-sm">
                                                House {h}
                                            </div>
                                            <div className="text-xs font-bold flex items-center gap-1">
                                                {isCovered ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                        <span>{isTe ? "వర్తిస్తుంది" : "Covered"}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <X className="w-3.5 h-3.5 text-rose-500" />
                                                        <span>{isTe ? "లోపించింది" : "Missing"}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Negative Exclusions Alert with traceable explanation */}
                            {jointDBAResult.hasObstruction && (
                                <div className="p-4 rounded-xl bg-rose-100/70 dark:bg-rose-950/40 border border-rose-300 text-rose-900 dark:text-rose-200 text-xs space-y-1">
                                    <div className="flex items-center gap-2 font-bold">
                                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                        <span>{isTe ? "నిరోధక హెచ్చరిక (Obstruction Warning):" : "Obstruction Warning:"}</span>
                                    </div>
                                    <div className="pl-6 space-y-0.5 text-[11px] opacity-90">
                                        {(jointDBAResult.obstructionReasons || []).map((reason, rIdx) => (
                                            <div key={rIdx}>• {reason}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Saved Period Comparisons Panel (Requirement 7) */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-amber-200/80 dark:border-white/10 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4 text-amber-500" />
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                    {isTe ? `సేవ్ చేసిన కాలాల పోలిక (${comparisonList.length})` : `Saved Period Comparisons (${comparisonList.length})`}
                                </h4>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleAddComparison}
                                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                                    title={isTe ? "ప్రస్తుత మూల్యాంకనాన్ని పోలిక జాబితాకు జోడించండి" : "Add current evaluation to comparison list"}
                                >
                                    <BookmarkPlus className="w-3.5 h-3.5" />
                                    <span>{isTe ? "+ ప్రస్తుత కాలాన్ని జోడించండి" : "+ Add Current to Comparison"}</span>
                                </button>
                                {comparisonList.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleClearComparisons}
                                        className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/50 text-gray-600 dark:text-gray-300 text-xs font-medium transition-all cursor-pointer"
                                        title={isTe ? "అన్ని పోలికలను తొలగించండి" : "Clear all comparison entries"}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {comparisonList.length === 0 ? (
                            <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-slate-800/40 border border-dashed border-gray-200 dark:border-white/10 text-center text-xs text-gray-500">
                                {isTe
                                    ? "కాలాల పోలిక కోసం '+ ప్రస్తుత కాలాన్ని జోడించండి' బటన్‌పై క్లిక్ చేయండి. వివిధ తేదీలు మరియు దశల ఫలితాలను ఇక్కడ పక్కపక్కనే సరిపోల్చవచ్చు."
                                    : "No saved comparisons yet. Click '+ Add Current to Comparison' to compare event results across different historical or future periods."}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-mono uppercase tracking-wider text-[11px]">
                                            <th className="py-2.5 px-3">{isTe ? "కాలం / తేదీ" : "Evaluation / Date"}</th>
                                            <th className="py-2.5 px-3">{isTe ? "5-స్థాయిల దశా మార్గం" : "Dasha Hierarchy (5 Levels)"}</th>
                                            <th className="py-2.5 px-3 text-center">{isTe ? "ఫలిత స్థితి" : "Status"}</th>
                                            <th className="py-2.5 px-3 text-center">{isTe ? "సంతృప్తి శాతం" : "Coverage %"}</th>
                                            <th className="py-2.5 px-3 text-right">{isTe ? "చర్యలు" : "Actions"}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-sans">
                                        {comparisonList.map((entry) => (
                                            <tr key={entry.id} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="py-3 px-3">
                                                    <div className="font-bold text-gray-900 dark:text-white">
                                                        {entry.label}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-mono">
                                                        {entry.evaluationDateFormatted}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 font-mono text-[11px]">
                                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                                        {entry.hierarchyPath}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        entry.status === 'satisfied'
                                                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                                                            : entry.status === 'partially-satisfied'
                                                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                                                            : entry.status === 'afflicted'
                                                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200'
                                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {entry.status === 'satisfied' && (isTe ? "సంతృప్తి" : "Satisfied")}
                                                        {entry.status === 'partially-satisfied' && (isTe ? "పాక్షికం" : "Partial")}
                                                        {entry.status === 'afflicted' && (isTe ? "అవరోధం" : "Afflicted")}
                                                        {entry.status === 'not-satisfied' && (isTe ? "సరిపోలలేదు" : "Not Satisfied")}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center font-mono font-bold">
                                                    <span className="text-gray-900 dark:text-white">{entry.coveragePercent}%</span>
                                                    <span className="text-[10px] text-gray-500 block font-normal">
                                                        {entry.coveredCount}/{entry.requiredCount} {isTe ? "భావాలు" : "houses"}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleLoadComparison(entry)}
                                                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold transition-all cursor-pointer"
                                                            title={isTe ? "ఈ కాలాన్ని మూల్యాంకనంలోకి లోడ్ చేయండి" : "Load and inspect this period"}
                                                        >
                                                            {isTe ? "లోడ్ చేయి" : "Load"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveComparison(entry.id)}
                                                            className="p-1 rounded-lg hover:bg-rose-100 text-gray-400 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                                                            title={isTe ? "ఈ పోలికను తొలగించండి" : "Remove comparison"}
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Future Event Timing Finder (Authoritative Timeline Search) */}
                    <FutureEventTimingFinder
                        dashaResult={fullDashaResult}
                        significators={kpData?.significators}
                        activeRule={activeRule}
                        currentRequiredHouses={currentRequiredHouses}
                        lang={lang}
                        onViewDasha={onViewDasha}
                        onEvaluatePeriod={handleEvaluateFuturePeriod}
                    />
                </div>
            )}

            {/* CUSP SUB LORD CHECKS SECTION */}
            {cuspSubLordResults.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-amber-200/80 dark:border-white/10 shadow-md space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <h3 className="text-base sm:text-lg font-serif font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <Compass className="w-5 h-5 text-amber-500" />
                                <span>{isTe ? "సూచించబడిన భావ సబ్ లార్డ్ తనిఖీలు" : "Required Cusp Sub Lord Analysis"}</span>
                            </h3>
                            <p className="text-xs text-gray-500">
                                {isTe ? "ఈ సూత్రానికి నిర్దేశించిన భావ సబ్ లార్డుల సూచనలు." : "Specific cusp sub lords required to be cross-verified for this event."}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {cuspSubLordResults.map(chk => (
                            <div
                                key={chk.cuspNumber}
                                className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-white/5 space-y-2 text-xs"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {isTe ? `${chk.cuspNumber}వ భావ సబ్ లార్డ్:` : `Cusp ${chk.cuspNumber} Sub Lord:`}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                        chk.status === 'favorable'
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                            : chk.status === 'moderate'
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                            : chk.status === 'negative'
                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                            : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'
                                    }`}>
                                        {chk.status}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{PLANET_ICONS[chk.subLord] || '🪐'}</span>
                                    <span className="font-bold text-base text-amber-600 dark:text-amber-400">
                                        {isTe ? getLocalizedPlanet(chk.subLord, 'te') : chk.subLord}
                                    </span>
                                </div>

                                <div className="pt-2 border-t border-gray-200/60 dark:border-white/5 space-y-1 font-mono text-[11px]">
                                    <div className="text-gray-600 dark:text-gray-400">
                                        Signifies: {chk.subLordHouses.join(', ')}
                                    </div>
                                    <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                                        Matched: {chk.matchedHouses.length > 0 ? chk.matchedHouses.join(', ') : 'None'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Professional Event Report Studio Modal */}
            <ReportGenerationModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                kpData={kpData}
                birthDetails={{
                    name: kpData?.chartLabel || (isTe ? 'జాతుకుడు' : 'Seeker'),
                    birthDate: kpData?.birthInstantUtc?.slice(0, 10),
                    birthTime: kpData?.birthInstantUtc?.slice(11, 16)
                }}
                initialReportType={activeRule?.event?.toLowerCase().includes('missing person') ? 'missing_person' : 'event_analysis'}
                initialSelectedEvents={[activeRule, ...recentRules.filter(r => r.id !== activeRule.id)]}
                lang={lang}
            />

            {/* Custom House Rules Manager Modal */}
            <CustomHouseRulesManager
                isOpen={isCustomRulesModalOpen}
                onClose={() => setIsCustomRulesModalOpen(false)}
                customRules={customRules}
                activeRuleId={selectedRuleId}
                onSelectRule={selectRule}
                onCreateRule={handleCreateCustomRule}
                onUpdateRule={handleUpdateCustomRule}
                onDeleteRule={handleDeleteCustomRule}
                onRulesChanged={handleCustomRulesChanged}
                lang={lang}
            />
        </div>
    );
};

export default KPEventSignificatorAnalysis;
