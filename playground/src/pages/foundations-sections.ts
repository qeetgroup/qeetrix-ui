/** The theme lab's sections, in page order — shared by its in-page navigation and ⌘K. */
export const foundationSections = [
  {
    id: "specimen",
    title: "Light and dark specimen",
    keywords: ["ramp", "surfaces", "elevation", "focus", "qa"],
  },
  {
    id: "contrast",
    title: "Contrast audit (WCAG)",
    keywords: ["wcag", "aa", "accessibility", "ratio"],
  },
  {
    id: "colour",
    title: "Colour roles",
    keywords: ["color", "text", "surface", "border", "feedback", "syntax", "data"],
  },
  {
    id: "bridge",
    title: "Component bridge variables",
    keywords: ["shadcn", "primary", "muted", "css variables"],
  },
  {
    id: "primitives",
    title: "Primitive ramps",
    keywords: ["qeet", "graphite", "palette", "brand", "neutral"],
  },
  {
    id: "typography",
    title: "Typography",
    keywords: ["type", "fonts", "qeet display", "qeet text", "qeet ui", "fira code"],
  },
  { id: "shape", title: "Radii and corners", keywords: ["radius", "corner", "rounded"] },
  { id: "elevation", title: "Elevation", keywords: ["shadow", "depth"] },
  { id: "motion", title: "Motion", keywords: ["duration", "easing", "animation"] },
  { id: "layers", title: "Z-index ladder", keywords: ["z", "stacking", "layers"] },
  { id: "density", title: "Density", keywords: ["compact", "comfortable", "control height"] },
] as const;

export type FoundationSectionId = (typeof foundationSections)[number]["id"];
