import type { Values } from "../registry/types";

/**
 * Preview frames. Anything that has to be judged in a particular theme, density, direction or
 * motion preference renders in an iframe running this same app at `#/frame/…`: a separate
 * document whose `<html>` carries the theme class, `data-qx-density` and `dir`, exactly as a
 * consumer application would. That is the only faithful way to put light and dark side by
 * side — the library's `dark:` variant matches any descendant of `.dark`, so a light island
 * inside a dark document would still pick up dark-only utilities — and it keeps overlays
 * (portals, modal backdrops, fixed toasts) inside the preview they belong to.
 *
 * The whole configuration is in the frame URL. The host updates a live frame with
 * `location.replace()` on a hash-only URL (no reload, no history entry); the frame reports its
 * content height back with `postMessage`.
 */

export type FrameTheme = "light" | "dark";
export type FrameDensity = "comfortable" | "compact";
export type FrameDirection = "ltr" | "rtl";
export type FrameMotion = "full" | "reduce";
export type FrameBackground = "canvas" | "card" | "sunken";

export interface FrameEnv {
  readonly theme: FrameTheme;
  readonly density: FrameDensity;
  readonly dir: FrameDirection;
  readonly motion: FrameMotion;
  readonly bg: FrameBackground;
}

export type FrameRoute =
  | {
      readonly kind: "module";
      readonly slug: string;
      readonly view: "playground" | "demos";
      readonly values?: Values;
    }
  | { readonly kind: "demo"; readonly slug: string; readonly demo: number }
  | { readonly kind: "family"; readonly family: string }
  | { readonly kind: "qa" }
  | { readonly kind: "qa-sample"; readonly id: string }
  | { readonly kind: "pattern"; readonly id: string }
  | { readonly kind: "specimen" }
  | { readonly kind: "brand"; readonly id: string };

export const defaultFrameEnv: FrameEnv = {
  theme: "light",
  density: "comfortable",
  dir: "ltr",
  motion: "full",
  bg: "canvas",
};

export const FRAME_MESSAGE = "qeetrix-ui-playground";

export interface FrameSizeMessage {
  readonly source: typeof FRAME_MESSAGE;
  readonly type: "size";
  readonly height: number;
}

function routePath(route: FrameRoute): string {
  switch (route.kind) {
    case "module":
      return `module/${route.slug}`;
    case "demo":
      return `demo/${route.slug}/${route.demo}`;
    case "family":
      return `family/${route.family}`;
    case "qa":
      return "qa";
    case "qa-sample":
      return `qa-sample/${route.id}`;
    case "pattern":
      return `pattern/${route.id}`;
    case "specimen":
      return "specimen";
    case "brand":
      return `brand/${route.id}`;
  }
}

/** `#/frame/…?theme=dark&…` for a route and environment (defaults omitted). */
export function frameHash(route: FrameRoute, env: FrameEnv): string {
  const params = new URLSearchParams();
  params.set("theme", env.theme);
  if (env.density !== defaultFrameEnv.density) params.set("density", env.density);
  if (env.dir !== defaultFrameEnv.dir) params.set("dir", env.dir);
  if (env.motion !== defaultFrameEnv.motion) params.set("motion", env.motion);
  if (env.bg !== defaultFrameEnv.bg) params.set("bg", env.bg);
  if (route.kind === "module") {
    if (route.view !== "playground") params.set("view", route.view);
    if (route.values && Object.keys(route.values).length > 0) {
      params.set("values", JSON.stringify(route.values));
    }
  }
  return `#/frame/${routePath(route)}?${params.toString()}`;
}

function oneOf<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

/** The route and environment of a frame document, or `null` when the hash is not a frame. */
export function parseFrameHash(hash: string): { route: FrameRoute; env: FrameEnv } | null {
  if (!hash.startsWith("#/frame/")) return null;
  const [path, query = ""] = hash.slice("#/frame/".length).split("?");
  const params = new URLSearchParams(query);
  const env: FrameEnv = {
    theme: oneOf(params.get("theme"), ["light", "dark"], defaultFrameEnv.theme),
    density: oneOf(params.get("density"), ["comfortable", "compact"], defaultFrameEnv.density),
    dir: oneOf(params.get("dir"), ["ltr", "rtl"], defaultFrameEnv.dir),
    motion: oneOf(params.get("motion"), ["full", "reduce"], defaultFrameEnv.motion),
    bg: oneOf(params.get("bg"), ["canvas", "card", "sunken"], defaultFrameEnv.bg),
  };
  const [kind, first = "", second = ""] = path.split("/").map(decodeURIComponent);
  let route: FrameRoute;
  switch (kind) {
    case "module": {
      let values: Values | undefined;
      try {
        const parsed: unknown = JSON.parse(params.get("values") ?? "null");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
          values = parsed as Values;
      } catch {
        values = undefined;
      }
      route = {
        kind,
        slug: first,
        view: params.get("view") === "demos" ? "demos" : "playground",
        values,
      };
      break;
    }
    case "demo":
      route = { kind, slug: first, demo: Number.parseInt(second, 10) || 0 };
      break;
    case "family":
      route = { kind, family: first };
      break;
    case "qa-sample":
      route = { kind, id: first };
      break;
    case "pattern":
      route = { kind, id: first };
      break;
    case "specimen":
      route = { kind };
      break;
    case "brand":
      route = { kind, id: first };
      break;
    default:
      route = { kind: "qa" };
  }
  return { route, env };
}
