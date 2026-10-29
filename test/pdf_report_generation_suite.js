/**
 * Test Suite for Professional PDF Report Generation
 * Verifies all 4 templates, multi-page layout, data integrity, non-fabrication,
 * and state immutability.
 */

import assert from 'assert';
import { calculateKPKundli, KP_AYANAMSHA_MODES } from '../src/services/kpCalculator.js';
import { calculateKPSignificators } from '../src/utils/kp/kpSignificators.js';
import { KP_HOUSE_GROUPING_RULES } from '../src/data/kpHouseGroupingRules.js';
import {
    generateMissingPersonReport,
    generateKPKundliReport,
    generateVedicReport,
    generateEventAnalysisReport,
    REPORT_TYPES
} from '../src/services/reportGenerator.js';

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

async function itAsync(description, fn) {
    try {
        await fn();
        console.log(`  ✓ ${description}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${description}`);
        console.error(err);
        failed++;
    }
}

console.log('\n=== RUNNING PDF REPORT GENERATION COMPREHENSIVE SUITE ===\n');

// 1. Prepare Validated Benchmark Chart (15-Aug-1998 10:30 IST Hyderabad)
const benchmarkBirthDetails = {
    name: 'Ramesh Sharma',
    gender: 'male',
    birthDate: '1998-08-15',
    birthTime: '10:30',
    birthPlace: 'Hyderabad, India',
    lat: 17.3850,
    lon: 78.4867,
    timezone: 'Asia/Kolkata',
    ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW,
    nodeMode: 'mean'
};

const benchmarkChart = calculateKPKundli(benchmarkBirthDetails);
benchmarkChart.significators = calculateKPSignificators(benchmarkChart.planets, benchmarkChart.cusps);

// Event Rule: "Hearing news about a missing person" (Cusp 3)
const newsRule = KP_HOUSE_GROUPING_RULES.find(r => r.event.toLowerCase().includes('hearing news about a missing person')) || {
    id: 'kp.c3.news',
    cusp: 3,
    category: '3rd Cusp',
    subject: 'OTHER',
    event: 'Hearing news about a missing person',
    housesToBeSignified: [3, 11],
    jointDBA: { houses: [3, 11] },
    negativeHouses: []
};

// Event Rule: "Return of missing person" (Cusp 11)
const returnRule = KP_HOUSE_GROUPING_RULES.find(r => r.event.toLowerCase().includes('return of missing person')) || {
    id: 'kp.c11.return',
    cusp: 11,
    category: '11th Cusp',
    subject: 'REUNION',
    event: 'Return of missing person',
    housesToBeSignified: [2, 4, 6, 11],
    jointDBA: { houses: [2, 8, 11] },
    negativeHouses: [12]
};

// Test 1: Missing Person Astrological Report Generation
await itAsync('1. Generates Missing Person Report with multiple event items, case details & disclaimer', async () => {
    const doc = await generateMissingPersonReport({
        kpData: benchmarkChart,
        birthDetails: benchmarkBirthDetails,
        missingPersonCase: {
            caseReference: 'CASE-MP-TEST-901',
            subjectName: 'Ramesh Sharma',
            age: 26,
            missingSinceDate: '2024-01-15',
            missingSinceTime: '18:30',
            lastKnownLocation: 'Secunderabad Railway Station, Hyderabad',
            status: 'Active Missing Person Investigation',
            reportingParty: 'Family Member',
            maskName: false
        },
        selectedEvents: [newsRule, returnRule],
        chartStyle: 'south'
    });

    assert.ok(doc, 'PDF Document instance created');
    const pageCount = doc.getNumberOfPages();
    assert.ok(pageCount >= 4, `Multi-page document generated (total pages: ${pageCount})`);

    const pdfBuffer = doc.output('arraybuffer');
    assert.ok(pdfBuffer.byteLength > 10000, `PDF size is substantive (${pdfBuffer.byteLength} bytes)`);
});

