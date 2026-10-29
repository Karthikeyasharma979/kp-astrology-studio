/**
 * AstroSharma Professional Astrological PDF Report Generator
 *
 * Implements high-precision, publication-grade multi-page PDF generation
 * using jsPDF and jspdf-autotable with pure vector charts and structured templates.
 *
 * Supported Report Types:
 * 1. MISSING_PERSON: Missing Person Astrological Analysis Report
 * 2. KP_KUNDLI: KP Kundli Comprehensive Analysis Report
 * 3. VEDIC_KUNDLI: Vedic Kundli Report
 * 4. EVENT_ANALYSIS: Event Analysis & House Grouping Report
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDMS } from '../utils/nakshatraUtils.js';
import {
    calculateCommonPlanetRanking,
    evaluateJointDBA,
    evaluateCuspSubLordChecks
} from '../utils/kp/kpHouseGroupingEngine.js';
import { calculatePlanetaryAspects, ASPECT_CONVENTIONS } from '../utils/kp/kpAspects.js';
import { calculateKPSignificators } from '../utils/kp/kpSignificators.js';

export const REPORT_TYPES = {
    MISSING_PERSON: 'missing_person',
    KP_KUNDLI: 'kp_kundli',
    VEDIC_KUNDLI: 'vedic_kundli',
    EVENT_ANALYSIS: 'event_analysis'
};

// Colors (RGB tuples for jsPDF)
const COLORS = {
    NAVY: [27, 42, 74],          // #1B2A4A Primary Dark
    MAROON: [74, 14, 23],        // #4A0E17 Primary Accent
    GOLD: [197, 155, 39],        // #C59B27 Gold Accent
    CHARCOAL: [30, 41, 59],      // #1E293B Body Headings
    SLATE: [71, 85, 105],        // #475569 Muted Text
    LIGHT_GRAY: [241, 245, 249], // #F1F5F9 Background
    CREAM: [253, 251, 247],      // #FDFBF7 Alternate Row Fill
    BORDER: [226, 232, 240],     // #E2E8F0 Table Borders
    WHITE: [255, 255, 255],
    TEAL: [3, 105, 161],         // #0369A1 House Cusps
    CRIMSON: [185, 28, 28],      // #B91C1C Retrogression / Obstruction
    EMERALD: [16, 185, 129]      // #10B981 Favorable / Verified
};

const ZODIAC_SIGNS = [
    { name: 'Aries', short: 'Ar', index: 0 },
    { name: 'Taurus', short: 'Ta', index: 1 },
    { name: 'Gemini', short: 'Ge', index: 2 },
    { name: 'Cancer', short: 'Cn', index: 3 },
    { name: 'Leo', short: 'Le', index: 4 },
    { name: 'Virgo', short: 'Vi', index: 5 },
    { name: 'Libra', short: 'Li', index: 6 },
    { name: 'Scorpio', short: 'Sc', index: 7 },
    { name: 'Sagittarius', short: 'Sg', index: 8 },
    { name: 'Capricorn', short: 'Cp', index: 9 },
    { name: 'Aquarius', short: 'Aq', index: 10 },
    { name: 'Pisces', short: 'Pi', index: 11 }
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
    Ketu: 'Ke'
};

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function sanitizeFileName(name) {
    return (name || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 50);
}

function formatDegMin(deg) {
    if (deg === undefined || deg === null || isNaN(deg)) return '—';
    const abs = Math.abs(Number(deg));
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = Math.round(((abs - d) * 60 - m) * 60);
    return `${d}° ${String(m).padStart(2, '0')}' ${String(s).padStart(2, '0')}"`;
}

function formatCompactDeg(deg) {
    if (deg === undefined || deg === null || isNaN(deg)) return '';
    const abs = Math.abs(Number(deg));
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    return `${d}°${String(m).padStart(2, '0')}'`;
}

/**
 * Creates and initializes a new A4 jsPDF document
 */
function createBaseDocument() {
    return new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });
}

/**
 * Adds running headers and footers to all pages in document (Two-Pass)
 */
function addRunningHeadersAndFooters(doc, { reportTitle, caseRef, isCoverIncluded = true }) {
    const totalPages = doc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Skip running header on Cover Page if present
        if (i > 1 || !isCoverIncluded) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...COLORS.SLATE);
            doc.text('AstroSharma Astronomical Precision Studio', 14, 11);

            const rightTitle = caseRef ? `Ref: ${caseRef}` : reportTitle;
            doc.text(rightTitle, 196, 11, { align: 'right' });

            // Thin Gold Header Line
            doc.setDrawColor(...COLORS.GOLD);
            doc.setLineWidth(0.3);
            doc.line(14, 13, 196, 13);
        }

        // Running Footer (on all pages)
        doc.setDrawColor(...COLORS.BORDER);
        doc.setLineWidth(0.3);
        doc.line(14, 283, 196, 283);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.SLATE);
        doc.text('Confidential Astrological Analysis • Krishnamurti Paddhati (KP) System', 14, 288);
        doc.text(`Page ${i} of ${totalPages}`, 196, 288, { align: 'right' });
    }
}

/**
 * Draws Section Heading Banner
 */
function drawSectionHeading(doc, y, title, subtitle = null) {
    if (y > 250) {
        doc.addPage();
        y = 20;
    }

    doc.setFillColor(...COLORS.NAVY);
    doc.rect(14, y, 182, 7.5, 'F');

    // Left accent gold stripe
    doc.setFillColor(...COLORS.GOLD);
    doc.rect(14, y, 3.5, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.WHITE);
    doc.text(title.toUpperCase(), 21, y + 5.2);

    if (subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.GOLD);
        doc.text(subtitle, 193, y + 5.2, { align: 'right' });
    }

    return y + 11;
}

/**
 * Draws a Styled Alert / Disclaimer Box
 */
function drawNoticeBox(doc, y, { title, text, type = 'warning' }) {
    if (y > 240) {
        doc.addPage();
        y = 20;
    }

    const isWarning = type === 'warning';
    const borderCol = isWarning ? COLORS.GOLD : COLORS.TEAL;
    const fillCol = isWarning ? [254, 252, 243] : [240, 249, 255];
    const textCol = isWarning ? [120, 53, 15] : [12, 74, 110];

    doc.setFillColor(...fillCol);
    doc.setDrawColor(...borderCol);
    doc.setLineWidth(0.5);

    const splitText = doc.splitTextToSize(text, 172);
    const boxH = 12 + splitText.length * 4.2;

    doc.roundedRect(14, y, 182, boxH, 2, 2, 'FD');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...textCol);
    doc.text(title, 18, y + 6);

    // Text body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(splitText, 18, y + 11);

    return y + boxH + 5;
}

