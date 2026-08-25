import * as THREE from 'three';

// ---------- helix layout (blog) ----------
const R = 3.3, HEIGHT = 22, TURNS = 3;

export const strandPoint = (t, off) => {
  const a = t * TURNS * Math.PI * 2 + off, y = (t - 0.5) * HEIGHT;
  return new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R);
};

export const curveOf = (off) => {
  const pts = []; for (let i = 0; i <= 240; i++) pts.push(strandPoint(i / 240, off));
  return new THREE.CatmullRomCurve3(pts);
};

// ---------- orbital cell cloud (shop): even Fibonacci-sphere distribution ----------
// Products float on a sphere shell around the centre; orbit to bring any cell forward.
export function SHOP_R(productCount) {
  return Math.max(4.2, 2.4 + productCount * 0.28);   // radius grows slightly with product count
}

export const spherePos = (i, n) => {
  if (n <= 1) return new THREE.Vector3(0, SHOP_R(n), 0);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (i / (n - 1)) * 2;              // 1 -> -1
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * i;
  return new THREE.Vector3(Math.cos(theta) * r * SHOP_R(n), y * SHOP_R(n), Math.sin(theta) * r * SHOP_R(n));
};

export function buildNodes(posts, products) {
  const P = posts.length, S = products.length, COUNT = Math.max(P, S);
  const nodes = [];
  for (let i = 0; i < COUNT; i++) {
    const hasPost = i < P, hasProduct = i < S;
    const t = P > 1 ? i / (P - 1) : 0.5, off = (i % 2) ? Math.PI : 0;
    const helixP = hasPost ? strandPoint(t, off) : spherePos(i, S);
    const gP = hasProduct ? spherePos(i, S) : (hasPost ? strandPoint(t, off) : spherePos(i, S));
    const product = hasProduct ? products[i] : null, post = hasPost ? posts[i] : null;
    nodes.push({
      index: i, hasPost, hasProduct, post, product,
      pos: helixP, other: hasPost ? strandPoint(t, off + Math.PI) : helixP, grid: gP,
      color: post ? post.color : (product ? product.tint : "#ffffff"),
      tint: product ? product.tint : "#c81830",
      tilt: [(Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4]
    });
  }
  return nodes;
}

// ---------- biconcave red-blood-cell geometry (Evans-Fung profile) ----------
export const rbcGeo = (() => {
  const g = new THREE.SphereGeometry(1, 48, 30);
  const pos = g.attributes.position, v = new THREE.Vector3();
  const RAD = 0.72, TH = 0.92;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const d = Math.min(1, Math.hypot(v.x, v.z));
    const sign = v.y >= 0 ? 1 : -1;
    const h = 0.5 * Math.sqrt(Math.max(0, 1 - d * d)) * (0.24 + 2.0 * d * d - 1.12 * d * d * d * d);
    pos.setXYZ(i, v.x * RAD, sign * h * TH, v.z * RAD);
  }
  g.computeVertexNormals();
  g.rotateX(Math.PI / 2);
  return g;
})();

export const sphereGeo = new THREE.SphereGeometry(0.5, 32, 32);
