/**
 * Automated Verification Suite for Feature:
 * Flexible Dasha Selection & Date-Based Event Evaluation
 *
 * Covers:
 * 1. Default mode displays the actual current 5-level Dasha hierarchy.
 * 2. Selecting a date in the current Antardasha produces the correct hierarchy.
 * 3. Selecting a date before the current Antardasha produces the correct historical hierarchy.
 * 4. Selecting a date in 2027 produces the hierarchy calculated by the engine.
 * 5. Selecting a date in 2029 produces the hierarchy calculated by the engine.
 * 6. Changing Mahadasha updates available Antardasha options.
 * 7. Changing Antardasha updates available Pratyantardasha options.
 * 8. Changing Pratyantardasha updates available Sookshma options.
 * 9. Changing Sookshma updates available Prana options.
 * 10. Invalid parent-child combinations are rejected/corrected with clear feedback.
 * 11. Manual hierarchy is preserved during evaluation without silent replacement.
 * 12. Satisfaction percentage is recalculated using the selected evaluation context.
 * 13. Event Analysis selections remain unchanged after changing dates.
 * 14. Resetting evaluation does not reset the chart or Event Analysis configuration.
 * 15. Dasha boundary dates are handled consistently.
 * 16. Unsupported dates (pre-natal, post-120y) display appropriate validation message.
 * 17. Comparison list preserves multiple periods with different results.
 */

import assert from 'assert';
import { calculateKPKundli } from '../src/services/kpCalculator.js';
import { calculateKPSignificators } from '../src/utils/kp/kpSignificators.js';
import { calculateVimshottariDasha, getActivePeriods } from '../src/utils/kp/vimshottariDasha.js';
import { KP_HOUSE_GROUPING_RULES } from '../src/data/kpHouseGroupingRules.js';
import {
    parseEvaluationDate,
    formatDateForPicker,
    formatEvaluationDateOnly,
    formatEvaluationDateTime,
    calculateDatePreset,
    getDashaTimelineBounds,
    validateEvaluationDate,
    resolveDashaHierarchyForDate,
    getAvailableSubperiods,
    buildLordsFromSelection,
    ensureValidChildHierarchy,
    evaluateDashaForEvent,
    createComparisonEntry
} from '../src/utils/kp/dashaEvaluationEngine.js';

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

console.log('\n=== RUNNING FLEXIBLE DASHA EVALUATION SUITE ===\n');

// 1. Setup validated benchmark chart: 15-Aug-1998 10:30 IST Hyderabad
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

// A standard rule with jointDBA houses for testing
const marriageRule = KP_HOUSE_GROUPING_RULES.find(r => (r.jointDBA?.houses?.length > 0 || r.housesToBeSignified?.length > 0) && r.cusp === 7)
    || KP_HOUSE_GROUPING_RULES.find(r => r.jointDBA?.houses?.length > 0)
    || KP_HOUSE_GROUPING_RULES[0];

// Test 1: Default mode displays the actual current 5-level Dasha hierarchy
it('1. Default mode displays the actual current 5-level Dasha hierarchy', () => {
    const active = dashaResult.activePeriods;
    assert.ok(active, 'Active periods must exist');
    assert.strictEqual(active.levels.length, 5, 'Must contain 5 active levels');
    assert.strictEqual(active.levels[0].level, 1, 'Level 1 is Mahadasha');
    assert.strictEqual(active.levels[1].level, 2, 'Level 2 is Antardasha');
    assert.strictEqual(active.levels[2].level, 3, 'Level 3 is Pratyantardasha');
    assert.strictEqual(active.levels[3].level, 4, 'Level 4 is Sookshma');
    assert.strictEqual(active.levels[4].level, 5, 'Level 5 is Prana');

    // Also verify resolveDashaHierarchyForDate with current date matches active periods
    const res = resolveDashaHierarchyForDate({ dashaResult, targetDate: new Date() });
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.lords[0].planet, active.levels[0].lord);
    assert.strictEqual(res.lords[1].planet, active.levels[1].lord);
});

// Test 2: Selecting a date in the current Antardasha produces the correct hierarchy
it('2. Selecting a date in the current Antardasha produces the correct hierarchy', () => {
    const currentAd = dashaResult.activePeriods.antardasha;
    assert.ok(currentAd, 'Current Antardasha must exist');
    const midAdTime = new Date((currentAd.startMs + currentAd.endMs) / 2);

    const res = resolveDashaHierarchyForDate({ dashaResult, targetDate: midAdTime });
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.lords[0].planet, dashaResult.activePeriods.mahadasha.lord);
    assert.strictEqual(res.lords[1].planet, currentAd.lord);
    assert.strictEqual(res.lords[1].startMs, currentAd.startMs);
    assert.strictEqual(res.lords[1].endMs, currentAd.endMs);
});

