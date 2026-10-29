/**
 * Authoritative Future Event Timing Finder Using Vimshottari Dasha & KP House Significations
 * For AstroSharma KP Kundli Studio
 *
 * Implements:
 * 1. Timeline search over configurable date ranges (default 5 years from current instant).
 * 2. Real Vimshottari Dasha period traversal at configurable depth (MD, MD+AD, PD, SD, Prana).
 * 3. Exact candidate interval clipping to the requested search window.
 * 4. Reuse of authoritative KP joint DBA evaluation formula (evaluateJointDBA).
 * 5. Full vs partial house match partitioning, sorting, and multi-criteria filtering.
 * 6. Historical vs future range detection and 120-year cycle boundary clipping.
 */

import {
    calculateVimshottariDasha,
    subdivideDashaPeriod,
    formatSubperiodDuration,
    formatDashaDuration,
    DASHA_LEVELS,
    MS_PER_YEAR
} from './vimshottariDasha.js';
import { evaluateJointDBA, resolveRuleHouses } from './kpHouseGroupingEngine.js';
import {
    parseEvaluationDate,
    formatDateForPicker,
    formatEvaluationDateOnly,
    formatEvaluationDateTime,
    getDashaTimelineBounds,
    validateEvaluationDate
} from './dashaEvaluationEngine.js';

/**
 * Standard search presets supported by Future Event Timing Finder.
 */
export const SEARCH_DURATION_PRESETS = [
    { key: '1y', years: 1, labelEn: '1 Year', labelTe: '1 సంవత్సరం' },
    { key: '2y', years: 2, labelEn: '2 Years', labelTe: '2 సంవత్సరాలు' },
    { key: '3y', years: 3, labelEn: '3 Years', labelTe: '3 సంవత్సరాలు' },
    { key: '5y', years: 5, labelEn: '5 Years (Default)', labelTe: '5 సంవత్సరాలు (డిఫాల్ట్)' },
    { key: '10y', years: 10, labelEn: '10 Years', labelTe: '10 సంవత్సరాలు' },
    { key: 'custom', years: null, labelEn: 'Custom Range', labelTe: 'అనుకూల కాలపరిమితి' }
];

/**
 * Evaluation depths supported by Future Event Timing Finder.
 */
export const EVALUATION_DEPTHS = [
    { level: 1, key: 'md', abbr: 'MD', labelEn: 'Mahadasha only', labelTe: 'మహాదశ మాత్రమే' },
    { level: 2, key: 'ad', abbr: 'AD', labelEn: 'Mahadasha + Antardasha', labelTe: 'మహాదశ + అంతర్దశ' },
    { level: 3, key: 'pd', abbr: 'PD', labelEn: 'Up to Pratyantardasha (Default)', labelTe: 'ప్రత్యంతర దశ వరకు (డిఫాల్ట్)' },
    { level: 4, key: 'sd', abbr: 'SD', labelEn: 'Up to Sookshma Dasha', labelTe: 'సూక్ష్మ దశ వరకు' },
    { level: 5, key: 'prana', abbr: 'PRANA', labelEn: 'Up to Prana Dasha', labelTe: 'ప్రాణ దశ వరకు' }
];

/**
 * Match criteria options.
 */
export const MATCH_CRITERIA_OPTIONS = {
    ALL: 'all', // 100% required houses matched
    THRESHOLD: 'threshold', // minimum coverage threshold %
    ANY: 'any' // show all intervals with their coverage
};

/**
 * Dynamically computes a search end date based on duration in years from start date.
 *
 * @param {Date|string|number} startDate
 * @param {number} years
 * @returns {Date}
 */
export function computeSearchEndDate(startDate, years = 5) {
    const s = parseEvaluationDate(startDate);
    const e = new Date(s);
    e.setFullYear(e.getFullYear() + years);
    return e;
}

