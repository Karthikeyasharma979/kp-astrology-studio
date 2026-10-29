/**
 * Precision 5-Level Vimshottari Dasha & Joint DBA Evaluation Comprehensive Suite
 *
 * Verifies:
 * 1. Mathematical 5-Level Vimshottari Dasha Hierarchy (MD -> AD -> PD -> SD -> Prana)
 *    - Canonical sequence and proportionality at every level
 *    - Parent enclosure: Child start == parent start, child 9 end == parent end
 *    - Strict contiguity: Zero gaps and zero overlaps across all 5 levels
 *    - Half-open interval boundary semantics [start, end)
 *    - Pre-natal birth clipping on subperiods
 * 2. Planetary Significators & House Coverage
 *    - Accurate retrieval of 4-tier significator houses S(p) from KP engine
 *    - Set intersection M(p) = S(p) ∩ H for each running lord
 *    - Deduplication: Distinct house counting invariant
 *    - Individual coverage percentage: 100 * |M(p)| / |H|
 *    - Combined 5-level union coverage: M_combined = H ∩ (∪ S(p))
 *    - Missing houses identification: H \ M_combined
 * 3. Joint DBA Rule Evaluation & Explainable Obstruction
 *    - 100% coverage with obstruction -> afflicted status with traceable reasons
 *    - Incomplete coverage -> partially satisfied or not satisfied without false negatives
 *    - Traceable obstruction report: identifies lord, level, and negative house
 *    - Backward compatibility: preserves triadDetails (MD, AD, PD) and triadCoveragePercent
 * 4. End-to-End Real Chart Integration
 *    - Benchmark Chart (15 Aug 1998, 10:30 IST Hyderabad) produces all 5 active levels
 *    - getRunningDashaHierarchy conceptual entry point returns full hierarchy
 */

import assert from 'assert';
import {
    calculateVimshottariDasha,
    getActivePeriods,
    subdivideDashaPeriod,
    getRunningDashaHierarchy,
    formatSubperiodDuration,
    DASHA_LEVELS,
    VIMSHOTTARI_PLANETS,
    DASHA_YEAR_DAYS,
    MS_PER_YEAR
} from '../src/utils/kp/vimshottariDasha.js';
import {
    evaluateJointDBA,
    calculateCommonPlanetRanking,
    resolveRuleHouses
} from '../src/utils/kp/kpHouseGroupingEngine.js';
import { calculateKPKundli } from '../src/services/kpCalculator.js';

let passed = 0;
let failed = 0;

function it(description, fn) {
    try {
        fn();
        console.log(`  ✓ ${description}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${description}: ${err.message}`);
        if (err.stack) console.error(err.stack);
        failed++;
    }
}

console.log("=== RUNNING 5-LEVEL VIMSHOTTARI DASHA & JOINT DBA TEST SUITE ===\n");

// =============================================================================
// CATEGORY 1: 5-LEVEL DASHA MATHEMATICAL SUBDIVISION & TOPOLOGY
// =============================================================================
console.log("--- 1. 5-LEVEL DASHA MATHEMATICAL SUBDIVISION & TOPOLOGY ---");

it("1.1: Metadata definitions exist for all 5 levels (MD, AD, PD, SD, Prana)", () => {
    assert.strictEqual(DASHA_LEVELS[1].abbr, 'MD');
    assert.strictEqual(DASHA_LEVELS[2].abbr, 'AD');
    assert.strictEqual(DASHA_LEVELS[3].abbr, 'PD');
    assert.strictEqual(DASHA_LEVELS[4].abbr, 'SD');
    assert.strictEqual(DASHA_LEVELS[5].abbr, 'PRANA');

    assert.strictEqual(DASHA_LEVELS[4].name, 'Sookshma Dasha');
    assert.strictEqual(DASHA_LEVELS[5].name, 'Prana Dasha');
});

