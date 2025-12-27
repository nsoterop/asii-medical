'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './SearchPage.module.css';
import {
  fetchCatalogSearch,
  fetchCategoryTree,
  CategoryNode,
  SearchFilters,
  SearchResponse
} from '../../lib/catalog-api';

const PAGE_SIZE = 12;
const MAX_VISIBLE_MANUFACTURERS = 8;
type CategoryTreeNode = CategoryNode & { children: CategoryTreeNode[] };
type SidebarCategoryRow = {
  path: string;
  name: string;
  depth: number;
  topLevelName: string;
  isSelected: boolean;
};

const getMultiParam = (params: ReturnType<typeof useSearchParams>, key: string) =>
  params.getAll(key);

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const [page, setPage] = useState(Number(searchParams.get('page') || '1'));
  const [filters, setFilters] = useState<SearchFilters>({});
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManufacturerModal, setShowManufacturerModal] = useState(false);
  const [manufacturerSearch, setManufacturerSearch] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalSearch, setCategoryModalSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryTreeData, setCategoryTreeData] = useState<CategoryNode[]>([]);
  const [categoryTreeLoading, setCategoryTreeLoading] = useState(false);
  const [categoryTreeLoaded, setCategoryTreeLoaded] = useState(false);
  const [categoryTreeError, setCategoryTreeError] = useState('');

  const facets = data?.facets || {};
  const selectedManufacturerList = useMemo(
    () => getMultiParam(searchParams, 'manufacturer'),
    [searchParams]
  );
  const selectedCategoryList = useMemo(() => getMultiParam(searchParams, 'category'), [searchParams]);
  const selectedManufacturers = useMemo(
    () => new Set(selectedManufacturerList),
    [selectedManufacturerList.join('|')]
  );
  const selectedCategories = useMemo(
    () => new Set(selectedCategoryList),
    [selectedCategoryList.join('|')]
  );
  const manufacturerOptions = useMemo(() => {
    return Object.entries(facets.manufacturerName || {}).map(([name]) => ({
      name
    }));
  }, [facets.manufacturerName]);

  const categoryTreeNormalized = useMemo<CategoryTreeNode[]>(() => {
    const castNode = (node: CategoryNode): CategoryTreeNode => ({
      ...node,
      children: node.children.map(castNode)
    });
    return categoryTreeData.map(castNode);
  }, [categoryTreeData]);

  const categoryNodeMap = useMemo(() => {
    const map = new Map<string, CategoryTreeNode>();
    const walk = (node: CategoryTreeNode) => {
      map.set(node.path, node);
      node.children.forEach(walk);
    };
    categoryTreeNormalized.forEach(walk);
    return map;
  }, [categoryTreeNormalized]);

  const selectedCategorySet = selectedCategories;

  const categoryRootOptions = useMemo(() => {
    return categoryTreeNormalized.map((node) => ({
      path: node.path,
      name: node.name,
      depth: node.depth,
      topLevelName: node.name,
      isSelected: selectedCategorySet.has(node.path)
    }));
  }, [categoryTreeNormalized, selectedCategorySet]);

  const sortedRootOptions = useMemo(() => {
    return categoryRootOptions
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categoryRootOptions]);
  const hasNestedCategories = categoryNodeMap.size > categoryRootOptions.length;
  const shouldShowCategoryModal =
    categoryRootOptions.length > MAX_VISIBLE_MANUFACTURERS || hasNestedCategories;
  const selectedManufacturerSet = selectedManufacturers;
  const visibleManufacturers = useMemo(() => {
    const selected = manufacturerOptions.filter((option) =>
      selectedManufacturerSet.has(option.name)
    );
    const unselected = manufacturerOptions.filter(
      (option) => !selectedManufacturerSet.has(option.name)
    );
    return [...selected, ...unselected].slice(0, MAX_VISIBLE_MANUFACTURERS);
  }, [manufacturerOptions, selectedManufacturerSet]);
  const selectedCategoryRows = useMemo<SidebarCategoryRow[]>(() => {
    return selectedCategoryList.map((path) => {
      const node = categoryNodeMap.get(path);
      const fallbackName = path.split('>').slice(-1)[0];
      return {
        path,
        name: node?.name ?? fallbackName,
        depth: node?.depth ?? path.split('>').length,
        topLevelName: path.split('>')[0],
        isSelected: true
      };
    });
  }, [selectedCategoryList, categoryNodeMap]);

  const visibleCategories = useMemo(() => {
    const topLevelRows = sortedRootOptions.filter((row) => !selectedCategorySet.has(row.path));
    const merged = selectedCategoryRows.length
      ? [...selectedCategoryRows, ...topLevelRows]
      : topLevelRows;
    return merged.slice(0, MAX_VISIBLE_MANUFACTURERS);
  }, [selectedCategoryRows, sortedRootOptions, selectedCategorySet]);
  const filteredManufacturers = useMemo(() => {
    const term = manufacturerSearch.trim().toLowerCase();
    if (!term) return manufacturerOptions;
    return manufacturerOptions.filter((option) => option.name.toLowerCase().includes(term));
  }, [manufacturerOptions, manufacturerSearch]);

  const expandedCategoryPaths = useMemo(() => {
    const expanded = new Set<string>();
    const collect = (node: CategoryTreeNode) => {
      expanded.add(node.path);
      node.children.forEach(collect);
    };
    selectedCategoryList.forEach((path) => {
      const node = categoryNodeMap.get(path);
      if (node) {
        collect(node);
      } else {
        expanded.add(path);
      }
    });
    return Array.from(expanded);
  }, [selectedCategoryList, categoryNodeMap]);

  const derivedFilters = useMemo<SearchFilters>(() => {
    return {
      ...filters,
      manufacturerName: selectedManufacturerList.length ? selectedManufacturerList : undefined,
      categoryPathName: expandedCategoryPaths.length ? expandedCategoryPaths : undefined
    };
  }, [filters, expandedCategoryPaths, selectedManufacturerList]);

  const syncSearchParams = (
    nextQuery: string,
    nextPage: number,
    manufacturers: string[],
    categories: string[]
  ) => {
    const params = new URLSearchParams();
    if (nextQuery) {
      params.set('q', nextQuery);
    }
    params.set('page', String(nextPage));
    manufacturers.forEach((value) => params.append('manufacturer', value));
    categories.forEach((value) => params.append('category', value));
    const next = params.toString();
    if (next !== searchParams.toString()) {
      router.replace(`/search?${next}`);
    }
  };

  const setMultiParam = (key: string, values: string[]) => {
    if (key === 'manufacturer') {
      syncSearchParams(query, page, values, selectedCategoryList);
      return;
    }
    if (key === 'category') {
      syncSearchParams(query, page, selectedManufacturerList, values);
    }
  };

  const toggleMultiParamValue = (key: string, value: string) => {
    const current = new Set(getMultiParam(searchParams, key));
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    setMultiParam(key, Array.from(current));
  };

  const clearMultiParam = (key: string) => {
    setMultiParam(key, []);
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await fetchCatalogSearch(query, page, PAGE_SIZE, derivedFilters);
      setData(response);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch results.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };


  const derivedFiltersKey = useMemo(
    () =>
      JSON.stringify({
        manufacturer: selectedManufacturerList.slice().sort(),
        category: expandedCategoryPaths.slice().sort(),
        filters
      }),
    [expandedCategoryPaths, filters, selectedManufacturerList]
  );

  useEffect(() => {
    fetchResults();
  }, [query, page, derivedFiltersKey]);

  useEffect(() => {
    syncSearchParams(query, page, selectedManufacturerList, selectedCategoryList);
  }, [query, page, selectedCategoryList, selectedManufacturerList]);

  useEffect(() => {
    if (!showManufacturerModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowManufacturerModal(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showManufacturerModal]);

  useEffect(() => {
    if (categoryTreeLoaded) return;
    let active = true;
    setCategoryTreeLoading(true);
    fetchCategoryTree()
      .then((tree) => {
        if (!active) return;
        setCategoryTreeData(tree);
        setCategoryTreeError('');
      })
      .catch((err) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Failed to load categories.';
        setCategoryTreeError(message);
      })
      .finally(() => {
        if (!active) return;
        setCategoryTreeLoaded(true);
        setCategoryTreeLoading(false);
      });
    return () => {
      active = false;
    };
  }, [categoryTreeLoaded]);

  useEffect(() => {
    if (!showCategoryModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCategoryModal(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showCategoryModal]);

  const toggleFilter = (key: keyof SearchFilters, value: string) => {
    setFilters((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const exists = current.includes(value);
      const next = exists ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const updatePriceRange = (key: 'minPrice' | 'maxPrice', value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value ? Number(value) : undefined
    }));
  };

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  }, [data]);

  const pageItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    const items: Array<number | 'ellipsis'> = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) {
      items.push('ellipsis');
    }
    for (let current = start; current <= end; current += 1) {
      items.push(current);
    }
    if (end < totalPages - 1) {
      items.push('ellipsis');
    }
    items.push(totalPages);
    return items;
  }, [page, totalPages]);

  const categoryTree = useMemo(() => categoryTreeNormalized, [categoryTreeNormalized]);

  const selectedCategoryAncestors = useMemo(() => {
    const ancestors = new Set<string>();
    selectedCategories.forEach((path) => {
      const segments = path.split('>');
      segments.forEach((_, index) => {
        ancestors.add(segments.slice(0, index + 1).join('>'));
      });
    });
    return Array.from(ancestors);
  }, [selectedCategories]);

  useEffect(() => {
    if (!showCategoryModal) return;
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      selectedCategoryAncestors.forEach((path) => next.add(path));
      return next;
    });
  }, [showCategoryModal, selectedCategoryAncestors]);

  const matchesTree = useMemo(() => {
    const term = categoryModalSearch.trim().toLowerCase();
    if (term.length < 2) return null;
    const matches = new Set<string>();
    const ancestors = new Set<string>();
    const allPaths = Array.from(categoryNodeMap.keys());
    allPaths.forEach((path) => {
      if (path.toLowerCase().includes(term)) {
        matches.add(path);
        path.split('>').forEach((_, index, arr) => {
          ancestors.add(arr.slice(0, index + 1).join('>'));
        });
      }
    });
    return { matches, ancestors };
  }, [categoryModalSearch, categoryNodeMap]);

  useEffect(() => {
    if (!matchesTree) return;
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      matchesTree.ancestors.forEach((path) => next.add(path));
      return next;
    });
  }, [matchesTree]);

  const toggleExpanded = (path: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderLabel = (name: string) => {
    const term = categoryModalSearch.trim();
    if (term.length < 2) return name;
    const lower = name.toLowerCase();
    const idx = lower.indexOf(term.toLowerCase());
    if (idx === -1) return name;
    return (
      <>
        {name.slice(0, idx)}
        <span className={styles.categoryHighlight}>
          {name.slice(idx, idx + term.length)}
        </span>
        {name.slice(idx + term.length)}
      </>
    );
  };

  const renderTree = (nodes: CategoryTreeNode[], depth = 0) =>
    nodes.map((node) => {
      const isExpanded = expandedCategories.has(node.path);
      const hasChildren = node.children.length > 0;
      const includeNode =
        !matchesTree ||
        matchesTree.matches.has(node.path) ||
        matchesTree.ancestors.has(node.path);
      if (!includeNode) {
        return null;
      }
      return (
        <div
          key={node.path}
          className={styles.categoryTreeRow}
          data-testid="category-tree-row"
          data-category-path={node.path}
        >
          <div
            className={styles.categoryTreeRowInner}
            onClick={() => {
              if (hasChildren) {
                toggleExpanded(node.path);
              } else {
                toggleMultiParamValue('category', node.path);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className={styles.categoryTreeLeft} style={{ paddingLeft: depth * 16 }}>
              <span className={styles.treeCaretSlot}>
                {hasChildren ? (
                  <span
                    className={`${styles.treeChevron} ${
                      isExpanded ? styles.treeChevronExpanded : ''
                    }`}
                    data-testid="category-tree-chevron"
                  >
                    ▸
                  </span>
                ) : (
                  <span className={styles.treeChevronPlaceholder} />
                )}
              </span>
              <span
                className={`${styles.categoryTreeLabel} ${
                  selectedCategories.has(node.path) ? styles.categoryTreeSelected : ''
                }`}
              >
                {renderLabel(node.name)}
              </span>
            </div>
            <span className={styles.categoryTreeSpacer} />
            <div className={styles.categoryTreeRight}>
              <span
                className={styles.categoryCheckbox}
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.has(node.path)}
                  onChange={() => toggleMultiParamValue('category', node.path)}
                />
              </span>
            </div>
          </div>
          {hasChildren && isExpanded ? (
            <div className={styles.categoryTreeChildren}>
              {renderTree(node.children, depth + 1)}
            </div>
          ) : null}
        </div>
      );
    });


  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.searchInputWrap}>
          <input
            className={styles.searchInput}
            placeholder="Search products"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchFocused ? (
            <button
              type="button"
              className={styles.clearSearch}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>
        <button className={styles.searchButton} onClick={() => fetchResults()}>
          Search
        </button>
      </div>

      <aside className={styles.sidebar}>
        <div className={styles.filterGroup}>
          <h3>Manufacturer</h3>
          <div className={styles.filterList}>
            {manufacturerOptions.length === 0 ? (
              <span className={styles.loading}>No data</span>
            ) : (
              visibleManufacturers.map((option) => (
                <label key={option.name} data-testid="manufacturer-option">
                  <input
                    type="checkbox"
                    checked={selectedManufacturers.has(option.name)}
                    onChange={() => toggleMultiParamValue('manufacturer', option.name)}
                  />{' '}
                  {option.name}
                </label>
              ))
            )}
          </div>
          {manufacturerOptions.length > MAX_VISIBLE_MANUFACTURERS ? (
            <button
              type="button"
              className={styles.viewMoreButton}
              onClick={() => {
                setManufacturerSearch('');
                setShowManufacturerModal(true);
              }}
              data-testid="manufacturer-view-more"
            >
              View all manufacturers
            </button>
          ) : null}
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.categoryHeader}>
            <h3>Category</h3>
            {selectedCategories.size > 0 ? (
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => clearMultiParam('category')}
              >
                Clear category
              </button>
            ) : null}
          </div>
          <div className={styles.filterList}>
            {categoryTreeLoading ? (
              <span className={styles.loading}>Loading categories...</span>
            ) : categoryTreeError ? (
              <span className={styles.loading}>{categoryTreeError}</span>
            ) : categoryTreeLoaded && categoryRootOptions.length === 0 ? (
              <span className={styles.loading}>No data</span>
            ) : (
              visibleCategories.map((option) => {
                const showSubtext = option.depth > 1 && option.isSelected;
                return (
                  <label
                    key={option.path}
                    className={styles.categoryOption}
                    data-testid="category-option"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(option.path)}
                      onChange={() => toggleMultiParamValue('category', option.path)}
                    />
                    <span className={styles.categoryOptionText}>
                      <span className={styles.categoryOptionTitleRow}>
                        <span className={styles.categoryOptionName}>{option.name}</span>
                      </span>
                      {showSubtext ? (
                        <span className={styles.categoryOptionSubtext}>
                          {option.topLevelName}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          {shouldShowCategoryModal ? (
            <button
              type="button"
              className={styles.viewMoreButton}
              onClick={() => {
                setCategoryModalSearch('');
                setShowCategoryModal(true);
              }}
              data-testid="category-view-more"
            >
              View all categories
            </button>
          ) : null}
        </div>

        <div className={styles.filterGroup}>
          <h3>Availability</h3>
          <div className={styles.filterList}>
            {Object.keys(facets.availabilityRaw || {}).length === 0 ? (
              <span className={styles.loading}>No data</span>
            ) : (
              Object.keys(facets.availabilityRaw).map((name) => (
                <label key={name}>
                  <input
                    type="checkbox"
                    checked={filters.availabilityRaw?.includes(name) ?? false}
                    onChange={() => toggleFilter('availabilityRaw', name)}
                  />{' '}
                  {name}
                </label>
              ))
            )}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <h3>Price</h3>
          <div className={styles.filterList}>
            <input
              className={styles.searchInput}
              placeholder="Min"
              type="number"
              value={filters.minPrice ?? ''}
              onChange={(event) => updatePriceRange('minPrice', event.target.value)}
            />
            <input
              className={styles.searchInput}
              placeholder="Max"
              type="number"
              value={filters.maxPrice ?? ''}
              onChange={(event) => updatePriceRange('maxPrice', event.target.value)}
            />
          </div>
        </div>
      </aside>

      <section className={styles.results}>
        {loading ? (
          <p className={styles.loading}>Loading results...</p>
        ) : error ? (
          <p className={styles.loading}>{error}</p>
        ) : data?.hits.length ? (
          data.hits.map((hit) => (
            <div className={styles.card} key={hit.skuItemId}>
              {hit.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hit.imageUrl} alt={hit.productName} className={styles.cardImage} />
              ) : (
                <div className={styles.cardImage} />
              )}
              <div>
                <h2 className={styles.cardTitle}>
                  <Link href={`/product/${hit.productId}`} className="text-link">
                    {hit.productName}
                  </Link>
                </h2>
                <p className={styles.cardMeta}>{hit.manufacturerName ?? 'Unknown maker'}</p>
                <p className={styles.cardMeta}>{hit.availabilityRaw ?? 'Availability unknown'}</p>
                <p className={styles.cardMeta}>
                  {hit.unitPrice ? `$${hit.unitPrice.toFixed(2)}` : 'Price on request'}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className={styles.loading}>No results found.</p>
        )}

        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Prev
          </button>
          <div className={styles.pageNumbers}>
            {pageItems.map((item, index) =>
              item === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className={styles.pageEllipsis}>
                  …
                </span>
              ) : (
                <button
                  key={item}
                  className={`${styles.pageButton} ${
                    item === page ? styles.pageButtonActive : ''
                  }`}
                  onClick={() => setPage(item)}
                  disabled={item === page}
                >
                  {item}
                </button>
              )
            )}
          </div>
          <button
            className={styles.pageButton}
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>
      </section>

      {showCategoryModal ? (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowCategoryModal(false)}
          data-testid="category-modal"
        >
          <div
            className={styles.modalCard}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h4>Categories</h4>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowCategoryModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <input
              className={styles.searchInput}
              placeholder="Search categories..."
              value={categoryModalSearch}
              onChange={(event) => setCategoryModalSearch(event.target.value)}
              data-testid="category-search"
            />
            <div className={styles.treeContainer}>
              {categoryTreeLoading ? (
                <div className={styles.loading}>Loading categories...</div>
              ) : categoryTreeError ? (
                <div className={styles.loading}>{categoryTreeError}</div>
              ) : categoryTreeLoaded && categoryTree.length === 0 ? (
                <div className={styles.loading}>No data</div>
              ) : (
                <>
                  {renderTree(categoryTree)}
                  {matchesTree && matchesTree.matches.size === 0 ? (
                    <div className={styles.loading}>No matches</div>
                  ) : null}
                </>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => {
                  clearMultiParam('category');
                  setExpandedCategories(new Set());
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className={styles.searchButton}
                onClick={() => setShowCategoryModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showManufacturerModal ? (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowManufacturerModal(false)}
          data-testid="manufacturer-modal"
        >
          <div
            className={styles.modalCard}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h4>All manufacturers</h4>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowManufacturerModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <input
              className={styles.searchInput}
              placeholder="Search manufacturers..."
              value={manufacturerSearch}
              onChange={(event) => setManufacturerSearch(event.target.value)}
              data-testid="manufacturer-search"
            />
            <div className={styles.modalList}>
              {filteredManufacturers.map((option) => (
                <label key={option.name} className={styles.modalOption}>
                  <input
                    type="checkbox"
                    checked={selectedManufacturers.has(option.name)}
                    onChange={() => toggleMultiParamValue('manufacturer', option.name)}
                  />{' '}
                  <span>{option.name}</span>
                </label>
              ))}
              {filteredManufacturers.length === 0 ? (
                <div className={styles.loading}>No matches</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
