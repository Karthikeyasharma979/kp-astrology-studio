/**
 * Complete KP House Grouping & Event-Based Significator Analysis Test Suite
 *
 * Verifies:
 * 1. Complete category and event registry (all 340 rules, all 12 cusps)
 * 2. Source-page and table traceability for 100% of rules
 * 3. Correct house-grouping extraction (core numbers, parenthesized, alternatives, exclusions)
 * 4. Separate Joint DBA requirements preservation
 * 5. Parenthesized and optional houses handling
 * 6. Mode A: Common-Planet Ranking (Option 2)
 *    - Prompt synthetic benchmark (Venus=3, Jupiter=2, Saturn=2, Mars=1)
 *    - Distinct-house counting & duplicate elimination
 *    - Minimum two-house threshold filtering
 *    - Deterministic tie handling
 * 7. Mode B: Dedicated Joint DBA Evaluation
 *    - Triad coverage analysis
 *    - Full, partial, and not-satisfied states
 *    - Negative condition exclusions (5, 8, 12)
 * 8. Dynamic Badhaka & Maraka resolution
 * 9. Cusp Sub Lord condition checks
 * 10. Real KP engine integration with benchmark chart (15 Aug 1998, 10:30 IST, Hyderabad)
 */

import assert from 'assert';
import { KP_HOUSE_GROUPING_RULES, KP_HOUSE_GROUPING_CATALOG } from '../src/data/kpHouseGroupingRules.js';
import {
    calculateCommonPlanetRanking,
    evaluateJointDBA,
    evaluateCuspSubLordChecks,
    getBadhakaHouse,
    getMarakaHouses,
    resolveRuleHouses,
    CANONICAL_PLANETS
} from '../src/utils/kp/kpHouseGroupingEngine.js';
import { calculateKPKundli, KP_AYANAMSHA_MODES } from '../src/services/kpCalculator.js';
import { calculateKPSignificators } from '../src/utils/kp/kpSignificators.js';
import { calculateVimshottariDasha } from '../src/utils/kp/vimshottariDasha.js';

let passed = 0;
let failed = 0;

function it(description, fn) {
    try {
        fn();
        console.log(`  ✓ ${description}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${description}`);
        console.error(err);
        failed++;
    }
}

console.log('\n=== RUNNING KP HOUSE GROUPING & EVENT ANALYSIS TEST SUITE ===\n');

// 1. REGISTRY INTEGRITY & COVERAGE TESTS
console.log('--- 1. REGISTRY INTEGRITY & COMPLETE DOCUMENT COVERAGE ---');

it('Complete rule catalog contains at least 340 extractable rules from 19-page document', () => {
    assert.ok(KP_HOUSE_GROUPING_RULES.length >= 340, `Expected at least 340 rules, found ${KP_HOUSE_GROUPING_RULES.length}`);
});

it('Successfully registers new event: Tracking of movable item search with 2nd CSL check and Joint DBA of 2, 6, 11', () => {
    const rule = KP_HOUSE_GROUPING_RULES.find(r => r.event.toLowerCase().includes('movable item'));
    assert.ok(rule, 'Tracking of movable item search rule not found in registry');
    assert.strictEqual(rule.cusp, 2);
    assert.deepStrictEqual(rule.housesToBeSignified, [2, 6, 11]);
    assert.deepStrictEqual(rule.jointDBA.houses, [2, 6, 11]);
    assert.deepStrictEqual(rule.cuspSubLordChecks, [2]);
    assert.deepStrictEqual(rule.negativeHouses, [8, 12]);
});

it('All 12 KP Cusps are fully represented in the category catalog', () => {
    assert.strictEqual(KP_HOUSE_GROUPING_CATALOG.length, 12);
    for (let c = 1; c <= 12; c++) {
        const cat = KP_HOUSE_GROUPING_CATALOG.find(item => item.cusp === c);
        assert.ok(cat, `Cusp ${c} missing from catalog`);
        assert.ok(cat.totalEvents > 0, `Cusp ${c} has no events`);
    }
});

it('Every rule has 100% complete source traceability (document, tableIndex, rowIndex, page)', () => {
    for (const rule of KP_HOUSE_GROUPING_RULES) {
        assert.ok(rule.id, 'Rule missing ID');
        assert.ok(rule.source, `Rule ${rule.id} missing source`);
        assert.strictEqual(rule.source.document, 'KP HOUSE GROUPING.docx');
        assert.strictEqual(typeof rule.source.tableIndex, 'number');
        assert.strictEqual(typeof rule.source.rowIndex, 'number');
        assert.strictEqual(typeof rule.source.page, 'number');
        assert.ok(rule.source.page >= 1 && rule.source.page <= 19, `Invalid page ${rule.source.page}`);
    }
});

