import { Prose, Typography } from "@qeetrix/ui";
import { expr, jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, select, text } from "../registry/types";

const variants = [
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "blockquote",
  "lead",
  "large",
  "small",
  "muted",
  "inlineCode",
  "list",
] as const;

type Variant = (typeof variants)[number];

const sampleCopy: Record<Variant, string> = {
  h1: "Identity for every Qeet product",
  h2: "Passkeys, SSO and SCIM",
  h3: "Enforce passkeys for admins",
  h4: "Recovery codes",
  p: "Qeet ID signs people in to Qeet Pay, Qeet Logs and Qeet Notify with one passkey. Tenants keep their data in India, in ap-south-1.",
  blockquote: "Every admin signs in with a phishing-resistant passkey. No exceptions.",
  lead: "Phishing-resistant sign-in for teams across India, without a single password.",
  large: "1,842 users · 4 active sessions",
  small: "Last synced from Okta 4 minutes ago",
  muted: "Tenant ID tnt_acme · region ap-south-1",
  inlineCode: "qk_live_7Hc2…",
  list: "Register a passkey\nConnect Okta over SCIM\nRequire passkeys for admins",
};

/** One variant with its own copy; inline code sits inside a sentence where it belongs. */
function Specimen({ variant, copy }: { variant: Variant; copy: string }) {
  if (variant === "list") {
    return (
      <Typography variant="list">
        {copy.split("\n").map((item) => (
          <li key={item}>{item}</li>
        ))}
      </Typography>
    );
  }
  if (variant === "inlineCode") {
    return (
      <p className="text-sm">
        Rotate the key <Typography variant="inlineCode">{copy}</Typography> before it expires.
      </p>
    );
  }
  return <Typography variant={variant}>{copy}</Typography>;
}

/** A short help article, as markdown would render it. */
function ApiKeyArticle({ size, className }: { size?: "md" | "sm"; className?: string }) {
  return (
    <Prose size={size} className={className}>
      <h2>Rotating API keys</h2>
      <p>
        Create the replacement key first, deploy it, then revoke the old one. Requests signed with a
        revoked key fail with <code>401 key_revoked</code>.
      </p>
      <ul>
        <li>Keys are shown once, at creation.</li>
        <li>
          Scope keys narrowly — <strong>payments:write</strong> only where it is needed.
        </li>
      </ul>
      <blockquote>Never commit a live key to a repository.</blockquote>
    </Prose>
  );
}

const typographyControls = {
  variant: select(variants, "h2"),
  text: text(sampleCopy.h2, "Text (one list item per line)", { multiline: true }),
  as: select(["default", "h1", "h2", "h3", "p", "span", "div"] as const, "default", "Element (as)"),
  truncate: select(["off", "1 line", "2 lines"] as const, "off", "Truncate"),
  component: select(["Typography", "Prose"] as const, "Typography", "Component"),
  proseSize: select(["md", "sm"] as const, "md", "Prose size"),
};

/**
 * Workaround: on the heading and reading variants `text-balance` / `text-pretty` (the
 * `text-wrap` shorthand) resets the `white-space: nowrap` that one-line `truncate` relies on,
 * so the text wraps instead of ending in an ellipsis. `text-nowrap` replaces them in the merge.
 */
const truncateFix = "text-nowrap";

const truncateValue = { off: undefined, "1 line": true, "2 lines": 2 } as const;

export const examples: FamilyExamples = {
  typography: {
    layout: "wide",
    minHeight: 1900,
    demos: [
      {
        name: "Headings",
        description: "h1–h4, each rendering its own heading element by default.",
        render: () => (
          <div className="flex flex-col gap-4">
            {(["h1", "h2", "h3", "h4"] as const).map((variant) => (
              <div key={variant} className="flex flex-col gap-1">
                <span className="font-mono text-caption text-muted-foreground">{variant}</span>
                <Specimen variant={variant} copy={sampleCopy[variant]} />
              </div>
            ))}
          </div>
        ),
      },
      {
        name: "Body and supporting text",
        description: "p, lead, large, small and muted, plus blockquote, inline code and list.",
        render: () => (
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-[8rem_1fr]">
            {(
              ["lead", "p", "large", "small", "muted", "blockquote", "inlineCode", "list"] as const
            ).map((variant) => (
              <div key={variant} className="contents">
                <span className="pt-1 font-mono text-caption text-muted-foreground">{variant}</span>
                <div className="min-w-0">
                  <Specimen variant={variant} copy={sampleCopy[variant]} />
                </div>
              </div>
            ))}
          </div>
        ),
      },
      {
        name: "Overriding the element",
        description:
          "`as` keeps the look but fixes the outline: an h3-sized title that is the page's h2.",
        render: () => (
          <div className="flex flex-col gap-2">
            <Typography variant="h3" as="h2">
              Security policies
            </Typography>
            <Typography variant="muted">
              Rendered as an h2 so the document outline stays in order.
            </Typography>
          </div>
        ),
      },
      {
        name: "Truncation",
        description:
          "`truncate` clips with an ellipsis — `true` for one line, a number to clamp to that many. The full text stays in the DOM for assistive technology.",
        render: () => (
          <div className="flex w-72 flex-col gap-3 rounded-lg border p-3">
            <Typography variant="h4" truncate className={truncateFix}>
              Okta SCIM connector for Acme India Pvt Ltd (production directory)
            </Typography>
            <Typography variant="muted" truncate={2}>
              Provisions joiners from Workday through Okta into Qeet ID within five minutes, and
              suspends leavers the same hour their HR record closes, across all 1,842 users.
            </Typography>
          </div>
        ),
      },
      {
        name: "Prose",
        description:
          "For rendered markdown or rich-text output, `Prose` styles the raw elements inside it and owns the reading rhythm.",
        render: () => <ApiKeyArticle className="max-w-2xl" />,
      },
      {
        name: "Prose, compact",
        description:
          '`size="sm"` sets a fixed 24px line and a heading ladder one step down, for editors, comments and policy previews beside controls.',
        render: () => (
          <div className="max-w-md rounded-lg border bg-card p-4 text-sm">
            <ApiKeyArticle size="sm" />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: typographyControls,
      render: (v) => {
        if (v.component === "Prose") {
          return <ApiKeyArticle size={v.proseSize} className="max-w-xl" />;
        }
        const as = v.as === "default" ? undefined : v.as;
        const truncate = truncateValue[v.truncate];
        if (v.variant === "list") {
          return (
            <Typography variant="list" as={as}>
              {v.text.split("\n").map((item) => (
                <li key={item}>{item}</li>
              ))}
            </Typography>
          );
        }
        return (
          <div className={truncate ? "w-72" : undefined}>
            <Typography
              variant={v.variant}
              as={as}
              truncate={truncate}
              className={truncate === true ? truncateFix : undefined}
            >
              {v.text}
            </Typography>
          </div>
        );
      },
      code: (v) => {
        if (v.component === "Prose") {
          return jsx("Prose", { size: v.proseSize === "md" ? undefined : v.proseSize }, [
            "<h2>Rotating API keys</h2>",
            "<p>Create the replacement key first, deploy it, then revoke the old one.</p>",
          ]);
        }
        const truncate = truncateValue[v.truncate];
        return jsx(
          "Typography",
          {
            variant: v.variant === "p" ? undefined : v.variant,
            as: v.as === "default" ? undefined : v.as,
            truncate: truncate === 2 ? expr("2") : truncate,
          },
          v.variant === "list" ? v.text.split("\n").map((item) => `<li>${item}</li>`) : v.text,
        );
      },
    }),
  },
};
