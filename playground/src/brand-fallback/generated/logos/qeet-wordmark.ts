import { standIn } from "./fallback";

// the tiled files and the plain (untiled) ones have different proportions
export const QeetWordmarkLogo = standIn("QeetWordmarkLogo", {
  default: 2773 / 1006,
  dark: 2773 / 1006,
  plain: 2403 / 793,
  "plain-dark": 2403 / 793,
});