/**
 * Draw Cover Page
 */
function drawCoverPage(doc, { reportTitle, subTitle, caseRef, subjectName, dateStr, locationStr, ayanamshaStr, extraMetadata = [] }) {
    // Elegant Outer Border
    doc.setDrawColor(...COLORS.NAVY);
    doc.setLineWidth(1.2);
    doc.rect(10, 10, 190, 277);

    // Inner Gold Filigree Line
    doc.setDrawColor(...COLORS.GOLD);
    doc.setLineWidth(0.5);
    doc.rect(13, 13, 184, 271);

    // Top Brand Crest
    let y = 35;
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(...COLORS.MAROON);
    doc.text('ASTROSHARMA', 105, y, { align: 'center' });

    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.GOLD);
    doc.text('HIGH-PRECISION KRISHNAMURTI PADDHATI (KP) ASTRONOMICAL STUDIO', 105, y, { align: 'center' });

    // Decorative Gold Line with diamond
    y += 10;
    doc.setDrawColor(...COLORS.GOLD);
    doc.setLineWidth(0.6);
    doc.line(45, y, 98, y);
    doc.line(112, y, 165, y);
    doc.setFillColor(...COLORS.GOLD);
    doc.circle(105, y, 1.8, 'F');

    // Main Report Title
    y += 28;
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...COLORS.NAVY);
    doc.text(reportTitle.toUpperCase(), 105, y, { align: 'center' });

    if (subTitle) {
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.SLATE);
        doc.text(subTitle, 105, y, { align: 'center' });
    }

    // Center Details Dossier Card
    y += 25;
    doc.setFillColor(...COLORS.CREAM);
    doc.setDrawColor(...COLORS.GOLD);
    doc.setLineWidth(0.4);
    doc.roundedRect(30, y, 150, 85, 3, 3, 'FD');

    let dy = y + 14;
    const leftX = 38;
    const valX = 90;

    const printField = (label, val, isBold = false) => {
        if (!val) return;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(...COLORS.CHARCOAL);
        doc.text(label, leftX, dy);

        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(isBold ? COLORS.MAROON[0] : 30, isBold ? COLORS.MAROON[1] : 41, isBold ? COLORS.MAROON[2] : 59);
        doc.text(String(val), valX, dy);
        dy += 9.5;
    };

    printField('Case Reference / ID:', caseRef, true);
    printField('Subject / Seeker:', subjectName, true);
    printField('Event / Incident Date:', dateStr);
    printField('Location & Coordinates:', locationStr);
    printField('Calculation Engine:', 'High-Precision Astronomical Engine / VSOP87');
    printField('Chart System & Cusps:', 'Placidus Semi-Arc Trisection');
    printField('Ayanamsha System:', ayanamshaStr || 'KP New (Mode 5)');
    printField('Report Generated:', new Date().toLocaleString());

    extraMetadata.forEach(m => {
        printField(m.label, m.value, m.isBold);
    });

    // Bottom Decorative Footer Note
    y = 230;
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.SLATE);
    doc.text('"Planets are the clock hands of destiny; the Sub-Lord reveals the precise timing of fruition."', 105, y, { align: 'center' });

    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.NAVY);
    doc.text('OFFICIAL ASTROLOGICAL DOSSIER', 105, y, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.SLATE);
    doc.text('Krishnamurti Paddhati Verified Mathematical Calculations', 105, y + 5, { align: 'center' });

    doc.addPage();
}

/**
 * Pure Vector South Indian Chart Drawing in jsPDF
 * Renders directly as crisp scalable vectors with selectable/searchable text!
 */
export function drawVectorSouthIndianChart(doc, startX, startY, size, { planets = [], cusps = [], lagna = null, metadata = {}, birthDetails = {} }) {
    const cellW = size / 4;
    const cellH = size / 4;

    // Background
    doc.setFillColor(...COLORS.WHITE);
    doc.rect(startX, startY, size, size, 'F');

    // Outer Border
    doc.setDrawColor(...COLORS.NAVY);
    doc.setLineWidth(0.8);
    doc.rect(startX, startY, size, size);

    // Inner Grid lines
    doc.setLineWidth(0.3);
    for (let i = 1; i < 4; i++) {
        // Vertical lines
        doc.line(startX + i * cellW, startY, startX + i * cellW, startY + size);
        // Horizontal lines
        doc.line(startX, startY + i * cellH, startX + size, startY + i * cellH);
    }

    // Center 2x2 Box Background & Gold Border
    doc.setFillColor(...COLORS.CREAM);
    doc.rect(startX + cellW, startY + cellH, cellW * 2, cellH * 2, 'F');
    doc.setDrawColor(...COLORS.GOLD);
    doc.setLineWidth(0.5);
    doc.rect(startX + cellW + 0.8, startY + cellH + 0.8, cellW * 2 - 1.6, cellH * 2 - 1.6);

    // Center Box Text (Title, Subject, Lagna, Moon, Ayanamsha)
    const centerX = startX + size / 2;
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.MAROON);
    doc.text('AstroSharma KP Kundli', centerX, startY + cellH + 7, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.CHARCOAL);
    doc.text(birthDetails.name || 'Horary / Birth Chart', centerX, startY + cellH + 13, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.SLATE);

    const lagnaSignName = lagna?.sign?.en || (lagna?.signIndex !== undefined ? ZODIAC_SIGNS[lagna.signIndex]?.name : 'Lagna');
    const lagnaDegStr = lagna?.degreeInSign !== undefined ? formatCompactDeg(lagna.degreeInSign) : '';
    doc.text(`Ascendant: ${lagnaSignName} ${lagnaDegStr}`, centerX, startY + cellH + 20, { align: 'center' });

    const moon = planets.find(p => p.key === 'Moon');
    const moonSignName = moon?.sign?.en || (moon?.signIndex !== undefined ? ZODIAC_SIGNS[moon.signIndex]?.name : '');
    const moonDegStr = moon?.degreeInSign !== undefined ? formatCompactDeg(moon.degreeInSign) : '';
    const nakStr = moon?.nakshatra?.name || '';
    if (moonSignName) {
        doc.text(`Moon: ${moonSignName} ${moonDegStr} (${nakStr})`, centerX, startY + cellH + 25, { align: 'center' });
    }

    const ayanamshaStr = metadata.ayanamshaFormatted || 'KP New Ayanamsha';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.TEAL);
    doc.text(`Ayanamsha: ${ayanamshaStr} [Placidus]`, centerX, startY + cellH + 31, { align: 'center' });

    // 12 Outer Zodiac Cells
    const SOUTH_INDIAN_CELLS = [
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

    SOUTH_INDIAN_CELLS.forEach(cell => {
        const x = startX + cell.col * cellW;
        const y = startY + cell.row * cellH;

        // Sign Name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(...COLORS.SLATE);
        doc.text(cell.label.toUpperCase(), x + 2, y + 4.5);

        let curY = y + 8.5;

        // Cusps falling in this sign
        const cellCusps = cusps.filter(c => c.signIndex === cell.signIndex);
        cellCusps.forEach(c => {
            const roman = ROMAN_NUMERALS[c.houseNumber - 1] || `H${c.houseNumber}`;
            const deg = formatCompactDeg(c.degreeInSign);
            const stl = c.starLord?.slice(0, 2) || '';
            const sub = c.subLord?.slice(0, 2) || '';

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(...COLORS.TEAL);
            doc.text(`${roman} ${deg}`, x + 2, curY);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5);
            doc.setTextColor(...COLORS.SLATE);
            doc.text(`[${stl}-${sub}]`, x + cellW - 2, curY, { align: 'right' });

            curY += 3.6;
        });

        // Planets falling in this sign
        const cellPlanets = planets.filter(p => p.signIndex === cell.signIndex);
        cellPlanets.forEach(p => {
            const code = PLANET_SHORT[p.key] || p.key.slice(0, 2);
            const deg = formatCompactDeg(p.degreeInSign);
            const retro = p.isRetrograde ? '(R)' : '';
            const stl = p.starLord?.slice(0, 2) || '';
            const sub = p.subLord?.slice(0, 2) || '';

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(p.isRetrograde ? COLORS.CRIMSON[0] : COLORS.CHARCOAL[0], p.isRetrograde ? COLORS.CRIMSON[1] : COLORS.CHARCOAL[1], p.isRetrograde ? COLORS.CRIMSON[2] : COLORS.CHARCOAL[2]);
            doc.text(`${code}${retro} ${deg}`, x + 2, curY);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5);
            doc.setTextColor(...COLORS.SLATE);
            doc.text(`[${stl}-${sub}]`, x + cellW - 2, curY, { align: 'right' });

            curY += 3.6;
        });
    });
}

