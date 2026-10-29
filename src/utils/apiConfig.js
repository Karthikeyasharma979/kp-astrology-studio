/**
 * API Configuration
 * Resolves API Base URL from environment variables for deployment (Vercel, Render, Railway),
 * falling back to relative paths for local development and proxying.
 */
export const API_BASE_URL = (
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL)) || ''
).replace(/\/+$/, '');

