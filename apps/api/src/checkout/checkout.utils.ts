import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';

export type CartItemPricing = {
  qty: number;
  unitPrice: Prisma.Decimal;
};

export const calculateCartTotals = (items: CartItemPricing[]) => {
  const subtotal = items.reduce((acc, item) => {
    const lineTotal = new Prisma.Decimal(item.unitPrice).mul(item.qty);
    return acc.plus(lineTotal);
  }, new Prisma.Decimal(0));

  return { subtotal, total: subtotal };
};

export const decimalToCents = (value: Prisma.Decimal | number | string) => {
  return Math.round(Number(value) * 100);
};

const hashKey = (value: string) =>
  createHash('sha256').update(value).digest('hex').slice(0, 32);

export const buildOrderIdempotencyKey = (seed: string) => {
  return `order_${hashKey(seed)}`;
};

export const buildPaymentIdempotencyKey = (seed: string, sourceId: string) => {
  return `pay_${hashKey(`${seed}:${sourceId}`)}`;
};

export const buildRefundIdempotencyKey = (orderId: string, paymentId: string) => {
  return `refund_${hashKey(`${orderId}:${paymentId}`)}`;
};

const US_STATE_CODES = new Set([
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY'
]);

const US_STATE_NAMES: Record<string, string> = {
  ALABAMA: 'AL',
  ALASKA: 'AK',
  ARIZONA: 'AZ',
  ARKANSAS: 'AR',
  CALIFORNIA: 'CA',
  COLORADO: 'CO',
  CONNECTICUT: 'CT',
  DELAWARE: 'DE',
  FLORIDA: 'FL',
  GEORGIA: 'GA',
  HAWAII: 'HI',
  IDAHO: 'ID',
  ILLINOIS: 'IL',
  INDIANA: 'IN',
  IOWA: 'IA',
  KANSAS: 'KS',
  KENTUCKY: 'KY',
  LOUISIANA: 'LA',
  MAINE: 'ME',
  MARYLAND: 'MD',
  MASSACHUSETTS: 'MA',
  MICHIGAN: 'MI',
  MINNESOTA: 'MN',
  MISSISSIPPI: 'MS',
  MISSOURI: 'MO',
  MONTANA: 'MT',
  NEBRASKA: 'NE',
  NEVADA: 'NV',
  NEW_HAMPSHIRE: 'NH',
  NEW_JERSEY: 'NJ',
  NEW_MEXICO: 'NM',
  NEW_YORK: 'NY',
  NORTH_CAROLINA: 'NC',
  NORTH_DAKOTA: 'ND',
  OHIO: 'OH',
  OKLAHOMA: 'OK',
  OREGON: 'OR',
  PENNSYLVANIA: 'PA',
  RHODE_ISLAND: 'RI',
  SOUTH_CAROLINA: 'SC',
  SOUTH_DAKOTA: 'SD',
  TENNESSEE: 'TN',
  TEXAS: 'TX',
  UTAH: 'UT',
  VERMONT: 'VT',
  VIRGINIA: 'VA',
  WASHINGTON: 'WA',
  WEST_VIRGINIA: 'WV',
  WISCONSIN: 'WI',
  WYOMING: 'WY'
};

export const extractUsStateFromAddress = (value: string) => {
  const upper = value.toUpperCase();
  const matches = upper.match(/\b[A-Z]{2}\b/g) ?? [];
  for (const match of matches) {
    if (US_STATE_CODES.has(match)) {
      return match;
    }
  }
  for (const [name, code] of Object.entries(US_STATE_NAMES)) {
    const pattern = new RegExp(`\\b${name.replace(/_/g, '\\s+')}\\b`);
    if (pattern.test(upper)) {
      return code;
    }
  }
  return null;
};

export type ShippingAddress = {
  line1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export const parseUsShippingAddress = (value: string): ShippingAddress => {
  const raw = value.trim();
  if (!raw) {
    throw new Error('Shipping address is required.');
  }

  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 3) {
    throw new Error('Shipping address must include street, city, state, and ZIP.');
  }

  const lastPart = parts[parts.length - 1].toUpperCase();
  const countryCandidates = ['USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'];
  if (countryCandidates.includes(lastPart)) {
    parts.pop();
  }

  if (parts.length < 3) {
    throw new Error('Shipping address must include street, city, state, and ZIP.');
  }

  const stateZip = parts[parts.length - 1];
  const city = parts[parts.length - 2];
  const line1 = parts.slice(0, parts.length - 2).join(', ');

  const match = stateZip.match(/([A-Z]{2})\s+(\d{5})(?:-\d{4})?$/i);
  if (!match) {
    throw new Error('Shipping address must include a valid state and ZIP code.');
  }

  if (!line1 || !city) {
    throw new Error('Shipping address must include street and city.');
  }

  return {
    line1,
    city,
    state: match[1].toUpperCase(),
    zip: match[2],
    country: 'US'
  };
};
