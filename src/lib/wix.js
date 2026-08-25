// The Wix Astro integration authenticates every SDK call automatically (visitor session
// management + token handling happen in its request middleware / browser runtime setup) —
// no client, no OAuthStrategy. Import a module and call its methods directly.
import { posts } from '@wix/blog';
import { products } from '@wix/stores';
import { currentCart } from '@wix/ecom';
import { redirects } from '@wix/redirects';

const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

// Per-post styling (tag + node colour) keyed by title, so known posts keep a designed look.
export const POST_STYLE = {
  "My Great Trip": { tag: "Travel", color: "#FF3D81" },
  "Why I Love Dogs": { tag: "Life", color: "#FFC400" },
  "3 Things to Know About Computers": { tag: "Tech", color: "#00E5FF" },
  "How the Internet Actually Works": { tag: "Tech", color: "#7C4DFF" },
  "A Beginner's Guide to the Command Line": { tag: "Tech", color: "#00E676" },
  "What Even Is an API?": { tag: "Tech", color: "#FF6D00" },
  "My First Week Learning to Code": { tag: "Journal", color: "#536DFE" },
  "How I Organize My Digital Life": { tag: "Productivity", color: "#EC407A" },
  "The Magic of Open Source": { tag: "Tech", color: "#26C6DA" },
  "Notes on Building This Site": { tag: "Meta", color: "#FFD54F" },
  "Learning to Say No": { tag: "Life", color: "#FF3D81" },
  "The Underrated Joy of Reading Docs": { tag: "Tech", color: "#00E5FF" },
  "Why I Started Journaling": { tag: "Journal", color: "#536DFE" },
  "How Version Control Saved My Sanity": { tag: "Tech", color: "#7C4DFF" },
  "A Love Letter to Small Side Projects": { tag: "Meta", color: "#FFD54F" },
  "The Art of the Rubber Duck": { tag: "Tech", color: "#00E676" },
  "Coffee, Walks, and Debugging": { tag: "Life", color: "#FFC400" },
  "What Nobody Tells You About Remote Work": { tag: "Life", color: "#EC407A" },
  "Databases Are Just Very Organized Boxes": { tag: "Tech", color: "#26C6DA" },
  "On Finishing Things": { tag: "Productivity", color: "#FF6D00" }
};
export const HELIX_PALETTE = ["#FF3D81","#FFC400","#00E5FF","#7C4DFF","#00E676","#FF6D00","#536DFE","#EC407A","#26C6DA","#FFD54F"];
export const PRODUCT_TINTS = ["#d21f34","#c81830","#e02a45","#b81528","#d81f3a","#c01528","#e0304c","#c8203a","#d02840","#b01023"];

