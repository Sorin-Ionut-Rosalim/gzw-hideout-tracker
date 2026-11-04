// Plain JavaScript on purpose: no build step, no dependencies, no server.
// Progress is one JSON object in localStorage. render() redraws the page from it.

const STORAGE_KEY = "gzw-hideout-tracker";
const REPO = "https://github.com/Sorin-Ionut-Rosalim/gzw-hideout-tracker";
const MARK = { r: "●", t: "◐", g: "?" };
const WEIGHT = { r: 3, t: 1, g: 0.5 };
const TABS = [["materials", "Materials"], ["locations", "Locations"], ["stations", "Stations"], ["about", "About"]];

const STATIONS = {};
ROOMS.forEach(room => room.stations.forEach(st => { STATIONS[st.id] = st; st.room = room.name; }));
const level = key => {
  const [id, n] = key.split(":");
  return { st: STATIONS[id], id, n: +n, key, ...STATIONS[id].levels[n - 1] };
};
const ALL_MATERIALS = [...new Set(ORDER.flatMap(key => Object.keys(level(key).c)))];

// ---------- State ----------
const empty = () => ({ have: {}, built: {}, used: {}, focus: null });
const prefs = { tab: "materials", scope: "five", search: "", confirmReset: false, message: "" };

// Keeps only what the app knows, so a damaged or edited backup cannot break the page.
function clean(raw) {
  const s = empty();
  if (!raw || typeof raw !== "object") return s;
  const count = v => Math.min(9999, Math.max(0, Math.floor(+v) || 0));
  ALL_MATERIALS.forEach(m => { const n = count(raw.have && raw.have[m]); if (n) s.have[m] = n; });
  Object.keys(STATIONS).forEach(id => {
    const n = Math.min(STATIONS[id].levels.length, count(raw.built && raw.built[id]));
    if (!n) return;
    s.built[id] = n;
    for (let i = 1; i <= n; i++) {
      const used = raw.used && raw.used[`${id}:${i}`];
      s.used[`${id}:${i}`] = {};
      if (used && typeof used === "object") ALL_MATERIALS.forEach(m => { const u = count(used[m]); if (u) s.used[`${id}:${i}`][m] = u; });
    }
  });
  if (ORDER.includes(raw.focus)) s.focus = raw.focus;
  return s;
}
function load() {
  try { return clean(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { return empty(); }
}
let state = load();
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { prefs.message = "Your browser blocked saving. Use Export to keep your progress."; }
  render();
}

const have = m => state.have[m] || 0;
const built = id => state.built[id] || 0;
const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = m => m.replace(/\W/g, "-");
const money = n => "$" + n.toLocaleString("en-US");

// ---------- Logic ----------
function queue() {
  let q = ORDER.filter(key => { const [id, n] = key.split(":"); return +n > built(id); });
  if (state.focus) {
    const [id, n] = state.focus.split(":");
    const first = q.filter(key => key.startsWith(id + ":") && +key.split(":")[1] <= +n);
    q = [...first, ...q.filter(key => !first.includes(key))];
  }
  return q;
}
function needs(keys) {
  const out = {};
  keys.forEach(key => Object.entries(level(key).c).forEach(([m, n]) => { out[m] = (out[m] || 0) + n; }));
  return out;
}
const scopeKeys = q => prefs.scope === "next" ? q.slice(0, 1) : prefs.scope === "five" ? q.slice(0, 5) : q;

// Ranks locations by what is missing. Parts for the next build count three times as much.
function rankLocations(keys, nextKey) {
  const need = needs(keys), nextNeed = nextKey ? level(nextKey).c : {}, by = {};
  Object.entries(need).forEach(([m, n]) => {
    if (n <= have(m)) return;
    (WHERE[m] || []).forEach(entry => {
      const [id, conf] = entry.split(":");
      const hot = (nextNeed[m] || 0) > have(m);
      by[id] = by[id] || { id, score: 0, items: [] };
      by[id].score += WEIGHT[conf] * (hot ? 3 : 1);
      by[id].items.push({ m, conf, hot });
    });
  });
  return Object.values(by).sort((a, b) => b.score - a.score);
}

function setHave(m, n) {
  n = Math.min(9999, Math.max(0, Math.floor(+n) || 0));
  if (n) state.have[m] = n; else delete state.have[m];
  save();
}
// Building takes parts from the stock and remembers how many, so Undo returns exactly that.
function build(id, n) {
  for (let i = built(id) + 1; i <= n; i++) {
    const used = {};
    Object.entries(STATIONS[id].levels[i - 1].c).forEach(([m, count]) => {
      const take = Math.min(count, have(m));
      if (take) {
        used[m] = take;
        state.have[m] = have(m) - take;
        if (!state.have[m]) delete state.have[m];
      }
    });
    state.used[`${id}:${i}`] = used;
  }
  state.built[id] = n;
  if (state.focus && state.focus.startsWith(id + ":") && +state.focus.split(":")[1] <= n) state.focus = null;
  save();
}
function unbuild(id, n) {
  for (let i = built(id); i >= n; i--) {
    Object.entries(state.used[`${id}:${i}`] || {}).forEach(([m, count]) => { state.have[m] = have(m) + count; });
    delete state.used[`${id}:${i}`];
  }
  state.built[id] = n - 1;
  if (!state.built[id]) delete state.built[id];
  save();
}
function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "gzw-hideout-progress.json";
  a.click();
  URL.revokeObjectURL(a.href);
}
async function importBackup(file) {
  try {
    state = clean(JSON.parse(await file.text()));
    prefs.message = "Progress imported.";
  } catch {
    prefs.message = "That file is not a valid backup. Nothing was changed.";
  }
  save();
}

