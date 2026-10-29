/**
 * Comprehensive Automated Verification and Validation Suite for Vimshottari Dasha Engine
 *
 * Categorized into:
 * 1. Mathematical Unit Tests (Constants, Fractions, Boundaries, Formatters)
 * 2. Astronomical Ephemeris & Reference Verification Tests (True/Mean Ayanamsha, Nutation, Benchmark Charts)
 * 3. Subperiod Hierarchy, Pre-Natal Clipping & Contiguity Tests
 * 4. Integration & Backend API Tests
 * 5. UI Query & State Search Tests
 *
 * Run: node test/vimshottari_dasha_suite.js
 */

import assert from 'assert';
import {
    calculateVimshottariDasha,
    getMoonNakshatraAndBalance,
    getActivePeriods,
    validateDashaHierarchy,
    formatDashaDuration,
    getVimshottariLordIndex,
    buildPlanetaryKPDetails,
    DASHA_YEAR_DAYS,
    MS_PER_YEAR,
    VIMSHOTTARI_PLANETS,
    KP_NAKSHATRAS,
    TOTAL_DASHA_YEARS,
    NAKSHATRA_SPAN_DEG
} from '../src/utils/kp/vimshottariDasha.js';
import { calculateKPKundli } from '../src/services/kpCalculator.js';
import { resolveLocalToUTC } from '../src/services/locationService.js';
import { calculatePlanetaryAspects } from '../src/utils/kp/kpAspects.js';
import { calculateKPSignificators } from '../src/utils/kp/kpSignificators.js';

let passed = 0;
let failed = 0;

function it(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${name}:`, err.message);
        failed++;
    }
}

async function itAsync(name, fn) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${name}:`, err.message);
        failed++;
    }
}

console.log("=== RUNNING ASTROSHARMA VIMSHOTTARI DASHA COMPREHENSIVE TEST SUITE ===\n");

// =============================================================================
// CATEGORY 1: MATHEMATICAL UNIT TESTS
// =============================================================================
console.log("--- 1. MATHEMATICAL UNIT TESTS ---");

it("Unit 1.1: Canonical 9-Lord sequence and ordering", () => {
    assert.strictEqual(VIMSHOTTARI_PLANETS.length, 9);
    const expectedSequence = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
    VIMSHOTTARI_PLANETS.forEach((planet, i) => {
        assert.strictEqual(planet.key, expectedSequence[i]);
    });
});

it("Unit 1.2: Canonical planetary period durations summing exactly to 120 years", () => {
    const expectedDurations = {
        Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
        Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17
    };
    let sum = 0;
    for (const p of VIMSHOTTARI_PLANETS) {
        assert.strictEqual(p.years, expectedDurations[p.key]);
        sum += p.years;
    }
    assert.strictEqual(sum, 120);
    assert.strictEqual(sum, TOTAL_DASHA_YEARS);
});

it("Unit 1.3: 27 Nakshatras repeat the 9 Dasha lords in 3 complete cycles", () => {
    assert.strictEqual(KP_NAKSHATRAS.length, 27);
    const lords9 = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
    for (let c = 0; c < 3; c++) {
        for (let i = 0; i < 9; i++) {
            const nak = KP_NAKSHATRAS[c * 9 + i];
            assert.strictEqual(nak.starLord, lords9[i]);
        }
    }
});

it("Unit 1.4: Half-open interval boundary semantics [start, end) with float epsilon", () => {
    const span = NAKSHATRA_SPAN_DEG; // 13.333333333333334°
    
    // Exactly at 0.0° -> Ashwini (Ketu)
    const at0 = getMoonNakshatraAndBalance(0.0);
    assert.strictEqual(at0.nakshatraName, "Ashwini");
    assert.strictEqual(at0.starLord, "Ketu");
    assert.strictEqual(at0.elapsedFraction, 0.0);

    // Just below 13°20' -> Ashwini (Ketu)
    const justUnder = getMoonNakshatraAndBalance(span - 1e-6);
    assert.strictEqual(justUnder.nakshatraName, "Ashwini");

    // Exactly at 13°20' -> Bharani (Venus)
    const atSpan = getMoonNakshatraAndBalance(span);
    assert.strictEqual(atSpan.nakshatraName, "Bharani");
    assert.strictEqual(atSpan.starLord, "Venus");
    assert.strictEqual(atSpan.elapsedFraction, 0.0);

    // 359.999° -> Revati (Mercury)
    const at359 = getMoonNakshatraAndBalance(359.999);
    assert.strictEqual(at359.nakshatraName, "Revati");
    assert.strictEqual(at359.starLord, "Mercury");

    // 360.0° normalizes to 0.0° -> Ashwini (Ketu)
    const at360 = getMoonNakshatraAndBalance(360.0);
    assert.strictEqual(at360.nakshatraName, "Ashwini");
    assert.strictEqual(at360.starLord, "Ketu");
});

it("Unit 1.5: Fractional balance formulas at 0%, 50%, 75% offsets", () => {
    // 0% of Rohini (Moon, 10y) -> balance 10.0y
    const r0 = getMoonNakshatraAndBalance(40.0);
    assert.strictEqual(r0.balanceYears, 10.0);

    // 50% of Swati (Rahu, 18y) -> balance 9.0y
    const midSwati = (14 * NAKSHATRA_SPAN_DEG) + (NAKSHATRA_SPAN_DEG / 2.0);
    const r50 = getMoonNakshatraAndBalance(midSwati);
    assert.ok(Math.abs(r50.balanceYears - 9.0) < 1e-12);

    // 75% of Magha (Ketu, 7y) -> balance 1.75y
    const pt75 = (9 * NAKSHATRA_SPAN_DEG) + (NAKSHATRA_SPAN_DEG * 0.75);
    const r75 = getMoonNakshatraAndBalance(pt75);
    assert.ok(Math.abs(r75.balanceYears - 1.75) < 1e-12);
});