it("1.2: subdivideDashaPeriod subdivides Pratyantardasha into 9 Sookshma Dashas covering exact parent duration", () => {
    const parentPd = {
        id: 'pd_test',
        level: 3,
        lord: 'Saturn',
        startMs: 1000000000,
        endMs: 1000000000 + (30 * 86400 * 1000), // 30 days
        theoreticalStartMs: 1000000000,
        theoreticalEndMs: 1000000000 + (30 * 86400 * 1000)
    };

    const sds = subdivideDashaPeriod(parentPd, 4);
    assert.strictEqual(sds.length, 9, "Should generate exactly 9 Sookshma Dashas");

    // First child begins with parent lord (Saturn)
    assert.strictEqual(sds[0].lord, 'Saturn');
    assert.strictEqual(sds[1].lord, 'Mercury');
    assert.strictEqual(sds[2].lord, 'Ketu');
    assert.strictEqual(sds[3].lord, 'Venus');
    assert.strictEqual(sds[4].lord, 'Sun');
    assert.strictEqual(sds[5].lord, 'Moon');
    assert.strictEqual(sds[6].lord, 'Mars');
    assert.strictEqual(sds[7].lord, 'Rahu');
    assert.strictEqual(sds[8].lord, 'Jupiter');

    // Strict parent enclosure
    assert.strictEqual(sds[0].startMs, parentPd.startMs, "First child start matches parent start");
    assert.strictEqual(sds[8].endMs, parentPd.endMs, "Last child end matches parent end");

    // Strict zero-gap, zero-overlap contiguity
    for (let i = 0; i < sds.length - 1; i++) {
        assert.strictEqual(sds[i].endMs, sds[i + 1].startMs, `Zero-gap continuity between SD ${sds[i].lord} and ${sds[i+1].lord}`);
    }

    // Proportionality check: Venus (20y) should be longer than Sun (6y)
    const venusSd = sds.find(s => s.lord === 'Venus');
    const sunSd = sds.find(s => s.lord === 'Sun');
    assert.ok(venusSd.durationMs > sunSd.durationMs, "Venus SD duration > Sun SD duration");
    assert.strictEqual(Math.round(venusSd.durationMs / sunSd.durationMs), Math.round(20 / 6));
});

it("1.3: subdivideDashaPeriod subdivides Sookshma into 9 Prana Dashas covering exact parent duration", () => {
    const parentSd = {
        id: 'sd_test',
        level: 4,
        lord: 'Rahu',
        startMs: 2000000000,
        endMs: 2000000000 + (4 * 86400 * 1000), // 4 days
        theoreticalStartMs: 2000000000,
        theoreticalEndMs: 2000000000 + (4 * 86400 * 1000)
    };

    const pranas = subdivideDashaPeriod(parentSd, 5);
    assert.strictEqual(pranas.length, 9, "Should generate exactly 9 Prana Dashas");

    // First child begins with parent lord (Rahu)
    assert.strictEqual(pranas[0].lord, 'Rahu');
    assert.strictEqual(pranas[1].lord, 'Jupiter');
    assert.strictEqual(pranas[2].lord, 'Saturn');

    // Strict parent enclosure
    assert.strictEqual(pranas[0].startMs, parentSd.startMs);
    assert.strictEqual(pranas[8].endMs, parentSd.endMs);

    // Contiguity
    for (let i = 0; i < pranas.length - 1; i++) {
        assert.strictEqual(pranas[i].endMs, pranas[i + 1].startMs);
    }
});

it("1.4: Pre-natal birth clipping is preserved recursively on Sookshma and Prana levels", () => {
    const birthMs = 1500000000;
    const parentPdSpanningBirth = {
        id: 'pd_birth_span',
        level: 3,
        lord: 'Sun',
        startMs: birthMs,
        endMs: birthMs + 2000000,
        theoreticalStartMs: birthMs - 1000000,
        theoreticalEndMs: birthMs + 2000000
    };

    const sds = subdivideDashaPeriod(parentPdSpanningBirth, 4, birthMs);
    assert.ok(sds.length > 0, "At least some Sookshma periods are post-natal");
    assert.ok(sds[0].startMs >= birthMs, "First active Sookshma starts at or after birthMs");
    assert.strictEqual(sds[sds.length - 1].endMs, parentPdSpanningBirth.endMs, "Last Sookshma ends exactly at parent endMs");
});

