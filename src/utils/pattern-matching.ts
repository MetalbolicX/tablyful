export interface Matched<T> {
  when(): Matched<T>;
  otherwise(): T;
}

/**
 * Creates a matched object that represents a successful match.
 * @param x - The matched value.
 * @returns An object with when and otherwise methods.
 */
const matched = <T>(x: T): Matched<T> => ({
  when: (): Matched<T> => matched(x),
  otherwise: (): T => x,
});

/**
 * Creates a pattern matching utility for the given value.
 * @template T The type of the value to match.
 * @param x - The value to match.
 * @returns An object with `when` and `otherwise` methods.
 * @example
 * ```ts
 * const result = match(42)
 *   .when(x => x < 10, x => "Less than 10")
 *   .when(x => x === 42, x => "Equal to 42")
 *   .otherwise(x => "Greater than 10");
 * console.log(result); // "Equal to 42"
 * ```
 */
export const match = <T>(x: T) => ({
  /**
   * Adds a case to the pattern match.
   * @template U The return type of the function if the predicate is true.
   * @param predicate - A function that takes the value and returns a boolean.
   * @param fn - A function that takes the value and returns a result if the predicate is true.
   * @returns If the predicate is true, returns a matched object with the result, otherwise returns the match object for chaining.
   */
  when: <U>(predicate: (x: T) => boolean, fn: (x: T) => U) =>
    predicate(x) ? matched<U>(fn(x)) : match<T>(x),
  /**
   * Provides the default case for the pattern match.
   * @template U The return type of the function.
   * @param fn A function that takes the value and returns the default result.
   * @returns The result of calling fn with the value.
   */
  otherwise: <U>(fn: (x: T) => U) => fn(x),
});
