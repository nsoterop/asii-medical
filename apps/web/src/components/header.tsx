'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './header.module.css';
import type { SearchResponse } from '../../lib/catalog-api';
import CartPopover from './cart-popover';
import ProfilePopover from './profile-popover';

type Suggestion = SearchResponse['hits'][number];

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 250);
  const hideSearch = pathname === '/search' || pathname === '/login' || pathname === '/signup';
  const hideBrowse = pathname === '/search';

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    let active = true;
    const run = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          q: debouncedQuery.trim(),
          page: '1',
          pageSize: '5',
        });
        const response = await fetch(`/api/catalog/search?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Search failed');
        }
        const data = (await response.json()) as SearchResponse;
        if (!active) return;
        setResults(data.hits.slice(0, 5));
        setHighlightedIndex(-1);
        setIsOpen(true);
      } catch {
        if (!active) return;
        setResults([]);
        setHighlightedIndex(-1);
        setIsOpen(true);
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const hasQuery = debouncedQuery.trim().length >= 2;
  const rawQuery = query.trim();
  const showDropdown = isOpen && hasQuery;
  const showFooter = hasQuery;
  const showEmpty = hasQuery && !isLoading && results.length === 0;

  const onSelect = (item: Suggestion) => {
    setIsOpen(false);
    setQuery('');
    const itemIdParam = item.skuItemId ? `?itemId=${encodeURIComponent(item.skuItemId)}` : '';
    router.push(`/product/${item.productId}${itemIdParam}`);
  };

  const onSearchAll = () => {
    if (rawQuery.length < 2) return;
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(rawQuery)}`);
  };

  const highlightedItem = useMemo(() => {
    if (highlightedIndex < 0 || highlightedIndex >= results.length) {
      return null;
    }
    return results[highlightedIndex];
  }, [highlightedIndex, results]);

  return (
    <header className={styles.header} ref={containerRef}>
      <div className={`layout-container ${styles.headerInner}`}>
        <div className={styles.headerRow}>
          <Link href="/" className={`${styles.brand} py-2 text-link`}>
            ASii Medical
          </Link>
          <div className={styles.headerSpacer} />
          <div className={styles.headerActions}>
            {!hideSearch ? (
              <form
                className={styles.searchPill}
                onSubmit={(event) => {
                  event.preventDefault();
                  onSearchAll();
                }}
              >
                <button
                  type="submit"
                  className={styles.searchIconButton}
                  aria-label="Search"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm7.7 12.3 3.5 3.5a1 1 0 0 1-1.4 1.4l-3.5-3.5a1 1 0 0 1 1.4-1.4Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
                <input
                  className={styles.searchInput}
                  placeholder="Search"
                  value={query}
                  data-testid="header-search-input"
                  onChange={(event) => {
                    const next = event.target.value;
                    setQuery(next);
                    if (next.trim().length >= 2) {
                      setIsOpen(true);
                    } else {
                      setIsOpen(false);
                    }
                  }}
                  onFocus={() => {
                    if (query.trim().length >= 2) {
                      setIsOpen(true);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      if (results.length === 0) return;
                      event.preventDefault();
                      setIsOpen(true);
                      setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1));
                    } else if (event.key === 'ArrowUp') {
                      if (results.length === 0) return;
                      event.preventDefault();
                      setIsOpen(true);
                      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
                    } else if (event.key === 'Enter') {
                      if (rawQuery.length < 2) return;
                      event.preventDefault();
                      if (highlightedItem) {
                        onSelect(highlightedItem);
                      } else {
                        onSearchAll();
                      }
                    } else if (event.key === 'Escape') {
                      setIsOpen(false);
                    }
                  }}
                />

                {showDropdown ? (
                  <div className={styles.dropdown} data-testid="search-suggestions">
                    {isLoading ? (
                      <div className={styles.dropdownMessage}>Searching...</div>
                    ) : null}
                    {!isLoading &&
                      results.map((item, index) => (
                        <button
                          type="button"
                          key={`${item.productId}-${item.skuItemId}`}
                          className={`${styles.dropdownItem} ${
                            highlightedIndex === index ? styles.dropdownItemActive : ''
                          }`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => onSelect(item)}
                          data-testid="search-suggestion"
                        >
                          <div className={styles.itemTitle}>{item.productName}</div>
                          {item.manufacturerName ? (
                            <div className={styles.itemMeta}>{item.manufacturerName}</div>
                          ) : null}
                          {item.itemDescription ? (
                            <div className={styles.itemDesc}>{item.itemDescription}</div>
                          ) : null}
                        </button>
                      ))}
                    {showEmpty ? <div className={styles.dropdownMessage}>No results</div> : null}
                    {showFooter ? (
                      <button
                        type="button"
                        className={styles.dropdownFooter}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={onSearchAll}
                        data-testid="search-show-all"
                      >
                        Show all results
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </form>
            ) : null}
            {hideBrowse ? null : (
              <Link href="/search" className={styles.browseButton}>
                Browse
              </Link>
            )}
            <ProfilePopover />
            <CartPopover />
          </div>
        </div>
      </div>
    </header>
  );
}
