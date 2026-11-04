// Plain JavaScript on purpose: no build step, no dependencies, no server.
// Progress is one JSON object in localStorage. render() redraws the page from it.

const STORAGE_KEY = "gzw-hideout-tracker";
const REPO = "https://github.com/Sorin-Ionut-Rosalim/gzw-hideout-tracker";
const MARK = { r: "●", t: "◐", g: "?" };
const WEIGHT = { r: 3, t: 1, g: 0.5 };
const TABS = [["materials", "Materials"], ["locations", "Locations"], ["map", "Map"], ["stations", "Stations"], ["about", "About"]];
const THEMES = ["auto", "light", "dark"];

const STATIONS = {};
ROOMS.forEach(room => room.stations.forEach(st => { STATIONS[st.id] = st; st.room = room; }));
const level = key => {
  const [id, n] = key.split(":");
  return { st: STATIONS[id], id, n: +n, key, ...STATIONS[id].levels[n - 1] };
};
const levelName = key => `${level(key).st.name} ${level(key).n}`;
const ALL_MATERIALS = [...new Set(ORDER.flatMap(key => Object.keys(level(key).c)))].sort();

// ---------- State ----------
const empty = () => ({
  have: {}, built: {}, used: {}, focus: null, faction: null,
  ranks: { labRat: true, artisan: true },
  tab: "materials", scope: "five", theme: "auto", hideDone: false, guideDone: false,
});
const prefs = { search: "", placeSearch: "", confirmDelete: false, message: "", undo: null, saveFailed: false, askedPersist: false, toastTimer: null };

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
  if (FACTIONS[raw.faction]) s.faction = raw.faction;
  if (raw.ranks && typeof raw.ranks === "object") Object.keys(RANKS).forEach(r => { if (raw.ranks[r] === false) s.ranks[r] = false; });
  if (TABS.some(([v]) => v === raw.tab)) s.tab = raw.tab;
  if (["next", "five", "all"].includes(raw.scope)) s.scope = raw.scope;
  if (THEMES.includes(raw.theme)) s.theme = raw.theme;
  s.hideDone = raw.hideDone === true;
  s.guideDone = raw.guideDone === true;
  return s;
}
function load() {
  try { return clean(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { return empty(); }
}
let state = load();
// Every change is saved right away, so the page reopens as it was left.
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    prefs.saveFailed = false;
    // Asks once per visit that the browser not clear this data when disk space runs low. It may say no.
    if (!prefs.askedPersist && navigator.storage && navigator.storage.persist) {
      prefs.askedPersist = true;
      navigator.storage.persist().catch(() => {});
    }
  } catch {
    prefs.saveFailed = true;
  }
  render();
}

const have = m => state.have[m] || 0;
const built = id => state.built[id] || 0;
const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = m => m.replace(/\W/g, "-");
const money = n => "$" + n.toLocaleString("en-US");

function notify(message, undo) {
  prefs.message = message;
  prefs.undo = undo || null;
  clearTimeout(prefs.toastTimer);
  prefs.toastTimer = setTimeout(() => { prefs.message = ""; prefs.undo = null; renderToast(); }, 8000);
  renderToast();
}

// ---------- Logic ----------
const isLocked = key => (level(key).st.room.needs || []).some(r => !state.ranks[r]);
const unmetRequirements = key => (REQUIRES[key] || []).filter(req => { const [id, n] = req.split(":"); return built(id) < +n; });
const missingCount = key => Object.entries(level(key).c).reduce((sum, [m, n]) => sum + Math.max(0, n - have(m)), 0);

// The suggested order, with rooms you have not unlocked moved to the end.
function queue() {
  const open = [], locked = [];
  ORDER.forEach(key => {
    const [id, n] = key.split(":");
    if (+n > built(id)) (isLocked(key) ? locked : open).push(key);
  });
  let q = [...open, ...locked];
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
const scopeKeys = q => state.scope === "next" ? q.slice(0, 1) : state.scope === "five" ? q.slice(0, 5) : q;

// The next level of each station that nothing else is blocking.
function buildable() {
  return Object.values(STATIONS)
    .filter(st => built(st.id) < st.levels.length)
    .map(st => `${st.id}:${built(st.id) + 1}`)
    .filter(key => !isLocked(key) && !unmetRequirements(key).length);
}

// Straight-line distance from the player's base to the nearest known point of a location.
// One coordinate unit is 100 m, so 10 units are 1 km. Null when there is no faction or no position.
function locationPoints(loc) {
  return loc.at ? loc.at.split("·").map(p => p.trim().split(" ").map(Number)) : loc.pos ? [loc.pos] : [];
}
function distanceKm(id) {
  const faction = FACTIONS[state.faction], points = locationPoints(LOCS[id]);
  if (!faction || !points.length) return null;
  return Math.min(...points.map(([x, y]) => Math.hypot(x - faction.base[0], y - faction.base[1]))) / 10;
}
// How much a location's score counts: nearby places keep it all, 5 km away keeps half, 14 km away a fifth.
function nearness(id) {
  if (!state.faction || LOCS[id].everywhere) return 1;
  const km = distanceKm(id);
  if (km === null) return 0.5;
  return km <= 2 ? 1 : 1 / (1 + (km - 2) / 3);
}
const distanceLabel = id => {
  const km = distanceKm(id);
  return km === null ? "" : `~${km.toFixed(1)} km`;
};

// Ranks locations by what is missing and how close they are.
// Parts for the next build count three times as much.
function rankLocations(keys, nextKey) {
  const need = needs(keys), nextNeed = nextKey ? level(nextKey).c : {}, by = {};
  Object.entries(need).forEach(([m, n]) => {
    if (n <= have(m)) return;
    (WHERE[m] || []).forEach(entry => {
      const [id, conf] = entry.split(":");
      const hot = (nextNeed[m] || 0) > have(m);
      by[id] = by[id] || { id, score: 0, items: [] };
      by[id].score += WEIGHT[conf] * (hot ? 3 : 1) * nearness(id);
      by[id].items.push({ m, conf, hot });
    });
  });
  return Object.values(by).sort((a, b) => b.score - a.score);
}

// ---------- Actions ----------
function setHave(m, n) {
  n = Math.min(9999, Math.max(0, Math.floor(+n) || 0));
  if (n) state.have[m] = n; else delete state.have[m];
  save();
}
// ---------- Search ----------
// How well a text matches a query: exact, then start of the name, start of a word, anywhere, and
// finally the letters in order, which forgives typos like "eletrical". 0 means no match.
function textScore(query, text) {
  const q = query.toLowerCase(), t = text.toLowerCase();
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.split(/[\s,()]+/).some(word => word.startsWith(q))) return 75;
  if (t.includes(q)) return 55;
  if (q.length >= 3) {
    let i = 0;
    for (const c of t) if (c === q[i]) i++;
    if (i === q.length) return 25;
  }
  return 0;
}
// Every word of the query must match, so "motor oil" and "oil motor" both work.
function queryScore(query, names) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const whole = Math.max(...names.map(n => textScore(query.trim(), n)));
  if (whole) return whole;
  const each = words.map(w => Math.max(...names.map(n => textScore(w, n))));
  return each.every(Boolean) ? Math.min(...each) - 5 : 0;
}
const materialScore = (query, m) => queryScore(query, [m, SHORT_NAMES[m] || ""]);
function searchMaterials(query) {
  const found = ALL_MATERIALS.map(m => [m, materialScore(query, m)]).filter(([, s]) => s).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  // Letters in order are only a fallback for typos, so they do not crowd out real matches.
  const strong = found.filter(([, s]) => s > 30);
  return (strong.length ? strong : found).map(([m]) => m);
}
// Reads an amount typed with the part: "3 eparts", "eparts 3", "eparts x3".
function parseLoot(text) {
  const match = text.trim().match(/^(\d+)\s*x?\s+(.+)$/i) || text.trim().match(/^(.+?)\s+x?(\d+)$/i);
  if (!match) return { query: text.trim(), qty: null };
  return /^\d/.test(match[1]) ? { query: match[2], qty: +match[1] } : { query: match[1], qty: +match[2] };
}
function logLoot(m, qty) {
  const before = have(m);
  setHave(m, before + qty);
  notify(`Added ${qty} ${m}. You have ${have(m)}.`, () => setHave(m, before));
}
function materialOption(m, need) {
  const left = Math.max(0, (need[m] || 0) - have(m));
  return { value: m, label: m, short: SHORT_NAMES[m] && SHORT_NAMES[m] !== m ? SHORT_NAMES[m] : "", hint: left ? `need ${left}` : `have ${have(m)}` };
}

