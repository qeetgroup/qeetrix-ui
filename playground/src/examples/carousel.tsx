import {
  Badge,
  Button,
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselControls,
  CarouselIndicators,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  cn,
  type StatusKind,
  StatusPill,
} from "@qeetrix/ui";
import {
  CheckIcon,
  FingerprintIcon,
  type LucideIcon,
  RefreshCwIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select } from "../registry/types";

interface Step {
  id: string;
  icon: LucideIcon;
  title: string;
  body: string;
}

const onboarding: readonly Step[] = [
  {
    id: "passkeys",
    icon: FingerprintIcon,
    title: "Sign in with a passkey",
    body: "Touch ID, Windows Hello or a security key replaces the password — nothing to phish, nothing to reuse.",
  },
  {
    id: "sso",
    icon: ShieldCheckIcon,
    title: "Connect your identity provider",
    body: "Bring Okta, Azure AD or Google Workspace over OIDC or SAML 2.0 in a few minutes.",
  },
  {
    id: "scim",
    icon: RefreshCwIcon,
    title: "Provision users automatically",
    body: "SCIM keeps Qeet ID in step with HR: joiners get access on day one, leavers lose it the same hour.",
  },
  {
    id: "audit",
    icon: ScrollTextIcon,
    title: "Every change, on the record",
    body: "The audit log keeps 400 days of admin activity, exportable to your SIEM.",
  },
];

function StepSlide({ step, index }: { step: Step; index: number }) {
  const Icon = step.icon;
  return (
    <div className="flex h-56 flex-col gap-3 rounded-lg border bg-surface-subtle p-5">
      <span className="flex size-10 items-center justify-center rounded-full bg-brand-subtle text-brand">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="text-caption text-muted-foreground">
        Step {index + 1} of {onboarding.length}
      </span>
      <h3 className="font-heading text-base font-semibold">{step.title}</h3>
      <p className="text-sm text-muted-foreground">{step.body}</p>
    </div>
  );
}

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "₹0",
    per: "up to 100 users",
    features: ["Passkeys and TOTP", "Email + SMS OTP", "7-day audit log"],
  },
  {
    id: "growth",
    name: "Growth",
    price: "₹49",
    per: "per user / month + GST",
    features: ["Everything in Starter", "OIDC + SAML SSO", "90-day audit log"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    per: "annual contract, billed in INR",
    features: ["SCIM provisioning", "Data residency in India", "400-day audit log"],
  },
  {
    id: "public-sector",
    name: "Public sector",
    price: "Custom",
    per: "GeM procurement",
    features: ["MeitY-empanelled cloud", "On-site key ceremony", "Dedicated support"],
  },
] as const;

function PlanCard({ plan }: { plan: (typeof plans)[number] }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold">{plan.name}</h3>
        {plan.id === "growth" && <Badge>Most popular</Badge>}
      </div>
      <div>
        <span className="font-heading text-heading font-semibold">{plan.price}</span>
        <span className="block text-caption text-muted-foreground">{plan.per}</span>
      </div>
      <ul className="flex flex-col gap-1.5 text-sm">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <CheckIcon aria-hidden className="size-4 text-success-text" />
            {feature}
          </li>
        ))}
      </ul>
      <Button variant={plan.id === "growth" ? "default" : "outline"} size="sm" className="mt-auto">
        Choose {plan.name}
      </Button>
    </div>
  );
}

/**
 * Previous, indicators and Next in a row beneath the slides: `CarouselControls` renders the
 * arrows in flow, so the carousel fits a card or a drawer with no room for overlay arrows.
 */
