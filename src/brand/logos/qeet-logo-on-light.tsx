import { QeetLogo as QeetMark } from "@qeetrix/icons";

import { markProps, type QeetLogoVariantProps } from "./qeet-logo-on-dark.js";

/** Qeet mark — dark artwork, for use on LIGHT surfaces. */
export function QeetLogoOnLight(props: QeetLogoVariantProps) {
  return <QeetMark variant="default" {...markProps(props)} />;
}
