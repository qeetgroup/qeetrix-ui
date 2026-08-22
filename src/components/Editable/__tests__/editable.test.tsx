import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Editable, EditableInput, EditablePreview } from "@/components/Editable/editable";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

function Example({
  defaultValue = "Hello",
  ...rest
}: Partial<React.ComponentProps<typeof Editable>>) {
  return (
    <Editable defaultValue={defaultValue} {...rest}>
      <EditablePreview aria-label={defaultValue || "Click to edit"} />
      <EditableInput aria-label="Edit value" />
    </Editable>
  );
}

describe("Editable", () => {
  it("renders preview by default (not editing)", () => {
    render(<Example />);
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("clicking preview activates the input", () => {
    render(<Example />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("typing and pressing Enter saves the value", () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("button"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "World" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onValueChange).toHaveBeenCalledWith("World");
    // Returns to preview mode after submit.
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("pressing Escape cancels and reverts the value", () => {
    const onCancel = vi.fn();
    render(<Example defaultValue="Hello" onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onCancel).toHaveBeenCalled();
    // Preview is shown again with the original value.
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("has no axe violations in preview state", async () => {
    const { container } = render(<Example />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations in editing state", async () => {
    const { container } = render(<Example />);
    fireEvent.click(screen.getByRole("button"));
    expect(await a11y(container)).toHaveNoViolations();
  });
});
