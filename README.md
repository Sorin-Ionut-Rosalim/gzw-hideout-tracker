# GZW Hideout Tracker

A small page for Gray Zone Warfare players: what to build next in the hideout, which parts you are missing, and where players report finding them.

**Fan project, not affiliated with or endorsed by MADFINGER Games.** Gray Zone Warfare and its content belong to their owners.

## Features

- All 36 hideout levels with parts and cash costs
- A suggested build order, or pick your own next build
- Missing parts for the next build, the next 5, or the whole hideout
- Possible locations and coordinates for each part, with sources and a confidence mark
- Pick your faction to sort locations by distance from your base
- Everything saved automatically in your browser, with export, import and delete

There is no map on purpose: we have no permission to host one. Coordinates match the in-game grid, so you can look them up in-game or on [GZW Tac Map](https://gzwtacmap.com/maps/lamang).

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

Most corrections only touch `data.js`. After changing `data.js`, `app.js` or `styles.css`, raise the `?v=` number in `index.html`, so browsers load the new files together.

## Data sources

Costs come from [GZW Items](https://gzwitems.com/hideout), which describes its data as open and free to use. Locations are summarized from the guides listed on the page's About tab, plus player reports. Levels marked "verified in-game" were checked directly.

## License

The code is under the [MIT License](LICENSE). The license does not cover the game's names or content, or data from the sources above.
