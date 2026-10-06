import { cn, Skeleton } from "@qeetrix/ui";
import { useEffect, useRef, useState } from "react";
import {
  FRAME_MESSAGE,
  type FrameEnv,
  type FrameRoute,
  type FrameSizeMessage,
  frameHash,
} from "../lib/frame";

/**
 * The frame's URL. Browsers refuse to load a frame whose URL — ignoring the fragment — equals an
 * ancestor's (recursion protection), and every playground document is `/` plus a hash, so each
 * nesting level carries its own `?pg-frame=<depth>` (QA overlay samples are two frames deep).
 */
function frameUrl(hash: string): string {
  const depth = Number(new URLSearchParams(window.location.search).get("pg-frame") ?? 0) + 1;
  return `${window.location.pathname}?pg-frame=${depth}${hash}`;
}

/**
 * An iframe running the playground at `#/frame/…` (see lib/frame.ts). The first configuration
 * is the `src`; later ones are applied with `location.replace()` on a hash-only URL, so the
 * frame re-renders in place without reloading and without adding history entries. The frame
 * reports its content height; `height` pins a fixed viewport instead (patterns, overlay
 * samples). A change of motion preference remounts the frame, because reduced-motion
 * simulation is installed before the frame's first script runs.
 */
export function PreviewFrame({
  route,
  env,
  title,
  minHeight = 0,
  height,
  className,
}: {
  route: FrameRoute;
  env: FrameEnv;
  title: string;
  minHeight?: number;
  /** Fixed viewport height; omit to size the frame to its content. */
  height?: number;
  className?: string;
}) {
  const hash = frameHash(route, env);
  return (
    <FrameElement
      key={env.motion}
      hash={hash}
      title={title}
      minHeight={minHeight}
      height={height}
      className={className}
    />
  );
}

function FrameElement({
  hash,
  title,
  minHeight,
  height,
  className,
}: {
  hash: string;
  title: string;
  minHeight: number;
  height?: number;
  className?: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [initialSrc] = useState(() => frameUrl(hash));
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const target = ref.current?.contentWindow;
    if (!target) return;
    try {
      if (target.location.hash !== hash) target.location.replace(frameUrl(hash));
    } catch {
      // Not yet navigated away from about:blank; the initial src carries the configuration.
    }
  }, [hash]);

  useEffect(() => {
    if (height !== undefined) return;
    const onMessage = (event: MessageEvent<FrameSizeMessage>) => {
      if (event.source !== ref.current?.contentWindow) return;
      const data = event.data;
      if (data?.source !== FRAME_MESSAGE || data.type !== "size") return;
      setContentHeight(data.height);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [height]);

  const resolvedHeight = height ?? Math.max(minHeight, contentHeight ?? minHeight);

  return (
    <div className={cn("relative w-full", className)} style={{ height: resolvedHeight || 120 }}>
      {!loaded && (
        <div className="absolute inset-0 flex flex-col gap-3 p-6" aria-hidden>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      <iframe
        ref={ref}
        src={initialSrc}
        title={title}
        onLoad={() => setLoaded(true)}
        className={cn(
          "block size-full border-0 bg-transparent transition-opacity duration-fast",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