/**
 * Resolves standard duration range parameters.
 *
 * @param {string} presetKey - '1y' | '2y' | '3y' | '5y' | '10y'
 * @param {Date|string|number} [baseDate=new Date()]
 * @returns {{ startDate: Date, endDate: Date, durationYears: number }}
 */
export function getQuickDurationRange(presetKey, baseDate = new Date()) {
    const startDate = parseEvaluationDate(baseDate);
    const preset = SEARCH_DURATION_PRESETS.find(p => p.key === presetKey) || SEARCH_DURATION_PRESETS[3]; // default 5y
    const years = preset.years || 5;
    const endDate = computeSearchEndDate(startDate, years);
    return {
        startDate,
        endDate,
        durationYears: years
    };
}

/**
 * Searches the actual Vimshottari Dasha timeline for candidate periods supporting an event rule.
 *
 * @param {Object} params
 * @param {Object} params.dashaResult - Output of calculateVimshottariDasha
 * @param {Object} params.significators - KP 4-fold significators
 * @param {Object} params.rule - Selected KP event rule
 * @param {Date|string|number} [params.searchStartDate=new Date()] - Start of search range
 * @param {Date|string|number} [params.searchEndDate=null] - End of search range (null => computes from durationYears)
 * @param {number} [params.durationYears=5] - Search horizon in years if searchEndDate is null
 * @param {number} [params.evaluationDepth=3] - 1..5 (Default: 3 for Pratyantardasha)
 * @param {string} [params.matchCriteria='all'] - 'all' | 'threshold' | 'any'
 * @param {number} [params.minCoverageThreshold=66] - Percentage threshold if matchCriteria is 'threshold'
 * @param {Array<number>} [params.customRequiredHouses=null] - Optional override of required event houses
 * @param {Object} [params.options={}] - Options e.g. { ascSign: 1 }
 * @param {boolean} [params.isTe=false] - Format Telugu strings
 * @param {number} [params.maxResults=1000] - Safety ceiling to prevent runaway iteration
 * @returns {Object} Comprehensive search response
 */
