"use client";

import { Switch } from "@/components/selection/switch";
import { cn } from "@/lib/utils";

interface PrefChannel {
  key: string;
  label: string;
}
interface PrefCategory {
  key: string;
  label: string;
  description?: string;
}
/** category key → channel key → enabled. */
type PreferenceMatrix = Record<string, Record<string, boolean>>;

interface NotificationPreferenceMatrixProps {
  channels: PrefChannel[];
  categories: PrefCategory[];
  value: PreferenceMatrix;
  onValueChange: (value: PreferenceMatrix) => void;
  className?: string;
}

/** Channel × category notification preferences — a grid of switches. */
function NotificationPreferenceMatrix({
  channels,
  categories,
  value,
  onValueChange,
  className,
}: NotificationPreferenceMatrixProps) {
  const toggle = (cat: string, ch: string, checked: boolean) => {
    onValueChange({ ...value, [cat]: { ...value[cat], [ch]: checked } });
  };

  return (
    <div
      data-slot="notification-preference-matrix"
      className={cn("w-full overflow-x-auto", className)}
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 pe-4 text-start font-medium text-muted-foreground">Notification</th>
            {channels.map((ch) => (
              <th key={ch.key} className="px-3 py-2 text-center font-medium text-muted-foreground">
                {ch.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.key} className="border-b border-border last:border-0">
              <td className="py-3 pe-4">
                <div className="font-medium text-foreground">{cat.label}</div>
                {cat.description && (
                  <div className="text-xs text-muted-foreground">{cat.description}</div>
                )}
              </td>
              {channels.map((ch) => (
                <td key={ch.key} className="px-3 py-3 text-center">
                  <Switch
                    checked={!!value[cat.key]?.[ch.key]}
                    onCheckedChange={(checked) => toggle(cat.key, ch.key, checked)}
                    aria-label={`${cat.label} via ${ch.label}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type { NotificationPreferenceMatrixProps, PrefCategory, PrefChannel, PreferenceMatrix };
export { NotificationPreferenceMatrix };
