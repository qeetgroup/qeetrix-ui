/**
 * Sample data for examples and patterns: Qeet ID tenants, users and sessions, Qeet Pay invoices
 * (INR, GST), Qeet Logs events and audit trails. No randomness: every timestamp is an offset
 * from `NOW`, so the same records render on every load.
 *
 * Components get data in the shape *they* define; family files map these records into it.
 */

/**
 * The playground's notion of "now": every relative time is computed from here. It is the real
 * clock (to the minute, read once per page load) rather than a fixed date, because components
 * such as TimeSince and AuditEvent measure against the real clock themselves — a fixed `NOW`
 * would make "4 minutes ago" render as "in 9 hours" on another day.
 */
export const NOW = new Date(Math.floor(Date.now() / 60_000) * 60_000);

/** `NOW` shifted by minutes (negative is the past), as an ISO string. */
export function minutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

export function daysAgo(days: number): string {
  return minutesAgo(days * 24 * 60);
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** ₹1,23,456.00 — Indian digit grouping. */
export function formatInr(amount: number): string {
  return inr.format(amount);
}
/** ₹1.2L / ₹3.4Cr. */
export function formatInrCompact(amount: number): string {
  return inrCompact.format(amount);
}

export const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });
export const dateTimeFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

/* ── Qeet ID ──────────────────────────────────────────────────────────────────────────────── */

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: "Starter" | "Growth" | "Enterprise";
  region: "ap-south-1" | "ap-south-2" | "eu-central-1";
  users: number;
  status: "active" | "suspended" | "pending";
}

export const tenants: readonly Tenant[] = [
  {
    id: "tnt_acme",
    name: "Acme India Pvt Ltd",
    domain: "acme.in",
    plan: "Enterprise",
    region: "ap-south-1",
    users: 1842,
    status: "active",
  },
  {
    id: "tnt_zenvia",
    name: "Zenvia Health",
    domain: "zenviahealth.com",
    plan: "Growth",
    region: "ap-south-1",
    users: 416,
    status: "active",
  },
  {
    id: "tnt_kanpur",
    name: "Kanpur Logistics",
    domain: "kanpurlogistics.in",
    plan: "Starter",
    region: "ap-south-2",
    users: 58,
    status: "pending",
  },
  {
    id: "tnt_bharat",
    name: "Bharat FinServ",
    domain: "bharatfinserv.co.in",
    plan: "Enterprise",
    region: "ap-south-1",
    users: 3290,
    status: "active",
  },
  {
    id: "tnt_northwind",
    name: "Northwind Retail",
    domain: "northwind.eu",
    plan: "Growth",
    region: "eu-central-1",
    users: 724,
    status: "suspended",
  },
];

export type UserRole = "Owner" | "Admin" | "Developer" | "Billing" | "Auditor" | "Member";
export type UserStatus = "active" | "suspended" | "pending" | "inactive";
export type MfaMethod = "passkey" | "totp" | "sms" | "none";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  mfa: MfaMethod;
  department: string;
  location: string;
  tenantId: string;
  lastActive: string;
  createdAt: string;
  /** Two-letter initials for avatars. */
  initials: string;
}

