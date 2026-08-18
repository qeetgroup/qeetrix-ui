"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface EditableContextValue {
  isEditing: boolean;
  value: string;
  placeholder: string;
  disabled: boolean;
  startEditing: () => void;
  submit: (val: string) => void;
  cancel: () => void;
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
  /** Placeholder shown when value is empty. Defaults to "Click to edit". */
  placeholder?: string;
  /** Disables the editable. */
  disabled?: boolean;
  children: React.ReactNode;
}

export type EditablePreviewProps = React.ComponentProps<"button">;

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
  placeholder = "Click to edit",
  disabled = false,
  className,
  children,
  ...props
}: EditableProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [isEditing, setIsEditing] = React.useState(false);

  // Supports both controlled (`value` prop) and uncontrolled (`defaultValue`) usage.
  const committedValue = valueProp ?? internalValue;

  const startEditing = React.useCallback(() => {
    if (disabled) return;
    setIsEditing(true);
    onEdit?.();
  }, [disabled, onEdit]);

  const submit = React.useCallback(
    (val: string) => {
      setIsEditing(false);
      // Only update internal state in uncontrolled mode.
      if (valueProp === undefined) setInternalValue(val);
      onValueChange?.(val);
    },
    [valueProp, onValueChange],
  );

  const cancel = React.useCallback(() => {
    setIsEditing(false);
    onCancel?.();
  }, [onCancel]);

  return (
    <EditableContext.Provider
      value={{
        isEditing,
        value: committedValue,
        placeholder,
        disabled,
        startEditing,
        submit,
        cancel,
      }}
    >
      <div
        data-slot="editable"
        className={cn("group relative inline-flex w-full", className)}
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

function EditablePreview({ className, ...props }: EditablePreviewProps) {
  const { isEditing, value, placeholder, disabled, startEditing } = useEditableContext();

  // Hide preview while the input is active.
  if (isEditing) return null;

  return (
    <button
      type="button"
      data-slot="editable-preview"
      disabled={disabled}
      onClick={startEditing}
      className={cn(
        "min-h-9 w-full cursor-text rounded-md border border-transparent px-3 py-2 text-start text-sm transition-colors hover:border-input disabled:cursor-not-allowed disabled:opacity-disabled",
        className,
      )}
      {...props}
    >
      {value ? value : <span className="text-muted-foreground">{placeholder}</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// EditableInput
// ---------------------------------------------------------------------------

function EditableInput({ className, ...props }: EditableInputProps) {
  const { isEditing, value, submit, cancel } = useEditableContext();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [draftValue, setDraftValue] = React.useState(value);

  // Re-sync draft to committed value whenever editing mode is entered.
  // `value` is also included in deps so a controlled parent that changes the
  // committed value between edits is reflected on next edit start.
  React.useEffect(() => {
    if (isEditing) {
      setDraftValue(value);
      inputRef.current?.focus();
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
      onBlur={() => submit(draftValue)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit(draftValue);
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
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
