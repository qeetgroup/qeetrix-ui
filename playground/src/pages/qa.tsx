import { Button, Toggle, ToggleGroup } from "@qeetrix/ui";
import { ExternalLinkIcon, FocusIcon } from "lucide-react";
import { useRef } from "react";
import {
  defaultFrameEnv,
  type FrameDensity,
  type FrameDirection,
  type FrameEnv,
  type FrameTheme,
  frameHash,
} from "../lib/frame";
import { oneOf, type Route, setQuery } from "../lib/router";
import { Page } from "../shell/page";
import { PreviewFrame } from "../shell/preview-frame";

/**
 * The visual QA matrix: the same board in a light and a dark document, side by side, at the
 * chosen density and direction. It is meant for judging the token foundation, so the board
 * uses the components exactly as a consumer would.
 */
export function QaPage({ route }: { route: Route }) {
  const density = oneOf<FrameDensity>(
    route.query.get("density"),
    ["comfortable", "compact"],
    "comfortable",
  );
  const dir = oneOf<FrameDirection>(route.query.get("dir"), ["ltr", "rtl"], "ltr");
  const panes = useRef<Partial<Record<FrameTheme, HTMLDivElement | null>>>({});
  const env = (theme: FrameTheme): FrameEnv => ({ ...defaultFrameEnv, theme, density, dir });

  // Only one document can hold focus at a time, so the focus-state input is focused in the
  // pane you choose.
  const focusPane = (theme: FrameTheme) => {
    const frame = panes.current[theme]?.querySelector("iframe");
    const target = frame?.contentDocument?.querySelector<HTMLElement>("[data-pg-focus-target]");
    if (!frame || !target) return;
    frame.focus();
    target.focus({ preventScroll: true });
  };

  return (
    <Page
      wide
      title="Visual QA"
      description="One board — shell, navigation, header, card, inputs in every state, select, buttons, tables, open overlays, tabs, badges, alerts, toast, code, chart, empty and loading states — rendered in a light and a dark document at once."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            aria-label="Density"
            value={[density]}
            onValueChange={(next) =>
              next[0] && setQuery({ density: next[0] === "comfortable" ? null : String(next[0]) })
            }
            className="rounded-lg border border-border p-0.5"
          >
            <Toggle value="comfortable" size="sm" className="px-2 text-xs">
              Comfortable
            </Toggle>
            <Toggle value="compact" size="sm" className="px-2 text-xs">
              Compact
            </Toggle>
          </ToggleGroup>
          <ToggleGroup
            aria-label="Direction"
            value={[dir]}
            onValueChange={(next) =>
              next[0] && setQuery({ dir: next[0] === "ltr" ? null : String(next[0]) })
            }
            className="rounded-lg border border-border p-0.5"
          >
            <Toggle value="ltr" size="sm" className="px-2 text-xs">
              LTR
            </Toggle>
            <Toggle value="rtl" size="sm" className="px-2 text-xs">
              RTL
            </Toggle>
          </ToggleGroup>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-2">
        {(["light", "dark"] as FrameTheme[]).map((theme) => (
          <div
            key={theme}
            ref={(element) => {
              panes.current[theme] = element;
            }}
            className="flex min-w-0 flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-sm font-semibold capitalize">{theme}</h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => focusPane(theme)}>
                  <FocusIcon data-icon="inline-start" aria-hidden />
                  Show focus state
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  render={
                    <a
                      href={`${window.location.pathname}${frameHash({ kind: "qa" }, env(theme))}`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                  nativeButton={false}
                >
                  <ExternalLinkIcon data-icon="inline-start" aria-hidden />
                  Open
                </Button>
              </div>
            </div>
            <PreviewFrame
              route={{ kind: "qa" }}
              env={env(theme)}
              title={`Visual QA board, ${theme} theme`}
              minHeight={2400}
              className="overflow-hidden rounded-xl border"
            />
          </div>
        ))}
      </div>
    </Page>
  );
}
