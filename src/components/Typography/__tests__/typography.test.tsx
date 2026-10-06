import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Prose,
  proseClassName,
  proseVariants,
  Typography,
} from "@/components/Typography/typography";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Typography", () => {
  it("renders the mapped element per variant", () => {
    render(<Typography variant="h2">Section</Typography>);
    expect(screen.getByRole("heading", { level: 2, name: "Section" })).toBeInTheDocument();
  });

  it("supports an element override via `as`", () => {
    render(<Typography as="span">Body</Typography>);
    expect(screen.getByText("Body").tagName).toBe("SPAN");
  });

  it("keeps the look and changes only the level with `as`", () => {
    render(
      <Typography variant="h3" as="h2">
        Members
      </Typography>,
    );
    const heading = screen.getByRole("heading", { level: 2, name: "Members" });
    expect(heading).toHaveAttribute("data-variant", "h3");
  });

  describe("Qeet type roles", () => {
    it("sets headings in Qeet Display, scaling the page title from `sm`", () => {
      render(<Typography variant="h1">Tenant settings</Typography>);
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toHaveClass(
        "font-heading",
        "font-semibold",
        "text-balance",
        "text-2xl/(--qx-typography-title-line-height)",
      );
      expect(h1).toHaveClass("sm:text-title");
    });

    it("sets body copy in Qeet Text at the body role", () => {
      render(<Typography>Members sign in with a passkey.</Typography>);
      expect(screen.getByText(/passkey/)).toHaveClass("font-sans", "text-body");
    });

    it("sets small labels in Qeet UI and inline code in Fira Code, sized in em", () => {
      render(
        <>
          <Typography variant="small">Label</Typography>
          <Typography variant="inlineCode">qeet login</Typography>
        </>,
      );
      expect(screen.getByText("Label")).toHaveClass("font-ui", "text-label");
      expect(screen.getByText("qeet login")).toHaveClass(
        "font-mono",
        "text-(length:--qx-component-typography-code-font-size)",
        "bg-(--qx-component-typography-code-background)",
      );
    });

    it("keeps the role size when a consumer recolours the text", () => {
      // Regression guard: `cn()` once read `text-body` as a colour and dropped it here.
      render(<Typography className="text-muted-foreground">Supporting</Typography>);
      const p = screen.getByText("Supporting");
      expect(p).toHaveClass("text-muted-foreground", "text-body");
    });

    it("never synthesises italics — the Qeet faces ship no italic", () => {
      render(<Typography variant="blockquote">Quoted</Typography>);
      expect(screen.getByText("Quoted")).not.toHaveClass("italic");
    });
  });

  it("carries no outer margins — the layout owns spacing", () => {
    render(
      <div>
        <Typography>First</Typography>
        <Typography>Second</Typography>
        <Typography variant="list">
          <li>Item</li>
        </Typography>
      </div>,
    );
    for (const el of [screen.getByText("Second"), screen.getByRole("list")]) {
      const outerMargins = Array.from(el.classList).filter(
        (c) => /^m[tby]?-/.test(c) || c.startsWith("[&:not(:first-child)]:"),
      );
      expect(outerMargins).toEqual([]);
    }
  });

  describe("truncate", () => {
    it("clips to one line with an ellipsis", () => {
      render(<Typography truncate>Long label</Typography>);
      expect(screen.getByText("Long label")).toHaveClass("truncate");
    });

    it("clamps to a number of lines", () => {
      render(<Typography truncate={3}>Long paragraph</Typography>);
      const p = screen.getByText("Long paragraph");
      expect(p).toHaveClass("line-clamp-(--qx-line-clamp)");
      expect(p.style.getPropertyValue("--qx-line-clamp")).toBe("3");
    });

    it("gives inline variants a box so the ellipsis can apply", () => {
      render(
        <Typography variant="small" truncate>
          Label
        </Typography>,
      );
      expect(screen.getByText("Label")).toHaveClass("truncate", "inline-block", "max-w-full");
    });
  });

  it("has no axe violations", async () => {
    const { container } = render(<Typography variant="p">Paragraph text.</Typography>);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Prose", () => {
  it("styles rendered HTML with the Qeet roles and the link text role", () => {
    expect(proseClassName).toContain("[&_:is(h1,h2,h3,h4)]:font-heading");
    expect(proseClassName).toContain("[&_a]:text-link");
    expect(proseClassName).toContain("[&_a:focus-visible]:focus-ring");
    expect(proseClassName).not.toMatch(/\bitalic\b/);
  });

  it("defaults to the md reading size, which is exactly proseClassName", () => {
    expect(proseVariants()).toBe(proseClassName);
    const { container } = render(<Prose>Body</Prose>);
    expect(container.querySelector('[data-slot="prose"]')).toHaveAttribute("data-size", "md");
  });

  it("offers a compact sm size whose overrides replace, not stack on, the defaults", () => {
    const compact = proseVariants({ size: "sm" }).split(" ");
    // Pre-merged: a string consumer gets one value per property, never both.
    expect(compact).toContain("[&_p]:leading-6");
    expect(compact).not.toContain("[&_p]:leading-relaxed");
    expect(compact).toContain("[&_h1]:text-xl/(--qx-typography-heading-line-height)");
    expect(compact).not.toContain("[&_h1]:text-2xl/(--qx-typography-title-line-height)");
    expect(compact).toContain("[&_h1]:mt-6");
    expect(compact).not.toContain("[&_h1]:mt-8");
    // Everything else is still the shared prose.
    expect(compact).toContain("[&_a]:text-link");

    const { container } = render(<Prose size="sm">Body</Prose>);
    expect(container.querySelector('[data-slot="prose"]')).toHaveAttribute("data-size", "sm");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Prose>
        <h2>Getting started</h2>
        <p>
          Read the <a href="#guide">guide</a> and run <code>qeet login</code>.
        </p>
      </Prose>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Typography truncate on wrapping variants (integration pass)", () => {
  it("drops text-balance / text-pretty so a heading or paragraph really truncates", () => {
    render(
      <>
        <Typography variant="h2" truncate>
          Heading
        </Typography>
        <Typography variant="p" truncate>
          Paragraph
        </Typography>
      </>,
    );
    const heading = screen.getByText("Heading");
    const paragraph = screen.getByText("Paragraph");
    for (const el of [heading, paragraph]) {
      expect(el).toHaveClass("truncate", "text-nowrap");
      expect(el.className).not.toMatch(/\btext-(balance|pretty)\b/);
    }
  });
});
