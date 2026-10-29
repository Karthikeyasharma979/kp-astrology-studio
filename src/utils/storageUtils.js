/**
 * Safe Session Storage Utilities for KP Astrology Studio
 *
 * Prevents QuotaExceededError by trimming out oversized recursive subtrees
 * (such as the 17MB+ nested Dasha hierarchy) prior to serialization.
 */

export function safeSaveSessionResult(result) {
    if (!result || typeof window === 'undefined') return;
    try {
        // Strip out the massive recursive Dasha tree (17MB)
        // Dasha is computed instantly on demand in memory when needed
        const { dasha, ...leanResult } = result;
        sessionStorage.setItem('kp_studio_result', JSON.stringify(leanResult));
    } catch (err) {
        console.warn("Session storage quota warning, clearing stale cache:", err);
        try {
            sessionStorage.removeItem('kp_studio_result');
            const { dasha, aspects, ...minimalResult } = result;
            sessionStorage.setItem('kp_studio_result', JSON.stringify(minimalResult));
        } catch (e2) {
            console.error("Unable to cache in sessionStorage:", e2);
        }
    }
}

export function safeSaveSessionParams(params) {
    if (!params || typeof window === 'undefined') return;
    try {
        sessionStorage.setItem('kp_studio_params', JSON.stringify(params));
    } catch (err) {
        console.warn("Could not save params to sessionStorage:", err);
    }
}

export function safeSaveEventAnalysisState(state) {
    if (!state || typeof window === 'undefined') return;
    try {
        sessionStorage.setItem('kp_event_analysis_state', JSON.stringify(state));
    } catch (err) {
        console.warn("Could not save event analysis state to sessionStorage:", err);
    }
}

export function safeGetEventAnalysisState() {
    if (typeof window === 'undefined') return null;
    try {
        const cached = sessionStorage.getItem('kp_event_analysis_state');
        return cached ? JSON.parse(cached) : null;
    } catch {
        return null;
    }
}

export function safeClearEventAnalysisState() {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem('kp_event_analysis_state');
    } catch {}
}
