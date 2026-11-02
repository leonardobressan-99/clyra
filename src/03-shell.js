
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
