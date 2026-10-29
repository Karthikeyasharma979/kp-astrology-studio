import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDMS } from '../../utils/nakshatraUtils';
import { KP_TRANSLATIONS } from '../../utils/kpTranslations';
import { calculatePlanetaryLordshipMatrix, getPlanetAspectHouses, calculateKPSignificators } from '../../utils/kp/kpSignificators';
import { calculateKPHora, calculateKPRulingPlanets } from '../../utils/kp/kpRulingPlanets';
import { calculateKPFortuna } from '../../utils/kp/kpFortuna';
import { getKpNumberEntry } from '../../utils/kp/horaryTable';
import { validateKpNumber } from '../../utils/kp/random';
import { X } from 'lucide-react';

const LORD_SHORT_CODES = {
    Sun: 'Su',
    Moon: 'Mo',
    Mars: 'Ma',
    Mercury: 'Me',
    Jupiter: 'Ju',
    Venus: 'Ve',
    Saturn: 'Sa',
    Rahu: 'Ra',
    Ketu: 'Ke',
    Fortuna: 'Fo',
    Fo: 'Fo'
};

const PLANET_UPPER_CODES = {
    Sun: 'SU',
    Moon: 'MO',
    Mars: 'MA',
    Mercury: 'ME',
    Jupiter: 'JU',
    Venus: 'VE',
    Saturn: 'SA',
    Rahu: 'RA',
    Ketu: 'KE',
    Fortuna: 'FO',
    Fo: 'FO'
};

const TELUGU_PLANET_SHORTS = {
    Sun: 'సూ',
    Moon: 'చం',
    Mars: 'కు',
    Mercury: 'బు',
    Jupiter: 'గు',
    Venus: 'శు',
    Saturn: 'శ',
    Rahu: 'రా',
    Ketu: 'కే',
    Fortuna: 'ఫా',
    Fo: 'ఫా',
    sun: 'సూ',
    moon: 'చం',
    mars: 'కు',
    mercury: 'బు',
    jupiter: 'గు',
    venus: 'శు',
    saturn: 'శ',
    rahu: 'రా',
    ketu: 'కే',
    'సూర్యుడు': 'సూ',
    'చంద్రుడు': 'చం',
    'కుజుడు': 'కు',
    'బుధుడు': 'బు',
    'గురుడు': 'గు',
    'శుక్రుడు': 'శు',
    'శని': 'శ',
    'రాహువు': 'రా',
    'కేతువు': 'కే',
    'సూ': 'సూ',
    'చం': 'చం',
    'కు': 'కు',
    'బు': 'బు',
    'గు': 'గు',
    'శు': 'శు',
    'శ': 'శ',
    'రా': 'రా',
    'కే': 'కే'
};

const TELUGU_PLANET_NAMES = {
    Sun: 'సూర్యుడు',
    Moon: 'చంద్రుడు',
    Mars: 'కుజుడు',
    Mercury: 'బుధుడు',
    Jupiter: 'గురుడు',
    Venus: 'శుక్రుడు',
    Saturn: 'శని',
    Rahu: 'రాహువు',
    Ketu: 'కేతువు',
    Fortuna: 'ఫార్చ్యూనా',
    Fo: 'ఫార్చ్యూనా'
};

const ROMAN_HOUSES = {
    1: 'AS',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
    7: 'VII',
    8: 'VIII',
    9: 'IX',
    10: 'X',
    11: 'XI',
    12: 'XII'
};

const NAKSHATRA_TELUGU_NAMES = {
    Ashwini: "అశ్విని",
    Bharani: "భరణి",
    Krittika: "కృత్తిక",
    Rohini: "రోహిణి",
    Mrigashira: "మృగశిర",
    Ardra: "ఆర్ద్ర",
    Punarvasu: "పునర్వసు",
    Pushya: "పుష్యమి",
    Ashlesha: "ఆశ్లేష",
    Magha: "మఖ",
    "Purva Phalguni": "పుబ్బ",
    "Uttara Phalguni": "ఉత్తర",
    Hasta: "హస్త",
    Chitra: "చిత్త",
    Swati: "స్వాతి",
    Vishakha: "విశాఖ",
    Anuradha: "అనురాధ",
    Jyeshtha: "జ్యేష్ఠ",
    Mula: "మూల",
    "Purva Ashadha": "పూర్వాషాఢ",
    "Uttara Ashadha": "ఉత్తరాషాఢ",
    Shravana: "శ్రవణం",
    Dhanishta: "ధనిష్ఠ",
    Shatabhisha: "శతభిషం",
    "Purva Bhadrapada": "పూర్వాభాద్ర",
    "Uttara Bhadrapada": "ఉత్తరాభాద్ర",
    Revati: "రేవతి"
};

function formatLords(item, isTe = false) {
    if (!item) return '';
    const map = isTe ? TELUGU_PLANET_SHORTS : LORD_SHORT_CODES;
    const stl = map[item.starLord] || (isTe ? item.starLord?.slice(0, 1) : item.starLord?.slice(0, 2)) || '..';
    const sub = map[item.subLord] || (isTe ? item.subLord?.slice(0, 1) : item.subLord?.slice(0, 2)) || '..';
    const ssl = map[item.subSubLord] || (isTe ? item.subSubLord?.slice(0, 1) : item.subSubLord?.slice(0, 2)) || '..';
    return `${stl}, ${sub}, ${ssl}`;
}

// Compact DMS format specifically for charts to prevent mobile wrapping/clipping
function formatChartDMS(deg) {
    if (deg === undefined || deg === null || isNaN(deg)) return '';
    const num = Number(deg);
    const abs = Math.abs(num);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = Math.round(((abs - d) * 60 - m) * 60);
    return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
}

// Convert decimal degrees to DMS format for coordinates
function formatCoordinateDMS(deg, isLat = true) {
    if (deg === undefined || deg === null || isNaN(deg)) return '';
    const num = Number(deg);
    const abs = Math.abs(num);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = Math.round(((abs - d) * 60 - m) * 60);
    const dir = isLat ? (num >= 0 ? 'N' : 'S') : (num >= 0 ? 'E' : 'W');
    return `${d}° ${String(m).padStart(2, '0')}' ${String(s).padStart(2, '0')}" ${dir}`;
}

