import * as React from 'react';
import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import ProductCard from '../panels/ProductCard.jsx';
import PostCard from '../panels/PostCard.jsx';
import { addToWixCart } from '../../lib/wix.js';
import { rbcGeo, sphereGeo } from './geometry.js';

const e = React.createElement;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// `Scene.jsx` (Task 6) sets `.current` to the real deselect handler once it mounts; `Node`
// calls through the ref object rather than a plain exported `let` because ES module bindings
// can't be reassigned from an importing module (`onDeselectGlobalRef = x` in Scene.jsx would be
// a build error) — mutating a property on a shared object works across the module boundary.
export const onDeselectGlobalRef = { current: () => {} };

export default function Node({ node, morphRef, mode, onSelect, active, onCartChange }) {
  const group = useRef(), sphere = useRef(), rbc = useRef(), ring = useRef();
  const labelRef = useRef();
  const wp = useMemo(() => new THREE.Vector3(), []);
  const [hover, setHover] = useState(false);
  const hoverMul = useRef(1);
  const present = mode === "shop" ? node.hasProduct : node.hasPost;
  const lineColor = mode === "shop" ? node.tint : node.color;
  const labelText = mode === "shop" ? ((node.product && node.product.name) || "") : ((node.post && node.post.title) || "");

  useFrame((st, dt) => {
    if (!group.current) return;
    const m = morphRef.current, t = st.clock.elapsedTime;
    const p = node.pos.clone().lerp(node.grid, m);
    if (m > 0.01) { p.y += Math.sin(t * 1.1 + node.index * 1.7) * 0.14 * m; p.x += Math.cos(t * 0.9 + node.index) * 0.06 * m; }
    group.current.position.copy(p);

    const want = active ? 1.2 : (hover ? 1.14 : 1);
    hoverMul.current += (want - hoverMul.current) * 0.16;
    const mul = hoverMul.current;

    const sphereOp = (node.hasPost ? 1 : 0) * clamp01(1 - m / 0.42);
    const rbcOp = (node.hasProduct ? 1 : 0) * clamp01((m - 0.42) / 0.34);
    if (sphere.current) {
      const mat = sphere.current.material;
      sphere.current.visible = sphereOp > 0.02;
      sphere.current.scale.setScalar(mul);
      mat.opacity = sphereOp;
      mat.transparent = sphereOp < 0.99;
      mat.depthWrite = sphereOp > 0.5;
      mat.emissiveIntensity = (hover || active) ? 0.5 : 0.12;
    }
    if (rbc.current) {
      const mat = rbc.current.material;
      rbc.current.visible = rbcOp > 0.02;
      rbc.current.scale.setScalar(mul);
      // Each blood cell has its own random orientation + gentle tumble (scaled by morph),
      // so they face every which way like cells suspended in fluid — not all one way.
      rbc.current.rotation.set(
        node.tilt[0] * m + Math.sin(t * 0.25 + node.index) * 0.12 * m,
        node.tilt[1] * m + Math.cos(t * 0.2 + node.index * 1.7) * 0.12 * m,
        node.tilt[2] * m);
      mat.opacity = rbcOp;
      mat.transparent = rbcOp < 0.99;
      mat.depthWrite = rbcOp > 0.5;
      mat.emissiveIntensity = (hover || active) ? 0.22 : 0.05;
    }
    if (ring.current) {
      ring.current.quaternion.copy(st.camera.quaternion);
      const rs = lerp(0.62, 0.82, m) * mul;
      ring.current.scale.set(rs, rs, rs);
    }
    // Front-facing leader label (blog + shop): fade in only for the cells facing the camera.
    if (labelRef.current) {
      group.current.getWorldPosition(wp);
      const cx = st.camera.position.x, cy = st.camera.position.y, cz = st.camera.position.z;
      let facing, avail, gate;
      if (mode === "shop") {
        const cl = wp.length() || 1, kl = Math.hypot(cx, cy, cz) || 1;
        facing = (wp.x * cx + wp.y * cy + wp.z * cz) / (cl * kl);     // full-3D facing (orbit the sphere)
        avail = node.hasProduct; gate = clamp01((m - 0.55) / 0.35);
      } else {
        const rl = Math.hypot(wp.x, wp.z) || 1, kl = Math.hypot(cx, cz) || 1;
        facing = (wp.x * cx + wp.z * cz) / (rl * kl);                 // XZ facing (helix twist + azimuth orbit)
        avail = node.hasPost; gate = clamp01(1 - m / 0.35);
      }
      let op = avail ? clamp01((facing - 0.4) / 0.45) * gate : 0;
      if (hover || active) op = 0;
      labelRef.current.style.opacity = op.toFixed(3);
      labelRef.current.style.display = op < 0.02 ? "none" : "flex";
    }
  });

  useEffect(() => { document.body.style.cursor = (hover && present) ? "pointer" : "auto"; return () => { document.body.style.cursor = "auto"; }; }, [hover, present]);

  const lit = (hover || active) && present;
  const handlers = {
    onPointerOver: (ev) => { ev.stopPropagation(); if (present) setHover(true); },
    onPointerOut: () => setHover(false),
    onClick: (ev) => { ev.stopPropagation(); if (!present) return; const p = new THREE.Vector3(); group.current.getWorldPosition(p); onSelect(node.index, p); }
  };
  const label = mode === "shop" ? (node.product && node.product.name) : (node.post && node.post.title);

  return e("group", { ref: group },
    lit && e("mesh", null,
      e("sphereGeometry", { args: [0.82, 20, 20] }),
      e("meshBasicMaterial", { color: mode === "shop" ? node.tint : node.color, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })),
    e("mesh", { ref: sphere, geometry: sphereGeo, castShadow: true, ...handlers },
      e("meshPhysicalMaterial", { color: node.color, roughness: 0.2, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.14, envMapIntensity: 1.4, sheen: 0.4, sheenColor: "#ffffff", emissive: node.color, emissiveIntensity: 0.12, transparent: true })),
    e("mesh", { ref: rbc, geometry: rbcGeo, castShadow: true, ...handlers },
      e("meshPhysicalMaterial", { color: node.tint, roughness: 0.62, metalness: 0.0, clearcoat: 0.35, clearcoatRoughness: 0.5, sheen: 0.6, sheenColor: "#ff9aa6", sheenRoughness: 0.5, envMapIntensity: 0.7, emissive: node.tint, emissiveIntensity: 0.05, transparent: true })),
    lit && e("mesh", { ref: ring },
      e("torusGeometry", { args: [1.0, 0.035, 16, 80] }),
      e("meshBasicMaterial", { color: "#ffffff", toneMapped: false })),
    (node.hasPost || node.hasProduct) && e(Html, { center: false, distanceFactor: 9, position: [0, 0, 0], zIndexRange: [22, 0], style: { pointerEvents: "none" } },
      e("div", { ref: labelRef, style: { display: "none", opacity: 0, alignItems: "center", transform: "translate(14px, -50%)", whiteSpace: "nowrap", pointerEvents: "none" } },
        e("div", { style: { width: "40px", height: "1.5px", flex: "0 0 auto", background: `linear-gradient(90deg, ${lineColor}, ${lineColor}22)`, boxShadow: `0 0 8px ${lineColor}aa` } }),
        e("div", { style: { marginLeft: "9px", fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: "13px", fontWeight: 600, color: "#fff", textShadow: "0 1px 10px rgba(0,0,0,0.95)" } }, labelText,
          (mode === "shop" && node.product) && e("span", { style: { marginLeft: "8px", color: "#ff9fae", fontWeight: 700 } }, node.product.price)))),
    (hover && present && !active) && e(Html, { center: true, distanceFactor: 9, position: [0, 1.2, 0], zIndexRange: [30, 0], style: { pointerEvents: "none" } },
      e("div", { style: {
        whiteSpace: "nowrap", padding: "6px 13px", borderRadius: "100px", background: "rgba(10,8,20,0.86)", backdropFilter: "blur(6px)",
        border: `1px solid ${(mode === "shop" ? node.tint : node.color)}88`, color: "#fff", fontFamily: "'Space Grotesk', system-ui, sans-serif",
        fontSize: "13px", fontWeight: 600, transform: "translateY(-4px)"
      } }, label,
        mode === "shop" && node.product && e("span", { style: { marginLeft: "8px", color: "#ff9fae", fontWeight: 700 } }, node.product.price))),
    active && e(Html, { fullscreen: true, zIndexRange: [40, 0], style: { pointerEvents: "none" } },
      (mode === "shop" && node.product)
        ? e(ProductCard, { product: node.product, onClose: () => onDeselectGlobalRef.current(),
            onAdd: () => addToWixCart(node.product.id).then((n) => onCartChange(n)).catch((err) => { console.error("[Genome] add to cart failed:", err); onCartChange((s) => s + 1); }) })
        : (node.post && e(PostCard, { post: node.post, onClose: () => onDeselectGlobalRef.current() }))));
}
