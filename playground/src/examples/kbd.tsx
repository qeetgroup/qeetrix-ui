import { SearchIcon } from "@qeetrix/icons";
import { Button, Kbd, KbdGroup } from "@qeetrix/ui";
import { jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, select, text } from "../registry/types";

/** Spoken names for symbol keys; word keys (Esc, Shift, K) need none. */
const spokenNames: Readonly<Record<string, string | undefined>> = {
  "⌘": "Command",
  "⇧": "Shift",
  "⌥": "Option",
  "↵": "Enter",
  "↑": "Up arrow",
  "↓": "Down arrow",
  "/": "Slash",
};

const shortcuts: readonly {
  id: string;
  action: string;
  keys: readonly string[];
  /** Pressed one after another rather than together. */
  sequence?: boolean;
}[] = [
  { id: "palette", action: "Open command palette", keys: ["⌘", "K"] },
  { id: "search", action: "Search logs", keys: ["/"] },
  { id: "tail", action: "Toggle live tail", keys: ["⇧", "L"] },
  { id: "invoices", action: "Go to invoices", keys: ["G", "I"], sequence: true },
  { id: "close", action: "Close panel", keys: ["Esc"] },
];

function Shortcut({ keys, sequence = false }: { keys: readonly string[]; sequence?: boolean }) {
  return (
    <KbdGroup>
      {keys.map((key, index) => (
        <span key={key} className="inline-flex items-center gap-1">
          {index > 0 && sequence && (
            <span className="text-caption text-muted-foreground">then</span>
          )}
          <Kbd label={spokenNames[key]}>{key}</Kbd>
        </span>
      ))}
    </KbdGroup>
  );
}

const kbdControls = {
  keys: text("⌘ ⇧ L", "Keys (space-separated; symbols get a spoken label)"),
  separator: select(["none", "plus", "sequence"] as const, "none", "Between keys"),
};

const separatorText = { none: "", plus: "+", sequence: "then" } as const;

export const examples: FamilyExamples = {
  kbd: {
    minHeight: 280,
    demos: [
      {
        name: "Keys",
        description:
          "Give symbol keys a spoken `label` (⌘ → “Command”); word keys read fine as they are.",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            <Kbd>Esc</Kbd>
            <Kbd>Enter</Kbd>
            <Kbd label="Command">⌘</Kbd>
            <Kbd>Shift</Kbd>
            <Kbd label="Up arrow">↑</Kbd>
            <Kbd label="Slash">/</Kbd>
          </div>
        ),
      },
      {
        name: "Combination",
        render: () => (
          <div className="flex flex-col gap-2 text-sm">
            <KbdGroup>
              <Kbd label="Command">⌘</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <span className="text-caption text-muted-foreground">+</span>
              <Kbd>Shift</Kbd>
              <span className="text-caption text-muted-foreground">+</span>
              <Kbd>L</Kbd>
            </KbdGroup>
          </div>
        ),
      },
      {
        name: "In text",
        render: () => (
          <p className="max-w-xs text-sm text-muted-foreground">
            Press <Kbd label="Slash">/</Kbd> to search logs, or <Kbd>Esc</Kbd> to clear the query.
          </p>
        ),
      },
      {
        name: "In a button",
        render: () => (
          <Button variant="outline" className="w-60 justify-start text-muted-foreground">
            <SearchIcon data-icon="inline-start" aria-hidden />
            Search tenants…
            <KbdGroup className="ms-auto">
              <Kbd label="Command">⌘</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </Button>
        ),
      },
      {
        name: "Shortcut list",
        render: () => (
          <dl className="grid w-72 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 text-sm">
            {shortcuts.map((shortcut) => (
              <div key={shortcut.id} className="contents">
                <dt>{shortcut.action}</dt>
                <dd>
                  <Shortcut keys={shortcut.keys} sequence={shortcut.sequence} />
                </dd>
              </div>
            ))}
          </dl>
        ),
      },
    ],
    playground: definePlayground({
      controls: kbdControls,
      render: (v) => {
        // Keys may repeat ("G G"), so each gets a position-qualified id before rendering.
        const keys = v.keys
          .split(/\s+/)
          .filter(Boolean)
          .map((key, position) => ({ id: `${position}:${key}`, key, first: position === 0 }));
        const separator = separatorText[v.separator];
        const only = keys[0];
        return keys.length === 1 && only ? (
          <Kbd label={spokenNames[only.key]}>{only.key}</Kbd>
        ) : (
          <KbdGroup>
            {keys.map((entry) => (
              <span key={entry.id} className="inline-flex items-center gap-1">
                {!entry.first && separator && (
                  <span className="text-caption text-muted-foreground">{separator}</span>
                )}
                <Kbd label={spokenNames[entry.key]}>{entry.key}</Kbd>
              </span>
            ))}
          </KbdGroup>
        );
      },
      code: (v) => {
        const keys = v.keys.split(/\s+/).filter(Boolean);
        const separator = separatorText[v.separator];
        const kbd = (key: string) => jsx("Kbd", { label: spokenNames[key] }, key);
        if (keys.length === 1) return kbd(keys[0] ?? "");
        return jsx(
          "KbdGroup",
          {},
          keys.flatMap((key, index) => [
            ...(index > 0 && separator
              ? [`<span className="text-caption text-muted-foreground">${separator}</span>`]
              : []),
            kbd(key),
          ]),
        );
      },
    }),
  },
};
