import { CopyIcon, KeyRoundIcon, RotateCwIcon, TrashIcon } from "@qeetrix/icons";
import { Button, VisuallyHidden } from "@qeetrix/ui";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { apiKeys, users } from "../data/qeet";
import { jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/**
 * The accessible name a screen reader would announce for the button inside: its text content,
 * since the icon is `aria-hidden` and the button has no `aria-label`.
 */
function NameReadout({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  useEffect(() => {
    const button = ref.current?.querySelector("button");
    setName(button?.textContent?.trim() ?? "");
  });
  return (
    <div className="flex flex-col gap-2">
      <div ref={ref}>{children}</div>
      <p className="text-caption text-muted-foreground">
        Accessible name: <code className="text-foreground">“{name}”</code>
      </p>
    </div>
  );
}

const stagingKey = apiKeys[1];

/** Five identical "Reset MFA" buttons, told apart only by their hidden suffix. */
function RepeatedActions() {
  const [focused, setFocused] = useState("Tab to a button to hear its name");
  return (
    <div className="flex w-80 flex-col gap-2">
      <ul className="divide-y rounded-lg border">
        {users.slice(1, 5).map((user) => (
          <li key={user.id} className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="text-sm">{user.name}</span>
            <Button
              size="sm"
              variant="outline"
              onFocus={(event) => setFocused(event.currentTarget.textContent ?? "")}
              onMouseEnter={(event) => setFocused(event.currentTarget.textContent ?? "")}
            >
              Reset MFA<VisuallyHidden> for {user.name}</VisuallyHidden>
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-caption text-muted-foreground">
        Announced: <code className="text-foreground">“{focused}”</code>
      </p>
    </div>
  );
}

const services = [
  { id: "id", name: "Qeet ID sign-in", status: "Operational", dot: "bg-success" },
  { id: "upi", name: "UPI collect", status: "Degraded", dot: "bg-warning" },
  { id: "sms", name: "SMS OTP", status: "Outage", dot: "bg-destructive" },
];

const glyphs = { TrashIcon, RotateCwIcon, CopyIcon, KeyRoundIcon } as const;

const hiddenControls = {
  label: text(`Revoke API key “${stagingKey.name}”`, "Hidden text"),
  icon: select(Object.keys(glyphs) as (keyof typeof glyphs)[], "TrashIcon"),
  reveal: bool(false, "Reveal the hidden text (debug)"),
};

export const examples: FamilyExamples = {
  "visually-hidden": {
    minHeight: 460,
    demos: [
      {
        name: "Icon-only button",
        description:
          "The icon is `aria-hidden`; the visually hidden text gives the button its name.",
        render: () => (
          <NameReadout>
            <Button variant="outline" size="icon">
              <TrashIcon aria-hidden />
              <VisuallyHidden>Revoke API key “{stagingKey.name}”</VisuallyHidden>
            </Button>
          </NameReadout>
        ),
      },
      {
        name: "Context for repeated actions",
        description:
          "Sighted users read each row; screen-reader users hear “Reset MFA for Rohan Mehta” instead of five identical buttons.",
        render: () => <RepeatedActions />,
      },
      {
        name: "Status beyond colour",
        description: "A coloured dot alone fails WCAG 1.4.1; the hidden word carries the status.",
        render: () => (
          <ul className="flex w-72 flex-col gap-2 text-sm">
            {services.map((service) => (
              <li key={service.id} className="flex items-center gap-2">
                <span aria-hidden className={`size-2 rounded-full ${service.dot}`} />
                {service.name}
                <VisuallyHidden>: {service.status}</VisuallyHidden>
              </li>
            ))}
          </ul>
        ),
      },
    ],
    playground: definePlayground({
      controls: hiddenControls,
      render: (v) => {
        const Glyph = glyphs[v.icon];
        return (
          <NameReadout key={`${v.label}-${v.reveal}`}>
            <Button variant="outline" size={v.reveal ? "default" : "icon"}>
              <Glyph aria-hidden />
              <VisuallyHidden className={v.reveal ? "not-sr-only" : undefined}>
                {v.label}
              </VisuallyHidden>
            </Button>
          </NameReadout>
        );
      },
      code: (v) =>
        jsx("Button", { variant: "outline", size: "icon" }, [
          `<${v.icon} aria-hidden />`,
          jsx("VisuallyHidden", {}, v.label),
        ]),
    }),
  },
};