export function findFutureSupportivePeriods({
    dashaResult,
    significators,
    rule,
    searchStartDate = new Date(),
    searchEndDate = null,
    durationYears = 5,
    evaluationDepth = 3,
    matchCriteria = MATCH_CRITERIA_OPTIONS.ALL,
    minCoverageThreshold = 66,
    customRequiredHouses = null,
    options = {},
    isTe = false,
    maxResults = 1000
}) {
    const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    // 1. Validate Dasha result data
    const bounds = getDashaTimelineBounds(dashaResult);
    if (!bounds.isValid) {
        return {
            isValid: false,
            error: isTe ? 'దశా సమాచారం అందుబాటులో లేదు.' : 'Dasha calculation data unavailable.',
            errorCode: 'NO_DASHA_DATA',
            searchMetadata: null,
            results: []
        };
    }

    if (!significators || !significators.planetSignifications) {
        return {
            isValid: false,
            error: isTe ? 'కారకత్వ సమాచారం అందుబాటులో లేదు.' : 'KP significator data unavailable.',
            errorCode: 'NO_SIGNIFICATORS',
            searchMetadata: null,
            results: []
        };
    }

    if (!rule) {
        return {
            isValid: false,
            error: isTe ? 'ఈవెంట్ సూత్రం ఎంపిక కాలేదు.' : 'No event rule selected for evaluation.',
            errorCode: 'NO_RULE',
            searchMetadata: null,
            results: []
        };
    }

    // 2. Parse and normalize search window dates
    const startInstant = parseEvaluationDate(searchStartDate);
    const startMs = startInstant.getTime();

    let endInstant;
    if (searchEndDate) {
        endInstant = parseEvaluationDate(searchEndDate);
    } else {
        endInstant = computeSearchEndDate(startInstant, durationYears);
    }
    const endMs = endInstant.getTime();

    if (isNaN(startMs) || isNaN(endMs)) {
        return {
            isValid: false,
            error: isTe ? 'సరైన ప్రారంభ మరియు ముగింపు తేదీలను నమోదు చేయండి.' : 'Invalid search date range provided.',
            errorCode: 'INVALID_DATES',
            searchMetadata: null,
            results: []
        };
    }

    if (endMs <= startMs) {
        return {
            isValid: false,
            error: isTe ? 'ముగింపు తేదీ ప్రారంభ తేదీ కంటే తర్వాత ఉండాలి.' : 'Search end date must be later than start date.',
            errorCode: 'END_BEFORE_START',
            searchMetadata: null,
            results: []
        };
    }

    // 3. Validate against the chart's 120-year Vimshottari cycle bounds
    if (endMs <= bounds.birthMs) {
        return {
            isValid: false,
            error: isTe
                ? `ఎంచుకున్న కాలపరిమితి పూర్తిగా జన్మ తేదీ (${bounds.startFormatted}) కంటే ముందు ఉంది.`
                : `Requested search range is entirely pre-natal (before birth date ${bounds.startFormatted}).`,
            errorCode: 'PRE_NATAL_RANGE',
            searchMetadata: null,
            results: []
        };
    }

    if (startMs >= bounds.cycleEndMs) {
        return {
            isValid: false,
            error: isTe
                ? `ఎంచుకున్న కాలపరిమితి 120 సంవత్సరాల వింశోత్తరి పరిమితి (${bounds.endFormatted}) దాటి ఉంది.`
                : `Requested search range begins beyond the 120-year Vimshottari cycle (${bounds.endFormatted}).`,
            errorCode: 'POST_CYCLE_RANGE',
            searchMetadata: null,
            results: []
        };
    }

    // Effective calculation bounds clipped to the valid 120-year cycle
    const calcStartMs = Math.max(startMs, bounds.birthMs);
    const calcEndMs = Math.min(endMs, bounds.cycleEndMs);

    const isHistorical = startMs < (Date.now() - 24 * 60 * 60 * 1000); // starts before today
    const isCycleBounded = (calcStartMs > startMs) || (calcEndMs < endMs);

    // 4. Resolve effective event rule and required houses
    const { ascSign = 1 } = options;
    const effectiveHouses = Array.isArray(customRequiredHouses) && customRequiredHouses.length > 0
        ? customRequiredHouses
        : resolveRuleHouses(rule.jointDBA?.houses || rule.housesToBeSignified || [], rule, ascSign);

    const effectiveRule = {
        ...rule,
        jointDBA: {
            ...(rule.jointDBA || {}),
            houses: effectiveHouses,
            // Already resolved (or chosen by the user): don't re-add Badhaka / Maraka
            housesResolved: true
        },
        housesToBeSignified: effectiveHouses
    };

    // 5. Normalise evaluation depth (clamp between 1 and 5)
    const depth = Math.max(1, Math.min(5, parseInt(evaluationDepth, 10) || 3));
    const depthMeta = EVALUATION_DEPTHS.find(d => d.level === depth) || EVALUATION_DEPTHS[2];

    const birthMs = bounds.birthMs;
    const planetaryKPDetails = dashaResult.planetaryKPDetails || null;

    // 6. Traverse the actual Dasha timeline down to the configured depth
    const candidateResults = [];
    let totalIntervalsEvaluated = 0;

    // Level 1: Mahadashas
    for (const md of dashaResult.mahadashas) {
        // Fast interval pruning: skip MDs not intersecting [calcStartMs, calcEndMs]
        if (md.endMs <= calcStartMs || md.startMs >= calcEndMs) {
            continue;
        }

        if (depth === 1) {
            totalIntervalsEvaluated++;
            const candidate = evaluateCandidateInterval({
                ancestors: [md],
                leaf: md,
                calcStartMs,
                calcEndMs,
                significators,
                effectiveRule,
                depth,
                depthMeta,
                matchCriteria,
                minCoverageThreshold,
                options,
                isTe
            });
            if (candidate) {
                candidateResults.push(candidate);
                if (candidateResults.length >= maxResults) break;
            }
            continue;
        }

        // Level 2: Antardashas
        const ads = md.antardashas || [];
        for (const ad of ads) {
            if (ad.endMs <= calcStartMs || ad.startMs >= calcEndMs) {
                continue;
            }

            if (depth === 2) {
                totalIntervalsEvaluated++;
                const candidate = evaluateCandidateInterval({
                    ancestors: [md, ad],
                    leaf: ad,
                    calcStartMs,
                    calcEndMs,
                    significators,
                    effectiveRule,
                    depth,
                    depthMeta,
                    matchCriteria,
                    minCoverageThreshold,
                    options,
                    isTe
                });
                if (candidate) {
                    candidateResults.push(candidate);
                    if (candidateResults.length >= maxResults) break;
                }
                continue;
            }

            // Level 3: Pratyantardashas
            const pds = ad.pratyantardashas || [];
            for (const pd of pds) {
                if (pd.endMs <= calcStartMs || pd.startMs >= calcEndMs) {
                    continue;
                }

                if (depth === 3) {
                    totalIntervalsEvaluated++;
                    const candidate = evaluateCandidateInterval({
                        ancestors: [md, ad, pd],
                        leaf: pd,
                        calcStartMs,
                        calcEndMs,
                        significators,
                        effectiveRule,
                        depth,
                        depthMeta,
                        matchCriteria,
                        minCoverageThreshold,
                        options,
                        isTe
                    });
                    if (candidate) {
                        candidateResults.push(candidate);
                        if (candidateResults.length >= maxResults) break;
                    }
                    continue;
                }

                // Level 4: Sookshma Dashas (generated on demand via subdivideDashaPeriod)
                let sds = [];
                try {
                    sds = subdivideDashaPeriod(pd, 4, birthMs, planetaryKPDetails);
                } catch {
                    sds = [];
                }

                for (const sd of sds) {
                    if (sd.endMs <= calcStartMs || sd.startMs >= calcEndMs) {
                        continue;
                    }

                    if (depth === 4) {
                        totalIntervalsEvaluated++;
                        const candidate = evaluateCandidateInterval({
                            ancestors: [md, ad, pd, sd],
                            leaf: sd,
                            calcStartMs,
                            calcEndMs,
                            significators,
                            effectiveRule,
                            depth,
                            depthMeta,
                            matchCriteria,
                            minCoverageThreshold,
                            options,
                            isTe
                        });
                        if (candidate) {
                            candidateResults.push(candidate);
                            if (candidateResults.length >= maxResults) break;
                        }
                        continue;
                    }

                    // Level 5: Prana Dashas (generated on demand via subdivideDashaPeriod)
                    let pranas = [];
                    try {
                        pranas = subdivideDashaPeriod(sd, 5, birthMs, planetaryKPDetails);
                    } catch {
                        pranas = [];
                    }

                    for (const prana of pranas) {
                        if (prana.endMs <= calcStartMs || prana.startMs >= calcEndMs) {
                            continue;
                        }

                        totalIntervalsEvaluated++;
                        const candidate = evaluateCandidateInterval({
                            ancestors: [md, ad, pd, sd, prana],
                            leaf: prana,
                            calcStartMs,
                            calcEndMs,
                            significators,
                            effectiveRule,
                            depth,
                            depthMeta,
                            matchCriteria,
                            minCoverageThreshold,
                            options,
                            isTe
                        });
                        if (candidate) {
                            candidateResults.push(candidate);
                            if (candidateResults.length >= maxResults) break;
                        }
                    }

                    if (candidateResults.length >= maxResults) break;
                }

                if (candidateResults.length >= maxResults) break;
            }

            if (candidateResults.length >= maxResults) break;
        }

        if (candidateResults.length >= maxResults) break;
    }

    const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const executionTimeMs = Math.round((t1 - t0) * 10) / 10;

    // Apply default authoritative ranking:
    // 1. Full matches (100% covered) first
    // 2. Higher satisfaction percentage
    // 3. Earlier start date
    const sortedResults = sortFuturePeriods(candidateResults, 'default');

    const fullMatchCount = sortedResults.filter(r => r.isFullMatch).length;
    const partialMatchCount = sortedResults.filter(r => !r.isFullMatch).length;

    return {
        isValid: true,
        error: null,
        errorCode: 'OK',
        searchMetadata: {
            requestedStart: startInstant.toISOString(),
            requestedEnd: endInstant.toISOString(),
            requestedStartFormatted: formatEvaluationDateOnly(startInstant, isTe),
            requestedEndFormatted: formatEvaluationDateOnly(endInstant, isTe),
            actualStart: new Date(calcStartMs).toISOString(),
            actualEnd: new Date(calcEndMs).toISOString(),
            actualStartFormatted: formatEvaluationDateOnly(calcStartMs, isTe),
            actualEndFormatted: formatEvaluationDateOnly(calcEndMs, isTe),
            durationYears: (calcEndMs - calcStartMs) / MS_PER_YEAR,
            isHistorical,
            isCycleBounded,
            cycleEndFormatted: bounds.endFormatted,
            cycleStartFormatted: bounds.startFormatted,
            evaluationDepth: depth,
            depthLabel: isTe ? depthMeta.labelTe : depthMeta.labelEn,
            depthAbbr: depthMeta.abbr,
            matchCriteria,
            minCoverageThreshold,
            requiredHouses: effectiveHouses,
            ruleId: rule.id,
            ruleSubject: rule.subject || rule.id,
            totalIntervalsEvaluated,
            qualifyingIntervalsCount: sortedResults.length,
            fullMatchCount,
            partialMatchCount,
            executionTimeMs
        },
        results: sortedResults
    };
}

