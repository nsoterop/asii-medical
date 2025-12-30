export type SearchFilters = {
  manufacturerName?: string[];
  categoryPathName?: string[];
  availabilityRaw?: string[];
  minPrice?: number;
  maxPrice?: number;
};

export type SearchHit = {
  skuItemId: number;
  productId: number;
  productName: string;
  productDescription: string | null;
  itemDescription: string | null;
  manufacturerName: string | null;
  manufacturerItemCode: string | null;
  ndcItemCode: string | null;
  nationalDrugCode: string | null;
  categoryPathName: string | null;
  unitPrice: number | null;
  availabilityRaw: string | null;
  pkg: string | null;
  imageUrl: string | null;
  isActive: boolean;
};

export type SearchResponse = {
  hits: SearchHit[];
  total: number;
  page: number;
  pageSize: number;
  facets: Record<string, Record<string, number>>;
};

export type CategoryNode = {
  name: string;
  path: string;
  depth: number;
  children: CategoryNode[];
};

export type ProductResponse = {
  productId: number;
  productName: string;
  productDescription: string | null;
  manufacturerName: string | null;
  categoryPathName: string | null;
  skus: Array<{
    itemId: number;
    pkg: string | null;
    unitPrice: number | string | null;
    availabilityRaw: string | null;
    itemDescription: string | null;
    manufacturerItemCode?: string | null;
    ndcItemCode?: string | null;
    nationalDrugCode?: string | null;
    countryOfOrigin?: string | null;
    uomFactor?: number | null;
    unitWeight?: number | null;
    unitVolume?: number | null;
    hazMatClass?: string | null;
    hazMatCode?: string | null;
    harmonizedTariffCode?: string | null;
    itemImageUrl: string | null;
  }>;
};

function buildSearchParams(q: string, page: number, pageSize: number, filters: SearchFilters) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  const appendList = (key: string, values?: string[]) => {
    if (!values) return;
    values.forEach((value) => params.append(key, value));
  };

  appendList('manufacturerName', filters.manufacturerName);
  appendList('categoryPathName', filters.categoryPathName);
  appendList('availabilityRaw', filters.availabilityRaw);

  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));

  return params;
}

export async function fetchCatalogSearch(
  q: string,
  page: number,
  pageSize: number,
  filters: SearchFilters,
) {
  const params = buildSearchParams(q, page, pageSize, filters);
  const response = await fetch(`/api/catalog/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch search results');
  }
  return response.json() as Promise<SearchResponse>;
}

export async function fetchProduct(productId: string) {
  const response = await fetch(`/api/catalog/product/${productId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch product');
  }
  return response.json() as Promise<ProductResponse>;
}

export async function fetchCategoryTree() {
  const response = await fetch('/api/catalog/categories/tree', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }
  return response.json() as Promise<CategoryNode[]>;
}
