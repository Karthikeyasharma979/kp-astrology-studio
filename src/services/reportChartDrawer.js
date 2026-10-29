/**
 * AstroSharma High-Resolution Astrological Chart Drawer for PDF Reports
 *
 * Renders print-quality vector/canvas charts (South Indian and North Indian)
 * at 300 DPI equivalent for seamless embedding into jsPDF documents.
 */

import { formatDMS } from '../utils/nakshatraUtils.js';

const ZODIAC_SIGNS = [
    { name: 'Aries', short: 'Ar', sanskrit: 'Mesha', index: 0 },
    { name: 'Taurus', short: 'Ta', sanskrit: 'Vrishabha', index: 1 },
    { name: 'Gemini', short: 'Ge', sanskrit: 'Mithuna', index: 2 },
    { name: 'Cancer', short: 'Cn', sanskrit: 'Karka', index: 3 },
    { name: 'Leo', short: 'Le', sanskrit: 'Simha', index: 4 },
    { name: 'Virgo', short: 'Vi', sanskrit: 'Kanya', index: 5 },
    { name: 'Libra', short: 'Li', sanskrit: 'Tula', index: 6 },
    { name: 'Scorpio', short: 'Sc', sanskrit: 'Vrishchika', index: 7 },
    { name: 'Sagittarius', short: 'Sg', sanskrit: 'Dhanu', index: 8 },
    { name: 'Capricorn', short: 'Cp', sanskrit: 'Makara', index: 9 },
    { name: 'Aquarius', short: 'Aq', sanskrit: 'Kumbha', index: 10 },
    { name: 'Pisces', short: 'Pi', sanskrit: 'Meena', index: 11 }
];

const PLANET_SHORT = {
    Sun: 'Su',
    Moon: 'Mo',
    Mars: 'Ma',
    Mercury: 'Me',
    Jupiter: 'Ju',
    Venus: 'Ve',
    Saturn: 'Sa',
    Rahu: 'Ra',
    Ketu: 'Ke',
    Uranus: 'Ur',
    Neptune: 'Ne',
    Pluto: 'Pl'
};

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// South Indian fixed sign placement (clockwise from Pisces at top-left)
const SOUTH_INDIAN_BOXES = [
    { signIndex: 11, label: 'Pisces', row: 0, col: 0 },
    { signIndex: 0, label: 'Aries', row: 0, col: 1 },
    { signIndex: 1, label: 'Taurus', row: 0, col: 2 },
    { signIndex: 2, label: 'Gemini', row: 0, col: 3 },

    { signIndex: 10, label: 'Aquarius', row: 1, col: 0 },
    { signIndex: 3, label: 'Cancer', row: 1, col: 3 },

    { signIndex: 9, label: 'Capricorn', row: 2, col: 0 },
    { signIndex: 4, label: 'Leo', row: 2, col: 3 },

    { signIndex: 8, label: 'Sagittarius', row: 3, col: 0 },
    { signIndex: 7, label: 'Scorpio', row: 3, col: 1 },
    { signIndex: 6, label: 'Libra', row: 3, col: 2 },
    { signIndex: 5, label: 'Virgo', row: 3, col: 3 }
];

function formatDegMin(deg) {
    if (deg === undefined || deg === null || isNaN(deg)) return '';
    const abs = Math.abs(Number(deg));
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    return `${d}°${String(m).padStart(2, '0')}'`;
}

/**
 * Draws South Indian Chart to Canvas
 */
