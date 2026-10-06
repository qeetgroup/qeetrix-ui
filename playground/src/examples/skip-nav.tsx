import { Badge, SkipNav, SkipNavContent } from "@qeetrix/ui";
import { type MouseEvent, type ReactNode, useId } from "react";
import { invoices } from "../data/qeet";
import { jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, text } from "../registry/types";

/**
 * The skip link's own `#…` jump is handled by the playground's shared in-page link guard (focus
 * moves to the target, as on a real page). The fake header links point at console paths that do
 * not exist, so they are kept inert rather than opened in a new tab.
 */
function InertNavLinks({ children }: { children: ReactNode }) {
  function onClick(event: MouseEvent) {
    const link = (event.target as Element).closest("a[href]");
    if (link && !link.getAttribute("href")?.startsWith("#")) event.preventDefault();
  }
  return (
    <div className="contents" onClickCapture={onClick}>
      {children}
    </div>
  );
}

const navLinks = ["Payments", "Invoices", "Settlements", "Refunds", "Customers"] as const;

/** A miniature Qeet Pay page: header navigation, then the main region the skip link targets. */
function FakePayPage({ label, targetId }: { label?: string; targetId?: string }) {
  const generated = useId();
  const id = targetId || `${generated}-main`;
  return (
    <InertNavLinks>
      <div className="flex h-[300px] w-full flex-col gap-2">
        <p className="text-caption text-muted-foreground">
          Click this line, then press Tab: the skip link appears at the top-left of the page.
        </p>
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-card">
          <SkipNav to={`#${id}`}>{label}</SkipNav>
          <header className="flex items-center gap-4 border-b px-4 py-2 text-sm">
            <span className="font-heading font-medium">Qeet Pay</span>
            <nav aria-label="Primary">
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {navLinks.map((item) => (
                  <li key={item}>
                    <a
                      href={`/pay/${item.toLowerCase()}`}
                      className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:focus-ring"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </header>
          <SkipNavContent
            id={id}
            tabIndex={-1}
            className="flex flex-col gap-2 p-4 text-sm outline-none focus-visible:focus-ring-inset"
          >
            <h3 className="font-heading text-base font-medium">Invoices</h3>
            <ul className="divide-y rounded-md border">
              {invoices.slice(0, 3).map((invoice) => (
                <li
                  key={invoice.number}
                  className="flex items-center justify-between gap-3 px-3 py-1.5"
                >
                  <span className="font-mono">{invoice.number}</span>
                  <Badge
                    variant={invoice.status === "paid" ? "success" : "secondary"}
                    className="capitalize"
                  >
                    {invoice.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </SkipNavContent>
        </div>
      </div>
    </InertNavLinks>
  );
}

const skipControls = {
  children: text("Skip to main content", "Label"),
  to: text("#invoices", "to"),
};

export const examples: FamilyExamples = {
  "skip-nav": {
    framed: true,
    layout: "wide",
    minHeight: 720,
    demos: [
      {
        name: "Focus to reveal",
        description:
          "Visually hidden until it receives keyboard focus as the first stop on the page; Enter moves focus past the navigation to the main region.",
        render: () => <FakePayPage />,
      },
      {
        name: "Custom label and target",
        description:
          "`to` points at any landmark id (here the invoice list); SkipNavContent renders the <main> with that id.",
        render: () => <FakePayPage label="Skip to invoices" />,
      },
    ],
    playground: definePlayground({
      controls: skipControls,
      render: (v) => (
        <div className="w-full max-w-2xl">
          <FakePayPage label={v.children} targetId={v.to.replace(/^#/, "")} />
        </div>
      ),
      code: (v) =>
        [
          jsx(
            "SkipNav",
            { to: v.to === "#main-content" ? undefined : v.to },
            v.children === "Skip to main content" ? [] : v.children,
          ),
          "<Header />",
          jsx(
            "SkipNavContent",
            { id: v.to.replace(/^#/, "") === "main-content" ? undefined : v.to.replace(/^#/, "") },
            "…",
          ),
        ].join("\n"),
    }),
  },
};
