import React from 'react';
import { History, Trash2, CheckCircle2, XCircle, X } from 'lucide-react';

/**
 * History Table Component
 * Shows recent queries (up to 50), live accuracy comparison (TSP vs Classic),
 * and user outcome verification selector ('Pending' | 'Happened' | 'Didn\'t happen').
 */
export const HistoryTable = ({
    history = [],
    accuracyStats,
    onUpdateOutcome,
    onDeleteItem,
    onClearHistory,
    lang = 'te'
}) => {
    const isTe = lang === 'te';

    const handleClearAll = () => {
        const msg = isTe
            ? `మొత్తం ${history.length} ప్రశ్నల రికార్డు తొలగించాలా? దీనిని తిరిగి పొందలేరు.`
            : `Delete all ${history.length} recorded queries? This cannot be undone.`;
        if (window.confirm(msg)) onClearHistory();
    };

    const outcomeLabels = {
        Pending: isTe ? 'పెండింగ్' : 'Pending',
        Happened: isTe ? 'జరిగింది' : 'Happened',
        "Didn't happen": isTe ? 'జరగలేదు' : "Didn't happen"
    };

    return (
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 sm:p-6 border border-amber-200/80 dark:border-white/10 shadow-sm space-y-5">
            {/* Header + Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-orange-500" />
                    <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                        {isTe ? "గత ప్రశ్నల రికార్డు & ఖచ్చితత్వం" : "Client Query History & Real-World Accuracy"}
                    </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* TSP Accuracy Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/40 text-xs font-mono">
                        <span className="font-sans font-bold text-orange-700 dark:text-orange-300">TSP:</span>
                        <span className="font-black text-orange-900 dark:text-orange-100">
                            {accuracyStats.tsp.accuracyPercent !== null ? `${accuracyStats.tsp.accuracyPercent}%` : '—'}
                        </span>
                        <span className="text-[10px] text-gray-400">({accuracyStats.tsp.correct}/{accuracyStats.tsp.resolved})</span>
                    </div>

                    {/* Classic Accuracy Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-xs font-mono">
                        <span className="font-sans font-bold text-amber-700 dark:text-amber-300">Classic:</span>
                        <span className="font-black text-amber-900 dark:text-amber-100">
                            {accuracyStats.classic.accuracyPercent !== null ? `${accuracyStats.classic.accuracyPercent}%` : '—'}
                        </span>
                        <span className="text-[10px] text-gray-400">({accuracyStats.classic.correct}/{accuracyStats.classic.resolved})</span>
                    </div>

                    {history.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
                            title={isTe ? "మొత్తం రికార్డు తొలగించు" : "Clear all history"}
                            aria-label={isTe ? "మొత్తం రికార్డు తొలగించు" : "Clear all history"}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            {history.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs sm:text-sm">
                    {isTe ? "ఇంతవరకు ఎలాంటి ప్రశ్నలు నమోదు కాలేదు." : "No queries recorded yet. Ask a question above to start tracking."}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-white/10">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-stone-50 dark:bg-slate-800/70 text-gray-600 dark:text-gray-400 font-semibold border-b border-stone-200 dark:border-white/10">
                            <tr>
                                <th className="py-2.5 px-3">{isTe ? "తేదీ / సమయం" : "Date / Time"}</th>
                                <th className="py-2.5 px-3">{isTe ? "ప్రశ్న" : "Question"}</th>
                                <th className="py-2.5 px-3">{isTe ? "పద్ధతి" : "Method"}</th>
                                <th className="py-2.5 px-3">{isTe ? "సంఖ్య" : "Seed"}</th>
                                <th className="py-2.5 px-3">{isTe ? "సమాధానం" : "Answer"}</th>
                                <th className="py-2.5 px-3">{isTe ? "పునర్ఫూ" : "Punarphoo"}</th>
                                <th className="py-2.5 px-3">{isTe ? "నిజ ఫలితం" : "Real-World Outcome"}</th>
                                <th className="py-2.5 px-2"><span className="sr-only">{isTe ? "తొలగించు" : "Delete"}</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-white/5">
                            {history.map((item) => {
                                const isYes = item.answer === 'YES';
                                const when = new Date(item.judgedAt || item.timestamp);
                                const dateFormatted = when.toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: when.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                });
                                const timeFormatted = when.toLocaleTimeString('en-GB', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });

                                return (
                                    <tr key={item.id} className="hover:bg-stone-50/60 dark:hover:bg-slate-800/30">
                                        <td className="py-2 px-3 font-mono text-gray-500 whitespace-nowrap">
                                            <span className="block">{dateFormatted}</span>
                                            <span className="block text-[10px] text-gray-400">{timeFormatted}</span>
                                        </td>
                                        <td className="py-2 px-3 font-sans font-medium text-gray-900 dark:text-white max-w-[200px] truncate" title={item.question}>
                                            {item.question}
                                        </td>
                                        <td className="py-2 px-3 font-mono uppercase text-gray-700 dark:text-gray-300">
                                            {item.method}
                                        </td>
                                        <td className="py-2 px-3 font-mono font-bold text-amber-800 dark:text-amber-300">
                                            {item.numberLabel || `#${item.number}`}
                                        </td>
                                        <td className="py-2 px-3">
                                            <span
                                                className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs inline-flex items-center gap-1 ${
                                                    isYes
                                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                                                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
                                                }`}
                                            >
                                                {isYes ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                <span>{item.answer}</span>
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 font-mono text-gray-500">
                                            {item.punarphoo ? (
                                                <span className="text-amber-600 dark:text-amber-400 font-bold">{isTe ? "తలక్రిందులు" : "Inverted"}</span>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="py-2 px-3">
                                            <select
                                                value={item.outcome}
                                                onChange={(e) => onUpdateOutcome(item.id, e.target.value)}
                                                className={`px-2 py-1 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer ${
                                                    item.outcome === 'Happened'
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-300'
                                                        : item.outcome === "Didn't happen"
                                                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-300'
                                                        : 'bg-stone-50 dark:bg-slate-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-white/10'
                                                }`}
                                            >
                                                <option value="Pending">{outcomeLabels.Pending}</option>
                                                <option value="Happened">{outcomeLabels.Happened}</option>
                                                <option value="Didn't happen">{outcomeLabels["Didn't happen"]}</option>
                                            </select>
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            {onDeleteItem && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDeleteItem(item.id)}
                                                    className="p-1 rounded-lg text-stone-300 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                                    title={isTe ? "ఈ ప్రశ్నను తొలగించు" : "Delete this entry"}
                                                    aria-label={isTe ? "ఈ ప్రశ్నను తొలగించు" : "Delete this entry"}
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
