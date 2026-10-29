import React from 'react';
import { HelpCircle, AlertCircle, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * Info Panel Component
 * Educational guide explaining TSP and Classic Gulbarga principles, DRPE 05:30 snapshot,
 * and essential astrological cautionary guidelines.
 */
export const InfoPanel = ({ lang = 'te' }) => {
    const isTe = lang === 'te';

    return (
        <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-transparent dark:from-amber-950/20 dark:via-slate-900/40 dark:to-slate-950 p-6 sm:p-8 rounded-3xl border border-amber-200/80 dark:border-white/10 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-amber-200/60 dark:border-white/10">
                <BookOpen className="w-5 h-5 text-orange-500" />
                <h3 className="font-serif font-bold text-lg sm:text-xl text-gray-900 dark:text-white">
                    {isTe ? "ఈ విధానం ఎలా పనిచేస్తుంది? (How Gulbarga & TSP Work)" : "How Gulbarga & TSP Work"}
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {/* Section 1: Overview */}
                <div className="space-y-3">
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>{isTe ? "గుల్బర్గా సిద్ధాంతం & TSP నేపధ్యం" : "Domain Background & Kar's TSP"}</span>
                    </h4>
                    <p>
                        {isTe
                            ? "గుల్బర్గా సిద్ధాంతం అనేది YES / NO తరహా ప్రశ్నలకు వేగవంతమైన KP ప్రత్యామ్నాయ పద్ధతి. డాక్టర్ కేశబ్ రంజన్ కర్ దీనిని 'థియరీ ఆఫ్ షార్ట్ ప్రిడిక్షన్ (TSP)' గా క్రమబద్ధీకరించారు, దీనిని కనక్‌కుమార్ బి. బోస్మియా తమ గ్రంథంలో 60 కి పైగా నిజ జీవిత ఉదాహరణలతో నిరూపించారు."
                            : "Gulbarga Theory is an accelerated KP horary shortcut for binary YES / NO questions ('Will my train ticket confirm?', 'Will I get the job?'). Dr. Keshab Ranjan Kar refined this into the Theory of Short Prediction (TSP), extensively documented with ~60 worked clinical examples by Kanakkumar B. Bosmia (2018)."}
                    </p>
                    <p>
                        {isTe
                            ? "సంప్రదాయ పద్ధతిలో ప్రశ్న క్షణ రూలింగ్ ప్లానెట్స్ (RPs) ను సంఖ్య యొక్క సబ్ లార్డ్ తో పోల్చగా, TSP లో నిర్ణయాత్మక బిందువుగా 'సబ్-సబ్ (SS) లార్డ్' ను పరిగణిస్తారు."
                            : "While Classic Gulbarga relies on instantaneous Ruling Planets compared to the number's Sub Lord, TSP uses the Sub-Sub (SS) Lord of the horary seed as the principal deciding pivot."}
                    </p>
                </div>

                {/* Section 2: DRPE 05:30 Snapshot */}
                <div className="space-y-3">
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>{isTe ? "05:30 IST (00:00 UTC) రోజువారీ స్నాప్‌షాట్" : "Day-Rise Planetary Effect (DRPE)"}</span>
                    </h4>
                    <p>
                        {isTe
                            ? "TSP లో ప్రతి ప్రశ్నకు తాజా గ్రహ స్థితులను లెక్కించరు. ప్రతిరోజు ఉదయం 05:30 IST (= 00:00 UTC) సమయానికి గల స్థిర గ్రహ చక్రాన్ని (DRPE) మాత్రమే రోజంతా వచ్చే ప్రశ్నలకు ప్రామాణికంగా ఉపయోగిస్తారు. 05:29:59 IST లోపు అడిగిన ప్రశ్నకు అంతకుముందు రోజు స్నాప్‌షాట్ వర్తిస్తుంది."
                            : "TSP does not recalculate planetary positions for each individual query instant. Instead, it utilizes a single fixed daily celestial snapshot calculated at 00:00 UTC (= 05:30 IST in India). A question asked at 05:29:59 IST uses the previous calendar day's snapshot; 05:30:00 IST onward uses today's."}
                    </p>
                    <p>
                        {isTe
                            ? "3 నియమాలలో కనీసం 2 నియమాలు సంతృప్తి చెందితే YES, లేకపోతే NO. ఒకవేళ శని చంద్రునితో సంబంధం కలిగి ఉంటే (పునర్ఫూ), తుది ఫలితం తలక్రిందులవుతుంది (YES -> NO, NO -> YES)."
                            : "Base outcome is YES if at least 2 of the 3 rules pass, else NO. If Saturn connects with Moon (Punarphoo), the outcome inverts (YES becomes NO, NO becomes YES)."}
                    </p>
                </div>
            </div>

            {/* Caution Banner */}
            <div className="p-4 rounded-2xl bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                    <span className="font-bold block mb-0.5">
                        {isTe ? "ముఖ్య గమనిక & పరిశోధనా సూచన:" : "Essential Astrological Caution:"}
                    </span>
                    <span>
                        {isTe
                            ? "గుల్బర్గా సిద్ధాంతం మరియు TSP చిన్నపాటి తాత్కాలిక YES/NO ప్రశ్నల కొరకు ఉద్దేశించిన షార్ట్‌కట్ మాత్రమే. వివాహం, కెరీర్ లేదా ఆయుష్షు వంటి జీవిత ముఖ్యమైన విషయాలకు సమగ్ర KP ప్రశ్న చార్ట్ లేదా జన్మ జాతక భావ సంధుల విశ్లేషణను మాత్రమే ఉపయోగించాలి."
                            : "Gulbarga Theory and TSP are rapid heuristics designed strictly for minor, immediate yes/no horary inquiries. For life-altering decisions (marriage timing, major career transitions, medical prognosis), always conduct a rigorous, comprehensive KP Horary 1–249 cuspal analysis."}
                    </span>
                </div>
            </div>
        </div>
    );
};
