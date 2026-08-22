"use client";

import * as React from "react";

import type { MessageCatalogue, MessagesFor, QeetrixMessages } from "@/lib/messages";
import { mergeMessageCatalogues, resolveMessages } from "@/lib/messages";

/**
 * The React half of the message contract: where a translated string comes from, and which
 * source wins.
 *
 * The catalogue itself — every default, and the type of every group — is `@/lib/messages`,
 * which imports nothing. This module adds the two things that need React: a provider a host
 * application declares once, and the hook a component resolves through.
 *
 * Deliberately *not* merged into `DirectionProvider`. A locale and a translation change on
 * different schedules: an application can be right-to-left with the library's English strings
 * (a bilingual admin console), or fully translated while staying left-to-right. Compose them
 * when you want both:
 *
 * ```tsx
 * <DirectionProvider locale="ar-EG">
 *   <MessagesProvider messages={arabic}>{children}</MessagesProvider>
 * </DirectionProvider>
 * ```
 *
 * @see src/lib/messages.ts for the catalogue and the defaults
 */

/**
 * Overrides declared by ancestors, already merged.
 *
 * `null` means no provider, which is distinct from a provider that declared an empty
 * catalogue — the same distinction `DirectionContext` draws, and for the same reason: a
 * component must be able to tell "nobody translated this" from "somebody translated it to
 * the same thing".
 */
const MessagesContext = React.createContext<MessageCatalogue | null>(null);

interface MessagesProviderProps {
  /**
   * The translation. Any subset of component groups, each with any subset of its messages;
   * everything omitted keeps the built-in English default.
   *
   * Interpolating messages are functions of their parts, not strings with placeholders, so a
   * translation can reorder them:
   *
   * ```tsx
   * <MessagesProvider
   *   messages={{
   *     pagination: { next: "Weiter", nextPage: "Nächste Seite" },
   *     carousel: { slidePosition: (position, count) => `${position} von ${count}` },
   *   }}
   * >
   * ```
   *
   * Hold this object still — a literal declared inside a component body is a new object on
   * every render, which defeats the memoisation in `useMessages`. Declare it at module scope,
   * or memoise it.
   */
  messages: MessageCatalogue;
  children?: React.ReactNode;
}

/**
 * Declares the strings `@qeetrix/ui` renders inside a subtree.
 *
 * Renders no markup — it is context only, so it can wrap an application root, a single route,
 * or one dialog without affecting layout. Nested providers **merge, group by group**: an inner
 * provider that translates `pagination` keeps an outer provider's translation of everything
 * else, and within `pagination` keeps the outer provider's other keys. That is what makes a
 * per-feature override viable at all; replacing wholesale would mean every nested provider
 * had to restate the entire catalogue.
 *
 * The library never *detects* a language. Which strings to render, like which locale to
 * format in, is the host application's decision — see `DirectionProvider`'s `locale`.
 */
function MessagesProvider({ messages, children }: MessagesProviderProps) {
  const inherited = React.useContext(MessagesContext);
  const value = React.useMemo(
    () => mergeMessageCatalogues(inherited, messages),
    [inherited, messages],
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

/**
 * The resolved messages for one component — the value a component renders from.
 *
 * Resolution order, most specific first, matching `useResolvedDirection`:
 *
 * 1. `overrides`: the component's own `messages` prop. Always wins.
 * 2. The nearest `MessagesProvider`, with ancestors already merged into it.
 * 3. `defaults`: the built-in English, from `@/lib/messages`.
 *
 * Resolution is per *key*, not per group, so a prop that translates one string keeps the
 * provider's translation of the rest, and `undefined` falls through rather than blanking an
 * accessible name.
 *
 * `defaults` is passed in rather than looked up by `namespace`, which is the one piece of
 * ceremony here and is deliberate: a lookup table would mean this module referenced every
 * group, and a bundler would then ship every string in the catalogue to an application that
 * imported a single component. Passing the group keeps each one reachable only from the
 * component that renders it. The `namespace` argument still has to agree with `defaults` —
 * `QeetrixMessages` is indexed by it, so a mismatched pair does not compile.
 *
 * The un-translated case returns `defaults` by identity, so this is safe as a hook dependency
 * and adds no allocation to the common render.
 *
 * ```tsx
 * function Pagination({ messages: overrides, ...props }: PaginationProps) {
 *   const messages = useMessages("pagination", paginationMessages, overrides);
 *   return <nav aria-label={messages.label}>…</nav>;
 * }
 * ```
 */
function useMessages<Key extends keyof QeetrixMessages>(
  namespace: Key,
  defaults: QeetrixMessages[Key],
  overrides?: MessagesFor<Key>,
): QeetrixMessages[Key] {
  const catalogue = React.useContext(MessagesContext);
  const fromProvider = catalogue?.[namespace];
  return React.useMemo(
    () => resolveMessages(defaults, fromProvider, overrides),
    [defaults, fromProvider, overrides],
  );
}

export type { MessageCatalogue, MessagesFor, MessagesProviderProps, QeetrixMessages };
export { MessagesProvider, useMessages };
