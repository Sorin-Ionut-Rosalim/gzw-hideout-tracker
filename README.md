# GZW Hideout Tracker

A small page for Gray Zone Warfare players: what to build next in the hideout, which parts you are missing, and where players report finding them.

**Fan project, not affiliated with or endorsed by MADFINGER Games.** Gray Zone Warfare and its content belong to their owners.

## Features

**[Open the tracker](https://sorin-ionut-rosalim.github.io/gzw-hideout-tracker/)**

- All 36 hideout levels with parts and cash costs
- A suggested build order, or pick your own next build
- Log loot in seconds, with suggestions for full names or the short names shown in-game
- See what is ready to build now and what is almost there
- Missing parts for the next build, the next 5, or the whole hideout, and a raid list to copy to your squad
- Possible locations and coordinates for each part, with sources and a confidence mark
- Pick your faction to sort locations by distance from your base
- Untick vendor ranks you lack, and locked rooms move to the end
- Undo after building or logging, light and dark themes, works offline after the first visit
- Everything saved automatically in your browser, with export, import and delete

The Map tab uses in-game screenshots with session icons removed, loads detail only for the part on screen, and shows only the places in this tracker. The map belongs to MADFINGER Games and will be removed if they ask. Coordinates match the in-game grid, so you can also use them in-game or on [GZW Tac Map](https://gzwtacmap.com/maps/lamang).

## Corrections

Costs and locations change with patches. Please open an issue:

- [Report a location](../../issues/new?template=location.yml)
- [Report a wrong cost](../../issues/new?template=cost.yml)

Please send only what you saw in-game or a source you can link. Do not paste data copied from other sites without their permission.

## Code

No build step and no dependencies. Open `index.html` in a browser, or serve the folder with any static server.

| File | Purpose |
|---|---|
| `data.js` | All game data: costs, build order, locations, sources |
| `app.js` | Logic and rendering, with progress stored in `localStorage` |
| `styles.css` | Styles, light and dark |
| `sw.js` | Offline support, network first |
| `tests/check-data.mjs` | Checks `data.js` for mistakes |

Run the data check with `node tests/check-data.mjs`.

Most corrections only touch `data.js`. After changing `data.js`, `app.js` or `styles.css`, raise the `?v=` number in `index.html`, so browsers load the new files together.

## Data sources

Costs come from [GZW Items](https://gzwitems.com/hideout), which describes its data as open and free to use. Locations are summarized from the guides listed on the page's About tab, plus player reports. Levels marked "verified in-game" were checked directly.

## License

The code is under the [MIT License](LICENSE). The license does not cover the game's names or content, or data from the sources above.
