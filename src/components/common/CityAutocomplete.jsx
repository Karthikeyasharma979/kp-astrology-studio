import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Globe, Check, X, Search, Map, Loader2, RefreshCw, AlertCircle, Edit3, Compass } from 'lucide-react';
import {
    searchLocationsOnline,
    searchLocations,
    POPULAR_LOCATIONS,
    resolveIanaTimezone,
    getTimezoneOffsetForDate
} from '../../services/locationService';
import { MapPickerModal } from './MapPickerModal';

// Quick-select popular Indian cities for 1-tap fast entry
const QUICK_CITIES = [
    { name: 'Hyderabad', te: 'హైదరాబాద్' },
    { name: 'Vijayawada', te: 'విజయవాడ' },
    { name: 'Visakhapatnam', te: 'విశాఖపట్నం' },
    { name: 'Tirupati', te: 'తిరుపతి' },
    { name: 'Warangal', te: 'వరంగల్' },
    { name: 'Bengaluru', te: 'బెంగళూరు' },
    { name: 'Chennai', te: 'చెన్నై' },
    { name: 'Mumbai', te: 'ముంబై' },
    { name: 'Delhi', te: 'న్యూఢిల్లీ' },
];

export const CityAutocomplete = ({
    selectedLocation,
    onSelectLocation,
    isCustom,
    onToggleCustom,
    customCoords,
    onChangeCustomCoords,
    lang = 'te'
}) => {
    const isTe = lang === 'te';

    // Search query state
    const [query, setQuery] = useState(
        selectedLocation?.telugu && isTe
            ? selectedLocation.telugu
            : (selectedLocation?.displayName || selectedLocation?.name || 'Hyderabad')
    );
    const [searchResults, setSearchResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);

    // Map picker modal state
    const [isMapOpen, setIsMapOpen] = useState(false);

    // Selection confirmation & editing state
    const [isEditing, setIsEditing] = useState(false);

    // Manual coordinate validation error
    const [manualCoordError, setManualCoordError] = useState(null);

    const searchTimerRef = useRef(null);
    const containerRef = useRef(null);

    // Synchronize query when selectedLocation changes from outside
    useEffect(() => {
        if (selectedLocation && !isCustom) {
            setQuery(isTe && selectedLocation.telugu ? selectedLocation.telugu : (selectedLocation.displayName || selectedLocation.name));
        }
    }, [selectedLocation, isTe, isCustom]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Perform debounced search
    const performSearch = (searchTerm) => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        setSearchError(null);

        if (!searchTerm || !searchTerm.trim()) {
            setSearchResults(POPULAR_LOCATIONS.slice(0, 8));
            setIsLoading(false);
            return;
        }

        const trimmed = searchTerm.trim();
        // If 1 char, use fast local matching
        if (trimmed.length < 2) {
            setSearchResults(searchLocations(trimmed));
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const results = await searchLocationsOnline(trimmed, 10);
                setSearchResults(results);
                setSearchError(null);
            } catch (err) {
                console.error("Location search error:", err);
                setSearchError(isTe ? "స్థాన శోధన సేవను చేరుకోవడం సాధ్యం కాలేదు." : "Could not reach location service.");
                // Fallback to local
                setSearchResults(searchLocations(trimmed));
            } finally {
                setIsLoading(false);
            }
        }, 300);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        setIsOpen(true);
        setIsEditing(true);
        performSearch(val);
    };

    const handleInputFocus = () => {
        setIsOpen(true);
        if (searchResults.length === 0) {
            performSearch(query);
        }
    };

    const handleSelectLocation = (loc) => {
        onSelectLocation(loc);
        setQuery(isTe && loc.telugu ? loc.telugu : (loc.displayName || loc.name));
        setIsOpen(false);
        setIsEditing(false);
        if (isCustom) onToggleCustom();
    };

    const handleQuickSelect = (cityName) => {
        const found = POPULAR_LOCATIONS.find(l => l.name.toLowerCase() === cityName.toLowerCase());
        if (found) {
            handleSelectLocation(found);
        }
    };

    // When a location is confirmed via the Leaflet Map
    const handleMapConfirm = (mapLocation) => {
        handleSelectLocation(mapLocation);
    };

    // Manual coordinate change handlers with real-time validation and IANA timezone resolution
    const handleManualLatChange = (val) => {
        const newCoords = { ...customCoords, lat: val };
        validateAndUpdateManual(newCoords);
    };

    const handleManualLonChange = (val) => {
        const newCoords = { ...customCoords, lon: val };
        validateAndUpdateManual(newCoords);
    };

    const validateAndUpdateManual = (coords) => {
        const lat = parseFloat(coords.lat);
        const lon = parseFloat(coords.lon);

        if (isNaN(lat) || isNaN(lon)) {
            setManualCoordError(isTe ? "దయచేసి సరైన సంఖ్యలను నమోదు చేయండి." : "Please enter valid numeric coordinates.");
            onChangeCustomCoords(coords);
            return;
        }

        if (lat < -90 || lat > 90) {
            setManualCoordError(isTe ? "అక్షాంశం -90° మరియు +90° మధ్య ఉండాలి." : "Latitude must be between -90° and +90°.");
            onChangeCustomCoords(coords);
            return;
        }

        if (lon < -180 || lon > 180) {
            setManualCoordError(isTe ? "రేఖాంశం -180° మరియు +180° మధ్య ఉండాలి." : "Longitude must be between -180° and +180°.");
            onChangeCustomCoords(coords);
            return;
        }

        // Valid coordinates: Auto-detect authoritative IANA timezone
        setManualCoordError(null);
        const detectedTz = resolveIanaTimezone(lat, lon);
        onChangeCustomCoords({
            ...coords,
            timezone: detectedTz
        });
    };

    return (
        <div className="space-y-2.5" ref={containerRef}>
            {/* Header: Label & Mode Switchers */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5 sm:gap-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isTe ? "పుట్టిన ఊరు / నగరం" : "Birthplace / City"}</span>
                </label>

                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Choose on Map Button */}
                    <button
                        type="button"
                        onClick={() => setIsMapOpen(true)}
                        className="text-[11px] sm:text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-orange-600 transition-colors flex items-center gap-1 bg-amber-50 dark:bg-white/5 px-2 sm:px-2.5 py-1 rounded-lg border border-amber-200/60 dark:border-white/10 hover:border-amber-400 shadow-sm whitespace-nowrap cursor-pointer"
                        title={isTe ? "మ్యాప్‌లో స్థానాన్ని ఎంచుకోండి" : "Choose location on interactive map"}
                    >
                        <Map className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{isTe ? "మ్యాప్‌లో ఎంచుకోండి" : "Choose on Map"}</span>
                    </button>

                    {/* Manual Coordinates Toggle */}
                    <button
                        type="button"
                        onClick={onToggleCustom}
                        className={`text-[11px] sm:text-xs font-semibold transition-colors flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg border shadow-sm whitespace-nowrap cursor-pointer ${
                            isCustom
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'text-gray-700 dark:text-gray-300 bg-amber-50 dark:bg-white/5 border-amber-200/60 dark:border-white/10 hover:border-amber-400'
                        }`}
                    >
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span>{isCustom ? (isTe ? "శోధన జాబితా" : "City Search") : (isTe ? "కస్టమ్ అక్షాంశాలు" : "Manual Lat/Lon")}</span>
                    </button>
                </div>
            </div>

            {/* Mode 1: Search & Autocomplete */}
            {!isCustom ? (
                <div className="space-y-2">
                    <div className="relative">
                        <Search className="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={query}
                            onChange={handleInputChange}
                            onFocus={handleInputFocus}
                            placeholder={isTe ? "ప్రపంచవ్యాప్తంగా ఏ నగరమైనా, గ్రామమైనా టైప్ చేయండి..." : "Type any city, town, or village worldwide (e.g. Hyderabad, London, Dallas)..."}
                            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-orange-50/40 dark:bg-stone-800/80 border border-orange-200/90 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white transition-all shadow-inner"
                        />
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 text-amber-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                        ) : query ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    setSearchResults(POPULAR_LOCATIONS.slice(0, 8));
                                    setIsOpen(true);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white p-0.5"
                                aria-label="Clear Search"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        ) : null}

                        {/* Search Results Dropdown */}
                        {isOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-stone-850 border border-amber-300/80 dark:border-white/15 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                                
                                {/* Loading State */}
                                {isLoading && searchResults.length === 0 && (
                                    <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                                        <span>{isTe ? "స్థానాల కోసం శోధిస్తోంది..." : "Searching global locations..."}</span>
                                    </div>
                                )}

                                {/* Error / Provider Error State with Retry */}
                                {searchError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                            <span>{searchError}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => performSearch(query)}
                                            className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 hover:bg-red-200 flex items-center gap-1 font-semibold"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            <span>{isTe ? "మళ్లీ ప్రయత్నించు" : "Retry"}</span>
                                        </button>
                                    </div>
                                )}

                                {/* No Results State */}
                                {!isLoading && searchResults.length === 0 && query.trim().length >= 2 && (
                                    <div className="p-4 text-center space-y-2">
                                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                            {isTe ? `"${query}" కి సరిపోలే స్థానాలు లభించలేదు.` : `No locations found matching "${query}".`}
                                        </p>
                                        <div className="flex justify-center gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    setIsMapOpen(true);
                                                }}
                                                className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-amber-600 transition-colors"
                                            >
                                                <Map className="w-3.5 h-3.5" />
                                                <span>{isTe ? "మ్యాప్‌లో ఎంచుకోండి" : "Pick on Map"}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsOpen(false);
                                                    onToggleCustom();
                                                }}
                                                className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                            >
                                                <span>{isTe ? "అక్షాంశాలు నమోదు చేయండి" : "Enter Coordinates"}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Results List */}
                                {searchResults.map((item) => {
                                    const isSelected = selectedLocation?.name.toLowerCase() === item.name.toLowerCase() &&
                                        Math.abs(selectedLocation?.lat - item.lat) < 0.05;

                                    return (
                                        <div
                                            key={item.id || `${item.lat}_${item.lon}`}
                                            onClick={() => handleSelectLocation(item)}
                                            className={`px-4 py-2.5 hover:bg-amber-50/80 dark:hover:bg-white/10 cursor-pointer text-sm flex justify-between items-center transition-colors ${
                                                isSelected ? 'bg-amber-100/50 dark:bg-white/15' : ''
                                            }`}
                                        >
                                            <div className="truncate mr-2">
                                                <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                    <span>{isTe && item.telugu ? item.telugu : item.name}</span>
                                                    {isTe && item.telugu && (
                                                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">
                                                            ({item.name})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {item.state ? `${item.state}, ` : ''}{item.country}
                                                    <span className="font-mono text-[10px] text-gray-400 ml-1.5">
                                                        ({item.lat >= 0 ? `${item.lat.toFixed(2)}°N` : `${Math.abs(item.lat).toFixed(2)}°S`}, {item.lon >= 0 ? `${item.lon.toFixed(2)}°E` : `${Math.abs(item.lon).toFixed(2)}°W`})
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-mono font-medium block">
                                                    {item.timezone?.split('/').pop().replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                                                    {item.tzLabel?.includes('(') ? item.tzLabel.split('(')[1].replace(')', '') : 'UTC'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Upstream Attribution Footnote */}
                                <div className="px-4 py-1.5 bg-gray-50 dark:bg-stone-900 text-[10px] text-gray-400 text-center border-t border-gray-100 dark:border-white/5">
                                    Geocoding data &copy; Open-Meteo &copy; OpenStreetMap contributors
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick-Pick Popular City Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {QUICK_CITIES.map(c => {
                            const isSelected = selectedLocation?.name.toLowerCase() === c.name.toLowerCase();
                            return (
                                <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => handleQuickSelect(c.name)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                                        isSelected
                                            ? 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-600 font-bold'
                                            : 'bg-amber-50/70 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-amber-200/60 dark:border-white/10 hover:border-amber-400 hover:bg-amber-100/50'
                                    }`}
                                >
                                    {isTe ? c.te : c.name}
                                </button>
                            );
                        })}
                    </div>

                    {/* Confirmed Location Summary Card with Edit Option */}
                    {selectedLocation && (
                        <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-stone-800/60 border border-amber-300/70 dark:border-white/10 shadow-sm flex items-center justify-between gap-2 transition-all">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                                    <Check className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                        <span>{isTe && selectedLocation.telugu ? selectedLocation.telugu : (selectedLocation.displayName || selectedLocation.name)}</span>
                                        {isTe && selectedLocation.telugu && (
                                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal ml-1.5">
                                                ({selectedLocation.name})
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-tight">
                                        <span>
                                            {selectedLocation.lat >= 0 ? `${selectedLocation.lat.toFixed(4)}° N` : `${Math.abs(selectedLocation.lat).toFixed(4)}° S`}, {selectedLocation.lon >= 0 ? `${selectedLocation.lon.toFixed(4)}° E` : `${Math.abs(selectedLocation.lon).toFixed(4)}° W`}
                                        </span>
                                        <span>•</span>
                                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                            {selectedLocation.timezone} ({selectedLocation.tzLabel || 'UTC'})
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(true);
                                    performSearch(selectedLocation.name);
                                }}
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-white/10 flex items-center gap-1 shrink-0 transition-colors"
                            >
                                <Edit3 className="w-3 h-3" />
                                <span>{isTe ? "సవరించు" : "Change"}</span>
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                /* Mode 2: Manual Coordinates Fallback */
                <div className="p-3.5 rounded-2xl bg-orange-50/40 dark:bg-stone-800/80 border border-orange-200/80 dark:border-white/10 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block mb-1">
                                {isTe ? "అక్షాంశం (-90° నుండి +90°)" : "Latitude (-90° to +90°)"}
                            </label>
                            <input
                                type="number"
                                step="0.0001"
                                min="-90"
                                max="90"
                                value={customCoords.lat}
                                onChange={(e) => handleManualLatChange(e.target.value)}
                                placeholder="17.3850"
                                className="w-full p-2 text-xs rounded-lg border border-orange-200 dark:border-white/10 bg-white dark:bg-stone-900 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 block mb-1">
                                {isTe ? "రేఖాంశం (-180° నుండి +180°)" : "Longitude (-180° to +180°)"}
                            </label>
                            <input
                                type="number"
                                step="0.0001"
                                min="-180"
                                max="180"
                                value={customCoords.lon}
                                onChange={(e) => handleManualLonChange(e.target.value)}
                                placeholder="78.4867"
                                className="w-full p-2 text-xs rounded-lg border border-orange-200 dark:border-white/10 bg-white dark:bg-stone-900 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                    </div>

                    {manualCoordError && (
                        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{manualCoordError}</span>
                        </div>
                    )}

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                                {isTe ? "సమయ మండలం (IANA Timezone)" : "Resolved IANA Timezone"}
                            </label>
                            <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold">
                                {isTe ? "సమన్వయాల నుండి ఆటోమేటిక్‌గా గుర్తించబడింది" : "Auto-detected from coordinates"}
                            </span>
                        </div>
                        <input
                            type="text"
                            value={customCoords.timezone || 'Asia/Kolkata'}
                            onChange={(e) => onChangeCustomCoords({ ...customCoords, timezone: e.target.value })}
                            placeholder="e.g. Asia/Kolkata, America/New_York"
                            className="w-full p-2 text-xs rounded-lg border border-orange-200 dark:border-white/10 bg-white dark:bg-stone-900 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>
                </div>
            )}

            {/* Interactive Leaflet Map Picker Modal */}
            <MapPickerModal
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                initialLocation={selectedLocation}
                onConfirm={handleMapConfirm}
                lang={lang}
            />
        </div>
    );
};
