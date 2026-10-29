/**
 * Master Krishnamurti Paddhati (KP) Astronomical Calculation Service
 *
 * Ephemeris: VSOP87 / ELP2000-82 via astronomy-engine
 * Coordinate System: Geocentric Apparent Ecliptic
 * House System: Placidus (Semi-diurnal / Semi-nocturnal Arc Trisection)
 * Ayanamsha: Configurable Krishnamurti (Default: KP New / Swiss Ephemeris Mode 5)
 * Sub Division: Vimshottari 120-year cycle Sub Lords and Sub-Sub Lords
 */

import * as Astronomy from 'astronomy-engine';
import { resolveLocalToUTC } from './locationService.js';
import { formatDMS } from '../utils/nakshatraUtils.js';
import { getKPAyanamsha, KP_AYANAMSHA_MODES } from '../utils/kp/kpAyanamsha.js';
import { resolveKPLongitude, SIGN_LORDS } from '../utils/kp/kpSubLord.js';
import { calculateKPHouses, getKPPlanetHouse, normalizeDeg } from '../utils/kp/kpHouses.js';
import { computeHoraryCusps } from '../utils/kp/horaryCusps.js';
import { calculateKPSignificators } from '../utils/kp/kpSignificators.js';
import { calculatePlanetaryAspects, ASPECT_CONVENTIONS, RAHU_KETU_ASPECT_MODES, ORB_MODES } from '../utils/kp/kpAspects.js';
import { calculateKPHora } from '../utils/kp/kpRulingPlanets.js';
import { calculateKPFortuna } from '../utils/kp/kpFortuna.js';
import { calculateVimshottariDasha } from '../utils/kp/vimshottariDasha.js';

export { formatDMS, KP_AYANAMSHA_MODES, calculatePlanetaryAspects, calculateKPHora, calculateKPFortuna, calculateVimshottariDasha, ASPECT_CONVENTIONS, RAHU_KETU_ASPECT_MODES, ORB_MODES, computeHoraryCusps };

let swissCalculator = null;
if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
    try {
        const modPath = '../../server/services/swissEphemerisService.js';
        const s = await import(/* @vite-ignore */ modPath);
        swissCalculator = s.calculateKPKundliSwiss;
    } catch {
        swissCalculator = null;
    }
}

const BODIES = [
    { key: 'Sun', body: Astronomy.Body.Sun, name: 'Sun', sanskrit: 'Surya', short: 'Su', te: 'సూర్యుడు' },
    { key: 'Moon', body: Astronomy.Body.Moon, name: 'Moon', sanskrit: 'Chandra', short: 'Mo', te: 'చంద్రుడు' },
    { key: 'Mars', body: Astronomy.Body.Mars, name: 'Mars', sanskrit: 'Mangal', short: 'Ma', te: 'కుజుడు' },
    { key: 'Mercury', body: Astronomy.Body.Mercury, name: 'Mercury', sanskrit: 'Budha', short: 'Me', te: 'బుధుడు' },
    { key: 'Jupiter', body: Astronomy.Body.Jupiter, name: 'Jupiter', sanskrit: 'Guru', short: 'Ju', te: 'గురువు' },
    { key: 'Venus', body: Astronomy.Body.Venus, name: 'Venus', sanskrit: 'Shukra', short: 'Ve', te: 'శుక్రుడు' },
    { key: 'Saturn', body: Astronomy.Body.Saturn, name: 'Saturn', sanskrit: 'Shani', short: 'Sa', te: 'శని' }
];

/**
 * Computes shortest angular difference handling 0/360 wraparound safely
 */
function angularDiff(deg2, deg1) {
    return ((deg2 - deg1 + 540) % 360) - 180;
}

/**
 * Master KP Kundli Calculation Function
 * Supports controlled calculation interface:
 * - Default: Swiss Ephemeris (when running in Node.js backend/testing environment)
 * - Fallback / Client-side: astronomy-engine (when running in browser without backend, or when engine === 'astronomy_engine')
 *
 * @param {Object} params
 * @param {string} params.birthDate - 'YYYY-MM-DD'
 * @param {string} params.birthTime - 'HH:MM' (24-hour)
 * @param {number} params.lat - Geographic latitude
 * @param {number} params.lon - Geographic longitude
 * @param {string} params.timezone - IANA timezone (e.g. 'Asia/Kolkata')
 * @param {string} params.ayanamshaMode - KP_NEW (default) | KP_ORIGINAL | KP_STRAIGHT
 * @param {string} params.nodeMode - 'mean' (default) | 'true'
 * @param {string} [params.engine='auto'] - 'auto' | 'swiss_ephemeris' | 'astronomy_engine'
 * @returns {Object} Complete KP Kundli data
 */
