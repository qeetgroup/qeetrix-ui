"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import * as React from "react";
import { Input } from "@/components/Input/input";
import { fieldAction } from "@/internal/field-styles";
import type { MessagesFor } from "@/lib/messages";
import { passwordInputMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  showToggle?: boolean;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"passwordInput">;
};

/**
 * A password field with a reveal toggle.
 *
 * - **Reveal/hide.** The toggle is a real button after the input in the tab order, named
 *   "Show password" / "Hide password" for its current action. It keeps focus when pressed, so
 *   keyboard users can check what they typed and carry on. It never submits (`type="button"`).
 * - **Password managers.** The input stays one stable element — same `id`, `name` and
 *   `autoComplete` — whether masked or revealed, so autofill and save prompts keep working. Pass
 *   `autoComplete="current-password"` on sign-in and `"new-password"` on sign-up and reset.
 * - **Leaks.** Spellcheck, autocorrect and autocapitalise are off: a revealed password is plain
 *   text, and browser spellcheck services may send plain text off the device. The field
 *   re-masks itself when its form submits, so a revealed password is not stored in the
 *   browser's form history as ordinary text.
 */
function PasswordInput({
  showToggle = true,
  messages: messageOverrides,
  className,
  ref,
  ...props
}: PasswordInputProps) {
  const messages = useMessages("passwordInput", passwordInputMessages, messageOverrides);
  const [shown, setShown] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const setRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // Re-mask on submit — the listener is on the owning form (`input.form` also resolves a `form`
  // attribute), registered in the capture phase so it runs before the consumer's handler.
  React.useEffect(() => {
    if (!shown) return;
    const form = inputRef.current?.form;
    if (!form) return;
    const hide = () => {
      // Synchronously, as well as through state: the browser builds the submission (and decides
      // what to remember) in the same task as the event, before React would re-render.
      if (inputRef.current) inputRef.current.type = "password";
      setShown(false);
    };
    form.addEventListener("submit", hide, true);
    return () => form.removeEventListener("submit", hide, true);
  }, [shown]);

  return (
    <div
      data-slot="password-input"
      data-revealed={shown || undefined}
      className={cn("relative flex items-center", className)}
    >
      <Input
        ref={setRef}
        type={shown ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={showToggle ? "pe-[calc(var(--qx-component-input-height)+0.25rem)]" : undefined}
        {...props}
      />
      {showToggle && (
        <button
          type="button"
          data-slot="password-input-toggle"
          className={cn(fieldAction, "absolute inset-e-1 top-1/2 -translate-y-1/2")}
          aria-label={shown ? messages.hide : messages.show}
          aria-controls={props.id}
          disabled={props.disabled}
          onClick={() => setShown((s) => !s)}
        >
          {shown ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
        </button>
      )}
    </div>
  );
}

export type { PasswordInputProps };
export { PasswordInput };
