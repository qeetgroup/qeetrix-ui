import { Pagination } from "@qeetrix/ui";
import { useState } from "react";
// PaginationBar is barrel-excluded: consumers import it from "@qeetrix/ui/components/pagination-bar",
// which the playground cannot resolve to source, so the deprecated alias is imported directly.
import { PaginationBar } from "@/components/Pagination/pagination-bar";
import { invoices, tenants, users } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num } from "../registry/types";

const TOTAL_USERS = tenants[0].users;
const PAGE_SIZE = 50;
const LAST_PAGE = Math.ceil(TOTAL_USERS / PAGE_SIZE) - 1;
const count = new Intl.NumberFormat("en-IN");

/** A few table rows above the footer, so the pagination reads as part of a list screen. */
function UserRows({ page }: { page: number }) {
  const offset = (page * 3) % users.length;
  const rows = [0, 1, 2].map((index) => users[(offset + index) % users.length]);
  return (
    <ul className="divide-y text-sm">
      {rows.map((user) => (
        <li key={user.id} className="flex items-center justify-between gap-3 px-3 py-2">
          <span className="truncate font-medium">{user.name}</span>
          <span className="truncate text-muted-foreground">{user.email}</span>
        </li>
      ))}
    </ul>
  );
}

function UsersListDemo({ rangeLabel = false }: { rangeLabel?: boolean }) {
  const [page, setPage] = useState(0);
  const itemsOnPage = page === LAST_PAGE ? TOTAL_USERS - LAST_PAGE * PAGE_SIZE : PAGE_SIZE;
  const start = page * PAGE_SIZE + 1;
  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-lg border">
      <UserRows page={page} />
      <Pagination
        hasPrev={page > 0}
        hasNext={page < LAST_PAGE}
        onFirst={() => setPage(0)}
        onPrev={() => setPage((current) => Math.max(0, current - 1))}
        onNext={() => setPage((current) => Math.min(LAST_PAGE, current + 1))}
        itemsOnPage={itemsOnPage}
        total={TOTAL_USERS}
        label={
          rangeLabel
            ? `${count.format(start)}–${count.format(start + itemsOnPage - 1)} of ${count.format(TOTAL_USERS)} users`
            : undefined
        }
      />
    </div>
  );
}

/** Cursor pagination: no total, no stepping back — only "First" and "Next". */
function CursorDemo() {
  const [cursor, setCursor] = useState(0);
  const pageSize = 4;
  const rows = invoices.slice(cursor, cursor + pageSize);
  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-lg border">
      <ul className="divide-y text-sm">
        {rows.map((invoice) => (
          <li key={invoice.number} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="font-mono">{invoice.number}</span>
            <span className="truncate text-muted-foreground">{invoice.customer}</span>
          </li>
        ))}
      </ul>
      <Pagination
        hasPrev={cursor > 0}
        hasNext={cursor + pageSize < invoices.length}
        onFirst={() => setCursor(0)}
        onNext={() => setCursor((current) => current + pageSize)}
        itemsOnPage={rows.length}
        pageSize={pageSize}
      />
    </div>
  );
}

const paginationControls = {
  hasPrev: bool(true, "hasPrev"),
  hasNext: bool(true, "hasNext"),
  loading: bool(false, "loading"),
  itemsOnPage: num(50, { min: 0, max: 200, label: "itemsOnPage" }),
  pageSize: num(50, { min: 0, max: 200, label: "pageSize (0 = omit)" }),
  total: num(1842, { min: 0, max: 100000, label: "total (0 = omit)" }),
};

function paginationCode(tag: string, v: Record<string, unknown>) {
  return jsx(tag, {
    hasPrev: v.hasPrev === true,
    hasNext: v.hasNext === true,
    onFirst: expr("() => setCursor(undefined)"),
    onNext: expr("() => setCursor(data.next_cursor)"),
    itemsOnPage: Number(v.itemsOnPage),
    pageSize: Number(v.pageSize) > 0 ? Number(v.pageSize) : undefined,
    total: Number(v.total) > 0 ? Number(v.total) : undefined,
    loading: v.loading === true,
  });
}

export const examples: FamilyExamples = {
  pagination: {
    layout: "wide",
    minHeight: 640,
    demos: [
      {
        name: "With total",
        description:
          "The cursor-pagination footer of an index screen. With a known `total` the label reads “Showing 50 of 1,842” (en-IN grouping).",
        render: () => <UsersListDemo />,
      },
      {
        name: "Range label",
        description: "`label` replaces the derived text, here with a 1–50 range.",
        render: () => <UsersListDemo rangeLabel />,
      },
      {
        name: "Cursor, no total",
        description:
          "Only `pageSize` is known; with no `onPrev`, Prev falls back to `onFirst` because a cursor API cannot step back.",
        render: () => <CursorDemo />,
      },
      {
        name: "Loading",
        description: "`loading` disables every control while the next page is fetched.",
        render: () => (
          <div className="w-full max-w-2xl overflow-hidden rounded-lg border">
            <Pagination hasPrev hasNext loading itemsOnPage={50} total={TOTAL_USERS} />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: paginationControls,
      render: (v) => (
        <div className="w-full max-w-2xl overflow-hidden rounded-lg border">
          <Pagination
            hasPrev={v.hasPrev}
            hasNext={v.hasNext}
            loading={v.loading}
            itemsOnPage={v.itemsOnPage}
            pageSize={v.pageSize > 0 ? v.pageSize : undefined}
            total={v.total > 0 ? v.total : undefined}
          />
        </div>
      ),
      code: (v) => paginationCode("Pagination", v),
    }),
  },

  "pagination-bar": {
    layout: "wide",
    minHeight: 280,
    demos: [
      {
        name: "Deprecated alias",
        description:
          'Deprecated: PaginationBar was renamed to Pagination and is removed in 1.0.0. Import { Pagination } from "@qeetrix/ui" instead; the props are identical.',
        render: () => (
          <div className="w-full max-w-2xl overflow-hidden rounded-lg border">
            <PaginationBar hasNext itemsOnPage={PAGE_SIZE} total={TOTAL_USERS} />
          </div>
        ),
      },
      {
        name: "Loading",
        description: "Same `loading` behaviour as Pagination — migrate by renaming the import.",
        render: () => (
          <div className="w-full max-w-2xl overflow-hidden rounded-lg border">
            <PaginationBar hasPrev hasNext loading itemsOnPage={PAGE_SIZE} pageSize={PAGE_SIZE} />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: paginationControls,
      render: (v) => (
        <div className="w-full max-w-2xl overflow-hidden rounded-lg border">
          <PaginationBar
            hasPrev={v.hasPrev}
            hasNext={v.hasNext}
            loading={v.loading}
            itemsOnPage={v.itemsOnPage}
            pageSize={v.pageSize > 0 ? v.pageSize : undefined}
            total={v.total > 0 ? v.total : undefined}
          />
        </div>
      ),
      code: (v) =>
        [
          '// Deprecated — prefer: import { Pagination } from "@qeetrix/ui";',
          'import { PaginationBar } from "@qeetrix/ui/components/pagination-bar";',
          "",
          paginationCode("PaginationBar", v),
        ].join("\n"),
    }),
  },
};
