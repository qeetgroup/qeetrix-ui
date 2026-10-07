/**
 * AccessReview — a Qeetrix block. Copy this file into your app and adapt it: it is built only from
 * the public `@qeetrix/ui` and `@qeetrix/icons` APIs, and is not part of the published package.
 */
"use client";

import {
  BanIcon,
  CheckIcon,
  CircleCheckIcon,
  LightbulbIcon,
  LockIcon,
  Undo2Icon,
} from "@qeetrix/icons";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Checkbox,
  cn,
  EmptyState,
  type MessageOverrides,
  resolveMessages,
  Spinner,
  StatusPill,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useControllableState,
} from "@qeetrix/ui";
import * as React from "react";

/** English defaults; pass `messages` to override any of them per instance. */
const accessReviewMessages = {
  /** Accessible name of the table, when no `aria-label` is given. */
  label: "Access review",
  /** Shown when there are no items, when no `emptyMessage` is given. */
  empty: "No access assignments.",
  subjectHeader: "Subject",
  accessHeader: "Access",
  scopeHeader: "Scope",
  stateHeader: "State",
  riskHeader: "Risk",
  evidenceHeader: "Evidence",
  decisionHeader: "Decision",
  actionsHeader: "Actions",
  /** The scope cell when an item has no `scope`. */
  allScopes: "All scopes",
  state: (state: "granted" | "denied" | "mixed" | "pending") =>
    ({ granted: "Granted", denied: "Denied", mixed: "Mixed", pending: "Pending" })[state],
  inherited: "Inherited",
  locked: "Locked",
  risk: (risk: "low" | "medium" | "high" | "critical") =>
    ({ low: "Low", medium: "Medium", high: "High", critical: "Critical" })[risk],
  /** Accessible name of the risk indicator, which shows the level as a word and a bar meter. */
  riskLevel: (risk: string) => `${risk} risk`,
  recommendation: (verdict: "approved" | "revoked") =>
    verdict === "approved" ? "Suggested: approve" : "Suggested: revoke",
  approve: "Approve",
  revoke: "Revoke",
  undo: "Undo",
  approved: "Approved",
  revoked: "Revoked",
  /** Row-level accessible names; `subject` is empty when the item has none. */
  approveItem: (access: string, subject: string) =>
    subject ? `Approve ${access} for ${subject}` : `Approve ${access}`,
  revokeItem: (access: string, subject: string) =>
    subject ? `Revoke ${access} for ${subject}` : `Revoke ${access}`,
  undoItem: (access: string, subject: string) =>
    subject ? `Undo decision on ${access} for ${subject}` : `Undo decision on ${access}`,
  selectItem: (access: string, subject: string) =>
    subject ? `Select ${access} for ${subject}` : `Select ${access}`,
  selectAll: "Select all",
  /** Announced while a decision is being saved. */
  saving: "Saving decision",
  /** Accessible name of the bulk-review bar. */
  bulkLabel: "Bulk review",
  bulkHint: "Select entries to approve or revoke them together.",
  selectedCount: (count: number) => `${count} selected`,
  approveSelected: (count: number) => `Approve ${count}`,
  revokeSelected: (count: number) => `Revoke ${count}`,
  clearSelection: "Clear selection",
};
type AccessReviewMessages = typeof accessReviewMessages;

/** The current state of a permission assignment, as the caller's policy engine resolved it. */
type AccessReviewState = "granted" | "denied" | "mixed" | "pending";
/** Assignment intent: what `onStateChange` asks the caller to make true. */
type AccessReviewDecision = "granted" | "denied";
/**
 * A reviewer's certification decision on an existing grant — keep it, or take it away. Distinct
 * from `AccessReviewDecision`, which edits an assignment rather than certifying one.
 */
type AccessReviewVerdict = "approved" | "revoked";
/** How much harm the grant could do if it were wrong. Always rendered with a text label. */
type AccessReviewRisk = "low" | "medium" | "high" | "critical";

/** Who holds the access under review — a person, a group or a workload identity. */
interface AccessReviewSubject {
  name: string;
  /** Secondary identity line: an email, a service-account ID, a group's member count. */
  detail?: React.ReactNode;
  avatarUrl?: string;
}