it("1.5: formatSubperiodDuration provides clear, human-readable formatting across scales", () => {
    assert.strictEqual(formatSubperiodDuration(0), '0d 0h');
    assert.strictEqual(formatSubperiodDuration(25 * 60 * 1000), '25m');
    assert.strictEqual(formatSubperiodDuration((4 * 3600 + 15 * 60) * 1000), '4h 15m');
    assert.strictEqual(formatSubperiodDuration((3 * 86400 + 12 * 3600) * 1000), '3d 12h');
    assert.strictEqual(formatSubperiodDuration((45 * 86400) * 1000), '1m 15d');
    assert.strictEqual(formatSubperiodDuration((2 * 365.25 * 86400) * 1000), '2.0y');
});

// =============================================================================
// CATEGORY 2: ACTIVE 5-LEVEL PERIOD QUERY & HIERARCHY
// =============================================================================
console.log("\n--- 2. ACTIVE 5-LEVEL PERIOD QUERY & HIERARCHY ---");

it("2.1: getActivePeriods returns all 5 levels (MD, AD, PD, SD, Prana) with remaining durations", () => {
    const birthDate = '1998-08-15T05:00:00.000Z';
    const evalDate = '2024-05-10T12:00:00.000Z';
    const dasha = calculateVimshottariDasha({
        moonSiderealLongitude: 33.47398088399252,
        birthDateUtc: birthDate,
        referenceDate: evalDate
    });

    const active = dasha.activePeriods;
    assert.strictEqual(active.status, 'active');
    assert.ok(active.mahadasha, "Active MD present");
    assert.ok(active.antardasha, "Active AD / Bhukti present");
    assert.ok(active.pratyantardasha, "Active PD / Antara present");
    assert.ok(active.sookshmadasha, "Active SD / Sookshma present");
    assert.ok(active.pranadasha, "Active Prana present");

    assert.strictEqual(active.levels.length, 5, "Levels array contains exactly 5 periods");
    assert.strictEqual(active.levels[0].level, 1);
    assert.strictEqual(active.levels[1].level, 2);
    assert.strictEqual(active.levels[2].level, 3);
    assert.strictEqual(active.levels[3].level, 4);
    assert.strictEqual(active.levels[4].level, 5);

    // Verify parent-child enclosure at the evaluation instant
    const evalMs = new Date(evalDate).getTime();
    for (const lvl of active.levels) {
        assert.ok(evalMs >= lvl.startMs && evalMs < lvl.endMs, `Evaluation instant is within ${lvl.levelName} boundaries`);
        assert.ok(lvl.remainingMs > 0, `${lvl.levelName} has positive remainingMs`);
        assert.ok(lvl.remainingDuration, `${lvl.levelName} has formatted remainingDuration`);
    }

    // Verify backward compatibility
    assert.strictEqual(active.path, `${active.mahadasha.lord} - ${active.antardasha.lord} - ${active.pratyantardasha.lord}`);
    assert.ok(active.path5.includes(active.sookshmadasha.lord));
    assert.ok(active.hierarchyPath.includes('→'));
});

it("2.2: getRunningDashaHierarchy returns structured response with timezone and 5-level hierarchy", () => {
    const chart = calculateKPKundli({
        birthDate: "1998-08-15",
        birthTime: "10:30",
        lat: 17.3850,
        lon: 78.4867,
        timezone: "Asia/Kolkata"
    });

    const hierarchy = getRunningDashaHierarchy({
        chart,
        evaluationDateTime: "2024-06-01T10:00:00.000Z",
        timezone: "Asia/Kolkata"
    });

    assert.ok(hierarchy.runningDasha.mahadasha);
    assert.ok(hierarchy.runningDasha.bhukti);
    assert.ok(hierarchy.runningDasha.antara);
    assert.ok(hierarchy.runningDasha.sookshma);
    assert.ok(hierarchy.runningDasha.prana);
    assert.strictEqual(hierarchy.runningDasha.levels.length, 5);
    assert.strictEqual(hierarchy.timezone, "Asia/Kolkata");
    assert.strictEqual(hierarchy.calculationSource, 'Krishnamurti Paddhati / Classical Vimshottari 120-Year Proportional Subdivision');
});

