/**
 * AstroSharma Comprehensive Location Search, Map Picker, and Timezone Test Suite
 *
 * Validates:
 * 1. Worldwide geocoding search & autocomplete (Open-Meteo & Photon)
 * 2. Reverse geocoding for map picker marker positioning
 * 3. Authoritative coordinate-to-IANA-timezone boundary resolution (tz-lookup)
 * 4. Historical Daylight Saving Time (DST) and timezone offsets for birth dates
 * 5. Input validation and error handling for invalid/extreme coordinates
 * 6. Integration with KP Kundli Calculation Engine and Backend API
 */

import assert from 'assert';
import { resolveLocalToUTC } from '../src/services/locationService.js';
import { calculateKPKundli } from '../src/services/kpCalculator.js';
import {
    searchLocations,
    reverseGeocode,
    resolveTimezoneForDate,
    resolveIanaTimezone,
    POPULAR_LOCATIONS
} from '../server/services/geocodingService.js';
import { calculateKPKundliSwiss } from '../server/services/swissEphemerisService.js';

let passedCount = 0;
let failedCount = 0;

function it(description, testFn) {
    return (async () => {
        try {
            await testFn();
            console.log(`  ✓ ${description}`);
            passedCount++;
        } catch (err) {
            console.error(`  ✗ ${description}`);
            console.error(`    Error: ${err.message}`);
            failedCount++;
        }
    })();
}

