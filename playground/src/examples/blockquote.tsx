import { Avatar, AvatarFallback, Blockquote } from "@qeetrix/ui";
import { QuoteIcon } from "lucide-react";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const blockquoteControls = {
  size: select(["sm", "md", "lg"] as const, "md"),
  quote: text(
    "We moved 1,800 people to passkeys in a fortnight. Helpdesk tickets for password resets went to zero.",
    "Quote",
    { multiline: true },
  ),
  attribution: text("Rohan Mehta, Head of Platform, Acme India", "Attribution"),
  icon: bool(true, "Quote icon"),
};

export const examples: FamilyExamples = {
  blockquote: {
    minHeight: 560,
    demos: [
      {
        name: "Testimonial",
        description: "A pull-quote with a leading quote mark and an attribution footer.",
        render: () => (
          <Blockquote
            size="lg"
            className="max-w-md"
            icon={<QuoteIcon aria-hidden className="size-5" />}
            attribution={
              <span className="flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarFallback>RM</AvatarFallback>
                </Avatar>
                Rohan Mehta, Head of Platform, Acme India
              </span>
            }
          >
            <p>
              We moved 1,800 people to passkeys in a fortnight. Helpdesk tickets for password resets
              went to zero.
            </p>
          </Blockquote>
        ),
      },
      {
        name: "Sizes",
        render: () => (
          <div className="flex max-w-md flex-col gap-5">
            <Blockquote size="sm" attribution="sm · captions and asides">
              <p>Settlement reached our HDFC account the next morning, every time.</p>
            </Blockquote>
            <Blockquote attribution="md · the default">
              <p>Settlement reached our HDFC account the next morning, every time.</p>
            </Blockquote>
            <Blockquote size="lg" attribution="lg · landing-page testimonials">
              <p>Settlement reached our HDFC account the next morning, every time.</p>
            </Blockquote>
          </div>
        ),
      },
      {
        name: "Policy excerpt",
        description: "Quoting a tenant's own policy inside an audit finding, with a cited source.",
        render: () => (
          <Blockquote
            size="sm"
            className="max-w-md"
            cite="https://acme.in/policies/access-control"
            attribution={<cite className="not-italic">Acme India access-control policy, §4.2</cite>}
          >
            <p>
              Administrative access to production identity systems must use a phishing-resistant
              authenticator bound to a company-managed device.
            </p>
          </Blockquote>
        ),
      },
    ],
    playground: definePlayground({
      controls: blockquoteControls,
      render: (v) => (
        <Blockquote
          size={v.size}
          className="max-w-md"
          icon={v.icon ? <QuoteIcon aria-hidden className="size-5" /> : undefined}
          attribution={v.attribution || undefined}
        >
          <p>{v.quote}</p>
        </Blockquote>
      ),
      code: (v) =>
        jsx(
          "Blockquote",
          {
            ...changedProps(v, blockquoteControls, ["size"]),
            icon: v.icon ? expr('<QuoteIcon aria-hidden className="size-5" />') : undefined,
            attribution: v.attribution || undefined,
          },
          [`<p>${v.quote}</p>`],
        ),
    }),
  },
};
