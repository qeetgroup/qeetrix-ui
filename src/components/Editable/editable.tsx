"use client";

import { PencilIcon } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/Input/input";
import type { MessagesFor } from "@/lib/messages";
import { editableMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface EditableContextValue {
  isEditing: boolean;
  value: string;
  placeholder: string;
  disabled: boolean;
  startEditing: () => void;
  /** `restoreFocus`: return focus to the preview — true for Enter/Escape, false for a blur. */
  submit: (val: string, restoreFocus?: boolean) => void;
  cancel: (restoreFocus?: boolean) => void;
  previewRef: React.RefObject<HTMLButtonElement | null>;
}

const EditableContext = React.createContext<EditableContextValue | null>(null);

function useEditableContext(): EditableContextValue {
  const ctx = React.useContext(EditableContext);
  if (!ctx) {
    throw new Error("<EditablePreview> and <EditableInput> must be used within <Editable>");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EditableProps extends Omit<React.ComponentProps<"div">, "defaultValue"> {
  /** Controlled value. */
  value?: string;
  /** Initial value for uncontrolled usage. Defaults to "". */
  defaultValue?: string;
  /** Called whenever the committed value changes. */
  onValueChange?: (v: string) => void;
  /** Called when the component enters edit mode. */
  onEdit?: () => void;
  /** Called when the user cancels an in-progress edit (Escape). */
  onCancel?: () => void;
  /**
   * Placeholder shown when value is empty. Defaults to "Click to edit". Equivalent to
   * `messages={{ placeholder }}` and wins over it.
   */
  placeholder?: string;
  /** Disables the editable. */
  disabled?: boolean;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"editable">;
  children: React.ReactNode;
}

export interface EditablePreviewProps extends React.ComponentProps<"button"> {
  /**
   * Show the pencil affordance at the inline end. It appears on hover and keyboard focus, and
   * stays visible on touch screens where there is no hover. Defaults to `true`.
   */
  showIcon?: boolean;
}

export interface EditableInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "ref"> {}

// ---------------------------------------------------------------------------
// Editable (root compound)
// ---------------------------------------------------------------------------

function Editable({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onEdit,
  onCancel,
  placeholder,
  disabled = false,
  messages: messageOverrides,
  className,
  children,
  ...props
}: EditableProps) {
  const messages = useMessages("editable", editableMessages, messageOverrides);
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [isEditing, setIsEditing] = React.useState(false);
  const previewRef = React.useRef<HTMLButtonElement | null>(null);
  // Set when an edit ends by keyboard, so focus goes back to the preview once it remounts rather
  // than falling to <body>. A blur-commit leaves focus where the user sent it.
  const restoreFocusRef = React.useRef(false);

  React.useEffect(() => {
    if (!isEditing && restoreFocusRef.current) {
      restoreFocusRef.current = false;
      previewRef.current?.focus();
    }
  }, [isEditing]);

  // Supports both controlled (`value` prop) and uncontrolled (`defaultValue`) usage.
  const committedValue = valueProp ?? internalValue;

  const startEditing = React.useCallback(() => {
    if (disabled) return;
    setIsEditing(true);
    onEdit?.();
  }, [disabled, onEdit]);

  const submit = React.useCallback(
    (val: string, restoreFocus = false) => {
      restoreFocusRef.current = restoreFocus;
      setIsEditing(false);
      // Only update internal state in uncontrolled mode.
      if (valueProp === undefined) setInternalValue(val);
      onValueChange?.(val);
    },
    [valueProp, onValueChange],
  );

  const cancel = React.useCallback(
    (restoreFocus = false) => {
      restoreFocusRef.current = restoreFocus;
      setIsEditing(false);
      onCancel?.();
    },
    [onCancel],
  );

  return (
    <EditableContext.Provider
      value={{
        isEditing,
        value: committedValue,
        placeholder: placeholder ?? messages.placeholder,
        disabled,
        startEditing,
        submit,
        cancel,
        previewRef,
      }}
    >
      <div
        data-slot="editable"
        data-editing={isEditing || undefined}
        data-disabled={disabled || undefined}
        className={cn("group/editable relative inline-flex w-full", className)}
        {...props}
      >
        {children}
      </div>
    </EditableContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// EditablePreview
// ---------------------------------------------------------------------------

function EditablePreview({
  className,
  showIcon = true,
  children,
  ref,
  ...props
}: EditablePreviewProps) {
  const { isEditing, value, placeholder, disabled, startEditing, previewRef } =
    useEditableContext();
  const setRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      previewRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref, previewRef],
  );

  // Hide preview while the input is active.
  if (isEditing) return null;

  return (
    <button
      ref={setRef}
      type="button"
      data-slot="editable-preview"
      data-placeholder={value ? undefined : ""}
      disabled={disabled}
      onClick={startEditing}
      className={cn(
        // The same box as the field it turns into — height, padding, corner, type size — so
        // nothing shifts when editing starts. At rest it is plain text; hover adds a quiet
        // neutral surface and the pencil, which is the whole affordance.
        "group/editable-preview flex min-h-(--qx-component-input-height) w-full min-w-0 cursor-text items-center gap-2 rounded-(--qx-component-input-corner) border border-transparent px-2.5 py-1 text-start text-base text-foreground outline-none transition-colors duration-fast ease-standard md:text-sm",
        "hover:bg-surface-interactive focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-disabled disabled:hover:bg-transparent",
        className,
      )}
      {...props}
    >
      <span className="min-w-0 flex-1 break-words">
        {children ?? (value ? value : <span className="text-muted-foreground">{placeholder}</span>)}
      </span>
      {showIcon && !disabled && (
        <PencilIcon
          aria-hidden
          data-slot="editable-preview-icon"
          className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-fast ease-standard group-hover/editable-preview:opacity-100 group-focus-visible/editable-preview:opacity-100 pointer-coarse:opacity-100"
        />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// EditableInput
// ---------------------------------------------------------------------------

function EditableInput({ className, onKeyDown, onBlur, ...props }: EditableInputProps) {
  const { isEditing, value, submit, cancel } = useEditableContext();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [draftValue, setDraftValue] = React.useState(value);
  // Enter/Escape settle the edit; the blur that follows (the input unmounting, or focus moving
  // back to the preview) must not settle it a second time — after Escape that second pass
  // committed the very draft the user had just discarded.
  const settledRef = React.useRef(false);

  // Re-sync draft to committed value whenever editing mode is entered, then focus the field with
  // its text selected, so typing replaces the value and the arrow keys refine it.
  // `value` is also included in deps so a controlled parent that changes the
  // committed value between edits is reflected on next edit start.
  React.useEffect(() => {
    if (isEditing) {
      settledRef.current = false;
      setDraftValue(value);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing, value]);

  // Hide input when not in editing mode.
  if (!isEditing) return null;

  return (
    <Input
      ref={inputRef}
      {...props}
      data-slot="editable-input"
      value={draftValue}
      onChange={(e) => setDraftValue(e.target.value)}
      onBlur={(e) => {
        onBlur?.(e);
        if (settledRef.current) return;
        settledRef.current = true;
        submit(draftValue);
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === "Enter") {
          e.preventDefault();
          settledRef.current = true;
          submit(draftValue, true);
        } else if (e.key === "Escape") {
          // Stop here: an Editable inside a Dialog or Popover cancels the edit, not the overlay.
          e.preventDefault();
          e.stopPropagation();
          settledRef.current = true;
          cancel(true);
        }
      }}
      className={cn(className)}
    />
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Editable, EditableInput, EditablePreview };
