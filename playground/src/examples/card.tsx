import {
  CheckIcon,
  DownloadIcon,
  EllipsisIcon,
  FingerprintPatternIcon,
  MapPinIcon,
  ServerIcon,
} from "@qeetrix/icons";
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  IconButton,
  Meter,
  Separator,
  StatusPill,
} from "@qeetrix/ui";
import { type MouseEvent, useState } from "react";
import { dateFormat, formatInr, invoices, invoiceTotals, tenants } from "../data/qeet";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const invoice = invoices[0];
const totals = invoiceTotals(invoice);
const acme = tenants[0];
const count = new Intl.NumberFormat("en-IN");

function InvoiceSummaryCard() {
  const lines = [
    { label: "Taxable value", value: formatInr(invoice.subtotal) },
    { label: `CGST @ ${invoice.gstRate / 2}%`, value: formatInr(totals.cgst) },
    { label: `SGST @ ${invoice.gstRate / 2}%`, value: formatInr(totals.sgst) },
  ];
  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="font-mono">{invoice.number}</CardTitle>
        <CardDescription>
          {invoice.customer} · due {dateFormat.format(new Date(invoice.due))}
        </CardDescription>
        <CardAction>
          <StatusPill kind="info">Sent</StatusPill>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <dl className="flex flex-col gap-1.5">
          {lines.map((line) => (
            <div key={line.label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{line.label}</dt>
              <dd className="tabular-nums">{line.value}</dd>
            </div>
          ))}
        </dl>
        <Separator />
        <div className="flex justify-between gap-4 font-medium">
          <span>Total payable</span>
          <span className="tabular-nums">{formatInr(totals.total)}</span>
        </div>
        <p className="text-caption text-muted-foreground">
          GSTIN {invoice.gstin} · Place of supply: {invoice.placeOfSupply}
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm">
          <DownloadIcon data-icon="inline-start" aria-hidden />
          PDF
        </Button>
        <Button size="sm" className="ms-auto">
          Record UPI payment
        </Button>
      </CardFooter>
    </Card>
  );
}

function TenantPlanCard() {
  const seats = 2500;
  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>{acme.name}</CardTitle>
        <CardDescription>{acme.domain}</CardDescription>
        <CardAction>
          <Badge>{acme.plan}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Meter
          label="Seats used"
          value={acme.users}
          max={seats}
          locale="en-IN"
          format={{ maximumFractionDigits: 0 }}
          aria-valuetext={`${count.format(acme.users)} of ${count.format(seats)} seats`}
        />
        <ul className="flex flex-col gap-1.5 text-muted-foreground">
          <li className="flex items-center gap-2">
            <MapPinIcon aria-hidden className="size-4" />
            Data residency: {acme.region} (Mumbai)
          </li>
          <li className="flex items-center gap-2">
            <FingerprintPatternIcon aria-hidden className="size-4" />
            Passkeys enforced for admins
          </li>
          <li className="flex items-center gap-2">
            <ServerIcon aria-hidden className="size-4" />
            SCIM provisioning from Okta
          </li>
        </ul>
      </CardContent>
      <CardFooter className="justify-between gap-2">
        <span className="text-caption text-muted-foreground">
          Renews 1 Apr 2027 · ₹18,40,000/yr
        </span>
        <Button size="sm" variant="outline">
          Manage
        </Button>
      </CardFooter>
    </Card>
  );
}

const regions = [
  { id: "ap-south-1", city: "Mumbai", latency: "18 ms from Bengaluru", note: "Default for India" },
  { id: "ap-south-2", city: "Hyderabad", latency: "11 ms from Bengaluru", note: "DR pair" },
  { id: "eu-central-1", city: "Frankfurt", latency: "142 ms from Bengaluru", note: "EU tenants" },
];

/**
 * Cards as a choice: each card *is* a toggle button (`render={<button aria-pressed>}`), so its
 * content is phrasing only — spans, no CardHeader divs. `interactive` adds the lift and focus
 * ring; `selected` paints the brand boundary while `aria-pressed` carries the state.
 */
