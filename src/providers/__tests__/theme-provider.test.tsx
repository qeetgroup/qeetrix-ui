import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "@/providers/theme-provider";

function CurrentTheme() {
  const { theme } = useTheme();

  return <output aria-label="Current theme">{theme}</output>;
}

function ResolvedTheme() {
  const { resolvedTheme } = useTheme();

  return <output aria-label="Resolved theme">{resolvedTheme}</output>;
}

function ThemeSetter({ theme }: { theme: "dark" | "light" | "system" }) {
  const { setTheme } = useTheme();

  return (
    <button type="button" onClick={() => setTheme(theme)}>
      {`Use ${theme}`}
    </button>
  );
}

/** Every class written onto `<html>`, in order, while `run` executes. */
function recordThemeClassWrites(run: () => void): string[] {
  const written: string[] = [];
  const { classList } = document.documentElement;
  const add = classList.add.bind(classList);
  const spy = vi.spyOn(classList, "add").mockImplementation((...tokens: string[]) => {
    written.push(...tokens);
    add(...tokens);
  });

  try {
    run();
  } finally {
    spy.mockRestore();
  }

  return written;
}

/** Replace a `localStorage` method with one that throws, the way a full or blocked origin does. */
function breakStorage(method: "getItem" | "setItem") {
  const prototype = Object.getPrototypeOf(window.localStorage);
  const original = prototype[method];
  prototype[method] = () => {
    throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
  };

  return () => {
    prototype[method] = original;
  };
}

/**
 * jsdom has no `matchMedia`, so the provider's `system` branch would throw without one. This
 * stub is also the mechanism for the "follows the OS as it changes" test: it keeps the listeners
 * so a test can flip `matches` and fire them.
 */
function stubColorScheme(prefersDark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: prefersDark,
    addEventListener: (_: string, handler: () => void) => listeners.add(handler),
    removeEventListener: (_: string, handler: () => void) => listeners.delete(handler),
  };
  window.matchMedia = (() => query) as unknown as typeof window.matchMedia;

  return {
    set(nextPrefersDark: boolean) {
      query.matches = nextPrefersDark;
      for (const handler of listeners) handler();
    },
  };
}

