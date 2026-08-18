import type { Messages } from "../types";

/**
 * Default (English) catalog for component-internal strings. This is the source
 * of truth and the fallback for every other locale. Add a namespace per
 * component that surfaces user-facing copy; keep keys stable.
 */
export const en: Messages = {
  pagination: {
    label: "Pagination",
    first: "First",
    firstPage: "First page",
    previous: "Previous",
    previousShort: "Prev",
    previousPage: "Previous page",
    next: "Next",
    nextPage: "Next page",
    page: "Page {page} of {total}",
    showing: "Showing {count} of {total}",
    rowOnPage: "{count} row on this page",
    rowsOnPage: "{count} rows on this page",
    rows: "{count} rows",
  },
  commandPalette: {
    label: "Command palette",
    results: "Results",
    placeholder: "Search…",
    empty: "No matches",
    navigate: "navigate",
    select: "select",
    close: "close",
    resultCount: "{count} result",
    resultCountPlural: "{count} results",
  },
  combobox: {
    placeholder: "Select…",
    empty: "No results.",
    clearSelection: "Clear selection",
    open: "Open",
    remove: "Remove {label}",
  },
  fileUpload: {
    prompt: "Drop files here, or click to browse",
    promptSingle: "Drop a file here, or click to browse",
    rejected: "File type not accepted.",
    typeRejected: "{name}: file type not allowed.",
    sizeRejected: "{name}: larger than {size}.",
    countRejected: "{name}: exceeds the {count}-file limit.",
    upTo: "up to {size}",
    remove: "Remove {name}",
  },
  otpInput: {
    label: "One-time code",
    digit: "Digit {position} of {total}",
  },
  dataState: {
    loading: "Loading…",
    empty: "Nothing here yet.",
    error: "Something went wrong.",
  },
  dialog: {
    close: "Close",
  },
};