export function drawSouthIndianChartToCanvas(canvas, { planets = [], cusps = [], lagna = null, metadata = {}, birthDetails = {} }) {
    const size = canvas.width;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background - Ivory White
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    const pad = 24;
    const chartW = size - pad * 2;
    const cellW = chartW / 4;
    const cellH = chartW / 4;

    // Draw Outer & Inner Grid
    ctx.strokeStyle = '#2A1810';
    ctx.lineWidth = 3;
    ctx.strokeRect(pad, pad, chartW, chartW);

    // Inner lines
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(pad + i * cellW, pad);
        ctx.lineTo(pad + i * cellW, pad + chartW);
        ctx.stroke();

        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(pad, pad + i * cellH);
        ctx.lineTo(pad + chartW, pad + i * cellH);
        ctx.stroke();
    }

    // Center 2x2 Box Background - Soft Cream
    ctx.fillStyle = '#FBF8F1';
    ctx.fillRect(pad + cellW, pad + cellH, cellW * 2, cellH * 2);

    // Subtle Gold Inner Border for Center Box
    ctx.strokeStyle = '#C59B27';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad + cellW + 2, pad + cellH + 2, cellW * 2 - 4, cellH * 2 - 4);

    // Center Box Content (Title, Subject, Lagna, Moon, Ayanamsha)
    ctx.fillStyle = '#4A0E17';
    ctx.font = 'bold 26px serif';
    ctx.textAlign = 'center';
    ctx.fillText('AstroSharma KP Kundli', pad + chartW / 2, pad + cellH + 45);

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 16px sans-serif';
    const subTitle = birthDetails.name || 'Horary / Birth Chart';
    ctx.fillText(subTitle, pad + chartW / 2, pad + cellH + 75);

    ctx.fillStyle = '#1E293B';
    ctx.font = '15px sans-serif';
    const lagnaSignName = lagna?.sign?.en || (lagna?.signIndex !== undefined ? ZODIAC_SIGNS[lagna.signIndex]?.name : 'Lagna');
    const lagnaDegStr = lagna?.degreeInSign !== undefined ? formatDegMin(lagna.degreeInSign) : '';
    ctx.fillText(`Ascendant (Lagna): ${lagnaSignName} ${lagnaDegStr}`, pad + chartW / 2, pad + cellH + 115);

    const moon = planets.find(p => p.key === 'Moon');
    const moonSignName = moon?.sign?.en || (moon?.signIndex !== undefined ? ZODIAC_SIGNS[moon.signIndex]?.name : '');
    const moonDegStr = moon?.degreeInSign !== undefined ? formatDegMin(moon.degreeInSign) : '';
    const nakStr = moon?.nakshatra?.name || '';
    if (moonSignName) {
        ctx.fillText(`Moon: ${moonSignName} ${moonDegStr} (${nakStr})`, pad + chartW / 2, pad + cellH + 142);
    }

    const ayanamshaStr = metadata.ayanamshaFormatted || (metadata.ayanamshaDeg ? `${metadata.ayanamshaDeg}°` : 'KP New Ayanamsha');
    ctx.fillStyle = '#0369A1';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`Ayanamsha: ${ayanamshaStr} [Placidus]`, pad + chartW / 2, pad + cellH + 175);

    if (birthDetails.birthDate) {
        ctx.fillStyle = '#64748B';
        ctx.font = '13px sans-serif';
        const loc = birthDetails.birthPlace ? ` - ${birthDetails.birthPlace}` : '';
        ctx.fillText(`${birthDetails.birthDate} ${birthDetails.birthTime || ''}${loc}`, pad + chartW / 2, pad + cellH + 205);
    }

    // Populate the 12 Outer Zodiac Boxes
    SOUTH_INDIAN_BOXES.forEach(box => {
        const x = pad + box.col * cellW;
        const y = pad + box.row * cellH;

        // Sign Name at Top-Left of Box
        ctx.fillStyle = '#94A3B8';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(box.label.toUpperCase(), x + 8, y + 20);

        let curY = y + 38;

        // Cusps falling in this sign
        const cellCusps = cusps.filter(c => c.signIndex === box.signIndex);
        cellCusps.forEach(c => {
            const hNum = c.houseNumber;
            const roman = ROMAN_NUMERALS[hNum - 1] || `H${hNum}`;
            const deg = formatDegMin(c.degreeInSign);
            const stl = c.starLord?.slice(0, 2) || '';
            const sub = c.subLord?.slice(0, 2) || '';

            ctx.fillStyle = '#0284C7'; // Deep Sky Blue / Cyan
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${roman} ${deg}`, x + 8, curY);

            ctx.fillStyle = '#0369A1';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`[${stl}-${sub}]`, x + cellW - 8, curY);

            curY += 17;
        });

        // Planets falling in this sign
        const cellPlanets = planets.filter(p => p.signIndex === box.signIndex);
        cellPlanets.forEach(p => {
            const code = PLANET_SHORT[p.key] || p.key.slice(0, 2);
            const deg = formatDegMin(p.degreeInSign);
            const retro = p.isRetrograde ? ' (R)' : '';
            const stl = p.starLord?.slice(0, 2) || '';
            const sub = p.subLord?.slice(0, 2) || '';

            ctx.fillStyle = p.isRetrograde ? '#B91C1C' : '#0F172A';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${code}${retro} ${deg}`, x + 8, curY);

            ctx.fillStyle = '#475569';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`[${stl}-${sub}]`, x + cellW - 8, curY);

            curY += 17;
        });
    });
}

/**
 * Draws North Indian Diamond Chart to Canvas
 */
