import { ChevronRightIcon, CopyIcon } from "@qeetrix/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
  Switch,
} from "@qeetrix/ui";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const settlementFaqs = [
  {
    value: "when",
    question: "When are UPI payments settled to my bank account?",
    answer:
      "Captured UPI payments settle T+1 on banking days, into the current account verified for your Qeet Pay merchant ID. Payments captured after 11:00 pm IST roll into the next cycle.",
  },
  {
    value: "fees",
    question: "Is GST charged on Qeet Pay fees?",
    answer:
      "Yes. Platform fees attract 18% GST, shown separately on each settlement report and on the monthly tax invoice issued to your GSTIN.",
  },
  {
    value: "refunds",
    question: "How long do refunds take to reach the customer?",
    answer:
      "UPI refunds usually land within minutes. Card refunds take 5–7 working days, depending on the issuing bank.",
  },
  {
    value: "nach",
    question: "Can I collect recurring payments with NACH?",
    answer:
      "Register an e-NACH mandate once; Qeet Pay then debits each invoice on its due date and notifies the customer by SMS and email beforehand.",
  },
] as const;

const securitySections = [
  {
    value: "passkeys",
    title: "Passkeys",
    body: "Required for Owners, Admins and Billing. 1,642 of 1,842 users have one enrolled.",
  },
  {
    value: "sessions",
    title: "Session lifetime",
    body: "Idle sessions end after 30 minutes; every session ends after 12 hours.",
  },
  {
    value: "ip",
    title: "IP allow-list",
    body: "Console access is limited to 49.207.12.0/24 (Bengaluru office) and the corporate VPN.",
  },
] as const;

const recoveryCodes = [
  "7HC2-YT9M",
  "VBQ4-RNW8",
  "LPZ3-SXE1",
  "KDJ6-UFA0",
  "AB91-LM3N",
  "Q8RT-5VW2",
];

