import {
  type ActiveFilter,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type ColumnDef,
  DataTable,
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
  FilterBar,
  type FilterField,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Stat,
  StatusPill,
  Switch,
  TimeSince,
  toast,
} from "@qeetrix/ui";
import {
  AppWindowIcon,
  DownloadIcon,
  FingerprintIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersIcon,
  WebhookIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { dateFormat, type MfaMethod, type User, users } from "../../data/qeet";
import { matchesAny } from "../../lib/table";
import { ConsoleFrame } from "./console-frame";

const mfaLabel: Record<MfaMethod, string> = {
  passkey: "Passkey",
  totp: "Authenticator app",
  sms: "SMS (legacy)",
  none: "Not enrolled",
};

const fields: FilterField[] = [
  {
    key: "role",
    label: "Role",
    operators: ["is", "is not"],
    options: ["Owner", "Admin", "Developer", "Billing", "Auditor", "Member"].map((role) => ({
      label: role,
      value: role,
    })),
  },
  {
    key: "mfa",
    label: "MFA",
    operators: ["is", "is not"],
    options: Object.entries(mfaLabel).map(([value, label]) => ({ label, value })),
  },
  { key: "department", label: "Department", operators: ["contains", "is"] },
];

function applyFilters(list: readonly User[], filters: ActiveFilter[]): User[] {
  return list.filter((user) =>
    filters.every((filter) => {
      const value = String(user[filter.field as keyof User] ?? "");
      if (filter.operator === "is") return value.toLowerCase() === filter.value.toLowerCase();
      if (filter.operator === "is not") return value.toLowerCase() !== filter.value.toLowerCase();
      return value.toLowerCase().includes(filter.value.toLowerCase());
    }),
  );
}

export function QeetIdUsersPattern() {
  const [filters, setFilters] = useState<ActiveFilter[]>([
    { field: "mfa", operator: "is not", value: "sms" },
  ]);
  const [selectedId, setSelectedId] = useState<string>("usr_03");
  const data = useMemo(() => applyFilters(users, filters), [filters]);
  const selected = users.find((user) => user.id === selectedId) ?? users[0];

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setSelectedId(row.original.id)}
            aria-pressed={row.original.id === selectedId}
            className="flex items-center gap-2.5 rounded-md text-start outline-none focus-visible:focus-ring"
          >
            <Avatar size="sm">
              <AvatarFallback>{row.original.initials}</AvatarFallback>
            </Avatar>
            <span className="flex flex-col">
              <span className="font-medium text-foreground">{row.original.name}</span>
              <span className="text-xs text-muted-foreground">{row.original.email}</span>
            </span>
          </button>
        ),
      },
      { accessorKey: "role", header: "Role", filterFn: matchesAny },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: matchesAny,
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
      {
        accessorKey: "mfa",
        header: "MFA",
        cell: ({ row }) => (
          <span
            className={row.original.mfa === "none" ? "text-destructive-text" : "text-foreground"}
          >
            {mfaLabel[row.original.mfa]}
          </span>
        ),
      },
      {
        accessorKey: "lastActive",
        header: "Last active",
        cell: ({ row }) => (
          <TimeSince
            value={row.original.lastActive}
            locale="en-IN"
            timeZone="Asia/Kolkata"
            className="text-muted-foreground"
          />
        ),
      },
    ],
    [selectedId],
  );

  const passkeyShare = Math.round(
    (users.filter((user) => user.mfa === "passkey").length / users.length) * 100,
  );

  return (
    <ConsoleFrame
      product="Qeet ID"
      tenant="Acme India Pvt Ltd"
      crumbs={["Acme India", "Directory", "Users"]}
      nav={[
        { label: "Overview", items: [{ label: "Dashboard", icon: LayoutDashboardIcon }] },
        {
          label: "Directory",
          items: [
            { label: "Users", icon: UsersIcon, active: true, badge: "1,842" },
            { label: "Groups", icon: UserCheckIcon },
            { label: "Roles", icon: ShieldCheckIcon },
          ],
        },
        {
          label: "Security",
          items: [
            { label: "Passkeys", icon: FingerprintIcon },
            { label: "Audit log", icon: ScrollTextIcon },
          ],
        },
        {
          label: "Developers",
          items: [
            { label: "Applications", icon: AppWindowIcon },
            { label: "API keys", icon: KeyRoundIcon },
            { label: "Webhooks", icon: WebhookIcon },
          ],
        },
      ]}
    >
      <PageHeader
        title="Users"
        description="Everyone who can sign in to Acme India through Qeet ID. Provisioned by SCIM from Okta every 15 minutes."
        actions={
          <>
            <Button variant="outline">
              <DownloadIcon data-icon="inline-start" aria-hidden />
              Export
            </Button>
            <Button
              onClick={() =>
                toast.success("Invitation sent", {
                  description: "meera.krishnan@acme.in can join until 13 Oct.",
                })
              }
            >
              <UserPlusIcon data-icon="inline-start" aria-hidden />
              Invite member
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Members" value="1,842" delta="+38" trend="up" hint="this month" />
        <Stat label="Pending invites" value="24" hint="7 expire this week" />
        <Stat
          label="Passkey coverage"
          value={`${passkeyShare}%`}
          delta="+6 pts"
          trend="up"
          hint="target 90% by Q4"
        />
        <Stat label="Suspended" value="3" delta="+1" trend="down" hint="last 7 days" />
      </div>
      <FilterBar fields={fields} value={filters} onValueChange={setFilters} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <DataTable
          columns={columns}
          data={data}
          getRowId={(user) => user.id}
          getRowLabel={(row) => row.original.name}
          caption="Acme India users"
          enableRowSelection
          enableDensity
          facetedFilters={[
            { columnId: "role", title: "Role" },
            { columnId: "status", title: "Status" },
          ]}
          bulkActions={(rows) => (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast(`Reset MFA for ${rows.length} users`)}
              >
                Reset MFA
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => toast.warning(`${rows.length} users suspended`)}
              >
                Suspend
              </Button>
            </>
          )}
          pageSize={8}
        />
        {selected && (
          <Card size="sm" className="self-start">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar size="lg">
                  <AvatarFallback>{selected.initials}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <CardTitle className="truncate">{selected.name}</CardTitle>
                  <CardDescription className="truncate">{selected.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-1.5">
                <StatusPill status={selected.status} />
                <Badge variant="outline">{selected.department}</Badge>
                {selected.mfa === "passkey" && <Badge variant="success">Passkey</Badge>}
              </div>
              <DescriptionList className="gap-y-2 text-sm sm:grid-cols-[6.5rem_1fr]">
                <DescriptionTerm>User ID</DescriptionTerm>
                <DescriptionDetails className="font-mono text-xs">{selected.id}</DescriptionDetails>
                <DescriptionTerm>Location</DescriptionTerm>
                <DescriptionDetails>{selected.location}</DescriptionDetails>
                <DescriptionTerm>MFA</DescriptionTerm>
                <DescriptionDetails>{mfaLabel[selected.mfa]}</DescriptionDetails>
                <DescriptionTerm>Member since</DescriptionTerm>
                <DescriptionDetails>
                  {dateFormat.format(new Date(selected.createdAt))}
                </DescriptionDetails>
              </DescriptionList>
              <Separator />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pattern-role">Role</Label>
                <Select key={selected.id} defaultValue={selected.role}>
                  <SelectTrigger id="pattern-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Owner", "Admin", "Developer", "Billing", "Auditor", "Member"].map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="pattern-passkey" className="flex-col items-start gap-1">
                  Require a passkey
                  <span className="text-xs font-normal text-muted-foreground">
                    Blocks password-only sign-in.
                  </span>
                </Label>
                <Switch
                  id="pattern-passkey"
                  key={`${selected.id}-passkey`}
                  defaultChecked={selected.mfa === "passkey"}
                />
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                Reset MFA
              </Button>
              <Button variant="destructive" size="sm" className="flex-1">
                Suspend
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </ConsoleFrame>
  );
}
