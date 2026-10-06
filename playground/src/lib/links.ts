import { useEffect } from "react";

/**
 * Hash routing owns `#/…`, so an example's own in-page link (`#main-content` from a SkipNav,
 * `#gst-settings` from a TableOfContents, `#` placeholders in breadcrumbs) would otherwise be read
 * as a route and blank the page. One document-level guard turns those clicks back into what they
 * mean on a real page: scroll to the target and move focus to it. Inside a preview frame, links
 * that would navigate the frame away open in a new tab instead.
 */
export function useInPageLinks({ frame }: { frame: boolean }) {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const raw = anchor.getAttribute("href") ?? "";
      if (raw.startsWith("#/")) return; // a playground route
      if (raw.startsWith("#")) {
        event.preventDefault();
        const id = decodeURIComponent(raw.slice(1));
        const target = id ? document.getElementById(id) : null;
        if (!target) return;
        target.scrollIntoView({ block: "start" });
        if (!target.matches("a, button, input, select, textarea, [tabindex]")) {
          target.setAttribute("tabindex", "-1");
        }
        target.focus({ preventScroll: true });
        return;
      }
      if (frame && anchor.target !== "_blank") {
        event.preventDefault();
        window.open(anchor.href, "_blank", "noopener,noreferrer");
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [frame]);
}
