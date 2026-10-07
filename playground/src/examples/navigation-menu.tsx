import {
  BellRingIcon,
  FileClockIcon,
  FingerprintPatternIcon,
  IndianRupeeIcon,
  ScrollTextIcon,
} from "@qeetrix/icons";
import {
  cn,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@qeetrix/ui";
import type { MouseEvent, ReactNode } from "react";
import { expr, jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, num, select } from "../registry/types";

/** Demo links carry real-looking paths; the playground itself must not navigate away. */
function StayOnPage({ children }: { children: ReactNode }) {
  return (
    <div
      className="contents"
      onClickCapture={(event: MouseEvent) => {
        if ((event.target as Element).closest("a[href]")) event.preventDefault();
      }}
    >
      {children}
    </div>
  );
}

const products = [
  {
    name: "Qeet ID",
    href: "https://qeet.in/id",
    description: "Passkeys-first sign-in, SSO and SCIM for every tenant.",
    icon: FingerprintPatternIcon,
  },
  {
    name: "Qeet Pay",
    href: "https://qeet.in/pay",
    description: "UPI, cards and NACH with GST-ready invoicing.",
    icon: IndianRupeeIcon,
  },
  {
    name: "Qeet Logs",
    href: "https://qeet.in/logs",
    description: "Logs, metrics and traces, stored in India.",
    icon: ScrollTextIcon,
  },
  {
    name: "Qeet Notify",
    href: "https://qeet.in/notify",
    description: "Email, SMS (DLT), WhatsApp and push from one API.",
    icon: BellRingIcon,
  },
] as const;

const developerLinks = [
  { name: "API reference", href: "https://apis.qeet.in", description: "REST endpoints and errors" },
  { name: "SDKs", href: "https://docs.qeet.in/sdks", description: "Go, Node and React" },
  {
    name: "Webhooks",
    href: "https://docs.qeet.in/webhooks",
    description: "Signed events and retries",
  },
  { name: "Status", href: "https://status.qeet.in", description: "Uptime by region" },
] as const;

function SuiteMenu({
  defaultValue,
  delay,
  closeDelay,
}: {
  defaultValue?: string | null;
  delay?: number;
  closeDelay?: number;
}) {
  return (
    <StayOnPage>
      <NavigationMenu defaultValue={defaultValue} delay={delay} closeDelay={closeDelay}>
        <NavigationMenuList className="flex-wrap justify-start">
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[min(34rem,calc(100vw-3rem))] gap-1 sm:grid-cols-2">
                {products.map((product) => (
                  <li key={product.name}>
                    <NavigationMenuLink href={product.href} className="flex-row gap-3">
                      <product.icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">{product.name}</span>
                        <span className="text-muted-foreground">{product.description}</span>
                      </span>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem value="developers">
            <NavigationMenuTrigger>Developers</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="flex w-64 flex-col gap-1">
                {developerLinks.map((link) => (
                  <li key={link.name}>
                    <NavigationMenuLink href={link.href}>
                      <span className="font-medium text-foreground">{link.name}</span>
                      <span className="text-muted-foreground">{link.description}</span>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              href="https://qeet.in/pricing"
              className={navigationMenuTriggerStyle()}
            >
              Pricing
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </StayOnPage>
  );
}

const securityLinks = [
  { name: "Policies", description: "MFA, session length and IP rules" },
  { name: "Passkeys", description: "Registered authenticators per user" },
  { name: "Sessions", description: "Active sign-ins across devices" },
] as const;

const integrationLinks = [
  { name: "Single sign-on", description: "SAML and OIDC with Okta or Entra ID" },
  { name: "SCIM provisioning", description: "Create and deactivate users automatically" },
  { name: "Webhooks", description: "user.created, session.revoked and more" },
] as const;

function ConsoleMenu() {
  return (
    <StayOnPage>
      <NavigationMenu>
        <NavigationMenuList className="flex-wrap justify-start">
          <NavigationMenuItem>
            <NavigationMenuLink
              href="/console/users"
              active
              aria-current="page"
              className={navigationMenuTriggerStyle()}
            >
              Users
            </NavigationMenuLink>
          </NavigationMenuItem>
          {[
            { label: "Security", links: securityLinks },
            { label: "Integrations", links: integrationLinks },
          ].map((group) => (
            <NavigationMenuItem key={group.label}>
              <NavigationMenuTrigger>{group.label}</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="flex w-72 flex-col gap-1">
                  {group.links.map((link) => (
                    <li key={link.name}>
                      <NavigationMenuLink
                        href={`/console/${link.name.toLowerCase().replaceAll(" ", "-")}`}
                      >
                        <span className="font-medium text-foreground">{link.name}</span>
                        <span className="text-muted-foreground">{link.description}</span>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ))}
          <NavigationMenuItem>
            <NavigationMenuLink
              href="/console/audit-log"
              className={cn(navigationMenuTriggerStyle(), "flex-row")}
            >
              <FileClockIcon className="size-4" aria-hidden />
              Audit log
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </StayOnPage>
  );
}

const navControls = {
  defaultValue: select(
    ["none", "products", "developers"] as const,
    "none",
    "defaultValue (open item)",
  ),
  delay: num(50, { min: 0, max: 600, step: 50, label: "delay (ms)" }),
  closeDelay: num(50, { min: 0, max: 600, step: 50, label: "closeDelay (ms)" }),
};

export const examples: FamilyExamples = {
  "navigation-menu": {
    minHeight: 280,
    demos: [
      {
        name: "Product menu",
        description:
          "Site navigation for qeet.in: triggers open on hover or click and share one popup that morphs between them; plain links use navigationMenuTriggerStyle().",
        render: () => <SuiteMenu />,
      },
      {
        name: "Console navigation",
        description:
          "The current page is a link marked `active` (plus aria-current); sections open on hover or click.",
        render: () => <ConsoleMenu />,
      },
    ],
    playground: definePlayground({
      controls: navControls,
      render: (v) => (
        <SuiteMenu
          key={v.defaultValue}
          defaultValue={v.defaultValue === "none" ? null : v.defaultValue}
          delay={v.delay}
          closeDelay={v.closeDelay}
        />
      ),
      code: (v) =>
        jsx(
          "NavigationMenu",
          {
            defaultValue: v.defaultValue === "none" ? undefined : v.defaultValue,
            delay: v.delay === 50 ? undefined : v.delay,
            closeDelay: v.closeDelay === 50 ? undefined : v.closeDelay,
          },
          [
            jsx("NavigationMenuList", {}, [
              jsx("NavigationMenuItem", { value: "products" }, [
                jsx("NavigationMenuTrigger", {}, "Products"),
                jsx("NavigationMenuContent", {}, [
                  jsx("NavigationMenuLink", { href: "https://qeet.in/id" }, "Qeet ID"),
                  jsx("NavigationMenuLink", { href: "https://qeet.in/pay" }, "Qeet Pay"),
                ]),
              ]),
              jsx("NavigationMenuItem", { value: "developers" }, [
                jsx("NavigationMenuTrigger", {}, "Developers"),
                jsx("NavigationMenuContent", {}, [
                  jsx("NavigationMenuLink", { href: "https://apis.qeet.in" }, "API reference"),
                ]),
              ]),
              jsx("NavigationMenuItem", {}, [
                jsx(
                  "NavigationMenuLink",
                  {
                    href: "https://qeet.in/pricing",
                    className: expr("navigationMenuTriggerStyle()"),
                  },
                  "Pricing",
                ),
              ]),
            ]),
          ],
        ),
    }),
  },
};
