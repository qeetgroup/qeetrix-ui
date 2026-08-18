"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type ComponentProps, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<ComponentProps<"input">, "type"> & {
  showToggle?: boolean;
};

function PasswordInput({ showToggle = true, className, ...props }: PasswordInputProps) {
  const [shown, setShown] = useState(false);

  return (
    <div data-slot="password-input" className={cn("relative flex items-center", className)}>
      <Input type={shown ? "text" : "password"} className="pr-10" {...props} />
      {showToggle && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-1 top-1/2 -translate-y-1/2"
          aria-label={shown ? "Hide password" : "Show password"}
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
