import { Injectable } from '@nestjs/common';

@Injectable()
export class SearchStatusService {
  lastIndexRunAt: Date | null = null;
  lastIndexRunFetched: number | null = null;
  lastIndexRunIndexed: number | null = null;
  lastIndexError: string | null = null;

  setRunStarted() {
    this.lastIndexRunAt = new Date();
    this.lastIndexRunFetched = null;
    this.lastIndexRunIndexed = null;
    this.lastIndexError = null;
  }

  setRunCounts(fetched: number, indexed: number) {
    this.lastIndexRunFetched = fetched;
    this.lastIndexRunIndexed = indexed;
  }

  setRunError(message: string) {
    this.lastIndexError = message;
  }
}
