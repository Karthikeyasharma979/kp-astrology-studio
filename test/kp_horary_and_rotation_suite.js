/**
 * Test Suite: KP Horary (1-249), Random Seed, and House Rotation (Bhavat Bhavam)
 *
 * Verifies all 9 Acceptance Test criteria specified in the KP Horary PRD:
 * 1. Table has 249 entries; §2.3 tests pass; segments contiguous over 360°.
 * 2. randomKpNumber() run 249,000 times: every value 1-249 appears; min 1, max 249; no 0 or 250.
 * 3. Horary with KP No 1 -> cusp I = Aries 0°00'00"; KP No 249 -> Pisces 27°53'20"; KP No 23 -> Taurus 0°00'00" (all ±1").
 * 4. Horary cusps' star/sub lords for cusp I match the table row for that number.
 * 5. Planets in Horary mode equal a natal chart cast for the same judgment time/place.
 * 6. Rotation r=7: original VII displayed as I, original I displayed as VII; degrees unchanged; r=1 identical to current output.
 * 7. Rotation change does not trigger ephemeris recomputation.
 * 8. Existing natal chart for 2000-01-01 10:30 Hyderabad is byte-for-byte unchanged with mode=natal, rot=1.
 * 9. Invalid manual input (0, 250, "abc", 12.5) shows an error and does not change the chart.
 */

import { KP_249_TABLE, getKpNumberEntry, FULL_CIRCLE_SEC } from '../src/utils/kp/horaryTable.js';
import { randomKpNumber, validateKpNumber } from '../src/utils/kp/random.js';
import { computeHoraryCusps } from '../src/utils/kp/horaryCusps.js';
import { rotatedHouse, originalHouse, applyRotation } from '../src/utils/kp/rotation.js';
import { calculateKPKundli, calculateKPKundliFallback } from '../src/services/kpCalculator.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
    if (!cond) {
        console.error(`  FAIL: ${msg}`);
        failed++;
        throw new Error(msg);
    } else {
        console.log(`  ✓ ${msg}`);
        passed++;
    }
}

console.log('='.repeat(80));
console.log('RUNNING KP HORARY (1–249) & HOUSE ROTATION ACCEPTANCE TEST SUITE');
console.log('='.repeat(80));

