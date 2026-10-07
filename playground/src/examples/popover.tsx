import { CopyIcon, KeyRoundIcon, ListFilterIcon, MapPinIcon, Share2Icon } from "@qeetrix/icons";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Checkbox,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Input,
  Label,
  NativeSelect,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  PreviewCard,
  PreviewCardContent,
  PreviewCardDescription,
  PreviewCardTitle,
  PreviewCardTrigger,
  PreviewCardUrl,
  Separator,
  Switch,
  toast,
} from "@qeetrix/ui";
import { type MouseEvent, useId, useState } from "react";
import {
  dateFormat,
  formatInr,
  invoices,
  invoiceTotals,
  minutesAgo,
  NOW,
  users,
} from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { ThemedQeetLogo } from "../lib/qeet-brand";
import { definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

/** Demo links point at real-looking console paths; the playground itself must not navigate. */
function stayOnPage(event: MouseEvent) {
  event.preventDefault();
}

function ago(iso: string): string {
  const minutes = Math.round((NOW.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} d ago`;
}

const rohan = users[1];
const paidInvoice = invoices[1];
const paidTotals = invoiceTotals(paidInvoice);

/* ── Popover demos ────────────────────────────────────────────────────────────────────────── */

const statusOptions = [
  { id: "active", label: "Active", count: 9 },
  { id: "pending", label: "Pending invite", count: 2 },
  { id: "suspended", label: "Suspended", count: 1 },
] as const;

function FilterPopover() {
  const id = useId();
  const [statuses, setStatuses] = useState<string[]>(["active", "pending"]);
  const [mfa, setMfa] = useState("any");
  const applied = statuses.length + (mfa === "any" ? 0 : 1);
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        <ListFilterIcon data-icon="inline-start" aria-hidden />
        Filter
        {applied > 0 && (
          <Badge variant="secondary" className="ms-1 px-1.5">
            {applied}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <PopoverTitle>Filter users</PopoverTitle>
          <PopoverDescription>Acme India · 12 users</PopoverDescription>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Status</legend>
          {statusOptions.map((option) => (
            <Label key={option.id} className="justify-between font-normal">
              <span className="flex items-center gap-2">
                <Checkbox
                  checked={statuses.includes(option.id)}
                  onCheckedChange={(checked) =>
                    setStatuses((current) =>
                      checked ? [...current, option.id] : current.filter((s) => s !== option.id),
                    )
                  }
                />
                {option.label}
              </span>
              <span className="text-caption text-muted-foreground tabular-nums">
                {option.count}
              </span>
            </Label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-mfa`}>MFA method</Label>
          <NativeSelect
            id={`${id}-mfa`}
            value={mfa}
            onChange={(event) => setMfa(event.target.value)}
          >
            <option value="any">Any method</option>
            <option value="passkey">Passkey</option>
            <option value="totp">Authenticator app (TOTP)</option>
            <option value="sms">SMS one-time code</option>
            <option value="none">Not enrolled</option>
          </NativeSelect>
        </div>
        <Separator />
        <div className="flex justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatuses([]);
              setMfa("any");
            }}
          >
            Reset
          </Button>
          <PopoverClose render={<Button size="sm" />}>Apply filters</PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SharePopover() {
  const id = useId();
  const link = "https://logs.qeet.in/acme/views/notify-errors?range=24h";
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="secondary" />}>
        <Share2Icon data-icon="inline-start" aria-hidden />
        Share view
      </PopoverTrigger>
      <PopoverContent className="flex w-80 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <PopoverTitle>Share “Notify errors · last 24h”</PopoverTitle>
          <PopoverDescription>People with access to Qeet Logs for Acme India.</PopoverDescription>
        </div>
        <div className="flex gap-2">
          <Label htmlFor={`${id}-link`} className="sr-only">
            Link to this view
          </Label>
          <Input id={`${id}-link`} readOnly value={link} className="font-mono text-xs" />
          <Button
            variant="outline"
            size="icon"
            aria-label="Copy link"
            onClick={() => toast.success("Link copied", { description: link })}
          >
            <CopyIcon aria-hidden />
          </Button>
        </div>
        <Label className="justify-between font-normal">
          Anyone at acme.in with the link
          <Switch defaultChecked />
        </Label>
      </PopoverContent>
    </Popover>
  );
}

