import {
  Badge,
  Button,
  Field,
  FieldControl,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  MentionInput,
  type MentionPerson,
  toast,
} from "@qeetrix/ui";
import { useState } from "react";
import { auditRecords, logEvents, users } from "../data/qeet";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

const people: MentionPerson[] = users
  .filter((user) => user.status === "active")
  .map((user) => ({ id: user.id, label: user.name }));

const services: MentionPerson[] = [...new Set(logEvents.map((event) => event.service))].map(
  (service) => ({ id: service, label: service }),
);

const revocation = auditRecords[1];

function mentionedIn(body: string, candidates: readonly MentionPerson[], trigger = "@") {
  return candidates.filter((person) => body.includes(`${trigger}${person.label}`));
}

function AuditCommentDemo() {
  const [comment, setComment] = useState(
    `Revoked ${revocation.target.split(" · ")[0]} after the Frankfurt sign-in. @Rohan Mehta can you confirm with Kavya before we re-enable her account?`,
  );
  const notified = mentionedIn(comment, people);
  return (
    <Field className="w-96 max-w-full">
      <FieldLabel>Comment on {revocation.action}</FieldLabel>
      <FieldControl
        render={
          <MentionInput
            value={comment}
            onValueChange={setComment}
            people={people}
            placeholder="Add a note. Type @ to mention a teammate."
          />
        }
      />
      <div className="flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground">
        {notified.length > 0 ? (
          <>
            Notifies
            {notified.map((person) => (
              <Badge key={person.id} variant="secondary">
                {person.label}
              </Badge>
            ))}
            by email and Qeet Notify push.
          </>
        ) : (
          "Mention someone to notify them."
        )}
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={comment.trim().length === 0}
          onClick={() =>
            toast.success("Comment added to the audit trail", {
              description: notified.length
                ? `Notified ${notified.map((person) => person.label).join(", ")}`
                : undefined,
            })
          }
        >
          Post comment
        </Button>
      </div>
    </Field>
  );
}

function ServiceTriggerDemo() {
  const [note, setNote] = useState("Error spike after the 10:20 deploy of #");
  return (
    <Field className="w-96 max-w-full">
      <FieldLabel>Incident note</FieldLabel>
      <FieldControl
        render={
          <MentionInput
            value={note}
            onValueChange={setNote}
            people={services}
            trigger="#"
            suggestionCountLabel={(count) =>
              count === 1 ? "1 service matches" : `${count} services match`
            }
          />
        }
      />
      <FieldDescription>Type # to reference a Qeet Logs service.</FieldDescription>
    </Field>
  );
}

function PlaygroundMention({
  placeholder,
  trigger,
  maxSuggestions,
  disabled,
  readOnly,
}: {
  placeholder: string;
  trigger: string;
  maxSuggestions: number;
  disabled: boolean;
  readOnly: boolean;
}) {
  const [value, setValue] = useState(readOnly ? "Approved by @Ananya Iyer on 5 Oct 2026." : "");
  return (
    <MentionInput
      aria-label="Comment"
      value={value}
      onValueChange={setValue}
      people={trigger === "#" ? services : people}
      trigger={trigger}
      placeholder={placeholder}
      maxSuggestions={maxSuggestions}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}

const mentionControls = {
  placeholder: text("Type @ to mention a teammate", "Placeholder"),
  trigger: select(["@", "#"] as const, "@", "trigger"),
  maxSuggestions: num(6, { min: 1, max: 12, label: "maxSuggestions" }),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
};

export const examples: FamilyExamples = {
  "mention-input": {
    minHeight: 420,
    demos: [
      {
        name: "Audit comment",
        description:
          "Type @ then a name; arrow keys and Enter insert the mention. Mentions drive the notify list.",
        render: () => <AuditCommentDemo />,
      },
      {
        name: "Custom trigger",
        description: '`trigger="#"` with a localised suggestion-count announcement.',
        render: () => <ServiceTriggerDemo />,
      },
      {
        name: "Read-only and disabled",
        description:
          "Read-only keeps a closed note selectable and copyable; disabled removes it from the form.",
        render: () => (
          <FieldGroup className="w-96 max-w-full">
            <Field>
              <FieldLabel>Reviewer note</FieldLabel>
              <FieldControl
                render={
                  <MentionInput
                    value="Approved by @Ananya Iyer on 5 Oct 2026."
                    onValueChange={() => undefined}
                    people={people}
                    readOnly
                  />
                }
              />
              <FieldDescription>Locked once the access request is closed.</FieldDescription>
            </Field>
            <Field data-disabled="true">
              <FieldLabel>Escalation note</FieldLabel>
              <FieldControl
                render={
                  <MentionInput
                    value="Waiting on @Sanjay Gupta to confirm the Frankfurt IP."
                    onValueChange={() => undefined}
                    people={people}
                    disabled
                  />
                }
              />
            </Field>
          </FieldGroup>
        ),
      },
    ],
    playground: definePlayground({
      controls: mentionControls,
      render: (v) => (
        <div className="w-96 max-w-full">
          <PlaygroundMention
            key={`${v.trigger}-${v.readOnly}`}
            placeholder={v.placeholder}
            trigger={v.trigger}
            maxSuggestions={v.maxSuggestions}
            disabled={v.disabled}
            readOnly={v.readOnly}
          />
        </div>
      ),
      code: (v) =>
        jsx("MentionInput", {
          "aria-label": "Comment",
          value: expr("value"),
          onValueChange: expr("setValue"),
          people: expr(v.trigger === "#" ? "services" : "people"),
          trigger: v.trigger === "@" ? undefined : v.trigger,
          placeholder: v.placeholder || undefined,
          ...changedProps(v, mentionControls, ["maxSuggestions", "disabled", "readOnly"]),
        }),
    }),
  },
};
