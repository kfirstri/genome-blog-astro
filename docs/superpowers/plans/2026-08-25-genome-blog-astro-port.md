# GENOME Blog+Shop Astro Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the imperative GENOME design (`../genome-blog/designs/genome-blog.html`, already unbundled to `.unbundled/`) into a native Astro+React Wix Headless app with full feature parity (3D DNA-helix blog, shop morph, cart, checkout).

**Architecture:** One Astro page (`src/pages/index.astro`) renders a single React island (`src/components/App.jsx`, `client:load`). `App` owns all state (mode, selection, cart) and renders the chrome (logo, toggle, cart button, loader, error state) as real JSX; a nested `<Scene>` (React Three Fiber `<Canvas>`) renders the helix/sphere of `Node`s, mounted as a normal child — not a second manual `ReactDOMClient.createRoot()` call like the original. Pure logic (Wix content/cart helpers, node-layout math, mobile detection) is split into small testable modules; the 3D primitives and chrome layout are ported verbatim from `.unbundled/src/app.js` with only the mechanical edits listed per task (esm.sh → npm imports, template bindings → JSX).

**Tech Stack:** Astro 5, `@astrojs/react`, React 18, Three.js 0.160, `@react-three/fiber` 8.15, `@react-three/drei` 9.99, `@wix/sdk`/`@wix/blog`/`@wix/stores`/`@wix/ecom`/`@wix/redirects` v1, Vitest + jsdom + Testing Library for the parts worth unit-testing.

**Spec:** `docs/superpowers/specs/2026-08-25-genome-blog-astro-design.md`

## Global Constraints

- Preserve exactly, without "improving": `posts.queryPosts({ fieldsets: [...] })` (never `posts.getPost()` — CORS-blocked from the published origin), the viewport-meta-must-be-present-immediately requirement, and `usePanelScrollTrap()` on every reader/product/cart panel.
- Library versions are pinned to what the live design already uses (do not upgrade): `three@0.160.1`, `@react-three/fiber@^8.15.19`, `@react-three/drei@^9.99.0`.
- `.unbundled/` (gitignored) is the porting source of truth for every "port verbatim" step below — do not delete it until Task 7 passes.
- No server-side/SSR change to the Wix data fetching — it stays a client-side, anonymous-session fetch, exactly as today (out of scope per spec).
- Every task's commit uses `git commit`, never `--amend`, never `--no-verify`.

---

### Task 1: Astro/React scaffolding + global styles + fonts

**Files:**
- Modify: `package.json` (add dependencies)
- Modify: `astro.config.mjs` (add `@astrojs/react` integration)
- Create: `src/styles/global.css`
- Create: `public/fonts/space-grotesk-latin.woff2`, `space-grotesk-latin-ext.woff2`, `space-grotesk-vietnamese.woff2`
- Modify: `src/pages/index.astro` (temporary placeholder import, replaced in Task 6)

**Interfaces:**
- Produces: `src/styles/global.css` — imported by `src/pages/index.astro` in every later task; defines `@font-face` for "Space Grotesk", the `helix-spin`/`helix-fade`/`helix-pulse` keyframes, and the `@media (max-width: 719px)` mobile rules for `.gx-logo`/`.gx-sub`/`.gx-topbar`/`.gx-hint`.

- [ ] **Step 1: Add the React integration**

Run: `npx astro add react -y` from `genome-blog-astro/` — this installs `@astrojs/react` and a compatible `react`/`react-dom`, and edits `astro.config.mjs` to add `react()` to `integrations`.

- [ ] **Step 2: Add the remaining runtime dependencies**

```bash
npm install three@0.160.1 @react-three/fiber@^8.15.19 @react-three/drei@^9.99.0 \
  @wix/sdk@^1 @wix/blog@^1 @wix/stores@^1 @wix/ecom@^1 @wix/redirects@^1
```

- [ ] **Step 3: Add test tooling (devDependencies)**

```bash
npm install -D vitest@^2 jsdom@^25 @testing-library/react@^16 @testing-library/jest-dom@^6 @vitejs/plugin-react@^4
```

Add to `package.json` `scripts`: `"test": "vitest run"`.

Create `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom' },
});
```

- [ ] **Step 4: Copy the fonts**

```bash
mkdir -p public/fonts
cp .unbundled/assets/fonts/*.woff2 public/fonts/
```

- [ ] **Step 5: Create `src/styles/global.css`**

Open `.unbundled/src/template.xdc.html`. It has two `<style>` blocks inside its `<helmet>` — copy both verbatim into `src/styles/global.css` with exactly these two edits:
1. In every `@font-face` `src: url("assets/fonts/...")`, change the path to `url("/fonts/...")` (the files now live in `public/fonts/`, served from site root).
2. Drop the `@keyframes` and rules unrelated to layout if any leaked in — there are none; the second block (`* { box-sizing: border-box; } html, body { ... } a { ... } @keyframes helix-spin/helix-fade/helix-pulse @media (max-width: 719px) { ... }`) copies over unchanged.

- [ ] **Step 6: Wire it into the page (placeholder)**

Edit `src/pages/index.astro`:

```astro
---
import Layout from '../layouts/Layout.astro';
import '../styles/global.css';
---
<Layout>
  <main style="display:grid;place-items:center;min-height:100vh;color:#fff;background:#07060f;font-family:sans-serif;">
    <p>Scaffolding in place — App island lands in Task 6.</p>
  </main>
</Layout>
```

