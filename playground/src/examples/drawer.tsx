import {
  Badge,
  Button,
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Field,
  FieldLabel,
  Input,
  Label,
  NativeSelect,
  Separator,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Switch,
  toast,
} from "@qeetrix/ui";
import {
  BanknoteIcon,
  CreditCardIcon,
  DownloadIcon,
  LogOutIcon,
  PencilIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
} from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import {
  dateFormat,
  formatInr,
  type Invoice,
  invoices,
  invoiceTotals,
  sessions,
  users,
} from "../data/qeet";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const invoice = invoices[0];
const totals = invoiceTotals(invoice);
const phoneSession = sessions[1];
const editableUser = users[2];

/** The GST lines of a tax invoice: CGST + SGST within a state, IGST across states. */
function GstBreakup({ data }: { data: Invoice }) {
  const sums = invoiceTotals(data);
  const half = data.gstRate / 2;
  const rows = [
    { label: "Taxable value", amount: data.subtotal },
    ...(data.intraState
      ? [
          { label: `CGST @ ${half}%`, amount: sums.cgst },
          { label: `SGST @ ${half}%`, amount: sums.sgst },
        ]
      : [{ label: `IGST @ ${data.gstRate}%`, amount: sums.igst }]),
  ];
  return (
    <dl className="flex flex-col gap-1.5 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-6">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="tabular-nums">{formatInr(row.amount)}</dd>
        </div>
      ))}
      <div className="mt-1.5 flex justify-between gap-6 border-t pt-1.5 font-medium text-foreground">
        <dt>Total payable</dt>
        <dd className="tabular-nums">{formatInr(sums.total)}</dd>
      </div>
    </dl>
  );
}

/* ── Drawer demos ─────────────────────────────────────────────────────────────────────────── */

const payMethods = [
  { id: "upi", label: "UPI", detail: "accounts@acmeindia", icon: SmartphoneIcon },
  { id: "card", label: "Card", detail: "Visa ending 4417", icon: CreditCardIcon },
  { id: "netbanking", label: "Net banking", detail: "HDFC Bank", icon: BanknoteIcon },
] as const;

