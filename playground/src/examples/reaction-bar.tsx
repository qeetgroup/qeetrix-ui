import { type Reaction, ReactionBar } from "@qeetrix/ui";
import { useState } from "react";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num } from "../registry/types";

const INCIDENT_CHOICES = ["✅", "👀", "🚨", "🙏", "🔥", "🛠️", "📈", "🎉", "❓", "👍"];

const ME = "You";

/** Toggle the viewer's reaction, keeping `users` (who reacted) in step with the count. */
function toggle(reactions: Reaction[], emoji: string): Reaction[] {
  const existing = reactions.find((reaction) => reaction.emoji === emoji);
  if (!existing) return [...reactions, { emoji, count: 1, reacted: true, users: [ME] }];
  return reactions
    .map((reaction) =>
      reaction.emoji === emoji
        ? {
            ...reaction,
            reacted: !reaction.reacted,
            count: reaction.count + (reaction.reacted ? -1 : 1),
            users: reaction.reacted
              ? reaction.users?.filter((name) => name !== ME)
              : [ME, ...(reaction.users ?? [])],
          }
        : reaction,
    )
    .filter((reaction) => reaction.count > 0);
}

function LiveReactions({
  initial,
  choices,
  label,
  readOnly,
  disabled,
  locale,
}: {
  initial: Reaction[];
  choices?: string[];
  label: string;
  readOnly?: boolean;
  disabled?: boolean;
  locale?: string;
}) {
  const [reactions, setReactions] = useState(initial);
  return (
    <ReactionBar
      aria-label={label}
      reactions={reactions}
      choices={choices}
      readOnly={readOnly}
      disabled={disabled}
      locale={locale}
      onToggle={(emoji) => setReactions((current) => toggle(current, emoji))}
    />
  );
}

function Message({ author, children }: { author: string; children: string }) {
  return (
    <p className="text-sm">
      <span className="font-medium text-foreground">{author}</span>{" "}
      <span className="text-muted-foreground">{children}</span>
    </p>
  );
}

const reactionControls = {
  count: num(4, { min: 1, max: 1500, step: 1, label: "👍 count" }),
  reacted: bool(true, "You reacted 👍"),
  incident: bool(false, "Incident emoji set (choices)"),
  readOnly: bool(false, "readOnly"),
  disabled: bool(false, "disabled"),
};

export const examples: FamilyExamples = {
  "reaction-bar": {
    demos: [
      {
        name: "Default",
        description:
          "Click a pill to toggle your reaction (aria-pressed); the smile button opens the picker.",
        render: () => (
          <div className="flex max-w-sm flex-col gap-2">
            <Message author="Divya Menon">
              Settlement for 5 Oct landed in the HDFC account — ₹13,86,500 reconciled.
            </Message>
            <LiveReactions
              label="Reactions to Divya Menon's message"
              initial={[
                {
                  emoji: "🎉",
                  label: "party popper",
                  count: 6,
                  reacted: true,
                  users: [
                    ME,
                    "Vikram Singh",
                    "Ananya Iyer",
                    "Rohan Mehta",
                    "Neha Joshi",
                    "Arjun Reddy",
                  ],
                },
                {
                  emoji: "👍",
                  label: "thumbs up",
                  count: 3,
                  users: ["Sanjay Gupta", "Priya Nair", "Kavya Sharma"],
                },
                { emoji: "🙏", label: "folded hands", count: 1, users: ["Vikram Singh"] },
              ]}
            />
          </div>
        ),
      },
      {
        name: "Custom choices",
        description: "An on-call channel offers incident-flavoured emoji instead of the defaults.",
        render: () => (
          <div className="flex max-w-sm flex-col gap-2">
            <Message author="notify-worker">
              DLT template otp_login_v3 rejected by the SMS provider (DLT-4041).
            </Message>
            <LiveReactions
              label="Reactions to the notify-worker alert"
              choices={INCIDENT_CHOICES}
              initial={[
                {
                  emoji: "👀",
                  label: "eyes",
                  count: 2,
                  reacted: true,
                  users: [ME, "Priya Nair"],
                },
                { emoji: "🚨", label: "police light", count: 1, users: ["Sanjay Gupta"] },
              ]}
            />
          </div>
        ),
      },
      {
        name: "Read-only",
        description:
          "`readOnly` shows the counts on an archived thread: no picker, and the pills are not buttons.",
        render: () => (
          <div className="flex max-w-sm flex-col gap-2">
            <Message author="Ananya Iyer">Q2 access review closed — 41 grants revoked.</Message>
            <ReactionBar
              readOnly
              reactions={[
                { emoji: "✅", label: "check mark", count: 12 },
                { emoji: "🙏", label: "folded hands", count: 4 },
              ]}
            />
          </div>
        ),
      },
      {
        name: "Large counts",
        description:
          "Counts of 1,000 and up are shown compact for the `locale` (1.3K); the full number is still in the accessible name.",
        render: () => (
          <div className="flex max-w-sm flex-col gap-2">
            <Message author="Qeet ID">
              Passkey-only sign-in is now available to every tenant.
            </Message>
            <LiveReactions
              label="Reactions to the passkey-only announcement"
              locale="en-IN"
              initial={[
                { emoji: "🎉", label: "party popper", count: 1280 },
                { emoji: "👍", label: "thumbs up", count: 4612, reacted: true, users: [ME] },
                { emoji: "🔥", label: "fire", count: 37 },
              ]}
            />
          </div>
        ),
      },
      {
        name: "Disabled",
        description: "`disabled` while a toggle is being saved.",
        render: () => (
          <ReactionBar
            disabled
            reactions={[
              { emoji: "👍", label: "thumbs up", count: 3, reacted: true },
              { emoji: "👀", label: "eyes", count: 1 },
            ]}
          />
        ),
      },
      {
        name: "No reactions yet",
        render: () => (
          <div className="flex max-w-sm flex-col gap-2">
            <Message author="Rohan Mehta">Passkeys are now required for every admin.</Message>
            <LiveReactions label="Reactions to Rohan Mehta's message" initial={[]} />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: reactionControls,
      render: (v) => (
        <LiveReactions
          key={`${v.count}-${v.reacted}`}
          label="Reactions to the settlement update"
          choices={v.incident ? INCIDENT_CHOICES : undefined}
          readOnly={v.readOnly}
          disabled={v.disabled}
          initial={[
            {
              emoji: "👍",
              label: "thumbs up",
              count: v.count,
              reacted: v.reacted,
              users: v.reacted
                ? [ME, "Divya Menon", "Rohan Mehta"]
                : ["Divya Menon", "Rohan Mehta"],
            },
            { emoji: "🎉", label: "party popper", count: 2, users: ["Vikram Singh", "Neha Joshi"] },
          ]}
        />
      ),
      code: (v) =>
        jsx("ReactionBar", {
          "aria-label": "Reactions to the settlement update",
          reactions: expr(
            `[\n  { emoji: "👍", label: "thumbs up", count: ${v.count}${v.reacted ? ", reacted: true" : ""}, users: ["Divya Menon", "Rohan Mehta"] },\n  { emoji: "🎉", label: "party popper", count: 2 },\n]`,
          ),
          onToggle: v.readOnly ? undefined : expr("(emoji) => toggleReaction(emoji)"),
          choices: v.incident ? expr('["✅", "👀", "🚨", "🙏", "🔥"]') : undefined,
          readOnly: v.readOnly,
          disabled: v.disabled,
        }),
    }),
  },
};
