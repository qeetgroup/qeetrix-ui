import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { AvailabilityGrid } from "@/components/ui/availability-grid";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });
const DAYS = ["Mon", "Tue"];
const TIMES = ["09:00", "09:30"];

describe("AvailabilityGrid", () => {
  it("renders a button per slot", () => {
    render(<AvailabilityGrid days={DAYS} times={TIMES} value={[]} onValueChange={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("toggles a slot", () => {
    const onValueChange = vi.fn();
    render(<AvailabilityGrid days={DAYS} times={TIMES} value={[]} onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Mon 09:00" }));
    expect(onValueChange).toHaveBeenCalledWith(["0:0"]);
  });

  it("disables unavailable slots", () => {
    render(
      <AvailabilityGrid
        days={DAYS}
        times={TIMES}
        value={[]}
        unavailable={["1:1"]}
        onValueChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Tue 09:30" })).toBeDisabled();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <AvailabilityGrid days={DAYS} times={TIMES} value={[]} onValueChange={() => {}} />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