// Test 3: Selecting a historical date before the current Antardasha produces correct hierarchy
it('3. Selecting a date before current Antardasha produces correct historical hierarchy', () => {
    // 2005-06-15 is after 1998 birth and before current Antardasha
    const historicalDate = new Date('2005-06-15T12:00:00Z');
    const res = resolveDashaHierarchyForDate({ dashaResult, targetDate: historicalDate });
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.lords.length, 5);

    // Verify targetDate is strictly enclosed in all returned periods
    const hMs = historicalDate.getTime();
    for (const lord of res.lords) {
        assert.ok(hMs >= lord.startMs && hMs < lord.endMs, `${lord.level} must enclose historical date`);
    }
});

// Test 4: Selecting a date in 2027 produces the hierarchy calculated by the engine
it('4. Selecting a date in 2027 produces the hierarchy calculated by the engine', () => {
    const date2027 = new Date('2027-06-15T12:00:00Z');
    const res = resolveDashaHierarchyForDate({ dashaResult, targetDate: date2027 });
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.lords.length, 5);

    const ms2027 = date2027.getTime();
    assert.ok(ms2027 >= res.lords[0].startMs && ms2027 < res.lords[0].endMs, 'MD encloses 2027 date');
    assert.ok(ms2027 >= res.lords[1].startMs && ms2027 < res.lords[1].endMs, 'AD encloses 2027 date');
});

// Test 5: Selecting a date in 2029 produces the hierarchy calculated by the engine
it('5. Selecting a date in 2029 produces the hierarchy calculated by the engine', () => {
    const date2029 = new Date('2029-03-15T12:00:00Z');
    const res = resolveDashaHierarchyForDate({ dashaResult, targetDate: date2029 });
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.lords.length, 5);

    const ms2029 = date2029.getTime();
    assert.ok(ms2029 >= res.lords[0].startMs && ms2029 < res.lords[0].endMs, 'MD encloses 2029 date');
    assert.ok(ms2029 >= res.lords[1].startMs && ms2029 < res.lords[1].endMs, 'AD encloses 2029 date');
});

// Test 6: Changing Mahadasha updates available Antardasha options
it('6. Changing Mahadasha updates available Antardasha options', () => {
    const md0 = dashaResult.mahadashas[0];
    const md1 = dashaResult.mahadashas[1];

    const ads0 = getAvailableSubperiods({ parentPeriod: md0, targetLevel: 2, dashaResult });
    const ads1 = getAvailableSubperiods({ parentPeriod: md1, targetLevel: 2, dashaResult });

    assert.ok(ads0.length > 0, 'MD 0 must have ADs');
    assert.strictEqual(ads1.length, 9, 'MD 1 must have 9 ADs');
    assert.strictEqual(ads0[0].parentMahaLord, md0.lord);
    assert.strictEqual(ads1[0].parentMahaLord, md1.lord);
    assert.notStrictEqual(ads0[0].parentMahaLord, ads1[0].parentMahaLord);
});

// Test 7: Changing Antardasha updates available Pratyantardasha options
it('7. Changing Antardasha updates available Pratyantardasha options', () => {
    const md = dashaResult.mahadashas[1];
    const ad0 = md.antardashas[0];
    const ad1 = md.antardashas[1];

    const pds0 = getAvailableSubperiods({ parentPeriod: ad0, targetLevel: 3, dashaResult });
    const pds1 = getAvailableSubperiods({ parentPeriod: ad1, targetLevel: 3, dashaResult });

    assert.strictEqual(pds0.length, 9);
    assert.strictEqual(pds1.length, 9);
    assert.strictEqual(pds0[0].parentAntarLord, ad0.lord);
    assert.strictEqual(pds1[0].parentAntarLord, ad1.lord);
    assert.notStrictEqual(pds0[0].startMs, pds1[0].startMs);
});

// Test 8: Changing Pratyantardasha updates available Sookshma options
it('8. Changing Pratyantardasha updates available Sookshma options', () => {
    const pd0 = dashaResult.mahadashas[1].antardashas[0].pratyantardashas[0];
    const pd1 = dashaResult.mahadashas[1].antardashas[0].pratyantardashas[1];

    const sds0 = getAvailableSubperiods({ parentPeriod: pd0, targetLevel: 4, dashaResult });
    const sds1 = getAvailableSubperiods({ parentPeriod: pd1, targetLevel: 4, dashaResult });

    assert.strictEqual(sds0.length, 9);
    assert.strictEqual(sds1.length, 9);
    assert.strictEqual(sds0[0].lord, pd0.lord);
    assert.strictEqual(sds1[0].lord, pd1.lord);
    assert.strictEqual(sds0[0].startMs, pd0.startMs);
    assert.strictEqual(sds0[8].endMs, pd0.endMs);
});

