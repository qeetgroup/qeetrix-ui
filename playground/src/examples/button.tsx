import {
  BoldIcon,
  ChevronDownIcon,
  CircleQuestionMarkIcon,
  DownloadIcon,
  EllipsisIcon,
  ItalicIcon,
  KeyRoundIcon,
  PlusIcon,
  RefreshCwIcon,
  Settings2Icon,
  TextAlignCenterIcon,
  TextAlignEndIcon,
  TextAlignStartIcon,
  TrashIcon,
  UnderlineIcon,
} from "@qeetrix/icons";
import {
  Button,
  ButtonGroup,
  ButtonGroupItem,
  CloseButton,
  DirectionProvider,
  IconButton,
  SegmentedControl,
  SegmentedControlItem,
  Toggle,
  ToggleGroup,
  ToggleTip,
  ToggleTipContent,
  ToggleTipTrigger,
} from "@qeetrix/ui";
import { useEffect, useState } from "react";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const buttonVariants = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;
const buttonSizes = ["default", "xs", "sm", "lg"] as const;

const buttonControls = {
  variant: select(buttonVariants, "default"),
  size: select(buttonSizes, "default"),
  children: text("Invite member", "Label"),
  icon: bool(true, "Leading icon"),
  disabled: bool(false),
  loading: bool(false),
  loadingLabel: text("", "Loading label"),
};

const iconButtonControls = {
  variant: select(["ghost", "outline", "secondary", "default", "destructive"] as const, "ghost"),
  size: select(["icon-xs", "icon-sm", "icon", "icon-lg"] as const, "icon"),
  "aria-label": text("Workspace settings", "aria-label"),
  disabled: bool(false),
  loading: bool(false),
};

const segmentedControls = {
  size: select(["sm", "md", "lg"] as const, "md"),
  orientation: select(["horizontal", "vertical"] as const, "horizontal"),
  fullWidth: bool(false, "Full width"),
  disabled: bool(false),
};

const toggleControls = {
  variant: select(["default", "outline"] as const, "default"),
  size: select(["default", "sm", "lg"] as const, "default"),
  defaultPressed: bool(true, "Pressed"),
  disabled: bool(false),
};

/** Click to start a save; the button stays focused and busy for two seconds. */
function LoadingButtons() {
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!saving) return;
    const timer = window.setTimeout(() => setSaving(false), 2000);
    return () => window.clearTimeout(timer);
  }, [saving]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button loading={saving} loadingLabel="Saving…" onClick={() => setSaving(true)}>
        Save changes
      </Button>
      <Button variant="outline" loading>
        <RefreshCwIcon data-icon="inline-start" aria-hidden />
        Syncing SCIM
      </Button>
      <Button variant="secondary" loading loadingLabel="Exporting…">
        Export CSV
      </Button>
    </div>
  );
}

