/**
 * A Maybe type that represents an optional value.
 * It can either contain a value of type T or represent the absence of a value.
 * @template T - The type of the value.
 */
export class Maybe<T> {
  #value: T | null | undefined;

  /**
   * Create a Maybe instance.
   * @param value - The value to wrap.
   * @example
   * ```ts
   * const maybeValue = new Maybe(42);
   * const noValue = new Maybe<number>(null);
   * const anotherNoValue = new Maybe<string>(undefined);
   * ```
   */
  constructor(value: T | null | undefined) {
    this.#value = value;
  }

  /**
   * Create a Maybe instance that represents a value.
   * @param value - The value to wrap.
   * @returns A Maybe instance containing the value.
   */
  public static of<T>(value: T): Maybe<T> {
    return new Maybe(value);
  }

  /**
   * Apply a function to the value inside the Maybe, if it exists.
   * @param fn - The function to apply.
   * @returns A new Maybe containing the result of the function, or nothing.
   */
  public map(fn: (value: T) => T): Maybe<T> {
    if (this.isNothing()) {
      return new Maybe<T>(null);
    }
    return new Maybe<T>(fn(this.#value as T));
  }

  /**
   * Check if the Maybe is empty (i.e., contains no value).
   * @returns True if the Maybe is empty, false otherwise.
   */
  public isNothing(): this is Maybe<T> & { value: null | undefined } {
    return this.#value === null || this.#value === undefined;
  }

  /**
   * Get the value inside the Maybe, or a default value if it doesn't exist.
   * @param defaultValue - The value to return if the Maybe is empty.
   * @returns The value inside the Maybe, or the default value.
   */
  public getOrElse(defaultValue: T): T {
    return this.isNothing() ? defaultValue : (this.#value as T);
  }
}
