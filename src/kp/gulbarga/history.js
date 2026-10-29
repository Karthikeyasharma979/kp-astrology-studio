/**
 * History & Accuracy Tracking for Gulbarga Theory
 *
 * Persists up to 50 recent queries in localStorage (with try/catch fallback).
 * Tracks real-world outcomes ('Pending' | 'Happened' | 'Didn\'t happen')
 * and calculates live accuracy % for TSP vs Classic.
 */

const STORAGE_KEY = 'kp_gulbarga_history';
const MAX_HISTORY_ITEMS = 50;

/**
 * Loads history from localStorage
 * @returns {Array<import('./types.js').HistoryItem>}
 */
export function loadGulbargaHistory() {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Saves history to localStorage
 * @param {Array<import('./types.js').HistoryItem>} history
 */
export function saveGulbargaHistory(history) {
    if (typeof window === 'undefined') return;
    try {
        const slice = (history || []).slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(slice));
    } catch (_) {}
}

/**
 * Adds an item to history and persists it
 * @param {Omit<import('./types.js').HistoryItem, 'id'|'outcome'> & { outcome?: string }} item
 * @returns {Array<import('./types.js').HistoryItem>} Updated history
 */
export function addGulbargaHistoryItem(item) {
    const existing = loadGulbargaHistory();
    const newItem = {
        id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        outcome: item.outcome || 'Pending',
        ...item
    };

    const updated = [newItem, ...existing.filter(i => i.id !== newItem.id)].slice(0, MAX_HISTORY_ITEMS);
    saveGulbargaHistory(updated);
    return updated;
}

/**
 * Updates outcome of an existing item ('Pending' | 'Happened' | 'Didn\'t happen')
 * @param {string} id
 * @param {'Pending'|'Happened'|'Didn\'t happen'} outcome
 * @returns {Array<import('./types.js').HistoryItem>} Updated history
 */
export function updateGulbargaOutcome(id, outcome) {
    const existing = loadGulbargaHistory();
    const updated = existing.map(item => {
        if (item.id === id) {
            return { ...item, outcome };
        }
        return item;
    });
    saveGulbargaHistory(updated);
    return updated;
}

/**
 * Removes a single history item
 * @param {string} id
 * @returns {Array<import('./types.js').HistoryItem>} Updated history
 */
export function deleteGulbargaHistoryItem(id) {
    const updated = loadGulbargaHistory().filter(item => item.id !== id);
    saveGulbargaHistory(updated);
    return updated;
}

/**
 * Clears all Gulbarga history
 */
export function clearGulbargaHistory() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
}

/**
 * Calculates accuracy metrics per method
 * Accuracy is calculated on resolved queries (Happened or Didn't happen).
 * A query is correct if:
 * - Answer was YES and Outcome was 'Happened'
 * - Answer was NO and Outcome was 'Didn\'t happen'
 *
 * @param {Array<import('./types.js').HistoryItem>} history
 * @returns {{
 *   tsp: { total: number, resolved: number, correct: number, accuracyPercent: number|null },
 *   classic: { total: number, resolved: number, correct: number, accuracyPercent: number|null },
 *   overall: { total: number, resolved: number, correct: number, accuracyPercent: number|null }
 * }}
 */
export function calculateGulbargaAccuracy(history = []) {
    const stats = {
        tsp: { total: 0, resolved: 0, correct: 0, accuracyPercent: null },
        classic: { total: 0, resolved: 0, correct: 0, accuracyPercent: null },
        overall: { total: 0, resolved: 0, correct: 0, accuracyPercent: null }
    };

    for (const item of history) {
        const method = item.method === 'classic' ? 'classic' : 'tsp';
        stats[method].total++;
        stats.overall.total++;

        if (item.outcome === 'Happened' || item.outcome === "Didn't happen") {
            stats[method].resolved++;
            stats.overall.resolved++;

            const isCorrect = (item.answer === 'YES' && item.outcome === 'Happened')
                || (item.answer === 'NO' && item.outcome === "Didn't happen");

            if (isCorrect) {
                stats[method].correct++;
                stats.overall.correct++;
            }
        }
    }

    for (const key of ['tsp', 'classic', 'overall']) {
        if (stats[key].resolved > 0) {
            stats[key].accuracyPercent = Math.round((stats[key].correct / stats[key].resolved) * 100);
        }
    }

    return stats;
}
