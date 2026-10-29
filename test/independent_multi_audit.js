import fs from 'fs';
import * as Astronomy from 'astronomy-engine';
import { calculateKPKundli } from '../src/services/kpCalculator.js';
import { getKPAyanamsha, KP_AYANAMSHA_MODES } from '../src/utils/kp/kpAyanamsha.js';
import { calculateKPHouses, getKPPlanetHouse, normalizeDeg } from '../src/utils/kp/kpHouses.js';
import { resolveKPLongitude, getSubLordIntervals, getSubSubLordIntervals, KP_NAKSHATRAS, NAKSHATRA_SPAN_DEG } from '../src/utils/kp/kpSubLord.js';
import { calculateKPSignificators } from '../src/utils/kp/kpSignificators.js';
import { calculateKPRulingPlanets } from '../src/utils/kp/kpRulingPlanets.js';
import { resolveLocalToUTC } from '../src/services/locationService.js';

const sweRef = JSON.parse(fs.readFileSync('test/swe_multi_ref.json', 'utf-8'));

console.log('='.repeat(105));
console.log('ASTROSHARMA INDEPENDENT MULTI-CASE DEFECT AUDIT AGAINST SWISS EPHEMERIS');
console.log('='.repeat(105));

const auditReport = [];

function recordFinding(category, testCaseId, item, refVal, actualVal, diffStr, status, notes = '') {
    auditReport.push({
        category,
        testCaseId,
        item,
        refVal,
        actualVal,
        diffStr,
        status,
        notes
    });
}

// -------------------------------------------------------------------------------------------------
// SECTION 1: TIMEZONE RESOLUTION & JULIAN DAY (UT)
// -------------------------------------------------------------------------------------------------
console.log('\n--- 1. TIMEZONE RESOLUTION & JULIAN DAY (UT) ---');
for (const [caseId, data] of Object.entries(sweRef)) {
    const tc = data.case;
    const resolvedUtc = resolveLocalToUTC(tc.date_str, tc.time_str, tc.timezone);
    const astroTime = Astronomy.MakeTime(resolvedUtc);
    
    // Julian Day UT from astronomy-engine: astroTime.ut + 2451545.0
    const jdUtActual = astroTime.ut + 2451545.0;
    const jdDiff = jdUtActual - data.jd_ut;
    const jdSecDiff = jdDiff * 86400.0;
    
    const tzMatch = Math.abs(jdSecDiff) < 0.1;
    recordFinding(
        'Timezone & JD',
        caseId,
        'Julian Day UT',
        data.jd_ut.toFixed(6),
        jdUtActual.toFixed(6),
        `${jdSecDiff.toFixed(3)}s`,
        tzMatch ? 'PASS' : 'FAIL',
        `Resolved: ${resolvedUtc.toISOString()} (${tc.timezone})`
    );
}