/**
 * Internal helper to evaluate and format a single candidate interval at the requested depth.
 */
function evaluateCandidateInterval({
    ancestors,
    leaf,
    calcStartMs,
    calcEndMs,
    significators,
    effectiveRule,
    depth,
    depthMeta,
    matchCriteria,
    minCoverageThreshold,
    options,
    isTe
}) {
    // 1. Clip interval to search window [calcStartMs, calcEndMs]
    const effectiveStartMs = Math.max(leaf.startMs, calcStartMs);
    const effectiveEndMs = Math.min(leaf.endMs, calcEndMs);

    if (effectiveEndMs <= effectiveStartMs) {
        return null; // No overlapping duration
    }

    const effectiveDurationMs = effectiveEndMs - effectiveStartMs;
    const originalDurationMs = leaf.endMs - leaf.startMs;
    const isClipped = (effectiveStartMs !== leaf.startMs) || (effectiveEndMs !== leaf.endMs);

    // 2. Build standard lord records consumable by evaluateJointDBA
    const ABBR_MAP = ['MD', 'AD', 'PD', 'SD', 'PRANA'];
    const NAME_MAP = ['Mahadasha', 'Bhukti (Antardasha)', 'Antara (Pratyantara)', 'Sookshma Dasha', 'Prana Dasha'];
    const NAME_TE_MAP = ['మహాదశ', 'భుక్తి (అంతర్దశ)', 'అంతర (ప్రత్యంతర)', 'సూక్ష్మ దశ', 'ప్రాణ దశ'];

    const lords = ancestors.map((item, idx) => {
        const pKey = item.lord || item.planet || 'Unknown';
        return {
            id: item.id || `${ABBR_MAP[idx]}_${pKey}_${item.startMs}`,
            level: ABBR_MAP[idx],
            levelNum: idx + 1,
            periodName: NAME_MAP[idx],
            periodNameTe: NAME_TE_MAP[idx],
            planet: pKey,
            lord: pKey,
            startDate: item.startDate || new Date(item.startMs).toISOString(),
            endDate: item.endDate || new Date(item.endMs).toISOString(),
            startMs: item.startMs,
            endMs: item.endMs,
            durationFormatted: item.durationFormatted || '',
            durationHuman: item.durationHuman || formatSubperiodDuration(item.endMs - item.startMs),
            remainingDuration: item.remainingDuration || '',
            kpDetails: item.kpDetails || null
        };
    });

    // 3. Execute authoritative joint DBA evaluation formula
    const jointDBAResult = evaluateJointDBA(significators, effectiveRule, lords, options);
    if (!jointDBAResult) return null;

    const reqCount = jointDBAResult.requiredHouses.length;
    const matchedCount = jointDBAResult.coveredHouses.length;
    const coveragePercent = jointDBAResult.coveragePercent;

    const isFullMatch = (reqCount > 0 && matchedCount === reqCount) || (jointDBAResult.status === 'satisfied');
    const isThresholdMatch = coveragePercent >= minCoverageThreshold;

    // 4. Apply match criteria filter
    if (matchCriteria === MATCH_CRITERIA_OPTIONS.ALL && !isFullMatch) {
        return null;
    }
    if (matchCriteria === MATCH_CRITERIA_OPTIONS.THRESHOLD && !isThresholdMatch && !isFullMatch) {
        return null;
    }

    const mdLord = ancestors[0]?.lord;
    const adLord = ancestors[1]?.lord || null;
    const pdLord = ancestors[2]?.lord || null;
    const sdLord = ancestors[3]?.lord || null;
    const pranaLord = ancestors[4]?.lord || null;

    const hierarchyPath = ancestors.map(a => a.lord).join(' → ');

    return {
        id: `future_${depth}_${ancestors.map(a => a.lord).join('_')}_${effectiveStartMs}`,
        depth,
        depthAbbr: depthMeta.abbr,
        mdLord,
        adLord,
        pdLord,
        sdLord,
        pranaLord,
        hierarchyPath,
        lords,

        // Actual computed intervals (Clipped to search range)
        startMs: effectiveStartMs,
        endMs: effectiveEndMs,
        startDate: new Date(effectiveStartMs).toISOString(),
        endDate: new Date(effectiveEndMs).toISOString(),
        startFormatted: formatEvaluationDateTime(effectiveStartMs, isTe),
        endFormatted: formatEvaluationDateTime(effectiveEndMs, isTe),
        startDateOnly: formatEvaluationDateOnly(effectiveStartMs, isTe),
        endDateOnly: formatEvaluationDateOnly(effectiveEndMs, isTe),
        durationMs: effectiveDurationMs,
        durationHuman: formatSubperiodDuration(effectiveDurationMs),
        isClipped,

        // Original unclipped Dasha engine interval timestamps
        originalStartMs: leaf.startMs,
        originalEndMs: leaf.endMs,
        originalStartDate: new Date(leaf.startMs).toISOString(),
        originalEndDate: new Date(leaf.endMs).toISOString(),
        originalStartFormatted: formatEvaluationDateTime(leaf.startMs, isTe),
        originalEndFormatted: formatEvaluationDateTime(leaf.endMs, isTe),
        originalDurationMs,
        originalDurationHuman: formatSubperiodDuration(originalDurationMs),

        // Event evaluation calculations (reused from existing KP rules)
        requiredHouses: jointDBAResult.requiredHouses,
        coveredHouses: jointDBAResult.coveredHouses,
        missingHouses: jointDBAResult.missingHouses,
        matchedCount,
        totalRequiredCount: reqCount,
        coveragePercent,
        status: jointDBAResult.status, // 'satisfied' | 'partially-satisfied' | 'afflicted' | 'not-satisfied'
        isFullMatch,
        hasObstruction: jointDBAResult.hasObstruction,
        afflictions: jointDBAResult.afflictions || [],
        obstructionReasons: jointDBAResult.obstructionReasons || [],
        runningLordsDetails: jointDBAResult.runningLordsDetails || [],
        jointSignifiedHouses: jointDBAResult.jointSignifiedHouses || [],
        altGroupSatisfied: jointDBAResult.altGroupSatisfied || false,
        satisfiedAltGroup: jointDBAResult.satisfiedAltGroup || null
    };
}

