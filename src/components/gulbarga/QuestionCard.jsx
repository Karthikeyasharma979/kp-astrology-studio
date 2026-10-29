import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Dices, Clock, MapPin, CheckCircle, Search, X, Loader2, Map, Check, Compass, Hash } from 'lucide-react';
import { searchLocationsOnline, POPULAR_LOCATIONS, resolveIanaTimezone, resolveLocalToUTC, getTimezoneOffsetForDate } from '../../services/locationService.js';
import { MapPickerModal } from '../common/MapPickerModal.jsx';

// Quick-select cities for 1-tap fast judgment place selection
const QUICK_CITIES = [
    { name: 'Hyderabad', te: 'హైదరాబాద్', lat: 17.3850, lon: 78.4867, timezone: 'Asia/Kolkata', state: 'Telangana', country: 'India' },
    { name: 'Siddipet', te: 'సిద్దిపేట', lat: 18.1018, lon: 78.8520, timezone: 'Asia/Kolkata', state: 'Telangana', country: 'India' },
    { name: 'Warangal', te: 'వరంగల్', lat: 17.9689, lon: 79.5941, timezone: 'Asia/Kolkata', state: 'Telangana', country: 'India' },
    { name: 'Vijayawada', te: 'విజయవాడ', lat: 16.5062, lon: 80.6480, timezone: 'Asia/Kolkata', state: 'Andhra Pradesh', country: 'India' },
    { name: 'Visakhapatnam', te: 'విశాఖపట్నం', lat: 17.6868, lon: 83.2185, timezone: 'Asia/Kolkata', state: 'Andhra Pradesh', country: 'India' },
    { name: 'Bengaluru', te: 'బెంగళూరు', lat: 12.9716, lon: 77.5946, timezone: 'Asia/Kolkata', state: 'Karnataka', country: 'India' },
];

/**
 * Question Card Component
 * Form inputs for Question, Number, Judgment Instant, and Location.
 * TSP: seed required, no location. Classic: seed optional (Time Chart fallback), with location.
 */
