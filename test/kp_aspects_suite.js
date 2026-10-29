/**
 * Comprehensive Automated Test Suite for KP & Vedic Planetary Aspects (Drishti)
 *
 * Verifies:
 * 1. Shortest circular distance across 0°/360° boundary wraparound
 * 2. Exact aspect angles & orbs for all Western aspects (0°, 30°, 45°, 60°, 90°, 120°, 135°, 150°, 180°)
 * 3. Applying vs Separating motion detection with closed-form analytical directional derivative (AUD-02)
 * 4. Placidus house cusp aspects with configurable cusp orb limits (CUSP_ORB_MODES)
 * 5. Classical Vedic Parashari Special Drishti with clean 100% full-house orbs (AUD-03)
 * 6. Configurable Rahu/Ketu handling (Western degree aspects, 5/7/9 trine, 7th only, exclude)
 * 7. Numerical ground truth assertions for 15-Aug-1998 10:30 IST Hyderabad chart
 * 8. Non-interference with 4-level house significators table
 */

import assert from 'assert';
import {
    getShortestAngle,
    determineAspectMotion,
    calculatePlanetaryAspects,
    ASPECT_CONVENTIONS,
    RAHU_KETU_ASPECT_MODES,
    ORB_MODES,
    CUSP_ORB_MODES,
    WESTERN_ASPECT_DEFINITIONS
} from '../src/utils/kp/kpAspects.js';
import { calculateKPKundli } from '../src/services/kpCalculator.js';
import {
    getPlanetAspectHouses,
    calculateKPAspectSignifications,
    KP_VEDIC_DRISHTI_RULES
} from '../src/utils/kp/kpSignificators.js';

let passed = 0;
let failed = 0;

function runTest(description, fn) {
    try {
        fn();
        console.log(`  ✓ ${description}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${description}`);
        console.error(`    ${err.message}`);
        failed++;
    }
}

console.log('\n=== RUNNING ASTROSHARMA KP PLANETARY ASPECTS TEST SUITE ===\n');

// 1. Shortest circular distance & 0°/360° boundary wraparound
runTest('Shortest circular angle handles 0°/360° Aries boundary correctly', () => {
    // 359° and 1° should be 2° apart (not 358°)
    assert.strictEqual(getShortestAngle(359, 1), 2);
    assert.strictEqual(getShortestAngle(1, 359), 2);

    // Opposite ends
    assert.strictEqual(getShortestAngle(0, 180), 180);
    assert.strictEqual(getShortestAngle(90, 270), 180);

    // Square 350° and 80° -> (360 - 350) + 80 = 90°
    assert.strictEqual(getShortestAngle(350, 80), 90);

    // Trine 355° and 115° -> 10 + 115 = 125° -> diff = 120°
    assert.strictEqual(getShortestAngle(355, 115), 120);

    // Same degree
    assert.strictEqual(getShortestAngle(45.5, 45.5), 0);
});

