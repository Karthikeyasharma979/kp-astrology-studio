/**
 * Test Suite: Custom House Rules for KP Event Analysis
 *
 * Verifies Requirements 1 - 9:
 * 1. Create, name, edit, delete, and select custom house rules (any combination of 1-12)
 * 2. Persist with dedicated versioned key: `astrosharma_custom_house_rules_v1`
 * 3. 100% browser-local storage (no backend, no database)
 * 4. Load on initialization, persist across reloads
 * 5. Update localStorage on mutate, handle malformed JSON safely
 * 6. Integration with KP calculation logic (calculateCommonPlanetRanking & evaluateJointDBA)
 * 7. Browser-local notice in schema
 * 8. Export to JSON and validated Import
 */

import assert from 'assert';
import {
    CUSTOM_HOUSE_RULES_STORAGE_KEY,
    STORAGE_SCHEMA_VERSION,
    validateRuleInput,
    generateCustomRuleId,
    loadCustomHouseRules,
    saveCustomHouseRules,
    createCustomRule,
    updateCustomRule,
    deleteCustomRule,
    exportCustomRulesToJson,
    importCustomRulesFromJson,
    convertCustomRuleToKPRule
} from '../src/utils/customHouseRulesStorage.js';

import {
    calculateCommonPlanetRanking,
    evaluateJointDBA
} from '../src/utils/kp/kpHouseGroupingEngine.js';
import { calculateKPKundli, KP_AYANAMSHA_MODES } from '../src/services/kpCalculator.js';
import { calculateKPSignificators } from '../src/utils/kp/kpSignificators.js';

// Setup Mock Window & localStorage for Node test environment
class MockLocalStorage {
    constructor() {
        this.store = {};
    }
    getItem(key) {
        return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
    }
    setItem(key, value) {
        this.store[key] = String(value);
    }
    removeItem(key) {
        delete this.store[key];
    }
    clear() {
        this.store = {};
    }
}

const mockStorage = new MockLocalStorage();
global.window = {
    localStorage: mockStorage
};

