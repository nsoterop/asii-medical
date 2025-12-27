import { CsvParserService } from '../src/imports/csv-parser.service';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

describe('CsvParserService', () => {
  it('throws when required headers are missing', async () => {
    const parser = new CsvParserService();
    const tempPath = path.join(os.tmpdir(), `missing-headers-${Date.now()}.csv`);

    const headers = parser.getRequiredHeaders().filter((header) => header !== 'NDCItemCode');
    await writeFile(tempPath, `${headers.join(',')}\n1001\n`);

    await expect(parser.parseFile(tempPath)).rejects.toMatchObject({
      missingHeaders: expect.arrayContaining(['NDCItemCode'])
    });

    await unlink(tempPath);
  });
});
