import { CommandPalette, type CommandPaletteItem, useTheme } from "@qeetrix/ui";
import {
  BlocksIcon,
  ComponentIcon,
  LanguagesIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  LinkIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  Rows3Icon,
  ScanEyeIcon,
  SunIcon,
} from "lucide-react";
import { useMemo } from "react";
import { components } from "../lib/manifest";
import { navigate } from "../lib/router";
import { foundationSections } from "../pages/foundations-sections";
import { patterns } from "../pages/patterns/catalogue";
import { useShellSettings } from "./environment";

type Payload = { kind: "go"; href: string } | { kind: "run"; run: () => void };

/**
 * ⌘K over every page, foundations section, pattern and all manifest modules, plus the shell's
 * global actions. Built on the library's own CommandPalette.
 */
export function CommandMenu({
  open,
  onOpenChange,
  onCopyLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopyLink: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const { density, setDensity, dir, setDir } = useShellSettings();

  const items = useMemo<CommandPaletteItem[]>(() => {
    const go = (hrefValue: string): Payload => ({ kind: "go", href: hrefValue });
    const run = (action: () => void): Payload => ({ kind: "run", run: action });
    const pages: CommandPaletteItem[] = [
      {
        id: "page-overview",
        group: "Pages",
        title: "Overview",
        icon: <LayoutDashboardIcon />,
        keywords: ["dashboard", "manifest", "stats"],
        payload: go("#/"),
      },
      {
        id: "page-components",
        group: "Pages",
        title: "Components gallery",
        icon: <BlocksIcon />,
        keywords: ["gallery", "modules"],
        payload: go("#/components"),
      },
      {
        id: "page-foundations",
        group: "Pages",
        title: "Foundations · Theme lab",
        icon: <PaletteIcon />,
        keywords: ["tokens", "colour", "color", "contrast", "typography"],
        payload: go("#/foundations"),
      },
      {
        id: "page-qa",
        group: "Pages",
        title: "Visual QA matrix",
        icon: <ScanEyeIcon />,
        keywords: ["light", "dark", "matrix", "review"],
        payload: go("#/qa"),
      },
      ...patterns.map((pattern) => ({
        id: `pattern-${pattern.id}`,
        group: "Pages",
        title: `Pattern: ${pattern.title}`,
        icon: <LayoutTemplateIcon />,
        keywords: [pattern.product],
        payload: go(`#/patterns/${pattern.id}`),
      })),
      ...foundationSections.map((section) => ({
        id: `foundation-${section.id}`,
        group: "Foundations",
        title: section.title,
        icon: <PaletteIcon />,
        keywords: [...section.keywords],
        payload: go(`#/foundations?section=${section.id}`),
      })),
    ];
    const modules: CommandPaletteItem[] = components.map((component) => ({
      id: `component-${component.slug}`,
      group: "Components",
      title: component.name,
      icon: <ComponentIcon />,
      keywords: [component.slug, component.category, component.status],
      payload: go(`#/components/${component.slug}`),
    }));
    const actions: CommandPaletteItem[] = [
      {
        id: "theme-light",
        group: "Actions",
        title: `Theme: light${theme === "light" ? " (current)" : ""}`,
        icon: <SunIcon />,
        keywords: ["appearance", "mode"],
        payload: run(() => setTheme("light")),
      },
      {
        id: "theme-dark",
        group: "Actions",
        title: `Theme: dark${theme === "dark" ? " (current)" : ""}`,
        icon: <MoonIcon />,
        keywords: ["appearance", "mode"],
        payload: run(() => setTheme("dark")),
      },
      {
        id: "theme-system",
        group: "Actions",
        title: `Theme: match system${theme === "system" ? " (current)" : ""}`,
        icon: <MonitorIcon />,
        keywords: ["appearance", "mode", "auto"],
        payload: run(() => setTheme("system")),
      },
      {
        id: "density",
        group: "Actions",
        title: `Density: switch to ${density === "compact" ? "comfortable" : "compact"}`,
        icon: <Rows3Icon />,
        keywords: ["compact", "comfortable", "spacing"],
        payload: run(() => setDensity(density === "compact" ? "comfortable" : "compact")),
      },
      {
        id: "direction",
        group: "Actions",
        title: `Direction: switch to ${dir === "rtl" ? "left-to-right" : "right-to-left"}`,
        icon: <LanguagesIcon />,
        keywords: ["rtl", "ltr", "arabic", "mirror"],
        payload: run(() => setDir(dir === "rtl" ? "ltr" : "rtl")),
      },
      {
        id: "copy-link",
        group: "Actions",
        title: "Copy link to this view",
        icon: <LinkIcon />,
        keywords: ["share", "url"],
        payload: run(onCopyLink),
      },
    ];
    return [...pages, ...modules, ...actions];
  }, [theme, setTheme, density, setDensity, dir, setDir, onCopyLink]);

  return (
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      items={items}
      onSelect={(item) => {
        const payload = item.payload as Payload;
        if (payload.kind === "go") navigate(payload.href);
        else payload.run();
      }}
    />
  );
}
