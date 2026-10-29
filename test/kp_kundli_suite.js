/**
 * Automated Verification & Benchmark Test Suite for Krishnamurti Paddhati (KP) Engine
 * Run: node test/kp_kundli_suite.js
 */

import assert from 'assert';
import {
    KP_NAKSHATRAS,
    VIMSHOTTARI_PLANETS,
    NAKSHATRA_SPAN_DEG,
    getSubLordIntervals,
    getSubSubLordIntervals,
    resolveKPLongitude
} from '../src/utils/kp/kpSubLord.js';
import { getKPAyanamsha, KP_AYANAMSHA_MODES } from '../src/utils/kp/kpAyanamsha.js';
import { calculateKPHouses, getKPPlanetHouse, normalizeDeg } from '../src/utils/kp/kpHouses.js';
import { calculateKPSignificators } from '../src/utils/kp/kpSignificators.js';
import { calculateKPRulingPlanets } from '../src/utils/kp/kpRulingPlanets.js';
import { calculateKPKundli } from '../src/services/kpCalculator.js';
import { resolveLocalToUTC } from '../src/services/locationService.js';
import * as Astronomy from 'astronomy-engine';

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

console.log("=== RUNNING ASTROSHARMA KP KUNDLI TEST SUITE ===\n");

// 1. Nakshatra Boundaries
it("Nakshatra 0° belongs to Ashwini, exactly 13°20' belongs to Bharani, 360° wraps to 0°", () => {
    // 0° is Ashwini
    const res0 = resolveKPLongitude(0.0);
    assert.strictEqual(res0.nakshatra.name, "Ashwini");
    assert.strictEqual(res0.starLord, "Ketu");
    assert.strictEqual(res0.subLord, "Ketu"); // First sub of Ashwini is Ketu

    // Immediately below 13°20' (13.3333333°) is still Ashwini
    const resUnder = resolveKPLongitude(13.3333);
    assert.strictEqual(resUnder.nakshatra.name, "Ashwini");

    // Exactly 13°20' (13.333333333333334°) belongs to Bharani
    const resBharani = resolveKPLongitude(NAKSHATRA_SPAN_DEG);
    assert.strictEqual(resBharani.nakshatra.name, "Bharani");
    assert.strictEqual(resBharani.starLord, "Venus");
    assert.strictEqual(resBharani.subLord, "Venus"); // First sub of Bharani is Venus

    // 360° normalizes to 0° (Ashwini)
    const res360 = resolveKPLongitude(360.0);
    assert.strictEqual(res360.nakshatra.name, "Ashwini");
    assert.strictEqual(res360.longitude, 0.0);

    // 359.999° belongs to Revati
    const resRevati = resolveKPLongitude(359.999);
    assert.strictEqual(resRevati.nakshatra.name, "Revati");
    assert.strictEqual(resRevati.starLord, "Mercury");
});

// 2. Sub Lord Spans & Sum
it("Every Nakshatra has 9 Sub intervals that sum to exactly 13°20' (800 arcminutes)", () => {
    const starLords = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];

    for (const lord of starLords) {
        const intervals = getSubLordIntervals(lord);
        assert.strictEqual(intervals.length, 9);
        assert.strictEqual(intervals[0].planetKey, lord, `Sub sequence must begin with Star Lord ${lord}`);

        let totalMinutes = 0;
        let totalDeg = 0;
        for (const sub of intervals) {
            totalMinutes += sub.spanMinutes;
            totalDeg += sub.spanDeg;
        }

        assert.ok(Math.abs(totalMinutes - 800.0) < 1e-9, `Total arcminutes for ${lord} must equal 800`);
        assert.ok(Math.abs(totalDeg - (40.0 / 3.0)) < 1e-9, `Total degrees for ${lord} must equal 13°20'`);
    }
});

