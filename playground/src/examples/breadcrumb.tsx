import { DotIcon, HouseIcon, SlashIcon } from "@qeetrix/icons";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@qeetrix/ui";
import { Fragment, type MouseEvent, type ReactNode } from "react";
import { invoices, tenants } from "../data/qeet";
import { jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/** Demo links carry real console paths; the playground itself must not navigate away. */
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

const acme = tenants[0];
const invoice = invoices[0];

const consolePath = [
  { label: "Qeet ID", href: "/console" },
  { label: "Tenants", href: "/console/tenants" },
  { label: "Acme India", href: `/console/tenants/${acme.id}` },
] as const;

const separators = {
  chevron: null,
  slash: <SlashIcon aria-hidden />,
  dot: <DotIcon aria-hidden />,
} as const;

const separatorCode = {
  chevron: "<BreadcrumbSeparator />",
  slash: jsx("BreadcrumbSeparator", {}, "<SlashIcon />"),
  dot: jsx("BreadcrumbSeparator", {}, "<DotIcon />"),
} as const;

function ConsoleBreadcrumb({
  separator = "chevron",
  homeIcon = false,
  collapsed = false,
  current = "Users",
}: {
  separator?: keyof typeof separators;
  homeIcon?: boolean;
  collapsed?: boolean;
  current?: string;
}) {
  const sep = <BreadcrumbSeparator>{separators[separator]}</BreadcrumbSeparator>;
  const [root, ...middle] = consolePath;
  return (
    <StayOnPage>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={root.href} aria-label={homeIcon ? root.label : undefined}>
              {homeIcon ? <HouseIcon className="size-4" aria-hidden /> : root.label}
            </BreadcrumbLink>
          </BreadcrumbItem>
          {sep}
          {collapsed ? (
            <>
              <BreadcrumbItem>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="Show hidden path"
                    className="rounded-sm outline-none hover:text-foreground focus-visible:focus-ring"
                  >
                    <BreadcrumbEllipsis />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-44">
                    {middle.slice(0, -1).map((crumb) => (
                      <DropdownMenuItem key={crumb.href}>{crumb.label}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
              {sep}
              <BreadcrumbItem>
                <BreadcrumbLink href={middle[middle.length - 1].href}>
                  {middle[middle.length - 1].label}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          ) : (
            middle.map((crumb) => (
              <Fragment key={crumb.href}>
                <BreadcrumbItem>
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                </BreadcrumbItem>
                {sep}
              </Fragment>
            ))
          )}
          {collapsed && sep}
          <BreadcrumbItem>
            <BreadcrumbPage>{current}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </StayOnPage>
  );
}

const breadcrumbControls = {
  current: text("Users", "Current page"),
  separator: select(["chevron", "slash", "dot"] as const, "chevron", "Separator"),
  homeIcon: bool(false, "Home icon for the root"),
  collapsed: bool(false, "Collapse middle crumbs"),
};

export const examples: FamilyExamples = {
  breadcrumb: {
    demos: [
      {
        name: "Console path",
        description: "Where the page sits in the console; the last crumb is the current page.",
        render: () => <ConsoleBreadcrumb />,
      },
      {
        name: "Collapsed",
        description:
          "Long paths collapse their middle into an ellipsis menu so the first and last crumbs stay visible.",
        render: () => (
          <StayOnPage>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/pay">Qeet Pay</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label="Show hidden path"
                      className="rounded-sm outline-none hover:text-foreground focus-visible:focus-ring"
                    >
                      <BreadcrumbEllipsis />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-52">
                      <DropdownMenuItem>Customers</DropdownMenuItem>
                      <DropdownMenuItem>{invoice.customer}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/pay/invoices">Invoices</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-mono">{invoice.number}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </StayOnPage>
        ),
      },
      {
        name: "Custom separator",
        render: () => <ConsoleBreadcrumb separator="slash" homeIcon current="Passkeys" />,
      },
      {
        name: "Long names wrap",
        description: "Crumbs wrap onto a second line in narrow containers instead of overflowing.",
        render: () => (
          <div className="w-64">
            <ConsoleBreadcrumb current="Risk & Compliance reviewers (quarterly access review)" />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: breadcrumbControls,
      render: (v) => (
        <ConsoleBreadcrumb
          current={v.current}
          separator={v.separator}
          homeIcon={v.homeIcon}
          collapsed={v.collapsed}
        />
      ),
      code: (v) => {
        const sep = separatorCode[v.separator];
        const item = (inner: string) => jsx("BreadcrumbItem", {}, inner);
        const root = v.homeIcon
          ? jsx("BreadcrumbLink", { href: "/console", "aria-label": "Qeet ID" }, "<HouseIcon />")
          : jsx("BreadcrumbLink", { href: "/console" }, "Qeet ID");
        const middle = v.collapsed
          ? [
              item(
                jsx("DropdownMenu", {}, [
                  jsx(
                    "DropdownMenuTrigger",
                    { "aria-label": "Show hidden path" },
                    "<BreadcrumbEllipsis />",
                  ),
                  jsx("DropdownMenuContent", {}, [jsx("DropdownMenuItem", {}, "Tenants")]),
                ]),
              ),
              sep,
              item(jsx("BreadcrumbLink", { href: `/console/tenants/${acme.id}` }, "Acme India")),
              sep,
            ]
          : [
              item(jsx("BreadcrumbLink", { href: "/console/tenants" }, "Tenants")),
              sep,
              item(jsx("BreadcrumbLink", { href: `/console/tenants/${acme.id}` }, "Acme India")),
              sep,
            ];
        return jsx("Breadcrumb", {}, [
          jsx("BreadcrumbList", {}, [
            item(root),
            sep,
            ...middle,
            item(jsx("BreadcrumbPage", {}, v.current)),
          ]),
        ]);
      },
    }),
  },
};
