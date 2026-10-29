/**
 * Unit Test Suite for Horary Number Systems (1-9, 1-27, 1-249, 1-2193) & Secure Random Generator
 *
 * Run with: node --test src/kp/gulbarga/horaryTable.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
    KP_9_TABLE,
    KP_27_TABLE,
    KP_249_TABLE,
    KP_2193_TABLE,
    getHoraryEntry,
    getHoraryTable,
    lordsAt,
    getKp249NumberForEntry,
    CIRCLE
} from '../horaryTable.js';
import { randomInRange, validateHoraryNumber } from '../random.js';

describe("Horary Tables Lengths & Contiguity (§9.2)", () => {
    test("Table lengths must be exactly 9, 27, 249, 2193", () => {
        assert.strictEqual(KP_9_TABLE.length, 9);
        assert.strictEqual(KP_27_TABLE.length, 27);
        assert.strictEqual(KP_249_TABLE.length, 249);
        assert.strictEqual(KP_2193_TABLE.length, 2193);
    });

    test("1–249 table segments are contiguous, positive length, and cover 0 to 360°", () => {
        assert.strictEqual(KP_249_TABLE[0].startUnits, 0);
        assert.strictEqual(KP_249_TABLE[KP_249_TABLE.length - 1].endUnits, CIRCLE);

        let splitCount = 0;
        for (let i = 0; i < KP_249_TABLE.length; i++) {
            const row = KP_249_TABLE[i];
            assert(row.endUnits > row.startUnits, `Row #${row.no} length must be > 0`);
            if (i > 0) {
                assert.strictEqual(row.startUnits, KP_249_TABLE[i - 1].endUnits, `Row #${row.no} must be contiguous with previous`);
            }
            if (row.isSplit) splitCount++;
        }
        assert.strictEqual(splitCount, 12, `Exactly 6 split pairs (12 split sub segments) in 249 table`);
    });

    test("1–2193 table segments are contiguous, positive length, and cover 0 to 360°", () => {
        assert.strictEqual(KP_2193_TABLE[0].startUnits, 0);
        assert.strictEqual(KP_2193_TABLE[KP_2193_TABLE.length - 1].endUnits, CIRCLE);

        for (let i = 0; i < KP_2193_TABLE.length; i++) {
            const row = KP_2193_TABLE[i];
            assert(row.endUnits > row.startUnits, `Row #${row.no} length must be > 0`);
            if (i > 0) {
                assert.strictEqual(row.startUnits, KP_2193_TABLE[i - 1].endUnits, `Row #${row.no} must be contiguous with previous`);
            }
        }

        // Exactly 6 sign boundaries cut through sub-subs: 2187 raw sub-subs + 6 splits = 2193 entries
        // Let's verify startUnits === sign cusp (30°, 60°, ... 330°)
        const signCusps = [324000, 648000, 972000, 1296000, 1620000, 1944000, 2268000, 2592000, 2916000, 3240000, 3564000];
        let signCuspMatches = 0;
        for (const cusp of signCusps) {
            const found = KP_2193_TABLE.some(r => r.startUnits === cusp);
            if (found) signCuspMatches++;
        }
        assert.strictEqual(signCuspMatches, 11);
    });

    test("1–9 table contains first 9 entries of 1-249 table (all Ashwini: Mars-Ketu-X-X)", () => {
        for (let i = 0; i < 9; i++) {
            assert.strictEqual(KP_9_TABLE[i].sign, 'Aries');
            assert.strictEqual(KP_9_TABLE[i].signLord, 'Mars');
            assert.strictEqual(KP_9_TABLE[i].starLord, 'Ketu');
            assert.strictEqual(KP_9_TABLE[i].nakshatraName, 'Ashwini');
            assert.strictEqual(KP_9_TABLE[i].startUnits, KP_249_TABLE[i].startUnits);
        }
    });

    test("1–27 table starts of each nakshatra (star = sub = SS = nakshatra lord)", () => {
        for (let i = 0; i < 27; i++) {
            const entry = KP_27_TABLE[i];
            assert.strictEqual(entry.starLord, entry.subLord);
            assert.strictEqual(entry.subLord, entry.subSubLord);
            assert.strictEqual(entry.no, i + 1);
        }
    });
});

describe("Spot Values Verification (§3.2)", () => {
    test("9: 4 -> Aries 3°40'00\" | Mars–Ketu–Moon–Moon", () => {
        const e = getHoraryEntry('1-9', 4);
        assert.strictEqual(e.startDMS, `Aries 3°40'00"`);
        assert.strictEqual(`${e.signLord}-${e.starLord}-${e.subLord}-${e.subSubLord}`, 'Mars-Ketu-Moon-Moon');
    });

    test("9: 9 -> Aries 11°26'40\" | Mars–Ketu–Mercury–Mercury", () => {
        const e = getHoraryEntry('1-9', 9);
        assert.strictEqual(e.startDMS, `Aries 11°26'40"`);
        assert.strictEqual(`${e.signLord}-${e.starLord}-${e.subLord}-${e.subSubLord}`, 'Mars-Ketu-Mercury-Mercury');
    });

    test("27: 3 -> Aries 26°40'00\" | Mars–Sun–Sun–Sun", () => {
        const e = getHoraryEntry('1-27', 3);
        assert.strictEqual(e.startDMS, `Aries 26°40'00"`);
        assert.strictEqual(`${e.signLord}-${e.starLord}-${e.subLord}-${e.subSubLord}`, 'Mars-Sun-Sun-Sun');
    });

    test("27: 7 -> Gemini 20°00'00\" | Mercury–Jupiter–Jupiter–Jupiter", () => {
        const e = getHoraryEntry('1-27', 7);
        assert.strictEqual(e.startDMS, `Gemini 20°00'00"`);
        assert.strictEqual(`${e.signLord}-${e.starLord}-${e.subLord}-${e.subSubLord}`, 'Mercury-Jupiter-Jupiter-Jupiter');
    });

    test("249: 1 -> Aries 0°00'00\" | Mars–Ketu–Ketu–Ketu", () => {
        const e = getHoraryEntry('1-249', 1);
        assert.strictEqual(e.startDMS, `Aries 0°00'00"`);
        assert.strictEqual(`${e.signLord}-${e.starLord}-${e.subLord}-${e.subSubLord}`, 'Mars-Ketu-Ketu-Ketu');
    });

    test("249: 22 -> Aries 29°13'20\" | Mars–Sun–Rahu–Rahu", () => {
        const e = getHoraryEntry('1-249', 22);
        assert.strictEqual(e.startDMS, `Aries 29°13'20"`);
        assert.strictEqual(`${e.signLord}-${e.starLord}-${e.subLord}-${e.subSubLord}`, 'Mars-Sun-Rahu-Rahu');
    });

    test("249: 23 -> Taurus 0°00'00\" | Venus–Sun–Rahu–Saturn", () => {
        const e = getHoraryEntry('1-249', 23);
        assert.strictEqual(e.startDMS, `Taurus 0°00'00"`);
        assert.strictEqual(`${e.signLord}-${e.starLord}-${e.subLord}-${e.subSubLord}`, 'Venus-Sun-Rahu-Saturn');
    });

    test("249: 24 -> Taurus 1°13'20\" | Venus–Sun–Jupiter–Jupiter", () => {
        const e = getHoraryEntry('1-249', 24);
        assert.strictEqual(e.startDMS, `Taurus 1°13'20"`);
        assert.strictEqual(`${e.signLord}-${e.starLord}-${e.subLord}-${e.subSubLord}`, 'Venus-Sun-Jupiter-Jupiter');
    });

    test("249: 56 -> Gemini 20°00'00\" | Mercury–Jupiter–Jupiter–Jupiter", () => {
        const e = getHoraryEntry('1-249', 56);
        assert.strictEqual(e.startDMS, `Gemini 20°00'00"`);
        assert.strictEqual(`${e.signLord}-${e.starLord}-${e.subLord}-${e.subSubLord}`, 'Mercury-Jupiter-Jupiter-Jupiter');
    });

    test("249: 249 -> Pisces 27°53'20\" | Jupiter–Mercury–Saturn–Saturn", () => {
        const e = getHoraryEntry('1-249', 249);
        assert.strictEqual(e.startDMS, `Pisces 27°53'20"`);
        assert.strictEqual(`${e.signLord}-${e.starLord}-${e.subLord}-${e.subSubLord}`, 'Jupiter-Mercury-Saturn-Saturn');
    });

    test("2193: 5 -> Aries 0°16'43.33\" | Mars–Ketu–Ketu–Mars", () => {
        const e = getHoraryEntry('1-2193', 5);
        assert.strictEqual(e.startDMS, `Aries 0°16'43.33"`);
        assert.strictEqual(`${e.signLord}-${e.starLord}-${e.subLord}-${e.subSubLord}`, 'Mars-Ketu-Ketu-Mars');
    });

    test("2193: 119 -> Aries 18°24'40\" | Mars–Venus–Rahu–Jupiter", () => {
        const e = getHoraryEntry('1-2193', 119);
        assert.strictEqual(e.startDMS, `Aries 18°24'40"`);
        assert.strictEqual(`${e.signLord}-${e.starLord}-${e.subLord}-${e.subSubLord}`, 'Mars-Venus-Rahu-Jupiter');
    });

    test("2193: 1205 -> Libra 18°35'00\" | Venus–Rahu–Moon–Saturn", () => {
        const e = getHoraryEntry('1-2193', 1205);
        assert.strictEqual(e.startDMS, `Libra 18°35'00"`);
        assert.strictEqual(`${e.signLord}-${e.starLord}-${e.subLord}-${e.subSubLord}`, 'Venus-Rahu-Moon-Saturn');
    });

    test("2193: 2193 -> Pisces 29°43'06.67\" | Jupiter–Mercury–Saturn–Jupiter", () => {
        const e = getHoraryEntry('1-2193', 2193);
        assert.strictEqual(e.startDMS, `Pisces 29°43'06.67"`);
        assert.strictEqual(`${e.signLord}-${e.starLord}-${e.subLord}-${e.subSubLord}`, 'Jupiter-Mercury-Saturn-Jupiter');
    });
});

describe("Random Generator Unbiased Distribution & Range (§9.2)", () => {
    test("100k draws for 1–9 stay strictly in range [1, 9] and hits all 9 values", () => {
        const hits = new Set();
        for (let i = 0; i < 100000; i++) {
            const val = randomInRange(9);
            assert(val >= 1 && val <= 9, `Out of range: ${val}`);
            hits.add(val);
        }
        assert.strictEqual(hits.size, 9);
    });

    test("100k draws for 1–27 stay strictly in range [1, 27] and hits all 27 values", () => {
        const hits = new Set();
        for (let i = 0; i < 100000; i++) {
            const val = randomInRange(27);
            assert(val >= 1 && val <= 27, `Out of range: ${val}`);
            hits.add(val);
        }
        assert.strictEqual(hits.size, 27);
    });

    test("100k draws for 1–249 stay strictly in range [1, 249] and hits all 249 values", () => {
        const hits = new Set();
        for (let i = 0; i < 100000; i++) {
            const val = randomInRange(249);
            assert(val >= 1 && val <= 249, `Out of range: ${val}`);
            hits.add(val);
        }
        assert.strictEqual(hits.size, 249);
    });

    test("100k draws for 1–2193 stay strictly in range [1, 2193]", () => {
        for (let i = 0; i < 100000; i++) {
            const val = randomInRange(2193);
            assert(val >= 1 && val <= 2193, `Out of range: ${val}`);
        }
    });

    test("Validation & large number reduction toggle", () => {
        // Without reduction: 5000 in 1-2193 -> error
        const v1 = validateHoraryNumber(5000, '1-2193', false);
        assert.strictEqual(v1.valid, false);

        // With reduction: 5000 in 1-2193 -> ((5000 - 1) % 2193) + 1 = 614
        const v2 = validateHoraryNumber(5000, '1-2193', true);
        assert.strictEqual(v2.valid, true);
        assert.strictEqual(v2.value, 614);
        assert.strictEqual(v2.reduced, true);
        assert.strictEqual(v2.originalValue, 5000);

        // Zero / negative / non-integer
        assert.strictEqual(validateHoraryNumber(0, '1-249').valid, false);
        assert.strictEqual(validateHoraryNumber(-5, '1-249').valid, false);
        assert.strictEqual(validateHoraryNumber(12.5, '1-249').valid, false);
        assert.strictEqual(validateHoraryNumber('abc', '1-249').valid, false);
        assert.strictEqual(validateHoraryNumber('', '1-249').valid, false);
    });
});

describe("Horary entry labels & 1-249 mapping", () => {
    test("1–27 end labels name the sign the nakshatra actually ends in", () => {
        // Krittika: Aries 26°40' -> Taurus 10°00'
        assert.strictEqual(getHoraryEntry('1-27', 3).endDMS, `Taurus 10°00'00"`);
        // Ashwini ends inside Aries; Revati ends exactly at the end of Pisces
        assert.strictEqual(getHoraryEntry('1-27', 1).endDMS, `Aries 13°20'00"`);
        assert.strictEqual(getHoraryEntry('1-27', 27).endDMS, `Pisces 30°00'00"`);
        for (const entry of KP_27_TABLE) {
            const endSign = entry.endDMS.split(' ')[0];
            const expected = entry.endUnits % (CIRCLE / 12) === 0
                ? entry.sign
                : lordsAt(entry.endUnits).sign;
            assert.strictEqual(endSign, expected, `#${entry.no}/27 end label`);
        }
    });

    test("Every 1–249 entry maps to itself", () => {
        for (const entry of KP_249_TABLE) {
            assert.strictEqual(getKp249NumberForEntry(entry), entry.no);
        }
    });

    test("1–9, 1–27 and 1–2193 entries map to the 1–249 span containing their start", () => {
        // 1–9 is the first 9 subs of Ashwini
        assert.strictEqual(getKp249NumberForEntry(getHoraryEntry('1-9', 8)), 8);
        // Krittika starts at Aries 26°40' = the first Krittika sub (#19/249)
        assert.strictEqual(getKp249NumberForEntry(getHoraryEntry('1-27', 3)), 19);
        for (const entry of [...KP_27_TABLE, ...KP_2193_TABLE]) {
            const no = getKp249NumberForEntry(entry);
            const kp = KP_249_TABLE[no - 1];
            assert.ok(entry.startUnits >= kp.startUnits && entry.startUnits < kp.endUnits, `start of entry ${entry.no} inside #${no}/249`);
            assert.strictEqual(kp.subLord, entry.subLord, `entry ${entry.no} shares the sub lord of #${no}/249`);
        }
        assert.strictEqual(getKp249NumberForEntry(null), null);
    });
});
