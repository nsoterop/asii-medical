import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { IndexSkusJob } from './index-skus.job';
import { SearchStatusService } from './search-status.service';

@Module({
  providers: [SearchService, SearchStatusService, IndexSkusJob],
  exports: [SearchService, SearchStatusService, IndexSkusJob],
})
export class SearchModule {}
