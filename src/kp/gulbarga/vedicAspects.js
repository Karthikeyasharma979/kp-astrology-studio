/**
 * Vedic Whole-Sign Aspects Calculation Engine
 *
 * Rules:
 * - Every planet aspects the 7th sign from itself (opposition).
 * - Special full aspects:
 *   - Mars aspects 4th and 8th sign.
 *   - Jupiter aspects 5th and 9th sign (Trikona).
 *   - Saturn aspects 3rd and 10th sign.
 * - Nodes (Rahu / Ketu) never count as aspecting.
 * - Distance is counted inclusively (own sign = 1st, adjacent = 2nd).
 */

export const SIGN_SHORT_TO_INDEX = {
    Ar: 0, Ta: 1, Ge: 2, Cn: 3, Le: 4, Vi: 5,
    Li: 6, Sc: 7, Sg: 8, Cp: 9, Aq: 10, Pi: 11
};

export const SIGN_FULL_TO_INDEX = {
    Aries: 0, Taurus: 1, Gemini: 2, Cancer: 3, Leo: 4, Virgo: 5,
    Libra: 6, Scorpio: 7, Sagittarius: 8, Capricorn: 9, Aquarius: 10, Pisces: 11
};

export const SIGN_NAMES = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export const SIGN_LORDS = [
    'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
    'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'
];

export const EXTRA_ASPECTS = {
    Mars: [4, 8],
    Jupiter: [5, 9],
    Saturn: [3, 10]
};

/**
 * Resolves sign (short code, full name, or 0-11 index) to integer 0..11
 * @param {string|number} sign
 * @returns {number} 0..11
 */
export function getSignIndex(sign) {
    if (typeof sign === 'number') {
        return ((sign % 12) + 12) % 12;
    }
    if (typeof sign === 'string') {
        const clean = sign.trim();
        if (SIGN_SHORT_TO_INDEX[clean] !== undefined) {
            return SIGN_SHORT_TO_INDEX[clean];
        }
        if (SIGN_FULL_TO_INDEX[clean] !== undefined) {
            return SIGN_FULL_TO_INDEX[clean];
        }
        // Case-insensitive fallback
        const lower = clean.toLowerCase();
        for (const [key, idx] of Object.entries(SIGN_FULL_TO_INDEX)) {
            if (key.toLowerCase() === lower) return idx;
        }
        for (const [key, idx] of Object.entries(SIGN_SHORT_TO_INDEX)) {
            if (key.toLowerCase() === lower) return idx;
        }
    }
    return 0;
}

/**
 * Returns true if planet in fromSignIdx aspects toSignIdx using Vedic whole-sign rules.
 *
 * @param {string} planet - Planet name ('Sun'..'Saturn')
 * @param {number|string} fromSign - Source sign (index 0..11 or name)
 * @param {number|string} toSign - Target sign (index 0..11 or name)
 * @returns {boolean}
 */
export function aspectsSign(planet, fromSign, toSign) {
    if (planet === 'Rahu' || planet === 'Ketu') {
        return false;
    }

    const fromIdx = getSignIndex(fromSign);
    const toIdx = getSignIndex(toSign);

    // Inclusive distance: fromIdx -> fromIdx is 1
    const d = ((toIdx - fromIdx + 12) % 12) + 1;

    // 7th aspect applies to all non-node planets
    if (d === 7) {
        return true;
    }

    // Special planetary aspects
    const extra = EXTRA_ASPECTS[planet];
    if (extra && extra.includes(d)) {
        return true;
    }

    return false;
}
