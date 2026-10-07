"use client";

import { CheckIcon } from "@qeetrix/icons/icons/check";
import { CopyIcon } from "@qeetrix/icons/icons/copy";
import * as React from "react";

import { Button } from "@/components/Button/button";
import { VisuallyHidden } from "@/internal/visually-hidden";
import type { MessagesFor } from "@/lib/messages";
import { codeBlockMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

export type CodeLanguage = "json" | "text" | "shell" | "http";

interface CodeBlockProps {
  /** The code to display. */
  value: string;
  /**
   * Light-touch syntax highlighting for "json" (comments allowed, as in JSONC), "shell" and
   * "http"; "text" renders as plain monospace. Defaults to "text".
   */
  language?: CodeLanguage;
  /** Show line numbers in the gutter. Defaults to false. */
  lineNumbers?: boolean;
  /** Show the copy button. Defaults to true. */
  copy?: boolean;
  /**
   * Soft-wrap long lines instead of scrolling them horizontally. Off by default: code is usually
   * read by its line structure, and a wrapped line can be mistaken for two. Turn it on for
   * prose-like payloads — long JWTs, URLs, log lines — in narrow panels.
   */
  wrap?: boolean;
  /**
   * Show the language identifier (`json`, `shell`, `http`) in the header. It is the identifier,
   * not a translated name, in the same way a file extension is. Never shown for "text".
   */
  showLanguage?: boolean;
  /** CSS max-height utility before vertical scrolling kicks in. */
  maxHeight?: string;
  className?: string;
  /** Optional caption shown above the block (e.g. filename, content-type). */
  caption?: React.ReactNode;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"codeBlock">;
}

// ---------------------------------------------------------------------------
// Tokenizers
//
// Each language is a single sticky-free regex walk that emits `{ text, role }` tokens; anything
// unmatched passes through as plain text. Not grammars — just enough to colour the payloads an
// enterprise console shows (API responses, webhook bodies, curl commands, raw HTTP exchanges).
// Every token is rendered as a text node, so hostile input (markup in a key, say) stays inert.
//
// Tokens are produced for the whole value and then split at line breaks, so a block comment that
// spans lines still renders as one comment, and each line can carry its own gutter number.
// ---------------------------------------------------------------------------

type SyntaxRole = "key" | "string" | "number" | "literal" | "punctuation" | "comment";
interface Token {
  text: string;
  role?: SyntaxRole;
}

// Semantic syntax roles, not palette utilities: the highlighter's colours are a theme decision,
// and `--syntax-*` carries a per-theme value so a brand theme retints code without editing this
// file. Every role, punctuation and comments included, is ≥4.5:1 on the code surface.
const ROLE_CLASS: Record<SyntaxRole, string> = {
  key: "text-syntax-key",
  string: "text-syntax-string",
  number: "text-syntax-number",
  literal: "text-syntax-literal",
  punctuation: "text-syntax-punctuation",
  comment: "text-syntax-comment",
};

const JSON_TOKEN_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*")(\s*:)?|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],:])/g;

function tokenizeJSON(input: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of input.matchAll(JSON_TOKEN_RE)) {
    const index = m.index ?? 0;
    if (index > last) out.push({ text: input.slice(last, index) });
    const [, comment, strOrKey, colon, literal, num, punct] = m;
    if (comment) out.push({ text: comment, role: "comment" });
    else if (strOrKey) {
      if (colon) {
        out.push({ text: strOrKey, role: "key" });
        out.push({ text: colon, role: "punctuation" });
      } else {
        out.push({ text: strOrKey, role: "string" });
      }
    } else if (literal) out.push({ text: literal, role: "literal" });
    else if (num) out.push({ text: num, role: "number" });
    else if (punct) out.push({ text: punct, role: "punctuation" });
    last = index + m[0].length;
  }
  if (last < input.length) out.push({ text: input.slice(last) });
  return out;
}

/*
 * Shell: comments, quoted strings, `$VAR` / `${VAR}` expansions, long and short flags, and the
 * operators that join commands. A comment only starts a token at the start of a word, so the
 * `#` in a URL fragment stays part of the URL.
 */
