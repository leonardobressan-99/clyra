/* ==========================================================================
   Clyra — front-end prototype. Everything here is simulated in the browser:
   no data leaves the page, no model is called. State persists in localStorage.
   ========================================================================== */
(() => {
'use strict';

/* ---------- Helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => Date.now();
const MIN = 60e3, HOUR = 36e5, DAY = 864e5;
const hex = (n = 6) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
const uid = (p) => `${p}_${hex(6)}`;
const num = (n) => Number(n).toLocaleString('en-GB');
const compact = (n) => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 1 : 1).replace(/\.0$/, '') + 'K' : String(n);
const pct = (v, d = 1) => (v * 100).toFixed(d) + '%';
const fmtBytes = (b) => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b >= 1024 ? Math.round(b / 1024) + ' KB' : b + ' B';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ago(ts) {
  const d = now() - ts;
  if (d < 45e3) return 'just now';
  if (d < HOUR) return Math.round(d / MIN) + 'm ago';
  if (d < DAY) return Math.round(d / HOUR) + 'h ago';
  if (d < 7 * DAY) return Math.round(d / DAY) + 'd ago';
  if (d < 30 * DAY) return Math.round(d / (7 * DAY)) + 'w ago';
  if (d < 365 * DAY) return Math.round(d / (30 * DAY)) + 'mo ago';
  return Math.round(d / (365 * DAY)) + 'y ago';
}
const clock = (ts) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const dateShort = (ts) => ago(ts);

/* Seeded random — deterministic previews and results */
function hashStr(s) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
function rng(seed) { let a = typeof seed === 'string' ? hashStr(seed) : seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const between = (r, a, b) => a + r() * (b - a);

/* ---------- Icons (24px, stroke) ---------- */
const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  db: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13"/><path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
  bolt: '<path d="M13 2.5 4.5 13.5h6.5l-1 8 8.5-11h-6.5z"/>',
  flask: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7.5 15h9"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16.5 6.5l3 3M14 9l2 2"/>',
  report: '<path d="M14 3H6.5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V7.5z"/><path d="M14 3v4.5h4.5M9 13h6M9 17h4"/>',
  chat: '<path d="M4 5h16v11H9.5L5 20z"/><path d="M8.5 9.5h7M8.5 12.5h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>',
  bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.7M12 17.3v.2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  out: '<path d="M7 17 17 7M8 7h9v9"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  upload: '<path d="M12 15.5V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 1 1 .9-8.9A6 6 0 0 1 19.4 11 3.8 3.8 0 0 1 18 18.5z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  spark: '<path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.7-4.4L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.7 4.4l1.3-1.9M20 20v-4.5h-4.5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  play: '<path d="M7.5 4.5v15l12-7.5z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
  folder: '<path d="M3 6.5a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  folderPlus: '<path d="M3 6.5a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M12 10.5v5M9.5 13h5"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 15h18M9 4v16"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
  compare: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M7 9h2M15 9h2M7 13h2M15 13h2"/>',
  more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.6 3.2 7.8 7.5 9 4.3-1.2 7.5-4.4 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9.5 9.5h5v5h-5zM9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>',
  plug: '<path d="M9 2.5V7M15 2.5V7M6.5 7h11v4a5.5 5.5 0 0 1-11 0zM12 16.5v5"/>',
  eye: '<path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="3"/>',
  wand: '<path d="m4 20 11-11M13.5 4.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8zM19 10.5l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  activity: '<path d="M3 12h4l3 7 4-14 3 7h4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.2"/>',
  alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.3v.2"/>',
  filter: '<path d="M3.5 5h17l-6.5 7.5V19l-4 1.5v-8z"/>',
  logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H3"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5M4 4v4.5h4.5"/>',
  sliders: '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  send: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20"/>',
  gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 17 4-5"/>',
  hash: '<path d="M5 9h15M4 15h15M10 3 8 21M16 3l-2 18"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/>',
};
const icon = (name, size = 16, sw = 1.7) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ---------- Toasts ---------- */
function toast(title, sub = '', opts = {}) {
  const root = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  const kind = opts.kind || 'info';
  el.innerHTML = `<span class="t-ico ${kind}">${icon(kind === 'ok' ? 'check' : kind === 'err' ? 'alert' : 'spark', 13, 2.2)}</span>
    <p><strong>${esc(title)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}${opts.action ? `<button class="t-act">${esc(opts.action.label)} →</button>` : ''}</p>
    <button aria-label="Dismiss">${icon('x', 14)}</button>`;
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
  el.querySelector('button[aria-label]').onclick = kill;
  if (opts.action) el.querySelector('.t-act').onclick = () => { opts.action.run(); kill(); };
  root.appendChild(el);
  while (root.children.length > 3) root.firstElementChild.remove();
  setTimeout(kill, opts.ms || 4200);
}

async function copyText(text, label = 'Copied to clipboard') {
  try { await navigator.clipboard.writeText(text); } catch (e) { /* clipboard may be blocked in previews */ }
  toast(label, text.length > 46 ? text.slice(0, 46) + '…' : text, { kind: 'ok', ms: 2200 });
}

/* ==========================================================================
   Data model, generators and seed workspace
   Demo customer: Northvale Screening Partnership, a (fictional) regional
   adult screening service in England covering ~2.1M eligible adults across
   breast, cervical and bowel programmes. Data lives in a PostgreSQL
   screening-records system, a Snowflake population register, a reminders
   platform API and a clinic-capacity lake on S3 (eu-west-2, London).
   All records are synthetic.
   ========================================================================== */

const BASES = [
  { id: 'clyra-2', note: 'default · frozen base · 1.2B' },
  { id: 'clyra-2-mini', note: 'fast · 0.3B · lower cost' },
  { id: 'clyra-2.1-preview', note: 'preview · best accuracy' },
];
const SECTORS = ['Healthcare', 'Insurance', 'Finance', 'Retail', 'SaaS', 'Energy', 'Real estate'];
const PROVIDERS = [
  { id: 'mistral', label: 'Mistral', model: 'Mistral Large', ico: 'M' },
  { id: 'anthropic', label: 'Anthropic', model: 'Claude', ico: 'A' },
  { id: 'openai', label: 'OpenAI', model: 'GPT', ico: 'O' },
  { id: 'google', label: 'Google', model: 'Gemini', ico: 'G' },
];
const DB_PROVIDERS = [
  { id: 'postgres', label: 'PostgreSQL', ico: 'PG', port: 5432 },
  { id: 'sqlserver', label: 'SQL Server', ico: 'MS', port: 1433 },
  { id: 'snowflake', label: 'Snowflake', ico: 'SF', port: 443 },
  { id: 'bigquery', label: 'BigQuery', ico: 'BQ', port: 443 },
  { id: 'databricks', label: 'Databricks', ico: 'DB', port: 443 },
  { id: 'supabase', label: 'Supabase', ico: 'SB', port: 6543 },
];
const CLOUD_PROVIDERS = [
  { id: 's3', label: 'Amazon S3', ico: 'S3', path: 's3://northvale-capacity/slots/2026/' },
  { id: 'gcs', label: 'Google Cloud Storage', ico: 'GS', path: 'gs://northvale-external/population/' },
  { id: 'drive', label: 'Google Drive', ico: 'GD', path: 'drive://Northvale Screening/Planning/Clinic sites/' },
];
const TEAM = {
  hannah: { name: 'Hannah Clarke', ini: 'HC', role: 'Head of Screening Analytics' },
  tom: { name: 'Tom Okafor', ini: 'TO', role: 'ML Engineer' },
  priya: { name: 'Priya Shah', ini: 'PS', role: 'Programme Manager, Cervical' },
  james: { name: 'Dr. James Whitfield', ini: 'JW', role: 'Clinical Lead' },
  sophie: { name: 'Sophie Bennett', ini: 'SB', role: 'Outreach Coordinator' },
};

const PEOPLE = [['Margaret', 'Hughes'], ['David', 'Thompson'], ['Susan', 'Evans'], ['Paul', 'Robinson'], ['Aisha', 'Begum'], ['Mark', 'Walker'], ['Joanne', 'Wright'], ['Tomasz', 'Nowak'], ['Fatima', 'Hussain'], ['Gareth', 'Jones'], ['Karen', 'Taylor'], ['Ian', 'Wood']];

// Region spellings are deliberately inconsistent in the raw invitations table ("Yorkshire & Humber", "N. West")
const REGIONS = 'North East|North West|Yorkshire|Midlands|East|London|South East|South West';
const REGIONS_RAW = `${Array(7).fill(REGIONS).join("|")}|Yorkshire & Humber|N. West`;
const POSTCODES = 'NE1|NE6|LS6|BD3|S2|M14|L8|B12|NG7|LE1|E13|BS5';
/* Column spec: "name:kind(args);..." */
const SPECS = {
  // Screening Records (PostgreSQL)
  invitations: `invitation_id:id(INV);patient_ref:uuid(pt);programme:cat(Breast|Cervical|Bowel);age:int(25-74);sex:cat(F|M);region:cat(${REGIONS_RAW});imd_decile:int(1-10);distance_to_clinic_km:float(0.3-38);prior_invites:int(0-8);prior_attended:int(0-8);months_since_last_screen:int(0-120);invite_channel:cat(Letter|App|SMS);reminder_sent:bool(0.62);appointment_type:cat(Pre-booked|Open);slot_weekday:cat(Mon|Tue|Wed|Thu|Fri|Sat);needs_interpreter:bool(0.06);invite_date:date;attended:bool(0.69)`,
  resultsFollowup: 'result_id:id(RES);patient_ref:uuid(pt);programme:cat(Breast|Cervical|Bowel);age:int(25-74);sex:cat(F|M);result:cat(Normal|Normal|Normal|Normal|Normal|Normal|Abnormal|Inadequate);result_date:date;followup_due:date;followup_done:bool(0.83)',
  // Population Register (Snowflake)
  patients: `patient_ref:uuid(pt);full_name:name;mobile:phone;age:int(25-74);sex:cat(F|M);postcode_area:cat(${POSTCODES});imd_decile:int(1-10);registered_practice:id(P);language:cat(English|English|English|English|Polish|Urdu|Bengali|Romanian|Somali)`,
  practiceLists: `practice_code:id(P);region:cat(${REGIONS});list_size:int(2400-31000);eligible_adults:int(900-14000);last_list_refresh:date;merged_into:cat(—|—|—|—|—|—|P-40812|P-51230)`,
  // Reminders Platform (API)
  reminders: 'message_id:id(MSG);recipient:nameAbbr;mobile:phone;channel:cat(SMS|App|Letter);programme:cat(Breast|Cervical|Bowel);sent_at:date;delivered:bool(0.94);opened:bool(0.58)',
  // Clinic Capacity (S3)
  clinicCapacity: `site_id:id(SITE);site_type:cat(Static clinic|Mobile unit);region:cat(${REGIONS});week:int(1-26);slots:int(120-1400);slots_used:int(80-1450);utilisation_pct:float(48-118)`,
  // Uploads
  imd: `postcode_area:cat(${POSTCODES});imd_decile:int(1-10);income_deprivation_pct:float(3-38);access_to_services_idx:float(0.1-1);digital_exclusion_pct:float(2-29);public_transport_mins:int(6-74)`,
  clinicSites: `site_id:id(SITE);site_type:cat(Static clinic|Mobile unit);region:cat(${REGIONS});opening_hours:cat(Weekdays|Weekdays + Sat|Extended evenings);step_free_access:bool(0.82);planned_from:date;weekly_slots:int(120-1400)`,
  // Built-in samples (generic)
  saas: 'customer_id:id(CUS);plan:cat(Starter|Team|Business|Enterprise);seats:int(1-240);tenure_months:int(1-72);mrr_gbp:float(15-7800);logins_30d:int(0-410);tickets_90d:int(0-18);nps:int(-40-90);last_active:date;churned:bool(0.14)',
  insurance: 'policy_no:id(POL);product:cat(Motor|Home|Contents|Life);annual_premium_gbp:float(300-4800);premium_change_pct:float(-5-22);channel:cat(Direct|Broker|Comparison site);no_claims_years:int(0-15);lapsed_90d:bool(0.11)',
  retail: 'txn_id:id(TX);store:cat(MAN-01|MAN-02|LDS-01|BRS-01);ts:date;items:int(1-24);category:cat(Clothing|Footwear|Grocery|Home);discount_pct:float(0-35);member:bool(0.46);basket_value_gbp:float(6-510)',
  energy: 'meter_id:id(MTR);ts:date;temp_c:float(-6-34);wind_mph:float(0-42);solar_wm2:int(0-860);bank_holiday:bool(0.03);load_mw:float(210-1480)',
  finance: 'application_id:id(APP);income_gbp:int(14000-240000);loan_gbp:int(1500-70000);term_months:cat(12|24|36|60);credit_score:int(320-999);employment_yrs:int(0-35);dti:float(0.02-0.68);region:cat(Scotland|Wales|North West|London|South East);default_12m:bool(0.07)',
  housing: 'listing_id:id(LST);city:cat(Manchester|Leeds|Bristol|Sheffield);sqft:int(380-4200);beds:int(1-6);year_built:int(1890-2024);walk_score:int(12-99);distance_station_km:float(0.1-18);price_gbp:float(140000-1600000)',
};
const SECTOR_SPEC = { Healthcare: 'invitations', Insurance: 'insurance', Finance: 'finance', Retail: 'retail', SaaS: 'saas', Energy: 'energy', 'Real estate': 'housing' };

function parseSpec(spec) {
  return spec.split(';').map((s) => {
    const [name, rest] = s.split(':');
    const m = rest.match(/^(\w+)(?:\((.*)\))?$/);
    return { name, kind: m[1], arg: m[2] || '' };
  });
}
function colType(c) {
  return { id: 'id', uuid: 'id', date: 'datetime', dob: 'datetime', cat: 'category', int: 'int', float: 'float', bool: 'bool' }[c.kind] || 'text';
}
function rangeOf(arg) { const m = arg.match(/^(-?[\d.]+)-(-?[\d.]+)$/); return m ? [parseFloat(m[1]), parseFloat(m[2])] : [0, 1]; }
const ukDate = (d) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
/* Screening realism: age and sex follow the programme; attendance follows deprivation, channel, reminders and history */
const PROG_RANGE = { Breast: [50, 71, 'F'], Cervical: [25, 64, 'F'], Bowel: [50, 74, null] };
function fixRow(o, r) {
  const pr = PROG_RANGE[o.programme];
  if (pr && o.age != null) { o.age = pr[0] + (Number(o.age) % (pr[1] - pr[0] + 1)); if (pr[2] && o.sex != null) o.sex = pr[2]; }
  if (o.prior_attended != null && o.prior_invites != null && Number(o.prior_attended) > Number(o.prior_invites)) o.prior_attended = o.prior_invites;
  if (o.attended != null && o.imd_decile != null) {
    let p = .69 + (Number(o.imd_decile) - 5.5) * .025;
    if (o.invite_channel === 'Letter') p -= .07;
    if (o.reminder_sent === 'true') p += .06;
    if (Number(o.prior_invites) > 0 && Number(o.prior_attended) < Number(o.prior_invites) / 2) p -= .12;
    if (o.programme === 'Cervical' && o.age < 35) p -= .08;
    o.attended = (r ? r() : .5) < clamp(p, .2, .95) ? 'true' : 'false';
  }
  return o;
}
const VIN_CH = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
function genValue(c, r, i) {
  switch (c.kind) {
    case 'id': return `${c.arg}-${10000 + Math.floor(r() * 89999)}`;
    case 'uuid': return `${c.arg}_${Math.floor(r() * 0xffffff).toString(16).padStart(6, '0')}`;
    case 'date': { const d = new Date(Date.UTC(2026, 0, 1) + Math.floor(r() * 280) * DAY); return ukDate(d); }
    case 'dob': { const d = new Date(Date.UTC(1934, 0, 1) + Math.floor(r() * 25500) * DAY); return ukDate(d); }
    case 'cat': return pick(r, c.arg.split('|'));
    case 'int': { const [a, b] = rangeOf(c.arg); return Math.round(between(r, a, b)); }
    case 'float': { const [a, b] = rangeOf(c.arg); return +between(r, a, b).toFixed(b > 100 ? 1 : 2); }
    case 'bool': return r() < parseFloat(c.arg || .5) ? 'true' : 'false';
    case 'text': return pick(r, (c.arg || 'text').split('|'));
    case 'vin': return Array.from({ length: 17 }, () => VIN_CH[Math.floor(r() * VIN_CH.length)]).join('');
    case 'email': { const p = PEOPLE[i % PEOPLE.length]; return `${p[0].toLowerCase()}.${p[1].toLowerCase()}@${pick(r, ['gmail.com', 'outlook.com', 'yahoo.co.uk', 'icloud.com'])}`; }
    case 'phone': return `07${Math.floor(between(r, 100, 999))} ${Math.floor(between(r, 100000, 999999))}`;
    case 'name': { const p = PEOPLE[i % PEOPLE.length]; return `${p[0]} ${p[1]}`; }
    case 'nameAbbr': { const p = PEOPLE[(i * 7) % PEOPLE.length]; return `${p[0][0]}. ${p[1]}`; }
    case 'nameUpper': { const p = PEOPLE[(i * 5) % PEOPLE.length]; return `${p[1].toUpperCase()}, ${p[0].toUpperCase()}`; }
    default: return pick(r, ['alpha', 'beta', 'gamma']);
  }
}
function datasetColumns(ds) {
  const cols = parseSpec(ds.spec);
  const r = rng(ds.id + ':profile');
  const out = cols.map((c, i) => {
    const type = colType(c);
    const rnd = type === 'id' ? 0 : r() < .35 ? +(r() * 9).toFixed(1) : r() < .5 ? +(r() * 1.2).toFixed(1) : 0;
    const missing = ds.missingMap ? (ds.missingMap[c.name] || 0) : rnd;
    const span = rangeOf(c.arg); const unique = type === 'id' ? ds.rows : type === 'bool' ? 2 : type === 'category' ? new Set(c.arg.split('|')).size : type === 'int' ? Math.min(ds.rows, span[1] - span[0] + 1) : type === 'float' ? Math.min(ds.rows, Math.round((span[1] - span[0]) * 100) || ds.rows) : type === 'datetime' ? Math.min(ds.rows, 280) : Math.round(ds.rows * between(r, .05, .9));
    return { ...c, type, missing, unique, isTarget: c.name === ds.target, sample: genValue(c, rng(ds.id + c.name), i) };
  });
  const fixed = fixRow(Object.fromEntries(out.map((c) => [c.name, c.sample])), rng(ds.id + ':sample'));
  out.forEach((c) => (c.sample = fixed[c.name]));
  return out;
}
function previewRows(ds, n = 8) {
  if (ds.preview) return ds.preview.slice(0, n);
  const cols = parseSpec(ds.spec);
  const r = rng(ds.id + ':rows');
  const prof = datasetColumns(ds);
  return Array.from({ length: n }, (_, i) => {
    const o = fixRow(Object.fromEntries(cols.map((c) => [c.name, genValue(c, r, i)])), r);
    return cols.map((c, j) => (prof[j].missing > 2 && r() < prof[j].missing / 30 ? null : o[c.name]));
  });
}
function numericCols(ds) { return datasetColumns(ds).filter((c) => ['int', 'float'].includes(c.type)); }
function inferTask(ds, target) {
  if (!target) return 'anomaly';
  const c = datasetColumns(ds).find((x) => x.name === target);
  if (!c) return 'classification';
  return ['bool', 'category'].includes(c.type) ? 'classification' : 'regression';
}
/* Representative fields for code samples & playground */
function sampleFields(ep, n = 3) {
  const d = ep && dsById(ep.datasets[0]);
  if (!d) return { programme: 'Bowel', age: 62, imd_decile: 3 };
  const cols = datasetColumns(d).filter((c) => c.name !== d.target && c.name !== ep.target && !['datetime', 'id'].includes(c.type));
  return Object.fromEntries(cols.slice(0, n).map((c) => [c.name, c.sample]));
}

/* ---------- Seed workspace ---------- */
function sampleDatasets() {
  const t = now();
  const s = (id, name, type, rows, ncols, bytes, sector, target, spec) => ({ id, name, type, rows, ncols, bytes, sector, folder: 'samples', target, spec: SPECS[spec], created: t - 60 * DAY, builtin: true });
  return [
    s('ds_churn', 'customer_churn.csv', 'CSV', 5000, 16, 449000, 'SaaS', 'churned', 'saas'),
    s('ds_ins', 'insurance_policies.csv', 'CSV', 21400, 18, 2510000, 'Insurance', 'lapsed_90d', 'insurance'),
    s('ds_retail', 'retail_transactions.csv', 'CSV', 48300, 14, 7020000, 'Retail', 'basket_value_gbp', 'retail'),
    s('ds_energy', 'energy_load_hourly.csv', 'CSV', 26280, 11, 1890000, 'Energy', 'load_mw', 'energy'),
    s('ds_loan', 'loan_applications.csv', 'CSV', 9870, 24, 1260000, 'Finance', 'default_12m', 'finance'),
    s('ds_house', 'housing_prices_uk.csv', 'CSV', 18420, 19, 2210000, 'Real estate', 'price_gbp', 'housing'),
  ];
}

const SIG = (names) => names.map((name, i) => ({ name, w: +[1, .78, .61, .47, .36, .24][i].toFixed(2) }));
function companyDatasets(t) {
  const d = (id, name, type, rows, ncols, bytes, folder, conn, target, spec, ageDays, extra = {}) => ({ id, name, type, rows, ncols, bytes, sector: 'Healthcare', folder, conn, target, spec: SPECS[spec], created: t - ageDays * DAY, ...extra });
  return [
    d('ds_inv', 'screening.invitations', 'TABLE', 1412860, 18, 268000000, 'conn_rec', 'conn_rec', 'attended', 'invitations', 38, {
      signals: ['prior_attended', 'imd_decile (IMD file)', 'invite_channel', 'opened (reminders)', 'age · programme', 'distance_to_clinic_km'],
      missingMap: { invite_channel: 4.2, months_since_last_screen: 2.6, distance_to_clinic_km: 0.8 },
      quality: [['warn', 'Found <b>1,184</b> duplicate invitations (same patient_ref, programme and invite_date) · kept the first'], ['warn', 'Normalised region spellings · “Yorkshire &amp; Humber” → Yorkshire, “N. West” → North West (3,912 rows)']],
    }),
    d('ds_res', 'screening.results_followup', 'TABLE', 486210, 9, 41200000, 'conn_rec', 'conn_rec', 'followup_done', 'resultsFollowup', 38, { signals: ['result', 'prior_attended (invitations)', 'opened (reminders)', 'imd_decile (register)', 'language (register)', 'distance_to_clinic_km (invitations)'], missingMap: {} }),
    d('ds_pat', 'REGISTER.PATIENTS', 'TABLE', 2104380, 9, 312000000, 'conn_reg', 'conn_reg', 'imd_decile', 'patients', 33, { missingMap: { mobile: 6.8, language: 1.4 } }),
    d('ds_lists', 'REGISTER.PRACTICE_LISTS', 'TABLE', 412, 6, 48000, 'conn_reg', 'conn_reg', 'eligible_adults', 'practiceLists', 33, { missingMap: {} }),
    d('ds_rem', 'reminder_events', 'JSON', 3861240, 8, 402000000, 'conn_rem', 'conn_rem', 'opened', 'reminders', 24, { missingMap: { mobile: 3.1 } }),
    d('ds_cap', 'clinic_capacity_2026_h2.parquet', 'PARQUET', 18420, 7, 2600000, 'conn_cap', 'conn_cap', 'utilisation_pct', 'clinicCapacity', 19, { signals: ['invitations due · next 6 weeks (invitations)', 'slots', 'site_type', 'region', 'attendance rate (invitations)', 'week'], missingMap: {} }),
    d('ds_imd', 'imd_by_postcode_area.csv', 'CSV', 2214, 6, 142000, 'uploads', undefined, 'imd_decile', 'imd', 9, { source: 'upload', missingMap: {} }),
    d('ds_sites', 'clinic_sites_2027.xlsx', 'XLSX', 64, 7, 86000, 'fld_sites', undefined, 'weekly_slots', 'clinicSites', 12, { source: 'upload', missingMap: { planned_from: 9.4 } }),
    d('ds_syn', 'synthetic_invitations_stress.csv', 'CSV', 500000, 18, 94100000, 'synthetic', undefined, 'attended', 'invitations', 1),
  ];
}

function freshState() {
  return {
    v: 8,
    theme: 'light',
    user: { name: 'Hannah Clarke', first: 'Hannah', email: 'hannah.clarke@northvale-screening.example', initials: 'HC', role: 'Head of Screening Analytics' },
    workspace: { name: 'Northvale Screening Partnership', short: 'NS', plan: 'Enterprise', region: 'eu-west-2', regionName: 'London', ukGdpr: true, deployment: 'Dedicated, in customer’s cloud tenancy' },
    usage: { used: 0, limit: 1000 },
    ui: { onboardOpen: true, openStep: null, dataView: 'list', folder: 'all', typeFilter: 'all', q: '', selected: [], wsNavOpen: true, reportFilter: { ep: 'all', op: 'all', pinned: false }, reportSel: [], chatId: null, chatEndpoint: null, chatProvider: null },
    folders: [{ id: 'samples', name: 'Sample data', builtin: true }, { id: 'uploads', name: 'Uploads' }, { id: 'synthetic', name: 'Synthetic' }],
    connections: [],
    datasets: sampleDatasets(),
    runs: [],
    endpoints: [],
    keys: [],
    reports: [],
    llm: [],
    conversations: [],
    notifications: [{ id: uid('n'), ts: now() - 2 * MIN, title: 'Welcome to Clyra', sub: 'Connect a table to get started', read: false, route: 'data' }],
    activity: [{ ts: now() - 2 * MIN, who: 'HC', text: 'created workspace <b>Northvale Screening Partnership</b>' }],
    flags: { chatted: false },
    qr: { datasets: [], base: 'clyra-2', target: 'auto', targetCol: '', task: 'auto', lastRunId: null },
    wiz: null,
  };
}
const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
function demoState() {
  const s = freshState();
  S = s; // generators below read from the live state
  const t = now();
  s.ui.onboardOpen = false;
  s.usage.used = 412.4;
  s.connections = [
    { id: 'conn_rec', name: 'Screening Records', short: 'Screening Records', kind: 'postgres', type: 'Database', host: 'screening-records.northvale.internal:5432', status: 'connected', synced: true, lastSync: t - 38 * MIN, tables: 2 },
    { id: 'conn_reg', name: 'Population Register', short: 'Population Register', kind: 'snowflake', type: 'Database', host: 'northvale.eu-west-2.snowflakecomputing.com', status: 'connected', synced: true, lastSync: t - 2 * HOUR, tables: 2 },
    { id: 'conn_rem', name: 'Reminders Platform', short: 'Reminders', kind: 'api', type: 'API', host: 'api.reminders.northvale-screening.example/v2/events', status: 'connected', synced: true, lastSync: t - 11 * MIN, tables: 1 },
    { id: 'conn_cap', name: 'Clinic Capacity', short: 'Clinic Capacity', kind: 's3', type: 'Cloud', host: 's3://northvale-capacity/slots/2026/ · eu-west-2', status: 'syncing', syncUntil: t + 7000, lastSync: t - 6 * HOUR, tables: 1 },
  ];
  s.folders.push({ id: 'fld_sites', name: 'Clinic sites 2027' }, ...s.connections.map((c) => ({ id: c.id, name: c.name, conn: true })));
  s.datasets.push(...companyDatasets(t));

  const mk = (o, ageDays, story) => {
    const run = makeRun(o);
    finishRun(run, t - ageDays * DAY, true);
    const ds = dsById(o.datasets[0]);
    if (ds && ds.signals) run.result.signals = SIG(ds.signals);
    if (o.signals) run.result.signals = SIG(o.signals);
    if (story) run.story = story;
    run.by = o.by;
    return run;
  };

  /* ---- Workspace runs ---- */
  const nonatt = mk({ mode: 'workspace', name: 'Screening non-attendance risk', datasets: ['ds_inv', 'ds_pat', 'ds_rem', 'ds_imd'], base: 'clyra-2', target: 'pick', targetCol: 'attended', task: 'classification', holdout: 20, split: 'time', seed: 11, by: 'SB' }, 24, {
    q: 'Which invitees due in the next 14 days are least likely to attend?',
    alert: { title: '2,960 invitees at high risk of not attending', sub: 'due in the next 14 days · outreach queue' },
    title: 'Highest non-attendance risk · invitations due in the next 14 days',
    intro: 'I scored the <b>18,420</b> invitations due in the next 14 days. <b>2,960</b> are above the 40% risk threshold, and 58% of them are in IMD deciles 1–3 with letter-only invites.',
    head: ['Patient ref', 'Programme · age', 'Risk', 'Main drivers', 'Confidence'],
    rows: [['pt_3f9a1c', 'Cervical · 27', '71%', 'Letter only · IMD decile 1 · did not attend last 2 invites', '91%'], ['pt_b20e47', 'Bowel · 58', '64%', 'No reminder delivered · 31 km to clinic · first invite', '88%'], ['pt_7d1c03', 'Breast · 53', '59%', 'Needs interpreter (Somali) · open slot only · IMD decile 2', '90%'], ['pt_e5a912', 'Cervical · 31', '54%', 'Changed practice in Q3 · SMS bounced · no Saturday slot', '86%'], ['pt_4c6f88', 'Bowel · 66', '47%', 'Prior non-attendance · letter only · IMD decile 3', '84%']],
    note: 'Suggested action: send an SMS reminder and offer an alternative slot to the 2,960 high-risk invitees. The score is a signal for outreach, not a clinical decision.',
    chartQ: 'How has predicted attendance changed by IMD band over the last 12 months?',
    chart: {
      kind: 'line', title: 'Predicted attendance by IMD band', sub: 'Share of invitees predicted to attend · monthly', unit: '%', range: 12, ranges: [6, 12], x: MONTHS,
      series: [
        { name: 'IMD deciles 1–3', values: [57.8, 58.1, 57.4, 58.0, 58.6, 57.9, 58.3, 61.9, 62.8, 63.4, 63.1, 63.7] },
        { name: 'IMD deciles 4–7', values: [68.9, 69.2, 68.7, 69.0, 69.4, 68.8, 69.1, 70.6, 71.2, 71.5, 71.3, 71.8] },
        { name: 'IMD deciles 8–10', values: [77.1, 77.4, 76.9, 77.3, 77.6, 77.0, 77.2, 77.9, 78.3, 78.1, 78.4, 78.6] },
      ],
      marker: { i: 7, label: 'SMS reminders introduced' },
      source: 'non-attendance-risk · v3 · 214,600 invitations',
    },
    chartIntro: 'The gap between areas is the story. Predicted attendance in <b>IMD deciles 1–3</b> sat around 58% until <b>June</b>, rose to <b>61.9%</b> the month SMS reminders were introduced, and is now <b>63.7%</b>. Deciles 8–10 barely moved (77% to 79%), so reminders are narrowing the gap rather than lifting everyone equally.',
    chartNote: 'Hover the lines for monthly values or switch a band off in the legend. The recent rise in App invites is the invite_channel drift flagged on this endpoint, so it is worth a refresh before the next invitation round.',
  });
  const anomaly = mk({ mode: 'workspace', name: 'Invitation record anomalies', datasets: ['ds_inv', 'ds_pat', 'ds_res', 'ds_lists'], base: 'clyra-2', target: 'none', task: 'anomaly', holdout: 20, split: 'grouped', seed: 3, by: 'TO', signals: ['duplicate invitation within 30 days', 'age outside programme range (register)', 'screened in the last 12 months (results)', 'practice code not on register (lists)', 'region spelling vs practice region', 'invite to a merged practice list'] }, 16, {
    q: 'Which invitations should be held before dispatch?',
    alert: { title: '412 invitations flagged before dispatch', sub: 'score above 0.85 · next dispatch run' },
    title: 'Queued invitations above the 0.85 anomaly threshold',
    intro: 'Out of <b>38,600</b> invitations queued for the next dispatch run, <b>412</b> score above 0.85. No labels were used: the score is learned from how normal invitations, register entries and results look.',
    head: ['Invitation', 'Programme · age', 'Score', 'Why flagged', 'Action'],
    rows: [['INV-58213', 'Bowel · 47', '0.97', 'Age outside programme range · duplicate of INV-58141', 'Hold'], ['INV-60471', 'Breast · 64', '0.93', 'Breast screen completed 5 months ago', 'Hold'], ['INV-59902', 'Cervical · 41', '0.91', 'Duplicate invitation within 9 days · same slot', 'Hold'], ['INV-61138', 'Bowel · 69', '0.88', 'Practice code not on the current register', 'Review'], ['INV-60015', 'Breast · 57', '0.86', 'Region recorded as “N. West”, practice is in the Midlands', 'Review']],
    note: 'Last round, 301 of the 340 highest-scored invitations had a real data error, an 89% hit rate versus 31% for the existing rule checks.',
    explainId: 'INV-58213', explainScore: '0.97', explainScope: 'invitations queued for dispatch',
    explain: ['<b>Age 47</b> is outside the Bowel programme range (50–74), found by linking to the population register through name variants and postcode area.', '<b>Duplicate invitation</b>: the same person was invited to Bowel screening as INV-58141 on 02/10/2026, 9 days earlier.', '<b>Registered practice P-40812</b> was merged into another practice list in Q2, so the invite was generated from an old list.', 'Region recorded as <b>“Yorkshire &amp; Humber”</b> while the registered practice sits in the North East.', '<b>No reminder history</b> on the reminders platform for this person in the last 24 months.'],
    explainLink: 'None of these tables share a key with the invitation: register entries, practice lists and reminder events were linked by Clyra through name variants, postcode areas and dates.',
    explainRec: 'Recommendation: hold flagged invitations for data team review before dispatch. The score is a signal for review, not a clinical decision.',
    chartQ: 'Chart the flagged invitations by region',
    chart: {
      kind: 'bar', title: 'Flagged invitations by region', sub: 'Anomaly score > 0.85 · invitations queued for dispatch', unit: '',
      x: ['North West', 'Yorkshire', 'Midlands', 'London', 'North East', 'Other (3 regions)'],
      series: [{ name: 'Flagged invitations', values: [96, 88, 74, 61, 47, 46] }],
      meta: ['2.1× expected · duplicates after list merge', '1.9× expected · region spellings', 'mostly age outside range', 'recent screen on file', 'practice codes not on register', 'spread out'],
      source: 'invitation-anomaly-score · v2 · 38,600 queued invitations',
    },
    chartIntro: 'Flags are concentrated in the north: <b>North West and Yorkshire account for 184 of the 412</b>. North West has about twice what its invitation volume would predict, mostly duplicates created when GP practice lists were merged.',
    chartNote: 'Hover a bar for the main reason. This looks like a list-merge and spelling issue at region level, not a problem with individual records.',
  });
  // Align the held-out flag rate with the dispatch queue story (412 of 38,600 ≈ 1.07%)
  anomaly.result.metrics.list = anomaly.result.metrics.list.map(([k, v]) => [k, k === 'Flagged' ? Math.round(anomaly.result.heldout * .0107) : k === 'Contamination' ? .0107 : v]);
  const cap = mk({ mode: 'workspace', name: 'Clinic and mobile unit capacity · 6 weeks', datasets: ['ds_cap', 'ds_inv', 'ds_sites'], base: 'clyra-2', target: 'pick', targetCol: 'utilisation_pct', task: 'regression', holdout: 20, split: 'time', seed: 21, by: 'PS' }, 10, {
    q: 'Where will clinic capacity be tightest over the next 6 weeks?',
    alert: { title: 'Yorkshire mobile units forecast at 112% in week 3', sub: 'breast screening · 340 slots short' },
    title: 'Forecast slot utilisation · next 6 weeks',
    intro: 'Forecast for 64 static clinics and mobile units, using invitations due, historical attendance, available slots and the 2027 site plan.',
    head: ['Region · site type', 'Peak week', 'Forecast utilisation', '90% interval', 'Slots short'],
    rows: [['Yorkshire · Mobile units', 'Week 3', '112%', '104% to 121%', '340'], ['North West · Static clinics', 'Week 4', '97%', '91% to 103%', '0'], ['Midlands · Mobile units', 'Week 3', '94%', '87% to 101%', '0'], ['London · Static clinics', 'Week 5', '88%', '82% to 94%', '0']],
    note: 'Yorkshire mobile units go over capacity from week 2 and peak at 112% in week 3. Adding one mobile-unit day per week, or moving 340 breast screening invitations to nearby static clinics, keeps them under 100%.',
    chartQ: 'Chart slot utilisation by region over the next 6 weeks',
    chart: {
      kind: 'line', title: 'Forecast slot utilisation by region', sub: 'Median forecast · weekly · % of available slots', unit: '%',
      x: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6'],
      series: [
        { name: 'Yorkshire · mobile', values: [94, 103, 112, 108, 99, 93] },
        { name: 'North West · static', values: [86, 91, 95, 97, 92, 88] },
        { name: 'Midlands · mobile', values: [82, 89, 94, 91, 86, 83] },
      ],
      marker: { i: 2, label: 'Over capacity' },
      source: 'capacity-forecast-6w · v1 · 64 sites',
    },
    chartIntro: 'Only <b>Yorkshire mobile units</b> are forecast to go over capacity: 103% in week 2, peaking at <b>112% in week 3</b>. North West static clinics get close (97% in week 4) but stay under.',
    chartNote: 'Hover for weekly values. London and the other regions are left out because they stay under 90%.',
  });
  const fol = mk({ mode: 'workspace', name: 'Missed follow-up after abnormal result', datasets: ['ds_res', 'ds_pat', 'ds_rem'], base: 'clyra-2-mini', target: 'pick', targetCol: 'followup_done', task: 'classification', holdout: 15, split: 'grouped', seed: 5, by: 'JW' }, 7, {
    q: 'Who risks not completing follow-up after an abnormal result?',
    title: 'Highest risk of missed follow-up · results in the last 60 days',
    intro: '<b>1,240</b> people with an abnormal or inadequate result in the last 60 days were scored. <b>186</b> are above the 30% risk threshold for not completing follow-up within the target window.',
    head: ['Patient ref', 'Programme · result', 'Risk', 'Pattern', 'Days since result'],
    rows: [['pt_91c2d0', 'Bowel · Abnormal', '62%', '2 letters unanswered · no mobile number on file', '41'], ['pt_0a7e55', 'Cervical · Inadequate', '55%', 'Repeat test not booked · changed practice', '38'], ['pt_c4b913', 'Breast · Abnormal', '48%', 'Assessment slot declined · needs interpreter (Urdu)', '12'], ['pt_5e2f70', 'Bowel · Abnormal', '44%', 'IMD decile 1 · 34 km to follow-up site', '27'], ['pt_d81a36', 'Cervical · Abnormal', '41%', 'SMS delivered, not opened · prior non-attendance', '19']],
    note: 'This endpoint is paused until the clinical safety officer signs off. Scores are visible to the analytics team only and are a prompt for outreach, not a clinical decision.',
  });
  const reminder = mk({ mode: 'workspace', name: 'Reminder response by channel', datasets: ['ds_rem', 'ds_pat', 'ds_imd'], base: 'clyra-2', target: 'pick', targetCol: 'opened', task: 'classification', holdout: 20, split: 'time', seed: 8, by: 'SB', signals: ['channel', 'sent_at · hour of day', 'language (register)', 'imd_decile (IMD file)', 'delivered', 'programme'] }, 2);

  // Cancelled run
  const merge = makeRun({ mode: 'workspace', name: 'GP practice list merge · Q3', datasets: ['ds_lists', 'ds_pat'], base: 'clyra-2', target: 'auto', task: 'auto', holdout: 20, split: 'random', seed: 42 });
  merge.status = 'failed'; merge.progress = 41; merge.created = t - 3 * DAY; merge.finished = merge.created + 9000; merge.by = 'TO';
  merge.logs = planLogs(merge).slice(0, 6).map((l, i) => ({ ...l, ts: merge.created + i * 900 }));
  merge.logs.push({ lv: 'warn', msg: 'Cancelled by Tom Okafor · practice list export still has merged header rows', ts: merge.finished });

  // Running run, completes live while the demo is open
  const live = makeRun({ mode: 'workspace', name: 'Cervical non-attendance · 25–34', datasets: ['ds_inv', 'ds_pat', 'ds_rem'], base: 'clyra-2.1-preview', target: 'pick', targetCol: 'attended', task: 'classification', holdout: 20, split: 'time', seed: 27 });
  live.progress = 28; live.speed = 0.42; live.by = 'PS'; live.created = t - 40e3;
  const lp = planLogs(live); live.logs = lp.slice(0, Math.floor(lp.length * .28) + 1).map((l, i) => ({ ...l, ts: live.created + i * 2500 })); live.stage = live.logs[live.logs.length - 1].stage;
  live.result.signals = SIG(['age · 25–34', 'invite_channel', 'prior_attended', 'opened (reminders)', 'slot_weekday', 'imd_decile (IMD file)']);

  // Quick runs
  const q1 = mk({ mode: 'quick', name: 'Quick run · screening.invitations', datasets: ['ds_inv'], base: 'clyra-2', target: 'auto', task: 'auto', by: 'TO' }, 18);
  const q2 = mk({ mode: 'quick', name: 'Quick run · imd_by_postcode_area', datasets: ['ds_imd'], base: 'clyra-2-mini', target: 'auto', task: 'auto', by: 'SB' }, 8);
  const q3 = mk({ mode: 'quick', name: 'Quick run · synthetic stress test', datasets: ['ds_syn', 'ds_pat'], base: 'clyra-2', target: 'auto', task: 'auto', by: 'TO' }, 1);
  s.runs = [live, reminder, q3, merge, fol, q2, cap, anomaly, q1, nonatt];

  /* ---- Endpoints ---- */
  const daytime = [120, 80, 60, 50, 70, 260, 1180, 3910, 5620, 6410, 6180, 5700, 5320, 5980, 6220, 6050, 5410, 3610, 1720, 940, 610, 420, 310, 190];
  const invites = [310, 210, 180, 160, 240, 520, 980, 1840, 2920, 4310, 5880, 7420, 8160, 8890, 8420, 7310, 5980, 3920, 2240, 1310, 880, 640, 480, 390];
  const hourly = [910, 890, 870, 860, 880, 930, 1010, 1080, 1120, 1160, 1190, 1210, 1200, 1180, 1190, 1210, 1230, 1220, 1170, 1110, 1060, 1010, 970, 930];
  const ep = (run, name, o) => { const e = makeEndpoint(run, name); Object.assign(e, o); return e; };
  const eNon = ep(nonatt, 'non-attendance-risk', { created: t - 23 * DAY, requests: 2184330, version: 3, base: 'clyra-2.1-preview', p50: 38, p95: 104, traffic: invites, drift: { col: 'invite_channel', delta: 'App +9 pts' } });
  const eCap = ep(cap, 'capacity-forecast-6w', { created: t - 9 * DAY, requests: 175220, p50: 46, p95: 131, traffic: hourly });
  const eFol = ep(fol, 'followup-risk', { created: t - 6 * DAY, requests: 41980, status: 'paused', p50: 22, p95: 58, traffic: Array(24).fill(0) });
  const eAno = ep(anomaly, 'invitation-anomaly-score', { created: t - 15 * DAY, requests: 688410, version: 2, p50: 33, p95: 91, traffic: daytime });
  s.endpoints = [eNon, eCap, eFol, eAno];

  /* ---- Reports (trust ledger) ---- */
  const rep = (e, run, op, v, delta, ageDays, base, pinned = false) => { const r = makeReport(e, run, op, v, delta); r.created = t - ageDays * DAY; r.base = base; r.pinned = pinned; return r; };
  const reps = [
    rep(eNon, nonatt, 'upgrade', 3, .015, 3, 'clyra-2.1-preview', true),
    rep(eAno, anomaly, 'refresh', 2, .009, 1, 'clyra-2'),
    rep(eCap, cap, 'create', 1, 0, 9, 'clyra-2', true),
    rep(eNon, nonatt, 'refresh', 2, .006, 12, 'clyra-2'),
    rep(eFol, fol, 'create', 1, 0, 6, 'clyra-2-mini'),
    rep(eAno, anomaly, 'create', 1, 0, 15, 'clyra-2'),
    rep(eNon, nonatt, 'create', 1, 0, 23, 'clyra-2'),
  ];
  s.reports = reps;
  eNon.metric = reps[0].metrics.primary; eAno.metric = reps[1].metrics.primary;

  /* ---- Developers ---- */
  s.keys = [
    { id: uid('key'), name: 'reminders-platform-integration', scope: 'inference', exp: 'never', prefix: 'cly_live_7f3a', created: t - 14 * DAY, lastUsed: t - 1 * MIN },
    { id: uid('key'), name: 'analytics-notebooks', scope: 'read', exp: '90 days', prefix: 'cly_live_c41e', created: t - 20 * DAY, lastUsed: t - 3 * HOUR },
    { id: uid('key'), name: 'ci-deploy', scope: 'admin', exp: '30 days', prefix: 'cly_live_09bd', created: t - 23 * DAY, lastUsed: t - 2 * DAY },
  ];
  s.llm = [{ provider: 'mistral', masked: 'mst_k8…7c1e', ts: t - 21 * DAY }];
  s.flags.chatted = true;

  s.conversations = [
    seedConversation(eNon, 'How has predicted attendance changed by IMD band over the last 12 months?', t - 2 * HOUR),
    seedConversation(eAno, 'Why was INV-58213 flagged?', t - 5 * HOUR),
    seedConversation(eCap, 'Chart slot utilisation by region over the next 6 weeks', t - 9 * HOUR),
    seedConversation(eAno, 'Chart the flagged invitations by region', t - 2 * DAY),
    seedConversation(eNon, 'Which invitees due in the next 14 days are least likely to attend?', t - 26 * HOUR),
    seedConversation(eCap, 'Where will clinic capacity be tightest over the next 6 weeks?', t - 3 * DAY),
    seedConversation(eNon, 'What can you tell me about my data?', t - 6 * DAY),
    seedConversation(eAno, 'How accurate is the invitation anomaly score?', t - 9 * DAY),
  ];

  s.notifications = [
    { id: uid('n'), ts: t - 35 * MIN, title: 'Data drift detected', sub: 'non-attendance-risk · invite_channel mix shifted, App +9 pts. Consider a refresh', read: false, route: 'endpoints' },
    { id: uid('n'), ts: t - 1 * DAY, title: 'Endpoint refreshed', sub: 'invitation-anomaly-score → v2 · +0.9 pts', read: false, route: 'reports' },
    { id: uid('n'), ts: t - 1 * DAY - 3 * HOUR, title: 'API key expires in 7 days', sub: 'ci-deploy · admin scope', read: false, route: 'api' },
    { id: uid('n'), ts: t - 3 * DAY, title: 'Upgrade complete', sub: 'non-attendance-risk → v3 on clyra-2.1-preview · +1.5 pts', read: true, route: 'reports' },
    { id: uid('n'), ts: t - 3 * DAY - HOUR, title: 'Run cancelled', sub: 'GP practice list merge · Q3', read: true, route: 'run/' + merge.id },
  ];
  s.activity = [
    { ts: t - 40e3, who: 'PS', text: 'started run <b>Cervical non-attendance · 25–34</b> on <span class="mono">clyra-2.1-preview</span>' },
    { ts: t - 35 * MIN, who: 'TO', text: 'acknowledged drift alert on <b>non-attendance-risk</b>' },
    { ts: t - 2 * HOUR, who: 'SB', text: 'asked Chat how predicted attendance changed by IMD band' },
    { ts: t - 5 * HOUR, who: 'TO', text: 'asked Chat why <b>INV-58213</b> was flagged' },
    { ts: t - 1 * DAY, who: 'TO', text: 'refreshed <b>invitation-anomaly-score</b> to <span class="mono">v2</span>' },
    { ts: t - 1 * DAY - 2 * HOUR, who: 'TO', text: 'generated <b>synthetic_invitations_stress.csv</b> · 500,000 rows' },
    { ts: t - 2 * DAY, who: 'SB', text: 'completed run <b>Reminder response by channel</b>' },
    { ts: t - 3 * DAY, who: 'HC', text: 'upgraded <b>non-attendance-risk</b> to <span class="mono">clyra-2.1-preview</span> · v3' },
    { ts: t - 3 * DAY - HOUR, who: 'TO', text: 'cancelled <b>GP practice list merge · Q3</b>' },
    { ts: t - 6 * DAY, who: 'JW', text: 'paused <b>followup-risk</b> pending clinical safety sign-off' },
    { ts: t - 9 * DAY, who: 'SB', text: 'uploaded <b>imd_by_postcode_area.csv</b>' },
    { ts: t - 9 * DAY, who: 'PS', text: 'created endpoint <b>capacity-forecast-6w</b>' },
    { ts: t - 15 * DAY, who: 'TO', text: 'created endpoint <b>invitation-anomaly-score</b>' },
    { ts: t - 24 * DAY, who: 'HC', text: 'connected <b>Reminders Platform</b> · reminder_events' },
    { ts: t - 33 * DAY, who: 'TO', text: 'connected <b>Population Register</b> · 2 tables' },
    { ts: t - 38 * DAY, who: 'HC', text: 'connected <b>Screening Records</b> · 2 tables' },
  ];
  return s;
}

/* ---------- Persistence ---------- */
const STORE_KEY = 'clyra-proto-v8';
let S;
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const p = JSON.parse(raw); if (p && p.v === 8) return p; } } catch (e) { /* storage unavailable */ }
  return demoState();
}
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }, 150);
}

