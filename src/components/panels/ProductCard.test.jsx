import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductCard from './ProductCard.jsx';

const product = { name: 'Red Cell Mug', tint: '#c81830', price: '$18.00', image: '', blurb: 'A mug.' };

describe('ProductCard', () => {
  it('shows the product name and an Add to cart button', () => {
    render(<ProductCard product={product} onClose={() => {}} onAdd={() => Promise.resolve()} />);
    expect(screen.getByText('Red Cell Mug')).toBeTruthy();
    expect(screen.getByText('Add to cart')).toBeTruthy();
  });
  it('calls onAdd and shows the added count on click', async () => {
    const onAdd = vi.fn().mockResolvedValue();
    render(<ProductCard product={product} onClose={() => {}} onAdd={onAdd} />);
    fireEvent.click(screen.getByText('Add to cart'));
    expect(onAdd).toHaveBeenCalledOnce();
  });
});
