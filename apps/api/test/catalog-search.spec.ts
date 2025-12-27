import { CatalogController, parseFilters } from '../src/catalog/catalog.controller';
import { CatalogService } from '../src/catalog/catalog.service';
import { SearchService } from '../src/search/search.service';
import { CategoryTreeService } from '../src/catalog/category-tree.service';

const mockSearchResponse = {
  hits: [{ skuItemId: 1001 }],
  total: 1,
  page: 1,
  pageSize: 20,
  facets: { manufacturerName: { Acme: 1 } }
};

describe('CatalogController search', () => {
  it('parses filters from JSON and query params', () => {
    const filters = parseFilters({
      filters: JSON.stringify({ manufacturerName: ['Acme'] }),
      availabilityRaw: 'In Stock',
      minPrice: '10'
    });

    expect(filters).toEqual({
      manufacturerName: ['Acme'],
      categoryPathName: undefined,
      availabilityRaw: ['In Stock'],
      minPrice: 10,
      maxPrice: undefined
    });
  });

  it('returns response shape for search', async () => {
    const catalogService = {
      searchSkus: jest.fn().mockResolvedValue(mockSearchResponse)
    } as unknown as CatalogService;
    const categoryTreeService = {
      getTree: jest.fn()
    } as unknown as CategoryTreeService;

    const controller = new CatalogController(catalogService, categoryTreeService);
    const result = await controller.search('widget', '1', '20', {});

    expect(result).toEqual(mockSearchResponse);
  });
});

describe('SearchService search', () => {
  it('calls Meilisearch with expected filters', async () => {
    const index = {
      updateSettings: jest.fn().mockResolvedValue(undefined),
      addDocuments: jest.fn(),
      search: jest.fn().mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: { manufacturerName: {} }
      })
    };

    const client = {
      createIndex: jest.fn().mockResolvedValue(undefined),
      index: jest.fn().mockReturnValue(index)
    };

    const service = new SearchService();
    (service as any).client = client;

    const result = await service.searchSkus('mask', 1, 25, {
      manufacturerName: ['Acme'],
      categoryPathName: ['Consumables'],
      availabilityRaw: ['In Stock'],
      minPrice: 10,
      maxPrice: 50
    });

    expect(index.search).toHaveBeenCalledWith('mask', {
      limit: 25,
      offset: 0,
      filter: 'manufacturerName IN ["Acme"] AND categoryPathName IN ["Consumables"] AND availabilityRaw IN ["In Stock"] AND unitPrice >= 10 AND unitPrice <= 50',
      facets: ['manufacturerName', 'categoryPathName', 'availabilityRaw', 'pkg', 'isActive']
    });

    expect(result).toEqual({
      hits: [],
      total: 0,
      page: 1,
      pageSize: 25,
      facets: { manufacturerName: {} }
    });
  });
});