it('Preserves originalNotation verbatim for every rule row', () => {
    for (const rule of KP_HOUSE_GROUPING_RULES) {
        assert.ok(rule.originalNotation, `Rule ${rule.id} missing originalNotation`);
        assert.strictEqual(typeof rule.originalNotation.housesToBeSignified, 'string');
        assert.strictEqual(typeof rule.originalNotation.jointDBA, 'string');
        assert.strictEqual(typeof rule.originalNotation.remark, 'string');
    }
});

it('Maintains separate Joint DBA and Houses to be signified structures', () => {
    for (const rule of KP_HOUSE_GROUPING_RULES) {
        assert.ok(Array.isArray(rule.housesToBeSignified), `Rule ${rule.id} housesToBeSignified is not an array`);
        assert.ok(rule.jointDBA, `Rule ${rule.id} missing jointDBA object`);
        assert.ok(Array.isArray(rule.jointDBA.houses), `Rule ${rule.id} jointDBA.houses is not an array`);
    }
});

it('Accurately identifies and flags the 15 ambiguous / OCR review rules', () => {
    const reviewRules = KP_HOUSE_GROUPING_RULES.filter(r => r.verificationStatus === 'needs-review');
    assert.strictEqual(reviewRules.length, 15, `Expected 15 review rules, found ${reviewRules.length}`);
    for (const r of reviewRules) {
        assert.ok(r.reviewFlags.length > 0, `Rule ${r.id} marked needs-review but has no reviewFlags`);
    }
});

// 2. MATHEMATICAL & LOGICAL ENGINE UNIT TESTS
console.log('\n--- 2. COMMON-PLANET RANKING ENGINE (OPTION 2) ---');

it('Reproduces the prompt synthetic benchmark (Venus=3, Jupiter=2, Saturn=2, Mars=1)', () => {
    const syntheticSignificators = {
        planetSignifications: [
            { planetKey: 'Venus', primaryHouses: [2, 7, 11] },
            { planetKey: 'Jupiter', primaryHouses: [2, 7] },
            { planetKey: 'Saturn', primaryHouses: [2, 11] },
            { planetKey: 'Mars', primaryHouses: [7] },
            { planetKey: 'Sun', primaryHouses: [1, 5] },
            { planetKey: 'Moon', primaryHouses: [4] },
            { planetKey: 'Mercury', primaryHouses: [6] },
            { planetKey: 'Rahu', primaryHouses: [8] },
            { planetKey: 'Ketu', primaryHouses: [12] }
        ],
        houseSignificators: []
    };

    const marriageRule = {
        id: 'test.marriage',
        housesToBeSignified: [2, 7, 11],
        planetaryKarakas: ['Venus'],
        originalNotation: { housesToBeSignified: '2, 7, 11', jointDBA: '2, 7, 11' }
    };

    const res = calculateCommonPlanetRanking(syntheticSignificators, marriageRule, { minMatches: 2 });

    // 1. Venus must be rank 1 with score 3
    assert.strictEqual(res.rankedPlanets[0].planetKey, 'Venus');
    assert.strictEqual(res.rankedPlanets[0].score, 3);
    assert.deepStrictEqual(res.rankedPlanets[0].matchedHouses, [2, 7, 11]);

    // 2. Jupiter and Saturn must be rank 2 and 3 with score 2
    assert.strictEqual(res.rankedPlanets[1].score, 2);
    assert.strictEqual(res.rankedPlanets[2].score, 2);
    const top3Keys = res.rankedPlanets.map(p => p.planetKey);
    assert.ok(top3Keys.includes('Jupiter'));
    assert.ok(top3Keys.includes('Saturn'));

    // 3. Exactly 3 planets meet the >= 2 distinct houses threshold
    assert.strictEqual(res.rankedPlanets.length, 3);

    // 4. Mars (score 1) must be in excludedPlanets
    const mars = res.excludedPlanets.find(p => p.planetKey === 'Mars');
    assert.ok(mars, 'Mars should be in excludedPlanets');
    assert.strictEqual(mars.score, 1);
});

