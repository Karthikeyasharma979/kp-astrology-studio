/**
 * Krishnamurti Paddhati (KP) Ruling Planets Engine
 *
 * Computes Ruling Planets (RP) strictly at the specific time and geographic place
 * of judgment / query (Prashna / Horary), NEVER from birth data.
 *
 * Core KP Ruling Planets:
 * 1. Day Lord (Vara Adhipati)
 * 2. Ascendant Sign Lord (Lagna Rasi Lord)
 * 3. Ascendant Star Lord (Lagna Nakshatra Lord)
 * 4. Moon Sign Lord (Chandra Rasi Lord)
 * 5. Moon Star Lord (Chandra Nakshatra Lord)
 * Optional refinements:
 * - Ascendant Sub Lord & Moon Sub Lord
 * - Node Representatives (Rahu / Ketu representing conjunct/sign lords)
 */

import * as Astronomy from 'astronomy-engine';
import { resolveKPLongitude } from './kpSubLord.js';
import { calculateKPHouses } from './kpHouses.js';
import { getKPAyanamsha, KP_AYANAMSHA_MODES } from './kpAyanamsha.js';
import { resolveLocalToUTC } from '../../services/locationService.js';

export const DAY_LORDS = [
    { dayIndex: 0, dayName: 'Sunday', planet: 'Sun', te: 'ఆదివారం (సూర్యుడు)' },
    { dayIndex: 1, dayName: 'Monday', planet: 'Moon', te: 'సోమవారం (చంద్రుడు)' },
    { dayIndex: 2, dayName: 'Tuesday', planet: 'Mars', te: 'మంగళవారం (కుజుడు)' },
    { dayIndex: 3, dayName: 'Wednesday', planet: 'Mercury', te: 'బుధవారం (బుధుడు)' },
    { dayIndex: 4, dayName: 'Thursday', planet: 'Jupiter', te: 'గురువారం (గురువు)' },
    { dayIndex: 5, dayName: 'Friday', planet: 'Venus', te: 'శుక్రవారం (శుక్రుడు)' },
    { dayIndex: 6, dayName: 'Saturday', planet: 'Saturn', te: 'శనివారం (శని)' }
];

export const HORA_CHALDEAN_ORDER = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];

export const DAY_LORD_CHALDEAN_INDEX = {
    Sun: 0,
    Venus: 1,
    Mercury: 2,
    Moon: 3,
    Saturn: 4,
    Jupiter: 5,
    Mars: 6
};

/**
 * Calculates the astronomical planetary hour (Hora) and Hora Lord for any date, time, and location
 *
 * @param {Object} params
 * @param {string} params.date - 'YYYY-MM-DD'
 * @param {string} params.time - 'HH:MM' or 'HH:MM:SS'
 * @param {number} [params.lat=17.3850] - Latitude
 * @param {number} [params.lon=78.4867] - Longitude
 * @param {string} [params.timezone='Asia/Kolkata'] - IANA Timezone
 * @returns {Object} { horaPlanet, horaPlanetTe, horaIndex, dayLord, sunrise, sunset, horaNameEn, horaNameTe }
 */
