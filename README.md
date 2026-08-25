# Wix CLI headless Astro template

Minimal base for a converted Claude Design. Ships `@astrojs/react` (React islands),
the Wix server adapter, and the standard `wix dev` / `wix build` / `wix release` scripts.

`convert.mjs` scaffolds a project from this folder and drops in the converted design:
`src/pages/index.astro`, `src/components/App.jsx`, `src/styles/global.css`, and `public/fonts/`.

## After generating
1. `npm install`
2. Fill `wix.config.json` with your `appId` / `siteId` (or connect via the Wix CLI).
3. `wix dev` to run locally; `wix build && wix release` to publish.
