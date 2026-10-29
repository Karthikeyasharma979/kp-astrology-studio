/**
 * JSDoc Type Definitions and Default Settings for Gulbarga Theory (TSP & Classic Gulbarga)
 *
 * Plain JavaScript only - no TypeScript files or interface declarations.
 */

/**
 * @typedef {Object} AscLords
 * @property {string} sign - Sign name (e.g. 'Aries', 'Taurus')
 * @property {string} [signLord] - Sign lord planet name
 * @property {string} star - Star lord planet name (e.g. 'Ketu', 'Sun')
 * @property {string} [starLord] - Alias for star
 * @property {string} sub - Sub lord planet name
 * @property {string} [subLord] - Alias for sub
 * @property {string} subSub - Sub-sub lord planet name
 * @property {string} [subSubLord] - Alias for subSub
 */

/**
 * @typedef {Object} MoonLords
 * @property {string} sign - Sign name
 * @property {string} [signLord] - Sign lord
 * @property {string} star - Star lord
 * @property {string} [starLord] - Alias for star
 * @property {string} sub - Sub lord
 * @property {string} [subLord] - Alias for sub
 * @property {string} subSub - Sub-sub lord
 * @property {string} [subSubLord] - Alias for subSub
 */

/**
 * @typedef {Object} PlanetSnapshotInfo
 * @property {string} sign - Short code 'Ar'..'Pi' or full name
 * @property {string} starLord - Planet name
 * @property {string} [subLord] - Planet name
 * @property {string} subSubLord - Planet name
 * @property {number} [longitude] - Sidereal longitude in degrees [0, 360)
 * @property {number} [degreeInSign] - Degree within sign [0, 30)
 * @property {string} [signLord] - Sign lord planet name
 */

/**
 * @typedef {Object<string, PlanetSnapshotInfo>} PlanetsSnapshot
 */

/**
 * @typedef {Object} TspSettings
 * @property {'1-9'|'1-27'|'1-249'|'1-2193'} system - Horary number system
 * @property {boolean} saturnEffect - Saturn Punarphoo inversion toggle (default: true)
 * @property {boolean} nodeAgency - Rahu/Ketu agent representation toggle (default: true)
 * @property {boolean} specialRule3 - Optional Rule 3 (Asc SS = Moon star or Asc star) toggle (default: false)
 * @property {boolean} fortunaTarget - Optional Fortuna star lord in targets toggle (default: false)
 * @property {string} [fortunaStarLord] - Fortuna's star lord if fortunaTarget is true
 * @property {boolean} reduceLargeNumbers - Repeatedly subtract system size toggle (default: false)
 */

/**
 * @typedef {Object} ClassicSettings
 * @property {'1-249'} system - Classic Gulbarga always uses 1-249
 * @property {'classic5'|'extended7'} rpMode - Ruling Planets set (default: 'classic5')
 * @property {boolean} nodeAgency - Node agency in RP evaluation (default: false)
 * @property {boolean} fortunaInRule1 - Fortuna star lord in Rule 1 (default: false)
 * @property {string} [fortunaStarLord] - Fortuna's star lord if enabled
 * @property {boolean} reduceLargeNumbers - Repeatedly subtract system size toggle (default: false)
 */

/**
 * @typedef {Object} TspRuleDetail
 * @property {1|2|3} id - Rule index (1, 2, or 3)
 * @property {string} deciding - Planet under test (e.g. SS lord of A, star lord of A)
 * @property {string[]} viaAgents - Node agents evaluated if deciding planet is Rahu/Ketu
 * @property {string|null} matchedTarget - Target planet matched from T (or null if none)
 * @property {boolean} passed - Whether this rule is satisfied
 */

/**
 * @typedef {Object} PunarphooStatus
 * @property {boolean} applied - Whether Punarphoo inversion was triggered
 * @property {string|null} reason - Detailed explanation of connection with Saturn
 */

/**
 * @typedef {Object} TspEvaluationResult
 * @property {'YES'|'NO'} answer - Final judgment answer (after any Punarphoo inversion)
 * @property {'YES'|'NO'} baseAnswer - Answer before Punarphoo inversion
 * @property {'SPECIAL_ASC_SS_MOON'|'SPECIAL_RULE_3'|'MAJORITY'} decidedBy - Decision rule branch
 * @property {number|null} rulesSatisfied - Count of satisfied rules (0..3) or null for special rules
 * @property {TspRuleDetail[]} rules - 3 rules details
 * @property {PunarphooStatus} punarphoo - Punarphoo status & reason
 * @property {TspSettings} settingsUsed - Snapshot of settings applied
 * @property {string[]} targets - Target planets Set T
 * @property {string[]} explanation - Line-by-line explanation matching reference book style
 * @property {AscLords} ascLords - Number's ascendant lords
 * @property {MoonLords} moonLords - Snapshot Moon lords
 */

/**
 * @typedef {Object} ClassicEvaluationResult
 * @property {'YES'|'NO'} answer - Final judgment answer
 * @property {'RULE_1'|'RULE_2'|'NONE'} decidedBy - Which rule produced YES, or NONE
 * @property {{ passed: boolean, matchedTarget: string|null }} rule1 - Rule 1 detail
 * @property {{ passed: boolean, present: string[], missing: string[] }} rule2 - Rule 2 detail
 * @property {ClassicSettings} settingsUsed - Settings applied
 * @property {string[]} rpList - Effective Ruling Planets set
 * @property {string[]} explanation - Explanation lines
 */

/**
 * @typedef {Object} HistoryItem
 * @property {string} id - Unique timestamped ID
 * @property {string} timestamp - ISO timestamp of judgment
 * @property {string} question - Question text
 * @property {'tsp'|'classic'} method - Method used
 * @property {'1-9'|'1-27'|'1-249'|'1-2193'} system - Horary system
 * @property {number} number - Input number
 * @property {string} [numberLabel] - Formatted number label (e.g. "#24/249")
 * @property {AscLords} [ascLords] - Ascendant lords
 * @property {'YES'|'NO'} answer - Answer returned
 * @property {string} decidedBy - Rule that decided the result
 * @property {number|null} rulesSatisfied - Rules satisfied (if majority)
 * @property {boolean} punarphoo - Whether Punarphoo was applied
 * @property {'Pending'|'Happened'|'Didn\'t happen'} outcome - User-marked real-world outcome
 */

export const DEFAULT_TSP_SETTINGS = {
    system: '1-249',
    saturnEffect: true,
    nodeAgency: true,
    specialRule3: false,
    fortunaTarget: false,
    reduceLargeNumbers: false
};

export const DEFAULT_CLASSIC_SETTINGS = {
    system: '1-249',
    rpMode: 'classic5',
    nodeAgency: false,
    fortunaInRule1: false,
    reduceLargeNumbers: false
};