// =============================================================================
// CATEGORY 3: SIGNIFICATOR CALCULATION & HOUSE COVERAGE
// =============================================================================
console.log("\n--- 3. SIGNIFICATOR CALCULATION & HOUSE COVERAGE ---");

it("3.1: Individual coverage M(p) = S(p) ∩ H and deduplication", () => {
    // Synthetic rule requiring houses 2, 6, 11
    const rule = {
        id: 'rule_job',
        jointDBA: { houses: [2, 6, 11] },
        housesToBeSignified: [2, 6, 11]
    };

    // Synthetic significators where Jupiter signifies 2, 6, 9, 11 (with duplicate relationships)
    const significators = {
        planetSignifications: [
            { planetKey: 'Jupiter', primaryHouses: [2, 6, 9, 11, 2, 6], allHouses: [2, 6, 9, 11] },
            { planetKey: 'Mars', primaryHouses: [1, 5, 8], allHouses: [1, 5, 8] },
            { planetKey: 'Venus', primaryHouses: [2, 7, 11], allHouses: [2, 7, 11] },
            { planetKey: 'Saturn', primaryHouses: [6, 10], allHouses: [6, 10] },
            { planetKey: 'Mercury', primaryHouses: [3, 4], allHouses: [3, 4] }
        ]
    };

    const runningLords = [
        { level: 'MD', planet: 'Jupiter', periodName: 'Mahadasha' },
        { level: 'AD', planet: 'Mars', periodName: 'Bhukti' },
        { level: 'PD', planet: 'Venus', periodName: 'Antara' },
        { level: 'SD', planet: 'Saturn', periodName: 'Sookshma' },
        { level: 'PRANA', planet: 'Mercury', periodName: 'Prana' }
    ];

    const result = evaluateJointDBA(significators, rule, runningLords);

    // Jupiter individual matches: 2, 6, 11 (3 out of 3 -> 100%)
    const jupDetails = result.runningLordsDetails.find(l => l.planet === 'Jupiter');
    assert.deepStrictEqual(jupDetails.signifiedHouses, [2, 6, 9, 11], "Signified houses deduplicated");
    assert.deepStrictEqual(jupDetails.matchedDBAHouses, [2, 6, 11], "Matches event houses 2, 6, 11");
    assert.strictEqual(jupDetails.matchedCount, 3);
    assert.strictEqual(jupDetails.coveragePercent, 100);

    // Mars individual matches: none of 2, 6, 11 (0%)
    const marsDetails = result.runningLordsDetails.find(l => l.planet === 'Mars');
    assert.strictEqual(marsDetails.matchedCount, 0);
    assert.strictEqual(marsDetails.coveragePercent, 0);

    // Combined 5-level coverage: Union covers 2, 6, 11 (100%)
    assert.deepStrictEqual(result.coveredHouses, [2, 6, 11]);
    assert.strictEqual(result.coveragePercent, 100);
    assert.deepStrictEqual(result.missingHouses, []);
});

it("3.2: Combined 5-level coverage correctly identifies missing houses", () => {
    // Rule requiring houses 2, 6, 10, 11
    const rule = {
        id: 'rule_career',
        jointDBA: { houses: [2, 6, 10, 11] },
        housesToBeSignified: [2, 6, 10, 11]
    };

    // Running lords collectively signify 2, 6, 11 (missing 10)
    const significators = {
        planetSignifications: [
            { planetKey: 'Rahu', primaryHouses: [2, 9] },
            { planetKey: 'Mars', primaryHouses: [6] },
            { planetKey: 'Jupiter', primaryHouses: [11] },
            { planetKey: 'Saturn', primaryHouses: [1, 3] },
            { planetKey: 'Mercury', primaryHouses: [4, 5] }
        ]
    };

    const runningLords = [
        { level: 'MD', planet: 'Rahu' },
        { level: 'AD', planet: 'Mars' },
        { level: 'PD', planet: 'Jupiter' },
        { level: 'SD', planet: 'Saturn' },
        { level: 'PRANA', planet: 'Mercury' }
    ];

    const result = evaluateJointDBA(significators, rule, runningLords);

    assert.deepStrictEqual(result.coveredHouses, [2, 6, 11]);
    assert.deepStrictEqual(result.missingHouses, [10], "House 10 correctly identified as missing");
    assert.strictEqual(result.matchedCount, 3);
    assert.strictEqual(result.totalRequiredCount, 4);
    assert.strictEqual(result.coveragePercent, 75); // 3 of 4 = 75%
    assert.strictEqual(result.status, 'partially-satisfied');
});

