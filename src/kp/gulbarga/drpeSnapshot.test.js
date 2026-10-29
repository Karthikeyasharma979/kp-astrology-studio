/**
 * Integration Test Suite for DRPE Daily Snapshot & Ephemeris (§9.4)
 *
 * Run with: node --test src/kp/gulbarga/drpeSnapshot.test.js
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { snapshotDateFor, getSnapshot, clearSnapshotCache } from './drpeSnapshot.js';
import { evaluateTsp } from './evaluateTsp.js';
import { getHoraryEntry } from '../horaryTable.js';
import { DEFAULT_TSP_SETTINGS } from './types.js';

describe("DRPE Snapshot Day Boundary (§9.4)", () => {
    test("snapshotDateFor(2026-10-27T05:29:59+05:30) -> 2026-10-26", () => {
        const d = new Date("2026-10-27T05:29:59+05:30");
        assert.strictEqual(snapshotDateFor(d), "2026-10-26");
    });

    test("snapshotDateFor(2026-10-27T05:30:00+05:30) -> 2026-10-27", () => {
        const d = new Date("2026-10-27T05:30:00+05:30");
        assert.strictEqual(snapshotDateFor(d), "2026-10-27");
    });
});

describe("Ephemeris Planet Coordinates at 00:00 UTC (§9.4)", () => {
    test("16-Oct-2016 00:00 UTC: Moon ≈ Pisces 26°28' (Jupiter-Mercury-Jupiter-Saturn) & Saturn ≈ Scorpio 18°50' (Mars-Mercury-Ketu-Mars)", () => {
        clearSnapshotCache();
        const snap = getSnapshot("2016-10-16");

        const moon = snap.planets['Moon'];
        const saturn = snap.planets['Saturn'];

        assert(moon, "Moon must exist in snapshot");
        assert(saturn, "Saturn must exist in snapshot");

        // Longitude tolerances (within ±2')
        // Moon in Pisces: 330° to 360°. 26°28' = 356.4667°
        const moonDegInSign = moon.degreeInSign;
        const moonMinInSign = (moonDegInSign - Math.floor(moonDegInSign)) * 60;
        assert.strictEqual(Math.floor(moonDegInSign), 26, `Moon degree in Pisces should be 26°, got ${Math.floor(moonDegInSign)}°`);
        assert(Math.abs(moonMinInSign - 28) <= 2, `Moon minutes should be ~28', got ${moonMinInSign.toFixed(2)}'`);

        assert.strictEqual(moon.signFull, 'Pisces');
        assert.strictEqual(moon.signLord, 'Jupiter');
        assert.strictEqual(moon.starLord, 'Mercury');
        assert.strictEqual(moon.subLord, 'Jupiter');
        assert.strictEqual(moon.subSubLord, 'Saturn');

        // Saturn in Scorpio: 210° to 240°. 18°50' = 228.8333°
        const saturnDegInSign = saturn.degreeInSign;
        const saturnMinInSign = (saturnDegInSign - Math.floor(saturnDegInSign)) * 60;
        assert.strictEqual(Math.floor(saturnDegInSign), 18, `Saturn degree in Scorpio should be 18°, got ${Math.floor(saturnDegInSign)}°`);
        assert(Math.abs(saturnMinInSign - 50) <= 2, `Saturn minutes should be ~50', got ${saturnMinInSign.toFixed(2)}'`);

        assert.strictEqual(saturn.signFull, 'Scorpio');
        assert.strictEqual(saturn.signLord, 'Mars');
        assert.strictEqual(saturn.starLord, 'Mercury');
        assert.strictEqual(saturn.subLord, 'Ketu');
        assert.strictEqual(saturn.subSubLord, 'Mars');
    });

    test("End-to-End Evaluation of No. 4/9 on 16-Oct-2016 -> YES (book-04)", () => {
        const snap = getSnapshot("2016-10-16");
        const entry4 = getHoraryEntry('1-9', 4);

        const ascLords = {
            sign: entry4.signLord,
            star: entry4.starLord,
            sub: entry4.subLord,
            subSub: entry4.subSubLord
        };

        const res = evaluateTsp(ascLords, snap.moonLords, snap.planets, DEFAULT_TSP_SETTINGS);

        assert.strictEqual(res.answer, 'YES');
        assert.strictEqual(res.decidedBy, 'SPECIAL_ASC_SS_MOON');
        assert.strictEqual(res.punarphoo.applied, false);
    });

    test("Memoization: Repeated calls for same date return identical cached reference", () => {
        const s1 = getSnapshot("2016-10-16");
        const s2 = getSnapshot("2016-10-16");
        assert.strictEqual(s1, s2);
    });
});
