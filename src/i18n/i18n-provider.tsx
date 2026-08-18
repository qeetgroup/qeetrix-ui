"use client";

import * as React from "react";

import { en } from "./messages/en";
import type { Locale, Messages } from "./types";

interface I18nContextValue {
  locale: Locale;
  messages: Messages;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  /** BCP-47 locale tag. Defaults to `"en"`. */
  locale?: Locale;
  /** Overrides deep-merged over the default English catalog (per namespace). */
  messages?: Messages;
  /** Set the document `<html lang>` attribute while mounted. Defaults to `true`. */
  setDocumentLanguage?: boolean;
  children: React.ReactNode;
}

function mergeMessages(base: Messages, over?: Messages): Messages {
  if (!over) return base;
  const out: Messages = { ...base };
  for (const ns of Object.keys(over)) out[ns] = { ...(base[ns] ?? {}), ...over[ns] };
  return out;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/**
 * Provides component locale strings to the subtree. **Optional** — components
 * fall back to English when no provider is mounted, so adding it is never a
 * breaking change. Compose with `DirectionProvider` for RTL locales:
 * `<I18nProvider locale="ar"><DirectionProvider direction="rtl">…`.
 */
function I18nProvider({
  locale = "en",
  messages,
  setDocumentLanguage = true,
  children,
}: I18nProviderProps) {
  React.useEffect(() => {
    if (!setDocumentLanguage) return undefined;

    const root = document.documentElement;
    const previousLanguage = root.getAttribute("lang");
    root.setAttribute("lang", locale);

    return () => {
      if (previousLanguage) root.setAttribute("lang", previousLanguage);
      else root.removeAttribute("lang");
    };
  }, [locale, setDocumentLanguage]);

  const value = React.useMemo(
    () => ({ locale, messages: mergeMessages(en, messages) }),
    [locale, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Returns a translator `t(key, vars?)` for a component namespace. Resolves from
 * the active catalog, then the English default, then the raw key; `{var}`
 * placeholders are interpolated from `vars`.
 */
function useTranslations(namespace: string) {
  const ctx = React.useContext(I18nContext);
  const messages = ctx?.messages ?? en;
  return React.useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value = messages[namespace]?.[key] ?? en[namespace]?.[key] ?? key;
      return interpolate(value, vars);
    },
    [messages, namespace],
  );
}

/** The active locale + resolved catalog (English defaults when unprovided). */
function useI18n() {
  const ctx = React.useContext(I18nContext);
  return { locale: ctx?.locale ?? "en", messages: ctx?.messages ?? en };
}

export type { I18nProviderProps, Locale, Messages };
export { en, I18nProvider, useI18n, useTranslations };
