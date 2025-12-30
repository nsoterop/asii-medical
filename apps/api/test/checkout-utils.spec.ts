import { Prisma } from '@prisma/client';
import { calculateCartTotals, decimalToCents, parseUsShippingAddress } from '../src/checkout/checkout.utils';

describe('checkout utils', () => {
  it('calculates totals and converts decimals to cents', () => {
    const items = [
      { qty: 2, unitPrice: new Prisma.Decimal('12.34') },
      { qty: 1, unitPrice: new Prisma.Decimal('0.99') }
    ];

    const totals = calculateCartTotals(items);

    expect(totals.subtotal.toFixed(2)).toBe('25.67');
    expect(decimalToCents(totals.total)).toBe(2567);
  });

  it('parses a US shipping address string', () => {
    const address = '123 Main St, Austin, TX 78701, USA';
    const parsed = parseUsShippingAddress(address);

    expect(parsed).toEqual({
      line1: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      country: 'US'
    });
  });
});
