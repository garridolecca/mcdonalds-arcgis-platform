# McDonald's Strategic Intelligence Platform

> A multi-tab ArcGIS JavaScript 4.30 application that maps McDonald's six biggest strategic problems in 2026 and demonstrates how **ArcGIS location intelligence** can help solve each one.

**[🌐 Live Demo →](https://garridolecca.github.io/mcdonalds-arcgis-platform/)**

---

## Overview

Each tab in the platform addresses one critical business problem through an interactive ArcGIS map, real-time data simulation, and spatial analytics powered by the Esri ecosystem.

| Tab | Problem | ArcGIS Solution |
|-----|---------|-----------------|
| 📊 **Overview** | Executive summary of all 6 challenges | Clickable cards linking to each map |
| 🚛 **Supply Chain** | Volatile global supply routes, disruption risk | Network Analysis, Supply Chain Event Management |
| 👥 **Customer Loss** | Lower-income customers can't afford McDonald's | GeoEnrichment, Living Atlas demographics |
| ⚔️ **Value & Competition** | Competitors closing the value gap | Places API, drive-time catchment analysis |
| 🏪 **Franchisees** | 41% of operators dissatisfied with pricing strategy | Franchise Analytics, performance tier mapping |
| 💲 **Price Gap** | Same Big Mac costs $5.19–$7.49 across US cities | Geocoding, cost-of-living enrichment |
| 🚗 **Drive-Thru AI** | 5.4-min avg wait, 5.8% error rate | ArcGIS Route + Traffic, AI queue optimization |

---

## Supply Chain Tab — Featured Capability

The Supply Chain tab showcases the full **Supplier → Distribution Center → Restaurant** chain on an animated world map:

- **12 global suppliers** (Tyson, JBS, Cargill, Marfrig, Lamb Weston, McCain, Coca-Cola, and more) rendered as color-coded nodes by commodity
- **7 distribution centers** worldwide (Martin-Brower US regions, Europe, APAC, Australia)
- **7 restaurant hub endpoints** representing ~40,000+ locations across 6 regions
- **Animated shipment dots** flowing along every active route in real time
- **Commodity filter** — click Beef / Potato / Bread / Beverage to isolate that commodity's entire supply chain
- **Disruption Simulation** — triggers a 3-tier chain reaction report:
  - Tier 1: Which suppliers went offline and why
  - Tier 2: Which distribution centers lost inbound supply (% impact + stockout estimate)
  - Tier 3: How many restaurants are at risk, across which regions
  - ArcGIS response plan: Network Analysis re-routing, GeoEnrichment buffer stock, Dashboard alerts

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Maps & Spatial** | [ArcGIS JavaScript API 4.30](https://developers.arcgis.com/javascript/latest/) (AMD CDN) |
| **Location Services** | GeoEnrichment, Places API, Geocoding, Route, Living Atlas |
| **Frontend** | Vanilla HTML / CSS / JavaScript — no build step required |
| **Dev Environment** | VS Code + Live Server |
| **Hosting** | GitHub Pages |

---

## Project Structure

```
mcdonalds-arcgis-platform/
├── index.html          # HTML structure — no inline styles or scripts
├── css/
│   └── main.css        # McDonald's brand tokens + full UI stylesheet
├── js/
│   ├── data.js         # All mock datasets (supply chain, pricing, demographics)
│   └── app.js          # ArcGIS require() + all tab initialization logic
└── .vscode/
    ├── settings.json   # Live Server port 5500
    ├── launch.json     # Chrome debug config
    └── extensions.json # Recommended extensions
```

---

## Running Locally

### Prerequisites
- [VS Code](https://code.visualstudio.com/)
- [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

### Steps

```bash
git clone https://github.com/garridolecca/mcdonalds-arcgis-platform.git
cd mcdonalds-arcgis-platform
# Open in VS Code, then click "Go Live" in the bottom status bar
```

The app opens at `http://127.0.0.1:5500/index.html`.

### Optional: ArcGIS API Key

The app runs fully on mock data without a key. To enable **live** GeoEnrichment, Places API, Geocoding, and Routing:

1. Sign up at [developers.arcgis.com](https://developers.arcgis.com)
2. Create an API key with the required scopes
3. Click **"Configure API Key"** in the app header and paste it in

---

## Key ArcGIS Services Used

```javascript
// GeoEnrichment — live demographic data around any clicked point
fetch('https://geoenrich.arcgis.com/arcgis/rest/services/World/geoenrichmentserver/GeoEnrichment/enrich', ...)

// Living Atlas — Median Household Income layer
new FeatureLayer({ url: 'https://demographics5.arcgis.com/...' })

// ArcGIS Search widget — geocoding + places search
new Search({ view, popupEnabled: false })
```

---

## Screenshots

### Overview Tab
All six strategic problems at a glance, with severity badges and direct links to each map tab.

### Supply Chain — Active Disruption
Animated global routes with real-time chain reaction cascade showing supplier → DC → restaurant impact across 3 tiers.

### Customer Loss — GeoEnrichment
At-risk zones mapped over restaurant density, with live demographic enrichment on click.

---

## Data Sources & Context

All business metrics are sourced from public reporting as of Q1 2026:

- [McDonald's value strategy & franchisee tensions — CNBC](https://www.cnbc.com/2026/02/11/mcdonalds-value-franchisees.html)
- [McDonald's rapidly losing lower-income customers — TheStreet](https://www.thestreet.com/restaurants/mcdonalds-is-rapidly-losing-a-vital-group-of-customers)
- [McDonald's AI bet for drive-thru in 2026 — TheStreet](https://www.thestreet.com/restaurants/mcdonalds-bets-on-ai-in-2026-to-fix-a-major-problem)
- Supply chain structure based on publicly known McDonald's distribution partners (Martin-Brower, OSI Group, Keystone Foods/Tyson, Lamb Weston)

Supply chain coordinates, capacity figures, and route data are **illustrative/mock** for demonstration purposes.

---

## License

MIT — free to use, adapt, and extend.