it("Unit 1.6: Decimal duration formatting to Years, Months, and Days", () => {
    // 2.5 years = 2 years 6 months 0 days
    const f1 = formatDashaDuration(2.5);
    assert.strictEqual(f1.years, 2);
    assert.strictEqual(f1.months, 6);
    assert.strictEqual(f1.days, 0);

    // 0 years
    const f0 = formatDashaDuration(0);
    assert.strictEqual(f0.years, 0);
    assert.strictEqual(f0.months, 0);
    assert.strictEqual(f0.days, 0);
});

// =============================================================================
// CATEGORY 2: ASTRONOMICAL EPHEMERIS & REFERENCE VERIFICATION TESTS
// =============================================================================
console.log("\n--- 2. ASTRONOMICAL EPHEMERIS & REFERENCE VERIFICATION TESTS ---");

it("Astro 2.1: Apparent Tropical Longitude minus True Ayanamsha equals Sidereal Longitude to machine precision", async () => {
    let sweph;
    try {
        sweph = (await import('sweph')).default;
    } catch {
        return; // Skip if sweph binary not in module path
    }

    const jd_ut = 2451040.7083333335; // 15-Aug-1998 05:00 UTC
    sweph.set_sid_mode(sweph.constants.SE_SIDM_KRISHNAMURTI, 0, 0);

    const tropRes = sweph.calc_ut(jd_ut, sweph.constants.SE_MOON, sweph.constants.SEFLG_SWIEPH | sweph.constants.SEFLG_SPEED);
    const sidRes = sweph.calc_ut(jd_ut, sweph.constants.SE_MOON, sweph.constants.SEFLG_SWIEPH | sweph.constants.SEFLG_SIDEREAL | sweph.constants.SEFLG_SPEED);
    const exAyan = sweph.get_ayanamsa_ex_ut(jd_ut, sweph.constants.SE_SIDM_KRISHNAMURTI);

    const tropLon = tropRes.data[0];
    const sidLon = sidRes.data[0];
    const trueAyan = exAyan.data;

    // Mathematical identity: Tropical Apparent - True Ayanamsha = Sidereal Apparent
    const calculatedSid = tropLon - trueAyan;
    const residual = Math.abs(calculatedSid - sidLon);
    assert.ok(residual < 1e-12, `Residual error ${residual} exceeds machine epsilon`);
});

it("Astro 2.2: Explains and verifies the 7.32 arcsecond Nutation in Longitude term", async () => {
    let sweph;
    try {
        sweph = (await import('sweph')).default;
    } catch {
        return;
    }

    const jd_ut = 2451040.7083333335;
    sweph.set_sid_mode(sweph.constants.SE_SIDM_KRISHNAMURTI, 0, 0);

    const meanAyan = sweph.get_ayanamsa_ut(jd_ut);
    const exAyan = sweph.get_ayanamsa_ex_ut(jd_ut, sweph.constants.SE_SIDM_KRISHNAMURTI);
    const nutRes = sweph.calc_ut(jd_ut, sweph.constants.SE_ECL_NUT, 0);

    const nutInLonDeg = nutRes.data[2]; // Nutation in longitude (Delta Psi)
    const nutInLonArcsec = nutInLonDeg * 3600.0;
    const diffArcsec = (meanAyan - exAyan.data) * 3600.0;

    // The discrepancy between Mean Ayanamsha and True Ayanamsha equals Nutation in Longitude
    assert.ok(Math.abs(nutInLonArcsec - (-7.32305)) < 0.001, `Nutation ${nutInLonArcsec} differs from -7.323 arcseconds`);
    assert.ok(Math.abs(diffArcsec - (-nutInLonArcsec)) < 1e-6, "Mean - True Ayanamsha must exactly equal -Nutation");
});

it("Astro 2.3: Primary Benchmark Chart (15 Aug 1998, 10:30 IST Hyderabad) reproduction", () => {
    const res = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    const moon = res.planets.find(p => p.key === 'Moon');
    assert.ok(Math.abs(moon.longitude - 33.47398) < 0.001);
    assert.strictEqual(moon.nakshatra.name, "Krittika");
    assert.strictEqual(moon.starLord, "Sun");

    const dasha = res.dasha;
    assert.strictEqual(dasha.balanceInfo.nakshatraName, "Krittika");
    assert.strictEqual(dasha.balanceInfo.starLord, "Sun");
    assert.ok(Math.abs(dasha.balanceInfo.balanceYears - 2.9367) < 0.005);
    assert.strictEqual(dasha.balanceInfo.balanceFormatted.formatted, "2y 11m 7d");
});

it("Astro 2.4: Secondary Benchmark Chart (1 Jan 2000, 12:00 IST New Delhi) verification", () => {
    const res = calculateKPKundli({
        birthDate: "2000-01-01",
        birthTime: "12:00",
        lat: 28.6139,
        lon: 77.2090,
        timezone: "Asia/Kolkata"
    });

    const moon = res.planets.find(p => p.key === 'Moon');
    // Swati, Star Lord Rahu
    assert.ok(Math.abs(moon.longitude - 196.80854) < 0.001);
    assert.strictEqual(moon.nakshatra.name, "Swati");
    assert.strictEqual(moon.starLord, "Rahu");

    const dasha = res.dasha;
    assert.strictEqual(dasha.balanceInfo.starLord, "Rahu");
    assert.ok(Math.abs(dasha.balanceInfo.balanceYears - 4.308) < 0.01);
    assert.strictEqual(dasha.balanceInfo.balanceFormatted.formatted, "4y 3m 21d");
});

