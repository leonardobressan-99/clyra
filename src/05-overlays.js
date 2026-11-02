
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
