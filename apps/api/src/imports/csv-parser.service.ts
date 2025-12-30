import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { readFile } from 'fs/promises';

export class MissingHeadersError extends Error {
  constructor(public readonly missingHeaders: string[]) {
    super(`Missing required headers: ${missingHeaders.join(', ')}`);
  }
}

@Injectable()
export class CsvParserService {
  private readonly requiredHeaders = [
    'ItemID',
    'CategoryPathID',
    'CategoryPathName',
    'ManufacturerID',
    'ManufacturerName',
    'ProductID',
    'ProductName',
    'ProductDescription',
    'ManufacturerItemCode',
    'ItemDescription',
    'ItemImageURL',
    'NDCItemCode',
    'Pkg',
    'UnitPrice',
    'PriceDescription',
    'Availability',
    'PackingListDescritpion',
    'UnitWeight',
    'UnitVolume',
    'UOMFactor',
    'CountryOfOrigin',
    'HarmonizedTariffCode',
    'HazMatClass',
    'HazMatCode',
    'PharmacyProductType',
    'NationalDrugCode',
    'BrandID',
    'BrandName',
  ];

  getRequiredHeaders() {
    return [...this.requiredHeaders];
  }

  async parseFile(filePath: string): Promise<Record<string, string>[]> {
    const fileBuffer = await readFile(filePath);
    const content = iconv.decode(fileBuffer, 'latin1');

    const headerRows = parse(content, {
      to_line: 1,
      bom: true,
      relax_column_count: true,
      trim: true,
    }) as string[][];

    if (headerRows.length === 0) {
      throw new MissingHeadersError(this.requiredHeaders);
    }

    const headers = headerRows[0].map((header) => String(header).trim());
    const missingHeaders = this.requiredHeaders.filter((required) => !headers.includes(required));

    if (missingHeaders.length > 0) {
      throw new MissingHeadersError(missingHeaders);
    }

    return parse(content, {
      columns: headers,
      from_line: 2,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    }) as Record<string, string>[];
  }
}
