import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getEnv } from '../env';

export type TaxAddress = {
  line1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export type TaxLineItem = {
  id: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
};

export type TaxQuote = {
  taxCents: number;
  rate: number;
};

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);
  private readonly provider: 'none' | 'manual';
  private readonly origin: TaxAddress;
  private readonly stateRates: Record<string, number>;

  constructor() {
    const env = getEnv();
    this.provider = env.TAX_PROVIDER;
    this.origin = {
      line1: env.TAX_ORIGIN_STREET ?? '',
      city: env.TAX_ORIGIN_CITY ?? '',
      state: env.TAX_ORIGIN_STATE ?? '',
      zip: env.TAX_ORIGIN_ZIP ?? '',
      country: env.TAX_ORIGIN_COUNTRY ?? 'US'
    };
    this.stateRates = this.parseStateRates(env.TAX_STATE_RATES);
  }

  isManualProvider() {
    return this.provider === 'manual';
  }

  async calculateSalesTax(input: {
    toAddress: TaxAddress;
    lineItems: TaxLineItem[];
    shippingCents?: number;
  }): Promise<TaxQuote> {
    if (input.lineItems.length === 0) {
      return { taxCents: 0, rate: 0 };
    }

    if (this.provider === 'none') {
      return { taxCents: 0, rate: 0 };
    }

    if (this.provider === 'manual') {
      return this.calculateWithManualRates(input);
    }

    return { taxCents: 0, rate: 0 };
  }

  private calculateWithManualRates(input: {
    toAddress: TaxAddress;
    lineItems: TaxLineItem[];
    shippingCents?: number;
  }): TaxQuote {
    const state = input.toAddress.state.toUpperCase();
    const rate = this.stateRates[state] ?? 0;

    if (!rate) {
      this.logger.warn(`No sales tax configured for state ${state}.`);
      return { taxCents: 0, rate: 0 };
    }

    const subtotal = input.lineItems.reduce(
      (acc, item) => acc.plus(new Prisma.Decimal(item.unitPrice).mul(item.quantity)),
      new Prisma.Decimal(0)
    );
    const taxAmount = subtotal.mul(rate);
    const taxCents = Math.round(Number(taxAmount) * 100);

    return { taxCents, rate };
  }

  private parseStateRates(value?: string) {
    if (!value) {
      return {};
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return {};
    }

    const parsedFromJson = this.tryParseJsonRates(trimmed);
    if (parsedFromJson) {
      return parsedFromJson;
    }

    return this.parseCsvRates(trimmed);
  }

  private tryParseJsonRates(value: string) {
    try {
      const data = JSON.parse(value) as Record<string, unknown>;
      return this.normalizeRatesMap(data);
    } catch {
      return null;
    }
  }

  private parseCsvRates(value: string) {
    const entries = value.split(',').map((part) => part.trim()).filter(Boolean);
    const data: Record<string, unknown> = {};
    entries.forEach((entry) => {
      const [state, rate] = entry.split(':').map((part) => part.trim());
      if (state && rate) {
        data[state] = rate;
      }
    });
    return this.normalizeRatesMap(data);
  }

  private normalizeRatesMap(data: Record<string, unknown>) {
    const rates: Record<string, number> = {};
    Object.entries(data).forEach(([stateRaw, rateRaw]) => {
      const state = stateRaw.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(state)) {
        this.logger.warn(`Invalid state code in tax rates: ${stateRaw}`);
        return;
      }
      const numeric =
        typeof rateRaw === 'number'
          ? rateRaw
          : typeof rateRaw === 'string'
            ? Number(rateRaw)
            : NaN;
      if (!Number.isFinite(numeric)) {
        this.logger.warn(`Invalid tax rate for ${state}: ${String(rateRaw)}`);
        return;
      }
      let rate = numeric;
      if (rate > 1) {
        rate = rate / 100;
      }
      if (rate < 0 || rate > 1) {
        this.logger.warn(`Out-of-range tax rate for ${state}: ${rate}`);
        return;
      }
      rates[state] = rate;
    });
    return rates;
  }
}
