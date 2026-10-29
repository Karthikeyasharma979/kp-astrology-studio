/**
 * Krishnamurti Paddhati (KP) Horary Multi-System Sub-Division Tables
 *
 * Implements exact integer arithmetic in 1/3 arc-second units:
 * - UNIT    = 1/3 arc-second
 * - CIRCLE  = 3,888,000 units (360°)
 * - SIGN    =   324,000 units (30°)
 * - NAK     =   144,000 units (13°20')
 * - sub span (lord L)         = 1200 × years(L)
 * - sub-sub span (sub L, ss M)=   10 × years(L) × years(M)
 *
 * Pre-computes and caches:
 * - 1–9 table: first 9 entries of the 1–249 table (all in Ashwini: Mars–Ketu–X–X)
 * - 1–27 table: start of each nakshatra (star = sub = SS = nakshatra lord)
 * - 1–249 table: all sub starts ∪ 12 sign starts (243 subs + 6 split pairs)
 * - 1–2193 table: all sub-sub starts ∪ 12 sign starts (2187 sub-subs + 6 split pairs)
 */

export const UNIT = 1;
export const CIRCLE = 3888000;
export const SIGN = 324000;
export const NAK = 144000;

// Arc-seconds constants for compatibility with existing modules
export const FULL_CIRCLE_SEC = 1296000;
export const SIGN_SEC = 108000;
export const NAKSHATRA_SEC = 48000;

export const VIMSHOTTARI_ORDER = [
    'Ketu',
    'Venus',
    'Sun',
    'Moon',
    'Mars',
    'Rahu',
    'Jupiter',
    'Saturn',
    'Mercury'
];

export const VIMSHOTTARI_YEARS = {
    Ketu: 7,
    Venus: 20,
    Sun: 6,
    Moon: 10,
    Mars: 7,
    Rahu: 18,
    Jupiter: 16,
    Saturn: 19,
    Mercury: 17
};

export const SUB_SPANS_SEC = {
    Ketu: 2800,
    Venus: 8000,
    Sun: 2400,
    Moon: 4000,
    Mars: 2800,
    Rahu: 7200,
    Jupiter: 6400,
    Saturn: 7600,
    Mercury: 6800
};

export const ZODIAC_SIGNS = [
    { index: 0, name: 'Aries', lord: 'Mars', te: 'మేషం' },
    { index: 1, name: 'Taurus', lord: 'Venus', te: 'వృషభం' },
    { index: 2, name: 'Gemini', lord: 'Mercury', te: 'మిథునం' },
    { index: 3, name: 'Cancer', lord: 'Moon', te: 'కర్కాటకం' },
    { index: 4, name: 'Leo', lord: 'Sun', te: 'సింహం' },
    { index: 5, name: 'Virgo', lord: 'Mercury', te: 'కన్య' },
    { index: 6, name: 'Libra', lord: 'Venus', te: 'తుల' },
    { index: 7, name: 'Scorpio', lord: 'Mars', te: 'వృశ్చికం' },
    { index: 8, name: 'Sagittarius', lord: 'Jupiter', te: 'ధనస్సు' },
    { index: 9, name: 'Capricorn', lord: 'Saturn', te: 'మకరం' },
    { index: 10, name: 'Aquarius', lord: 'Saturn', te: 'కుంభం' },
    { index: 11, name: 'Pisces', lord: 'Jupiter', te: 'మీనం' }
];

export const SIGN_NAMES = ZODIAC_SIGNS.map(s => s.name);
export const SIGN_LORDS = ZODIAC_SIGNS.map(s => s.lord);

export const NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

/**
 * Format units relative to sign start into DMS string
 * @param {number} units
 * @param {boolean} [isSignEnd=false]
 * @returns {string} e.g. "29°13'20\"" or "0°16'43.33\""
 */
export function formatUnitsToDMS(units, isSignEnd = false) {
    const inSignUnits = units % SIGN;
    if (isSignEnd && inSignUnits === 0 && units > 0) {
        return `30°00'00"`;
    }
    const totalArcSec = inSignUnits / 3;
    const d = Math.floor(totalArcSec / 3600);
    const m = Math.floor((totalArcSec % 3600) / 60);
    const remSec = (inSignUnits % 180) / 3; // remainder seconds in this minute

    let sStr;
    if (inSignUnits % 3 === 0) {
        sStr = String(Math.floor(remSec)).padStart(2, '0');
    } else {
        sStr = remSec.toFixed(2).padStart(5, '0');
    }
    return `${d}°${String(m).padStart(2, '0')}'${sStr}"`;
}

