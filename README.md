# KP Astrology Studio

High-precision, standalone **Krishnamurti Paddhati (KP) Astrology Studio** extracted and refined from AstroSharma.

This project is an independent astrological calculation engine and modern interactive interface dedicated exclusively to Krishnamurti Paddhati (KP) astrology, eliminating all Vedic/Parashari components, payment systems, and unrelated business website code.

---

## ✨ Features & Modules

- **Placidus House Cusps**: Exact semi-diurnal / semi-nocturnal arc trisection cusps (1–12) with polar latitude Porphyry fallbacks.
- **249 Sub Lords & SSL**: Authoritative division of the 27 Nakshatras into 249 Sub Lords and 2,187 Sub-Sub Lords using verified half-open intervals `[start, end)`.
- **4-Level House Significators**:
  - Level 1: Planets in the constellation of occupants
  - Level 2: Planets occupying the house
  - Level 3: Planets in the constellation of house owners
  - Level 4: House lord / owner
  - Plus full planetary lordship matrix and house drishti (aspects).
- **Vimshottari Dasha Hierarchy**: Complete 120-year cycle computation (Mahadasha, Antardasha, Pratyantardasha) with fractional balance at birth, pre-natal clipping, active period search, and associated Bhava significations.
- **KP Planetary & Cusp Aspects**: Western angular aspects (Conjunction, Opposition, Trine, Square, Sextile, etc.), applying vs. separating orbs, and planetary aspects to Placidus cusps.
- **Ruling Planets (RP) Tool**: Instant horary / Prashna calculator for Ascendant, Moon, and Day rulers at any judgment moment.
- **Dual Chart Visualization**: Interactive South Indian and North Indian chart styles with planetary degrees, retrogrades, and house cusps.
- **Bilingual Interface**: Full Telugu (`తెలుగు`) and English (`EN`) localization with seamless one-click toggling.
- **Offline & Authoritative Engines**:
  - **Primary Engine**: High-precision astronomical calculation engine via backend API.
  - **Client Fallback Engine**: Pure JavaScript astronomical calculation (`astronomy-engine` VSOP87/ELP2000-82).

---

## 🏗️ Project Architecture

```
kp-astrology/
├── package.json               # Independent dependencies & scripts
├── vite.config.js             # Frontend Vite dev server & proxy
├── tailwind.config.js         # Styling & typography configuration
├── postcss.config.js
├── index.html
├── .env.example               # Environment variables template
├── .gitignore
├── server/
│   ├── index.js               # Dedicated lightweight KP Express server
│   ├── routes/
│   │   ├── kpRoutes.js        # KP calculation & Vimshottari endpoints
│   │   └── locationRoutes.js  # Geocoding & timezone resolution endpoints
│   └── services/
│       ├── swissEphemerisService.js # Astronomical calculation service
│       └── geocodingService.js      # Open-Meteo, Photon & tz-lookup proxy
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── services/
│   │   ├── kpCalculator.js    # Master KP calculation service
│   │   └── locationService.js # Geocoding & timezone service
│   ├── utils/
│   │   ├── nakshatraUtils.js  # Degree formatting & astronomical helpers
│   │   ├── kpTranslations.js  # Bilingual terminology dictionary
│   │   └── kp/
│   │       ├── kpAyanamsha.js # KP New, Original, Straight
│   │       ├── kpSubLord.js   # 249 Sub Lords & SSL boundaries
│   │       ├── kpHouses.js    # Placidus house cusp mathematics
│   │       ├── kpSignificators.js # 4-fold significator hierarchy
│   │       ├── kpRulingPlanets.js # Ruling planets & hora calculation
│   │       ├── kpAspects.js   # Western aspects & orbs
│   │       └── vimshottariDasha.js # Vimshottari engine & hierarchy
│   ├── components/
│   │   ├── common/            # Navbar, Footer, CityAutocomplete, MapPickerModal
│   │   └── kp/                # Chart, Tables, Significators, Dasha, Aspects, RP
│   └── pages/
│       ├── KPDashboard.jsx    # Entry dashboard & birth details form
│       ├── KPResultsView.jsx  # Multi-tab comprehensive KP analysis hub
│       └── KPRulingPlanetsPage.jsx # Dedicated Ruling Planets tool
└── test/
    ├── kp_kundli_suite.js     # 17 KP core verification tests
    ├── vimshottari_dasha_suite.js # 31 Vimshottari dasha tests
    ├── kp_aspects_suite.js    # 9 KP aspects tests
    ├── test_all_249_subs.js   # 486 Sub Lord & SSL boundary tests
    ├── location_and_geocoding_suite.js # Location & timezone tests
    ├── independent_multi_audit.js # Multi-case benchmark audit
    └── swe_multi_ref.json     # Authoritative calculation reference fixtures
```

