/**
 * Custom Qeet icons for concepts Lucide doesn't cover (Foundations doc §12.3).
 * 24×24 viewBox, 1.5px stroke, currentColor, round caps — matches the Lucide
 * rhythm so these sit beside lucide-react icons without looking out of place.
 */
import type { ReactNode, SVGProps } from "react";

export interface QeetIconProps extends SVGProps<SVGSVGElement> {
  /** Width and height in px. Defaults to 24. */
  size?: number | string;
  /** Accessible label. Defaults to `null` (decorative, aria-hidden). */
  title?: string | null;
}

function Icon({
  size = 24,
  title = null,
  children,
  ...props
}: QeetIconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconPasskey(props: QeetIconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="9" r="4" />
      <path d="m11.5 11.5 8 8" />
      <path d="m17 17 2-2" />
      <path d="m20 14 1.5-1.5" />
    </Icon>
  );
}

export function IconMfaShield(props: QeetIconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 4 6v6c0 4.2 3.2 7.3 8 9 4.8-1.7 8-4.8 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

export function IconSamlConnector(props: QeetIconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="8" width="7" height="8" rx="1.5" />
      <rect x="14" y="8" width="7" height="8" rx="1.5" />
      <path d="M10 12h4" />
    </Icon>
  );
}

export function IconScimSync(props: QeetIconProps) {
  return (
    <Icon {...props}>
      <path d="M20 11a8 8 0 0 0-14-4.5L3 9" />
      <path d="M4 13a8 8 0 0 0 14 4.5L21 15" />
      <path d="M3 4v5h5" />
      <path d="M21 20v-5h-5" />
    </Icon>
  );
}

export function IconOidcConnector(props: QeetIconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M8 5v14" />
      <circle cx="15" cy="12" r="2.25" />
    </Icon>
  );
}

export function IconWebhook(props: QeetIconProps) {
  return (
    <Icon {...props}>
      <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
      <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
      <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" />
    </Icon>
  );
}

export function IconApiKey(props: QeetIconProps) {
  return (
    <Icon {...props}>
      <circle cx="7.5" cy="15.5" r="3.5" />
      <path d="m10 13 9-9" />
      <path d="m15.5 5.5 3 3" />
      <path d="m12.5 8.5 2.5 2.5" />
    </Icon>
  );
}

export function IconAuditLog(props: QeetIconProps) {
  return (
    <Icon {...props}>
      <path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h3" />
    </Icon>
  );
}

export function IconTenant(props: QeetIconProps) {
  return (
    <Icon {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
    </Icon>
  );
}

export function IconCrossDevice(props: QeetIconProps) {
  return (
    <Icon {...props}>
      <rect x="14" y="9" width="7" height="12" rx="1.5" />
      <path d="M10 17H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
      <path d="M17.5 18h.01" />
    </Icon>
  );
}

/**
 * RTL mirror metadata (Foundations doc §14). Icons with directional meaning
 * are flipped under `dir="rtl"`; the current set is non-directional.
 */
export const QEET_ICON_MIRROR: Record<string, boolean> = {
  IconPasskey: false,
  IconMfaShield: false,
  IconSamlConnector: false,
  IconScimSync: false,
  IconOidcConnector: false,
  IconWebhook: false,
  IconApiKey: false,
  IconAuditLog: false,
  IconTenant: false,
  IconCrossDevice: false,
};