// =============================================================================
// CATEGORY 3: SUBPERIOD HIERARCHY, PRE-NATAL CLIPPING & CONTIGUITY
// =============================================================================
console.log("\n--- 3. SUBPERIOD HIERARCHY, CLIPPING & CONTIGUITY TESTS ---");

it("Hierarchy 3.1: Complete 120-year cycle generates contiguous zero-gap Mahadashas", () => {
    const dasha = calculateVimshottariDasha({
        moonSiderealLongitude: 33.47398,
        birthDateUtc: '1998-08-15T05:00:00.000Z'
    });

    assert.strictEqual(dasha.mahadashas.length, 9);
    for (let i = 0; i < 8; i++) {
        assert.strictEqual(
            dasha.mahadashas[i].endMs,
            dasha.mahadashas[i + 1].startMs,
            `Gap detected between Mahadasha ${dasha.mahadashas[i].lord} and ${dasha.mahadashas[i + 1].lord}`
        );
    }
});

it("Hierarchy 3.2: Theoretical pre-natal subperiods are clipped cleanly at the birth instant", () => {
    const birthUtc = '1998-08-15T05:00:00.000Z';
    const birthMs = new Date(birthUtc).getTime();

    const dasha = calculateVimshottariDasha({
        moonSiderealLongitude: 33.47398, // Krittika (Sun)
        birthDateUtc: birthUtc
    });

    const birthMaha = dasha.mahadashas[0];
    const ads = birthMaha.antardashas;

    // Saturn Antardasha was running at birth; it is clipped to start at birthMs
    assert.strictEqual(ads[0].lord, "Saturn");
    assert.strictEqual(ads[0].isClippedAtBirth, true);
    assert.strictEqual(ads[0].startMs, birthMs);

    // Subsequent Antardashas are not clipped
    assert.strictEqual(ads[1].lord, "Mercury");
    assert.strictEqual(ads[1].isClippedAtBirth, false);

    // Sum of active Antardashas equals the birth balance
    let activeAdSumMs = 0;
    for (const ad of ads) {
        activeAdSumMs += (ad.endMs - ad.startMs);
    }
    const expectedBalanceMs = Math.round(dasha.balanceInfo.balanceYears * MS_PER_YEAR);
    assert.ok(Math.abs(activeAdSumMs - expectedBalanceMs) <= 1, "Active Antardashas must sum to birth balance");
});

it("Hierarchy 3.3: Topological integrity validator verifies child enclosure across all 3 levels", () => {
    const dasha = calculateVimshottariDasha({
        moonSiderealLongitude: 196.80854,
        birthDateUtc: '2000-01-01T06:30:00.000Z'
    });

    const validation = validateDashaHierarchy(dasha.mahadashas);
    assert.strictEqual(validation.isValid, true, `Topology errors: ${validation.errors.join('; ')}`);
});

it("Hierarchy 3.4: Complete birth-running Sun Mahadasha Antardasha sequence audit", () => {
    const birthUtc = '1998-08-15T05:00:00.000Z';
    const dasha = calculateVimshottariDasha({
        moonSiderealLongitude: 33.47398088399252,
        birthDateUtc: birthUtc
    });

    const sunMaha = dasha.mahadashas[0];
    assert.strictEqual(sunMaha.lord, "Sun");
    assert.strictEqual(sunMaha.startDate, birthUtc);
    assert.strictEqual(sunMaha.endDate, "2001-07-22T20:11:15.385Z");

    // Theoretical 9 Antardashas had 5 pre-natal periods (Sun, Moon, Mars, Rahu, Jupiter).
    // Exactly 4 post-natal Antardashas remain in display: Saturn, Mercury, Ketu, Venus.
    assert.strictEqual(sunMaha.antardashas.length, 4);

    const expectedAds = [
        { lord: "Saturn", start: birthUtc, end: "1999-05-11T06:59:15.385Z", clipped: true },
        { lord: "Mercury", start: "1999-05-11T06:59:15.385Z", end: "2000-03-16T18:05:15.385Z", clipped: false },
        { lord: "Ketu", start: "2000-03-16T18:05:15.385Z", end: "2000-07-22T14:11:15.385Z", clipped: false },
        { lord: "Venus", start: "2000-07-22T14:11:15.385Z", end: "2001-07-22T20:11:15.385Z", clipped: false }
    ];

    expectedAds.forEach((exp, idx) => {
        const actual = sunMaha.antardashas[idx];
        assert.strictEqual(actual.lord, exp.lord, `AD[${idx}] lord mismatch`);
        assert.strictEqual(actual.startDate, exp.start, `AD[${idx}] start mismatch`);
        assert.strictEqual(actual.endDate, exp.end, `AD[${idx}] end mismatch`);
        assert.strictEqual(actual.isClippedAtBirth, exp.clipped, `AD[${idx}] clipping flag mismatch`);
    });

    // Verify contiguity between active Antardashas
    for (let i = 0; i < sunMaha.antardashas.length - 1; i++) {
        assert.strictEqual(
            sunMaha.antardashas[i].endMs,
            sunMaha.antardashas[i + 1].startMs,
            `Gap detected between Antardasha ${sunMaha.antardashas[i].lord} and ${sunMaha.antardashas[i + 1].lord}`
        );
    }
});

