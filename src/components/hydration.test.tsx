import { act, type ReactElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CountryPicker } from "@/components/ui/country-picker";
import { TimeSince } from "@/components/ui/time-since";
import { TimezonePicker } from "@/components/ui/timezone-picker";

async function hydrateWithEnvironmentChange(element: ReactElement, changeEnvironment: () => void) {
  const container = document.createElement("div");
  const recoverableErrors: unknown[] = [];
  container.innerHTML = renderToString(element);
  document.body.appendChild(container);
  changeEnvironment();

  let root: Root | undefined;
  await act(async () => {
    root = hydrateRoot(container, element, {
      onRecoverableError: (error) => recoverableErrors.push(error),
    });
  });
  await act(async () => root?.unmount());
  container.remove();

  return recoverableErrors;
}

describe("SSR hydration", () => {
  it("hydrates CountryPicker when server and browser default locales differ", async () => {
    const originalDisplayNames = Object.getOwnPropertyDescriptor(Intl, "DisplayNames");
    let environment = "server";

    class EnvironmentDisplayNames {
      private readonly locale: string;

      constructor(locales?: string | string[]) {
        this.locale = Array.isArray(locales) ? (locales[0] ?? environment) : (locales ?? environment);
      }

      of(code: string) {
        return `${this.locale}-${code}`;
      }
    }

    Object.defineProperty(Intl, "DisplayNames", {
      configurable: true,
      value: EnvironmentDisplayNames,
    });

    try {
      const errors = await hydrateWithEnvironmentChange(
        <CountryPicker value="" onChange={() => {}} />,
        () => {
          environment = "browser";
        },
      );
      expect(errors).toHaveLength(0);
    } finally {
      if (originalDisplayNames) {
        Object.defineProperty(Intl, "DisplayNames", originalDisplayNames);
      }
    }
  });

  it("hydrates TimezonePicker when supported timezone lists differ", async () => {
    const originalSupportedValuesOf = Object.getOwnPropertyDescriptor(Intl, "supportedValuesOf");
    let environment = "server";

    Object.defineProperty(Intl, "supportedValuesOf", {
      configurable: true,
      value: () =>
        environment === "server" ? ["UTC", "Europe/London"] : ["UTC", "Asia/Tokyo"],
    });

    try {
      const errors = await hydrateWithEnvironmentChange(
        <TimezonePicker value="" onChange={() => {}} />,
        () => {
          environment = "browser";
        },
      );
      expect(errors).toHaveLength(0);
    } finally {
      if (originalSupportedValuesOf) {
        Object.defineProperty(Intl, "supportedValuesOf", originalSupportedValuesOf);
      } else {
        Reflect.deleteProperty(Intl, "supportedValuesOf");
      }
    }
  });

  it("hydrates TimeSince when server and browser clocks cross a label boundary", async () => {
    const originalNow = Date.now;
    const value = Date.UTC(2026, 0, 1, 12, 0, 0);
    let now = value + 5 * 60_000;
    Date.now = () => now;

    try {
      const errors = await hydrateWithEnvironmentChange(
        <TimeSince value={value} refreshIntervalMs={0} />,
        () => {
          now = value + 10 * 60_000;
        },
      );
      expect(errors).toHaveLength(0);
    } finally {
      Date.now = originalNow;
    }
  });
});