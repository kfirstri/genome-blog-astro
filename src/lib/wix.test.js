import { describe, it, expect } from 'vitest';
import { esc, stripHtml, wixImageUrl, fmtDate, cartItemCount, ricosToHtml } from './wix.js';

describe('esc', () => {
  it('escapes HTML-significant characters', () => {
    expect(esc('<a>&"</a>')).toBe('&lt;a&gt;&amp;&quot;&lt;/a&gt;');
  });
  it('passes through null/undefined as empty string', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });
});

describe('stripHtml', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripHtml('<p>Hello   <b>world</b></p>')).toBe('Hello world');
  });
});

describe('wixImageUrl', () => {
  it('converts a wix:image URI to a static.wixstatic.com URL', () => {
    expect(wixImageUrl('wix:image://v1/abc123~mv2.jpg/name.jpg#originWidth=100'))
      .toBe('https://static.wixstatic.com/media/abc123~mv2.jpg');
  });
  it('passes through an already-absolute URL', () => {
    expect(wixImageUrl('https://example.com/x.png')).toBe('https://example.com/x.png');
  });
  it('returns empty string for falsy input', () => {
    expect(wixImageUrl('')).toBe('');
    expect(wixImageUrl(null)).toBe('');
  });
});

describe('fmtDate', () => {
  it('formats an ISO date as "Mon D, YYYY"', () => {
    expect(fmtDate('2026-03-05T00:00:00.000Z')).toBe('Mar 5, 2026');
  });
  it('returns empty string for falsy input', () => {
    expect(fmtDate(null)).toBe('');
  });
});

describe('cartItemCount', () => {
  it('sums line item quantities', () => {
    expect(cartItemCount({ lineItems: [{ quantity: 2 }, { quantity: 1 }] })).toBe(3);
  });
  it('returns 0 for an empty or missing cart', () => {
    expect(cartItemCount(null)).toBe(0);
    expect(cartItemCount({ lineItems: [] })).toBe(0);
  });
});

describe('ricosToHtml', () => {
  it('renders a paragraph node with bold text to HTML', () => {
    const rc = { nodes: [{ type: 'PARAGRAPH', nodes: [{ type: 'TEXT', textData: { text: 'hi', decorations: [{ type: 'BOLD' }] } }] }] };
    const html = ricosToHtml(rc, '#ffffff');
    expect(html).toContain('<strong>hi</strong>');
  });
  it('returns empty string for missing richContent', () => {
    expect(ricosToHtml(null, '#fff')).toBe('');
  });
});
