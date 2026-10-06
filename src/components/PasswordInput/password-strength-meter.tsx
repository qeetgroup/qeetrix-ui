import { passwordStrengthMeterMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";

/**
 * 0 = empty, 1 = weak, 2 = fair, 3 = good, 4 = strong.
 */
export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

interface PasswordStrengthMeterProps {
  /** The password to score. Empty string → score 0. */
  value: string;
  /**
   * Override the internal heuristic with a custom score (e.g. zxcvbn).
   * Useful when callers want a real entropy-based scorer; the internal
   * default is intentionally dependency-free.
   */
  score?: PasswordStrengthScore;
  /**
   * Hide the textual strength label visually (just show the bar). It is still announced to
   * assistive technology — the bar alone carries no text.
   */
  hideLabel?: boolean;
  /** Optional feedback lines rendered below the bar. */
  feedback?: string[];
  /** Localised labels for scores 0..4. */
  labels?: [string, string, string, string, string];
  /**
   * Announced before the label — "Password strength: Fair" — so the live update says what it is
   * about. Not shown on screen. Pass a translation, or `""` to announce the label alone.
   */
  statusPrefix?: string;
  className?: string;
}

// Strength is carried three ways, so no one of them is load-bearing: how many of the four
// segments are filled, the text label, and the colour. The colours are the status roles —
// danger, warning, then success for both "good" and "strong" (the fourth segment is what
// separates them) — each ≥3:1 on the surface, and the empty track is a visible step rather than
// a near-invisible tint, so "two of four" can be counted.
const SEGMENT_COLORS: Record<PasswordStrengthScore, string> = {
  0: "bg-border-strong",
  1: "bg-destructive",
  2: "bg-warning",
  3: "bg-success",
  4: "bg-success",
};

const LABEL_COLORS: Record<PasswordStrengthScore, string> = {
  0: "text-muted-foreground",
  1: "text-destructive-text",
  2: "text-warning-text",
  3: "text-success-text",
  4: "text-success-text",
};

/**
 * scorePassword applies a small dependency-free heuristic: length plus
 * character-class diversity. It is not a replacement for zxcvbn — it
 * exists to give the user fast visual feedback without shipping ~200 KB
 * of dictionary. Callers who need real entropy analysis pass `score`
 * directly.
 */
export function scorePassword(value: string): PasswordStrengthScore {
  if (!value) return 0;
  let classes = 0;
  if (/[a-z]/.test(value)) classes++;
  if (/[A-Z]/.test(value)) classes++;
  if (/\d/.test(value)) classes++;
  if (/[^A-Za-z0-9]/.test(value)) classes++;
  const n = value.length;
  if (n < 8) return 1;
  if (n < 12 && classes < 3) return 2;
  if (n >= 16 && classes >= 4) return 4;
  if (n >= 12 && classes >= 3) return 3;
  return 2;
}

/**
 * PasswordStrengthMeter renders a 4-segment bar that fills from the inline start with the
 * password's score, plus a textual label and optional caller-supplied feedback strings. Pass
 * `score` to override the built-in heuristic (e.g. plug in zxcvbn).
 *
 * The whole meter is a polite live region: as the score changes, "Password strength: Fair" (and
 * any feedback) is announced. The segments themselves are decorative. Place it directly after
 * the password field and reference its `id` from the field's `aria-describedby` if the strength
 * should also be read when the field is focused.
 */
function PasswordStrengthMeter({
  value,
  score,
  hideLabel,
  feedback,
  labels = passwordStrengthMeterMessages.labels,
  statusPrefix = passwordStrengthMeterMessages.statusPrefix,
  className,
}: PasswordStrengthMeterProps) {
  const finalScore: PasswordStrengthScore = score ?? scorePassword(value);
  const label = labels[finalScore];

  return (
    <div
      data-slot="password-strength-meter"
      data-score={finalScore}
      className={cn("flex flex-col gap-1.5", className)}
      role="status"
      aria-live="polite"
    >
      <div aria-hidden="true" className="flex items-center gap-1">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            data-slot="password-strength-meter-segment"
            data-filled={finalScore >= seg || undefined}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-normal ease-standard",
              finalScore >= seg ? SEGMENT_COLORS[finalScore] : SEGMENT_COLORS[0],
            )}
          />
        ))}
      </div>
      {label && (
        <p className={cn("text-caption font-medium", hideLabel && "sr-only")}>
          {statusPrefix && <span className="sr-only">{`${statusPrefix} `}</span>}
          <span data-slot="password-strength-meter-label" className={LABEL_COLORS[finalScore]}>
            {label}
          </span>
        </p>
      )}
      {feedback && feedback.length > 0 && (
        <ul className="space-y-0.5 text-caption text-muted-foreground">
          {feedback.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type { PasswordStrengthMeterProps };
export { PasswordStrengthMeter };