export const QuestionCard = ({
    question,
    onQuestionChange,
    numberInput,
    onNumberChange,
    numberError,
    onRandomize,
    system,
    method,
    judgedAt,
    onJudgedAtChange,
    onSetNow,
    location,
    onLocationChange,
    onGetAnswer,
    lang = 'te'
}) => {
    const isTe = lang === 'te';
    const isClassic = method === 'classic';
    const seedMissing = !isClassic && !String(numberInput ?? '').trim();

    // Location search & autocomplete state
    const [query, setQuery] = useState(
        isTe && location?.telugu
            ? location.telugu
            : (location?.displayName || location?.name || 'Hyderabad')
    );
    const [searchResults, setSearchResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isMapOpen, setIsMapOpen] = useState(false);

    const searchTimerRef = useRef(null);
    const locationContainerRef = useRef(null);

    // Sync query when location changes externally
    useEffect(() => {
        if (location) {
            const display = isTe && location.telugu
                ? location.telugu
                : (location.displayName || location.name || '');
            if (display) setQuery(display);
        }
    }, [location, isTe]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (locationContainerRef.current && !locationContainerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Perform debounced search
    const performSearch = (searchTerm) => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (!searchTerm || !searchTerm.trim()) {
            setSearchResults(POPULAR_LOCATIONS.slice(0, 8));
            setIsLoading(false);
            return;
        }

        const trimmed = searchTerm.trim();
        setIsLoading(true);

        searchTimerRef.current = setTimeout(async () => {
            try {
                const results = await searchLocationsOnline(trimmed, 8);
                setSearchResults(results);
            } catch (err) {
                console.error("Location search error:", err);
            } finally {
                setIsLoading(false);
            }
        }, 250);
    };

    const handleLocationInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        setIsOpen(true);
        performSearch(val);
    };

    const handleSelectLocation = (loc) => {
        const timezone = loc.timezone || resolveIanaTimezone(loc.lat, loc.lon);
        const formatted = {
            name: loc.name,
            displayName: loc.displayName || `${loc.name}, ${loc.state || ''}`,
            lat: Number(loc.lat),
            lon: Number(loc.lon),
            timezone,
            tzLabel: loc.tzLabel || getTimezoneOffsetForDate(timezone),
            telugu: loc.telugu || null
        };
        onLocationChange(formatted);
        setQuery(isTe && loc.telugu ? loc.telugu : (formatted.displayName || formatted.name));
        setIsOpen(false);
    };

    const handleQuickCitySelect = (city) => {
        handleSelectLocation({
            name: city.name,
            displayName: `${city.name}, ${city.state}, ${city.country}`,
            lat: city.lat,
            lon: city.lon,
            timezone: city.timezone,
            telugu: city.te
        });
    };

    // Auto-resolve typed location if user presses Enter or clicks Get Answer without clicking dropdown
    const resolveTypedLocation = async () => {
        const trimmed = query.trim();
        if (!trimmed) return;

        // If already matching current location (in any of its displayed names), skip
        const known = [location?.name, location?.displayName, location?.telugu]
            .filter(Boolean)
            .map(n => n.trim().toLowerCase());
        if (known.includes(trimmed.toLowerCase())) {
            return;
        }

        try {
            const results = await searchLocationsOnline(trimmed, 1);
            if (results && results.length > 0) {
                handleSelectLocation(results[0]);
            }
        } catch (_) {}
    };

    const handleGetAnswerClick = async () => {
        if (seedMissing) return;
        if (isClassic) await resolveTypedLocation();
        onGetAnswer();
    };

    // Classic: the judgment time is wall-clock time at the judgment place.
    // TSP: no place, so the browser's own timezone is used.
    const placeTimezone = isClassic ? (location?.timezone || 'Asia/Kolkata') : null;

    // Format Date object to 'YYYY-MM-DDTHH:MM' for input[type="datetime-local"]
    const formatForDatetimeInput = (date) => {
        if (!date) return '';
        const d = (date instanceof Date) ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        const parts = new Intl.DateTimeFormat('en-CA', {
            ...(placeTimezone ? { timeZone: placeTimezone } : {}),
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(d);
        const get = (type) => parts.find(p => p.type === type)?.value || '';
        return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
    };

    const handleDatetimeChange = (e) => {
        const val = e.target.value;
        if (val) {
            const parsed = placeTimezone
                ? resolveLocalToUTC(val.slice(0, 10), val.slice(11, 16), placeTimezone)
                : new Date(val);
            if (!isNaN(parsed.getTime())) {
                onJudgedAtChange(parsed);
            }
        }
    };

    const formatCoordinates = (lat, lon) => {
        const numLat = Number(lat);
        const numLon = Number(lon);
        if (isNaN(numLat) || isNaN(numLon)) return '';
        const latStr = numLat >= 0 ? `${numLat.toFixed(2)}°N` : `${Math.abs(numLat).toFixed(2)}°S`;
        const lonStr = numLon >= 0 ? `${numLon.toFixed(2)}°E` : `${Math.abs(numLon).toFixed(2)}°W`;
        return `${latStr}, ${lonStr}`;
    };

    return (
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-amber-200/80 dark:border-white/10 shadow-lg space-y-6">
            {/* 1. Question Input */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-orange-500" />
                        <span>{isTe ? "ప్రశ్న (YES / NO ప్రశ్న మాత్రమే)" : "Query (Yes/No Question Only)"}</span>
                    </label>
                    <span className="text-xs font-mono text-gray-400">
                        {question.length}/300
                    </span>
                </div>
                <input
                    type="text"
                    maxLength={300}
                    value={question}
                    onChange={(e) => onQuestionChange(e.target.value)}
                    placeholder={
                        isTe
                            ? "ఉదాహరణ: నా రైలు టికెట్ కన్ఫర్మ్ అవుతుందా? / నాకు ఈ ఉద్యోగం వస్తుందా?"
                            : "e.g. Will my waitlist ticket confirm? / Will I get this job?"
                    }
                    className="w-full px-4 py-3 rounded-2xl bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm sm:text-base transition-all"
                />
            </div>

            {/* 2. Grid: Number Input + Judgment Time (+ Judgment Place for Classic) */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isClassic ? 'lg:grid-cols-3' : ''} gap-5 items-start`}>
                {/* Horary Number Input (Required for TSP, Optional for Classic) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <Hash className="w-3.5 h-3.5 text-orange-500" />
                            <span>{isTe ? "సంఖ్య" : "Horary Seed"} ({system})</span>
                        </label>
                        {isClassic ? (
                            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/40">
                                {isTe ? "ఐచ్ఛికం" : "Optional"}
                            </span>
                        ) : (
                            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-md border border-red-200/60 dark:border-red-800/40">
                                {isTe ? "తప్పనిసరి" : "Required"}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={numberInput}
                                onChange={(e) => onNumberChange(e.target.value)}
                                placeholder={isClassic
                                    ? (isTe ? "ఖాళీ (లేదా డైస్ క్లిక్ చేయండి)" : "Leave blank or click dice")
                                    : (isTe ? "సంఖ్య నమోదు చేయండి (లేదా డైస్)" : "Enter a number or click dice")}
                                className={`w-full px-4 pr-8 py-2.5 rounded-2xl bg-stone-50 dark:bg-slate-800/80 border font-mono font-bold text-sm sm:text-base focus:outline-none focus:ring-2 transition-all ${
                                    numberError
                                        ? 'border-red-400 focus:ring-red-500/50 text-red-600 dark:text-red-400'
                                        : 'border-stone-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-orange-500/50 focus:border-orange-500'
                                }`}
                            />
                            {numberInput ? (
                                <button
                                    type="button"
                                    onClick={() => onNumberChange('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white p-0.5"
                                    title={isClassic
                                        ? (isTe ? "సంఖ్యను తొలగించు (క్షణ లగ్నం)" : "Clear (Use Time Chart Lagna)")
                                        : (isTe ? "సంఖ్యను తొలగించు" : "Clear number")}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            ) : null}
                        </div>

                        <button
                            type="button"
                            onClick={onRandomize}
                            className="p-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 transition-all cursor-pointer shrink-0"
                            title={isTe ? "యాదృచ్ఛిక సంఖ్య (Random)" : "Generate Random Horary Seed"}
                            aria-label="Randomize seed"
                        >
                            <Dices className="w-5 h-5" />
                        </button>
                    </div>

                    {numberError ? (
                        <p className="text-xs font-semibold text-red-500 mt-1">
                            {numberError}
                        </p>
                    ) : !numberInput ? (
                        isClassic ? (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1 font-medium pt-0.5">
                                <Clock className="w-3 h-3 text-amber-500" />
                                <span>{isTe ? "ఖాళీ: తీర్పు క్షణ లగ్నం వాడబడుతుంది" : "Blank: Time chart Lagna will be used"}</span>
                            </p>
                        ) : (
                            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium pt-0.5">
                                {isTe ? "TSP కు హోరరీ సంఖ్య తప్పనిసరి" : "TSP needs a horary seed number"}
                            </p>
                        )
                    ) : null}
                </div>

                {/* Judgment Time Input */}
                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>{isTe ? "తీర్పు సమయం" : "Judgment Moment"}</span>
                        </span>
                        {placeTimezone && (
                            <span className="normal-case font-mono text-[10px] text-orange-600 dark:text-orange-400">
                                {placeTimezone.split('/').pop().replace(/_/g, ' ')} ({getTimezoneOffsetForDate(placeTimezone)})
                            </span>
                        )}
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="datetime-local"
                            value={formatForDatetimeInput(judgedAt)}
                            onChange={handleDatetimeChange}
                            className="flex-1 px-3 py-2.5 rounded-2xl bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-white/10 text-xs sm:text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                        />
                        <button
                            type="button"
                            onClick={onSetNow}
                            className="px-3 py-2.5 rounded-2xl bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
                            title={isTe ? "ప్రస్తుత సమయం" : "Set to Current Instant"}
                        >
                            {isTe ? "ఇప్పుడు" : "Now"}
                        </button>
                    </div>
                </div>

                {/* Judgment Place (Classic only: TSP is location-independent) */}
                {isClassic && (
                    <div className="space-y-2 relative" ref={locationContainerRef}>
                        <div className="flex items-center justify-between">
                            <label className="text-xs uppercase font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                                <span>{isTe ? "తీర్పు ప్రదేశం" : "Judgment Place"}</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsMapOpen(true)}
                                className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:text-orange-600 flex items-center gap-1 cursor-pointer transition-colors"
                                title={isTe ? "మ్యాప్‌లో ఎంచుకోండి" : "Choose location on map"}
                            >
                                <Map className="w-3 h-3" />
                                <span>{isTe ? "మ్యాప్" : "Map"}</span>
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <input
                                type="text"
                                value={query}
                                onChange={handleLocationInputChange}
                                onFocus={() => {
                                    setIsOpen(true);
                                    if (searchResults.length === 0) performSearch(query);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        resolveTypedLocation();
                                        setIsOpen(false);
                                    }
                                }}
                                onBlur={() => {
                                    setTimeout(() => {
                                        resolveTypedLocation();
                                    }, 200);
                                }}
                                placeholder={isTe ? "నగరం / గ్రామం (ఉదా: సిద్దిపేట)" : "City / Town (e.g. Siddipet)"}
                                className="w-full pl-3.5 pr-8 py-2.5 rounded-2xl bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-white/10 text-xs sm:text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                            />
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {isLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                                ) : query ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setQuery('');
                                            setSearchResults(POPULAR_LOCATIONS.slice(0, 8));
                                            setIsOpen(true);
                                        }}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-0.5"
                                        aria-label="Clear Search"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <Search className="w-3.5 h-3.5 text-gray-400" />
                                )}
                            </div>

                            {/* Dropdown Results */}
                            {isOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-850 border border-amber-300/80 dark:border-white/15 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-stone-100 dark:divide-white/5">
                                    {isLoading && searchResults.length === 0 && (
                                        <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                                            <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                                            <span>{isTe ? "శోధిస్తోంది..." : "Searching locations..."}</span>
                                        </div>
                                    )}

                                    {!isLoading && searchResults.length === 0 && query.trim().length >= 2 && (
                                        <div className="p-3 text-center space-y-1.5">
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                {isTe ? `"${query}" లభించలేదు.` : `No locations found for "${query}".`}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    setIsMapOpen(true);
                                                }}
                                                className="px-2.5 py-1 rounded-xl bg-orange-500 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-sm"
                                            >
                                                <Map className="w-3 h-3" />
                                                <span>{isTe ? "మ్యాప్‌లో ఎంచుకోండి" : "Pick on Map"}</span>
                                            </button>
                                        </div>
                                    )}

                                    {searchResults.map((item) => {
                                        const isSelected =
                                            location?.name?.toLowerCase() === item.name?.toLowerCase() &&
                                            Math.abs(Number(location?.lat) - Number(item.lat)) < 0.05;

                                        return (
                                            <div
                                                key={item.id || `${item.lat}_${item.lon}`}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    handleSelectLocation(item);
                                                }}
                                                className={`px-3.5 py-2 hover:bg-orange-50/80 dark:hover:bg-white/10 cursor-pointer text-xs flex justify-between items-center transition-colors ${
                                                    isSelected ? 'bg-orange-100/60 dark:bg-white/15' : ''
                                                }`}
                                            >
                                                <div className="truncate mr-2">
                                                    <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                                                        <span>{isTe && item.telugu ? item.telugu : item.name}</span>
                                                        {isTe && item.telugu && (
                                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">
                                                                ({item.name})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                        {item.state ? `${item.state}, ` : ''}{item.country}
                                                        <span className="font-mono text-[10px] text-gray-400 ml-1">
                                                            ({formatCoordinates(item.lat, item.lon)})
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-[10px] font-mono text-orange-600 dark:text-orange-400 font-semibold block">
                                                        {item.timezone?.split('/').pop().replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Confirmed Coordinates & Quick Chips */}
                        <div className="pt-0.5 space-y-1.5">
                            {location && location.lat && (
                                <div className="flex items-center justify-between text-[11px] font-mono text-gray-500 dark:text-gray-400 px-1">
                                    <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold">
                                        <Check className="w-3 h-3 text-green-500" />
                                        <span>{formatCoordinates(location.lat, location.lon)}</span>
                                    </span>
                                    <span>{location.timezone?.split('/').pop().replace(/_/g, ' ')}</span>
                                </div>
                            )}

                            {/* Quick Select Chips */}
                            <div className="flex flex-wrap gap-1">
                                {QUICK_CITIES.map((c) => {
                                    const isSel = location?.name?.toLowerCase() === c.name.toLowerCase();
                                    return (
                                        <button
                                            key={c.name}
                                            type="button"
                                            onClick={() => handleQuickCitySelect(c)}
                                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                                                isSel
                                                    ? 'bg-orange-500 text-white shadow-xs'
                                                    : 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 hover:bg-orange-100 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {isTe ? c.te : c.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Full-width "Get Answer" button for both TSP and Classic Gulbarga */}
            <div className="pt-2">
                <button
                    type="button"
                    onClick={handleGetAnswerClick}
                    disabled={Boolean(numberError) || seedMissing}
                    className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-bold text-base shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                    <CheckCircle className="w-5 h-5" />
                    <span>{isTe ? "సమాధానం పొందండి" : "Get Answer"}</span>
                </button>
            </div>

            {/* Interactive Map Picker Modal */}
            {isMapOpen && (
                <MapPickerModal
                    isOpen={isMapOpen}
                    onClose={() => setIsMapOpen(false)}
                    initialLocation={location}
                    onConfirm={(mapLoc) => {
                        handleSelectLocation(mapLoc);
                        setIsMapOpen(false);
                    }}
                    lang={lang}
                />
            )}
        </div>
    );
};
