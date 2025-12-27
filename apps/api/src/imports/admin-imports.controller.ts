import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { Queue } from 'bullmq';
import { ImportService } from './import.service';
import { IMPORTS_QUEUE } from './imports.constants';
import { Inject } from '@nestjs/common';
import { AdminSecretGuard } from '../auth/admin-secret.guard';

@Controller('admin/imports')
@UseGuards(AdminSecretGuard)
export class AdminImportsController {
  constructor(
    private readonly importService: ImportService,
    @Inject(IMPORTS_QUEUE) private readonly importsQueue: Queue
  ) {}

  @Get()
  async list() {
    return this.importService.listImportRuns();
  }

  @Get(':id')
  async getRun(@Param('id') id: string) {
    return this.importService.getImportRun(id);
  }

  @Get(':id/errors')
  async listErrors(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '25'
  ) {
    const pageNumber = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 25));

    return this.importService.listImportErrors(id, pageNumber, size);
  }

  @Post(':id/mark-failed')
  async markFailed(@Param('id') id: string) {
    return this.importService.markFailedIfRunning(id);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage()
    })
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const importRunId = randomUUID();
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const storedPath = path.join(uploadsDir, `${importRunId}.csv`);

    await mkdir(uploadsDir, { recursive: true });
    await writeFile(storedPath, file.buffer);

    const importRun = await this.importService.createImportRunWithId(
      importRunId,
      file.originalname,
      storedPath
    );

    await this.importsQueue.add('import-csv', {
      importRunId: importRun.id,
      filePath: storedPath
    });

    return importRun;
  }
}
