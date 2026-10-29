import React, { useState, useEffect, useMemo } from 'react';
import { calculateKPRulingPlanets } from '../../utils/kp/kpRulingPlanets';
import { KP_TRANSLATIONS, getLocalizedPlanet } from '../../utils/kpTranslations';
import { Clock, MapPin, RefreshCw, Sparkles, CheckCircle2, Shield, Calendar, LayoutGrid, Table } from 'lucide-react';

const TELUGU_ROLE_MAP = {
    'Day Lord (Vara)': 'వారాధిపతి',
    'Day Lord': 'వారాధిపతి',
    'Ascendant Sign Lord': 'లగ్న రాశ్యాధిపతి',
    'Ascendant Star Lord': 'లగ్న నక్షత్రాధిపతి',
    'Moon Sign Lord': 'చంద్ర రాశ్యాధిపతి',
    'Moon Star Lord': 'చంద్ర నక్షత్రాధిపతి',
    'Ascendant Sub Lord': 'లగ్న సబ్ లార్డ్',
    'Moon Sub Lord': 'చంద్ర సబ్ లార్డ్',
    'Tathkala Hora Lord': 'తత్కాల హోరాధిపతి',
    'Hora Lord': 'హోరాధిపతి',
    'Tathkala Hora': 'తత్కాల హోర'
};