/**
 * Format arc-seconds relative to sign start into DMS string (compatibility)
 * @param {number} inSignSec
 * @param {boolean} [isSignEnd=false]
 * @returns {string}
 */
export function formatSecToDMS(inSignSec, isSignEnd = false) {
    return formatUnitsToDMS(inSignSec * 3, isSignEnd);
}

/**
 * Resolves the 4 KP lords (Sign, Star, Sub, Sub-Sub) at any position in 1/3 arcsec units.
 *
 * @param {number} posUnits - Integer 1/3 arcsecond units [0, 3888000)
 * @returns {{
 *   sign: string,
 *   signIndex: number,
 *   signLord: string,
 *   signTe: string,
 *   nakshatraName: string,
 *   nakshatraIndex: number,
 *   starLord: string,
 *   subLord: string,
 *   subSubLord: string
 * }}
 */
export function lordsAt(posUnits) {
    const norm = ((posUnits % CIRCLE) + CIRCLE) % CIRCLE;

    // 1. Sign
    const signIndex = Math.floor(norm / SIGN);
    const signObj = ZODIAC_SIGNS[signIndex];
    const sign = signObj.name;
    const signLord = signObj.lord;

    // 2. Nakshatra
    const nakshatraIndex = Math.floor(norm / NAK);
    const nakshatraName = NAKSHATRA_NAMES[nakshatraIndex];
    const starLord = VIMSHOTTARI_ORDER[nakshatraIndex % 9];
    const offsetInNak = norm % NAK;

    // 3. Sub Lord
    const startSubIdx = nakshatraIndex % 9;
    let subLord = null;
    let offsetInSub = 0;
    let curSubOffset = 0;

    for (let k = 0; k < 9; k++) {
        const sLord = VIMSHOTTARI_ORDER[(startSubIdx + k) % 9];
        const subSpan = 1200 * VIMSHOTTARI_YEARS[sLord];
        if (offsetInNak < curSubOffset + subSpan || k === 8) {
            subLord = sLord;
            offsetInSub = offsetInNak - curSubOffset;
            break;
        }
        curSubOffset += subSpan;
    }

    // 4. Sub-Sub Lord
    const subLordIdx = VIMSHOTTARI_ORDER.indexOf(subLord);
    let subSubLord = null;
    let curSsOffset = 0;

    for (let m = 0; m < 9; m++) {
        const ssLord = VIMSHOTTARI_ORDER[(subLordIdx + m) % 9];
        const ssSpan = 10 * VIMSHOTTARI_YEARS[subLord] * VIMSHOTTARI_YEARS[ssLord];
        if (offsetInSub < curSsOffset + ssSpan || m === 8) {
            subSubLord = ssLord;
            break;
        }
        curSsOffset += ssSpan;
    }

    return {
        sign,
        signIndex,
        signLord,
        signTe: signObj.te,
        nakshatraName,
        nakshatraIndex,
        starLord,
        subLord,
        subSubLord
    };
}

/**
 * Builds the 249 KP table (subs ∪ sign boundaries)
 * @returns {Array<Object>} 249 entries
 */
