---
applyTo: "**/*.py"
description: This document provides guidelines for Python code.
---
# Instructions to write Python code

<general_guidelines>
- Use snake_case for variable and function names, and PascalCase for class names.
- Always use double quotes for the strings and use a newline at the end of the file.
- To concatenate a string, always use f-strings (formatted string literals). For long strings, use triple double quotes.
- Add the docstrings to the functions and classes to describe their purpose, usage and typing.
- Use the `if __name__ == "__main__":` construct to allow or prevent parts of code from being run when the modules are imported.
- When a variable is assignated for the first time, add the type hint to the variable declaration.
- When the Python version is 3.8 or higher, use the `match` statement for pattern matching instead of `if-elif-else` chains.
- Follow the PEP 8 style guide for Python code, which includes guidelines for naming conventions, indentation, line length, and more.
</general_guidelines>

<arrays>
- Use list comprehensions for creating lists from existing lists or other iterables. Avoid the `append` method of the list.
<example>
```py
# Recommended
my_list = [x for x in range(10) if x % 2 == 0]
# Not recommended
my_list = []
for x in range(10):
    if x % 2 == 0:
        my_list.append(x)
```
</example>
</arrays>

<dictionaries>
- To get a value from a dictionary use the `get` method to avoid `KeyError` exceptions. For example, use `my_dict.get("key", default_value)` to provide a default value if the key does not exist.
- Use dictionary comprehensions for creating dictionaries from existing dictionaries or other iterables. Avoid the `update` method of the dictionary.
<example>
```py
# Recommended
my_dict = {k: v for k, v in zip(keys, values)}
# Not recommended
my_dict = {}
for i in range(len(keys)):
    my_dict[keys[i]] = values[i]
```
</example>
</dictionaries>


<resource_management>
- Use the `with` statement to handle resource management, such as file operations, to ensure proper cleanup.
</resource_management>


<conditionals>
- Have preference for the ternary operator up to two levels.
- Short circuit the conditionals using `and`, `or` operators and early return.
- For conditionals with multiple branches, consider using a dictionary mapping for better readability.
- Use `any()` and `all()` functions for checking multiple conditions in a more Pythonic way.
- Use pattern match in Python 3.10 or higher for complex conditionals.
- Take advantage of the truthy and falsy values in Python to simplify conditions. For example, instead of checking if a variable is not `None`, you can simply check if it is truthy.
</conditionals>