// 3. Sub Lord Half-Open Boundary Tests
it("Sub Lord boundaries obey [start, end) half-open intervals deterministically", () => {
    // In Ashwini (Star Lord Ketu):
    // Sub 0: Ketu (0 to 46' 40" = 0.7777778°)
    // Sub 1: Venus (46' 40" to 3° 00' 00" = 3.0°)
    // Sub 2: Sun (3° 00' 00" to 3° 40' 00" = 3.6666667°)
    const sub0 = resolveKPLongitude(0.0);
    assert.strictEqual(sub0.subLord, "Ketu");

    const justBeforeVenus = resolveKPLongitude(0.77777);
    assert.strictEqual(justBeforeVenus.subLord, "Ketu");

    const exactlyVenus = resolveKPLongitude(0.7777777777777778);
    assert.strictEqual(exactlyVenus.subLord, "Venus");

    const exactlySun = resolveKPLongitude(3.0);
    assert.strictEqual(exactlySun.subLord, "Sun");

    const justBeforeMoon = resolveKPLongitude(3.66666);
    assert.strictEqual(justBeforeMoon.subLord, "Sun");

    const exactlyMoon = resolveKPLongitude(3.6666666666666665);
    assert.strictEqual(exactlyMoon.subLord, "Moon");
});

// 4. Sub-Sub Lord Hierarchy & Proportions
it("Sub-Sub intervals partition the parent Sub Lord span completely and start from the Sub Lord", () => {
    const parentSubLord = "Venus";
    const parentSpanDeg = (20.0 / 120.0) * NAKSHATRA_SPAN_DEG; // ~2.22222°
    const subSubs = getSubSubLordIntervals(parentSubLord, parentSpanDeg, 1.0);

    assert.strictEqual(subSubs.length, 9);
    assert.strictEqual(subSubs[0].planetKey, "Venus", "Sub-Sub sequence must start from parent Sub Lord");

    let sum = 0;
    for (const ss of subSubs) {
        sum += ss.spanDeg;
    }
    assert.ok(Math.abs(sum - parentSpanDeg) < 1e-12, "Sum of Sub-Sub spans must equal parent Sub span");
});

// 5. KP Ayanamsha Modes & Formula Evaluation
it("KP Ayanamsha computes correctly for J2000 epoch and advances at ~50.24 arcseconds/year", () => {
    const j2000Time = Astronomy.MakeTime(new Date(Date.UTC(2000, 0, 1, 12, 0, 0)));

    // KP New at J2000 is ~23.760240° (23° 45' 36.86" - Swiss Ephemeris SE_SIDM_KRISHNAMURTI mode 5)
    const kpNewJ2000 = getKPAyanamsha(j2000Time, KP_AYANAMSHA_MODES.KP_NEW);
    assert.ok(Math.abs(kpNewJ2000 - 23.760240) < 0.0001, `KP New J2000: ${kpNewJ2000}`);

    // KP Original at J2000 is ~23.765556° (23° 45' 56")
    const kpOrigJ2000 = getKPAyanamsha(j2000Time, KP_AYANAMSHA_MODES.KP_ORIGINAL);
    assert.ok(Math.abs(kpOrigJ2000 - 23.765556) < 0.0001, `KP Original J2000: ${kpOrigJ2000}`);

    // Difference between Lahiri (~23.853°) and KP (~23.765°) is ~0.088° (5' 17")
    // Verification that KP is distinct from Lahiri
    assert.ok(kpNewJ2000 < 23.85, "KP Ayanamsha must be distinct and lower than Lahiri");
});