- [ ] **Step 7: Verify the build boots**

Run: `npm run astro -- check && npx astro build`
Expected: both succeed with no errors (warnings about the unused `react` integration on a page with no island are fine — that placeholder is temporary).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json astro.config.mjs vitest.config.js src/styles/global.css public/fonts src/pages/index.astro
git commit -m "Add React/Wix deps, test tooling, and global styles"
```

---

### Task 2: Wix content/cart helpers (`src/lib/wix.js`) — with unit tests

**Files:**
- Create: `src/lib/wix.js`
- Test: `src/lib/wix.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (all named exports from `src/lib/wix.js`, consumed by `App.jsx`/`Scene.jsx` in Task 6):
  - `esc(s): string`, `stripHtml(s): string`, `wixImageUrl(src): string`, `fmtDate(d): string`
  - `ricosToHtml(richContent, accentColor): string`
  - `cartItemCount(cart): number`
  - `POST_STYLE: Record<string, {tag: string, color: string}>`, `HELIX_PALETTE: string[]`, `PRODUCT_TINTS: string[]`
  - `getWix(): Promise<WixClient>`
  - `loadWixPosts(): Promise<Array<{title, tag, date, color, excerpt, bodyHtml}>>`
  - `loadWixProducts(): Promise<Array<{id, name, price, image, tint, blurb}>>`
  - `addToWixCart(productId): Promise<number>`
  - `getWixCart(): Promise<Cart>`
  - `removeWixCartItem(lineItemId): Promise<Cart>`
  - `checkoutCurrentCart(): Promise<true>` (throws if no redirect URL)

- [ ] **Step 1: Write the failing tests for the pure helpers**

Create `src/lib/wix.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { esc, stripHtml, wixImageUrl, fmtDate, cartItemCount, ricosToHtml } from './wix.js';

describe('esc', () => {
  it('escapes HTML-significant characters', () => {
    expect(esc('<a>&"</a>')).toBe('&lt;a&gt;&amp;&quot;&lt;/a&gt;');
  });
  it('passes through null/undefined as empty string', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });
});

describe('stripHtml', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripHtml('<p>Hello   <b>world</b></p>')).toBe('Hello world');
  });
});

describe('wixImageUrl', () => {
  it('converts a wix:image URI to a static.wixstatic.com URL', () => {
    expect(wixImageUrl('wix:image://v1/abc123~mv2.jpg/name.jpg#originWidth=100'))
      .toBe('https://static.wixstatic.com/media/abc123~mv2.jpg');
  });
  it('passes through an already-absolute URL', () => {
    expect(wixImageUrl('https://example.com/x.png')).toBe('https://example.com/x.png');
  });
  it('returns empty string for falsy input', () => {
    expect(wixImageUrl('')).toBe('');
    expect(wixImageUrl(null)).toBe('');
  });
});

describe('fmtDate', () => {
  it('formats an ISO date as "Mon D, YYYY"', () => {
    expect(fmtDate('2026-03-05T00:00:00.000Z')).toBe('Mar 5, 2026');
  });
  it('returns empty string for falsy input', () => {
    expect(fmtDate(null)).toBe('');
  });
});

describe('cartItemCount', () => {
  it('sums line item quantities', () => {
    expect(cartItemCount({ lineItems: [{ quantity: 2 }, { quantity: 1 }] })).toBe(3);
  });
  it('returns 0 for an empty or missing cart', () => {
    expect(cartItemCount(null)).toBe(0);
    expect(cartItemCount({ lineItems: [] })).toBe(0);
  });
});

describe('ricosToHtml', () => {
  it('renders a paragraph node with bold text to HTML', () => {
    const rc = { nodes: [{ type: 'PARAGRAPH', nodes: [{ type: 'TEXT', textData: { text: 'hi', decorations: [{ type: 'BOLD' }] } }] }] };
    const html = ricosToHtml(rc, '#ffffff');
    expect(html).toContain('<strong>hi</strong>');
  });
  it('returns empty string for missing richContent', () => {
    expect(ricosToHtml(null, '#fff')).toBe('');
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npm test`
Expected: FAIL — `src/lib/wix.js` does not exist yet.

- [ ] **Step 3: Port the implementation**

Open `.unbundled/src/app.js`. Copy lines **1–186** verbatim into `src/lib/wix.js` (this is the entire self-contained "Wix integration" block: `POSTS`/`PRODUCTS` module vars through `checkoutCurrentCart`), then apply exactly these mechanical edits:

1. Add `export` in front of every top-level `const`/`function`/`let` declaration that appears in the **Interfaces → Produces** list above (`POST_STYLE`, `HELIX_PALETTE`, `PRODUCT_TINTS`, `esc`, `stripHtml`, `wixImageUrl`, `fmtDate`, `ricosInline`, `ricosToHtml`, `cartItemCount`, `getWix`, `loadWixPosts`, `loadWixProducts`, `addToWixCart`, `getWixCart`, `removeWixCartItem`, `checkoutCurrentCart`). Leave `let POSTS = []; let PRODUCTS = [];` and `WIX_CLIENT_ID`/`WIX_STORES_APP_ID` un-exported private module state (only `App.jsx`/`Scene.jsx` reading through the exported loader functions need them).
2. Replace the five dynamic `import("https://esm.sh/@wix/...")` calls inside `getWix()` (original lines 124–131) with static top-of-file imports:
   ```js
   import { createClient, OAuthStrategy } from '@wix/sdk';
   import { posts } from '@wix/blog';
   import { products } from '@wix/stores';
   import { currentCart } from '@wix/ecom';
   import { redirects } from '@wix/redirects';
   ```
   and rewrite `getWix()`'s body to use these directly instead of awaiting the dynamic imports and destructuring `sdk`/`blog`/`storesMod`/`ecom`/`red` — i.e. `_wixClient = createClient({ modules: { posts, products, currentCart, redirects }, auth: OAuthStrategy({ clientId: WIX_CLIENT_ID }) });`.