// ---------- Pieces ----------
function stepper(m) {
  return `<span class="step"><button data-act="dec" data-m="${esc(m)}" aria-label="Remove one ${esc(m)}">−</button><input id="have-${slug(m)}" type="number" min="0" max="9999" inputmode="numeric" value="${have(m)}" data-act="have" data-m="${esc(m)}" aria-label="How many ${esc(m)} you have"><button data-act="inc" data-m="${esc(m)}" aria-label="Add one ${esc(m)}">+</button></span>`;
}
function pill(need, m) {
  const miss = need - have(m);
  return miss > 0 ? `<span class="pill miss">need ${miss}</span>` : `<span class="pill ok">have ${need}</span>`;
}
function whereList(m) {
  return `<div class="src">` + [...(WHERE[m] || [])].sort((a, b) => WEIGHT[b.split(":")[1]] - WEIGHT[a.split(":")[1]]).map(entry => {
    const [id, conf] = entry.split(":"), loc = LOCS[id];
    return `<span><span class="mark ${conf}" aria-hidden="true">${MARK[conf]}</span>${esc(loc.name)}${loc.at ? ` <span class="mono">${esc(loc.at)}</span>` : ""}</span>`;
  }).join("") + `</div>`;
}
function sourceLinks(ids) {
  return ids.map(id => SOURCES[id].url ? `<a href="${SOURCES[id].url}" target="_blank" rel="noopener">${esc(SOURCES[id].name)}</a>` : esc(SOURCES[id].name)).join(", ");
}
function stop(s, withMarks) {
  const loc = LOCS[s.id];
  return `<div class="stop"><div class="stop-head"><span>${esc(loc.name)}</span>${loc.at ? `<span class="mono small muted">${esc(loc.at)}</span>` : ""}</div>
    ${loc.tip ? `<p class="small muted">${esc(loc.tip)}</p>` : ""}
    <div class="tags">${s.items.map(i => `<span class="tag${i.hot ? " hot" : ""}">${withMarks ? `<span aria-hidden="true">${MARK[i.conf]}</span> ` : ""}${esc(i.m)}</span>`).join("")}</div>
    ${withMarks ? `<p class="small muted">Source: ${sourceLinks(loc.src)}</p>` : ""}</div>`;
}
function scopeBar() {
  const b = (v, t) => `<button data-act="scope" data-v="${v}" aria-pressed="${prefs.scope === v}">${t}</button>`;
  return `<span class="seg" role="group" aria-label="Which builds to count">${b("next", "Next build")}${b("five", "Next 5 builds")}${b("all", "Whole hideout")}</span>`;
}
const LEGEND = `<p class="small muted"><span class="mark r">●</span> named by a guide or player &nbsp; <span class="mark t">◐</span> type of place only &nbsp; <span class="mark g">?</span> educated guess, no source yet. Spawns are never guaranteed.</p>`;

