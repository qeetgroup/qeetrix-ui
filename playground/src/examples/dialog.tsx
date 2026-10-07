import { CircleCheckIcon, KeyRoundIcon, LogOutIcon, TrashIcon, UserPlusIcon } from "@qeetrix/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  NativeSelect,
  toast,
} from "@qeetrix/ui";
import { type FormEvent, useId, useState } from "react";
import { apiKeys, policyAfter, policyBefore, tenants, users } from "../data/qeet";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const liveKey = apiKeys[0];
const pendingTenant = tenants.find((tenant) => tenant.status === "pending") ?? tenants[0];

/* ── Dialog demos ─────────────────────────────────────────────────────────────────────────── */

const inviteRoles = ["Admin", "Developer", "Billing", "Auditor", "Member"] as const;

function InviteMemberDialog() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("Developer");
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setEmail("");
      setRole("Developer");
      setError(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Enter a work email address, e.g. neha.joshi@acme.in.");
      return;
    }
    if (!value.endsWith("@acme.in")) {
      setError("Only addresses on acme.in can join this tenant. Verify the domain first.");
      return;
    }
    setOpen(false);
    toast.success(`Invitation sent to ${value}`, {
      description: `${role} · the link expires in 7 days.`,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <UserPlusIcon data-icon="inline-start" aria-hidden />
        Invite member
      </DialogTrigger>
      <DialogContent>
        <form noValidate onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Invite member to Acme India</DialogTitle>
            <DialogDescription>
              They will get an email to register a passkey and join the tenant.
            </DialogDescription>
          </DialogHeader>
          <Field invalid={error !== null}>
            <FieldLabel htmlFor={`${id}-email`}>Work email</FieldLabel>
            <Input
              id={`${id}-email`}
              type="email"
              autoComplete="off"
              placeholder="name@acme.in"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              aria-invalid={error !== null || undefined}
              aria-describedby={`${id}-email-help`}
            />
            {error ? (
              <FieldError id={`${id}-email-help`}>{error}</FieldError>
            ) : (
              <FieldDescription id={`${id}-email-help`}>
                Must be on a verified domain: acme.in
              </FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-role`}>Role</FieldLabel>
            <NativeSelect
              id={`${id}-role`}
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              {inviteRoles.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="submit">Send invite</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const scimChanges = users.slice(0, 10).map((user, index) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  change: index % 3 === 0 ? "Create" : index % 3 === 1 ? "Update" : "Deactivate",
}));

function ScimReviewDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Review SCIM changes</DialogTrigger>
      <DialogContent className="max-h-[min(32rem,calc(100dvh-2rem))]">
        <DialogHeader>
          <DialogTitle>Review 10 changes from Okta</DialogTitle>
          <DialogDescription>
            The next SCIM sync applies these changes to Acme India.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ul className="divide-y rounded-lg border">
            {scimChanges.map((change) => (
              <li key={change.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{change.name}</p>
                  <p className="truncate text-caption text-muted-foreground">{change.email}</p>
                </div>
                <Badge
                  variant={
                    change.change === "Create"
                      ? "success"
                      : change.change === "Deactivate"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {change.change}
                </Badge>
              </li>
            ))}
          </ul>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Not now</DialogClose>
          <DialogClose
            render={<Button />}
            onClick={() =>
              toast.success("SCIM sync queued", { description: "10 changes · Acme India" })
            }
          >
            Apply changes
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DialogSize = "sm" | "default" | "lg" | "xl" | "full";

const dialogSizes: readonly {
  size: DialogSize;
  trigger: string;
  title: string;
  description: string;
}[] = [
  {
    size: "sm",
    trigger: "sm",
    title: "Rename API key",
    description: "Checkout service (prod) · qk_live_7Hc2…",
  },
  {
    size: "default",
    trigger: "default",
    title: "Connect Okta with SAML",
    description: "Single sign-on for every acme.in user. You can test before enforcing it.",
  },
  {
    size: "lg",
    trigger: "lg",
    title: "Roles for Priya Nair",
    description: "Developer on Acme India. Changes apply at her next sign-in.",
  },
  {
    size: "xl",
    trigger: "xl",
    title: "Review access · Q3 2026",
    description: "Certify or revoke access for the Platform team before 15 Oct.",
  },
  {
    size: "full",
    trigger: "full",
    title: "Edit policy admin-mfa",
    description:
      "Version 6 → 7. Dense working surfaces like this diff can take the whole viewport.",
  },
];

/** The body for each size: a field, a paragraph, a list or a side-by-side policy diff. */
function SizedBody({ size }: { size: DialogSize }) {
  const id = useId();
  if (size === "sm") {
    return (
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>Key name</FieldLabel>
        <Input id={`${id}-name`} defaultValue="Checkout service (prod)" />
      </Field>
    );
  }
  if (size === "full") {
    return (
      <DialogBody className="grid gap-3 md:grid-cols-2">
        {[
          { label: "Version 6 (live)", body: policyBefore },
          { label: "Version 7 (draft)", body: policyAfter },
        ].map((version) => (
          <section key={version.label} className="flex min-w-0 flex-col gap-1.5">
            <h3 className="text-caption font-medium text-muted-foreground">{version.label}</h3>
            <pre className="overflow-auto rounded-lg border bg-surface-sunken p-3 font-mono text-xs">
              {version.body}
            </pre>
          </section>
        ))}
      </DialogBody>
    );
  }
  const rows = users.slice(0, size === "xl" ? 6 : 3);
  return (
    <DialogBody>
      <ul className="divide-y rounded-lg border">
        {rows.map((user) => (
          <li key={user.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0">
              <span className="block truncate font-medium">{user.name}</span>
              <span className="block truncate text-caption text-muted-foreground">
                {user.email}
              </span>
            </span>
            <Badge variant="secondary">{user.role}</Badge>
          </li>
        ))}
      </ul>
    </DialogBody>
  );
}

function SizedDialog({ size, trigger }: { size: DialogSize; trigger?: string }) {
  const spec = dialogSizes.find((entry) => entry.size === size) ?? dialogSizes[1];
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="outline" className={trigger ? undefined : "font-mono"} />}
      >
        {trigger ?? spec.trigger}
      </DialogTrigger>
      <DialogContent size={size}>
        <DialogHeader>
          <DialogTitle>{spec.title}</DialogTitle>
          <DialogDescription>{spec.description}</DialogDescription>
        </DialogHeader>
        <SizedBody size={size} />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <DialogClose render={<Button />}>Save</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Alert dialog demos ───────────────────────────────────────────────────────────────────── */

function SuspendTenantDialog() {
  const id = useId();
  const [confirmation, setConfirmation] = useState("");
  const matches = confirmation.trim() === pendingTenant.domain;
  return (
    <AlertDialog onOpenChange={(open) => open && setConfirmation("")}>
      <AlertDialogTrigger render={<Button variant="outline" />}>Suspend tenant</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Suspend {pendingTenant.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            All {pendingTenant.users} users are signed out and API keys stop working until an owner
            reinstates the tenant.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor={`${id}-confirm`}>
            Type <span className="font-mono">{pendingTenant.domain}</span> to confirm
          </FieldLabel>
          <Input
            id={`${id}-confirm`}
            autoComplete="off"
            spellCheck={false}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!matches}
            onClick={() =>
              toast.warning(`${pendingTenant.name} suspended`, {
                description: "Reinstate it from Tenants → Suspended.",
              })
            }
          >
            Suspend tenant
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ── Playgrounds ──────────────────────────────────────────────────────────────────────────── */

const dialogControls = {
  trigger: text("Rotate signing key", "Trigger label"),
  title: text("Rotate the OIDC signing key?", "Title"),
  description: text(
    "A new RS256 key is published to the JWKS endpoint now; the old key keeps verifying tokens for 24 hours.",
    "Description",
    { multiline: true },
  ),
  size: select(["sm", "default", "lg", "xl", "full"] as const, "default"),
  showCloseButton: bool(true, "Close button"),
  modal: select(["true", "false", "trap-focus"] as const, "true", "modal"),
  disablePointerDismissal: bool(false, "Disable outside-click dismissal"),
};

function modalValue(value: "true" | "false" | "trap-focus"): boolean | "trap-focus" {
  return value === "trap-focus" ? value : value === "true";
}

const alertControls = {
  trigger: text("Revoke key", "Trigger label"),
  title: text(`Revoke API key ${liveKey.prefix}…?`, "Title"),
  description: text(
    `${liveKey.name} stops authenticating immediately and its requests fail with 401. This cannot be undone.`,
    "Description",
    { multiline: true },
  ),
  action: text("Revoke key", "Action label"),
  cancel: text("Keep key", "Cancel label"),
  destructive: bool(true, "Destructive action"),
};

export const examples: FamilyExamples = {
  "alert-dialog": {
    demos: [
      {
        name: "Destructive confirm",
        description:
          "The action names what it does. Initial focus lands on Cancel, the safe choice, and Escape backs out.",
        render: () => (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              <TrashIcon data-icon="inline-start" aria-hidden />
              Revoke key
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke API key {liveKey.prefix}…?</AlertDialogTitle>
                <AlertDialogDescription>
                  {liveKey.name} stops authenticating immediately and its requests fail with 401.
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep key</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() =>
                    toast.success(`${liveKey.prefix}… revoked`, {
                      description: "Rotate the secret in your checkout service's vault.",
                    })
                  }
                >
                  Revoke key
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ),
      },
      {
        name: "Typed confirmation",
        description:
          "For irreversible, wide-blast-radius actions the action stays disabled until the tenant domain is typed.",
        render: () => <SuspendTenantDialog />,
      },
      {
        name: "Non-destructive",
        render: () => (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" />}>
              <LogOutIcon data-icon="inline-start" aria-hidden />
              Sign out other sessions
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out of 3 other sessions?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your iPhone 17, ThinkPad X1 and one Linux device will need a passkey to sign in
                  again. This MacBook stays signed in.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => toast.success("Signed out of 3 sessions")}>
                  Sign out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ),
      },
    ],
    playground: definePlayground({
      controls: alertControls,
      render: (v) => (
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant={v.destructive ? "destructive" : "outline"} />}
          >
            {v.trigger}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{v.title}</AlertDialogTitle>
              <AlertDialogDescription>{v.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{v.cancel}</AlertDialogCancel>
              <AlertDialogAction variant={v.destructive ? "destructive" : "default"}>
                {v.action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
      code: (v) =>
        jsx("AlertDialog", {}, [
          jsx(
            "AlertDialogTrigger",
            {
              render: expr(`<Button variant="${v.destructive ? "destructive" : "outline"}" />`),
            },
            v.trigger,
          ),
          jsx("AlertDialogContent", {}, [
            jsx("AlertDialogHeader", {}, [
              jsx("AlertDialogTitle", {}, v.title),
              jsx("AlertDialogDescription", {}, v.description),
            ]),
            jsx("AlertDialogFooter", {}, [
              jsx("AlertDialogCancel", {}, v.cancel),
              jsx(
                "AlertDialogAction",
                { variant: v.destructive ? "destructive" : undefined },
                v.action,
              ),
            ]),
          ]),
        ]),
    }),
  },

  dialog: {
    demos: [
      {
        name: "Form",
        description:
          "A controlled dialog around a form: validation errors render inline, success closes it and confirms with a toast.",
        render: () => <InviteMemberDialog />,
      },
      {
        name: "Scrolling content",
        description:
          "Long content goes in `DialogBody`: it scrolls on its own while the header and the footer with the primary action stay pinned.",
        render: () => <ScimReviewDialog />,
      },
      {
        name: "Sizes",
        description:
          "`size` steps from `sm` to `xl` and always keeps a 1rem gutter; `full` is for dense working surfaces such as this policy diff.",
        render: () => (
          <div className="flex flex-wrap gap-2">
            {dialogSizes.map((entry) => (
              <SizedDialog key={entry.size} size={entry.size} />
            ))}
          </div>
        ),
      },
      {
        name: "Without close button",
        description:
          "`showCloseButton={false}` when the footer already has the only way out (Escape still closes).",
        render: () => (
          <Dialog>
            <DialogTrigger render={<Button variant="secondary" />}>
              <KeyRoundIcon data-icon="inline-start" aria-hidden />
              Add passkey
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="max-w-sm">
              <div className="flex flex-col items-center gap-3 text-center">
                <CircleCheckIcon className="size-10 text-success-text" aria-hidden />
                <DialogHeader className="items-center text-center">
                  <DialogTitle>Passkey added</DialogTitle>
                  <DialogDescription>
                    “MacBook Pro 14″ · iCloud Keychain” can now sign you in to Acme India.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <DialogFooter className="sm:justify-center">
                <DialogClose render={<Button />}>Done</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ),
      },
    ],
    playground: definePlayground({
      controls: dialogControls,
      render: (v) => (
        <Dialog modal={modalValue(v.modal)} disablePointerDismissal={v.disablePointerDismissal}>
          <DialogTrigger render={<Button variant="outline" />}>{v.trigger}</DialogTrigger>
          <DialogContent size={v.size} showCloseButton={v.showCloseButton}>
            <DialogHeader>
              <DialogTitle>{v.title}</DialogTitle>
              <DialogDescription>{v.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <DialogClose render={<Button />}>Rotate key</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ),
      code: (v) =>
        jsx(
          "Dialog",
          {
            modal: v.modal === "true" ? undefined : v.modal === "false" ? expr("false") : v.modal,
            ...changedProps(v, dialogControls, ["disablePointerDismissal"]),
          },
          [
            jsx("DialogTrigger", { render: expr('<Button variant="outline" />') }, v.trigger),
            jsx("DialogContent", changedProps(v, dialogControls, ["size", "showCloseButton"]), [
              jsx("DialogHeader", {}, [
                jsx("DialogTitle", {}, v.title),
                jsx("DialogDescription", {}, v.description),
              ]),
              jsx("DialogFooter", {}, [
                jsx("DialogClose", { render: expr('<Button variant="outline" />') }, "Cancel"),
                jsx("DialogClose", { render: expr("<Button />") }, "Rotate key"),
              ]),
            ]),
          ],
        ),
    }),
  },
};
