/**
 * Pure Evaluation Engine for Theory of Short Prediction (TSP - Dr. Keshab Ranjan Kar)
 *
 * Implements:
 * - 00:00 UTC (05:30 IST) Day-Rise Planetary Effect (DRPE) logic
 * - Ascendant & Moon targets set T = { Moon star, Moon SS, Asc star, Asc SS }
 * - Deciding planet A = Ascendant SS lord
 * - Special Rule 1: A is Moon or Moon is among A's node agents -> YES
 * - Optional Special Rule 3: A equals Moon star or Asc star -> YES (default OFF)
 * - Majority of 3 Rules:
 *   - Rule 1: SS lord of A in T (or agent in T)
 *   - Rule 2: Star lord of A in T (or agent in T)
 *   - Rule 3: Star lord of (SS lord of A) in T (or agent in T)
 *   - Base answer YES if >= 2 of 3 rules satisfied, else NO
 * - Punarphoo (Saturn effect) inversion:
 *   - Saturn conjoined Moon / aspects Moon / Moon star Saturn / Moon star node agent of Saturn
 *   - Inverts answer (YES -> NO, NO -> YES)
 *
 * Completely pure: No React, no ephemeris, no I/O.
 */

import { DEFAULT_TSP_SETTINGS } from './types.js';
import { getSignIndex, aspectsSign, SIGN_NAMES, EXTRA_ASPECTS } from './vedicAspects.js';
import { agentsOf } from './nodeAgents.js';

/**
 * Normalizes lord names from diverse input structures
 * @param {Object} obj
 * @returns {{ sign: string, star: string, sub: string, subSub: string }}
 */
function normalizeLords(obj = {}) {
    return {
        sign: obj.sign || obj.signName || '',
        star: obj.star || obj.starLord || '',
        sub: obj.sub || obj.subLord || '',
        subSub: obj.subSub || obj.subSubLord || ''
    };
}

/**
 * Pure TSP Evaluator
 *
 * @param {{ sign: string, star: string, sub: string, subSub: string }} rawAscLords
 * @param {{ sign: string, star: string, sub: string, subSub: string }} rawMoonLords
 * @param {Object<string, { sign: string|number, starLord: string, subSubLord: string }>} planets
 * @param {import('./types.js').TspSettings} [customSettings]
 * @returns {import('./types.js').TspEvaluationResult}
 */