// ---------- Sections ----------
function renderHeader(q) {
  const total = ORDER.length, done = total - q.length, need = needs(q);
  const missing = Object.entries(need).reduce((sum, [m, n]) => sum + Math.max(0, n - have(m)), 0);
  const cash = q.reduce((sum, key) => sum + (level(key).cash || 0), 0);
  document.getElementById("stats").innerHTML =
    `<div class="stat"><b>${done} / ${total}</b><span class="label">Levels built</span></div>
     <div class="stat"><b>${missing}</b><span class="label">Parts to find</span></div>
     <div class="stat"><b>${money(cash)}</b><span class="label">Cash needed</span></div>`;
  document.getElementById("bar").style.width = (done / total * 100) + "%";
  document.getElementById("barwrap").setAttribute("aria-valuenow", done);
  document.getElementById("backup").innerHTML =
    `<button class="btn tiny" data-act="export">Export</button>
     <label class="btn tiny">Import<input class="visually-hidden" id="import" type="file" accept="application/json,.json"></label>
     ${prefs.confirmReset
       ? `<button class="btn tiny on" data-act="reset-yes">Yes, erase</button><button class="btn tiny" data-act="reset-no">Cancel</button>`
       : `<button class="btn tiny" data-act="reset">Reset</button>`}
     ${prefs.message ? `<span class="small" role="status">${esc(prefs.message)}</span>` : ""}`;
}

function renderNow(q) {
  const el = document.getElementById("now");
  if (!q.length) {
    el.innerHTML = `<div class="panel target"><h2>Hideout complete</h2><p>All ${ORDER.length} levels are built.</p></div>`;
    return;
  }
  const lv = level(q[0]);
  const ready = Object.entries(lv.c).every(([m, n]) => have(m) >= n);
  const rows = Object.entries(lv.c).map(([m, n]) =>
    `<div class="mat${have(m) >= n ? " done" : ""}"><span class="name">${esc(m)} × ${n}</span>${stepper(m)}${pill(n, m)}<div class="extra">${have(m) >= n ? "" : whereList(m)}</div></div>`).join("");
  const stops = rankLocations(q.slice(0, 5), q[0]).slice(0, 4).map(s => stop(s, false)).join("");
  el.innerHTML = `<div class="panel target">
      <div><span class="label">Next build · ${esc(lv.st.room)}</span>
      <h2>${esc(lv.st.name)}, level ${lv.n}${lv.d ? `: ${esc(lv.d)}` : ""}</h2></div>
      <div>${rows}</div>
      ${lv.cash ? `<p class="mono small">Plus ${money(lv.cash)}</p>` : ""}
      <div class="row"><button class="btn${ready ? " main" : ""}" data-act="build" data-id="${lv.id}" data-n="${lv.n}">Mark as built</button>
      ${state.focus ? `<button class="btn" data-act="unfocus">Back to suggested order</button>` : ""}
      ${q[1] ? `<span class="small muted">Then: ${esc(level(q[1]).st.name)} ${level(q[1]).n}</span>` : ""}</div>
    </div>
    <div class="panel"><div><span class="label">For your next 5 builds</span><h2>Where to look</h2></div>
      <div>${stops || `<p class="muted">You have everything for your next 5 builds.</p>`}</div>
      <p class="small muted">Orange parts are needed for the next build. Best match to your missing parts first; distance and danger are not counted.</p></div>`;
}

