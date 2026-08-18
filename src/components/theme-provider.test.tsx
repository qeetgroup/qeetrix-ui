import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "./theme-provider";

function CurrentTheme() {
  const { theme } = useTheme();

  return <output aria-label="Current theme">{theme}</output>;
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("does not install a character-key shortcut by default", () => {
    render(
      <ThemeProvider defaultTheme="light" disableTransitionOnChange={false}>
        <CurrentTheme />
      </ThemeProvider>,
    );

    fireEvent.keyDown(window, { key: "d" });

    expect(screen.getByLabelText("Current theme")).toHaveTextContent("light");
    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("toggles with Control or Meta plus Shift+D when explicitly enabled", () => {
    render(
      <ThemeProvider
        defaultTheme="light"
        disableTransitionOnChange={false}
        enableKeyboardShortcut
      >
        <CurrentTheme />
      </ThemeProvider>,
    );

    fireEvent.keyDown(window, { key: "d" });
    expect(screen.getByLabelText("Current theme")).toHaveTextContent("light");

    fireEvent.keyDown(window, { key: "D", ctrlKey: true, shiftKey: true });
    expect(screen.getByLabelText("Current theme")).toHaveTextContent("dark");

    fireEvent.keyDown(window, { key: "D", metaKey: true, shiftKey: true });
    expect(screen.getByLabelText("Current theme")).toHaveTextContent("light");
  });
});