/**
 * Sorts candidate periods according to user preference.
 *
 * @param {Array<Object>} periods
 * @param {string} sortBy - 'default' | 'earliest' | 'score' | 'duration' | 'coverage'
 * @returns {Array<Object>} Sorted periods array
 */
export function sortFuturePeriods(periods, sortBy = 'default') {
    if (!Array.isArray(periods)) return [];
    const copy = [...periods];

    switch (sortBy) {
        case 'earliest':
            // Strictly chronological
            return copy.sort((a, b) => a.startMs - b.startMs);

        case 'score':
            // Highest satisfaction percentage, then chronological
            return copy.sort((a, b) => {
                if (b.coveragePercent !== a.coveragePercent) {
                    return b.coveragePercent - a.coveragePercent;
                }
                return a.startMs - b.startMs;
            });

        case 'duration':
            // Longest qualifying interval, then chronological
            return copy.sort((a, b) => {
                if (b.durationMs !== a.durationMs) {
                    return b.durationMs - a.durationMs;
                }
                return a.startMs - b.startMs;
            });

        case 'coverage':
            // Most houses covered, then score, then chronological
            return copy.sort((a, b) => {
                if (b.matchedCount !== a.matchedCount) {
                    return b.matchedCount - a.matchedCount;
                }
                if (b.coveragePercent !== a.coveragePercent) {
                    return b.coveragePercent - a.coveragePercent;
                }
                return a.startMs - b.startMs;
            });

        case 'default':
        default:
            // 1. Full matches first
            // 2. Higher score
            // 3. Earlier start date
            return copy.sort((a, b) => {
                const aFull = a.isFullMatch ? 1 : 0;
                const bFull = b.isFullMatch ? 1 : 0;
                if (bFull !== aFull) return bFull - aFull;
                if (b.coveragePercent !== a.coveragePercent) {
                    return b.coveragePercent - a.coveragePercent;
                }
                return a.startMs - b.startMs;
            });
    }
}

