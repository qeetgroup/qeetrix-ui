---
"@qeetrix/ui": patch
---

**`check:architecture`'s per-file rules stopped testing anything on a platform where the path
separator is not `/`.** `walk()` builds paths with `join()`, so they carry the platform separator,
and three places then split on `"/"`: the filename, the `/__tests__/` membership test, and the
category segment. On Windows `name` became the entire path, so the kebab-case rule, the
test-location rule and the test-has-a-matching-component rule all passed by accident rather than
by being satisfied.

Now `basename()` and `split(sep)`. The failure mode this removes is the quiet one — a gate that
reports success because it could not find anything to look at.

Reported by AG-5 while documenting macOS/Linux as the supported environments (PORT-001); worth
fixing regardless of the support statement, for exactly that reason.
