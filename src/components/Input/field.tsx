"use client";

import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Label } from "@/components/Label/label";
import { Separator } from "@/components/Separator/separator";
import { cn } from "@/lib/utils";

interface FieldContextValue {
  controlId: string;
  labelId: string;
  descriptionId: string;
  errorId: string;
  hasLabel: boolean;
  hasDescription: boolean;
  hasError: boolean;
  invalid: boolean;
}

const FieldContext = React.createContext<FieldContextValue | null>(null);

function mergeIdRefs(...values: Array<string | undefined>): string | undefined {
  const ids = values.flatMap((value) => value?.split(/\s+/).filter(Boolean) ?? []);
  const uniqueIds = [...new Set(ids)];
  return uniqueIds.length > 0 ? uniqueIds.join(" ") : undefined;
}

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-[var(--qx-control-field-gap)] has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
        className,
      )}
      {...props}
    />
  );
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base",
        className,
      )}
      {...props}
    />
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-[var(--qx-control-field-gap)] data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-[var(--qx-control-field-gap)]",
        className,
      )}
      {...props}
    />
  );
}

const fieldVariants = cva("group/field flex w-full gap-2 data-[invalid=true]:text-destructive", {
  variants: {
    orientation: {
      vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
      horizontal:
        "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      responsive:
        "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

interface FieldRelationships {
  controlId?: string;
  labelId?: string;
  descriptionId?: string;
  errorId?: string;
  hasLabel: boolean;
  hasDescription: boolean;
  hasError: boolean;
}

function getFieldRelationships(children: React.ReactNode): FieldRelationships {
  const relationships: FieldRelationships = {
    hasLabel: false,
    hasDescription: false,
    hasError: false,
  };

  function visit(nodes: React.ReactNode) {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) {
        return;
      }

      const childProps = child.props as {
        id?: string;
        htmlFor?: string;
        children?: React.ReactNode;
        errors?: Array<{ message?: string } | undefined>;
        render?: React.ReactElement;
      };

      if (child.type === FieldLabel) {
        relationships.hasLabel = true;
        relationships.labelId ??= childProps.id;
        relationships.controlId ??= childProps.htmlFor;
      } else if (child.type === FieldDescription) {
        relationships.hasDescription = true;
        relationships.descriptionId ??= childProps.id;
      } else if (child.type === FieldError) {
        const hasContent =
          React.Children.count(childProps.children) > 0 ||
          Boolean(childProps.errors?.some((error) => error?.message));
        if (hasContent) {
          relationships.hasError = true;
          relationships.errorId ??= childProps.id;
        }
      } else if (child.type === FieldControl) {
        const renderId = React.isValidElement<{ id?: string }>(childProps.render)
          ? childProps.render.props.id
          : undefined;
        relationships.controlId ??= renderId ?? childProps.id;
      }

      visit(childProps.children);
    });
  }

  visit(children);
  return relationships;
}

type FieldProps = React.ComponentProps<"fieldset"> &
  VariantProps<typeof fieldVariants> & {
    controlId?: string;
    invalid?: boolean;
    "data-invalid"?: boolean | "true" | "false";
  };

function Field({
  className,
  orientation = "vertical",
  children,
  controlId: controlIdProp,
  invalid: invalidProp,
  "data-invalid": dataInvalid,
  ...props
}: FieldProps) {
  const generatedId = React.useId();
  const relationships = getFieldRelationships(children);
  const invalid =
    invalidProp ?? (dataInvalid === true || dataInvalid === "true" || relationships.hasError);
  const context: FieldContextValue = {
    controlId: controlIdProp ?? relationships.controlId ?? `${generatedId}-control`,
    labelId: relationships.labelId ?? `${generatedId}-label`,
    descriptionId: relationships.descriptionId ?? `${generatedId}-description`,
    errorId: relationships.errorId ?? `${generatedId}-error`,
    hasLabel: relationships.hasLabel,
    hasDescription: relationships.hasDescription,
    hasError: relationships.hasError,
    invalid,
  };

  return (
    <FieldContext.Provider value={context}>
      <fieldset
        data-slot="field"
        data-orientation={orientation}
        data-invalid={invalid || undefined}
        className={cn("min-w-0 border-0 p-0", fieldVariants({ orientation }), className)}
        {...props}
      >
        {children}
      </fieldset>
    </FieldContext.Provider>
  );
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("group/field-content flex flex-1 flex-col gap-0.5 leading-snug", className)}
      {...props}
    />
  );
}

