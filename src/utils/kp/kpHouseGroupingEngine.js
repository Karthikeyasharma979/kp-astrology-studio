/**
 * KP Astrology House Grouping & Significator Matching Engine
 *
 * Implements:
 * 1. Mode A: Common-Planet Ranking (Option 2) with configurable threshold,
 *    distinct-house intersection, deterministic tie-breaking, and 4-fold KP evidence.
 * 2. Mode B: Joint DBA Evaluation analyzing running Mahadasha, Bhukti, and Antara periods,
 *    triad house coverage, alternative combinations, and negative condition exclusions.
 * 3. Cusp Sub Lord Verification inspecting designated cusps against event houses.
 * 4. Dynamic Badhaka & Maraka sthana resolution based on Ascendant sign modality.
 */

import {
    calculatePlanetaryAspects,
    ASPECT_CONVENTIONS,
    RAHU_KETU_ASPECT_MODES,
    ORB_MODES,
    CUSP_ORB_MODES
} from './kpAspects.js';

// Canonical planetary order for deterministic sorting
export const CANONICAL_PLANETS = [
    'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'
];

/**
 * Resolves Badhaka sthana based on Ascendant Sign Modality (Char/Sthir/Dvisvabhava)
 * Movable signs (1, 4, 7, 10) -> 11th house
 * Fixed signs (2, 5, 8, 11)   -> 9th house
 * Dual signs (3, 6, 9, 12)    -> 7th house
 *
 * @param {number|string} ascSign - Ascendant sign (1 to 12) or sign name
 * @returns {number} Badhaka house number (11, 9, or 7)
 */
export function getBadhakaHouse(ascSign) {
    let signNum = typeof ascSign === 'number' ? ascSign : 1;
    if (typeof ascSign === 'string') {
        const signMap = {
            'Aries': 1, 'Mesha': 1, 'Taurus': 2, 'Vrishabha': 2,
            'Gemini': 3, 'Mithuna': 3, 'Cancer': 4, 'Karkataka': 4,
            'Leo': 5, 'Simha': 5, 'Virgo': 6, 'Kanya': 6,
            'Libra': 7, 'Tula': 7, 'Scorpio': 8, 'Vrischika': 8,
            'Sagittarius': 9, 'Dhanus': 9, 'Capricorn': 10, 'Makara': 10,
            'Aquarius': 11, 'Kumbha': 11, 'Pisces': 12, 'Meena': 12
        };
        signNum = signMap[ascSign] || 1;
    }

    const movable = [1, 4, 7, 10];
    const fixed = [2, 5, 8, 11];
    const dual = [3, 6, 9, 12];

    if (movable.includes(signNum)) return 11;
    if (fixed.includes(signNum)) return 9;
    if (dual.includes(signNum)) return 7;
    return 11;
}

/**
 * Resolves Maraka sthana (standard 2nd and 7th houses)
 * @returns {Array<number>} [2, 7]
 */
export function getMarakaHouses() {
    return [2, 7];
}

// Notation tokens as spelled in the source book ("Bdhk" and "Mararka" are book spellings)
const BADHAKA_TOKEN_RE = /\b(bdk|bdhk|badhaka)\b/i;
const MARAKA_TOKEN_RE = /\b(mrk|maraka|mararka)\b/i;
// "9,11 if not Badhaka", "not connected to Badhaka", "Excluding 9= Badhaka", "except being Bdhk"
const BADHAKA_EXCLUSION_RE = /(if\s+not|not\s+connected\s+to|except(?:ing)?|excluding\s+\d+\s*=)\s*(?:being\s+)?(?:the\s+)?(badhaka|bdk|bdhk)\b/i;
// Static house the book names as Badhaka for one modality ("Excluding 9= Badhaka for ... fixed signs")
const STATIC_BADHAKA_MENTION_RE = /(\d+)\s*=\s*(?:badhaka|bdk|bdhk)\b/gi;

/**
 * Converts a 0-based sign index (as carried by chart results) to the 1-12 sign number
 * expected by getBadhakaHouse.
 * @param {Object} chart - Chart result with lagna / cusps
 * @returns {number} 1..12
 */
export function getAscendantSignNumber(chart) {
    const idx = chart?.lagna?.signIndex ?? chart?.lagna?.sign?.id ?? chart?.cusps?.[0]?.signIndex;
    return Number.isInteger(idx) && idx >= 0 && idx < 12 ? idx + 1 : 1;
}

function ruleNotationText(rule, includeRemarks) {
    const n = rule?.originalNotation || {};
    const parts = [n.housesToBeSignified, n.jointDBA];
    if (includeRemarks) parts.push(n.remark, rule?.remarks);
    return parts.filter(Boolean).join(' ');
}