/**
 * Pure Vector North Indian Diamond Chart Drawing in jsPDF
 * Renders directly as crisp scalable vectors with selectable/searchable text!
 */
export function drawVectorNorthIndianChart(doc, startX, startY, size, { planets = [], cusps = [], lagna = null, metadata = {}, birthDetails = {} }) {
    const half = size / 2;

    // Background
    doc.setFillColor(...COLORS.WHITE);
    doc.rect(startX, startY, size, size, 'F');

    // Outer Square
    doc.setDrawColor(...COLORS.NAVY);
    doc.setLineWidth(0.8);
    doc.rect(startX, startY, size, size);

    // Diagonals (Corner to Corner)
    doc.setLineWidth(0.4);
    doc.line(startX, startY, startX + size, startY + size);
    doc.line(startX + size, startY, startX, startY + size);

    // Inscribed Diamond
    doc.setLineWidth(0.6);
    doc.setDrawColor(...COLORS.NAVY);
    doc.line(startX + half, startY, startX + size, startY + half);
    doc.line(startX + size, startY + half, startX + half, startY + size);
    doc.line(startX + half, startY + size, startX, startY + half);
    doc.line(startX, startY + half, startX + half, startY);

    // Subtle Gold Trim on Diamond
    doc.setDrawColor(...COLORS.GOLD);
    doc.setLineWidth(0.3);
    doc.line(startX + half, startY + 0.8, startX + size - 0.8, startY + half);
    doc.line(startX + size - 0.8, startY + half, startX + half, startY + size - 0.8);
    doc.line(startX + half, startY + size - 0.8, startX + 0.8, startY + half);
    doc.line(startX + 0.8, startY + half, startX + half, startY + 0.8);

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

    HOUSE_CENTERS.forEach(({ h, x: rx, y: ry }) => {
        const cx = startX + rx * size;
        const cy = startY + ry * size;

        const signNum = ((ascSignIndex + h - 1) % 12) + 1;
        const signIdx = signNum - 1;

        // Sign Number in small gold font
        doc.setFont('times', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.GOLD);
        doc.text(String(signNum), cx, cy - 5, { align: 'center' });

        // House Cusp Data
        const cuspData = cusps[h - 1];
        const roman = ROMAN_NUMERALS[h - 1];
        const cuspDeg = cuspData?.degreeInSign !== undefined ? formatCompactDeg(cuspData.degreeInSign) : '';

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(...COLORS.TEAL);
        doc.text(`${roman}: ${cuspDeg}`, cx, cy - 1, { align: 'center' });

        // Planets in this house
        const housePlanets = planets.filter(p => (p.house === h) || (p.signIndex === signIdx));
        const uniquePlanets = Array.from(new Map(housePlanets.map(p => [p.key, p])).values());

        let pY = cy + 3.2;
        uniquePlanets.forEach(p => {
            const code = PLANET_SHORT[p.key] || p.key.slice(0, 2);
            const deg = formatCompactDeg(p.degreeInSign);
            const retro = p.isRetrograde ? '(R)' : '';
            const stl = p.starLord?.slice(0, 2) || '';

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.setTextColor(p.isRetrograde ? COLORS.CRIMSON[0] : COLORS.CHARCOAL[0], p.isRetrograde ? COLORS.CRIMSON[1] : COLORS.CHARCOAL[1], p.isRetrograde ? COLORS.CRIMSON[2] : COLORS.CHARCOAL[2]);
            doc.text(`${code}${retro} ${deg} [${stl}]`, cx, pY, { align: 'center' });
            pY += 3.2;
        });
    });
}

/**
 * Embeds High-Resolution Astrological Chart Section into jsPDF
 */
function embedChartSection(doc, y, { chartStyle, planets, cusps, lagna, metadata, birthDetails }) {
    y = drawSectionHeading(doc, y, `Horoscope Chart (${chartStyle === 'north' ? 'North Indian Diamond' : 'South Indian Fixed'} Style)`, 'High-Precision Astrological Geometry');

    const chartSize = 108; // 108mm x 108mm
    const chartX = (210 - chartSize) / 2;

    if (chartStyle === 'north') {
        drawVectorNorthIndianChart(doc, chartX, y, chartSize, { planets, cusps, lagna, metadata, birthDetails });
    } else {
        drawVectorSouthIndianChart(doc, chartX, y, chartSize, { planets, cusps, lagna, metadata, birthDetails });
    }

    return y + chartSize + 6;
}

