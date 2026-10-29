import React from 'react';
import { KPRulingPlanets } from '../components/kp/KPRulingPlanets';
import { Compass, Sparkles, Clock, MapPin } from 'lucide-react';

export const KPRulingPlanetsPage = ({ lang = 'te' }) => {
    const isTe = lang === 'te';

    return (
        <div className="min-h-screen pb-24 font-sans">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 space-y-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs font-bold">
                        <Compass className="w-4 h-4 text-amber-500 animate-spin-slow" />
                        <span>{isTe ? "ప్రశ్న శాస్త్ర పరిశోధన సాధనం" : "KP Horary Judgment Tool"}</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-serif font-black text-gray-950 dark:text-white">
                        {isTe ? "రూలింగ్ ప్లానెట్స్ (RP) సాధనం" : "Ruling Planets Calculator"}
                    </h1>

                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                        {isTe
                            ? "ప్రశ్న క్షణ సమయ లగ్న రాశ్యాధిపతి, లగ్న నక్షత్రాధిపతి, చంద్ర రాశ్యాధిపతి, చంద్ర నక్షత్రాధిపతి మరియు దినాధిపతుల సమగ్ర గణన."
                            : "Calculate the instantaneous Ascendant and Moon rulers, Star Lords, Sub Lords, and Day Lord for any designated judgment moment."}
                    </p>
                </div>

                {/* Ruling Planets Module Container */}
                <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-amber-200/80 dark:border-white/10 shadow-lg">
                    <KPRulingPlanets
                        defaultLocation={{
                            name: 'Hyderabad',
                            lat: 17.3850,
                            lon: 78.4867,
                            timezone: 'Asia/Kolkata'
                        }}
                        lang={lang}
                    />
                </div>
            </div>
        </div>
    );
};
