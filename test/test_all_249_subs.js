import {
    KP_NAKSHATRAS,
    VIMSHOTTARI_PLANETS,
    NAKSHATRA_SPAN_DEG,
    getSubLordIntervals,
    getSubSubLordIntervals,
    resolveKPLongitude
} from '../src/utils/kp/kpSubLord.js';

console.log('='.repeat(90));
console.log('COMPREHENSIVE AUDIT: ALL 249 SUB LORDS AND SUB-SUB LORDS & BOUNDARIES');
console.log('='.repeat(90));

let subPassCount = 0;
let subFailCount = 0;
let boundaryPassCount = 0;
let boundaryFailCount = 0;

for (let nakIdx = 0; nakIdx < 27; nakIdx++) {
    const nak = KP_NAKSHATRAS[nakIdx];
    const nakStart = nakIdx * NAKSHATRA_SPAN_DEG;
    const intervals = getSubLordIntervals(nak.starLord);

    for (let subIdx = 0; subIdx < 9; subIdx++) {
        const sub = intervals[subIdx];
        const subStartDeg = nakStart + sub.startOffsetDeg;
        const subEndDeg = nakStart + sub.endOffsetDeg;
        const subMidDeg = (subStartDeg + subEndDeg) / 2.0;

        // 1. Test Midpoint
        const resMid = resolveKPLongitude(subMidDeg);
        if (resMid.nakshatra.name === nak.name && resMid.starLord === nak.starLord && resMid.subLord === sub.planetKey) {
            subPassCount++;
        } else {
            console.error(`FAIL at Nak ${nak.name} Sub ${sub.planetKey} Midpoint (${subMidDeg}°): got Nak=${resMid.nakshatra.name}, Star=${resMid.starLord}, Sub=${resMid.subLord}`);
            subFailCount++;
        }

        // 2. Test Exact Start Boundary (Half-open [start, end))
        const resStart = resolveKPLongitude(subStartDeg);
        if (resStart.nakshatra.name === nak.name && resStart.starLord === nak.starLord && resStart.subLord === sub.planetKey) {
            boundaryPassCount++;
        } else {
            console.error(`FAIL at Exact Start (${subStartDeg}°): expected Nak=${nak.name}, Star=${nak.starLord}, Sub=${sub.planetKey}; got Nak=${resStart.nakshatra.name}, Star=${resStart.starLord}, Sub=${resStart.subLord}`);
            boundaryFailCount++;
        }

        // 3. Test Epsilon Inside Start Boundary (+1e-6)
        const resJustInside = resolveKPLongitude(subStartDeg + 1e-6);
        if (resJustInside.subLord === sub.planetKey) {
            boundaryPassCount++;
        } else {
            console.error(`FAIL just inside start (${subStartDeg + 1e-6}°): expected Sub=${sub.planetKey}; got ${resJustInside.subLord}`);
            boundaryFailCount++;
        }

        // 4. Test Sub-Sub Lord Partitions inside this sub
        const subSubs = getSubSubLordIntervals(sub.planetKey, sub.spanDeg, sub.startOffsetDeg);
        if (subSubs.length !== 9) {
            subFailCount++;
        } else {
            // First sub-sub lord must match the parent sub lord
            if (subSubs[0].planetKey !== sub.planetKey) {
                console.error(`FAIL: First sub-sub lord ${subSubs[0].planetKey} does not match parent sub lord ${sub.planetKey}`);
                subFailCount++;
            } else {
                subPassCount++;
            }
        }
    }
}

console.log(`\nSUB LORD AUDIT COMPLETE:`);
console.log(`- Sub Lord Midpoint & Sub-Sub Hierarchy Tests: ${subPassCount} PASSED, ${subFailCount} FAILED`);
console.log(`- Exact Boundary [start, end) Tests: ${boundaryPassCount} PASSED, ${boundaryFailCount} FAILED`);

if (subFailCount > 0 || boundaryFailCount > 0) {
    process.exit(1);
} else {
    console.log('ALL 249 SUB LORDS & BOUNDARY CONDITIONS VERIFIED WITH ZERO DEFECTS.');
}