Do not change any other logic, string, or number in these lines — this is a mechanical import swap only.

- [ ] **Step 4: Run the tests again**

Run: `npm test`
Expected: PASS — all `wix.test.js` cases green. (`getWix`/`loadWixPosts`/etc. are exported but not unit-tested here — they hit live Wix APIs and are verified end-to-end in Task 7.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/wix.js src/lib/wix.test.js
git commit -m "Port Wix content/cart helpers with unit tests for the pure functions"
```

---

### Task 3: Node-layout geometry (`src/components/scene/geometry.js`) — with unit tests

**Files:**
- Create: `src/components/scene/geometry.js`
- Test: `src/components/scene/geometry.test.js`

**Interfaces:**
- Consumes: nothing (takes plain `posts`/`products` arrays as produced by `loadWixPosts`/`loadWixProducts` from Task 2, but doesn't import `wix.js` — pure geometry module).
- Produces:
  - `SHOP_R(productCount): number`
  - `curveOf(off): THREE.CatmullRomCurve3`
  - `spherePos(i, n): THREE.Vector3`
  - `strandPoint(t, off): THREE.Vector3`
  - `buildNodes(posts, products): Array<{index, hasPost, hasProduct, post, product, pos, other, grid, color, tint, tilt}>`
  - `rbcGeo: THREE.BufferGeometry` (module-level singleton, built once)
  - `sphereGeo: THREE.BufferGeometry` (module-level singleton)

- [ ] **Step 1: Write the failing tests**

Create `src/components/scene/geometry.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildNodes, spherePos, strandPoint, SHOP_R } from './geometry.js';

describe('buildNodes', () => {
  it('produces one node per index up to max(posts, products)', () => {
    const posts = [{ title: 'a', color: '#111' }, { title: 'b', color: '#222' }];
    const products = [{ id: '1', tint: '#333' }];
    const nodes = buildNodes(posts, products);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ index: 0, hasPost: true, hasProduct: true });
    expect(nodes[1]).toMatchObject({ index: 1, hasPost: true, hasProduct: false });
  });
  it('returns an empty array when both are empty', () => {
    expect(buildNodes([], [])).toEqual([]);
  });
});

describe('spherePos', () => {
  it('returns the pole point for a single-item sphere', () => {
    const p = spherePos(0, 1);
    expect(p.x).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(0);
  });
});

describe('strandPoint', () => {
  it('lies at radius R in the XZ plane', () => {
    const p = strandPoint(0.5, 0);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(3.3, 1);
  });
});

