import { Button, Card, CardContent, Skeleton, Spinner } from "@qeetrix/ui";
import { changedProps, jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

const spinnerControls = {
  size: select(["sm", "default", "lg", "xl"] as const, "default"),
  label: text("Loading sessions", "Accessible label"),
  tone: select(["muted", "brand", "current"] as const, "muted", "Colour"),
};

const toneClass = {
  muted: undefined,
  brand: "text-brand",
  current: "text-current",
} as const;

/** Skeleton presets: the static class strings a consumer would write for each shape. */
const skeletonShapes = {
  line: "h-4 w-48",
  "full-width line": "h-4 w-full",
  avatar: "size-10 rounded-full",
  button: "h-8 w-24",
  card: "h-32 w-full rounded-lg",
} as const;
type SkeletonShape = keyof typeof skeletonShapes;

const skeletonControls = {
  shape: select(Object.keys(skeletonShapes) as SkeletonShape[], "line"),
  count: num(1, { min: 1, max: 6, label: "Count" }),
};

function SkeletonUserRow() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-52" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

export const examples: FamilyExamples = {
  spinner: {
    demos: [
      {
        name: "Sizes",
        render: () => (
          <div className="flex items-center gap-4">
            <Spinner size="sm" label="Loading (small)" />
            <Spinner label="Loading (default)" />
            <Spinner size="lg" label="Loading (large)" />
            <Spinner size="xl" label="Loading (extra large)" />
          </div>
        ),
      },
      {
        name: "Busy buttons",
        description:
          "Don’t nest Spinner in a button — its role=status folds into the name. Use Button `loading`.",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            <Button loading>Verify passkey</Button>
            <Button variant="outline" loading loadingLabel="Exporting…">
              Export CSV
            </Button>
          </div>
        ),
      },
      {
        name: "Inline status",
        render: () => (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="sm" label="Syncing directory" />
            Syncing 214 users from Okta…
          </div>
        ),
      },
      {
        name: "Brand tone",
        render: () => (
          <div className="flex items-center gap-2 text-sm">
            <Spinner label="Waiting for UPI approval" className="text-brand" />
            Waiting for approval in the UPI app…
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: spinnerControls,
      render: (v) => <Spinner size={v.size} label={v.label} className={toneClass[v.tone]} />,
      code: (v) =>
        jsx("Spinner", {
          ...changedProps(v, spinnerControls, ["size"]),
          label: v.label || undefined,
          className: toneClass[v.tone],
        }),
    }),
  },

  skeleton: {
    layout: "wide",
    minHeight: 460,
    demos: [
      {
        name: "User row",
        description: "Mirror the real row’s shape so nothing jumps when the data arrives.",
        render: () => (
          <div aria-busy="true" className="flex w-full max-w-md flex-col gap-4">
            <span className="sr-only">Loading members…</span>
            <SkeletonUserRow />
            <SkeletonUserRow />
            <SkeletonUserRow />
          </div>
        ),
      },
      {
        name: "Invoice card",
        render: () => (
          <Card aria-busy="true" className="w-full max-w-sm">
            <span className="sr-only">Loading invoice…</span>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-8 w-32" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>
        ),
      },
      {
        name: "Paragraph",
        render: () => (
          <div aria-busy="true" className="flex w-full max-w-md flex-col gap-2">
            <span className="sr-only">Loading incident summary…</span>
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: skeletonControls,
      render: (v) => (
        <div className="flex w-72 flex-col gap-2">
          {Array.from({ length: v.count }, (_, index) => `skeleton-${index}`).map((key) => (
            <Skeleton key={key} className={skeletonShapes[v.shape]} />
          ))}
        </div>
      ),
      code: (v) => {
        const one = jsx("Skeleton", { className: skeletonShapes[v.shape] });
        return v.count === 1
          ? one
          : jsx("div", { className: "flex flex-col gap-2" }, Array(v.count).fill(one));
      },
    }),
  },
};
