/**
 * KP Astrology Studio - Authoritative Backend API Server
 * Dedicated calculation service powered by Swiss Ephemeris (v2.10.03)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sweph from 'sweph';

import locationRoutes from './routes/locationRoutes.js';
import kpRoutes from './routes/kpRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables if not in production
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.join(__dirname, '../.env') });
}

const app = express();
const port = process.env.PORT || 5001;

app.set('trust proxy', 1);

// Middleware
app.use(compression());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(express.json());

// CORS Configuration
const normalizeUrl = (url) => url ? url.replace(/\/$/, '') : '';
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'https://7pdw3mwf-5173.inc1.devtunnels.ms',
    'https://7pdw3mwf-5001.inc1.devtunnels.ms',
    normalizeUrl(process.env.FRONTEND_URL)
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const normalizedOrigin = normalizeUrl(origin);
        if (
            process.env.NODE_ENV !== 'production' ||
            allowedOrigins.includes(normalizedOrigin) ||
            normalizedOrigin.includes('localhost') ||
            normalizedOrigin.includes('127.0.0.1') ||
            normalizedOrigin.includes('192.168.') ||
            normalizedOrigin.includes('devtunnels.ms') ||
            !process.env.FRONTEND_URL
        ) {
            return callback(null, true);
        }
        callback(new Error('CORS BLOCKED'), false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// API Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { success: false, message: 'Too many requests, please try again shortly.' }
});
app.use('/api/', apiLimiter);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    let swephStatus = 'unknown';
    try {
        if (sweph && sweph.constants) {
            swephStatus = 'active (sweph 2.10.03)';
        }
    } catch (e) {
        swephStatus = 'unavailable (' + e.message + ')';
    }

    res.json({
        success: true,
        service: 'KP Astrology Studio API',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        engine: {
            name: 'Swiss Ephemeris',
            status: swephStatus,
            ayanamsha: 'SE_SIDM_KRISHNAMURTI (Mode 5)',
            houseSystem: 'Placidus (Semi-diurnal / Semi-nocturnal Arc Trisection)'
        }
    });
});

// Mount Routes
app.use('/api/location', locationRoutes);
app.use('/api', kpRoutes);

// 404 Handler for API
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// Serve frontend dist build if accessed on port 5001
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) next();
    });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error: ' + (process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message)
    });
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(port, '0.0.0.0', () => {
        console.log(`✨ KP Astrology Studio API Server running on port ${port}`);
        console.log(`   Health check: http://localhost:${port}/api/health`);
    });
}

export default app;
