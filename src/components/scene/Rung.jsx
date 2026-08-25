import * as React from 'react';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const e = React.createElement;

export default function Rung({ a, b, color, morphRef }) {
  const gref = useRef();
  const info = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { q, len, qA: new THREE.Vector3().lerpVectors(a, mid, 0.5), qB: new THREE.Vector3().lerpVectors(b, mid, 0.5) };
  }, [a, b]);
  useFrame(() => {
    if (!gref.current) return;
    const o = 1 - morphRef.current;
    gref.current.visible = o > 0.02;
    gref.current.traverse((m) => { if (m.material) m.material.opacity = o; });
  });
  return e("group", { ref: gref },
    e("mesh", { position: info.qA, quaternion: info.q },
      e("cylinderGeometry", { args: [0.045, 0.045, info.len * 0.5, 10] }),
      e("meshPhysicalMaterial", { color: color, metalness: 0.15, roughness: 0.45, clearcoat: 0.5, transparent: true })),
    e("mesh", { position: info.qB, quaternion: info.q },
      e("cylinderGeometry", { args: [0.045, 0.045, info.len * 0.5, 10] }),
      e("meshPhysicalMaterial", { color: "#e7e9f0", metalness: 0.2, roughness: 0.4, clearcoat: 0.5, transparent: true })));
}
