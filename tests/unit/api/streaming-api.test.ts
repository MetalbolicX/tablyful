/**
 * Streaming API tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  CsvStreamFormatter,
  JsonStreamFormatter,
  HtmlStreamFormatter,
  MarkdownStreamFormatter,
  LatexStreamFormatter,
  createCsvStreamFormatter,
  createJsonStreamFormatter,
  createHtmlStreamFormatter,
  createMarkdownStreamFormatter,
  createLatexStreamFormatter,
} from '@/index';
import { arrayOfObjectsData, generateLargeDataset } from '../../fixtures/test-data';
import { Readable } from 'node:stream';

/**
 * Helper to collect stream data
 */
function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

describe('Streaming API', () => {
  describe('CSV Stream Formatter', () => {
    it('should create CSV stream formatter', () => {
      const formatter = createCsvStreamFormatter();
      expect(formatter).toBeInstanceOf(CsvStreamFormatter);
      expect(formatter.supportsStreaming).toBe(true);
    });

    it('should format data as stream', async () => {
      const formatter = new CsvStreamFormatter();
      const tableData = {
        headers: ['name', 'age', 'city'],
        rows: arrayOfObjectsData,
        columns: [],
        metadata: {
          rowCount: 3,
          columnCount: 3,
          hasRowNumbers: false,
          originalFormat: 'array-of-objects',
        },
      };

      const stream = formatter.formatStream(tableData);
      const result = await streamToString(stream as Readable);

      expect(result).toContain('name,age,city');
      expect(result).toContain('Alice,30,New York');
    });

    it('should handle large datasets efficiently', async () => {
      const formatter = new CsvStreamFormatter();
      const largeData = generateLargeDataset(1000);
      const tableData = {
        headers: ['id', 'name', 'email', 'age', 'active'],
        rows: largeData,
        columns: [],
        metadata: {
          rowCount: 1000,
          columnCount: 5,
          hasRowNumbers: false,
          originalFormat: 'array-of-objects',
        },
      };

      const stream = formatter.formatStream(tableData, { batchSize: 100 });
      const result = await streamToString(stream as Readable);

      expect(result).toContain('User1');
      expect(result).toContain('User1000');
    });

    it('should support custom options in stream', async () => {
      const formatter = new CsvStreamFormatter();
      const tableData = {
        headers: ['name', 'age'],
        rows: [{ name: 'Alice', age: 30 }],
        columns: [],
        metadata: {
          rowCount: 1,
          columnCount: 2,
          hasRowNumbers: false,
          originalFormat: 'array-of-objects',
        },
      };

      const stream = formatter.formatStream(tableData, {
        formatOptions: { delimiter: ';' },
      });
      const result = await streamToString(stream as Readable);

      expect(result).toContain('name;age');
    });
  });

  describe('JSON Stream Formatter', () => {
    it('should create JSON stream formatter', () => {
      const formatter = createJsonStreamFormatter();
      expect(formatter).toBeInstanceOf(JsonStreamFormatter);
      expect(formatter.supportsStreaming).toBe(true);
    });

    it('should format data as JSON stream', async () => {
      const formatter = new JsonStreamFormatter();
      const tableData = {
        headers: ['name', 'age'],
        rows: arrayOfObjectsData,
        columns: [
          { name: 'name', type: 'string' as const, nullable: false, originalName: 'name' },
          { name: 'age', type: 'number' as const, nullable: false, originalName: 'age' },
        ],
        metadata: {
          rowCount: 3,
          columnCount: 2,
          hasRowNumbers: false,
          originalFormat: 'array-of-objects',
        },
      };

      const stream = formatter.formatStream(tableData);
      const result = await streamToString(stream as Readable);
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(3);
    });

    it('should format with pretty print', async () => {
      const formatter = new JsonStreamFormatter();
      const tableData = {
        headers: ['name', 'age'],
        rows: [{ name: 'Alice', age: 30 }],
        columns: [
          { name: 'name', type: 'string' as const, nullable: false, originalName: 'name' },
          { name: 'age', type: 'number' as const, nullable: false, originalName: 'age' },
        ],
        metadata: {
          rowCount: 1,
          columnCount: 2,
          hasRowNumbers: false,
          originalFormat: 'array-of-objects',
        },
      };

      const stream = formatter.formatStream(tableData, {
        formatOptions: { pretty: true },
      });
      const result = await streamToString(stream as Readable);

      expect(result).toContain('\n');
      expect(result).toContain('  ');
    });
  });

  describe('Markdown Stream Formatter', () => {
    it('should create Markdown stream formatter', () => {
      const formatter = createMarkdownStreamFormatter();
      expect(formatter).toBeInstanceOf(MarkdownStreamFormatter);
      expect(formatter.supportsStreaming).toBe(true);
    });

    it('should format data as Markdown stream', async () => {
      const formatter = new MarkdownStreamFormatter();
      const tableData = {
        headers: ['name', 'age'],
        rows: arrayOfObjectsData,
        columns: [],
        metadata: {
          rowCount: 3,
          columnCount: 2,
          hasRowNumbers: false,
          originalFormat: 'array-of-objects',
        },
      };

      const stream = formatter.formatStream(tableData);
      const result = await streamToString(stream as Readable);

      expect(result).toContain('| name | age |');
      expect(result).toContain('| :--- | :--- |');
    });

    it('should support alignment in stream', async () => {
      const formatter = new MarkdownStreamFormatter();
      const tableData = {
        headers: ['name'],
        rows: [{ name: 'Alice' }],
        columns: [],
        metadata: {
          rowCount: 1,
          columnCount: 1,
          hasRowNumbers: false,
          originalFormat: 'array-of-objects',
        },
      };

      const stream = formatter.formatStream(tableData, {
        formatOptions: { align: 'center' },
      });
      const result = await streamToString(stream as Readable);

      expect(result).toContain('| :---: |');
    });
  });

  describe('HTML Stream Formatter', () => {
    it('should create HTML stream formatter', () => {
      const formatter = createHtmlStreamFormatter();
      expect(formatter).toBeInstanceOf(HtmlStreamFormatter);
      expect(formatter.supportsStreaming).toBe(true);
    });

    it('should format data as HTML stream', async () => {
      const formatter = new HtmlStreamFormatter();
      const tableData = {
        headers: ['name', 'age'],
        rows: arrayOfObjectsData,
        columns: [],
        metadata: {
          rowCount: 3,
          columnCount: 2,
          hasRowNumbers: false,
          originalFormat: 'array-of-objects',
        },
      };

      const stream = formatter.formatStream(tableData);
      const result = await streamToString(stream as Readable);

      expect(result).toContain('<table>');
      expect(result).toContain('<thead>');
      expect(result).toContain('<tbody>');
    });
  });

  describe('LaTeX Stream Formatter', () => {
    it('should create LaTeX stream formatter', () => {
      const formatter = createLatexStreamFormatter();
      expect(formatter).toBeInstanceOf(LatexStreamFormatter);
      expect(formatter.supportsStreaming).toBe(true);
    });

    it('should format data as LaTeX stream', async () => {
      const formatter = new LatexStreamFormatter();
      const tableData = {
        headers: ['name', 'age'],
        rows: arrayOfObjectsData,
        columns: [],
        metadata: {
          rowCount: 3,
          columnCount: 2,
          hasRowNumbers: false,
          originalFormat: 'array-of-objects',
        },
      };

      const stream = formatter.formatStream(tableData);
      const result = await streamToString(stream as Readable);

      expect(result).toContain('\\begin{tabular}');
      expect(result).toContain('\\hline');
    });
  });

  describe('Stream Performance', () => {
    it('should handle batch processing', async () => {
      const formatter = new CsvStreamFormatter();
      const largeData = generateLargeDataset(5000);
      const tableData = {
        headers: ['id', 'name', 'email', 'age', 'active'],
        rows: largeData,
        columns: [],
        metadata: {
          rowCount: 5000,
          columnCount: 5,
          hasRowNumbers: false,
          originalFormat: 'array-of-objects',
        },
      };

      const smallBatchStream = formatter.formatStream(tableData, { batchSize: 100 });
      const largeBatchStream = formatter.formatStream(tableData, { batchSize: 1000 });

      const smallResult = await streamToString(smallBatchStream as Readable);
      const largeResult = await streamToString(largeBatchStream as Readable);

      expect(smallResult).toContain('User5000');
      expect(largeResult).toContain('User5000');
      expect(smallResult.length).toBe(largeResult.length);
    });

    it('should respect highWaterMark setting', async () => {
      const formatter = new CsvStreamFormatter();
      const tableData = {
        headers: ['name'],
        rows: [{ name: 'Alice' }],
        columns: [],
        metadata: {
          rowCount: 1,
          columnCount: 1,
          hasRowNumbers: false,
          originalFormat: 'array-of-objects',
        },
      };

      const stream = formatter.formatStream(tableData, {
        highWaterMark: 64,
      });

      expect(stream).toHaveProperty('_readableState');
      expect((stream as any)._readableState.highWaterMark).toBe(64);
    });
  });
});
