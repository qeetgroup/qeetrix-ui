import { BellIcon, XIcon } from "@qeetrix/icons";
import { Button, Portal } from "@qeetrix/ui";
import { useEffect, useState } from "react";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/** Where a portalled node actually landed in the DOM, read after it mounts. */
function useLandingSpot(node: HTMLElement | null) {
  const [spot, setSpot] = useState("not mounted");
  useEffect(() => {
    if (!node) {
      setSpot("not mounted");
      return;
    }
    const parent = node.parentElement;
    setSpot(
      parent === document.body
        ? "<body>"
        : parent?.id
          ? `<${parent.tagName.toLowerCase()} id="${parent.id}">`
          : `<${parent?.tagName.toLowerCase() ?? "?"}>`,
    );
  }, [node]);
  return spot;
}

function Notice({
  message,
  onDismiss,
  floating = false,
  nodeRef,
}: {
  message: string;
  onDismiss: () => void;
  floating?: boolean;
  nodeRef: (node: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={nodeRef}
      role="status"
      className={
        floating
          ? "fixed inset-e-4 bottom-4 z-(--qx-z-fixed) flex max-w-xs items-start gap-2 rounded-lg border bg-surface-overlay p-3 text-sm shadow-popover"
          : "flex items-start gap-2 rounded-md border bg-surface-elevated p-2.5 text-sm shadow-rest"
      }
    >
      <BellIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">{message}</span>
      <Button variant="ghost" size="icon-xs" aria-label="Dismiss notice" onClick={onDismiss}>
        <XIcon aria-hidden />
      </Button>
    </div>
  );
}

/**
 * The notice is written inside the left card but rendered into the tray on the right. Its
 * Dismiss button still updates the left card's state: React events and context follow the
 * component tree, not the DOM.
 */
function PortalIntoTray({ message = "Priya Nair accepted your invite to Acme India." }) {
  const [tray, setTray] = useState<HTMLElement | null>(null);
  const [shown, setShown] = useState(true);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const spot = useLandingSpot(shown ? node : null);
  return (
    <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
      <div className="flex flex-1 flex-col gap-2 rounded-lg border p-3">
        <span className="text-sm font-medium">Invite form</span>
        <span className="text-caption text-muted-foreground">
          The notice is declared here, inside this card.
        </span>
        <Button size="sm" variant="outline" className="self-start" onClick={() => setShown(!shown)}>
          {shown ? "Remove notice" : "Send notice to tray"}
        </Button>
        <code className="text-caption text-muted-foreground">Mounted under: {spot}</code>
        {shown && tray && (
          <Portal container={tray}>
            <Notice message={message} onDismiss={() => setShown(false)} nodeRef={setNode} />
          </Portal>
        )}
      </div>
      <section
        ref={setTray}
        id="pg-notification-tray"
        aria-label="Notification tray"
        className="flex min-h-28 flex-1 flex-col gap-2 rounded-lg border border-dashed bg-surface-sunken p-3"
      >
        <span className="text-caption font-medium text-muted-foreground">Notification tray</span>
      </section>
    </div>
  );
}

/** With no `container`, the portal renders into `document.body` — above every clipping box. */
function PortalToBody() {
  const [shown, setShown] = useState(false);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const spot = useLandingSpot(shown ? node : null);
  return (
    <div className="flex h-28 w-72 flex-col gap-2 overflow-hidden rounded-lg border p-3">
      <span className="text-caption text-muted-foreground">
        This card clips its content (<code>overflow: hidden</code>).
      </span>
      <Button size="sm" className="self-start" onClick={() => setShown(!shown)}>
        {shown ? "Hide notice" : "Show notice on <body>"}
      </Button>
      <code className="text-caption text-muted-foreground">Mounted under: {spot}</code>
      {shown && (
        <Portal>
          <Notice
            floating
            message="Settlement of ₹13,86,500.00 to HDFC Bank ••4821 is on its way."
            onDismiss={() => setShown(false)}
            nodeRef={setNode}
          />
        </Portal>
      )}
    </div>
  );
}

function PlaygroundPortal({
  target,
  show,
  message,
}: {
  target: "container" | "body";
  show: boolean;
  message: string;
}) {
  const [tray, setTray] = useState<HTMLElement | null>(null);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const spot = useLandingSpot(show ? node : null);
  const ready = target === "body" || tray !== null;
  return (
    <div className="flex w-80 flex-col gap-3">
      <section
        ref={setTray}
        id="pg-portal-target"
        aria-label="Portal target"
        className="flex min-h-24 flex-col gap-2 rounded-lg border border-dashed bg-surface-sunken p-3"
      >
        <span className="text-caption font-medium text-muted-foreground">
          {'<section id="pg-portal-target">'}
        </span>
      </section>
      <code className="text-caption text-muted-foreground">Mounted under: {spot}</code>
      {show && ready && (
        <Portal container={target === "container" ? tray : undefined}>
          <Notice
            floating={target === "body"}
            message={message}
            onDismiss={() => undefined}
            nodeRef={setNode}
          />
        </Portal>
      )}
    </div>
  );
}

const portalControls = {
  target: select(["container", "body"] as const, "container", "Render into"),
  show: bool(true, "Mounted"),
  message: text("Priya Nair accepted your invite to Acme India.", "Content"),
};

export const examples: FamilyExamples = {
  portal: {
    minHeight: 420,
    demos: [
      {
        name: "Into a named container",
        description:
          "`container` picks the destination. The notice is declared in the left card but lands in the tray, and its Dismiss button still updates the card's state.",
        render: () => <PortalIntoTray />,
      },
      {
        name: "Default: document.body",
        description:
          "Without a container it renders into `<body>`, escaping the clipping card — how menus, toasts and dialogs avoid being cut off.",
        render: () => <PortalToBody />,
      },
    ],
    playground: definePlayground({
      controls: portalControls,
      render: (v) => <PlaygroundPortal target={v.target} show={v.show} message={v.message} />,
      code: (v) =>
        jsx("Portal", v.target === "container" ? { container: expr("trayElement") } : {}, [
          `<div role="status">${v.message}</div>`,
        ]),
    }),
  },
};
