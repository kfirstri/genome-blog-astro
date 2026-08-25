import * as React from 'react';
import { useRef, useState, useEffect, useMemo, Fragment } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls, Html, Environment, Lightformer } from '@react-three/drei';
import Strand from './Strand.jsx';
import Rung from './Rung.jsx';
import Node, { onDeselectGlobalRef } from './Node.jsx';
import StarField from './StarField.jsx';
import SkyDome from './SkyDome.jsx';
import CloudLayer from './CloudLayer.jsx';
import { buildNodes, SHOP_R } from './geometry.js';
import useIsMobile from '../../hooks/useIsMobile.js';

const e = React.createElement;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const cSpace = new THREE.Color('#060812'), cSky = new THREE.Color('#a9d8f5');
const fSpace = new THREE.Color('#060812'), fSky = new THREE.Color('#cfe8ff');
const hSkyA = new THREE.Color('#9fb2ff'), hSkyB = new THREE.Color('#eaf6ff');
const hGndA = new THREE.Color('#0a0a16'), hGndB = new THREE.Color('#5b7fae');

// Everything inside the R3F <Canvas>. `mode`, the selection mirror and the cart-panel
// visibility all live in `App` now (the original kept them in local state and mirrored them
// into the host component via `self.setState`), so they arrive here as props + callbacks.
function SceneInner({ posts, products, mode, onModeChange, onCartChange, onSelectionChange, cartOpen, onCartOpenChange }) {
  const helix = useRef(), controls = useRef(), hemi = useRef(), dir = useRef();
  const morphRef = useRef(0), targetMorph = useRef(0), paused = useRef(false);
  const breatheRef = useRef(1);
  const isMobile = useIsMobile();
  const [sel, setSel] = useState(null);
  // The original built `nodes` once at boot (module scope); here it is memoised because the
  // Wix content arrives after mount and re-renders this component.
  const nodes = useMemo(() => buildNodes(posts, products), [posts, products]);
  const shopR = SHOP_R(products.length);

  const overviewBlog = () => { const c = controls.current; if (!c) return; c.setLookAt(0, 1.2, isMobile ? 22 : 17, 0, 0, 0, true); c.rotatePolarTo && c.rotatePolarTo(Math.PI / 2, true); c.rotateAzimuthTo && c.rotateAzimuthTo(0, true); };
  const overviewShop = () => { const c = controls.current; if (!c) return; c.setLookAt(0, 0, shopR * (isMobile ? 4.3 : 3.0), 0, 0, 0, true); c.rotatePolarTo && c.rotatePolarTo(Math.PI / 2, true); c.rotateAzimuthTo && c.rotateAzimuthTo(0, true); };
  // On mobile: pull back a little and aim BELOW the cell so it rides high, above the bottom-sheet card.
  const focus = (p) => {
    const c = controls.current; if (!c) return;
    const dir2 = p.clone().normalize();
    const dist = isMobile ? 6.0 : 4.6;
    const cam = p.clone().add(dir2.multiplyScalar(dist)); cam.y += isMobile ? 0.4 : 0.6;
    const ty = isMobile ? p.y - dist * 0.34 : p.y;
    c.setLookAt(cam.x, cam.y, cam.z, p.x, ty, p.z, true);
  };

  const applyMode = (next) => {
    paused.current = false; setSel(null); onCartOpenChange(false);
    onModeChange(next); onSelectionChange(null);
    targetMorph.current = next === "shop" ? 1 : 0;
    if (next === "shop") overviewShop(); else overviewBlog();
  };
  const onSelect = (index, worldPos) => { onCartOpenChange(false); paused.current = true; setSel({ index }); focus(worldPos); onSelectionChange(mode === "shop" ? products[index] : posts[index]); };
  const onDeselect = () => { paused.current = false; setSel(null); onCartOpenChange(false); if (targetMorph.current === 1) overviewShop(); else overviewBlog(); onSelectionChange(null); };
  // `Node` reaches for the current deselect handler through this shared ref object (see Node.jsx).
  useEffect(() => { onDeselectGlobalRef.current = onDeselect; });
  const openCart = () => { paused.current = true; setSel(null); onSelectionChange(null); onCartOpenChange(true); };
  useEffect(() => { window.__helix = { setMode: applyMode, home: () => applyMode(mode), deselect: onDeselect, openCart: openCart }; });
  // The cart panel is part of `App`'s DOM chrome now, so its open/close can originate outside
  // the scene: mirror the original `openCart`/`closeCart` side effects off the `cartOpen` prop.
  // Skipping the resume while a cell is selected keeps `onSelect`'s pause (it closes the cart
  // as part of selecting, which lands here as a close transition) from being undone.
  useEffect(() => {
    if (cartOpen) { paused.current = true; setSel(null); onSelectionChange(null); }
    else if (!sel) { paused.current = false; }
  }, [cartOpen]);
  // Frame the scene correctly for the current viewport on mount and whenever it crosses the
  // mobile/desktop breakpoint (e.g. rotating a phone), unless the user is mid-selection.
  useEffect(() => {
    const id = requestAnimationFrame(() => { if (!paused.current) { if (targetMorph.current === 1) overviewShop(); else overviewBlog(); } });
    return () => cancelAnimationFrame(id);
  }, [isMobile]);

  useFrame((st, dt) => {
    morphRef.current += (targetMorph.current - morphRef.current) * Math.min(1, dt * 2.7);
    const m = morphRef.current;
    const t = st.clock.elapsedTime;
    if (st.scene.background) st.scene.background.copy(cSpace).lerp(cSky, m);
    if (st.scene.fog) st.scene.fog.color.copy(fSpace).lerp(fSky, m);
    if (hemi.current) { hemi.current.intensity = lerp(0.5, 1.3, m); hemi.current.color.copy(hSkyA).lerp(hSkyB, m); hemi.current.groundColor.copy(hGndA).lerp(hGndB, m); }
    if (dir.current) dir.current.intensity = lerp(2.2, 3.0, m);
    if (helix.current) {
      const spin = 0.16 + Math.sin(t * 0.28) * 0.05;              // gentle twist accel/decel
      if (m < 0.5 && !paused.current) helix.current.rotation.y += dt * spin;
      else helix.current.rotation.y += (0 - helix.current.rotation.y) * Math.min(1, dt * 2.5);
      // Subtle radial "breathing" (expand/retract) + a slight counter-phase vertical stretch,
      // blog-only and damped while a card is open so the focused cell stays steady.
      breatheRef.current += ((paused.current ? 0 : 1) - breatheRef.current) * Math.min(1, dt * 3);
      const amt = (1 - clamp01(m / 0.5)) * breatheRef.current;
      const radS = 1 + Math.sin(t * 0.5) * 0.045 * amt;
      const verS = 1 + Math.sin(t * 0.5 + Math.PI) * 0.025 * amt;
      helix.current.scale.set(radS, verS, radS);
    }
  });

  const emptyMode = (mode === "shop" ? products.length : posts.length) === 0;

  return e(Fragment, null,
    e("color", { attach: "background", args: ["#060812"] }),
    e("fog", { attach: "fog", args: ["#060812", 24, 60] }),
    e(StarField, { morphRef }),
    e(SkyDome, { morphRef }),
    e(CloudLayer, { morphRef }),
    e("hemisphereLight", { ref: hemi, args: ["#9fb2ff", "#0a0a16", 0.5] }),
    e("directionalLight", { ref: dir, position: [8, 12, 8], intensity: 2.2, color: "#ffffff", castShadow: true }),
    e("pointLight", { position: [-11, -3, -8], intensity: 60, color: "#5b7cff" }),
    e("pointLight", { position: [10, 2, 6], intensity: 45, color: "#ff86b8" }),
    e(Environment, { resolution: 256, background: false },
      e(Lightformer, { intensity: 2.2, position: [0, 6, -9], scale: [12, 12, 1], color: "#ffffff" }),
      e(Lightformer, { intensity: 1.3, position: [-9, 2, 5], scale: [9, 9, 1], color: "#9db2ff" }),
      e(Lightformer, { intensity: 1.1, position: [9, -2, 5], scale: [9, 9, 1], color: "#ffb0d0" }),
      e(Lightformer, { form: "ring", intensity: 1.8, position: [0, 0, 9], scale: [7, 7, 1], color: "#ffffff" })),
    e(CameraControls, { ref: controls, makeDefault: true, minDistance: 3, maxDistance: 34, smoothTime: 0.55, dollySpeed: 0.35, minPolarAngle: Math.PI * 0.30, maxPolarAngle: Math.PI * 0.70 }),
    e("group", { ref: helix },
      e(Strand, { off: 0, morphRef }), e(Strand, { off: Math.PI, morphRef }),
      nodes.filter((n) => n.hasPost).map((n) => e(Rung, { key: "r" + n.index, a: n.pos, b: n.other, color: n.color, morphRef })),
      nodes.map((n) => e(Node, { key: n.index, node: n, morphRef, mode, onSelect, onCartChange, active: !!(sel && sel.index === n.index) }))
    ),
    emptyMode && e(Html, { center: true, position: [0, 0, 0], zIndexRange: [40, 0], style: { pointerEvents: "none" } },
      e("div", { style: { textAlign: "center", width: "300px", fontFamily: "'Space Grotesk', system-ui, sans-serif", color: "rgba(255,255,255,0.72)", background: "rgba(14,12,28,0.85)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px", padding: "22px 26px", backdropFilter: "blur(10px)" } },
        e("div", { style: { fontSize: "15px", fontWeight: 700, marginBottom: "8px", color: "#fff" } }, mode === "shop" ? "No products yet" : "No posts yet"),
        e("div", { style: { fontSize: "13px", lineHeight: 1.55, color: "rgba(255,255,255,0.6)" } }, mode === "shop" ? "Add products in your Wix dashboard → Store." : "Publish a post in your Wix dashboard → Blog.")))
  );
}

// `cart` is accepted for interface completeness (the count is rendered by App's chrome, not
// by the scene); the cart panel itself is rendered by App, outside the canvas.
export default function Scene({ posts, products, mode, onModeChange, cart, onCartChange, onSelectionChange, onReady, cartOpen, onCartOpenChange }) {
  return e(Canvas, {
    dpr: [1, 1.75],
    camera: { position: [0, 1.2, 17], fov: 46 },
    gl: { antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 },
    style: { position: "absolute", inset: 0, width: "100%", height: "100%" },
    onPointerMissed: () => { if (window.__helix) window.__helix.deselect(); },
    onCreated: () => onReady()
  }, e(SceneInner, { posts, products, mode, onModeChange, onCartChange, onSelectionChange, cartOpen, onCartOpenChange }));
}
