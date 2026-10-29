import React, { useState, useRef } from 'react';
import {
    Sparkles, Plus, Download, Upload, Trash2, Edit3, Check, X,
    AlertCircle, Info, Shield, CheckCircle2, ChevronRight, Layers, BookmarkCheck
} from 'lucide-react';
import {
    validateRuleInput,
    exportCustomRulesToJson,
    importCustomRulesFromJson
} from '../../utils/customHouseRulesStorage.js';
import { HOUSE_KEYWORDS } from './KPEventSignificatorAnalysis.jsx';

export const CustomHouseRulesManager = ({
    isOpen,
    onClose,
    customRules = [],
    activeRuleId = null,
    onSelectRule,
    onCreateRule,
    onUpdateRule,
    onDeleteRule,
    onRulesChanged,
    lang = 'te'
}) => {
    const isTe = lang === 'te';
    const fileInputRef = useRef(null);

    // Form state for Create / Edit
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRuleId, setEditingRuleId] = useState(null);
    const [formName, setFormName] = useState('');
    const [formHouses, setFormHouses] = useState([]);
    const [formDescription, setFormDescription] = useState('');
    const [formErrors, setFormErrors] = useState([]);

    // Import/Export feedback toasts
    const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

    if (!isOpen) return null;

    // Reset Form
    const resetForm = () => {
        setEditingRuleId(null);
        setFormName('');
        setFormHouses([]);
        setFormDescription('');
        setFormErrors([]);
        setIsFormOpen(false);
    };

    // Open Form for Creating New Rule
    const handleOpenCreate = () => {
        setEditingRuleId(null);
        setFormName('');
        setFormHouses([3, 8, 11]); // Example default from requirements
        setFormDescription('');
        setFormErrors([]);
        setIsFormOpen(true);
        setStatusMessage(null);
    };

    // Open Form for Editing an Existing Rule
    const handleOpenEdit = (rule) => {
        setEditingRuleId(rule.id);
        setFormName(rule.name);
        setFormHouses([...rule.houses]);
        setFormDescription(rule.description || '');
        setFormErrors([]);
        setIsFormOpen(true);
        setStatusMessage(null);
    };

    // Toggle House in Form (1 to 12)
    const handleToggleHouse = (houseNum) => {
        setFormHouses(prev => {
            if (prev.includes(houseNum)) {
                return prev.filter(h => h !== houseNum);
            } else {
                return [...prev, houseNum].sort((a, b) => a - b);
            }
        });
        setFormErrors([]);
    };

    // Quick House Presets
    const applyHousePreset = (houses) => {
        setFormHouses([...houses].sort((a, b) => a - b));
        setFormErrors([]);
    };

    // Submit Form (Create or Update)
    const handleSubmitForm = (e) => {
        e.preventDefault();
        const validation = validateRuleInput({
            name: formName,
            houses: formHouses,
            description: formDescription
        });

        if (!validation.isValid) {
            setFormErrors(validation.errors);
            return;
        }

        if (editingRuleId) {
            const res = onUpdateRule(editingRuleId, {
                name: validation.sanitized.name,
                houses: validation.sanitized.houses,
                description: validation.sanitized.description
            });
            if (res.success) {
                setStatusMessage({
                    type: 'success',
                    text: isTe ? 'నియమం విజయవంతంగా సవరించబడింది.' : 'Rule updated successfully.'
                });
                resetForm();
            } else {
                setFormErrors(res.errors || ['Update failed.']);
            }
        } else {
            const res = onCreateRule({
                name: validation.sanitized.name,
                houses: validation.sanitized.houses,
                description: validation.sanitized.description
            });
            if (res.success) {
                setStatusMessage({
                    type: 'success',
                    text: isTe ? 'కొత్త కస్టమ్ నియమం విజయవంతంగా సృష్టించబడింది.' : 'Custom rule created successfully.'
                });
                // Automatically select the newly created rule
                if (res.rule && onSelectRule) {
                    onSelectRule(res.rule.id);
                }
                resetForm();
            } else {
                setFormErrors(res.errors || ['Creation failed.']);
            }
        }
    };

    // Handle Delete
    const handleDeleteRule = (ruleId, ruleName) => {
        const confirmMsg = isTe
            ? `"${ruleName}" కస్టమ్ నియమాన్ని ఖచ్చితంగా తొలగించాలనుకుంటున్నారా?`
            : `Are you sure you want to delete custom rule "${ruleName}"?`;
        if (window.confirm(confirmMsg)) {
            onDeleteRule(ruleId);
            setStatusMessage({
                type: 'success',
                text: isTe ? 'నియమం తొలగించబడింది.' : 'Rule deleted.'
            });
            if (editingRuleId === ruleId) {
                resetForm();
            }
        }
    };

    // Handle Export JSON
    const handleExport = () => {
        try {
            const jsonStr = exportCustomRulesToJson(customRules);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const dateStr = new Date().toISOString().split('T')[0];
            link.href = url;
            link.download = `astrosharma_custom_rules_${dateStr}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setStatusMessage({
                type: 'success',
                text: isTe ? 'కస్టమ్ నియమాలు JSON ఫైల్‌గా ఎగుమతి చేయబడ్డాయి.' : 'Custom rules exported as JSON file.'
            });
        } catch (err) {
            console.error('Export failed:', err);
            setStatusMessage({
                type: 'error',
                text: isTe ? 'ఎగుమతి చేయడం విఫలమైంది.' : 'Export failed.'
            });
        }
    };

    // Handle Import JSON
    const handleImportFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result;
                const result = importCustomRulesFromJson(content, customRules);
                if (result.success && result.importedCount > 0) {
                    onRulesChanged(result.allRules);
                    setStatusMessage({
                        type: 'success',
                        text: isTe
                            ? `${result.importedCount} కస్టమ్ నియమాలు విజయవంతంగా దిగుమతి చేయబడ్డాయి.`
                            : `Successfully imported ${result.importedCount} custom rule(s).`
                    });
                } else {
                    setStatusMessage({
                        type: 'error',
                        text: isTe
                            ? `దిగుమతి విఫలమైంది: ${(result.errors || []).join(' ')}`
                            : `Import failed: ${(result.errors || []).join(' ')}`
                    });
                }
            } catch (err) {
                console.error('Import read error:', err);
                setStatusMessage({
                    type: 'error',
                    text: isTe ? 'ఫైల్ చదవడం విఫలమైంది.' : 'Failed to read file.'
                });
            }
        };
        reader.readAsText(file);
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white dark:bg-stone-900 w-full max-w-3xl rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0 bg-stone-50/70 dark:bg-stone-900/90">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-serif font-black text-stone-900 dark:text-white flex items-center gap-2">
                                <span>{isTe ? "కస్టమ్ భావ నియమాలు" : "Custom House Rules"}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-mono font-bold">
                                    {customRules.length}
                                </span>
                            </h2>
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                                {isTe ? "మీ స్వంత భావాల సమూహాలను (1-12) రూపొందించి విశ్లేషించండి" : "Create, customize, and analyze any 1–12 house combination"}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                        title={isTe ? "మూసివేయండి" : "Close"}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Container */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
                    {/* Requirement 7: Prominent Browser-Only Disclaimer Notice */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 flex items-start gap-3">
                        <Shield className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-sky-900 dark:text-sky-200 leading-relaxed">
                            <span className="font-bold">
                                {isTe ? "🔒 బ్రౌజర్‌లో మాత్రమే భద్రపరచబడింది (Browser-Local Only): " : "🔒 Saved locally in this browser: "}
                            </span>
                            {isTe
                                ? "ఈ కస్టమ్ నియమాలు మీ ప్రస్తుత బ్రౌజర్‌లో మాత్రమే భద్రపరచబడతాయి (LocalStorage). సర్వర్‌కు లేదా ఏ ఖాతాకు అప్‌లోడ్ కావు. వేరే పరికరం లేదా ప్రైవేట్ విండోలో ఉపయోగించాలంటే క్రింద ఉన్న ఎగుమతి (Export JSON) ఫైల్‌ని ఉపయోగించండి."
                                : "These custom rules are stored only in this browser's localStorage. They are never sent to a server or user account and will not automatically sync between devices or profiles. Use Export/Import to transfer them."}
                        </div>
                    </div>

                    {/* Status Message / Notification */}
                    {statusMessage && (
                        <div
                            className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 border ${
                                statusMessage.type === 'success'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {statusMessage.type === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                )}
                                <span>{statusMessage.text}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStatusMessage(null)}
                                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Actions Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                        {!isFormOpen && (
                            <button
                                type="button"
                                onClick={handleOpenCreate}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                <span>{isTe ? "కొత్త నియమాన్ని రూపొందించండి" : "New Custom Rule"}</span>
                            </button>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                            {/* Hidden File Input for Import */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json,application/json"
                                onChange={handleImportFileChange}
                                className="hidden"
                            />

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold cursor-pointer transition-colors"
                                title={isTe ? "JSON ఫైల్ నుండి దిగుమతి చేయండి" : "Import rules from JSON file"}
                            >
                                <Upload className="w-3.5 h-3.5" />
                                <span>{isTe ? "దిగుమతి (Import)" : "Import JSON"}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleExport}
                                disabled={customRules.length === 0}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title={isTe ? "JSON ఫైల్‌గా ఎగుమతి చేయండి" : "Export rules to JSON file"}
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>{isTe ? "ఎగుమతి (Export)" : "Export JSON"}</span>
                            </button>
                        </div>
                    </div>

                    {/* Create / Edit Form Card */}
                    {isFormOpen && (
                        <form
                            onSubmit={handleSubmitForm}
                            className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700/60 space-y-4 animate-in fade-in duration-150"
                        >
                            <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-800/40">
                                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                                    <Edit3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    <span>
                                        {editingRuleId
                                            ? (isTe ? "కస్టమ్ నియమాన్ని సవరించండి" : "Edit Custom Rule")
                                            : (isTe ? "కొత్త కస్టమ్ నియమాన్ని రూపొందించండి" : "Create New Custom Rule")}
                                    </span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Error Alert */}
                            {formErrors.length > 0 && (
                                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                                    {formErrors.map((err, i) => (
                                        <div key={i} className="flex items-center gap-1.5">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                            <span>{err}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Rule Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                                    {isTe ? "నియమం పేరు (Rule Name) *" : "Rule Name *"}
                                </label>
                                <input
                                    type="text"
                                    required
                                    maxLength={120}
                                    placeholder={isTe ? "ఉదా: నా కస్టమ్ నియమం (వివాహం + ధనం)" : "e.g. My Custom Rule (Houses 3, 8, 11)"}
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-sm font-semibold text-stone-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-xs"
                                />
                            </div>

                            {/* Houses Selector (1 to 12) */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                                        {isTe ? "భావాల ఎంపిక (ఏదైనా 1-12 భావాలు) *" : "Select Houses (Any combination of 1–12) *"}
                                    </label>
                                    <div className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                                        {formHouses.length > 0
                                            ? `[${formHouses.join(', ')}] (${formHouses.length} ${isTe ? 'భావాలు' : 'houses'})`
                                            : (isTe ? "ఏ భావం ఎంచుకోలేదు" : "None selected")}
                                    </div>
                                </div>

                                {/* 12 Interactive House Pills */}
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(hNum => {
                                        const isSelected = formHouses.includes(hNum);
                                        const keyword = HOUSE_KEYWORDS[hNum]?.[isTe ? 'te' : 'en']?.split(',')[0] || '';
                                        return (
                                            <button
                                                key={hNum}
                                                type="button"
                                                onClick={() => handleToggleHouse(hNum)}
                                                className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                                    isSelected
                                                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs font-bold scale-[1.02]'
                                                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-amber-300 dark:hover:border-amber-600'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="font-mono text-xs font-extrabold">H{hNum}</span>
                                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                                </div>
                                                <div className="text-[10px] truncate opacity-85 mt-0.5">
                                                    {keyword}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Quick Presets */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                                    <span className="text-stone-400 font-medium">{isTe ? "ప్రీసెట్‌లు:" : "Presets:"}</span>
                                    <button
                                        type="button"
                                        onClick={() => applyHousePreset([3, 8, 11])}
                                        className="px-2 py-0.5 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono hover:bg-amber-200 cursor-pointer"
                                    >
                                        3, 8, 11
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyHousePreset([2, 7, 11])}
                                        className="px-2 py-0.5 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono hover:bg-amber-200 cursor-pointer"
                                    >
                                        2, 7, 11 (Marriage)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyHousePreset([2, 6, 10, 11])}
                                        className="px-2 py-0.5 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono hover:bg-amber-200 cursor-pointer"
                                    >
                                        2, 6, 10, 11 (Career)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyHousePreset([1, 5, 9])}
                                        className="px-2 py-0.5 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono hover:bg-amber-200 cursor-pointer"
                                    >
                                        1, 5, 9 (Trikona)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormHouses([])}
                                        className="px-2 py-0.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 cursor-pointer ml-auto"
                                    >
                                        {isTe ? "అన్నీ క్లియర్" : "Clear All"}
                                    </button>
                                </div>
                            </div>

                            {/* Description / Notes */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                                    {isTe ? "వివరణ లేదా గమనికలు (ఐచ్ఛికం)" : "Description / Notes (Optional)"}
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder={isTe ? "ఉదా: నా వ్యక్తిగత పరిశీలన లేదా నిర్దిష్ట ఫలితం..." : "e.g. Specific event hypothesis, research notes, etc."}
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-xs"
                                />
                            </div>

                            {/* Form Submit & Cancel Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                                >
                                    {isTe ? "రద్దు" : "Cancel"}
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
                                >
                                    <Check className="w-4 h-4" />
                                    <span>{editingRuleId ? (isTe ? "నవీకరించండి" : "Save Changes") : (isTe ? "నియమాన్ని సేవ్ చేయండి" : "Save Rule")}</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Custom Rules List */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                                {isTe ? "సేవ్ చేయబడిన కస్టమ్ నియమాలు" : "Saved Custom Rules"} ({customRules.length})
                            </h3>
                            {activeRuleId && customRules.some(r => r.id === activeRuleId) && (
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    <BookmarkCheck className="w-3.5 h-3.5" />
                                    <span>{isTe ? "కస్టమ్ నియమం ప్రస్తుతం విశ్లేషణలో ఉంది" : "Custom rule currently active in analysis"}</span>
                                </span>
                            )}
                        </div>

                        {customRules.length === 0 ? (
                            <div className="p-8 text-center rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-800 space-y-3">
                                <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                                        {isTe ? "ఇంకా ఎలాంటి కస్టమ్ నియమాలు లేవు" : "No custom rules yet"}
                                    </h4>
                                    <p className="text-xs text-stone-500 max-w-md mx-auto">
                                        {isTe
                                            ? "మీరు ఏదైనా 1-12 భావాల కలయికతో (ఉదాహరణకు 3, 8 మరియు 11) కొత్త నియమాన్ని సృష్టించవచ్చు. అది మీ బ్రౌజర్‌లో మాత్రమే భద్రపరచబడుతుంది."
                                            : "Create your first custom rule with any combination of houses 1–12 (for example: Houses 3, 8, and 11)."}
                                    </p>
                                </div>
                                {!isFormOpen && (
                                    <button
                                        type="button"
                                        onClick={handleOpenCreate}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>{isTe ? "మొదటి నియమాన్ని రూపొందించండి" : "Create First Rule"}</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {customRules.map((rule) => {
                                    const isSelected = rule.id === activeRuleId;
                                    return (
                                        <div
                                            key={rule.id}
                                            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                                isSelected
                                                    ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600 shadow-sm'
                                                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                                            }`}
                                        >
                                            <div className="space-y-1.5 flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-serif font-bold text-stone-900 dark:text-white truncate">
                                                        {rule.name}
                                                    </span>
                                                    {isSelected && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center gap-1">
                                                            <Check className="w-3 h-3" />
                                                            <span>{isTe ? "ఎంపిక చేయబడింది" : "Active"}</span>
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Houses Tags */}
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs text-stone-400 font-medium">
                                                        {isTe ? "భావాలు:" : "Houses:"}
                                                    </span>
                                                    {rule.houses.map(hNum => (
                                                        <span
                                                            key={hNum}
                                                            className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 font-mono text-xs font-extrabold text-amber-700 dark:text-amber-400 border border-stone-200 dark:border-stone-700"
                                                        >
                                                            H{hNum}
                                                        </span>
                                                    ))}
                                                </div>

                                                {rule.description && (
                                                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
                                                        {rule.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onSelectRule(rule.id);
                                                        onClose();
                                                    }}
                                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                                        isSelected
                                                            ? 'bg-amber-500 text-white shadow-xs'
                                                            : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200'
                                                    }`}
                                                >
                                                    {isSelected
                                                        ? (isTe ? "విశ్లేషించబడుతోంది" : "Selected")
                                                        : (isTe ? "ఎంచుకోండి" : "Select & Analyze")}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(rule)}
                                                    className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                                                    title={isTe ? "సవరించండి" : "Edit"}
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRule(rule.id, rule.name)}
                                                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                                                    title={isTe ? "తొలగించండి" : "Delete"}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0 bg-stone-50/70 dark:bg-stone-900/90 text-xs text-stone-500">
                    <span>
                        {isTe
                            ? `మొత్తం ${customRules.length} కస్టమ్ నియమాలు సేవ్ చేయబడ్డాయి`
                            : `Total ${customRules.length} custom rule(s) saved`}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold cursor-pointer transition-colors"
                    >
                        {isTe ? "పూర్తయింది" : "Done"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomHouseRulesManager;
