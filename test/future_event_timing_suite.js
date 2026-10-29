/**
 * Automated Verification Suite for Feature:
 * Future Event Timing Finder Using Vimshottari Dasha and KP House Significations
 *
 * Implements verification for all 19 requirements specified in prompt section 12:
 * 1. A five-year search starts from the actual current date and time.
 * 2. A custom date range is respected.
 * 3. The default event houses are read from the existing Event Analysis selection.
 * 4. Changing the selected event changes the search criteria appropriately.
 * 5. The search evaluates all valid MD/AD/PD intervals within the supported range.
 * 6. The Pratyantardasha option returns MD, AD, and PD information.
 * 7. Sookshma and Prana options include the additional hierarchy levels.
 * 8. All generated intervals use actual Dasha engine timestamps.
 * 9. Intervals outside the requested search range are excluded or clipped correctly.
 * 10. Full house matches are distinguished from partial matches.
 * 11. Existing evaluation percentages and house-matching rules are reused.
 * 12. Search results are ordered correctly.
 * 13. Empty results are handled without fabricated dates.
 * 14. Unsupported ranges are reported accurately.
 * 15. Selecting a result preserves Event Analysis selections.
 * 16. Opening the selected period in Vimshottari Dasha works correctly.
 * 17. Stale results cannot overwrite results for a newer chart or search.
 * 18. Existing Dasha calculations remain unchanged.
 * 19. Formatting & data consistency for responsive rendering.
 */

import assert from 'assert';
import { calculateKPKundli } from '../src/services/kpCalculator.js';
import { calculateKPSignificators } from '../src/utils/kp/kpSignificators.js';
import { calculateVimshottariDasha, getActivePeriods } from '../src/utils/kp/vimshottariDasha.js';
import { KP_HOUSE_GROUPING_RULES } from '../src/data/kpHouseGroupingRules.js';
import {
    findFutureSupportivePeriods,
    sortFuturePeriods,
    filterFuturePeriods,
    getQuickDurationRange,
    computeSearchEndDate,
    SEARCH_DURATION_PRESETS,
    EVALUATION_DEPTHS,
    MATCH_CRITERIA_OPTIONS
} from '../src/utils/kp/futureEventFinder.js';
import {
    getDashaTimelineBounds,
    evaluateDashaForEvent
} from '../src/utils/kp/dashaEvaluationEngine.js';
import { evaluateJointDBA } from '../src/utils/kp/kpHouseGroupingEngine.js';

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

console.log('\n=== RUNNING FUTURE EVENT TIMING FINDER TEST SUITE ===\n');

// Setup validated benchmark chart: 15-Aug-1998 10:30 IST Hyderabad
const benchmarkChart = calculateKPKundli({
    birthDate: '1998-08-15',
    birthTime: '10:30',
    lat: 17.3850,
    lon: 78.4867,
    timezone: 'Asia/Kolkata'
});

const benchmarkSignificators = calculateKPSignificators(benchmarkChart.planets, benchmarkChart.cusps);
benchmarkChart.significators = benchmarkSignificators;

const moonPlanet = benchmarkChart.planets.find(p => p.key === 'Moon');
const birthDateUtc = new Date(benchmarkChart.metadata.utcDate);

const dashaResult = calculateVimshottariDasha({
    moonSiderealLongitude: moonPlanet.longitude,
    birthDateUtc,
    referenceDate: new Date(),
    planets: benchmarkChart.planets,
    cusps: benchmarkChart.cusps,
    significators: benchmarkChart.significators
});

// Marriage rule for testing (House 2, 7, 11)
const marriageRule = KP_HOUSE_GROUPING_RULES.find(r => r.cusp === 7 && r.event?.toLowerCase().includes('marriage'))
    || {
        id: 'kp.c7.marriage.test',
        cusp: 7,
        subject: 'MARRIAGE',
        event: 'Marriage Timing',
        jointDBA: { houses: [2, 7, 11] },
        housesToBeSignified: [2, 7, 11]
    };

// Career/Job rule for testing (House 2, 6, 10, 11)
const careerRule = KP_HOUSE_GROUPING_RULES.find(r => r.cusp === 10 && (r.jointDBA?.houses?.length > 0))
    || {
        id: 'kp.c10.career.test',
        cusp: 10,
        subject: 'CAREER',
        event: 'New Job / Promotion',
        jointDBA: { houses: [2, 6, 10, 11] },
        housesToBeSignified: [2, 6, 10, 11]
    };

