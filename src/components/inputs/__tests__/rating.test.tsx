import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Rating } from "@/components/inputs/rating";

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
});
