import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  NativeSelect,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@qeetrix/ui";
import { BellIcon, MailIcon, MessageCircleIcon, MessageSquareTextIcon } from "lucide-react";
import { type UserRole, users } from "../data/qeet";
import { changedProps, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const roles: readonly UserRole[] = ["Owner", "Admin", "Developer", "Billing", "Auditor", "Member"];

const indianStates = [
  { code: "KA", name: "Karnataka" },
  { code: "MH", name: "Maharashtra" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TG", name: "Telangana" },
  { code: "DL", name: "Delhi" },
  { code: "GJ", name: "Gujarat" },
] as const;

const nativeSelectControls = {
  defaultValue: select(["", "KA", "MH", "TN", "TG", "DL", "GJ"] as const, "KA", "Default value"),
  disabled: bool(false),
  required: bool(false),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

const selectControls = {
  size: select(["default", "sm"] as const, "default"),
  placeholder: text("Choose a role", "Placeholder"),
  defaultValue: select(["", ...roles] as const, "", "Default value"),
  alignItemWithTrigger: bool(true, "alignItemWithTrigger"),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

const roleItems = roles.map((role) => (
  <SelectItem key={role} value={role}>
    {role}
  </SelectItem>
));

const assignees = users.filter((user) => user.status === "active").slice(0, 5);

export const examples: FamilyExamples = {
  "native-select": {
    minHeight: 260,
    demos: [
      {
        name: "Default",
        description: "The browser's own picker: best on mobile and for long, simple lists.",
        render: () => (
          <Field className="w-64">
            <FieldLabel>Place of supply</FieldLabel>
            <FieldControl
              render={
                <NativeSelect defaultValue="KA">
                  {indianStates.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </NativeSelect>
              }
            />
            <FieldDescription>Decides CGST + SGST or IGST on the invoice.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Groups",
        render: () => (
          <Field className="w-64">
            <FieldLabel>Data region</FieldLabel>
            <FieldControl
              render={
                <NativeSelect defaultValue="ap-south-1">
                  <optgroup label="India">
                    <option value="ap-south-1">Mumbai (ap-south-1)</option>
                    <option value="ap-south-2">Hyderabad (ap-south-2)</option>
                  </optgroup>
                  <optgroup label="Europe">
                    <option value="eu-central-1">Frankfurt (eu-central-1)</option>
                  </optgroup>
                </NativeSelect>
              }
            />
          </Field>
        ),
      },
      {
        name: "Required placeholder",
        render: () => (
          <Field className="w-64">
            <FieldLabel>Payment terms</FieldLabel>
            <FieldControl
              render={
                <NativeSelect required defaultValue="">
                  <option value="" disabled>
                    Select payment terms
                  </option>
                  <option value="receipt">Due on receipt</option>
                  <option value="net15">Net 15</option>
                  <option value="net30">Net 30</option>
                </NativeSelect>
              }
            />
          </Field>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-64">
            <FieldLabel>GST rate</FieldLabel>
            <FieldControl
              render={
                <NativeSelect defaultValue="0">
                  <option value="0">0% (exempt)</option>
                  <option value="5">5%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </NativeSelect>
              }
            />
            <FieldError>SAC 998314 (IT services) is taxed at 18%.</FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-64" data-disabled="true">
            <FieldLabel>Billing currency</FieldLabel>
            <FieldControl
              render={
                <NativeSelect disabled defaultValue="INR">
                  <option value="INR">Indian rupee (₹)</option>
                  <option value="USD">US dollar ($)</option>
                </NativeSelect>
              }
            />
            <FieldDescription>Locked after the first invoice is issued.</FieldDescription>
          </Field>
        ),
      },
    ],
    playground: definePlayground({
      controls: nativeSelectControls,
      render: (v) => (
        <div className="w-64">
          <NativeSelect
            key={v.defaultValue}
            aria-label="Place of supply"
            defaultValue={v.defaultValue}
            disabled={v.disabled}
            required={v.required}
            aria-invalid={v.invalid || undefined}
          >
            <option value="" disabled>
              Select a state
            </option>
            {indianStates.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      ),
      code: (v) =>
        jsx(
          "NativeSelect",
          {
            "aria-label": "Place of supply",
            defaultValue: v.defaultValue,
            ...changedProps(v, nativeSelectControls, ["disabled", "required"]),
            "aria-invalid": v.invalid,
          },
          [
            '<option value="" disabled>Select a state</option>',
            ...indianStates.map((state) => `<option value="${state.code}">${state.name}</option>`),
          ],
        ),
    }),
  },

  select: {
    minHeight: 300,
    demos: [
      {
        name: "Default",
        description: "SelectValue shows the placeholder until a role is picked.",
        render: () => (
          <Field className="w-64">
            <FieldLabel>Role</FieldLabel>
            <Select name="role">
              <FieldControl
                render={
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                }
              />
              <SelectContent>{roleItems}</SelectContent>
            </Select>
            <FieldDescription>Owners can delete the tenant; assign sparingly.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Groups",
        render: () => (
          <Field className="w-64">
            <FieldLabel>Data region</FieldLabel>
            <Select name="region" defaultValue="ap-south-1">
              <FieldControl
                render={
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                }
              />
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>India</SelectLabel>
                  <SelectItem value="ap-south-1">Mumbai (ap-south-1)</SelectItem>
                  <SelectItem value="ap-south-2">Hyderabad (ap-south-2)</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Europe</SelectLabel>
                  <SelectItem value="eu-central-1">Frankfurt (eu-central-1)</SelectItem>
                  <SelectItem value="eu-west-2" disabled>
                    London (coming 2027)
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        ),
      },
      {
        name: "With icons",
        render: () => (
          <Field className="w-64">
            <FieldLabel>Fallback channel</FieldLabel>
            <Select name="channel" defaultValue="whatsapp">
              <FieldControl
                render={
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                }
              />
              <SelectContent>
                <SelectItem value="email">
                  <MailIcon aria-hidden />
                  Email
                </SelectItem>
                <SelectItem value="sms">
                  <MessageSquareTextIcon aria-hidden />
                  SMS
                </SelectItem>
                <SelectItem value="whatsapp">
                  <MessageCircleIcon aria-hidden />
                  WhatsApp
                </SelectItem>
                <SelectItem value="push">
                  <BellIcon aria-hidden />
                  Push notification
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
        ),
      },
      {
        name: "Small",
        description: '`size="sm"` for toolbars and table filters.',
        render: () => (
          <Select defaultValue="24h">
            <SelectTrigger size="sm" aria-label="Time range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-64">
            <FieldLabel>Assignee</FieldLabel>
            <Select name="assignee">
              <FieldControl
                render={
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a reviewer" />
                  </SelectTrigger>
                }
              />
              <SelectContent>
                {assignees.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>Pick someone to review this access request.</FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled and read-only",
        render: () => (
          <div className="flex w-64 flex-col gap-4">
            <Field data-disabled="true">
              <FieldLabel>Plan</FieldLabel>
              <Select defaultValue="enterprise" disabled>
                <FieldControl
                  render={
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  }
                />
                <SelectContent>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Identity provider</FieldLabel>
              <Select defaultValue="okta" readOnly>
                <FieldControl
                  render={
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  }
                />
                <SelectContent>
                  <SelectItem value="okta">Okta</SelectItem>
                  <SelectItem value="entra">Microsoft Entra ID</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>Set by SCIM; change it in the IdP.</FieldDescription>
            </Field>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: selectControls,
      render: (v) => (
        <Select
          key={v.defaultValue}
          defaultValue={v.defaultValue || null}
          disabled={v.disabled}
          readOnly={v.readOnly}
        >
          <SelectTrigger
            size={v.size}
            aria-label="Role"
            aria-invalid={v.invalid || undefined}
            className="w-56"
          >
            <SelectValue placeholder={v.placeholder} />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={v.alignItemWithTrigger}>{roleItems}</SelectContent>
        </Select>
      ),
      code: (v) =>
        jsx(
          "Select",
          {
            defaultValue: v.defaultValue || undefined,
            ...changedProps(v, selectControls, ["disabled", "readOnly"]),
          },
          [
            jsx(
              "SelectTrigger",
              {
                ...changedProps(v, selectControls, ["size"]),
                "aria-label": "Role",
                "aria-invalid": v.invalid,
              },
              jsx("SelectValue", { placeholder: v.placeholder || undefined }),
            ),
            jsx(
              "SelectContent",
              changedProps(v, selectControls, ["alignItemWithTrigger"]),
              roles.map((role) => jsx("SelectItem", { value: role }, role)),
            ),
          ],
        ),
    }),
  },
};