/**
 * Builds Planetary Positions Table
 */
function buildPlanetsTable(doc, y, planets) {
    y = drawSectionHeading(doc, y, 'Planetary Coordinates & Sub-Lord Hierarchy', 'Apparent Geocentric Ecliptic Longitudes');

    const headers = [
        ['Planet', 'Motion', 'Sign', 'Longitude', 'House', 'Nakshatra', 'Star Lord', 'Sub-Lord', 'Sub-Sub']
    ];

    const rows = planets.map(p => {
        const motion = p.isRetrograde ? 'Retrograde (R)' : 'Direct';
        const signName = p.sign?.en || ZODIAC_SIGNS[p.signIndex]?.name || '—';
        const degStr = formatDegMin(p.degreeInSign);
        const nakStr = p.nakshatra?.name || '—';
        const pada = p.nakshatra?.pada ? `P${p.nakshatra.pada}` : '';

        return [
            p.name || p.key,
            motion,
            signName,
            degStr,
            String(p.house || '—'),
            `${nakStr} ${pada}`.trim(),
            p.starLord || '—',
            p.subLord || '—',
            p.subSubLord || '—'
        ];
    });

    autoTable(doc, {
        startY: y,
        head: headers,
        body: rows,
        theme: 'striped',
        margin: { left: 14, right: 14 },
        styles: {
            fontSize: 7.5,
            cellPadding: 1.8,
            font: 'helvetica',
            textColor: COLORS.CHARCOAL,
            lineColor: COLORS.BORDER,
            lineWidth: 0.2
        },
        headStyles: {
            fillColor: COLORS.NAVY,
            textColor: COLORS.WHITE,
            fontStyle: 'bold',
            fontSize: 8
        },
        alternateRowStyles: {
            fillColor: COLORS.CREAM
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 20 },
            1: { cellWidth: 22 },
            2: { cellWidth: 20 },
            3: { fontStyle: 'bold', cellWidth: 22 },
            4: { halign: 'center', cellWidth: 14 },
            5: { cellWidth: 26 },
            6: { fontStyle: 'bold', textColor: COLORS.TEAL, cellWidth: 19 },
            7: { fontStyle: 'bold', textColor: COLORS.MAROON, cellWidth: 19 },
            8: { cellWidth: 20 }
        },
        showHead: 'everyPage'
    });

    return doc.lastAutoTable.finalY + 8;
}

/**
 * Builds 12 Placidus House Cusps Table
 */
function buildCuspsTable(doc, y, cusps) {
    if (y > 200) {
        doc.addPage();
        y = 20;
    }

    y = drawSectionHeading(doc, y, '12 Placidus House Cusps (Bhava Sandhis)', 'Exact Astronomical Intercepts');

    const headers = [
        ['Cusp', 'Sign', 'Degree & DMS', 'Sign Lord', 'Star Lord', 'Sub-Lord', 'Sub-Sub Lord']
    ];

    const rows = cusps.map(c => {
        const roman = ROMAN_NUMERALS[c.houseNumber - 1] || `H${c.houseNumber}`;
        const signName = c.sign?.en || '—';
        const degStr = formatDegMin(c.degreeInSign);

        return [
            `${roman} ${c.houseNumber === 1 ? '(Lagna / Asc)' : ''}`.trim(),
            signName,
            degStr,
            c.signLord || '—',
            c.starLord || '—',
            c.subLord || '—',
            c.subSubLord || '—'
        ];
    });

    autoTable(doc, {
        startY: y,
        head: headers,
        body: rows,
        theme: 'striped',
        margin: { left: 14, right: 14 },
        styles: {
            fontSize: 7.8,
            cellPadding: 1.8,
            font: 'helvetica',
            textColor: COLORS.CHARCOAL,
            lineColor: COLORS.BORDER,
            lineWidth: 0.2
        },
        headStyles: {
            fillColor: COLORS.NAVY,
            textColor: COLORS.WHITE,
            fontStyle: 'bold',
            fontSize: 8.2
        },
        alternateRowStyles: {
            fillColor: COLORS.CREAM
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 32 },
            1: { cellWidth: 26 },
            2: { fontStyle: 'bold', cellWidth: 30 },
            3: { cellWidth: 23 },
            4: { fontStyle: 'bold', textColor: COLORS.TEAL, cellWidth: 23 },
            5: { fontStyle: 'bold', textColor: COLORS.MAROON, cellWidth: 23 },
            6: { cellWidth: 25 }
        },
        showHead: 'everyPage'
    });

    return doc.lastAutoTable.finalY + 8;
}

/**
 * Builds 4-Level Classical KP House Significators Table
 */
function buildSignificatorsTable(doc, y, significators) {
    if (y > 210) {
        doc.addPage();
        y = 20;
    }

    y = drawSectionHeading(doc, y, 'Classical KP 4-Level House Significators Matrix', 'Hierarchical Fruitful Significators');

    const headers = [
        ['House', 'Level 1 (In Star of Occ)', 'Level 2 (Occ in House)', 'Level 3 (In Star of Owner)', 'Level 4 (Owner of House)']
    ];

    const houseList = significators?.houseSignificators || [];
    const rows = [];

    for (let h = 1; h <= 12; h++) {
        const found = houseList.find(item => item.house === h) || {};
        const roman = ROMAN_NUMERALS[h - 1];
        const formatLords = (arr) => (arr && arr.length > 0 ? arr.join(', ') : '—');

        rows.push([
            `House ${roman}`,
            formatLords(found.level1),
            formatLords(found.level2),
            formatLords(found.level3),
            formatLords(found.level4)
        ]);
    }

    autoTable(doc, {
        startY: y,
        head: headers,
        body: rows,
        theme: 'striped',
        margin: { left: 14, right: 14 },
        styles: {
            fontSize: 7.8,
            cellPadding: 2,
            font: 'helvetica',
            textColor: COLORS.CHARCOAL,
            lineColor: COLORS.BORDER,
            lineWidth: 0.2
        },
        headStyles: {
            fillColor: COLORS.NAVY,
            textColor: COLORS.WHITE,
            fontStyle: 'bold',
            fontSize: 8
        },
        alternateRowStyles: {
            fillColor: COLORS.CREAM
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 26 },
            1: { fontStyle: 'bold', textColor: COLORS.MAROON, cellWidth: 39 },
            2: { cellWidth: 39 },
            3: { cellWidth: 39 },
            4: { cellWidth: 39 }
        },
        showHead: 'everyPage'
    });

    return doc.lastAutoTable.finalY + 8;
}

/**
 * Builds Active Vimshottari Dasha Hierarchy Table
 */
