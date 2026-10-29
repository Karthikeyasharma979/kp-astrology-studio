import React from 'react';
import { Compass, ShieldCheck, Cpu, BookOpen, Layers } from 'lucide-react';

export const Footer = ({ lang = 'te' }) => {
    const isTe = lang === 'te';

    return (
        <footer className="mt-20 border-t border-amber-200/60 dark:border-white/10 bg-amber-50/50 dark:bg-slate-950/70 text-gray-700 dark:text-gray-300 py-12 transition-colors print:hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand Description */}
                    <div className="md:col-span-2 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white">
                                <Compass className="w-5 h-5" />
                            </div>
                            <span className="font-serif font-black text-xl text-gray-900 dark:text-white">
                                KP Astrology Studio
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-sans leading-relaxed max-w-md">
                            {isTe
                                ? "ప్రొఫెషనల్ కృష్ణమూర్తి పద్ధతి (KP) ఖగోళ పరిశోధనా సాధనం. ఖచ్చితమైన ఖగోళ గణనలు, ప్లాసిడస్ భావ సంధులు, 249 సబ్ లార్డ్ విభజనలు, 4-స్థాయిల భావ కారకత్వాలు మరియు వింశోత్తరి దశలతో కూడిన స్వతంత్ర అప్లికేషన్."
                                : "Professional-grade Krishnamurti Paddhati (KP) astrological calculation studio. Powered by high-precision astronomical algorithms, true Placidus house trisection, 249 Sub Lords, 4-level house significators, and rigorous Vimshottari Dasha mathematics."}
                        </p>
                    </div>

                    {/* Architectural Pillars */}
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-gray-100 mb-3 font-mono">
                            {isTe ? "గణన ప్రమాణాలు" : "Calculation Specs"}
                        </h4>
                        <ul className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-sans">
                            <li className="flex items-center gap-2">
                                <Cpu className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>High-Precision Astro Engine</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>Placidus House Trisection</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>KP New / Krishnamurti Ayanamsha</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>249 Sub Lord Half-Open Intervals</span>
                            </li>
                        </ul>
                    </div>

                    {/* Features Overview */}
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-gray-100 mb-3 font-mono">
                            {isTe ? "KP మాడ్యూల్స్" : "KP Modules"}
                        </h4>
                        <ul className="space-y-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-sans">
                            <li>• {isTe ? "ప్లాసిడస్ భావ సంధులు & చక్రం" : "Placidus Cusps & Dual-Style Charts"}</li>
                            <li>• {isTe ? "సబ్ లార్డ్ & సబ్-సబ్ లార్డ్స్" : "Star / Sub / Sub-Sub Lords"}</li>
                            <li>• {isTe ? "4-స్థాయిల భావ కారకత్వాలు" : "4-Level House Significators"}</li>
                            <li>• {isTe ? "వింశోత్తరి మహాదశ, అంతర్దశ" : "Vimshottari Dasha Hierarchy"}</li>
                            <li>• {isTe ? "పాశ్చాత్య మరియు దృక్ దృష్టి సంబంధాలు" : "KP Planetary & Cusp Aspects"}</li>
                            <li>• {isTe ? "రూలింగ్ ప్లానెట్స్ & హోరా" : "Ruling Planets & Hora Lord"}</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400 font-mono">
                    <p>© {new Date().getFullYear()} KP Astrology Studio. All rights reserved.</p>
                    <p>Designed for Precision Astrological Research & Practice</p>
                </div>
            </div>
        </footer>
    );
};