export function calculateKPHora({
    date,
    time,
    lat = 17.3850,
    lon = 78.4867,
    timezone = 'Asia/Kolkata'
}) {
    if (!date || !time) return null;

    const DAY_LORDS_MAP = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const TELUGU_PLANET_NAMES = {
        Sun: 'సూర్యుడు',
        Moon: 'చంద్రుడు',
        Mars: 'కుజుడు',
        Mercury: 'బుధుడు',
        Jupiter: 'గురుడు',
        Venus: 'శుక్రుడు',
        Saturn: 'శని',
        Rahu: 'రాహువు',
        Ketu: 'కేతువు'
    };

    const utcDate = resolveLocalToUTC(date, time, timezone);
    const obs = new Astronomy.Observer(lat, lon, 0);

    const [y, m, d] = date.split('-').map(Number);
    const approxMidnightUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    const searchStart = new Date(approxMidnightUtc.getTime() - 12 * 3600 * 1000);

    const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, searchStart, 2);
    if (!sunrise) return null;
    const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, -1, sunrise.date, 1);
    if (!sunset) return null;

    let dayLordPlanet;
    let horaIndex;
    let slotStartTime;
    let slotEndTime;
    let isDayHora = true;

    const getWeekdayInTz = (dateObj) => {
        try {
            const weekdayStr = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(dateObj);
            const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
            return DAY_LORDS_MAP[dayMap[weekdayStr] ?? dateObj.getUTCDay()];
        } catch {
            return DAY_LORDS_MAP[dateObj.getUTCDay()];
        }
    };

    const t = utcDate.getTime();
    if (t < sunrise.date.getTime()) {
        isDayHora = false;
        const prevSearch = new Date(searchStart.getTime() - 24 * 3600 * 1000);
        const prevSunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, prevSearch, 2);
        const prevSunset = prevSunrise ? Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, -1, prevSunrise.date, 1) : null;

        if (prevSunrise && prevSunset) {
            dayLordPlanet = getWeekdayInTz(prevSunrise.date);

            const nightDuration = sunrise.date.getTime() - prevSunset.date.getTime();
            const nightHoraDuration = nightDuration / 12;
            const elapsed = Math.max(0, t - prevSunset.date.getTime());
            const slot = Math.min(11, Math.max(0, Math.floor(elapsed / nightHoraDuration)));
            horaIndex = 12 + slot;
            slotStartTime = new Date(prevSunset.date.getTime() + slot * nightHoraDuration);
            slotEndTime = new Date(prevSunset.date.getTime() + (slot + 1) * nightHoraDuration);
        } else {
            dayLordPlanet = 'Sun';
            horaIndex = 0;
            slotStartTime = sunrise.date;
            slotEndTime = new Date(sunrise.date.getTime() + 3600000);
        }
    } else if (t < sunset.date.getTime()) {
        isDayHora = true;
        dayLordPlanet = getWeekdayInTz(sunrise.date);

        const dayDuration = sunset.date.getTime() - sunrise.date.getTime();
        const dayHoraDuration = dayDuration / 12;
        const elapsed = Math.max(0, t - sunrise.date.getTime());
        const slot = Math.min(11, Math.max(0, Math.floor(elapsed / dayHoraDuration)));
        horaIndex = slot;
        slotStartTime = new Date(sunrise.date.getTime() + slot * dayHoraDuration);
        slotEndTime = new Date(sunrise.date.getTime() + (slot + 1) * dayHoraDuration);
    } else {
        isDayHora = false;
        const nextSunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, sunset.date, 1);
        dayLordPlanet = getWeekdayInTz(sunrise.date);

        if (nextSunrise) {
            const nightDuration = nextSunrise.date.getTime() - sunset.date.getTime();
            const nightHoraDuration = nightDuration / 12;
            const elapsed = Math.max(0, t - sunset.date.getTime());
            const slot = Math.min(11, Math.max(0, Math.floor(elapsed / nightHoraDuration)));
            horaIndex = 12 + slot;
            slotStartTime = new Date(sunset.date.getTime() + slot * nightHoraDuration);
            slotEndTime = new Date(sunset.date.getTime() + (slot + 1) * nightHoraDuration);
        } else {
            horaIndex = 12;
            slotStartTime = sunset.date;
            slotEndTime = new Date(sunset.date.getTime() + 3600000);
        }
    }

    const startIndex = DAY_LORD_CHALDEAN_INDEX[dayLordPlanet] ?? 0;
    const horaPlanet = HORA_CHALDEAN_ORDER[(startIndex + horaIndex) % 7];

    const formatTime = (d) => {
        if (!d) return '';
        try {
            return new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(d);
        } catch {
            return d.toTimeString().slice(0, 5);
        }
    };

    return {
        dayLord: dayLordPlanet,
        dayLordTe: TELUGU_PLANET_NAMES[dayLordPlanet] || dayLordPlanet,
        horaIndex: horaIndex + 1,
        horaOfPeriod: (horaIndex % 12) + 1,
        isDayHora,
        horaPlanet,
        horaPlanetTe: TELUGU_PLANET_NAMES[horaPlanet] || horaPlanet,
        horaNameEn: `${horaPlanet} Hora (${horaIndex + 1})`,
        horaNameTe: `${TELUGU_PLANET_NAMES[horaPlanet] || horaPlanet} హోర (${horaIndex + 1})`,
        horaStart: formatTime(slotStartTime),
        horaEnd: formatTime(slotEndTime),
        sunrise: formatTime(sunrise.date),
        sunset: formatTime(sunset.date)
    };
}

