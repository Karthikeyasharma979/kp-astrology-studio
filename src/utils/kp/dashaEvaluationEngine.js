/**
 * Authoritative Flexible Dasha Selection & Date-Based Event Evaluation Engine
 * For AstroSharma KP Kundli Studio
 *
 * Implements:
 * 1. Historical & Future 5-level Vimshottari Dasha resolution from any evaluation date.
 * 2. Strict timeline bounds validation (birthMs to 120-year cycle termination).
 * 3. Dynamic subperiod extraction (MD -> AD -> PD -> SD -> Prana) using recursive subdivisions.
 * 4. Hierarchical parent-child integrity validation with auto-correction of mismatched children.
 * 5. Event house evaluation (evaluateJointDBA) across custom dates and manual selections.
 * 6. Period comparison management.
 */

import {
    calculateVimshottariDasha,
    getActivePeriods,
    subdivideDashaPeriod,
    formatSubperiodDuration,
    formatDashaDuration,
    DASHA_LEVELS,
    MS_PER_YEAR
} from './vimshottariDasha.js';
import { evaluateJointDBA } from './kpHouseGroupingEngine.js';

/**
 * Parses any date representation into a normalized Date object.
 * When given a 'YYYY-MM-DD' calendar date string, normalizes to local midday (12:00:00)
 * to avoid ambiguous midnight UTC offsets shifting the astrological day.
 *
 * @param {Date|string|number} dateInput
 * @returns {Date} Normalized Date instance
 */
export function parseEvaluationDate(dateInput) {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date) {
        return isNaN(dateInput.getTime()) ? new Date() : new Date(dateInput.getTime());
    }
    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        // Check for YYYY-MM-DD
        const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
        if (dateMatch) {
            const year = parseInt(dateMatch[1], 10);
            const month = parseInt(dateMatch[2], 10) - 1;
            const day = parseInt(dateMatch[3], 10);
            return new Date(year, month, day, 12, 0, 0, 0);
        }
    }
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Formats a Date object to 'YYYY-MM-DD' string for HTML date inputs.
 *
 * @param {Date|string|number} date
 * @returns {string} 'YYYY-MM-DD'
 */
