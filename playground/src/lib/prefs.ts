import { useCallback, useState } from "react";

/**
 * Shell preferences that live on this machine rather than in the URL: density and direction
 * (the theme is persisted by the library's own ThemeProvider under `THEME_STORAGE_KEY`). The
 * pre-paint script in index.html reads the same keys, so the first frame is already right.
 */

export const THEME_STORAGE_KEY = "qeetrix-ui-playground:theme";
const DENSITY_KEY = "qeetrix-ui-playground:density";
const DIRECTION_KEY = "qeetrix-ui-playground:dir";

export type Density = "comfortable" | "compact";
export type Direction = "ltr" | "rtl";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Persistence is best-effort; the choice still applies to this document.
  }
}

function usePersisted<T extends string>(key: string, options: readonly T[], fallback: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = read(key);
    return options.includes(stored as T) ? (stored as T) : fallback;
  });
  const update = useCallback(
    (next: T) => {
      setValue(next);
      write(key, next);
    },
    [key],
  );
  return [value, update] as const;
}

export function useDensityPreference() {
  return usePersisted<Density>(DENSITY_KEY, ["comfortable", "compact"], "comfortable");
}

export function useDirectionPreference() {
  return usePersisted<Direction>(DIRECTION_KEY, ["ltr", "rtl"], "ltr");
}

/** ⌘ on Apple platforms, Ctrl elsewhere — for shortcut hints. */
export const modKey =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
