/**
 * The component API contract, exercised on the pilot set.
 *
 * The contract validator checks what the *metadata* claims. These tests check that the
 * components actually behave that way — a registry entry saying Tabs is controlled by
 * `value`/`defaultValue`/`onValueChange` is worth nothing if the component ignores the prop.
 *
 * Four things per pilot, where they apply:
 *   forwarding    — className, style, id, data-* and aria-* survive
 *   ref           — reaches the element a consumer would expect
 *   controlled    — the prop stays authoritative when the parent ignores the callback
 *   uncontrolled  — the default seeds it and the component owns it afterwards
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/Button/button";
import { IconButton } from "@/components/Button/icon-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/Alert/alert";
import { Input } from "@/components/Input/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Tabs/tabs";
import { Checkbox } from "@/components/Checkbox/checkbox";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/Card/card";
import { Spoiler } from "@/components/Spoiler/spoiler";

const FORWARDED = {
  id: "forwarded-id",
  title: "forwarded title",
  className: "consumer-class",
  style: { outlineOffset: "7px" },
  "data-analytics": "cta",
  "aria-describedby": "helper",
} as const;

/** A consumer's className, style, id and their data- and aria- attributes must survive. */
function expectForwarded(element: HTMLElement) {
  expect(element).toHaveAttribute("id", "forwarded-id");
  expect(element).toHaveAttribute("title", "forwarded title");
  expect(element).toHaveClass("consumer-class");
  expect(element).toHaveStyle({ outlineOffset: "7px" });
  expect(element).toHaveAttribute("data-analytics", "cta");
  expect(element).toHaveAttribute("aria-describedby", "helper");
}

