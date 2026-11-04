// All game data lives in this file. Corrections usually only touch this file.

const DATA_VERSION = "Update 0.5 (Rogue Ops), last reviewed 2026-11-04";

const SOURCES = {
  gzwitems: { name: "GZW Items", url: "https://gzwitems.com/hideout" },
  tpose: { name: "TPose Gaming", url: "https://tposegaming.com/gray-zone-warfare-hideout-materials-guide/" },
  vortex: { name: "Vortex Gaming", url: "https://vortexgaming.io/en/postdetail/1316422" },
  worldeka: { name: "Worldeka", url: "https://worldeka.com/gray-zone-warfare-hideout-guide-how-to-build-upgrade-and-find-materials-in-update-0-5/" },
  horizon: { name: "GamesHorizon", url: "https://gameshorizon.com/guides/gray-zone-warfare-0-5-hideout-guide/" },
  wiki: { name: "GZW Wiki", url: "https://grayzonewarfaregame.wiki/hideout/materials/" },
  treyex: { name: "Treyex Gaming", url: "https://www.treyexgaming.com/gray-zone-warfare-best-loot-locations/" },
  games: { name: "Games.gg", url: "https://games.gg/gray-zone-warfare/guides/hideout-rooms-stations-build-order/" },
  twinfinite: { name: "Twinfinite", url: "https://twinfinite.net/guides/gray-zone-warfare-map-all-poi-size/" },
  player: { name: "Player reports" },
  ingame: { name: "In-game map" },
};

// Base positions are read from the in-game map.
const FACTIONS = {
  csi: { name: "Crimson Shield International", base: [134, 171] },
  lri: { name: "Lamang Recovery Initiative", base: [208, 172] },
  mithras: { name: "Mithras Security Systems", base: [172, 108] },
};

// Costs come from GZW Items unless the level is listed in VERIFIED, which means checked in-game here.
const VERIFIED = ["gen:1", "heat:1"];

