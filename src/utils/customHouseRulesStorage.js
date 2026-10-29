/**
 * Custom House Rules Storage & Validation Utility for AstroSharma KP Astrology
 *
 * Requirements:
 * 1. Dedicated versioned key: `astrosharma_custom_house_rules_v1`
 * 2. 100% browser-local storage (localStorage only, no backend/database)
 * 3. Robust input validation for rule names and house combinations (1–12)
 * 4. Resilient to malformed JSON or disabled localStorage
 * 5. Full JSON export and validated import
 * 6. Compatibility converter for KP house grouping analysis engine
 */

export const CUSTOM_HOUSE_RULES_STORAGE_KEY = 'astrosharma_custom_house_rules_v1';
export const STORAGE_SCHEMA_VERSION = 1;

/**
 * Validates rule inputs (name, houses 1-12, optional description).
 *
 * @param {Object} input
 * @param {string} input.name - Rule name
 * @param {Array<number>|string} input.houses - Selected houses from 1 to 12
 * @param {string} [input.description] - Optional notes
 * @returns {{ isValid: boolean, errors: string[], sanitized: { name: string, houses: number[], description: string } }}
 */
export function validateRuleInput(input = {}) {
    const errors = [];

    // 1. Name validation
    const rawName = typeof input.name === 'string' ? input.name.trim() : '';
    if (!rawName) {
        errors.push('Rule name is required.');
    } else if (rawName.length > 120) {
        errors.push('Rule name must be 120 characters or fewer.');
    }

    // 2. Houses validation (1 to 12)
    let candidateHouses = [];
    if (Array.isArray(input.houses)) {
        candidateHouses = input.houses;
    } else if (typeof input.houses === 'string') {
        candidateHouses = input.houses
            .split(/[,+\s]+/)
            .filter(Boolean)
            .map(s => parseInt(s, 10));
    }

    const validHouses = Array.from(
        new Set(
            candidateHouses
                .map(h => (typeof h === 'string' ? parseInt(h, 10) : Number(h)))
                .filter(h => Number.isInteger(h) && h >= 1 && h <= 12)
        )
    ).sort((a, b) => a - b);

    if (validHouses.length === 0) {
        errors.push('At least one valid house between 1 and 12 must be selected.');
    }

    // 3. Description sanitization
    const rawDesc = typeof input.description === 'string' ? input.description.trim() : '';

    return {
        isValid: errors.length === 0,
        errors,
        sanitized: {
            name: rawName,
            houses: validHouses,
            description: rawDesc
        }
    };
}

/**
 * Safely loads all custom rules from browser localStorage.
 * Handles missing storage, security restrictions, and corrupted JSON.
 *
 * @returns {Array<Object>} List of valid custom rule objects
 */
export function loadCustomHouseRules() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(CUSTOM_HOUSE_RULES_STORAGE_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        let ruleCandidates = [];

        if (Array.isArray(parsed)) {
            ruleCandidates = parsed;
        } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rules)) {
            ruleCandidates = parsed.rules;
        } else {
            return [];
        }

        // Validate and sanitize each rule individually
        const sanitizedRules = [];
        for (const candidate of ruleCandidates) {
            if (!candidate || typeof candidate !== 'object') continue;
            const validation = validateRuleInput(candidate);
            if (!validation.isValid) continue;

            sanitizedRules.push({
                id: candidate.id || generateCustomRuleId(),
                name: validation.sanitized.name,
                houses: validation.sanitized.houses,
                description: validation.sanitized.description,
                createdAt: candidate.createdAt || new Date().toISOString(),
                updatedAt: candidate.updatedAt || new Date().toISOString()
            });
        }

        return sanitizedRules;
    } catch (err) {
        console.warn('Could not safely parse custom house rules from localStorage:', err);
        return [];
    }
}

/**
 * Generates a unique, collision-resistant custom rule ID.
 * Prefix `custom_rule_` ensures distinctness from standard rules.
 */
export function generateCustomRuleId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `custom_rule_${timestamp}_${random}`;
}

/**
 * Safely saves the custom rules list to browser localStorage under the versioned key.
 *
 * @param {Array<Object>} rules - Array of custom rule objects
 * @returns {boolean} Success status
 */