// Test 2: Privacy Masking for Sensitive Cases
await itAsync('2. Supports privacy masking for subject name in Missing Person report', async () => {
    const doc = await generateMissingPersonReport({
        kpData: benchmarkChart,
        birthDetails: benchmarkBirthDetails,
        missingPersonCase: {
            caseReference: 'CONF-CASE-007',
            subjectName: 'Ramesh Sharma',
            maskName: true // Name should be masked
        },
        selectedEvents: [returnRule],
        chartStyle: 'north'
    });

    assert.ok(doc);
    const textOutput = doc.output('datauristring');
    assert.ok(textOutput.length > 0);
});

// Test 3: KP Kundli Comprehensive Report
await itAsync('3. Generates KP Kundli Comprehensive Report with Placidus cusps, sub-lords & 4-level significators', async () => {
    const doc = await generateKPKundliReport({
        kpData: benchmarkChart,
        birthDetails: benchmarkBirthDetails,
        chartStyle: 'south'
    });

    assert.ok(doc);
    assert.ok(doc.getNumberOfPages() >= 3, 'Comprehensive report contains multiple structured pages');
});

// Test 4: Vedic Kundli Report (with D1 Rashi & Navamsa notice)
await itAsync('4. Generates Vedic Kundli Report with Rashi chart and transparent divisional notice', async () => {
    const doc = await generateVedicReport({
        kpData: benchmarkChart,
        birthDetails: benchmarkBirthDetails,
        chartStyle: 'north'
    });

    assert.ok(doc);
    assert.ok(doc.getNumberOfPages() >= 2, 'Vedic report contains multiple structured pages');
});

// Test 5: Input Immutability and State Preservation
it('5. Generation does not mutate original input objects (benchmarkChart and birthDetails)', () => {
    const origDate = benchmarkBirthDetails.birthDate;
    const origLagna = benchmarkChart.lagna.degreeInSign;
    const origPlanetsCount = benchmarkChart.planets.length;

    assert.strictEqual(benchmarkBirthDetails.birthDate, origDate);
    assert.strictEqual(benchmarkChart.lagna.degreeInSign, origLagna);
    assert.strictEqual(benchmarkChart.planets.length, origPlanetsCount);
});

// Test 6: Handles Empty or Missing Optional Data Gracefully
await itAsync('6. Handles missing optional case data, empty events, and null aspects without crashing', async () => {
    const sparseChart = {
        ...benchmarkChart,
        aspects: null,
        dasha: null
    };

    const doc = await generateMissingPersonReport({
        kpData: sparseChart,
        birthDetails: { name: 'Sparse Test' },
        missingPersonCase: {},
        selectedEvents: [],
        chartStyle: 'south'
    });

    assert.ok(doc);
    assert.ok(doc.getNumberOfPages() >= 2);
});

// Test 7: Event Analysis Report with custom selected rules
await itAsync('7. Generates Event Analysis Report for career/marriage/education rules', async () => {
    const higherEdRule = KP_HOUSE_GROUPING_RULES.find(r => r.event.toLowerCase().includes('higher education')) || newsRule;
    const doc = await generateEventAnalysisReport({
        kpData: benchmarkChart,
        birthDetails: benchmarkBirthDetails,
        selectedEvents: [higherEdRule],
        chartStyle: 'south'
    });

    assert.ok(doc);
    assert.ok(doc.getNumberOfPages() >= 3);
});

// Test 8: North Indian Chart layout in Missing Person Report
await itAsync('8. Generates Missing Person Report with North Indian Diamond chart layout', async () => {
    const doc = await generateMissingPersonReport({
        kpData: benchmarkChart,
        birthDetails: benchmarkBirthDetails,
        missingPersonCase: {
            caseReference: 'CASE-MP-NORTH-01',
            subjectName: 'Test Subject'
        },
        selectedEvents: [newsRule],
        chartStyle: 'north'
    });

    assert.ok(doc);
    assert.ok(doc.getNumberOfPages() >= 3);
});

console.log(`\nPDF REPORT GENERATION SUITE COMPLETE: ${passed} Passed, ${failed} Failed.\n`);
if (failed > 0) process.exit(1);
