import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useIsMobile from './useIsMobile.js';

const setWidth = (w) => { window.innerWidth = w; window.dispatchEvent(new Event('resize')); };

describe('useIsMobile', () => {
  afterEach(() => setWidth(1024));

  it('reads the initial viewport width', () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('updates on resize', () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => setWidth(400));
    expect(result.current).toBe(true);
  });
});
