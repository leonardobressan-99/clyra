
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