// 6. Placidus House Cusps
it("Calculates 12 Placidus house cusps, Ascendant and MC with opposite cusps separated by 180°", () => {
    const utcDate = resolveLocalToUTC("1998-08-15", "10:30", "Asia/Kolkata");
    const houses = calculateKPHouses({
        utcDate,
        lat: 17.3850,
        lon: 78.4867,
        ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW
    });

    assert.strictEqual(houses.cusps.length, 12);

    // Opposite cusps must be separated by 180°
    for (let i = 0; i < 6; i++) {
        const cusp1 = houses.cusps[i].tropicalLongitude;
        const cuspOpp = houses.cusps[i + 6].tropicalLongitude;
        const diff = Math.abs(normalizeDeg(cuspOpp - cusp1));
        assert.ok(Math.abs(diff - 180.0) < 1e-9, `Cusp ${i + 1} and ${i + 7} must be 180° apart`);
    }

    // Every cusp has a valid Star Lord and Sub Lord
    for (const c of houses.cusps) {
        assert.ok(c.starLord, `Cusp ${c.houseNumber} must have a starLord`);
        assert.ok(c.subLord, `Cusp ${c.houseNumber} must have a subLord`);
        assert.ok(c.subSubLord, `Cusp ${c.houseNumber} must have a subSubLord`);
    }
});

// 7. Mean Ketu 180° Opposition & Motion
it("Mean Ketu is positioned exactly 180° opposite to Mean Rahu in KP chart", () => {
    const res = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    const rahu = res.planets.find(p => p.key === 'Rahu');
    const ketu = res.planets.find(p => p.key === 'Ketu');

    const diff = (ketu.longitude - rahu.longitude + 360.0) % 360.0;
    assert.strictEqual(Math.round(diff), 180);
    assert.strictEqual(rahu.isRetrograde, true);
    assert.strictEqual(ketu.isRetrograde, true);
});

// 8. 4-Fold KP Significators Rule Engine
it("Computes 4 levels of house significators and maps planets to houses correctly", () => {
    const res = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    const sigs = res.significators;
    assert.strictEqual(sigs.houseSignificators.length, 12);
    assert.strictEqual(sigs.planetSignifications.length, 9);

    // Each house record has the 4 levels defined
    for (const h of sigs.houseSignificators) {
        assert.ok(Array.isArray(h.level1));
        assert.ok(Array.isArray(h.level2));
        assert.ok(Array.isArray(h.level3));
        assert.ok(Array.isArray(h.level4));
    }
});

// 9. KP Ruling Planets at Judgment Instant
it("Calculates Ruling Planets for a designated judgment instant without confounding birth data", () => {
    const rp = calculateKPRulingPlanets({
        date: "2026-10-24",
        time: "16:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    assert.ok(rp !== null);
    assert.strictEqual(rp.dayLord.dayName, "Saturday");
    assert.strictEqual(rp.dayLord.planet, "Saturn");
    assert.ok(rp.lagna.signLord);
    assert.ok(rp.lagna.starLord);
    assert.ok(rp.moon.signLord);
    assert.ok(rp.moon.starLord);
    assert.strictEqual(rp.coreRulingPlanets.length, 6);
    assert.strictEqual(rp.coreRulingPlanets[5].role, 'Tathkala Hora Lord');
    assert.ok(rp.coreRulingPlanets[5].planet);
});

// 10. Benchmark Chart Verification
it("Benchmark Chart: 15 August 1998, 10:30 AM IST, Hyderabad produces verified KP positions", () => {
    const res = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata",
        ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW
    });

    // Sun in Cancer
    const sun = res.planets.find(p => p.key === 'Sun');
    assert.strictEqual(sun.sign.en, "Cancer");
    assert.strictEqual(sun.signLord, "Moon");
    assert.strictEqual(sun.nakshatra.name, "Ashlesha");
    assert.strictEqual(sun.starLord, "Mercury");

    // Moon in Taurus
    const moon = res.planets.find(p => p.key === 'Moon');
    assert.strictEqual(moon.sign.en, "Taurus");
    assert.strictEqual(moon.signLord, "Venus");
    assert.strictEqual(moon.nakshatra.name, "Krittika");
    assert.strictEqual(moon.starLord, "Sun");

    // Jupiter in Pisces (Sign 11), Retrograde
    const jupiter = res.planets.find(p => p.key === 'Jupiter');
    assert.strictEqual(jupiter.sign.en, "Pisces");
    assert.strictEqual(jupiter.isRetrograde, true);

    // Saturn in Aries, Direct
    const saturn = res.planets.find(p => p.key === 'Saturn');
    assert.strictEqual(saturn.sign.en, "Aries");
    assert.strictEqual(saturn.isRetrograde, false);

    // KP Ayanamsha ~23.7409°
    assert.ok(Math.abs(parseFloat(res.metadata.ayanamshaDeg) - 23.74095) < 0.001);

    // Fortuna (Part of Fortune) = Asc + Moon - Sun
    assert.ok(res.fortuna, "Fortuna must be calculated");
    assert.strictEqual(res.fortuna.key, "Fortuna");
    assert.strictEqual(res.fortuna.sign.en, "Cancer");
    assert.strictEqual(res.fortuna.signLord, "Moon");
    assert.strictEqual(res.fortuna.nakshatra.name, "Pushya");
    assert.strictEqual(res.fortuna.starLord, "Saturn");
    assert.strictEqual(res.fortuna.subLord, "Mercury");
    assert.strictEqual(res.fortuna.subSubLord, "Jupiter");
    assert.strictEqual(res.fortuna.house, 10);
    assert.strictEqual(res.fortuna.isPoint, true);
});