const ROOMS = [
  { name: "Utility Room", unlock: "Guides disagree: available from the start, or at Lab Rat rank 2.", stations: [
    { id: "gen", name: "Generator", levels: [
      { d: "Two-Stroke Engine, 9 kW", c: { "Steel": 1, "Mechanical Parts": 1, "Motor Oil": 1, "Dynamo": 1 } },
      { d: "Diesel Generator, 18 kW", c: { "Steel": 2, "Mechanical Parts": 2, "Motor Oil": 1, "Dynamo": 1, "Plumbing Parts": 2, "Electrical Parts": 2 } },
    ] },
  ] },
  { name: "Laboratory", unlock: "Unlocks at Lab Rat rank 2.", needs: ["labRat"], stations: [
    { id: "heat", name: "Heat Source", levels: [
      { d: "Open Fire Pit", c: { "Steel": 3, "Construction Materials": 2, "Wood": 1 } },
      { c: { "Steel": 4, "Plumbing Parts": 2, "Construction Materials": 3, "Burner Head": 1 } },
      { d: "Multiple Burner Array", cash: 40000, c: { "Steel": 10, "Plumbing Parts": 5, "Construction Materials": 5, "Burner Head": 2, "Mechanical Parts": 2 } },
    ] },
    { id: "ext", name: "Extraction Vessel", levels: [
      { d: "Oil Tank", c: { "Steel": 1, "Copper": 1, "Plumbing Parts": 1, "Analog Indicator": 1 } },
      { c: { "Copper": 5, "Plumbing Parts": 1, "Analog Indicator": 1, "Water Pump": 1 } },
    ] },
    { id: "react", name: "Reaction Vessel", levels: [
      { d: "Plastic Drums", c: { "Plastics": 2, "Construction Materials": 1, "Silicone Sealant": 1 } },
      { c: { "Steel": 4, "Chemicals": 2, "Zinc Electrode": 1 } },
      { d: "Stainless Steel Tank", cash: 45000, c: { "Steel": 12, "Stainless Steel Sheet": 3, "Mechanical Parts": 6 } },
    ] },
    { id: "filt", name: "Filtration", levels: [
      { d: "Cloth Sheet Filter", c: { "Wood": 2, "Fabrics": 4 } },
      { c: { "Steel": 3, "Fine Metal Mesh": 3 } },
    ] },
    { id: "ana", name: "Analysis", levels: [
      { d: "PH Meter", c: { "Plastics": 2, "Electrical Parts": 1, "Circuit Board": 1, "Complex Glass Electrode": 1 } },
      { cash: 35000, c: { "Plastics": 2, "Electrical Parts": 4, "Circuit Board": 3, "Mechanical Parts": 2, "Vapor Lamp": 1, "Crystal Prism": 1 } },
    ] },
    { id: "glass", name: "Glassware", levels: [
      { d: "Basic Glass Set", c: { "Glass": 1, "Plastics": 1, "Laboratory Flask": 1 } },
      { c: { "Glass": 2, "Plastics": 1, "Laboratory Flask": 1, "Mechanical Pipette": 1 } },
    ] },
    { id: "lstor", name: "Storage Equipment (Lab)", levels: [
      { d: "Rusty Old Fridge", c: { "Steel": 1, "Electrical Parts": 1, "Refrigerant": 1, "Plumbing Parts": 1 } },
      { c: { "Steel": 3, "Glass": 3, "Plumbing Parts": 2, "Refrigerant": 1 } },
      { cash: 45000, c: { "Steel": 6, "Glass": 5, "Plumbing Parts": 2, "Refrigerant": 2, "Electrical Parts": 2, "Circuit Board": 2 } },
    ] },
    { id: "vent", name: "Ventilation System", levels: [
      { d: "Cooling Fan", c: { "Electrical Parts": 2, "Plastics": 2, "PC Fan": 2 } },
      { cash: 35000, c: { "Steel": 10, "Electrical Parts": 5, "Plumbing Parts": 5, "PC Fan": 3, "HEPA Filter": 1 } },
    ] },
  ] },
  { name: "Electronics Workshop", unlock: "Unlocks at Lab Rat rank 2 and Artisan rank 2.", needs: ["labRat", "artisan"], stations: [
    { id: "hw", name: "Hardware", levels: [
      { d: "Scavenged PC Rig", c: { "Motherboard": 1, "Graphics Card": 1, "CPU": 1, "PC Fan": 1, "RAM": 1, "Power Supply": 1 } },
      { c: { "Motherboard": 1, "Graphics Card": 1, "CPU": 1, "Plumbing Parts": 2, "RAM": 3, "Power Supply": 1 } },
      { cash: 45000, c: { "Motherboard": 1, "Server CPU": 1, "Electrical Parts": 1, "RAM": 4, "Power Supply": 1 } },
    ] },
    { id: "sw", name: "Software", levels: [
      { d: "Leaked Military Firmware", c: { "Civilian Software": 3, "Military Software": 1 } },
      { c: { "Civilian Software": 6, "Military Software": 2, "Graphics Card": 1 } },
    ] },
    { id: "micro", name: "Microelectronics", levels: [
      { d: "Basic Electronics Bench", c: { "Soldering Iron": 1, "Multimeter": 1, "Toolset": 1, "Power Supply": 1, "Wood": 1 } },
      { c: { "Soldering Iron": 1, "Multimeter": 1, "Power Supply": 1, "Oscilloscope": 1, "Electrical Parts": 4 } },
      { cash: 35000, c: { "Microscope": 1, "Multimeter": 1, "Circuit Board": 2, "Power Supply": 1, "Oscilloscope": 1, "Electrical Parts": 5 } },
    ] },
    { id: "mach", name: "Machine Tools", levels: [
      { d: "Manual Tooling Rig", c: { "Wood": 1, "Steel": 1, "Toolset": 1 } },
      { c: { "Steel": 3, "Mechanical Parts": 2, "Electrical Parts": 1, "Tooling Coolant": 1, "CNC Drill Bits": 1 } },
    ] },
    { id: "rf", name: "RF Sensor", levels: [
      { d: "Signal Diagnostics Bench", c: { "Wood": 1, "Steel": 1, "Electrical Parts": 1, "Signal Generator": 1, "Soldering Iron": 1 } },
      { cash: 30000, c: { "Steel": 6, "Mechanical Parts": 2, "Electrical Parts": 4, "Signal Generator": 1, "Oscilloscope": 1, "Laser Tube": 1 } },
    ] },
    { id: "wstor", name: "Storage Equipment (Workshop)", levels: [
      { d: "Salvaged Wooden Crate", c: { "Wood": 1, "Mechanical Parts": 1 } },
      { c: { "Steel": 9, "Mechanical Parts": 3 } },
      { cash: 30000, c: { "Steel": 12, "Mechanical Parts": 6, "Stainless Steel Sheet": 4 } },
    ] },
  ] },
];