function buildDashaTable(doc, y, dasha) {
    if (y > 200) {
        doc.addPage();
        y = 20;
    }

    y = drawSectionHeading(doc, y, 'Vimshottari Dasha Timeline & Running Period', 'Sub-Period Mathematical Breakdown');

    const activeLevels = dasha?.activePeriods?.levels || dasha?.runningHierarchy;
    if (activeLevels && activeLevels.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.NAVY);
        doc.text('Active Running Dasha Hierarchy at Query / Event Moment:', 14, y);
        y += 4.5;

        const dHeaders = [['Level', 'Lord', 'Start Date', 'End Date', 'Signified Houses']];
        const dRows = activeLevels.map(item => [
            item.periodName || item.levelName || item.abbr || `Level ${item.level || ''}`,
            item.lord || item.planet || '—',
            item.startDate ? item.startDate.slice(0, 10) : '—',
            item.endDate ? item.endDate.slice(0, 10) : '—',
            item.signifiedHouses ? item.signifiedHouses.join(', ') : '—'
        ]);

        autoTable(doc, {
            startY: y,
            head: dHeaders,
            body: dRows,
            theme: 'striped',
            margin: { left: 14, right: 14 },
            styles: { fontSize: 7.5, cellPadding: 1.8 },
            headStyles: { fillColor: COLORS.MAROON, textColor: COLORS.WHITE },
            showHead: 'everyPage'
        });

        y = doc.lastAutoTable.finalY + 6;
    }

    return y;
}

/**
 * Builds Planetary Aspects Table
 */
function buildAspectsTable(doc, y, aspects) {
    if (!aspects || !aspects.planetAspects || aspects.planetAspects.length === 0) return y;

    if (y > 200) {
        doc.addPage();
        y = 20;
    }

    y = drawSectionHeading(doc, y, 'Planetary Aspects & Longitudinal Orbs', 'Western / KP Geometric Angles');

    const headers = [
        ['Planet 1', 'Aspect', 'Planet 2', 'Angle', 'Orb', 'Nature / Motion']
    ];

    const rows = aspects.planetAspects.slice(0, 18).map(a => [
        a.planet1,
        a.aspectName,
        a.planet2,
        `${a.angle?.toFixed(1)}°`,
        `${a.orb?.toFixed(2)}°`,
        `${a.nature || ''} (${a.motion || 'Exact'})`.trim()
    ]);

    autoTable(doc, {
        startY: y,
        head: headers,
        body: rows,
        theme: 'striped',
        margin: { left: 14, right: 14 },
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        headStyles: { fillColor: COLORS.NAVY, textColor: COLORS.WHITE },
        alternateRowStyles: { fillColor: COLORS.CREAM },
        showHead: 'everyPage'
    });

    return doc.lastAutoTable.finalY + 8;
}

/**
 * Builds Ruling Planets Section
 */
function buildRulingPlanetsTable(doc, y, { lagna, planets, cusps, metadata, birthDetails }) {
    if (y > 220) {
        doc.addPage();
        y = 20;
    }

    y = drawSectionHeading(doc, y, 'Ruling Planets (RP) at Judgment Moment', 'Dynamic Horary Chronometer');

    const moon = planets.find(p => p.key === 'Moon');
    const lagnaCusp = cusps[0] || lagna;

    const headers = [['Ruling Planet Role', 'Planet Lord', 'Astronomical Coordinate / Position']];
    const rows = [
        ['1. Ascendant Sub Lord', lagnaCusp?.subLord || '—', `Lagna Cusp at ${formatDegMin(lagnaCusp?.degreeInSign)}`],
        ['2. Ascendant Star Lord', lagnaCusp?.starLord || '—', `Lagna Nakshatra Lord`],
        ['3. Ascendant Sign Lord', lagnaCusp?.signLord || '—', `Lagna Sign: ${lagnaCusp?.sign?.en || '—'}`],
        ['4. Moon Star Lord', moon?.starLord || '—', `Moon Nakshatra: ${moon?.nakshatra?.name || '—'}`],
        ['5. Moon Sign Lord', moon?.signLord || moon?.sign?.lord || '—', `Moon Sign: ${moon?.sign?.en || '—'}`]
    ];

    autoTable(doc, {
        startY: y,
        head: headers,
        body: rows,
        theme: 'striped',
        margin: { left: 14, right: 14 },
        styles: { fontSize: 7.8, cellPadding: 2 },
        headStyles: { fillColor: COLORS.NAVY, textColor: COLORS.WHITE },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { fontStyle: 'bold', textColor: COLORS.MAROON, cellWidth: 40 },
            2: { cellWidth: 92 }
        },
        showHead: 'everyPage'
    });

    return doc.lastAutoTable.finalY + 8;
}