function buildKp249Table() {
    const rawSubs = [];
    const boundaries = new Set();

    // 27 nakshatras × 9 subs = 243 raw subs
    for (let n = 0; n < 27; n++) {
        const starLord = VIMSHOTTARI_ORDER[n % 9];
        const nakshatraName = NAKSHATRA_NAMES[n];
        let pos = n * NAK;
        const startIdx = n % 9;

        for (let k = 0; k < 9; k++) {
            const subLord = VIMSHOTTARI_ORDER[(startIdx + k) % 9];
            const spanUnits = 1200 * VIMSHOTTARI_YEARS[subLord];
            const startUnits = pos;
            const endUnits = pos + spanUnits;

            rawSubs.push({
                nakshatraIndex: n,
                nakshatraName,
                starLord,
                subLord,
                startUnits,
                endUnits,
                spanUnits
            });

            boundaries.add(startUnits);
            pos = endUnits;
        }
    }

    // 12 sign boundaries + circle end
    for (let s = 0; s <= 12; s++) {
        boundaries.add(s * SIGN);
    }

    const sorted = Array.from(boundaries).sort((a, b) => a - b);
    const table = [];

    for (let i = 0; i < sorted.length - 1; i++) {
        const startUnits = sorted[i];
        const endUnits = sorted[i + 1];
        const lords = lordsAt(startUnits);

        const startSec = Math.floor(startUnits / 3);
        const endSec = Math.floor(endUnits / 3);
        const isSignEnd = (endUnits % SIGN === 0 && endUnits > startUnits);

        // Find parent raw sub that covers this segment
        const parentSub = rawSubs.find(r => r.startUnits <= startUnits && r.endUnits >= endUnits);
        const isSplit = Boolean(parentSub && (parentSub.startUnits < startUnits || parentSub.endUnits > endUnits));
        const splitPart = isSplit ? (parentSub.startUnits === startUnits ? 1 : 2) : null;

        table.push({
            no: i + 1,
            startUnits,
            endUnits,
            spanUnits: endUnits - startUnits,
            startSec,
            endSec,
            spanSec: endSec - startSec,
            startDeg: startUnits / 10800.0,
            endDeg: endUnits / 10800.0,
            midSec: Math.floor((startSec + endSec) / 2),
            midDeg: ((startSec + endSec) / 2) / 3600.0,
            sign: lords.sign,
            signIndex: lords.signIndex,
            signLord: lords.signLord,
            signTe: lords.signTe,
            nakshatraName: lords.nakshatraName,
            nakshatraIndex: lords.nakshatraIndex,
            starLord: lords.starLord,
            subLord: lords.subLord,
            subSubLord: lords.subSubLord,
            startDMS: `${lords.sign} ${formatUnitsToDMS(startUnits)}`,
            endDMS: isSignEnd ? `${lords.sign} 30°00'00"` : `${lords.sign} ${formatUnitsToDMS(endUnits)}`,
            isSplit,
            splitPart
        });
    }

    return table;
}

/**
 * Builds the 2193 KP table (sub-subs ∪ sign boundaries)
 * @returns {Array<Object>} 2193 entries
 */
function buildKp2193Table() {
    const boundaries = new Set();

    // 27 nakshatras × 9 subs × 9 sub-subs = 2187 sub-sub starts
    for (let n = 0; n < 27; n++) {
        let subPos = n * NAK;
        const startSubIdx = n % 9;
        for (let k = 0; k < 9; k++) {
            const subLord = VIMSHOTTARI_ORDER[(startSubIdx + k) % 9];
            const subLordIdx = VIMSHOTTARI_ORDER.indexOf(subLord);
            let ssPos = subPos;
            for (let m = 0; m < 9; m++) {
                boundaries.add(ssPos);
                const ssLord = VIMSHOTTARI_ORDER[(subLordIdx + m) % 9];
                ssPos += 10 * VIMSHOTTARI_YEARS[subLord] * VIMSHOTTARI_YEARS[ssLord];
            }
            subPos = ssPos;
        }
    }

    for (let s = 0; s <= 12; s++) {
        boundaries.add(s * SIGN);
    }

    const sorted = Array.from(boundaries).sort((a, b) => a - b);
    const table = [];

    for (let i = 0; i < sorted.length - 1; i++) {
        const startUnits = sorted[i];
        const endUnits = sorted[i + 1];
        const lords = lordsAt(startUnits);
        const isSignEnd = (endUnits % SIGN === 0 && endUnits > startUnits);

        table.push({
            no: i + 1,
            startUnits,
            endUnits,
            spanUnits: endUnits - startUnits,
            startSec: Math.floor(startUnits / 3),
            endSec: Math.floor(endUnits / 3),
            startDeg: startUnits / 10800.0,
            endDeg: endUnits / 10800.0,
            sign: lords.sign,
            signIndex: lords.signIndex,
            signLord: lords.signLord,
            signTe: lords.signTe,
            nakshatraName: lords.nakshatraName,
            nakshatraIndex: lords.nakshatraIndex,
            starLord: lords.starLord,
            subLord: lords.subLord,
            subSubLord: lords.subSubLord,
            startDMS: `${lords.sign} ${formatUnitsToDMS(startUnits)}`,
            endDMS: isSignEnd ? `${lords.sign} 30°00'00"` : `${lords.sign} ${formatUnitsToDMS(endUnits)}`
        });
    }

    return table;
}

/**
 * Builds the 1–9 KP table (first 9 entries of the 1–249 table, all in Ashwini)
 * @param {Array<Object>} table249
 * @returns {Array<Object>} 9 entries
 */
function buildKp9Table(table249) {
    return table249.slice(0, 9).map((entry, idx) => ({
        ...entry,
        no: idx + 1
    }));
}

/**
 * Builds the 1–27 KP table (start of each nakshatra)
 * @returns {Array<Object>} 27 entries
 */