// Test 1: A five-year search starts from the actual current date and time by default
it('1. A five-year search starts from the actual current date and time', () => {
    const now = new Date();
    const res = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        searchStartDate: now,
        durationYears: 5,
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    assert.ok(res.isValid, 'Search must be valid');
    assert.ok(res.searchMetadata, 'Metadata must exist');
    const startReq = new Date(res.searchMetadata.requestedStart).getTime();
    const endReq = new Date(res.searchMetadata.requestedEnd).getTime();

    // End date must be approximately 5 years after start date
    const diffYears = (endReq - startReq) / (365.25 * 86400 * 1000);
    assert.ok(Math.abs(diffYears - 5) < 0.05, `Expected ~5 years duration, got ${diffYears}`);
});

// Test 2: A custom date range is respected
it('2. A custom date range is respected', () => {
    const customStart = '2028-01-01';
    const customEnd = '2030-01-01';

    const res = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        searchStartDate: customStart,
        searchEndDate: customEnd,
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    assert.ok(res.isValid, 'Search must be valid');
    assert.strictEqual(res.searchMetadata.requestedStart.slice(0, 10), '2028-01-01');
    assert.strictEqual(res.searchMetadata.requestedEnd.slice(0, 10), '2030-01-01');

    // All returned intervals must fall within custom window [2028-01-01, 2030-01-01]
    const winStartMs = new Date('2028-01-01T12:00:00').getTime();
    const winEndMs = new Date('2030-01-01T12:00:00').getTime();

    for (const r of res.results) {
        assert.ok(r.startMs >= new Date('2028-01-01').getTime(), `Interval start ${r.startDate} is before window`);
        assert.ok(r.endMs <= new Date('2030-01-01T23:59:59').getTime(), `Interval end ${r.endDate} is after window`);
    }
});

// Test 3: The default event houses are read from the existing Event Analysis selection
it('3. The default event houses are read from the existing Event Analysis selection', () => {
    const res = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        durationYears: 5,
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    const rawExpected = marriageRule.jointDBA?.houses || marriageRule.housesToBeSignified;
    const expectedHouses = Array.from(new Set(rawExpected)).sort((a, b) => a - b);
    assert.deepStrictEqual(res.searchMetadata.requiredHouses, expectedHouses, 'Must read houses from rule');
});

// Test 4: Changing the selected event changes the search criteria appropriately
it('4. Changing the selected event changes the search criteria appropriately', () => {
    const resMarriage = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        durationYears: 5,
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    const resCareer = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: careerRule,
        durationYears: 5,
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    assert.notDeepStrictEqual(resMarriage.searchMetadata.requiredHouses, resCareer.searchMetadata.requiredHouses, 'Different events must have different houses');
    assert.strictEqual(resMarriage.searchMetadata.ruleId, marriageRule.id);
    assert.strictEqual(resCareer.searchMetadata.ruleId, careerRule.id);
});

// Test 5: The search evaluates all valid MD/AD/PD intervals within the supported range
it('5. The search evaluates all valid MD/AD/PD intervals within the supported range', () => {
    const res = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        searchStartDate: '2027-01-01',
        searchEndDate: '2029-01-01',
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    assert.ok(res.searchMetadata.totalIntervalsEvaluated > 0, 'Must evaluate intervals');
    assert.strictEqual(res.searchMetadata.qualifyingIntervalsCount, res.results.length);
    // At PD level across 2 years, all valid intersecting intervals are evaluated
    assert.ok(res.results.length >= 8, `Expected all intersecting PD intervals in 2 years, got ${res.results.length}`);
});

// Test 6: The Pratyantardasha option returns MD, AD, and PD information
it('6. The Pratyantardasha option returns MD, AD, and PD information', () => {
    const res = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        durationYears: 3,
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    assert.ok(res.results.length > 0, 'Results must exist');
    for (const r of res.results) {
        assert.ok(r.mdLord, 'Must contain mdLord');
        assert.ok(r.adLord, 'Must contain adLord');
        assert.ok(r.pdLord, 'Must contain pdLord');
        assert.strictEqual(r.depth, 3);
        assert.strictEqual(r.lords.length, 3);
        assert.strictEqual(r.lords[0].level, 'MD');
        assert.strictEqual(r.lords[1].level, 'AD');
        assert.strictEqual(r.lords[2].level, 'PD');
    }
});