let passedTests = 0;
function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  ✗ FAIL: ${name}`);
        console.error(err);
        process.exit(1);
    }
}

console.log('\n======================================================');
console.log('--- AstroSharma Custom House Rules Test Suite ---');
console.log('======================================================\n');

// 1. Validation Tests
console.log('1. Rule Input Validation:');
test('Rejects empty or whitespace-only rule names', () => {
    const res1 = validateRuleInput({ name: '', houses: [1, 2] });
    assert.strictEqual(res1.isValid, false);
    assert.ok(res1.errors.some(e => e.includes('Rule name is required')));

    const res2 = validateRuleInput({ name: '   ', houses: [1, 2] });
    assert.strictEqual(res2.isValid, false);
});

test('Rejects rule names exceeding max length', () => {
    const longName = 'A'.repeat(125);
    const res = validateRuleInput({ name: longName, houses: [3, 8] });
    assert.strictEqual(res.isValid, false);
    assert.ok(res.errors.some(e => e.includes('120 characters')));
});

test('Rejects empty house combinations', () => {
    const res = validateRuleInput({ name: 'Valid Name', houses: [] });
    assert.strictEqual(res.isValid, false);
    assert.ok(res.errors.some(e => e.includes('At least one valid house')));
});

test('Accepts and sanitizes valid combination (e.g. Houses 3, 8, 11)', () => {
    const res = validateRuleInput({
        name: '  My Custom Rule  ',
        houses: [11, 3, 8, 3], // Out of order with duplicate
        description: '  Personal test rule  '
    });
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.sanitized.name, 'My Custom Rule');
    assert.deepStrictEqual(res.sanitized.houses, [3, 8, 11]);
    assert.strictEqual(res.sanitized.description, 'Personal test rule');
});

test('Parses comma-separated house strings (e.g. "3, 8, 11")', () => {
    const res = validateRuleInput({
        name: 'String Input Rule',
        houses: '3, 8, 11, 99, 0' // 99 and 0 must be ignored
    });
    assert.strictEqual(res.isValid, true);
    assert.deepStrictEqual(res.sanitized.houses, [3, 8, 11]);
});

// 2. Storage CRUD Tests
console.log('\n2. LocalStorage CRUD Operations & Dedicated Key:');
test('Uses dedicated versioned key: astrosharma_custom_house_rules_v1', () => {
    assert.strictEqual(CUSTOM_HOUSE_RULES_STORAGE_KEY, 'astrosharma_custom_house_rules_v1');
    assert.strictEqual(STORAGE_SCHEMA_VERSION, 1);
});

test('Loads empty array when storage is empty', () => {
    mockStorage.clear();
    const rules = loadCustomHouseRules();
    assert.deepStrictEqual(rules, []);
});

test('Creates a new custom rule and saves under versioned envelope', () => {
    mockStorage.clear();
    const result = createCustomRule({
        name: 'My Custom Rule',
        houses: [3, 8, 11],
        description: 'Houses 3, 8, and 11 research'
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.rule.id.startsWith('custom_rule_'));
    assert.strictEqual(result.rule.name, 'My Custom Rule');
    assert.deepStrictEqual(result.rule.houses, [3, 8, 11]);

    // Inspect raw localStorage item
    const raw = mockStorage.getItem(CUSTOM_HOUSE_RULES_STORAGE_KEY);
    assert.ok(raw);
    const parsed = JSON.parse(raw);
    assert.strictEqual(parsed.version, 1);
    assert.strictEqual(parsed.format, 'astrosharma_custom_house_rules');
    assert.strictEqual(parsed.rules.length, 1);
    assert.strictEqual(parsed.rules[0].name, 'My Custom Rule');
});

test('Persists across simulated page reload (reading saved state)', () => {
    // Read again from mockStorage
    const loaded = loadCustomHouseRules();
    assert.strictEqual(loaded.length, 1);
    assert.strictEqual(loaded[0].name, 'My Custom Rule');
    assert.deepStrictEqual(loaded[0].houses, [3, 8, 11]);
});

test('Edits an existing custom rule and updates storage', () => {
    const current = loadCustomHouseRules();
    const ruleId = current[0].id;

    const updateRes = updateCustomRule(ruleId, {
        name: 'My Custom Rule (Updated)',
        houses: [2, 7, 11],
        description: 'Switched to 2, 7, 11'
    });

    assert.strictEqual(updateRes.success, true);
    assert.strictEqual(updateRes.rule.name, 'My Custom Rule (Updated)');
    assert.deepStrictEqual(updateRes.rule.houses, [2, 7, 11]);

    const reloaded = loadCustomHouseRules();
    assert.strictEqual(reloaded[0].name, 'My Custom Rule (Updated)');
    assert.deepStrictEqual(reloaded[0].houses, [2, 7, 11]);
});

test('Deletes a custom rule and updates storage', () => {
    const current = loadCustomHouseRules();
    const ruleId = current[0].id;

    const delRes = deleteCustomRule(ruleId);
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(delRes.allRules.length, 0);

    const reloaded = loadCustomHouseRules();
    assert.strictEqual(reloaded.length, 0);
});

// 3. Resilience and Malformed JSON Handling
console.log('\n3. Storage Resilience & Error Handling:');
test('Gracefully handles malformed JSON in localStorage', () => {
    mockStorage.setItem(CUSTOM_HOUSE_RULES_STORAGE_KEY, '{ invalid JSON : 123 ]');
    const rules = loadCustomHouseRules();
    assert.deepStrictEqual(rules, []);
});

test('Gracefully handles unexpected JSON types in localStorage', () => {
    mockStorage.setItem(CUSTOM_HOUSE_RULES_STORAGE_KEY, JSON.stringify("plain string"));
    assert.deepStrictEqual(loadCustomHouseRules(), []);

    mockStorage.setItem(CUSTOM_HOUSE_RULES_STORAGE_KEY, JSON.stringify({ unexpectedKey: 42 }));
    assert.deepStrictEqual(loadCustomHouseRules(), []);
});

test('Filters out corrupted items inside valid rules envelope', () => {
    const corruptedPayload = {
        version: 1,
        rules: [
            { id: 'c1', name: 'Valid Rule', houses: [1, 5, 9] },
            { id: 'c2', name: '', houses: [2] }, // Invalid: empty name
            { id: 'c3', name: 'Bad Houses', houses: [99, -1] }, // Invalid: out of bounds
            null,
            42
        ]
    };
    mockStorage.setItem(CUSTOM_HOUSE_RULES_STORAGE_KEY, JSON.stringify(corruptedPayload));

    const sanitized = loadCustomHouseRules();
    assert.strictEqual(sanitized.length, 1);
    assert.strictEqual(sanitized[0].name, 'Valid Rule');
    assert.deepStrictEqual(sanitized[0].houses, [1, 5, 9]);
});

// 4. Export and Import Tests
console.log('\n4. JSON Export & Import:');
test('Exports rules as formatted JSON with envelope metadata', () => {
    const sampleRules = [
        { id: 'rule_1', name: 'Rule Alpha', houses: [3, 8, 11], description: 'Alpha test' },
        { id: 'rule_2', name: 'Rule Beta', houses: [2, 10, 11], description: 'Beta test' }
    ];
    saveCustomHouseRules(sampleRules);

    const jsonStr = exportCustomRulesToJson();
    assert.ok(jsonStr);
    const parsed = JSON.parse(jsonStr);
    assert.strictEqual(parsed.format, 'astrosharma_custom_house_rules');
    assert.strictEqual(parsed.version, 1);
    assert.strictEqual(parsed.totalRules, 2);
    assert.strictEqual(parsed.rules.length, 2);
});

test('Validates and imports valid JSON rules', () => {
    const importPayload = {
        format: 'astrosharma_custom_house_rules',
        version: 1,
        rules: [
            { name: 'Imported Rule 1', houses: [4, 8, 12], description: 'Moksha combination' },
            { name: 'Imported Rule 2', houses: [1, 2, 3, 4], description: 'Beginner houses' }
        ]
    };

    mockStorage.clear();
    const result = importCustomRulesFromJson(JSON.stringify(importPayload));
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.importedCount, 2);

    const loaded = loadCustomHouseRules();
    assert.strictEqual(loaded.length, 2);
    assert.strictEqual(loaded[0].name, 'Imported Rule 1');
    assert.deepStrictEqual(loaded[0].houses, [4, 8, 12]);
});

test('Rejects invalid JSON during import', () => {
    const result = importCustomRulesFromJson('this is not json');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.importedCount, 0);
    assert.ok(result.errors.length > 0);
});

// 5. KP Engine Integration Tests
console.log('\n5. Integration with KP Calculation Engines:');
test('Converts custom rule into full KP Rule structure', () => {
    const custom = {
        id: 'custom_rule_123',
        name: 'My Custom Rule',
        houses: [3, 8, 11],
        description: 'Test note'
    };

    const kpRule = convertCustomRuleToKPRule(custom, false);
    assert.strictEqual(kpRule.id, 'custom_rule_123');
    assert.strictEqual(kpRule.isCustom, true);
    assert.strictEqual(kpRule.event, 'My Custom Rule');
    assert.strictEqual(kpRule.cusp, 3);
    assert.deepStrictEqual(kpRule.housesToBeSignified, [3, 8, 11]);
    assert.deepStrictEqual(kpRule.jointDBA.houses, [3, 8, 11]);
    assert.strictEqual(kpRule.verificationStatus, 'custom');
});

test('Mode A Common-Planet Ranking executes accurately with custom rule [3, 8, 11]', () => {
    const chart = calculateKPKundli({
        birthDate: '1998-08-15',
        birthTime: '10:30',
        lat: 17.3850,
        lon: 78.4867,
        timezone: 'Asia/Kolkata',
        ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW,
        nodeMode: 'mean'
    });
    const significators = calculateKPSignificators(chart.planets, chart.cusps);

    const custom = {
        id: 'custom_3_8_11',
        name: 'Custom 3, 8, 11',
        houses: [3, 8, 11]
    };
    const kpRule = convertCustomRuleToKPRule(custom, false);

    const ranking = calculateCommonPlanetRanking(significators, kpRule, {
        minMatches: 2,
        ascSign: 7
    });

    assert.ok(ranking);
    assert.deepStrictEqual(ranking.targetHouses, [3, 8, 11]);
    assert.ok(Array.isArray(ranking.rankedPlanets));
    assert.ok(Array.isArray(ranking.excludedPlanets));
    assert.strictEqual(ranking.targetHouses.length, 3);

    // Verify all ranked planets have distinct matched houses from [3, 8, 11]
    for (const p of ranking.rankedPlanets) {
        assert.ok(p.score >= 2);
        for (const h of p.matchedHouses) {
            assert.ok([3, 8, 11].includes(h));
        }
    }
});

test('Mode B Joint DBA evaluation executes accurately with custom rule [3, 8, 11]', () => {
    const chart = calculateKPKundli({
        birthDate: '1998-08-15',
        birthTime: '10:30',
        lat: 17.3850,
        lon: 78.4867,
        timezone: 'Asia/Kolkata',
        ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW,
        nodeMode: 'mean'
    });
    const significators = calculateKPSignificators(chart.planets, chart.cusps);

    const custom = {
        id: 'custom_3_8_11',
        name: 'Custom 3, 8, 11',
        houses: [3, 8, 11]
    };
    const kpRule = convertCustomRuleToKPRule(custom, false);

    // Mock active 5-level lords
    const runningLords = [
        { level: 'MD', planet: 'Jupiter', lord: 'Jupiter' },
        { level: 'AD', planet: 'Saturn', lord: 'Saturn' },
        { level: 'PD', planet: 'Mercury', lord: 'Mercury' },
        { level: 'SD', planet: 'Venus', lord: 'Venus' },
        { level: 'PRANA', planet: 'Sun', lord: 'Sun' }
    ];

    const dbaResult = evaluateJointDBA(significators, kpRule, runningLords, { ascSign: 7 });
    assert.ok(dbaResult);
    assert.deepStrictEqual(dbaResult.requiredHouses, [3, 8, 11]);
    assert.ok(['satisfied', 'partially-satisfied', 'not-satisfied', 'afflicted'].includes(dbaResult.status));
    assert.strictEqual(typeof dbaResult.coveragePercent, 'number');
    assert.ok(dbaResult.coveragePercent >= 0 && dbaResult.coveragePercent <= 100);
    assert.strictEqual(typeof dbaResult.matchedCount, 'number');
});

console.log(`\n======================================================`);
console.log(`Summary: All ${passedTests} Tests Passed Successfully!`);
console.log(`======================================================\n`);
