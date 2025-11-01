/**
 * Factory function tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  createParser,
  createFormatter,
  detectParser,
  getAllParsers,
  getAvailableFormatters,
  isFormatterAvailable,
  PARSER_TYPES,
  FORMATTER_TYPES,
} from '@/api/factory';
import {
  arrayOfArraysData,
  arrayOfObjectsData,
  objectOfArraysData,
  objectOfObjectsData,
} from '../../fixtures/test-data';

describe('Factory Functions', () => {
  describe('Parser Factory', () => {
    it('should create array parser', () => {
      const parser = createParser(PARSER_TYPES.ARRAY);
      expect(parser).not.toBeNull();
      expect(parser?.parserName).toBe('array-parser');
    });

    it('should create object parser', () => {
      const parser = createParser(PARSER_TYPES.OBJECT);
      expect(parser).not.toBeNull();
      expect(parser?.parserName).toBe('object-parser');
    });

    it('should create object-of-arrays parser', () => {
      const parser = createParser(PARSER_TYPES.OBJECT_OF_ARRAYS);
      expect(parser).not.toBeNull();
      expect(parser?.parserName).toBe('object-of-arrays-parser');
    });

    it('should create nested-object parser', () => {
      const parser = createParser(PARSER_TYPES.NESTED_OBJECT);
      expect(parser).not.toBeNull();
      expect(parser?.parserName).toBe('nested-object-parser');
    });

    it('should return null for unknown parser type', () => {
      const parser = createParser('unknown');
      expect(parser).toBeNull();
    });
  });

  describe('Formatter Factory', () => {
    it('should create CSV formatter', () => {
      const formatter = createFormatter(FORMATTER_TYPES.CSV);
      expect(formatter).not.toBeNull();
      expect(formatter?.formatName).toBe('csv');
    });

    it('should create JSON formatter', () => {
      const formatter = createFormatter(FORMATTER_TYPES.JSON);
      expect(formatter).not.toBeNull();
      expect(formatter?.formatName).toBe('json');
    });

    it('should create Markdown formatter', () => {
      const formatter = createFormatter(FORMATTER_TYPES.MARKDOWN);
      expect(formatter).not.toBeNull();
      expect(formatter?.formatName).toBe('markdown');
    });

    it('should create HTML formatter', () => {
      const formatter = createFormatter(FORMATTER_TYPES.HTML);
      expect(formatter).not.toBeNull();
      expect(formatter?.formatName).toBe('html');
    });

    it('should create LaTeX formatter', () => {
      const formatter = createFormatter(FORMATTER_TYPES.LATEX);
      expect(formatter).not.toBeNull();
      expect(formatter?.formatName).toBe('latex');
    });

    it('should return null for unknown formatter type', () => {
      const formatter = createFormatter('unknown');
      expect(formatter).toBeNull();
    });
  });

  describe('Parser Detection', () => {
    it('should detect array parser', () => {
      const parser = detectParser(arrayOfArraysData);
      expect(parser).not.toBeNull();
      expect(parser?.parserName).toBe('array-parser');
    });

    it('should detect object parser', () => {
      const parser = detectParser(arrayOfObjectsData);
      expect(parser).not.toBeNull();
      expect(parser?.parserName).toBe('object-parser');
    });

    it('should detect object-of-arrays parser', () => {
      const parser = detectParser(objectOfArraysData);
      expect(parser).not.toBeNull();
      expect(parser?.parserName).toBe('object-of-arrays-parser');
    });

    it('should detect nested-object parser', () => {
      const parser = detectParser(objectOfObjectsData);
      expect(parser).not.toBeNull();
      expect(parser?.parserName).toBe('nested-object-parser');
    });

    it('should return null for invalid data', () => {
      const parser = detectParser('not valid' as any);
      expect(parser).toBeNull();
    });
  });

  describe('Parser Registry', () => {
    it('should get all parsers', () => {
      const parsers = getAllParsers();
      expect(parsers).toHaveLength(4);
      expect(parsers.map(p => p.parserName)).toContain('array-parser');
      expect(parsers.map(p => p.parserName)).toContain('object-parser');
      expect(parsers.map(p => p.parserName)).toContain('object-of-arrays-parser');
      expect(parsers.map(p => p.parserName)).toContain('nested-object-parser');
    });
  });

  describe('Formatter Registry', () => {
    it('should get available formatters', () => {
      const formatters = getAvailableFormatters();
      expect(formatters).toHaveLength(5);
      expect(formatters).toContain('csv');
      expect(formatters).toContain('json');
      expect(formatters).toContain('markdown');
      expect(formatters).toContain('html');
      expect(formatters).toContain('latex');
    });

    it('should check formatter availability', () => {
      expect(isFormatterAvailable('csv')).toBe(true);
      expect(isFormatterAvailable('json')).toBe(true);
      expect(isFormatterAvailable('markdown')).toBe(true);
      expect(isFormatterAvailable('html')).toBe(true);
      expect(isFormatterAvailable('latex')).toBe(true);
      expect(isFormatterAvailable('unknown')).toBe(false);
    });
  });

  describe('Parser Type Constants', () => {
    it('should have correct parser types', () => {
      expect(PARSER_TYPES.ARRAY).toBe('array-parser');
      expect(PARSER_TYPES.OBJECT).toBe('object-parser');
      expect(PARSER_TYPES.OBJECT_OF_ARRAYS).toBe('object-of-arrays-parser');
      expect(PARSER_TYPES.NESTED_OBJECT).toBe('nested-object-parser');
    });
  });

  describe('Formatter Type Constants', () => {
    it('should have correct formatter types', () => {
      expect(FORMATTER_TYPES.CSV).toBe('csv');
      expect(FORMATTER_TYPES.JSON).toBe('json');
      expect(FORMATTER_TYPES.MARKDOWN).toBe('markdown');
      expect(FORMATTER_TYPES.HTML).toBe('html');
      expect(FORMATTER_TYPES.LATEX).toBe('latex');
    });
  });
});