const dsById = (id) => S.datasets.find((d) => d.id === id);
const runById = (id) => S.runs.find((r) => r.id === id);
const epById = (id) => S.endpoints.find((e) => e.id === id);
const repById = (id) => S.reports.find((r) => r.id === id);
const connById = (id) => S.connections.find((c) => c.id === id);
const memberName = (ini) => (Object.values(TEAM).find((m) => m.ini === ini) || {}).name || ini;

function logActivity(text) {
  // runtime entries are written as "Thing happened" — lower-case the first word to follow the actor
  S.activity.unshift({ ts: now(), who: S.user.initials, text: text.charAt(0).toLowerCase() + text.slice(1) });
  S.activity = S.activity.slice(0, 40);
}
function notify(title, sub, route) { S.notifications.unshift({ id: uid('n'), ts: now(), title, sub, read: false, route }); S.notifications = S.notifications.slice(0, 30); }

/* ---------- Runs: plan + result ---------- */
const STAGES = {
  quick: ['Load tables', 'Profile', 'Key-less mapping', 'In-context predict'],
  workspace: ['Queue', 'Profile', 'Key-less mapping', 'Impute', 'Fit adapters', 'Held-out eval', 'Write report'],
};

function makeRun(o) {
  const id = uid('run');
  const run = {
    id, mode: o.mode, name: o.name || '', datasets: o.datasets.slice(), base: o.base || 'clyra-2',
    target: o.target || 'auto', targetCol: o.targetCol || '', task: o.task || 'auto',
    holdout: o.holdout || 20, split: o.split || 'random', seed: o.seed ?? 42, leakageGuard: o.leakageGuard ?? true,
    status: 'running', progress: 0, stage: 0, logs: [], created: now(), finished: null,
  };
  run.result = buildResult(run);
  if (!run.name) run.name = (run.mode === 'quick' ? 'Quick run · ' : '') + (dsById(run.datasets[0])?.name.replace(/\.(csv|json|xlsx|parquet)$/, '') || 'run');
  return run;
}
function finishRun(run, ts, silent) {
  run.status = 'completed'; run.progress = 100; run.stage = STAGES[run.mode].length; run.finished = ts; run.created = ts - (run.mode === 'quick' ? 6e3 : 18e3);
  if (silent) run.logs = planLogs(run).map((l, i) => ({ ...l, ts: run.created + i * 900 }));
}

/* Key-less link discovery between columns of different tables */
const PERSON = ['name', 'nameAbbr', 'nameUpper'];
function linkFor(a, b) {
  if (PERSON.includes(a.kind) && PERSON.includes(b.kind)) return { rank: 0, evidence: 'entity resolution · name variants', conf: [.93, .99] };
  if (a.kind === 'email' && b.kind === 'email') return { rank: 0, evidence: 'normalised e-mail match', conf: [.95, .995] };
  if (a.kind === 'vin' && b.kind === 'vin') return { rank: 0, evidence: 'VIN match · fuzzy 17-char', conf: [.96, .995] };
  if ((a.kind === 'uuid' || a.kind === 'id') && a.kind === b.kind && a.arg === b.arg && a.arg) return { rank: 1, evidence: 'value overlap', conf: [.9, .98] };
  if (a.type === 'datetime' && b.type === 'datetime' && a.kind === b.kind) return { rank: 2, evidence: 'temporal alignment', conf: [.84, .93] };
  if (a.type === 'category' && b.type === 'category') { const va = a.arg.split('|'), vb = b.arg.split('|'); if (va.some((v) => vb.includes(v))) return { rank: 3, evidence: 'distribution overlap', conf: [.76, .9] }; }
  return null;
}

function buildResult(run, force = {}) {
  const r = rng(run.id + run.base + run.seed);
  const dss = run.datasets.map(dsById).filter(Boolean);
  const ds = dss[0] || sampleDatasets()[0];
  const prof = datasetColumns(ds);
  let target = force.forceTarget || (run.target === 'none' ? null : run.target === 'pick' ? run.targetCol || ds.target : ds.target);
  let task = force.forceTask || (run.task === 'auto' ? inferTask(ds, target) : run.task);
  if (task === 'anomaly') target = null;
  const totalRows = dss.reduce((a, d) => a + d.rows, 0) || ds.rows;
  const totalCols = dss.reduce((a, d) => a + d.ncols, 0) || ds.ncols;
  const boost = run.base === 'clyra-2.1-preview' ? .018 : run.base === 'clyra-2-mini' ? -.022 : 0;

  // Mapping across every pair of tables, strongest evidence first
  let mapping = [];
  for (let i = 0; i < dss.length; i++) for (let j = i + 1; j < dss.length; j++) {
    const A = datasetColumns(dss[i]), B = datasetColumns(dss[j]);
    const cands = [];
    A.forEach((a) => B.forEach((b) => { const l = linkFor(a, b); if (l) cands.push({ ...l, a: dss[i].name, ca: a.name, b: dss[j].name, cb: b.name }); }));
    cands.sort((x, y) => x.rank - y.rank);
    const picked = [];
    for (const c of cands) { if (picked.length >= 2) break; if (picked.some((p) => p.rank === c.rank || p.ca === c.ca)) continue; picked.push(c); }
    picked.forEach((c) => {
      mapping.push({ a: c.a, ca: c.ca, b: c.b, cb: c.cb, conf: between(r, c.conf[0], c.conf[1]), evidence: c.evidence, rank: c.rank, matches: c.rank <= 1 ? Math.round(Math.min(dss[i].rows, dss[j].rows) * between(r, .82, .97)) : null });
    });
  }
  mapping = mapping.sort((x, y) => x.rank - y.rank).slice(0, 6);
  const nums = prof.filter((c) => ['int', 'float'].includes(c.type) && c.name !== target);
  const intra = [];
  for (let i = 0; i < Math.min(3, nums.length - 1); i++) intra.push({ a: nums[i].name, b: nums[i + 1].name, r: +(between(r, .42, .88) * (r() < .3 ? -1 : 1)).toFixed(2) });

  // Imputation
  const missRate = prof.reduce((a, c) => a + c.missing, 0) / prof.length / 100 || .008;
  const imputed = Math.round(totalRows * totalCols * missRate * .6);
  const imputeCols = prof.filter((c) => c.missing > 0).sort((x, y) => y.missing - x.missing).slice(0, 4).map((c) => ({ name: c.name, missing: c.missing, filled: Math.round(ds.rows * c.missing / 100) }));

  // Signals
  let signals;
  if (ds.signals) signals = SIG(ds.signals);
  else {
    const feats = prof.filter((c) => !['id', 'datetime'].includes(c.type) && c.name !== target);
    let w = 1;
    signals = feats.slice().sort(() => r() - .5).slice(0, 6).map((c) => { w *= between(r, .62, .86); return { name: c.name, w }; });
    const maxW = signals[0]?.w || 1; signals.forEach((s) => (s.w = +(s.w / maxW).toFixed(2)));
  }

  // Metrics
  const heldout = Math.round(totalRows * run.holdout / 100);
  let metrics;
  if (task === 'classification') {
    const acc = clamp(between(r, .745, .79) + boost, .7, .86), auc = clamp(acc + between(r, .035, .055), .78, .85);
    const prec = clamp(acc - between(r, .02, .06), 0, 1), rec = clamp(acc - between(r, .03, .09), 0, 1);
    const pos = Math.round(heldout * between(r, .08, .2)), tp = Math.round(pos * rec), fn = pos - tp, fp = Math.round(tp / prec - tp), tn = heldout - pos - fp;
    metrics = { kind: 'classification', primaryName: 'Accuracy', primary: acc, list: [['Accuracy', acc], ['F1', (2 * prec * rec) / (prec + rec)], ['AUC', auc], ['Precision', prec], ['Recall', rec]], baseline: acc - between(r, .045, .075), cm: [[tn, fp], [fn, tp]] };
  } else if (task === 'regression') {
    const r2 = clamp(between(r, .78, .9) + boost, .5, .97), tc = prof.find((c) => c.name === target);
    const [lo, hi] = tc ? rangeOf(tc.arg) : [0, 100], span = hi - lo;
    metrics = { kind: 'regression', primaryName: 'R²', primary: r2, list: [['R²', r2], ['MAE', span * (1 - r2) * .18], ['RMSE', span * (1 - r2) * .26], ['MAPE', (1 - r2) * .31]], baseline: r2 - between(r, .14, .24), unit: tc?.name || '' };
  } else {
    const p = clamp(between(r, .82, .92) + boost, .6, .98);
    metrics = { kind: 'anomaly', primaryName: 'Precision@50', primary: p, list: [['Precision@50', p], ['Flagged', Math.round(totalRows * .012)], ['Contamination', .012], ['Recall (est.)', p - .07]], baseline: p - .18 };
  }

  // Predictions preview
  const rows = previewRows(ds, 6);
  let idIdx = prof.findIndex((c) => c.kind === 'name');
  if (idIdx < 0) idIdx = prof.findIndex((c) => c.type === 'id' || c.type === 'text');
  const predictions = rows.map((row, i) => {
    const conf = between(r, .71, .99);
    let pred;
    if (task === 'classification') { const p = between(r, .02, .93); pred = { label: p > .5 ? 'high' : p > .25 ? 'medium' : 'low', p }; }
    else if (task === 'regression') { const tc = prof.find((c) => c.name === target); const [lo, hi] = tc ? rangeOf(tc.arg) : [0, 100]; pred = { value: +between(r, lo, hi).toFixed(1) }; }
    else { const sc = between(r, 0, 1); pred = { score: sc, flag: sc > .82 }; }
    return { key: row[idIdx >= 0 ? idIdx : 0] ?? `row_${i}`, ...pred, conf };
  });

  return {
    sector: ds.sector || 'General', sectorConf: between(r, .93, .995), task, target,
    rows: totalRows, cols: totalCols, tables: dss.length, mapping, intra, imputed, imputeCols, signals, metrics, heldout,
    predictions, latency: Math.round(between(r, 900, 2600)), reportId: uid('rep'), hash: hex(12),
    inferredTypes: { numeric: prof.filter((c) => ['int', 'float'].includes(c.type)).length, categorical: prof.filter((c) => ['category', 'bool'].includes(c.type)).length, temporal: prof.filter((c) => c.type === 'datetime').length },
  };
}

function planLogs(run) {
  const res = run.result, dss = run.datasets.map(dsById).filter(Boolean);
  const L = (lv, msg, stage) => ({ lv, msg, stage });
  const out = [];
  if (run.mode === 'workspace') {
    out.push(L('info', `Run <b>${run.id}</b> queued · base <b>${run.base}</b> (frozen)`, 0));
    out.push(L('info', `Worker allocated · gpu-l4 · ${S?.workspace?.region || 'eu-north-1'}`, 0));
  } else {
    out.push(L('info', `Stateless pass · base <b>${run.base}</b> · nothing persisted`, 0));
  }
  dss.forEach((d) => out.push(L('info', `Loaded <b>${d.name}</b> · ${num(d.rows)} rows × ${d.ncols} cols`, 0)));
  out.push(L('info', `Inferred types: ${res.inferredTypes.numeric} numeric · ${res.inferredTypes.categorical} categorical · ${res.inferredTypes.temporal} temporal`, 1));
  out.push(L('ok', `Sector detected: <b>${res.sector}</b> (p=${res.sectorConf.toFixed(3)})`, 1));
  if (res.mapping.length) {
    res.mapping.forEach((m) => out.push(L('info', `${m.a}.${m.ca} ↔ ${m.b}.${m.cb} · ${m.evidence} · p=${m.conf.toFixed(2)}`, 2)));
    const mm = res.mapping.find((m) => m.matches);
    out.push(L('ok', `Resolved <b>${num(mm ? mm.matches : 0)}</b> entity links without shared keys`, 2));
  } else {
    out.push(L('info', 'Single table · scanning intra-table structure', 2));
    res.intra.forEach((x) => out.push(L('info', `${x.a} ~ ${x.b} · r=${x.r}`, 2)));
  }
  if (run.mode === 'workspace') {
    out.push(L('warn', `Missing cells detected · ${num(res.imputed)} · imputing in-context`, 3));
    dss.forEach((d) => (d.quality || []).forEach(([lv, msg]) => out.push(L(lv, msg, 3))));
    out.push(L('ok', `Imputed <b>${num(res.imputed)}</b> cells · no labels used`, 3));
    out.push(L('info', `Target <b>${res.target || '—'}</b> · task <b>${res.task}</b>`, 4));
    out.push(L('run', 'Fitting adapters · epoch 1/3 · loss 0.412', 4));
    out.push(L('run', 'Fitting adapters · epoch 3/3 · loss 0.187', 4));
    out.push(L('info', `Scoring ${num(res.heldout)} held-out rows · split ${run.holdout}% ${run.split}`, 5));
    out.push(L('ok', res.metrics.list.slice(0, 3).map(([k, v]) => `${k} ${fmtMetric(k, v)}`).join(' · '), 5));
    out.push(L('info', `Report <b>${res.reportId}</b> · sha256:${res.hash}…`, 6));
    out.push(L('ok', 'Run complete · ready to serve as endpoint', 6));
  } else {
    out.push(L('info', `Target <b>${res.target || 'none'}</b> · task <b>${res.task}</b> · in-context`, 3));
    out.push(L('ok', `Predicted ${num(res.rows)} rows in ${(res.latency / 1000).toFixed(1)}s · no held-out score`, 3));
  }
  return out;
}
const fmtP = (name, v) => (name === 'R²' ? v.toFixed(3) : pct(v));
function fmtMetric(name, v) {
  if (name === 'R²' || name === 'AUC') return v.toFixed(3);
  if (['MAE', 'RMSE'].includes(name)) return num(Math.round(v));
  if (name === 'Flagged') return num(v);
  return pct(v);
}

/* ---------- Endpoints & reports ---------- */
function makeEndpoint(run, name) {
  const r = rng(run.id + 'ep');
  return {
    id: uid('ep'), name: name || run.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32),
    runId: run.id, datasets: run.datasets.slice(), base: run.base, task: run.result.task, target: run.result.target,
    status: 'serving', version: 1, created: now(), requests: 0, p50: Math.round(between(r, 28, 54)), p95: Math.round(between(r, 80, 140)),
    metric: run.result.metrics.primary, metricName: run.result.metrics.primaryName, autoscale: true, traffic: Array.from({ length: 24 }, () => Math.round(between(r, 120, 980))),
  };
}
function makeReport(ep, run, op, version, delta = 0) {
  const m = run.result.metrics;
  const list = m.list.map(([k, v]) => [k, ['MAE', 'RMSE'].includes(k) ? v * (1 - delta * 3) : k === 'Flagged' ? v : clamp(v + delta, 0, k === 'AUC' ? .85 : .995)]);
  return {
    id: uid('rep'), endpointId: ep.id, endpointName: ep.name, runId: run.id, op, version, created: now(), base: ep.base,
    task: run.result.task, target: run.result.target, heldout: run.result.heldout, split: `${run.holdout}% ${run.split}`,
    metrics: { primaryName: m.primaryName, primary: clamp(m.primary + delta, 0, .995), list, baseline: m.baseline, cm: m.cm },
    hash: hex(16), pinned: false, rows: run.result.rows,
  };
}

/* ---------- Chat answers ---------- */
function suggestionsFor(ep) {
  const run = ep && runById(ep.runId);
  const st = run?.story;
  const out = [[st?.q || 'Which records score highest right now?', 'predictions from the endpoint']];
  if (st?.chartQ) out.push([st.chartQ, 'interactive chart']);
  if (st?.explainId) out.push([`Why was ${st.explainId} flagged?`, 'explain one prediction']);
  else out.push(['What drives the predictions?', 'signals and attribution']);
  out.push(['How accurate is this endpoint?', 'held-out metrics vs baseline'], ['What can you tell me about my data?', 'tables · key-less links · quality']);
  return out.slice(0, 4);
}
function answerFor(q, ep) {
  const run = runById(ep?.runId) || S?.runs?.find((r) => r.status === 'completed');
  const res = run?.result;
  const st = run?.story;
  const dss = (ep?.datasets || run?.datasets || []).map(dsById).filter(Boolean);
  const ql = q.toLowerCase();
  const blocks = [];
  if (!res) return [{ t: 'p', v: 'I could not find a completed run behind this endpoint yet.' }];
  if (/chart|graph|plot|trend|over time|over the last|by product|by region|by imd|by band|by department|visuali/.test(ql)) {
    if (st?.chart) {
      blocks.push({ t: 'p', v: st.chartIntro });
      blocks.push({ t: 'chart', c: st.chart });
      blocks.push({ t: 'p', v: st.chartNote });
    } else {
      blocks.push({ t: 'p', v: `Here are the signals behind <b>${res.target || 'the anomaly score'}</b>, ranked by attribution on the held-out set.` });
      blocks.push({ t: 'chart', c: { kind: 'bar', title: 'Signal attribution', sub: `${ep?.name || run.name} · held-out set`, unit: '', x: res.signals.map((s) => s.name), series: [{ name: 'Relative weight', values: res.signals.map((s) => s.w) }], source: `${ep?.id || run.id}` } });
    }
    return blocks;
  }
  if (st?.explain && /(why|explain)/.test(ql)) {
    blocks.push({ t: 'p', v: `<span class="mono">${st.explainId}</span> scored <b>${st.explainScore || '0.97'}</b> on <span class="mono">${ep.name}</span> v${ep.version}, in the top 0.2% of ${st.explainScope || 'records'}. The five strongest contributions:` });
    blocks.push({ t: 'list', v: st.explain });
    if (st.explainLink) blocks.push({ t: 'p', v: st.explainLink });
    if (st.explainRec) blocks.push({ t: 'p', v: st.explainRec });
  } else if (/accura|trust|held|metric|good|reliab|perform|precision/.test(ql)) {
    const m = res.metrics;
    blocks.push({ t: 'p', v: `On ${num(res.heldout)} held-out rows the endpoint reaches <b>${m.primaryName} ${fmtP(m.primaryName, m.primary)}</b>, versus ${fmtP(m.primaryName, m.baseline)} for a gradient-boosted baseline trained on the same split.` });
    blocks.push({ t: 'table', head: ['Metric', 'Value'], rows: m.list.map(([k, v]) => [k, fmtMetric(k, v)]) });
    blocks.push({ t: 'list', v: [`Split: ${run.holdout}% · ${run.split}`, `Leakage guard: ${run.leakageGuard ? 'on' : 'off'}`, `Base: ${ep?.base || run.base} · live version v${ep?.version || 1}`] });
  } else if (/feature|driver|drive|signal|important|cause/.test(ql)) {
    blocks.push({ t: 'p', v: `The strongest signals behind <b>${res.target || 'the anomaly score'}</b>, ranked by attribution on the held-out set:` });
    blocks.push({ t: 'table', head: ['Signal', 'Relative weight', 'Source'], rows: res.signals.map((s) => [s.name, s.w.toFixed(2), /\(([^)]+)\)/.exec(s.name)?.[1] || dss[0]?.name || '—']) });
    blocks.push({ t: 'p', v: `Signals marked with another source come from tables Clyra linked without shared keys.` });
  } else if (/risk|who|which|top|most|least|attend|lapse|suspic|flag|predict|highest|review|worst|tightest|where/.test(ql)) {
    if (st) {
      blocks.push({ t: 'p', v: st.intro });
      blocks.push({ t: 'h', v: st.title });
      blocks.push({ t: 'table', head: st.head, rows: st.rows });
      blocks.push({ t: 'p', v: st.note });
    } else {
      blocks.push({ t: 'p', v: `Top records from <span class="mono">${ep.id}</span> right now:` });
      blocks.push({ t: 'table', head: ['Record', 'Prediction', 'Confidence'], rows: res.predictions.map((p) => [p.key, res.task === 'classification' ? `${p.label} · ${p.p.toFixed(2)}` : res.task === 'regression' ? String(p.value) : p.score.toFixed(2), pct(p.conf, 0)]) });
    }
  } else {
    blocks.push({ t: 'p', v: `This endpoint is built on ${dss.length} table${dss.length > 1 ? 's' : ''} (${num(res.rows)} rows) from the <b>${res.sector}</b> domain. Clyra linked them without shared keys and filled ${num(res.imputed)} missing cells before fitting.` });
    blocks.push({ t: 'h', v: 'Data structure overview' });
    blocks.push({ t: 'table', head: ['Table', 'Source', 'Rows', 'Role'], rows: dss.map((d, i) => [d.name, connById(d.conn)?.name || 'Upload', num(d.rows), i === 0 ? 'Primary' : 'Linked']) });
    if (res.mapping.length) {
      blocks.push({ t: 'h', v: 'Key-less links found' });
      blocks.push({ t: 'list', v: res.mapping.slice(0, 4).map((m) => `${m.a}.${m.ca} ↔ ${m.b}.${m.cb}: ${m.evidence} (p=${m.conf.toFixed(2)})`) });
    }
    blocks.push({ t: 'p', v: `The prediction target is <b>${res.target || 'none (anomaly score)'}</b>. Ask me about drivers, accuracy, or the highest-scoring records.` });
  }
  return blocks;
}
function seedConversation(ep, q, ts, provider = 'mistral') {
  const p = PROVIDERS.find((x) => x.id === provider);
  return { id: uid('chat'), title: q, endpointId: ep.id, provider, created: ts, messages: [{ role: 'user', text: q }, { role: 'ai', blocks: answerFor(q, ep), meta: `${p.label.toLowerCase()} · ${(1.4 + Math.random()).toFixed(1)}s · 2 calls to ${ep.id}` }] };
}

