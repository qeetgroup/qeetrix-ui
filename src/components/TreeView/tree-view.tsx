"use client";

import { ChevronRightIcon } from "lucide-react";
import * as React from "react";

import { logicalDirectionForKey } from "@/lib/direction";
import { cn } from "@/lib/utils";
import type { Direction } from "@/providers/direction-provider";
import { useResolvedDirection } from "@/providers/direction-provider";

interface TreeNode {
  id: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  /** Start expanded. Seeds the uncontrolled state; ignored while `expandedIds` is controlled. */
  defaultOpen?: boolean;
  /**
   * Cannot be selected. It stays focusable and expandable — the APG keeps disabled items in the
   * focus order so they can be read, and its children stay reachable.
   */
  disabled?: boolean;
  children?: TreeNode[];
}

interface TreeViewProps extends React.ComponentProps<"div"> {
  data: TreeNode[];
  /**
   * The expanded branches, controlled. Without it each branch starts from its `defaultOpen` and
   * the tree owns its state.
   */
  expandedIds?: string[];
  /** Called with every expanded branch id whenever a branch opens or closes, in both modes. */
  onExpandedIdsChange?: (expandedIds: string[]) => void;
  /**
   * The selected node, controlled. Passing this, `defaultSelectedId` or `onSelectedIdChange`
   * makes the tree single-select: activating a node (click, Enter, Space) selects it, and the
   * selected node carries `aria-selected`. Without any of the three, the tree is a pure
   * disclosure hierarchy, as before.
   */
  selectedId?: string | null;
  /** The initially selected node, uncontrolled. */
  defaultSelectedId?: string | null;
  /** Called with the node the user selected, in both modes. */
  onSelectedIdChange?: (id: string, node: TreeNode) => void;
  /**
   * Draw a hairline under each open branch's chevron down to its last child, so depth reads at a
   * glance in a deep tree. Default `true`.
   */
  showGuides?: boolean;
}

interface TreeContextValue {
  focusedId: string | null;
  setFocusedId: (id: string) => void;
  direction: Direction;
  isOpen: (node: TreeNode) => boolean;
  setOpen: (node: TreeNode, open: boolean) => void;
  expandSiblings: (siblings: TreeNode[]) => void;
  selectable: boolean;
  selectedId: string | null;
  select: (node: TreeNode) => void;
  showGuides: boolean;
  typeahead: (character: string, from: HTMLElement) => void;
}

const TreeContext = React.createContext<TreeContextValue | null>(null);

function useTree() {
  const context = React.useContext(TreeContext);
  if (!context) throw new Error("TreeView items must be rendered inside a TreeView.");
  return context;
}

/** Reset delay for type-ahead, matching the listbox and menu conventions. */
const TYPEAHEAD_RESET_MS = 500;

/**
 * Hierarchical disclosure tree (file trees, nested log scopes, org units).
 * Data-driven: pass a `data` array of nodes with optional `children`. Branch
 * nodes expand/collapse; leaves are plain rows. Expansion is uncontrolled by
 * default (each branch seeded from `defaultOpen`) or controlled through
 * `expandedIds`; single selection is opt-in through `selectedId`.
 *
 * Keyboard (WAI-ARIA tree view): ↑/↓ move, →/← expand, enter or climb (mirrored under RTL),
 * Home/End jump, Enter/Space activate, `*` expands every sibling, and typing a character moves to
 * the next visible node whose label starts with it.
 */