---

## 🚀 Installation & Running

### 1. Install Dependencies

In the `kp-astrology/` directory:

```bash
cd kp-astrology
npm install
```

### 2. Run Test Suites

Run all automated unit and integration test suites:

```bash
npm test
```

Individual test suites:
- `npm run test:kp` — KP Kundli & 249 Sub Lord intervals
- `npm run test:dasha` — Vimshottari Dasha calculations & clipping
- `npm run test:aspects` — KP Aspects & applying/separating orbs
- `npm run test:location` — Geocoding & timezone resolution
- `npm run test:audit` — Multi-case benchmark audit

### 3. Start the Backend API Server

```bash
npm run server
```
Server starts on `http://localhost:5001`.
Health check: `http://localhost:5001/api/health`.

### 4. Start the Frontend Development Studio

In a separate terminal:

```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 5. Build for Production

```bash
npm run build
```
Generates optimized static production assets in `dist/`.

---

## 📜 Third-Party Licensing & Compliance

- **Astronomy Engine**: Licensed under MIT License (Don Cross).
- **Open-Meteo & Photon Geocoding**: Open Database License (ODbL) / CC-BY 4.0 © OpenStreetMap contributors.
- **tz-lookup**: Licensed under CC0 1.0 Universal (Public Domain).
- **Leaflet & React-Leaflet**: Licensed under BSD 2-Clause / MIT License.

---

## 🔮 KP Horary (Prashna 1–249) & House Rotation Engine

### 1. Mathematical Derivation of the 249 Sub Lord Table
The zodiac circle of **1,296,000 arc-seconds** (360°) is divided into 12 signs of 108,000" each and 27 Nakshatras of 48,000" (13°20') each.
Within every Nakshatra, the sub-arc is proportional to each planet's Vimshottari period (totaling 120 years):
$$\text{Sub Arc (arc-seconds)} = 400'' \times \text{Vimshottari Years}$$
Whenever a sub-span crosses a 30° (108,000") sign boundary, it is split into two contiguous segments sharing the same star and sub lords, but having different sign lords. Across the entire zodiac circle, exactly **6 nakshatras** intersect sign boundaries:
- Krittika (Aries $\to$ Taurus) — Sun/Venus sub split (#26, #27)
- Mrigashira (Taurus $\to$ Gemini) — Mars/Mars sub split (#66, #67)
- Punarvasu (Gemini $\to$ Cancer) — Jupiter/Saturn sub split (#106, #107)
- Uttara Phalguni (Leo $\to$ Virgo) — Sun/Venus sub split (#148, #149)
- Chitra (Virgo $\to$ Libra) — Mars/Mars sub split (#188, #189)
- Vishakha (Libra $\to$ Scorpio) — Jupiter/Saturn sub split (#228, #229)

$243 \text{ undivided subs} + 6 \text{ split subs} = \mathbf{249 \text{ segments}}$.
The Ascendant longitude for KP seed number $N$ is fixed to the **exact start point** of segment $N$.

### 2. Analytical RAMC Inversion for Placidus Cusps
Given a target tropical Ascendant $\lambda_{\text{asc}}$, geographic latitude $\phi$, and obliquity $\varepsilon$, Placidus defines:
$$\tan(\alpha) = \cos(\varepsilon)\tan(\lambda_{\text{asc}}), \quad \sin(\delta) = \sin(\varepsilon)\sin(\lambda_{\text{asc}})$$
$$\tan(\text{RAMC} - \alpha) = -\frac{\tan(\phi)\tan(\delta)}{\cos(\text{RAMC} - \alpha)}$$
Expanding via trigonometric identities yields:
$$A \cos(\text{RAMC}) + B \sin(\text{RAMC}) = C$$
where:
$$A = \cos(\lambda_{\text{asc}}), \quad B = \sin(\lambda_{\text{asc}})\cos(\varepsilon), \quad C = -\sin(\lambda_{\text{asc}})\tan(\phi)\sin(\varepsilon)$$
This has a closed-form analytical solution:
$$R_0 = \sqrt{A^2 + B^2}, \quad \gamma = \text{atan2}(B, A)$$
$$\cos(\text{RAMC} - \gamma) = \frac{C}{R_0}$$
Two roots exist; the Ascendant root is determined by the diurnal condition. One Newton iteration polishes the result to machine epsilon ($< 4 \times 10^{-10}$ arc-seconds error). Cusps 1–12 are then computed directly via Placidus semi-arc formulas.

### 3. Bhavat Bhavam House Rotation (1–12)
House rotation rotates any designated house $R \in [1, 12]$ to act as Lagna (House 1):
$$H_{\text{rot}} = ((H_{\text{orig}} - R + 12) \bmod 12) + 1$$
$$H_{\text{orig}} = ((H_{\text{rot}} + R - 2) \bmod 12) + 1$$
Rotation operates strictly as an **immutable view-layer transformation**:
- Zero ephemeris recomputation.
- Planetary longitudes and cuspal ecliptic coordinates remain invariant.
- Planet house occupancies, 4-level significator matrices, and house aspects are re-indexed instantaneously.
- Preserved across all 8 studio tabs with deep-link URL synchronization:
  `?mode=horary&kp=137&rot=7`

---

## 🔮 Gulbarga Theory & Theory of Short Prediction (TSP)

### Overview
**Gulbarga Theory** is an accelerated KP horary shortcut for binary **YES / NO** questions ("Will my waitlist ticket confirm?", "Will I get this job?", "Will the deal close?").

Rather than constructing a full 12-house Placidus horoscope, the astrologer queries a number from the querent and compares the lords of that number's ascendant against the Moon and Ruling Planets.

### Theory of Short Prediction (TSP — Dr. K. R. Kar)
**TSP** is Dr. Keshab Ranjan Kar's systematic refinement of Gulbarga Theory, documented with over 60 worked clinical examples in Kanakkumar B. Bosmia's reference work, *"Easy way to learn KP – Theory of Short Prediction"* (2018).

Key differences between Classic Gulbarga and TSP:

| Feature | Classic Gulbarga | TSP (Dr. Kar) |
|---|---|---|
| **Deciding factor** | Ascendant **Sub Lord** | Ascendant **Sub-Sub (SS) Lord** |
| **Comparison targets** | Instantaneous Ruling Planets (RP 1–5) | Moon **Star & SS Lord**, Horary Asc **Star & SS Lord** |
| **Planetary positions** | Real moment & coordinates of judgment | **Single daily snapshot at 00:00 UTC (= 05:30 IST)**: Day-Rise Planetary Effect (DRPE) |
| **Decision logic** | Rule 1 (Sub = Moon/Asc star) else Rule 2 (all 3 lords in RPs) | **Majority of 3 rules** + Special Rule 1 + Saturn Punarphoo Inversion |
| **Number systems** | Fixed 1–249 | 1–9, 1–27, 1–249, 1–2193 (astrologer's choice) |

### Horary Number Systems (Integer 1/3 Arc-Second Units)
To eliminate floating-point rounding errors across sub-sub divisions, table boundaries are computed in exact integer units:
- $\text{UNIT} = 1/3 \text{ arc-second}$
- $\text{CIRCLE} = 3,888,000 \text{ units } (360^\circ)$
- $\text{SIGN} = 324,000 \text{ units } (30^\circ)$
- $\text{NAKSHATRA} = 144,000 \text{ units } (13^\circ 20')$
- $\text{Sub span (lord } L) = 1,200 \times \text{years}(L)$
- $\text{Sub-sub span (sub } L, \text{ ss } M) = 10 \times \text{years}(L) \times \text{years}(M)$

The four systems:
1. **1–9**: The first 9 entries of the 1–249 table (all in Ashwini: Mars–Ketu–$X$–$X$).
2. **1–27**: Start of each nakshatra ($\text{Star} = \text{Sub} = \text{SS} = \text{nakshatra lord}$).
3. **1–249**: All 243 sub starts $\cup$ 12 sign starts (exactly 6 split pairs).
4. **1–2193**: All 2,187 sub-sub starts $\cup$ 12 sign starts (exactly 6 split pairs).

### Day-Rise Planetary Effect (DRPE 05:30 IST / 00:00 UTC Snapshot)
TSP evaluates all questions on a given day against a fixed snapshot calculated at **00:00 UTC** (05:30 IST in India).
- **Day Boundary**: A question asked at 05:29:59 IST uses the previous day's snapshot; 05:30:00 IST onward uses today's (UTC calendar date of the judgment instant).
- Retrograde motion is ignored in TSP.
- Snapshots are memoized in memory per date to avoid redundant ephemeris computation.

### TSP Targets and Rules
Let:
- $\text{Asc}$ = Lords of chosen horary number ($\text{Sign}, \text{Star}, \text{Sub}, \text{SS}$)
- $\text{Moon}$ = Lords of Moon from the DRPE snapshot
- $T = \{ \text{Moon.star}, \text{Moon.subSub}, \text{Asc.star}, \text{Asc.subSub} \}$
- $A = \text{Asc.subSub}$ (main deciding factor)

#### Node Agency (Rahu / Ketu)
A node matches target set $T$ if the node itself or any of its agents is in $T$. Agents are evaluated in strict priority order:
1. Star lord of the node (skipped if it is the other node or itself).
2. Sign lord of the node.
3. Non-node planets conjoined with the node in the same sign.
4. Non-node planets aspecting the node's sign with Vedic whole-sign aspects (7th aspect; Mars 4th & 8th; Jupiter 5th & 9th; Saturn 3rd & 10th).

#### The 3 Rules (Majority of 3)
- **Rule 1**: $B = \text{SS lord of } A$ ($A$ is in the sub-sub of $B$). Satisfied if $\text{matches}(B)$.
- **Rule 2**: $B = \text{Star lord of } A$ ($A$ is in the star of $B$). Satisfied if $\text{matches}(B)$.
- **Rule 3**: $C = \text{Star lord of } (\text{SS lord of } A)$. Satisfied if $\text{matches}(C)$.

Base answer is **YES** if at least 2 of 3 rules are satisfied, else **NO**.

#### Special Rules
1. **Special Rule 1 (Moon Asc SS Lord)**: If $A = \text{Moon}$, or $A$ is a node and $\text{Moon} \in \text{agents}(A) \implies \mathbf{YES}$ (skips Rules 1–3).
2. **Punarphoo Inversion (Saturn Effect)**: If Moon is connected with Saturn, the answer is **inverted** ($\text{YES} \to \text{NO}, \text{NO} \to \text{YES}$). Connections:
   - Saturn and Moon in the same sign (conjoined),
   - Saturn aspects Moon's sign (3rd, 7th, 10th whole-sign),
   - Moon is in Saturn's star,
   - Moon's star lord is a node whose agents include Saturn.
3. **Optional Special Rule 3 (OFF by default)**: If $A = \text{Moon.star}$ or $A = \text{Asc.star} \implies \mathbf{YES}$. (The author advises against applying this blindly).

### Caution on Use
> [!IMPORTANT]
> Gulbarga Theory and TSP are rapid heuristics designed strictly for minor, immediate yes/no horary inquiries. For life-altering matters (marriage matching, longevity, major surgical procedures, large capital investments), astrologers must cast a full 12-house KP Horary chart with complete cuspal sub lord significator analysis.

### Credits & Acknowledgments
- **Theory of Short Prediction (TSP)**: Formulated by **Dr. Keshab Ranjan Kar**.
- **Reference Documentation & Clinical Verification**: **Kanakkumar B. Bosmia**, *"Easy way to learn KP – Theory of Short Prediction"* (2018).


