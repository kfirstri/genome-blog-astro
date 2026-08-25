import * as React from 'react';
import { useState, useEffect } from 'react';
import Scene from './scene/Scene.jsx';
import { loadWixPosts, loadWixProducts, getWixCart, removeWixCartItem, checkoutCurrentCart, cartItemCount } from '../lib/wix.js';
import CartPanel from './panels/CartPanel.jsx';

const e = React.createElement;

// Derived display props for the DOM chrome (loader, error card, logo, top bar, hint bar).
// Ported from the original `Component.renderVals()` — pure, so it is unit-testable; the
// event handlers (`goBlog`/`goShop`/`openCart`) and the canvas ref the original returned
// alongside these values are wired directly in `App`'s JSX instead.
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

const PAGE_BG = 'radial-gradient(120% 90% at 50% 8%, #12102a 0%, #0a0818 45%, #050409 100%)';
const FONT = "'Space Grotesk', system-ui, sans-serif";
const TAB_STYLE = {
  display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', padding: '8px 15px',
  borderRadius: '100px', border: 'none', fontFamily: 'inherit', fontSize: '12.5px',
  fontWeight: 600, letterSpacing: '0.03em', transition: 'all .25s ease',
};

export default function App() {
  const [state, setState] = useState({ ready: false, error: null, selected: null, mode: 'blog', cart: 0 });
  const [posts, setPosts] = useState([]);
  const [products, setProducts] = useState([]);
  const [cartData, setCartData] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const set = (patch) => setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));

  // Boot: fetch the live Wix content (blog posts + store products). Each side degrades to an
  // empty list on failure, exactly as the original `boot()` did.
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
  // One code path for opening/closing the cart, whether it comes from the chrome's Cart button
  // or from inside the scene (`window.__helix.openCart`).
  const setCartOpenState = (open) => { setCartOpen(open); if (open) { setCartData(null); refreshCart(); } };
  // The chrome drives the scene through the same `window.__helix` bridge the original used
  // (`renderVals`'s `goBlog`/`goShop`/`openCart`): the scene owns the camera framing and the
  // helix→cell-cloud morph, and reports the new mode / cart visibility back up through its
  // `onModeChange` / `onCartOpenChange` props, which is what updates the state read here.
  // (Setting `mode` from here directly would leave the camera and morph target untouched.)
  const goMode = (next) => { if (window.__helix) window.__helix.setMode(next); };
  const openCart = () => { if (window.__helix) window.__helix.openCart(); };

  return e('div', { style: { position: 'fixed', inset: 0, overflow: 'hidden', background: PAGE_BG, fontFamily: FONT, color: '#fff' } },
    e(Scene, {
      posts, products, mode: state.mode, cart: state.cart, cartOpen,
      onModeChange: (mode) => set({ mode, selected: null }),
      onCartChange: (next) => set((s) => ({ cart: typeof next === 'function' ? next(s.cart) : next })),
      onSelectionChange: (selected) => set({ selected }),
      onReady: () => set({ ready: true }),
      onCartOpenChange: setCartOpenState,
    }),

    // ---- loader ----
    e('div', { style: {
        position: 'absolute', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '24px', background: PAGE_BG,
        opacity: cp.loaderOpacity, transition: 'opacity 0.85s ease', pointerEvents: cp.loaderPointer,
      } },
      e('div', { style: { position: 'relative', width: '66px', height: '66px' } },
        e('div', { style: { position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#FF3D81', borderRightColor: '#7C4DFF', animation: 'helix-spin 1s linear infinite' } }),
        e('div', { style: { position: 'absolute', inset: '9px', borderRadius: '50%', border: '2px solid transparent', borderBottomColor: '#00E5FF', borderLeftColor: '#FFC400', animation: 'helix-spin 1.5s linear infinite reverse' } }),
        e('div', { style: { position: 'absolute', inset: '27px', borderRadius: '50%', background: 'linear-gradient(135deg,#FF3D81,#7C4DFF)', boxShadow: '0 0 20px #FF3D81', animation: 'helix-pulse 1.3s ease-in-out infinite' } })),
      e('div', { style: { fontSize: '12px', letterSpacing: '0.34em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' } }, 'Sequencing the genome')),

    // ---- error ----
    cp.error && e('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, padding: '32px' } },
      e('div', { style: { maxWidth: '420px', textAlign: 'center', background: 'rgba(20,16,40,0.85)', border: '1px solid rgba(255,61,129,0.4)', borderRadius: '16px', padding: '28px 26px' } },
        e('div', { style: { fontSize: '15px', fontWeight: 600, color: '#FF6D8A', marginBottom: '10px' } }, 'Could not load the 3D scene'),
        e('div', { style: { fontSize: '13px', lineHeight: 1.5, color: 'rgba(255,255,255,0.6)' } }, cp.errorMsg))),

    // ---- logo ----
    e('div', { className: 'gx-logo', style: { position: 'absolute', top: '26px', left: '30px', zIndex: 15, display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'none' } },
      e('div', { style: { width: '11px', height: '11px', borderRadius: '50%', background: 'linear-gradient(135deg,#FF3D81,#7C4DFF)', boxShadow: '0 0 14px #FF3D81' } }),
      e('span', { style: { fontSize: '15px', fontWeight: 700, letterSpacing: '0.12em' } }, 'GENOME'),
      e('span', { className: 'gx-sub', style: { fontSize: '12px', fontWeight: 400, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)' } }, cp.subtitle)),

    // ---- top bar: blog/shop toggle + cart ----
    cp.showHint && e('div', { className: 'gx-topbar', style: { position: 'absolute', top: '22px', right: '26px', zIndex: 16, display: 'flex', alignItems: 'center', gap: '12px', fontFamily: FONT } },
      e('div', { style: { display: 'flex', gap: '4px', padding: '4px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' } },
        e('button', { onClick: () => goMode('blog'), style: { ...TAB_STYLE, background: cp.blogBg, color: cp.blogFg } },
          e('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' },
            e('path', { d: 'M4 5h11a3 3 0 0 1 3 3v11' }),
            e('path', { d: 'M4 5v14h11' }),
            e('path', { d: 'M8 9h6M8 13h6' })),
          'Blog'),
        e('button', { onClick: () => goMode('shop'), style: { ...TAB_STYLE, background: cp.shopBg, color: cp.shopFg } },
          e('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' },
            e('path', { d: 'M6 2 3 6v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6l-3-4Z' }),
            e('path', { d: 'M3 6h18' }),
            e('path', { d: 'M16 10a4 4 0 0 1-8 0' })),
          'Shop')),
      cp.showCart && e('button', { onClick: openCart, style: { display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', padding: '9px 15px', borderRadius: '100px', background: 'rgba(200,24,43,0.16)', border: '1px solid rgba(230,60,80,0.45)', backdropFilter: 'blur(8px)', color: '#ffd0d6', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: 600 } },
        e('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' },
          e('circle', { cx: '9', cy: '20', r: '1.4' }),
          e('circle', { cx: '18', cy: '20', r: '1.4' }),
          e('path', { d: 'M2 3h3l2.4 12.4a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.2L22 7H6' })),
        'Cart ', cp.cartCountLabel)),

    // ---- hint bar ----
    cp.showHint && e('div', { className: 'gx-hint', style: { position: 'absolute', bottom: '26px', left: '50%', transform: 'translateX(-50%)', zIndex: 15, pointerEvents: 'none', padding: '9px 18px', borderRadius: '100px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', fontSize: '12.5px', letterSpacing: '0.04em', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' } }, cp.hint),

    // ---- cart panel ----
    // The original rendered this inside the canvas via drei's `<Html fullscreen zIndexRange={[50, 0]}
    // style={{ pointerEvents: 'none' }}>`; here it is plain DOM chrome, so that wrapper is
    // reproduced directly (the panel itself re-enables pointer events).
    cartOpen && e('div', { style: { position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' } },
      e(CartPanel, { cart: cartData, busy: checkingOut, onClose: () => setCartOpenState(false),
        onRemove: (id) => removeWixCartItem(id).then((c) => { setCartData(c); set({ cart: cartItemCount(c) }); }),
        onCheckout: () => { setCheckingOut(true); checkoutCurrentCart().catch((err) => { console.error('[Genome] checkout failed:', err); setCheckingOut(false); }); } }))
  );
}