export const examples: FamilyExamples = {
  button: {
    demos: [
      {
        name: "Variants",
        description:
          "Primary for the one main action, secondary and outline beside it, ghost in toolbars.",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            <Button>
              <PlusIcon data-icon="inline-start" aria-hidden />
              Invite member
            </Button>
            <Button variant="secondary">Export CSV</Button>
            <Button variant="outline">Cancel</Button>
            <Button variant="ghost">Skip for now</Button>
            <Button variant="destructive">
              <TrashIcon data-icon="inline-start" aria-hidden />
              Revoke key
            </Button>
            <Button variant="link">View audit log</Button>
          </div>
        ),
      },
      {
        name: "Sizes",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" variant="outline" aria-label="Refresh">
              <RefreshCwIcon aria-hidden />
            </Button>
          </div>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled>Save changes</Button>
            <Button variant="outline" disabled>
              Cancel
            </Button>
            <Button variant="ghost" disabled>
              Skip
            </Button>
          </div>
        ),
      },
      {
        name: "Loading",
        description:
          "`loading` keeps the colour and focus, swaps the leading icon for a spinner and sets `aria-busy`; `loadingLabel` replaces the label at the same width.",
        render: () => <LoadingButtons />,
      },
      {
        name: "Invalid",
        description:
          "`aria-invalid` draws the destructive ring, e.g. a submit that failed validation.",
        render: () => (
          <Button variant="outline" aria-invalid>
            Verify domain
          </Button>
        ),
      },
    ],
    playground: definePlayground({
      controls: buttonControls,
      render: (v) => (
        <Button
          variant={v.variant}
          size={v.size}
          disabled={v.disabled}
          loading={v.loading}
          loadingLabel={v.loadingLabel || undefined}
        >
          {v.icon && <PlusIcon data-icon="inline-start" aria-hidden />}
          {v.children}
        </Button>
      ),
      code: (v) =>
        jsx(
          "Button",
          changedProps(v, buttonControls, [
            "variant",
            "size",
            "disabled",
            "loading",
            "loadingLabel",
          ]),
          [v.icon ? '<PlusIcon data-icon="inline-start" aria-hidden />' : "", v.children],
        ),
    }),
  },

  "button-group": {
    demos: [
      {
        name: "Split action",
        render: () => (
          <ButtonGroup aria-label="Export">
            <ButtonGroupItem variant="outline">
              <DownloadIcon data-icon="inline-start" aria-hidden />
              Export invoices
            </ButtonGroupItem>
            <ButtonGroupItem variant="outline" size="icon" aria-label="More export formats">
              <ChevronDownIcon aria-hidden />
            </ButtonGroupItem>
          </ButtonGroup>
        ),
      },
      {
        name: "Range filter",
        render: () => (
          <ButtonGroup aria-label="Time range">
            <ButtonGroupItem variant="outline">24h</ButtonGroupItem>
            <ButtonGroupItem variant="secondary">7d</ButtonGroupItem>
            <ButtonGroupItem variant="outline">30d</ButtonGroupItem>
            <ButtonGroupItem variant="outline">90d</ButtonGroupItem>
          </ButtonGroup>
        ),
      },
      {
        name: "Vertical",
        render: () => (
          <ButtonGroup orientation="vertical" aria-label="Session actions">
            <ButtonGroupItem variant="outline">Sign out here</ButtonGroupItem>
            <ButtonGroupItem variant="outline">Sign out elsewhere</ButtonGroupItem>
            <ButtonGroupItem variant="outline" disabled>
              Sign out everywhere
            </ButtonGroupItem>
          </ButtonGroup>
        ),
      },
    ],
    playground: definePlayground({
      controls: {
        orientation: select(["horizontal", "vertical"] as const, "horizontal"),
        variant: select(["outline", "secondary", "default"] as const, "outline"),
        size: select(["default", "sm", "lg"] as const, "default"),
      },
      render: (v) => (
        <ButtonGroup orientation={v.orientation} aria-label="Environment">
          {["Production", "Staging", "Development"].map((label) => (
            <ButtonGroupItem key={label} variant={v.variant} size={v.size}>
              {label}
            </ButtonGroupItem>
          ))}
        </ButtonGroup>
      ),
      code: (v) =>
        jsx(
          "ButtonGroup",
          {
            orientation: v.orientation === "horizontal" ? undefined : v.orientation,
            "aria-label": "Environment",
          },
          ["Production", "Staging", "Development"].map((label) =>
            jsx(
              "ButtonGroupItem",
              { variant: v.variant, size: v.size === "default" ? undefined : v.size },
              label,
            ),
          ),
        ),
    }),
  },

  "close-button": {
    demos: [
      { name: "Default", render: () => <CloseButton /> },
      {
        name: "Labelled",
        description: "Name what is being closed when more than one panel is open.",
        render: () => <CloseButton aria-label="Dismiss billing notice" size="icon" />,
      },
      {
        name: "Sizes",
        render: () => (
          <div className="flex items-center gap-2">
            <CloseButton size="icon-xs" aria-label="Remove filter" />
            <CloseButton aria-label="Close panel" />
            <CloseButton size="icon" aria-label="Close dialog" />
          </div>
        ),
      },
      { name: "Disabled", render: () => <CloseButton disabled /> },
    ],
    playground: definePlayground({
      controls: {
        size: select(["icon-xs", "icon-sm", "icon"] as const, "icon-sm"),
        variant: select(["ghost", "outline", "secondary"] as const, "ghost"),
        "aria-label": text("Close", "aria-label"),
        disabled: bool(false),
      },
      render: (v) => (
        <CloseButton
          size={v.size}
          variant={v.variant}
          aria-label={v["aria-label"]}
          disabled={v.disabled}
        />
      ),
      code: (v) =>
        jsx("CloseButton", {
          size: v.size === "icon-sm" ? undefined : v.size,
          variant: v.variant === "ghost" ? undefined : v.variant,
          "aria-label": v["aria-label"] === "Close" ? undefined : v["aria-label"],
          disabled: v.disabled,
        }),
    }),
  },

  "icon-button": {
    demos: [
      {
        name: "Variants",
        render: () => (
          <div className="flex items-center gap-2">
            <IconButton icon={Settings2Icon} aria-label="Workspace settings" />
            <IconButton icon={RefreshCwIcon} variant="outline" aria-label="Refresh sessions" />
            <IconButton icon={EllipsisIcon} variant="secondary" aria-label="More actions" />
            <IconButton icon={TrashIcon} variant="destructive" aria-label="Delete tenant" />
          </div>
        ),
      },
      {
        name: "Sizes",
        render: () => (
          <div className="flex items-center gap-2">
            <IconButton
              icon={KeyRoundIcon}
              size="icon-xs"
              variant="outline"
              aria-label="Rotate key"
            />
            <IconButton
              icon={KeyRoundIcon}
              size="icon-sm"
              variant="outline"
              aria-label="Rotate key"
            />
            <IconButton icon={KeyRoundIcon} variant="outline" aria-label="Rotate key" />
            <IconButton
              icon={KeyRoundIcon}
              size="icon-lg"
              variant="outline"
              aria-label="Rotate key"
            />
          </div>
        ),
      },
      {
        name: "Loading",
        description: "`loading` swaps the icon for the spinner in the same square.",
        render: () => (
          <IconButton
            icon={RefreshCwIcon}
            variant="outline"
            aria-label="Refreshing sessions"
            loading
          />
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <IconButton icon={TrashIcon} variant="outline" aria-label="Delete" disabled />
        ),
      },
    ],
    playground: definePlayground({
      controls: iconButtonControls,
      render: (v) => (
        <IconButton
          icon={Settings2Icon}
          variant={v.variant}
          size={v.size}
          aria-label={v["aria-label"]}
          disabled={v.disabled}
          loading={v.loading}
        />
      ),
      code: (v) =>
        jsx("IconButton", {
          icon: expr("Settings2Icon"),
          ...changedProps(v, iconButtonControls, ["variant", "size"]),
          "aria-label": v["aria-label"],
          disabled: v.disabled,
          loading: v.loading,
        }),
    }),
  },

  "segmented-control": {
    demos: [
      {
        name: "Default",
        render: () => (
          <SegmentedControl defaultValue="month" aria-label="Billing period">
            <SegmentedControlItem value="day">Day</SegmentedControlItem>
            <SegmentedControlItem value="week">Week</SegmentedControlItem>
            <SegmentedControlItem value="month">Month</SegmentedControlItem>
            <SegmentedControlItem value="quarter">Quarter</SegmentedControlItem>
          </SegmentedControl>
        ),
      },
      {
        name: "With icons, small",
        render: () => (
          <SegmentedControl size="sm" defaultValue="left" aria-label="Alignment">
            <SegmentedControlItem value="left" aria-label="Align left">
              <TextAlignStartIcon className="size-4" aria-hidden />
            </SegmentedControlItem>
            <SegmentedControlItem value="center" aria-label="Align centre">
              <TextAlignCenterIcon className="size-4" aria-hidden />
            </SegmentedControlItem>
            <SegmentedControlItem value="right" aria-label="Align right">
              <TextAlignEndIcon className="size-4" aria-hidden />
            </SegmentedControlItem>
          </SegmentedControl>
        ),
      },
      {
        name: "Vertical",
        render: () => (
          <SegmentedControl
            orientation="vertical"
            defaultValue="sessions"
            aria-label="Security section"
          >
            <SegmentedControlItem value="passkeys">Passkeys</SegmentedControlItem>
            <SegmentedControlItem value="sessions">Sessions</SegmentedControlItem>
            <SegmentedControlItem value="recovery">Recovery codes</SegmentedControlItem>
          </SegmentedControl>
        ),
      },
      {
        name: "Right-to-left",
        description:
          'Under `dir="rtl"` the segments mirror, the indicator lands under the selection and the arrow keys follow the reading direction.',
        render: () => (
          <DirectionProvider direction="rtl" locale="ar">
            <SegmentedControl defaultValue="week" aria-label="الفترة">
              <SegmentedControlItem value="day">يوم</SegmentedControlItem>
              <SegmentedControlItem value="week">أسبوع</SegmentedControlItem>
              <SegmentedControlItem value="month">شهر</SegmentedControlItem>
            </SegmentedControl>
          </DirectionProvider>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <SegmentedControl defaultValue="live" disabled aria-label="Mode">
            <SegmentedControlItem value="test">Test mode</SegmentedControlItem>
            <SegmentedControlItem value="live">Live mode</SegmentedControlItem>
          </SegmentedControl>
        ),
      },
    ],
    playground: definePlayground({
      controls: segmentedControls,
      render: (v) => (
        <div className={v.fullWidth ? "w-96" : undefined}>
          <SegmentedControl
            size={v.size}
            orientation={v.orientation}
            fullWidth={v.fullWidth}
            disabled={v.disabled}
            defaultValue="week"
            aria-label="Report range"
          >
            <SegmentedControlItem value="day">Day</SegmentedControlItem>
            <SegmentedControlItem value="week">Week</SegmentedControlItem>
            <SegmentedControlItem value="month">Month</SegmentedControlItem>
          </SegmentedControl>
        </div>
      ),
      code: (v) =>
        jsx(
          "SegmentedControl",
          {
            ...changedProps(v, segmentedControls),
            defaultValue: "week",
            "aria-label": "Report range",
          },
          [
            '<SegmentedControlItem value="day">Day</SegmentedControlItem>',
            '<SegmentedControlItem value="week">Week</SegmentedControlItem>',
            '<SegmentedControlItem value="month">Month</SegmentedControlItem>',
          ],
        ),
    }),
  },

  toggle: {
    demos: [
      {
        name: "Formatting group",
        render: () => (
          <ToggleGroup aria-label="Text formatting" multiple defaultValue={["bold"]}>
            <Toggle value="bold" aria-label="Bold">
              <BoldIcon aria-hidden />
            </Toggle>
            <Toggle value="italic" aria-label="Italic">
              <ItalicIcon aria-hidden />
            </Toggle>
            <Toggle value="underline" aria-label="Underline">
              <UnderlineIcon aria-hidden />
            </Toggle>
          </ToggleGroup>
        ),
      },
      {
        name: "Outline, with label",
        render: () => (
          <Toggle variant="outline" defaultPressed>
            Show archived tenants
          </Toggle>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Toggle variant="outline" disabled aria-label="Bold">
            <BoldIcon aria-hidden />
          </Toggle>
        ),
      },
    ],
    playground: definePlayground({
      controls: toggleControls,
      render: (v) => (
        <Toggle
          key={String(v.defaultPressed)}
          variant={v.variant}
          size={v.size}
          defaultPressed={v.defaultPressed}
          disabled={v.disabled}
        >
          <BoldIcon aria-hidden />
          Bold
        </Toggle>
      ),
      code: (v) =>
        jsx(
          "Toggle",
          {
            variant: v.variant === "default" ? undefined : v.variant,
            size: v.size === "default" ? undefined : v.size,
            defaultPressed: v.defaultPressed,
            disabled: v.disabled,
          },
          ["<BoldIcon aria-hidden />", "Bold"],
        ),
    }),
  },

  "toggle-tip": {
    demos: [
      {
        name: "Inline help",
        description: "Click (not hover) to open; Escape closes and returns focus to the trigger.",
        render: () => (
          <div className="flex items-center gap-1 text-sm">
            <span>Data residency</span>
            <ToggleTip>
              <ToggleTipTrigger label="About data residency" />
              <ToggleTipContent>
                Tenant data for Acme India is stored in <strong>ap-south-1 (Mumbai)</strong> and
                never leaves India, as required by the DPDP Act.
              </ToggleTipContent>
            </ToggleTip>
          </div>
        ),
      },
      {
        name: "Custom icon",
        render: () => (
          <div className="flex items-center gap-1 text-sm">
            <span>GSTIN</span>
            <ToggleTip>
              <ToggleTipTrigger
                label="What is a GSTIN?"
                icon={<CircleQuestionMarkIcon className="size-4" aria-hidden />}
              />
              <ToggleTipContent side="right">
                The 15-character GST identification number printed on every tax invoice.
              </ToggleTipContent>
            </ToggleTip>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: {
        label: text("About passkeys", "Trigger label"),
        content: text(
          "Passkeys replace passwords with a device-bound key. Nothing to phish, nothing to reuse.",
        ),
        side: select(["top", "right", "bottom", "left"] as const, "bottom"),
      },
      render: (v) => (
        <ToggleTip>
          <ToggleTipTrigger label={v.label} />
          <ToggleTipContent side={v.side}>{v.content}</ToggleTipContent>
        </ToggleTip>
      ),
      code: (v) =>
        jsx("ToggleTip", {}, [
          jsx("ToggleTipTrigger", { label: v.label }),
          jsx("ToggleTipContent", { side: v.side === "bottom" ? undefined : v.side }, v.content),
        ]),
    }),
  },
};
