import React from 'react';
import { Sparkles, HelpCircle, Shield, Compass, BookOpen } from 'lucide-react';
import { useGulbarga } from '../hooks/useGulbarga.js';
import { MethodSwitch } from '../components/gulbarga/MethodSwitch.jsx';
import { QuestionCard } from '../components/gulbarga/QuestionCard.jsx';
import { NumberChip } from '../components/gulbarga/NumberChip.jsx';
import { SnapshotCard } from '../components/gulbarga/SnapshotCard.jsx';
import { RulingPlanetsCard } from '../components/gulbarga/RulingPlanetsCard.jsx';
import { ResultCard } from '../components/gulbarga/ResultCard.jsx';
import { StepsList } from '../components/gulbarga/StepsList.jsx';
import { SettingsPanel } from '../components/gulbarga/SettingsPanel.jsx';
import { HistoryTable } from '../components/gulbarga/HistoryTable.jsx';

/**
 * Gulbarga Theory Page (KP Yes/No Shortcut: TSP + Classic Gulbarga)
 * Primary Route: /gulbarga
 */
export const GulbargaPage = ({ lang = 'te' }) => {
    const isTe = lang === 'te';

    const {
        method,
        system,
        number,
        numberInput,
        numberError,
        numberEntry,
        question,
        judgedAt,
        location,
        snapshot,
        rulingPlanets,
        result,
        history,
        accuracyStats,
        tspSettings,
        classicSettings,
        setMethod,
        setSystem,
        handleNumberChange,
        randomizeNumber,
        setQuestion,
        setJudgedAt,
        setLocation,
        setNowAsJudgmentTime,
        freezeJudgmentInstant,
        updateTspSettings,
        updateClassicSettings,
        requestRecordJudgment,
        handleUpdateOutcome,
        handleClearHistory
    } = useGulbarga();

    const handleGetAnswer = () => {
        freezeJudgmentInstant();
        requestRecordJudgment();
    };

    return (
        <div className="min-h-screen pb-24 font-sans">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 space-y-8">
                {/* 1. Header Section */}
                <div className="text-center max-w-2xl mx-auto space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950/70 border border-orange-300 dark:border-orange-700/60 text-orange-950 dark:text-orange-200 text-xs font-bold">
                        <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
                        <span>{isTe ? "గుల్బర్గా సిద్ధాంతం & TSP వేదిక" : "Dr. Kar's Theory of Short Prediction"}</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-serif font-black text-gray-950 dark:text-white tracking-tight">
                        {isTe ? "గుల్బర్గా సిద్ధాంతం" : "Gulbarga Theory"}
                    </h1>

                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                        {isTe
                            ? "KP షార్ట్‌కట్ ద్వారా YES / NO ప్రశ్నలకు తక్షణ శాస్త్రీయ సమాధానాలు."
                            : "KP shortcut for Yes/No questions (TSP & Classic Gulbarga)."}
                    </p>
                </div>

                {/* 2. Method Switch & Number System Selector */}
                <MethodSwitch
                    method={method}
                    onMethodChange={setMethod}
                    system={system}
                    onSystemChange={setSystem}
                    lang={lang}
                />

                {/* 3. Question Form Card */}
                <QuestionCard
                    question={question}
                    onQuestionChange={setQuestion}
                    numberInput={numberInput}
                    onNumberChange={handleNumberChange}
                    numberError={numberError}
                    onRandomize={randomizeNumber}
                    system={system}
                    method={method}
                    judgedAt={judgedAt}
                    onJudgedAtChange={setJudgedAt}
                    onSetNow={setNowAsJudgmentTime}
                    location={location}
                    onLocationChange={setLocation}
                    onGetAnswer={handleGetAnswer}
                    lang={lang}
                />

                {/* 4. Resolved Horary Number Chip */}
                {numberEntry && (
                    <NumberChip
                        entry={numberEntry}
                        system={system}
                        lang={lang}
                    />
                )}

                {/* 5. Snapshot Card (TSP) or Ruling Planets Card (Classic) */}
                {method === 'tsp' ? (
                    <SnapshotCard
                        snapshot={snapshot}
                        lang={lang}
                    />
                ) : (
                    <RulingPlanetsCard
                        rulingPlanets={rulingPlanets}
                        location={location}
                        judgedAt={judgedAt}
                        rpMode={classicSettings.rpMode}
                        lang={lang}
                    />
                )}

                {/* 6. Primary Result Card (Big YES / NO Banner) */}
                {result && (
                    <ResultCard
                        result={result}
                        method={method}
                        system={system}
                        number={number}
                        numberEntry={numberEntry}
                        judgedAt={judgedAt}
                        location={location}
                        lang={lang}
                    />
                )}

                {/* 7. Step-by-Step Rule Explanation */}
                {result && (
                    <StepsList
                        result={result}
                        lang={lang}
                    />
                )}

                {/* 8. Theoretical Settings & Toggles */}
                <SettingsPanel
                    method={method}
                    tspSettings={tspSettings}
                    onUpdateTspSettings={updateTspSettings}
                    classicSettings={classicSettings}
                    onUpdateClassicSettings={updateClassicSettings}
                    lang={lang}
                />

                {/* 9. Query History & Live Accuracy Metrics */}
                <HistoryTable
                    history={history}
                    accuracyStats={accuracyStats}
                    onUpdateOutcome={handleUpdateOutcome}
                    onClearHistory={handleClearHistory}
                    lang={lang}
                />
            </div>
        </div>
    );
};
