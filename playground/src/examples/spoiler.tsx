import { Button, Spoiler } from "@qeetrix/ui";
import { useState } from "react";
import { changedProps, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, text } from "../registry/types";

const INCIDENT_SUMMARY =
  "Between 09:42 and 10:18 IST, UPI collect requests routed through our primary PSP in ap-south-1 timed out for roughly 14% of attempts. Qeet Pay retried each request with exponential backoff, so most payments completed on the second attempt, but 312 customers saw a “Payment pending” screen for longer than two minutes. Card, net-banking and NACH payments were not affected. The PSP traced the issue to a saturated connection pool on their NPCI gateway and failed over to a secondary at 10:16 IST. We are adding a per-PSP circuit breaker so traffic shifts to the standby provider automatically within 30 seconds, and will publish the full post-incident review by 9 Oct.";

const DPDP_NOTICE =
  "Acme India processes your name, work email, phone number and device information to verify your identity and secure your account, as permitted under the Digital Personal Data Protection Act, 2023. Data is stored in ap-south-1 (Mumbai) and retained for the duration of your employment plus 90 days. You can request a copy, correction or erasure of your data from Settings → Privacy, or by writing to the Data Protection Officer at dpo@acme.in.";

function IncidentTimeline() {
  return (
    <div className="space-y-2 text-sm">
      <p>
        <strong>09:42 IST</strong> — Elevated UPI collect timeouts detected by qeet-pay-api (trace
        a3ce929d0e0e4736). On-call paged.
      </p>
      <p>
        <strong>09:51 IST</strong> — Incident INC-2026-1006 opened. Status page updated for
        ap-south-1.
      </p>
      <p>
        <strong>10:16 IST</strong> — PSP failed over to its secondary NPCI gateway. Timeouts back to
        baseline.
      </p>
      <p>
        <strong>10:18 IST</strong> — Monitoring. 312 delayed payments reconciled automatically.
      </p>
    </div>
  );
}

function ControlledSpoilersDemo() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <Button
        size="sm"
        variant="outline"
        className="self-start"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? "Collapse all" : "Expand all"}
      </Button>
      <div className="flex flex-col gap-4 text-sm">
        <section className="flex flex-col gap-1">
          <h5 className="font-medium">Incident summary</h5>
          <Spoiler maxLines={2} expanded={expanded} onExpandedChange={setExpanded}>
            {INCIDENT_SUMMARY}
          </Spoiler>
        </section>
        <section className="flex flex-col gap-1">
          <h5 className="font-medium">Privacy notice</h5>
          <Spoiler maxLines={2} expanded={expanded} onExpandedChange={setExpanded}>
            {DPDP_NOTICE}
          </Spoiler>
        </section>
      </div>
    </div>
  );
}

const spoilerControls = {
  children: text(INCIDENT_SUMMARY, "Content", { multiline: true }),
  maxLines: num(3, { min: 1, max: 10, label: "Max lines" }),
  showLabel: text("Show more", "Show label"),
  hideLabel: text("Show less", "Hide label"),
  defaultExpanded: bool(false, "Expanded by default"),
};

export const examples: FamilyExamples = {
  spoiler: {
    layout: "wide",
    minHeight: 640,
    demos: [
      {
        name: "Incident description",
        description: "Clamped to three lines with a fade; the toggle is a disclosure button.",
        render: () => (
          <div className="w-full max-w-xl text-sm">
            <Spoiler>{INCIDENT_SUMMARY}</Spoiler>
          </div>
        ),
      },
      {
        name: "Rich content",
        description:
          "Block children clamp too; keep them in normal flow (a flex parent defeats line-clamp).",
        render: () => (
          <div className="w-full max-w-xl">
            <Spoiler maxLines={4} showLabel="Show full timeline" hideLabel="Hide timeline">
              <IncidentTimeline />
            </Spoiler>
          </div>
        ),
      },
      {
        name: "Expanded by default",
        render: () => (
          <div className="w-full max-w-xl text-sm">
            <Spoiler defaultExpanded maxLines={2} showLabel="Read notice" hideLabel="Collapse">
              {DPDP_NOTICE}
            </Spoiler>
          </div>
        ),
      },
      {
        name: "Content that fits",
        description: "When nothing is clamped the toggle is not rendered at all.",
        render: () => (
          <div className="w-full max-w-xl text-sm">
            <Spoiler>Resolved at 10:18 IST. No action needed from tenant admins.</Spoiler>
          </div>
        ),
      },
      {
        name: "Controlled",
        description: "`expanded` + `onExpandedChange` let one button drive several spoilers.",
        render: () => <ControlledSpoilersDemo />,
      },
    ],
    playground: definePlayground({
      controls: spoilerControls,
      render: (v) => (
        <div className="w-[32rem] max-w-full text-sm">
          <Spoiler
            key={String(v.defaultExpanded)}
            maxLines={v.maxLines}
            showLabel={v.showLabel}
            hideLabel={v.hideLabel}
            defaultExpanded={v.defaultExpanded}
          >
            {v.children}
          </Spoiler>
        </div>
      ),
      code: (v) =>
        jsx(
          "Spoiler",
          changedProps(v, spoilerControls, [
            "maxLines",
            "showLabel",
            "hideLabel",
            "defaultExpanded",
          ]),
          v.children,
        ),
    }),
  },
};