/* ── Hover card content ───────────────────────────────────────────────────────────────────── */

function UserCard() {
  return (
    <div className="flex gap-3">
      <Avatar size="lg">
        <AvatarFallback>{rohan.initials}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{rohan.name}</p>
          <Badge variant="secondary">{rohan.role}</Badge>
        </div>
        <p className="truncate text-caption text-muted-foreground">{rohan.email}</p>
        <p className="flex items-center gap-1 text-caption text-muted-foreground">
          <MapPinIcon className="size-3" aria-hidden />
          {rohan.department} · {rohan.location}
        </p>
        <p className="flex items-center gap-1 text-caption text-muted-foreground">
          <KeyRoundIcon className="size-3" aria-hidden />
          Passkey · active {ago(rohan.lastActive)}
        </p>
      </div>
    </div>
  );
}

/** A generated “Open Graph” image for the docs link preview (sample image data). */
const docsOgImage = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 256"><rect width="640" height="256" fill="#1c1917"/><circle cx="560" cy="40" r="140" fill="#f97316" opacity=".22"/><text x="40" y="150" font-family="system-ui,sans-serif" font-size="44" font-weight="600" fill="#fafaf9">Passkeys in Qeet ID</text><text x="40" y="196" font-family="system-ui,sans-serif" font-size="22" fill="#a8a29e">docs.qeet.in</text></svg>`,
)}`;

/* ── Playground controls ──────────────────────────────────────────────────────────────────── */

const sides = ["top", "right", "bottom", "left"] as const;
const aligns = ["start", "center", "end"] as const;

const popoverControls = {
  side: select(sides, "bottom"),
  align: select(aligns, "center"),
  sideOffset: num(4, { min: 0, max: 24, label: "sideOffset" }),
  modal: select(["false", "true", "trap-focus"] as const, "false", "modal"),
  title: text("Session timeout", "Title"),
  description: text(
    "Admins on Acme India are signed out after 30 minutes without activity.",
    "Description",
    { multiline: true },
  ),
};

const hoverCardControls = {
  side: select(sides, "bottom"),
  align: select(aligns, "center"),
  sideOffset: num(6, { min: 0, max: 24, label: "sideOffset" }),
  delay: num(600, { min: 0, max: 1500, step: 100, label: "Open delay (ms)" }),
  closeDelay: num(300, { min: 0, max: 1500, step: 100, label: "Close delay (ms)" }),
};

const previewControls = {
  title: text("Passkeys in Qeet ID", "title"),
  description: text(
    "Register, sync and revoke WebAuthn passkeys; enforce them per role with an admin MFA policy.",
    "description",
    { multiline: true },
  ),
  url: text("docs.qeet.in/id/passkeys", "url"),
  image: select(["og-image", "none"] as const, "og-image", "imageUrl"),
  side: select(sides, "bottom"),
};

export const examples: FamilyExamples = {
  "hover-card": {
    demos: [
      {
        name: "User card",
        description:
          "Hover or focus the name: a rich preview after a short delay. Supplementary only — the link still goes to the profile.",
        render: () => (
          <p className="max-w-sm text-sm text-muted-foreground">
            Role changed to Developer by{" "}
            <HoverCard>
              <HoverCardTrigger
                href={`/console/users/${rohan.id}`}
                onClick={stayOnPage}
                className="font-medium text-link underline-offset-4 hover:underline"
              >
                {rohan.name}
              </HoverCardTrigger>
              <HoverCardContent className="w-72">
                <UserCard />
              </HoverCardContent>
            </HoverCard>{" "}
            {ago(minutesAgo(5))}.
          </p>
        ),
      },
      {
        name: "Invoice link",
        render: () => (
          <p className="max-w-sm text-sm text-muted-foreground">
            NACH mandate NACH-88213 settled{" "}
            <HoverCard>
              <HoverCardTrigger
                href={`/pay/invoices/${paidInvoice.number}`}
                onClick={stayOnPage}
                className="font-mono whitespace-nowrap text-link underline-offset-4 hover:underline"
              >
                {paidInvoice.number}
              </HoverCardTrigger>
              <HoverCardContent side="top" className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{paidInvoice.customer}</span>
                  <Badge variant="success">Paid</Badge>
                </div>
                <p className="font-heading text-lg font-medium tabular-nums text-foreground">
                  {formatInr(paidTotals.total)}
                </p>
                <p className="text-caption text-muted-foreground">
                  IGST {formatInr(paidTotals.igst)} · {paidInvoice.placeOfSupply} · issued{" "}
                  {dateFormat.format(new Date(paidInvoice.issued))}
                </p>
              </HoverCardContent>
            </HoverCard>
            .
          </p>
        ),
      },
    ],
    playground: definePlayground({
      controls: hoverCardControls,
      render: (v) => (
        <HoverCard>
          <HoverCardTrigger
            href={`/console/users/${rohan.id}`}
            onClick={stayOnPage}
            delay={v.delay}
            closeDelay={v.closeDelay}
            className="text-sm font-medium text-link underline-offset-4 hover:underline"
          >
            {rohan.name}
          </HoverCardTrigger>
          <HoverCardContent
            side={v.side}
            align={v.align}
            sideOffset={v.sideOffset}
            className="w-72"
          >
            <UserCard />
          </HoverCardContent>
        </HoverCard>
      ),
      code: (v) =>
        jsx("HoverCard", {}, [
          jsx(
            "HoverCardTrigger",
            {
              href: `/console/users/${rohan.id}`,
              delay: v.delay === 600 ? undefined : v.delay,
              closeDelay: v.closeDelay === 300 ? undefined : v.closeDelay,
            },
            rohan.name,
          ),
          jsx(
            "HoverCardContent",
            {
              side: v.side === "bottom" ? undefined : v.side,
              align: v.align === "center" ? undefined : v.align,
              sideOffset: v.sideOffset === 6 ? undefined : v.sideOffset,
            },
            "{/* avatar, role, email, last active */}",
          ),
        ]),
    }),
  },

  popover: {
    demos: [
      {
        name: "Filter form",
        description:
          "A small form anchored to its trigger. Focus moves into the popover; Escape or an outside click closes it.",
        render: () => <FilterPopover />,
      },
      {
        name: "Share",
        render: () => <SharePopover />,
      },
      {
        name: "Sides",
        description: "Flips to the opposite side when there is no room.",
        render: () => (
          <div className="flex flex-wrap gap-2">
            {sides.map((side) => (
              <Popover key={side}>
                <PopoverTrigger render={<Button variant="outline" className="capitalize" />}>
                  {side}
                </PopoverTrigger>
                <PopoverContent side={side} className="w-60">
                  <PopoverTitle>Data residency</PopoverTitle>
                  <PopoverDescription>
                    Stored in ap-south-1 (Mumbai) under the DPDP Act.
                  </PopoverDescription>
                </PopoverContent>
              </Popover>
            ))}
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: popoverControls,
      render: (v) => (
        <Popover modal={v.modal === "trap-focus" ? v.modal : v.modal === "true"}>
          <PopoverTrigger render={<Button variant="outline" />}>Session policy</PopoverTrigger>
          <PopoverContent side={v.side} align={v.align} sideOffset={v.sideOffset}>
            <div className="flex flex-col gap-1">
              <PopoverTitle>{v.title}</PopoverTitle>
              <PopoverDescription>{v.description}</PopoverDescription>
            </div>
          </PopoverContent>
        </Popover>
      ),
      code: (v) =>
        jsx(
          "Popover",
          { modal: v.modal === "false" ? undefined : v.modal === "true" ? true : v.modal },
          [
            jsx(
              "PopoverTrigger",
              { render: expr('<Button variant="outline" />') },
              "Session policy",
            ),
            jsx(
              "PopoverContent",
              {
                side: v.side === "bottom" ? undefined : v.side,
                align: v.align === "center" ? undefined : v.align,
                sideOffset: v.sideOffset === 4 ? undefined : v.sideOffset,
              },
              [jsx("PopoverTitle", {}, v.title), jsx("PopoverDescription", {}, v.description)],
            ),
          ],
        ),
    }),
  },

  "preview-card": {
    demos: [
      {
        name: "Link preview",
        description:
          "The built-in template: `title`, `description`, `url` and an `imageUrl` hero, shown on hover or focus of the link.",
        render: () => (
          <p className="max-w-sm text-sm text-muted-foreground">
            Read{" "}
            <PreviewCard>
              <PreviewCardTrigger
                href="https://docs.qeet.in/id/passkeys"
                onClick={stayOnPage}
                className="font-medium text-link underline-offset-4 hover:underline"
              >
                Passkeys in Qeet ID
              </PreviewCardTrigger>
              <PreviewCardContent
                title="Passkeys in Qeet ID"
                description="Register, sync and revoke WebAuthn passkeys; enforce them per role with an admin MFA policy."
                url="docs.qeet.in/id/passkeys"
                imageUrl={docsOgImage}
              />
            </PreviewCard>{" "}
            before you enforce passkeys for admins.
          </p>
        ),
      },
      {
        name: "Without image",
        render: () => (
          <p className="max-w-sm text-sm text-muted-foreground">
            Webhooks are signed; see{" "}
            <PreviewCard>
              <PreviewCardTrigger
                href="https://apis.qeet.in/pay/webhooks#signatures"
                onClick={stayOnPage}
                className="font-medium text-link underline-offset-4 hover:underline"
              >
                verifying signatures
              </PreviewCardTrigger>
              <PreviewCardContent
                title="Verify Qeet Pay webhook signatures"
                description="Every event carries a Qeet-Signature header: an HMAC-SHA256 of the timestamp and raw body, signed with your endpoint secret."
                url="apis.qeet.in/pay/webhooks#signatures"
              />
            </PreviewCard>
            .
          </p>
        ),
      },
      {
        name: "Composed",
        description:
          "Children instead of the template props, built from PreviewCardTitle, PreviewCardDescription and PreviewCardUrl.",
        render: () => (
          <p className="max-w-sm text-sm text-muted-foreground">
            Status updates live on{" "}
            <PreviewCard>
              <PreviewCardTrigger
                href="https://status.qeet.in"
                onClick={stayOnPage}
                className="font-medium text-link underline-offset-4 hover:underline"
              >
                status.qeet.in
              </PreviewCardTrigger>
              <PreviewCardContent className="flex w-72 gap-3">
                <ThemedQeetLogo height={32} className="shrink-0" />
                <div className="flex min-w-0 flex-col gap-1">
                  <PreviewCardTitle>Qeet status</PreviewCardTitle>
                  <PreviewCardDescription>
                    All systems operational. Qeet Pay UPI collect is degraded in ap-south-2 since
                    09:52 IST.
                  </PreviewCardDescription>
                  <PreviewCardUrl>status.qeet.in</PreviewCardUrl>
                </div>
              </PreviewCardContent>
            </PreviewCard>
            .
          </p>
        ),
      },
    ],
    playground: definePlayground({
      controls: previewControls,
      render: (v) => (
        <PreviewCard>
          <PreviewCardTrigger
            href={`https://${v.url}`}
            onClick={stayOnPage}
            className="text-sm font-medium text-link underline-offset-4 hover:underline"
          >
            {v.title}
          </PreviewCardTrigger>
          <PreviewCardContent
            side={v.side}
            title={v.title}
            description={v.description}
            url={v.url}
            imageUrl={v.image === "og-image" ? docsOgImage : undefined}
          />
        </PreviewCard>
      ),
      code: (v) =>
        jsx("PreviewCard", {}, [
          jsx("PreviewCardTrigger", { href: `https://${v.url}` }, v.title),
          jsx("PreviewCardContent", {
            side: v.side === "bottom" ? undefined : v.side,
            title: v.title,
            description: v.description,
            url: v.url,
            imageUrl: v.image === "og-image" ? "/og/passkeys.png" : undefined,
          }),
        ]),
    }),
  },
};
