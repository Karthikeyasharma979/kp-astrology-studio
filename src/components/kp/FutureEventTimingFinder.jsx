import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Calendar, Clock, Layers, Filter, CheckCircle2,
    AlertTriangle, ArrowRight, RefreshCw, Sliders, ExternalLink,
    HelpCircle, ChevronDown, ChevronUp, Eye, Compass, Shield,
    Check, X, Sparkles, AlertCircle, LayoutGrid, List, ArrowUpDown
} from 'lucide-react';
import {
    findFutureSupportivePeriods,
    sortFuturePeriods,
    filterFuturePeriods,
    getQuickDurationRange,
    computeSearchEndDate,
    SEARCH_DURATION_PRESETS,
    EVALUATION_DEPTHS,
    MATCH_CRITERIA_OPTIONS
} from '../../utils/kp/futureEventFinder.js';
import {
    formatDateForPicker,
    formatEvaluationDateOnly,
    formatEvaluationDateTime,
    parseEvaluationDate
} from '../../utils/kp/dashaEvaluationEngine.js';
import { getLocalizedPlanet, KP_TRANSLATIONS } from '../../utils/kpTranslations.js';
import { PLANET_ICONS, HOUSE_KEYWORDS } from './KPEventSignificatorAnalysis.jsx';

/**
 * High-performance, reactive Future Event Timing Finder component.
 */
