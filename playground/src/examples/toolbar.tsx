import {
  BoldIcon,
  BracesIcon,
  Columns2Icon,
  DownloadIcon,
  FunnelIcon,
  type IconProps,
  ItalicIcon,
  LinkIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SendIcon,
  TextAlignCenterIcon,
  TextAlignEndIcon,
  TextAlignStartIcon,
  UnderlineIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@qeetrix/icons";
import {
  Input,
  Toggle,
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarLink,
  ToolbarSeparator,
  ToolbarSpacer,
} from "@qeetrix/ui";
import { type ComponentType, useState } from "react";
import { users } from "../data/qeet";
import { changedProps, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select } from "../registry/types";

const marks: readonly { id: string; label: string; icon: ComponentType<IconProps<"outline">> }[] = [
  { id: "bold", label: "Bold", icon: BoldIcon },
  { id: "italic", label: "Italic", icon: ItalicIcon },
  { id: "underline", label: "Underline", icon: UnderlineIcon },
];

const alignments: readonly {
  id: string;
  label: string;
  icon: ComponentType<IconProps<"outline">>;
}[] = [
  { id: "left", label: "Align left", icon: TextAlignStartIcon },
  { id: "center", label: "Align centre", icon: TextAlignCenterIcon },
  { id: "right", label: "Align right", icon: TextAlignEndIcon },
];

/** The Qeet Notify email-template editor's formatting bar. */
function TemplateEditorToolbar() {
  const [pressed, setPressed] = useState<Record<string, boolean>>({ bold: true });
  const [align, setAlign] = useState("left");
  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <Toolbar aria-label="Template formatting">
        <ToolbarGroup aria-label="Text style">
          {marks.map((mark) => {
            const Icon = mark.icon;
            return (
              <ToolbarButton
                key={mark.id}
                size="icon"
                aria-label={mark.label}
                render={
                  <Toggle
                    pressed={pressed[mark.id] ?? false}
                    onPressedChange={(next) =>
                      setPressed((current) => ({ ...current, [mark.id]: next }))
                    }
                  />
                }
              >
                <Icon aria-hidden />
              </ToolbarButton>
            );
          })}
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup aria-label="Alignment">
          {alignments.map((option) => {
            const Icon = option.icon;
            return (
              <ToolbarButton
                key={option.id}
                size="icon"
                aria-label={option.label}
                render={
                  <Toggle
                    pressed={align === option.id}
                    onPressedChange={() => setAlign(option.id)}
                  />
                }
              >
                <Icon aria-hidden />
              </ToolbarButton>
            );
          })}
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarButton size="icon" aria-label="Insert link">
          <LinkIcon aria-hidden />
        </ToolbarButton>
        <ToolbarButton>
          <BracesIcon data-icon="inline-start" aria-hidden />
          Insert variable
        </ToolbarButton>
        <ToolbarSpacer />
        <ToolbarButton variant="default">
          <SendIcon data-icon="inline-start" aria-hidden />
          Send test
        </ToolbarButton>
      </Toolbar>
      <p className="rounded-lg border bg-card p-3 text-sm">
        Hi {"{{user.first_name}}"}, your <strong>Qeet Pay</strong> invoice{" "}
        <span className="font-mono text-caption">{"{{invoice.number}}"}</span> for{" "}
        {"{{invoice.total_inr}}"} is due on {"{{invoice.due_date}}"}.
      </p>
    </div>
  );
}

