/**
 * Basic usage example for Tablyful
 * Demonstrates converting various data formats to CSV
 */

import { toCsv, Tablyful, createTablyful } from "../../dist/index.mjs";

// Example 1: Array of arrays (simple table data)
const arrayData = [
  ["Name", "Age", "City"],
  ["Alice", 30, "New York"],
  ["Bob", 25, "Los Angeles"],
  ["Charlie", 35, "Chicago"],
];

console.log("=== Example 1: Array of Arrays ===");
console.log(toCsv(arrayData));
console.log();

// Example 2: Array of objects (common JSON format)
const objectData = [
  { name: "Alice", age: 30, city: "New York" },
  { name: "Bob", age: 25, city: "Los Angeles" },
  { name: "Charlie", age: 35, city: "Chicago" },
];

console.log("=== Example 2: Array of Objects ===");
console.log(toCsv(objectData));
console.log();

// Example 3: Object of arrays (columnar data)
const columnarData = {
  name: ["Alice", "Bob", "Charlie"],
  age: [30, 25, 35],
  city: ["New York", "Los Angeles", "Chicago"],
};

console.log("=== Example 3: Object of Arrays (Columnar) ===");
console.log(toCsv(columnarData));
console.log();

// Example 4: Object of objects (nested records)
const nestedData = {
  user_001: { name: "Alice", age: 30, city: "New York" },
  user_002: { name: "Bob", age: 25, city: "Los Angeles" },
  user_003: { name: "Charlie", age: 35, city: "Chicago" },
};

console.log("=== Example 4: Object of Objects (Nested) ===");
console.log(toCsv(nestedData));
console.log();

// Example 5: Using the Tablyful class with options
const tablyful = createTablyful({
  hasRowNumbers: true,
  rowNumberHeader: "ID",
});

console.log("=== Example 5: With Row Numbers ===");
console.log(tablyful.toCsv(objectData));
console.log();

// Example 6: Custom headers
const tablyfulWithHeaders = new Tablyful({
  headers: ["Full Name", "Years", "Location"],
});

console.log("=== Example 6: Custom Headers ===");
console.log(tablyfulWithHeaders.toCsv(objectData));
console.log();

// Example 7: Custom CSV options
const customCsv = toCsv(objectData, {
  formatOptions: {
    delimiter: ";",
    includeHeaders: true,
  },
});

console.log("=== Example 7: Custom CSV Delimiter (semicolon) ===");
console.log(customCsv);
console.log();

// Example 8: Parse and format separately
const tablyfulInstance = createTablyful();
const tableData = tablyfulInstance.parse(objectData);

console.log("=== Example 8: Parsed Table Data ===");
console.log("Headers:", tableData.headers);
console.log("Row count:", tableData.metadata.rowCount);
console.log("Column count:", tableData.metadata.columnCount);
console.log();

const formatted = tablyfulInstance.format(tableData, "csv");
console.log("Formatted CSV:");
console.log(formatted);