export const FutureEventTimingFinder = ({
    dashaResult,
    significators,
    activeRule,
    currentRequiredHouses = [],
    ascSign = 1,
    lang = 'te',
    onViewDasha = null,
    onEvaluatePeriod = null
}) => {
    const isTe = lang === 'te';
    const t = KP_TRANSLATIONS[lang] || KP_TRANSLATIONS.te;

    // 1. Search Period Configuration
    const todayStr = useMemo(() => formatDateForPicker(new Date()), []);
    const defaultEndStr = useMemo(() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 5);
        return formatDateForPicker(d);
    }, []);

    const [durationPreset, setDurationPreset] = useState('5y');
    const [startDateInput, setStartDateInput] = useState(todayStr);
    const [endDateInput, setEndDateInput] = useState(defaultEndStr);

    // 2. Dasha Evaluation Depth (Default: 3 for Pratyantardasha)
    const [evaluationDepth, setEvaluationDepth] = useState(3);

    // 3. Match Criteria (Default: All required houses matched)
    const [matchCriteria, setMatchCriteria] = useState(MATCH_CRITERIA_OPTIONS.ALL);
    const [minCoverageThreshold, setMinCoverageThreshold] = useState(66);

    // 4. Required Houses Synchronization
    const [customHouses, setCustomHouses] = useState(() => currentRequiredHouses);
    const [isEditingHouses, setIsEditingHouses] = useState(false);

    // Keep houses synced when parent rule / event changes
    useEffect(() => {
        if (currentRequiredHouses && currentRequiredHouses.length > 0) {
            setCustomHouses(currentRequiredHouses);
        }
    }, [currentRequiredHouses, activeRule?.id]);

    // Update start/end dates when duration preset changes
    const handlePresetChange = (presetKey) => {
        setDurationPreset(presetKey);
        if (presetKey === 'custom') return;

        const base = parseEvaluationDate(startDateInput || new Date());
        const range = getQuickDurationRange(presetKey, base);
        setStartDateInput(formatDateForPicker(range.startDate));
        setEndDateInput(formatDateForPicker(range.endDate));
    };

    // 5. Search Execution State
    const [isSearching, setIsSearching] = useState(false);
    const [searchResponse, setSearchResponse] = useState(null);
    const [searchError, setSearchError] = useState(null);
    const [searchCompletedOnce, setSearchCompletedOnce] = useState(false);

    // 6. View, Sorting & Filtering State
    const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
    const [sortBy, setSortBy] = useState('default'); // 'default' | 'earliest' | 'score' | 'duration' | 'coverage'
    const [filterMatchType, setFilterMatchType] = useState('all'); // 'all' | 'full' | 'partial'
    const [filterMdLord, setFilterMdLord] = useState('');
    const [filterAdLord, setFilterAdLord] = useState('');
    const [filterPdLord, setFilterPdLord] = useState('');
    const [selectedCandidateForDetails, setSelectedCandidateForDetails] = useState(null);

    // Cancel stale search flag
    const searchIdRef = useRef(0);

    const handleRunSearch = () => {
        if (!dashaResult || !significators || !activeRule) return;

        setIsSearching(true);
        setSearchError(null);
        const thisSearchId = ++searchIdRef.current;

        // Run asynchronously so UI updates immediately and never blocks
        setTimeout(() => {
            if (thisSearchId !== searchIdRef.current) return; // Stale execution cancelled

            try {
                const effectiveHouses = customHouses && customHouses.length > 0
                    ? customHouses
                    : currentRequiredHouses;

                const response = findFutureSupportivePeriods({
                    dashaResult,
                    significators,
                    rule: activeRule,
                    searchStartDate: startDateInput,
                    searchEndDate: endDateInput,
                    evaluationDepth,
                    matchCriteria,
                    minCoverageThreshold: Number(minCoverageThreshold),
                    customRequiredHouses: effectiveHouses,
                    options: { ascSign },
                    isTe
                });

                if (thisSearchId !== searchIdRef.current) return;

                if (!response.isValid) {
                    setSearchError(response.error || 'Failed to search dasha timeline.');
                    setSearchResponse(null);
                } else {
                    setSearchResponse(response);
                    setSearchError(null);
                    setSearchCompletedOnce(true);
                }
            } catch (err) {
                if (thisSearchId === searchIdRef.current) {
                    setSearchError(err.message || 'An unexpected error occurred during search.');
                    setSearchResponse(null);
                }
            } finally {
                if (thisSearchId === searchIdRef.current) {
                    setIsSearching(false);
                }
            }
        }, 30);
    };

    // Filter and Sort candidate results
    const displayedResults = useMemo(() => {
        if (!searchResponse || !Array.isArray(searchResponse.results)) return [];

        const filtered = filterFuturePeriods(searchResponse.results, {
            matchType: filterMatchType,
            mdLord: filterMdLord,
            adLord: filterAdLord,
            pdLord: filterPdLord
        });

        return sortFuturePeriods(filtered, sortBy);
    }, [searchResponse, filterMatchType, filterMdLord, filterAdLord, filterPdLord, sortBy]);

    // Unique lords for dropdown filter lists
    const uniqueLords = useMemo(() => {
        if (!searchResponse?.results) return { mds: [], ads: [], pds: [] };
        const mds = Array.from(new Set(searchResponse.results.map(r => r.mdLord).filter(Boolean)));
        const ads = Array.from(new Set(searchResponse.results.map(r => r.adLord).filter(Boolean)));
        const pds = Array.from(new Set(searchResponse.results.map(r => r.pdLord).filter(Boolean)));
        return { mds, ads, pds };
    }, [searchResponse]);

    const isHistorical = useMemo(() => {
        if (!startDateInput) return false;
        const d = parseEvaluationDate(startDateInput).getTime();
        return d < (Date.now() - 24 * 60 * 60 * 1000);
    }, [startDateInput]);

    return (
        <div id="future-event-timing-finder" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-amber-200/80 dark:border-white/10 shadow-lg space-y-6 transition-all">
            {/* Header Title & Description */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-white/10">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-md">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl sm:text-2xl font-serif font-black text-gray-900 dark:text-white">
                                {isTe ? "భవిష్యత్ అనుకూల దశా కాల శోధన (Future Event Timing Finder)" : "Future Event Timing Finder"}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                {isTe
                                    ? "మీరు ఎంచుకున్న ఈవెంట్ భావాలకు అనుకూలమైన వింశోత్తరి దశా కాలాల కోసం భవిష్యత్ కాలక్రమాన్ని శోధించండి."
                                    : "Search future Vimshottari Dasha periods for combinations that support your selected event houses."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Historical search indicator if start date is in past */}
                {isHistorical && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{isTe ? "చారిత్రక కాల విశ్లేషణ (Historical Analysis)" : "Historical Event Timing Analysis"}</span>
                    </div>
                )}
            </div>

            {/* Configuration Controls Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-amber-50/40 dark:bg-slate-800/40 p-5 sm:p-6 rounded-2xl border border-amber-100 dark:border-white/5">
                {/* 1. Search Period Horizon */}
                <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
                            <Calendar className="w-4 h-4 text-amber-500" />
                            <span>{isTe ? "శోధన కాలపరిమితి (Search Horizon):" : "Search Horizon:"}</span>
                        </label>
                    </div>

                    {/* Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {SEARCH_DURATION_PRESETS.map(p => (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() => handlePresetChange(p.key)}
                                className={`px-2.5 py-1 text-xs rounded-xl font-bold transition-all cursor-pointer ${
                                    durationPreset === p.key
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                {isTe ? p.labelTe : p.labelEn}
                            </button>
                        ))}
                    </div>

                    {/* Start and End Date Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                            <span className="text-[11px] font-mono text-gray-500 block mb-1">
                                {isTe ? "ప్రారంభం (From):" : "From:"}
                            </span>
                            <input
                                type="date"
                                value={startDateInput}
                                onChange={(e) => {
                                    setStartDateInput(e.target.value);
                                    setDurationPreset('custom');
                                }}
                                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                            />
                        </div>
                        <div>
                            <span className="text-[11px] font-mono text-gray-500 block mb-1">
                                {isTe ? "ముగింపు (Until):" : "Until:"}
                            </span>
                            <input
                                type="date"
                                value={endDateInput}
                                onChange={(e) => {
                                    setEndDateInput(e.target.value);
                                    setDurationPreset('custom');
                                }}
                                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Dasha Evaluation Depth */}
                <div className="lg:col-span-4 space-y-3">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <Layers className="w-4 h-4 text-amber-500" />
                        <span>{isTe ? "దశా విశ్లేషణ స్థాయి (Evaluation Depth):" : "Dasha Evaluation Depth:"}</span>
                    </label>

                    <div className="space-y-1.5">
                        {EVALUATION_DEPTHS.map(d => (
                            <label
                                key={d.level}
                                className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                    evaluationDepth === d.level
                                        ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-400 text-amber-900 dark:text-amber-200 font-bold'
                                        : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="evaluationDepth"
                                        value={d.level}
                                        checked={evaluationDepth === d.level}
                                        onChange={() => setEvaluationDepth(d.level)}
                                        className="text-amber-500 focus:ring-amber-400"
                                    />
                                    <span>{isTe ? d.labelTe : d.labelEn}</span>
                                </div>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-bold">
                                    {d.abbr}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* 3. Match Criteria & Event Houses Verification */}
                <div className="lg:col-span-3 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
                            <Sliders className="w-4 h-4 text-amber-500" />
                            <span>{isTe ? "సరిపోలిక ప్రమాణం (Match Criteria):" : "Match Criteria:"}</span>
                        </label>

                        <select
                            value={matchCriteria}
                            onChange={(e) => setMatchCriteria(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                        >
                            <option value={MATCH_CRITERIA_OPTIONS.ALL}>
                                {isTe ? "అన్ని భావాలు వర్తించాలి (All Houses Matched)" : "All required houses matched"}
                            </option>
                            <option value={MATCH_CRITERIA_OPTIONS.THRESHOLD}>
                                {isTe ? "కనీస శాతం సరిపోలిక (Minimum Coverage %)" : "Minimum required house coverage"}
                            </option>
                            <option value={MATCH_CRITERIA_OPTIONS.ANY}>
                                {isTe ? "అన్ని కాలాలు చూపించు (Show all periods)" : "Show all periods with their coverage"}
                            </option>
                        </select>

                        {/* Configurable coverage threshold if threshold mode */}
                        {matchCriteria === MATCH_CRITERIA_OPTIONS.THRESHOLD && (
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                    <span className="text-gray-500">{isTe ? "కనీస శాతం:" : "Min Coverage:"}</span>
                                    <span className="font-bold text-amber-600">{minCoverageThreshold}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="33"
                                    max="100"
                                    step="5"
                                    value={minCoverageThreshold}
                                    onChange={(e) => setMinCoverageThreshold(e.target.value)}
                                    className="w-full accent-amber-500"
                                />
                            </div>
                        )}

                        {/* Verified Event Houses Display */}
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                                    {isTe ? "ఈవెంట్ భావాలు:" : "Required Houses:"}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-amber-600">
                                    {activeRule?.event || activeRule?.subject || 'Event'}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                {(customHouses || []).map(h => (
                                    <span
                                        key={h}
                                        className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-mono font-bold text-xs"
                                        title={`House ${h}`}
                                    >
                                        H{h}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Primary Search Button */}
                    <button
                        type="button"
                        onClick={handleRunSearch}
                        disabled={isSearching}
                        className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                    >
                        {isSearching ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>{isTe ? "కాలక్రమాన్ని లెక్కిస్తోంది..." : "Searching Dasha Timeline..."}</span>
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4" />
                                <span>{isTe ? "భవిష్యత్ అనుకూల కాలాలను వెతకండి" : "Find Future Supportive Periods"}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error Message if search failed */}
            {searchError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{searchError}</span>
                </div>
            )}

            {/* Results Section */}
            {searchResponse && (
                <div className="space-y-4 pt-2">
                    {/* Results Overview Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50/60 dark:bg-slate-800/60 border border-amber-200/60 dark:border-white/10">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-white text-sm">
                                    {isTe
                                        ? `కనుగొనబడిన అనుకూల కాలాలు: ${displayedResults.length}`
                                        : `Found ${displayedResults.length} Qualifying Periods`}
                                </span>
                                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold">
                                    {searchResponse.searchMetadata.depthAbbr} Depth
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 font-mono">
                                {searchResponse.searchMetadata.actualStartFormatted} → {searchResponse.searchMetadata.actualEndFormatted} ({Number(searchResponse.searchMetadata.durationYears).toFixed(1)}y)
                                • {isTe ? `${searchResponse.searchMetadata.totalIntervalsEvaluated} విరామాలు విశ్లేషించబడ్డాయి` : `${searchResponse.searchMetadata.totalIntervalsEvaluated} intervals evaluated`}
                                • {searchResponse.searchMetadata.executionTimeMs}ms
                            </p>
                        </div>

                        {/* View Mode Toggle and Sorting */}
                        <div className="flex items-center gap-2 self-end md:self-auto">
                            <div className="flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('cards')}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        viewMode === 'cards' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                    title={isTe ? "కార్డుల రూపం" : "Card View"}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        viewMode === 'table' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                    title={isTe ? "పట్టిక రూపం" : "Table View"}
                                >
                                    <List className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Sort Selector */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-medium"
                            >
                                <option value="default">{isTe ? "ప్రాధాన్యత ప్రకారం (సిఫార్సు)" : "Recommended (Full matches first)"}</option>
                                <option value="earliest">{isTe ? "ప్రారంభ కాలం ప్రకారం (Earliest)" : "Earliest period first"}</option>
                                <option value="score">{isTe ? "అధిక శాతం ప్రకారం (Highest %)" : "Highest satisfaction %"}</option>
                                <option value="duration">{isTe ? "ఎక్కువ కాలపరిమితి (Longest)" : "Longest qualifying interval"}</option>
                                <option value="coverage">{isTe ? "ఎక్కువ భావాలు (Most houses)" : "Most houses matched"}</option>
                            </select>
                        </div>
                    </div>

                    {/* Cycle Bound Notice if clipped by 120y limit */}
                    {searchResponse.searchMetadata.isCycleBounded && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                            <Info className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                                {isTe
                                    ? `జాతక 120 సంవత్సరాల వింశోత్తరి పరిమితి (${searchResponse.searchMetadata.cycleEndFormatted}) వరకు మాత్రమే గణించబడింది.`
                                    : `Vimshottari 120-year cycle terminates on ${searchResponse.searchMetadata.cycleEndFormatted}. Calculations were bounded to the supported range.`}
                            </span>
                        </div>
                    )}

                    {/* Filter Chips Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-gray-500 text-[11px] font-bold mr-1">{isTe ? "ఫిల్టర్:" : "Filter:"}</span>
                            <button
                                type="button"
                                onClick={() => setFilterMatchType('all')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                    filterMatchType === 'all'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                            >
                                {isTe ? `అన్నీ (${searchResponse.results.length})` : `All (${searchResponse.results.length})`}
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterMatchType('full')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                    filterMatchType === 'full'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                                }`}
                            >
                                {isTe ? `పూర్తి సరిపోలిక (${searchResponse.searchMetadata.fullMatchCount})` : `Full Matches (${searchResponse.searchMetadata.fullMatchCount})`}
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterMatchType('partial')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                    filterMatchType === 'partial'
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                                }`}
                            >
                                {isTe ? `పాక్షిక సరిపోలిక (${searchResponse.searchMetadata.partialMatchCount})` : `Partial Matches (${searchResponse.searchMetadata.partialMatchCount})`}
                            </button>
                        </div>

                        {/* Optional Lord Filters */}
                        <div className="flex items-center gap-2">
                            {uniqueLords.mds.length > 1 && (
                                <select
                                    value={filterMdLord}
                                    onChange={(e) => setFilterMdLord(e.target.value)}
                                    className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300"
                                >
                                    <option value="">{isTe ? "అన్ని మహాదశలు" : "All MD Lords"}</option>
                                    {uniqueLords.mds.map(l => (
                                        <option key={l} value={l}>{isTe ? getLocalizedPlanet(l, 'te') : l}</option>
                                    ))}
                                </select>
                            )}
                            {uniqueLords.ads.length > 1 && (
                                <select
                                    value={filterAdLord}
                                    onChange={(e) => setFilterAdLord(e.target.value)}
                                    className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300"
                                >
                                    <option value="">{isTe ? "అన్ని అంతర్దశలు" : "All AD Lords"}</option>
                                    {uniqueLords.ads.map(l => (
                                        <option key={l} value={l}>{isTe ? getLocalizedPlanet(l, 'te') : l}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Empty Candidate Results Handler */}
                    {displayedResults.length === 0 ? (
                        <div className="p-8 rounded-3xl bg-gray-50/80 dark:bg-slate-800/40 border border-dashed border-gray-200 dark:border-white/10 text-center space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
                                <Search className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                                    {isTe
                                        ? "ఎంచుకున్న కాలపరిమితిలో ప్రస్తుత ప్రమాణాలకు అనుకూలమైన దశా కాలాలు కనుగొనబడలేదు."
                                        : "No qualifying periods were found within the selected date range using the current evaluation criteria."}
                                </h4>
                                <p className="text-xs text-gray-500 max-w-md mx-auto">
                                    {isTe
                                        ? "కింది ప్రత్యామ్నాయాలను ప్రయత్నించడం ద్వారా మీరు మరింత లోతైన ఫలితాలను కనుగొనవచ్చు:"
                                        : "You can discover additional opportunities by expanding your parameters:"}
                                </p>
                            </div>

                            {/* Helpful Action Suggestions */}
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        handlePresetChange('10y');
                                        setTimeout(handleRunSearch, 50);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-all cursor-pointer"
                                >
                                    {isTe ? "శోధనను 10 సంవత్సరాలకు విస్తరించండి" : "Expand search duration to 10 years"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEvaluationDepth(2);
                                        setTimeout(handleRunSearch, 50);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all cursor-pointer"
                                >
                                    {isTe ? "దశా స్థాయిని అంతర్దశకు మార్చండి (Depth 2)" : "Reduce evaluation depth to Antardasha"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMatchCriteria(MATCH_CRITERIA_OPTIONS.THRESHOLD);
                                        setMinCoverageThreshold(50);
                                        setFilterMatchType('all');
                                        setTimeout(handleRunSearch, 50);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all cursor-pointer"
                                >
                                    {isTe ? "పాక్షిక సరిపోలికలను అనుమతించండి (>= 50%)" : "Show partial matches (>= 50%)"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Results Display: Cards or Table */
                        viewMode === 'cards' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {displayedResults.map((candidate) => (
                                    <div
                                        key={candidate.id}
                                        className={`p-5 rounded-3xl border transition-all space-y-3.5 shadow-xs hover:shadow-md ${
                                            candidate.isFullMatch
                                                ? 'bg-gradient-to-br from-white via-emerald-50/20 to-white dark:from-slate-900 dark:via-emerald-950/10 dark:to-slate-900 border-emerald-300/80 dark:border-emerald-800/60'
                                                : candidate.status === 'afflicted'
                                                ? 'bg-gradient-to-br from-white via-rose-50/20 to-white dark:from-slate-900 dark:via-rose-950/10 dark:to-slate-900 border-rose-200 dark:border-rose-900/40'
                                                : 'bg-white dark:bg-slate-900 border-amber-200/70 dark:border-white/10'
                                        }`}
                                    >
                                        {/* Period Header */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2 font-mono font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                                                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                                                    <span>{candidate.startDateOnly} — {candidate.endDateOnly}</span>
                                                </div>
                                                <div className="text-[11px] text-gray-500 font-mono flex items-center gap-2">
                                                    <span>{candidate.durationHuman}</span>
                                                    {candidate.isClipped && (
                                                        <span className="text-amber-600 dark:text-amber-400 font-sans" title={`Full unclipped period: ${candidate.originalStartFormatted} to ${candidate.originalEndFormatted}`}>
                                                            • {isTe ? "(పరిధికి సరిచేయబడింది)" : "(Clipped to range)"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Status Badge & Percentage */}
                                            <div className="text-right">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    candidate.isFullMatch
                                                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                                                        : candidate.status === 'partially-satisfied'
                                                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                                                        : candidate.status === 'afflicted'
                                                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200'
                                                        : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {candidate.isFullMatch && (isTe ? "పూర్తి సరిపోలిక (Full Match)" : "Full Match")}
                                                    {!candidate.isFullMatch && candidate.status === 'partially-satisfied' && (isTe ? "పాక్షికం (Partial)" : "Partial Match")}
                                                    {!candidate.isFullMatch && candidate.status === 'afflicted' && (isTe ? "అవరోధం (Afflicted)" : "Afflicted")}
                                                    {!candidate.isFullMatch && candidate.status === 'not-satisfied' && (isTe ? "సరిపోలలేదు" : "Not Satisfied")}
                                                </span>
                                                <span className="text-xs font-mono font-bold block mt-0.5 text-gray-900 dark:text-white">
                                                    {candidate.coveragePercent}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Dasha Hierarchy Path */}
                                        <div className="p-2.5 rounded-2xl bg-gray-50/80 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5 flex flex-wrap items-center gap-2 text-xs">
                                            {candidate.lords.map((l, lIdx) => (
                                                <React.Fragment key={l.id || lIdx}>
                                                    {lIdx > 0 && <span className="text-gray-400 font-bold">→</span>}
                                                    <div className="flex items-center gap-1 font-bold">
                                                        <span className="text-sm">{PLANET_ICONS[l.planet] || '🪐'}</span>
                                                        <span className="text-gray-900 dark:text-white">
                                                            {isTe ? getLocalizedPlanet(l.planet, 'te') : l.planet}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-gray-400">
                                                            ({l.level})
                                                        </span>
                                                    </div>
                                                </React.Fragment>
                                            ))}
                                        </div>

                                        {/* House Coverage Summary */}
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-gray-500 font-mono">
                                                    {isTe ? "కవర్ అయిన భావాలు:" : "Covered Houses:"}
                                                </span>
                                                <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
                                                    {candidate.matchedCount} / {candidate.totalRequiredCount}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1">
                                                {candidate.requiredHouses.map(h => {
                                                    const isCovered = candidate.coveredHouses.includes(h);
                                                    return (
                                                        <span
                                                            key={h}
                                                            className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs flex items-center gap-1 ${
                                                                isCovered
                                                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                                                    : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                                                            }`}
                                                        >
                                                            <span>H{h}</span>
                                                            {isCovered ? (
                                                                <Check className="w-3 h-3 text-emerald-600" />
                                                            ) : (
                                                                <X className="w-3 h-3 text-rose-500" />
                                                            )}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Obstruction warning if afflicted */}
                                        {candidate.hasObstruction && (
                                            <div className="p-2 rounded-xl bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-300 text-[11px] flex items-center gap-1.5 font-sans">
                                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                                <span className="truncate">
                                                    {candidate.obstructionReasons?.[0] || 'Negative house obstruction detected'}
                                                </span>
                                            </div>
                                        )}

                                        {/* Actions Bar */}
                                        <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedCandidateForDetails(candidate)}
                                                className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                title={isTe ? "పూర్తి వివరాలు చూడండి" : "View complete calculation details"}
                                            >
                                                <Eye className="w-3.5 h-3.5 text-gray-500" />
                                                <span>{isTe ? "వివరాలు" : "View Details"}</span>
                                            </button>

                                            <div className="flex items-center gap-1.5">
                                                {onViewDasha && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onViewDasha(candidate.startDate, candidate.lords)}
                                                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                        title={isTe ? "వింశోత్తరి దశా చక్రంలో చూడండి" : "Open in Vimshottari Dasha view"}
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                        <span>{isTe ? "దశలో చూడు" : "Dasha View"}</span>
                                                    </button>
                                                )}

                                                {onEvaluatePeriod && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onEvaluatePeriod(candidate)}
                                                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                                                        title={isTe ? "ఈ కాలాన్ని ప్రస్తుత మూల్యాంకనంలో లోడ్ చేయండి" : "Evaluate this period in Event Analysis"}
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        <span>{isTe ? "పరిశీలించు" : "Evaluate"}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Responsive Table View */
                            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-slate-800 text-gray-500 font-mono uppercase tracking-wider text-[11px] border-b border-gray-200 dark:border-white/10">
                                            <th className="py-3 px-3.5">{isTe ? "కాల వ్యవధి" : "Period & Dates"}</th>
                                            <th className="py-3 px-3.5">{isTe ? "దశా మార్గం" : "Dasha Hierarchy"}</th>
                                            <th className="py-3 px-3.5 text-center">{isTe ? "భావ కవరేజ్" : "House Coverage"}</th>
                                            <th className="py-3 px-3.5 text-center">{isTe ? "ఫలిత స్థితి" : "Result Status"}</th>
                                            <th className="py-3 px-3.5 text-right">{isTe ? "చర్యలు" : "Actions"}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-sans bg-white dark:bg-slate-900">
                                        {displayedResults.map((candidate) => (
                                            <tr key={candidate.id} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="py-3 px-3.5">
                                                    <div className="font-bold text-gray-900 dark:text-white font-mono">
                                                        {candidate.startDateOnly} — {candidate.endDateOnly}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-mono">
                                                        {candidate.durationHuman}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3.5 font-mono text-[11px]">
                                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                                        {candidate.hierarchyPath}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3.5 text-center">
                                                    <div className="inline-flex items-center gap-1 font-mono font-bold">
                                                        <span className="text-gray-900 dark:text-white">{candidate.coveredHouses.join(', ') || 'None'}</span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-mono block">
                                                        {candidate.coveragePercent}% ({candidate.matchedCount}/{candidate.totalRequiredCount})
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3.5 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        candidate.isFullMatch
                                                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                                                            : candidate.status === 'partially-satisfied'
                                                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                                                            : candidate.status === 'afflicted'
                                                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200'
                                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        {candidate.isFullMatch ? (isTe ? "పూర్తి" : "Full Match") : candidate.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3.5 text-right">
                                                    <div className="inline-flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedCandidateForDetails(candidate)}
                                                            className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-[11px] font-bold transition-all cursor-pointer"
                                                        >
                                                            {isTe ? "వివరాలు" : "Details"}
                                                        </button>
                                                        {onEvaluatePeriod && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onEvaluatePeriod(candidate)}
                                                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-all cursor-pointer"
                                                            >
                                                                {isTe ? "పరిశీలించు" : "Evaluate"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>
            )}

            {/* Candidate Details Modal */}
            <AnimatePresence>
                {selectedCandidateForDetails && (
                    <div
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
                        onClick={() => setSelectedCandidateForDetails(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-850 dark:to-slate-900">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-serif font-black text-lg text-gray-900 dark:text-white">
                                            {isTe ? "దశా కాల విశ్లేషణ సమగ్ర వివరాలు" : "Candidate Period Details"}
                                        </h4>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            selectedCandidateForDetails.isFullMatch
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {selectedCandidateForDetails.coveragePercent}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-mono">
                                        {selectedCandidateForDetails.hierarchyPath}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCandidateForDetails(null)}
                                    className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 overflow-y-auto space-y-4 text-xs">
                                {/* Exact Timestamps & Duration */}
                                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-white/5 space-y-1 font-mono">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">{isTe ? "ప్రారంభ కాలం:" : "Start Date & Time:"}</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{selectedCandidateForDetails.startFormatted}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">{isTe ? "ముగింపు కాలం:" : "End Date & Time:"}</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{selectedCandidateForDetails.endFormatted}</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-white/5">
                                        <span className="text-gray-500">{isTe ? "వ్యవధి (Duration):" : "Interval Duration:"}</span>
                                        <span className="font-bold text-amber-600">{selectedCandidateForDetails.durationHuman}</span>
                                    </div>
                                    {selectedCandidateForDetails.isClipped && (
                                        <div className="pt-1 text-[11px] text-amber-600 dark:text-amber-400">
                                            {isTe
                                                ? `* పూర్తి అన్‌క్లిప్డ్ దశా కాలం: ${selectedCandidateForDetails.originalStartFormatted} నుండి ${selectedCandidateForDetails.originalEndFormatted}`
                                                : `* Note: This period was clipped to match your search window. The full dasha runs from ${selectedCandidateForDetails.originalStartFormatted} to ${selectedCandidateForDetails.originalEndFormatted}.`}
                                        </div>
                                    )}
                                </div>

                                {/* Lords Individual Significations */}
                                <div className="space-y-2">
                                    <h5 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">
                                        {isTe ? "దశా నాథుల కారకత్వాలు (Lords Significations):" : "Lords House Significations:"}
                                    </h5>
                                    <div className="space-y-2">
                                        {selectedCandidateForDetails.runningLordsDetails.map((lord, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-white/5 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base">{PLANET_ICONS[lord.planet] || '🪐'}</span>
                                                    <div>
                                                        <span className="font-bold text-gray-900 dark:text-white">
                                                            {isTe ? getLocalizedPlanet(lord.planet, 'te') : lord.planet}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 block font-mono">
                                                            {lord.level} ({lord.periodName})
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="text-right font-mono">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold block">
                                                        Matched: H{lord.matchedDBAHouses.join(', ') || 'None'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        All: H{lord.signifiedHouses.join(', ')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Joint Coverage Chips */}
                                <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-slate-800/60 border border-amber-200/60 dark:border-white/5 space-y-2">
                                    <span className="font-bold text-gray-900 dark:text-white text-[11px] block">
                                        {isTe ? "సమిష్టి కవరేజ్ స్థితి (Joint DBA Coverage):" : "Joint DBA Coverage Breakdown:"}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {selectedCandidateForDetails.requiredHouses.map(h => {
                                            const isCovered = selectedCandidateForDetails.coveredHouses.includes(h);
                                            return (
                                                <span
                                                    key={h}
                                                    className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs flex items-center gap-1 ${
                                                        isCovered
                                                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300'
                                                            : 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border border-rose-300'
                                                    }`}
                                                >
                                                    <span>House {h}</span>
                                                    {isCovered ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-rose-600" />}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-slate-900 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCandidateForDetails(null)}
                                    className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold text-xs cursor-pointer"
                                >
                                    {isTe ? "మూసివేయి" : "Close"}
                                </button>

                                <div className="flex items-center gap-2">
                                    {onViewDasha && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const candidate = selectedCandidateForDetails;
                                                setSelectedCandidateForDetails(null);
                                                onViewDasha(candidate.startDate, candidate.lords);
                                            }}
                                            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>{isTe ? "దశలో చూడు" : "Open in Dasha View"}</span>
                                        </button>
                                    )}

                                    {onEvaluatePeriod && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const candidate = selectedCandidateForDetails;
                                                setSelectedCandidateForDetails(null);
                                                onEvaluatePeriod(candidate);
                                            }}
                                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>{isTe ? "ఈ కాలాన్ని పరిశీలించు" : "Evaluate This Period"}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FutureEventTimingFinder;
