/**
 * Hydration: the client's first render has to reproduce the server's bytes.
 *
 * Every case here renders on the "server", changes the environment the way a real browser
 * differs from a real server, and then hydrates. Two things are collected, because React reports
 * the two kinds of mismatch differently:
 *
 * - **Recoverable errors** — text and structure. React re-renders the subtree client-side.
 * - **Console complaints** — attributes. React says "this won't be patched up" and *keeps the
 *   server's value*, so the element renders one thing while the component believes another, for
 *   as long as the value does not change again. `SSR-002`'s random Sidebar width was exactly
 *   this, and it is invisible to `onRecoverableError`.
 */
import { act, type ReactElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "@/components/data-display/data-table";
import { Tour } from "@/components/feedback/tour";
import { SidebarMenuSkeleton } from "@/components/navigation/sidebar";
import { CountryPicker } from "@/components/pickers/country-picker";
import { TimezonePicker } from "@/components/pickers/timezone-picker";
import { TimeSince } from "@/components/utility/time-since";
import { ThemeProvider, useTheme } from "@/providers/theme-provider";

interface HydrateOptions {
  /** Applied between the server render and hydration, as the browser's difference from it. */
  changeEnvironment?: () => void;
}

/** Hydrate the same element the server rendered, and hand back the live container. */
async function hydrate(element: ReactElement, { changeEnvironment }: HydrateOptions = {}) {
  const container = document.createElement("div");
  const recoverableErrors: unknown[] = [];
  const serverHtml = renderToString(element);
  container.innerHTML = serverHtml;
  document.body.appendChild(container);
  changeEnvironment?.();

  // Collected as they arrive: `mockRestore` also resets the recorded calls, so reading them
  // afterwards would report an empty list and every complaint assertion would pass vacuously.
  const complaints: string[] = [];
  const consoleError = vi
    .spyOn(console, "error")
    .mockImplementation((...args: unknown[]) => complaints.push(String(args[0])));
  let root: Root | undefined;
  try {
    await act(async () => {
      root = hydrateRoot(container, element, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });
  } finally {
    consoleError.mockRestore();
  }

  return {
    serverHtml,
    container,
    recoverableErrors,
    complaints,
    cleanup: async () => {
      await act(async () => root?.unmount());
      container.remove();
    },
  };
}

/** Every value a consumer of `useTheme` rendered, server render first. */
function themeRecorder() {
  const renders: string[] = [];

  function Readout() {
    const { theme, resolvedTheme } = useTheme();
    const value = `${theme}/${resolvedTheme}`;
    renders.push(value);

    return <output data-slot="theme-readout">{value}</output>;
  }

  return { renders, Readout };
}

describe("SSR hydration", () => {
  // SSR-001. An open Tour used to throw on the server; it now renders nothing there, and the
  // overlay is mounted by an effect after hydration. Both halves matter: the empty server output
  // is what makes the first client render match, and the effect is what makes the tour appear.
  it("hydrates an open Tour from empty server output and mounts it afterwards", async () => {
    const tour = (
      <Tour
        steps={[{ target: "#nowhere", title: "Search", content: "Find anything fast." }]}
        defaultOpen
      />
    );
    const { serverHtml, recoverableErrors, cleanup } = await hydrate(tour);

    expect(serverHtml).toBe("");
    expect(recoverableErrors).toHaveLength(0);
    // Portalled into document.body, not the hydration container.
    expect(document.body.querySelector('[data-slot="tour-step"]')).toBeInTheDocument();
    expect(document.body.querySelector('[data-slot="tour-backdrop"]')).toBeInTheDocument();

    await cleanup();
    expect(document.body.querySelector('[data-slot="tour-step"]')).not.toBeInTheDocument();
  });

  it("hydrates CountryPicker when server and browser default locales differ", async () => {
    const originalDisplayNames = Object.getOwnPropertyDescriptor(Intl, "DisplayNames");
    let environment = "server";

    class EnvironmentDisplayNames {
      private readonly locale: string;

      constructor(locales?: string | string[]) {
        this.locale = Array.isArray(locales)
          ? (locales[0] ?? environment)
          : (locales ?? environment);
      }

      of(code: string) {
        return `${this.locale}-${code}`;
      }
    }

    Object.defineProperty(Intl, "DisplayNames", {
      configurable: true,
      value: EnvironmentDisplayNames,
    });

    try {
      const { recoverableErrors, complaints, cleanup } = await hydrate(
        <CountryPicker value="" onChange={() => {}} />,
        {
          changeEnvironment: () => {
            environment = "browser";
          },
        },
      );
      expect(recoverableErrors).toHaveLength(0);
      expect(complaints).toEqual([]);
      await cleanup();
    } finally {
      if (originalDisplayNames) {
        Object.defineProperty(Intl, "DisplayNames", originalDisplayNames);
      }
    }
  });

  it("hydrates TimezonePicker when supported timezone lists differ", async () => {
    const originalSupportedValuesOf = Object.getOwnPropertyDescriptor(Intl, "supportedValuesOf");
    let environment = "server";

    Object.defineProperty(Intl, "supportedValuesOf", {
      configurable: true,
      value: () => (environment === "server" ? ["UTC", "Europe/London"] : ["UTC", "Asia/Tokyo"]),
    });

    try {
      const { recoverableErrors, complaints, cleanup } = await hydrate(
        <TimezonePicker value="" onChange={() => {}} />,
        {
          changeEnvironment: () => {
            environment = "browser";
          },
        },
      );
      expect(recoverableErrors).toHaveLength(0);
      expect(complaints).toEqual([]);
      await cleanup();
    } finally {
      if (originalSupportedValuesOf) {
        Object.defineProperty(Intl, "supportedValuesOf", originalSupportedValuesOf);
      } else {
        Reflect.deleteProperty(Intl, "supportedValuesOf");
      }
    }
  });

  it("hydrates TimeSince when server and browser clocks cross a label boundary", async () => {
    const originalNow = Date.now;
    const value = Date.UTC(2026, 0, 1, 12, 0, 0);
    let now = value + 5 * 60_000;
    Date.now = () => now;

    try {
      const { recoverableErrors, complaints, cleanup } = await hydrate(
        <TimeSince value={value} refreshIntervalMs={0} />,
        {
          changeEnvironment: () => {
            now = value + 10 * 60_000;
          },
        },
      );
      expect(recoverableErrors).toHaveLength(0);
      expect(complaints).toEqual([]);
      await cleanup();
    } finally {
      Date.now = originalNow;
    }
  });

  // SSR-002. An explicit locale and zone are the only way the two renders can agree about
  // absolute text, so when they are given nothing about the rendered date may change at mount —
  // including the `title`, which used to be formatted in whatever zone the process ran in.
  it("keeps TimeSince text identical across the mount when locale and zone are explicit", async () => {
    const element = (
      <TimeSince
        value="2020-06-15T20:30:00.000Z"
        locale="en-GB"
        timeZone="Asia/Kolkata"
        refreshIntervalMs={0}
      />
    );
    const { serverHtml, container, recoverableErrors, complaints, cleanup } =
      await hydrate(element);
    const time = container.querySelector("time");

    // 20:30 UTC is 02:00 the next day in Asia/Kolkata: the zone is honoured, not the host's.
    expect(serverHtml).toContain("16 Jun 2020");
    expect(time?.getAttribute("title")).toContain("02:00");
    expect(time?.textContent).toBe("16 Jun 2020");
    expect(recoverableErrors).toHaveLength(0);
    expect(complaints).toEqual([]);

    await cleanup();
  });

  // SSR-002. The width used to be `Math.random()`, so the server and the client never agreed.
  // React keeps the server's `style` here and only complains on the console, which is why this
  // asserts on the complaints and on the bytes rather than on recoverable errors.
  it("hydrates a list of Sidebar skeletons with the widths the server sent", async () => {
    const skeletons = (
      <ul>
        {["one", "two", "three", "four", "five", "six"].map((key) => (
          <SidebarMenuSkeleton key={key} showIcon />
        ))}
      </ul>
    );
    const { serverHtml, container, recoverableErrors, complaints, cleanup } =
      await hydrate(skeletons);

    const widths = (html: string) =>
      [...html.matchAll(/--skeleton-width:(\d+)%/g)].map((m) => m[1]);
    expect(widths(container.innerHTML)).toEqual(widths(serverHtml));
    expect(new Set(widths(serverHtml)).size).toBeGreaterThan(3);
    expect(recoverableErrors).toHaveLength(0);
    expect(complaints).toEqual([]);

    await cleanup();
  });

  // SSR-002. The stored preference is the browser's, and the server has never seen it. Reading
  // it during initialization made the hydration render report `dark` against server markup that
  // said `system` — a text mismatch for every consumer that renders the theme.
  it("hydrates ThemeProvider against a stored theme the server could not see", async () => {
    localStorage.clear();
    const { renders, Readout } = themeRecorder();
    const { serverHtml, container, recoverableErrors, complaints, cleanup } = await hydrate(
      <ThemeProvider defaultTheme="system" disableTransitionOnChange={false}>
        <Readout />
      </ThemeProvider>,
      { changeEnvironment: () => localStorage.setItem("theme", "dark") },
    );

    expect(serverHtml).toContain("system/light");
    // The hydration render — renders[1] — reproduces the server's value rather than the stored
    // one. The stored theme arrives in the commit after it.
    expect(renders[0]).toBe("system/light");
    expect(renders[1]).toBe("system/light");
    expect(renders.at(-1)).toBe("dark/dark");
    expect(container.querySelector('[data-slot="theme-readout"]')).toHaveTextContent("dark/dark");
    expect(recoverableErrors).toHaveLength(0);
    expect(complaints).toEqual([]);

    await cleanup();
    localStorage.clear();
  });

  // SSR-002. Same shape, different environment difference: only the browser has `matchMedia`,
  // so a `system` provider that asked during initialization resolved `dark` against a server
  // that had no way to resolve anything but `light`.
  it("hydrates ThemeProvider when only the browser can be asked for a colour scheme", async () => {
    localStorage.clear();
    const originalMatchMedia = window.matchMedia;
    Reflect.deleteProperty(window, "matchMedia");
    const { renders, Readout } = themeRecorder();

    try {
      const { recoverableErrors, complaints, cleanup } = await hydrate(
        <ThemeProvider defaultTheme="system" disableTransitionOnChange={false}>
          <Readout />
        </ThemeProvider>,
        {
          changeEnvironment: () => {
            window.matchMedia = ((query: string) => ({
              matches: query.includes("dark"),
              media: query,
              addEventListener: () => {},
              removeEventListener: () => {},
            })) as unknown as typeof window.matchMedia;
          },
        },
      );

      expect(renders[0]).toBe("system/light");
      expect(renders[1]).toBe("system/light");
      expect(renders.at(-1)).toBe("system/dark");
      expect(recoverableErrors).toHaveLength(0);
      expect(complaints).toEqual([]);
      await cleanup();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  // SSR-002. DataTable's persisted view is storage the server cannot see either. It is loaded
  // in an effect, so the server's row order is what hydration reproduces — and the saved sort is
  // applied straight afterwards.
  it("hydrates a persisted DataTable in the server's order, then applies the saved sort", async () => {
    localStorage.clear();
    localStorage.setItem(
      "qx-datatable:people",
      JSON.stringify({ sorting: [{ id: "name", desc: true }] }),
    );
    const columns = [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "role", header: "Role" },
    ];
    const data = [
      { name: "Ada", role: "Member" },
      { name: "Grace", role: "Admin" },
    ];
    const table = (
      <DataTable columns={columns} data={data} persistKey="people" enableColumnVisibility={false} />
    );

    const { serverHtml, container, recoverableErrors, cleanup } = await hydrate(table);
    const firstCell = (html: string) => /<td[^>]*>([^<]*)/.exec(html)?.[1];

    expect(firstCell(serverHtml)).toBe("Ada");
    expect(recoverableErrors).toHaveLength(0);
    // Descending by name, from storage, after the mount.
    expect(container.querySelectorAll("tbody td")[0]).toHaveTextContent("Grace");

    await cleanup();
    localStorage.clear();
  });
});
