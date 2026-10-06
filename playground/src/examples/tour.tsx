import { Button, Input, Tour, TourStep, type TourStepDef, toast, useTour } from "@qeetrix/ui";
import {
  CompassIcon,
  FileClockIcon,
  LightbulbIcon,
  SearchIcon,
  ShieldIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { useId, useState } from "react";
import { expr, jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, num, select } from "../registry/types";

type Placement = NonNullable<TourStepDef["placement"]>;

/** Tour targets are CSS selectors; a per-instance id keeps several demos on one page apart. */
function useTargets() {
  const id = useId();
  return {
    attr: (name: string) => ({ "data-tour-target": `${id}-${name}` }),
    selector: (name: string) => `[data-tour-target="${id}-${name}"]`,
  };
}

/** A miniature Qeet ID console for the tour to walk through. */
function ConsoleMock({ attr }: { attr: (name: string) => Record<string, string> }) {
  return (
    <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-lg border bg-card text-sm">
      <div className="flex items-center gap-3 border-b px-3 py-2">
        <span className="font-heading font-medium">Qeet ID</span>
        <div className="relative max-w-56 flex-1" {...attr("search")}>
          <SearchIcon
            className="pointer-events-none absolute inset-s-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input aria-label="Search the console" placeholder="Search…" className="ps-8" />
        </div>
        <Button size="sm" className="ms-auto" {...attr("invite")}>
          <UserPlusIcon data-icon="inline-start" aria-hidden />
          Invite
        </Button>
      </div>
      <div className="flex">
        <nav aria-label="Console" className="flex w-36 flex-col gap-0.5 border-e p-2">
          <span className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5 font-medium">
            <UsersIcon className="size-4" aria-hidden />
            Users
          </span>
          <span className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground">
            <ShieldIcon className="size-4" aria-hidden />
            Policies
          </span>
          <span
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground"
            {...attr("audit")}
          >
            <FileClockIcon className="size-4" aria-hidden />
            Audit log
          </span>
        </nav>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <p className="font-medium">Acme India · 1,842 users</p>
          <div className="h-2 w-3/4 rounded bg-muted" />
          <div className="h-2 w-1/2 rounded bg-muted" />
          <div className="h-2 w-2/3 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function onboardingSteps(selector: (name: string) => string, placement?: Placement): TourStepDef[] {
  return [
    {
      target: selector("search"),
      title: "Search everything",
      content: "Find users, tenants, API keys and invoices. Press ⌘K from anywhere.",
      placement: placement ?? "bottom",
    },
    {
      target: selector("invite"),
      title: "Invite your admins first",
      content: "Admins can connect Okta or Entra ID for SSO and turn on SCIM provisioning.",
      placement: placement ?? "bottom",
    },
    {
      target: selector("audit"),
      title: "Every change is audited",
      content: "Role changes, key rotations and sign-ins appear here within seconds.",
      placement: placement ?? "right",
    },
  ];
}

function OnboardingTourDemo({
  placement,
  stepCount = 3,
}: {
  placement?: Placement;
  stepCount?: number;
}) {
  const { attr, selector } = useTargets();
  const [open, setOpen] = useState(false);
  const steps = onboardingSteps(selector, placement).slice(0, stepCount);
  return (
    <div className="flex w-full flex-col items-start gap-3">
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CompassIcon data-icon="inline-start" aria-hidden />
        Start tour
      </Button>
      <ConsoleMock attr={attr} />
      <Tour
        steps={steps}
        open={open}
        onOpenChange={setOpen}
        onComplete={() =>
          toast.success("You're all set", { description: "Replay the tour from Help → Tour." })
        }
      />
    </div>
  );
}

function HeadlessTipsDemo() {
  const { attr, selector } = useTargets();
  const steps = onboardingSteps(selector).slice(0, 2);
  const tour = useTour(steps, {
    onComplete: () => toast("Tips dismissed for this session"),
  });
  return (
    <div className="flex w-full flex-col items-start gap-3">
      <Button variant="outline" onClick={tour.start}>
        <LightbulbIcon data-icon="inline-start" aria-hidden />
        Show tips ({tour.totalSteps})
      </Button>
      <ConsoleMock attr={attr} />
      {tour.isOpen && tour.currentStep && (
        <TourStep
          step={tour.currentStep}
          currentIndex={tour.currentIndex}
          totalSteps={tour.totalSteps}
          onNext={tour.next}
          onPrev={tour.prev}
          onDismiss={tour.stop}
        />
      )}
    </div>
  );
}

const tourControls = {
  placement: select(["bottom", "top", "right", "left"] as const, "bottom", "Placement (all steps)"),
  steps: num(3, { min: 1, max: 3, label: "Steps" }),
};

export const examples: FamilyExamples = {
  tour: {
    layout: "wide",
    minHeight: 640,
    demos: [
      {
        name: "Onboarding",
        description:
          "Opened from a button, never on page load. The current target is spotlighted through the backdrop and the page behind is inert; Escape or the backdrop dismisses, ← and → step through.",
        render: () => <OnboardingTourDemo />,
      },
      {
        name: "useTour + TourStep",
        description:
          "Drive the state yourself with `useTour` and render `TourStep` for lightweight tips without the modal backdrop.",
        render: () => <HeadlessTipsDemo />,
      },
    ],
    playground: definePlayground({
      controls: tourControls,
      render: (v) => (
        <OnboardingTourDemo
          key={`${v.placement}-${v.steps}`}
          placement={v.placement}
          stepCount={v.steps}
        />
      ),
      code: (v) => {
        const steps = [
          `{ target: "#console-search", title: "Search everything", content: "Find users, tenants, API keys and invoices.", placement: "${v.placement}" }`,
          `{ target: "#invite-button", title: "Invite your admins first", content: "Admins can connect Okta for SSO.", placement: "${v.placement}" }`,
          `{ target: "#nav-audit-log", title: "Every change is audited", content: "Role changes and sign-ins appear here.", placement: "${v.placement}" }`,
        ].slice(0, v.steps);
        return [
          "const [open, setOpen] = useState(false);",
          "",
          jsx("Button", { onClick: expr("() => setOpen(true)") }, "Start tour"),
          jsx("Tour", {
            steps: expr(`[\n    ${steps.join(",\n    ")},\n  ]`),
            open: expr("open"),
            onOpenChange: expr("setOpen"),
          }),
        ].join("\n");
      },
    }),
  },
};
