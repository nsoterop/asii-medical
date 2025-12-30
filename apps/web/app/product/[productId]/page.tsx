'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../ProductPage.module.css';
import { fetchProduct, ProductResponse } from '../../../lib/catalog-api';
import { addCartItem, dispatchCartUpdate } from '../../../src/lib/cart';
import { addCartItemAuthed } from '../../../src/lib/cart-api';
import { createBrowserSupabaseClient } from '../../../src/lib/supabase/browser';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [selectedSkuId, setSelectedSkuId] = useState<number | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [hasDescriptionOverflow, setHasDescriptionOverflow] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const descriptionRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!productId) return;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchProduct(productId);
        setProduct(response);
        const paramItemId = Number(searchParams.get('itemId'));
        const skuFromParam = response.skus.find((sku) => sku.itemId === paramItemId);
        const defaultSku =
          skuFromParam ||
          response.skus.find(
            (sku) =>
              sku.availabilityRaw?.toLowerCase().includes('stock') &&
              sku.unitPrice !== null &&
              sku.unitPrice !== undefined,
          ) ||
          response.skus[0];
        const nextSkuId = defaultSku?.itemId ?? null;
        setSelectedSkuId(nextSkuId);
        if (nextSkuId && !paramItemId) {
          const params = new URLSearchParams(searchParams.toString());
          params.set('itemId', String(nextSkuId));
          router.replace(`/product/${productId}?${params.toString()}`);
        }
        setError('');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load product.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [productId, router, searchParams]);

  useEffect(() => {
    if (!product) return;
    const paramItemId = Number(searchParams.get('itemId'));
    if (!paramItemId) return;
    if (selectedSkuId === paramItemId) return;
    const skuFromParam = product.skus.find((sku) => sku.itemId === paramItemId);
    if (skuFromParam) {
      setSelectedSkuId(skuFromParam.itemId);
    }
  }, [product, searchParams, selectedSkuId]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(Boolean(data.session?.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const selectSku = (itemId: number) => {
    if (!productId) return;
    setSelectedSkuId(itemId);
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get('itemId');
    if (current === String(itemId)) {
      return;
    }
    params.set('itemId', String(itemId));
    router.replace(`/product/${productId}?${params.toString()}`);
  };

  useEffect(() => {
    if (!product?.productDescription) {
      setHasDescriptionOverflow(false);
      return;
    }
    if (showFullDescription) {
      return;
    }
    if (!descriptionRef.current) {
      return;
    }
    const { scrollHeight, clientHeight } = descriptionRef.current;
    setHasDescriptionOverflow(scrollHeight > clientHeight + 1);
  }, [product?.productDescription, showFullDescription]);

  const selectedSku =
    product?.skus.find((sku) => sku.itemId === selectedSkuId) ?? product?.skus[0] ?? null;
  const selectedTitle =
    selectedSku?.itemDescription || selectedSku?.manufacturerItemCode || product?.productName || '';
  const resolveImageUrl = (rawUrl?: string | null) => {
    if (!rawUrl) return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;
    const normalized = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
    try {
      const url = new URL(normalized);
      return encodeURI(url.toString());
    } catch {
      return null;
    }
  };
  const imageUrl = resolveImageUrl(selectedSku?.itemImageUrl);
  const sortedSkus = useMemo(() => {
    if (!product) {
      return [];
    }
    const inStock = (value: string | null) => value?.toLowerCase().includes('stock') ?? false;
    return [...product.skus].sort((a, b) => {
      const stockA = inStock(a.availabilityRaw);
      const stockB = inStock(b.availabilityRaw);
      if (stockA !== stockB) return stockA ? -1 : 1;
      const priceA = a.unitPrice ? Number(a.unitPrice) : Number.POSITIVE_INFINITY;
      const priceB = b.unitPrice ? Number(b.unitPrice) : Number.POSITIVE_INFINITY;
      if (priceA !== priceB) return priceA - priceB;
      return a.itemId - b.itemId;
    });
  }, [product]);
  const MAX_INLINE_OPTIONS = 6;
  const totalSkus = product?.skus.length ?? 0;
  const shownCount = Math.min(MAX_INLINE_OPTIONS, totalSkus);
  const remaining = Math.max(totalSkus - shownCount, 0);
  const previewSkus = sortedSkus.slice(0, shownCount);

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.loading}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.loading}>{error}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.loading}>No product.</p>
      </div>
    );
  }

  const detailRows: Array<{ label: string; value: string | number | null | undefined }> = [
    { label: 'ItemID', value: selectedSku?.itemId },
    { label: 'Pkg', value: selectedSku?.pkg },
    { label: 'Availability', value: selectedSku?.availabilityRaw },
    { label: 'Manufacturer Item Code', value: selectedSku?.manufacturerItemCode },
    { label: 'NDC', value: selectedSku?.ndcItemCode },
    { label: 'National Drug Code', value: selectedSku?.nationalDrugCode },
    { label: 'UOM Factor', value: selectedSku?.uomFactor },
    { label: 'Unit Weight', value: selectedSku?.unitWeight },
    { label: 'Unit Volume', value: selectedSku?.unitVolume },
    { label: 'Country of Origin', value: selectedSku?.countryOfOrigin },
    { label: 'HazMat Class', value: selectedSku?.hazMatClass },
    { label: 'HazMat Code', value: selectedSku?.hazMatCode },
    { label: 'Harmonized Tariff Code', value: selectedSku?.harmonizedTariffCode },
  ];

  return (
    <div className={styles.wrapper}>
      <section className={styles.heroSection}>
        <div className={styles.heroGrid}>
          <div className={styles.heroImageColumn} data-testid="product-hero-image">
            <div className={styles.imageBox} data-testid="product-image">
              <div className={styles.imageFrame} data-testid="image-frame">
                <div className={styles.imageInner} data-testid="image-inner">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={product.productName}
                      width={200}
                      height={200}
                      className={styles.imageFill}
                      unoptimized
                      priority
                    />
                  ) : (
                    <div className={styles.imagePlaceholder} data-testid="no-image">
                      No image
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.heroContent} data-testid="product-hero-info">
            <h1>{product.productName}</h1>
            <p className={styles.meta}>{product.manufacturerName ?? 'Unknown maker'}</p>
            <h2 className={styles.selectedTitle}>{selectedTitle}</h2>
            {product.productDescription ? (
              <section className={styles.descriptionSection}>
                <h3 className={styles.sectionLabel}>Product description</h3>
                <p
                  ref={descriptionRef}
                  className={`${styles.description} ${
                    showFullDescription ? styles.descriptionExpanded : ''
                  }`}
                >
                  {product.productDescription}
                </p>
                {hasDescriptionOverflow ? (
                  <button
                    type="button"
                    className={styles.readMore}
                    onClick={() => setShowFullDescription((prev) => !prev)}
                  >
                    {showFullDescription ? 'Read less' : 'Read more'}
                  </button>
                ) : null}
              </section>
            ) : null}
          </div>
          <div className={styles.buyColumn} data-testid="product-hero-cart">
            <aside className={styles.buyBox} data-testid="buy-box">
              <div className={styles.price}>
                {selectedSku?.unitPrice
                  ? `$${Number(selectedSku.unitPrice).toFixed(2)}`
                  : 'Price on request'}
              </div>
              <div className={styles.availabilityBadge}>
                {selectedSku?.availabilityRaw ?? 'Availability unknown'}
              </div>
              <select
                className={styles.qtySelect}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                  <option key={value} value={value}>
                    Qty: {value}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.addButton}
                disabled={isAdding}
                onClick={async () => {
                  if (!selectedSku || isAdding) return;
                  const payload = {
                    itemId: selectedSku.itemId,
                    quantity,
                    productId: product.productId,
                    productName: product.productName,
                    itemDescription: selectedSku.itemDescription,
                    manufacturerName: product.manufacturerName,
                    availabilityRaw: selectedSku.availabilityRaw,
                    pkg: selectedSku.pkg,
                    ndcItemCode: selectedSku.ndcItemCode,
                    unitPrice: selectedSku.unitPrice ? Number(selectedSku.unitPrice) : null,
                    imageUrl: selectedSku.itemImageUrl,
                  };
                  if (isLoggedIn) {
                    try {
                      setIsAdding(true);
                      await addCartItemAuthed(payload);
                    } finally {
                      dispatchCartUpdate();
                      setIsAdding(false);
                    }
                    return;
                  }
                  addCartItem(payload);
                }}
              >
                {isAdding ? <span className={styles.addSpinner} /> : 'Add to cart'}
              </button>
            </aside>
          </div>
        </div>
      </section>

      <section className={styles.purchaseSection}>
        <h3 className={styles.sectionLabel}>Options</h3>
        <div className={styles.purchaseGrid}>
          <div className={styles.optionsColumn} data-testid="options-table">
            <div className={styles.optionsCard} data-testid="options-table-card">
              <div className={styles.optionsBody}>
                <table className={styles.optionsTable} data-testid="product-options-table">
                  <thead>
                    <tr className={styles.optionsHeadRow}>
                      <th className={styles.colDescription}>DESCRIPTION</th>
                      <th className={styles.colPkg}>Pkg</th>
                      <th className={styles.colPrice}>Price</th>
                      <th className={styles.colAvailability}>Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewSkus.map((sku) => (
                      <tr
                        key={sku.itemId}
                        className={`${styles.optionsRow} ${
                          selectedSkuId === sku.itemId ? styles.optionsSelected : ''
                        }`}
                        onClick={() => selectSku(sku.itemId)}
                        role="button"
                        tabIndex={0}
                      >
                        <td className={styles.colDescription}>
                          <span className={styles.truncateText}>
                            {sku.itemDescription || product.productName}
                          </span>
                        </td>
                        <td className={styles.colPkg}>{sku.pkg ?? '—'}</td>
                        <td className={styles.colPrice}>
                          {sku.unitPrice
                            ? `$${Number(sku.unitPrice).toFixed(2)}`
                            : 'Price on request'}
                        </td>
                        <td className={styles.colAvailability}>{sku.availabilityRaw ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {remaining > 0 ? (
                  <div className={styles.moreOptionsRow}>
                    <Link
                      className="text-link"
                      href={`/product/${product.productId}/options?itemId=${selectedSku?.itemId ?? ''}`}
                    >
                      See {remaining} more option{remaining === 1 ? '' : 's'}
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className={styles.buyStack}>
            <div className={styles.detailsCard} data-testid="details-block">
              <h3 className={styles.sectionLabel}>Details</h3>
              <div className={styles.detailsGrid}>
                {detailRows
                  .filter(
                    (row) => row.value !== null && row.value !== undefined && row.value !== '',
                  )
                  .map((row) => (
                    <div key={row.label} className={styles.detailRow}>
                      <span className={styles.detailLabel}>{row.label}</span>
                      <span className={styles.detailValue}>{row.value}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
