import { Button, Separator, Switch } from "@qeetrix/ui";
import { apiKeys, sessions, tenants } from "../data/qeet";
import { jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, select } from "../registry/types";

const acme = tenants[0];

const settings = [
  {
    id: "passkeys",
    title: "Require passkeys for admins",
    body: "Owners, Admins and Billing users must sign in with a passkey.",
    on: true,
  },
  {
    id: "idle",
    title: "Sign out idle sessions",
    body: "End sessions after 30 minutes without activity.",
    on: true,
  },
  {
    id: "scim",
    title: "Allow SCIM deprovisioning",
    body: "Suspend users the moment Okta removes them.",
    on: false,
  },
];

export const examples: FamilyExamples = {
  separator: {
    minHeight: 520,
    demos: [
      {
        name: "Horizontal",
        description: "Divides stacked sections of a settings panel.",
        render: () => (
          <div className="flex w-80 flex-col">
            {settings.map((setting, index) => (
              <div key={setting.id}>
                {index > 0 && <Separator className="my-3" />}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span id={`sep-${setting.id}`} className="text-sm font-medium">
                      {setting.title}
                    </span>
                    <span className="text-caption text-muted-foreground">{setting.body}</span>
                  </div>
                  <Switch defaultChecked={setting.on} aria-labelledby={`sep-${setting.id}`} />
                </div>
              </div>
            ))}
          </div>
        ),
      },
      {
        name: "Vertical",
        description: "Separates inline metadata; it stretches to the row's height.",
        render: () => (
          <div className="flex h-5 items-center gap-3 text-sm">
            <span className="font-medium">{acme.name}</span>
            <Separator orientation="vertical" />
            <span className="text-muted-foreground">{acme.plan}</span>
            <Separator orientation="vertical" />
            <span className="font-mono text-caption text-muted-foreground">{acme.region}</span>
          </div>
        ),
      },
      {
        name: "Between actions",
        render: () => (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              Resend invite
            </Button>
            <Button variant="ghost" size="sm">
              Copy link
            </Button>
            <Separator orientation="vertical" className="h-5 self-center" />
            <Button variant="ghost" size="sm" className="text-destructive-text">
              Revoke
            </Button>
          </div>
        ),
      },
      {
        name: "Muted, inside a section",
        description:
          '`variant="muted"` is one step quieter: it divides items within a section, while the default rule divides the sections themselves.',
        render: () => (
          <div className="flex w-80 flex-col gap-3">
            <div className="flex flex-col">
              <span className="pb-2 text-sm font-medium">Recent sign-ins</span>
              {sessions.slice(0, 3).map((session, index) => (
                <div key={session.id}>
                  {index > 0 && <Separator variant="muted" />}
                  <div className="flex justify-between gap-3 py-2 text-sm">
                    <span>{session.device}</span>
                    <span className="text-muted-foreground">{session.location}</span>
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex flex-col">
              <span className="pb-2 text-sm font-medium">API keys</span>
              {apiKeys.map((key, index) => (
                <div key={key.id}>
                  {index > 0 && <Separator variant="muted" />}
                  <div className="flex justify-between gap-3 py-2 text-sm">
                    <span>{key.name}</span>
                    <span className="font-mono text-caption text-muted-foreground">
                      {key.prefix}…
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: {
        orientation: select(["horizontal", "vertical"] as const, "horizontal"),
        variant: select(["default", "muted"] as const, "default"),
      },
      render: (v) =>
        v.orientation === "horizontal" ? (
          <div className="flex w-72 flex-col gap-3 text-sm">
            <span>Qeet ID · Directory</span>
            <Separator variant={v.variant} />
            <span className="text-muted-foreground">1,842 users</span>
          </div>
        ) : (
          <div className="flex h-5 items-center gap-3 text-sm">
            <span>Qeet ID</span>
            <Separator orientation="vertical" variant={v.variant} />
            <span className="text-muted-foreground">1,842 users</span>
          </div>
        ),
      code: (v) =>
        jsx("Separator", {
          orientation: v.orientation === "horizontal" ? undefined : v.orientation,
          variant: v.variant === "default" ? undefined : v.variant,
        }),
    }),
  },
};