interface FieldControlElementProps {
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}

/* ── The composite-field contract ──────────────────────────────────────────────────────────
 * A native `<input>` gets four things from the browser for free: the `<label for>` association,
 * `aria-describedby` plumbing a consumer writes once, a `name` that puts its value in the
 * submitted `FormData`, and constraint validation. A control assembled from buttons, spans and
 * a contenteditable gets none of them, so every composite used to wire up whichever subset its
 * author remembered. This is the one contract they all implement.
 *
 * A composite control that accepts `name` promises three things:
 *
 *   (a) **Association.** Its focusable element carries the `id`, `aria-labelledby`,
 *       `aria-describedby`, `aria-errormessage` and `aria-invalid` that `Field` supplies —
 *       {@link useFieldControl} resolves them, and it is the same resolution `FieldControl`
 *       applies to a native input, not a parallel one.
 *   (b) **Serialisation.** Its value reaches `new FormData(form)` under `name`, via
 *       {@link FieldHiddenInput}. `form` associates it with a form it is not nested inside; a
 *       disabled control does not serialise, exactly as a native one does not.
 *   (c) **Validation — explicitly, only where it is real.** A hidden input is *barred from
 *       constraint validation* by the HTML standard, so `required` on a composite is **not**
 *       browser-enforced and `:invalid` does not match. Two composites escape this because they
 *       own a real, focusable native input and put `required` on that (`OTPInput`'s digit boxes,
 *       `ColorPicker`'s hex field); every other composite documents on its own `required` prop
 *       that the obligation is advisory and the invalid channel is `aria-invalid` +
 *       `FieldError`, which is what `Form`'s `focusInvalidOnSubmit` already looks for.
 *
 * Clause (c) is deliberately a documented non-promise rather than a hidden input with
 * `required` on it: that combination silently never blocks a submit, which is worse than a
 * consumer knowing they own the check.
 */

/** The resolved association attributes a composite control spreads onto its focusable element. */
interface FieldControlAria {
  id: string | undefined;
  "aria-labelledby": string | undefined;
  "aria-describedby": string | undefined;
  "aria-errormessage": string | undefined;
  "aria-invalid": React.AriaAttributes["aria-invalid"];
}

interface UseFieldControlOptions extends FieldControlElementProps {
  /**
   * The id of an element whose text should *follow* the Field label in the accessible name,
   * for a control whose own content carries its value — a Popover trigger showing the selected
   * date reads "Start date 4 Aug 2026" rather than collapsing to "Start date".
   *
   * A separate element rather than the control referencing itself: `aria-labelledby="label
   * self"` is legal and works in browsers, but the accessible-name implementation testing
   * libraries use returns nothing for the self reference, so the composition could not be
   * proved by a test. An id on the value element is unambiguous for both.
   */
  contentLabelId?: string;
}

/**
 * Resolve the association attributes for one control inside a {@link Field}.
 *
 * Explicit props always win: an `aria-label` suppresses the Field label, an explicit
 * `aria-labelledby`/`aria-describedby` is used as given (descriptions and errors are merged
 * into `aria-describedby` rather than replacing it), and an explicit `aria-invalid` overrides
 * the Field's. Outside a `Field` every value falls through to `undefined`, so a composite can
 * spread the result unconditionally.
 */
function useFieldControl({
  contentLabelId,
  ...aria
}: UseFieldControlOptions = {}): FieldControlAria {
  const context = React.useContext(FieldContext);
  const id = aria.id ?? context?.controlId;
  const explicitLabelledBy = mergeIdRefs(aria["aria-labelledby"]);
  const fieldLabelId = aria["aria-label"] || !context?.hasLabel ? undefined : context.labelId;
  const labelledBy =
    explicitLabelledBy ??
    (fieldLabelId && contentLabelId ? mergeIdRefs(fieldLabelId, contentLabelId) : fieldLabelId);

  return {
    id,
    "aria-labelledby": labelledBy,
    "aria-describedby": mergeIdRefs(
      aria["aria-describedby"],
      context?.hasDescription ? context.descriptionId : undefined,
      context?.hasError ? context.errorId : undefined,
    ),
    "aria-errormessage": mergeIdRefs(
      aria["aria-errormessage"],
      context?.hasError ? context.errorId : undefined,
    ),
    "aria-invalid": aria["aria-invalid"] ?? (context?.invalid ? true : undefined),
  };
}

