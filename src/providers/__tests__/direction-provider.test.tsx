import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it } from "vitest";

import {
  DirectionProvider,
  useDirection,
  useDirectionalKeys,
  useLocale,
  useResolvedDirection,
} from "@/providers/direction-provider";

/*
 * jsdom has no layout, so nothing here can observe *mirroring*. What it can observe — and what
 * these tests pin — is the contract the library emits: the resolved direction value, the `dir`
 * and `lang` attributes, and the arrow-key mapping. That a `ps-4` actually renders on the right
 * under `dir="rtl"` is a browser assertion (`TEST-001`).
 */

afterEach(() => {
  document.documentElement.removeAttribute("dir");
});

/** Reports whatever the hooks resolve, so a test can assert on text instead of internals. */
function Probe({ override }: { override?: "ltr" | "rtl" } = {}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const resolved = useResolvedDirection(ref, override);
  const declared = useDirection();
  const locale = useLocale();
  return (
    <div ref={ref}>
      <span data-testid="resolved">{resolved}</span>
      <span data-testid="declared">{declared}</span>
      <span data-testid="locale">{locale ?? "(none)"}</span>
    </div>
  );
}

function KeyProbe({ orientation }: { orientation?: "horizontal" | "vertical" }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { arrowKeys, logical, direction } = useDirectionalKeys(ref, orientation);
  return (
    <div ref={ref}>
      <span data-testid="direction">{direction}</span>
      <span data-testid="previous">{arrowKeys.previous}</span>
      <span data-testid="next">{arrowKeys.next}</span>
      <span data-testid="left">{logical("ArrowLeft") ?? "-"}</span>
      <span data-testid="right">{logical("ArrowRight") ?? "-"}</span>
      <span data-testid="enter">{logical("Enter") ?? "-"}</span>
    </div>
  );
}

const at = (id: string) => screen.getByTestId(id).textContent;

describe("DirectionProvider", () => {
  it("declares ltr by default", () => {
    const { container } = render(
      <DirectionProvider>
        <Probe />
      </DirectionProvider>,
    );
    expect(container.querySelector('[data-slot="direction-provider"]')).toHaveAttribute(
      "dir",
      "ltr",
    );
    expect(at("resolved")).toBe("ltr");
  });

  it("sets dir on the wrapper so CSS logical properties resolve", () => {
    const { container } = render(
      <DirectionProvider direction="rtl">
        <Probe />
      </DirectionProvider>,
    );
    const wrapper = container.querySelector('[data-slot="direction-provider"]');
    expect(wrapper).toHaveAttribute("dir", "rtl");
    // `display: contents` — the wrapper carries the attribute without becoming a box.
    expect(wrapper).toHaveClass("contents");
  });

  it("derives direction from a locale, so callers do not restate it", () => {
    render(
      <DirectionProvider locale="ar-EG">
        <Probe />
      </DirectionProvider>,
    );
    expect(at("resolved")).toBe("rtl");
    expect(at("locale")).toBe("ar-EG");
  });

  it("lets an explicit direction override the locale's own", () => {
    // A transliterated Arabic UI, or a locale-tagged code block that reads LTR.
    render(
      <DirectionProvider locale="ar-EG" direction="ltr">
        <Probe />
      </DirectionProvider>,
    );
    expect(at("resolved")).toBe("ltr");
    expect(at("locale")).toBe("ar-EG");
  });

  it("publishes the locale as lang, and omits it when there is none", () => {
    const { container: withLocale } = render(
      <DirectionProvider locale="de-DE">
        <span />
      </DirectionProvider>,
    );
    expect(withLocale.querySelector('[data-slot="direction-provider"]')).toHaveAttribute(
      "lang",
      "de-DE",
    );

    const { container: withoutLocale } = render(
      <DirectionProvider direction="rtl">
        <span />
      </DirectionProvider>,
    );
    // Not `lang=""`, which would assert "no language" to assistive technology.
    expect(withoutLocale.querySelector('[data-slot="direction-provider"]')).not.toHaveAttribute(
      "lang",
    );
  });

  it("reports no locale when none was declared", () => {
    render(<Probe />);
    expect(at("locale")).toBe("(none)");
  });

  it("lets a nested provider declare an island of the opposite direction", () => {
    render(
      <DirectionProvider direction="rtl" locale="he-IL">
        <DirectionProvider direction="ltr" locale="en-US">
          <Probe />
        </DirectionProvider>
      </DirectionProvider>,
    );
    expect(at("resolved")).toBe("ltr");
    expect(at("locale")).toBe("en-US");
  });
});

