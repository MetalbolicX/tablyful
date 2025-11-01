/**
 * Integration tests for end-to-end workflows
 */

import { describe, it, expect } from '@jest/globals';
import { Tablyful, toCsv, toJson, toHtml, toMarkdown, toLatex } from '@/index';
import {
  arrayOfObjectsData,
  arrayOfArraysData,
  objectOfArraysData,
  objectOfObjectsData,
  dataWithSpecialChars,
  generateLargeDataset,
} from '../fixtures/test-data';

describe('Integration Tests', () => {
  describe('End-to-End Workflows', () => {
    it('should handle complete workflow with all formats', () => {
      const data = arrayOfObjectsData;

      const csv = toCsv(data);
      const json = toJson(data);
      const html = toHtml(data);
      const markdown = toMarkdown(data);
      const latex = toLatex(data);

      expect(csv).toBeTruthy();
      expect(json).toBeTruthy();
      expect(html).toBeTruthy();
      expect(markdown).toBeTruthy();
      expect(latex).toBeTruthy();

      expect(csv).toContain('Alice');
      expect(json).toContain('Alice');
      expect(html).toContain('Alice');
      expect(markdown).toContain('Alice');
      expect(latex).toContain('Alice');
    });

    it('should convert same data to all formats consistently', () => {
      const data = arrayOfObjectsData;

      const csv = toCsv(data);
      const json = toJson(data);
      const markdown = toMarkdown(data);

      // All should have the same data
      expect(csv.match(/Alice/g)?.length).toBe(1);
      expect(json.match(/Alice/g)?.length).toBe(1);
      expect(markdown.match(/Alice/g)?.length).toBe(1);
    });

    it('should handle parse-then-format workflow', () => {
      const tablyful = new Tablyful();
      const tableData = tablyful.parse(arrayOfObjectsData);

      const csv = tablyful.format(tableData, 'csv');
      const json = tablyful.format(tableData, 'json');
      const markdown = tablyful.format(tableData, 'markdown');
      const html = tablyful.format(tableData, 'html');
      const latex = tablyful.format(tableData, 'latex');

      expect(csv).toContain('name,age,city');
      expect(JSON.parse(json)).toHaveLength(3);
      expect(markdown).toContain('| name |');
      expect(html).toContain('<table>');
      expect(latex).toContain('\\begin{tabular}');
    });
  });

  describe('Multi-Format Data Support', () => {
    it('should handle array of arrays', () => {
      const csv = toCsv(arrayOfArraysData);
      const json = toJson(arrayOfArraysData);
      const markdown = toMarkdown(arrayOfArraysData);

      expect(csv).toContain('Name');
      expect(json).toContain('Name');
      expect(markdown).toContain('Name');
    });

    it('should handle array of objects', () => {
      const csv = toCsv(arrayOfObjectsData);
      const json = toJson(arrayOfObjectsData);
      const markdown = toMarkdown(arrayOfObjectsData);

      expect(csv).toContain('name');
      expect(json).toContain('name');
      expect(markdown).toContain('name');
    });

    it('should handle object of arrays', () => {
      const csv = toCsv(objectOfArraysData);
      const json = toJson(objectOfArraysData);
      const markdown = toMarkdown(objectOfArraysData);

      expect(csv).toContain('Alice');
      expect(json).toContain('Alice');
      expect(markdown).toContain('Alice');
    });

    it('should handle object of objects', () => {
      const csv = toCsv(objectOfObjectsData);
      const json = toJson(objectOfObjectsData);
      const markdown = toMarkdown(objectOfObjectsData);

      expect(csv).toContain('Alice');
      expect(json).toContain('Alice');
      expect(markdown).toContain('Alice');
    });
  });

  describe('Special Characters Handling', () => {
    it('should escape special characters in CSV', () => {
      const result = toCsv(dataWithSpecialChars);

      expect(result).toContain('"Widget ""Pro"""'); // Quotes need escaping
      expect(result).toContain('Gadget & More'); // Ampersand doesn't need quoting in CSV
      expect(result).toContain('"New, improved"'); // Comma triggers quoting
    });

    it('should escape special characters in HTML', () => {
      const result = toHtml(dataWithSpecialChars);

      expect(result).toContain('&quot;');
      expect(result).toContain('&amp;');
    });

    it('should escape special characters in LaTeX', () => {
      const result = toLatex(dataWithSpecialChars);

      expect(result).toContain('\\&');
      expect(result).toContain('\\#');
      expect(result).toContain('\\$');
    });

    it('should escape special characters in Markdown', () => {
      const data = [{ text: 'Value | with | pipes' }];
      const result = toMarkdown(data);

      expect(result).toContain('\\|');
    });
  });

  describe('Custom Headers Integration', () => {
    it('should apply custom headers across all formats', () => {
      const customHeaders = ['Full Name', 'Years Old', 'Location'];

      const csv = toCsv(arrayOfObjectsData, { headers: customHeaders });
      const json = toJson(arrayOfObjectsData, { headers: customHeaders });
      const markdown = toMarkdown(arrayOfObjectsData, { headers: customHeaders });
      const html = toHtml(arrayOfObjectsData, { headers: customHeaders });
      const latex = toLatex(arrayOfObjectsData, { headers: customHeaders });

      expect(csv).toContain('Full Name');
      expect(json).toContain('Full Name');
      expect(markdown).toContain('Full Name');
      expect(html).toContain('Full Name');
      expect(latex).toContain('Full Name');

      // Data should still be present
      expect(csv).toContain('Alice');
      expect(json).toContain('Alice');
      expect(markdown).toContain('Alice');
      expect(html).toContain('Alice');
      expect(latex).toContain('Alice');
    });
  });

  describe('Row Numbers Integration', () => {
    it('should add row numbers across all formats', () => {
      const options = { hasRowNumbers: true };

      const csv = toCsv(arrayOfObjectsData, options);
      const json = toJson(arrayOfObjectsData, options);
      const markdown = toMarkdown(arrayOfObjectsData, options);
      const html = toHtml(arrayOfObjectsData, options);
      const latex = toLatex(arrayOfObjectsData, options);

      expect(csv).toContain('#,name');
      expect(json).toContain('"#"');
      expect(markdown).toContain('| # |');
      expect(html).toContain('<th scope="col">#</th>');
      expect(latex).toContain('\\textbf{\\#}');

      expect(csv).toContain('1,Alice');
      // JSON pretty-print adds a space after the colon
      expect(json).toMatch(/"#":\s*1/);
      expect(markdown).toContain('| 1 |');
      expect(html).toContain('<td>1</td>');
      expect(latex).toContain('1 &');
    });
  });

  describe('Large Dataset Handling', () => {
    it('should handle large datasets efficiently', () => {
      const largeData = generateLargeDataset(1000);

      const csv = toCsv(largeData);
      const json = toJson(largeData);
      const markdown = toMarkdown(largeData);

      expect(csv).toContain('User1');
      expect(csv).toContain('User1000');
      expect(json).toContain('User1');
      expect(json).toContain('User1000');
      expect(markdown).toContain('User1');
      expect(markdown).toContain('User1000');
    });
  });

  describe('Options Inheritance', () => {
    it('should apply global options to all conversions', () => {
      const tablyful = new Tablyful({
        hasRowNumbers: true,
        rowNumberHeader: 'ID',
      });

      const csv = tablyful.toCsv(arrayOfObjectsData);
      const json = tablyful.toJson(arrayOfObjectsData);
      const markdown = tablyful.toMarkdown(arrayOfObjectsData);

      expect(csv).toContain('ID,name');
      expect(json).toContain('"ID"');
      expect(markdown).toContain('| ID |');
    });

    it('should allow option override per conversion', () => {
      const tablyful = new Tablyful({
        hasRowNumbers: false,
      });

      const withoutRows = tablyful.toCsv(arrayOfObjectsData);
      const withRows = tablyful.toCsv(arrayOfObjectsData, { hasRowNumbers: true });

      expect(withoutRows).not.toContain('#,');
      expect(withRows).toContain('#,');
    });
  });

  describe('Error Recovery', () => {
    it('should handle empty data gracefully', () => {
      const emptyArray: any[] = [];

      expect(() => toCsv(emptyArray)).not.toThrow();
      expect(() => toJson(emptyArray)).not.toThrow();
      expect(() => toMarkdown(emptyArray)).not.toThrow();
    });

    it('should throw meaningful error for invalid data', () => {
      const invalidData = 'not an array or object' as any;

      expect(() => toCsv(invalidData)).toThrow();
    });

    it('should throw error for unknown format', () => {
      const tablyful = new Tablyful();

      expect(() => {
        tablyful.convert(arrayOfObjectsData, 'xml' as any);
      }).toThrow('Formatter "xml" is not available');
    });
  });

  describe('Real-World Use Cases', () => {
    it('should format employee data for different outputs', () => {
      const employees = [
        { id: 1, name: 'Alice', dept: 'Engineering', salary: 95000 },
        { id: 2, name: 'Bob', dept: 'Marketing', salary: 75000 },
        { id: 3, name: 'Carol', dept: 'Sales', salary: 85000 },
      ];

      // CSV for spreadsheet
      const csv = toCsv(employees, {
        formatOptions: { delimiter: ',' },
      });

      // JSON for API
      const json = toJson(employees, {
        formatOptions: { pretty: true },
      });

      // Markdown for documentation
      const markdown = toMarkdown(employees, {
        formatOptions: { align: 'right' },
      });

      // HTML for web page
      const html = toHtml(employees, {
        formatOptions: { tableClass: 'employee-table' },
      });

      expect(csv).toContain('Engineering');
      expect(json).toContain('Engineering');
      expect(markdown).toContain('Engineering');
      expect(html).toContain('Engineering');
    });
  });
});
