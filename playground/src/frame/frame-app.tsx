import {
  DensityProvider,
  DirectionProvider,
  Skeleton,
  ThemeProvider,
  Toaster,
  TooltipProvider,
} from "@qeetrix/ui";
import {
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  FRAME_MESSAGE,
  type FrameBackground,
  type FrameEnv,
  type FrameRoute,
  type FrameSizeMessage,
  parseFrameHash,
} from "../lib/frame";
import { useInPageLinks } from "../lib/links";
import { componentBySlug, families } from "../lib/manifest";
import { useFamilyExamples, useModuleExamples } from "../registry";
import { defaultValues } from "../registry/types";
import { DemoList } from "../shell/demo-view";
import { ExampleBoundary } from "../shell/error-boundary";

const QaBoard = lazy(() => import("../pages/qa-board").then((m) => ({ default: m.QaBoard })));
const QaSample = lazy(() => import("../pages/qa-board").then((m) => ({ default: m.QaSample })));
const FoundationsSpecimen = lazy(() =>
  import("../pages/foundations-specimen").then((m) => ({ default: m.FoundationsSpecimen })),
);
const BrandSample = lazy(() => import("../pages/brand").then((m) => ({ default: m.BrandSample })));
const PatternView = lazy(() =>
  import("../pages/patterns").then((m) => ({ default: m.PatternView })),
);

/**
 * The document inside a preview frame. Everything a consumer application would set at its root
 * is set here, from the frame URL: the theme class (ThemeProvider), `data-qx-density` on
 * `<html>` (DensityProvider, document scope), `dir` on `<html>` plus a DirectionProvider, and
 * the page background. Hash changes reconfigure the frame in place.
 */
export function FrameApp() {
  useInPageLinks({ frame: true });
  const [frame, setFrame] = useState(() => parseFrameHash(window.location.hash));
  useEffect(() => {
    const onHash = () => setFrame(parseFrameHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  if (!frame) return null;
  return (
    <FrameProviders env={frame.env}>
      <FrameRouteView route={frame.route} />
    </FrameProviders>
  );
}

const backgrounds: Record<FrameBackground, string> = {
  canvas: "bg-background",
  card: "bg-card",
  sunken: "bg-(--qx-color-surface-sunken)",
};

function FrameProviders({ env, children }: { env: FrameEnv; children: ReactNode }) {
  useLayoutEffect(() => {
    document.documentElement.dir = env.dir;
    const body = document.body;
    body.classList.remove(...Object.values(backgrounds).flatMap((value) => value.split(" ")));
    body.classList.add(...backgrounds[env.bg].split(" "));
  }, [env.dir, env.bg]);
  return (
    // A storage key nothing writes: the frame's theme is whatever its URL says.
    <ThemeProvider defaultTheme={env.theme} storageKey="qeetrix-ui-playground:frame">
      <DirectionProvider direction={env.dir}>
        <DensityProvider density={env.density} scope="document">
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </DensityProvider>
      </DirectionProvider>
    </ThemeProvider>
  );
}

/** Reports the measured element's height to the host page. */
function useReportHeight(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element || window.parent === window) return;
    let frame = 0;
    const post = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const message: FrameSizeMessage = {
          source: FRAME_MESSAGE,
          type: "size",
          height: Math.ceil(element.getBoundingClientRect().height),
        };
        window.parent.postMessage(message, window.location.origin);
      });
    };
    const observer = new ResizeObserver(post);
    observer.observe(element);
    post();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref]);
}

