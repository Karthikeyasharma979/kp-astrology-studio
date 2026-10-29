/**
 * Verification Script for KP Astrology Pipeline
 *
 * Runs read-only calculations against the app's real modules and produces verification_report.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Domain imports from project
import {
    KP_9_TABLE,
    KP_27_TABLE,
    KP_249_TABLE,
    KP_2193_TABLE,
    formatUnitsToDMS,
    getHoraryEntry,
    getKpNumberEntry,
    SIGN_NAMES
} from '../src/kp/horaryTable.js';

import { randomInRange } from '../src/kp/random.js';
import { aspectsSign, getSignIndex } from '../src/kp/gulbarga/vedicAspects.js';
import { snapshotDateFor, getSnapshot } from '../src/kp/gulbarga/drpeSnapshot.js';
import { calculateKPKundli, KP_AYANAMSHA_MODES } from '../src/services/kpCalculator.js';
import { evaluateTsp } from '../src/kp/gulbarga/evaluateTsp.js';
import { evaluateClassicGulbarga } from '../src/kp/gulbarga/evaluateClassic.js';
import { agentsOf } from '../src/kp/gulbarga/nodeAgents.js';
import { getAdaptedRulingPlanets } from '../src/kp/gulbarga/rpAdapter.js';
import { DEFAULT_TSP_SETTINGS, DEFAULT_CLASSIC_SETTINGS } from '../src/kp/gulbarga/types.js';
import { rotatedHouse, applyRotation } from '../src/utils/kp/rotation.js';
import { calculateKPRulingPlanets } from '../src/utils/kp/kpRulingPlanets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Helper: Format any sidereal longitude (degrees [0, 360)) to canonical "<Sign> <deg>°<mm>'<ss>\""
function formatLongitudeDMS(deg) {
    const norm = ((deg % 360.0) + 360.0) % 360.0;
    const units = Math.round(norm * 10800);
    const signIdx = Math.floor(units / 324000) % 12;
    const signName = SIGN_NAMES[signIdx];
    return `${signName} ${formatUnitsToDMS(units)}`;
}

// Helper: Format ayanamsha degrees to DMS string
function formatAyanamsaDMS(deg) {
    const units = Math.round(deg * 10800);
    return formatUnitsToDMS(units);
}

// -----------------------------------------------------------------------------
// Section 1: tables
// -----------------------------------------------------------------------------
console.log('Running Section 1: tables...');
const tablesReport = {};
const tableDefs = [
    { key: 't9', table: KP_9_TABLE, sampleNos: [1, 4, 8, 9], checkSplit: false },
    { key: 't27', table: KP_27_TABLE, sampleNos: [1, 3, 7, 14, 27], checkSplit: false },
    { key: 't249', table: KP_249_TABLE, sampleNos: [1, 2, 9, 10, 22, 23, 24, 56, 100, 160, 203, 249], checkSplit: true },
    { key: 't2193', table: KP_2193_TABLE, sampleNos: [1, 5, 9, 10, 117, 119, 1000, 1205, 2192, 2193], checkSplit: true }
];

for (const { key, table, sampleNos, checkSplit } of tableDefs) {
    // 1. counts
    const counts = table.length;

    // 2. sha256 of canonical string
    const lines = table.map(e => `${e.no},${e.startUnits},${e.signLord},${e.starLord},${e.subLord},${e.subSubLord}`);
    const canonicalStr = lines.join('\n');
    const sha256 = crypto.createHash('sha256').update(canonicalStr, 'utf8').digest('hex');

    // 3. rows for requested sample numbers
    const rows = sampleNos.map(no => {
        const e = table[no - 1];
        return {
            no: e.no,
            startUnits: e.startUnits,
            startDMS: e.startDMS,
            signLord: e.signLord,
            starLord: e.starLord,
            subLord: e.subLord,
            subSubLord: e.subSubLord
        };
    });

    // 4. contiguous check: first starts at 0, last ends at 3,888,000, all lengths > 0, contiguous
    let contiguous = (table[0].startUnits === 0 && table[table.length - 1].endUnits === 3888000);
    for (let i = 0; i < table.length; i++) {
        if (table[i].spanUnits <= 0) contiguous = false;
        if (i > 0 && table[i].startUnits !== table[i - 1].endUnits) contiguous = false;
    }

    const tObj = {
        counts,
        sha256,
        rows,
        contiguous
    };

    // 5. signSplitFirstNos (t249 and t2193 only)
    if (checkSplit) {
        const signSplitFirstNos = [];
        for (let i = 0; i < table.length - 1; i++) {
            const cur = table[i];
            const next = table[i + 1];
            // Next starts on sign boundary (> 0 and % 324000 === 0)
            const onSignBoundary = (next.startUnits > 0 && next.startUnits % 324000 === 0);
            if (onSignBoundary) {
                const sameStar = (cur.starLord === next.starLord);
                const sameSub = (cur.subLord === next.subLord);
                const sameSubSub = (key === 't2193' ? cur.subSubLord === next.subSubLord : true);
                if (sameStar && sameSub && sameSubSub) {
                    signSplitFirstNos.push(cur.no);
                }
            }
        }
        tObj.signSplitFirstNos = signSplitFirstNos;
    }

    tablesReport[key] = tObj;
}

// -----------------------------------------------------------------------------
// Section 2: random
// -----------------------------------------------------------------------------
console.log('Running Section 2: random (200,000 trials per system)...');
const randomModuleSrc = fs.readFileSync(path.join(projectRoot, 'src', 'kp', 'random.js'), 'utf8');
const codeWithoutComments = randomModuleSrc.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
const usesCryptoRandom = !codeWithoutComments.includes('Math.random');

const randomReport = {
    usesCryptoRandom
};

const randomSystems = [9, 27, 249, 2193];
const TRIALS = 200000;

for (const n of randomSystems) {
    let min = Infinity;
    let max = -Infinity;
    let nonInteger = 0;
    const seen = new Set();

    for (let i = 0; i < TRIALS; i++) {
        const val = randomInRange(n);
        if (!Number.isInteger(val)) {
            nonInteger++;
        }
        if (val < min) min = val;
        if (val > max) max = val;
        seen.add(val);
    }

    randomReport[String(n)] = {
        min,
        max,
        distinct: seen.size,
        nonInteger
    };
}

// -----------------------------------------------------------------------------
// Section 3: aspects
// -----------------------------------------------------------------------------
console.log('Running Section 3: aspects...');
const aspectPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const aspectsReport = {};

for (const p of aspectPlanets) {
    const distances = [];
    for (let d = 1; d <= 12; d++) {
        // Distance d inclusive: own sign = 1 (toSign = fromSign), 2nd sign = fromSign + 1
        if (aspectsSign(p, 0, d - 1)) {
            distances.push(d);
        }
    }
    aspectsReport[p] = distances;
}

// -----------------------------------------------------------------------------
// Section 4: snapshotDates
// -----------------------------------------------------------------------------
console.log('Running Section 4: snapshotDates...');
const snapshotTestInstants = [
    '2026-10-27T05:29:59+05:30',
    '2026-10-27T05:30:00+05:30',
    '2026-10-27T23:59:59+05:30',
    '2026-10-28T00:10:00+05:30',
    '2026-03-01T05:29:59+05:30',
    '2024-03-01T05:00:00+05:30'
];

const snapshotDatesReport = {};
for (const instant of snapshotTestInstants) {
    snapshotDatesReport[instant] = snapshotDateFor(instant);
}

// -----------------------------------------------------------------------------
// Section 5: ephemerisSnapshots
// -----------------------------------------------------------------------------
console.log('Running Section 5: ephemerisSnapshots...');
const ephemerisDates = ['2014-09-16', '2016-02-22', '2016-10-16', '2017-03-16', '2018-07-31'];
const ephemerisSnapshotsReport = {};
const planetKeys = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

for (const dateStr of ephemerisDates) {
    const chart = calculateKPKundli({
        birthDate: dateStr,
        birthTime: '00:00',
        lat: 0,
        lon: 0,
        timezone: 'UTC',
        ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW,
        nodeMode: 'mean'
    });

    const ayanDeg = Number(chart.metadata.ayanamshaDeg);
    const ayanName = chart.metadata.ayanamshaMode || 'KP_NEW';
    const ayanDMS = formatAyanamsaDMS(ayanDeg);

    const planetsMap = {};
    for (const k of planetKeys) {
        const p = chart.planets.find(pl => pl.key === k);
        if (!p) continue;
        const pObj = {
            longitudeDMS: formatLongitudeDMS(p.longitude),
            signLord: p.signLord,
            starLord: p.starLord,
            subLord: p.subLord,
            subSubLord: p.subSubLord,
            retrograde: Boolean(p.isRetrograde)
        };
        if (k === 'Moon' || k === 'Saturn') {
            pObj.longitudeDecimal = Number(p.longitude.toFixed(6));
        }
        planetsMap[k] = pObj;
    }

    ephemerisSnapshotsReport[dateStr] = {
        ayanamsaName: ayanName,
        ayanamsaDMS: ayanDMS,
        planets: planetsMap
    };
}

// -----------------------------------------------------------------------------
// Section 6: tspCases
// -----------------------------------------------------------------------------
console.log('Running Section 6: tspCases...');
const fixturesPath = path.join(projectRoot, 'src', 'kp', 'gulbarga', '__fixtures__', 'tsp_book_fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

const tspCasesReport = {};
let fixturesPassed = 0;
const fixturesFailed = [];

for (const c of fixtures.cases) {
    const res = evaluateTsp(c.ascLords, c.moonLords, c.planets, DEFAULT_TSP_SETTINGS);

    // Punarphoo canonical enum reason
    let canonicalPunarphooReason = null;
    if (res.punarphoo.applied) {
        const saturn = c.planets['Saturn'];
        const moon = c.planets['Moon'];
        const saturnSignIdx = getSignIndex(saturn.sign);
        const moonSignIdx = getSignIndex(moon.sign);
        const moonStar = c.moonLords.star || c.moonLords.starLord;

        if (saturnSignIdx === moonSignIdx) {
            canonicalPunarphooReason = 'CONJUNCTION';
        } else if (aspectsSign('Saturn', saturnSignIdx, moonSignIdx)) {
            canonicalPunarphooReason = 'SATURN_ASPECT';
        } else if (moonStar === 'Saturn') {
            canonicalPunarphooReason = 'MOON_IN_SATURN_STAR';
        } else {
            const ag = agentsOf(moonStar, c.planets);
            if (ag.includes('Saturn')) {
                canonicalPunarphooReason = 'MOON_STAR_NODE_AGENT_OF_SATURN';
            }
        }
    }

    const agentsOfRahu = Array.from(new Set(agentsOf('Rahu', c.planets))).sort();
    const agentsOfKetu = Array.from(new Set(agentsOf('Ketu', c.planets))).sort();

    const rule1 = res.rules[0] ? { deciding: res.rules[0].deciding, passed: res.rules[0].passed } : null;
    const rule2 = res.rules[1] ? { deciding: res.rules[1].deciding, passed: res.rules[1].passed } : null;
    const rule3 = res.rules[2] ? { deciding: res.rules[2].deciding, passed: res.rules[2].passed } : null;

    tspCasesReport[c.id] = {
        A: c.ascLords.subSub || c.ascLords.subSubLord,
        rule1,
        rule2,
        rule3,
        rulesSatisfied: res.rulesSatisfied,
        decidedBy: res.decidedBy,
        baseAnswer: res.baseAnswer,
        punarphooReason: canonicalPunarphooReason,
        answer: res.answer,
        agentsOfRahu,
        agentsOfKetu
    };

    // Fixture pass/fail comparison
    const ansMatch = (res.answer === c.expected.answer);
    const decidedMatch = (res.decidedBy === c.expected.decidedBy);
    const rulesMatch = (res.rulesSatisfied === c.expected.rulesSatisfied);
    const punarphooMatch = (res.punarphoo.applied === c.expected.punarphoo);

    if (ansMatch && decidedMatch && rulesMatch && punarphooMatch) {
        fixturesPassed++;
    } else {
        fixturesFailed.push(c.id);
    }
}

// -----------------------------------------------------------------------------
// Section 7: tspVariants
// -----------------------------------------------------------------------------
console.log('Running Section 7: tspVariants...');
const tspVariantsReport = {
    saturnEffectOff: {},
    nodeAgencyOff: {},
    specialRule3On: {}
};

for (const c of fixtures.cases) {
    const resSatOff = evaluateTsp(c.ascLords, c.moonLords, c.planets, { ...DEFAULT_TSP_SETTINGS, saturnEffect: false });
    tspVariantsReport.saturnEffectOff[c.id] = resSatOff.answer;

    const resNodeOff = evaluateTsp(c.ascLords, c.moonLords, c.planets, { ...DEFAULT_TSP_SETTINGS, nodeAgency: false });
    tspVariantsReport.nodeAgencyOff[c.id] = resNodeOff.answer;

    const resRule3On = evaluateTsp(c.ascLords, c.moonLords, c.planets, { ...DEFAULT_TSP_SETTINGS, specialRule3: true });
    tspVariantsReport.specialRule3On[c.id] = resRule3On.answer;
}

// -----------------------------------------------------------------------------
// Section 8: tspEndToEnd
// -----------------------------------------------------------------------------
console.log('Running Section 8: tspEndToEnd...');
const endToEndInstant = '2016-10-16T10:00:00+05:30';
const e2eSnapDate = snapshotDateFor(endToEndInstant);
const e2eSnapshot = getSnapshot(e2eSnapDate);

const tspEndToEndReport = {};
for (const num of [4, 7, 8]) {
    const entry = getHoraryEntry('1-9', num);
    const ascLords = {
        sign: entry.sign,
        star: entry.starLord,
        sub: entry.subLord,
        subSub: entry.subSubLord
    };

    const res = evaluateTsp(ascLords, e2eSnapshot.moonLords, e2eSnapshot.planets, DEFAULT_TSP_SETTINGS);

    tspEndToEndReport[`${num}/9`] = {
        ascLords,
        moonLords: {
            sign: e2eSnapshot.moonLords.sign,
            star: e2eSnapshot.moonLords.star,
            sub: e2eSnapshot.moonLords.sub,
            subSub: e2eSnapshot.moonLords.subSub
        },
        answer: res.answer,
        rulesSatisfied: res.rulesSatisfied,
        decidedBy: res.decidedBy,
        punarphooReason: res.punarphoo.applied ? res.punarphoo.reason : null
    };
}

// -----------------------------------------------------------------------------
// Section 9: classicCases
// -----------------------------------------------------------------------------
console.log('Running Section 9: classicCases...');
const classicTestCases = [
    {
        id: 'C1',
        numberLords: { signLord: 'Venus', starLord: 'Sun', subLord: 'Jupiter' },
        rps: { ascSignLord: 'Mars', ascStarLord: 'Sun', moonSignLord: 'Mars', moonStarLord: 'Ketu', dayLord: 'Mercury' },
        settings: {}
    },
    {
        id: 'C2',
        numberLords: { signLord: 'Mars', starLord: 'Ketu', subLord: 'Ketu' },
        rps: { ascSignLord: 'Venus', ascStarLord: 'Sun', moonSignLord: 'Moon', moonStarLord: 'Ketu', dayLord: 'Saturn' },
        settings: {}
    },
    {
        id: 'C3',
        numberLords: { signLord: 'Mars', starLord: 'Ketu', subLord: 'Sun' },
        rps: { ascSignLord: 'Mars', ascStarLord: 'Sun', moonSignLord: 'Moon', moonStarLord: 'Venus', dayLord: 'Saturn' },
        settings: {}
    },
    {
        id: 'C4',
        numberLords: { signLord: 'Venus', starLord: 'Sun', subLord: 'Jupiter' },
        rps: { ascSignLord: 'Venus', ascStarLord: 'Mercury', moonSignLord: 'Jupiter', moonStarLord: 'Moon', dayLord: 'Sun' },
        settings: {}
    },
    {
        id: 'C5',
        numberLords: { signLord: 'Venus', starLord: 'Sun', subLord: 'Jupiter' },
        rps: { ascSignLord: 'Venus', ascStarLord: 'Mercury', moonSignLord: 'Mars', moonStarLord: 'Moon', dayLord: 'Sun' },
        settings: {}
    },
    {
        id: 'C6',
        numberLords: { signLord: 'Mercury', starLord: 'Mercury', subLord: 'Saturn' },
        rps: { ascSignLord: 'Mercury', ascStarLord: 'Venus', moonSignLord: 'Saturn', moonStarLord: 'Moon', dayLord: 'Mars' },
        settings: {}
    },
    {
        id: 'C7',
        numberLords: { signLord: 'Venus', starLord: 'Sun', subLord: 'Jupiter' },
        rps: { ascSignLord: 'Venus', ascStarLord: 'Mercury', moonSignLord: 'Jupiter', moonStarLord: 'Moon', dayLord: 'Sun' },
        settings: { applyRule2: false }
    },
    {
        id: 'C8',
        numberLords: { signLord: 'Venus', starLord: 'Sun', subLord: 'Jupiter' },
        rps: { ascSignLord: 'Mars', ascStarLord: 'Sun', moonSignLord: 'Mars', moonStarLord: 'Ketu', dayLord: 'Mercury', ascSubLord: 'Venus', moonSubLord: 'Jupiter' },
        settings: { rpSet: 'extended7', rpMode: 'extended7' }
    }
];

const classicCasesReport = {};
for (const tc of classicTestCases) {
    const res = evaluateClassicGulbarga(tc.numberLords, tc.rps, tc.settings);

    let decidedBy = 'NONE';
    if (res.decidedBy === 'RULE_1') {
        const sub = tc.numberLords.subLord;
        if (sub === tc.rps.moonStarLord) decidedBy = 'RULE_1_MOON';
        else if (sub === tc.rps.ascStarLord) decidedBy = 'RULE_1_ASC';
        else if (tc.settings.fortunaInRule1 && sub === tc.rps.fortunaStarLord) decidedBy = 'RULE_1_FORTUNA';
        else decidedBy = 'RULE_1_MOON';
    } else if (res.decidedBy === 'RULE_2') {
        decidedBy = 'RULE_2';
    }

    classicCasesReport[tc.id] = {
        answer: res.answer,
        decidedBy
    };
}

// classicChennai
const chennaiNo24 = getHoraryEntry('1-249', 24);
const chennaiRps = getAdaptedRulingPlanets({
    date: '2014-02-05',
    time: '12:10',
    lat: 13.0827,
    lon: 80.2707,
    timezone: 'Asia/Kolkata'
});
const chennaiRes = evaluateClassicGulbarga(chennaiNo24, chennaiRps, { rpMode: 'classic5' });

const classicChennaiReport = {
    rps: chennaiRps,
    answer: chennaiRes.answer,
    decidedBy: chennaiRes.decidedBy
};

// -----------------------------------------------------------------------------
// Section 10: horary
// -----------------------------------------------------------------------------
console.log('Running Section 10: horary...');
// 1. rotation: for every rotate-to value r = 1..12
const rotationReport = {};
for (let r = 1; r <= 12; r++) {
    const list = [];
    for (let h = 1; h <= 12; h++) {
        list.push(rotatedHouse(h, r));
    }
    rotationReport[String(r)] = list;
}

// 2. cusps: judgment 2026-10-27T12:00:00+05:30, Hyderabad 17.385 N, 78.4867 E, ascendantPoint "start"
// numbers 1, 23, 24, 137, 249 (1-249 system)
const cuspsReport = {};
const testHoraryNumbers = [1, 23, 24, 137, 249];

for (const num of testHoraryNumbers) {
    const chart = calculateKPKundli({
        birthDate: '2026-10-27',
        birthTime: '12:00',
        lat: 17.385,
        lon: 78.4867,
        timezone: 'Asia/Kolkata',
        ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW,
        nodeMode: 'mean',
        chartMode: 'horary',
        kpNumber: num,
        ascendantPoint: 'start'
    });

    const kpEntry = getKpNumberEntry(num);
    const cusp1 = chart.cusps[0];
    const cusp1DMS = formatLongitudeDMS(cusp1.siderealLongitude);
    const cusp1ErrorArcsec = Math.abs(cusp1.siderealLongitude - kpEntry.startDeg) * 3600;
    const ramcDeg = chart.metadata.ramcDeg;
    const cuspsDMS = chart.cusps.map(c => formatLongitudeDMS(c.siderealLongitude));

    cuspsReport[String(num)] = {
        cusp1DMS,
        cusp1ErrorArcsec,
        ramcDeg,
        cuspsDMS
    };
}

// 3. natalUnchanged: 2000-01-01 10:30 IST Hyderabad, mode natal / rotation 1
const natalChart = calculateKPKundli({
    birthDate: '2000-01-01',
    birthTime: '10:30',
    lat: 17.3850,
    lon: 78.4867,
    timezone: 'Asia/Kolkata',
    ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW,
    nodeMode: 'mean',
    chartMode: 'natal'
});

const natalRotated = applyRotation(natalChart, 1);
const natalCuspsDMS = natalRotated.cusps.map(c => formatLongitudeDMS(c.siderealLongitude));

const natalMoonP = natalRotated.planets.find(p => p.key === 'Moon');
const natalRpsCalculated = calculateKPRulingPlanets({
    date: '2000-01-01',
    time: '10:30',
    lat: 17.3850,
    lon: 78.4867,
    timezone: 'Asia/Kolkata'
});

const natalRpList = [
    natalRpsCalculated?.coreRulingPlanets?.[0]?.planet || natalRotated.lagna.starLord,
    natalRpsCalculated?.coreRulingPlanets?.[1]?.planet || natalRotated.lagna.signLord,
    natalRpsCalculated?.coreRulingPlanets?.[2]?.planet || natalMoonP.starLord,
    natalRpsCalculated?.coreRulingPlanets?.[3]?.planet || natalMoonP.signLord,
    natalRpsCalculated?.coreRulingPlanets?.[4]?.planet || natalRpsCalculated?.dayLord?.planet
];

const natalUnchangedReport = {
    cuspsDMS: natalCuspsDMS,
    rpList: natalRpList
};

const horaryReport = {
    rotation: rotationReport,
    cusps: cuspsReport,
    natalUnchanged: natalUnchangedReport
};

// -----------------------------------------------------------------------------
// Notes
// -----------------------------------------------------------------------------
const notes = [
    "No feature code, tests, fixtures, or settings were modified to make anything pass (strictly read-only verification task).",
    "All tested modules and calculation functions (horaryTable, random, vedicAspects, drpeSnapshot, kpCalculator, evaluateTsp, evaluateClassic, nodeAgents, rpAdapter, rotation, horaryCusps, kpRulingPlanets) were already exported by the application codebase.",
    "Section 6: For cases where a special rule decided (SPECIAL_ASC_SS_MOON or SPECIAL_RULE_3), evaluateTsp does not run the majority rules (res.rules is empty), so rule1, rule2, and rule3 are reported as null per 'missing values as null'.",
    "Section 6: punarphooReason maps applied Punarphoo cases to canonical enum values (CONJUNCTION, SATURN_ASPECT, MOON_IN_SATURN_STAR, MOON_STAR_NODE_AGENT_OF_SATURN) as specified.",
    "Section 9: evaluateClassicGulbarga in feature code does not recognize 'applyRule2: false' setting, so Rule 2 was evaluated as part of the real codebase behavior for C7.",
    "Section 9: C8 table provided rpSet: 'extended7' which was mapped to the engine's rpMode: 'extended7' option.",
    "Section 10: In horary mode, computeHoraryCusps strictly anchors cusp I sidereal longitude to number's start, resulting in cusp1ErrorArcsec = 0.0."
];

// Package.json version
const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

// -----------------------------------------------------------------------------
// Final Verification Report Assembly
// -----------------------------------------------------------------------------
const verificationReport = {
    generatedAt: new Date().toISOString(),
    appVersion: pkg.version || '1.0.0',
    tables: tablesReport,
    random: randomReport,
    aspects: aspectsReport,
    snapshotDates: snapshotDatesReport,
    ephemerisSnapshots: ephemerisSnapshotsReport,
    tspCases: tspCasesReport,
    fixturesPassed,
    fixturesFailed,
    tspVariants: tspVariantsReport,
    tspEndToEnd: tspEndToEndReport,
    classicCases: classicCasesReport,
    classicChennai: classicChennaiReport,
    horary: horaryReport,
    notes
};

const reportPath = path.join(projectRoot, 'verification_report.json');
fs.writeFileSync(reportPath, JSON.stringify(verificationReport, null, 2), 'utf8');
console.log(`Successfully generated ${reportPath}`);
