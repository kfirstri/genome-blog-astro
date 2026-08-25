import { describe, it, expect, vi } from 'vitest';

// `App.jsx` imports the R3F scene, whose CloudLayer builds a canvas-2D sprite texture at module
// load — jsdom has no 2D canvas backend, so stub the scene out. `chromeProps` is pure and does
// not touch it.
vi.mock('./scene/Scene.jsx', () => ({ default: () => null }));

import { chromeProps } from './App.jsx';

describe('chromeProps', () => {
  it('shows the blog tab as active and shop as idle in blog mode', () => {
    const p = chromeProps({ ready: true, error: null, selected: null, mode: 'blog', cart: 0 });
    expect(p.blogBg).not.toBe('transparent');
    expect(p.shopBg).toBe('transparent');
  });
  it('formats the cart count label only when non-zero', () => {
    expect(chromeProps({ ready: true, error: null, selected: null, mode: 'blog', cart: 0 }).cartCountLabel).toBe('');
    expect(chromeProps({ ready: true, error: null, selected: null, mode: 'blog', cart: 3 }).cartCountLabel).toBe('· 3');
  });
  it('hides the loader once ready', () => {
    expect(chromeProps({ ready: true, error: null, selected: null, mode: 'blog', cart: 0 }).loaderOpacity).toBe(0);
    expect(chromeProps({ ready: false, error: null, selected: null, mode: 'blog', cart: 0 }).loaderOpacity).toBe(1);
  });
});
