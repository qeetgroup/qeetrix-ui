import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { MasterDetail } from "@/components/MasterDetail/master-detail";
import { DirectionProvider } from "@/providers/direction-provider";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

/**
 * The narrow layout is chosen by a media query, and jsdom's `matchMedia` always reports no
 * match, so the desktop branch is the default and the narrow branch has to be forced. The mock
 * also records which query was asked, so `collapseBelow` is assertable.
 */
const mobile = vi.hoisted(() => ({ value: false, queries: [] as string[] }));
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: (query: string) => {
    mobile.queries.push(query);
    return mobile.value;
  },
}));

/*
 * Panel sizes are the one thing about the desktop split that jsdom cannot show: the library
 * needs a real `ResizeObserver` measurement before any size takes effect, and reports every
 * panel as 50% until then. So `Panel` is wrapped to record the props it is handed and then
 * delegate to the genuine component — the units MasterDetail *emits* are assertable even
 * though the resulting widths are not.
 */
const panelProps = vi.hoisted(() => [] as Record<string, unknown>[]);
vi.mock("react-resizable-panels", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-resizable-panels")>();
  return {
    ...actual,
    Panel: (props: Record<string, unknown>) => {
      panelProps.push(props);
      return actual.Panel(props as Parameters<typeof actual.Panel>[0]);
    },
  };
});

afterEach(() => {
  mobile.value = false;
  mobile.queries.length = 0;
  panelProps.length = 0;
});

describe("MasterDetail", () => {
  it("renders list and detail on desktop", () => {
    render(<MasterDetail list={<div>List content</div>} detail={<div>Detail content</div>} />);
    expect(screen.getByText("List content")).toBeInTheDocument();
    expect(screen.getByText("Detail content")).toBeInTheDocument();
  });

  it("has no axe violations on the desktop two-pane layout", async () => {
    const { container } = render(
      <MasterDetail
        list={<nav aria-label="Messages">List content</nav>}
        detail={<article aria-label="Message">Detail content</article>}
      />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("sizes the list pane as a percentage, not as pixels", () => {
    // `react-resizable-panels` reads a bare *number* as pixels and a string as a percentage,
    // so `defaultSize={32}` asked for a 32-pixel list pane while the prop documented
    // "% of width" — a list column two characters wide on every desktop.
    render(
      <MasterDetail
        list={<div>List</div>}
        detail={<div>Detail</div>}
        defaultListSize={32}
        minListSize={22}
      />,
    );
    const list = panelProps[0];
    expect(list.defaultSize).toBe("32%");
    expect(list.minSize).toBe("22%");
    // The unit is the whole point: a number here is a different length entirely.
    expect(typeof list.defaultSize).toBe("string");
  });

  it("carries its documented default sizes through in the same units", () => {
    render(<MasterDetail list={<div>List</div>} detail={<div>Detail</div>} />);
    expect(panelProps[0]).toMatchObject({ defaultSize: "32%", minSize: "22%" });
  });

  it("puts the mobile detail sheet at the inline end in ltr", () => {
    mobile.value = true;
    const { baseElement } = render(
      <MasterDetail list={<div>List</div>} detail={<div>Detail</div>} detailOpen />,
    );
    expect(baseElement.querySelector('[data-slot="sheet-content"]')).toHaveAttribute(
      "data-side",
      "right",
    );
  });

  it("mirrors the mobile detail sheet in rtl", () => {
    // Sheet takes physical sides only. The detail pane sits after the list on the inline
    // axis, so in RTL it has to enter from the left — otherwise the sheet covers the list it
    // was opened from.
    mobile.value = true;
    const { baseElement } = render(
      <DirectionProvider direction="rtl">
        <MasterDetail list={<div>List</div>} detail={<div>Detail</div>} detailOpen />
      </DirectionProvider>,
    );
    expect(baseElement.querySelector('[data-slot="sheet-content"]')).toHaveAttribute(
      "data-side",
      "left",
    );
  });

  it("derives the mobile sheet side from a locale-only provider", () => {
    mobile.value = true;
    const { baseElement } = render(
      <DirectionProvider locale="ar-EG">
        <MasterDetail list={<div>List</div>} detail={<div>Detail</div>} detailOpen />
      </DirectionProvider>,
    );
    expect(baseElement.querySelector('[data-slot="sheet-content"]')).toHaveAttribute(
      "data-side",
      "left",
    );
  });

  it("keeps the list rendered behind the mobile sheet", () => {
    mobile.value = true;
    render(<MasterDetail list={<div>List content</div>} detail={<div>Detail</div>} detailOpen />);
    expect(screen.getByText("List content")).toBeInTheDocument();
  });
});

describe("MasterDetail enterprise layout", () => {
  it("collapses below md by default and below the chosen breakpoint when asked", () => {
    render(<MasterDetail list={<div>List</div>} detail={<div>Detail</div>} />);
    expect(mobile.queries).toContain("(max-width: 767px)");

    mobile.queries.length = 0;
    render(<MasterDetail list={<div>List</div>} detail={<div>Detail</div>} collapseBelow="lg" />);
    expect(mobile.queries).toContain("(max-width: 1023px)");
  });

  it("passes unit-bearing sizes through, so a list column can have a fixed floor", () => {
    render(
      <MasterDetail
        list={<div>List</div>}
        detail={<div>Detail</div>}
        defaultListSize="20rem"
        minListSize="16rem"
        maxListSize={50}
      />,
    );
    expect(panelProps[0]).toMatchObject({ defaultSize: "20rem", minSize: "16rem", maxSize: "50%" });
  });

  it("leaves the list uncapped unless a maximum is given", () => {
    render(<MasterDetail list={<div>List</div>} detail={<div>Detail</div>} />);
    expect(panelProps[0].maxSize).toBeUndefined();
  });

  it("opens the narrow-layout sheet from defaultDetailOpen when uncontrolled", () => {
    mobile.value = true;
    const { baseElement } = render(
      <MasterDetail list={<div>List</div>} detail={<div>Detail body</div>} defaultDetailOpen />,
    );
    expect(baseElement.querySelector('[data-slot="sheet-content"]')).not.toBeNull();
    expect(screen.getByText("Detail body")).toBeInTheDocument();
  });

  it("keeps the narrow-layout sheet closed by default", () => {
    mobile.value = true;
    const { baseElement } = render(
      <MasterDetail list={<div>List</div>} detail={<div>Detail body</div>} />,
    );
    expect(baseElement.querySelector('[data-slot="sheet-content"]')).toBeNull();
  });

  it("reports the sheet closing to a controlled owner", async () => {
    mobile.value = true;
    const onDetailOpenChange = vi.fn();
    render(
      <MasterDetail
        list={<div>List</div>}
        detail={<div>Detail body</div>}
        detailOpen
        onDetailOpenChange={onDetailOpenChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    await waitFor(() => expect(onDetailOpenChange).toHaveBeenCalledWith(false));
  });

  it("clips both panes to the frame's corners", () => {
    const { container } = render(
      <MasterDetail list={<div>List</div>} detail={<div>Detail</div>} />,
    );
    expect(container.querySelector('[data-slot="master-detail"]')).toHaveClass("overflow-hidden");
  });
});
