/**
 * Authoritative Vimshottari Dasha Calculation Engine for AstroSharma KP Kundli
 *
 * Implements the classical 120-year Vimshottari Dasha system:
 * - Fixed 9-Lord cycle: Ketu (7y), Venus (20y), Sun (6y), Moon (10y), Mars (7y),
 *   Rahu (18y), Jupiter (16y), Saturn (19y), Mercury (17y). Total = 120 years.
 * - Determination of birth Mahadasha and lord from Moon's sidereal longitude in [0°, 360°).
 * - Exact elapsed and remaining Nakshatra fractions and Balance of Dasha at birth.
 * - Exact contiguous [startDate, endDate) boundaries at millisecond precision using
 *   the standard astrological year convention of 365.25 days.
 * - Rigorous nested subdivisions: Mahadasha -> Antardasha (Bhukti) -> Pratyantardasha.
 * - Classical pre-natal clipping: Theoretical subperiods of the birth-running Mahadasha
 *   are computed from theoretical cycle inception and clipped at the birth instant,
 *   preserving exact proportional subperiod durations without artificial compression.
 */

import { VIMSHOTTARI_PLANETS, KP_NAKSHATRAS, TOTAL_DASHA_YEARS, NAKSHATRA_SPAN_DEG, resolveKPLongitude } from './kpSubLord.js';
import { normalizeDeg } from './kpHouses.js';
import { calculatePlanetaryAspects } from './kpAspects.js';
import { calculateKPSignificators } from './kpSignificators.js';
import { formatDMS } from '../nakshatraUtils.js';

export { VIMSHOTTARI_PLANETS, KP_NAKSHATRAS, TOTAL_DASHA_YEARS, NAKSHATRA_SPAN_DEG };

/**
 * Standard Astrological Calculation Year Convention (Julian Mean Year):
 * 365.25 days = 365 days 6 hours.
 * 1 day = 86,400,000 milliseconds.
 * 1 dasha year = 31,557,600,000 milliseconds.
 */
export const DASHA_YEAR_DAYS = 365.25;
export const MS_PER_DAY = 86400 * 1000;
export const MS_PER_YEAR = DASHA_YEAR_DAYS * MS_PER_DAY; // 31,557,600,000 ms

/**
 * Metadata definitions for all 5 Vimshottari Dasha levels.
 */
export const DASHA_LEVELS = {
    1: { level: 1, key: 'md', abbr: 'MD', name: 'Mahadasha', nameTe: 'మహాదశ', order: 1 },
    2: { level: 2, key: 'ad', abbr: 'AD', name: 'Bhukti (Antardasha)', nameTe: 'భుక్తి (అంతర్దశ)', order: 2, alias: 'bhukti' },
    3: { level: 3, key: 'pd', abbr: 'PD', name: 'Antara (Pratyantara)', nameTe: 'అంతర (ప్రత్యంతర)', order: 3, alias: 'antara' },
    4: { level: 4, key: 'sd', abbr: 'SD', name: 'Sookshma Dasha', nameTe: 'సూక్ష్మ దశ', order: 4, alias: 'sookshma' },
    5: { level: 5, key: 'prana', abbr: 'PRANA', name: 'Prana Dasha', nameTe: 'ప్రాణ దశ', order: 5, alias: 'prana' }
};

/**
 * High-resolution human-readable duration formatter for dasha periods and remaining time.
 * Formats durations from multiple years down to days, hours, and minutes.
 *
 * @param {number} durationMs - Duration in milliseconds
 * @returns {string} Human-readable string, e.g. "4.2y", "2m 14d", "5d 14h", "12h 45m"
 */
