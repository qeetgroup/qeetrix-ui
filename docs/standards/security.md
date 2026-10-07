# Security and trust boundaries

What `@qeetrix/ui` protects you from, what it cannot, and what your server still has to do.

This page exists because several of the defects found in the 2026-08 enterprise audit were not
coding mistakes — they were *unstated assumptions* about which side of a trust boundary a value came
from. A component that treats its props as trusted is correct right up until a tenant can set them.

## The rule

**Treat every prop as untrusted unless your own code produced the value.**

That sounds obvious and is routinely violated, because component props feel like configuration
rather than input. In a multi-tenant product they are usually neither: series keys come from a
dataset, colours come from a tenant theme, table cells come from user records, and file names come
from whatever the uploader was called.

## What the library guarantees

| Surface | Guarantee |
|---|---|
| Text rendering | React escapes text children. No component uses `dangerouslySetInnerHTML`. |
| `Chart` config | Series colours are written as inline custom properties. A `theme` pair goes through a value allowlist — restricted character set, balanced parentheses, allowlisted functions. `url()` is rejected, so a config cannot make the document fetch an attacker-chosen address. |
| `DataTable` CSV export | Cells a spreadsheet would evaluate are prefixed so they import as text. Plain numbers are exempt so sums survive. Opt out with `exportFormulaEscaping="none"` only when every value is trusted. |
| `CodeBlock` | Emits text nodes. Highlighting adds no markup from the input. |
| `RichTextEditor` links | The installed TipTap link policy rejects unsafe URL schemes. |
| Generated CSS | Any identifier interpolated into a selector or property name must match `^[a-zA-Z0-9_-]+$`. Anything else is dropped, never escaped. |
| Uploads | Preview URLs are restricted to `http(s)`, relative paths and `data:image/*`. |

Where a value fails validation it is **dropped, not escaped**. An untrusted config therefore
produces *fewer* declarations, never different ones. A colour that silently does not apply is
usually a value outside the accepted grammar — the grammar is documented on `ChartStyle`.

## What the library cannot do, and you must

These are not gaps to be fixed later. They are obligations that cannot be met in a browser.

### Uploads: validate again on the server

`FileUpload` and the logo-uploader block check the extension and the browser-reported MIME type. Both are
attacker-controlled. The client check exists to give fast feedback, not to enforce anything.

Your server must independently: sniff the file signature rather than trust `Content-Type`; enforce
the size limit; and **sanitise SVG** before storing or re-serving it, because an SVG is a document
that can carry script. None of that is possible client-side.

### `RichTextEditor`: sanitise on the way in and on the way out

The editor round-trips HTML. It is not a sanitiser, and hostile-HTML round trips are **not
currently tested** — treat its output as untrusted input to whatever renders it.

Sanitise on the server when storing, and again when rendering into any surface that is not this
editor. If you render stored content with `dangerouslySetInnerHTML`, the sanitiser is the only thing
between a stored document and script execution in another user's session.

### CSV export: the file leaves your trust boundary

Formula neutralisation makes the file safe to *open*. It does not make the data safe to publish. An
export still contains whatever the requesting user could see, so authorisation belongs at the point
the export is offered, not at serialisation.

### Content Security Policy

The package needs `style-src-attr` to permit inline styles: dynamic values — chart colours, sidebar
widths, marquee timings — are set as inline custom properties. That is a deliberate choice; setting
them through a generated stylesheet is what made CSS injection possible in the first place.

A `Chart` whose config uses `theme` also emits one `<style>` element. Pass `nonce` to
`ChartContainer` if your policy requires one. Series declared with `color` emit no stylesheet and
need no nonce.

## Reporting

Security issues in this package should go to the Qeet Group security contact rather than a public
issue. Include the component, the prop values involved, and which trust boundary the value crossed.

## Where this is enforced

- `src/components/data-display/__tests__/chart.test.tsx` — the generated-CSS safety matrix.
- `src/components/data-display/__tests__/data-table.test.tsx` — the CSV payload matrix, asserted on
  the bytes the browser would download.
- `src/__tests__/ssr.test.tsx` — a static guard that `createPortal` stays inside the `Portal`
  primitive, and that production source contains no `Math.random` or direct `localStorage` access.
