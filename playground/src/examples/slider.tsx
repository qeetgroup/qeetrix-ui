import { AngleSlider, Label, Slider } from "@qeetrix/ui";
import { useId, useState } from "react";
import { formatInr, formatInrCompact } from "../data/qeet";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

function asArray(value: number | readonly number[]): readonly number[] {
  return typeof value === "number" ? [value] : value;
}

function IdleTimeoutDemo() {
  const labelId = useId();
  const [minutes, setMinutes] = useState(30);
  return (
    <div className="flex w-72 flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label id={labelId}>Idle session timeout</Label>
        <output aria-labelledby={labelId} className="text-sm tabular-nums text-muted-foreground">
          {minutes} min
        </output>
      </div>
      <Slider
        aria-labelledby={labelId}
        value={minutes}
        onValueChange={(value) => setMinutes(asArray(value)[0] ?? 30)}
        getAriaValueText={(_formatted, value) => `${value} minutes`}
        min={5}
        max={120}
        step={5}
      />
    </div>
  );
}

function AmountRangeDemo() {
  const labelId = useId();
  const [range, setRange] = useState<readonly number[]>([25000, 250000]);
  const [low = 0, high = 0] = range;
  return (
    <div className="flex w-72 flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <Label id={labelId}>Invoice total</Label>
        <output aria-labelledby={labelId} className="text-sm tabular-nums text-muted-foreground">
          {formatInrCompact(low)} – {formatInrCompact(high)}
        </output>
      </div>
      <Slider
        aria-labelledby={labelId}
        value={range}
        onValueChange={(value) => setRange(asArray(value))}
        min={0}
        max={500000}
        step={5000}
        minStepsBetweenValues={2}
      />
      <p className="text-caption text-muted-foreground">
        Showing invoices between {formatInr(low)} and {formatInr(high)}, GST included.
      </p>
    </div>
  );
}

function RetentionDemo() {
  const labelId = useId();
  const [days, setDays] = useState(90);
  return (
    <div className="flex w-72 flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label id={labelId}>Log retention</Label>
        <output aria-labelledby={labelId} className="text-sm tabular-nums text-muted-foreground">
          {days} days
        </output>
      </div>
      <Slider
        aria-labelledby={labelId}
        value={days}
        onValueChange={(value) => setDays(asArray(value)[0] ?? 90)}
        min={30}
        max={365}
        step={15}
      />
      <div aria-hidden className="flex justify-between text-caption text-muted-foreground">
        <span>30 days</span>
        <span>1 year</span>
      </div>
    </div>
  );
}

function GradientAngleDemo() {
  const [angle, setAngle] = useState(135);
  return (
    <div className="flex items-center gap-4">
      <AngleSlider value={angle} onValueChange={setAngle} aria-label="Login background angle" />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Background angle</span>
        <output className="text-sm tabular-nums text-muted-foreground">{angle}°</output>
        <div
          aria-hidden
          className="h-8 w-24 rounded-md border"
          style={{
            backgroundImage: `linear-gradient(${angle}deg, var(--qx-color-surface-sunken), var(--color-primary))`,
          }}
        />
      </div>
    </div>
  );
}

const sliderControls = {
  min: num(0, { label: "min" }),
  max: num(100, { label: "max" }),
  step: num(5, { min: 1, label: "step" }),
  defaultValue: num(40, { label: "Default value" }),
  range: bool(false, "Range (two thumbs)"),
  orientation: select(["horizontal", "vertical"] as const, "horizontal"),
  disabled: bool(false),
  "aria-label": text("Alert threshold (%)", "aria-label"),
};

const angleSliderControls = {
  defaultValue: num(135, { min: 0, max: 359, label: "Default value" }),
  size: num(80, { min: 40, max: 200, step: 8, label: "size (px)" }),
  step: num(1, { min: 1, max: 90, label: "step (°)" }),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
  "aria-label": text("Gradient angle", "aria-label"),
};

