import React, { useState } from 'react';
import { User, Calendar, Clock, Sparkles, RefreshCw, AlertCircle, Settings, ChevronDown, ChevronUp, Compass } from 'lucide-react';
import { CityAutocomplete } from '../common/CityAutocomplete';
import { POPULAR_LOCATIONS } from '../../services/locationService';
import { KP_TRANSLATIONS } from '../../utils/kpTranslations';
import { KP_AYANAMSHA_MODES } from '../../utils/kp/kpAyanamsha';
import { randomKpNumber } from '../../kp/random';

export const KPBirthForm = ({ onCalculate, isCalculating, initialValues, lang = 'te' }) => {
    const t = KP_TRANSLATIONS[lang] || KP_TRANSLATIONS.te;
    const isTe = lang === 'te';

    const [chartMode, setChartMode] = useState(initialValues?.chartMode || 'natal');
    const [kpNumber, setKpNumber] = useState(() => {
        if (initialValues?.kpNumber != null) return String(initialValues.kpNumber);
        return String(randomKpNumber());
    });

    const [name, setName] = useState(initialValues?.name || '');
    const [gender, setGender] = useState(initialValues?.gender || 'male');
    const [birthDate, setBirthDate] = useState(initialValues?.birthDate || '1998-08-15');

    // 12-hour Time state
    const [hour12, setHour12] = useState(() => {
        if (initialValues?.birthTime) {
            const parts = initialValues.birthTime.split(':');
            let h = parseInt(parts[0], 10);
            if (!isNaN(h)) {
                h = h % 12;
                if (h === 0) h = 12;
                return String(h).padStart(2, '0');
            }
        }
        return '10';
    });
    const [minute, setMinute] = useState(() => {
        if (initialValues?.birthTime) {
            const parts = initialValues.birthTime.split(':');
            if (parts[1]) return parts[1].slice(0, 2);
        }
        return '30';
    });
    const [ampm, setAmpm] = useState(() => {
        if (initialValues?.birthTime) {
            const parts = initialValues.birthTime.split(':');
            let h = parseInt(parts[0], 10);
            if (!isNaN(h)) {
                return h >= 12 ? 'PM' : 'AM';
            }
        }
        return 'AM';
    });

    // Helper to set current moment for horary query
    const setToCurrentTime = () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        setBirthDate(`${yyyy}-${mm}-${dd}`);

        let hours = now.getHours();
        const mins = String(now.getMinutes()).padStart(2, '0');
        const isPm = hours >= 12;
        setAmpm(isPm ? 'PM' : 'AM');
        hours = hours % 12;
        if (hours === 0) hours = 12;
        setHour12(String(hours).padStart(2, '0'));
        setMinute(mins);
    };

    // Location state
    // Restore the place of the chart being edited (or prefilled), else default to the first city
    const [selectedLocation, setSelectedLocation] = useState(() => {
        const lat = Number(initialValues?.lat);
        const lon = Number(initialValues?.lon);
        if (initialValues?.lat == null || initialValues?.lon == null || !Number.isFinite(lat) || !Number.isFinite(lon) || !initialValues?.timezone) {
            return POPULAR_LOCATIONS[0];
        }
        const known = POPULAR_LOCATIONS.find(l => Math.abs(l.lat - lat) < 1e-4 && Math.abs(l.lon - lon) < 1e-4);
        if (known) return known;
        return {
            id: 'initial',
            name: initialValues.birthPlace || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
            displayName: initialValues.birthPlace || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
            lat,
            lon,
            timezone: initialValues.timezone,
            tzLabel: initialValues.tzLabel || ''
        };
    });
    const [isCustom, setIsCustom] = useState(false);
    const [customCoords, setCustomCoords] = useState({
        lat: '17.3850',
        lon: '78.4867',
        timezone: 'Asia/Kolkata'
    });

    // Advanced KP Configuration
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [ayanamshaMode, setAyanamshaMode] = useState(initialValues?.ayanamshaMode || KP_AYANAMSHA_MODES.KP_NEW);
    const [nodeMode, setNodeMode] = useState(initialValues?.nodeMode || 'mean');

    const [formError, setFormError] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError(null);

        // In Horary mode, validate KP number
        if (chartMode === 'horary') {
            const parsedKp = parseInt(kpNumber, 10);
            if (isNaN(parsedKp) || parsedKp < 1 || parsedKp > 249) {
                setFormError(isTe ? "దయచేసి సరైన KP హోరరీ సంఖ్యను (1-249) నమోదు చేయండి." : "Please enter a valid KP Horary number between 1 and 249.");
                return;
            }
        }

        // Convert 12h to 24h
        let h = parseInt(hour12, 10);
        const m = parseInt(minute, 10);

        if (isNaN(h) || isNaN(m) || h < 1 || h > 12 || m < 0 || m > 59) {
            setFormError(isTe ? "దయచేసి సరైన సమయాన్ని నమోదు చేయండి (గంటలు 1-12, నిమిషాలు 0-59)." : "Please enter a valid birth time (Hours 1-12, Minutes 0-59).");
            return;
        }

        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;

        const time24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        if (!birthDate) {
            setFormError(isTe ? "దయచేసి సరైన తేదీని ఎంచుకోండి." : "Please select a valid date.");
            return;
        }

        const lat = isCustom ? parseFloat(customCoords.lat) : Number(selectedLocation.lat);
        const lon = isCustom ? parseFloat(customCoords.lon) : Number(selectedLocation.lon);
        const timezone = isCustom ? customCoords.timezone : selectedLocation.timezone;

        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            setFormError(isTe ? "అక్షాంశ రేఖాంశాలు సరిగ్గా లేవు (-90 to +90, -180 to +180)." : "Invalid geographic coordinates (Lat: -90 to +90, Lon: -180 to +180).");
            return;
        }

        if (!timezone || typeof timezone !== 'string' || !timezone.trim()) {
            setFormError(isTe ? "సమయ మండలం (IANA Timezone) నిర్ధారించబడలేదు." : "Valid IANA timezone could not be determined for this location.");
            return;
        }

        const resolvedPlace = isCustom
            ? (customCoords.name || `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`)
            : (isTe && selectedLocation.telugu ? selectedLocation.telugu : (selectedLocation.displayName || selectedLocation.name));

        onCalculate({
            name: name.trim() || (isTe ? (chartMode === 'horary' ? 'ప్రశ్న కర్త' : 'జాతుకుడు') : (chartMode === 'horary' ? 'Querent' : 'Seeker')),
            gender,
            birthDate,
            birthTime: time24,
            birthPlace: resolvedPlace,
            lat,
            lon,
            timezone,
            ayanamshaMode,
            nodeMode,
            chartMode,
            kpNumber: chartMode === 'horary' ? parseInt(kpNumber, 10) : null
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Chart Type Toggle: Natal vs Horary */}
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>{isTe ? "చార్ట్ విధానం (Chart Type)" : "Chart Type"}</span>
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">
                        {chartMode === 'horary'
                            ? (isTe ? "1-249 సంఖ్యతో ప్రశ్న లగ్నం" : "1-249 Horary Ascendant")
                            : (isTe ? "జన్మ వివరాల ఆధారంగా" : "Birth Horoscope")}
                    </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setChartMode('natal')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            chartMode === 'natal'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent shadow-md'
                                : 'bg-orange-50/30 dark:bg-stone-800/60 border-orange-200/80 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-amber-400'
                        }`}
                    >
                        {isTe ? "జన్మ జాతకం (Natal)" : "Natal (Birth Chart)"}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setChartMode('horary');
                            if (!kpNumber) setKpNumber(String(randomKpNumber()));
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            chartMode === 'horary'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent shadow-md'
                                : 'bg-orange-50/30 dark:bg-stone-800/60 border-orange-200/80 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-amber-400'
                        }`}
                    >
                        {isTe ? "ప్రశ్న / హోరరీ (Horary)" : "Horary (Prashna)"}
                    </button>
                </div>
            </div>

            {/* When Horary is selected: KP Horary Number input with Randomize Button & Now Button */}
            {chartMode === 'horary' && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-700/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>{isTe ? "కేపి హోరరీ సంఖ్య (1-249)" : "KP Horary Number (1-249)"}</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={setToCurrentTime}
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-stone-800 text-amber-800 dark:text-amber-300 border border-amber-300/70 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-stone-700 transition-all cursor-pointer shadow-2xs"
                                title={isTe ? "ప్రస్తుత తేదీ & సమయాన్ని తీసుకోండి" : "Set query to current date & time"}
                            >
                                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                <span>{isTe ? "ఇప్పుడే" : "Now"}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setKpNumber(String(randomKpNumber()))}
                                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-stone-800 text-amber-800 dark:text-amber-300 border border-amber-300/70 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-stone-700 transition-all cursor-pointer shadow-2xs"
                                title={isTe ? "యాదృచ్ఛిక సంఖ్యను ఎంచుకోండి" : "Pick random KP number"}
                            >
                                <span>🎲</span>
                                <span>{isTe ? "యాదృచ్ఛికం" : "Random"}</span>
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="number"
                            min="1"
                            max="249"
                            value={kpNumber}
                            onChange={(e) => setKpNumber(e.target.value)}
                            placeholder="1 - 249"
                            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white"
                        />
                    </div>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                        {isTe
                            ? "లగ్న కస్ప్ డిగ్రీని నిర్ధారించడానికి 1 నుండి 249 మధ్య సంఖ్యను ఇవ్వండి లేదా రాండమ్ (🎲) బటన్ నొక్కండి."
                            : "Seed number (1-249) determines the Horary Ascendant cusp degrees."}
                    </p>
                </div>
            )}

            {/* Full Name */}
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>{chartMode === 'horary' ? (isTe ? "ప్రశ్న కర్త పేరు" : "Querent / Seeker Name") : t.fullName}</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal normal-case">
                        {isTe ? 'జన్మనామం / పిలుపుపేరు' : 'As per records'}
                    </span>
                </label>
                <div className="relative group">
                    <User className="w-4 h-4 text-amber-500 group-focus-within:text-amber-600 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t.namePlaceholder}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-orange-50/40 dark:bg-stone-800/80 border border-orange-200/90 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 dark:text-white transition-all shadow-inner"
                    />
                </div>
            </div>

            {/* Gender */}
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    {t.gender}
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { key: 'male', label: t.male },
                        { key: 'female', label: t.female },
                        { key: 'other', label: t.other }
                    ].map(g => (
                        <button
                            key={g.key}
                            type="button"
                            onClick={() => setGender(g.key)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                                gender === g.key
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent shadow-md'
                                    : 'bg-orange-50/30 dark:bg-stone-800/60 border-orange-200/80 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-amber-400'
                            }`}
                        >
                            {g.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Date of Birth */}
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    <span>{chartMode === 'horary' ? (isTe ? "ప్రశ్న తేదీ" : "Query / Horary Date") : t.birthDate}</span>
                </label>
                <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    max="2099-12-31"
                    min="1900-01-01"
                    className="w-full px-4 py-2.5 rounded-xl bg-orange-50/40 dark:bg-stone-800/80 border border-orange-200/90 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white transition-all shadow-inner"
                />
            </div>

            {/* Time of Birth */}
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{chartMode === 'horary' ? (isTe ? "ప్రశ్న సమయం" : "Query / Horary Time") : t.birthTime}</span>
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">
                        12-Hour Format
                    </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {/* Hour */}
                    <div>
                        <select
                            value={hour12}
                            onChange={(e) => setHour12(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-orange-50/40 dark:bg-stone-800/80 border border-orange-200/90 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white font-mono"
                        >
                            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                                <option key={h} value={h}>{h} {isTe ? 'గం' : 'Hr'}</option>
                            ))}
                        </select>
                    </div>

                    {/* Minute */}
                    <div>
                        <select
                            value={minute}
                            onChange={(e) => setMinute(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-orange-50/40 dark:bg-stone-800/80 border border-orange-200/90 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white font-mono"
                        >
                            {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                                <option key={m} value={m}>{m} {isTe ? 'నిమి' : 'Min'}</option>
                            ))}
                        </select>
                    </div>

                    {/* AM / PM */}
                    <div className="grid grid-cols-2 gap-1 bg-orange-100/60 dark:bg-stone-800/80 p-1 rounded-xl border border-orange-200/80 dark:border-white/10">
                        {['AM', 'PM'].map(mer => (
                            <button
                                key={mer}
                                type="button"
                                onClick={() => setAmpm(mer)}
                                className={`rounded-lg text-xs font-bold transition-all ${
                                    ampm === mer
                                        ? 'bg-amber-600 text-white shadow'
                                        : 'text-gray-700 dark:text-gray-300 hover:text-amber-600'
                                }`}
                            >
                                {mer}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* City Autocomplete */}
            <CityAutocomplete
                selectedLocation={selectedLocation}
                onSelectLocation={setSelectedLocation}
                isCustom={isCustom}
                onToggleCustom={() => setIsCustom(!isCustom)}
                customCoords={customCoords}
                onChangeCustomCoords={setCustomCoords}
                lang={lang}
            />

            {/* Collapsible Advanced Settings for KP Ayanamsha & Nodes */}
            <div className="pt-1">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full py-2 px-3 rounded-xl bg-orange-50/60 dark:bg-stone-800/50 hover:bg-orange-100/60 border border-orange-200/60 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between transition-colors"
                >
                    <span className="flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-amber-500" />
                        <span>{t.advancedOptions}</span>
                    </span>
                    {showAdvanced ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {showAdvanced && (
                    <div className="mt-2.5 p-3.5 rounded-2xl bg-amber-50/50 dark:bg-stone-900 border border-amber-200/80 dark:border-white/10 space-y-3 text-xs">
                        {/* Ayanamsha Mode */}
                        <div>
                            <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                                {t.ayanamsha}
                            </label>
                            <select
                                value={ayanamshaMode}
                                onChange={(e) => setAyanamshaMode(e.target.value)}
                                className="w-full p-2 rounded-lg bg-white dark:bg-stone-800 border border-orange-200 dark:border-white/10 text-gray-900 dark:text-white"
                            >
                                <option value={KP_AYANAMSHA_MODES.KP_NEW}>{t.ayanamshaKPNew}</option>
                                <option value={KP_AYANAMSHA_MODES.KP_ORIGINAL}>{t.ayanamshaKPOrig}</option>
                            </select>
                        </div>

                        {/* Lunar Node Mode */}
                        <div>
                            <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                                {t.nodeMode}
                            </label>
                            <select
                                value={nodeMode}
                                onChange={(e) => setNodeMode(e.target.value)}
                                className="w-full p-2 rounded-lg bg-white dark:bg-stone-800 border border-orange-200 dark:border-white/10 text-gray-900 dark:text-white"
                            >
                                <option value="mean">{t.meanNode}</option>
                                <option value="true">{t.trueNode}</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {formError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                </div>
            )}

            {/* Calculate Button */}
            <button
                type="submit"
                disabled={isCalculating}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-sm shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
                {isCalculating ? (
                    <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t.calculating}</span>
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4" />
                        <span>{chartMode === 'horary' ? (isTe ? "KP హోరరీ జాతకం లెక్కించండి" : "Calculate KP Horary Kundli") : t.calculateBtn}</span>
                    </>
                )}
            </button>
        </form>
    );
};
