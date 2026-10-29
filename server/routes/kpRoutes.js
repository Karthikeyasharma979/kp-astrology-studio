import express from 'express';
import Joi from 'joi';
import { calculateKPKundliSwiss, calculateVimshottariDasha, KP_AYANAMSHA_MODES } from '../services/swissEphemerisService.js';

const router = express.Router();

/**
 * POST /api/kp-kundli
 * Authoritative KP Kundli Calculation Endpoint using Swiss Ephemeris 2.10.03
 */
router.post('/kp-kundli', (req, res) => {
    try {
        const schema = Joi.object({
            birthDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
            birthTime: Joi.string().pattern(/^\d{1,2}:\d{2}(:\d{2})?$/).required(),
            lat: Joi.number().min(-90).max(90).required(),
            lon: Joi.number().min(-180).max(180).required(),
            timezone: Joi.string().default('Asia/Kolkata'),
            ayanamshaMode: Joi.string().valid('KP_NEW', 'KP_ORIGINAL', 'KP_STRAIGHT').default('KP_NEW'),
            nodeMode: Joi.string().valid('mean', 'true').default('mean'),
            chartMode: Joi.string().valid('natal', 'horary').default('natal'),
            kpNumber: Joi.number().integer().min(1).max(249).allow(null),
            ascendantPoint: Joi.string().valid('start', 'mid').default('start'),
            horarySeed: Joi.object().allow(null)
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const data = calculateKPKundliSwiss(value);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('KP Kundli Calculation Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Calculation error occurred while processing astrological data: ' + error.message
        });
    }
});

/**
 * POST /api/kp/vimshottari-dasha
 * Dedicated Vimshottari Dasha Calculation Endpoint
 */
router.post('/kp/vimshottari-dasha', (req, res) => {
    try {
        const schema = Joi.object({
            birthDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
            birthTime: Joi.string().pattern(/^\d{1,2}:\d{2}(:\d{2})?$/),
            lat: Joi.number().min(-90).max(90),
            lon: Joi.number().min(-180).max(180),
            timezone: Joi.string().default('Asia/Kolkata'),
            ayanamshaMode: Joi.string().valid('KP_NEW', 'KP_ORIGINAL', 'KP_STRAIGHT').default('KP_NEW'),
            moonSiderealLongitude: Joi.number().min(0).max(360),
            birthDateUtc: Joi.string().isoDate(),
            referenceDate: Joi.string().isoDate().allow(null, '')
        }).or('birthDate', 'moonSiderealLongitude');

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        let dashaResult;

        if (value.moonSiderealLongitude != null && value.birthDateUtc) {
            dashaResult = calculateVimshottariDasha({
                moonSiderealLongitude: value.moonSiderealLongitude,
                birthDateUtc: value.birthDateUtc,
                referenceDate: value.referenceDate || null
            });
        } else {
            if (!value.birthDate || !value.birthTime || value.lat == null || value.lon == null) {
                return res.status(400).json({
                    success: false,
                    message: "Missing birthDate, birthTime, lat, or lon."
                });
            }

            const kpData = calculateKPKundliSwiss({
                birthDate: value.birthDate,
                birthTime: value.birthTime,
                lat: value.lat,
                lon: value.lon,
                timezone: value.timezone || 'Asia/Kolkata',
                ayanamshaMode: value.ayanamshaMode || 'KP_NEW'
            });

            const moonPlanet = kpData.planets.find(p => p.key === 'Moon');
            dashaResult = calculateVimshottariDasha({
                moonSiderealLongitude: moonPlanet.longitude,
                birthDateUtc: kpData.metadata.utcDate,
                referenceDate: value.referenceDate || null,
                planets: kpData.planets,
                cusps: kpData.cusps,
                aspects: kpData.aspects,
                significators: kpData.significators
            });
        }

        res.json({
            success: true,
            data: dashaResult
        });
    } catch (error) {
        console.error('Vimshottari Dasha Calculation Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Calculation error occurred while processing Vimshottari Dasha data: ' + error.message
        });
    }
});

/**
 * GET /api/kp/ayanamsha-modes
 * Returns supported Ayanamsha modes and metadata
 */
router.get('/kp/ayanamsha-modes', (req, res) => {
    res.json({
        success: true,
        modes: KP_AYANAMSHA_MODES,
        default: KP_AYANAMSHA_MODES.KP_NEW,
        description: {
            KP_NEW: 'Swiss Ephemeris Krishnamurti Sidereal Mode (SE_SIDM_KRISHNAMURTI = 5)',
            KP_ORIGINAL: 'Traditional K.S. Krishnamurti manual ephemeris baseline (23° 45\' 56" at J2000)',
            KP_STRAIGHT: 'Straight linear model from zero-ayanamsha year 291.0 AD'
        }
    });
});

export default router;
