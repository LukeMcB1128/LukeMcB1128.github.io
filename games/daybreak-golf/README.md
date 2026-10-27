# Daybreak Golf

A local golf game in a TypeScript monorepo. The client uses Vite. The server uses Node.js and SQLite.

Requires Node.js 22.13 or later and npm 10 or later.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. The API runs on port 3001.

```sh
npm test
npm run build
npm start
```

After a build, `npm start` serves the site and the API at http://127.0.0.1:3001.

## GitHub Pages

The Pages build runs at `https://lukemcb1128.github.io/daybreak-golf/`. It uses browser storage only. It does not connect to the SQL server, create a backup key, or retry API requests. Clearing site data removes saved scores. Scores from localhost do not transfer to the hosted site.

```sh
npm run build:pages
npm run preview:pages
```

Open `http://127.0.0.1:4173/daybreak-golf/` to test the static build. Publish the contents of `apps/web/dist` under `/daybreak-golf/`. The home link, scripts, styles, and fonts use this path.

For a separate repository named `daybreak-golf`, select **GitHub Actions** in **Settings → Pages**. The included `.github/workflows/pages.yml` builds, tests, and deploys the game on a push to `main`.

For the existing `LukeMcB1128.github.io` site, keep the game source in `games/daybreak-golf`. Use `deployment/existing-site.yml` as the host repository's `.github/workflows/deploy.yml`. It builds the blog, uses Node.js 22 to test and build the game, then copies the game into `out/daybreak-golf` before the existing Pages upload step. The blog output stays at the root of `out`.

`npm run check:pages` checks that built asset paths use `/daybreak-golf/` and that the client bundle has no SQL backup endpoint or retry messages.

## Play

1. Check the club and aim. The game selects a club and points toward the hole after each shot. You can select another club or point on the course.
2. Select **Start swing**, or focus the course and press Space.
3. The meter moves between 1% and 100% power. Press again to lock the power.
4. The same meter changes to aim. The line moves left and right around your target. Press again to lock the visible line and shoot.

The center band in the aim step gives a straight shot. Locking to the left or right changes the shot direction. The power stays at the value you locked. There is no random shot error or extra distance loss from aim timing. Power above 85%, rough, and sand narrow the straight aim band. Drivers have a larger aim swing than irons. The putter has a slower meter and a smaller aim swing.

The power meter shows a suggested power marker for the distance and selected club. This is an estimate. Wind, terrain, and green speed can change the final distance. The dotted line on the course shows the current aim and estimated distance. Wind does not affect a putt.

Use Left and Right to change the starting aim before a swing. Press Escape to cancel either meter step without a stroke. If you hide the page during a swing, the game cancels it. A ball must enter the cup at low speed. A fast approach can pass across the cup, so use a controlled putt.

- Daily mode has 18 holes and a par of 72. The date in UTC sets the course seed. A new course starts at 00:00 UTC. You can resume the daily round.
- Infinite mode has a new random 18-hole course for each round. After hole 18, select **Play a new course** to continue.
- Rough reduces shot distance by 28%. Sand reduces it by 52%.
- Water and out-of-bounds shots add one penalty stroke. The ball returns to the previous position.
- Green speed changes ball roll. Trees mark rough. They do not block shots.
- A hole has a 16-stroke limit. After eight strokes, you can pick up the ball for a score of 16.
- **My rounds** shows saved rounds. You can resume an incomplete round or view a completed scorecard.
- Sound is optional and starts off.

## Links courses

New courses use links-style layouts: straight short holes, doglegs, L-shaped holes, and double doglegs. The generator varies their control points and direction. Fairways have narrow sections and wider landing areas. Pot bunkers guard the sides of landing areas and green approaches. Dunes replace the trees. Some holes have water along the coast.

Hole yardage follows the full fairway route. The distance to the pin is the direct distance from the ball. On a dogleg, these distances differ. You can follow the fairway or try to cut the corner. Dunes use the normal rough rules and do not add hidden obstacles.

Select **New links course** to start a new infinite round with this generator. Saved rounds keep their original course version, so an update does not move the ball or change the holes in an existing round. New daily rounds use the new generator.

## Data storage

The browser saves each shot and each completed hole in local storage. The server backs up each round in `data/golf.db`. SQLite uses WAL mode. Local database files are excluded from Git.

The browser has a random player key. The API uses that key to separate round data. On page load, the client merges local and server data. It keeps the most recent copy of each round. If the API is unavailable, the game continues with local storage and tries the backup again every 30 seconds. The footer shows the save status.

If you remove only `daybreak.rounds.v1` from local storage, the server can restore the rounds. If you remove `daybreak.player.v1`, the browser loses access to its previous backup key. This local app has no account or password system. It listens on `127.0.0.1`. Do not expose it as a public score service without adding authentication and server-side score checks.

Use `PORT` to change the API port. Use `GOLF_DB` to set an absolute database path. If you change the API port during development, also change the proxy target in `apps/web/vite.config.ts`.

## Project layout

| Path | Purpose |
| --- | --- |
| `apps/web` | Vite client, TypeScript controls, and Canvas 2D course graphics |
| `apps/server` | Node.js HTTP API, SQLite storage, and built-site server |
| `packages/game` | Shared types, seeded course generator, shot physics, and score rules |
| `tests` | Game rules, course generation, and SQLite API tests |

The client includes its fonts. No remote font service, game service, or API key is required.

## Checks

`npm run check` checks TypeScript. `npm test` checks course seeds, safe tees and greens, shot distance, terrain, wind, penalties, putting, all 18 hole transitions, input validation, player data separation, and SQLite recovery after a server restart. `npm run build` checks TypeScript and creates the production client.

Node.js 22 can show an experimental-feature message for its built-in SQLite module. The server uses this module to avoid a separate database service or native build step.
