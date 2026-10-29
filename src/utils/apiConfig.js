/**
 * API Configuration
 * Resolves API Base URL from environment variables for deployment (Vercel, Render, Railway),
 * falling back to relative paths for local development and proxying.
 *
 * Compatible with both browser (Vite import.meta.env) and Node.js backend (process.env).
 */
const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
const procEnv = (typeof process !== 'undefined' && process.env) ? process.env : {};

export const API_BASE_URL = (
    metaEnv.VITE_API_URL ||
    metaEnv.VITE_BACKEND_URL ||
    procEnv.VITE_API_URL ||
    procEnv.VITE_BACKEND_URL ||
    ''
).replace(/\/+$/, '');
