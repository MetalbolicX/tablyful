---
applyTo: "**/*.ts, **/*.tsx, **/*.js, **/*.jsx, **/*.mjs, **/*.cjs,"
description: Examples of TypeScript and JavaScript code.
---

# General Guidelines

<example>
```js
"use strict";

/**
 * Adds two numbers.
 * @param {number} a - The first number.
 * @param {number} b - The second number.
 * @returns {number} The sum of the two numbers.
 */
const add = (a, b) =>  a + b;

const x /** @type {number} */ = 5;
const y /** @type {number} */ = 10;
const sum = add(x, y);
console.log(`The sum is: ${sum}`);
```
</example>

# Coding Paradigms

<example>
```ts
const salute = (name?: string = "John Doe"): string => `Hello, ${name}!`;
const toUpperCase = (str: string): string => str.toUpperCase();

const pipe = (...fns: Function[]) => (value: any) =>
fns.reduce((acc, fn) => fn(acc), value);

const result = pipe(salute, toUpperCase)("Alice");
console.log(result); // "HELLO, ALICE!"
```
</example>

# Variable Declaration

## Resource Management

<example>
```js
const getConnection = async () => {
const connection = await getDatabaseConnection();
return {
    connection,
    [Symbol.asyncDispose]: async () => await connection.close()
};
};

{
await using db = getConnection();
// Use db.connection for queries
}
// Connection is automatically closed here
```
</example>
<example>
```js
import { open } from "node:fs/promises";

const getFileHandle = async (path) => {
const fileHandle = await open(path, "r");
return {
    fileHandle,
    [Symbol.asyncDispose]: async () => await fileHandle.close()
};
};

{
await using file = getFileHandle("example.txt");
// Operate on file.fileHandle
}
// File is automatically closed after this block
```
</example>

# Arrays

<example>
```ts
// Do not use see <loop> sections
const numbers = [];
for (let i = 0; i < 10; i++) {
numbers.push(i);
}

// Recommended
const numbers = Array.from({ length: 10 }, (_, i) => i);

const moreNumbers = [10, 11, 12];
const allNumbers = [...numbers, ...moreNumbers];

async function* generateNumbers(): AsyncGenerator<number> {
for (let i = 0; i < 3; i++) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async operation
    yield i;
}
}

const createArray = async (): Promise<void> => {
const numbersArray = await Array.fromAsync(generateNumbers());
console.log(numbersArray); // Output: [0, 1, 2]
};

createArray();

const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(num => num * 2); // Using map to double each number
const evenNumbers = numbers.filter(num => num % 2 === 0); // Using filter to get even numbers
const lastEvenNumber = evenNumbers.at(-1); // Using at to get the last even number

const iterator = Iteraror.from(numbers);
const result = iterator.map(num => num * 2).filter(num => num % 2 === 0).take(2).toArray();

const [first = 0, second, ...rest] = numbers; // Destructuring an array
```
</example>

# Object Literals

<example>
```ts
const person = {
name: "Alice",
age: 30,
greet() {
    console.log(`Hello, my name is ${this.name}`);
}
};

const newPerson = { ...person, age: 31, city: "Wonderland" }; // Merging objects

const { name, age } = person; // Destructuring an object
console.log(name, age); // Output: Alice 30

const coordinates = { x: 10, y: 20 };
const { x = 0, y = 0 } = coordinates; // Destructuring with default values
console.log(x, y); // Output: 10 20

const updatedPerson = { ...person, age: 31 }; // Updating properties

const entries = Object.entries(person);
for (const [key, value] of entries) {
console.log(`${key}: ${value}`);
}

const keyValuePairs = [["name", "Alice"], ["age", 30]];
const objFromEntries = Object.fromEntries(keyValuePairs);
console.log(objFromEntries); // Output: { name: 'Alice', age: 30 }
</example>

# functions

<example>
```ts
// Functions with destructured parameters
const printPerson = ({ name, age, city }): void =>
console.log(`Name: ${name}, Age: ${age}, City: ${city}`);

const printCoordinates = ([x, y]: [number, number]): void =>
console.log(`X: ${x}, Y: ${y}`);

const calculateSum = (...numbers: number[]): number =>
numbers.reduce((total, num) => total + num, 0);

const greet = (name: string = "Guest"): string => `Hello, ${name}!`;


const coordinates: [number, number][] = [
[10, 20, 30],
[20, 30, 40],
[30, 40, 50],
[30, 40, 50],
[30, 40, 50]
];

const xyCoordinates = coordinates.map(([x, y]) => ({ x, y }));
```
</example>

# Error Handling

## Logical Assignment Operators

<example>
```ts
/*
A real-world use case might be in feature flagging, where you want to ensure both a feature flag and some condition are met:
*/
let isFeatureEnabled = true;
let userIsAdmin = false;

