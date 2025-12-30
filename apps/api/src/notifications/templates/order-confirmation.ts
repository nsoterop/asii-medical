import { formatDate, formatMoney } from './utils';

export type OrderConfirmationItem = {
  name: string;
  qty: number;
  unitPrice: number | string;
};

export type OrderConfirmationData = {
  orderId: string;
  createdAt: Date | string;
  currency: string;
  total: number | string;
  items: OrderConfirmationItem[];
};

export const buildOrderConfirmation = (data: OrderConfirmationData) => {
  const subject = `Order confirmation #${data.orderId}`;
  const orderDate = formatDate(data.createdAt) || 'Today';
  const total = formatMoney(data.total, data.currency);

  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 6px 0;">${item.name}</td>
        <td style="padding: 6px 0; text-align: center;">${item.qty}</td>
        <td style="padding: 6px 0; text-align: right;">${formatMoney(item.unitPrice, data.currency)}</td>
      </tr>
    `
    )
    .join('');

  const textItems = data.items
    .map((item) => `- ${item.name} x${item.qty} (${formatMoney(item.unitPrice, data.currency)})`)
    .join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="margin: 0 0 12px;">Thanks for your order!</h2>
      <p style="margin: 0 0 16px;">Order <strong>#${data.orderId}</strong> placed on ${orderDate}.</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left; padding-bottom: 8px; border-bottom: 1px solid #eee;">Item</th>
            <th style="text-align: center; padding-bottom: 8px; border-bottom: 1px solid #eee;">Qty</th>
            <th style="text-align: right; padding-bottom: 8px; border-bottom: 1px solid #eee;">Unit price</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
      <p style="margin: 16px 0 0; font-weight: 600;">Total: ${total}</p>
      <p style="margin: 16px 0 0; font-size: 13px; color: #444;">
        If you have any questions, reply to this email or contact support.
      </p>
    </div>
  `;

  const text = `Thanks for your order!\nOrder #${data.orderId} placed on ${orderDate}.\n\n${textItems}\n\nTotal: ${total}\n`;

  return { subject, html, text };
};
