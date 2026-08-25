# GENOME blog+shop → Wix Headless Astro port

## Context

`playground/genome-blog` is a personal tool ("Claude Design → Wix Astro
tooling") that deterministically converts Claude Design bundle exports into
native Astro+React Wix Headless projects via `tools/convert.mjs`.

`designs/genome-blog.html` in that repo is the source for **GENOME**: a
single-page 3D DNA-helix site (React + Three.js via `@react-three/fiber`/`drei`)
with a Blog/Shop toggle — glassy helix cells are Wix Blog posts in "blog"
mode, and morph into an orbital red-blood-cell cloud of Wix Store products
(with a real cart + checkout) in "shop" mode. It is currently published as a
**"connect brought-in static HTML"** Wix project (no build step) at
`https://dna-blog-w-e55a4151-kfirstri.wix-site-host.com`
(siteId `d1768de8-645d-4705-af99-a52a8a819985`, appId
`aeaf7384-b3da-41d1-ada2-2631e14141f1`).

`tools/convert.mjs` already ran against this exact file and declined it
(recorded in `review.md`): *"app builds a React tree imperatively
(createRoot/esm.sh/createElement) — imperative/hybrid design, convert
manually."* This spec covers that manual port into a proper Astro+React
project, plus getting it onto GitHub as a standalone repo.

## Goal

A new repo, `playground/genome-blog-astro`, containing a native Astro+React
Wix Headless project with full feature parity with the live site (blog +
shop + cart + checkout + the 3D helix), buildable with `wix dev`/`wix build`,
pushed to GitHub as `kfirstri/genome-blog-astro` (public).

Out of scope: moving the Wix Blog/Stores data-fetching from client-side to
server-side rendering (SEO/SSR improvements) — v1 preserves the existing
client-side anonymous-session fetch behavior as-is; that's a candidate
follow-up, not part of this port.

## What already exists (done as of this spec)

- `playground/genome-blog-astro/` scaffolded from `astro-template/`
  (`@wix/astro`, `@wix/astro-pages`, Cloudflare adapter, `wix.config.json`
  pointed at the live site's `appId`/`siteId`).
- `designs/genome-blog.html` exploded via `tools/unbundle.mjs` into
  `.unbundled/` (gitignored, local porting reference only):
  - `src/template.xdc.html` (182 lines) — the declarative HTML chrome
    (logo, blog/shop toggle, cart button, hint bar, loader, error state)
    with `{{ }}` bindings, `<sc-if>` conditionals, and `onclick="{{ fn }}"`
    handlers.
  - `src/app.js` (815 lines) — the actual app logic:
    - Wix integration block (`getWix`, `loadWixPosts`, `loadWixProducts`,
      `addToWixCart`, `getWixCart`, `removeWixCartItem`,
      `checkoutCurrentCart`, `ricosToHtml`) — all using a shared anonymous
      `OAuthStrategy` client, dynamically imported from esm.sh
      (`@wix/sdk@1`, `@wix/blog@1`, `@wix/stores@1`, `@wix/ecom@1`,
      `@wix/redirects@1`).
    - `class Component extends DCLogic` — the shell component. `DCLogic`
      (aka `StreamableLogic` in the bundler runtime) is a thin
      `React.Component` subclass with a `renderVals()` method instead of
      `render()`; the template's bindings are computed there. It holds
      `state = { ready, error, selected, mode, cart }`, boots in
      `componentDidMount`, and in `boot()` dynamically imports
      `three@0.160.1`, `react@18.2.0`/`react-dom@18.2.0`,
      `@react-three/fiber@8.15.19`, `@react-three/drei@9.99.0` from
      esm.sh, then does a **second, manual**
      `ReactDOMClient.createRoot(this.hostEl).render(...)` to mount the
      Three.js `Scene` — a separate React tree nested inside the outer
      template-driven one. `Scene` (defined inline in `boot()`) plus
      `Strand`, `Node`, `Rung`, `StarField`, `SkyDome`, `CloudLayer`,
      `PostCard`, `ProductCard`, `CartPanel` are the helix/scene pieces.
  - `assets/` — 6 files: Space Grotesk font subsets (`fonts/`), and
    `vendor/react.production.min.js` + `react-dom.production.min.js`
    (unused after the port — the bundler's own fallback copies).

## Port plan (`src/components/App.jsx`)

1. **Collapse the two React trees into one.** Convert
   `class Component extends DCLogic` into a normal
   `class App extends React.Component` (or a function component with
   hooks — implementer's call, but keep it a single component so state
   stays in one place). Give it a real `render()` that returns the JSX
   equivalent of `template.xdc.html`'s chrome, translating:
   - `{{ expr }}` → `{expr}`
   - `<sc-if value="{{ x }}">…</sc-if>` → `{x && (…)}`
   - `onclick="{{ fn }}"` → `onClick={fn}`
   - `ref="{{ x }}"` → a real `ref`
   Nest the Three.js `<Canvas>` (see next point) directly as a JSX child
   of that `render()`, in the `ref`'d host `<div>`'s place — **no manual
   second `createRoot` call**; Astro's island already owns one React root.
2. **Static imports, no esm.sh.** Replace every dynamic `import("https://
   esm.sh/...")` with a real npm dependency, pinned to the versions the
   design already uses (confirmed in `boot()`): `three@0.160.1`,
   `@react-three/fiber@^8.15.19`, `@react-three/drei@^9.99.0`,
   `@wix/sdk@^1`, `@wix/blog@^1`, `@wix/stores@^1`, `@wix/ecom@^1`,
   `@wix/redirects@^1`. React/react-dom come from the Astro project's own
   React integration (add `@astrojs/react` — not currently in
   `astro-template`).
3. **Preserve the documented Wix-integration gotchas exactly** (from the
   original `genome-blog` tool's `AGENTS.md`, carried over as comments in
   the ported code):
   - Use `posts.queryPosts({ fieldsets: [...] })` for post bodies, never
     `posts.getPost()` (CORS-blocked from the published origin).
   - The outer document needs the viewport `<meta>` tag present
     immediately (not injected late) or `useIsMobile()` misreads the
     width on first paint — Astro's own `Layout.astro` head already has
     this, so just confirm it's not stripped.
   - Keep `usePanelScrollTrap()` (wheel/touch/pointer `stopPropagation`)
     on the reader/product/cart panels so scrolling them doesn't
     orbit/zoom the 3D scene.
4. **CSS + assets.** Move `template.xdc.html`'s two `<style>` blocks
   (font-face declarations + base/keyframes/media-query CSS) into
   `src/styles/global.css`; copy `assets/fonts/*.woff2` into
   `src/assets/fonts/` (or `public/fonts/`) and fix the `url(...)` paths.
   Drop `assets/vendor/*` (unused once real npm React is in place) and
   `assets/dc-runtime.js` (the bundler shell runtime — not needed).
5. **Wire the Astro page.** `src/pages/index.astro` imports `Layout`,
   `global.css`, and renders `<App client:load />` (same pattern
   `convert.mjs` uses for its automated conversions).

## Wix connection

- Reuses the **existing live site** (`appId`/`siteId` above) rather than
  provisioning a new one.
- The live site is currently a "connect brought-in static HTML" project
  (`frontendBuild: none`, `site.outputDirectory: "./"`). Moving to an Astro
  build changes how `wix build`/`wix release` deploy it — the exact
  CLI/dashboard step to flip a site's frontend-build tool needs to be
  confirmed during implementation (wix-headless skill / Wix docs), it
  isn't guessed here.
- **The live deployment is not touched until it's ready.** All work happens
  via `wix dev` (local) until the ported app is verified to match the live
  site's behavior; only then does the user decide when/whether to run
  `wix build && wix release` and cut the live site over.

## Git / GitHub

- `git init` in `playground/genome-blog-astro`, `.gitignore` mirrors
  `cookie-store`'s (`.wix/`, `dist/`, `.astro/`, `node_modules/`, `.env*`,
  `.DS_Store`) plus `.unbundled/` (the local porting reference — not
  meant to ship in the final repo).
- Initial commit: the scaffolded template. Second commit: this spec.
- `gh repo create kfirstri/genome-blog-astro --public`, push `main`.

## Verification

- `npm install`, `npx wix env pull` (provides `WIX_CLIENT_ID` for the
  connected site), `wix dev` — confirm in a browser:
  - Blog mode: helix renders one node per published post (21 expected),
    clicking a node opens the full rich-content reader.
  - Shop mode: toggle morphs to the RBC cloud, one node per product (12
    expected), clicking opens the product card, "Add to cart" updates the
    cart badge, cart panel lists/removes items, checkout redirects to
    Wix's hosted checkout.
  - Mobile viewport (< 720px wide): header collapses to the documented
    layout, cards dock as bottom sheets.
  - Console shows the `[Genome] …` diagnostic logs with real counts, no
    fetch/CORS errors.
- Only after that passes: decide on and execute the live-site cutover
  (separate, explicit step — not part of this port's definition of done).