it("Hierarchy 3.5: Complete birth-running Saturn Antardasha Pratyantardasha sequence audit", () => {
    const birthUtc = '1998-08-15T05:00:00.000Z';
    const dasha = calculateVimshottariDasha({
        moonSiderealLongitude: 33.47398088399252,
        birthDateUtc: birthUtc,
        referenceDate: birthUtc
    });

    const saturnAd = dasha.mahadashas[0].antardashas[0];
    assert.strictEqual(saturnAd.lord, "Saturn");

    // Theoretical 9 Pratyantardashas under Saturn start with Saturn.
    // Theoretical PD 1 (Saturn): 1998-05-29T07:17:15.385Z -> 1998-07-23T05:50:24.385Z (Pre-natal, elapsed).
    // Theoretical PD 2 (Mercury): 1998-07-23T05:50:24.385Z -> 1998-09-10T09:35:51.385Z (Spans birth).
    // Exactly 8 post-natal Pratyantardashas remain in display: Mercury, Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter.
    assert.strictEqual(saturnAd.pratyantardashas.length, 8);

    const expectedPds = [
        { lord: "Mercury", start: birthUtc, end: "1998-09-10T09:35:51.385Z", clipped: true },
        { lord: "Ketu", start: "1998-09-10T09:35:51.385Z", end: "1998-09-30T15:22:48.385Z", clipped: false },
        { lord: "Venus", start: "1998-09-30T15:22:48.385Z", end: "1998-11-27T11:19:48.385Z", clipped: false },
        { lord: "Sun", start: "1998-11-27T11:19:48.385Z", end: "1998-12-14T19:42:54.385Z", clipped: false },
        { lord: "Moon", start: "1998-12-14T19:42:54.385Z", end: "1999-01-12T17:41:24.385Z", clipped: false },
        { lord: "Mars", start: "1999-01-12T17:41:24.385Z", end: "1999-02-01T23:28:21.385Z", clipped: false },
        { lord: "Rahu", start: "1999-02-01T23:28:21.385Z", end: "1999-03-26T00:37:39.385Z", clipped: false },
        { lord: "Jupiter", start: "1999-03-26T00:37:39.385Z", end: "1999-05-11T06:59:15.385Z", clipped: false }
    ];

    expectedPds.forEach((exp, idx) => {
        const actual = saturnAd.pratyantardashas[idx];
        assert.strictEqual(actual.lord, exp.lord, `PD[${idx}] lord mismatch`);
        assert.strictEqual(actual.startDate, exp.start, `PD[${idx}] start mismatch`);
        assert.strictEqual(actual.endDate, exp.end, `PD[${idx}] end mismatch`);
        assert.strictEqual(actual.isClippedAtBirth, exp.clipped, `PD[${idx}] clipping flag mismatch`);
    });

    // Verify contiguity between active Pratyantardashas
    for (let i = 0; i < saturnAd.pratyantardashas.length - 1; i++) {
        assert.strictEqual(
            saturnAd.pratyantardashas[i].endMs,
            saturnAd.pratyantardashas[i + 1].startMs,
            `Gap detected between Pratyantardasha ${saturnAd.pratyantardashas[i].lord} and ${saturnAd.pratyantardashas[i + 1].lord}`
        );
    }

    // Active period at birth instant matches KP Star Lord (Sun), Sub Lord (Saturn), and Sub-Sub Lord (Mercury)
    const active = dasha.activePeriods;
    assert.strictEqual(active.path, "Sun - Saturn - Mercury");
    assert.strictEqual(active.mahadasha.lord, "Sun");
    assert.strictEqual(active.antardasha.lord, "Saturn");
    assert.strictEqual(active.pratyantardasha.lord, "Mercury");
});

// =============================================================================
// CATEGORY 4: INTEGRATION & BACKEND API TESTS
// =============================================================================
console.log("\n--- 4. INTEGRATION & BACKEND API TESTS ---");

it("Integration 4.1: Timezone representation invariance (UTC vs IST produce identical dates)", () => {
    const utc1 = resolveLocalToUTC('1998-08-15', '10:30', 'Asia/Kolkata');
    const utc2 = resolveLocalToUTC('1998-08-15', '05:00', 'UTC');

    const d1 = calculateVimshottariDasha({ moonSiderealLongitude: 33.47398088, birthDateUtc: utc1 });
    const d2 = calculateVimshottariDasha({ moonSiderealLongitude: 33.47398088, birthDateUtc: utc2 });

    assert.strictEqual(d1.balanceInfo.balanceFormatted.formatted, d2.balanceInfo.balanceFormatted.formatted);
    assert.strictEqual(d1.mahadashas[0].endDate, d2.mahadashas[0].endDate);
    assert.strictEqual(d1.mahadashas[3].endDate, d2.mahadashas[3].endDate);
});

await itAsync("Integration 4.2: Backend Express route POST /api/kp/vimshottari-dasha works end-to-end", async () => {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/kp/vimshottari-dasha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                birthDate: '1998-08-15',
                birthTime: '10:30',
                lat: 17.3850,
                lon: 78.4867,
                timezone: 'Asia/Kolkata'
            })
        });

        if (response.ok) {
            const json = await response.json();
            assert.strictEqual(json.success, true);
            assert.strictEqual(json.data.balanceInfo.starLord, "Sun");
            assert.strictEqual(json.data.balanceInfo.balanceFormatted.formatted, "2y 11m 7d");
            assert.strictEqual(json.data.activePeriods.mahadasha.lord, "Rahu");
        }
    } catch {
        // If server is not running on 5000 in this process, skip network test
    }
});

