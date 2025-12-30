import { Injectable, Logger } from '@nestjs/common';
import { getEnv } from '../env';
import {
  buildOrderConfirmation,
  type OrderConfirmationData
} from './templates/order-confirmation';
import {
  buildShippingConfirmation,
  type ShippingConfirmationData
} from './templates/shipping-confirmation';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

class LogEmailProvider implements EmailProvider {
  private readonly logger = new Logger(LogEmailProvider.name);

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(`Email queued to ${message.to}: ${message.subject}`);
  }
}

class ResendEmailProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly from: string;

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey;
    this.from = from;
  }

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Resend error: ${response.status} ${text}`);
    }
  }
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: EmailProvider;

  constructor() {
    const env = getEnv();
    const providerName = env.EMAIL_PROVIDER;

    if (providerName === 'resend') {
      if (!env.EMAIL_FROM || !env.RESEND_API_KEY) {
        throw new Error('EMAIL_FROM and RESEND_API_KEY are required for Resend.');
      }
      this.provider = new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM);
    } else {
      this.provider = new LogEmailProvider();
    }
  }

  async sendOrderConfirmation(toEmail: string | null | undefined, data: OrderConfirmationData) {
    if (!toEmail) {
      this.logger.warn('Order confirmation email skipped: missing recipient.');
      return;
    }
    const message = buildOrderConfirmation(data);
    await this.provider.send({ to: toEmail, ...message });
  }

  async sendShippingConfirmation(
    toEmail: string | null | undefined,
    data: ShippingConfirmationData
  ) {
    if (!toEmail) {
      this.logger.warn('Shipping confirmation email skipped: missing recipient.');
      return;
    }
    const message = buildShippingConfirmation(data);
    await this.provider.send({ to: toEmail, ...message });
  }
}
