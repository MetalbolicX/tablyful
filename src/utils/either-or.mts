/**
 * Represents an Either monad, which can hold either a Left (error) or Right (success) value.
 * @template L The type of the Left value.
 * @template R The type of the Right value.
 */
class Either<L, R> {
  #value: L | R;

  /**
   * Creates an instance of Either.
   * @param value - The value to store.
   */
  constructor(value: L | R) {
    this.#value = value;
  }

  /**
   * Creates a Right instance with the given value.
   * @param value - The success value.
   * @returns A Right instance.
   */
  public static of<R>(value: R): Either<never, R> {
    return new Right<never, R>(value);
  }

  /**
   * Creates a Left instance with the given value.
   * @param value - The error value.
   * @returns A Left instance.
   */
  public static left<L>(value: L): Either<L, never> {
    return new Left<L, never>(value);
  }

  /**
   * Chains the Either, applying the function if it's a Right.
   * @param fn - The function to apply to the Right value.
   * @returns The result of the function or the current Either if Left.
   */
  public chain<T>(fn: (value: R) => Either<L, T>): Either<L, T> {
    return this.isLeft() ? (this as unknown as Either<L, T>) : fn(this.#value as R);
  }

  /**
   * Checks if this is a Left instance.
   * @returns True if Left, false otherwise.
   */
  isLeft(): this is Left<L, R> {
    return this instanceof Left;
  }

  /**
   * Checks if this is a Right instance.
   * @returns True if Right, false otherwise.
   */
  isRight(): this is Right<L, R> {
    return this instanceof Right;
  }

  /**
   * Gets the value if Right, otherwise returns the default.
   * @param defaultValue - The default value to return if Left.
   * @returns The Right value or the default.
   */
  getOrElse(defaultValue: R): R {
    return this.isLeft() ? defaultValue : (this.#value as R);
  }

  /**
   * Gets the protected value.
   * @returns The stored value.
   */
  protected get value(): L | R {
    return this.#value;
  }
}

/**
 * Represents a Left (error) value in the Either monad.
 * @template L The type of the Left value.
 * @template R The type of the Right value.
 */
export class Left<L, R> extends Either<L, R> {
  /**
   * Maps over the Either, but does nothing for Left.
   * @param _ - The mapping function (ignored).
   * @returns This Left instance.
   */
  public map(_: (value: R) => any): Either<L, any> {
    return this;
  }
}

/**
 * Represents a Right (success) value in the Either monad.
 * @template L The type of the Left value.
 * @template R The type of the Right value.
 */
export class Right<L, R> extends Either<L, R> {
  /**
   * Maps over the Right value.
   * @param fn - The mapping function.
   * @returns A new Right with the mapped value.
   */
  public map<T>(fn: (value: R) => T): Either<L, T> {
    return Either.of(fn(this.value as R));
  }
}
