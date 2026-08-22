"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type Density = "comfortable" | "compact";
type DensityScope = "subtree" | "document";

interface DensityProviderProps extends React.ComponentProps<"div"> {
  /** Density mode applied to the document or provider subtree. */
  density?: Density;
  /** `subtree` renders a display-contents scope; `document` sets the root attribute. */
  scope?: DensityScope;
}

const DensityContext = React.createContext<Density>("comfortable");

/** Returns the nearest Qeetrix density, defaulting to `comfortable`. */
function useDensity() {
  return React.useContext(DensityContext);
}

/**
 * Activates the generated Qeetrix density variables. Use `scope="document"`
 * once near an application root, or the default subtree scope for previews and
 * embedded tools. Explicit component sizes continue to override density.
 */
function DensityProvider({
  density = "comfortable",
  scope = "subtree",
  className,
  children,
  ...props
}: DensityProviderProps) {
  React.useEffect(() => {
    if (scope !== "document") return undefined;

    const root = document.documentElement;
    const previousDensity = root.getAttribute("data-qx-density");
    root.setAttribute("data-qx-density", density);

    return () => {
      if (previousDensity) root.setAttribute("data-qx-density", previousDensity);
      else root.removeAttribute("data-qx-density");
    };
  }, [density, scope]);

  const content =
    scope === "document" ? (
      children
    ) : (
      <div
        data-slot="density-provider"
        data-qx-density={density}
        className={cn("contents", className)}
        {...props}
      >
        {children}
      </div>
    );

  return <DensityContext.Provider value={density}>{content}</DensityContext.Provider>;
}

export type { Density, DensityProviderProps, DensityScope };
export { DensityProvider, useDensity };