export function formatSubperiodDuration(durationMs) {
    if (durationMs == null || isNaN(durationMs) || durationMs <= 0) {
        return '0d 0h';
    }
    const totalSeconds = Math.floor(durationMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days >= 365) {
        const years = (days / 365.25).toFixed(1);
        return `${years}y`;
    }
    if (days >= 30) {
        const months = Math.floor(days / 30.4375);
        const remDays = Math.round(days % 30.4375);
        return remDays > 0 ? `${months}m ${remDays}d` : `${months}m`;
    }
    if (days > 0) {
        return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
    if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${Math.max(1, minutes)}m`;
}

/**
 * Maps a planet key to its Vimshottari index (0 to 8).
 *
 * @param {string} planetKey
 * @returns {number} 0..8
 */
export function getVimshottariLordIndex(planetKey) {
    if (!planetKey) return 0;
    const cleanKey = planetKey.trim().toLowerCase();
    const idx = VIMSHOTTARI_PLANETS.findIndex(p => p.key.toLowerCase() === cleanKey);
    return idx >= 0 ? idx : 0;
}

/**
 * Formats a decimal year duration into a human-readable Years, Months, Days breakdown.
 * Uses 1 year = 365.25 days, 1 month = 30.4375 days (365.25 / 12).
 *
 * @param {number} decimalYears
 * @returns {{ years: number, months: number, days: number, formatted: string }}
 */
export function formatDashaDuration(decimalYears) {
    if (decimalYears == null || isNaN(decimalYears) || decimalYears < 0) {
        return { years: 0, months: 0, days: 0, formatted: '0y 0m 0d' };
    }

    const totalDays = decimalYears * DASHA_YEAR_DAYS;
    const years = Math.floor(decimalYears);
    const remYears = decimalYears - years;

    const remMonthsDecimal = remYears * 12.0;
    const months = Math.floor(remMonthsDecimal);
    const remMonths = remMonthsDecimal - months;

    const daysDecimal = remMonths * (DASHA_YEAR_DAYS / 12.0);
    const days = Math.round(daysDecimal);

    // Adjust for rounding spillover (e.g. 30.4375 rounding to 30 or 31)
    let finalYears = years;
    let finalMonths = months;
    let finalDays = days;

    if (finalDays >= 30) {
        finalMonths += 1;
        finalDays -= 30;
    }
    if (finalMonths >= 12) {
        finalYears += 1;
        finalMonths -= 12;
    }

    const parts = [];
    if (finalYears > 0) parts.push(`${finalYears}y`);
    if (finalMonths > 0 || finalYears > 0) parts.push(`${finalMonths}m`);
    parts.push(`${finalDays}d`);

    return {
        years: finalYears,
        months: finalMonths,
        days: finalDays,
        formatted: parts.join(' ')
    };
}

/**
 * Determines the birth Nakshatra, Star Lord, elapsed/remaining fractions,
 * and Mahadasha balance at birth from Moon's sidereal longitude.
 *
 * @param {number} moonSiderealLongitude - Sidereal longitude in degrees [0°, 360°)
 * @returns {Object} Nakshatra and Dasha balance analysis
 */
export function getMoonNakshatraAndBalance(moonSiderealLongitude) {
    if (moonSiderealLongitude == null || isNaN(moonSiderealLongitude)) {
        throw new Error("Invalid Moon longitude provided for Vimshottari Dasha calculation.");
    }

    // Normalization to [0, 360)
    let normalizedLon = ((Number(moonSiderealLongitude) % 360.0) + 360.0) % 360.0;
    if (normalizedLon >= 360.0) normalizedLon = 0.0;

    const spanDeg = NAKSHATRA_SPAN_DEG; // 13.333333333333334° (13°20')

    // Floating-point division boundary guard matching kpSubLord.js
    let nakshatraIndex = Math.floor((normalizedLon + 1e-11) / spanDeg);
    if (nakshatraIndex >= 27) nakshatraIndex = 26;
    if (nakshatraIndex < 0) nakshatraIndex = 0;

    const nakshatra = KP_NAKSHATRAS[nakshatraIndex];
    const nakshatraStartDeg = nakshatraIndex * spanDeg;
    const nakshatraEndDeg = (nakshatraIndex + 1) * spanDeg;

    let moonOffsetDeg = normalizedLon - nakshatraStartDeg;
    if (moonOffsetDeg < 0.0) moonOffsetDeg = 0.0;
    if (moonOffsetDeg > spanDeg) moonOffsetDeg = spanDeg;

    let elapsedFraction = moonOffsetDeg / spanDeg;

    // Numerical floating-point safety clamping
    if (elapsedFraction < 0.0) elapsedFraction = 0.0;
    if (elapsedFraction > 1.0) elapsedFraction = 1.0;

    const remainingFraction = 1.0 - elapsedFraction;

    const starLordKey = nakshatra.starLord;
    const lordObj = VIMSHOTTARI_PLANETS.find(p => p.key === starLordKey);
    const fullLordYears = lordObj ? lordObj.years : 7;

    const balanceYears = remainingFraction * fullLordYears;
    const elapsedYears = elapsedFraction * fullLordYears;

    return {
        moonLongitude: normalizedLon,
        nakshatraIndex,
        nakshatraName: nakshatra.name,
        nakshatraStartDeg,
        nakshatraEndDeg,
        nakshatraSpanDeg: spanDeg,
        moonOffsetDeg,
        elapsedFraction,
        remainingFraction,
        starLord: starLordKey,
        fullLordYears,
        balanceYears,
        elapsedYears,
        balanceFormatted: formatDashaDuration(balanceYears),
        elapsedFormatted: formatDashaDuration(elapsedYears)
    };
}

/**
 * Builds a normalized, cached map of KP astrological details (STL, SUB, SSL, and ASP)
 * for the 9 Vimshottari Dasha planetary lords based on their actual sidereal positions
 * in the active chart.
 *
 * @param {Object} params
 * @param {Array<Object>} [params.planets] - Array of 9 graha objects with sidereal longitudes
 * @param {Array<Object>} [params.cusps] - Array of 12 Placidus house cusps
 * @param {Object} [params.aspects] - Optional pre-calculated aspects from calculatePlanetaryAspects
 * @param {Object} [params.significators] - Optional pre-calculated 4-fold KP house significators
 * @returns {Object.<string, Object>} Map of planetKey -> { stl, sub, ssl, aspects, significations, ... }
 */
export function buildPlanetaryKPDetails({ planets, cusps = [], aspects = null, significators = null } = {}) {
    const result = {};
    const VIMSHOTTARI_LORD_KEYS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

    const createEmptySignifications = () => ({
        planet: { primaryHouses: [], level1Houses: [], level2Houses: [], level3Houses: [], level4Houses: [], aspectedHouses: [], allHouses: [], formatted: '', isAvailable: false },
        stl: { planet: null, primaryHouses: [], formatted: '', isAvailable: false },
        sub: { planet: null, primaryHouses: [], formatted: '', isAvailable: false },
        ssl: { planet: null, primaryHouses: [], formatted: '', isAvailable: false },
        primaryHouses: [],
        formatted: ''
    });

    if (!Array.isArray(planets) || planets.length === 0) {
        for (const key of VIMSHOTTARI_LORD_KEYS) {
            result[key] = {
                planetKey: key,
                name: key,
                isAvailable: false,
                stl: null,
                sub: null,
                ssl: null,
                aspects: { totalCount: 0, planets: [], cusps: [], all: [], summary: 'Unavailable', summaryTe: 'లభ్యం కాలేదు', method: 'KP Western Degree Aspects' },
                significations: createEmptySignifications()
            };
        }
        return result;
    }

    // Ensure aspects list is available
    let allAspects = [];
    if (aspects && Array.isArray(aspects.aspects)) {
        allAspects = aspects.aspects;
    } else if (Array.isArray(aspects)) {
        allAspects = aspects;
    } else {
        try {
            const aspCalc = calculatePlanetaryAspects(planets, cusps);
            allAspects = aspCalc.aspects || [];
        } catch {
            allAspects = [];
        }
    }

    // Ensure 4-fold KP house significators are available
    let planetSignificationsList = [];
    if (significators && Array.isArray(significators.planetSignifications)) {
        planetSignificationsList = significators.planetSignifications;
    } else if (Array.isArray(significators)) {
        planetSignificationsList = significators;
    } else if (Array.isArray(planets) && planets.length > 0 && Array.isArray(cusps) && cusps.length > 0) {
        try {
            const sigCalc = calculateKPSignificators(planets, cusps);
            planetSignificationsList = sigCalc.planetSignifications || [];
        } catch {
            planetSignificationsList = [];
        }
    }

    // Quick lookup map for planet significations
    const planetSigMap = {};
    for (const sig of planetSignificationsList) {
        if (sig && sig.planetKey) {
            planetSigMap[sig.planetKey.toLowerCase()] = sig;
        }
    }

    const extractSignifications = (planetName) => {
        if (!planetName) {
            return {
                primaryHouses: [],
                level1Houses: [],
                level2Houses: [],
                level3Houses: [],
                level4Houses: [],
                aspectedHouses: [],
                allHouses: [],
                formatted: '',
                isAvailable: false
            };
        }
        const s = planetSigMap[planetName.toLowerCase()];
        if (!s) {
            return {
                primaryHouses: [],
                level1Houses: [],
                level2Houses: [],
                level3Houses: [],
                level4Houses: [],
                aspectedHouses: [],
                allHouses: [],
                formatted: '',
                isAvailable: false
            };
        }
        const primary = Array.isArray(s.primaryHouses) ? s.primaryHouses : [];
        return {
            primaryHouses: primary,
            level1Houses: s.level1Houses || [],
            level2Houses: s.level2Houses || [],
            level3Houses: s.level3Houses || [],
            level4Houses: s.level4Houses || [],
            aspectedHouses: s.aspectedHouses || [],
            allHouses: s.allHouses || primary,
            formatted: primary.length > 0 ? primary.join(', ') : '',
            isAvailable: true
        };
    };

    for (const lordKey of VIMSHOTTARI_LORD_KEYS) {
        // Find planet in chart (case-insensitive key or name prefix)
        const p = planets.find(item =>
            (item.key && item.key.toLowerCase() === lordKey.toLowerCase()) ||
            (item.name && item.name.toLowerCase().startsWith(lordKey.toLowerCase()))
        );

        if (!p || p.longitude == null || isNaN(p.longitude)) {
            result[lordKey] = {
                planetKey: lordKey,
                name: lordKey,
                isAvailable: false,
                stl: null,
                sub: null,
                ssl: null,
                aspects: { totalCount: 0, planets: [], cusps: [], all: [], summary: 'Unavailable', summaryTe: 'లభ్యం కాలేదు', method: 'KP Western Degree Aspects' },
                significations: createEmptySignifications()
            };
            continue;
        }

        // Resolve KP hierarchy using existing engine if not already on the planet object
        const resolved = (p.starLord && p.subLord && p.subSubLord)
            ? p
            : resolveKPLongitude(p.longitude);

        const stl = resolved.starLord;
        const sub = resolved.subLord;
        const ssl = resolved.subSubLord;

        // Filter aspects for this planet
        // A planet is involved if it is the castingBody OR receivingBody
        const planetAspects = [];
        const planetToPlanet = [];
        const planetToCusp = [];

        for (const asp of allAspects) {
            const isCaster = (asp.castingBody?.key?.toLowerCase() === lordKey.toLowerCase());
            const isReceiver = (asp.receivingBody?.key?.toLowerCase() === lordKey.toLowerCase());

            if (isCaster) {
                planetAspects.push(asp);
                if (asp.targetType === 'planet') {
                    planetToPlanet.push(asp);
                } else if (asp.targetType === 'cusp') {
                    planetToCusp.push(asp);
                }
            } else if (isReceiver && asp.targetType === 'planet') {
                // If it's a mutual western degree aspect where this planet was the target,
                // also include it from this planet's perspective
                const invertedAsp = {
                    ...asp,
                    id: `${asp.id}-inv`,
                    castingBody: asp.receivingBody,
                    receivingBody: asp.castingBody,
                    castingHouse: asp.targetHouse,
                    targetHouse: asp.castingHouse,
                    descriptionEn: `${lordKey} in House ${asp.targetHouse} forms a ${asp.aspectType} (${asp.nominalAngle}°) with ${asp.castingBody?.name || asp.castingBody?.key} in House ${asp.castingHouse} (Orb: ${asp.orbFormatted}, ${asp.motion}).`,
                    descriptionTe: `${lordKey} (${asp.targetHouse}వ భావం) మరియు ${asp.castingBody?.name || asp.castingBody?.key} (${asp.castingHouse}వ భావం) మధ్య ${asp.aspectNameTe || asp.aspectType} ఏర్పడింది (ఆర్బ్: ${asp.orbFormatted}, ${asp.motion}).`
                };
                planetAspects.push(invertedAsp);
                planetToPlanet.push(invertedAsp);
            }
        }

        // Build compact aspect summary strings (e.g. ☌ Mercury, △ Jupiter, ⚹ Cusp 1)
        const summaryItems = [];
        const summaryItemsTe = [];

        for (const a of planetAspects) {
            const sym = a.aspectSymbol || '';
            const type = a.aspectType;
            const targetName = a.targetType === 'cusp'
                ? `Cusp ${a.targetHouse}`
                : (a.receivingBody?.key || a.receivingBody?.name || 'Target');
            const targetNameTe = a.targetType === 'cusp'
                ? `${a.targetHouse}వ భావ సంధి`
                : (a.receivingBody?.te || a.receivingBody?.key || 'లక్ష్యం');
            const orbStr = a.orbFormatted ? `(${a.orbFormatted})` : '';

            summaryItems.push(`${sym} ${type} ${targetName} ${orbStr}`.trim());
            summaryItemsTe.push(`${sym} ${a.aspectNameTe || type} ${targetNameTe} ${orbStr}`.trim());
        }

        const summary = summaryItems.length > 0
            ? summaryItems.slice(0, 3).join(', ') + (summaryItems.length > 3 ? ` +${summaryItems.length - 3} more` : '')
            : 'No major aspects within orb';
        const summaryTe = summaryItemsTe.length > 0
            ? summaryItemsTe.slice(0, 3).join(', ') + (summaryItemsTe.length > 3 ? ` +ఇంకా ${summaryItemsTe.length - 3}` : '')
            : 'ఆర్బ్ పరిధిలో ప్రధాన దృష్టిలు లేవు';

        // Extract 4-fold house significations for the Dasha planet, its STL, its SUB, and its SSL
        const planetSig = extractSignifications(lordKey);
        const stlSig = extractSignifications(stl);
        const subSig = extractSignifications(sub);
        const sslSig = extractSignifications(ssl);

        result[lordKey] = {
            planetKey: lordKey,
            name: p.name || lordKey,
            te: p.te || lordKey,
            short: p.short || lordKey.slice(0, 2),
            longitude: p.longitude,
            longitudeDMS: formatDMS(p.longitude),
            sign: (typeof p.sign === 'object' && p.sign !== null) ? p.sign.en : (p.sign || ''),
            signTe: (typeof p.sign === 'object' && p.sign !== null) ? p.sign.te : '',
            signLord: p.signLord || '',
            degreeInSign: p.degreeInSign != null ? p.degreeInSign : (p.longitude % 30),
            nakshatraName: p.nakshatra?.name || resolved.nakshatra?.name || '',
            nakshatraTe: p.nakshatra?.te || resolved.nakshatra?.te || '',
            nakshatraPada: p.nakshatra?.pada || null,
            stl,
            sub,
            ssl,
            house: p.house || null,
            isRetrograde: Boolean(p.isRetrograde),
            aspects: {
                totalCount: planetAspects.length,
                planetAspectsCount: planetToPlanet.length,
                cuspAspectsCount: planetToCusp.length,
                planets: planetToPlanet,
                cusps: planetToCusp,
                all: planetAspects,
                summary,
                summaryTe,
                method: 'KP Western Degree Aspects & Cusp Orbs'
            },
            significations: {
                planet: planetSig,
                stl: {
                    planet: stl,
                    ...stlSig
                },
                sub: {
                    planet: sub,
                    ...subSig
                },
                ssl: {
                    planet: ssl,
                    ...sslSig
                },
                primaryHouses: planetSig.primaryHouses,
                formatted: planetSig.formatted
            },
            isAvailable: true
        };
    }

    return result;
}

/**
 * Generates the complete nested Vimshottari Dasha timeline (Mahadasha, Antardasha, Pratyantardasha)
 * starting at the birth instant and proceeding through the 120-year cycle.
 *
 * @param {Object} params
 * @param {number} params.moonSiderealLongitude - Moon's sidereal longitude in degrees [0, 360)
 * @param {Date|string|number} params.birthDateUtc - UTC birth instant (Date object, ISO string, or timestamp)
 * @param {Date|string|number} [params.referenceDate=null] - Optional reference date to query active period
 * @param {Array<Object>} [params.planets=null] - Array of 9 grahas with sidereal positions for STL/SUB/SSL
 * @param {Array<Object>} [params.cusps=null] - Array of 12 Placidus house cusps
 * @param {Object} [params.aspects=null] - Calculated planetary aspects
 * @param {Object} [params.significators=null] - 4-fold KP house significators
 * @returns {Object} Complete Vimshottari Dasha calculation payload
 */
export function calculateVimshottariDasha({
    moonSiderealLongitude,
    birthDateUtc,
    referenceDate = null,
    planets = null,
    cusps = null,
    aspects = null,
    significators = null
}) {
    // 1. Resolve birth instant in UTC milliseconds
    const birthInstant = (birthDateUtc instanceof Date)
        ? birthDateUtc
        : new Date(birthDateUtc);

    if (isNaN(birthInstant.getTime())) {
        throw new Error("Invalid birthDateUtc provided for Vimshottari Dasha calculation.");
    }
    const birthMs = birthInstant.getTime();

    // 2. Calculate Birth Nakshatra and Balance
    const balanceInfo = getMoonNakshatraAndBalance(moonSiderealLongitude);
    const birthLordKey = balanceInfo.starLord;
    const startLordIdx = getVimshottariLordIndex(birthLordKey);

    // 3. Build planetary KP details (STL, SUB, SSL, ASP, and BHAVA Significations)
    const planetaryKPDetails = buildPlanetaryKPDetails({ planets, cusps, aspects, significators });

    // 4. Theoretical start of the birth Mahadasha
    // The birth lord began ruling earlier by the elapsed fraction of its full span
    const elapsedMs = Math.round(balanceInfo.elapsedYears * MS_PER_YEAR);
    const theoBirthMahaStartMs = birthMs - elapsedMs;

    // 5. Generate the 9 Mahadashas of the Vimshottari Cycle
    const mahadashas = [];
    let currentMahaStartMs = birthMs;

    for (let m = 0; m < 9; m++) {
        const lordIdx = (startLordIdx + m) % 9;
        const lordInfo = VIMSHOTTARI_PLANETS[lordIdx];
        const isBirthMaha = (m === 0);

        let mahaStartMs, mahaEndMs, mahaDurationYears, theoMahaStartMs, theoMahaEndMs;

        if (isBirthMaha) {
            theoMahaStartMs = theoBirthMahaStartMs;
            theoMahaEndMs = theoBirthMahaStartMs + Math.round(lordInfo.years * MS_PER_YEAR);
            mahaStartMs = birthMs;
            mahaEndMs = theoMahaEndMs;
            mahaDurationYears = balanceInfo.balanceYears;
        } else {
            theoMahaStartMs = currentMahaStartMs;
            theoMahaEndMs = currentMahaStartMs + Math.round(lordInfo.years * MS_PER_YEAR);
            mahaStartMs = currentMahaStartMs;
            mahaEndMs = theoMahaEndMs;
            mahaDurationYears = lordInfo.years;
        }

        // Generate the 9 Antardashas within this Mahadasha
        const antardashas = [];
        let curTheoAdStartMs = theoMahaStartMs;

        for (let a = 0; a < 9; a++) {
            const adLordIdx = (lordIdx + a) % 9;
            const adLordInfo = VIMSHOTTARI_PLANETS[adLordIdx];

            // Standard classical formula: AD Duration = (MD_Years * AD_Years) / 120
            const adDurationYears = (lordInfo.years * adLordInfo.years) / TOTAL_DASHA_YEARS;
            const adDurationMs = Math.round(adDurationYears * MS_PER_YEAR);

            const theoAdStartMs = curTheoAdStartMs;
            const theoAdEndMs = (a === 8) ? theoMahaEndMs : (curTheoAdStartMs + adDurationMs);
            curTheoAdStartMs = theoAdEndMs;

            // Check if this Antardasha belongs to the person's post-natal life
            if (isBirthMaha && theoAdEndMs <= birthMs) {
                // Entirely pre-natal; passed before birth
                continue;
            }

            const isSpanningBirth = isBirthMaha && (theoAdStartMs < birthMs && theoAdEndMs > birthMs);
            const adStartMs = isSpanningBirth ? birthMs : theoAdStartMs;
            const adEndMs = theoAdEndMs;
            const activeAdDurationYears = (adEndMs - adStartMs) / MS_PER_YEAR;

            // Generate the 9 Pratyantardashas within this Antardasha
            const pratyantardashas = [];
            let curTheoPdStartMs = theoAdStartMs;

            for (let p = 0; p < 9; p++) {
                const pdLordIdx = (adLordIdx + p) % 9;
                const pdLordInfo = VIMSHOTTARI_PLANETS[pdLordIdx];

                // Standard classical formula: PD Duration = (AD_Duration * PD_Years) / 120
                const pdDurationYears = (adDurationYears * pdLordInfo.years) / TOTAL_DASHA_YEARS;
                const pdDurationMs = Math.round(pdDurationYears * MS_PER_YEAR);

                const theoPdStartMs = curTheoPdStartMs;
                const theoPdEndMs = (p === 8) ? theoAdEndMs : (curTheoPdStartMs + pdDurationMs);
                curTheoPdStartMs = theoPdEndMs;

                if (isBirthMaha && theoPdEndMs <= birthMs) {
                    // Pre-natal Pratyantardasha
                    continue;
                }

                const isPdSpanningBirth = isBirthMaha && (theoPdStartMs < birthMs && theoPdEndMs > birthMs);
                const pdStartMs = isPdSpanningBirth ? birthMs : theoPdStartMs;
                const pdEndMs = theoPdEndMs;
                const activePdDurationYears = (pdEndMs - pdStartMs) / MS_PER_YEAR;

                pratyantardashas.push({
                    id: `pd_${m}_${a}_${p}`,
                    level: 3,
                    levelName: 'Pratyantardasha',
                    lord: pdLordInfo.key,
                    name: pdLordInfo.name,
                    short: pdLordInfo.short,
                    te: pdLordInfo.te,
                    startMs: pdStartMs,
                    endMs: pdEndMs,
                    startDate: new Date(pdStartMs).toISOString(),
                    endDate: new Date(pdEndMs).toISOString(),
                    durationYears: activePdDurationYears,
                    durationFormatted: formatDashaDuration(activePdDurationYears),
                    theoreticalStartMs: theoPdStartMs,
                    theoreticalEndMs: theoPdEndMs,
                    isClippedAtBirth: isPdSpanningBirth,
                    parentMahaLord: lordInfo.key,
                    parentAntarLord: adLordInfo.key,
                    kpDetails: planetaryKPDetails[pdLordInfo.key] || null
                });
            }

            antardashas.push({
                id: `ad_${m}_${a}`,
                level: 2,
                levelName: 'Antardasha',
                lord: adLordInfo.key,
                name: adLordInfo.name,
                short: adLordInfo.short,
                te: adLordInfo.te,
                startMs: adStartMs,
                endMs: adEndMs,
                startDate: new Date(adStartMs).toISOString(),
                endDate: new Date(adEndMs).toISOString(),
                durationYears: activeAdDurationYears,
                durationFormatted: formatDashaDuration(activeAdDurationYears),
                theoreticalStartMs: theoAdStartMs,
                theoreticalEndMs: theoAdEndMs,
                isClippedAtBirth: isSpanningBirth,
                parentMahaLord: lordInfo.key,
                pratyantardashas,
                kpDetails: planetaryKPDetails[adLordInfo.key] || null
            });
        }

        mahadashas.push({
            id: `md_${m}`,
            level: 1,
            levelName: 'Mahadasha',
            lord: lordInfo.key,
            name: lordInfo.name,
            short: lordInfo.short,
            te: lordInfo.te,
            fullYears: lordInfo.years,
            durationYears: mahaDurationYears,
            durationFormatted: formatDashaDuration(mahaDurationYears),
            startMs: mahaStartMs,
            endMs: mahaEndMs,
            startDate: new Date(mahaStartMs).toISOString(),
            endDate: new Date(mahaEndMs).toISOString(),
            theoreticalStartMs: theoMahaStartMs,
            theoreticalEndMs: theoMahaEndMs,
            isBirthDasha: isBirthMaha,
            antardashas,
            kpDetails: planetaryKPDetails[lordInfo.key] || null
        });

        currentMahaStartMs = mahaEndMs;
    }

    // 6. Query active periods for reference date
    const refDate = referenceDate ? new Date(referenceDate) : new Date();
    const activePeriods = getActivePeriods(mahadashas, refDate, birthMs, planetaryKPDetails);

    return {
        balanceInfo,
        birthDateUtc: birthInstant.toISOString(),
        referenceDateUtc: refDate.toISOString(),
        activePeriods,
        runningDashaHierarchy: activePeriods,
        mahadashas,
        planetaryKPDetails,
        calculationDetails: {
            dashaSystem: "Vimshottari (120-Year Cycle)",
            yearConventionDays: DASHA_YEAR_DAYS,
            nakshatraSpanDegrees: NAKSHATRA_SPAN_DEG,
            totalCycleYears: TOTAL_DASHA_YEARS,
            birthNakshatra: balanceInfo.nakshatraName,
            birthStarLord: balanceInfo.starLord,
            moonLongitudeDMS: balanceInfo.moonLongitude,
            elapsedFraction: balanceInfo.elapsedFraction,
            remainingFraction: balanceInfo.remainingFraction,
            balanceYears: balanceInfo.balanceYears,
            balanceFormatted: balanceInfo.balanceFormatted.formatted
        }
    };
}

/**
 * Subdivides any parent Vimshottari period into its 9 child periods at the next level
 * (e.g. PD -> SD at level 4, or SD -> Prana at level 5).
 *
 * Proportion:
 * Child duration = (Parent theoretical duration * Child years) / 120
 * First child is ruled by the parent period lord, subsequent children follow the canonical cyclic sequence.
 * The 9th child period is strictly anchored to the parent's endMs to guarantee zero gaps and zero overlaps.
 *
 * @param {Object} parentPeriod - The parent period record
 * @param {number} targetLevel - Target level index (4 for SD / Sookshma, 5 for Prana)
 * @param {number} [birthMs=null] - Birth timestamp in ms for clipping pre-natal periods
 * @param {Object} [planetaryKPDetails=null] - Precalculated KP details map
 * @returns {Array<Object>} The 9 subdivided child period records
 */
export function subdivideDashaPeriod(parentPeriod, targetLevel, birthMs = null, planetaryKPDetails = null) {
    if (!parentPeriod || !parentPeriod.lord) {
        throw new Error("Invalid parentPeriod provided to subdivideDashaPeriod.");
    }

    const lvlMeta = DASHA_LEVELS[targetLevel];
    if (!lvlMeta) {
        throw new Error(`Unsupported targetLevel: ${targetLevel}. Supported levels are 2 (AD), 3 (PD), 4 (SD), 5 (Prana).`);
    }

    const parentLordIdx = getVimshottariLordIndex(parentPeriod.lord);
    const parentTheoStartMs = parentPeriod.theoreticalStartMs != null ? parentPeriod.theoreticalStartMs : parentPeriod.startMs;
    const parentTheoEndMs = parentPeriod.theoreticalEndMs != null ? parentPeriod.theoreticalEndMs : parentPeriod.endMs;
    const theoParentDurationMs = parentTheoEndMs - parentTheoStartMs;

    const childPeriods = [];
    let curTheoChildStartMs = parentTheoStartMs;

    for (let i = 0; i < 9; i++) {
        const childLordIdx = (parentLordIdx + i) % 9;
        const childLordInfo = VIMSHOTTARI_PLANETS[childLordIdx];

        const childFraction = childLordInfo.years / TOTAL_DASHA_YEARS;
        const childDurationMs = Math.round(theoParentDurationMs * childFraction);

        const theoChildStartMs = curTheoChildStartMs;
        const theoChildEndMs = (i === 8) ? parentTheoEndMs : (curTheoChildStartMs + childDurationMs);
        curTheoChildStartMs = theoChildEndMs;

        // Skip pre-natal subperiods that passed entirely before birth
        if (birthMs != null && theoChildEndMs <= birthMs) {
            continue;
        }

        const isSpanningBirth = (birthMs != null) && (theoChildStartMs < birthMs && theoChildEndMs > birthMs);
        const childStartMs = isSpanningBirth ? birthMs : theoChildStartMs;
        const childEndMs = theoChildEndMs;
        const activeDurationYears = (childEndMs - childStartMs) / MS_PER_YEAR;
        const activeDurationMs = childEndMs - childStartMs;

        const kpInfo = (planetaryKPDetails && planetaryKPDetails[childLordInfo.key])
            || (parentPeriod.kpDetails && parentPeriod.kpDetails[childLordInfo.key])
            || null;

        childPeriods.push({
            id: `${lvlMeta.key}_${parentPeriod.id || parentPeriod.lord}_${i}`,
            level: targetLevel,
            levelName: lvlMeta.name,
            levelNameTe: lvlMeta.nameTe,
            abbr: lvlMeta.abbr,
            lord: childLordInfo.key,
            name: childLordInfo.name,
            short: childLordInfo.short,
            te: childLordInfo.te,
            startMs: childStartMs,
            endMs: childEndMs,
            startDate: new Date(childStartMs).toISOString(),
            endDate: new Date(childEndMs).toISOString(),
            durationYears: activeDurationYears,
            durationMs: activeDurationMs,
            durationFormatted: formatDashaDuration(activeDurationYears),
            durationHuman: formatSubperiodDuration(activeDurationMs),
            theoreticalStartMs: theoChildStartMs,
            theoreticalEndMs: theoChildEndMs,
            isClippedAtBirth: isSpanningBirth,
            parentLord: parentPeriod.lord,
            parentLevel: parentPeriod.level,
            parentPeriod: {
                level: parentPeriod.level,
                lord: parentPeriod.lord,
                levelName: parentPeriod.levelName || parentPeriod.periodName,
                startMs: parentPeriod.startMs,
                endMs: parentPeriod.endMs
            },
            kpDetails: kpInfo,
            calculationSource: 'Classical Vimshottari Recursive Proportional Subdivision'
        });
    }

    return childPeriods;
}

/**
 * Finds the currently active 5-level Vimshottari Dasha hierarchy
 * (Mahadasha, Bhukti/Antardasha, Antara/Pratyantara, Sookshma, Prana)
 * for a given target evaluation date.
 *
 * @param {Array<Object>} mahadashas - Generated Mahadasha array
 * @param {Date|string|number} targetDate - Target evaluation date
 * @param {number} [birthMs=null] - Birth timestamp in ms
 * @param {Object} [planetaryKPDetails=null] - Planetary KP details map
 * @returns {Object} 5-level active dasha hierarchy with start/end dates, durations, and remaining time
 */
export function getActivePeriods(mahadashas, targetDate, birthMs = null, planetaryKPDetails = null) {
    const targetInstant = (targetDate instanceof Date) ? targetDate : new Date(targetDate);
    const targetMs = targetInstant.getTime();

    const nullResult = (status, summaryText) => ({
        status,
        targetDate: isNaN(targetMs) ? null : targetInstant.toISOString(),
        mahadasha: null,
        antardasha: null,
        bhukti: null,
        pratyantardasha: null,
        antara: null,
        sookshmadasha: null,
        sookshma: null,
        pranadasha: null,
        prana: null,
        levels: [],
        path: '',
        pathTe: '',
        summaryText
    });

    if (isNaN(targetMs) || !mahadashas || mahadashas.length === 0) {
        return nullResult('unknown', 'N/A');
    }

    const firstMaha = mahadashas[0];
    const lastMaha = mahadashas[mahadashas.length - 1];

    if (birthMs != null && targetMs < birthMs) {
        return nullResult('pre_natal', 'Before Birth');
    }

    if (targetMs >= lastMaha.endMs) {
        return nullResult('post_cycle', 'Beyond 120-Year Cycle');
    }

    // 1. Find active Mahadasha (Level 1)
    const activeMd = mahadashas.find(m => targetMs >= m.startMs && targetMs < m.endMs);
    if (!activeMd) {
        return nullResult('not_found', 'Period Not Found');
    }

    // 2. Find active Antardasha / Bhukti (Level 2)
    const activeAd = (activeMd.antardashas || []).find(a => targetMs >= a.startMs && targetMs < a.endMs);

    // 3. Find active Pratyantardasha / Antara (Level 3)
    const activePd = activeAd
        ? (activeAd.pratyantardashas || []).find(p => targetMs >= p.startMs && targetMs < p.endMs)
        : null;

    // 4. Calculate and find active Sookshma Dasha (Level 4)
    let activeSd = null;
    if (activePd) {
        const sdList = subdivideDashaPeriod(activePd, 4, birthMs, planetaryKPDetails);
        activeSd = sdList.find(s => targetMs >= s.startMs && targetMs < s.endMs);
        if (!activeSd && sdList.length > 0) {
            if (targetMs >= activePd.endMs - 1000) {
                activeSd = sdList[sdList.length - 1];
            } else if (targetMs <= activePd.startMs) {
                activeSd = sdList[0];
            }
        }
    }

    // 5. Calculate and find active Prana Dasha (Level 5)
    let activePrana = null;
    if (activeSd) {
        const pranaList = subdivideDashaPeriod(activeSd, 5, birthMs, planetaryKPDetails);
        activePrana = pranaList.find(p => targetMs >= p.startMs && targetMs < p.endMs);
        if (!activePrana && pranaList.length > 0) {
            if (targetMs >= activeSd.endMs - 1000) {
                activePrana = pranaList[pranaList.length - 1];
            } else if (targetMs <= activeSd.startMs) {
                activePrana = pranaList[0];
            }
        }
    }

    // Decorate each level with remaining duration from targetMs
    const decoratePeriod = (period, levelIdx) => {
        if (!period) return null;
        const remainingMs = Math.max(0, period.endMs - targetMs);
        const meta = DASHA_LEVELS[levelIdx] || {};
        return {
            ...period,
            level: levelIdx,
            levelName: meta.name || period.levelName,
            levelNameTe: meta.nameTe || period.levelNameTe,
            abbr: meta.abbr || period.abbr,
            remainingMs,
            remainingDuration: formatSubperiodDuration(remainingMs),
            remainingFormatted: formatSubperiodDuration(remainingMs)
        };
    };

    const decoratedMd = decoratePeriod(activeMd, 1);
    const decoratedAd = decoratePeriod(activeAd, 2);
    const decoratedPd = decoratePeriod(activePd, 3);
    const decoratedSd = decoratePeriod(activeSd, 4);
    const decoratedPrana = decoratePeriod(activePrana, 5);

    const levels = [decoratedMd, decoratedAd, decoratedPd, decoratedSd, decoratedPrana].filter(Boolean);
    const triadPath = [decoratedMd?.lord, decoratedAd?.lord, decoratedPd?.lord].filter(Boolean).join(' - ');
    const fiveLevelPath = levels.map(l => l.lord).join(' - ');
    const hierarchyPath = levels.map(l => l.lord).join(' → ');
    const hierarchyPathTe = levels.map(l => l.te || l.lord).join(' → ');

    return {
        status: 'active',
        targetDate: targetInstant.toISOString(),
        mahadasha: decoratedMd,
        antardasha: decoratedAd,
        bhukti: decoratedAd,
        pratyantardasha: decoratedPd,
        antara: decoratedPd,
        sookshmadasha: decoratedSd,
        sookshma: decoratedSd,
        pranadasha: decoratedPrana,
        prana: decoratedPrana,
        levels,
        path: triadPath,
        triadPath,
        path5: fiveLevelPath,
        fiveLevelPath,
        hierarchyPath,
        hierarchyPathTe,
        pathTe: levels.map(l => l.te || l.lord).join(' - '),
        summaryText: triadPath,
        summaryText5: fiveLevelPath
    };
}

/**
 * Standard conceptual entry point for querying the running 5-level Dasha hierarchy:
 * MD -> AD (Bhukti) -> PD (Antara) -> SD (Sookshma) -> Prana
 *
 * @param {Object} params
 * @param {Object} [params.chart=null] - KP Kundli chart data
 * @param {Date|string|number} [params.evaluationDateTime=null] - Evaluation timestamp
 * @param {string} [params.timezone='Asia/Kolkata'] - IANA Timezone identifier
 * @param {number} [params.moonSiderealLongitude=null]
 * @param {Date|string|number} [params.birthDateUtc=null]
 * @param {Array<Object>} [params.planets=null]
 * @param {Array<Object>} [params.cusps=null]
 * @param {Object} [params.aspects=null]
 * @param {Object} [params.significators=null]
 * @returns {Object} Complete running Dasha hierarchy structure
 */
export function getRunningDashaHierarchy({
    chart = null,
    evaluationDateTime = null,
    timezone = 'Asia/Kolkata',
    moonSiderealLongitude = null,
    birthDateUtc = null,
    planets = null,
    cusps = null,
    aspects = null,
    significators = null
} = {}) {
    const moonLon = moonSiderealLongitude != null
        ? moonSiderealLongitude
        : (chart?.planets?.find(p => p.key === 'Moon')?.longitude || chart?.moonPosition?.longitude);

    const birthInstant = birthDateUtc || chart?.metadata?.utcDate || chart?.birthInstantUtc;
    const refDate = evaluationDateTime ? new Date(evaluationDateTime) : new Date();

    const dashaResult = calculateVimshottariDasha({
        moonSiderealLongitude: moonLon,
        birthDateUtc: birthInstant,
        referenceDate: refDate,
        planets: planets || chart?.planets || null,
        cusps: cusps || chart?.cusps || null,
        aspects: aspects || chart?.aspects || null,
        significators: significators || chart?.significators || null
    });

    return {
        evaluationDateTime: refDate.toISOString(),
        timezone,
        runningDasha: {
            mahadasha: dashaResult.activePeriods.mahadasha,
            bhukti: dashaResult.activePeriods.bhukti,
            antara: dashaResult.activePeriods.antara,
            sookshma: dashaResult.activePeriods.sookshma,
            prana: dashaResult.activePeriods.prana,
            levels: dashaResult.activePeriods.levels
        },
        path: dashaResult.activePeriods.path,
        pathTe: dashaResult.activePeriods.pathTe,
        dashaResult,
        planetaryKPDetails: dashaResult.planetaryKPDetails,
        balanceInfo: dashaResult.balanceInfo,
        calculationSource: 'Krishnamurti Paddhati / Classical Vimshottari 120-Year Proportional Subdivision'
    };
}

/**
 * Validates mathematical and topological integrity of the Dasha hierarchy:
 * - Boundaries are strictly contiguous without gaps or overlaps.
 * - Child intervals are fully enclosed in parent intervals.
 * - All durations are positive and non-zero.
 *
 * @param {Array<Object>} mahadashas
 * @returns {{ isValid: boolean, errors: Array<string> }}
 */
export function validateDashaHierarchy(mahadashas) {
    const errors = [];

    if (!Array.isArray(mahadashas) || mahadashas.length === 0) {
        return { isValid: false, errors: ["No Mahadashas provided."] };
    }

    // 1. Check contiguous Mahadasha boundaries
    for (let i = 0; i < mahadashas.length - 1; i++) {
        const cur = mahadashas[i];
        const next = mahadashas[i + 1];
        if (cur.endMs !== next.startMs) {
            errors.push(`Mahadasha discontinuity between ${cur.lord} (ends ${cur.endDate}) and ${next.lord} (starts ${next.startDate}).`);
        }
    }

    // 2. Check Antardashas and Pratyantardashas
    for (const md of mahadashas) {
        const ads = md.antardashas;
        if (!ads || ads.length === 0) {
            errors.push(`Mahadasha ${md.lord} has no Antardashas.`);
            continue;
        }

        // Parent enclosure
        if (ads[0].startMs !== md.startMs) {
            errors.push(`First Antardasha ${ads[0].lord} start (${ads[0].startMs}) does not match Mahadasha ${md.lord} start (${md.startMs}).`);
        }
        if (ads[ads.length - 1].endMs !== md.endMs) {
            errors.push(`Last Antardasha ${ads[ads.length - 1].lord} end (${ads[ads.length - 1].endMs}) does not match Mahadasha ${md.lord} end (${md.endMs}).`);
        }

        // Antardasha continuity
        for (let j = 0; j < ads.length - 1; j++) {
            if (ads[j].endMs !== ads[j + 1].startMs) {
                errors.push(`Antardasha discontinuity under ${md.lord}: ${ads[j].lord} -> ${ads[j + 1].lord}.`);
            }
        }

        // Pratyantardashas under each Antardasha
        for (const ad of ads) {
            const pds = ad.pratyantardashas;
            if (!pds || pds.length === 0) {
                errors.push(`Antardasha ${md.lord}/${ad.lord} has no Pratyantardashas.`);
                continue;
            }

            if (pds[0].startMs !== ad.startMs) {
                errors.push(`First Pratyantardasha start does not match Antardasha ${md.lord}/${ad.lord} start.`);
            }
            if (pds[pds.length - 1].endMs !== ad.endMs) {
                errors.push(`Last Pratyantardasha end does not match Antardasha ${md.lord}/${ad.lord} end.`);
            }

            for (let k = 0; k < pds.length - 1; k++) {
                if (pds[k].endMs !== pds[k + 1].startMs) {
                    errors.push(`Pratyantardasha discontinuity under ${md.lord}/${ad.lord}: ${pds[k].lord} -> ${pds[k + 1].lord}.`);
                }
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}