describe("ThemeProvider", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
    window.matchMedia = originalMatchMedia;
  });

  it("does not install a character-key shortcut by default", () => {
    render(
      <ThemeProvider defaultTheme="light" disableTransitionOnChange={false}>
        <CurrentTheme />
      </ThemeProvider>,
    );

    fireEvent.keyDown(window, { key: "d" });

    expect(screen.getByLabelText("Current theme")).toHaveTextContent("light");
    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("toggles with Control or Meta plus Shift+D when explicitly enabled", () => {
    render(
      <ThemeProvider defaultTheme="light" disableTransitionOnChange={false} enableKeyboardShortcut>
        <CurrentTheme />
      </ThemeProvider>,
    );

    fireEvent.keyDown(window, { key: "d" });
    expect(screen.getByLabelText("Current theme")).toHaveTextContent("light");

    fireEvent.keyDown(window, { key: "D", ctrlKey: true, shiftKey: true });
    expect(screen.getByLabelText("Current theme")).toHaveTextContent("dark");

    fireEvent.keyDown(window, { key: "D", metaKey: true, shiftKey: true });
    expect(screen.getByLabelText("Current theme")).toHaveTextContent("light");
  });

  // docs/standards/theming.md promised `{ theme, resolvedTheme, setTheme }` while the provider
  // only ever returned two of the three. These assert the promise, and — the part that actually
  // matters — that resolvedTheme and the class on <html> can never disagree, because a consumer
  // picking an asset from resolvedTheme has to match what the CSS is doing.
  it("reports an explicit theme as itself, and agrees with the html class", () => {
    render(
      <ThemeProvider defaultTheme="dark" disableTransitionOnChange={false}>
        <ResolvedTheme />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("Resolved theme")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("collapses system to what the OS asked for", () => {
    stubColorScheme(true);

    render(
      <ThemeProvider defaultTheme="system" disableTransitionOnChange={false}>
        <CurrentTheme />
        <ResolvedTheme />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("Current theme")).toHaveTextContent("system");
    expect(screen.getByLabelText("Resolved theme")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("follows the OS preference as it changes, without changing theme", () => {
    const colorScheme = stubColorScheme(false);

    render(
      <ThemeProvider defaultTheme="system" disableTransitionOnChange={false}>
        <CurrentTheme />
        <ResolvedTheme />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText("Resolved theme")).toHaveTextContent("light");

    act(() => {
      colorScheme.set(true);
    });

    expect(screen.getByLabelText("Current theme")).toHaveTextContent("system");
    expect(screen.getByLabelText("Resolved theme")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("never reports system as resolved", () => {
    stubColorScheme(false);

    render(
      <ThemeProvider defaultTheme="system" disableTransitionOnChange={false}>
        <ResolvedTheme />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("Resolved theme")).not.toHaveTextContent("system");
  });

  // Server render: no window at all, so `system` cannot be observed. `light` is not a guess —
  // it is what :root renders with no .dark class, which is exactly what the server emitted.
  it("resolves to light with no matchMedia, matching what :root renders", () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;

    render(
      <ThemeProvider defaultTheme="light" disableTransitionOnChange={false}>
        <ResolvedTheme />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("Resolved theme")).toHaveTextContent("light");
  });
});

/* SSR-002. Storage is the browser's, and it can refuse to answer. */
describe("ThemeProvider and the browser's storage", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
    window.matchMedia = originalMatchMedia;
  });

  it("writes the class once, with what storage said, not with a guess first", () => {
    // The class is what a blocking script in <head> sets before the first paint to avoid the
    // flash of the wrong theme. The provider must not undo that and correct itself: a single
    // write, of the stored theme, is the whole contract. Two writes would show as a flash.
    localStorage.setItem("theme", "dark");
    document.documentElement.className = "dark";

    const written = recordThemeClassWrites(() => {
      render(
        <ThemeProvider defaultTheme="system" disableTransitionOnChange={false}>
          <CurrentTheme />
        </ThemeProvider>,
      );
    });

    expect(written).toEqual(["dark"]);
    expect(screen.getByLabelText("Current theme")).toHaveTextContent("dark");
  });

  it("still changes theme when the browser refuses to store it", () => {
    const restore = breakStorage("setItem");

    try {
      render(
        <ThemeProvider defaultTheme="light" disableTransitionOnChange={false}>
          <CurrentTheme />
          <ThemeSetter theme="dark" />
        </ThemeProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Use dark" }));

      // The theme applies; only the persistence is lost, which is the part that can fail.
      expect(screen.getByLabelText("Current theme")).toHaveTextContent("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    } finally {
      restore();
    }

    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("renders with the default theme when storage cannot be read at all", () => {
    const restore = breakStorage("getItem");

    try {
      render(
        <ThemeProvider defaultTheme="dark" disableTransitionOnChange={false}>
          <CurrentTheme />
          <ResolvedTheme />
        </ThemeProvider>,
      );

      expect(screen.getByLabelText("Current theme")).toHaveTextContent("dark");
      expect(screen.getByLabelText("Resolved theme")).toHaveTextContent("dark");
    } finally {
      restore();
    }
  });

  it("ignores a stored value that is not a theme this build knows", () => {
    localStorage.setItem("theme", "solarized");

    render(
      <ThemeProvider defaultTheme="light" disableTransitionOnChange={false}>
        <CurrentTheme />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("Current theme")).toHaveTextContent("light");
  });

  it("re-reads when the storage key changes", () => {
    localStorage.setItem("editor-theme", "dark");
    localStorage.setItem("viewer-theme", "light");

    const { rerender } = render(
      <ThemeProvider
        defaultTheme="light"
        disableTransitionOnChange={false}
        storageKey="editor-theme"
      >
        <CurrentTheme />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText("Current theme")).toHaveTextContent("dark");

    rerender(
      <ThemeProvider
        defaultTheme="dark"
        disableTransitionOnChange={false}
        storageKey="viewer-theme"
      >
        <CurrentTheme />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("Current theme")).toHaveTextContent("light");
  });

  it("follows another tab's change, and a clear, through the storage event", () => {
    localStorage.setItem("theme", "dark");
    render(
      <ThemeProvider defaultTheme="light" disableTransitionOnChange={false}>
        <CurrentTheme />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText("Current theme")).toHaveTextContent("dark");

    act(() => {
      localStorage.setItem("theme", "light");
      window.dispatchEvent(new StorageEvent("storage", { key: "theme", newValue: "light" }));
    });
    expect(screen.getByLabelText("Current theme")).toHaveTextContent("light");

    // A `clear()` reports a null key, and the value has to come back from the default.
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(screen.getByLabelText("Current theme")).toHaveTextContent("light");
  });
});