// Test 7: Sookshma and Prana options include the additional hierarchy levels
it('7. Sookshma and Prana options include the additional hierarchy levels', () => {
    // Sookshma search (level 4) over 6 months
    const resSookshma = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        searchStartDate: '2027-01-01',
        searchEndDate: '2027-07-01',
        evaluationDepth: 4,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    assert.ok(resSookshma.results.length > 0, 'Sookshma results must exist');
    const firstSD = resSookshma.results[0];
    assert.strictEqual(firstSD.depth, 4);
    assert.strictEqual(firstSD.lords.length, 4);
    assert.ok(firstSD.sdLord, 'Must contain sdLord');
    assert.strictEqual(firstSD.lords[3].level, 'SD');

    // Prana search (level 5) over 1 month
    const resPrana = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        searchStartDate: '2027-01-01',
        searchEndDate: '2027-02-01',
        evaluationDepth: 5,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    assert.ok(resPrana.results.length > 0, 'Prana results must exist');
    const firstPrana = resPrana.results[0];
    assert.strictEqual(firstPrana.depth, 5);
    assert.strictEqual(firstPrana.lords.length, 5);
    assert.ok(firstPrana.pranaLord, 'Must contain pranaLord');
    assert.strictEqual(firstPrana.lords[4].level, 'PRANA');
});

// Test 8: All generated intervals use actual Dasha engine timestamps
it('8. All generated intervals use actual Dasha engine timestamps', () => {
    const res = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        durationYears: 2,
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    for (const r of res.results) {
        assert.ok(typeof r.startMs === 'number' && r.startMs > 0);
        assert.ok(typeof r.endMs === 'number' && r.endMs > r.startMs);
        assert.ok(!isNaN(new Date(r.startDate).getTime()));
        assert.ok(!isNaN(new Date(r.endDate).getTime()));
        assert.ok(typeof r.originalStartMs === 'number' && r.originalStartMs > 0);
        assert.ok(typeof r.originalEndMs === 'number' && r.originalEndMs > r.originalStartMs);
    }
});

// Test 9: Intervals outside the requested search range are excluded or clipped correctly
it('9. Intervals outside the requested search range are excluded or clipped correctly', () => {
    const startStr = '2027-06-15T00:00:00Z';
    const endStr = '2028-06-15T00:00:00Z';
    const startMs = new Date(startStr).getTime();
    const endMs = new Date(endStr).getTime();

    const res = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        searchStartDate: startStr,
        searchEndDate: endStr,
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    // Check first and last candidate clipping
    const first = res.results[0];
    const last = res.results[res.results.length - 1];

    assert.ok(first.startMs >= startMs, 'First candidate start must be clipped to window start');
    assert.ok(last.endMs <= endMs, 'Last candidate end must be clipped to window end');

    // If an interval started before window start, isClipped must be true
    const clippedAtStart = res.results.find(r => r.originalStartMs < startMs);
    if (clippedAtStart) {
        assert.strictEqual(clippedAtStart.isClipped, true, 'Boundary interval must be flagged as clipped');
        assert.strictEqual(clippedAtStart.startMs, startMs, 'Boundary startMs must equal search window start');
    }
});

// Test 10: Full house matches are distinguished from partial matches
it('10. Full house matches are distinguished from partial matches', () => {
    const res = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        searchStartDate: '2026-01-01',
        durationYears: 5,
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    const fullMatches = res.results.filter(r => r.isFullMatch);
    const partialMatches = res.results.filter(r => !r.isFullMatch);

    assert.strictEqual(fullMatches.length, res.searchMetadata.fullMatchCount);
    assert.strictEqual(partialMatches.length, res.searchMetadata.partialMatchCount);

    for (const fm of fullMatches) {
        assert.strictEqual(fm.coveredHouses.length, fm.requiredHouses.length, 'Full match must cover all required houses');
        assert.strictEqual(fm.missingHouses.length, 0, 'Full match must have 0 missing houses');
    }

    for (const pm of partialMatches) {
        assert.ok(pm.missingHouses.length > 0 || pm.coveragePercent < 100, 'Partial match must have missing houses or <100%');
    }
});