function buildKp27Table() {
    const table = [];
    for (let n = 0; n < 27; n++) {
        const startUnits = n * NAK;
        const endUnits = (n + 1) * NAK;
        const lords = lordsAt(startUnits);
        const nLord = VIMSHOTTARI_ORDER[n % 9];
        const isSignEnd = (endUnits % SIGN === 0 && endUnits > startUnits);

        table.push({
            no: n + 1,
            startUnits,
            endUnits,
            spanUnits: NAK,
            startSec: Math.floor(startUnits / 3),
            endSec: Math.floor(endUnits / 3),
            startDeg: startUnits / 10800.0,
            endDeg: endUnits / 10800.0,
            sign: lords.sign,
            signIndex: lords.signIndex,
            signLord: lords.signLord,
            signTe: lords.signTe,
            nakshatraName: NAKSHATRA_NAMES[n],
            nakshatraIndex: n,
            starLord: nLord,
            subLord: nLord,
            subSubLord: nLord,
            startDMS: `${lords.sign} ${formatUnitsToDMS(startUnits)}`,
            endDMS: isSignEnd ? `${lords.sign} 30°00'00"` : `${lords.sign} ${formatUnitsToDMS(endUnits)}`
        });
    }
    return table;
}

// Pre-compute and cache all tables at module load
export const KP_249_TABLE = buildKp249Table();
export const KP_2193_TABLE = buildKp2193Table();
export const KP_9_TABLE = buildKp9Table(KP_249_TABLE);
export const KP_27_TABLE = buildKp27Table();

// Table aliases
export const TABLE_9 = KP_9_TABLE;
export const TABLE_27 = KP_27_TABLE;
export const TABLE_249 = KP_249_TABLE;
export const TABLE_2193 = KP_2193_TABLE;

export const HORARY_TABLES = {
    '1-9': KP_9_TABLE,
    '1-27': KP_27_TABLE,
    '1-249': KP_249_TABLE,
    '1-2193': KP_2193_TABLE
};

// Assert startup table lengths
if (KP_9_TABLE.length !== 9) throw new Error(`Assertion failed: KP 1-9 table length is ${KP_9_TABLE.length}`);
if (KP_27_TABLE.length !== 27) throw new Error(`Assertion failed: KP 1-27 table length is ${KP_27_TABLE.length}`);
if (KP_249_TABLE.length !== 249) throw new Error(`Assertion failed: KP 1-249 table length is ${KP_249_TABLE.length}`);
if (KP_2193_TABLE.length !== 2193) throw new Error(`Assertion failed: KP 1-2193 table length is ${KP_2193_TABLE.length}`);

/**
 * Get table by horary system
 * @param {'1-9'|'1-27'|'1-249'|'1-2193'} system
 * @returns {Array<Object>}
 */
export function getHoraryTable(system = '1-249') {
    const table = HORARY_TABLES[system];
    if (!table) {
        throw new Error(`Unsupported horary system: ${system}. Expected '1-9', '1-27', '1-249', or '1-2193'.`);
    }
    return table;
}

/**
 * Lookup horary table entry by number within a system
 * @param {'1-9'|'1-27'|'1-249'|'1-2193'} system
 * @param {number} number
 * @returns {Object}
 */
export function getHoraryEntry(system, number) {
    const table = getHoraryTable(system);
    const num = Number(number);
    if (!Number.isInteger(num) || num < 1 || num > table.length) {
        throw new Error(`Invalid horary number ${number} for system ${system}. Must be 1 to ${table.length}.`);
    }
    return table[num - 1];
}

/**
 * Backward compatibility: Lookup KP Number entry by 1-based number (1..249)
 * @param {number} kpNo
 * @returns {Object}
 */
export function getKpNumberEntry(kpNo) {
    return getHoraryEntry('1-249', kpNo);
}

/**
 * Find KP Number corresponding to a sidereal longitude in degrees [0, 360)
 * @param {number} siderealDeg
 * @returns {Object}
 */
export function getKpNumberForLongitude(siderealDeg) {
    const norm = ((siderealDeg % 360.0) + 360.0) % 360.0;
    const units = Math.min(Math.floor(norm * 10800.0), CIRCLE - 1);
    for (let i = 0; i < KP_249_TABLE.length; i++) {
        const item = KP_249_TABLE[i];
        if (units >= item.startUnits && units < item.endUnits) {
            return item;
        }
    }
    return KP_249_TABLE[KP_249_TABLE.length - 1];
}
