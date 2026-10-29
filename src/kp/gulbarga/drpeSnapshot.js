/**
 * Day-Rise Planetary Effect (DRPE) Daily Snapshot Module
 *
 * In Theory of Short Prediction (TSP), planet positions are computed once per day
 * at 00:00 UTC (= 05:30 IST) for everyone.
 *
 * Day boundary:
 * - A question judged at 05:29:59 IST uses the previous day's snapshot (23:59:59 UTC).
 * - 05:30:00 IST onwards uses today's snapshot (00:00:00 UTC).
 * - Equivalently: snapshot date = UTC date of the judgment instant.
 *
 * Caches snapshots in memory per date so that changing numbers or settings
 * does not recompute the ephemeris.
 */

import { calculateKPKundli, KP_AYANAMSHA_MODES } from '../../services/kpCalculator.js';

/**
 * In-memory snapshot cache keyed by YYYY-MM-DD
 * @type {Map<string, Object>}
 */
const SNAPSHOT_CACHE = new Map();

/**
 * Returns the YYYY-MM-DD snapshot date for any judgment instant.
 *
 * @param {Date|string|number} instant - Date object, ISO string, or timestamp
 * @returns {string} Date string in 'YYYY-MM-DD' format
 */
export function snapshotDateFor(instant) {
    const d = (instant instanceof Date) ? instant : new Date(instant);
    if (isNaN(d.getTime())) {
        throw new Error(`Invalid judgment instant: ${instant}`);
    }

    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

const SIGN_SHORT_CODES = [
    'Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi',
    'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'
];

/**
 * Computes or retrieves the cached DRPE 00:00 UTC snapshot for a date
 *
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {boolean} [forceRefresh=false]
 * @returns {Object} Snapshot with planets map, list, and Moon lords
 */
export function getSnapshot(dateStr, forceRefresh = false) {
    if (!forceRefresh && SNAPSHOT_CACHE.has(dateStr)) {
        return SNAPSHOT_CACHE.get(dateStr);
    }

    // Compute chart at 00:00 UTC (lat 0, lon 0, timezone UTC)
    // Planet sidereal longitudes are geocentric apparent and independent of terrestrial coordinates.
    const chart = calculateKPKundli({
        birthDate: dateStr,
        birthTime: '00:00',
        lat: 0,
        lon: 0,
        timezone: 'UTC',
        ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW,
        nodeMode: 'mean'
    });

    const planetsMap = {};
    const planetsList = [];

    for (const p of chart.planets) {
        const signIdx = p.signIndex ?? p.sign?.id ?? 0;
        const signShort = SIGN_SHORT_CODES[signIdx] || 'Ar';
        const signFull = p.sign?.en || p.sign?.name || p.sign || 'Aries';

        const pInfo = {
            key: p.key,
            name: p.name,
            te: p.te,
            sign: signShort,
            signFull,
            signIndex: signIdx,
            signLord: p.signLord,
            degreeInSign: p.degreeInSign,
            longitude: p.longitude,
            nakshatra: p.nakshatra?.name || p.nakshatra || '',
            starLord: p.starLord,
            subLord: p.subLord,
            subSubLord: p.subSubLord
        };

        planetsMap[p.key] = pInfo;
        planetsList.push(pInfo);
    }

    // Moon lords
    const moon = planetsMap['Moon'] || {};
    const moonLords = {
        sign: moon.signFull || 'Pisces',
        signShort: moon.sign || 'Pi',
        signIndex: moon.signIndex || 0,
        signLord: moon.signLord || '',
        star: moon.starLord || '',
        starLord: moon.starLord || '',
        sub: moon.subLord || '',
        subLord: moon.subLord || '',
        subSub: moon.subSubLord || '',
        subSubLord: moon.subSubLord || '',
        degreeInSign: moon.degreeInSign || 0,
        longitude: moon.longitude || 0
    };

    // Format display date (e.g. 27-Oct-2026)
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedDate = `${d}-${months[Number(m) - 1]}-${y}`;

    const snapshot = {
        date: dateStr,
        formattedDate,
        timestampUtc: `${dateStr}T00:00:00.000Z`,
        timestampLabel: `Planets as of ${formattedDate} 05:30 IST / 00:00 UTC`,
        planets: planetsMap,
        planetsList,
        moonLords
    };

    SNAPSHOT_CACHE.set(dateStr, snapshot);
    return snapshot;
}

/**
 * Clears the snapshot cache (primarily for tests)
 */
export function clearSnapshotCache() {
    SNAPSHOT_CACHE.clear();
}
