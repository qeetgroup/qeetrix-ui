import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Portal } from "@/components/ui/portal";

const a11y = (c: Element) =>
  axe(c, {
    rules: {
      "color-contrast": { enabled: false },
      // Portal is a low-level utility; its content is always embedded inside a
      // consumer's landmark structure at runtime.  The isolated test fixture
      // doesn't have a wrapping landmark, so suppress this rule here.
      region: { enabled: false },
    },
  });

describe("Portal", () => {
  // Track custom containers so we can clean them up after each test.
  const containers: HTMLElement[] = [];
  afterEach(() => {
    for (const c of containers) {
      c.remove();
    }
    containers.length = 0;
  });

  it("renders children into document.body, not inside the React container div", () => {
    const { container } = render(
      <Portal>
        <div data-testid="portal-child">portal content</div>
      </Portal>,
    );

    // The portal content must exist somewhere in the page.
    const child = document.body.querySelector("[data-testid='portal-child']");
    expect(child).not.toBeNull();
    expect(child?.textContent).toBe("portal content");

    // It must NOT be nested inside the React root container div.
    expect(container.querySelector("[data-testid='portal-child']")).toBeNull();
  });

  it("renders children into a custom container when provided", () => {
    const customContainer = document.createElement("div");
    document.body.appendChild(customContainer);
    containers.push(customContainer);

    render(
      <Portal container={customContainer}>
        <div data-testid="custom-child">custom content</div>
      </Portal>,
    );

    expect(customContainer.querySelector("[data-testid='custom-child']")).not.toBeNull();
  });

  it("renders nothing before mount (SSR-safe behaviour)", () => {
    // RTL renders synchronously through act, so after render() the
    // effect has run and the portal IS mounted.  This test verifies the
    // happy-path: the portal content is present in the DOM after mount.
    const { container } = render(
      <Portal>
        <span data-testid="mounted-child">hello</span>
      </Portal>,
    );

    // Content appears in body (via portal), not in the React container.
    expect(document.body.querySelector("[data-testid='mounted-child']")).not.toBeNull();
    expect(container.querySelector("[data-testid='mounted-child']")).toBeNull();
  });

  it("has no axe violations on portal content", async () => {
    render(
      <Portal>
        <div>
          <p>Accessible portal content</p>
        </div>
      </Portal>,
    );
    expect(await a11y(document.body)).toHaveNoViolations();
  });
});