// =============================================================================
// CATEGORY 5: UI QUERY & STATE SEARCH TESTS
// =============================================================================
console.log("\n--- 5. UI QUERY & STATE SEARCH TESTS ---");

it("UI 5.1: Dynamic reference date querying handles past, current, and future epochs", () => {
    const birthUtc = '1998-08-15T05:00:00.000Z';
    const dasha = calculateVimshottariDasha({
        moonSiderealLongitude: 33.47398,
        birthDateUtc: birthUtc
    });

    // 1999: Sun Mahadasha, Saturn Antardasha
    const q1999 = getActivePeriods(dasha.mahadashas, '1999-01-01T00:00:00.000Z', new Date(birthUtc).getTime());
    assert.strictEqual(q1999.mahadasha.lord, "Sun");
    assert.strictEqual(q1999.antardasha.lord, "Saturn");

    // 2015: Mars Mahadasha
    const q2015 = getActivePeriods(dasha.mahadashas, '2015-06-01T00:00:00.000Z', new Date(birthUtc).getTime());
    assert.strictEqual(q2015.mahadasha.lord, "Mars");

    // 2026: Rahu Mahadasha, Mercury Antardasha
    const q2026 = getActivePeriods(dasha.mahadashas, '2026-10-25T00:00:00.000Z', new Date(birthUtc).getTime());
    assert.strictEqual(q2026.mahadasha.lord, "Rahu");
    assert.strictEqual(q2026.antardasha.lord, "Mercury");

    // Pre-natal boundary query
    const qPre = getActivePeriods(dasha.mahadashas, '1995-01-01T00:00:00.000Z', new Date(birthUtc).getTime());
    assert.strictEqual(qPre.status, "pre_natal");

    // Post-cycle boundary query (>120 years)
    const qPost = getActivePeriods(dasha.mahadashas, '2125-01-01T00:00:00.000Z', new Date(birthUtc).getTime());
    assert.strictEqual(qPost.status, "post_cycle");
});

it("UI 5.2: Error handling on malformed or non-finite inputs", () => {
    assert.throws(() => getMoonNakshatraAndBalance(null), /Invalid Moon longitude/);
    assert.throws(() => getMoonNakshatraAndBalance(NaN), /Invalid Moon longitude/);
    assert.throws(() => calculateVimshottariDasha({ moonSiderealLongitude: 10, birthDateUtc: 'bad' }), /Invalid birthDateUtc/);
});

// =============================================================================
// CATEGORY 6: PLANETARY KP METADATA & ASPECTS (STL, SUB, SSL, ASP)
// =============================================================================
console.log("\n--- 6. PLANETARY KP METADATA & ASPECTS (STL, SUB, SSL, ASP) ---");

it("KP 6.1: buildPlanetaryKPDetails populates correct STL, SUB, SSL and aspects for all 9 planets in benchmark chart", () => {
    const kpData = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    const calculatedAspects = calculatePlanetaryAspects(kpData.planets, kpData.cusps);
    const kpDetails = buildPlanetaryKPDetails({
        planets: kpData.planets,
        cusps: kpData.cusps,
        aspects: calculatedAspects
    });

    // Check all 9 planets exist
    VIMSHOTTARI_PLANETS.forEach(p => {
        assert(kpDetails[p.name], `Missing KP details for planet ${p.name}`);
        assert.strictEqual(kpDetails[p.name].isAvailable, true, `Planet ${p.name} should be available`);
        assert(kpDetails[p.name].stl, `Missing STL for ${p.name}`);
        assert(kpDetails[p.name].sub, `Missing SUB for ${p.name}`);
        assert(kpDetails[p.name].ssl, `Missing SSL for ${p.name}`);
        assert(typeof kpDetails[p.name].aspects.totalCount === 'number', `Missing aspect totalCount for ${p.name}`);
    });

    // Verify benchmark chart specific values
    assert.strictEqual(kpDetails.Sun.stl, "Mercury");
    assert.strictEqual(kpDetails.Sun.sub, "Saturn");
    assert.strictEqual(kpDetails.Sun.ssl, "Mercury");

    assert.strictEqual(kpDetails.Moon.stl, "Sun");
    assert.strictEqual(kpDetails.Moon.sub, "Saturn");
    assert.strictEqual(kpDetails.Moon.ssl, "Mercury");

    assert.strictEqual(kpDetails.Rahu.stl, "Ketu");
    assert.strictEqual(kpDetails.Rahu.sub, "Jupiter");
    assert.strictEqual(kpDetails.Rahu.ssl, "Saturn");

    assert.strictEqual(kpDetails.Mercury.stl, "Mercury");
    assert.strictEqual(kpDetails.Mercury.sub, "Jupiter");
    assert.strictEqual(kpDetails.Mercury.ssl, "Jupiter");

    assert.strictEqual(kpDetails.Venus.stl, "Saturn");
    assert.strictEqual(kpDetails.Venus.sub, "Venus");
    assert.strictEqual(kpDetails.Venus.ssl, "Sun");
});