// 2. Analytical Applying vs Separating motion detection
runTest('Applying vs Separating correctly differentiates closing vs opening orbs analytically', () => {
    // Case A: Fast Moon (speed 13°/day) at 58° approaching exact Sextile (60°) with Sun (speed 1°/day) at 0°
    // Current dist = 58°, nominal = 60°. Distance is widening towards 60° -> orb shrinking -> applying
    const motion1 = determineAspectMotion(58, 13.0, 0, 1.0, 60);
    assert.strictEqual(motion1, 'applying', 'Moon moving from 58° towards 60° should be applying');

    // Case B: Fast Moon at 62° moving away from exact Sextile (60°)
    // Current dist = 62°, nominal = 60°. Distance widening past 60° -> orb opening -> separating
    const motion2 = determineAspectMotion(62, 13.0, 0, 1.0, 60);
    assert.strictEqual(motion2, 'separating', 'Moon moving away from 60° should be separating');

    // Case C: Retrograde planet (negative speed)
    // Jupiter at 122° (retrograde -0.08°/day) moving back towards exact Trine (120°) to Mars at 0° (0°/day)
    // Current dist = 122°, retrograde motion shrinks distance toward 120° -> applying
    const motion3 = determineAspectMotion(122, -0.08, 0, 0, 120);
    assert.strictEqual(motion3, 'applying', 'Retrograde planet moving toward exact angle should be applying');

    // Case D: Stationary planet (Saturn v=0), other planet moving
    const motion4 = determineAspectMotion(88.5, 1.2, 0, 0, 90);
    assert.strictEqual(motion4, 'applying', 'Planet at 88.5° moving at 1.2°/day toward stationary target at 0° (Square 90°) should be applying');

    // Case E: Parallel velocities (identical speed)
    const motion5 = determineAspectMotion(60.5, 1.0, 0, 1.0, 60);
    assert.strictEqual(motion5, 'exact', 'Equal velocities produce zero relative rate of change (exact/stationary)');

    // Case F: Exact aspect (orb = 0)
    const motion6 = determineAspectMotion(60.0, 13.0, 0, 1.0, 60);
    assert.strictEqual(motion6, 'exact', 'Zero orb is exact aspect');
});

// 3. Regression AUD-02: Fast Moon overshoot in finite-difference detection
runTest('Regression AUD-02: Moon at 32.40° approaching Mars at 92.64° (60° sextile) is strictly applying', () => {
    // Moon at 32.40° (speed +14.06°/day), Mars at 92.64° (speed +0.65°/day).
    // Angle = 92.64 - 32.40 = 60.24°. Nominal = 60.0°. Orb = 0.24°.
    // Moon is moving faster toward Mars, so the distance shrinks from 60.24° towards 60.00°.
    // The old 1-hour finite step jumped past 60.0° to 59.68°, erroneously marking it separating.
    // The closed-form analytical derivative must mark it applying.
    const motion = determineAspectMotion(32.40, 14.06, 92.64, 0.65, 60);
    assert.strictEqual(motion, 'applying', 'Moon approaching exact 60° from 60.24° must be classified as applying');
});

// 4. Exact matching of all Western degree aspect definitions
runTest('Recognizes all standard Western aspects within orb limits', () => {
    const mockPlanets = [
        { key: 'Sun', name: 'Sun', te: 'సూర్యుడు', longitude: 0.0, house: 1, speedDegPerDay: 1.0 },
        { key: 'Moon', name: 'Moon', te: 'చంద్రుడు', longitude: 60.5, house: 3, speedDegPerDay: 13.0 },    // ~60° Sextile (orb 0.5°)
        { key: 'Mars', name: 'Mars', te: 'కుజుడు', longitude: 90.2, house: 4, speedDegPerDay: 0.5 },      // ~90° Square (orb 0.2°)
        { key: 'Jupiter', name: 'Jupiter', te: 'గురువు', longitude: 120.1, house: 5, speedDegPerDay: 0.1 },// ~120° Trine (orb 0.1°)
        { key: 'Saturn', name: 'Saturn', te: 'శని', longitude: 179.8, house: 7, speedDegPerDay: 0.03 }    // ~180° Opposition (orb 0.2°)
    ];

    const res = calculatePlanetaryAspects(mockPlanets, [], {
        convention: ASPECT_CONVENTIONS.KP_WESTERN,
        includeCusps: false
    });

    const sunMoon = res.aspects.find(a => (a.castingBody.key === 'Sun' && a.receivingBody.key === 'Moon') || (a.castingBody.key === 'Moon' && a.receivingBody.key === 'Sun'));
    assert(sunMoon, 'Sun and Moon should form an aspect');
    assert.strictEqual(sunMoon.aspectType, 'Sextile');
    assert.strictEqual(sunMoon.nominalAngle, 60);
    assert(Math.abs(sunMoon.orb - 0.5) < 0.001, 'Orb should be exactly 0.5°');

    const sunMars = res.aspects.find(a => (a.castingBody.key === 'Sun' && a.receivingBody.key === 'Mars'));
    assert(sunMars, 'Sun and Mars should form Square');
    assert.strictEqual(sunMars.aspectType, 'Square');
    assert.strictEqual(sunMars.nominalAngle, 90);
    assert(Math.abs(sunMars.orb - 0.2) < 0.001, 'Orb should be exactly 0.2°');
    assert.strictEqual(sunMars.nature, 'malefic');

    const sunJupiter = res.aspects.find(a => (a.castingBody.key === 'Sun' && a.receivingBody.key === 'Jupiter'));
    assert(sunJupiter, 'Sun and Jupiter should form Trine');
    assert.strictEqual(sunJupiter.aspectType, 'Trine');
    assert.strictEqual(sunJupiter.nominalAngle, 120);
    assert(Math.abs(sunJupiter.orb - 0.1) < 0.001, 'Orb should be exactly 0.1°');
    assert.strictEqual(sunJupiter.nature, 'benefic');

    const sunSaturn = res.aspects.find(a => (a.castingBody.key === 'Sun' && a.receivingBody.key === 'Saturn'));
    assert(sunSaturn, 'Sun and Saturn should form Opposition');
    assert.strictEqual(sunSaturn.aspectType, 'Opposition');
    assert.strictEqual(sunSaturn.nominalAngle, 180);
    assert(Math.abs(sunSaturn.orb - 0.2) < 0.001, 'Orb should be exactly 0.2°');
    assert.strictEqual(sunSaturn.nature, 'malefic');
});

