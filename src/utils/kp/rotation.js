/**
 * Krishnamurti Paddhati (KP) House Rotation (Bhavat Bhavam) Engine
 *
 * Rotation renumbers houses from a selected house perspective (1–12),
 * e.g., rotate to 7 to evaluate spouse's matters, 5 for children.
 *
 * Mathematical Mapping:
 * - rotatedHouse(h, r)  = ((h - r + 12) % 12) + 1
 * - originalHouse(R, r) = ((R - 1 + r - 1) % 12) + 1
 *
 * Rotation only renumbers houses; cusp degrees, zodiac signs, and planetary
 * coordinates NEVER move. Base ephemeris is never recalculated.
 */

import { calculateKPSignificators } from './kpSignificators.js';
import { calculatePlanetaryAspects } from './kpAspects.js';

/**
 * Maps an original house number h (1..12) to the rotated house number from perspective r (1..12)
 * Example r = 7: original VII -> I, VIII -> II, ..., VI -> XII.
 *
 * @param {number} h - Original house number (1..12)
 * @param {number} r - Target rotation house (1..12)
 * @returns {number} Rotated house number (1..12)
 */
export function rotatedHouse(h, r = 1) {
    const orig = Number(h);
    const rot = Number(r) || 1;
    return (((orig - rot) % 12 + 12) % 12) + 1;
}

/**
 * Maps a rotated house number R (1..12) back to the original house number
 * Example r = 7: rotated I -> original VII, rotated II -> original VIII.
 *
 * @param {number} R - Rotated house number (1..12)
 * @param {number} r - Target rotation house (1..12)
 * @returns {number} Original house number (1..12)
 */
export function originalHouse(R, r = 1) {
    const rotH = Number(R);
    const rot = Number(r) || 1;
    return (((rotH - 1 + rot - 1) % 12 + 12) % 12) + 1;
}

/**
 * Pure view-layer transform: applies house rotation to a calculated KP chart.
 * Reuses existing planetary coordinates, cusp degrees, and ayanamsha.
 *
 * @param {Object} chart - KP Kundli result object
 * @param {number} r - Rotation target house (1..12, default 1)
 * @returns {Object} Rotated chart view
 */
export function applyRotation(chart, r = 1) {
    const rot = Math.max(1, Math.min(12, Math.floor(Number(r) || 1)));
    if (!chart) return chart;

    if (rot === 1) {
        return {
            ...chart,
            rotateTo: 1,
            isRotated: false
        };
    }

    const origCusps = chart.rawCusps || chart.cusps;
    const origPlanets = chart.rawPlanets || chart.planets;

    // 1. Construct 12 rotated cusps where index 0 is rotated house 1 (original cusp rot)
    const rotatedCusps = [];
    for (let R = 1; R <= 12; R++) {
        const origH = originalHouse(R, rot);
        const origCusp = origCusps[origH - 1];
        rotatedCusps.push({
            ...origCusp,
            houseNumber: R,
            originalHouseNumber: origH,
            rotatedFrom: origH
        });
    }

    // 2. Map house occupancy for planets
    const rotatedPlanets = origPlanets.map(p => {
        const origH = p.originalHouse ?? p.house;
        const rotH = rotatedHouse(origH, rot);
        return {
            ...p,
            originalHouse: origH,
            house: rotH
        };
    });

    // 3. Recompute 4-fold significators for the rotated cusps and planets
    const rotatedSignificators = calculateKPSignificators(rotatedPlanets, rotatedCusps);

    // 4. Recompute planetary aspects with rotated houses
    const rotatedAspects = calculatePlanetaryAspects(rotatedPlanets, rotatedCusps);

    // 5. Build visual chart houses array
    const chartHouses = rotatedCusps.map((cusp, i) => {
        const houseNum = i + 1;
        const planetsInHouse = rotatedPlanets.filter(p => p.house === houseNum);
        return {
            houseNumber: houseNum,
            originalHouseNumber: cusp.originalHouseNumber,
            cuspLongitude: cusp.siderealLongitude,
            signIndex: cusp.signIndex,
            sign: cusp.sign,
            signLord: cusp.signLord,
            starLord: cusp.starLord,
            subLord: cusp.subLord,
            subSubLord: cusp.subSubLord,
            planets: planetsInHouse
        };
    });

    const rotatedLagna = rotatedCusps[0];

    return {
        ...chart,
        rawCusps: origCusps,
        rawPlanets: origPlanets,
        lagna: rotatedLagna,
        lagnaLord: rotatedLagna.signLord,
        cusps: rotatedCusps,
        planets: rotatedPlanets,
        houses: chartHouses,
        significators: rotatedSignificators,
        aspects: rotatedAspects,
        rotateTo: rot,
        isRotated: true,
        rotatedLagnaLabel: `House ${rot} as Lagna`
    };
}
