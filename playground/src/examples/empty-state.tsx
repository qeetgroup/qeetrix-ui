import {
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataState,
  EmptyState,
  SegmentedControl,
  SegmentedControlItem,
  Skeleton,
  StatusPill,
} from "@qeetrix/ui";
import {
  CircleAlertIcon,
  FileTextIcon,
  KeyRoundIcon,
  PlusIcon,
  RefreshCwIcon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";
import { type User, users } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

/* ── Shared bits ──────────────────────────────────────────────────────────────────────────── */

const sessionsError = new Error(
  "Couldn’t load members: qeet-id-server returned 503 Service Unavailable (trace 9d5b1f7a2c4e6a80).",
);

function MemberList({ members }: { members: readonly User[] }) {
  return (
    <ul className="flex flex-col divide-y">
      {members.map((member) => (
        <li key={member.id} className="flex items-center gap-3 px-4 py-2.5">
          <Avatar size="sm">
            <AvatarFallback>{member.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{member.name}</div>
            <div className="truncate text-caption text-muted-foreground">{member.email}</div>
          </div>
          <StatusPill status={member.status} />
        </li>
      ))}
    </ul>
  );
}

/** A loading slot shaped like the member rows it stands in for. */
function MemberRowsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, row) => `member-skeleton-${row}`).map((key) => (
        <div key={key} className="flex items-center gap-3">
          <Skeleton className="size-6 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

type Branch = "loading" | "empty" | "error" | "data";

function DataStateSwitcher() {
  const [branch, setBranch] = useState<Branch>("loading");
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <SegmentedControl
        size="sm"
        className="self-start"
        value={branch}
        onValueChange={(value) => setBranch(value as Branch)}
        aria-label="Query state"
      >
        <SegmentedControlItem value="loading">Loading</SegmentedControlItem>
        <SegmentedControlItem value="empty">Empty</SegmentedControlItem>
        <SegmentedControlItem value="error">Error</SegmentedControlItem>
        <SegmentedControlItem value="data">Data</SegmentedControlItem>
      </SegmentedControl>
      <div className="min-h-64 rounded-lg border bg-card">
        <DataState
          isLoading={branch === "loading"}
          isError={branch === "error"}
          error={sessionsError}
          isEmpty={branch === "empty"}
          loading={<MemberRowsSkeleton rows={4} />}
          emptyIcon={UsersIcon}
          emptyTitle="No members in Risk & Compliance"
          emptyDescription="Invite people or sync this department from Okta."
        >
          <MemberList members={users.slice(0, 4)} />
        </DataState>
      </div>
    </div>
  );
}

/* ── Playground controls ──────────────────────────────────────────────────────────────────── */

const emptyStateControls = {
  title: text("No API keys yet", "Title"),
  description: text(
    "Create a key to call the Qeet Pay API from your servers. The secret is shown only once.",
    "Description",
  ),
  variant: select(
    ["default", "first-use", "no-results", "no-permission", "error"] as const,
    "first-use",
    "Variant (why it is empty)",
  ),
  size: select(["sm", "default", "lg"] as const, "default"),
  icon: bool(true, "Icon"),
  action: bool(true, "Action"),
};

const dataStateControls = {
  state: select(["loading", "empty", "error", "data"] as const, "loading", "Branch"),
  skeletonRows: num(4, { min: 1, max: 8, label: "Skeleton rows" }),
  emptyTitle: text("No active sessions", "Empty title"),
  emptyDescription: text("Sessions appear here after someone signs in.", "Empty description"),
  error: text("Couldn’t load sessions: request timed out after 30 s.", "Error message"),
};

export const examples: FamilyExamples = {
  "empty-state": {
    layout: "wide",
    minHeight: 640,
    demos: [
      {
        name: "First use",
        description: '`variant="first-use"` tints the icon brand for a list nobody has filled yet.',
        render: () => (
          <div className="w-full max-w-xl rounded-lg border border-dashed">
            <EmptyState
              variant="first-use"
              icon={KeyRoundIcon}
              title="No API keys yet"
              description="Create a key to call the Qeet Pay API from your servers. The secret is shown only once."
              action={
                <>
                  <Button>
                    <PlusIcon data-icon="inline-start" aria-hidden />
                    Create API key
                  </Button>
                  <Button variant="outline">Read the docs</Button>
                </>
              }
            />
          </div>
        ),
      },
      {
        name: "No results",
        description: "`no-results`, `no-permission` and `error` bring a default glyph.",
        render: () => (
          <div className="w-full max-w-xl rounded-lg border border-dashed">
            <EmptyState
              variant="no-results"
              title="No logs match “level:error service:notify-worker”"
              description="Try widening the time range from 15 minutes, or remove a filter."
              action={<Button variant="outline">Clear filters</Button>}
            />
          </div>
        ),
      },
      {
        name: "No permission, error",
        render: () => (
          <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-dashed">
              <EmptyState
                variant="no-permission"
                size="sm"
                title="You can’t view payouts"
                description="Ask a Billing admin at Acme India for the payouts:read permission."
                action={
                  <Button size="sm" variant="outline">
                    Request access
                  </Button>
                }
              />
            </div>
            <div className="rounded-lg border border-dashed">
              <EmptyState
                variant="error"
                size="sm"
                title="Couldn’t load sessions"
                description="qeet-id-server returned 503. Trace 9d5b1f7a2c4e6a80."
                action={
                  <Button size="sm" variant="outline">
                    <RefreshCwIcon data-icon="inline-start" aria-hidden />
                    Retry
                  </Button>
                }
              />
            </div>
          </div>
        ),
      },
      {
        name: "In a card",
        render: () => (
          <Card className="w-full max-w-xl">
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>October 2026 · Acme India Pvt Ltd</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                size="sm"
                icon={FileTextIcon}
                title="No invoices this month"
                description="Invoices you issue in October will appear here with their GST breakup."
              />
            </CardContent>
          </Card>
        ),
      },
      {
        name: "Text only",
        render: () => (
          <div className="w-full max-w-xl rounded-lg border border-dashed">
            <EmptyState
              size="sm"
              title="Nothing to review"
              description="All 12 access requests for Acme India have been approved or declined."
            />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: emptyStateControls,
      render: (v) => (
        <div className="w-full max-w-xl rounded-lg border border-dashed">
          <EmptyState
            variant={v.variant}
            size={v.size}
            icon={v.icon ? KeyRoundIcon : null}
            title={v.title || undefined}
            description={v.description || undefined}
            action={
              v.action ? (
                <Button>
                  <PlusIcon data-icon="inline-start" aria-hidden />
                  Create API key
                </Button>
              ) : undefined
            }
          />
        </div>
      ),
      code: (v) =>
        jsx("EmptyState", {
          variant: v.variant === "default" ? undefined : v.variant,
          size: v.size === "default" ? undefined : v.size,
          icon: v.icon ? expr("KeyRoundIcon") : expr("null"),
          title: v.title || undefined,
          description: v.description || undefined,
          action: v.action
            ? expr(
                '<Button><PlusIcon data-icon="inline-start" aria-hidden />Create API key</Button>',
              )
            : undefined,
        }),
    }),
  },

  "data-state": {
    layout: "wide",
    minHeight: 900,
    demos: [
      {
        name: "All four branches",
        description:
          "Switch the query state: children render only once loading, error and empty are all false.",
        render: () => <DataStateSwitcher />,
      },
      {
        name: "Loading (default skeleton)",
        render: () => (
          <div className="w-full max-w-xl rounded-lg border bg-card">
            <DataState isLoading skeletonRows={3}>
              <MemberList members={users.slice(0, 3)} />
            </DataState>
          </div>
        ),
      },
      {
        name: "Error",
        description:
          "The default slot is an error EmptyState carrying `error.message`; `errorFallback` replaces it.",
        render: () => (
          <div className="flex w-full max-w-xl flex-col gap-3">
            <div className="rounded-lg border bg-card">
              <DataState isError error={sessionsError}>
                <MemberList members={users.slice(0, 3)} />
              </DataState>
            </div>
            <div className="rounded-lg border bg-card">
              <DataState
                isError
                className="p-4"
                errorFallback={
                  <Alert variant="destructive">
                    <CircleAlertIcon aria-hidden />
                    <AlertTitle>Couldn’t load settlements</AlertTitle>
                    <AlertDescription>
                      The HDFC settlement API is not responding. Last successful sync 18 minutes
                      ago.
                    </AlertDescription>
                    <div className="col-start-2 mt-2">
                      <Button size="sm" variant="outline">
                        <RefreshCwIcon data-icon="inline-start" aria-hidden />
                        Retry
                      </Button>
                    </div>
                  </Alert>
                }
              >
                <MemberList members={users.slice(0, 3)} />
              </DataState>
            </div>
          </div>
        ),
      },
      {
        name: "Empty",
        description: "Convenience props for the default empty slot, or pass a full EmptyState.",
        render: () => (
          <div className="flex w-full max-w-xl flex-col gap-3">
            <div className="rounded-lg border bg-card">
              <DataState
                isEmpty
                emptyIcon={UsersIcon}
                emptyTitle="No pending invitations"
                emptyDescription="Invitations you send from Members appear here until accepted."
              >
                <MemberList members={users.slice(0, 3)} />
              </DataState>
            </div>
            <div className="rounded-lg border bg-card">
              <DataState
                isEmpty
                className="p-0"
                empty={
                  <EmptyState
                    icon={KeyRoundIcon}
                    title="No API keys yet"
                    description="Create a key to call the Qeet Pay API from your servers."
                    action={<Button size="sm">Create API key</Button>}
                  />
                }
              >
                <MemberList members={users.slice(0, 3)} />
              </DataState>
            </div>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: dataStateControls,
      render: (v) => (
        <div className="w-full max-w-xl rounded-lg border bg-card">
          <DataState
            isLoading={v.state === "loading"}
            isError={v.state === "error"}
            error={v.error}
            isEmpty={v.state === "empty"}
            skeletonRows={v.skeletonRows}
            emptyIcon={UsersIcon}
            emptyTitle={v.emptyTitle}
            emptyDescription={v.emptyDescription}
          >
            <MemberList members={users.slice(0, 4)} />
          </DataState>
        </div>
      ),
      code: (v) =>
        jsx(
          "DataState",
          {
            isLoading: expr("query.isPending"),
            isError: expr("query.isError"),
            error: expr("query.error"),
            isEmpty: expr("query.data?.length === 0"),
            skeletonRows: v.skeletonRows === 6 ? undefined : v.skeletonRows,
            emptyIcon: expr("UsersIcon"),
            emptyTitle: v.emptyTitle || undefined,
            emptyDescription: v.emptyDescription || undefined,
          },
          ["<MemberList members={query.data} />"],
        ),
    }),
  },
};