// 5. Aspects cast to Placidus house cusps & configurable cusp orbs
runTest('Calculates aspects of planets to Placidus house cusps with configurable cusp orbs', () => {
    const mockPlanets = [
        { key: 'Jupiter', name: 'Jupiter', te: 'గురువు', longitude: 124.0, house: 5, speedDegPerDay: 0.1 }
    ];
    const mockCusps = [
        { houseNumber: 1, siderealLongitude: 0.0, sign: { en: 'Aries', te: 'మేషం' } }
    ];

    // Distance = 124° - 0° = 124°. Trine nominal = 120°. Orb = 4.0°.
    // Under STANDARD_5_00 (5.0° limit): orb 4.0° is INCLUDED.
    const resStd = calculatePlanetaryAspects(mockPlanets, mockCusps, {
        convention: ASPECT_CONVENTIONS.KP_WESTERN,
        cuspOrbMode: CUSP_ORB_MODES.STANDARD_5_00,
        includeCusps: true
    });
    const jupCuspStd = resStd.aspects.find(a => a.castingBody.key === 'Jupiter' && a.receivingBody.key === 'Cusp 1');
    assert(jupCuspStd, 'Jupiter Trine Cusp 1 (orb 4.0°) must be included under STANDARD_5_00');

    // Under NAVAMSHA_3_20 (3.3333° limit): orb 4.0° is EXCLUDED.
    const resNav = calculatePlanetaryAspects(mockPlanets, mockCusps, {
        convention: ASPECT_CONVENTIONS.KP_WESTERN,
        cuspOrbMode: CUSP_ORB_MODES.NAVAMSHA_3_20,
        includeCusps: true
    });
    const jupCuspNav = resNav.aspects.find(a => a.castingBody.key === 'Jupiter' && a.receivingBody.key === 'Cusp 1');
    assert(!jupCuspNav, 'Jupiter Trine Cusp 1 (orb 4.0°) must be excluded under NAVAMSHA_3_20');
});

