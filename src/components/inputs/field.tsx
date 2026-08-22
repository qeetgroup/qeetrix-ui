"use client";

import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Label } from "@/components/utility/label";
import { Separator } from "@/components/utility/separator";
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
        "flex flex-col gap-[var(--qx-density-field-gap,1rem)] has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
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
        "group/field-group @container/field-group flex w-full flex-col gap-[var(--qx-density-field-gap,1.25rem)] data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-[var(--qx-density-field-gap,1rem)]",
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

type FieldControlProps = useRender.ComponentProps<"input">;

function FieldControl({ render, ...props }: FieldControlProps) {
  const context = React.useContext(FieldContext);
  const renderProps = React.isValidElement<FieldControlElementProps>(render) ? render.props : {};
  const id = renderProps.id ?? props.id ?? context?.controlId;
  const explicitLabelledBy = mergeIdRefs(renderProps["aria-labelledby"], props["aria-labelledby"]);
  const labelledBy =
    explicitLabelledBy ??
    (renderProps["aria-label"] || props["aria-label"] || !context?.hasLabel
      ? undefined
      : context.labelId);
  const describedBy = mergeIdRefs(
    renderProps["aria-describedby"],
    props["aria-describedby"],
    context?.hasDescription ? context.descriptionId : undefined,
    context?.hasError ? context.errorId : undefined,
  );
  const errorMessage = mergeIdRefs(
    renderProps["aria-errormessage"],
    props["aria-errormessage"],
    context?.hasError ? context.errorId : undefined,
  );
  const invalid =
    renderProps["aria-invalid"] ?? props["aria-invalid"] ?? (context?.invalid ? true : undefined);
  const resolvedRender = React.isValidElement<FieldControlElementProps>(render)
    ? React.cloneElement(render, {
        id,
        "aria-labelledby": labelledBy,
        "aria-describedby": describedBy,
        "aria-errormessage": errorMessage,
        "aria-invalid": invalid,
      })
    : render;

  return useRender({
    defaultTagName: "input",
    props: {
      ...props,
      id,
      "aria-labelledby": labelledBy,
      "aria-describedby": describedBy,
      "aria-errormessage": errorMessage,
      "aria-invalid": invalid,
    },
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

export type { FieldControlProps, FieldProps };
export {
  Field,
  FieldContent,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
};
