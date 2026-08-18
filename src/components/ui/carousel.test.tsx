import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

function CarouselExample() {
  return (
    <Carousel aria-label="Featured products">
      <CarouselContent>
        <CarouselItem>Slide one</CarouselItem>
        <CarouselItem>Slide two</CarouselItem>
        <CarouselItem>Slide three</CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}

describe("Carousel", () => {
  it("exposes a labelled carousel region", () => {
    render(<CarouselExample />);
    const region = screen.getByRole("region", { name: "Featured products" });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("aria-roledescription", "carousel");
  });

  it("renders each slide as a group with the slide roledescription", () => {
    render(<CarouselExample />);
    const slides = screen.getAllByRole("group");
    expect(slides).toHaveLength(3);
    for (const slide of slides) {
      expect(slide).toHaveAttribute("aria-roledescription", "slide");
    }
  });

  it("gives the previous/next controls accessible names", () => {
    render(<CarouselExample />);
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeInTheDocument();
  });

  it("disables the previous control at the start", () => {
    render(<CarouselExample />);
    // No slides scrolled past yet, so there is nothing to go back to.
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled();
  });

  it("handles arrow keys without throwing", () => {
    render(<CarouselExample />);
    const region = screen.getByRole("region", { name: "Featured products" });
    // Arrow keys are wired to scrollPrev/scrollNext; exercise the handler.
    expect(() => {
      fireEvent.keyDown(region, { key: "ArrowRight" });
      fireEvent.keyDown(region, { key: "ArrowLeft" });
    }).not.toThrow();
  });

  it("maps vertical navigation to ArrowUp and ArrowDown", () => {
    render(
      <Carousel orientation="vertical" aria-label="Vertical gallery">
        <CarouselContent>
          <CarouselItem>Slide one</CarouselItem>
          <CarouselItem>Slide two</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );
    const region = screen.getByRole("region", { name: "Vertical gallery" });

    expect(fireEvent.keyDown(region, { key: "ArrowUp" })).toBe(false);
    expect(fireEvent.keyDown(region, { key: "ArrowDown" })).toBe(false);
    expect(fireEvent.keyDown(region, { key: "ArrowLeft" })).toBe(true);
    expect(fireEvent.keyDown(region, { key: "ArrowRight" })).toBe(true);
  });

  it("does not claim arrow keys from descendant editing controls", () => {
    render(
      <Carousel aria-label="Editable gallery">
        <input aria-label="Slide title" />
        <div
          role="slider"
          tabIndex={0}
          aria-label="Slide zoom"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={50}
        />
      </Carousel>,
    );

    expect(
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Slide title" }), {
        key: "ArrowRight",
      }),
    ).toBe(true);
    expect(
      fireEvent.keyDown(screen.getByRole("slider", { name: "Slide zoom" }), {
        key: "ArrowLeft",
      }),
    ).toBe(true);
  });

  it("has no axe violations", async () => {
    const { container } = render(<CarouselExample />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