/** One fact a reviewer decides on: "Last used · 94 days ago", "Granted by · SCIM (Okta)". */
interface AccessReviewEvidence {
  label: React.ReactNode;
  value: React.ReactNode;
}

interface AccessReviewItem {
  id: string;
  /** The permission, role or entitlement — "Billing admin", "members.manage". */
  label: string;
  description?: React.ReactNode;
  state: AccessReviewState;
  scope?: React.ReactNode;
  inherited?: boolean;
  /** Cannot be changed here: no grant toggle, no review decision, not selectable. */
  locked?: boolean;
  /** The holder of the access. Adds a Subject column, which becomes the row header. */
  subject?: AccessReviewSubject;
  /** What the permission applies to — a workspace, a project, an environment. */
  resource?: React.ReactNode;
  /** Adds a Risk column. */
  risk?: AccessReviewRisk;
  /** Why the risk is what it is — "Admin on production, unused for 94 days". */
  riskReason?: React.ReactNode;
  /** Adds an Evidence column. */
  evidence?: AccessReviewEvidence[];
  /** A suggested decision (from sign-in activity, peer analysis…), shown with the evidence. */
  recommendation?: AccessReviewVerdict;
  /**
   * The decision already recorded for this row; `null` means undecided. Any item with a
   * `decision` key — or an `onDecisionChange` handler — puts the review in certification mode.
   */
  decision?: AccessReviewVerdict | null;
}

interface AccessReviewProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  items: AccessReviewItem[];
  /** Assignment mode: emits grant/deny intent from each row's checkbox. */
  onStateChange?: (id: string, state: AccessReviewDecision) => void;
  renderActions?: (item: AccessReviewItem) => React.ReactNode;
  emptyMessage?: React.ReactNode;
  "aria-label"?: string;
  /**
   * Certification mode: emits approve / revoke intent — for one row, or for the selection in
   * bulk — and `null` when a decision is undone. The caller records it and passes it back as
   * each item's `decision`; nothing is applied until the caller says so.
   */
  onDecisionChange?: (ids: string[], decision: AccessReviewVerdict | null) => void;
  /** Adds a selection column and the bulk-review bar. */
  selectable?: boolean;
  /** Controlled selection. */
  selectedIds?: string[];
  /** Initial selection when uncontrolled. */
  defaultSelectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  /** Extra bulk actions for the current selection — "Reassign", "Export evidence". */
  bulkActions?: (selectedIds: string[]) => React.ReactNode;
  /** Rows whose decision is being saved: their controls are disabled and show progress. */
  pendingIds?: string[];
  /** Overrides for this component's built-in English strings, per key. */
  messages?: MessageOverrides<AccessReviewMessages>;
}

/*
 * Explicit table roles. Below the stacking breakpoint the rows are re-laid-out as cards with
 * CSS `display`, and WebKit drops native table semantics from elements whose display changes.
 * Restating the roles keeps the table — headers and all — in the accessibility tree at every
 * width. Spread from a constant because the roles are deliberate, not redundant.
 */
const ROLE = {
  table: { role: "table" },
  rowgroup: { role: "rowgroup" },
  row: { role: "row" },
  columnheader: { role: "columnheader" },
  rowheader: { role: "rowheader" },
  cell: { role: "cell" },
} as const;

/*
 * Stacked (card) layout below a container width. Certification tables are wider, so they
 * stack earlier. Every class is spelled out in full so Tailwind can see it.
 */
