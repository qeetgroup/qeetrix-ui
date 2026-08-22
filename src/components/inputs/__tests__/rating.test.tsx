import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { PALETTE_UTILITY } from "@/__tests__/palette-utility";
import { Field, FieldLabel } from "@/components/inputs/field";
import { Rating } from "@/components/inputs/rating";
import { DirectionProvider } from "@/providers/direction-provider";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("Rating", () => {
  it("renders read-only as a labelled image", () => {
    render(<Rating value={3} readOnly />);
    expect(screen.getByRole("img")).toHaveAccessibleName("Rating: 3 of 5");
  });

  it("exposes slider semantics when interactive", () => {
    render(<Rating value={2} onChange={() => {}} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "2");
    expect(slider).toHaveAttribute("aria-valuemax", "5");
  });

  it("calls onChange with the clicked star value", () => {
    const onChange = vi.fn();
    const { container } = render(<Rating value={0} onChange={onChange} />);
    // Stars are inert spans; the container maps the click to a star via
    // data-rating-index. Clicking the 3rd star (index 2) yields value 3.
    const thirdStar = container.querySelector('[data-rating-index="2"]');
    expect(thirdStar).not.toBeNull();
    fireEvent.click(thirdStar as Element);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("steps with arrow keys", () => {
    const onChange = vi.fn();
    render(<Rating value={2} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("has no axe violations (read-only)", async () => {
    const { container } = render(<Rating value={3} readOnly />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  // The interactive variant is a single role="slider" widget with inert star
  // spans (no nested interactive controls), so it is now axe-clean — the prior
  // nested-interactive defect (per-star <button>s) has been fixed.
  it("has no axe violations (interactive)", async () => {
    const { container } = render(<Rating value={3} aria-label="Rate this" onChange={() => {}} />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  // The filled star was `fill-amber-400 text-amber-400`: a named palette utility with no dark
  // counterpart, so it was neither themeable nor visible to check:token-usage. The fill is now a
  // semantic role, and index.css can therefore give it a forced-colors value.
  it("fills stars from the rating role, never the Tailwind palette", () => {
    const { container } = render(<Rating value={3} readOnly />);
    const classes = [...container.querySelectorAll("[class]")]
      .map((el) => el.getAttribute("class") ?? "")
      .join(" ");

    expect(classes).toContain("fill-rating-filled");
    expect(classes).toContain("text-rating-filled");
    expect(classes).not.toMatch(PALETTE_UTILITY);
  });
});

describe("Rating form participation", () => {
  const data = () => new FormData(screen.getByRole("form", { name: "review" }) as HTMLFormElement);

  it("submits the numeric rating under its name", () => {
    render(
      <form aria-label="review">
        <Rating name="score" defaultValue={4} aria-label="Score" />
      </form>,
    );
    expect(data().get("score")).toBe("4");
  });

  it("submits the value the user just clicked", () => {
    const { container } = render(
      <form aria-label="review">
        <Rating name="score" defaultValue={0} aria-label="Score" />
      </form>,
    );
    fireEvent.click(container.querySelector('[data-rating-index="2"]') as Element);
    expect(data().get("score")).toBe("3");
  });

  it("submits a read-only rating, as a readOnly native input does", () => {
    render(
      <form aria-label="review">
        <Rating name="score" value={5} readOnly />
      </form>,
    );
    expect(data().get("score")).toBe("5");
  });

  it("carries the value in aria-valuetext so a Field label can take the name", () => {
    render(
      <Field>
        <FieldLabel>Overall</FieldLabel>
        <Rating name="score" defaultValue={3} />
      </Field>,
    );
    const slider = screen.getByRole("slider", { name: "Overall" });
    expect(slider).toHaveAttribute("aria-valuetext", "3 of 5");
    expect(slider).toHaveAttribute("aria-valuenow", "3");
  });

  it("keeps its self-contained name outside a Field", () => {
    render(<Rating defaultValue={3} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAccessibleName("Rating: 3 of 5");
    expect(slider).toHaveAttribute("aria-valuetext", "3 of 5");
  });

  it("keeps the value in a read-only rating's name, which has no aria-valuetext to hold it", () => {
    render(
      <Field>
        <FieldLabel>Overall</FieldLabel>
        <Rating value={2} readOnly />
      </Field>,
    );
    // role="img" cannot expose a value, so borrowing the Field label would lose it entirely.
    expect(screen.getByRole("img")).toHaveAccessibleName("Rating: 2 of 5");
  });
});

/*
 * The keyboard half of RTL-001 lives here; the pointer half cannot. jsdom returns an all-zero
 * `getBoundingClientRect` and does not reorder a flex line for `direction: rtl`, so the mirrored
 * half-star split and the unmirrored one return the same number for every coordinate — a test
 * here would pass either way. It is asserted with real layout and real clicks in
 * `src/__tests__/browser/rating-pointer.test.tsx`, which also checks the two paths agree about
 * which direction raises the value.
 */
describe("Rating direction", () => {
  it("mirrors the inline arrow keys in rtl", () => {
    const onChange = vi.fn();
    render(
      <DirectionProvider direction="rtl">
        <Rating max={5} defaultValue={3} onChange={onChange} />
      </DirectionProvider>,
    );
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("data-direction", "rtl");
    // In RTL the next star is to the left, so ArrowLeft must raise the rating. This is an
    // APG slider requirement: a horizontal slider's inline keys mirror.
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith(4);
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it("does not mirror the block axis", () => {
    const onChange = vi.fn();
    render(
      <DirectionProvider direction="rtl">
        <Rating max={5} defaultValue={3} onChange={onChange} />
      </DirectionProvider>,
    );
    // The block axis never mirrors — Qeetrix never sets `writing-mode`.
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it("keeps the ltr mapping when nothing declares a direction", () => {
    const onChange = vi.fn();
    render(<Rating max={5} defaultValue={3} onChange={onChange} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("data-direction", "ltr");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(4);
  });
});