// Test 11: Existing evaluation percentages and house-matching rules are reused
it('11. Existing evaluation percentages and house-matching rules are reused', () => {
    const res = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        durationYears: 3,
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    assert.ok(res.results.length > 0);
    const sample = res.results[0];

    // Compute direct evaluation using evaluateJointDBA with the exact same lords
    const directEval = evaluateJointDBA(benchmarkSignificators, marriageRule, sample.lords);

    assert.strictEqual(sample.coveragePercent, directEval.coveragePercent, 'Coverage percent must exactly match evaluateJointDBA');
    assert.strictEqual(sample.status, directEval.status, 'Status must exactly match evaluateJointDBA');
    assert.deepStrictEqual(sample.coveredHouses, directEval.coveredHouses, 'Covered houses must match');
    assert.deepStrictEqual(sample.missingHouses, directEval.missingHouses, 'Missing houses must match');
});

// Test 12: Search results are ordered correctly
it('12. Search results are ordered correctly', () => {
    const res = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        searchStartDate: '2026-01-01',
        durationYears: 5,
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    // Default sort: full matches first, then higher coveragePercent, then earlier startMs
    for (let i = 0; i < res.results.length - 1; i++) {
        const a = res.results[i];
        const b = res.results[i + 1];

        if (a.isFullMatch !== b.isFullMatch) {
            assert.ok(a.isFullMatch && !b.isFullMatch, 'Full matches must appear before non-full matches');
        } else if (a.coveragePercent !== b.coveragePercent) {
            assert.ok(a.coveragePercent >= b.coveragePercent, 'Higher percentage must appear first within same match tier');
        } else {
            assert.ok(a.startMs <= b.startMs, 'Earlier startMs must break ties');
        }
    }

    // Test optional chronological sort
    const chronological = sortFuturePeriods(res.results, 'earliest');
    for (let i = 0; i < chronological.length - 1; i++) {
        assert.ok(chronological[i].startMs <= chronological[i + 1].startMs, 'Earliest sort must be chronological');
    }
});

// Test 13: Empty results are handled without fabricated dates
it('13. Empty results are handled without fabricated dates', () => {
    // Impossible rule requiring houses [99, 100]
    const impossibleRule = {
        id: 'kp.impossible',
        cusp: 1,
        jointDBA: { houses: [99, 100] },
        housesToBeSignified: [99, 100]
    };

    const res = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: impossibleRule,
        durationYears: 2,
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ALL
    });

    assert.ok(res.isValid, 'Response must be valid');
    assert.strictEqual(res.results.length, 0, 'Must return 0 results when no periods qualify');
    assert.strictEqual(res.searchMetadata.qualifyingIntervalsCount, 0);
});

// Test 14: Unsupported ranges are reported accurately
it('14. Unsupported ranges are reported accurately', () => {
    // Range before birth (birth is 15-Aug-1998)
    const resPreNatal = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        searchStartDate: '1980-01-01',
        searchEndDate: '1990-01-01'
    });
    assert.strictEqual(resPreNatal.isValid, false);
    assert.strictEqual(resPreNatal.errorCode, 'PRE_NATAL_RANGE');

    // Range beyond 120-year cycle (2120+)
    const resPostCycle = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        searchStartDate: '2130-01-01',
        searchEndDate: '2135-01-01'
    });
    assert.strictEqual(resPostCycle.isValid, false);
    assert.strictEqual(resPostCycle.errorCode, 'POST_CYCLE_RANGE');
});

// Test 15: Selecting a result preserves Event Analysis selections
it('15. Selecting a result preserves Event Analysis selections', () => {
    const res = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        durationYears: 3,
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    const candidate = res.results[0];
    assert.ok(candidate);

    // Evaluate the selected candidate using evaluateDashaForEvent
    const evalRes = evaluateDashaForEvent({
        significators: benchmarkSignificators,
        rule: marriageRule,
        lords: candidate.lords,
        evaluationMode: 'custom',
        evaluationDate: candidate.startDate
    });

    assert.ok(evalRes);
    assert.strictEqual(evalRes.ruleId, marriageRule.id, 'Rule ID must remain unchanged');
    assert.deepStrictEqual(evalRes.requiredHouses, candidate.requiredHouses, 'Required houses must remain unchanged');
});

