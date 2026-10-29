import React from 'react';
import { Compass, Clock, MapPin } from 'lucide-react';

/**
 * Ruling Planets Card Component (for Classic Gulbarga Mode)
 * Renders the judgment moment Ruling Planets (Asc & Moon rulers, Day Lord).
 */
export const RulingPlanetsCard = ({
    rulingPlanets,
    location,
    judgedAt,
    rpMode = 'classic5',
    lang = 'te'
}) => {
    if (!rulingPlanets) return null;

    const isTe = lang === 'te';

    const rps = [
        { role: isTe ? 'లగ్న నక్షత్రాధిపతి' : 'Asc Star Lord', planet: rulingPlanets.ascStarLord, highlight: true },
        { role: isTe ? 'లగ్న రాశ్యాధిపతి' : 'Asc Sign Lord', planet: rulingPlanets.ascSignLord },
        { role: isTe ? 'చంద్ర నక్షత్రాధిపతి' : 'Moon Star Lord', planet: rulingPlanets.moonStarLord, highlight: true },
        { role: isTe ? 'చంద్ర రాశ్యాధిపతి' : 'Moon Sign Lord', planet: rulingPlanets.moonSignLord },
        { role: isTe ? 'వారాధిపతి' : 'Day Lord', planet: rulingPlanets.dayLord },
        ...(rulingPlanets.horaLord ? [{
            role: isTe ? 'తత్కాల హోర' : 'Tathkala Hora',
            planet: rulingPlanets.horaLord
        }] : [])
    ];

    if (rpMode === 'extended7') {
        rps.push(
            { role: isTe ? 'లగ్న సబ్ లార్డ్' : 'Asc Sub Lord', planet: rulingPlanets.ascSubLord },
            { role: isTe ? 'చంద్ర సబ్ లార్డ్' : 'Moon Sub Lord', planet: rulingPlanets.moonSubLord }
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 sm:p-6 border border-amber-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-orange-500" />
                    <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                        {isTe ? "తీర్పు క్షణ రూలింగ్ ప్లానెట్స్ (RPs)" : "Instantaneous Ruling Planets (RPs)"}
                    </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-gray-500 dark:text-gray-400">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">{location?.displayName || location?.name || 'Hyderabad'}</span>
                    {location?.lat && (
                        <span className="text-[10px] text-gray-400 shrink-0 hidden sm:inline">
                            ({Math.abs(Number(location.lat)).toFixed(2)}°{Number(location.lat) >= 0 ? 'N' : 'S'}, {Math.abs(Number(location.lon)).toFixed(2)}°{Number(location.lon) >= 0 ? 'E' : 'W'})
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {rps.map((item, idx) => (
                    <div
                        key={idx}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                            item.highlight
                                ? 'bg-orange-50/70 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800/60 shadow-xs'
                                : 'bg-stone-50/70 dark:bg-slate-800/50 border-stone-200 dark:border-white/10'
                        }`}
                    >
                        <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block truncate mb-1">
                            {item.role}
                        </span>
                        <span className="text-base sm:text-lg font-mono font-bold text-gray-900 dark:text-white block">
                            {item.planet || '—'}
                        </span>
                        {item.highlight && (
                            <span className="text-[9px] font-sans font-bold text-orange-600 dark:text-orange-400 block mt-0.5">
                                Rule 1 Trigger
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
