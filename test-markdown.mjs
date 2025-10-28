import { toMarkdown } from "./dist/index.mjs";

// Test data - array of objects
const employees = [
  { name: "Alice Johnson", department: "Engineering", salary: 95000, active: true },
  { name: "Bob Smith", department: "Marketing", salary: 75000, active: true },
  { name: "Carol Williams", department: "Engineering", salary: 110000, active: false },
  { name: "David Brown", department: "Sales", salary: 85000, active: true },
];

console.log("=== Basic Markdown Table ===");
const basicMarkdown = toMarkdown(employees);
console.log(basicMarkdown);
console.log();

console.log("=== Markdown with Custom Headers ===");
const customHeadersMarkdown = toMarkdown(employees, {
  headers: ["Employee Name", "Dept.", "Annual Salary", "Status"],
});
console.log(customHeadersMarkdown);
console.log();

console.log("=== Markdown with Row Numbers ===");
const rowNumbersMarkdown = toMarkdown(employees, {
  hasRowNumbers: true,
});
console.log(rowNumbersMarkdown);
console.log();

console.log("=== Markdown with Center Alignment ===");
const centerAlignMarkdown = toMarkdown(employees, {
  formatOptions: {
    align: "center",
  },
});
console.log(centerAlignMarkdown);
console.log();

console.log("=== Markdown with Right Alignment ===");
const rightAlignMarkdown = toMarkdown(employees, {
  formatOptions: {
    align: "right",
  },
});
console.log(rightAlignMarkdown);
console.log();

console.log("=== Markdown without Padding ===");
const noPaddingMarkdown = toMarkdown(employees, {
  formatOptions: {
    padding: false,
  },
});
console.log(noPaddingMarkdown);
console.log();

console.log("=== Markdown with Special Characters ===");
const specialData = [
  { product: "Widget | Pro", price: "$99.99", notes: "Best\nseller" },
  { product: "Gadget \\| Plus", price: "$149.99", notes: "New\nrelease" },
];
const specialMarkdown = toMarkdown(specialData);
console.log(specialMarkdown);
console.log();

console.log("=== Markdown with Array of Arrays ===");
const arrayData = [
  ["Product", "Price", "Stock"],
  ["Widget", 29.99, 100],
  ["Gadget", 49.99, 50],
  ["Gizmo", 19.99, 200],
];
const arrayMarkdown = toMarkdown(arrayData);
console.log(arrayMarkdown);
console.log();

console.log("=== Markdown with Object of Arrays (Columnar) ===");
const columnarData = {
  product: ["Widget", "Gadget", "Gizmo"],
  price: [29.99, 49.99, 19.99],
  stock: [100, 50, 200],
};
const columnarMarkdown = toMarkdown(columnarData);
console.log(columnarMarkdown);