const SHELL_TOKEN_RE =
  /((?:^|(?<=\s))#[^\n]*)|("(?:\\.|[^"\\])*"|'[^']*')|(\$\{[^}\n]*\}|\$[A-Za-z_][A-Za-z0-9_]*)|((?:^|(?<=\s))--?[A-Za-z0-9][\w-]*)|(\|\||&&|[|;\\]|>{1,2}|<)/gm;

function tokenizeShell(input: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of input.matchAll(SHELL_TOKEN_RE)) {
    const index = m.index ?? 0;
    if (index > last) out.push({ text: input.slice(last, index) });
    const [, comment, str, variable, flag, operator] = m;
    if (comment) out.push({ text: comment, role: "comment" });
    else if (str) out.push({ text: str, role: "string" });
    else if (variable) out.push({ text: variable, role: "literal" });
    else if (flag) out.push({ text: flag, role: "key" });
    else if (operator) out.push({ text: operator, role: "punctuation" });
    last = index + m[0].length;
  }
  if (last < input.length) out.push({ text: input.slice(last) });
  return out;
}

const HTTP_REQUEST_LINE_RE = /^([A-Z]+)(\s+)(\S+)(\s+)(HTTP\/[\d.]+)$/;
const HTTP_STATUS_LINE_RE = /^(HTTP\/[\d.]+)(\s+)(\d{3})(.*)$/;
const HTTP_HEADER_RE = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+)(:)(.*)$/;

/*
 * HTTP: the request or status line, then `Name: value` headers, then a blank line and the body.
 * A body that looks like JSON is highlighted as JSON.
 */
function tokenizeHTTP(input: string): Token[] {
  const lines = input.split("\n");
  const out: Token[] = [];
  let inBody = false;
  const bodyLines: string[] = [];
  lines.forEach((line, index) => {
    if (inBody) {
      bodyLines.push(line);
      return;
    }
    const newline = index < lines.length - 1 ? "\n" : "";
    if (line.trim() === "" && index > 0) {
      inBody = true;
      out.push({ text: line + newline });
      return;
    }
    const request = index === 0 ? HTTP_REQUEST_LINE_RE.exec(line) : null;
    const status = index === 0 ? HTTP_STATUS_LINE_RE.exec(line) : null;
    const header = index > 0 ? HTTP_HEADER_RE.exec(line) : null;
    if (request) {
      const [, method, s1, target, s2, version] = request;
      out.push(
        { text: method, role: "literal" },
        { text: s1 },
        { text: target },
        { text: s2 },
        { text: version, role: "punctuation" },
      );
    } else if (status) {
      const [, version, s1, code, reason] = status;
      out.push(
        { text: version, role: "punctuation" },
        { text: s1 },
        { text: code, role: "number" },
        { text: reason },
      );
    } else if (header) {
      const [, name, colon, value] = header;
      out.push({ text: name, role: "key" }, { text: colon, role: "punctuation" }, { text: value });
    } else {
      out.push({ text: line });
    }
    if (newline) out.push({ text: newline });
  });
  if (bodyLines.length) {
    const body = bodyLines.join("\n");
    out.push(...(/^\s*[[{]/.test(body) ? tokenizeJSON(body) : [{ text: body }]));
  }
  return out;
}

function tokenize(value: string, language: CodeLanguage): Token[] {
  switch (language) {
    case "json":
      return tokenizeJSON(value);
    case "shell":
      return tokenizeShell(value);
    case "http":
      return tokenizeHTTP(value);
    default:
      return [{ text: value }];
  }
}

/** Splits a token stream at line breaks, keeping each piece's role. */
function splitLines(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of tokens) {
    const parts = token.text.split("\n");
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ text: part, role: token.role });
    });
  }
  return lines;
}

/**
 * Whether the element currently scrolls in either axis. Re-measured on resize and whenever
 * `contentKey` changes, since new content can overflow a box whose size did not change.
 */
function useScrollable(ref: React.RefObject<HTMLElement | null>, contentKey: string) {
  const [scrollable, setScrollable] = React.useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `contentKey` is the re-measure trigger; the effect reads layout, not the key.
  React.useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const measure = () =>
      setScrollable(
        element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, contentKey]);
  return scrollable;
}

/**
 * CodeBlock renders a copyable, optionally syntax-highlighted code block. JSON, shell and HTTP
 * get a small in-house highlighter; other languages render as plain monospace. There's no
 * external syntax-highlighter dependency.
 *
 * Developer-UI details worth knowing:
 * - Line numbers are CSS counters with empty alternative text, so they are neither copied with a
 *   selection nor read out line by line.
 * - The copy button is always visible when the block has a header (a `caption` or
 *   `showLanguage`); without one it floats in the corner, revealed on hover and focus for a mouse
 *   and always shown for touch, where there is no hover to reveal it.
 * - A successful copy is announced through a polite live region, not only by renaming the button.
 * - When the code overflows its box the scroll area joins the tab order, so it can be scrolled
 *   from the keyboard.
 */
