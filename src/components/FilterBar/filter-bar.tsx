"use client";

import { PlusIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/Button/button";
import { Chip } from "@/components/Badge/chip";
import { Input } from "@/components/Input/input";
import { Combobox } from "@/components/Combobox/combobox";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/Popover/popover";
import type { MessagesFor } from "@/lib/messages";
import { filterBarMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

const DEFAULT_OPERATORS = ["is", "is not", "contains"];

interface FilterField {
  key: string;
  label: string;
  /** Predefined value options (renders a picker); omit for free-text. */
  options?: { label: string; value: string }[];
  /** Operators offered for this field. Defaults to is / is not / contains. */
  operators?: string[];
}

interface ActiveFilter {
  field: string;
  operator: string;
  value: string;
}

interface FilterBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  fields: FilterField[];
  value: ActiveFilter[];
  onValueChange: (filters: ActiveFilter[]) => void;
  /**
   * Label of the control that opens the builder. Equivalent to `messages={{ addFilter }}` and
   * wins over it.
   */
  addLabel?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"filterBar">;
}

/**
 * Faceted filter bar — active filters render as removable chips; "Add filter"
 * opens a field → operator → value builder. Controlled via `value` / `onValueChange`.
 */
function FilterBar({
  fields,
  value,
  onValueChange,
  addLabel,
  messages: messageOverrides,
  className,
  ...props
}: FilterBarProps) {
  const messages = useMessages("filterBar", filterBarMessages, messageOverrides);
  const [open, setOpen] = React.useState(false);
  const [field, setField] = React.useState<string | null>(null);
  const [operator, setOperator] = React.useState<string | null>(null);
  const [val, setVal] = React.useState("");

  const fieldDef = fields.find((f) => f.key === field);
  const operators = fieldDef?.operators ?? DEFAULT_OPERATORS;

  const reset = () => {
    setField(null);
    setOperator(null);
    setVal("");
  };
  const add = () => {
    if (!field || !operator || !val) return;
    onValueChange([...value, { field, operator, value: val }]);
    reset();
    setOpen(false);
  };
  const remove = (i: number) => onValueChange(value.filter((_, idx) => idx !== i));

  const labelFor = (f: ActiveFilter) => {
    const fd = fields.find((x) => x.key === f.field);
    const valLabel = fd?.options?.find((o) => o.value === f.value)?.label ?? f.value;
    return `${fd?.label ?? f.field} ${f.operator} ${valLabel}`;
  };

  return (
    <div
      data-slot="filter-bar"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    >
      {value.map((f, i) => {
        const chipKey = `filter-${i}`;
        return (
          <Chip key={chipKey} size="sm" onRemove={() => remove(i)}>
            {labelFor(f)}
          </Chip>
        );
      })}

      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm" className="gap-1 border-dashed">
              <PlusIcon aria-hidden className="size-3.5" />
              {addLabel ?? messages.addFilter}
            </Button>
          }
        />
        <PopoverContent align="start" className="w-64 space-y-2">
          <Combobox
            items={fields.map((f) => ({ label: f.label, value: f.key }))}
            value={field}
            onValueChange={(v) => {
              setField(v);
              setOperator(null);
              setVal("");
            }}
            placeholder={messages.fieldPlaceholder}
          />
          {field && (
            <Combobox
              items={operators.map((o) => ({ label: o, value: o }))}
              value={operator}
              onValueChange={setOperator}
              placeholder={messages.operatorPlaceholder}
            />
          )}
          {field &&
            operator &&
            (fieldDef?.options ? (
              <Combobox
                items={fieldDef.options}
                value={val || null}
                onValueChange={(v) => setVal(v ?? "")}
                placeholder={messages.valuePlaceholder}
              />
            ) : (
              <Input
                value={val}
                onChange={(e) => setVal(e.target.value)}
                placeholder={messages.valuePlaceholder}
                aria-label={messages.value}
              />
            ))}
          <div className="flex justify-end gap-2 pt-1">
            <PopoverClose
              render={
                <Button variant="ghost" size="sm">
                  {messages.cancel}
                </Button>
              }
            />
            <Button size="sm" disabled={!field || !operator || !val} onClick={add}>
              {messages.add}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => onValueChange([])}
        >
          {messages.clearAll}
        </Button>
      )}
    </div>
  );
}

export type { ActiveFilter, FilterBarProps, FilterField };
export { FilterBar };
