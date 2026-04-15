/**
 * TypeScript usage example for Tablyful.
 * This example imports the generated TypeScript wrapper and handles ReScript result values.
 */

import {
  availableFormatters,
  availableParsers,
  detectFormat,
  toCsv,
  toJson,
  type result,
} from "../../src/Tablyful.gen.ts";

const logResult = <T>(label: string, value: result<T>): void => {
  if (value.TAG === "Ok") {
    console.log(`${label}\n${value._0}\n`);
    return;
  }

  console.error(`${label} failed: ${value._0.message}`);
};

const arrayData: unknown = [
  ["name", "age", "city"],
  ["Alice", 30, "New York"],
  ["Bob", 25, "Los Angeles"],
  ["Charlie", 35, "Chicago"],
];

const csvResult = toCsv(arrayData, undefined);
const jsonResult = toJson(arrayData, undefined);

console.log(`Detected input format: ${detectFormat(arrayData)}`);
const parserNames = availableParsers();
const formatterNames = availableFormatters();
console.log("Available parsers:", parserNames);
console.log("Available formatters:", formatterNames);
console.log();

logResult("CSV output", csvResult);
logResult("JSON output", jsonResult);
