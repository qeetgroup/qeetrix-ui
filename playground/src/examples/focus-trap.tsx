import { LockIcon, LockOpenIcon } from "@qeetrix/icons";
import { Button, Checkbox, cn, FocusTrap, Input, Kbd, Label } from "@qeetrix/ui";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select } from "../registry/types";

/** A short, human name for whatever element has focus. */
function describe(element: Element | null): string {
  if (!(element instanceof HTMLElement) || element === document.body) return "nothing";
  const label =
    element.getAttribute("aria-label") ??
    (element instanceof HTMLInputElement ? element.labels?.[0]?.textContent : null) ??
    element.textContent;
  return `${element.tagName.toLowerCase()} “${(label ?? "").trim().slice(0, 40)}”`;
}

/** Tracks document focus so the demo can show where Tab took it. */
function useFocusedName() {
  const [name, setName] = useState("nothing");
  useEffect(() => {
    const onFocus = () => setName(describe(document.activeElement));
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);
  return name;
}

interface InviteTrapProps {
  /** Start trapped (playground only; the gallery always starts released). */
  active?: boolean;
  restoreFocus?: boolean;
  initialFocus?: "first" | "role";
}

/** An invite form that can be trapped and released, with a live focus readout. */
function InviteTrap({
  active: initialActive = false,
  restoreFocus = true,
  initialFocus = "first",
}: InviteTrapProps) {
  const [active, setActive] = useState(initialActive);
  const roleRef = useRef<HTMLInputElement>(null);
  const focused = useFocusedName();
  const id = useId();
  const release = () => setActive(false);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && active) {
      event.stopPropagation();
      release();
    }
  };
  return (
    <div className="flex w-80 flex-col gap-3">
      <Button
        variant={active ? "secondary" : "default"}
        className="self-start"
        aria-pressed={active}
        onClick={() => setActive(true)}
      >
        {active ? (
          <LockIcon data-icon="inline-start" aria-hidden />
        ) : (
          <LockOpenIcon data-icon="inline-start" aria-hidden />
        )}
        {active ? "Focus is trapped" : "Trap focus in the form"}
      </Button>
      <FocusTrap
        active={active}
        restoreFocus={restoreFocus}
        initialFocusRef={initialFocus === "role" ? roleRef : undefined}
        onKeyDown={onKeyDown}
        className={cn(
          "flex flex-col gap-3 rounded-lg border p-3 transition-shadow",
          active && "ring-2 ring-ring",
        )}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-email`}>Work email</Label>
          <Input id={`${id}-email`} type="email" defaultValue="kavya.sharma@acme.in" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-role`}>Role</Label>
          <Input id={`${id}-role`} ref={roleRef} defaultValue="Billing" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id={`${id}-wa`} defaultChecked />
          <Label htmlFor={`${id}-wa`}>Also send the invite on WhatsApp</Label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" type="button">
            Send invite
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={release}>
            Release trap
          </Button>
        </div>
      </FocusTrap>
      <div className="flex flex-col gap-1 text-caption text-muted-foreground">
        <p>
          {active ? (
            <>
              Trap on: <Kbd>Tab</Kbd> and <Kbd>Shift</Kbd> + <Kbd>Tab</Kbd> cycle inside the form.{" "}
              <Kbd>Esc</Kbd> or “Release trap” ends it.
            </>
          ) : (
            <>
              Trap off: <Kbd>Tab</Kbd> moves on through the page as usual.
            </>
          )}
        </p>
        <p aria-live="polite">
          Focused: <code>{focused}</code>
        </p>
      </div>
    </div>
  );
}

const trapControls = {
  active: bool(false, "Active"),
  restoreFocus: bool(true, "Restore focus on release"),
  initialFocus: select(["first", "role"] as const, "first", "Initial focus"),
};

export const examples: FamilyExamples = {
  "focus-trap": {
    minHeight: 420,
    demos: [
      {
        name: "Toggle-able trap",
        description:
          "Start the trap and press Tab: focus wraps from the last control back to the first. Releasing it returns focus to the button that started it.",
        render: () => <InviteTrap />,
      },
      {
        name: "Initial focus",
        description:
          "`initialFocusRef` lands on a specific field — here the role — instead of the first tabbable control.",
        render: () => <InviteTrap initialFocus="role" />,
      },
    ],
    playground: definePlayground({
      controls: trapControls,
      render: (v) => (
        <InviteTrap
          key={`${v.active}-${v.initialFocus}`}
          active={v.active}
          restoreFocus={v.restoreFocus}
          initialFocus={v.initialFocus}
        />
      ),
      code: (v) =>
        jsx(
          "FocusTrap",
          {
            active: v.active ? expr("open") : expr("false"),
            restoreFocus: v.restoreFocus ? undefined : expr("false"),
            initialFocusRef: v.initialFocus === "role" ? expr("roleInputRef") : undefined,
          },
          [
            '<Input aria-label="Work email" type="email" />',
            '<Input aria-label="Role" ref={roleInputRef} />',
            "<Button onClick={() => setOpen(false)}>Release trap</Button>",
          ],
        ),
    }),
  },
};
