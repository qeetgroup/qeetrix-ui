import { Checkbox, Input, Label, Switch } from "@qeetrix/ui";
import { fragment, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, text } from "../registry/types";

const labelControls = {
  children: text("Billing email", "Label text"),
  required: bool(false, "required"),
  optional: bool(false, "optional"),
  disabled: bool(false, "Disabled (group data-disabled)"),
};

export const examples: FamilyExamples = {
  label: {
    demos: [
      {
        name: "With input",
        description: "`htmlFor` points at the input's id, so clicking the label focuses it.",
        render: () => (
          <div className="flex w-72 flex-col gap-2">
            <Label htmlFor="label-demo-tenant-name">Tenant name</Label>
            <Input id="label-demo-tenant-name" defaultValue="Acme India Pvt Ltd" />
          </div>
        ),
      },
      {
        name: "Wrapping a control",
        description: "A label around a checkbox or switch names it without an id.",
        render: () => (
          <div className="flex flex-col gap-3">
            <Label className="font-normal">
              <Checkbox defaultChecked />
              Email me when a new device signs in
            </Label>
            <Label className="font-normal">
              <Switch />
              Send a weekly security digest
            </Label>
          </div>
        ),
      },
      {
        name: "Required and optional",
        description:
          "`required` adds a visual-only asterisk (the input still needs `required`); `optional` marks the exception.",
        render: () => (
          <div className="flex w-72 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="label-demo-billing-email" required>
                Billing email
              </Label>
              <Input
                id="label-demo-billing-email"
                type="email"
                required
                placeholder="finance@acme.in"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="label-demo-po-number" optional>
                PO number
              </Label>
              <Input id="label-demo-po-number" placeholder="PO-2026-0187" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="label-demo-cin" optional="(वैकल्पिक)">
                CIN
              </Label>
              <Input id="label-demo-cin" placeholder="U72200KA2019PTC123456" />
            </div>
          </div>
        ),
      },
      {
        name: "Disabled",
        description:
          'Inside a `group` with `data-disabled="true"` the label dims and ignores clicks.',
        render: () => (
          <div className="group flex w-72 flex-col gap-2" data-disabled="true">
            <Label htmlFor="label-demo-scim-token">SCIM bearer token</Label>
            <Input id="label-demo-scim-token" disabled defaultValue="Managed by Okta" />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: labelControls,
      render: (v) => (
        <div
          className="group flex w-72 flex-col gap-2"
          data-disabled={v.disabled ? "true" : undefined}
        >
          <Label htmlFor="label-playground-input" required={v.required} optional={v.optional}>
            {v.children}
          </Label>
          <Input
            id="label-playground-input"
            type="email"
            required={v.required}
            disabled={v.disabled}
          />
        </div>
      ),
      code: (v) => {
        const pair = [
          jsx(
            "Label",
            { htmlFor: "billing-email", required: v.required, optional: v.optional },
            v.children,
          ),
          jsx("Input", {
            id: "billing-email",
            type: "email",
            required: v.required,
            disabled: v.disabled,
          }),
        ];
        return v.disabled
          ? jsx("div", { className: "group flex flex-col gap-2", "data-disabled": "true" }, pair)
          : fragment(pair);
      },
    }),
  },
};
