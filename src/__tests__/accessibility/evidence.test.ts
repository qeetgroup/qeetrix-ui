/**
 * The evidence analyser, tested against synthetic suites and then against the real one.
 *
 * Synthetic first, deliberately — the same reason src/__tests__/architecture-layers.test.ts does
 * it: every claim in the repository is backed today, so a test that only ran against real code
 * would pass whether or not the analyser worked. The cases below are the ones that matter for
 * `A11Y-001`, and each of them is a way the old gate could go green while the library was
 * getting less accessible:
 *
 *   - a test *file* exists, or a component is *rendered*, but nothing is asserted
 *   - axe is run and nothing else, while the manifest claims keyboard, focus and announcement
 *   - a manifest record outlives the test that proved it
 *   - one component's audit is swapped for another's, leaving the totals unchanged
 */
import { describe, expect, it } from "vitest";
import { LOGICAL_UTILITY_PREFIXES } from "@/contracts/direction";
import { directionForLocale } from "@/lib/direction";
import {
  analyzeTestSource,
  auditSnapshot,
  diffAuditSnapshot,
  findUnbackedClaims,
  verifyConditionalCorpus,
  verifyGlobalEvidence,
} from "@scripts/lib/a11y-evidence.mjs";

const ROOT = process.cwd();

type Leaf = { title: string; slugs: string[]; dimensions: string[]; asserts: boolean };

const analyze = (source: string): Leaf[] => analyzeTestSource("synthetic.test.tsx", source);
const only = (source: string): Leaf => {
  const leaves = analyze(source);
  expect(leaves).toHaveLength(1);
  return leaves[0];
};

const IMPORTS = `
import { Button } from "@/components/Button/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/Dialog/dialog";
import { Input } from "@/components/Input/input";
`;

/** A component record in the shape findUnbackedClaims reads. */
const component = (slug: string, dimensions: Record<string, string>, capabilities = {}) => ({
  slug,
  capabilities: { reducedMotion: "supported", darkMode: "supported", ...capabilities },
  accessibility: { dimensions },
});

describe("attributing a test to a component", () => {
  it("resolves a rendered element through the file's import binding", () => {
    const leaf = only(`${IMPORTS}
      it("names its button", () => {
        render(<Button>Save</Button>);
        expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
      });
    `);
    expect(leaf.slugs).toEqual(["button"]);
  });

  it("resolves compound parts to the module that exports them", () => {
    const leaf = only(`${IMPORTS}
      it("is modal", async () => {
        render(
          <Dialog>
            <DialogTrigger>Open</DialogTrigger>
            <DialogContent>Body</DialogContent>
          </Dialog>,
        );
        expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
      });
    `);
    expect(new Set(leaf.slugs)).toEqual(new Set(["dialog"]));
  });

  it("credits a fixture declared once in the describe body to every test inside it", () => {
    const leaves = analyze(`${IMPORTS}
      describe("Dialog", () => {
        const Fixture = () => (
          <Dialog>
            <DialogContent>Body</DialogContent>
          </Dialog>
        );
        it("closes on Escape and restores focus", async () => {
          render(<Fixture />);
          await pressEscape();
          expect(trigger).toHaveFocus();
        });
      });
    `);
    expect(leaves).toHaveLength(1);
    expect(leaves[0].slugs).toContain("dialog");
    expect(leaves[0].dimensions).toContain("focus");
  });

  it("does not leak one sibling test's render into another's evidence", () => {
    const leaves = analyze(`${IMPORTS}
      describe("group", () => {
        it("keyboard on Button", async () => {
          render(<Button>Go</Button>);
          await pressEnter();
          expect(onClick).toHaveBeenCalled();
        });
        it("axe on Input", async () => {
          const { container } = render(<Input />);
          await expectNoA11yViolations(container);
        });
      });
    `);
    const [first, second] = leaves;
    expect(first.slugs).toEqual(["button"]);
    expect(second.slugs).toEqual(["input"]);
    expect(second.dimensions).not.toContain("keyboard");
  });

  it("reads a describe.each table declared at file scope", () => {
    const leaves = analyze(`${IMPORTS}
      const CASES = [["button", () => <Button>Go</Button>]];
      describe.each(CASES)("%s", (slug, fixture) => {
        it("has no axe violations", async () => {
          const { container } = render(fixture());
          await expectNoA11yViolations(container);
        });
      });
    `);
    expect(leaves).toHaveLength(1);
    expect(leaves[0].slugs).toEqual(["button"]);
  });

  it("ignores a component it does not import from a component module", () => {
    const leaf = only(`
      import { Something } from "somewhere-else";
      it("renders", () => {
        render(<Something />);
        expect(true).toBe(true);
      });
    `);
    expect(leaf.slugs).toEqual([]);
  });
});

