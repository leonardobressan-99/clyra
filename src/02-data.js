
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
