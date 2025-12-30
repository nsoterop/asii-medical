import Link from 'next/link';
import { CartItem } from '../../lib/cart';
import { formatCurrency } from '../../lib/format';
import styles from './cart.module.css';

type CartItemCardProps = {
  item: CartItem;
  onQuantityChange: (itemId: number, quantity: number) => void;
  onRemove: (itemId: number) => void;
};

const getAvailabilityClass = (availability?: string | null) => {
  if (!availability) return styles.availabilityBadgeWarn;
  return availability.toLowerCase().includes('stock')
    ? styles.availabilityBadge
    : styles.availabilityBadgeWarn;
};

export default function CartItemCard({ item, onQuantityChange, onRemove }: CartItemCardProps) {
  const lineTotal =
    item.unitPrice === null || item.unitPrice === undefined ? null : item.unitPrice * item.quantity;
  const productLabel = item.productName || item.itemDescription || `Item ${item.itemId}`;
  const availabilityLabel = item.availabilityRaw ?? 'Availability unknown';
  const ndcLabel = item.ndcItemCode ? `NDC Item Code: ${item.ndcItemCode}` : 'NDC Item Code: —';

  return (
    <div className={styles.card} data-testid="cart-item-card">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={productLabel} className={styles.cardImage} />
      ) : (
        <div className={styles.cardImage} />
      )}
      <div>
        <h2 className={styles.cardTitle}>
          {item.productId ? (
            <Link href={`/product/${item.productId}`} className="text-link">
              {productLabel}
            </Link>
          ) : (
            productLabel
          )}
        </h2>
        <p className={styles.cardMeta}>{item.manufacturerName ?? 'Unknown maker'}</p>
        <div className={getAvailabilityClass(availabilityLabel)}>{availabilityLabel}</div>
        <p className={styles.cardMeta}>{ndcLabel}</p>
        {item.pkg ? <p className={styles.cardMeta}>Pkg: {item.pkg}</p> : null}
        <p className={styles.cardMeta}>
          {item.unitPrice !== null && item.unitPrice !== undefined
            ? formatCurrency(item.unitPrice)
            : 'Price on request'}
        </p>
      </div>
      <div className={styles.cardActions}>
        <div className={styles.lineTotal} data-testid="line-total">
          {lineTotal !== null ? formatCurrency(lineTotal) : '—'}
        </div>
        <label className={styles.qtyRow}>
          <span className={styles.qtyLabel}>Qty</span>
          <input
            className={styles.qtyInput}
            type="number"
            min={1}
            max={99}
            value={item.quantity}
            data-testid={`cart-qty-${item.itemId}`}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isNaN(next)) return;
              onQuantityChange(item.itemId, Math.min(99, Math.max(1, next)));
            }}
          />
        </label>
        <button
          type="button"
          className={styles.removeButton}
          data-testid={`cart-remove-${item.itemId}`}
          onClick={() => onRemove(item.itemId)}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
