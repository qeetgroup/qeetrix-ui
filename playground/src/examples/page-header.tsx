import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  IconButton,
  PageHeader,
  StatusPill,
} from "@qeetrix/ui";
import { DownloadIcon, MoreHorizontalIcon, PlusIcon, UploadIcon } from "lucide-react";
import { Fragment, type MouseEvent } from "react";
import { dateFormat, formatInr, invoices, invoiceTotals, tenants } from "../data/qeet";
import { expr, fragment, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, text } from "../registry/types";

const acme = tenants[0];
const invoice = invoices[0];
const count = new Intl.NumberFormat("en-IN");

/** A multi-line JSX value for a prop, laid out the way Biome formats one. */
function block(code: string) {
  return expr(`\n${code.replace(/^/gm, "  ")}\n`);
}

/** Breadcrumb links in a preview stay put: the playground routes on the URL hash. */
function stay(event: MouseEvent) {
  event.preventDefault();
}

function ConsoleBreadcrumb({ trail, page }: { trail: readonly string[]; page: string }) {
  return (
    <Breadcrumb>
      <BreadcrumbList className="text-caption">
        {trail.map((crumb) => (
          <Fragment key={crumb}>
            <BreadcrumbItem>
              <BreadcrumbLink
                href={`/console/${crumb.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={stay}
              >
                {crumb}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </Fragment>
        ))}
        <BreadcrumbItem>
          <BreadcrumbPage>{page}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

const headerControls = {
  title: text("Users", "Title"),
  description: text(`${count.format(acme.users)} people in ${acme.name}.`, "Description"),
  breadcrumb: bool(true, "Breadcrumb"),
  metadata: bool(true, "Metadata row"),
  actions: bool(true, "Actions"),
};

export const examples: FamilyExamples = {
  "page-header": {
    layout: "wide",
    minHeight: 760,
    demos: [
      {
        name: "Default",
        description:
          "Breadcrumb eyebrow, title, description and right-aligned actions; actions wrap below the title on narrow screens.",
        render: () => (
          <PageHeader
            breadcrumb={<ConsoleBreadcrumb trail={["Qeet ID", "Directory"]} page="Users" />}
            title="Users"
            description={`${count.format(acme.users)} people in ${acme.name}. Invite people one at a time, or connect Okta to provision them over SCIM.`}
            actions={
              <>
                <Button variant="outline">
                  <UploadIcon data-icon="inline-start" aria-hidden />
                  Import CSV
                </Button>
                <Button>
                  <PlusIcon data-icon="inline-start" aria-hidden />
                  Invite user
                </Button>
              </>
            }
          />
        ),
      },
      {
        name: "With metadata",
        description:
          "`metadata` lays facts about the page's subject — status, dates, amount — out as a wrapping row under the description.",
        render: () => (
          <PageHeader
            breadcrumb={
              <ConsoleBreadcrumb trail={["Qeet Pay", "Invoices"]} page={invoice.number} />
            }
            title={<span className="font-mono">{invoice.number}</span>}
            description={`${invoice.customer} · GSTIN ${invoice.gstin}`}
            metadata={
              <>
                <StatusPill kind="info">Sent</StatusPill>
                <span>Issued {dateFormat.format(new Date(invoice.issued))}</span>
                <span>Due {dateFormat.format(new Date(invoice.due))}</span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatInr(invoiceTotals(invoice).total)}
                </span>
              </>
            }
            actions={
              <>
                <Button variant="outline">
                  <DownloadIcon data-icon="inline-start" aria-hidden />
                  Download PDF
                </Button>
                <Button>Record payment</Button>
                <IconButton icon={MoreHorizontalIcon} variant="ghost" aria-label="More actions" />
              </>
            }
          />
        ),
      },
      {
        name: "In a narrow panel",
        description:
          "The header responds to its own width: in a 360px detail pane the actions wrap beneath the title instead of squeezing it.",
        render: () => (
          <div className="w-[360px] max-w-full rounded-lg border bg-card p-4">
            <PageHeader
              title="Priya Nair"
              description="priya.nair@acme.in · Developer"
              metadata={
                <>
                  <StatusPill kind="success">Active</StatusPill>
                  <span>Passkey · TOTP</span>
                  <span>Kochi</span>
                </>
              }
              actions={
                <>
                  <Button size="sm" variant="outline">
                    Reset MFA
                  </Button>
                  <Button size="sm" variant="destructive">
                    Suspend
                  </Button>
                </>
              }
            />
          </div>
        ),
      },
      {
        name: "Title only",
        render: () => <PageHeader title="Audit log" />,
      },
    ],
    playground: definePlayground({
      controls: headerControls,
      render: (v) => (
        <div className="w-[min(100%,960px)]">
          <PageHeader
            title={v.title}
            description={v.description || undefined}
            breadcrumb={
              v.breadcrumb ? (
                <ConsoleBreadcrumb trail={["Qeet ID", "Directory"]} page={v.title} />
              ) : undefined
            }
            metadata={
              v.metadata ? (
                <>
                  <StatusPill kind="success">SCIM synced</StatusPill>
                  <span>Updated 4 min ago</span>
                  <span>Owner: Ananya Iyer</span>
                </>
              ) : undefined
            }
            actions={
              v.actions ? (
                <>
                  <Button variant="outline">Import CSV</Button>
                  <Button>Invite user</Button>
                </>
              ) : undefined
            }
          />
        </div>
      ),
      code: (v) =>
        jsx("PageHeader", {
          breadcrumb: v.breadcrumb
            ? block(
                jsx("Breadcrumb", {}, [
                  jsx("BreadcrumbList", {}, [
                    jsx("BreadcrumbItem", {}, [
                      jsx("BreadcrumbLink", { href: "/console/directory" }, "Directory"),
                    ]),
                    "<BreadcrumbSeparator />",
                    jsx("BreadcrumbItem", {}, [jsx("BreadcrumbPage", {}, v.title)]),
                  ]),
                ]),
              )
            : undefined,
          title: v.title,
          description: v.description || undefined,
          metadata: v.metadata
            ? block(
                fragment([
                  '<StatusPill kind="success">SCIM synced</StatusPill>',
                  "<span>Updated 4 min ago</span>",
                  "<span>Owner: Ananya Iyer</span>",
                ]),
              )
            : undefined,
          actions: v.actions
            ? block(
                fragment([
                  '<Button variant="outline">Import CSV</Button>',
                  "<Button>Invite user</Button>",
                ]),
              )
            : undefined,
        }),
    }),
  },
};
