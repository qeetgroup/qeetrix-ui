import { cn } from "@qeetrix/ui";
import { Fragment } from "react";
import type { ModuleExamples } from "../registry/types";
import { ExampleBoundary } from "./error-boundary";

/** Renders `backtick` spans of a plain-text description as inline code. */
export function InlineCode({ text }: { text: string }) {
  let offset = 0;
  const segments = text.split("`").map((part, position) => {
    const segment = { key: `at-${offset}`, part, code: position % 2 === 1 };
    offset += part.length + 1;
    return segment;
  });
  return segments.map(({ key, part, code }) =>
    code ? (
      <code
        key={key}
        className="rounded bg-muted px-1 py-px font-mono text-[0.92em] text-foreground"
      >
        {part}
      </code>
    ) : (
      <Fragment key={key}>{part}</Fragment>
    ),
  );
}

/**
 * A module's demos, each under a small caption naming the variant or state it shows. Compact
 * modules flow side by side; wide ones stack, each demo taking the full width.
 */
export function DemoList({
  name,
  examples,
  layout = examples.layout ?? "compact",
  showDescriptions = false,
  className,
}: {
  name: string;
  examples: ModuleExamples;
  layout?: "compact" | "wide";
  showDescriptions?: boolean;
  className?: string;
}) {
  return (
    <div
      data-pg-demos=""
      className={cn(
        layout === "wide" ? "flex flex-col gap-6" : "flex flex-wrap items-start gap-x-8 gap-y-6",
        className,
      )}
    >
      {examples.demos.map((demo) => (
        <section
          key={demo.name}
          aria-label={`${name}: ${demo.name}`}
          className={cn("flex min-w-0 flex-col gap-2", layout === "wide" && "w-full")}
        >
          <h4 className="font-ui text-micro font-medium tracking-wide text-muted-foreground uppercase">
            {demo.name}
          </h4>
          {showDescriptions && demo.description && (
            <p className="-mt-1 text-caption text-muted-foreground">
              <InlineCode text={demo.description} />
            </p>
          )}
          <div className="min-w-0">
            <ExampleBoundary label={`${name} · ${demo.name}`}>{demo.render()}</ExampleBoundary>
          </div>
        </section>
      ))}
    </div>
  );
}