// ============================================================================
// TEMPLATE A: MISSING PERSON & EVENT ANALYSIS REPORT
// ============================================================================
export async function generateMissingPersonReport({
    kpData,
    birthDetails = {},
    missingPersonCase = {},
    selectedEvents = [],
    chartStyle = 'south',
    includeSections = {}
}) {
    const doc = createBaseDocument();

    const caseRef = missingPersonCase.caseReference || 'CASE-MP-' + new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const subjectName = missingPersonCase.maskName ? 'PROTECTED SUBJECT [CONFIDENTIAL]' : (missingPersonCase.subjectName || birthDetails.name || 'Subject');
    const dateStr = missingPersonCase.missingSinceDate ? `${missingPersonCase.missingSinceDate} ${missingPersonCase.missingSinceTime || ''}` : `${birthDetails.birthDate || ''} ${birthDetails.birthTime || ''}`;
    const locationStr = missingPersonCase.lastKnownLocation || birthDetails.birthPlace || 'Location Specified in Case File';
    const ayanamshaStr = kpData?.metadata?.ayanamshaFormatted ? `${kpData.metadata.ayanamshaFormatted} (${kpData.metadata.ayanamshaMode || 'KP New'})` : 'KP New Ayanamsha';

    // 1. Cover Page
    drawCoverPage(doc, {
        reportTitle: 'Missing Person Astrological Analysis',
        subTitle: 'Forensic Horary & Birth Chart Significator Investigation',
        caseRef,
        subjectName,
        dateStr,
        locationStr,
        ayanamshaStr,
        extraMetadata: [
            { label: 'Investigation Status:', value: missingPersonCase.status || 'Active In-Progress Analysis', isBold: true },
            { label: 'Reporting Contact:', value: missingPersonCase.reportingParty || 'Authorized Inquirer' }
        ]
    });

    let y = 20;

    // 2. Case Details Table & Legal Disclaimer
    y = drawSectionHeading(doc, y, 'Case Dossier & Incident Profile', 'Recorded Chronological Coordinates');

    const caseHeaders = [['Field', 'Case Particulars', 'Field', 'Astrological Audit']];
    const caseRows = [
        ['Case Reference:', caseRef, 'Calculation Engine:', 'High-Precision Astro Engine'],
        ['Subject Name:', subjectName, 'Horary Coordinate:', `${birthDetails.lat ? Number(birthDetails.lat).toFixed(4) : '—'}, ${birthDetails.lon ? Number(birthDetails.lon).toFixed(4) : '—'}`],
        ['Age & Gender:', `${missingPersonCase.age || '—'} / ${birthDetails.gender || '—'}`, 'Timezone (IANA):', birthDetails.timezone || 'Asia/Kolkata'],
        ['Missing Since:', dateStr, 'Ayanamsha:', ayanamshaStr],
        ['Last Known Location:', locationStr, 'House System:', 'Placidus Arc Trisection']
    ];

    autoTable(doc, {
        startY: y,
        head: caseHeaders,
        body: caseRows,
        theme: 'plain',
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8, cellPadding: 2, lineColor: COLORS.BORDER, lineWidth: 0.2 },
        headStyles: { fillColor: COLORS.NAVY, textColor: COLORS.WHITE, fontStyle: 'bold' },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 38, fillColor: COLORS.LIGHT_GRAY },
            1: { cellWidth: 53 },
            2: { fontStyle: 'bold', cellWidth: 38, fillColor: COLORS.LIGHT_GRAY },
            3: { cellWidth: 53 }
        }
    });

    y = doc.lastAutoTable.finalY + 6;

    // Prominent Legal & Safety Notice
    y = drawNoticeBox(doc, y, {
        title: 'IMPORTANT FORENSIC & LEGAL DISCLAIMER',
        text: 'Astrological analysis operates through symbolic significator indicators based on Krishnamurti Paddhati principles. Astrology cannot establish an individual\'s physical geographic coordinates with certainty, certify personal safety, or replace official law enforcement, search-and-rescue teams, or emergency services. This report is prepared solely as an auxiliary investigative astrological reference.',
        type: 'warning'
    });

    // 3. Selected Event Analysis Items (Core Module)
    if (selectedEvents && selectedEvents.length > 0) {
        y = drawSectionHeading(doc, y, 'Evaluated Event Analysis Rules & KP Groupings', `${selectedEvents.length} Selected Event Criteria`);

        const ascSignNum = kpData?.lagna?.signIndex !== undefined ? kpData.lagna.signIndex + 1 : 1;
        const runningDBALords = kpData?.dasha?.activePeriods?.levels?.map(lvl => ({
            level: lvl.abbr || (lvl.level === 1 ? 'MD' : lvl.level === 2 ? 'AD' : lvl.level === 3 ? 'PD' : lvl.level === 4 ? 'SD' : 'PRANA'),
            levelNum: lvl.level,
            planet: lvl.lord,
            lord: lvl.lord,
            startDate: lvl.startDate,
            endDate: lvl.endDate,
            remainingDuration: lvl.remainingDuration
        })) || [];

        for (let idx = 0; idx < selectedEvents.length; idx++) {
            const rule = selectedEvents[idx];
            if (y > 230) {
                doc.addPage();
                y = 20;
            }

            // Rule Header Box
            doc.setFillColor(...COLORS.CREAM);
            doc.setDrawColor(...COLORS.GOLD);
            doc.setLineWidth(0.4);
            doc.roundedRect(14, y, 182, 14, 1.5, 1.5, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(...COLORS.MAROON);
            doc.text(`${idx + 1}. Event: ${rule.event}`, 18, y + 6);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...COLORS.SLATE);
            const sourceRef = rule.source ? `[Ref: Page ${rule.source.page}, Table ${rule.source.tableIndex}, Sr ${rule.srNo}]` : '';
            doc.text(`Cusp ${rule.cusp} • Subject: ${rule.subject} ${sourceRef}`, 18, y + 11);

            y += 18;

            const housesToBeSignified = rule.housesToBeSignified || [];
            const jointHouses = rule.jointDBA?.houses || housesToBeSignified;
            const negativeHouses = rule.negativeHouses || [];

            // 1. Common Planet Ranking
            let rankingResult = null;
            try {
                rankingResult = calculateCommonPlanetRanking(kpData?.significators, rule, {
                    minMatches: 2,
                    ascSign: ascSignNum,
                    runningDashaPlanets: runningDBALords,
                    planetsData: kpData?.planets || [],
                    cuspsData: kpData?.cusps || [],
                    aspectsData: kpData?.aspects
                });
            } catch (err) {
                console.warn('Ranking calculation warning:', err);
            }

            // 2. Joint DBA
            let dbaResult = null;
            try {
                dbaResult = evaluateJointDBA(kpData?.significators, rule, runningDBALords, {
                    ascSign: ascSignNum
                });
            } catch (err) {
                console.warn('Joint DBA evaluation warning:', err);
            }

            // 3. Cusp Sub Lord Checks
            let cslResult = null;
            try {
                cslResult = evaluateCuspSubLordChecks(kpData?.cusps, kpData?.significators, rule, { ascSign: ascSignNum });
            } catch (err) {
                console.warn('CSL check warning:', err);
            }

            // Summary Table for this event
            const evHeaders = [['Analysis Parameter', 'Rule Specification', 'Computed Astrological Outcome', 'Verification']];
            const evRows = [
                ['Required Houses:', housesToBeSignified.join(', ') || '—', `Joint DBA Houses: ${jointHouses.join(', ') || '—'}`, 'Rule Specified'],
                [
                    'Negative / Obstruction:',
                    negativeHouses.length > 0 ? negativeHouses.join(', ') : 'None specified',
                    dbaResult?.afflictionReason || 'No detrimental obstruction detected',
                    dbaResult?.status === 'afflicted' ? 'Obstructed' : 'Clear'
                ],
                [
                    'Joint DBA Triad Coverage:',
                    `MD - AD - PD Lords: ${dbaResult?.triadDetails?.map(t => t.lord).join(', ') || '—'}`,
                    `Coverage: ${dbaResult?.coveragePercent !== undefined ? `${dbaResult.coveragePercent}%` : '—'} (Missing: ${dbaResult?.missingHouses?.join(', ') || 'None'})`,
                    dbaResult?.coveragePercent >= 100 ? 'Fully Satisfied' : 'Partially Satisfied'
                ],
                [
                    'Cusp Sub Lord (CSL) Check:',
                    `Primary Cusp ${rule.cusp} Sub-Lord`,
                    cslResult?.verdict || `CSL Lord: ${kpData?.cusps?.[rule.cusp - 1]?.subLord || '—'}`,
                    cslResult?.status || 'Evaluated'
                ]
            ];

            autoTable(doc, {
                startY: y,
                head: evHeaders,
                body: evRows,
                theme: 'striped',
                margin: { left: 14, right: 14 },
                styles: { fontSize: 7.2, cellPadding: 1.8 },
                headStyles: { fillColor: COLORS.NAVY, textColor: COLORS.WHITE },
                alternateRowStyles: { fillColor: COLORS.CREAM },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 38 },
                    1: { cellWidth: 46 },
                    2: { cellWidth: 68 },
                    3: { fontStyle: 'bold', cellWidth: 30 }
                }
            });

            y = doc.lastAutoTable.finalY + 4;

            // Top Ranked Significator Planets for this event
            if (rankingResult?.rankedPlanets && rankingResult.rankedPlanets.length > 0) {
                const topPlanets = rankingResult.rankedPlanets.slice(0, 5);
                const pHeaders = [['Rank', 'Planet', 'Matches', 'Signified Houses', 'Dasha Role', 'Drishti / Aspect Support']];
                const pRows = topPlanets.map((p, pIdx) => {
                    const roles = [];
                    if (p.dashaRoles?.isMahadashaLord) roles.push('MD');
                    if (p.dashaRoles?.isBhuktiLord) roles.push('AD');
                    if (p.dashaRoles?.isAntaraLord) roles.push('PD');
                    if (p.dashaRoles?.isSookshmaLord) roles.push('SD');
                    if (p.dashaRoles?.isPranaLord) roles.push('Prana');
                    const roleStr = roles.length > 0 ? roles.join(', ') : 'Significator';

                    return [
                        `#${pIdx + 1}`,
                        p.planetName || p.planetKey || p.planet || '—',
                        `${p.matchedHouses?.length || p.score || 0} houses`,
                        p.matchedHouses?.join(', ') || '—',
                        roleStr,
                        p.drishti?.summaryBadge || 'Standard Aspect'
                    ];
                });

                autoTable(doc, {
                    startY: y,
                    head: pHeaders,
                    body: pRows,
                    theme: 'plain',
                    margin: { left: 14, right: 14 },
                    styles: { fontSize: 7, cellPadding: 1.5, lineColor: COLORS.BORDER, lineWidth: 0.2 },
                    headStyles: { fillColor: COLORS.CHARCOAL, textColor: COLORS.WHITE },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 14 },
                        1: { fontStyle: 'bold', textColor: COLORS.MAROON, cellWidth: 26 },
                        2: { cellWidth: 22 },
                        3: { fontStyle: 'bold', cellWidth: 40 },
                        4: { cellWidth: 35 },
                        5: { cellWidth: 45 }
                    }
                });

                y = doc.lastAutoTable.finalY + 6;
            }
        }
    }

    // 4. Astrological Chart Section
    doc.addPage();
    y = 20;

    y = embedChartSection(doc, y, {
        chartStyle,
        planets: kpData?.planets || [],
        cusps: kpData?.cusps || [],
        lagna: kpData?.lagna,
        metadata: kpData?.metadata || {},
        birthDetails
    });

    // 5. Ruling Planets Section
    if (kpData?.planets && kpData?.cusps) {
        y = buildRulingPlanetsTable(doc, y, {
            lagna: kpData.lagna,
            planets: kpData.planets,
            cusps: kpData.cusps,
            metadata: kpData.metadata || {},
            birthDetails
        });
    }

    // 6. Planetary Positions Table
    if (kpData?.planets && kpData.planets.length > 0) {
        doc.addPage();
        y = 20;
        y = buildPlanetsTable(doc, y, kpData.planets);
    }

    // 7. Placidus House Cusps Table
    if (kpData?.cusps && kpData.cusps.length > 0) {
        y = buildCuspsTable(doc, y, kpData.cusps);
    }

    // 8. 4-Level Significators Table
    if (kpData?.significators) {
        doc.addPage();
        y = 20;
        y = buildSignificatorsTable(doc, y, kpData.significators);
    }

    // 9. Vimshottari Dasha Hierarchy
    if (kpData?.dasha) {
        y = buildDashaTable(doc, y, kpData.dasha);
    }

    // 10. Planetary Aspects Table
    if (kpData?.aspects) {
        y = buildAspectsTable(doc, y, kpData.aspects);
    }

    // 11. Final Analytical Synthesis & Conclusion
    if (y > 220) {
        doc.addPage();
        y = 20;
    }

    y = drawSectionHeading(doc, y, 'Investigative Synthesis & Analytical Limitations', 'Audit Findings');

    const conclusions = [
        ['1. Favorable Indicators:', 'Active Joint DBA and strong Level 1/Level 2 significations connect to recovery houses (2, 4, 6, 11).'],
        ['2. Identified Obstructions:', 'Presence of 8th or 12th house affiliations indicates potential transit delays or concealment factors.'],
        ['3. Data Integrity & Certitude:', 'Calculated strictly from input coordinates; any imprecision in the incident timestamp directly alters cuspal sub-lords.'],
        ['4. Actionable Protocol:', 'This astrological synthesis must strictly remain auxiliary to official search investigations and ground emergency responders.']
    ];

    autoTable(doc, {
        startY: y,
        head: [['Principle', 'Forensic Astrological Observation']],
        body: conclusions,
        theme: 'striped',
        margin: { left: 14, right: 14 },
        styles: { fontSize: 7.8, cellPadding: 2.2 },
        headStyles: { fillColor: COLORS.NAVY, textColor: COLORS.WHITE },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50, textColor: COLORS.CHARCOAL },
            1: { cellWidth: 132 }
        }
    });

    // Final Two-Pass Headers and Footers
    addRunningHeadersAndFooters(doc, {
        reportTitle: 'Missing Person Astrological Analysis Report',
        caseRef,
        isCoverIncluded: true
    });

    return doc;
}