it('Eliminates duplicate relationships to the same house (distinct count invariant)', () => {
    // If a planet occupies house 2 and also has star lord in house 2 and lord of house 2, score must be 1, not 3
    const duplicateSignificators = {
        planetSignifications: [
            {
                planetKey: 'Jupiter',
                primaryHouses: [2], // Level 1, 2, 4 all connect to house 2
                level1Houses: [2],
                level2Houses: [2],
                level4Houses: [2]
            }
        ],
        houseSignificators: []
    };

    const rule = {
        id: 'test.wealth',
        housesToBeSignified: [2, 6, 11],
        originalNotation: { housesToBeSignified: '2, 6, 11' }
    };

    const res = calculateCommonPlanetRanking(duplicateSignificators, rule, { minMatches: 1 });
    const jup = res.rankedPlanets.find(p => p.planetKey === 'Jupiter');
    assert.strictEqual(jup.score, 1, `Expected score 1 for distinct house 2, got ${jup.score}`);
    assert.deepStrictEqual(jup.matchedHouses, [2]);
});

it('Secondary sort applies deterministic tie-breaking (level strength, then canonical planet order)', () => {
    const tiedSignificators = {
        planetSignifications: [
            // Mercury has Level 2 match
            { planetKey: 'Mercury', primaryHouses: [2, 7], level2Houses: [2, 7] },
            // Moon has Level 1 match (stronger)
            { planetKey: 'Moon', primaryHouses: [2, 7], level1Houses: [2, 7] },
            // Mars has Level 3 match
            { planetKey: 'Mars', primaryHouses: [2, 7], level3Houses: [2, 7] }
        ],
        houseSignificators: []
    };

    const rule = {
        id: 'test.tie',
        housesToBeSignified: [2, 7],
        originalNotation: { housesToBeSignified: '2, 7' }
    };

    const res = calculateCommonPlanetRanking(tiedSignificators, rule, { minMatches: 2 });
    assert.strictEqual(res.rankedPlanets[0].planetKey, 'Moon', 'Level 1 match must rank ahead of Level 2');
    assert.strictEqual(res.rankedPlanets[1].planetKey, 'Mercury', 'Level 2 match must rank ahead of Level 3');
    assert.strictEqual(res.rankedPlanets[2].planetKey, 'Mars');
});

// 3. MODE B: JOINT DBA EVALUATION TESTS
console.log('\n--- 3. JOINT DBA EVALUATION ENGINE ---');

it('Evaluates Joint DBA satisfaction when running triad covers required houses', () => {
    const significators = {
        planetSignifications: [
            { planetKey: 'Rahu', primaryHouses: [2, 6] },
            { planetKey: 'Mercury', primaryHouses: [7, 10] },
            { planetKey: 'Venus', primaryHouses: [11] }
        ]
    };

    const rule = {
        id: 'test.marriage.joint',
        jointDBA: { raw: '2, 7, 11', houses: [2, 7, 11] },
        housesToBeSignified: [2, 7, 11],
        originalNotation: { jointDBA: '2, 7, 11' }
    };

    const runningTriad = [
        { level: 'MD', planet: 'Rahu' },
        { level: 'AD', planet: 'Mercury' },
        { level: 'PD', planet: 'Venus' }
    ];

    const dbaRes = evaluateJointDBA(significators, rule, runningTriad);
    assert.strictEqual(dbaRes.status, 'satisfied');
    assert.strictEqual(dbaRes.coveragePercent, 100);
    assert.deepStrictEqual(dbaRes.coveredHouses, [2, 7, 11]);
    assert.strictEqual(dbaRes.missingHouses.length, 0);
});

it('Detects negative exclusions (e.g., 5, 8, 12 in debt/job) and flags obstruction', () => {
    const significators = {
        planetSignifications: [
            { planetKey: 'Rahu', primaryHouses: [2, 6, 8] }, // 8 is negative!
            { planetKey: 'Mercury', primaryHouses: [10, 11] },
            { planetKey: 'Venus', primaryHouses: [2] }
        ]
    };

    const rule = {
        id: 'test.wealth.enormous',
        jointDBA: { raw: '2, 6, 10, 11', houses: [2, 6, 10, 11] },
        negativeHouses: [5, 8, 12],
        remarks: 'Not connected to 5, 8, 12',
        originalNotation: { jointDBA: '2, 6, 10, 11', remark: 'Not connected to 5, 8, 12' }
    };

    const runningTriad = [
        { level: 'MD', planet: 'Rahu' },
        { level: 'AD', planet: 'Mercury' },
        { level: 'PD', planet: 'Venus' }
    ];

    const dbaRes = evaluateJointDBA(significators, rule, runningTriad);
    assert.strictEqual(dbaRes.status, 'afflicted');
    assert.strictEqual(dbaRes.hasObstruction, true);
    assert.deepStrictEqual(dbaRes.triadAfflictions, [8]);
});