function RegionChoiceCards() {
  const [selected, setSelected] = useState("ap-south-1");
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">Data residency for the new tenant</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {regions.map((region) => {
          const isSelected = selected === region.id;
          return (
            <Card
              key={region.id}
              size="sm"
              interactive
              selected={isSelected}
              className="w-full min-w-44"
              render={
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected(region.id)}
                />
              }
            >
              <span className="flex items-start justify-between gap-2 px-3">
                <span className="flex flex-col gap-0.5">
                  <span className="font-heading text-sm font-medium">{region.city}</span>
                  <span className="font-mono text-caption text-muted-foreground">{region.id}</span>
                </span>
                {isSelected && <CheckIcon aria-hidden className="size-4 shrink-0 text-brand" />}
              </span>
              <span className="flex flex-col gap-0.5 px-3 text-caption text-muted-foreground">
                <span>{region.latency}</span>
                <span>{region.note}</span>
              </span>
            </Card>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Playground links stay put: the playground routes on the URL hash. */
function stay(event: MouseEvent) {
  event.preventDefault();
}

/** Cards as navigation: an anchor may hold the card's block content. */
function TenantLinkCards() {
  return (
    <ul className="flex w-80 max-w-full flex-col gap-3">
      {tenants.slice(0, 3).map((tenant) => (
        <li key={tenant.id} className="flex">
          <Card
            interactive
            className="w-full"
            render={(props) => (
              <a {...props} href={`/console/tenants/${tenant.id}`} onClick={stay} />
            )}
          >
            <CardHeader>
              <CardTitle render={(props) => <h3 {...props} />}>{tenant.name}</CardTitle>
              <CardDescription>
                {tenant.domain} · {tenant.region}
              </CardDescription>
              <CardAction>
                <Badge variant={tenant.plan === "Enterprise" ? "default" : "secondary"}>
                  {tenant.plan}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{count.format(tenant.users)} users</span>
              <StatusPill status={tenant.status} />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

const variantStats = [
  { variant: "default", title: "Monthly active users", value: "1,612", note: "Resting card" },
  {
    variant: "outline",
    title: "Sign-ins today",
    value: "4,208",
    note: "No shadow, for dense grids",
  },
  {
    variant: "elevated",
    title: "Failed sign-ins",
    value: "37",
    note: "The one surface that should stand out",
  },
] as const;

const cardControls = {
  variant: select(["default", "outline", "elevated"] as const, "default"),
  size: select(["default", "sm"] as const, "default"),
  interactive: bool(false, "Interactive (renders an <a href>)"),
  selected: bool(false, "Selected"),
  title: text("Passkey adoption", "Title"),
  description: text("1,642 of 1,842 users can sign in without a password.", "Description"),
  action: bool(true, "Header action"),
  footer: bool(true, "Footer"),
};

function PlaygroundCard(v: {
  variant: "default" | "outline" | "elevated";
  size: "default" | "sm";
  interactive: boolean;
  selected: boolean;
  title: string;
  description: string;
  action: boolean;
  footer: boolean;
}) {
  // An interactive card is itself the link, so it holds no buttons of its own.
  return (
    <Card
      variant={v.variant}
      size={v.size}
      interactive={v.interactive}
      selected={v.selected}
      className="w-80"
      render={
        v.interactive
          ? (props) => <a {...props} href="/console/security/passkeys" onClick={stay} />
          : undefined
      }
    >
      <CardHeader>
        <CardTitle>{v.title}</CardTitle>
        {v.description && <CardDescription>{v.description}</CardDescription>}
        {v.action && (
          <CardAction>
            {v.interactive ? (
              <Badge variant="secondary">89%</Badge>
            ) : (
              <IconButton icon={EllipsisIcon} size="icon-sm" aria-label="Report options" />
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <Meter label="Enrolled" value={89} format={{ style: "unit", unit: "percent" }} />
      </CardContent>
      {v.footer && (
        <CardFooter>
          {v.interactive ? (
            <span className="text-caption text-muted-foreground">Open passkey report</span>
          ) : (
            <Button size="sm" variant="outline">
              Remind users
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

export const examples: FamilyExamples = {
  card: {
    minHeight: 1300,
    demos: [
      {
        name: "Anatomy",
        description:
          "Header (title, description, action), content and footer. The footer sits flush on a muted band.",
        render: () => (
          <Card className="w-80">
            <CardHeader>
              <CardTitle>Passkey adoption</CardTitle>
              <CardDescription>
                1,642 of 1,842 users can sign in without a password.
              </CardDescription>
              <CardAction>
                <IconButton icon={EllipsisIcon} size="icon-sm" aria-label="Report options" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <Meter label="Enrolled" value={89} format={{ style: "unit", unit: "percent" }} />
            </CardContent>
            <CardFooter className="justify-between gap-2">
              <span className="text-caption text-muted-foreground">Updated 4 min ago</span>
              <Button size="sm" variant="outline">
                Remind 200 users
              </Button>
            </CardFooter>
          </Card>
        ),
      },
      {
        name: "Variants",
        description:
          "`default` rests with a faint shadow, `outline` drops it for repeated tiles, `elevated` stands one step forward.",
        render: () => (
          <div className="flex flex-wrap gap-3">
            {variantStats.map((stat) => (
              <Card key={stat.variant} variant={stat.variant} size="sm" className="w-48">
                <CardHeader>
                  <CardTitle>{stat.title}</CardTitle>
                  <CardDescription>
                    <code className="font-mono text-caption">{stat.variant}</code> · {stat.note}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="font-heading text-heading font-semibold tabular-nums">
                    {stat.value}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        ),
      },
      {
        name: "Small",
        description: '`size="sm"` tightens padding and gaps for dense dashboards.',
        render: () => (
          <div className="flex flex-wrap gap-3">
            {[
              { id: "sessions", title: "Active sessions", value: "4", note: "1 high risk" },
              { id: "mfa", title: "MFA coverage", value: "92%", note: "+3% this week" },
            ].map((stat) => (
              <Card key={stat.id} size="sm" className="w-44">
                <CardHeader>
                  <CardTitle>{stat.title}</CardTitle>
                  <CardDescription>{stat.note}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="font-heading text-heading font-semibold tabular-nums">
                    {stat.value}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        ),
      },
      {
        name: "Invoice summary",
        description: "A Qeet Pay tax invoice with its intra-state CGST + SGST split.",
        render: () => <InvoiceSummaryCard />,
      },
      {
        name: "Tenant plan",
        render: () => <TenantPlanCard />,
      },
      {
        name: "Interactive links",
        description:
          "`interactive` with `render={<a href>}`: the whole card is the link, lifts on hover and takes the focus ring. `CardTitle render={<h3 />}` keeps it reachable by heading navigation.",
        render: () => <TenantLinkCards />,
      },
      {
        name: "Selected",
        description:
          "`selected` paints the brand boundary; the state itself lives on the control — here each card renders as a toggle button with `aria-pressed`.",
        render: () => <RegionChoiceCards />,
      },
    ],
    playground: definePlayground({
      controls: cardControls,
      render: (v) => <PlaygroundCard {...v} />,
      code: (v) =>
        jsx(
          "Card",
          {
            ...changedProps(v, cardControls, ["variant", "size", "interactive", "selected"]),
            render: v.interactive ? expr('<a href="/console/security/passkeys" />') : undefined,
          },
          [
            jsx("CardHeader", {}, [
              jsx("CardTitle", {}, v.title),
              v.description ? jsx("CardDescription", {}, v.description) : "",
              v.action
                ? jsx("CardAction", {}, [
                    v.interactive
                      ? '<Badge variant="secondary">89%</Badge>'
                      : '<IconButton icon={EllipsisIcon} size="icon-sm" aria-label="Report options" />',
                  ])
                : "",
            ]),
            jsx("CardContent", {}, [
              '<Meter label="Enrolled" value={89} format={{ style: "unit", unit: "percent" }} />',
            ]),
            v.footer
              ? jsx("CardFooter", {}, [
                  v.interactive
                    ? '<span className="text-caption text-muted-foreground">Open passkey report</span>'
                    : '<Button size="sm" variant="outline">Remind users</Button>',
                ])
              : "",
          ],
        ),
    }),
  },
};
