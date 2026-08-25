import * as React from 'react';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const e = React.createElement;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export default function SkyDome({ morphRef }) {
  const ref = useRef();
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide,
    uniforms: { top: { value: new THREE.Color("#2f7fd6") }, bottom: { value: new THREE.Color("#eaf6ff") }, opacity: { value: 0 }, yShift: { value: 0.7 } },
    vertexShader: "varying float h; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); h = normalize(wp.xyz).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "varying float h; uniform vec3 top; uniform vec3 bottom; uniform float opacity; uniform float yShift; void main(){ float t = smoothstep(-0.18 + yShift, 0.62 + yShift, h); gl_FragColor = vec4(mix(bottom, top, t), opacity); }"
  }), []);
  const geo = useMemo(() => new THREE.SphereGeometry(78, 32, 16), []);
  useFrame(() => {
    const m = morphRef.current;
    mat.uniforms.opacity.value = clamp01(m * 1.1);
    mat.uniforms.yShift.value = lerp(0.7, -0.15, m);
    if (ref.current) ref.current.visible = m > 0.01;
  });
  return e("mesh", { ref, geometry: geo, material: mat, renderOrder: -1 });
}
