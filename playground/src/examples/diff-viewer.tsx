import { DiffViewer } from "@qeetrix/ui";
import { policyAfter, policyBefore } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, select, text } from "../registry/types";

/** A SCIM attribute mapping edited when Acme India moved its directory to Okta. */
const scimBefore = `userName        <- user.email
name.givenName  <- user.firstName
name.familyName <- user.lastName
title           <- user.title
department      <- user.department
active          <- user.status == "ACTIVE"`;

const scimAfter = `userName        <- user.login
name.givenName  <- user.firstName
name.familyName <- user.lastName
department      <- user.costCenter
active          <- user.status == "ACTIVE"
x-qeet-location <- user.city`;

const BEFORE_LABEL = "admin-mfa v6 · Ananya Iyer, 12 Aug 2026";
const AFTER_LABEL = "admin-mfa v7 · draft";

const diffControls = {
  mode: select(["unified", "split"] as const, "unified"),
  beforeLabel: text(BEFORE_LABEL, "beforeLabel (empty = none)"),
  afterLabel: text(AFTER_LABEL, "afterLabel (empty = none)"),
  before: text(policyBefore, "before", { multiline: true }),
  after: text(policyAfter, "after", { multiline: true }),
};

export const examples: FamilyExamples = {
  "diff-viewer": {
    layout: "wide",
    minHeight: 1600,
    demos: [
      {
        name: "Unified, labelled",
        description:
          "Policy `admin-mfa` v6 → v7: passkeys only, billing admins included, shorter sessions. `beforeLabel` / `afterLabel` add a header naming both versions with the change counts.",
        render: () => (
          <DiffViewer
            before={policyBefore}
            after={policyAfter}
            beforeLabel={BEFORE_LABEL}
            afterLabel={AFTER_LABEL}
          />
        ),
      },
      {
        name: "Split, labelled panes",
        description:
          "Side by side; the labels head each pane. Removed and added lines carry a screen-reader prefix in both modes.",
        render: () => (
          <DiffViewer
            before={policyBefore}
            after={policyAfter}
            mode="split"
            beforeLabel="v6 (live)"
            afterLabel="v7 (draft)"
          />
        ),
      },
      {
        name: "Unlabelled",
        description:
          "Any line-based text diffs — here an Okta → Qeet ID SCIM attribute mapping — with no header.",
        render: () => <DiffViewer before={scimBefore} after={scimAfter} />,
      },
      {
        name: "No changes",
        description: "Identical inputs render every line as context.",
        render: () => (
          <DiffViewer
            before={'{\n  "policy": "session-default",\n  "version": 3\n}'}
            after={'{\n  "policy": "session-default",\n  "version": 3\n}'}
            beforeLabel="session-default v3"
            afterLabel="session-default v3 (re-saved)"
          />
        ),
      },
    ],
    playground: definePlayground({
      controls: diffControls,
      render: (v) => (
        <DiffViewer
          before={v.before}
          after={v.after}
          mode={v.mode}
          beforeLabel={v.beforeLabel || undefined}
          afterLabel={v.afterLabel || undefined}
          className="w-full"
        />
      ),
      code: (v) =>
        jsx("DiffViewer", {
          before: v.before === policyBefore ? expr("policyBefore") : v.before,
          after: v.after === policyAfter ? expr("policyAfter") : v.after,
          mode: v.mode === "unified" ? undefined : v.mode,
          beforeLabel: v.beforeLabel || undefined,
          afterLabel: v.afterLabel || undefined,
        }),
    }),
  },
};
