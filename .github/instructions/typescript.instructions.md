---
applyTo: "**/*.ts, **/*.tsx, **/*.js, **/*.jsx, **/*.mjs, **/*.cjs,"
description: Conventions and best practices for writing TypeScript and JavaScript code.
---
# Instructions to write TypeScript/JavaScript code

The next sections provide guidelines and best practices for writing TypeScript and JavaScript code.
In case of any ambiguity or uncertainty, refer to the examples section.

<general_guidelines>

- Use `ES2025` or greater version of modern JavaSript.
- Use `ES6` modules over CommonJS for imports and exports.
- In JavaScript files, use the `strict` directive. In additions, always use JsDoc when a variable is declared, and in functions and methods of the classes.
- Always use `===` and `!==` over `==` and `!=`.
- In TypeScript files, never add the types annotation for primitive types.
- Use `async` and `await` for asynchronous operations rather than `Promise` or callbacks.

<naming_conventions>
- Use `camelCase` for variable and function names, and `PascalCase` for class names.
- Use `UPPER_SNAKE_CASE` for constants.
</naming_conventions>

In case needed, see [Examples](ts-examples.instructions.md#general-guidelines)

</general_guidelines>


<code_style>

<general_formatting>
- Always use double quotes for the strings and use semicolon at the end.
- To concatenate a string, always use template literals. And never use the `+` operator. In addition, use template literals for multi-line strings.
</general_formatting>

<codding_paradigms>
- Use TypeScript features like interfaces, types, and enums to define data structures and types.
- Use functional programming concepts such as pure functions, immutability, and higher-order functions.
- Avoid side effects in functions and methods.
- Use the `pipe` function to compose functions together.

In case needed, see [Examples](ts-examples.instructions.md#coding-paradigms)

</codding_paradigms>

<variable_declaration>
- By default use `const`, unless you need to reassign the variable, in which case use `let`. Never use `var` keyword.
- Use the `using` keyword for resource management to ensure proper cleanup of resources.
- Use `Symbol.asyncDispose` to define an asynchronous cleanup method for resources.
-
In case needed, see [Examples](ts-examples.instructions.md#variable-declaration)

</variable_declaration>

<conditionals>
- Take advantage of the truthy and falsy values.
- Use for simple conditions the ternary operator instead of `if` statements. Use if for three levels of conditions and for more than four levels of conditions use `switch` statements.
</conditionals>

<loops>
- Have preference for `for of` loop to iterate over arrays and `for in` loop to iterate over objects.
- Never use of `for` loop to fill arrays and use the array method methods.
- To iterate for asynchronous operations, use `for await of` loop.
</loops>

<arrays>
- To increase an array use the spread operator and not the `push` method.
- Use `Array.from` to create arrays from iterable objects and `Array.fromAsync` for asynchronous operations.
- Use the array methods like `map`, `filter`, `reduce`, `find`, `some`, `every`, etc. to manipulate arrays. Do not use `for` loops to manipulate arrays.
- Use destructuring to extract values from arrays. Verify whether a default value is needed.
- Do not get the value of an array by index, instead use the `at` method. Especially use the `at` method to get last value of an array.
- Use the `Array.prototype.flat` or `Array.prototype.flatMap` method to flatten arrays.
- Use `Array.prototype.fromAsync` to create arrays from asynchronous iterables.
- When performance is a concern, use the global iterator methods (ES2025) that turn into an iterable data structures like the array to process them.

In case needed, see [Examples](ts-examples.instructions.md#arrays)

</arrays>

<object_literals>
- Use the spread operator to copy or merge objects and update or extend existing properties.
- Use destructuring to extract values from objects. Verify whether a default value is needed.
- Use `Object.fromEntries` to convert an array of key-value pairs into an object.
- Use `Object.entries`, `Object.keys`, and `Object.values` to iterate over objects.

In case needed, see [Examples](ts-examples.instructions.md#object-literals)

</object_literals>


<functions>
  - Write arrow functions over normal functions and take advantage of the implicit return.
  - When anonymous functions are used to process arrays, try to keep in one line and reduce the use of curly braces and `return` statements.
  - Use default parameters for functions to provide default values.
  - Use rest parameters to handle variable number of arguments.
  - Use destructuring in function parameters to extract values from objects and arrays.

In case needed, see [Examples](ts-examples.instructions.md#functions)

</functions>

<error_handling>
- Use the `throw` statement to throw custom errors.
- Use optional chaining (`?.`) to safely access nested properties without throwing an error if a property is `null` or `undefined`.
- Use nullish coalescing operator (`??`) to provide a default value when dealing with `null` or `undefined`.
- Take advantage of the logical assignment operators (`&&=`, `||=`, `??=`) to conditionally assign values.
- For error handling, use the `tryCatch` pattern for synchronous code to simulate Go's error handling.
- Uses of `Promise.try` can be used to handle asynchronous operations in a more readable way, similar to the `try` block in synchronous code.
- Use `async/await` wrapper to avoid repeating `catch` blocks.
- Use `Promise.all` for parallelism.
- Use the queue pattern for process that needs to be done one by one or controlled batches.
- Use debounced async calls to limit the rate of function execution.
- Use the timeout wrapper to ensure a function doesn't hang forever.
- Use chained async reducers to execute a series of asynchronous operations in sequence.
- Use cancelable promises when you need to abort ongoing asynchronous operations.
- Use the event emitter pattern to handle asynchronous decoupling.
- Use state machines to manage complex asynchronous states and model asynchronous transitions clearly.
- Use asynchronous generators for streaming and batching to handle infinite or chunked data without blocking.

In case needed, see [Examples](ts-examples.instructions.md#error-handling)

</error_handling>


<node_js>
- Use the `node:` prefix for built-in Node.js modules to avoid conflicts with user-defined modules.
- Use the `import.meta` object to access metadata about the current module, such as the URL of the module.
</node_js>

<web_api>
- Never use the `innerHTML` to set or get HTML content. Instead, use `textContent` for text content and `document.createRange().createContextualFragment(htmlString)` for HTML strings.
- Use the `CSSStyleSheet` interface to create and manipulate stylesheets. Use `CSSStyleRule` to create and manipulate CSS rules and the method `replaceSync(cssString)` to replace the content of a stylesheet.

In case needed, see [Examples](ts-examples.instructions.md#web-api)

</web_api>

</code_style>