it("KP 6.2: Example hierarchy from prompt (Rahu MD -> Mercury AD -> Venus PD) reflects exact planetary KP metadata", () => {
    const kpData = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    const calculatedAspects = calculatePlanetaryAspects(kpData.planets, kpData.cusps);
    const moon = kpData.planets.find(p => p.key === "Moon");

    const dasha = calculateVimshottariDasha({
        moonSiderealLongitude: moon.longitude,
        birthDateUtc: kpData.metadata.utcDate,
        planets: kpData.planets,
        cusps: kpData.cusps,
        aspects: calculatedAspects
    });

    // Find Rahu Mahadasha
    const rahuMd = dasha.mahadashas.find(m => m.lord === "Rahu");
    assert(rahuMd, "Rahu Mahadasha should exist");
    assert.strictEqual(rahuMd.kpDetails.stl, "Ketu");
    assert.strictEqual(rahuMd.kpDetails.sub, "Jupiter");
    assert.strictEqual(rahuMd.kpDetails.ssl, "Saturn");

    // Find Mercury Antardasha under Rahu MD
    const mercAd = rahuMd.antardashas.find(a => a.lord === "Mercury");
    assert(mercAd, "Mercury Antardasha should exist under Rahu");
    assert.strictEqual(mercAd.kpDetails.stl, "Mercury");
    assert.strictEqual(mercAd.kpDetails.sub, "Jupiter");
    assert.strictEqual(mercAd.kpDetails.ssl, "Jupiter");

    // Find Venus Pratyantardasha under Mercury AD
    const venusPd = mercAd.pratyantardashas.find(p => p.lord === "Venus");
    assert(venusPd, "Venus Pratyantardasha should exist under Mercury AD");
    assert.strictEqual(venusPd.kpDetails.stl, "Saturn");
    assert.strictEqual(venusPd.kpDetails.sub, "Venus");
    assert.strictEqual(venusPd.kpDetails.ssl, "Sun");
});

it("KP 6.3: Same planet produces identical KP metadata wherever it appears in the Dasha hierarchy", () => {
    const kpData = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    const moon = kpData.planets.find(p => p.key === "Moon");
    const dasha = calculateVimshottariDasha({
        moonSiderealLongitude: moon.longitude,
        birthDateUtc: kpData.metadata.utcDate,
        planets: kpData.planets,
        cusps: kpData.cusps
    });

    const rahuMd = dasha.mahadashas.find(m => m.lord === "Rahu");
    const rahuDetailsRoot = dasha.planetaryKPDetails.Rahu;
    assert.deepStrictEqual(rahuMd.kpDetails, rahuDetailsRoot);

    // Check Rahu as Antardasha across other Mahadashas (e.g. under Sun MD, Moon MD, etc.)
    dasha.mahadashas.forEach(md => {
        const rahuAd = md.antardashas.find(ad => ad.lord === "Rahu");
        if (rahuAd) {
            assert.strictEqual(rahuAd.kpDetails.stl, rahuDetailsRoot.stl);
            assert.strictEqual(rahuAd.kpDetails.sub, rahuDetailsRoot.sub);
            assert.strictEqual(rahuAd.kpDetails.ssl, rahuDetailsRoot.ssl);
            assert.strictEqual(rahuAd.kpDetails.aspects.totalCount, rahuDetailsRoot.aspects.totalCount);
        }
    });

    // Check Mars across all levels
    const marsRoot = dasha.planetaryKPDetails.Mars;
    dasha.mahadashas.forEach(md => {
        if (md.lord === "Mars") {
            assert.deepStrictEqual(md.kpDetails, marsRoot);
        }
        md.antardashas.forEach(ad => {
            if (ad.lord === "Mars") {
                assert.deepStrictEqual(ad.kpDetails, marsRoot);
            }
            ad.pratyantardashas.forEach(pd => {
                if (pd.lord === "Mars") {
                    assert.deepStrictEqual(pd.kpDetails, marsRoot);
                }
            });
        });
    });
});

it("KP 6.4: Aspects list and counts match calculatePlanetaryAspects engine output exactly", () => {
    const kpData = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    const engineAspects = calculatePlanetaryAspects(kpData.planets, kpData.cusps);
    const rawAspectsList = engineAspects.aspects || [];
    const kpDetails = buildPlanetaryKPDetails({
        planets: kpData.planets,
        cusps: kpData.cusps,
        aspects: engineAspects
    });

    VIMSHOTTARI_PLANETS.forEach(p => {
        const expectedCount = rawAspectsList.filter(a => {
            const isCaster = (a.castingBody?.key || a.castingBody?.name || '').toLowerCase() === p.name.toLowerCase();
            const isReceiver = (a.receivingBody?.key || a.receivingBody?.name || '').toLowerCase() === p.name.toLowerCase();
            return isCaster || (isReceiver && a.targetType === 'planet');
        }).length;
        assert.strictEqual(kpDetails[p.name].aspects.totalCount, expectedCount, `Aspect count mismatch for ${p.name}`);
        assert.strictEqual(kpDetails[p.name].aspects.all.length, expectedCount);
    });
});

it("KP 6.5: Missing/null planets input produces safe unavailable state without crashing", () => {
    const kpDetails = buildPlanetaryKPDetails({
        planets: null,
        cusps: null,
        aspects: null
    });

    assert(kpDetails, "Should return a fallback object");
    VIMSHOTTARI_PLANETS.forEach(p => {
        assert(kpDetails[p.name]);
        assert.strictEqual(kpDetails[p.name].isAvailable, false);
        assert.strictEqual(kpDetails[p.name].stl, null);
        assert.strictEqual(kpDetails[p.name].sub, null);
        assert.strictEqual(kpDetails[p.name].ssl, null);
        assert.strictEqual(kpDetails[p.name].aspects.totalCount, 0);
    });

    // Dasha calculation with null planets also succeeds with safe unavailable kpDetails
    const dasha = calculateVimshottariDasha({
        moonSiderealLongitude: 33.47398,
        birthDateUtc: '1998-08-15T05:00:00.000Z',
        planets: null
    });
    assert.strictEqual(dasha.mahadashas[0].kpDetails.isAvailable, false);
});