// The first 12 steps follow the GamesHorizon guide. The rest goes from cheap to expensive.
const ORDER = ["gen:1", "heat:1", "ext:1", "react:1", "filt:1", "glass:1", "ana:1", "hw:1", "sw:1", "micro:1", "mach:1", "wstor:1",
  "lstor:1", "vent:1", "rf:1", "gen:2",
  "heat:2", "ext:2", "react:2", "filt:2", "glass:2", "lstor:2", "ana:2", "vent:2",
  "wstor:2", "mach:2", "hw:2", "sw:2", "micro:2", "rf:2",
  "heat:3", "react:3", "lstor:3", "hw:3", "micro:3", "wstor:3"];

const RANKS = { labRat: "Lab Rat rank 2", artisan: "Artisan rank 2" };

// Levels that need another level first. The Oil Tank, filter and PH Meter come from GamesHorizon;
// the powered stations need the Generator, according to Worldeka.
const REQUIRES = {
  "ext:1": ["heat:1"],
  "filt:1": ["ext:1"],
  "ana:1": ["glass:1", "gen:1"],
  "lstor:1": ["gen:1"],
  "vent:1": ["gen:1"],
  "hw:1": ["gen:1"],
  "rf:1": ["gen:1"],
};

// Short names shown on inventory items in-game. Seen on real inventory screens, except MParts (player report).
const SHORT_NAMES = {
  "Electrical Parts": "EParts",
  "Plumbing Parts": "PParts",
  "Mechanical Parts": "MParts",
  "Motor Oil": "MOil",
  "Fabrics": "Fab",
  "Circuit Board": "PCB",
  "Graphics Card": "GPU",
  "Power Supply": "PSU",
  "Analog Indicator": "AInd",
  "Soldering Iron": "SIron",
  "Civilian Software": "CivSoft",
  "Motherboard": "MBoard",
  "PC Fan": "Fan",
  "Laboratory Flask": "Flask",
  "Construction Materials": "Construction Mat",
};

