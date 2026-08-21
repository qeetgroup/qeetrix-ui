---
"@qeetrix/ui": major
---

Remove the built-in localization layer (`@qeetrix/ui/i18n`).

`I18nProvider`, `useI18n`, `useTranslations`, `en`, and the `Locale`/`Messages`
types are gone. Component-internal copy ("Previous page", "No matches",
"Drop files here…") is now plain English in the component, and `Pagination`
formats numbers with the runtime's default locale instead of a provider-supplied
one.

Localization belongs to each product, not to the design system. Components that
already accept `placeholder` / `emptyMessage` / `aria-label` props keep them, so
a product can still override the strings it cares about.

**Migration:** delete `I18nProvider` from your tree and pass the strings you were
overriding as props.