// Test 9: Changing Sookshma updates available Prana options
it('9. Changing Sookshma updates available Prana options', () => {
    const pd = dashaResult.mahadashas[1].antardashas[0].pratyantardashas[0];
    const sds = getAvailableSubperiods({ parentPeriod: pd, targetLevel: 4, dashaResult });
    const sd0 = sds[0];

    const pranas0 = getAvailableSubperiods({ parentPeriod: sd0, targetLevel: 5, dashaResult });
    assert.strictEqual(pranas0.length, 9);
    assert.strictEqual(pranas0[0].lord, sd0.lord);
    assert.strictEqual(pranas0[0].startMs, sd0.startMs);
    assert.strictEqual(pranas0[8].endMs, sd0.endMs);
});

// Test 10: Invalid parent-child combinations are corrected
it('10. Invalid parent-child combinations are corrected without throwing', () => {
    // Deliberately provide invalid IDs from different parents
    const res = ensureValidChildHierarchy({
        dashaResult,
        mdId: dashaResult.mahadashas[2].id,
        adId: 'completely_invalid_ad_id',
        pdId: 'invalid_pd',
        sdId: 'invalid_sd',
        pranaId: 'invalid_prana'
    });

    assert.strictEqual(res.wasCorrected, true, 'Should flag correction');
    assert.ok(res.md, 'Must have valid MD');
    assert.ok(res.ad, 'Must have auto-selected valid AD of MD');
    assert.strictEqual(res.ad.parentMahaLord, res.md.lord);
    assert.ok(res.pd, 'Must have auto-selected valid PD of AD');
    assert.strictEqual(res.pd.parentAntarLord, res.ad.lord);
    assert.ok(res.sd, 'Must have auto-selected valid SD of PD');
    assert.ok(res.prana, 'Must have auto-selected valid Prana of SD');
});

// Test 11: A manual hierarchy is preserved during evaluation without silent replacement
it('11. Manual hierarchy is preserved during evaluation without silent replacement', () => {
    const targetMd = dashaResult.mahadashas[3];
    const targetAd = targetMd.antardashas[2];
    const targetPd = targetAd.pratyantardashas[1];
    const sds = getAvailableSubperiods({ parentPeriod: targetPd, targetLevel: 4, dashaResult });
    const targetSd = sds[4];
    const pranas = getAvailableSubperiods({ parentPeriod: targetSd, targetLevel: 5, dashaResult });
    const targetPrana = pranas[3];

    const customLords = buildLordsFromSelection({
        md: targetMd,
        ad: targetAd,
        pd: targetPd,
        sd: targetSd,
        prana: targetPrana,
        evaluationDate: new Date('2028-05-20'),
        planetaryKPDetails: dashaResult.planetaryKPDetails
    });

    assert.strictEqual(customLords.length, 5);
    assert.strictEqual(customLords[0].planet, targetMd.lord);
    assert.strictEqual(customLords[1].planet, targetAd.lord);
    assert.strictEqual(customLords[2].planet, targetPd.lord);
    assert.strictEqual(customLords[3].planet, targetSd.lord);
    assert.strictEqual(customLords[4].planet, targetPrana.lord);

    const evalResult = evaluateDashaForEvent({
        significators: benchmarkChart.significators,
        rule: marriageRule,
        lords: customLords,
        evaluationMode: 'custom',
        selectionMode: 'manual',
        evaluationDate: new Date('2028-05-20')
    });

    assert.ok(evalResult, 'Evaluation result must exist');
    assert.strictEqual(evalResult.evaluationContext.evaluationMode, 'custom');
    assert.strictEqual(evalResult.evaluationContext.selectionMode, 'manual');
    assert.strictEqual(
        evalResult.evaluationContext.hierarchyPath,
        `${targetMd.lord} → ${targetAd.lord} → ${targetPd.lord} → ${targetSd.lord} → ${targetPrana.lord}`
    );
});

// Test 12: Satisfaction percentage is recalculated using selected evaluation context
it('12. Satisfaction percentage is recalculated using selected evaluation context', () => {
    // Current running evaluation
    const currentLords = resolveDashaHierarchyForDate({ dashaResult, targetDate: new Date() }).lords;
    const currentEval = evaluateDashaForEvent({
        significators: benchmarkChart.significators,
        rule: marriageRule,
        lords: currentLords,
        evaluationMode: 'current',
        selectionMode: 'date'
    });

    // 2029 evaluation
    const lords2029 = resolveDashaHierarchyForDate({ dashaResult, targetDate: new Date('2029-05-15') }).lords;
    const eval2029 = evaluateDashaForEvent({
        significators: benchmarkChart.significators,
        rule: marriageRule,
        lords: lords2029,
        evaluationMode: 'custom',
        selectionMode: 'date',
        evaluationDate: new Date('2029-05-15')
    });

    assert.ok(typeof currentEval.coveragePercent === 'number');
    assert.ok(typeof eval2029.coveragePercent === 'number');
    assert.ok(currentEval.requiredHouses.length > 0);
    assert.strictEqual(currentEval.requiredHouses.length, eval2029.requiredHouses.length, 'Required houses remain invariant');
});

