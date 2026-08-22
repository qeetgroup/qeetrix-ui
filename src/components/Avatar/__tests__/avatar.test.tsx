import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/Avatar/avatar";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Avatar", () => {
  it("shows the fallback when the image is unavailable", () => {
    render(
      <Avatar>
        <AvatarImage src="/does-not-exist.png" alt="Ada Lovelace" />
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
