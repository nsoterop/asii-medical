import Link from 'next/link';
import { formatCurrency } from '../../lib/format';
import styles from './cart.module.css';

type OrderSummaryCardProps = {
  subtotal: number;
  canCheckout?: boolean;
};

export default function OrderSummaryCard({ subtotal, canCheckout }: OrderSummaryCardProps) {
  return (
    <div className={styles.summaryCard} data-testid="order-summary">
      <h2 className={styles.summaryTitle}>Order summary</h2>
      <div className={styles.summaryRow}>
        <span>Subtotal</span>
        <span data-testid="summary-subtotal">{formatCurrency(subtotal)}</span>
      </div>
      <div className={styles.summaryRow}>
        <span>Estimated tax</span>
        <span>{formatCurrency(0)}</span>
      </div>
      <div className={styles.summaryRow}>
        <span>Shipping</span>
        <span>Calculated at checkout</span>
      </div>
      <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
        <span>Total</span>
        <span data-testid="summary-total">{formatCurrency(subtotal)}</span>
      </div>
      {canCheckout ? (
        <Link className={styles.summaryButton} href="/checkout">
          Checkout
        </Link>
      ) : (
        <button type="button" className={styles.summaryButton} disabled>
          Checkout
        </button>
      )}
      <Link className={`${styles.summaryLink} text-link`} href="/search">
        Continue shopping
      </Link>
    </div>
  );
}
