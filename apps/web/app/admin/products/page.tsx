'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getAdminProductByItemId,
  updateAdminProductByItemId,
  type AdminProductUpdate,
} from '../../../lib/admin-api';

const formatPrice = (price: number | null) => {
  if (price === null || price === undefined) return '';
  return Number.isFinite(price) ? price.toFixed(2) : '';
};

const parsePrice = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const validateImageUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'Enter a valid http(s) URL.';
    }
  } catch {
    return 'Enter a valid URL.';
  }
  return '';
};

export default function AdminProductUpdatesPage() {
  const [itemId, setItemId] = useState('');
  const [product, setProduct] = useState<AdminProductUpdate | null>(null);
  const [form, setForm] = useState({ price: '', imageUrl: '' });
  const [initialForm, setInitialForm] = useState({ price: '', imageUrl: '' });
  const [touched, setTouched] = useState({ price: false, imageUrl: false });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const priceError = useMemo(() => {
    if (!product) return '';
    const trimmed = form.price.trim();
    if (!trimmed) return 'Price is required.';
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return 'Enter a valid price.';
    if (parsed < 0 || parsed > 1_000_000) return 'Price must be between 0 and 1,000,000.';
    return '';
  }, [form.price, product]);

  const imageUrlError = useMemo(() => {
    if (!product) return '';
    return validateImageUrl(form.imageUrl);
  }, [form.imageUrl, product]);

  const isDirty = useMemo(() => {
    if (!product) return false;
    return form.price.trim() !== initialForm.price || form.imageUrl.trim() !== initialForm.imageUrl;
  }, [form, initialForm, product]);

  const hasErrors = Boolean(priceError || imageUrlError);

  const onSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = itemId.trim();
    if (!trimmed) {
      setError('Enter an Item ID to search.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const data = await getAdminProductByItemId(trimmed);
      setProduct(data);
      const nextForm = {
        price: formatPrice(data.price),
        imageUrl: data.imageUrl ?? '',
      };
      setForm(nextForm);
      setInitialForm(nextForm);
      setTouched({ price: false, imageUrl: false });
      setSubmitted(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to find that item.';
      setError(message);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    if (!product) return;
    setSubmitted(true);
    if (hasErrors) {
      return;
    }

    const parsedPrice = parsePrice(form.price);
    if (parsedPrice === null) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const updated = await updateAdminProductByItemId(product.itemId, {
        price: parsedPrice,
        imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : null,
      });
      setProduct(updated);
      const nextForm = {
        price: formatPrice(updated.price),
        imageUrl: updated.imageUrl ?? '',
      };
      setForm(nextForm);
      setInitialForm(nextForm);
      setTouched({ price: false, imageUrl: false });
      setSubmitted(false);
      setSuccess('Saved');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save updates.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const showPriceError = (touched.price || submitted) && priceError;
  const showImageError = (touched.imageUrl || submitted) && imageUrlError;

  return (
    <div className="admin-shell admin-shell-wide">
      <div className="admin-row" style={{ justifyContent: 'space-between' }}>
        <div className="admin-row">
          <Link href="/admin/imports" className="admin-link">
            Imports
          </Link>
          <Link href="/admin/orders" className="admin-link">
            Orders
          </Link>
          <Link href="/admin/products" className="admin-link active">
            Product Updates
          </Link>
        </div>
      </div>

      <h1>Product Updates</h1>

      <div className="admin-card">
        <form onSubmit={onSearch} className="admin-row">
          <input
            className="admin-input"
            placeholder="Item ID"
            value={itemId}
            onChange={(event) => setItemId(event.target.value)}
            data-testid="product-search-input"
          />
          <button
            className="admin-button"
            type="submit"
            disabled={loading}
            data-testid="product-search-button"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {error ? <p className="admin-error">{error}</p> : null}
      </div>

      {product ? (
        <div className="admin-card">
          <div className="admin-row" style={{ justifyContent: 'space-between' }}>
            <strong>Item details</strong>
            <span className="admin-muted">Item ID {product.itemId}</span>
          </div>

          <div className="admin-grid admin-grid-wide">
            <label className="admin-field">
              Product name
              <input
                className="admin-input"
                value={product.productName}
                readOnly
                data-testid="product-name"
              />
            </label>
            <label className="admin-field">
              Item name
              <input
                className="admin-input"
                value={product.itemName}
                readOnly
                data-testid="item-name"
              />
            </label>
            <label className="admin-field">
              Manufacturer
              <input
                className="admin-input"
                value={product.manufacturerName ?? '—'}
                readOnly
                data-testid="manufacturer-name"
              />
            </label>
            <label className="admin-field">
              NDC item code
              <input
                className="admin-input"
                value={product.ndcItemCode ?? '—'}
                readOnly
                data-testid="ndc-item-code"
              />
            </label>
            <label className="admin-field">
              Category path
              <input
                className="admin-input"
                value={product.categoryPathName ?? '—'}
                readOnly
                data-testid="category-path"
              />
            </label>
            <label className="admin-field">
              SKU ID
              <input
                className="admin-input"
                value={String(product.skuId)}
                readOnly
                data-testid="sku-id"
              />
            </label>
            <label className="admin-field">
              Product ID
              <input
                className="admin-input"
                value={String(product.productId)}
                readOnly
                data-testid="product-id"
              />
            </label>
          </div>

          <div className="admin-divider" />

          <div className="admin-grid admin-grid-wide">
            <label className="admin-field">
              Price ({product.currency})
              <input
                className="admin-input"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, price: event.target.value }));
                  setSuccess('');
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, price: true }))}
                data-testid="price-input"
              />
              {showPriceError ? <span className="admin-error">{priceError}</span> : null}
            </label>
            <label className="admin-field">
              Image URL
              <input
                className="admin-input"
                type="url"
                value={form.imageUrl}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, imageUrl: event.target.value }));
                  setSuccess('');
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, imageUrl: true }))}
                data-testid="image-url-input"
              />
              {showImageError ? <span className="admin-error">{imageUrlError}</span> : null}
            </label>
          </div>

          <div className="admin-actions">
            <button
              type="button"
              className="admin-button"
              onClick={onSave}
              disabled={!isDirty || hasErrors || saving}
              data-testid="save-button"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            {success ? <span className="admin-muted">{success}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
