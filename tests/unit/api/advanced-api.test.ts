/**
 * Advanced API tests for the Tablyful class
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Tablyful, createTablyful } from '@/api';
import { arrayOfObjectsData } from '../../fixtures/test-data';

describe('Tablyful Class - Advanced API', () => {
  let tablyful: Tablyful;

  beforeEach(() => {
    tablyful = new Tablyful();
  });

  describe('Constructor and Configuration', () => {
    it('should create instance with default options', () => {
      const instance = new Tablyful();
      const options = instance.getOptions();

      expect(options.outputFormat).toBe('markdown');
      expect(options.hasRowNumbers).toBe(false);
      expect(options.hasHeaders).toBe(true);
    });

    it('should create instance with custom options', () => {
      const instance = new Tablyful({
        outputFormat: 'csv',
        hasRowNumbers: true,
        rowNumberHeader: 'ID',
      });
      const options = instance.getOptions();

      expect(options.outputFormat).toBe('csv');
      expect(options.hasRowNumbers).toBe(true);
      expect(options.rowNumberHeader).toBe('ID');
    });

    it('should use createTablyful factory', () => {
      const instance = createTablyful({ outputFormat: 'json' });
      expect(instance).toBeInstanceOf(Tablyful);
      expect(instance.getOptions().outputFormat).toBe('json');
    });
  });

  describe('convert() Method', () => {
    it('should convert to default format', () => {
      const instance = new Tablyful({ outputFormat: 'csv' });
      const result = instance.convert(arrayOfObjectsData);

      expect(result).toContain('name,age,city');
    });

    it('should convert to specified format', () => {
      const result = tablyful.convert(arrayOfObjectsData, 'json');
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should use format-specific options', () => {
      const result = tablyful.convert(arrayOfObjectsData, 'csv', {
        formatOptions: { delimiter: '|' },
      });

      expect(result).toContain('name|age|city');
    });

    it('should override instance options', () => {
      const instance = new Tablyful({ hasRowNumbers: false });
      const result = instance.convert(arrayOfObjectsData, 'csv', {
        hasRowNumbers: true,
      });

      expect(result).toContain('#,name,age,city');
    });
  });

  describe('parse() Method', () => {
    it('should parse data into table format', () => {
      const tableData = tablyful.parse(arrayOfObjectsData);

      expect(tableData.headers).toEqual(['name', 'age', 'city']);
      expect(tableData.rows).toHaveLength(3);
      expect(tableData.metadata.rowCount).toBe(3);
      expect(tableData.metadata.columnCount).toBe(3);
    });

    it('should include metadata', () => {
      const tableData = tablyful.parse(arrayOfObjectsData);

      expect(tableData.metadata).toHaveProperty('rowCount');
      expect(tableData.metadata).toHaveProperty('columnCount');
      expect(tableData.metadata).toHaveProperty('hasRowNumbers');
      expect(tableData.metadata).toHaveProperty('originalFormat');
    });

    it('should handle custom headers in parsing', () => {
      const tableData = tablyful.parse(arrayOfObjectsData, {
        headers: ['Name', 'Age', 'City'],
      });

      expect(tableData.headers).toEqual(['Name', 'Age', 'City']);
    });
  });

  describe('format() Method', () => {
    it('should format parsed data to CSV', () => {
      const tableData = tablyful.parse(arrayOfObjectsData);
      const result = tablyful.format(tableData, 'csv');

      expect(result).toContain('name,age,city');
      expect(result).toContain('Alice,30,New York');
    });

    it('should format parsed data to JSON', () => {
      const tableData = tablyful.parse(arrayOfObjectsData);
      const result = tablyful.format(tableData, 'json');
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(3);
    });

    it('should format parsed data to Markdown', () => {
      const tableData = tablyful.parse(arrayOfObjectsData);
      const result = tablyful.format(tableData, 'markdown');

      expect(result).toContain('| name | age | city |');
    });
  });

  describe('Convenience Methods', () => {
    it('should use toCsv method', () => {
      const result = tablyful.toCsv(arrayOfObjectsData);
      expect(result).toContain('name,age,city');
    });

    it('should use toJson method', () => {
      const result = tablyful.toJson(arrayOfObjectsData);
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should use toHtml method', () => {
      const result = tablyful.toHtml(arrayOfObjectsData);
      expect(result).toContain('<table>');
    });

    it('should use toMarkdown method', () => {
      const result = tablyful.toMarkdown(arrayOfObjectsData);
      expect(result).toContain('| name |');
    });

    it('should use toLatex method', () => {
      const result = tablyful.toLatex(arrayOfObjectsData);
      expect(result).toContain('\\begin{tabular}');
    });
  });

  describe('Options Management', () => {
    it('should get current options', () => {
      const instance = new Tablyful({ outputFormat: 'html' });
      const options = instance.getOptions();

      expect(options.outputFormat).toBe('html');
    });

    it('should set new options', () => {
      const instance = new Tablyful();
      instance.setOptions({ outputFormat: 'latex', hasRowNumbers: true });
      const options = instance.getOptions();

      expect(options.outputFormat).toBe('latex');
      expect(options.hasRowNumbers).toBe(true);
    });

    it('should merge options when setting', () => {
      const instance = new Tablyful({ outputFormat: 'csv' });
      instance.setOptions({ hasRowNumbers: true });
      const options = instance.getOptions();

      expect(options.outputFormat).toBe('csv');
      expect(options.hasRowNumbers).toBe(true);
    });
  });

  describe('Custom Headers', () => {
    it('should apply custom headers', () => {
      const result = tablyful.convert(arrayOfObjectsData, 'csv', {
        headers: ['Full Name', 'Years', 'Location'],
      });

      expect(result).toContain('Full Name,Years,Location');
    });

    it('should maintain data mapping with custom headers', () => {
      const result = tablyful.convert(arrayOfObjectsData, 'csv', {
        headers: ['Full Name', 'Years', 'Location'],
      });

      expect(result).toContain('Alice,30,New York');
      expect(result).toContain('Bob,25,London');
    });
  });

  describe('Row Numbers', () => {
    it('should add row numbers when enabled', () => {
      const result = tablyful.convert(arrayOfObjectsData, 'csv', {
        hasRowNumbers: true,
      });

      expect(result).toContain('#,name,age,city');
      expect(result).toContain('1,Alice,30,New York');
      expect(result).toContain('2,Bob,25,London');
    });

    it('should use custom row number header', () => {
      const result = tablyful.convert(arrayOfObjectsData, 'csv', {
        hasRowNumbers: true,
        rowNumberHeader: 'ID',
      });

      expect(result).toContain('ID,name,age,city');
    });

    it('should add row numbers in all formats', () => {
      const csvResult = tablyful.toCsv(arrayOfObjectsData, { hasRowNumbers: true });
      const jsonResult = tablyful.toJson(arrayOfObjectsData, { hasRowNumbers: true });
      const mdResult = tablyful.toMarkdown(arrayOfObjectsData, { hasRowNumbers: true });

      expect(csvResult).toContain('#,');
      expect(jsonResult).toContain('"#":');
      expect(mdResult).toContain('| # |');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported data format', () => {
      const invalidData = 'not valid data' as any;

      expect(() => {
        tablyful.convert(invalidData, 'csv');
      }).toThrow();
    });

    it('should throw error for unavailable formatter', () => {
      expect(() => {
        tablyful.convert(arrayOfObjectsData, 'xml' as any);
      }).toThrow('Formatter "xml" is not available');
    });
  });

  describe('Parse-then-Format Workflow', () => {
    it('should support parse-then-format pattern', () => {
      // Parse once
      const tableData = tablyful.parse(arrayOfObjectsData);

      // Format to multiple outputs
      const csv = tablyful.format(tableData, 'csv');
      const json = tablyful.format(tableData, 'json');
      const markdown = tablyful.format(tableData, 'markdown');

      expect(csv).toContain('Alice');
      expect(json).toContain('Alice');
      expect(markdown).toContain('Alice');
    });

    it('should allow data inspection before formatting', () => {
      const tableData = tablyful.parse(arrayOfObjectsData);

      // Inspect data
      expect(tableData.headers).toHaveLength(3);
      expect(tableData.rows).toHaveLength(3);

      // Modify and format
      const result = tablyful.format(tableData, 'csv');
      expect(result).toBeTruthy();
    });
  });
});