export const examples: FamilyExamples = {
  slider: {
    minHeight: 300,
    demos: [
      {
        name: "Default",
        description: "Controlled, with the value read out beside the label.",
        render: () => <IdleTimeoutDemo />,
      },
      {
        name: "Range",
        description: "An array value renders one thumb per entry.",
        render: () => <AmountRangeDemo />,
      },
      {
        name: "Steps",
        render: () => <RetentionDemo />,
      },
      {
        name: "Vertical",
        render: () => (
          <div className="flex h-40 items-stretch gap-6">
            <Slider orientation="vertical" defaultValue={70} aria-label="Email volume" />
            <Slider orientation="vertical" defaultValue={45} aria-label="SMS volume" />
            <Slider orientation="vertical" defaultValue={20} aria-label="WhatsApp volume" />
          </div>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <div className="flex w-72 flex-col gap-3">
            <p className="text-sm font-medium text-muted-foreground">Rate limit (requests / min)</p>
            <Slider
              defaultValue={600}
              min={60}
              max={1200}
              disabled
              aria-label="Rate limit (requests / min)"
            />
            <p className="text-caption text-muted-foreground">Fixed at 600 on the Growth plan.</p>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: sliderControls,
      render: (v) => {
        const low = Math.min(Math.max(v.defaultValue, v.min), v.max);
        const value = v.range ? [low, Math.min(v.max, low + (v.max - v.min) / 3)] : low;
        return (
          <div className={v.orientation === "vertical" ? "h-48" : "w-72"}>
            <Slider
              key={`${v.range}-${v.defaultValue}-${v.min}-${v.max}`}
              defaultValue={value}
              min={v.min}
              max={v.max}
              step={v.step}
              orientation={v.orientation}
              disabled={v.disabled}
              aria-label={v["aria-label"]}
            />
          </div>
        );
      },
      code: (v) => {
        const low = Math.min(Math.max(v.defaultValue, v.min), v.max);
        const high = Math.min(v.max, low + (v.max - v.min) / 3);
        return jsx("Slider", {
          defaultValue: v.range ? expr(`[${low}, ${high}]`) : low,
          ...changedProps(v, sliderControls, ["min", "max", "step", "orientation", "disabled"]),
          "aria-label": v["aria-label"],
        });
      },
    }),
  },

  "angle-slider": {
    minHeight: 200,
    demos: [
      {
        name: "Default",
        description: "Drag the thumb, or use the arrow keys (Page Up/Down for 10× steps).",
        render: () => <GradientAngleDemo />,
      },
      {
        name: "Sizes",
        render: () => (
          <div className="flex items-end gap-4">
            <AngleSlider size={48} defaultValue={45} aria-label="Icon rotation, small" />
            <AngleSlider size={80} defaultValue={90} aria-label="Icon rotation, default" />
            <AngleSlider size={120} defaultValue={270} aria-label="Icon rotation, large" />
          </div>
        ),
      },
      {
        name: "15° steps",
        render: () => (
          <AngleSlider step={15} defaultValue={30} aria-label="Watermark angle on invoice PDF" />
        ),
      },
      {
        name: "Disabled and read-only",
        render: () => (
          <div className="flex items-center gap-4">
            <AngleSlider disabled defaultValue={45} aria-label="Gradient angle (disabled)" />
            <AngleSlider readOnly defaultValue={200} aria-label="Gradient angle (read-only)" />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: angleSliderControls,
      render: (v) => (
        <AngleSlider
          key={v.defaultValue}
          defaultValue={v.defaultValue}
          size={v.size}
          step={v.step}
          disabled={v.disabled}
          readOnly={v.readOnly}
          aria-label={v["aria-label"]}
        />
      ),
      code: (v) =>
        jsx("AngleSlider", {
          defaultValue: v.defaultValue,
          ...changedProps(v, angleSliderControls, ["size", "step", "disabled", "readOnly"]),
          "aria-label": v["aria-label"],
        }),
    }),
  },
};