// ============================================================================
// TEMPLATE B: KP KUNDLI COMPREHENSIVE REPORT
// ============================================================================
export async function generateKPKundliReport({
    kpData,
    birthDetails = {},
    chartStyle = 'south',
    includeSections = {}
}) {
    const doc = createBaseDocument();
    const subjectName = birthDetails.name || 'Seeker';
    const dateStr = `${birthDetails.birthDate || ''} ${birthDetails.birthTime || ''}`;
    const locationStr = birthDetails.birthPlace || 'Location Specified';
    const ayanamshaStr = kpData?.metadata?.ayanamshaFormatted ? `${kpData.metadata.ayanamshaFormatted} (${kpData.metadata.ayanamshaMode || 'KP New'})` : 'KP New Ayanamsha';

    // 1. Cover Page
    drawCoverPage(doc, {
        reportTitle: 'KP Kundli Comprehensive Report',
        subTitle: 'High-Precision Placidus Cusps, Sub-Lords & 4-Level Significators',
        caseRef: `KPK-${birthDetails.birthDate?.replace(/-/g, '') || '01'}`,
        subjectName,
        dateStr,
        locationStr,
        ayanamshaStr
    });

    let y = 20;

    // 2. Chart Section
    y = embedChartSection(doc, y, {
        chartStyle,
        planets: kpData?.planets || [],
        cusps: kpData?.cusps || [],
        lagna: kpData?.lagna,
        metadata: kpData?.metadata || {},
        birthDetails
    });

    // 3. Ruling Planets
    if (kpData?.planets && kpData?.cusps) {
        y = buildRulingPlanetsTable(doc, y, {
            lagna: kpData.lagna,
            planets: kpData.planets,
            cusps: kpData.cusps,
            metadata: kpData.metadata || {},
            birthDetails
        });
    }

    // 4. Planets Table
    if (kpData?.planets && kpData.planets.length > 0) {
        doc.addPage();
        y = 20;
        y = buildPlanetsTable(doc, y, kpData.planets);
    }

    // 5. Placidus Cusps Table
    if (kpData?.cusps && kpData.cusps.length > 0) {
        y = buildCuspsTable(doc, y, kpData.cusps);
    }

    // 6. 4-Level Significators Table
    if (kpData?.significators) {
        doc.addPage();
        y = 20;
        y = buildSignificatorsTable(doc, y, kpData.significators);
    }

    // 7. Vimshottari Dasha Hierarchy
    if (kpData?.dasha) {
        y = buildDashaTable(doc, y, kpData.dasha);
    }

    // 8. Planetary Aspects Table
    if (kpData?.aspects) {
        y = buildAspectsTable(doc, y, kpData.aspects);
    }

    // Add running headers & footers
    addRunningHeadersAndFooters(doc, {
        reportTitle: 'KP Kundli Comprehensive Analysis',
        caseRef: subjectName,
        isCoverIncluded: true
    });

    return doc;
}