describe("what each dimension accepts as an assertion", () => {
  it("treats axe as evidence for semantics and for nothing else", () => {
    const leaf = only(`${IMPORTS}
      it("has no violations", async () => {
        const { container } = render(<Button>Go</Button>);
        await expectNoA11yViolations(container);
      });
    `);
    // This is the whole point of A11Y-001: an axe run cannot see whether Escape closes a
    // dialog, whether focus comes back, or what a screen reader is told.
    expect(leaf.dimensions).toEqual(["semantic"]);
  });

  it("requires a key press for keyboard", () => {
    expect(
      only(`${IMPORTS}
        it("activates", async () => {
          render(<Button>Go</Button>);
          await pressEnter();
          expect(onClick).toHaveBeenCalled();
        });
      `).dimensions,
    ).toContain("keyboard");
  });

  it("requires a focus assertion for focus", () => {
    expect(
      only(`${IMPORTS}
        it("restores focus", async () => {
          render(<Button>Go</Button>);
          await expectFocusRestored(trigger);
        });
      `).dimensions,
    ).toContain("focus");
  });

  it("requires the accessible name to be asserted, not merely supplied", () => {
    const supplied = only(`${IMPORTS}
      it("renders with a label", () => {
        const { container } = render(<Button aria-label="Close">x</Button>);
        expect(container.firstChild).not.toBeNull();
      });
    `);
    expect(supplied.dimensions).not.toContain("name");

    const asserted = only(`${IMPORTS}
      it("is named", () => {
        render(<Button aria-label="Close">x</Button>);
        expectAccessibleName(screen.getByRole("button"), "Close");
      });
    `);
    expect(asserted.dimensions).toContain("name");
  });

  it("requires a direction to be exercised for rtl", () => {
    expect(
      only(`${IMPORTS}
        it("mirrors", async () => {
          render(
            <DirectionProvider direction="rtl">
              <Button>Go</Button>
            </DirectionProvider>,
          );
          await pressArrowRight();
          expect(second).toHaveFocus();
        });
      `).dimensions,
    ).toContain("rtl");
  });

  /**
   * The `rtl` vocabulary was wrong in both directions, and these are the cases that proved it.
   *
   * It matched the bare word `DirectionProvider`, which credited two CurrencyInput tests that use
   * the provider to pick a *locale*; and it did not know a `rtl:` Tailwind variant, so
   * Pagination's chevron test — which is the only assertion available, because jsdom does no
   * layout — earned nothing. A claim (`dropdown-menu.rtl`) was refused on that second count.
   */
  describe("rtl, which was both loose and lossy", () => {
    it("credits an asserted `rtl:` variant with no RTL render at all", () => {
      // Pagination's shape: the mirroring is done by CSS, so the class *is* the evidence.
      expect(
        only(`${IMPORTS}
          it("mirrors every directional chevron", () => {
            render(<Button>Next</Button>);
            expect(icon().getAttribute("class")).toContain("rtl:rotate-180");
          });
        `).dimensions,
      ).toContain("rtl");
    });

    it("credits an asserted logical side and its direction-aware animation", () => {
      // DropdownMenu's shape: `data-side="inline-end"` plus `slide-in-from-start-2`.
      expect(
        only(`${IMPORTS}
          it("animates the submenu on the axis it opens along", () => {
            render(<Button>More</Button>);
            expect(className).toContain("data-[side=inline-end]:slide-in-from-start-2");
          });
        `).dimensions,
      ).toContain("rtl");
    });

    it("credits a logical CSS property read back off the CSSOM", () => {
      expect(
        only(`${IMPORTS}
          it("indents with a logical property", () => {
            render(<Button>Row</Button>);
            expect(row.style.paddingInlineStart).toBe("1.5rem");
            expect(row.style.paddingLeft).toBe("");
          });
        `).dimensions,
      ).toContain("rtl");
    });

    it("refuses a DirectionProvider used only to select a locale", () => {
      // The CurrencyInput case, verbatim in shape: German reads left to right, so this test
      // establishes no direction and asserts nothing about one.
      expect(
        only(`${IMPORTS}
          it("takes its locale from a DirectionProvider", () => {
            render(
              <DirectionProvider locale="de-DE">
                <Input />
              </DirectionProvider>,
            );
            expect(onValueChange).toHaveBeenLastCalledWith(9.5);
          });
        `).dimensions,
      ).not.toContain("rtl");
    });

    it("refuses an RTL locale whose asserted outcome is not a direction", () => {
      // `ar-EG` *is* RTL, but it also selects Arabic-Indic digits, and this is a test about
      // digits. The RTL-ness of the render is incidental, so a mirrored outcome is required.
      expect(
        only(`${IMPORTS}
          it("accepts the digits an Arabic-Indic locale writes", () => {
            render(
              <DirectionProvider locale="ar-EG">
                <Input />
              </DirectionProvider>,
            );
            expect(onValueChange).toHaveBeenLastCalledWith(12);
          });
        `).dimensions,
      ).not.toContain("rtl");
    });

    it("accepts an RTL locale when the outcome is one direction decides", () => {
      // MasterDetail's shape: the locale resolves to RTL and the sheet enters from the left.
      expect(
        only(`${IMPORTS}
          it("derives the mobile sheet side from a locale-only provider", () => {
            render(
              <DirectionProvider locale="ar-EG">
                <Dialog />
              </DirectionProvider>,
            );
            expect(sheet).toHaveAttribute("data-side", "left");
          });
        `).dimensions,
      ).toContain("rtl");
    });

    it("refuses an RTL render whose only assertion is that something rendered", () => {
      // Pagination had this too, and it counted while the chevron test beside it did not. It
      // passes whether or not the component reads the direction.
      expect(
        only(`${IMPORTS}
          it("renders inside an rtl provider without losing its label", () => {
            render(
              <DirectionProvider direction="rtl">
                <Button>Next</Button>
              </DirectionProvider>,
            );
            expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
          });
        `).dimensions,
      ).not.toContain("rtl");
    });

    it("accepts a direction taken from <html dir> rather than a provider", () => {
      expect(
        only(`${IMPORTS}
          it("resolves rtl from <html dir> when there is no provider", () => {
            document.documentElement.setAttribute("dir", "rtl");
            render(<Button>Go</Button>);
            fireEvent.keyDown(item, { key: "ArrowLeft" });
            expect(next).toHaveFocus();
          });
        `).dimensions,
      ).toContain("rtl");
    });

    it("recognises every logical utility prefix the direction contract publishes", () => {
      // `LOGICAL_UTILITY_PREFIXES` is the styling-evidence list the manifest generator reads. If
      // it grows a prefix the analyser cannot see, a component styled with it would be
      // direction-agnostic by the contract and unprovable by the gate.
      for (const prefix of LOGICAL_UTILITY_PREFIXES) {
        const utility = prefix.endsWith(":")
          ? `${prefix}rotate-180`
          : prefix.endsWith("-")
            ? `${prefix}2`
            : `${prefix}-2`;
        expect(
          only(`${IMPORTS}
            it("mirrors", () => {
              render(<Button>Go</Button>);
              expect(el.getAttribute("class")).toContain("${utility}");
            });
          `).dimensions,
          `${prefix} is in LOGICAL_UTILITY_PREFIXES but not in the rtl vocabulary`,
        ).toContain("rtl");
      }
    });

    it("only treats a locale as RTL when the direction runtime agrees it is", () => {
      // The analyser cannot import src/lib/direction.ts, so its locale list is a copy. This is
      // the seam: every tag the vocabulary accepts has to resolve to "rtl" through the same CLDR
      // logic the components use, and a representative LTR tag has to be refused.
      const asserted = (locale: string) =>
        only(`${IMPORTS}
          it("mirrors", () => {
            render(
              <DirectionProvider locale="${locale}">
                <Button>Go</Button>
              </DirectionProvider>,
            );
            fireEvent.keyDown(el, { key: "ArrowLeft" });
            expect(next).toHaveFocus();
          });
        `).dimensions.includes("rtl");

      for (const locale of ["ar-EG", "he-IL", "fa-IR", "ur-PK", "ckb", "pa-Arab", "ks-Arab"]) {
        expect(directionForLocale(locale), `${locale} should be RTL`).toBe("rtl");
        expect(asserted(locale), `${locale} should be accepted as an RTL render`).toBe(true);
      }
      for (const locale of ["de-DE", "en-IN", "pa-IN", "ks-Deva", "ja-JP"]) {
        expect(directionForLocale(locale), `${locale} should be LTR`).toBe("ltr");
        expect(asserted(locale), `${locale} should not count as an RTL render`).toBe(false);
      }
    });
  });

  it("does not count a comment as an assertion", () => {
    const leaf = only(`${IMPORTS}
      it("is a placeholder", () => {
        // TODO: assert getByRole("button") and toHaveFocus() once the harness lands.
        render(<Button>Go</Button>);
      });
    `);
    expect(leaf.dimensions).toEqual([]);
    expect(leaf.asserts).toBe(false);
  });

  it("counts the suite's expect… helpers as assertions", () => {
    // `expectAriaState(trigger, …)` calls `expect` inside; requiring the bare word would mark
    // the most careful tests in the suite as asserting nothing.
    expect(
      only(`${IMPORTS}
        it("exposes expanded state", async () => {
          render(<Button>Go</Button>);
          expectAriaState(trigger, "aria-expanded", "true");
        });
      `).asserts,
    ).toBe(true);
  });
});

