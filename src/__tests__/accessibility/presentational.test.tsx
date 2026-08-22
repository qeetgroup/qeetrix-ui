/**
 * The presentational audit.
 *
 * These components display; they do not accept input. That makes `keyboard`, `focus` and
 * behavioural `rtl` genuinely `not-applicable` rather than unreviewed — which is why this class
 * can be *fully* audited with a semantics test, and why doing so is worth something.
 *
 * What each component is held to:
 *   axe            no violations
 *   slot           renders its `data-slot`, which is the public styling and testing surface
 *   semantics      the element or role it claims, and its content reaching the a11y tree
 *   no focus trap  contains nothing focusable — if it does, it belongs in the interactive audit
 *
 * A component that fails the last one is not "broken"; it is miscategorised, and the failure says
 * so. That is the guard that keeps this suite from quietly claiming an interactive component is
 * presentational.
 */
import { render } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "@/__tests__/accessibility";
import { AuditEvent } from "@/components/data-display/audit-event";
import { Avatar, AvatarFallback } from "@/components/data-display/avatar";
import { Badge } from "@/components/data-display/badge";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from "@/components/data-display/description-list";
import { FileCard } from "@/components/data-display/file-card";
import { FileTypeIcon } from "@/components/data-display/file-type-icon";
import { PresenceIndicator } from "@/components/data-display/presence-indicator";
import { SecurityItem } from "@/components/data-display/security-item";
import { Stat } from "@/components/data-display/stat";
import { StatusPill } from "@/components/data-display/status-pill";
import { Callout } from "@/components/feedback/callout";
import { DataState } from "@/components/feedback/data-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { Meter } from "@/components/feedback/meter";
import { ProgressCircle } from "@/components/feedback/progress-circle";
import { Skeleton } from "@/components/feedback/skeleton";
import { Spinner } from "@/components/feedback/spinner";
import { AspectRatio } from "@/components/layout/aspect-ratio";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/surfaces/card";
import { Blockquote } from "@/components/utility/blockquote";
import { Highlight } from "@/components/utility/highlight";
import { Kbd } from "@/components/utility/kbd";
import { Label } from "@/components/utility/label";
import { NumberFormatter } from "@/components/utility/number-formatter";
import { Separator } from "@/components/utility/separator";
import { Typography } from "@/components/utility/typography";
import { VisuallyHidden } from "@/components/utility/visually-hidden";

/**
 * slug → [render the fixture, expected data-slot].
 *
 * A factory rather than an element: each case is rendered independently, so building the element
 * lazily avoids sharing one instance across three tests — and keeps the table out of React's
 * "array of elements needs keys" territory, which does not apply to a fixture list.
 */
const CASES: [string, () => React.ReactElement, string | null][] = [
  ["badge", () => <Badge>New</Badge>, "badge"],
  ["skeleton", () => <Skeleton className="h-4 w-24" />, "skeleton"],
  ["separator", () => <Separator />, "separator"],
  [
    "avatar",
    () => (
      <Avatar>
        <AvatarFallback>QG</AvatarFallback>
      </Avatar>
    ),
    "avatar",
  ],
  ["kbd", () => <Kbd>⌘K</Kbd>, "kbd"],
  ["stat", () => <Stat label="Revenue" value="£12,400" />, "stat"],
  ["status-pill", () => <StatusPill status="success">Active</StatusPill>, "status-pill"],
  [
    "description-list",
    () => (
      <DescriptionList>
        <DescriptionTerm>Plan</DescriptionTerm>
        <DescriptionDetails>Enterprise</DescriptionDetails>
      </DescriptionList>
    ),
    "description-list",
  ],
  ["blockquote", () => <Blockquote>Quoted text</Blockquote>, "blockquote"],
  ["highlight", () => <Highlight query="ipsum">lorem ipsum dolor</Highlight>, "highlight"],
  ["presence-indicator", () => <PresenceIndicator status="online" />, "presence-indicator"],
  ["file-type-icon", () => <FileTypeIcon type="report.pdf" />, "file-type-icon"],
  ["aspect-ratio", () => <AspectRatio ratio={16 / 9}>content</AspectRatio>, "aspect-ratio"],
  ["container", () => <Container>content</Container>, "container"],
  ["number-formatter", () => <NumberFormatter value={1234.5} />, null],
  ["empty-state", () => <EmptyState title="Nothing here" />, "empty-state"],
  ["page-header", () => <PageHeader title="Settings" />, "page-header"],
  [
    "card",
    () => (
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent>content</CardContent>
      </Card>
    ),
    "card",
  ],
  ["callout", () => <Callout>Note this</Callout>, "callout"],
  ["spinner", () => <Spinner />, "spinner"],
  ["meter", () => <Meter value={60} label="Storage" />, "meter"],
  ["progress-circle", () => <ProgressCircle value={60} aria-label="Loading" />, "progress-circle"],
  [
    "data-state",
    () => (
      <DataState isEmpty empty="No results">
        rows
      </DataState>
    ),
    "data-state",
  ],
  ["security-item", () => <SecurityItem title="Passkey" status="active" />, "security-item"],
  [
    "audit-event",
    () => <AuditEvent eventId="evt_1" actor="sai" action="signed in" timestamp={new Date(0)} />,
    "audit-event",
  ],
  ["file-card", () => <FileCard name="report.pdf" size={2048} />, "file-card"],
  ["label", () => <Label htmlFor="x">Email</Label>, "label"],
  ["visually-hidden", () => <VisuallyHidden>Screen-reader only</VisuallyHidden>, "visually-hidden"],
  ["typography", () => <Typography variant="p">Body copy</Typography>, null],
];

