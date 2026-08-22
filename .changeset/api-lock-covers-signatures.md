---
"@qeetrix/ui": patch
---

**The public API lock now protects signatures, not just names (`API-002`).**

`check:exports` snapshotted a list of exported *names* per entry point, and a list of *prop names*
per `*Props` type. Everything else about the contract was invisible to it: a prop could become
required, a union could narrow, a callback could gain an argument, a props type could stop
extending `React.ComponentProps<"button">` (silently dropping ~250 inherited attributes), or an
exported function could be replaced by a type of the same name — and the gate passed.

Two changes:

- **Every explicit entry point is covered.** The lock read `.`, `./brand` and `./blocks`; it now
  derives its entry list from the `exports` map in `package.json`, so `./providers`, the three
  `./providers/<name>` modules, the six `./blocks/<name>` modules and the eight `./hooks/<name>` /
  `./lib/<name>` paths are locked too — 21 entry points and 764 symbols, up from 3 and 644. A new
  export cannot be added to the map without being snapshotted.
- **Signatures are recorded.** `public-api.json` stores each export's *kind* (function, variable,
  interface, type alias, …). `public-props.json` stores, per props type, its type parameters, the
  types it extends, and each declared member with its optionality and declared type text — so
  `busy?: boolean` → `busy: boolean` reports "now REQUIRED — breaking", and dropping a base type
  reports "every prop it inherited from that type is gone".

Signatures are read from the declaration rather than the resolved type, deliberately: resolving
`React.ComponentProps<"div">` would inline 250 DOM attributes that churn on every `@types/react`
bump. What is recorded is that the inheritance exists, so removing it still fails.

Both snapshot files change format. The check detects the old format and tells you to re-snapshot
rather than reporting a spurious diff on every symbol.
