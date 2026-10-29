/**
 * Krishnamurti Paddhati (KP) Horary Cusps Calculation Engine
 *
 * Implements authoritative KP Prashna (Horary) Cusps:
 * 1. Sidereal Ascendant degree is fixed by chosen KP Number (1–249)
 *    (beginning of segment, or midpoint if ascendantPoint === 'mid').
 * 2. Tropical target Ascendant: ascTrop = ascSid + ayanamsha(judgment time).
 * 3. Exact RAMC (Right Ascension of Mid-Heaven) is solved for which Placidus
 *    Ascendant matches ascTrop.
 * 4. Placidus intermediate cusps are computed using semi-diurnal/semi-nocturnal
 *    arc trisection with RAMC.
 * 5. Returns all 12 Placidus sidereal cusps with complete KP star/sub/sub-sub lords.
 */

import { getKpNumberEntry } from './horaryTable.js';
import { resolveKPLongitude } from './kpSubLord.js';
import { normalizeDeg, raToEclipticLon, solvePlacidusRA } from './kpHouses.js';

const DEG2RAD = Math.PI / 180.0;
const RAD2DEG = 180.0 / Math.PI;

/**
 * Shortest angular difference between two angles in degrees [-180, +180]
 */
function angularDiff(deg2, deg1) {
    return ((deg2 - deg1 + 540) % 360) - 180;
}

/**
 * Calculates Placidus tropical Ascendant given RAMC, latitude, and obliquity
 *
 * Formula:
 *   y = cos(RAMC)
 *   x = -sin(RAMC) * cos(eps) - tan(phi) * sin(eps)
 *   ASC = atan2(y, x) (normalized to [0, 360))
 *
 * @param {number} ramcDeg - Right Ascension of Midheaven in degrees [0, 360)
 * @param {number} latDeg - Geographic latitude (-90 to +90)
 * @param {number} epsDeg - Obliquity of ecliptic in degrees
 * @returns {number} Tropical Ascendant in degrees [0, 360)
 */
export function ascFromRAMC(ramcDeg, latDeg, epsDeg) {
    const ramcRad = ramcDeg * DEG2RAD;
    const latRad = latDeg * DEG2RAD;
    const epsRad = epsDeg * DEG2RAD;

    const y = Math.cos(ramcRad);
    const x = -Math.sin(ramcRad) * Math.cos(epsRad) - Math.tan(latRad) * Math.sin(epsRad);
    return normalizeDeg(Math.atan2(y, x) * RAD2DEG);
}

/**
 * Solves for RAMC such that ascFromRAMC(RAMC, lat, eps) === targetAscDeg to < 0.01"
 *
 * Closed-form analytical root isolation followed by Newton refinement.
 *
 * @param {number} targetAscDeg - Tropical target Ascendant in degrees [0, 360)
 * @param {number} latDeg - Geographic latitude in degrees
 * @param {number} epsDeg - Obliquity of ecliptic in degrees
 * @returns {number} Converged RAMC in degrees [0, 360)
 */
export function solveRAMCForAscendant(targetAscDeg, latDeg, epsDeg) {
    const targetAsc = normalizeDeg(targetAscDeg);
    const latRad = latDeg * DEG2RAD;
    const epsRad = epsDeg * DEG2RAD;
    const ascRad = targetAsc * DEG2RAD;

    const A = Math.cos(ascRad);
    const B = Math.sin(ascRad) * Math.cos(epsRad);
    const C = -Math.sin(ascRad) * Math.tan(latRad) * Math.sin(epsRad);

    const R0 = Math.hypot(A, B);
    let initialRAMC = 0;

    if (R0 > 1e-12) {
        let arg = C / R0;
        if (arg > 1.0) arg = 1.0;
        if (arg < -1.0) arg = -1.0;
        const gamma = Math.atan2(B, A);
        const delta = Math.acos(arg);

        const cand1 = normalizeDeg((gamma + delta) * RAD2DEG);
        const cand2 = normalizeDeg((gamma - delta) * RAD2DEG);

        const err1 = Math.abs(angularDiff(ascFromRAMC(cand1, latDeg, epsDeg), targetAsc));
        const err2 = Math.abs(angularDiff(ascFromRAMC(cand2, latDeg, epsDeg), targetAsc));

        initialRAMC = err1 < err2 ? cand1 : cand2;
    }

    // Refine to < 0.0001" using analytical derivative
    let ramc = initialRAMC;
    for (let iter = 0; iter < 12; iter++) {
        const computedAsc = ascFromRAMC(ramc, latDeg, epsDeg);
        const err = angularDiff(targetAsc, computedAsc);
        if (Math.abs(err) < 1e-8) break; // < 0.000036"

        const step = 1e-5;
        const ascPlus = ascFromRAMC(ramc + step, latDeg, epsDeg);
        const deriv = angularDiff(ascPlus, computedAsc) / step;
        if (Math.abs(deriv) > 1e-6) {
            ramc = normalizeDeg(ramc + err / deriv);
        } else {
            ramc = normalizeDeg(ramc + err * 0.5);
        }
    }

    return ramc;
}

