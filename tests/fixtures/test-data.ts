/**
 * Test fixtures for the Tablyful library
 */

/**
 * Array of arrays - simple format
 */
export const arrayOfArraysData = [
  ["Name", "Age", "City"],
  ["Alice", 30, "New York"],
  ["Bob", 25, "London"],
  ["Carol", 35, "Tokyo"],
];

/**
 * Array of arrays without headers
 */
export const arrayOfArraysNoHeaders = [
  ["Alice", 30, "New York"],
  ["Bob", 25, "London"],
  ["Carol", 35, "Tokyo"],
];

/**
 * Array of objects - common format
 */
export const arrayOfObjectsData = [
  { name: "Alice", age: 30, city: "New York" },
  { name: "Bob", age: 25, city: "London" },
  { name: "Carol", age: 35, city: "Tokyo" },
];

/**
 * Object of arrays - columnar format
 */
export const objectOfArraysData = {
  name: ["Alice", "Bob", "Carol"],
  age: [30, 25, 35],
  city: ["New York", "London", "Tokyo"],
};

/**
 * Object of objects - nested format
 */
export const objectOfObjectsData = {
  row1: { name: "Alice", age: 30, city: "New York" },
  row2: { name: "Bob", age: 25, city: "London" },
  row3: { name: "Carol", age: 35, city: "Tokyo" },
};

/**
 * Large dataset for performance testing
 */
export function generateLargeDataset(rows: number) {
  return Array.from({ length: rows }, (_, i) => ({
    id: i + 1,
    name: `User${i + 1}`,
    email: `user${i + 1}@example.com`,
    age: 20 + (i % 50),
    active: i % 2 === 0,
  }));
}

/**
 * Data with special characters
 */
export const dataWithSpecialChars = [
  { product: 'Widget "Pro"', price: "$99.99", note: "Best\nseller" },
  { product: "Gadget & More", price: "$149.99", note: "New, improved" },
  { product: "Item #42", price: "$19.99", note: "Sale: 50% off" },
];

/**
 * Data with null/undefined values
 */
export const dataWithNulls = [
  { name: "Alice", age: 30, city: "New York" },
  { name: "Bob", age: null, city: "London" },
  { name: "Carol", age: 35, city: undefined },
];

/**
 * Empty data
 */
export const emptyArrayOfArrays: unknown[][] = [];
export const emptyArrayOfObjects: Record<string, unknown>[] = [];
export const emptyObjectOfArrays: Record<string, unknown[]> = {};
