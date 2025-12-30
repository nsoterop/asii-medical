import { IndexSkusJob } from '../src/search/index-skus.job';
import { SearchService } from '../src/search/search.service';
import { SearchStatusService } from '../src/search/search-status.service';

const sampleSku = {
  itemId: 1001,
  productId: 2001,
  itemDescription: 'Widget A',
  manufacturerItemCode: 'ACM-1001',
  ndcItemCode: '12345',
  nationalDrugCode: 'ND123',
  availabilityRaw: 'In Stock',
  pkg: '1 each',
  unitPrice: { toString: () => '12.34' },
  itemImageUrl: 'http://example.com/a.jpg',
  isActive: true,
  product: {
    productName: 'Widget A',
    productDescription: 'Desc A',
    manufacturer: { name: 'Acme' },
    primaryCategoryPath: null
  }
};

describe('IndexSkusJob', () => {
  it('calls SearchService with expected document shape', async () => {
    const prisma = {
      sku: {
        findMany: jest.fn().mockResolvedValueOnce([sampleSku])
      }
    } as any;

    const index = {
      updateSettings: jest.fn().mockResolvedValue(undefined),
      deleteAllDocuments: jest.fn().mockResolvedValue({ taskUid: 2 }),
      addDocuments: jest.fn().mockResolvedValue({ taskUid: 1 })
    };
    const searchService = new SearchService();
    (searchService as any).client = {
      createIndex: jest.fn().mockResolvedValue(undefined),
      index: jest.fn().mockReturnValue(index),
      waitForTask: jest.fn().mockResolvedValue(undefined)
    };

    const statusService = new SearchStatusService();
    const job = new IndexSkusJob(prisma, searchService, statusService);
    const result = await job.run();

    expect(index.deleteAllDocuments).toHaveBeenCalled();
    expect(index.addDocuments).toHaveBeenCalledWith([
      {
        skuItemId: 1001,
        productId: 2001,
        productName: 'Widget A',
        productDescription: 'Desc A',
        itemDescription: 'Widget A',
        manufacturerName: 'Acme',
        manufacturerItemCode: 'ACM-1001',
        ndcItemCode: '12345',
        nationalDrugCode: 'ND123',
        categoryPathName: 'Uncategorized',
        unitPrice: 12.34,
        availabilityRaw: 'In Stock',
        pkg: '1 each',
        imageUrl: 'http://example.com/a.jpg',
        isActive: true
      }
    ], { primaryKey: 'skuItemId' });
    expect(result).toEqual({ fetched: 1, indexed: 1 });
    expect(statusService.lastIndexRunFetched).toBe(1);
    expect(statusService.lastIndexRunIndexed).toBe(1);
  });
});
