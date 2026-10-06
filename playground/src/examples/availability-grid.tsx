import { AvailabilityGrid } from "@qeetrix/ui";
import { useId, useState } from "react";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select } from "../registry/types";

/** Slot keys are `"<dayIndex>:<timeIndex>"`. */
const slot = (dayIndex: number, timeIndex: number) => `${dayIndex}:${timeIndex}`;

function hours(from: number, to: number, stepMinutes: number): string[] {
  const out: string[] = [];
  for (let minutes = from * 60; minutes < to * 60; minutes += stepMinutes) {
    out.push(
      `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
    );
  }
  return out;
}

/* ── Meeting availability: SOC 2 audit walkthrough, week of 12 Oct 2026 (IST) ─────────────── */

const auditDays = ["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16"];
const auditTimes = hours(9, 18, 60);
const lunch = auditTimes.indexOf("13:00");
const auditBusy = [
  ...auditDays.map((_, dayIndex) => slot(dayIndex, lunch)),
  slot(0, 0), // On-call handover · Arjun → Sanjay
  slot(2, auditTimes.indexOf("14:00")), // Onboarding call · Lotus Education
  slot(3, auditTimes.indexOf("11:00")), // Passkey rollout review
  slot(4, auditTimes.indexOf("16:00")), // Weekly payroll sign-off
];

function MeetingAvailabilityDemo() {
  const headingId = useId();
  const [value, setValue] = useState([slot(1, 1), slot(1, 2), slot(3, 6)]);
  const picked = value
    .map((key) => key.split(":").map(Number))
    .sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0) || (a[1] ?? 0) - (b[1] ?? 0))
    .map(([dayIndex = 0, timeIndex = 0]) => `${auditDays[dayIndex]} ${auditTimes[timeIndex]}`);
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <div>
        <h3 id={headingId} className="text-sm font-medium">
          Propose slots for the SOC 2 audit walkthrough
        </h3>
        <p className="text-caption text-muted-foreground">
          IST working hours, one-hour slots. Hatched slots are already booked.
        </p>
      </div>
      <div className="overflow-x-auto">
        <AvailabilityGrid
          days={auditDays}
          times={auditTimes}
          value={value}
          onValueChange={setValue}
          unavailable={auditBusy}
          aria-labelledby={headingId}
          className="w-full min-w-md"
        />
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {picked.length === 0
          ? "No slots proposed yet."
          : `${picked.length} ${picked.length === 1 ? "hour" : "hours"} proposed: ${picked.join(", ")}`}
      </p>
    </div>
  );
}

/* ── On-call rota: Qeet ID platform team, week of 19 Oct 2026 ─────────────────────────────── */

const rotaDays = ["Mon 19", "Tue 20", "Wed 21", "Thu 22", "Fri 23", "Sat 24", "Sun 25"];
const rotaTimes = ["00–04", "04–08", "08–12", "12–16", "16–20", "20–24"];

function OnCallRotaDemo() {
  const [value, setValue] = useState(() =>
    [0, 1, 2].flatMap((dayIndex) => [slot(dayIndex, 4), slot(dayIndex, 5)]),
  );
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Arjun Reddy · {value.length * 4} of 40 on-call hours. Friday is blocked: he's on leave.
      </p>
      <div className="overflow-x-auto">
        <AvailabilityGrid
          days={rotaDays}
          times={rotaTimes}
          value={value}
          onValueChange={setValue}
          unavailable={rotaTimes.map((_, timeIndex) => slot(4, timeIndex))}
          timeColumnHeader="Shift (IST)"
          aria-label="Arjun Reddy's on-call shifts"
          className="w-full min-w-md"
        />
      </div>
    </div>
  );
}

const controls = {
  startHour: num(9, { min: 0, max: 12, label: "First hour" }),
  endHour: num(18, { min: 13, max: 24, label: "Last hour" }),
  slotMinutes: select(["30", "60"] as const, "60", "Slot length (minutes)"),
  weekend: bool(false, "Include weekend"),
  showBooked: bool(true, "Booked slots (unavailable)"),
};

function AvailabilityPlayground({
  startHour,
  endHour,
  slotMinutes,
  weekend,
  showBooked,
}: {
  startHour: number;
  endHour: number;
  slotMinutes: "30" | "60";
  weekend: boolean;
  showBooked: boolean;
}) {
  const days = weekend ? [...auditDays, "Sat 17", "Sun 18"] : auditDays;
  const times = hours(startHour, endHour, Number(slotMinutes));
  const [value, setValue] = useState<string[]>([]);
  return (
    <div className="w-[min(40rem,90vw)] overflow-x-auto">
      <AvailabilityGrid
        days={days}
        times={times}
        value={value}
        onValueChange={setValue}
        unavailable={showBooked ? days.map((_, dayIndex) => slot(dayIndex, 0)) : undefined}
        aria-label="Meeting availability (IST)"
        className="w-full"
      />
    </div>
  );
}

export const examples: FamilyExamples = {
  "availability-grid": {
    layout: "wide",
    minHeight: 760,
    demos: [
      {
        name: "Meeting availability",
        description:
          "One tab stop: arrows move, Space or Enter toggles, Home/End and PageUp/PageDown jump. Booked slots stay focusable but can't be picked.",
        render: () => <MeetingAvailabilityDemo />,
      },
      {
        name: "On-call rota",
        render: () => <OnCallRotaDemo />,
      },
    ],
    playground: definePlayground({
      controls,
      render: (v) => <AvailabilityPlayground {...v} />,
      code: (v) =>
        jsx("AvailabilityGrid", {
          days: expr(
            JSON.stringify(v.weekend ? [...auditDays, "Sat 17", "Sun 18"] : auditDays).replaceAll(
              ",",
              ", ",
            ),
          ),
          times: expr(
            JSON.stringify(hours(v.startHour, v.endHour, Number(v.slotMinutes))).replaceAll(
              ",",
              ", ",
            ),
          ),
          value: expr("slots"),
          onValueChange: expr("setSlots"),
          unavailable: v.showBooked ? expr("bookedSlots") : undefined,
          "aria-label": "Meeting availability (IST)",
        }),
    }),
  },
};