export function drawNorthIndianChartToCanvas(canvas, { planets = [], cusps = [], lagna = null, metadata = {}, birthDetails = {} }) {
    const size = canvas.width;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background - Ivory White
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    const pad = 24;
    const chartW = size - pad * 2;
    const half = chartW / 2;

    // Draw Outer Square
    ctx.strokeStyle = '#2A1810';
    ctx.lineWidth = 3;
    ctx.strokeRect(pad, pad, chartW, chartW);

    // Diagonals (Corner to Corner)
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad + chartW, pad + chartW);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pad + chartW, pad);
    ctx.lineTo(pad, pad + chartW);
    ctx.stroke();

    // Inscribed Diamond
    ctx.beginPath();
    ctx.moveTo(pad + half, pad);
    ctx.lineTo(pad + chartW, pad + half);
    ctx.lineTo(pad + half, pad + chartW);
    ctx.lineTo(pad, pad + half);
    ctx.closePath();
    ctx.stroke();

    // Subtle Gold Trim on Inscribed Diamond
    ctx.strokeStyle = '#C59B27';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad + half, pad + 3);
    ctx.lineTo(pad + chartW - 3, pad + half);
    ctx.lineTo(pad + half, pad + chartW - 3);
    ctx.lineTo(pad + 3, pad + half);
    ctx.closePath();
    ctx.stroke();

    // Lagna sign index (0-11)
    const ascSignIndex = lagna?.signIndex ?? (cusps[0]?.signIndex ?? 0);

    // 12 House Centers (relative percentage)
    const HOUSE_CENTERS = [
        { h: 1, x: 0.50, y: 0.25 },
        { h: 2, x: 0.28, y: 0.14 },
        { h: 3, x: 0.14, y: 0.28 },
        { h: 4, x: 0.25, y: 0.50 },
        { h: 5, x: 0.14, y: 0.72 },
        { h: 6, x: 0.28, y: 0.86 },
        { h: 7, x: 0.50, y: 0.75 },
        { h: 8, x: 0.72, y: 0.86 },
        { h: 9, x: 0.86, y: 0.72 },
        { h: 10, x: 0.75, y: 0.50 },
        { h: 11, x: 0.86, y: 0.28 },
        { h: 12, x: 0.72, y: 0.14 }
    ];

    // Render each house
    HOUSE_CENTERS.forEach(({ h, x: rx, y: ry }) => {
        const cx = pad + rx * chartW;
        const cy = pad + ry * chartW;

        // In North Indian chart, House 1 is always top diamond.
        // Sign number = ((ascSignIndex + h - 1) % 12) + 1
        const signNum = ((ascSignIndex + h - 1) % 12) + 1;
        const signIdx = signNum - 1;

        // Draw Sign Number in small muted font
        ctx.fillStyle = '#C59B27';
        ctx.font = 'bold 15px serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(signNum), cx, cy - 26);

        // House Cusp Data
        const cuspData = cusps[h - 1];
        const roman = ROMAN_NUMERALS[h - 1];
        const cuspDeg = cuspData?.degreeInSign !== undefined ? formatDegMin(cuspData.degreeInSign) : '';

        ctx.fillStyle = '#0284C7';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`${roman}: ${cuspDeg}`, cx, cy - 10);

        // Planets in this house or sign
        // In KP, planets are positioned either by Placidus house or by sign.
        const housePlanets = planets.filter(p => (p.house === h) || (p.signIndex === signIdx));
        // Remove duplicates if any
        const uniquePlanets = Array.from(new Map(housePlanets.map(p => [p.key, p])).values());

        let pY = cy + 6;
        uniquePlanets.forEach(p => {
            const code = PLANET_SHORT[p.key] || p.key.slice(0, 2);
            const deg = formatDegMin(p.degreeInSign);
            const retro = p.isRetrograde ? '(R)' : '';
            const stl = p.starLord?.slice(0, 2) || '';

            ctx.fillStyle = p.isRetrograde ? '#B91C1C' : '#0F172A';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`${code}${retro} ${deg} [${stl}]`, cx, pY);
            pY += 15;
        });
    });
}

/**
 * Generate Chart Data URL (300 DPI equivalent)
 * Works in Browser environment using HTML5 Canvas.
 * Fallback to an SVG Data URL if running in headless/Node environment.
 */
export function generateChartImageDataUrl({
    chartStyle = 'south',
    planets = [],
    cusps = [],
    lagna = null,
    metadata = {},
    birthDetails = {}
}) {
    if (typeof document !== 'undefined' && document.createElement) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1000;
            canvas.height = 1000;

            if (chartStyle === 'north') {
                drawNorthIndianChartToCanvas(canvas, { planets, cusps, lagna, metadata, birthDetails });
            } else {
                drawSouthIndianChartToCanvas(canvas, { planets, cusps, lagna, metadata, birthDetails });
            }

            return canvas.toDataURL('image/png');
        } catch (e) {
            console.warn('Canvas chart rendering failed, generating SVG fallback:', e);
        }
    }

    // Node/Headless fallback: return a clean SVG data URI
    return generateSvgChartDataUrl({ chartStyle, planets, cusps, lagna, metadata, birthDetails });
}

/**
 * Clean SVG fallback for headless/server tests
 */
function generateSvgChartDataUrl({ chartStyle, planets, cusps, lagna, metadata, birthDetails }) {
    const isNorth = chartStyle === 'north';
    const title = isNorth ? 'North Indian KP Chart' : 'South Indian KP Kundli';
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <rect width="800" height="800" fill="#FFFFFF" stroke="#2A1810" stroke-width="4"/>
    <text x="400" y="50" font-family="serif" font-size="28" font-weight="bold" text-anchor="middle" fill="#4A0E17">${title}</text>
    <text x="400" y="85" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#64748B">${birthDetails.name || 'AstroSharma Precision Chart'}</text>
    <rect x="50" y="110" width="700" height="640" fill="#FAF8F5" stroke="#C59B27" stroke-width="2"/>
    <text x="400" y="420" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="#1E293B">AstroSharma High-Precision ${isNorth ? 'North' : 'South'} Indian Chart</text>
    <text x="400" y="455" font-family="monospace" font-size="14" text-anchor="middle" fill="#0369A1">${metadata.ayanamshaFormatted || 'KP Ayanamsha'} | Placidus Houses</text>
</svg>`.trim();

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
