/**
 * Reads and writes `localStorage` without ever throwing.
 *
 * Every one of these calls can fail in a browser that is otherwise working normally:
 *
 * - `window.localStorage` **itself** throws a `SecurityError` when storage is disabled or
 *   partitioned away from a third-party frame. The property access is the failure, not the
 *   method call, so it has to be inside the `try`.
 * - `setItem` throws `QuotaExceededError` when the origin is full, and in Safari's private
 *   browsing it has historically thrown for the first byte written.
 * - the stored bytes are consumer-writable. `JSON.parse` can throw, and a payload that parses
 *   cleanly can still be the wrong shape — which is why reading JSON takes a validator instead
 *   of casting.
 *
 * A failure is silent by design and reported as `false`/`undefined` rather than raised: the
 * callers here keep the same value in React state, so losing persistence costs a preference,
 * not a working UI. Raising instead is what took a DataTable's whole tree down when the origin
 * was full — a table stopped rendering because it could not save a column width.
 *
 * There is no logging anywhere in `src/`, so a caller that needs to tell the user gets the
 * boolean and decides.
 *
 * @see docs/architecture/component-layers.md
 */

/** The storage object, or `null` when this document is not allowed to have one. */
function localStorageOrNull(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The stored string, or `null` when absent or unreadable. */
function readStoredText(key: string): string | null {
  const storage = localStorageOrNull();
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** Store a string. `false` means the browser refused and nothing was written. */
function writeStoredText(key: string, value: string): boolean {
  const storage = localStorageOrNull();
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a JSON payload and hand it to `validate`.
 *
 * `validate` receives `unknown` — whatever `JSON.parse` produced — and returns the value it
 * recognises or `undefined`. Anything it rejects is treated exactly like an absent key, so a
 * corrupted or hand-edited entry degrades to "no saved preference" instead of reaching the
 * component as a plausible-looking lie.
 */
function readStoredJson<T>(
  key: string,
  validate: (value: unknown) => T | undefined,
): T | undefined {
  const raw = readStoredText(key);
  if (raw === null) return undefined;

  try {
    return validate(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

/** Store a JSON payload. `false` means it was not written — unserialisable, or refused. */
function writeStoredJson(key: string, value: unknown): boolean {
  let serialised: string;
  try {
    serialised = JSON.stringify(value);
  } catch {
    return false;
  }

  return writeStoredText(key, serialised);
}

export { readStoredJson, readStoredText, writeStoredJson, writeStoredText };