export function formatDateForPicker(date) {
    const d = parseEvaluationDate(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * High-resolution human readable date/time formatter.
 *
 * @param {Date|string|number} date
 * @param {boolean} [isTe=false]
 * @returns {string} Formatted string, e.g. "10 Jan 2027, 18:04"
 */
export function formatEvaluationDateTime(date, isTe = false) {
    if (!date) return '';
    try {
        const d = parseEvaluationDate(date);
        if (isNaN(d.getTime())) return String(date);
        const day = d.getDate();
        const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthsTe = ['జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్', 'జూలై', 'ఆగస్టు', 'సెప్టెంబరు', 'అక్టోబరు', 'నవంబరు', 'డిసెంబరు'];
        const monthStr = isTe ? monthsTe[d.getMonth()] : monthsEn[d.getMonth()];
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day} ${monthStr} ${year}, ${hours}:${mins}`;
    } catch {
        return String(date);
    }
}

/**
 * Formats date only (without time).
 *
 * @param {Date|string|number} date
 * @param {boolean} [isTe=false]
 * @returns {string} e.g. "10 Jan 2027"
 */
export function formatEvaluationDateOnly(date, isTe = false) {
    if (!date) return '';
    try {
        const d = parseEvaluationDate(date);
        if (isNaN(d.getTime())) return String(date);
        const day = d.getDate();
        const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthsTe = ['జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్', 'జూలై', 'ఆగస్టు', 'సెప్టెంబరు', 'అక్టోబరు', 'నవంబరు', 'డిసెంబరు'];
        const monthStr = isTe ? monthsTe[d.getMonth()] : monthsEn[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${monthStr} ${year}`;
    } catch {
        return String(date);
    }
}

/**
 * Dynamically computes quick date presets relative to a base date.
 *
 * @param {string} presetKey - 'today' | '+3m' | '+6m' | '+1y' | '+2y'
 * @param {Date|string|number} [baseDate=new Date()]
 * @returns {Date} Target date
 */
export function calculateDatePreset(presetKey, baseDate = new Date()) {
    const d = parseEvaluationDate(baseDate);
    switch (presetKey) {
        case 'today':
            return new Date();
        case '+3m': {
            const res = new Date(d);
            res.setMonth(res.getMonth() + 3);
            return res;
        }
        case '+6m': {
            const res = new Date(d);
            res.setMonth(res.getMonth() + 6);
            return res;
        }
        case '+1y': {
            const res = new Date(d);
            res.setFullYear(res.getFullYear() + 1);
            return res;
        }
        case '+2y': {
            const res = new Date(d);
            res.setFullYear(res.getFullYear() + 2);
            return res;
        }
        default:
            return d;
    }
}

/**
 * Returns timeline boundaries (birth instant and 120-year cycle termination) for a chart's Dasha result.
 *
 * @param {Object} dashaResult - Output of calculateVimshottariDasha
 * @returns {{ birthMs: number, cycleEndMs: number, startDate: string, endDate: string, isValid: boolean }}
 */
export function getDashaTimelineBounds(dashaResult) {
    if (!dashaResult || !Array.isArray(dashaResult.mahadashas) || dashaResult.mahadashas.length === 0) {
        return { birthMs: 0, cycleEndMs: 0, startDate: '', endDate: '', isValid: false };
    }
    const firstMaha = dashaResult.mahadashas[0];
    const lastMaha = dashaResult.mahadashas[dashaResult.mahadashas.length - 1];

    const birthMs = firstMaha.startMs;
    const cycleEndMs = lastMaha.endMs;

    return {
        birthMs,
        cycleEndMs,
        startDate: new Date(birthMs).toISOString(),
        endDate: new Date(cycleEndMs).toISOString(),
        startFormatted: formatEvaluationDateOnly(birthMs),
        endFormatted: formatEvaluationDateOnly(cycleEndMs),
        isValid: true
    };
}

/**
 * Validates whether a target evaluation date falls within the chart's 120-year Vimshottari cycle.
 *
 * @param {Date|string|number} targetDate
 * @param {Object} dashaResult
 * @param {boolean} [isTe=false]
 * @returns {{ isValid: boolean, code: string, message: string }}
 */
export function validateEvaluationDate(targetDate, dashaResult, isTe = false) {
    const bounds = getDashaTimelineBounds(dashaResult);
    if (!bounds.isValid) {
        return {
            isValid: false,
            code: 'NO_DASHA_DATA',
            message: isTe ? 'దశా సమాచారం అందుబాటులో లేదు' : 'Dasha calculation data unavailable.'
        };
    }

    const target = parseEvaluationDate(targetDate);
    const targetMs = target.getTime();

    if (isNaN(targetMs)) {
        return {
            isValid: false,
            code: 'INVALID_DATE',
            message: isTe ? 'దయచేసి సరైన తేదీని ఎంచుకోండి.' : 'Invalid evaluation date provided.'
        };
    }

    if (targetMs < bounds.birthMs) {
        return {
            isValid: false,
            code: 'PRE_NATAL',
            message: isTe
                ? `ఎంచుకున్న తేదీ జన్మ తేదీ (${bounds.startFormatted}) కంటే ముందు ఉంది.`
                : `Selected date is before birth date (${bounds.startFormatted}). Pre-natal periods cannot be evaluated.`
        };
    }

    if (targetMs >= bounds.cycleEndMs) {
        return {
            isValid: false,
            code: 'POST_CYCLE',
            message: isTe
                ? `ఎంచుకున్న తేదీ 120 సంవత్సరాల వింశోత్తరి పరిమితి (${bounds.endFormatted}) దాటి ఉంది.`
                : `Selected date is beyond the 120-year Vimshottari cycle (${bounds.endFormatted}).`
        };
    }

    return {
        isValid: true,
        code: 'VALID',
        message: ''
    };
}

/**
 * Resolves the 5-level Dasha hierarchy active on a target date.
 *
 * @param {Object} params
 * @param {Object} params.dashaResult - Precalculated Dasha result
 * @param {Date|string|number} params.targetDate - Target date
 * @param {boolean} [params.isTe=false]
 * @returns {Object} { isValid, error, activePeriods, lords }
 */
export function resolveDashaHierarchyForDate({
    dashaResult,
    targetDate,
    isTe = false
}) {
    const validation = validateEvaluationDate(targetDate, dashaResult, isTe);
    if (!validation.isValid) {
        return {
            isValid: false,
            error: validation.message,
            errorCode: validation.code,
            activePeriods: null,
            lords: []
        };
    }

    const targetInstant = parseEvaluationDate(targetDate);
    const birthMs = dashaResult.mahadashas[0].startMs;
    const planetaryKPDetails = dashaResult.planetaryKPDetails || null;

    const activePeriods = getActivePeriods(
        dashaResult.mahadashas,
        targetInstant,
        birthMs,
        planetaryKPDetails
    );

    if (!activePeriods || !activePeriods.levels || activePeriods.levels.length === 0) {
        return {
            isValid: false,
            error: isTe ? 'ఆ తేదీకి దశా నాథులు కనుగొనబడలేదు.' : 'No active Dasha periods found for the specified date.',
            errorCode: 'PERIOD_NOT_FOUND',
            activePeriods: null,
            lords: []
        };
    }

    const targetMs = targetInstant.getTime();

    const lords = activePeriods.levels.map(lvl => {
        const isInside = targetMs >= lvl.startMs && targetMs < lvl.endMs;
        const remainingMs = isInside ? Math.max(0, lvl.endMs - targetMs) : 0;
        const remFormatted = isInside ? formatSubperiodDuration(remainingMs) : '';

        return {
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
            durationFormatted: lvl.durationFormatted || '',
            durationHuman: lvl.durationHuman || formatSubperiodDuration(lvl.endMs - lvl.startMs),
            remainingDuration: remFormatted || lvl.remainingDuration || '',
            remainingMs,
            isDateInsidePeriod: isInside,
            kpDetails: lvl.kpDetails
        };
    });

    return {
        isValid: true,
        error: null,
        errorCode: 'OK',
        activePeriods,
        lords,
        hierarchyPath: lords.map(l => l.lord).join(' → '),
        targetDateIso: targetInstant.toISOString()
    };
}

/**
 * Returns available child subperiods for any given parent period.
 * Level 1 -> All Mahadashas
 * Level 2 -> Antardashas of MD
 * Level 3 -> Pratyantardashas of AD
 * Level 4 -> Sookshma Dashas of PD (computed via subdivideDashaPeriod)
 * Level 5 -> Prana Dashas of SD (computed via subdivideDashaPeriod)
 *
 * @param {Object} params
 * @param {Object} [params.parentPeriod=null]
 * @param {number} params.targetLevel - 1..5
 * @param {Object} params.dashaResult
 * @returns {Array<Object>} List of available child periods
 */
export function getAvailableSubperiods({
    parentPeriod = null,
    targetLevel,
    dashaResult
}) {
    if (!dashaResult || !Array.isArray(dashaResult.mahadashas)) return [];

    const birthMs = dashaResult.mahadashas[0].startMs;
    const planetaryKPDetails = dashaResult.planetaryKPDetails || null;

    if (targetLevel === 1) {
        return dashaResult.mahadashas;
    }

    if (!parentPeriod) return [];

    if (targetLevel === 2) {
        return parentPeriod.antardashas || [];
    }

    if (targetLevel === 3) {
        return parentPeriod.pratyantardashas || [];
    }

    if (targetLevel === 4) {
        return subdivideDashaPeriod(parentPeriod, 4, birthMs, planetaryKPDetails);
    }

    if (targetLevel === 5) {
        return subdivideDashaPeriod(parentPeriod, 5, birthMs, planetaryKPDetails);
    }

    return [];
}

/**
 * Builds standard 5-level lord records formatted identically to runningDBALords
 * for consumption by evaluateJointDBA.
 *
 * @param {Object} params
 * @param {Object} params.md - Mahadasha record
 * @param {Object} params.ad - Antardasha record
 * @param {Object} params.pd - Pratyantardasha record
 * @param {Object} params.sd - Sookshma Dasha record
 * @param {Object} params.prana - Prana Dasha record
 * @param {Date|string|number} [params.evaluationDate=null] - Evaluation timestamp
 * @param {Object} [params.planetaryKPDetails=null] - KP details map
 * @returns {Array<Object>} 5-element array of lord objects
 */
export function buildLordsFromSelection({
    md,
    ad,
    pd,
    sd,
    prana,
    evaluationDate = null,
    planetaryKPDetails = null
}) {
    const evalInstant = evaluationDate ? parseEvaluationDate(evaluationDate) : null;
    const evalMs = evalInstant ? evalInstant.getTime() : null;

    const rawLevels = [
        { obj: md, level: 1, abbr: 'MD', name: 'Mahadasha', nameTe: 'మహాదశ' },
        { obj: ad, level: 2, abbr: 'AD', name: 'Bhukti (Antardasha)', nameTe: 'భుక్తి (అంతర్దశ)' },
        { obj: pd, level: 3, abbr: 'PD', name: 'Antara (Pratyantara)', nameTe: 'అంతర (ప్రత్యంతర)' },
        { obj: sd, level: 4, abbr: 'SD', name: 'Sookshma Dasha', nameTe: 'సూక్ష్మ దశ' },
        { obj: prana, level: 5, abbr: 'PRANA', name: 'Prana Dasha', nameTe: 'ప్రాణ దశ' }
    ];

    return rawLevels.map(({ obj, level, abbr, name, nameTe }) => {
        if (!obj) {
            return {
                level: abbr,
                levelNum: level,
                periodName: name,
                periodNameTe: nameTe,
                planet: 'Unknown',
                lord: 'Unknown',
                startDate: null,
                endDate: null,
                startMs: 0,
                endMs: 0,
                durationFormatted: '',
                durationHuman: '',
                remainingDuration: '',
                isDateInsidePeriod: false,
                kpDetails: null
            };
        }

        const planet = obj.lord || obj.planet || 'Unknown';
        const startMs = obj.startMs != null ? obj.startMs : (obj.startDate ? new Date(obj.startDate).getTime() : 0);
        const endMs = obj.endMs != null ? obj.endMs : (obj.endDate ? new Date(obj.endDate).getTime() : 0);
        const totalDurationMs = Math.max(0, endMs - startMs);

        const isDateInside = evalMs != null && (evalMs >= startMs && evalMs < endMs);
        const remainingMs = (isDateInside && evalMs != null)
            ? Math.max(0, endMs - evalMs)
            : 0;

        const kpDetails = obj.kpDetails || (planetaryKPDetails ? planetaryKPDetails[planet] : null);

        return {
            id: obj.id || `${abbr}_${planet}_${startMs}`,
            level: abbr,
            levelNum: level,
            periodName: obj.levelName || name,
            periodNameTe: obj.levelNameTe || nameTe,
            planet,
            lord: planet,
            startDate: obj.startDate || (startMs ? new Date(startMs).toISOString() : null),
            endDate: obj.endDate || (endMs ? new Date(endMs).toISOString() : null),
            startMs,
            endMs,
            durationFormatted: obj.durationFormatted || formatDashaDuration(totalDurationMs / MS_PER_YEAR),
            durationHuman: obj.durationHuman || formatSubperiodDuration(totalDurationMs),
            remainingDuration: isDateInside ? formatSubperiodDuration(remainingMs) : (obj.durationHuman || formatSubperiodDuration(totalDurationMs)),
            remainingMs,
            isDateInsidePeriod: isDateInside,
            kpDetails
        };
    });
}

/**
 * Validates and auto-corrects parent-child selections to guarantee that
 * every child selector always displays a valid subperiod of its selected parent.
 *
 * @param {Object} params
 * @param {Object} params.dashaResult
 * @param {string} params.mdId
 * @param {string} params.adId
 * @param {string} params.pdId
 * @param {string} params.sdId
 * @param {string} params.pranaId
 * @returns {Object} Validated selection containing { md, ad, pd, sd, prana, wasCorrected }
 */
export function ensureValidChildHierarchy({
    dashaResult,
    mdId,
    adId,
    pdId,
    sdId,
    pranaId
}) {
    if (!dashaResult || !Array.isArray(dashaResult.mahadashas) || dashaResult.mahadashas.length === 0) {
        return { md: null, ad: null, pd: null, sd: null, prana: null, wasCorrected: false };
    }

    const birthMs = dashaResult.mahadashas[0].startMs;
    const planetaryKPDetails = dashaResult.planetaryKPDetails || null;

    let wasCorrected = false;

    // 1. Resolve Mahadasha
    let md = dashaResult.mahadashas.find(m => m.id === mdId || m.lord === mdId);
    if (!md) {
        md = dashaResult.mahadashas[0];
        wasCorrected = true;
    }

    // 2. Resolve Antardasha under md
    const ads = md.antardashas || [];
    let ad = ads.find(a => a.id === adId || (a.lord === adId && a.parentMahaLord === md.lord));
    if (!ad) {
        ad = ads[0] || null;
        wasCorrected = true;
    }

    // 3. Resolve Pratyantardasha under ad
    const pds = ad ? (ad.pratyantardashas || []) : [];
    let pd = pds.find(p => p.id === pdId || (p.lord === pdId && p.parentAntarLord === ad?.lord));
    if (!pd) {
        pd = pds[0] || null;
        wasCorrected = true;
    }

    // 4. Resolve Sookshma under pd
    let sds = [];
    if (pd) {
        sds = subdivideDashaPeriod(pd, 4, birthMs, planetaryKPDetails);
    }
    let sd = sds.find(s => s.id === sdId || s.lord === sdId);
    if (!sd) {
        sd = sds[0] || null;
        wasCorrected = true;
    }

    // 5. Resolve Prana under sd
    let pranas = [];
    if (sd) {
        pranas = subdivideDashaPeriod(sd, 5, birthMs, planetaryKPDetails);
    }
    let prana = pranas.find(p => p.id === pranaId || p.lord === pranaId);
    if (!prana) {
        prana = pranas[0] || null;
        wasCorrected = true;
    }

    return {
        md,
        ad,
        pd,
        sd,
        prana,
        availableAds: ads,
        availablePds: pds,
        availableSds: sds,
        availablePranas: pranas,
        wasCorrected
    };
}

/**
 * Evaluates an event rule against a 5-level Dasha hierarchy (either date-derived or manually selected).
 *
 * @param {Object} params
 * @param {Object} params.significators - KP 4-fold significator output
 * @param {Object} params.rule - Selected KP event rule
 * @param {Array<Object>} params.lords - 5-level lord records
 * @param {Object} [params.options={}] - Options e.g. { ascSign: 1 }
 * @param {string} [params.evaluationMode='current'] - 'current' | 'custom'
 * @param {string} [params.selectionMode='date'] - 'date' | 'manual'
 * @param {Date|string|number} [params.evaluationDate=new Date()]
 * @returns {Object} Comprehensive evaluation result
 */
export function evaluateDashaForEvent({
    significators,
    rule,
    lords,
    options = {},
    evaluationMode = 'current',
    selectionMode = 'date',
    evaluationDate = new Date()
}) {
    if (!significators || !rule || !lords || lords.length === 0) {
        return null;
    }

    const { ascSign = 1 } = options;
    const evalInstant = parseEvaluationDate(evaluationDate);
    const evalMs = evalInstant.getTime();

    // Run existing authoritative joint DBA evaluation formula
    const jointDBAResult = evaluateJointDBA(significators, rule, lords, { ascSign });
    if (!jointDBAResult) return null;

    const hierarchyPath = lords.map(l => l.planet || l.lord).join(' → ');

    // Check if evaluationDate falls within the smallest child period (Prana) and all parent periods
    const allEnclosed = lords.every(l => {
        if (!l.startMs || !l.endMs) return true;
        return evalMs >= l.startMs && evalMs < l.endMs;
    });

    const activePeriodSpan = {
        start: lords[0]?.startDate,
        end: lords[0]?.endDate,
        pranaStart: lords[4]?.startDate,
        pranaEnd: lords[4]?.endDate
    };

    return {
        ...jointDBAResult,
        evaluationContext: {
            evaluationMode, // 'current' | 'custom'
            selectionMode, // 'date' | 'manual'
            evaluationDate: evalInstant.toISOString(),
            evaluationDateFormatted: formatEvaluationDateTime(evalInstant),
            hierarchyPath,
            isDateInsideAllPeriods: allEnclosed,
            activePeriodSpan,
            calculatedAt: new Date().toISOString()
        }
    };
}

/**
 * Creates a lightweight period comparison record for saving into the comparison list.
 *
 * @param {Object} params
 * @returns {Object} Lean comparison record
 */
export function createComparisonEntry({
    id = null,
    label = '',
    evaluationDate,
    selectionMode,
    lords,
    jointDBAResult,
    rule
}) {
    const evalInstant = parseEvaluationDate(evaluationDate);
    const hierarchyPath = lords.map(l => l.planet || l.lord).join(' → ');

    return {
        id: id || `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        label: label || `${formatEvaluationDateOnly(evalInstant)} (${selectionMode === 'manual' ? 'Manual' : 'Date'})`,
        evaluationDate: evalInstant.toISOString(),
        evaluationDateFormatted: formatEvaluationDateOnly(evalInstant),
        evaluationDateTimeFormatted: formatEvaluationDateTime(evalInstant),
        selectionMode, // 'date' | 'manual'
        hierarchyPath,
        mdLord: lords[0]?.planet || '',
        adLord: lords[1]?.planet || '',
        pdLord: lords[2]?.planet || '',
        sdLord: lords[3]?.planet || '',
        pranaLord: lords[4]?.planet || '',
        lordIds: {
            mdId: lords[0]?.id,
            adId: lords[1]?.id,
            pdId: lords[2]?.id,
            sdId: lords[3]?.id,
            pranaId: lords[4]?.id
        },
        periodDates: {
            adStart: lords[1]?.startDate,
            adEnd: lords[1]?.endDate,
            pranaStart: lords[4]?.startDate,
            pranaEnd: lords[4]?.endDate
        },
        status: jointDBAResult?.status || 'unavailable',
        coveragePercent: jointDBAResult?.coveragePercent || 0,
        coveredCount: jointDBAResult?.coveredHouses?.length || 0,
        requiredCount: jointDBAResult?.requiredHouses?.length || 0,
        coveredHouses: jointDBAResult?.coveredHouses || [],
        missingHouses: jointDBAResult?.missingHouses || [],
        ruleId: rule?.id || '',
        ruleSubject: rule?.subject || '',
        createdAt: new Date().toISOString()
    };
}

// Re-export Future Event Timing Finder engine and presets
export {
    findFutureSupportivePeriods,
    sortFuturePeriods,
    filterFuturePeriods,
    getQuickDurationRange,
    computeSearchEndDate,
    SEARCH_DURATION_PRESETS,
    EVALUATION_DEPTHS,
    MATCH_CRITERIA_OPTIONS
} from './futureEventFinder.js';