export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export function stripHtml(s) {
  return String(s == null ? "" : s).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
export function wixImageUrl(src) {
  if (!src) return "";
  if (typeof src === "string") {
    if (src.indexOf("wix:image://") === 0) {
      const id = src.replace("wix:image://v1/", "").split("/")[0].split("#")[0];
      return id ? ("https://static.wixstatic.com/media/" + id) : "";
    }
    return /^https?:\/\//.test(src) ? src : ("https://static.wixstatic.com/media/" + src);
  }
  if (src.url) return src.url;
  const id = src.id || "";
  if (!id) return "";
  return /^https?:\/\//.test(id) ? id : ("https://static.wixstatic.com/media/" + id);
}
export function fmtDate(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch (e) { return ""; }
}

// Render a run of TEXT nodes with their decorations (bold / italic / underline / link) to inline HTML.
function ricosInline(nodes, accent) {
  return (Array.isArray(nodes) ? nodes : []).map((n) => {
    if (n.type !== "TEXT" || !n.textData) return "";
    let out = esc(n.textData.text);
    let href = null, bold = false, italic = false, underline = false;
    for (const d of (n.textData.decorations || [])) {
      if (d.type === "BOLD") bold = true;
      else if (d.type === "ITALIC") italic = true;
      else if (d.type === "UNDERLINE") underline = true;
      else if (d.type === "LINK" && d.linkData && d.linkData.link) href = d.linkData.link.url;
    }
    if (bold) out = "<strong>" + out + "</strong>";
    if (italic) out = "<em>" + out + "</em>";
    if (underline) out = "<u>" + out + "</u>";
    if (href) out = '<a href="' + esc(href) + '" target="_blank" rel="noopener" style="color:' + accent + ';">' + out + "</a>";
    return out;
  }).join("");
}

// Convert a Ricos rich-content document to styled HTML for the reader panel.
export function ricosToHtml(rc, accent) {
  if (!rc || !Array.isArray(rc.nodes)) return "";
  const P = "margin:0 0 10px;font-size:13.5px;line-height:1.62;color:rgba(255,255,255,0.80);";
  const walk = (nodes) => (nodes || []).map((node) => {
    switch (node.type) {
      case "PARAGRAPH": {
        const t = ricosInline(node.nodes, accent);
        return t.trim() ? '<p style="' + P + '">' + t + "</p>" : "";
      }
      case "HEADING": {
        const lvl = (node.headingData && node.headingData.level) || 2;
        const size = lvl <= 2 ? "16.5px" : "15px";
        return '<h3 style="margin:18px 0 8px;font-size:' + size + ';font-weight:700;color:#fff;letter-spacing:-0.01em;">' + ricosInline(node.nodes, accent) + "</h3>";
      }
      case "BULLETED_LIST":
        return '<ul style="margin:2px 0 12px;padding-left:20px;">' + walk(node.nodes) + "</ul>";
      case "ORDERED_LIST":
        return '<ol style="margin:2px 0 12px;padding-left:20px;">' + walk(node.nodes) + "</ol>";
      case "LIST_ITEM":
        return '<li style="margin:0 0 7px;font-size:13.5px;line-height:1.55;color:rgba(255,255,255,0.80);">' + walk(node.nodes).replace(/<\/?p[^>]*>/g, "") + "</li>";
      case "BLOCKQUOTE":
        return '<blockquote style="margin:0 0 12px;padding:4px 0 4px 14px;border-left:3px solid ' + accent + '88;color:rgba(255,255,255,0.72);font-style:italic;">' + walk(node.nodes) + "</blockquote>";
      case "CODE_BLOCK":
        return '<pre style="margin:0 0 12px;padding:12px;border-radius:10px;background:rgba(0,0,0,0.35);overflow:auto;font-size:12px;line-height:1.5;color:rgba(255,255,255,0.85);"><code>' + esc((node.nodes || []).map((t) => (t.textData && t.textData.text) || "").join("")) + "</code></pre>";
      case "DIVIDER":
        return '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.12);margin:14px 0;" />';
      case "IMAGE": {
        const img = node.imageData && node.imageData.image;
        const url = img && wixImageUrl(img.src);
        if (!url) return "";
        const alt = (node.imageData && node.imageData.altText) || "";
        return '<img src="' + esc(url) + '" alt="' + esc(alt) + '" loading="lazy" style="display:block;width:100%;height:auto;border-radius:12px;margin:12px 0;" />';
      }
      default:
        return node.nodes ? walk(node.nodes) : "";
    }
  }).join("");
  return walk(rc.nodes);
}

// Blog posts (with full rich content requested in the single CORS-safe list query).
export async function loadWixPosts() {
  console.log("[Genome] Fetching posts from Wix Blog…");
  const res = await posts.queryPosts({ fieldsets: ["RICH_CONTENT", "CONTENT_TEXT"] }).limit(100).find();
  const items = res.items || res.posts || [];
  console.log("[Genome] Wix Blog returned " + items.length + " published post(s).");
  return items.map((p, i) => {
    const style = POST_STYLE[p.title] || {};
    const color = style.color || HELIX_PALETTE[i % HELIX_PALETTE.length];
    let bodyHtml = ricosToHtml(p.richContent, color);
    if (!bodyHtml || !bodyHtml.trim()) {
      const txt = p.contentText || p.excerpt || "";
      bodyHtml = txt
        ? txt.split(/\n+/).map((s) => s.trim()).filter(Boolean)
            .map((s) => '<p style="margin:0 0 10px;font-size:13.5px;line-height:1.62;color:rgba(255,255,255,0.80);">' + esc(s) + "</p>").join("")
        : '<p style="color:rgba(255,255,255,0.6);">Open the full post on the blog to read more.</p>';
    }
    return { title: p.title || "Untitled", tag: style.tag || "Post", date: fmtDate(p.firstPublishedDate || p.editedDate || p.createdDate), color: color, excerpt: p.excerpt || "", bodyHtml: bodyHtml };
  });
}

// Store products (Catalog V1: name, formatted price, main image, HTML description).
export async function loadWixProducts() {
  console.log("[Genome] Fetching products from Wix Stores…");
  const res = await products.queryProducts().limit(100).find();
  const items = res.items || res.products || [];
  console.log("[Genome] Wix Stores returned " + items.length + " product(s).");
  return items.map((p, i) => {
    const media = p.media || {};
    const image = (media.mainMedia && media.mainMedia.image && media.mainMedia.image.url)
      || (media.items && media.items[0] && media.items[0].image && media.items[0].image.url) || "";
    const price = (p.price && p.price.formatted && p.price.formatted.price)
      || (p.priceData && p.priceData.formatted && p.priceData.formatted.price) || "";
    return { id: p._id || p.id, name: p.name || "Product", price: price, image: image, tint: PRODUCT_TINTS[i % PRODUCT_TINTS.length], blurb: stripHtml(p.description || "").slice(0, 260) };
  });
}

// Add a product to the visitor's real Wix cart; returns the new total item count.
export async function addToWixCart(productId) {
  const r = await currentCart.addToCurrentCart({ lineItems: [{ catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: productId }, quantity: 1 } ] });
  const cart = r.cart || r;
  return (cart.lineItems || []).reduce((n, li) => n + (li.quantity || 1), 0);
}

export function cartItemCount(cart) { return ((cart && cart.lineItems) || []).reduce((n, li) => n + (li.quantity || 1), 0); }

// Read the visitor's current cart (empty shape if none exists yet).
export async function getWixCart() {
  try { return await currentCart.getCurrentCart(); } catch (e) { return { lineItems: [] }; }
}

export async function removeWixCartItem(lineItemId) {
  const r = await currentCart.removeLineItemsFromCurrentCart([lineItemId]);
  return r.cart || r;
}

// Create a checkout from the current cart and redirect the visitor to Wix's hosted checkout page.
// (currentCart.createCheckoutFromCurrentCart -> redirects.createRedirectSession -> location.href)
export async function checkoutCurrentCart() {
  const co = await currentCart.createCheckoutFromCurrentCart({ channelType: "WEB" });
  const checkoutId = co.checkoutId || (co.checkout && co.checkout._id) || co._id;
  const rs = await redirects.createRedirectSession({
    ecomCheckout: { checkoutId: checkoutId },
    callbacks: { postFlowUrl: window.location.href, thankYouPageUrl: window.location.href }
  });
  const url = rs && rs.redirectSession && rs.redirectSession.fullUrl;
  if (url) { window.location.href = url; return true; }
  throw new Error("No checkout redirect URL returned");
}
