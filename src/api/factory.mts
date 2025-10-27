/**
 * Factory functions for creating parsers and formatters
 */

import type { BaseParser, BaseFormatter, InputData } from "@/types";
import {
  createArrayParser,
  createObjectParser,
  createObjectOfArraysParser,
  createNestedObjectParser,
} from "@/core/parser";
import { createCsvFormatter } from "@/formatters/csv";

/**
 * Available parser types
 */
export const PARSER_TYPES = {
  ARRAY: "array",
  OBJECT: "object",
  OBJECT_OF_ARRAYS: "object-of-arrays",
  NESTED_OBJECT: "nested-object",
} as const;

/**
 * Available formatter types
 */
export const FORMATTER_TYPES = {
  CSV: "csv",
  JSON: "json",
  MARKDOWN: "markdown",
  HTML: "html",
  LATEX: "latex",
} as const;

/**
 * Get all available parsers
 * @returns Array of all parser instances
 */
export const getAllParsers = (): BaseParser[] => {
  return [
    createArrayParser(),
    createObjectParser(),
    createObjectOfArraysParser(),
    createNestedObjectParser(),
  ];
};

/**
 * Detect the appropriate parser for the given input data
 * @param data - The input data to parse
 * @returns The parser that can handle the data, or null if none found
 */
export const detectParser = (data: InputData): BaseParser | null => {
  const parsers = getAllParsers();

  for (const parser of parsers) {
    if (parser.canParse(data)) {
      return parser;
    }
  }

  return null;
};

/**
 * Create a parser by type
 * @param type - The parser type
 * @returns The parser instance
 */
export const createParser = (type: string): BaseParser | null => {
  switch (type) {
    case PARSER_TYPES.ARRAY:
      return createArrayParser();
    case PARSER_TYPES.OBJECT:
      return createObjectParser();
    case PARSER_TYPES.OBJECT_OF_ARRAYS:
      return createObjectOfArraysParser();
    case PARSER_TYPES.NESTED_OBJECT:
      return createNestedObjectParser();
    default:
      return null;
  }
};

/**
 * Create a formatter by type
 * @param type - The formatter type
 * @returns The formatter instance
 */
export const createFormatter = (type: string): BaseFormatter | null => {
  switch (type) {
    case FORMATTER_TYPES.CSV:
      return createCsvFormatter();
    // TODO: Add other formatters as they are implemented
    // case FORMATTER_TYPES.JSON:
    //   return createJsonFormatter();
    // case FORMATTER_TYPES.MARKDOWN:
    //   return createMarkdownFormatter();
    // case FORMATTER_TYPES.HTML:
    //   return createHtmlFormatter();
    // case FORMATTER_TYPES.LATEX:
    //   return createLatexFormatter();
    default:
      return null;
  }
};

/**
 * Get available formatter types
 * @returns Array of available formatter type names
 */
export const getAvailableFormatters = (): string[] => {
  return [
    FORMATTER_TYPES.CSV,
    // TODO: Add as implemented
    // FORMATTER_TYPES.JSON,
    // FORMATTER_TYPES.MARKDOWN,
    // FORMATTER_TYPES.HTML,
    // FORMATTER_TYPES.LATEX,
  ];
};

/**
 * Check if a formatter type is available
 * @param type - The formatter type to check
 * @returns True if the formatter is available
 */
export const isFormatterAvailable = (type: string): boolean => {
  return getAvailableFormatters().includes(type);
};
