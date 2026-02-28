/* ════════════════════════════════════════════
   McDonald's Strategic Intelligence Platform
   Data — mock supply chain, pricing, demographic,
   competitive, and drive-thru datasets
════════════════════════════════════════════ */

/* ── Supply Chain ── */
const SUPPS = [
  { id:'tyson',    name:'Tyson Foods',          cat:'beef',     lat:36.18,  lng:-94.13,  ctry:'USA', risk:'low',    cap:85 },
  { id:'jbs',      name:'JBS USA',              cat:'beef',     lat:40.42,  lng:-104.71, ctry:'USA', risk:'medium', cap:72 },
  { id:'cargill',  name:'Cargill Beef',          cat:'beef',     lat:37.69,  lng:-97.34,  ctry:'USA', risk:'low',    cap:90 },
  { id:'osi',      name:'OSI Group',             cat:'beef',     lat:41.76,  lng:-88.32,  ctry:'USA', risk:'low',    cap:95 },
  { id:'aaco',     name:'Australian Agri. Co.',  cat:'beef',     lat:-27.47, lng:153.03,  ctry:'AUS', risk:'medium', cap:60 },
  { id:'marfrig',  name:'Marfrig Global Foods',  cat:'beef',     lat:-23.55, lng:-46.63,  ctry:'BRA', risk:'high',   cap:45 },
  { id:'lambw',    name:'Lamb Weston',            cat:'potato',   lat:43.69,  lng:-116.46, ctry:'USA', risk:'low',    cap:88 },
  { id:'mccain',   name:'McCain Foods',           cat:'potato',   lat:46.44,  lng:-67.61,  ctry:'CAN', risk:'low',    cap:76 },
  { id:'aviko',    name:'Aviko Potatoes',         cat:'potato',   lat:52.30,  lng:5.64,    ctry:'NLD', risk:'medium', cap:65 },
  { id:'simplot',  name:'J.R. Simplot',           cat:'potato',   lat:42.56,  lng:-114.46, ctry:'USA', risk:'low',    cap:82 },
  { id:'bimbo',    name:'Bimbo Bakeries',         cat:'bread',    lat:40.17,  lng:-75.34,  ctry:'USA', risk:'low',    cap:93 },
  { id:'cocacola', name:'Coca-Cola Co.',           cat:'beverage', lat:33.75,  lng:-84.39,  ctry:'USA', risk:'low',    cap:99 },
];
const DCS = [
  { id:'dc_w',  name:'Martin-Brower West',    lat:34.05,  lng:-118.24, region:'West' },
  { id:'dc_c',  name:'Martin-Brower Central', lat:41.88,  lng:-87.63,  region:'Central' },
  { id:'dc_e',  name:'Martin-Brower East',    lat:40.71,  lng:-74.01,  region:'East' },
  { id:'dc_s',  name:'Martin-Brower South',   lat:29.76,  lng:-95.37,  region:'South' },
  { id:'dc_eu', name:'European DC',           lat:52.37,  lng:4.90,    region:'Europe' },
  { id:'dc_ap', name:'APAC DC Singapore',     lat:1.35,   lng:103.82,  region:'APAC' },
  { id:'dc_au', name:'Australia DC Sydney',   lat:-33.87, lng:151.21,  region:'Australia' },
];
const ROUTES = [
  {f:'tyson',    t:'dc_c'}, {f:'tyson',    t:'dc_s'}, {f:'jbs',      t:'dc_w'},
  {f:'jbs',      t:'dc_c'}, {f:'cargill',  t:'dc_c'}, {f:'osi',       t:'dc_e'},
  {f:'aaco',     t:'dc_ap'},{f:'aaco',      t:'dc_au'},{f:'marfrig',   t:'dc_s'},
  {f:'marfrig',  t:'dc_e'}, {f:'lambw',    t:'dc_w'}, {f:'lambw',     t:'dc_c'},
  {f:'mccain',   t:'dc_e'}, {f:'mccain',   t:'dc_c'}, {f:'aviko',     t:'dc_eu'},
  {f:'simplot',  t:'dc_w'}, {f:'bimbo',    t:'dc_e'}, {f:'bimbo',     t:'dc_c'},
  {f:'cocacola', t:'dc_s'}, {f:'cocacola', t:'dc_w'}, {f:'cocacola',  t:'dc_e'},
  {f:'cocacola', t:'dc_c'},
];
const CAT_CLR = {
  beef:     [218,  2, 14],
  potato:   [255,199, 44],
  bread:    [139, 90, 43],
  beverage: [  0,168,255],
};

