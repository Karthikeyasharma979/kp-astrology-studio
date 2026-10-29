import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { HomePage } from './pages/HomePage';
import { KPResultsView } from './pages/KPResultsView';
import { KPRulingPlanetsPage } from './pages/KPRulingPlanetsPage';
import { KPEventAnalysisPage } from './pages/KPEventAnalysisPage';
import { GulbargaPage } from './pages/GulbargaPage';

export default function App() {
    const [lang, setLang] = useState(() => {
        try {
            return sessionStorage.getItem('kp_studio_lang') || 'te';
        } catch {
            return 'te';
        }
    });

    const handleLangChange = (newLang) => {
        setLang(newLang);
        try {
            sessionStorage.setItem('kp_studio_lang', newLang);
        } catch {}
    };

    return (
        <BrowserRouter>
            <div className="min-h-screen flex flex-col bg-[#FFFDF9] dark:bg-midnight text-gray-900 dark:text-gray-100 transition-colors duration-300">
                <Navbar lang={lang} onLangChange={handleLangChange} />

                <main className="flex-1">
                    <Routes>
                        <Route path="/" element={<HomePage lang={lang} onLangChange={handleLangChange} />} />
                        <Route path="/chart" element={<KPResultsView lang={lang} onLangChange={handleLangChange} />} />
                        <Route path="/results" element={<KPResultsView lang={lang} onLangChange={handleLangChange} />} />
                        <Route path="/event-analysis" element={<KPEventAnalysisPage lang={lang} />} />
                        <Route path="/events" element={<KPEventAnalysisPage lang={lang} />} />
                        <Route path="/gulbarga" element={<GulbargaPage lang={lang} />} />
                        <Route path="/ruling-planets" element={<KPRulingPlanetsPage lang={lang} />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>

                <Footer lang={lang} />
            </div>
        </BrowserRouter>
    );
}