/* ==========================================================================
   Router + shell (sidebar, topbar)
   ========================================================================== */
const ROUTES = {
  overview: { title: 'Overview', nav: 'overview' },
  data: { title: 'Data', nav: 'data' },
  'quick-run': { title: 'Quick Run', nav: 'quick-run' },
  workspace: { title: 'Workspace', nav: 'workspace' },
  'workspace/new': { title: 'New run', nav: 'workspace', parent: 'workspace' },
  run: { title: 'Run', nav: 'workspace', parent: 'workspace' },
  endpoints: { title: 'Endpoints', nav: 'endpoints' },
  api: { title: 'API & MCP', nav: 'api' },
  reports: { title: 'Reports', nav: 'reports' },
  chat: { title: 'Chat', nav: 'chat' },
};
function parseRoute() {
  const h = (location.hash || '#/overview').replace(/^#\/?/, '');
  if (h.startsWith('run/')) return { name: 'run', param: h.slice(4) };
  if (h.startsWith('chat/')) return { name: 'chat', param: h.slice(5) };
  return { name: ROUTES[h] ? h : 'overview', param: null };
}
let R = parseRoute();
function go(path) {
  if (('#/' + path) === location.hash) { render(); return; }
  location.hash = '#/' + path;
}

function renderSidebar() {
  const nav = R.name === 'run' || R.name === 'workspace/new' ? 'workspace' : R.name;
  const active = S.runs.filter((r) => r.status === 'running');
  const recentWs = S.runs.filter((r) => r.mode === 'workspace' && r.status !== 'running').slice(0, 2);
  const serving = S.endpoints.filter((e) => e.status === 'serving').length;
  const usagePct = clamp(S.usage.used / S.usage.limit * 100, 0, 100);
  const item = (id, ico, label, extra = '') => `<button class="nav-item ${nav === id ? 'active' : ''}" data-action="nav" data-to="${id}" data-tip="${label}" aria-label="${label}"><span class="ico">${icon(ico, 16)}</span><span>${label}</span>${extra}</button>`;
  $('#sidebar').innerHTML = `
    <div class="sb-head">
      <a class="brand" href="#/overview" aria-label="Clyra home"><span class="brand-mark"><i></i><i></i><i></i></span><span>Clyra</span><span class="ver">beta</span></a>
      <button class="icon-btn ghost sm sb-toggle" data-action="toggle-sb" data-tip="${S.ui.sbCollapsed ? 'Expand' : 'Collapse'} sidebar · ⌘\\" aria-label="${S.ui.sbCollapsed ? 'Expand' : 'Collapse'} sidebar">${icon('panel', 16)}</button>
    </div>
    <button class="ws-switch" data-action="ws-menu" data-tip="${esc(S.workspace.name)}"><span class="ws-avatar">${esc(S.workspace.short || S.workspace.name.slice(0, 2).toUpperCase())}</span><div><b>${esc(S.workspace.name)}</b><small>${S.workspace.plan} · ${S.workspace.region}</small></div>${icon('down', 14)}</button>
    <nav class="nav">
      ${item('overview', 'grid', 'Overview')}
      <div class="nav-group">Build</div>
      ${item('data', 'db', 'Data', `<span class="count">${S.datasets.length}</span>`)}
      ${item('quick-run', 'bolt', 'Quick Run')}
      ${item('workspace', 'flask', 'Workspace', `<span class="caret ${S.ui.wsNavOpen ? 'open' : ''}" data-action="toggle-wsnav">${icon('down', 13)}</span>`)}
      ${S.ui.wsNavOpen ? `<div class="nav-sub">
        <button class="new" data-action="nav" data-to="workspace/new">${icon('plus', 13)} New run</button>
        ${active.map((r) => `<button class="run-mini" data-action="nav" data-to="run/${r.id}"><span>${esc(r.name)}</span><em data-run-pct="${r.id}">${Math.floor(r.progress)}%</em><i><b data-run-bar="${r.id}" style="width:${r.progress}%"></b></i></button>`).join('')}
        ${!active.length && !recentWs.length ? '<div class="empty-sub">No active runs</div>' : ''}
        ${recentWs.map((r) => `<button data-action="nav" data-to="run/${r.id}"><span class="dot ${r.status === 'completed' ? 'ok' : 'err'}"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</span></button>`).join('')}
      </div>` : ''}
      <div class="nav-group">Deploy</div>
      ${item('endpoints', 'layers', 'Endpoints', serving ? `<span class="count">${serving} live</span>` : '')}
      ${item('api', 'key', 'API & MCP', '<span class="tag">new</span>')}
      <div class="nav-group">Understand</div>
      ${item('reports', 'report', 'Reports', S.reports.length ? `<span class="count">${S.reports.length}</span>` : '')}
    </nav>
    <div class="sb-foot">
      <button class="ask-btn ${nav === 'chat' ? 'active' : ''}" data-action="nav" data-to="chat" data-tip="Ask Clyra · ⌘J"><span class="ask-logo">${logoMark('inv xs')}</span><span>Ask Clyra</span><kbd>⌘J</kbd></button>
      <div class="usage-card" title="Compute units used this week">
        <div class="row"><span>Usage</span><b>${S.usage.used.toFixed(1)} / ${S.usage.limit} CU</b></div>
        <div class="bar"><i style="width:${usagePct}%"></i></div>
        <small>resets Mon 00:00 UTC</small>
      </div>
      <button class="sb-row" data-action="help" data-tip="Docs & help">${icon('help', 15)}<span>Docs & help</span></button>
      <div class="sb-privacy">All names and data are simulated for privacy.</div>
      <button class="profile" data-action="profile-menu" data-tip="${esc(S.user.name)}"><span class="avatar">${S.user.initials}</span><div><b>${esc(S.user.name)}</b><small>${esc(S.user.email)}</small></div>${icon('down', 14)}</button>
    </div>`;
}

function renderTopbar() {
  const rt = ROUTES[R.name] || ROUTES.overview;
  let crumbs = `<button data-action="nav" data-to="overview">${esc(S.workspace.name)}</button><span class="sep">/</span>`;
  if (rt.parent) crumbs += `<button data-action="nav" data-to="${rt.parent}">${ROUTES[rt.parent].title}</button><span class="sep">/</span>`;
  let title = rt.title;
  if (R.name === 'run') { const run = runById(R.param); title = run ? run.name : 'Run'; }
  crumbs += `<strong>${esc(title)}</strong>`;
  const unread = S.notifications.some((n) => !n.read);
  const running = S.runs.filter((r) => r.status === 'running').length;
  $('#topbar').innerHTML = `
    <button class="icon-btn menu-btn" data-action="open-sidebar" aria-label="Menu">${icon('menu', 16)}</button>
    <div class="crumbs">${crumbs}</div>
    <button class="cmd-trigger" data-action="palette">${icon('search', 14)}<span>Search or run a command…</span><kbd>⌘K</kbd></button>
    <div class="status-chip" title="Model service status"><span class="dot ${running ? 'live' : 'ok'}"></span>${running ? `${running} run${running > 1 ? 's' : ''} active` : 'clyra-2 · operational'}</div>
    <button class="icon-btn ${unread ? 'has-dot' : ''}" data-action="open-notifs" aria-label="Notifications">${icon('bell', 15)}</button>`;
}

function render() {
  R = parseRoute();
  document.documentElement.dataset.theme = S.theme;
  $('#shell').classList.toggle('sb-collapsed', !!S.ui.sbCollapsed);
  renderSidebar();
  renderTopbar();
  const page = $('#page');
  const fn = PAGES[R.name] || PAGES.overview;
  page.innerHTML = fn(R.param);
  page.style.animation = 'none'; void page.offsetWidth; page.style.animation = '';
  $('#shell').classList.remove('nav-open');
  afterRender();
  save();
}
/* Re-render without page-in animation (state changes on same page) */
function refresh() {
  const y = window.scrollY;
  const a = document.activeElement;
  const keep = a && a.dataset && a.dataset.input && !a.closest('#overlay-root') ? [a.dataset.input, a.selectionStart, a.selectionEnd] : null;
  renderSidebar(); renderTopbar();
  const page = $('#page');
  const fn = PAGES[R.name] || PAGES.overview;
  page.style.animation = 'none';
  page.innerHTML = fn(R.param);
  afterRender();
  window.scrollTo(0, y);
  if (keep) { const el = $(`#page [data-input="${keep[0]}"]`); if (el) { el.focus(); try { el.setSelectionRange(keep[1], keep[2]); } catch (e) { /* range inputs */ } } }
  save();
}
function afterRender() {
  const sc = $('.chat-scroll'); if (sc) sc.scrollTop = sc.scrollHeight;
  $$('.console-body').forEach((c) => (c.scrollTop = c.scrollHeight));
}

/* ==========================================================================
   Pages
   ========================================================================== */
const pageHead = (eyebrow, title, desc, actions = '') => `
  <div class="page-head"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${title}</h1>${desc ? `<p>${desc}</p>` : ''}</div>${actions ? `<div class="head-actions">${actions}</div>` : ''}</div>`;
const empty = (ico, title, text, actions = '') => `<div class="empty"><div class="ico">${icon(ico, 20)}</div><h3>${title}</h3><p>${text}</p>${actions ? `<div class="row">${actions}</div>` : ''}</div>`;
const btn = (label, action, o = {}) => `<button class="btn ${o.cls || ''}" data-action="${action}"${o.arg != null ? ` data-arg="${esc(o.arg)}"` : ''}${o.to ? ` data-to="${o.to}"` : ''}${o.disabled ? ' disabled' : ''}${o.title ? ` title="${esc(o.title)}"` : ''}>${o.ico ? icon(o.ico, 14) : ''}${label}${o.kbd ? ` <kbd>${o.kbd}</kbd>` : ''}${o.arrow ? `<span class="arrow">${icon('out', 13)}</span>` : ''}</button>`;
const fileIco = (d) => `<span class="file-ico ${d.folder === 'synthetic' ? 'syn' : d.type.toLowerCase()}">${d.folder === 'synthetic' ? 'SYN' : d.type === 'TABLE' ? 'TBL' : d.type}</span>`;
function runPill(r) {
  if (r.status === 'running') return `<span class="pill live"><span class="dot live"></span>running · ${Math.floor(r.progress)}%</span>`;
  if (r.status === 'failed') return '<span class="pill err">failed</span>';
  return '<span class="pill ok">completed</span>';
}
function runMetric(r) {
  if (r.status !== 'completed') return '<span class="faint">—</span>';
  if (r.mode === 'quick') return '<span class="faint mono">no held-out</span>';
  const m = r.result.metrics; return `<span class="mono">${m.primaryName} <b>${fmtP(m.primaryName, m.primary)}</b></span>`;
}
function lineChart(vals, { w = 600, h = 150, accent = true, id = 'c' } = {}) {
  const max = Math.max(1, ...vals) * 1.15, min = 0, step = w / (vals.length - 1);
  const pts = vals.map((v, i) => [i * step, h - ((v - min) / (max - min)) * (h - 10) - 4]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`; }
  const last = pts[pts.length - 1];
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Chart">
    <defs><linearGradient id="g${id}" x1="0" x2="0" y1="0" y2="1"><stop style="stop-color:var(--accent)" stop-opacity=".16"/><stop offset="1" style="stop-color:var(--accent)" stop-opacity="0"/></linearGradient></defs>
    <path class="grid" d="M0 ${h * .25}H${w}M0 ${h * .5}H${w}M0 ${h * .75}H${w}"/>
    <path d="${d} L${w} ${h} L0 ${h}Z" fill="url(#g${id})"/>
    <path class="line ${accent ? 'accent' : ''}" d="${d}" vector-effect="non-scaling-stroke"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="4" style="fill:var(--accent)" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/>
  </svg>`;
}
function sparkline(vals) {
  const max = Math.max(1, ...vals), w = 90, h = 26, step = w / (vals.length - 1);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}"><path d="${vals.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)} ${(h - (v / max) * (h - 4) - 2).toFixed(1)}`).join(' ')}"/></svg>`;
}


/* ---------- Brand mark + hero flow illustration ---------- */
const logoMark = (cls = '') => `<span class="brand-mark ${cls}" aria-hidden="true"><i></i><i></i><i></i></span>`;
function pickEndpointFor(q) {
  const ql = (q || '').toLowerCase();
  const live = S.endpoints.filter((e) => e.status === 'serving');
  const by = (re) => live.find((e) => re.test(e.name));
  return (/invitation|dispatch|duplicate|anomal|flag|record|audit|data quality/.test(ql) && by(/anomaly/)) || (/capacity|clinic|slot|mobile|unit|site|week/.test(ql) && by(/capacity/)) || (/follow|abnormal|result/.test(ql) && by(/followup/)) || (/attend|invite|remind|imd|depriv|outreach|programme|breast|cervical|bowel/.test(ql) && by(/attendance/)) || live[0] || S.endpoints[0];
}
function heroFlow() {
  const W = 520, H = 240, CX = 260, CY = 120;
  const ICO = { sqlserver: 'MS', postgres: 'PG', snowflake: 'SF', api: 'API', s3: 'S3', supabase: 'SB', bigquery: 'BQ', mysql: 'MY', databricks: 'DB', drive: 'GD', gcs: 'GS' };
  let srcs = S.connections.slice(0, 4).map((c) => ({ ico: ICO[c.kind] || 'DB', name: c.short || c.name }));
  const ghost = !srcs.length;
  if (ghost) srcs = [{ ico: 'DB', name: 'Databases' }, { ico: 'CSV', name: 'Files' }, { ico: 'API', name: 'APIs' }, { ico: 'S3', name: 'Cloud' }];
  let outs = S.endpoints.filter((e) => e.status === 'serving').slice(0, 3).map((e) => e.name);
  const ghostOut = !outs.length;
  if (ghostOut) outs = ['Predictions', 'Anomaly scores', 'API & MCP'];
  const cut = (t, n) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
  const step = srcs.length > 1 ? 168 / (srcs.length - 1) : 0;
  let paths = '', dots = '', chips = '';
  srcs.forEach((s, i) => {
    const y = 36 + i * step, d = `M150 ${y} C 200 ${y}, 200 ${CY}, ${CX - 40} ${CY}`;
    paths += `<path class="hf-path" d="${d}"/>`;
    if (!ghost) dots += `<circle r="2.4" class="hf-dot in"><animateMotion dur="${2.8 + i * .3}s" begin="-${(i * .7 + .2).toFixed(1)}s" repeatCount="indefinite" path="${d}"/></circle>`;
    chips += `<g class="hf-chip ${ghost ? 'ghost' : ''}"><rect x="12" y="${y - 15}" width="138" height="30" rx="15"/><rect class="hf-ico" x="18" y="${y - 10}" width="20" height="20" rx="10"/><text class="hf-icot" x="28" y="${y + 3}" text-anchor="middle">${s.ico}</text><text class="hf-name" x="45" y="${y + 3.5}">${esc(cut(s.name, 17))}</text></g>`;
  });
  const ostep = outs.length > 1 ? 104 / (outs.length - 1) : 0;
  outs.forEach((o, i) => {
    const y = 68 + i * ostep, d = `M${CX + 40} ${CY} C ${CX + 80} ${CY}, 330 ${y}, 370 ${y}`;
    paths += `<path class="hf-path out" d="${d}"/>`;
    if (!ghost) dots += `<circle r="2.4" class="hf-dot out"><animateMotion dur="2.4s" begin="-${(.5 + i * .7).toFixed(1)}s" repeatCount="indefinite" path="${d}"/></circle>`;
    chips += `<g class="hf-chip out ${ghostOut ? 'ghost' : ''}"><rect x="370" y="${y - 15}" width="140" height="30" rx="15"/><circle class="hf-status" cx="385" cy="${y}" r="3.5"/><text class="hf-name" x="395" y="${y + 3.5}">${esc(cut(o, 18))}</text></g>`;
  });
  return `<div class="orb-stage hf" aria-label="Sources mapped without shared keys into clyra-2, served as endpoints">
    <div class="glow"></div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img">
      <defs><radialGradient id="hfCore" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#34403f"/><stop offset=".6" stop-color="#161e1e"/><stop offset="1" stop-color="#0c1212"/></radialGradient></defs>
      ${paths}${dots}
      <circle class="hf-pulse" cx="${CX}" cy="${CY}" r="40"/>
      <circle class="hf-ring" cx="${CX}" cy="${CY}" r="50"/>
      <circle cx="${CX}" cy="${CY}" r="40" fill="url(#hfCore)" class="hf-core"/>
      <g transform="translate(${CX} ${CY}) rotate(-30) scale(.82) translate(-28 -27)" class="hf-mark"><rect x="2" y="2" width="46" height="22" rx="13"/><rect x="8" y="30" width="46" height="22" rx="13"/><rect class="cut" x="20" y="17" width="16" height="20" rx="2"/></g>
      <text class="hf-core-cap" x="${CX}" y="${CY + 70}" text-anchor="middle">clyra-2</text>
      ${chips}
    </svg>
  </div>`;
}

/* ---------- Onboarding ---------- */
function onboardingSteps() {
  const completedWs = S.runs.find((r) => r.mode === 'workspace' && r.status === 'completed' && !S.endpoints.some((e) => e.runId === r.id));
  return [
    { id: 'connect', title: 'Connect data', desc: 'Bring tables from uploads, databases, cloud storage or APIs. No shared keys, no labels, no preprocessing.', done: S.connections.length > 0 || S.datasets.some((d) => !d.builtin), cta: btn('Connect data', 'connect', { cls: 'primary sm', ico: 'plus' }) + ' ' + btn('Generate synthetic', 'generate', { cls: 'sm', ico: 'wand' }) },
    { id: 'quick', title: 'Try a Quick Run', desc: 'A stateless pass on the frozen base. Full bundle in one shot, predictions in-context, nothing saved.', done: S.runs.some((r) => r.mode === 'quick'), cta: btn('Open Quick Run', 'nav', { cls: 'primary sm', to: 'quick-run', ico: 'bolt' }) },
    { id: 'ws', title: 'Run in the Workspace', desc: 'Fit on your tables with a held-out split. You get a measurable score and a run you can serve.', done: S.runs.some((r) => r.mode === 'workspace' && r.status === 'completed'), cta: btn('New run', 'nav', { cls: 'primary sm', to: 'workspace/new', ico: 'plus' }) },
    { id: 'ep', title: 'Create an endpoint', desc: 'Turn a finished run into a versioned prediction API. Every create emits a held-out report.', done: S.endpoints.length > 0, cta: completedWs ? btn('Create endpoint', 'create-endpoint', { cls: 'primary sm', arg: completedWs.id, ico: 'layers' }) : btn('Go to Workspace', 'nav', { cls: 'sm', to: 'workspace' }) },
    { id: 'chat', title: 'Chat with your data', desc: 'Connect your own LLM key and narrate any endpoint in plain language. Clyra meters no LLM tokens.', done: S.flags.chatted, cta: S.llm.length ? btn('Open Chat', 'nav', { cls: 'primary sm', to: 'chat', ico: 'chat' }) : btn('Connect LLM', 'connect-llm', { cls: 'primary sm', ico: 'plug' }) },
    { id: 'key', title: 'Create an API key', desc: 'Call your endpoints from your product, notebooks or agents over REST or MCP.', done: S.keys.length > 0, cta: btn('Create API key', 'create-key', { cls: 'primary sm', ico: 'key' }) },
  ];
}
function onboardingCard() {
  const steps = onboardingSteps();
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length && !S.ui.onboardOpen) return '';
  const next = steps.find((s) => !s.done);
  const openId = S.ui.openStep || next?.id;
  return `<section class="card onboard">
    <div class="card-head" data-action="toggle-onboard">
      <div><div class="eyebrow accent">${icon('spark', 12)} Get started</div><h2>${done === steps.length ? 'You’re all set. The full loop is live.' : 'Get started with Clyra'}</h2></div>
      <div class="row"><div class="onboard-progress"><span>${done}/${steps.length}</span><div class="progress ink"><i style="width:${done / steps.length * 100}%"></i></div></div>${icon('down', 16)}</div>
    </div>
    ${S.ui.onboardOpen ? `<div class="steps">${steps.map((s, i) => `
      <div class="step ${s.done ? 'done' : ''} ${s === next ? 'next' : ''} ${openId === s.id ? 'open' : ''}">
        <button class="step-head" data-action="open-step" data-arg="${s.id}"><span class="step-num">${s.done ? icon('check', 12, 2.4) : i + 1}</span><span class="step-title">${s.title}</span>${s.done ? '<span class="pill ok">done</span>' : s === next ? '<span class="pill live">next</span>' : ''}${icon('down', 15)}</button>
        <div class="step-body">${s.desc}<div class="row wrap">${s.cta}</div></div>
      </div>`).join('')}</div>` : ''}
  </section>`;
}

/* ---------- Overview ---------- */
function attentionItems() {
  const items = [];
  S.endpoints.filter((e) => e.drift && e.status === 'serving').forEach((e) => items.push({
    sev: 'warn', icon: 'activity', title: `Data drift on ${e.name}`, sub: `${e.drift.col} mix shifted, ${e.drift.delta} since v${e.version} · refresh recommended`,
    cta: btn('Refresh', 'attn-refresh', { cls: 'sm primary', arg: e.id, ico: 'refresh' }),
  }));
  S.runs.filter((r) => r.status === 'running').forEach((r) => items.push({
    sev: 'live', icon: 'flask', title: `${r.name} is running`, sub: `${STAGES[r.mode][Math.min(r.stage, STAGES[r.mode].length - 1)]} · ${r.by ? memberName(r.by) + ' · ' : ''}${r.base}`,
    progress: r,
    cta: btn('View', 'nav', { cls: 'sm', to: 'run/' + r.id }),
  }));
  S.runs.filter((r) => r.mode === 'workspace' && r.status === 'completed' && !S.endpoints.some((e) => e.runId === r.id)).slice(0, 2).forEach((r) => items.push({
    sev: 'ok', icon: 'layers', title: `${r.name} is ready to serve`, sub: `${r.result.metrics.primaryName} ${fmtP(r.result.metrics.primaryName, r.result.metrics.primary)} on held-out rows · finished ${ago(r.finished)}`,
    cta: btn('Create endpoint', 'create-endpoint', { cls: 'sm', arg: r.id }),
  }));
  S.endpoints.filter((e) => e.status === 'serving').forEach((e) => { const st = runById(e.runId)?.story; if (st && st.alert) items.push({
    sev: 'accent', icon: 'spark', title: st.alert.title, sub: `${e.name} · ${st.alert.sub}`,
    cta: `<button class="btn sm" data-action="ask-about" data-arg="${e.id}" data-q="${esc(st.q)}">${icon('chat', 14)}Ask Clyra</button>`,
  }); });
  S.keys.filter((k) => k.exp === '30 days' && now() - k.created > 20 * DAY).forEach((k) => items.push({
    sev: 'warn', rank: 4, icon: 'key', title: `API key ${k.name} expires soon`, sub: `${k.scope} scope · last used ${k.lastUsed ? ago(k.lastUsed) : 'never'}`,
    cta: btn('Rotate', 'create-key', { cls: 'sm' }),
  }));
  const R0 = { warn: 0, accent: 1, live: 2, ok: 3 };
  return items.map((it, i) => ({ ...it, i })).sort((a, b) => (a.rank ?? R0[a.sev]) - (b.rank ?? R0[b.sev]) || a.i - b.i).slice(0, 5);
}
function resumeCards() {
  const strip = (h) => String(h || '').replace(/<[^>]+>/g, '');
  const cards = [];
  const conv = S.conversations[0];
  if (conv) {
    const ai = conv.messages.find((m) => m.role === 'ai');
    const firstP = ai?.blocks.find((b) => b.t === 'p');
    const hasChart = ai?.blocks.some((b) => b.t === 'chart');
    const ep = epById(conv.endpointId);
    cards.push(`<button class="card resume-card" data-action="nav" data-to="chat/${conv.id}">
      <div class="resume-top"><span class="resume-ico chat">${logoMark('inv xs')}</span><span class="eyebrow">Last conversation</span><span class="footnote">${ago(conv.created)}</span></div>
      <b>${esc(conv.title)}</b>
      <p>${esc(strip(firstP?.v).slice(0, 150))}${strip(firstP?.v).length > 150 ? '…' : ''}</p>
      <div class="resume-foot"><span class="tag">${esc(ep?.name || 'endpoint')}</span>${hasChart ? `<span class="tag accent">${icon('activity', 11)} chart</span>` : ''}<span class="link-btn">Continue ${icon('arrow', 13)}</span></div>
    </button>`);
  }
  const run = S.runs.find((r) => r.status === 'running') || S.runs.find((r) => r.mode === 'workspace' && r.status === 'completed');
  if (run) {
    const st = STAGES[run.mode];
    cards.push(`<button class="card resume-card" data-action="nav" data-to="run/${run.id}">
      <div class="resume-top"><span class="resume-ico">${icon('flask', 15)}</span><span class="eyebrow">${run.status === 'running' ? 'Run in progress' : 'Latest run'}</span><span class="footnote">${run.by ? esc(memberName(run.by)) : ''}</span></div>
      <b>${esc(run.name)}</b>
      <p>${run.status === 'running' ? `${st[Math.min(run.stage, st.length - 1)]} · ${run.datasets.length} tables · ${run.base}` : `${run.result.metrics.primaryName} ${fmtP(run.result.metrics.primaryName, run.result.metrics.primary)} on ${num(run.result.heldout)} held-out rows`}</p>
      ${run.status === 'running' ? `<div class="progress"><i data-run-bar="${run.id}" style="width:${run.progress}%"></i></div>` : ''}
      <div class="resume-foot">${runPill(run)}<span class="link-btn">Open run ${icon('arrow', 13)}</span></div>
    </button>`);
  }
  const rep = S.reports.slice().sort((x, y) => y.created - x.created)[0];
  if (rep) {
    const prev = S.reports.filter((x) => x.endpointId === rep.endpointId && x.version < rep.version).sort((x, y) => y.version - x.version)[0];
    const d = prev ? rep.metrics.primary - prev.metrics.primary : null;
    cards.push(`<button class="card resume-card" data-action="open-report" data-arg="${rep.id}">
      <div class="resume-top"><span class="resume-ico">${icon('report', 15)}</span><span class="eyebrow">Latest report</span><span class="footnote">${ago(rep.created)}</span></div>
      <b>${esc(rep.endpointName)} · v${rep.version}</b>
      <div class="resume-metric"><span>${rep.metrics.primaryName}</span><strong>${fmtP(rep.metrics.primaryName, rep.metrics.primary)}</strong>${d != null ? `<em class="${d >= 0 ? 'ok' : 'err'}">${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)} pts vs v${prev.version}</em>` : ''}</div>
      <div class="resume-foot"><span class="pill ${rep.op === 'create' ? 'info' : rep.op === 'upgrade' ? 'live' : 'ok'}">${rep.op}</span><span class="link-btn">View report ${icon('arrow', 13)}</span></div>
    </button>`);
  }
  return cards.join('');
}

function pageOverview() {
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const serving = S.endpoints.filter((e) => e.status === 'serving');
  const preds24 = S.endpoints.reduce((a, e) => a + e.traffic.reduce((x, y) => x + y, 0), 0);
  const avg = serving.length ? serving.reduce((a, e) => a + e.metric, 0) / serving.length : 0;
  const usagePct = S.usage.used / S.usage.limit * 100;
  const attn = attentionItems().slice(0, 3);
  const syncing = S.connections.filter((c) => c.status === 'syncing').length;
  const brief = serving.length
    ? `Your models served <b>${compact(preds24)} predictions</b> in the last 24 hours with an average held-out score of <b>${(avg * 100).toFixed(1)}%</b>. ${attn.length ? `<b>${attn.length} thing${attn.length > 1 ? 's' : ''}</b> need${attn.length > 1 ? '' : 's'} you today. Start with <span class="accent">${esc(attn[0].title.charAt(0).toLowerCase() + attn[0].title.slice(1))}</span>.` : 'Nothing needs you today.'}`
    : 'Connect your first tables and Clyra will start mapping them, with no shared keys, no labels needed.';
  return `
  <div class="home2">
    <div class="home2-main">
      <header class="brief">
        <div class="eyebrow"><span class="dot ok"></span>${esc(S.workspace.name)}</div>
        <h1>${greet}, ${esc(S.user.first || S.user.name.split(' ')[0])}.</h1>
        <p>${brief}</p>
      </header>

      <div class="ask-hero">
        <span class="ask-home-logo">${logoMark('inv')}</span>
        <input id="home-ask" placeholder="Ask Clyra about attendance, invitations or clinic capacity…" autocomplete="off" />
        <kbd>⌘J</kbd>
        <button class="send" data-action="home-ask" aria-label="Ask">${icon('send', 15, 2)}</button>
      </div>
      <div class="status-kpis home-kpis">
        <div><small>Predictions · 24h</small><b data-total-24h>${compact(preds24)}</b></div>
        <div><small>Held-out score</small><b>${avg ? (avg * 100).toFixed(1) : '—'}<i>%</i></b></div>
        <div><small>Endpoints live</small><b>${serving.length}<i>/ ${S.endpoints.length}</i></b></div>
        <div><small>Compute · week</small><b>${Math.round(usagePct)}<i>%</i></b><span class="strip-bar"><i style="width:${usagePct}%"></i></span></div>
      </div>

      ${onboardingCard()}

      <section class="card today">
        <div class="card-head"><div><div class="eyebrow">Today</div><h2>${attn.length ? `${attn.length} thing${attn.length > 1 ? 's' : ''} to do` : 'All clear'}</h2></div>${attn.length ? '<span class="sub">ordered by urgency</span>' : ''}</div>
        ${attn.length ? attn.map((it, i) => `<div class="attn-item sev-${it.sev}"><span class="attn-num">${String(i + 1).padStart(2, '0')}</span><div class="attn-main"><b>${esc(it.title)}</b><small>${esc(it.sub)}</small>${it.progress ? `<div class="progress" style="margin-top:8px;max-width:340px"><i data-run-bar="${it.progress.id}" style="width:${it.progress.progress}%"></i></div>` : ''}</div><div class="attn-cta">${it.cta}</div></div>`).join('')
        : `<div class="card-body">${empty('check', 'Nothing needs you', 'No drift, no failed runs, nothing waiting to be served.')}</div>`}
      </section>
    </div>

    <aside class="home2-side">
      <section class="card status">
        <div class="card-head"><div><div class="eyebrow">System status</div><h2>${syncing ? `${syncing} source syncing` : 'All systems normal'}</h2></div><span class="pill ${syncing ? 'live' : 'ok'}"><span class="dot ${syncing ? 'live' : 'ok'}"></span>${syncing ? 'syncing' : 'healthy'}</span></div>
        <div class="status-flow">${heroFlow()}</div>
        <div class="status-eps">
          ${S.endpoints.map((e) => `<button class="ep-row" data-action="open-endpoint" data-arg="${e.id}">
            <span class="dot ${e.status === 'serving' ? 'ok' : e.status === 'paused' ? 'idle' : 'live'}"></span>
            <span class="main-col"><b>${esc(e.name)}</b><small>${e.metricName} ${fmtP(e.metricName, e.metric)} · v${e.version}</small></span>
            ${e.status === 'paused' ? '<span class="pill">paused</span>' : sparkline(e.traffic)}
            <span class="mono ep-num">${e.status === 'paused' ? '—' : compact(e.traffic.reduce((a, b) => a + b, 0))}</span>
          </button>`).join('')}
        </div>
        <div class="card-foot"><span class="footnote">Predictions · last 24h</span><button class="link-btn" data-action="nav" data-to="endpoints">All endpoints ${icon('arrow', 14)}</button></div>
      </section>
    </aside>

    <section class="resume">
      <div class="resume-head"><h2>Pick up where you left off</h2><span class="footnote">your latest work across the workspace</span></div>
      <div class="resume-grid">${resumeCards()}</div>
    </section>
  </div>`;
}