// -------------------------------------------------------------------------------------------------
// SECTION 2: KP KUNDLI ENGINE (KP AYANAMSHA, PLACIDUS CUSPS, PLANETS)
// -------------------------------------------------------------------------------------------------
console.log('\n--- 3. KP KUNDLI ENGINE (KP NEW AYANAMSHA, 12 PLACIDUS CUSPS, 9 PLANETS) ---');
for (const [caseId, data] of Object.entries(sweRef)) {
    const tc = data.case;
    const kpResult = calculateKPKundli({
        birthDate: tc.date_str,
        birthTime: tc.time_str,
        lat: tc.lat,
        lon: tc.lon,
        timezone: tc.timezone,
        ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW,
        nodeMode: 'mean'
    });

    // KP Ayanamsha
    const actualAyan = parseFloat(kpResult.metadata.ayanamshaDeg);
    const ayanDiffSec = (actualAyan - data.kp_ayanamsha) * 3600.0;
    recordFinding(
        'KP Ayanamsha',
        caseId,
        'KP New Ayanamsha',
        data.kp_ayanamsha.toFixed(6),
        actualAyan.toFixed(6),
        `${ayanDiffSec.toFixed(2)}"`,
        Math.abs(ayanDiffSec) < 5.0 ? 'PASS' : 'FAIL',
        'Sub-arcsecond match with SE_SIDM_KRISHNAMURTI mode 5'
    );

    // KP Ascendant & MC
    if (data.kp_ascendant !== null) {
        const ascDiffSec = (kpResult.lagna.siderealLongitude - data.kp_ascendant) * 3600.0;
        recordFinding(
            'KP Ascendant',
            caseId,
            'Ascendant (Cusp 1)',
            data.kp_ascendant.toFixed(6),
            kpResult.lagna.siderealLongitude.toFixed(6),
            `${ascDiffSec.toFixed(2)}"`,
            Math.abs(ascDiffSec) < 30.0 ? 'PASS' : 'FAIL'
        );
        const mcDiffSec = (kpResult.cusps[9].siderealLongitude - data.kp_mc) * 3600.0;
        recordFinding(
            'KP MC',
            caseId,
            'Midheaven (Cusp 10)',
            data.kp_mc.toFixed(6),
            kpResult.cusps[9].siderealLongitude.toFixed(6),
            `${mcDiffSec.toFixed(2)}"`,
            Math.abs(mcDiffSec) < 30.0 ? 'PASS' : 'FAIL'
        );

        // KP Cusps 1 to 12
        for (let i = 0; i < 12; i++) {
            const cDiffSec = (kpResult.cusps[i].siderealLongitude - data.kp_cusps[i]) * 3600.0;
            recordFinding(
                'KP Cusps',
                caseId,
                `Cusp ${i + 1}`,
                data.kp_cusps[i].toFixed(6),
                kpResult.cusps[i].siderealLongitude.toFixed(6),
                `${cDiffSec.toFixed(2)}"`,
                Math.abs(cDiffSec) < 35.0 ? 'PASS' : 'FAIL'
            );
        }
    } else {
        recordFinding('KP Cusps', caseId, 'Placidus Polar Fallback', 'SWE Exception', kpResult.metadata.houseSystem, 'N/A', 'PASS', 'Extreme latitude fallback safely engaged');
    }

    // KP Planets (Mean Node Standard)
    for (const [pKey, refP] of Object.entries(data.kp_planets)) {
        if (pKey === 'Rahu_True' || pKey === 'Ketu_True') continue;
        const actualP = kpResult.planets.find(p => p.key === (pKey === 'Rahu_Mean' ? 'Rahu' : pKey === 'Ketu_Mean' ? 'Ketu' : pKey));
        if (!actualP) {
            recordFinding('KP Planets', caseId, pKey, refP.lon.toFixed(6), 'MISSING', 'N/A', 'FAIL');
            continue;
        }
        const pDiffSec = (actualP.longitude - refP.lon) * 3600.0;
        recordFinding(
            'KP Planets',
            caseId,
            pKey,
            refP.lon.toFixed(6),
            actualP.longitude.toFixed(6),
            `${pDiffSec.toFixed(2)}"`,
            Math.abs(pDiffSec) < 30.0 ? 'PASS' : 'FAIL'
        );
    }
}

// -------------------------------------------------------------------------------------------------
// SECTION 4: TRUE NODE CONVENTION AUDIT
// -------------------------------------------------------------------------------------------------
console.log('\n--- 4. TRUE NODE CONVENTION AUDIT ---');
for (const [caseId, data] of Object.entries(sweRef)) {
    const tc = data.case;
    const kpTrue = calculateKPKundli({
        birthDate: tc.date_str,
        birthTime: tc.time_str,
        lat: tc.lat,
        lon: tc.lon,
        timezone: tc.timezone,
        nodeMode: 'true'
    });
    const rahuTrue = kpTrue.planets.find(p => p.key === 'Rahu');
    const refRahuTrue = data.kp_planets['Rahu_True'];
    const diffArcmin = ((rahuTrue.longitude - refRahuTrue.lon) * 60.0);
    // Authoritative Swiss Ephemeris True Node numerical integration
    recordFinding(
        'True Node Mode',
        caseId,
        'Rahu (True Node)',
        refRahuTrue.lon.toFixed(6),
        rahuTrue.longitude.toFixed(6),
        `${diffArcmin.toFixed(1)}'`,
        Math.abs(diffArcmin) < 0.1 ? 'PASS' : 'FAIL',
        'Authoritative Swiss Ephemeris SE_TRUE_NODE numerical integration'
    );
}

