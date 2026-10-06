/** Product patterns: full screens composed from the library, each rendered in its own frame. */
export interface PatternEntry {
  readonly id: string;
  readonly title: string;
  readonly product: string;
  readonly description: string;
  /** Viewport height the pattern is designed for. */
  readonly height: number;
}

export const patterns: readonly PatternEntry[] = [
  {
    id: "qeet-id-users",
    title: "Qeet ID · Users",
    product: "Qeet ID admin console",
    description:
      "Directory of a tenant's users: filters, a selectable data table with bulk actions, and a detail side panel.",
    height: 860,
  },
  {
    id: "qeet-pay-invoices",
    title: "Qeet Pay · Invoices",
    product: "Qeet Pay dashboard",
    description:
      "Collections KPIs, a monthly collections chart, payment-method split and an invoices table with CGST/SGST/IGST.",
    height: 980,
  },
  {
    id: "security",
    title: "Security & sessions",
    product: "Qeet ID account security",
    description:
      "Passkeys and sessions as SecurityItems, a quarterly AccessReview, and the audit trail as AuditEvents.",
    height: 1040,
  },
  {
    id: "sign-in",
    title: "Hosted sign-in",
    product: "Qeet ID hosted flow",
    description:
      "The hosted sign-in flow: passkey first, email + password fallback and an OTP step.",
    height: 780,
  },
];