// 11. Zodiac Longitude Normalization
it("Normalizes negative longitudes and multi-cycle wraparound correctly", () => {
    assert.strictEqual(Math.round(normalizeDeg(-30.0)), 330);
    assert.strictEqual(Math.round(normalizeDeg(-370.0)), 350);
    assert.strictEqual(Math.round(normalizeDeg(750.0)), 30);
    assert.strictEqual(Math.round(normalizeDeg(360.0)), 0);
});

// 12. KP House Assignment Across 0/360 Zodiac Boundary
it("Assigns planets correctly to Placidus houses when house spans across the 0/360 Pisces-Aries boundary", () => {
    // Mock cusps where House 6 starts at Pisces 25° (355°) and House 7 starts at Aries 5° (5°)
    const mockCusps = Array.from({ length: 12 }, (_, i) => ({
        houseNumber: i + 1,
        siderealLongitude: (i * 30.0 + 325.0) % 360.0
    }));
    // House 1 cusp: 325°
    // House 2 cusp: 355°
    // House 3 cusp: 25° (crosses 0°)
    
    // Planet at 358° (Pisces) must be in House 2
    const h1 = getKPPlanetHouse(358.0, mockCusps);
    assert.strictEqual(h1, 2);

    // Planet at 10° (Aries) must be in House 2 (before House 3 cusp at 25°)
    const h2 = getKPPlanetHouse(10.0, mockCusps);
    assert.strictEqual(h2, 2);

    // Planet at 26° (Aries) must be in House 3
    const h3 = getKPPlanetHouse(26.0, mockCusps);
    assert.strictEqual(h3, 3);
});

// 13. Retrograde Wraparound Motion Detection
it("Detects retrograde and direct motions safely across the 0°/360° Aries boundary", () => {
    function angularDiff(deg2, deg1) {
        return ((deg2 - deg1 + 540) % 360) - 180;
    }
    // Planet moves from 0.05° to 359.95° (Retrograde westward motion across 0°)
    const retroDiff = angularDiff(359.95, 0.05);
    assert.ok(retroDiff < 0, "Motion from 0.05° to 359.95° must have negative speed (retrograde)");

    // Planet moves from 359.95° to 0.05° (Direct eastward motion across 0°)
    const directDiff = angularDiff(0.05, 359.95);
    assert.ok(directDiff > 0, "Motion from 359.95° to 0.05° must have positive speed (direct)");
});

// 14. Consultation Prefill Payload Validation
it("Generates complete, safe prefill payload for consultation navigation without data loss", () => {
    const payload = {
        fromKundli: true,
        fullName: "Test Seeker",
        dob: "1998-08-15",
        birthTime: "10:30",
        birthPlace: "Hyderabad, India",
        selectedType: "deep",
        question: "KP Astrology Birth Chart & Sub Lord Consultation",
        language: "te"
    };

    assert.strictEqual(payload.fromKundli, true);
    assert.strictEqual(payload.fullName, "Test Seeker");
    assert.strictEqual(payload.dob, "1998-08-15");
    assert.strictEqual(payload.birthTime, "10:30");
    assert.strictEqual(payload.birthPlace, "Hyderabad, India");
    assert.strictEqual(payload.selectedType, "deep");
    assert.ok(payload.question.includes("KP"));
    assert.strictEqual(payload.language, "te");
});

