/**
 * Unit Test Suite for Vedic Whole-Sign Aspects & Node Agency (§9.3)
 *
 * Run with: node --test src/kp/gulbarga/vedicAspects.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { aspectsSign, getSignIndex } from './vedicAspects.js';
import { agentsOf } from './nodeAgents.js';

describe("Vedic Whole-Sign Aspects (§9.3)", () => {
    test("Saturn in Sagittarius aspects Aquarius (3rd aspect) -> true", () => {
        assert.strictEqual(aspectsSign('Saturn', 'Sg', 'Aq'), true);
        assert.strictEqual(aspectsSign('Saturn', 'Sagittarius', 'Aquarius'), true);
        assert.strictEqual(aspectsSign('Saturn', 8, 10), true);
    });

    test("Saturn in Scorpio aspects Leo (10th aspect) -> true", () => {
        assert.strictEqual(aspectsSign('Saturn', 'Sc', 'Le'), true);
        assert.strictEqual(aspectsSign('Saturn', 'Scorpio', 'Leo'), true);
        assert.strictEqual(aspectsSign('Saturn', 7, 4), true);
    });

    test("Saturn in Cancer to Libra (4th house) -> false", () => {
        assert.strictEqual(aspectsSign('Saturn', 'Cn', 'Li'), false);
        assert.strictEqual(aspectsSign('Saturn', 'Cancer', 'Libra'), false);
        assert.strictEqual(aspectsSign('Saturn', 3, 6), false);
    });

    test("Mars in Scorpio to Capricorn (3rd house) -> false", () => {
        assert.strictEqual(aspectsSign('Mars', 'Sc', 'Cp'), false);
        assert.strictEqual(aspectsSign('Mars', 'Scorpio', 'Capricorn'), false);
        assert.strictEqual(aspectsSign('Mars', 7, 9), false);
    });

    test("Jupiter in Cancer aspects Scorpio (5th aspect) -> true", () => {
        assert.strictEqual(aspectsSign('Jupiter', 'Cn', 'Sc'), true);
        assert.strictEqual(aspectsSign('Jupiter', 'Cancer', 'Scorpio'), true);
        assert.strictEqual(aspectsSign('Jupiter', 3, 7), true);
    });

    test("General 7th aspect for all non-node planets", () => {
        assert.strictEqual(aspectsSign('Sun', 'Ar', 'Li'), true);
        assert.strictEqual(aspectsSign('Moon', 'Ta', 'Sc'), true);
        assert.strictEqual(aspectsSign('Mercury', 'Ge', 'Sg'), true);
        assert.strictEqual(aspectsSign('Venus', 'Cn', 'Cp'), true);
    });

    test("Nodes never count as aspecting", () => {
        assert.strictEqual(aspectsSign('Rahu', 'Ar', 'Li'), false);
        assert.strictEqual(aspectsSign('Ketu', 'Ta', 'Sc'), false);
    });
});

describe("Node Agency Priority Order & Deduplication (§9.3)", () => {
    test("Rahu in Aq with Mercury in Aq, star Jupiter, Saturn in Cn -> [Jupiter, Saturn, Mercury]", () => {
        const planets = {
            Rahu: { sign: 'Aq', starLord: 'Jupiter' },
            Mercury: { sign: 'Aq', starLord: 'Sun' },
            Saturn: { sign: 'Cn', starLord: 'Mercury' },
            Sun: { sign: 'Pi', starLord: 'Jupiter' },
            Moon: { sign: 'Ar', starLord: 'Ketu' },
            Mars: { sign: 'Ge', starLord: 'Mars' },
            Jupiter: { sign: 'Le', starLord: 'Venus' },
            Venus: { sign: 'Vi', starLord: 'Mars' },
            Ketu: { sign: 'Le', starLord: 'Ketu' }
        };

        const agents = agentsOf('Rahu', planets);
        // Order:
        // 1. Star lord of Rahu: Jupiter
        // 2. Sign lord of Rahu (Aquarius): Saturn
        // 3. Conjoined: Mercury (in Aq)
        // 4. Aspecting: None of the other planets aspect Aquarius
        // Deduplicated: [Jupiter, Saturn, Mercury]
        assert.deepStrictEqual(agents, ['Jupiter', 'Saturn', 'Mercury']);
    });

    test("Non-node planet returns empty array", () => {
        assert.deepStrictEqual(agentsOf('Mars', {}), []);
        assert.deepStrictEqual(agentsOf('Sun', {}), []);
    });

    test("Other node as star lord is skipped", () => {
        const planets = {
            Rahu: { sign: 'Ar', starLord: 'Ketu' }, // Ketu is the other node -> skipped!
            Sun: { sign: 'Ta', starLord: 'Sun' }
        };
        const agents = agentsOf('Rahu', planets);
        // Star lord Ketu skipped. Sign lord of Aries is Mars.
        assert.deepStrictEqual(agents, ['Mars']);
    });
});
