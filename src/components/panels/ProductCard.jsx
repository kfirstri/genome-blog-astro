import * as React from 'react';
import { useState } from 'react';
import usePanelScrollTrap from '../../hooks/usePanelScrollTrap.js';
import useIsMobile from '../../hooks/useIsMobile.js';
import { sheetPos, closeBtn } from './sheetPos.js';
const e = React.createElement;

export default function ProductCard({ product, onClose, onAdd }) {
  const cardRef = usePanelScrollTrap();
  const isMobile = useIsMobile();
  const [added, setAdded] = useState(0);
  const [adding, setAdding] = useState(false);
  const c = product.tint;
  // Flex column: image + text scroll in the middle; the Add-to-cart button is a PINNED
  // footer so an async-loading image can never push it off the bottom of the viewport.
  return e("div", { ref: cardRef, onWheel: (ev) => ev.stopPropagation(), onPointerDown: (ev) => ev.stopPropagation(), style: {
    ...sheetPos(isMobile, { position: "absolute", top: "50%", right: "clamp(16px, 4vw, 48px)", transform: "translateY(-50%)", width: "min(420px, 92vw)", maxHeight: "88vh", borderRadius: "18px" }),
    display: "flex", flexDirection: "column", overflow: "hidden",
    background: "rgba(16,10,14,0.95)", backdropFilter: "blur(14px)",
    border: `1px solid ${c}66`, boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px -20px ${c}aa, 0 0 44px -12px ${c}88`,
    color: "#fff", fontFamily: "'Space Grotesk', system-ui, sans-serif", animation: "helix-fade 0.35s ease both", pointerEvents: "auto", WebkitOverflowScrolling: "touch"
  } },
    e("div", { style: { flex: "1 1 auto", overflowY: "auto", overflowX: "hidden" } },
      e("div", { style: { position: "relative", height: "220px", flex: "0 0 auto", background: `linear-gradient(135deg, ${c}, #2a060c)` } },
        product.image && e("img", { src: product.image, alt: product.name, loading: "lazy", style: { width: "100%", height: "100%", objectFit: "cover", display: "block" }, onError: (ev) => { ev.target.style.display = "none"; } }),
        e("button", { onClick: onClose, style: { ...closeBtn, position: "absolute", top: "12px", right: "12px", background: "rgba(0,0,0,0.45)" } }, "✕"),
        product.price && e("span", { style: { position: "absolute", left: "16px", bottom: "14px", fontSize: "14px", fontWeight: 700, padding: "6px 13px", borderRadius: "100px", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.18)" } }, product.price)),
      e("div", { style: { padding: "20px 22px 8px" } },
        e("div", { style: { fontSize: "11px", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#ff9fae", marginBottom: "8px" } }, "Genome Store"),
        e("h2", { style: { margin: "0 0 10px", fontSize: "21px", lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.01em" } }, product.name),
        product.blurb && e("p", { style: { margin: "0 0 6px", fontSize: "13px", lineHeight: 1.6, color: "rgba(255,255,255,0.72)" } }, product.blurb))),
    e("div", { style: { flex: "0 0 auto", padding: "14px 22px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" } },
      e("button", { disabled: adding, onClick: () => { setAdding(true); Promise.resolve(onAdd()).then(() => setAdded((n) => n + 1)).finally(() => setAdding(false)); },
        style: { width: "100%", cursor: adding ? "default" : "pointer", padding: "13px", borderRadius: "12px", border: "none", fontFamily: "inherit", fontSize: "13.5px", fontWeight: 700, letterSpacing: "0.02em", color: "#fff", opacity: adding ? 0.7 : 1, background: `linear-gradient(135deg, ${c}, #8f0e1e)`, boxShadow: `0 8px 22px -8px ${c}` } },
        adding ? "Adding…" : (added ? `Added ×${added} · Add another` : "Add to cart"))));
}
