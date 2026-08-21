import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { MentionInput } from "@/components/inputs/mention-input";

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