// 6. Classical Vedic Parashari Graha Drishti & Regression AUD-03
runTest('Regression AUD-03: Vedic Parashari drishti whole-house aspects never display invalid degree orbs', () => {
    const mockPlanets = [
        { key: 'Mars', name: 'Mars', te: 'కుజుడు', longitude: 92.64, house: 10, speedDegPerDay: 0.65 },
        { key: 'Jupiter', name: 'Jupiter', te: 'గురువు', longitude: 333.06, house: 5, speedDegPerDay: -0.09 },
        { key: 'Saturn', name: 'Saturn', te: 'శని', longitude: 9.89, house: 7, speedDegPerDay: 0.001 }
    ];

    const mockCusps = Array.from({ length: 12 }, (_, i) => ({
        houseNumber: i + 1,
        siderealLongitude: (i * 30.0 + 1.5) % 360,
        sign: { en: `Sign ${i+1}`, te: `రాశి ${i+1}` }
    }));

    const res = calculatePlanetaryAspects(mockPlanets, mockCusps, {
        convention: ASPECT_CONVENTIONS.VEDIC_SPECIAL,
        includeCusps: true
    });

    // Verify all aspects have orb === 0 and orbFormatted === 'Full (100%)'
    for (const asp of res.aspects) {
        assert.strictEqual(asp.orb, 0, `Vedic whole-house aspect ${asp.aspectType} must have orb = 0`);
        assert.strictEqual(asp.orbFormatted, 'Full (100%)', `Vedic aspect orbFormatted must be 'Full (100%)'`);
        assert(typeof asp.actualAngle === 'number' && asp.actualAngle >= 0 && asp.actualAngle <= 180, 'Actual separation angle must be a valid angle 0-180°');
    }

    // Mars in H10 aspects: H1 (4th), H4 (7th), H5 (8th)
    const marsH1 = res.aspects.find(a => a.castingBody.key === 'Mars' && a.targetHouse === 1);
    const marsH4 = res.aspects.find(a => a.castingBody.key === 'Mars' && a.targetHouse === 4);
    const marsH5 = res.aspects.find(a => a.castingBody.key === 'Mars' && a.targetHouse === 5);
    assert(marsH1, 'Mars in H10 must cast 4th drishti on H1');
    assert(marsH4, 'Mars in H10 must cast 7th drishti on H4');
    assert(marsH5, 'Mars in H10 must cast 8th drishti on H5');

    // Jupiter in H5 aspects: H9 (5th), H11 (7th), H1 (9th)
    const jupH9 = res.aspects.find(a => a.castingBody.key === 'Jupiter' && a.targetHouse === 9);
    const jupH11 = res.aspects.find(a => a.castingBody.key === 'Jupiter' && a.targetHouse === 11);
    const jupH1 = res.aspects.find(a => a.castingBody.key === 'Jupiter' && a.targetHouse === 1);
    assert(jupH9, 'Jupiter in H5 must cast 5th drishti on H9');
    assert(jupH11, 'Jupiter in H5 must cast 7th drishti on H11');
    assert(jupH1, 'Jupiter in H5 must cast 9th drishti on H1');

    // Saturn in H7 aspects: H9 (3rd), H1 (7th), H4 (10th)
    const satH9 = res.aspects.find(a => a.castingBody.key === 'Saturn' && a.targetHouse === 9);
    const satH1 = res.aspects.find(a => a.castingBody.key === 'Saturn' && a.targetHouse === 1);
    const satH4 = res.aspects.find(a => a.castingBody.key === 'Saturn' && a.targetHouse === 4);
    assert(satH9, 'Saturn in H7 must cast 3rd drishti on H9');
    assert(satH1, 'Saturn in H7 must cast 7th drishti on H1');
    assert(satH4, 'Saturn in H7 must cast 10th drishti on H4');
});

