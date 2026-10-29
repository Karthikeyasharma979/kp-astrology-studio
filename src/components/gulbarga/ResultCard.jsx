import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Compass,
    Copy,
    Check,
    ArrowUpRight,
    HelpCircle,
    Clock
} from 'lucide-react';
import { getKp249NumberForEntry } from '../../kp/horaryTable.js';

/**
 * Copies text to the clipboard, falling back to a hidden textarea where the async
 * Clipboard API is unavailable (plain-http LAN access, older browsers).
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyText(text) {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (_) {}
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch (_) {
        return false;
    }
}

/**
 * Returns local 'YYYY-MM-DD' and 'HH:MM' for an instant in an IANA timezone
 * @param {Date} date
 * @param {string} timeZone
 */
function localDateTimeParts(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(date);
    const get = (type) => parts.find(p => p.type === type)?.value || '';
    return {
        date: `${get('year')}-${get('month')}-${get('day')}`,
        time: `${get('hour')}:${get('minute')}`
    };
}

/**
 * Result Card Component
 * Displays big YES / NO result, decision pathway, Punarphoo banner, and actions.
 */
export const ResultCard = ({
    result,
    method,
    system,
    number,
    numberEntry,
    question,
    judgedAt,
    location,
    lang = 'te'
}) => {
    const navigate = useNavigate();
    const isTe = lang === 'te';
    const [copyState, setCopyState] = useState(null);

    if (!result) return null;

    const isYes = result.answer === 'YES';
    const punarphoo = result.punarphoo;
    const isTsp = method === 'tsp';

    // Reason subtitle
    let decisionSubtitle = '';
    if (result.decidedBy === 'SPECIAL_ASC_SS_MOON') {
        const viaNode = result.ascLords?.subSub && result.ascLords.subSub !== 'Moon';
        decisionSubtitle = viaNode
            ? (isTe
                ? `లగ్న సబ్-సబ్ లార్డ్ ${result.ascLords.subSub}, చంద్రుడు దాని ప్రతినిధి (ప్రత్యేక నియమం 1)`
                : `Ascendant SS Lord ${result.ascLords.subSub} has Moon as its agent (Special Rule 1)`)
            : (isTe ? "లగ్న సబ్-సబ్ లార్డ్ చంద్రుడు (ప్రత్యేక నియమం 1)" : "Ascendant SS Lord is Moon (Special Rule 1)");
    } else if (result.decidedBy === 'SPECIAL_RULE_3') {
        decisionSubtitle = isTe ? "ప్రత్యేక నియమం 3 ద్వారా నిర్ణయం" : "Decided by Special Rule 3";
    } else if (result.decidedBy === 'RULE_1') {
        decisionSubtitle = isTe ? "క్లాసిక్ నియమం 1 ద్వారా ఫలితం (లగ్న/చంద్ర నక్షత్రాధిపతి)" : "Rule 1 Satisfied (Matches Moon/Asc Star Lord)";
    } else if (result.decidedBy === 'RULE_2') {
        decisionSubtitle = isTe ? "క్లాసిక్ నియమం 2 ద్వారా ఫలితం (అన్ని అధిపతులు RPs లో కలవు)" : "Rule 2 Satisfied (All 3 lords present in RPs)";
    } else if (result.rulesSatisfied !== null && result.rulesSatisfied !== undefined) {
        decisionSubtitle = isTe
            ? `3 నియమాలలో ${result.rulesSatisfied} సంతృప్తి చెందాయి (మెజారిటీ తీర్పు)`
            : `${result.rulesSatisfied} of 3 Rules Satisfied (Majority Decision)`;
    } else if (!isTsp) {
        decisionSubtitle = isTe ? "నియమం 1, నియమం 2 రెండూ సంతృప్తి చెందలేదు" : "Neither Rule 1 nor Rule 2 satisfied";
    } else {
        decisionSubtitle = isTe ? "తీర్పు నిర్ణయించబడింది" : "Judgment Evaluated";
    }

    // Per-rule pass/fail chips
    const ruleChips = isTsp
        ? (result.rules || []).map(r => ({ label: `R${r.id}`, passed: r.passed, detail: r.deciding }))
        : [
            { label: 'R1', passed: Boolean(result.rule1?.passed), detail: result.rule1?.matchedTarget },
            ...(result.rule1?.passed ? [] : [{ label: 'R2', passed: Boolean(result.rule2?.passed), detail: (result.rule2?.missing || []).length ? `missing ${result.rule2.missing.join(', ')}` : null }])
        ];

    const numberText = numberEntry?.isTimeChart
        ? (isTe ? "క్షణ లగ్నం (Time Chart)" : "Time Chart Lagna")
        : `#${number}/${system.replace('1-', '')}`;

    const judgedDate = judgedAt instanceof Date ? judgedAt : new Date(judgedAt);
    const judgedLabel = isNaN(judgedDate.getTime())
        ? ''
        : judgedDate.toLocaleString(isTe ? 'te-IN' : 'en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            ...(isTsp ? {} : { timeZone: location?.timezone || 'Asia/Kolkata' })
        });

    // Copy summary to clipboard
    const handleCopy = async () => {
        const lines = [
            'KP Gulbarga Theory Prediction',
            `Question: ${question?.trim() || 'General Query'}`,
            `Method: ${isTsp ? 'TSP (Dr. Kar)' : 'Classic Gulbarga'} (${system})`,
            `Seed: ${numberText}`,
            `Judged: ${judgedLabel}${!isTsp && location?.name ? ` @ ${location.name}` : ''}`,
            `Answer: ${result.answer}`,
            `Basis: ${decisionSubtitle}`
        ];
        if (punarphoo?.applied) lines.push(`Punarphoo: ${punarphoo.reason}`);
        const ok = await copyText(lines.join('\n'));
        setCopyState(ok ? 'copied' : 'failed');
        setTimeout(() => setCopyState(null), 2000);
    };

    // Open the KP horary chart, prefilled with the judgment moment, place and 1-249 number
    const handleOpenFullHorary = () => {
        if (!numberEntry) return;

        const timezone = location?.timezone || 'Asia/Kolkata';
        const { date, time } = localDateTimeParts(isNaN(judgedDate.getTime()) ? new Date() : judgedDate, timezone);
        const kpNumber = numberEntry.isTimeChart ? null : getKp249NumberForEntry(numberEntry);

        navigate('/chart', {
            state: {
                edit: true,
                formData: {
                    name: question?.trim() || '',
                    chartMode: kpNumber ? 'horary' : 'natal',
                    kpNumber,
                    birthDate: date,
                    birthTime: time,
                    birthPlace: location?.displayName || location?.name,
                    lat: location?.lat,
                    lon: location?.lon,
                    timezone,
                    tzLabel: location?.tzLabel
                }
            }
        });
    };

    return (
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-amber-200/80 dark:border-white/10 shadow-xl space-y-6">
            {/* 0. The question that was judged */}
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 text-xs sm:text-sm">
                <div className="flex items-start gap-2 min-w-0">
                    <HelpCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <span className="font-semibold text-gray-900 dark:text-white break-words">
                        {question?.trim() || (isTe ? "సాధారణ ప్రశ్న" : "General Query")}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-mono text-[11px] sm:text-xs shrink-0">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{judgedLabel}</span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">{numberText}</span>
                </div>
            </div>

            {/* 1. Main Banner YES / NO */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-stone-100 dark:border-white/10">
                <div className="flex items-center gap-5 text-center sm:text-left">
                    <div
                        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center shrink-0 shadow-lg ${
                            isYes
                                ? 'bg-gradient-to-tr from-emerald-600 to-green-500 text-white shadow-emerald-500/30'
                                : 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-rose-500/30'
                        }`}
                    >
                        {isYes ? (
                            <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14 stroke-[2.5]" />
                        ) : (
                            <XCircle className="w-12 h-12 sm:w-14 sm:h-14 stroke-[2.5]" />
                        )}
                    </div>

                    <div>
                        <span className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 block tracking-wider mb-1">
                            {isTe ? "తుది సమాధానం" : "Final Prediction"}
                        </span>
                        <div
                            className={`font-serif font-black text-5xl sm:text-6xl tracking-tight ${
                                isYes
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                            }`}
                        >
                            {result.answer}
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1">
                            {decisionSubtitle}
                        </p>
                        {ruleChips.length > 0 && (
                            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-2.5">
                                {ruleChips.map(chip => (
                                    <span
                                        key={chip.label}
                                        title={chip.detail || ''}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold border ${
                                            chip.passed
                                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
                                        }`}
                                    >
                                        {chip.passed ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {chip.label}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2.5 shrink-0 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                        title={isTe ? "సారాంశాన్ని కాపీ చేయండి" : "Copy Summary"}
                    >
                        {copyState === 'copied' ? (
                            <>
                                <Check className="w-4 h-4 text-emerald-500" />
                                <span>{isTe ? "కాపీ అయింది!" : "Copied!"}</span>
                            </>
                        ) : copyState === 'failed' ? (
                            <>
                                <XCircle className="w-4 h-4 text-rose-500" />
                                <span>{isTe ? "కాపీ విఫలమైంది" : "Copy failed"}</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                <span>{isTe ? "ఫలితం కాపీ" : "Copy Result"}</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenFullHorary}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                        title={isTe ? "ఈ క్షణానికి పూర్తి KP ప్రశ్న చార్ట్ తెరవండి" : "Open the full KP horary chart for this moment"}
                    >
                        <Compass className="w-4 h-4" />
                        <span>{isTe ? "KP చార్ట్ తెరవండి" : "Open KP Chart"}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* 2. Punarphoo Inversion Alert Banner (if Saturn applied) */}
            {punarphoo?.applied && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold">
                            {isTe ? "పునర్ఫూ (శని ప్రభావం) — సమాధానం మార్చబడింది" : "Punarphoo Inversion (Saturn Effect Applied)"}
                        </h4>
                        <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                            {punarphoo.reason}
                            <span className="block font-bold mt-1">
                                {isTe
                                    ? `ప్రాథమిక సమాధానం (${result.baseAnswer}) నుండి వ్యతిరేక సమాధానం (${result.answer}) కు మార్చబడింది.`
                                    : `Initial outcome (${result.baseAnswer}) inverted to opposite (${result.answer}).`}
                            </span>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
