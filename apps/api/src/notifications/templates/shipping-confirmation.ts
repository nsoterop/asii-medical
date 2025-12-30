import { formatDate } from './utils';

export type ShippingConfirmationData = {
  orderId: string;
  shippedAt?: Date | string | null;
  carrier?: string | null;
  service?: string | null;
  trackingNo?: string | null;
  trackingUrl?: string | null;
};

export const buildShippingConfirmation = (data: ShippingConfirmationData) => {
  const subject = `Your order #${data.orderId} has shipped`;
  const shippedDate = formatDate(data.shippedAt) || 'Today';
  const trackingLine = data.trackingNo
    ? `Tracking number: ${data.trackingNo}`
    : 'Tracking information will be provided soon.';

  const carrierLine = [data.carrier, data.service].filter(Boolean).join(' • ');

  const trackingLink = data.trackingUrl
    ? `<p style="margin: 8px 0 0;"><a href="${data.trackingUrl}">Track your shipment</a></p>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="margin: 0 0 12px;">Your order is on the way!</h2>
      <p style="margin: 0 0 16px;">Order <strong>#${data.orderId}</strong> shipped on ${shippedDate}.</p>
      ${carrierLine ? `<p style="margin: 0 0 8px;">${carrierLine}</p>` : ''}
      <p style="margin: 0 0 8px;">${trackingLine}</p>
      ${trackingLink}
      <p style="margin: 16px 0 0; font-size: 13px; color: #444;">
        If you have any questions, reply to this email or contact support.
      </p>
    </div>
  `;

  const text = `Your order #${data.orderId} shipped on ${shippedDate}.\n${carrierLine ? `${carrierLine}\n` : ''}${trackingLine}\n${data.trackingUrl ? `Track: ${data.trackingUrl}\n` : ''}`;

  return { subject, html, text };
};
