/**
 * Rahu and Ketu Node Agency Engine
 *
 * A lunar node represents and acts on behalf of planets connected with it.
 * Agents of a node N (evaluated in this exact priority order, deduplicated):
 * 1. Star lord of N (skipped if it is the other node or itself)
 * 2. Sign lord of N
 * 3. Planets conjoined with N = any non-node planet in the same sign
 * 4. Planets aspecting N's sign with Vedic whole-sign aspects
 *
 * Non-node order for ties: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn.
 * Nodes never count as aspecting.
 */

import { getSignIndex, aspectsSign, SIGN_LORDS } from './vedicAspects.js';

export const NON_NODE_PLANETS = [
    'Sun',
    'Moon',
    'Mars',
    'Mercury',
    'Jupiter',
    'Venus',
    'Saturn'
];

/**
 * Computes all agents of a lunar node (Rahu / Ketu)
 *
 * @param {'Rahu'|'Ketu'|string} node - 'Rahu' or 'Ketu'
 * @param {Object<string, { sign: string|number, starLord: string }>} planets - Planets map
 * @returns {string[]} Ordered, deduplicated list of agent planet names
 */
export function agentsOf(node, planets) {
    if (node !== 'Rahu' && node !== 'Ketu') {
        return [];
    }

    const nodeInfo = planets?.[node];
    if (!nodeInfo) {
        return [];
    }

    const otherNode = node === 'Rahu' ? 'Ketu' : 'Rahu';
    const agents = [];

    // 1. Star lord of N (skip if it is the other node or itself)
    const starLord = nodeInfo.starLord;
    if (starLord && starLord !== otherNode && starLord !== node) {
        agents.push(starLord);
    }

    // 2. Sign lord of N
    const nodeSignIdx = getSignIndex(nodeInfo.sign);
    const signLord = SIGN_LORDS[nodeSignIdx];
    if (signLord && signLord !== node && signLord !== otherNode) {
        agents.push(signLord);
    }

    // 3. Non-node planets conjoined with N (in same sign)
    for (const p of NON_NODE_PLANETS) {
        const pInfo = planets[p];
        if (pInfo) {
            const pSignIdx = getSignIndex(pInfo.sign);
            if (pSignIdx === nodeSignIdx) {
                agents.push(p);
            }
        }
    }

    // 4. Non-node planets aspecting N's sign with Vedic whole-sign aspects
    for (const p of NON_NODE_PLANETS) {
        const pInfo = planets[p];
        if (pInfo) {
            const pSignIdx = getSignIndex(pInfo.sign);
            if (pSignIdx !== nodeSignIdx && aspectsSign(p, pSignIdx, nodeSignIdx)) {
                agents.push(p);
            }
        }
    }

    // Deduplicate preserving the exact priority order
    return Array.from(new Set(agents));
}
