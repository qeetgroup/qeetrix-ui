"use client";

import type * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Separator } from "@/components/utility/separator";
import { cn } from "@/lib/utils";

interface SettingsLayoutProps extends Omit<React.ComponentProps<"div">, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned header actions. */
  actions?: React.ReactNode;
}

/**
 * Stacked-section settings page (profile / security / API keys / team), à la
 * GitHub settings: an optional page header above a vertical list of
 * {@link SettingsSection}s. Pair `SettingsSection`s with `DescriptionList`,
 * `Field`/`Form`, and `CopyableSecret` for the actual rows.
 */
function SettingsLayout({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: SettingsLayoutProps) {
  return (
    <div
      data-slot="settings-layout"
      className={cn("mx-auto flex w-full max-w-3xl flex-col gap-6", className)}
      {...props}
    >
      {(title || actions) && (
        <PageHeader title={title} description={description} actions={actions} />
      )}
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

interface SettingsSectionProps extends Omit<React.ComponentProps<"section">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Header-level actions for this section. */
  actions?: React.ReactNode;
  /** Footer slot (e.g. a save button row), separated by a divider. */
  footer?: React.ReactNode;
}

/** A bordered settings card: header (title/description/actions), body, optional footer. */
function SettingsSection({
  title,
  description,
  actions,
  footer,
  className,
  children,
  ...props
}: SettingsSectionProps) {
  return (
    <section
      data-slot="settings-section"
      className={cn("rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10", className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-4 p-5 pb-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-base font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="px-5 pb-5">{children}</div>
      {footer && (
        <>
          <Separator />
          <div className="flex justify-end gap-2 px-5 py-3">{footer}</div>
        </>
      )}
    </section>
  );
}

export type { SettingsLayoutProps, SettingsSectionProps };
export { SettingsLayout, SettingsSection };