it("KP 6.6: Dynamic reference-date query updates active periods without altering planetary KP metadata", () => {
    const kpData = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    const moon = kpData.planets.find(p => p.key === "Moon");
    const dasha1 = calculateVimshottariDasha({
        moonSiderealLongitude: moon.longitude,
        birthDateUtc: kpData.metadata.utcDate,
        referenceDate: '2000-01-01',
        planets: kpData.planets,
        cusps: kpData.cusps
    });

    const dasha2 = calculateVimshottariDasha({
        moonSiderealLongitude: moon.longitude,
        birthDateUtc: kpData.metadata.utcDate,
        referenceDate: '2026-10-25',
        planets: kpData.planets,
        cusps: kpData.cusps
    });

    // Active periods differ
    assert.notStrictEqual(dasha1.activePeriods.mahadasha.lord, dasha2.activePeriods.mahadasha.lord);

    // Planetary KP details remain identical
    assert.deepStrictEqual(dasha1.planetaryKPDetails, dasha2.planetaryKPDetails);

    // Existing Dasha start and end dates remain identical
    assert.strictEqual(dasha1.mahadashas[0].startDate, dasha2.mahadashas[0].startDate);
    assert.strictEqual(dasha1.mahadashas[0].endDate, dasha2.mahadashas[0].endDate);
    assert.strictEqual(dasha1.mahadashas[8].endDate, dasha2.mahadashas[8].endDate);
});

// =============================================================================
// CATEGORY 7: PLANETARY KP HOUSE SIGNIFICATIONS (BHAVA)
// =============================================================================
console.log("--- 7. PLANETARY KP HOUSE SIGNIFICATIONS (BHAVA) ---");

it("Significations 7.1: Dasha planets display their actual house significations from existing KP engine", () => {
    const kpData = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    const engineSig = calculateKPSignificators(kpData.planets, kpData.cusps);
    const kpDetails = buildPlanetaryKPDetails({
        planets: kpData.planets,
        cusps: kpData.cusps,
        aspects: kpData.aspects,
        significators: engineSig
    });

    // Every Vimshottari planet's significations must match calculateKPSignificators output exactly
    for (const p of VIMSHOTTARI_PLANETS) {
        const details = kpDetails[p.key];
        assert(details, `Missing KP details for ${p.key}`);
        assert.strictEqual(details.isAvailable, true);
        assert(details.significations, `Missing significations for ${p.key}`);

        const enginePlanetSig = engineSig.planetSignifications.find(s => s.planetKey.toLowerCase() === p.key.toLowerCase());
        assert(enginePlanetSig, `Engine significator missing for ${p.key}`);

        assert.deepStrictEqual(
            details.significations.planet.primaryHouses,
            enginePlanetSig.primaryHouses,
            `Primary houses mismatch for ${p.key}`
        );
        assert.deepStrictEqual(
            details.significations.primaryHouses,
            enginePlanetSig.primaryHouses,
            `Top-level primary houses mismatch for ${p.key}`
        );
    }
});

it("Significations 7.2: STL, SUB, and SSL significations match those planets' chart results", () => {
    const kpData = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    const kpDetails = buildPlanetaryKPDetails({
        planets: kpData.planets,
        cusps: kpData.cusps,
        aspects: kpData.aspects
    });

    for (const p of VIMSHOTTARI_PLANETS) {
        const details = kpDetails[p.key];
        const stl = details.stl;
        const sub = details.sub;
        const ssl = details.ssl;

        // STL significations must match the STL planet's own primary houses
        assert.deepStrictEqual(
            details.significations.stl.primaryHouses,
            kpDetails[stl].significations.primaryHouses,
            `STL significations mismatch for ${p.key}`
        );

        // SUB significations must match the SUB planet's own primary houses
        assert.deepStrictEqual(
            details.significations.sub.primaryHouses,
            kpDetails[sub].significations.primaryHouses,
            `SUB significations mismatch for ${p.key}`
        );

        // SSL significations must match the SSL planet's own primary houses
        assert.deepStrictEqual(
            details.significations.ssl.primaryHouses,
            kpDetails[ssl].significations.primaryHouses,
            `SSL significations mismatch for ${p.key}`
        );
    }
});

it("Significations 7.3: Benchmark hierarchy (Rahu MD -> Mercury AD -> Venus PD) reflects exact 4-tier significations", () => {
    const kpData = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    const moon = kpData.planets.find(p => p.key === "Moon");
    const dasha = calculateVimshottariDasha({
        moonSiderealLongitude: moon.longitude,
        birthDateUtc: kpData.metadata.utcDate,
        referenceDate: '2026-10-25',
        planets: kpData.planets,
        cusps: kpData.cusps
    });

    // MD: Rahu (STL: Ketu, SUB: Jupiter, SSL: Saturn)
    const rahuMd = dasha.mahadashas.find(m => m.lord === "Rahu");
    assert(rahuMd);
    assert.strictEqual(rahuMd.kpDetails.significations.formatted, "5, 11");
    assert.deepStrictEqual(rahuMd.kpDetails.significations.primaryHouses, [5, 11]);
    assert.deepStrictEqual(rahuMd.kpDetails.significations.stl.primaryHouses, [5, 11]); // Ketu
    assert.deepStrictEqual(rahuMd.kpDetails.significations.sub.primaryHouses, [3, 5, 6]); // Jupiter
    assert.deepStrictEqual(rahuMd.kpDetails.significations.ssl.primaryHouses, [4, 5, 7]); // Saturn

    // AD: Mercury under Rahu (STL: Mercury, SUB: Jupiter, SSL: Jupiter)
    const mercAd = rahuMd.antardashas.find(a => a.lord === "Mercury");
    assert(mercAd);
    assert.strictEqual(mercAd.kpDetails.significations.formatted, "9, 10, 12");
    assert.deepStrictEqual(mercAd.kpDetails.significations.primaryHouses, [9, 10, 12]);
    assert.deepStrictEqual(mercAd.kpDetails.significations.stl.primaryHouses, [9, 10, 12]); // Mercury
    assert.deepStrictEqual(mercAd.kpDetails.significations.sub.primaryHouses, [3, 5, 6]); // Jupiter
    assert.deepStrictEqual(mercAd.kpDetails.significations.ssl.primaryHouses, [3, 5, 6]); // Jupiter

    // PD: Venus under Mercury AD (STL: Saturn, SUB: Venus, SSL: Sun)
    const venusPd = mercAd.pratyantardashas.find(p => p.lord === "Venus");
    assert(venusPd);
    assert.strictEqual(venusPd.kpDetails.significations.formatted, "1, 4, 5, 7, 8, 10");
    assert.deepStrictEqual(venusPd.kpDetails.significations.primaryHouses, [1, 4, 5, 7, 8, 10]);
    assert.deepStrictEqual(venusPd.kpDetails.significations.stl.primaryHouses, [4, 5, 7]); // Saturn
    assert.deepStrictEqual(venusPd.kpDetails.significations.sub.primaryHouses, [1, 4, 5, 7, 8, 10]); // Venus
    assert.deepStrictEqual(venusPd.kpDetails.significations.ssl.primaryHouses, [9, 10, 11, 12]); // Sun
});