function Measured({ children, center = false }: { children: ReactNode; center?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useReportHeight(ref);
  return center ? (
    <div className="flex min-h-svh items-center justify-center">
      <div ref={ref} className="w-full p-8">
        {children}
      </div>
    </div>
  ) : (
    <div ref={ref}>{children}</div>
  );
}

function Loading() {
  return (
    <div className="flex flex-col gap-3 p-8">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function FrameRouteView({ route }: { route: FrameRoute }) {
  return (
    <ExampleBoundary label="Preview" resetKey={JSON.stringify(route)}>
      <FrameRouteContent route={route} />
    </ExampleBoundary>
  );
}

function FrameRouteContent({ route }: { route: FrameRoute }) {
  switch (route.kind) {
    case "module":
      return (
        <Suspense fallback={<Loading />}>
          <ModuleFrame slug={route.slug} view={route.view} values={route.values} />
        </Suspense>
      );
    case "demo":
      return (
        <Suspense fallback={<Loading />}>
          <DemoFrame slug={route.slug} index={route.demo} />
        </Suspense>
      );
    case "family":
      return (
        <Suspense fallback={<Loading />}>
          <FamilyFrame family={route.family} />
        </Suspense>
      );
    case "qa":
      return (
        <Suspense fallback={<Loading />}>
          <Measured>
            <QaBoard />
          </Measured>
        </Suspense>
      );
    case "qa-sample":
      return (
        <Suspense fallback={null}>
          <QaSample id={route.id} />
        </Suspense>
      );
    case "pattern":
      return (
        <Suspense fallback={<Loading />}>
          <PatternView id={route.id} />
        </Suspense>
      );
    case "specimen":
      return (
        <Suspense fallback={<Loading />}>
          <Measured>
            <FoundationsSpecimen />
          </Measured>
        </Suspense>
      );
    case "brand":
      return (
        <Suspense fallback={<Loading />}>
          <Measured>
            <BrandSample id={route.id} />
          </Measured>
        </Suspense>
      );
  }
}

function ModuleFrame({
  slug,
  view,
  values,
}: {
  slug: string;
  view: "playground" | "demos";
  values?: Record<string, string | number | boolean>;
}) {
  const component = componentBySlug.get(slug);
  const examples = useModuleExamples(slug);
  if (!component || !examples) return <p className="p-8 text-sm">No examples for “{slug}”.</p>;
  if (view === "demos") {
    return (
      <Measured>
        <div className="p-8">
          <DemoList name={component.name} examples={examples} layout="wide" showDescriptions />
        </div>
      </Measured>
    );
  }
  const resolved = { ...defaultValues(examples.playground.controls), ...values };
  return (
    <Measured center>
      <div className="flex justify-center">
        <ExampleBoundary label={component.name} resetKey={JSON.stringify(resolved)}>
          {examples.playground.render(resolved)}
        </ExampleBoundary>
      </div>
    </Measured>
  );
}

function DemoFrame({ slug, index }: { slug: string; index: number }) {
  const component = componentBySlug.get(slug);
  const examples = useModuleExamples(slug);
  const demo = examples?.demos[index];
  if (!component || !demo) return null;
  return (
    <Measured>
      <ExampleBoundary label={`${component.name} · ${demo.name}`}>{demo.render()}</ExampleBoundary>
    </Measured>
  );
}

/** Every module of a family, every demo and the default playground: the smoke-test surface. */
function FamilyFrame({ family }: { family: string }) {
  const examples = useFamilyExamples(family);
  const modules = families.find((entry) => entry.name === family)?.modules ?? [];
  return (
    <Measured>
      <div className="flex flex-col gap-10 p-8">
        {modules.map((component) => {
          const entry = examples[component.slug];
          if (!entry) {
            return (
              <p key={component.slug} className="text-sm text-destructive">
                Missing examples for {component.slug}
              </p>
            );
          }
          return (
            <section
              key={component.slug}
              data-pg-module={component.slug}
              className="flex flex-col gap-4"
            >
              <h2 className="font-heading text-heading">{component.name}</h2>
              <DemoList name={component.name} examples={entry} />
              <div data-pg-playground="" className="rounded-lg border border-dashed p-6">
                <ExampleBoundary label={`${component.name} · playground`}>
                  {entry.playground.render(defaultValues(entry.playground.controls))}
                </ExampleBoundary>
              </div>
            </section>
          );
        })}
      </div>
    </Measured>
  );
}