/* ── Price Gap ── */
const CITIES = [
  {city:'New York City', st:'NY', lat:40.71, lng:-74.01, price:7.49},
  {city:'San Francisco', st:'CA', lat:37.77, lng:-122.42,price:7.19},
  {city:'Seattle',       st:'WA', lat:47.61, lng:-122.33,price:6.99},
  {city:'Portland',      st:'OR', lat:45.52, lng:-122.68,price:6.69},
  {city:'Los Angeles',   st:'CA', lat:34.05, lng:-118.24,price:6.89},
  {city:'Boston',        st:'MA', lat:42.36, lng:-71.06, price:6.49},
  {city:'Miami',         st:'FL', lat:25.76, lng:-80.19, price:5.79},
  {city:'Chicago',       st:'IL', lat:41.88, lng:-87.63, price:5.89},
  {city:'Denver',        st:'CO', lat:39.74, lng:-104.99,price:5.69},
  {city:'Minneapolis',   st:'MN', lat:44.98, lng:-93.27, price:5.59},
  {city:'Nashville',     st:'TN', lat:36.16, lng:-86.78, price:5.29},
  {city:'Atlanta',       st:'GA', lat:33.75, lng:-84.39, price:5.39},
  {city:'Dallas',        st:'TX', lat:32.78, lng:-96.80, price:5.49},
  {city:'Phoenix',       st:'AZ', lat:33.45, lng:-112.07,price:5.29},
  {city:'Boise',         st:'ID', lat:43.62, lng:-116.20,price:5.19},
];
const AVG_P = CITIES.reduce((s, c) => s + c.price, 0) / CITIES.length;

/* ── Demographics ── */
const RISK_ZONES = [
  {name:'South Side Chicago', lat:41.75,  lng:-87.62,  inc:31200, dens:'high',   risk:'critical'},
  {name:'East Los Angeles',   lat:34.02,  lng:-118.16, inc:34500, dens:'high',   risk:'critical'},
  {name:'South Bronx, NY',    lat:40.81,  lng:-73.92,  inc:29800, dens:'high',   risk:'critical'},
  {name:'West Philadelphia',  lat:39.97,  lng:-75.20,  inc:32100, dens:'high',   risk:'high'},
  {name:'South Dallas',       lat:32.72,  lng:-96.82,  inc:35600, dens:'medium', risk:'high'},
  {name:'North Memphis',      lat:35.22,  lng:-90.05,  inc:28400, dens:'high',   risk:'critical'},
  {name:'East Baltimore',     lat:39.29,  lng:-76.59,  inc:33100, dens:'medium', risk:'high'},
  {name:'South Phoenix',      lat:33.39,  lng:-112.07, inc:36200, dens:'medium', risk:'medium'},
];

/* ── Competition ── */
const COMPETITORS = [
  {brand:'bk',    name:"Burger King — Chicago Loop",    lat:41.876, lng:-87.621},
  {brand:'wendys',name:"Wendy's — Chicago",             lat:41.884, lng:-87.638},
  {brand:'taco',  name:"Taco Bell — N Michigan",        lat:41.893, lng:-87.625},
  {brand:'chick', name:"Chick-fil-A — Chicago",         lat:41.870, lng:-87.630},
  {brand:'bk',    name:"Burger King — Chicago W Loop",  lat:41.882, lng:-87.645},
  {brand:'taco',  name:"Taco Bell — Wacker",            lat:41.887, lng:-87.632},
  {brand:'wendys',name:"Wendy's — State St",            lat:41.878, lng:-87.627},
];
const BRAND_CLR = {bk:[255,102,0],wendys:[205,43,43],taco:[124,60,186],chick:[221,166,0]};

