import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Share2,
    Compass,
    Copy,
    Check,
    ArrowUpRight
} from 'lucide-react';

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
    judgedAt,
    location,
    lang = 'te'
}) => {
    const navigate = useNavigate();
    const isTe = lang === 'te';
    const [copied, setCopied] = useState(false);

    if (!result) return null;

    const isYes = result.answer === 'YES';
    const punarphoo = result.punarphoo;

    // Reason subtitle
    let decisionSubtitle = '';
    if (result.decidedBy === 'SPECIAL_ASC_SS_MOON') {
        decisionSubtitle = isTe ? "లగ్న సబ్-సబ్ లార్డ్ చంద్రుడు (ప్రత్యేక నియమం)" : "Ascendant SS Lord is Moon (Special Rule 1)";
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
    } else {
        decisionSubtitle = isTe ? "తీర్పు నిర్ణయించబడింది" : "Judgment Evaluated";
    }

    // Copy summary to clipboard
    const handleCopy = () => {
        const numberText = numberEntry?.isTimeChart
            ? (isTe ? "క్షణ లగ్నం (Time Chart)" : "Time Chart Lagna")
            : (number ? `#${number}` : 'Time Chart Lagna');
        const text = `KP Gulbarga Theory Prediction:\nMethod: ${method.toUpperCase()} (${system})\nBasis: ${numberText}\nQuestion: ${result.explanation?.[0] || ''}\nAnswer: ${result.answer}\nDetails: ${decisionSubtitle}${punarphoo?.applied ? `\nPunarphoo: ${punarphoo.reason}` : ''}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Open full horary chart navigation
    const handleOpenFullHorary = () => {
        if (!numberEntry) return;

        if (numberEntry.isTimeChart) {
            navigate(`/chart`);
            return;
        }

        // If 1-249 number, pass kp=<number>
        // If 1-9, 1-27, 1-2193, we can pass horary mode with kp number or start degree
        let kpParam = number;
        if (system === '1-9') {
            kpParam = number; // 1..9 in 249 table
        } else if (system === '1-249') {
            kpParam = number;
        } else {
            // For 1-27 and 1-2193, find the corresponding 249 number from startDeg
            kpParam = 1; // fallback
        }

        navigate(`/chart?mode=horary&kp=${kpParam}`);
    };

    return (
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-amber-200/80 dark:border-white/10 shadow-xl space-y-6">
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
                    </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2.5 shrink-0 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                        title="Copy Summary"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-emerald-500" />
                                <span>Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                <span>Copy Result</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenFullHorary}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                        title="Open Full KP Horary Chart"
                    >
                        <Compass className="w-4 h-4" />
                        <span>Open KP Chart</span>
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
