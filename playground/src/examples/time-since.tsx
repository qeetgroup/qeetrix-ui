import { Avatar, AvatarFallback, TimeSince } from "@qeetrix/ui";
import { type ComponentProps, useState } from "react";
import { sessions, users } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, num, select } from "../registry/types";

/**
 * TimeSince measures against the real clock, so a fixed sample timestamp would read differently
 * every day. These demos anchor each value to the moment the demo mounted instead: the label is
 * then stable ("12 minutes ago") and still ticks forward live.
 */
function Ago({
  minutes,
  ...props
}: { minutes: number } & Omit<ComponentProps<typeof TimeSince>, "value">) {
  const [mountedAt] = useState(() => Date.now());
  return <TimeSince value={mountedAt - minutes * 60_000} {...props} />;
}

const rohan = users.find((user) => user.id === "usr_02");

const ranges: readonly { id: string; label: string; minutes: number }[] = [
  { id: "now", label: "Passkey assertion verified", minutes: 0.05 },
  { id: "seconds", label: "Webhook delivered", minutes: 0.75 },
  { id: "minutes", label: "Last sign-in", minutes: 12 },
  { id: "hours", label: "API key last used", minutes: 190 },
  { id: "yesterday", label: "SCIM sync", minutes: 1440 },
  { id: "days", label: "Role changed", minutes: 6 * 1440 },
  { id: "absolute", label: "Account created", minutes: 45 * 1440 },
  { id: "future", label: "Session expires", minutes: -120 },
];

const timeSinceControls = {
  minutesAgo: num(12, {
    min: -1440,
    max: 86400,
    step: 1,
    label: "Minutes ago (negative = future)",
  }),
  absoluteAfterDays: num(30, { min: 0, max: 365, label: "Absolute after (days)" }),
  refreshIntervalMs: num(60000, {
    min: 0,
    max: 120000,
    step: 1000,
    label: "Refresh (ms, 0 = off)",
  }),
  locale: select(["browser", "en-IN", "hi-IN", "en-US"] as const, "browser", "Locale"),
  timeZone: select(["browser", "Asia/Kolkata", "UTC"] as const, "browser", "Time zone"),
};

export const examples: FamilyExamples = {
  "time-since": {
    minHeight: 420,
    demos: [
      {
        name: "Last sign-in",
        description: "Hover the time for the absolute timestamp; it renders a `<time>` element.",
        render: () => (
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback>{rohan?.initials}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="font-medium">{rohan?.name}</div>
              <div className="text-caption text-muted-foreground">
                Signed in with a passkey <Ago minutes={12} locale="en-IN" timeZone="Asia/Kolkata" />{" "}
                · {sessions[0]?.location}
              </div>
            </div>
          </div>
        ),
      },
      {
        name: "Ranges",
        description: "Picks the largest whole unit; past 30 days it switches to the date.",
        render: () => (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            {ranges.map((range) => (
              <div key={range.id} className="contents">
                <dt>{range.label}</dt>
                <dd>
                  <Ago minutes={range.minutes} locale="en-IN" timeZone="Asia/Kolkata" />
                </dd>
              </div>
            ))}
          </dl>
        ),
      },
      {
        name: "Live ticking",
        description: "`refreshIntervalMs={1000}` for a feed that should count seconds.",
        render: () => (
          <div className="text-sm">
            Okta SCIM sync started{" "}
            <Ago minutes={0} refreshIntervalMs={1000} locale="en-IN" timeZone="Asia/Kolkata" />
          </div>
        ),
      },
      {
        name: "Locales",
        render: () => (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">en-IN</dt>
            <dd>
              <Ago minutes={95} locale="en-IN" timeZone="Asia/Kolkata" />
            </dd>
            <dt className="text-muted-foreground">hi-IN</dt>
            <dd>
              <Ago minutes={95} locale="hi-IN" timeZone="Asia/Kolkata" />
            </dd>
            <dt className="text-muted-foreground">ta-IN</dt>
            <dd>
              <Ago minutes={95} locale="ta-IN" timeZone="Asia/Kolkata" />
            </dd>
          </dl>
        ),
      },
      {
        name: "Absolute sooner",
        description: "`absoluteAfterDays={7}` shows the date for anything older than a week.",
        render: () => (
          <div className="text-sm">
            Invoice QP-INV-2026-00409 issued{" "}
            <Ago minutes={41 * 1440} absoluteAfterDays={7} locale="en-IN" timeZone="Asia/Kolkata" />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: timeSinceControls,
      render: (v) => (
        <Ago
          minutes={v.minutesAgo}
          absoluteAfterDays={v.absoluteAfterDays}
          refreshIntervalMs={v.refreshIntervalMs}
          locale={v.locale === "browser" ? undefined : v.locale}
          timeZone={v.timeZone === "browser" ? undefined : v.timeZone}
        />
      ),
      code: (v) =>
        jsx("TimeSince", {
          value: expr("session.lastSeen"),
          absoluteAfterDays: v.absoluteAfterDays === 30 ? undefined : v.absoluteAfterDays,
          refreshIntervalMs: v.refreshIntervalMs === 60000 ? undefined : v.refreshIntervalMs,
          locale: v.locale === "browser" ? undefined : v.locale,
          timeZone: v.timeZone === "browser" ? undefined : v.timeZone,
        }),
    }),
  },
};
