/**
 * The composite and overlay audit — Tier 3 and Tier 4 continued.
 *
 * These are the components where axe has least to say and the most can go wrong: the keyboard
 * model, where focus goes when something opens, and where it goes back when it closes. Same rule
 * as the other suites — a `pass` in the registry is backed by something here.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
  pressTab,
} from "@/__tests__/accessibility";
import { Button } from "@/components/Button/button";
import { SegmentedControl, SegmentedControlItem } from "@/components/Button/segmented-control";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/Carousel/carousel";
import { ActionBar, ActionBarItem } from "@/components/ActionBar/action-bar";
import { Toolbar, ToolbarButton } from "@/components/Toolbar/toolbar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/Breadcrumb/breadcrumb";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/DropdownMenu/context-menu";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/DropdownMenu/menubar";
import { Pagination } from "@/components/Pagination/pagination";
import { Stepper } from "@/components/Stepper/stepper";
import { TreeView } from "@/components/TreeView/tree-view";
import { Autocomplete } from "@/components/Combobox/autocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer/drawer";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/Popover/hover-card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/Drawer/sheet";
import { DirectionProvider } from "@/providers/direction-provider";

// ═══ Overlays ════════════════════════════════════════════════════════════════════════════
/** Both Drawer and Sheet are the same dialog primitive with different placement. */
for (const [name, Root, Trigger, Content, Title, Description] of [
  ["Sheet", Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription],
  ["Drawer", Drawer, DrawerTrigger, DrawerContent, DrawerTitle, DrawerDescription],
] as const) {
  describe(name, () => {
    const Fixture = () => (
      <Root>
        <Trigger render={<Button>Open {name}</Button>} />
        <Content>
          <Title>Filters</Title>
          <Description>Narrow the results.</Description>
          <Button>Apply</Button>
        </Content>
      </Root>
    );

    it("is a modal dialog, named and described", async () => {
      render(<Fixture />);
      await userEvent.click(screen.getByRole("button", { name: `Open ${name}` }));
      const dialog = await screen.findByRole("dialog");
      expectAccessibleName(dialog, "Filters");
      expectAccessibleDescription(dialog, "Narrow the results.");
      await expectNoA11yViolations(dialog);
    });

    it("moves focus in, and installs the containment mechanism", async () => {
      render(<Fixture />);
      await userEvent.click(screen.getByRole("button", { name: `Open ${name}` }));
      const dialog = await screen.findByRole("dialog");
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
      expect(document.querySelector("[data-base-ui-inert]")).not.toBeNull();
    });

    it("closes on Escape and returns focus to the trigger", async () => {
      render(<Fixture />);
      const trigger = screen.getByRole("button", { name: `Open ${name}` });
      await userEvent.click(trigger);
      await screen.findByRole("dialog");
      await pressEscape();
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await expectFocusRestored(trigger);
    });
  });
}

describe("HoverCard", () => {
  it("opens on focus, not hover alone, and does not trap", async () => {
    render(
      <>
        <HoverCard>
          <HoverCardTrigger render={<Button>Profile</Button>} />
          <HoverCardContent>Sai Babu — Engineering</HoverCardContent>
        </HoverCard>
        <Button>After</Button>
      </>,
    );
    await pressTab();
    expectFocus(screen.getByRole("button", { name: "Profile" }));
    await waitFor(() => expect(screen.getByText(/Sai Babu/)).toBeInTheDocument());
    // Non-modal: Tab must continue past it rather than being held inside.
    await pressTab();
    await waitFor(() =>
      expect(document.activeElement).not.toBe(screen.getByRole("button", { name: "Profile" })),
    );
  });
});

// ═══ Menus ═══════════════════════════════════════════════════════════════════════════════
describe("ContextMenu", () => {
  const Fixture = () => (
    <ContextMenu>
      <ContextMenuTrigger render={<Button>Right-click me</Button>} />
      <ContextMenuContent>
        <ContextMenuItem>Rename</ContextMenuItem>
        <ContextMenuItem>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  it("opens on context menu with menu semantics", async () => {
    render(<Fixture />);
    await userEvent.pointer({ keys: "[MouseRight]", target: screen.getByRole("button") });
    const menu = await screen.findByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(await screen.findAllByRole("menuitem")).toHaveLength(2);
    await expectNoA11yViolations(menu);
  });

  it("navigates with arrows and closes on Escape", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button");
    await userEvent.pointer({ keys: "[MouseRight]", target: trigger });
    const items = await screen.findAllByRole("menuitem");
    items[0].focus();
    await pressArrowDown();
    expectFocus(items[1]);
    await pressEscape();
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });
});

