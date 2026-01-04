import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import type IORedis from 'ioredis';
import { ImportService } from './import.service';
import { IMPORTS_QUEUE_NAME } from './imports.constants';
import { IndexSkusJob } from '../search/index-skus.job';
import { Inject } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { REDIS_CONNECTION } from '../queues/queues.constants';

@Injectable()
export class ImportWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImportWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly importService: ImportService,
    private readonly indexSkusJob: IndexSkusJob,
    @Inject(REDIS_CONNECTION) private readonly redisConnection: IORedis,
  ) {}

  onModuleInit() {
    const enabled = process.env.IMPORT_WORKER_ENABLED !== 'false';
    if (!enabled) {
      this.logger.warn('Import worker disabled via IMPORT_WORKER_ENABLED');
      return;
    }

    this.worker = new Worker(
      IMPORTS_QUEUE_NAME,
      async (job: Job) => {
        if (job.name === 'import-csv') {
          const { importRunId, filePath, priceMarginPercent } = job.data as {
            importRunId: string;
            filePath: string;
            priceMarginPercent?: number;
          };

          await this.handleImportJob(importRunId, filePath, priceMarginPercent);
          return;
        }

        if (job.name === 'index-skus') {
          await this.indexSkusJob.run();
          return;
        }

        this.logger.warn(`Unknown job ${job.name}`);
      },
      { connection: this.redisConnection },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(`Import job failed: ${job?.id}`, error);
    });
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
  }

  async handleImportJob(importRunId: string, filePath: string, priceMarginPercent = 0) {
    await this.importService.markRunning(importRunId);
    try {
      const stats = await this.importService.processImport(
        importRunId,
        filePath,
        priceMarginPercent,
      );
      await this.importService.markSucceeded(importRunId, stats);
      await this.runIndexAfterImport(importRunId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown import error';
      this.logger.error(`Import job failed for ${importRunId}: ${message}`);
      await this.importService.markFailed(importRunId, message);
      throw error;
    } finally {
      try {
        await unlink(filePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to remove import file ${filePath}: ${message}`);
      }
    }
  }

  private async runIndexAfterImport(importRunId: string) {
    try {
      await this.indexSkusJob.run();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown indexing error';
      this.logger.error(`Indexing failed after import ${importRunId}: ${message}`);
    }
  }
}