/* ── Drive-Thru AI ── */
const DT_LOCS = [
  {id:1, name:'Chicago — The Loop',       lat:41.883, lng:-87.629, wait:8.3, acc:91.2},
  {id:2, name:'NYC — Midtown 42nd St',    lat:40.755, lng:-73.983, wait:6.1, acc:93.4},
  {id:3, name:'LA — West Hollywood',      lat:34.090, lng:-118.362,wait:5.3, acc:96.2},
  {id:4, name:'Dallas — South Lamar',     lat:32.723, lng:-96.817, wait:4.8, acc:94.7},
  {id:5, name:'Atlanta — Midtown',        lat:33.781, lng:-84.384, wait:4.0, acc:96.4},
  {id:6, name:'Miami — Wynwood',          lat:25.800, lng:-80.198, wait:5.9, acc:92.1},
  {id:7, name:'Seattle — Capitol Hill',   lat:47.619, lng:-122.319,wait:5.6, acc:93.8},
  {id:8, name:'Phoenix — Tempe',          lat:33.414, lng:-111.909,wait:4.3, acc:95.1},
  {id:9, name:"Chicago — O'Hare",         lat:41.972, lng:-87.780, wait:3.8, acc:97.2},
  {id:10,name:'Houston — Galleria',       lat:29.735, lng:-95.467, wait:4.5, acc:94.9},
  {id:11,name:'Denver — LoDo',            lat:39.752, lng:-104.999,wait:4.2, acc:95.6},
  {id:12,name:'Nashville — Broadway',     lat:36.162, lng:-86.779, wait:5.1, acc:93.0},
];
const AI_RECS = [
  {prio:'critical',icon:'🚨',title:'Loop Chicago — Peak Overload',   txt:'12–1pm queues avg 8.3 min. Add dedicated mobile order lane. Est. -2.1 min avg wait.'},
  {prio:'high',    icon:'⚠️',title:'Midtown NYC — Night Accuracy',   txt:'Order errors 3x higher after 10pm. Deploy AI camera verification on shift change.'},
  {prio:'high',    icon:'📍',title:'West Hollywood — Route Conflict', txt:'Drive-thru conflicts with delivery staging 3–5pm. Redesign egress lane with ArcGIS Route.'},
  {prio:'medium',  icon:'💡',title:'South Dallas — Understaffing',   txt:'GeoEnrichment: lunch population within 3mi up 12% YoY. Increase grill staff Tue–Thu.'},
  {prio:'low',     icon:'✅',title:'Atlanta Midtown — Best Practice', txt:'4-min avg wait, 96.4% accuracy. AI fully deployed. Model for SE region rollout.'},
];

/* ── Overview cards ── */
const OVERVIEW_DATA = [
  {tab:'supply',      num:'01', sev:'high',     ttl:'Supply Chain Disruption Risk',
   desc:'Volatile commodity prices, geopolitical risks, and climate events threaten 23% of supply routes globally. Beef from Brazil and Australia carry the highest risk flags.',
   impact:'3 active disruption alerts — potential 2-day stockout risk',
   sol:'Supply Chain Monitor: real-time route tracking, supplier risk scoring, disruption simulation with re-routing via ArcGIS Network Analysis'},
  {tab:'demo',        num:'02', sev:'critical',  ttl:'Losing Lower-Income Customers',
   desc:"Traffic from lower-income consumers dropped nearly double digits YoY. 42 million households earning under $45k live within 1 mile of a McDonald's and can no longer afford it.",
   impact:'$4.2B annual revenue at risk from customer segment erosion',
   sol:'ArcGIS GeoEnrichment: income-based demographic profiling, at-risk zone identification, Living Atlas census data overlays'},
  {tab:'competition', num:'03', sev:'critical',  ttl:'Value Perception &amp; Competition',
   desc:"McDonald's brand on affordability is breaking down. Competitors hold pricing while McDonald's raised costs +18% since 2020. Chick-fil-A satisfaction now leads in 23 states.",
   impact:'+18% price increase since 2020 — customer trust eroding',
   sol:'ArcGIS Places API: competitor density mapping, drive-time catchment analysis, value positioning competitive intelligence'},
  {tab:'franchise',   num:'04', sev:'high',     ttl:'Franchisee Tensions',
   desc:"41% of operators joined an advocacy group opposing corporate pricing strategy. A 'Franchisee Bill of Rights' has been adopted. When operators are unhappy, execution suffers.",
   impact:'Franchisee satisfaction down from 71% \u2192 59% in 2 years',
   sol:'ArcGIS Franchise Analytics: performance tier mapping, regional benchmarking, operator health scoring and correlation with customer metrics'},
  {tab:'price',       num:'05', sev:'medium',   ttl:'Menu Price Inconsistency',
   desc:'The same Big Mac ranges from $5.19 in Boise to $7.49 in New York — a $2.30 gap creating viral social media backlash and undermining national marketing campaigns.',
   impact:'Customer price trust at all-time low in 2025–2026 surveys',
   sol:'ArcGIS Geocoding + Cost-of-Living Enrichment: city-level price equity heatmaps, transparent benchmarking tool for operators'},
  {tab:'drivetru',    num:'06', sev:'medium',   ttl:'Drive-Thru Accuracy &amp; Speed',
   desc:"Average drive-thru wait is 5.4 min vs. 4 min target. Error rate of 5.8% causes churn — 1 in 17 orders is wrong. McDonald's is betting on AI cameras to fix this in 2026.",
   impact:'$600M estimated annual revenue lost to drive-thru friction',
   sol:'ArcGIS Route + Traffic: queue optimization, AI camera placement recommendations, traffic-aware staffing analysis'},
];
