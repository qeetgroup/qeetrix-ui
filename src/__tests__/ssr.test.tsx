// @vitest-environment node
/**
 * Server rendering, with no DOM at all.
 *
 * The rest of the suite runs in jsdom, where `document` exists — which is exactly why a
 * component that touches `document` during render can look fine in tests and still crash a
 * server-rendered application. This file opts into `@vitest-environment node` so that absence
 * is the thing under test.
 *
 * `SSR-001`: Tour called `createPortal(..., document.body)` during render, so the valid initial
 * state `defaultOpen` threw `ReferenceError: document is not defined` on the server.
 *
 * `SSR-002`: server output has to be a function of the props alone. Three things here were
 * functions of the environment instead — a random number, the ambient time zone, and
 * `localStorage` — and each of them produced markup the browser could not reproduce.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Tour, type TourStepDef } from "@/components/feedback/tour";
import { SidebarMenuSkeleton } from "@/components/navigation/sidebar";
import { Portal } from "@/primitives/portal";
import { ThemeProvider, useTheme } from "@/providers/theme-provider";

const steps: TourStepDef[] = [
  { target: "#nav-search", title: "Search", content: "Find anything fast." },
  { target: "#sidebar", title: "Sidebar", content: "Navigate sections." },
];

/** Render on the server and report anything React complained about while doing it. */
function serverRender(element: React.ReactElement) {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    return { html: renderToString(element), complaints: consoleError.mock.calls };
  } finally {
    consoleError.mockRestore();
  }
}

/**
 * Source with its comments removed.
 *
 * The guards below match code, and this package documents its own hazards: `theme-provider.tsx`
 * carries the `localStorage` snippet a consumer should put in a blocking script. Matching the
 * raw text would fail on the documentation instead of on a call site.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Every non-test source file whose code matches `pattern`, as paths relative to `src`. */
function sourceFilesMatching(pattern: RegExp): string[] {
  const root = resolve(process.cwd(), "src");
  const matches: string[] = [];

  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "__tests__") walk(path);
      } else if (/\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path)) {
        if (pattern.test(withoutComments(readFileSync(path, "utf8")))) {
          matches.push(relative(root, path));
        }
      }
    }
  };
  walk(root);

  return matches.sort();
}

describe("server rendering without a DOM", () => {
  it("has no document, which is the premise of every assertion here", () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
  });

  it("renders an open uncontrolled Tour to nothing instead of throwing", () => {
    const { html, complaints } = serverRender(<Tour steps={steps} defaultOpen />);
    expect(html).toBe("");
    // No `useLayoutEffect` warning either: deferring the portal means TourStep, which positions
    // itself in a layout effect, is never reached on the server.
    expect(complaints).toEqual([]);
  });

  it("renders an open controlled Tour to nothing instead of throwing", () => {
    const { html, complaints } = serverRender(<Tour steps={steps} open />);
    expect(html).toBe("");
    expect(complaints).toEqual([]);
  });

  it.each([
    ["closed", <Tour key="c" steps={steps} />],
    ["open with no steps", <Tour key="e" steps={[]} defaultOpen />],
  ])("renders a Tour that is %s to nothing", (_label, element) => {
    expect(serverRender(element).html).toBe("");
  });

  it("renders Portal itself to nothing, which is the contract Tour now relies on", () => {
    const { html } = serverRender(
      <Portal>
        <div>never on the server</div>
      </Portal>,
    );
    expect(html).toBe("");
  });

  it("lets only the Portal primitive import createPortal", () => {
    // The regression guard for SSR-001. `createPortal` during render is only safe behind a
    // mounted check, and Portal is the one place that check lives. Matching the import rather
    // than the identifier keeps prose free to name it.
    const IMPORTS_CREATE_PORTAL =
      /import\s*\{[^}]*\bcreatePortal\b[^}]*\}\s*from\s*["']react-dom["']/;

    expect(sourceFilesMatching(IMPORTS_CREATE_PORTAL)).toEqual(["primitives/portal.tsx"]);
  });
});

