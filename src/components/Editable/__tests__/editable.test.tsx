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

  it("selects the text when editing starts", () => {
    render(<Example defaultValue="Quarterly report" />);
    fireEvent.click(screen.getByRole("button"));
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe("Quarterly report".length);
  });

  it("returns focus to the preview after Enter or Escape", () => {
    render(<Example />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(screen.getByRole("button")).toHaveFocus();
    fireEvent.click(screen.getByRole("button"));
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(screen.getByRole("button")).toHaveFocus();
  });

  it("does not commit the discarded draft on the blur that follows Escape", () => {
    const onValueChange = vi.fn();
    render(<Example defaultValue="Hello" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("commits on blur", () => {
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Saved" } });
    fireEvent.blur(input);
    expect(onValueChange).toHaveBeenCalledWith("Saved");
  });

  it("keeps Escape from reaching an enclosing overlay", () => {
    const onOuterKeyDown = vi.fn();
    render(
      // biome-ignore lint/a11y/noStaticElementInteractions: test harness listening for bubbling
      <div onKeyDown={onOuterKeyDown}>
        <Example />
      </div>,
    );
    fireEvent.click(screen.getByRole("button"));
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(onOuterKeyDown).not.toHaveBeenCalled();
  });

  it("still calls a consumer's onKeyDown and onBlur", () => {
    const onKeyDown = vi.fn();
    const onBlur = vi.fn();
    render(
      <Editable defaultValue="x">
        <EditablePreview />
        <EditableInput aria-label="Edit" onKeyDown={onKeyDown} onBlur={onBlur} />
      </Editable>,
    );
    fireEvent.click(screen.getByRole("button"));
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "a" });
    fireEvent.blur(input);
    expect(onKeyDown).toHaveBeenCalled();
    expect(onBlur).toHaveBeenCalled();
  });

  it("shows a decorative pencil affordance, and none when disabled", () => {
    const { container, rerender } = render(<Example />);
    expect(container.querySelector("[data-slot=editable-preview-icon]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    rerender(<Example disabled />);
    expect(container.querySelector("[data-slot=editable-preview-icon]")).toBeNull();
  });
});