function TreeView({
  data,
  expandedIds,
  onExpandedIdsChange,
  selectedId: selectedIdProp,
  defaultSelectedId,
  onSelectedIdChange,
  showGuides = true,
  className,
  ...props
}: TreeViewProps) {
  const selectable =
    selectedIdProp !== undefined ||
    defaultSelectedId !== undefined ||
    onSelectedIdChange !== undefined;
  const [internalSelectedId, setInternalSelectedId] = React.useState<string | null>(
    defaultSelectedId ?? null,
  );
  const selectedId = selectedIdProp !== undefined ? selectedIdProp : internalSelectedId;

  const [focusedId, setFocusedId] = React.useState<string | null>(() =>
    selectedId && containsNode(data, selectedId) ? selectedId : (data[0]?.id ?? null),
  );
  const rootRef = React.useRef<HTMLDivElement>(null);
  // Resolved once at the root and passed down: a tree can hold hundreds of nodes,
  // and each one calling the hook would be a DOM read and a state cell per node.
  const direction = useResolvedDirection(rootRef);

  // Uncontrolled expansion is stored as the user's toggles over each node's `defaultOpen`, so a
  // node that arrives later in `data` still opens the way its author declared.
  const [toggles, setToggles] = React.useState<Record<string, boolean>>({});
  const controlledExpanded = React.useMemo(
    () => (expandedIds ? new Set(expandedIds) : null),
    [expandedIds],
  );

  const isOpen = React.useCallback(
    (node: TreeNode) =>
      controlledExpanded
        ? controlledExpanded.has(node.id)
        : (toggles[node.id] ?? node.defaultOpen ?? false),
    [controlledExpanded, toggles],
  );

  const commitOpen = React.useCallback(
    (changes: Record<string, boolean>) => {
      if (!controlledExpanded) setToggles((previous) => ({ ...previous, ...changes }));
      if (onExpandedIdsChange) {
        const next: string[] = [];
        walk(data, (node) => {
          if (!node.children?.length) return;
          if (changes[node.id] ?? isOpen(node)) next.push(node.id);
        });
        onExpandedIdsChange(next);
      }
    },
    [controlledExpanded, data, isOpen, onExpandedIdsChange],
  );

  const setOpen = React.useCallback(
    (node: TreeNode, open: boolean) => commitOpen({ [node.id]: open }),
    [commitOpen],
  );

  const expandSiblings = React.useCallback(
    (siblings: TreeNode[]) => {
      const changes: Record<string, boolean> = {};
      for (const sibling of siblings) {
        if (sibling.children?.length && !isOpen(sibling)) changes[sibling.id] = true;
      }
      if (Object.keys(changes).length) commitOpen(changes);
    },
    [commitOpen, isOpen],
  );

  const select = React.useCallback(
    (node: TreeNode) => {
      if (!selectable || node.disabled) return;
      if (selectedIdProp === undefined) setInternalSelectedId(node.id);
      onSelectedIdChange?.(node.id, node);
    },
    [onSelectedIdChange, selectable, selectedIdProp],
  );

  const typeaheadRef = React.useRef<{ buffer: string; timer?: ReturnType<typeof setTimeout> }>({
    buffer: "",
  });
  React.useEffect(() => () => clearTimeout(typeaheadRef.current.timer), []);

  const typeahead = React.useCallback((character: string, from: HTMLElement) => {
    const state = typeaheadRef.current;
    clearTimeout(state.timer);
    state.buffer += character.toLocaleLowerCase();
    state.timer = setTimeout(() => {
      state.buffer = "";
    }, TYPEAHEAD_RESET_MS);

    const items = visibleItems(from);
    const start = items.indexOf(from);
    // A repeated single character cycles through matches; a longer buffer refines the match
    // starting from the current node.
    const repeated = state.buffer.split("").every((c) => c === state.buffer[0]);
    const needle = repeated ? state.buffer[0] : state.buffer;
    const offset = repeated || state.buffer.length === 1 ? 1 : 0;
    for (let step = 0; step < items.length; step++) {
      const item = items[(start + offset + step) % items.length];
      const text = item
        .querySelector(":scope > [data-slot=tree-item-row] [data-slot=tree-item-label]")
        ?.textContent?.trim()
        .toLocaleLowerCase();
      if (text?.startsWith(needle)) {
        focusTreeItem(item);
        return;
      }
    }
  }, []);

  React.useEffect(() => {
    setFocusedId((currentId) => {
      if (currentId && containsNode(data, currentId)) {
        return currentId;
      }

      return data[0]?.id ?? null;
    });
  }, [data]);

  const context = React.useMemo<TreeContextValue>(
    () => ({
      focusedId,
      setFocusedId,
      direction,
      isOpen,
      setOpen,
      expandSiblings,
      selectable,
      selectedId,
      select,
      showGuides,
      typeahead,
    }),
    [
      focusedId,
      direction,
      isOpen,
      setOpen,
      expandSiblings,
      selectable,
      selectedId,
      select,
      showGuides,
      typeahead,
    ],
  );

  return (
    <TreeContext.Provider value={context}>
      <div
        ref={rootRef}
        role="tree"
        data-slot="tree-view"
        data-direction={direction}
        className={cn("text-sm", className)}
        {...props}
      >
        {data.map((node, index) => (
          <TreeNodeItem key={node.id} node={node} level={0} position={index + 1} siblings={data} />
        ))}
      </div>
    </TreeContext.Provider>
  );
}

