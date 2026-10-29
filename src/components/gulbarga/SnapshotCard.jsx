import React from 'react';
import { Clock, Calendar, Sparkles, Orbit } from 'lucide-react';
import { formatDMS } from '../../utils/nakshatraUtils.js';
import { agentsOf } from '../../kp/gulbarga/nodeAgents.js';

/**
 * Snapshot Card Component (for TSP Mode)
 * Renders the DRPE 00:00 UTC daily planetary snapshot, Moon lords, and Node Agents.
 */
export const SnapshotCard = ({
    snapshot,
    lang = 'te'
}) => {
    if (!snapshot || !snapshot.planets) return null;

    const isTe = lang === 'te';
    const moon = snapshot.moonLords;
    const rahuAgents = agentsOf('Rahu', snapshot.planets);
    const ketuAgents = agentsOf('Ketu', snapshot.planets);

    return (
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 sm:p-6 border border-amber-200/80 dark:border-white/10 shadow-sm space-y-5">
            {/* Header with Timestamp */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                    <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                        {isTe ? "రోజువారీ గ్రహ స్థితులు (DRPE స్నాప్‌షాట్)" : "Day-Rise Planetary Effect (DRPE)"}
                    </h3>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 text-xs font-mono font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    <span>{snapshot.timestampLabel}</span>
                </div>
            </div>

            {/* Moon Lords & Target Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Moon Lords Chip */}
                <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
                        {isTe ? "చంద్రుని అధిపతులు" : "Moon Lords (DRPE)"}
                    </span>
                    <div className="font-mono text-xs font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-1">
                        <span>{moon.sign}</span>
                        <span className="text-gray-400">›</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{moon.star}</span>
                        <span className="text-gray-400">›</span>
                        <span className="text-purple-600 dark:text-purple-400">{moon.sub}</span>
                        <span className="text-gray-400">›</span>
                        <span className="text-orange-600 dark:text-orange-400 font-black">{moon.subSub}</span>
                    </div>
                </div>

                {/* Rahu Agent Badge */}
                <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50">
                    <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 block mb-1">
                        {isTe ? "రాహు ప్రతినిధులు (Rahu Agents)" : "Rahu Node Agents"}
                    </span>
                    <div className="flex flex-wrap gap-1 font-mono text-xs font-bold">
                        {rahuAgents.length > 0 ? (
                            rahuAgents.map(ag => (
                                <span key={ag} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-amber-300 dark:border-white/10 text-amber-800 dark:text-amber-200">
                                    {ag}
                                </span>
                            ))
                        ) : (
                            <span className="text-gray-400 text-xs font-sans">None</span>
                        )}
                    </div>
                </div>

                {/* Ketu Agent Badge */}
                <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50">
                    <span className="text-[10px] uppercase font-bold text-purple-800 dark:text-purple-300 block mb-1">
                        {isTe ? "కేతు ప్రతినిధులు (Ketu Agents)" : "Ketu Node Agents"}
                    </span>
                    <div className="flex flex-wrap gap-1 font-mono text-xs font-bold">
                        {ketuAgents.length > 0 ? (
                            ketuAgents.map(ag => (
                                <span key={ag} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-purple-300 dark:border-white/10 text-purple-800 dark:text-purple-200">
                                    {ag}
                                </span>
                            ))
                        ) : (
                            <span className="text-gray-400 text-xs font-sans">None</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Compact Planets Table */}
            <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-white/10">
                <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 dark:bg-slate-800/70 text-gray-600 dark:text-gray-400 font-semibold border-b border-stone-200 dark:border-white/10">
                        <tr>
                            <th className="py-2 px-3">Planet</th>
                            <th className="py-2 px-3">Sign</th>
                            <th className="py-2 px-3">Degree</th>
                            <th className="py-2 px-3">Sign Lord</th>
                            <th className="py-2 px-3">Star Lord</th>
                            <th className="py-2 px-3">Sub Lord</th>
                            <th className="py-2 px-3 text-orange-600 dark:text-orange-400 font-bold">SS Lord</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-white/5 font-mono">
                        {snapshot.planetsList?.map((p) => {
                            const isMoon = p.key === 'Moon';
                            return (
                                <tr
                                    key={p.key}
                                    className={isMoon ? 'bg-amber-50/50 dark:bg-amber-950/20 font-bold' : 'hover:bg-stone-50/60 dark:hover:bg-slate-800/30'}
                                >
                                    <td className="py-2 px-3 font-sans font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                        <span>{p.name}</span>
                                        {isMoon && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500 text-white font-sans">Target</span>
                                        )}
                                    </td>
                                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{p.signFull || p.sign}</td>
                                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{formatDMS(p.degreeInSign || 0)}</td>
                                    <td className="py-2 px-3 text-amber-700 dark:text-amber-300">{p.signLord}</td>
                                    <td className="py-2 px-3 text-indigo-700 dark:text-indigo-300 font-semibold">{p.starLord}</td>
                                    <td className="py-2 px-3 text-purple-700 dark:text-purple-300">{p.subLord}</td>
                                    <td className="py-2 px-3 text-orange-600 dark:text-orange-400 font-bold">{p.subSubLord}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