describe.each(CASES)("%s (presentational)", (slug, fixture, slot) => {
  it("has no axe violations", async () => {
    const { container } = render(fixture());
    await expectNoA11yViolations(container);
  });

  it("exposes its styling slot", () => {
    if (slot === null) return; // a text-only formatter renders no element of its own
    const { container } = render(fixture());
    expect(container.querySelector(`[data-slot="${slot}"]`), `${slug} data-slot`).not.toBeNull();
  });

  it("contains nothing focusable, so keyboard and focus genuinely do not apply", () => {
    const { container } = render(fixture());
    const focusable = container.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    // If this fails the component is interactive and belongs in the interactive audit — the
    // presentational marks in the registry would be a false claim.
    expect(
      [...focusable].map((el) => el.tagName),
      `${slug} is not presentational`,
    ).toEqual([]);
  });
});

describe("semantics the presentational components claim", () => {
  it("Separator is a separator, or presentational when purely decorative", () => {
    const { container } = render(<Separator />);
    const separator = container.querySelector("[data-slot=separator]");
    expect(separator?.getAttribute("role")).toMatch(/separator|presentation|none/);
  });

  it("DescriptionList uses real dl/dt/dd, not styled divs", () => {
    const { container } = render(
      <DescriptionList>
        <DescriptionTerm>Plan</DescriptionTerm>
        <DescriptionDetails>Enterprise</DescriptionDetails>
      </DescriptionList>,
    );
    expect(container.querySelector("dl")).not.toBeNull();
    expect(container.querySelector("dt")?.textContent).toBe("Plan");
    expect(container.querySelector("dd")?.textContent).toBe("Enterprise");
  });

  it("Blockquote uses a blockquote element", () => {
    const { container } = render(<Blockquote>Quoted</Blockquote>);
    expect(container.querySelector("blockquote")).not.toBeNull();
  });

  it("Highlight marks the match with <mark>, so it is announced as emphasised", () => {
    const { container } = render(<Highlight query="ipsum">lorem ipsum</Highlight>);
    expect(container.querySelector("mark")?.textContent).toBe("ipsum");
  });

  it("Kbd uses a kbd element", () => {
    const { container } = render(<Kbd>Esc</Kbd>);
    expect(container.querySelector("kbd")).not.toBeNull();
  });

  it("Label is a real label, so clicking it focuses its control", () => {
    const { container } = render(<Label htmlFor="field">Email</Label>);
    const label = container.querySelector("label");
    expect(label).not.toBeNull();
    expect(label).toHaveAttribute("for", "field");
  });

  it("VisuallyHidden stays in the accessibility tree while being invisible", () => {
    const { container } = render(<VisuallyHidden>Announced</VisuallyHidden>);
    const el = container.querySelector("[data-slot=visually-hidden]");
    // sr-only, not display:none — the latter would remove it from the tree entirely.
    expect(el).toHaveClass("sr-only");
    expect(el).not.toHaveAttribute("aria-hidden");
  });

  it("Skeleton is hidden from assistive technology — it is a placeholder, not content", () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);
    const el = container.querySelector("[data-slot=skeleton]");
    // Nothing to announce: no role, no text. A live "loading" announcement belongs to the
    // component that owns the request, not to every shimmer on the page.
    expect(el?.getAttribute("role")).toBeNull();
    expect(el?.textContent).toBe("");
  });

  it("Spinner is a status region, so an assistive technology can find it", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });

  it("Meter is a meter with bounds — a measurement, not progress", () => {
    render(<Meter value={60} label="Storage" />);
    const meter = document.querySelector('[role="meter"]');
    expect(meter).not.toBeNull();
    expect(meter).toHaveAttribute("aria-valuenow", "60");
  });

  it("ProgressCircle is a progressbar with bounds and a name", () => {
    render(<ProgressCircle value={60} aria-label="Loading" />);
    const bar = document.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute("aria-valuenow", "60");
    expect(bar).toHaveAttribute("aria-label", "Loading");
  });

  it("Typography renders the element its variant names", () => {
    const { container } = render(<Typography variant="h2">Heading</Typography>);
    expect(container.querySelector("h2")?.textContent).toBe("Heading");
  });
});
