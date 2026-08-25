import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CartPanel from './CartPanel.jsx';

describe('CartPanel', () => {
  it('shows the empty-cart message when there are no line items', () => {
    render(<CartPanel cart={{ lineItems: [] }} onClose={() => {}} onRemove={() => {}} onCheckout={() => {}} busy={false} />);
    expect(screen.getByText(/Your cart is empty/)).toBeTruthy();
  });
  it('shows a loading message when cart is null', () => {
    render(<CartPanel cart={null} onClose={() => {}} onRemove={() => {}} onCheckout={() => {}} busy={false} />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });
});
