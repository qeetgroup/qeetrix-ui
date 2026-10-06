import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/Input/field";
import { TagInput } from "@/components/TagInput/tag-input";
import { DirectionProvider } from "@/providers/direction-provider";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("TagInput", () => {
  it("adds a tag on Enter", () => {
    const onChange = vi.fn();
    render(<TagInput value={["a"]} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "b" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
  });

  it("rejects case-insensitive duplicates", () => {
    const onChange = vi.fn();
    render(<TagInput value={["Design"]} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "design" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes the last tag on Backspace when the field is empty", () => {
    const onChange = vi.fn();
    render(<TagInput value={["a", "b"]} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Backspace" });
    expect(onChange).toHaveBeenCalledWith(["a"]);
  });

  it("removes a tag via its remove button", () => {
    const onChange = vi.fn();
    render(<TagInput value={["a", "b"]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Remove a"));
    expect(onChange).toHaveBeenCalledWith(["b"]);
  });

  it("has no axe violations when the field is labelled", async () => {
    // The inner <input> takes forwarded props, so aria-label gives it a name.
    const { container } = render(
      <TagInput value={["design", "a11y"]} onChange={() => {}} aria-label="Tags" />,
    );
    expect(screen.getByRole("textbox", { name: "Tags" })).toBeInTheDocument();
    expect(screen.getByLabelText("Remove design")).toBeInTheDocument();
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("TagInput entry", () => {
  it("adds every comma-separated tag at once, in one onChange, and keeps the tail as a draft", () => {
    const onChange = vi.fn();
    render(<TagInput value={["a"]} onChange={onChange} aria-label="Tags" />);
    const input = screen.getByRole("textbox", { name: "Tags" });
    fireEvent.change(input, { target: { value: "design, a11y,rt" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(["a", "design", "a11y"]);
    expect(input).toHaveValue("rt");
  });

  it("splits a pasted line-separated list", () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} aria-label="Tags" />);
    fireEvent.paste(screen.getByRole("textbox", { name: "Tags" }), {
      clipboardData: { getData: () => "ops\nfinance\r\nlegal" },
    });
    expect(onChange).toHaveBeenCalledWith(["ops", "finance", "legal"]);
  });

  it("dedupes within one batch and stops at maxTags", () => {
    const onChange = vi.fn();
    render(<TagInput value={["x"]} onChange={onChange} maxTags={3} aria-label="Tags" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Tags" }), {
      target: { value: "a,A,b,c," },
    });
    expect(onChange).toHaveBeenCalledWith(["x", "a", "b"]);
  });

  it("announces additions and removals politely", () => {
    function Controlled() {
      const [tags, setTags] = React.useState<string[]>(["ops"]);
      return <TagInput value={tags} onChange={setTags} aria-label="Tags" />;
    }
    render(<Controlled />);
    const input = screen.getByRole("textbox", { name: "Tags" });
    fireEvent.change(input, { target: { value: "legal" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("status")).toHaveTextContent("legal added");
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(screen.getByRole("status")).toHaveTextContent("legal removed");
  });
});

describe("TagInput keyboard deletion", () => {
  function Controlled({ initial = ["alpha", "beta", "gamma"] }: { initial?: string[] }) {
    const [tags, setTags] = React.useState<string[]>(initial);
    return <TagInput value={tags} onChange={setTags} aria-label="Tags" />;
  }

  it("moves from the start of the field onto the tags and between them", () => {
    render(<Controlled />);
    const input = screen.getByRole("textbox", { name: "Tags" });
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowLeft" });
    expect(screen.getByRole("button", { name: "Remove gamma" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("button", { name: "Remove gamma" }), { key: "ArrowLeft" });
    expect(screen.getByRole("button", { name: "Remove beta" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("button", { name: "Remove beta" }), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("button", { name: "Remove gamma" }), { key: "ArrowRight" });
    expect(input).toHaveFocus();
  });

  it("mirrors the arrows under RTL", () => {
    render(
      <DirectionProvider direction="rtl">
        <Controlled />
      </DirectionProvider>,
    );
    const input = screen.getByRole("textbox", { name: "Tags" });
    input.focus();
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "Remove gamma" })).toHaveFocus();
  });

  it("removes the focused tag with Backspace and keeps focus in the list", async () => {
    render(<Controlled />);
    const beta = screen.getByRole("button", { name: "Remove beta" });
    beta.focus();
    fireEvent.keyDown(beta, { key: "Backspace" });
    expect(screen.queryByRole("button", { name: "Remove beta" })).toBeNull();
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove alpha" })).toHaveFocus());
  });

  it("returns to the field when the last tag is deleted", async () => {
    render(<Controlled initial={["solo"]} />);
    const solo = screen.getByRole("button", { name: "Remove solo" });
    solo.focus();
    fireEvent.keyDown(solo, { key: "Delete" });
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Tags" })).toHaveFocus());
  });

  it("keeps the tags out of the tab order", () => {
    render(<Controlled />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("tabindex", "-1");
    }
  });

  it("accepts translated remove labels", () => {
    render(
      <TagInput
        value={["ops"]}
        onChange={() => {}}
        aria-label="Tags"
        messages={{ remove: (tag) => `${tag} entfernen` }}
      />,
    );
    expect(screen.getByRole("button", { name: "ops entfernen" })).toBeInTheDocument();
  });
});

describe("TagInput forms", () => {
  it("takes its label, description and error from a Field", () => {
    render(
      <Field>
        <FieldLabel>Labels</FieldLabel>
        <TagInput value={[]} onChange={() => {}} />
        <FieldDescription>Press Enter after each.</FieldDescription>
        <FieldError>Add at least one label.</FieldError>
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Labels" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/Press Enter after each\..*Add at least one label\./);
  });

  it("submits each tag under its name, never the draft", () => {
    render(
      <form aria-label="labels">
        <TagInput name="labels" value={["ops", "legal"]} onChange={() => {}} aria-label="Tags" />
      </form>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Tags" }), { target: { value: "dra" } });
    const data = new FormData(screen.getByRole("form", { name: "labels" }) as HTMLFormElement);
    expect(data.getAll("labels")).toEqual(["ops", "legal"]);
  });

  it("submits nothing while disabled", () => {
    render(
      <form aria-label="labels">
        <TagInput name="labels" value={["ops"]} onChange={() => {}} disabled aria-label="Tags" />
      </form>,
    );
    const data = new FormData(screen.getByRole("form", { name: "labels" }) as HTMLFormElement);
    expect(data.has("labels")).toBe(false);
  });
});

describe("TagInput read-only (integration pass)", () => {
  it("keeps every tag: no remove buttons, and Backspace in the field removes nothing", () => {
    const onChange = vi.fn();
    render(
      <TagInput
        aria-label="Domains"
        value={["qeet.in", "qeet.com"]}
        onChange={onChange}
        readOnly
      />,
    );
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
    const field = screen.getByRole("textbox", { name: "Domains" });
    expect(field).toHaveAttribute("readonly");
    fireEvent.keyDown(field, { key: "Backspace" });
    expect(onChange).not.toHaveBeenCalled();
  });
});
