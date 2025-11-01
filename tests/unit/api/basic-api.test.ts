/**
 * Basic API tests for quick conversion functions
 */

import { describe, it, expect } from '@jest/globals';
import { toCsv, toJson, toHtml, toMarkdown, toLatex } from '@/index';
import {
  arrayOfObjectsData,
  arrayOfArraysData,
  objectOfArraysData,
} from '../../fixtures/test-data';

describe('Quick Conversion Functions', () => {
  describe('toCsv', () => {
    it('should convert array of objects to CSV', () => {
      const result = toCsv(arrayOfObjectsData);

      expect(result).toContain('name,age,city');
      expect(result).toContain('Alice,30,New York');
      expect(result).toContain('Bob,25,London');
      expect(result).toContain('Carol,35,Tokyo');
    });

    it('should convert array of arrays to CSV', () => {
      const result = toCsv(arrayOfArraysData);

      expect(result).toContain('Name,Age,City');
      expect(result).toContain('Alice,30,New York');
    });

    it('should use custom delimiter', () => {
      const result = toCsv(arrayOfObjectsData, {
        formatOptions: { delimiter: ';' },
      });

      expect(result).toContain('name;age;city');
      expect(result).toContain('Alice;30;New York');
    });

    it('should handle custom headers', () => {
      const result = toCsv(arrayOfObjectsData, {
        headers: ['Full Name', 'Years', 'Location'],
      });

      expect(result).toContain('Full Name,Years,Location');
    });

    it('should add row numbers', () => {
      const result = toCsv(arrayOfObjectsData, {
        hasRowNumbers: true,
      });

      expect(result).toContain('#,name,age,city');
      expect(result).toContain('1,Alice,30,New York');
      expect(result).toContain('2,Bob,25,London');
    });
  });

  describe('toJson', () => {
    it('should convert array of objects to JSON', () => {
      const result = toJson(arrayOfObjectsData);
      const parsed = JSON.parse(result);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toHaveProperty('name', 'Alice');
    });

    it('should format with pretty print', () => {
      const result = toJson(arrayOfObjectsData, {
        formatOptions: { pretty: true },
      });

      expect(result).toContain('\n');
      expect(result).toContain('  ');
    });

    it('should output as array format', () => {
      const result = toJson(arrayOfObjectsData, {
        formatOptions: { asArray: true },
      });

      expect(result.trim().startsWith('[')).toBe(true);
    });

    it('should add row numbers', () => {
      const result = toJson(arrayOfObjectsData, {
        hasRowNumbers: true,
      });
      const parsed = JSON.parse(result);

      expect(parsed[0]).toHaveProperty('#', 1);
      expect(parsed[1]).toHaveProperty('#', 2);
    });
  });

  describe('toMarkdown', () => {
    it('should convert array of objects to Markdown', () => {
      const result = toMarkdown(arrayOfObjectsData);

      expect(result).toContain('| name | age | city |');
      expect(result).toContain('| :--- | :--- | :--- |');
      expect(result).toContain('| Alice | 30 | New York |');
    });

    it('should use center alignment', () => {
      const result = toMarkdown(arrayOfObjectsData, {
        formatOptions: { align: 'center' },
      });

      expect(result).toContain('| :---: | :---: | :---: |');
    });

    it('should use right alignment', () => {
      const result = toMarkdown(arrayOfObjectsData, {
        formatOptions: { align: 'right' },
      });

      expect(result).toContain('| ---: | ---: | ---: |');
    });

    it('should work without padding', () => {
      const result = toMarkdown(arrayOfObjectsData, {
        formatOptions: { padding: false },
      });

      expect(result).toContain('|name|age|city|');
      expect(result).not.toContain('| name |');
    });

    it('should add row numbers', () => {
      const result = toMarkdown(arrayOfObjectsData, {
        hasRowNumbers: true,
      });

      expect(result).toContain('| # |');
      expect(result).toContain('| 1 |');
    });
  });

  describe('toHtml', () => {
    it('should convert array of objects to HTML', () => {
      const result = toHtml(arrayOfObjectsData);

      expect(result).toContain('<table>');
      expect(result).toContain('<thead>');
      expect(result).toContain('<tbody>');
      expect(result).toContain('<th scope="col">name</th>');
      expect(result).toContain('<td>Alice</td>');
    });

    it('should add table class', () => {
      const result = toHtml(arrayOfObjectsData, {
        formatOptions: { tableClass: 'data-table' },
      });

      expect(result).toContain('<table class="data-table">');
    });

    it('should add caption', () => {
      const result = toHtml(arrayOfObjectsData, {
        formatOptions: { caption: 'User Data' },
      });

      expect(result).toContain('<caption>User Data</caption>');
    });

    it('should add table id', () => {
      const result = toHtml(arrayOfObjectsData, {
        formatOptions: { id: 'users-table' },
      });

      expect(result).toContain('<table id="users-table">');
    });
  });

  describe('toLatex', () => {
    it('should convert array of objects to LaTeX', () => {
      const result = toLatex(arrayOfObjectsData);

      expect(result).toContain('\\begin{table}[h]');
      expect(result).toContain('\\begin{tabular}');
      expect(result).toContain('\\hline');
      expect(result).toContain('\\textbf{name}');
      expect(result).toContain('Alice & 30 & New York \\\\');
    });

    it('should use center alignment', () => {
      const result = toLatex(arrayOfObjectsData, {
        formatOptions: { align: 'center' },
      });

      expect(result).toContain('{|c|c|c|}');
    });

    it('should work without borders', () => {
      const result = toLatex(arrayOfObjectsData, {
        formatOptions: { borders: false },
      });

      expect(result).toContain('{lll}');
      expect(result).not.toContain('\\hline');
    });

    it('should add caption and label', () => {
      const result = toLatex(arrayOfObjectsData, {
        formatOptions: {
          caption: 'User Data',
          label: 'tab:users',
        },
      });

      expect(result).toContain('\\caption{User Data}');
      expect(result).toContain('\\label{tab:users}');
    });

    it('should work without table environment', () => {
      const result = toLatex(arrayOfObjectsData, {
        formatOptions: { useTableEnvironment: false },
      });

      expect(result).not.toContain('\\begin{table}');
      expect(result).toContain('\\begin{tabular}');
    });
  });

  describe('Input Format Support', () => {
    it('should handle array of arrays', () => {
      const csv = toCsv(arrayOfArraysData);
      const json = toJson(arrayOfArraysData);
      const md = toMarkdown(arrayOfArraysData);
      const html = toHtml(arrayOfArraysData);
      const latex = toLatex(arrayOfArraysData);

      expect(csv).toContain('Name');
      expect(json).toContain('Name');
      expect(md).toContain('Name');
      expect(html).toContain('Name');
      expect(latex).toContain('Name');
    });

    it('should handle object of arrays', () => {
      const csv = toCsv(objectOfArraysData);
      const json = toJson(objectOfArraysData);
      const md = toMarkdown(objectOfArraysData);
      const html = toHtml(objectOfArraysData);
      const latex = toLatex(objectOfArraysData);

      expect(csv).toContain('Alice');
      expect(json).toContain('Alice');
      expect(md).toContain('Alice');
      expect(html).toContain('Alice');
      expect(latex).toContain('Alice');
    });
  });
});