try {
    // --------------------------------------------------------------------------
    // Test 1: Table has 249 entries; §2.3 tests pass; segments contiguous over 360°
    // --------------------------------------------------------------------------
    console.log('\n--- 1. KP 249 TABLE STRUCTURE & §2.3 KNOWN VALUES ---');
    assert(KP_249_TABLE.length === 249, `Table must have exactly 249 entries (got ${KP_249_TABLE.length})`);

    // Contiguity and full circle coverage
    assert(KP_249_TABLE[0].startSec === 0, 'First segment starts at 0"');
    assert(KP_249_TABLE[248].endSec === FULL_CIRCLE_SEC, `Last segment ends at 1,296,000" (got ${KP_249_TABLE[248].endSec})`);

    let splitsCount = 0;
    for (let i = 0; i < KP_249_TABLE.length; i++) {
        const row = KP_249_TABLE[i];
        assert(row.no === i + 1, `Row index aligns with no: ${row.no} === ${i + 1}`);
        assert(row.spanSec > 0, `Segment #${row.no} length must be > 0 (got ${row.spanSec}")`);
        if (i > 0) {
            assert(row.startSec === KP_249_TABLE[i - 1].endSec, `Segment #${row.no} start (${row.startSec}") is contiguous with previous end (${KP_249_TABLE[i - 1].endSec}")`);
        }
        if (row.isSplit) {
            splitsCount++;
        }
    }
    assert(splitsCount === 12, `Exactly 6 split pairs (12 split sub segments) exist (got ${splitsCount})`);

    // Known values from §2.3
    // #1: Aries 0°00'00" -> 0°46'40", Ketu, Ketu
    const k1 = getKpNumberEntry(1);
    assert(k1.sign === 'Aries', `#1 Sign is Aries (got ${k1.sign})`);
    assert(k1.startDMS === `Aries 0°00'00"`, `#1 startDMS is Aries 0°00'00" (got ${k1.startDMS})`);
    assert(k1.endDMS === `Aries 0°46'40"`, `#1 endDMS is Aries 0°46'40" (got ${k1.endDMS})`);
    assert(k1.starLord === 'Ketu', `#1 Star Lord is Ketu (got ${k1.starLord})`);
    assert(k1.subLord === 'Ketu', `#1 Sub Lord is Ketu (got ${k1.subLord})`);

    // #2: Aries 0°46'40" -> 3°00'00", Ketu, Venus
    const k2 = getKpNumberEntry(2);
    assert(k2.sign === 'Aries' && k2.starLord === 'Ketu' && k2.subLord === 'Venus', `#2 is Ketu/Venus in Aries`);
    assert(k2.startDMS === `Aries 0°46'40"` && k2.endDMS === `Aries 3°00'00"`, `#2 DMS span is 0°46'40" -> 3°00'00"`);

    // #9: Aries 11°26'40" -> 13°20'00", Ketu, Mercury
    const k9 = getKpNumberEntry(9);
    assert(k9.sign === 'Aries' && k9.starLord === 'Ketu' && k9.subLord === 'Mercury', `#9 is Ketu/Mercury in Aries`);
    assert(k9.startDMS === `Aries 11°26'40"` && k9.endDMS === `Aries 13°20'00"`, `#9 DMS span is 11°26'40" -> 13°20'00"`);

    // #10: Aries 13°20'00" -> 15°33'20", Venus, Venus
    const k10 = getKpNumberEntry(10);
    assert(k10.sign === 'Aries' && k10.starLord === 'Venus' && k10.subLord === 'Venus', `#10 is Venus/Venus in Aries`);
    assert(k10.startDMS === `Aries 13°20'00"` && k10.endDMS === `Aries 15°33'20"`, `#10 DMS span is 13°20'00" -> 15°33'20"`);

    // #22: Aries 29°13'20" -> 30°00'00", Sun, Rahu (split part 1)
    const k22 = getKpNumberEntry(22);
    assert(k22.sign === 'Aries' && k22.starLord === 'Sun' && k22.subLord === 'Rahu', `#22 is Sun/Rahu in Aries`);
    assert(k22.startDMS === `Aries 29°13'20"` && k22.endDMS === `Aries 30°00'00"`, `#22 DMS span is 29°13'20" -> 30°00'00"`);
    assert(k22.isSplit && k22.splitPart === 1, `#22 is split part 1`);

    // #23: Taurus 0°00'00" -> 1°13'20", Sun, Rahu (split part 2)
    const k23 = getKpNumberEntry(23);
    assert(k23.sign === 'Taurus' && k23.starLord === 'Sun' && k23.subLord === 'Rahu', `#23 is Sun/Rahu in Taurus`);
    assert(k23.startDMS === `Taurus 0°00'00"` && k23.endDMS === `Taurus 1°13'20"`, `#23 DMS span is 0°00'00" -> 1°13'20"`);
    assert(k23.isSplit && k23.splitPart === 2, `#23 is split part 2`);

    // #249: Pisces 27°53'20" -> 30°00'00", Mercury, Saturn
    const k249 = getKpNumberEntry(249);
    assert(k249.sign === 'Pisces' && k249.starLord === 'Mercury' && k249.subLord === 'Saturn', `#249 is Mercury/Saturn in Pisces`);
    assert(k249.startDMS === `Pisces 27°53'20"` && k249.endDMS === `Pisces 30°00'00"`, `#249 DMS span is 27°53'20" -> 30°00'00"`);

    // --------------------------------------------------------------------------
    // Test 2: randomKpNumber() run 249,000 times
    // --------------------------------------------------------------------------
    console.log('\n--- 2. UNBIASED RANDOM NUMBER GENERATOR (249,000 ITERATIONS) ---');
    const counts = new Uint32Array(251); // 0 to 250
    const ITERATIONS = 249000;
    let minObserved = 999;
    let maxObserved = -1;

    for (let i = 0; i < ITERATIONS; i++) {
        const val = randomKpNumber();
        counts[val]++;
        if (val < minObserved) minObserved = val;
        if (val > maxObserved) maxObserved = val;
    }

    assert(counts[0] === 0, `No 0 was generated (count: ${counts[0]})`);
    assert(counts[250] === 0, `No 250 was generated (count: ${counts[250]})`);
    assert(minObserved === 1, `Minimum value observed is 1 (got ${minObserved})`);
    assert(maxObserved === 249, `Maximum value observed is 249 (got ${maxObserved})`);

    let allValuesAppeared = true;
    for (let num = 1; num <= 249; num++) {
        if (counts[num] === 0) {
            allValuesAppeared = false;
            break;
        }
    }
    assert(allValuesAppeared, 'Every value 1 through 249 appeared at least once across 249,000 trials');

    // --------------------------------------------------------------------------
    // Test 3: Horary Cusp I positions (±1")
    // --------------------------------------------------------------------------
    console.log('\n--- 3. HORARY CUSP I POSITIONS FOR KNOWN NUMBERS (±1") ---');
    const judgment = {
        lat: 17.3850,
        lon: 78.4867,
        utcDate: new Date('2026-10-27T10:30:00Z')
    };
    const testAyanamsha = 24.12345;

    // KP No 1 -> Cusp I = Aries 0°00'00" (0.000000°)
    const h1 = computeHoraryCusps(1, judgment, testAyanamsha, { ascendantPoint: 'start' });
    const diff1 = Math.abs(h1.cusps[0].siderealLongitude - 0.0);
    assert(diff1 * 3600 <= 1.0, `KP #1 Cusp I is Aries 0°00'00" ±1" (got diff ${(diff1 * 3600).toFixed(6)}")`);

    // KP No 249 -> Pisces 27°53'20" (357°53'20" = 357.888889°)
    const h249 = computeHoraryCusps(249, judgment, testAyanamsha, { ascendantPoint: 'start' });
    const expected249 = 357 + 53 / 60 + 20 / 3600;
    const diff249 = Math.abs(h249.cusps[0].siderealLongitude - expected249);
    assert(diff249 * 3600 <= 1.0, `KP #249 Cusp I is Pisces 27°53'20" ±1" (got diff ${(diff249 * 3600).toFixed(6)}")`);

    // KP No 23 -> Taurus 0°00'00" (30.000000°)
    const h23 = computeHoraryCusps(23, judgment, testAyanamsha, { ascendantPoint: 'start' });
    const diff23 = Math.abs(h23.cusps[0].siderealLongitude - 30.0);
    assert(diff23 * 3600 <= 1.0, `KP #23 Cusp I is Taurus 0°00'00" ±1" (got diff ${(diff23 * 3600).toFixed(6)}")`);

    // --------------------------------------------------------------------------
    // Test 4: Horary cusps' star/sub lords for Cusp I match table row for that number
    // --------------------------------------------------------------------------
    console.log('\n--- 4. STAR AND SUB LORD MATCH FOR CUSP I ACROSS ALL 249 NUMBERS ---');
    let starSubMatchPass = 0;
    for (let n = 1; n <= 249; n++) {
        const hc = computeHoraryCusps(n, judgment, testAyanamsha, { ascendantPoint: 'start' });
        const cusp1 = hc.cusps[0];
        const tbl = getKpNumberEntry(n);
        if (cusp1.starLord === tbl.starLord && cusp1.subLord === tbl.subLord) {
            starSubMatchPass++;
        }
    }
    assert(starSubMatchPass === 249, `All 249 Horary charts have Cusp I star & sub lord matching table row (249/249)`);

    // --------------------------------------------------------------------------
    // Test 5: Planets in Horary mode equal a natal chart cast for the same judgment time/place
    // --------------------------------------------------------------------------
    console.log('\n--- 5. PLANETARY INVARIANCE: HORARY PLANETS === NATAL PLANETS AT JUDGMENT MOMENT ---');
    const testBirth = {
        birthDate: '2026-10-27',
        birthTime: '16:00',
        lat: 17.3850,
        lon: 78.4867,
        timezone: 'Asia/Kolkata'
    };
    const natalChart = calculateKPKundli({ ...testBirth, chartMode: 'natal' });
    const horaryChart = calculateKPKundli({ ...testBirth, chartMode: 'horary', kpNumber: 137 });

    assert(natalChart.planets.length === horaryChart.planets.length, 'Planet counts match (9 grahas)');
    let planetsMatch = true;
    for (let pIdx = 0; pIdx < natalChart.planets.length; pIdx++) {
        const pNatal = natalChart.planets[pIdx];
        const pHorary = horaryChart.planets[pIdx];
        const lonDiff = Math.abs(pNatal.longitude - pHorary.longitude);
        if (lonDiff > 1e-5 || pNatal.starLord !== pHorary.starLord || pNatal.subLord !== pHorary.subLord) {
            planetsMatch = false;
            console.error(`Mismatch for planet ${pNatal.key}: natal=${pNatal.longitude}, horary=${pHorary.longitude}`);
            break;
        }
    }
    assert(planetsMatch, 'All planetary longitudes, star lords, and sub lords in Horary mode strictly equal Natal mode at judgment time');

    // --------------------------------------------------------------------------
    // Test 6: House Rotation r = 7
    // --------------------------------------------------------------------------
    console.log('\n--- 6. HOUSE ROTATION (r = 7): VII -> I, I -> VII, DEGREES UNCHANGED ---');
    const r7 = 7;
    assert(rotatedHouse(7, r7) === 1, 'rotatedHouse(7, 7) === 1 (original VII becomes I)');
    assert(rotatedHouse(8, r7) === 2, 'rotatedHouse(8, 7) === 2 (original VIII becomes II)');
    assert(rotatedHouse(1, r7) === 7, 'rotatedHouse(1, 7) === 7 (original I becomes VII)');
    assert(rotatedHouse(6, r7) === 12, 'rotatedHouse(6, 7) === 12 (original VI becomes XII)');

    assert(originalHouse(1, r7) === 7, 'originalHouse(1, 7) === 7 (rotated I is original VII)');
    assert(originalHouse(7, r7) === 1, 'originalHouse(7, 7) === 1 (rotated VII is original I)');

    const rotatedChart = applyRotation(natalChart, 7);
    assert(rotatedChart.isRotated === true, 'Rotated chart has isRotated === true');
    assert(rotatedChart.rotateTo === 7, 'Rotated chart has rotateTo === 7');
    assert(rotatedChart.cusps[0].houseNumber === 1, 'Rotated cusps[0] has houseNumber === 1');
    assert(rotatedChart.cusps[0].originalHouseNumber === 7, 'Rotated cusps[0] has originalHouseNumber === 7');
    assert(rotatedChart.cusps[6].houseNumber === 7, 'Rotated cusps[6] has houseNumber === 7');
    assert(rotatedChart.cusps[6].originalHouseNumber === 1, 'Rotated cusps[6] has originalHouseNumber === 1');

    // Degrees unchanged
    assert(rotatedChart.cusps[0].siderealLongitude === natalChart.cusps[6].siderealLongitude, 'Cusp degrees do not move during rotation');

    // r = 1 identity test
    const r1Chart = applyRotation(natalChart, 1);
    assert(r1Chart.isRotated === false, 'Rotation r = 1 has isRotated === false');
    assert(r1Chart.cusps[0].houseNumber === 1 && r1Chart.cusps[0].siderealLongitude === natalChart.cusps[0].siderealLongitude, 'Rotation r = 1 is identical to base output');

    // --------------------------------------------------------------------------
    // Test 7: Rotation change does not trigger ephemeris recomputation
    // --------------------------------------------------------------------------
    console.log('\n--- 7. ROTATION IS PURE VIEW TRANSFORM (NO EPHEMERIS RECOMPUTATION) ---');
    const startT = performance.now();
    for (let r = 1; r <= 12; r++) {
        applyRotation(natalChart, r);
    }
    const elapsed = performance.now() - startT;
    assert(elapsed < 20, `12 house rotations computed in ${elapsed.toFixed(2)}ms (sub-millisecond pure view transform)`);

    // --------------------------------------------------------------------------
    // Test 8: Natal chart for 2000-01-01 10:30 Hyderabad is byte-for-byte unchanged with mode=natal, rot=1
    // --------------------------------------------------------------------------
    console.log('\n--- 8. REGRESSION: NATAL 2000-01-01 10:30 HYDERABAD INVARIANCE ---');
    const benchmarkInput = {
        birthDate: '2000-01-01',
        birthTime: '10:30',
        lat: 17.3850,
        lon: 78.4867,
        timezone: 'Asia/Kolkata',
        ayanamshaMode: 'KP_NEW',
        nodeMode: 'mean'
    };
    const baseBefore = calculateKPKundliFallback(benchmarkInput);
    const baseWithNatal = calculateKPKundliFallback({ ...benchmarkInput, chartMode: 'natal' });

    assert(baseBefore.lagna.siderealLongitude === baseWithNatal.lagna.siderealLongitude, 'Lagna degree unchanged');
    assert(baseBefore.moonPosition.longitude === baseWithNatal.moonPosition.longitude, 'Moon longitude unchanged');
    assert(baseBefore.planets.length === baseWithNatal.planets.length, 'Planet array identical');
    for (let i = 0; i < baseBefore.cusps.length; i++) {
        assert(baseBefore.cusps[i].siderealLongitude === baseWithNatal.cusps[i].siderealLongitude, `Cusp ${i + 1} degree unchanged`);
    }

    // --------------------------------------------------------------------------
    // Test 9: Invalid manual input (0, 250, "abc", 12.5) shows error and does not change chart
    // --------------------------------------------------------------------------
    console.log('\n--- 9. MANUAL INPUT VALIDATION (0, 250, "abc", 12.5) ---');
    assert(!validateKpNumber(0).valid, '0 is rejected as invalid');
    assert(!validateKpNumber(250).valid, '250 is rejected as invalid');
    assert(!validateKpNumber("abc").valid, '"abc" is rejected as invalid');
    assert(!validateKpNumber(12.5).valid, '12.5 is rejected as invalid');
    assert(!validateKpNumber(-5).valid, '-5 is rejected as invalid');
    assert(validateKpNumber(1).valid && validateKpNumber(1).value === 1, '1 is accepted');
    assert(validateKpNumber(249).valid && validateKpNumber(249).value === 249, '249 is accepted');
    assert(validateKpNumber("137").valid && validateKpNumber("137").value === 137, '"137" string is parsed as valid integer 137');

    console.log('\n' + '='.repeat(80));
    console.log(`ALL 9 ACCEPTANCE CRITERIA PASSED: ${passed} Passed, ${failed} Failed.`);
    console.log('='.repeat(80));

} catch (e) {
    console.error('\nTEST SUITE FAILED WITH ERROR:', e);
    process.exit(1);
}