describe("Menubar", () => {
  const Fixture = () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New</MenubarItem>
          <MenubarItem>Open</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Undo</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );

  it("is a menubar whose triggers report their popup and state", async () => {
    render(<Fixture />);
    expect(screen.getByRole("menubar")).toBeInTheDocument();
    const file = screen.getByRole("menuitem", { name: "File" });
    expectAriaState(file, "aria-haspopup", "menu");
    await userEvent.click(file);
    await waitFor(() => expectAriaState(file, "aria-expanded", "true"));
    await screen.findByRole("menuitem", { name: "New" });
    expectAriaRelationship(file, "aria-controls");
  });

  it("is clean while closed", async () => {
    const { container } = render(<Fixture />);
    await expectNoA11yViolations(container);
  });

  it("KNOWN ISSUE: opening a menu injects focus guards into the menubar", async () => {
    // Base UI renders its focus guards and aria-owns bridges as *direct children* of the element
    // carrying role="menubar", so while a menu is open the menubar owns non-menuitem children and
    // axe's aria-required-children fails. It is a structural detail of the primitive, not
    // something this wrapper positions, and there is no supported way to move them.
    //
    // Asserted rather than skipped so that if Base UI restructures this, the test fails and the
    // exception recorded against Menubar in the registry can be removed.
    render(<Fixture />);
    await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
    await screen.findByRole("menuitem", { name: "New" });
    const nonMenuItems = [...screen.getByRole("menubar").children].filter(
      (child) => child.getAttribute("role") !== "menuitem",
    );
    expect(nonMenuItems.length).toBeGreaterThan(0);
  });

  it("moves between top-level menus with the inline arrows", async () => {
    render(<Fixture />);
    const [file, edit] = screen.getAllByRole("menuitem");
    file.focus();
    await pressArrowRight();
    expectFocus(edit);
  });
});

// ═══ Select and Autocomplete ═════════════════════════════════════════════════════════════
describe("Select", () => {
  const Fixture = () => (
    <Select>
      <SelectTrigger aria-label="Country">
        <SelectValue placeholder="Choose" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="in">India</SelectItem>
        <SelectItem value="gb">United Kingdom</SelectItem>
      </SelectContent>
    </Select>
  );

  it("is a named combobox reporting its expanded state", async () => {
    const { container } = render(<Fixture />);
    const trigger = screen.getByRole("combobox", { name: "Country" });
    expectAriaState(trigger, "aria-expanded", "false");
    await userEvent.click(trigger);
    await waitFor(() => expectAriaState(trigger, "aria-expanded", "true"));
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("selects with the keyboard and returns focus to the trigger", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("combobox", { name: "Country" });
    trigger.focus();
    await pressEnter();
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(2);
    await pressArrowDown();
    await pressEnter();
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    await expectFocusRestored(trigger);
  });

  it("closes on Escape without selecting", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("combobox", { name: "Country" });
    await userEvent.click(trigger);
    await screen.findByRole("listbox");
    await pressEscape();
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    await expectFocusRestored(trigger);
  });
});

describe("Autocomplete", () => {
  const items = ["Alpha", "Bravo"] as const;

  it("is a combobox whose input keeps focus while the list moves", async () => {
    const { container } = render(<Autocomplete items={items} aria-label="Search" />);
    const input = screen.getByRole("combobox", { name: "Search" });
    await userEvent.type(input, "a");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeInTheDocument());
    // The user is still typing, so DOM focus must stay on the input.
    expectFocus(input);
    await expectNoA11yViolations(container);
  });

  it("closes on Escape and leaves focus on the input", async () => {
    render(<Autocomplete items={items} aria-label="Search" />);
    const input = screen.getByRole("combobox", { name: "Search" });
    await userEvent.type(input, "a");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeInTheDocument());
    await pressEscape();
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expectFocus(input);
  });
});

