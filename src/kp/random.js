/**
 * Cryptographically Secure Uniform Random Generator for KP Horary Numbers
 *
 * Implements unbiased rejection sampling using crypto.getRandomValues / node:crypto.
 * Never uses Math.random().
 */

let nodeCrypto = null;
if (typeof window === 'undefined' && typeof process !== 'undefined') {
    try {
        nodeCrypto = await import('node:crypto');
    } catch {
        // Fallback to globalThis.crypto
    }
}

/**
 * Returns a cryptographically secure random integer uniformly distributed in [1, n].
 * Employs rejection sampling on 32-bit unsigned integers to eliminate modulo bias.
 *
 * @param {number} n - Maximum upper bound (e.g. 9, 27, 249, 2193)
 * @returns {number} Integer between 1 and n inclusive
 */
export function randomInRange(n) {
    const max = Number(n);
    if (!Number.isInteger(max) || max < 1) {
        throw new Error(`Invalid range limit: ${n}. Must be a positive integer.`);
    }

    const limit = Math.floor(0xFFFFFFFF / max) * max;
    const buf = new Uint32Array(1);

    const cryptoObj = (typeof globalThis !== 'undefined' && globalThis.crypto)
        ? globalThis.crypto
        : (typeof window !== 'undefined' ? window.crypto : null);

    if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
        let x;
        do {
            cryptoObj.getRandomValues(buf);
            x = buf[0];
        } while (x >= limit);
        return (x % max) + 1;
    }

    if (nodeCrypto && typeof nodeCrypto.randomInt === 'function') {
        return nodeCrypto.randomInt(1, max + 1);
    }

    throw new Error("Cryptographically secure random number generator is unavailable.");
}

/**
 * Returns a cryptographically secure random integer uniformly distributed in [1, 249].
 * @returns {number}
 */
export function randomKpNumber() {
    return randomInRange(249);
}

/**
 * Maximum capacity for each supported KP Horary system
 */
export const HORARY_SYSTEM_LIMITS = {
    '1-9': 9,
    '1-27': 27,
    '1-249': 249,
    '1-2193': 2193
};

/**
 * Validates manual input for any KP Horary number system.
 * Supports optional reduction of out-of-range large numbers.
 *
 * @param {any} val
 * @param {'1-9'|'1-27'|'1-249'|'1-2193'|number} [system='1-249']
 * @param {boolean} [reduceLargeNumbers=false]
 * @returns {{ valid: boolean, error?: string, value?: number, reduced?: boolean, originalValue?: number }}
 */
export function validateHoraryNumber(val, system = '1-249', reduceLargeNumbers = false, allowEmpty = false) {
    const max = typeof system === 'number'
        ? system
        : (HORARY_SYSTEM_LIMITS[system] || 249);

    if (val === undefined || val === null || val === '' || String(val).trim() === '') {
        if (allowEmpty) {
            return { valid: true, value: null, isEmpty: true };
        }
        return { valid: false, error: `Number is required (1–${max}).` };
    }

    const num = Number(val);
    if (!Number.isInteger(num)) {
        return { valid: false, error: `Number must be an integer (1–${max}).` };
    }

    if (num < 1) {
        return { valid: false, error: `Number must be at least 1.` };
    }

    if (num > max) {
        if (reduceLargeNumbers) {
            // Repeatedly subtract max: ((num - 1) % max) + 1
            const reduced = ((num - 1) % max) + 1;
            return {
                valid: true,
                value: reduced,
                reduced: true,
                originalValue: num
            };
        }
        return { valid: false, error: `Number exceeds system maximum (1–${max}). Got ${num}.` };
    }

    return { valid: true, value: num, reduced: false };
}

/**
 * Backward compatibility: Validates manual input for KP Horary Number (1–249).
 *
 * @param {any} val
 * @returns {{ valid: boolean, error?: string, value?: number }}
 */
export function validateKpNumber(val) {
    const res = validateHoraryNumber(val, '1-249', false);
    if (!res.valid) {
        return { valid: false, error: res.error.replace('Number', 'KP number') };
    }
    return { valid: true, value: res.value };
}
