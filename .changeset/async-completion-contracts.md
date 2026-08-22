---
"@qeetrix/ui": minor
---

**Fixed: three asynchronous utilities reported completion they had not observed (`ASYNC-001`).**
Each had a callback whose name promised the work was done.

- **`CopyButton` called `onCopy` synchronously**, in the same click handler that started the
  clipboard write. A denied or unsupported write reported success. `onCopy` now fires only after
  the write resolves, and a new `onCopyError` reports the original failure — including the
  `TypeError` from `navigator.clipboard` being undefined on an insecure origin, which used to be an
  unhandled rejection.
- **`useCopyToClipboard` swallowed failures.** `copy` now returns `Promise<boolean>` (it never
  rejects, so callers can `await` it without a try/catch) and the hook exposes `error`, cleared
  when a later copy succeeds. It also stops setting state after unmount.
- **`CopyableSecret` treated a refused legacy copy as a success.** `document.execCommand("copy")`
  signals refusal by *returning* `false`, not by throwing, and the return value was discarded — so
  on a browser without the async Clipboard API the button flipped to "Copied" with nothing on the
  clipboard. The result is checked, the transient textarea is always removed, and `onCopyError`
  reports the cause.
- **`QRCode` could show a stale code and could load forever.** Two overlapping encodes resolved in
  whatever order they finished, and a rejection — a value too long for the chosen error-correction
  level is the common one — was unhandled, leaving the skeleton up permanently. Encodes are now
  sequenced so only the newest can commit, and a failure ends the loading state, reports through a
  new `onError`, and renders a new `errorFallback` (nothing by default, in a box of the same size).

Additive: `onCopyError`, `onError`, `errorFallback` and the hook's `error` are new; `copy`'s return
type widened from `void` to `Promise<boolean>`, which is source-compatible.

`useCopyToClipboard`'s `copied` already waited for the promise — that part of the audit's claim did
not hold, and is unchanged.

19 tests, including a write held open across an assertion to prove nothing is announced early.
