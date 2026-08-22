"use client";

import * as React from "react";

/**
 * One implementation of the controlled/uncontrolled contract.
 *
 * Twelve components had hand-rolled this — `isControlled = value !== undefined`, internal state
 * seeded from `defaultValue`, a commit that writes internal state only when uncontrolled and
 * always calls the callback. The logic was identical every time, which means twelve chances for
 * it to drift.
 *
 * The contract, which is the one the library already documents:
 *
 *   - `value !== undefined` → **controlled**. The prop is authoritative; the hook never writes
 *     internal state, so a parent that ignores the callback sees no change. `null`, `""`, `0` and
 *     `false` are values: only `undefined` means "not controlled".
 *   - `value === undefined` → **uncontrolled**. `defaultValue` seeds internal state once and the
 *     hook owns it afterwards. The callback still fires, so a consumer can observe without owning.
 *
 * Both modes call `onChange` with the *intended* next value, so a controlled parent and an
 * uncontrolled observer receive the same thing.
 *
 * @example
 * const [value, setValue] = useControllableState({ value, defaultValue, onChange: onValueChange });
 * // functional updates work in both modes
 * setValue((previous) => previous + 1);
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  /** The controlled value. `undefined` means uncontrolled. */
  value?: T;
  /** Seeds internal state in uncontrolled mode. A function is called once, lazily. */
  defaultValue?: T | (() => T);
  /** Called with the intended next value, in both modes. */
  onChange?: (next: T) => void;
}): [T, (next: T | ((previous: T) => T)) => void] {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<T>(defaultValue as T);

  // Read the callback through a ref so the returned setter is stable across renders: a consumer
  // can put it in a dependency array without re-subscribing on every parent render.
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  });

  // The authoritative value, and a ref to it so a functional update can read it without the
  // setter depending on the current render's closure.
  const current = (isControlled ? value : internal) as T;
  const currentRef = React.useRef(current);
  currentRef.current = current;
  const isControlledRef = React.useRef(isControlled);
  isControlledRef.current = isControlled;

  const setValue = React.useCallback((next: T | ((previous: T) => T)) => {
    const resolved =
      typeof next === "function" ? (next as (previous: T) => T)(currentRef.current) : next;
    // Nothing to report, and nothing to re-render for.
    if (Object.is(resolved, currentRef.current)) return;
    if (!isControlledRef.current) setInternal(resolved);
    onChangeRef.current?.(resolved);
  }, []);

  return [current, setValue];
}
