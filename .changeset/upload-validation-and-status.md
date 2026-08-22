---
"@qeetrix/ui": minor
---

**Fixed: uploads validated differently depending on how the file arrived, and said nothing about
progress (`A11Y-010`).**

- **`Dropzone` ignored `multiple={false}` on drop.** The attribute constrains the native file
  dialog; a drop hands over whatever was dragged, and the count limit was only applied when
  `maxFiles` was set. A single-file field accepted five files without a word. `multiple={false}` is
  now a limit of one on both paths, and the stricter of it and `maxFiles` wins.
- **`LogoUploader` did not enforce its own `accept`.** It checked `file.type.startsWith("image/")`
  regardless, so `accept=".png"` let a JPEG through on drop and through the file input. Both paths
  now run the same `isFileAccepted` check that `Dropzone` uses.
- **`LogoUploader` would hand any string to `<img src>`.** The URL field emitted whatever was typed.
  Only `http(s)`, relative paths and `data:image/*` are previewed now; anything else — a
  `javascript:` value, `data:text/html` — is reported as an error, marks the field `aria-invalid`
  and renders a placeholder instead of an image. The caller still receives the value it owns.
- **`LogoUploader` leaked `FileReader`s.** Picking a second file left the first reader running to
  completion, so the older read could land last and overwrite the newer choice; unmounting left one
  resolving into a dead component. Readers are aborted on replacement and on unmount.
- **`FileUploadItem` announces progress and completion**, politely and named after the file — a list
  of concurrent uploads was otherwise a stack of anonymous progress bars. The bar itself is now
  labelled `"Uploading <name>"`. Failures are left to the existing visible `role="alert"` so they are
  announced once. New `statusLabel` prop for translation (return `""` to opt out).

**Documented, not fixed:** `accept` and `maxSize` read the browser-reported name and MIME type, both
of which the client controls. A renamed executable passes, and an SVG is a script-carrying document,
not a picture. The server must verify the real signature, cap the size again, and sanitise SVG before
storing or serving it. This is now stated on `isFileAccepted`, `Dropzone` and `LogoUploader` rather
than left implied.

25 tests.
