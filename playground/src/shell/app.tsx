import {
  DensityProvider,
  DirectionProvider,
  type MessageCatalogue,
  MessagesProvider,
  SidebarInset,
  SidebarProvider,
  Skeleton,
  SkipNav,
  ThemeProvider,
  Toaster,
  TooltipProvider,
  toast,
} from "@qeetrix/ui";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useInPageLinks } from "../lib/links";
import { THEME_STORAGE_KEY, useDensityPreference, useDirectionPreference } from "../lib/prefs";
import { type Route, useRoute } from "../lib/router";
import { CommandMenu } from "./command-menu";
import { ShellSettingsProvider } from "./environment";
import { ShellNav } from "./nav";
import { TopBar } from "./topbar";

const OverviewPage = lazy(() =>
  import("../pages/overview").then((m) => ({ default: m.OverviewPage })),
);
const ComponentsPage = lazy(() =>
  import("../pages/components").then((m) => ({ default: m.ComponentsPage })),
);
const InspectorPage = lazy(() =>
  import("../pages/inspector").then((m) => ({ default: m.InspectorPage })),
);
const FoundationsPage = lazy(() =>
  import("../pages/foundations").then((m) => ({ default: m.FoundationsPage })),
);
const QaPage = lazy(() => import("../pages/qa").then((m) => ({ default: m.QaPage })));
const PatternsPage = lazy(() =>
  import("../pages/patterns/page").then((m) => ({ default: m.PatternsPage })),
);

/** Playground-specific strings, through the library's own MessagesProvider. */
const messages: MessageCatalogue = {
  commandPalette: { placeholder: "Search pages, components and actions…" },
};

const titles: Record<Route["page"], string> = {
  overview: "Overview",
  components: "Components",
  inspector: "Component",
  foundations: "Foundations",
  qa: "Visual QA",
  patterns: "Patterns",
  "not-found": "Not found",
};

/**
 * The playground shell, built from Qeetrix itself: ThemeProvider (persisted, pre-painted by
 * index.html), DirectionProvider, DensityProvider at document scope, MessagesProvider,
 * SidebarProvider + Sidebar + SidebarInset, AppShellHeader, CommandPalette and Toaster.
 */
export function App() {
  const [density, setDensity] = useDensityPreference();
  const [dir, setDir] = useDirectionPreference();
  const settings = useMemo(
    () => ({ density, setDensity, dir, setDir }),
    [density, setDensity, dir, setDir],
  );

  useLayoutEffect(() => {
    // Whole-app RTL: the provider makes the value available during render; `dir` on <html>
    // is what CSS logical properties and portalled overlays resolve against.
    document.documentElement.dir = dir;
  }, [dir]);

  return (
    <ThemeProvider defaultTheme="system" storageKey={THEME_STORAGE_KEY}>
      <DirectionProvider direction={dir} locale={dir === "rtl" ? "ar" : "en-IN"}>
        <DensityProvider density={density} scope="document">
          <MessagesProvider messages={messages}>
            <TooltipProvider delay={400}>
              <ShellSettingsProvider value={settings}>
                <Shell />
                <Toaster />
              </ShellSettingsProvider>
            </TooltipProvider>
          </MessagesProvider>
        </DensityProvider>
      </DirectionProvider>
    </ThemeProvider>
  );
}

function Shell() {
  useInPageLinks({ frame: false });
  const route = useRoute();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const main = useRef<HTMLDivElement>(null);
  const routeKey = `${route.page}/${route.id ?? ""}`;
  const previousKey = useRef(routeKey);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.title = `${titles[route.page]} · Qeetrix UI playground`;
    if (previousKey.current === routeKey) return;
    previousKey.current = routeKey;
    // A new page: start at the top, and move focus to the content so screen-reader and keyboard
    // users land on it rather than on the link they activated in the sidebar.
    window.scrollTo({ top: 0 });
    main.current?.focus({ preventScroll: true });
  }, [route.page, routeKey]);

  const copyLink = useCallback(() => {
    void navigator.clipboard
      .writeText(window.location.href)
      .then(() =>
        toast.success("Link copied", { description: "Paste it to share this exact view." }),
      )
      .catch(() => toast.error("Could not copy the link"));
  }, []);

  return (
    <SidebarProvider className="bg-canvas">
      <SkipNav
        to="#main"
        onClick={(event) => {
          // A hash link would be read as a route; move focus instead.
          event.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </SkipNav>
      <ShellNav route={route} />
      <SidebarInset className="min-w-0 bg-canvas">
        <TopBar route={route} onSearch={() => setPaletteOpen(true)} />
        {/* SidebarInset is the <main> landmark; this is the skip-link and focus target. */}
        <div ref={main} id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          <Suspense fallback={<PageSkeleton />}>
            <RouteView route={route} />
          </Suspense>
        </div>
      </SidebarInset>
      <CommandMenu open={paletteOpen} onOpenChange={setPaletteOpen} onCopyLink={copyLink} />
    </SidebarProvider>
  );
}

function RouteView({ route }: { route: Route }) {
  switch (route.page) {
    case "overview":
      return <OverviewPage />;
    case "components":
      return <ComponentsPage route={route} />;
    case "inspector":
      return <InspectorPage key={route.id} route={route} />;
    case "foundations":
      return <FoundationsPage route={route} />;
    case "qa":
      return <QaPage route={route} />;
    case "patterns":
      return <PatternsPage route={route} />;
    default:
      return (
        <div className="p-8">
          <h1 className="font-heading text-heading">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Nothing lives at <code className="font-mono">{route.path}</code>.{" "}
            <a className="text-link underline-offset-4 hover:underline" href="#/">
              Back to the overview
            </a>
          </p>
        </div>
      );
  }
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 md:p-8" aria-hidden>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
