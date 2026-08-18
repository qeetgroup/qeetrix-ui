/** A BCP-47 locale tag (e.g. "en", "es", "ar"). */
export type Locale = string;

/** Component copy, grouped by component namespace → key → string (may contain `{var}`). */
export interface Messages {
  [namespace: string]: { [key: string]: string };
}