describe("unbacked claims", () => {
  const evidence = new Map([
    ["button", new Map([["semantic", ["audit.test.tsx › Button › is a native button"]]])],
  ]);
  const globalDimensions = {
    reducedMotion: {
      proves: "the document-wide reduced-motion rule",
      requires: { capability: "reducedMotion", is: ["supported", "not-applicable"] },
    },
  };

  it("accepts a claim a test asserts", () => {
    const found = findUnbackedClaims({
      components: [component("button", { semantic: "pass" })],
      evidence,
      globalDimensions,
    });
    expect(found).toEqual([]);
  });

  it("rejects a claim no test asserts", () => {
    const found = findUnbackedClaims({
      components: [component("button", { keyboard: "pass" })],
      evidence,
      globalDimensions,
    });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ slug: "button", dimension: "keyboard", state: "pass" });
  });

  it("rejects a `partial` with no test, because partial is still a claim", () => {
    expect(
      findUnbackedClaims({
        components: [component("button", { focus: "partial" })],
        evidence,
        globalDimensions,
      }),
    ).toHaveLength(1);
  });

  it("leaves not-applicable and not-audited alone — neither claims conformance", () => {
    expect(
      findUnbackedClaims({
        components: [component("button", { keyboard: "not-applicable", focus: "not-audited" })],
        evidence,
        globalDimensions,
      }),
    ).toEqual([]);
  });

  it("accepts a global dimension for a component the mechanism reaches", () => {
    expect(
      findUnbackedClaims({
        components: [component("button", { reducedMotion: "pass" })],
        evidence,
        globalDimensions,
      }),
    ).toEqual([]);
  });

  it("rejects a global dimension for a component the mechanism does not reach", () => {
    // Scripted motion is exactly the case the document-wide CSS rule cannot collapse.
    const found = findUnbackedClaims({
      components: [component("carousel", { reducedMotion: "pass" }, { reducedMotion: "unknown" })],
      evidence,
      globalDimensions,
    });
    expect(found).toHaveLength(1);
    expect(found[0].reason).toContain("needs its own test");
  });
});

