"use client";

import { CheckIcon, XIcon } from "lucide-react";
import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PricingFeature {
  text: React.ReactNode;
  /** Render with a muted ✗ instead of a check. Defaults to `true`. */
  included?: boolean;
}

interface PricingTierProps {
  name: React.ReactNode;
  /** Headline price, e.g. `$29` or "Custom". */
  price: React.ReactNode;
  /** Suffix beside the price, e.g. `/mo`. */
  period?: React.ReactNode;
  description?: React.ReactNode;
  features: (PricingFeature | string)[];
  /** Call-to-action slot (pass a `<Button>`). */
  cta?: React.ReactNode;
  /** Highlight this tier (ring + badge). */
  featured?: boolean;
  /** Ribbon label, e.g. "Most popular". */
  badge?: React.ReactNode;
  className?: string;
}

/** A single pricing card. Compose several inside {@link PricingTable}. */
function PricingTier({
  name,
  price,
  period,
  description,
  features,
  cta,
  featured,
  badge,
  className,
}: PricingTierProps) {
  return (
    <div
      data-slot="pricing-tier"
      data-featured={featured || undefined}
      className={cn(
        "relative flex flex-col gap-6 rounded-xl bg-card p-6 text-card-foreground ring-1 ring-foreground/10",
        featured && "ring-2 ring-primary",
        className,
      )}
    >
      {badge && <Badge className="absolute -top-3 inset-s-6">{badge}</Badge>}
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-lg font-semibold">{name}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-heading text-4xl font-bold tracking-tight">{price}</span>
        {period && <span className="text-sm text-muted-foreground">{period}</span>}
      </div>
      {cta}
      <ul className="flex flex-col gap-2.5 text-sm">
        {features.map((feature, i) => {
          const f = typeof feature === "string" ? { text: feature, included: true } : feature;
          const included = f.included !== false;
          const featureKey = `feature-${i}`;
          return (
            <li
              key={featureKey}
              className={cn("flex items-start gap-2", !included && "text-muted-foreground")}
            >
              {included ? (
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <XIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
              )}
              <span>{f.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Responsive grid wrapper for {@link PricingTier} cards. */
function PricingTable({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="pricing-table"
      className={cn("grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}
      {...props}
    />
  );
}

export type { PricingFeature, PricingTierProps };
export { PricingTable, PricingTier };