/**
 * Returns the Badhaka house when the rule says it must NOT be involved, else null.
 * @param {Object} rule
 * @param {number|string} ascSign
 * @returns {number|null}
 */
export function getExcludedBadhakaHouse(rule, ascSign) {
    return BADHAKA_EXCLUSION_RE.test(ruleNotationText(rule, true)) ? getBadhakaHouse(ascSign) : null;
}

/**
 * Resolves rule houses dynamically substituting Badhaka/Maraka tokens if applicable
 *
 * @param {Array<number>} baseHouses - Base numeric houses
 * @param {Object} rule - Rule entry
 * @param {number|string} ascSign - Ascendant sign
 * @returns {Array<number>} Resolved unique houses
 */
export function resolveRuleHouses(baseHouses, rule, ascSign) {
    const houses = new Set(baseHouses || []);
    const rawText = ruleNotationText(rule, false);
    const excludedBadhaka = getExcludedBadhakaHouse(rule, ascSign);

    if (excludedBadhaka != null) {
        houses.delete(excludedBadhaka);
    } else if (BADHAKA_TOKEN_RE.test(rawText)) {
        houses.add(getBadhakaHouse(ascSign));
    }
    if (MARAKA_TOKEN_RE.test(rawText)) {
        getMarakaHouses().forEach(h => houses.add(h));
    }
    return Array.from(houses).sort((a, b) => a - b);
}

/**
 * Resolves the rule's negative (obstructing) houses for this Ascendant. When the rule
 * excludes Badhaka, the actual Badhaka house becomes negative and any house the book
 * names as Badhaka for a single modality (e.g. "Excluding 9= Badhaka for fixed signs")
 * stops being negative for the other modalities.
 *
 * @param {Object} rule
 * @param {number|string} ascSign
 * @returns {Array<number>}
 */
export function resolveNegativeHouses(rule, ascSign) {
    const negatives = new Set(rule?.negativeHouses || []);
    const excludedBadhaka = getExcludedBadhakaHouse(rule, ascSign);
    if (excludedBadhaka != null) {
        for (const m of ruleNotationText(rule, true).matchAll(STATIC_BADHAKA_MENTION_RE)) {
            negatives.delete(Number(m[1]));
        }
        negatives.add(excludedBadhaka);
    }
    return Array.from(negatives).sort((a, b) => a - b);
}

/**
 * MODE A: Common-Planet Ranking (Option 2)
 *
 * Ranks all planets by the number of distinct houses they signify from the selected rule.
 * Applies configurable minMatches threshold (default: 2 distinct houses).
 *
 * @param {Object} significators - KP 4-fold significator calculation output
 * @param {Object} rule - The selected rule entry from registry
 * @param {Object} options - Configuration options { minMatches: 2, ascSign: 1, runningDashaPlanets: [] }
 * @returns {Object} { rankedPlanets, excludedPlanets, targetHouses, stats }
 */