export function evaluateTsp(rawAscLords, rawMoonLords, planets = {}, customSettings = {}) {
    const settings = {
        ...DEFAULT_TSP_SETTINGS,
        ...customSettings
    };

    const asc = normalizeLords(rawAscLords);
    const moon = normalizeLords(rawMoonLords);

    // Build target set T: { moon.star, moon.subSub, asc.star, asc.subSub }
    const targetsSet = new Set();
    if (moon.star) targetsSet.add(moon.star);
    if (moon.subSub) targetsSet.add(moon.subSub);
    if (asc.star) targetsSet.add(asc.star);
    if (asc.subSub) targetsSet.add(asc.subSub);

    // Optional research toggle: Fortuna star lord
    if (settings.fortunaTarget && settings.fortunaStarLord) {
        targetsSet.add(settings.fortunaStarLord);
    }

    const A = asc.subSub; // Main deciding factor
    const explanation = [];

    explanation.push(`ASCENDANT lords are ${asc.sign}-${asc.star}-${asc.sub}-${asc.subSub}`);
    explanation.push(`MOON lords are ${moon.sign}-${moon.star}-${moon.sub}-${moon.subSub}`);

    let initialAnswer;
    let decidedBy;
    let rulesSatisfied = null;
    let rules = [];

    // Helper: test if planet X (or any of its node agents) is in target set T
    function matchesTarget(X) {
        if (!X) {
            return { matched: false, matchedTarget: null, viaAgents: [] };
        }

        const isNode = (X === 'Rahu' || X === 'Ketu');
        if (settings.nodeAgency && isNode) {
            const ag = agentsOf(X, planets);
            // Check direct node match
            if (targetsSet.has(X)) {
                return { matched: true, matchedTarget: X, viaAgents: ag };
            }
            // Check agents match
            for (const p of ag) {
                if (targetsSet.has(p)) {
                    return { matched: true, matchedTarget: p, viaAgents: ag };
                }
            }
            return { matched: false, matchedTarget: null, viaAgents: ag };
        }

        // Standard direct match
        const matched = targetsSet.has(X);
        return {
            matched,
            matchedTarget: matched ? X : null,
            viaAgents: []
        };
    }

    // 1. Special Rule 1: Asc SS lord is Moon OR (A is node and Moon is an agent of A)
    let isSpecialMoon = false;
    let specialMoonReason = '';

    if (A === 'Moon') {
        isSpecialMoon = true;
        specialMoonReason = 'Ascendant SS lord is Moon.';
    } else if (settings.nodeAgency && (A === 'Rahu' || A === 'Ketu')) {
        const agA = agentsOf(A, planets);
        if (agA.includes('Moon')) {
            isSpecialMoon = true;
            specialMoonReason = `Ascendant SS lord is ${A}, and Moon is an agent of ${A} (${agA.join(', ')}).`;
        }
    }

    if (isSpecialMoon) {
        initialAnswer = 'YES';
        decidedBy = 'SPECIAL_ASC_SS_MOON';
        rulesSatisfied = null;
        rules = [];
        explanation.push(`Special Rule 1: ${specialMoonReason} Rule SATISFIED.`);
    } else if (settings.specialRule3 && (A === moon.star || A === asc.star)) {
        // Optional Special Rule 3 (OFF by default)
        initialAnswer = 'YES';
        decidedBy = 'SPECIAL_RULE_3';
        rulesSatisfied = null;
        rules = [];
        const matchWhich = (A === moon.star) ? "Moon's star lord" : "Ascendant's star lord";
        explanation.push(`Special Rule 3: Ascendant SS lord (${A}) matches ${matchWhich}. Rule SATISFIED.`);
    } else {
        // 2. Standard 3 Rules Evaluation (Majority decision)
        decidedBy = 'MAJORITY';

        const planetA = planets[A] || {};

        // Rule 1: B = SS lord of A
        const r1Deciding = planetA.subSubLord || '';
        const r1Check = matchesTarget(r1Deciding);
        const r1 = {
            id: 1,
            deciding: r1Deciding,
            viaAgents: r1Check.viaAgents,
            matchedTarget: r1Check.matchedTarget,
            passed: r1Check.matched
        };

        // Rule 2: B = Star lord of A
        const r2Deciding = planetA.starLord || '';
        const r2Check = matchesTarget(r2Deciding);
        const r2 = {
            id: 2,
            deciding: r2Deciding,
            viaAgents: r2Check.viaAgents,
            matchedTarget: r2Check.matchedTarget,
            passed: r2Check.matched
        };

        // Rule 3: C = Star lord of (SS lord of A)
        const planetB = planets[r1Deciding] || {};
        const r3Deciding = planetB.starLord || '';
        const r3Check = matchesTarget(r3Deciding);
        const r3 = {
            id: 3,
            deciding: r3Deciding,
            viaAgents: r3Check.viaAgents,
            matchedTarget: r3Check.matchedTarget,
            passed: r3Check.matched
        };

        rules = [r1, r2, r3];
        rulesSatisfied = (r1.passed ? 1 : 0) + (r2.passed ? 1 : 0) + (r3.passed ? 1 : 0);
        initialAnswer = (rulesSatisfied >= 2) ? 'YES' : 'NO';

        // Explanations for Rules 1, 2, 3
        function describeRule(r, label) {
            let desc = `${label}: ${r.deciding || 'None'}.`;
            if (r.viaAgents && r.viaAgents.length > 0) {
                desc += ` ${r.viaAgents.join(', ')} are agents of ${r.deciding}.`;
            }
            if (r.matchedTarget) {
                if (r.matchedTarget === moon.star) desc += ` ${r.matchedTarget} is MOON's star lord.`;
                else if (r.matchedTarget === moon.subSub) desc += ` ${r.matchedTarget} is MOON's SS lord.`;
                else if (r.matchedTarget === asc.star) desc += ` ${r.matchedTarget} is ASCENDANT's star lord.`;
                else if (r.matchedTarget === asc.subSub) desc += ` ${r.matchedTarget} is ASCENDANT's SS lord.`;
                else desc += ` Matched target ${r.matchedTarget}.`;
            }
            desc += ` Rule ${r.passed ? 'SATISFIED' : 'NOT satisfied'}.`;
            return desc;
        }

        explanation.push(describeRule(r1, `Rule 1: SS lord of Ascendant SS lord is`));
        explanation.push(describeRule(r2, `Rule 2: Star lord of Ascendant SS lord is`));
        explanation.push(describeRule(r3, `Rule 3: Star lord of SS lord of Ascendant SS lord is`));
        explanation.push(`${rulesSatisfied} out of 3 rules satisfied. Hence according to TSP, base answer is ${initialAnswer}.`);
    }

    // 3. Punarphoo (Saturn Effect) Inversion
    let punarphooApplied = false;
    let punarphooReason = null;

    if (settings.saturnEffect) {
        const saturn = planets['Saturn'];
        const moonPlanet = planets['Moon'];

        if (saturn && moonPlanet) {
            const saturnSignIdx = getSignIndex(saturn.sign);
            const moonSignIdx = getSignIndex(moonPlanet.sign);
            const moonStar = moon.star;

            const saturnSignName = SIGN_NAMES[saturnSignIdx];
            const moonSignName = SIGN_NAMES[moonSignIdx];

            if (saturnSignIdx === moonSignIdx) {
                punarphooApplied = true;
                punarphooReason = `Saturn and Moon are conjoined in ${moonSignName}.`;
            } else if (aspectsSign('Saturn', saturnSignIdx, moonSignIdx)) {
                const dist = ((moonSignIdx - saturnSignIdx + 12) % 12) + 1;
                punarphooApplied = true;
                punarphooReason = `Saturn in ${saturnSignName} aspects Moon in ${moonSignName} (${dist}th whole-sign aspect).`;
            } else if (moonStar === 'Saturn') {
                punarphooApplied = true;
                punarphooReason = `Moon is in Saturn's star.`;
            } else if (settings.nodeAgency && (moonStar === 'Rahu' || moonStar === 'Ketu')) {
                const nodeAg = agentsOf(moonStar, planets);
                if (nodeAg.includes('Saturn')) {
                    punarphooApplied = true;
                    punarphooReason = `Moon's star lord ${moonStar} is connected to Saturn (Saturn is an agent of ${moonStar}).`;
                }
            }
        }
    }

    const finalAnswer = punarphooApplied
        ? (initialAnswer === 'YES' ? 'NO' : 'YES')
        : initialAnswer;

    if (punarphooApplied) {
        explanation.push(`Punarphoo: ${punarphooReason} Answer inverted to ${finalAnswer}.`);
    } else {
        explanation.push(`Hence according to TSP, the final answer is ${finalAnswer}.`);
    }

    return {
        answer: finalAnswer,
        baseAnswer: initialAnswer,
        decidedBy,
        rulesSatisfied,
        rules,
        punarphoo: {
            applied: punarphooApplied,
            reason: punarphooReason
        },
        settingsUsed: settings,
        explanation,
        targets: Array.from(targetsSet),
        ascLords: asc,
        moonLords: moon
    };
}