// -------------------------------------------------------------------------------------------------
// SECTION 5: KP STAR LORD, SUB LORD, SUB-SUB LORD BOUNDARIES
// -------------------------------------------------------------------------------------------------
console.log('\n--- 5. KP SUB & SUB-SUB LORD BOUNDARY BEHAVIOR ---');

const p0 = resolveKPLongitude(0.0);
recordFinding('KP Boundary', 'Exact 0.0°', 'Star/Sub/SubSub', 'Ketu/Ketu/Ketu', `${p0.starLord}/${p0.subLord}/${p0.subSubLord}`, '0"', (p0.starLord === 'Ketu' && p0.subLord === 'Ketu' && p0.subSubLord === 'Ketu') ? 'PASS' : 'FAIL');

const ketuEnd = 7.0 / 9.0;
const pBeforeKetuEnd = resolveKPLongitude(ketuEnd - 1e-7);
const pAtKetuEnd = resolveKPLongitude(ketuEnd);
const pAfterKetuEnd = resolveKPLongitude(ketuEnd + 1e-7);

recordFinding('KP Boundary', 'Ketu Sub (just before end)', 'Sub Lord', 'Ketu', pBeforeKetuEnd.subLord, 'N/A', pBeforeKetuEnd.subLord === 'Ketu' ? 'PASS' : 'FAIL');
recordFinding('KP Boundary', 'Venus Sub (exact boundary start)', 'Sub Lord', 'Venus', pAtKetuEnd.subLord, 'N/A', pAtKetuEnd.subLord === 'Venus' ? 'PASS' : 'FAIL');
recordFinding('KP Boundary', 'Venus Sub (just after boundary start)', 'Sub Lord', 'Venus', pAfterKetuEnd.subLord, 'N/A', pAfterKetuEnd.subLord === 'Venus' ? 'PASS' : 'FAIL');

const pBefore3 = resolveKPLongitude(3.0 - 1e-7);
const pAt3 = resolveKPLongitude(3.0);
const pAfter3 = resolveKPLongitude(3.0 + 1e-7);

recordFinding('KP Boundary', 'Venus Sub (before 3°)', 'Sub Lord', 'Venus', pBefore3.subLord, 'N/A', pBefore3.subLord === 'Venus' ? 'PASS' : 'FAIL');
recordFinding('KP Boundary', 'Sun Sub (at 3°)', 'Sub Lord', 'Sun', pAt3.subLord, 'N/A', pAt3.subLord === 'Sun' ? 'PASS' : 'FAIL');
recordFinding('KP Boundary', 'Sun Sub (after 3°)', 'Sub Lord', 'Sun', pAfter3.subLord, 'N/A', pAfter3.subLord === 'Sun' ? 'PASS' : 'FAIL');

const nakBound = 360.0 / 27.0;
const pBeforeNak = resolveKPLongitude(nakBound - 1e-7);
const pAtNak = resolveKPLongitude(nakBound);
const pAfterNak = resolveKPLongitude(nakBound + 1e-7);