/* ---------- Data ---------- */
function filteredDatasets() {
  const q = S.ui.q.trim().toLowerCase();
  return S.datasets.filter((d) => (S.ui.folder === 'all' || d.folder === S.ui.folder) && (S.ui.typeFilter === 'all' || d.type === S.ui.typeFilter) && (!q || d.name.toLowerCase().includes(q) || (d.sector || '').toLowerCase().includes(q)));
}
function datasetTable() {
  const list = filteredDatasets();
  const sel = S.ui.selected;
  if (!list.length) return `<div class="card-body">${empty('search', 'No tables match', 'Try a different search, folder or type filter.', btn('Clear filters', 'clear-filters', { cls: 'sm' }))}</div>`;
  const allOn = list.every((d) => sel.includes(d.id)), someOn = list.some((d) => sel.includes(d.id));
  if (S.ui.dataView === 'grid') {
    return `<div class="ds-grid">${list.map((d) => `<div class="ds-card ${sel.includes(d.id) ? 'selected' : ''}" data-action="open-dataset" data-arg="${d.id}" role="button" tabindex="0">
      <span class="chk ${sel.includes(d.id) ? 'on' : ''}" data-action="toggle-select" data-arg="${d.id}">${sel.includes(d.id) ? icon('check', 11, 3) : ''}</span>
      <div class="row">${fileIco(d)}</div><b>${esc(d.name)}</b>
      <div class="stats"><span>${compact(d.rows)} rows</span><span>${d.ncols} cols</span><span>${fmtBytes(d.bytes)}</span></div>
      <div class="row"><span class="tag">${esc(d.sector || 'Unclassified')}</span>${d.builtin ? '<span class="tag">built-in</span>' : ''}</div>
    </div>`).join('')}</div>`;
  }
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>
      <th style="width:36px"><span class="chk ${allOn ? 'on' : someOn ? 'part' : ''}" data-action="select-all">${allOn ? icon('check', 11, 3) : ''}</span></th>
      <th>Name</th><th>Type</th><th>Sector</th><th class="num">Rows</th><th class="num">Cols</th><th class="num">Size</th><th class="num">Updated</th><th></th></tr></thead><tbody>
    ${list.map((d) => `<tr class="clickable ${sel.includes(d.id) ? 'selected' : ''}" data-action="open-dataset" data-arg="${d.id}">
      <td><span class="chk ${sel.includes(d.id) ? 'on' : ''}" data-action="toggle-select" data-arg="${d.id}">${sel.includes(d.id) ? icon('check', 11, 3) : ''}</span></td>
      <td><div class="cell-name">${fileIco(d)}<div class="name">${esc(d.name)}<small>${d.conn ? esc(connById(d.conn)?.name || 'connection') : d.builtin ? 'Sample data · built-in' : d.folder === 'synthetic' ? 'Synthetic · generated' : 'Upload'}</small></div></div></td>
      <td><span class="type-chip">${d.type}</span></td>
      <td>${d.sector ? `<span class="tag">${esc(d.sector)}</span>` : '<span class="faint">—</span>'}</td>
      <td class="num">${compact(d.rows)}</td><td class="num">${d.ncols}</td><td class="num">${fmtBytes(d.bytes)}</td><td class="num muted">${ago(d.created)}</td>
      <td class="num"><button class="icon-btn ghost sm" data-action="dataset-menu" data-arg="${d.id}" aria-label="More">${icon('more', 15)}</button></td>
    </tr>`).join('')}</tbody></table></div>`;
}
function pageData() {
  const sel = S.ui.selected.filter((id) => dsById(id));
  S.ui.selected = sel;
  const counts = (f) => S.datasets.filter((d) => d.folder === f).length;
  return `
  ${pageHead('Build · catalogue', 'Data', 'Your connections and tables: the catalogue you run and create endpoints from.', btn('Generate', 'generate', { ico: 'wand' }) + btn('Connect', 'connect', { cls: 'primary', ico: 'plus' }))}
  <div class="stack">
    <div class="notice warn">${icon('alert', 15)}<span class="grow">Personal data stays in the UK (eu-west-2, London) and is never used to train shared models. All records in this demo are synthetic.</span></div>

    <section>
      <div class="row between" style="margin-bottom:10px"><div class="eyebrow">Connections · ${S.connections.length}</div></div>
      ${S.connections.length ? `<div class="stack" style="gap:8px">${S.connections.map((c) => `
        <article class="card conn-card">
          <span class="conn-ico ${c.kind}">${(DB_PROVIDERS.find((p) => p.id === c.kind) || CLOUD_PROVIDERS.find((p) => p.id === c.kind) || { ico: 'API' }).ico}</span>
          <div class="meta"><b>${esc(c.name)} <span class="tag">${c.type}</span></b><small>${esc(c.host)} · ${c.tables} table${c.tables === 1 ? '' : 's'}</small></div>
          <div class="conn-state">${c.status === 'syncing' ? `<span class="spin">${icon('refresh', 13)}</span> syncing…` : `<span class="dot ok"></span><span class="ok">connected</span> · synced ${ago(c.lastSync)}`}</div>
          <button class="icon-btn ghost" data-action="sync-conn" data-arg="${c.id}" title="Sync now" ${c.status === 'syncing' ? 'disabled' : ''}>${icon('refresh', 15)}</button>
          <button class="icon-btn ghost" data-action="delete-conn" data-arg="${c.id}" title="Delete connection">${icon('trash', 15)}</button>
        </article>`).join('')}</div>
        <p class="footnote" style="margin:8px 2px 0">Deleting a connection removes its stored data immediately. No trash, no undo.</p>`
      : `<div class="card pad row between"><span class="muted">No live connections yet. Uploads and samples still work without one.</span>${btn('Connect a database', 'connect', { cls: 'sm', arg: 'db', ico: 'db' })}</div>`}
    </section>

    <section class="card">
      <div class="card-head"><div><div class="eyebrow">All datasets</div><h2>${S.datasets.length} tables · ${compact(S.datasets.reduce((a, d) => a + d.rows, 0))} rows</h2></div>
        <div class="seg"><button class="${S.ui.dataView === 'list' ? 'on' : ''}" data-action="data-view" data-arg="list" aria-label="List view">${icon('list', 14)}</button><button class="${S.ui.dataView === 'grid' ? 'on' : ''}" data-action="data-view" data-arg="grid" aria-label="Grid view">${icon('grid', 14)}</button></div>
      </div>
      <div class="card-body" style="display:grid;gap:12px">
        <div class="toolbar">
          <label class="search">${icon('search', 14)}<input class="input" placeholder="Search all tables…" value="${esc(S.ui.q)}" data-input="data-search" /></label>
          <select class="select" style="width:150px" data-change="type-filter">${['all', 'CSV', 'JSON', 'XLSX', 'TABLE'].map((t) => `<option value="${t}" ${S.ui.typeFilter === t ? 'selected' : ''}>${t === 'all' ? 'All types' : t}</option>`).join('')}</select>
        </div>
        <div class="folders">
          <button class="folder ${S.ui.folder === 'all' ? 'on' : ''}" data-action="folder" data-arg="all">${icon('grid', 14)} All <span class="n">${S.datasets.length}</span></button>
          ${S.folders.map((f) => `<button class="folder ${S.ui.folder === f.id ? 'on' : ''}" data-action="folder" data-arg="${f.id}">${icon(f.conn ? 'db' : 'folder', 14)} ${esc(f.name)} <span class="n">${counts(f.id)}</span>${f.builtin ? '<span class="tag">built-in</span>' : ''}</button>`).join('')}
          <button class="folder dashed" data-action="new-folder">${icon('folderPlus', 14)} New folder</button>
        </div>
        ${sel.length ? `<div class="bulkbar"><b>${sel.length} selected</b><span class="spacer"></span>${btn('Quick run', 'bulk-quick', { cls: 'sm', ico: 'bolt' })}${btn('New run', 'bulk-run', { cls: 'sm', ico: 'flask' })}${btn('Delete', 'bulk-delete', { cls: 'sm', ico: 'trash' })}<button class="icon-btn ghost sm" style="color:inherit" data-action="clear-select" aria-label="Clear selection">${icon('x', 14)}</button></div>` : ''}
      </div>
      <div id="ds-table">${datasetTable()}</div>
    </section>
  </div>`;
}

/* ---------- Run visualisation ---------- */
function runLive(run) {
  const stages = STAGES[run.mode];
  return `<div class="card pad stack" style="gap:14px" id="live-${run.id}">
    <div class="row between"><div class="row">${runPill(run)}<span class="mono muted" style="font-size:11px">${run.id} · ${run.base}</span></div><span class="mono muted" style="font-size:11px">${run.status === 'running' ? `ETA ~${Math.max(1, Math.round((100 - run.progress) / (run.mode === 'quick' ? 7 : 2.2) * .35))}s` : `took ${((run.finished - run.created) / 1000).toFixed(1)}s`}</span></div>
    <div class="stages" style="--n:${stages.length}">${stages.map((s, i) => `<div class="stage ${i < run.stage || run.status === 'completed' ? 'done' : i === run.stage ? 'active' : ''}"><i></i><span>${s}</span></div>`).join('')}</div>
    ${consoleBox(run)}
  </div>`;
}
function consoleBox(run) {
  return `<div class="console"><div class="console-head"><span class="lights"><i></i><i></i><i></i></span><span class="grow">clyra › ${run.mode === 'quick' ? 'quick-run' : 'workspace'} › ${run.id}</span><span>${run.logs.length} lines</span></div>
    <div class="console-body" id="console-${run.id}">${run.logs.map(logLine).join('')}${run.status === 'running' ? '<span class="log-cursor"></span>' : ''}</div></div>`;
}
const logLine = (l) => `<div class="log-line"><span class="t">${clock(l.ts)}</span><span class="lv ${l.lv}">${l.lv === 'ok' ? 'DONE' : l.lv === 'warn' ? 'WARN' : l.lv === 'run' ? 'RUN' : 'INFO'}</span><span class="lmsg">${l.msg}</span></div>`;

function resultView(run) {
  const res = run.result, m = res.metrics, ws = run.mode === 'workspace';
  const predHead = res.task === 'classification' ? ['Entity', 'Predicted', 'P(positive)', 'Confidence'] : res.task === 'regression' ? ['Entity', `Predicted ${res.target}`, '', 'Confidence'] : ['Entity', 'Anomaly score', 'Flag', 'Confidence'];
  return `
  <section class="card">
    <div class="card-head"><div><div class="eyebrow accent">${icon('spark', 12)} ${ws ? 'Held-out result' : 'Quick result · in-context'}</div><h2>${ws ? `${m.primaryName} ${fmtP(m.primaryName, m.primary)} on ${num(res.heldout)} unseen rows` : `${num(res.rows)} rows understood in ${(res.latency / 1000).toFixed(1)}s`}</h2></div>
      ${ws ? `<span class="pill ok">+${((m.primary - m.baseline) * 100).toFixed(1)} pts vs baseline</span>` : '<span class="pill">stateless · no held-out</span>'}</div>
    <div class="result-kpis">
      <div><small>Sector</small><b>${res.sector}</b><span class="mono muted" style="font-size:10.5px">p=${res.sectorConf.toFixed(3)}</span></div>
      <div><small>Task</small><b>${res.task}</b><span class="mono muted" style="font-size:10.5px">${run.task === 'auto' ? 'auto-detected' : 'set by you'}</span></div>
      <div><small>Target</small><b class="mono" style="font-size:15px">${res.target || '—'}</b><span class="mono muted" style="font-size:10.5px">${run.target === 'auto' ? 'smart-target' : run.target}</span></div>
      <div><small>Tables · rows</small><b>${res.tables} · ${compact(res.rows)}</b><span class="mono muted" style="font-size:10.5px">${res.cols} columns</span></div>
      <div><small>Imputed cells</small><b>${compact(res.imputed)}</b><span class="mono muted" style="font-size:10.5px">label-free</span></div>
    </div>
  </section>

  ${ws ? `<section class="grid-2">
    <article class="card">
      <div class="card-head"><div><div class="eyebrow">Held-out metrics</div><h3>Split ${run.holdout}% · ${run.split}${run.leakageGuard ? ' · leakage guard' : ''}</h3></div><button class="link-btn" data-action="nav" data-to="reports">Report ${icon('arrow', 14)}</button></div>
      <div class="metric-big">${m.list.slice(0, 4).map(([k, v], i) => `<div><small>${k}</small><b>${fmtMetric(k, v)}</b>${i === 0 ? `<span class="delta">+${((m.primary - m.baseline) * 100).toFixed(1)} vs GBM baseline</span>` : ''}</div>`).join('')}</div>
    </article>
    <article class="card">
      <div class="card-head"><div><div class="eyebrow">${m.kind === 'classification' ? 'Confusion matrix' : 'Baseline comparison'}</div><h3>${m.kind === 'classification' ? 'Held-out predictions' : 'Clyra vs gradient boosting'}</h3></div></div>
      <div class="card-body">${m.kind === 'classification' ? `<div class="cm"><span></span><span class="h">pred · negative</span><span class="h">pred · positive</span>
        <span class="h">actual · neg</span><span class="c" style="background:var(--surface-3)">${num(m.cm[0][0])}</span><span class="c" style="background:var(--accent-pale);color:var(--accent)">${num(m.cm[0][1])}</span>
        <span class="h">actual · pos</span><span class="c" style="background:var(--accent-pale);color:var(--accent)">${num(m.cm[1][0])}</span><span class="c" style="background:var(--btn-primary);color:var(--btn-primary-ink)">${num(m.cm[1][1])}</span></div>`
      : `<div class="bars"><div class="bar-row"><span>clyra · ${run.base}</span><div class="track"><i style="width:${m.primary * 100}%"></i></div><b>${fmtP(m.primaryName, m.primary)}</b></div><div class="bar-row"><span>gbm baseline</span><div class="track"><i style="width:${m.baseline * 100}%;background:var(--faint)"></i></div><b>${fmtP(m.primaryName, m.baseline)}</b></div></div>`}</div>
    </article>
  </section>` : ''}

  <section class="grid-2">
    <article class="card">
      <div class="card-head"><div><div class="eyebrow">${res.mapping.length ? 'Key-less cross-table mapping' : 'Intra-table structure'}</div><h3>${res.mapping.length ? `${res.mapping.length} links found across ${res.tables} tables` : 'Strongest column relationships'}</h3></div></div>
      <div class="card-body"><div class="map-list">${res.mapping.length ? res.mapping.map((x) => `<div class="map-row"><span class="col">${esc(x.ca)}<small>${esc(x.a)}</small></span><span class="lnk"></span><span class="col">${esc(x.cb)}<small>${esc(x.b)}</small></span><span class="conf">${x.conf.toFixed(2)}</span></div>`).join('')
        : res.intra.map((x) => `<div class="map-row"><span class="col">${esc(x.a)}</span><span class="lnk"></span><span class="col">${esc(x.b)}</span><span class="conf">r ${x.r}</span></div>`).join('')}</div>
        ${res.mapping.length ? `<p class="footnote" style="margin:10px 0 0">No shared keys used · evidence: ${[...new Set(res.mapping.map((x) => x.evidence))].join(' · ')}</p>` : ''}</div>
    </article>
    <article class="card">
      <div class="card-head"><div><div class="eyebrow">Signals</div><h3>What drives ${res.target ? `<span class="mono">${res.target}</span>` : 'the anomaly score'}</h3></div></div>
      <div class="card-body"><div class="bars">${res.signals.map((s) => `<div class="bar-row"><span>${esc(s.name)}</span><div class="track"><i style="width:${s.w * 100}%"></i></div><b>${s.w.toFixed(2)}</b></div>`).join('')}</div></div>
    </article>
  </section>

  <section class="card">
    <div class="card-head"><div><div class="eyebrow">Predictions preview</div><h3>First rows of ${num(res.rows)}</h3></div>${btn('Export CSV', 'export-preds', { cls: 'sm', arg: run.id, ico: 'upload' })}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr>${predHead.map((h, i) => `<th class="${i ? 'num' : ''}">${h}</th>`).join('')}</tr></thead><tbody>
      ${res.predictions.map((p) => `<tr><td class="mono">${esc(p.key)}</td>
        ${res.task === 'classification' ? `<td class="num"><span class="pill ${p.label === 'high' ? 'live' : p.label === 'medium' ? 'warn' : ''}">${p.label}</span></td><td class="num">${p.p.toFixed(3)}</td>` : res.task === 'regression' ? `<td class="num"><b>${p.value}</b></td><td></td>` : `<td class="num">${p.score.toFixed(3)}</td><td class="num">${p.flag ? '<span class="pill err">anomaly</span>' : '<span class="faint">—</span>'}</td>`}
        <td class="num">${pct(p.conf, 0)}</td></tr>`).join('')}
    </tbody></table></div>
  </section>

  ${res.imputeCols.length ? `<section class="card">
    <div class="card-head"><div><div class="eyebrow">Label-free imputation</div><h3>Columns completed in-context</h3></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Column</th><th class="num">Missing</th><th class="num">Filled</th><th>Method</th></tr></thead><tbody>
      ${res.imputeCols.map((c) => `<tr><td class="mono">${c.name}</td><td class="num">${c.missing}%</td><td class="num">${num(c.filled)}</td><td><span class="tag accent">in-context · ${run.base}</span></td></tr>`).join('')}
    </tbody></table></div>
  </section>` : ''}`;
}

/* ---------- Quick Run ---------- */
function pageQuickRun() {
  const q = S.qr;
  q.datasets = q.datasets.filter((id) => dsById(id));
  const ds = q.datasets.map(dsById);
  const last = q.lastRunId && runById(q.lastRunId);
  const targetCols = ds[0] ? datasetColumns(ds[0]).filter((c) => c.type !== 'id') : [];
  const radio = (group, val, label, sub = '') => `<button class="radio ${q[group] === val ? 'on' : ''}" data-action="qr-set" data-arg="${group}:${val}"><span class="rdot"></span>${label}${sub ? ` <small>${sub}</small>` : ''}</button>`;
  return `
  ${pageHead('Build · stateless', 'Quick Run', 'A stateless pass on the frozen base. Full bundle in one shot, nothing saved, predictions in-context with no held-out.', '<span class="pill">stateless · no held-out</span>')}
  <div class="stack">
    <section class="card">
      <div class="card-head"><div><div class="eyebrow">01</div><h2>Select data</h2></div><span class="footnote">no shared keys · no labels · no preprocessing</span></div>
      <div class="card-body" style="display:grid;gap:12px">
        <div class="row wrap">${btn('Connect', 'connect', { cls: 'sm', ico: 'plus' })}${btn('Generate', 'generate', { cls: 'sm', ico: 'wand' })}${btn('Pick from samples', 'pick-tables', { cls: 'sm', arg: 'qr:samples' })}${btn('Select tables', 'pick-tables', { cls: 'sm', arg: 'qr', ico: 'table' })}</div>
        ${ds.length ? `<div class="selected-tables">${ds.map((d, i) => `<span class="table-chip">${fileIco(d)}${esc(d.name)} <small>${compact(d.rows)} × ${d.ncols}</small>${i === 0 ? '<span class="tag accent">primary</span>' : ''}<button data-action="qr-remove" data-arg="${d.id}" aria-label="Remove">${icon('x', 12)}</button></span>`).join('')}</div>
          ${ds.length > 1 ? `<div class="notice accent">${icon('link', 14)}<span class="grow">${ds.length} tables selected. Clyra will map them to each other without shared keys before predicting.</span></div>` : ''}`
        : `<div class="dropzone-sm">No tables yet. Add one or more to run.</div>`}
      </div>
    </section>

    <section class="card">
      <div class="card-head"><div><div class="eyebrow">02</div><h2>Configure</h2></div></div>
      <div class="config-grid">
        <span class="label">Base</span>
        <div><select class="select" style="max-width:320px" data-change="qr-base">${BASES.map((b) => `<option value="${b.id}" ${q.base === b.id ? 'selected' : ''}>${b.id} · ${b.note}</option>`).join('')}</select></div>
        <span class="label">Target</span>
        <div class="row wrap">${radio('target', 'auto', 'auto', 'smart-target')}${radio('target', 'pick', 'pick column')}${radio('target', 'none', 'none')}
          ${q.target === 'pick' ? `<select class="select" style="width:220px" data-change="qr-targetcol" ${targetCols.length ? '' : 'disabled'}>${targetCols.length ? targetCols.map((c) => `<option value="${c.name}" ${q.targetCol === c.name ? 'selected' : ''}>${c.name} · ${c.type}</option>`).join('') : '<option>Select a table first</option>'}</select>` : ''}</div>
        <span class="label">Task</span>
        <div class="row wrap">${radio('task', 'auto', 'auto')}${radio('task', 'classification', 'classification')}${radio('task', 'regression', 'regression')}${radio('task', 'anomaly', 'anomaly')}</div>
      </div>
      <div class="card-foot">
        <span class="footnote">${ds.length ? `≈ ${(0.4 + ds.reduce((a, d) => a + d.rows, 0) / 60000).toFixed(1)} CU · ~5s` : 'Select at least one table'}</span>
        <div class="row"><span class="muted" style="font-size:12px">Want a held-out score and a servable endpoint?</span><button class="link-btn" data-action="qr-to-workspace">Continue in Workspace ${icon('arrow', 14)}</button>${btn('Run', 'qr-run', { cls: 'accent', ico: 'play', disabled: !ds.length || (last && last.status === 'running'), kbd: '⌘↵' })}</div>
      </div>
    </section>

    ${last ? `<div class="row between" style="margin-top:6px"><div class="eyebrow">03 · Result · ${esc(last.name)}</div>${last.status === 'completed' ? `<button class="link-btn" data-action="nav" data-to="run/${last.id}">Open run page ${icon('arrow', 14)}</button>` : ''}</div>
      ${last.status === 'running' ? runLive(last) : resultView(last) + `<div class="notice accent">${icon('flask', 15)}<span class="grow"><b>This result isn’t saved or scored.</b> Run the same setup in the Workspace to get a held-out score and serve it as an endpoint.</span>${btn('Continue in Workspace', 'qr-to-workspace', { cls: 'primary sm' })}</div>`}` : ''}
  </div>`;
}

/* ---------- Workspace ---------- */
function pageWorkspace() {
  const ws = S.runs.filter((r) => r.mode === 'workspace');
  const quick = S.runs.filter((r) => r.mode === 'quick');
  return `
  ${pageHead('Build · persistent', 'Workspace', 'Fit on your tables with a held-out split. Every run is versioned, scored and ready to serve as an endpoint.', btn('New run', 'nav', { cls: 'primary', to: 'workspace/new', ico: 'plus' }))}
  <div class="stack">
    <section class="card">
      <div class="card-head"><div><div class="eyebrow">Runs · ${ws.length}</div><h2>Workspace runs</h2></div></div>
      ${ws.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Run</th><th>Tables</th><th>Task · target</th><th>Status</th><th>Held-out</th><th>Endpoint</th><th class="num">Started</th></tr></thead><tbody>
        ${ws.map((r) => { const ep = S.endpoints.find((e) => e.runId === r.id); return `<tr class="clickable" data-action="nav" data-to="run/${r.id}">
          <td class="name">${esc(r.name)}<small>${r.id} · ${r.base}${r.by ? ` · ${esc(memberName(r.by))}` : ''}</small></td>
          <td class="mono" style="font-size:11.5px">${r.datasets.length} · ${compact(r.result.rows)} rows</td>
          <td><span class="tag">${r.result.task}</span> <span class="mono muted" style="font-size:11px">${r.result.target || ''}</span></td>
          <td>${runPill(r)}</td><td>${runMetric(r)}</td>
          <td>${ep ? `<span class="pill ok">${esc(ep.name)}</span>` : r.status === 'completed' ? `<button class="btn sm" data-action="create-endpoint" data-arg="${r.id}">${icon('layers', 13)}Create</button>` : '<span class="faint">—</span>'}</td>
          <td class="num muted">${ago(r.created)}</td></tr>`; }).join('')}
      </tbody></table></div>` : `<div class="card-body">${empty('flask', 'No workspace runs yet', 'A workspace run fits on your data with a held-out split, so you know how well it will do on rows it has never seen.', btn('New run', 'nav', { cls: 'primary sm', to: 'workspace/new', ico: 'plus' }))}</div>`}
    </section>
    <section class="card">
      <div class="card-head"><div><div class="eyebrow">Stateless</div><h2>Quick runs</h2><div class="sub">Not saved to the workspace, only kept here for this session only.</div></div>${btn('Quick run', 'nav', { cls: 'sm', to: 'quick-run', ico: 'bolt' })}</div>
      ${quick.length ? quick.map((r) => `<button class="list-row" data-action="nav" data-to="run/${r.id}"><span class="file-ico">${icon('bolt', 14)}</span><span class="main-col"><b>${esc(r.name)}</b><small>${r.id} · ${r.base} · ${r.result.task}</small></span>${runPill(r)}<span class="mono muted" style="font-size:11px;width:70px;text-align:right">${ago(r.created)}</span></button>`).join('') : `<div class="card-body"><p class="muted" style="margin:0">No quick runs yet.</p></div>`}
    </section>
  </div>`;
}

function pageWizard() {
  if (!S.wiz) S.wiz = { step: 0, datasets: [], target: 'auto', targetCol: '', task: 'auto', base: 'clyra-2', holdout: 20, split: 'random', seed: 42, leakageGuard: true, name: '' };
  const w = S.wiz;
  w.datasets = w.datasets.filter((id) => dsById(id));
  const ds = w.datasets.map(dsById);
  const steps = [['Data', `${ds.length || 'no'} table${ds.length === 1 ? '' : 's'}`], ['Target & task', w.target === 'pick' ? w.targetCol || 'pick a column' : w.target], ['Validation', `${w.holdout}% held-out · ${w.split}`], ['Review & launch', 'estimate']];
  const canNext = w.step !== 0 || ds.length > 0;
  const radio = (group, val, label, sub = '') => `<button class="radio ${w[group] === val ? 'on' : ''}" data-action="wiz-set" data-arg="${group}:${val}"><span class="rdot"></span>${label}${sub ? ` <small>${sub}</small>` : ''}</button>`;
  const rows = ds.reduce((a, d) => a + d.rows, 0);
  const cu = (2 + rows / 9000) * (w.base === 'clyra-2.1-preview' ? 1.6 : w.base === 'clyra-2-mini' ? .5 : 1);
  let body = '';
  if (w.step === 0) {
    body = `<div class="card-head"><div><div class="eyebrow">Step 1 of 4</div><h2>Choose tables</h2><div class="sub">Pick one or more. The first is the primary table; others are mapped to it without shared keys.</div></div>${btn('Connect', 'connect', { cls: 'sm', ico: 'plus' })}</div>
      <div class="card-body"><div class="pick-list">${S.datasets.map((d) => { const on = w.datasets.includes(d.id); const idx = w.datasets.indexOf(d.id); return `<button class="pick ${on ? 'on' : ''}" data-action="wiz-ds" data-arg="${d.id}"><span class="chk ${on ? 'on' : ''}">${on ? icon('check', 11, 3) : ''}</span>${fileIco(d)}<span class="grow"><b>${esc(d.name)}</b><small>${compact(d.rows)} rows · ${d.ncols} cols · ${esc(d.sector || '—')}</small></span>${on ? `<span class="tag ${idx === 0 ? 'accent' : ''}">${idx === 0 ? 'primary' : 'linked #' + idx}</span>` : ''}</button>`; }).join('')}</div></div>`;
  } else if (w.step === 1) {
    const cols = ds[0] ? datasetColumns(ds[0]).filter((c) => c.type !== 'id') : [];
    body = `<div class="card-head"><div><div class="eyebrow">Step 2 of 4</div><h2>Target & task</h2><div class="sub">Let Clyra pick the most predictable target, or choose one yourself.</div></div></div>
      <div class="config-grid">
        <span class="label">Target</span><div class="row wrap">${radio('target', 'auto', 'auto', 'smart-target')}${radio('target', 'pick', 'pick column')}${radio('target', 'none', 'none', 'unsupervised')}</div>
        ${w.target === 'pick' ? `<span class="label">Column</span><div><select class="select" style="max-width:320px" data-change="wiz-targetcol">${cols.map((c) => `<option value="${c.name}" ${w.targetCol === c.name ? 'selected' : ''}>${c.name} · ${c.type}${c.isTarget ? ' · suggested' : ''}</option>`).join('')}</select></div>` : ''}
        <span class="label">Task</span><div class="row wrap">${radio('task', 'auto', 'auto')}${radio('task', 'classification', 'classification')}${radio('task', 'regression', 'regression')}${radio('task', 'anomaly', 'anomaly')}</div>
        <span class="label">Base model</span><div><select class="select" style="max-width:360px" data-change="wiz-base">${BASES.map((b) => `<option value="${b.id}" ${w.base === b.id ? 'selected' : ''}>${b.id} · ${b.note}</option>`).join('')}</select></div>
        <span class="label">Run name</span><div><input class="input" style="max-width:360px" placeholder="${esc(ds[0] ? ds[0].name.replace(/\.\w+$/, '') + ' · ' + (w.target === 'pick' ? w.targetCol : 'auto') : 'My run')}" value="${esc(w.name)}" data-input="wiz-name" /></div>
      </div>`;
  } else if (w.step === 2) {
    body = `<div class="card-head"><div><div class="eyebrow">Step 3 of 4</div><h2>Validation</h2><div class="sub">Rows held out are never seen during fitting. They produce the score in your report.</div></div></div>
      <div class="config-grid">
        <span class="label">Held-out</span><div style="display:grid;gap:8px;max-width:440px"><input type="range" class="range" min="10" max="40" step="5" value="${w.holdout}" data-input="wiz-holdout" /><div class="split-viz"><div class="tr" style="flex:${100 - w.holdout}">train ${100 - w.holdout}%</div><div class="ho" style="flex:${w.holdout}">${w.holdout}%</div></div><span class="hint">${num(Math.round(rows * w.holdout / 100))} rows held out</span></div>
        <span class="label">Split</span><div class="seg"><button class="${w.split === 'random' ? 'on' : ''}" data-action="wiz-set" data-arg="split:random">Random</button><button class="${w.split === 'time' ? 'on' : ''}" data-action="wiz-set" data-arg="split:time">Time-based</button><button class="${w.split === 'grouped' ? 'on' : ''}" data-action="wiz-set" data-arg="split:grouped">Grouped by entity</button></div>
        <span class="label">Seed</span><div><input class="input mono" style="width:120px" value="${w.seed}" data-input="wiz-seed" /></div>
        <span class="label">Leakage guard</span><div class="row"><button class="switch ${w.leakageGuard ? 'on' : ''}" data-action="wiz-toggle" data-arg="leakageGuard" aria-label="Leakage guard"></button><span class="muted" style="font-size:12px">Drop columns that are near-duplicates of the target</span></div>
      </div>
      ${w.split === 'random' && ds.some((d) => /invitation|reminder|result|trip|payment|case|quote|hourly|event|note/i.test(d.name)) ? `<div class="card-body"><div class="notice warn">${icon('alert', 15)}<span class="grow">These tables look time-ordered. A time-based or grouped split gives a more honest score.</span>${btn('Use time-based', 'wiz-set', { cls: 'sm', arg: 'split:time' })}</div></div>` : ''}`;
  } else {
    body = `<div class="card-head"><div><div class="eyebrow">Step 4 of 4</div><h2>Review & launch</h2></div></div>
      <div class="card-body"><dl class="review-list">
        <dt>tables</dt><dd>${ds.map((d) => esc(d.name)).join(', ')}</dd>
        <dt>rows</dt><dd class="mono">${num(rows)}</dd>
        <dt>target</dt><dd>${w.target === 'pick' ? `<span class="mono">${w.targetCol}</span>` : w.target}</dd>
        <dt>task</dt><dd>${w.task}</dd>
        <dt>base</dt><dd class="mono">${w.base}</dd>
        <dt>validation</dt><dd>${w.holdout}% held-out · ${w.split} · seed ${w.seed} · leakage guard ${w.leakageGuard ? 'on' : 'off'}</dd>
        <dt>estimate</dt><dd class="mono">≈ ${cu.toFixed(1)} CU · ~15s · ${(S.usage.limit - S.usage.used).toFixed(1)} CU left</dd>
      </dl></div>`;
  }
  return `
  ${pageHead('Workspace · new run', 'New run', 'Configure a persistent run. You’ll get a held-out report and can serve it as an endpoint.')}
  <div class="wizard">
    <nav class="card wiz-steps">${steps.map(([t, s], i) => `<button class="wiz-step ${i === w.step ? 'on' : ''} ${i < w.step ? 'done' : ''}" data-action="wiz-go" data-arg="${i}" ${i > 0 && !ds.length ? 'disabled' : ''}><span class="step-num">${i < w.step ? icon('check', 11, 2.6) : i + 1}</span><span>${t}<small>${esc(s)}</small></span></button>`).join('')}</nav>
    <section class="card">${body}
      <div class="card-foot">${w.step ? btn('Back', 'wiz-go', { arg: w.step - 1, ico: 'left' }) : btn('Cancel', 'wiz-cancel', { cls: 'ghost' })}
        ${w.step < 3 ? btn('Continue', 'wiz-go', { cls: 'primary', arg: w.step + 1, disabled: !canNext }) : btn('Launch run', 'wiz-launch', { cls: 'accent', ico: 'play' })}</div>
    </section>
  </div>`;
}

function pageRun(id) {
  const run = runById(id);
  if (!run) return pageHead('', 'Run not found', 'It may have been a quick run from another session.') + empty('flask', 'Nothing here', 'Go back to the workspace to see all runs.', btn('Workspace', 'nav', { cls: 'primary sm', to: 'workspace' }));
  const ep = S.endpoints.find((e) => e.runId === run.id);
  const dss = run.datasets.map(dsById).filter(Boolean);
  let actions = '';
  if (run.status === 'completed') {
    if (run.mode === 'workspace') actions = (ep ? btn('View endpoint', 'open-endpoint', { arg: ep.id, ico: 'layers' }) : btn('Create endpoint', 'create-endpoint', { cls: 'primary', arg: run.id, ico: 'layers' })) + btn('Re-run', 'rerun', { arg: run.id, ico: 'refresh' });
    else actions = btn('Continue in Workspace', 'run-to-workspace', { cls: 'primary', arg: run.id, ico: 'flask' });
  } else if (run.status === 'running') actions = btn('Cancel run', 'cancel-run', { cls: 'danger', arg: run.id, ico: 'x' });
  return `
  ${pageHead(`${run.mode === 'quick' ? 'Quick run' : 'Workspace run'} · <span class="mono">${run.id}</span>`, esc(run.name), `${dss.map((d) => esc(d.name)).join(' + ')} · ${run.base} · started ${ago(run.created)}`, actions)}
  <div class="stack">
    ${run.status === 'running' ? runLive(run) : run.status === 'failed' ? `<div class="notice warn">${icon('alert', 15)}<span class="grow">Run cancelled. No compute was billed after cancellation.</span>${btn('Re-run', 'rerun', { cls: 'sm', arg: run.id })}</div>${consoleBox(run)}` : resultView(run) + `<details class="card"><summary class="card-head" style="cursor:pointer;list-style:none"><div><div class="eyebrow">Logs</div><h3>${run.logs.length} lines</h3></div>${icon('down', 16)}</summary><div class="card-body">${consoleBox(run)}</div></details>`}
  </div>`;
}

/* ---------- Endpoints ---------- */
function pageEndpoints() {
  const eps = S.endpoints;
  const reqs = eps.reduce((a, e) => a + e.requests, 0);
  const ready = S.runs.filter((r) => r.mode === 'workspace' && r.status === 'completed' && !eps.some((e) => e.runId === r.id));
  return `
  ${pageHead('Deploy', 'Endpoints', 'Finished runs served as versioned prediction APIs. Refresh on new data or upgrade the base. Every change emits a held-out report.', btn('API & keys', 'nav', { to: 'api', ico: 'key' }) + btn('Create endpoint', 'create-endpoint', { cls: 'primary', ico: 'plus', disabled: !ready.length, title: ready.length ? '' : 'Finish a workspace run first' }))}
  <div class="stack">
    <section class="grid-3">
      <article class="card kpi"><div class="label"><span>Serving</span><span class="dot ${eps.some((e) => e.status === 'serving') ? 'ok' : 'idle'}"></span></div><div class="value">${eps.filter((e) => e.status === 'serving').length}<small>/ ${eps.length}</small></div><div class="meta">autoscaling · ${S.workspace.region}</div></article>
      <article class="card kpi"><div class="label"><span>Predictions</span>${icon('activity', 14)}</div><div class="value" data-total-req>${num(reqs)}</div><div class="meta">all time · live counter</div></article>
      <article class="card kpi"><div class="label"><span>Latency</span>${icon('gauge', 14)}</div><div class="value">${eps.length ? Math.round(eps.reduce((a, e) => a + e.p50, 0) / eps.length) : 0}<small>ms p50</small></div><div class="meta">p95 ${eps.length ? Math.round(eps.reduce((a, e) => a + e.p95, 0) / eps.length) : 0}ms</div></article>
    </section>
    ${ready.length ? `<div class="notice accent">${icon('spark', 15)}<span class="grow"><b>${ready.length} finished run${ready.length > 1 ? 's' : ''}</b> ready to serve: ${ready.map((r) => esc(r.name)).join(', ')}</span>${btn('Create endpoint', 'create-endpoint', { cls: 'sm primary', arg: ready[0].id })}</div>` : ''}
    <section class="card">
      ${eps.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Endpoint</th><th>Status</th><th>Task · target</th><th>Held-out</th><th>Version</th><th class="num">p50</th><th class="num">Requests</th><th>24h</th><th></th></tr></thead><tbody>
        ${eps.map((e) => `<tr class="clickable" data-action="open-endpoint" data-arg="${e.id}">
          <td class="name">${esc(e.name)}<small>${e.id}</small></td>
          <td>${e.status === 'serving' ? '<span class="pill ok"><span class="dot ok"></span>serving</span>' : e.status === 'paused' ? '<span class="pill">paused</span>' : `<span class="pill live"><span class="dot live"></span>${e.status}</span>`}</td>
          <td><span class="tag">${e.task}</span> <span class="mono muted" style="font-size:11px">${e.target || ''}</span></td>
          <td class="mono">${e.metricName} <b>${fmtP(e.metricName, e.metric)}</b></td>
          <td class="mono">v${e.version} · ${e.base}</td>
          <td class="num">${e.p50}ms</td><td class="num" data-ep-req="${e.id}">${num(e.requests)}</td>
          <td>${sparkline(e.traffic)}</td>
          <td class="num">${icon('right', 15)}</td></tr>`).join('')}
      </tbody></table></div>` : `<div class="card-body" style="padding-top:18px">${empty('layers', 'No endpoints yet', 'Finish a workspace run, then serve it here as a versioned API with its own held-out report.', ready.length ? btn('Create endpoint', 'create-endpoint', { cls: 'primary sm', arg: ready[0].id }) : btn('New workspace run', 'nav', { cls: 'primary sm', to: 'workspace/new', ico: 'plus' }))}</div>`}
    </section>
  </div>`;
}

/* ---------- API & MCP ---------- */
const lit = (v) => (typeof v === 'number' ? `<span class="n">${v}</span>` : `<span class="s">"${esc(v)}"</span>`);
const pyRow = (ep) => `{${Object.entries(sampleFields(ep)).map(([k, v]) => `<span class="s">"${esc(k)}"</span>: ${lit(v)}`).join(', ')}}`;
const jsRow = (ep) => `{ ${Object.entries(sampleFields(ep)).map(([k, v]) => `${esc(k)}: ${lit(v)}`).join(', ')} }`;
function codeSample(lang, ep, key = 'cly_live_••••••••') {
  const id = ep ? ep.id : 'ep_xxxxxx';
  if (lang === 'python') return `<span class="k">from</span> clyra <span class="k">import</span> Clyra\n\nclient = Clyra(api_key=<span class="s">"${key}"</span>)\nresult = client.endpoints.predict(\n    <span class="s">"${id}"</span>,\n    rows=[${pyRow(ep)}],\n)\n<span class="k">print</span>(result.predictions[<span class="n">0</span>])`;
  if (lang === 'js') return `<span class="k">import</span> Clyra <span class="k">from</span> <span class="s">"@clyra/sdk"</span>;\n\n<span class="k">const</span> clyra = <span class="k">new</span> Clyra({ apiKey: <span class="s">"${key}"</span> });\n<span class="k">const</span> res = <span class="k">await</span> clyra.endpoints.predict(<span class="s">"${id}"</span>, {\n  rows: [${jsRow(ep)}],\n});`;
  return `curl https://api.clyra.ai/v1/endpoints/${id}/predict \\\n  -H <span class="s">"Authorization: Bearer ${key}"</span> \\\n  -H <span class="s">"Content-Type: application/json"</span> \\\n  -d <span class="s">'${esc(JSON.stringify({ rows: [sampleFields(ep)] }))}'</span>`;
}
function pageApi() {
  const lang = S.ui.codeLang || 'curl';
  const ep = S.endpoints[0];
  const mcp = `{\n  <span class="s">"mcpServers"</span>: {\n    <span class="s">"clyra"</span>: {\n      <span class="s">"command"</span>: <span class="s">"npx"</span>,\n      <span class="s">"args"</span>: [<span class="s">"-y"</span>, <span class="s">"@clyra/mcp"</span>],\n      <span class="s">"env"</span>: { <span class="s">"CLYRA_API_KEY"</span>: <span class="s">"${S.keys[0] ? S.keys[0].prefix + '••••' : 'cly_live_••••'}"</span> }\n    }\n  }\n}`;
  return `
  ${pageHead('Deploy · developers', 'API & MCP', 'Call your endpoints from your product, notebooks or agents. Keys are shown once and stored hashed.', btn('Docs', 'help', { ico: 'book' }) + btn('Create API key', 'create-key', { cls: 'primary', ico: 'plus' }))}
  <div class="stack">
    <section class="card">
      <div class="card-head"><div><div class="eyebrow">Keys · ${S.keys.length}</div><h2>API keys</h2></div></div>
      ${S.keys.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Key</th><th>Scope</th><th class="num">Created</th><th class="num">Last used</th><th></th></tr></thead><tbody>
        ${S.keys.map((k) => `<tr><td class="name">${esc(k.name)}<small>${k.id}</small></td><td class="mono">${k.prefix}••••••••</td><td><span class="tag">${k.scope}</span></td><td class="num muted">${ago(k.created)}</td><td class="num muted">${k.lastUsed ? ago(k.lastUsed) : 'never'}</td><td class="num"><button class="btn sm danger" data-action="revoke-key" data-arg="${k.id}">Revoke</button></td></tr>`).join('')}
      </tbody></table></div>` : `<div class="card-body">${empty('key', 'No API keys', 'Create a key to call endpoints over REST or connect Clyra to an agent via MCP.', btn('Create API key', 'create-key', { cls: 'primary sm', ico: 'plus' }))}</div>`}
    </section>
    <section class="grid-2 even">
      <article class="card">
        <div class="card-head"><div><div class="eyebrow">REST</div><h2>Quickstart</h2><div class="sub mono" style="font-size:11px">POST https://api.clyra.ai/v1/endpoints/{id}/predict</div></div></div>
        <div class="card-body"><div class="code-tabs">${['curl', 'python', 'js'].map((l) => `<button class="${lang === l ? 'on' : ''}" data-action="code-lang" data-arg="${l}">${l}</button>`).join('')}</div>
          <div class="code"><button class="copy" data-action="copy-code">${icon('copy', 12)}copy</button>${codeSample(lang, ep)}</div></div>
      </article>
      <article class="card">
        <div class="card-head"><div><div class="eyebrow accent">${icon('plug', 12)} MCP · new</div><h2>Use Clyra from any agent</h2><div class="sub">Expose your endpoints and reports as MCP tools.</div></div></div>
        <div class="card-body"><div class="code"><button class="copy" data-action="copy-code">${icon('copy', 12)}copy</button>${mcp}</div>
          <div class="row wrap" style="margin-top:10px"><span class="tag">list_endpoints</span><span class="tag">predict</span><span class="tag">get_report</span><span class="tag">describe_table</span></div></div>
      </article>
    </section>
    <section class="grid-3">
      <article class="card pad"><div class="eyebrow">Rate limit</div><h3 style="margin:8px 0 4px;font-size:20px;font-weight:500">600 <span class="muted" style="font-size:13px">req / min</span></h3><p class="footnote" style="margin:0">per key · burst 1,200</p></article>
      <article class="card pad"><div class="eyebrow">Region</div><h3 style="margin:8px 0 4px;font-size:20px;font-weight:500">${S.workspace.region}${S.workspace.regionName ? ` <span class="muted" style="font-size:13px">${S.workspace.regionName}</span>` : ''}</h3><p class="footnote" style="margin:0">${S.workspace.ukGdpr ? 'UK GDPR · data stays in the UK' : 'data stays in region'}</p>${S.workspace.deployment ? `<p class="footnote" style="margin:4px 0 0">Deployment: ${esc(S.workspace.deployment.charAt(0).toLowerCase() + S.workspace.deployment.slice(1))}</p>` : ''}</article>
      <article class="card pad"><div class="eyebrow">Retention</div><h3 style="margin:8px 0 4px;font-size:20px;font-weight:500">0 days</h3><p class="footnote" style="margin:0">prediction payloads are not stored</p></article>
    </section>
  </div>`;
}

/* ---------- Reports ---------- */
function pageReports() {
  const f = S.ui.reportFilter;
  const list = S.reports.filter((r) => (f.ep === 'all' || r.endpointId === f.ep) && (f.op === 'all' || r.op === f.op) && (!f.pinned || r.pinned));
  const sel = S.ui.reportSel.filter((id) => repById(id));
  S.ui.reportSel = sel;
  return `
  ${pageHead('Understand · trust ledger', 'Reports', 'Held-out reports from every create, refresh and upgrade. Immutable, hashed, comparable.', btn(`Compare${sel.length ? ` (${sel.length}/2)` : ''}`, 'compare-reports', { cls: sel.length === 2 ? 'primary' : '', ico: 'compare', disabled: sel.length !== 2, title: 'Select two reports' }))}
  <div class="stack">
    <div class="toolbar">
      <select class="select" style="width:220px" data-change="rep-ep"><option value="all">All endpoints</option>${S.endpoints.map((e) => `<option value="${e.id}" ${f.ep === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select>
      <select class="select" style="width:150px" data-change="rep-op">${['all', 'create', 'refresh', 'upgrade'].map((o) => `<option value="${o}" ${f.op === o ? 'selected' : ''}>${o === 'all' ? 'All ops' : o}</option>`).join('')}</select>
      <button class="btn ${f.pinned ? 'primary' : ''}" data-action="rep-pinned">${icon('star', 14)}Pinned</button>
      <span class="spacer"></span><span class="footnote">${sel.length === 2 ? 'Ready to compare' : sel.length ? 'Select one more to compare' : 'Tick two reports to compare them side by side'}</span>
    </div>
    ${list.length ? `<div class="grid-3">${list.map((r) => `
      <article class="card report-card ${sel.includes(r.id) ? 'selected' : ''}" data-action="open-report" data-arg="${r.id}" role="button" tabindex="0">
        <div class="top"><span class="chk ${sel.includes(r.id) ? 'on' : ''}" data-action="rep-select" data-arg="${r.id}">${sel.includes(r.id) ? icon('check', 11, 3) : ''}</span><span class="pill ${r.op === 'create' ? 'info' : r.op === 'upgrade' ? 'live' : 'ok'}">${r.op}</span><span class="mono muted" style="font-size:10.5px">v${r.version}</span><button class="star ${r.pinned ? 'on' : ''}" data-action="rep-pin" data-arg="${r.id}" aria-label="Pin">${icon('star', 15)}</button></div>
        <div><h3>${esc(r.endpointName)}</h3><div class="hash">${r.id} · sha256:${r.hash.slice(0, 12)}…</div></div>
        <div class="nums"><div><small>${r.metrics.primaryName}</small><b>${fmtP(r.metrics.primaryName, r.metrics.primary)}</b></div><div><small>Held-out</small><b>${compact(r.heldout)}</b></div><div><small>Base</small><b style="font-size:11px">${r.base}</b></div></div>
        <div class="row between"><span class="footnote">${r.split}</span><span class="footnote">${ago(r.created)}</span></div>
      </article>`).join('')}</div>`
    : empty('report', S.reports.length ? 'No reports match' : 'No reports yet', S.reports.length ? 'Change the filters to see more.' : 'Create an endpoint to emit one. Every refresh and upgrade adds a new, comparable entry.', S.reports.length ? '' : btn('Go to endpoints', 'nav', { cls: 'primary sm', to: 'endpoints' }))}
  </div>`;
}

/* ---------- Chat ---------- */
/* ---------- Interactive chat charts ---------- */
const CHARTS = {};
const CC_COLORS = ['var(--accent)', 'var(--cc-2)', 'var(--cc-3)'];
function chartBlock(c) {
  const cid = 'cc' + hex(6);
  CHARTS[cid] = { ...c, hidden: [], range: c.range || c.x.length };
  return chartHTML(cid);
}
function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); return Math.ceil((v * 1.12) / p) * p; }
function chartHTML(cid) {
  const c = CHARTS[cid];
  const W = 640, H = 230, L = 40, Rr = 14, T = 14, B = 30;
  const start = c.kind === 'line' ? c.x.length - c.range : 0;
  const xs = c.x.slice(start);
  const vis = c.series.map((s, i) => ({ ...s, i, values: s.values.slice(start) })).filter((s) => !c.hidden.includes(s.i));
  const max = niceMax(Math.max(1e-9, ...vis.flatMap((s) => s.values)));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const fmt = (v) => (c.unit === '%' ? v.toFixed(1) + '%' : c.unit === 'h' ? v.toFixed(1) + ' h' : Number.isInteger(v) ? String(v) : v.toFixed(2));
  let grid = '';
  for (let g = 0; g <= 4; g++) { const v = (max / 4) * g, yy = y(v); grid += `<line class="cc-grid" x1="${L}" x2="${W - Rr}" y1="${yy}" y2="${yy}"/><text class="cc-ylab" x="${L - 8}" y="${yy + 3}" text-anchor="end">${c.unit === '%' ? Math.round(v) + '%' : c.unit === 'h' ? Math.round(v) + 'h' : Math.round(v * 100) / 100}</text>`; }
  let body = '', hits = '';
  if (c.kind === 'line') {
    const step = (W - L - Rr) / (xs.length - 1), X = (i) => L + i * step;
    if (c.marker && c.marker.i >= start) { const mx = X(c.marker.i - start); body += `<line class="cc-marker" x1="${mx}" x2="${mx}" y1="${T}" y2="${H - B}"/><text class="cc-mlab" x="${mx + 6}" y="${T + 10}">${esc(c.marker.label)}</text>`; }
    vis.forEach((s) => {
      const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
      body += `<path class="cc-line" d="${d}" style="stroke:${CC_COLORS[s.i]}"/>`;
      body += s.values.map((v, i) => `<circle class="cc-dot" data-i="${i}" cx="${X(i)}" cy="${y(v)}" r="4.5" style="fill:${CC_COLORS[s.i]}"/>`).join('');
    });
    body += `<line class="cc-cross" x1="0" x2="0" y1="${T}" y2="${H - B}"/>`;
    xs.forEach((lab, i) => { body += `<text class="cc-xlab" x="${X(i)}" y="${H - 10}" text-anchor="middle">${esc(lab)}</text>`; hits += `<rect class="cc-hit" data-cc-i="${i}" x="${X(i) - step / 2}" y="${T}" width="${step}" height="${H - T - B}"/>`; });
  } else {
    const n = xs.length, slot = (W - L - Rr) / n, bw = Math.min(56, slot * .56);
    const s = vis[0];
    xs.forEach((lab, i) => {
      const v = s ? s.values[i] : 0, cx = L + slot * i + slot / 2;
      body += `<rect class="cc-bar ${i === 0 ? 'top' : ''}" data-i="${i}" x="${cx - bw / 2}" y="${y(v)}" width="${bw}" height="${H - B - y(v)}" rx="4"/>`;
      body += `<text class="cc-val" x="${cx}" y="${y(v) - 6}" text-anchor="middle">${fmt(v)}</text>`;
      const short = lab.length > 16 ? lab.slice(0, 15) + '…' : lab;
      body += `<text class="cc-xlab" x="${cx}" y="${H - 10}" text-anchor="middle">${esc(short)}</text>`;
      hits += `<rect class="cc-hit" data-cc-i="${i}" x="${cx - slot / 2}" y="${T}" width="${slot}" height="${H - T - B}"/>`;
    });
  }
  return `<div class="cc" data-cid="${cid}">
    <div class="cc-head"><div><b>${esc(c.title)}</b><small>${esc(c.sub || '')}</small></div>
      ${c.ranges ? `<div class="seg">${c.ranges.map((r) => `<button class="${c.range === r ? 'on' : ''}" data-action="cc-range" data-arg="${cid}:${r}">${r}M</button>`).join('')}</div>` : ''}</div>
    ${c.series.length > 1 ? `<div class="cc-legend">${c.series.map((s, i) => `<button class="${c.hidden.includes(i) ? 'off' : ''}" data-action="cc-toggle" data-arg="${cid}:${i}"><i style="background:${CC_COLORS[i]}"></i>${esc(s.name)}</button>`).join('')}</div>` : ''}
    <div class="cc-plot"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title)}">${grid}${body}${hits}</svg><div class="cc-tip"></div></div>
    <div class="cc-foot"><span>${icon('activity', 12)} ${esc(c.source || '')}</span><span>hover for values${c.series.length > 1 ? ' · click legend to filter' : ''}</span></div>
  </div>`;
}
function chartHover(hit) {
  const wrap = hit.closest('.cc'), c = CHARTS[wrap.dataset.cid];
  if (!c) return;
  const i = +hit.dataset.ccI;
  const start = c.kind === 'line' ? c.x.length - c.range : 0;
  wrap.classList.add('hovering');
  $$('.cc-dot, .cc-bar', wrap).forEach((d) => d.classList.toggle('on', +d.dataset.i === i));
  const cross = $('.cc-cross', wrap), svg = $('svg', wrap), plot = $('.cc-plot', wrap);
  const hx = +hit.getAttribute('x') + +hit.getAttribute('width') / 2;
  if (cross) { cross.setAttribute('x1', hx); cross.setAttribute('x2', hx); }
  const fmt = (v) => (c.unit === '%' ? v.toFixed(1) + '%' : c.unit === 'h' ? v.toFixed(1) + ' h' : Number.isInteger(v) ? String(v) : v.toFixed(2));
  const rows = c.series.map((s, si) => ({ s, si })).filter(({ si }) => !c.hidden.includes(si)).sort((a, b) => b.s.values[start + i] - a.s.values[start + i])
    .map(({ s, si }) => `<div><i style="background:${CC_COLORS[si]}"></i>${esc(s.name)}<b>${fmt(s.values[start + i])}</b></div>`).join('');
  const tip = $('.cc-tip', wrap);
  tip.innerHTML = `<strong>${esc(c.x[start + i])}</strong>${rows}${c.meta ? `<small>${esc(c.meta[i])}</small>` : ''}${c.marker && c.marker.i === start + i ? `<small class="accent">${esc(c.marker.label)}</small>` : ''}`;
  const scale = svg.getBoundingClientRect().width / 640;
  const px = hx * scale, pw = plot.getBoundingClientRect().width;
  tip.style.left = Math.min(Math.max(px + 14, 8), pw - 190) + 'px';
  tip.style.opacity = 1;
}
function chartLeave() {
  $$('.cc.hovering').forEach((w) => { w.classList.remove('hovering'); $('.cc-tip', w).style.opacity = 0; $$('.cc-dot.on, .cc-bar.on', w).forEach((d) => d.classList.remove('on')); });
}