/** A ghost toolbar as a table header: search and filters at the start, actions at the end. */
function UsersTableHeader() {
  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-lg border bg-card">
      <Toolbar variant="ghost" aria-label="User table actions" className="border-b p-2">
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute inset-s-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Search users"
            placeholder="Search 1,842 users…"
            className="w-56 ps-8"
          />
        </div>
        <ToolbarButton>
          <FunnelIcon data-icon="inline-start" aria-hidden />
          Role: Admin
        </ToolbarButton>
        <ToolbarSpacer />
        <ToolbarButton size="icon" aria-label="Refresh">
          <RefreshCwIcon aria-hidden />
        </ToolbarButton>
        <ToolbarButton variant="outline">
          <DownloadIcon data-icon="inline-start" aria-hidden />
          Export CSV
        </ToolbarButton>
        <ToolbarButton variant="default">
          <PlusIcon data-icon="inline-start" aria-hidden />
          Invite user
        </ToolbarButton>
      </Toolbar>
      <ul className="divide-y text-sm">
        {users
          .filter((user) => user.role === "Admin" || user.role === "Owner")
          .map((user) => (
            <li key={user.id} className="flex justify-between gap-3 px-3 py-2">
              <span>{user.name}</span>
              <span className="text-muted-foreground">{user.role}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

const toolbarControls = {
  variant: select(["default", "ghost"] as const, "default"),
  orientation: select(["horizontal", "vertical"] as const, "horizontal"),
  spacer: bool(false, "ToolbarSpacer before Export"),
  disabled: bool(false),
  loopFocus: bool(true, "Loop focus at the ends"),
};

export const examples: FamilyExamples = {
  toolbar: {
    layout: "wide",
    minHeight: 760,
    demos: [
      {
        name: "Editor formatting",
        description:
          "One Tab stop for the whole bar; arrow keys move between controls, Home/End jump to the ends. Toggles render through `ToolbarButton`'s `render` prop and take the Qeet selected look when pressed; `ToolbarSpacer` pushes the primary action to the end.",
        render: () => <TemplateEditorToolbar />,
      },
      {
        name: "Ghost, as a table header",
        description:
          '`variant="ghost"` drops the strip\'s border and fill so the card it sits in is the frame; `ToolbarSpacer` splits filters from actions.',
        render: () => <UsersTableHeader />,
      },
      {
        name: "Actions with a link",
        description: "Filter, columns and export above a logs table, with a link to the docs.",
        render: () => (
          <Toolbar aria-label="Log table actions" className="w-fit">
            <ToolbarButton>
              <FunnelIcon data-icon="inline-start" aria-hidden />
              Filter
            </ToolbarButton>
            <ToolbarButton>
              <Columns2Icon data-icon="inline-start" aria-hidden />
              Columns
            </ToolbarButton>
            <ToolbarButton size="icon" aria-label="Refresh">
              <RefreshCwIcon aria-hidden />
            </ToolbarButton>
            <ToolbarSeparator />
            <ToolbarButton>
              <DownloadIcon data-icon="inline-start" aria-hidden />
              Export NDJSON
            </ToolbarButton>
            <ToolbarSeparator />
            <ToolbarLink href="https://docs.qeet.in/logs/query" target="_blank" rel="noreferrer">
              Query syntax
            </ToolbarLink>
          </Toolbar>
        ),
      },
      {
        name: "Vertical",
        description: "A floating zoom control for the org chart.",
        render: () => (
          <Toolbar orientation="vertical" aria-label="Zoom">
            <ToolbarButton size="icon" aria-label="Zoom in">
              <ZoomInIcon aria-hidden />
            </ToolbarButton>
            <ToolbarButton size="icon" aria-label="Zoom out">
              <ZoomOutIcon aria-hidden />
            </ToolbarButton>
            <ToolbarSeparator />
            <ToolbarButton size="icon" aria-label="Reset view">
              <RefreshCwIcon aria-hidden />
            </ToolbarButton>
          </Toolbar>
        ),
      },
      {
        name: "Disabled",
        description:
          "A disabled button stays focusable, so keyboard users still discover it; the whole toolbar can be disabled too.",
        render: () => (
          <Toolbar aria-label="Invoice actions" className="w-fit">
            <ToolbarButton>Duplicate</ToolbarButton>
            <ToolbarButton disabled>Send reminder</ToolbarButton>
            <ToolbarButton disabled>Void invoice</ToolbarButton>
          </Toolbar>
        ),
      },
    ],
    playground: definePlayground({
      controls: toolbarControls,
      render: (v) => (
        <div className={v.orientation === "horizontal" ? "w-[min(100%,560px)]" : undefined}>
          <Toolbar
            variant={v.variant}
            orientation={v.orientation}
            disabled={v.disabled}
            loopFocus={v.loopFocus}
            aria-label="Log table actions"
          >
            <ToolbarButton>
              <FunnelIcon data-icon="inline-start" aria-hidden />
              Filter
            </ToolbarButton>
            <ToolbarButton>
              <Columns2Icon data-icon="inline-start" aria-hidden />
              Columns
            </ToolbarButton>
            {v.spacer ? <ToolbarSpacer /> : <ToolbarSeparator />}
            <ToolbarButton>
              <DownloadIcon data-icon="inline-start" aria-hidden />
              Export
            </ToolbarButton>
          </Toolbar>
        </div>
      ),
      code: (v) =>
        jsx(
          "Toolbar",
          {
            ...changedProps(v, toolbarControls, [
              "variant",
              "orientation",
              "disabled",
              "loopFocus",
            ]),
            "aria-label": "Log table actions",
          },
          [
            jsx("ToolbarButton", {}, [
              '<FunnelIcon data-icon="inline-start" aria-hidden />',
              "Filter",
            ]),
            jsx("ToolbarButton", {}, [
              '<Columns2Icon data-icon="inline-start" aria-hidden />',
              "Columns",
            ]),
            v.spacer ? "<ToolbarSpacer />" : "<ToolbarSeparator />",
            jsx("ToolbarButton", {}, [
              '<DownloadIcon data-icon="inline-start" aria-hidden />',
              "Export",
            ]),
          ],
        ),
    }),
  },
};