function PayInvoiceDrawer() {
  const [method, setMethod] = useState<(typeof payMethods)[number]["id"]>("upi");
  const chosen = payMethods.find((option) => option.id === method) ?? payMethods[0];
  return (
    <Drawer>
      <DrawerTrigger render={<Button />}>Pay {formatInr(totals.total)}</DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
          <DrawerHeader>
            <DrawerTitle>Pay {invoice.number}</DrawerTitle>
            <DrawerDescription>
              {invoice.customer} · due {dateFormat.format(new Date(invoice.due))}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="flex flex-col gap-4">
            <GstBreakup data={invoice} />
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Pay with</legend>
              {payMethods.map((option) => (
                <Button
                  key={option.id}
                  variant="outline"
                  aria-pressed={method === option.id}
                  onClick={() => setMethod(option.id)}
                  className="h-auto justify-start gap-3 py-2.5 aria-pressed:border-border-brand aria-pressed:bg-brand-subtle"
                >
                  <option.icon aria-hidden />
                  <span className="flex flex-col items-start">
                    <span>{option.label}</span>
                    <span className="text-caption font-normal text-muted-foreground">
                      {option.detail}
                    </span>
                  </span>
                </Button>
              ))}
            </fieldset>
          </DrawerBody>
          <DrawerFooter>
            <DrawerClose
              render={<Button size="lg" />}
              onClick={() =>
                toast.success(`${formatInr(totals.total)} paid via ${chosen.label}`, {
                  description: `${invoice.number} is marked paid. Receipt sent to accounts@acme.in.`,
                })
              }
            >
              Pay {formatInr(totals.total)}
            </DrawerClose>
            <DrawerClose render={<Button variant="ghost" />}>Cancel</DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ── Sheet demos ──────────────────────────────────────────────────────────────────────────── */

function EditUserSheet() {
  const id = useId();
  const [open, setOpen] = useState(false);
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpen(false);
    toast.success(`${editableUser.name} updated`, { description: "Changes are in the audit log." });
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        <PencilIcon data-icon="inline-start" aria-hidden />
        Edit user
      </SheetTrigger>
      <SheetContent>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <SheetHeader>
            <SheetTitle>Edit {editableUser.name}</SheetTitle>
            <SheetDescription>{editableUser.email}</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor={`${id}-name`}>Display name</FieldLabel>
              <Input id={`${id}-name`} defaultValue={editableUser.name} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-role`}>Role</FieldLabel>
              <NativeSelect id={`${id}-role`} defaultValue={editableUser.role}>
                {["Admin", "Developer", "Billing", "Auditor", "Member"].map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-department`}>Department</FieldLabel>
              <Input id={`${id}-department`} defaultValue={editableUser.department} />
            </Field>
            <Label className="flex items-center justify-between gap-4 font-normal">
              Require a passkey to sign in
              <Switch defaultChecked />
            </Label>
          </SheetBody>
          <SheetFooter className="flex-row justify-end">
            <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
            <Button type="submit">Save changes</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

const sides = ["top", "right", "bottom", "left", "inline-start", "inline-end"] as const;

/* ── Playgrounds ──────────────────────────────────────────────────────────────────────────── */

const sheetControls = {
  side: select(sides, "right"),
  title: text(`Invoice ${invoice.number}`, "Title"),
  description: text(`${invoice.customer} · GSTIN ${invoice.gstin}`, "Description"),
  showCloseButton: bool(true, "Close button"),
};

const drawerControls = {
  title: text(`Pay ${invoice.number}`, "Title"),
  description: text(`${invoice.customer} · due in 27 days`, "Description"),
  showCloseButton: bool(true, "Close button"),
  disablePointerDismissal: bool(false, "Disable backdrop dismissal"),
};

export const examples: FamilyExamples = {
  drawer: {
    demos: [
      {
        name: "Mobile checkout",
        description:
          "A bottom sheet with a grab handle: the Qeet Pay hosted checkout's payment step on a phone.",
        render: () => <PayInvoiceDrawer />,
      },
      {
        name: "Swipe to dismiss",
        description:
          "Drag the sheet (or its handle) down and let go to dismiss it; a flick closes it faster. The gesture always has equivalents in Escape, the backdrop and Cancel.",
        render: () => (
          <Drawer>
            <DrawerTrigger render={<Button variant="outline" />}>
              <SmartphoneIcon data-icon="inline-start" aria-hidden />
              {phoneSession.device}
            </DrawerTrigger>
            <DrawerContent>
              <div className="mx-auto flex w-full max-w-md flex-col">
                <DrawerHeader>
                  <DrawerTitle>
                    {phoneSession.device} · {phoneSession.browser}
                  </DrawerTitle>
                  <DrawerDescription>
                    {phoneSession.location} · signed in with a {phoneSession.method.toLowerCase()}
                  </DrawerDescription>
                </DrawerHeader>
                <div className="flex flex-col gap-1 px-4">
                  <DrawerClose
                    render={<Button variant="ghost" className="justify-start" />}
                    onClick={() => toast.success(`${phoneSession.device} marked as trusted`)}
                  >
                    <ShieldCheckIcon data-icon="inline-start" aria-hidden />
                    Mark as trusted device
                  </DrawerClose>
                  <DrawerClose
                    render={
                      <Button variant="ghost" className="justify-start text-destructive-text" />
                    }
                    onClick={() => toast.warning(`Signed out of ${phoneSession.device}`)}
                  >
                    <LogOutIcon data-icon="inline-start" aria-hidden />
                    Sign out this device
                  </DrawerClose>
                </div>
                <DrawerFooter>
                  <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
        ),
      },
    ],
    playground: definePlayground({
      controls: drawerControls,
      render: (v) => (
        <Drawer disablePointerDismissal={v.disablePointerDismissal}>
          <DrawerTrigger render={<Button variant="outline" />}>Open drawer</DrawerTrigger>
          <DrawerContent showCloseButton={v.showCloseButton}>
            <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
              <DrawerHeader>
                <DrawerTitle>{v.title}</DrawerTitle>
                <DrawerDescription>{v.description}</DrawerDescription>
              </DrawerHeader>
              <DrawerBody>
                <GstBreakup data={invoice} />
              </DrawerBody>
              <DrawerFooter>
                <DrawerClose render={<Button />}>Pay {formatInr(totals.total)}</DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      ),
      code: (v) =>
        jsx("Drawer", changedProps(v, drawerControls, ["disablePointerDismissal"]), [
          jsx("DrawerTrigger", { render: expr('<Button variant="outline" />') }, "Open drawer"),
          jsx("DrawerContent", changedProps(v, drawerControls, ["showCloseButton"]), [
            jsx("DrawerHeader", {}, [
              jsx("DrawerTitle", {}, v.title),
              jsx("DrawerDescription", {}, v.description),
            ]),
            jsx("DrawerBody", {}, "{/* GST breakup */}"),
            jsx("DrawerFooter", {}, [
              jsx("DrawerClose", { render: expr("<Button />") }, `Pay ${formatInr(totals.total)}`),
            ]),
          ]),
        ]),
    }),
  },

  sheet: {
    demos: [
      {
        name: "Invoice details",
        description:
          'A details panel on `side="inline-end"` (right in English, left in RTL). `SheetBody` scrolls while the header and the footer actions stay pinned. Intra-state supply, so GST splits into CGST and SGST.',
        render: () => (
          <Sheet>
            <SheetTrigger render={<Button variant="outline" />}>View {invoice.number}</SheetTrigger>
            <SheetContent side="inline-end">
              <SheetHeader>
                <SheetTitle>Invoice {invoice.number}</SheetTitle>
                <SheetDescription>{invoice.customer}</SheetDescription>
              </SheetHeader>
              <SheetBody className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span className="font-heading text-xl font-medium tabular-nums">
                    {formatInr(totals.total)}
                  </span>
                  <Badge variant="secondary">Sent · awaiting payment</Badge>
                </div>
                <DescriptionList className="sm:grid-cols-[8rem_1fr]">
                  <DescriptionTerm>GSTIN</DescriptionTerm>
                  <DescriptionDetails className="font-mono">{invoice.gstin}</DescriptionDetails>
                  <DescriptionTerm>Place of supply</DescriptionTerm>
                  <DescriptionDetails>{invoice.placeOfSupply}</DescriptionDetails>
                  <DescriptionTerm>Issued</DescriptionTerm>
                  <DescriptionDetails>
                    {dateFormat.format(new Date(invoice.issued))}
                  </DescriptionDetails>
                  <DescriptionTerm>Due</DescriptionTerm>
                  <DescriptionDetails>
                    {dateFormat.format(new Date(invoice.due))}
                  </DescriptionDetails>
                  <DescriptionTerm>SAC</DescriptionTerm>
                  <DescriptionDetails>998314 · IT design and development</DescriptionDetails>
                </DescriptionList>
                <Separator />
                <GstBreakup data={invoice} />
              </SheetBody>
              <SheetFooter>
                <Button
                  onClick={() =>
                    toast.success("Reminder sent", {
                      description: `${invoice.number} · accounts@acme.in via email and WhatsApp`,
                    })
                  }
                >
                  Send payment reminder
                </Button>
                <Button variant="outline">
                  <DownloadIcon data-icon="inline-start" aria-hidden />
                  Download PDF
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        ),
      },
      {
        name: "Sides",
        description:
          "Physical sides (`top`, `right`, `bottom`, `left`) stay put in every direction; `inline-start` and `inline-end` follow the reading direction and mirror their border and motion in RTL.",
        render: () => (
          <div className="flex flex-wrap gap-2">
            {sides.map((side) => (
              <Sheet key={side}>
                <SheetTrigger render={<Button variant="outline" className="font-mono" />}>
                  {side}
                </SheetTrigger>
                <SheetContent side={side}>
                  <SheetHeader>
                    <SheetTitle>Notification channels</SheetTitle>
                    <SheetDescription>
                      Where Qeet Notify sends sign-in alerts for Acme India.
                    </SheetDescription>
                  </SheetHeader>
                  <SheetBody>
                    <ul className="flex flex-col gap-1 pb-4 text-sm">
                      <li>Email · security@acme.in</li>
                      <li>SMS · +91 98450 12345 (DLT approved)</li>
                      <li>WhatsApp · Acme IT Ops</li>
                    </ul>
                  </SheetBody>
                </SheetContent>
              </Sheet>
            ))}
          </div>
        ),
      },
      {
        name: "Edit form",
        description:
          "A form around `SheetBody`: the fields scroll on a short screen and the Save footer stays pinned to the bottom edge.",
        render: () => <EditUserSheet />,
      },
    ],
    playground: definePlayground({
      controls: sheetControls,
      render: (v) => (
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>Open sheet</SheetTrigger>
          <SheetContent side={v.side} showCloseButton={v.showCloseButton}>
            <SheetHeader>
              <SheetTitle>{v.title}</SheetTitle>
              <SheetDescription>{v.description}</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <GstBreakup data={invoice} />
            </SheetBody>
            <SheetFooter>
              <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ),
      code: (v) =>
        jsx("Sheet", {}, [
          jsx("SheetTrigger", { render: expr('<Button variant="outline" />') }, "Open sheet"),
          jsx("SheetContent", changedProps(v, sheetControls, ["side", "showCloseButton"]), [
            jsx("SheetHeader", {}, [
              jsx("SheetTitle", {}, v.title),
              jsx("SheetDescription", {}, v.description),
            ]),
            jsx("SheetBody", {}, "{/* GST breakup */}"),
            jsx("SheetFooter", {}, [
              jsx("SheetClose", { render: expr('<Button variant="outline" />') }, "Close"),
            ]),
          ]),
        ]),
    }),
  },
};