// The feature will only be enabled for admin users
isFeatureEnabled &&= userIsAdmin;  // isFeatureEnabled becomes false

const greet = (name: string = ""): void => {
name ||= "Guest";
console.log(`Hello, ${name}!`);
};

greet(); // Outputs: "Hello, Guest!"
greet("Alice"); // Outputs: "Hello, Alice!"

/*
In scenarios where you only want to set a default if a variable is genuinely absent and not just falsy, this operator shines:
*/
let userPreferences = {
theme: "",
fontSize: null
};

userPreferences.theme ??= "dark";  // theme remains ""
userPreferences.fontSize ??= 16;   // fontSize becomes 16
```
</example>

## Try Catch Pattern

<example>
```ts
const fetchData = (url: string): Promise<any> =>
Promise.try(async () => {
    const response = await fetch(url);
    if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}).catch(error => {
    console.error("Error fetching data:", error);
    throw error;
});

const tryCatch = <T>(fn: () => T): [T, null] | [null, unknown] => {
try {
    const result = fn();
    return [result, null];
} catch (error) {
    return [null, error];
}
};

const [data, error] = tryCatch(() => JSON.parse('{"key": "value"}'));
if (error) {
console.error("Error parsing JSON:", error);
} else {
console.log("Parsed data:", data);
}
```
</example>

## Async code

### Async wrapper

<example>
```js
const asyncHandler = fn => (...args) =>
  fn(...args).catch(err => console.error('Caught:', err));
```
</example>

### `Promise.all` for Parallelism

<example>
```js
const [user, posts] = await Promise.all([
  fetchUser(userId),
  fetchUserPosts(userId)
]);
```
</example>

### Async Queue Pattern

<example>
```js
const queue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;
  const job = queue.shift();
  await job();
  isProcessing = false;
  processQueue();
}
```
</example>

### Debounced Async Calls

<example>
```js
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
```
</example>

### Timeout Wrapper

<example>
```js
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}
```
</example>

### Chained Async Reducers

<example>
```js
await tasks.reduce(
  (prev, task) => prev.then(() => task()),
  Promise.resolve()
);
```
</example>

### Cancelable Promises

<example>
```js
function cancelable(promise) {
  let cancel;
  const wrapped = new Promise((resolve, reject) => {
    cancel = () => reject(new Error('Canceled'));
    promise.then(resolve, reject);
  });
  return { promise: wrapped, cancel };
}
```
</example>

### Event Emitter Pattern

<example>
```js
import { EventEmitter } from 'events';
const emitter = new EventEmitter();

emitter.on("data_received", async (data) => await process(data));
```
</example>

### State Machine Pattern

<example>
```js
const fetchMachine = createMachine({
  id: 'fetchUser',
  initial: 'idle',
  states: {
    idle: { on: { FETCH: 'loading' } },
    loading: {
      invoke: {
        src: 'fetchUser',
        onDone: 'success',
        onError: 'failure'
      }
    },
    success: {},
    failure: {}
  }
});
```
</example>

### Async Generators

<example>
```js
async function* fetchPages() {
  let page = 1;
  while (true) {
    const data = await fetchPage(page);
    if (!data.length) break;
    yield data;
    page++;
  }
}
```
</example>

## Promise Try

### Wrapping Synchronous Code

<example>
```js
// Wrapping synchronous code in a promise
function syncFunction() {
    return "This is a synchronous result";
}
const promise = Promise.try(() => syncFunction());
promise.then(result => {
    console.log(result); // Output: This is a synchronous result
}).catch(err => {
    console.error(err);
});
    ```
</example>

### Catching Synchronous Errors

<example>
```js
// Catching synchronous errors
function throwError() {
    throw new Error("An error occurred!");
}

Promise.try(() => throwError())
    .then(result => {
    console.log(result);
    })
    .catch(err => {
    console.error(err.message); // Output: An error occurred!
});
```
</example>

### Combining Synchronous and Asynchronous Code

<example>
```js
// Combining synchronous and asynchronous code
function asyncFunction() {
    return new Promise(resolve => {
    setTimeout(() => resolve("Asynchronous result"), 1000);
});
}

function syncFunction() {
    return "Synchronous result";
}

Promise.try(() => asyncFunction())
    .then(result => {
    console.log(result); // Output after 1 second: Asynchronous result
    return Promise.try(() => syncFunction());
    })
    .then(result => {
    console.log(result); // Output: Synchronous result
    })
    .catch(err => {
    console.error(err);
    });
```
</example>

# Web API

## Creating and Manipulating HTML Elements

<example>
```js
const greeting = "<h1>Hello, World!</h1>";
const parser = document.createRange();
const fragment = parser.createContextualFragment(greeting);

document.body.appendChild(fragment);

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(`
body {
background-color: lightblue;
}
h1 {
color: navy;
font-size: 24px;
}
`);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
```
</example>