// A search box with a suggestion list. One definition per box.
const combos = {
  log: {
    options(text) {
      const { query } = parseLoot(text);
      const need = needs(queue());
      if (!query) {
        const next = needs(queue().slice(0, 5));
        return Object.keys(next).filter(m => next[m] > have(m)).sort().map(m => materialOption(m, need));
      }
      return searchMaterials(query).map(m => materialOption(m, need));
    },
    pick(option, text) {
      const { qty } = parseLoot(text);
      const field = document.getElementById("log-qty");
      logLoot(option.value, qty || Math.max(1, Math.floor(+field.value) || 1));
      field.value = 1;
      return "";
    },
    none: text => `No hideout part matches “${parseLoot(text).query}”.`,
  },
  mapfind: {
    options(text) {
      const query = text.trim();
      const need = needs(queue());
      const parts = ALL_MATERIALS.map(m => ({ ...materialOption(m, need), kind: "part", score: query ? materialScore(query, m) : 0 }));
      if (!query) return parts.filter(o => need[o.value] > have(o.value)).slice(0, 8);
      const places = Object.entries(LOCS).filter(([, loc]) => !loc.everywhere)
        .map(([id, loc]) => ({ value: id, kind: "place", label: loc.name, short: "", hint: loc.at ? loc.at.split("·")[0].trim() : "place", score: queryScore(query, [loc.name]) }));
      return [...parts, ...places].filter(o => o.score).sort((a, b) => b.score - a.score).slice(0, 12);
    },
    pick(option) {
      if (option.kind === "part") {
        mapPrefs.filter = option.value;
        mapPrefs.selected = null;
      } else {
        const [x, y] = locationPoints(LOCS[option.value])[0];
        const w = Math.min(mapPrefs.view.w, 26);
        mapPrefs.filter = "all";
        mapPrefs.selected = [option.value];
        mapPrefs.view = mapClamp({ x: x - w / 2, y: flipY(y) - w / MAP_ASPECT / 2, w });
      }
      render();
      return option.label;
    },
    none: text => `Nothing on the map matches “${text.trim()}”.`,
  },
};
const comboState = { name: null, items: [], active: -1, quiet: false };
function comboClose() {
  if (!comboState.name) return;
  const input = document.getElementById(comboState.name + "-input"), list = document.getElementById(comboState.name + "-list");
  if (list) { list.hidden = true; list.innerHTML = ""; }
  if (input) { input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); }
  comboState.name = null;
}
function comboPaint() {
  const input = document.getElementById(comboState.name + "-input"), list = document.getElementById(comboState.name + "-list");
  if (!list || !input) return;
  list.innerHTML = comboState.items.map((o, i) =>
    `<li id="${comboState.name}-opt-${i}" role="option" aria-selected="${i === comboState.active}" data-combo-index="${i}"><span>${esc(o.label)}${o.short ? ` <span class="alias">${esc(o.short)}</span>` : ""}</span><span class="small muted">${esc(o.hint)}</span></li>`).join("");
  list.hidden = !comboState.items.length;
  input.setAttribute("aria-expanded", String(!list.hidden));
  if (comboState.active >= 0) {
    input.setAttribute("aria-activedescendant", `${comboState.name}-opt-${comboState.active}`);
    list.children[comboState.active].scrollIntoView({ block: "nearest" });
  } else input.removeAttribute("aria-activedescendant");
}
function comboOpen(name, text) {
  comboState.name = name;
  comboState.items = combos[name].options(text);
  // With text typed, the top match is highlighted, so Enter does what the list shows.
  comboState.active = parseLoot(text).query && comboState.items.length ? 0 : -1;
  comboPaint();
}
function comboChoose(name, index) {
  const option = comboState.items[index];
  const input = document.getElementById(name + "-input");
  if (!option || !input) return;
  const text = input.value;
  comboClose();
  // The pick may redraw the box and put the cursor back in it, which must not reopen the list.
  comboState.quiet = true;
  const value = combos[name].pick(option, text);
  const fresh = document.getElementById(name + "-input");
  if (fresh) { fresh.value = value; fresh.focus(); }
  comboState.quiet = false;
}
function comboSubmit(name) {
  const input = document.getElementById(name + "-input");
  const text = input.value;
  if (comboState.name !== name) comboOpen(name, text);
  if (!text.trim() && comboState.active < 0) return;
  if (comboState.items.length) comboChoose(name, Math.max(0, comboState.active));
  else notify(combos[name].none(text));
}
// Building takes parts from the stock and remembers how many, so Undo returns exactly that.
function build(id, n) {
  const from = built(id) + 1;
  for (let i = from; i <= n; i++) {
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
  notify(`${STATIONS[id].name} ${n} marked as built. Parts removed from your stock.`, () => unbuild(id, from));
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
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  notify("Backup saved to your downloads.");
}
async function importBackup(file) {
  try {
    state = clean(JSON.parse(await file.text()));
    save();
    notify("Progress imported.");
  } catch {
    notify("That file is not a valid backup. Nothing was changed.");
  }
}
// Removes the saved entry completely. Nothing is written back until the next change.
function deleteData() {
  const { tab, theme } = state;
  let message = "Your data was deleted from this browser.";
  try { localStorage.removeItem(STORAGE_KEY); } catch { message = "Your browser blocked this. Clear this site's data in the browser settings."; }
  state = empty();
  state.tab = tab;
  state.theme = theme;
  prefs.search = "";
  render();
  notify(message);
}
async function copyText(text, done) {
  try {
    await navigator.clipboard.writeText(text);
    notify(done);
  } catch {
    notify(`Your browser blocked copying. Here it is: ${text}`);
  }
}
function raidList(q) {
  const need = needs(scopeKeys(q));
  const missing = Object.entries(need).filter(([m, n]) => n > have(m)).sort((a, b) => a[0].localeCompare(b[0]));
  return missing.length ? "GZW raid list: " + missing.map(([m, n]) => `${n - have(m)} ${m}`).join(", ") : "";
}
function applyTheme() {
  if (state.theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = state.theme;
}

// ---------- Pieces ----------
function stepper(m, place) {
  const id = `${place}-${slug(m)}`;
  return `<span class="step"><button id="dec-${id}" data-act="dec" data-m="${esc(m)}" aria-label="Remove one ${esc(m)}">−</button><input id="have-${id}" type="number" min="0" max="9999" inputmode="numeric" value="${have(m)}" data-act="have" data-m="${esc(m)}" aria-label="How many ${esc(m)} you have"><button id="inc-${id}" data-act="inc" data-m="${esc(m)}" aria-label="Add one ${esc(m)}">+</button></span>`;
}
function pill(need, m) {
  const miss = need - have(m);
  return miss > 0 ? `<span class="pill miss">need ${miss}</span>` : `<span class="pill ok">have ${need}</span>`;
}
const shortName = m => SHORT_NAMES[m] && SHORT_NAMES[m] !== m ? ` <span class="alias" title="Name on the item in-game">${esc(SHORT_NAMES[m])}</span>` : "";
function whereList(m) {
  const value = entry => { const [id, conf] = entry.split(":"); return WEIGHT[conf] * nearness(id); };
  return `<div class="src">` + [...(WHERE[m] || [])].sort((a, b) => value(b) - value(a)).map(entry => {
    const [id, conf] = entry.split(":"), loc = LOCS[id], km = distanceLabel(id);
    return `<span><span class="mark ${conf}" aria-hidden="true">${MARK[conf]}</span>${esc(loc.name)}${loc.at ? ` <span class="mono">${esc(loc.at)}</span>` : ""}${km ? ` <span class="km">${km}</span>` : ""}</span>`;
  }).join("") + `</div>`;
}
function usedFor(m, q) {
  const list = q.filter(key => level(key).c[m]).map(key => `${levelName(key)} ×${level(key).c[m]}`);
  if (!list.length) return "";
  const more = list.length > 3 ? `, +${list.length - 3} more` : "";
  return `<p class="small muted">For: ${esc(list.slice(0, 3).join(", "))}${more}</p>`;
}
function sourceLinks(ids) {
  return ids.map(id => SOURCES[id].url ? `<a href="${SOURCES[id].url}" target="_blank" rel="noopener">${esc(SOURCES[id].name)}</a>` : esc(SOURCES[id].name)).join(", ");
}
function coordButtons(loc) {
  return loc.at ? loc.at.split("·").map(p => p.trim()).map(p => `<button class="coord" data-act="copy-coord" data-v="${esc(p)}" title="Copy coordinates">${esc(p)}</button>`).join("") : "";
}
function stop(s, full) {
  const loc = LOCS[s.id], km = distanceLabel(s.id);
  return `<div class="stop"><div class="stop-head"><span>${esc(loc.name)}</span><span class="row tight">${coordButtons(loc)}${km ? `<span class="mono small muted">${km}</span>` : ""}</span></div>
    ${loc.tip ? `<p class="small muted">${esc(loc.tip)}</p>` : ""}
    <div class="tags">${s.items.map(i => `<span class="tag${i.hot ? " hot" : ""}">${full ? `<span aria-hidden="true">${MARK[i.conf]}</span> ` : ""}${esc(i.m)}</span>`).join("")}</div>
    ${full ? `<p class="small muted">Source: ${sourceLinks(loc.src)}</p>` : ""}</div>`;
}
function scopeBar() {
  const b = (v, t) => `<button data-act="scope" data-v="${v}" aria-pressed="${state.scope === v}">${t}</button>`;
  return `<span class="seg" role="group" aria-label="Which builds to count">${b("next", "Next build")}${b("five", "Next 5 builds")}${b("all", "Whole hideout")}</span>`;
}
const LEGEND = `<p class="small muted"><span class="mark r">●</span> named by a guide or player &nbsp; <span class="mark t">◐</span> type of place only &nbsp; <span class="mark g">?</span> educated guess, no source yet. Spawns are never guaranteed.</p>`;
function rankingNote() {
  return state.faction
    ? "Sorted by your missing parts and straight-line distance from your base. Danger and landing zones are not counted."
    : "Sorted by your missing parts. Choose your faction above to count distance too.";
}
function deleteControls() {
  return prefs.confirmDelete
    ? `<span class="small warn">Delete your parts, builds and faction from this browser? This cannot be undone.</span>
       <button class="btn tiny danger" data-act="delete-yes">Yes, delete</button><button class="btn tiny" data-act="delete-no">Cancel</button>`
    : `<button class="btn tiny" data-act="delete">Delete my data</button>`;
}

// ---------- Sections ----------
function renderHeader(q) {
  const total = ORDER.length, done = total - q.length, need = needs(q);
  const missing = Object.entries(need).reduce((sum, [m, n]) => sum + Math.max(0, n - have(m)), 0);
  const cash = q.reduce((sum, key) => sum + (level(key).cash || 0), 0);
  const ready = buildable().filter(key => !missingCount(key)).length;
  document.getElementById("stats").innerHTML =
    `<div class="stat"><b>${done} / ${total}</b><span class="label">Levels built</span></div>
     <div class="stat"><b>${ready}</b><span class="label">Ready to build</span></div>
     <div class="stat"><b>${missing}</b><span class="label">Parts to find</span></div>
     <div class="stat"><b>${money(cash)}</b><span class="label">Cash needed</span></div>`;
  document.getElementById("bar").style.width = (done / total * 100) + "%";
  document.getElementById("barwrap").setAttribute("aria-valuenow", done);
  document.getElementById("backup").innerHTML =
    `<button class="btn tiny" id="theme-btn" data-act="theme" title="Change between automatic, light and dark">Theme: ${state.theme}</button>
     <button class="btn tiny" data-act="export">Export</button>
     <label class="btn tiny">Import<input class="visually-hidden" id="import" type="file" accept="application/json,.json"></label>
     ${deleteControls()}`;
  document.getElementById("setup").innerHTML =
    `<label class="small" for="faction">Faction</label>
     <select id="faction" class="search" title="Sorts locations by distance from your base"><option value="">Choose your faction</option>${Object.entries(FACTIONS).map(([id, f]) => `<option value="${id}"${state.faction === id ? " selected" : ""}>${esc(f.name)}</option>`).join("")}</select>
     ${Object.entries(RANKS).map(([id, label]) => `<label class="check small"><input type="checkbox" id="rank-${id}" data-rank="${id}"${state.ranks[id] ? " checked" : ""}> ${esc(label)}</label>`).join("")}
     <span class="small${prefs.saveFailed ? " warn" : " muted"}">${prefs.saveFailed ? "Your browser blocked saving. Use Export to keep your progress." : "Saved automatically in this browser"}</span>`;
}

function renderGuide() {
  const el = document.getElementById("guide");
  el.hidden = state.guideDone;
  if (state.guideDone) return;
  el.innerHTML = `<div><h2>How it works</h2>
      <ol class="small"><li>Choose your faction and untick any vendor rank you do not have yet.</li>
      <li>After a raid, log what you brought back.</li>
      <li>Build what is ready in-game, then mark it as built here.</li></ol></div>
    <button class="btn tiny" data-act="guide-done">Got it</button>`;
}

function renderNow(q) {
  const el = document.getElementById("now");
  if (!q.length) {
    el.innerHTML = `<div class="panel target"><h2>Hideout complete</h2><p>All ${ORDER.length} levels are built.</p></div>`;
    return;
  }
  const lv = level(q[0]);
  const ready = !missingCount(q[0]);
  const locked = isLocked(q[0]), unmet = unmetRequirements(q[0]);
  const rows = Object.entries(lv.c).map(([m, n]) =>
    `<div class="mat${have(m) >= n ? " done" : ""}"><span class="name">${esc(m)} × ${n}${shortName(m)}</span>${stepper(m, "n")}${pill(n, m)}<div class="extra">${have(m) >= n ? "" : whereList(m)}</div></div>`).join("");
  const stops = rankLocations(q.slice(0, 5), q[0]).slice(0, 4).map(s => stop(s, false)).join("");
  el.innerHTML = `<div class="panel target">
      <div><span class="label">Next build · ${esc(lv.st.room.name)}</span>
      <h2>${esc(lv.st.name)}, level ${lv.n}${lv.d ? `: ${esc(lv.d)}` : ""}</h2></div>
      ${locked ? `<p class="small warn">Locked: ${esc(lv.st.room.unlock)} You can still collect the parts.</p>` : ""}
      ${unmet.length ? `<p class="small warn">Build first: ${esc(unmet.map(levelName).join(", "))}.</p>` : ""}
      <div>${rows}</div>
      ${lv.cash ? `<p class="mono small">Plus ${money(lv.cash)}</p>` : ""}
      <div class="row"><button class="btn${ready && !locked && !unmet.length ? " main" : ""}" data-act="build" data-id="${lv.id}" data-n="${lv.n}">Mark as built</button>
      ${state.focus ? `<button class="btn" data-act="unfocus">Back to suggested order</button>` : ""}
      ${q[1] ? `<span class="small muted">Then: ${esc(levelName(q[1]))}</span>` : ""}</div>
    </div>
    <div class="panel"><div><span class="label">For your next 5 builds</span><h2>Where to look</h2></div>
      <div>${stops || `<p class="muted">You have everything for your next 5 builds.</p>`}</div>
      <p class="small muted">Orange parts are needed for the next build. ${rankingNote()}</p></div>`;
}

function renderReady(q) {
  const el = document.getElementById("ready");
  const open = buildable().filter(key => key !== q[0]);
  const ready = open.filter(key => !missingCount(key));
  const close = open.filter(key => { const n = missingCount(key); return n > 0 && n <= 2; });
  el.hidden = !ready.length && !close.length;
  if (el.hidden) return;
  const missingText = key => Object.entries(level(key).c).filter(([m, n]) => n > have(m)).map(([m, n]) => `${n - have(m)} ${m}`).join(", ");
  const row = (key, note, canBuild) => `<div class="ready-row"><span class="small"><b>${esc(levelName(key))}</b>${note ? ` <span class="muted">${esc(note)}</span>` : ""}</span>
    <span class="row tight"><button class="btn tiny" data-act="focus" data-k="${key}">Make next</button>${canBuild ? `<button class="btn tiny" data-act="build" data-id="${level(key).id}" data-n="${level(key).n}">Built</button>` : ""}</span></div>`;
  el.innerHTML = `${ready.length ? `<div><h3>Ready to build now</h3>${ready.map(key => row(key, level(key).cash ? `plus ${money(level(key).cash)}` : "", true)).join("")}</div>` : ""}
    ${close.length ? `<div><h3>Almost there</h3>${close.map(key => row(key, `need ${missingText(key)}`, false)).join("")}</div>` : ""}`;
}

// While searching, the whole hideout counts, so a part is found even if it is not needed soon.
function materialRows(q) {
  const nextNeed = q[0] ? level(q[0]).c : {};
  const searching = !!prefs.search.trim();
  const need = needs(searching ? q : scopeKeys(q));
  let list = Object.entries(need);
  if (searching) {
    list = searchMaterials(prefs.search).filter(m => need[m]).map(m => [m, need[m]]);
  } else {
    if (state.hideDone) list = list.filter(([m, n]) => have(m) < n);
    list.sort((a, b) => {
      const ma = a[1] - have(a[0]), mb = b[1] - have(b[0]);
      if ((ma > 0) !== (mb > 0)) return ma > 0 ? -1 : 1;
      if (!!nextNeed[a[0]] !== !!nextNeed[b[0]]) return nextNeed[a[0]] ? -1 : 1;
      return mb - ma || a[0].localeCompare(b[0]);
    });
  }
  const rows = list.map(([m, n]) => `<div class="mat${have(m) >= n ? " done" : ""}">
      <span class="name">${esc(m)}${shortName(m)} <span class="mono small muted">/ ${n}</span></span>${stepper(m, "m")}${pill(n, m)}
      <div class="extra">${whereList(m)}${usedFor(m, q)}</div></div>`).join("");
  if (rows) return rows;
  return `<p class="empty">${searching ? `No part still needed matches “${esc(prefs.search.trim())}”. Try the full name or the in-game short name.` : "Nothing left to collect here."}</p>`;
}
function renderMaterials(q) {
  return `<div class="tools">${scopeBar()}<input id="search" class="search" type="search" placeholder="Search all parts: GPU, electrical…" aria-label="Search all parts" value="${esc(prefs.search)}"></div>
    <div class="row"><label class="check small"><input type="checkbox" id="hide-done"${state.hideDone ? " checked" : ""}> Hide parts I already have</label>
      <button class="btn tiny" data-act="copy-list">Copy raid list</button></div>
    ${LEGEND}<div class="list" id="matlist">${materialRows(q)}</div>
    <p class="small muted">Found a part somewhere else? <a href="${REPO}/issues/new?template=location.yml" target="_blank" rel="noopener">Report the location</a>.</p>`;
}

// A place matches by its own name or by the parts reported there.
function locationRows(q) {
  const query = prefs.placeSearch.trim();
  let list;
  if (query) {
    const nextNeed = q[0] ? level(q[0]).c : {};
    list = Object.keys(LOCS).map(id => {
      const name = queryScore(query, [LOCS[id].name]);
      const parts = partsAt(id);
      const matching = parts.filter(m => materialScore(query, m));
      if (!name && !matching.length) return null;
      const items = (name ? parts : matching).map(m => ({ m, conf: WHERE[m].find(e => e.startsWith(id + ":")).split(":")[1], hot: (nextNeed[m] || 0) > have(m) }));
      return { id, items, score: Math.max(name, ...matching.map(m => materialScore(query, m))) * nearness(id) };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
  } else {
    list = rankLocations(scopeKeys(q), q[0]);
  }
  const rows = list.map(s => stop(s, true)).join("");
  return rows || `<p class="empty">${query ? `No place or part matches “${esc(query)}”.` : "Nothing left to collect here."}</p>`;
}
function renderLocations(q) {
  return `<div class="tools">${scopeBar()}<input id="place-search" class="search" type="search" placeholder="Search places or parts" aria-label="Search places or parts" value="${esc(prefs.placeSearch)}"></div>${LEGEND}
    <p class="small muted">${rankingNote()} Select coordinates to copy them.</p>
    <div class="list" style="padding-block:12px" id="placelist">${locationRows(q)}</div>`;
}

function renderStations(q) {
  return ROOMS.map(room => {
    const roomLocked = (room.needs || []).some(r => !state.ranks[r]);
    return `<section class="room"><div><h2>${esc(room.name)}${roomLocked ? ` <span class="chip">locked</span>` : ""}</h2><p class="small muted">${esc(room.unlock)}</p></div><div class="stations">` +
    room.stations.map(st => `<div class="st"><div class="st-head"><h3>${esc(st.name)}</h3><span class="mono small muted">${built(st.id)} / ${st.levels.length}</span></div>` +
      st.levels.map((lv, i) => {
        const n = i + 1, isBuilt = n <= built(st.id), key = `${st.id}:${n}`, isNext = q[0] === key;
        const cost = [...Object.entries(lv.c).map(([m, c]) => `${c} ${m}`), ...(lv.cash ? [money(lv.cash)] : [])].join(", ");
        const unmet = isBuilt ? [] : unmetRequirements(key);
        return `<div class="lv${isBuilt ? " built" : ""}"><div class="lv-top"><b>Level ${n}${lv.d ? ` <span class="small muted">${esc(lv.d)}</span>` : ""}</b>
          <span class="row tight">${isBuilt
            ? `<button class="btn tiny on" data-act="unbuild" data-id="${st.id}" data-n="${n}">✓ Undo</button>`
            : `${isNext ? `<span class="label">Next</span>` : `<button class="btn tiny" data-act="focus" data-k="${key}">Make next</button>`}<button class="btn tiny" data-act="build" data-id="${st.id}" data-n="${n}">Built</button>`}</span></div>
          <div class="cost small">${esc(cost)}</div>
          ${unmet.length ? `<div class="small warn">Build first: ${esc(unmet.map(levelName).join(", "))}</div>` : ""}
          <div><span class="chip${VERIFIED.includes(key) ? " ok" : ""}">${VERIFIED.includes(key) ? "verified in-game" : "community source"}</span></div></div>`;
      }).join("") + `</div>`).join("") + `</div></section>`;
  }).join("");
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
      <li>Distances are straight lines from your base. Places without a known position rank lower. Helicopter routes, Ground Zero and enemies are not counted.</li>
      <li>“Ready to build” checks each level on its own. Two levels may both need the same parts, so check the numbers before you build both.</li>
      <li>Some guides disagree on unlock requirements, so check the hideout screen in-game.</li>
    </ul>
    <h2>Spoiler note</h2>
    <p>This page lists locations and costs that you could otherwise discover yourself. Using it may change how the game feels.</p>
    <h2>About the map</h2>
    <p>The Map tab uses in-game screenshots with session icons removed, and shows only the places listed here. Some named spots are expected to hold certain parts from their type, which is marked ◐ until players confirm it. The map itself belongs to MADFINGER Games, and we will remove it if they ask. For crates and every other marker, try <a href="https://gzwtacmap.com/maps/lamang" target="_blank" rel="noopener">GZW Tac Map</a> or <a href="https://zoneintel.gg/maps/lamang" target="_blank" rel="noopener">Zone Intel</a>.</p>
    <h2>Your data</h2>
    <p>Your parts, builds and faction are saved automatically in this browser, and the page reopens as you left it. There is no account, cookies or analytics, and nothing is sent anywhere. Clearing your browser data erases it, and private windows may not keep it, so use Export to back it up or move it to another device.</p>
    <div class="row">${deleteControls()}</div>
    <h2>Sources</h2>
    <p>${list}. Thanks to everyone who maintains them.</p>
    <p class="small muted">Fan project, not affiliated with or endorsed by MADFINGER Games. Gray Zone Warfare and its content belong to their owners.</p>
  </div>`;
}

// ---------- Map ----------
// SVG units match the map grid: X stays X, and Y is flipped so north is up. One unit is 100 m.
const MAP = { x0: 94, x1: 262, y0: 96, y1: 185, minW: 8 };
const MAP_W = MAP.x1 - MAP.x0, MAP_H = MAP.y1 - MAP.y0, MAP_ASPECT = MAP_W / MAP_H;
const flipY = y => MAP.y1 - y;
const mapPrefs = { view: null, filter: "missing", selected: null, drag: null };
// Detail tiles load only for the part of the map on screen. Without them the overview still works.
const mapTiles = { manifest: null, group: null, loaded: new Map() };
fetch("map/tiles.json?v=1").then(r => r.json()).then(m => { mapTiles.manifest = m; mapDraw(); }).catch(() => {});

function drawTiles(svg, v) {
  const group = document.getElementById("map-tiles");
  if (group !== mapTiles.group) { mapTiles.group = group; mapTiles.loaded.clear(); }
  const manifest = mapTiles.manifest;
  if (!manifest || !group) return;
  const density = svg.clientWidth * (window.devicePixelRatio || 1) / v.w;
  const levels = density > 30 ? ["1", "2"] : density > 10 ? ["1"] : [];
  const wanted = new Set();
  const h = v.w / MAP_ASPECT;
  levels.forEach(level => {
    const info = manifest.levels[level], step = manifest.tile / info.scale;
    info.tiles.forEach(name => {
      const [col, row] = name.split("_").map(Number);
      const x = MAP.x0 + col * step, y = row * step;
      const tw = Math.min(step, info.width / info.scale - col * step), th = Math.min(step, info.height / info.scale - row * step);
      if (x > v.x + v.w || x + tw < v.x || y > v.y + h || y + th < v.y) return;
      const key = `${level}/${name}`;
      wanted.add(key);
      if (mapTiles.loaded.has(key)) return;
      const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
      image.setAttribute("href", `map/tiles/${key}.jpg?v=1`);
      image.setAttribute("x", x);
      image.setAttribute("y", y);
      image.setAttribute("width", tw);
      image.setAttribute("height", th);
      image.setAttribute("preserveAspectRatio", "none");
      image.dataset.level = level;
      // Level 2 stays on top of level 1, whatever order they arrive in.
      const firstFine = group.querySelector('image[data-level="2"]');
      if (level === "1" && firstFine) group.insertBefore(image, firstFine); else group.appendChild(image);
      mapTiles.loaded.set(key, image);
    });
  });
  mapTiles.loaded.forEach((image, key) => {
    if (!wanted.has(key)) { image.remove(); mapTiles.loaded.delete(key); }
  });
}

function mapHome() {
  const faction = FACTIONS[state.faction];
  if (!faction) return { x: MAP.x0, y: 0, w: MAP_W };
  const w = 84;
  return mapClamp({ x: faction.base[0] - w / 2, y: flipY(faction.base[1]) - w / MAP_ASPECT / 2, w });
}
function mapClamp(v) {
  v.w = Math.min(MAP_W, Math.max(MAP.minW, v.w));
  v.x = Math.min(MAP.x1 - v.w, Math.max(MAP.x0, v.x));
  v.y = Math.min(MAP_H - v.w / MAP_ASPECT, Math.max(0, v.y));
  return v;
}
function partsAt(id) {
  return Object.keys(WHERE).filter(m => WHERE[m].some(entry => entry.startsWith(id + ":")));
}
function mapPlaces(q) {
  const need = needs(q.slice(0, 5));
  const missing = Object.keys(need).filter(m => need[m] > have(m));
  const wanted = mapPrefs.filter === "missing" ? missing : mapPrefs.filter === "all" ? null : [mapPrefs.filter];
  const out = [];
  Object.entries(LOCS).forEach(([id, loc]) => {
    if (loc.everywhere) return;
    const on = !wanted || partsAt(id).some(m => wanted.includes(m));
    locationPoints(loc).forEach(([x, y]) => out.push({ id, x, y, on }));
  });
  return out;
}
function renderMap(q) {
  mapPrefs.view = mapPrefs.view || mapHome();
  const need = needs(q.slice(0, 5));
  const opt = (v, t) => `<option value="${esc(v)}"${mapPrefs.filter === v ? " selected" : ""}>${esc(t)}</option>`;
  const common = Object.values(LOCS).filter(loc => loc.everywhere).map(loc => loc.name);
  return `<div class="tools"><span class="row"><label class="small" for="map-filter">Show</label>
      <select id="map-filter" class="search">${opt("missing", "What I need next")}${opt("all", "All places")}${ALL_MATERIALS.map(m => opt(m, m + (need[m] > have(m) ? " · needed" : ""))).join("")}</select></span>
      <div class="combo"><input class="search" id="mapfind-input" role="combobox" aria-expanded="false" aria-controls="mapfind-list" aria-autocomplete="list" autocomplete="off" placeholder="Find a part or place" aria-label="Find a part or place on the map"><ul class="combo-list" id="mapfind-list" role="listbox" aria-label="Matches" hidden></ul></div>
      <span class="seg" role="group" aria-label="Map zoom"><button data-act="zoom" data-v="in" aria-label="Zoom in">+</button><button data-act="zoom" data-v="out" aria-label="Zoom out">−</button><button data-act="zoom" data-v="home">My area</button><button data-act="zoom" data-v="all">Whole map</button></span></div>
    <div class="mapbox"><svg id="map" role="img" aria-label="Map of Lamang with places where parts are reported" preserveAspectRatio="xMidYMid slice">
      <image href="map/lamang.jpg?v=3" x="${MAP.x0}" y="0" width="${MAP_W}" height="${MAP_H}" preserveAspectRatio="none"></image>
      <g id="map-tiles"></g><g id="map-marks"></g></svg></div>
    <p class="small muted"><span class="dot zn"></span> exact position &nbsp; <span class="dot rg"></span> rough position &nbsp; <span class="dot bs"></span> base. One big grid square is 1 km. Drag to move, scroll or use the buttons to zoom, select a marker for details.</p>
    <div class="panel" id="map-detail"></div>
    <p class="small muted">Not marked, because they are all over the map: ${esc(common.join(", "))}.</p>
    <p class="small muted">Map made from in-game screenshots, with session icons retouched out. It belongs to MADFINGER Games and will be removed on request.</p>`;
}
function mapDraw() {
  const svg = document.getElementById("map");
  if (!svg) return;
  const v = mapPrefs.view, h = v.w / MAP_ASPECT;
  svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${h}`);
  drawTiles(svg, v);
  const r = v.w * 0.0085, font = v.w * 0.015, sw = v.w * 0.002;
  const grid = [];
  for (let x = 100; x <= 260; x += 10) {
    grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${MAP_H}" class="map-grid" stroke-width="${sw / 2}"></line>`);
    grid.push(`<text x="${x + font * 0.25}" y="${v.y + font * 1.1}" font-size="${font * 0.8}" class="map-text">${x}</text>`);
  }
  for (let y = 100; y <= 180; y += 10) {
    grid.push(`<line x1="${MAP.x0}" y1="${flipY(y)}" x2="${MAP.x1}" y2="${flipY(y)}" class="map-grid" stroke-width="${sw / 2}"></line>`);
    grid.push(`<text x="${v.x + font * 0.3}" y="${flipY(y) - font * 0.25}" font-size="${font * 0.8}" class="map-text">${y}</text>`);
  }
  // Several places can share one rough position, for example inside Tiger Bay. They get one label.
  const all = mapPlaces(queue());
  const labelled = new Set();
  const taken = [];
  const roomFor = (x, y, width) => {
    const free = !taken.some(t => x < t.x + t.width && t.x < x + width && Math.abs(y - t.y) < font * 1.5);
    if (free) taken.push({ x, y, width });
    return free;
  };
  const places = [...all].sort((a, b) => b.on - a.on).map(p => {
    const x = p.x, y = flipY(p.y), s = r * 1.5, chosen = (mapPrefs.selected || []).includes(p.id);
    const ring = chosen ? `<circle cx="${x}" cy="${y}" r="${s * 1.7}" fill="none" class="map-ring" stroke-width="${sw * 1.5}"></circle>` : "";
    const spot = `${p.x},${p.y}`, others = all.filter(o => o.on && `${o.x},${o.y}` === spot).length - 1;
    const text = `${LOCS[p.id].name}${others ? ` +${others}` : ""}`;
    const showLabel = p.on && v.w < 100 && !labelled.has(spot) && roomFor(x, y, text.length * font * 0.56 + s * 1.3);
    if (showLabel) labelled.add(spot);
    const label = showLabel ? `<text x="${x + s * 1.3}" y="${y + font * 0.35}" font-size="${font}" class="map-text">${esc(text)}</text>` : "";
    const rough = !LOCS[p.id].at;
    return `${ring}<polygon points="${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}" opacity="${p.on ? 1 : 0.25}" class="map-place${rough ? " rough" : ""}" stroke-width="${rough ? sw * 2 : sw}"></polygon>${label}`;
  });
  const bases = Object.entries(FACTIONS).map(([id, f]) => {
    const mine = id === state.faction, q = r * (mine ? 1.3 : 0.9);
    return `<rect x="${f.base[0] - q}" y="${flipY(f.base[1]) - q}" width="${q * 2}" height="${q * 2}" class="${mine ? "map-base" : "map-other"}" stroke-width="${sw}"></rect><text x="${f.base[0]}" y="${flipY(f.base[1]) + q + font * 1.1}" text-anchor="middle" font-size="${font * (mine ? 1 : 0.85)}" class="map-text">${mine ? "Your base" : esc(f.name)}</text>`;
  });
  const lagoon = `<text x="203.5" y="${flipY(116)}" text-anchor="middle" font-size="${font}" class="map-text map-poi">Blue Lagoon</text>`;
  document.getElementById("map-marks").innerHTML = grid.join("") + lagoon + places.reverse().join("") + bases.join("");
  mapDetail();
}
function mapDetail() {
  const el = document.getElementById("map-detail");
  if (!el) return;
  const ids = mapPrefs.selected;
  if (!ids) { el.innerHTML = `<p class="muted">Select a marker to see what players report there.</p>`; return; }
  const need = needs(queue().slice(0, 5));
  el.innerHTML = ids.map(id => {
    const loc = LOCS[id], km = distanceLabel(id);
    return `<div class="stop"><div><span class="label">Reported place</span><h3>${esc(loc.name)}</h3><span class="row tight">${coordButtons(loc)}${loc.pos ? `<span class="small muted">rough position</span>` : ""}${km ? `<span class="mono small muted">${km} from your base</span>` : ""}</span></div>
      ${loc.tip ? `<p class="small">${esc(loc.tip)}</p>` : ""}
      <div class="tags">${partsAt(id).map(m => `<span class="tag${need[m] > have(m) ? " hot" : ""}">${esc(m)}</span>`).join("")}</div>
      <p class="small muted">Source: ${sourceLinks(loc.src)}</p></div>`;
  }).join("") + `<p class="small muted">Orange parts are ones you need next.</p>`;
}
function mapZoomAt(factor, x, y) {
  const v = mapPrefs.view, w = Math.min(MAP_W, Math.max(MAP.minW, v.w * factor)), k = w / v.w;
  mapPrefs.view = mapClamp({ x: x - (x - v.x) * k, y: y - (y - v.y) * k, w });
  mapDraw();
}
function mapZoom(action) {
  const v = mapPrefs.view, cx = v.x + v.w / 2, cy = v.y + v.w / MAP_ASPECT / 2;
  if (action === "in") return mapZoomAt(0.7, cx, cy);
  if (action === "out") return mapZoomAt(1 / 0.7, cx, cy);
  mapPrefs.view = action === "all" ? { x: MAP.x0, y: 0, w: MAP_W } : mapHome();
  mapDraw();
}
function mapPoint(svg, e) {
  const m = svg.getScreenCTM().inverse();
  return { x: m.a * e.clientX + m.c * e.clientY + m.e, y: m.b * e.clientX + m.d * e.clientY + m.f };
}
document.addEventListener("pointerdown", e => {
  const svg = e.target.closest && e.target.closest("#map");
  if (!svg) return;
  mapPrefs.drag = { sx: e.clientX, sy: e.clientY, vx: mapPrefs.view.x, vy: mapPrefs.view.y, moved: false, scale: svg.getScreenCTM().a };
  svg.setPointerCapture(e.pointerId);
});
document.addEventListener("pointermove", e => {
  const d = mapPrefs.drag;
  if (!d) return;
  const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
  if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
  if (!d.moved) return;
  mapPrefs.view = mapClamp({ x: d.vx - dx / d.scale, y: d.vy - dy / d.scale, w: mapPrefs.view.w });
  mapDraw();
});
document.addEventListener("pointerup", e => {
  const d = mapPrefs.drag;
  mapPrefs.drag = null;
  const svg = document.getElementById("map");
  if (!d || d.moved || !svg) return;
  // Picks the closest marker, so small targets are easy to hit on a phone.
  const at = mapPoint(svg, e);
  const places = mapPlaces(queue());
  let best = null, dist = mapPrefs.view.w * 0.03;
  places.forEach(p => {
    const gap = Math.hypot(p.x - at.x, flipY(p.y) - at.y);
    if (gap < dist) { dist = gap; best = p; }
  });
  mapPrefs.selected = best ? [...new Set(places.filter(p => p.x === best.x && p.y === best.y).map(p => p.id))] : null;
  mapDraw();
});
document.addEventListener("wheel", e => {
  const svg = e.target.closest && e.target.closest("#map");
  if (!svg) return;
  // At the zoom limits the wheel scrolls the page again.
  if ((e.deltaY < 0 && mapPrefs.view.w <= MAP.minW) || (e.deltaY > 0 && mapPrefs.view.w >= MAP_W)) return;
  e.preventDefault();
  const at = mapPoint(svg, e);
  mapZoomAt(e.deltaY < 0 ? 0.85 : 1 / 0.85, at.x, at.y);
}, { passive: false });

function renderToast() {
  const el = document.getElementById("toast");
  el.hidden = !prefs.message;
  if (!prefs.message) { el.innerHTML = ""; return; }
  el.innerHTML = `<span>${esc(prefs.message)}</span>${prefs.undo ? `<button class="btn tiny" data-act="undo">Undo</button>` : ""}`;
}

function render() {
  const activeId = document.activeElement && document.activeElement.id;
  const q = queue();
  applyTheme();
  renderHeader(q);
  renderGuide();
  renderNow(q);
  renderReady(q);
  document.getElementById("tabs").innerHTML = TABS.map(([v, t]) =>
    `<button id="tab-${v}" role="tab" data-act="tab" data-v="${v}" aria-selected="${state.tab === v}" aria-controls="view" tabindex="${state.tab === v ? 0 : -1}">${t}</button>`).join("");
  const view = document.getElementById("view");
  view.setAttribute("aria-labelledby", `tab-${state.tab}`);
  view.innerHTML =
    state.tab === "materials" ? renderMaterials(q)
    : state.tab === "locations" ? renderLocations(q)
    : state.tab === "map" ? renderMap(q)
    : state.tab === "stations" ? renderStations(q)
    : renderAbout();
  mapDraw();
  renderToast();
  if (activeId && document.getElementById(activeId)) {
    const el = document.getElementById(activeId);
    el.focus();
    // Keeps the cursor at the end of a search box after a redraw.
    if (el.type === "search") el.setSelectionRange(el.value.length, el.value.length);
  }
}
function showTab(v) {
  state.tab = v;
  history.replaceState(null, "", "#" + v);
  save();
}

// ---------- Events ----------
document.addEventListener("click", e => {
  const b = e.target.closest("button[data-act]");
  if (!b) return;
  const { act, m, id, n, v, k } = b.dataset;
  const undo = prefs.undo;
  if (!act.startsWith("delete")) prefs.confirmDelete = false;
  if (act === "inc") setHave(m, have(m) + 1);
  else if (act === "dec") setHave(m, have(m) - 1);
  else if (act === "build") build(id, +n);
  else if (act === "unbuild") unbuild(id, +n);
  else if (act === "focus") { state.focus = k; save(); window.scrollTo({ top: document.getElementById("now").offsetTop - 12, behavior: "smooth" }); }
  else if (act === "unfocus") { state.focus = null; save(); }
  else if (act === "export") { exportBackup(); render(); }
  else if (act === "delete") { prefs.confirmDelete = true; render(); }
  else if (act === "delete-no") { prefs.confirmDelete = false; render(); }
  else if (act === "delete-yes") { prefs.confirmDelete = false; deleteData(); }
  else if (act === "tab") showTab(v);
  else if (act === "scope") { state.scope = v; save(); }
  else if (act === "theme") { state.theme = THEMES[(THEMES.indexOf(state.theme) + 1) % THEMES.length]; save(); }
  else if (act === "guide-done") { state.guideDone = true; save(); }
  else if (act === "zoom") mapZoom(v);
  else if (act === "copy-coord") copyText(v, `Copied ${v}.`);
  else if (act === "copy-list") {
    const text = raidList(queue());
    if (text) copyText(text, "Raid list copied. Paste it to your squad."); else notify("Nothing is missing for these builds.");
  } else if (act === "undo" && undo) { prefs.message = ""; prefs.undo = null; undo(); renderToast(); }
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "faction") { state.faction = FACTIONS[t.value] ? t.value : null; mapPrefs.view = null; save(); }
  else if (t.id === "map-filter") { mapPrefs.filter = t.value; mapPrefs.selected = null; render(); }
  else if (t.dataset.rank) { state.ranks[t.dataset.rank] = t.checked; save(); }
  else if (t.id === "hide-done") { state.hideDone = t.checked; save(); }
  else if (t.dataset.act === "have") setHave(t.dataset.m, t.value);
  else if (t.id === "import" && t.files[0]) importBackup(t.files[0]);
});
const comboName = el => el && el.id && el.id.endsWith("-input") && combos[el.id.slice(0, -6)] ? el.id.slice(0, -6) : null;
document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "search") { prefs.search = t.value; document.getElementById("matlist").innerHTML = materialRows(queue()); }
  else if (t.id === "place-search") { prefs.placeSearch = t.value; document.getElementById("placelist").innerHTML = locationRows(queue()); }
  else if (comboName(t)) comboOpen(comboName(t), t.value);
});
document.addEventListener("focusin", e => {
  if (comboName(e.target) && !comboState.quiet) comboOpen(comboName(e.target), e.target.value);
});
document.addEventListener("focusout", e => {
  if (comboName(e.target)) comboClose();
});
// mousedown, because a click would first take the focus away and close the list.
document.addEventListener("mousedown", e => {
  const item = e.target.closest && e.target.closest("[data-combo-index]");
  if (!item) return;
  e.preventDefault();
  comboChoose(comboState.name, +item.dataset.comboIndex);
});
document.getElementById("log").addEventListener("submit", e => {
  e.preventDefault();
  comboSubmit("log");
});
document.addEventListener("keydown", e => {
  const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
  if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    document.getElementById("log-input").focus();
  }
  const name = comboName(e.target);
  if (name) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (comboState.name !== name) comboOpen(name, e.target.value);
      const count = comboState.items.length;
      if (count) {
        comboState.active = (comboState.active + (e.key === "ArrowDown" ? 1 : count - 1 + (comboState.active < 0 ? 1 : 0))) % count;
        comboPaint();
      }
    } else if (e.key === "Enter" && name === "mapfind") {
      e.preventDefault();
      comboSubmit(name);
    } else if (e.key === "Escape") {
      comboClose();
    }
  }
  if (e.target.getAttribute("role") === "tab" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    const i = TABS.findIndex(([v]) => v === state.tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
    showTab(next);
    document.getElementById(`tab-${next}`).focus();
  }
});
// With the page open in two tabs, keep both up to date.
window.addEventListener("storage", e => {
  if (e.key === STORAGE_KEY) { state = load(); render(); }
});

const fromHash = location.hash.slice(1);
if (TABS.some(([v]) => v === fromHash)) state.tab = fromHash;
render();

// Lets the page open offline after the first visit. It always tries the network first.
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