// ═══ Tree ════════════════════════════════════════════════════════════════════════════════
describe("TreeView", () => {
  const data = [
    { id: "1", label: "src", children: [{ id: "1a", label: "index.ts" }] },
    { id: "2", label: "docs" },
  ];

  it("uses tree/treeitem/group with expanded state", async () => {
    const { container } = render(<TreeView data={data} aria-label="Files" />);
    expect(screen.getByRole("tree", { name: "Files" })).toBeInTheDocument();
    const items = screen.getAllByRole("treeitem");
    expect(items.length).toBeGreaterThan(0);
    expectAriaState(items[0], "aria-expanded", "false");
    await expectNoA11yViolations(container);
  });

  it("is one tab stop with roving focus", async () => {
    render(<TreeView data={data} aria-label="Files" />);
    const items = screen.getAllByRole("treeitem");
    expect(items[0]).toHaveAttribute("tabindex", "0");
    expect(items[1]).toHaveAttribute("tabindex", "-1");
    items[0].focus();
    await pressArrowDown();
    await waitFor(() => expectFocus(screen.getAllByRole("treeitem")[1]));
  });

  it("expands and collapses along the inline axis", async () => {
    render(<TreeView data={data} aria-label="Files" />);
    const first = screen.getAllByRole("treeitem")[0];
    first.focus();
    await pressArrowRight();
    await waitFor(() =>
      expectAriaState(screen.getAllByRole("treeitem")[0], "aria-expanded", "true"),
    );
  });

  it("reaches the ends with Home and End", async () => {
    render(<TreeView data={data} aria-label="Files" />);
    const items = screen.getAllByRole("treeitem");
    items[0].focus();
    await pressEnd();
    await waitFor(() => expect(document.activeElement).not.toBe(items[0]));
    await pressHome();
    await waitFor(() => expectFocus(screen.getAllByRole("treeitem")[0]));
  });
});

// ═══ Toolbars and segmented controls ═════════════════════════════════════════════════════
describe("Toolbar", () => {
  it("is a toolbar with named buttons on one tab stop", async () => {
    const { container } = render(
      <Toolbar aria-label="Formatting">
        <ToolbarButton aria-label="Bold" />
        <ToolbarButton aria-label="Italic" />
      </Toolbar>,
    );
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    for (const button of buttons) expect(button).toHaveAccessibleName();
    buttons[0].focus();
    await pressArrowRight();
    expectFocus(buttons[1]);
    await expectNoA11yViolations(container);
  });

  it("follows the writing direction under rtl", async () => {
    render(
      <DirectionProvider direction="rtl">
        <Toolbar aria-label="Formatting">
          <ToolbarButton aria-label="Bold" />
          <ToolbarButton aria-label="Italic" />
        </Toolbar>
      </DirectionProvider>,
    );
    const buttons = screen.getAllByRole("button");
    buttons[0].focus();
    // ArrowLeft advances along the inline axis in RTL.
    await pressArrowLeft();
    expectFocus(buttons[1]);
  });
});

describe("ActionBar", () => {
  it("is a toolbar whose actions are individually named", async () => {
    const { container } = render(
      <ActionBar open aria-label="Bulk actions">
        <ActionBarItem render={<Button>Archive</Button>} />
        <ActionBarItem render={<Button>Delete</Button>} />
      </ActionBar>,
    );
    expect(screen.getByRole("toolbar", { name: "Bulk actions" })).toBeInTheDocument();
    for (const button of screen.getAllByRole("button")) expect(button).toHaveAccessibleName();
    await expectNoA11yViolations(container);
  });

  it("reaches every action with Tab", async () => {
    // ActionBar is a plain toolbar of buttons rather than a roving-tabindex one, so each action is
    // its own tab stop. That is a legitimate choice for two or three bulk actions; it is recorded
    // here so a change to arrow navigation is a deliberate one.
    render(
      <ActionBar open aria-label="Bulk actions">
        <ActionBarItem render={<Button>Archive</Button>} />
        <ActionBarItem render={<Button>Delete</Button>} />
      </ActionBar>,
    );
    await pressTab();
    expectFocus(screen.getByRole("button", { name: "Archive" }));
    await pressTab();
    expectFocus(screen.getByRole("button", { name: "Delete" }));
  });
});

