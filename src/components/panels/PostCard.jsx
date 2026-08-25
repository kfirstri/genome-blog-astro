import * as React from 'react';
import usePanelScrollTrap from '../../hooks/usePanelScrollTrap.js';
import useIsMobile from '../../hooks/useIsMobile.js';
import { sheetPos, closeBtn } from './sheetPos.js';
const e = React.createElement;

export default function PostCard({ post, onClose }) {
  const cardRef = usePanelScrollTrap();
  const isMobile = useIsMobile();
  return e("div", { ref: cardRef, onWheel: (ev) => ev.stopPropagation(), onPointerDown: (ev) => ev.stopPropagation(), style: {
    ...sheetPos(isMobile, { position: "absolute", top: "50%", right: "clamp(16px, 4vw, 48px)", transform: "translateY(-50%)", width: "min(560px, 92vw)", maxHeight: "88vh", borderRadius: "18px" }),
    overflowY: "auto", overflowX: "hidden",
    padding: "26px 28px 24px", background: "rgba(14,12,28,0.94)", backdropFilter: "blur(14px)",
    border: `1px solid ${post.color}55`, boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px -20px ${post.color}88, 0 0 40px -12px ${post.color}66`,
    color: "#fff", fontFamily: "'Space Grotesk', system-ui, sans-serif", animation: "helix-fade 0.35s ease both", pointerEvents: "auto", WebkitOverflowScrolling: "touch"
  } },
    e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" } },
      e("span", { style: { fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 10px", borderRadius: "100px", background: post.color + "22", color: post.color, border: `1px solid ${post.color}55` } }, post.tag),
      e("button", { onClick: onClose, style: closeBtn }, "✕")),
    e("h2", { style: { margin: "0 0 6px", fontSize: "24px", lineHeight: 1.15, fontWeight: 700, letterSpacing: "-0.01em" } }, post.title),
    e("div", { style: { fontSize: "12px", color: "rgba(255,255,255,0.45)", marginBottom: "16px", letterSpacing: "0.04em" } }, post.date),
    e("div", { style: { marginTop: "2px", overflowWrap: "anywhere" }, dangerouslySetInnerHTML: { __html: post.bodyHtml || "" } }));
}