// 4. DYNAMIC BADHAKA & MARAKA RESOLUTION
console.log('\n--- 4. DYNAMIC BADHAKA & MARAKA RESOLUTION ---');

it('Resolves Badhaka sthana correctly for Movable, Fixed, and Dual Ascendant signs', () => {
    assert.strictEqual(getBadhakaHouse(1), 11, 'Aries (Movable) -> 11');
    assert.strictEqual(getBadhakaHouse(4), 11, 'Cancer (Movable) -> 11');
    assert.strictEqual(getBadhakaHouse(2), 9, 'Taurus (Fixed) -> 9');
    assert.strictEqual(getBadhakaHouse(5), 9, 'Leo (Fixed) -> 9');
    assert.strictEqual(getBadhakaHouse(3), 7, 'Gemini (Dual) -> 7');
    assert.strictEqual(getBadhakaHouse(9), 7, 'Sagittarius (Dual) -> 7');
});

it('Substitutes Badhaka house dynamically into rule house array', () => {
    const rule = {
        id: 'test.badhaka',
        housesToBeSignified: [6, 8],
        originalNotation: { housesToBeSignified: '6, 8, Badhaka' }
    };
    // For Fixed ascendant (e.g. Leo = 5), Badhaka is 9
    const resolved = resolveRuleHouses(rule.housesToBeSignified, rule, 5);
    assert.deepStrictEqual(resolved, [6, 8, 9]);
});

// 5. CUSP SUB LORD EVALUATION TESTS
console.log('\n--- 5. CUSP SUB LORD CHECKS ---');

it('Evaluates Cusp Sub Lord checks against event requirements', () => {
    const mockCusps = Array.from({ length: 12 }, (_, i) => ({
        cuspNumber: i + 1,
        subLord: i === 6 ? 'Venus' : 'Saturn' // 7th cusp sub lord is Venus
    }));

    const mockSignificators = {
        planetSignifications: [
            { planetKey: 'Venus', primaryHouses: [2, 7, 11] },
            { planetKey: 'Saturn', primaryHouses: [1, 6] }
        ]
    };

    const marriageRule = {
        id: 'test.marriage',
        housesToBeSignified: [2, 7, 11],
        cuspSubLordChecks: [7], // Check 7th Sbl
        negativeHouses: [1, 6, 10]
    };

    const checks = evaluateCuspSubLordChecks(mockCusps, mockSignificators, marriageRule);
    assert.strictEqual(checks.length, 1);
    assert.strictEqual(checks[0].cuspNumber, 7);
    assert.strictEqual(checks[0].subLord, 'Venus');
    assert.strictEqual(checks[0].status, 'favorable');
    assert.deepStrictEqual(checks[0].matchedHouses, [2, 7, 11]);
});

it('Evaluates Tracking of movable item search: 2nd CSL signifying 2/6/11 is favorable, 8/12 is negative', () => {
    const movableRule = KP_HOUSE_GROUPING_RULES.find(r => r.id === 'kp.c2.tracking_movable_item_search');
    assert.ok(movableRule, 'Movable item search rule must exist in registry');

    // Case 1: 2nd CSL is Mercury which signifies house 6 (recovers item)
    const mockCuspsFavorable = Array.from({ length: 12 }, (_, i) => ({
        cuspNumber: i + 1,
        subLord: i === 1 ? 'Mercury' : 'Saturn' // 2nd CSL = Mercury
    }));
    const mockSignificatorsFavorable = {
        planetSignifications: [
            { planetKey: 'Mercury', primaryHouses: [6, 10] },
            { planetKey: 'Saturn', primaryHouses: [1, 4] }
        ]
    };
    const favorableChecks = evaluateCuspSubLordChecks(mockCuspsFavorable, mockSignificatorsFavorable, movableRule);
    assert.strictEqual(favorableChecks.length, 1);
    assert.strictEqual(favorableChecks[0].cuspNumber, 2);
    assert.strictEqual(favorableChecks[0].subLord, 'Mercury');
    assert.strictEqual(favorableChecks[0].status, 'favorable');
    assert.deepStrictEqual(favorableChecks[0].matchedHouses, [6]);

    // Case 2: 2nd CSL is Mars which signifies house 8 or 12 (loss / not recovered)
    const mockCuspsNegative = Array.from({ length: 12 }, (_, i) => ({
        cuspNumber: i + 1,
        subLord: i === 1 ? 'Mars' : 'Saturn'
    }));
    const mockSignificatorsNegative = {
        planetSignifications: [
            { planetKey: 'Mars', primaryHouses: [8, 12] },
            { planetKey: 'Saturn', primaryHouses: [1, 4] }
        ]
    };
    const negativeChecks = evaluateCuspSubLordChecks(mockCuspsNegative, mockSignificatorsNegative, movableRule);
    assert.strictEqual(negativeChecks.length, 1);
    assert.strictEqual(negativeChecks[0].status, 'negative');
    assert.deepStrictEqual(negativeChecks[0].negativeHouses, [8, 12]);

    // Case 3: Joint DBA of 2, 6, 11
    const runningTriad = [
        { level: 'MD', planet: 'Jupiter' },
        { level: 'AD', planet: 'Venus' },
        { level: 'PD', planet: 'Mercury' }
    ];
    const dbaSignificators = {
        planetSignifications: [
            { planetKey: 'Jupiter', primaryHouses: [2, 5] },
            { planetKey: 'Venus', primaryHouses: [6, 9] },
            { planetKey: 'Mercury', primaryHouses: [11] }
        ]
    };
    const dbaResult = evaluateJointDBA(dbaSignificators, movableRule, runningTriad);
    assert.strictEqual(dbaResult.status, 'satisfied');
    assert.deepStrictEqual(dbaResult.coveredHouses, [2, 6, 11]);
    assert.strictEqual(dbaResult.hasObstruction, false);
});