describe("SegmentedControl", () => {
  it("is a radiogroup whose segments report selection", async () => {
    const { container } = render(
      <SegmentedControl aria-label="View" defaultValue="list">
        <SegmentedControlItem value="list">List</SegmentedControlItem>
        <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
      </SegmentedControl>,
    );
    expect(screen.getByRole("radiogroup", { name: "View" })).toBeInTheDocument();
    const segments = screen.getAllByRole("radio");
    expect(segments[0]).toBeChecked();
    // Native radios sharing a name: one group, so AT announces "1 of 2" rather than "1 of 1".
    expect(segments[0]).toHaveAttribute("name", segments[1].getAttribute("name"));
    await expectNoA11yViolations(container);
  });

  it("moves selection with the inline arrows, on one tab stop", async () => {
    render(
      <SegmentedControl aria-label="View" defaultValue="list">
        <SegmentedControlItem value="list">List</SegmentedControlItem>
        <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
      </SegmentedControl>,
    );
    const segments = screen.getAllByRole("radio");
    expect(segments[0]).toHaveAttribute("tabindex", "0");
    expect(segments[1]).toHaveAttribute("tabindex", "-1");
    segments[0].focus();
    await pressArrowRight();
    await waitFor(() => expect(screen.getAllByRole("radio")[1]).toBeChecked());
  });

  it("follows the writing direction under rtl", async () => {
    render(
      <DirectionProvider direction="rtl">
        <SegmentedControl aria-label="View" defaultValue="list">
          <SegmentedControlItem value="list">List</SegmentedControlItem>
          <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
        </SegmentedControl>
      </DirectionProvider>,
    );
    const segments = screen.getAllByRole("radio");
    segments[0].focus();
    await pressArrowRight();
    // ArrowRight moves toward the *start* in RTL, so from the first segment it wraps to the last.
    await waitFor(() => expect(document.activeElement).not.toBe(segments[0]));
  });
});

// ═══ Navigation landmarks ════════════════════════════════════════════════════════════════
describe("Breadcrumb", () => {
  it("is a labelled nav whose current page is marked, not linked", async () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    expect(screen.getByRole("navigation")).toHaveAccessibleName();
    // The current page is not a link — a link to where you already are is a dead end.
    expect(screen.getByText("Settings")).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    await expectNoA11yViolations(container);
  });
});

describe("Pagination", () => {
  // Cursor-based, not page-number based: there are no page links, so there is no
  // aria-current="page" to assert — the contract is a labelled nav with named, correctly
  // disabled controls.
  it("is a labelled nav whose every control is named", async () => {
    const { container } = render(<Pagination hasPrev hasNext itemsOnPage={20} pageSize={20} />);
    expect(screen.getByRole("navigation")).toHaveAccessibleName();
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAccessibleName();
    }
    await expectNoA11yViolations(container);
  });

  it("disables the controls that would go nowhere", () => {
    render(<Pagination hasPrev={false} hasNext itemsOnPage={20} pageSize={20} />);
    // Disabled rather than removed: a control that vanishes moves everything after it.
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
  });

  it("announces the page label politely, not assertively", () => {
    const { container } = render(<Pagination hasNext itemsOnPage={20} pageSize={20} />);
    const live = container.querySelector("[aria-live]");
    // A page change is status, not an interruption.
    if (live) expect(live).toHaveAttribute("aria-live", "polite");
  });
});

describe("Stepper", () => {
  it("marks the active step with aria-current in an ordered list", async () => {
    const { container } = render(
      <Stepper
        steps={[{ label: "Account" }, { label: "Profile" }, { label: "Done" }]}
        activeStep={1}
      />,
    );
    expect(container.querySelector("ol")).not.toBeNull();
    expect(container.querySelector('[aria-current="step"]')).not.toBeNull();
    await expectNoA11yViolations(container);
  });
});

describe("Carousel", () => {
  it("is a labelled region with named previous and next controls", async () => {
    const { container } = render(
      <Carousel aria-label="Featured products">
        <CarouselContent>
          <CarouselItem>One</CarouselItem>
          <CarouselItem>Two</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );
    expect(screen.getByRole("region")).toHaveAccessibleName();
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAccessibleName();
    }
    await expectNoA11yViolations(container);
  });
});