/**
 * Calculates KP Ruling Planets for a specific judgment instant and place
 *
 * @param {Object} params
 * @param {string} params.date - 'YYYY-MM-DD'
 * @param {string} params.time - 'HH:MM'
 * @param {number} params.lat - Geographic latitude
 * @param {number} params.lon - Geographic longitude
 * @param {string} params.timezone - IANA timezone (e.g. 'Asia/Kolkata')
 * @param {string} params.ayanamshaMode - KP_NEW | KP_ORIGINAL
 * @returns {Object} Complete Ruling Planets hierarchy
 */
export function calculateKPRulingPlanets({
    date,
    time,
    lat,
    lon,
    timezone = 'Asia/Kolkata',
    ayanamshaMode = KP_AYANAMSHA_MODES.KP_NEW
}) {
    if (!date || !time || lat === undefined || lon === undefined) {
        return null;
    }

    const utcDate = resolveLocalToUTC(date, time, timezone);
    const astroTime = Astronomy.MakeTime(utcDate);
    const ayanamsha = getKPAyanamsha(astroTime, ayanamshaMode);

    // 1. Day Lord
    // Local date components in timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short'
    });
    const weekdayStr = formatter.format(utcDate);
    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    let dayIndex = dayMap[weekdayStr] !== undefined ? dayMap[weekdayStr] : utcDate.getUTCDay();

    // KP day runs sunrise to sunrise: before local sunrise, the previous weekday rules
    const localMidnightUtc = resolveLocalToUTC(date, '00:00', timezone);
    const localSunrise = Astronomy.SearchRiseSet(
        Astronomy.Body.Sun,
        new Astronomy.Observer(lat, lon, 0),
        +1,
        localMidnightUtc,
        1
    );
    if (localSunrise && utcDate.getTime() < localSunrise.date.getTime()) {
        dayIndex = (dayIndex + 6) % 7;
    }
    const dayLordInfo = DAY_LORDS[dayIndex];

    // 2. Ascendant at Judgment Instant
    const housesResult = calculateKPHouses({ utcDate, lat, lon, ayanamshaMode });
    const lagnaCusp = housesResult.ascendant;

    // 3. Moon Position at Judgment Instant
    const moonVector = Astronomy.GeoVector(Astronomy.Body.Moon, astroTime, true);
    const moonEc = Astronomy.Ecliptic(moonVector);
    const moonSidereal = ((moonEc.elon - ayanamsha + 360.0) % 360.0);
    const moonResolved = resolveKPLongitude(moonSidereal);

    // 3b. Part of Fortune (KP: Asc + Moon - Sun, same formula day and night)
    const sunVector = Astronomy.GeoVector(Astronomy.Body.Sun, astroTime, true);
    const sunSidereal = ((Astronomy.Ecliptic(sunVector).elon - ayanamsha + 360.0) % 360.0);
    const fortunaSidereal = (((lagnaCusp.siderealLongitude + moonSidereal - sunSidereal) % 360.0) + 360.0) % 360.0;
    const fortunaResolved = resolveKPLongitude(fortunaSidereal);

    // 4. Rahu & Ketu Positions (Mean Nodes)
    const t = astroTime.tt / 36525.0;
    const meanNodeSayana = (125.04452 - 1934.136261 * t + 0.0020708 * t * t + 3600000) % 360;
    const rahuSidereal = (meanNodeSayana - ayanamsha + 360.0) % 360.0;
    const ketuSidereal = (rahuSidereal + 180.0) % 360.0;

    const rahuResolved = resolveKPLongitude(rahuSidereal);
    const ketuResolved = resolveKPLongitude(ketuSidereal);

    // Node representation: Rahu/Ketu represent their Sign Lord and Star Lord
    const nodeAgents = [
        {
            node: 'Rahu',
            signLord: rahuResolved.signLord,
            starLord: rahuResolved.starLord,
            represents: [rahuResolved.signLord, rahuResolved.starLord]
        },
        {
            node: 'Ketu',
            signLord: ketuResolved.signLord,
            starLord: ketuResolved.starLord,
            represents: [ketuResolved.signLord, ketuResolved.starLord]
        }
    ];

    // 4b. Planetary Hour (Tathkala Hora Lord)
    const horaInfo = calculateKPHora({ date, time, lat, lon, timezone });

    // Standard KP Ruling Planets in Classical Strength Order:
    // 1. Ascendant Star Lord (Strongest immediate trigger)
    // 2. Ascendant Sign Lord
    // 3. Moon Star Lord
    // 4. Moon Sign Lord
    // 5. Day Lord (Vara Adhipati)
    // 6. Tathkala Hora Lord (Tatkala Hora Adhipati)
    const corePlanets = [
        { role: 'Ascendant Star Lord', planet: lagnaCusp.starLord, strength: 1 },
        { role: 'Ascendant Sign Lord', planet: lagnaCusp.signLord, strength: 2 },
        { role: 'Moon Star Lord', planet: moonResolved.starLord, strength: 3 },
        { role: 'Moon Sign Lord', planet: moonResolved.signLord, strength: 4 },
        { role: 'Day Lord', planet: dayLordInfo.planet, strength: 5 }
    ];

    if (horaInfo?.horaPlanet) {
        corePlanets.push({
            role: 'Tathkala Hora Lord',
            planet: horaInfo.horaPlanet,
            strength: 6,
            horaIndex: horaInfo.horaIndex,
            horaOfPeriod: horaInfo.horaOfPeriod,
            isDayHora: horaInfo.isDayHora,
            horaStart: horaInfo.horaStart,
            horaEnd: horaInfo.horaEnd,
            horaNameEn: horaInfo.horaNameEn,
            horaNameTe: horaInfo.horaNameTe
        });
    }

    // Include sub lords for precision queries
    const extendedPlanets = [
        ...corePlanets,
        { role: 'Ascendant Sub Lord', planet: lagnaCusp.subLord, strength: 7 },
        { role: 'Moon Sub Lord', planet: moonResolved.subLord, strength: 8 }
    ];

    const uniqueRulingPlanets = Array.from(new Set(corePlanets.map(p => p.planet)));

    return {
        judgmentTime: {
            localDate: date,
            localTime: time,
            timezone,
            utcIso: utcDate.toISOString(),
            latitude: lat,
            longitude: lon
        },
        dayLord: dayLordInfo,
        horaLord: horaInfo,
        tathkalaHora: horaInfo,
        lagna: {
            longitude: lagnaCusp.siderealLongitude,
            sign: lagnaCusp.sign,
            signLord: lagnaCusp.signLord,
            starLord: lagnaCusp.starLord,
            subLord: lagnaCusp.subLord,
            subSubLord: lagnaCusp.subSubLord,
            degreeInSign: lagnaCusp.degreeInSign
        },
        moon: {
            longitude: moonSidereal,
            sign: moonResolved.sign,
            signLord: moonResolved.signLord,
            starLord: moonResolved.starLord,
            subLord: moonResolved.subLord
        },
        fortuna: {
            longitude: fortunaSidereal,
            sign: fortunaResolved.sign,
            signLord: fortunaResolved.signLord,
            starLord: fortunaResolved.starLord,
            subLord: fortunaResolved.subLord
        },
        coreRulingPlanets: corePlanets,
        extendedRulingPlanets: extendedPlanets,
        uniqueRulingPlanets,
        nodeAgents
    };
}