export const KPRulingPlanets = ({ defaultLocation, lang = 'te' }) => {
    const t = KP_TRANSLATIONS[lang] || KP_TRANSLATIONS.te;
    const isTe = lang === 'te';

    // Judgment instant state (defaults to current local date/time)
    const now = new Date();
    const currentDateStr = now.toISOString().split('T')[0];
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    const [judgmentDate, setJudgmentDate] = useState(currentDateStr);
    const [judgmentTime, setJudgmentTime] = useState(currentTimeStr);
    const [judgmentLoc, setJudgmentLoc] = useState({
        name: defaultLocation?.name || 'Hyderabad',
        lat: defaultLocation?.lat || 17.3850,
        lon: defaultLocation?.lon || 78.4867,
        timezone: defaultLocation?.timezone || 'Asia/Kolkata'
    });

    const [rulingResult, setRulingResult] = useState(null);
    const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

    const getNodeRepresentation = (planetName) => {
        if (!rulingResult?.nodeAgents) return null;
        const agents = rulingResult.nodeAgents.filter(na => na.represents?.includes(planetName));
        if (agents.length === 0) return null;
        return agents.map(na => isTe ? `${getLocalizedPlanet(na.node, 'te')} ప్రతినిధి` : `Rep by ${na.node}`).join(', ');
    };

    const primaryRPList = useMemo(() => {
        if (!rulingResult) return [];
        const core = rulingResult.coreRulingPlanets || rulingResult.rulingPlanets || [];
        return core.map(rp => {
            let details = '-';
            let subLordName = null;

            if (rp.role === 'Ascendant Star Lord') {
                const sign = isTe ? rulingResult.lagna?.sign?.te : rulingResult.lagna?.sign?.en;
                details = sign ? (isTe ? `లగ్న రాశి: ${sign}` : `Asc Sign: ${sign}`) : '-';
                if (rulingResult.lagna?.subLord) {
                    subLordName = isTe ? getLocalizedPlanet(rulingResult.lagna.subLord, 'te') : rulingResult.lagna.subLord;
                }
            } else if (rp.role === 'Ascendant Sign Lord') {
                const sign = isTe ? rulingResult.lagna?.sign?.te : rulingResult.lagna?.sign?.en;
                details = sign ? (isTe ? `లగ్న రాశి: ${sign}` : `Asc Sign: ${sign}`) : '-';
            } else if (rp.role === 'Moon Star Lord') {
                const sign = isTe ? rulingResult.moon?.sign?.te : rulingResult.moon?.sign?.en;
                details = sign ? (isTe ? `చంద్ర రాశి: ${sign}` : `Moon Sign: ${sign}`) : '-';
                if (rulingResult.moon?.subLord) {
                    subLordName = isTe ? getLocalizedPlanet(rulingResult.moon.subLord, 'te') : rulingResult.moon.subLord;
                }
            } else if (rp.role === 'Moon Sign Lord') {
                const sign = isTe ? rulingResult.moon?.sign?.te : rulingResult.moon?.sign?.en;
                details = sign ? (isTe ? `చంద్ర రాశి: ${sign}` : `Moon Sign: ${sign}`) : '-';
            } else if (rp.role === 'Day Lord' || rp.role === 'Day Lord (Vara)') {
                const day = isTe ? rulingResult.dayLord?.te : rulingResult.dayLord?.dayName;
                details = day ? (isTe ? `వారం: ${day}` : `Day: ${day}`) : '-';
            } else if (rp.role === 'Tathkala Hora Lord' || rp.horaIndex) {
                const slot = rp.horaStart && rp.horaEnd ? `${rp.horaStart} - ${rp.horaEnd}` : '';
                const period = isTe
                    ? `${rp.horaIndex}వ హోర (${rp.isDayHora ? 'పగలు' : 'రాత్రి'})`
                    : `Hora ${rp.horaIndex} (${rp.isDayHora ? 'Day' : 'Night'})`;
                details = slot ? `${period} (${slot})` : period;
            }

            return {
                ...rp,
                details,
                subLordName
            };
        });
    }, [rulingResult, isTe]);

    const handleCalculateRuling = () => {
        const res = calculateKPRulingPlanets({
            date: judgmentDate,
            time: judgmentTime,
            lat: judgmentLoc.lat,
            lon: judgmentLoc.lon,
            timezone: judgmentLoc.timezone
        });
        setRulingResult(res);
    };

    // Calculate on mount
    useEffect(() => {
        handleCalculateRuling();
    }, []);

    const setNowAsJudgment = () => {
        const current = new Date();
        const dStr = current.toISOString().split('T')[0];
        const hStr = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`;
        setJudgmentDate(dStr);
        setJudgmentTime(hStr);

        const res = calculateKPRulingPlanets({
            date: dStr,
            time: hStr,
            lat: judgmentLoc.lat,
            lon: judgmentLoc.lon,
            timezone: judgmentLoc.timezone
        });
        setRulingResult(res);
    };

    return (
        <div className="space-y-6">
            {/* Header & Distinction Alert */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-stone-900/40 border border-amber-300/70 dark:border-amber-700/50 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2 font-bold text-base sm:text-lg text-amber-900 dark:text-amber-300 font-serif">
                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>{t.rulingTitle}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm sm:text-base">
                    {t.rulingDesc}
                </p>
            </div>

            {/* Judgment Time Input Bar */}
            <div className="p-5 rounded-2xl bg-white dark:bg-stone-900/90 border border-orange-200/80 dark:border-white/10 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3.5 w-full lg:w-auto">
                    <div className="flex items-center gap-2.5 bg-orange-50/50 dark:bg-stone-800/80 px-3.5 py-2 rounded-xl border border-orange-200/70 dark:border-white/10">
                        <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                        <label className="text-xs text-gray-500 uppercase font-bold mr-1">
                            {isTe ? "తేదీ" : "Date"}
                        </label>
                        <input
                            type="date"
                            value={judgmentDate}
                            onChange={(e) => setJudgmentDate(e.target.value)}
                            className="bg-transparent text-sm font-mono font-bold text-gray-900 dark:text-white focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2.5 bg-orange-50/50 dark:bg-stone-800/80 px-3.5 py-2 rounded-xl border border-orange-200/70 dark:border-white/10">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <label className="text-xs text-gray-500 uppercase font-bold mr-1">
                            {isTe ? "సమయం" : "Time"}
                        </label>
                        <input
                            type="time"
                            value={judgmentTime}
                            onChange={(e) => setJudgmentTime(e.target.value)}
                            className="bg-transparent text-sm font-mono font-bold text-gray-900 dark:text-white focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-50/30 dark:bg-stone-800/50 text-sm font-semibold text-gray-700 dark:text-gray-200 border border-orange-100 dark:border-white/5">
                        <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{judgmentLoc.name}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={setNowAsJudgment}
                        className="px-4 py-2.5 rounded-xl bg-orange-100 dark:bg-stone-800 text-orange-900 dark:text-amber-300 font-bold text-xs sm:text-sm hover:bg-orange-200/80 transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{t.useCurrentTime}</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleCalculateRuling}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                        {isTe ? "రూలింగ్ లెక్కించు" : "Calculate"}
                    </button>
                </div>
            </div>

            {/* Results Display */}
            {rulingResult && (
                <div className="space-y-6">
                    {/* View Switcher Header (Cards vs Table) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-orange-200/60 dark:border-white/10">
                        <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                {isTe ? "ప్రధాన రూలింగ్ గ్రహాలు (1-6)" : "Primary Ruling Planets (1-6)"}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                                {isTe ? "• ప్రాధాన్యత క్రమంలో" : "• Classical KP Strength Order"}
                            </span>
                        </div>

                        {/* View Switcher: Cards vs Table */}
                        <div className="inline-flex items-center p-1 rounded-xl bg-orange-100/70 dark:bg-stone-800 border border-orange-200/60 dark:border-white/10 shadow-2xs self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    viewMode === 'cards'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span>{isTe ? "కార్డుల వీక్షణ" : "Cards View"}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    viewMode === 'table'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <Table className="w-3.5 h-3.5" />
                                <span>{isTe ? "పట్టిక వీక్షణ" : "Table View"}</span>
                            </button>
                        </div>
                    </div>

                    {/* View Mode: Table View */}
                    {viewMode === 'table' ? (
                        <div className="overflow-x-auto rounded-2xl border border-amber-300/80 dark:border-white/10 shadow-sm bg-white dark:bg-stone-900/90 tab-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-amber-500/10 dark:bg-stone-800 text-amber-950 dark:text-amber-200 border-b border-amber-200/80 dark:border-white/10 text-xs sm:text-sm font-bold uppercase tracking-wider">
                                        <th className="py-3.5 px-3 sm:px-4 text-center w-16 sm:w-20">{isTe ? "ప్రాధాన్యత" : "Priority"}</th>
                                        <th className="py-3.5 px-3 sm:px-4">{isTe ? "రూలింగ్ స్థానం / కారకత్వం" : "Ruling Position"}</th>
                                        <th className="py-3.5 px-3 sm:px-4">{isTe ? "రూలింగ్ గ్రహం" : "Ruling Planet"}</th>
                                        <th className="py-3.5 px-3 sm:px-4">{isTe ? "రాశి / సమయ వివరాలు" : "Position / Details"}</th>
                                        <th className="py-3.5 px-3 sm:px-4">{isTe ? "ఛాయాగ్రహ ప్రాతినిధ్యం" : "Node Agent"}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-amber-100 dark:divide-white/5 text-xs sm:text-sm">
                                    {primaryRPList.map((rp) => {
                                        const nodeRep = getNodeRepresentation(rp.planet);
                                        const isNode = rp.planet === 'Rahu' || rp.planet === 'Ketu';
                                        return (
                                            <tr key={rp.role} className="hover:bg-amber-50/50 dark:hover:bg-stone-800/40 transition-colors">
                                                <td className="py-3.5 px-3 sm:px-4 text-center">
                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 font-bold font-mono text-xs">
                                                        {rp.strength}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3 sm:px-4 font-bold text-gray-900 dark:text-white">
                                                    <div>{isTe ? (TELUGU_ROLE_MAP[rp.role] || rp.role) : rp.role}</div>
                                                    {rp.subLordName && (
                                                        <div className="text-[11px] font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                                                            {isTe ? "సబ్ లార్డ్:" : "Sub Lord:"} <span className="font-semibold text-amber-700 dark:text-amber-400">{rp.subLordName}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-3 sm:px-4">
                                                    <div className="inline-flex items-center gap-2">
                                                        <span className="font-serif font-extrabold text-base sm:text-lg text-amber-600 dark:text-amber-400">
                                                            {isTe ? getLocalizedPlanet(rp.planet, 'te') : rp.planet}
                                                        </span>
                                                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                                            ({rp.planet})
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-3 sm:px-4 text-gray-700 dark:text-gray-300 font-medium">
                                                    {rp.details}
                                                </td>
                                                <td className="py-3.5 px-3 sm:px-4">
                                                    {nodeRep ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-white/10">
                                                            {nodeRep}
                                                        </span>
                                                    ) : isNode ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-stone-800 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-white/10">
                                                            {isTe ? "ఛాయాగ్రహం" : "Shadow Planet"}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 dark:text-gray-600 font-mono">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* View Mode: Cards View (Top Primary Ruling Planets Strip RP 1-6) */
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                            {primaryRPList.map((rp) => (
                                <div
                                    key={rp.role}
                                    className="relative p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900/90 border border-amber-300/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
                                    
                                    <div>
                                        <span className="text-xs uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                                            {isTe ? `ప్రాధాన్యత ${rp.strength}` : `Priority ${rp.strength}`}
                                        </span>
                                        {/* Full label without truncation */}
                                        <h5 className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-snug break-words mb-2">
                                            {isTe ? (TELUGU_ROLE_MAP[rp.role] || rp.role) : rp.role}
                                        </h5>
                                    </div>

                                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-baseline justify-between">
                                        <div className="font-serif font-extrabold text-2xl sm:text-3xl text-amber-600 dark:text-amber-400">
                                            {isTe ? getLocalizedPlanet(rp.planet, 'te') : rp.planet}
                                        </div>
                                        <span className="text-xs text-gray-400 font-mono font-medium">
                                            {isTe ? "అధిపతి" : "Ruler"}
                                        </span>
                                    </div>

                                    {rp.horaIndex && (
                                        <div className="mt-2 pt-1.5 border-t border-amber-100 dark:border-white/5 flex flex-col gap-0.5">
                                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                                {isTe ? `${rp.horaIndex}వ హోర (${rp.isDayHora ? 'పగలు' : 'రాత్రి'})` : `Hora ${rp.horaIndex} (${rp.isDayHora ? 'Day' : 'Night'})`}
                                            </span>
                                            {rp.horaStart && rp.horaEnd && (
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                                                    {rp.horaStart} - {rp.horaEnd}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Detailed Judgment Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Ascendant at Judgment Instant */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-stone-900/90 border border-orange-200 dark:border-white/10 space-y-3 text-xs shadow-sm">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                <span>{isTe ? "నిర్ణయ సమయ లగ్నం" : "Judgment Ascendant (Lagna)"}</span>
                            </h4>
                            <div className="grid grid-cols-2 gap-2.5 text-gray-600 dark:text-gray-300">
                                <div className="p-2 rounded-lg bg-orange-50/50 dark:bg-stone-800/50">
                                    <span className="text-[10px] text-gray-500 block">{t.sign}</span>
                                    <strong className="text-gray-900 dark:text-white font-serif text-sm">
                                        {isTe ? rulingResult.lagna.sign.te : rulingResult.lagna.sign.en}
                                    </strong>
                                </div>
                                <div className="p-2 rounded-lg bg-orange-50/50 dark:bg-stone-800/50">
                                    <span className="text-[10px] text-gray-500 block">{t.signLord}</span>
                                    <strong className="text-orange-600 text-sm">
                                        {isTe ? getLocalizedPlanet(rulingResult.lagna.signLord, 'te') : rulingResult.lagna.signLord}
                                    </strong>
                                </div>
                                <div className="p-2 rounded-lg bg-orange-50/50 dark:bg-stone-800/50">
                                    <span className="text-[10px] text-gray-500 block">{t.starLord}</span>
                                    <strong className="text-purple-600 text-sm">
                                        {isTe ? getLocalizedPlanet(rulingResult.lagna.starLord, 'te') : rulingResult.lagna.starLord}
                                    </strong>
                                </div>
                                <div className="p-2 rounded-lg bg-orange-50/50 dark:bg-stone-800/50">
                                    <span className="text-[10px] text-gray-500 block">{t.subLord}</span>
                                    <strong className="text-amber-600 text-sm">
                                        {isTe ? getLocalizedPlanet(rulingResult.lagna.subLord, 'te') : rulingResult.lagna.subLord}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        {/* Moon at Judgment Instant */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-stone-900/90 border border-orange-200 dark:border-white/10 space-y-3 text-xs shadow-sm">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <span>{isTe ? "నిర్ణయ సమయ చంద్రుడు" : "Judgment Moon (Chandra)"}</span>
                            </h4>
                            <div className="grid grid-cols-2 gap-2.5 text-gray-600 dark:text-gray-300">
                                <div className="p-2 rounded-lg bg-orange-50/50 dark:bg-stone-800/50">
                                    <span className="text-[10px] text-gray-500 block">{t.sign}</span>
                                    <strong className="text-gray-900 dark:text-white font-serif text-sm">
                                        {isTe ? rulingResult.moon.sign.te : rulingResult.moon.sign.en}
                                    </strong>
                                </div>
                                <div className="p-2 rounded-lg bg-orange-50/50 dark:bg-stone-800/50">
                                    <span className="text-[10px] text-gray-500 block">{t.signLord}</span>
                                    <strong className="text-orange-600 text-sm">
                                        {isTe ? getLocalizedPlanet(rulingResult.moon.signLord, 'te') : rulingResult.moon.signLord}
                                    </strong>
                                </div>
                                <div className="p-2 rounded-lg bg-orange-50/50 dark:bg-stone-800/50">
                                    <span className="text-[10px] text-gray-500 block">{t.starLord}</span>
                                    <strong className="text-purple-600 text-sm">
                                        {isTe ? getLocalizedPlanet(rulingResult.moon.starLord, 'te') : rulingResult.moon.starLord}
                                    </strong>
                                </div>
                                <div className="p-2 rounded-lg bg-orange-50/50 dark:bg-stone-800/50">
                                    <span className="text-[10px] text-gray-500 block">{t.subLord}</span>
                                    <strong className="text-amber-600 text-sm">
                                        {isTe ? getLocalizedPlanet(rulingResult.moon.subLord, 'te') : rulingResult.moon.subLord}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        {/* Day Lord & Tathkala Hora at Judgment Instant */}
                        {rulingResult.horaLord && (
                            <div className="p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-stone-900/90 border border-orange-200 dark:border-white/10 space-y-3 text-xs shadow-sm">
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                    <span>{isTe ? "నిర్ణయ సమయ వారాధిపతి & హోర" : "Judgment Day Lord & Hora"}</span>
                                </h4>
                                <div className="grid grid-cols-2 gap-2.5 text-gray-600 dark:text-gray-300">
                                    <div className="p-2 rounded-lg bg-orange-50/50 dark:bg-stone-800/50">
                                        <span className="text-[10px] text-gray-500 block">{t.dayLord}</span>
                                        <strong className="text-orange-600 text-sm">
                                            {isTe ? getLocalizedPlanet(rulingResult.dayLord.planet, 'te') : rulingResult.dayLord.planet}
                                        </strong>
                                        <span className="text-[10px] text-gray-500 block mt-0.5 truncate font-medium">
                                            {isTe ? rulingResult.dayLord.te : rulingResult.dayLord.dayName}
                                        </span>
                                    </div>
                                    <div className="p-2 rounded-lg bg-orange-50/50 dark:bg-stone-800/50">
                                        <span className="text-[10px] text-gray-500 block">{isTe ? "తత్కాల హోరాధిపతి" : "Tathkala Hora Lord"}</span>
                                        <strong className="text-amber-600 text-sm">
                                            {isTe ? getLocalizedPlanet(rulingResult.horaLord.horaPlanet, 'te') : rulingResult.horaLord.horaPlanet}
                                        </strong>
                                        <span className="text-[10px] text-amber-700/80 dark:text-amber-400 block mt-0.5 font-medium">
                                            {isTe ? `${rulingResult.horaLord.horaIndex}వ హోర` : `Hora ${rulingResult.horaLord.horaIndex}`}
                                        </span>
                                    </div>
                                    <div className="p-2 rounded-lg bg-orange-50/50 dark:bg-stone-800/50">
                                        <span className="text-[10px] text-gray-500 block">{isTe ? "హోర వ్యవధి" : "Hora Slot"}</span>
                                        <strong className="text-gray-900 dark:text-white text-xs font-mono">
                                            {rulingResult.horaLord.horaStart} - {rulingResult.horaLord.horaEnd}
                                        </strong>
                                        <span className="text-[10px] text-gray-500 block mt-0.5">
                                            {rulingResult.horaLord.isDayHora ? (isTe ? "పగటి హోర" : "Day Hora") : (isTe ? "రాత్రి హోర" : "Night Hora")}
                                        </span>
                                    </div>
                                    <div className="p-2 rounded-lg bg-orange-50/50 dark:bg-stone-800/50">
                                        <span className="text-[10px] text-gray-500 block">{isTe ? "సూర్యోదయ / అస్తమయం" : "Sunrise / Sunset"}</span>
                                        <strong className="text-gray-900 dark:text-white text-xs font-mono">
                                            {rulingResult.horaLord.sunrise}
                                        </strong>
                                        <span className="text-[10px] text-gray-500 block mt-0.5 font-mono">
                                            {isTe ? "అస్త: " : "Set: "}{rulingResult.horaLord.sunset}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Node Representatives (Rahu / Ketu) */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-orange-50/50 dark:bg-stone-900/50 border border-orange-200 dark:border-white/10 text-xs">
                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200 block mb-2 font-serif">
                            {isTe ? "రాహు / కేతు ప్రాతినిధ్యం" : "Rahu & Ketu Planetary Agents"}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-600 dark:text-gray-400">
                            {(rulingResult.nodeAgents || []).map(na => (
                                <div key={na.node} className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-orange-100 dark:border-white/5">
                                    <div className="font-bold text-gray-900 dark:text-white text-sm mb-1">
                                        {isTe ? `${getLocalizedPlanet(na.node, 'te')} ఛాయాగ్రహం` : `${na.node} Node`}
                                    </div>
                                    <div>
                                        {isTe ? "రాశ్యాధిపతి" : "Sign Lord"}: <strong className="text-orange-600">{isTe ? getLocalizedPlanet(na.signLord, 'te') : na.signLord}</strong> • {isTe ? "నక్షత్రాధిపతి" : "Star Lord"}: <strong className="text-purple-600">{isTe ? getLocalizedPlanet(na.starLord, 'te') : na.starLord}</strong>
                                    </div>
                                    <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                                        {isTe ? "కారకత్వ ప్రాతినిధ్యం" : "Acts as agent for"}: {na.represents.map(p => isTe ? getLocalizedPlanet(p, 'te') : p).join(', ')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