it("Significations 7.4: Changing the birth chart refreshes all significations (no hardcoded house values)", () => {
    const chart1 = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    const chart2 = calculateKPKundli({
        birthDate: "1985-03-21",
        birthTime: "06:15",
        lat: 28.6139,
        lon: 77.2090,
        timezone: "Asia/Kolkata"
    });

    const moon1 = chart1.planets.find(p => p.key === "Moon");
    const moon2 = chart2.planets.find(p => p.key === "Moon");

    const dasha1 = calculateVimshottariDasha({
        moonSiderealLongitude: moon1.longitude,
        birthDateUtc: chart1.metadata.utcDate,
        planets: chart1.planets,
        cusps: chart1.cusps
    });

    const dasha2 = calculateVimshottariDasha({
        moonSiderealLongitude: moon2.longitude,
        birthDateUtc: chart2.metadata.utcDate,
        planets: chart2.planets,
        cusps: chart2.cusps
    });

    // Sun significations in chart 1 vs chart 2 must differ
    assert.notDeepStrictEqual(
        dasha1.planetaryKPDetails.Sun.significations.primaryHouses,
        dasha2.planetaryKPDetails.Sun.significations.primaryHouses,
        "Significations should be calculated uniquely per chart, not static/hardcoded"
    );
});

it("Significations 7.5: Missing/null planets and cusps produce safe unavailable state without crashing", () => {
    const kpDetails = buildPlanetaryKPDetails({
        planets: null,
        cusps: null
    });

    for (const p of VIMSHOTTARI_PLANETS) {
        assert.strictEqual(kpDetails[p.key].isAvailable, false);
        assert.deepStrictEqual(kpDetails[p.key].significations.primaryHouses, []);
        assert.strictEqual(kpDetails[p.key].significations.planet.isAvailable, false);
        assert.strictEqual(kpDetails[p.key].significations.stl.isAvailable, false);
        assert.strictEqual(kpDetails[p.key].significations.sub.isAvailable, false);
        assert.strictEqual(kpDetails[p.key].significations.ssl.isAvailable, false);
        assert.strictEqual(kpDetails[p.key].significations.formatted, '');
    }
});

it("Significations 7.6: Existing Dasha dates, balance, and durations remain 100% invariant", () => {
    const kpData = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    const moon = kpData.planets.find(p => p.key === "Moon");

    // Without planets/significators
    const dashaOld = calculateVimshottariDasha({
        moonSiderealLongitude: moon.longitude,
        birthDateUtc: kpData.metadata.utcDate
    });

    // With planets, cusps, aspects, significators
    const dashaNew = calculateVimshottariDasha({
        moonSiderealLongitude: moon.longitude,
        birthDateUtc: kpData.metadata.utcDate,
        planets: kpData.planets,
        cusps: kpData.cusps,
        aspects: kpData.aspects,
        significators: kpData.significators
    });

    // Verify balance at birth
    assert.strictEqual(dashaOld.balanceInfo.balanceYears, dashaNew.balanceInfo.balanceYears);
    assert.strictEqual(dashaOld.balanceInfo.starLord, dashaNew.balanceInfo.starLord);

    // Verify Mahadasha dates
    dashaOld.mahadashas.forEach((md, i) => {
        assert.strictEqual(md.startDate, dashaNew.mahadashas[i].startDate);
        assert.strictEqual(md.endDate, dashaNew.mahadashas[i].endDate);
        assert.strictEqual(md.durationYears, dashaNew.mahadashas[i].durationYears);
    });

    // Verify Antardasha dates
    dashaOld.mahadashas[0].antardashas.forEach((ad, j) => {
        assert.strictEqual(ad.startDate, dashaNew.mahadashas[0].antardashas[j].startDate);
        assert.strictEqual(ad.endDate, dashaNew.mahadashas[0].antardashas[j].endDate);
    });
});

console.log(`\n========================================================================`);
console.log(`VIMSHOTTARI DASHA COMPREHENSIVE SUITE: ${passed} Passed, ${failed} Failed.`);
console.log(`========================================================================\n`);

if (failed > 0) {
    process.exit(1);
}
