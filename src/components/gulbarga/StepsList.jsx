import React from 'react';
import { CheckCircle2, XCircle, ListOrdered, Info } from 'lucide-react';

/**
 * Step-by-Step Explanation Component
 * Renders the evaluation trace in the reference book's exact format with ✔/✖ badges.
 */
export const StepsList = ({
    result,
    lang = 'te'
}) => {
    if (!result || !result.explanation || result.explanation.length === 0) return null;

    const isTe = lang === 'te';

    return (
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 sm:p-6 border border-amber-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-white/10">
                <ListOrdered className="w-4 h-4 text-orange-500" />
                <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                    {isTe ? "దశలవారీ సిద్ధాంత వివరణ" : "Step-by-Step Rule Analysis"}
                </h3>
            </div>

            <div className="space-y-2.5 font-mono text-xs sm:text-sm">
                {result.explanation.map((line, idx) => {
                    const isSatisfied = line.includes('SATISFIED');
                    const isNotSatisfied = line.includes('NOT satisfied') || line.includes('Missing');
                    const isPunarphoo = line.includes('Punarphoo');
                    const isHeader = line.startsWith('ASCENDANT') || line.startsWith('MOON') || line.startsWith('Number lords') || line.startsWith('Time Chart Lagna lords') || line.startsWith('Ruling Planets');
                    const isSummary = line.includes('Hence according to');

                    let icon = null;
                    let badgeBg = 'bg-stone-50 dark:bg-slate-800/40 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-white/5';

                    if (isSatisfied) {
                        icon = <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
                        badgeBg = 'bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 border-emerald-200/60 dark:border-emerald-800/40';
                    } else if (isNotSatisfied) {
                        icon = <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
                        badgeBg = 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 border-rose-200/60 dark:border-rose-800/40';
                    } else if (isPunarphoo) {
                        badgeBg = 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/60 font-bold';
                    } else if (isHeader) {
                        badgeBg = 'bg-stone-100/70 dark:bg-slate-800/60 text-stone-900 dark:text-stone-100 font-bold border-stone-200 dark:border-white/10';
                    } else if (isSummary) {
                        badgeBg = 'bg-orange-50/80 dark:bg-orange-950/30 text-orange-950 dark:text-orange-200 font-bold border-orange-200 dark:border-orange-800/50';
                    }

                    return (
                        <div
                            key={idx}
                            className={`p-3 rounded-2xl border flex items-start gap-2.5 transition-all ${badgeBg}`}
                        >
                            {icon}
                            <span className="leading-relaxed whitespace-pre-wrap">{line}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
