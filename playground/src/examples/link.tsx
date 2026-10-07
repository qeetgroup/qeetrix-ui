import { ArrowRightIcon } from "@qeetrix/icons";
import { Link } from "@qeetrix/ui";
import type { MouseEvent, ReactNode } from "react";
import { changedProps, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/**
 * Demo links carry real-looking console paths and docs URLs. The playground's shared guard would
 * open them in a new tab; these illustrative destinations do not exist, so clicks stay inert.
 */
function StayOnPage({ children }: { children: ReactNode }) {
  return (
    <div
      className="contents"
      onClickCapture={(event: MouseEvent) => {
        if ((event.target as Element).closest("a[href]")) event.preventDefault();
      }}
    >
      {children}
    </div>
  );
}

const linkControls = {
  children: text("Read the SCIM provisioning guide", "Label"),
  variant: select(["default", "muted", "destructive"] as const, "default"),
  underline: select(
    ["auto", "hover", "always", "none"] as const,
    "auto",
    "underline (auto = by layout)",
  ),
  size: select(["auto", "sm", "md", "lg"] as const, "auto", "size (auto = md, or inherit inline)"),
  inline: bool(false, "inline (in running text)"),
  external: bool(false, "external (new tab + ↗)"),
  disabled: bool(false),
};

export const examples: FamilyExamples = {
  link: {
    demos: [
      {
        name: "Variants",
        description:
          "Default for navigation, muted for secondary links in dense UI, destructive for links that lead to a destructive flow.",
        render: () => (
          <StayOnPage>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link href="/console/audit-log">View audit log</Link>
              <Link href="/console/help" variant="muted">
                Help centre
              </Link>
              <Link href="/console/tenants/tnt_acme/delete" variant="destructive">
                Delete tenant
              </Link>
            </div>
          </StayOnPage>
        ),
      },
      {
        name: "Inline",
        description:
          "`inline` for a link inside running text: it wraps with the sentence, inherits the surrounding size and is underlined at rest, so it never relies on colour alone.",
        render: () => (
          <StayOnPage>
            <p className="max-w-xs text-sm text-muted-foreground">
              Passkeys are now required for Admins on Acme India. Before you enforce them for
              everyone,{" "}
              <Link inline href="/console/policies/admin-mfa">
                review the admin-mfa policy and its exemptions for break-glass accounts
              </Link>
              .
            </p>
          </StayOnPage>
        ),
      },
      {
        name: "External",
        description:
          '`external` opens a new tab with rel="noopener noreferrer", adds the ↗ glyph and announces “(opens in a new tab)”. Works inline too.',
        render: () => (
          <StayOnPage>
            <div className="flex max-w-xs flex-col items-start gap-3">
              <Link external href="https://apis.qeet.in/pay" size="sm">
                Qeet Pay API reference
              </Link>
              <p className="text-sm text-muted-foreground">
                Webhook bodies are signed; see{" "}
                <Link inline external href="https://docs.qeet.in/pay/webhooks#signatures">
                  verifying signatures
                </Link>{" "}
                before going live.
              </p>
            </div>
          </StayOnPage>
        ),
      },
      {
        name: "Disabled",
        description:
          "`disabled` drops the destination and the tab stop but keeps the text discoverable as an unavailable link (aria-disabled).",
        render: () => (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/pay/invoices/QP-INV-2026-00405/send" disabled>
              Send invoice (draft incomplete)
            </Link>
            <Link href="/console/export" variant="muted" size="sm" disabled>
              Export audit log
            </Link>
          </div>
        ),
      },
      {
        name: "Underline",
        render: () => (
          <StayOnPage>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link href="/pay/invoices">On hover (default)</Link>
              <Link href="/pay/invoices" underline="always">
                Always
              </Link>
              <Link href="/pay/invoices" underline="none">
                None
              </Link>
            </div>
          </StayOnPage>
        ),
      },
      {
        name: "Sizes and icons",
        render: () => (
          <StayOnPage>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <Link href="/logs/services" size="sm">
                Small
              </Link>
              <Link href="/logs/services">Medium</Link>
              <Link href="/logs/services" size="lg">
                Large
              </Link>
              <Link href="/notify/templates" size="sm">
                Manage DLT templates
                <ArrowRightIcon className="rtl:rotate-180" aria-hidden />
              </Link>
            </div>
          </StayOnPage>
        ),
      },
    ],
    playground: definePlayground({
      controls: linkControls,
      render: (v) => {
        const link = (
          <Link
            href={v.external ? "https://docs.qeet.in/id/scim" : "/console/settings/scim"}
            variant={v.variant}
            underline={v.underline === "auto" ? undefined : v.underline}
            size={v.size === "auto" ? undefined : v.size}
            inline={v.inline}
            external={v.external}
            disabled={v.disabled}
          >
            {v.children}
          </Link>
        );
        return (
          <StayOnPage>
            {v.inline ? (
              <p className="max-w-xs text-sm text-muted-foreground">
                Users from Okta are created automatically. {link} to map groups to roles.
              </p>
            ) : (
              link
            )}
          </StayOnPage>
        );
      },
      code: (v) =>
        jsx(
          "Link",
          {
            href: v.external ? "https://docs.qeet.in/id/scim" : "/console/settings/scim",
            ...changedProps(v, linkControls, ["variant", "underline", "size"]),
            inline: v.inline,
            external: v.external,
            disabled: v.disabled,
          },
          v.children,
        ),
    }),
  },
};