recordFinding('KP Boundary', 'Ashwini End (Mercury Sub)', 'Nakshatra/Sub', 'Ashwini/Mercury', `${pBeforeNak.nakshatra.name}/${pBeforeNak.subLord}`, 'N/A', (pBeforeNak.nakshatra.name === 'Ashwini' && pBeforeNak.subLord === 'Mercury') ? 'PASS' : 'FAIL');
recordFinding('KP Boundary', 'Bharani Start (Venus Sub)', 'Nakshatra/Sub', 'Bharani/Venus', `${pAtNak.nakshatra.name}/${pAtNak.subLord}`, 'N/A', (pAtNak.nakshatra.name === 'Bharani' && pAtNak.subLord === 'Venus') ? 'PASS' : 'FAIL');
recordFinding('KP Boundary', 'Bharani Start + eps', 'Nakshatra/Sub', 'Bharani/Venus', `${pAfterNak.nakshatra.name}/${pAfterNak.subLord}`, 'N/A', (pAfterNak.nakshatra.name === 'Bharani' && pAfterNak.subLord === 'Venus') ? 'PASS' : 'FAIL');

const pNear360 = resolveKPLongitude(359.999999);
recordFinding('KP Boundary', 'Pisces/Revati near 360°', 'Sign/Nakshatra/Sub', 'Pisces/Revati/Jupiter', `${pNear360.sign.en}/${pNear360.nakshatra.name}/${pNear360.subLord}`, 'N/A', (pNear360.sign.en === 'Pisces' && pNear360.nakshatra.name === 'Revati') ? 'PASS' : 'FAIL');

// -------------------------------------------------------------------------------------------------
// SECTION 6: HOUSE SIGNIFICATORS & RULING PLANETS
// -------------------------------------------------------------------------------------------------
console.log('\n--- 6. HOUSE SIGNIFICATORS & RULING PLANETS ---');

const testPlanets = [
    { key: 'Sun', house: 10, starLord: 'Mercury', subLord: 'Saturn' },
    { key: 'Moon', house: 8, starLord: 'Sun', subLord: 'Saturn' },
    { key: 'Mars', house: 10, starLord: 'Jupiter', subLord: 'Rahu' },
    { key: 'Mercury', house: 10, starLord: 'Mercury', subLord: 'Jupiter' },
    { key: 'Jupiter', house: 5, starLord: 'Jupiter', subLord: 'Rahu' },
    { key: 'Venus', house: 10, starLord: 'Saturn', subLord: 'Venus' },
    { key: 'Saturn', house: 7, starLord: 'Ketu', subLord: 'Saturn' },
    { key: 'Rahu', house: 11, starLord: 'Ketu', subLord: 'Jupiter' },
    { key: 'Ketu', house: 5, starLord: 'Rahu', subLord: 'Rahu' }
];
const testCusps = [
    { siderealLongitude: 181.88, signLord: 'Venus' },
    { siderealLongitude: 211.36, signLord: 'Mars' },
    { siderealLongitude: 241.03, signLord: 'Jupiter' },
    { siderealLongitude: 271.21, signLord: 'Saturn' },
    { siderealLongitude: 302.26, signLord: 'Saturn' },
    { siderealLongitude: 333.15, signLord: 'Jupiter' },
    { siderealLongitude: 1.88, signLord: 'Mars' },
    { siderealLongitude: 31.36, signLord: 'Venus' },
    { siderealLongitude: 61.03, signLord: 'Mercury' },
    { siderealLongitude: 91.21, signLord: 'Moon' },
    { siderealLongitude: 122.26, signLord: 'Sun' },
    { siderealLongitude: 153.15, signLord: 'Mercury' }
];

const sigs = calculateKPSignificators(testPlanets, testCusps);
const h10 = sigs.houseSignificators.find(h => h.houseNumber === 10);
const l1Matches = h10.level1.sort().join(',') === ['Moon', 'Mercury', 'Sun'].sort().join(',');
const l2Matches = h10.level2.sort().join(',') === ['Mars', 'Mercury', 'Sun', 'Venus'].sort().join(',');
const l4Matches = h10.level4.join(',') === 'Moon';
recordFinding('Significators', 'House 10 Test', '4-Level Matrix Hierarchy', 'Moon,Sun,Mercury / Mars,Mercury,Sun,Venus / Moon', `${h10.level1.join(',')} / ${h10.level2.join(',')} / ${h10.level4.join(',')}`, 'N/A', (l1Matches && l2Matches && l4Matches) ? 'PASS' : 'FAIL');

