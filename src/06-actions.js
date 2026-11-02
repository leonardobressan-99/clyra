
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
  // Cost grows with the order of magnitude of the data, so million-row tables stay within a weekly budget
  const scale = Math.log10(rows + 10);
  if (run.mode === 'quick') return 0.2 + scale * 0.35;
  return (2 + scale * 3.2) * (run.base === 'clyra-2.1-preview' ? 1.6 : run.base === 'clyra-2-mini' ? .5 : 1);
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