/**
 * Computes 12 Sidereal Placidus Cusps for a KP Horary Number (1–249)
 *
 * @param {number} kpNo - KP Number between 1 and 249
 * @param {Object} judgment - Judgment moment location and astronomical parameters
 * @param {number} judgment.lat - Latitude (-90 to +90)
 * @param {number} judgment.lon - Longitude (-180 to +180)
 * @param {number} [judgment.epsDeg] - True obliquity of ecliptic (defaults to standard J2000/epoch)
 * @param {Date} [judgment.utcDate] - UTC judgment moment
 * @param {number} ayanamsha - Sidereal ayanamsha in degrees
 * @param {Object} [options]
 * @param {'start' | 'mid'} [options.ascendantPoint='start'] - Use segment start or midpoint
 * @param {boolean} [options.useSwiss=true] - Prefer Swiss Ephemeris when available
 * @returns {Object} { cusps, ramcDeg, ascTargetDeg, ascSidereal, kpEntry, ascendantPoint }
 */
export function computeHoraryCusps(kpNo, judgment, ayanamsha, options = {}) {
    const kpEntry = getKpNumberEntry(kpNo);
    const ascendantPoint = options.ascendantPoint === 'mid' ? 'mid' : 'start';
    const ascSid = ascendantPoint === 'mid' ? kpEntry.midDeg : kpEntry.startDeg;

    const lat = Number(judgment.lat);
    if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new Error("Invalid latitude for horary chart. Must be between -90 and +90 degrees.");
    }

    // Determine obliquity of ecliptic
    let epsDeg = judgment.epsDeg;
    if (!epsDeg || isNaN(epsDeg)) {
        if (judgment.utcDate) {
            const jd = (judgment.utcDate.getTime() / 86400000.0) + 2440587.5;
            const t = (jd - 2451545.0) / 36525.0;
            epsDeg = 23.4392911 - (46.8150 * t) / 3600.0;
        } else {
            epsDeg = 23.4392911;
        }
    }

    // Check Placidus polar limit
    if (Math.abs(lat) >= (90.0 - epsDeg)) {
        throw new Error(`Placidus house calculation fails at extreme polar latitude (${lat.toFixed(2)}°). Latitudes must be below ~${(90.0 - epsDeg).toFixed(1)}°.`);
    }

    // Tropical target Ascendant
    const ascTrop = normalizeDeg(ascSid + ayanamsha);

    // Solve for RAMC
    const ramcDeg = solveRAMCForAscendant(ascTrop, lat, epsDeg);

    // Compute 12 Placidus tropical cusps
    let tropicalCusps = new Array(12);
    let usedEngine = 'Placidus (Standard KP / Analytical)';

    const housesArmcFn = options.houses_armc || options.sweph?.houses_armc;
    if (options.useSwiss !== false && housesArmcFn) {
        try {
            const hRes = housesArmcFn(ramcDeg, lat, epsDeg, 'P');
            if (hRes && hRes.data?.houses) {
                tropicalCusps = hRes.data.houses.map(normalizeDeg);
                usedEngine = 'Swiss Ephemeris (swe_houses_armc)';
            }
        } catch {
            // Fallback to JS Placidus below
        }
    }

    // Pure JS Placidus trisection if Swiss is offline or fallback
    if (!tropicalCusps[0]) {
        tropicalCusps[0] = ascTrop;
        tropicalCusps[6] = normalizeDeg(ascTrop + 180.0);

        const mcTropical = raToEclipticLon(ramcDeg, epsDeg);
        tropicalCusps[9] = mcTropical;
        tropicalCusps[3] = normalizeDeg(mcTropical + 180.0);

        // Cusp 11 & 5
        const ra11 = solvePlacidusRA(ramcDeg + 30.0, 1.0 / 3.0, lat, epsDeg);
        tropicalCusps[10] = raToEclipticLon(ra11, epsDeg);
        tropicalCusps[4] = normalizeDeg(tropicalCusps[10] + 180.0);

        // Cusp 12 & 6
        const ra12 = solvePlacidusRA(ramcDeg + 60.0, 2.0 / 3.0, lat, epsDeg);
        tropicalCusps[11] = raToEclipticLon(ra12, epsDeg);
        tropicalCusps[5] = normalizeDeg(tropicalCusps[11] + 180.0);

        // Cusp 2 & 8
        const ra2 = solvePlacidusRA(ramcDeg + 120.0, 2.0 / 3.0, lat, epsDeg);
        tropicalCusps[1] = raToEclipticLon(ra2, epsDeg);
        tropicalCusps[7] = normalizeDeg(tropicalCusps[1] + 180.0);

        // Cusp 3 & 9
        const ra3 = solvePlacidusRA(ramcDeg + 150.0, 1.0 / 3.0, lat, epsDeg);
        tropicalCusps[2] = raToEclipticLon(ra3, epsDeg);
        tropicalCusps[8] = normalizeDeg(tropicalCusps[2] + 180.0);
    }

    // Convert tropical cusps to KP Sidereal and resolve KP planetary hierarchy
    const cusps = tropicalCusps.map((tropDeg, index) => {
        // For cusp 1, anchor strictly to ascSid to prevent 0.000000001" floating noise
        let siderealDeg = (index === 0) ? ascSid : normalizeDeg(tropDeg - ayanamsha);
        const resolved = resolveKPLongitude(siderealDeg);

        return {
            houseNumber: index + 1,
            tropicalLongitude: tropDeg,
            siderealLongitude: siderealDeg,
            signIndex: resolved.signIndex,
            sign: resolved.sign,
            signLord: resolved.signLord,
            degreeInSign: resolved.degreeInSign,
            nakshatra: resolved.nakshatra,
            starLord: resolved.starLord,
            subLord: resolved.subLord,
            subSubLord: resolved.subSubLord
        };
    });

    return {
        cusps,
        ramcDeg,
        ascTargetDeg: ascTrop,
        ascSidereal: ascSid,
        kpEntry,
        ascendantPoint,
        engine: usedEngine
    };
}