describe("the audit snapshot", () => {
  const before = auditSnapshot([
    component("dialog", { keyboard: "pass", focus: "pass" }),
    component("badge", { keyboard: "not-applicable", focus: "not-applicable" }),
  ]);

  it("records every slug and dimension, with keys in a stable order", () => {
    expect(Object.keys(before)).toEqual(["badge", "dialog"]);
    expect(Object.keys(before.dialog)).toEqual(["focus", "keyboard"]);
  });

  it("is quiet when nothing moved", () => {
    expect(diffAuditSnapshot(before, before)).toEqual([]);
  });

  it("catches a dimension regressing", () => {
    const after = auditSnapshot([
      component("dialog", { keyboard: "not-audited", focus: "pass" }),
      component("badge", { keyboard: "not-applicable", focus: "not-applicable" }),
    ]);
    expect(diffAuditSnapshot(after, before)).toEqual([
      { slug: "dialog", dimension: "keyboard", from: "pass", to: "not-audited" },
    ]);
  });

  it("catches one component's audit being swapped for another's", () => {
    // The aggregate count is identical — two audited dimensions before, two after. Only a
    // per-slug snapshot can see this, which is why the aggregate ratchet was not enough.
    const after = auditSnapshot([
      component("dialog", { keyboard: "not-audited", focus: "not-audited" }),
      component("badge", { keyboard: "pass", focus: "pass" }),
    ]);
    expect(diffAuditSnapshot(after, before)).toHaveLength(4);
  });

  it("catches a new component arriving unrecorded", () => {
    const after = auditSnapshot([
      component("dialog", { keyboard: "pass", focus: "pass" }),
      component("badge", { keyboard: "not-applicable", focus: "not-applicable" }),
      component("sheet", { keyboard: "pass", focus: "pass" }),
    ]);
    expect(diffAuditSnapshot(after, before)).toEqual([
      { slug: "sheet", dimension: null, from: null, to: "(new component)" },
    ]);
  });
});

