/**
 * Pure Evaluation Engine for Classic Gulbarga Theory
 *
 * Rules:
 * - Rule 1: Number's Sub Lord = Moon Star Lord OR Ascendant Star Lord -> YES
 *   (Optional research toggle: or Fortuna Star Lord)
 * - Rule 2 (if Rule 1 fails): Sign, Star AND Sub Lord of the number are ALL
 *   present among the Ruling Planets (RPs) -> YES. Else NO.
 *
 * Settings:
 * - rpMode: 'classic5' (Asc sign, Asc star, Moon sign, Moon star, Day lord)
 *   or 'extended7' (+ Asc sub, Moon sub)
 * - nodeAgency: boolean (default false)
 * - fortunaInRule1: boolean (default false)
 *
 * Pure function: No React, no ephemeris, no I/O.
 */

import { DEFAULT_CLASSIC_SETTINGS } from './types.js';
import { agentsOf } from './nodeAgents.js';

/**
 * Normalizes number lords
 * @param {Object} lords
 * @returns {{ sign: string, signLord: string, starLord: string, subLord: string, subSubLord?: string }}
 */
function normalizeNumberLords(lords = {}) {
    return {
        sign: lords.sign || lords.signName || '',
        signLord: lords.signLord || lords.sign || '',
        starLord: lords.starLord || lords.star || '',
        subLord: lords.subLord || lords.sub || '',
        subSubLord: lords.subSubLord || lords.subSub || ''
    };
}

/**
 * Pure Classic Gulbarga Evaluator
 *
 * @param {Object} rawNumberLords - Lords of the chosen 1–249 number { sign, signLord, starLord, subLord }
 * @param {Object} rps - Ruling Planets object or adapter output
 * @param {import('./types.js').ClassicSettings} [customSettings]
 * @param {Object} [planets] - Planets map (only needed if nodeAgency is true)
 * @returns {import('./types.js').ClassicEvaluationResult}
 */
export function evaluateClassicGulbarga(rawNumberLords, rps = {}, customSettings = {}, planets = {}) {
    const settings = {
        ...DEFAULT_CLASSIC_SETTINGS,
        ...customSettings
    };

    const numLords = normalizeNumberLords(rawNumberLords);
    const explanation = [];

    const basisLabel = rawNumberLords?.isTimeChart ? 'Time Chart Lagna' : 'Number';
    explanation.push(`${basisLabel} lords are ${numLords.signLord}-${numLords.starLord}-${numLords.subLord}`);

    // Extract Ruling Planets
    const ascStar = rps.ascStarLord || rps.lagna?.starLord || '';
    const ascSign = rps.ascSignLord || rps.lagna?.signLord || '';
    const moonStar = rps.moonStarLord || rps.moon?.starLord || '';
    const moonSign = rps.moonSignLord || rps.moon?.signLord || '';
    const dayLord = rps.dayLord?.planet || rps.dayLord || '';
    const ascSub = rps.ascSubLord || rps.lagna?.subLord || '';
    const moonSub = rps.moonSubLord || rps.moon?.subLord || '';
    const fortunaStar = rps.fortunaStarLord || '';

    // Build RP list
    const rpList = [ascStar, ascSign, moonStar, moonSign, dayLord];
    if (settings.rpMode === 'extended7') {
        if (ascSub) rpList.push(ascSub);
        if (moonSub) rpList.push(moonSub);
    }
    const cleanRps = rpList.filter(Boolean);

    explanation.push(`Ruling Planets (${settings.rpMode === 'extended7' ? 'Extended-7' : 'Classic-5'}) are: ${cleanRps.join(', ')}`);

    // Helper: check if planet P is in set of planets, with optional node agency
    function planetPresent(p, targetList) {
        if (!p) return false;
        if (targetList.includes(p)) return true;

        if (settings.nodeAgency && (p === 'Rahu' || p === 'Ketu') && planets[p]) {
            const ag = agentsOf(p, planets);
            return ag.some(a => targetList.includes(a));
        }

        // Also check if any node in targetList represents p
        if (settings.nodeAgency) {
            for (const item of targetList) {
                if ((item === 'Rahu' || item === 'Ketu') && planets[item]) {
                    const ag = agentsOf(item, planets);
                    if (ag.includes(p)) return true;
                }
            }
        }

        return false;
    }

    // 1. Rule 1: Number's sub lord = Moon star lord OR Asc star lord (or Fortuna star lord)
    let rule1Passed = false;
    let rule1Matched = null;

    const subLord = numLords.subLord;
    const rule1Targets = [moonStar, ascStar];
    if (settings.fortunaInRule1 && fortunaStar) {
        rule1Targets.push(fortunaStar);
    }

    if (planetPresent(subLord, rule1Targets)) {
        rule1Passed = true;
        if (subLord === moonStar) rule1Matched = `Moon Star Lord (${moonStar})`;
        else if (subLord === ascStar) rule1Matched = `Ascendant Star Lord (${ascStar})`;
        else if (settings.fortunaInRule1 && subLord === fortunaStar) rule1Matched = `Fortuna Star Lord (${fortunaStar})`;
        else rule1Matched = `Node Agency match`;
    }

    let answer = 'NO';
    let decidedBy = 'NONE';
    let rule2Detail = { passed: false, present: [], missing: [] };

    if (rule1Passed) {
        answer = 'YES';
        decidedBy = 'RULE_1';
        explanation.push(`Rule 1: Number's Sub Lord (${subLord}) matches ${rule1Matched}. Rule SATISFIED.`);
        explanation.push(`Hence according to Classic Gulbarga, the answer is YES.`);
    } else {
        const fortunaNote = (settings.fortunaInRule1 && fortunaStar) ? ` nor Fortuna star lord (${fortunaStar})` : '';
        explanation.push(`Rule 1: Number's Sub Lord (${subLord}) is neither Moon star lord (${moonStar}) nor Ascendant star lord (${ascStar})${fortunaNote}. Rule NOT satisfied.`);

        // 2. Rule 2: Sign lord, Star lord, AND Sub lord must ALL be present among RPs
        const checkedLords = [
            { role: 'Sign Lord', lord: numLords.signLord },
            { role: 'Star Lord', lord: numLords.starLord },
            { role: 'Sub Lord', lord: numLords.subLord }
        ];

        const present = [];
        const missing = [];

        for (const item of checkedLords) {
            if (planetPresent(item.lord, cleanRps)) {
                present.push(item.lord);
            } else {
                missing.push(item.lord);
            }
        }

        const rule2Passed = (missing.length === 0);
        rule2Detail = {
            passed: rule2Passed,
            present,
            missing
        };

        if (rule2Passed) {
            answer = 'YES';
            decidedBy = 'RULE_2';
            explanation.push(`Rule 2: Sign, Star and Sub lords (${present.join(', ')}) are all present among Ruling Planets. Rule SATISFIED.`);
            explanation.push(`Hence according to Classic Gulbarga, the answer is YES.`);
        } else {
            answer = 'NO';
            decidedBy = 'NONE';
            explanation.push(`Rule 2: Missing from Ruling Planets: ${missing.join(', ')}. Rule NOT satisfied.`);
            explanation.push(`Hence according to Classic Gulbarga, the answer is NO.`);
        }
    }

    return {
        answer,
        decidedBy,
        rule1: {
            passed: rule1Passed,
            matchedTarget: rule1Matched
        },
        rule2: rule2Detail,
        settingsUsed: settings,
        rpList: cleanRps,
        explanation
    };
}
