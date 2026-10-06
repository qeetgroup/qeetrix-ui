import { Avatar, AvatarFallback, OrgChart, type OrgNode, StatusPill } from "@qeetrix/ui";
import { type User, users } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

/** Acme India reporting lines, built from the shared Qeet ID users. */
const byId = new Map(users.map((user) => [user.id, user]));

const titles: Record<string, string> = {
  usr_01: "Chief Executive Officer",
  usr_02: "Head of Platform",
  usr_03: "Staff Engineer, Identity",
  usr_06: "Engineer, Payments",
  usr_10: "Data Engineer",
  usr_04: "Financial Controller",
  usr_11: "Billing Operations Lead",
  usr_05: "Risk & Compliance Analyst",
  usr_08: "IT Administrator",
  usr_09: "Customer Success Manager",
};

const reports: Record<string, string[]> = {
  usr_01: ["usr_02", "usr_04", "usr_08"],
  usr_02: ["usr_03", "usr_06", "usr_10"],
  usr_04: ["usr_11", "usr_05"],
  usr_08: ["usr_09"],
};

function person(id: string): User {
  const found = byId.get(id);
  if (!found) throw new Error(`Unknown user ${id}`);
  return found;
}

function orgNode(id: string, depth = Number.POSITIVE_INFINITY): OrgNode {
  const user = person(id);
  const children = depth > 0 ? (reports[id] ?? []).map((child) => orgNode(child, depth - 1)) : [];
  return {
    id,
    label: user.name,
    sublabel: titles[id] ?? user.role,
    children: children.length ? children : undefined,
  };
}

const acmeIndia = orgNode("usr_01");
const financeTeam = orgNode("usr_04");

function PersonCard({ node }: { node: OrgNode }) {
  const user = person(node.id);
  return (
    <div className="flex min-w-44 items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-start shadow-rest">
      <Avatar size="sm">
        <AvatarFallback>{user.initials}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-medium text-foreground">{node.label}</span>
        <span className="text-caption text-muted-foreground">
          {node.sublabel} · {user.location}
        </span>
        {user.status !== "active" && (
          <StatusPill status={user.status} className="mt-1 self-start" />
        )}
      </div>
    </div>
  );
}

const people = ["none", "usr_01", "usr_02", "usr_04", "usr_08"] as const;

const orgControls = {
  custom: bool(false, "Custom node cards (renderNode)"),
  initialOpenDepth: num(2, { min: 0, max: 3, step: 1, label: "initialOpenDepth (3 = all)" }),
  highlightedId: select(people, "none", "highlightedId"),
  label: text("Ananya Iyer", "Root label"),
  sublabel: text("Chief Executive Officer", "Root sublabel"),
};

export const examples: FamilyExamples = {
  "org-chart": {
    layout: "wide",
    minHeight: 1500,
    demos: [
      {
        name: "Reporting lines",
        description:
          "Default node cards (label + sublabel). Each manager has a toggle that collapses their branch.",
        render: () => <OrgChart data={acmeIndia} />,
      },
      {
        name: "Custom nodes",
        description:
          "`renderNode` draws each person with an avatar, title and location; pending members are flagged.",
        render: () => (
          <OrgChart data={financeTeam} renderNode={(node) => <PersonCard node={node} />} />
        ),
      },
      {
        name: "Opened a level at a time, with a highlight",
        description:
          "`initialOpenDepth={1}` shows the CEO and direct reports; each collapsed branch says how many people it folds away. `highlightedId` marks the signed-in person (Rohan Mehta).",
        render: () => <OrgChart data={acmeIndia} initialOpenDepth={1} highlightedId="usr_02" />,
      },
      {
        name: "Single node",
        description: "A leaf has no collapse toggle.",
        render: () => (
          <OrgChart
            data={{ id: "usr_09", label: "Neha Joshi", sublabel: "Customer Success Manager" }}
          />
        ),
      },
    ],
    playground: definePlayground({
      controls: orgControls,
      render: (v) => (
        <div className="w-full">
          <OrgChart
            key={v.initialOpenDepth}
            data={{ ...acmeIndia, label: v.label, sublabel: v.sublabel }}
            initialOpenDepth={v.initialOpenDepth >= 3 ? undefined : v.initialOpenDepth}
            highlightedId={v.highlightedId === "none" ? undefined : v.highlightedId}
            renderNode={v.custom ? (node) => <PersonCard node={node} /> : undefined}
          />
        </div>
      ),
      code: (v) =>
        [
          "const data: OrgNode = {",
          '  id: "usr_01",',
          `  label: ${JSON.stringify(v.label)},`,
          `  sublabel: ${JSON.stringify(v.sublabel)},`,
          "  children: [",
          '    { id: "usr_02", label: "Rohan Mehta", sublabel: "Head of Platform" },',
          '    { id: "usr_04", label: "Vikram Singh", sublabel: "Financial Controller" },',
          '    { id: "usr_08", label: "Sanjay Gupta", sublabel: "IT Administrator" },',
          "  ],",
          "};",
          "",
          jsx("OrgChart", {
            data: expr("data"),
            initialOpenDepth: v.initialOpenDepth >= 3 ? undefined : v.initialOpenDepth,
            highlightedId: v.highlightedId === "none" ? undefined : v.highlightedId,
            renderNode: v.custom ? expr("(node) => <PersonCard node={node} />") : undefined,
          }),
        ].join("\n"),
    }),
  },
};
