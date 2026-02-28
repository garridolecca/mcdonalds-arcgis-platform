/* ════════════════════════════════════════════
   McDonald's Strategic Intelligence Platform
   Application — ArcGIS JS API 4.30 (AMD)

   Requires: js/data.js loaded first
   Depends on: ArcGIS JS API 4.30 CDN (window.require)
════════════════════════════════════════════ */

/* ── App State ── */
const S = {
  apiKey:       sessionStorage.getItem('mcd_key') || '',
  initialized:  {},
  supFilter:    'all',
  disruptedIds: [],
  demoPoint:    null,
  animRunning:  false,
  animRaf:      null,
  animLast:     0,
  runners:      [],
  glowLayer:    null,
  disruptLayer: null,
};

/* ── ArcGIS module handles (populated after require resolves) ── */
let Map_, MapView_, GL_, FL_, G_, geometryEngine_,
    Search_, Expand_, Home_, ScaleBar_, esriCfg_;

/* ── Views registry (exposed globally so HTML onclick can reach it) ── */
window.VIEWS = {};

/* ── API key functions ── */
// Called from the modal before require() resolves — must be global
function applyKey() {
  const k = document.getElementById('apiKeyIn').value.trim();
  if (k) {
    S.apiKey = k;
    sessionStorage.setItem('mcd_key', k);
    if (esriCfg_) esriCfg_.apiKey = k;
    document.getElementById('apiDot').classList.add('on');
    document.getElementById('apiTxt').textContent = 'API Key Active';
  }
  document.getElementById('modal-api').classList.remove('on');
}
function skipKey() {
  document.getElementById('modal-api').classList.remove('on');
}

/* ── Mobile panel/map toggle ── */
// Cycles: default (split) → map-only → panel-only → default
(function() {
  var mobState = 0; // 0=default/split, 1=map, 2=panel
  var mobBtn = document.getElementById('mobToggle');
  var icons = ['\u2630', '\u{1F5C2}', '\u{1F5FA}']; // ☰, 🗂, 🗺
  window.toggleMobileView = function() {
    mobState = (mobState + 1) % 3;
    var panels = document.querySelectorAll('.panel:not(#panel-overview)');
    panels.forEach(function(p) {
      p.classList.remove('mob-map', 'mob-panel');
      if (mobState === 1) p.classList.add('mob-map');
      else if (mobState === 2) p.classList.add('mob-panel');
    });
    mobBtn.textContent = icons[mobState];
    // Resize all active map views after toggle
    setTimeout(function() {
      Object.keys(window.VIEWS).forEach(function(k) {
        if (window.VIEWS[k]) window.VIEWS[k].resize();
      });
    }, 100);
  };
})();

/* ── Orientation / resize handling for maps ── */
window.addEventListener('resize', (function() {
  var timer;
  return function() {
    clearTimeout(timer);
    timer = setTimeout(function() {
      Object.keys(window.VIEWS).forEach(function(k) {
        if (window.VIEWS[k]) window.VIEWS[k].resize();
      });
    }, 200);
  };
})());

