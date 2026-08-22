"use client";
import * as React from "react";
import { readStoredText, writeStoredText } from "@/runtime/storage";

type Theme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  disableTransitionOnChange?: boolean;
  enableKeyboardShortcut?: boolean;
};

type ThemeProviderState = {
  /** What the consumer asked for, including `system`. */
  theme: Theme;
  /**
   * What is actually on screen: `light` or `dark`, never `system`.
   *
   * For the cases that genuinely cannot be expressed as a token — picking an image asset, or
   * handing a third-party widget its own theme prop. Reach for a token first; if a component
   * needs this to look right, a token is missing.
   *
   * Before the first client effect runs this is derived, not observed: a `system` provider
   * reports `light` — what `:root` renders when no theme class is present — on the server and in
   * the hydration pass alike, whether or not a `matchMedia` exists. Markup may therefore branch
   * on it without a mismatch, but it must expect the value to change once, in the commit after
   * hydration, when the OS preference and the stored preference both arrive. Both `theme` and
   * `resolvedTheme` behave this way.
   */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";
const THEME_VALUES: Theme[] = ["dark", "light", "system"];

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(undefined);

function isTheme(value: string | null): value is Theme {
  if (value === null) {
    return false;
  }

  return THEME_VALUES.includes(value as Theme);
}

function getSystemTheme(): ResolvedTheme {
  if (window.matchMedia(COLOR_SCHEME_QUERY).matches) {
    return "dark";
  }

  return "light";
}

/**
 * What `system` resolves to before anything has been able to ask the OS: the theme `:root`
 * describes when no theme class is set.
 */
const SYSTEM_THEME_BEFORE_MOUNT: ResolvedTheme = "light";

/**
 * `theme` collapsed to what renders, for the first render only.
 *
 * `system` deliberately does **not** consult `matchMedia` here, even where one exists. The
 * server has none, so a client that asked would resolve `dark` against server markup that says
 * `light` and every consumer branching on `resolvedTheme` would mismatch. The OS preference is
 * picked up in the effect below instead, one commit later.
 */
function resolveThemeBeforeMount(theme: Theme): ResolvedTheme {
  return theme === "system" ? SYSTEM_THEME_BEFORE_MOUNT : theme;
}

/** The stored preference, or `null` when absent, unreadable, or not a theme this build knows. */
function readStoredTheme(storageKey: string): Theme | null {
  const stored = readStoredText(storageKey);

  return isTheme(stored) ? stored : null;
}

function disableTransitionsTemporarily() {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}",
    ),
  );
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove();
      });
    });
  };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const editableParent = target.closest("input, textarea, select, [contenteditable='true']");
  if (editableParent) {
    return true;
  }

  return false;
}

/**
 * Applies a theme to `<html>` and publishes it to the tree.
 *
 * **The first render never reads storage.** `theme` is `defaultTheme` on the server and in the
 * client's hydration pass, and the stored preference arrives one commit later. The server cannot
 * see `localStorage`, so any other arrangement makes the two renders disagree: a stored `dark`
 * against a server-rendered `system` is a hydration mismatch for every consumer that branches
 * markup on `theme` or `resolvedTheme` — a toggle's `aria-pressed`, an icon, an image asset.
 *
 * The cost is the flash of the wrong theme: nothing can paint the stored theme before the first
 * paint from inside React, because React only runs after the document exists. That is a property
 * of client-side hydration, not of this provider — the effect that writes the class has always
 * run after the first paint. The cure is a blocking script in `<head>`, which runs before the
 * document paints at all:
 *
 * ```html
 * <script>
 *   try {
 *     var stored = localStorage.getItem("theme");
 *     var dark = stored === "dark" || ((!stored || stored === "system") &&
 *       matchMedia("(prefers-color-scheme: dark)").matches);
 *     document.documentElement.classList.add(dark ? "dark" : "light");
 *   } catch (_) {}
 * </script>
 * ```
 *
 * The provider is built to cooperate with that script rather than fight it: it writes no class
 * at all until it has consulted storage, so the script's answer survives hydration instead of
 * being replaced by a guess and then corrected.
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  disableTransitionOnChange = true,
  enableKeyboardShortcut = false,
  ...props
}: ThemeProviderProps) {
  // `null` means storage has not been consulted yet — the state of every server render and of
  // the hydration pass that has to match it.
  const [storedTheme, setStoredTheme] = React.useState<Theme | null>(null);
  const theme = storedTheme ?? defaultTheme;

  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(() =>
    resolveThemeBeforeMount(defaultTheme),
  );

  // Consult storage after the first commit. Declared before the effect that writes the class so
  // that, when both run in the same flush, the class is written once with the real answer.
  React.useEffect(() => {
    setStoredTheme(readStoredTheme(storageKey) ?? defaultTheme);
  }, [defaultTheme, storageKey]);

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      // State first: a browser that refuses the write still gets the theme it was asked for,
      // for this document. Persistence is the part that is allowed to fail.
      setStoredTheme(nextTheme);
      writeStoredText(storageKey, nextTheme);
    },
    [storageKey],
  );

  // The DOM class and the reported resolvedTheme are set from the same computation, so the two
  // cannot disagree: whatever class went onto <html> is what a consumer reads back.
  const applyTheme = React.useCallback(
    (nextTheme: Theme) => {
      const root = document.documentElement;
      const nextResolved = nextTheme === "system" ? getSystemTheme() : nextTheme;
      const restoreTransitions = disableTransitionOnChange ? disableTransitionsTemporarily() : null;

      root.classList.remove("light", "dark");
      root.classList.add(nextResolved);
      setResolvedTheme(nextResolved);

      if (restoreTransitions) {
        restoreTransitions();
      }
    },
    [disableTransitionOnChange],
  );

  React.useEffect(() => {
    // Nothing is known yet, and a guess would overwrite the class a pre-paint script set.
    if (storedTheme === null) {
      return undefined;
    }

    applyTheme(theme);

    if (theme !== "system") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY);
    const handleChange = () => {
      applyTheme("system");
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [storedTheme, theme, applyTheme]);

  React.useEffect(() => {
    if (!enableKeyboardShortcut) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      if ((!event.metaKey && !event.ctrlKey) || !event.shiftKey || event.altKey) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key.toLowerCase() !== "d") {
        return;
      }

      event.preventDefault();
      setStoredTheme((currentStored) => {
        const currentTheme = currentStored ?? defaultTheme;
        const nextTheme =
          currentTheme === "dark"
            ? "light"
            : currentTheme === "light"
              ? "dark"
              : getSystemTheme() === "dark"
                ? "light"
                : "dark";

        writeStoredText(storageKey, nextTheme);
        return nextTheme;
      });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [defaultTheme, enableKeyboardShortcut, storageKey]);

  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // A `null` key is `clear()`; any other key is a different preference. `newValue` is
      // deliberately not trusted — re-reading reports what this origin's localStorage holds, so
      // a sessionStorage entry under the same key cannot pose as a theme change.
      if (event.key !== null && event.key !== storageKey) {
        return;
      }

      setStoredTheme(readStoredTheme(storageKey) ?? defaultTheme);
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [defaultTheme, storageKey]);

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