const STACK = {
  review: {
    head: "@max-3xl:sr-only",
    row: "@max-3xl:relative @max-3xl:flex @max-3xl:flex-col @max-3xl:gap-2 @max-3xl:px-4 @max-3xl:py-3 @max-3xl:[&>:first-child]:before:hidden @max-3xl:data-[state=selected]:before:absolute @max-3xl:data-[state=selected]:before:inset-y-0 @max-3xl:data-[state=selected]:before:start-0 @max-3xl:data-[state=selected]:before:w-0.5 @max-3xl:data-[state=selected]:before:bg-border-brand",
    rowSelectable: "@max-3xl:ps-12",
    cell: "@max-3xl:block @max-3xl:min-w-0 @max-3xl:p-0 @max-3xl:whitespace-normal",
    // Important: Table makes a selected row's first cell `relative` for its indicator bar, with
    // a more specific selector; in the stacked layout the checkbox must stay pinned.
    select: "@max-3xl:absolute! @max-3xl:top-3 @max-3xl:start-4 @max-3xl:p-0",
    label: "hidden @max-3xl:block",
    end: "@max-3xl:text-start",
  },
  assignment: {
    head: "@max-xl:sr-only",
    row: "@max-xl:relative @max-xl:flex @max-xl:flex-col @max-xl:gap-2 @max-xl:px-4 @max-xl:py-3 @max-xl:[&>:first-child]:before:hidden @max-xl:data-[state=selected]:before:absolute @max-xl:data-[state=selected]:before:inset-y-0 @max-xl:data-[state=selected]:before:start-0 @max-xl:data-[state=selected]:before:w-0.5 @max-xl:data-[state=selected]:before:bg-border-brand",
    rowSelectable: "@max-xl:ps-12",
    cell: "@max-xl:block @max-xl:min-w-0 @max-xl:p-0 @max-xl:whitespace-normal",
    select: "@max-xl:absolute! @max-xl:top-3 @max-xl:start-4 @max-xl:p-0",
    label: "hidden @max-xl:block",
    end: "@max-xl:text-start",
  },
} as const;

/** Cells wrap; Table's cells are single-line by default for numeric data. */
const CELL = "py-[var(--qx-control-cell-padding-y)] align-top whitespace-normal";

const RISK_STYLE: Record<AccessReviewRisk, { text: string; bar: string; level: number }> = {
  low: { text: "text-muted-foreground", bar: "bg-muted-foreground", level: 1 },
  medium: { text: "text-warning-text", bar: "bg-warning", level: 2 },
  high: { text: "text-destructive-text", bar: "bg-destructive", level: 3 },
  critical: {
    text: "rounded-(--qx-corner-chip) bg-destructive-subtle px-1.5 py-0.5 text-destructive-text",
    bar: "bg-destructive",
    level: 3,
  },
};

/**
 * The risk level as a word plus a three-bar meter. The bars encode magnitude by count and
 * height, so the level survives without colour; the word survives without the bars.
 */
function RiskIndicator({
  risk,
  reason,
  messages,
}: {
  risk: AccessReviewRisk;
  reason?: React.ReactNode;
  messages: AccessReviewMessages;
}) {
  const style = RISK_STYLE[risk];
  const word = messages.risk(risk);
  return (
    <div data-slot="access-review-risk" data-risk={risk} className="space-y-1">
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", style.text)}>
        <span aria-hidden className="flex h-3 items-end gap-0.5">
          {[1, 2, 3].map((bar) => (
            <span
              key={bar}
              className={cn(
                // Forced colours would flatten filled and empty bars into one system colour and
                // lose the level, so the meter paints its own: text colour filled, grey empty.
                "w-1 rounded-full forced-color-adjust-none",
                bar === 1 ? "h-1.5" : bar === 2 ? "h-2.25" : "h-3",
                bar <= style.level
                  ? cn(style.bar, "forced-colors:bg-[CanvasText]")
                  : "bg-border forced-colors:bg-[GrayText]",
              )}
            />
          ))}
        </span>
        <span aria-hidden>{word}</span>
        {/* The visible word alone is ambiguous outside table navigation ("High"). */}
        <span className="sr-only">{messages.riskLevel(word)}</span>
      </span>
      {reason && <div className="text-xs text-muted-foreground">{reason}</div>}
    </div>
  );
}

/** Inherited / locked / non-granted state, as tags. */
function StateTags({
  item,
  messages,
  includeGranted,
}: {
  item: AccessReviewItem;
  messages: AccessReviewMessages;
  includeGranted: boolean;
}) {
  // "Denied" is the absence of access, not a failure, so it reads as muted rather than red.
  const kind = {
    granted: "success",
    denied: "muted",
    mixed: "info",
    pending: "warning",
  } as const;
  const showState = includeGranted || item.state !== "granted";
  if (!showState && !item.inherited && !item.locked) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {showState && <StatusPill kind={kind[item.state]}>{messages.state(item.state)}</StatusPill>}
      {item.inherited && (
        <StatusPill kind="neutral" dot={false}>
          {messages.inherited}
        </StatusPill>
      )}
      {item.locked && (
        <StatusPill kind="muted" dot={false} className="gap-1">
          <LockIcon aria-hidden className="size-3" />
          {messages.locked}
        </StatusPill>
      )}
    </div>
  );
}

