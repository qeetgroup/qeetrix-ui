"use client";

import { ChevronRightIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface TreeNode {
  id: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children?: TreeNode[];
}

interface TreeViewProps extends React.ComponentProps<"div"> {
  data: TreeNode[];
}

/**
 * Hierarchical disclosure tree (file trees, nested log scopes, org units).
 * Data-driven: pass a `data` array of nodes with optional `children`. Branch
 * nodes expand/collapse; leaves are plain rows. State is local per node.
 */
function TreeView({ data, className, ...props }: TreeViewProps) {
  const [focusedId, setFocusedId] = React.useState<string | null>(data[0]?.id ?? null);

  React.useEffect(() => {
    setFocusedId((currentId) => {
      if (currentId && containsNode(data, currentId)) {
        return currentId;
      }

      return data[0]?.id ?? null;
    });
  }, [data]);

  return (
    <div role="tree" data-slot="tree-view" className={cn("text-sm", className)} {...props}>
      {data.map((node, index) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          level={0}
          position={index + 1}
          setSize={data.length}
          focusedId={focusedId}
          onFocusedIdChange={setFocusedId}
        />
      ))}
    </div>
  );
}

function containsNode(nodes: TreeNode[], id: string): boolean {
  return nodes.some((node) => node.id === id || (node.children && containsNode(node.children, id)));
}

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  position: number;
  setSize: number;
  focusedId: string | null;
  onFocusedIdChange: (id: string) => void;
}

function TreeNodeItem({
  node,
  level,
  position,
  setSize,
  focusedId,
  onFocusedIdChange,
}: TreeNodeItemProps) {
  const hasChildren = Boolean(node.children?.length);
  const [open, setOpen] = React.useState(node.defaultOpen ?? false);
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

    onFocusedIdChange(id);
    item.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation();

    const tree = event.currentTarget.closest('[role="tree"]');
    const visibleItems = tree
      ? Array.from(tree.querySelectorAll<HTMLElement>('[role="treeitem"]'))
      : [];
    const currentIndex = visibleItems.indexOf(event.currentTarget);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(visibleItems[currentIndex + 1]);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(visibleItems[currentIndex - 1]);
        break;
      case "Home":
        event.preventDefault();
        focusItem(visibleItems[0]);
        break;
      case "End":
        event.preventDefault();
        focusItem(visibleItems[visibleItems.length - 1]);
        break;
      case "ArrowRight": {
        event.preventDefault();
        if (!hasChildren) {
          break;
        }
        if (!open) {
          setOpen(true);
          break;
        }

        const group = event.currentTarget.querySelector<HTMLElement>(':scope > [role="group"]');
        focusItem(group?.querySelector<HTMLElement>(':scope > [role="treeitem"]'));
        break;
      }
      case "ArrowLeft": {
        event.preventDefault();
        if (hasChildren && open) {
          setOpen(false);
          break;
        }

        const parentItem =
          event.currentTarget.parentElement?.closest<HTMLElement>('[role="treeitem"]');
        focusItem(parentItem ?? undefined);
        break;
      }
      case "Enter":
      case " ":
        if (hasChildren) {
          event.preventDefault();
          setOpen((value) => !value);
        }
        break;
    }
  }

  function handleRowClick() {
    onFocusedIdChange(node.id);
    itemRef.current?.focus();
    if (hasChildren) {
      setOpen((value) => !value);
    }
  }

  return (
    <div
      ref={itemRef}
      role="treeitem"
      tabIndex={focusedId === node.id ? 0 : -1}
      data-slot="tree-item"
      data-tree-item-id={node.id}
      aria-labelledby={labelId}
      aria-expanded={hasChildren ? open : undefined}
      aria-level={level + 1}
      aria-posinset={position}
      aria-setsize={setSize}
      className="outline-none focus-visible:[&>[data-slot=tree-item-row]]:ring-3 focus-visible:[&>[data-slot=tree-item-row]]:ring-ring/50"
      onFocus={(event) => {
        if (event.target === event.currentTarget) {
          onFocusedIdChange(node.id);
        }
      }}
      onKeyDown={handleKeyDown}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard handling lives on the parent role="treeitem". */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handling lives on the parent role="treeitem". */}
      <div
        data-slot="tree-item-row"
        style={indent}
        className="flex items-center gap-1.5 rounded-md py-1 pe-2 hover:bg-accent hover:text-accent-foreground"
        onClick={handleRowClick}
      >
        {hasChildren ? (
          <ChevronRightIcon
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
        ) : (
          <span aria-hidden className="size-4 shrink-0" />
        )}
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
        <span id={labelId} className="truncate">
          {node.label}
        </span>
      </div>
      {hasChildren && open && (
        // biome-ignore lint/a11y/useSemanticElements: the WAI-ARIA tree pattern requires role="group" around child treeitems.
        <div role="group" className="min-w-0">
          {node.children?.map((child, index) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              position={index + 1}
              setSize={node.children?.length ?? 0}
              focusedId={focusedId}
              onFocusedIdChange={onFocusedIdChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export type { TreeNode, TreeViewProps };
export { TreeView };
