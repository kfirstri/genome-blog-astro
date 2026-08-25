import * as React from 'react';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const e = React.createElement;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

const softTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(0.5, "rgba(244,250,255,0.5)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

export default function CloudLayer({ morphRef }) {
  const grp = useRef();
  const puffs = useMemo(() => {
    const rnd = (a, b) => a + Math.random() * (b - a), arr = [];
    for (let i = 0; i < 24; i++) {
      const s = rnd(7, 18);
      arr.push({
        x: rnd(-20, 20), baseY: rnd(-6, 10), z: rnd(-26, 12), s,
        o: rnd(0.28, 0.6),
        rise: rnd(22, 42) * (0.6 + s / 20),
        dx: rnd(0.03, 0.09) * (Math.random() < 0.5 ? -1 : 1)
      });
    }
    return arr;
  }, []);
  useFrame((_st, dt) => {
    const m = morphRef.current; if (!grp.current) return;
    grp.current.visible = m > 0.01;
    grp.current.children.forEach((sp, i) => {
      const d = puffs[i]; if (!d) return;
      sp.position.y = d.baseY + lerp(-d.rise, d.rise, m);
      sp.position.x += d.dx * dt;
      if (sp.position.x > 26) sp.position.x = -26; if (sp.position.x < -26) sp.position.x = 26;
      sp.material.opacity = d.o * clamp01((m - 0.1) / 0.55);
    });
  });
  return e("group", { ref: grp }, puffs.map((d, i) =>
    e("sprite", { key: i, position: [d.x, d.baseY, d.z], scale: [d.s, d.s * 0.6, 1] },
      e("spriteMaterial", { map: softTex, transparent: true, opacity: 0, depthWrite: false }))));
}