function OnboardingInCard() {
  return (
    <div className="w-full max-w-sm rounded-lg border bg-card p-4">
      <Carousel aria-label="Getting started with Qeet ID">
        <CarouselContent>
          {onboarding.map((step, index) => (
            <CarouselItem key={step.id}>
              <StepSlide step={step} index={index} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselControls>
          <CarouselPrevious />
          <CarouselIndicators />
          <CarouselNext />
        </CarouselControls>
      </Carousel>
    </div>
  );
}

/** `setApi` hands over the Embla API: here a step counter and a Finish button outside it. */
function OnboardingWithApi() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!api) return;
    const sync = () => setCurrent(api.selectedScrollSnap());
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);
  const last = current === onboarding.length - 1;
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <Carousel setApi={setApi} aria-label="Getting started with Qeet ID">
        <CarouselContent>
          {onboarding.map((step, index) => (
            <CarouselItem key={step.id}>
              <StepSlide step={step} index={index} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselControls className="justify-between">
          <span className="text-caption text-muted-foreground" aria-live="polite">
            Step {current + 1} of {onboarding.length}
          </span>
          <CarouselIndicators />
          <Button
            size="sm"
            variant={last ? "default" : "outline"}
            onClick={() => (last ? api?.scrollTo(0) : api?.scrollNext())}
          >
            {last ? "Start over" : "Next step"}
          </Button>
        </CarouselControls>
      </Carousel>
    </div>
  );
}

const incidents: readonly { id: string; kind: StatusKind; label: string; text: string }[] = [
  {
    id: "inc_1",
    kind: "success",
    label: "Resolved",
    text: "UPI collect latency back to normal across all PSPs (10:24 IST).",
  },
  {
    id: "inc_2",
    kind: "warning",
    label: "Monitoring",
    text: "SMS OTP delivery delayed for one Jio route; WhatsApp fallback enabled.",
  },
  {
    id: "inc_3",
    kind: "danger",
    label: "Investigating",
    text: "Elevated refresh-token reuse alerts on tenant Northwind Retail.",
  },
  {
    id: "inc_4",
    kind: "success",
    label: "Completed",
    text: "Scheduled maintenance: ap-south-2 database failover drill.",
  },
];

const perViewBasis = {
  "1": "basis-full",
  "2": "basis-full sm:basis-1/2",
  "3": "basis-full sm:basis-1/2 lg:basis-1/3",
} as const;

const carouselControls = {
  orientation: select(["horizontal", "vertical"] as const, "horizontal"),
  perView: select(["1", "2", "3"] as const, "1", "Slides per view"),
  align: select(["start", "center", "end"] as const, "start"),
  loop: bool(false),
  arrows: bool(true, "Previous / next buttons"),
  placement: select(["overlay", "controls"] as const, "overlay", "Arrow placement"),
  indicators: bool(false, "Indicators (in CarouselControls)"),
};

export const examples: FamilyExamples = {
  carousel: {
    layout: "wide",
    minHeight: 1700,
    demos: [
      {
        name: "Onboarding",
        description:
          "One slide at a time with previous/next buttons. Arrow keys move between slides; off-screen slides are inert.",
        render: () => (
          <div className="px-12">
            <Carousel className="w-full max-w-md" aria-label="Getting started with Qeet ID">
              <CarouselContent>
                {onboarding.map((step, index) => (
                  <CarouselItem key={step.id}>
                    <StepSlide step={step} index={index} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        ),
      },
      {
        name: "Plan cards",
        description:
          'Several slides per view: `CarouselItem` takes a responsive basis; `opts={{ align: "start" }}` keeps the first card flush.',
        render: () => (
          <div className="px-12">
            <Carousel opts={{ align: "start" }} aria-label="Qeet ID plans">
              <CarouselContent>
                {plans.map((plan) => (
                  <CarouselItem key={plan.id} className="basis-full sm:basis-1/2 lg:basis-1/3">
                    <PlanCard plan={plan} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        ),
      },
      {
        name: "Controls row and indicators",
        description:
          "`CarouselControls` lays Previous, `CarouselIndicators` and Next out beneath the slides, so the carousel fits a card or drawer. The indicators are one Tab stop; arrow keys move slide and focus together.",
        render: () => <OnboardingInCard />,
      },
      {
        name: "Driven through setApi",
        description:
          "`setApi` exposes the Embla API for a step counter and a button outside the slides.",
        render: () => <OnboardingWithApi />,
      },
      {
        name: "Vertical",
        description:
          'A status ticker with `orientation="vertical"`; give `CarouselContent` a height.',
        render: () => (
          <div className="py-12">
            <Carousel
              orientation="vertical"
              opts={{ align: "start" }}
              className="w-full max-w-md"
              aria-label="Platform status updates"
            >
              <CarouselContent className="h-60">
                {incidents.map((incident) => (
                  <CarouselItem key={incident.id} className="basis-1/2">
                    <div className="flex h-full flex-col justify-center gap-1.5 rounded-lg border bg-card p-3">
                      <StatusPill kind={incident.kind}>{incident.label}</StatusPill>
                      <p className="text-sm">{incident.text}</p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: carouselControls,
      render: (v) => {
        const row = v.placement === "controls" || v.indicators;
        const overlay = v.arrows && !row;
        return (
          <div
            className={cn(
              "w-[min(100%,720px)]",
              overlay && (v.orientation === "horizontal" ? "px-12" : "py-12"),
            )}
          >
            <Carousel
              key={`${v.orientation}-${v.loop}-${v.align}`}
              orientation={v.orientation}
              opts={{ align: v.align, loop: v.loop }}
              aria-label="Qeet ID plans"
            >
              <CarouselContent className={v.orientation === "vertical" ? "h-80" : undefined}>
                {plans.map((plan) => (
                  <CarouselItem
                    key={plan.id}
                    className={
                      v.orientation === "vertical" ? "basis-full" : perViewBasis[v.perView]
                    }
                  >
                    <PlanCard plan={plan} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              {overlay && <CarouselPrevious />}
              {overlay && <CarouselNext />}
              {row && (
                <CarouselControls>
                  {v.arrows && <CarouselPrevious />}
                  {v.indicators && <CarouselIndicators />}
                  {v.arrows && <CarouselNext />}
                </CarouselControls>
              )}
            </Carousel>
          </div>
        );
      },
      code: (v) => {
        const opts = [
          v.align === "start" ? "" : `align: "${v.align}"`,
          v.loop ? "loop: true" : "",
        ].filter(Boolean);
        return jsx(
          "Carousel",
          {
            orientation: v.orientation === "horizontal" ? undefined : v.orientation,
            opts: opts.length ? expr(`{ ${opts.join(", ")} }`) : undefined,
            "aria-label": "Qeet ID plans",
          },
          [
            jsx(
              "CarouselContent",
              { className: v.orientation === "vertical" ? "h-80" : undefined },
              plans.map((plan) =>
                jsx(
                  "CarouselItem",
                  {
                    className:
                      v.orientation === "vertical" || v.perView === "1"
                        ? undefined
                        : perViewBasis[v.perView],
                  },
                  [`<div className="rounded-lg border p-4">${plan.name}</div>`],
                ),
              ),
            ),
            ...(v.placement === "controls" || v.indicators
              ? [
                  jsx("CarouselControls", {}, [
                    v.arrows ? "<CarouselPrevious />" : "",
                    v.indicators ? "<CarouselIndicators />" : "",
                    v.arrows ? "<CarouselNext />" : "",
                  ]),
                ]
              : [v.arrows ? "<CarouselPrevious />" : "", v.arrows ? "<CarouselNext />" : ""]),
          ],
        );
      },
    }),
  },
};
