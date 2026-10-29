/**
 * Ruling Planets Adapter for Classic Gulbarga
 *
 * Adapts existing app RP output (from calculateKPRulingPlanets)
 * into the standardized shape needed by evaluateClassicGulbarga().
 */

import { calculateKPRulingPlanets } from '../../utils/kp/kpRulingPlanets.js';

/**
 * Computes and adapts Ruling Planets for a designated judgment instant and place.
 *
 * @param {Object} params
 * @param {string} params.date - 'YYYY-MM-DD'
 * @param {string} params.time - 'HH:MM'
 * @param {number} [params.lat=17.3850] - Default: Hyderabad
 * @param {number} [params.lon=78.4867]
 * @param {string} [params.timezone='Asia/Kolkata']
 * @returns {Object} Adapted RP object
 */
export function getAdaptedRulingPlanets({
    date,
    time,
    lat = 17.3850,
    lon = 78.4867,
    timezone = 'Asia/Kolkata'
}) {
    const rpRaw = calculateKPRulingPlanets({
        date,
        time,
        lat,
        lon,
        timezone
    });

    if (!rpRaw) {
        return {
            ascSignLord: '',
            ascStarLord: '',
            ascSubLord: '',
            moonSignLord: '',
            moonStarLord: '',
            moonSubLord: '',
            dayLord: '',
            fortunaStarLord: '',
            coreRulingPlanets: [],
            extendedRulingPlanets: [],
            uniqueRulingPlanets: []
        };
    }

    return {
        ascSignLord: rpRaw.lagna?.signLord || '',
        ascStarLord: rpRaw.lagna?.starLord || '',
        ascSubLord: rpRaw.lagna?.subLord || '',
        ascSubSubLord: rpRaw.lagna?.subSubLord || '',
        moonSignLord: rpRaw.moon?.signLord || '',
        moonStarLord: rpRaw.moon?.starLord || '',
        moonSubLord: rpRaw.moon?.subLord || '',
        dayLord: rpRaw.dayLord?.planet || '',
        horaLord: rpRaw.horaLord?.horaPlanet || '',
        tathkalaHora: rpRaw.horaLord || null,
        fortunaStarLord: rpRaw.fortuna?.starLord || '',
        lagna: rpRaw.lagna,
        moon: rpRaw.moon,
        coreRulingPlanets: rpRaw.coreRulingPlanets || [],
        extendedRulingPlanets: rpRaw.extendedRulingPlanets || [],
        uniqueRulingPlanets: rpRaw.uniqueRulingPlanets || [],
        nodeAgents: rpRaw.nodeAgents || []
    };
}