function user(
  id: string,
  name: string,
  role: UserRole,
  status: UserStatus,
  mfa: MfaMethod,
  department: string,
  location: string,
  lastActiveMinutes: number,
  createdDays: number,
): User {
  const [first = "", last = ""] = name.split(" ");
  return {
    id,
    name,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@acme.in`,
    role,
    status,
    mfa,
    department,
    location,
    tenantId: "tnt_acme",
    lastActive: minutesAgo(lastActiveMinutes),
    createdAt: daysAgo(createdDays),
    initials: `${first[0] ?? ""}${last[0] ?? ""}`,
  };
}

export const users: readonly User[] = [
  user("usr_01", "Ananya Iyer", "Owner", "active", "passkey", "Executive", "Bengaluru", 4, 812),
  user("usr_02", "Rohan Mehta", "Admin", "active", "passkey", "Platform", "Mumbai", 12, 640),
  user("usr_03", "Priya Nair", "Developer", "active", "totp", "Platform", "Kochi", 38, 402),
  user("usr_04", "Vikram Singh", "Billing", "active", "passkey", "Finance", "New Delhi", 95, 377),
  user(
    "usr_05",
    "Meera Krishnan",
    "Auditor",
    "pending",
    "none",
    "Risk & Compliance",
    "Chennai",
    2880,
    3,
  ),
  user("usr_06", "Arjun Reddy", "Developer", "active", "passkey", "Payments", "Hyderabad", 7, 288),
  user("usr_07", "Kavya Sharma", "Member", "suspended", "sms", "Sales", "Pune", 21600, 520),
  user("usr_08", "Sanjay Gupta", "Admin", "active", "totp", "IT", "Gurugram", 240, 731),
  user(
    "usr_09",
    "Neha Joshi",
    "Member",
    "active",
    "passkey",
    "Customer Success",
    "Ahmedabad",
    55,
    199,
  ),
  user("usr_10", "Farhan Qureshi", "Developer", "inactive", "none", "Data", "Lucknow", 64800, 455),
  user(
    "usr_11",
    "Divya Menon",
    "Billing",
    "active",
    "passkey",
    "Finance",
    "Thiruvananthapuram",
    160,
    133,
  ),
  user("usr_12", "Aditya Rao", "Member", "pending", "none", "Marketing", "Mysuru", 4320, 2),
];

export interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  ip: string;
  lastSeen: string;
  createdAt: string;
  method: "Passkey" | "Password + TOTP" | "SSO (Okta)" | "Magic link";
  current: boolean;
  risk: "low" | "medium" | "high";
}

export const sessions: readonly Session[] = [
  {
    id: "ses_7f3a",
    device: "MacBook Pro 14″",
    browser: "Chrome 151",
    os: "macOS 26",
    location: "Bengaluru, IN",
    ip: "49.207.12.88",
    lastSeen: minutesAgo(0),
    createdAt: daysAgo(2),
    method: "Passkey",
    current: true,
    risk: "low",
  },
  {
    id: "ses_1c9d",
    device: "iPhone 17",
    browser: "Safari",
    os: "iOS 26",
    location: "Bengaluru, IN",
    ip: "49.207.12.91",
    lastSeen: minutesAgo(42),
    createdAt: daysAgo(9),
    method: "Passkey",
    current: false,
    risk: "low",
  },
  {
    id: "ses_88be",
    device: "ThinkPad X1",
    browser: "Firefox 140",
    os: "Windows 11",
    location: "Mumbai, IN",
    ip: "103.21.58.4",
    lastSeen: minutesAgo(1440),
    createdAt: daysAgo(14),
    method: "SSO (Okta)",
    current: false,
    risk: "medium",
  },
  {
    id: "ses_04aa",
    device: "Unknown Linux device",
    browser: "curl/8.9",
    os: "Linux",
    location: "Frankfurt, DE",
    ip: "185.220.101.7",
    lastSeen: minutesAgo(190),
    createdAt: minutesAgo(200),
    method: "Password + TOTP",
    current: false,
    risk: "high",
  },
];

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  secret: string;
  scopes: string[];
  createdBy: string;
  lastUsed: string | null;
  expires: string;
}

export const apiKeys: readonly ApiKey[] = [
  {
    id: "key_live_01",
    name: "Checkout service (prod)",
    prefix: "qk_live_7Hc2",
    secret: "qk_live_7Hc2Yt9mVbQ4rNw8LpZ3sXe1KdJ6uFa0",
    scopes: ["payments:write", "invoices:read"],
    createdBy: "Rohan Mehta",
    lastUsed: minutesAgo(3),
    expires: daysAgo(-180),
  },
  {
    id: "key_test_02",
    name: "Staging CI",
    prefix: "qk_test_Ab91",
    secret: "qk_test_Ab91Lm3Nq8Rt5Vw2Xy7Zc4De6Fg0Hj1K",
    scopes: ["users:read"],
    createdBy: "Priya Nair",
    lastUsed: daysAgo(6),
    expires: daysAgo(-30),
  },
];

/* ── Qeet Pay ─────────────────────────────────────────────────────────────────────────────── */

export type InvoiceStatus = "paid" | "sent" | "overdue" | "draft" | "void";

export interface Invoice {
  number: string;
  customer: string;
  gstin: string;
  /** Place of supply: intra-state invoices split CGST + SGST, inter-state charge IGST. */
  placeOfSupply: string;
  intraState: boolean;
  issued: string;
  due: string;
  /** Taxable value in rupees. */
  subtotal: number;
  gstRate: 5 | 12 | 18 | 28;
  status: InvoiceStatus;
  method: "UPI" | "Card" | "Net banking" | "NACH" | null;
}

export interface InvoiceTotals {
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  total: number;
}

/** GST split for an invoice: CGST + SGST within a state, IGST across states. */
export function invoiceTotals(invoice: Invoice): InvoiceTotals {
  const tax = Math.round(invoice.subtotal * invoice.gstRate) / 100;
  const half = Math.round(tax * 50) / 100;
  return invoice.intraState
    ? { cgst: half, sgst: tax - half, igst: 0, tax, total: invoice.subtotal + tax }
    : { cgst: 0, sgst: 0, igst: tax, tax, total: invoice.subtotal + tax };
}

export const invoices: readonly Invoice[] = [
  {
    number: "QP-INV-2026-00412",
    customer: "Acme India Pvt Ltd",
    gstin: "29AAACA1234F1Z5",
    placeOfSupply: "Karnataka",
    intraState: true,
    issued: daysAgo(3),
    due: daysAgo(-27),
    subtotal: 248000,
    gstRate: 18,
    status: "sent",
    method: null,
  },
  {
    number: "QP-INV-2026-00411",
    customer: "Bharat FinServ",
    gstin: "27AABCB5678K1Z2",
    placeOfSupply: "Maharashtra",
    intraState: false,
    issued: daysAgo(9),
    due: daysAgo(-21),
    subtotal: 1175000,
    gstRate: 18,
    status: "paid",
    method: "NACH",
  },
  {
    number: "QP-INV-2026-00410",
    customer: "Zenvia Health",
    gstin: "33AADCZ9012M1Z8",
    placeOfSupply: "Tamil Nadu",
    intraState: false,
    issued: daysAgo(14),
    due: daysAgo(-1),
    subtotal: 86500,
    gstRate: 12,
    status: "paid",
    method: "UPI",
  },
  {
    number: "QP-INV-2026-00409",
    customer: "Kanpur Logistics",
    gstin: "09AAFCK3456P1Z1",
    placeOfSupply: "Uttar Pradesh",
    intraState: false,
    issued: daysAgo(41),
    due: daysAgo(11),
    subtotal: 42300,
    gstRate: 18,
    status: "overdue",
    method: null,
  },
  {
    number: "QP-INV-2026-00408",
    customer: "Northwind Retail",
    gstin: "29AAGCN7788Q1Z4",
    placeOfSupply: "Karnataka",
    intraState: true,
    issued: daysAgo(22),
    due: daysAgo(8),
    subtotal: 315750,
    gstRate: 18,
    status: "overdue",
    method: null,
  },
  {
    number: "QP-INV-2026-00407",
    customer: "Coastal Spices Exports",
    gstin: "32AAHCC2468R1Z9",
    placeOfSupply: "Kerala",
    intraState: false,
    issued: daysAgo(30),
    due: daysAgo(0),
    subtotal: 58900,
    gstRate: 5,
    status: "paid",
    method: "Card",
  },
  {
    number: "QP-INV-2026-00406",
    customer: "Indus Motors",
    gstin: "24AAICI1357S1Z6",
    placeOfSupply: "Gujarat",
    intraState: false,
    issued: daysAgo(33),
    due: daysAgo(3),
    subtotal: 702000,
    gstRate: 28,
    status: "paid",
    method: "Net banking",
  },
  {
    number: "QP-INV-2026-00405",
    customer: "Acme India Pvt Ltd",
    gstin: "29AAACA1234F1Z5",
    placeOfSupply: "Karnataka",
    intraState: true,
    issued: daysAgo(1),
    due: daysAgo(-29),
    subtotal: 19999,
    gstRate: 18,
    status: "draft",
    method: null,
  },
  {
    number: "QP-INV-2026-00404",
    customer: "Lotus Education Trust",
    gstin: "36AAJCL8642T1Z3",
    placeOfSupply: "Telangana",
    intraState: false,
    issued: daysAgo(45),
    due: daysAgo(15),
    subtotal: 12500,
    gstRate: 18,
    status: "void",
    method: null,
  },
];

/** Monthly collections, in rupees, for the last twelve months (Nov 2025 → Oct 2026). */
export const monthlyRevenue: readonly {
  month: string;
  collected: number;
  invoiced: number;
  refunds: number;
}[] = [
  { month: "Nov", collected: 3840000, invoiced: 4120000, refunds: 62000 },
  { month: "Dec", collected: 4410000, invoiced: 4650000, refunds: 48000 },
  { month: "Jan", collected: 3990000, invoiced: 4380000, refunds: 91000 },
  { month: "Feb", collected: 4220000, invoiced: 4500000, refunds: 37000 },
  { month: "Mar", collected: 5630000, invoiced: 5900000, refunds: 112000 },
  { month: "Apr", collected: 4870000, invoiced: 5210000, refunds: 54000 },
  { month: "May", collected: 5120000, invoiced: 5460000, refunds: 66000 },
  { month: "Jun", collected: 5480000, invoiced: 5720000, refunds: 41000 },
  { month: "Jul", collected: 5950000, invoiced: 6230000, refunds: 79000 },
  { month: "Aug", collected: 6210000, invoiced: 6480000, refunds: 58000 },
  { month: "Sep", collected: 6740000, invoiced: 7050000, refunds: 83000 },
  { month: "Oct", collected: 2160000, invoiced: 2950000, refunds: 12000 },
];

export const paymentMethods: readonly {
  method: string;
  key: string;
  share: number;
  volume: number;
}[] = [
  { method: "UPI", key: "upi", share: 46, volume: 2894000 },
  { method: "Cards", key: "cards", share: 22, volume: 1384000 },
  { method: "Net banking", key: "netbanking", share: 17, volume: 1069000 },
  { method: "NACH mandates", key: "nach", share: 15, volume: 943000 },
];

/* ── Qeet Logs ────────────────────────────────────────────────────────────────────────────── */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEvent {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  traceId: string;
  attributes: Record<string, string | number | boolean>;
}

export const logEvents: readonly LogEvent[] = [
  {
    id: "log_01",
    timestamp: minutesAgo(1),
    level: "info",
    service: "qeet-id-server",
    message: "passkey assertion verified",
    traceId: "4bf92f3577b34da6",
    attributes: {
      "user.id": "usr_02",
      "tenant.id": "tnt_acme",
      "webauthn.rp_id": "id.qeet.in",
      latency_ms: 38,
    },
  },
  {
    id: "log_02",
    timestamp: minutesAgo(2),
    level: "warn",
    service: "qeet-pay-api",
    message: "UPI collect request timed out; retrying with exponential backoff",
    traceId: "a3ce929d0e0e4736",
    attributes: { psp: "npci-sandbox", attempt: 2, latency_ms: 5012 },
  },
  {
    id: "log_03",
    timestamp: minutesAgo(4),
    level: "error",
    service: "notify-worker",
    message: "SMS provider rejected template: DLT template id not registered",
    traceId: "00f067aa0ba902b7",
    attributes: { channel: "sms", template: "otp_login_v3", "provider.code": "DLT-4041" },
  },
  {
    id: "log_04",
    timestamp: minutesAgo(6),
    level: "info",
    service: "qeet-pay-api",
    message: "invoice QP-INV-2026-00411 marked paid via NACH",
    traceId: "5b8aa5a2d2c872e8",
    attributes: { "invoice.total_inr": 1386500, "mandate.id": "NACH-88213" },
  },
  {
    id: "log_05",
    timestamp: minutesAgo(9),
    level: "debug",
    service: "qeet-logs-ingest",
    message: "batch flushed to cold storage",
    traceId: "c2ec9f0e31d0a2b1",
    attributes: { records: 48211, bytes: 18874368, bucket: "logs-ap-south-1" },
  },
  {
    id: "log_06",
    timestamp: minutesAgo(12),
    level: "error",
    service: "qeet-id-server",
    message: "refresh token reuse detected; session family revoked",
    traceId: "9d5b1f7a2c4e6a80",
    attributes: { "user.id": "usr_07", "session.id": "ses_04aa", risk: "high" },
  },
  {
    id: "log_07",
    timestamp: minutesAgo(15),
    level: "info",
    service: "qeet-id-server",
    message: "SCIM provisioning: 3 users created from Okta",
    traceId: "7e1d4c2b9a8f6e5d",
    attributes: { idp: "okta", created: 3, updated: 11 },
  },
];

/* ── Audit ────────────────────────────────────────────────────────────────────────────────── */

export interface AuditRecord {
  id: string;
  timestamp: string;
  actor: { name: string; email: string; initials: string };
  action: string;
  summary: string;
  target: string;
  ip: string;
  location: string;
  outcome: "success" | "failure";
  changes?: { field: string; from: string; to: string }[];
}

export const auditRecords: readonly AuditRecord[] = [
  {
    id: "aud_9001",
    timestamp: minutesAgo(5),
    actor: { name: "Rohan Mehta", email: "rohan.mehta@acme.in", initials: "RM" },
    action: "user.role.updated",
    summary: "changed Priya Nair's role",
    target: "usr_03 · Priya Nair",
    ip: "49.207.12.88",
    location: "Bengaluru, IN",
    outcome: "success",
    changes: [{ field: "role", from: "Member", to: "Developer" }],
  },
  {
    id: "aud_9002",
    timestamp: minutesAgo(31),
    actor: { name: "Sanjay Gupta", email: "sanjay.gupta@acme.in", initials: "SG" },
    action: "session.revoked",
    summary: "revoked a high-risk session",
    target: "ses_04aa · Frankfurt, DE",
    ip: "103.21.58.4",
    location: "Gurugram, IN",
    outcome: "success",
  },
  {
    id: "aud_9003",
    timestamp: minutesAgo(64),
    actor: { name: "Priya Nair", email: "priya.nair@acme.in", initials: "PN" },
    action: "api_key.created",
    summary: "created API key “Staging CI”",
    target: "key_test_02",
    ip: "117.193.4.20",
    location: "Kochi, IN",
    outcome: "success",
    changes: [{ field: "scopes", from: "—", to: "users:read" }],
  },
  {
    id: "aud_9004",
    timestamp: minutesAgo(180),
    actor: { name: "Unknown", email: "kavya.sharma@acme.in", initials: "KS" },
    action: "auth.login.failed",
    summary: "failed sign-in: passkey not recognised",
    target: "usr_07 · Kavya Sharma",
    ip: "185.220.101.7",
    location: "Frankfurt, DE",
    outcome: "failure",
  },
  {
    id: "aud_9005",
    timestamp: minutesAgo(1440),
    actor: { name: "Ananya Iyer", email: "ananya.iyer@acme.in", initials: "AI" },
    action: "policy.updated",
    summary: "required passkeys for all admins",
    target: "policy · admin-mfa",
    ip: "49.207.12.88",
    location: "Bengaluru, IN",
    outcome: "success",
    changes: [{ field: "mfa.admins", from: "totp_or_passkey", to: "passkey" }],
  },
];

/* ── Payloads ─────────────────────────────────────────────────────────────────────────────── */

/** Decoded ID token claims for a Qeet ID sign-in. */
export const idTokenClaims = {
  iss: "https://id.qeet.in/t/acme",
  sub: "usr_02",
  aud: "qeet-pay-console",
  exp: 1791271800,
  iat: 1791268200,
  auth_time: 1791268190,
  amr: ["hwk", "user"],
  acr: "urn:qeet:acr:passkey",
  email: "rohan.mehta@acme.in",
  email_verified: true,
  name: "Rohan Mehta",
  org: { id: "tnt_acme", name: "Acme India Pvt Ltd", plan: "Enterprise" },
  roles: ["admin", "billing:read"],
  sid: "ses_7f3a",
} as const;

/** A Qeet Pay webhook body. */
export const paymentWebhook = {
  id: "evt_01J9ZB6X4QH2",
  type: "payment.captured",
  created: "2026-10-06T10:24:51+05:30",
  livemode: true,
  data: {
    payment: {
      id: "pay_8Kq2Nf",
      amount: 292640,
      currency: "INR",
      method: "upi",
      vpa: "accounts@acmeindia",
      invoice: "QP-INV-2026-00412",
      gst: { cgst: 22320, sgst: 22320, igst: 0 },
      fees: { platform: 5853, gst_on_fees: 1054 },
      settled: false,
    },
  },
} as const;

export const policyBefore = `{
  "policy": "admin-mfa",
  "version": 6,
  "applies_to": ["role:admin", "role:owner"],
  "mfa": {
    "required": true,
    "methods": ["totp", "passkey"],
    "remember_device_days": 30
  },
  "session": {
    "idle_timeout_minutes": 60,
    "max_age_hours": 24
  }
}`;

export const policyAfter = `{
  "policy": "admin-mfa",
  "version": 7,
  "applies_to": ["role:admin", "role:owner", "role:billing"],
  "mfa": {
    "required": true,
    "methods": ["passkey"],
    "remember_device_days": 7
  },
  "session": {
    "idle_timeout_minutes": 30,
    "max_age_hours": 12
  }
}`;

export const curlExample = `curl https://api.qeet.in/pay/v1/invoices \\
  -H "Authorization: Bearer $QEET_API_KEY" \\
  -H "Idempotency-Key: 6f1c2f3e-invoice-00413" \\
  -d customer=cus_acme \\
  -d currency=INR \\
  -d "line_items[0][hsn]=998314" \\
  -d "line_items[0][amount]=248000"`;