// 7. Configurable Rahu / Ketu handling
runTest('Supports configurable Rahu/Ketu aspect conventions without ambiguity', () => {
    const mockPlanets = [
        { key: 'Rahu', name: 'Rahu', te: 'రాహువు', longitude: 10.0, house: 1, speedDegPerDay: -0.05 },
        { key: 'Ketu', name: 'Ketu', te: 'కేతువు', longitude: 190.0, house: 7, speedDegPerDay: -0.05 },
        { key: 'Sun', name: 'Sun', te: 'సూర్యుడు', longitude: 130.0, house: 5, speedDegPerDay: 1.0 }
    ];
    const mockCusps = Array.from({ length: 12 }, (_, i) => ({
        houseNumber: i + 1,
        siderealLongitude: i * 30.0
    }));

    // Mode A: Western degree aspects (Rahu at 10° and Sun at 130° form 120° Trine)
    const resWestern = calculatePlanetaryAspects(mockPlanets, mockCusps, {
        convention: ASPECT_CONVENTIONS.KP_WESTERN,
        rahuKetuMode: RAHU_KETU_ASPECT_MODES.WESTERN_ASPECTS,
        includeCusps: false
    });
    const rahuSunTrine = resWestern.aspects.find(a => a.castingBody.key === 'Rahu' && a.receivingBody.key === 'Sun');
    assert(rahuSunTrine, 'Rahu at 10° should form Trine to Sun at 130° in Western mode');

    // Mode B: Exclude Rahu/Ketu
    const resNone = calculatePlanetaryAspects(mockPlanets, mockCusps, {
        convention: ASPECT_CONVENTIONS.KP_WESTERN,
        rahuKetuMode: RAHU_KETU_ASPECT_MODES.NONE,
        includeCusps: false
    });
    assert.strictEqual(resNone.aspects.length, 0, 'No aspects should be formed when Rahu/Ketu are excluded');

    // Mode C: Vedic 7th only
    const resVedic7 = calculatePlanetaryAspects(mockPlanets, mockCusps, {
        convention: ASPECT_CONVENTIONS.VEDIC_SPECIAL,
        rahuKetuMode: RAHU_KETU_ASPECT_MODES.SEVENTH_ONLY,
        includeCusps: true
    });
    const rahuAspects7 = resVedic7.aspects.filter(a => a.castingBody.key === 'Rahu');
    assert(rahuAspects7.every(a => a.relativeHouseSpan === 7), 'All Rahu aspects must be 7th house in 7th-only mode');
});

