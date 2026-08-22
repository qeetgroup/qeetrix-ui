---
"@qeetrix/ui": patch
---

**Fixed: documentation drifted from the artifacts it describes (`DOC-001`).** The finding was not
"the docs are wrong today" — it was that every fact in them is hand-maintained while the thing it
describes is generated, so a correct number is correct by coincidence and only until the next change.
This remediation proved the point by *creating* fresh drift in the same files: a layer documented as
"declared, not yet populated" three hours after five modules landed in it.

**New `check:docs` gate**, wired into `verify`. It checks only classes of claim derivable from an
artifact, and deliberately not prose:

- **Counts** — total component and category counts, and any manifest status tally quoted in a doc,
  must match `component-manifest.json`. Only phrasings that can *only* mean the whole set are
  checked, so a doc stays free to discuss a subset without tripping it.
- **Layer population** — a doc may not describe a layer as empty while files exist in it.
- **Tooling names** — a doc may not name a tool this package does not use. `eslint` earned its place
  on that list by surviving in the README's quality table long after Biome replaced it.
- **Links** — every relative link must resolve, and an `#Lnn-Lnn` range must point inside a file
  that actually has that many lines.

Test and export counts are deliberately **not** checked: both change on almost every commit, and a
gate that fails for a legitimate reason a dozen times a day is a gate somebody deletes.

**Six corrected claims:** `runtime` and `primitives` documented as unpopulated (both now hold
modules); the manifest schema example's status tally (`stable: 144, beta: 0` → the real figures); the
README claiming ESLint; and a Changesets link pointing at a file that does not exist.

**New `docs/standards/security.md`.** The audit named trust-boundary guidance as missing, and this
remediation is why it matters: several defects were unstated assumptions about which side of a
boundary a value came from, not coding mistakes. The page states what the library guarantees, and
what it structurally cannot — your server must still sniff file signatures rather than trust
`Content-Type`, sanitise SVG uploads, and sanitise `RichTextEditor` HTML on the way in and out, whose
hostile-HTML round trips remain untested. It also documents the `style-src-attr` requirement and the
`nonce` hook.
