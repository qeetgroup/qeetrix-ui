import {
  Input,
  Label,
  NumberField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@qeetrix/ui";
import { useId } from "react";
import type { Control, Controls, ControlValue, Values } from "../registry/types";

/** "aria-label" → "Aria label", "defaultOpen" → "Default open". */
export function humanise(name: string): string {
  const spaced = name
    .replace(/[-_]/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** URL query ⇄ control values. Values are stored as `p.<name>`; defaults are omitted. */
export function valuesFromQuery(controls: Controls, query: URLSearchParams): Values {
  const values: Values = {};
  for (const [name, control] of Object.entries(controls)) {
    const raw = query.get(`p.${name}`);
    if (raw === null) {
      values[name] = control.default;
      continue;
    }
    values[name] = parseControlValue(control, raw);
  }
  return values;
}

function parseControlValue(control: Control, raw: string): ControlValue {
  switch (control.kind) {
    case "boolean":
      return raw === "1" || raw === "true";
    case "number": {
      const value = Number(raw);
      if (!Number.isFinite(value)) return control.default;
      const min = control.min ?? Number.NEGATIVE_INFINITY;
      const max = control.max ?? Number.POSITIVE_INFINITY;
      return Math.min(max, Math.max(min, value));
    }
    case "select":
      return control.options.includes(raw) ? raw : control.default;
    case "text":
      return raw.slice(0, 2000);
  }
}

export function queryPatchFor(
  name: string,
  control: Control,
  value: ControlValue,
): Record<string, string | null> {
  if (value === control.default) return { [`p.${name}`]: null };
  if (typeof value === "boolean") return { [`p.${name}`]: value ? "1" : "0" };
  return { [`p.${name}`]: String(value) };
}

/** The props panel: one labelled library control per playground control. */
export function ControlsPanel({
  controls,
  values,
  onChange,
}: {
  controls: Controls;
  values: Values;
  onChange: (name: string, value: ControlValue) => void;
}) {
  const entries = Object.entries(controls);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">This module has no configurable props.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {entries.map(([name, control]) => (
        <ControlRow
          key={name}
          name={name}
          control={control}
          value={values[name] ?? control.default}
          onChange={(value) => onChange(name, value)}
        />
      ))}
    </div>
  );
}

function ControlRow({
  name,
  control,
  value,
  onChange,
}: {
  name: string;
  control: Control;
  value: ControlValue;
  onChange: (value: ControlValue) => void;
}) {
  const id = useId();
  const label = control.label ?? humanise(name);
  const changed = value !== control.default;
  const caption = (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="truncate">{label}</span>
      <code className="truncate font-mono text-micro font-normal text-muted-foreground">
        {name}
      </code>
      {changed && <span className="sr-only">(changed)</span>}
    </span>
  );

  if (control.kind === "boolean") {
    return (
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="min-w-0">
          {caption}
        </Label>
        <Switch id={id} checked={value === true} onCheckedChange={(checked) => onChange(checked)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} id={`${id}-label`}>
        {caption}
      </Label>
      {control.kind === "select" && (
        <Select value={String(value)} onValueChange={(next) => onChange(String(next))}>
          <SelectTrigger id={id} size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {control.options.map((option) => (
              <SelectItem key={option} value={option}>
                <span className="font-mono text-xs">{option}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {control.kind === "text" &&
        (control.multiline ? (
          <Textarea
            id={id}
            value={String(value)}
            rows={3}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <Input id={id} value={String(value)} onChange={(event) => onChange(event.target.value)} />
        ))}
      {control.kind === "number" && (
        <NumberField
          aria-labelledby={`${id}-label`}
          value={typeof value === "number" ? value : control.default}
          min={control.min}
          max={control.max}
          step={control.step}
          onValueChange={(next) => onChange(next ?? control.default)}
          className="w-full"
        />
      )}
    </div>
  );
}