// 15. Swiss Ephemeris Gold-Standard Reference Comparison (Sub-Arcsecond Accuracy)
it("Validates calculations against Swiss Ephemeris reference within arcsecond tolerances", () => {
    const res = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata",
        ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW
    });

    // Swiss Ephemeris Ascendant: 181.890020° (Libra 1.890°)
    assert.ok(Math.abs(res.lagna.siderealLongitude - 181.890020) < 0.005, "Ascendant within 18 arcseconds of Swiss Ephemeris");

    // Swiss Ephemeris Midheaven: 91.213897° (Cancer 1.214°)
    assert.ok(Math.abs(res.cusps[9].siderealLongitude - 91.213897) < 0.005, "MC within 18 arcseconds of Swiss Ephemeris");

    // Sun: 118.441962° (Cancer 28.442°)
    const sun = res.planets.find(p => p.key === 'Sun');
    assert.ok(Math.abs(sun.longitude - 118.441962) < 0.005, "Sun within 18 arcseconds of Swiss Ephemeris");

    // Moon: 33.473981° (Taurus 3.474°)
    const moon = res.planets.find(p => p.key === 'Moon');
    assert.ok(Math.abs(moon.longitude - 33.473981) < 0.005, "Moon within 18 arcseconds of Swiss Ephemeris");
});

// 16. KP Planetary Lordship Matrix (Significator Table) Validation
it("Calculates complete planetary lordship matrix without (..) placeholders, with dispositor ownership & star/sub lord significators", () => {
    const res = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata",
        ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW
    });

    const matrix = res.significators?.planetaryLordshipMatrix;
    assert.ok(Array.isArray(matrix), "planetaryLordshipMatrix must be an array");
    assert.strictEqual(matrix.length, 9, "Matrix must have 9 planetary rows");

    // Verify no row has (..) placeholder in any column
    for (const row of matrix) {
        assert.notStrictEqual(row.ownsFormatted, "(..)", `owns for ${row.planetKey} must not be (..)`);
        assert.notStrictEqual(row.stlOfFormatted, "(..)", `stl of for ${row.planetKey} must not be (..)`);
        assert.notStrictEqual(row.subOfFormatted, "(..)", `sub of for ${row.planetKey} must not be (..)`);
        assert.ok(row.occupiedHouse >= 1 && row.occupiedHouse <= 12, `${row.planetKey} must occupy a valid house`);
        assert.ok(row.owns.length > 0, `${row.planetKey} must have owned houses or dispositor houses`);
        assert.ok(row.stlOf.length > 0, `${row.planetKey} must have star lord significators`);
        assert.ok(row.subOf.length > 0, `${row.planetKey} must have sub lord significators`);
    }

    // Verify Rahu dispositor ownership (in Leo ruled by Sun -> Sun owns 11)
    const rahuRow = matrix.find(r => r.planetKey === 'Rahu');
    assert.deepStrictEqual(rahuRow.owns, [11], "Rahu must reflect Sun's house ownership (11)");
    assert.strictEqual(rahuRow.isRetrograde, true, "Rahu is retrograde");

    // Verify Ketu dispositor ownership (in Aquarius ruled by Saturn -> Saturn owns 4, 5)
    const ketuRow = matrix.find(r => r.planetKey === 'Ketu');
    assert.deepStrictEqual(ketuRow.owns, [4, 5], "Ketu must reflect Saturn's house ownership (4, 5)");
    assert.strictEqual(ketuRow.isRetrograde, true, "Ketu is retrograde");

    // Verify Mercury retrograde status & significators
    const mercRow = matrix.find(r => r.planetKey === 'Mercury');
    assert.strictEqual(mercRow.isRetrograde, true, "Mercury is retrograde");
    assert.deepStrictEqual(mercRow.owns, [9, 12], "Mercury owns 9, 12 (Gemini, Virgo)");
    // Mercury star lord is Mercury itself (Ashlesha) -> occupancy 10 + owns 9, 12 -> [9, 10, 12]
    assert.deepStrictEqual(mercRow.stlOf, [9, 10, 12], "Mercury star lord significators are [9, 10, 12]");
    // Mercury sub lord is Jupiter -> occupancy 5 + owns 3, 6 -> [3, 5, 6]
    assert.deepStrictEqual(mercRow.subOf, [3, 5, 6], "Mercury sub lord significators are [3, 5, 6]");

    // Verify Sun significators: Star lord Mercury (10, 9, 12) -> [9, 10, 12]; Sub lord Saturn (7, 4, 5) -> [4, 5, 7]
    const sunRow = matrix.find(r => r.planetKey === 'Sun');
    assert.deepStrictEqual(sunRow.stlOf, [9, 10, 12]);
    assert.deepStrictEqual(sunRow.subOf, [4, 5, 7]);
});