export function calculateKPKundli({
    birthDate,
    birthTime,
    lat,
    lon,
    timezone = 'Asia/Kolkata',
    ayanamshaMode = KP_AYANAMSHA_MODES.KP_NEW,
    nodeMode = 'mean',
    engine = 'auto',
    chartMode = 'natal',
    kpNumber = null,
    ascendantPoint = 'start',
    horarySeed = null
}) {
    // If Swiss Ephemeris is available and not explicitly disabled, use authoritative engine
    if (engine !== 'astronomy_engine' && swissCalculator) {
        return swissCalculator({
            birthDate,
            birthTime,
            lat,
            lon,
            timezone,
            ayanamshaMode,
            nodeMode,
            chartMode,
            kpNumber,
            ascendantPoint,
            horarySeed
        });
    }

    return calculateKPKundliFallback({
        birthDate,
        birthTime,
        lat,
        lon,
        timezone,
        ayanamshaMode,
        nodeMode,
        chartMode,
        kpNumber,
        ascendantPoint,
        horarySeed
    });
}

/**
 * Existing client-side calculation engine using astronomy-engine
 * Retained as documented rollback path and client-side fallback.
 */
export function calculateKPKundliFallback({
    birthDate,
    birthTime,
    lat,
    lon,
    timezone = 'Asia/Kolkata',
    ayanamshaMode = KP_AYANAMSHA_MODES.KP_NEW,
    nodeMode = 'mean',
    chartMode = 'natal',
    kpNumber = null,
    ascendantPoint = 'start',
    horarySeed = null
}) {
    const startTime = performance.now();

    // 1. Resolve exact UTC Date using historical IANA timezone rules
    const utcDate = resolveLocalToUTC(birthDate, birthTime, timezone);
    const astroTime = Astronomy.MakeTime(utcDate);
    const t = astroTime.tt / 36525.0;
    const ayanamsha = getKPAyanamsha(astroTime, ayanamshaMode);

    // 2. Placidus House Cusps
    let cusps;
    let lagnaCusp;
    let isFallback = false;
    let houseSystemName = "Placidus (Standard KP)";
    let horaryDetails = null;

    if (chartMode === 'horary' && kpNumber != null) {
        const horaryRes = computeHoraryCusps(
            kpNumber,
            { lat, lon, utcDate },
            ayanamsha,
            { ascendantPoint, useSwiss: false }
        );
        cusps = horaryRes.cusps;
        lagnaCusp = horaryRes.cusps[0];
        houseSystemName = `Placidus (KP Horary #${kpNumber})`;
        horaryDetails = {
            chartMode: 'horary',
            kpNumber: Number(kpNumber),
            ascendantPoint,
            ramcDeg: horaryRes.ramcDeg,
            horarySeed: horarySeed || null,
            kpEntry: horaryRes.kpEntry
        };
    } else {
        const houseCalculation = calculateKPHouses({
            utcDate,
            lat,
            lon,
            ayanamshaMode
        });
        cusps = houseCalculation.cusps;
        lagnaCusp = houseCalculation.ascendant;
        isFallback = houseCalculation.isFallback;
        houseSystemName = houseCalculation.houseSystemName;
    }

    // 3. Physical Grahas (Sun through Saturn)
    const timeNext = Astronomy.MakeTime(new Date(utcDate.getTime() + 3600 * 1000));
    const planets = [];

    for (const b of BODIES) {
        // Apparent Geocentric Position
        const v = Astronomy.GeoVector(b.body, astroTime, true);
        const ec = Astronomy.Ecliptic(v);
        const tropicalLon = ec.elon;
        const siderealLon = normalizeDeg(tropicalLon - ayanamsha);

        // Retrograde detection across 0/360 boundary
        const vNext = Astronomy.GeoVector(b.body, timeNext, true);
        const ecNext = Astronomy.Ecliptic(vNext);
        const diff = angularDiff(ecNext.elon, ec.elon);
        const isRetrograde = (b.key !== 'Sun' && b.key !== 'Moon') && (diff < 0);

        // KP Positional Hierarchy (Sign, Star Lord, Sub Lord, Sub-Sub Lord)
        const resolved = resolveKPLongitude(siderealLon);

        // KP Placidus House Position
        const house = getKPPlanetHouse(siderealLon, cusps);

        planets.push({
            key: b.key,
            name: b.name,
            sanskrit: b.sanskrit,
            short: b.short,
            te: b.te,
            tropicalLongitude: tropicalLon,
            longitude: siderealLon,
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
            isRetrograde,
            speedDegPerDay: diff * 24.0
        });
    }

    // 4. Lunar Nodes: Rahu & Ketu
    let rahuTropical;
    let nodeLabel;

    if (nodeMode === 'true') {
        // True Lunar Node from lunar orbit plane intersection
        // Approximate True Node oscillation around Mean Node (Meeus formula)
        const meanNode = (125.04452 - 1934.136261 * t + 0.0020708 * t * t + 3600000) % 360;
        const sunMeanAnomaly = (357.52910 + 35999.05030 * t) * (Math.PI / 180.0);
        const moonMeanAnomaly = (134.96340 + 477198.8676 * t) * (Math.PI / 180.0);
        const moonArgLat = (93.27209 + 483202.0175 * t) * (Math.PI / 180.0);
        const moonElong = (297.85020 + 445267.1114 * t) * (Math.PI / 180.0);

        const trueNodeCorr = -1.4979 * Math.sin(2 * (moonArgLat - moonElong))
            - 0.5332 * Math.sin(2 * moonArgLat)
            - 0.1776 * Math.sin(2 * moonMeanAnomaly)
            + 0.1448 * Math.sin(2 * moonElong);

        rahuTropical = normalizeDeg(meanNode + trueNodeCorr);
        nodeLabel = 'True Node';
    } else {
        // Mean Lunar Node (IAU standard / Jean Meeus)
        rahuTropical = normalizeDeg(125.04452 - 1934.136261 * t + 0.0020708 * t * t + 3600000);
        nodeLabel = 'Mean Node';
    }

    const ketuTropical = normalizeDeg(rahuTropical + 180.0);
    const rahuSidereal = normalizeDeg(rahuTropical - ayanamsha);
    const ketuSidereal = normalizeDeg(ketuTropical - ayanamsha);

    const rahuResolved = resolveKPLongitude(rahuSidereal);
    const ketuResolved = resolveKPLongitude(ketuSidereal);

    const rahuHouse = getKPPlanetHouse(rahuSidereal, cusps);
    const ketuHouse = getKPPlanetHouse(ketuSidereal, cusps);

    planets.push({
        key: 'Rahu',
        name: `Rahu (${nodeLabel})`,
        sanskrit: 'Rahu',
        short: 'Ra',
        te: 'రాహువు',
        tropicalLongitude: rahuTropical,
        longitude: rahuSidereal,
        signIndex: rahuResolved.signIndex,
        sign: rahuResolved.sign,
        signLord: rahuResolved.signLord,
        degreeInSign: rahuResolved.degreeInSign,
        nakshatra: rahuResolved.nakshatra,
        nakshatraIndex: rahuResolved.nakshatraIndex,
        starLord: rahuResolved.starLord,
        subLord: rahuResolved.subLord,
        subSubLord: rahuResolved.subSubLord,
        house: rahuHouse,
        isRetrograde: true, // Lunar nodes are traditionally always in retrograde progression
        speedDegPerDay: -0.05295
    });

    planets.push({
        key: 'Ketu',
        name: `Ketu (${nodeLabel})`,
        sanskrit: 'Ketu',
        short: 'Ke',
        te: 'కేతువు',
        tropicalLongitude: ketuTropical,
        longitude: ketuSidereal,
        signIndex: ketuResolved.signIndex,
        sign: ketuResolved.sign,
        signLord: ketuResolved.signLord,
        degreeInSign: ketuResolved.degreeInSign,
        nakshatra: ketuResolved.nakshatra,
        nakshatraIndex: ketuResolved.nakshatraIndex,
        starLord: ketuResolved.starLord,
        subLord: ketuResolved.subLord,
        subSubLord: ketuResolved.subSubLord,
        house: ketuHouse,
        isRetrograde: true,
        speedDegPerDay: -0.05295
    });

    // 5. 4-Fold KP House Significators
    const significators = calculateKPSignificators(planets, cusps);

    // 6. Placidus Houses Representation for Visual Chart Rendering
    const chartHouses = cusps.map((cusp, i) => {
        const houseNum = i + 1;
        const planetsInHouse = planets.filter(p => p.house === houseNum);
        return {
            houseNumber: houseNum,
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

    // Quick access reference points
    const moonPlanet = planets.find(p => p.key === 'Moon');
    const sunPlanet = planets.find(p => p.key === 'Sun');

    // Part of Fortune (KP Nirayana: Ascendant + Moon - Sun)
    const fortuna = calculateKPFortuna({
        lagnaLongitude: lagnaCusp.siderealLongitude,
        moonLongitude: moonPlanet.longitude,
        sunLongitude: sunPlanet.longitude,
        cusps,
        ayanamsha
    });

    const execMs = performance.now() - startTime;

    const calculatedAspects = calculatePlanetaryAspects(planets, cusps);

    return {
        lagna: lagnaCusp,
        lagnaLord: lagnaCusp.signLord,
        planets,
        fortuna,
        allPlanets: fortuna ? [...planets, fortuna] : planets,
        cusps,
        houses: chartHouses,
        significators,
        aspects: calculatedAspects,
        moonSign: moonPlanet.sign,
        moonPosition: moonPlanet,
        sunSign: sunPlanet.sign,
        sunPosition: sunPlanet,
        nakshatra: moonPlanet.nakshatra,
        subLord: moonPlanet.subLord,
        hora: calculateKPHora({ date: birthDate, time: birthTime, lat, lon, timezone }),
        dasha: calculateVimshottariDasha({
            moonSiderealLongitude: moonPlanet.longitude,
            birthDateUtc: utcDate,
            planets,
            cusps,
            aspects: calculatedAspects,
            significators
        }),
        metadata: {
            utcDate: utcDate.toISOString(),
            ayanamshaDeg: ayanamsha.toFixed(6),
            ayanamshaFormatted: formatDMS(ayanamsha),
            ayanamshaMode,
            nodeMode,
            chartMode,
            houseSystem: houseSystemName,
            isExtremeLatitudeFallback: isFallback,
            executionTimeMs: execMs.toFixed(2),
            ephemeris: "VSOP87 / ELP2000-82 (astronomy-engine)",
            ...(horaryDetails || {})
        }
    };
}
