/**
 * Input data type definitions for Tablyful
 * Supports various semi-structured data formats
 */

/**
 * Array of arrays format
 * Each inner array represents a row, first row may be headers
 */
export type ArrayOfArrays = Array<Array<unknown>>;

/**
 * Array of objects format
 * Each object represents a row with column names as keys
 */
export type ArrayOfObjects = Array<Record<string, unknown>>;

/**
 * Object of arrays format
 * Keys are column names, values are arrays of column data
 */
export type ObjectOfArrays = Record<string, Array<unknown>>;

/**
 * Object of objects format
 * Outer keys are row identifiers, inner objects are column data
 */
export type ObjectOfObjects = Record<string, Record<string, unknown>>;

/**
 * Union type for all supported input formats
 */
export type InputData =
  | ArrayOfArrays
  | ArrayOfObjects
  | ObjectOfArrays
  | ObjectOfObjects;

/**
 * Type guard to check if data is ObjectOfObjects
 * @param data - Input data to check
 * @returns True if data is ObjectOfObjects, false otherwise
 * @example
 * ```ts
 * const data: InputData = { row1: { a: 1 }, row2: { b: 2 } };
 * if (isObjectOfObjects(data)) {
 *   // data is now typed as ObjectOfObjects
 * }
 * ```
 */
export const isObjectOfObjects = (data: InputData): data is ObjectOfObjects =>
  typeof data === "object" &&
  data !== null &&
  !Array.isArray(data) &&
  Object.values(data).every(
    (value) =>
      typeof value === "object" && value !== null && !Array.isArray(value)
  );

/**
 * Input data with optional metadata
 */
export interface InputDataWithMetadata {
  data: InputData;
  headers?: string[];
  hasHeaders?: boolean;
}