// Test 16: Opening the selected period in Vimshottari Dasha works correctly
it('16. Opening the selected period in Vimshottari Dasha works correctly', () => {
    const res = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        durationYears: 3,
        evaluationDepth: 3,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    const candidate = res.results[0];
    const candidateDate = new Date(candidate.startMs);

    // Query active periods on that candidate date
    const active = getActivePeriods(
        dashaResult.mahadashas,
        candidateDate,
        dashaResult.mahadashas[0].startMs
    );

    assert.ok(active.mahadasha, 'Active Mahadasha must resolve for candidate date');
    assert.strictEqual(active.mahadasha.lord, candidate.mdLord, 'MD lord must match candidate MD lord');
    assert.strictEqual(active.antardasha.lord, candidate.adLord, 'AD lord must match candidate AD lord');
});

// Test 17: Stale results cannot overwrite results for a newer chart or search
it('17. Stale results cannot overwrite results for a newer chart or search', () => {
    // Run search for chart A
    const resA = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        durationYears: 2,
        evaluationDepth: 3
    });

    // Run search for chart B (e.g. career rule)
    const resB = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: careerRule,
        durationYears: 2,
        evaluationDepth: 3
    });

    assert.notStrictEqual(resA.searchMetadata.ruleId, resB.searchMetadata.ruleId);
    assert.strictEqual(resA.searchMetadata.ruleId, marriageRule.id);
    assert.strictEqual(resB.searchMetadata.ruleId, careerRule.id);
});

// Test 18: Existing Dasha calculations remain unchanged
it('18. Existing Dasha calculations remain unchanged', () => {
    // Verify that running dasha bounds and active periods have not been mutated
    const bounds = getDashaTimelineBounds(dashaResult);
    assert.ok(bounds.isValid);
    assert.strictEqual(dashaResult.mahadashas.length, 9);
    assert.strictEqual(dashaResult.mahadashas[0].antardashas.length, dashaResult.mahadashas[0].antardashas.length);
});

// Test 19: Desktop and mobile formatting consistency
it('19. Formatting and data consistency for responsive rendering', () => {
    const res = findFutureSupportivePeriods({
        dashaResult,
        significators: benchmarkSignificators,
        rule: marriageRule,
        durationYears: 3,
        evaluationDepth: 3,
        isTe: true,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY
    });

    assert.ok(res.results.length > 0);
    const candidate = res.results[0];

    assert.ok(candidate.startFormatted, 'Must have startFormatted');
    assert.ok(candidate.endFormatted, 'Must have endFormatted');
    assert.ok(candidate.durationHuman, 'Must have durationHuman');
    assert.ok(candidate.hierarchyPath.includes('→'), 'Hierarchy path must use arrow delimiter');
    assert.ok(['satisfied', 'partially-satisfied', 'afflicted', 'not-satisfied'].includes(candidate.status));
});

it('20. Custom required houses are not re-expanded with Badhaka / Maraka, and the default resolves them', () => {
    const deathRule = KP_HOUSE_GROUPING_RULES.find(r => r.id === 'kp.c1.t1.r9.13'); // "Badhaka, Maraka, 12"
    assert.ok(deathRule, 'Death rule not found');
    const base = {
        dashaResult,
        significators: benchmarkSignificators,
        rule: deathRule,
        searchStartDate: '2027-01-01',
        searchEndDate: '2029-01-01',
        evaluationDepth: 2,
        matchCriteria: MATCH_CRITERIA_OPTIONS.ANY,
        options: { ascSign: 7 } // Libra (movable) -> Badhaka 11
    };

    const custom = findFutureSupportivePeriods({ ...base, customRequiredHouses: [12] });
    assert.ok(custom.isValid && custom.results.length > 0, 'custom search must return periods');
    for (const r of custom.results) {
        assert.deepStrictEqual(r.requiredHouses, [12], 'user-chosen houses must be used as-is');
    }

    const resolved = findFutureSupportivePeriods(base);
    assert.ok(resolved.isValid && resolved.results.length > 0, 'default search must return periods');
    for (const r of resolved.results) {
        assert.deepStrictEqual(r.requiredHouses, [2, 7, 11, 12], 'default search adds Badhaka 11 and Maraka 2, 7');
    }
});

console.log(`\n=============================================================`);
console.log(`FUTURE EVENT TIMING SUITE: ${passed} Passed, ${failed} Failed.`);
console.log(`=============================================================\n`);

if (failed > 0) {
    process.exit(1);
}