async function runLocationSuite() {
    console.log('\n=== RUNNING ASTROSHARMA LOCATION, GEOCODING & TIMEZONE TEST SUITE ===\n');

    // 1. Curated Popular Indian & Telugu Locations
    await it("Curated locations list contains major Indian and diaspora cities with Telugu metadata", () => {
        assert.ok(POPULAR_LOCATIONS.length >= 25, "Must contain at least 25 curated locations");
        const hyd = POPULAR_LOCATIONS.find(l => l.name === 'Hyderabad');
        assert.ok(hyd, "Hyderabad must be in curated list");
        assert.strictEqual(hyd.state, 'Telangana');
        assert.strictEqual(hyd.country, 'India');
        assert.strictEqual(hyd.telugu, 'హైదరాబాద్');
        assert.strictEqual(hyd.timezone, 'Asia/Kolkata');
        assert.strictEqual(hyd.lat, 17.3850);
        assert.strictEqual(hyd.lon, 78.4867);
    });

    // 2. Local Search & Fast Autocomplete
    await it("Fast local search finds cities by prefix and Telugu names", async () => {
        const vja = await searchLocations("Vijayawada", 5);
        assert.ok(vja.length > 0, "Should find Vijayawada");
        assert.strictEqual(vja[0].name, 'Vijayawada');
        assert.strictEqual(vja[0].state, 'Andhra Pradesh');

        // Telugu script search
        const teluguSearch = await searchLocations("వరంగల్", 5);
        assert.ok(teluguSearch.length > 0, "Should find Warangal by Telugu script query");
        assert.strictEqual(teluguSearch[0].name, 'Warangal');
    });

    // 3. Worldwide Search (Open-Meteo & Photon Integration)
    await it("Worldwide forward search resolves international cities with country and coordinates", async () => {
        const london = await searchLocations("London", 5);
        assert.ok(london.length > 0, "Should find London");
        const gbLondon = london.find(l => l.countryCode === 'GB' || l.country === 'United Kingdom');
        assert.ok(gbLondon, "Should resolve London, UK");
        assert.strictEqual(gbLondon.timezone, 'Europe/London');
        assert.ok(Math.abs(gbLondon.lat - 51.5) < 0.2);

        const dallas = await searchLocations("Dallas", 5);
        assert.ok(dallas.length > 0, "Should find Dallas");
        assert.strictEqual(dallas[0].timezone, 'America/Chicago');
    });

    // 4. In-Memory Search Caching
    await it("Search caching returns cached results without duplicate upstream requests", async () => {
        const query = "Warangal";
        const t0 = Date.now();
        const first = await searchLocations(query, 5);
        const t1 = Date.now();

        // Second call should hit in-memory cache instantly
        const second = await searchLocations(query, 5);
        const t2 = Date.now();

        assert.deepStrictEqual(first, second);
        assert.ok((t2 - t1) <= (t1 - t0) + 10, "Cached retrieval should be near-instantaneous");
    });

    // 5. Reverse Geocoding for Map Marker Movement
    await it("Reverse geocoding resolves coordinates to readable place name and address", async () => {
        // Coordinates for Charminar / Hyderabad: 17.3616, 78.4747
        const res = await reverseGeocode(17.3616, 78.4747);
        assert.ok(res, "Reverse geocode must return data");
        assert.strictEqual(res.timezone, 'Asia/Kolkata');
        assert.strictEqual(res.country, 'India');
        assert.ok(res.displayName.length > 0);

        // Coordinates for Central Park / NYC: 40.785091, -73.968285
        const nyc = await reverseGeocode(40.785091, -73.968285);
        assert.ok(nyc, "Reverse geocode for NYC must return data");
        assert.strictEqual(nyc.timezone, 'America/New_York');
        assert.strictEqual(nyc.country, 'United States');
    });

    // 6. Coordinate to IANA Timezone Polygon Boundary Resolution
    await it("Authoritative IANA timezone resolves accurately across worldwide coordinate zones", () => {
        // India
        assert.strictEqual(resolveIanaTimezone(17.3850, 78.4867), 'Asia/Kolkata');
        assert.strictEqual(resolveIanaTimezone(28.6139, 77.2090), 'Asia/Kolkata');
        
        // USA
        assert.strictEqual(resolveIanaTimezone(40.7128, -74.0060), 'America/New_York');
        assert.strictEqual(resolveIanaTimezone(34.0522, -118.2437), 'America/Los_Angeles');
        assert.strictEqual(resolveIanaTimezone(41.8781, -87.6298), 'America/Chicago');
        assert.strictEqual(resolveIanaTimezone(21.3069, -157.8583), 'Pacific/Honolulu');

        // Europe
        assert.strictEqual(resolveIanaTimezone(51.5074, -0.1278), 'Europe/London');
        assert.strictEqual(resolveIanaTimezone(48.8566, 2.3522), 'Europe/Paris');

        // Asia / Pacific
        assert.strictEqual(resolveIanaTimezone(35.6762, 139.6503), 'Asia/Tokyo');
        assert.strictEqual(resolveIanaTimezone(1.3521, 103.8198), 'Asia/Singapore');

        // Southern Hemisphere (Australia)
        assert.strictEqual(resolveIanaTimezone(-33.8688, 151.2093), 'Australia/Sydney');
    });

    // 7. Historical Daylight Saving Time (DST) & Timezone Resolution for Birth Dates
    await it("Historical DST converts local birth time to exact UTC matching IANA epoch records", () => {
        // New York Summer: July 15, 1980, 10:30 AM EDT is UTC-4:00 -> 14:30:00Z
        const nySummer = resolveLocalToUTC("1980-07-15", "10:30", "America/New_York");
        assert.strictEqual(nySummer.toISOString(), "1980-07-15T14:30:00.000Z");

        // New York Winter: January 15, 1980, 10:30 AM EST is UTC-5:00 -> 15:30:00Z
        const nyWinter = resolveLocalToUTC("1980-01-15", "10:30", "America/New_York");
        assert.strictEqual(nyWinter.toISOString(), "1980-01-15T15:30:00.000Z");

        // London Summer: June 15, 1990, 10:30 AM BST is UTC+1:00 -> 09:30:00Z
        const lonSummer = resolveLocalToUTC("1990-06-15", "10:30", "Europe/London");
        assert.strictEqual(lonSummer.toISOString(), "1990-06-15T09:30:00.000Z");

        // London Winter: December 15, 1990, 10:30 AM GMT is UTC+0:00 -> 10:30:00Z
        const lonWinter = resolveLocalToUTC("1990-12-15", "10:30", "Europe/London");
        assert.strictEqual(lonWinter.toISOString(), "1990-12-15T10:30:00.000Z");

        // Sydney Summer (Southern Hemisphere Summer in January): Jan 15, 2020 AEDT is UTC+11:00 -> 23:30 prev day UTC
        const sydSummer = resolveLocalToUTC("2020-01-15", "10:30", "Australia/Sydney");
        assert.strictEqual(sydSummer.toISOString(), "2020-01-14T23:30:00.000Z");

        // Sydney Winter (July): July 15, 2020 AEST is UTC+10:00 -> 00:30 UTC
        const sydWinter = resolveLocalToUTC("2020-07-15", "10:30", "Australia/Sydney");
        assert.strictEqual(sydWinter.toISOString(), "2020-07-15T00:30:00.000Z");
    });

    // 8. Invalid Coordinates Validation & Safety
    await it("Throws or rejects invalid coordinate inputs gracefully", async () => {
        assert.throws(() => {
            resolveTimezoneForDate(95.0, 78.0);
        }, /Invalid geographic coordinates/);

        assert.throws(() => {
            resolveTimezoneForDate(-91.0, 78.0);
        }, /Invalid geographic coordinates/);

        assert.throws(() => {
            resolveTimezoneForDate(17.0, 185.0);
        }, /Invalid geographic coordinates/);

        assert.throws(() => {
            resolveTimezoneForDate(NaN, 78.0);
        }, /Invalid geographic coordinates/);

        await assert.rejects(async () => {
            await reverseGeocode(100.0, 200.0);
        }, /Invalid latitude or longitude/);
    });

    // 9. Integration with KP Kundli Engine
    await it("Integrates selected location and timezone into KP calculation engine with high precision", () => {
        // Selected location: Dallas, Texas
        const dallasLat = 32.7767;
        const dallasLon = -96.7970;
        const dallasTz = resolveIanaTimezone(dallasLat, dallasLon);
        assert.strictEqual(dallasTz, 'America/Chicago');

        const kpResult = calculateKPKundliSwiss({
            birthDate: "1995-04-12",
            birthTime: "14:15",
            lat: dallasLat,
            lon: dallasLon,
            timezone: dallasTz,
            ayanamshaMode: "KP_NEW",
            nodeMode: "mean"
        });

        assert.ok(kpResult, "KP Calculation must succeed for selected location");
        assert.strictEqual(kpResult.cusps.length, 12, "Must calculate 12 Placidus cusps");
        assert.strictEqual(kpResult.planets.length, 9, "Must calculate 9 Vedic/KP planets");
        assert.ok(kpResult.lagna, "Must calculate Lagna (Ascendant)");
        assert.ok(kpResult.metadata?.ayanamshaDeg, "Must compute KP New Ayanamsha");

        // Verify that Sub Lord and Sub-Sub Lord are fully populated
        kpResult.planets.forEach(p => {
            assert.ok(p.subLord, `Planet ${p.name} must have a Sub Lord`);
            assert.ok(p.subSubLord, `Planet ${p.name} must have a Sub-Sub Lord`);
            assert.ok(p.starLord, `Planet ${p.name} must have a Star Lord`);
        });

        kpResult.cusps.forEach(c => {
            assert.ok(c.subLord, `Cusp ${c.house} must have a Sub Lord`);
            assert.ok(c.subSubLord, `Cusp ${c.house} must have a Sub-Sub Lord`);
        });

        // Also verify client-side calculateKPKundli
        const clientKpResult = calculateKPKundli({
            birthDate: "1995-04-12",
            birthTime: "14:15",
            lat: dallasLat,
            lon: dallasLon,
            timezone: dallasTz,
            ayanamshaMode: "KP_NEW",
            nodeMode: "mean"
        });
        assert.ok(clientKpResult, "Client KP Calculation must succeed");
        assert.strictEqual(clientKpResult.cusps.length, 12);
        assert.strictEqual(clientKpResult.planets.length, 9);
    });

    console.log(`\nLOCATION TEST SUITE SUMMARY: ${passedCount} Passed, ${failedCount} Failed.\n`);

    if (failedCount > 0) {
        process.exit(1);
    }
}

runLocationSuite().catch(err => {
    console.error("Test suite runtime failure:", err);
    process.exit(1);
});
