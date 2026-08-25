import * as React from 'react';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

const e = React.createElement;

export default function StarField({ morphRef }) {
  const ref = useRef();
  useFrame(() => {
    const m = morphRef.current; if (!ref.current) return;
    ref.current.position.y = m * 48;
    ref.current.visible = m < 0.94;
  });
  return e("group", { ref }, e(Stars, { radius: 80, depth: 50, count: 1200, factor: 2.6, saturation: 0, fade: true, speed: 0.6 }));
}