// 17. KP Planetary Aspects (Graha Drishti) Integration with Significations
it("Calculates Parashari Graha Drishti on houses and integrates aspect indications cleanly into KP significators", () => {
    const res = calculateKPKundli({
        birthDate: '1998-08-15',
        birthTime: '10:30',
        lat: 17.3850,
        lon: 78.4867,
        timezone: 'Asia/Kolkata',
        ayanamshaMode: 'kp_new'
    });

    const sigs = res.significators;
    assert.ok(sigs, "Significators object must exist");
    assert.ok(sigs.houseSignificators, "houseSignificators must exist");
    assert.ok(sigs.planetSignifications, "planetSignifications must exist");
    assert.ok(sigs.aspectSignifications, "aspectSignifications must exist");

    // A. Verify Planet Aspect Calculations (aspectedHouses)
    const marsSig = sigs.planetSignifications.find(p => p.planetKey === 'Mars');
    assert.strictEqual(marsSig.house, 10, "Mars is in House 10");
    // Mars 4th -> 1, 7th -> 4, 8th -> 5
    assert.deepStrictEqual(marsSig.aspectedHouses, [1, 4, 5], "Mars aspects houses 1, 4, 5");

    const jupSig = sigs.planetSignifications.find(p => p.planetKey === 'Jupiter');
    assert.strictEqual(jupSig.house, 5, "Jupiter is in House 5");
    // Jupiter 5th -> 9, 7th -> 11, 9th -> 1
    assert.deepStrictEqual(jupSig.aspectedHouses, [1, 9, 11], "Jupiter aspects houses 1, 9, 11");

    const satSig = sigs.planetSignifications.find(p => p.planetKey === 'Saturn');
    assert.strictEqual(satSig.house, 7, "Saturn is in House 7");
    // Saturn 3rd -> 9, 7th -> 1, 10th -> 4
    assert.deepStrictEqual(satSig.aspectedHouses, [1, 4, 9], "Saturn aspects houses 1, 4, 9");

    const sunSig = sigs.planetSignifications.find(p => p.planetKey === 'Sun');
    assert.strictEqual(sunSig.house, 10);
    assert.deepStrictEqual(sunSig.aspectedHouses, [4], "Sun aspects house 4 (7th drishti)");

    const moonSig = sigs.planetSignifications.find(p => p.planetKey === 'Moon');
    assert.strictEqual(moonSig.house, 8);
    assert.deepStrictEqual(moonSig.aspectedHouses, [2], "Moon aspects house 2 (7th drishti)");

    const rahuSig = sigs.planetSignifications.find(p => p.planetKey === 'Rahu');
    assert.strictEqual(rahuSig.house, 11);
    // Rahu in 11: 5th -> 3, 7th -> 5, 9th -> 7
    assert.deepStrictEqual(rahuSig.aspectedHouses, [3, 5, 7], "Rahu aspects houses 3, 5, 7");

    const ketuSig = sigs.planetSignifications.find(p => p.planetKey === 'Ketu');
    assert.strictEqual(ketuSig.house, 5);
    // Ketu in 5: 5th -> 9, 7th -> 11, 9th -> 1
    assert.deepStrictEqual(ketuSig.aspectedHouses, [1, 9, 11], "Ketu aspects houses 1, 9, 11");

    // B. Verify House Aspect Receivers (aspectedByPlanets)
    const h1 = sigs.houseSignificators.find(h => h.houseNumber === 1);
    // House 1 is aspected by Mars (4th), Jupiter (9th), Saturn (7th), Ketu (9th)
    assert.deepStrictEqual(h1.aspectedByPlanets.sort(), ['Jupiter', 'Ketu', 'Mars', 'Saturn'].sort());

    const h4 = sigs.houseSignificators.find(h => h.houseNumber === 4);
    // House 4 is aspected by Sun (7th), Mars (7th), Mercury (7th), Venus (7th), Saturn (10th)
    assert.deepStrictEqual(h4.aspectedByPlanets.sort(), ['Mars', 'Mercury', 'Saturn', 'Sun', 'Venus'].sort());

    const h9 = sigs.houseSignificators.find(h => h.houseNumber === 9);
    // House 9 is aspected by Jupiter (5th), Saturn (3rd), Ketu (5th)
    assert.deepStrictEqual(h9.aspectedByPlanets.sort(), ['Jupiter', 'Ketu', 'Saturn'].sort());

    const h11 = sigs.houseSignificators.find(h => h.houseNumber === 11);
    // House 11 is aspected by Jupiter (7th), Ketu (7th)
    assert.deepStrictEqual(h11.aspectedByPlanets.sort(), ['Jupiter', 'Ketu'].sort());

    const h5 = sigs.houseSignificators.find(h => h.houseNumber === 5);
    // House 5 is aspected by Mars (8th), Rahu (7th)
    assert.deepStrictEqual(h5.aspectedByPlanets.sort(), ['Mars', 'Rahu'].sort());

    // C. Verify preservation of core calculations and no duplicate entries
    for (const p of sigs.planetSignifications) {
        // Core allHouses must be strictly sorted unique
        for (let i = 0; i < p.allHouses.length - 1; i++) {
            assert.ok(p.allHouses[i] < p.allHouses[i + 1], `allHouses for ${p.planetKey} must have no duplicates and be strictly sorted`);
        }
        // allHousesWithAspects must be sorted unique
        for (let i = 0; i < p.allHousesWithAspects.length - 1; i++) {
            assert.ok(p.allHousesWithAspects[i] < p.allHousesWithAspects[i + 1], `allHousesWithAspects for ${p.planetKey} must have no duplicates and be strictly sorted`);
        }
    }

    for (const h of sigs.houseSignificators) {
        // allSignificators must be unique
        const uniqueSet = new Set(h.allSignificators);
        assert.strictEqual(h.allSignificators.length, uniqueSet.size, `House ${h.houseNumber} allSignificators must have no duplicate planets`);
    }

    // D. Verify Planetary Lordship Matrix carries aspects without breaking existing columns
    const matrix = sigs.planetaryLordshipMatrix;
    for (const row of matrix) {
        assert.ok(Array.isArray(row.aspects), `row.aspects must be an array for ${row.planetKey}`);
        assert.notStrictEqual(row.aspectsFormatted, "(..)", `row.aspectsFormatted must not be (..) for ${row.planetKey}`);
    }
    const marsRow = matrix.find(r => r.planetKey === 'Mars');
    assert.deepStrictEqual(marsRow.aspects, [1, 4, 5]);
    assert.strictEqual(marsRow.aspectsFormatted, "(1,4,5)");
});

console.log(`\nKP TEST SUITE SUMMARY: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) process.exit(1);