function renderBlocks(blocks) {
  return blocks.map((b) => {
    if (b.t === 'chart') return chartBlock(b.c);
    if (b.t === 'h') return `<h4>${b.v}</h4>`;
    if (b.t === 'list') return `<ul>${b.v.map((x) => `<li>${x}</li>`).join('')}</ul>`;
    if (b.t === 'table') return `<div class="tbl-wrap"><table class="tbl compact"><thead><tr>${b.head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return `<p>${b.v}</p>`;
  }).join('');
}
function pageChat(id) {
  const conv = id ? S.conversations.find((c) => c.id === id) : null;
  const q = (S.ui.chatQ || '').toLowerCase();
  const convs = S.conversations.filter((c) => !q || c.title.toLowerCase().includes(q));
  const epId = conv ? conv.endpointId : S.ui.chatEndpoint || S.endpoints[0]?.id || '';
  const prov = conv ? conv.provider : S.ui.chatProvider || S.llm[0]?.provider || '';
  const hasLlm = S.llm.length > 0, hasEp = !!epById(epId);
  const warn = !hasLlm ? 'Connect an LLM to start chatting.' : !hasEp ? 'Select an endpoint to start.' : '';
  const ep = epById(epId);
  return `
  <div class="chat-layout">
    <aside class="card chat-side">
      <div class="card-head" style="padding-bottom:8px"><div><div class="eyebrow">Conversations</div></div>${btn('New', 'new-chat', { cls: 'sm', ico: 'plus' })}</div>
      <div style="padding:0 12px 8px"><label class="search">${icon('search', 13)}<input class="input" style="height:32px" placeholder="Search conversations…" value="${esc(S.ui.chatQ || '')}" data-input="chat-search" /></label></div>
      <div class="list">${convs.length ? convs.map((c) => `<button class="conv ${conv && conv.id === c.id ? 'on' : ''}" data-action="nav" data-to="chat/${c.id}"><b>${esc(c.title)}</b><small>${esc(epById(c.endpointId)?.name || 'deleted endpoint')} · ${ago(c.created)}</small></button>`).join('') : '<p class="footnote" style="padding:10px">No conversations yet.</p>'}</div>
      <div class="card-foot" style="display:block">
        <div class="eyebrow" style="margin-bottom:8px">LLM connections</div>
        ${hasLlm ? S.llm.map((l) => `<div class="row" style="font-size:12px;margin-bottom:6px"><span class="dot ok"></span><b>${PROVIDERS.find((p) => p.id === l.provider).label}</b><span class="mono faint" style="font-size:10.5px">${l.masked}</span><span class="spacer"></span><button class="icon-btn ghost sm" data-action="disconnect-llm" data-arg="${l.provider}" title="Disconnect">${icon('x', 13)}</button></div>`).join('') + btn('Add provider', 'connect-llm', { cls: 'sm ghost', ico: 'plus' }) : btn('Connect LLM', 'connect-llm', { cls: 'primary sm block', ico: 'plug' })}
      </div>
    </aside>
    <section class="card chat-main">
      ${!hasLlm ? `<div style="padding:12px 16px 0"><div class="notice accent">${icon('plug', 15)}<span class="grow"><b>No LLM connected yet.</b> Chat narrates your endpoints with your own provider key, so Clyra meters no LLM tokens.</span>${btn('Connect', 'connect-llm', { cls: 'primary sm' })}</div></div>` : ''}
      <div class="chat-scroll" id="chat-scroll">
        ${conv ? conv.messages.map((m) => m.role === 'user' ? `<div class="msg user"><div class="bubble">${esc(m.text)}</div></div>` : `<div class="msg"><span class="ai-ico">${logoMark('inv xs')}</span><div class="ai-body">${renderBlocks(m.blocks)}<div class="ai-meta"><span>${m.meta || ''}</span><button data-action="copy-msg">copy</button></div></div></div>`).join('')
        : `<div class="chat-empty"><div class="ai-ico chat-logo">${logoMark('inv')}</div><h2>Ask anything about your data.</h2><p>Answers are grounded in ${ep ? `<b>${esc(ep.name)}</b>` : 'your endpoints'} and its held-out reports.</p>
          <div class="suggests">${suggestionsFor(ep).map(([t, s]) => `<button data-action="chat-suggest" data-arg="${esc(t)}" ${warn ? 'disabled style="opacity:.55;cursor:not-allowed"' : ''}>${t}<small>${s}</small></button>`).join('')}</div></div>`}
      </div>
      <div class="composer">
        ${warn ? `<div class="warn-line">${warn}</div>` : ''}
        <textarea id="chat-input" rows="1" placeholder="${warn ? 'Set up your session below to start…' : 'Ask about ' + (ep ? ep.name : 'your data') + '…'}" ${warn ? 'disabled' : ''}></textarea>
        <div class="bar">
          <select class="mini-select" data-change="chat-ep" ${conv ? 'disabled' : ''}>${S.endpoints.length ? S.endpoints.map((e) => `<option value="${e.id}" ${epId === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('') : '<option value="">No endpoints</option>'}</select>
          <select class="mini-select" data-change="chat-llm">${hasLlm ? S.llm.map((l) => `<option value="${l.provider}" ${prov === l.provider ? 'selected' : ''}>${PROVIDERS.find((p) => p.id === l.provider).label} · ${PROVIDERS.find((p) => p.id === l.provider).model}</option>`).join('') : '<option>Select LLM</option>'}</select>
          <button class="send" data-action="chat-send" ${warn ? 'disabled' : ''} aria-label="Send">${icon('send', 15, 2)}</button>
        </div>
      </div>
      <div class="composer-note">AI can make mistakes. Predictions come from the endpoint; the LLM only narrates them.</div>
    </section>
  </div>`;
}

const PAGES = {
  overview: pageOverview, data: pageData, 'quick-run': pageQuickRun, workspace: pageWorkspace,
  'workspace/new': pageWizard, run: pageRun, endpoints: pageEndpoints, api: pageApi, reports: pageReports, chat: pageChat,
};

/* ==========================================================================
   Overlays: modals, drawers, popovers, command palette
   ========================================================================== */
let M = null;
function openOverlay(html, { drawer = false, palette = false, noAnim = false } = {}) {
  const root = $('#overlay-root');
  root.innerHTML = `<div class="overlay ${drawer ? 'drawer-wrap' : ''} ${palette ? 'palette-wrap' : ''}" data-overlay ${noAnim ? 'style="animation:none"' : ''}>${html}</div>`;
  if (noAnim) $$('.modal,.drawer,.palette', root).forEach((el) => (el.style.animation = 'none'));
}
function closeOverlay() { $('#overlay-root').innerHTML = ''; M = null; }
function showModal(type, init = {}) { M = { type, ...init }; drawModal(false); }
function drawModal(noAnim = true) {
  if (!M) return;
  const def = MODALS[M.type];
  if (!def) return;
  const scrollEl = $('.modal-body, .drawer-body, .conn-pane');
  const y = scrollEl ? scrollEl.scrollTop : 0;
  openOverlay(def(), { drawer: !!def.drawer, palette: M.type === 'palette', noAnim });
  const el = $('.modal-body, .drawer-body, .conn-pane'); if (el && noAnim) el.scrollTop = y;
  if (def.focus && !noAnim) { const f = $(def.focus); if (f) { f.focus(); setTimeout(() => f.focus(), 30); } }
}
const modalHead = (title, sub = '') => `<div class="modal-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button class="icon-btn ghost" data-action="close" aria-label="Close">${icon('x', 16)}</button></div>`;

/* Popovers */
function openPopover(anchor, html, width = 280) {
  const r = anchor.getBoundingClientRect();
  const root = $('#overlay-root');
  root.innerHTML = `<div data-overlay style="position:fixed;inset:0;z-index:110"></div><div class="popover" style="width:${width}px">${html}</div>`;
  const pop = $('.popover', root);
  const ph = pop.offsetHeight;
  let left = clamp(r.left, 8, innerWidth - width - 8);
  let top = r.bottom + 6;
  if (top + ph > innerHeight - 8) top = Math.max(8, r.top - ph - 6);
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
  M = { type: 'popover' };
}

/* ---------- Modal definitions ---------- */
const MODALS = {};

/* Connect data */
MODALS.connect = () => {
  const tabs = [['upload', 'upload', 'Upload', 'CSV, Excel, JSON'], ['db', 'db', 'Databases', 'Postgres, Snowflake…'], ['cloud', 'cloud', 'Cloud', 'Drive, GCS, S3'], ['api', 'globe', 'API', 'REST, GraphQL']];
  let pane = '', foot = '';
  if (M.tab === 'upload') {
    const ready = M.files.filter((f) => f.status === 'ready');
    pane = `<div class="field"><label>Connection name</label><input class="input" placeholder="My uploaded data" value="${esc(M.name)}" data-input="m-name" /></div>
      <div class="dropzone" id="dropzone"><span class="ico">${icon('upload', 20)}</span><b>Drag and drop your files here</b><span>CSV, Excel, JSON · up to 50 MB · parsed locally in your browser</span><div class="row">${btn('Browse files', 'm-browse', { cls: 'sm' })}${btn('Use example file', 'm-example', { cls: 'sm ghost' })}</div></div>
      ${M.files.length ? `<div style="display:grid;gap:8px">${M.files.map((f, i) => `<div class="upload-item">${fileIco({ type: f.ext.toUpperCase(), folder: '' })}<div><b>${esc(f.name)}</b><small>${fmtBytes(f.size)} · ${f.status === 'ready' ? `${num(f.rows)} rows × ${f.ncols} cols · ${esc(f.sector)}` : f.status === 'error' ? `<span class="err">${esc(f.error)}</span>` : f.status === 'parsing' ? 'parsing & profiling…' : 'uploading…'}</small>${f.status !== 'ready' && f.status !== 'error' ? `<div class="progress"><i style="width:${f.progress}%"></i></div>` : ''}</div>${f.status === 'ready' ? `<span class="pill ok">${icon('check', 11, 2.5)} ready</span>` : f.status === 'error' ? `<button class="icon-btn ghost sm" data-action="m-remove-file" data-arg="${i}">${icon('x', 13)}</button>` : `<span class="mono muted" style="font-size:11px">${Math.round(f.progress)}%</span>`}</div>`).join('')}</div>` : ''}`;
    foot = `<span class="footnote">${ready.length ? `${ready.length} file${ready.length > 1 ? 's' : ''} ready · schema inferred` : 'No keys or labels needed'}</span><span class="spacer"></span>${btn(`Upload & connect${ready.length ? ` (${ready.length})` : ''}`, 'm-upload-connect', { cls: 'accent', disabled: !ready.length })}`;
  } else if (M.tab === 'db') {
    const p = DB_PROVIDERS.find((x) => x.id === M.dbProvider);
    pane = `<div class="provider-grid">${DB_PROVIDERS.map((x) => `<button class="provider ${M.dbProvider === x.id ? 'on' : ''}" data-action="m-db-provider" data-arg="${x.id}"><span class="conn-ico ${x.id}">${x.ico}</span>${x.label}</button>`).join('')}</div>
      ${p ? `<div class="form-grid">
        <div class="field full"><label>Connection name</label><input class="input" value="${esc(M.name || p.label + ' · production')}" data-input="m-name" /></div>
        <div class="field"><label>Host</label><input class="input mono" value="${esc(M.db.host)}" placeholder="db.example.com" data-input="m-db:host" /></div>
        <div class="field"><label>Port</label><input class="input mono" value="${esc(M.db.port || p.port)}" data-input="m-db:port" /></div>
        <div class="field"><label>Database</label><input class="input mono" value="${esc(M.db.database)}" placeholder="analytics" data-input="m-db:database" /></div>
        <div class="field"><label>User</label><input class="input mono" value="${esc(M.db.user)}" placeholder="readonly" data-input="m-db:user" /></div>
        <div class="field full"><label>Password</label><input class="input mono" type="password" value="${esc(M.db.password)}" placeholder="••••••••" data-input="m-db:password" /><span class="hint">Read-only role recommended · credentials encrypted at rest</span></div>
      </div>
      ${M.dbState === 'ok' ? `<div class="notice accent">${icon('check', 15)}<span class="grow"><b>Connected.</b> Found ${M.tables.length} tables. Choose what to import.</span></div>
        <div class="pick-list">${M.tables.map((t, i) => `<button class="pick ${t.on ? 'on' : ''}" data-action="m-db-table" data-arg="${i}"><span class="chk ${t.on ? 'on' : ''}">${t.on ? icon('check', 11, 3) : ''}</span><span class="file-ico table">TBL</span><span class="grow"><b>${t.name}</b><small>${num(t.rows)} rows · ${t.ncols} cols</small></span></button>`).join('')}</div>` : M.dbState === 'error' ? `<div class="notice warn">${icon('alert', 15)}<span class="grow">Host is required to test the connection.</span></div>` : ''}` : `<p class="muted" style="margin:0">Choose a database to continue.</p>`}`;
    const nOn = M.tables.filter((t) => t.on).length;
    foot = M.dbState === 'ok' ? `<span class="footnote">${nOn} of ${M.tables.length} selected</span><span class="spacer"></span>${btn(`Connect & import ${nOn}`, 'm-db-import', { cls: 'accent', disabled: !nOn })}` : `<span class="footnote">${p ? 'We only read schemas and rows you select' : ''}</span><span class="spacer"></span>${btn(M.dbState === 'testing' ? 'Testing…' : 'Test connection', 'm-db-test', { cls: 'primary', disabled: !p || M.dbState === 'testing', ico: M.dbState === 'testing' ? '' : 'plug' })}`;
  } else if (M.tab === 'cloud') {
    const p = CLOUD_PROVIDERS.find((x) => x.id === M.cloudProvider);
    pane = `<div class="provider-grid">${CLOUD_PROVIDERS.map((x) => `<button class="provider ${M.cloudProvider === x.id ? 'on' : ''}" data-action="m-cloud-provider" data-arg="${x.id}"><span class="conn-ico ${x.id}">${x.ico}</span>${x.label}</button>`).join('')}</div>
      ${p ? `<div class="field"><label>Path</label><div class="row"><input class="input mono" value="${esc(M.cloudPath || p.path)}" data-input="m-cloud-path" />${btn(M.cloudState === 'loading' ? 'Listing…' : 'Browse', 'm-cloud-browse', { cls: 'primary', disabled: M.cloudState === 'loading' })}</div><span class="hint">${p.id === 'drive' ? 'OAuth · read-only scope' : 'Service account · read-only role'}</span></div>
        ${M.cloudState === 'ok' ? `<div class="pick-list">${M.cloudFiles.map((f, i) => `<button class="pick ${f.on ? 'on' : ''}" data-action="m-cloud-file" data-arg="${i}" ${f.unsupported ? 'disabled style="opacity:.5"' : ''}><span class="chk ${f.on ? 'on' : ''}">${f.on ? icon('check', 11, 3) : ''}</span>${fileIco({ type: f.type, folder: '' })}<span class="grow"><b>${f.name}</b><small>${f.unsupported ? 'unsupported format' : `${fmtBytes(f.bytes)} · ${num(f.rows)} rows`}</small></span></button>`).join('')}</div>` : ''}` : `<p class="muted" style="margin:0">Choose a storage provider to continue.</p>`}`;
    const nOn = M.cloudFiles.filter((f) => f.on).length;
    foot = `<span class="footnote">${M.cloudState === 'ok' ? `${nOn} selected` : ''}</span><span class="spacer"></span>${btn(`Connect & import${nOn ? ` ${nOn}` : ''}`, 'm-cloud-import', { cls: 'accent', disabled: !nOn })}`;
  } else {
    pane = `<div class="form-grid">
        <div class="field full"><label>Endpoint URL</label><input class="input mono" value="${esc(M.api.url)}" data-input="m-api:url" /></div>
        <div class="field"><label>Method</label><div class="seg"><button class="${M.api.kind === 'rest' ? 'on' : ''}" data-action="m-api-kind" data-arg="rest">REST · GET</button><button class="${M.api.kind === 'graphql' ? 'on' : ''}" data-action="m-api-kind" data-arg="graphql">GraphQL</button></div></div>
        <div class="field"><label>Refresh</label><select class="select" data-change="m-api-refresh">${['hourly', 'daily', 'manual'].map((x) => `<option ${M.api.refresh === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="field full"><label>Auth header</label><input class="input mono" value="${esc(M.api.auth)}" placeholder="Authorization: Bearer …" data-input="m-api:auth" /></div>
      </div>
      ${M.apiState === 'ok' ? `<div class="code">${esc(JSON.stringify({ total: 3204, has_more: true, events: [{ message_id: 'MSG-48213', recipient: 'M. Hughes', channel: 'SMS', programme: 'Bowel', sent_at: '14/10/2026 09:12', delivered: true, opened: true }, { message_id: 'MSG-48214', recipient: 'A. Begum', channel: 'App', programme: 'Cervical', sent_at: '14/10/2026 09:12', delivered: true, opened: false }], next: '/v2/events?cursor=…2000' }, null, 2))}</div><div class="notice accent">${icon('check', 15)}<span class="grow">200 OK · 214ms · <b>3,204 records</b> · 8 fields detected · paginated (cursor)</span></div>` : ''}`;
    foot = M.apiState === 'ok' ? `<span class="spacer"></span>${btn('Connect API', 'm-api-connect', { cls: 'accent' })}` : `<span class="spacer"></span>${btn(M.apiState === 'testing' ? 'Sending…' : 'Send test request', 'm-api-test', { cls: 'primary', disabled: M.apiState === 'testing' || !M.api.url })}`;
  }
  return `<div class="modal wide">${modalHead('Connect data source', 'Choose a data source to connect to your workspace.')}
    <div class="conn-modal"><nav>${tabs.map(([id, ic, t, s]) => `<button class="conn-tab ${M.tab === id ? 'on' : ''}" data-action="m-tab" data-arg="${id}">${icon(ic, 17)}<span><b>${t}</b><small>${s}</small></span></button>`).join('')}</nav><div class="conn-pane">${pane}</div></div>
    <div class="modal-foot">${foot}</div></div>`;
};

/* Generate synthetic */
MODALS.generate = () => {
  const g = M;
  const seedDs = dsById(g.seedDs);
  let body;
  if (g.state === 'generating') {
    body = `<div style="padding:30px 0;display:grid;gap:14px;text-align:center"><div class="eyebrow" style="justify-content:center">${icon('wand', 12)} generating with ${g.mode === 'seed' ? 'seed distribution' : 'sector prior'}</div><b style="font-size:18px;font-weight:500">${num(g.rows)} rows × ${g.ncols} columns</b><div class="progress"><i style="width:${g.progress}%"></i></div><span class="footnote">${g.progress < 40 ? 'sampling schema…' : g.progress < 80 ? 'generating rows · preserving correlations…' : 'validating & profiling…'}</span></div>`;
  } else {
    body = `
      <div class="grid-2 even" style="gap:10px;margin-bottom:16px">
        <button class="pick ${g.mode === 'scratch' ? 'on' : ''}" data-action="m-gen-mode" data-arg="scratch"><span class="grow"><b>From scratch</b><small>Sector + columns, no real data</small></span></button>
        <button class="pick ${g.mode === 'seed' ? 'on' : ''}" data-action="m-gen-mode" data-arg="seed"><span class="grow"><b>Seed from data</b><small>Learn from an existing dataset</small></span></button>
      </div>
      <div class="form-grid">
        <div class="field"><label>Name</label><input class="input" placeholder="e.g. bowel_invitations_sample" value="${esc(g.name)}" data-input="m-gen:name" /></div>
        <div class="field"><label>Description <span class="faint" style="font-weight:400">(optional)</span></label><input class="input" placeholder="Brief description" value="${esc(g.desc)}" data-input="m-gen:desc" /></div>
        <div class="field"><label>Rows</label><input class="input mono" value="${g.rows}" data-input="m-gen:rows" /><span class="hint">1 to 1,000,000</span></div>
        ${g.mode === 'scratch' ? `<div class="field"><label>Sector</label><select class="select" data-change="m-gen-sector"><option value="">Select sector…</option>${SECTORS.map((s) => `<option ${g.sector === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>`
        : `<div class="field"><label>Seed dataset</label><select class="select" data-change="m-gen-seed">${S.datasets.map((d) => `<option value="${d.id}" ${g.seedDs === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>`}
        ${g.mode === 'scratch' ? `<div class="field full"><div class="row between"><label>Columns</label><div class="seg"><button class="${g.colMode === 'count' ? 'on' : ''}" data-action="m-gen-colmode" data-arg="count">Count</button><button class="${g.colMode === 'define' ? 'on' : ''}" data-action="m-gen-colmode" data-arg="define">Define columns</button></div></div>
          ${g.colMode === 'count' ? `<input class="input mono" value="${g.ncols}" data-input="m-gen:ncols" /><span class="hint">1 to 500 · names and types are inferred from the sector and your description</span>` : `<textarea class="textarea mono" style="font-size:11.5px" data-input="m-gen:colDefs" placeholder="invitation_id: id
age: int 50-74
programme: cat Breast,Cervical,Bowel
attended: bool">${esc(g.colDefs)}</textarea><span class="hint">one column per line · name: type [range]</span>`}</div>
          <div class="field full"><div class="row between"><label>Data description</label><span class="row" style="font-size:12px;color:var(--muted)">Use Python <button class="switch ${g.python ? 'on' : ''}" data-action="m-gen-python" aria-label="Use Python"></button></span></div>
          ${g.python ? `<textarea class="textarea mono" style="font-size:11.5px;min-height:120px;background:var(--term);color:var(--term-ink);border-color:#000" data-input="m-gen:code">${esc(g.code)}</textarea>` : `<textarea class="textarea" placeholder="Describe the table, e.g. bowel screening invitations for adults aged 50–74 with IMD decile, invite channel, prior attendance and an attended flag that falls with deprivation." data-input="m-gen:desc2">${esc(g.desc2)}</textarea>`}</div>`
        : `<div class="field full"><label>Privacy noise</label><input type="range" class="range" min="0" max="10" value="${g.noise}" data-input="m-gen:noise" /><span class="hint">ε = ${(g.noise / 2).toFixed(1)} · ${g.noise > 6 ? 'strong privacy, lower fidelity' : g.noise > 2 ? 'balanced' : 'high fidelity'} · ${seedDs ? `learns ${seedDs.ncols} columns from ${esc(seedDs.name)}` : ''}</span></div>`}
      </div>
      ${g.preview ? `<div style="margin-top:14px"><div class="eyebrow" style="margin-bottom:8px">Preview · 5 of ${num(g.rows)} rows</div><div class="tbl-wrap" style="border:1px solid var(--line);border-radius:var(--r)"><table class="tbl data compact"><thead><tr>${g.preview.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${g.preview.rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>` : ''}`;
  }
  const valid = g.mode === 'seed' ? !!g.seedDs : !!g.sector;
  return `<div class="modal wide">${modalHead('Generate synthetic data', 'Create a dataset to run, create endpoints, or test with.')}<div class="modal-body">${body}</div>
    <div class="modal-foot">${g.state === 'generating' ? '<span class="spacer"></span>' : `${btn('Preview sample', 'm-gen-preview', { disabled: !valid, ico: 'eye' })}<span class="spacer"></span>${btn('Cancel', 'close', { cls: 'ghost' })}${btn('Generate', 'm-gen-run', { cls: 'accent', disabled: !valid, ico: 'wand' })}`}</div></div>`;
};

/* Pick tables */
MODALS.pick = () => {
  const q = (M.q || '').toLowerCase();
  const list = S.datasets.filter((d) => (!M.samplesOnly || d.builtin) && (!q || d.name.toLowerCase().includes(q)));
  return `<div class="modal">${modalHead(M.samplesOnly ? 'Pick from samples' : 'Select tables', 'Select one or more. The first selected is the primary table.')}
    <div class="modal-body" style="display:grid;gap:10px"><label class="search">${icon('search', 14)}<input class="input" placeholder="Search tables…" value="${esc(M.q || '')}" data-input="m-pick-q" /></label>
      <div class="pick-list">${list.map((d) => { const i = M.sel.indexOf(d.id); return `<button class="pick ${i >= 0 ? 'on' : ''}" data-action="m-pick" data-arg="${d.id}"><span class="chk ${i >= 0 ? 'on' : ''}">${i >= 0 ? icon('check', 11, 3) : ''}</span>${fileIco(d)}<span class="grow"><b>${esc(d.name)}</b><small>${compact(d.rows)} rows · ${d.ncols} cols · ${esc(d.sector || '—')}</small></span>${i === 0 ? '<span class="tag accent">primary</span>' : i > 0 ? `<span class="tag">#${i + 1}</span>` : ''}</button>`; }).join('') || '<p class="muted">No tables match.</p>'}</div></div>
    <div class="modal-foot"><span class="footnote">${M.sel.length} selected</span><span class="spacer"></span>${btn('Cancel', 'close', { cls: 'ghost' })}${btn('Add tables', 'm-pick-done', { cls: 'primary', disabled: !M.sel.length })}</div></div>`;
};
MODALS.pick.focus = '[data-input="m-pick-q"]';

/* Dataset drawer */
MODALS.dataset = () => {
  const d = dsById(M.id);
  if (!d) return '';
  const cols = datasetColumns(d);
  const avgMiss = cols.reduce((a, c) => a + c.missing, 0) / cols.length;
  const rows = previewRows(d, 10);
  const src = d.conn ? connById(d.conn)?.name : d.builtin ? 'Sample data' : d.folder === 'synthetic' ? 'Synthetic' : 'Upload';
  const body = M.tab === 'preview'
    ? `<div class="tbl-wrap"><table class="tbl data compact"><thead><tr>${cols.map((c) => `<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => v == null || v === '' ? '<td class="null">null</td>' : `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="footnote" style="padding:10px 20px">Showing 10 of ${num(d.rows)} rows · ${cols.length} of ${d.ncols} columns</p>`
    : `<div class="drawer-section"><div class="stat-row"><div><small>Rows</small><b>${num(d.rows)}</b></div><div><small>Columns</small><b>${d.ncols}</b></div><div><small>Missing</small><b>${avgMiss.toFixed(1)}%</b></div><div><small>Size</small><b>${fmtBytes(d.bytes)}</b></div></div>
        <div class="notice accent" style="margin-top:12px">${icon('spark', 15)}<span class="grow">clyra-2 reads this as <b>${esc(d.sector || 'General')}</b> data · suggested target <span class="mono">${esc(d.target || '—')}</span></span></div></div>
      <div class="drawer-section" style="padding:0"><h4 style="padding:14px 20px 0">Column profile</h4><div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Column</th><th>Type</th><th>Missing</th><th class="num">Unique</th><th>Sample</th></tr></thead><tbody>
        ${cols.map((c) => `<tr><td class="mono" style="font-size:11.5px">${esc(c.name)} ${c.isTarget ? '<span class="tag accent">target</span>' : ''}</td><td><span class="type-chip">${c.type}</span></td><td><span class="miss"><i><b style="width:${Math.min(100, c.missing * 8)}%"></b></i>${c.missing}%</span></td><td class="num">${compact(c.unique)}</td><td class="mono muted" style="font-size:11px">${esc(c.sample)}</td></tr>`).join('')}
      </tbody></table></div>${d.ncols > cols.length ? `<p class="footnote" style="padding:8px 20px 14px;margin:0">+ ${d.ncols - cols.length} more columns profiled on run</p>` : ''}</div>`;
  return `<aside class="drawer wide">
    <div class="drawer-head"><div class="row">${fileIco(d)}<div style="flex:1;min-width:0"><div class="eyebrow">${esc(src)} · ${d.type}</div><h2>${esc(d.name)}</h2><p>${d.id} · added ${ago(d.created)}</p></div><button class="icon-btn ghost" data-action="close" aria-label="Close">${icon('x', 16)}</button></div></div>
    <div class="tabs"><button class="${M.tab !== 'preview' ? 'on' : ''}" data-action="m-tab" data-arg="profile">Profile</button><button class="${M.tab === 'preview' ? 'on' : ''}" data-action="m-tab" data-arg="preview">Preview</button></div>
    <div class="drawer-body">${body}</div>
    <div class="drawer-foot">${btn('Quick run', 'm-ds-quick', { cls: 'primary', ico: 'bolt' })}${btn('New run', 'm-ds-run', { ico: 'flask' })}<span class="spacer"></span>${d.builtin ? '<span class="footnote" style="align-self:center">built-in · read-only</span>' : btn('Delete', 'm-ds-delete', { cls: 'danger', ico: 'trash' })}</div>
  </aside>`;
};
MODALS.dataset.drawer = true;

/* Endpoint drawer */
MODALS.endpoint = () => {
  const e = epById(M.id);
  if (!e) return '';
  const reps = S.reports.filter((r) => r.endpointId === e.id).sort((a, b) => b.version - a.version || b.created - a.created);
  const run = runById(e.runId);
  const busy = ['refreshing', 'upgrading', 'deploying'].includes(e.status);
  let body = '';
  if (M.tab === 'api') {
    body = `<div class="drawer-section"><h4>Endpoint URL</h4><div class="key-reveal"><span>https://api.clyra.ai/v1/endpoints/${e.id}/predict</span><button class="icon-btn ghost sm" style="color:#fff" data-action="copy" data-arg="https://api.clyra.ai/v1/endpoints/${e.id}/predict">${icon('copy', 13)}</button></div></div>
      <div class="drawer-section"><h4>Call it</h4><div class="code-tabs">${['curl', 'python', 'js'].map((l) => `<button class="${(M.lang || 'curl') === l ? 'on' : ''}" data-action="m-lang" data-arg="${l}">${l}</button>`).join('')}</div><div class="code"><button class="copy" data-action="copy-code">${icon('copy', 12)}copy</button>${codeSample(M.lang || 'curl', e, S.keys[0] ? S.keys[0].prefix + '••••' : undefined)}</div>
      ${S.keys.length ? '' : `<div class="notice" style="margin-top:10px">${icon('key', 15)}<span class="grow">You need an API key to call this endpoint.</span>${btn('Create key', 'create-key', { cls: 'sm primary' })}</div>`}</div>`;
  } else if (M.tab === 'playground') {
    body = `<div class="drawer-section"><h4>Request <span class="footnote">POST /predict</span></h4><div class="json-io"><textarea class="textarea" spellcheck="false" data-input="m-play-in">${esc(M.input)}</textarea>
      <div class="code out">${M.busy ? '<span class="c">// sending…</span>' : M.output ? syntaxJson(M.output) : '<span class="c">// response appears here</span>'}</div></div>
      <div class="row" style="margin-top:10px">${btn(M.busy ? 'Predicting…' : 'Send request', 'm-play-send', { cls: 'accent', ico: 'play', disabled: M.busy || e.status !== 'serving' })}<span class="footnote">${e.status !== 'serving' ? 'endpoint is not serving' : 'uses your session · not billed in the prototype'}</span></div></div>`;
  } else if (M.tab === 'settings') {
    const nextBase = e.base === 'clyra-2.1-preview' ? null : 'clyra-2.1-preview';
    body = `<div class="drawer-section"><h4>Serving</h4>
        <div class="row between" style="padding:6px 0"><div><b style="font-size:13px">Autoscale</b><div class="footnote">0 → 8 replicas based on traffic</div></div><button class="switch ${e.autoscale ? 'on' : ''}" data-action="m-ep-autoscale" aria-label="Autoscale"></button></div>
        <div class="row between" style="padding:6px 0"><div><b style="font-size:13px">${e.status === 'paused' ? 'Paused' : 'Serving'}</b><div class="footnote">${e.status === 'paused' ? 'requests return 503 until resumed' : 'accepting requests'}</div></div>${btn(e.status === 'paused' ? 'Resume' : 'Pause', 'm-ep-pause', { cls: 'sm', ico: e.status === 'paused' ? 'play' : 'pause', disabled: busy })}</div></div>
      <div class="drawer-section"><h4>Refresh on latest data</h4><p class="muted" style="margin:0 0 10px;font-size:12.5px">Re-fit on the newest rows from ${run ? run.datasets.length : 0} table(s) with the same split. Emits a new report; the current version keeps serving until the new one passes.</p>${btn(e.status === 'refreshing' ? 'Refreshing…' : 'Refresh endpoint', 'm-ep-refresh', { cls: 'primary sm', ico: 'refresh', disabled: busy })}</div>
      <div class="drawer-section"><h4>Upgrade base</h4><p class="muted" style="margin:0 0 10px;font-size:12.5px">${nextBase ? `Move from <span class="mono">${e.base}</span> to <span class="mono">${nextBase}</span>. You’ll get a held-out comparison before traffic switches.` : `Already on the latest base (<span class="mono">${e.base}</span>).`}</p>${btn(e.status === 'upgrading' ? 'Upgrading…' : 'Upgrade to ' + (nextBase || 'latest'), 'm-ep-upgrade', { cls: 'sm', ico: 'up', disabled: busy || !nextBase })}</div>
      <div class="drawer-section"><h4>Danger zone</h4>${btn('Delete endpoint', 'm-ep-delete', { cls: 'danger sm', ico: 'trash' })}</div>`;
  } else {
    body = `<div class="drawer-section"><div class="stat-row"><div><small>${e.metricName}</small><b>${fmtP(e.metricName, e.metric)}</b></div><div><small>p50 / p95</small><b>${e.p50} / ${e.p95}ms</b></div><div><small>Requests</small><b data-ep-req="${e.id}">${num(e.requests)}</b></div><div><small>Version</small><b>v${e.version}</b></div></div></div>
      <div class="drawer-section"><h4>Traffic · 24h</h4>${lineChart(e.traffic, { h: 110, id: 'ep' })}</div>
      <div class="drawer-section" style="padding:0"><h4 style="padding:14px 20px 0">Versions</h4><table class="tbl compact"><thead><tr><th>Version</th><th>Op</th><th>Base</th><th class="num">${e.metricName}</th><th class="num">When</th></tr></thead><tbody>${reps.map((r) => `<tr class="clickable" data-action="open-report" data-arg="${r.id}"><td class="mono">v${r.version}${r.version === e.version ? ' <span class="tag accent">live</span>' : ''}</td><td><span class="pill ${r.op === 'create' ? 'info' : r.op === 'upgrade' ? 'live' : 'ok'}">${r.op}</span></td><td class="mono" style="font-size:11px">${r.base}</td><td class="num">${fmtP(r.metrics.primaryName, r.metrics.primary)}</td><td class="num muted">${ago(r.created)}</td></tr>`).join('')}</tbody></table></div>
      <div class="drawer-section"><h4>Source</h4><div class="row wrap">${run ? `<button class="btn sm" data-action="nav" data-to="run/${run.id}">${icon('flask', 13)}${esc(run.name)}</button>` : ''}${e.datasets.map((id) => dsById(id)).filter(Boolean).map((d) => `<button class="btn sm" data-action="open-dataset" data-arg="${d.id}">${icon('table', 13)}${esc(d.name)}</button>`).join('')}</div></div>`;
  }
  return `<aside class="drawer wide">
    <div class="drawer-head"><div class="row"><span class="conn-ico api">${icon('layers', 17)}</span><div style="flex:1;min-width:0"><div class="eyebrow">Endpoint · ${e.task} · ${e.base}</div><h2>${esc(e.name)}</h2><p>${e.id} · created ${ago(e.created)}</p></div>
      ${e.status === 'serving' ? '<span class="pill ok"><span class="dot ok"></span>serving</span>' : e.status === 'paused' ? '<span class="pill">paused</span>' : `<span class="pill live"><span class="dot live"></span>${e.status}</span>`}<button class="icon-btn ghost" data-action="close" aria-label="Close">${icon('x', 16)}</button></div></div>
    <div class="tabs">${[['overview', 'Overview'], ['api', 'API'], ['playground', 'Playground'], ['settings', 'Settings']].map(([k, l]) => `<button class="${(M.tab || 'overview') === k ? 'on' : ''}" data-action="m-tab" data-arg="${k}">${l}</button>`).join('')}</div>
    <div class="drawer-body">${body}</div>
    <div class="drawer-foot">${btn('Chat with this endpoint', 'm-ep-chat', { cls: 'primary', ico: 'chat' })}<span class="spacer"></span>${btn('Latest report', 'open-report', { arg: reps[0]?.id || '', ico: 'report', disabled: !reps.length })}</div>
  </aside>`;
};
MODALS.endpoint.drawer = true;
function syntaxJson(obj) {
  return esc(JSON.stringify(obj, null, 2)).replace(/(&quot;[\w_]+&quot;)(:)/g, '<span class="k">$1</span>$2').replace(/: (&quot;.*?&quot;)/g, ': <span class="s">$1</span>').replace(/: (-?[\d.]+)/g, ': <span class="n">$1</span>').replace(/: (true|false)/g, ': <span class="n">$1</span>');
}

/* Create endpoint */
MODALS['create-ep'] = () => {
  const ready = S.runs.filter((r) => r.mode === 'workspace' && r.status === 'completed' && !S.endpoints.some((e) => e.runId === r.id));
  const run = runById(M.runId);
  return `<div class="modal">${modalHead('Create endpoint', 'Serve a finished run as a versioned prediction API.')}
    <div class="modal-body" style="display:grid;gap:14px">
      <div class="field"><label>Source run</label><select class="select" data-change="m-ep-run">${ready.map((r) => `<option value="${r.id}" ${M.runId === r.id ? 'selected' : ''}>${esc(r.name)} · ${r.result.metrics.primaryName} ${fmtP(r.result.metrics.primaryName, r.result.metrics.primary)}</option>`).join('')}</select></div>
      <div class="field"><label>Endpoint name</label><input class="input mono" value="${esc(M.name)}" data-input="m-ep-name" /><span class="hint">https://api.clyra.ai/v1/endpoints/ep_…/predict</span></div>
      <div class="row between"><div><b style="font-size:12.5px">Autoscale</b><div class="footnote">scale to zero when idle</div></div><button class="switch ${M.autoscale ? 'on' : ''}" data-action="m-toggle" data-arg="autoscale"></button></div>
      ${run ? `<div class="notice">${icon('report', 15)}<span class="grow">Creating emits report <b>v1</b> with ${run.result.metrics.primaryName} ${fmtP(run.result.metrics.primaryName, run.result.metrics.primary)} on ${num(run.result.heldout)} held-out rows.</span></div>` : ''}
    </div>
    <div class="modal-foot"><span class="spacer"></span>${btn('Cancel', 'close', { cls: 'ghost' })}${btn('Create endpoint', 'm-ep-create', { cls: 'accent', ico: 'layers', disabled: !run || !M.name.trim() })}</div></div>`;
};

/* API key */
MODALS.key = () => {
  if (M.created) {
    return `<div class="modal">${modalHead('Your new API key', 'Copy it now. For security, you won’t be able to see it again.')}
      <div class="modal-body" style="display:grid;gap:12px"><div class="key-reveal"><span>${M.created}</span><button class="icon-btn ghost sm" style="color:#fff" data-action="copy" data-arg="${M.created}">${icon('copy', 14)}</button></div>
      <div class="notice warn">${icon('lock', 15)}<span class="grow">Store it in a secret manager. Never commit it to code.</span></div></div>
      <div class="modal-foot"><span class="spacer"></span>${btn('Done', 'close', { cls: 'primary' })}</div></div>`;
  }
  const radio = (v, l, s) => `<button class="radio ${M.scope === v ? 'on' : ''}" data-action="m-key-scope" data-arg="${v}"><span class="rdot"></span>${l} <small>${s}</small></button>`;
  return `<div class="modal">${modalHead('Create API key', 'Use keys to call endpoints over REST or connect via MCP.')}
    <div class="modal-body" style="display:grid;gap:14px">
      <div class="field"><label>Name</label><input class="input" placeholder="e.g. epic-bpa-integration" value="${esc(M.name)}" data-input="m-key-name" /></div>
      <div class="field"><label>Scope</label><div class="radio-row">${radio('inference', 'inference', 'predict only')}${radio('read', 'read', '+ reports')}${radio('admin', 'admin', 'full access')}</div></div>
      <div class="field"><label>Expires</label><select class="select" data-change="m-key-exp">${['never', '30 days', '90 days', '1 year'].map((x) => `<option ${M.exp === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    </div>
    <div class="modal-foot"><span class="spacer"></span>${btn('Cancel', 'close', { cls: 'ghost' })}${btn('Create key', 'm-key-create', { cls: 'primary', disabled: !M.name.trim() })}</div></div>`;
};
MODALS.key.focus = '[data-input="m-key-name"]';

/* LLM provider */
MODALS.llm = () => {
  const p = PROVIDERS.find((x) => x.id === M.provider);
  return `<div class="modal">${modalHead('Connect your LLM provider', 'Chat narrates with your own provider key. Clyra meters no LLM tokens.')}
    <div class="modal-body" style="display:grid;gap:14px">
      <div class="field"><label>Provider</label><div class="provider-grid" style="grid-template-columns:1fr 1fr">${PROVIDERS.map((x) => `<button class="provider ${M.provider === x.id ? 'on' : ''}" data-action="m-llm-provider" data-arg="${x.id}"><span class="conn-ico">${x.ico}</span>${x.label} <span class="faint" style="font-weight:400">${x.model}</span></button>`).join('')}</div></div>
      <div class="field"><label>API key</label><input class="input mono" type="password" placeholder="${p.id === 'anthropic' ? 'sk-ant-…' : p.id === 'openai' ? 'sk-…' : p.id === 'mistral' ? 'mst_…' : 'key…'}" value="${esc(M.key)}" data-input="m-llm-key" /><span class="hint">Stored encrypted, write-only. Rotated by re-entry.</span></div>
      <button class="consent" data-action="m-llm-consent"><span class="chk ${M.consent ? 'on' : ''}">${M.consent ? icon('check', 11, 3) : ''}</span><span>I understand that Chat sends questions and the data needed to answer them to this provider on my own account. It never sends the endpoint or the full dataset. This consent is recorded.</span></button>
    </div>
    <div class="modal-foot"><span class="spacer"></span>${btn('Cancel', 'close', { cls: 'ghost' })}${btn(M.busy ? 'Verifying…' : 'Connect', 'm-llm-connect', { cls: 'primary', disabled: M.busy || M.key.trim().length < 8 || !M.consent })}</div></div>`;
};
MODALS.llm.focus = '[data-input="m-llm-key"]';

/* Report drawer */
MODALS.report = () => {
  const r = repById(M.id);
  if (!r) return '';
  const prev = S.reports.filter((x) => x.endpointId === r.endpointId && x.version < r.version).sort((a, b) => b.version - a.version)[0];
  return `<aside class="drawer">
    <div class="drawer-head"><div class="row"><span class="conn-ico">${icon('report', 17)}</span><div style="flex:1;min-width:0"><div class="eyebrow">Report · ${r.op} · v${r.version}</div><h2>${esc(r.endpointName)}</h2><p>${r.id} · ${dateShort(r.created)}</p></div><button class="icon-btn ghost" data-action="close" aria-label="Close">${icon('x', 16)}</button></div></div>
    <div class="drawer-body">
      <div class="drawer-section"><h4>Held-out metrics</h4><div class="metric-big" style="border:1px solid var(--line-2);border-radius:var(--r)">${r.metrics.list.slice(0, 4).map(([k, v]) => `<div><small>${k}</small><b style="font-size:20px">${fmtMetric(k, v)}</b></div>`).join('')}</div>
        <p class="footnote" style="margin:8px 0 0">baseline (GBM, same split): ${fmtP(r.metrics.primaryName, r.metrics.baseline)} · lift +${((r.metrics.primary - r.metrics.baseline) * 100).toFixed(1)} pts</p></div>
      ${r.metrics.cm ? `<div class="drawer-section"><h4>Confusion matrix</h4><div class="cm"><span></span><span class="h">pred · neg</span><span class="h">pred · pos</span><span class="h">actual · neg</span><span class="c" style="background:var(--surface-3)">${num(r.metrics.cm[0][0])}</span><span class="c" style="background:var(--accent-pale);color:var(--accent)">${num(r.metrics.cm[0][1])}</span><span class="h">actual · pos</span><span class="c" style="background:var(--accent-pale);color:var(--accent)">${num(r.metrics.cm[1][0])}</span><span class="c" style="background:var(--btn-primary);color:var(--btn-primary-ink)">${num(r.metrics.cm[1][1])}</span></div></div>` : ''}
      <div class="drawer-section"><h4>Provenance</h4><dl class="review-list">
        <dt>run</dt><dd><button class="link-btn" data-action="nav" data-to="run/${r.runId}">${r.runId} ${icon('arrow', 12)}</button></dd>
        <dt>base</dt><dd class="mono">${r.base}</dd><dt>task · target</dt><dd>${r.task} · <span class="mono">${r.target || '—'}</span></dd>
        <dt>split</dt><dd>${r.split}</dd><dt>held-out rows</dt><dd class="mono">${num(r.heldout)} of ${num(r.rows)}</dd>
        <dt>sha256</dt><dd class="mono" style="font-size:11px;word-break:break-all">${r.hash}${r.hash}${r.hash}${r.hash}</dd></dl></div>
    </div>
    <div class="drawer-foot">${btn(r.pinned ? 'Unpin' : 'Pin', 'rep-pin', { arg: r.id, ico: 'star' })}${btn('Download JSON', 'm-rep-download', { ico: 'upload' })}<span class="spacer"></span>${prev ? btn(`Compare with v${prev.version}`, 'm-rep-compare', { cls: 'primary', arg: prev.id, ico: 'compare' }) : ''}</div>
  </aside>`;
};
MODALS.report.drawer = true;

/* Compare */
MODALS.compare = () => {
  const a = repById(M.a), b = repById(M.b);
  if (!a || !b) return '';
  const names = [...new Set([...a.metrics.list.map((x) => x[0]), ...b.metrics.list.map((x) => x[0])])];
  const val = (r, n) => (r.metrics.list.find((x) => x[0] === n) || [])[1];
  const lowerBetter = (n) => ['MAE', 'RMSE', 'MAPE'].includes(n);
  return `<div class="modal wide">${modalHead('Compare reports', `${esc(a.endpointName)} v${a.version} vs ${esc(b.endpointName)} v${b.version}`)}
    <div class="modal-body"><div class="cmp" style="border:1px solid var(--line);border-radius:var(--r);overflow:hidden">
      <div class="h">Metric</div><div class="h">${a.id} · v${a.version} · ${a.op}</div><div class="h">${b.id} · v${b.version} · ${b.op}</div>
      ${names.map((n) => { const va = val(a, n), vb = val(b, n); const d = va != null && vb != null ? vb - va : null; const good = d != null && (lowerBetter(n) ? d < 0 : d > 0); return `<div>${n}</div><div class="m">${va != null ? fmtMetric(n, va) : '—'}</div><div class="m">${vb != null ? fmtMetric(n, vb) : '—'} ${d != null && Math.abs(d) > 1e-6 && n !== 'Flagged' ? `<span class="${good ? 'ok' : 'err'}" style="font-size:11px">${d > 0 ? '+' : ''}${['MAE', 'RMSE'].includes(n) ? d.toFixed(1) : (d * 100).toFixed(1) + ' pts'}</span>` : ''}</div>`; }).join('')}
      <div>Base</div><div class="m">${a.base}</div><div class="m">${b.base}</div>
      <div>Split</div><div class="m">${a.split}</div><div class="m">${b.split}</div>
      <div>Held-out rows</div><div class="m">${num(a.heldout)}</div><div class="m">${num(b.heldout)}</div>
      <div style="border:0">Created</div><div class="m" style="border:0">${dateShort(a.created)}</div><div class="m" style="border:0">${dateShort(b.created)}</div>
    </div></div>
    <div class="modal-foot"><span class="footnote">Same endpoint and split → differences reflect the data or base, not the evaluation.</span><span class="spacer"></span>${btn('Done', 'close', { cls: 'primary' })}</div></div>`;
};

/* Confirm */
MODALS.confirm = () => `<div class="modal" style="width:min(440px,100%)">${modalHead(M.title, M.text)}<div class="modal-foot"><span class="spacer"></span>${btn('Cancel', 'close', { cls: 'ghost' })}${btn(M.okLabel || 'Confirm', 'm-confirm', { cls: M.danger ? 'danger solid' : 'primary' })}</div></div>`;

/* New folder */
MODALS.folder = () => `<div class="modal" style="width:min(420px,100%)">${modalHead('New folder', 'Group tables for runs and teammates.')}<div class="modal-body"><input class="input" placeholder="e.g. First team · 2026" value="${esc(M.name)}" data-input="m-folder-name" /></div><div class="modal-foot"><span class="spacer"></span>${btn('Cancel', 'close', { cls: 'ghost' })}${btn('Create', 'm-folder-create', { cls: 'primary', disabled: !M.name.trim() })}</div></div>`;
MODALS.folder.focus = '[data-input="m-folder-name"]';

/* Help */
MODALS.help = () => `<div class="modal">${modalHead('Docs & shortcuts', 'Clyra prototype. Every action is simulated in your browser, and all names and data are simulated for privacy.')}
  <div class="modal-body" style="display:grid;gap:14px">
    <dl class="review-list">${[['⌘ K', 'Command palette'], ['⌘ J', 'Ask Clyra (chat)'], ['⌘ ↵', 'Run (Quick Run page)'], ['G then O / D / Q / W / E / A / R / C', 'Go to a page'], ['Esc', 'Close dialogs']].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    <div class="notice">${icon('info', 15)}<span class="grow">The flow mirrors a data-language platform: <b>Connect</b> tables → <b>Quick Run</b> (stateless) → <b>Workspace</b> run with held-out split → serve as <b>Endpoint</b> → every change logged in <b>Reports</b> → narrate with <b>Chat</b> or call via <b>API/MCP</b>.</span></div>
  </div>
  <div class="modal-foot">${btn('Reset to empty workspace', 'reset-fresh', { cls: 'ghost', ico: 'reset' })}<span class="spacer"></span>${btn('Close', 'close', { cls: 'primary' })}</div></div>`;

/* ---------- Command palette ---------- */
function paletteItems() {
  const items = [
    ...[['overview', 'grid', 'Overview', 'G O'], ['data', 'db', 'Data', 'G D'], ['quick-run', 'bolt', 'Quick Run', 'G Q'], ['workspace', 'flask', 'Workspace', 'G W'], ['endpoints', 'layers', 'Endpoints', 'G E'], ['api', 'key', 'API & MCP', 'G A'], ['reports', 'report', 'Reports', 'G R'], ['chat', 'chat', 'Chat', 'G C']].map(([to, ic, l, k]) => ({ g: 'Go to', ic, l, k, run: () => go(to) })),
    { g: 'Actions', ic: 'upload', l: 'Connect data / upload file', run: () => openConnect('upload') },
    { g: 'Actions', ic: 'db', l: 'Connect a database', run: () => openConnect('db') },
    { g: 'Actions', ic: 'wand', l: 'Generate synthetic data', run: () => openGenerate() },
    { g: 'Actions', ic: 'bolt', l: 'New quick run', run: () => go('quick-run') },
    { g: 'Actions', ic: 'plus', l: 'New workspace run', run: () => { S.wiz = null; go('workspace/new'); } },
    { g: 'Actions', ic: 'key', l: 'Create API key', run: () => showModal('key', { name: '', scope: 'inference', exp: 'never' }) },
    { g: 'Actions', ic: 'plug', l: 'Connect LLM provider', run: () => openLlm() },
    { g: 'Actions', ic: 'chat', l: 'New chat', run: () => go('chat') },
    { g: 'Actions', ic: S.theme === 'dark' ? 'sun' : 'moon', l: `Switch to ${S.theme === 'dark' ? 'light' : 'dark'} mode`, run: () => ACTIONS['toggle-theme']() },
    ...S.datasets.map((d) => ({ g: 'Tables', ic: 'table', l: d.name, k: compact(d.rows) + ' rows', run: () => showModal('dataset', { id: d.id, tab: 'profile' }) })),
    ...S.endpoints.map((e) => ({ g: 'Endpoints', ic: 'layers', l: e.name, k: e.id, run: () => showModal('endpoint', { id: e.id, tab: 'overview', input: playInput(e) }) })),
    ...S.runs.map((r) => ({ g: 'Runs', ic: r.mode === 'quick' ? 'bolt' : 'flask', l: r.name, k: r.id, run: () => go('run/' + r.id) })),
  ];
  const q = (M.q || '').toLowerCase().trim();
  if (!q) return items.filter((i) => i.g !== 'Tables' && i.g !== 'Runs');
  const toks = q.split(/\s+/);
  return items.filter((i) => toks.every((t) => (i.l + ' ' + i.g + ' ' + (i.k || '')).toLowerCase().includes(t))).slice(0, 40);
}
MODALS.palette = () => {
  const items = paletteItems();
  M.items = items; M.idx = clamp(M.idx || 0, 0, Math.max(0, items.length - 1));
  let g = '';
  return `<div class="palette" role="dialog" aria-label="Command palette">
    <div class="palette-input">${icon('search', 17)}<input id="palette-q" placeholder="Search pages, tables, endpoints, actions…" value="${esc(M.q || '')}" data-input="palette-q" autocomplete="off" /><kbd>esc</kbd></div>
    <div class="palette-list">${items.length ? items.map((it, i) => { const head = it.g !== g ? `<div class="palette-group">${it.g}</div>` : ''; g = it.g; return `${head}<button class="palette-item ${i === M.idx ? 'on' : ''}" data-action="palette-run" data-arg="${i}">${icon(it.ic, 15)}${esc(it.l)}${it.k ? (/^[A-Z] [A-Z]$/.test(it.k) ? `<kbd>${it.k}</kbd>` : `<small>${esc(it.k)}</small>`) : ''}</button>`; }).join('') : '<p class="muted" style="padding:16px">No results.</p>'}</div>
    <div class="palette-foot"><span>↑↓ navigate</span><span>↵ open</span><span>esc close</span></div>
  </div>`;
};
MODALS.palette.focus = '#palette-q';
function openPalette() { showModal('palette', { q: '', idx: 0 }); }
function drawPaletteList() {
  // keep input focus while filtering
  const input = $('#palette-q'); const pos = input ? input.selectionStart : 0;
  drawModal(true);
  const i2 = $('#palette-q'); if (i2) { i2.focus(); i2.setSelectionRange(pos, pos); }
}

/* ==========================================================================
   Actions, input handlers, simulation engine, init
   ========================================================================== */
function redrawKeepFocus() {
  const a = document.activeElement;
  const key = a && a.dataset ? a.dataset.input : null;
  const pos = a && 'selectionStart' in a ? [a.selectionStart, a.selectionEnd] : null;
  drawModal(true);
  if (key) { const el = $(`[data-input="${key}"]`, $('#overlay-root')); if (el) { el.focus(); if (pos && el.setSelectionRange && el.type !== 'range') try { el.setSelectionRange(pos[0], pos[1]); } catch (e) { /* noop */ } } }
}
function confirmDialog(title, text, okLabel, onOk, danger = true) { showModal('confirm', { title, text, okLabel, onOk, danger }); }
function openConnect(tab = 'upload') {
  showModal('connect', { tab, name: '', files: [], dbProvider: null, db: { host: '', port: '', database: '', user: '', password: '' }, dbState: 'idle', tables: [], cloudProvider: null, cloudPath: '', cloudState: 'idle', cloudFiles: [], api: { url: 'https://api.reminders.northvale-screening.example/v2/events?since=2026-10-01', kind: 'rest', auth: 'Authorization: Bearer nv_…••••', refresh: 'hourly' }, apiState: 'idle' });
}
function openGenerate() { showModal('generate', { mode: 'scratch', name: '', desc: '', desc2: '', rows: 1000, sector: '', colMode: 'count', ncols: 10, colDefs: '', python: false, code: 'import numpy as np\n\ndef generate(n):\n    age = np.random.randint(50, 75, n)\n    imd = np.random.randint(1, 11, n)\n    p = 0.69 + 0.025 * (imd - 5.5)\n    return {"age": age, "imd_decile": imd, "attended": np.random.rand(n) < p}', seedDs: S.datasets[0]?.id, noise: 3, preview: null, state: 'idle', progress: 0 }); }
function openLlm() { showModal('llm', { provider: 'anthropic', key: '', consent: false, busy: false }); }
function playInput(e) {
  const d = dsById(e.datasets[0]);
  if (!d) return '{\n  "rows": []\n}';
  const cols = datasetColumns(d).filter((c) => c.name !== d.target && c.name !== e.target).slice(0, 6);
  const rows = previewRows(d, 2).map((r) => Object.fromEntries(cols.map((c) => [c.name, r[datasetColumns(d).findIndex((x) => x.name === c.name)]])));
  return JSON.stringify({ rows }, null, 2);
}
function guessSector(names) {
  const s = names.join(' ').toLowerCase();
  if (/patient|screening|invitation|programme|attend|clinic|diagnos|referral|gp_practice|imd/.test(s)) return 'Healthcare';
  if (/polic|premium|deductible|insur|broker|underwrit|lapse/.test(s)) return 'Insurance';
  if (/hrv|athlet|sport|injur|sleep|vo2|rpe|sprint|fatigue|soreness/.test(s)) return 'Sports performance';
  if (/patient|diagnos|clinic|bp|cholesterol|hba1c|icd/.test(s)) return 'Healthcare';
  if (/loan|credit|income|default|iban|balance/.test(s)) return 'Finance';
  if (/store|sku|basket|order|product|price/.test(s)) return 'Retail';
  if (/mrr|churn|plan|seats|subscription|tenant/.test(s)) return 'SaaS';
  if (/kwh|mw|meter|solar|wind|load/.test(s)) return 'Energy';
  return 'General';
}
const cleanName = (s) => String(s).trim().replace(/[:;()|]/g, '_').slice(0, 40) || 'col';
const cleanVal = (s) => String(s).replace(/[:;()|]/g, ' ').trim().slice(0, 24);

/* ---------- Real local parsing for uploads ---------- */
function splitLine(line, d) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === d && !q) { out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur); return out;
}
function inferSpec(header, rows) {
  return header.map((h, j) => {
    const name = cleanName(h);
    const vals = rows.map((r) => r[j]).filter((v) => v != null && String(v).trim() !== '');
    const uniq = [...new Set(vals.map(String))];
    const nums = vals.map(Number);
    if (/(^id$|_id$|uuid|^key$)/i.test(name) && uniq.length > rows.length * .8) return `${name}:id(${name.slice(0, 3).toUpperCase()})`;
    if (vals.length && uniq.every((v) => /^(true|false|0|1|yes|no)$/i.test(v)) && uniq.length <= 2) return `${name}:bool(0.5)`;
    if (vals.length && nums.every((n) => !isNaN(n))) { const mn = Math.min(...nums), mx = Math.max(...nums); return nums.every(Number.isInteger) ? `${name}:int(${mn}-${mx})` : `${name}:float(${mn}-${mx})`; }
    if (vals.length && vals.every((v) => (/^\d{4}-\d{2}-\d{2}/.test(v) && !isNaN(Date.parse(v))) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v))) return `${name}:date`;
    if (uniq.length && uniq.length <= 12) return `${name}:cat(${uniq.map(cleanVal).filter(Boolean).join('|') || 'a'})`;
    return `${name}:text(${uniq.slice(0, 6).map(cleanVal).filter(Boolean).join('|') || 'text'})`;
  }).join(';');
}
async function parseFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (file.size > 50 * 1048576) throw new Error('File is larger than 50 MB');
  if (['csv', 'tsv', 'txt'].includes(ext)) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) throw new Error('Needs a header and at least one row');
    const h = lines[0], d = h.includes('\t') ? '\t' : (h.split(';').length > h.split(',').length ? ';' : ',');
    const header = splitLine(h, d);
    const sample = lines.slice(1, 301).map((l) => splitLine(l, d));
    return { rows: lines.length - 1, ncols: header.length, spec: inferSpec(header, sample), preview: sample.slice(0, 10).map((r) => header.map((_, j) => (r[j] == null || r[j] === '' ? null : r[j]))), header, type: 'CSV' };
  }
  if (ext === 'json') {
    const data = JSON.parse(await file.text());
    let arr = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : Array.isArray(data.records) ? data.records : [data];
    arr = arr.filter((x) => x && typeof x === 'object');
    if (!arr.length) throw new Error('No records found in JSON');
    const header = [...new Set(arr.slice(0, 50).flatMap((o) => Object.keys(o)))].slice(0, 60);
    const sample = arr.slice(0, 300).map((o) => header.map((k) => (o[k] != null && typeof o[k] === 'object' ? JSON.stringify(o[k]) : o[k])));
    return { rows: arr.length, ncols: header.length, spec: inferSpec(header, sample), preview: sample.slice(0, 10).map((r) => r.map((v) => (v == null ? null : String(v)))), header, type: 'JSON' };
  }
  // Excel / parquet: simulated server-side parse in the prototype
  await sleep(300);
  const r = rng(file.name);
  return { rows: Math.round(between(r, 800, 24000)), ncols: 17, spec: SPECS.clinicSites, preview: null, header: null, type: ext === 'parquet' ? 'PARQUET' : 'XLSX', simulated: true };
}
async function addFiles(fileList) {
  for (const f of fileList) {
    const item = { name: f.name, size: f.size, ext: (f.name.split('.').pop() || 'csv').toLowerCase(), status: 'uploading', progress: 0 };
    M.files.push(item); drawModal(true);
    for (let p = 0; p <= 60; p += 12 + Math.random() * 10) { item.progress = p; await sleep(80); if (M?.type === 'connect') drawModal(true); }
    item.status = 'parsing';
    try {
      const parsed = await parseFile(f);
      for (let p = item.progress; p <= 100; p += 14) { item.progress = Math.min(100, p); await sleep(70); if (M?.type === 'connect') drawModal(true); }
      Object.assign(item, parsed, { status: 'ready', progress: 100, sector: guessSector(parsed.header || [f.name]) });
    } catch (err) { item.status = 'error'; item.error = err.message || 'Could not parse file'; }
    if (M?.type === 'connect') drawModal(true);
  }
}
function datasetFromUpload(f) {
  const cols = parseSpec(f.spec);
  const tgt = cols.find((c) => /target|label|churn|injur|default|outcome|class|risk|score/i.test(c.name)) || cols[cols.length - 1];
  return { id: uid('ds'), name: f.name, type: f.type || f.ext.toUpperCase(), rows: f.rows, ncols: f.ncols, bytes: f.size, sector: f.sector, folder: 'uploads', target: tgt?.name, spec: f.spec, preview: f.preview, created: now(), source: 'upload' };
}

/* ---------- Runs ---------- */
function runCost(run) {
  const rows = run.datasets.reduce((a, id) => a + (dsById(id)?.rows || 0), 0);
  if (run.mode === 'quick') return 0.4 + rows / 60000;
  return (2 + rows / 9000) * (run.base === 'clyra-2.1-preview' ? 1.6 : run.base === 'clyra-2-mini' ? .5 : 1);
}
function startRun(cfg) {
  const run = makeRun(cfg);
  const cost = runCost(run);
  if (S.usage.used + cost > S.usage.limit) { toast('Not enough compute units', `Needs ${cost.toFixed(1)} CU · ${(S.usage.limit - S.usage.used).toFixed(1)} left this week`, { kind: 'err' }); return null; }
  run.cost = cost;
  run.logs = [];
  S.runs.unshift(run);
  logActivity(`${run.mode === 'quick' ? 'Quick run' : 'Run'} <b>${esc(run.name)}</b> started`);
  return run;
}
function completeRun(run) {
  run.status = 'completed'; run.progress = 100; run.finished = now(); run.stage = STAGES[run.mode].length;
  const plan = planLogs(run);
  while (run.logs.length < plan.length) run.logs.push({ ...plan[run.logs.length], ts: now() });
  S.usage.used = +(S.usage.used + (run.cost || runCost(run))).toFixed(2);
  logActivity(`${run.mode === 'quick' ? 'Quick run' : 'Run'} <b>${esc(run.name)}</b> completed${run.mode === 'workspace' ? ` · ${run.result.metrics.primaryName} ${fmtP(run.result.metrics.primaryName, run.result.metrics.primary)}` : ''}`);
  notify('Run completed', run.name, 'run/' + run.id);
  const onPage = (R.name === 'run' && R.param === run.id) || (R.name === 'quick-run' && S.qr.lastRunId === run.id);
  toast(run.mode === 'quick' ? 'Quick run finished' : 'Run completed', run.mode === 'workspace' ? `${run.result.metrics.primaryName} ${fmtP(run.result.metrics.primaryName, run.result.metrics.primary)} on held-out rows` : `${num(run.result.rows)} rows · ${run.result.task}`, { kind: 'ok', action: onPage ? null : { label: 'View', run: () => go('run/' + run.id) } });
}

/* ---------- Endpoint ops ---------- */
function endpointOp(e, op) {
  const run = runById(e.runId);
  e.status = op === 'refresh' ? 'refreshing' : op === 'upgrade' ? 'upgrading' : 'deploying';
  e.busyUntil = now() + (op === 'create' ? 2600 : 3600);
  e.pendingOp = op;
  logActivity(`Endpoint <b>${esc(e.name)}</b> ${op === 'create' ? 'deploying' : op === 'refresh' ? 'refreshing on latest data' : 'upgrading base'}`);
}
function finishEndpointOp(e) {
  const run = runById(e.runId);
  const op = e.pendingOp;
  e.status = 'serving'; delete e.busyUntil; delete e.pendingOp;
  if (op === 'refresh') delete e.drift;
  if (op === 'create') {
    const rep = makeReport(e, run, 'create', 1);
    S.reports.unshift(rep);
    notify('Endpoint live', `${e.name} · report v1`, 'endpoints');
    toast('Endpoint is live', `${e.name} · ${e.metricName} ${fmtP(e.metricName, e.metric)}`, { kind: 'ok' });
  } else {
    const delta = op === 'upgrade' ? between(Math.random, .006, .018) : between(Math.random, -.003, .012);
    if (op === 'upgrade') e.base = 'clyra-2.1-preview';
    e.version += 1;
    const rep = makeReport(e, run, op, e.version, (e.metric - run.result.metrics.primary) + delta);
    S.reports.unshift(rep);
    e.metric = rep.metrics.primary;
    S.usage.used = +(S.usage.used + (op === 'upgrade' ? 3.2 : 1.8)).toFixed(2);
    notify(op === 'upgrade' ? 'Endpoint upgraded' : 'Endpoint refreshed', `${e.name} → v${e.version} · ${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)} pts`, 'reports');
    toast(op === 'upgrade' ? 'Upgrade complete' : 'Refresh complete', `${e.name} v${e.version} · ${e.metricName} ${fmtP(e.metricName, e.metric)} (${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)} pts)`, { kind: 'ok', action: { label: 'Report', run: () => showModal('report', { id: rep.id }) } });
    logActivity(`Endpoint <b>${esc(e.name)}</b> ${op === 'upgrade' ? 'upgraded' : 'refreshed'} to <span class="mono">v${e.version}</span>`);
  }
}

/* ---------- Chat ---------- */
let chatBusy = false;
async function sendChat(text) {
  text = (text || '').trim();
  if (!text || chatBusy) return;
  const epId = R.param ? S.conversations.find((c) => c.id === R.param)?.endpointId : S.ui.chatEndpoint || S.endpoints[0]?.id;
  const ep = epById(epId);
  if (!ep || !S.llm.length) return;
  let conv = R.param && S.conversations.find((c) => c.id === R.param);
  const provider = conv?.provider || S.ui.chatProvider || S.llm[0].provider;
  if (!conv) {
    conv = { id: uid('chat'), title: text.slice(0, 80), endpointId: ep.id, provider, created: now(), messages: [] };
    S.conversations.unshift(conv);
  }
  conv.messages.push({ role: 'user', text });
  chatBusy = true;
  if (R.param !== conv.id) { location.hash = '#/chat/' + conv.id; await sleep(30); } else refresh();
  const blocks = answerFor(text, ep);
  const t0 = now();
  const scroll = $('#chat-scroll');
  let body = null;
  if (scroll && R.param === conv.id) {
    const wrap = document.createElement('div');
    wrap.className = 'msg';
    wrap.innerHTML = `<span class="ai-ico">${logoMark('inv xs')}</span><div class="ai-body"><div class="typing"><i></i><i></i><i></i></div><div class="ai-meta"><span>querying ${ep.id}…</span></div></div>`;
    scroll.appendChild(wrap); scroll.scrollTop = scroll.scrollHeight;
    body = wrap.querySelector('.ai-body');
  }
  await sleep(900 + Math.random() * 500);
  if (body && body.isConnected) {
    body.innerHTML = '';
    for (const b of blocks) {
      if (!body.isConnected) break;
      if (b.t === 'p' || b.t === 'h') {
        const el = document.createElement(b.t === 'h' ? 'h4' : 'p'); body.appendChild(el);
        const toks = b.v.split(/(<[^>]+>|\s+)/).filter(Boolean);
        for (let i = 0; i <= toks.length; i += 3) { el.innerHTML = toks.slice(0, i).join(''); scroll.scrollTop = scroll.scrollHeight; await sleep(22); }
        el.innerHTML = b.v;
      } else {
        const tmp = document.createElement('div'); tmp.innerHTML = renderBlocks([b]);
        const el = tmp.firstElementChild; el.style.animation = 'page-in .35s var(--ease) both'; body.appendChild(el);
        scroll.scrollTop = scroll.scrollHeight; await sleep(240);
      }
    }
  }
  const p = PROVIDERS.find((x) => x.id === provider);
  conv.messages.push({ role: 'ai', blocks, meta: `${p.label.toLowerCase()} · ${((now() - t0) / 1000).toFixed(1)}s · ${1 + (blocks.length > 3 ? 1 : 0)} call${blocks.length > 3 ? 's' : ''} to ${ep.id}` });
  ep.requests += 1;
  S.flags.chatted = true;
  chatBusy = false;
  if (R.name === 'chat' && R.param === conv.id) refresh(); else save();
  const ta = $('#chat-input'); if (ta) ta.focus();
}

/* ---------- Action map ---------- */
const A = (el) => el.dataset.arg;
const ACTIONS = {
  nav: (el) => { const to = el.dataset.to; if (to === 'workspace/new' && !el.closest('.wizard')) { if (S.wiz && S.wiz.step === 0 && !S.wiz.datasets.length) S.wiz = null; } closeOverlay(); go(to); },
  close: () => closeOverlay(),
  'toggle-sb': () => { S.ui.sbCollapsed = !S.ui.sbCollapsed; $('#shell').classList.toggle('sb-collapsed', S.ui.sbCollapsed); renderSidebar(); save(); },
  'open-sidebar': () => $('#shell').classList.add('nav-open'),
  'close-sidebar': () => $('#shell').classList.remove('nav-open'),
  palette: () => openPalette(),
  'palette-run': (el) => { const it = M.items[+A(el)]; closeOverlay(); it && it.run(); },
  help: () => showModal('help'),
  'toggle-theme': () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = S.theme; $('meta[name=theme-color]').content = S.theme === 'dark' ? '#0b1010' : '#f2f3f1'; renderSidebar(); save(); if (M && M.type === 'popover') closeOverlay(); },
  'toggle-wsnav': () => { S.ui.wsNavOpen = !S.ui.wsNavOpen; renderSidebar(); save(); },
  'toggle-onboard': (el, e) => { if (e.target.closest('.step')) return; S.ui.onboardOpen = !S.ui.onboardOpen; refresh(); },
  'open-step': (el) => { S.ui.openStep = S.ui.openStep === A(el) ? '__none' : A(el); refresh(); },

  'open-notifs': (el) => {
    const list = S.notifications.slice(0, 8);
    openPopover(el, `<div class="pop-head"><span>Notifications</span><button class="link-btn" data-action="notifs-read" style="font-size:11px">Mark all read</button></div>${list.length ? list.map((n) => `<button class="notif" data-action="notif-go" data-arg="${n.id}"><span class="dot ${n.read ? 'idle' : 'live'}"></span><span><b style="font-weight:600">${esc(n.title)}</b> · <span class="muted">${esc(n.sub)}</span><small>${ago(n.ts)}</small></span></button>`).join('') : '<p class="muted" style="padding:10px">You’re all caught up.</p>'}`, 340);
  },
  'notifs-read': () => { S.notifications.forEach((n) => (n.read = true)); closeOverlay(); renderTopbar(); save(); },
  'notif-go': (el) => { const n = S.notifications.find((x) => x.id === A(el)); if (n) { n.read = true; closeOverlay(); go(n.route); } },
  'profile-menu': (el) => openPopover(el, `<div class="pop-head" style="display:block"><b>${esc(S.user.name)}</b><div class="mono muted" style="font-size:10.5px;font-weight:400">${esc(S.user.email)} · ${S.user.role}</div></div><div class="pop-sep"></div>
    <button class="pop-item" data-action="toggle-theme">${icon(S.theme === 'dark' ? 'sun' : 'moon', 15)}${S.theme === 'dark' ? 'Light' : 'Dark'} mode</button>
    <button class="pop-item" data-action="help">${icon('help', 15)}Docs & shortcuts</button>
    <div class="pop-sep"></div>
    <button class="pop-item" data-action="reset-demo">${icon('spark', 15)}Load demo workspace</button>
    <button class="pop-item" data-action="reset-fresh">${icon('reset', 15)}Reset to empty workspace</button>
    <div class="pop-sep"></div>
    <button class="pop-item danger" data-action="signout">${icon('logout', 15)}Sign out</button>`, 260),
  'ws-menu': (el) => openPopover(el, `<div class="pop-head">Workspaces</div><button class="pop-item">${icon('check', 15)}<b>${esc(S.workspace.name)}</b><span class="spacer"></span><span class="tag">${S.workspace.plan}</span></button><div class="ws-info"><div><span>Region</span><b>${S.workspace.region}${S.workspace.regionName ? ` (${S.workspace.regionName})` : ''}</b></div>${S.workspace.ukGdpr ? '<div><span>Compliance</span><b>UK GDPR</b></div>' : ''}${S.workspace.deployment ? `<div><span>Deployment</span><b>${esc(S.workspace.deployment)}</b></div>` : ''}</div><button class="pop-item" data-action="ws-switch">${icon('flask', 15)}${esc(S.workspace.name)} · Sandbox</button><div class="pop-sep"></div><button class="pop-item" data-action="ws-switch">${icon('plus', 15)}Create workspace</button>`, 320),
  'ws-switch': () => { closeOverlay(); toast('Workspaces are simulated', 'This prototype has a single workspace.'); },
  signout: () => { closeOverlay(); toast('Sign-out disabled', 'This is a design prototype.'); },
  'reset-fresh': () => confirmDialog('Reset to an empty workspace?', 'Removes connections, runs, endpoints, keys and chats so you can walk through onboarding from step 1.', 'Reset workspace', () => { const theme = S.theme; S = freshState(); S.theme = theme; go('overview'); render(); toast('Workspace reset', 'Start at step 1: connect data.', { kind: 'ok' }); }),
  'reset-demo': () => confirmDialog('Load the demo workspace?', 'Replaces the current state with a populated workspace: Northvale Screening Partnership with 4 connected sources, 10 runs, 4 endpoints, reports, API keys and chats.', 'Load demo', () => { const theme = S.theme; S = demoState(); S.theme = theme; go('overview'); render(); toast('Demo workspace loaded', '', { kind: 'ok' }); }, false),
  'm-confirm': () => { const fn = M.onOk; closeOverlay(); fn && fn(); },

  'cc-toggle': (el) => { const [cid, si] = A(el).split(':'); const c = CHARTS[cid]; if (!c) return; const i = +si; c.hidden = c.hidden.includes(i) ? c.hidden.filter((x) => x !== i) : (c.hidden.length < c.series.length - 1 ? [...c.hidden, i] : c.hidden); el.closest('.cc').outerHTML = chartHTML(cid); },
  'cc-range': (el) => { const [cid, r] = A(el).split(':'); const c = CHARTS[cid]; if (!c) return; c.range = +r; el.closest('.cc').outerHTML = chartHTML(cid); },
  'home-ask': () => { const i = $('#home-ask'); const q = i && i.value.trim(); if (!q) { i && i.focus(); return; } const e = pickEndpointFor(q); if (!e) { go('chat'); return; } S.ui.chatEndpoint = e.id; go('chat'); setTimeout(() => sendChat(q), 150); },
  'home-tab': (el) => { S.ui.homeTab = A(el); refresh(); },
  'attn-refresh': (el) => { const e = epById(A(el)); endpointOp(e, 'refresh'); refresh(); toast('Refreshing endpoint', `${e.name} · re-fitting on latest rows`); },
  'ask-about': (el) => { S.ui.chatEndpoint = A(el); const q = el.dataset.q; go('chat'); setTimeout(() => sendChat(q), 150); },

  /* Data */
  connect: (el) => openConnect(A(el) || 'upload'),
  generate: () => openGenerate(),
  'data-view': (el) => { S.ui.dataView = A(el); refresh(); },
  folder: (el) => { S.ui.folder = A(el); refresh(); },
  'new-folder': () => showModal('folder', { name: '' }),
  'm-folder-create': () => { const id = uid('fld'); S.folders.push({ id, name: M.name.trim() }); S.ui.folder = id; closeOverlay(); refresh(); toast('Folder created', M?.name || ''); },
  'clear-filters': () => { S.ui.q = ''; S.ui.typeFilter = 'all'; S.ui.folder = 'all'; refresh(); },
  'toggle-select': (el) => { const id = A(el); const s = S.ui.selected; S.ui.selected = s.includes(id) ? s.filter((x) => x !== id) : [...s, id]; refresh(); },
  'select-all': () => { const ids = filteredDatasets().map((d) => d.id); const all = ids.every((id) => S.ui.selected.includes(id)); S.ui.selected = all ? [] : ids; refresh(); },
  'clear-select': () => { S.ui.selected = []; refresh(); },
  'open-dataset': (el) => showModal('dataset', { id: A(el), tab: 'profile' }),
  'dataset-menu': (el) => { const d = dsById(A(el)); openPopover(el, `<button class="pop-item" data-action="open-dataset" data-arg="${d.id}">${icon('eye', 15)}Open profile</button><button class="pop-item" data-action="ds-quick" data-arg="${d.id}">${icon('bolt', 15)}Quick run</button><button class="pop-item" data-action="ds-run" data-arg="${d.id}">${icon('flask', 15)}New workspace run</button><button class="pop-item" data-action="ds-seed" data-arg="${d.id}">${icon('wand', 15)}Generate synthetic copy</button>${d.builtin ? '' : `<div class="pop-sep"></div><button class="pop-item danger" data-action="ds-delete" data-arg="${d.id}">${icon('trash', 15)}Delete</button>`}`, 230); },
  'ds-quick': (el) => { closeOverlay(); S.qr.datasets = [A(el)]; S.qr.lastRunId = null; go('quick-run'); },
  'ds-run': (el) => { closeOverlay(); S.wiz = null; pageWizard(); S.wiz.datasets = [A(el)]; S.wiz.step = 1; go('workspace/new'); },
  'ds-seed': (el) => { openGenerate(); M.mode = 'seed'; M.seedDs = A(el); M.name = (dsById(A(el))?.name || 'data').replace(/\.\w+$/, '') + '_synthetic'; drawModal(true); },
  'ds-delete': (el) => { const d = dsById(A(el)); confirmDialog(`Delete ${d.name}?`, 'Stored rows are removed immediately. Runs and endpoints built on it keep their reports.', 'Delete table', () => { S.datasets = S.datasets.filter((x) => x.id !== d.id); logActivity(`Deleted <b>${esc(d.name)}</b>`); refresh(); toast('Table deleted', d.name); }); },
  'm-ds-quick': () => { const id = M.id; closeOverlay(); S.qr.datasets = [id]; S.qr.lastRunId = null; go('quick-run'); },
  'm-ds-run': () => { const id = M.id; closeOverlay(); S.wiz = null; pageWizard(); S.wiz.datasets = [id]; S.wiz.step = 1; go('workspace/new'); },
  'm-ds-delete': () => { const id = M.id; ACTIONS['ds-delete']({ dataset: { arg: id } }); },
  'bulk-quick': () => { S.qr.datasets = S.ui.selected.slice(); S.qr.lastRunId = null; S.ui.selected = []; go('quick-run'); },
  'bulk-run': () => { S.wiz = null; pageWizard(); S.wiz.datasets = S.ui.selected.slice(); S.wiz.step = 1; S.ui.selected = []; go('workspace/new'); },
  'bulk-delete': () => {
    const del = S.ui.selected.map(dsById).filter((d) => d && !d.builtin);
    const skipped = S.ui.selected.length - del.length;
    if (!del.length) { toast('Built-in samples can’t be deleted', 'Select uploads, synthetic or connected tables.', { kind: 'err' }); return; }
    confirmDialog(`Delete ${del.length} table${del.length > 1 ? 's' : ''}?`, `${skipped ? `${skipped} built-in sample(s) will be skipped. ` : ''}This can’t be undone.`, 'Delete', () => { S.datasets = S.datasets.filter((d) => !del.includes(d)); S.ui.selected = []; refresh(); toast(`${del.length} table${del.length > 1 ? 's' : ''} deleted`, '', { kind: 'ok' }); });
  },
  'sync-conn': (el) => { const c = connById(A(el)); c.status = 'syncing'; c.syncUntil = now() + 2400; refresh(); },
  'delete-conn': (el) => { const c = connById(A(el)); confirmDialog(`Delete ${c.name}?`, `Removes the connection and its ${S.datasets.filter((d) => d.conn === c.id).length} imported tables immediately. No trash, no undo.`, 'Delete connection', () => { S.connections = S.connections.filter((x) => x.id !== c.id); S.datasets = S.datasets.filter((d) => d.conn !== c.id); S.folders = S.folders.filter((f) => f.id !== c.id); if (S.ui.folder === c.id) S.ui.folder = 'all'; logActivity(`Deleted connection <b>${esc(c.name)}</b>`); refresh(); toast('Connection deleted', c.name); }); },

  /* Connect modal */
  'm-tab': (el) => { M.tab = A(el); drawModal(true); },
  'm-browse': () => $('#file-input').click(),
  'm-example': async () => {
    const csv = 'call_id,patient_ref,programme,age,sex,postcode_area,language,distance_km,days_since_invite,called_on,booked\n' + Array.from({ length: 640 }, (_, i) => { const r = rng('ex' + i); const prog = pick(r, ['Breast', 'Cervical', 'Bowel']); const [lo, hi] = { Breast: [50, 71], Cervical: [25, 64], Bowel: [50, 74] }[prog]; return [`CALL-${30410 + i}`, `pt_${Math.floor(r() * 0xffffff).toString(16).padStart(6, '0')}`, prog, Math.round(lo + r() * (hi - lo)), prog === 'Bowel' ? pick(r, ['F', 'M']) : 'F', pick(r, ['NE1', 'LS6', 'BD3', 'M14', 'B12', 'NG7', 'E13']), pick(r, ['English', 'English', 'English', 'Polish', 'Urdu', 'Bengali', 'Somali']), r() < .1 ? '' : (0.5 + r() * 36).toFixed(1), Math.round(r() * 60), `${String(1 + (i % 28)).padStart(2, '0')}/${String(7 + (i % 3)).padStart(2, '0')}/2026`, r() < .64 ? 1 : 0].join(','); }).join('\n');
    const file = new File([csv], 'outreach_calls_october.csv', { type: 'text/csv' });
    await addFiles([file]);
  },
  'm-remove-file': (el) => { M.files.splice(+A(el), 1); drawModal(true); },
  'm-upload-connect': () => {
    const ready = M.files.filter((f) => f.status === 'ready');
    const created = ready.map(datasetFromUpload);
    S.datasets.push(...created);
    S.ui.folder = 'uploads';
    logActivity(`Uploaded <b>${created.map((d) => esc(d.name)).join(', ')}</b>`);
    notify('Upload complete', `${created.length} table${created.length > 1 ? 's' : ''} profiled`, 'data');
    closeOverlay();
    if (R.name === 'quick-run') { S.qr.datasets = [...new Set([...S.qr.datasets, ...created.map((d) => d.id)])]; refresh(); }
    else if (R.name === 'workspace/new' && S.wiz) { S.wiz.datasets = [...new Set([...S.wiz.datasets, ...created.map((d) => d.id)])]; refresh(); }
    else go('data');
    toast(`${created.length} table${created.length > 1 ? 's' : ''} added`, created.map((d) => `${d.name} · ${compact(d.rows)} rows`).join(', '), { kind: 'ok', action: { label: 'Quick run', run: () => { S.qr.datasets = created.map((d) => d.id); S.qr.lastRunId = null; go('quick-run'); } } });
  },
  'm-db-provider': (el) => { const p = DB_PROVIDERS.find((x) => x.id === A(el)); M.dbProvider = p.id; M.name = `${p.label} · production`; M.db = { host: p.id === 'supabase' ? 'db.xyzcompany.supabase.co' : p.id === 'snowflake' ? 'northvale.eu-west-2.snowflakecomputing.com' : p.id === 'bigquery' ? 'northvale-analytics' : 'screening-replica.northvale.internal', port: String(p.port), database: p.id === 'snowflake' ? 'SCREENING' : 'screening', user: 'clyra_readonly', password: '' }; M.dbState = 'idle'; M.tables = []; drawModal(true); },
  'm-db-test': async () => {
    if (!M.db.host.trim()) { M.dbState = 'error'; drawModal(true); return; }
    M.dbState = 'testing'; drawModal(true); await sleep(1400); if (M?.type !== 'connect') return;
    const up = M.dbProvider === 'snowflake';
    M.tables = [['invitations_archive', 'invitations', 734880, 18], ['results', 'resultsFollowup', 1182400, 9], ['clinic_slots', 'clinicCapacity', 91200, 7], ['practice_lists', 'practiceLists', 412, 6], ['register_snapshot', 'patients', 2104380, 9], ['dispatch_log', 'reminders', 9120380, 8]].map(([n, spec, rows, ncols], i) => ({ name: up ? `SCREENING.${n.toUpperCase()}` : `public.${n}`, spec, rows, ncols, on: i < 3 }));
    M.dbState = 'ok'; drawModal(true);
  },
  'm-db-table': (el) => { const t = M.tables[+A(el)]; t.on = !t.on; drawModal(true); },
  'm-db-import': () => {
    const id = uid('conn'), on = M.tables.filter((t) => t.on);
    S.connections.push({ id, name: M.name || 'Database', kind: M.dbProvider, type: 'Database', host: M.db.host, status: 'syncing', syncUntil: now() + 3200, synced: false, lastSync: now(), tables: on.length });
    S.folders.push({ id, name: M.name || 'Database', conn: true });
    const ds = on.map((t) => ({ id: uid('ds'), name: t.name, type: 'TABLE', rows: t.rows, ncols: t.ncols, bytes: t.rows * t.ncols * 9, sector: 'Healthcare', folder: id, conn: id, target: parseSpec(SPECS[t.spec]).slice(-1)[0].name, spec: SPECS[t.spec], created: now() }));
    S.datasets.push(...ds);
    logActivity(`Connected <b>${esc(M.name)}</b> · ${on.length} tables`);
    closeOverlay(); S.ui.folder = id; go('data');
    toast('Database connected', `Importing ${on.length} tables · syncing in background`, { kind: 'ok' });
  },
  'm-cloud-provider': (el) => { const p = CLOUD_PROVIDERS.find((x) => x.id === A(el)); M.cloudProvider = p.id; M.cloudPath = p.path; M.cloudState = 'idle'; M.cloudFiles = []; drawModal(true); },
  'm-cloud-browse': async () => {
    M.cloudState = 'loading'; drawModal(true); await sleep(1100); if (M?.type !== 'connect') return;
    M.cloudFiles = [['clinic_slots_2026_q4_partial.parquet', 'PARQUET', 8_400_000, 61_230, 'clinicCapacity'], ['imd_2025_by_postcode_area.csv', 'CSV', 1_200_000, 2_214, 'imd'], ['reminder_events_sept.json', 'JSON', 6_100_000, 22_910, 'reminders'], ['mobile_unit_rota_q4.xlsx', 'XLSX', 820_000, 1_460, 'clinicSites'], ['readme.txt', 'TXT', 2_000, 0, null]].map(([name, type, bytes, rows, spec]) => ({ name, type, bytes, rows, spec, on: false, unsupported: !spec }));
    M.cloudState = 'ok'; drawModal(true);
  },
  'm-cloud-file': (el) => { const f = M.cloudFiles[+A(el)]; if (!f.unsupported) f.on = !f.on; drawModal(true); },
  'm-cloud-import': () => {
    const p = CLOUD_PROVIDERS.find((x) => x.id === M.cloudProvider), id = uid('conn'), on = M.cloudFiles.filter((f) => f.on);
    S.connections.push({ id, name: p.label, kind: p.id, type: 'Cloud', host: M.cloudPath, status: 'syncing', syncUntil: now() + 2600, lastSync: now(), tables: on.length });
    S.folders.push({ id, name: p.label, conn: true });
    S.datasets.push(...on.map((f) => ({ id: uid('ds'), name: f.name, type: f.type, rows: f.rows, ncols: parseSpec(SPECS[f.spec]).length + 6, bytes: f.bytes, sector: 'Healthcare', folder: id, conn: id, target: parseSpec(SPECS[f.spec]).slice(-1)[0].name, spec: SPECS[f.spec], created: now() })));
    logActivity(`Connected <b>${p.label}</b> · ${on.length} files`);
    closeOverlay(); S.ui.folder = id; go('data'); toast(`${p.label} connected`, `${on.length} files importing`, { kind: 'ok' });
  },
  'm-api-kind': (el) => { M.api.kind = A(el); drawModal(true); },
  'm-api-test': async () => { M.apiState = 'testing'; drawModal(true); await sleep(1000); if (M?.type !== 'connect') return; M.apiState = 'ok'; drawModal(true); },
  'm-api-connect': () => {
    const id = uid('conn'); let host = M.api.url; try { host = new URL(M.api.url).host; } catch (e) { /* keep raw */ }
    S.connections.push({ id, name: host, kind: 'api', type: 'API', host: M.api.url, status: 'syncing', syncUntil: now() + 2400, lastSync: now(), tables: 1 });
    S.folders.push({ id, name: host, conn: true });
    S.datasets.push({ id: uid('ds'), name: 'reminder_events_latest', type: 'JSON', rows: 3204, ncols: 8, bytes: 980000, sector: 'Healthcare', folder: id, conn: id, target: 'opened', spec: SPECS.reminders, created: now() });
    logActivity(`Connected API <b>${esc(host)}</b>`);
    closeOverlay(); S.ui.folder = id; go('data'); toast('API connected', `${M?.api?.refresh || 'hourly'} refresh · 3,204 records`, { kind: 'ok' });
  },

  /* Generate */
  'm-gen-mode': (el) => { M.mode = A(el); M.preview = null; drawModal(true); },
  'm-gen-colmode': (el) => { M.colMode = A(el); drawModal(true); },
  'm-gen-python': () => { M.python = !M.python; drawModal(true); },
  'm-gen-preview': () => { M.preview = genPreview(); drawModal(true); },
  'm-gen-run': async () => {
    M.state = 'generating'; M.progress = 0; drawModal(true);
    while (M && M.type === 'generate' && M.progress < 100) { await sleep(120); M.progress = Math.min(100, M.progress + 6 + Math.random() * 9); drawModal(true); }
    if (!M || M.type !== 'generate') return;
    const spec = genSpec();
    const rows = clamp(parseInt(M.rows, 10) || 1000, 1, 1e6);
    const name = (M.name.trim() || (M.mode === 'seed' ? (dsById(M.seedDs)?.name.replace(/\.\w+$/, '') || 'data') + '_synthetic' : (M.sector || 'synthetic').toLowerCase().replace(/\s+/g, '_') + '_sample')).replace(/\.csv$/, '') + '.csv';
    const ds = { id: uid('ds'), name, type: 'CSV', rows, ncols: parseSpec(spec).length, bytes: rows * parseSpec(spec).length * 7, sector: M.mode === 'seed' ? dsById(M.seedDs)?.sector : M.sector, folder: 'synthetic', target: parseSpec(spec).slice(-1)[0].name, spec, created: now() };
    S.datasets.push(ds);
    S.usage.used = +(S.usage.used + 0.3).toFixed(2);
    logActivity(`Generated synthetic <b>${esc(ds.name)}</b> · ${num(rows)} rows`);
    closeOverlay();
    if (R.name === 'quick-run') { S.qr.datasets.push(ds.id); refresh(); } else if (R.name === 'workspace/new' && S.wiz) { S.wiz.datasets.push(ds.id); refresh(); } else { S.ui.folder = 'synthetic'; go('data'); }
    toast('Synthetic dataset ready', `${ds.name} · ${num(rows)} rows × ${ds.ncols} cols`, { kind: 'ok', action: { label: 'Open', run: () => showModal('dataset', { id: ds.id, tab: 'preview' }) } });
  },

  /* Quick run */
  'pick-tables': (el) => { const [target, mode] = (A(el) || 'qr').split(':'); const cur = target === 'qr' ? S.qr.datasets : (S.wiz?.datasets || []); showModal('pick', { target, sel: cur.slice(), q: '', samplesOnly: mode === 'samples' }); },
  'm-pick': (el) => { const id = A(el); M.sel = M.sel.includes(id) ? M.sel.filter((x) => x !== id) : [...M.sel, id]; drawModal(true); },
  'm-pick-done': () => { if (M.target === 'qr') { S.qr.datasets = M.sel.slice(); } else if (S.wiz) S.wiz.datasets = M.sel.slice(); closeOverlay(); refresh(); },
  'qr-remove': (el) => { S.qr.datasets = S.qr.datasets.filter((x) => x !== A(el)); refresh(); },
  'qr-set': (el) => { const [k, v] = A(el).split(':'); S.qr[k] = v; if (k === 'target' && v === 'pick' && !S.qr.targetCol) { const d = dsById(S.qr.datasets[0]); S.qr.targetCol = d?.target || ''; } refresh(); },
  'qr-run': () => {
    if (!S.qr.datasets.length) return;
    const q = S.qr;
    const run = startRun({ mode: 'quick', datasets: q.datasets, base: q.base, target: q.target, targetCol: q.targetCol, task: q.task });
    if (!run) return;
    q.lastRunId = run.id; refresh();
    setTimeout(() => { const el = $('#live-' + run.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
  },
  'qr-to-workspace': () => { const q = S.qr; S.wiz = { step: q.datasets.length ? 2 : 0, datasets: q.datasets.slice(), target: q.target, targetCol: q.targetCol, task: q.task, base: q.base, holdout: 20, split: 'random', seed: 42, leakageGuard: true, name: '' }; go('workspace/new'); },
  'run-to-workspace': (el) => { const r = runById(A(el)); S.wiz = { step: 2, datasets: r.datasets.slice(), target: r.target, targetCol: r.targetCol, task: r.task, base: r.base, holdout: 20, split: 'random', seed: 42, leakageGuard: true, name: r.name.replace('Quick run · ', '') }; go('workspace/new'); },
  'export-preds': (el) => {
    const run = runById(A(el)); const res = run.result;
    const head = res.task === 'classification' ? 'entity,predicted,p_positive,confidence' : res.task === 'regression' ? `entity,predicted_${res.target},confidence` : 'entity,anomaly_score,flag,confidence';
    const body = res.predictions.map((p) => res.task === 'classification' ? [p.key, p.label, p.p.toFixed(4), p.conf.toFixed(3)] : res.task === 'regression' ? [p.key, p.value, p.conf.toFixed(3)] : [p.key, p.score.toFixed(4), p.flag, p.conf.toFixed(3)]).map((r) => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([head + '\n' + body], { type: 'text/csv' })); a.download = `${run.id}_predictions.csv`; a.click();
    toast('Predictions exported', `${run.id}_predictions.csv · preview rows`, { kind: 'ok' });
  },

  /* Wizard */
  'wiz-ds': (el) => { const id = A(el), w = S.wiz; w.datasets = w.datasets.includes(id) ? w.datasets.filter((x) => x !== id) : [...w.datasets, id]; refresh(); },
  'wiz-set': (el) => { const [k, v] = A(el).split(':'); S.wiz[k] = v; if (k === 'target' && v === 'pick' && !S.wiz.targetCol) S.wiz.targetCol = dsById(S.wiz.datasets[0])?.target || ''; refresh(); },
  'wiz-toggle': (el) => { S.wiz[A(el)] = !S.wiz[A(el)]; refresh(); },
  'wiz-go': (el) => { const s = +A(el); if (s > 0 && !S.wiz.datasets.length) return; S.wiz.step = s; refresh(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  'wiz-cancel': () => { S.wiz = null; go('workspace'); },
  'wiz-launch': () => {
    const w = S.wiz, d0 = dsById(w.datasets[0]);
    const run = startRun({ mode: 'workspace', datasets: w.datasets, base: w.base, target: w.target, targetCol: w.targetCol, task: w.task, holdout: +w.holdout, split: w.split, seed: +w.seed || 42, leakageGuard: w.leakageGuard, name: w.name.trim() || `${d0.name.replace(/\.\w+$/, '')} · ${w.target === 'pick' ? w.targetCol : 'auto'}` });
    if (!run) return;
    S.wiz = null; go('run/' + run.id);
  },
  rerun: (el) => { const r = runById(A(el)); const run = startRun({ ...r, name: r.name.replace(/ \(re-run.*\)$/, '') + ' (re-run)', seed: r.seed + 1 }); if (run) go('run/' + run.id); },
  'cancel-run': (el) => { const r = runById(A(el)); r.status = 'failed'; r.finished = now(); r.logs.push({ lv: 'warn', msg: 'Cancelled by user · worker released', ts: now() }); logActivity(`Run <b>${esc(r.name)}</b> cancelled`); refresh(); },

  /* Endpoints */
  'create-endpoint': (el) => {
    const ready = S.runs.filter((r) => r.mode === 'workspace' && r.status === 'completed' && !S.endpoints.some((e) => e.runId === r.id));
    if (!ready.length) { toast('No finished runs to serve', 'Complete a workspace run first.', { kind: 'err', action: { label: 'New run', run: () => go('workspace/new') } }); return; }
    const run = runById(A(el)) || ready[0];
    showModal('create-ep', { runId: run.id, name: run.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32), autoscale: true });
  },
  'm-toggle': (el) => { M[A(el)] = !M[A(el)]; drawModal(true); },
  'm-ep-create': () => {
    const run = runById(M.runId);
    const e = makeEndpoint(run, M.name.trim()); e.autoscale = M.autoscale; e.traffic = e.traffic.map(() => 0); e.requests = 0;
    S.endpoints.unshift(e);
    endpointOp(e, 'create');
    closeOverlay(); go('endpoints');
    toast('Deploying endpoint', `${e.name} · ${e.id}`, {});
  },
  'open-endpoint': (el) => { const e = epById(A(el)); if (!e) return; showModal('endpoint', { id: e.id, tab: 'overview', input: playInput(e), output: null, busy: false }); },
  'm-lang': (el) => { M.lang = A(el); drawModal(true); },
  'm-play-send': async () => {
    const e = epById(M.id); let rows;
    try { rows = JSON.parse(M.input).rows; if (!Array.isArray(rows)) throw new Error(); } catch (err) { M.output = { error: { type: 'invalid_request', message: 'Body must be JSON with a "rows" array' } }; drawModal(true); return; }
    M.busy = true; drawModal(true); const t0 = performance.now(); await sleep(e.p50 * 6 + Math.random() * 200); if (!M || M.type !== 'endpoint') return;
    const run = runById(e.runId), r = rng(M.input);
    M.output = { endpoint: e.id, version: `v${e.version}`, base: e.base, latency_ms: Math.round(e.p50 + r() * 12), predictions: rows.map((_, i) => e.task === 'classification' ? (() => { const pr = +r().toFixed(4); return { row: i, label: pr > .5 ? 'high' : pr > .25 ? 'medium' : 'low', probability: pr, confidence: +between(r, .78, .97).toFixed(3), top_signals: run.result.signals.slice(0, 3).map((s) => s.name) }; })() : e.task === 'regression' ? { row: i, value: +between(r, 20, 95).toFixed(2), interval_90: [+between(r, 10, 20).toFixed(1), +between(r, 95, 110).toFixed(1)], top_signals: run.result.signals.slice(0, 3).map((s) => s.name) } : { row: i, anomaly_score: +r().toFixed(4), flag: r() > .85 }) };
    M.busy = false; e.requests += rows.length; drawModal(true);
    void t0;
  },
  'm-ep-autoscale': () => { const e = epById(M.id); e.autoscale = !e.autoscale; drawModal(true); save(); toast(`Autoscale ${e.autoscale ? 'on' : 'off'}`, e.name); },
  'm-ep-pause': () => { const e = epById(M.id); e.status = e.status === 'paused' ? 'serving' : 'paused'; logActivity(`Endpoint <b>${esc(e.name)}</b> ${e.status === 'paused' ? 'paused' : 'resumed'}`); drawModal(true); if (R.name === 'endpoints') refresh(); toast(e.status === 'paused' ? 'Endpoint paused' : 'Endpoint resumed', e.name); },
  'm-ep-refresh': () => { const e = epById(M.id); endpointOp(e, 'refresh'); drawModal(true); if (R.name === 'endpoints') refresh(); toast('Refreshing endpoint', 'Re-fitting on latest rows · current version keeps serving'); },
  'm-ep-upgrade': () => { const e = epById(M.id); endpointOp(e, 'upgrade'); drawModal(true); if (R.name === 'endpoints') refresh(); toast('Upgrading base', `${e.base} → clyra-2.1-preview`); },
  'm-ep-delete': () => { const e = epById(M.id); confirmDialog(`Delete ${e.name}?`, 'The URL stops responding immediately. Reports are kept in the ledger.', 'Delete endpoint', () => { S.endpoints = S.endpoints.filter((x) => x.id !== e.id); logActivity(`Deleted endpoint <b>${esc(e.name)}</b>`); refresh(); toast('Endpoint deleted', e.name); }); },
  'm-ep-chat': () => { S.ui.chatEndpoint = M.id; closeOverlay(); go('chat'); },

  /* API keys */
  'create-key': () => showModal('key', { name: '', scope: 'inference', exp: 'never', created: null }),
  'm-key-scope': (el) => { M.scope = A(el); drawModal(true); },
  'm-key-create': () => { const full = `cly_live_${hex(32)}`; S.keys.unshift({ id: uid('key'), name: M.name.trim(), scope: M.scope, exp: M.exp, prefix: full.slice(0, 13), created: now(), lastUsed: null }); M.created = full; logActivity(`API key <b>${esc(M.name.trim())}</b> created`); drawModal(true); if (R.name === 'api' || R.name === 'overview') refresh(); },
  'revoke-key': (el) => { const k = S.keys.find((x) => x.id === A(el)); confirmDialog(`Revoke ${k.name}?`, 'Requests using this key will fail immediately.', 'Revoke key', () => { S.keys = S.keys.filter((x) => x !== k); logActivity(`API key <b>${esc(k.name)}</b> revoked`); refresh(); toast('Key revoked', k.name); }); },
  'code-lang': (el) => { S.ui.codeLang = A(el); refresh(); },
  'copy-code': (el) => copyText(el.closest('.code').innerText.replace(/^copy\s*/, ''), 'Code copied'),
  copy: (el) => copyText(A(el)),

  /* Reports */
  'open-report': (el) => { if (A(el)) showModal('report', { id: A(el) }); },
  'rep-pin': (el) => { const r = repById(A(el)); r.pinned = !r.pinned; if (M && M.type === 'report') drawModal(true); if (R.name === 'reports') refresh(); else save(); toast(r.pinned ? 'Report pinned' : 'Report unpinned', `${r.endpointName} v${r.version}`); },
  'rep-select': (el) => { const id = A(el); let s = S.ui.reportSel; s = s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-2); S.ui.reportSel = s; refresh(); },
  'rep-pinned': () => { S.ui.reportFilter.pinned = !S.ui.reportFilter.pinned; refresh(); },
  'compare-reports': () => { const [a, b] = S.ui.reportSel.map(repById).sort((x, y) => x.created - y.created); showModal('compare', { a: a.id, b: b.id }); },
  'm-rep-compare': (el) => showModal('compare', { a: A(el), b: M.id }),
  'm-rep-download': () => { const r = repById(M.id); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' })); a.download = `${r.id}.json`; a.click(); toast('Report downloaded', `${r.id}.json`, { kind: 'ok' }); },

  /* Chat */
  'connect-llm': () => openLlm(),
  'm-llm-provider': (el) => { M.provider = A(el); drawModal(true); },
  'm-llm-consent': () => { M.consent = !M.consent; redrawKeepFocus(); },
  'm-llm-connect': async () => {
    M.busy = true; drawModal(true); await sleep(900); if (!M || M.type !== 'llm') return;
    const key = M.key.trim();
    S.llm = S.llm.filter((l) => l.provider !== M.provider);
    S.llm.push({ provider: M.provider, masked: key.slice(0, 6) + '…' + key.slice(-4), ts: now() });
    S.ui.chatProvider = M.provider;
    const p = PROVIDERS.find((x) => x.id === M.provider);
    logActivity(`LLM provider <b>${p.label}</b> connected`);
    closeOverlay(); if (R.name !== 'chat') go('chat'); else refresh();
    toast(`${p.label} connected`, 'Key stored encrypted · consent recorded', { kind: 'ok' });
  },
  'disconnect-llm': (el) => { S.llm = S.llm.filter((l) => l.provider !== A(el)); refresh(); toast('Provider disconnected', ''); },
  'new-chat': () => { go('chat'); },
  'chat-suggest': (el) => sendChat(A(el)),
  'chat-send': () => { const ta = $('#chat-input'); if (ta) { const v = ta.value; ta.value = ''; sendChat(v); } },
  'copy-msg': (el) => copyText(el.closest('.ai-body').innerText.replace(/copy$/, '').trim(), 'Answer copied'),
};

/* ---------- Synthetic helpers ---------- */
function genSpec() {
  if (M.mode === 'seed') return dsById(M.seedDs)?.spec || SPECS.invitations;
  if (M.colMode === 'define' && M.colDefs.trim()) {
    return M.colDefs.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const [n, rest = 'float'] = l.split(':').map((s) => s.trim());
      const [t, range] = rest.split(/\s+/);
      const name = cleanName(n);
      if (/^id/.test(t)) return `${name}:id(${name.slice(0, 3).toUpperCase()})`;
      if (/^bool/.test(t)) return `${name}:bool(0.2)`;
      if (/^date/.test(t)) return `${name}:date`;
      if (/^int/.test(t)) return `${name}:int(${range || '0-100'})`;
      if (/^cat/.test(t)) return `${name}:cat(${(range || 'A,B,C').split(',').map(cleanVal).join('|')})`;
      return `${name}:float(${range || '0-1'})`;
    }).join(';');
  }
  const base = parseSpec(SPECS[SECTOR_SPEC[M.sector] || 'invitations']);
  const n = clamp(parseInt(M.ncols, 10) || 10, 1, 500);
  const cols = base.slice(0, Math.min(n, base.length)).map((c) => `${c.name}:${c.kind}${c.arg ? `(${c.arg})` : ''}`);
  for (let i = base.length; i < n; i++) cols.push(`feature_${i - base.length + 1}:float(0-1)`);
  return cols.join(';');
}
function genPreview() {
  const spec = parseSpec(genSpec()).slice(0, 12);
  const r = rng(hex(4));
  return { cols: spec.map((c) => c.name), rows: Array.from({ length: 5 }, (_, i) => spec.map((c) => genValue(c, r, i))) };
}

/* ---------- Input handlers ---------- */
const INPUTS = {
  'data-search': (el) => { S.ui.q = el.value; $('#ds-table').innerHTML = datasetTable(); save(); },
  'chat-search': (el) => { S.ui.chatQ = el.value; const pos = el.selectionStart; refresh(); const i = $('[data-input="chat-search"]'); i.focus(); i.setSelectionRange(pos, pos); },
  'wiz-name': (el) => { S.wiz.name = el.value; save(); },
  'wiz-holdout': (el) => { S.wiz.holdout = +el.value; refresh(); const r = $('[data-input="wiz-holdout"]'); if (r) r.focus(); },
  'wiz-seed': (el) => { S.wiz.seed = el.value.replace(/\D/g, ''); save(); },
  'palette-q': (el) => { M.q = el.value; M.idx = 0; drawPaletteList(); },
  'm-name': (el) => { M.name = el.value; },
  'm-db': () => {},
  'm-cloud-path': (el) => { M.cloudPath = el.value; },
  'm-pick-q': (el) => { M.q = el.value; redrawKeepFocus(); },
  'm-folder-name': (el) => { M.name = el.value; redrawKeepFocus(); },
  'm-key-name': (el) => { M.name = el.value; redrawKeepFocus(); },
  'm-llm-key': (el) => { M.key = el.value; redrawKeepFocus(); },
  'm-ep-name': (el) => { M.name = el.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'); redrawKeepFocus(); },
  'm-play-in': (el) => { M.input = el.value; },
};
function handleInput(el) {
  const key = el.dataset.input;
  if (key.startsWith('m-db:')) { M.db[key.slice(5)] = el.value; return; }
  if (key.startsWith('m-api:')) { M.api[key.slice(6)] = el.value; return; }
  if (key.startsWith('m-gen:')) { const f = key.slice(6); M[f] = el.value; if (f === 'noise') redrawKeepFocus(); return; }
  INPUTS[key] && INPUTS[key](el);
}
const CHANGES = {
  'type-filter': (el) => { S.ui.typeFilter = el.value; refresh(); },
  'qr-base': (el) => { S.qr.base = el.value; save(); },
  'qr-targetcol': (el) => { S.qr.targetCol = el.value; save(); },
  'wiz-targetcol': (el) => { S.wiz.targetCol = el.value; refresh(); },
  'wiz-base': (el) => { S.wiz.base = el.value; save(); },
  'rep-ep': (el) => { S.ui.reportFilter.ep = el.value; refresh(); },
  'rep-op': (el) => { S.ui.reportFilter.op = el.value; refresh(); },
  'chat-ep': (el) => { S.ui.chatEndpoint = el.value; refresh(); },
  'chat-llm': (el) => { S.ui.chatProvider = el.value; const c = R.param && S.conversations.find((x) => x.id === R.param); if (c) c.provider = el.value; save(); },
  'm-gen-sector': (el) => { M.sector = el.value; M.preview = null; drawModal(true); },
  'm-gen-seed': (el) => { M.seedDs = el.value; drawModal(true); },
  'm-key-exp': (el) => { M.exp = el.value; },
  'm-api-refresh': (el) => { M.api.refresh = el.value; },
  'm-ep-run': (el) => { M.runId = el.value; const r = runById(el.value); M.name = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32); drawModal(true); },
};

/* ---------- Simulation engine ---------- */
let tickN = 0;
function tick() {
  tickN++;
  let sidebarDirty = false, pageDirty = false;
  for (const run of S.runs) {
    if (run.status !== 'running') continue;
    const speed = run.speed || (run.mode === 'quick' ? 7 : 2.2);
    run.progress = Math.min(100, run.progress + speed * (0.6 + Math.random() * 0.8));
    const stages = STAGES[run.mode];
    const plan = planLogs(run);
    const want = Math.min(plan.length, Math.floor(run.progress / 100 * plan.length) + 1);
    while (run.logs.length < want) run.logs.push({ ...plan[run.logs.length], ts: now() });
    run.stage = Math.min(stages.length - 1, plan[run.logs.length - 1]?.stage ?? 0);
    if (run.progress >= 100) { completeRun(run); sidebarDirty = true; if ((R.name === 'run' && R.param === run.id) || (R.name === 'quick-run' && S.qr.lastRunId === run.id) || ['overview', 'workspace'].includes(R.name)) pageDirty = true; continue; }
    // live DOM updates
    const live = $('#live-' + run.id);
    if (live) { live.outerHTML = runLive(run); const c = $('#console-' + run.id); if (c) c.scrollTop = c.scrollHeight; }
    $$(`[data-run-pct="${run.id}"]`).forEach((x) => (x.textContent = Math.floor(run.progress) + '%'));
    $$(`[data-run-bar="${run.id}"]`).forEach((x) => (x.style.width = run.progress + '%'));
  }
  for (const c of S.connections) if (c.status === 'syncing' && now() > c.syncUntil) { c.status = 'connected'; c.synced = true; c.lastSync = now(); delete c.syncUntil; if (R.name === 'data') pageDirty = true; toast('Sync complete', `${c.name} · ${c.tables} table${c.tables === 1 ? '' : 's'}`, { kind: 'ok', ms: 2600 }); }
  for (const e of S.endpoints) {
    if (e.busyUntil && now() > e.busyUntil) { finishEndpointOp(e); sidebarDirty = true; if (['endpoints', 'reports', 'overview'].includes(R.name)) pageDirty = true; if (M && M.type === 'endpoint' && M.id === e.id) drawModal(true); }
  }
  if (tickN % 6 === 0) {
    let total = 0;
    for (const e of S.endpoints) {
      if (e.status === 'serving') { const inc = Math.floor(Math.random() * 5); e.requests += inc; e.traffic[e.traffic.length - 1] += inc; $$(`[data-ep-req="${e.id}"]`).forEach((x) => (x.textContent = num(e.requests))); }
      total += e.requests;
    }
    $$('[data-total-req]').forEach((x) => (x.textContent = num(total)));
    $$('[data-total-24h]').forEach((x) => (x.textContent = compact(S.endpoints.reduce((a, e) => a + e.traffic.reduce((p, q) => p + q, 0), 0))));
    save();
  }
  if (pageDirty) refresh();
  else if (sidebarDirty) { renderSidebar(); renderTopbar(); save(); }
}

/* ---------- Events ---------- */
document.addEventListener('click', (e) => {
  const ov = e.target.closest('[data-overlay]');
  if (ov && e.target === ov) { closeOverlay(); return; }
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('mousemove', (e) => { const hit = e.target.closest && e.target.closest('[data-cc-i]'); if (hit) chartHover(hit); else if (document.querySelector('.cc.hovering')) chartLeave(); });
document.addEventListener('input', (e) => { if (e.target.dataset && e.target.dataset.input) handleInput(e.target); });
document.addEventListener('change', (e) => { const k = e.target.dataset && e.target.dataset.change; if (k && CHANGES[k]) CHANGES[k](e.target); });
$('#file-input').addEventListener('change', (e) => { const files = [...e.target.files]; e.target.value = ''; if (M && M.type === 'connect') addFiles(files); });
document.addEventListener('dragover', (e) => { const dz = e.target.closest && e.target.closest('#dropzone'); if (dz) { e.preventDefault(); dz.classList.add('drag'); } });
document.addEventListener('dragleave', (e) => { const dz = e.target.closest && e.target.closest('#dropzone'); if (dz) dz.classList.remove('drag'); });
document.addEventListener('drop', (e) => { const dz = e.target.closest && e.target.closest('#dropzone'); if (dz) { e.preventDefault(); dz.classList.remove('drag'); addFiles([...e.dataTransfer.files]); } });

let gPending = 0;
document.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); M && M.type === 'palette' ? closeOverlay() : openPalette(); return; }
  if (mod && e.key.toLowerCase() === 'j') { e.preventDefault(); closeOverlay(); go('chat'); return; }
  if (e.key === 'Escape') { if (M) closeOverlay(); $('#shell').classList.remove('nav-open'); return; }
  if (M && M.type === 'palette') {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); M.idx = clamp(M.idx + (e.key === 'ArrowDown' ? 1 : -1), 0, M.items.length - 1); drawPaletteList(); $('.palette-item.on')?.scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter') { e.preventDefault(); const it = M.items[M.idx]; closeOverlay(); it && it.run(); }
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); ACTIONS['toggle-sb'](); return; }
  if (e.target.id === 'home-ask' && e.key === 'Enter') { e.preventDefault(); ACTIONS['home-ask'](); return; }
  if (e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ACTIONS['chat-send'](); return; }
  if (mod && e.key === 'Enter' && R.name === 'quick-run' && !M) { e.preventDefault(); ACTIONS['qr-run'](); return; }
  if (typing || mod || M) return;
  if (e.key === 'g') { gPending = now(); return; }
  if (gPending && now() - gPending < 1200) {
    const map = { o: 'overview', d: 'data', q: 'quick-run', w: 'workspace', e: 'endpoints', a: 'api', r: 'reports', c: 'chat' };
    if (map[e.key]) { gPending = 0; go(map[e.key]); }
  }
});
window.addEventListener('hashchange', () => { closeOverlay(); render(); window.scrollTo(0, 0); });

/* ---------- Init ---------- */
S = load();
// runs interrupted by a reload continue from where they were
render();
setInterval(tick, 350);
window.clyra = { get state() { return S; }, reset: () => { S = demoState(); render(); } };
})();
