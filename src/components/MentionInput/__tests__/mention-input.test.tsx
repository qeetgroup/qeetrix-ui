import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { MentionInput } from "@/components/MentionInput/mention-input";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("MentionInput", () => {
  it("emits value changes", () => {
    const onValueChange = vi.fn();
    render(
      <MentionInput aria-label="Comment" value="hi" people={[]} onValueChange={onValueChange} />,
    );
    const ta = screen.getByLabelText("Comment");
    expect(ta).toHaveValue("hi");
    fireEvent.change(ta, { target: { value: "hi @" } });
    expect(onValueChange).toHaveBeenCalledWith("hi @");
  });

  it("shows mention suggestions when typing the trigger", () => {
    function Wrapper() {
      const [v, setV] = React.useState("");
      return (
        <MentionInput
          aria-label="Comment"
          value={v}
          people={[{ id: "1", label: "Ada Lovelace" }]}
          onValueChange={setV}
        />
      );
    }
    render(<Wrapper />);
    fireEvent.change(screen.getByLabelText("Comment"), {
      target: { value: "@ada", selectionStart: 4 },
    });
    const textbox = screen.getByRole("textbox", { name: "Comment" });
    const listbox = screen.getByRole("listbox", { name: "Mention suggestions" });
    const option = screen.getByRole("option", { name: "Ada Lovelace" });

    expect(textbox).toHaveAttribute("aria-controls", listbox.id);
    expect(textbox).toHaveAttribute("aria-activedescendant", option.id);
    expect(textbox).toHaveAttribute("aria-autocomplete", "list");
    expect(textbox).toHaveAttribute("aria-haspopup", "listbox");
  });

  it("updates the active descendant as keyboard focus moves through suggestions", () => {
    function Wrapper() {
      const [value, setValue] = React.useState("");
      return (
        <MentionInput
          aria-label="Comment"
          value={value}
          people={[
            { id: "1", label: "Ada Lovelace" },
            { id: "2", label: "Grace Hopper" },
          ]}
          onValueChange={setValue}
        />
      );
    }

    render(<Wrapper />);
    const input = screen.getByLabelText("Comment");
    fireEvent.change(input, { target: { value: "@", selectionStart: 1 } });

    const options = screen.getAllByRole("option");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", options[1].id);

    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("@Grace Hopper ");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <MentionInput aria-label="Comment" value="" people={[]} onValueChange={() => {}} />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

const PEOPLE = [
  { id: "1", label: "Ada Lovelace" },
  { id: "2", label: "Alan Turing" },
  { id: "3", label: "Alonzo Church" },
];

function Composer(props: Partial<React.ComponentProps<typeof MentionInput>> = {}) {
  const [value, setValue] = React.useState("");
  return (
    <MentionInput
      aria-label="Comment"
      value={value}
      people={PEOPLE}
      onValueChange={setValue}
      {...props}
    />
  );
}

describe("MentionInput popup state", () => {
  const open = () =>
    fireEvent.change(screen.getByLabelText("Comment"), {
      target: { value: "@a", selectionStart: 2 },
    });
  const status = () => document.querySelector("[data-slot='mention-input-status']");

  it("announces the suggestion count politely while open", () => {
    render(<Composer />);
    expect(status()).toHaveAttribute("aria-live", "polite");
    expect(status()).toHaveTextContent("");

    open();
    expect(status()).toHaveTextContent("3 suggestions available");
  });

  it("uses the singular form for one match and clears the announcement on close", () => {
    render(<Composer />);
    fireEvent.change(screen.getByLabelText("Comment"), {
      target: { value: "@ada", selectionStart: 4 },
    });
    expect(status()).toHaveTextContent("1 suggestion available");

    fireEvent.keyDown(screen.getByLabelText("Comment"), { key: "Escape" });
    expect(status()).toHaveTextContent("");
  });

  it("accepts a translated count label", () => {
    render(<Composer suggestionCountLabel={(n) => `${n} personnes`} />);
    open();
    expect(status()).toHaveTextContent("3 personnes");
  });

  it("closes the popup when focus leaves the control", () => {
    render(
      <>
        <Composer />
        <button type="button">Elsewhere</button>
      </>,
    );
    open();
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.blur(screen.getByLabelText("Comment"), {
      relatedTarget: screen.getByRole("button", { name: "Elsewhere" }),
    });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByLabelText("Comment")).not.toHaveAttribute("aria-activedescendant");
    expect(screen.getByLabelText("Comment")).not.toHaveAttribute("aria-controls");
  });

  it("keeps the popup open when focus moves into it", () => {
    render(<Composer />);
    open();
    const option = screen.getAllByRole("option")[1];
    fireEvent.blur(screen.getByLabelText("Comment"), { relatedTarget: option });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("still calls a caller's onBlur", () => {
    const onBlur = vi.fn();
    render(<Composer onBlur={onBlur} />);
    open();
    fireEvent.blur(screen.getByLabelText("Comment"));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("keeps aria-activedescendant resolvable through filtering", () => {
    render(<Composer />);
    open();
    const input = screen.getByLabelText("Comment");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const activeId = input.getAttribute("aria-activedescendant");
    expect(document.getElementById(activeId as string)).toHaveTextContent("Alonzo Church");

    // Narrow to one match: the descendant must follow, not dangle.
    fireEvent.change(input, { target: { value: "@ada", selectionStart: 4 } });
    const narrowed = input.getAttribute("aria-activedescendant");
    expect(narrowed).toBeTruthy();
    expect(document.getElementById(narrowed as string)).toHaveTextContent("Ada Lovelace");
  });

  it("scrolls the active suggestion into view as the highlight moves", () => {
    const scrollIntoView = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    try {
      render(<Composer />);
      open();
      scrollIntoView.mockClear();
      fireEvent.keyDown(screen.getByLabelText("Comment"), { key: "ArrowDown" });
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
      const activeId = screen.getByLabelText("Comment").getAttribute("aria-activedescendant");
      expect(scrollIntoView.mock.instances.at(-1)).toBe(
        document.getElementById(activeId as string),
      );
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("has no axe violations with the popup open", async () => {
    const { container } = render(<Composer />);
    open();
    expect(await a11y(container)).toHaveNoViolations();
  });
});
