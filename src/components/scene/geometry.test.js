import { describe, it, expect } from 'vitest';
import { buildNodes, spherePos, strandPoint, SHOP_R } from './geometry.js';

describe('buildNodes', () => {
  it('produces one node per index up to max(posts, products)', () => {
    const posts = [{ title: 'a', color: '#111' }, { title: 'b', color: '#222' }];
    const products = [{ id: '1', tint: '#333' }];
    const nodes = buildNodes(posts, products);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ index: 0, hasPost: true, hasProduct: true });
    expect(nodes[1]).toMatchObject({ index: 1, hasPost: true, hasProduct: false });
  });
  it('returns an empty array when both are empty', () => {
    expect(buildNodes([], [])).toEqual([]);
  });
});

describe('spherePos', () => {
  it('returns the pole point for a single-item sphere', () => {
    const p = spherePos(0, 1);
    expect(p.x).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(0);
  });
});

describe('strandPoint', () => {
  it('lies at radius R in the XZ plane', () => {
    const p = strandPoint(0.5, 0);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(3.3, 1);
  });
});

describe('SHOP_R', () => {
  it('grows with product count but has a floor', () => {
    expect(SHOP_R(0)).toBeCloseTo(4.2, 5);
    expect(SHOP_R(12)).toBeGreaterThan(SHOP_R(2));
  });
});
