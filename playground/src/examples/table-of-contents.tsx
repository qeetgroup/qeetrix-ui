import { TableOfContents, type TocItem } from "@qeetrix/ui";
import { type MouseEvent, useCallback, useId, useMemo, useRef, useState } from "react";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select } from "../registry/types";

const sections = [
  {
    key: "general",
    label: "General",
    depth: 0,
    body: "Tenant name Acme India Pvt Ltd, primary domain acme.in and the default locale, English (India). Changing the domain re-sends verification to DNS admins.",
  },
  {
    key: "sign-in",
    label: "Sign-in methods",
    depth: 0,
    body: "Choose how members of Acme India authenticate. Passkeys are the default for every new member.",
  },
  {
    key: "passkeys",
    label: "Passkeys",
    depth: 1,
    body: "Synced passkeys (iCloud Keychain, Google Password Manager) and hardware keys are allowed. Attestation is required for Owners and Admins.",
  },
  {
    key: "sso",
    label: "Single sign-on",
    depth: 1,
    body: "SAML with Okta is connected; users from acme.in are redirected to Okta and provisioned by SCIM.",
  },
  {
    key: "sessions",
    label: "Sessions",
    depth: 0,
    body: "Sessions expire after 12 hours, or 30 minutes idle for Admins. Refresh-token reuse revokes the whole session family.",
  },
  {
    key: "residency",
    label: "Data residency",
    depth: 0,
    body: "Identity data is stored in ap-south-1 (Mumbai) with backups in ap-south-2 (Hyderabad), as required by the DPDP Act.",
  },
  {
    key: "danger",
    label: "Danger zone",
    depth: 0,
    body: "Suspend or delete the tenant. Deletion is permanent after a 30-day grace period and removes all 1,842 users.",
  },
] as const;

type SectionKey = (typeof sections)[number]["key"];

function tocItems(prefix: string, nested = true): TocItem[] {
  return sections
    .filter((section) => nested || section.depth === 0)
    .map((section) => ({
      id: `${prefix}-${section.key}`,
      label: section.label,
      depth: nested ? section.depth : 0,
    }));
}

/**
 * A long settings page inside its own scroll container, outline beside the content. The built-in
 * scroll spy observes against the viewport, so inside a container the page drives `activeId`
 * itself; outline clicks scroll the container smoothly instead of the whole gallery page.
 */
function SettingsPage({
  sticky = true,
  nested = true,
  pinned = "auto",
}: {
  sticky?: boolean;
  nested?: boolean;
  pinned?: SectionKey | "auto";
}) {
  const prefix = useId();
  const items = useMemo(() => tocItems(prefix, nested), [prefix, nested]);
  const scroller = useRef<HTMLDivElement>(null);
  const [spied, setSpied] = useState(items[0]?.id);

  const onScroll = useCallback(() => {
    const container = scroller.current;
    if (!container) return;
    const top = container.getBoundingClientRect().top;
    let current = items[0]?.id;
    for (const item of items) {
      const heading = document.getElementById(item.id);
      if (heading && heading.getBoundingClientRect().top - top <= 32) current = item.id;
    }
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 2) {
      current = items[items.length - 1]?.id;
    }
    setSpied(current);
  }, [items]);

  function onNavigate(event: MouseEvent) {
    const link = (event.target as Element).closest("a[href^='#']");
    const container = scroller.current;
    if (!link || !container) return;
    event.preventDefault();
    const heading = document.getElementById(
      decodeURIComponent(link.getAttribute("href")?.slice(1) ?? ""),
    );
    if (!heading) return;
    const offset = heading.getBoundingClientRect().top - container.getBoundingClientRect().top;
    container.scrollTo({ top: container.scrollTop + offset - 20, behavior: "smooth" });
    heading.focus({ preventScroll: true });
  }

  const active =
    pinned === "auto" ? spied : items.find((item) => item.id.endsWith(`-${pinned}`))?.id;

  return (
    <div
      ref={scroller}
      onScroll={onScroll}
      className="h-80 w-full max-w-3xl overflow-y-auto overscroll-contain rounded-lg border"
    >
      <div className="grid gap-8 p-5 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <div className="hidden sm:block" onClickCapture={onNavigate}>
          <TableOfContents items={items} activeId={active} sticky={sticky} />
        </div>
        <div className="flex flex-col gap-6 pb-48">
          {sections.map((section) => {
            const Heading = section.depth === 0 ? "h3" : "h4";
            return (
              <section key={section.key} className="flex flex-col gap-1.5">
                <Heading
                  id={`${prefix}-${section.key}`}
                  tabIndex={-1}
                  className={
                    section.depth === 0
                      ? "font-heading text-base font-medium outline-none"
                      : "text-sm font-medium outline-none"
                  }
                >
                  {section.label}
                </Heading>
                <p className="text-sm text-muted-foreground">{section.body}</p>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** A standalone outline with a pinned active item (its links have no headings to land on). */
function StaticToc({ active, nested }: { active: SectionKey; nested: boolean }) {
  const prefix = useId();
  const items = useMemo(() => tocItems(prefix, nested), [prefix, nested]);
  const activeId = items.find((item) => item.id.endsWith(`-${active}`))?.id ?? items[0]?.id;
  return (
    <div className="w-56">
      <TableOfContents items={items} activeId={activeId} />
    </div>
  );
}

const tocControls = {
  sticky: bool(true, "sticky"),
  nested: bool(true, "Nested items (depth)"),
  activeId: select(
    ["auto", ...sections.map((section) => section.key)] as const,
    "auto",
    "activeId (auto = follow the scroll)",
  ),
};

export const examples: FamilyExamples = {
  "table-of-contents": {
    layout: "wide",
    minHeight: 620,
    demos: [
      {
        name: "Sticky outline",
        description:
          '`sticky` keeps the outline in view while the long settings page scrolls (inside this container here, the viewport on a real page). The current section is highlighted and marked aria-current="location"; in a scroll container, drive `activeId` yourself — the built-in spy watches the viewport.',
        render: () => <SettingsPage />,
      },
      {
        name: "Nested, fixed active item",
        description: "`depth` indents sub-sections; a controlled `activeId` pins the highlight.",
        render: () => <StaticToc active="sso" nested />,
      },
    ],
    playground: definePlayground({
      controls: tocControls,
      render: (v) => (
        <SettingsPage
          key={String(v.nested)}
          sticky={v.sticky}
          nested={v.nested}
          pinned={v.activeId}
        />
      ),
      code: (v) => {
        const items = sections
          .filter((section) => v.nested || section.depth === 0)
          .map((section) =>
            v.nested && section.depth
              ? `{ id: "${section.key}", label: ${JSON.stringify(section.label)}, depth: ${section.depth} }`
              : `{ id: "${section.key}", label: ${JSON.stringify(section.label)} }`,
          );
        return jsx("TableOfContents", {
          items: expr(`[\n    ${items.join(",\n    ")},\n  ]`),
          activeId: v.activeId === "auto" ? undefined : v.activeId,
          sticky: v.sticky,
        });
      },
    }),
  },
};