/**
 * Filters candidate periods by match type, status, or specific lords.
 *
 * @param {Array<Object>} periods
 * @param {Object} filters
 * @param {string} [filters.matchType='all'] - 'all' | 'full' | 'partial'
 * @param {string} [filters.status='all'] - 'all' | 'satisfied' | 'partially-satisfied' | 'afflicted'
 * @param {string} [filters.mdLord=''] - Planet key e.g. 'Jupiter'
 * @param {string} [filters.adLord=''] - Planet key e.g. 'Saturn'
 * @param {string} [filters.pdLord=''] - Planet key e.g. 'Venus'
 * @returns {Array<Object>} Filtered periods array
 */
export function filterFuturePeriods(periods, filters = {}) {
    if (!Array.isArray(periods)) return [];

    const {
        matchType = 'all',
        status = 'all',
        mdLord = '',
        adLord = '',
        pdLord = ''
    } = filters;

    return periods.filter(p => {
        // Match type filter
        if (matchType === 'full' && !p.isFullMatch) return false;
        if (matchType === 'partial' && p.isFullMatch) return false;

        // Status filter
        if (status !== 'all' && p.status !== status) return false;

        // MD lord filter
        if (mdLord && p.mdLord?.toLowerCase() !== mdLord.toLowerCase()) return false;

        // AD lord filter
        if (adLord && p.adLord?.toLowerCase() !== adLord.toLowerCase()) return false;

        // PD lord filter
        if (pdLord && p.pdLord?.toLowerCase() !== pdLord.toLowerCase()) return false;

        return true;
    });
}
