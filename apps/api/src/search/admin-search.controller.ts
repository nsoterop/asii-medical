import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SearchService } from './search.service';
import { SearchStatusService } from './search-status.service';
import { SKUS_INDEX_NAME } from './search.constants';
import { IndexSkusJob } from './index-skus.job';

@Controller('admin/search')
@UseGuards(SupabaseAuthGuard, AdminGuard)
export class AdminSearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly indexSkusJob: IndexSkusJob,
    private readonly statusService: SearchStatusService
  ) {}

  @Get('status')
  async status() {
    const stats = await this.searchService.getIndexStats(SKUS_INDEX_NAME);

    return {
      meiliUrl: this.searchService.getHost(),
      indexName: SKUS_INDEX_NAME,
      meiliHasKeyConfigured: this.searchService.hasApiKey(),
      numberOfDocuments: stats.numberOfDocuments ?? 0,
      lastIndexRunAt: this.statusService.lastIndexRunAt?.toISOString() ?? null,
      lastIndexRunFetched: this.statusService.lastIndexRunFetched,
      lastIndexRunIndexed: this.statusService.lastIndexRunIndexed,
      lastIndexError: this.statusService.lastIndexError
    };
  }

  @Post('reindex')
  async reindex() {
    await this.indexSkusJob.run();
    return this.status();
  }
}