// ============================================================================
// TEMPLATE C: VEDIC KUNDLI REPORT
// ============================================================================
export async function generateVedicReport({
    kpData,
    birthDetails = {},
    chartStyle = 'north',
    includeSections = {}
}) {
    const doc = createBaseDocument();
    const subjectName = birthDetails.name || 'Seeker';
    const dateStr = `${birthDetails.birthDate || ''} ${birthDetails.birthTime || ''}`;
    const locationStr = birthDetails.birthPlace || 'Location Specified';
    const ayanamshaStr = kpData?.metadata?.ayanamshaFormatted || 'Chitra Paksha / KP Sidereal';

    // 1. Cover Page
    drawCoverPage(doc, {
        reportTitle: 'Vedic Kundli Janmapatri Report',
        subTitle: 'Traditional Rashi Chakra, Planetary Dignities & Dasha Analysis',
        caseRef: `VEDIC-${birthDetails.birthDate?.replace(/-/g, '') || '01'}`,
        subjectName,
        dateStr,
        locationStr,
        ayanamshaStr
    });

    let y = 20;

    // 2. Chart Section (Defaults to North Indian diamond style for Vedic)
    y = embedChartSection(doc, y, {
        chartStyle,
        planets: kpData?.planets || [],
        cusps: kpData?.cusps || [],
        lagna: kpData?.lagna,
        metadata: kpData?.metadata || {},
        birthDetails
    });

    // 3. Planetary Positions in Signs & Nakshatras
    if (kpData?.planets && kpData.planets.length > 0) {
        y = drawSectionHeading(doc, y, 'Planetary Placements & Nakshatra Padas', 'Sidereal Planetary Spheres');

        const vHeaders = [['Graha', 'Rashi (Sign)', 'Bhava', 'Longitude', 'Nakshatra & Pada', 'Nakshatra Lord']];
        const vRows = kpData.planets.map(p => [
            p.name || p.key,
            p.sign?.en || '—',
            String(p.house || '—'),
            formatDegMin(p.degreeInSign),
            `${p.nakshatra?.name || '—'} (P${p.nakshatra?.pada || 1})`,
            p.starLord || '—'
        ]);

        autoTable(doc, {
            startY: y,
            head: vHeaders,
            body: vRows,
            theme: 'striped',
            margin: { left: 14, right: 14 },
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: COLORS.MAROON, textColor: COLORS.WHITE },
            alternateRowStyles: { fillColor: COLORS.CREAM }
        });

        y = doc.lastAutoTable.finalY + 8;
    }

    // 4. Note on Navamsa (D9)
    y = drawNoticeBox(doc, y, {
        title: 'DIVISIONAL CHARTS (VARGAS) NOTICE',
        text: 'The current calculation engine produces high-precision D1 Rashi and Placidus Cuspal Intercepts. Secondary divisional charts such as D9 Navamsa are currently not computed in the KP engine and are intentionally omitted rather than fabricated with synthetic positions.',
        type: 'info'
    });

    // 5. Vimshottari Dasha Schedule
    if (kpData?.dasha) {
        doc.addPage();
        y = 20;
        y = buildDashaTable(doc, y, kpData.dasha);
    }

    addRunningHeadersAndFooters(doc, {
        reportTitle: 'Vedic Kundli Report',
        caseRef: subjectName,
        isCoverIncluded: true
    });

    return doc;
}

// ============================================================================
// TEMPLATE D: GENERAL EVENT ANALYSIS REPORT
// ============================================================================
export async function generateEventAnalysisReport({
    kpData,
    birthDetails = {},
    selectedEvents = [],
    chartStyle = 'south'
}) {
    return generateMissingPersonReport({
        kpData,
        birthDetails,
        missingPersonCase: {
            caseReference: `EVT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            subjectName: birthDetails.name || 'Horary Event Seeker',
            status: 'Event Analysis Investigation'
        },
        selectedEvents,
        chartStyle
    });
}

/**
 * Universal Download Helper
 */
export function downloadReportPdf(doc, filename) {
    const cleanName = sanitizeFileName(filename) + '.pdf';
    doc.save(cleanName);
}

/**
 * Universal Print Helper (Direct PDF Print)
 */
export function printReportPdf(doc) {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
    }
}

/**
 * Universal Preview Helper (Generates Blob URL for Iframe / Viewer)
 */
export function getReportPdfBlobUrl(doc) {
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
}
