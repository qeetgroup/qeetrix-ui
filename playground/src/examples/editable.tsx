import { Editable, EditableInput, EditablePreview, toast } from "@qeetrix/ui";
import { type ReactNode, useState } from "react";
import { apiKeys, tenants } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, text } from "../registry/types";

const [checkoutKey] = apiKeys;
const [acme] = tenants;

/** One settings row: a term on the left, the inline-editable value on the right. */
function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{term}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function TenantNameDemo() {
  const [name, setName] = useState(acme?.name ?? "Acme India Pvt Ltd");
  return (
    <div className="flex w-80 flex-col gap-1">
      <Row term="Display name">
        <Editable
          value={name}
          onValueChange={(next) => {
            const trimmed = next.trim();
            if (!trimmed || trimmed === name) return;
            setName(trimmed);
            toast.success("Tenant renamed", { description: `Now shown as “${trimmed}”.` });
          }}
          onCancel={() => toast("Rename cancelled")}
        >
          <EditablePreview />
          <EditableInput aria-label="Tenant display name" />
        </Editable>
      </Row>
      <p className="ps-30 text-caption text-muted-foreground">
        Enter saves, Escape cancels. Shown on invoices and the sign-in page.
      </p>
    </div>
  );
}

const controls = {
  defaultValue: text(checkoutKey?.name ?? "Checkout service (prod)", "Default value"),
  placeholder: text("Click to edit", "Placeholder"),
  inputLabel: text("API key name", "Input aria-label"),
  showIcon: bool(true, "Pencil icon (EditablePreview showIcon)"),
  disabled: bool(false),
};

export const examples: FamilyExamples = {
  editable: {
    demos: [
      {
        name: "Default",
        description: "Click the value to edit in place; Enter or blur commits.",
        render: () => (
          <div className="flex w-80 flex-col gap-1">
            <Row term="Key name">
              <Editable defaultValue={checkoutKey?.name}>
                <EditablePreview />
                <EditableInput aria-label="API key name" />
              </Editable>
            </Row>
            <Row term="Prefix">
              <span className="px-3 font-mono text-sm">{checkoutKey?.prefix}…</span>
            </Row>
          </div>
        ),
      },
      {
        name: "Controlled, with feedback",
        description: "The parent validates and saves the committed value; Escape restores it.",
        render: () => <TenantNameDemo />,
      },
      {
        name: "Empty",
        render: () => (
          <div className="w-80">
            <Row term="Description">
              <Editable placeholder="Add a description for auditors">
                <EditablePreview />
                <EditableInput aria-label="Tenant description" />
              </Editable>
            </Row>
          </div>
        ),
      },
      {
        name: "As a heading, no icon",
        render: () => (
          <Editable defaultValue="Q3 access review · Finance" className="w-80">
            <EditablePreview className="font-heading text-lg font-semibold" showIcon={false} />
            <EditableInput aria-label="Review title" className="text-lg" />
          </Editable>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <div className="flex w-80 flex-col gap-1">
            <Row term="Slug">
              <Editable defaultValue="acme" disabled>
                <EditablePreview className="font-mono" />
                <EditableInput aria-label="Tenant slug" />
              </Editable>
            </Row>
            <p className="ps-30 text-caption text-muted-foreground">
              Slugs can't change after the tenant is created.
            </p>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls,
      render: (v) => (
        <div className="w-72">
          <Editable
            key={v.defaultValue}
            defaultValue={v.defaultValue}
            placeholder={v.placeholder}
            disabled={v.disabled}
          >
            <EditablePreview showIcon={v.showIcon} />
            <EditableInput aria-label={v.inputLabel} />
          </Editable>
        </div>
      ),
      code: (v) =>
        jsx(
          "Editable",
          {
            defaultValue: v.defaultValue || undefined,
            placeholder: v.placeholder === "Click to edit" ? undefined : v.placeholder,
            disabled: v.disabled,
          },
          [
            jsx("EditablePreview", { showIcon: v.showIcon ? undefined : expr("false") }),
            jsx("EditableInput", { "aria-label": v.inputLabel }),
          ],
        ),
    }),
  },
};