export function calculateCommonPlanetRanking(significators, rule, options = {}) {
    const {
        minMatches = 2,
        ascSign = 1,
        runningDashaPlanets = [],
        planetsData = [],
        cuspsData = [],
        aspectsData = null,
        aspectConvention = ASPECT_CONVENTIONS.KP_WESTERN,
        aspectOrbMode = ORB_MODES.STANDARD,
        aspectCuspOrbMode = CUSP_ORB_MODES.STANDARD_5_00,
        rahuKetuAspectMode = RAHU_KETU_ASPECT_MODES.WESTERN_ASPECTS
    } = options;

    if (!significators || !rule) {
        return {
            rankedPlanets: [],
            excludedPlanets: [],
            targetHouses: [],
            drishtiSummary: {
                convention: aspectConvention,
                targetHouses: [],
                totalQualifyingPlanets: 0,
                qualifyingPlanetsWithDrishtiCount: 0,
                totalAspectsFound: 0,
                totalEventAspectsFound: 0,
                relevantTargets: [],
                affectsScore: false,
                scoreDisclaimerEn: "Drishti is supplementary evidence and does not change the KP significator score.",
                scoreDisclaimerTe: "దృష్టి అనుబంధ ఆధారంగా మాత్రమే పరిగణించబడుతుంది మరియు కేపీ కారకత్వ స్కోర్‌ను మార్చదు."
            },
            stats: { totalSignificators: 0, qualifiedCount: 0 }
        };
    }

    const targetHouses = resolveRuleHouses(rule.housesToBeSignified, rule, ascSign);
    const planetSignifications = significators.planetSignifications || [];
    const houseSignificators = significators.houseSignificators || [];

    // Calculate or reuse aspects from the existing KP aspect engine
    let computedAspectsResult = aspectsData;
    if (!computedAspectsResult || (options.aspectConvention && options.aspectConvention !== aspectsData?.convention)) {
        if (Array.isArray(planetsData) && planetsData.length > 0 && Array.isArray(cuspsData) && cuspsData.length > 0) {
            computedAspectsResult = calculatePlanetaryAspects(planetsData, cuspsData, {
                convention: aspectConvention,
                orbMode: aspectOrbMode,
                cuspOrbMode: aspectCuspOrbMode,
                rahuKetuMode: rahuKetuAspectMode,
                includeCusps: true
            });
        }
    }
    const allAspectsRaw = computedAspectsResult?.aspects || [];

    const scoredPlanets = [];

    for (const pKey of CANONICAL_PLANETS) {
        const pRecord = planetSignifications.find(p => p.planetKey === pKey) || {
            planetKey: pKey,
            planetName: pKey,
            primaryHouses: [],
            allHouses: [],
            level1Houses: [],
            level2Houses: [],
            level3Houses: [],
            level4Houses: [],
            aspectedHouses: []
        };

        const planetObj = planetsData.find(p => p.key === pKey);

        // Primary signified houses (Levels 1 to 4)
        const primaryHouses = pRecord.primaryHouses || [];
        const allHouses = pRecord.allHouses || primaryHouses;

        // Distinct matched houses against target rule
        const matchedHouses = targetHouses.filter(h => primaryHouses.includes(h));
        const matchedWithAspects = targetHouses.filter(h => allHouses.includes(h));

        // Evidence breakdown for each matched house
        const houseEvidence = matchedHouses.map(h => {
            const hSig = houseSignificators.find(s => s.houseNumber === h);
            const levels = [];
            if (pRecord.level1Houses?.includes(h)) levels.push({ level: 1, grade: 'A', desc: 'In Star of Occupant (Strongest)' });
            if (pRecord.level2Houses?.includes(h)) levels.push({ level: 2, grade: 'B', desc: 'Occupant of House' });
            if (pRecord.level3Houses?.includes(h)) levels.push({ level: 3, grade: 'C', desc: 'In Star of House Lord' });
            if (pRecord.level4Houses?.includes(h)) levels.push({ level: 4, grade: 'D', desc: 'Lord of House (Baseline)' });

            const hasAspect = pRecord.aspectedHouses?.includes(h);

            return {
                house: h,
                levels,
                highestLevel: levels.length > 0 ? levels[0].level : (hasAspect ? 5 : null),
                hasAspect,
                cuspSign: typeof hSig?.sign === 'object' ? (hSig?.sign?.en || hSig?.sign?.id || '') : (hSig?.sign || ''),
                cuspSignObj: hSig?.sign || null,
                cuspStarLord: typeof hSig?.starLord === 'object' ? (hSig?.starLord?.name || hSig?.starLord?.en || '') : (hSig?.starLord || ''),
                cuspSubLord: typeof hSig?.subLord === 'object' ? (hSig?.subLord?.name || hSig?.subLord?.en || '') : (hSig?.subLord || '')
            };
        });

        // Determine highest significator level achieved across all matched houses
        let bestLevel = 99;
        for (const ev of houseEvidence) {
            for (const l of ev.levels) {
                if (l.level < bestLevel) bestLevel = l.level;
            }
        }
        if (bestLevel === 99) bestLevel = 5; // fallback

        // Check running Dasha active roles (5 levels: MD, AD, PD, SD, Prana)
        const isMahadashaLord = (runningDashaPlanets[0]?.planet || runningDashaPlanets[0]?.lord) === pKey;
        const isBhuktiLord = (runningDashaPlanets[1]?.planet || runningDashaPlanets[1]?.lord) === pKey;
        const isAntaraLord = (runningDashaPlanets[2]?.planet || runningDashaPlanets[2]?.lord) === pKey;
        const isSookshmaLord = (runningDashaPlanets[3]?.planet || runningDashaPlanets[3]?.lord) === pKey;
        const isPranaLord = (runningDashaPlanets[4]?.planet || runningDashaPlanets[4]?.lord) === pKey;
        const isRunningDBA = isMahadashaLord || isBhuktiLord || isAntaraLord || isSookshmaLord || isPranaLord;

        // Karaka alignment
        const isKaraka = (rule.planetaryKarakas || []).some(k =>
            k.toLowerCase() === pKey.toLowerCase()
        );

        // Extract and categorize Drishti (Planetary & Cusp Aspects) for pKey
        const planetAspects = [];
        for (const asp of allAspectsRaw) {
            const isCaster = asp.castingBody?.key === pKey;
            const isReceiver = asp.receivingBody?.key === pKey;

            // Aspect must involve this planet
            if (!isCaster && !isReceiver) continue;

            // In Planet-Cusp or Vedic House aspects, planet is the casting body
            if (asp.targetType === 'cusp' && !isCaster) continue;
            if ((asp.targetType === 'house' || asp.convention === 'vedic_special') && !isCaster) continue;

            let targetType = asp.targetType; // 'planet' | 'cusp' | 'house'
            let targetKey = '';
            let targetName = '';
            let targetNameTe = '';
            let targetHouseNum = 0;
            let direction = 'casts'; // 'casts' | 'receives'

            if (targetType === 'cusp') {
                targetKey = `Cusp ${asp.targetHouse}`;
                targetName = `House ${asp.targetHouse} Cusp`;
                targetNameTe = `${asp.targetHouse}వ భావ సంధి`;
                targetHouseNum = asp.targetHouse;
                direction = 'casts';
            } else if (targetType === 'house' || asp.convention === 'vedic_special') {
                targetType = 'house';
                targetKey = `House ${asp.targetHouse}`;
                targetName = `House ${asp.targetHouse}`;
                targetNameTe = `${asp.targetHouse}వ భావం`;
                targetHouseNum = asp.targetHouse;
                direction = 'casts';
            } else {
                // Planet-to-Planet aspect
                targetType = 'planet';
                if (isCaster) {
                    targetKey = asp.receivingBody?.key;
                    targetName = asp.receivingBody?.name || targetKey;
                    targetNameTe = asp.receivingBody?.te || targetName;
                    targetHouseNum = asp.receivingBody?.house || asp.targetHouse || 0;
                    direction = 'casts';
                } else {
                    targetKey = asp.castingBody?.key;
                    targetName = asp.castingBody?.name || targetKey;
                    targetNameTe = asp.castingBody?.te || targetName;
                    targetHouseNum = asp.castingBody?.house || asp.castingHouse || 0;
                    direction = 'receives';
                }
            }

            // Determine relevance to selected event houses H (targetHouses)
            let isEventRelevant = false;
            let relevanceCategory = 'general';
            let relevantHouses = [];
            let relevanceDescEn = '';
            let relevanceDescTe = '';

            if (targetType === 'cusp') {
                if (targetHouses.includes(targetHouseNum)) {
                    isEventRelevant = true;
                    relevanceCategory = 'cusp';
                    relevantHouses = [targetHouseNum];
                    relevanceDescEn = `Aspects Cusp ${targetHouseNum} (Selected Event House) with ${asp.aspectType} (${asp.nominalAngle}°)`;
                    relevanceDescTe = `ఎంపిక చేసిన ${targetHouseNum}వ భావ సంధిపై ${asp.aspectNameTe || asp.aspectType} దృష్టి`;
                } else {
                    relevanceDescEn = `Aspects Cusp ${targetHouseNum} (Not in selected event houses [${targetHouses.join(', ')}])`;
                    relevanceDescTe = `${targetHouseNum}వ భావ సంధిపై దృష్టి (ఎంపిక చేసిన భావాలలో లేదు)`;
                }
            } else if (targetType === 'house') {
                if (targetHouses.includes(targetHouseNum)) {
                    isEventRelevant = true;
                    relevanceCategory = 'vedic_house';
                    relevantHouses = [targetHouseNum];
                    relevanceDescEn = `Casts ${asp.aspectType} on House ${targetHouseNum} (Selected Event House)`;
                    relevanceDescTe = `ఎంపిక చేసిన ${targetHouseNum}వ భావంపై ${asp.aspectNameTe || asp.aspectType} ప్రసారం`;
                } else {
                    relevanceDescEn = `Casts ${asp.aspectType} on House ${targetHouseNum} (Not in selected event houses)`;
                    relevanceDescTe = `${targetHouseNum}వ భావంపై దృష్టి (ఎంపిక చేసిన భావాలలో లేదు)`;
                }
            } else {
                // Target is a planet
                const targetSig = planetSignifications.find(s => s.planetKey === targetKey);
                const targetPrimary = targetSig?.primaryHouses || [];
                const targetMatched = targetHouses.filter(h => targetPrimary.includes(h));
                const targetOccupies = targetHouseNum || targetSig?.house || 0;
                const isOccupantOfEventHouse = targetHouses.includes(targetOccupies);
                const isSignificatorOfEventHouse = targetMatched.length > 0;

                if (isOccupantOfEventHouse || isSignificatorOfEventHouse) {
                    isEventRelevant = true;
                    relevantHouses = Array.from(new Set([
                        ...(isOccupantOfEventHouse && targetOccupies > 0 ? [targetOccupies] : []),
                        ...targetMatched
                    ])).sort((a, b) => a - b);

                    if (isOccupantOfEventHouse && isSignificatorOfEventHouse) {
                        relevanceCategory = 'occupant_and_significator';
                        relevanceDescEn = `Aspects ${targetName} (residing in Event House ${targetOccupies} & KP significator of House(s) [${targetMatched.join(', ')}])`;
                        relevanceDescTe = `${targetOccupies}వ భావంలో ఉన్న మరియు [${targetMatched.join(', ')}] భావాల కేపీ కారకుడైన ${targetNameTe} పై దృష్టి`;
                    } else if (isOccupantOfEventHouse) {
                        relevanceCategory = 'occupant';
                        relevanceDescEn = `Aspects ${targetName} residing in Event House ${targetOccupies}`;
                        relevanceDescTe = `${targetOccupies}వ సంఘటన భావంలో ఉన్న ${targetNameTe} పై దృష్టి`;
                    } else {
                        relevanceCategory = 'significator';
                        relevanceDescEn = `Aspects ${targetName}, a KP significator for Event House(s) [${targetMatched.join(', ')}]`;
                        relevanceDescTe = `[${targetMatched.join(', ')}] సంఘటన భావాల కేపీ కారకుడైన ${targetNameTe} పై దృష్టి`;
                    }
                } else {
                    relevanceDescEn = `Aspects ${targetName} (residing in House ${targetOccupies || '-'}; not signifying event houses [${targetHouses.join(', ')}])`;
                    relevanceDescTe = `${targetOccupies || '-'}వ భావంలో ఉన్న ${targetNameTe} పై దృష్టి (సంఘటన భావాలను సూచించదు)`;
                }
            }

            planetAspects.push({
                id: asp.id,
                convention: asp.convention,
                aspectType: asp.aspectType,
                aspectSymbol: asp.aspectSymbol || (asp.convention === 'vedic_special' ? '👁️' : '⚹'),
                aspectNameTe: asp.aspectNameTe,
                nominalAngle: asp.nominalAngle,
                actualAngle: asp.actualAngle,
                orb: asp.orb,
                orbFormatted: asp.orbFormatted,
                motion: asp.motion || 'exact',
                nature: asp.nature || 'neutral',
                isMajor: asp.isMajor,
                sourcePlanet: pKey,
                direction,
                targetType,
                targetKey,
                targetName,
                targetNameTe,
                targetHouse: targetHouseNum,
                isEventRelevant,
                relevanceCategory,
                relevantHouses,
                relevanceDescEn,
                relevanceDescTe,
                affectsScore: false,
                scoreImpactDescEn: "Drishti is supplementary evidence and does not change the KP significator score.",
                scoreImpactDescTe: "దృష్టి అనుబంధ ఆధారంగా మాత్రమే పరిగణించబడుతుంది మరియు కేపీ కారకత్వ స్కోర్‌ను మార్చదు."
            });
        }

        // Sort so event-relevant aspects come first, then by ascending orb
        planetAspects.sort((a, b) => {
            if (a.isEventRelevant !== b.isEventRelevant) return a.isEventRelevant ? -1 : 1;
            return (a.orb || 0) - (b.orb || 0);
        });

        const relevantAspects = planetAspects.filter(a => a.isEventRelevant);
        const relHousesAll = Array.from(new Set(relevantAspects.flatMap(a => a.relevantHouses))).sort((a, b) => a - b);

        const drishti = {
            totalAspectsCount: planetAspects.length,
            eventAspectsCount: relevantAspects.length,
            hasEventDrishti: relevantAspects.length > 0,
            relevantAspects,
            allAspects: planetAspects,
            summaryBadge: relevantAspects.length > 0
                ? `${relevantAspects.length} Aspect${relevantAspects.length > 1 ? 's' : ''} (H${relHousesAll.join(', ')})`
                : planetAspects.length > 0
                ? `${planetAspects.length} General`
                : 'None',
            summaryBadgeTe: relevantAspects.length > 0
                ? `${relevantAspects.length} దృష్ట${relevantAspects.length > 1 ? 'ులు' : 'ి'} (H${relHousesAll.join(', ')})`
                : planetAspects.length > 0
                ? `${planetAspects.length} సాధారణం`
                : 'లేవు',
            affectsScore: false,
            scoreImpactDisclaimerEn: "Drishti is supplementary evidence and does not change the KP significator score.",
            scoreImpactDisclaimerTe: "దృష్టి అనుబంధ ఆధారంగా మాత్రమే పరిగణించబడుతుంది మరియు కేపీ కారకత్వ స్కోర్‌ను మార్చదు."
        };

        scoredPlanets.push({
            planetKey: pKey,
            planetName: pRecord.planetName || pKey,
            score: matchedHouses.length,
            scoreWithAspects: matchedWithAspects.length,
            matchedHouses,
            matchedWithAspects,
            unmatchedTargetHouses: targetHouses.filter(h => !matchedHouses.includes(h)),
            allSignifiedHouses: primaryHouses,
            allHousesWithAspects: allHouses,
            houseEvidence,
            bestLevel,
            starLord: pRecord.starLord || planetObj?.starLord || '',
            subLord: pRecord.subLord || planetObj?.subLord || '',
            occupiedHouse: pRecord.house || planetObj?.house || 0,
            isKaraka,
            isRunningDBA,
            dashaRoles: {
                isMahadashaLord,
                isBhuktiLord,
                isAntaraLord,
                isSookshmaLord,
                isPranaLord
            },
            drishti
        });
    }

    // Deterministic sorting strictly preserving Option 2 ranking:
    // 1. Score descending
    // 2. Highest significator level ascending (Level 1 > 2 > 3 > 4)
    // 3. Running Dasha status
    // 4. Karaka match
    // 5. Canonical planet sequence
    scoredPlanets.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.bestLevel !== b.bestLevel) return a.bestLevel - b.bestLevel;
        if (b.isRunningDBA !== a.isRunningDBA) return (b.isRunningDBA ? 1 : 0) - (a.isRunningDBA ? 1 : 0);
        if (b.isKaraka !== a.isKaraka) return (b.isKaraka ? 1 : 0) - (a.isKaraka ? 1 : 0);
        return CANONICAL_PLANETS.indexOf(a.planetKey) - CANONICAL_PLANETS.indexOf(b.planetKey);
    });

    // Partition into ranked (qualifying by threshold) and excluded
    const rankedPlanets = scoredPlanets
        .filter(p => p.score >= minMatches)
        .map((p, idx) => ({ ...p, rank: idx + 1 }));

    const excludedPlanets = scoredPlanets
        .filter(p => p.score < minMatches)
        .map((p, idx) => ({ ...p, rank: rankedPlanets.length + idx + 1 }));

    const drishtiSummary = {
        convention: aspectConvention,
        conventionLabel: aspectConvention === ASPECT_CONVENTIONS.VEDIC_SPECIAL
            ? 'Vedic Parashari Graha Drishti'
            : aspectConvention === ASPECT_CONVENTIONS.ALL
            ? 'KP Western & Vedic Parashari Combined'
            : 'KP Western Degree Aspects & Placidus Cusps',
        conventionLabelTe: aspectConvention === ASPECT_CONVENTIONS.VEDIC_SPECIAL
            ? 'వైదిక పరాశరి గ్రహ దృష్టి'
            : aspectConvention === ASPECT_CONVENTIONS.ALL
            ? 'కేపీ పాశ్చాత్య మరియు వైదిక సమగ్ర దృష్టులు'
            : 'కేపీ పాశ్చాత్య డిగ్రీ దృష్టులు మరియు భావ సంధులు',
        targetHouses,
        totalQualifyingPlanets: rankedPlanets.length,
        qualifyingPlanetsWithDrishtiCount: rankedPlanets.filter(p => p.drishti?.hasEventDrishti).length,
        totalAspectsFound: scoredPlanets.reduce((acc, p) => acc + (p.drishti?.totalAspectsCount || 0), 0),
        totalEventAspectsFound: scoredPlanets.reduce((acc, p) => acc + (p.drishti?.eventAspectsCount || 0), 0),
        relevantTargets: Array.from(new Set(
            scoredPlanets.flatMap(p => (p.drishti?.relevantAspects || []).map(a => a.targetName))
        )),
        affectsScore: false,
        scoreDisclaimerEn: "Drishti is supplementary evidence and does not change the KP significator score.",
        scoreDisclaimerTe: "దృష్టి అనుబంధ ఆధారంగా మాత్రమే పరిగణించబడుతుంది మరియు కేపీ కారకత్వ స్కోర్‌ను మార్చదు."
    };

    return {
        targetHouses,
        minMatchesThreshold: minMatches,
        rankedPlanets,
        excludedPlanets,
        allScoredPlanets: scoredPlanets,
        drishtiSummary,
        stats: {
            totalSignificators: scoredPlanets.length,
            qualifiedCount: rankedPlanets.length,
            excludedCount: excludedPlanets.length,
            topScore: scoredPlanets[0]?.score || 0
        }
    };
}