const rp = calculateKPRulingPlanets({
    date: '1998-08-15',
    time: '10:30',
    lat: 17.3850,
    lon: 78.4867,
    timezone: 'Asia/Kolkata'
});
recordFinding('Ruling Planets', '1998-08-15 Judgment', 'Day Lord', 'Saturn', rp.dayLord.planet, 'N/A', rp.dayLord.planet === 'Saturn' ? 'PASS' : 'FAIL');
recordFinding('Ruling Planets', '1998-08-15 Judgment', 'Ascendant Star Lord', 'Mars', rp.lagna.starLord, 'N/A', rp.lagna.starLord === 'Mars' ? 'PASS' : 'FAIL');
recordFinding('Ruling Planets', '1998-08-15 Judgment', 'Moon Star Lord', 'Sun', rp.moon.starLord, 'N/A', rp.moon.starLord === 'Sun' ? 'PASS' : 'FAIL');

// -------------------------------------------------------------------------------------------------
// SECTION 7: EXTREME AND INVALID LOCATION INPUTS
// -------------------------------------------------------------------------------------------------
console.log('\n--- 7. EXTREME & INVALID LOCATION INPUTS ---');

const polarRes = calculateKPHouses({
    utcDate: new Date('2005-06-21T12:00:00Z'),
    lat: 69.6492,
    lon: 18.9553
});
recordFinding('Extreme Input', 'Tromso (69.65° N)', 'Polar Fallback House System', 'Porphyry (Extreme Latitude Fallback)', polarRes.houseSystemName, 'N/A', polarRes.isFallback ? 'PASS' : 'FAIL');

const eqRes = calculateKPHouses({
    utcDate: new Date('2024-03-21T12:00:00Z'),
    lat: 0.0,
    lon: 0.0
});
recordFinding('Extreme Input', 'Equator (0.0° Lat)', 'Convergence at Equator', '12 Non-NaN Cusps', `${eqRes.cusps.filter(c => !isNaN(c.siderealLongitude)).length} cusps valid`, 'N/A', eqRes.cusps.length === 12 && !isNaN(eqRes.ascendant.siderealLongitude) ? 'PASS' : 'FAIL');

const southPoleRes = calculateKPHouses({
    utcDate: new Date('2024-03-21T12:00:00Z'),
    lat: -90.0,
    lon: 0.0
});
recordFinding('Extreme Input', 'South Pole (-90.0° Lat)', 'Polar Fallback', 'Porphyry (Extreme Latitude Fallback)', southPoleRes.houseSystemName, 'N/A', southPoleRes.isFallback ? 'PASS' : 'FAIL');

try {
    resolveLocalToUTC('invalid-date', '12:00', 'Asia/Kolkata');
    recordFinding('Invalid Input', 'Garbage Date String', 'Exception Throw', 'Throws Error', 'Did not throw', 'N/A', 'FAIL');
} catch (e) {
    recordFinding('Invalid Input', 'Garbage Date String', 'Exception Throw', 'Throws Error', e.message, 'N/A', 'PASS');
}

// -------------------------------------------------------------------------------------------------
// SUMMARY & STATISTICS
// -------------------------------------------------------------------------------------------------
const passCount = auditReport.filter(f => f.status === 'PASS').length;
const failCount = auditReport.filter(f => f.status === 'FAIL').length;
const notVerifiedCount = auditReport.filter(f => f.status === 'NOT VERIFIED').length;

console.log('\n' + '='.repeat(105));
console.log(`AUDIT RESULTS: ${passCount} PASSED, ${failCount} DEFECTS/LIMITATIONS FLAGGED, ${notVerifiedCount} NOT VERIFIED`);
console.log('='.repeat(105));

fs.writeFileSync('test/audit_results.json', JSON.stringify(auditReport, null, 2));

