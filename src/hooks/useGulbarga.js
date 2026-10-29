/**
 * React Hook for Gulbarga Theory (TSP & Classic Gulbarga)
 *
 * Manages method state, number selection, DRPE snapshot, Ruling Planets,
 * evaluation, settings persistence, and history.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
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
    clearGulbargaHistory,
    calculateGulbargaAccuracy
} from '../kp/gulbarga/history.js';

const METHOD_STORAGE_KEY = 'kp_gulbarga_method';
const TSP_SETTINGS_KEY = 'kp_gulbarga_tsp_settings';
const CLASSIC_SETTINGS_KEY = 'kp_gulbarga_classic_settings';

export function useGulbarga() {
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
        setTspSettings(prev => {
            const next = { ...prev, ...updates };
            try {
                localStorage.setItem(TSP_SETTINGS_KEY, JSON.stringify(next));
            } catch (_) {}
            return next;
        });
    }, []);

    const updateClassicSettings = useCallback((updates) => {
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
        // Ensure current number is valid in new system or clamp (only if a number is already set)
        const table = getHoraryTable(newSys);
        setNumberRaw(prev => {
            if (prev == null) return null;
            const num = Number(prev);
            if (!Number.isInteger(num) || num < 1 || num > table.length) {
                setNumberInput('1');
                return 1;
            }
            return num;
        });
    }, []);

    // 4. Number selection & validation (Blank by default; user can type or click dice)
    const [numberRaw, setNumberRaw] = useState(null);
    const [numberInput, setNumberInput] = useState('');
    const [numberError, setNumberError] = useState(null);

    const reduceOptionActive = (method === 'classic')
        ? classicSettings.reduceLargeNumbers
        : tspSettings.reduceLargeNumbers;

    const handleNumberChange = useCallback((val) => {
        setNumberInput(val);
        if (val === '' || val === null || String(val).trim() === '') {
            setNumberRaw(null);
            setNumberError(null);
            return;
        }
        const check = validateHoraryNumber(val, effectiveSystem, reduceOptionActive, true);
        if (check.valid) {
            setNumberRaw(check.value);
            setNumberError(null);
        } else {
            setNumberError(check.error || 'Invalid number');
        }
    }, [effectiveSystem, reduceOptionActive]);

    const handleClearNumber = useCallback(() => {
        setNumberInput('');
        setNumberRaw(null);
        setNumberError(null);
    }, []);

    const randomizeNumber = useCallback(() => {
        const table = getHoraryTable(effectiveSystem);
        const rand = randomInRange(table.length);
        setNumberRaw(rand);
        setNumberInput(String(rand));
        setNumberError(null);
    }, [effectiveSystem]);

    // 5. Question text & Judgment Instant
    const [question, setQuestion] = useState('');
    const [judgedAt, setJudgedAt] = useState(() => new Date());
    const [isFrozen, setIsFrozen] = useState(false);

    // Location for Judgment Moment
    const [location, setLocation] = useState({
        name: 'Hyderabad',
        displayName: 'Hyderabad, Telangana, India',
        lat: 17.3850,
        lon: 78.4867,
        timezone: 'Asia/Kolkata',
        tzLabel: 'IST (UTC+05:30)'
    });

    const setNowAsJudgmentTime = useCallback(() => {
        const now = new Date();
        setJudgedAt(now);
        setIsFrozen(true);
    }, []);

    const freezeJudgmentInstant = useCallback(() => {
        setIsFrozen(true);
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

        return getAdaptedRulingPlanets({
            date: localDate,
            time: localTime,
            lat: Number(location?.lat) || 17.3850,
            lon: Number(location?.lon) || 78.4867,
            timezone: location?.timezone || 'Asia/Kolkata'
        });
    }, [method, judgedAt, location]);

    // 8. Horary Number Entry Details (Classic falls back to Time Chart Lagna when seed is
    //    omitted; TSP requires a seed)
    const numberEntry = useMemo(() => {
        if (numberRaw != null && Number.isInteger(Number(numberRaw)) && Number(numberRaw) >= 1) {
            try {
                return getHoraryEntry(effectiveSystem, Number(numberRaw));
            } catch {
                return null;
            }
        }

        // If no seed number provided (Classic only): use Time Chart (Lagna at Judgment Instant)
        if (method === 'classic' && rulingPlanets && rulingPlanets.lagna) {
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
    }, [method, effectiveSystem, numberRaw, rulingPlanets]);

    // 9. Pure Evaluation Result (TSP or Classic)
    const result = useMemo(() => {
        if (!numberEntry) return null;

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
    }, [method, numberEntry, snapshot, tspSettings, rulingPlanets, classicSettings]);

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
    }, [result, numberEntry, question, method, effectiveSystem, numberRaw]);

    // Record on the render after a request, so a place resolved during "Get Answer"
    // is already applied to the result being saved
    const [recordRequested, setRecordRequested] = useState(false);
    const requestRecordJudgment = useCallback(() => setRecordRequested(true), []);

    useEffect(() => {
        if (!recordRequested) return;
        recordCurrentJudgment();
        setRecordRequested(false);
    }, [recordRequested, recordCurrentJudgment]);

    const handleUpdateOutcome = useCallback((id, outcome) => {
        const updated = updateGulbargaOutcome(id, outcome);
        setHistory(updated);
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
        numberEntry,
        question,
        judgedAt,
        location,
        snapshot,
        rulingPlanets,
        result,
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
        freezeJudgmentInstant,
        updateTspSettings,
        updateClassicSettings,
        recordCurrentJudgment,
        requestRecordJudgment,
        handleUpdateOutcome,
        handleClearHistory
    };
}
