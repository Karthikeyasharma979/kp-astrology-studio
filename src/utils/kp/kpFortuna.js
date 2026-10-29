/**
 * Krishnamurti Paddhati (KP) Part of Fortune (Fortuna / Sahaja Bhagya)
 *
 * In KP Astrology, K.S. Krishnamurti (KP Reader III) defines Fortuna:
 * Fortuna = Ascendant + Moon - Sun (Nirayana Sidereal degrees)
 * In KP, this identical formula is applied for both Day and Night births.
 */

import { resolveKPLongitude } from './kpSubLord.js';
import { getKPPlanetHouse } from './kpHouses.js';

/**
 * Calculates KP Part of Fortune (Fortuna / Sahaja Bhagya)
 *
 * @param {Object} params
 * @param {number} params.lagnaLongitude - Sidereal longitude of Ascendant in degrees
 * @param {number} params.moonLongitude - Sidereal longitude of Moon in degrees
 * @param {number} params.sunLongitude - Sidereal longitude of Sun in degrees
 * @param {Array<Object>} [params.cusps] - 12 Placidus cusps
 * @param {number} [params.ayanamsha=0] - KP Ayanamsha in degrees
 * @returns {Object|null} Complete KP Fortuna entity matching Planet Table schema
 */
export function calculateKPFortuna({
    lagnaLongitude,
    moonLongitude,
    sunLongitude,
    cusps = [],
    ayanamsha = 0
}) {
    if (lagnaLongitude == null || moonLongitude == null || sunLongitude == null) {
        return null;
    }

    const fortunaSidereal = (((lagnaLongitude + moonLongitude - sunLongitude) % 360.0) + 360.0) % 360.0;
    const resolved = resolveKPLongitude(fortunaSidereal);
    const house = cusps && cusps.length === 12 ? getKPPlanetHouse(fortunaSidereal, cusps) : 1;

    return {
        key: 'Fortuna',
        name: 'Fortuna',
        displayNameEn: 'Fortuna (Part of Fortune)',
        sanskrit: 'Sahaja Bhagya',
        short: 'Fo',
        te: 'ఫార్చ్యూనా (భాగ్య బిందువు)',
        tropicalLongitude: (((fortunaSidereal + ayanamsha) % 360.0) + 360.0) % 360.0,
        longitude: fortunaSidereal,
        signIndex: resolved.signIndex,
        sign: resolved.sign,
        signLord: resolved.signLord,
        degreeInSign: resolved.degreeInSign,
        nakshatra: resolved.nakshatra,
        nakshatraIndex: resolved.nakshatraIndex,
        starLord: resolved.starLord,
        subLord: resolved.subLord,
        subSubLord: resolved.subSubLord,
        house,
        isRetrograde: false,
        isPoint: true,
        speedDegPerDay: 0
    };
}