// at: map coordinates as shown in-game. pos: rough position when no exact one is known, used only for distance.
// everywhere: a type of place found all over the map. src: where the location comes from.
const LOCS = {
  crate: { name: "Building Material Crates", everywhere: true, tip: "Rectangular wooden crates with blue stripes. Contents vary from crate to crate.", src: ["horizon", "vortex"] },
  supply: { name: "Northern Reach, Supply Yard", at: "170 153", tip: "Blue workbench in the maintenance building, the shelf next to it, the offices, and the crate by the green containers.", src: ["tpose", "vortex"] },
  market: { name: "Small Marketplace", at: "181 121", tip: "Wood on the ground under the small green stilt house, next to a blue plastic bin.", src: ["tpose", "player"] },
  farm: { name: "Thavieng Farm", at: "152 130", tip: "Crate against the metal fence behind the house. Guide reports two enemies outside and one inside.", src: ["tpose", "vortex"] },
  site: { name: "Construction Site", at: "150 168", tip: "Several blue-striped crates.", src: ["tpose", "horizon"] },
  hunter: { name: "Hunter's Paradise", at: "160 168", tip: "East side of the motel garage, pickup truck beds, and the shack between the living quarters and the range. Approach from the north-east past the ATM.", src: ["tpose", "ingame"] },
  midnight: { name: "Midnight Sapphire", at: "172 167", tip: "Upper-floor supply closets in the main hotel.", src: ["tpose", "ingame"] },
  outskirts: { name: "Tiger Bay outskirts", pos: [195, 127], tip: "Trade Depot, Wrecking Yard, commercial warehouse and the remote farms.", src: ["worldeka"] },
  casino: { name: "Casino Site", pos: [143, 171], tip: "Scaffolding and unfinished buildings near the Crimson Shield base.", src: ["worldeka"] },
  drugcamps: { name: "Drug camps", everywhere: true, tip: "Guard posts and the buildings around them.", src: ["worldeka"] },
  namsite: { name: "Construction Site, Nam Thaven", at: "171 118", tip: "A named spot on the map. Parts are expected from the type of place, not confirmed yet.", src: ["ingame"] },
  namwarehouse: { name: "Warehouse, Nam Thaven", at: "172 118", tip: "A named spot on the map. Parts are expected from the type of place, not confirmed yet.", src: ["ingame", "wiki"] },
  lumberyard: { name: "Lumberyard, Nam Thaven", at: "172 120", tip: "A named spot on the map. Parts are expected from the type of place, not confirmed yet.", src: ["ingame"] },
  gasstation: { name: "Gas Station, Nam Thaven", at: "171 121", tip: "Guides name gas stations for Motor Oil.", src: ["ingame", "worldeka"] },
  carrepair: { name: "Car Repair Shop, Nam Thaven", at: "171 118", tip: "Guides name repair shops for Motor Oil.", src: ["ingame", "vortex"] },
  namgarages: { name: "Garages east of Nam Thaven", at: "179 118 · 186 122", tip: "Garage and Abandoned Garage on the map. Parts are expected from the type of place.", src: ["ingame", "wiki"] },
  doctor: { name: "Doctor's Office, Nam Thaven", at: "170 116", tip: "A named spot on the map. Parts are expected from the type of place.", src: ["ingame", "wiki"] },
  restaurant: { name: "Restaurant south of Nam Thaven", at: "173 113", tip: "Guides name kitchens for Burner Heads and Refrigerant.", src: ["ingame", "vortex"] },
  townhall: { name: "Town Hall, Nam Thaven", at: "170 119", tip: "A named spot on the map. Parts are expected from the type of place.", src: ["ingame", "wiki"] },
  farms: { name: "Farms around Nam Thaven", at: "168 121 · 167 123 · 157 121 · 157 118 · 160 118 · 182 120", tip: "Farm, Soukaphone Farm, Chantavong Farms, Vacant Farm, Remote Farms and Na Noy Farm. A guide finds farmsteads good for Wood.", src: ["ingame", "tpose"] },
  sheds: { name: "Roadside sheds", at: "188 124 · 192 123", tip: "Named spots on the map. Parts are expected from the type of place.", src: ["ingame"] },
  camps: { name: "Campsites, abandoned or trashed", at: "148 136 · 177 163 · 187 153", tip: "Tents and tables. CPUs sometimes sit on broken CRT monitors. There are many more campsites than these three.", src: ["vortex", "worldeka", "player"] },
  mall: { name: "Tiger Bay Mall, 2nd floor", at: "199 129", tip: "The PC World store.", src: ["tpose", "worldeka"] },
  lantel: { name: "Lantel Office, Tiger Bay", pos: [198, 129], tip: "South of the mall. Locked locker room; the code is in the office next to it.", src: ["worldeka"] },
  lab: { name: "Tiger Bay HQ, laboratory", pos: [198, 129], tip: "Several pieces of lab equipment in one room.", src: ["vortex"] },
  ybl: { name: "YBL-1", at: "143 122", tip: "Dark inside, so bring a flashlight. The generator room has a keypad that a hacking tool can bypass.", src: ["tpose", "player"] },
  fort: { name: "Fort Narith, Airfield Old Entrance", at: "145 126", tip: "Crates near the old entrance, and a workbench in the fuel storage shed on the south-east side. Military base, expect heavier resistance.", src: ["tpose", "vortex"] },
  nakasa: { name: "Nakasa Village", pos: [140, 135], tip: "North of Fort Narith. Blue-striped crate in the fenced storage yard.", src: ["tpose"] },
  banl: { name: "Ban Langphou", at: "152 168", tip: "Blue-striped crate inside the house.", src: ["tpose"] },
  banpa: { name: "Ban Pa", at: "206 137", tip: "Blue crates, and materials on the ground in the courtyard house at LZ Oscar 2.", src: ["treyex"] },
  papa: { name: "Construction site north of LZ Papa 1", pos: [180, 163], src: ["tpose"] },
  nony: { name: "Nony Village", at: "154 163", tip: "Crates and open car trunks.", src: ["tpose", "vortex"] },
  ware: { name: "Military Warehouse", at: "137 151", tip: "North of LZ Delta 4. Guarded by LAF soldiers.", src: ["tpose", "horizon"] },
  hut: { name: "Old Hut", pos: [134, 139], tip: "North of LZ Delta 4, north-west of Fort Narith. Crate under the front overhang. Guide reports no enemies.", src: ["tpose"] },
  pha: { name: "Pha Lang Airfield", at: "179 160", tip: "Low enemy activity but less loot, according to one guide.", src: ["tpose", "vortex"] },
  saw: { name: "Sawmill", at: "139 145", src: ["wiki", "ingame"] },
  cement: { name: "Cement Factory, Tiger Bay", pos: [198, 129], src: ["horizon", "wiki"] },
  kitchen: { name: "Kitchens", everywhere: true, tip: "Restaurants and houses: stovetops and counters.", src: ["vortex", "worldeka"] },
  garage: { name: "Garages, gas stations, workshops", everywhere: true, src: ["vortex", "worldeka", "wiki"] },
  office: { name: "Offices, server rooms, comms buildings", everywhere: true, src: ["wiki"] },
  clinic: { name: "Clinics, pharmacies, laboratories", everywhere: true, src: ["wiki"] },
  drug: { name: "Drug huts", everywhere: true, src: ["wiki"] },
};