describe("useResolvedDirection", () => {
  it("resolves rtl from <html dir>, which a provider-only hook cannot see", () => {
    document.documentElement.setAttribute("dir", "rtl");
    render(<Probe />);
    // This is the whole reason the hook consults the DOM: setting `dir` on the document is
    // how applications turn RTL on, and it leaves every React context at its default.
    expect(at("resolved")).toBe("rtl");
    expect(at("declared")).toBe("ltr");
  });

  it("resolves rtl from an intermediate dir attribute", () => {
    render(
      <div dir="rtl">
        <Probe />
      </div>,
    );
    expect(at("resolved")).toBe("rtl");
  });

  it("prefers a declared provider over the DOM", () => {
    document.documentElement.setAttribute("dir", "rtl");
    render(
      <DirectionProvider direction="ltr">
        <Probe />
      </DirectionProvider>,
    );
    // An LTR island inside an RTL document has to stay LTR.
    expect(at("resolved")).toBe("ltr");
  });

  it("prefers an explicit override over both", () => {
    document.documentElement.setAttribute("dir", "rtl");
    render(
      <DirectionProvider direction="rtl">
        <Probe override="ltr" />
      </DirectionProvider>,
    );
    expect(at("resolved")).toBe("ltr");
  });

  it("falls back to ltr with no provider and no dir anywhere", () => {
    render(<Probe />);
    expect(at("resolved")).toBe("ltr");
  });

  it("follows a provider that changes direction after mount", () => {
    function Switcher() {
      const [direction, setDirection] = React.useState<"ltr" | "rtl">("ltr");
      return (
        <DirectionProvider direction={direction}>
          <button type="button" onClick={() => setDirection("rtl")}>
            flip
          </button>
          <Probe />
        </DirectionProvider>
      );
    }
    render(<Switcher />);
    expect(at("resolved")).toBe("ltr");
    fireEvent.click(screen.getByRole("button", { name: "flip" }));
    // The provider path is reactive; the DOM-attribute path deliberately is not, and that
    // asymmetry is documented on the hook.
    expect(at("resolved")).toBe("rtl");
  });
});

describe("useDirectionalKeys", () => {
  it("maps the inline axis to the reading direction", () => {
    render(
      <DirectionProvider direction="rtl">
        <KeyProbe />
      </DirectionProvider>,
    );
    expect(at("direction")).toBe("rtl");
    expect(at("previous")).toBe("ArrowRight");
    expect(at("next")).toBe("ArrowLeft");
    expect(at("left")).toBe("inline-end");
    expect(at("right")).toBe("inline-start");
  });

  it("leaves the inline axis alone in ltr", () => {
    render(<KeyProbe />);
    expect(at("previous")).toBe("ArrowLeft");
    expect(at("next")).toBe("ArrowRight");
    expect(at("left")).toBe("inline-start");
  });

  it("does not mirror a vertical widget", () => {
    render(
      <DirectionProvider direction="rtl">
        <KeyProbe orientation="vertical" />
      </DirectionProvider>,
    );
    expect(at("previous")).toBe("ArrowUp");
    expect(at("next")).toBe("ArrowDown");
  });

  it("reports nothing for a key that is not an arrow", () => {
    render(<KeyProbe />);
    expect(at("enter")).toBe("-");
  });
});