export function saveCustomHouseRules(rules = []) {
    if (typeof window === 'undefined' || !window.localStorage) {
        return false;
    }

    try {
        const sanitized = (rules || []).map(r => {
            const v = validateRuleInput(r);
            return {
                id: r.id || generateCustomRuleId(),
                name: v.sanitized.name,
                houses: v.sanitized.houses,
                description: v.sanitized.description,
                createdAt: r.createdAt || new Date().toISOString(),
                updatedAt: r.updatedAt || new Date().toISOString()
            };
        });

        const envelope = {
            format: 'astrosharma_custom_house_rules',
            version: STORAGE_SCHEMA_VERSION,
            updatedAt: new Date().toISOString(),
            rules: sanitized
        };

        window.localStorage.setItem(CUSTOM_HOUSE_RULES_STORAGE_KEY, JSON.stringify(envelope));
        return true;
    } catch (err) {
        console.error('Failed to write custom house rules to localStorage:', err);
        return false;
    }
}

/**
 * Creates and saves a new custom rule.
 *
 * @param {Object} input - { name, houses, description }
 * @param {Array<Object>} [existingRules] - Optional current list
 * @returns {{ success: boolean, rule: Object|null, errors: string[], allRules: Array<Object> }}
 */
export function createCustomRule(input, existingRules = null) {
    const validation = validateRuleInput(input);
    const currentList = existingRules || loadCustomHouseRules();

    if (!validation.isValid) {
        return {
            success: false,
            rule: null,
            errors: validation.errors,
            allRules: currentList
        };
    }

    const newRule = {
        id: generateCustomRuleId(),
        name: validation.sanitized.name,
        houses: validation.sanitized.houses,
        description: validation.sanitized.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const updatedList = [newRule, ...currentList];
    const saved = saveCustomHouseRules(updatedList);

    return {
        success: saved,
        rule: newRule,
        errors: saved ? [] : ['Could not write to localStorage (storage may be disabled or quota exceeded).'],
        allRules: updatedList
    };
}

/**
 * Updates an existing custom rule.
 *
 * @param {string} ruleId
 * @param {Object} updates - { name, houses, description }
 * @param {Array<Object>} [existingRules]
 * @returns {{ success: boolean, rule: Object|null, errors: string[], allRules: Array<Object> }}
 */
export function updateCustomRule(ruleId, updates, existingRules = null) {
    const currentList = existingRules || loadCustomHouseRules();
    const idx = currentList.findIndex(r => r.id === ruleId);

    if (idx === -1) {
        return {
            success: false,
            rule: null,
            errors: ['Custom rule not found.'],
            allRules: currentList
        };
    }

    const mergedInput = {
        name: updates.name !== undefined ? updates.name : currentList[idx].name,
        houses: updates.houses !== undefined ? updates.houses : currentList[idx].houses,
        description: updates.description !== undefined ? updates.description : currentList[idx].description
    };

    const validation = validateRuleInput(mergedInput);
    if (!validation.isValid) {
        return {
            success: false,
            rule: null,
            errors: validation.errors,
            allRules: currentList
        };
    }

    const updatedRule = {
        ...currentList[idx],
        name: validation.sanitized.name,
        houses: validation.sanitized.houses,
        description: validation.sanitized.description,
        updatedAt: new Date().toISOString()
    };

    const updatedList = [...currentList];
    updatedList[idx] = updatedRule;
    const saved = saveCustomHouseRules(updatedList);

    return {
        success: saved,
        rule: updatedRule,
        errors: saved ? [] : ['Failed to persist updates to localStorage.'],
        allRules: updatedList
    };
}

/**
 * Deletes a custom rule by ID.
 *
 * @param {string} ruleId
 * @param {Array<Object>} [existingRules]
 * @returns {{ success: boolean, allRules: Array<Object> }}
 */
export function deleteCustomRule(ruleId, existingRules = null) {
    const currentList = existingRules || loadCustomHouseRules();
    const filtered = currentList.filter(r => r.id !== ruleId);
    const saved = saveCustomHouseRules(filtered);
    return {
        success: saved,
        allRules: filtered
    };
}

/**
 * Exports custom rules as a formatted JSON string with metadata.
 *
 * @param {Array<Object>} [rules]
 * @returns {string} Formatted JSON string
 */
export function exportCustomRulesToJson(rules = null) {
    const currentList = rules || loadCustomHouseRules();
    const payload = {
        format: 'astrosharma_custom_house_rules',
        version: STORAGE_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        totalRules: currentList.length,
        rules: currentList
    };
    return JSON.stringify(payload, null, 2);
}

/**
 * Validates and imports custom rules from a raw JSON string.
 *
 * @param {string} jsonString - Uploaded JSON content
 * @param {Array<Object>} [existingRules] - Current rules in state
 * @returns {{ success: boolean, importedCount: number, errors: string[], allRules: Array<Object> }}
 */
export function importCustomRulesFromJson(jsonString, existingRules = null) {
    if (!jsonString || typeof jsonString !== 'string') {
        return {
            success: false,
            importedCount: 0,
            errors: ['File content is empty or invalid.'],
            allRules: existingRules || loadCustomHouseRules()
        };
    }

    let parsed;
    try {
        parsed = JSON.parse(jsonString);
    } catch {
        return {
            success: false,
            importedCount: 0,
            errors: ['Invalid JSON file format.'],
            allRules: existingRules || loadCustomHouseRules()
        };
    }

    let rawCandidates = [];
    if (Array.isArray(parsed)) {
        rawCandidates = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rules)) {
        rawCandidates = parsed.rules;
    } else {
        return {
            success: false,
            importedCount: 0,
            errors: ['JSON does not contain a valid rules list.'],
            allRules: existingRules || loadCustomHouseRules()
        };
    }

    const currentList = existingRules || loadCustomHouseRules();
    const existingIds = new Set(currentList.map(r => r.id));
    const importedRules = [];
    const validationErrors = [];

    rawCandidates.forEach((candidate, idx) => {
        if (!candidate || typeof candidate !== 'object') {
            validationErrors.push(`Item #${idx + 1} is not a valid rule object.`);
            return;
        }

        const validation = validateRuleInput(candidate);
        if (!validation.isValid) {
            validationErrors.push(`Item #${idx + 1} (${candidate.name || 'Unnamed'}): ${validation.errors.join(', ')}`);
            return;
        }

        // Ensure distinct ID if already present in state
        let ruleId = candidate.id;
        if (!ruleId || existingIds.has(ruleId)) {
            ruleId = generateCustomRuleId();
        }
        existingIds.add(ruleId);

        importedRules.push({
            id: ruleId,
            name: validation.sanitized.name,
            houses: validation.sanitized.houses,
            description: validation.sanitized.description,
            createdAt: candidate.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    });

    if (importedRules.length === 0) {
        return {
            success: false,
            importedCount: 0,
            errors: validationErrors.length > 0 ? validationErrors : ['No valid rules found in JSON file.'],
            allRules: currentList
        };
    }

    // Merge: Put imported rules at top, preserve existing non-conflicting rules
    const mergedList = [...importedRules, ...currentList];
    const saved = saveCustomHouseRules(mergedList);

    return {
        success: saved,
        importedCount: importedRules.length,
        errors: validationErrors,
        allRules: mergedList
    };
}

/**
 * Converts a lightweight custom rule object into a full KP Rule record
 * compatible with calculateCommonPlanetRanking, evaluateJointDBA, and dasha engines.
 *
 * @param {Object} customRule
 * @param {boolean} [isTe=false]
 * @returns {Object|null}
 */
export function convertCustomRuleToKPRule(customRule, isTe = false) {
    if (!customRule) return null;
    const houses = Array.isArray(customRule.houses) ? customRule.houses : [];
    const housesStr = houses.join(', ');
    const primaryCusp = houses[0] || 1;

    return {
        id: customRule.id,
        isCustom: true,
        cusp: primaryCusp,
        category: isTe ? "కస్టమ్ భావ సమూహం (Custom)" : "Custom House Combination",
        subject: isTe ? "నా కస్టమ్ నియమాలు" : "User Defined Rules",
        event: customRule.name,
        srNo: "Custom",
        source: {
            document: "Browser LocalStorage",
            page: 1,
            tableIndex: 0,
            rowIndex: 0,
            tablePrefix: "CUSTOM",
            srNo: "Custom"
        },
        housesToBeSignified: houses,
        jointDBA: {
            raw: housesStr,
            houses: houses,
            parenthesizedHouses: []
        },
        optionalHouses: [],
        alternativeGroups: [],
        negativeHouses: [],
        planetaryKarakas: [],
        cuspSubLordChecks: [],
        specialConditions: [],
        remarks: customRule.description || (isTe
            ? `యూజర్ రూపొందించిన కస్టమ్ భావాల సమూహం: [${housesStr}]`
            : `User-defined custom house combination: [${housesStr}]`
        ),
        originalNotation: {
            subjectMatter: customRule.name,
            housesToBeSignified: housesStr,
            jointDBA: housesStr,
            remark: customRule.description || "",
            cusp: String(primaryCusp),
            srNo: "Custom"
        },
        verificationStatus: "custom",
        reviewFlags: []
    };
}