describe("prop forwarding", () => {
  it("Button forwards to the button element and keeps its own classes", () => {
    render(<Button {...FORWARDED}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expectForwarded(button);
    // The consumer's class is merged, not substituted for the component's own styling.
    expect(button).toHaveAttribute("data-slot", "button");
  });

  it("Input forwards, including native input attributes it never declares", () => {
    render(
      <Input {...FORWARDED} name="email" autoComplete="email" form="signup" required readOnly />,
    );
    const input = screen.getByRole("textbox");
    expectForwarded(input);
    expect(input).toHaveAttribute("name", "email");
    expect(input).toHaveAttribute("autocomplete", "email");
    expect(input).toHaveAttribute("form", "signup");
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("readonly");
  });

  it("Card forwards to its root", () => {
    render(<Card {...FORWARDED}>content</Card>);
    expectForwarded(screen.getByText("content"));
  });

  it("Alert forwards to its root", () => {
    render(
      <Alert {...FORWARDED}>
        <AlertTitle>Heads up</AlertTitle>
      </Alert>,
    );
    expectForwarded(screen.getByRole("alert"));
  });

  it("IconButton forwards while keeping the label it enforces", () => {
    const Icon = () => <svg aria-hidden />;
    render(<IconButton icon={Icon} aria-label="Dismiss" id="x" data-analytics="cta" />);
    const button = screen.getByRole("button", { name: "Dismiss" });
    expect(button).toHaveAttribute("id", "x");
    expect(button).toHaveAttribute("data-analytics", "cta");
  });

  it("does not drop a consumer's event handler", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("refs", () => {
  it("Button's ref reaches the button element", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Save</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("Input's ref reaches the input element", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    // …and is usable, which is the reason a consumer wanted it.
    ref.current?.focus();
    expect(ref.current).toHaveFocus();
  });

  it("Card's ref reaches its root element", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref}>content</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("variants and sizes", () => {
  it("Button applies its variant and size without losing the base class", () => {
    render(
      <>
        <Button variant="destructive">danger</Button>
        <Button size="sm">small</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "danger" }).className).toContain("text-destructive");
    expect(screen.getByRole("button", { name: "small" }).className).toContain("h-7");
  });

  it("Alert accepts the canonical tone and its legacy alias identically", () => {
    const { container: canonical } = render(
      <Alert variant="destructive">
        <AlertDescription>a</AlertDescription>
      </Alert>,
    );
    const { container: legacy } = render(
      <Alert variant="danger">
        <AlertDescription>b</AlertDescription>
      </Alert>,
    );
    const classesOf = (root: HTMLElement) => root.querySelector("[data-slot=alert]")?.className;
    expect(classesOf(canonical)).toBe(classesOf(legacy));
  });

  it("Card's size selects the padding scale via a data attribute", () => {
    render(<Card size="sm">content</Card>);
    expect(screen.getByText("content")).toHaveAttribute("data-size", "sm");
  });
});

describe("controlled and uncontrolled", () => {
  describe("Tabs", () => {
    const Fixture = (props: React.ComponentProps<typeof Tabs>) => (
      <Tabs {...props}>
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First</TabsContent>
        <TabsContent value="two">Second</TabsContent>
      </Tabs>
    );

    it("uncontrolled: defaultValue seeds it and clicking moves it", async () => {
      render(<Fixture defaultValue="one" />);
      expect(screen.getByText("First")).toBeVisible();
      await userEvent.click(screen.getByRole("tab", { name: "Two" }));
      expect(screen.getByText("Second")).toBeVisible();
    });

    it("controlled: the prop stays authoritative when the parent ignores the change", async () => {
      const onValueChange = vi.fn();
      render(<Fixture value="one" onValueChange={onValueChange} />);
      await userEvent.click(screen.getByRole("tab", { name: "Two" }));
      expect(onValueChange).toHaveBeenCalledWith("two", expect.anything());
      // The parent did not update `value`, so the panel must not have moved.
      expect(screen.getByText("First")).toBeVisible();
      expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Checkbox", () => {
    it("uncontrolled: defaultChecked seeds it and clicking toggles it", async () => {
      render(<Checkbox defaultChecked aria-label="Agree" />);
      const box = screen.getByRole("checkbox", { name: "Agree" });
      expect(box).toBeChecked();
      await userEvent.click(box);
      expect(box).not.toBeChecked();
    });

    it("controlled: the prop stays authoritative", async () => {
      const onCheckedChange = vi.fn();
      render(<Checkbox checked={false} onCheckedChange={onCheckedChange} aria-label="Agree" />);
      const box = screen.getByRole("checkbox", { name: "Agree" });
      await userEvent.click(box);
      expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
      expect(box).not.toBeChecked();
    });
  });

  describe("Spoiler", () => {
    // Spoiler gained the controlled triple in Phase 3; `defaultExpanded` is unchanged.
    it("uncontrolled: defaultExpanded seeds it and the toggle owns it", async () => {
      render(<Spoiler defaultExpanded={false}>hidden text</Spoiler>);
      await userEvent.click(screen.getByRole("button", { name: "Show more" }));
      expect(screen.getByRole("button", { name: "Show less" })).toBeVisible();
    });

    it("controlled: the prop stays authoritative and the callback reports intent", async () => {
      const onExpandedChange = vi.fn();
      render(
        <Spoiler expanded={false} onExpandedChange={onExpandedChange}>
          hidden text
        </Spoiler>,
      );
      await userEvent.click(screen.getByRole("button", { name: "Show more" }));
      expect(onExpandedChange).toHaveBeenCalledExactlyOnceWith(true);
      // Still collapsed: the consumer owns the state.
      expect(screen.getByRole("button", { name: "Show more" })).toBeVisible();
    });
  });
});

describe("composition", () => {
  it("Card's parts each carry their slot, so a consumer can target them", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
        </CardHeader>
        <CardContent>body</CardContent>
        <CardFooter>footer</CardFooter>
      </Card>,
    );
    for (const slot of ["card", "card-header", "card-title", "card-content", "card-footer"]) {
      expect(document.querySelector(`[data-slot="${slot}"]`), slot).not.toBeNull();
    }
  });
});

describe("disabled", () => {
  it("Button stops responding and reports the state", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("Input stops accepting input", async () => {
    render(<Input disabled defaultValue="" />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "hello");
    expect(input).toHaveValue("");
  });
});
