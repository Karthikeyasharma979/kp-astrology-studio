/**
 * React Hook for Gulbarga Theory (TSP & Classic Gulbarga)
 *
 * Manages method state, number selection, DRPE snapshot, Ruling Planets,
 * evaluation, settings persistence, and history.
 *
 * The answer is only revealed after "Get Answer". Changing any input that affects
 * the judgment (method, system, seed, time, place, settings) clears the shown answer,
 * so the visible result always matches the history entry recorded for it.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { getHoraryEntry, getHoraryTable } from '../kp/horaryTable.js';
import { randomInRange, validateHoraryNumber } from '../kp/random.js';
import { DEFAULT_TSP_SETTINGS, DEFAULT_CLASSIC_SETTINGS } from '../kp/gulbarga/types.js';
import { evaluateTsp } from '../kp/gulbarga/evaluateTsp.js';
import { evaluateClassicGulbarga } from '../kp/gulbarga/evaluateClassic.js';
import { snapshotDateFor, getSnapshot } from '../kp/gulbarga/drpeSnapshot.js';
import { getAdaptedRulingPlanets } from '../kp/gulbarga/rpAdapter.js';
import { formatDMS } from '../utils/nakshatraUtils.js';
import {
    loadGulbargaHistory,
    addGulbargaHistoryItem,
    updateGulbargaOutcome,
    deleteGulbargaHistoryItem,
    clearGulbargaHistory,
    calculateGulbargaAccuracy
} from '../kp/gulbarga/history.js';

const METHOD_STORAGE_KEY = 'kp_gulbarga_method';
const TSP_SETTINGS_KEY = 'kp_gulbarga_tsp_settings';
const CLASSIC_SETTINGS_KEY = 'kp_gulbarga_classic_settings';

// While the judgment time is "live", refresh it so the shown time and RPs stay current
const LIVE_CLOCK_INTERVAL_MS = 30 * 1000;

const DEFAULT_LAT = 17.3850;
const DEFAULT_LON = 78.4867;

export function useGulbarga() {
    // 0. Whether the current inputs have been submitted with "Get Answer"
    const [answered, setAnswered] = useState(false);
    const clearAnswer = useCallback(() => setAnswered(false), []);

    // 1. Method Switch ('tsp' | 'classic')
    const [method, setMethodState] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(METHOD_STORAGE_KEY);
                if (saved === 'classic' || saved === 'tsp') return saved;
            } catch (_) {}
        }
        return 'tsp';
    });

    const setMethod = useCallback((newMethod) => {
        setMethodState(newMethod);
        setAnswered(false);
        try {
            localStorage.setItem(METHOD_STORAGE_KEY, newMethod);
        } catch (_) {}
    }, []);

    // 2. Settings with persistence
    const [tspSettings, setTspSettings] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(TSP_SETTINGS_KEY);
                if (saved) return { ...DEFAULT_TSP_SETTINGS, ...JSON.parse(saved) };
            } catch (_) {}
        }
        return { ...DEFAULT_TSP_SETTINGS };
    });

    const [classicSettings, setClassicSettings] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(CLASSIC_SETTINGS_KEY);
                if (saved) return { ...DEFAULT_CLASSIC_SETTINGS, ...JSON.parse(saved) };
            } catch (_) {}
        }
        return { ...DEFAULT_CLASSIC_SETTINGS };
    });

    const updateTspSettings = useCallback((updates) => {
        setAnswered(false);
        setTspSettings(prev => {
            const next = { ...prev, ...updates };
            try {
                localStorage.setItem(TSP_SETTINGS_KEY, JSON.stringify(next));
            } catch (_) {}
            return next;
        });
    }, []);

    const updateClassicSettings = useCallback((updates) => {
        setAnswered(false);
        setClassicSettings(prev => {
            const next = { ...prev, ...updates };
            try {
                localStorage.setItem(CLASSIC_SETTINGS_KEY, JSON.stringify(next));
            } catch (_) {}
            return next;
        });
    }, []);

    // 3. System selection (TSP allows 1-9, 1-27, 1-249, 1-2193; Classic is fixed to 1-249)
    const [system, setSystemState] = useState('1-249');

    const effectiveSystem = (method === 'classic') ? '1-249' : system;

    const setSystem = useCallback((newSys) => {
        setSystemState(newSys);
        setAnswered(false);
    }, []);

    // 4. Number selection. The typed text is the source of truth; its value and error are
    //    re-derived whenever the system, method or reduce option changes.
    const [numberInput, setNumberInput] = useState('');

    const reduceOptionActive = (method === 'classic')
        ? classicSettings.reduceLargeNumbers
        : tspSettings.reduceLargeNumbers;

    const numberCheck = useMemo(() => {
        if (String(numberInput ?? '').trim() === '') {
            return { value: null, error: null, reducedFrom: null };
        }
        const check = validateHoraryNumber(numberInput, effectiveSystem, reduceOptionActive, true);
        if (!check.valid) {
            return { value: null, error: check.error || 'Invalid number', reducedFrom: null };
        }
        return { value: check.value, error: null, reducedFrom: check.reduced ? check.originalValue : null };
    }, [numberInput, effectiveSystem, reduceOptionActive]);

    const numberRaw = numberCheck.value;
    const numberError = numberCheck.error;

    const handleNumberChange = useCallback((val) => {
        setNumberInput(val == null ? '' : String(val));
        setAnswered(false);
    }, []);

    const handleClearNumber = useCallback(() => handleNumberChange(''), [handleNumberChange]);

    const randomizeNumber = useCallback(() => {
        const table = getHoraryTable(effectiveSystem);
        handleNumberChange(String(randomInRange(table.length)));
    }, [effectiveSystem, handleNumberChange]);

    // 5. Question text & Judgment Instant
    const [question, setQuestion] = useState('');
    const [judgedAt, setJudgedAtState] = useState(() => new Date());
    // 'live' follows the clock (and is stamped to the exact instant on "Get Answer");
    // 'manual' keeps a time the user picked, or the instant of the last answer
    const [timeMode, setTimeMode] = useState('live');

    useEffect(() => {
        if (timeMode !== 'live') return undefined;
        const id = setInterval(() => setJudgedAtState(new Date()), LIVE_CLOCK_INTERVAL_MS);
        return () => clearInterval(id);
    }, [timeMode]);

    // An answer judged on the live clock freezes the time while it is shown; once a new
    // question starts (answer cleared), go back to the live clock
    const resumeLiveAfterAnswerRef = useRef(false);

    useEffect(() => {
        if (answered || !resumeLiveAfterAnswerRef.current) return;
        resumeLiveAfterAnswerRef.current = false;
        setJudgedAtState(new Date());
        setTimeMode('live');
    }, [answered]);

    const setJudgedAt = useCallback((date) => {
        resumeLiveAfterAnswerRef.current = false;
        setJudgedAtState(date);
        setTimeMode('manual');
        setAnswered(false);
    }, []);

    const setNowAsJudgmentTime = useCallback(() => {
        setJudgedAtState(new Date());
        setTimeMode('live');
        setAnswered(false);
    }, []);

    // Location for Judgment Moment
    const [location, setLocationState] = useState({
        name: 'Hyderabad',
        displayName: 'Hyderabad, Telangana, India',
        lat: DEFAULT_LAT,
        lon: DEFAULT_LON,
        timezone: 'Asia/Kolkata',
        tzLabel: 'IST (UTC+05:30)'
    });

    const setLocation = useCallback((loc) => {
        setLocationState(loc);
        setAnswered(false);
    }, []);

    // 6. DRPE Planet Snapshot (Keyed strictly by snapshot date; cached and memoized)
    const snapshotDate = useMemo(() => {
        return snapshotDateFor(judgedAt);
    }, [judgedAt]);

    const snapshot = useMemo(() => {
        return getSnapshot(snapshotDate);
    }, [snapshotDate]);

    // 7. Instantaneous Ruling Planets & Lagna at Judgment Moment & Location (Classic only;
    //    TSP is location-independent and works purely from the DRPE snapshot)
    const rulingPlanets = useMemo(() => {
        if (method !== 'classic') return null;

        // Extract local date and time in the location timezone
        const d = (judgedAt instanceof Date) ? judgedAt : new Date(judgedAt);

        // Formatter for timezone date components
        const dtFormat = new Intl.DateTimeFormat('en-CA', {
            timeZone: location.timezone || 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23'
        });

        const parts = dtFormat.formatToParts(d);
        const getPart = (type) => parts.find(p => p.type === type)?.value || '';

        const localDate = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
        const localTime = `${getPart('hour')}:${getPart('minute')}`;

        // 0° latitude / longitude are valid places, so only fall back when not a number
        const lat = Number(location?.lat);
        const lon = Number(location?.lon);

        return getAdaptedRulingPlanets({
            date: localDate,
            time: localTime,
            lat: Number.isFinite(lat) ? lat : DEFAULT_LAT,
            lon: Number.isFinite(lon) ? lon : DEFAULT_LON,
            timezone: location?.timezone || 'Asia/Kolkata'
        });
    }, [method, judgedAt, location]);

    // 8. Horary Number Entry Details (Classic falls back to Time Chart Lagna when seed is
    //    omitted; TSP requires a seed)
    const numberEntry = useMemo(() => {
        if (numberRaw != null) {
            try {
                return getHoraryEntry(effectiveSystem, numberRaw);
            } catch {
                return null;
            }
        }

        // If no seed number provided (Classic only): use Time Chart (Lagna at Judgment Instant)
        if (method === 'classic' && !numberError && rulingPlanets && rulingPlanets.lagna) {
            const lagna = rulingPlanets.lagna;
            const signName = lagna.sign?.en || lagna.sign || '';
            return {
                isTimeChart: true,
                no: null,
                sign: signName,
                signLord: lagna.signLord,
                starLord: lagna.starLord,
                subLord: lagna.subLord,
                subSubLord: lagna.subSubLord || lagna.subLord,
                startDMS: `${signName} ${Number.isFinite(lagna.degreeInSign) ? formatDMS(lagna.degreeInSign) : ''}`.trim(),
                endDMS: 'Time Chart Lagna',
                label: 'Time Chart Lagna'
            };
        }

        return null;
    }, [method, effectiveSystem, numberRaw, numberError, rulingPlanets]);

    const canAnswer = Boolean(numberEntry) && !numberError;

    // 9. Pure Evaluation Result (TSP or Classic) - only once the user asked for it
    const result = useMemo(() => {
        if (!answered || !numberEntry) return null;

        if (method === 'tsp') {
            if (!snapshot || !snapshot.moonLords || !snapshot.planets) return null;

            const ascLords = {
                sign: numberEntry.signLord,
                signName: numberEntry.sign,
                star: numberEntry.starLord,
                starLord: numberEntry.starLord,
                sub: numberEntry.subLord,
                subLord: numberEntry.subLord,
                subSub: numberEntry.subSubLord,
                subSubLord: numberEntry.subSubLord
            };

            return evaluateTsp(
                ascLords,
                snapshot.moonLords,
                snapshot.planets,
                tspSettings
            );
        } else {
            // Classic Gulbarga
            if (!rulingPlanets) return null;

            return evaluateClassicGulbarga(
                numberEntry,
                rulingPlanets,
                classicSettings,
                snapshot?.planets || {}
            );
        }
    }, [answered, method, numberEntry, snapshot, tspSettings, rulingPlanets, classicSettings]);

    // 10. History Tracking
    const [history, setHistory] = useState(() => loadGulbargaHistory());

    const recordCurrentJudgment = useCallback(() => {
        if (!result || !numberEntry) return;

        const numberLabel = numberEntry.isTimeChart
            ? 'Time Chart Lagna'
            : `#${numberRaw}/${effectiveSystem.replace('1-', '')}`;

        const item = {
            question: question.trim() || 'General Query',
            method,
            system: effectiveSystem,
            number: numberRaw || null,
            numberLabel,
            judgedAt: (judgedAt instanceof Date ? judgedAt : new Date(judgedAt)).toISOString(),
            ascLords: {
                sign: numberEntry.sign,
                signLord: numberEntry.signLord,
                star: numberEntry.starLord,
                sub: numberEntry.subLord,
                subSub: numberEntry.subSubLord
            },
            answer: result.answer,
            decidedBy: result.decidedBy,
            rulesSatisfied: result.rulesSatisfied,
            punarphoo: Boolean(result.punarphoo?.applied),
            outcome: 'Pending'
        };

        const updated = addGulbargaHistoryItem(item);
        setHistory(updated);
    }, [result, numberEntry, question, method, effectiveSystem, numberRaw, judgedAt]);

    // Record on the render after a request, so a place resolved during "Get Answer"
    // is already applied to the result being saved
    const [recordRequested, setRecordRequested] = useState(false);

    useEffect(() => {
        if (!recordRequested || !result) return;
        recordCurrentJudgment();
        setRecordRequested(false);
    }, [recordRequested, result, recordCurrentJudgment]);

    /**
     * Submits the current inputs: stamps a live judgment time to this exact instant,
     * reveals the answer and records it once in history.
     */
    const submitJudgment = useCallback(() => {
        if (answered) return;
        resumeLiveAfterAnswerRef.current = (timeMode === 'live');
        if (timeMode === 'live') {
            setJudgedAtState(new Date());
        }
        // Keep the judgment instant fixed while its answer is on screen
        setTimeMode('manual');
        setAnswered(true);
        setRecordRequested(true);
    }, [answered, timeMode]);

    const handleUpdateOutcome = useCallback((id, outcome) => {
        const updated = updateGulbargaOutcome(id, outcome);
        setHistory(updated);
    }, []);

    const handleDeleteHistoryItem = useCallback((id) => {
        setHistory(deleteGulbargaHistoryItem(id));
    }, []);

    const handleClearHistory = useCallback(() => {
        clearGulbargaHistory();
        setHistory([]);
    }, []);

    const accuracyStats = useMemo(() => {
        return calculateGulbargaAccuracy(history);
    }, [history]);

    return {
        // State
        method,
        system: effectiveSystem,
        number: numberRaw,
        numberInput,
        numberError,
        numberReducedFrom: numberCheck.reducedFrom,
        numberEntry,
        question,
        judgedAt,
        timeMode,
        location,
        snapshot,
        rulingPlanets,
        result,
        answered,
        canAnswer,
        history,
        accuracyStats,
        tspSettings,
        classicSettings,

        // Actions
        setMethod,
        setSystem,
        handleNumberChange,
        handleClearNumber,
        randomizeNumber,
        setQuestion,
        setJudgedAt,
        setLocation,
        setNowAsJudgmentTime,
        updateTspSettings,
        updateClassicSettings,
        submitJudgment,
        clearAnswer,
        handleUpdateOutcome,
        handleDeleteHistoryItem,
        handleClearHistory
    };
}