// =============================================================================
// CATEGORY 4: JOINT DBA RULE EVALUATION & TRACEABLE OBSTRUCTION
// =============================================================================
console.log("\n--- 4. JOINT DBA RULE EVALUATION & TRACEABLE OBSTRUCTION ---");

it("4.1: 100% coverage with negative obstruction yields 'afflicted' status with traceable reason", () => {
    const rule = {
        id: 'rule_debt_recovery',
        jointDBA: { houses: [2, 6, 11] },
        housesToBeSignified: [2, 6, 11],
        negativeHouses: [5, 8, 12] // Obstruction houses
    };

    // Lords collectively cover 2, 6, 11, but Mars signifies negative house 8
    const significators = {
        planetSignifications: [
            { planetKey: 'Rahu', primaryHouses: [2, 11] },
            { planetKey: 'Mars', primaryHouses: [6, 8] }, // 8 is negative!
            { planetKey: 'Jupiter', primaryHouses: [2] },
            { planetKey: 'Saturn', primaryHouses: [6] },
            { planetKey: 'Mercury', primaryHouses: [11] }
        ]
    };

    const runningLords = [
        { level: 'MD', planet: 'Rahu', periodName: 'Mahadasha' },
        { level: 'AD', planet: 'Mars', periodName: 'Bhukti' },
        { level: 'PD', planet: 'Jupiter', periodName: 'Antara' },
        { level: 'SD', planet: 'Saturn', periodName: 'Sookshma' },
        { level: 'PRANA', planet: 'Mercury', periodName: 'Prana' }
    ];

    const result = evaluateJointDBA(significators, rule, runningLords);

    assert.strictEqual(result.coveragePercent, 100, "100% house coverage");
    assert.strictEqual(result.hasObstruction, true, "Obstruction detected");
    assert.strictEqual(result.status, 'afflicted', "Status is afflicted despite 100% coverage");

    // Verify traceable reason
    assert.ok(result.afflictions.length > 0, "Afflictions array populated");
    const marsAffliction = result.afflictions.find(a => a.lord === 'Mars');
    assert.ok(marsAffliction, "Mars identified as afflicted lord");
    assert.strictEqual(marsAffliction.house, 8, "House 8 identified as triggering negative house");
    assert.ok(marsAffliction.reason.includes("Mars"), "Reason specifies planet name");
});

it("4.2: Incomplete coverage does not force negative verdict; yields partially-satisfied", () => {
    const rule = {
        id: 'rule_education',
        jointDBA: { houses: [4, 9, 11] },
        housesToBeSignified: [4, 9, 11],
        negativeHouses: [3, 8]
    };

    // Covers 4 and 11 (2 out of 3 houses, >= 50%), no negative houses
    const significators = {
        planetSignifications: [
            { planetKey: 'Sun', primaryHouses: [4] },
            { planetKey: 'Moon', primaryHouses: [11] },
            { planetKey: 'Mars', primaryHouses: [1, 2] },
            { planetKey: 'Mercury', primaryHouses: [5, 6] },
            { planetKey: 'Jupiter', primaryHouses: [7, 10] }
        ]
    };

    const runningLords = [
        { level: 'MD', planet: 'Sun' },
        { level: 'AD', planet: 'Moon' },
        { level: 'PD', planet: 'Mars' },
        { level: 'SD', planet: 'Mercury' },
        { level: 'PRANA', planet: 'Jupiter' }
    ];

    const result = evaluateJointDBA(significators, rule, runningLords);
    assert.strictEqual(result.hasObstruction, false);
    assert.strictEqual(result.status, 'partially-satisfied');
    assert.strictEqual(result.coveragePercent, 67); // 2 of 3 = 67%
});