/**
 * MODE B: Dedicated Joint DBA Evaluation (5-Level Dasha Support)
 *
 * Evaluates whether the currently running Vimshottari Dasha lords (MD, AD, PD, SD, Prana)
 * jointly cover the houses required in the rule's Joint DBA specification.
 *
 * Computes:
 * - Individual lord coverage: M(p) = S(p) ∩ H, C(p) = |M(p)|, Coverage(p) = 100 * C(p) / |H|
 * - Combined 5-level coverage: M_combined = H ∩ (∪ S(p)), Combined Coverage % = 100 * |M_combined| / |H|
 * - Negative obstruction analysis with traceable explanation
 * - Backward compatibility with triad (MD, AD, PD)
 *
 * @param {Object} significators - KP significator calculation output
 * @param {Object} rule - The selected rule entry
 * @param {Array<Object>} runningDBALords - Array of running lord records (3 or 5 levels)
 * @param {Object} options - { ascSign: 1, evaluationDepth: '5-level' }
 * @returns {Object} Joint DBA evaluation results
 */
export function evaluateJointDBA(significators, rule, runningDBALords = [], options = {}) {
    const { ascSign = 1 } = options;

    if (!rule || !significators) {
        return {
            status: 'unavailable',
            message: 'Incomplete significator data'
        };
    }

    const dbaRaw = rule.jointDBA?.raw || '';
    // Houses already resolved by the caller (e.g. user-edited custom houses) are used as-is
    const baseDbaHouses = rule.jointDBA?.houses || rule.housesToBeSignified || [];
    const dbaHouses = rule.jointDBA?.housesResolved
        ? Array.from(new Set(baseDbaHouses)).sort((a, b) => a - b)
        : resolveRuleHouses(baseDbaHouses, rule, ascSign);
    const parenthesizedHouses = rule.jointDBA?.parenthesizedHouses || rule.optionalHouses || [];
    const altGroups = rule.alternativeGroups || [];
    const negativeHouses = resolveNegativeHouses(rule, ascSign);

    const planetSignifications = significators.planetSignifications || [];

    // Analyze each lord in the running hierarchy (supports up to all 5 levels)
    const runningLordsDetails = (runningDBALords || []).map(item => {
        const pKey = item.planet || item.lord;
        const pRecord = planetSignifications.find(p => p.planetKey?.toLowerCase() === pKey?.toLowerCase());
        
        // Complete significators S(p) from existing KP engine (deduplicated)
        const rawSignified = pRecord?.primaryHouses || pRecord?.allHouses || [];
        const signifiedHouses = Array.from(new Set(rawSignified)).sort((a, b) => a - b);
        
        // M(p) = S(p) ∩ H (Event-matched houses)
        const matchedDBAHouses = dbaHouses.filter(h => signifiedHouses.includes(h));
        const matchedCount = matchedDBAHouses.length;
        const coveragePercent = dbaHouses.length > 0 ? Math.round((matchedCount / dbaHouses.length) * 100) : 0;

        // Negative obstruction check
        const matchedNegatives = negativeHouses.filter(h => signifiedHouses.includes(h));
        const isAfflicted = matchedNegatives.length > 0;
        const afflictionDetails = matchedNegatives.map(negH => ({
            house: negH,
            lord: pKey,
            level: item.level || item.abbr || '',
            periodName: item.periodName || item.levelName || item.level || '',
            reason: `${item.periodName || item.level || 'Running lord'} ${pKey} signifies negative house ${negH}`
        }));

        return {
            level: item.level || item.abbr || '',
            planet: pKey,
            periodName: item.periodName || item.levelName || item.level || '',
            startDate: item.startDate || null,
            endDate: item.endDate || null,
            remainingDuration: item.remainingDuration || item.remainingFormatted || '',
            signifiedHouses,
            matchedDBAHouses,
            matchedCount,
            coveragePercent,
            matchedNegatives,
            isAfflicted,
            afflictionDetails
        };
    });

    // Backward-compatible triad slice (first 3 lords: MD, AD, PD)
    const triadDetails = runningLordsDetails.slice(0, 3);

    // Union of all houses signified by all running lords together (5-level union)
    const jointSignifiedHouses = Array.from(new Set(
        runningLordsDetails.flatMap(l => l.signifiedHouses)
    )).sort((a, b) => a - b);

    // M_combined = H ∩ (∪ S(p))
    const coveredHouses = dbaHouses.filter(h => jointSignifiedHouses.includes(h));
    const missingHouses = dbaHouses.filter(h => !jointSignifiedHouses.includes(h));
    const coveragePercent = dbaHouses.length > 0 ? Math.round((coveredHouses.length / dbaHouses.length) * 100) : 0;

    // Triad 3-level coverage for comparison & legacy consumers
    const triadSignified = Array.from(new Set(triadDetails.flatMap(t => t.signifiedHouses)));
    const triadCoveredHouses = dbaHouses.filter(h => triadSignified.includes(h));
    const triadCoveragePercent = dbaHouses.length > 0 ? Math.round((triadCoveredHouses.length / dbaHouses.length) * 100) : 0;

    // Check alternative groups (e.g., [6, 8, 12] OR [5, 8, 12])
    let altGroupSatisfied = false;
    let satisfiedAltGroup = null;
    if (altGroups && altGroups.length > 0) {
        for (const group of altGroups) {
            const allCovered = group.every(h => jointSignifiedHouses.includes(h));
            if (allCovered) {
                altGroupSatisfied = true;
                satisfiedAltGroup = group;
                break;
            }
        }
    }

    // Check negative condition afflictions across all running lords
    const allAfflictions = runningLordsDetails.flatMap(l => l.afflictionDetails);
    const triadAfflictions = Array.from(new Set(runningLordsDetails.flatMap(l => l.matchedNegatives)));
    const hasObstruction = allAfflictions.length > 0;
    const obstructionReasons = allAfflictions.map(a => a.reason);

    // Overall Status Determination
    let status = 'not-satisfied';

    if (rule.verificationStatus === 'needs-review' && dbaHouses.length === 0) {
        status = 'needs-review';
    } else if (hasObstruction) {
        status = 'afflicted';
    } else if (coveredHouses.length === dbaHouses.length && dbaHouses.length > 0) {
        status = 'satisfied';
    } else if (altGroupSatisfied) {
        status = 'satisfied';
    } else if (coveredHouses.length >= 2 || coveragePercent >= 50) {
        status = 'partially-satisfied';
    }

    return {
        ruleId: rule.id,
        rawDBASpecification: dbaRaw,
        requiredHouses: dbaHouses,
        parenthesizedHouses,
        altGroups,
        negativeHouses,
        runningLordsDetails,
        allLordsDetails: runningLordsDetails,
        triadDetails,
        jointSignifiedHouses,
        coveredHouses,
        missingHouses,
        matchedCount: coveredHouses.length,
        totalRequiredCount: dbaHouses.length,
        coveragePercent,
        triadCoveragePercent,
        hasObstruction,
        afflictions: allAfflictions,
        obstructionReasons,
        triadAfflictions,
        altGroupSatisfied,
        satisfiedAltGroup,
        status, // 'satisfied' | 'partially-satisfied' | 'not-satisfied' | 'afflicted' | 'needs-review'
        specialConditions: rule.specialConditions || []
    };
}

