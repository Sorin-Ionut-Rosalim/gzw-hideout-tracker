// Checks data.js for mistakes. Run with: node tests/check-data.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = {};
vm.createContext(context);
vm.runInContext(
  readFileSync(new URL("../data.js", import.meta.url), "utf8") +
    "\nObject.assign(globalThis, { SOURCES, VERIFIED, FACTIONS, ROOMS, ORDER, RANKS, REQUIRES, SHORT_NAMES, LOCS, WHERE });",
  context
);
const { SOURCES, VERIFIED, FACTIONS, ROOMS, ORDER, RANKS, REQUIRES, SHORT_NAMES, LOCS, WHERE } = context;

const errors = [];
const levelKeys = [];
const materials = new Set();
const seenStations = new Set();
ROOMS.forEach(room => {
  (room.needs || []).forEach(r => { if (!RANKS[r]) errors.push(`${room.name}: unknown rank ${r}`); });
  room.stations.forEach(st => {
    if (seenStations.has(st.id)) errors.push(`Duplicate station id ${st.id}`);
    seenStations.add(st.id);
    st.levels.forEach((lv, i) => {
      levelKeys.push(`${st.id}:${i + 1}`);
      if (!Object.keys(lv.c).length) errors.push(`${st.id}:${i + 1} has no cost`);
      Object.entries(lv.c).forEach(([m, n]) => {
        materials.add(m);
        if (!Number.isInteger(n) || n < 1) errors.push(`${st.id}:${i + 1}: bad amount for ${m}`);
      });
    });
  });
});

const unique = new Set(ORDER);
if (unique.size !== ORDER.length) errors.push("ORDER has duplicates");
levelKeys.filter(k => !unique.has(k)).forEach(k => errors.push(`${k} is missing from ORDER`));
ORDER.filter(k => !levelKeys.includes(k)).forEach(k => errors.push(`ORDER has unknown level ${k}`));
ORDER.forEach((k, i) => {
  const [id, n] = k.split(":");
  if (+n > 1 && ORDER.indexOf(`${id}:${n - 1}`) > i) errors.push(`${k} comes before the level below it`);
});

VERIFIED.filter(k => !levelKeys.includes(k)).forEach(k => errors.push(`VERIFIED has unknown level ${k}`));
Object.entries(REQUIRES).forEach(([k, reqs]) => {
  if (!levelKeys.includes(k)) errors.push(`REQUIRES has unknown level ${k}`);
  reqs.forEach(r => {
    if (!levelKeys.includes(r)) errors.push(`${k} requires unknown level ${r}`);
    if (ORDER.indexOf(r) > ORDER.indexOf(k)) errors.push(`${k} comes before its requirement ${r}`);
  });
});

materials.forEach(m => { if (!WHERE[m] || !WHERE[m].length) errors.push(`${m} has no locations`); });
Object.keys(WHERE).filter(m => !materials.has(m)).forEach(m => errors.push(`WHERE lists unused part ${m}`));
Object.keys(SHORT_NAMES).filter(m => !materials.has(m)).forEach(m => errors.push(`SHORT_NAMES lists unknown part ${m}`));
Object.entries(WHERE).forEach(([m, list]) => list.forEach(entry => {
  const [id, conf] = entry.split(":");
  if (!LOCS[id]) errors.push(`${m}: unknown location ${id}`);
  if (!["r", "t", "g"].includes(conf)) errors.push(`${m}: bad confidence in ${entry}`);
}));

const validPoint = ([x, y]) => x >= 100 && x <= 240 && y >= 100 && y <= 180;
Object.entries(LOCS).forEach(([id, loc]) => {
  if (!loc.src || !loc.src.length) errors.push(`${id} has no source`);
  (loc.src || []).forEach(s => { if (!SOURCES[s]) errors.push(`${id}: unknown source ${s}`); });
  if (loc.at) loc.at.split("·").forEach(p => {
    if (!/^\d{3} \d{3}$/.test(p.trim()) || !validPoint(p.trim().split(" ").map(Number))) errors.push(`${id}: bad coordinates "${p}"`);
  });
  if (loc.pos && !validPoint(loc.pos)) errors.push(`${id}: bad position`);
});
Object.entries(FACTIONS).forEach(([id, f]) => { if (!validPoint(f.base)) errors.push(`${id}: bad base position`); });

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Data OK: ${levelKeys.length} levels, ${materials.size} parts, ${Object.keys(LOCS).length} locations.`);
