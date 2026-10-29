import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';
import { KPEventSignificatorAnalysis } from '../components/kp/KPEventSignificatorAnalysis';
import { calculateKPKundli, KP_AYANAMSHA_MODES } from '../services/kpCalculator';
import { calculateKPSignificators } from '../utils/kp/kpSignificators';
import { safeSaveSessionResult } from '../utils/storageUtils';

const benchmarkBirthDetails = (isTe) => ({
    name: isTe ? 'రమేష్ శర్మ' : 'Ramesh Sharma',
    gender: 'male',
    birthDate: '1998-08-15',
    birthTime: '10:30',
    birthPlace: 'Hyderabad, India',
    lat: 17.3850,
    lon: 78.4867,
    timezone: 'Asia/Kolkata'
});

export const KPEventAnalysisPage = ({ lang = 'te' }) => {
    const navigate = useNavigate();
    const isTe = lang === 'te';

    // Local birth details for reports (the cached chart's own form input, else the benchmark)
    const [birthDetails, setBirthDetails] = useState(() => {
        try {
            const params = sessionStorage.getItem('kp_studio_params');
            if (params && sessionStorage.getItem('kp_studio_result')) return JSON.parse(params);
        } catch (_) {}
        return benchmarkBirthDetails(isTe);
    });

    // Retrieve cached chart data or initialize with benchmark
    const [kpData, setKpData] = useState(() => {
        try {
            const cached = sessionStorage.getItem('kp_studio_result');
            if (cached) return JSON.parse(cached);
        } catch (_) {}

        // Default to verified Benchmark Chart (15-Aug-1998 10:30 IST Hyderabad)
        try {
            const chart = calculateKPKundli({
                birthDate: '1998-08-15',
                birthTime: '10:30',
                lat: 17.3850,
                lon: 78.4867,
                timezone: 'Asia/Kolkata',
                ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW,
                nodeMode: 'mean'
            });
            const sigs = calculateKPSignificators(chart.planets, chart.cusps);
            return {
                ...chart,
                significators: sigs,
                birthInstantUtc: '1998-08-15T05:00:00.000Z',
                chartLabel: isTe ? 'రమేష్ శర్మ (బెంచ్‌మార్క్ చార్ట్)' : 'Ramesh Sharma (Benchmark Chart)'
            };
        } catch (e) {
            console.error('Failed to compute initial benchmark chart:', e);
            return null;
        }
    });

    const handleLoadBenchmark = () => {
        const chart = calculateKPKundli({
            birthDate: '1998-08-15',
            birthTime: '10:30',
            lat: 17.3850,
            lon: 78.4867,
            timezone: 'Asia/Kolkata',
            ayanamshaMode: KP_AYANAMSHA_MODES.KP_NEW,
            nodeMode: 'mean'
        });
        const sigs = calculateKPSignificators(chart.planets, chart.cusps);
        const data = {
            ...chart,
            significators: sigs,
            birthInstantUtc: '1998-08-15T05:00:00.000Z',
            chartLabel: isTe ? 'రమేష్ శర్మ (బెంచ్‌మార్క్ చార్ట్)' : 'Ramesh Sharma (Benchmark Chart)'
        };
        setKpData(data);
        setBirthDetails(benchmarkBirthDetails(isTe));
        safeSaveSessionResult(data);
    };

    return (
        <div className="min-h-screen pb-24 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
                {/* Header Action Bar */}
                <div className="flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/chart')}
                        className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>{isTe ? "KP చక్రం పేజీకి వెళ్లండి" : "Back to KP Chart"}</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => navigate('/chart', { state: { edit: true } })}
                            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 shadow-xs cursor-pointer transition-all"
                        >
                            <span>{isTe ? "కొత్త జాతకం లెక్కించండి" : "Enter Birth Details"}</span>
                        </button>
                    </div>
                </div>

                {/* Main Component */}
                <KPEventSignificatorAnalysis
                    kpData={kpData}
                    birthDetails={birthDetails}
                    lang={lang}
                    onLoadBenchmark={handleLoadBenchmark}
                    onViewChart={() => navigate('/chart')}
                    onViewDasha={(targetDate) => navigate('/chart', { state: { tab: 'dasha', dashaDate: targetDate } })}
                />
            </div>
        </div>
    );
};

export default KPEventAnalysisPage;