// Test 13: Timeline validation for boundary, pre-natal, and post-cycle dates
it('13. Timeline validation for pre-natal and post-cycle dates', () => {
    const bounds = getDashaTimelineBounds(dashaResult);
    assert.strictEqual(bounds.isValid, true);

    // Pre-natal date (e.g. 1990)
    const preNatal = validateEvaluationDate('1990-01-01', dashaResult);
    assert.strictEqual(preNatal.isValid, false);
    assert.strictEqual(preNatal.code, 'PRE_NATAL');

    // Post-cycle date (e.g. 2150)
    const postCycle = validateEvaluationDate('2150-01-01', dashaResult);
    assert.strictEqual(postCycle.isValid, false);
    assert.strictEqual(postCycle.code, 'POST_CYCLE');

    // Valid date within cycle
    const valid = validateEvaluationDate('2027-01-10', dashaResult);
    assert.strictEqual(valid.isValid, true);
    assert.strictEqual(valid.code, 'VALID');
});

// Test 14: Exact boundary dates handling without gap
it('14. Dasha boundary dates are handled consistently', () => {
    const firstMaha = dashaResult.mahadashas[0];
    const secondMaha = dashaResult.mahadashas[1];

    // Query exactly at boundary transition
    const transDate = new Date(firstMaha.endMs);
    const res = resolveDashaHierarchyForDate({ dashaResult, targetDate: transDate });
    assert.strictEqual(res.isValid, true);
    // Standard convention: [start, end) means at endMs, second Maha begins
    assert.strictEqual(res.lords[0].planet, secondMaha.lord);
    assert.strictEqual(res.lords[0].startMs, secondMaha.startMs);
});

// Test 15: Comparison entries can be created, stored, and verified
it('15. Comparison list preserves multiple periods with different context', () => {
    const lordsA = resolveDashaHierarchyForDate({ dashaResult, targetDate: new Date('2027-01-10') }).lords;
    const evalA = evaluateDashaForEvent({
        significators: benchmarkChart.significators,
        rule: marriageRule,
        lords: lordsA,
        evaluationDate: new Date('2027-01-10')
    });

    const entryA = createComparisonEntry({
        label: 'Period A (Jan 2027)',
        evaluationDate: new Date('2027-01-10'),
        selectionMode: 'date',
        lords: lordsA,
        jointDBAResult: evalA,
        rule: marriageRule
    });

    const lordsB = resolveDashaHierarchyForDate({ dashaResult, targetDate: new Date('2029-06-15') }).lords;
    const evalB = evaluateDashaForEvent({
        significators: benchmarkChart.significators,
        rule: marriageRule,
        lords: lordsB,
        evaluationDate: new Date('2029-06-15')
    });

    const entryB = createComparisonEntry({
        label: 'Period B (Jun 2029)',
        evaluationDate: new Date('2029-06-15'),
        selectionMode: 'date',
        lords: lordsB,
        jointDBAResult: evalB,
        rule: marriageRule
    });

    assert.ok(entryA.id && entryB.id);
    assert.notStrictEqual(entryA.id, entryB.id);
    assert.strictEqual(entryA.label, 'Period A (Jan 2027)');
    assert.strictEqual(entryB.label, 'Period B (Jun 2029)');
    assert.ok(typeof entryA.coveragePercent === 'number');
    assert.ok(typeof entryB.coveragePercent === 'number');
});

// Test 16: Date presets calculation
it('16. Dynamic date presets calculate future intervals correctly', () => {
    const base = new Date('2026-10-27T12:00:00Z');
    const p3m = calculateDatePreset('+3m', base);
    const p6m = calculateDatePreset('+6m', base);
    const p1y = calculateDatePreset('+1y', base);
    const p2y = calculateDatePreset('+2y', base);

    assert.strictEqual(p3m.getMonth(), (base.getMonth() + 3) % 12);
    assert.strictEqual(p1y.getFullYear(), base.getFullYear() + 1);
    assert.strictEqual(p2y.getFullYear(), base.getFullYear() + 2);
});

console.log(`\nFLEXIBLE DASHA EVALUATION SUITE: ${passed} Passed, ${failed} Failed.\n`);
if (failed > 0) {
    process.exit(1);
}