export const KPChart = ({
    kpData,
    lang = 'te',
    birthDetails = {},
    chartMode = 'natal',
    onChartModeChange,
    kpNumber = 1,
    onKpNumberChange,
    onRegenerate,
    rotateTo = 1,
    onRotateChange,
    horarySeed
}) => {
    const t = KP_TRANSLATIONS[lang] || KP_TRANSLATIONS.te;
    const isTe = lang === 'te';
    const [chartStyle, setChartStyle] = useState('south'); // 'south' | 'north'
    const [isStlMode, setIsStlMode] = useState(false); // false = Degrees, true = (STL,SUB,SSL,ASP) (Center Matrix with Aspects)
    const [isHouseSigMode, setIsHouseSigMode] = useState(false); // false = Default, true = 4-Level House Significators (1-12)
    const [selectedItem, setSelectedItem] = useState(null); // Selected Planet or Cusp for modal
    const [chartScale, setChartScale] = useState(1.0); // Dynamic chart sizing 0.75 - 1.35

    const horaryKpEntry = useMemo(() => {
        if (chartMode !== 'horary') return null;
        try {
            return getKpNumberEntry(kpNumber || 1);
        } catch {
            return null;
        }
    }, [chartMode, kpNumber]);

    const isRotated = rotateTo !== 1 || Boolean(kpData?.isRotated);

    if (!kpData) return null;

    const { lagna, cusps, planets, houses, fortuna } = kpData;

    // Part of Fortune (Fortuna)
    const resolvedFortuna = useMemo(() => {
        if (kpData?.fortuna) return kpData.fortuna;
        const sun = planets?.find(p => p.key === 'Sun');
        const moon = planets?.find(p => p.key === 'Moon');
        const asc = lagna?.longitude ?? lagna?.siderealLongitude ?? cusps?.[0]?.siderealLongitude;
        if (sun && moon && asc != null) {
            return calculateKPFortuna({
                lagnaLongitude: asc,
                moonLongitude: moon.longitude,
                sunLongitude: sun.longitude,
                cusps
            });
        }
        return null;
    }, [kpData?.fortuna, planets, lagna, cusps]);

    // Center 2x2 KP Planetary Lordship Matrix: PL(h) - (owns) (stl of) (sub of) - (drishti)
    const significatorRows = useMemo(() => {
        const matrix = kpData?.significators?.planetaryLordshipMatrix || calculatePlanetaryLordshipMatrix(planets, cusps);
        return matrix.map(row => {
            let aspectStr = row.aspectsStr || row.aspectsFormatted;
            if (!aspectStr || aspectStr === '(..)') {
                const pHouse = row.house || row.occupiedHouse;
                if (typeof pHouse === 'number' && pHouse >= 1 && pHouse <= 12) {
                    const asps = getPlanetAspectHouses(row.key, pHouse).map(a => a.house);
                    aspectStr = asps.length > 0 ? `(${asps.join(',')})` : '(..)';
                } else {
                    aspectStr = '(..)';
                }
            }
            return {
                ...row,
                code: PLANET_UPPER_CODES[row.key] || row.code,
                aspectsStr: aspectStr
            };
        });
    }, [planets, cusps, kpData]);

    // 4-Level House Significators (Houses 1 to 12) for Center Display
    const houseSignificatorRows = useMemo(() => {
        const rawSigs = kpData?.significators?.houseSignificators
            || (planets && cusps ? calculateKPSignificators(planets, cusps).houseSignificators : []);

        const map = isTe ? TELUGU_PLANET_SHORTS : LORD_SHORT_CODES;
        const formatShort = (list) => {
            if (!list || list.length === 0) return '';
            return list.map(p => {
                if (map[p]) return map[p];
                if (!p) return '';
                if (isTe) {
                    const match = String(p).match(/^[\u0C00-\u0C7F][\u0C3E-\u0C56\u0C62\u0C63\u0C4D]?[\u0C00-\u0C7F]?[\u0C3E-\u0C56]?/);
                    return match ? match[0] : String(p).slice(0, 2);
                }
                return String(p).slice(0, 2).toUpperCase();
            }).join(', ');
        };
        const formatFull = (list) => {
            if (!list || list.length === 0) return '-';
            return list.map(p => isTe ? (TELUGU_PLANET_NAMES[p] || p) : p).join(', ');
        };

        return rawSigs.map(h => ({
            houseNumber: h.houseNumber,
            signLord: h.signLord,
            l1Short: formatShort(h.level1),
            l1Full: formatFull(h.level1),
            l2Short: formatShort(h.level2),
            l2Full: formatFull(h.level2),
            l3Short: formatShort(h.level3),
            l3Full: formatFull(h.level3),
            l4Short: formatShort(h.level4),
            l4Full: formatFull(h.level4),
            allShort: formatShort(h.allSignificators || h.primarySignificators),
            allFull: formatFull(h.allSignificators || h.primarySignificators)
        }));
    }, [kpData?.significators, planets, cusps, isTe]);

    // Calculate Planetary Hour (Hora) for birth / chart time
    const horaInfo = useMemo(() => {
        if (kpData?.hora) return kpData.hora;
        const bDate = birthDetails?.birthDate || birthDetails?.date || (kpData?.metadata?.utcDate ? kpData.metadata.utcDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
        const bTime = birthDetails?.birthTime || birthDetails?.time || '10:30';
        try {
            return calculateKPHora({
                date: bDate,
                time: bTime,
                lat: birthDetails?.lat || 17.3850,
                lon: birthDetails?.lon || 78.4867,
                timezone: birthDetails?.timezone || 'Asia/Kolkata'
            });
        } catch {
            return null;
        }
    }, [kpData?.hora, kpData?.metadata?.utcDate, birthDetails]);

    // Calculate KP Ruling Planets (RP 1-5) & Node Agents (Rahu/Ketu) for this chart instant
    const rulingInfo = useMemo(() => {
        const bDate = birthDetails?.birthDate || birthDetails?.date || (kpData?.metadata?.utcDate ? kpData.metadata.utcDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
        const bTime = birthDetails?.birthTime || birthDetails?.time || '10:30';
        const bLat = birthDetails?.lat ?? 17.3850;
        const bLon = birthDetails?.lon ?? 78.4867;
        const bTz = birthDetails?.timezone || 'Asia/Kolkata';
        const bAyan = kpData?.metadata?.ayanamshaMode || birthDetails?.ayanamshaMode || 'KP_NEW';

        try {
            return calculateKPRulingPlanets({
                date: bDate,
                time: bTime,
                lat: bLat,
                lon: bLon,
                timezone: bTz,
                ayanamshaMode: bAyan
            });
        } catch (e) {
            console.warn("Could not calculate ruling planets in KPChart:", e);
            const moonP = planets?.find(p => p.key === 'Moon');
            const dLord = horaInfo?.dayLord || 'Sun';
            return {
                coreRulingPlanets: [
                    { role: 'Ascendant Star Lord', planet: lagna?.starLord || 'Mars', strength: 1 },
                    { role: 'Ascendant Sign Lord', planet: lagna?.signLord || 'Venus', strength: 2 },
                    { role: 'Moon Star Lord', planet: moonP?.starLord || 'Sun', strength: 3 },
                    { role: 'Moon Sign Lord', planet: moonP?.signLord || 'Venus', strength: 4 },
                    { role: 'Day Lord', planet: dLord, strength: 5 }
                ],
                nodeAgents: [
                    { node: 'Rahu', signLord: 'Sun', starLord: 'Ketu', represents: ['Sun', 'Ketu'] },
                    { node: 'Ketu', signLord: 'Saturn', starLord: 'Rahu', represents: ['Saturn', 'Rahu'] }
                ]
            };
        }
    }, [birthDetails, kpData, lagna, planets, horaInfo]);

    // Extract RP 1 to 5 names and Rahu & Ketu Agent representation
    const { rpPlanets, nodeAgentMessages } = useMemo(() => {
        const core = rulingInfo?.coreRulingPlanets || [];
        const p1 = core[0]?.planet || lagna?.starLord || 'Mars';
        const p2 = core[1]?.planet || lagna?.signLord || 'Venus';
        const moonP = planets?.find(p => p.key === 'Moon');
        const p3 = core[2]?.planet || moonP?.starLord || 'Sun';
        const p4 = core[3]?.planet || moonP?.signLord || 'Venus';
        const p5 = core[4]?.planet || rulingInfo?.dayLord?.planet || horaInfo?.dayLord || 'Saturn';
        const p6 = core[5]?.planet || rulingInfo?.horaLord?.horaPlanet || horaInfo?.horaPlanet;

        const list = [p1, p2, p3, p4, p5];
        if (p6) list.push(p6);
        const uniqueRp = Array.from(new Set(list));

        // Rahu & Ketu representation logic:
        // Rule: Rahu & Ketu act as agent of a planet if they are in RP (or represent an RP planet)
        const msgs = [];
        const rahuAgent = rulingInfo?.nodeAgents?.find(na => na.node === 'Rahu');
        const ketuAgent = rulingInfo?.nodeAgents?.find(na => na.node === 'Ketu');

        // Rahu
        if (rahuAgent) {
            const isRahuInRP = uniqueRp.includes('Rahu');
            const representsRP = rahuAgent.represents?.filter(p => p !== 'Rahu' && p !== 'Ketu' && uniqueRp.includes(p)) || [];

            if (isRahuInRP || representsRP.length > 0) {
                const targetPlanets = representsRP.length > 0 
                    ? representsRP 
                    : [rahuAgent.signLord].filter(Boolean);
                const targetEn = targetPlanets.join(', ');
                const targetTe = targetPlanets.map(p => TELUGU_PLANET_NAMES[p] || p).join(', ');

                msgs.push({
                    node: 'Rahu',
                    targetEn,
                    targetTe,
                    textEn: `Rahu acts as agent of ${targetEn}`,
                    textTe: `రాహువు ${targetTe} ఏజెంట్‌గా పనిచేస్తుంది`
                });
            }
        }

        // Ketu
        if (ketuAgent) {
            const isKetuInRP = uniqueRp.includes('Ketu');
            const representsRP = ketuAgent.represents?.filter(p => p !== 'Rahu' && p !== 'Ketu' && uniqueRp.includes(p)) || [];

            if (isKetuInRP || representsRP.length > 0) {
                const targetPlanets = representsRP.length > 0 
                    ? representsRP 
                    : [ketuAgent.signLord].filter(Boolean);
                const targetEn = targetPlanets.join(', ');
                const targetTe = targetPlanets.map(p => TELUGU_PLANET_NAMES[p] || p).join(', ');

                msgs.push({
                    node: 'Ketu',
                    targetEn,
                    targetTe,
                    textEn: `Ketu acts as agent of ${targetEn}`,
                    textTe: `కేతువు ${targetTe} ఏజెంట్‌గా పనిచేస్తుంది`
                });
            }
        }

        return {
            rpPlanets: { rp1: p1, rp2: p2, rp3: p3, rp4: p4, rp5: p5, rp6: p6 },
            nodeAgentMessages: msgs
        };
    }, [rulingInfo, lagna, planets, horaInfo]);

    // South Indian Chart: Fixed signs clockwise starting with Pisces at top-left
    const SOUTH_INDIAN_CELLS = [
        { signIndex: 11, label: 'Pisces', te: 'మీనం', row: 1, col: 1 },
        { signIndex: 0, label: 'Aries', te: 'మేషం', row: 1, col: 2 },
        { signIndex: 1, label: 'Taurus', te: 'వృషభం', row: 1, col: 3 },
        { signIndex: 2, label: 'Gemini', te: 'మిథునం', row: 1, col: 4 },

        { signIndex: 10, label: 'Aquarius', te: 'కుంభం', row: 2, col: 1 },
        { signIndex: 3, label: 'Cancer', te: 'కర్కాటకం', row: 2, col: 4 },

        { signIndex: 9, label: 'Capricorn', te: 'మకరం', row: 3, col: 1 },
        { signIndex: 4, label: 'Leo', te: 'సింహం', row: 3, col: 4 },

        { signIndex: 8, label: 'Sagittarius', te: 'ధనస్సు', row: 4, col: 1 },
        { signIndex: 7, label: 'Scorpio', te: 'వృశ్చికం', row: 4, col: 2 },
        { signIndex: 6, label: 'Libra', te: 'తుల', row: 4, col: 3 },
        { signIndex: 5, label: 'Virgo', te: 'కన్య', row: 4, col: 4 }
    ];

    const latStr = birthDetails.lat ? formatCoordinateDMS(birthDetails.lat, true) : '19° 04\' 22" N';
    const lonStr = birthDetails.lon ? formatCoordinateDMS(birthDetails.lon, false) : '72° 52\' 57" E';
    const placeStr = birthDetails.birthPlace || 'Mumbai, India';
    const dateStr = birthDetails.birthDate || new Date().toISOString().slice(0, 10);
    const timeStr = birthDetails.birthTime || '19:20:19';

    return (
        <div className="w-full flex flex-col items-center select-none font-mono">
            {/* Top Toolbar: [ Natal | Horary ]   KP No: [ 137 ] 🎲   Rotate: [ 1 ▾ ]   Badge */}
            <div className="w-full max-w-[920px] flex flex-wrap items-center justify-between gap-2.5 pb-2.5 mb-2 border-b border-gray-200 dark:border-white/10 text-xs sm:text-sm">
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    {/* Active Chart Type Badge (Horary / Natal determined from Form) */}
                    {chartMode === 'horary' ? (
                        <div className="inline-flex items-center gap-1.5 bg-amber-50/90 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700/60 text-xs">
                            <span className="font-bold text-amber-900 dark:text-amber-200">
                                {isTe ? `ప్రశ్న (KP #${kpNumber || ''})` : `Horary (KP #${kpNumber || ''})`}
                            </span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-300 dark:border-white/10 text-xs">
                            <span className="font-bold text-stone-700 dark:text-stone-300">
                                {isTe ? "జన్మ జాతకం" : "Natal Chart"}
                            </span>
                        </div>
                    )}

                    {/* Rotate to House: [1..12] */}
                    <div className="inline-flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-lg border border-stone-300 dark:border-white/10 text-xs">
                        <span className="font-bold text-stone-700 dark:text-stone-300 whitespace-nowrap" title="e.g. rotate to 7 to read the spouse's matters, 5 for children.">
                            {isTe ? "రొటేట్:" : "Rotate:"}
                        </span>
                        <select
                            value={rotateTo || 1}
                            onChange={(e) => onRotateChange && onRotateChange(Number(e.target.value))}
                            className="bg-white dark:bg-stone-900 text-gray-900 dark:text-white font-mono font-bold rounded px-1.5 py-0.5 border border-stone-300 dark:border-stone-700 text-xs cursor-pointer focus:outline-none"
                            title="e.g. rotate to 7 to read the spouse's matters, 5 for children."
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                                <option key={num} value={num}>
                                    {num} {num === 1 ? (isTe ? '(లగ్నం)' : '(Lagna)') : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Badge when r !== 1 */}
                    {rotateTo !== 1 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-300 text-[11px] font-bold shadow-2xs">
                            <span>{isTe ? `రొటేటెడ్: లగ్నంగా ${rotateTo}వ భావం` : `Rotated: House ${rotateTo} as Lagna`}</span>
                        </span>
                    )}
                </div>

                {/* Right: Dynamic Chart Size Controls */}
                <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-0.5 sm:gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-md border border-stone-300 dark:border-white/10 text-[10px] sm:text-[11px]">
                        <button
                            type="button"
                            disabled={chartScale <= 0.5}
                            onClick={() => setChartScale(s => Math.max(0.5, Number((s - 0.1).toFixed(2))))}
                            className="min-w-[28px] h-[26px] sm:min-w-[32px] sm:h-[28px] flex items-center justify-center px-1.5 sm:px-2 py-0.5 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-700 dark:text-stone-300 font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed touch-manipulation select-none"
                            title={isTe ? "చార్ట్ పరిమాణం తగ్గించండి (A-)" : "Decrease chart size (A-)"}
                        >
                            A-
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartScale(1.0)}
                            title={isTe ? "పరిమాణాన్ని రీసెట్ చేయండి (100%)" : "Reset size to 100%"}
                            className="px-1 text-[10px] sm:text-[11px] font-mono font-semibold text-stone-600 dark:text-stone-400 min-w-[32px] sm:min-w-[38px] text-center hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer touch-manipulation select-none"
                        >
                            {Math.round(chartScale * 100)}%
                        </button>
                        <button
                            type="button"
                            disabled={chartScale >= 1.5}
                            onClick={() => setChartScale(s => Math.min(1.5, Number((s + 0.1).toFixed(2))))}
                            className="min-w-[28px] h-[26px] sm:min-w-[32px] sm:h-[28px] flex items-center justify-center px-1.5 sm:px-2 py-0.5 hover:bg-white dark:hover:bg-stone-700 rounded text-stone-700 dark:text-stone-300 font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed touch-manipulation select-none"
                            title={isTe ? "చార్ట్ పరిమాణం పెంచండి (A+)" : "Increase chart size (A+)"}
                        >
                            A+
                        </button>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-gray-400">
                        <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-500 inline-block"></span>
                        <span className="font-mono text-[10px] sm:text-[11px] text-gray-600 dark:text-gray-300">
                            {kpData.metadata?.ayanamshaMode || 'KP New'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Subline chip in Horary Mode: #137 · Leo 14°40'00"–16°26'40" · Star: Venus · Sub: Rahu */}
            {chartMode === 'horary' && horaryKpEntry && (
                <div className="w-full max-w-[920px] -mt-0.5 mb-2 flex items-center justify-start overflow-x-auto no-scrollbar">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 font-mono text-xs font-bold shadow-2xs whitespace-nowrap">
                        <span>#{horaryKpEntry.no}</span>
                        <span>·</span>
                        <span>{isTe ? horaryKpEntry.signTe : horaryKpEntry.sign} {horaryKpEntry.startDMS.replace(/^[A-Za-z]+ /, '')}–{horaryKpEntry.endDMS.replace(/^[A-Za-z]+ /, '')}</span>
                        <span>·</span>
                        <span>{isTe ? "నక్షత్రం:" : "Star:"} <span className="font-extrabold">{isTe ? (TELUGU_PLANET_NAMES[horaryKpEntry.starLord] || horaryKpEntry.starLord) : horaryKpEntry.starLord}</span></span>
                        <span>·</span>
                        <span>{isTe ? "సబ్:" : "Sub:"} <span className="font-extrabold text-amber-700 dark:text-amber-400">{isTe ? (TELUGU_PLANET_NAMES[horaryKpEntry.subLord] || horaryKpEntry.subLord) : horaryKpEntry.subLord}</span></span>
                    </span>
                </div>
            )}

            {/* Existing Info Bar with Date, Time, Place and RP (1-5) */}
            <div className="w-full max-w-[920px] flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-gray-200 dark:border-white/10 text-xs sm:text-sm">
                {/* Left: Date, Time & Place */}
                <div className="text-left shrink-0">
                    <div className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-base">
                        {dateStr}, {timeStr}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 font-sans text-[11px] sm:text-xs">
                        <span>{placeStr}</span>
                    </div>
                </div>

                {/* Center: RP 1,2,3,4,5 Names Only & Rahu/Ketu Node Agents */}
                <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-0.5 min-w-[280px]">
                    {/* RP 1,2,3,4,5 Names Only */}
                    <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-mono">
                        <span className="font-bold text-amber-700 dark:text-amber-400 font-sans tracking-wide">
                            {isTe
                                ? (rpPlanets.rp6 ? "రూలింగ్ గ్రహాలు (1-6):" : "రూలింగ్ గ్రహాలు (1-5):")
                                : (rpPlanets.rp6 ? "Ruling Planets (1-6):" : "Ruling Planets (1-5):")}
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 bg-amber-50/90 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/70 dark:border-amber-800/40 shadow-2xs">
                            1: <span className="text-amber-700 dark:text-amber-300 font-extrabold">{isTe ? (TELUGU_PLANET_NAMES[rpPlanets.rp1] || rpPlanets.rp1) : rpPlanets.rp1}</span>
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 bg-amber-50/90 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/70 dark:border-amber-800/40 shadow-2xs">
                            2: <span className="text-amber-700 dark:text-amber-300 font-extrabold">{isTe ? (TELUGU_PLANET_NAMES[rpPlanets.rp2] || rpPlanets.rp2) : rpPlanets.rp2}</span>
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 bg-amber-50/90 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/70 dark:border-amber-800/40 shadow-2xs">
                            3: <span className="text-amber-700 dark:text-amber-300 font-extrabold">{isTe ? (TELUGU_PLANET_NAMES[rpPlanets.rp3] || rpPlanets.rp3) : rpPlanets.rp3}</span>
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 bg-amber-50/90 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/70 dark:border-amber-800/40 shadow-2xs">
                            4: <span className="text-amber-700 dark:text-amber-300 font-extrabold">{isTe ? (TELUGU_PLANET_NAMES[rpPlanets.rp4] || rpPlanets.rp4) : rpPlanets.rp4}</span>
                        </span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 bg-amber-50/90 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/70 dark:border-amber-800/40 shadow-2xs">
                            5: <span className="text-amber-700 dark:text-amber-300 font-extrabold">{isTe ? (TELUGU_PLANET_NAMES[rpPlanets.rp5] || rpPlanets.rp5) : rpPlanets.rp5}</span>
                        </span>
                        {rpPlanets.rp6 && (
                            <span className="font-bold text-gray-800 dark:text-gray-200 bg-amber-50/90 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200/70 dark:border-amber-800/40 shadow-2xs">
                                6 ({isTe ? "హోర" : "Hora"}): <span className="text-amber-700 dark:text-amber-300 font-extrabold">{isTe ? (TELUGU_PLANET_NAMES[rpPlanets.rp6] || rpPlanets.rp6) : rpPlanets.rp6}</span>
                            </span>
                        )}
                    </div>

                    {/* Subline: Rahu & Ketu Acts as agent of a planet (if in RP) + Hora Lord */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-1 text-[10px] sm:text-[11px] font-sans">
                        {nodeAgentMessages.map((msg, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/50 text-purple-800 dark:text-purple-300 font-semibold shadow-2xs"
                                title={isTe ? "రాహు/కేతువులు తాము ఉన్న రాశ్యాధిపతి కారకత్వాన్ని వహిస్తాయి" : "Rahu & Ketu act as agents for their sign lords in KP"}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                <span>{isTe ? msg.textTe : msg.textEn}</span>
                            </span>
                        ))}

                        {horaInfo && (
                            <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 font-medium font-mono text-[10px] shadow-2xs"
                                title={isTe ? `హోరాధిపతి: ${horaInfo.horaPlanetTe} (${horaInfo.horaIndex}వ హోర)` : `Hora Lord: ${horaInfo.horaPlanet} (Hora ${horaInfo.horaIndex})`}
                            >
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">{isTe ? "హోర:" : "Hora:"}</span>
                                <span className="font-bold">{isTe ? horaInfo.horaPlanetTe : horaInfo.horaPlanet}</span>
                                <span className="opacity-75">({horaInfo.horaIndex})</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* South Indian Chart: Perfect Square (1:1) Layout Across All Devices */}
            {chartStyle === 'south' ? (
                <div
                    style={{
                        containerType: 'inline-size',
                        maxWidth: `${Math.round(620 * chartScale)}px`,
                        '--chart-font-size': `calc(clamp(8px, 2.4cqi, 13.5px) * ${chartScale})`
                    }}
                    className="w-full max-w-[620px] mx-auto aspect-square transition-all duration-150"
                >
                    <div
                        className="w-full h-full aspect-square rounded-none border border-stone-400 dark:border-stone-600 bg-stone-400 dark:bg-stone-600 grid grid-cols-4 grid-rows-4 gap-[1px]"
                    >
                        {/* 12 Outer Cells - Each Cell is an Exact Square */}
                        {SOUTH_INDIAN_CELLS.map((cell) => {
                            const cellPlanets = planets.filter(p => p.signIndex === cell.signIndex);
                            const cellCusps = cusps.filter(c => c.signIndex === cell.signIndex);

                            return (
                                <div
                                    key={cell.signIndex}
                                    style={{
                                        gridRow: cell.row,
                                        gridColumn: cell.col
                                    }}
                                    className="bg-white dark:bg-stone-900 p-1 sm:p-1.5 md:p-2 flex flex-col justify-start items-start overflow-hidden relative"
                                >
                                    <div className="w-full flex flex-col gap-0.5 sm:gap-1 text-left">
                                        {/* House Cusps in Cyan / Dark Teal (#0284c7) - Strictly 1 Letter */}
                                        {cellCusps.map(c => {
                                            const cuspCode = isTe
                                                ? (c.houseNumber === 1 ? 'ల' : String(c.houseNumber))
                                                : (c.houseNumber === 1 ? 'AS' : String(c.houseNumber));
                                            const degStr = formatChartDMS(c.degreeInSign);
                                            const lordsStr = formatLords(c, isTe);

                                            return (
                                                <button
                                                    key={c.houseNumber}
                                                    type="button"
                                                    onClick={() => setSelectedItem({ type: 'cusp', data: c })}
                                                    style={{ fontSize: 'var(--chart-font-size)' }}
                                                    className="w-full text-left font-mono font-bold text-[#0284c7] dark:text-[#38bdf8] hover:underline cursor-pointer leading-tight whitespace-nowrap block tracking-tight truncate"
                                                    title={`Cusp ${c.houseNumber}${c.originalHouseNumber != null && c.originalHouseNumber !== c.houseNumber ? ` (Original House ${c.originalHouseNumber})` : ''} | ${formatDMS(c.degreeInSign)} | (${lordsStr})`}
                                                >
                                                    <span>{cuspCode}</span>{' '}
                                                    <span className="font-normal">
                                                        ({isStlMode ? lordsStr : degStr})
                                                    </span>
                                                </button>
                                            );
                                        })}

                                        {/* Planets in Crimson / Red (#b91c1c) - Strictly 1 Letter */}
                                        {cellPlanets.map(p => {
                                            const pCode = isTe
                                                ? (TELUGU_PLANET_SHORTS[p.key] || p.short)
                                                : (PLANET_UPPER_CODES[p.key] || p.short.toUpperCase());
                                            const degStr = formatChartDMS(p.degreeInSign);
                                            const lordsStr = formatLords(p, isTe);

                                            return (
                                                <button
                                                    key={p.key}
                                                    type="button"
                                                    onClick={() => setSelectedItem({ type: 'planet', data: p })}
                                                    style={{ fontSize: 'var(--chart-font-size)' }}
                                                    className={`w-full text-left font-mono font-bold hover:underline cursor-pointer leading-tight whitespace-nowrap block tracking-tight truncate ${
                                                        p.isRetrograde
                                                            ? 'text-[#dc2626] dark:text-[#f87171]'
                                                            : 'text-[#b91c1c] dark:text-[#ef4444]'
                                                    }`}
                                                    title={`${p.name} | ${formatDMS(p.degreeInSign)} | (${lordsStr})`}
                                                >
                                                    <span>{pCode}</span>
                                                    {p.isRetrograde && <span className="text-[0.85em] ml-0.5 font-bold">®</span>}{' '}
                                                    <span className="font-normal">
                                                        ({isStlMode ? lordsStr : degStr})
                                                    </span>
                                                </button>
                                            );
                                        })}

                                        {/* Fortuna (Part of Fortune) */}
                                        {resolvedFortuna && resolvedFortuna.signIndex === cell.signIndex && (
                                            <button
                                                key="fortuna"
                                                type="button"
                                                onClick={() => setSelectedItem({ type: 'planet', data: resolvedFortuna })}
                                                style={{ fontSize: 'var(--chart-font-size)' }}
                                                className="w-full text-left font-mono font-bold hover:underline cursor-pointer leading-tight whitespace-nowrap block tracking-tight truncate text-amber-700 dark:text-amber-400"
                                                title={`${resolvedFortuna.name} (Part of Fortune) | ${formatDMS(resolvedFortuna.degreeInSign)} | (${formatLords(resolvedFortuna, isTe)})`}
                                            >
                                                <span>{isTe ? 'ఫా' : 'FO'}</span>{' '}
                                                <span className="font-normal">
                                                    ({isStlMode ? formatLords(resolvedFortuna, isTe) : formatChartDMS(resolvedFortuna.degreeInSign)})
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Center 2x2 Cell: Exact Square (1:1) */}
                        <div
                            className="col-start-2 col-span-2 row-start-2 row-span-2 bg-white dark:bg-stone-900 p-1 sm:p-2 flex flex-col justify-center items-center overflow-hidden select-none"
                        >
                            {isHouseSigMode ? (
                                /* Center Matrix 2: 4-Level House Significators (Houses 1 to 12) */
                                <div
                                    style={{ fontSize: 'calc(var(--chart-font-size) * 0.92)' }}
                                    className={`w-full max-w-[460px] mx-auto h-full flex flex-col justify-between p-0.5 sm:p-1 overflow-hidden ${
                                        isTe ? 'font-telugu' : 'font-sans'
                                    } leading-tight`}
                                >
                                    {/* Table Header: Only House and All */}
                                    <div className="grid grid-cols-[30px_1fr] sm:grid-cols-[46px_1fr] items-center px-1 sm:px-2 py-0.5 font-bold text-gray-900 dark:text-white tracking-tight">
                                        <span className="text-center">{isTe ? "భావం" : "Hse"}</span>
                                        <span className="text-left pl-1.5 sm:pl-3 text-teal-700 dark:text-teal-400 font-bold" title={isTe ? "మొత్తం కారక గ్రహాలు" : "All Significators"}>
                                            {isTe ? "కారక గ్రహాలు (All)" : "All"}
                                        </span>
                                    </div>

                                    {/* 12 House Rows: Only House and All */}
                                    <div className="flex-1 flex flex-col justify-start sm:justify-around py-0.2 sm:py-0.5 overflow-y-auto no-scrollbar">
                                        {houseSignificatorRows.map((h, idx) => {
                                            const isEven = idx % 2 === 0;
                                            const hCode = isTe ? `${h.houseNumber}` : `H${h.houseNumber}`;
                                            return (
                                                <div
                                                    key={h.houseNumber}
                                                    className={`grid grid-cols-[30px_1fr] sm:grid-cols-[46px_1fr] items-center px-1 sm:px-2 py-0.5 min-h-[16px] sm:min-h-[18px] ${
                                                        isEven ? 'bg-gray-50/90 dark:bg-stone-850/70' : 'bg-transparent'
                                                    }`}
                                                >
                                                    <span className="text-center font-bold text-gray-900 dark:text-gray-100 shrink-0">
                                                        {hCode}
                                                    </span>
                                                    <span
                                                        className="text-left pl-1.5 sm:pl-3 text-teal-700 dark:text-teal-400 font-medium sm:font-semibold min-w-0 break-words leading-snug"
                                                        title={h.allFull}
                                                    >
                                                        {h.allShort || '-'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : !isStlMode ? (
                                /* Clean Centered CUSP CHART / HORARY CHART Metadata */
                                <div className="w-full h-full flex flex-col items-center justify-center text-center p-0.5 sm:p-2 text-gray-700 dark:text-gray-300 font-sans leading-tight">
                                    <h3
                                        style={{ fontSize: 'calc(var(--chart-font-size) * 1.15)' }}
                                        className="font-bold tracking-wider sm:tracking-widest uppercase text-gray-900 dark:text-white mb-0.5 sm:mb-1"
                                    >
                                        {chartMode === 'horary'
                                            ? (isTe ? "KP ప్రశ్నా చక్రం" : "HORARY CHART")
                                            : (isTe ? "KP భావ చక్రం" : "CUSP CHART")}
                                    </h3>

                                    {chartMode === 'horary' && (
                                        <div className="mb-1 text-center flex flex-col items-center">
                                            <span className="inline-block px-2 py-0.5 rounded font-mono font-extrabold text-[0.88em] bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/70 shadow-2xs">
                                                KP No: {kpNumber}
                                            </span>
                                            {horaryKpEntry && (
                                                <div style={{ fontSize: 'calc(var(--chart-font-size) * 0.78)' }} className="text-gray-600 dark:text-gray-400 font-mono mt-0.5">
                                                    Asc: {horaryKpEntry.startDMS.replace(/^[A-Za-z]+ /, '')} ({isTe ? horaryKpEntry.signTe : horaryKpEntry.sign})
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isRotated && (
                                        <div className="mb-1">
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[0.74em] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                                                {isTe ? `భావత్ భావం: ${rotateTo}వ భావం లగ్నంగా` : `Rotated: H${rotateTo} as Lagna`}
                                            </span>
                                        </div>
                                    )}

                                    <div
                                        style={{ fontSize: 'calc(var(--chart-font-size) * 0.95)' }}
                                        className="font-mono text-gray-600 dark:text-gray-400 mb-1 sm:mb-2 leading-relaxed"
                                    >
                                        <div>{isTe ? "అక్షాంశం:" : "Lat:"} {latStr}</div>
                                        <div>{isTe ? "రేఖాంశం:" : "Lng:"} {lonStr}</div>
                                        {horaInfo && (
                                            <div className="text-amber-700 dark:text-amber-400 font-bold mt-0.5">
                                                {isTe ? "హోరాధిపతి:" : "Hora Lord:"} {isTe ? horaInfo.horaPlanetTe : horaInfo.horaPlanet} ({horaInfo.horaIndex})
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        style={{ fontSize: 'calc(var(--chart-font-size) * 0.82)' }}
                                        className="text-gray-500 dark:text-gray-400 leading-snug space-y-0.5 border-t border-gray-200 dark:border-white/10 pt-1 sm:pt-1.5 w-full max-w-[240px]"
                                    >
                                        <div className="font-semibold text-gray-700 dark:text-gray-300">
                                            {isTe ? "అయనాంశ:" : "Ayan:"} <span className="font-mono text-amber-700 dark:text-amber-400">{kpData.metadata?.ayanamshaFormatted}</span> ({isTe ? "KP న్యూ" : (kpData.metadata?.ayanamshaMode || 'KP New')})
                                        </div>
                                        {chartMode === 'horary' ? (
                                            <>
                                                <div className="text-amber-700 dark:text-amber-400 font-medium">
                                                    {isTe ? "లగ్నం: సబ్ ఆరంభ బిందువు" : "Asc from: start of sub"}
                                                </div>
                                                <div>{isTe ? "ప్లాసిడస్ భావ పద్ధతి (RAMC)" : "Placidus House System (RAMC)"}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div>{isTe ? "రాహు-కేతు: ప్రామాణిక సరాసరి" : "Using Mean Node"}</div>
                                                <div>{isTe ? "ప్లాసిడస్ భావ పద్ధతి" : "Placidus House System"}</div>
                                                <div>{isTe ? "భూకేంద్ర ఖగోళ గణన" : "Geocentric Coords"}</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Center Matrix: Compact PL(h) - (owns) (stl of) (sub of) (drishti) with tight column spacing */
                                <div
                                    style={{ fontSize: 'calc(var(--chart-font-size) * 0.92)' }}
                                    className="w-full max-w-[460px] mx-auto h-full flex flex-col justify-between p-0.5 sm:p-1 overflow-hidden font-mono leading-tight"
                                >
                                    {/* Prominent Center Hora Lord Display */}
                                    {horaInfo && (
                                        <div className="w-full text-center py-0.5 px-1 mb-0.5 sm:mb-1 rounded bg-amber-50/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-300 font-bold flex items-center justify-center gap-1 shrink-0 text-[0.88em]">
                                            <span className="font-medium opacity-85">{isTe ? "హోరాధిపతి:" : "Hora:"}</span>
                                            <span className="font-extrabold text-amber-800 dark:text-amber-200">
                                                {isTe ? horaInfo.horaPlanetTe : horaInfo.horaPlanet}
                                            </span>
                                            <span className="text-[0.82em] font-semibold opacity-75">
                                                ({horaInfo.horaIndex})
                                            </span>
                                        </div>
                                    )}

                                    {/* Table Header Row: 5 Proportionally Distributed Columns with responsive headers */}
                                    <div className="grid grid-cols-[1.1fr_0.8fr_1.15fr_1.15fr_1.05fr] items-center px-0.5 sm:px-1 py-0.5 font-bold text-gray-900 dark:text-white border-b border-gray-300 dark:border-white/10 tracking-tighter sm:tracking-tight text-center">
                                        <span className="text-center whitespace-nowrap">{isTe ? "గ్రహం(భ)" : "PL(h)"}</span>
                                        <span className="text-center whitespace-nowrap">
                                            <span className="hidden sm:inline">{isTe ? "(స్వంతం)" : "(owns)"}</span>
                                            <span className="sm:hidden">{isTe ? "(స్వ)" : "(own)"}</span>
                                        </span>
                                        <span className="text-center text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                                            <span className="hidden sm:inline">{isTe ? "(నక్షత్రం)" : "(stl of)"}</span>
                                            <span className="sm:hidden">{isTe ? "(నక్ష)" : "(stl)"}</span>
                                        </span>
                                        <span className="text-center text-amber-700 dark:text-amber-400 whitespace-nowrap">
                                            <span className="hidden sm:inline">{isTe ? "(సబ్)" : "(sub of)"}</span>
                                            <span className="sm:hidden">{isTe ? "(సబ్)" : "(sub)"}</span>
                                        </span>
                                        <span className="text-center text-teal-700 dark:text-teal-400 whitespace-nowrap" title={isTe ? "దృష్టి భావాలు (Aspects)" : "Aspected Houses (Aspects / Drishti)"}>
                                            <span className="hidden sm:inline">{isTe ? "(దృష్టి)" : "(asp)"}</span>
                                            <span className="sm:hidden">{isTe ? "(దృ)" : "(asp)"}</span>
                                        </span>
                                    </div>

                                    {/* 9 Planet Rows: 5 Grid columns matching header 1-to-1 */}
                                    <div className="flex-1 flex flex-col justify-around py-0.2 sm:py-0.5">
                                        {significatorRows.map((row, idx) => {
                                            const pCode = isTe ? (TELUGU_PLANET_SHORTS[row.key] || row.code) : row.code;
                                            const isEven = idx % 2 === 0;
                                            return (
                                                <div
                                                    key={row.key}
                                                    className={`grid grid-cols-[1.1fr_0.8fr_1.15fr_1.15fr_1.05fr] items-center px-0.5 sm:px-1 py-0.2 sm:py-0.5 tabular-nums tracking-tighter ${
                                                        isEven ? 'bg-gray-50/90 dark:bg-stone-850/70' : 'bg-transparent'
                                                    }`}
                                                >
                                                    <span className="text-center font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                        {pCode}({row.house}){row.isRetro ? '®' : ''}
                                                    </span>
                                                    <span className="text-center text-gray-600 dark:text-gray-400 whitespace-nowrap">{row.ownsStr}</span>
                                                    <span className="text-center text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap">{row.stlOfStr}</span>
                                                    <span className="text-center text-amber-700 dark:text-amber-400 font-semibold whitespace-nowrap">{row.subOfStr}</span>
                                                    <span className="text-center text-teal-600 dark:text-teal-400 font-semibold whitespace-nowrap">{row.aspectsStr || '(..)'}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* North Indian Diamond Chart Style */
                <div
                    style={{
                        maxWidth: `${Math.round(620 * chartScale)}px`,
                        '--chart-font-size': `calc(clamp(8px, 2.4cqi, 13.5px) * ${chartScale})`
                    }}
                    className="w-full max-w-[620px] mx-auto aspect-square rounded-none border border-stone-400 dark:border-stone-600 p-2 sm:p-4 bg-white dark:bg-stone-900 shadow-sm overflow-hidden relative"
                >
                    <svg viewBox="0 0 400 400" className="w-full h-full stroke-gray-400 dark:stroke-stone-600 stroke-1 fill-none">
                        <rect x="5" y="5" width="390" height="390" className="stroke-1 stroke-gray-400 dark:stroke-stone-600" />
                        <line x1="5" y1="5" x2="395" y2="395" />
                        <line x1="395" y1="5" x2="5" y2="395" />
                        <polygon points="200,5 395,200 200,395 5,200" className="stroke-1 stroke-gray-400 dark:stroke-stone-600" />
                    </svg>

                    {houses.map((h, idx) => {
                        const positions = [
                            { top: '25%', left: '50%' }, { top: '15%', left: '30%' }, { top: '30%', left: '15%' },
                            { top: '50%', left: '25%' }, { top: '70%', left: '15%' }, { top: '85%', left: '30%' },
                            { top: '75%', left: '50%' }, { top: '85%', left: '70%' }, { top: '70%', left: '85%' },
                            { top: '50%', left: '75%' }, { top: '30%', left: '85%' }, { top: '15%', left: '70%' }
                        ];
                        const pos = positions[idx];
                        const housePlanets = h.planets;
                        const cuspData = cusps[idx];
                        const cuspCode = isTe
                            ? (h.houseNumber === 1 ? 'ల' : String(h.houseNumber))
                            : (h.houseNumber === 1 ? 'AS' : String(h.houseNumber));
                        const cuspDeg = formatDMS(cuspData?.degreeInSign);
                        const cuspLords = formatLords(cuspData, isTe);

                        return (
                            <div
                                key={h.houseNumber}
                                style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}
                                className="absolute flex flex-col items-center pointer-events-auto text-center max-w-[110px]"
                            >
                                <button
                                    onClick={() => setSelectedItem({ type: 'cusp', data: cuspData })}
                                    style={{ fontSize: 'var(--chart-font-size)' }}
                                    className="text-left font-mono font-bold text-[#0284c7] dark:text-[#38bdf8] leading-tight"
                                    title={`Cusp ${h.houseNumber}${cuspData?.originalHouseNumber != null && cuspData.originalHouseNumber !== h.houseNumber ? ` (Original House ${cuspData.originalHouseNumber})` : ''} | ${cuspDeg} | (${cuspLords})`}
                                >
                                    {cuspCode} ({isStlMode ? cuspLords : cuspDeg})
                                </button>
                                <div className="flex flex-col gap-0.5 items-center mt-0.5">
                                    {housePlanets.map(p => {
                                        const pCode = isTe ? (TELUGU_PLANET_SHORTS[p.key] || p.short) : (PLANET_UPPER_CODES[p.key] || p.short.toUpperCase());
                                        const pDeg = formatDMS(p.degreeInSign);
                                        const pLords = formatLords(p, isTe);
                                        return (
                                            <button
                                                key={p.key}
                                                onClick={() => setSelectedItem({ type: 'planet', data: p })}
                                                style={{ fontSize: 'var(--chart-font-size)' }}
                                                className={`font-mono font-bold leading-tight ${
                                                    p.isRetrograde ? 'text-[#dc2626]' : 'text-[#b91c1c]'
                                                }`}
                                            >
                                                {pCode}{p.isRetrograde ? '®' : ''} ({isStlMode ? pLords : pDeg})
                                            </button>
                                        );
                                    })}
                                    {resolvedFortuna && resolvedFortuna.house === h.houseNumber && (
                                        <button
                                            key="fortuna"
                                            onClick={() => setSelectedItem({ type: 'planet', data: resolvedFortuna })}
                                            style={{ fontSize: 'var(--chart-font-size)' }}
                                            className="font-mono font-bold leading-tight text-amber-700 dark:text-amber-400 hover:underline"
                                            title={`${resolvedFortuna.name} (Part of Fortune) | ${formatDMS(resolvedFortuna.degreeInSign)} | (${formatLords(resolvedFortuna, isTe)})`}
                                        >
                                            {isTe ? 'ఫా' : 'FO'} ({isStlMode ? formatLords(resolvedFortuna, isTe) : formatDMS(resolvedFortuna.degreeInSign)})
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Bottom Toggle Bar: Responsive wrapping with safe spacing */}
            <div className="w-full max-w-[880px] flex flex-wrap items-center justify-between gap-3 pt-3 px-1 text-xs sm:text-sm font-semibold select-none font-sans">
                {/* Left Toggle: South / North Indian Chart Style */}
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={chartStyle === 'north'}
                        onChange={(e) => setChartStyle(e.target.checked ? 'north' : 'south')}
                        className="sr-only peer"
                    />
                    <div className="w-8 h-4 sm:w-9 sm:h-5 bg-gray-300 dark:bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 sm:after:h-4 after:w-3 sm:after:w-4 after:transition-all peer-checked:bg-teal-600 relative"></div>
                    <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                        {chartStyle === 'north' ? (isTe ? "ఉత్తర భారత చక్రం" : "North Indian") : (isTe ? "రాశి చక్రం" : "Rasi Chart")}
                    </span>
                </label>

                {/* Center Toggle: House Significators (1-12) */}
                <label className="flex items-center gap-2 cursor-pointer" title={isTe ? "12 భావాల 4-స్థాయి కారకత్వాలు (L1, L2, L3, L4)" : "4-Level House Significators (Houses 1-12)"}>
                    <input
                        type="checkbox"
                        checked={isHouseSigMode}
                        onChange={(e) => {
                            const val = e.target.checked;
                            setIsHouseSigMode(val);
                            if (val) setIsStlMode(false);
                        }}
                        className="sr-only peer"
                    />
                    <div className="w-8 h-4 sm:w-9 sm:h-5 bg-gray-300 dark:bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 sm:after:h-4 after:w-3 sm:after:w-4 after:transition-all peer-checked:bg-amber-600 relative"></div>
                    <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                        {isTe ? "భావ కారకత్వాలు" : "House Significators"}
                    </span>
                </label>

                {/* Right Toggle: Degrees vs (STL,SUB,SSL,ASP) */}
                <label className="flex items-center gap-2 cursor-pointer" title={isTe ? "నక్షత్ర, సబ్, ఉపసబ్ లార్డులు & దృష్టి భావాలు" : "Star Lord, Sub Lord, Sub-Sub Lord & Aspects (Drishti)"}>
                    <input
                        type="checkbox"
                        checked={isStlMode}
                        onChange={(e) => {
                            const val = e.target.checked;
                            setIsStlMode(val);
                            if (val) setIsHouseSigMode(false);
                        }}
                        className="sr-only peer"
                    />
                    <div className="w-8 h-4 sm:w-9 sm:h-5 bg-gray-300 dark:bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 sm:after:h-4 after:w-3 sm:after:w-4 after:transition-all peer-checked:bg-teal-600 relative"></div>
                    <span className="text-gray-700 dark:text-gray-300 font-mono text-xs sm:text-sm">
                        (STL,SUB,SSL,ASP)
                    </span>
                </label>
            </div>

            {/* Interactive Detail Modal for Selected Planet or Cusp */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSelectedItem(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-sm bg-white dark:bg-stone-900 border border-gray-300 dark:border-white/10 rounded-2xl p-6 shadow-2xl relative font-sans"
                        >
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {selectedItem.type === 'planet' ? (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-amber-950/60 border border-orange-300 dark:border-amber-600/40 flex items-center justify-center font-bold text-orange-700 dark:text-amber-400 text-lg font-mono">
                                            {isTe ? (TELUGU_PLANET_SHORTS[selectedItem.data.key] || selectedItem.data.short) : selectedItem.data.short}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold font-serif text-gray-900 dark:text-white">
                                                {isTe ? selectedItem.data.te : selectedItem.data.name}
                                            </h4>
                                            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold font-mono">
                                                {isTe ? `KP ప్లాసిడస్ భావం ${selectedItem.data.house}` : `KP Placidus House ${selectedItem.data.house}`}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-xs divide-y divide-gray-100 dark:divide-white/5">
                                        <div className="flex justify-between py-1.5">
                                            <span className="text-gray-500">{t.sign}:</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{isTe ? selectedItem.data.sign.te : selectedItem.data.sign.en}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5">
                                            <span className="text-gray-500">{t.degree}:</span>
                                            <span className="font-mono font-semibold text-gray-900 dark:text-white">{formatDMS(selectedItem.data.degreeInSign)}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5">
                                            <span className="text-gray-500">{t.signLord}:</span>
                                            <span className="font-semibold text-orange-600">{isTe ? (TELUGU_PLANET_NAMES[selectedItem.data.signLord] || selectedItem.data.signLord) : selectedItem.data.signLord}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5">
                                            <span className="text-gray-500">{t.starLord}:</span>
                                            <span className="font-semibold text-purple-600">{isTe ? (TELUGU_PLANET_NAMES[selectedItem.data.starLord] || selectedItem.data.starLord) : selectedItem.data.starLord} ({isTe ? (NAKSHATRA_TELUGU_NAMES[selectedItem.data.nakshatra?.name] || selectedItem.data.nakshatra?.name) : selectedItem.data.nakshatra?.name})</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 bg-amber-500/5 px-2 rounded-lg">
                                            <span className="text-gray-700 dark:text-gray-300 font-bold">{t.subLord}:</span>
                                            <span className="font-bold text-amber-600 dark:text-amber-400">{isTe ? (TELUGU_PLANET_NAMES[selectedItem.data.subLord] || selectedItem.data.subLord) : selectedItem.data.subLord}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5">
                                            <span className="text-gray-500">{t.subSubLord}:</span>
                                            <span className="font-semibold text-blue-600">{isTe ? (TELUGU_PLANET_NAMES[selectedItem.data.subSubLord] || selectedItem.data.subSubLord) : selectedItem.data.subSubLord}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5">
                                            <span className="text-gray-500">{t.motion}:</span>
                                            <span className="font-semibold">
                                                {selectedItem.data.isPoint
                                                    ? (isTe ? 'సహజ బిందువు (Point)' : 'Point')
                                                    : (selectedItem.data.isRetrograde ? (isTe ? 'వక్రి' : 'Retrograde') : (isTe ? 'సవ్య' : 'Direct'))
                                                }
                                            </span>
                                        </div>
                                        {/* KP Parashari Drishti */}
                                        {typeof selectedItem.data.house === 'number' && (
                                            <div className="flex justify-between py-1.5 bg-teal-50/50 dark:bg-teal-950/20 px-2 rounded-lg">
                                                <span className="text-teal-800 dark:text-teal-300 font-bold">{isTe ? "దృష్టి భావాలు:" : "Aspected Houses:"}</span>
                                                <span className="font-bold text-teal-700 dark:text-teal-400">
                                                    {(() => {
                                                        const aspHouses = getPlanetAspectHouses(selectedItem.data.key, selectedItem.data.house);
                                                        return aspHouses.length > 0
                                                            ? aspHouses.map(a => `${a.house} (${a.span}${isTe ? 'వ' : 'th'})`).join(', ')
                                                            : '-';
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-600/40 flex items-center justify-center font-bold text-teal-800 dark:text-teal-300 text-lg font-mono">
                                            {isTe ? (selectedItem.data.houseNumber === 1 ? 'ల' : `${selectedItem.data.houseNumber}వ`) : `H${selectedItem.data.houseNumber}`}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold font-serif text-gray-900 dark:text-white">
                                                {isTe ? (selectedItem.data.houseNumber === 1 ? '1వ భావం (లగ్నం)' : `${selectedItem.data.houseNumber}వ భావ సంధి`) : `House ${selectedItem.data.houseNumber} Cusp`}
                                            </h4>
                                            <span className="text-xs text-teal-700 dark:text-teal-400 font-semibold font-mono">
                                                {isTe ? `ప్లాసిడస్: ${formatDMS(selectedItem.data.degreeInSign)}` : `Placidus: ${formatDMS(selectedItem.data.degreeInSign)}`}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-xs divide-y divide-gray-100 dark:divide-white/5">
                                        <div className="flex justify-between py-1.5">
                                            <span className="text-gray-500">{t.sign}:</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{isTe ? selectedItem.data.sign.te : selectedItem.data.sign.en}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5">
                                            <span className="text-gray-500">{t.signLord}:</span>
                                            <span className="font-semibold text-orange-600">{isTe ? (TELUGU_PLANET_NAMES[selectedItem.data.signLord] || selectedItem.data.signLord) : selectedItem.data.signLord}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5">
                                            <span className="text-gray-500">{t.starLord}:</span>
                                            <span className="font-semibold text-purple-600">{isTe ? (TELUGU_PLANET_NAMES[selectedItem.data.starLord] || selectedItem.data.starLord) : selectedItem.data.starLord} ({isTe ? (NAKSHATRA_TELUGU_NAMES[selectedItem.data.nakshatra?.name] || selectedItem.data.nakshatra?.name) : selectedItem.data.nakshatra?.name})</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 bg-amber-500/5 px-2 rounded-lg">
                                            <span className="text-gray-700 dark:text-gray-300 font-bold">{t.subLord}:</span>
                                            <span className="font-bold text-amber-600 dark:text-amber-400">{isTe ? (TELUGU_PLANET_NAMES[selectedItem.data.subLord] || selectedItem.data.subLord) : selectedItem.data.subLord}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5">
                                            <span className="text-gray-500">{t.subSubLord}:</span>
                                            <span className="font-semibold text-blue-600">{isTe ? (TELUGU_PLANET_NAMES[selectedItem.data.subSubLord] || selectedItem.data.subSubLord) : selectedItem.data.subSubLord}</span>
                                        </div>
                                        {/* Aspects casting on this Cusp */}
                                        {typeof selectedItem.data.houseNumber === 'number' && (
                                            <div className="flex justify-between py-1.5 bg-teal-50/50 dark:bg-teal-950/20 px-2 rounded-lg">
                                                <span className="text-teal-800 dark:text-teal-300 font-bold">{isTe ? "దృష్టి గ్రహాలు:" : "Aspecting Grahas:"}</span>
                                                <span className="font-bold text-teal-700 dark:text-teal-400">
                                                    {(() => {
                                                        const aspGrahas = planets.filter(p => {
                                                            const asps = getPlanetAspectHouses(p.key, p.house);
                                                            return asps.some(a => a.house === selectedItem.data.houseNumber);
                                                        }).map(p => isTe ? (TELUGU_PLANET_SHORTS[p.key] || p.short) : p.short);
                                                        return aspGrahas.length > 0 ? aspGrahas.join(', ') : (isTe ? 'లేవు' : 'None');
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setSelectedItem(null)}
                                className="w-full mt-5 py-2.5 rounded-xl bg-teal-700 text-white font-bold text-xs shadow-md cursor-pointer"
                            >
                                {t.close}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