it("4.3: Backward compatibility preserves triadDetails (MD, AD, PD) and triadCoveragePercent", () => {
    const rule = {
        id: 'rule_test',
        jointDBA: { houses: [1, 2, 3] },
        housesToBeSignified: [1, 2, 3]
    };

    const significators = {
        planetSignifications: [
            { planetKey: 'L1', primaryHouses: [1] },
            { planetKey: 'L2', primaryHouses: [2] },
            { planetKey: 'L3', primaryHouses: [] },
            { planetKey: 'L4', primaryHouses: [3] },
            { planetKey: 'L5', primaryHouses: [] }
        ]
    };

    const runningLords = [
        { level: 'MD', planet: 'L1' },
        { level: 'AD', planet: 'L2' },
        { level: 'PD', planet: 'L3' },
        { level: 'SD', planet: 'L4' },
        { level: 'PRANA', planet: 'L5' }
    ];

    const result = evaluateJointDBA(significators, rule, runningLords);

    // Triad (L1, L2, L3) covers 1, 2 -> 67%
    assert.strictEqual(result.triadDetails.length, 3);
    assert.strictEqual(result.triadCoveragePercent, 67);

    // 5-Level union (L1..L5) covers 1, 2, 3 -> 100%
    assert.strictEqual(result.runningLordsDetails.length, 5);
    assert.strictEqual(result.coveragePercent, 100);
});

// =============================================================================
// CATEGORY 5: COMMON PLANET RANKING (MODE A) 5-LEVEL RECOGNITION
// =============================================================================
console.log("\n--- 5. COMMON PLANET RANKING (MODE A) 5-LEVEL RECOGNITION ---");

it("5.1: calculateCommonPlanetRanking identifies isSookshmaLord and isPranaLord in dashaRoles", () => {
    const rule = {
        id: 'rule_marriage',
        jointDBA: { houses: [2, 7, 11] },
        housesToBeSignified: [2, 7, 11]
    };

    const significators = {
        planetSignifications: [
            { planetKey: 'Venus', primaryHouses: [2, 7, 11], allHouses: [2, 7, 11] },
            { planetKey: 'Jupiter', primaryHouses: [2, 11], allHouses: [2, 11] },
            { planetKey: 'Saturn', primaryHouses: [7], allHouses: [7] },
            { planetKey: 'Mercury', primaryHouses: [11], allHouses: [11] },
            { planetKey: 'Mars', primaryHouses: [2], allHouses: [2] }
        ]
    };

    const runningLords = [
        { level: 'MD', planet: 'Venus' },
        { level: 'AD', planet: 'Jupiter' },
        { level: 'PD', planet: 'Saturn' },
        { level: 'SD', planet: 'Mercury' },
        { level: 'PRANA', planet: 'Mars' }
    ];

    const ranking = calculateCommonPlanetRanking(significators, rule, {
        runningDashaPlanets: runningLords
    });

    const merc = ranking.allScoredPlanets.find(p => p.planetKey === 'Mercury');
    assert.strictEqual(merc.dashaRoles.isSookshmaLord, true, "Mercury recognized as Sookshma Lord");
    assert.strictEqual(merc.isRunningDBA, true);

    const mars = ranking.allScoredPlanets.find(p => p.planetKey === 'Mars');
    assert.strictEqual(mars.dashaRoles.isPranaLord, true, "Mars recognized as Prana Lord");
    assert.strictEqual(mars.isRunningDBA, true);
});

console.log("\n=============================================================");
console.log(`5-LEVEL VIMSHOTTARI DASHA & JOINT DBA SUITE: ${passed} Passed, ${failed} Failed.`);
console.log("=============================================================\n");

if (failed > 0) {
    process.exit(1);
}
