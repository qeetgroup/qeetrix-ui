import { Button, Tabs, TabsList, TabsTrigger, Toggle, ToggleGroup } from "@qeetrix/ui";
import { ExternalLinkIcon } from "lucide-react";
import { type FrameTheme, frameHash } from "../../lib/frame";
import { navigate, oneOf, type Route, setQuery } from "../../lib/router";
import { useShellFrameEnv } from "../../shell/environment";
import { Page } from "../../shell/page";
import { PreviewFrame } from "../../shell/preview-frame";
import { patterns } from "./catalogue";

/**
 * Product patterns: realistic Qeet screens composed only from the library, each in its own
 * document at a desktop viewport so app-level layout (fixed sidebar, sticky header, toasts)
 * behaves as it would in the product.
 */
export function PatternsPage({ route }: { route: Route }) {
  const shellEnv = useShellFrameEnv();
  const pattern = patterns.find((entry) => entry.id === route.id) ?? patterns[0];
  const themeMode = oneOf<"shell" | FrameTheme>(
    route.query.get("theme"),
    ["shell", "light", "dark"],
    "shell",
  );
  if (!pattern) return null;
  const env = { ...shellEnv, theme: themeMode === "shell" ? shellEnv.theme : themeMode };
  const frameRoute = { kind: "pattern" as const, id: pattern.id };
  return (
    <Page
      wide
      className="max-w-[110rem]"
      eyebrow={pattern.product}
      title={pattern.title}
      description={pattern.description}
      actions={
        <>
          <ToggleGroup
            aria-label="Pattern theme"
            value={[themeMode]}
            onValueChange={(next) =>
              next[0] && setQuery({ theme: next[0] === "shell" ? null : String(next[0]) })
            }
            className="rounded-lg border border-border p-0.5"
          >
            <Toggle value="shell" size="sm" className="px-2 text-xs">
              Shell
            </Toggle>
            <Toggle value="light" size="sm" className="px-2 text-xs">
              Light
            </Toggle>
            <Toggle value="dark" size="sm" className="px-2 text-xs">
              Dark
            </Toggle>
          </ToggleGroup>
          <Button
            variant="outline"
            size="sm"
            render={
              <a
                href={`${window.location.pathname}${frameHash(frameRoute, env)}`}
                target="_blank"
                rel="noreferrer"
              />
            }
            nativeButton={false}
          >
            <ExternalLinkIcon data-icon="inline-start" aria-hidden />
            Full screen
          </Button>
        </>
      }
    >
      <Tabs value={pattern.id} onValueChange={(value) => navigate(`#/patterns/${String(value)}`)}>
        <TabsList aria-label="Patterns" className="h-auto flex-wrap">
          {patterns.map((entry) => (
            <TabsTrigger key={entry.id} value={entry.id}>
              {entry.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <PreviewFrame
        key={pattern.id}
        route={frameRoute}
        env={env}
        height={pattern.height}
        title={`${pattern.title} pattern`}
        className="overflow-hidden rounded-xl border shadow-rest"
      />
    </Page>
  );
}
