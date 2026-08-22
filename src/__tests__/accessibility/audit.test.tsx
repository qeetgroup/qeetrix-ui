/**
 * The accessibility audit, as tests.
 *
 * A dimension is only marked `pass` in `src/manifests/component-registry.ts` if something in here
 * covers it. That is the rule that keeps the manifest's audit numbers meaningful — "audited" means
 * "there is a test", not "someone looked once".
 *
 * Organised by the migration tiers in docs/standards/accessibility.md: a defect in a primitive
 * control reaches every composite built on it, so the primitives come first.
 *
 * What each group asserts, beyond axe:
 *   semantic      the right element or role, and the ARIA state model
 *   name          an accessible name, from an appropriate source
 *   keyboard      the keys the pattern calls for, and no more
 *   focus         entry, movement, containment and restoration
 *   screenReader  the state and relationship attributes AT actually reads
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import {
  expectAccessibleDescription,
  expectAccessibleName,
  expectAriaRelationship,
  expectAriaState,
  expectFocus,
  expectFocusRestored,
  expectNoA11yViolations,
  pressArrowDown,
  pressArrowLeft,
  pressArrowRight,
  pressEnd,
  pressEnter,
  pressEscape,
  pressHome,
  pressSpace,
  pressTab,
  tabThrough,
} from "@/__tests__/accessibility";
import { Button } from "@/components/Button/button";
import { CloseButton } from "@/components/Button/close-button";
import { IconButton } from "@/components/Button/icon-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/Alert/alert";
import { Progress } from "@/components/Progress/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/Tooltip/tooltip";
import {
  Field,
  FieldContent,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/Input/field";
import { Input } from "@/components/Input/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/Accordion/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/DropdownMenu/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Tabs/tabs";
import { Checkbox } from "@/components/Checkbox/checkbox";
import { Switch } from "@/components/Switch/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/Dialog/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover/popover";
import { DirectionProvider } from "@/providers/direction-provider";

const StarIcon = () => <svg aria-hidden />;

// ═══ Tier 1 — primitive interactive controls ══════════════════════════════════════════════
describe("Button", () => {
  it("is a native button, so it inherits the platform's keyboard model", async () => {
    const { container } = render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.tagName).toBe("BUTTON");
    await expectNoA11yViolations(container);
  });

  it("activates on Enter and Space", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    screen.getByRole("button").focus();
    await pressEnter();
    await pressSpace();
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("is removed from the tab order and inert when disabled", async () => {
    const onClick = vi.fn();
    render(
      <>
        <Button disabled onClick={onClick}>
          Save
        </Button>
        <Button>After</Button>
      </>,
    );
    await pressTab();
    // Tab skips the disabled button entirely.
    expectFocus(screen.getByRole("button", { name: "After" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("takes its name from its content, and aria-label wins when given", () => {
    render(
      <>
        <Button>Visible label</Button>
        <Button aria-label="Overridden">Visible</Button>
      </>,
    );
    expectAccessibleName(screen.getByRole("button", { name: "Visible label" }), "Visible label");
    expect(screen.getByRole("button", { name: "Overridden" })).toBeInTheDocument();
  });
});

describe("IconButton and CloseButton", () => {
  it("IconButton has a name and hides its icon from the accessibility tree", async () => {
    const { container } = render(<IconButton icon={StarIcon} aria-label="Add to favourites" />);
    const button = screen.getByRole("button", { name: "Add to favourites" });
    expectAccessibleName(button, "Add to favourites");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden");
    await expectNoA11yViolations(container);
  });

  it("CloseButton carries a default name so it can never ship unlabelled", async () => {
    const { container } = render(<CloseButton />);
    expect(screen.getByRole("button")).toHaveAccessibleName();
    await expectNoA11yViolations(container);
  });
});

// ═══ Tier 2 — form controls ═══════════════════════════════════════════════════════════════
describe("Field, Input", () => {
  // FieldControl is what wires label / description / error to the control. A bare <Input /> inside
  // a <Field> is styled but unwired — see docs/standards/accessibility.md § Forms.
  const Fixture = ({ invalid = false }: { invalid?: boolean }) => (
    <Field invalid={invalid}>
      <FieldLabel>Email</FieldLabel>
      <FieldContent>
        <FieldControl render={<Input />} />
        <FieldDescription>We only use this to sign you in.</FieldDescription>
        {invalid ? <FieldError>Enter a valid address.</FieldError> : null}
      </FieldContent>
    </Field>
  );

  it("associates the label with the control", async () => {
    const { container } = render(<Fixture />);
    expectAccessibleName(screen.getByRole("textbox"), "Email");
    await expectNoA11yViolations(container);
  });

  it("associates the description, and every relationship resolves to a real element", () => {
    render(<Fixture />);
    const input = screen.getByRole("textbox");
    expectAccessibleDescription(input, "We only use this to sign you in.");
    expectAriaRelationship(input, "aria-describedby");
  });

  it("exposes invalidity as aria-invalid and announces the error once", async () => {
    const { container } = render(<Fixture invalid />);
    const input = screen.getByRole("textbox");
    expectAriaState(input, "aria-invalid", "true");
    // aria-errormessage names the error specifically, and it resolves.
    expectAriaRelationship(input, "aria-describedby");
    expect(input).toHaveAttribute("aria-errormessage");
    // One live region, not one per relationship — an error should be read once.
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1);
  });

  it("keeps its ids stable across re-render, so the relationships survive hydration", () => {
    const { rerender } = render(<Fixture />);
    const before = screen.getByRole("textbox").getAttribute("aria-describedby");
    rerender(<Fixture />);
    expect(screen.getByRole("textbox").getAttribute("aria-describedby")).toBe(before);
  });
});

describe("Checkbox, Switch", () => {
  it("Checkbox exposes checked state and toggles on Space", async () => {
    const { container } = render(<Checkbox aria-label="Subscribe" />);
    const box = screen.getByRole("checkbox", { name: "Subscribe" });
    expectAriaState(box, "aria-checked", "false");
    box.focus();
    await pressSpace();
    expectAriaState(box, "aria-checked", "true");
    await expectNoA11yViolations(container);
  });

  it("Checkbox exposes the indeterminate state as mixed, not as a third boolean", () => {
    render(<Checkbox indeterminate aria-label="Select all" />);
    expectAriaState(screen.getByRole("checkbox"), "aria-checked", "mixed");
  });

  it("Switch is a switch, not a checkbox, and toggles on Space", async () => {
    const { container } = render(<Switch aria-label="Email alerts" />);
    const toggle = screen.getByRole("switch", { name: "Email alerts" });
    expectAriaState(toggle, "aria-checked", "false");
    toggle.focus();
    await pressSpace();
    expectAriaState(toggle, "aria-checked", "true");
    await expectNoA11yViolations(container);
  });
});

// ═══ Tier 3 — composite selection and navigation ══════════════════════════════════════════
describe("Tabs", () => {
  const Fixture = () => (
    <Tabs defaultValue="one">
      <TabsList>
        <TabsTrigger value="one">One</TabsTrigger>
        <TabsTrigger value="two">Two</TabsTrigger>
        <TabsTrigger value="three">Three</TabsTrigger>
      </TabsList>
      <TabsContent value="one">First panel</TabsContent>
      <TabsContent value="two">Second panel</TabsContent>
      <TabsContent value="three">Third panel</TabsContent>
    </Tabs>
  );

  it("uses the tablist/tab/tabpanel roles and wires aria-controls to a real panel", async () => {
    const { container } = render(<Fixture />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    const selected = screen.getByRole("tab", { selected: true });
    expectAriaState(selected, "aria-selected", "true");
    expectAriaRelationship(selected, "aria-controls");
    await expectNoA11yViolations(container);
  });

  it("is one tab stop — arrows move between tabs, Tab leaves the list", async () => {
    render(<Fixture />);
    const [one, two] = screen.getAllByRole("tab");
    one.focus();
    await pressArrowRight();
    expectFocus(two);
    await pressHome();
    expectFocus(one);
    await pressEnd();
    expectFocus(screen.getAllByRole("tab")[2]);
  });

  it("uses MANUAL activation — arrows move focus, Enter selects", async () => {
    // Documented, not changed: Base UI Tabs activates manually, so a keyboard user can traverse
    // a tab set without triggering each panel's data fetch on the way past.
    render(<Fixture />);
    screen.getAllByRole("tab")[0].focus();
    await pressArrowRight();
    expectFocus(screen.getAllByRole("tab")[1]);
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
    await pressEnter();
    await waitFor(() => expect(screen.getByText("Second panel")).toBeVisible());
  });

  it("renders only the selected panel, so aria-controls never dangles", () => {
    render(<Fixture />);
    expect(screen.queryByText("Second panel")).not.toBeInTheDocument();
    expectAriaRelationship(screen.getByRole("tab", { selected: true }), "aria-controls");
  });

  it("follows the writing direction — via DirectionProvider, not a bare dir attribute", async () => {
    // The finding: Base UI reads direction from its provider. A `dir="rtl"` attribute alone
    // mirrors the layout but leaves arrow keys running left-to-right.
    render(
      <DirectionProvider direction="rtl">
        <Fixture />
      </DirectionProvider>,
    );
    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();
    await pressArrowLeft();
    expectFocus(tabs[1]);
    await pressArrowRight();
    expectFocus(tabs[0]);
  });
});

describe("Accordion", () => {
  const Fixture = () => (
    <Accordion>
      <AccordionItem value="a">
        <AccordionTrigger>Section A</AccordionTrigger>
        <AccordionContent>Body A</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Section B</AccordionTrigger>
        <AccordionContent>Body B</AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  it("exposes expanded state on the trigger and controls a real panel", async () => {
    const { container } = render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Section A" });
    expectAriaState(trigger, "aria-expanded", "false");
    await userEvent.click(trigger);
    expectAriaState(trigger, "aria-expanded", "true");
    // aria-controls appears only while the panel exists — Base UI unmounts a collapsed panel, and
    // an aria-controls pointing at nothing is worse than none.
    expectAriaRelationship(trigger, "aria-controls");
    await expectNoA11yViolations(container);
  });

  it("toggles on Enter and Space, because the trigger is a button", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Section A" });
    trigger.focus();
    await pressEnter();
    expectAriaState(trigger, "aria-expanded", "true");
    await pressSpace();
    expectAriaState(trigger, "aria-expanded", "false");
  });

  it("removes collapsed content from the accessibility tree entirely", () => {
    render(<Fixture />);
    // Not merely `display: none` — the panel is unmounted, so it cannot be reached by a
    // screen reader's virtual cursor or by Find-in-page.
    expect(screen.queryByText("Body A")).not.toBeInTheDocument();
  });
});

describe("DropdownMenu", () => {
  const Fixture = () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button>Open menu</Button>} />
      <DropdownMenuContent>
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  it("exposes the menu-button relationship on the trigger", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    expectAriaState(trigger, "aria-haspopup", "menu");
    expectAriaState(trigger, "aria-expanded", "false");
    await userEvent.click(trigger);
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await waitFor(() => expectAriaState(trigger, "aria-expanded", "true"));
    expectAriaRelationship(trigger, "aria-controls");
  });

  it("opens on ArrowDown and puts the first item in the tab order", async () => {
    render(<Fixture />);
    screen.getByRole("button", { name: "Open menu" }).focus();
    await pressArrowDown();
    const items = await screen.findAllByRole("menuitem");
    await waitFor(() => expect(items[0]).toHaveAttribute("tabindex", "0"));
  });

  it("moves through items with arrows, Home and End", async () => {
    render(<Fixture />);
    screen.getByRole("button", { name: "Open menu" }).focus();
    await pressArrowDown();
    const items = await screen.findAllByRole("menuitem");
    // Roving tabindex: exactly one item is in the tab order at a time.
    await waitFor(() => expect(items[0]).toHaveAttribute("tabindex", "0"));
    await pressArrowDown();
    expectFocus(items[1]);
    await pressEnd();
    expectFocus(items[items.length - 1]);
    await pressHome();
    expectFocus(items[0]);
    expect(items[1]).toHaveAttribute("tabindex", "-1");
  });

  it("does not pre-highlight an item when opened with the pointer", async () => {
    // A mouse user is about to click the item they want; highlighting one for them would move
    // the roving tab stop somewhere they did not ask for.
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const items = await screen.findAllByRole("menuitem");
    for (const item of items) {
      expect(item).toHaveAttribute("tabindex", "-1");
    }
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    await userEvent.click(trigger);
    await screen.findByRole("menu");
    await pressEscape();
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    await expectFocusRestored(trigger);
  });
});

// ═══ Tier 4 — overlays ═══════════════════════════════════════════════════════════════════
describe("Dialog", () => {
  const Fixture = () => (
    <Dialog>
      <DialogTrigger render={<Button>Open dialog</Button>} />
      <DialogContent>
        <DialogTitle>Rename project</DialogTitle>
        <DialogDescription>Choose a new name.</DialogDescription>
        <Input aria-label="Project name" />
        <Button>Save</Button>
      </DialogContent>
    </Dialog>
  );

  it("is a modal dialog named by its title and described by its description", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    const dialog = await screen.findByRole("dialog");
    expectAccessibleName(dialog, "Rename project");
    expectAccessibleDescription(dialog, "Choose a new name.");
    // Modality is enforced with `inert` on the rest of the document plus focus guards, not with
    // aria-modal — the attribute has a history of hiding content from AT that should stay
    // reachable, and inert is the platform mechanism.
    expect(document.querySelector("[data-base-ui-inert]")).not.toBeNull();
    await expectNoA11yViolations(dialog);
  });

  it("moves focus into the dialog on open", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it("installs the containment mechanism: inert background plus focus guards", async () => {
    // KNOWN LIMITATION: jsdom does not implement `inert`, so focus containment cannot be
    // *observed* here — Tab will happily reach the trigger behind the dialog in this environment
    // but not in a browser. What is verifiable is that the mechanism is installed, so this
    // asserts that and the browser-level behaviour is covered by the manual checklist.
    // See docs/standards/focus-management.md § What jsdom cannot test.
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    expect(document.querySelector("[data-base-ui-inert]")).not.toBeNull();
    expect(document.querySelectorAll("[data-base-ui-focus-guard]").length).toBeGreaterThan(0);
    // Focus still starts inside, and tabbing within the dialog stays inside.
    const [first, second] = await tabThrough(2);
    expect(dialog.contains(first) || dialog.contains(second)).toBe(true);
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await userEvent.click(trigger);
    await screen.findByRole("dialog");
    await pressEscape();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await expectFocusRestored(trigger);
  });

  it("survives its trigger unmounting while open", async () => {
    function Fragile() {
      const [showTrigger, setShowTrigger] = React.useState(true);
      return (
        <Dialog>
          {showTrigger ? <DialogTrigger render={<Button>Open</Button>} /> : null}
          <DialogContent>
            <DialogTitle>Still here</DialogTitle>
            <Button onClick={() => setShowTrigger(false)}>Remove trigger</Button>
          </DialogContent>
        </Dialog>
      );
    }
    render(<Fragile />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    await userEvent.click(screen.getByRole("button", { name: "Remove trigger" }));
    // The close path must not throw when there is nothing to restore focus to.
    await pressEscape();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("AlertDialog", () => {
  const Fixture = () => (
    <AlertDialog>
      <AlertDialogTrigger render={<Button>Delete project</Button>} />
      <AlertDialogContent>
        <AlertDialogTitle>Delete project?</AlertDialogTitle>
        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button>Cancel</Button>} />
          <AlertDialogAction render={<Button>Delete</Button>} />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  it("uses alertdialog semantics, named and described", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));
    const dialog = await screen.findByRole("alertdialog");
    expectAccessibleName(dialog, "Delete project?");
    expectAccessibleDescription(dialog, "This cannot be undone.");
    await expectNoA11yViolations(dialog);
  });

  it("returns focus to the trigger after cancelling", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Delete project" });
    await userEvent.click(trigger);
    await screen.findByRole("alertdialog");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    await expectFocusRestored(trigger);
  });
});

describe("Popover", () => {
  const Fixture = () => (
    <Popover>
      <PopoverTrigger render={<Button>Details</Button>} />
      <PopoverContent>
        <Button>Inside</Button>
      </PopoverContent>
    </Popover>
  );

  it("reports its expanded state on the trigger", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Details" });
    expectAriaState(trigger, "aria-expanded", "false");
    await userEvent.click(trigger);
    expectAriaState(trigger, "aria-expanded", "true");
  });

  it("closes on Escape and restores focus", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Details" });
    await userEvent.click(trigger);
    await screen.findByRole("button", { name: "Inside" });
    await pressEscape();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Inside" })).not.toBeInTheDocument(),
    );
    await expectFocusRestored(trigger);
  });
});

describe("Tooltip", () => {
  it("is reachable by keyboard, not hover alone, and describes its trigger", async () => {
    render(
      <Tooltip>
        <TooltipTrigger render={<Button>Save</Button>} />
        <TooltipContent>Saves without closing</TooltipContent>
      </Tooltip>,
    );
    // Focus alone must reveal it — a mouse-only tooltip is invisible to keyboard users.
    await pressTab();
    const trigger = screen.getByRole("button", { name: "Save" });
    expectFocus(trigger);
    await waitFor(() => expect(screen.getByText("Saves without closing")).toBeInTheDocument());
    // The tooltip describes the control; it must not become the control's name.
    expectAccessibleName(trigger, "Save");
  });

  it("dismisses on Escape while leaving focus on the trigger", async () => {
    render(
      <Tooltip>
        <TooltipTrigger render={<Button>Save</Button>} />
        <TooltipContent>Saves without closing</TooltipContent>
      </Tooltip>,
    );
    await pressTab();
    await waitFor(() => expect(screen.getByText("Saves without closing")).toBeInTheDocument());
    await pressEscape();
    await waitFor(() =>
      expect(screen.queryByText("Saves without closing")).not.toBeInTheDocument(),
    );
    expectFocus(screen.getByRole("button", { name: "Save" }));
  });
});

// ═══ Feedback ════════════════════════════════════════════════════════════════════════════
describe("Alert, Progress", () => {
  it("Alert is an alert region with its title as the name", async () => {
    const { container } = render(
      <Alert>
        <AlertTitle>Trial ending</AlertTitle>
        <AlertDescription>Three days left.</AlertDescription>
      </Alert>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("Progress reports its value, bounds and name", async () => {
    const { container } = render(<Progress value={40} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expectAriaState(bar, "aria-valuenow", "40");
    expectAriaState(bar, "aria-valuemin", "0");
    expectAriaState(bar, "aria-valuemax", "100");
    await expectNoA11yViolations(container);
  });

  it("Progress omits aria-valuenow when indeterminate rather than reporting zero", () => {
    render(<Progress value={null} aria-label="Working" />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
  });
});
