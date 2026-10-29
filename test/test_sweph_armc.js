import { KP_249_TABLE } from '../src/utils/kp/horaryTable.js';
import { resolveKPLongitude } from '../src/utils/kp/kpSubLord.js';

let mismatches = 0;
for (const entry of KP_249_TABLE) {
    const res = resolveKPLongitude(entry.startDeg);
    if (res.starLord !== entry.starLord || res.subLord !== entry.subLord) {
        console.error(`Mismatch at KP #${entry.no}: table=(${entry.starLord}/${entry.subLord}), resolved=(${res.starLord}/${res.subLord})`);
        mismatches++;
    }
}
console.log('Total mismatches for all 249 startDeg:', mismatches);
