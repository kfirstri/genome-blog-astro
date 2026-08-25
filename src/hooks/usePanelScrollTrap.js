import { useRef, useEffect } from 'react';

// Keep wheel / drag / touch inside a fixed reader panel so they scroll it instead of
// zooming/orbiting the 3D scene. Returns a ref to attach to the panel root.
export default function usePanelScrollTrap() {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const stop = (ev) => ev.stopPropagation();
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("touchmove", stop, { passive: true });
    el.addEventListener("pointerdown", stop);
    return () => { el.removeEventListener("wheel", stop); el.removeEventListener("touchmove", stop); el.removeEventListener("pointerdown", stop); };
  }, []);
  return ref;
}