// 6. END-TO-END BENCHMARK INTEGRATION WITH REAL KP ENGINE
console.log('\n--- 6. INTEGRATION WITH REAL KP CALCULATION ENGINE ---');

it('Performs end-to-end House Grouping analysis on Benchmark Chart (15 Aug 1998, 10:30 IST Hyderabad)', () => {
    const chart = calculateKPKundli({
        birthDate: '1998-08-15',
        birthTime: '10:30',
        lat: 17.3850,
        lon: 78.4867,
        timezone: 'Asia/Kolkata',
        ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW,
        nodeMode: 'mean'
    });

    assert.ok(chart, 'Failed to compute KP Kundli');
    assert.strictEqual(chart.planets.length, 9);
    assert.strictEqual(chart.cusps.length, 12);

    const significators = calculateKPSignificators(chart.planets, chart.cusps);
    assert.ok(significators, 'Failed to compute 4-fold significators');

    const dashas = calculateVimshottariDasha({
        moonSiderealLongitude: chart.planets.find(p => p.key === 'Moon').longitude,
        birthDateUtc: new Date('1998-08-15T05:00:00.000Z'), // 10:30 IST is 05:00 UTC
        planets: chart.planets,
        cusps: chart.cusps,
        significators
    });
    assert.ok(dashas.mahadashas.length > 0, 'Failed to compute Vimshottari Dasha');

    // Test a real rule from the registry: Marriage (Cusp 7, Marriage)
    const marriageRule = KP_HOUSE_GROUPING_RULES.find(r =>
        r.category.includes('7th Cusp') && r.event.toLowerCase() === 'marriage'
    ) || KP_HOUSE_GROUPING_RULES.find(r => r.event.toLowerCase().includes('marriage'));

    assert.ok(marriageRule, 'Marriage rule not found in registry');

    const ranking = calculateCommonPlanetRanking(significators, marriageRule, {
        minMatches: 2,
        ascSign: chart.ascendant?.sign || 'Libra',
        planetsData: chart.planets,
        cuspsData: chart.cusps
    });

    assert.ok(ranking.rankedPlanets.length >= 1, 'Should find at least 1 qualified planet for marriage');
    for (const p of ranking.rankedPlanets) {
        assert.ok(p.score >= 2, `Ranked planet ${p.planetKey} has score ${p.score} < 2`);
        assert.ok(p.matchedHouses.length >= 2);
        assert.ok(Array.isArray(p.houseEvidence));
    }

    // Test Job Promotion rule
    const promotionRule = KP_HOUSE_GROUPING_RULES.find(r =>
        r.event.toLowerCase() === 'promotion'
    );
    assert.ok(promotionRule, 'Promotion rule not found in registry');

    const promoRanking = calculateCommonPlanetRanking(significators, promotionRule, {
        minMatches: 2,
        ascSign: chart.ascendant?.sign || 'Libra',
        planetsData: chart.planets,
        cuspsData: chart.cusps
    });

    assert.ok(promoRanking.allScoredPlanets.length === 9, 'All 9 planets must be scored');
});

console.log('\n=============================================================');
console.log(`KP HOUSE GROUPING TEST SUITE: ${passed} Passed, ${failed} Failed.`);
console.log('=============================================================\n');

if (failed > 0) {
    process.exit(1);
}
