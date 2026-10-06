import { Avatar, AvatarFallback, PresenceIndicator } from "@qeetrix/ui";
import { users } from "../data/qeet";
import { changedProps, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

type Presence = "online" | "away" | "busy" | "offline";

const presenceLabels: Record<Presence, string> = {
  online: "Online",
  away: "Away",
  busy: "Busy — in a meeting",
  offline: "Offline",
};

/** The shape each state is drawn with, so presence never rests on colour alone. */
const presenceShapes: Record<Presence, string> = {
  online: "filled disc",
  away: "crescent",
  busy: "disc with a bar (do not disturb)",
  offline: "hollow ring",
};

/** Deterministic presence for the on-call roster. */
const roster: readonly { userId: string; status: Presence; note: string }[] = [
  { userId: "usr_02", status: "online", note: "On call · qeet-id-server" },
  { userId: "usr_06", status: "busy", note: "Incident bridge INC-2026-1006" },
  { userId: "usr_03", status: "away", note: "Back at 14:00 IST" },
  { userId: "usr_10", status: "offline", note: "Last seen 45 days ago" },
];

const presenceControls = {
  status: select(["online", "away", "busy", "offline"] as const, "online"),
  size: select(["sm", "md", "lg"] as const, "md"),
  pulse: bool(false, "Pulse"),
  label: text("", "Accessible label (empty = status name)"),
};

export const examples: FamilyExamples = {
  "presence-indicator": {
    minHeight: 360,
    demos: [
      {
        name: "Shapes",
        description:
          "Each state has its own shape as well as its colour, so it reads without colour vision.",
        render: () => (
          <ul className="flex flex-col gap-2 text-sm">
            {(Object.keys(presenceLabels) as Presence[]).map((status) => (
              <li key={status} className="flex items-center gap-2">
                <PresenceIndicator status={status} size="lg" label={presenceLabels[status]} />
                <span aria-hidden>{presenceLabels[status]}</span>
                <span aria-hidden className="text-caption text-muted-foreground">
                  · {presenceShapes[status]}
                </span>
              </li>
            ))}
          </ul>
        ),
      },
      {
        name: "On a card",
        description:
          "The ring and the cut-outs use `--presence-surface`; set it to the surface the mark sits on.",
        render: () => (
          <div className="flex w-64 flex-col gap-2 rounded-lg border bg-card p-3 text-sm">
            <span className="text-caption text-muted-foreground">Incident bridge responders</span>
            {roster.slice(0, 3).map((entry) => {
              const member = users.find((u) => u.id === entry.userId);
              if (!member) return null;
              return (
                <div key={entry.userId} className="flex items-center gap-2">
                  <PresenceIndicator
                    status={entry.status}
                    label={presenceLabels[entry.status]}
                    className="[--presence-surface:var(--card)]"
                  />
                  <span>{member.name}</span>
                </div>
              );
            })}
          </div>
        ),
      },
      {
        name: "Sizes",
        render: () => (
          <div className="flex items-center gap-3">
            <PresenceIndicator status="online" size="sm" label="Online (small)" />
            <PresenceIndicator status="online" size="md" label="Online (medium)" />
            <PresenceIndicator status="online" size="lg" label="Online (large)" />
          </div>
        ),
      },
      {
        name: "Pulse",
        description: "A soft pulse for live presence; disabled under reduced motion.",
        render: () => (
          <div className="flex items-center gap-2 text-sm">
            <PresenceIndicator status="online" pulse label="Live" />
            <span aria-hidden>Live — 3 responders on the incident bridge</span>
          </div>
        ),
      },
      {
        name: "On an avatar",
        description: "Position it on the avatar’s bottom-end edge; the ring separates it.",
        render: () => (
          <ul className="flex flex-col gap-3">
            {roster.map((entry) => {
              const member = users.find((u) => u.id === entry.userId);
              if (!member) return null;
              return (
                <li key={entry.userId} className="flex items-center gap-3">
                  <span className="relative inline-flex">
                    <Avatar>
                      <AvatarFallback>{member.initials}</AvatarFallback>
                    </Avatar>
                    <PresenceIndicator
                      status={entry.status}
                      label={`${member.name}: ${presenceLabels[entry.status]}`}
                      className="absolute -end-0.5 -bottom-0.5"
                    />
                  </span>
                  <div className="text-sm">
                    <div className="font-medium">{member.name}</div>
                    <div className="text-caption text-muted-foreground">{entry.note}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        ),
      },
    ],
    playground: definePlayground({
      controls: presenceControls,
      render: (v) => (
        <PresenceIndicator
          status={v.status}
          size={v.size}
          pulse={v.pulse}
          label={v.label || undefined}
        />
      ),
      code: (v) =>
        jsx("PresenceIndicator", {
          status: v.status,
          ...changedProps(v, presenceControls, ["size", "pulse"]),
          label: v.label || undefined,
        }),
    }),
  },
};