function containsNode(nodes: TreeNode[], id: string): boolean {
  return nodes.some((node) => node.id === id || (node.children && containsNode(node.children, id)));
}

function walk(nodes: TreeNode[], visit: (node: TreeNode) => void) {
  for (const node of nodes) {
    visit(node);
    if (node.children) walk(node.children, visit);
  }
}

/** Every treeitem currently rendered — collapsed branches render no children — in DOM order. */
function visibleItems(from: HTMLElement): HTMLElement[] {
  const tree = from.closest('[role="tree"]');
  return tree ? Array.from(tree.querySelectorAll<HTMLElement>('[role="treeitem"]')) : [];
}

function focusTreeItem(item: HTMLElement | null | undefined) {
  item?.focus();
}

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  position: number;
  /** The node's siblings, its own entry included — what `*` expands. */
  siblings: TreeNode[];
}

function TreeNodeItem({ node, level, position, siblings }: TreeNodeItemProps) {
  const tree = useTree();
  const hasChildren = Boolean(node.children?.length);
  const open = hasChildren && tree.isOpen(node);
  const selected = tree.selectable && tree.selectedId === node.id;
  const itemRef = React.useRef<HTMLDivElement>(null);
  const labelId = React.useId();
  const Icon = node.icon;
  const indent = {
    paddingInlineStart: `${level * 1 + 0.5}rem`,
  } as React.CSSProperties;

  function focusItem(item: HTMLElement | null | undefined) {
    const id = item?.dataset.treeItemId;
    if (!item || !id) {
      return;
    }

    tree.setFocusedId(id);
    item.focus();
  }

  function activate() {
    tree.select(node);
    if (hasChildren) tree.setOpen(node, !open);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation();

    const items = visibleItems(event.currentTarget);
    const currentIndex = items.indexOf(event.currentTarget);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(items[currentIndex + 1]);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(items[currentIndex - 1]);
        break;
      case "Home":
        event.preventDefault();
        focusItem(items[0]);
        break;
      case "End":
        event.preventDefault();
        focusItem(items[items.length - 1]);
        break;
      // The APG maps expand/collapse to the *inline* axis, so both keys mirror
      // under `dir="rtl"`: ArrowLeft expands in Arabic exactly as ArrowRight does
      // in English. `logicalDirectionForKey` is the single place that decides.
      case "ArrowLeft":
      case "ArrowRight": {
        event.preventDefault();
        if (logicalDirectionForKey(event.key, tree.direction) === "inline-end") {
          if (!hasChildren) {
            break;
          }
          if (!open) {
            tree.setOpen(node, true);
            break;
          }

          const group = event.currentTarget.querySelector<HTMLElement>(':scope > [role="group"]');
          focusItem(group?.querySelector<HTMLElement>(':scope > [role="treeitem"]'));
          break;
        }

        if (hasChildren && open) {
          tree.setOpen(node, false);
          break;
        }

        const parentItem =
          event.currentTarget.parentElement?.closest<HTMLElement>('[role="treeitem"]');
        focusItem(parentItem ?? undefined);
        break;
      }
      case "Enter":
      case " ":
        if (hasChildren || tree.selectable) {
          event.preventDefault();
          activate();
        }
        break;
      case "*":
        event.preventDefault();
        tree.expandSiblings(siblings);
        break;
      default:
        if (
          event.key.length === 1 &&
          event.key !== " " &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          tree.typeahead(event.key, event.currentTarget);
        }
    }
  }

  function handleRowClick() {
    tree.setFocusedId(node.id);
    itemRef.current?.focus();
    activate();
  }

  return (
    <div
      ref={itemRef}
      role="treeitem"
      tabIndex={tree.focusedId === node.id ? 0 : -1}
      data-slot="tree-item"
      data-tree-item-id={node.id}
      data-selected={selected ? "" : undefined}
      data-disabled={node.disabled ? "" : undefined}
      aria-labelledby={labelId}
      aria-expanded={hasChildren ? open : undefined}
      aria-selected={tree.selectable ? selected : undefined}
      aria-disabled={node.disabled || undefined}
      aria-level={level + 1}
      aria-posinset={position}
      aria-setsize={siblings.length}
      className="outline-none focus-visible:[&>[data-slot=tree-item-row]]:focus-ring-inset"
      onFocus={(event) => {
        if (event.target === event.currentTarget) {
          tree.setFocusedId(node.id);
        }
      }}
      onKeyDown={handleKeyDown}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard handling lives on the parent role="treeitem". */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handling lives on the parent role="treeitem". */}
      <div
        data-slot="tree-item-row"
        style={indent}
        className={cn(
          "relative flex min-h-(--qx-component-tree-view-row-height) cursor-default items-center gap-1.5 rounded-md pe-2 transition-colors duration-fast ease-standard select-none",
          "hover:bg-surface-interactive",
          // Selected: the quiet Qeet tint with the normal text colour, plus an inline-start bar
          // so selection is carried by shape too. Under forced colours the bar becomes Highlight.
          selected &&
            "bg-brand-subtle font-medium text-foreground before:absolute before:inset-y-1 before:inset-s-0 before:w-0.5 before:rounded-full before:bg-border-brand before:forced-color-adjust-none hover:bg-brand-subtle-hover forced-colors:before:bg-[Highlight]",
          node.disabled && "text-muted-foreground",
        )}
        onClick={handleRowClick}
      >
        {hasChildren ? (
          <ChevronRightIcon
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-fast ease-standard",
              // Closed, the glyph points along the inline axis, so it mirrors: a
              // physical rotation is correct here because the glyph itself has a
              // direction. Open, it points down in both directions, so the RTL
              // flip must not compose with the 90° turn.
              open ? "rotate-90" : "rtl:rotate-180",
            )}
          />
        ) : (
          <span aria-hidden className="size-4 shrink-0" />
        )}
        {Icon && (
          <Icon
            aria-hidden
            className={cn(
              "size-4 shrink-0",
              selected ? "text-foreground" : "text-muted-foreground",
            )}
          />
        )}
        <span id={labelId} data-slot="tree-item-label" className="min-w-0 truncate">
          {node.label}
        </span>
      </div>
      {hasChildren && open && (
        // biome-ignore lint/a11y/useSemanticElements: the WAI-ARIA tree pattern requires role="group" around child treeitems.
        <div
          role="group"
          data-slot="tree-item-group"
          className={cn(
            "relative min-w-0",
            // The guide hangs from the centre of this branch's chevron: indent (level rem) plus
            // the row's 0.5rem start padding plus half the 1rem chevron. Drawn as ::after so it
            // paints above the child rows' hover and selection fills.
            tree.showGuides &&
              "after:pointer-events-none after:absolute after:inset-y-0 after:inset-s-(--qx-tree-guide) after:w-px after:bg-border",
          )}
          style={
            tree.showGuides
              ? ({ "--qx-tree-guide": `calc(${level + 1}rem - 0.5px)` } as React.CSSProperties)
              : undefined
          }
        >
          {node.children?.map((child, index) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              position={index + 1}
              siblings={node.children ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export type { TreeNode, TreeViewProps };
export { TreeView };