/**
 * Product-neutral access surface for identity and security consoles, in two modes:
 *
 * - **Assignment** (default): each row's checkbox is the grant itself, and `onStateChange`
 *   emits grant / deny intent. Columns: Access · Scope · State · Actions.
 * - **Certification**: set `onDecisionChange` (or give items a `decision`). Each row is an
 *   existing grant a reviewer approves or revokes, with the evidence to decide on. Columns
 *   appear as the data does: Subject (when items have a `subject`), Access, Risk, Evidence,
 *   Decision, Actions. `selectable` adds bulk review.
 *
 * Revoke is the destructive path and is always visibly destructive — red text on the row,
 * the destructive button in the bulk bar, the count in the label — and always reversible
 * here: a recorded decision shows its outcome with an Undo, because nothing is applied until
 * the caller submits the review.
 *
 * Below a container width (36rem for assignment, 48rem for certification) rows re-flow into
 * cards, with explicit table roles so assistive technology still reads a table.
 *
 * The caller owns role definitions, inheritance resolution, authorization policy, risk
 * scoring and persistence; Qeetrix renders the resulting state and emits intent only.
 */
function AccessReview({
  items,
  onStateChange,
  renderActions,
  emptyMessage,
  "aria-label": ariaLabel,
  onDecisionChange,
  selectable = false,
  selectedIds,
  defaultSelectedIds,
  onSelectedIdsChange,
  bulkActions,
  pendingIds,
  messages: messageOverrides,
  className,
  ...props
}: AccessReviewProps) {
  const messages = React.useMemo(
    () => resolveMessages(accessReviewMessages, messageOverrides),
    [messageOverrides],
  );
  const baseId = React.useId().replace(/:/g, "");
  const [selection, setSelection] = useControllableState<string[]>({
    value: selectedIds,
    defaultValue: () => defaultSelectedIds ?? [],
    onChange: onSelectedIdsChange,
  });

  const certifying = onDecisionChange != null || items.some((item) => "decision" in item);
  const hasSubject = items.some((item) => item.subject);
  const hasRisk = items.some((item) => item.risk);
  const hasEvidence = items.some((item) => item.evidence?.length || item.recommendation);
  const stack = certifying ? STACK.review : STACK.assignment;
  const pending = new Set(pendingIds);
  const selectableIds = items.filter((item) => !item.locked).map((item) => item.id);
  const selectableSet = new Set(selectableIds);
  // A selection can outlive its rows (filtered away, now locked); only live, decidable rows count.
  const selected = new Set(selection.filter((id) => selectableSet.has(id)));
  const allSelected = selectableIds.length > 0 && selected.size === selectableIds.length;

  const toggleRow = (id: string, checked: boolean) => {
    setSelection((previous) =>
      checked
        ? [...previous.filter((value) => value !== id), id]
        : previous.filter((v) => v !== id),
    );
  };
  const decide = (ids: string[], decision: AccessReviewVerdict | null) => {
    if (ids.length === 0) return;
    onDecisionChange?.(ids, decision);
  };

  if (items.length === 0) {
    return (
      <div
        data-slot="access-review"
        className={cn(
          "w-full rounded-(--qx-corner-surface) border border-border bg-card",
          className,
        )}
        {...props}
      >
        {/* A string becomes the house EmptyState; a node (an EmptyState with an action, say) is
            rendered as given — never inside a <p>, which cannot hold one. */}
        {emptyMessage == null || typeof emptyMessage === "string" ? (
          <EmptyState size="sm" title={emptyMessage ?? messages.empty} />
        ) : (
          emptyMessage
        )}
      </div>
    );
  }

  const selectedList = Array.from(selected);

  return (
    <div
      data-slot="access-review"
      data-mode={certifying ? "certification" : "assignment"}
      className={cn(
        "@container w-full overflow-hidden rounded-(--qx-corner-surface) border border-border bg-card",
        className,
      )}
      {...props}
    >
      {selectable && (
        // biome-ignore lint/a11y/useSemanticElements: a named group of bulk actions; <fieldset> would add form semantics.
        <div
          role="group"
          aria-label={messages.bulkLabel}
          data-slot="access-review-bulk-bar"
          data-active={selected.size > 0 || undefined}
          className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-subtle bg-surface-subtle px-4 py-2 transition-colors duration-fast ease-standard data-[active]:bg-brand-subtle motion-reduce:transition-none"
        >
          <span aria-live="polite" className="me-auto text-sm text-muted-foreground">
            {selected.size > 0 ? (
              <span className="font-medium text-foreground tabular-nums">
                {messages.selectedCount(selected.size)}
              </span>
            ) : (
              messages.bulkHint
            )}
          </span>
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {bulkActions?.(selectedList)}
              {onDecisionChange && (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      decide(selectedList, "approved");
                      setSelection([]);
                    }}
                  >
                    <CheckIcon aria-hidden />
                    {messages.approveSelected(selected.size)}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      decide(selectedList, "revoked");
                      setSelection([]);
                    }}
                  >
                    <BanIcon aria-hidden />
                    {messages.revokeSelected(selected.size)}
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelection([])}>
                {messages.clearSelection}
              </Button>
            </div>
          )}
        </div>
      )}
      <Table {...ROLE.table} aria-label={ariaLabel ?? messages.label}>
        <TableHeader {...ROLE.rowgroup} className={stack.head}>
          <TableRow {...ROLE.row}>
            {selectable && (
              <TableHead {...ROLE.columnheader} scope="col" className="w-10 ps-4 pe-0">
                <Checkbox
                  aria-label={messages.selectAll}
                  checked={allSelected}
                  indeterminate={selected.size > 0 && !allSelected}
                  disabled={selectableIds.length === 0}
                  onCheckedChange={(checked) => setSelection(checked ? selectableIds : [])}
                />
              </TableHead>
            )}
            {hasSubject && (
              <TableHead {...ROLE.columnheader} scope="col">
                {messages.subjectHeader}
              </TableHead>
            )}
            <TableHead {...ROLE.columnheader} scope="col">
              {messages.accessHeader}
            </TableHead>
            {!certifying && (
              <TableHead {...ROLE.columnheader} scope="col">
                {messages.scopeHeader}
              </TableHead>
            )}
            {!certifying && (
              <TableHead {...ROLE.columnheader} scope="col">
                {messages.stateHeader}
              </TableHead>
            )}
            {hasRisk && (
              <TableHead {...ROLE.columnheader} scope="col">
                {messages.riskHeader}
              </TableHead>
            )}
            {hasEvidence && (
              <TableHead {...ROLE.columnheader} scope="col">
                {messages.evidenceHeader}
              </TableHead>
            )}
            {certifying && (
              <TableHead {...ROLE.columnheader} scope="col" className="text-end">
                {messages.decisionHeader}
              </TableHead>
            )}
            {renderActions && (
              <TableHead {...ROLE.columnheader} scope="col" className="pe-4 text-end">
                {messages.actionsHeader}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody {...ROLE.rowgroup}>
          {items.map((item) => {
            const safeId = item.id.replace(/[^a-zA-Z0-9_-]/g, "-");
            const descriptionId = `${baseId}-${safeId}-details`;
            const subjectName = item.subject?.name ?? "";
            const isPending = pending.has(item.id);
            const isSelected = selected.has(item.id);
            const grantDisabled = item.locked || item.state === "pending" || !onStateChange;
            const RowHeader = hasSubject ? "subject" : "access";

            const accessContent = (
              <div className="flex items-start gap-2.5">
                {!certifying && (
                  <Checkbox
                    aria-label={item.label}
                    aria-describedby={descriptionId}
                    checked={item.state === "granted"}
                    indeterminate={item.state === "mixed"}
                    disabled={grantDisabled}
                    onCheckedChange={(checked) =>
                      onStateChange?.(item.id, checked === true ? "granted" : "denied")
                    }
                    className="mt-0.5"
                  />
                )}
                <div className="min-w-0 space-y-0.5">
                  <div className="font-medium text-foreground wrap-anywhere">{item.label}</div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  )}
                  {certifying && (item.resource || item.scope) && (
                    <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      {item.resource && <span className="text-foreground">{item.resource}</span>}
                      {item.resource && item.scope && <span aria-hidden>·</span>}
                      {item.scope && <span>{item.scope}</span>}
                    </div>
                  )}
                  {!certifying && item.resource && (
                    <div className="text-xs text-muted-foreground">{item.resource}</div>
                  )}
                  {certifying && (
                    <div className="pt-1 empty:hidden">
                      <StateTags item={item} messages={messages} includeGranted={false} />
                    </div>
                  )}
                </div>
              </div>
            );

            const subjectContent = item.subject ? (
              <div className="flex items-start gap-2.5">
                {/* Decorative: the subject's name is the visible row header beside it. */}
                <Avatar size="sm" name={item.subject.name} className="mt-0.5">
                  <AvatarImage src={item.subject.avatarUrl} alt="" />
                  <AvatarFallback aria-hidden />
                </Avatar>
                <div className="min-w-0">
                  <div className="font-medium text-foreground wrap-anywhere">
                    {item.subject.name}
                  </div>
                  {item.subject.detail && (
                    <div className="text-xs text-muted-foreground wrap-anywhere">
                      {item.subject.detail}
                    </div>
                  )}
                </div>
              </div>
            ) : null;

            return (
              <TableRow
                key={item.id}
                {...ROLE.row}
                data-state={isSelected ? "selected" : undefined}
                data-decision={item.decision ?? undefined}
                aria-busy={isPending || undefined}
                className={cn(stack.row, selectable && stack.rowSelectable)}
              >
                {selectable && (
                  <TableCell {...ROLE.cell} className={cn(CELL, "w-10 ps-4 pe-0", stack.select)}>
                    <Checkbox
                      aria-label={messages.selectItem(item.label, subjectName)}
                      checked={isSelected}
                      disabled={item.locked}
                      onCheckedChange={(checked) => toggleRow(item.id, checked === true)}
                      className="mt-0.5"
                    />
                  </TableCell>
                )}
                {hasSubject &&
                  (RowHeader === "subject" ? (
                    <TableHead
                      {...ROLE.rowheader}
                      scope="row"
                      className={cn(
                        CELL,
                        "h-auto min-w-44 text-sm font-normal text-foreground",
                        !selectable && "ps-4",
                        stack.cell,
                      )}
                    >
                      {subjectContent}
                    </TableHead>
                  ) : null)}
                {RowHeader === "access" ? (
                  <TableHead
                    {...ROLE.rowheader}
                    scope="row"
                    className={cn(
                      CELL,
                      "h-auto text-sm font-normal text-foreground",
                      !selectable && "ps-4",
                      stack.cell,
                    )}
                  >
                    {accessContent}
                  </TableHead>
                ) : (
                  <TableCell {...ROLE.cell} className={cn(CELL, stack.cell)}>
                    {accessContent}
                  </TableCell>
                )}
                {!certifying && (
                  <TableCell
                    {...ROLE.cell}
                    className={cn(CELL, "text-muted-foreground", stack.cell)}
                  >
                    <span aria-hidden className={cn("text-xs", stack.label)}>
                      {messages.scopeHeader}
                    </span>
                    {item.scope ?? messages.allScopes}
                  </TableCell>
                )}
                {!certifying && (
                  <TableCell {...ROLE.cell} id={descriptionId} className={cn(CELL, stack.cell)}>
                    <StateTags item={item} messages={messages} includeGranted />
                  </TableCell>
                )}
                {hasRisk && (
                  <TableCell {...ROLE.cell} className={cn(CELL, stack.cell)}>
                    {item.risk && (
                      <RiskIndicator
                        risk={item.risk}
                        reason={item.riskReason}
                        messages={messages}
                      />
                    )}
                  </TableCell>
                )}
                {hasEvidence && (
                  <TableCell {...ROLE.cell} className={cn(CELL, "min-w-48", stack.cell)}>
                    <Evidence item={item} messages={messages} />
                  </TableCell>
                )}
                {certifying && (
                  <TableCell
                    {...ROLE.cell}
                    // The decision pair stays on one line: a stacked Approve-over-Revoke reads as
                    // two rows of actions.
                    className={cn(CELL, "text-end whitespace-nowrap", stack.cell, stack.end)}
                  >
                    <DecisionControl
                      item={item}
                      subject={subjectName}
                      pending={isPending}
                      onDecide={
                        onDecisionChange ? (decision) => decide([item.id], decision) : undefined
                      }
                      messages={messages}
                    />
                  </TableCell>
                )}
                {renderActions && (
                  <TableCell
                    {...ROLE.cell}
                    className={cn(CELL, "pe-4 text-end", stack.cell, stack.end)}
                  >
                    {renderActions(item)}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function Evidence({ item, messages }: { item: AccessReviewItem; messages: AccessReviewMessages }) {
  if (!item.evidence?.length && !item.recommendation) return null;
  return (
    <div data-slot="access-review-evidence" className="space-y-1.5">
      {item.recommendation && (
        <div className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
          <LightbulbIcon aria-hidden className="size-3.5 text-muted-foreground" />
          {messages.recommendation(item.recommendation)}
        </div>
      )}
      {item.evidence && item.evidence.length > 0 && (
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs">
          {item.evidence.map((entry, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: evidence rows have no identity beyond their position.
            <React.Fragment key={index}>
              <dt className="text-muted-foreground">{entry.label}</dt>
              <dd className="min-w-0 text-foreground wrap-anywhere">{entry.value}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </div>
  );
}

function DecisionControl({
  item,
  subject,
  pending,
  onDecide,
  messages,
}: {
  item: AccessReviewItem;
  subject: string;
  pending: boolean;
  onDecide?: (decision: AccessReviewVerdict | null) => void;
  messages: AccessReviewMessages;
}) {
  if (pending) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Spinner size="sm" label={messages.saving} />
      </span>
    );
  }

  if (item.decision) {
    const approved = item.decision === "approved";
    return (
      <div className="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
        <span
          data-slot="access-review-outcome"
          className={cn(
            "inline-flex items-center gap-1 text-sm font-medium",
            approved ? "text-success-text" : "text-destructive-text",
          )}
        >
          {/* Filled: the recorded outcome, distinct from the outline glyphs on the action buttons. */}
          {approved ? (
            <CircleCheckIcon aria-hidden variant="filled" className="size-4" />
          ) : (
            <BanIcon aria-hidden variant="filled" className="size-4" />
          )}
          {approved ? messages.approved : messages.revoked}
        </span>
        {onDecide && !item.locked && (
          <Button
            variant="ghost"
            size="xs"
            aria-label={messages.undoItem(item.label, subject)}
            onClick={() => onDecide(null)}
            className="text-muted-foreground"
          >
            <Undo2Icon aria-hidden className="rtl:-scale-x-100" />
            {messages.undo}
          </Button>
        )}
      </div>
    );
  }

  if (!onDecide) return null;

  return (
    <div className="inline-flex items-center justify-end gap-1.5">
      <Button
        variant="outline"
        size="sm"
        disabled={item.locked}
        aria-label={messages.approveItem(item.label, subject)}
        onClick={() => onDecide("approved")}
      >
        <CheckIcon aria-hidden />
        {messages.approve}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={item.locked}
        aria-label={messages.revokeItem(item.label, subject)}
        onClick={() => onDecide("revoked")}
        // Destructive by colour *and* by word and glyph, but quiet enough that a column of them
        // does not turn the table red. The bulk bar carries the filled destructive button.
        className="text-destructive-text hover:bg-destructive-subtle hover:text-destructive-text"
      >
        <BanIcon aria-hidden />
        {messages.revoke}
      </Button>
    </div>
  );
}

export type {
  AccessReviewDecision,
  AccessReviewEvidence,
  AccessReviewItem,
  AccessReviewMessages,
  AccessReviewProps,
  AccessReviewRisk,
  AccessReviewState,
  AccessReviewSubject,
  AccessReviewVerdict,
};
export { AccessReview };
