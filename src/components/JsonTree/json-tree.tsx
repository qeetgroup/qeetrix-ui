"use client";

import { ChevronRightIcon } from "lucide-react";
import * as React from "react";

import type { DisclosureMessages, JsonTreeMessages, MessagesFor } from "@/lib/messages";
import { disclosureMessages, jsonTreeMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

interface JSONTreeProps {
  /** Any JSON-serialisable value: object, array, string, number, boolean, null. */
  value: unknown;
  /** Tree depth at which nested nodes start collapsed. Default 1 (top-level
   *  is open, anything nested starts collapsed). 0 collapses everything. */
  initialOpenDepth?: number;
  /** Default root label (e.g. "payload"). Not shown when null. */
  rootLabel?: string | null;
  /**
   * Accessible name of the tree (e.g. "Webhook payload"). Defaults to `rootLabel`. Give one
   * whenever the payload shares a page with another.
   */
  label?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`. Used as the
   * pointer hint on each disclosure chevron; the expanded state itself is announced through
   * `aria-expanded`.
   */
  messages?: MessagesFor<"disclosure"> & MessagesFor<"jsonTree">;
  className?: string;
}

/*
 * The same semantic syntax roles CodeBlock uses, so a payload reads identically whether it is
 * rendered as a tree or as a block. Punctuation and the collapsed summaries take their own roles
 * — both ≥4.5:1 on the code surface — rather than an opacity-reduced muted colour, which fell
 * below AA.
 */
const TOKEN = {
  punct: "text-syntax-punctuation",
  index: "text-syntax-punctuation",
  key: "text-syntax-key",
  string: "text-syntax-string",
  number: "text-syntax-number",
  literal: "text-syntax-literal",
  summary: "text-syntax-comment",
} as const;

/** The collapsed placeholder: how much the bracket holds ("3 keys", "12 items"). */
function summaryText(value: unknown, messages: JsonTreeMessages): string {
  if (Array.isArray(value)) return messages.items(value.length);
  return messages.keys(Object.keys(value as object).length);
}

/* ── Tree state ──────────────────────────────────────────────────────────────────────────────
 * The payload is a WAI-ARIA tree: one tab stop, arrow keys to move, →/← to open, enter, close and
 * climb, Home/End, Enter/Space to toggle. It used to be a disclosure button per object or array —
 * a large payload put hundreds of identical "Expand" buttons in the tab order. Nodes are
 * identified by their path, which is unique and stable for a given value.
 *
 * The tree is always laid out left to right: it shows code, and code does not mirror under
 * `dir="rtl"` (a bracket at the end of an Arabic line would read as the start). The arrow keys
 * follow the layout, so → opens in every locale.
 */
interface JSONTreeContextValue {
  focusedPath: string;
  setFocusedPath: (path: string) => void;
  messages: DisclosureMessages;
  summaries: JsonTreeMessages;
}

const JSONTreeContext = React.createContext<JSONTreeContextValue | null>(null);

function useJSONTree() {
  const context = React.useContext(JSONTreeContext);
  if (!context) throw new Error("JSONTree nodes must be rendered inside a JSONTree.");
  return context;
}

function childPath(path: string, name: string | number) {
  return typeof name === "number" ? `${path}[${name}]` : `${path}.${JSON.stringify(name)}`;
}

function visibleItems(from: HTMLElement): HTMLElement[] {
  const tree = from.closest('[role="tree"]');
  return tree ? Array.from(tree.querySelectorAll<HTMLElement>('[role="treeitem"]')) : [];
}

interface NodeProps {
  name?: string | number;
  value: unknown;
  path: string;
  depth: number;
  initialOpenDepth: number;
  isLast: boolean;
  position: number;
  setSize: number;
}

function Node({
  name,
  value,
  path,
  depth,
  initialOpenDepth,
  isLast,
  position,
  setSize,
}: NodeProps) {
  const tree = useJSONTree();
  const isContainer = value !== null && typeof value === "object";
  const [open, setOpen] = React.useState(depth < initialOpenDepth);
  const rowId = React.useId();
  const itemRef = React.useRef<HTMLDivElement>(null);
  const expanded = isContainer && open;
  const comma = !isLast && <span className={TOKEN.punct}>,</span>;

  function toggle(next: boolean) {
    if (!isContainer) return;
    setOpen(next);
    // Collapsing a branch that holds the focus would leave no item in the tab order.
    if (!next && tree.focusedPath.startsWith(path) && tree.focusedPath !== path) {
      tree.setFocusedPath(path);
    }
  }

  function focusItem(item: HTMLElement | undefined | null) {
    const target = item?.dataset.jsonPath;
    if (!item || target === undefined) return;
    tree.setFocusedPath(target);
    item.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation();
    const items = visibleItems(event.currentTarget);
    const index = items.indexOf(event.currentTarget);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(items[index + 1]);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(items[index - 1]);
        break;
      case "Home":
        event.preventDefault();
        focusItem(items[0]);
        break;
      case "End":
        event.preventDefault();
        focusItem(items[items.length - 1]);
        break;
      case "ArrowRight":
        event.preventDefault();
        if (!isContainer) break;
        if (!open) {
          toggle(true);
          break;
        }
        focusItem(
          event.currentTarget.querySelector<HTMLElement>(
            ':scope > [role="group"] > [role="treeitem"]',
          ),
        );
        break;
      case "ArrowLeft":
        event.preventDefault();
        if (expanded) {
          toggle(false);
          break;
        }
        focusItem(event.currentTarget.parentElement?.closest<HTMLElement>('[role="treeitem"]'));
        break;
      case "Enter":
      case " ":
        if (isContainer) {
          event.preventDefault();
          toggle(!open);
        }
        break;
    }
  }

  const renderKey = name !== undefined && (
    <>
      {typeof name === "number" ? (
        <span className={TOKEN.index}>{name}</span>
      ) : (
        <span className={TOKEN.key}>"{name}"</span>
      )}
      <span className={TOKEN.punct}>: </span>
    </>
  );

  let content: React.ReactNode;
  if (value === null) {
    content = <span className={TOKEN.literal}>null</span>;
  } else if (typeof value === "boolean") {
    content = <span className={TOKEN.literal}>{String(value)}</span>;
  } else if (typeof value === "number") {
    content = <span className={TOKEN.number}>{value}</span>;
  } else if (typeof value === "string") {
    content = <span className={cn(TOKEN.string, "wrap-anywhere")}>"{value}"</span>;
  } else if (isContainer) {
    const [opener, closer] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];
    content = open ? (
      <span className={TOKEN.punct}>{opener}</span>
    ) : (
      <>
        <span className={TOKEN.punct}>{opener}</span>
        <span className={cn(TOKEN.summary, "mx-1")}>{summaryText(value, tree.summaries)}</span>
        <span className={TOKEN.punct}>{closer}</span>
      </>
    );
  } else {
    // Fallback for values JSON cannot carry (functions, undefined, symbols, bigint).
    content = <span className={TOKEN.punct}>{String(value)}</span>;
  }

  const children: [string | number, unknown][] = !expanded
    ? []
    : Array.isArray(value)
      ? value.map((item, i) => [i, item])
      : Object.entries(value as Record<string, unknown>);

  return (
    <div
      ref={itemRef}
      role="treeitem"
      data-slot="json-tree-item"
      data-json-path={path}
      tabIndex={tree.focusedPath === path ? 0 : -1}
      aria-labelledby={rowId}
      aria-expanded={isContainer ? open : undefined}
      aria-level={depth + 1}
      aria-posinset={position}
      aria-setsize={setSize}
      className="outline-none focus-visible:[&>[data-slot=json-tree-row]]:focus-ring-inset"
      onFocus={(event) => {
        if (event.target === event.currentTarget) tree.setFocusedPath(path);
      }}
      onKeyDown={handleKeyDown}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard handling lives on the parent role="treeitem". */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handling lives on the parent role="treeitem". */}
      <div
        id={rowId}
        data-slot="json-tree-row"
        className={cn(
          "flex min-h-lh items-start gap-1 rounded-sm px-1 transition-colors duration-fast",
          "hover:bg-(--qx-component-json-tree-row-background-hover)",
          isContainer && "cursor-default select-none",
        )}
        onClick={() => {
          tree.setFocusedPath(path);
          itemRef.current?.focus();
          toggle(!open);
        }}
      >
        {isContainer ? (
          <span
            aria-hidden
            title={open ? tree.messages.collapse : tree.messages.expand}
            className="grid h-lh w-3 shrink-0 place-items-center"
          >
            <ChevronRightIcon
              className={cn(
                "size-3 text-syntax-punctuation transition-transform duration-fast ease-standard",
                open && "rotate-90",
              )}
            />
          </span>
        ) : (
          // Leaves keep the chevron's column, so every key in a level starts at the same x.
          <span aria-hidden className="w-3 shrink-0" />
        )}
        <span className="min-w-0">
          {renderKey}
          {content}
          {!expanded && comma}
        </span>
      </div>
      {expanded && (
        <>
          {/* biome-ignore lint/a11y/useSemanticElements: the WAI-ARIA tree pattern requires role="group" around child treeitems. */}
          <div
            role="group"
            className="ms-2.5 border-s border-(--qx-component-json-tree-guide) ps-1"
          >
            {children.map(([key, child], i) => (
              <Node
                key={typeof key === "number" ? `item-${key}` : `key-${key}`}
                name={key}
                value={child}
                path={childPath(path, key)}
                depth={depth + 1}
                initialOpenDepth={initialOpenDepth}
                isLast={i === children.length - 1}
                position={i + 1}
                setSize={children.length}
              />
            ))}
          </div>
          {/* The closing bracket is structure, not an item: hidden so it is not read as a node. */}
          <div aria-hidden className="ps-5">
            <span className={TOKEN.punct}>{Array.isArray(value) ? "]" : "}"}</span>
            {comma}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * JSONTree renders any JSON-serialisable value as a collapsible
 * indented tree. Each object/array node gets a disclosure chevron and
 * a summary line ("{ 3 keys }" / "[ 12 items ]") so deep payloads stay
 * compact until the reader drills in.
 *
 * Used for inspecting webhook delivery payloads, audit event metadata,
 * OIDC discovery documents — anywhere the data is large enough that
 * `<CodeBlock>` would scroll forever.
 */
function JSONTree({
  value,
  initialOpenDepth = 1,
  rootLabel = null,
  label,
  messages: messageOverrides,
  className,
}: JSONTreeProps) {
  const messages = useMessages("disclosure", disclosureMessages, messageOverrides);
  const summaries = useMessages("jsonTree", jsonTreeMessages, messageOverrides);
  const [focusedPath, setFocusedPath] = React.useState("$");
  const context = React.useMemo(
    () => ({ focusedPath, setFocusedPath, messages, summaries }),
    [focusedPath, messages, summaries],
  );
  return (
    <JSONTreeContext.Provider value={context}>
      <div
        data-slot="json-tree"
        dir="ltr"
        className={cn(
          "overflow-auto rounded-lg border border-border bg-surface-sunken p-2 font-mono text-code text-foreground",
          className,
        )}
      >
        <div role="tree" aria-label={label ?? rootLabel ?? undefined}>
          <Node
            name={rootLabel ?? undefined}
            value={value}
            path="$"
            depth={0}
            initialOpenDepth={initialOpenDepth}
            isLast
            position={1}
            setSize={1}
          />
        </div>
      </div>
    </JSONTreeContext.Provider>
  );
}

export type { JSONTreeProps };
export { JSONTree };
