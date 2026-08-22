"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type ComponentProps, useState } from "react";

import { Button } from "@/components/Button/button";
import { Input } from "@/components/Input/input";
import type { MessagesFor } from "@/lib/messages";
import { passwordInputMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

type PasswordInputProps = Omit<ComponentProps<"input">, "type"> & {
  showToggle?: boolean;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"passwordInput">;
};

function PasswordInput({
  showToggle = true,
  messages: messageOverrides,
  className,
  ...props
}: PasswordInputProps) {
  const messages = useMessages("passwordInput", passwordInputMessages, messageOverrides);
  const [shown, setShown] = useState(false);

  return (
    <div data-slot="password-input" className={cn("relative flex items-center", className)}>
      <Input type={shown ? "text" : "password"} className="pe-10" {...props} />
      {showToggle && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute end-1 top-1/2 -translate-y-1/2"
          aria-label={shown ? messages.hide : messages.show}
          aria-controls={props.id}
          tabIndex={0}
          onClick={() => setShown((s) => !s)}
        >
          {shown ? (
            <EyeOffIcon className="size-4" aria-hidden />
          ) : (
            <EyeIcon className="size-4" aria-hidden />
          )}
        </Button>
      )}
    </div>
  );
}

export type { PasswordInputProps };
export { PasswordInput };