/** A disclosure for secondary content: recovery codes stay hidden until asked for. */
function RecoveryCodes({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="flex w-80 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Recovery codes</span>
        <CollapsibleTrigger
          render={<Button variant="ghost" size="sm" />}
          className="group/collapsible-trigger"
        >
          <span className="group-data-panel-open/collapsible-trigger:hidden">Show codes</span>
          <span className="hidden group-data-panel-open/collapsible-trigger:inline">
            Hide codes
          </span>
          <ChevronRightIcon
            aria-hidden
            data-icon="inline-end"
            className="transition-transform group-data-panel-open/collapsible-trigger:rotate-90 rtl:rotate-180"
          />
        </CollapsibleTrigger>
      </div>
      <p className="text-caption text-muted-foreground">
        Each code signs you in once if you lose every passkey.
      </p>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
        <div className="flex flex-col gap-2 rounded-lg border bg-surface-sunken p-3">
          <ul className="grid grid-cols-2 gap-1.5 font-mono text-sm">
            {recoveryCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="self-start">
            <CopyIcon data-icon="inline-start" aria-hidden />
            Copy all
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AdvancedSettings() {
  return (
    <form className="flex w-80 flex-col gap-3" onSubmit={(event) => event.preventDefault()}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="acc-webhook-url">Endpoint URL</Label>
        <Input id="acc-webhook-url" defaultValue="https://api.acme.in/hooks/qeet-id" />
      </div>
      <Collapsible className="flex flex-col gap-3">
        <CollapsibleTrigger className="group/advanced flex items-center gap-1 self-start rounded-md text-sm font-medium text-link outline-none hover:text-link-hover focus-visible:ring-3 focus-visible:ring-ring/disabled">
          <ChevronRightIcon
            aria-hidden
            className="size-4 transition-transform group-data-panel-open/advanced:rotate-90 rtl:rotate-180"
          />
          Advanced delivery options
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-webhook-timeout">Timeout (seconds)</Label>
            <Input id="acc-webhook-timeout" type="number" defaultValue={10} className="w-28" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="acc-webhook-retry">Retry with exponential backoff</Label>
            <Switch id="acc-webhook-retry" defaultChecked />
          </div>
        </CollapsibleContent>
      </Collapsible>
      <Button type="submit" className="self-start">
        Save endpoint
      </Button>
    </form>
  );
}

const accordionControls = {
  multiple: bool(false, "Allow several open (multiple)"),
  defaultOpen: select(["none", "first", "first two"] as const, "first", "Initially open"),
  disabled: bool(false),
  disableItem: bool(false, "Disable the last item"),
};

const openFor = {
  none: [] as string[],
  first: ["when"],
  "first two": ["when", "fees"],
};

const collapsibleControls = {
  defaultOpen: bool(false, "Open (defaultOpen)"),
  disabled: bool(false),
  label: text("Show recovery codes", "Trigger label"),
};

export const examples: FamilyExamples = {
  accordion: {
    minHeight: 900,
    demos: [
      {
        name: "Single",
        description: "One answer open at a time; opening another closes the first.",
        render: () => (
          <Accordion defaultValue={["when"]} className="w-96 max-w-full">
            {settlementFaqs.map((faq) => (
              <AccordionItem key={faq.value} value={faq.value}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ),
      },
      {
        name: "Multiple",
        description: "`multiple` lets a reviewer keep several policy sections open side by side.",
        render: () => (
          <Accordion multiple defaultValue={["passkeys", "sessions"]} className="w-96 max-w-full">
            {securitySections.map((section) => (
              <AccordionItem key={section.value} value={section.value}>
                <AccordionTrigger>{section.title}</AccordionTrigger>
                <AccordionContent>{section.body}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ),
      },
      {
        name: "Disabled item",
        description: "An item can be disabled on its own, e.g. a feature the plan doesn't include.",
        render: () => (
          <Accordion className="w-96 max-w-full">
            <AccordionItem value="saml">
              <AccordionTrigger>SAML 2.0 connections</AccordionTrigger>
              <AccordionContent>
                Two identity providers connected: Okta (primary) and Azure AD (contractors).
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="scim" disabled>
              <AccordionTrigger>SCIM provisioning · Enterprise plan</AccordionTrigger>
              <AccordionContent>Upgrade to provision users automatically.</AccordionContent>
            </AccordionItem>
          </Accordion>
        ),
      },
    ],
    playground: definePlayground({
      controls: accordionControls,
      render: (v) => (
        <Accordion
          key={`${v.multiple}-${v.defaultOpen}`}
          multiple={v.multiple}
          defaultValue={openFor[v.defaultOpen]}
          disabled={v.disabled}
          className="w-96 max-w-full"
        >
          {settlementFaqs.map((faq, index) => (
            <AccordionItem
              key={faq.value}
              value={faq.value}
              disabled={v.disableItem && index === settlementFaqs.length - 1}
            >
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ),
      code: (v) =>
        jsx(
          "Accordion",
          {
            multiple: v.multiple,
            defaultValue:
              v.defaultOpen === "none"
                ? undefined
                : expr(JSON.stringify(openFor[v.defaultOpen]).replace(/,/g, ", ")),
            disabled: v.disabled,
          },
          settlementFaqs.slice(0, 2).map((faq, index) =>
            jsx(
              "AccordionItem",
              {
                value: faq.value,
                disabled: v.disableItem && index === 1,
              },
              [jsx("AccordionTrigger", {}, faq.question), jsx("AccordionContent", {}, faq.answer)],
            ),
          ),
        ),
    }),
  },

  collapsible: {
    minHeight: 520,
    demos: [
      {
        name: "Disclosure",
        description: "Secondary content — here, one-time recovery codes — stays out of the way.",
        render: () => <RecoveryCodes />,
      },
      {
        name: "Advanced options",
        description: "Rarely changed fields fold away under a text trigger inside a form.",
        render: () => <AdvancedSettings />,
      },
      {
        name: "Disabled",
        render: () => (
          <Collapsible disabled className="flex w-80 flex-col gap-2">
            <CollapsibleTrigger render={<Button variant="outline" size="sm" />}>
              Show audit export history
            </CollapsibleTrigger>
            <CollapsibleContent>No exports yet.</CollapsibleContent>
          </Collapsible>
        ),
      },
    ],
    playground: definePlayground({
      controls: collapsibleControls,
      render: (v) => (
        <Collapsible
          key={String(v.defaultOpen)}
          defaultOpen={v.defaultOpen}
          disabled={v.disabled}
          className="flex w-80 flex-col gap-2"
        >
          <CollapsibleTrigger
            render={<Button variant="outline" size="sm" />}
            className="self-start"
          >
            {v.label}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="grid grid-cols-2 gap-1.5 rounded-lg border bg-surface-sunken p-3 font-mono text-sm">
              {recoveryCodes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ),
      code: (v) =>
        jsx("Collapsible", { defaultOpen: v.defaultOpen, disabled: v.disabled }, [
          jsx(
            "CollapsibleTrigger",
            { render: expr('<Button variant="outline" size="sm" />') },
            v.label,
          ),
          jsx("CollapsibleContent", {}, [
            '<ul className="font-mono text-sm">{/* recovery codes */}</ul>',
          ]),
        ]),
    }),
  },
};