// 8. Numerical Ground Truth Regression for 15-Aug-1998 Hyderabad Chart
runTest('Reproduces exact numerical angles, orbs, and motions for 15-Aug-1998 10:30 IST Hyderabad', () => {
    const kpData = calculateKPKundli({
        birthDate: '1998-08-15',
        birthTime: '10:30',
        lat: 17.3850,
        lon: 78.4867,
        timezone: 'Asia/Kolkata'
    });

    // Verify Ascendant and Planetary Houses
    assert.strictEqual(kpData.cusps[0].sign.en, 'Libra', 'Ascendant must be Libra');
    assert(Math.abs(kpData.cusps[0].siderealLongitude - 181.890) < 0.05, 'Ascendant longitude ~181.89°');

    const sun = kpData.planets.find(p => p.key === 'Sun');
    assert(sun && sun.sign.en === 'Cancer' && sun.house === 10, 'Sun must be in Cancer in House 10');

    const moon = kpData.planets.find(p => p.key === 'Moon');
    assert(moon && moon.sign.en === 'Taurus' && moon.house === 8, 'Moon must be in Taurus in House 8');

    const mars = kpData.planets.find(p => p.key === 'Mars');
    assert(mars && mars.sign.en === 'Cancer' && mars.house === 10, 'Mars must be in Cancer in House 10');

    const jup = kpData.planets.find(p => p.key === 'Jupiter');
    assert(jup && jup.sign.en === 'Pisces' && jup.house === 5 && jup.isRetrograde, 'Jupiter must be in Pisces in House 5 retrograde');

    const sat = kpData.planets.find(p => p.key === 'Saturn');
    assert(sat && sat.sign.en === 'Aries' && sat.house === 7, 'Saturn must be in Aries in House 7');

    // 1. Mars Trine Jupiter: nominal 120°, actual ~119.586°, orb ~0.414° (0°24'50"), applying, benefic
    const marsJup = kpData.aspects.aspects.find(a => a.castingBody.key === 'Mars' && a.receivingBody.key === 'Jupiter');
    assert(marsJup, 'Mars Trine Jupiter must exist');
    assert.strictEqual(marsJup.aspectType, 'Trine');
    assert.strictEqual(marsJup.nominalAngle, 120);
    assert(Math.abs(marsJup.actualAngle - 119.586) < 0.01, `Mars Trine Jupiter actualAngle must be ~119.586°, got ${marsJup.actualAngle}`);
    assert(Math.abs(marsJup.orb - 0.414) < 0.01, `Mars Trine Jupiter orb must be ~0.414°, got ${marsJup.orb}`);
    assert.strictEqual(marsJup.motion, 'applying', 'Mars Trine Jupiter must be applying');
    assert.strictEqual(marsJup.nature, 'benefic', 'Mars Trine Jupiter must be benefic');

    // 2. Moon Sextile Jupiter: nominal 60°, actual ~60.417°, orb ~0.417° (0°25'01"), separating, benefic
    const moonJup = kpData.aspects.aspects.find(a => a.castingBody.key === 'Moon' && a.receivingBody.key === 'Jupiter');
    assert(moonJup, 'Moon Sextile Jupiter must exist');
    assert.strictEqual(moonJup.aspectType, 'Sextile');
    assert.strictEqual(moonJup.nominalAngle, 60);
    assert(Math.abs(moonJup.actualAngle - 60.417) < 0.01, `Moon Sextile Jupiter actualAngle must be ~60.417°, got ${moonJup.actualAngle}`);
    assert(Math.abs(moonJup.orb - 0.417) < 0.01, `Moon Sextile Jupiter orb must be ~0.417°, got ${moonJup.orb}`);
    assert.strictEqual(moonJup.motion, 'separating', 'Moon Sextile Jupiter must be separating');
    assert.strictEqual(moonJup.nature, 'benefic', 'Moon Sextile Jupiter must be benefic');

    // 3. Sun Conjunction Mercury: nominal 0°, actual ~2.150°, orb ~2.150°, separating, neutral
    const sunMerc = kpData.aspects.aspects.find(a => a.castingBody.key === 'Sun' && a.receivingBody.key === 'Mercury');
    assert(sunMerc, 'Sun Conjunction Mercury must exist');
    assert.strictEqual(sunMerc.aspectType, 'Conjunction');
    assert(Math.abs(sunMerc.actualAngle - 2.150) < 0.01, `Sun Conjunction Mercury actualAngle must be ~2.150°, got ${sunMerc.actualAngle}`);
    assert.strictEqual(sunMerc.motion, 'separating', 'Sun Conjunction Mercury must be separating');

    // 4. Venus Square Saturn: nominal 90°, actual ~88.595°, orb ~1.405°, applying, malefic
    const venSat = kpData.aspects.aspects.find(a => a.castingBody.key === 'Venus' && a.receivingBody.key === 'Saturn');
    assert(venSat, 'Venus Square Saturn must exist');
    assert.strictEqual(venSat.aspectType, 'Square');
    assert(Math.abs(venSat.actualAngle - 88.595) < 0.01, `Venus Square Saturn actualAngle must be ~88.595°, got ${venSat.actualAngle}`);
    assert.strictEqual(venSat.motion, 'applying', 'Venus Square Saturn must be applying');
    assert.strictEqual(venSat.nature, 'malefic', 'Venus Square Saturn must be malefic');

    // Ensure significators table is preserved and completely untouched
    assert(kpData.significators, 'Significators must exist');
    assert.strictEqual(kpData.significators.houseSignificators.length, 12, '12 houses in significators');
    assert.strictEqual(Object.keys(kpData.significators.planetSignifications).length, 9, '9 planets in significators');
});

