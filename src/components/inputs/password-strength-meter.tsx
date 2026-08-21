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
  /** Hide the textual strength label (just show the bar). */
  hideLabel?: boolean;
  /** Optional feedback lines rendered below the bar. */
  feedback?: string[];
  /** Localised labels for scores 0..4. */
  labels?: [string, string, string, string, string];
  className?: string;
}

const DEFAULT_LABELS: [string, string, string, string, string] = [
  "",
  "Weak",
  "Fair",
  "Good",
  "Strong",
];

// Tailwind classes per segment-when-active. Lower scores look red,
// higher scores walk through amber → blue → emerald so they're
// visually distinct even when the user only glances at the bar.
const SEGMENT_COLORS: Record<PasswordStrengthScore, string> = {
  0: "bg-muted",
  1: "bg-destructive",
  2: "bg-warning",
  3: "bg-info",
  4: "bg-success",
};

const LABEL_COLORS: Record<PasswordStrengthScore, string> = {
  0: "text-muted-foreground",
  1: "text-destructive",
  2: "text-warning",
  3: "text-info",
  4: "text-success",
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
 * PasswordStrengthMeter renders a 4-segment bar that fills left-to-right
 * with the password's score, plus an optional textual label and
 * caller-supplied feedback strings. Pass `score` to override the
 * built-in heuristic (e.g. plug in zxcvbn).
 */
function PasswordStrengthMeter({
  value,
  score,
  hideLabel,
  feedback,
  labels = DEFAULT_LABELS,
  className,
}: PasswordStrengthMeterProps) {
  const finalScore: PasswordStrengthScore = score ?? scorePassword(value);
  const label = labels[finalScore];
  const ariaLabel = `Password strength: ${label || "empty"}`;

  return (
    <div
      data-slot="password-strength-meter"
      className={cn("flex flex-col gap-1.5", className)}
      aria-label={ariaLabel}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              finalScore >= seg ? SEGMENT_COLORS[finalScore] : "bg-muted",
            )}
          />
        ))}
      </div>
      {!hideLabel && label && (
        <span className={cn("text-xs font-medium", LABEL_COLORS[finalScore])}>{label}</span>
      )}
      {feedback && feedback.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
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
