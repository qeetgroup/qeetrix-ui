import { Button, Kbd, KbdGroup, Tooltip, TooltipContent, TooltipTrigger } from "@qeetrix/ui";
import {
  CopyIcon,
  DownloadIcon,
  ListFilterIcon,
  RefreshCwIcon,
  SearchIcon,
  Settings2Icon,
} from "lucide-react";
import { logEvents } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

const toolbar = [
  { label: "Refresh sessions", icon: RefreshCwIcon },
  { label: "Filter sessions", icon: ListFilterIcon },
  { label: "Export as CSV", icon: DownloadIcon },
  { label: "Session settings", icon: Settings2Icon },
] as const;

const sides = ["top", "right", "bottom", "left"] as const;

const tooltipControls = {
  content: text("Copy API key", "Content"),
  side: select(sides, "top"),
  align: select(["start", "center", "end"] as const, "center"),
  sideOffset: num(4, { min: 0, max: 24, label: "sideOffset" }),
  delay: num(0, { min: 0, max: 1500, step: 100, label: "Trigger delay (ms, 0 = provider)" }),
  shortcut: bool(true, "Keyboard shortcut"),
};

export const examples: FamilyExamples = {
  tooltip: {
    demos: [
      {
        name: "Icon buttons",
        description:
          "The tooltip repeats the button's accessible name for sighted mouse and keyboard users; it opens on hover and on focus.",
        render: () => (
          <div className="flex items-center gap-1 rounded-lg border p-1">
            {toolbar.map((item) => (
              <Tooltip key={item.label}>
                <TooltipTrigger
                  render={<Button variant="ghost" size="icon" aria-label={item.label} />}
                >
                  <item.icon aria-hidden />
                </TooltipTrigger>
                <TooltipContent>{item.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        ),
      },
      {
        name: "With shortcut",
        description: "A Kbd inside the content advertises the keyboard shortcut.",
        render: () => (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline" />}>
                <SearchIcon data-icon="inline-start" aria-hidden />
                Search
              </TooltipTrigger>
              <TooltipContent>
                Search users, tenants and invoices
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </KbdGroup>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={<Button variant="outline" size="icon" aria-label="Copy API key" />}
              >
                <CopyIcon aria-hidden />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Copy API key
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>C</Kbd>
                </KbdGroup>
              </TooltipContent>
            </Tooltip>
          </div>
        ),
      },
      {
        name: "Sides",
        render: () => (
          <div className="flex flex-wrap gap-2">
            {sides.map((side) => (
              <Tooltip key={side}>
                <TooltipTrigger render={<Button variant="outline" className="capitalize" />}>
                  {side}
                </TooltipTrigger>
                <TooltipContent side={side}>Region: ap-south-1 (Mumbai)</TooltipContent>
              </Tooltip>
            ))}
          </div>
        ),
      },
      {
        name: "Truncated value",
        description: "Reveal the full value of text that is cut off in a narrow column.",
        render: () => (
          <div className="flex w-56 flex-col gap-1 rounded-lg border p-2 text-sm">
            {logEvents.slice(0, 3).map((event) => (
              <Tooltip key={event.id}>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="truncate rounded-sm text-start text-muted-foreground outline-none hover:text-foreground focus-visible:focus-ring"
                    />
                  }
                >
                  {event.message}
                </TooltipTrigger>
                <TooltipContent side="right">{event.message}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: tooltipControls,
      render: (v) => (
        <Tooltip>
          <TooltipTrigger
            delay={v.delay || undefined}
            render={<Button variant="outline" size="icon" aria-label={v.content} />}
          >
            <CopyIcon aria-hidden />
          </TooltipTrigger>
          <TooltipContent side={v.side} align={v.align} sideOffset={v.sideOffset}>
            {v.content}
            {v.shortcut && (
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>C</Kbd>
              </KbdGroup>
            )}
          </TooltipContent>
        </Tooltip>
      ),
      code: (v) =>
        jsx("Tooltip", {}, [
          jsx(
            "TooltipTrigger",
            {
              delay: v.delay || undefined,
              render: expr(
                `<Button variant="outline" size="icon" aria-label=${JSON.stringify(v.content)} />`,
              ),
            },
            "<CopyIcon aria-hidden />",
          ),
          jsx(
            "TooltipContent",
            {
              side: v.side === "top" ? undefined : v.side,
              align: v.align === "center" ? undefined : v.align,
              sideOffset: v.sideOffset === 4 ? undefined : v.sideOffset,
            },
            [v.content, v.shortcut ? jsx("KbdGroup", {}, ["<Kbd>⌘</Kbd>", "<Kbd>C</Kbd>"]) : ""],
          ),
        ]),
    }),
  },
};