// Each entry is "location:confidence". r = a guide or player names this spot, t = type of place only, g = educated guess with no source.
const WHERE = {
  "Steel": ["crate:r", "site:r", "hunter:r", "hut:r", "pha:r", "namsite:t", "outskirts:t", "casino:t", "drugcamps:t", "cement:t"],
  "Wood": ["farm:r", "hut:r", "saw:r", "nony:r", "market:r", "site:r", "lumberyard:t", "farms:t", "outskirts:t"],
  "Plastics": ["crate:r", "nakasa:r", "banl:r"],
  "Construction Materials": ["crate:r", "market:r", "site:r", "hunter:r", "banpa:r", "namsite:t", "lumberyard:t", "casino:t", "drugcamps:t", "saw:t"],
  "Fabrics": ["papa:r", "site:r", "crate:g"],
  "Glass": ["fort:r", "site:r", "crate:t", "namsite:t", "outskirts:t"],
  "Copper": ["camps:r", "ybl:r"],
  "Plumbing Parts": ["market:r", "farm:r", "site:r", "ybl:r", "fort:r", "namwarehouse:t", "farms:t", "cement:t"],
  "Mechanical Parts": ["crate:r", "supply:r", "market:r", "site:r", "namwarehouse:t", "carrepair:t", "namgarages:t", "cement:t"],
  "Electrical Parts": ["camps:r", "mall:r", "namgarages:t", "garage:t"],
  "Stainless Steel Sheet": ["crate:r", "supply:r"],
  "Fine Metal Mesh": ["crate:r", "supply:r", "site:r", "fort:r"],
  "Silicone Sealant": ["supply:r", "site:r"],
  "Water Pump": ["crate:r", "market:r"],
  "Motor Oil": ["supply:r", "nony:r", "gasstation:t", "carrepair:t", "namgarages:t", "namwarehouse:t", "garage:t"],
  "Dynamo": ["supply:r", "ybl:r", "hunter:r", "fort:r", "midnight:r", "ware:r", "pha:r", "carrepair:g"],
  "Burner Head": ["kitchen:r", "ybl:r", "fort:r", "restaurant:t"],
  "Refrigerant": ["kitchen:r", "hunter:r", "fort:r", "restaurant:t"],
  "Chemicals": ["clinic:t", "drug:t", "ybl:t", "doctor:t"],
  "Circuit Board": ["office:t", "townhall:t", "fort:t", "ybl:t"],
  "Motherboard": ["camps:r", "mall:t", "lantel:t"],
  "Graphics Card": ["camps:r", "mall:t", "lantel:t"],
  "CPU": ["camps:r", "mall:t", "lantel:t"],
  "RAM": ["camps:r", "office:t", "townhall:t"],
  "Power Supply": ["camps:r", "office:t", "townhall:t"],
  "PC Fan": ["camps:r"],
  "Civilian Software": ["mall:r", "camps:r", "office:t"],
  "Military Software": ["fort:t", "ybl:t", "hunter:t", "pha:t"],
  "Server CPU": ["office:g", "fort:g", "ybl:g"],
  "Toolset": ["garage:t", "carrepair:t", "namgarages:t", "sheds:t"],
  "Soldering Iron": ["garage:g", "office:g"],
  "Multimeter": ["garage:g", "office:g"],
  "Oscilloscope": ["office:g", "fort:g", "ybl:g"],
  "Signal Generator": ["camps:t", "office:g"],
  "Microscope": ["lab:r"],
  "Laser Tube": ["lab:r"],
  "Mechanical Pipette": ["lab:r"],
  "Laboratory Flask": ["clinic:t", "doctor:t", "lab:g"],
  "Complex Glass Electrode": ["lab:g", "clinic:g", "doctor:g"],
  "Zinc Electrode": ["lab:g", "clinic:g"],
  "Vapor Lamp": ["lab:g", "clinic:g"],
  "Crystal Prism": ["lab:g"],
  "HEPA Filter": ["clinic:g", "lab:g"],
  "Analog Indicator": ["garage:g", "supply:g"],
  "Tooling Coolant": ["cement:g", "garage:g"],
  "CNC Drill Bits": ["cement:g", "garage:g"],
};