describe("markup that depends on the environment instead of the props", () => {
  it("draws no random numbers anywhere in the source", () => {
    // The regression guard for the Sidebar skeleton below, and for the bug class: a value drawn
    // during render cannot be drawn again by the browser, so it is never markup-safe. Nothing in
    // the package needs randomness; when something does, it belongs behind an effect.
    expect(sourceFilesMatching(/\bMath\.random\b/)).toEqual([]);
  });

  it("reaches localStorage through the failure-safe adapter and nowhere else", () => {
    // Every direct call site was a way to throw out of render or an effect — a refused write
    // took a DataTable's tree down — or a way to read state the server cannot see. One module
    // owns the access so the failure handling cannot be forgotten at a new call site.
    expect(sourceFilesMatching(/\b(?:local|session)Storage\b/)).toEqual(["runtime/storage.ts"]);
  });

  it("renders a Sidebar skeleton to the same bytes every time", () => {
    const once = () => serverRender(<SidebarMenuSkeleton showIcon />).html;
    const renders = new Set([once(), once(), once(), once(), once()]);

    expect(renders.size).toBe(1);
    expect([...renders][0]).toContain("--skeleton-width:");
  });

  it("still gives the skeletons in one list different widths", () => {
    // Determinism is not uniformity: the widths have to stay uneven or a loading list reads as
    // a block. `useId` differs per instance, which is where the variety comes from.
    const { html } = serverRender(
      <ul>
        {Array.from({ length: 8 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder list
          <SidebarMenuSkeleton key={index} />
        ))}
      </ul>,
    );
    const widths = [...html.matchAll(/--skeleton-width:(\d+)%/g)].map((match) => match[1]);

    expect(widths).toHaveLength(8);
    expect(new Set(widths).size).toBeGreaterThan(4);
  });

  it("reports the default theme, because the server cannot read the browser's storage", () => {
    function Readout() {
      const { theme, resolvedTheme } = useTheme();
      return <output>{`${theme}/${resolvedTheme}`}</output>;
    }
    const { html, complaints } = serverRender(
      <ThemeProvider defaultTheme="system">
        <Readout />
      </ThemeProvider>,
    );

    // `system` resolves to light here — what `:root` renders with no theme class — and not by
    // asking `matchMedia`, which the server does not have either.
    expect(html).toBe("<output>system/light</output>");
    expect(complaints).toEqual([]);
  });

  it("reads and writes nothing when there is no window to store it in", async () => {
    const { readStoredText, writeStoredText } = await import("@/runtime/storage");

    // `window.localStorage` is not merely empty on the server, it does not exist — and the
    // property access is itself what throws in a browser that has storage disabled.
    expect(readStoredText("theme")).toBeNull();
    expect(writeStoredText("theme", "dark")).toBe(false);
  });

  it("renders TimeSince identically whatever time zone the server runs in", async () => {
    // The defect this replaces was not theoretical: a container on UTC sent
    // `title="Jan 1, 2026, 8:00 PM"` to a browser in Asia/Kolkata, which hydrated the same
    // instant as "Jan 2, 2026, 1:30 AM". Re-importing the module per zone matters, because the
    // formatters used to be built once at module scope.
    const originalTimeZone = process.env.TZ;
    const value = "2026-01-01T20:00:00.000Z";

    const renderInZone = async (timeZone: string) => {
      process.env.TZ = timeZone;
      vi.resetModules();
      const { TimeSince } = await import("@/components/utility/time-since");
      return renderToString(<TimeSince value={value} />);
    };

    try {
      const zones = ["UTC", "Asia/Kolkata", "America/Los_Angeles", "Pacific/Kiritimati"];
      const rendered = new Set<string>();
      for (const zone of zones) rendered.add(await renderInZone(zone));

      expect(rendered.size).toBe(1);
      // Rendered in UTC regardless of the host: the same instant, and the same date either side
      // of the boundary that made Kiritimati and Los Angeles disagree.
      expect([...rendered][0]).toContain("Jan 1, 2026");
    } finally {
      process.env.TZ = originalTimeZone;
      vi.resetModules();
    }
  });
});