interface FieldHiddenInputProps {
  /** Omit and nothing is rendered — a composite without a `name` makes no submission promise. */
  name?: string;
  /** The canonical, locale-independent serialisation of the control's value. */
  value: string | number;
  /** Associate with a form this control is not nested inside, by form `id`. */
  form?: string;
  /** A disabled control does not submit, so the attribute is mirrored rather than the node dropped. */
  disabled?: boolean;
}

/**
 * The canonical submitted value of a composite control.
 *
 * `type="hidden"` on purpose: it is never a tab stop, never carries an accessible name, and is
 * skipped by `focusFirstInvalidControl`, so adding one cannot introduce a second focus stop or
 * a duplicate name for the widget it belongs to. It is also, by the same token, exempt from
 * constraint validation — see clause (c) of the contract above.
 */
function FieldHiddenInput({ name, value, form, disabled }: FieldHiddenInputProps) {
  if (!name) {
    return null;
  }
  return (
    <input
      type="hidden"
      data-slot="field-hidden-input"
      name={name}
      value={value}
      form={form}
      disabled={disabled}
    />
  );
}

type FieldControlProps = useRender.ComponentProps<"input">;

function FieldControl({ render, ...props }: FieldControlProps) {
  const renderProps = React.isValidElement<FieldControlElementProps>(render) ? render.props : {};
  const aria = useFieldControl({
    id: renderProps.id ?? props.id,
    "aria-label": renderProps["aria-label"] ?? props["aria-label"],
    "aria-labelledby": mergeIdRefs(renderProps["aria-labelledby"], props["aria-labelledby"]),
    "aria-describedby": mergeIdRefs(renderProps["aria-describedby"], props["aria-describedby"]),
    "aria-errormessage": mergeIdRefs(renderProps["aria-errormessage"], props["aria-errormessage"]),
    "aria-invalid": renderProps["aria-invalid"] ?? props["aria-invalid"],
  });
  const resolvedRender = React.isValidElement<FieldControlElementProps>(render)
    ? React.cloneElement(render, aria)
    : render;

  return useRender({
    defaultTagName: "input",
    props: { ...props, ...aria },
    render: resolvedRender,
    state: {
      slot: "field-control",
    },
  });
}

function FieldLabel({ className, id, htmlFor, ...props }: React.ComponentProps<typeof Label>) {
  const context = React.useContext(FieldContext);
  return (
    <Label
      data-slot="field-label"
      id={id ?? context?.labelId}
      htmlFor={htmlFor ?? context?.controlId}
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-disabled has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border *:data-[slot=field]:p-2.5 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-disabled",
        className,
      )}
      {...props}
    />
  );
}

function FieldDescription({ className, id, ...props }: React.ComponentProps<"p">) {
  const context = React.useContext(FieldContext);
  return (
    <p
      data-slot="field-description"
      id={id ?? context?.descriptionId}
      className={cn(
        "text-start text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5",
        "last:mt-0 nth-last-2:-mt-1",
        "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className,
      )}
      {...props}
    />
  );
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
        className,
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

function FieldError({
  className,
  children,
  errors,
  id,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>;
}) {
  const context = React.useContext(FieldContext);
  const content = React.useMemo(() => {
    if (children) {
      return children;
    }

    if (!errors?.length) {
      return null;
    }

    const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];

    if (uniqueErrors?.length === 1) {
      return uniqueErrors[0]?.message;
    }

    return (
      <ul className="ms-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error) => error?.message && <li key={error.message}>{error.message}</li>,
        )}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      id={id ?? context?.errorId}
      className={cn("text-sm font-normal text-destructive", className)}
      {...props}
    >
      {content}
    </div>
  );
}

export type {
  FieldControlAria,
  FieldControlProps,
  FieldHiddenInputProps,
  FieldProps,
  UseFieldControlOptions,
};
export {
  Field,
  FieldContent,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldHiddenInput,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
  useFieldControl,
};
