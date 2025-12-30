import { AdminSearchController } from '../src/search/admin-search.controller';
import { SearchService } from '../src/search/search.service';
import { SearchStatusService } from '../src/search/search-status.service';
import { SKUS_INDEX_NAME } from '../src/search/search.constants';
import { IndexSkusJob } from '../src/search/index-skus.job';

class MockSearchService {
  getIndexStats = jest.fn().mockResolvedValue({ numberOfDocuments: 12 });
  getHost = jest.fn().mockReturnValue('http://meili:7700');
  hasApiKey = jest.fn().mockReturnValue(true);
}

class MockIndexJob {
  run = jest.fn().mockResolvedValue({ fetched: 5, indexed: 5 });
}

describe('AdminSearchController', () => {
  it('returns search status with stats', async () => {
    const searchService = new MockSearchService();
    const statusService = new SearchStatusService();
    statusService.lastIndexRunAt = new Date('2025-01-01T00:00:00Z');
    statusService.lastIndexRunFetched = 10;
    statusService.lastIndexRunIndexed = 9;
    statusService.lastIndexError = null;

    const controller = new AdminSearchController(
      searchService as unknown as SearchService,
      new MockIndexJob() as unknown as IndexSkusJob,
      statusService,
    );

    const result = await controller.status();

    expect(searchService.getIndexStats).toHaveBeenCalledWith(SKUS_INDEX_NAME);
    expect(result).toEqual({
      meiliUrl: 'http://meili:7700',
      indexName: 'skus',
      meiliHasKeyConfigured: true,
      numberOfDocuments: 12,
      lastIndexRunAt: '2025-01-01T00:00:00.000Z',
      lastIndexRunFetched: 10,
      lastIndexRunIndexed: 9,
      lastIndexError: null,
    });
  });

  it('reindex calls indexer and returns updated status', async () => {
    const searchService = new MockSearchService();
    const statusService = new SearchStatusService();
    const indexJob = new MockIndexJob();

    statusService.setRunStarted();
    statusService.setRunCounts(5, 5);

    const controller = new AdminSearchController(
      searchService as unknown as SearchService,
      indexJob as unknown as IndexSkusJob,
      statusService,
    );

    const result = await controller.reindex();

    expect(indexJob.run).toHaveBeenCalled();
    expect(result.lastIndexRunFetched).toBe(5);
  });
});