/**
 * Evaluates Cusp Sub Lord conditions specified by the rule
 *
 * @param {Array<Object>} cusps - 12 Placidus house cusps
 * @param {Object} significators - KP significators
 * @param {Object} rule - Selected rule
 * @param {Object} [options] - { ascSign: 1..12 } for Badhaka / Maraka resolution
 * @returns {Array<Object>} Cusp Sub Lord evaluation details
 */
export function evaluateCuspSubLordChecks(cusps, significators, rule, options = {}) {
    if (!cusps || !significators || !rule) return [];

    const { ascSign = 1 } = options;
    const checks = rule.cuspSubLordChecks || [];
    const planetSignifications = significators.planetSignifications || [];
    const targetHouses = resolveRuleHouses(rule.housesToBeSignified || [], rule, ascSign);
    const ruleNegativeHouses = resolveNegativeHouses(rule, ascSign);

    return checks.map(cuspNum => {
        const cuspObj = cusps[cuspNum - 1];
        const subLordKey = cuspObj?.subLord;
        const subLordRecord = planetSignifications.find(p => p.planetKey === subLordKey);
        const subLordHouses = subLordRecord?.primaryHouses || [];

        const matchedHouses = targetHouses.filter(h => subLordHouses.includes(h));
        const negativeHouses = ruleNegativeHouses.filter(h => subLordHouses.includes(h));

        let status = 'neutral';
        if (negativeHouses.length > 0) {
            status = 'negative';
        } else if (matchedHouses.length >= 2 || (matchedHouses.length >= 1 && rule.alternativeGroups?.length > 0)) {
            status = 'favorable';
        } else if (matchedHouses.length === 1) {
            status = 'moderate';
        }

        return {
            cuspNumber: cuspNum,
            subLord: typeof subLordKey === 'object' ? (subLordKey?.name || subLordKey?.en || 'Unknown') : (subLordKey || 'Unknown'),
            sign: typeof cuspObj?.sign === 'object' ? (cuspObj?.sign?.en || cuspObj?.sign?.id || '') : (cuspObj?.sign || ''),
            signObj: cuspObj?.sign || null,
            starLord: typeof cuspObj?.starLord === 'object' ? (cuspObj?.starLord?.name || cuspObj?.starLord?.en || '') : (cuspObj?.starLord || ''),
            subLordHouses,
            matchedHouses,
            negativeHouses,
            status // 'favorable' | 'moderate' | 'neutral' | 'negative'
        };
    });
}
