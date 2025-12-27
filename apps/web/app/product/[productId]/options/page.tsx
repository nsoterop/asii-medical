'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../../ProductPage.module.css';
import { fetchProduct, ProductResponse } from '../../../../lib/catalog-api';

export default function ProductOptionsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!productId) return;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchProduct(productId);
        setProduct(response);
        setError('');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load product.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [productId]);

  const onSelect = (itemId: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('itemId', String(itemId));
    router.push(`/product/${productId}?${params.toString()}`);
  };

  if (loading) {
    return <div className={styles.wrapper}><p className={styles.loading}>Loading...</p></div>;
  }

  if (error) {
    return <div className={styles.wrapper}><p className={styles.loading}>{error}</p></div>;
  }

  if (!product) {
    return <div className={styles.wrapper}><p className={styles.loading}>No product.</p></div>;
  }

  return (
    <div className={styles.wrapper}>
      <Link
        className={styles.secondaryButton}
        href={`/product/${product.productId}${
          searchParams.get('itemId') ? `?itemId=${searchParams.get('itemId')}` : ''
        }`}
      >
        Back to product
      </Link>
      <h1>{product.productName}</h1>
      <div className={styles.skuList}>
        {product.skus.map((sku) => (
          <div
            key={sku.itemId}
            className={styles.skuCard}
            onClick={() => onSelect(sku.itemId)}
            role="button"
            tabIndex={0}
          >
            <div className={styles.skuCardGrid}>
              <div className={styles.thumbnail}>
                {sku.itemImageUrl ? (
                  <Image
                    src={sku.itemImageUrl}
                    alt={sku.itemDescription || product.productName}
                    width={96}
                    height={96}
                    className={styles.thumbnailImage}
                    unoptimized
                  />
                ) : (
                  <span className={styles.thumbnailPlaceholder}>No image</span>
                )}
              </div>
              <div className={styles.skuRow}>
                <div>
                  <p className={styles.skuTitle}>{sku.itemDescription || product.productName}</p>
                  {sku.manufacturerItemCode ? (
                    <p className={styles.skuSubtext}>Mfr Code: {sku.manufacturerItemCode}</p>
                  ) : null}
                  {sku.pkg ? <p className={styles.skuSubtext}>Pkg: {sku.pkg}</p> : null}
                  <p className={styles.skuSubtext}>
                    Availability: {sku.availabilityRaw ?? 'Availability unknown'}
                  </p>
                  <p className={styles.skuSubtext}>SKU: {sku.itemId}</p>
                  <div className={styles.skuBadges}>
                    {sku.availabilityRaw ? (
                      <span className={styles.badge}>{sku.availabilityRaw}</span>
                    ) : null}
                    {sku.pkg ? <span className={styles.badge}>{sku.pkg}</span> : null}
                  </div>
                </div>
                <div className={styles.price}>
                  {sku.unitPrice ? `$${Number(sku.unitPrice).toFixed(2)}` : 'Price on request'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