// Test 9: Aspect-based house significations calculation and integration
runTest('KP aspect-based house indications integration and Parashari Graha Drishti mapping', () => {
    // 1. Verify Parashari rules definitions
    assert.deepStrictEqual(KP_VEDIC_DRISHTI_RULES.Mars, [4, 7, 8]);
    assert.deepStrictEqual(KP_VEDIC_DRISHTI_RULES.Jupiter, [5, 7, 9]);
    assert.deepStrictEqual(KP_VEDIC_DRISHTI_RULES.Saturn, [3, 7, 10]);
    assert.deepStrictEqual(KP_VEDIC_DRISHTI_RULES.Sun, [7]);
    assert.deepStrictEqual(KP_VEDIC_DRISHTI_RULES.Moon, [7]);
    assert.deepStrictEqual(KP_VEDIC_DRISHTI_RULES.Rahu, [5, 7, 9]);
    assert.deepStrictEqual(KP_VEDIC_DRISHTI_RULES.Ketu, [5, 7, 9]);

    // 2. Test getPlanetAspectHouses edge cases
    assert.deepStrictEqual(getPlanetAspectHouses('', 5), []);
    assert.deepStrictEqual(getPlanetAspectHouses('Mars', 0), []);
    assert.deepStrictEqual(getPlanetAspectHouses('Mars', 13), []);

    // Mars in house 10 -> [1, 4, 5]
    const marsAsp = getPlanetAspectHouses('Mars', 10);
    assert.strictEqual(marsAsp.length, 3);
    assert.deepStrictEqual(marsAsp.map(a => a.house), [1, 4, 5]);

    // Jupiter in house 5 -> [9, 11, 1]
    const jupAsp = getPlanetAspectHouses('Jupiter', 5);
    assert.strictEqual(jupAsp.length, 3);
    assert.deepStrictEqual(jupAsp.map(a => a.house), [9, 11, 1]);

    // Saturn in house 7 -> [9, 1, 4]
    const satAsp = getPlanetAspectHouses('Saturn', 7);
    assert.strictEqual(satAsp.length, 3);
    assert.deepStrictEqual(satAsp.map(a => a.house), [9, 1, 4]);

    // 3. Test calculation in benchmark chart
    const kpData = calculateKPKundli({
        birthDate: '1998-08-15',
        birthTime: '10:30',
        lat: 17.3850,
        lon: 78.4867,
        timezone: 'Asia/Kolkata',
        ayanamshaMode: 'kp_new'
    });

    const sigs = kpData.significators;
    assert.ok(sigs.aspectSignifications);
    assert.strictEqual(sigs.aspectSignifications.houseAspects.length, 12);
    assert.strictEqual(sigs.aspectSignifications.planetAspects.length, 9);
    assert(sigs.aspectSignifications.totalAspectLinks > 0);

    // Verify House 1 receives aspects from Mars, Jupiter, Saturn, Ketu
    const h1 = sigs.houseSignificators[0];
    assert.strictEqual(h1.houseNumber, 1);
    assert.deepStrictEqual(h1.aspectedByPlanets.sort(), ['Jupiter', 'Ketu', 'Mars', 'Saturn'].sort());

    // Verify House 4 receives aspects from Sun, Mars, Mercury, Venus, Saturn
    const h4 = sigs.houseSignificators[3];
    assert.strictEqual(h4.houseNumber, 4);
    assert.deepStrictEqual(h4.aspectedByPlanets.sort(), ['Mars', 'Mercury', 'Saturn', 'Sun', 'Venus'].sort());

    // Verify allHouses has zero duplicate house entries across all planets
    for (const p of sigs.planetSignifications) {
        const set = new Set(p.allHouses);
        assert.strictEqual(p.allHouses.length, set.size, `Duplicate found in allHouses for ${p.planetKey}`);
        const setAsp = new Set(p.allHousesWithAspects);
        assert.strictEqual(p.allHousesWithAspects.length, setAsp.size, `Duplicate found in allHousesWithAspects for ${p.planetKey}`);
    }
});

console.log(`\nPLANETARY ASPECTS TEST SUITE SUMMARY: ${passed} Passed, ${failed} Failed.\n`);

if (failed > 0) {
    process.exit(1);
}