function CodeBlock({
  value,
  language = "text",
  lineNumbers,
  copy = true,
  wrap = false,
  showLanguage = false,
  maxHeight = "max-h-96",
  className,
  caption,
  messages: messageOverrides,
}: CodeBlockProps) {
  const messages = useMessages("codeBlock", codeBlockMessages, messageOverrides);
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const preRef = React.useRef<HTMLPreElement>(null);
  const captionId = React.useId();

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  };

  const lines = React.useMemo(() => splitLines(tokenize(value, language)), [value, language]);
  const scrollable = useScrollable(preRef, `${wrap}:${lineNumbers}:${value}`);
  const languageLabel = showLanguage && language !== "text" ? language : null;
  const hasHeader = Boolean(caption) || languageLabel !== null;

  const copyButton = copy ? (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleCopy}
      aria-label={copied ? messages.copied : messages.copy}
      data-slot="code-block-copy"
      className={cn(
        "text-muted-foreground hover:text-foreground",
        !hasHeader &&
          "absolute inset-e-1.5 top-1.5 z-10 bg-surface-sunken/90 transition-opacity duration-fast pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100",
      )}
    >
      {copied ? <CheckIcon aria-hidden className="text-success-text" /> : <CopyIcon aria-hidden />}
    </Button>
  ) : null;

  return (
    <div
      data-slot="code-block"
      data-language={language}
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-surface-sunken font-mono text-code text-foreground",
        className,
      )}
    >
      {hasHeader && (
        <div
          data-slot="code-block-header"
          className="flex min-h-9 items-center gap-2 border-b border-border py-0.5 ps-3 pe-1"
        >
          {caption && (
            <div
              id={captionId}
              data-slot="code-block-caption"
              className="min-w-0 flex-1 truncate font-sans text-caption text-muted-foreground"
            >
              {caption}
            </div>
          )}
          {languageLabel && (
            <span
              data-slot="code-block-language"
              className={cn(
                "shrink-0 rounded-(--qx-corner-sm) border border-border px-1.5 text-micro leading-5 text-muted-foreground",
                !caption && "me-auto",
              )}
            >
              {languageLabel}
            </span>
          )}
          {copyButton}
        </div>
      )}
      {!hasHeader && copyButton}
      {copy && (
        <VisuallyHidden role="status" data-slot="code-block-status">
          {copied ? messages.copied : ""}
        </VisuallyHidden>
      )}
      {/* Code reads left to right in every locale; under an inherited `dir="rtl"` the bidi
          algorithm would move leading brackets and trailing punctuation to the wrong ends. */}
      <pre
        ref={preRef}
        dir="ltr"
        tabIndex={scrollable ? 0 : undefined}
        className={cn(
          "m-0 overflow-auto py-3 [tab-size:2] outline-none focus-visible:focus-ring-inset",
          maxHeight,
        )}
      >
        <code
          data-slot="code-block-code"
          className={cn("grid min-w-max", lineNumbers && "[counter-reset:line]", wrap && "min-w-0")}
          style={
            lineNumbers
              ? ({ "--qx-code-gutter": `${String(lines.length).length}ch` } as React.CSSProperties)
              : undefined
          }
        >
          {lines.map((line, lineIndex) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: lines have no identity but their position.
              key={lineIndex}
              data-slot="code-block-line"
              className={cn(
                "min-h-lh pe-10",
                // With a gutter the line is a two-track grid — number, then code — so a wrapped
                // line hangs under its own first character instead of under the number. The
                // number is generated content with empty alternative text: it is not part of a
                // copied selection, and assistive technology does not read it.
                lineNumbers
                  ? "grid grid-cols-[auto_minmax(0,1fr)] [counter-increment:line] before:w-[calc(var(--qx-code-gutter)+1.5rem)] before:pe-3 before:text-end before:text-syntax-comment before:select-none before:content-[counter(line)_/_'']"
                  : "block ps-3",
              )}
            >
              <span
                className={cn(
                  "min-w-0",
                  wrap ? "wrap-anywhere whitespace-pre-wrap" : "whitespace-pre",
                )}
              >
                {line.map((token, tokenIndex) =>
                  token.role ? (
                    // biome-ignore lint/suspicious/noArrayIndexKey: tokens have no identity but their position.
                    <span key={tokenIndex} className={ROLE_CLASS[token.role]}>
                      {token.text}
                    </span>
                  ) : (
                    token.text
                  ),
                )}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

export type { CodeBlockProps };
export { CodeBlock };
