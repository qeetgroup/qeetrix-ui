import { useSyncExternalStore } from "react";

/**
 * Hash routing, so every view is a shareable URL that also works from a static build:
 *
 *   #/                                   overview
 *   #/components?q=date&status=beta      gallery, with its search and filters
 *   #/components/button?variant=outline  inspector, with its controls and render toggles
 *   #/foundations?section=contrast       theme lab
 *   #/qa?density=compact                 visual QA matrix
 *   #/patterns/qeet-pay                  product patterns
 *
 * Links are plain `<a href="#/…">` (they push history); typing and toggles replace the current
 * entry instead, so Back steps through places rather than keystrokes.
 */

export type Page = "overview" | "components" | "inspector" | "foundations" | "qa" | "patterns";

export interface Route {
  readonly page: Page | "not-found";
  /** Inspector slug or pattern id. */
  readonly id?: string;
  readonly query: URLSearchParams;
  /** The path part of the hash, e.g. `/components/button`. */
  readonly path: string;
}

const NAVIGATE_EVENT = "pg:navigate";

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, "") || "/";
  const [path = "/", search = ""] = raw.split("?");
  const query = new URLSearchParams(search);
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const [first, second] = parts;
  if (!first) return { page: "overview", query, path };
  if (first === "components") {
    return second
      ? { page: "inspector", id: second, query, path }
      : { page: "components", query, path };
  }
  if (first === "foundations") return { page: "foundations", query, path };
  if (first === "qa") return { page: "qa", query, path };
  if (first === "patterns") return { page: "patterns", id: second, query, path };
  return { page: "not-found", query, path };
}

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

const getHash = () => window.location.hash;

/** The current route; re-renders on navigation. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, getHash);
  return parseRoute(hash);
}

/** Navigate to a `#/…` href. `replace` rewrites the current history entry. */
export function navigate(href: string, { replace = false }: { replace?: boolean } = {}) {
  const target = href.startsWith("#") ? href : `#${href}`;
  if (target === window.location.hash) return;
  if (replace) {
    window.history.replaceState(window.history.state, "", target);
  } else {
    window.history.pushState(window.history.state, "", target);
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

/** A `#/path?query` href; empty, `undefined` and default-valued params are dropped. */
export function href(
  path: string,
  params: Record<string, string | number | boolean | null | undefined> = {},
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    query.set(key, value === true ? "1" : String(value));
  }
  const search = query.toString().replace(/%2C/g, ",");
  return `#${path}${search ? `?${search}` : ""}`;
}

/** Merge `patch` into the current route's query (replacing the history entry by default). */
export function setQuery(
  patch: Record<string, string | number | boolean | null | undefined>,
  { replace = true }: { replace?: boolean } = {},
) {
  const route = parseRoute(window.location.hash);
  const next: Record<string, string> = Object.fromEntries(route.query.entries());
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === "" || value === false) delete next[key];
    else next[key] = value === true ? "1" : String(value);
  }
  navigate(href(route.path, next), { replace });
}

/** Read a query param constrained to a set of options. */
export function oneOf<T extends string>(
  value: string | null,
  options: readonly T[],
  fallback: T,
): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

/** A comma list of known values. */
export function listOf<T extends string>(value: string | null, options: readonly T[]): T[] {
  const requested = new Set((value ?? "").split(","));
  return options.filter((option) => requested.has(option));
}