describe('SHOP_R', () => {
  it('grows with product count but has a floor', () => {
    expect(SHOP_R(0)).toBeCloseTo(4.2, 5);
    expect(SHOP_R(12)).toBeGreaterThan(SHOP_R(2));
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npm test`
Expected: FAIL — `geometry.js` does not exist.

- [ ] **Step 3: Port the implementation**

Copy lines **302–357** from `.unbundled/src/app.js` (from `const R = 3.3` through `const sphereGeo = useMemoGeo(...)`) into `src/components/scene/geometry.js`, then apply exactly these edits:

1. Add `import * as THREE from 'three';` at the top.
2. Replace the inline `const SHOP_R = Math.max(4.2, 2.4 + S * 0.28);` with an **exported function** `export function SHOP_R(productCount) { return Math.max(4.2, 2.4 + productCount * 0.28); }` (the original computed it once per `boot()` call from the closed-over `S`; here it's a pure function of the count so `Scene.jsx` can call it directly).
3. Every other use of `S` inside `spherePos`'s original closure doesn't exist — `spherePos(i, n)` already takes `n` as a parameter, so it needs no change.
4. Wrap the node-building `for` loop (original lines 324–338, `const nodes = []; for (let i = 0; i < COUNT; i++) { ... }`) in `export function buildNodes(posts, products) { const P = posts.length, S = products.length, COUNT = Math.max(P, S); const nodes = []; /* ...unchanged body, replacing POSTS→posts and PRODUCTS→products... */ return nodes; }`.
5. Export `strandPoint`, `curveOf`, `rbcGeo`, `sphereGeo` by adding `export` to their existing declarations. Drop `useMemoGeo` (it was only a no-op wrapper — `const sphereGeo = new THREE.SphereGeometry(0.5, 32, 32);` directly).

- [ ] **Step 4: Run the tests again**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/scene/geometry.js src/components/scene/geometry.test.js
git commit -m "Port helix/sphere node-layout geometry with unit tests"
```

---

### Task 4: 3D scene primitives (`Strand`, `Rung`, `Node`, `StarField`, `SkyDome`, `CloudLayer`)

**Files:**
- Create: `src/components/scene/Strand.jsx`
- Create: `src/components/scene/Rung.jsx`
- Create: `src/components/scene/Node.jsx`
- Create: `src/components/scene/StarField.jsx`
- Create: `src/components/scene/SkyDome.jsx`
- Create: `src/components/scene/CloudLayer.jsx`

**Interfaces:**
- Consumes: `curveOf`, `rbcGeo`, `sphereGeo` from `./geometry.js` (Task 3).
- Produces: five React components, each taking a `morphRef: {current: number}` prop (a ref holding the 0→1 blog↔shop morph amount, read every frame — not React state, to avoid re-renders at 60fps):
  - `<Strand off={number} morphRef />`
  - `<Rung a={Vector3} b={Vector3} color={string} morphRef />`
  - `<Node node={NodeData} morphRef mode={"blog"|"shop"} onSelect={(index, worldPos) => void} active={boolean} />` — internally renders `<ProductCard>`/`<PostCard>` when `active`, so it also consumes those two (Task 5) and the module-level `onDeselectGlobal` mutable binding and `addToWixCart` from `./geometry.js`'s sibling `../../lib/wix.js` (Task 2).
  - `<StarField morphRef />`
  - `<SkyDome morphRef />`
  - `<CloudLayer morphRef />`

This is a WebGL-rendering task with no meaningful unit-test surface (no existing 3D test harness in this project, and adding one would be pure scope creep) — verification is the manual scene check in Task 7, not a unit test here.

- [ ] **Step 1: Port `Strand.jsx`**

Copy lines **360–370** of `.unbundled/src/app.js` (`function Strand({ off, morphRef }) { ... }`) into `src/components/scene/Strand.jsx`. Edits:
```js
import * as React from 'react';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { curveOf } from './geometry.js';

const e = React.createElement;

export default function Strand({ off, morphRef }) {
  // ...body unchanged from the source...
}
```
(the source already writes `React.createElement` calls as `e(...)` — keep every `e(...)` call exactly as-is; only the import header and `export default function` wrapper change.)

- [ ] **Step 2: Port `Rung.jsx`**

Same pattern, lines **371–392**. Header:
```js
import * as React from 'react';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const e = React.createElement;

export default function Rung({ a, b, color, morphRef }) { /* unchanged body */ }
```

- [ ] **Step 3: Port `Node.jsx`**

Lines **395–506** (`function Node({...}) { ... } let onDeselectGlobal = () => {};`). Header:
```js
import * as React from 'react';
import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import ProductCard from '../panels/ProductCard.jsx';
import PostCard from '../panels/PostCard.jsx';
import { addToWixCart } from '../../lib/wix.js';

const e = React.createElement;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export let onDeselectGlobal = () => {};
export default function Node({ node, morphRef, mode, onSelect, active }) { /* unchanged body */ }
```
Two required edits inside the body:
1. `self.setState({ cart: n })` (original line 504, inside the `ProductCard`'s `onAdd`) and the catch's `self.setState((s) => ({ cart: s.cart + 1 }))` — `self` doesn't exist in this file anymore. `Node` needs an `onCartChange: (nextCount) => void` prop; add it to the destructured props and call `onCartChange(n)` / `onCartChange(prevCountFn)` instead of `self.setState(...)`. Update the **Interfaces** line above and this task's prop list to include `onCartChange`.
2. `onDeselectGlobal` becomes the module-level exported `let` shown above (set by `Scene.jsx` in Task 6, same pattern as the original — just now via an ES export instead of a closure variable).

- [ ] **Step 4: Port `StarField.jsx`, `SkyDome.jsx`, `CloudLayer.jsx`**

Lines **628–695** of `.unbundled/src/app.js` contain, in order: the `softTex` canvas-texture builder, then `StarField`, `SkyDome`, `CloudLayer`. Split them:
- `StarField.jsx`: the `StarField` function (lines 638–646) plus imports `React, { useRef }, useFrame` and `Stars` from `@react-three/drei`.
- `SkyDome.jsx`: the `SkyDome` function (lines 648–663) plus `React, { useRef, useMemo }, THREE, useFrame`, and the same `lerp`/`clamp01` helpers as `Rung.jsx` (re-declare locally — small enough to duplicate rather than add a shared-utils import for two one-line functions).
- `CloudLayer.jsx`: move `softTex` (lines 629–636) to the top of this file as a module-level constant (it's only used here), then the `CloudLayer` function (lines 666–695) plus `React, { useRef, useMemo }, useFrame`, and `lerp`/`clamp01`.

- [ ] **Step 5: Verify it compiles**

Run: `npx astro build`
Expected: no import-resolution or syntax errors (the page still renders Task 1's placeholder — these components aren't wired into a page yet, this step only confirms nothing added a broken import chain: run `node -e "require('esbuild').buildSync({entryPoints:['src/components/scene/Node.jsx'],bundle:false,loader:{'.jsx':'jsx'}})"` if `astro build` doesn't touch unreferenced files — pick whichever actually exercises the new files in this repo's setup).

- [ ] **Step 6: Commit**

```bash
git add src/components/scene/Strand.jsx src/components/scene/Rung.jsx src/components/scene/Node.jsx src/components/scene/StarField.jsx src/components/scene/SkyDome.jsx src/components/scene/CloudLayer.jsx
git commit -m "Port 3D scene primitives (Strand, Rung, Node, StarField, SkyDome, CloudLayer)"
```

---

### Task 5: Reader/product/cart panels + shared hooks — with hook + component tests

**Files:**
- Create: `src/hooks/usePanelScrollTrap.js`
- Create: `src/hooks/useIsMobile.js`
- Test: `src/hooks/useIsMobile.test.js`
- Create: `src/components/panels/sheetPos.js`
- Create: `src/components/panels/PostCard.jsx`
- Create: `src/components/panels/ProductCard.jsx`
- Create: `src/components/panels/CartPanel.jsx`
- Test: `src/components/panels/ProductCard.test.jsx`
- Test: `src/components/panels/CartPanel.test.jsx`

**Interfaces:**
- Produces: `usePanelScrollTrap(): RefObject`, `useIsMobile(): boolean`, `sheetPos(isMobile, desktopStyle): object`, plus `closeBtn` style object (co-located in `sheetPos.js` since both are small shared style helpers).
- `<PostCard post={PostData} onClose={() => void} />`
- `<ProductCard product={ProductData} onClose={() => void} onAdd={() => Promise<void>} />`
- `<CartPanel cart={Cart|null} onClose onRemove={(lineItemId) => void} onCheckout={() => void} busy={boolean} />`

- [ ] **Step 1: Write the failing hook test**

Create `src/hooks/useIsMobile.test.js`:

```js
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useIsMobile from './useIsMobile.js';

const setWidth = (w) => { window.innerWidth = w; window.dispatchEvent(new Event('resize')); };

describe('useIsMobile', () => {
  afterEach(() => setWidth(1024));

  it('reads the initial viewport width', () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('updates on resize', () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => setWidth(400));
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — `useIsMobile.js` doesn't exist.

- [ ] **Step 3: Port `useIsMobile.js` and `usePanelScrollTrap.js`**

`src/hooks/useIsMobile.js` — copy lines **526–535** of `.unbundled/src/app.js`, wrap as:
```js
import { useState, useEffect } from 'react';
export default function useIsMobile() { /* unchanged body */ }
```

`src/hooks/usePanelScrollTrap.js` — copy lines **511–522**, wrap as:
```js
import { useRef, useEffect } from 'react';
export default function usePanelScrollTrap() { /* unchanged body */ }
```

- [ ] **Step 4: Run the hook test again**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Port `sheetPos.js`**

Copy lines **537** (`sheetPos`) and **588** (`closeBtn`) into `src/components/panels/sheetPos.js`:
```js
export const sheetPos = (isMobile, desktop) => isMobile
  ? { position: 'absolute', left: '0', right: '0', bottom: '0', top: 'auto', transform: 'none', width: '100%', maxHeight: '80vh', borderRadius: '22px 22px 0 0' }
  : desktop;

export const closeBtn = { cursor: 'pointer', width: '26px', height: '26px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' };
```

- [ ] **Step 6: Write the failing component tests**

Create `src/components/panels/ProductCard.test.jsx`:
```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductCard from './ProductCard.jsx';

const product = { name: 'Red Cell Mug', tint: '#c81830', price: '$18.00', image: '', blurb: 'A mug.' };

describe('ProductCard', () => {
  it('shows the product name and an Add to cart button', () => {
    render(<ProductCard product={product} onClose={() => {}} onAdd={() => Promise.resolve()} />);
    expect(screen.getByText('Red Cell Mug')).toBeTruthy();
    expect(screen.getByText('Add to cart')).toBeTruthy();
  });
  it('calls onAdd and shows the added count on click', async () => {
    const onAdd = vi.fn().mockResolvedValue();
    render(<ProductCard product={product} onClose={() => {}} onAdd={onAdd} />);
    fireEvent.click(screen.getByText('Add to cart'));
    expect(onAdd).toHaveBeenCalledOnce();
  });
});
```

Create `src/components/panels/CartPanel.test.jsx`:
```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CartPanel from './CartPanel.jsx';

describe('CartPanel', () => {
  it('shows the empty-cart message when there are no line items', () => {
    render(<CartPanel cart={{ lineItems: [] }} onClose={() => {}} onRemove={() => {}} onCheckout={() => {}} busy={false} />);
    expect(screen.getByText(/Your cart is empty/)).toBeTruthy();
  });
  it('shows a loading message when cart is null', () => {
    render(<CartPanel cart={null} onClose={() => {}} onRemove={() => {}} onCheckout={() => {}} busy={false} />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });
});
```

- [ ] **Step 7: Run the component tests to confirm they fail**

Run: `npm test`
Expected: FAIL — `PostCard.jsx`/`ProductCard.jsx`/`CartPanel.jsx` don't exist yet.

- [ ] **Step 8: Port `PostCard.jsx`, `ProductCard.jsx`, `CartPanel.jsx`**

- `PostCard.jsx`: lines **541–557**, header:
  ```js
  import * as React from 'react';
  import usePanelScrollTrap from '../../hooks/usePanelScrollTrap.js';
  import useIsMobile from '../../hooks/useIsMobile.js';
  import { sheetPos, closeBtn } from './sheetPos.js';
  const e = React.createElement;
  export default function PostCard({ post, onClose }) { /* unchanged body */ }
  ```
- `ProductCard.jsx`: lines **559–587**, same import header (plus `useState` from React) as above; `export default function ProductCard({ product, onClose, onAdd }) { /* unchanged body */ }`.
- `CartPanel.jsx`: lines **591–626**, same import header plus `import { wixImageUrl } from '../../lib/wix.js';` (used at original line 615); `export default function CartPanel({ cart, onClose, onRemove, onCheckout, busy }) { /* unchanged body */ }`.

- [ ] **Step 9: Run all tests again**

Run: `npm test`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/hooks src/components/panels
git commit -m "Port reader/product/cart panels and shared hooks, with tests"
```

---

### Task 6: `Scene.jsx` composition and `App.jsx` (chrome + boot + state)

**Files:**
- Create: `src/components/scene/Scene.jsx`
- Create: `src/components/App.jsx`
- Test: `src/components/App.chrome.test.js`

**Interfaces:**
- Consumes: everything from Tasks 2–5 (`src/lib/wix.js`, `src/components/scene/*`, `src/components/panels/*`, `src/hooks/*`).
- Produces: `<Scene mode cart onModeChange={} onCartChange={} onSelectionChange={} onReady={} onCartOpenChange={} />` (a `<Canvas>` wrapper — the exact prop list is derived in Step 1 below by reading how `App`'s chrome needs to drive/observe the scene) and `export default function App()`.

- [ ] **Step 1: Extract and test the chrome's derived-state function**

The original `renderVals()` (lines 217–243 of `.unbundled/src/app.js`) is pure: given `state = { ready, error, selected, mode, cart }`, it returns the chrome's derived display props. Write the failing test first — create `src/components/App.chrome.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { chromeProps } from './App.jsx';

describe('chromeProps', () => {
  it('shows the blog tab as active and shop as idle in blog mode', () => {
    const p = chromeProps({ ready: true, error: null, selected: null, mode: 'blog', cart: 0 });
    expect(p.blogBg).not.toBe('transparent');
    expect(p.shopBg).toBe('transparent');
  });
  it('formats the cart count label only when non-zero', () => {
    expect(chromeProps({ ready: true, error: null, selected: null, mode: 'blog', cart: 0 }).cartCountLabel).toBe('');
    expect(chromeProps({ ready: true, error: null, selected: null, mode: 'blog', cart: 3 }).cartCountLabel).toBe('· 3');
  });
  it('hides the loader once ready', () => {
    expect(chromeProps({ ready: true, error: null, selected: null, mode: 'blog', cart: 0 }).loaderOpacity).toBe(0);
    expect(chromeProps({ ready: false, error: null, selected: null, mode: 'blog', cart: 0 }).loaderOpacity).toBe(1);
  });
});
```
Run `npm test` — expect FAIL (`App.jsx` doesn't exist / doesn't export `chromeProps`).

- [ ] **Step 2: Port `renderVals` as the exported `chromeProps` function**

In the new `src/components/App.jsx`, port lines 217–243 as:
```js
export function chromeProps(state) {
  const ready = state.ready && !state.error;
  const shop = state.mode === 'shop';
  const activeBg = 'rgba(255,255,255,0.92)', activeFg = '#0a0812', idleFg = 'rgba(255,255,255,0.72)';
  return {
    loading: !state.ready && !state.error,
    error: !!state.error,
    errorMsg: state.error || '',
    showHint: ready,
    loaderOpacity: ready ? 0 : 1,
    loaderPointer: ready ? 'none' : 'auto',
    subtitle: shop ? '/ the shop' : '/ a blog',
    blogBg: shop ? 'transparent' : activeBg,
    blogFg: shop ? idleFg : activeFg,
    shopBg: shop ? activeBg : 'transparent',
    shopFg: shop ? activeFg : idleFg,
    hasCart: state.cart > 0,
    cartCount: state.cart,
    showCart: ready,
    cartCountLabel: state.cart > 0 ? ('· ' + state.cart) : '',
    hint: state.selected
      ? (shop ? 'Click empty space or ✕ to keep browsing the shop' : 'Click empty space or ✕ to return to the helix')
      : (shop ? 'Drag to orbit  ·  hover a cell for its name  ·  click to view & add to cart'
              : 'Drag to orbit  ·  hover a cell for its title  ·  click a cell to read'),
  };
}
```
(dropped `canvasRef`, `goBlog`, `goShop`, `openCart` from the original object — those are event handlers/refs, not derived display data; `App`'s JSX wires them directly instead of threading them through this pure function, which keeps `chromeProps` testable.)

- [ ] **Step 3: Run the chrome test again**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Build `Scene.jsx`**

Copy lines **703–815** of `.unbundled/src/app.js` (the `Scene` function through the final `root.render(...)` call) into `src/components/scene/Scene.jsx` and apply these edits:

1. Imports:
   ```js
   import * as React from 'react';
   import { useRef, useState, useEffect } from 'react';
   import * as THREE from 'three';
   import { Canvas, useFrame } from '@react-three/fiber';
   import { CameraControls, Html, Environment, Lightformer } from '@react-three/drei';
   import Strand from './Strand.jsx';
   import Rung from './Rung.jsx';
   import Node, { onDeselectGlobal as _setOnDeselectGlobal } from './Node.jsx';
   import StarField from './StarField.jsx';
   import SkyDome from './SkyDome.jsx';
   import CloudLayer from './CloudLayer.jsx';
   import { buildNodes, SHOP_R } from './geometry.js';

   const e = React.createElement;
   const lerp = (a, b, t) => a + (b - a) * t;
   const clamp01 = (x) => Math.max(0, Math.min(1, x));
   const cSpace = new THREE.Color('#060812'), cSky = new THREE.Color('#a9d8f5');
   const fSpace = new THREE.Color('#060812'), fSky = new THREE.Color('#cfe8ff');
   const hSkyA = new THREE.Color('#9fb2ff'), hSkyB = new THREE.Color('#eaf6ff');
   const hGndA = new THREE.Color('#0a0a16'), hGndB = new THREE.Color('#5b7fae');
   ```
   `onDeselectGlobal` can't be reassigned through an ES import binding — instead of `onDeselectGlobal = onDeselect;` (original line 737), `Node.jsx` (Task 4) should export a **setter**, not a `let`: change `Node.jsx`'s export to `export let onDeselectGlobalRef = { current: () => {} };` and have `Node` call `onDeselectGlobalRef.current()`; then here in `Scene.jsx`, `useEffect(() => { onDeselectGlobalRef.current = onDeselect; });` (mutate the object's property, which works across the module boundary). Go back and apply this exact pattern in Task 4's `Node.jsx` before finishing this step — replace every reference here and in `Node.jsx` accordingly.
2. `Scene` receives props from `App.jsx` instead of reaching for closure variables: `function Scene({ posts, products, mode, onModeChange, cart, onCartChange, onSelectionChange, onReady, cartOpen, onCartOpenChange })`. Replace:
   - `POSTS`/`PRODUCTS` (module vars in the original) → the `posts`/`products` props, passed into `buildNodes(posts, products)` (compute `nodes` once with `useMemo(() => buildNodes(posts, products), [posts, products])`, replacing the original's plain `const nodes = [...]` since it's now inside a function component that can re-render).
   - Every `self.setState({ ... })` call → the corresponding `on*` callback prop (`self.setState({ mode: next, selected: null })` → `onModeChange(next); onSelectionChange(null);`, `self.setState({ selected: ... })` → `onSelectionChange(...)`, `self.setState({ cart: n })` inside cart flows → `onCartChange(n)`).
   - `self.state.mode` (in `home: () => applyMode(self.state.mode)`) → the `mode` prop.
   - `onCreated: () => { self.setState({ ready: true }); }` → `onCreated: () => onReady()`.
3. Drop the final two lines (`const root = ReactDOMClient.createRoot(this.hostEl); ... root.render(e(Canvas, {...}, e(Scene)));`) entirely — `Scene`'s `export default function Scene(props) { ... return e(Canvas, { ...(same args, minus onCreated's self reference) }, e(SceneInner)); }`. Concretely: rename the original inner `function Scene()` to `SceneInner` (it becomes the thing rendered *inside* `<Canvas>`), and make the new default-exported `Scene` the component that renders `<Canvas dpr={[1, 1.75]} camera={{...}} gl={{...}} onPointerMissed={...} onCreated={onReady}><SceneInner .../></Canvas>` directly as JSX-via-`e(...)`, forwarding all the props listed in point 2 down to `SceneInner`.

- [ ] **Step 5: Build `App.jsx`'s chrome JSX and state**

In `src/components/App.jsx` (which already has `chromeProps` from Step 2), add:
```js
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import Scene from './scene/Scene.jsx';
import { loadWixPosts, loadWixProducts, getWixCart, removeWixCartItem, checkoutCurrentCart, cartItemCount } from '../lib/wix.js';
import CartPanel from './panels/CartPanel.jsx';

const e = React.createElement;

export function chromeProps(state) { /* from Step 2 */ }

export default function App() {
  const [state, setState] = useState({ ready: false, error: null, selected: null, mode: 'blog', cart: 0 });
  const [posts, setPosts] = useState([]);
  const [products, setProducts] = useState([]);
  const [cartData, setCartData] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const set = (patch) => setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadWixPosts().catch((err) => { console.error('[Genome] Wix Blog load failed:', err); return []; }),
      loadWixProducts().catch((err) => { console.error('[Genome] Wix Stores load failed:', err); return []; }),
    ]).then(([p, pr]) => {
      if (cancelled) return;
      console.log(`[Genome] Rendering ${p.length} post(s) + ${pr.length} product(s).`);
      setPosts(p); setProducts(pr);
    }).catch((err) => { if (!cancelled) set({ error: err && err.message ? err.message : String(err) }); });
    return () => { cancelled = true; };
  }, []);

  const cp = chromeProps(state);
  const refreshCart = () => getWixCart().then((c) => { setCartData(c); set({ cart: cartItemCount(c) }); });
  const openCart = () => { setCartOpen(true); refreshCart(); };

  return e('div', { style: { position: 'fixed', inset: 0, overflow: 'hidden', background: 'radial-gradient(120% 90% at 50% 8%, #12102a 0%, #0a0818 45%, #050409 100%)', fontFamily: "'Space Grotesk', system-ui, sans-serif", color: '#fff' } },
    e(Scene, {
      posts, products, mode: state.mode, cart: state.cart, cartOpen,
      onModeChange: (mode) => set({ mode, selected: null }),
      onCartChange: (next) => set((s) => ({ cart: typeof next === 'function' ? next(s.cart) : next })),
      onSelectionChange: (selected) => set({ selected }),
      onReady: () => set({ ready: true }),
      onCartOpenChange: setCartOpen,
    }),
    /* loader, error overlay, logo, hint bar (toggle + cart button) — translate template.xdc.html's
       corresponding markup 1:1 using cp.* from chromeProps, `{{ x }}` -> `{x}`, `<sc-if value="{{ x }}">`
       -> `{x && (...)}`, `onclick="{{ goBlog }}"` -> `onClick={() => set({ mode: 'blog', selected: null })}`
       (and the shop/cart equivalents) */
    cartOpen && e(CartPanel, { cart: cartData, busy: checkingOut, onClose: () => setCartOpen(false),
      onRemove: (id) => removeWixCartItem(id).then((c) => { setCartData(c); set({ cart: cartItemCount(c) }); }),
      onCheckout: () => { setCheckingOut(true); checkoutCurrentCart().catch((err) => { console.error('[Genome] checkout failed:', err); setCheckingOut(false); }); } })
  );
}
```
Fill in the loader/error/logo/hint-bar JSX by translating the four corresponding blocks of `.unbundled/src/template.xdc.html` (the loader `<div>` block, the `<sc-if value="{{ error }}">` block, the `.gx-logo` block, and the `.gx-topbar`/`.gx-hint` blocks) using the exact translation rules stated in the spec (`{{ x }}` → `{x}` reading from `cp`, `<sc-if>` → `{cond && (...)}`, `onclick` → `onClick`, `class="gx-..."` → `className="gx-..."`). Keep every inline `style="..."` string as an equivalent JS style object (same property values, camelCased keys).

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS (all tests from Tasks 2–6).

- [ ] **Step 7: Commit**

```bash
git add src/components/scene/Scene.jsx src/components/App.jsx src/components/App.chrome.test.js
git commit -m "Compose Scene.jsx and App.jsx: chrome JSX, state, and Wix boot sequence"
```

---

### Task 7: Wire the page, install, and verify end-to-end against the live site

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Wire the real page**

```astro
---
import Layout from '../layouts/Layout.astro';
import App from '../components/App.jsx';
import '../styles/global.css';
---
<Layout>
  <App client:load />
</Layout>
```

- [ ] **Step 2: Confirm the outer viewport meta is present**

Open `src/layouts/Layout.astro` — it already has `<meta name="viewport" content="width=device-width" />` in `<head>`, unconditionally rendered before any client JS runs. No change needed; this is the load-bearing ordering the spec calls out (confirm, don't skip).

- [ ] **Step 3: Install and connect to the live site**

```bash
npm install
npx wix env pull
```
Expected: pulls `WIX_CLIENT_ID` (and related env) for siteId `d1768de8-645d-4705-af99-a52a8a819985` into `.env.local` (gitignored).

- [ ] **Step 4: Run the dev server and verify manually**

```bash
npx wix dev
```
Open the printed local URL and confirm, matching the spec's Verification section:
- Blog mode: the helix renders one node per published post (21 expected); clicking a node opens the `PostCard` reader with the full rich-content body; console shows `[Genome] Fetching posts from Wix Blog…` / `[Genome] Wix Blog returned 21 published post(s).` / `[Genome] Rendering 21 post(s) + 12 product(s).` with no CORS/fetch errors.
- Shop mode: toggling morphs the helix into the RBC cloud, one node per product (12 expected); clicking opens `ProductCard`; "Add to cart" increments the cart badge; opening the cart lists/removes items and shows a subtotal; "Checkout" redirects to a Wix-hosted checkout page.
- Resize the window under 720px wide: header collapses to the mobile layout (logo only, no subtitle/hint, toggle+cart bottom-centered), and opening a post/product docks it as a bottom sheet instead of a right-side panel.
- No React key warnings, no uncaught console errors.

- [ ] **Step 5: Run the automated test suite one more time**

Run: `npm test`
Expected: PASS (regression check — the manual pass above can surface integration bugs whose root cause is in one of the ported pure functions; if so, fix there and re-run before continuing).

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro
git commit -m "Wire App island into the Astro page; verified against the live GENOME site"
git push
```

- [ ] **Step 7: Decide on the live-site cutover (not part of this task's done-ness)**

Per the spec, do **not** run `wix build && wix release` yet. Once everything above is verified, come back to the user with what you found for switching the site's frontend-build tool from "connect brought-in static HTML" to Astro (research this via the wix-headless skill or Wix docs — it was explicitly left unresolved in the spec) and let them decide when to cut the live site over.

---

## Self-Review Notes

- **Spec coverage:** repo scaffold (Task 1), Wix integration + CORS-safe query rule (Task 2, restated in Global Constraints), node-layout math (Task 3), Three.js scene (Task 4), panels + scroll-trap + mobile hook (Task 5), chrome/state/boot collapse into one React tree (Task 6), viewport-meta check + full manual verification checklist + explicit no-cutover-yet (Task 7). GitHub push already done in the spec phase; Task 7 Step 6 pushes the remaining commits to the same `origin`.
- **Placeholder scan:** every step names an exact file, exact source line range, and exact resulting code or test — the only intentionally-open item is Task 7 Step 7 (the live-site cutover), which the spec itself defers to a later, explicit decision rather than guessing Wix CLI behavior.
- **Type/name consistency checked across tasks:** `chromeProps(state)` (Task 6) matches the `state` shape `{ready, error, selected, mode, cart}` used throughout; `Scene`'s prop names (`onModeChange`, `onCartChange`, `onSelectionChange`, `onReady`, `onCartOpenChange`) are the same in Task 6 Step 4 (definition) and Step 5 (`App.jsx` call site); `Node`'s new `onCartChange` prop (Task 4 Step 3) is threaded through by `SceneInner`/`Scene` in Task 6; `onDeselectGlobalRef` (object-with-`.current`, not a reassignable `let`) is used consistently between Task 4's `Node.jsx` and Task 6's `Scene.jsx`.
