/**
 * Verification Test Suite for evaluateTsp against 44 worked examples
 * from Kanakkumar B. Bosmia's book: "Easy way to learn KP – Theory of Short Prediction" (2018).
 *
 * Run with: node --test src/kp/gulbarga/evaluateTsp.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateTsp } from './evaluateTsp.js';
import { DEFAULT_TSP_SETTINGS } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesPath = path.join(__dirname, '__fixtures__', 'tsp_book_fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

describe("TSP Fixture-Driven Test Suite (44 Reference Book Examples)", () => {
    test(`Total test cases in fixtures must equal 44`, () => {
        assert.strictEqual(fixtures.cases.length, 44);
    });

    for (const c of fixtures.cases) {
        test(`${c.id}: ${c.question} (No. ${c.number}, ${c.snapshotDate}) -> expected ${c.expected.answer}`, () => {
            const res = evaluateTsp(c.ascLords, c.moonLords, c.planets, DEFAULT_TSP_SETTINGS);

            assert.strictEqual(
                res.answer,
                c.expected.answer,
                `Answer mismatch for ${c.id}. Expected ${c.expected.answer}, got ${res.answer}`
            );

            assert.strictEqual(
                res.decidedBy,
                c.expected.decidedBy,
                `DecidedBy mismatch for ${c.id}. Expected ${c.expected.decidedBy}, got ${res.decidedBy}`
            );

            assert.strictEqual(
                res.rulesSatisfied,
                c.expected.rulesSatisfied,
                `Rules satisfied mismatch for ${c.id}. Expected ${c.expected.rulesSatisfied}, got ${res.rulesSatisfied}`
            );

            assert.strictEqual(
                res.punarphoo.applied,
                c.expected.punarphoo,
                `Punarphoo mismatch for ${c.id}. Expected ${c.expected.punarphoo}, got ${res.punarphoo.applied}`
            );
        });
    }
});

describe("Hand-written Specific Assertions from §9.1", () => {
    const findCase = (id) => {
        const found = fixtures.cases.find(c => c.id === id);
        assert(found, `Case ${id} not found in fixtures`);
        return found;
    };

    test("book-01 (8/9, 16-Sep-2014): node agency Rahu -> Mars matches Moon star lord; 2/3 -> YES", () => {
        const c = findCase('book-01');
        const res = evaluateTsp(c.ascLords, c.moonLords, c.planets, DEFAULT_TSP_SETTINGS);
        assert.strictEqual(res.answer, 'YES');
        assert.strictEqual(res.rulesSatisfied, 2);
        assert.strictEqual(res.punarphoo.applied, false);
        assert.strictEqual(res.rules[0].passed, true); // Rule 1 via Rahu's agent Mars
    });

    test("book-02 (6/9, 8-Oct-2016): 0/3 = NO, Moon star Ketu is agent of Saturn -> inverted to YES", () => {
        const c = findCase('book-02');
        const res = evaluateTsp(c.ascLords, c.moonLords, c.planets, DEFAULT_TSP_SETTINGS);
        assert.strictEqual(res.rulesSatisfied, 0);
        assert.strictEqual(res.punarphoo.applied, true);
        assert.strictEqual(res.answer, 'YES');
    });

    test("book-04 (4/9, 16-Oct-2016): Asc SS = Moon -> YES (Special Rule 1)", () => {
        const c = findCase('book-04');
        const res = evaluateTsp(c.ascLords, c.moonLords, c.planets, DEFAULT_TSP_SETTINGS);
        assert.strictEqual(res.decidedBy, 'SPECIAL_ASC_SS_MOON');
        assert.strictEqual(res.rulesSatisfied, null);
        assert.strictEqual(res.answer, 'YES');
    });

    test("book-08 (5/9, 4-Apr-2007): special rule 3 must stay OFF by default: 1/3 -> NO", () => {
        const c = findCase('book-08');
        const res = evaluateTsp(c.ascLords, c.moonLords, c.planets, DEFAULT_TSP_SETTINGS);
        assert.strictEqual(res.rulesSatisfied, 1);
        assert.strictEqual(res.answer, 'NO');
    });

    test("book-09 (4/9, 31-Jul-2018): Asc SS = Moon, Saturn (Sg) aspects Moon (Aq, 3rd) -> NO", () => {
        const c = findCase('book-09');
        const res = evaluateTsp(c.ascLords, c.moonLords, c.planets, DEFAULT_TSP_SETTINGS);
        assert.strictEqual(res.decidedBy, 'SPECIAL_ASC_SS_MOON');
        assert.strictEqual(res.punarphoo.applied, true);
        assert.strictEqual(res.answer, 'NO');
    });

    test("book-13 (121/249, 6-Apr-2014): 3/3 YES inverted to NO", () => {
        const c = findCase('book-13');
        const res = evaluateTsp(c.ascLords, c.moonLords, c.planets, DEFAULT_TSP_SETTINGS);
        assert.strictEqual(res.rulesSatisfied, 3);
        assert.strictEqual(res.punarphoo.applied, true);
        assert.strictEqual(res.answer, 'NO');
    });

    test("book-21 (156/249, 2-Jan-2018): Asc SS Rahu with Moon as Rahu's agent -> YES, Saturn 7th aspect -> NO", () => {
        const c = findCase('book-21');
        const res = evaluateTsp(c.ascLords, c.moonLords, c.planets, DEFAULT_TSP_SETTINGS);
        assert.strictEqual(res.decidedBy, 'SPECIAL_ASC_SS_MOON');
        assert.strictEqual(res.punarphoo.applied, true);
        assert.strictEqual(res.answer, 'NO');
    });

    test("book-34 (5/2193, 30-Jan-2015): node matched directly (Ketu is Asc star lord); 2/3 YES inverted by Punarphoo to NO", () => {
        const c = findCase('book-34');
        const res = evaluateTsp(c.ascLords, c.moonLords, c.planets, DEFAULT_TSP_SETTINGS);
        assert.strictEqual(res.rulesSatisfied, 2);
        assert.strictEqual(res.punarphoo.applied, true);
        assert.strictEqual(res.answer, 'NO');
    });

    test("Setting variation: saturnEffect=false turns book-02 to NO and book-09 to YES", () => {
        const b02 = findCase('book-02');
        const res02 = evaluateTsp(b02.ascLords, b02.moonLords, b02.planets, { ...DEFAULT_TSP_SETTINGS, saturnEffect: false });
        assert.strictEqual(res02.answer, 'NO');
        assert.strictEqual(res02.punarphoo.applied, false);

        const b09 = findCase('book-09');
        const res09 = evaluateTsp(b09.ascLords, b09.moonLords, b09.planets, { ...DEFAULT_TSP_SETTINGS, saturnEffect: false });
        assert.strictEqual(res09.answer, 'YES');
        assert.strictEqual(res09.punarphoo.applied, false);
    });

    test("Setting variation: nodeAgency=false causes book-01 Rule 1 to fail -> NO", () => {
        const b01 = findCase('book-01');
        const res = evaluateTsp(b01.ascLords, b01.moonLords, b01.planets, { ...DEFAULT_TSP_SETTINGS, nodeAgency: false });
        assert.strictEqual(res.rules[0].passed, false);
        assert.strictEqual(res.rulesSatisfied, 1);
        assert.strictEqual(res.answer, 'NO');
    });

    test("Setting variation: specialRule3=true turns book-08 into YES", () => {
        const b08 = findCase('book-08');
        const res = evaluateTsp(b08.ascLords, b08.moonLords, b08.planets, { ...DEFAULT_TSP_SETTINGS, specialRule3: true });
        assert.strictEqual(res.answer, 'YES');
        assert.strictEqual(res.decidedBy, 'SPECIAL_RULE_3');
    });
});
