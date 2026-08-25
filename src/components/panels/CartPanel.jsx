import * as React from 'react';
import usePanelScrollTrap from '../../hooks/usePanelScrollTrap.js';
import useIsMobile from '../../hooks/useIsMobile.js';
import { sheetPos, closeBtn } from './sheetPos.js';
import { wixImageUrl } from '../../lib/wix.js';
const e = React.createElement;

// My-cart panel: lists the visitor's real Wix cart, remove items, and checkout (redirect to Wix).
export default function CartPanel({ cart, onClose, onRemove, onCheckout, busy }) {
  const ref = usePanelScrollTrap();
  const isMobile = useIsMobile();
  const items = (cart && cart.lineItems) || [];
  const subtotal = cart && cart.subtotal && cart.subtotal.formattedAmount;
  const accent = "#e0304c";
  // Desktop: drops down under the top-right "Cart" button. Mobile: bottom sheet.
  // Fixed header, scrollable item list, and a PINNED footer (subtotal + checkout).
  return e("div", { ref, onWheel: (ev) => ev.stopPropagation(), onPointerDown: (ev) => ev.stopPropagation(), style: {
    ...sheetPos(isMobile, { position: "absolute", top: "72px", right: "26px", width: "min(400px, calc(100vw - 40px))", maxHeight: "calc(100vh - 92px)", borderRadius: "18px" }),
    display: "flex", flexDirection: "column", overflow: "hidden",
    background: "rgba(16,10,14,0.96)", backdropFilter: "blur(14px)",
    border: `1px solid ${accent}55`, boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px -20px ${accent}88`,
    color: "#fff", fontFamily: "'Space Grotesk', system-ui, sans-serif", animation: "helix-fade 0.35s ease both", pointerEvents: "auto", WebkitOverflowScrolling: "touch"
  } },
    e("div", { style: { flex: "0 0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 22px 14px" } },
      e("div", { style: { fontSize: "17px", fontWeight: 700, letterSpacing: "-0.01em" } }, "Your cart"),
      e("button", { onClick: onClose, style: closeBtn }, "✕")),
    e("div", { style: { flex: "1 1 auto", overflowY: "auto", padding: "0 22px" } },
      !cart ? e("div", { style: { padding: "10px 0 20px", color: "rgba(255,255,255,0.6)", fontSize: "13px" } }, "Loading…")
        : (items.length === 0
          ? e("div", { style: { padding: "10px 0 20px", color: "rgba(255,255,255,0.6)", fontSize: "13.5px", lineHeight: 1.6 } }, "Your cart is empty. Click a product cell to add something.")
          : items.map((li) => e("div", { key: li._id, style: { display: "flex", gap: "12px", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.07)" } },
              e("div", { style: { width: "48px", height: "48px", borderRadius: "10px", overflow: "hidden", flex: "0 0 auto", background: "rgba(255,255,255,0.06)" } },
                e("img", { src: wixImageUrl(li.image), alt: "", style: { width: "100%", height: "100%", objectFit: "cover", display: "block" }, onError: (ev) => { ev.target.style.display = "none"; } })),
              e("div", { style: { flex: "1 1 auto", minWidth: 0 } },
                e("div", { style: { fontSize: "13.5px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, (li.productName && li.productName.original) || "Item"),
                e("div", { style: { fontSize: "12px", color: "rgba(255,255,255,0.5)" } }, "Qty " + (li.quantity || 1) + "  ·  " + ((li.price && li.price.formattedAmount) || ""))),
              e("button", { onClick: () => onRemove(li._id), title: "Remove", style: { ...closeBtn, width: "24px", height: "24px", flex: "0 0 auto" } }, "✕"))))),
    (cart && items.length > 0) && e("div", { style: { flex: "0 0 auto", padding: "14px 22px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" } },
      e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" } },
        e("span", { style: { fontSize: "13px", color: "rgba(255,255,255,0.6)" } }, "Subtotal"),
        e("span", { style: { fontSize: "16px", fontWeight: 700 } }, subtotal || "")),
      e("button", { disabled: busy, onClick: onCheckout, style: { width: "100%", cursor: busy ? "default" : "pointer", padding: "13px", borderRadius: "12px", border: "none", fontFamily: "inherit", fontSize: "14px", fontWeight: 700, letterSpacing: "0.02em", color: "#fff", opacity: busy ? 0.7 : 1, background: `linear-gradient(135deg, ${accent}, #8f0e1e)`, boxShadow: `0 8px 22px -8px ${accent}` } }, busy ? "Redirecting to checkout…" : "Checkout"),
      e("div", { style: { marginTop: "10px", fontSize: "11px", color: "rgba(255,255,255,0.4)", textAlign: "center" } }, "Secure checkout hosted by Wix")));
}
