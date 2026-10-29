/**
 * Unit Test Suite for Classic Gulbarga Theory (§9.5)
 *
 * Run with: node --test src/kp/gulbarga/evaluateClassic.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { evaluateClassicGulbarga } from './evaluateClassic.js';
import { getHoraryEntry } from '../horaryTable.js';
import { getAdaptedRulingPlanets } from './rpAdapter.js';

describe("Classic Gulbarga Evaluation Suite (§9.5)", () => {
    test("Chennai worked example: 05-02-2014 12:10 IST Chennai, No. 24 -> NO", () => {
        const no24 = getHoraryEntry('1-249', 24);
        assert.strictEqual(no24.signLord, 'Venus');
        assert.strictEqual(no24.starLord, 'Sun');
        assert.strictEqual(no24.subLord, 'Jupiter');

        const rps = getAdaptedRulingPlanets({
            date: '2014-02-05',
            time: '12:10',
            lat: 13.0827,
            lon: 80.2707,
            timezone: 'Asia/Kolkata'
        });

        // RPs: Asc Star Sun, Asc Sign Mars, Moon Star Ketu, Moon Sign Mars, Day Lord Mercury
        assert.strictEqual(rps.ascStarLord, 'Sun');
        assert.strictEqual(rps.ascSignLord, 'Mars');
        assert.strictEqual(rps.moonStarLord, 'Ketu');
        assert.strictEqual(rps.moonSignLord, 'Mars');
        assert.strictEqual(rps.dayLord, 'Mercury');

        const res = evaluateClassicGulbarga(no24, rps, { rpMode: 'classic5' });

        // Rule 1: Jupiter not in {Ketu, Sun} -> fails
        // Rule 2: {Venus, Sun, Jupiter} in {Sun, Mars, Ketu, Mercury} -> Venus and Jupiter missing -> fails
        assert.strictEqual(res.answer, 'NO');
        assert.strictEqual(res.decidedBy, 'NONE');
        assert.strictEqual(res.rule1.passed, false);
        assert.strictEqual(res.rule2.passed, false);
        assert(res.rule2.missing.includes('Venus'));
        assert(res.rule2.missing.includes('Jupiter'));
    });

    test("Rule 1: Number sub lord matches Moon star lord -> YES", () => {
        const numLords = { signLord: 'Jupiter', starLord: 'Mars', subLord: 'Venus' };
        const rps = {
            ascStarLord: 'Sun',
            ascSignLord: 'Mars',
            moonStarLord: 'Venus',
            moonSignLord: 'Mercury',
            dayLord: 'Saturn'
        };

        const res = evaluateClassicGulbarga(numLords, rps);
        assert.strictEqual(res.answer, 'YES');
        assert.strictEqual(res.decidedBy, 'RULE_1');
        assert.strictEqual(res.rule1.passed, true);
    });

    test("Rule 1: Number sub lord matches Ascendant star lord -> YES", () => {
        const numLords = { signLord: 'Mercury', starLord: 'Ketu', subLord: 'Sun' };
        const rps = {
            ascStarLord: 'Sun',
            ascSignLord: 'Jupiter',
            moonStarLord: 'Mars',
            moonSignLord: 'Venus',
            dayLord: 'Saturn'
        };

        const res = evaluateClassicGulbarga(numLords, rps);
        assert.strictEqual(res.answer, 'YES');
        assert.strictEqual(res.decidedBy, 'RULE_1');
        assert.strictEqual(res.rule1.passed, true);
    });

    test("Rule 2: Rule 1 fails, but sign, star, and sub all present in RPs -> YES", () => {
        const numLords = { signLord: 'Mars', starLord: 'Jupiter', subLord: 'Mercury' };
        const rps = {
            ascStarLord: 'Sun',
            ascSignLord: 'Mars',
            moonStarLord: 'Saturn',
            moonSignLord: 'Jupiter',
            dayLord: 'Mercury'
        };

        // Sub lord Mercury is neither Moon star (Saturn) nor Asc star (Sun) -> Rule 1 fails
        // But Mars, Jupiter, Mercury are all in RPs -> Rule 2 passes!
        const res = evaluateClassicGulbarga(numLords, rps);
        assert.strictEqual(res.answer, 'YES');
        assert.strictEqual(res.decidedBy, 'RULE_2');
        assert.strictEqual(res.rule1.passed, false);
        assert.strictEqual(res.rule2.passed, true);
        assert.strictEqual(res.rule2.missing.length, 0);
    });

    test("Rule 2: Rule 1 fails, only 2 of 3 lords present in RPs -> NO", () => {
        const numLords = { signLord: 'Mars', starLord: 'Jupiter', subLord: 'Venus' };
        const rps = {
            ascStarLord: 'Sun',
            ascSignLord: 'Mars',
            moonStarLord: 'Saturn',
            moonSignLord: 'Jupiter',
            dayLord: 'Mercury'
        };

        // Venus is missing from RPs
        const res = evaluateClassicGulbarga(numLords, rps);
        assert.strictEqual(res.answer, 'NO');
        assert.strictEqual(res.decidedBy, 'NONE');
        assert.strictEqual(res.rule2.passed, false);
        assert.deepStrictEqual(res.rule2.missing, ['Venus']);
    });

    test("Day lord before local sunrise is the previous weekday (KP sunrise-to-sunrise day)", () => {
        const at = (time) => getAdaptedRulingPlanets({
            date: '2014-02-06', // Thursday; Chennai sunrise ~06:37 IST
            time,
            lat: 13.0827,
            lon: 80.2707,
            timezone: 'Asia/Kolkata'
        });
        assert.strictEqual(at('04:00').dayLord, 'Mercury');
        assert.strictEqual(at('07:00').dayLord, 'Jupiter');
    });

    test("Fortuna star lord is computed and used by Rule 1 when enabled", () => {
        const rps = getAdaptedRulingPlanets({
            date: '2014-02-05',
            time: '12:10',
            lat: 13.0827,
            lon: 80.2707,
            timezone: 'Asia/Kolkata'
        });
        // Asc 28.49 + Moon 4.34 - Sun ~292.4 = ~100.4 (Cancer, Pushya) -> Saturn
        assert.strictEqual(rps.fortunaStarLord, 'Saturn');

        const numLords = { signLord: 'Mars', starLord: 'Mars', subLord: 'Saturn' };
        assert.strictEqual(evaluateClassicGulbarga(numLords, rps).decidedBy, 'NONE');

        const res = evaluateClassicGulbarga(numLords, rps, { fortunaInRule1: true });
        assert.strictEqual(res.answer, 'YES');
        assert.strictEqual(res.decidedBy, 'RULE_1');
        assert.strictEqual(res.rule1.matchedTarget, 'Fortuna Star Lord (Saturn)');
    });

    test("Extended-7 RP Mode includes Asc sub and Moon sub", () => {
        const numLords = { signLord: 'Mars', starLord: 'Sun', subLord: 'Rahu' };
        const rps = {
            ascStarLord: 'Sun',
            ascSignLord: 'Jupiter',
            moonStarLord: 'Mercury',
            moonSignLord: 'Saturn',
            dayLord: 'Moon',
            ascSubLord: 'Mars',
            moonSubLord: 'Rahu'
        };

        // Under Classic-5, Rahu is not in RPs
        const res5 = evaluateClassicGulbarga(numLords, rps, { rpMode: 'classic5' });
        assert.strictEqual(res5.answer, 'NO');

        // Under Extended-7, Rahu is present via moonSubLord -> Rule 2 passes!
        const res7 = evaluateClassicGulbarga(numLords, rps, { rpMode: 'extended7' });
        assert.strictEqual(res7.answer, 'YES');
        assert.strictEqual(res7.decidedBy, 'RULE_2');
    });
});

describe("Classic Gulbarga Ruling Planets list", () => {
    test("A planet holding several RP roles is listed once", () => {
        const rps = {
            ascStarLord: 'Mars', ascSignLord: 'Saturn', moonStarLord: 'Mars',
            moonSignLord: 'Venus', dayLord: 'Jupiter'
        };
        const res = evaluateClassicGulbarga({ signLord: 'Venus', starLord: 'Rahu', subLord: 'Moon' }, rps);
        assert.deepStrictEqual(res.rpList, ['Mars', 'Saturn', 'Venus', 'Jupiter']);
        assert.ok(res.explanation.some(l => l.includes('are: Mars, Saturn, Venus, Jupiter')));
    });
});
