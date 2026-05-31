# goat.bridge

Bidirectional Matrix bridge for [goat.computer](https://goat.computer).

## Architecture

```
┌──────────────┐   appservice    ┌──────────────┐   playwright    ┌──────────────┐
│ Matrix       │ ◀────────────▶  │ goat.bridge  │ ◀────────────▶  │ goat.computer│
│ homeserver   │   (HTTP / AS)   │ (Node + TS)  │ (headless web)  │              │
└──────────────┘                 └──────────────┘                 └──────────────┘
```

- **Matrix side** uses [`matrix-appservice-bridge`](https://github.com/matrix-org/matrix-appservice-bridge) so the bridge can puppet ghost users (`@goat_<name>:domain`) for everyone speaking on goat.computer.
- **goat.computer side** uses [Playwright](https://playwright.dev) because goat.computer exposes no public API. The bridge logs in, polls the rendered DOM for new messages, and types into the composer for outbound ones.

## Status

This is a working scaffold. The Matrix half is wired end-to-end. The Playwright client (`src/goat-client.ts`) has placeholder DOM selectors that need to be replaced with real ones once you inspect the live site — search the file for `TODO`.

## Setup

```bash
npm install
npx playwright install chromium

cp config/config.sample.yaml config/config.yaml
# edit config.yaml with your homeserver, goat creds, and room map

npm run gen-registration       # writes config/registration.yaml
# then register that file with your Synapse / Dendrite homeserver

npm run build && npm start
```

## What's stubbed and needs your input

`src/goat-client.ts` contains `TODO` markers where goat.computer-specific DOM details are required:

1. **Login flow** — the form selectors (`input[name="username"]` etc.) are guesses.
2. **Auth check** — `isLoggedIn()` looks for `[data-testid="user-menu"]`; replace with a real authed-only element.
3. **Channel navigation** — `/channels/<name>` is assumed; real URL pattern may differ.
4. **Composer** — `[data-testid="composer"]` is a placeholder.
5. **Message polling** — `[data-testid="message"]` and its children are placeholders. If goat.computer exposes a websocket, intercepting it via `page.on('websocket', ...)` is much cheaper than polling.

## Layout

```
src/
  index.ts        # Cli entrypoint (matrix-appservice-bridge)
  bridge.ts       # Matrix ↔ goat event routing
  goat-client.ts  # Playwright-driven goat.computer client
  config.ts       # YAML config loader
  logger.ts       # winston logger
config/
  config.sample.yaml
  config.schema.yaml
```