function renderMaterials(q) {
  const need = needs(scopeKeys(q)), nextNeed = q[0] ? level(q[0]).c : {};
  const list = Object.entries(need).sort((a, b) => {
    const ma = a[1] - have(a[0]), mb = b[1] - have(b[0]);
    if ((ma > 0) !== (mb > 0)) return ma > 0 ? -1 : 1;
    if (!!nextNeed[a[0]] !== !!nextNeed[b[0]]) return nextNeed[a[0]] ? -1 : 1;
    return mb - ma || a[0].localeCompare(b[0]);
  });
  const rows = list.map(([m, n]) => `<div class="mat${have(m) >= n ? " done" : ""}" data-name="${esc(m.toLowerCase())}">
      <span class="name">${esc(m)} <span class="mono small muted">/ ${n}</span></span>${stepper(m)}${pill(n, m)}
      <div class="extra">${whereList(m)}</div></div>`).join("");
  return `<div class="tools">${scopeBar()}<input id="search" class="search" type="search" placeholder="Search parts" aria-label="Search parts" value="${esc(prefs.search)}"></div>
    ${LEGEND}<div class="list" id="matlist">${rows || `<p class="empty">Nothing left to collect here.</p>`}</div>
    <p class="small muted">Found a part somewhere else? <a href="${REPO}/issues/new?template=location.yml" target="_blank" rel="noopener">Report the location</a>.</p>`;
}

function renderLocations(q) {
  const rows = rankLocations(scopeKeys(q), q[0]).map(s => stop(s, true)).join("");
  return `<div class="tools">${scopeBar()}</div>${LEGEND}
    <p class="small muted">Best match to your missing parts first. Distance and danger are not counted, because they depend on your faction and gear.</p>
    <div class="list" style="padding-block:12px">${rows || `<p class="empty">Nothing left to collect here.</p>`}</div>`;
}

function renderStations(q) {
  return ROOMS.map(room => `<section class="room"><div><h2>${esc(room.name)}</h2><p class="small muted">${esc(room.unlock)}</p></div><div class="stations">` +
    room.stations.map(st => `<div class="st"><div class="st-head"><h3>${esc(st.name)}</h3><span class="mono small muted">${built(st.id)} / ${st.levels.length}</span></div>` +
      st.levels.map((lv, i) => {
        const n = i + 1, isBuilt = n <= built(st.id), key = `${st.id}:${n}`, isNext = q[0] === key;
        const cost = [...Object.entries(lv.c).map(([m, c]) => `${c} ${m}`), ...(lv.cash ? [money(lv.cash)] : [])].join(", ");
        return `<div class="lv${isBuilt ? " built" : ""}"><div class="lv-top"><b>Level ${n}${lv.d ? ` <span class="small muted">${esc(lv.d)}</span>` : ""}</b>
          <span class="row">${isBuilt
            ? `<button class="btn tiny on" data-act="unbuild" data-id="${st.id}" data-n="${n}">✓ Undo</button>`
            : `${isNext ? `<span class="label">Next</span>` : `<button class="btn tiny" data-act="focus" data-k="${key}">Make next</button>`}<button class="btn tiny" data-act="build" data-id="${st.id}" data-n="${n}">Built</button>`}</span></div>
          <div class="cost small">${esc(cost)}</div>
          <div><span class="chip${VERIFIED.includes(key) ? " ok" : ""}">${VERIFIED.includes(key) ? "verified in-game" : "community source"}</span></div></div>`;
      }).join("") + `</div>`).join("") + `</div></section>`).join("");
}

