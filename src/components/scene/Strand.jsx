import * as React from 'react';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { curveOf } from './geometry.js';

const e = React.createElement;

export default function Strand({ off, morphRef }) {
  const ref = useRef();
  const geo = useMemo(() => new THREE.TubeGeometry(curveOf(off), 500, 0.11, 14, false), [off]);
  useFrame(() => {
    if (!ref.current) return;
    const o = 1 - morphRef.current;
    ref.current.material.opacity = o; ref.current.visible = o > 0.02;
  });
  return e("mesh", { ref, geometry: geo, castShadow: true },
    e("meshPhysicalMaterial", { color: "#c3c8d4", metalness: 1.0, roughness: 0.26, clearcoat: 0.7, clearcoatRoughness: 0.35, envMapIntensity: 1.25, transparent: true }));
}