describe("a conditional corpus", () => {
  /**
   * `src/__tests__/browser/` is the only place `inert`, focus containment and reflow are actually
   * observed, and it is deliberately outside `bun run verify` — a Playwright Chromium build is
   * ~200 MB. It counts as evidence because a *required CI job* runs it, and that is a real
   * guarantee rather than an assumption only while the job is still there.
   */
  const record = {
    directories: ["src/__tests__/browser"],
    requires: {
      kind: "ci-job",
      workflow: ".github/workflows/ci.yml",
      job: "browser",
      script: "bun run test:browser",
    },
  };

  it("accepts the browser suite while the CI job that runs it exists", () => {
    const outcome = verifyConditionalCorpus({ root: ROOT, record });
    expect(outcome.reason).toBeNull();
    expect(outcome.accepted).toBe(true);
    expect(outcome.files.length).toBeGreaterThan(0);
    expect(outcome.files.every((file: string) => /\.test\.tsx?$/.test(file))).toBe(true);
  });

  it("refuses the corpus when the job no longer runs the suite", () => {
    // The failure this guards: someone drops the browser job and every claim it backed keeps
    // quietly passing. The refusal is what makes those claims fail by name instead.
    const outcome = verifyConditionalCorpus({
      root: ROOT,
      record: { ...record, requires: { ...record.requires, script: "bun run test:nothing" } },
    });
    expect(outcome.accepted).toBe(false);
    expect(outcome.files).toEqual([]);
    expect(outcome.reason).toContain("no longer runs");
  });

  it("refuses a job name that does not exist", () => {
    expect(
      verifyConditionalCorpus({
        root: ROOT,
        record: { ...record, requires: { ...record.requires, job: "nobody" } },
      }).reason,
    ).toContain("has no `nobody` job");
  });

  it("refuses a precondition kind it does not understand", () => {
    expect(
      verifyConditionalCorpus({
        root: ROOT,
        record: { ...record, requires: { kind: "somebody-said-so" } },
      }).reason,
    ).toContain("unknown precondition kind");
  });

  it("refuses a directory that is not there", () => {
    expect(
      verifyConditionalCorpus({
        root: ROOT,
        record: { ...record, directories: ["src/__tests__/no-such-place"] },
      }).reason,
    ).toContain("does not exist");
  });
});

describe("global evidence records", () => {
  it("accepts a suite that exists and asserts something", () => {
    expect(
      verifyGlobalEvidence({
        root: ROOT,
        dimension: "reducedMotion",
        record: {
          kind: "test",
          file: "src/__tests__/accessibility/environment.test.ts",
          suite: "reduced motion",
        },
      }),
    ).toBeNull();
  });

  it("rejects a dead reference to a suite that does not exist", () => {
    expect(
      verifyGlobalEvidence({
        root: ROOT,
        dimension: "reducedMotion",
        record: {
          kind: "test",
          file: "src/__tests__/accessibility/environment.test.ts",
          suite: "a suite nobody wrote",
        },
      }),
    ).toContain("dead reference");
  });

  it("rejects a gate script that does not exist", () => {
    expect(
      verifyGlobalEvidence({
        root: ROOT,
        dimension: "contrast",
        record: { kind: "gate", script: "scripts/check/nope.mjs" },
      }),
    ).toContain("does not exist");
  });

  it("accepts the contrast gate this repository actually runs", () => {
    expect(
      verifyGlobalEvidence({
        root: ROOT,
        dimension: "contrast",
        record: { kind: "gate", script: "scripts/check/contrast.mjs" },
      }),
    ).toBeNull();
  });
});