function renderAbout() {
  const list = Object.keys(SOURCES).filter(id => SOURCES[id].url).map(id => `<a href="${SOURCES[id].url}" target="_blank" rel="noopener">${esc(SOURCES[id].name)}</a>`).join(", ");
  return `<div class="prose">
    <h2>How far to trust this</h2>
    <p class="small muted">Data: ${esc(DATA_VERSION)}.</p>
    <ul>
      <li>If the game shows a different cost, the game is right. Please <a href="${REPO}/issues/new?template=cost.yml" target="_blank" rel="noopener">report it</a>.</li>
      <li>Most costs come from GZW Items. Only levels marked “verified in-game” were checked here.</li>
      <li>Parts have no fixed spawns. Locations are good odds at best, and guides can go out of date after a patch.</li>
      <li>Locations marked <span class="mark g">?</span> have no source. They are just where we would look first.</li>
      <li>The first 12 steps of the build order follow a guide. The rest is our suggestion, from cheap to expensive.</li>
      <li>Coordinates match the in-game map grid. One unit is about 100 m, according to community map data.</li>
      <li>Some guides disagree on unlock requirements, so check the hideout screen in-game.</li>
    </ul>
    <h2>Spoiler note</h2>
    <p>This page lists locations and costs that you could otherwise discover yourself. Using it may change how the game feels.</p>
    <h2>Looking for a map?</h2>
    <p>This site has no map on purpose, because we have no permission to host one. <a href="https://gzwtacmap.com/maps/lamang" target="_blank" rel="noopener">GZW Tac Map</a> is a great interactive one: paste the coordinates there.</p>
    <h2>Your data</h2>
    <p>Your progress is stored only in this browser, with no account, cookies or analytics. Use Export to back it up or move it to another device.</p>
    <h2>Sources</h2>
    <p>${list}. Thanks to everyone who maintains them.</p>
    <p class="small muted">Fan project, not affiliated with or endorsed by MADFINGER Games. Gray Zone Warfare and its content belong to their owners.</p>
  </div>`;
}

function applySearch() {
  document.querySelectorAll("#matlist .mat").forEach(row => {
    row.hidden = !!prefs.search && !row.dataset.name.includes(prefs.search.toLowerCase());
  });
}

function render() {
  const activeId = document.activeElement && document.activeElement.id;
  const q = queue();
  renderHeader(q);
  renderNow(q);
  document.getElementById("tabs").innerHTML = TABS.map(([v, t]) => `<button role="tab" data-act="tab" data-v="${v}" aria-selected="${prefs.tab === v}">${t}</button>`).join("");
  document.getElementById("view").innerHTML =
    prefs.tab === "materials" ? renderMaterials(q)
    : prefs.tab === "locations" ? renderLocations(q)
    : prefs.tab === "stations" ? renderStations(q)
    : renderAbout();
  applySearch();
  if (activeId && document.getElementById(activeId)) document.getElementById(activeId).focus();
}

// ---------- Events ----------
document.addEventListener("click", e => {
  const b = e.target.closest("button[data-act]");
  if (!b) return;
  const { act, m, id, n, v, k } = b.dataset;
  prefs.message = "";
  if (act !== "reset") prefs.confirmReset = false;
  if (act === "inc") setHave(m, have(m) + 1);
  else if (act === "dec") setHave(m, have(m) - 1);
  else if (act === "build") build(id, +n);
  else if (act === "unbuild") unbuild(id, +n);
  else if (act === "focus") { state.focus = k; save(); }
  else if (act === "unfocus") { state.focus = null; save(); }
  else if (act === "export") { exportBackup(); render(); }
  else if (act === "reset") { prefs.confirmReset = true; render(); }
  else if (act === "reset-no") render();
  else if (act === "reset-yes") { state = empty(); prefs.message = "Progress erased."; save(); }
  else if (act === "tab") { prefs.tab = v; history.replaceState(null, "", "#" + v); render(); }
  else if (act === "scope") { prefs.scope = v; render(); }
});
document.addEventListener("change", e => {
  if (e.target.dataset.act === "have") setHave(e.target.dataset.m, e.target.value);
  else if (e.target.id === "import" && e.target.files[0]) importBackup(e.target.files[0]);
});
document.addEventListener("input", e => {
  if (e.target.id === "search") { prefs.search = e.target.value; applySearch(); }
});

const fromHash = location.hash.slice(1);
if (TABS.some(([v]) => v === fromHash)) prefs.tab = fromHash;
render();
