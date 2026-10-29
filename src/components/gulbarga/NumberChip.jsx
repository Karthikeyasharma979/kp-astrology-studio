import { Hash, Sparkles, Clock } from 'lucide-react';

/**
 * Number Chip Component
 * Displays the resolved horary seed details in standard KP notation,
 * or Time Chart Lagna when the horary seed is omitted:
 * #56/249 · Gemini 20°00'00"–22°00'00" · Mercury–Jupiter–Jupiter–Jupiter
 */
export const NumberChip = ({
    entry,
    system = '1-249',
    lang = 'te'
}) => {
    if (!entry) return null;

    const isTe = lang === 'te';
    const totalInSystem = system.replace('1-', '');
    const isTimeChart = Boolean(entry.isTimeChart);

    return (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-700/50 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-mono font-bold text-amber-900 dark:text-amber-200">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center font-sans shadow-xs">
                    {isTimeChart ? <Clock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                </div>
                <span className="text-sm sm:text-base font-black">
                    {isTimeChart
                        ? (isTe ? "క్షణ లగ్నం (Time Chart)" : "Time Chart Lagna")
                        : `#${entry.no}/${totalInSystem}`}
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-gray-900 dark:text-white">
                    {entry.startDMS}
                </span>
                {!isTimeChart && (
                    <>
                        <span className="text-gray-400">→</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {entry.endDMS}
                        </span>
                    </>
                )}
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-white/10 font-bold text-gray-900 dark:text-white shadow-xs">
                <span className="text-amber-600 dark:text-amber-400 font-mono">
                    {entry.signLord}
                </span>
                <span className="text-gray-400">›</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                    {entry.starLord}
                </span>
                <span className="text-gray-400">›</span>
                <span className="text-purple-600 dark:text-purple-400 font-mono">
                    {entry.subLord}
                </span>
                <span className="text-gray-400">›</span>
                <span className="text-orange-600 dark:text-orange-400 font-mono">
                    {entry.subSubLord}
                </span>
            </div>
        </div>
    );
};
