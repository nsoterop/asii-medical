import { Injectable, OnModuleInit } from '@nestjs/common';
import { ImportRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ImportReconcilerService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.reconcileStuckImports();
  }

  async reconcileStuckImports() {
    const minutes = Number(process.env.IMPORT_RUN_STUCK_MINUTES || 30);
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);

    return this.prisma.importRun.updateMany({
      where: {
        status: ImportRunStatus.RUNNING,
        startedAt: { lt: cutoff }
      },
      data: {
        status: ImportRunStatus.FAILED,
        finishedAt: new Date(),
        lastErrorText: 'Marked failed by reconciler (stuck)'
      }
    });
  }
}
