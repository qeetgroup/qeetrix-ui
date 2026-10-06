import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, taught the Qeetrix `@theme` names it cannot infer (src/styles/index.css).
 *
 * Without this it reads an unknown `text-caption` as a *colour*, so
 * `cn("text-caption text-muted-foreground")` silently drops the type role; `duration-fast` and
 * the focus-ring recipes would never override each other either. Keep these lists in step with
 * the `--text-*`, `--ease-*` and `--transition-duration-*` keys and the `@utility` focus recipes.
 */
const twMerge = extendTailwindMerge<"focus-ring">({
  extend: {
    theme: {
      text: [
        "display",
        "heading",
        "title",
        "body",
        "label",
        "label-compact",
        "caption",
        "micro",
        "code",
      ],
      ease: ["standard", "decelerate", "accelerate", "sharp", "enter", "exit", "emphasized"],
    },
    classGroups: {
      duration: [{ duration: ["instant", "fast", "normal", "slow", "deliberate"] }],
      "focus-ring": ["focus-ring", "focus-ring-inset", "focus-ring-field"],
      // tailwind-merge 3.6 knows `max-h-[none]` but not the v4 keyword utility.
      "max-h": [{ "max-h": ["none"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
