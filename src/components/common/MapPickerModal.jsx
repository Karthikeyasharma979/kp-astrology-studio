import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Search, MapPin, Check, Loader2, Navigation, AlertCircle, Compass } from 'lucide-react';
import { searchLocationsOnline, reverseGeocodeOnline, resolveIanaTimezone, getTimezoneOffsetForDate } from '../../services/locationService';

// Custom cosmic amber/saffron pin marker icon for AstroSharma
const createAstroMarkerIcon = () => {
    return L.divIcon({
        className: 'astro-map-marker',
        html: `
            <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; transform: translate(-19px, -38px); cursor: grab;">
                <!-- Pulsing Ground Radar Wave -->
                <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 22px; height: 7px; background: rgba(234, 88, 12, 0.35); border-radius: 50%; filter: blur(2px); animation: pulse 2s infinite;"></div>
                <!-- Saffron/Amber Cosmic Teardrop Pin -->
                <div style="width: 34px; height: 34px; border-radius: 50% 50% 50% 0; background: linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #c2410c 100%); transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.5); border: 2.5px solid #ffffff;">
                    <!-- Inner Dot / Eye -->
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: #ffffff; transform: rotate(45deg); box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
                </div>
            </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38]
    });
};

// Ensures Leaflet map properly recalculates its viewport and loads tiles inside modal
function MapInvalidator() {
    const map = useMap();
    useEffect(() => {
        // Immediate invalidate
        map.invalidateSize();

        // Staggered invalidations to guarantee tile calculation after modal transition
        const t1 = setTimeout(() => map.invalidateSize(), 100);
        const t2 = setTimeout(() => map.invalidateSize(), 300);
        const t3 = setTimeout(() => map.invalidateSize(), 600);

        // Container resize observer for responsive layout changes
        const container = map.getContainer();
        let ro = null;
        if (container && typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(() => {
                map.invalidateSize();
            });
            ro.observe(container);
        }

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            if (ro) ro.disconnect();
        };
    }, [map]);
    return null;
}

// Map controller to handle map events and programmatically fly to positions
function MapController({ position, onMapClick, onMarkerDragEnd }) {
    const map = useMap();
    const markerRef = useRef(null);
    const markerIcon = useMemo(() => createAstroMarkerIcon(), []);

    // Listen for map clicks
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        }
    });

    // Marker drag handlers
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const latlng = marker.getLatLng();
                    onMarkerDragEnd(latlng.lat, latlng.lng);
                }
            }
        }),
        [onMarkerDragEnd]
    );

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
            icon={markerIcon}
        />
    );
}

// Map center synchronizer
function MapFlyTo({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center && Array.isArray(center) && center.length === 2) {
            map.flyTo(center, Math.max(map.getZoom(), 12), { duration: 1.2 });
        }
    }, [center, map]);
    return null;
}

export const MapPickerModal = ({ isOpen, onClose, initialLocation, onConfirm, lang = 'te' }) => {
    const isTe = lang === 'te';

    // Current coordinates
    const [coords, setCoords] = useState({
        lat: initialLocation?.lat || 17.3850,
        lon: initialLocation?.lon || 78.4867
    });

    // Address & Timezone details for current coordinates
    const [placeDetails, setPlaceDetails] = useState({
        name: initialLocation?.name || 'Hyderabad',
        displayName: initialLocation?.displayName || 'Hyderabad, Telangana, India',
        city: initialLocation?.city || 'Hyderabad',
        state: initialLocation?.state || 'Telangana',
        country: initialLocation?.country || 'India',
        timezone: initialLocation?.timezone || 'Asia/Kolkata',
        tzLabel: initialLocation?.tzLabel || 'IST (UTC+05:30)'
    });

    const [isReverseLoading, setIsReverseLoading] = useState(false);
    const [mapFlyTarget, setMapFlyTarget] = useState([coords.lat, coords.lon]);

    // In-map search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [geoError, setGeoError] = useState(null);

    const debounceTimerRef = useRef(null);
    const searchDebounceRef = useRef(null);

    // Synchronize initial location when opened
    useEffect(() => {
        if (isOpen && initialLocation) {
            const lat = Number(initialLocation.lat) || 17.3850;
            const lon = Number(initialLocation.lon) || 78.4867;
            setCoords({ lat, lon });
            setMapFlyTarget([lat, lon]);
            const tz = initialLocation.timezone || resolveIanaTimezone(lat, lon);
            const offset = getTimezoneOffsetForDate(tz);
            setPlaceDetails({
                name: initialLocation.name || 'Selected Point',
                displayName: initialLocation.displayName || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
                city: initialLocation.city || '',
                state: initialLocation.state || '',
                country: initialLocation.country || '',
                timezone: tz,
                tzLabel: `${tz.split('/').pop().replace(/_/g, ' ')} (${offset})`
            });
        }
    }, [isOpen, initialLocation]);

    // Handle coordinate change (debounced reverse geocoding)
    const handleCoordsChange = useCallback((newLat, newLon) => {
        setCoords({ lat: newLat, lon: newLon });
        setIsReverseLoading(true);

        // Immediate offline timezone resolution
        const immediateTz = resolveIanaTimezone(newLat, newLon);
        const immediateOffset = getTimezoneOffsetForDate(immediateTz);
        setPlaceDetails(prev => ({
            ...prev,
            timezone: immediateTz,
            tzLabel: `${immediateTz.split('/').pop().replace(/_/g, ' ')} (${immediateOffset})`
        }));

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(async () => {
            try {
                const details = await reverseGeocodeOnline(newLat, newLon);
                setPlaceDetails({
                    name: details.name || `${newLat.toFixed(4)}°, ${newLon.toFixed(4)}°`,
                    displayName: details.displayName || `${newLat.toFixed(4)}° N, ${newLon.toFixed(4)}° E`,
                    city: details.city || '',
                    state: details.state || '',
                    country: details.country || '',
                    timezone: details.timezone || immediateTz,
                    tzLabel: details.tzLabel || `${immediateTz} (${immediateOffset})`
                });
            } catch (err) {
                console.warn("Reverse geocode failed:", err);
            } finally {
                setIsReverseLoading(false);
            }
        }, 350);
    }, []);

    // Handle search query change in map search bar
    const handleSearchInput = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        setShowSearchDropdown(true);

        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        if (!val.trim() || val.trim().length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchDebounceRef.current = setTimeout(async () => {
            try {
                const results = await searchLocationsOnline(val, 5);
                setSearchResults(results);
            } catch (err) {
                console.warn("In-map search error:", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    };

    // When a search result is clicked inside map
    const handleSelectSearchResult = (item) => {
        setCoords({ lat: item.lat, lon: item.lon });
        setMapFlyTarget([item.lat, item.lon]);
        setPlaceDetails({
            name: item.name,
            displayName: item.displayName,
            city: item.city || '',
            state: item.state || '',
            country: item.country || '',
            timezone: item.timezone,
            tzLabel: item.tzLabel
        });
        setSearchQuery(item.name);
        setShowSearchDropdown(false);
    };

    // Use browser GPS current location
    const handleUseCurrentLocation = () => {
        setGeoError(null);
        if (!navigator.geolocation) {
            setGeoError(isTe ? "మీ బ్రౌజర్‌లో జియోలొకేషన్ అందుబాటులో లేదు." : "Geolocation is not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                setMapFlyTarget([lat, lon]);
                handleCoordsChange(lat, lon);
            },
            (err) => {
                setGeoError(isTe ? "స్థానాన్ని పొందడం సాధ్యం కాలేదు. అనుమతులను తనిఖీ చేయండి." : "Could not retrieve your location. Please check browser permissions.");
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    };

    // Confirm button handler
    const handleConfirm = () => {
        onConfirm({
            id: `map_${coords.lat.toFixed(4)}_${coords.lon.toFixed(4)}`,
            name: placeDetails.name,
            displayName: placeDetails.displayName,
            state: placeDetails.state,
            country: placeDetails.country,
            city: placeDetails.city,
            lat: Number(coords.lat),
            lon: Number(coords.lon),
            timezone: placeDetails.timezone,
            tzLabel: placeDetails.tzLabel,
            telugu: isTe ? placeDetails.name : null
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-4xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-amber-300/80 dark:border-white/15 overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent dark:from-stone-800 dark:to-stone-900 border-b border-orange-200/80 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
                            <Compass className="w-4 h-4 animate-spin-slow" />
                        </div>
                        <div>
                            <h3 className="font-serif font-bold text-base text-gray-900 dark:text-white">
                                {isTe ? "మ్యాప్‌లో జన్మస్థలాన్ని ఎంచుకోండి" : "Select Birthplace on Map"}
                            </h3>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                {isTe ? "ఖచ్చితమైన సమన్వయాల కోసం పిన్‌ను లాగండి లేదా మ్యాప్‌పై నొక్కండి" : "Click anywhere or drag the pin to your exact birth location"}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-orange-100/50 dark:hover:bg-white/10 transition-colors"
                        aria-label="Close Map"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Map Search Bar & Quick Location Controls */}
                <div className="px-4 py-2.5 bg-orange-50/50 dark:bg-stone-800/60 border-b border-orange-200/60 dark:border-white/10 flex flex-wrap items-center gap-2 relative z-20">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchInput}
                            onFocus={() => setShowSearchDropdown(true)}
                            placeholder={isTe ? "నగరం లేదా ప్రాంతాన్ని శోధించండి (ఉదా: హైదరాబాద్, విజయవాడ...)" : "Search city, town, or area (e.g. Warangal, London, Dallas)..."}
                            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-white/15 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white"
                        />
                        {isSearching && (
                            <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                        )}

                        {/* Search Dropdown */}
                        {showSearchDropdown && searchResults.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-stone-900 border border-amber-300 dark:border-white/15 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                                {searchResults.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSelectSearchResult(item)}
                                        className="px-3 py-2 hover:bg-amber-50 dark:hover:bg-white/10 cursor-pointer text-xs flex justify-between items-center transition-colors"
                                    >
                                        <div className="truncate">
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {item.name}
                                            </span>
                                            <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-1.5 truncate">
                                                ({item.state ? `${item.state}, ` : ''}{item.country})
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono shrink-0 ml-2">
                                            {item.timezone?.split('/').pop()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        className="py-2 px-3 rounded-xl bg-white dark:bg-stone-900 border border-orange-200 dark:border-white/15 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-amber-400 flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                        <Navigation className="w-3.5 h-3.5 text-amber-500" />
                        <span>{isTe ? "నా ప్రస్తుత స్థానం" : "My Location"}</span>
                    </button>
                </div>

                {geoError && (
                    <div className="px-4 py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 border-b border-red-200 dark:border-red-800/40">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{geoError}</span>
                    </div>
                )}

                {/* Leaflet Interactive Map Container */}
                <div className="relative flex-1 w-full min-h-[380px] sm:min-h-[460px] h-[380px] sm:h-[460px] bg-amber-50/20 dark:bg-stone-950">
                    <MapContainer
                        center={[coords.lat, coords.lon]}
                        zoom={13}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%', minHeight: '380px' }}
                        className="z-10 h-full w-full"
                    >
                        {/* OpenStreetMap Standard Tiles */}
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            maxZoom={19}
                        />

                        {/* Force container layout invalidation on open/resize */}
                        <MapInvalidator />

                        {/* Interactive marker and map clicks */}
                        <MapController
                            position={[coords.lat, coords.lon]}
                            onMapClick={handleCoordsChange}
                            onMarkerDragEnd={handleCoordsChange}
                        />

                        {/* Programmatic flyTo */}
                        <MapFlyTo center={mapFlyTarget} />
                    </MapContainer>

                    {/* Attribution note banner */}
                    <div className="absolute bottom-1 right-1 z-20 bg-white/80 dark:bg-stone-900/80 px-2 py-0.5 rounded text-[9px] text-gray-500 dark:text-gray-400 backdrop-blur-sm pointer-events-none">
                        Map data &copy; OpenStreetMap contributors
                    </div>
                </div>

                {/* Live Reverse Geocoded Pin Summary Card & Confirm Footer */}
                <div className="p-4 bg-orange-50/40 dark:bg-stone-850 border-t border-orange-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex-1 w-full text-left">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2 truncate">
                                    <span className="truncate">{placeDetails.displayName}</span>
                                    {isReverseLoading && (
                                        <Loader2 className="w-3 h-3 text-amber-500 animate-spin shrink-0" />
                                    )}
                                </div>
                                <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5 flex flex-wrap gap-x-2">
                                    <span>
                                        {coords.lat >= 0 ? `${coords.lat.toFixed(4)}° N` : `${Math.abs(coords.lat).toFixed(4)}° S`}, {coords.lon >= 0 ? `${coords.lon.toFixed(4)}° E` : `${Math.abs(coords.lon).toFixed(4)}° W`}
                                    </span>
                                    <span>•</span>
                                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                        {placeDetails.tzLabel}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/15 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                            {isTe ? "రద్దు చేయి" : "Cancel"}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-1.5 active:scale-98"
                        >
                            <Check className="w-4 h-4" />
                            <span>{isTe ? "ఈ స్థానాన్ని ఖరారు చేయండి" : "Confirm This Location"}</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