/* ════════════════════════════════════════════
   ArcGIS AMD require()
════════════════════════════════════════════ */
require([
  'esri/config',
  'esri/Map',
  'esri/views/MapView',
  'esri/layers/GraphicsLayer',
  'esri/layers/FeatureLayer',
  'esri/Graphic',
  'esri/geometry/geometryEngine',
  'esri/widgets/Search',
  'esri/widgets/Expand',
  'esri/widgets/Home',
  'esri/widgets/ScaleBar',
  'esri/core/reactiveUtils',
], function(esriConfig, Map, MapView, GraphicsLayer, FeatureLayer, Graphic,
            geometryEngine, Search, Expand, Home, ScaleBar, reactiveUtils) {

  /* ── Store module references ── */
  Map_ = Map; MapView_ = MapView; GL_ = GraphicsLayer;
  FL_ = FeatureLayer; G_ = Graphic; geometryEngine_ = geometryEngine;
  Search_ = Search; Expand_ = Expand; Home_ = Home;
  ScaleBar_ = ScaleBar; esriCfg_ = esriConfig;

  if (S.apiKey) {
    esriConfig.apiKey = S.apiKey;
    document.getElementById('apiDot').classList.add('on');
    document.getElementById('apiTxt').textContent = 'API Key Active';
  }

  /* ════════════════════════
     SHARED HELPERS
  ════════════════════════ */
  function mkView(containerId, center, zoom, extra) {
    const map = new Map({ basemap: 'dark-gray-vector', ...(extra || {}) });
    const view = new MapView({
      container: containerId,
      map,
      center,
      zoom,
      ui: { components: [] },
      constraints: { minZoom: 1 },
      popup: {
        dockEnabled: true,
        dockOptions: { buttonEnabled: false, position: 'bottom-left' },
      },
    });
    view.ui.add(new Home({ view }), 'top-right');
    view.ui.add(new ScaleBar({ view, unit: 'dual' }), 'bottom-right');
    return { map, view };
  }

  function lerp(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  function mkPath(p1, p2, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(lerp(p1, p2, i / n));
    return pts;
  }
  function byId(arr, id) { return arr.find(x => x.id === id); }

  /* ════════════════════════
     TAB NAVIGATION
     (defined here so it can close over INITS, startAnim, stopAnim)
  ════════════════════════ */
  window.gotoTab = function(id) {
    document.querySelectorAll('.tab').forEach(b =>
      b.classList.toggle('on', b.dataset.t === id));
    document.querySelectorAll('.panel').forEach(p =>
      p.classList.toggle('on', p.id === 'panel-' + id));
    if (id !== 'overview' && !S.initialized[id]) {
      S.initialized[id] = true;
      setTimeout(() => INITS[id](), 80);
    }
    if (VIEWS[id]) setTimeout(() => VIEWS[id].resize(), 100);
    if (id === 'supply') startAnim(); else stopAnim();
  };

  /* ════════════════════════
     OVERVIEW
  ════════════════════════ */
  function initOverview() {
    const grid = document.getElementById('pgrid');
    OVERVIEW_DATA.forEach(p => {
      const sc   = p.sev === 'critical' ? 'r' : p.sev === 'high' ? 'o' : 'y';
      const slbl = p.sev === 'critical' ? 'CRITICAL' : p.sev === 'high' ? 'HIGH' : 'MEDIUM';
      const div  = document.createElement('div');
      div.className = 'pc';
      div.innerHTML =
        '<div class="pc-hd"><div class="pc-num">' + p.num + '</div>' +
        '<span class="bdg ' + sc + '">' + slbl + '</span></div>' +
        '<div class="pc-ttl">' + p.ttl + '</div>' +
        '<div class="pc-desc">' + p.desc + '</div>' +
        '<div class="pc-imp">\uD83D\uDCC9 ' + p.impact + '</div>' +
        '<div class="pc-sol"><div class="pc-sol-lbl">\uD83D\uDDFA ArcGIS Solution</div>' + p.sol + '</div>' +
        '<span class="pc-cta" data-t="' + p.tab + '">Explore on Map \u2192</span>';
      grid.appendChild(div);
    });
    grid.querySelectorAll('.pc-cta').forEach(b =>
      b.onclick = () => gotoTab(b.dataset.t));
  }

  /* ════════════════════════
     SUPPLY CHAIN
  ════════════════════════ */
  let routeLayer, animLayer, nodeLayer;

  function initSupply() {
    // Regional restaurant delivery hub endpoints
    const HUBS = [
      { id:'h_w',  name:'West Region Restaurants (~1,900 locations)',    lat:37.77,  lng:-122.42 },
      { id:'h_c',  name:'Midwest Region Restaurants (~2,100 locations)', lat:41.88,  lng:-87.63  },
      { id:'h_e',  name:'East Region Restaurants (~1,800 locations)',    lat:40.71,  lng:-74.01  },
      { id:'h_s',  name:'South Region Restaurants (~2,400 locations)',   lat:32.78,  lng:-96.80  },
      { id:'h_eu', name:'Europe Region Restaurants (~9,000 locations)',  lat:48.85,  lng:2.35    },
      { id:'h_ap', name:'APAC Region Restaurants (~8,500 locations)',    lat:35.68,  lng:139.69  },
      { id:'h_au', name:'Australia Restaurants (~1,000 locations)',      lat:-37.81, lng:144.96  },
    ];
    const HUB_ROUTES = [
      { f:'dc_w',  t:'h_w'  }, { f:'dc_c',  t:'h_c'  }, { f:'dc_e',  t:'h_e'  },
      { f:'dc_s',  t:'h_s'  }, { f:'dc_eu', t:'h_eu' }, { f:'dc_ap', t:'h_ap' },
      { f:'dc_au', t:'h_au' },
    ];

    const { map, view } = mkView('supply-map', [0, 20], 2);
    VIEWS.supply = view;

    const glowLayer    = new GL_({ title: 'Route Glow' });
    routeLayer         = new GL_({ title: 'Routes' });
    nodeLayer          = new GL_({ title: 'Nodes' });
    const disruptLayer = new GL_({ title: 'Disruption Markers' });
    animLayer          = new GL_({ title: 'Shipments' });
    map.addMany([glowLayer, routeLayer, nodeLayer, disruptLayer, animLayer]);

    S.disruptLayer = disruptLayer;

    // Supplier → DC runners
    const supRunners = ROUTES.map((r, idx) => {
      const sup = byId(SUPPS, r.f);
      const dc  = byId(DCS,   r.t);
      if (!sup || !dc) return null;
      return {
        id: idx, type: 'supply', sup, dc,
        pts: mkPath([sup.lng, sup.lat], [dc.lng, dc.lat], 80),
        active: true,
        color: CAT_CLR[sup.cat],
        dotSize: 11,
        dotOutline: { color: [255,255,255,120], width: 1 },
        trains: [0, 0.34, 0.67].map(ph => ({ phase: ph, g: null })),
      };
    }).filter(Boolean);

    // DC → restaurant hub runners
    const hubRunners = HUB_ROUTES.map((r, idx) => {
      const dc  = byId(DCS, r.f);
      const hub = HUBS.find(h => h.id === r.t);
      if (!dc || !hub) return null;
      return {
        id: ROUTES.length + idx, type: 'hub', dc, hub,
        pts: mkPath([dc.lng, dc.lat], [hub.lng, hub.lat], 60),
        active: true,
        alwaysVisible: true,
        color: [255, 199, 44],
        dotSize: 9,
        dotOutline: { color: [218,2,14,200], width: 1 },
        trains: [0, 0.5].map(ph => ({ phase: ph, g: null })),
      };
    }).filter(Boolean);

    S.runners   = [...supRunners, ...hubRunners];
    S.glowLayer = glowLayer;

    drawSupplyRoutes(S.supFilter);

    // Supplier nodes (circles, color-coded by commodity)
    SUPPS.forEach(s => {
      const [R,G,B] = CAT_CLR[s.cat];
      const hi = s.risk === 'high';
      nodeLayer.add(new G_({
        geometry: { type: 'point', longitude: s.lng, latitude: s.lat },
        symbol: {
          type: 'simple-marker',
          color: [R, G, B, hi ? 255 : 210],
          size: hi ? 16 : 12,
          outline: { color: hi ? [255,80,80] : [255,255,255,80], width: hi ? 2.5 : 1 },
        },
        popupTemplate: {
          title: s.name,
          content:
            '<b>Commodity:</b> ' + s.cat +
            '<br><b>Country:</b> ' + s.ctry +
            '<br><b>Capacity:</b> ' + s.cap + '%' +
            '<br><b>Risk:</b> ' + s.risk.toUpperCase() +
            '<br><br><b>ArcGIS Solution:</b> Supply Chain Event Management monitors real-time shipment status and risk scores from this supplier.',
        },
      }));
    });

    // Distribution center nodes (squares, white/yellow)
    DCS.forEach(dc => {
      nodeLayer.add(new G_({
        geometry: { type: 'point', longitude: dc.lng, latitude: dc.lat },
        symbol: {
          type: 'simple-marker', style: 'square',
          color: [255,255,255,230], size: 15,
          outline: { color: [255,199,44], width: 2.5 },
        },
        popupTemplate: {
          title: 'Distribution Center: ' + dc.name,
          content:
            '<b>Region:</b> ' + dc.region +
            '<br><b>Serves:</b> ~2,000 restaurants' +
            '<br><br><b>ArcGIS Solution:</b> ArcGIS Network Analysis optimizes last-mile delivery routes, reducing fuel costs 12–18%.',
        },
      }));
    });

    // Restaurant hub nodes (triangles, golden/red)
    HUBS.forEach(hub => {
      nodeLayer.add(new G_({
        geometry: { type: 'point', longitude: hub.lng, latitude: hub.lat },
        symbol: {
          type: 'simple-marker', style: 'triangle',
          color: [255,199,44,240], size: 18,
          outline: { color: [218,2,14], width: 2.5 },
        },
        popupTemplate: {
          title: hub.name,
          content:
            '<b>Role:</b> Regional restaurant delivery endpoint' +
            '<br><br><b>ArcGIS Solution:</b> Route service optimizes daily delivery windows. GeoEnrichment identifies high-demand zones for inventory pre-positioning.',
        },
      }));
    });

    // Pre-create dot graphics for animation
    S.runners.forEach(runner => {
      runner.trains.forEach(train => {
        const [R,G,B] = runner.color;
        const g = new G_({
          geometry: { type: 'point', longitude: runner.pts[0][0], latitude: runner.pts[0][1] },
          symbol: {
            type: 'simple-marker',
            color: [R, G, B, 240],
            size: runner.dotSize,
            outline: runner.dotOutline,
          },
        });
        animLayer.add(g);
        train.g = g;
      });
    });

    startAnim();

    // Commodity filter buttons
    document.querySelectorAll('#com-filters .tog').forEach(btn => {
      btn.onclick = function() {
        document.querySelectorAll('#com-filters .tog').forEach(b => b.classList.remove('on'));
        this.classList.add('on');
        S.supFilter = this.dataset.c;
        drawSupplyRoutes(S.supFilter);
      };
    });
  }

  // Returns true if this runner should be rendered given the current commodity filter.
  // Hub routes (DC → restaurant) always show to complete the chain picture.
  function matchesFilter(runner, filter) {
    if (runner.type === 'hub') return true;
    return filter === 'all' || (runner.sup && runner.sup.cat === filter);
  }

  function drawSupplyRoutes(filter) {
    if (!routeLayer) return;

    // Glow: only active, filter-matching routes get a glow halo
    if (S.glowLayer) {
      S.glowLayer.graphics.removeAll();
      S.runners
        .filter(r => r.active && matchesFilter(r, filter))
        .forEach(runner => {
          const [R,G,B] = runner.color;
          S.glowLayer.add(new G_({
            geometry: { type: 'polyline', paths: [runner.pts], spatialReference: { wkid: 4326 } },
            symbol: {
              type: 'simple-line',
              color: [R, G, B, 40],
              width: runner.type === 'hub' ? 6 : 5,
              style: 'solid',
            },
          }));
        });
    }

    // Routes: only render runners that pass the filter.
    // Active → normal style; disrupted → broken red line so the gap is visible.
    routeLayer.graphics.removeAll();
    S.runners
      .filter(r => matchesFilter(r, filter))
      .forEach(runner => {
        const isHub = runner.type === 'hub';
        const [R,G,B] = runner.color;
        routeLayer.add(new G_({
          geometry: { type: 'polyline', paths: [runner.pts], spatialReference: { wkid: 4326 } },
          symbol: {
            type: 'simple-line',
            color: runner.active ? [R, G, B, isHub ? 220 : 170] : [218, 2, 14, 180],
            width: runner.active ? (isHub ? 2 : 1.5) : 1.5,
            style: runner.active ? (isHub ? 'solid' : 'short-dash') : 'short-dot',
          },
        }));
      });
  }

  /* ── Supply chain animation ── */
  const DOT_SPD = 0.065;

  function startAnim() {
    if (S.animRunning) return;
    S.animRunning = true;
    function tick(ts) {
      if (!S.animRunning) return;
      const dt = Math.min((ts - S.animLast) / 1000, 0.05);
      S.animLast = ts;
      S.runners.forEach(runner => {
        runner.trains.forEach(train => {
          train.phase = (train.phase + DOT_SPD * dt) % 1;
          const idx = Math.min(
            Math.floor(train.phase * runner.pts.length),
            runner.pts.length - 1
          );
          if (train.g) {
            const [R,G,B] = runner.color;
            const vis = runner.active && matchesFilter(runner, S.supFilter);
            train.g.symbol = {
              type: 'simple-marker',
              color: vis ? [R, G, B, 240] : [0, 0, 0, 0],
              size: runner.dotSize || 7,
              outline: runner.dotOutline || null,
            };
            train.g.geometry = {
              type: 'point',
              longitude: runner.pts[idx][0],
              latitude:  runner.pts[idx][1],
            };
          }
        });
      });
      S.animRaf = requestAnimationFrame(tick);
    }
    S.animRaf = requestAnimationFrame(tick);
  }

  function stopAnim() {
    S.animRunning = false;
    if (S.animRaf) { cancelAnimationFrame(S.animRaf); S.animRaf = null; }
  }

  /* ── Supply chain window-level actions ── */

  // Restaurant locations served per DC (used in chain reaction impact calc)
  const DC_RESTAURANTS = {
    dc_w: 1900, dc_c: 2100, dc_e: 1800, dc_s: 2400,
    dc_eu: 9000, dc_ap: 8500, dc_au: 1000,
  };

  window.simDisrupt = function() {
    // Pick up to 3 non-US supplier routes to disrupt
    const cands = S.runners.filter(r => r.type === 'supply' && r.sup && r.sup.ctry !== 'USA');
    const picks = cands.sort(() => Math.random() - 0.5).slice(0, 3);
    if (!picks.length) return;

    S.disruptedIds = picks.map(r => r.id);
    picks.forEach(r => r.active = false);
    drawSupplyRoutes(S.supFilter);

    // ── VISUAL: red halos on disrupted suppliers + orange overlays on affected DCs ──
    if (S.disruptLayer) {
      S.disruptLayer.graphics.removeAll();

      picks.forEach(r => {
        // Outer halo (large, very transparent)
        S.disruptLayer.add(new G_({
          geometry: { type: 'point', longitude: r.sup.lng, latitude: r.sup.lat },
          symbol: { type: 'simple-marker', color: [218,2,14,35], size: 32,
                    outline: { color: [218,2,14,180], width: 2 } },
        }));
        // Inner halo
        S.disruptLayer.add(new G_({
          geometry: { type: 'point', longitude: r.sup.lng, latitude: r.sup.lat },
          symbol: { type: 'simple-marker', color: [218,2,14,60], size: 22,
                    outline: { color: [218,2,14,220], width: 1.5 } },
        }));
      });

      // Orange warning squares over affected DCs
      const affectedDcIds = [...new Set(picks.map(r => r.dc.id))];
      affectedDcIds.forEach(dcId => {
        const dc = byId(DCS, dcId);
        S.disruptLayer.add(new G_({
          geometry: { type: 'point', longitude: dc.lng, latitude: dc.lat },
          symbol: { type: 'simple-marker', style: 'square',
                    color: [249,115,22,100], size: 24,
                    outline: { color: [249,115,22,230], width: 2.5 } },
        }));
      });
    }

    // ── COMPUTE CHAIN REACTION ──
    const affectedDcIds = [...new Set(picks.map(r => r.dc.id))];

    // Per-DC impact: what % of their inbound supply is now disrupted?
    const dcImpact = affectedDcIds.map(dcId => {
      const totalInbound     = ROUTES.filter(r => r.t === dcId).length;
      const disruptedInbound = picks.filter(r => r.dc.id === dcId).length;
      const pct              = Math.round(disruptedInbound / totalInbound * 100);
      const dc               = byId(DCS, dcId);
      const hubRunner        = S.runners.find(r => r.type === 'hub' && r.dc && r.dc.id === dcId);
      const hubName          = hubRunner ? hubRunner.hub.name : dc.region + ' region';
      return { dc, pct, hubName, restCount: DC_RESTAURANTS[dcId] || 0 };
    });

    // Commodity shortage summary
    const commodities = {};
    picks.forEach(r => {
      if (!commodities[r.sup.cat]) commodities[r.sup.cat] = { suppliers: [], capLost: 0 };
      commodities[r.sup.cat].suppliers.push(r.sup.name);
      commodities[r.sup.cat].capLost += r.sup.cap;
    });

    const totalRestaurants = dcImpact.reduce((s, d) => s + d.restCount, 0);
    const minCap           = Math.min(...picks.map(r => r.sup.cap));
    const stockoutHrs      = Math.max(24, Math.round(minCap / 12) * 8);

    // ── BUILD CHAIN REACTION PANEL HTML ──
    let html = '';

    // Tier 1 — Suppliers
    html += `
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;
                  color:var(--muted);letter-spacing:.7px;margin-bottom:6px">
        Tier 1 &mdash; Disrupted Suppliers (${picks.length})
      </div>`;
    picks.forEach(r => {
      html += `
        <div class="al cr" style="margin-bottom:4px">
          <div class="al-dot p" style="background:var(--red)"></div>
          <div class="al-tx">
            <div class="al-ti">${r.sup.name}</div>
            ${r.sup.ctry} &middot; ${r.sup.cat.charAt(0).toUpperCase() + r.sup.cat.slice(1)}
            &middot; ${r.sup.cap}% capacity
            <br><span style="color:var(--red)">Route to ${r.dc.name} OFFLINE</span>
          </div>
        </div>`;
    });

    // Tier 2 — Distribution Centers
    html += `
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;
                  color:var(--muted);letter-spacing:.7px;margin-top:10px;margin-bottom:6px">
        Tier 2 &mdash; Affected Distribution Centers (${dcImpact.length})
      </div>`;
    dcImpact.forEach(({ dc, pct }) => {
      const sev  = pct >= 75 ? 'cr' : 'wn';
      const clrV = pct >= 75 ? 'var(--red)' : 'var(--orange)';
      const msg  = pct >= 100 ? 'Full disruption &mdash; inventory draw-down only'
                              : 'Reduced inbound &mdash; shortage risk in ' + stockoutHrs + 'h';
      html += `
        <div class="al ${sev}" style="margin-bottom:4px">
          <div class="al-dot p" style="background:${clrV}"></div>
          <div class="al-tx">
            <div class="al-ti">${dc.name}</div>
            <b>${pct}%</b> of inbound supply disrupted
            <br><span style="color:${clrV}">${msg}</span>
          </div>
        </div>`;
    });

    // Tier 3 — Restaurants
    html += `
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;
                  color:var(--muted);letter-spacing:.7px;margin-top:10px;margin-bottom:6px">
        Tier 3 &mdash; Restaurant Impact
      </div>`;
    dcImpact.forEach(({ dc, restCount }) => {
      html += `
        <div style="font-size:11px;margin-bottom:4px;color:var(--text)">
          <span style="color:var(--orange);font-weight:700">${restCount.toLocaleString()}</span>
          ${dc.region} restaurants at stock risk
        </div>`;
    });
    html += `
      <div class="kpi" style="margin-top:6px">
        <div class="kpi-l">Total Locations at Risk</div>
        <div class="kpi-v r">${totalRestaurants.toLocaleString()}</div>
        <div class="kpi-s">Est. ${stockoutHrs}h before shortfall if unresolved</div>
      </div>`;

    // Commodity shortage
    html += `
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;
                  color:var(--muted);letter-spacing:.7px;margin-top:10px;margin-bottom:6px">
        Commodity Shortfall
      </div>`;
    Object.entries(commodities).forEach(([cat, data]) => {
      html += `
        <div class="al wn" style="margin-bottom:4px">
          <div class="al-tx">
            <div class="al-ti">${cat.charAt(0).toUpperCase() + cat.slice(1)} &mdash;
              ${data.suppliers.length} supplier${data.suppliers.length > 1 ? 's' : ''} offline</div>
            Est. ${data.capLost.toLocaleString()} MT/day capacity at risk<br>
            <span style="color:var(--muted)">${data.suppliers.join(', ')}</span>
          </div>
        </div>`;
    });

    // ArcGIS response
    html += `
      <div style="background:rgba(255,199,44,.07);border:1px solid rgba(255,199,44,.2);
                  border-radius:4px;padding:9px 11px;margin-top:10px;font-size:11px;color:var(--yellow)">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.8px;
                    font-weight:700;margin-bottom:5px;opacity:.7">&#128506; ArcGIS Response Plan</div>
        <b>Network Analysis</b> re-routes supply from unaffected suppliers to impacted DCs.
        <b>GeoEnrichment</b> identifies buffer stock at nearby facilities.
        <b>Dashboards</b> broadcast live status to affected franchisees in real time.
      </div>`;

    document.getElementById('disruption-details').innerHTML = html;
    document.getElementById('disruption-panel').style.display = '';
    document.getElementById('dbanner').classList.add('on');
    document.getElementById('kRisk').textContent = String(3 + picks.length);
    document.getElementById('btnDisrupt').style.display = 'none';
    document.getElementById('btnRestore').style.display = '';
  };

  window.restoreRoutes = function() {
    S.runners.forEach(r => r.active = true);
    S.disruptedIds = [];
    drawSupplyRoutes(S.supFilter);
    if (S.disruptLayer) S.disruptLayer.graphics.removeAll();
    document.getElementById('disruption-details').innerHTML = '';
    document.getElementById('disruption-panel').style.display = 'none';
    document.getElementById('dbanner').classList.remove('on');
    document.getElementById('kRisk').textContent = '3';
    document.getElementById('btnDisrupt').style.display = '';
    document.getElementById('btnRestore').style.display = 'none';
  };

  window.flyGlobal = function() {
    if (VIEWS.supply) VIEWS.supply.goTo({ center: [0, 20], zoom: 2 }, { duration: 1500 });
  };

  /* ════════════════════════
     CUSTOMER DEMOGRAPHICS
  ════════════════════════ */
  let demoRiskLayer, demoDensityLayer;

  function initDemo() {
    const { map, view } = mkView('demo-map', [-96, 38], 4);
    VIEWS.demo = view;

    demoDensityLayer = new GL_({ title: 'Restaurant Density' });
    demoRiskLayer    = new GL_({ title: 'At-Risk Zones' });
    map.addMany([demoDensityLayer, demoRiskLayer]);

    // Mock restaurant density scatter
    const hubs = [
      {lat:41.88,lng:-87.63},{lat:40.71,lng:-74.01},{lat:34.05,lng:-118.24},
      {lat:33.75,lng:-84.39},{lat:29.76,lng:-95.37},{lat:32.78,lng:-96.80},
      {lat:33.45,lng:-112.07},{lat:47.61,lng:-122.33},{lat:25.76,lng:-80.19},
      {lat:42.36,lng:-71.06},{lat:36.16,lng:-86.78},{lat:39.74,lng:-104.99},
    ];
    for (let i = 0; i < 500; i++) {
      const h = hubs[Math.floor(Math.random() * hubs.length)];
      demoDensityLayer.add(new G_({
        geometry: {
          type: 'point',
          longitude: h.lng + (Math.random() - .5) * 5,
          latitude:  h.lat + (Math.random() - .5) * 4,
        },
        symbol: { type: 'simple-marker', color: [255,199,44,12], size: 5, outline: null },
      }));
    }

    // At-risk zone circles
    const list = document.getElementById('riskList');
    RISK_ZONES.forEach(z => {
      const cr  = z.risk === 'critical';
      const hi  = z.risk === 'high';
      const clr = cr ? [218,2,14] : hi ? [249,115,22] : [255,199,44];
      const sz  = z.dens === 'high' ? 20 : 15;
      demoRiskLayer.add(new G_({
        geometry: { type: 'point', longitude: z.lng, latitude: z.lat },
        symbol: {
          type: 'simple-marker',
          color: [...clr, 200], size: sz,
          outline: { color: [255,255,255,100], width: 1.5 },
        },
        popupTemplate: {
          title: z.name,
          content:
            '<b>Median Income:</b> $' + z.inc.toLocaleString() +
            '<br><b>Density:</b> ' + z.dens +
            '<br><b>Risk:</b> ' + z.risk.toUpperCase() +
            '<br><br>Click "Enrich" for live demographic data.',
        },
      }));
      const bc = cr ? 'r' : hi ? 'o' : 'y';
      const el = document.createElement('div');
      el.innerHTML =
        '<div class="al ' + (cr ? 'cr' : hi ? 'wn' : 'ok') + '" style="margin-bottom:4px">' +
        '<div class="al-tx"><div class="al-ti">' + z.name + '</div>' +
        'Median income: $' + z.inc.toLocaleString() +
        ' &nbsp;<span class="bdg ' + bc + '">' + z.risk + '</span></div></div>';
      list.appendChild(el);
    });

    const srch = new Search_({ view, popupEnabled: false });
    view.ui.add(new Expand_({ view, content: srch, expandIcon: 'magnifying-glass' }), 'top-right');

    view.on('click', evt => {
      S.demoPoint = evt.mapPoint;
      document.getElementById('enrichOut').textContent =
        'Selected: [' + evt.mapPoint.longitude.toFixed(3) + ', ' +
        evt.mapPoint.latitude.toFixed(3) + '] — click "Enrich"';
    });
  }

  window.updateIncome = function(v) {
    document.getElementById('incVal').textContent = '$' + parseInt(v).toLocaleString();
  };

  window.togDemoLayer = function(layer, btn) {
    btn.classList.toggle('on');
    const vis = btn.classList.contains('on');
    if (layer === 'risk'    && demoRiskLayer)    demoRiskLayer.visible    = vis;
    if (layer === 'density' && demoDensityLayer) demoDensityLayer.visible = vis;
  };

  window.doEnrich = function() {
    const el = document.getElementById('enrichOut');
    if (!S.demoPoint) { el.textContent = 'Click the map first to select a location.'; return; }
    if (!S.apiKey) {
      el.innerHTML =
        '<span style="color:var(--orange)">&#9888; API key needed for live GeoEnrichment.</span>' +
        '<br><b>Mock result for demo:</b><br>' +
        '<b>Median HH Income:</b> $32,450<br>' +
        '<b>Pop. Density:</b> 8,200/sq mi<br>' +
        '<b>Unemployment:</b> 9.3%<br>' +
        '<b>% Below Poverty:</b> 22.4%';
      return;
    }
    el.textContent = 'Enriching area\u2026';
    const body = new URLSearchParams({
      studyAreas: JSON.stringify([{
        geometry: {
          x: S.demoPoint.longitude,
          y: S.demoPoint.latitude,
          spatialReference: { wkid: 4326 },
        },
      }]),
      studyAreasOptions: JSON.stringify({ areaType:'RingBuffer', bufferUnits:'esriMiles', bufferRadii:[1] }),
      dataCollections: JSON.stringify(['KeyGlobalFacts']),
      token: S.apiKey,
      f: 'json',
    });
    fetch('https://geoenrich.arcgis.com/arcgis/rest/services/World/geoenrichmentserver/GeoEnrichment/enrich',
      { method: 'POST', body })
      .then(r => r.json())
      .then(d => {
        const a = d.results?.[0]?.value?.FeatureSet?.[0]?.features?.[0]?.attributes;
        if (a) {
          el.innerHTML =
            '<b>Median HH Income:</b> $' + (a.MEDHINC_CY  || 0).toLocaleString() +
            '<br><b>Population:</b> '     + (a.TOTPOP_CY  || 0).toLocaleString() +
            '<br><b>Households:</b> '     + (a.TOTHH_CY   || 0).toLocaleString();
        } else {
          el.textContent = 'No data returned.';
        }
      })
      .catch(() => { el.textContent = 'GeoEnrichment failed. Check API key.'; });
  };

  window.addLivingAtlas = function() {
    if (!VIEWS.demo) return;
    const lyr = new FL_({
      url: 'https://demographics5.arcgis.com/arcgis/rest/services/USA_Demographics_and_Boundaries_2022/MapServer/11',
      opacity: 0.45,
      title: 'Median HH Income (Living Atlas)',
    });
    VIEWS.demo.map.add(lyr);
    document.getElementById('enrichOut').textContent = 'Living Atlas income layer added to map.';
  };

  /* ════════════════════════
     VALUE & COMPETITION
  ════════════════════════ */
  let compLayer, saLayer;

  function initCompetition() {
    const { map, view } = mkView('competition-map', [-87.63, 41.88], 13);
    VIEWS.competition = view;

    const mcdLayer = new GL_({ title: "McDonald's" });
    compLayer = new GL_({ title: 'Competitors' });
    saLayer   = new GL_({ title: 'Service Areas' });
    map.addMany([saLayer, mcdLayer, compLayer]);

    const mcds = [
      {name:"McDonald's — Chicago Loop",   lat:41.880, lng:-87.629},
      {name:"McDonald's — N Michigan Ave", lat:41.895, lng:-87.626},
      {name:"McDonald's — Wacker Dr",      lat:41.885, lng:-87.636},
    ];
    mcds.forEach(loc => {
      mcdLayer.add(new G_({
        geometry: { type: 'point', longitude: loc.lng, latitude: loc.lat },
        symbol: {
          type: 'simple-marker',
          color: [255,199,44,240], size: 18,
          outline: { color: [218,2,14], width: 3 },
        },
        popupTemplate: {
          title: loc.name,
          content: "McDonald's restaurant. Use 'Generate Service Areas' for catchment analysis.",
        },
      }));
    });

    COMPETITORS.forEach(c => {
      const [R,G,B] = BRAND_CLR[c.brand];
      compLayer.add(new G_({
        geometry: { type: 'point', longitude: c.lng, latitude: c.lat },
        symbol: {
          type: 'simple-marker',
          color: [R, G, B, 210], size: 13,
          outline: { color: [255,255,255,50], width: 1 },
        },
        popupTemplate: {
          title: c.name,
          content: 'Competitor. Use ArcGIS Places API for live location data.',
        },
      }));
    });

    const out = document.getElementById('compOut');
    out.innerHTML =
      '<div style="font-size:11px;color:var(--muted);margin-bottom:5px">' +
      mcds.length + " McDonald's &nbsp;\u00B7&nbsp; " + COMPETITORS.length + ' competitors shown</div>';
    const brands = {bk:'Burger King', wendys:"Wendy's", taco:'Taco Bell', chick:'Chick-fil-A'};
    const cnt = {};
    COMPETITORS.forEach(c => { cnt[c.brand] = (cnt[c.brand] || 0) + 1; });
    Object.entries(cnt).forEach(([b, n]) => {
      const [R,G,B] = BRAND_CLR[b];
      out.innerHTML +=
        '<div class="al ok" style="border-left-color:rgb(' + R + ',' + G + ',' + B + ')">' +
        '<div class="al-tx"><div class="al-ti">' + brands[b] + '</div>' +
        n + ' location' + (n > 1 ? 's' : '') + ' within 5-min drive</div></div>';
    });

    const srch = new Search_({ view, popupEnabled: false });
    view.ui.add(new Expand_({ view, content: srch, expandIcon: 'magnifying-glass' }), 'top-right');
  }

  window.findComp = function() {
    const q = document.getElementById('compQ').value.trim();
    if (!q) return;
    document.getElementById('compOut').innerHTML =
      '<div style="color:var(--muted);font-size:11px">Searching near "' + q + '"\u2026</div>' +
      '<div style="color:var(--orange);font-size:11px;margin-top:5px">\uD83D\uDD11 Live Places API query requires ArcGIS API key</div>';
  };

  window.drawCatchment = function() {
    if (!saLayer) return;
    saLayer.graphics.removeAll();
    const mins   = parseFloat(document.getElementById('dtMin').value);
    const radius = mins * 0.013;
    const mcds   = [{lat:41.880,lng:-87.629},{lat:41.895,lng:-87.626},{lat:41.885,lng:-87.636}];
    mcds.forEach(m => {
      const ring = [];
      for (let a = 0; a <= 360; a += 5) {
        const rad = a * Math.PI / 180;
        ring.push([m.lng + radius * 1.5 * Math.cos(rad), m.lat + radius * Math.sin(rad)]);
      }
      saLayer.add(new G_({
        geometry: { type: 'polygon', rings: [ring], spatialReference: { wkid: 4326 } },
        symbol: {
          type: 'simple-fill',
          color: [255,199,44,20],
          outline: { color: [255,199,44,130], width: 1.5 },
        },
      }));
    });
    document.getElementById('compOut').innerHTML =
      '<div style="color:var(--yellow);font-size:11px">\u2713 ' + mins +
      '-min service areas generated (buffer approximation)' +
      '<br><span style="color:var(--muted)">Use ArcGIS Route service for precise drive-time polygons (API key required)</span></div>';
  };

  /* ════════════════════════
     FRANCHISEE NETWORK
  ════════════════════════ */
  let franchLayer, franchPts;

  function initFranchise() {
    const { map, view } = mkView('franchise-map', [-96, 38], 4);
    VIEWS.franchise = view;
    franchLayer = new GL_({ title: 'Franchise Locations' });
    map.add(franchLayer);
    franchPts = genFranchPts();
    renderFranch(franchPts, 'all');

    document.querySelectorAll('#tierFilter .tog').forEach(btn => {
      btn.onclick = function() {
        document.querySelectorAll('#tierFilter .tog').forEach(b => b.classList.remove('on'));
        this.classList.add('on');
        renderFranch(franchPts, this.dataset.ti);
      };
    });
  }

  function genFranchPts() {
    const segs = [
      {lat:40.5,lng:-75.0,sp:3.0,n:35,reg:'northeast'},
      {lat:43.5,lng:-71.5,sp:2.0,n:20,reg:'northeast'},
      {lat:33.5,lng:-84.0,sp:3.0,n:30,reg:'southeast'},
      {lat:27.5,lng:-81.5,sp:2.5,n:22,reg:'southeast'},
      {lat:41.5,lng:-87.5,sp:3.5,n:40,reg:'midwest'},
      {lat:44.5,lng:-93.0,sp:3.0,n:20,reg:'midwest'},
      {lat:30.5,lng:-95.0,sp:4.0,n:38,reg:'south'},
      {lat:32.5,lng:-87.0,sp:3.0,n:20,reg:'south'},
      {lat:36.5,lng:-119.0,sp:3.5,n:35,reg:'west'},
      {lat:47.5,lng:-121.0,sp:2.0,n:15,reg:'west'},
      {lat:39.5,lng:-104.5,sp:2.5,n:18,reg:'west'},
    ];
    const pts = [];
    segs.forEach(s => {
      for (let i = 0; i < s.n; i++) {
        const rev = 0.8 + Math.random() * 2.2;
        pts.push({
          lat: s.lat + (Math.random() - .5) * s.sp,
          lng: s.lng + (Math.random() - .5) * s.sp * 1.5,
          rev,
          tier: rev > 2.2 ? 'high' : rev > 1.6 ? 'medium' : 'low',
          reg: s.reg,
        });
      }
    });
    return pts;
  }

  function renderFranch(pts, tier) {
    if (!franchLayer) return;
    franchLayer.graphics.removeAll();
    const clrs = { high:[34,197,94], medium:[255,199,44], low:[218,2,14] };
    pts.filter(p => tier === 'all' || p.tier === tier).forEach(p => {
      const [R,G,B] = clrs[p.tier];
      franchLayer.add(new G_({
        geometry: { type: 'point', longitude: p.lng, latitude: p.lat },
        symbol: {
          type: 'simple-marker',
          color: [R, G, B, 175],
          size: p.tier === 'high' ? 10 : p.tier === 'medium' ? 8 : 7,
          outline: { color: [255,255,255,30], width: .5 },
        },
        popupTemplate: {
          title: 'Franchise Location',
          content:
            '<b>Annual Revenue:</b> $' + p.rev.toFixed(2) + 'M' +
            '<br><b>Tier:</b> ' + p.tier.toUpperCase() +
            '<br><b>Region:</b> ' + p.reg,
        },
      }));
    });
  }

  window.filterFranch = function() {
    if (!franchPts) return;
    const tier = document.querySelector('#tierFilter .on')?.dataset.ti || 'all';
    renderFranch(franchPts, tier);
  };

  /* ════════════════════════
     PRICE GAP
  ════════════════════════ */
  let priceLayer;

  function initPrice() {
    const { map, view } = mkView('price-map', [-96, 38], 4);
    VIEWS.price = view;
    priceLayer = new GL_({ title: 'Big Mac Prices' });
    map.add(priceLayer);
    renderPrices(8.0);
    buildPriceTbl();

    const srch = new Search_({ view, popupEnabled: false, resultGraphicEnabled: true });
    view.ui.add(new Expand_({ view, content: srch, expandIcon: 'magnifying-glass' }), 'top-right');
  }

  function renderPrices(maxP) {
    if (!priceLayer) return;
    priceLayer.graphics.removeAll();
    CITIES.filter(c => c.price <= maxP).forEach(c => {
      const norm   = Math.max(0, Math.min(1, (c.price - 5.0) / (7.5 - 5.0)));
      const R      = Math.round(34  + norm * 184);
      const G      = Math.round(197 - norm * 197);
      const sz     = 16 + norm * 24;
      const diff   = c.price - AVG_P;
      const dStr   = (diff > 0 ? '+' : '') + diff.toFixed(2);
      const dClr   = diff > 0 ? '#DA020E' : '#22C55E';
      priceLayer.add(new G_({
        geometry: { type: 'point', longitude: c.lng, latitude: c.lat },
        symbol: {
          type: 'simple-marker',
          color: [Math.min(255, R + 20), Math.max(0, G), 14, 210],
          size: sz,
          outline: { color: [255,255,255,80], width: 1 },
        },
        popupTemplate: {
          title: c.city + ', ' + c.st,
          content:
            '<b>Big Mac Price:</b> $' + c.price.toFixed(2) +
            '<br><b>National Avg:</b> $' + AVG_P.toFixed(2) +
            '<br><b>Variance:</b> <span style="color:' + dClr + '">' + dStr + '</span>' +
            '<br><b>Trend:</b> ' + (c.price > AVG_P
              ? '\uD83D\uDCC8 Above avg — pushback risk'
              : '\uD83D\uDCC9 Below avg — value opportunity'),
        },
      }));
    });
  }

  function buildPriceTbl() {
    const tbody  = document.getElementById('priceTbl');
    const sorted = [...CITIES].sort((a, b) => b.price - a.price);
    sorted.forEach(c => {
      const d    = c.price - AVG_P;
      const clr  = d > 0 ? 'color:var(--red)' : 'color:var(--green)';
      const dstr = (d > 0 ? '+' : '') + d.toFixed(2);
      tbody.innerHTML +=
        '<tr><td>' + c.city + '</td><td><b>$' + c.price.toFixed(2) + '</b></td>' +
        '<td style="' + clr + '">' + dstr + '</td></tr>';
    });
  }

  window.updatePriceRange = function(v) {
    document.getElementById('priceRangeVal').textContent = '$' + parseFloat(v).toFixed(2);
    renderPrices(parseFloat(v));
  };

  window.geoPrice = function() {
    const q = document.getElementById('priceQ').value.trim();
    if (!q || !VIEWS.price) return;
    document.getElementById('priceQ').placeholder = 'Geocoding "' + q + '"\u2026 (API key required for live)';
    if (S.apiKey) {
      const srch = new Search_({ view: VIEWS.price });
      srch.search(q);
    }
  };

  /* ════════════════════════
     DRIVE-THRU AI
  ════════════════════════ */
  let dtLayer, dtSALayer;

  function initDriveTru() {
    const { map, view } = mkView('drivetru-map', [-87.63, 41.88], 12);
    VIEWS.drivetru = view;
    dtLayer   = new GL_({ title: 'Drive-Thru Locations' });
    dtSALayer = new GL_({ title: 'Service Areas' });
    map.addMany([dtSALayer, dtLayer]);

    DT_LOCS.forEach(loc => {
      const fast = loc.wait < 4;
      const slow = loc.wait > 6;
      const clr  = fast ? [34,197,94] : slow ? [218,2,14] : [255,199,44];
      dtLayer.add(new G_({
        geometry: { type: 'point', longitude: loc.lng, latitude: loc.lat },
        symbol: {
          type: 'simple-marker',
          color: [...clr, 220], size: 15,
          outline: { color: [255,255,255,90], width: 1.5 },
        },
        popupTemplate: {
          title: loc.name,
          content:
            '<b>Avg Wait:</b> ' + loc.wait + ' min ' + (loc.wait > 4 ? '\u26A0' : '\u2713') +
            '<br><b>Order Accuracy:</b> ' + loc.acc + '%' +
            '<br><b>AI Deployed:</b> ' + (loc.acc > 95 ? '\u2713 Yes' : 'Not yet'),
        },
      }));
    });

    const el = document.getElementById('aiRecs');
    AI_RECS.forEach(r => {
      const cls = r.prio === 'critical' ? 'cr' : r.prio === 'high' ? 'wn' : 'ok';
      const dc  = r.prio === 'critical' ? 'var(--red)' : r.prio === 'high' ? 'var(--orange)' : 'var(--green)';
      el.innerHTML +=
        '<div class="al ' + cls + '">' +
        '<div class="al-dot ' + (r.prio !== 'low' ? 'p' : '') + '" style="background:' + dc + '"></div>' +
        '<div class="al-tx"><div class="al-ti">' + r.icon + ' ' + r.title + '</div>' + r.txt + '</div></div>';
    });

    const srch = new Search_({ view, popupEnabled: false });
    view.ui.add(new Expand_({ view, content: srch, expandIcon: 'magnifying-glass' }), 'top-right');
  }

  window.findDT = function() {
    const q = document.getElementById('dtQ').value.trim();
    if (!q) return;
    document.getElementById('routeOut').innerHTML =
      '<span style="color:var(--muted)">Searching "' + q + '"\u2026 Use ArcGIS Geocoding for live search</span>';
    if (S.apiKey && VIEWS.drivetru) {
      const srch = new Search_({ view: VIEWS.drivetru });
      srch.search(q);
    }
  };

  window.runRoute = function() {
    document.getElementById('routeOut').innerHTML = S.apiKey
      ? '<span style="color:var(--yellow)">Calculating optimal drive-thru routes via ArcGIS Route service\u2026</span>'
      : '<span style="color:var(--orange)">\u26A0 ArcGIS Route service requires API key. Mock: Optimal egress route identified — 23% reduction in conflict zone.</span>';
  };

  window.drawServiceArea = function() {
    if (!dtSALayer || !VIEWS.drivetru) return;
    dtSALayer.graphics.removeAll();
    DT_LOCS.slice(0, 6).forEach(loc => {
      const radius = 0.02;
      const ring   = [];
      for (let a = 0; a <= 360; a += 6) {
        ring.push([
          loc.lng + radius * 1.5 * Math.cos(a * Math.PI / 180),
          loc.lat + radius * Math.sin(a * Math.PI / 180),
        ]);
      }
      dtSALayer.add(new G_({
        geometry: { type: 'polygon', rings: [ring], spatialReference: { wkid: 4326 } },
        symbol: {
          type: 'simple-fill',
          color: [255,199,44,18],
          outline: { color: [255,199,44,100], width: 1.5 },
        },
      }));
    });
    document.getElementById('routeOut').innerHTML =
      '<span style="color:var(--yellow)">\u2713 Drive-time service areas displayed' +
      '<br><span style="color:var(--muted)">Live drive-time polygons: ArcGIS Route API</span></span>';
  };

  /* ════════════════════════
     INIT REGISTRY & BOOTSTRAP
  ════════════════════════ */
  const INITS = {
    overview:    initOverview,
    supply:      initSupply,
    demo:        initDemo,
    competition: initCompetition,
    franchise:   initFranchise,
    price:       initPrice,
    drivetru:    initDriveTru,
  };

  function bootstrap() {
    document.querySelectorAll('.tab').forEach(b =>
      b.onclick = () => gotoTab(b.dataset.t));
    initOverview();
    S.initialized.overview = true;
    if (S.apiKey) {
      esriConfig.apiKey = S.apiKey;
      document.getElementById('apiDot').classList.add('on');
      document.getElementById('apiTxt').textContent = 'API Key Active';
      document.getElementById('modal-api').classList.remove('on');
    }
  }

  bootstrap();
});
